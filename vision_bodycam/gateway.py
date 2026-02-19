import asyncio
import json
import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# Configuration
REDIS_URL = "redis://localhost"

@app.websocket("/ws/stream/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    print(f"Client {client_id} Connected")

    # Connect to Redis
    r = redis.from_url(REDIS_URL)
    pubsub = r.pubsub()

    # Task A: Listen for Alerts/Answers from Worker (via Redis)
    async def listen_for_results():
        await pubsub.subscribe(f"alerts:{client_id}")
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    # Forward data directly to Phone
                    await websocket.send_text(message["data"].decode("utf-8"))
        except Exception as e:
            print(f"PubSub Error: {e}")

    listener_task = asyncio.create_task(listen_for_results())

    # Task B: Receive Video/Questions from Phone
    try:
        while True:
            data_text = await websocket.receive_text()
            data_json = json.loads(data_text)
            
            # Wrap data with client_id for the worker
            payload = json.dumps({"client_id": client_id, "data": data_json})

            if data_json.get("type") == "QUESTION":
                # Priority 1: User asked a question -> "questions" queue
                await r.lpush("questions", payload)
                print(f"Queued Question for {client_id}")
            else:
                # Priority 2: Video Stream -> "video_frames" queue
                # Load Shedding: Keep only last 50 frames to prevent lag
                await r.lpush("video_frames", payload)
                await r.ltrim("video_frames", 0, 49) 

    except WebSocketDisconnect:
        print(f"Client {client_id} Disconnected")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        listener_task.cancel()
        await pubsub.unsubscribe()
        await r.close()