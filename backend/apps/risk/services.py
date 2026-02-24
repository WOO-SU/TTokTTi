from typing import Dict, List


def generate_admin_report(llm_result: Dict) -> Dict:
    scene = llm_result.get("scene_summary", {})
    hazards = llm_result.get("hazards", [])
    overall = llm_result.get("overall", {})

    top_hazards = sorted(
        hazards,
        key=lambda h: h.get("risk_R_1_25", 0),
        reverse=True,
    )[:2]

    # ✅ DB 저장/과거 호환용(기존 키 유지)
    base = {
        "scene_summary": scene,
        "hazards": hazards,
        "overall": overall,
    }

    # ✅ 프론트/보고서용(새 포맷)
    report = {
        "header": {
            "overall_grade": overall.get("overall_grade"),
            "overall_risk_score": overall.get("overall_max_R"),
            "work_permission": overall.get("work_permission"),
        },
        "executive_summary": {
            "summary_text": (
                f"위험성 평가 결과 '{overall.get('overall_grade')}' 수준이며 "
                f"작업 상태는 '{overall.get('work_permission')}'입니다."
            ),
            "key_risks": [
                {
                    "type": h.get("title"),
                    "risk_grade": h.get("risk_grade"),
                    "risk_score": h.get("risk_R_1_25"),
                }
                for h in top_hazards
            ],
        },
        "work_environment": {
            "environment": scene.get("work_environment"),
            "height_or_location": scene.get("work_height_or_location"),
            "existing_safety_measures": scene.get("observed_safety_facilities", []),
            "items_requiring_verification": scene.get("needs_verification", []),
        },
        "risk_details": [
            {
                "risk_type": h.get("title"),
                "risk_id": h.get("id"),
                "evidence": h.get("evidence_from_image"),
                "expected_accident": h.get("expected_accident"),
                "risk_level": h.get("risk_grade"),
                "risk_score": h.get("risk_R_1_25"),
                "required_actions_before_work": h.get("mitigations_before_work", []),
                "residual_risk_level": h.get("residual_risk_grade"),
                "residual_risk_score": h.get("residual_risk_R_1_25"),
            }
            for h in hazards
        ],
        "mandatory_actions_before_work": overall.get("urgent_fix_before_work", []),
    }

    return {**base, "report": report}


def generate_worker_recommendation(llm_result: Dict, top_n: int = 2) -> Dict:
    hazards: List[Dict] = llm_result.get("hazards", [])
    overall: Dict = llm_result.get("overall", {})

    if not hazards:
        base = {
            "top_risks": [],
            "immediate_actions": [],
            "short_message": "현재 확인된 주요 위험 요소는 없습니다.",
        }
        message = {
            "status": {"overall_grade": "Low", "work_permission": "작업 가능"},
            "alert_message": "현재 확인된 주요 위험 요소는 없습니다.",
            "main_risks": [],
            "action_checklist": [],
            "guide_message": "",
        }
        return {**base, "message": message}

    top_hazards = sorted(
        hazards,
        key=lambda h: h.get("risk_R_1_25", 0),
        reverse=True,
    )[:top_n]

    actions: List[str] = []
    for h in top_hazards:
        for act in h.get("mitigations_before_work", []):
            if act not in actions:
                actions.append(act)

    is_danger = overall.get("overall_grade") in ("High", "Critical")

    # ✅ DB 저장/과거 호환용(기존 키 유지)
    base = {
        "top_risks": [
            {
                "id": h.get("id"),
                "title": h.get("title"),
                "risk_grade": h.get("risk_grade"),
                "risk_R": h.get("risk_R_1_25"),
                "expected_accident": h.get("expected_accident"),
            }
            for h in top_hazards
        ],
        "immediate_actions": actions,
        "short_message": (
            "작업 전 반드시 조치가 필요합니다: " + ", ".join(actions[:3])
            if is_danger
            else "작업 전 기본 안전 사항을 확인하세요: " + ", ".join(actions[:3])
        ),
    }

    # ✅ 프론트/근로자 화면용(새 포맷)
    message = {
        "status": {
            "overall_grade": overall.get("overall_grade"),
            "work_permission": overall.get("work_permission"),
        },
        "alert_message": (
            "작업 전 반드시 안전 조치를 완료하세요."
            if is_danger
            else "작업 전 기본 안전 사항을 확인하세요."
        ),
        "main_risks": [
            {"type": h.get("title"), "what_can_happen": h.get("expected_accident")}
            for h in top_hazards
        ],
        "action_checklist": actions[:3],
        "guide_message": "위 조치를 완료한 후 작업을 진행하세요.",
    }

    return {**base, "message": message}


def generate_all_views(llm_result: Dict) -> Dict:
    return {
        "admin_report": generate_admin_report(llm_result),
        "worker_recommendation": generate_worker_recommendation(llm_result),
    }
