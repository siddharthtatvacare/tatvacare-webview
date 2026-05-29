# Issues to Fix Before Production

## 1. "Book This Package" — Native JS Bridge

**What's wrong:** `window.opener.postMessage(...)` only works in a browser tab context (the demo). In the real myFortis app, `window.opener` is `null` — the fallback `window.history.back()` also does nothing if the native webview was opened fresh with no prior history.

**What's needed:**
- Ask Fortis's mobile team for the JS bridge contract: the exact JS call their iOS and Android apps will expose on `window`.
- Replace the `window.opener` block in `handleBook()` (`App.jsx`) with platform-aware bridge calls:
  ```js
  if (window.webkit?.messageHandlers?.fortisNative) {
    window.webkit.messageHandlers.fortisNative.postMessage({ ... }); // iOS
  } else if (window.FortisNative?.onPackageBooked) {
    window.FortisNative.onPackageBooked(JSON.stringify({ ... }));    // Android
  }
  ```
- The payload to pass is already defined — `{ type, patientId, sessionId, oracleCode, packageName, gender, price }`.

**Ask from Fortis:** Bridge method names and signatures for iOS and Android.

---

## 2. Missing `pid` Should Be a Hard Error

**What's wrong:** If Fortis's app fails to pass `?pid=` in the URL, the frontend silently falls back to `'DEMO_PATIENT'` and creates a real MongoDB session under that fake ID.

**File:** `frontend/src/App.jsx` — `getPid()`

```js
// Current — unsafe
return new URLSearchParams(window.location.search).get('pid') || 'DEMO_PATIENT';

// Fix — show error if pid is missing
const pid = new URLSearchParams(window.location.search).get('pid');
if (!pid) { setErrorMsg('Patient identifier missing. Please relaunch from the myFortis app.'); setScreen('error'); }
return pid;
```

---

## 3. CORS Is Wide Open

**What's wrong:** `app.use(cors())` allows any origin to call the TatvaCare API — including scripts on unrelated domains.

**File:** `backend/index.js`

**Fix:** Restrict to the TatvaCare hosted domain (and localhost for dev):
```js
app.use(cors({
  origin: ['https://packages.tatvacare.in', 'http://localhost:3000']
}));
```

---

## 4. No Authentication on API Endpoints

**What's wrong:** Anyone who discovers the API URL can call `POST /api/session/init`, `POST /api/recommend`, etc. There is no check that the request is coming from the myFortis app.

**Fix:** Agree on a shared API key with Fortis. Their app passes it in a request header (e.g. `X-TatvaCare-Key: <key>`). Add middleware in `backend/index.js` that rejects requests missing or with a wrong key:
```js
app.use('/api', (req, res, next) => {
  if (req.headers['x-tatvacare-key'] !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```
Add `API_KEY` to `.env` and `.env.example`.

**Ask from Fortis:** Confirm they can set a custom request header in the webview.

---

## 5. Patient ID Passed as Plain URL Param

**What's wrong:** `?pid=FORTIS_SID_001` is visible in the URL bar, in server logs, and can be manually edited by a user to load another patient's session context.

**Fix:** Fortis should pass a short-lived signed token instead of a raw patient ID. TatvaCare backend verifies the token signature and extracts the real patient ID server-side. The token expires after one use or after 5 minutes.

**Ask from Fortis:** Whether they can issue a signed JWT or HMAC token per webview launch, and share their signing key or public key.

---

## 6. No HTTPS on the Backend

**What's wrong:** The Node server listens on plain HTTP. Patient health answers and recommendations travel unencrypted.

**Fix:** Do not handle SSL in Node directly. Host behind a platform that provides HTTPS automatically:
- **Railway / Render / Fly.io** — deploy the Node backend and get HTTPS at the platform level with zero config.
- Or: put nginx in front of Node with a Let's Encrypt certificate.

No code changes needed — just a hosting decision.

---

## 7. No Env Var Validation at Startup

**What's wrong:** If `MONGO_URI`, `LLM_API_KEY`, or `FORTIS_BOOKING_WEBHOOK` are missing or mistyped, the server starts successfully and fails silently at runtime — potentially mid-user-flow.

**File:** `backend/index.js`

**Fix:** Add a startup guard before `connectDB()`:
```js
const REQUIRED_ENV = ['MONGO_URI', 'LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL', 'FORTIS_BOOKING_WEBHOOK'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(1);
}
```

---

## 8. LLM Is on Groq Free Tier

**What's wrong:** Groq free tier allows 30 requests/minute. Fine for a demo. Will rate-limit under real patient volume.

**Fix:** Upgrade to a paid Groq plan, or swap to a production LLM provider. Only three env vars need changing — `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` — no code changes required.

---

## 9. Fortis Webhook Has No Auth

**What's wrong:** When TatvaCare's backend POSTs to the Fortis webhook, Fortis has no way to verify the request is genuinely from TatvaCare and not spoofed.

**Fix:** Agree on an auth scheme with Fortis. Standard options:
- **Shared secret:** TatvaCare adds `Authorization: Bearer <secret>` to the POST; Fortis validates it.
- **HMAC signature:** TatvaCare signs the payload body with a shared key and sends the signature in a header; Fortis recomputes and compares.

Add the secret to `FORTIS_BOOKING_WEBHOOK_SECRET` in `.env` and include it in the `fetch` headers in `backend/routes/booking.js`.

**Ask from Fortis:** Which auth scheme they want on their webhook receiver.

---

## 10. No Webhook Retry / Dead-Letter Handling

**What's wrong:** If the Fortis webhook POST fails (their server is down), TatvaCare logs a warning and moves on. The booking signal is silently lost — Fortis never gets notified for that patient.

**Fix:** For production, store a `webhookStatus` field on the recommendation document (`pending` → `delivered` / `failed`). Run a background job (cron or queue) that retries `failed` records with exponential backoff. Alternatively, use a message queue (SQS, BullMQ) to guarantee delivery.

This is an architectural addition and requires a decision on acceptable delivery guarantees with Fortis.

---

## Summary Table

| # | Issue | Effort | Blocks Launch? | Needs Fortis Input? |
|---|---|---|---|---|
| 1 | Native JS bridge for Book button | Low (once bridge contract known) | Yes | Yes — bridge names |
| 2 | Missing `pid` hard error | Low | Yes | No |
| 3 | CORS lockdown | Low | Yes | No |
| 4 | API key auth | Low | Yes | Yes — confirm header support |
| 5 | Signed patient ID token | Medium | Ideally yes | Yes — token scheme |
| 6 | HTTPS | None (hosting choice) | Yes | No |
| 7 | Env var validation at startup | Low | No | No |
| 8 | LLM paid tier | None (config only) | No | No |
| 9 | Fortis webhook auth | Low | Ideally yes | Yes — auth scheme |
| 10 | Webhook retry / dead-letter | Medium | No | Yes — delivery SLA |
