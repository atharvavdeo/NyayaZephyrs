from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
import os
from database_manager import get_db_router

router = APIRouter()

class DraftingRequest(BaseModel):
    case_id: int
    user_id: int
    current_text: str
    instruction: str # e.g. "Draft an introduction", "Add jurisdiction clause"
    context: Optional[str] = None # Extra context

class DraftingResponse(BaseModel):
    suggestion: str
    reasoning: Optional[str]
    citations: List[str] = []

@router.post("/suggest", response_model=DraftingResponse)
async def suggest_drafting(request: DraftingRequest):
    """
    Generate legal drafting content based on instructions and case context.
    Enforces Harvard Bluebook citation style where applicable.
    """
    try:
        db = get_db_router()
        case_evidence = db.get_case_evidence(request.user_id, request.case_id)
        
        # Get case info if needed (not fully implemented in DB to get simple details, 
        # assume basic context is enough or we fetch case meta)
        
        # Configure Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="API Key missing")
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash') # Use stable for text

        prompt = f"""
        You are a senior legal drafting assistant.
        Task: {request.instruction}
        
        Current Document Text:
        {request.current_text[-1000:]} # Context of last 1000 chars

        Requirements:
        1. Use professional legal terminology.
        2. Format citations in Harvard Bluebook style.
        3. Be concise and precise.
        4. If creating a new clause, ensure it is robust.
        
        Evidence Context: {len(case_evidence)} files available.
        
        Output ONLY the suggested text, followed by a separator "---" and then brief reasoning/notes.
        """

        response = model.generate_content(prompt)
        text = response.text
        
        parts = text.split("---")
        suggestion = parts[0].strip()
        reasoning = parts[1].strip() if len(parts) > 1 else "Generated based on legal standards."
        
        return {
            "suggestion": suggestion,
            "reasoning": reasoning,
            "citations": [] 
        }

    except Exception as e:
        print(f"Drafting error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
