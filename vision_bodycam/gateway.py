import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

REDIS_URL = "redis://localhost:6379"
redis_client: redis.Redis | None = None

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
    allow_origins=["*"],  # Allows your phone to connect from any network
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/stream/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    logger.info(f"Client {client_id} connected.")
    print(f"Client {client_id} Connected")

    pubsub = redis_client.pubsub()
    listener_task = None

    # Task A: Listen for Alerts/Answers from Worker (via Redis)
    async def listen_for_results():
        await pubsub.subscribe(f"alerts:{client_id}")
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    # Forward data directly to Phone
                    await websocket.send_text(message["data"])
                    ## Why not below code?
                    # await websocket.send_text(message["data"].decode("utf-8"))
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
            
            # Wrap data with client_id for the worker
            payload = json.dumps({"client_id": client_id, "data": data_json})
            msg_type = data_json.get("type", "").upper()

            if msg_type == "QUESTION":
                # Priority 1: User asked a question -> "questions" queue
                await redis_client.lpush("questions", payload)
                logger.info(f"Queued QUESTION for {client_id}")
            else:
                # Priority 2: Video Stream -> "video_frames" queue
                # Load Shedding: Keep only last 50 frames to prevent lag
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