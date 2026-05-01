import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type { Express } from 'express'
import type { SessionState } from '../../src/types/session.js'

// ── Gemini mock ───────────────────────────────────────────────────────────────
// Must be defined with vi.hoisted so values are available when vi.mock runs
const mockGenerateContent = vi.hoisted(() => vi.fn())
const mockSendMessageStream = vi.hoisted(() => vi.fn())

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: mockGenerateContent,
        startChat: () => ({ sendMessageStream: mockSendMessageStream }),
      }
    }
  },
}))

// ── Lazy imports (after mock is registered) ───────────────────────────────────
let app: Express
let sessions: Map<string, SessionState>

beforeAll(async () => {
  const serverMod = await import('../index.js')
  app = serverMod.app
  const sessionMod = await import('../../src/api/session.js')
  sessions = sessionMod.sessions
})

// ── Helpers ───────────────────────────────────────────────────────────────────

import request from 'supertest'

function parseSSEEvents(text: string): Record<string, unknown>[] {
  return text
    .split('\n\n')
    .map(b => b.trim())
    .filter(b => b.startsWith('data: '))
    .map(b => JSON.parse(b.slice(6)) as Record<string, unknown>)
}

function gmJSON(nextSpeaker: 'developer' | 'qa' | 'end' = 'developer') {
  return {
    response: {
      text: () => JSON.stringify({ nextSpeaker, focus: 'acceptance criteria', tone: 'neutral' }),
    },
  }
}

function judgeJSON() {
  return {
    response: {
      text: () =>
        JSON.stringify({
          scores: [
            { dimension: 'Defensibility', score: 4, feedback: 'Good job.' },
            { dimension: 'Adaptability', score: 3, feedback: 'Decent.' },
            { dimension: 'Clarity Under Pressure', score: 4, feedback: 'Clear.' },
            { dimension: 'Document Quality', score: 3, feedback: 'Acceptable.' },
            { dimension: 'Risk Awareness', score: 2, feedback: 'Needs work.' },
          ],
          overallScore: 3.2,
          summary: 'Solid performance overall.',
        }),
    },
  }
}

