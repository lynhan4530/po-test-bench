import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Response } from 'express'
import type { Message, SessionState, GameMasterOutput } from '../types/session.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
const MODEL = 'gemini-2.5-flash-lite'

const SIGNOFF_MARKERS = {
  developer: '[DEVELOPER SIGN-OFF]',
  qa: '[QA SIGN-OFF]',
} as const

function toGeminiMessages(history: Message[]) {
  const result: { role: 'user' | 'model'; parts: [{ text: string }] }[] = []

  for (const msg of history) {
    const geminiRole = msg.role === 'user' ? 'user' : 'model'

    if (msg.role === 'system') {
      const last = result[result.length - 1]
      if (last?.role === 'user') {
        last.parts[0].text = `[Earlier context: ${msg.content}]\n\n${last.parts[0].text}`
      } else {
        result.push({ role: 'user', parts: [{ text: `[Earlier context: ${msg.content}]` }] })
      }
      continue
    }

    const last = result[result.length - 1]
    if (last?.role === geminiRole) {
      last.parts[0].text = `${last.parts[0].text}\n\n${msg.content}`
    } else {
      result.push({ role: geminiRole, parts: [{ text: msg.content }] })
    }
  }

  // Gemini requires conversation to start with a user turn
  if (result.length === 0 || result[0].role !== 'user') {
    result.unshift({ role: 'user', parts: [{ text: '(session start)' }] })
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

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: `${personaPrompt}\n\n${dynamicContext}`,
    generationConfig: { maxOutputTokens: 512 },
  })

  const messages = toGeminiMessages(session.conversationHistory)
  const history = messages.slice(0, -1)
  const lastMessage = messages[messages.length - 1]

  const chat = model.startChat({ history })
  const stream = await chat.sendMessageStream(lastMessage?.parts[0].text ?? '')

  let fullMessage = ''
  for await (const chunk of stream.stream) {
    const delta = chunk.text()
    fullMessage += delta
    res.write(`data: ${JSON.stringify({ type: 'text', text: delta })}\n\n`)
  }

  const signedOff = fullMessage.includes(SIGNOFF_MARKERS[persona])
  return { message: fullMessage, signedOff }
}
