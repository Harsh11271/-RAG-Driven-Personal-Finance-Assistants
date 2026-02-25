# Architecture & Data Flow

This document explains **exactly how data flows** through the Finance Assistant system for every user action, tracing through files and functions.

---

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  API Gateway │────▶│  Backend Services │
│  React/Vite  │     │  (port 3000) │     │                  │
│  (port 8080) │◀────│  Express     │◀────│  Auth, LLM, etc  │
└──────────────┘     └──────────────┘     └──────────────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  RAG Processor   │
                                          │  (port 8081)     │
                                          │  Python + numpy  │
                                          └────────▲────────┘
                                                   │
                                          ┌────────┴────────┐
                                          │  data/           │
                                          │  user-uploads/   │
                                          │  (shared volume) │
                                          └─────────────────┘
```

---

## Flow 1: User Registration & Login

### What happens when a user clicks "Register"

```
Frontend (Register.jsx)
  └─▶ api.post('/auth/register', { username, email, password })
        │
        │  File: frontend/web/src/services/api.js
        │  The Axios instance adds Content-Type header
        │  Base URL: http://localhost:3000/api
        │
        ▼
API Gateway (port 3000)
  └─▶ app.use('/api/auth', createProxyMiddleware({ target: auth-service:3001 }))
        │
        │  File: services/api-gateway/src/app.js (line ~29)
        │  Proxies the request unchanged to auth-service
        │
        ▼
Auth Service (port 3001)
  └─▶ POST /api/auth/register
        │
        │  File: services/auth-service/src/routes/authRoutes.js
        │  Routes to: authController.register
        │
        ▼
authController.register()
  │  File: services/auth-service/src/controllers/authController.js (line 13)
  │
  │  1. Validates { username, email, password }
  │  2. Checks if user exists: User.findOne({ email })
  │  3. Creates user: User.create({ username, email, password })
  │     └─▶ Password is hashed via bcryptjs pre-save hook
  │         File: services/auth-service/src/models/User.js
  │  4. Generates JWT: jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' })
  │  5. Returns: { _id, username, email, token }
        │
        ▼
Frontend receives response
  │  File: frontend/web/src/pages/Register.jsx
  │  Stores token in localStorage
  │  Redirects to /dashboard
```

### Login flow is identical, except:
- Uses `POST /api/auth/login`
- Calls `authController.login()` which uses `User.findOne({ email })` + `user.comparePassword(password)`

---

## Flow 2: AI Chat (The Main Feature)

### What happens when a user sends a message in the chat

```
Frontend (ChatPage.jsx)
  └─▶ Step 1: socket.emit('send_message', messageData)
  │     │  File: frontend/web/src/pages/ChatPage.jsx (line 35)
  │     │  Sends to Socket.IO server at localhost:3002
  │     │  This is for real-time chat history (peer messaging)
  │     │
  │     ▼
  │   Chat Service (port 3002)
  │     │  File: services/chat-service/src/app.js (line 31)
  │     │  socket.on('send_message') → echoes back to sender
  │     │  (Currently a simple echo — no persistence)
  │
  └─▶ Step 2: api.post('/chat/message', { message, history })
        │
        │  File: frontend/web/src/pages/ChatPage.jsx (line 45)
        │  Uses the Axios api instance → http://localhost:3000/api/chat/message
        │
        ▼
API Gateway (port 3000)
  └─▶ app.use('/api/chat', createProxyMiddleware({ target: llm-service:5000 }))
        │
        │  File: services/api-gateway/src/app.js (line ~40)
        │
        ▼
