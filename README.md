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
# then, enter your information for temporary login
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
----

## todos
TODO 1 : nvidia-container-toolkit installed on your Linux host for this to work. (worker)
