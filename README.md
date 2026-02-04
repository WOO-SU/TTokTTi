# RiskPulse

## First time setup
```bash
python3.11 -m venv .venv
. .venv/bin/activate
chmod +x backend/entrypoint.sh
pip install -r requirements.txt
```

## Backend docker build
```bash
docker build -t riskpulse-backend -f backend/Dockerfile backend/
```

after that, test by
```bash
docker run --rm -it -p 8000:8000 riskpulse-backend web
```

If you ran container detached, view logs with
```bash
docker logs -f riskpulse-backend
```

## todos
TODO 1 : nvidia-container-toolkit installed on your Linux host for this to work. (worker)
