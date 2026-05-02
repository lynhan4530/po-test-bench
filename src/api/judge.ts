import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SessionState, JudgeFeedbackOutput } from '../types/session.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
const MODEL = 'gemini-2.5-flash-lite'

export async function runJudge(
  session: SessionState,
  judgePrompt: string,
): Promise<JudgeFeedbackOutput> {
  const visibleDocs = Object.entries(session.generatedDocuments)
    .filter(([type]) => !type.startsWith('_'))
    .map(([type, content]) => `### ${type}\n${content}`)
    .join('\n\n')

  const requirementsRef = session.generatedDocuments['_requirements']

  const docsContext = [
    visibleDocs ? `## Project Documents\n${visibleDocs}` : '',
    requirementsRef
      ? `## Complete Requirements Reference (internal)\nUse this as the gold standard when scoring the user's submission. Penalise gaps against this list.\n\n${requirementsRef}`
      : '',
  ]
    .filter(Boolean)
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

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: judgePrompt,
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 },
  })

  const result = await model.generateContent(context)
  const text = result.response.text()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Judge returned invalid JSON: ${text}`)

  return JSON.parse(match[0]) as JudgeFeedbackOutput
}
