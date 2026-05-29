# Code Walkthrough — TatvaCare × Fortis Health Package Finder

This document explains every file in this project, line by line where it matters. It is written for someone who is learning to read code — not just what each file does, but what each keyword and pattern means, and why each decision was made.

Read the document in this order:
1. **Why these technologies?** — explains every tool chosen and what alternatives existed
2. **JavaScript Syntax You Will See Everywhere** — explains keywords and patterns before you encounter them in real code
3. **The file-by-file walkthrough** — goes through every file with explanations

---

## Why These Technologies?

Before reading a single line of code, it's worth understanding *why* each tool in this project was chosen. Every tool had alternatives. The choices were made for specific reasons — knowing those reasons helps you understand the shape of the code you're about to read.

---

### The Big Picture: What kind of product is this?

This is a **webview** — a web page that runs inside a mobile app. The myFortis mobile app opens a browser view (called a webview) that points to a URL. The user sees a web page, but it looks and feels like a screen in the native app.

This has a direct impact on technology choices. Because it runs in a browser (even inside a native app), we must use **web technologies**: HTML, CSS, and JavaScript. We cannot use native iOS (Swift) or native Android (Kotlin) code here. Everything must work in a browser engine.

---

### The Frontend Framework: React

**What it is:** React is a JavaScript library for building user interfaces. It lets you build UIs as components — reusable, self-contained pieces that each manage their own data.

**The alternatives that exist:**

| Option | Description | Why not used |
|---|---|---|
| **Vue.js** | Similar to React, component-based, very popular in Asia/India | TatvaCare's existing codebase uses React — using Vue would mean a different language for the team |
| **Angular** | Full-featured framework by Google, uses TypeScript | Much heavier and more opinionated; overkill for a 6-screen app |
| **Svelte** | Newer framework, compiles away to vanilla JS, no runtime | Smaller community, less tooling, team less familiar |
| **Plain HTML + JavaScript** | No framework, just write HTML files and JS functions | Works fine for tiny apps, but managing 6 screens + state + API calls with plain JS becomes messy and hard to maintain very quickly |

**Why React was chosen:**
- TatvaCare already uses React — engineers can read and modify the code without learning a new framework
- React's **component model** fits this project naturally: each screen (`WelcomeScreen`, `ResultScreen`, etc.) is its own component
- React's **state management** (`useState`) makes it easy to track which screen you're on, what answers the user gave, and what the recommendation is — all in one place (`App.jsx`)
- Largest ecosystem: almost any problem you hit has a solved example online

**What React actually does:** Without React, to change what's displayed on screen, you'd write code like `document.getElementById('title').textContent = 'New title'` for every element. React lets you say "when the data changes, re-render the component" and handles all the DOM updates for you. You describe *what* the UI should look like given the current data; React figures out *how* to update the actual page efficiently.

---

### The Build Tool: Vite

**What it is:** Vite is a development server and build tool. It does two things:
1. During development: serves your files instantly, transforms JSX to JS on the fly
2. For production: bundles all your files into optimised static assets

**Why you need a build tool at all:** Browsers only understand HTML, CSS, and plain JavaScript. They do not understand JSX (the HTML-in-JS syntax React uses). You need something that transforms `.jsx` files into regular `.js` before the browser can run them. A build tool does this.

**The alternatives that exist:**

| Option | Description | Why not used |
|---|---|---|
| **Create React App (CRA)** | The old official way to start a React project | Officially deprecated in 2023 by the React team. Very slow — takes 30–60 seconds to start. Uses Webpack under the hood which is slow to compile. |
| **Webpack** (directly) | The underlying bundler that CRA uses | Extremely complex to configure from scratch. Thousands of configuration options. Nobody sets it up directly anymore for new projects. |
| **Parcel** | "Zero configuration" bundler | Simpler than Webpack, but slower than Vite and smaller community |
| **Next.js** | A full-stack React framework (by Vercel) | Designed for multi-page apps with server-side rendering; heavy for a webview. Also opinionated about routing and structure in ways that don't fit a single-page, state-machine app. |

