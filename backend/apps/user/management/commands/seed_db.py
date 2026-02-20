# backend/apps/user/management/commands/seed_db.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.user.models import User
from apps.worksession.models import Worksite, WorkSession, WorkSessionMember
from apps.detect.models import RiskType
from apps.check.models import Compliance

class Command(BaseCommand):
    help = 'Idempotently seeds the database with initial mock data for development.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting database seeding process...")

        # 1. Seed Users
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "name": "Admin User",
                "sex": User.SexChoices.MALE,
                "is_manager": True,
                "is_staff": True,
                "is_superuser": True
            }
        )
        if created:
            admin.set_password("adminpass")
            admin.save()
            self.stdout.write("Created admin user.")

        worker, created = User.objects.get_or_create(
            username="worker1",
            defaults={
                "name": "John Doe",
                "sex": User.SexChoices.MALE,
            }
        )
        if created:
            worker.set_password("workerpass")
            worker.save()

        # 2. Seed Worksite
        site, _ = Worksite.objects.get_or_create(
            name="Seoul Construction Site A",
            defaults={"address": "123 Gangnam-daero, Seoul"}
        )

        # 3. Seed WorkSession
        session, _ = WorkSession.objects.get_or_create(
            worksite=site,
            name="Morning Shift - Zone A",
            defaults={
                "starts_at": timezone.now(),
                "status": WorkSession.StatusChoices.IN_PROGRESS
            }
        )

        # 4. Seed WorkSessionMembers
        WorkSessionMember.objects.get_or_create(
            worksession=session,
            user=admin,
            defaults={"role": WorkSessionMember.RoleChoices.HEAD}
        )
        WorkSessionMember.objects.get_or_create(
            worksession=session,
            user=worker,
            defaults={"role": WorkSessionMember.RoleChoices.WORKER}
        )

        # 5. Seed RiskTypes
        RiskType.objects.get_or_create(
            code="FALL_01",
            defaults={
                "name": "Fall Hazard",
                "description": "Risk of falling from height > 2m",
                "camera_type": RiskType.CameraType.FULL
            }
        )

        # 6. Seed Compliance
        Compliance.objects.get_or_create(
            employee=worker,
            worksession=session,
            category=Compliance.CategoryChoices.HELMET,
            defaults={"is_complied": True}
        )

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))