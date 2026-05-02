import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SessionState } from '../types/session.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
const MODEL = 'gemini-2.5-flash-lite'

export async function generateDocument(
  session: SessionState,
  docType: string,
  docGenPrompt: string,
): Promise<string> {
  const { blueprint, documentState } = session

  const context = `## Blueprint
Industry: ${blueprint.industry}
Company: ${blueprint.companyType}, ${blueprint.companySize}
Product: ${blueprint.product}
Stage: ${blueprint.stage}
Context: ${blueprint.context}

## Document State
${documentState.name}: ${documentState.label}
Generator instruction: ${documentState.generatorInstruction}

## Document type requested: ${docType}`

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: docGenPrompt,
    generationConfig: { maxOutputTokens: 2048 },
  })

  const result = await model.generateContent(context)
  return result.response.text()
}