**Why Vite was chosen:**
- **Speed:** Vite starts in under a second. CRA takes 30–60 seconds. During development, instant feedback matters — every second of waiting breaks concentration.
- **Modern standard:** Vite is now the recommended tool by the React team (it replaced CRA in 2023). Starting a new project with CRA in 2024–2025 is actively discouraged.
- **Simple config:** The `vite.config.js` in this project is 13 lines. A Webpack config for the same project would be 100+ lines.
- **Hot Module Replacement:** When you edit a component, Vite updates just that component in the browser without refreshing the page. State is preserved (you don't lose your place in the questionnaire while developing).

**How Vite's proxy feature specifically helps:** In development, the frontend is on port 3000 and the backend is on port 3001. Normally, a browser would block `fetch('/api/...')` from port 3000 hitting port 3001 due to CORS restrictions. Vite's proxy intercepts requests to `/api` and forwards them to port 3001 transparently — the browser never knows it's talking to a different port, so there's no CORS issue.

---

### The CSS Framework: Tailwind CSS

**What it is:** Instead of writing a separate `.css` file with class definitions, Tailwind gives you hundreds of pre-built utility classes you apply directly in HTML/JSX. `bg-green-500` means background color green. `text-sm` means small font size. `rounded-2xl` means large border radius.

**The alternatives that exist:**

| Option | Description | Why not used |
|---|---|---|
| **Plain CSS files** | Write `.css` files, give things class names | As the project grows, CSS files become hard to manage. Class names conflict. It's hard to know what's safe to delete. |
| **CSS Modules** | Scoped CSS files per component (`.module.css`) | Better than plain CSS for isolation, but still requires writing actual CSS properties |
| **Styled Components** | Write CSS directly inside JavaScript using template literals | Adds runtime overhead; slightly harder to read for someone learning; less popular now |
| **Bootstrap** | Pre-built component library (buttons, cards, modals) | Opinionated appearance — everything looks "Bootstrappy." Hard to match a custom design like TatvaCare's green brand. |
| **Material UI / Ant Design** | Full React component libraries | Very heavy. Strong visual opinions that are hard to override. Overkill for a 6-screen app. |

**Why Tailwind was chosen:**
- **No naming problem:** In regular CSS, you spend time inventing class names (`question-card-inner-wrapper`). Tailwind has pre-named utilities for everything — you never name a class.
- **No dead CSS:** Tailwind scans your files and generates CSS only for the classes you actually use. If you stop using `rounded-2xl`, it disappears from the output. Regular CSS files accumulate dead code over time.
- **Consistency:** Every spacing value, font size, and colour follows Tailwind's scale system. The entire UI looks consistent because every component pulls from the same system.
- **Custom tokens:** Adding `tc-green: '#1a7a4a'` to the config immediately makes `bg-tc-green`, `text-tc-green`, `border-tc-green` available everywhere. One change, global effect.
- **Speed of iteration:** You style elements by adding class names in JSX — you never need to switch between files.

---

### The Backend Framework: Node.js + Express

**Node.js — why JavaScript on the server?**

Web servers have historically been written in Python, Ruby, Java, PHP, Go, etc. Node.js made it possible to write a web server in JavaScript — the same language as the frontend.

The alternatives:

| Option | Description | Why not used |
|---|---|---|
| **Python + FastAPI** | Modern Python web framework, very fast, excellent for AI/ML workloads | Great choice. The reason to not use it here: TatvaCare's existing backend team knows JavaScript. Staying in one language reduces context-switching. |
| **Python + Django** | Full-featured Python framework | Heavyweight with ORM, templating, admin panel — much more than needed for a 5-endpoint API |
| **Ruby on Rails** | Convention-heavy full-stack framework | Very opinionated. Overkill. Less relevant in the current job market than Node/Python. |
| **Go** | Compiled language, very fast, great for high-throughput services | Excellent for production scale but has a steep learning curve. Doesn't make sense for a small API built quickly for a demo. |

**Why Node.js:**
- Same language as the frontend — one codebase language to know
- `npm` gives access to the same package ecosystem (mongoose, openai, express, dotenv)
- Fast enough for this workload (the bottleneck is MongoDB and the LLM API, not Node's processing speed)
- TatvaCare's engineers already know it

**Express — why not something else?**

Express is a "minimal web framework" — it provides routing, middleware, and not much else. Alternatives:

| Option | Description | Why not used |
|---|---|---|
| **Fastify** | Like Express but significantly faster | Better performance, but Express is more familiar. For 5 endpoints with a small user base, the performance difference is immaterial. |
| **NestJS** | Angular-like structured framework for Node.js | Excellent for large teams with strict architectural conventions. Overkill for 5 routes. |
| **Hapi** | Another Node.js framework with strong validation | More configuration upfront. Express needed less setup for this scope. |
| **Plain Node.js `http` module** | Built-in, no library | Possible, but you'd be re-implementing routing, body parsing, etc. manually. Express is 5 lines of setup. |

**Why Express:**
- Most widely known Node.js framework — more tutorial examples, more engineers familiar with it
- Minimal — adds exactly what you need (routing, JSON parsing, middleware) without imposing structure
- Well understood: `app.use('/api/session', require('./routes/session'))` is readable and obvious

---

### The Database: MongoDB Atlas

**What it is:** MongoDB is a "NoSQL" database. Instead of rows and columns (like a spreadsheet), it stores **documents** — JSON-like objects. MongoDB Atlas is the cloud-hosted, managed version (you don't run the database server yourself — MongoDB runs it and you connect to it via a URI).

**The alternatives that exist:**

| Option | Description | Why not used |
|---|---|---|
| **PostgreSQL** | The most popular SQL (relational) database. Rows, columns, tables, joins. | Excellent choice for most applications. For this project, the questionnaire data is nested (answers inside a session, sub-tests inside tests inside packages) — SQL needs extra tables and JOIN queries to represent this. MongoDB stores nested JSON natively. |
| **MySQL** | Another relational database, similar to PostgreSQL | Same as above. Also less flexible schema. |
| **SQLite** | File-based SQL database, no server needed | Perfect for local development, but not suitable for a deployed API (doesn't handle concurrent writes well). |
| **Firebase Firestore** | Google's NoSQL database with real-time syncing | Real-time syncing is a feature we don't need. Firestore has a proprietary SDK and pricing model that makes switching away difficult. |
| **DynamoDB** | AWS's NoSQL database | Excellent for scale, but the query model is restrictive (you must design your indexes upfront). Overkill and more complex to set up for this scale. |

**Why MongoDB:**
- **Schema flexibility:** A questionnaire answer looks like `{ questionId, questionText, answerId, answerText }`. Storing this as a document is natural — no need to design a separate `questions` table, `answers` table, and write JOIN queries to read them back.
- **JSON-native:** MongoDB stores data in BSON (Binary JSON). It maps directly to JavaScript objects — no transformation needed. What you `res.json(...)` is what's in the database.
- **Atlas free tier:** MongoDB Atlas has a free tier (M0 cluster) generous enough for demos and early production. You get a hosted, managed database with backups, without managing a server.
- **Mongoose:** The Mongoose library gives you schema validation, model-level queries, and middleware for MongoDB. It fills the gap between "raw MongoDB" (which has no schema enforcement) and "I want structure."
- **Speed to prototype:** Creating a new collection in MongoDB requires zero schema migration. In SQL, adding a new field requires `ALTER TABLE`. In MongoDB, you just start writing documents with the new field.

---

### The LLM Provider: Groq (running Llama 3.3)

**What it is:** The "Why this package?" explanation is generated by a Large Language Model (LLM). The LLM reads the patient's answers and the package details, and writes a personalised explanation in plain English.

**The alternatives:**

| Option | Description | Why not used |
|---|---|---|
| **OpenAI GPT-4o** | The most capable widely-available model | Costs money per request. No free tier. For a demo, adds unnecessary cost. |
| **Anthropic Claude** | High-quality reasoning, strong instruction-following | Also paid. Same issue. The `.env.example` shows how to swap to Claude in 3 lines. |
| **Google Gemini** | Google's LLM | Paid for capable models. Also slightly different API shape. |
| **Ollama (local)** | Run an LLM on your own laptop | Free, private, but requires the developer's machine to have the model downloaded (~4GB+) and running. Not suitable for a deployed backend. |
| **Groq** | Inference provider that runs open-source models (Llama, Mixtral) very fast | **Free tier: 30 requests/minute.** Sufficient for a demo. Uses the OpenAI-compatible API format, so swapping to a paid provider requires only changing 3 environment variables. |

**Why Groq + Llama 3.3 70b:**
- Free tier is sufficient for the demo
- Groq's inference speed is extremely fast (they use custom hardware chips)
- **OpenAI-compatible API** is the key decision: the `openai` npm package works with any provider that speaks this format. The `baseURL` constructor parameter overrides where requests go. This means the codebase doesn't vendor-lock to any one provider. To switch to Claude tomorrow, change `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` in `.env` — nothing else.
- Llama 3.3 70b is a capable open-source model that follows structured instructions reliably at `temperature: 0.3`

**The provider-agnostic design:** This is worth calling out explicitly. The `openai` npm package is not only for OpenAI. It works with any service that implements the same API specification. Groq does. Anthropic does (partially). Azure OpenAI does. This "one client, any backend" pattern is a best practice for AI-integrated applications — you are never locked in.

---

### Summary: The Stack at a Glance

| Layer | Tool | Key alternative considered | Why this was chosen |
|---|---|---|---|
| UI framework | React | Vue.js | TatvaCare uses React; component model fits the screen-machine pattern |
| Build tool | Vite | Create React App | CRA is deprecated; Vite is 30× faster to start |
| CSS | Tailwind CSS | Plain CSS / Bootstrap | Utility-first avoids CSS file management; custom tokens for brand colours |
| Backend language | Node.js | Python (FastAPI) | Same language as frontend; team familiarity |
| Backend framework | Express | Fastify / NestJS | Minimal, widely known, easy to set up |
| Database | MongoDB Atlas | PostgreSQL | Nested document data model; JSON-native; free hosted tier |
| LLM provider | Groq (Llama 3.3 70b) | OpenAI GPT-4o | Free tier for demo; OpenAI-compatible API means zero lock-in |

---

## JavaScript Syntax You Will See Everywhere

Before looking at any file, here are the building blocks that appear constantly. When you see these in the code below, refer back here.

---

### `const`, `let`, and `var` — declaring variables

```js
const name = 'TatvaCare';
let   count = 0;
var   old   = true;   // you will rarely see var in modern code
```

- **`const`** — "this variable will never be reassigned." It doesn't mean the value is frozen (an array declared with `const` can still have items pushed to it), but it means you can't do `name = 'something else'` later. Use `const` by default.
- **`let`** — "this variable might be reassigned." Use `let` when you need to change the value (like a loop counter, or a flag you flip from `false` to `true`).
- **`var`** — the old way. It has confusing scoping rules. Modern code uses `const` and `let`.

In this codebase, almost everything is `const`. You'll see `let` for things like `updatedBranches` in `App.jsx` because those need to be built up step by step.

---

### `require()` and `module.exports` — sharing code between files (CommonJS)

In Node.js, each `.js` file is its own self-contained unit. To use something from another file, you have to explicitly "require" it.

```js
// In file-a.js
const add = (a, b) => a + b;
module.exports = add;           // "export" this function so others can use it

// In file-b.js
const add = require('./file-a'); // "import" it
console.log(add(2, 3));          // prints 5
```

`module.exports` is what the file hands back when someone requires it. It can be a function, an object, a class — anything.

You'll see this pattern throughout the backend:

```js
// In session.js (a route file)
module.exports = router;     // hands the Express router back to whoever requires it

// In index.js (the entry point)
app.use('/api/session', require('./routes/session'));   // requires and immediately uses it
```

---

### `import` / `export` — sharing code between files (ES Modules)

The frontend uses a newer system called ES Modules. Same concept, different syntax:

```js
// In client.js
export function fetchQuestions() { ... }   // "named export"

// In App.jsx
import { fetchQuestions } from './api/client';   // "named import"
```

The backend uses `require`/`module.exports` (older style). The frontend uses `import`/`export` (modern style). Both do the same thing. The reason the backend uses the older style is that Node.js historically defaulted to it — it is fine to mix them across the boundary as long as you don't mix them within the same file.

---

### Functions — three ways to write them

```js
// Style 1: named function declaration
function greet(name) {
  return 'Hello, ' + name;
}

// Style 2: function stored in a variable (function expression)
const greet = function(name) {
  return 'Hello, ' + name;
};

// Style 3: arrow function (most common in modern code)
const greet = (name) => {
  return 'Hello, ' + name;
};

// Arrow function shorthand — when the body is just a return, you can skip the braces and the word "return"
const greet = (name) => 'Hello, ' + name;
```

You'll see arrow functions constantly. `(a, b) => a + b` means "a function that takes `a` and `b` and returns their sum." `() => {}` means "a function that takes no arguments."

---

### `async` and `await` — waiting for things that take time

Some operations take time: fetching data from a server, reading a file, querying a database. JavaScript handles these with something called Promises. You don't need to fully understand Promises — just understand `async`/`await`, which is a cleaner way to write them.

```js
// Without async/await (the old way, using .then())
fetch('/api/questions')
  .then(response => response.json())
  .then(data => console.log(data));

// With async/await (the modern way — reads like normal code)
async function loadQuestions() {
  const response = await fetch('/api/questions');
  const data     = await response.json();
  console.log(data);
}
```

**`async`** in front of a function means "this function will do some waiting." **`await`** in front of an expression means "pause here until this finishes, then give me the result." You can only use `await` inside an `async` function.

In this codebase, almost every backend route is `async`:

```js
router.post('/init', async (req, res) => {
  const session = await Session.create({ ... });   // wait for MongoDB to save this
  res.json({ sessionId: session.sessionId });       // then send the response
});
```

---

### `try` / `catch` — handling errors

When something might go wrong (network call, database query, bad input), wrap it in `try`/`catch`:

```js
try {
  const result = await fetchSomething();   // if this throws an error...
  console.log(result);
} catch (error) {
  console.error('It failed:', error.message);   // ...we land here instead of crashing
}
```

Without `try`/`catch`, an error inside an `async` function becomes an "unhandled rejection" — in Node.js, this can crash the server. In React, it shows a blank screen. `try`/`catch` lets you handle the failure gracefully.

---

### Template literals — building strings

```js
const name = 'Siddharth';
const greeting = `Hello, ${name}!`;   // backticks, not quotes
// result: "Hello, Siddharth!"

const port = 3001;
console.log(`Backend running on port ${port}`);
```

Backtick strings (template literals) let you embed variables with `${...}`. They also support multi-line strings without concatenation.

---

### Destructuring — unpacking objects and arrays

Instead of writing `obj.a`, `obj.b`, `obj.c` repeatedly, you can "destructure" an object into named variables in one line:

```js
const person = { name: 'Sid', age: 30, city: 'Bangalore' };

// Without destructuring:
const name = person.name;
const age  = person.age;

// With destructuring:
const { name, age } = person;   // pulls name and age out of person
```

You'll see this a lot in route handlers:

```js
const { sessionId, answers, activeBranches } = req.body;
// same as: const sessionId = req.body.sessionId; ...
```

And in `Promise.all` results (array destructuring):

```js
const [sessionDoc, responseDoc, recDoc] = await Promise.all([
  Session.findOne({ sessionId }),
  Response.findOne({ sessionId }),
  Recommendation.findOne({ sessionId })
]);
// sessionDoc = first result, responseDoc = second, recDoc = third
```

---

### Optional chaining `?.` — safely accessing nested properties

```js
const user = null;

// Without optional chaining — crashes if user is null:
console.log(user.name);   // TypeError: Cannot read property 'name' of null

// With optional chaining — returns undefined if user is null:
console.log(user?.name);  // undefined (no crash)
```

You'll see this in `App.jsx`:

```js
oracleCode: recommendation?.recommendedPackage?.oracleCode
```

This means: "if `recommendation` exists, and if `recommendedPackage` exists inside it, give me `oracleCode`. If anything in that chain is null or undefined, just give me `undefined` instead of crashing."

---

### The `||` operator — fallback values

```js
const pid = null;
const result = pid || 'DEMO_PATIENT';
// result = 'DEMO_PATIENT' because pid is falsy (null)
```

`a || b` means "give me `a`, but if `a` is falsy (null, undefined, empty string, 0, false), give me `b` instead." Used throughout for default values.

---

### Spread operator `...` — copying and merging

```js
const arr  = [1, 2, 3];
const arr2 = [...arr, 4, 5];   // [1, 2, 3, 4, 5]  — arr is spread into a new array

const obj  = { a: 1, b: 2 };
const obj2 = { ...obj, c: 3 }; // { a: 1, b: 2, c: 3 }
```

Used in `App.jsx` when building updated answer arrays:

```js
const updatedAnswers = [
  ...answers.filter(a => a.questionId !== question.id),  // all old answers except this question's
  newAnswer                                               // plus the new one
];
```

---

### Array methods: `.map()`, `.filter()`, `.find()`, `.sort()`

These are methods that every array has. They take a function and apply it to each element:

```js
const numbers = [1, 2, 3, 4, 5];

numbers.map(n => n * 2)        // [2, 4, 6, 8, 10] — transform each element
numbers.filter(n => n > 2)     // [3, 4, 5]        — keep only elements that pass the test
numbers.find(n => n === 3)     // 3                 — first element that passes the test
numbers.sort((a, b) => b - a)  // [5, 4, 3, 2, 1]  — sort (b - a = descending order)
```

The `[, b]` syntax in a sort comparator is destructuring with a hole — "ignore the first element, give me the second":

```js
scores.sort(([, a], [, b]) => b - a)
// Each element is like ["Basic", 7], ["Gold", 12]
// [, a] means: skip the name, give me the score
// Sort so the highest score comes first
```

---

### `Promise.all` — running multiple async operations at once

```js
// Sequential — total time = 300ms + 200ms = 500ms
const a = await fetchA();  // wait 300ms
const b = await fetchB();  // wait 200ms

// Parallel — total time = max(300ms, 200ms) = 300ms
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

`Promise.all` starts all promises at the same time and waits until all of them are done. The result is an array of all the resolved values in the same order you passed them.

---

Now let's walk through every file.

---

## Part 1: Backend

### How to start the backend

```bash
cd backend
node index.js
```

`node` is the program that runs JavaScript files. You're telling it: "run this file." The backend starts and listens for HTTP requests.

Alternatively: `npm run dev` uses `nodemon`, which watches for file changes and auto-restarts. Better for development.

---

### `backend/package.json`

This file describes the backend to Node.js and npm (Node Package Manager). It is not executed — it's a configuration document.

```json
{
  "name": "tatvacare-webview-backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev":   "nodemon index.js"
  },
  "dependencies": {
    "openai":    "^4.77.0",
    "cors":      "^2.8.5",
    "dotenv":    "^16.4.7",
    "express":   "^4.21.2",
    "mongoose":  "^8.9.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.9"
  }
}
```

**`"main": "index.js"`** — when someone runs `node .` (without specifying a file), Node looks at this field to know which file is the entry point.

**`"scripts"`** — shortcuts for common commands. `npm start` becomes `node index.js`. `npm run dev` becomes `nodemon index.js`.

**`"dependencies"`** — libraries this project needs to run. When you run `npm install`, npm reads this list and downloads all of them into `node_modules/`.

**`"devDependencies"`** — libraries only needed for development (not in production). `nodemon` is here because production servers don't need auto-restart.

**What each library does:**
- **express** — a web framework for Node.js. Handles HTTP requests: routing (which URL goes to which function), middleware (functions that run on every request), JSON parsing.
- **cors** — a tiny middleware that adds HTTP headers to responses, telling the browser it's allowed to make requests from a different domain/port.
- **dotenv** — reads a `.env` file and adds its contents to `process.env` (the global object where Node stores environment variables).
- **mongoose** — a library for talking to MongoDB. Lets you define schemas (data shapes) and query MongoDB using JavaScript objects.
- **openai** — the official client for OpenAI's API. We use it to talk to Groq's API (which speaks the same language as OpenAI's API).

---

### `backend/.env` and `backend/.env.example`

`.env` is a plain text file of key-value pairs. It stores secrets and environment-specific settings that should never be committed to git.

```
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL=llama-3.3-70b-versatile
PORT=3001
FORTIS_BOOKING_WEBHOOK=https://api.fortishealthcare.com/webhooks/...
```

These become accessible in Node.js code as `process.env.MONGO_URI`, `process.env.PORT`, etc. `process` is a global object Node.js provides — think of it as information about the running program. `process.env` is a sub-object holding all environment variables.

**Why a separate file?** Secrets (API keys, database passwords) must not be stored in code that goes to git. If someone clones your repository, they would get the keys too. By keeping secrets in `.env` and listing `.env` in `.gitignore`, the secrets stay on your machine only.

**`.env.example`** is committed to git. It shows all the required variable names with placeholder values. It's the template: a new developer copies it to `.env` and fills in the real values.

```
# .env.example
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
LLM_BASE_URL=https://api.anthropic.com/v1
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-6
```

---

### `backend/index.js` — the entry point

This is the first file Node.js executes. Everything starts here.

```js
require('dotenv').config();
```

**Line 1 must be this line, always.** `require('dotenv')` loads the dotenv library. `.config()` calls the function that reads `.env` and populates `process.env`. Everything that follows may read from `process.env` — so dotenv must run first. If you put this line second, the libraries below it will see empty values and fail silently.

```js
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/db');
```

`require('express')` loads the Express library from `node_modules`. `require('./config/db')` loads a file you wrote — the `./` means "relative to the current file." The result is whatever that file exported with `module.exports`.

```js
const app  = express();
const PORT = process.env.PORT || 3001;
```

`express()` creates an Express application — this `app` object is the web server. You'll add routes and middleware to it below.

`process.env.PORT || 3001` means: "use the `PORT` environment variable if it's set, otherwise default to 3001." In production hosting services (Render, Railway), the platform sets `PORT` to whatever port your server should listen on. Locally, it's not set, so we get 3001.

```js
app.use(cors());
app.use(express.json());
```

`app.use(...)` registers **middleware** — functions that run on every incoming request before it hits a route handler.

- `cors()` adds response headers that tell browsers "this API allows cross-origin requests." Without this, a browser on port 3000 would refuse to talk to a server on port 3001.
- `express.json()` reads the raw request body (the bytes that arrive), parses it as JSON, and makes it available as `req.body`. Without this middleware, `req.body` would be `undefined` — you'd have no way to read what the client sent.

```js
app.use('/api/session',   require('./routes/session'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/responses', require('./routes/responses'));
app.use('/api/recommend', require('./routes/recommend'));
app.use('/api/booking',   require('./routes/booking'));
```

Each line mounts a **router** (a mini-app that handles a group of related routes) at a path prefix. For example:
- `require('./routes/session')` loads `session.js`, which exports a router with a `POST /init` route.
- `app.use('/api/session', router)` makes that route available at `/api/session/init`.

The paths combine: route file prefix `/api/session` + route inside the file `/init` = full URL `/api/session/init`.

```js
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
```

A simple route that responds with `{ "status": "ok" }`. The `_req` (underscore prefix) is a convention meaning "I know this parameter (the request object) exists but I'm not using it." `res.json(...)` sends a JSON response.

```js
connectDB()
  .then(() => app.listen(PORT, () => console.log(`Backend running on port ${PORT}`)))
  .catch(err => { console.error('DB connection failed:', err); process.exit(1); });
```

`connectDB()` returns a Promise (it's an async operation). `.then(callback)` means "when it succeeds, run this callback." `.catch(callback)` means "when it fails, run this instead."

`process.exit(1)` stops the Node.js process with exit code 1 (non-zero = error). We do this because a server with no database connection is broken — starting it would just cause failures on every request.

`app.listen(PORT, callback)` starts the HTTP server. The callback runs once the server is ready, just to print the confirmation message.

---

### `backend/config/db.js` — database connection

```js
const mongoose = require('mongoose');

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
}

module.exports = connectDB;
```

This file exists for one reason: to keep the database connection URI in one place. If TatvaCare moves to a different MongoDB cluster, only `MONGO_URI` in `.env` changes.

`mongoose.connect(uri)` opens a connection to MongoDB. It is `async` because connecting over a network takes time. `await` pauses the function until the connection is established.

`module.exports = connectDB` makes the function available to any file that `require('./config/db')`.

---

### `backend/models/Session.js` — what a session looks like in MongoDB

MongoDB stores documents (think: JSON objects). Mongoose lets you define a **schema** — a description of what fields a document has, what types they are, and what constraints apply.

```js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId:   { type: String, required: true, unique: true },
  patientId:   { type: String, required: true },
  createdAt:   { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  source:      { type: String, default: 'myFortis-webview' }
}, { timestamps: false });

module.exports = mongoose.model('Session', sessionSchema);
```

**`new mongoose.Schema({...})`** creates a schema. Each key in the object is a field name. Each value describes that field:
- `type: String` — the field must be a string.
- `required: true` — MongoDB will reject the document if this field is missing.
- `unique: true` — MongoDB will reject the document if another document already has the same value for this field.
- `default: Date.now` — if you don't provide this field, MongoDB will call `Date.now` (which returns the current timestamp) and use that.
- `default: null` — if you don't provide this field, it defaults to null.

**`{ timestamps: false }`** — Mongoose has a feature where it auto-adds `createdAt` and `updatedAt` fields to every document. We disable it because we manage these dates ourselves explicitly, which gives us more control over what they represent.

**`mongoose.model('Session', sessionSchema)`** registers this schema as the `Session` model. Mongoose will use a MongoDB collection named `sessions` (it pluralises and lowercases the model name). This is what you import in route files when you write `const Session = require('../models/Session')`.

---

### `backend/models/Response.js` — how answers are stored

```js
const answerSchema = new mongoose.Schema({
  questionId:   String,
  questionText: String,
  answerId:     String,
  answerText:   String
}, { _id: false });

const responseSchema = new mongoose.Schema({
  sessionId:      { type: String, required: true, unique: true },
  answers:        [answerSchema],
  activeBranches: [String],
  savedAt:        { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('Response', responseSchema);
```

**`[answerSchema]`** means "an array of objects that match `answerSchema`." Each element in the array is one question-answer pair.

**`{ _id: false }` on `answerSchema`** — by default, Mongoose adds a unique `_id` field to every embedded subdocument (each answer). We don't need an ID on each answer, so we disable it. This keeps the data cleaner.

**Why store `questionText` and `answerText` alongside the IDs?**

The IDs (`questionId`, `answerId`) are machine-readable codes like `"Q3"` and `"Q3_DIABETES"`. The texts (`questionText`, `answerText`) are the human-readable strings like `"Have you been diagnosed with any of the following?"` and `"Diabetes"`.

The LLM explanation feature reads answers from this collection and shows them to the AI model. If we only stored IDs, the LLM would see `"Q3: Q3_DIABETES"` — meaningless. By storing the text at save time, the document is self-contained: `"Have you been diagnosed with any of the following?: Diabetes"`. The LLM can use it without any additional lookups.

---

### `backend/models/Recommendation.js` — the scoring result

```js
const recommendationSchema = new mongoose.Schema({
  sessionId:          { type: String, required: true, unique: true },
  recommendedPackage: {
    oracleCode: Number,
    name:       String,
    gender:     String,
    price:      Number
  },
  finalScores: {
    Basic:    Number,
    Silver:   Number,
    Gold:     Number,
    Diabetic: Number,
    Heart:    Number
  },
  scoringBreakdown: [mongoose.Schema.Types.Mixed],
  llmExplanation:  { type: String, default: null },
  recommendedAt:   { type: Date, default: Date.now },
  explainedAt:     { type: Date, default: null }
}, { timestamps: false });
```

**`mongoose.Schema.Types.Mixed`** — a "wildcard" type. It accepts any valid JSON value — an object, array, string, number. Used for `scoringBreakdown` because each entry's shape depends on how many packages an answer contributed to. Using `Mixed` avoids having to precisely enumerate every possible shape.

**`llmExplanation: { type: String, default: null }`** — this starts as `null` for every new recommendation. It gets filled in the first time a user taps "Why this package?" and the LLM generates an explanation. On subsequent taps, the route checks this field first: if it's non-null, it returns the cached string instead of calling the LLM again. This caching saves money and makes repeat taps instant.

---

### `backend/data/questions.json` — the questionnaire content

This is a data file, not executable code. It defines all 13 questions. A simplified excerpt:

```json
{
  "questions": [
    {
      "id": "Q1",
      "text": "What is your gender?",
      "branch": null,
      "options": [
        { "id": "Q1_M", "text": "Male",   "triggersBranch": [] },
        { "id": "Q1_F", "text": "Female", "triggersBranch": [] }
      ]
    },
    {
      "id": "Q3",
      "text": "Have you been diagnosed with any of the following?",
      "branch": null,
      "options": [
        { "id": "Q3_DIABETES", "text": "Diabetes",       "triggersBranch": ["BRANCH_A"] },
        { "id": "Q3_HEART",    "text": "Heart condition", "triggersBranch": ["BRANCH_B"] },
        { "id": "Q3_BOTH",     "text": "Both",            "triggersBranch": ["BRANCH_A", "BRANCH_B"] },
        { "id": "Q3_NONE",     "text": "Neither",         "triggersBranch": [] }
      ]
    },
    {
      "id": "Q3a",
      "text": "How long have you had diabetes?",
      "branch": "BRANCH_A",
      "options": [ ... ]
    }
  ]
}
```

Each question has:
- **`id`** — a unique code. Used as the key in the scoring rules lookup.
- **`text`** — what the user sees.
- **`branch`** — `null` means "always show." `"BRANCH_A"` means "only show if diabetes branch is active."
- **`options`** — each option has an `id`, display `text`, and a `triggersBranch` array. If the user picks an option that has `"triggersBranch": ["BRANCH_A"]`, the app activates BRANCH_A and starts showing diabetes follow-up questions.

**Why is this file served from the backend instead of bundled in the frontend?**

If the questions were baked into the frontend JavaScript bundle, updating a question would require a new frontend deployment. By serving them from `GET /api/questions`, a product manager can edit this JSON file on the server and the change is live immediately — no code deployment needed.

---

### `backend/data/scoringLogic.json` — how answers become scores

```json
{
  "rules": [
    {
      "questionId": "Q3",
      "answerId":   "Q3_DIABETES",
      "branch":     null,
      "scores":     { "Basic": 0, "Silver": 1, "Gold": 2, "Diabetic": 5, "Heart": 0 }
    },
    {
      "questionId": "Q3a",
      "answerId":   "Q3a_GT10",
      "branch":     "BRANCH_A",
      "scores":     { "Basic": 0, "Silver": 0, "Gold": 1, "Diabetic": 3, "Heart": 0 }
    }
  ],
  "tiebreaker": {
    "priority": ["Gold", "Diabetic", "Heart", "Silver", "Basic"]
  },
  "genderMap": {
    "Diabetic": { "Q1_M": 441665, "Q1_F": 441664 },
    "Heart":    { "Q1_M": 441663, "Q1_F": 441662 },
    "Gold":     { "Q1_M": 441660, "Q1_F": 441666 },
    "Silver":   { "Q1_M": 441669, "Q1_F": 441667 },
    "Basic":    { "Q1_M": 441661, "Q1_F": 441670 }
  }
}
```

The scoring system works like this: each answer the user gives gets looked up in `rules`. If a rule matches (`questionId` AND `answerId` both match), the `scores` values are added to running totals. After all answers are processed, the package with the highest total wins.

**Why is this file not exposed to the frontend?**

If this file were downloadable by the browser, a clever user could inspect it, figure out exactly which answers give the most points to which package, and game the questionnaire. Keeping it server-side prevents this.

**The `genderMap`** solves a specific problem: the scoring engine produces a winner by type name (`"Diabetic"`), but we need an oracle code (Fortis's internal ID like `441665`) to book the package. The gender answer from Q1 is also needed — `"Q1_M"` vs `"Q1_F"` — because male and female variants of the same package have different oracle codes.

---

### `backend/data/AHClisting.json` — package and test details

One entry per package variant (10 entries: 5 package types × 2 genders). Each entry:

```json
{
  "oracleCode": 441665,
  "name":       "Diabetic Profile",
  "gender":     "male",
  "price":      8900,
  "tests": [
    {
      "name": "HbA1c",
      "subTests": []
    },
    {
      "name": "Lipid Profile",
      "subTests": [
        { "name": "Total Cholesterol" },
        { "name": "LDL Cholesterol" },
        { "name": "HDL Cholesterol" }
      ]
    }
  ]
}
```

`tests` is an array of panel objects. Some panels have `subTests` (the individual measurements inside the panel). The LLM service reads this to know which specific tests are in the recommended package, then passes that information to the AI so it can name actual tests by name in its explanation.

---

### `backend/routes/session.js` — creating a session

```js
const express = require('express');
const crypto  = require('crypto');
const Session = require('../models/Session');

const router = express.Router();
```

`express.Router()` creates a mini-app — a standalone group of routes. This router will be mounted at `/api/session` in `index.js`.

`crypto` is a built-in Node.js module for cryptography. We use just one function from it: `crypto.randomUUID()`.

```js
router.post('/init', async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId is required' });
```

`router.post('/init', ...)` registers a handler for `POST /init`. When combined with the `/api/session` prefix from `index.js`, this handles `POST /api/session/init`.

`async (req, res) => { ... }` — `req` is the incoming request (contains `req.body`, `req.params`, `req.headers`). `res` is the outgoing response (you call methods on it to send back data: `res.json(...)`, `res.status(...)`).

`const { patientId } = req.body` — destructuring: pulls `patientId` out of the request body. If the client sent `{ "patientId": "FORTIS_SID_001" }`, then `patientId` is `"FORTIS_SID_001"`.

`if (!patientId) return res.status(400).json(...)` — validate before proceeding. HTTP 400 means "Bad Request" — the client sent something wrong. The `return` exits the function early so the code below doesn't run.

```js
  const sessionId = crypto.randomUUID();
  const createdAt = new Date();

  await Session.create({ sessionId, patientId, createdAt });

  res.json({ sessionId, createdAt });
});
```

`crypto.randomUUID()` generates a universally unique identifier — a string like `"f47ac10b-58cc-4372-a567-0e02b2c3d479"`. It is statistically impossible for two calls to produce the same value. Using a random UUID instead of a sequential number (1, 2, 3...) means a user can't guess another patient's session ID.

`Session.create({ sessionId, patientId, createdAt })` is shorthand for `Session.create({ sessionId: sessionId, patientId: patientId, createdAt: createdAt })`. When the key name and the variable name are the same, JavaScript lets you write it once.

`res.json({ sessionId, createdAt })` sends a JSON response back to the client. The browser receives `{ "sessionId": "f47ac...", "createdAt": "2026-05-27T..." }`.

```js
module.exports = router;
```

Export the router so `index.js` can mount it.

---

### `backend/routes/questions.js` — serving the questionnaire

```js
const express   = require('express');
const questions = require('../data/questions.json');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json(questions);
});

module.exports = router;
```

The simplest route in the project. `require('../data/questions.json')` loads the JSON file — Node.js can `require` JSON files directly. The result is a JavaScript object (the parsed JSON).

`router.get('/', ...)` — the path is `/` which, when combined with the `/api/questions` prefix from `index.js`, becomes `GET /api/questions`.

`_req` — the underscore means "I'm not using this parameter." The request has no body or query parameters we care about; we always return the same JSON regardless of who's asking.

---

### `backend/routes/responses.js` — saving user answers

```js
router.post('/save', async (req, res) => {
  const { sessionId, answers, activeBranches } = req.body;

  if (!sessionId || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'sessionId and answers[] are required' });
  }

  const session = await Session.findOne({ sessionId });
  if (!session) return res.status(404).json({ error: 'Session not found' });

  await Response.create({
    sessionId,
    answers,
    activeBranches: activeBranches || [],
    savedAt: new Date()
  });

  res.json({ saved: true });
});
```

`Array.isArray(answers)` — `answers` should be an array of answer objects. This check verifies it actually is an array (not a string, number, or null).

`Session.findOne({ sessionId })` — queries MongoDB for a document in the `sessions` collection where the `sessionId` field equals our value. Returns the document, or `null` if nothing is found. We verify the session exists before saving answers to prevent orphaned records (answers with no parent session).

HTTP 404 means "Not Found" — the session ID was valid-looking but didn't exist in the database.

`activeBranches: activeBranches || []` — if the client didn't send `activeBranches`, default to an empty array.

---

### `backend/routes/recommend.js` — scoring and the AI explanation

This file handles two different routes.

#### `POST /api/recommend` — run the scoring engine

```js
router.post('/', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const responseDoc = await Response.findOne({ sessionId });
    if (!responseDoc) return res.status(404).json({ error: 'Responses not found for session' });

    const { recommendedPackage, finalScores, scoringBreakdown } =
      computeRecommendation(responseDoc.answers, responseDoc.activeBranches);
```

`computeRecommendation(...)` is a function from `scoringEngine.js`. It takes the answers array and the active branches, runs the scoring logic, and returns an object with three fields. We destructure those three fields immediately.

```js
    await Promise.all([
      Recommendation.create({ sessionId, recommendedPackage, finalScores, scoringBreakdown, recommendedAt: new Date() }),
      Session.updateOne({ sessionId }, { completedAt: new Date() })
    ]);
```

`Promise.all([a, b])` starts both database operations simultaneously. `Recommendation.create(...)` writes a new recommendation document. `Session.updateOne({sessionId}, {completedAt: new Date()})` finds the session with that ID and sets `completedAt` to the current time. Both are independent, so running them in parallel saves time.

`Session.updateOne({ sessionId }, { completedAt: new Date() })` takes two arguments:
1. **Filter** — `{ sessionId }` — which document(s) to update. In MongoDB syntax this means "find documents where `sessionId` equals our value."
2. **Update** — `{ completedAt: new Date() }` — what to change. Mongoose/MongoDB knows to only update the listed fields, not replace the entire document.

```js
    res.json({ recommendedPackage, finalScores });
  } catch (err) {
    console.error('Recommend error:', err.message);
    res.status(500).json({ error: 'Could not compute recommendation', detail: err.message });
  }
});
```

HTTP 500 means "Internal Server Error" — something went wrong on the server that wasn't the client's fault.

The `try/catch` is critical here. Without it, if anything in the `try` block throws (database unavailable, scoring engine bug, whatever), the error propagates up to Express, which would crash the handler and leave the response hanging. With `try/catch`, we handle the error gracefully.

#### `GET /api/recommend/explain/:sessionId` — AI explanation

```js
router.get('/explain/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
```

`:sessionId` in the route path is a **URL parameter** — a variable part of the URL. If the client requests `GET /api/recommend/explain/abc-123`, then `req.params.sessionId` is `"abc-123"`.

```js
  try {
    const recDoc = await Recommendation.findOne({ sessionId });
    if (!recDoc) return res.status(404).json({ error: 'Recommendation not found' });

    if (recDoc.llmExplanation) {
      return res.json({ explanation: recDoc.llmExplanation, fromCache: true });
    }
```

**Cache check.** `recDoc.llmExplanation` is either `null` (not yet generated) or a string (already generated). If it's a non-null string, JavaScript treats it as truthy, and we return it immediately without calling the LLM. This pattern is called memoisation or caching.

```js
    const explanation = await generateExplanation(sessionId);

    await Recommendation.updateOne(
      { sessionId },
      { llmExplanation: explanation, explainedAt: new Date() }
    );

    res.json({ explanation, fromCache: false });
  } catch (err) {
    console.error('Explain error:', err.message);
    res.status(500).json({ error: 'Could not generate explanation', detail: err.message });
  }
});
```

After generating, we save the explanation to MongoDB so the next call returns the cached version. `fromCache: true/false` in the response tells the client whether this was freshly generated — useful for logging, not displayed to users.

---

### `backend/routes/booking.js` — notifying Fortis

```js
router.post('/notify', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const [sessionDoc, responseDoc, recDoc] = await Promise.all([
      Session.findOne({ sessionId }),
      Response.findOne({ sessionId }),
      Recommendation.findOne({ sessionId })
    ]);
```

Three database lookups running in parallel. Result is an array of three documents, which we destructure into three named variables.

```js
    const payload = {
      event:              'package_recommended',
      patientId:          sessionDoc?.patientId,
      sessionId,
      recommendedPackage: recDoc.recommendedPackage,
      finalScores:        recDoc.finalScores,
      answers:            responseDoc?.answers        || [],
      activeBranches:     responseDoc?.activeBranches || [],
      recommendedAt:      recDoc.recommendedAt,
      notifiedAt:         new Date().toISOString()
    };
```

`sessionDoc?.patientId` — optional chaining: if `sessionDoc` is `null` (session not found), return `undefined` instead of crashing. The `?.` protects against null/undefined objects.

`responseDoc?.answers || []` — if `responseDoc` is null, `responseDoc?.answers` is `undefined`, and `|| []` gives us an empty array as the fallback. Fortis always gets a well-formed payload.

`.toISOString()` converts a JavaScript Date object to a standard ISO 8601 string like `"2026-05-27T10:30:00.000Z"`. This is the standard format for timestamps in JSON — unambiguous across time zones.

```js
    const webhookUrl = process.env.FORTIS_BOOKING_WEBHOOK;

    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const webhookRes = await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  ctrl.signal
      });
      clearTimeout(timer);
      console.log(`[booking] Fortis webhook → ${webhookRes.status}`);
    } catch (webhookErr) {
      console.warn(`[booking] Fortis webhook failed: ${webhookErr.message}`);
    }
