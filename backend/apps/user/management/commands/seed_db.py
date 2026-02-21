# backend/apps/user/management/commands/seed_db.py

import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from faker import Faker

# Import your models
from apps.user.models import *
from apps.worksession.models import *
from apps.detect.models import *
from apps.check.models import *
from apps.risk.models import *
from apps.report.models import *

class Command(BaseCommand):
    help = 'Idempotently seeds the database with a large volume of mock data for testing.'
    
    def handle(self, *args, **kwargs):
        fake = Faker("ko_KR")
        self.stdout.write("Starting high-volume database seeding...")

        now = timezone.now()
        days = [now - timedelta(days=i) for i in range(1, 7)] + [now + timedelta(days=i) for i in range(7)]
        DEFAULT_PASSWORD = "1234"

        # ------------------------------------------------------------------
        # user.User
        # ------------------------------------------------------------------
        
        # employee
        users = []
        for i in range(1, 6): # f1 ~ f5
            username = f"user{i}"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "name": fake.name(),
                    "phone": fake.phone_number(), 
                    "address": fake.address(),
                    "birth_date": fake.date_of_birth(minimum_age=20, maximum_age=65),
                    "photo": f"photo/f{i}.jpg", 
                    "sex": "F",
                    "is_active": True,
                    "is_manager": False,
                    "is_staff": False,
                }
            )

            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()

            users.append(user)
        
        for i in range(1, 6): # m1 ~ m5
            username = f"user{i+5}"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "name": fake.name(),
                    "phone": fake.phone_number(), 
                    "address": fake.address(),
                    "birth_date": fake.date_of_birth(minimum_age=20, maximum_age=65),
                    "photo": f"photo/m{i}.jpg", 
                    "sex": "M",
                    "is_active": True,
                    "is_manager": False,
                    "is_staff": False,
                }
            )

            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()

            users.append(user)
        
        for i in range(6, 11): # f6 ~ f10
            username = f"manager{i}"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "name": fake.name(),
                    "phone": fake.phone_number(), 
                    "address": fake.address(),
                    "birth_date": fake.date_of_birth(minimum_age=20, maximum_age=65),
                    "photo": f"photo/f{i}.jpg", 
                    "sex": "F",
                    "is_active": True,
                    "is_manager": True,
                    "is_staff": False,
                }
            )

            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()

            users.append(user)
        
        for i in range(6, 11): # m6 ~ m10
            username = f"manager{i+5}"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "name": fake.name(),
                    "phone": fake.phone_number(), 
                    "address": fake.address(),
                    "birth_date": fake.date_of_birth(minimum_age=20, maximum_age=65),
                    "photo": f"photo/m{i}.jpg", 
                    "sex": "M",
                    "is_active": True,
                    "is_manager": True,
                    "is_staff": False,
                }
            )

            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()

            users.append(user)

        # 2. Worksites
        sites = []
        for _ in range(5):
            sites.append(Worksite.objects.create(
                name=f"Site {fake.city()}", 
                address=fake.address()
            ))

        now = timezone.now()

        for i in range(20):  # Let's create 20 full Work Session "Cards"
            start_time = now - timedelta(days=random.randint(0, 10), hours=random.randint(1, 12))
            
            # Create the Session
            session = WorkSession.objects.create(
                worksite=random.choice(sites),
                name=f"Shift {i+1}: {fake.job()}",
                starts_at=start_time,
                ends_at=start_time + timedelta(hours=8),
                status=random.choice(["READY", "IN_PROGRESS", "DONE"])
            )

            # A. Seed workers_detail (WorkSessionMember + Compliance)
            assigned_workers = random.sample(workers, k=random.randint(2, 5))
            for worker in assigned_workers:
                WorkSessionMember.objects.create(
                    worksession=session,
                    user=worker,
                    role="WORKER"
                )
                # Seed equipment_check (via Compliance model)
                Compliance.objects.create(
                    worksession=session,
                    user=worker,
                    # This maps to 'equipment_check' in your JSON
                    status=random.choice([True, False]) 
                )

            # B. Seed risk_assessment (Text/Status)
            assessment = RiskAssessment.objects.create(
                worksession=session,
                employee=assigned_workers[0], # Lead worker
                status="COMPLETED",
                site_label=session.name,
                overall_grade=random.choice(["A", "B", "C"]),
                work_permission=True
            )

            # C. Seed report (Boolean indicator)
            # Create a RiskReport object so the frontend 'report' field is true
            if random.choice([True, False]):
                RiskReport.objects.create(
                    worksession=session,
                    summary=fake.paragraph(),
                    is_published=True
                )

        self.stdout.write(self.style.SUCCESS(f"Successfully created 20 WorkSession cards."))
        
       