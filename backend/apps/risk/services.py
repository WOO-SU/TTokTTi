# apps/risk/services.py
from typing import Dict, List


# =========================================================
# 관리자용 보고서 생성
# =========================================================
def generate_admin_report(llm_result: Dict) -> Dict:
    """
    관리자에게 보여줄 '위험성 평가 보고서' 생성

    원칙:
    - 원본(llm_result)에서 의미를 바꾸지 않는다
    - 표현/구조만 관리자 UI에 맞게 정리한다
    - 감사/책임 목적이므로 정보 누락 금지
    """

    return {
        "scene_summary": llm_result.get("scene_summary", {}),
        "hazards": llm_result.get("hazards", []),
        "overall": llm_result.get("overall", {}),
    }


# =========================================================
# 근로자용 권고 생성
# =========================================================
def generate_worker_recommendation(
    llm_result: Dict,
    top_n: int = 3,
) -> Dict:
    """
    근로자 앱에 보여줄 '위험 상황 예측 + 권고 사항' 생성

    설계 철학:
    - 숫자 최소화, 행동 중심
    - 지금 가장 위험한 것만 보여준다
    - '그래서 지금 뭘 하면 되는데?'에 답한다
    """

    hazards: List[Dict] = llm_result.get("hazards", [])
    overall: Dict = llm_result.get("overall", {})

    if not hazards:
        return {
            "top_risks": [],
            "immediate_actions": [],
            "short_message": "현재 확인된 주요 위험 요소는 없습니다.",
        }

    # -----------------------------------------
    # 1️⃣ 위험도 기준으로 정렬 (내림차순)
    # -----------------------------------------
    hazards_sorted = sorted(
        hazards,
        key=lambda h: h.get("risk_R_1_25", 0),
        reverse=True,
    )

    top_hazards = hazards_sorted[:top_n]

    # -----------------------------------------
    # 2️⃣ Top 위험 요약 생성
    # -----------------------------------------
    top_risks = []
    immediate_actions: List[str] = []

    for h in top_hazards:
        top_risks.append({
            "id": h.get("id"),
            "title": h.get("title"),
            "risk_grade": h.get("risk_grade"),
            "risk_R": h.get("risk_R_1_25"),
            "expected_accident": h.get("expected_accident"),
        })

        # 개선조치 목록 수집
        for act in h.get("mitigations_before_work", []):
            if act not in immediate_actions:
                immediate_actions.append(act)

    # -----------------------------------------
    # 3️⃣ 한 줄 요약 메시지 생성
    # -----------------------------------------
    overall_grade = overall.get("overall_grade", "")

    if overall_grade in ("High", "Critical"):
        short_message = (
            "작업 전 반드시 조치가 필요합니다: "
            + ", ".join(immediate_actions[:3])
        )
    else:
        short_message = (
            "작업 전 기본 안전 사항을 확인하세요: "
            + ", ".join(immediate_actions[:3])
        )

    return {
        "top_risks": top_risks,
        "immediate_actions": immediate_actions,
        "short_message": short_message,
    }


# =========================================================
# (선택) 공통 유틸: 전체 파생 결과 한 번에 생성
# =========================================================
def generate_all_views(llm_result: Dict) -> Dict:
    """
    한 번의 LLM 결과로 모든 파생 뷰 생성
    (API/배치 처리에서 편하게 쓰기 위함)
    """
    return {
        "admin_report": generate_admin_report(llm_result),
        "worker_recommendation": generate_worker_recommendation(llm_result),
    }
