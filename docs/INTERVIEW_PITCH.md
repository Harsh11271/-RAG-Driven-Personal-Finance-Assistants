# The Senior Engineer's Pitch: AI Finance Assistant

When speaking to interviewers, it is important to communicate the technical depth, architectural decisions, and trade-offs of your project. This document frames your project from the perspective of a Senior Software Engineer.

## 1. The "Elevator Pitch" (The Hook)

*“My project is a distributed, AI-powered Personal Finance Assistant. It allows users to upload their financial documents—like bank statements and CSVs—and interact with an AI Chatbot that answers questions based exclusively on their personal data. To handle high scale and real-time processing, I designed it using a **Microservices Architecture** with 14 distinct Docker containers, separating concerns like authentication, file ingestion, RAG processing, and LLM orchestration. I used **React** for the frontend, **Node.js/Express** for the core services, **Python** for the RAG engine, and **MongoDB Atlas** alongside **PostgreSQL** for the database layer.”*

## 2. Microservices Architecture & Tech Stack

You intentionally chose a polyglot microservices architecture. Here is exactly what each piece does:

*   **API Gateway (Node.js/Express):** Acts as the reverse proxy for the entire backend. It uses `http-proxy-middleware` to route incoming frontend requests to the appropriate internal Docker microservice (e.g., `/api/auth` goes to `auth-service`, `/api/chat` goes to `llm-service`). This centralizes routing and minimizes frontend complexity.
*   **Auth Service (Node.js/MongoDB Atlas):** Handles user registration and login using JWTs and bcrypt password hashing. It connects to MongoDB Atlas over the cloud via a `MONGODB_URI` environment variable to persist user credentials.
*   **User Data & Transaction Services (Node.js):** These handle the ingestion of user documents. They write uploaded files directly to a **Shared Docker Volume** (`/app/data/user-uploads`). This shared volume architecture ensures that the Python RAG engine can read the files without tight API coupling between the services.
*   **LLM Service (Node.js):** The orchestration layer for the AI. It receives chat requests, queries the internal RAG engine for context, builds a highly specific prompt using a custom `PromptBuilder` class, and sends the prompt to the Google Gemini (`gemini-2.5-flash`) API.
*   **Pathway Processor (Python):** The core intelligence engine. It is a lightweight Python server responsible for continuous file watching, text chunking, embedding generation, and vector similarity search.

## 3. Handling System Constraints: "Why Docker?" and The Windows Challenge

**Interviewer Question:** *"Why did you dockerize everything, and how did you handle the Pathway Processor's environment?"*

**Your Answer:**
*"I dockerized the application to ensure environmental consistency and to simulate a production-grade deployment locally. This was especially crucial for my Data Processing / RAG Engine.*

*Advanced Python file-watchers and frameworks like **Pathway** often rely on Unix-specific system calls (like `epoll` or `inotify`) to achieve real-time, high-performance data streaming. These do not work natively or efficiently on the Windows kernel. If I tried to run it directly on Windows, the file-watcher would fall back to highly inefficient CPU polling or crash.*

*To solve this elegantly, I containerized the RAG Processor (`pathway-processor`) using a lightweight Linux image running on Docker Desktop's WSL2 backend. This allowed the Python engine to natively watch the shared volume (`data/user-uploads`) in a true Linux environment, entirely bypassing the Windows OS limitations. The Node.js services just communicate with it over internal Docker HTTP networking."*

## 4. The Data Flow Design (Real-Time Document Ingestion)

Explain how data moves safely and efficiently through the system when a user uploads a bank statement:

1.  **Upload:** The user drops a CSV into the React frontend.
2.  **API Gateway:** Routes the file upload stream to the `user-data-service`.
3.  **Shared Volume:** The service saves the file to the `data/user-uploads/` directory on the host machine. Because this directory is mounted as a Docker Volume, the `pathway-processor` container instantly has access to the new file data.
4.  **Real-Time Data Updation:** A Python Daemon Thread running `background_watcher()` inside the `pathway-processor` continuously monitors the directory. Every 5 seconds, it recursively scans for files. It calculates an MD5 hash of the file's name and modification time to instantly detect new or updated files, completely avoiding the need for the Node server to synchronously ping or trigger the Python server. This event-driven, decoupled ingestion architecture is highly resilient.

## 5. Deep Dive: Chunking, Embedding, and Aggregation

**Interviewer Question:** *"How exactly are you processing the text and doing vector search recursively?"*

**Your Answer:**
*"Once the Python watcher detects a new or updated file, it runs through a customized ingestion pipeline:*

*   **Chunking:** The file is read and split into semantic chunks. I bounded the chunks to `max_chars=1000` and split on paragraph breaks (`\n\n`) so that I don't accidentally cut a transaction row or a sentence in half. This provides the LLM with clean, readable context blocks, rather than fragmented strings.
*   **Embedding:** I pass those text chunks into an Embedding Model (`text-embedding-3-small` via OpenAI). The model converts the human text into high-dimensional floating-point vectors that represent the semantic meaning of the text.
*   **Aggregation & Storage:** For this iteration, I built a lightweight in-memory vector store using Python lists and sets. Each document object in memory holds the `text`, `source_filename`, and `embedding` array. 

*When a user asks a question, my system takes their query, embeds it using the exact same model, and uses **NumPy** to calculate the **Cosine Similarity** between the query vector and all document vectors in memory (`np.dot(q, d) / (norm(q) * norm(d))`). It sorts them and aggregates the top `K=3` most mathematically similar chunks to return to the LLM Service."*

## 6. LLM Answer Generation & Prompt Engineering

**Interviewer Question:** *"How does the LLM actually generate a reliable, personalized answer?"*

**Your Answer:**
*"I use advanced Prompt Engineering and RAG orchestration within the `llm-service`. I built a `PromptBuilder` class that acts as the final decision maker.*

*Let's say the user asks 'How much did I spend on rent last month?'.*
1. *The `llm-service` sends the query to the `pathway-processor` via an internal HTTP POST.*
2. *The Python processor runs the cosine similarity search and returns the top 3 chunks containing rent data from the user's specific uploaded CSVs.*
3. *The `PromptBuilder` takes those chunks and explicitly injects them into a strict System Prompt: `"You are a Financial AI. Use the RETRIEVED CONTEXT below as your primary factual basis. [Context 1, Context 2, Context 3]..."`*
4. *I also inject the User Persona/Goals into the prompt to personalize the conversational tone.*
5. *Finally, this massive composite prompt is sent to the Google Gemini Flash API. Because Gemini receives the exact factual, mathematical context in its prompt window, it doesn't hallucinate; it acts as an intelligent reasoning engine over the retrieved data to generate a highly accurate answer."*

## 💡 Key Highlights to Mention in the Interview

*   **Graceful Fallbacks:** I engineered a `simple_keyword_search()` fallback in `main.py` that uses Set Intersections (TF-IDF style Bag-of-Words) in case the Embedding API experiences downtime. This ensures the app doesn't completely break if OpenAI goes down.
*   **Security & PII:** The system includes a `compliance-service` dedicated to PII masking (redacting SSNs and Credit Cards via regex) before data eventually hits external LLMs. 
*   **Extreme Decoupling:** Because of the API Gateway and Docker abstraction, the system is highly extensible. I could theoretically rip out the lightweight Python RAG engine tomorrow, replace it with a managed service like Pinecone, and *none of the frontend React code or Node core backend code would have to change.*
