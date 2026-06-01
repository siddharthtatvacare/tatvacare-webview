# TatvaCare × Fortis — Health Package Finder (Webview)

## ⟶ Resume Instructions (for new sessions)
If you are picking this up fresh, do the following before anything else:
1. Read this file (`CLAUDE.md`) top to bottom
2. Read `techdesign.md` — full architectural decisions, API design, data models, and rationale
3. Read `issuestofixinproduction.md` — known gaps between the current demo and a production deployment
4. Read `CodeWalkthrough.md` — academic file-by-file explanation of every file; covers technology rationale, syntax primer, and line-by-line walkthrough
5. The backend is fully scaffolded — do NOT recreate any backend files
6. The myFortis demo mock (`../myfortis-spoof/`) is a demo-only artifact — modify only if the demo flow requires it
7. The TatvaCare frontend is scaffolded (`frontend/src/`) — do NOT recreate any frontend files
8. **There are no pending tasks.** The project is demo-complete. Next work would be from `issuestofixinproduction.md`.

---

## What this is
A TatvaCare-owned PWA/webview embedded inside the myFortis app via a native webview. The entry point is a "Help me find a health package" banner on the myFortis **Home** screen (directly below the "We can help you book" tiles). Tapping it launches the TatvaCare SDK webview *without navigating away from Home*. From there, users answer up to 13 questions (with branching) and get a recommended Fortis health package, with an optional AI-generated explanation of why it suits them.

This is built for the IHH Accelerator demo. Scope is a working prototype, but the architecture is designed to scale to production.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas |
| AI / LLM | Provider-agnostic via OpenAI-compatible API (currently: Groq — `llama-3.3-70b-versatile`) |

**MongoDB / LLM credentials:** stored in `backend/.env` only — never committed. See `backend/.env.example` for required keys. To migrate to a different MongoDB account or LLM provider, change those values in `.env` — no code changes needed.

---

## Repo Structure

```
tatvacare-webview/
├── CLAUDE.md                    ← you are here (quick reference + resume guide)
├── techdesign.md                ← full technical design: API, data models, decisions, rationale
├── issuestofixinproduction.md   ← gaps between this demo and a production deployment
├── backend/
│   ├── config/
│   │   └── db.js                ← MongoDB connection (single place to swap URI)
│   ├── models/
│   │   ├── Session.js
│   │   ├── Response.js
│   │   └── Recommendation.js
│   ├── routes/
│   │   ├── session.js           ← POST /api/session/init
│   │   ├── questions.js         ← GET /api/questions (serves questions.json — single source of truth)
│   │   ├── responses.js         ← POST /api/responses/save
│   │   ├── recommend.js         ← POST /api/recommend + GET /api/recommend/explain/:sessionId
│   │   └── booking.js           ← POST /api/booking/notify (fires Fortis webhook on "Book This Package")
│   ├── services/
│   │   ├── scoringEngine.js     ← reads scoringLogic.json, runs rules server-side
│   │   └── llmService.js        ← assembles payload, calls LLM via openai-compatible API
│   ├── data/
│   │   ├── AHClisting.json      ← package + test data (replaceable)
│   │   ├── questions.json       ← 13 questions with branching (SINGLE SOURCE OF TRUTH — served via /api/questions)
│   │   └── scoringLogic.json    ← scoring rules + llmContext
│   ├── .env                     ← MONGO_URI, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, FORTIS_BOOKING_WEBHOOK (never committed)
│   ├── .gitignore               ← ignores node_modules/ and .env
│   ├── .env.example             ← committed, shows required keys without values
│   ├── index.js
│   └── package.json
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js           ← port 3000, proxies /api → localhost:3001
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx              ← screen state machine, session + question management
        ├── index.css            ← Tailwind directives
        ├── api/
        │   └── client.js        ← fetch wrappers (fetchQuestions, initSession, saveResponses, getRecommendation, getExplanation, notifyBooking)
        └── screens/
            ├── WelcomeScreen.jsx
            ├── QuestionnaireScreen.jsx
            ├── LoadingScreen.jsx
            ├── ResultScreen.jsx
            ├── ExplainScreen.jsx
            └── ErrorScreen.jsx
```

---

## AHClisting.json — Package Data

**File:** `backend/data/AHClisting.json`

**Purpose:** Single source of truth for all Fortis health packages. Contains oracle code, name, gender, price, and a list of tests (panels + sub-tests). Replace the `tests[]` array per entry when Fortis provides the actual test lists.

**10 entries (2 per package type — male + female):**

| Package | Gender | Oracle Code | Price | Est. Tests |
|---|---|---|---|---|
| Basic | Male | 441661 | ₹4,350 | 78 |
| Basic | Female | 441670 | ₹4,350 | 78 |
| Silver | Male | 441669 | ₹6,750 | 92 |
| Silver | Female | 441667 | ₹6,750 | 92 |
| Gold | Male | 441660 | ₹13,150 | 100 |
| Gold | Female | 441666 | ₹13,150 | 102 |
| Diabetic Profile | Male | 441665 | ₹8,900 | 90 |
| Diabetic Profile | Female | 441664 | ₹8,900 | 90 |
| Healthy Heart Profile | Male | 441663 | ₹7,950 | 85 |
| Healthy Heart Profile | Female | 441662 | ₹7,950 | 85 |

