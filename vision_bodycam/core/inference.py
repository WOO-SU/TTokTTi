# vision_bodycam/core/inference.py

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
        
        # Initialize Dual-Memory RAG System
        self.memory_manager = MemoryManager()
        self.consolidation_task = None

    def start_background_tasks(self):
        """Starts the background memory consolidation worker. MUST be called inside a running event loop."""
        if self.consolidation_task is None:
            self.consolidation_task = asyncio.create_task(self._memory_consolidation_worker(interval=30))

    async def _memory_consolidation_worker(self, interval: int):
        """Background loop to periodically summarize and embed the short-term buffer."""
        while True:
            await asyncio.sleep(interval)
            try:
                short_term_text = self.memory_manager.get_short_term_context()
                if short_term_text == "No recent events logged.":
                    continue
                
                logger.info("[MEMORY] Summarizing short-term buffer for long-term storage...")
                prompt = (
                    "You are an AI assistant summarizing worker activities. "
                    "Briefly summarize the following chronological sequence of events into a concise 1-2 sentence description in Korean. "
                    f"Events:\n{short_term_text}"
                )
                
                response = await self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3, 
                    max_tokens=80,
                    stream=False
                )
                
                summary = response.choices[0].message.content.strip()
                self.memory_manager.add_to_long_term_memory(summary)
            except Exception as e:
                logger.error(f"Error in memory consolidation worker: {e}")

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

    async def detect_danger(self, frames: List[str]) -> Dict[str, Any]:
        """Fast Loop: Analyzes current scene, outputs safety status, and logs description to Memory."""
        try:
            # Query memory context before inference
            context_query = "작업자 위험 요소 안전 수칙 (Worker hazards and safety rules)"
            rag_data = self.memory_manager.retrieve_context(context_query, top_k=2)
            
            rules_text = "\n".join(rag_data["safety_rules"])
            long_term_text = "\n".join(rag_data["long_term_memories"])
            short_term_text = self.memory_manager.get_short_term_context()

            # [VINCI INTEGRATION] Combine Contexts + Ask for Scene Description AND Safety Check
            prompt = (
                f"Safety Rules Context:\n{rules_text}\n\n"
                f"Long-Term Past Context:\n{long_term_text}\n\n"
                f"Immediate Short-Term History:\n{short_term_text}\n\n"
                "You are a safety inspector viewing the last 3 seconds of a worker's bodycam. "
                "Task 1: Describe the worker's current action in one factual sentence.\n"
                "Task 2: On a new line, evaluate safety. If there is a violation based on the rules or context, write exactly 'DANGER:' followed by the reason. If safe, write exactly 'SAFE'."
            )

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": self._build_multi_frame_content(prompt, frames)}],
                temperature=0.1, 
                max_tokens=150,
                stream=False
            )

            result_text = response.choices[0].message.content.strip()
            
            # Parse Task 1 (Description) and Task 2 (Safety Status)
            lines = [line.strip() for line in result_text.split('\n') if line.strip()]
            action_description = lines[0]
            safety_eval = lines[-1] if len(lines) > 1 else lines[0]

            # Write the new description into Short-Term Memory
            self.memory_manager.add_to_short_term_memory(time.time(), action_description)

            is_danger = safety_eval.upper().startswith("DANGER")
            return {"is_danger": is_danger, "details": safety_eval, "action_logged": action_description}

        except Exception as e:
            logger.error(f"Inference Error in detect_danger: {e}")
            return {"is_danger": False, "details": "Error during inference"}

    async def detect_action(self, frames: List[str]) -> str:
        """Slow Loop: Broad action determination."""
        try:
            prompt = "In two words or less, what physical task is the worker performing across these frames?"
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": self._build_multi_frame_content(prompt, frames)}],
                temperature=0.1,
                max_tokens=10,
                stream=False
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Action Detection Error: {e}")
            return "general work"

    async def answer_question(self, frames: List[str], question: str) -> AsyncGenerator[str, None]:
        """Asynchronous streaming to answer user questions using full historical context."""
        try:
            # Dynamically retrieve memories based on the user's specific question
            rag_data = self.memory_manager.retrieve_context(question, top_k=3)
            
            rules_text = "\n".join(rag_data["safety_rules"])
            long_term_text = "\n".join(rag_data["long_term_memories"])
            short_term_text = self.memory_manager.get_short_term_context()

            # [VINCI INTEGRATION] Temporal Grounding Prompting
            prompt = (
                f"Safety Rules Reference:\n{rules_text}\n\n"
                f"Long-Term Memory Timeline (Past Events):\n{long_term_text}\n\n"
                f"Short-Term Timeline (Recent Events):\n{short_term_text}\n\n"
                "You are an egocentric AI assistant analyzing the user's view in real time. "
                f"User Question: {question}\n"
                "Provide a clear, conversational answer addressing the user directly. Base your answer on the chronological timelines, rules, and the provided frames."
            )

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": self._build_multi_frame_content(prompt, frames)}],
                temperature=0.4,
                max_tokens=200,
                stream=True
            )

            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"Inference Error in answer_question: {e}")
            yield "I'm having trouble analyzing the scene right now."

analyzer_instance = None