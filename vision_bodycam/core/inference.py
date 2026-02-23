# vision_bodycam/core/inference.py

import os
import logging
from typing import Dict, Any
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()
logger = logging.getLogger(__name__)

VLLM_URL = os.getenv("VLLM_URL", "http://localhost:8889/v1")

class SafetyAnalyzer:
    def __init__(self, api_url: str = VLLM_URL):
        # We use the OpenAI-compatible client to talk to vLLM
        self.client = AsyncOpenAI(base_url=api_url, api_key="EMPTY")
        self.model_name = "cyankiwi/Qwen3-VL-8B-Instruct-AWQ-4bit" # Must match vllm serve argument

    def _format_image_url(self, image_b64: str) -> str:
        """Ensures the base64 string has the correct prefix exactly once."""
        if image_b64.startswith("data:image"):
            return image_b64
        return f"data:image/jpeg;base64,{image_b64}"

    async def detect_danger(self, image_b64: str, rag_context: str) -> Dict[str, Any]:
        """
        Standard 4fps Safety Check.
        Returns: { "is_danger": bool, "details": str }
        """
        try:
            prompt = (
                f"Safety Rules Context: {rag_context}\n"
                "You are a safety inspector. Analyze this image. Is the worker wearing required safety gear or performing a safe action? "
                "If there is a safety violation, you MUST start your response exactly with 'DANGER:' followed by a brief 1-sentence explanation of the hazard. "
                "If everything is safe, reply only with 'SAFE'."
            )
            
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": self._format_image_url(image_b64)}}
                    ]
                }],
                temperature=0.1, # Low temp for consistent safety checks
                max_tokens=100
            )

            # 1. Safe Extraction: Check if choices exist
            if not getattr(response, 'choices', None) or len(response.choices) == 0:
                logger.warning("vLLM returned an empty choices list in detect_danger.")
                return {"is_danger": False, "details": "SAFE - Model returned an empty response."}

            message = response.choices[0].message
            
            # 2. Safe Extraction: Check if content exists
            if not getattr(message, 'content', None):
                logger.warning("vLLM returned a message with no content in detect_danger.")
                return {"is_danger": False, "details": "SAFE - Model could not process this image."}

            # 3. Handle edge cases where content is returned as a list of dicts
            if isinstance(message.content, list):
                result_text = message.content[0].get("text", "").strip()
            else:
                result_text = str(message.content).strip()

            # For debugging
            print(f"[vLLM OUTPUT]: {result_text}")
                
            # 4. Standardize empty text fallbacks
            if not result_text:
                logger.warning("vLLM returned an empty text string in detect_danger.")
                return {"is_danger": False, "details": "SAFE - Empty text returned."}

            # 5. Evaluate the final text
            is_danger = result_text.upper().startswith("DANGER")
            return {"is_danger": is_danger, "details": result_text}
        
        except Exception as e:
            logger.error(f"Inference Error in detect_danger: {e}")
            return {"is_danger": False, "details": "Error during inference"}

    async def detect_action(self, image_b64: str) -> str:
        """Determines the broad action the worker is currently performing."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "In two words or less, what physical task is the worker performing? (e.g., 'climbing ladder', 'welding', 'walking', 'operating machinery')"},
                        {"type": "image_url", "image_url": {"url": self._format_image_url(image_b64)}}
                    ]
                }],
                temperature=0.1,
                max_tokens=10
            )

            logger.info(f"Raw vLLM Response: {response}")
            if not getattr(response, 'choices', None) or len(response.choices) == 0:
                logger.warning("vLLM returned an empty choices list.")
                return "Error: The vision model returned an empty response."

            message = response.choices[0].message

            if not getattr(message, 'content', None):
                logger.warning("vLLM returned a message with no content.")
                return "Error: The model could not process this image."

            # 4. Handle edge cases where content is returned as a list of dicts
            if isinstance(message.content, list):
                return message.content[0].get("text", "").strip()

            return str(message.content).strip()

        except Exception as e:
            logger.error(f"Action Detection Error: {e}")
            return "general work"

    async def answer_question(self, image_b64: str, question: str, recent_context: str) -> str:
        """Answers a user question utilizing short-term memory and the current frame."""
        try:
            prompt = (
                f"Recent Event History: {recent_context}\n"
                f"User Question: {question}\n"
                "Provide a clear, conversational, and direct answer based on the recent events and the current image. "
                "Keep the answer short so it can be played back as an audio response."
            )
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": self._format_image_url(image_b64)}}
                    ]
                }],
                temperature=0.4,
                max_tokens=150
            )

            logger.info(f"Raw vLLM Response: {response}")
            if not getattr(response, 'choices', None) or len(response.choices) == 0:
                logger.warning("vLLM returned an empty choices list.")
                return "Error: The vision model returned an empty response."

            message = response.choices[0].message

            if not getattr(message, 'content', None):
                logger.warning("vLLM returned a message with no content.")
                return "Error: The model could not process this image."

            # 4. Handle edge cases where content is returned as a list of dicts
            if isinstance(message.content, list):
                return message.content[0].get("text", "").strip()

            return str(message.content).strip()
            
        except Exception as e:
            logger.error(f"Inference Error in answer_question: {e}")
            return "I'm having trouble analyzing the scene right now. Please try again."

   

# Global instance to be used by main.py
# We instantiate it as None first, then load it on startup event
analyzer_instance = None