**Gender-specific tests (replacing PSA for females):**
- Basic Female: Prolactin | Silver Female: FSH | Gold Female: FSH + LH + Estradiol + CA-125
- Diabetic Female: Prolactin | Heart Female: Estradiol

---

## Questions + Scoring Design

- **Max questions:** 13 (user with both conditions). Healthy user: ~8.
- **Branching:** Q3 triggers Branch A (diabetes: Q3a/Q3b/Q3c) and/or Branch B (heart: Q3d/Q3e/Q3f)
- **Q1 (gender)** selects M/F variant of the winning package — does not affect type scoring
- **Scoring is server-side only** — see techdesign.md for the rationale
- **Strongest signals:** Q3 (diagnosed condition +5) and Q9 (stated concern +4)
- **scoringLogic.json** contains an `llmContext` block passed directly to the LLM

---

## API Endpoints

| Method | Endpoint | When | What |
|---|---|---|---|
| GET | `/api/questions` | Webview opens (parallel with session init) | Returns questions.json — frontend never has a local copy |
| POST | `/api/session/init` | Webview opens | Creates session, returns `sessionId` |
| POST | `/api/responses/save` | Questionnaire complete | Saves all answers to MongoDB |
| POST | `/api/recommend` | Same as above | Runs scoring server-side, saves + returns package |
| GET | `/api/recommend/explain/:sessionId` | User taps "Why?" | Fetches answers from DB, calls LLM, caches result |
| POST | `/api/booking/notify` | User taps "Book This Package" | Pulls full payload from MongoDB, POSTs to `FORTIS_BOOKING_WEBHOOK` |

→ Full request/response shapes in `techdesign.md` Section 5.

---

## MongoDB Collections

Three collections: `sessions`, `responses`, `recommendations`. One document per session each.

→ Full schemas and field-level rationale in `techdesign.md` Section 4.

---

## Resilience Strategy

Answer persistence (localStorage), submission retry (3× exponential backoff), LLM caching, session restore on reload.

→ Full details in `techdesign.md` Section 9.

---

## LLM Call — "Why this package?" Architecture

Provider: configured via `LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL` in `.env`. Currently: Groq (`llama-3.3-70b-versatile`) — free tier, 30 req/min. Swap provider by changing only those three env vars — no code changes.

### Prompt files (edit these to change explanation behaviour)

| File | What it is | Who edits it |
|---|---|---|
| `backend/services/WhyThisTestPrompt.md` | System prompt text — structure, guardrails, rules | Anyone — product, clinical, non-developer |
| `backend/services/WhyThisTestPrompt.js` | Reads the `.md`, builds the dynamic patient message | Developer only |
| `backend/services/llmService.js` | Assembles DB data, calls the LLM | Developer only |

`llmService.js` has no hardcoded prompt text — it imports everything from `WhyThisTestPrompt.js`.

→ Full payload structure, prompt design decisions, and output format in `techdesign.md` Section 10.

---

## Integration Points (with myFortis)

1. **Entry** — user taps the "Help me find a health package" banner on the myFortis Home screen; myFortis passes `?pid=PATIENT_ID` when opening the webview (host app stays on Home)
2. **Booking handoff** — on "Book This Package": TatvaCare backend POSTs `{ patientId, sessionId, recommendedPackage, answers, scores }` to `FORTIS_BOOKING_WEBHOOK`; webview simultaneously sends a `postMessage` / native JS bridge call to hand UI control back to the Fortis app
3. **Lab Report Webhook** — Fortis → TatvaCare: `POST /api/webhook/XXXXX` (path TBD)

> **Production gaps for all three touchpoints** — see `issuestofixinproduction.md` (native JS bridge contract, webhook auth, signed patient ID token).

---

## What Has Been Done

