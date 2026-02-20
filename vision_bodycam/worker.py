import asyncio
import json
import logging
import os
import signal
import threading
from collections import OrderedDict, deque
from typing import Any, Dict, Optional

import httpx
import redis.asyncio as redis
from dotenv import load_dotenv

from core.inference import SafetyAnalyzer
from core.rag import DynamicRetriever

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - WORKER - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
VLLM_URL = os.getenv("VLLM_URL", "http://localhost:8889/v1")
DJANGO_API_URL = os.getenv("DJANGO_API_URL", "http://localhost:8000/api/incidents/")
DJANGO_API_KEY = os.getenv("DJANGO_API_KEY", "secret_internal_key")

# --- Short-Term Memory Cache ---
class FIFOSafeCache:
    def __init__(self, capacity: int):
        self.cache = OrderedDict()
        self.capacity = capacity
        self.lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self.lock:
            if key not in self.cache:
                return None
            self.cache.move_to_end(key)
            return self.cache[key]

    def put(self, key: str, value: Any):
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            self.cache[key] = value
            if len(self.cache) > self.capacity:
                self.cache.popitem(last=False)

client_states = {}
FRAMES_BETWEEN_ACTION_CHECKS = 20
memory_cache = FIFOSafeCache(capacity=100)
MAX_FRAMES_PER_CLIENT = 5

# Initialize Logic Modules
redis_client = redis.from_url(REDIS_URL, decode_responses=True)
analyzer = SafetyAnalyzer(api_url=VLLM_URL) # Connects to local vLLM
retriever = DynamicRetriever()
shutdown_event = asyncio.Event()

async def report_to_django(user_id, image_b64, reason: str):
    """Async fire-and-forget report to backend"""
    async with httpx.AsyncClient() as client:
        try:
            payload = {
                "user_id": user_id, 
                "description": reason, 
                "image_base64": image_b64,
            }

            response = await client.post(
                DJANGO_API_URL, 
                json=payload,
                headers={
                    "X-Internal-Key": DJANGO_API_KEY,
                    "Content-Type": "'application/json"
                
                },
                timeout=10.0
            )

            if response.status_code == 201:
                logger.info(f"Reported violation to backend for {user_id}")
            else:
                logger.warning(f"Backend Error {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Django Report Failed: {e}")

def update_client_memory(client_id: str, image_b64: str, safety_result: Dict[str, Any]):
    """Stores recent frames and events in the FIFO cache."""
    client_memory = memory_cache.get(client_id) or deque(maxlen=MAX_FRAMES_PER_CLIENT)
    # Store the image and the AI's observation of that frame
    client_memory.append({
        "image": image_b64,
        "observation": safety_result.get("details", "No observation")
    })
    memory_cache.put(client_id, client_memory)

async def process_job(queue_name, payload):
    """Handles a single job from Redis"""
    try:
        data = json.loads(payload)
        client_id = data["client_id"]
        content = data["data"]
        image_b64 = content.get("image")

        if not image_b64: return

        # Initialize client state if new
        if client_id not in client_states:
            client_states[client_id] = {
                "frame_count": 0,
                "current_rule": retriever.get_context("general work") # Default RAG
            }

        # --- BRANCH 1: User Question (Priority) ---
        if queue_name == "questions":
            user_text = content.get("text", "What do you see?")
            logger.info(f"Processing Question for {client_id}: {user_text}")

            recent_memory = memory_cache.get(client_id)
            context_text = "Recent observations: "

            if recent_memory:
                context_text += " | ".join([m["observation"] for m in recent_memory])
            else:
                context_text += "No recent context available."
            
            answer = analyzer.answer_question(image_b64, user_text, context_text)
            
            # Send Answer Back
            await redis_client.publish(f"alerts:{client_id}", json.dumps({
                "type": "ANSWER",
                "message": answer
            }))

        elif queue_name == "video_frames":
            state = client_states[client_id]
            state["frame_count"] += 1

            # --- THE SLOW LOOP: Action Recognition & RAG Update ---
            if state["frame_count"] % FRAMES_BETWEEN_ACTION_CHECKS == 1:
                # 1. Ask the VLM what the worker is doing right now
                current_action = analyzer.detect_action(image_b64)
                
                # 2. Do the Vector Math / DB Lookup based on the action
                new_rule = retriever.get_context(query=current_action)
                
                # 3. Cache the specific manual rule
                state["current_rule"] = new_rule
                logger.info(f"[{client_id}] Context Updated -> Action: {current_action} | Rule: {new_rule}")

            # 1. Get Context
            active_rules = state["current_rule"]
                    
            # 2. Run Inference
            result = analyzer.detect_danger(image_b64, active_rules)

            update_client_memory(client_id, image_b64, result)
            
            # 3. If Danger, Alert & Report
            if result["is_danger"]:
                logger.warning(f"DANGER DETECTED: {client_id} - {result['details']}")
                
                # A. Alert Phone
                await redis_client.publish(f"alerts:{client_id}", json.dumps({
                    "type": "DANGER",
                    "message": "Safety Violation Detected",
                    "details": result["details"]
                }))
                
                # B. Report to Django
                asyncio.create_task(report_to_django(client_id, image_b64, result["details"]))

    except Exception as e:
        logger.error(f"Job Processing Error: {e}", exc_info=True)

async def main():
    logger.info("GPU Worker Started... Waiting for Redis jobs.")

    # Graceful shutdown handler
    def handle_shutdown():
        logger.info("Shutdown signal received. Stopping worker...")
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, handle_shutdown)

    while not shutdown_event.is_set():
        try:
            # Priority Pop: Check 'questions' first, then 'video_frames'
            # brpop blocks until data is available, preventing high CPU usage
            item = await redis_client.brpop(["questions", "video_frames"], timeout=1.0)
            
            if item:
                queue_name, payload = item
                await process_job(queue_name, payload)
        
        except Exception as e:
            logger.error(f"Redis polling error: {e}")
            await asyncio.sleep(1)
            
    await redis_client.aclose()
    logger.info("Worker stopped cleanly.")

if __name__ == "__main__":
    asyncio.run(main())