```

**`AbortController`** is a browser/Node.js API for cancelling ongoing operations. We create one, set a timer to call `ctrl.abort()` after 5 seconds, and pass `ctrl.signal` to `fetch`. If 5 seconds elapse without a response from Fortis, `fetch` throws an error that we catch in the inner `try/catch`.

`JSON.stringify(payload)` converts the JavaScript object to a JSON string (the reverse of `JSON.parse`). HTTP request bodies are strings — you can't send a JavaScript object directly.

**Two levels of `try/catch`:**
- The outer `try/catch` catches errors from the MongoDB lookups.
- The inner `try/catch` (just around the `fetch`) catches errors from the Fortis webhook.

The inner catch only logs a warning and continues. The outer try block still reaches `res.json({ notified: true, payload })`. This means the response to the client always succeeds even if Fortis's webhook is down. Fortis being offline should never block the user's booking action.

```js
    res.json({ notified: true, payload });
  } catch (err) {
    console.error('Booking notify error:', err.message);
    res.status(500).json({ error: 'Could not process booking notification' });
  }
});
```

---

### `backend/services/scoringEngine.js` — the recommendation algorithm

```js
const scoringLogic = require('../data/scoringLogic.json');
const ahcListing   = require('../data/AHClisting.json');

function computeRecommendation(answers, activeBranches) {
  const scores = { Basic: 0, Silver: 0, Gold: 0, Diabetic: 0, Heart: 0 };
  const breakdown = [];
  let genderAnswerId = null;
```

`scores` is a plain object used as a dictionary — keys are package names, values are running point totals. Starts at 0 for all.

`let genderAnswerId = null` — uses `let` because this will be reassigned when we encounter Q1.

```js
  for (const answer of answers) {
```

`for...of` loop — iterates over each element in the `answers` array. Each iteration, `answer` is one answer object like `{ questionId: 'Q3', questionText: '...', answerId: 'Q3_DIABETES', answerText: 'Diabetes' }`.

```js
    if (answer.questionId === 'Q1') {
      genderAnswerId = answer.answerId;
      continue;
    }
```

`continue` — skip the rest of this loop iteration and move to the next answer. Q1 (gender) doesn't affect scores, it's only used for the gender map lookup later.

```js
    const rule = scoringLogic.rules.find(
      r => r.questionId === answer.questionId && r.answerId === answer.answerId
    );

    if (!rule) continue;
```

`.find(callback)` — searches the `rules` array and returns the first element where the callback returns `true`. If no match is found, it returns `undefined`. The `&&` means both conditions must be true: the question ID AND the answer ID must match.

`if (!rule) continue` — if no rule was found for this answer, skip it. This makes the engine tolerant of answers to questions that don't have scoring rules yet.

```js
    if (rule.branch && !activeBranches.includes(rule.branch)) continue;
```

`rule.branch` — if the rule has a branch restriction (e.g., `"BRANCH_A"`).
`activeBranches.includes(rule.branch)` — `.includes()` returns `true` if the array contains that value.
`!activeBranches.includes(...)` — the `!` negates it: "if this branch is NOT active."

So: "if this rule requires a branch AND that branch is not active, skip this rule." This prevents diabetes follow-up answers from scoring if the user didn't take the diabetes branch.

```js
    for (const [pkg, pts] of Object.entries(rule.scores)) {
      scores[pkg] += pts;
    }
```

`Object.entries(rule.scores)` converts `{ "Basic": 0, "Silver": 1, "Gold": 2, "Diabetic": 5, "Heart": 0 }` into an array of `[key, value]` pairs: `[["Basic", 0], ["Silver", 1], ...]`.

`for (const [pkg, pts] of ...)` — array destructuring in the loop variable. Each iteration, `pkg` is the package name and `pts` is the points.

`scores[pkg] += pts` — `scores["Diabetic"] += 5` — adds the points to the running total for that package. `+=` is shorthand for `scores[pkg] = scores[pkg] + pts`.

```js
  const winner   = findWinner(scores);
  const genderId = genderAnswerId || 'Q1_M';
  const oracleCode = scoringLogic.genderMap[winner][genderId];
  const pkg = ahcListing.find(p => p.oracleCode === oracleCode);
```

`scoringLogic.genderMap[winner]` — bracket notation to access a property whose name is stored in a variable. If `winner` is `"Diabetic"`, this is `scoringLogic.genderMap["Diabetic"]` which gives `{ "Q1_M": 441665, "Q1_F": 441664 }`.

`[genderId]` — another bracket access. If `genderId` is `"Q1_M"`, we get `441665` — the oracle code for the male Diabetic Profile.

`ahcListing.find(p => p.oracleCode === oracleCode)` — find the full package entry (with name, price, tests) matching that oracle code.

```js
function findWinner(scores) {
  let maxScore = -1;
  const winners = [];

  for (const [pkg, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      winners.length = 0;    // clear the array — this is how you empty an array in place
      winners.push(pkg);
    } else if (score === maxScore) {
      winners.push(pkg);
    }
  }
```

This loop builds a `winners` array that may contain multiple packages if there's a tie. `winners.length = 0` is a specific JavaScript idiom to clear an array without creating a new one.

```js
  if (winners.length === 1) return winners[0];

  for (const pkg of scoringLogic.tiebreaker.priority) {
    if (winners.includes(pkg)) return pkg;
  }

  return winners[0];
}
```

If there's only one winner, return it immediately. If tied, walk through the priority list (`["Gold", "Diabetic", "Heart", "Silver", "Basic"]`) and return the first one that appears in the tied winners. This means ties resolve toward the more comprehensive package.

---

### `backend/services/WhyThisTestPrompt.md` — the AI's instructions

```markdown
You are a health package advisor for Fortis Hospitals...

Structure your response in exactly 3 sections using these exact headings:

**What this package tests**
...

**Why it fits your profile**
...

**Why a lower package wouldn't be enough**
...

Rules you must follow without exception:
- Name at least 4 specific tests by name
- Never say "you have diabetes" — frame it as "given your diabetes diagnosis"
...
```

This is a plain text file that serves as the **system prompt** — the instructions given to the AI model before showing it any patient data. It lives in a `.md` file so non-developers (product managers, clinical advisors) can edit the tone and rules without touching any JavaScript.

The bold headings `**text**` are Markdown formatting. The frontend's `parseExplanation()` function detects exactly these patterns to split the response into three visual cards.

---

### `backend/services/WhyThisTestPrompt.js` — building the AI message

```js
const fs   = require('fs');
const path = require('path');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, 'WhyThisTestPrompt.md'),
  'utf8'
);
```

`fs` — Node.js built-in module for File System operations (reading/writing files).
`path` — Node.js built-in module for building file paths safely across operating systems.

`fs.readFileSync(...)` — reads a file synchronously (blocking). The `'utf8'` argument means "decode the bytes as UTF-8 text and give me a string." The alternative is `readFile` (async), but for a one-time startup read this is fine.

`path.join(__dirname, 'WhyThisTestPrompt.md')` — `__dirname` is a Node.js magic variable containing the absolute path of the current file's directory. `path.join` combines it with the filename to produce an absolute path. This is safer than string concatenation (`__dirname + '/WhyThisTestPrompt.md'`) because `path.join` handles different operating system path separators.

```js
function buildUserMessage(payload) {
  const { recommendedPackage, testPanels, runnerUp, userAnswers, scoringBreakdown } = payload;

  const panelList = testPanels
    .map(t => `  - ${t.name}${t.keySubTests?.length ? ` (includes: ${t.keySubTests.join(', ')})` : ''}`)
    .join('\n');
```

`testPanels.map(t => ...)` — transforms each panel object into a formatted string line.

`t.keySubTests?.length ? ... : ''` — a **ternary operator**. It's a compact if/else: `condition ? valueIfTrue : valueIfFalse`. Here: "if `keySubTests` exists and has elements, show them; otherwise show an empty string."

`.join('\n')` — joins all the strings in the array into one string, with a newline between each. So an array of `["  - HbA1c", "  - Lipid Profile (includes: Total Cholesterol, LDL, HDL)"]` becomes:

```
  - HbA1c
  - Lipid Profile (includes: Total Cholesterol, LDL, HDL)
```

```js
  return `
RECOMMENDED PACKAGE: ${recommendedPackage.name} (${recommendedPackage.gender}, ₹${recommendedPackage.price})

TEST PANELS IN THIS PACKAGE:
${panelList}

RUNNER-UP PACKAGE: ${runnerUp.name} — score ${runnerUp.score} vs recommended score ${runnerUp.winnerScore}

PATIENT'S ANSWERS:
${answerList}
`.trim();
```

This is a **template literal** (backtick string) that spans multiple lines. `${...}` embeds JavaScript expressions. The result is a structured text message sent to the AI as the "user" turn in the conversation.

`.trim()` removes leading/trailing whitespace (the newline at the start of the template literal).

---

### `backend/services/llmService.js` — calling the AI model

```js
const OpenAI = require('openai');
const ahcListing  = require('../data/AHClisting.json');
const Response    = require('../models/Response');
const Recommendation = require('../models/Recommendation');
const { SYSTEM_PROMPT, buildUserMessage } = require('./WhyThisTestPrompt');
```

`const { SYSTEM_PROMPT, buildUserMessage } = require('./WhyThisTestPrompt')` — `WhyThisTestPrompt.js` exports an object `{ SYSTEM_PROMPT, buildUserMessage }`. This destructures that object to get the two pieces.

```js
async function generateExplanation(sessionId) {
  const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey:  process.env.LLM_API_KEY
  });
