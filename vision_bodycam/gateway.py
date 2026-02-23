import asyncio
import base64
import io
import json
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

REDIS_URL = "redis://localhost:6379"
GPU_API_KEY = os.getenv("GPU_API_KEY", "your_secure_gpu_key")
redis_client: redis.Redis | None = None

# --- CPU-Bound Image Bouncer Logic ---
def enforce_image_resolution(b64_string: str, max_width=360, max_height=360) -> str:
    """Synchronous CPU-bound task to resize images."""
    try:
        prefix = ""
        raw_b64 = b64_string
        if "," in b64_string:
            prefix, raw_b64 = b64_string.split(",", 1)
            prefix += ","

        image_data = base64.b64decode(raw_b64)
        image = Image.open(io.BytesIO(image_data))

        if image.width <= max_width and image.height <= max_height:
            return b64_string

        image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=80)
        
        optimized_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return prefix + optimized_b64

    except Exception as e:
        logger.error(f"Image Optimization Error: {e}")
        return b64_string # Fallback to original if corrupted
# ---------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage global resources like Redis connection pools."""
    global redis_client
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    logger.info("Connected to Redis pool.")
    yield
    await redis_client.aclose()
    logger.info("Redis connection closed.")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/stream/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    logger.info(f"Client {client_id} connected.")

    pubsub = redis_client.pubsub()
    listener_task = None

    # Task A: Listen for Alerts/Answers from Worker (via Redis)
    async def listen_for_results():
        await pubsub.subscribe(f"alerts:{client_id}")
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    await websocket.send_text(message["data"])
        except asyncio.CancelledError:
            logger.info(f"PubSub listener for {client_id} cancelled.")
        except Exception as e:
            logger.error(f"PubSub Error for {client_id}: {e}")

    listener_task = asyncio.create_task(listen_for_results())

    # Task B: Receive Video/Questions from Phone
    try:
        while True:
            data_text = await websocket.receive_text()
            data_json: Dict[str, Any] = json.loads(data_text)
            
            # 1. EXTRACT THE IMAGE BASE64
            # Handle both simple frames {"data": "base64"} and questions {"data": {"data": "base64", "text": "..."}}
            b64_string = data_json.get("image")
            
            
            # 2. OFFLOAD RESIZING TO A BACKGROUND THREAD
            if b64_string:
                # asyncio.to_thread prevents the heavy image math from blocking FastAPI's event loop
                optimized_b64 = await asyncio.to_thread(
                    enforce_image_resolution, b64_string, 448, 448
                )
                
                data_json["image"] = optimized_b64

            # Wrap data with client_id for the worker
            payload = json.dumps({"client_id": client_id, "data": data_json})
            msg_type = data_json.get("type", "").upper()

            if msg_type == "QUESTION":
                await redis_client.lpush("questions", payload)
                logger.info(f"Queued QUESTION for {client_id}")
            else:
                await redis_client.lpush("video_frames", payload)
                await redis_client.ltrim("video_frames", 0, 49) 

    except WebSocketDisconnect:
        logger.info(f"Client {client_id} gracefully disconnected.")
    except Exception as e:
        logger.error(f"WebSocket Error for {client_id}: {e}")    
    finally:
        if listener_task:
            listener_task.cancel()
        await pubsub.unsubscribe(f"alerts:{client_id}")
        await pubsub.close()