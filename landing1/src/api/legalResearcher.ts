// Legal Researcher API Service
// Connects to the backend API at /legal/* endpoints

const API_BASE = "http://localhost:8000/legal";

// ==================== AUTH ====================

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user_id?: number;
  username?: string;
  message?: string;
}

export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// ==================== CASES ====================

// Backend returns structured_data as nested object, so we flatten for UI convenience
export interface StructuredData {
  client_name?: string;
  opposing_party?: string;
  incident_date?: string;
  case_type?: string;
  legal_issue_summary?: string;
  key_evidence_list?: string[];
  applicable_laws?: string[];
  recommended_actions?: string[];
}

export interface BackendCase {
  case_id: number;
  client_name: string;
  structured_data: StructuredData;
  raw_description?: string;
  created_at: string;
  documents?: Array<{ filename: string; chars: number }>;
}

// Flattened case for UI
export interface CaseDetails {
  case_id: number;
  client_name: string;
  opposing_party: string;
  incident_date: string;
  case_type: string;
  legal_issue_summary: string;
  key_evidence_list: string[];
  applicable_laws: string[];
  recommended_actions: string[];
  raw_description: string;
  created_at: string;
  documents: Array<{ filename: string; chars: number }>;
}

// Convert backend case to flattened UI case
function flattenCase(backendCase: BackendCase): CaseDetails {
  const sd = backendCase.structured_data || {};
  return {
    case_id: backendCase.case_id,
    client_name: backendCase.client_name || sd.client_name || "Unknown",
    opposing_party: sd.opposing_party || "",
    incident_date: sd.incident_date || "",
    case_type: sd.case_type || "",
    legal_issue_summary: sd.legal_issue_summary || "",
    key_evidence_list: sd.key_evidence_list || [],
    applicable_laws: sd.applicable_laws || [],
    recommended_actions: sd.recommended_actions || [],
    raw_description: backendCase.raw_description || "",
    created_at: backendCase.created_at,
    documents: backendCase.documents || [],
  };
}

export interface CaseCreateManual {
  client_name: string;
  opposing_party?: string;
  incident_date?: string;
  case_type?: string;
  legal_issue_summary?: string;
  key_evidence_list?: string[];
  applicable_laws?: string[];
  recommended_actions?: string[];
}

export interface CaseCreateAI {
  raw_notes: string;
}

export interface CaseListResponse {
  success: boolean;
  cases: CaseDetails[];
  total: number;
}

export interface CaseResponse {
  success: boolean;
  case_id?: number;
  case?: CaseDetails;
  message?: string;
}

export async function createCaseManual(userId: number, data: CaseCreateManual): Promise<CaseResponse> {
  try {
    const response = await fetch(`${API_BASE}/cases/manual?user_id=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.detail || "Failed to create case" };
    }
    
    const backendCase: BackendCase = await response.json();
    return {
      success: true,
      case_id: backendCase.case_id,
      case: flattenCase(backendCase),
    };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

export async function createCaseAI(userId: number, data: CaseCreateAI): Promise<CaseResponse> {
  try {
    const response = await fetch(`${API_BASE}/cases/ai-extract?user_id=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.detail || "AI extraction failed" };
    }
    
    const backendCase: BackendCase = await response.json();
    return {
      success: true,
      case_id: backendCase.case_id,
      case: flattenCase(backendCase),
    };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

export async function uploadCasePDF(userId: number, file: File): Promise<CaseResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/cases/pdf-upload?user_id=${userId}`, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.detail || "PDF upload failed" };
    }
    
    const backendCase: BackendCase = await response.json();
    return {
      success: true,
      case_id: backendCase.case_id,
      case: flattenCase(backendCase),
    };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

export async function getUserCases(userId: number): Promise<CaseListResponse> {
  try {
    const response = await fetch(`${API_BASE}/cases?user_id=${userId}`);
    
    if (!response.ok) {
      return { success: false, cases: [], total: 0 };
    }
    
    const data: { cases: BackendCase[]; total: number } = await response.json();
    return {
      success: true,
      cases: data.cases.map(flattenCase),
      total: data.total,
    };
  } catch (error) {
    return { success: false, cases: [], total: 0 };
  }
}

export async function getCase(caseId: number, userId: number): Promise<CaseResponse> {
  try {
    const response = await fetch(`${API_BASE}/cases/${caseId}?user_id=${userId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.detail || "Case not found" };
    }
    
    const backendCase: BackendCase = await response.json();
    return {
      success: true,
      case_id: backendCase.case_id,
      case: flattenCase(backendCase),
    };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

export async function deleteCase(caseId: number, userId: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/cases/${caseId}?user_id=${userId}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.detail || "Failed to delete" };
    }
    
    const data = await response.json();
    return { success: true, message: data.message || "Case deleted" };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

// ==================== CHAT ====================

export interface ChatRequest {
  case_id: number;
  query: string;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  case_id?: number;
  message?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ChatHistoryResponse {
  success: boolean;
  case_id?: number;
  messages: ChatMessage[];
}

export interface ChatSummaryResponse {
  success: boolean;
  summary?: string;
  case_id?: number;
  message?: string;
}

export async function chatWithCase(data: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.detail || "Chat failed" };
    }
    
    const chatData = await response.json();
    return {
      success: true,
      response: chatData.response,
      case_id: chatData.case_id,
    };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

export async function getChatHistory(caseId: number): Promise<ChatHistoryResponse> {
  try {
    const response = await fetch(`${API_BASE}/chat/history/${caseId}`);
    
    if (!response.ok) {
      return { success: false, messages: [] };
    }
    
    const data = await response.json();
    return {
      success: true,
      case_id: data.case_id,
      messages: data.messages || [],
    };
  } catch (error) {
    return { success: false, messages: [] };
  }
}

