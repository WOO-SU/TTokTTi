# backend/apps/user/management/commands/seed_db.py

import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from faker import Faker

# Import your models
from apps.user.models import User
from apps.worksession.models import Worksite, WorkSession, WorkSessionMember
from apps.detect.models import RiskType, VideoLog
from apps.check.models import Compliance
from apps.risk.models import RiskAssessment, RiskAssessmentImage, RiskReport, WorkerRecommendation

class Command(BaseCommand):
    help = 'Idempotently seeds the database with a large volume of mock data for testing.'

    def handle(self, *args, **kwargs):
        fake = Faker()
        self.stdout.write("Starting high-volume database seeding...")

        # 1. Check if already seeded to maintain idempotency
        if User.objects.filter(username="admin").exists():
            self.stdout.write(self.style.WARNING("Database already seeded. Skipping..."))
            return

        # 2. Seed Admin & Base Users
        admin = User.objects.create_superuser(username="admin", password="adminpassword", name="System Admin", sex="M")
        
        users_to_create = []
        for i in range(50):
            users_to_create.append(User(
                username=f"worker_{i}",
                name=fake.name(),
                phone=fake.phone_number()[:20],
                sex=random.choice(['M', 'F']),
            ))

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
        
       