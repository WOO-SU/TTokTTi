# gpu-server/core/inference.py
from vllm import LLM, SamplingParams
from transformers import AutoTokenizer
import base64
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

VLLM_URL=os.getenv("VLLM_URL", "http://localhost:8888/v1")

class SafetyAnalyzer:
    def __init__(self, api_url=VLLM_URL):
        # We use the OpenAI-compatible client to talk to vLLM
        self.client = OpenAI(base_url=api_url, api_key="EMPTY")
        self.model_name = "cyankiwi/Qwen3-VL-8B-Instruct-AWQ-4bit" # Must match vllm serve argument

    def detect_danger(self, image_b64: str, rag_context: str) -> dict:
        """
        Standard 4fps Safety Check.
        Returns: { "is_danger": bool, "details": str }
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Context: {rag_context}. Analyze this image. Is the worker wearing required safety gear (helmet, vest)? If there is a violation, start your response with 'DANGER'. Otherwise say 'SAFE'."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                    ]
                }],
                temperature=0.1, # Low temp for consistent safety checks
                max_tokens=100
            )
            result_text = response.choices[0].message.content
            
            is_danger = "DANGER" in result_text.upper()
            return {"is_danger": is_danger, "details": result_text}
        
        except Exception as e:
            print(f"Inference Error: {e}")
            return {"is_danger": False, "details": "Error during inference"}

   

# Global instance to be used by main.py
# We instantiate it as None first, then load it on startup event
analyzer_instance = None