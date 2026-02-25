# Startup Guide

## Prerequisites

- **Docker Desktop** — [Download here](https://www.docker.com/products/docker-desktop/)
- **A Gemini API Key** — [Get one free](https://aistudio.google.com/apikey)

## Step 1: Configure API Keys

Open `.env` in the project root and set your API key:

```env
GEMINI_API_KEY=your_actual_gemini_key_here
```

> You can also set `OPENAI_API_KEY` if you prefer OpenAI. Change `LLM_PROVIDER=openai` in that case.

## Step 2: Start All Services

```bash
cd finance-assistant
docker-compose up --build -d
```

**First run** takes ~5 minutes (downloads images + installs dependencies).
**Subsequent runs** use cached layers and start in ~30 seconds.

## Step 3: Verify Services

```bash
docker-compose ps
```

You should see **13 containers** all with status `running`:

```
api-gateway            running   0.0.0.0:3000
auth-service           running   0.0.0.0:3001
chat-service           running   0.0.0.0:3002
user-data-service      running   0.0.0.0:3003
transaction-service    running   0.0.0.0:3004
compliance-service     running   0.0.0.0:3005
notification-service   running   0.0.0.0:3006
llm-service            running   0.0.0.0:5000
pathway-processor      running   0.0.0.0:8081
frontend               running   0.0.0.0:8080
mongo                  running   0.0.0.0:27017
postgres               running
zookeeper              running   0.0.0.0:2181
```

Quick health checks:
```bash
# API Gateway
curl http://localhost:3000/health

# RAG Processor
curl http://localhost:8081/health
```

## Step 4: Use the App

1. Open **http://localhost:8080**
2. Click **Register** → Create an account
3. **Login** with your credentials
4. You'll land on the **Dashboard**. Upload documents to see AI-generated personalized insights.
5. Go to **Chat** → Ask questions like:
   - "What are my recent transactions?"
   - "How much did I spend last month?"
6. Go to **Accounts** → Upload documents (bank statements, CSVs) for personalized RAG

## Step 5: Feed the RAG Engine

Drop files into `data/user-uploads/` to have them automatically indexed:

```bash
# Example: Create a test document
echo "My monthly salary is $5000. Rent is $1500. Groceries are $400." > data/user-uploads/my_budget.txt
```

The RAG processor scans every 5 seconds. After uploading, your AI chat will use this data in answers.

## Stopping the Project

```bash
docker-compose down          # Stop containers
docker-compose down -v       # Stop AND delete database volumes
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Container won't start | `docker-compose logs <service-name>` |
| AI says "API key missing" | Check `GEMINI_API_KEY` in `.env`, then `docker-compose restart llm-service` |
| RAG returns no context | Drop a `.txt` file in `data/user-uploads/` and wait 5 seconds |
| Port already in use | Stop other services on that port, or change port in `docker-compose.yml` |
| `npm install` fails | Delete `node_modules/` in the service folder, rebuild: `docker-compose up --build -d <service>` |
