# PO Test Bench — Claude Code Instructions

## What This Project Is

PO Test Bench is an AI-powered Product Owner learning app. Users are dropped into fictional
project situations, write professional documents (user stories, PRDs, acceptance criteria),
and defend them in a live group chat against AI personas (Developer, QA) before receiving
a scored debrief from an AI Judge.

Read `SKILL.md` before making any substantive change to this codebase. It contains the
full product design, architecture decisions, and invariants that every code change must respect.

---

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS (single page app)
- **Backend:** Node.js + Express (lightweight API layer)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- **Session state:** In-memory only for MVP (no database)
- **Deployment target:** Frontend → Vercel, Backend → Railway or Render

---

## Project Structure

```
po-test-bench/
├── CLAUDE.md                  ← You are here
├── SKILL.md                   ← Read this first
├── package.json
├── /prompts                   ← AI system prompts (one file per role)
├── /content                   ← JSON content libraries (blueprints, states, triggers)
├── /src
│   ├── /api                   ← AI call handlers
│   ├── /types                 ← Shared TypeScript interfaces
│   └── /frontend              ← React components
└── /server
    └── index.ts               ← Express server entry point
```

---

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (frontend + backend concurrently)
npm run build        # Production build
npm run typecheck    # TypeScript check only
npm run lint         # ESLint
```

---

## Core Architecture Rules

These are non-negotiable. Every PR must respect them.

### 1. Session State Is a Typed Object
`conversationHistory` is always a `Message[]` array — never a concatenated string.
This is required for context compression to work cleanly at scale.

### 2. Documents Never Enter Conversation History
Generated documents (PRD, brief, meeting notes) are stored in `session.generatedDocuments`
and injected into the system prompt on each API call. They are never pushed to
`session.conversationHistory`. Violating this causes quadratic cost growth.

### 3. Game Master Always Runs First
Never call a Persona directly. The Game Master call must precede every Persona call.
It returns `{ nextSpeaker, focus, tone }` as JSON. Parse it, then invoke the Persona.

### 4. AI Call Sequence Per User Turn
```
User message → Game Master → Persona (Developer or QA) → stream to chat
```
At session end:
```
All signoffs complete → Judge → structured feedback panel
```

### 5. "Typing" Indicator Timing
Show `[PersonaName] is typing...` **immediately after the Game Master call resolves**,
before the Persona call starts. The persona identity is revealed only when the message
arrives. This creates the spontaneous group-chat feel.

### 6. System Prompt Token Ceilings
All prompts in `/prompts/` have a token ceiling (see SKILL.md). Before committing any
prompt change, verify the token count and update the comment at the top of the file:
```
<!-- token-count: ~720 | last-checked: 2026-04 -->
```
Use `tiktoken` or the Anthropic tokeniser to check.

### 7. Game Master Reads Last 8 Messages Only
Pass `session.conversationHistory.slice(-8)` to the Game Master call — not the full
history. This keeps the GM call cheap. Personas and Judge receive full history.

### 8. Context Compression Trigger
When `conversationHistory.length > 20`, summarise messages at index 0–9 into a single
summary `Message` object before the next call. Keep messages 10+ in full.

### 9. MVP Difficulty Is Level 1 Only
`difficulty` is hardcoded to `1` in session assembly. Do not implement Level 2+ logic
until explicitly scoped in a future milestone.

---

## AI Prompt Files

Each role has exactly one prompt file in `/prompts/`. Do not inline prompts in code.

| File | Role | Returns |
|------|------|---------|
| `game-master.md` | Game Master | JSON `{ nextSpeaker, focus, tone }` |
| `developer-persona.md` | Developer Simulator | In-character chat message |
| `qa-persona.md` | QA Simulator | In-character chat message |
| `judge.md` | Judge | Structured feedback object |
| `document-generator.md` | Document Generator | Raw document text |

Load prompt files at server startup. Cache them in memory — do not read from disk on
every request.

---

## Content Library Files

All content is in `/content/` as JSON. The session assembly function in `/src/api/session.ts`
randomly selects one entry from each file using `Math.random()`.

| File | Description |
|------|-------------|
| `blueprints.json` | Fictional companies and products (target: 5 for MVP) |
| `document-states.json` | How complete/coherent the project docs are (3 for MVP) |
| `triggers.json` | Opening events the user sees (10 for MVP) |

Adding new content = adding a new JSON entry. No code changes required.

---

## TypeScript Interfaces

Core types live in `/src/types/session.ts`. Do not duplicate these elsewhere.

```typescript
interface Message {
  role: 'user' | 'developer' | 'qa' | 'system';
  content: string;
  timestamp: number;
}

interface SessionState {
  sessionId: string;
  blueprint: Blueprint;
  documentState: DocumentState;
  trigger: Trigger;
  difficulty: 1 | 2 | 3 | 4;
  conversationHistory: Message[];
  generatedDocuments: Record<string, string>;
  personaSignoffs: { developer: boolean; qa: boolean; };
  phase: 'challenge' | 'review' | 'judging' | 'complete';
}
```

---

## API Endpoints

```
POST /api/session/start         → Creates session, returns trigger + sessionId
POST /api/session/:id/message   → User message → GM → Persona → streamed response
POST /api/session/:id/document  → Generates a document on demand
POST /api/session/:id/judge     → Triggers Judge, returns structured feedback
GET  /api/session/:id           → Returns current session state (for reconnects)
```

All endpoints validate that `sessionId` exists in the in-memory store before processing.

---

## Frontend Components

| Component | Responsibility |
|-----------|---------------|
| `App.tsx` | Session lifecycle, top-level state |
| `ContextPanel.tsx` | Displays trigger, document request buttons |
| `GroupChat.tsx` | Chat thread, message rendering, input |
| `TypingIndicator.tsx` | "[Name] is typing..." shown after GM resolves |
| `DocumentModal.tsx` | Overlay for viewing generated documents |
| `JudgeFeedback.tsx` | End-of-session feedback panel (replaces chat view) |

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=          # Required — Anthropic API key
PORT=3001                   # Backend port (default 3001)
VITE_API_URL=               # Frontend → backend URL (e.g. http://localhost:3001)
```

---

## What Not to Build (MVP Scope)

- User authentication or accounts
- Persistent storage / database
- Difficulty levels above 1
- Challenge types beyond Backlog Builder (user stories)
- Progress tracking or skill radar charts
- Open-submission Red Pen Review (user's own documents)
- More than 2 personas (Developer + QA only)

If a feature is not in the list above, check the design document before implementing.

---

## When You're Unsure

1. Check `SKILL.md` — it has the full product design and invariants
2. Check the architecture rules in this file
3. If genuinely ambiguous, implement the simpler option and add a `// TODO:` comment
   explaining the trade-off, rather than making an undocumented product decision