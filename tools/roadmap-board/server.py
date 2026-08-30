#!/usr/bin/env python3
"""Roadmap Board - a local, read-only JIRA/Trello-style board over docs/roadmap/.

Scans projects for the modus roadmap convention (one brief per task named
NNN-<slug>.md, finished briefs retired to done/ keeping their ID) and serves
a browsable board. Python 3.8+ stdlib only - no dependencies.

Usage:
  python3 server.py                        # auto-discover under the Projects root
  python3 server.py <project-dir> ...      # explicit projects only (or roadmap dirs)
  python3 server.py --root <dir>           # discover under a different root
  python3 server.py --port 4830 --host 127.0.0.1
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import time
from datetime import date, datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath

TOOL_DIR = Path(__file__).resolve().parent
DEFAULT_ROOT = TOOL_DIR.parents[2]  # <root>/modus/tools/roadmap-board -> <root>

STATIC = {"/": "index.html", "/index.html": "index.html", "/app.js": "app.js"}
MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8"}

TASK_RE = re.compile(r"^(\d+)-(.+)\.md$", re.IGNORECASE)
TITLE_RE = re.compile(r"^#\s+(?:Roadmap:\s*)?(.+?)\s*$")
META_RE = re.compile(r"^\*\*([A-Za-z][A-Za-z0-9 /_-]{0,40}):\*\*\s*(.*)$")

KNOWN_LABELS = ("bug", "infra", "feature", "backlog")

# Board column derived from the free-text **Status:** line (first match wins).
# Parked and TBC share one Backlog column: both mean "not committed to yet", and
# splitting them made two thin columns nobody scanned.
STATE_PREFIXES = (
    ("done",       ("done",)),
    # "shipped" on an ACTIVE brief means partially shipped - work continues
    # (a finished brief would be in done/, which wins regardless of status text).
    ("inprogress", ("in progress", "in-progress", "wip", "started", "building",
                    "doing", "shipped")),
    ("blocked",    ("blocked", "waiting")),
    ("backlog",    ("tbc", "needs decision", "undecided", "open question",
                    "parked", "on hold", "on-hold", "paused", "shelved",
                    "someday", "icebox", "backlog", "idea")),
    ("planned",    ("planned", "ready", "todo", "to do", "next", "committed", "approved",
                    "agreed", "proposed", "settled", "structure settled", "decided", "scoped")),
)

# --- observed activity -------------------------------------------------------
# The Status line records what was *decided*; git records what was *done*. A
# brief still reading "planned" that has had ten commits this week is in
# progress whatever it says, so recent commits promote a card into In progress
# and a declared-in-progress brief with no commits is flagged stale.

ACTIVE_DAYS = 7          # commits this recent => the task is being worked on now
STALE_DAYS = 10          # declared in progress, nothing this recent => stalled
GIT_WINDOW_DAYS = 90     # how far back to read the log
SWEEP_BRIEFS = 8         # a commit touching this many briefs is bookkeeping, not work

# Subject-line attribution: "roadmap 018", "task 7", "brief #012". Deliberately
# NOT a bare "#12" - that collides with PR and issue numbers.
MENTION_RE = re.compile(r"\b(?:roadmap|task|brief)s?\s*#?\s*0*(\d{1,4})\b", re.I)

REC, FLD = "\x01", "\x1f"
_GIT_CACHE: dict = {}


def _git(repo: Path, *args) -> str:
    out = subprocess.run(("git", "-C", str(repo)) + args, capture_output=True,
                         text=True, encoding="utf-8", errors="replace", timeout=60)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip()[:200])
    return out.stdout


def _records(blob: str, with_files: bool):
    """Parse the \\x01-delimited log into (sha, date, subject, [files])."""
    for rec in blob.split(REC):
        rec = rec.strip("\n")
        if not rec:
            continue
        head, _, rest = rec.partition("\n")
        parts = head.split(FLD)
        if len(parts) < 3:
            continue
        sha, when, subject = parts[0], parts[1], FLD.join(parts[2:])
        files = [f for f in rest.split("\n") if f.strip()] if with_files else []
        yield sha, when, subject, files


def git_activity(rm: Path) -> dict:
    """-> {task_id: {commits, last, subject, daysAgo}} for one roadmap folder.

    Two cheap calls beat one broad one: a path-limited --name-only log over the
    roadmap folder (which briefs were edited), plus a --grep log with no diff at
    all (which commits *named* a task in the subject, e.g. code work under
    "feat(roadmap 019): ..."). Results are cached per repo HEAD, so Refresh only
    pays the cost again after a commit lands.
    """
    try:
        root = Path(_git(rm, "rev-parse", "--show-toplevel").strip())
        head = _git(rm, "rev-parse", "HEAD").strip()
    except Exception:
        return {}
    key = (str(root), str(rm), head)
    if key in _GIT_CACHE:
        return _GIT_CACHE[key]

    try:
        rel = rm.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        rel = None

    since = f"--since={GIT_WINDOW_DAYS}.days"
    base = ("log", since, "--date=short", "--no-merges")
    # sha -> {"when","subject","ids": set, "sweep": bool}
    commits: dict = {}

    def note(sha, when, subject):
        return commits.setdefault(sha, {"when": when, "subject": subject,
                                        "ids": set(), "sweep": False})

    try:
        pathspec = ("--", rel) if rel else ()
        blob = _git(root, *base, "--name-only",
                    f"--pretty=format:{REC}%H{FLD}%ad{FLD}%s", *pathspec)
        for sha, when, subject, files in _records(blob, True):
            ids = set()
            for f in files:
                p = PurePosixPath(f)
                m = TASK_RE.match(p.name)
                if m and (rel is None or f.startswith(rel + "/")):
                    ids.add(int(m.group(1)))
            if not ids:
                continue
            c = note(sha, when, subject)
            # A commit that rewrites most of the folder is bookkeeping
            # (relabelling, renumbering) - it must not light up every card.
            if len(ids) >= SWEEP_BRIEFS:
                c["sweep"] = True
            else:
                c["ids"] |= ids
    except Exception:
        pass

    try:
        blob = _git(root, *base, f"--pretty=format:{REC}%H{FLD}%ad{FLD}%s",
                    "-i", "--grep=roadmap", "--grep=task", "--grep=brief")
        for sha, when, subject, _ in _records(blob, False):
            ids = {int(x) for x in MENTION_RE.findall(subject)}
            if not ids:
                continue
            c = note(sha, when, subject)
            if not c["sweep"]:
                c["ids"] |= ids
    except Exception:
        pass

    today = date.today()
    acts: dict = {}
    for c in commits.values():
        for tid in c["ids"]:
            a = acts.setdefault(tid, {"commits": 0, "last": c["when"],
                                      "subject": c["subject"]})
            a["commits"] += 1
            if c["when"] > a["last"]:        # ISO dates sort lexically
                a["last"], a["subject"] = c["when"], c["subject"]
    for a in acts.values():
        try:
            a["daysAgo"] = (today - datetime.strptime(a["last"], "%Y-%m-%d").date()).days
        except ValueError:
            a["daysAgo"] = None

    _GIT_CACHE[key] = acts
    return acts


def derive_state(status: str, done: bool) -> str:
    if done:
        return "done"
    s = status.lower().strip().lstrip("*_ ").strip()
    for state, prefixes in STATE_PREFIXES:
        if any(s.startswith(p) for p in prefixes):
            return state
    return "other"


def plain(s: str) -> str:
    """Strip light markdown for one-line summaries."""
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)
    s = s.replace("**", "").replace("`", "")
    s = re.sub(r"^\s*(?:[-*+]|\d+[.)])\s+", "", s)
    return s.strip()


def parse_brief(path: Path, done: bool) -> dict:
    raw = path.read_text(encoding="utf-8", errors="replace")
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")
    m = TASK_RE.match(path.name)
    ref, slug = m.group(1), m.group(2)

    title = None
    i = 0
    for idx in range(min(len(lines), 30)):
        tm = TITLE_RE.match(lines[idx])
        if tm:
            title = tm.group(1)
            i = idx + 1
            break
    if title is None:
        title = slug.replace("-", " ")

    # Meta block: **Key:** value lines directly under the title; values may wrap.
    meta: dict = {}
    j = i
    while j < len(lines):
        line = lines[j].strip()
        if not line:
            j += 1
            continue
        mm = META_RE.match(line)
        if not mm:
            break
        key, val = mm.group(1).strip(), mm.group(2).strip()
        j += 1
        while j < len(lines):
            nxt = lines[j].strip()
            if not nxt or nxt.startswith("#") or nxt.startswith("```") or META_RE.match(nxt):
                break
            val = (val + " " + nxt).strip()
            j += 1
        meta[key] = val

    label_raw = meta.get("Label", "").strip()
    label = label_raw.lower() if label_raw.lower() in KNOWN_LABELS else label_raw
    status = meta.get("Status", "").strip()

    # Summary: first plain paragraph after the meta block.
    summary = ""
    k = j
    fence = False
    while k < len(lines):
        line = lines[k].strip()
        if line.startswith("```"):
            fence = not fence
            k += 1
            continue
        if fence or not line or line.startswith("#") or line.startswith(">") or META_RE.match(line):
            k += 1
            continue
        buf = []
        while k < len(lines):
            ln = lines[k].strip()
            if not ln or ln.startswith("#") or ln.startswith("```"):
                break
            buf.append(plain(ln))
            k += 1
        summary = " ".join(x for x in buf if x)
        break
    if len(summary) > 240:
        summary = summary[:237].rstrip() + "…"

    extra = {k2: v for k2, v in meta.items() if k2 not in ("Label", "Status")}
    return {
        "id": int(ref),
        "ref": ref,
        "file": path.name,
        "title": title,
        "label": label,
        "status": status or "—",
        "state": derive_state(status, done),
        "done": done,
        "meta": extra,
        "summary": summary,
        "body": text,
    }


def apply_activity(task: dict, act: dict) -> None:
    """Fold observed git activity into a task: promote, or flag as stale."""
    task["activity"] = act
    days = act["daysAgo"] if act else None
    task["active"] = bool(act and days is not None and days <= ACTIVE_DAYS)
    if task["done"]:
        task["stale"] = False
        return
    if task["active"] and task["state"] in ("planned", "backlog", "other"):
        task["declaredState"] = task["state"]
        task["state"] = "inprogress"
        task["promoted"] = True
    task["stale"] = (task["state"] == "inprogress" and not task["active"])


def scan_roadmap(rm: Path, name: str, key: str, use_git: bool = True) -> dict:
    tasks = []
    if rm.is_dir():
        for p in sorted(rm.iterdir()):
            if p.is_file() and TASK_RE.match(p.name):
                tasks.append(parse_brief(p, False))
        done_dir = rm / "done"
        if done_dir.is_dir():
            for p in sorted(done_dir.iterdir()):
                if p.is_file() and TASK_RE.match(p.name):
                    tasks.append(parse_brief(p, True))
    activity = git_activity(rm) if use_git else {}
    for t in tasks:
        apply_activity(t, activity.get(t["id"]))
    tasks.sort(key=lambda t: t["id"])
    high = max((t["id"] for t in tasks), default=0)
    return {
        "name": name,
        "key": key,
        "path": str(rm),
        "nextId": high + 1,
        "openCount": sum(1 for t in tasks if not t["done"]),
        "doneCount": sum(1 for t in tasks if t["done"]),
        "activeCount": sum(1 for t in tasks if t.get("active") and not t["done"]),
        "tasks": tasks,
    }


def looks_like_roadmap(d: Path) -> bool:
    if (d / "done").is_dir():
        return True
    return any(TASK_RE.match(x.name) for x in d.glob("[0-9]*.md"))


def find_roadmap_dirs(root: Path) -> list:
    out = []
    for pat in ("*/docs/roadmap", "*/*/docs/roadmap"):
        for p in root.glob(pat):
            if "node_modules" in p.parts or ".git" in p.parts:
                continue
            if p.is_dir():
                out.append(p)
    return out


def resolve_targets(args) -> tuple:
    """-> ([(roadmap_dir, project_name, project_key)], source_description)"""
    targets: dict = {}
    roots = [Path(r).expanduser().resolve() for r in args.root]
    explicit = [Path(p).expanduser().resolve() for p in args.paths]
    if not explicit and not roots:
        roots = [DEFAULT_ROOT]

    for root in roots:
        for rm in find_roadmap_dirs(root):
            proj = rm.parents[1]  # strip docs/roadmap
            targets[rm.resolve()] = (proj.name, str(proj.relative_to(root)))

    for p in explicit:
        rm = proj = None
        if (p / "docs" / "roadmap").is_dir():
            rm, proj = p / "docs" / "roadmap", p
        elif p.is_dir() and p.name == "roadmap":
            rm = p
            proj = p.parents[1] if p.parent.name == "docs" else p.parent
        elif p.is_dir() and looks_like_roadmap(p):
            rm, proj = p, p.parent
        if rm is None:
            print(f"!! no roadmap found at {p} — skipped")
            continue
        targets[rm.resolve()] = (proj.name, proj.name)

    items = [(rm, name, key) for rm, (name, key) in targets.items()]
    items.sort(key=lambda x: x[1].lower())
    desc = ", ".join(str(r) for r in roots) if roots else "explicit paths"
    return items, desc


class BoardSource:
    """Local-directory source. A future repo-URL source must produce the same
    per-project dicts (see docs/roadmap/001-roadmap-board-repo-url-sources.md)."""

    def __init__(self, args):
        self.args = args

    def build(self) -> dict:
        t0 = time.time()
        items, desc = resolve_targets(self.args)
        use_git = not getattr(self.args, "no_git", False)
        projects = [scan_roadmap(rm, name, key, use_git) for rm, name, key in items]
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "source": desc,
            "scanMs": round((time.time() - t0) * 1000),
            "activeDays": ACTIVE_DAYS,
            "staleDays": STALE_DAYS,
            "projects": projects,
        }


def make_handler(source: BoardSource):
    class Handler(BaseHTTPRequestHandler):
        server_version = "roadmap-board/0.1"

        def do_GET(self):
            route = self.path.split("?", 1)[0]
            if route in STATIC:
                self.serve_static(STATIC[route])
            elif route == "/api/board":
                body = json.dumps(source.build()).encode("utf-8")
                self.reply(200, "application/json; charset=utf-8", body)
            else:
                self.reply(404, "text/plain; charset=utf-8", b"not found")

        def serve_static(self, name):
            f = TOOL_DIR / name
            if not f.is_file():
                self.reply(404, "text/plain; charset=utf-8", b"missing " + name.encode())
                return
            self.reply(200, MIME[f.suffix], f.read_bytes())

        def reply(self, code, ctype, body):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, fmt, *a):
            print("  " + fmt % a)

    return Handler


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("paths", nargs="*",
                    help="project roots (or roadmap dirs) to include; "
                         "disables auto-discovery unless --root is also given")
    ap.add_argument("--root", action="append", default=[],
                    help="scan DIR for */docs/roadmap and */*/docs/roadmap "
                         "(default: the folder two levels above this repo)")
    ap.add_argument("--port", type=int, default=4830)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--no-git", action="store_true",
                    help="skip the git activity scan (columns then follow the "
                         "**Status:** line alone)")
    args = ap.parse_args()

    source = BoardSource(args)
    board = source.build()
    print(f"Roadmap Board — scanning: {board['source']}  ({board['scanMs']}ms)")
    for p in board["projects"]:
        print(f"  · {p['name']:<24} {p['openCount']:>3} open / {p['doneCount']} done"
              f"   {p['activeCount']} active   next ID {p['nextId']:03d}   {p['path']}")
    if not board["projects"]:
        print("  (no docs/roadmap folders found — pass project paths or --root)")

    srv = ThreadingHTTPServer((args.host, args.port), make_handler(source))
    print(f"\n→ http://{args.host}:{args.port}   (Ctrl+C to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
