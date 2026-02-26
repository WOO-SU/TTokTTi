import asyncio
import json
import logging
import os
import signal
import threading
from collections import OrderedDict, deque
from typing import Any, Dict, Optional
from datetime import datetime, timezone

import httpx
import redis.asyncio as redis
from dotenv import load_dotenv

from core.inference import SafetyAnalyzer
# Removed DynamicRetriever import as SafetyAnalyzer handles RAG internally now

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - WORKER - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
VLLM_URL = os.getenv("VLLM_URL", "http://localhost:8889/v1")
DJANGO_API_URL = os.getenv("DJANGO_API_URL", "http://localhost:8000/api/incidents/")
DJANGO_API_KEY = os.getenv("DJANGO_API_KEY", "secret_internal_key")

# --- Short-Term Memory Cache (Now only tracks frames, not text context) ---
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

FRAMES_BETWEEN_ACTION_CHECKS = 20
MAX_RECENT_FRAMES = 3
client_memory_cache = FIFOSafeCache(capacity=100)

# Initialize Logic Modules
redis_client = redis.from_url(REDIS_URL, decode_responses=True)
analyzer = SafetyAnalyzer(api_url=VLLM_URL) # Now contains built-in MemoryManager
shutdown_event = asyncio.Event()

async def report_to_django(user_id: str, reason: str, timestamp: str):
    """Async fire-and-forget report to backend (Lightweight Payload)"""
    async with httpx.AsyncClient() as client:
        try:
            session_meta = await redis_client.hgetall(f"session_meta:{user_id}")
            payload = {
                "user_id": user_id, 
                "description": reason, 
                "timestamp": timestamp,
                "worksession_id": session_meta.get("worksession_id"),
                "risk_type_id": session_meta.get("risk_type_id"),
                "video_path": session_meta.get("video_path")
            }

            response = await client.post(
                DJANGO_API_URL, 
                json=payload,
                headers={
                    "X-Internal-Key": DJANGO_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=5.0 
            )

            if response.status_code == 201:
                logger.info(f"Reported violation to backend for {user_id} at {timestamp}")
            else:
                logger.warning(f"Backend Error {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Django Report Failed: {e}")

async def process_job(queue_name, payload):
    """Handles a single job from Redis"""
    try:
        data = json.loads(payload)
        client_id = data["client_id"]
        content = data["data"]
        image_b64 = content.get("image")
        if not image_b64: return

        # Load state from FIFOSafeCache
        state = client_memory_cache.get(client_id)
        if not state:
            state = {
                "frame_count": 0,
                "recent_frames": deque(maxlen=MAX_RECENT_FRAMES)
            }

        state["frame_count"] += 1
        state["recent_frames"].append(image_b64)
        current_time_t = f"T+{state['frame_count']}s"
        frames_list = list(state["recent_frames"])
        client_memory_cache.put(client_id, state)

        # --- BRANCH 1: User Question (Priority) ---
        if queue_name == "questions":
            user_text = content.get("text", "What do you see?")
            logger.info(f"Processing Question for {client_id}: {user_text}")

            # Removed manual context_text building; analyzer fetches it internally
            async for chunk in analyzer.answer_question(frames_list, user_text):
                await redis_client.publish(f"alerts:{client_id}", json.dumps({
                    "type": "ANSWER_CHUNK",
                    "message": chunk
                }))

            await redis_client.publish(f"alerts:{client_id}", json.dumps({"type": "ANSWER_DONE"}))
                        
        elif queue_name == "video_frames":
            # --- THE SLOW LOOP: Action Recognition ---
            if state["frame_count"] % FRAMES_BETWEEN_ACTION_CHECKS == 1:
                current_action = await analyzer.detect_action(frames_list)
                logger.info(f"[{client_id}] T={current_time_t} | Action: {current_action}")

            # --- THE FAST LOOP: Dual-Memory RAG Safety Check ---
            # Removed the manual current_rule argument; context and logging are handled internally
            result = await analyzer.detect_danger(frames_list)

            if result["is_danger"]:
                now_iso = datetime.now(timezone.utc).isoformat()
                logger.warning(f"DANGER DETECTED: {client_id} - {result['details']}")

                await redis_client.publish(f"alerts:{client_id}", json.dumps({
                    "type": "DANGER",
                    "message": "Safety Violation Detected",
                    "details": result["details"],
                    "timestamp": now_iso
                }))
                asyncio.create_task(report_to_django(client_id, result["details"], now_iso))

    except Exception as e:
        logger.error(f"Job Processing Error: {e}", exc_info=True)

async def main():
    logger.info("GPU Worker Started... Waiting for Redis jobs.")
    
    # 1. START THE BACKGROUND TASK HERE
    analyzer.start_background_tasks()
    
    def handle_shutdown():
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, handle_shutdown)

    while not shutdown_event.is_set():
        try:
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