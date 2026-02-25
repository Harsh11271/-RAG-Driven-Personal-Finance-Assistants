# 🧠 Pathway Design: The AI Processor

This document details the internal design of the **Pathway Processor**, the core engine responsible for real-time intelligence in the platform.

## Why Pathway?
Unlike traditional RAG systems that rely on batch processing, our system uses **Pathway** to achieve **Low-Latency Hybrid Intelligence**. This allows the AI to "know" about a transaction or a document the moment it exists.

---

## 🏗️ Core Components

### 1. Hybrid Vector Store
We don't use a separate Vector DB (like Pinecone). Instead, we use Pathway's in-memory `KNNIndex` for real-time performance.
*   **Embedder**: Google Gemini (`models/embedding-001`).
*   **Strategy**: Incremental indexing of file streams (Documents) and table streams (Transactions).

### 2. ML UDFs (User Defined Functions)
We extend Pathway's capabilities with custom Python functions:
*   **`categorize_transaction`**: Regex and keyword-based classification of merchant strings.
*   **`detect_anomaly`**: Statistical outlier detection using rolling window aggregates.

### 3. Personalization Streams
The engine exposes a specialized HTTP input on port **8082**. This allows "Soft-Training" where user telemetry (goals, life changes) is streamed into the context without rebuilding the vector store.

---

## 🛠️ Pipeline Implementation Details

### The Combined RAG Pipeline (`rag_pipeline.py`)
This is the main entry point for the "Brain."

1.  **Bank Ingestion**: Using `bank_connector.py` to simulate a live bank API feed.
2.  **Document Ingestion**: Watching `global-rules` and `user-uploads` directories.
3.  **Cross-Join Intelligence**:
    *   Transactions are joined with a rolling `stats` table to flag anomalies.
    *   Global policies are joined with user queries to provide compliance-aware answers.

### Performance Tuning
*   **`autocommit_duration_ms: 1000`**: Ensures the index updates once per second.
*   **`k=5`**: Retrieval depth for nearest neighbors to balance LLM tokens and contextual accuracy.

---

## 🛡️ Security & Privacy
*   **Local Processing**: The Pathway engine runs within the private network. Only derived context is sent to external LLM providers (Gemini/OpenAI).
*   **Source Tagging**: Every piece of context is tagged with `source_type` (e.g., `compliance` vs `user_upload`) so the LLM can explain *why* it is giving certain advice.
