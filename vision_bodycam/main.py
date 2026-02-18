import asyncio
import json
import httpx # You need to install this: pip install httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# Configuration
DJANGO_API_URL = "http://YOUR_DJANGO_SERVER_IP:8000/api/incidents/"
DJANGO_API_KEY = "secret_internal_key" # Simple security between servers

@app.websocket("/ws/stream/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    
    # Simple rate limiting logic could go here
    
    try:
        while True:
            # 1. Receive Image
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            base64_image = frame_data['image']

            # 2. Process with GPU (Mocked for now)
            # is_danger, inference_result = await run_qwen_inference(base64_image)
            
            # --- SIMULATION START ---
            await asyncio.sleep(0.1) 
            is_danger = True # Assume danger detected
            inference_result = "Worker is not wearing a hard hat."
            # --- SIMULATION END ---

            if is_danger:
                # Action A: Alert the Phone (Immediate)
                alert_msg = {
                    "type": "DANGER",
                    "title": "Safety Hazard",
                    "message": inference_result
                }
                await websocket.send_text(json.dumps(alert_msg))

                # Action B: Inform Django (Persistence)
                # We send this asynchronously so we don't block the next frame
                asyncio.create_task(report_to_django(client_id, base64_image, inference_result))

    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected")

async def report_to_django(user_id: str, image_b64: str, reason: str):
    """Sends the incident data to the main Django server"""
    async with httpx.AsyncClient() as client:
        try:
            payload = {
                "user_id": user_id,
                "description": reason,
                "image_base64": image_b64, # Or upload to blob first and send URL
                "timestamp": "2024-02-20T12:00:00Z"
            }
            # Fire and forget - we don't wait for Django's response to keep stream smooth
            await client.post(
                DJANGO_API_URL, 
                json=payload,
                headers={"X-Internal-Key": DJANGO_API_KEY}
            )
            print("Report sent to Django")
        except Exception as e:
            print(f"Failed to report to Django: {e}")

# gpu-server/main.py
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager

# Import our custom modules
from core.inference import SafetyAnalyzer
from core.rag import ManualRetriever

# Global variables for our singletons
analyzer: SafetyAnalyzer = None
retriever: ManualRetriever = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    global analyzer, retriever
    # Load the heavy model ONCE when server starts
    analyzer = SafetyAnalyzer(model_path="Qwen/Qwen-VL-Chat-Int4") 
    retriever = ManualRetriever()
    yield
    # --- Shutdown ---
    print("Shutting down GPU server...")

app = FastAPI(lifespan=lifespan)

@app.websocket("/ws/stream/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    print(f"Client {client_id} connected")
    
    try:
        while True:
            # 1. Receive data
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            image_b64 = frame_data.get('image')

            if not image_b64:
                continue

            # 2. Get RAG Context
            # (Optional: You could classify the image first to know which rule to pull)
            safety_rules = retriever.get_context("default")

            # 3. Run Inference (The "Worker" Call)
            # IMPORTANT: We use asyncio.to_thread to run the synchronous GPU code 
            # in a separate thread, keeping the WebSocket responsive.
            result = await asyncio.to_thread(
                analyzer.detect_danger, 
                image_b64, 
                safety_rules
            )

            # 4. Handle Result
            if result['is_danger']:
                print(f"DANGER DETECTED for {client_id}")
                
                # A. Send Alert to Phone
                await websocket.send_text(json.dumps({
                    "type": "DANGER",
                    "message": "Safety Violation Detected!",
                    "details": result['details']
                }))
                
                # B. Send to Django (Asynchronous task)
                # asyncio.create_task(send_to_django(client_id, image_b64, result))

    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()