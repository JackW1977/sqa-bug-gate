#!/usr/bin/env python3
"""
SQA Bug Gate — Preview Server
Serves preview/ as static files AND proxies POST /api/rephrase to the real Glean API.

Setup:
  1. Copy .env.example to .env in the project root
  2. Fill in GLEAN_TOKEN and GLEAN_BASE_URL
  3. This server starts automatically via .claude/launch.json
"""

import http.server
import json
import os
import urllib.request
import urllib.error
from pathlib import Path

PORT = 4400
PREVIEW_DIR = Path(__file__).parent
PROJECT_DIR  = PREVIEW_DIR.parent

# ─── Load .env from project root ─────────────────────────────────────────────

def load_dotenv():
    env_path = PROJECT_DIR / ".env"
    if not env_path.exists():
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

load_dotenv()

GLEAN_TOKEN    = os.environ.get("GLEAN_TOKEN", "")
GLEAN_BASE_URL = os.environ.get("GLEAN_BASE_URL", "")

# ─── SQA system prompt ────────────────────────────────────────────────────────

SQA_SYSTEM_PROMPT = (
    "You are an SQA technical writer for a medical device software company. "
    "Your task is to rephrase the provided text to be clear, precise, and professional, "
    "suitable for IEC 62304 / ISO 14971 documentation. "
    "Preserve all technical details, version numbers, hardware names, error messages, "
    "file names, and IDs exactly as given. "
    "Return only the rephrased text — no preamble, explanation, or quotation marks."
)

# ─── HTTP Handler ─────────────────────────────────────────────────────────────

class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PREVIEW_DIR), **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/rephrase":
            self._handle_rephrase()
        else:
            self.send_response(404)
            self.end_headers()

    def _handle_rephrase(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self._json(400, {"success": False, "error": "Invalid JSON body."})
            return

        text          = body.get("text", "").strip()
        field_context = body.get("fieldContext", "")

        if not text:
            self._json(400, {"success": False, "error": "No text provided."})
            return

        if not GLEAN_TOKEN or not GLEAN_BASE_URL:
            self._json(503, {
                "success": False,
                "error": (
                    "Glean not configured. "
                    "Add GLEAN_TOKEN and GLEAN_BASE_URL to your .env file "
                    "(see .env.example)."
                ),
            })
            return

        prompt = (
            f'{SQA_SYSTEM_PROMPT}\n\n'
            f'Field context: "{field_context}"\n\n'
            f'Text to rephrase:\n{text}'
        )

        payload = json.dumps({
            "messages": [{"author": "USER", "fragments": [{"text": prompt}]}],
            "stream": False,
        }).encode()

        url = GLEAN_BASE_URL.rstrip("/") + "/api/v1/chat"
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {GLEAN_TOKEN}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            body_txt = e.read().decode(errors="replace")[:200]
            self._json(502, {"success": False, "error": f"Glean API {e.code}: {body_txt}"})
            return
        except Exception as e:
            self._json(502, {"success": False, "error": f"Glean connection failed: {e}"})
            return

        rephrased = next(
            (
                frag["text"]
                for msg in data.get("messages", [])
                if msg.get("author") != "USER"
                for frag in msg.get("fragments", [])
                if frag.get("text")
            ),
            None,
        )

        if rephrased:
            self._json(200, {"success": True, "rephrased": rephrased.strip()})
        else:
            self._json(200, {"success": False, "error": "Glean returned an empty response."})

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print(f"  {fmt % args}")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"[SQA Preview] http://localhost:{PORT}")
    if GLEAN_TOKEN:
        print(f"[SQA Preview] Glean ✓  {GLEAN_BASE_URL}")
    else:
        print("[SQA Preview] Glean ✗  — add GLEAN_TOKEN + GLEAN_BASE_URL to .env")
    with http.server.HTTPServer(("", PORT), PreviewHandler) as srv:
        srv.serve_forever()
