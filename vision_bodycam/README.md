# 1. Expose the server to outside as tailscale funnel port 8889
sudo tailscale funnel --bg 8889

# 2. Start vllm server and point it to port 8888
./run_vllm.sh

# 3. Start redis container at port 6379
docker run -d --name rp-redis-bodycam -p 6379:6379 redis

# 4. start fastapi server at port 8889
uvicorn gateway:app --host 0.0.0.0 --port 8889

# 5. setup worker.py
python worker.py

