"""
Software Bug Gate — Python Flask Server
Serves preview/index.html and provides API endpoints for Glean AI and Jira.

Requirements (all pre-installed on this machine):
  flask, httpx, requests

Start:  py -3.11 app.py
Stop:   Ctrl+C  (or run stop.bat)
"""

import json
import os
import pathlib
from flask import Flask, jsonify, request, send_file, send_from_directory
import httpx

# ─── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR     = pathlib.Path(__file__).parent
PREVIEW_DIR  = BASE_DIR / "preview"
DATA_DIR     = BASE_DIR / "data"
ENV_FILE     = BASE_DIR / ".env"
SECRETS_FILE = DATA_DIR / "secrets.json"
STORE_FILE   = DATA_DIR / "store.json"

# ─── Load .env ────────────────────────────────────────────────────────────────

def load_dotenv():
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

load_dotenv()

# ─── Storage helpers ──────────────────────────────────────────────────────────

def _read_json(path: pathlib.Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

def _write_json(path: pathlib.Path, data: dict):
    DATA_DIR.mkdir(exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

def get_secret(key: str) -> str:
    return _read_json(SECRETS_FILE).get(key) or os.environ.get(key, "")

def set_secret(key: str, value: str):
    s = _read_json(SECRETS_FILE)
    s[key] = value
    _write_json(SECRETS_FILE, s)

def store_get(key: str):
    return _read_json(STORE_FILE).get(key)

def store_set(key: str, value):
    s = _read_json(STORE_FILE)
    s[key] = value
    _write_json(STORE_FILE, s)

# ─── Glean helpers ────────────────────────────────────────────────────────────

Software_SYSTEM_PROMPT = (
    "You are an Software technical writer for a medical device software company. "
    "Your task is to rephrase the provided text to be clear, precise, and professional, "
    "suitable for IEC 62304 / ISO 14971 documentation. "
    "Preserve all technical details, version numbers, hardware names, error messages, "
    "file names, and IDs exactly as given. "
    "Return only the rephrased text — no preamble, explanation, or quotation marks."
)

def glean_token() -> str:
    return get_secret("GLEAN_TOKEN") or os.environ.get("GLEAN_TOKEN", "")

def glean_base_url() -> str:
    return (
        store_get("gleanBaseUrl")
        or os.environ.get("GLEAN_BASE_URL", "")
    ).rstrip("/")

# ─── Jira helpers ─────────────────────────────────────────────────────────────

def jira_auth() -> tuple[str, str]:
    return os.environ.get("JIRA_EMAIL", ""), os.environ.get("JIRA_TOKEN", "")

def jira_host() -> str:
    return os.environ.get("JIRA_HOST", "noahmed.atlassian.net")

def jira_get(path: str, params: dict = None) -> dict:
    email, token = jira_auth()
    r = httpx.get(
        f"https://{jira_host()}{path}",
        auth=(email, token),
        headers={"Accept": "application/json"},
        params=params or {},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()

def jira_search(jql: str, fields: list, max_results: int = 10) -> dict:
    """Search Jira, trying multiple endpoints for compatibility."""
    params = {
        "jql":        jql,
        "fields":     ",".join(fields),
        "maxResults": max_results,
        "startAt":    0,
    }
    # 1. v2 GET — most compatible, works on all Atlassian Cloud instances
    try:
        res = jira_get("/rest/api/2/search", params)
        if not res.get("errorMessages"):
            print(f"  [search] v2-GET OK  total={res.get('total','?')}")
            return res
        print(f"  [search] v2-GET errors: {res.get('errorMessages')}")
    except Exception as e:
        print(f"  [search] v2-GET failed: {e}")

    # 2. POST /rest/api/3/search/jql (new Cloud endpoint)
    try:
        body = {"jql": jql, "fields": fields, "maxResults": max_results}
        res = jira_post("/rest/api/3/search/jql", body)
        if not res.get("errorMessages"):
            # new endpoint uses "issues" / "total" same as v2
            print(f"  [search] v3-POST-jql OK  total={res.get('total','?')}")
            return res
        print(f"  [search] v3-POST-jql errors: {res.get('errorMessages')}")
    except Exception as e:
        print(f"  [search] v3-POST-jql failed: {e}")

    # 3. v3 GET — last resort (may 410 on some instances)
    print(f"  [search] falling back to v3-GET")
    return jira_get("/rest/api/3/search", params)

def jira_post(path: str, body: dict) -> dict:
    email, token = jira_auth()
    r = httpx.post(
        f"https://{jira_host()}{path}",
        auth=(email, token),
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        json=body,
        timeout=20,
    )
    r.raise_for_status()
    return r.json()

# ─── App config ───────────────────────────────────────────────────────────────

DEFAULT_CONFIG = {
    "jiraSiteUrl":    f"https://{jira_host()}",
    "governedProjects": ["SW"],
    "defaultProject": "SW",
    "governedIssueTypes": ["Bug"],
    "gatedStatuses": ["Ready for Triage", "Ready for Dev", "Triage"],
    "glean": {
        "enabled": bool(glean_token()),
        "baseUrl": glean_base_url(),
    },
}

def get_config() -> dict:
    stored = store_get("Software:appConfig") or {}
    cfg = {**DEFAULT_CONFIG, **stored}
    # Always reflect live env values
    cfg["glean"] = {
        "enabled": bool(glean_token()),
        "baseUrl": glean_base_url() or cfg.get("glean", {}).get("baseUrl", ""),
    }
    return cfg

# ─── Flask app ────────────────────────────────────────────────────────────────

app = Flask(__name__, static_folder=str(PREVIEW_DIR), static_url_path="")

@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS"
    return response

# ── Serve frontend ────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_file(PREVIEW_DIR / "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(PREVIEW_DIR, filename)

# ── Config ────────────────────────────────────────────────────────────────────

@app.route("/api/config", methods=["GET"])
def api_get_config():
    cfg = get_config()
    return jsonify({"success": True, "config": cfg, "tokenConfigured": bool(glean_token())})

@app.route("/api/config", methods=["POST", "PUT", "OPTIONS"])
def api_update_config():
    if request.method == "OPTIONS":
        return "", 204
    patch = request.json or {}
    current = store_get("Software:appConfig") or {}
    updated = {**current, **patch}
    store_set("Software:appConfig", updated)
    return jsonify({"success": True, "config": updated})

# ── Glean token ───────────────────────────────────────────────────────────────

@app.route("/api/setGleanToken", methods=["POST", "OPTIONS"])
def api_set_glean_token():
    if request.method == "OPTIONS":
        return "", 204
    body = request.json or {}
    token = body.get("token", "").strip()
    base  = body.get("baseUrl", "").strip()
    if token:
        set_secret("GLEAN_TOKEN", token)
    if base:
        store_set("gleanBaseUrl", base)
    return jsonify({"success": True})

@app.route("/api/getGleanTokenStatus", methods=["GET"])
def api_glean_token_status():
    return jsonify({"tokenConfigured": bool(glean_token())})

# ── Glean connection test ─────────────────────────────────────────────────────

@app.route("/api/testGlean", methods=["POST", "OPTIONS"])
def api_test_glean():
    if request.method == "OPTIONS":
        return "", 204

    token    = glean_token()
    base_url = glean_base_url()

    if not token or not base_url:
        return jsonify({"success": False, "error": "Glean not configured — set GLEAN_TOKEN and GLEAN_BASE_URL in .env or Settings."})

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type":  "application/json",
    }

    # Diagnostic info (token prefix only — never log full token)
    token_preview = token[:6] + "…" if len(token) > 6 else "(short)"

    # Quick connectivity check (unauthenticated HEAD)
    reachable = False
    try:
        rh = httpx.head(base_url, timeout=8, follow_redirects=True)
        reachable = True
    except Exception:
        reachable = False

    diag = {"base_url": base_url, "token_prefix": token_preview, "host_reachable": reachable}

    bearer_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    import base64 as _b64

    # Endpoints that require real authentication
    # Each entry: (method, path, body, description)
    auth_probes = [
        # Correct Glean path (with /rest prefix)
        ("POST", "/rest/api/v1/chat",
         {"messages": [{"author": "USER", "fragments": [{"text": "hi"}]}], "stream": False},
         "Glean chat"),
        ("POST", "/rest/api/v1/search",
         {"query": "test", "pageSize": 1},
         "Glean search"),
        # Legacy path without /rest prefix (older instances)
        ("POST", "/api/v1/chat",
         {"messages": [{"author": "USER", "fragments": [{"text": "hi"}]}], "stream": False},
         "Glean chat (no /rest)"),
        ("POST", "/api/v1/search",
         {"query": "test", "pageSize": 1},
         "Glean search (no /rest)"),
    ]

    # Auth header variations to try for each endpoint
    auth_variants = [
        ("Bearer", {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}),
        ("Token",  {"Authorization": f"Token {token}",  "Content-Type": "application/json"}),
        ("Basic",  {"Authorization": "Basic " + _b64.b64encode(f":{token}".encode()).decode(), "Content-Type": "application/json"}),
        ("X-Api-Key", {"X-Api-Key": token, "Content-Type": "application/json"}),
    ]

    probe_log = {}
    winner = None  # (auth_fmt, method, path, description)

    for method, path, body, desc in auth_probes:
        for auth_fmt, hdrs in auth_variants:
            key = f"{auth_fmt} → {method} {path}"
            try:
                if method == "GET":
                    rp = httpx.get(f"{base_url}{path}", headers=hdrs, timeout=8)
                elif method == "POST_QP":
                    rp = httpx.post(f"{base_url}{path}?token={token}",
                                    headers={"Content-Type": "application/json"},
                                    json=body, timeout=8)
                else:
                    rp = httpx.post(f"{base_url}{path}", headers=hdrs, json=body, timeout=8)

                probe_log[key] = rp.status_code
                if rp.status_code < 400:
                    winner = (auth_fmt, method, path, desc)
                    break
            except Exception as e:
                probe_log[key] = f"err:{str(e)[:60]}"
        if winner:
            break

    diag["probe_log"] = probe_log

    if not winner:
        return jsonify({
            "success": False,
            "message": (
                "All authentication attempts failed. The token in .env "
                f"(starts with '{token_preview}') is not accepted by any known Glean API endpoint. "
                "This token likely does not have REST API access. "
                "In Glean Admin → API Tokens, verify the token has Chat and Search scopes, "
                "or ask your Glean admin to create a new API token."
            ),
            "diag": diag,
        })

    auth_fmt, method, path, desc = winner
    store_set("gleanAuthFormat", auth_fmt)
    store_set("gleanChatEndpoint", path)

    chat_worked = "chat" in path.lower()

    if chat_worked:
        return jsonify({
            "success": True,
            "message": f"Connection successful — Glean chat API is working.",
            "diag": diag,
        })
    else:
        return jsonify({
            "success": False,
            "message": (
                f"Search works but chat endpoint failed. "
                "The token may lack Chat scope — ask your Glean admin to enable it."
            ),
            "diag": diag,
        })

# ── Glean rephrase ────────────────────────────────────────────────────────────

@app.route("/api/rephrase", methods=["POST", "OPTIONS"])
@app.route("/api/rephraseWithGlean", methods=["POST", "OPTIONS"])
def api_rephrase():
    if request.method == "OPTIONS":
        return "", 204

    body         = request.json or {}
    text         = body.get("text", "").strip()
    field_ctx    = body.get("fieldContext", "")

    if not text:
        return jsonify({"success": False, "error": "No text provided."}), 400

    token    = glean_token()
    base_url = glean_base_url()

    if not token or not base_url:
        return jsonify({
            "success": False,
            "error": (
                "Glean not configured. "
                "Add GLEAN_TOKEN and GLEAN_BASE_URL to your .env file, "
                "or set them in Settings → AI Configuration."
            ),
        }), 503

    prompt = (
        f"{Software_SYSTEM_PROMPT}\n\n"
        f'Field context: "{field_ctx}"\n\n'
        f"Text to rephrase:\n{text}"
    )

    # Use whichever auth format was confirmed working by testGlean, fall back to Bearer
    auth_format = store_get("gleanAuthFormat") or "Bearer"
    if auth_format == "Basic":
        import base64 as _b64
        auth_value = "Basic " + _b64.b64encode(f":{token}".encode()).decode()
        auth_key   = "Authorization"
    elif auth_format in ("X-Token", "X-Api-Key"):
        auth_value = token
        auth_key   = auth_format
    else:
        auth_value = f"{auth_format} {token}"
        auth_key   = "Authorization"

    chat_endpoint = store_get("gleanChatEndpoint") or "/rest/api/v1/chat"

    try:
        r = httpx.post(
            f"{base_url}{chat_endpoint}",
            headers={
                auth_key:       auth_value,
                "Content-Type": "application/json",
            },
            json={
                "messages": [{"author": "USER", "fragments": [{"text": prompt}]}],
                "stream": False,
            },
            timeout=30,
        )
        r.raise_for_status()
    except httpx.HTTPStatusError as e:
        body_txt = e.response.text[:200]
        return jsonify({"success": False, "error": f"Glean API {e.response.status_code}: {body_txt}"}), 502
    except Exception as e:
        return jsonify({"success": False, "error": f"Glean connection failed: {e}"}), 502

    data = r.json()
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
        return jsonify({"success": True, "rephrased": rephrased.strip()})
    return jsonify({"success": False, "error": "Glean returned an empty response."})

# ── Jira: create bug ──────────────────────────────────────────────────────────

@app.route("/api/createBug", methods=["POST", "OPTIONS"])
def api_create_bug():
    if request.method == "OPTIONS":
        return "", 204
    body     = request.json or {}
    bug_data = body.get("bugData", {})
    summary_d = bug_data.get("summary", {})

    cat      = summary_d.get("category", "")
    sub      = summary_d.get("subCategory", "")
    problem  = summary_d.get("problemStatement", "")
    cond     = summary_d.get("conditionClause", "")
    title    = f"[{cat}]-[{sub}]: {problem} {cond}".strip()
    desc     = _build_description(bug_data)

    try:
        created = jira_post("/rest/api/3/issue", {
            "fields": {
                "project":     {"key": bug_data.get("projectKey", "SW")},
                "summary":     title,
                "description": {"type": "doc", "version": 1,
                                "content": [{"type": "paragraph",
                                             "content": [{"type": "text", "text": desc}]}]},
                "issuetype":   {"name": "Bug"},
            }
        })
        issue_key = created.get("key", "")
        issue_url = f"https://{jira_host()}/browse/{issue_key}"

        # Link to closed duplicate if applicable
        dup = bug_data.get("duplicateSearch", {})
        if dup.get("outcome") == "closed_match":
            for linked_key in dup.get("linkedIssueKeys", []):
                try:
                    jira_post("/rest/api/3/issueLink", {
                        "type": {"name": "Relates"},
                        "inwardIssue":  {"key": issue_key},
                        "outwardIssue": {"key": linked_key},
                    })
                except Exception:
                    pass

        return jsonify({"success": True, "issueKey": issue_key, "issueUrl": issue_url})
    except httpx.HTTPStatusError as e:
        return jsonify({"success": False, "error": f"Jira error {e.response.status_code}: {e.response.text[:200]}"}), 502
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ── Jira: duplicate search ────────────────────────────────────────────────────

@app.route("/api/searchDuplicates", methods=["POST", "OPTIONS"])
def api_search_duplicates():
    if request.method == "OPTIONS":
        return "", 204
    import re as _re

    body     = request.json or {}
    bug_data = body.get("bugData", {})
    project  = bug_data.get("projectKey", "SW")
    summary  = bug_data.get("summary", {})
    cat      = summary.get("category", "")
    sub_cat  = summary.get("subCategory", "")
    problem  = summary.get("problemStatement", "")

    # ── Escape special JQL text-search characters ──────────────────────────────
    def jql_escape(s):
        return _re.sub(r'([\[\]&+\-!(){}^~*?:|"\\])', r'\\\1', s)

    # ── Build smart keyword list (strip stop-words, short tokens, punctuation) ──
    STOP = {
        "a","an","the","and","or","not","in","on","at","to","for","of","with",
        "by","is","are","was","were","be","been","this","that","it","its",
        "from","when","while","if","as","until","after","before","fails",
        "fail","during","into","does","do","did","has","have","had","no","so",
    }
    clean = _re.sub(r"[^a-zA-Z0-9 ]", " ", problem)
    keywords = [jql_escape(w) for w in clean.split() if len(w) >= 4 and w.lower() not in STOP][:6]

    # ── If frontend sent an explicit JQL string, use it directly ─────────────
    custom_jql = body.get("jql", "").strip()
    if custom_jql:
        open_jql   = custom_jql
        # Derive closed variant: flip statusCategory condition
        closed_jql = _re.sub(r"statusCategory\s*!=\s*Done", "statusCategory = Done", custom_jql)
        if closed_jql == custom_jql:          # clause wasn't present — append it
            closed_jql = custom_jql + " AND statusCategory = Done"
    else:
        # ── Auto-build from bug data ──────────────────────────────────────────
        base = f"project = {project} AND issuetype = Bug"
        # OR-join keywords for wider recall — any keyword match surfaces the issue
        kw_clause = (" AND (" + " OR ".join(f'text ~ "{w}"' for w in keywords) + ")") if keywords else ""
        open_jql   = base + " AND statusCategory != Done" + kw_clause
        closed_jql = base + " AND statusCategory = Done"  + kw_clause

    SEARCH_FIELDS = ["summary", "status", "description", "assignee", "created"]

    def _jira_search(jql, max_results):
        """Search via GET /rest/api/3/search — the stable, non-deprecated endpoint."""
        res = jira_search(jql, SEARCH_FIELDS, max_results)

        # Surface Jira-level JQL errors returned in the body
        errs = res.get("errorMessages") or (res.get("errors") and list(res["errors"].values()))
        if errs:
            raise ValueError(f"Jira JQL error: {errs}")

        issues = res.get("issues") or []
        total  = res.get("total", len(issues))
        print(f"  [search] {len(issues)}/{total}  JQL={jql[:100]}")
        return issues, total

    def _fmt(issues):
        results = []
        for i in issues:
            f = i.get("fields", {})
            # Jira ADF description → plain text
            desc_raw = f.get("description") or {}
            desc_text = ""
            if isinstance(desc_raw, dict):
                for block in desc_raw.get("content", []):
                    for inline in block.get("content", []):
                        if inline.get("type") == "text":
                            desc_text += inline.get("text", "")
            elif isinstance(desc_raw, str):
                desc_text = desc_raw
            results.append({
                "key":            i["key"],
                "summary":        f.get("summary", ""),
                "status":         f.get("status", {}).get("name", ""),
                "statusCategory": f.get("status", {}).get("statusCategory", {}).get("key", ""),
                "description":    desc_text[:200],
                "assignee":       (f.get("assignee") or {}).get("displayName", ""),
                "created":        (f.get("created") or "")[:10],
                "url":            f"https://{jira_host()}/browse/{i['key']}",
            })
        return results

    # Broad fallback queries (no keyword filter) used when keyword search returns 0
    base = f"project = {project} AND issuetype = Bug"
    open_jql_broad   = base + " AND statusCategory != Done ORDER BY created DESC"
    closed_jql_broad = base + " AND statusCategory = Done  ORDER BY created DESC"

    try:
        open_issues,   open_total   = _jira_search(open_jql,   10)
        closed_issues, closed_total = _jira_search(closed_jql,  5)

        # If keyword search returned nothing, fall back to broad search
        fallback_used = False
        if open_total == 0 and closed_total == 0 and keywords:
            print("  [search] keyword search returned 0 — retrying with broad query")
            open_issues,   open_total   = _jira_search(open_jql_broad,   15)
            closed_issues, closed_total = _jira_search(closed_jql_broad,  5)
            fallback_used = True

        return jsonify({
            "success":       True,
            "openResults":   _fmt(open_issues),
            "closedResults": _fmt(closed_issues),
            "openTotal":     open_total,
            "closedTotal":   closed_total,
            "openJql":       open_jql_broad  if fallback_used else open_jql,
            "closedJql":     closed_jql_broad if fallback_used else closed_jql,
            "fallback":      fallback_used,
            "jiraSiteUrl":   f"https://{jira_host()}",
        })
    except Exception as e:
        print(f"  [searchDuplicates] ERROR: {e}")
        return jsonify({"success": False, "openResults": [], "closedResults": [],
                        "openJql": open_jql, "closedJql": "", "jiraSiteUrl": "",
                        "error": str(e)})

# ─── Description builder ──────────────────────────────────────────────────────

def _build_description(data: dict) -> str:
    sections = {}
    env = data.get("environment", {})
    env_lines = [v for v in [
        env.get("softwareVersion") and f"Software Version: {env['softwareVersion']}",
        env.get("hardwareConfig")  and f"Hardware Config: {env['hardwareConfig']}",
        env.get("buildNumber")     and f"Build: {env['buildNumber']}",
        env.get("mode")            and f"Mode: {env['mode']}",
    ] if v]
    if env_lines:
        sections["Environment"] = "\n".join(env_lines)

    pre = data.get("preconditions", {})
    sections["Preconditions"] = (
        f"No special preconditions. {pre.get('noPreconditionsExplanation','')}"
        if pre.get("noPreconditions")
        else pre.get("preconditions", "")
    )

    str_ = data.get("stepsToReproduce", {})
    steps = "\n".join(
        f"{i+1}. {s}" for i, s in enumerate(str_.get("steps", [])) if s.strip()
    )
    sections["Steps to Reproduce"] = f"Initial State: {str_.get('initialState','')}\n{steps}"

    ea = data.get("expectedActual", {})
    sections["Expected Behavior"] = ea.get("expectedBehavior", "")
    sections["Actual Behavior"]   = ea.get("actualBehavior",   "")
    if ea.get("notes"):
        sections["Notes"] = ea["notes"]

    ev = data.get("evidence", {})
    ev_lines = [v for v in [
        ev.get("screenshotReferences") and f"Screenshots: {ev['screenshotReferences']}",
        ev.get("videoReferences")      and f"Videos: {ev['videoReferences']}",
        ev.get("logDetails")           and f"Logs: {ev['logDetails']}",
        ev.get("testCaseIds")          and f"Test Cases: {ev['testCaseIds']}",
    ] if v]
    if ev_lines:
        sections["Evidence"] = "\n".join(ev_lines)

    tr = data.get("traceability", {})
    tr_lines = [v for v in [
        tr.get("requirementIds") and f"Requirements: {tr['requirementIds']}",
        tr.get("riskItemIds")    and f"Risk Items: {tr['riskItemIds']}",
        tr.get("relatedJiraKeys") and f"Related: {tr['relatedJiraKeys']}",
    ] if v]
    if tr_lines:
        sections["Traceability"] = "\n".join(tr_lines)

    return "\n\n---\n\n".join(
        f"**{heading}**\n{body}" for heading, body in sections.items() if body and body.strip()
    )

# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))

    print()
    print("  =========================================")
    print("   Software Bug Gate  |  Noah Medical")
    print("  =========================================")
    print(f"  http://localhost:{port}")
    print(f"  Settings: http://localhost:{port}?view=config")
    print()

    token_ok  = bool(glean_token())
    jira_ok   = bool(os.environ.get("JIRA_TOKEN"))
    print(f"  Jira   {'[OK]' if jira_ok  else '[--]  add JIRA_HOST / JIRA_EMAIL / JIRA_TOKEN to .env'}")
    print(f"  Glean  {'[OK]' if token_ok else '[--]  add GLEAN_TOKEN / GLEAN_BASE_URL to .env (optional)'}")
    print()

    app.run(host="0.0.0.0", port=port, debug=False)
