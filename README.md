# RiskPulse

## First time setup
```bash
python3.11 -m venv .venv
. .venv/bin/activate
chmod +x backend/entrypoint.sh
pip install -r requirements.txt
```

<<<<<<< HEAD
## Backend docker build (always build from root)
=======
## Backend docker build (build from backend root)
>>>>>>> origin/develop
```bash
docker build -t riskpulse-backend -f ./Dockerfile ./
```

after that, test by
```bash
<<<<<<< HEAD
docker run --rm -it -p 8000:8000 riskpulse-backend web
=======
docker run --rm -it --env-file .env  -p 8000:8000 riskpulse-backend web
>>>>>>> origin/develop
```

If you ran container detached, view logs with
```bash
docker logs -f riskpulse-backend
```

## Frontend docker build (build from frontend root)

## todos
TODO 1 : nvidia-container-toolkit installed on your Linux host for this to work. (worker)
