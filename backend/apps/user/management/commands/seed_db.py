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
        User.objects.bulk_create(users_to_create)
        workers = list(User.objects.exclude(username="admin"))
        self.stdout.write(f"Created {len(workers)} workers.")

        # 3. Seed Worksites
        sites_to_create = [Worksite(name=f"Construction Site {fake.city()}", address=fake.address()) for _ in range(10)]
        Worksite.objects.bulk_create(sites_to_create)
        sites = list(Worksite.objects.all())

        # 4. Seed WorkSessions & Members
        sessions_to_create = []
        now = timezone.now()
        for i in range(100):
            start_time = now - timedelta(days=random.randint(1, 30), hours=random.randint(1, 8))
            sessions_to_create.append(WorkSession(
                worksite=random.choice(sites),
                name=f"Shift - {fake.catch_phrase()}",
                starts_at=start_time,
                ends_at=start_time + timedelta(hours=8) if random.choice([True, False]) else None,
                status=random.choice(["READY", "IN_PROGRESS", "DONE"])
            ))
        WorkSession.objects.bulk_create(sessions_to_create)
        sessions = list(WorkSession.objects.all())

        # Assign members to sessions
        members_to_create = []
        for session in sessions:
            assigned_workers = random.sample(workers, k=random.randint(3, 10))
            for worker in assigned_workers:
                members_to_create.append(WorkSessionMember(
                    worksession=session,
                    user=worker,
                    role=random.choice(["HEAD", "RELATED", "WORKER"])
                ))
        WorkSessionMember.objects.bulk_create(members_to_create)

        # 5. Seed RiskTypes
        risk_types_data = [
            ("FALL", "Fall Hazard", "FULL"),
            ("FIRE", "Fire Hazard", "FULL"),
            ("NO_HELMET", "Missing Helmet", "BODY"),
            ("PROXIMITY", "Heavy Machinery Proximity", "FULL")
        ]
        risk_types = []
        for code, name, cam in risk_types_data:
            rt, _ = RiskType.objects.get_or_create(code=code, defaults={"name": name, "camera_type": cam})
            risk_types.append(rt)

        # 6. Seed VideoLogs (High Volume)
        video_logs_to_create = []
        for _ in range(1000):
            video_logs_to_create.append(VideoLog(
                source=random.choice(["AUTO", "MANUAL"]),
                status=random.choice(["PENDING", "APPROVED", "REJECTED"]),
                worksession=random.choice(sessions),
                risk_type=random.choice(risk_types),
                original_video=f"s3://bucket/videos/{fake.uuid4()}.mp4"
            ))
        VideoLog.objects.bulk_create(video_logs_to_create)
        self.stdout.write("Created 1000 VideoLogs.")

        # 7. Seed Risk Assessments
        assessments_to_create = []
        for session in sessions:
            assessments_to_create.append(RiskAssessment(
                worksession=session,
                employee=random.choice(workers),
                status=random.choice(["PENDING", "COMPLETED", "FAILED"]),
                site_label=session.name,
                overall_grade=random.choice(["A", "B", "C", "D"]),
                overall_max_R=random.randint(1, 25),
                work_permission=random.choice([True, False])
            ))
        RiskAssessment.objects.bulk_create(assessments_to_create)

        self.stdout.write(self.style.SUCCESS("High-volume database seeding completed successfully!"))