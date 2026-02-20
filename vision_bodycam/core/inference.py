# vision_bodycam/core/inference.py

import os
import logging
from typing import Dict, Any
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
logger = logging.getLogger(__name__)

VLLM_URL = os.getenv("VLLM_URL", "http://localhost:8889/v1")

class SafetyAnalyzer:
    def __init__(self, api_url: str = VLLM_URL):
        # We use the OpenAI-compatible client to talk to vLLM
        self.client = OpenAI(base_url=api_url, api_key="EMPTY")
        self.model_name = "cyankiwi/Qwen3-VL-8B-Instruct-AWQ-4bit" # Must match vllm serve argument

    def detect_danger(self, image_b64: str, rag_context: str) -> Dict[str, Any]:
        """
        Standard 4fps Safety Check.
        Returns: { "is_danger": bool, "details": str }
        """
        try:
            prompt = (
                f"Safety Rules Context: {rag_context}\n"
                "Analyze this image. Is the worker wearing required safety gear (helmet, vest)? "
                "If there is a violation, start your response with 'DANGER'. Otherwise say 'SAFE'. "
                "Be concise."
            )
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                    ]
                }],
                temperature=0.1, # Low temp for consistent safety checks
                max_tokens=100
            )
            result_text = response.choices[0].message.content.strip()
            is_danger = result_text.upper().startswith("DANGER")
            return {"is_danger": is_danger, "details": result_text}
        
        except Exception as e:
            logger.error(f"Inference Error in detect_danger: {e}")
            return {"is_danger": False, "details": "Error during inference"}

    def detect_action(self, image_b64: str) -> str:
        """Determines the broad action the worker is currently performing."""
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "In two words or less, what physical task is the worker performing? (e.g., 'climbing ladder', 'welding', 'walking', 'operating machinery')"},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                    ]
                }],
                temperature=0.1,
                max_tokens=10
            )
            return response.choices[0].message.content.strip().lower()
        except Exception as e:
            logger.error(f"Action Detection Error: {e}")
            return "general work"

    def answer_question(self, image_b64: str, question: str, recent_context: str) -> str:
        """Answers a user question utilizing short-term memory and the current frame."""
        try:
            prompt = (
                f"Recent Event History: {recent_context}\n"
                f"User Question: {question}\n"
                "Provide a clear, conversational, and direct answer based on the recent events and the current image. "
                "Keep the answer short so it can be played back as an audio response."
            )
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                    ]
                }],
                temperature=0.4,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Inference Error in answer_question: {e}")
            return "I'm having trouble analyzing the scene right now. Please try again."

   

# Global instance to be used by main.py
# We instantiate it as None first, then load it on startup event
analyzer_instance = None