import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Client {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
}

interface StructuredData {
    client_name?: string;
    case_title?: string;
    case_type?: string;
    opposing_party?: string;
    incident_date?: string;
    legal_issues?: string[];
    summary?: string;
    evidence?: string[];
    applicable_laws?: string[];
    recommended_action?: string;
}

interface Case {
    id: number;
    case_title: string;
    case_type: string;
    description: string;
    created_at: string;
    structured_data: StructuredData;
    citations: any[];
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [view, setView] = useState<"list" | "detail">("list");
    const [showNewClientModal, setShowNewClientModal] = useState(false);
    const [showNewCaseModal, setShowNewCaseModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // New Client Form State
    const [newClientName, setNewClientName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");

    // New Case Analysis State
    const [rawNotes, setRawNotes] = useState("");
    const [analyzing, setAnalyzing] = useState(false);

    // Chat State
    const [chatMessage, setChatMessage] = useState("");
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([
        { role: "ai", content: "Hello! Select a case or ask me anything about this client." }
    ]);
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            // Use Legal Researcher cases API instead of non-existent /clients
            const res = await fetch("http://localhost:8000/legal/cases?user_id=1");
            const data = await res.json();
            // Map cases to client format
            const clientList = data.cases?.map((c: any) => ({
                id: c.case_id,
                name: c.client_name || "Unknown Client",
                email: c.structured_data?.email || "",
                phone: c.structured_data?.phone || "",
                status: c.is_complete ? "Completed" : "Active"
            })) || [];
            setClients(clientList);
        } catch (err) {
            console.error("Failed to fetch clients", err);
        }
    };

