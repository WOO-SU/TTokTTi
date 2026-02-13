# apps/risk/risk_assessor.py
import os
import json
from dataclasses import dataclass
from typing import Any, Dict, Optional, List

from dotenv import load_dotenv
from openai import OpenAI
import requests # test용
import base64# test용
import mimetypes# test용

# ✅ 로컬 단독 테스트용: python으로 직접 실행할 때 .env 로드
# (runserver에서는 settings.py에서 load_dotenv()가 이미 호출되면 이 줄은 없어도 됨)
# load_dotenv(".env")

# risk_assessor.py (추천)
if os.getenv("DJANGO_SETTINGS_MODULE") is None:
    # 진짜 로컬 단독 테스트일 때만
    load_dotenv(".env")

from apps.user.storage.sas import make_read_sas

#아래 두개 함수 test용 
def _head_ok(url: str, timeout: int = 10) -> None:
    """LLM 호출 전에 이미지가 진짜 열리는지(200/206) 확인. 실패면 여기서 끊음."""
    r = requests.head(url, timeout=timeout, allow_redirects=True)
    if r.status_code not in (200, 206):
        raise ValueError(f"Image URL not accessible: {r.status_code} {r.text[:200]}")

def _estimate_cost_guard(max_prompt_chars: int, prompt: str) -> None:
    """프롬프트가 과도하게 길어져 토큰 폭발하는 걸 방지."""
    if len(prompt) > max_prompt_chars:
        raise ValueError(f"Prompt too long: {len(prompt)} chars (limit {max_prompt_chars})")



MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
WORK_TYPE_FIXED = "사다리 설비함 작업"

def _extract_json(text: str) -> dict:
    """
    LLM 출력이 ```json ... ``` 형태거나 앞뒤에 잡말이 섞여도 JSON만 뽑아 파싱.
    """
    text = (text or "").strip()

    # ```json ... ``` 코드블록 제거
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1].strip()
            # 앞줄에 json 라벨이 붙는 케이스 제거
            if text.lower().startswith("json"):
                text = text[4:].strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"LLM output is not valid JSON. raw={text[:300]!r}")

    return json.loads(text[start : end + 1])


def _grade_from_R(R: int) -> str:
    if R >= 17:
        return "Critical"
    if R >= 10:
        return "High"
    if R >= 5:
        return "Medium"
    return "Low"


def _permission_from_grade(grade: str) -> str:
    if grade == "Critical":
        return "조치 전 작업 금지"
    if grade == "High":
        return "개선조치 후 작업"
    return "작업 가능"


# ✅ id 순서 고정
HAZARD_ORDER = ["FALL", "DROPPING", "ELECTRIC", "PINCH", "ERGO"]


PROMPT = f"""
너는 산업안전 사전 위험성 평가자다.
입력은 "작업 시작 전" 현장 사진 1장이다.
작업 내용은 항상 "{WORK_TYPE_FIXED}"로 고정한다.
작업자/출입(인원, 출입 가능 여부 등) 관련 언급은 금지한다.

반드시 아래 JSON 스키마로만 출력해라.
- 설명/마크다운/코드블록(``` ) 금지
- JSON 외 텍스트 금지
- 첫 글자는 {{ 로 시작하고 마지막 글자는 }} 로 끝나야 한다.

[스키마]
{{
  "site_label": string,
  "work_type_fixed": "{WORK_TYPE_FIXED}",
  "scene_summary": {{
    "work_environment": string,
    "work_height_or_location": string,
    "observed_safety_facilities": [string],
    "needs_verification": [string]
  }},
  "hazards": [
    {{
      "id": "FALL"|"DROPPING"|"ELECTRIC"|"PINCH"|"ERGO",
      "title": string,
      "evidence_from_image": string,
      "expected_accident": string,
      "likelihood_L_1_5": 1-5,
      "severity_S_1_5": 1-5,
      "risk_R_1_25": 1-25,
      "risk_grade": "Low"|"Medium"|"High"|"Critical",
      "mitigations_before_work": [string, string, string],
      "residual_likelihood_L_1_5": 1-5,
      "residual_severity_S_1_5": 1-5,
      "residual_risk_R_1_25": 1-25,
      "residual_risk_grade": "Low"|"Medium"|"High"|"Critical"
    }}
  ],
  "overall": {{
    "overall_max_R": 1-25,
    "overall_grade": "Low"|"Medium"|"High"|"Critical",
    "work_permission": "작업 가능"|"개선조치 후 작업"|"조치 전 작업 금지",
    "urgent_fix_before_work": [string, string, string]
  }}
}}

추가 규칙:
- hazards는 정확히 5개, id 순서 반드시: FALL, DROPPING, ELECTRIC, PINCH, ERGO
- likelihood_L_1_5, severity_S_1_5는 1~5 정수
- risk_R_1_25는 L×S를 정확히 계산
- risk_grade는 R 기준:
  1~4 Low, 5~9 Medium, 10~16 High, 17~25 Critical
- residual_* 값은 개선대책 적용 후 잔여 위험이며 보통 R이 낮아져야 한다.
""".strip()


@dataclass
class AssessInput:
    image_blob_name: Optional[str] = None
    image_path: Optional[str] = None
    site_label: Optional[str] = None



