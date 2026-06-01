# Technical Design — TatvaCare × Fortis Health Package Finder

**Date:** 2026-05-27
**Status:** End-to-end flow verified working — session → questionnaire → scoring → recommendation → LLM explanation → booking handoff all confirmed.
**Scope:** TatvaCare-owned webview (tatvacare-webview repo). The myFortis demo mock (`myfortis-spoof/`) is a separate, demo-only artifact — it is not part of this production system and is documented in Section 13.
**Production readiness:** This document describes the current demo implementation. For known gaps between demo and production, see `issuestofixinproduction.md`.

---

## 1. System Overview

A user inside the myFortis app taps the "Help me find a health package" banner on the Home screen. This opens a TatvaCare-owned webview (the host app stays on Home — no navigation into the Health Packages screen). The user answers a branching questionnaire (8–13 questions depending on health profile), receives a recommended Fortis health package, and can optionally ask an AI to explain why that package was chosen for them.

**Three actors:**
- **myFortis app (Fortis)** — entry point, passes patient identifier, receives booking webhook
- **TatvaCare webview (this repo)** — owns the questionnaire, scoring, recommendation, and AI explanation
- **Fortis backend** — receives webhooks when a user proceeds to book

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React + Tailwind CSS | Component-based UI, utility-first styling, production-scalable |
| Backend | Node.js + Express.js | Lightweight, fast, familiar for JS full-stack |
| Database | MongoDB Atlas | Flexible document model suits variable question/answer shapes; Atlas scales to production |
| AI / LLM | Provider-agnostic via `openai` npm package (currently: Groq — llama-3.3-70b-versatile) | Swap by changing 3 env vars — no code changes. See Section 6. |
| Session storage | localStorage (answers) + sessionStorage (fresh-session gate) | localStorage persists across refreshes; sessionStorage clears on tab/webview close — together they control resume vs restart behaviour |

---

## 3. Data Files (source of truth — replaceable)

All business logic inputs are stored as JSON files in `backend/data/`. These are loaded at server startup and are NOT stored in MongoDB — they are configuration, not operational data.

| File | Purpose | When to replace |
|---|---|---|
| `AHClisting.json` | 10 Fortis packages with oracle codes, prices, and test lists | When Fortis provides actual test lists |
| `questions.json` | 13 questions with branching logic and option IDs | If questionnaire needs to change |
| `scoringLogic.json` | Scoring rules + LLM context descriptions | If scoring weights need tuning |

---

## 4. MongoDB Collections Design

### 4.1 `sessions`
Created immediately when the webview opens. One document per visit.

```json
{
  "sessionId":   "uuid-v4",
  "patientId":   "FORTIS_PATIENT_123",
  "createdAt":   "2026-05-27T10:00:00Z",
  "completedAt": null,
  "source":      "myFortis-webview"
}
```

`completedAt` is set when the user reaches the recommendation screen.

### 4.2 `responses`
Created when the user submits the questionnaire. One document per session, stores all answers in a single array.

```json
{
  "sessionId": "uuid-v4",
  "answers": [
    {
      "questionId":   "Q1",
      "questionText": "What is your gender?",
      "answerId":     "Q1_M",
      "answerText":   "Male"
    },
    {
      "questionId":   "Q3",
      "questionText": "Do you have any diagnosed medical conditions?",
      "answerId":     "Q3_DIA",
      "answerText":   "Diabetes or pre-diabetes"
    }
  ],
  "activeBranches": ["BRANCH_A"],
  "savedAt": "2026-05-27T10:05:00Z"
}
```

Storing `questionText` and `answerText` alongside IDs means the LLM payload is self-contained — no question lookup required at explain time.

### 4.3 `recommendations`
Created alongside `responses` at questionnaire completion. `llmExplanation` starts null and is populated lazily.

```json
{
  "sessionId": "uuid-v4",
  "recommendedPackage": {
    "oracleCode": 441664,
    "name":       "Diabetic Profile",
    "gender":     "female",
    "price":      8900
  },
  "finalScores": {
    "Basic": 3, "Silver": 4, "Gold": 3, "Diabetic": 18, "Heart": 2
  },
  "scoringBreakdown": [
    { "questionId": "Q3", "answerId": "Q3_DIA", "contribution": { "Diabetic": 5 } },
    { "questionId": "Q9", "answerId": "Q9_DIA", "contribution": { "Diabetic": 4 } }
  ],
  "llmExplanation": null,
  "recommendedAt":  "2026-05-27T10:05:01Z",
  "explainedAt":    null
}
```