LLM Service (port 5000)
  └─▶ POST /api/chat/message
        │
        │  File: services/llm-service/src/routes/chatRoutes.js (line 6)
        │
        ▼
  chatRoutes handler:
  │
  │  ┌─── Step A: Get RAG Context ───────────────────────────────┐
  │  │                                                            │
  │  │  const context = await pathwayService.query(message)       │
  │  │                                                            │
  │  │  File: services/llm-service/src/services/pathwayService.js │
  │  │                                                            │
  │  │  1. Sends POST to http://pathway-processor:8081/v1/retrieve│
  │  │     Body: { query: "user's message", k: 3 }               │
  │  │                                                            │
  │  │         ▼                                                  │
  │  │  RAG Processor (port 8081)                                 │
  │  │  File: services/pathway-processor/main.py                  │
  │  │                                                            │
  │  │  class RAGHandler.do_POST():                               │
  │  │    1. Parses { query, k } from request body                │
  │  │    2. Calls embed_and_search(query, k)                     │
  │  │       - If OpenAI key set → uses OpenAI embeddings         │
  │  │         (text-embedding-3-small model)                     │
  │  │       - If no key → uses simple_keyword_search()           │
  │  │         (bag-of-words overlap scoring)                     │
  │  │    3. Returns top-k matching text chunks as JSON array     │
  │  │                                                            │
  │  │  How documents get there:                                  │
  │  │    background_watcher() → scan_directory() → index_file()  │
  │  │    - Reads files from /app/data/user-uploads/              │
  │  │    - chunk_text() splits into ~1000 char paragraphs        │
  │  │    - Embeds each chunk (OpenAI or skip)                    │
  │  │    - Stores in-memory: documents[] array                   │
  │  │                                                            │
  │  │  2. pathwayService parses response                         │
  │  │     Returns joined text of top matches as string           │
  │  │     Falls back to "context unavailable" on error           │
  │  └────────────────────────────────────────────────────────────┘
  │
  │  ┌─── Step B: Generate AI Answer ────────────────────────────┐
  │  │                                                            │
  │  │  const answer = await llmClient.generateAnswer(            │
  │  │      message, context, history                             │
  │  │  )                                                         │
  │  │                                                            │
  │  │  File: services/llm-service/src/services/llmClient.js     │
  │  │                                                            │
  │  │  1. Checks LLM_PROVIDER env var                            │
  │  │     - If "gemini" → calls geminiService.generateAnswer()  │
  │  │     - If "openai" → calls openaiService.generateAnswer()  │
  │  │                                                            │
  │  │  ┌─ geminiService.generateAnswer() ──────────────────┐    │
  │  │  │  File: services/llm-service/src/services/          │    │
  │  │  │        geminiService.js (line 13)                   │    │
  │  │  │                                                     │    │
  │  │  │  1. Gets Gemini client via GoogleGenerativeAI SDK   │    │
  │  │  │  2. Uses model: "gemini-2.5-flash"                  │    │
  │  │  │  3. Builds prompt:                                  │    │
  │  │  │     "You are a helpful financial assistant...        │    │
  │  │  │      Context from user documents: {context}         │    │
  │  │  │      User Question: {query}"                        │    │
  │  │  │  4. Calls model.generateContent(prompt)             │    │
  │  │  │  5. Returns response.text()                         │    │
  │  │  └─────────────────────────────────────────────────────┘    │
  │  └────────────────────────────────────────────────────────────┘
  │
  │  Returns: { answer: "AI response text", context: "RAG chunks" }
        │
        ▼
Frontend receives response
  │  File: frontend/web/src/pages/ChatPage.jsx (line 53)
  │  Creates AI message object, appends to messageList state
  │  Renders in the chat UI
```

---

## Flow 3: Transaction Submission

### What happens when a transaction is submitted

```
Test Script or Frontend
  └─▶ POST http://localhost:3004/api/transactions
        Body: { amount: 150, merchant: "Apple Store", category: "Electronics" }
        │
        ▼
