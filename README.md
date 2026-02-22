# RiskPulse

## Now working (`2/19` 17:30) 
```bash
cd RiskPulse # at project root, 
docker compose up
```
- After running docker compose up, check Docker Desktop
- Make sure the backend container is running
- In some cases, the backend container does not start automatically
→ If so, start it manually using the Run button in Docker Desktop

## Full Reset (Including DB Volume)
- This will remove all data, including the database volume. Use this when you’ve changed .env or need a full clean slate.
```bash
docker compose down -v
docker compose up --build
```

## Start Web
```
docker compose up -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
# then, enter your information for temporal login

cd frontend/web
npm install # just for the first time
npm run dev
```
- Then, you can check on `http://localhost:3000/` 

## Start App (Android Studio)
1. Open `/frontend/mobile/android` project at Android Studio 
2. (First Time Only) Install Dependencies and Generate Keystore
```bash
# at /frontend/mobile
npm install
cd android/app
keytool -genkeypair \
  -alias androiddebugkey \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore debug.keystore \
  -storepass android \
  -keypass android \
  -dname "CN=Android Debug,O=Android,C=US"
```
3. (Terminal 1) Run Metro Server
```bash
# at frontend/mobile/android
npm start
```
4. Add Android Device
- Start an Android Emulator from Android Studio or Connect a physical Android device with USB debugging enabled
5. (Terminal 2) Build and Run the App
```bash
# at frontend/mobile/android
npm run android
```
---

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