```

**Why is `new OpenAI(...)` inside the function instead of at the top of the file?**

Node.js loads all `require()`d files during startup, before any requests arrive. If `const client = new OpenAI(...)` were at the top of the file (outside the function), it would run at startup — but `require('dotenv').config()` in `index.js` runs at the very beginning, and `require('./services/llmService')` runs shortly after as part of the route loading. The question is timing: has `dotenv` already populated `process.env` by the time this line runs?

The answer: yes, because `require('dotenv').config()` is the first line in `index.js`. But to be safe and explicit, we create the client inside the function, where we're guaranteed to be in request-handling territory and `process.env` is fully populated. This is also how the original bug was discovered and fixed in this project.

```js
  const [responseDoc, recDoc] = await Promise.all([
    Response.findOne({ sessionId }),
    Recommendation.findOne({ sessionId })
  ]);

  if (!responseDoc || !recDoc) throw new Error('Session data not found');
```

`throw new Error(...)` — manually creates and throws an error. The `throw` keyword in JavaScript works like `raise` in Python. In an `async` function, a thrown error becomes a rejected Promise, which gets caught by the `try/catch` in `recommend.js`.

```js
  const pkgEntry = ahcListing.find(p => p.oracleCode === recDoc.recommendedPackage.oracleCode);
  const testPanels = pkgEntry
    ? pkgEntry.tests.map(t => ({
        name: t.name,
        keySubTests: t.subTests ? t.subTests.slice(0, 4).map(s => s.name) : []
      }))
    : [];
