# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anonymous WebSocket Chat Room** — a serverless, single-channel, anonymous real-time chat. The React frontend is hosted on GitHub Pages; the backend runs entirely on AWS (API Gateway WebSocket + Lambda + DynamoDB).

## Common Commands

All frontend commands run from `webui/`:

```bash
cd webui
npm install          # install deps
npm run dev          # dev server at http://localhost:5173
npm run build        # TypeScript compile → Vite bundle → webui/dist/
npm run preview      # serve the production build locally
```

There are no tests configured; `tsc` (run as part of `build`) is the primary type-checker.

## Architecture

```
Browser (React SPA)
  │  WebSocket (wss://)
  ▼
AWS API Gateway v2 (WebSocket API)
  ├── $connect    → Lambda: store connectionId + callsign in DynamoDB
  ├── $disconnect → Lambda: delete connectionId from DynamoDB
  └── sendMessage → Lambda: scan DynamoDB, PostToConnection to every live connection
```

- **Frontend:** `webui/` — React 18 + TypeScript + Vite. No state management library; all WebSocket logic lives in `src/hooks/useWebSocket.ts`.
- **Backend specs:** `documents/` — architecture, API spec, and per-Lambda specs (no Lambda source is committed here; they live in AWS).
- **No message persistence** — messages are fan-out only; DynamoDB stores active connections, not chat history.

## Key Configuration

**WebSocket endpoint** is set via environment variable:

```
# webui/.env.local  (copy from .env.example)
VITE_WS_ENDPOINT=wss://<api-id>.execute-api.<region>.amazonaws.com/prod
```

`src/config.ts` falls back to a placeholder default if the variable is unset.

**Vite `base`** in `vite.config.ts` is set to `/ncnu_chat_room/` — this must match the GitHub repo name for GitHub Pages asset paths to resolve correctly.

## Deployment

GitHub Pages deployment is triggered automatically on push to `main` via GitHub Actions (workflow in `.github/workflows/`). The workflow runs `npm ci && npm run build` in `webui/`, then publishes `webui/dist/` using `peaceiris/actions-gh-pages`.

Live URL: `https://judy9.github.io/ncnu_chat_room/`

## Frontend Structure

```
webui/src/
├── App.tsx              # Root: routes between JoinScreen ↔ ChatScreen
├── config.ts            # WS_ENDPOINT from env
├── types/index.ts       # ServerMessage, ConnectionStatus, etc.
├── hooks/
│   └── useWebSocket.ts  # All WebSocket logic: connect, reconnect, send, receive
└── components/
    ├── JoinScreen.tsx   # Callsign input; initiates WS connection on submit
    ├── ChatScreen.tsx   # Composes MessageList + MessageInput + StatusIndicator
    ├── MessageList.tsx  # Auto-scrolling list
    ├── MessageItem.tsx  # Renders one chat or system message
    ├── MessageInput.tsx # Text field + Send button (max 1000 chars)
    └── StatusIndicator.tsx
```

**Reconnection logic** (in `useWebSocket.ts`): exponential backoff (2s → 4s → 8s → 16s → 30s cap), up to 5 attempts, then shows a manual reconnect button. Initial connection failures do **not** auto-retry.

## Message Protocol

**Client → server:**
```json
{ "action": "sendMessage", "text": "..." }
```
Callsign is passed as a query param on connect: `?callsign=<value>`.

**Server → client:**
```json
{ "type": "message",  "callsign": "...", "text": "...", "timestamp": "<ISO 8601>" }
{ "type": "system",   "event": "user_joined|user_left", "callsign": "...", "timestamp": "..." }
```

---

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
