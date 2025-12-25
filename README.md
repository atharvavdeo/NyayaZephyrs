# Legal AI Dashboard

## Overview
**Legal AI Dashboard** is a sophisticated, full-stack SaaS application designed for legal professionals to automate document analysis. It leverages advanced Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG) to process legal documents (PDFs), extracting critical metadata, summaries, facts, reasoning, and verdicts. The platform features a premium, vintage law office aesthetic powered by modern AI technology.

---

## 🚀 Key Features

*   **📄 Deep Document Analysis:** Automatically extracts:
    *   **Case Title / Parties** (Appellant vs Respondent)
    *   **Case Number** & **Judge Name**
    *   **Document Type** (Order, Judgment, etc.)
    *   **Detailed Summary** (concise & comprehensive)
    *   **Key Facts** & **Legal Reasoning**
    *   **Final Verdict** (prioritizing final orders over historical ones)
    
*   **🔍 Hybrid Extraction Engine:**
    *   Uses **Targeted Vector Search** to find header information (Page 1).
    *   Implements **Regex Fallback** (`X vs Y`) to ensure party names are never blank.
    *   **Self-Correcting LLM:** Injects regex findings as hints to the model.

*   **💬 Interactive Legal Chatbot:**
    *   Ask questions about the uploaded document.
    *   Get precise answers with **citations**.
    *   Maintains conversation history/memory.

*   **📊 Dashboard & Statistics:**
    *   Track **Total Documents Analyzed**.
    *   Monitor **Total Queries Asked**.
    *   Visualize **Time Saved** (estimated vs manual review).
    *   View ongoing and completed case lists.

*   **🗄️ robust Document Management:**
    *   **Previous History:** Click any past document to instantly load its stored analysis and chat history.
    *   **Re-Analyze:** Manually trigger a fresh deep-scan if needed.
    *   **Full Summary View:** Modal view for reading extensive legal details.

---

## 🏗️ Architecture

### **Tech Stack**

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend** | React 18 + Vite | Fast, responsive UI with TypeScript |
| **Styling** | TailwindCSS | Utility-first styling with custom "Law Firm" theme |
| **Animations** | Framer Motion | Smooth transitions & micro-interactions |
| **Backend** | FastAPI (Python) | High-performance async API |
| **Database** | SQLite + SQLAlchemy | Persistent storage for docs & metadata |
| **Vector DB** | Pinecone | Serverless vector storage for RAG |
| **LLM** | Groq (Llama 3.3) | 70B parameter model for high-quality generation |
| **Embeddings** | HuggingFace | `all-mpnet-base-v2` (768d) on GPU |
| **PDF Parser** | PyMuPDF (fitz) | Reliable text extraction from legal PDFs |

### **Data Flow**

1.  **Upload:** PDF → PyMuPDF → Text Chunks → Embeddings (HF) → Pinecone Vector Store.
2.  **Extraction:** Targeted Search/Regex → LLM Prompt → JSON Extraction → SQLite Database.
3.  **Chat:** User Query → Vector Search (MMR) → Context Assembly → LLM Generation → Response.

---

## 🎨 Design System

*   **Theme:** "Warm Vintage Law Office"
*   **Colors:**
    *   Background: Parchment Cream (`#f5f1e8`)
    *   Cards: Light Beige (`#f5e6c8`) & Tan (`#d4c4a8`)
    *   Accent: Vibrant Orange (`#f97316`) for Actions
    *   Text: Deep Brown-Black (`#1a1a1a`)
*   **Typography:** Times New Roman / Georgia (Serif) + Montserrat (Sans-Serif)

---

## 🛠️ Setup & Installation

### **Prerequisites**
*   Node.js (v18+)
*   Python (v3.11+)
*   Pinecone API Key
*   Groq API Key

### **1. Backend Setup**
```bash
cd Backend/Zephyr
python -m venv venv
# Activate venv (Windows: venv\Scripts\activate, Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
# Create .env file with GROQ_API_KEY and PINECONE_API_KEY
uvicorn src.app:app --reload --port 8000
```

### **2. Frontend Setup**
```bash
cd landing1
npm install
npm run dev
```

---

## 🔄 Recent Updates (v1.2)
*   **Fixed:** "Blank Case Name" issue resolved with Hybrid Regex+Vector extraction.
*   **Fixed:** VectorStore connectivity issues.
*   **Added:** `appellant`, `respondent`, `victim` metadata fields to database.
*   **Added:** "View Full Summary" modal for reading extensive analysis.
*   **Improved:** Optimized card hover animations (reduced latency).