```

`pkgEntry ? [...] : []` — ternary: if the package was found, map its tests; otherwise use an empty array.

`.slice(0, 4)` — returns a new array with only the first 4 elements. Sub-test lists can be long; we limit to 4 key sub-tests to keep the LLM prompt focused.

`t.subTests.map(s => s.name)` — transforms an array of sub-test objects `[{ name: "Total Cholesterol" }, ...]` into an array of just the names `["Total Cholesterol", ...]`.

```js
  const sorted       = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const runnerUpEntry = sorted.find(([name]) => name !== sorted[0][0]);
```

`sorted[0][0]` — `sorted` is an array of `[name, score]` pairs sorted by score descending. `sorted[0]` is the winner's pair. `sorted[0][0]` is the winner's name.

`.find(([name]) => name !== sorted[0][0])` — array destructuring in the callback: `[name]` pulls the first element of each pair (the name) and ignores the second (the score). We find the first entry whose name is different from the winner's name — that's the runner-up.

```js
  const completion = await client.chat.completions.create({
    model:    process.env.LLM_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: buildUserMessage(payload) }
    ],
    max_tokens:  700,
    temperature: 0.3
  });

  return completion.choices[0].message.content.trim();
```

The OpenAI API works with a **messages array** — a conversation history. Each message has a `role` (`"system"`, `"user"`, or `"assistant"`) and `content` (the text). The `"system"` role is instructions to the AI. The `"user"` role is what the "user" is asking.

`max_tokens: 700` — caps the response length. One token is roughly 4 characters. 700 tokens is about 500 words.

`temperature: 0.3` — controls randomness. 0 = completely deterministic (same prompt always produces same output). 1 = very creative/random. 0.3 makes the model follow the instructions literally without creative variation.

`completion.choices[0].message.content` — the API returns a `completion` object. `.choices` is an array (usually one element). `[0]` is the first (and only) choice. `.message.content` is the text the AI wrote.

---

## Part 2: Frontend

### How to start the frontend

```bash
cd frontend
npm run dev
```

`npm run dev` launches Vite, which:
1. Starts a development server on port 3000
2. Serves `index.html`
3. Transforms JSX and modern JavaScript on the fly as the browser requests files
4. Proxies `/api` requests to `http://localhost:3001`

