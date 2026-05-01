import Anthropic from '@anthropic-ai/sdk'
import type { SessionState, GameMasterOutput } from '../types/session.js'

const client = new Anthropic()
const MODEL = 'claude-sonnet-4-20250514'

export async function runGameMaster(
  session: SessionState,
  gmPrompt: string,
): Promise<GameMasterOutput> {
  const lastEight = session.conversationHistory.slice(-8)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: [
      { type: 'text', text: gmPrompt, cache_control: { type: 'ephemeral' } },
      {
        type: 'text',
        text: `\nSignoff state: developer=${session.personaSignoffs.developer}, qa=${session.personaSignoffs.qa}\nDifficulty: ${session.difficulty}`,
      },
    ],
    messages: [
      {
        role: 'user',
        content:
          `Last ${lastEight.length} messages:\n\n` +
          lastEight.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n') +
          '\n\nReturn only valid JSON.',
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Game Master returned invalid JSON: ${text}`)

  return JSON.parse(match[0]) as GameMasterOutput
}