export async function getChatSummary(caseId: number): Promise<ChatSummaryResponse> {
  try {
    const response = await fetch(`${API_BASE}/chat/summary/${caseId}`);
    
    if (!response.ok) {
      return { success: false, message: "Failed to get summary" };
    }
    
    const data = await response.json();
    return {
      success: true,
      summary: data.summary,
      case_id: data.case_id,
    };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

export async function clearChatHistory(caseId: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/chat/history/${caseId}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      return { success: false, message: "Failed to clear history" };
    }
    
    const data = await response.json();
    return { success: true, message: data.message || "History cleared" };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

// ==================== RESEARCH ====================

export interface ResearchRequest {
  client_name: string;
  case_title: string;
  description: string;
}

export interface CaseInfo {
  title: string;
  url: string;
  snippet: string;
  court?: string;
  date?: string;
  case_type?: string;
  verdict?: string;
  ai_summary?: string;
}

export interface ResearchResult {
  query: string;
  summary: string;
  relevant_cases: CaseInfo[];
  legal_principles: string[];
  recommended_strategy: string;
}

export interface ResearchResponse {
  success: boolean;
  research?: ResearchResult;
  message?: string;
}

// Backend response structure
interface BackendCaseInfo {
  url: string;
  case_title: string;
  court: string;
  date: string;
  case_type: string;
  verdict: string;
  parties: { petitioner: string; respondent: string };
  summary: string;
  ai_summary?: string;
}

interface BackendResearchResponse {
  success: boolean;
  client_name: string;
  case_title: string;
  results: BackendCaseInfo[];
  total_found: number;
}

export async function conductResearch(data: ResearchRequest): Promise<ResearchResponse> {
  try {
    const response = await fetch(`${API_BASE}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: errorData.detail || "Research failed" };
    }
    
    const backendData: BackendResearchResponse = await response.json();
    
    // Transform backend response to frontend format
    const relevantCases: CaseInfo[] = backendData.results.map((r) => ({
      title: r.case_title,
      url: r.url,
      snippet: r.ai_summary || r.summary,
      court: r.court,
      date: r.date,
      case_type: r.case_type,
      verdict: r.verdict,
      ai_summary: r.ai_summary,
    }));

    // Extract legal principles from verdicts and case types
    const legalPrinciples: string[] = [];
    const seenPrinciples = new Set<string>();
    backendData.results.forEach((r) => {
      if (r.verdict && r.verdict !== "Not determined" && !seenPrinciples.has(r.verdict)) {
        legalPrinciples.push(`${r.case_title}: ${r.verdict}`);
        seenPrinciples.add(r.verdict);
      }
    });

    // Generate summary from AI summaries
    const summaryParts = backendData.results
      .filter((r) => r.ai_summary)
      .map((r) => r.ai_summary)
      .slice(0, 3);
    const summary = summaryParts.length > 0 
      ? `Found ${backendData.total_found} relevant cases. ${summaryParts.join(" ")}`
      : `Found ${backendData.total_found} relevant cases from Indian Kanoon.`;

    // Generate strategy based on verdicts
    const verdictCounts: Record<string, number> = {};
    backendData.results.forEach((r) => {
      if (r.verdict && r.verdict !== "Not determined") {
        verdictCounts[r.verdict] = (verdictCounts[r.verdict] || 0) + 1;
      }
    });
    const mostCommonVerdict = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])[0];
    const recommendedStrategy = mostCommonVerdict 
      ? `Based on similar cases, the most common outcome was "${mostCommonVerdict[0]}". Review the cited cases carefully and build your arguments around the established precedents.`
      : `Review the ${backendData.total_found} cases found to identify applicable legal precedents and build your case strategy.`;

    return {
      success: true,
      research: {
        query: data.description,
        summary,
        relevant_cases: relevantCases,
        legal_principles: legalPrinciples,
        recommended_strategy: recommendedStrategy,
      },
    };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

export async function getResearchHistory(clientName: string): Promise<{ success: boolean; research_history: ResearchResult[] }> {
  try {
    const response = await fetch(`${API_BASE}/research/history/${encodeURIComponent(clientName)}`);
    
    if (!response.ok) {
      return { success: false, research_history: [] };
    }
    
    const data = await response.json();
    return {
      success: true,
      research_history: data.research_history || [],
    };
  } catch (error) {
    return { success: false, research_history: [] };
  }
}

// ==================== EXPORT ====================

export async function exportCasePDF(caseId: number, userId: number): Promise<Blob | null> {
  try {
    const response = await fetch(`${API_BASE}/export/${caseId}?user_id=${userId}`);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.blob();
  } catch (error) {
    return null;
  }
}

// ==================== STATS ====================

export interface UserStats {
  total_cases: number;
  total_documents: number;
  total_chats: number;
}

export interface UserStatsResponse {
  success: boolean;
  stats?: UserStats;
  message?: string;
}

export async function getUserStats(userId: number): Promise<UserStatsResponse> {
  try {
    const response = await fetch(`${API_BASE}/stats/${userId}`);
    
    if (!response.ok) {
      return { success: false, message: "Failed to get stats" };
    }
    
    const data = await response.json();
    return {
      success: true,
      stats: data,
    };
  } catch (error) {
    return { success: false, message: "Connection failed" };
  }
}

// ==================== LOCAL STORAGE ====================

const AUTH_KEY = "legal_researcher_auth";

export interface StoredAuth {
  user_id: number;
  username: string;
}

export function saveAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function getStoredAuth(): StoredAuth | null {
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return null;
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}
