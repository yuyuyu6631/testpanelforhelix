from app.routers.tools import parse_curl_command
from app.schemas import CurlParseRequest

def test_parse(cmd):
    try:
        req = CurlParseRequest(curl_command=cmd)
        res = parse_curl_command(req)
        print(f"INPUT: {cmd}")
        print(f"OUTPUT: {res}")
        print("-" * 20)
    except Exception as e:
        print(f"ERROR: {e}")

test_parse("curl -X POST https://api.example.com/v1/user -H 'Content-Type: application/json' -d '{\"id\":1}'")
test_parse("curl -H 'Authorization: Bearer abc' https://example.com")
test_parse("curl -d 'a=b' -d 'c=d' http://test.com")
