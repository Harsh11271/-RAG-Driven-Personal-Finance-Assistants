# Project Roadmap & Todo List

## 🚀 Phase 1: Foundation & Authentication
- [x] **Auth Service**: Implement User Model (MongoDB), Registration, and Login Logic.
- [x] **Auth Service**: Implement JWT Token generation and verification.
- [x] **API Gateway**: Configure routes to proxy `/auth` requests to the Auth Service.
- [x] **Frontend**: Create Login and Signup pages.
- [x] **Frontend**: Integrate Frontend with Auth API (Store JWT in localStorage/Context).

## 💬 Phase 2: Basic Chat Interface
- [x] **Chat Service**: Setup basic WebSocket server (Socket.io) or REST endpoints for messaging.
- [x] **Frontend**: Build the Chat UI (Sidebar, Message Window, Input).
- [x] **Frontend**: Connect Chat UI to Chat Service (Echo message test).

## 🧠 Phase 3: Data Processing (Pathway RAG)
- [x] **Pathway Integration**: Re-implemented `xpack.llm` streaming processor.
- [ ] **Infrastructure**: Verify RAG retrieval health.

## 💳 Phase 4: Transaction & Data Ingestion
- [x] **Transaction Service**: Create API to simulate/webhook new transactions.
- [x] **Transaction Service**: Push new transactions to Kafka.
- [ ] **Data Processing**: Implement real-time transaction processing.

## 🤖 Phase 5: LLM Integration
- [x] **LLM Service**: Connect to Gemini/OpenAI API.
- [x] **LLM Service**: Implement query orchestration and response generation.
- [x] **Frontend**: Display "Reasoning" or "Thinking" state if possible.

## 🛡️ Phase 6: Compliance & Notifications
- [x] **Compliance**: Implement PII masking middleware.
- [x] **Notifications**: Setup email/mock alerts for unusual spending (triggered by Pathway).

## 🚀 Phase 7: Deployment & Polish
37: - [ ] **Docker**: Optimize multi-stage builds.
38: - [ ] **K8s**: Generate final Manifests.
39: - [ ] **Documentation**: Finalize API docs.

## 🌟 Phase 8: Advanced Financial AI & Personalization
- [ ] **Bank Connection**: Integrate Plaid/Bank API for real-time transaction streaming.
- [x] **Document Vault**: Implement secure file upload for personalized data (Bank statements, Tax docs).
- [ ] **Advanced Processing**: Consider implementing advanced document parsing and real-time ingestion.
- [x] **Compliance Brain**: Integrate financial compliance rules (AML, KYC) into the system.
- [x] **Personalization Engine**: Create UI and backend for users to feed personal goals/data into the LLM context.


