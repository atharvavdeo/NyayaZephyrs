import os
import json
from groq import Groq
from database_manager import DatabaseManager
from rate_limiter import RateLimiter

# Get API key from environment or use default
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")

class SecureChatbot:
    """
    Context-aware legal chatbot that:
    1. Fetches case data (structured JSON) from DB
    2. Fetches last N messages from DB
    3. Rate limits requests
    4. Saves all conversations to DB
    """
    
    def __init__(self, api_key: str = None):
        self.client = Groq(api_key=api_key or GROQ_API_KEY)
        self.db = DatabaseManager()
        self.rate_limiter = RateLimiter(tokens_per_minute=20)  # Security layer

    def chat_with_case(self, case_id: int, user_query: str) -> str:
        """
        Context-Aware Chat.
        1. Fetches Case Data (Structured JSON) from DB.
        2. Fetches Last 5 Messages from DB.
        3. Sends to Groq.
        4. Saves response to DB.
        """
        
        # 1. Security Check - Rate Limiting
        if not self.rate_limiter.try_acquire():
            wait_time = self.rate_limiter.get_wait_time()
            return f"⚠️ Rate limit exceeded. Please wait {wait_time:.0f} seconds."

        # 2. Get Case Context
        case_row = self.db.get_case(case_id)
        if not case_row:
            return "❌ Error: Case ID not found."
        
        case_data = json.loads(case_row['structured_data'])
        
        # 3. Get Conversation History (Last 5)
        history_rows = self.db.get_chat_history(case_id, limit=5)
        
        # 4. Construct Prompt (Token Optimized)
        # We inject the structured data into the system prompt.
        messages = [
            {
                "role": "system", 
                "content": f"""You are a legal assistant analyzing Case #{case_id}.
                
Here are the FACTS of this case:
{json.dumps(case_data, indent=2)}

Instructions:
- Answer based ONLY on these facts and general legal principles
- Be concise and professional
- Cite specific facts from the case when relevant
- If asked about something not in the case facts, clearly state that"""
            }
        ]
        
        # Add history
        for row in history_rows:
            messages.append({"role": row['role'], "content": row['content']})
            
        # Add current query
        messages.append({"role": "user", "content": user_query})

        try:
            # 5. Call API
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.3,
                max_tokens=500
            )
            response = completion.choices[0].message.content
            
            # 6. Save to DB (Both user query and assistant response)
            self.db.add_chat_log(case_id, "user", user_query)
            self.db.add_chat_log(case_id, "assistant", response)
            
            return response
            
        except Exception as e:
            return f"❌ API Error: {e}"
    
    def get_case_summary(self, case_id: int) -> str:
        """Returns a formatted summary of the case."""
        case_row = self.db.get_case(case_id)
        if not case_row:
            return "Case not found."
        
        data = json.loads(case_row['structured_data'])
        
        summary = f"\n{'='*50}\n"
        summary += f"📁 CASE #{case_id} SUMMARY\n"
        summary += f"{'='*50}\n"
        
        for key, value in data.items():
            formatted_key = key.replace("_", " ").title()
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            summary += f"• {formatted_key}: {value}\n"
        
        summary += f"{'='*50}\n"
        return summary
