import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { createSession, sessions } from '../src/api/session.js'
import { runGameMaster } from '../src/api/game-master.js'
import { runPersona } from '../src/api/persona.js'
import { generateDocument, generateRequirements } from '../src/api/document.js'
import { runJudge } from '../src/api/judge.js'
import type { Message } from '../src/types/session.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const port = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// Load all prompts at startup and cache in memory
const promptsDir = join(__dirname, '../prompts')
const prompts = {
  gameMaster: readFileSync(join(promptsDir, 'game-master.md'), 'utf-8'),
  developer: readFileSync(join(promptsDir, 'developer-persona.md'), 'utf-8'),
  qa: readFileSync(join(promptsDir, 'qa-persona.md'), 'utf-8'),
  judge: readFileSync(join(promptsDir, 'judge.md'), 'utf-8'),
  documentGenerator: readFileSync(join(promptsDir, 'document-generator.md'), 'utf-8'),
  requirementsGenerator: readFileSync(join(promptsDir, 'requirements-generator.md'), 'utf-8'),
}

console.log('Prompts loaded:', Object.keys(prompts).join(', '))

// ── Routes ──────────────────────────────────────────────────────────────────

// POST /api/session/start
app.post('/api/session/start', (_req, res) => {
  const session = createSession()
  sessions.set(session.sessionId, session)
  res.json({
    sessionId: session.sessionId,
    trigger: session.trigger,
    blueprint: session.blueprint,
    documentState: session.documentState,
    phase: session.phase,
  })
})

// GET /api/session/:id
app.get('/api/session/:id', (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json(session)
})

// POST /api/session/:id/message — SSE streaming
app.post('/api/session/:id/message', async (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const { content } = req.body as { content: string }
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' })

  // Add user message to history
  const userMessage: Message = { role: 'user', content, timestamp: Date.now() }
  session.conversationHistory.push(userMessage)

  // Context compression: summarise messages 0–9 when history exceeds 20
  if (session.conversationHistory.length > 20) {
    const summarised = session.conversationHistory.slice(0, 10)
    const summary: Message = {
      role: 'system',
      content: summarised.map(m => `${m.role}: ${m.content}`).join(' | '),
      timestamp: Date.now(),
    }
    session.conversationHistory = [summary, ...session.conversationHistory.slice(10)]
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const MAX_CHAIN = 4
    let chainCount = 0

    while (chainCount < MAX_CHAIN) {
      const gmOutput = await runGameMaster(session, prompts.gameMaster)

      if (gmOutput.nextSpeaker === 'end') {
        session.phase = 'judging'
        res.write(`data: ${JSON.stringify({ type: 'phase', phase: 'judging' })}\n\n`)
        res.end()
        return
      }

      if (gmOutput.nextSpeaker === 'wait') break

      res.write(`data: ${JSON.stringify({ type: 'typing', persona: gmOutput.nextSpeaker })}\n\n`)

      const personaPrompt =
        gmOutput.nextSpeaker === 'developer' ? prompts.developer : prompts.qa

      const { message, signedOff } = await runPersona(
        session,
        gmOutput.nextSpeaker,
        gmOutput,
        personaPrompt,
        res,
      )

      session.conversationHistory.push({
        role: gmOutput.nextSpeaker,
        content: message,
        timestamp: Date.now(),
      } as Message)

      if (signedOff) {
        session.personaSignoffs[gmOutput.nextSpeaker] = true
        session.phase =
          session.personaSignoffs.developer && session.personaSignoffs.qa
            ? 'judging'
            : 'review'
      }

      chainCount++

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          persona: gmOutput.nextSpeaker,
          signedOff,
          phase: session.phase,
          signoffs: session.personaSignoffs,
        })}\n\n`,
      )

      if (session.phase === 'judging') break
    }

    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`)
    res.end()
  }
})

// POST /api/session/:id/document
app.post('/api/session/:id/document', async (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const { docType } = req.body as { docType: string }
  if (!docType) return res.status(400).json({ error: 'docType is required' })

  // Return cached doc if already generated
  if (session.generatedDocuments[docType]) {
    return res.json({ content: session.generatedDocuments[docType] })
  }

  try {
    const content = await generateDocument(session, docType, prompts.documentGenerator)
    session.generatedDocuments[docType] = content
    res.json({ content })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/session/:id/submit
app.post('/api/session/:id/submit', async (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const { content } = req.body as { content: string }
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' })

  if (session.generatedDocuments['submission']) {
    return res.status(409).json({ error: 'Submission already exists' })
  }

  session.generatedDocuments['submission'] = content.trim()

  // Generate hidden complete requirements reference for personas + judge
  try {
    const requirements = await generateRequirements(session, prompts.requirementsGenerator)
    session.generatedDocuments['_requirements'] = requirements
  } catch (err) {
    console.error('Requirements generation failed:', err)
  }

  res.json({ ok: true })
})

// POST /api/session/:id/judge
app.post('/api/session/:id/judge', async (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  try {
    session.phase = 'judging'
    const feedback = await runJudge(session, prompts.judge)
    session.phase = 'complete'
    res.json(feedback)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

export { app }

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
  })
}
