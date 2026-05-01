import Anthropic from '@anthropic-ai/sdk'
import type { Response } from 'express'
import type { Message, SessionState, GameMasterOutput } from '../types/session.js'

const client = new Anthropic()
const MODEL = 'claude-sonnet-4-20250514'

const SIGNOFF_MARKERS = {
  developer: '[DEVELOPER SIGN-OFF]',
  qa: '[QA SIGN-OFF]',
} as const

function toApiMessages(history: Message[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = []

  for (const msg of history) {
    const apiRole: 'user' | 'assistant' = msg.role === 'user' ? 'user' : 'assistant'

    if (msg.role === 'system') {
      // Compression summary — prepend to last user message or create one
      const last = result[result.length - 1]
      if (last?.role === 'user') {
        last.content = `[Earlier context: ${msg.content}]\n\n${last.content}`
      } else {
        result.push({ role: 'user', content: `[Earlier context: ${msg.content}]` })
      }
      continue
    }

    const last = result[result.length - 1]
    if (last?.role === apiRole) {
      last.content = `${last.content}\n\n${msg.content}`
    } else {
      result.push({ role: apiRole, content: msg.content })
    }
  }

  return result
}

export async function runPersona(
  session: SessionState,
  persona: 'developer' | 'qa',
  gmOutput: GameMasterOutput,
  personaPrompt: string,
  res: Response,
): Promise<{ message: string; signedOff: boolean }> {
  const docsContext = Object.entries(session.generatedDocuments)
    .map(([type, content]) => `## ${type}\n${content}`)
    .join('\n\n')

  const dynamicContext = [
    docsContext ? `## Project Documents\n${docsContext}` : '',
    `## Game Master instruction\nFocus: ${gmOutput.focus}\nTone: ${gmOutput.tone}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 512,
    system: [
      { type: 'text', text: personaPrompt, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: dynamicContext },
    ],
    messages: toApiMessages(session.conversationHistory),
  })

  let fullMessage = ''

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      const delta = event.delta.text
      fullMessage += delta
      res.write(`data: ${JSON.stringify({ type: 'text', text: delta })}\n\n`)
    }
  }

  const signedOff = fullMessage.includes(SIGNOFF_MARKERS[persona])

  return { message: fullMessage, signedOff }
}