---

## 5. API Design

### `GET /api/questions`
Called immediately when the webview loads (in parallel with session init). Returns the full questions array from `backend/data/questions.json`. The frontend never holds a local copy — this is the single source of truth. Update the file on the backend; every client sees it immediately on next load.

**Response:**
```json
{ "questions": [ { "id": "Q1", "text": "What is your gender?", "branch": null, "options": [...] }, ... ] }
```

### `POST /api/session/init`
Called immediately when the webview loads (in parallel with `/api/questions`).

**Request:**
```json
{ "patientId": "FORTIS_PATIENT_123" }
```

**Response:**
```json
{ "sessionId": "uuid-v4", "createdAt": "ISO" }
```

### `POST /api/responses/save`
Called once when the user completes the questionnaire. Saves answers and triggers scoring in one request.

**Request:**
```json
{
  "sessionId": "uuid-v4",
  "answers": [ { "questionId": "Q1", "questionText": "...", "answerId": "Q1_M", "answerText": "Male" } ],
  "activeBranches": ["BRANCH_A"]
}
```

**Response:**
```json
{ "saved": true }
```

### `POST /api/recommend`
Called immediately after `/api/responses/save`. Runs scoring engine server-side and returns the winning package.

**Request:**
```json
{ "sessionId": "uuid-v4" }
```

**Response:**
```json
{
  "recommendedPackage": { "oracleCode": 441664, "name": "Diabetic Profile", "gender": "female", "price": 8900 },
  "finalScores": { "Basic": 3, "Silver": 4, "Gold": 3, "Diabetic": 18, "Heart": 2 }
}
```

### `GET /api/recommend/explain/:sessionId`
Called only when the user taps "Why this package?". Returns cached explanation if already generated.

**Response:**
```json
{
  "explanation": "Based on your answers, the Diabetic Profile is the most suited package for you...",
  "fromCache": true
}
```

### `POST /api/booking/notify`
Called when the user taps "Book This Package". Pulls the full session context from MongoDB and forwards it to the Fortis booking webhook. Non-blocking — a Fortis endpoint failure is logged but never shown to the user.

**Request:**
```json
{ "sessionId": "uuid-v4" }
```

**Payload forwarded to `FORTIS_BOOKING_WEBHOOK`:**
```json
{
  "event": "package_recommended",
  "patientId": "FORTIS_PATIENT_123",
  "sessionId": "uuid-v4",
  "recommendedPackage": { "oracleCode": 441665, "name": "Diabetic Profile", "gender": "male", "price": 8900 },
  "finalScores": { "Basic": 3, "Silver": 4, "Gold": 3, "Diabetic": 18, "Heart": 2 },
  "answers": [ { "questionId": "Q1", "questionText": "...", "answerId": "Q1_M", "answerText": "Male" } ],
  "activeBranches": ["BRANCH_A"],
  "recommendedAt": "ISO",
  "notifiedAt": "ISO"
}
```

**Response:**
```json
{ "notified": true, "payload": { ... } }
```

> **Production gap:** The Fortis webhook URL and auth scheme are not yet confirmed. See `issuestofixinproduction.md` issues #1 and #9.

---

## 6. Architectural Decision — LLM Provider: Locked-in SDK vs Provider-agnostic

### Original proposal
Use `@anthropic-ai/sdk` directly in `llmService.js`, targeting Claude as the only model.

### Challenge raised
> "I want configurability on the model that I can change in code — don't assume it will be Anthropic."

### Decision: OpenAI-compatible API pattern

`llmService.js` uses the `openai` npm package with a configurable `baseURL`. Most major providers (Anthropic, OpenAI, Google Gemini, Groq, Together, Mistral) expose an OpenAI-compatible `/v1/chat/completions` endpoint. Three env vars control everything:

| Env var | Purpose |
|---|---|
| `LLM_BASE_URL` | Provider API base URL |
| `LLM_API_KEY` | Provider API key |
| `LLM_MODEL` | Model name (e.g. `claude-sonnet-4-6`, `gpt-4o`, `llama-3.3-70b-versatile`) |

Zero code changes required to swap providers — only `.env` changes. The `openai` package handles serialisation, retries, and streaming if needed in future.

