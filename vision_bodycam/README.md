# BodyCam System Orchestration

For local development and debugging, it is recommended to run these services in separate terminal windows. This prevents log interleaving and makes it easier to catch errors (like GPU Out-Of-Memory issues).

### Architecture Overview
1. **Redis:** Message broker / State management. (6379)
2. **vLLM Engine:** The heavy AI inference server (Port 8889).
3. **Gateway & Worker:** The API routing and task processing logic (Port 8888).
4. **Tailscale Funnel:** Exposes the Gateway to the public internet.

---

## Start tmux sessions:
```bash
tmux new -s vllm
tmux new -s gateway
tmux new -s worker
```
## Detach tmux sessions:
```bash
C-b d
```

## Attach tmux sessions:
```bash
tmux attach -t riskpulse
```

## Splitting & Navigating

```bash
[Prefix] then %	Split the current pane vertically (left/right).
[Prefix] then "	Split the current pane horizontally (top/bottom).
[Prefix] then Arrow Keys	Move your cursor to the adjacent pane.
[Prefix] then z	Zoom the current pane to full screen (great for reading long vLLM stack traces). Press it again to un-zoom.
[Prefix] then x	Kill (close) the current pane.
```

### Step 1: Start Infrastructure (Terminal 1)
First, ensure your base infrastructure is running. You only need to run this once.
```bash
# Start Redis via Docker
sudo docker start riskpulse-redis || sudo docker run -d --name riskpulse-redis -p 6379:6379 redis
```

### Step 2: Boot vllm (Terminal 2)
```bash
conda activate bodycam

# Start vLLM 
vllm serve cyankiwi/Qwen3-VL-8B-Instruct-AWQ-4bit \
  --quantization compressed-tensors \
  --max-model-len 16384 \
  --limit-mm-per-prompt '{"video":1,"image":5}' \
  --port 8889
```

### Step 3: Start Fastapi Gateway
```bash
conda activate bodycam
uvicorn gateway:app --host 0.0.0.0 --port 8888
```

### Step 4. Start Worker 
```bash
conda activate bodycam
python worker.py
```

### Step 5. Expose to the internet
```bash
tailscale funnel --bg 8888

# To check the status or find your public URL:
tailscale serve status
```

## For cleanup
```bash
pkill -f "uvicorn gateway:app"
pkill -f "python worker.py"
pkill -f "vllm serve"
tailscale serve stop
```