---
name: po-test-bench
description: >
  Build, extend, and maintain PO Test Bench — an AI-powered Product Owner learning app.
  Use this skill whenever working on any part of this codebase: adding challenge content,
  modifying AI prompts, building UI components, wiring API routes, or debugging session
  state. This skill encodes the full product design so Claude Code can make decisions
  consistent with the architecture without needing to re-derive it each time.
---

# PO Test Bench — Developer Skill

PO Test Bench is an AI-powered learning app that trains Product Owners and Business Analysts
through realistic, high-pressure document challenges. Users are dropped into a fictional project
situation, write professional documents (user stories, PRDs, acceptance criteria), and defend
them in a live group chat against AI personas (Developer, QA) before receiving a scored debrief
from an AI Judge.

---

## Architecture Overview

The app has four distinct AI roles and three data layers. Understanding both is prerequisite
to touching any part of the codebase.

### Four AI Roles

| Role | Visible to User? | When It Runs | Purpose |
|------|-----------------|--------------|---------|
| Document Generator | No (output is) | On user document request | Generates on-demand PRDs, briefs, meeting notes calibrated to Document State |
| Game Master | Never | After every user message | Decides who speaks next and what angle they take |
| Persona Simulator | Yes (as chat messages) | After Game Master routes | Runs Developer or QA persona in character with hidden acceptance criteria |
| Judge | Yes (end of session) | Once, after all sign-offs | Scores the full negotiation across 5 dimensions |

### Three Content Layers (randomly assembled per session)

1. **Project Blueprint** — 5–30 short descriptions of fictional company/product/stage
2. **Document State** — 3–5 profiles controlling how complete/coherent project docs are
3. **Situational Trigger** — 10–50 opening events (email, Slack message, brief) the user sees

All three are stored as JSON in `/content/`. Randomisation is mechanical (code), not AI.

---

## Session State Shape

Session state must be a structured object from day one. Never flatten to a string.

```typescript
interface SessionState {
  sessionId: string;
  blueprint: Blueprint;
  documentState: DocumentState;
  trigger: Trigger;
  difficulty: 1 | 2 | 3 | 4;          // MVP ships Level 1 only
  conversationHistory: Message[];       // Array, never string — enables compression
  generatedDocuments: Record<string, string>; // key: docType, value: content
  personaSignoffs: {
    developer: boolean;
    qa: boolean;
  };
  phase: 'challenge' | 'review' | 'judging' | 'complete';
}
```

**Critical rule:** Generated documents (PRD, brief, etc.) live in `generatedDocuments`,
NOT in `conversationHistory`. They are injected into the system prompt context on each
call — not appended to the chat thread. This prevents quadratic cost growth.

---

## AI Call Architecture

Every user message triggers this sequence:

```
User message
    │
    ▼
[1] Game Master call
    Input:  GM system prompt + last 8 messages + persona signoff state + difficulty level
    Output: JSON { nextSpeaker: "developer"|"qa"|"end", focus: string, tone: string }
    │
    ▼
[2] Persona call (Developer or QA)
    Input:  Persona system prompt + full history + generated documents (injected) + GM instruction
    Output: In-character chat message
    │
    ▼
Show "[Persona] is typing..." indicator immediately when GM call completes
Stream persona response into chat
```

At session end:
```
[3] Judge call
    Input:  Judge system prompt + full conversation history + original document + generated docs
    Output: Structured feedback across 5 dimensions
```

---

## System Prompt Guidelines

Each prompt lives in `/prompts/` as a separate `.md` file. Token budget is strict.

| Prompt File | Token Ceiling | Notes |
|-------------|--------------|-------|
| `game-master.md` | 800 | Returns JSON only. Include difficulty behaviour table. |
| `developer-persona.md` | 900 | Hidden AC must be embedded. Never break character. |
| `qa-persona.md` | 900 | Hidden AC must be embedded. Never break character. |
| `judge.md` | 1000 | Scores negotiation, not just final document. |
| `document-generator.md` | 700 | Receives Blueprint + DocumentState. Returns doc only. |

Track token count in a comment at the top of each prompt file:
```
<!-- token-count: ~650 | last-checked: 2026-04 -->
```

### Hidden Acceptance Criteria (embedded in persona prompts)

**Developer persona AC (must satisfy to sign off):**
- Every acceptance criterion has a concrete, implementable definition
- At least one error state or edge case is explicitly handled
- No acceptance criterion requires the developer to make a product decision

**QA persona AC (must satisfy to sign off):**
- No acceptance criterion uses subjective language (fast, intuitive, easy)
- Happy path AND at least one failure path are both traceable from the document
- Every criterion has a measurable pass/fail condition

---

## Content Library Schema

### Blueprint (`/content/blueprints.json`)
```json
{
  "id": "bp-001",
  "industry": "HR Tech",
  "companyType": "B2B SaaS startup",
  "companySize": "40 people",
  "product": "Leave management tool",
  "stage": "Growth — pushing into enterprise",
  "context": "Enterprise clients are requesting integrations with payroll systems. The engineering team is stretched across two parallel workstreams."
}
```

