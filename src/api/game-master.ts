import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SessionState, GameMasterOutput } from '../types/session.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
const MODEL = 'gemini-2.5-flash-lite'

export async function runGameMaster(
  session: SessionState,
  gmPrompt: string,
): Promise<GameMasterOutput> {
  const lastEight = session.conversationHistory.slice(-8)

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction:
      gmPrompt +
      `\n\nSignoff state: developer=${session.personaSignoffs.developer}, qa=${session.personaSignoffs.qa}\nDifficulty: ${session.difficulty}`,
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 256 },
  })

  const prompt =
    `Last ${lastEight.length} messages:\n\n` +
    lastEight.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n') +
    '\n\nReturn only valid JSON.'

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Game Master returned invalid JSON: ${text}`)

  return JSON.parse(match[0]) as GameMasterOutput
}
