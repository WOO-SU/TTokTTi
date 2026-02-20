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
# then, enter your information for temporary login
```
- Then, you can check on `http://localhost:3000/` 

---

If you ran container detached, view logs with
```bash
docker logs -f riskpulse-backend
```
## todos
TODO 1 : nvidia-container-toolkit installed on your Linux host for this to work. (worker)
