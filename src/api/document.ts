import Anthropic from '@anthropic-ai/sdk'
import type { SessionState } from '../types/session.js'

const client = new Anthropic()
const MODEL = 'claude-sonnet-4-20250514'

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

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      { type: 'text', text: docGenPrompt, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      { role: 'user', content: context },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return text
}