**Current dev configuration:** Groq — llama-3.3-70b-versatile (free tier, 30 req/min).
```
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

**Implementation note (resolved):** The `OpenAI` client is instantiated lazily inside `generateExplanation()` — not at module load time. The `openai` package throws at construction if the API key is empty. Since `dotenv` populates `process.env` before route handlers run but after module-level code executes, creating the client at the top of the file caused a crash on startup. Moving instantiation inside the function body fixes this. Verified: backend starts cleanly with `MongoDB connected` + `Backend running on port 3001`.

---

## 7. Architectural Decision — Scoring: Client-side vs Server-side

### Original proposal
Run scoring in the browser using a bundled copy of `scoringLogic.json`. Show recommendation instantly without a network round-trip. If internet drops, user still sees a result.

### Challenge raised
> "Why should scoring run on the client side?"

### Analysis

| Concern | Client-side | Server-side |
|---|---|---|
| Business logic exposure | Scoring rules visible in DevTools — gameable | Rules stay on the server — not exposed |
| Consistency | Logic must be kept in sync across frontend and backend deployments | Single source of truth on the server |
| Canonical result | Client and server could produce different results if out of sync | Server result is always authoritative |
| Healthcare context | User could manipulate scoring to get a preferred package | Server validates — result is trustworthy |
| Speed | Instant (no network call) | ~200–400ms round-trip (acceptable) |
| Offline resilience | Can show a result without internet | Cannot — but this is acceptable behaviour |

### Decision: Server-side scoring only

Scoring runs exclusively on the backend (`scoringEngine.js`). The frontend submits answers and waits for the server's recommendation. The questionnaire is short and scoring is fast — the round-trip is under 400ms, which is an acceptable wait for a health recommendation.

**Offline behaviour:** If the network call fails, the frontend shows a clear error ("Please check your connection and try again") rather than silently falling back to a potentially different client-side result. For a healthcare recommendation, a wrong-but-fast answer is worse than no answer.

### What stays client-side

Only **answer persistence** stays in the browser — answers are written to `localStorage` as the user progresses. This means a page refresh does not lose progress. On reload, the frontend restores answers from `localStorage` and resumes the questionnaire. No scoring happens locally.

---

## 8. Session Management

### Flow

```
myFortis opens: https://webview.tatvacare.in/?pid=FORTIS_PATIENT_123

1. Frontend reads pid from URL
2. POST /api/session/init → receive sessionId
3. Store { sessionId, pid, answers: [] } in localStorage
4. User answers questions → each answer appended to localStorage (no API call)
5. User submits → POST /api/responses/save + POST /api/recommend (sequential)
6. Show recommendation screen (3 CTAs below)

   A. "Book This Package"
      → POST /api/booking/notify — backend assembles full payload from MongoDB, POSTs to FORTIS_BOOKING_WEBHOOK (non-blocking)
      → window.opener.postMessage({ type:'FORTIS_PACKAGE_BOOKED', patientId, sessionId, oracleCode, packageName, gender, price }, '*')
      → setTimeout 150ms then window.close() — delay ensures the opener's event loop receives the message before the tab closes
      → Session stays in localStorage; if the user navigates back to the webview, the result screen is still intact
      → In production (native webview): window.opener path replaced by native JS bridge — see issuestofixinproduction.md issue #1

   B. "Why this package? ✨"
      → GET /api/recommend/explain/:sessionId → LLM explanation screen

   C. "Retake questionnaire" (tertiary link)
      → POST /api/session/init (new sessionId, new Mongo session doc)
      → Reset all React state, clear localStorage, write new session
      → WelcomeScreen — user starts fresh; old session/responses/recommendation preserved in Mongo
```

### Session restore on page reload vs webview reopen

The app uses both `localStorage` and `sessionStorage` together to distinguish two scenarios:

| Scenario | localStorage | sessionStorage flag | Behaviour |
|---|---|---|---|
| Page refresh mid-questionnaire | answers present | flag present (survives refresh) | Resume from where user left off |
| Webview closed and reopened | answers present | flag gone (cleared on close) | Clear localStorage → fresh session |
| First ever open | empty | flag gone | Fresh session |

**Implementation (`App.jsx`):**

```js
const STORAGE_KEY  = 'tc_fortis_session';  // localStorage — persists across refreshes
const SESSION_FLAG = 'tc_fortis_active';   // sessionStorage — cleared when tab/webview closes

