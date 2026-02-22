# RiskPulse

## Now working (`2/21` 12:50)
- images: `riskpulse_db`, `riskpulse_redis`, `riskpulse_be`, `riskpulse_fe_web`
```bash
cd RiskPulse # at project root, 
docker compose up -d
```
- After running docker compose up, check Docker Desktop
- Make sure the backend container is running
- In some cases, the backend and fe-web container does not start automatically
→ If so, start it manually using the Run button in Docker Desktop
```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
# then, enter your information for temporal login
```
- You can enter web by `http://localhost:3000/`
- If you ran container detached, view logs with
```bash
docker logs -f riskpulse-backend # same for other images
```

## Full Reset (Including DB Volume)
- This will remove all data, including the database volume. Use this when you’ve changed .env or need a full clean slate.
```bash
docker compose down -v
docker compose up --build
```

## Start App (Android Studio)
1. Open `/frontend/mobile/android` project at Android Studio
2. fix `local.properties` with your Android SDK path
3. (First Time Only) Install Dependencies and Generate Keystore
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
4. (Terminal 1) Run Metro Server
```bash
# at frontend/mobile/android
npm start
```
5. Add Android Device
- Start an Android Emulator from Android Studio or Connect a physical Android device with USB debugging enabled
6. (Terminal 2) Build and Run the App
```bash
# at frontend/mobile/android
npm run android
```
---


## todos
TODO 1 : nvidia-container-toolkit installed on your Linux host for this to work. (worker)
