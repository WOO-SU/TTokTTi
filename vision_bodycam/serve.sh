#!/bin/bash

# --- CONFIGURATION ---
VLLM_PORT=8889
GATEWAY_PORT=8888
REDIS_PORT=6379
MODEL_NAME="cyankiwi/Qwen3-VL-8B-Instruct-AWQ-4bit"

# Colors for logging
GREEN='\033[0u32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to stop all services
stop_services() {
    echo -e "${RED}🛑 Shutting down RiskPulse services...${NC}"
    # Kill Python processes (Gateway and Worker)
    pkill -f "uvicorn gateway:app"
    pkill -f "python worker.py"
    # Kill vLLM
    pkill -f "vllm serve"
    # Stop Docker Redis
    sudo docker stop riskpulse-redis > /dev/null 2>&1
    # Turn off Funnel
    tailscale serve stop > /dev/null 2>&1
    echo -e "${GREEN}✅ All services stopped.${NC}"
    exit 0
}

trap stop_services SIGINT

echo -e "${GREEN}🚀 RiskPulse System Orchestrator Starting...${NC}"

# 1. FIX DOCKER PERMISSIONS & START REDIS
# We use sudo for docker since your user 'team4' lacks socket permissions
if ! sudo docker ps | grep -q "riskpulse-redis"; then
    echo -e "${RED}⚠️ Redis container not running. Starting via Docker...${NC}"
    # Try starting existing, or run new if not exists
    sudo docker start riskpulse-redis || sudo docker run -d --name riskpulse-redis -p 6379:6379 redis
    sleep 2
else
    echo -e "${GREEN}✅ Redis is active.${NC}"
fi

# 2. CHECK VLLM ENGINE (Port 8888)
if ! lsof -i:$VLLM_PORT > /dev/null; then
    echo -e "${GREEN}🧠 Starting vLLM Engine ($MODEL_NAME)...${NC}"
    # Start in background and redirect logs
    nohup conda run -n bodycam vllm serve "$MODEL_NAME" \
      --quantization compressed-tensors \
      --max-model-len 16384 \
      --limit-mm-per-prompt '{"video":1,"image":5}' \
      --port $VLLM_PORT > vllm.log 2>&1 &
    echo "   (Waiting for VRAM allocation... check vllm.log for progress)"
else
    echo -e "${GREEN}✅ vLLM Engine is already running.${NC}"
fi

# 3. CHECK FASTAPI GATEWAY (Port 8888)
if ! lsof -i:$GATEWAY_PORT > /dev/null; then
    echo -e "${GREEN}🌐 Starting FastAPI Gateway...${NC}"
    nohup uvicorn gateway:app --host 0.0.0.0 --port $GATEWAY_PORT > gateway.log 2>&1 &
else
    echo -e "${GREEN}✅ Gateway is already running.${NC}"
fi

# 4. CHECK GPU WORKER (Python Process)
if ! pgrep -f "python worker.py" > /dev/null; then
    echo -e "${GREEN}🛠️ Starting GPU Worker script...${NC}"
    nohup python worker.py > worker.log 2>&1 &
else
    echo -e "${GREEN}✅ GPU Worker is active.${NC}"
fi

# 5. CHECK TAILSCALE FUNNEL
FUNNEL_STATUS=$(tailscale serve status 2>/dev/null)
if [[ $FUNNEL_STATUS != *"Funnel on"* ]]; then
    echo -e "${RED}🔌 Tailscale Funnel is OFF. Activating...${NC}"
    tailscale funnel --bg $GATEWAY_PORT
else
    echo -e "${GREEN}✅ Tailscale Funnel is live.${NC}"
fi

echo -e "${GREEN}--------------------------------------------------${NC}"
echo -e "System Running. Press Ctrl+C to stop all services."
echo -e "Logs: tail -f vllm.log | gateway.log | worker.log"
echo -e "${GREEN}--------------------------------------------------${NC}"

# Keep script alive to catch the trap
tail -f vllm.log gateway.log worker.log