function personaStream(text = '[DEVELOPER SIGN-OFF] Looks good!') {
  return {
    stream: (async function* () {
      yield { text: () => text }
    })(),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('POST /api/session/start', () => {
  it('returns 200 with sessionId and required fields', async () => {
    const res = await request(app).post('/api/session/start')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('sessionId')
    expect(res.body).toHaveProperty('trigger')
    expect(res.body).toHaveProperty('blueprint')
    expect(res.body).toHaveProperty('documentState')
    expect(res.body.phase).toBe('challenge')
  })

  it('stores the session in the in-memory map', async () => {
    const res = await request(app).post('/api/session/start')
    expect(sessions.has((res.body as { sessionId: string }).sessionId)).toBe(true)
  })

  it('creates a unique sessionId on each call', async () => {
    const r1 = await request(app).post('/api/session/start')
    const r2 = await request(app).post('/api/session/start')
    expect(r1.body.sessionId).not.toBe(r2.body.sessionId)
  })
})

describe('GET /api/session/:id', () => {
  it('returns 404 for an unknown sessionId', async () => {
    const res = await request(app).get('/api/session/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('returns the full session for a valid sessionId', async () => {
    const start = await request(app).post('/api/session/start')
    const { sessionId } = start.body as { sessionId: string }
    const res = await request(app).get(`/api/session/${sessionId}`)
    expect(res.status).toBe(200)
    expect(res.body.sessionId).toBe(sessionId)
    expect(res.body).toHaveProperty('conversationHistory')
    expect(res.body).toHaveProperty('personaSignoffs')
  })
})

describe('POST /api/session/:id/message', () => {
  let sessionId: string

  beforeEach(async () => {
    mockGenerateContent.mockResolvedValue(gmJSON('developer'))
    mockSendMessageStream.mockResolvedValue(personaStream())
    const res = await request(app).post('/api/session/start')
    sessionId = (res.body as { sessionId: string }).sessionId
  })

  it('returns 404 for unknown sessionId', async () => {
    const res = await request(app).post('/api/session/unknown/message').send({ content: 'Hi' })
    expect(res.status).toBe(404)
  })

  it('returns 400 when content is absent', async () => {
    const res = await request(app).post(`/api/session/${sessionId}/message`).send({})
    expect(res.status).toBe(400)
  })

  it('returns 400 when content is blank', async () => {
    const res = await request(app).post(`/api/session/${sessionId}/message`).send({ content: '   ' })
    expect(res.status).toBe(400)
  })

  it('responds with text/event-stream', async () => {
    const res = await request(app)
      .post(`/api/session/${sessionId}/message`)
      .send({ content: 'My stories.' })
    expect(res.headers['content-type']).toContain('text/event-stream')
  })

  it('emits a typing event with the correct persona', async () => {
    const res = await request(app)
      .post(`/api/session/${sessionId}/message`)
      .send({ content: 'My stories.' })
    const events = parseSSEEvents(res.text)
    const typing = events.find(e => e.type === 'typing')
    expect(typing?.persona).toBe('developer')
  })

  it('emits text events containing the persona message', async () => {
    const res = await request(app)
      .post(`/api/session/${sessionId}/message`)
      .send({ content: 'My stories.' })
    const events = parseSSEEvents(res.text)
    const combined = events.filter(e => e.type === 'text').map(e => e.text).join('')
    expect(combined).toContain('DEVELOPER SIGN-OFF')
  })

  it('emits a done event with signedOff true when marker is present', async () => {
    const res = await request(app)
      .post(`/api/session/${sessionId}/message`)
      .send({ content: 'Stories done.' })
    const events = parseSSEEvents(res.text)
    const done = events.find(e => e.type === 'done')
    expect(done?.signedOff).toBe(true)
  })

  it('advances phase to review after a single signoff', async () => {
    const res = await request(app)
      .post(`/api/session/${sessionId}/message`)
      .send({ content: 'Stories done.' })
    const events = parseSSEEvents(res.text)
    const done = events.find(e => e.type === 'done')
    expect(done?.phase).toBe('review')
  })

  it('adds user message to conversationHistory', async () => {
    await request(app)
      .post(`/api/session/${sessionId}/message`)
      .send({ content: 'Unique content XYZ' })
    const session = sessions.get(sessionId)!
    expect(session.conversationHistory.some(m => m.content === 'Unique content XYZ')).toBe(true)
  })

  it('emits a phase:judging event when GM returns nextSpeaker=end', async () => {
    mockGenerateContent.mockResolvedValueOnce(gmJSON('end'))
    const res = await request(app)
      .post(`/api/session/${sessionId}/message`)
      .send({ content: 'Done.' })
    const events = parseSSEEvents(res.text)
    const phaseEvent = events.find(e => e.type === 'phase')
    expect(phaseEvent?.phase).toBe('judging')
  })
})

describe('POST /api/session/:id/document', () => {
  let sessionId: string

  beforeEach(async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Generated brief content.' },
    })
    const res = await request(app).post('/api/session/start')
    sessionId = (res.body as { sessionId: string }).sessionId
  })

  it('returns 404 for unknown session', async () => {
    const res = await request(app).post('/api/session/nope/document').send({ docType: 'brief' })
    expect(res.status).toBe(404)
  })

  it('returns 400 when docType is missing', async () => {
    const res = await request(app).post(`/api/session/${sessionId}/document`).send({})
    expect(res.status).toBe(400)
  })

  it('returns 200 with the generated document content', async () => {
    const res = await request(app)
      .post(`/api/session/${sessionId}/document`)
      .send({ docType: 'brief' })
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('Generated brief content.')
  })

  it('caches the document — Gemini is not called again on repeat request', async () => {
    await request(app).post(`/api/session/${sessionId}/document`).send({ docType: 'brief' })
    const callCountAfterFirst = mockGenerateContent.mock.calls.length
    await request(app).post(`/api/session/${sessionId}/document`).send({ docType: 'brief' })
    expect(mockGenerateContent.mock.calls.length).toBe(callCountAfterFirst) // no extra call
  })
})

describe('POST /api/session/:id/judge', () => {
  let sessionId: string

  beforeEach(async () => {
    mockGenerateContent.mockResolvedValue(judgeJSON())
    const res = await request(app).post('/api/session/start')
    sessionId = (res.body as { sessionId: string }).sessionId
  })

  it('returns 404 for unknown session', async () => {
    const res = await request(app).post('/api/session/nope/judge')
    expect(res.status).toBe(404)
  })

  it('returns structured feedback with 5 score dimensions', async () => {
    const res = await request(app).post(`/api/session/${sessionId}/judge`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.scores)).toBe(true)
    expect(res.body.scores).toHaveLength(5)
  })

  it('returns an overallScore (number) and summary (string)', async () => {
    const res = await request(app).post(`/api/session/${sessionId}/judge`)
    expect(typeof res.body.overallScore).toBe('number')
    expect(typeof res.body.summary).toBe('string')
  })

  it('marks session phase as complete after judging', async () => {
    await request(app).post(`/api/session/${sessionId}/judge`)
    expect(sessions.get(sessionId)!.phase).toBe('complete')
  })
})
