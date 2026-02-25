# HOW TO RUN — Complete Command Reference

Every single command you need to start, stop, debug, and manage this project.
All commands run in **PowerShell** or **Command Prompt** on Windows.

---

## 🚀 START THE ENTIRE PROJECT (One Command)

```powershell
# Terminal: PowerShell / CMD
# Directory: d:\Green\New folder\ai_clude\finance-assistant

cd "d:\Green\New folder\ai_clude\finance-assistant"
docker-compose up --build -d
```

> First run = ~5 min (downloads images). After that = ~30 seconds.

The app is ready when you see all containers "Started". Open **http://localhost:8080** in your browser.

---

## 🛑 STOP THE PROJECT

```powershell
# Terminal: PowerShell / CMD
# Directory: d:\Green\New folder\ai_clude\finance-assistant

cd "d:\Green\New folder\ai_clude\finance-assistant"

# Stop all containers (keeps data)
docker-compose down

# Stop AND delete all database data (fresh start)
docker-compose down -v
```

---

## 🔄 RESTART A SINGLE SERVICE

```powershell
# Terminal: PowerShell / CMD
# Directory: d:\Green\New folder\ai_clude\finance-assistant

cd "d:\Green\New folder\ai_clude\finance-assistant"

# Just restart (no code changes)
docker-compose restart llm-service

# Rebuild + restart (after code changes)
docker-compose up --build -d llm-service
```

Replace `llm-service` with any service name:
`api-gateway`, `auth-service`, `chat-service`, `user-data-service`,
`transaction-service`, `compliance-service`, `notification-service`,
`llm-service`, `pathway-processor`, `frontend`

---

## ✅ CHECK IF EVERYTHING IS RUNNING

```powershell
# Terminal: PowerShell / CMD
# Directory: d:\Green\New folder\ai_clude\finance-assistant

cd "d:\Green\New folder\ai_clude\finance-assistant"
docker-compose ps
```

You should see 13 containers all with state `running`:
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

---

## 🏥 HEALTH CHECKS

```powershell
# Terminal: PowerShell / CMD (from any directory)

# API Gateway
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing | Select-Object -ExpandProperty Content

# RAG Processor (shows how many documents are indexed)
Invoke-WebRequest -Uri http://localhost:8081/health -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## 📋 VIEW SERVICE LOGS

```powershell
# Terminal: PowerShell / CMD
# Directory: d:\Green\New folder\ai_clude\finance-assistant

cd "d:\Green\New folder\ai_clude\finance-assistant"

# Last 20 lines of a service
docker-compose logs --tail=20 llm-service

# Live stream logs (Ctrl+C to stop watching)
docker-compose logs -f llm-service

# All services at once
docker-compose logs --tail=10
```

---

## 🔑 CHANGE API KEY

```powershell
# 1. Open .env in any text editor:
notepad "d:\Green\New folder\ai_clude\finance-assistant\.env"

# 2. Change GEMINI_API_KEY=... to your new key
# 3. Save and close

# 4. Restart the LLM service to pick up the new key:
cd "d:\Green\New folder\ai_clude\finance-assistant"
docker-compose up --build -d llm-service
```

---

## 📂 ADD DOCUMENTS FOR AI (RAG)

Just drop `.txt` or `.csv` files into this folder:

```
d:\Green\New folder\ai_clude\finance-assistant\data\user-uploads\
```

The RAG processor scans every 5 seconds — no restart needed.

```powershell
# Example: Create a test document
echo "My monthly salary is 5000 dollars" > "d:\Green\New folder\ai_clude\finance-assistant\data\user-uploads\my_info.txt"
```

---

## 🧪 RUN THE RAG TEST

```powershell
# Terminal: PowerShell / CMD
# Directory: d:\Green\New folder\ai_clude\finance-assistant

cd "d:\Green\New folder\ai_clude\finance-assistant"
node scripts/test-rag-flow.js
```

---

## 🌐 URLS TO OPEN IN BROWSER

| URL | What It Is |
|-----|-----------|
| http://localhost:8080 | Frontend (Register → Login → Dashboard → Chat) |
| http://localhost:3000/health | API Gateway health check |
| http://localhost:8081/health | RAG Processor stats (documents indexed) |

---

## 🛠️ COMMON FIXES

### Container won't start
```powershell
cd "d:\Green\New folder\ai_clude\finance-assistant"
docker-compose logs --tail=30 <service-name>
```

### Port already in use
```powershell
# Find what's using port 3000 (replace with any port)
netstat -ano | findstr :3000

# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F
```

### Clean rebuild everything
```powershell
cd "d:\Green\New folder\ai_clude\finance-assistant"
docker-compose down -v
docker-compose up --build -d
```

### Docker not running
Open **Docker Desktop** app first, wait for it to say "Docker is running", then run the commands above.

---

## 📁 IMPORTANT FILES TO KNOW

| File | Purpose |
|------|---------|
| `.env` | API keys and config — edit this for keys |
| `docker-compose.yml` | All service definitions — edit to change ports |
| `data/user-uploads/` | Drop files here for AI to learn from |
| `services/llm-service/src/services/geminiService.js` | Change AI model name here |
| `services/api-gateway/src/app.js` | All API proxy routes |
| `frontend/web/src/pages/ChatPage.jsx` | Chat UI code |
