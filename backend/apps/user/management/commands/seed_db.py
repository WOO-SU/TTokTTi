# backend/apps/user/management/commands/seed_db.py

import random
from typing import Dict, List
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

from apps.risk.services import *
from apps.report.services import *

def fake_llm_result() -> Dict:
        hazards = [
            {
                "id": "FALL",
                "title": "낙상 위험",
                "risk_grade": random.choice(["Low", "Medium", "High"]),
                "risk_R_1_25": random.randint(5, 20),
                "expected_accident": "작업 중 균형 상실로 인한 낙상",
                "evidence_from_image": "사다리 기울어짐",
                "mitigations_before_work": ["사다리 고정", "안전모 착용"],
                "residual_risk_grade": "Low",
                "residual_risk_R_1_25": random.randint(1, 5),
            },
            {
                "id": "LADDER",
                "title": "사다리 사용 위험",
                "risk_grade": random.choice(["Low", "Medium"]),
                "risk_R_1_25": random.randint(3, 10),
                "expected_accident": "사다리 전도",
                "evidence_from_image": "아웃트리거 미전개",
                "mitigations_before_work": ["아웃트리거 전개"],
                "residual_risk_grade": "Low",
                "residual_risk_R_1_25": random.randint(1, 4),
            },
        ]

        overall_grade = random.choice(["Low", "Med", "High"])
        overall_max_R = max(h["risk_R_1_25"] for h in hazards)

        return {
            "scene_summary": {
                "work_environment": "지하 역사 내부",
                "work_height_or_location": "사다리 상부",
                "observed_safety_facilities": ["안전모", "안전조끼"],
                "needs_verification": ["사다리 고정 상태"],
            },
            "hazards": hazards,
            "overall": {
                "overall_grade": overall_grade,
                "overall_max_R": overall_max_R,
                "work_permission": overall_grade != "High",
                "urgent_fix_before_work": ["사다리 고정"],
            },
        }

