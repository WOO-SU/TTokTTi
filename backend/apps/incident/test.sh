#!/bin/bash

echo "Sending images to Fall Detection API..."

python3 - <<'PY'
import base64, json
from pathlib import Path
import urllib.request
import urllib.error
import sys

URL = "http://127.0.0.1:8000/api/incident/judge/fall/"

files = [
    "exampleimages/incident1.png", 
    "exampleimages/incident2.png", 
    "exampleimages/incident3.png", 
    "exampleimages/incident2.png",  
    "exampleimages/incident1.png", 
]

images = []
for fp in files:
    try:
        data = Path(fp).read_bytes()
        b64 = base64.b64encode(data).decode("ascii")
        images.append("data:image/png;base64," + b64)
    except FileNotFoundError:
        print(f"Error: Could not find image at {fp}")
        sys.exit(1)

payload = json.dumps({"images": images}).encode("utf-8")

# 1. Properly close the Request object
req = urllib.request.Request(
    URL,
    data=payload,
    headers={"Content-Type": "application/json", "Accept": "application/json"},
    method="POST"
)

# 2. Actually execute the network call
try:
    with urllib.request.urlopen(req) as r:
        print(f"status: {r.status}")
        print("body:", r.read().decode("utf-8", errors="ignore"))
except urllib.error.HTTPError as e:
    print(f"HTTP Error status: {e.code}")
    print("body:", e.read().decode("utf-8", errors="ignore"))
except urllib.error.URLError as e:
    print(f"Failed to connect to server: {e.reason}")
    print("Make sure your Django server is running on 127.0.0.1:8000!")

PY