./run_vllm.sh

docker run -d --name rp-redis-bodycam -p 6379:6379 redis

uvicorn gateway:app --host 0.0.0.0 --port 8889

python worker.py

