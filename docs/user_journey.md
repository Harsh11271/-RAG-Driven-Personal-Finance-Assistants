# 🗺️ User Journey: Finance AI Assistant

This document outlines the end-to-end experience for a user on the Finance AI platform, from onboarding to receiving personalized, AI-driven financial advice.

---

### Phase 1: Onboarding & Authentication
1.  **Registration**: User signs up with a secure account.
2.  **Authentication**: User logs in, receiving a JWT for secure access across the microservice ecosystem.
3.  **Initial Dashboard**: User sees their financial overview (currently mock data) and high-level summaries.

---

### Phase 2: Building the "AI Vault" (Personalization)
1.  **Bank Connection**: User navigates to the **Accounts** page and connects their bank account (Plaid Simulator).
    *   *System Action*: Pathway begins streaming real-time transaction data.
2.  **Document Upload**: User uploads sensitive documents like **Bank Statements, Tax Returns, or Investment Portfolios**.
    *   *System Action*: The `user-data-service` stores these in a secure volume.
3.  **Smart Training**: User enters their specific goals (e.g., "I need to save $50k for a wedding in 18 months") and risk preferences.
    *   *System Action*: This data is pushed to Pathway's personalization stream on port 8082.

---

### Phase 3: Real-Time Intelligence & Compliance
1.  **Live Monitoring**: As the user spends money, the **Pathway "Brain"** processes every transaction.
2.  **Compliance Guardrails**: If a transaction looks suspicious (e.g., a $12,000 transfer), the AI checks it against the **Global Compliance Rules** index.
3.  **Proactive Alerts**: If a violation or unusual spending pattern is found, the `notification-service` alerts the user instantly.

---

### Phase 4: Conversational AI (The Personal Assistant)
1.  **Inquiry**: User asks the AI: *"Can I afford that $2,000 vacation next month based on my wedding savings goal?"*
2.  **Hybrid RAG Query**:
    *   Pathway searches the **Compliance Rules** (Global Knowledge).
    *   Pathway searches the user's **Uploaded Documents** (Personal Knowledge).
    *   Pathway checks the user's **Current Balance & Goals** (Live State).
3.  **Personalized Response**: The LLM synthesizes this data into a specific answer: *"Based on your tax return and recent $5,000 bonus, yes, but only if you reduce your dining out expenses by 15% this month to stay on track for your $50k wedding goal."*

---

### Phase 5: Smart Financial Growth
1.  **Feedback Loop**: User updates their goals as their life changes.
2.  **Smart Training Update**: The AI "re-learns" the user's new context without needing a full model retrain, ensuring the advice stays relevant forever.
