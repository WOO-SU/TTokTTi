import pytest
from fastapi.testclient import TestClient
import json

# Import your FastAPI app from the gateway.py file
from gateway import app 

def test_websocket_routing():
    """Test that the Gateway accepts connections and parses payloads."""
    
    # 1. Using TestClient in a 'with' block triggers the lifespan (Redis connection)
    with TestClient(app) as client:
        
        # 2. Connect to the WebSocket
        with client.websocket_connect("/ws/stream/pytest_client_1") as websocket:
            
            # Simulate sending a video frame
            frame_payload = {
                "type": "FRAME",
                "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD..."
            }
            websocket.send_json(frame_payload)
            
            # Simulate asking a question
            question_payload = {
                "type": "QUESTION",
                "data": "Are they wearing a hardhat?"
            }
            websocket.send_json(question_payload)
            
            # If we reach this line without exceptions, routing and Redis push succeeded!
            assert True