---

### `frontend/package.json`

```json
{
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react":     "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "vite":                "^6.1.0",
    "@vitejs/plugin-react":"^4.3.4",
    "tailwindcss":         "^3.4.17",
    "postcss":             "^8.5.1",
    "autoprefixer":        "^10.4.20"
  }
}
```

**`"type": "module"`** — tells Node.js to treat `.js` files in this directory as ES modules. This means you use `import`/`export` syntax (not `require`/`module.exports`).

**`react`** — the React library itself. Provides the component model, state, hooks.
**`react-dom`** — the part of React that knows how to render components to an HTML DOM (as opposed to React Native, which renders to mobile UI elements).
**`vite`** — the build tool and development server. It transforms JSX → JS and bundles everything.
**`tailwindcss`** — generates CSS utility classes. `postcss` and `autoprefixer` are tools Tailwind uses to process CSS.

---

### `frontend/index.html` — the page shell

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Find Your Health Package — Fortis</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

This is the only HTML file. React doesn't generate multiple HTML pages — it starts with this one file and dynamically changes what's inside `<div id="root">`.

**`maximum-scale=1.0, user-scalable=no`** — prevents the browser from zooming when a user taps a button on iOS. Without this, tapping a form field triggers an automatic zoom that disrupts the layout.

**`<div id="root"></div>`** — the mount point. React's `createRoot()` in `main.jsx` finds this element and takes it over.

**`<script type="module" src="/src/main.jsx">`** — `type="module"` tells the browser this is an ES module. Vite intercepts this request, transforms `main.jsx` from JSX into plain JavaScript, and serves it.

---

### `frontend/vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

**The proxy** is the most important setting here. When the frontend's JavaScript calls `/api/questions`, the browser sends a request to `http://localhost:3000/api/questions`. Vite's development server intercepts it and forwards it to `http://localhost:3001/api/questions` (the backend). The browser never directly talks to port 3001, so there are no cross-origin issues.

In production, a reverse proxy (nginx, Vercel, etc.) handles the same job.

---

### `frontend/tailwind.config.js`

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tc: {
          green:         '#1a7a4a',
          'green-mid':   '#1d8a54',
          'green-dark':  '#155c38',
          'green-bg':    '#eaf6ef',
          'green-border':'#b8dfc9',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  }
};
```

**`content`** — tells Tailwind which files to scan for CSS class names. Tailwind is a "utility-first" CSS framework: you style elements by adding class names like `text-sm`, `bg-white`, `rounded-2xl`. It generates only the CSS for classes that actually appear in your files — everything else is tree-shaken out.

**Custom `tc` colors** — adds new colour names to Tailwind's palette. After adding `tc.green: '#1a7a4a'`, you can write `bg-tc-green` in JSX and get a green background. Without this, you'd write `style={{ backgroundColor: '#1a7a4a' }}` on every element.

**Font family** — `-apple-system` is the San Francisco font on iOS/Mac. `Roboto` is Android's native font. Using these means the text looks like it belongs in a mobile app rather than a generic web page.

---

### `frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

These three lines are Tailwind directives — Tailwind's PostCSS plugin replaces them with the generated CSS during build. `base` is CSS resets. `components` is component-level styles (mostly empty by default). `utilities` is all the generated utility classes.

```css
* {
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}
```

`-webkit-tap-highlight-color: transparent` — removes the blue flash that appears on iOS Safari when you tap any element. We have custom active states instead.

`box-sizing: border-box` — changes how element sizes are calculated. Without this: a div with `width: 100px` and `padding: 10px` becomes 120px wide (padding is added outside). With `border-box`: it stays 100px wide (padding counts inside). Makes layout calculations much more predictable.

```css
#root {
  max-width: 430px;
  margin: 0 auto;
  box-shadow: 0 0 40px rgba(0,0,0,0.12);
}
```

`max-width: 430px` — limits the app to phone width. 430px is roughly the width of a large iPhone. On a desktop browser you see a phone-sized column.

`margin: 0 auto` — centres the column horizontally. `auto` left and right margins distribute equally, centring the element.

`box-shadow: 0 0 40px rgba(0,0,0,0.12)` — a soft shadow around the phone column. `rgba(0,0,0,0.12)` is black at 12% opacity. Makes the demo look polished on desktop.

