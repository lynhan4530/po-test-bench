import { describe, it, expect, beforeEach } from 'vitest'
import { createSession, sessions } from '../session.js'

describe('createSession', () => {
  beforeEach(() => {
    sessions.clear()
  })

  it('returns a valid SessionState shape', () => {
    const session = createSession()
    expect(session).toMatchObject({
      sessionId: expect.any(String),
      blueprint: expect.any(Object),
      documentState: expect.any(Object),
      trigger: expect.any(Object),
      difficulty: 1,
      conversationHistory: [],
      generatedDocuments: {},
      personaSignoffs: { developer: false, qa: false },
      phase: 'challenge',
    })
  })

  it('assigns a non-empty UUID for sessionId', () => {
    const session = createSession()
    expect(session.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })

  it('generates unique sessionIds across multiple sessions', () => {
    const ids = Array.from({ length: 10 }, () => createSession().sessionId)
    const unique = new Set(ids)
    expect(unique.size).toBe(10)
  })

  it('difficulty is always 1 (MVP)', () => {
    for (let i = 0; i < 5; i++) {
      expect(createSession().difficulty).toBe(1)
    }
  })

  it('starts with both signoffs false', () => {
    const { personaSignoffs } = createSession()
    expect(personaSignoffs.developer).toBe(false)
    expect(personaSignoffs.qa).toBe(false)
  })

  it('starts with empty conversationHistory array', () => {
    const { conversationHistory } = createSession()
    expect(Array.isArray(conversationHistory)).toBe(true)
    expect(conversationHistory).toHaveLength(0)
  })

  it('starts with empty generatedDocuments object', () => {
    const { generatedDocuments } = createSession()
    expect(generatedDocuments).toEqual({})
  })

  it('phase starts as challenge', () => {
    expect(createSession().phase).toBe('challenge')
  })

  it('blueprint contains required fields', () => {
    const { blueprint } = createSession()
    expect(blueprint).toHaveProperty('id')
    expect(blueprint).toHaveProperty('industry')
    expect(blueprint).toHaveProperty('companyType')
    expect(blueprint).toHaveProperty('product')
    expect(blueprint).toHaveProperty('context')
  })

  it('trigger contains required fields', () => {
    const { trigger } = createSession()
    expect(trigger).toHaveProperty('id')
    expect(trigger).toHaveProperty('format')
    expect(trigger).toHaveProperty('content')
    expect(trigger).toHaveProperty('task')
    expect(['email', 'slack', 'brief', 'ticket']).toContain(trigger.format)
  })

  it('documentState contains required fields', () => {
    const { documentState } = createSession()
    expect(documentState).toHaveProperty('id')
    expect(documentState).toHaveProperty('name')
    expect(documentState).toHaveProperty('label')
    expect(documentState).toHaveProperty('generatorInstruction')
  })
})
