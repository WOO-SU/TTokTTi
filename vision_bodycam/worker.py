import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from collections import deque

import redis.asyncio as redis
from dotenv import load_dotenv
from core.inference import SafetyAnalyzer

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s - WORKER - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
VLLM_URL = os.getenv("VLLM_URL", "http://localhost:8889/v1")
DJANGO_API_URL = os.getenv("DJANGO_API_URL", "http://localhost:8000/api/incidents/")

# Global State Management
client_states = {} # Stores session metadata, LTM, and STM
analyzer = SafetyAnalyzer(api_url=VLLM_URL)
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

async def report_to_django(user_id: str, reason: str, timestamp: str):
    # Existing integration logic remains here...
    pass

async def process_job(queue_name, payload):
    try:
        data = json.loads(payload)
        if queue_name == "questions":
            logger.info(f"Incoming Job on {queue_name}: {payload}")
        client_id = data["client_id"]
        content = data["data"]
        image_b64 = content.get("image")
        if queue_name == "video_frames" and not image_b64: 
            return

        # 1. Initialize/Retrieve Session State
        if client_id not in client_states:
            client_states[client_id] = {
                "start_time": time.time(),
                "last_compression_time": 0,
                "stm": [], # List of strings: "[T+1.2s] observation"
                "ltm": deque(maxlen=20),
                "recent_frames": deque(maxlen=3)
            }
        
        state = client_states[client_id]
        relative_time = time.time() - state["start_time"]
        timestamp_str = f"T+{relative_time:.1f}s"
        if image_b64:
            state["recent_frames"].append(image_b64)
        frames_list = list(state["recent_frames"])

        # 2. Branch Logic
        if queue_name == "questions":
            user_text = content.get("text", "What do you see?")
            logger.info(f"[{client_id}] Received question payload: {user_text}")
            
            full_answer = ""
            async for chunk in analyzer.answer_question(frames_list, user_text, list(state["ltm"]), state["stm"], timestamp_str):
                full_answer += chunk
                
            await redis_client.publish(f"alerts:{client_id}", json.dumps({
                "type": "ANSWER", 
                "message": full_answer
            }))

        elif queue_name == "video_frames":
            # --- Combined Fast Loop ---
            result = await analyzer.detect_danger(frames_list, list(state["ltm"]), state["stm"])
            
            # Update STM (5-second sliding buffer)
            observation_entry = f"[{timestamp_str}] {result['observation']}"
            state["stm"].append(observation_entry)
            
            # Prune STM to only last 5 seconds (approximate by count or timestamp)
            # Here we prune observations older than 5 seconds from current relative time
            state["stm"] = [s for s in state["stm"] if float(s.split('+')[1].split('s')[0]) > relative_time - 5.0]

            # Danger Reporting
            if result["is_danger"]:
                now_iso = datetime.now(timezone.utc).isoformat()
                await redis_client.publish(f"alerts:{client_id}", json.dumps({
                    "type": "DANGER", "message": "Safety Violation", "details": result["danger_reason"], "timestamp": now_iso
                }))
                asyncio.create_task(report_to_django(client_id, result["danger_reason"], now_iso))

            # --- 5-Second Slow Loop (LTM Compression) ---
            if relative_time - state["last_compression_time"] >= 5.0:
                if state["stm"]:
                    summary = await analyzer.compress_memory(state["stm"])
                    time_bracket = f"[{state['last_compression_time']:.0f}s-{relative_time:.0f}s]"
                    state["ltm"].append(f"{time_bracket} {summary}")
                    state["last_compression_time"] = relative_time
                    logger.info(f"[{client_id}] LTM Logged: {summary}")

    except Exception as e:
        logger.error(f"Job Error: {e}", exc_info=True)

async def main():
    logger.info("GPU Worker Started...")
    while True:
        item = await redis_client.brpop(["questions", "video_frames"], timeout=1.0)
        if item:
            await process_job(item[0], item[1])

if __name__ == "__main__":
    asyncio.run(main())