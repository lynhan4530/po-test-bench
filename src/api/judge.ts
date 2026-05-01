import Anthropic from '@anthropic-ai/sdk'
import type { SessionState, JudgeFeedbackOutput } from '../types/session.js'

const client = new Anthropic()
const MODEL = 'claude-sonnet-4-20250514'

export async function runJudge(
  session: SessionState,
  judgePrompt: string,
): Promise<JudgeFeedbackOutput> {
  const docsContext = Object.entries(session.generatedDocuments)
    .map(([type, content]) => `## ${type}\n${content}`)
    .join('\n\n')

  const conversationText = session.conversationHistory
    .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join('\n\n')

  const context = [
    docsContext ? `## Project Documents\n${docsContext}` : '',
    `## Full Conversation\n${conversationText}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      { type: 'text', text: judgePrompt, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      { role: 'user', content: context },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Judge returned invalid JSON: ${text}`)

  return JSON.parse(match[0]) as JudgeFeedbackOutput
}