```css
body {
  background: #f0f4f8;
  min-height: 100dvh;
}
```

**`100dvh` vs `100vh`** — `vh` means "1% of the viewport height." On mobile browsers, this includes the address bar. When you scroll down and the address bar hides, the viewport height changes, and elements sized with `vh` jump. `dvh` (dynamic viewport height) updates dynamically with the actual visible area — no jump. All screens in this app use `min-h-dvh` for this reason.

---

### `frontend/src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`import './index.css'` — Vite processes this import, transforms the CSS with PostCSS/Tailwind, and injects it into the page as a `<style>` tag.

`document.getElementById('root')` — finds the `<div id="root">` in `index.html`. This is the only direct DOM manipulation in the codebase — everything else is done through React.

`ReactDOM.createRoot(...).render(...)` — React takes over the `#root` div and starts rendering components.

**`<React.StrictMode>`** — a wrapper component that activates extra checks in development. Most notably: it deliberately calls your component functions and `useEffect` hooks **twice** to help detect side effects that should be cleaned up. This means in development, you might see some API calls happen twice. In production, this wrapper has zero effect.

---

### `frontend/src/api/client.js`

```js
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

`options = {}` — a **default parameter**. If `request` is called with only one argument (`request('/questions')`), `options` defaults to an empty object instead of being `undefined`.

`{ headers: { 'Content-Type': 'application/json' }, ...options }` — creates a new object that starts with the `Content-Type` header and then spreads in everything from `options`. If `options` has a `method` or `body` property, they get added. If `options` also has a `headers` property... it would be tricky. In this codebase, callers never pass extra headers, so this is fine.

`!res.ok` — `fetch` returns a Response object. `res.ok` is `true` when the HTTP status is 200–299. For 400, 404, 500 etc., it's `false`. Since `fetch` doesn't throw on HTTP errors (only network failures), this check manually throws, converting HTTP errors into JavaScript errors.

```js
export function fetchQuestions() {
  return request('/questions');
}

