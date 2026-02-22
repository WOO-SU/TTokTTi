import asyncio
import websockets
import json
import base64
import os

async def simulate_phone():
    # If you are testing over Tailscale, change this to your Funnel URL (wss://...)
    # For local SSH testing, localhost is perfect.
    url = "ws://localhost:8888/ws/stream/simulated_phone"
    
    # 1. Prepare a valid Base64 image
    # Qwen-VL will crash if you send garbage data. We provide a valid 1x1 white pixel 
    # as a fallback, but it's best to place a real 'test_frame.jpg' in your tests folder.
    image_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    
    image_path = "tests/test_frame.jpg"
    if os.path.exists(image_path):
        with open(image_path, "rb") as f:
            image_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")
            print("[Setup] Loaded real test image.")
    else:
        print("[Setup] No 'test_frame.jpg' found. Using fallback 1x1 pixel.")

    # 2. Connect and Stream
    print(f"\n[Phone] Connecting to {url}...")
    async with websockets.connect(url) as ws:
        print("[Phone] ✅ Connected to Gateway!")
        
        # Simulate 3 seconds of video feed (2 frames per second)
        for i in range(3):
            print(f"[Phone] 📷 Sending frame {i+1}...")
            await ws.send(json.dumps({
                "type": "FRAME",
                "data": image_b64
            }))
            await asyncio.sleep(0.5) # Wait half a second

        # 3. Trigger the AI Worker
        print("[Phone] ❓ Asking safety question...")
        await ws.send(json.dumps({
            "type": "QUESTION",
            "text": "Describe any safety hazards in these frames.",
            "data": image_b64  # We must include the image in the payload!
        }))

        ## 4. Wait for the Qwen-VL response
        print("[Phone] ⏳ Waiting for Worker to process via vLLM...")
        try:
            while True:
                # Keep listening to the websocket
                response_text = await asyncio.wait_for(ws.recv(), timeout=30.0)
                response = json.loads(response_text)
                
                if response["type"] == "DANGER":
                    print(f"\n[Phone] 🚨 BACKGROUND ALERT: {response['details']}")
                elif response["type"] == "ANSWER":
                    print(f"\n[Phone] 🗣️ AI ANSWER: {response['message']}\n")
                    break # Now we can safely exit!
                    
        except asyncio.TimeoutError:
            print("\n[Phone] ❌ Timed out waiting for response!")

            
if __name__ == "__main__":
    asyncio.run(simulate_phone())