### Document State (`/content/document-states.json`)
```json
{
  "id": "ds-underdocumented",
  "name": "Underdocumented",
  "label": "Only a brief exists",
  "generatorInstruction": "Generate a thin, 1-page document. Leave obvious gaps — no success metrics, no edge cases, no non-functional requirements. The tone suggests it was written in a hurry."
}
```

### Trigger (`/content/triggers.json`)
```json
{
  "id": "tr-001",
  "format": "email",
  "compatibleIndustries": ["all"],
  "content": "Hi — we need to get the dashboard sharing feature into the next sprint. Sales promised it to Acme Corp. Can you get the stories written up today? Cheers, Marcus",
  "task": "Write the user stories and acceptance criteria for the dashboard sharing feature described in the email above."
}
```

---

## Difficulty Scaling

Difficulty is controlled entirely by Game Master prompt instructions, not by content changes.

| Level | Name | Game Master Behaviour | MVP? |
|-------|------|-----------------------|------|
| 1 | Junior Refinement | Sequential concerns, clear signoff signals, no persona conflict | ✅ Ship |
| 2 | Standard Sprint | Overlapping concerns, mild Dev vs QA contradiction | Post-MVP |
| 3 | Pressure Test | Persona re-opens closed concern, time pressure language | Post-MVP |
| 4 | Expert Review | Third persona mid-session, partial signoff as valid resolution | Post-MVP |

---

## Judge Scoring Dimensions

The Judge scores the negotiation, not the document in isolation.

| Dimension | What It Measures |
|-----------|-----------------|
| Defensibility | Did the user justify decisions under pressure, or cave without reasoning? |
| Adaptability | When valid criticism arose, did the user incorporate it clearly? |
| Clarity Under Pressure | Did responses make things clearer, or introduce new ambiguity? |
| Document Quality (final) | How good is the document after the full negotiation? |
| Risk Awareness | Did the user proactively flag trade-offs, or only react when challenged? |

---

## UI Layout (MVP)

```
┌─────────────────────────────────────────────────────────────┐
│  PO Test Bench                              [New Challenge]  │
├──────────────────┬──────────────────────────────────────────┤
│                  │                                          │
│  CONTEXT PANEL   │         GROUP CHAT                       │
│  (left ~30%)     │         (centre ~70%)                    │
│                  │                                          │
│  Trigger text    │  [Developer] Here's my concern...        │
│  ─────────────   │  [You] The acceptance criterion means... │
│  [View PRD]      │  Developer is typing...                  │
│  [View Brief]    │  ─────────────────────────────────────   │
│                  │  [text input]           [Send]           │
│                  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

- "Developer is typing..." appears immediately when Game Master call resolves
- Persona identity revealed only when message arrives (spontaneous feel)
- Document view opens in a modal/drawer overlay — not inline in the chat
- End-of-session Judge feedback replaces the chat panel entirely

---

## Cost Control Rules

1. **Documents never enter `conversationHistory`** — inject via system prompt context only
2. **Game Master reads last 8 messages max** — not full history
3. **Persona and Judge read full history** — necessary for context quality
4. **Context compression trigger:** when `conversationHistory.length > 20`, summarise
   messages 1–10 into a single summary object before the next call
5. **System prompt token ceilings** are hard limits — run through tokeniser before committing

---

## File Structure

```
po-test-bench/
├── CLAUDE.md                  ← Project instructions for Claude Code
├── SKILL.md                   ← This file
├── package.json
├── /prompts
│   ├── game-master.md
│   ├── developer-persona.md
│   ├── qa-persona.md
│   ├── judge.md
│   └── document-generator.md
├── /content
│   ├── blueprints.json
│   ├── document-states.json
│   └── triggers.json
├── /src
│   ├── /api
│   │   ├── session.ts         ← Session assembly (random Blueprint+State+Trigger)
│   │   ├── game-master.ts     ← GM call + routing logic
│   │   ├── persona.ts         ← Persona call + streaming
│   │   ├── judge.ts           ← End-of-session scoring
│   │   └── document.ts        ← On-demand document generation
│   ├── /types
│   │   └── session.ts         ← SessionState, Message, Blueprint etc.
│   └── /frontend
│       ├── App.tsx
│       ├── ContextPanel.tsx
│       ├── GroupChat.tsx
│       ├── TypingIndicator.tsx
│       ├── DocumentModal.tsx
│       └── JudgeFeedback.tsx
└── /server
    └── index.ts               ← Express API layer
```

---

## Key Invariants (never break these)

- `conversationHistory` is always an array of typed `Message` objects
- Documents are always stored in `generatedDocuments`, never pushed to `conversationHistory`
- The Game Master call always precedes the Persona call — never call a persona directly
- The Judge is called exactly once per session, after all persona signoffs or session close
- Difficulty Level 1 is the only shipped difficulty for MVP
- System prompt token counts must be verified before any prompt commit