function loadStorage() {
  if (!sessionStorage.getItem(SESSION_FLAG)) {
    // No flag → this is a new tab open or webview relaunch → wipe any prior session
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem(SESSION_FLAG, '1');
  }
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
```

**Why sessionStorage works for native webviews:**
- `sessionStorage` in the browser is tied to the tab's lifetime, not the browser process
- iOS `WKWebView` and Android `WebView` both clear `sessionStorage` when the webview is dismissed (back-pressed or destroyed)
- A page refresh does NOT clear `sessionStorage` — the flag survives
- This means: refresh = resume (flag present), back-press + re-tap CTA = fresh start (flag gone)

**Restore logic in `boot()` (App.jsx):**

```
1. If stored.completed + stored.recommendation → show result screen (resumed completed session)
2. If stored.sessionId + stored.answers.length > 0 → resume questionnaire at next unanswered question
3. Otherwise → fresh session: call /api/session/init, show welcome screen
```

### Session expiry

Sessions in MongoDB have no hard TTL for the demo. In production, add a 24-hour TTL index on `createdAt` in the `sessions` collection.

---

## 9. Resilience Strategy

### Answer persistence
- Every answer is written to localStorage immediately on selection
- No network call happens mid-questionnaire
- A page crash or refresh loses nothing

### Submission failures
- On questionnaire submit, call `/api/responses/save` → `/api/recommend` sequentially
- If either fails: retry up to 3 times with exponential backoff (1s → 2s → 4s)
- If all retries fail: show error UI — "We couldn't save your answers. Please check your connection and try again."
- Do NOT show a recommendation if the server has not confirmed it — accuracy matters more than speed

### "Why this package?" failures
- Single attempt with a 10-second timeout (LLM calls can be slow)
- On failure: show "We couldn't generate your explanation right now. Please try again in a moment."
- No retry loop — user-initiated, they can tap again

### LLM explanation caching
- First call to `/api/explain/:sessionId` hits the configured LLM provider and stores result in `recommendations.llmExplanation`
- Subsequent calls return the cached string — no repeat API cost
- `explainedAt` timestamp is set on first generation

---

## 10. LLM Integration — "Why this package?"

### What is passed to the LLM

The backend assembles the following context into a single prompt:

```
1. recommendedPackage   ← name, gender, price (from AHClisting.json)
2. testPanels           ← full panel names + key sub-tests (from AHClisting.json)
3. runnerUp             ← second-highest scoring package name + score (for contrast)
4. userAnswers          ← question text + answer text (from MongoDB responses)
5. scoringBreakdown     ← which answers contributed points to the winning package
```

### Why this is not RAG

RAG (Retrieval Augmented Generation) involves embedding a large corpus and retrieving relevant chunks at query time. This system does not need that — all context is structured, small, and known at query time. It is passed directly in the prompt. This is simpler, faster, and more reliable for a structured recommendation use case.

### Prompt file separation

The prompt is split across two files so non-developers can edit the wording without touching code:

| File | Responsibility |
|---|---|
| `services/WhyThisTestPrompt.md` | System prompt text — structure rules, guardrails, output format |
| `services/WhyThisTestPrompt.js` | Reads the `.md` at startup; exports `SYSTEM_PROMPT` + `buildUserMessage(payload)` |
| `services/llmService.js` | Assembles DB data into payload; calls `buildUserMessage`; calls LLM |

`llmService.js` contains zero hardcoded prompt text.

### Enforced output structure

The system prompt instructs the LLM to respond in exactly 3 sections:

1. **What this package tests** — key panels relevant to this patient, one sentence each on what they monitor
2. **Why it fits your profile** — every sentence must name an actual test AND reference the patient's answer
3. **Why a lower package wouldn't be enough** — names the runner-up package explicitly, states what it would have missed

Guardrails enforced in the prompt:
- Must name ≥4 specific tests by name (only from the provided list — no invented tests)
- Must name the runner-up package in section 3
- No diagnosis language ("you have X") — frame as "given your profile" or "for someone managing X"
- Maximum 3 sentences per section
- Temperature set to 0.3 — low creativity, high instruction-following

### Frontend rendering

`ExplainScreen.jsx` parses the `**heading**` markdown from the LLM response and renders each section as a separate card with a green header label. Falls back to plain paragraph rendering if the LLM doesn't follow the heading structure.

---

## 11. MongoDB Migration Guide

To move from the dev Atlas account to a production account:

1. Create new Atlas cluster
2. Update `MONGO_URI` in `.env` only
3. Re-run the seed script (if any) to pre-populate lookup data
4. No code changes required — `config/db.js` reads from `process.env.MONGO_URI`

---

## 12. Folder Structure

```
tatvacare-webview/
├── CLAUDE.md
├── techdesign.md                    ← this file
├── backend/
│   ├── config/
│   │   └── db.js                    ← mongoose.connect(process.env.MONGO_URI)
│   ├── models/
│   │   ├── Session.js               ← Mongoose schema for sessions collection
│   │   ├── Response.js              ← Mongoose schema for responses collection
│   │   └── Recommendation.js        ← Mongoose schema for recommendations collection
│   ├── routes/
│   │   ├── session.js               ← POST /api/session/init
│   │   ├── questions.js             ← GET /api/questions
│   │   ├── responses.js             ← POST /api/responses/save
│   │   ├── recommend.js             ← POST /api/recommend, GET /api/recommend/explain/:sessionId
│   │   └── booking.js               ← POST /api/booking/notify (pulls MongoDB data, fires Fortis webhook)
│   ├── services/
│   │   ├── scoringEngine.js         ← loads scoringLogic.json, computes package scores
│   │   ├── llmService.js            ← assembles payload, imports prompt from WhyThisTestPrompt.js, calls LLM
│   │   ├── WhyThisTestPrompt.js     ← reads WhyThisTestPrompt.md; exports SYSTEM_PROMPT + buildUserMessage()
│   │   └── WhyThisTestPrompt.md     ← prompt text only — edit this to change explanation behaviour (no code)
│   ├── data/
│   │   ├── AHClisting.json
│   │   ├── questions.json
│   │   └── scoringLogic.json
│   ├── .env                         ← MONGO_URI, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL (gitignored)
│   ├── .env.example                 ← committed template
│   ├── index.js                     ← Express app entry point
│   └── package.json
└── frontend/
    └── src/
        ├── main.jsx
        ├── App.jsx                  ← screen state machine, session management
        ├── index.css                ← Tailwind directives
        ├── api/
        │   └── client.js            ← fetch wrappers for all 6 API calls (fetchQuestions, initSession, saveResponses, getRecommendation, getExplanation, notifyBooking)
        └── screens/
            ├── WelcomeScreen.jsx
            ├── QuestionnaireScreen.jsx
            ├── LoadingScreen.jsx
            ├── ResultScreen.jsx
            ├── ExplainScreen.jsx
            └── ErrorScreen.jsx
```

---

## 13. Demo Mock — myFortis Spoof

**Location:** `Demo/myfortis-spoof/` (sibling of `tatvacare-webview/`, separate repo)

**Purpose:** Demo-only entry point that mimics the real myFortis app. Used to show the full user journey during the IHH Accelerator demo. This file is **not part of the TatvaCare production system**.

**What it contains:**
- Single self-contained HTML file (`index.html`) with embedded CSS and JS
- Screens defined: Login → Home → Health Packages (navigated via JS, no page load). **Note:** as of the 2026-06-01 redesign the Health Packages screen is orphaned — no navigation routes to it; it remains in the markup as dead code
- Assets: `fortis-logo.png` (the real Fortis logo, scaled per placement)
- **Entry point is on the Home screen:** the "Help me find a health package" banner sits directly below the "We can help you book" tiles (Appointment + Radiology & Lab Test). Its `onclick="openWebview()"` calls only `window.open(<webview URL>?pid=FORTIS_SID_001, '_blank')` — it does **not** call `go('packages')`, so the spoof stays on Home while the SDK webview opens in a new tab
- A `window.addEventListener('message', ...)` listener receives the `FORTIS_PACKAGE_BOOKED` postMessage from TatvaCare on booking, then reveals a green confirmation card **in place on the Home screen** (package name, patient ID, oracle code, price) via `scrollIntoView` — no screen switch

**Design fidelity:**
- Fortis green `#1b5e30`, light green tiles `#eaf6ef`
- App header with Fortis logo + hospital selector + bell + emergency button
- Bottom nav with 5 items (Home, Appointments, Reports, Explore, Profile)
- "We can help you book" → two tiles: Appointment + Radiology & Lab Test
- TatvaCare entry banner (Home screen): dark green gradient, full-width (flush with the tiles), headline "Help me find a health package.", sub "Answer a few questions…", white "Find My Package →" button (metric chips removed in the 2026-06-01 redesign)

**How to run for demo:**
```bash
python3 -m http.server 8091 --directory myfortis-spoof/
# Open http://localhost:8091
```
Or simply open `index.html` directly in a browser (no server needed — fully self-contained).
