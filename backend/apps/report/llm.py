from __future__ import annotations
from typing import Any, Dict
import json
import re

from openai import OpenAI


SYSTEM = """You are a safety operations report generator.
Return ONLY valid JSON. No extra text.

Rules:
- Use only provided data.
- Do not invent times, counts, or events.
- If unknown, write null or "확인 불가".
- Korean.
- If input risk_logs.highlights is empty, output risk_highlights as [].
- Do not create highlights from events_sample.
- Do NOT infer or describe visual changes from photos. Only list photo paths.
- participants.role must be Korean only: "헤드관리자" | "관련자" | "근로자".
"""

USER_TEMPLATE = """입력 데이터(작업 완료 후 수집 패키지)를 기반으로
"전체 작업 현장 작업일지 + 위험요소 정리 보고서"를 생성하라.

필수 포함 섹션:
1) 작업 개요(현장/시간/참여자)
2) 영상 기반 작업 흐름 요약(fullcam/bodycam 링크 + 메타)
3) 위험 하이라이트 구간 요약(구간별 top 위험유형 + 대표 증거)
4) 위험요소 통계(유형별/카메라별/조치여부)
5) 준수 결과 요약(HELMET/VEST/SHOES)
6) 작업 전후 사진 첨부(판단/추정/관찰 문장 금지, 경로만)
7) 조치사항(즉시/예방/추적)

출력 JSON 키(정확히 이 키만):
- report_title
- worksession_summary
- video_summary
- risk_highlights
- risk_statistics
- compliance_summary
- before_after_summary
- action_items
- generated_at

before_after_summary 규칙:
- before_photos: string[] (입력 photos.before[].image_path)
- after_photos: string[] (입력 photos.after[].image_path)
- 사진 변화에 대한 문장 작성 금지

action_items 규칙:
- immediate/preventive/follow_up 각각 string[] (없으면 [])

[입력 데이터]
{input_json}
"""


def _extract_json(s: str) -> str:
    s = (s or "").strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", s, flags=re.DOTALL)
    if m:
        return m.group(1).strip()
    if "{" in s and "}" in s:
        return s[s.find("{"): s.rfind("}") + 1].strip()
    return s


def generate_report_json(input_package: Dict[str, Any]) -> Dict[str, Any]:
    client = OpenAI()

    user = USER_TEMPLATE.format(
        input_json=json.dumps(input_package, ensure_ascii=False)
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
    )

    text = resp.choices[0].message.content.strip()
    text = _extract_json(text)
    return json.loads(text)