Transaction Service (port 3004)
  └─▶ File: services/transaction-service/src/routes/transactionRoutes.js (line 8)
        │
        │  router.post('/')
        │  1. Validates: amount and merchant required
        │  2. Creates transaction object:
        │     {
        │       transaction_id: "txn_12345" (random),
        │       amount: 150,
        │       category: "Electronics",
        │       description: "Apple Store",
        │       timestamp: "2024-02-24T..."
        │     }
        │  3. Calls sendTransaction(transaction)
        │
        ▼
  sendTransaction()
  │  File: services/transaction-service/src/services/kafkaProducer.js (line 36)
  │  (Despite the filename, this writes to CSV, not Kafka)
  │
  │  1. csvWriter.writeRecords([transaction])
  │     Appends one row to: /app/data/user-uploads/inbound_transactions.csv
  │
  │  2. This CSV lives on a shared Docker volume:
  │     ./data/user-uploads/ ←→ /app/data/user-uploads/
  │
        ▼
RAG Processor auto-indexes it
  │  File: services/pathway-processor/main.py
  │  background_watcher() runs every 5 seconds
  │  scan_directory() finds the updated CSV
  │  index_file() re-indexes it
  │
  │  Now when you ask "What did I spend at Apple Store?",
  │  the RAG context will include this transaction data.
```

---

## Flow 4: Document Upload

### What happens when a user uploads a document

```
Frontend (Accounts.jsx)
  └─▶ api.post('/user-data/upload', formData)
        │
        │  File: frontend/web/src/pages/Accounts.jsx (line 32)
        │  Uses Axios with multipart/form-data header
        │
        ▼
API Gateway → proxies to User Data Service (port 3003)
        │
        ▼
User Data Service
  └─▶ POST /api/user-data/upload
        │
        │  File: services/user-data-service/src/app.js (line 43)
        │  Uses multer middleware: upload.single('file')
        │
        │  1. Multer saves file to UPLOAD_DIR (/app/data/user-uploads/)
        │     Filename: "{userId}_{timestamp}_{originalname}"
        │  2. Returns: { message, filename, userId }
        │
        ▼
RAG Processor auto-indexes it
  │  File: services/pathway-processor/main.py
  │  background_watcher() → scan_directory() → index_file()
  │  Reads the new file, chunks it, embeds it
  │  Now available for RAG queries in chat
```

---

## Flow 5: PII Compliance Check

```
Any Service
  └─▶ POST http://compliance-service:3005/api/compliance/mask
        Body: { text: "My SSN is 123-45-6789 and email is john@gmail.com" }
        │
        ▼
Compliance Service (port 3005)
  │  File: services/compliance-service/src/app.js (line 16)
  │  Calls maskPII(text)
  │
  │  File: services/compliance-service/src/middleware/piiMasker.js
  │  Uses regex patterns to replace:
  │    - Email addresses → [EMAIL REDACTED]
  │    - SSN patterns → [SSN REDACTED]
  │    - Phone numbers → [PHONE REDACTED]
  │    - Credit card numbers → [CC REDACTED]
  │
  │  Returns: { original: "...", masked: "My SSN is [SSN REDACTED]..." }
```

---

## Flow 6: Dynamic Dashboard Data Retrieval

### What happens when the Dashboard loads

```
Frontend (Dashboard.jsx)
  └─▶ api.post('/chat/dashboard-data', { userId, forceRefresh })
        │
        │  File: frontend/web/src/pages/Dashboard.jsx
        │
        ▼
API Gateway → proxies to LLM Service (port 5000)
        │
        ▼
LLM Service
  └─▶ POST /api/chat/dashboard-data
        │
        │  File: services/llm-service/src/routes/chatRoutes.js
        │
        │  1. Check Cache: Returns instantly if cached data exists (TTL 15m).
        │  2. Parallel RAG Queries: Promise.all() asks Pathway for broad topics:
        │     - "bank statement transactions spending budget savings..."
        │     - "monthly budget financial plan income expenses..."
        │  3. RAG Processor (port 8081) returns up to 16 document chunks.
        │  4. Deduplicates chunks based on text content.
        │  5. Builds enormous JSON prompt asking AI to extract exact metrics:
        │     totalSpend, goals, categories, etc.
        │  6. Calls Google Gemini (gemini-2.5-flash) to generate the JSON.
        │  7. Parses AI response, caches it, and returns to frontend.
        │
        ▼
Frontend receives response
  │  Renders UI instantly based on structured JSON from AI.
