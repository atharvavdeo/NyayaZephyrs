import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv("Backend/legal_researcher/.env")
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("No API key found")
    exit(1)

genai.configure(api_key=api_key)

print("Available models:")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error listing models: {e}")
