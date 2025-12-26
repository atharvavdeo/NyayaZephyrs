import json
import os
from groq import Groq
from fpdf import FPDF
from database_manager import DatabaseManager

# Get API key from environment or use default
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")

class CaseGenerator:
    def __init__(self, api_key: str = None):
        self.client = Groq(api_key=api_key or GROQ_API_KEY)
        self.db = DatabaseManager()

    def generate_case_structure(self, raw_text: str) -> dict:
        """
        Sends raw text to Groq and asks for a STRICT JSON output.
        Minimizes tokens by asking for specific fields only.
        """
        prompt = f"""
        Analyze the following legal intake notes. Extract key details into a JSON object.
        Fields required: "client_name", "opposing_party", "incident_date", "legal_issue_summary", "key_evidence_list", "applicable_laws", "recommended_actions".
        
        Intake Notes:
        {raw_text}
        
        Respond ONLY with the JSON object.
        """

        try:
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a legal data extractor. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistency
                response_format={"type": "json_object"}
            )
            
            # Parse the result
            structured_data = json.loads(completion.choices[0].message.content)
            return structured_data
            
        except Exception as e:
            print(f"❌ Error generating case: {e}")
            return None

    def export_case_to_pdf(self, case_id: int, user_id: int = None) -> str:
        """Generates a PDF summary of the case. Returns filename."""
        if user_id is None:
             print("❌ Error: user_id required for multi-tenant access")
             return None

        # Secure DB access
        case = self.db.get_case(user_id, case_id)
        if not case:
            print("❌ Case not found or access denied.")
            return None

        try:
            data = json.loads(case['structured_data'])
        except:
            data = {}
        
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        
        # Header
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(200, 10, txt=f"Client Case File: #{case['case_id']}", ln=1, align='C')
        
        pdf.set_font("Arial", size=10)
        pdf.cell(200, 10, txt=f"Created: {case['created_at']}", ln=1, align='C')
        
        pdf.ln(10)
        
        # Add details
        for key, value in data.items():
            formatted_key = key.replace("_", " ").title()
            
            # Handle list items (like evidence)
            if isinstance(value, list):
                value = "\n  - " + "\n  - ".join(str(v) for v in value)
            
            pdf.set_font("Arial", 'B', 12)
            pdf.cell(60, 8, txt=f"{formatted_key}:", ln=0)
            pdf.set_font("Arial", size=11)
            
            # Use multi_cell for long content
            if len(str(value)) > 50:
                pdf.ln(8)
                pdf.set_x(20)
                pdf.multi_cell(170, 6, txt=str(value))
            else:
                pdf.cell(0, 8, txt=str(value), ln=1)
            
            pdf.ln(2)

        # Create exports directory
        os.makedirs("exports", exist_ok=True)
        
        client_name = data.get('client_name', 'Client').replace(" ", "_").replace("/", "-")
        filename = f"exports/Case_{case_id}_{client_name}.pdf"
        pdf.output(filename)
        
        print(f"✅ PDF exported successfully: {filename}")
        return filename
