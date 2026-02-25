# Developer Guide

## Service Port Map

| Service | Port | Tech | Database |
|---------|------|------|----------|
| API Gateway | 3000 | Express + http-proxy-middleware | — |
| Auth Service | 3001 | Express + Mongoose | MongoDB (27017) |
| Chat Service | 3002 | Express + Socket.IO | — |
| User Data Service | 3003 | Express + Multer | File system |
| Transaction Service | 3004 | Express + csv-writer | CSV files |
| Compliance Service | 3005 | Express | — |
| Notification Service | 3006 | Express | — |
| LLM Service | 5000 | Express + Gemini/OpenAI SDK | — |
| RAG Processor | 8081 | Python http.server + numpy | In-memory vectors |
| Frontend | 8080 | React + Vite | — |
| MongoDB | 27017 | mongo:6.0 | — |
| PostgreSQL | 5432 | postgres:15-alpine | — |
| Kafka | 9092 | confluentinc/cp-kafka:7.4.0 | — |
| Zookeeper | 2181 | zookeeper:latest | — |

## Environment Variables

All services read from the root `.env` file. Key variables:

```env
# Required
GEMINI_API_KEY=...          # For AI chat (Gemini)
LLM_PROVIDER=gemini         # gemini | openai

# Auto-configured in Docker
JWT_SECRET=...              # Auth token signing
MONGODB_URI=mongodb://mongo:27017/auth_db
PATHWAY_URL=http://pathway-processor:8081
DATA_DIR=/app/data/user-uploads
KAFKA_BOOTSTRAP_SERVERS=kafka:9092

# Optional
OPENAI_API_KEY=...          # If using OpenAI provider
```

## API Gateway Routes

All frontend requests go through the gateway at `http://localhost:3000`:

| Route Pattern | Proxied To | Service |
|--------------|------------|---------|
| `/api/auth/*` | `http://auth-service:3001` | Auth |
| `/api/chat/*` | `http://llm-service:5000` | LLM |
| `/api/user-data/*` | `http://user-data-service:3003` | User Data |
| `/api/transactions/*` | `http://transaction-service:3004` | Transactions |
| `/api/compliance/*` | `http://compliance-service:3005` | Compliance |
| `/api/notifications/*` | `http://notification-service:3006` | Notifications |

## Adding a New Service

1. Create folder: `services/my-service/`
2. Add `src/app.js`, `package.json`, `Dockerfile`
3. Add to `docker-compose.yml` with port, env, and network
4. Add proxy route in `services/api-gateway/src/app.js`

## Key Design Decisions

- **CSV over Kafka**: Transaction service writes to CSV files instead of Kafka for simplicity. The RAG processor watches the same directory and auto-indexes new data.
- **No separate vector DB**: The RAG processor uses in-memory numpy vectors instead of Pinecone/Weaviate. Embeddings are recomputed on startup.
- **Gemini default**: LLM defaults to Gemini (free tier available) with OpenAI as fallback.
- **Gateway pattern**: All API calls go through a single gateway (port 3000) which proxies to individual services.

## Useful Commands

```bash
# Start everything
docker-compose up --build -d

# Rebuild one service
docker-compose up --build -d pathway-processor

# View logs
docker-compose logs -f llm-service

# Restart a service
docker-compose restart llm-service

# Stop everything
docker-compose down

# Clean rebuild (removes volumes)
docker-compose down -v && docker-compose up --build -d
```