export function initSession(patientId) {
  return request('/session/init', {
    method: 'POST',
    body: JSON.stringify({ patientId })
  });
}
```

Notice: no `async`/`await` here. `request()` already returns a Promise. These functions just return that Promise to the caller. Adding `async` would create a new Promise wrapping the existing Promise — redundant. The caller (`App.jsx`) does the `await`.

---

### `frontend/src/App.jsx` — the brain of the frontend

This is the most complex file. It holds all the state and orchestrates the entire flow.

#### React hooks: `useState` and `useEffect`

```js
import { useState, useEffect } from 'react';
```

**`useState`** — lets a component have its own memory. Every time state changes, React re-renders the component (calls the function again and updates the DOM).

```js
const [screen, setScreen] = useState('init');
```

This declares one piece of state: `screen`, initially `'init'`. `useState` returns an array of two things: the current value and a setter function. By convention, the setter is named `set` + the variable name.

To change the screen: `setScreen('welcome')`. React will re-render the component with `screen` now equal to `'welcome'`.

**`useEffect`** — runs a side effect after the component renders. Side effects are things that interact with the outside world: fetching data, setting timers, reading localStorage.

```js
useEffect(() => {
  async function boot() { ... }
  boot();
}, []);
```

The `[]` is the **dependency array**. An empty array `[]` means "run this effect only once, when the component first mounts." If you listed variables like `[sessionId]`, the effect would re-run every time `sessionId` changed.

#### The state variables

```js
const [screen,         setScreen]         = useState('init');
const [allQuestions,   setAllQuestions]   = useState([]);
const [sessionId,      setSessionId]      = useState(null);
const [answers,        setAnswers]        = useState([]);
const [activeBranches, setActiveBranches] = useState([]);
const [currentIdx,     setCurrentIdx]     = useState(0);
const [recommendation, setRecommendation] = useState(null);
const [explanation,    setExplanation]    = useState(null);
const [explainError,   setExplainError]   = useState(false);
const [errorMsg,       setErrorMsg]       = useState('');
```

These are all the things the component needs to remember. Every variable has an initial value and a setter. When you call a setter, the component re-renders.

#### Session persistence

```js
const STORAGE_KEY  = 'tc_fortis_session';
const SESSION_FLAG = 'tc_fortis_active';
```

**`localStorage`** — browser storage that persists forever (until cleared). Survives page refreshes, tab closes, and browser restarts. Used to store the session state so a user can resume if they refresh mid-questionnaire.

**`sessionStorage`** — browser storage that's cleared when the tab is closed (but NOT on refresh). Used to store a single flag.

```js
function loadStorage() {
  if (!sessionStorage.getItem(SESSION_FLAG)) {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem(SESSION_FLAG, '1');
  }
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
```

**The session lifecycle logic:**
- On first open: `SESSION_FLAG` is not in `sessionStorage` → wipe `localStorage` → set the flag → start fresh.
- On refresh: `SESSION_FLAG` IS in `sessionStorage` (refresh doesn't clear sessionStorage) → don't wipe `localStorage` → restore previous answers.
- On close and reopen: `SESSION_FLAG` is gone (close cleared sessionStorage) → wipe `localStorage` → start fresh.

`JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}` — reads the stored string and parses it as JSON. If nothing is stored, `getItem` returns `null`, `JSON.parse(null)` returns `null`, and `|| {}` gives us an empty object as fallback.

The `try/catch` around the parse handles the edge case where localStorage contains corrupted data (not valid JSON). Rather than crashing, we return an empty object and start fresh.

#### The boot sequence

```js
useEffect(() => {
  async function boot() {
    const stored = loadStorage();
    const questionsPromise = fetchQuestions();
```

`fetchQuestions()` returns a Promise — the network request has started but hasn't finished yet. We don't `await` it immediately because we might not need the questions right away, and starting the request early is free.

```js
    // Path 1: user already completed the questionnaire — go straight to result
    if (stored.sessionId && stored.completed && stored.recommendation) {
      const qs = await questionsPromise;
      setAllQuestions(qs.questions);
      setRecommendation(stored.recommendation);
      setScreen('result');
      return;
    }
```

`return` exits the `boot` function early. The three `if` paths are exclusive — once one matches, we don't continue to the next.

```js
    // Path 3: fresh start
    const [qs, { sessionId: sid, createdAt }] = await Promise.all([
      questionsPromise,
      initSession(patientId)
    ]);
```

`{ sessionId: sid, createdAt }` — destructuring with **renaming**. The response from `initSession` has a field called `sessionId`, but we already have a variable called `sessionId` (the state variable). By writing `sessionId: sid`, we pull out `sessionId` and call it `sid` instead.

#### `handleAnswer` — the branching engine

```js
function handleAnswer(question, option) {
  const newAnswer = {
    questionId:   question.id,
    questionText: question.text,
    answerId:     option.id,
    answerText:   option.text
  };

  const updatedAnswers = [
    ...answers.filter(a => a.questionId !== question.id),
    newAnswer
  ];
```

`answers.filter(a => a.questionId !== question.id)` — removes any existing answer for this question (in case the user went back and re-answered). Then `newAnswer` is appended. This is how you "update" an item in a React state array — you never mutate the existing array; you create a new one.

```js
  let updatedBranches;
  if (question.id === 'Q3') {
    updatedBranches = option.triggersBranch || [];
  } else {
    updatedBranches = [...activeBranches];
    for (const b of (option.triggersBranch || [])) {
      if (!updatedBranches.includes(b)) updatedBranches.push(b);
    }
  }
```

Q3 **replaces** the branch list (because re-answering Q3 might un-select a branch). All other questions **accumulate** branches (can add but not remove).

#### `submit` with exponential backoff retry

```js
async function submit(finalAnswers, finalBranches) {
  setScreen('submitting');
  const delays = [1000, 2000, 4000];
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      await saveResponses(sessionId, finalAnswers, finalBranches);
      const rec = await getRecommendation(sessionId);
      setRecommendation(rec);
      setScreen('result');
      return;
    } catch {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, delays[attempt]));
      }
    }
  }
  setScreen('error');
}
```

`new Promise(r => setTimeout(r, delays[attempt]))` — creates a Promise that resolves after `delays[attempt]` milliseconds. `setTimeout(callback, ms)` calls `callback` after `ms` milliseconds. Here, `r` is the Promise's resolve function — calling it resolves the Promise. `await`ing this Promise causes the code to pause for that many milliseconds.

Delays: 1 second, 2 seconds, 4 seconds. Each retry waits twice as long as the previous — **exponential backoff**. This is a standard pattern for retrying network operations: if the network is recovering, giving it more time between attempts improves success rate.

#### `handleBook` — the booking handoff

```js
function handleBook() {
  notifyBooking(sessionId).catch(() => {});
```

`.catch(() => {})` — attaches an empty catch handler to the Promise returned by `notifyBooking`. If the webhook fails, this catch swallows the error silently. Without it, the rejected Promise would become an "unhandled rejection" warning in the console, and potentially an app crash. We intentionally ignore this error because Fortis downtime must not block the user.

```js
  if (window.opener) {
    window.opener.postMessage({
      type:        'FORTIS_PACKAGE_BOOKED',
      patientId,   sessionId,
      oracleCode:  recommendation?.recommendedPackage?.oracleCode,
      packageName: recommendation?.recommendedPackage?.name,
      gender:      recommendation?.recommendedPackage?.gender,
      price:       recommendation?.recommendedPackage?.price
    }, '*');
    setTimeout(() => window.close(), 150);
  }
```

`window.opener` — in a browser, if tab B was opened by tab A using `window.open(...)`, then tab B's `window.opener` is a reference to tab A's window. The myFortis spoof opens the webview with `window.open()`, so `window.opener` is the myFortis tab.

`window.opener.postMessage(data, '*')` — sends a message to the parent tab. The `'*'` means "send to any origin" (in production this should be restricted to TatvaCare's domain).

`setTimeout(() => window.close(), 150)` — waits 150 milliseconds, then closes the webview tab. The delay is necessary because `postMessage` is asynchronous — the message goes into the parent tab's event queue. If we closed immediately, the tab would close before the parent processed the message.

In a native iOS/Android webview, `window.opener` is `null` — there's no "parent tab." Production code would use the native JS bridge instead (see `issuestofixinproduction.md`).

---

### `frontend/src/screens/WelcomeScreen.jsx`

```jsx
export default function WelcomeScreen({ onStart }) {
```

**`export default function`** — defines and exports a React component. The `default` means "this is the main thing this file exports." It can be imported as any name: `import WelcomeScreen from './screens/WelcomeScreen'` or `import Foo from './screens/WelcomeScreen'`.

**`{ onStart }`** in the function parameters — destructuring props. React passes a single `props` object to every component. `{ onStart }` pulls out the `onStart` function from that object. This is equivalent to `function WelcomeScreen(props) { const onStart = props.onStart; }`.

```jsx
<button
  onClick={onStart}
  className="w-full bg-tc-green text-white font-semibold text-base py-4 rounded-2xl"
>
  Get Started →
</button>
```

**JSX** — looks like HTML inside JavaScript. It is not HTML — it is JavaScript that Vite transforms. Differences:
- `className` instead of `class` (because `class` is a reserved word in JavaScript)
- `onClick` instead of `onclick` (camelCase)
- `{onStart}` — curly braces embed a JavaScript expression

The Tailwind classes on `className`:
- `w-full` — `width: 100%`
- `bg-tc-green` — background color `#1a7a4a` (from our custom palette)
- `text-white` — white text
- `font-semibold` — `font-weight: 600`
- `py-4` — padding top and bottom of `1rem` (16px)
- `rounded-2xl` — `border-radius: 1rem` (16px)

---

### `frontend/src/screens/QuestionnaireScreen.jsx`

```jsx
export default function QuestionnaireScreen({
  question, questionNumber, totalQuestions, selectedAnswerId, onAnswer, onBack
}) {
  if (!question) return null;
```

`if (!question) return null` — React components can return `null` to render nothing. This guard prevents crashes if the parent passes an undefined `question` during a transition.

```jsx
const progress = questionNumber / totalQuestions;

<div
  className="h-full bg-tc-green rounded-full transition-all duration-300"
  style={{ width: `${progress * 100}%` }}
/>
```

`style={{ width: ... }}` — the outer `{}` is JSX (embedding a JavaScript expression). The inner `{}` is a JavaScript object (the style object). So this passes an object with a `width` property to React's `style` prop.

Why `style` instead of a Tailwind class? Tailwind generates CSS classes statically at build time. It can't generate `w-[73%]` for every possible progress value. Dynamic values like this must use inline styles.

```jsx
{question.branch && (
  <span>
    {question.branch === 'BRANCH_A' ? 'Diabetes — follow-up' : 'Heart — follow-up'}
  </span>
)}
```

`condition && element` — **conditional rendering** in JSX. If `question.branch` is truthy (not null), render the `<span>`. If it's null, don't render anything. The `&&` short-circuits: if the left side is falsy, JavaScript never evaluates the right side.

The ternary inside maps internal codes to readable labels.

---

### `frontend/src/screens/LoadingScreen.jsx`

```jsx
<div className="w-14 h-14 rounded-full border-4 border-tc-green-bg border-t-tc-green animate-spin mb-6" />
```

This is a pure CSS spinner. `rounded-full` makes it a circle. `border-4` gives it a border. `border-tc-green-bg` colours three sides of the border a light green. `border-t-tc-green` overrides just the top border with a darker green. `animate-spin` from Tailwind applies a CSS keyframe animation that rotates it 360°. The visual result is a loading ring with one bright segment spinning around.

The component is reused for three different loading states — which is why it takes a `message` prop instead of hardcoding text.

---

### `frontend/src/screens/ResultScreen.jsx`

```js
const PACKAGE_META = {
  'Basic Health Package':  { icon: '🌱', color: 'bg-emerald-50 text-emerald-700', tagline: '...' },
  'Silver Health Package': { icon: '⭐', color: 'bg-sky-50 text-sky-700',         tagline: '...' },
  ...
};
```

A **lookup table** — a plain JavaScript object used like a dictionary. Instead of writing `if (name === 'Basic') { icon = '...' } else if (name === 'Silver') { ... }`, we store the data in a structured object and look it up: `PACKAGE_META[name]`. Cleaner and easier to extend.

```jsx
const scores = Object.entries(finalScores)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5);
const maxScore = scores[0]?.[1] || 1;
```

`scores[0]?.[1]` — optional chaining on an array index. `scores[0]` might be undefined if `scores` is empty. `?.` makes `[1]` safe.

The score bars:
```jsx
<div style={{ width: `${(score / maxScore) * 100}%` }} />
```

The winner has `score === maxScore`, so its bar fills `100%`. Others are proportionally shorter. This normalisation ensures the winning bar always reaches full width regardless of absolute score values.

---

### `frontend/src/screens/ExplainScreen.jsx`

```js
function parseExplanation(text) {
  if (!text) return [];

  const sections = [];
  const lines    = text.split('\n');
  let current    = null;

  for (const line of lines) {
    const headingMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
```

`text.split('\n')` — splits a multi-line string into an array of lines. The LLM response is one long string; we split it on newlines to process line by line.

`line.match(regex)` — tests if the line matches a regular expression (regex). The regex `/^\*\*(.+?)\*\*\s*$/`:
- `^` — start of line
- `\*\*` — two literal asterisks (the `\` escapes the `*` which has special meaning in regex)
- `(.+?)` — capture group: one or more characters, non-greedy
- `\*\*` — two more literal asterisks
- `\s*$` — optional whitespace at end of line

This matches a line that looks like `**Some Heading**` — the Markdown bold heading format the LLM is instructed to use.

```js
    if (headingMatch) {
      if (current) sections.push(current);
      current = { heading: headingMatch[1], body: '' };
    } else if (line.trim()) {
      if (!current) current = { heading: null, body: '' };
      current.body += (current.body ? ' ' : '') + line.trim();
    }
```

When a heading is found, we save the previous section (if any) and start a new one. `headingMatch[1]` is the first capture group — the text inside the `**...**`.

For non-heading lines with content: concatenate to `current.body`. `(current.body ? ' ' : '')` means "put a space before if there's already body text, otherwise don't." This collapses multi-line paragraphs into single strings.

---

### `frontend/src/screens/ErrorScreen.jsx`

```jsx
export default function ErrorScreen({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh ...">
      ...
      <button onClick={onRetry} className="...">Try Again</button>
    </div>
  );
}
```

`onRetry` in `App.jsx`:
```js
function handleRetry() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}
```

`window.location.reload()` — refreshes the page. Since we cleared localStorage first, and since page refresh preserves `sessionStorage`, the `loadStorage()` function will find the flag but empty localStorage — which means... the flag exists (so we don't wipe it again), but there's nothing in localStorage, so we proceed to path 3 (fresh session). The user gets a clean restart.

---

## Part 3: Demo Artifact

### `myfortis-spoof/index.html`

This is a single HTML file that simulates the myFortis app. It is not part of the TatvaCare product — it exists only so you can demo the full flow in a browser without a real myFortis app.

Key parts:

```js
function openWebview() {
  go('packages');   // navigate myFortis to the packages screen first
  window.open('http://localhost:3000?pid=FORTIS_SID_001', '_blank', 'width=430,...');
}
```

`window.open(url, target, features)` — opens a new browser tab/window.
- `'_blank'` — open in a new tab
- `'width=430,...'` — size it like a phone

`go('packages')` is called **before** `window.open`. This pins the myFortis spoof to the packages screen. When the webview closes and the focus returns to this tab, the user sees the packages screen (not whatever screen they were on before).

```js
window.addEventListener('message', function(event) {
  if (event.data?.type !== 'FORTIS_PACKAGE_BOOKED') return;
  document.getElementById('bc-pkg').textContent  = event.data.packageName;
  document.getElementById('bc-meta').textContent =
    `${event.data.patientId} · ${event.data.oracleCode} · ₹${event.data.price}`;
  document.getElementById('booking-confirm').style.display = 'flex';
});
```

`window.addEventListener('message', handler)` — registers a function to run every time this tab receives a `postMessage` from another window. The `event.data` is whatever object was passed to `postMessage`.

`event.data?.type !== 'FORTIS_PACKAGE_BOOKED'` — guard: only handle the specific message type we care about, ignore any others (browsers can receive `message` events from other sources).

`document.getElementById('booking-confirm').style.display = 'flex'` — direct DOM manipulation to show the booking confirmation banner (which is hidden by default with `display: none`).

---

## Part 4: The End-to-End Flow in One Diagram

```
User opens webview (from myFortis spoof)
  │
  ├─► GET /api/questions ─────────────────► backend/routes/questions.js
  │                                          └─ returns questions.json
  │
  ├─► POST /api/session/init ─────────────► backend/routes/session.js
  │                                          └─ creates Session doc in MongoDB
  │                                          └─ returns { sessionId, createdAt }
  │
  ▼
User answers questions (stored in localStorage as they go)
  │
  ▼
POST /api/responses/save ───────────────► backend/routes/responses.js
  │                                        └─ creates Response doc in MongoDB
  │
POST /api/recommend ────────────────────► backend/routes/recommend.js
  │                                        └─ calls scoringEngine.computeRecommendation()
  │                                        └─ creates Recommendation doc in MongoDB
  │                                        └─ returns { recommendedPackage, finalScores }
  │
  ▼
User sees ResultScreen
  │
  ├─► (optional) GET /api/recommend/explain/:sessionId
  │                                        └─ calls llmService.generateExplanation()
  │                                        └─ caches result in Recommendation doc
  │
  └─► "Book This Package"
        ├─► POST /api/booking/notify ─────► backend/routes/booking.js
        │                                   └─ assembles payload from MongoDB
        │                                   └─ POSTs to Fortis webhook (fire-and-forget)
        │
        └─► window.opener.postMessage() ──► myFortis tab receives booking details
              └─ setTimeout 150ms
              └─ window.close()
```

---

## Reading Order for a Learner

If this is your first time reading this codebase, work through the files in this order. Each step builds on the previous one.

1. `backend/data/questions.json` — understand the data model (what a question looks like)
2. `backend/data/scoringLogic.json` — understand how answers become points
3. `backend/data/AHClisting.json` — understand the package data
4. `backend/models/Session.js`, `Response.js`, `Recommendation.js` — understand what MongoDB stores
5. `backend/routes/session.js` — the simplest route (create a session)
6. `backend/routes/questions.js` — the simplest GET route
7. `backend/services/scoringEngine.js` — the scoring algorithm
8. `backend/routes/recommend.js` — how the scoring result becomes an API response
9. `backend/services/WhyThisTestPrompt.md` — the AI's instructions (no code)
10. `backend/services/WhyThisTestPrompt.js` + `llmService.js` — how the AI call works
11. `backend/routes/booking.js` — the Fortis handoff
12. `frontend/src/api/client.js` — how the frontend calls the backend
13. `frontend/src/App.jsx` — the frontend state machine (read this last — it references all the above)
14. Individual screen files — straightforward once you understand App.jsx