- [x] AHClisting.json — 10 packages, all panels + sub-tests
- [x] questions.json — 13 questions, branching logic, option IDs
- [x] scoringLogic.json — rules engine + llmContext block
- [x] techdesign.md — full technical design with decisions and rationale
- [x] Backend scaffolded — `index.js`, `config/db.js`, all 3 Mongoose models, all 4 route files (session, questions, responses, recommend), `scoringEngine.js`, `llmService.js`; `npm install` verified clean
- [x] `GET /api/questions` — serves `questions.json` from the backend; frontend fetches on load; no local copy in frontend
- [x] `backend/.env` — MONGO_URI (MongoDB Atlas dev cluster), LLM_BASE_URL/LLM_API_KEY/LLM_MODEL (Groq llama-3.3-70b-versatile); `backend/.gitignore` excludes it
- [x] myFortis demo mock (`../myfortis-spoof/index.html`) — single-file HTML/JS app replicating myFortis screens (Login → Home → Health Packages). The "Help me find a health package" banner on Home opens the TatvaCare SDK webview with `?pid=FORTIS_SID_001`. **Demo-only.**
- [x] TatvaCare frontend scaffolded — Vite + React + Tailwind; all 6 screens written (Welcome, Questionnaire, Loading, Result, Explain, Error); `App.jsx` state machine handles session restore, branching, retry logic, localStorage persistence; `npm install` done
- [x] `llmService.js` lazy init fix — `OpenAI` client now instantiated inside `generateExplanation()`, not at module load time; backend starts cleanly
- [x] `recommend.js` error handling — both POST and GET routes wrapped in try/catch; server no longer crashes on LLM errors, returns proper 500 to frontend
- [x] Frontend mobile constraint — `max-width: 430px` + `margin: 0 auto` on `#root`; phone-sized on desktop, full-width on real device
- [x] LLM prompt split into two files — `WhyThisTestPrompt.md` (editable prompt text) + `WhyThisTestPrompt.js` (dynamic message builder); `llmService.js` has zero hardcoded prompt text
- [x] Prompt redesigned — 3 structured sections enforced, must name ≥4 tests by name, must name runner-up package, temperature lowered to 0.3 for more literal instruction-following
- [x] `ExplainScreen.jsx` updated — parses `**heading**` markdown from LLM response, renders each section as a separate card
- [x] End-to-end flow verified — session → questions → questionnaire with branching → scoring → recommendation → session restore → LLM explanation via Groq all confirmed working
- [x] Session lifecycle fix — `sessionStorage` flag (`tc_fortis_active`) gates `localStorage` restore; closing/reopening the webview starts fresh (flag cleared); page refresh resumes (flag survives). Works identically in browser tabs and native iOS/Android webviews (WKWebView/WebView both clear sessionStorage on dismiss)
- [x] "Book This Package" CTA wired — fires `POST /api/booking/notify` (backend pulls full payload from MongoDB and POSTs to `FORTIS_BOOKING_WEBHOOK`); simultaneously sends `postMessage` to `window.opener` with `{ patientId, sessionId, oracleCode, packageName, gender, price }`; then closes the tab after 150ms to allow message delivery. In a native webview this `window.opener` path is replaced by the native JS bridge — see `issuestofixinproduction.md` issue #1
- [x] "Retake questionnaire" tertiary CTA added — appears on ResultScreen and ExplainScreen; calls `POST /api/session/init` to create a new MongoDB session doc, then resets all React state and navigates to WelcomeScreen; old session/responses/recommendation documents are preserved in Mongo for analytics
- [x] myFortis spoof — booking confirmation card; receives `postMessage` from TatvaCare webview, shows package name + patient ID + oracle code + price. Originally rendered on the packages screen; now lives on the **Home** screen (below the entry banner) and is revealed in place via `scrollIntoView` — no screen switch

- [x] myFortis spoof — Home-screen entry-point redesign (2026-06-01): (1) "We can help you book" reduced to two tiles — **Appointment** + **Radiology & Lab Test** (the old standalone "Health Packages" tile and the full-width Radiology tile were removed/merged); (2) the TatvaCare entry banner was **moved from the Health Packages screen to the Home screen**, directly below the tiles, made full-width (margin `12px 0`), copy changed to headline "Help me find a health package." / sub "Answer a few questions…", and the metric chips (BMI/BP/HbA1c/Lipids) removed; (3) `openWebview()` no longer calls `go('packages')` — it only opens the SDK webview, so the host app **stays on Home**; (4) the booking-confirmation card moved to Home accordingly. **Net effect: the Health Packages screen is now orphaned (no navigation routes to it) — kept in the markup as dead code.**

- [x] Render deployment prep — `frontend/src/api/client.js` updated: `const BASE = import.meta.env.VITE_API_URL || ''` added at top; all API calls now use `` `${BASE}/api${path}` ``. Local dev unaffected (empty string → Vite proxy as before). On Render, set `VITE_API_URL=https://<backend>.onrender.com` in the Static Site env vars.

## What Is Next

- [x] Write `CodeWalkthrough.md` — academic file-by-file explanation of every file for a curious learner; includes technology rationale (React, Vite, Tailwind, Express, MongoDB, Groq), JavaScript syntax primer, and line-by-line walkthrough of all 28 files

---

## Demo Setup (local)

To run the full demo locally:

```bash
# 1 — Start the backend
cd backend && node index.js
# Runs on http://localhost:3001

# 2 — Start the TatvaCare frontend (once built)
cd frontend && npm run dev
# Runs on http://localhost:3000

# 3 — Open the myFortis mock
open ../myfortis-spoof/index.html
# Or serve it: python3 -m http.server 8091 --directory ../myfortis-spoof
# Then open http://localhost:8091
```

Demo flow: Login (Continue as Guest) → Home → tap the "Help me find a health package" banner → TatvaCare webview opens (host stays on Home) → on booking, confirmation card appears in place on Home.

---

## Session Notes

- Test counts follow MediBuddy's counting methodology (sub-tests within panels counted individually)
- `_note` field on each AHClisting entry is the replacement instruction for Fortis actuals
- To migrate MongoDB: change `MONGO_URI` in `.env` only — no code changes needed
