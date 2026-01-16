
import requests
import json
import sys

API_BASE = "http://localhost:8000"

def test_drafting():
    print("Testing Drafting API...")
    url = f"{API_BASE}/legal/draft/suggest"
    
    payload = {
        "case_id": 1,
        "user_id": 1,
        "current_text": "The client is accused of...",
        "instruction": "Draft a formal introduction for a legal notice.",
        "context": "Civil dispute, breach of contract"
    }
    
    try:
        print(f"Sending POST to {url}")
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("Success!")
            print(json.dumps(response.json(), indent=2))
        else:
            print("Failed!")
            print(response.text)
            
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    test_drafting()
