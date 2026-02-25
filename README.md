# 💰 AI Finance Assistant

A **microservices-based personal finance assistant** powered by RAG (Retrieval-Augmented Generation). Upload your financial documents, ask questions in natural language, and get AI-powered insights grounded in your real data — all running locally with Docker.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat** | Ask financial questions and receive context-aware answers powered by Google Gemini |
| 📄 **RAG Pipeline** | Auto-indexes uploaded documents every 5 seconds for retrieval-augmented responses |
| 💳 **Transaction Tracking** | Submit transactions that are written to CSV and auto-indexed for AI queries |
| 📁 **Document Vault** | Upload bank statements, budgets, portfolios (.txt, .csv) for personalized advice |
| 🔒 **PII Compliance** | Built-in regex masking of SSNs, emails, phone numbers, and credit cards |
| 💬 **Real-time Chat** | WebSocket-based messaging via Socket.IO |
| 🔐 **JWT Authentication** | Secure registration and login with bcrypt password hashing |

---

## 🏗️ Architecture

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

### Services (14 containers)

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| **Frontend** | React + Vite | 8080 | SPA with Dashboard, Chat, Accounts, Auth pages |
| **API Gateway** | Express | 3000 | Reverse proxy — routes all `/api/*` calls |
| **Auth Service** | Express + MongoDB | 3001 | JWT-based registration & login |
| **Chat Service** | Socket.IO | 3002 | WebSocket real-time chat relay |
| **User Data Service** | Express + Multer | 3003 | File uploads to shared volume |
| **Transaction Service** | Express + csv-writer | 3004 | Transaction ingestion → CSV |
| **Compliance Service** | Express | 3005 | PII regex masking |
| **Notification Service** | Express | 3006 | Alert logging |
| **LLM Service** | Express | 5000 | Gemini/OpenAI chat with RAG context |
| **RAG Processor** | Python (HTTP server) | 8081 | File watcher + vector/keyword search |
| **MongoDB** | mongo:6.0 | 27017 | Auth database |
| **PostgreSQL** | postgres:15-alpine | — | Relational data store |
| **Zookeeper** | zookeeper:latest | 2181 | Kafka coordination |
| **Kafka** | Confluent CP 7.4 | 9092 | Message broker (optional, CSV fallback active) |

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Configure API Key

```powershell
# Open .env and set your Gemini API key
# Get one free at https://aistudio.google.com/apikey
notepad ".env"
```

Set this line in `.env`:
```env
GEMINI_API_KEY=your_actual_key_here
```

### 2. Start Everything

```powershell
cd "d:\Green\New folder\ai_clude\finance-assistant"
.\start.bat
```

This builds and starts all containers, then **prints the UI link** in your terminal when ready.

> ⏱️ First build takes ~5 minutes (downloading images). After that ~30 seconds.

<details>
<summary>Alternative: manual docker-compose</summary>

```powershell
docker-compose up --build -d
docker-compose ps
```
</details>

### 3. Open the App

| URL | What It Is |
|-----|------------|
| **http://localhost:8080** | Frontend — Register → Login → Dashboard → Chat |
| http://localhost:3000/health | API Gateway health check |
| http://localhost:8081/health | RAG Processor stats (documents indexed) |

### 4. Use It

1. **Register** a new account at `/register`
2. **Login** → you land on the Dashboard
3. **Chat** → ask financial questions like *"What's in my portfolio?"*
4. **Accounts** → upload `.txt` or `.csv` documents for personalized RAG
5. Drop files directly into `data/user-uploads/` — indexed automatically in ~5 seconds

---

## 📁 Project Structure

