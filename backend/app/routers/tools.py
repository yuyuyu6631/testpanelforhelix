# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException
import shlex
import re
from typing import Dict, List, Optional
from .. import schemas

router = APIRouter(
    prefix="/tools",
    tags=["tools"]
)

@router.post("/parse-curl", response_model=schemas.CurlParseResponse)
def parse_curl_command(request: schemas.CurlParseRequest):
    """
    Parse a cURL command into its components
    """
    cmd = request.curl_command.strip()
    if not cmd.startswith('curl'):
        raise HTTPException(status_code=400, detail="Command must start with 'curl'")

    try:
        # Use shlex to correctly split the command like a shell would
        # Handle multi-line (backslash at end)
        cmd_clean = cmd.replace('\\\n', ' ').replace('\\\r\n', ' ')
        parts = shlex.split(cmd_clean)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse shell command: {str(e)}")

    method = "GET"
    url = ""
    headers = {}
    body = []

    i = 0
    while i < len(parts):
        token = parts[i]
        
        # Method
        if token in ('-X', '--request') and i + 1 < len(parts):
            method = parts[i+1].upper()
            i += 1
        
        # Headers
        elif token in ('-H', '--header') and i + 1 < len(parts):
            header_str = parts[i+1]
            if ':' in header_str:
                key, val = header_str.split(':', 1)
                headers[key.strip()] = val.strip()
            i += 1
            
        # Body / Data
        elif token in ('-d', '--data', '--data-raw', '--data-binary', '--data-ascii') and i + 1 < len(parts):
            body.append(parts[i+1])
            if method == "GET": # Default to POST if data is present
                method = "POST"
            i += 1
            
        # URL (First non-option that isn't an argument for an option)
        elif not token.startswith('-') and token != 'curl' and not url:
            url = token
            
        i += 1

    # Join multiple body parts if any
    final_body = "&".join(body) if body else None

    if not url:
        raise HTTPException(status_code=400, detail="Could not find URL in cURL command")

    return {
        "method": method,
        "url": url,
        "headers": headers,
        "body": final_body
    }
