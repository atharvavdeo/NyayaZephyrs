
import os
import sys
from dotenv import load_dotenv

# Add backend to path to import EvidenceAnalyzer
sys.path.append(os.path.join(os.getcwd(), "Backend/legal_researcher"))
from evidence_analyzer import EvidenceAnalyzer

def test_evidence_analysis():
    print("Testing Evidence Analysis...")
    image_path = "/Users/atharvadeo/Desktop/PROF/Hackies/Zeroday/Screenshot 2026-01-16 at 12.53.21 PM.png"
    
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return

    try:
        analyzer = EvidenceAnalyzer()
        print(f"Analyzer initialized with model: {analyzer.model.model_name}")
        
        print(f"Analyzing {image_path}...")
        result = analyzer.analyze_image(image_path, case_type="general", description="User screenshot for debugging")
        
        if result["success"]:
            print("\nAnalysis Success!")
            print("-" * 50)
            print(analyzer.generate_evidence_report(result))
            print("-" * 50)
        else:
            print("\nAnalysis Failed!")
            print(result.get("error"))
            
    except Exception as e:
        print(f"Execution Error: {e}")

if __name__ == "__main__":
    test_evidence_analysis()