```text
finance-assistant/
├── .env
├── .env.example
├── .gitignore
├── README.md
├── data
│   ├── alerts_status.csv
│   ├── bank-streams
│   ├── debug_transactions.csv
│   ├── knowledge-base
│   │   ├── README.md
│   │   └── documents
│   │       ├── aml_policies.md
│   │       ├── compliance_rules.pdf
│   │       └── faq.json
│   ├── simulated-streams
│   │   └── transactions.json
│   └── user-uploads
│       ├── Harsh
│       │   ├── bank statements.txt
│       │   ├── transactions.txt
│       │   └── financial_goals.txt
│       └── chandu
│           └── index.txt
├── docker-compose.yml
├── docs
│   ├── ARCHITECTURE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── GEMINI_MIGRATION.md
│   ├── HOW_TO_RUN.md
│   ├── STARTUP_GUIDE.md
│   ├── TODO.md
│   ├── WSL_MIGRATION_GUIDE.md
│   ├── data-flow.md
│   ├── pathway-design.md
│   └── user_journey.md
├── frontend
│   └── web
│       ├── Dockerfile
│       ├── index.html
│       ├── package-lock.json
│       ├── package.json
│       ├── src
│       │   ├── App.css
│       │   ├── App.jsx
│       │   ├── Auth.css
│       │   ├── components
│       │   │   ├── ProtectedRoute.jsx
│       │   │   ├── Sidebar.css
│       │   │   └── Sidebar.jsx
│       │   ├── hooks
│       │   ├── index.css
│       │   ├── main.jsx
│       │   ├── pages
│       │   │   ├── Accounts.jsx
│       │   │   ├── ChatPage.css
│       │   │   ├── ChatPage.jsx
│       │   │   ├── Dashboard.css
│       │   │   ├── Dashboard.jsx
│       │   │   ├── Login.jsx
│       │   │   ├── Register.jsx
│       │   │   ├── Settings.css
│       │   │   └── Settings.jsx
│       │   ├── services
│       │   │   ├── api.js
│       │   │   └── auth.service.js
│       │   └── store
│       │       └── AuthContext.jsx
│       └── vite.config.js
├── infrastructure
├── package-lock.json
├── package.json
├── sample_bank_statement.csv
├── scripts
│   ├── deployment
│   ├── maintenance
│   ├── setup
│   │   └── produce_transactions.py
│   ├── setup-wsl.sh
│   └── test-rag-flow.js
├── services
│   ├── api-gateway
│   │   ├── .env
│   │   ├── Dockerfile
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── src
│   │       ├── app.js
│   │       ├── middleware
│   │       └── routes
│   ├── auth-service
│   │   ├── .env
│   │   ├── Dockerfile
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── src
│   │       ├── app.js
│   │       ├── controllers
│   │       │   └── authController.js
│   │       ├── middleware
│   │       │   └── authMiddleware.js
│   │       ├── models
│   │       │   └── User.js
│   │       ├── routes
│   │       │   └── authRoutes.js
│   │       └── services
│   ├── chat-service
│   │   ├── Dockerfile
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── src
│   │       └── app.js
│   ├── compliance-service
│   │   ├── Dockerfile
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── src
│   │       ├── app.js
│   │       ├── middleware
│   │       │   └── piiMasker.js
│   │       ├── rules
│   │       └── services
│   ├── llm-service
│   │   ├── .env
│   │   ├── Dockerfile
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── src
│   │       ├── app.js
│   │       ├── controllers
│   │       ├── prompts
│   │       ├── routes
│   │       │   └── chatRoutes.js
│   │       └── services
│   │           ├── geminiService.js
│   │           ├── llmClient.js
│   │           ├── pathwayService.js
│   │           └── promptBuilder.js
│   ├── notification-service
│   │   ├── Dockerfile
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── src
│   │       ├── app.js
│   │       └── services
│   ├── pathway-processor
│   │   ├── Dockerfile
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── transaction-service
│   │   ├── .env
│   │   ├── Dockerfile
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── src
│   │       ├── app.js
│   │       ├── controllers
│   │       ├── routes
│   │       │   └── transactionRoutes.js
│   │       └── services
│   │           └── kafkaProducer.js
│   └── user-data-service
│       ├── .env
│       ├── Dockerfile
│       ├── package-lock.json
│       ├── package.json
│       └── src
│           ├── app.js
│           └── models
│               └── Document.js
├── start.bat
└── test_upload_document.txt
```

---

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `start.bat` | One-click startup — prints UI link when ready |
| `.env` | API keys, LLM provider, JWT secret |
| `docker-compose.yml` | All 14 service definitions and networking |
| `data/user-uploads/` | Drop `.txt` / `.csv` files here for AI to learn from |
| `services/llm-service/src/services/geminiService.js` | Gemini model config (`gemini-2.5-flash`) |
| `services/llm-service/src/services/llmClient.js` | LLM provider routing (Gemini vs OpenAI) |
| `services/pathway-processor/main.py` | RAG engine — file watcher, embedder, search |
| `services/api-gateway/src/app.js` | All API proxy route mappings |

---

## 🧪 Testing

```powershell
# End-to-end RAG flow test
node scripts/test-rag-flow.js

# Health checks (PowerShell)
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing | Select-Object -ExpandProperty Content
Invoke-WebRequest -Uri http://localhost:8081/health -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## 🛑 Stop the Project

```powershell
cd "d:\Green\New folder\ai_clude\finance-assistant"

# Stop all (keeps data)
docker-compose down

# Stop and wipe all database volumes (fresh start)
docker-compose down -v
```

---

## �️ Common Operations

```powershell
# Restart a single service (after code changes)
docker-compose up --build -d llm-service

# View logs for a service
docker-compose logs --tail=30 llm-service

# Live-stream logs (Ctrl+C to stop)
docker-compose logs -f llm-service

# Clean rebuild everything
docker-compose down -v && docker-compose up --build -d
```

---

## 📖 More Documentation

| Document | Content |
|----------|---------|
| [HOW_TO_RUN.md](./docs/HOW_TO_RUN.md) | Every command you need — start, stop, debug, manage |
| [DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) | Ports, env vars, service internals |
| [STARTUP_GUIDE.md](./docs/STARTUP_GUIDE.md) | Step-by-step first-time setup |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Data flow & function-level trace for all user actions |
| [TODO.md](./docs/TODO.md) | Roadmap & planned features |
| [WSL_MIGRATION_GUIDE.md](./docs/WSL_MIGRATION_GUIDE.md) | Running the project in WSL/Linux |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Axios, Socket.IO Client |
| Backend Services | Node.js 18, Express |
| AI / LLM | Google Gemini (`gemini-2.5-flash`), OpenAI (optional) |
| RAG Engine | Python, NumPy, OpenAI Embeddings (optional keyword fallback) |
| Auth | JWT, bcryptjs, MongoDB |
| Databases | MongoDB 6.0, PostgreSQL 15 |
| Messaging | Apache Kafka, Zookeeper |
| Infrastructure | Docker, Docker Compose |