```

---

## Shared Data Volume

The key architectural pattern: **multiple services share the same directory**

```
     Docker Volume: ./data/user-uploads/ ←→ /app/data/user-uploads/
     ┌─────────────────────────────────────────────────────────┐
     │                                                         │
     │  ┌─────────────────┐  WRITES   ┌─────────────────────┐ │
     │  │ Transaction Svc │ ────────▶ │ inbound_transactions│ │
     │  │ (csv-writer)    │           │ .csv                │ │
     │  └─────────────────┘           └─────────────────────┘ │
     │                                                         │
     │  ┌─────────────────┐  WRITES   ┌─────────────────────┐ │
     │  │ User Data Svc   │ ────────▶ │ user_123_statement  │ │
     │  │ (multer upload) │           │ .pdf / .txt         │ │
     │  └─────────────────┘           └─────────────────────┘ │
     │                                                         │
     │  ┌─────────────────┐  READS    ┌─────────────────────┐ │
     │  │ RAG Processor   │ ◀──────── │ ALL files in dir    │ │
     │  │ (every 5 sec)   │           │ .txt, .csv, .md     │ │
     │  └─────────────────┘           └─────────────────────┘ │
     │                                                         │
     └─────────────────────────────────────────────────────────┘
```

---

## Complete Function Reference

### RAG Processor (main.py)

| Function | Purpose |
|----------|---------|
| `get_embedder()` | Lazy-loads OpenAI embedder or returns None for keyword fallback |
| `simple_keyword_search(query, k)` | Bag-of-words overlap search (no API needed) |
| `embed_and_search(query, k)` | Cosine similarity search using numpy vectors |
| `chunk_text(text, max_chars)` | Splits text into ~1000 char paragraphs |
| `index_file(filepath)` | Reads, chunks, embeds, stores one file |
| `scan_directory()` | Iterates all files in DATA_DIR |
| `background_watcher()` | Runs scan_directory() in a loop every 5s |
| `RAGHandler.do_POST()` | Handles /v1/retrieve requests |
| `RAGHandler.do_GET()` | Handles /health and /v1/statistics |

### LLM Service

| File | Function | Purpose |
|------|----------|---------|
| `chatRoutes.js` | `router.post('/message')` | Entry point for chat API |
| `pathwayService.js` | `query(text)` | Fetches RAG context from processor |
| `llmClient.js` | `generateAnswer(query, ctx, history)` | Routes to Gemini or OpenAI |
| `geminiService.js` | `generateAnswer(query, ctx, history)` | Calls Google Gemini API |
| `openaiService.js` | `generateAnswer(query, ctx, history)` | Calls OpenAI ChatGPT API |
| `promptBuilder.js` | `buildFinancialPrompt(ctx, userData)` | Constructs system prompt |

### Auth Service

| File | Function | Purpose |
|------|----------|---------|
| `authRoutes.js` | `router.post('/register')` | Registration endpoint |
| `authRoutes.js` | `router.post('/login')` | Login endpoint |
| `authController.js` | `register(req, res)` | Creates user + JWT |
| `authController.js` | `login(req, res)` | Validates creds + JWT |
| `User.js` | `pre('save')` hook | Bcrypt password hashing |
| `User.js` | `comparePassword(pwd)` | Bcrypt password comparison |

### Frontend

| File | Purpose |
|------|---------|
| `App.jsx` | Router: Login, Register, Dashboard, Chat, Accounts |
| `ChatPage.jsx` | AI chat UI + Socket.IO + LLM API calls |
| `Dashboard.jsx` | Dynamic AI-generated financial overview via RAG and Gemini |
| `Accounts.jsx` | Document upload + AI personalization |
| `Login.jsx` / `Register.jsx` | Auth forms |
| `api.js` | Axios instance with auth token interceptor |
| `auth.service.js` | Login/register/logout helpers |
| `AuthContext.jsx` | React context for auth state |
| `Sidebar.jsx` | Navigation sidebar |
| `ProtectedRoute.jsx` | Auth guard for private routes |
