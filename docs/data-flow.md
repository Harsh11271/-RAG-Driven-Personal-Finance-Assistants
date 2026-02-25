# 🌊 Data Flow: From Transaction to AI Insight

This document tracks how data travels through the Finance AI Assistant platform across three specific pipelines.

---

## 1. The Real-Time Transaction Pipeline
*Goal: Detect fraud and categorize spending in milliseconds.*

1.  **Source**: A bank API (Plaid) or the internal `transaction-service` generates a transaction event.
2.  **Ingestion**: Event is pushed to the `transactions` Kafka topic.
3.  **Stream Processing**:
    *   `pathway-processor` consumes the event.
    *   **Categorizer**: The merchant name is parsed using the ML UDF to assign a category (e.g., "Starbucks" -> "Food").
    *   **Anomaly**: The amount is checked against the user's historical Z-score (Mean/StdDev).
4.  **Action**: If anomalous, an HTTP alert is sent to the `notification-service`.
5.  **Persistence**: The enriched transaction is indexed for future AI retrieval.

---

## 2. The Personalized RAG Pipeline
*Goal: Ground the LLM in the user's specific context.*

1.  **Upload**: User uploads a `PDF` or `JSON` file via the **Accounts** page.
2.  **Storage**: `user-data-service` saves the file to the secure shared volume `/app/data/user-uploads`.
3.  **Live Indexing**:
    *   Pathway's `fs.read` detects the new file instantly.
    *   The file is decoded and embedded using the **Gemini Embedding** model (`models/embedding-001`).
    *   The vector and text are stored in the hybrid `KNNIndex`.
4.  **Hybridization**: This personal data is merged with the **Global Compliance Rules** index (AML policies).

---

## 3. The Query-Response Pipeline
*Goal: Answer complex financial questions with factual grounding.*

1.  **Question**: User asks: *"Am I spending too much on coffee?"*
2.  **Retrieval**:
    *   Assistant calls `api-gateway` -> `llm-service`.
    *   `llm-service` sends the query to the `pathway-processor` RAG server on port 8081.
    *   Pathway performs a Vector Search against the hybrid index.
3.  **Synthesis**:
    *   LLM receives: `[Context: Transacted $450 at Starbucks this month; User Goal: Save for house]`.
    *   LLM generates a response: *"Yes, your Starbucks spending is $200 above your monthly average, which will delay your house savings goal by 2 weeks."*
4.  **Delivery**: Response is streamed back to the Vite frontend via REST/WebSockets.
