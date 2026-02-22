# backend/apps/incident/llm/judge.py
import os, json
from openai import OpenAI


def _to_data_url(b64: str) -> str:
    b64 = b64.strip()
    if b64.startswith("data:image"):
        return b64
    return f"data:image/jpeg;base64,{b64}"


def judge_fall_with_images(payload: dict) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    client = OpenAI(api_key=api_key)

    contents = []

    prompt = """
You are a safety expert analyzing a possible fall incident.

You are given a sequence of images captured over a short time period.
The images are ordered chronologically from oldest to newest.

Task:
Determine whether the person in the images is experiencing
a real fall or an imminent fall (loss of balance likely).
실제 추락으로 보이는 것만 추락이라고 하고, 아닌 경우는 그냥 추락 아니라고 하기
Respond ONLY in JSON with:
- is_fall_or_imminent_fall (boolean)
- confidence (0.0–1.0)
- reasoning (short paragraph)
- Korean
""".strip()

    contents.append({"type": "text", "text": prompt})

    for img_b64 in payload["images"]:
        contents.append(
            {
                "type": "image_url",
                "image_url": {"url": _to_data_url(img_b64)},
            }
        )

    resp = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": contents}],
    )

    return json.loads(resp.choices[0].message.content)