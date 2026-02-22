import asyncio
import json
import os
from dotenv import load_dotenv
import redis.asyncio as redis
import httpx
from core.inference import SafetyAnalyzer
from core.rag import ManualRetriever

load_dotenv()

# Configuration
REDIS_URL = "redis://localhost"
VLLM_URL = os.getenv("VLLM_URL", "http://localhost:8000/v1")
DJANGO_API_URL = os.getenv("DJANGO_API_URL", "http://localhost:8000/api/incidents/")
DJANGO_API_KEY = os.getenv("DJANGO_API_KEY", "secret_internal_key")

# Initialize Logic Modules
r = redis.from_url(REDIS_URL)
analyzer = SafetyAnalyzer(api_url=VLLM_URL) # Connects to local vLLM
retriever = ManualRetriever()

async def report_to_django(user_id, image_b64, reason):
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
                print(f"✅ Reported to Azure for {user_id}")
            else:
                print(f"⚠️ Azure Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Django Report Failed: {e}")

async def process_job(queue_name, payload):
    """Handles a single job from Redis"""
    try:
        data = json.loads(payload)
        client_id = data["client_id"]
        content = data["data"]
        image_b64 = content.get("image")

        if not image_b64: 
            return

        # --- BRANCH 1: User Question (Priority) ---
        if queue_name == "questions":
            user_text = content.get("text", "")
            print(f"Processing Question for {client_id}: {user_text}")
            
            answer = analyzer.answer_question(image_b64, user_text)
            
            # Send Answer Back
            await r.publish(f"alerts:{client_id}", json.dumps({
                "type": "ANSWER",
                "message": answer
            }))

        # --- BRANCH 2: Safety Stream (Background) ---
        else:
            # 1. Get Context
            safety_rules = retriever.get_context("default")
            
            # 2. Run Inference
            result = analyzer.detect_danger(image_b64, safety_rules)
            
            # 3. If Danger, Alert & Report
            if result["is_danger"]:
                print(f"DANGER: {client_id} - {result['details']}")
                
                # A. Alert Phone
                await r.publish(f"alerts:{client_id}", json.dumps({
                    "type": "DANGER",
                    "message": "Safety Violation Detected",
                    "details": result["details"]
                }))
                
                # B. Report to Django
                asyncio.create_task(report_to_django(client_id, image_b64, result["details"]))

    except Exception as e:
        print(f"Job Processing Error: {e}")

async def main():
    print("GPU Worker Started... Waiting for Redis jobs.")
    while True:
        # Priority Pop: Check 'questions' first, then 'video_frames'
        # brpop blocks until data is available, preventing high CPU usage
        item = await r.brpop(["questions", "video_frames"], timeout=1.0)
        
        if item:
            queue_name_bytes, payload_bytes = item
            queue_name = queue_name_bytes.decode("utf-8")
            payload = payload_bytes.decode("utf-8")
            
            await process_job(queue_name, payload)
        
        # Tiny yield to allow other asyncio tasks (like http reports) to run
        await asyncio.sleep(0.01)

if __name__ == "__main__":
    asyncio.run(main())