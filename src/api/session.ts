import crypto from 'crypto'
import { createRequire } from 'module'
import type { SessionState, Blueprint, DocumentState, Trigger } from '../types/session.js'

const require = createRequire(import.meta.url)
const blueprints = require('../../content/blueprints.json') as Blueprint[]
const documentStates = require('../../content/document-states.json') as DocumentState[]
const triggers = require('../../content/triggers.json') as Trigger[]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const sessions = new Map<string, SessionState>()

export function createSession(difficulty: 1 | 2 | 3 | 4 = 1): SessionState {
  return {
    sessionId: crypto.randomUUID(),
    blueprint: pickRandom(blueprints),
    documentState: pickRandom(documentStates),
    trigger: pickRandom(triggers),
    difficulty,
    conversationHistory: [],
    generatedDocuments: {},
    personaSignoffs: { developer: false, qa: false },
    phase: 'challenge',
  }
}