class RiskAssessor:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되어 있지 않습니다.")

        # 🔥 스마트 따옴표 / 비ASCII 문자 제거
        api_key = (
            api_key
            .replace("“", "")
            .replace("”", "")
            .replace("‘", "")
            .replace("’", "")
            .strip()
        )

        # 혹시 모를 비ASCII 문자 완전 제거
        api_key = api_key.encode("ascii", "ignore").decode()

        self.client = OpenAI(api_key=api_key)

    def assess_from_url(
        self,
        image_url: str,
        site_label: Optional[str] = None,
    ) -> Dict[str, Any]:
        resp = self.client.responses.create(
            model=MODEL,
            temperature=0.2,
            input=[{
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": PROMPT + f"\n\nsite_label: {site_label or '미지정'}"
                    },
                    {
                        "type": "input_image",
                        "image_url": image_url
                    },
                ],
            }],
        )

        # 응답 텍스트 추출
        text = ""
        for item in getattr(resp, "output", []):
            for c in getattr(item, "content", []):
                if getattr(c, "type", None) in ("output_text", "text"):
                    text += getattr(c, "text", "")

        if not text.strip():
            raise ValueError("LLM returned empty text output")

        data = _extract_json(text)
        return self._normalize_and_fix(
            data,
            fallback_site_label=site_label,
        )

    def assess(self, inp: AssessInput) -> Dict[str, Any]:
        import os
        print(
            "🔥 DEBUG SAS ENV:",
            os.getenv("AZURE_STORAGE_ACCOUNT_NAME"),
            os.getenv("AZURE_BLOB_CONTAINER"),
        )
        if inp.image_path:
            image_url = _file_to_data_url(inp.image_path)
        else:
            if not inp.image_blob_name:
                raise ValueError("image_blob_name 또는 image_path 둘 중 하나는 필요합니다.")
            pack = make_read_sas(inp.image_blob_name)
            image_url = pack["download_url"]

        resp = self.client.responses.create(
            model=MODEL,
            temperature=0.2,
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": PROMPT + f"\n\nsite_label: {inp.site_label or '미지정'}"},
                    {"type": "input_image", "image_url": image_url},
                ],
            }],
        )

    # ... 이하 동일


        # ✅ 응답 텍스트 추출(버전 차이 대비)
        text = ""
        for item in getattr(resp, "output", []):
            for c in getattr(item, "content", []):
                if getattr(c, "type", None) in ("output_text", "text"):
                    text += getattr(c, "text", "")

        if not text.strip():
            raise ValueError("LLM returned empty text output (nothing to parse).")

        data = _extract_json(text)

        # ✅ 서버측 검증/보정 (계산 틀려도 안전)
        data = self._normalize_and_fix(data, fallback_site_label=inp.site_label)
        return data

    # -------------------------------
    # 서버측 스키마 보정 + 점수 재계산
    # -------------------------------
    def _normalize_and_fix(self, data: dict, fallback_site_label: Optional[str] = None) -> dict:
        # 기본 필드 보정
        data.setdefault("site_label", fallback_site_label or "미지정")
        data["work_type_fixed"] = WORK_TYPE_FIXED

        data.setdefault("scene_summary", {})
        ss = data["scene_summary"]
        ss.setdefault("work_environment", "")
        ss.setdefault("work_height_or_location", "")
        ss.setdefault("observed_safety_facilities", [])
        ss.setdefault("needs_verification", [])

        # hazards 구조 보정
        hazards: List[dict] = data.get("hazards", [])
        if not isinstance(hazards, list):
            hazards = []
        # id 기반 맵 만들기
        by_id = {h.get("id"): h for h in hazards if isinstance(h, dict) and h.get("id")}

        fixed_hazards: List[dict] = []
        for hid in HAZARD_ORDER:
            h = by_id.get(hid, {})
            h.setdefault("id", hid)
            h.setdefault("title", hid)
            h.setdefault("evidence_from_image", "근거 부족(확인 필요)")
            h.setdefault("expected_accident", "")
            h.setdefault("mitigations_before_work", [])

            # L/S/R 정수화 + 재계산
            L = int(h.get("likelihood_L_1_5", 1) or 1)
            S = int(h.get("severity_S_1_5", 1) or 1)
            L = min(max(L, 1), 5)
            S = min(max(S, 1), 5)
            R = L * S

            h["likelihood_L_1_5"] = L
            h["severity_S_1_5"] = S
            h["risk_R_1_25"] = R
            h["risk_grade"] = _grade_from_R(R)

            # residual(잔여위험) 보정
            rL = int(h.get("residual_likelihood_L_1_5", max(1, L - 1)) or max(1, L - 1))
            rS = int(h.get("residual_severity_S_1_5", S) or S)
            rL = min(max(rL, 1), 5)
            rS = min(max(rS, 1), 5)
            rR = rL * rS

            h["residual_likelihood_L_1_5"] = rL
            h["residual_severity_S_1_5"] = rS
            h["residual_risk_R_1_25"] = rR
            h["residual_risk_grade"] = _grade_from_R(rR)

            fixed_hazards.append(h)

        data["hazards"] = fixed_hazards

        # overall 보정
        overall = data.get("overall", {})
        if not isinstance(overall, dict):
            overall = {}
        overall.setdefault("urgent_fix_before_work", [])

        overall_max = max(h["risk_R_1_25"] for h in fixed_hazards) if fixed_hazards else 0
        overall_grade = _grade_from_R(overall_max)
        overall["overall_max_R"] = overall_max
        overall["overall_grade"] = overall_grade
        overall["work_permission"] = _permission_from_grade(overall_grade)
        data["overall"] = overall

        return data
