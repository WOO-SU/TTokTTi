import os
import time
import asyncio
import logging
from typing import Dict, Any, List, AsyncGenerator
from dotenv import load_dotenv
from openai import AsyncOpenAI
from .rag import MemoryManager

load_dotenv()
logger = logging.getLogger(__name__)

VLLM_URL = os.getenv("VLLM_URL", "http://localhost:8889/v1")

class SafetyAnalyzer:
    def __init__(self, api_url: str = VLLM_URL):
        self.client = AsyncOpenAI(base_url=api_url, api_key="EMPTY")
        self.model_name = "cyankiwi/Qwen3-VL-8B-Instruct-AWQ-4bit"
        self.memory_manager = MemoryManager()

    def _format_image_url(self, image_b64: str) -> str:
        if image_b64.startswith("data:image"):
            return image_b64
        return f"data:image/jpeg;base64,{image_b64}"

    def _build_multi_frame_content(self, text_prompt: str, frames: List[str]) -> List[Dict[str, Any]]:
        content = [{"type": "text", "text": text_prompt}]
        for b64 in frames:
            content.append({
                "type": "image_url", 
                "image_url": {"url": self._format_image_url(b64)}
            })
        return content

    async def detect_danger(self, frames: List[str], ltm: List[str], stm: List[str]) -> Dict[str, Any]:
        """Fast Loop: Detects danger and provides a brief observation of the current scene."""
        try:
            rag_data = self.memory_manager.retrieve_context("safety hazards", top_k=2)
            rules_text = "\n".join(rag_data["safety_rules"])
            
            history_context = f"LTM:\n{chr(10).join(ltm)}\n\nRecent STM:\n{chr(10).join(stm)}"

            prompt = (
                f"Safety Rules:\n{rules_text}\n\n"
                f"History:\n{history_context}\n\n"
                "Task 1: Describe the worker's current action in exactly one sentence (max 10 words).\n"
                "Task 2: Evaluate safety. If there is a violation, write 'DANGER: <reason>'. Otherwise write 'SAFE'."
            )

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": self._build_multi_frame_content(prompt, frames)}],
                temperature=0.1, 
                max_tokens=100
            )

            res = response.choices[0].message.content.strip().split('\n')
            observation = res[0].strip()
            safety_eval = res[-1].strip()

            return {
                "is_danger": safety_eval.upper().startswith("DANGER"),
                "danger_reason": safety_eval if safety_eval.upper().startswith("DANGER") else "",
                "observation": observation
            }
        except Exception as e:
            logger.error(f"Inference Error: {e}")
            return {"is_danger": False, "danger_reason": "", "observation": "Worker performing task."}

    async def compress_memory(self, stm_logs: List[str]) -> str:
        """Slow Loop: Compresses 5 seconds of STM observations into a 1-sentence summary."""
        try:
            logs_text = "\n".join(stm_logs)
            prompt = f"Summarize these chronological observations into one concise sentence in Korean:\n{logs_text}"
            
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=60
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Compression Error: {e}")
            return "작업 수행 중"

    async def answer_question(self, frames: List[str], question: str, ltm: List[str], stm: List[str], timestamp: str) -> AsyncGenerator[str, None]:
        """Answers user questions using full LTM, STM, and RAG rules."""
        try:
            rag_data = self.memory_manager.retrieve_context(question, top_k=2)
            rules_text = "\n".join(rag_data["safety_rules"])

            prompt = (
                f"Safety Rules:\n{rules_text}\n\n"
                f"Video History (Long-Term):\n{chr(10).join(ltm)}\n\n"
                f"Current Time: {timestamp}. Recent Events (Short-Term):\n{chr(10).join(stm)}\n\n"
                f"User Question: {question}\n"
                "Answer the user directly based on the frames and history provided."
            )

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": self._build_multi_frame_content(prompt, frames)}],
                temperature=0.4,
                max_tokens=200,
                stream=True
            )

            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"QA Error: {e}")
            yield "분석 중 오류가 발생했습니다."