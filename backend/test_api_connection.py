import requests
import json

URL = "http://127.0.0.1:3000/tools/parse-curl"
data = {
    "curl_command": "curl https://example.com"
}

try:
    print(f"Testing connectivity to {URL}...")
    resp = requests.post(URL, json=data, timeout=5)
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
