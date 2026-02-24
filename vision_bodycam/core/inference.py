# vision_bodycam/core/inference.py

import os
import logging
from typing import Dict, Any, List, AsyncGenerator
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

    def _build_multi_frame_content(self, text_prompt: str, frames: List[str]) -> List[Dict[str, Any]]:
        """
        [VINCI INTEGRATION] Multi-Frame Prompting 
        Builds the payload stacking multiple chronological frames for vLLM natively.
        """
        content = [{"type": "text", "text": text_prompt}]
        for b64 in frames:
            content.append({
                "type": "image_url", 
                "image_url": {"url": self._format_image_url(b64)}
            })
        return content

    async def detect_danger(self, frames: List[str], rag_context: str) -> Dict[str, Any]:
        """
        Fast Loop (Blocking): Standard non-streaming safety check over recent frames.
        """
        try:
            prompt = (
                f"Safety Rules Context: {rag_context}\n"
                "You are a safety inspector viewing the last 3 seconds of a worker's bodycam. "
                "Is the worker wearing required safety gear or performing a safe action? "
                "If there is a safety violation, you MUST start your response exactly with 'DANGER:' followed by a brief 1-sentence explanation of the hazard. "
                "If everything is safe, reply only with 'SAFE'."
            )

            prompt_debug = (
                f"Safety Rules Context: {rag_context}\n"
                "You are viewing the last 3 seconds of a worker's bodycam. "
                "Describe The current situation, based on the video and the context."    
            )

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user", 
                    "content": self._build_multi_frame_content(prompt, frames)}],
                temperature=0.1, 
                max_tokens=100,
                stream=False # Explicitly Blocking
            )

            message = response.choices[0].message
            result_text = message.content[0].get("text", "").strip() if isinstance(message.content, list) else str(message.content).strip()

<<<<<<< Updated upstream
            # 3. Handle edge cases where content is returned as a list of dicts
            if isinstance(message.content, list):
                result_text = message.content[0].get("text", "").strip()
            else:
                result_text = str(message.content).strip()

            # For debugging
            print(f"[vLLM OUTPUT]: {result_text}")
                
            # 4. Standardize empty text fallbacks
=======
>>>>>>> Stashed changes
            if not result_text:
                return {"is_danger": False, "details": "SAFE - Empty text returned."}

            return {"is_danger": result_text.upper().startswith("DANGER"), "details": result_text}

        except Exception as e:
            logger.error(f"Inference Error in detect_danger: {e}")
            return {"is_danger": False, "details": "Error during inference"}

    async def detect_action(self, frames: List[str]) -> str:
        """Slow Loop (Blocking): Determines broad action context from recent frames."""
        try:
            prompt = "In two words or less, what physical task is the worker performing across these frames?"
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": self._build_multi_frame_content(prompt, frames)}],
                temperature=0.1,
                max_tokens=10,
                stream=False
            )

            message = response.choices[0].message
            return message.content[0].get("text", "").strip() if isinstance(message.content, list) else str(message.content).strip()

        except Exception as e:
            logger.error(f"Action Detection Error: {e}")
            return "general work"

    async def answer_question(self, image_b64: str, question: str, recent_context: str) -> str:
        """
        Asynchronous streaming via AsyncOpenAI to yield text chunks immediately.
        """
        try:
            prompt = (
                f"Recent Event History Timeline:\n{recent_context}\n"
                "You are an egocentric AI assistant analyzing the user's view in real time. "
                f"User Question: {question}\n"
                "Provide a clear, conversational answer directly addressing the user based on the timeline and chronological frames."
            )
            
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user", 
                    "content": self._build_multi_frame_content(prompt, frames)}],
                temperature=0.4,
                max_tokens=150,
                stream=True # Mixed streaming toggled ON
            )

            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"Inference Error in answer_question: {e}")
            yield "I'm having trouble analyzing the scene right now."
   

# Global instance to be used by main.py
# We instantiate it as None first, then load it on startup event
analyzer_instance = None