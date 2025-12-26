# ⚖️ ZeroDay: Advanced Legal AI Platform

> **Status**: Active Development  
> **Version**: 2.0.0 (Multi-Tenant Architecture)  
> **Security Level**: High (JWT, Audit Logging, Data Siloing)

## 📖 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [Master Architecture](#-master-architecture)
3. [Multi-Tenant Database System](#-multi-tenant-database-system)
4. [Security & Compliance](#-security--compliance)
5. [AI & RAG Architecture](#-ai--rag-architecture)
6. [API Reference](#-api-reference)
7. [Frontend Dashboard](#-frontend-dashboard)
8. [Installation & Setup](#-installation--setup)

---

## 🚀 Executive Summary

**ZeroDay** is a production-grade AI platform designed for legal professionals to manage cases, perform automated legal research, and interact with case documents using secure, context-aware AI. 

Unlike standard LegalWrappers, ZeroDay implements a **defense-in-depth security architecture** featuring strict multi-tenancy, immutable audit logging, and AI guardrails to prevent hallucinations and prompt injection attacks.

---

## 🏗️ Master Architecture

The platform follows a **Secure Monorepo** structure with a decoupled React frontend and a FastAPI backend.

```mermaid
graph TD
    User[Legal Professional] -->|HTTPS/TLS| FE[React Frontend]
    FE -->|JWT Auth Bearer| API[FastAPI Backend]
    
    subgraph "Backend Security Layer"
        API -->|Validate Token| JWT[JWT Auth Service]
        API -->|Rate Limit| RL[Rate Limiter]
        API -->|Sanitize Input| GR[Guardrails Engine]
    end
    
    subgraph "Data Persistence Layer"
        API -->|Route Request| Router[Database Router]
        Router -->|Auth/User Data| MasterDB[(Master Auth DB)]
        Router -->|Case Data| TenantDB[(Tenant DB: lawyer_X.db)]
    end
    
    subgraph "AI Processing Layer"
        API -->|Context| Chat[Secure Chatbot]
        API -->|Extraction| Gen[Case Generator]
        Chat <-->|Inference| Groq[Groq LPU (Llama 3)]
        Gen <-->|Research| Firecrawl[Firecrawl Search]
    end
```

---

## 🗄️ Multi-Tenant Database System

We have migrated from a monolithic database to a **Database-per-Tenant** architecture to ensure maximum data isolation and GDPR compliance.

### The Database Router Pattern
The `DatabaseRouter` class (`database_manager.py`) intelligently routes queries based on the authenticated context.

1.  **Master Database (`master_auth.db`)**
    *   **Purpose**: Stores global user identities and authentication credentials.
    *   **Tables**: `users`, `auth_audit_logs`.
    *   **Security**: Minimal PII. No case data.

2.  **Tenant Databases (`databases/lawyer_{id}.db`)**
    *   **Purpose**: Isolated storage for a specific lawyer's cases, documents, and chat logs.
    *   **Isolation**: File-level separation. A lawyer CANNOT query another lawyer's file physically.
    *   **Tables**: `cases`, `documents`, `chat_logs`, `audit_logs`.

### Schema Details

#### Master Schema
```sql
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT, -- Bcrypt
    email TEXT
);
```

#### Tenant Schema (Replicated per User)
```sql
CREATE TABLE cases (
    case_id INTEGER PRIMARY KEY,
    client_name TEXT,
    structured_data JSON, -- AI extracted metadata
    progress INTEGER,
    stage TEXT
);

CREATE TABLE documents (
    doc_id INTEGER PRIMARY KEY,
    case_id INTEGER REFERENCES cases(case_id),
    parsed_text TEXT, -- Full text for RAG
    uploaded_at TIMESTAMP
);

CREATE TABLE audit_logs (
    log_id INTEGER PRIMARY KEY,
    action TEXT, -- e.g., 'VIEW_CASE', 'EXPORT_PDF'
    resource_id INTEGER,
    ip_address TEXT,
    timestamp TIMESTAMP
);
```

---

## 🔒 Security & Compliance

ZeroDay implements a **Zero Trust** security model.

### 1. Authentication (Stateless JWT)
*   **Token**: JSON Web Tokens (HS256) with configurable expiry.
*   **Hashing**: Passwords hashed using `bcrypt` (work factor 12).
*   **Flow**:
    1.  User POSTs credentials to `/auth/login`.
    2.  Server returns `access_token`.
    3.  Client attaches header: `Authorization: Bearer <token>`.
    4.  `Depends(get_user_id)` validates token and extracts `user_id` for routing.

### 2. Authorization (Strict Siloing)
*   Every database operation requires a `user_id` context.
*   The `DatabaseRouter` constructs the path `databases/lawyer_{user_id}.db`.
*   **Impossible Cross-Tenant Access**: It is physically impossible for User A to query User B's cases because the file path would be different.

### 3. Audit Logging (Immutable)
Every critical action is logged to the tenant's `audit_logs` table (or master `auth_audit_logs`).
*   **Logged Events**: Login (Success/Fail), View Case, Delete Case, Export PDF, AI Chat.
*   **Data Fields**: IP Address, User Agent, Timestamp, Resource ID, Action Status.
*   **Admin Dashboard**: Visualizes these logs for compliance reviews.

### 4. AI Guardrails (`guardrails.py`)
*   **Input Sanitization**: Regex filters to block prompt injection (e.g., "Ignore previous instructions").
*   **Output Validation**: Checks response for safety / prohibited content.
*   **Hallucination Checker**: Verifies that citations in AI response actually exist in the provided context/documents.

---

## 🤖 AI & RAG Architecture

The platform uses a specialized RAG (Retrieval-Augmented Generation) pipeline optimized for legal texts.

### 1. Ingestion Pipeline
1.  **PDF Upload**: `PyPDF2` extracts text from legal documents.
2.  **Text Cleaning**: Normalization of whitespace and legal artifacts.
3.  **Storage**: Raw text is stored in `documents` table (Tenant DB).

### 2. AI Extraction Engine (`CaseGenerator`)
*   **Problem**: Unstructured client notes/PDFs.
*   **Solution**: Single-shot prompting with `Llama-3-70b` to extract secure JSON structure.
*   **Fields**: `client_name`, `opposing_party`, `legal_issues`, `key_evidence`.

### 3. Context-Aware Chat (`SecureChatbot`)
1.  **Context Retrieval**: Fetches Case Metadata + Case Documents + Chat History (Last 5 messages).
2.  **Prompt Engineering**: Uses rigid system prompts to enforce "Legal Assistant" persona.
3.  **Inference**: User Query + Context sent to Groq LPU (Low Latency Processing Unit).
4.  **Verification**: Response is cross-checked against case facts before returning to user.

---

## 📡 API Reference

Base URL: `/legal`

### Auth
*   `POST /auth/register`: Create account.
*   `POST /auth/login`: Get JWT.
*   `POST /auth/refresh`: Refresh token.

### Case Management
*   `GET /cases`: List all cases (Tenant-scoped).
*   `POST /cases/manual`: Create case manually.
*   `POST /cases/ai-extract`: Create case from raw text.
*   `POST /cases/pdf-upload`: Create case from PDF.
*   `GET /cases/{id}`: Get details + documents.
*   `DELETE /cases/{id}`: Delete case (GDPR compliant).

### Chat
*   `POST /chat`: Interact with case context.
*   `GET /chat/history/{case_id}`: Get conversation.

### Admin & Security
*   `GET /audit/logs`: Fetch security logs.
*   `GET /stats/{user_id}`: Dashboard metrics.

---

## 💻 Frontend Dashboard

The frontend (`landing1`) is a modern React application built with:
*   **Vite + TypeScript**: For performance and type safety.
*   **Framer Motion**: Smooth transitions and sleek UI.
*   **Admin Dashboard**: A dedicated security view (`/admin`) displaying audit trails, vulnerability status, and system health.

---

## 🛠️ Installation & Setup

### Prerequisites
*   Python 3.9+
*   Node.js 18+
*   Groq API Key

### Backend Setup
```bash
cd Backend/legal_researcher
# Create virtual env
python -m venv venv
source venv/bin/activate

# Install deps
pip install -r requirements.txt

# Environment Setup
cp .env.example .env
# Edit .env with your keys
```

### Frontend Setup
```bash
cd landing1
npm install
npm run dev
```