    const handleCreateClient = async () => {
        try {
            setLoading(true);
            // Use Legal Researcher cases API to create a new case as a client
            await fetch("http://localhost:8000/legal/cases/manual?user_id=1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_name: newClientName,
                    legal_issue_summary: `New client: ${newClientEmail}`
                })
            });
            setShowNewClientModal(false);
            setNewClientName("");
            setNewClientEmail("");
            fetchClients();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleClientClick = async (id: number) => {
        try {
            setLoading(true);
            // Use Legal Researcher case API to get case details
            const res = await fetch(`http://localhost:8000/legal/cases/${id}?user_id=1`);
            const data = await res.json();
            // Map to expected format
            setSelectedClient({
                client: {
                    id: data.case_id,
                    name: data.client_name || "Unknown Client",
                    email: data.structured_data?.email || ""
                },
                cases: [{
                    id: data.case_id,
                    case_title: data.client_name,
                    case_type: data.structured_data?.case_type || "General",
                    description: data.raw_description || "",
                    created_at: data.created_at,
                    structured_data: data.structured_data || {},
                    citations: []
                }]
            });
            setView("detail");
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeCase = async () => {
        if (!rawNotes.trim()) return;
        setAnalyzing(true);
        try {
            // Use Legal Researcher AI case creation endpoint
            const res = await fetch("http://localhost:8000/legal/cases/ai-extract?user_id=1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ raw_notes: rawNotes })
            });
            if (res.ok) {
                fetchClients();
                setShowNewCaseModal(false);
                setRawNotes("");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleChat = async () => {
        if (!chatMessage.trim() || !selectedClient) return;

        const recentCase = selectedClient.cases[0];
        if (!recentCase) {
            setChatHistory(prev => [...prev, { role: "user", content: chatMessage }, { role: "ai", content: "This client has no cases to discuss yet." }]);
            setChatMessage("");
            return;
        }

        const userMsg = chatMessage;
        setChatMessage("");
        setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
        setChatLoading(true);

        try {
            // Use Legal Researcher chat endpoint
            const res = await fetch("http://localhost:8000/legal/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ case_id: recentCase.id, query: userMsg, language: "en" })
            });
            const data = await res.json();
            if (res.ok) {
                setChatHistory(prev => [...prev, { role: "ai", content: data.response }]);
            } else {
                setChatHistory(prev => [...prev, { role: "ai", content: "Sorry, I encountered an error." }]);
            }
        } catch (err) {
            console.error(err);
            setChatHistory(prev => [...prev, { role: "ai", content: "Connection failed." }]);
        } finally {
            setChatLoading(false);
        }
    };

    // Render a complete case file card
    const renderCaseFile = (c: Case) => (
        <div key={c.id} className="bg-white/90 rounded-xl border-2 border-[#d4b896] shadow-xl overflow-hidden mb-6">
            {/* Case File Header */}
            <div className="bg-gradient-to-r from-[#1a1a1a] to-[#333] text-white p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[#f97316] font-bold text-sm">📋 CLIENT CASE FILE</span>
                            <span className="bg-[#f97316] text-white text-xs px-2 py-0.5 rounded font-bold">#{c.id}</span>
                        </div>
                        <h3 className="text-xl font-serif font-bold">{c.case_title}</h3>
                    </div>
                    <div className="text-right">
                        <span className="bg-white/20 text-xs px-3 py-1.5 rounded-full font-medium">{c.case_type || "General Case"}</span>
                        <p className="text-xs text-gray-300 mt-2">📅 Created: {new Date(c.created_at).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Case File Body */}
            <div className="p-6 space-y-5">
                {/* Parties Section - 3 Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-[#f5e6c8]/70 to-[#f5e6c8]/30 p-4 rounded-lg border border-[#d4b896]">
                        <p className="text-xs font-bold text-[#8b7355] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>👤</span> Client Name
                        </p>
                        <p className="text-[#1a1a1a] font-semibold text-lg">{c.structured_data?.client_name || selectedClient?.client.name || "Not specified"}</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#f5e6c8]/70 to-[#f5e6c8]/30 p-4 rounded-lg border border-[#d4b896]">
                        <p className="text-xs font-bold text-[#8b7355] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>⚔️</span> Opposing Party
                        </p>
                        <p className="text-[#1a1a1a] font-semibold text-lg">{c.structured_data?.opposing_party || "Not specified"}</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#f5e6c8]/70 to-[#f5e6c8]/30 p-4 rounded-lg border border-[#d4b896]">
                        <p className="text-xs font-bold text-[#8b7355] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>📅</span> Incident Date
                        </p>
                        <p className="text-[#1a1a1a] font-semibold text-lg">{c.structured_data?.incident_date || "Unknown"}</p>
                    </div>
                </div>

                {/* Legal Issue Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200 shadow-sm">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="text-base">📝</span> Legal Issue Summary
                    </p>
                    <p className="text-[#333] leading-relaxed text-base">{c.structured_data?.summary || c.description || "No summary available"}</p>
                </div>

                {/* Two Column: Evidence & Legal Issues */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Key Evidence List */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-lg border border-amber-200 shadow-sm">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="text-base">🔍</span> Key Evidence List
                        </p>
                        {c.structured_data?.evidence && c.structured_data.evidence.length > 0 ? (
                            <ul className="space-y-2">
                                {c.structured_data.evidence.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-[#333]">
                                        <span className="text-amber-600 font-bold">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 italic">No evidence documented yet</p>
                        )}
                    </div>

                    {/* Legal Issues */}
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-5 rounded-lg border border-purple-200 shadow-sm">
                        <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="text-base">📌</span> Key Legal Issues
                        </p>
                        {c.structured_data?.legal_issues && c.structured_data.legal_issues.length > 0 ? (
                            <ul className="space-y-2">
                                {c.structured_data.legal_issues.map((issue: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-[#333]">
                                        <span className="text-purple-600 font-bold">•</span>
                                        <span>{issue}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 italic">No legal issues identified</p>
                        )}
                    </div>
                </div>

                {/* Applicable Laws Section */}
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-5 rounded-lg border border-rose-200 shadow-sm">
                    <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="text-base">⚖️</span> Applicable Laws & Statutes
                    </p>
                    {c.structured_data?.applicable_laws && c.structured_data.applicable_laws.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {c.structured_data.applicable_laws.map((law: string, i: number) => {
                                const colors = [
                                    "bg-rose-100 text-rose-800 border-rose-300",
                                    "bg-blue-100 text-blue-800 border-blue-300",
                                    "bg-indigo-100 text-indigo-800 border-indigo-300",
                                    "bg-violet-100 text-violet-800 border-violet-300",
                                    "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300"
                                ];
                                return (
                                    <span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${colors[i % colors.length]}`}>
                                        {law}
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">No applicable laws identified yet</p>
                    )}
                </div>

                {/* Citations Section (from web scraping) */}
                {c.citations && c.citations.length > 0 && (
                    <div className="bg-gradient-to-r from-cyan-50 to-teal-50 p-5 rounded-lg border border-cyan-200 shadow-sm">
                        <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="text-base">📚</span> Case Citations (via Web Research)
                        </p>
                        <div className="space-y-3">
                            {c.citations.map((cite: any, i: number) => (
                                <div key={i} className="bg-white p-3 rounded-lg border border-cyan-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-semibold text-[#1a1a1a] text-sm">{cite.case_title || cite.title || `Citation ${i + 1}`}</p>
                                        <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded">{cite.court || cite.case_type || "Legal"}</span>
                                    </div>
                                    {cite.ai_summary && <p className="text-xs text-gray-600 mt-1">{cite.ai_summary}</p>}
                                    {cite.verdict && <p className="text-xs text-emerald-600 mt-1">Verdict: {cite.verdict}</p>}
                                    {cite.url && (
                                        <a href={cite.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                                            🔗 View Full Case
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommended Actions */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-5 rounded-lg border border-emerald-200 shadow-sm">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="text-base">✅</span> Recommended Actions
                    </p>
                    <p className="text-[#333] leading-relaxed text-base">{c.structured_data?.recommended_action || "No recommendations available yet"}</p>
                </div>

                {/* Raw Notes (Collapsible) */}
                <details className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <summary className="p-4 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2">
                        <span>📄</span> View Original Raw Notes
                    </summary>
                    <div className="p-4 pt-0 border-t border-gray-200 bg-white">
                        <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">{c.description}</pre>
                    </div>
                </details>
            </div>

            {/* Case File Footer */}
            <div className="bg-[#f5f1e8] px-6 py-3 border-t border-[#d4b896] flex justify-between items-center">
                <span className="text-xs text-[#8b7355] font-medium">🤖 AI-Analyzed Case File</span>
                <span className="text-xs text-[#8b7355]">Case #{c.id} • {c.case_type}</span>
            </div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-80px)] bg-[#f5f1e8] relative overflow-hidden">
            {/* BACKGROUND ELEMENTS */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(212,184,150,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(212,184,150,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10 custom-scrollbar">
                {view === "list" ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-6xl mx-auto"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">My Clients</h1>
                                <p className="text-[#666]">Manage detailed client profiles and case history.</p>
                            </div>
                            <button
                                onClick={() => setShowNewClientModal(true)}
                                className="bg-[#f97316] hover:bg-[#ea580c] text-white px-5 py-2.5 rounded-lg shadow-lg shadow-orange-900/10 transition-all flex items-center gap-2"
                            >
                                + New Client
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {clients.map((client) => (
                                <div
                                    key={client.id}
                                    onClick={() => handleClientClick(client.id)}
                                    className="bg-[#f5e6c8]/50 backdrop-blur-sm border border-[#d4b896] rounded-xl p-6 cursor-pointer hover:shadow-xl hover:bg-[#f5e6c8] transition-all duration-200 group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 bg-[#d4b896]/30 rounded-full flex items-center justify-center text-xl font-serif font-bold text-[#6b5744]">
                                            {client.name.charAt(0)}
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {client.status}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-1 group-hover:text-[#f97316] transition-colors">{client.name}</h3>
                                    <p className="text-sm text-[#666] mb-4">{client.email || "No email"}</p>
                                    <div className="pt-4 border-t border-[#d4b896]/30 flex justify-between items-center text-xs text-[#8b7355]">
                                        <span>View Profile</span>
                                        <span>→</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    /* DETAIL VIEW */
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {/* LEFT: Client Info & Cases */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-2">
                                <button onClick={() => setView("list")} className="text-[#666] hover:text-[#1a1a1a] flex items-center gap-1">
                                    ← Back
                                </button>
                                <h1 className="text-2xl font-serif font-bold text-[#1a1a1a]">{selectedClient?.client.name}</h1>
                            </div>

                            {/* Cases List */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-[#6b5744] uppercase tracking-wide">Case Files</h2>
                                    <button
                                        onClick={() => setShowNewCaseModal(true)}
                                        className="text-sm bg-[#1a1a1a] text-[#f5f1e8] px-4 py-2 rounded-lg hover:bg-[#333] transition-colors flex items-center gap-2"
                                    >
                                        <span>✨</span> Add Case (AI Analysis)
                                    </button>
                                </div>

                                {selectedClient?.cases.length === 0 ? (
                                    <div className="bg-white/60 rounded-xl p-12 text-center border border-[#e5e0d5]">
                                        <p className="text-[#8b7355] text-lg mb-2">No cases yet</p>
                                        <p className="text-[#999] text-sm">Click "Add Case" to analyze raw intake notes with AI</p>
                                    </div>
                                ) : (
                                    selectedClient?.cases.map((c: Case) => renderCaseFile(c))
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Chatbot */}
                        <div className="bg-white border-l border-[#e5e0d5] h-[600px] flex flex-col rounded-xl shadow-lg mt-12 overflow-hidden">
                            <div className="p-4 bg-[#1a1a1a] text-[#f5f1e8] flex justify-between items-center">
                                <div>
                                    <h3 className="font-serif font-bold">Legal Assistant</h3>
                                    <p className="text-xs text-gray-400">Context-aware expert</p>
                                </div>
                                <button onClick={() => setChatHistory([{ role: "ai", content: "Chat cleared. How can I help?" }])} className="text-xs text-gray-400 hover:text-white">Clear</button>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 ${msg.role === 'user' ? 'bg-[#1a1a1a]' : 'bg-[#f97316]'}`}>
                                            {msg.role === 'user' ? 'ME' : 'AI'}
                                        </div>
                                        <div className={`p-3 rounded-lg shadow-sm text-sm max-w-[85%] border ${msg.role === 'user' ? 'bg-[#1a1a1a] text-white rounded-tr-none border-[#1a1a1a]' : 'bg-white text-[#333] rounded-tl-none border-gray-100'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="flex gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center text-white text-xs flex-shrink-0">AI</div>
                                        <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm text-sm text-[#333] border border-gray-100 italic text-gray-400">
                                            Thinking...
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 border-t border-gray-200 bg-white">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ask about the recent case..."
                                        className="flex-1 bg-gray-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-[#f97316] outline-none"
                                        value={chatMessage}
                                        onChange={e => setChatMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleChat()}
                                        disabled={chatLoading}
                                    />
                                    <button
                                        onClick={handleChat}
                                        disabled={chatLoading || !chatMessage.trim()}
                                        className="bg-[#1a1a1a] text-white p-2 rounded-lg hover:bg-[#333] disabled:opacity-50 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* NEW CLIENT MODAL */}
            <AnimatePresence>
                {showNewClientModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                            <h2 className="text-xl font-serif font-bold text-[#1a1a1a] mb-4">Add New Client</h2>
                            <input
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg mb-3 focus:outline-none focus:border-[#f97316]"
                                placeholder="Full Name"
                                value={newClientName}
                                onChange={e => setNewClientName(e.target.value)}
                            />
                            <input
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg mb-6 focus:outline-none focus:border-[#f97316]"
                                placeholder="Email Address"
                                value={newClientEmail}
                                onChange={e => setNewClientEmail(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowNewClientModal(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                                <button onClick={handleCreateClient} disabled={loading} className="px-4 py-2 text-sm font-medium bg-[#1a1a1a] text-white rounded hover:bg-black disabled:opacity-50">
                                    {loading ? "Creating..." : "Create Client"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* NEW CASE MODAL (AI) */}
            <AnimatePresence>
                {showNewCaseModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
                            <h2 className="text-xl font-serif font-bold text-[#1a1a1a] mb-2">New Case Analysis</h2>
                            <p className="text-sm text-slate-500 mb-4">Paste raw intake notes below. AI will extract structured facts, parties, evidence, and provide legal recommendations.</p>
                            <textarea
                                className="w-full h-48 p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4 focus:outline-none focus:border-[#f97316] text-sm custom-scrollbar"
                                placeholder={`Example:\nMet with Rajesh Kumar today regarding a property dispute.\nOpponent: Sunil Mehta\nIncident happened on March 15, 2024.\nClient has sale deed, property tax receipts as evidence...\n\nPaste your notes and AI will analyze them.`}
                                value={rawNotes}
                                onChange={e => setRawNotes(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowNewCaseModal(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                                <button onClick={handleAnalyzeCase} disabled={analyzing || !rawNotes.trim()} className="px-4 py-2 text-sm font-medium bg-[#f97316] text-white rounded-lg hover:bg-[#ea580c] disabled:opacity-50 flex items-center gap-2">
                                    {analyzing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Analyzing with Groq AI...
                                        </>
                                    ) : "✨ Analyze & Create Case"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