def fake_postwork_report(input_pkg: dict) -> dict:
    ws = input_pkg["worksession"]

    return {
        "report_title": "작업 종료 종합 보고서",
        "worksession_summary": {
            "worksite": ws["worksite"]["name"],
            "address": ws["worksite"]["address"],
            "starts_at": ws["starts_at"],
            "ends_at": ws["ends_at"],
            "status": ws["status"],
        },
        "video_summary": {
            "fullcam": ws["videos"]["fullcam_video"],
            "bodycam": ws["videos"]["bodycam_video"],
            "note": "작업 전 과정 녹화 완료",
        },
        "risk_highlights": input_pkg["risk_logs"]["highlights"],
        "risk_statistics": input_pkg["risk_logs"]["stats"],
        "compliance_summary": input_pkg["compliance"]["stats"],
        "before_after_summary": {
            "before_photos": [
                p["image_path"] for p in input_pkg["photos"]["before"]
            ],
            "after_photos": [
                p["image_path"] for p in input_pkg["photos"]["after"]
            ],
        },
        "action_items": {
            "immediate": [
                "작업 전 보호구 착용 여부 재확인"
            ] if random.random() < 0.5 else [],
            "preventive": [
                "정기적인 작업자 안전 교육 실시",
                "사다리 및 장비 사전 점검"
            ],
            "follow_up": [
                "유사 작업 시 위험 구간 재점검"
            ] if random.random() < 0.3 else [],
        },
        "generated_at": timezone.now().isoformat(),
    }

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
    
        workers = list(User.objects.filter(is_manager=False))
        managers = list(User.objects.filter(is_manager=True))
        users = list(User.objects.all())

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

        random.shuffle(users)
        user_chunks = [users[i:i + 7] for i in range(0, len(users), 7)]

        for chunk_idx, chunk in enumerate(user_chunks):
            worksite = random.choice(worksites)
            task_name = random.choice(task_templates)

            # First 2 chunks → DONE (ended earlier today), rest → IN_PROGRESS
            if chunk_idx < 2:
                ws = WorkSession.objects.create(
                    worksite=worksite,
                    name=f"{worksite.name} {task_name}",
                    starts_at=now - timedelta(hours=4),
                    ends_at=now - timedelta(minutes=30),
                    status=WorkSession.StatusChoices.DONE,
                )
            else:
                ws = WorkSession.objects.create(
                    worksite=worksite,
                    name=f"{worksite.name} {task_name}",
                    starts_at=now - timedelta(minutes=30),
                    ends_at=now + timedelta(hours=2),
                    status=WorkSession.StatusChoices.IN_PROGRESS,
                )

            chunk_managers = [u for u in chunk if u.is_manager]
            chunk_workers = [u for u in chunk if not u.is_manager]

            if chunk_managers:
                head = chunk_managers[0]
            else:
                head = random.choice(managers)

            WorkSessionMember.objects.create(
                worksession=ws,
                user=head,
                role=WorkSessionMember.RoleChoices.HEAD,
            )

            related_pool = [m for m in managers if m != head]
            relateds = random.sample(related_pool, 4)

            for rm in relateds:
                WorkSessionMember.objects.create(
                    worksession=ws,
                    user=rm,
                    role=WorkSessionMember.RoleChoices.RELATED,
                )

            selected_workers = []

            for w in chunk_workers:
                if len(selected_workers) < 2:
                    selected_workers.append(w)

            if len(selected_workers) < 2:
                remain = [w for w in workers if w not in selected_workers]
                selected_workers += random.sample(remain, 2 - len(selected_workers))

            for w in selected_workers:
                WorkSessionMember.objects.create(
                    worksession=ws,
                    user=w,
                    role=WorkSessionMember.RoleChoices.WORKER,
                )
        # for DONE, READY

        dates = [now - timedelta(days=i) for i in range(1, 7)] + [
            now + timedelta(days=i) for i in range(1, 7)
        ]

        for date in dates:
            for worksite in worksites:
                for _ in range(3):
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
                        continue
                    else:
                        status = WorkSession.StatusChoices.READY

                    session = WorkSession.objects.create(
                        worksite=worksite,
                        name=f"{worksite.name} {task_name}",
                        starts_at=starts_at,
                        ends_at=ends_at,
                        status=status,
                    )

                    head = random.choice(managers)
                    WorkSessionMember.objects.create(
                        worksession=session,
                        user=head,
                        role=WorkSessionMember.RoleChoices.HEAD,
                    )

                    relateds = random.sample(
                        [m for m in managers if m != head],
                        4,
                    )
                    for rm in relateds:
                        WorkSessionMember.objects.create(
                            worksession=session,
                            user=rm,
                            role=WorkSessionMember.RoleChoices.RELATED,
                        )

                    selected_workers = random.sample(workers, 2)
                    for w in selected_workers:
                        WorkSessionMember.objects.create(
                            worksession=session,
                            user=w,
                            role=WorkSessionMember.RoleChoices.WORKER,
                        )

        self.stdout.write(self.style.SUCCESS("✅ apps.worksession seeding completed"))


        # ------------------------------------------------------------------
        # check.Compliance, check.Photo
        # ------------------------------------------------------------------
        self.stdout.write("🚀 Seeding apps.check data...")

        # for Photo.image_path
        target_before_paths = [f"target/before{i}.jpg" for i in range(1, 9)]
        target_after_paths = [f"target/after{i}.jpg" for i in range(1, 9)]
        target_before_idx = 0
        target_after_idx = 0

        # for Compliance.original_image, Compliance.detected_image
        original_paths = {
            Compliance.CategoryChoices.HELMET: [
                "compliance/original_HELMET_1.jpg",
                "compliance/original_HELMET_2.jpg",
                "compliance/original_HELMET_3.jpg",
            ],
            Compliance.CategoryChoices.VEST: [
                "compliance/original_VEST_1.jpg",
                "compliance/original_VEST_2.jpg",
                "compliance/original_VEST_3.jpg",
            ],
            Compliance.CategoryChoices.GLOVE: [
                "compliance/original_GLOVE_1.jpg",
                "compliance/original_GLOVE_2.jpg",
                "compliance/original_GLOVE_3.jpg",
            ],
        }

        detected_paths = {
            Compliance.CategoryChoices.HELMET: [
                "compliance/detected_HELMET_1.jpg",
                "compliance/detected_HELMET_2.jpg",
                "compliance/detected_HELMET_3.jpg",
            ],
            Compliance.CategoryChoices.VEST: [
                "compliance/detected_VEST_1.jpg",
                "compliance/detected_VEST_2.jpg",
                "compliance/detected_VEST_3.jpg",
            ],
            Compliance.CategoryChoices.GLOVE: [
                "compliance/detected_GLOVE_1.jpg",
                "compliance/detected_GLOVE_2.jpg",
                "compliance/detected_GLOVE_3.jpg",
            ],
        }
        original_idx = {
            Compliance.CategoryChoices.HELMET: 0,
            Compliance.CategoryChoices.VEST: 0,
            Compliance.CategoryChoices.GLOVE: 0,
        }

        detected_idx = {
            Compliance.CategoryChoices.HELMET: 0,
            Compliance.CategoryChoices.VEST: 0,
            Compliance.CategoryChoices.GLOVE: 0,
        }

        for session in WorkSession.objects.all():
            workers = list(
                session.members.filter(
                    role=WorkSessionMember.RoleChoices.WORKER
                ).values_list("user", flat=True)
            ) # 2 workers for every session

            if not workers:
                raise Exception(f"❌ No workers found for session {session.id}")
            
            if session.status == WorkSession.StatusChoices.IN_PROGRESS: # BEFORE 사진만 업로드 상태
                employee_id = random.choice(workers) # 1명이 타겟 포토 업로드

                Photo.objects.create(
                    employee_id=employee_id,
                    worksession=session,
                    status=Photo.StatusChoices.BEFORE,
                    image_path=target_before_paths[target_before_idx % len(target_before_paths)]
                )
                target_before_idx += 1

            elif session.status == WorkSession.StatusChoices.DONE: # BEFORE/AFTER 사진 모두 업로드 상태
                for employee_id in workers: # 1명이 BEFROE 업로드, 1명이 AFTER 업로드 가정
                    Photo.objects.create(
                        employee_id=employee_id,
                        worksession=session,
                        status=Photo.StatusChoices.BEFORE,
                        image_path=target_before_paths[target_before_idx % len(target_before_paths)]
                    )
                    target_before_idx += 1

                    Photo.objects.create(
                        employee_id=employee_id,
                        worksession=session,
                        status=Photo.StatusChoices.AFTER,
                        image_path=target_after_paths[target_after_idx % len(target_after_paths)]
                    )
                    target_after_idx += 1

            categories = [
                Compliance.CategoryChoices.HELMET,
                Compliance.CategoryChoices.VEST,
                Compliance.CategoryChoices.GLOVE,
            ]

            if session.status == WorkSession.StatusChoices.DONE:
                target_workers = workers  # 두 명 모두

            elif session.status == WorkSession.StatusChoices.IN_PROGRESS:
                target_workers = [random.choice(workers)]  # 한 명만

            else:
                target_workers = []

            for employee_id in target_workers:
                violated_category = None
                if session.status == WorkSession.StatusChoices.IN_PROGRESS:
                    violated_category = random.choice(categories)

                for category in categories:

                    is_violation = (
                        session.status == WorkSession.StatusChoices.IN_PROGRESS
                        and category == violated_category
                    )

                    Compliance.objects.create(
                        employee_id=employee_id,
                        worksession=session,
                        category=category,
                        is_complied=not is_violation,
                        original_image=original_paths[category][
                            original_idx[category] % len(original_paths[category])
                        ],
                        detected_image=detected_paths[category][
                            detected_idx[category] % len(detected_paths[category])
                        ],
                    )
                    original_idx[category] += 1
                    if not is_violation:
                        detected_idx[category] += 1

        self.stdout.write(self.style.SUCCESS("✅ apps.check seeding completed"))

        # ------------------------------------------------------------------
        # detect.RiskType, detect.VideoLog, detect.VideoLogRead
        # ------------------------------------------------------------------
        self.stdout.write("🚀 Seeding apps.detect data...")

        FULL_RISK_TYPES = [
            ("helmet_not_worn", "헬멧 미착용", None),
            ("safety_vest_not_worn", "안전조끼 미착용", None),
            ("ladder_movement_with_person", "사다리 움직임 감지",
            "사람이 사다리 위에 있는 상태에서 사다리 움직임 감지"),
            ("height_ladder_violation", "사다리 높이 초과",
            "3.5m 이상 높이의 사다리 사용 금지"),
            ("ladder_tilt", "사다리 기울임 감지",
            "수직 대비 기울기 15도 이상 경고, 20도 이상 고위험"),
            ("top_step_usage", "최상단 작업 금지", None),
            ("outtrigger_not_deployed", "아웃트리거 미전개 감지", None),
            ("excessive_body_tilt", "작업자 몸 기울임 감지", None),
            ("insufficient_worker_count", "단독 작업 감지", "2인 1조 작업 원칙"),
            ("fall_detected", "낙상 사고 감지", None),
        ]

        BODY_RISK_TYPES = [
            ("hands_off_ladder_while_moving", "사다리 이동 중 손 미접촉", None),
            ("ac_power_proximity", "전원부 근접 위험", None),
            ("conditional_gloves_not_worn", "보호장갑 미착용", None),
            ("trip_hazard_in_path", "이동 경로 걸림 위험", None),
        ]

        for code, name, desc in FULL_RISK_TYPES:
            RiskType.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": desc,
                    "camera_type": RiskType.CameraType.FULL,
                }
            )

        for code, name, desc in BODY_RISK_TYPES:
            RiskType.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": desc,
                    "camera_type": RiskType.CameraType.BODY,
                }
            )

        full_risks = list(RiskType.objects.filter(camera_type=RiskType.CameraType.FULL))
        body_risks = list(RiskType.objects.filter(camera_type=RiskType.CameraType.BODY))
        all_risks = full_risks + body_risks

        for session in WorkSession.objects.all():

            if session.status == WorkSession.StatusChoices.DONE:
                count = 5
            elif session.status == WorkSession.StatusChoices.IN_PROGRESS:
                count = 3
            else:
                continue

            for i in range(count):
                risk = random.choice(all_risks)

                VideoLog.objects.create(
                    worksession=session,
                    source=VideoLog.SourceChoices.AUTO,
                    risk_type=risk,
                    original_video=f"videolog/{risk.code}_videolog.mp4",
                )

        managers = list(User.objects.filter(is_manager=True))

        for session in WorkSession.objects.all():

            session_managers = list(
                User.objects.filter(
                    work_sessions__worksession=session,
                    work_sessions__role__in=[
                        WorkSessionMember.RoleChoices.HEAD,
                        WorkSessionMember.RoleChoices.RELATED,
                    ]
                ).distinct()
            )

            if not session_managers:
                continue

            logs = list(session.video_logs.order_by("-created_at"))
            if not logs:
                continue

            if session.status == WorkSession.StatusChoices.DONE:
                target_logs = logs
            elif session.status == WorkSession.StatusChoices.IN_PROGRESS:
                target_logs = logs[1:]  # 최신 1개는 안 읽음
                target_logs = random.sample(
                    target_logs,
                    k=max(0, len(target_logs) // 2)
                )
            else:
                continue

            for log in target_logs:
                for manager in session_managers:
                    VideoLogRead.objects.get_or_create(
                        videolog=log,
                        manager=manager,
                        defaults={
                            "is_read": True,
                            "read_at": log.created_at + timedelta(minutes=random.randint(1, 60)),
                        }
                    )
        
        for session in WorkSession.objects.filter(
            status=WorkSession.StatusChoices.IN_PROGRESS
        ):

            non_compliances = Compliance.objects.filter(
                worksession=session,
                is_complied=False,
            )

            if not non_compliances.exists():
                continue

            session_managers = list(
                User.objects.filter(
                    work_sessions__worksession=session,
                    work_sessions__role__in=[
                        WorkSessionMember.RoleChoices.HEAD,
                        WorkSessionMember.RoleChoices.RELATED,
                    ]
                ).distinct()
            )

            if not session_managers:
                continue

            for compliance in non_compliances:

                videolog = VideoLog.objects.create(
                    worksession=session,
                    source=VideoLog.SourceChoices.MANUAL,
                    compliance=compliance,
                    status=VideoLog.StatusChoices.PENDING,
                )

                for manager in session_managers:
                    VideoLogRead.objects.create(
                        videolog=videolog,
                        manager=manager,
                        is_read=False,
                    )
        self.stdout.write(self.style.SUCCESS("✅ apps.detect seeding completed"))

        # ------------------------------------------------------------------
        # risk.RiskAssessment, risk.RiskAssessmentImage, risk.WorkerRecommendation, risk.RiskReport
        # ------------------------------------------------------------------
        self.stdout.write("🚀 Seeding apps.risk data...")

        assessments: List[RiskAssessment] = []

        for session in WorkSession.objects.all():

            workers = list(
                session.members.filter(
                    role=WorkSessionMember.RoleChoices.WORKER
                ).values_list("user", flat=True)
            )
            if not workers:
                continue

            if session.status == WorkSession.StatusChoices.DONE:
                employee_id = random.choice(workers)
                llm = fake_llm_result()

                ra = RiskAssessment.objects.create(
                    worksession=session,
                    employee_id=employee_id,
                    status=RiskAssessment.StatusChoices.COMPLETED,
                    site_label=session.name,
                    llm_result=llm,
                    overall_grade=llm["overall"]["overall_grade"],
                    overall_max_R=llm["overall"]["overall_max_R"],
                    work_permission=llm["overall"]["work_permission"],
                )
                assessments.append(ra)

            elif session.status == WorkSession.StatusChoices.IN_PROGRESS:
                if random.random() < 0.4:  # 일부만
                    employee_id = random.choice(workers)
                    ra = RiskAssessment.objects.create(
                        worksession=session,
                        employee_id=employee_id,
                        status=RiskAssessment.StatusChoices.PENDING,
                        site_label=session.name,
                    )
                    assessments.append(ra)
        
        image_idx = 0

        for ra in assessments:
            for i in range(3):
                RiskAssessmentImage.objects.create(
                    assessment=ra,
                    blob_name=f"assessment/image{image_idx%20+1}.jpg"
                )
                image_idx += 1
        
        for ra in assessments:
            if ra.llm_result is None:
                continue

            views = generate_all_views(ra.llm_result)

            # 관리자 보고서
            RiskReport.objects.create(
                assessment=ra,
                report_version=random.choice(["v1", "v2"]),
                scene_summary=views["admin_report"]["scene_summary"],
                hazards=views["admin_report"]["hazards"],
                overall=views["admin_report"]["overall"],
            )

            # 근로자 권고
            wr = views["worker_recommendation"]
            WorkerRecommendation.objects.create(
                assessment=ra,
                top_risks=wr["top_risks"],
                immediate_actions=wr["immediate_actions"],
                short_message=wr["short_message"],
            )
            
        self.stdout.write(self.style.SUCCESS("✅ apps.risk seeding completed"))
        
        # ------------------------------------------------------------------
        # report.PostWorkReport
        # ------------------------------------------------------------------
        self.stdout.write("🚀 Seeding apps.report data...")
        created = 0

        done_sessions = WorkSession.objects.filter(
            status=WorkSession.StatusChoices.DONE
        )

        for session in done_sessions:
            # v1 이미 있으면 skip
            if PostWorkReport.objects.filter(
                worksession_id=session.id,
                report_version=1,
            ).exists():
                continue

            try:
                input_pkg = build_input_package(session.id)
                report_snapshot = fake_postwork_report(input_pkg)

                PostWorkReport.objects.create(
                    worksession_id=session.id,
                    report_version=1,
                    input_snapshot=input_pkg,
                    report_snapshot=report_snapshot,
                )

                created += 1

            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠️ PostWorkReport 실패 (ws={session.id}): {e}"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ apps.report seeding completed ({created} reports)"
            )
        )