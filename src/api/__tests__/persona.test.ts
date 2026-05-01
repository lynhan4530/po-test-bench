import { describe, it, expect } from 'vitest'
import { toGeminiMessages } from '../persona.js'
import type { Message } from '../../types/session.js'

function msg(role: Message['role'], content: string): Message {
  return { role, content, timestamp: 0 }
}

describe('toGeminiMessages', () => {
  it('returns a single user placeholder for empty history', () => {
    const result = toGeminiMessages([])
    expect(result).toEqual([{ role: 'user', parts: [{ text: '(session start)' }] }])
  })

  it('converts a single user message', () => {
    const result = toGeminiMessages([msg('user', 'Hello')])
    expect(result).toEqual([{ role: 'user', parts: [{ text: 'Hello' }] }])
  })

  it('maps developer role to model', () => {
    const result = toGeminiMessages([msg('user', 'Hi'), msg('developer', 'Sure')])
    expect(result[1]).toEqual({ role: 'model', parts: [{ text: 'Sure' }] })
  })

  it('maps qa role to model', () => {
    const result = toGeminiMessages([msg('user', 'Hi'), msg('qa', 'Looks good')])
    expect(result[1]).toEqual({ role: 'model', parts: [{ text: 'Looks good' }] })
  })

  it('merges consecutive user messages', () => {
    const result = toGeminiMessages([msg('user', 'A'), msg('user', 'B')])
    expect(result).toHaveLength(1)
    expect(result[0].parts[0].text).toBe('A\n\nB')
  })

  it('merges consecutive model messages', () => {
    const result = toGeminiMessages([
      msg('user', 'Start'),
      msg('developer', 'First'),
      msg('qa', 'Second'),
    ])
    expect(result).toHaveLength(2)
    expect(result[1].role).toBe('model')
    expect(result[1].parts[0].text).toBe('First\n\nSecond')
  })

  it('prepends system message as [Earlier context: ...] to next user message', () => {
    const result = toGeminiMessages([msg('system', 'summary'), msg('user', 'question')])
    expect(result).toHaveLength(1)
    expect(result[0].parts[0].text).toContain('[Earlier context: summary]')
    expect(result[0].parts[0].text).toContain('question')
  })

  it('inserts placeholder user turn when system is first with no following user', () => {
    const result = toGeminiMessages([msg('system', 'summary')])
    expect(result[0].role).toBe('user')
    expect(result[0].parts[0].text).toContain('[Earlier context: summary]')
  })

  it('always starts with a user turn even when history begins with developer', () => {
    const result = toGeminiMessages([msg('developer', 'Hello')])
    expect(result[0].role).toBe('user')
  })

  it('produces alternating user/model turns for normal conversation', () => {
    const history: Message[] = [
      msg('user', 'Hi'),
      msg('developer', 'What?'),
      msg('user', 'Clarifying'),
      msg('qa', 'OK'),
    ]
    const result = toGeminiMessages(history)
    expect(result.map(m => m.role)).toEqual(['user', 'model', 'user', 'model'])
  })
})
