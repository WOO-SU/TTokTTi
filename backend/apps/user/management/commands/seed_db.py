# backend/apps/user/management/commands/seed_db.py

import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, datetime, time
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
        self.stdout.write("🚀 Seeding apps.user data...")
        DEFAULT_PASSWORD = "1234"

        # ------------------------------------------------------------------
        # user.User
        # ------------------------------------------------------------------
        
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

        self.stdout.write(self.style.SUCCESS(f"✅ User seeding completed for {len(users)} users"))

        # ------------------------------------------------------------------
        # worksession.WorkSite, worksession.WorkSession, worksession.WorkSessionMember
        # ------------------------------------------------------------------
        self.stdout.write("🚀 Seeding apps.worksession data...")
        now = timezone.now()
        dates = [now - timedelta(days=i) for i in range(1, 7)] + [now + timedelta(days=i) for i in range(7)]
        
        workers = list(User.objects.filter(is_manager=False))
        managers = list(User.objects.filter(is_manager=True))

        if len(workers) < 2 or len(managers) < 5:
            raise Exception("❌ Insufficient users: worker>=2, manager>=5 required")
        
        station_names = [
            "강남역",
            "잠실역",
            "보라매역",
            "구로디지털단지역",
            "판교역",
        ]

        worksites = []
        for name in station_names:
            ws, _ = Worksite.objects.get_or_create(
                name=name,
                defaults={
                    "address": fake.address(), 
                }
            )
            worksites.append(ws)

        task_templates = [
            "전기설비 점검 작업",
            "통신 케이블 유지보수",
            "환기설비 안전 점검",
        ]

        for date in dates: # 하루 당 3개의 세션씩 랜덤으로 생성
            for worksite in worksites:
                for i in range(3):
                    start_hour = random.randint(9, 15)
                    duration = random.randint(2, 3)

                    starts_at = timezone.make_aware(
                        datetime.combine(date, time(hour=start_hour))
                    )
                    ends_at = starts_at + timedelta(hours=duration)

                    task_name = random.choice(task_templates)

                    if ends_at < now:
                        status = WorkSession.StatusChoices.DONE
                    elif starts_at <= now <= ends_at:
                        status = WorkSession.StatusChoices.IN_PROGRESS
                    else:
                        status = WorkSession.StatusChoices.READY

                    session = WorkSession.objects.create(
                        worksite=worksite,
                        name=f"{worksite.name} {task_name}",
                        starts_at=starts_at,
                        ends_at=ends_at,
                        status=status,
                        # fullcam, bodycam: 실제 blob path 필요 (status == done 에 대해서만 = 3*7 < n <3*8)
                    )

                    # 각 세션당 1명의 HEAD (is_manager=True), 4명의 RELATED (is_manager=True, but not HEAD), 2명의 WORKER (is_manager=False) 배정
                    head = random.choice(managers)
                    WorkSessionMember.objects.create(
                        worksession=session,
                        user=head,
                        role=WorkSessionMember.RoleChoices.HEAD,
                    )

                    relateds = random.sample(
                        [m for m in managers if m != head],
                        k=4
                    )
                    for rm in relateds:
                        WorkSessionMember.objects.create(
                            worksession=session,
                            user=rm,
                            role=WorkSessionMember.RoleChoices.RELATED,
                        )

                    selected_workers = random.sample(workers, k=2)
                    for w in selected_workers:
                        WorkSessionMember.objects.create(
                            worksession=session,
                            user=w,
                            role=WorkSessionMember.RoleChoices.WORKER,
                        )
        self.stdout.write(self.style.SUCCESS(f"✅ apps.worksession seeding completed"))
