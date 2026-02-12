# RiskPulse

```bash
docker compose --env-file .env up -d --build
```

## First time setup
```bash
python3.11 -m venv .venv
. .venv/bin/activate
chmod +x backend/entrypoint.sh
pip install -r requirements.txt
```

## Backend docker build (build from backend root)
```bash
docker build -t riskpulse-backend -f ./Dockerfile ./
```

after that, test by
```bash
docker run --rm -it --env-file .env  -p 8000:8000 riskpulse-backend web
```

If you ran container detached, view logs with
```bash
docker logs -f riskpulse-backend
```

If you modified backend code, then to apply that change, 
```bash
docker rmi riskpulse-backend
```
then re-build it.

## Frontend docker build (build from frontend root)

## todos
TODO 1 : nvidia-container-toolkit installed on your Linux host for this to work. (worker)
