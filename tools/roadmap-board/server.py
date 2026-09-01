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
DEPENDS_RE = re.compile(r"\b0*(\d{1,4})\b")

KNOWN_LABELS = ("bug", "infra", "feature", "backlog")

# The release registry: docs/roadmap/releases.md — furniture (no NNN- prefix),
# so /roadmap never mistakes it for a task. One "## <name>" section per release;
# the heading text IS the release name, spelled exactly as briefs reference it
# in their **Release:** line. Meta lines: **Target:** (free-form date) and
# **Status:** planned | released <when>. File order is display order.
RELEASES_FILE = "releases.md"
H2_RE = re.compile(r"^##\s+(.+?)\s*$")

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

# Writing a brief is not doing the work it describes. Conventional-commit
# subjects already say which is which, so use them: a `docs(...)` commit counts
# as brief activity, anything else counts as code. Where the convention is not
# followed the classification degrades to "code", which is the safer error.
DOCS_RE = re.compile(r"^\s*docs?\b", re.I)

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
        docs = bool(DOCS_RE.match(c["subject"]))
        for tid in c["ids"]:
            a = acts.setdefault(tid, {"commits": 0, "codeCommits": 0, "docCommits": 0,
                                      "last": c["when"], "lastCode": None,
                                      "subject": c["subject"]})
            a["commits"] += 1
            a["docCommits" if docs else "codeCommits"] += 1
            if c["when"] > a["last"]:        # ISO dates sort lexically
                a["last"], a["subject"] = c["when"], c["subject"]
            if not docs and (a["lastCode"] is None or c["when"] > a["lastCode"]):
                a["lastCode"] = c["when"]
    for a in acts.values():
        a["docsOnly"] = a["codeCommits"] == 0
        try:
            a["daysAgo"] = (today - datetime.strptime(a["last"], "%Y-%m-%d").date()).days
        except ValueError:
            a["daysAgo"] = None
        try:
            a["codeDaysAgo"] = (today - datetime.strptime(a["lastCode"], "%Y-%m-%d").date()).days \
                if a["lastCode"] else None
        except ValueError:
            a["codeDaysAgo"] = None

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
    release = meta.get("Release", "").strip() or None

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

    # **Depends:** 018, 019 - hard blockers only, by task id.
    depends = sorted({int(x) for x in DEPENDS_RE.findall(meta.get("Depends", ""))})

    extra = {k2: v for k2, v in meta.items()
             if k2 not in ("Label", "Status", "Depends", "Release")}
    return {
        "depends": depends,
        "id": int(ref),
        "ref": ref,
        "file": path.name,
        "title": title,
        "label": label,
        "release": release,
        "status": status or "—",
        "state": derive_state(status, done),
        "done": done,
        "meta": extra,
        "summary": summary,
        "body": text,
    }


def parse_releases(rm: Path) -> list:
    """Read the release registry (releases.md) into declared releases, in file
    order. Prose above the first ## heading is for people and is skipped."""
    f = None
    if rm.is_dir():
        f = next((p for p in rm.iterdir()
                  if p.is_file() and p.name.lower() == RELEASES_FILE), None)
    if f is None:
        return []
    text = f.read_text(encoding="utf-8", errors="replace")
    releases, cur, fence = [], None, False
    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        s = line.strip()
        if s.startswith("```"):
            fence = not fence
            continue
        if fence:
            continue
        h = H2_RE.match(s)
        if h:
            cur = {"name": h.group(1), "target": "", "status": "planned",
                   "releasedOn": "", "description": "", "declared": True,
                   "_closed": False}
            releases.append(cur)
            continue
        if cur is None:
            continue
        if not s or s.startswith("#"):
            # A blank line or heading ends the first paragraph - the
            # description is that paragraph, nothing after it.
            cur["_closed"] = cur["_closed"] or bool(cur["description"])
            continue
        mm = META_RE.match(s)
        if mm:
            key, val = mm.group(1).strip().lower(), mm.group(2).strip()
            if key == "target":
                cur["target"] = val
            elif key == "status" and val.lower().startswith("released"):
                cur["status"] = "released"
                cur["releasedOn"] = val[len("released"):].strip(" -—:")
            continue
        if not cur["_closed"] and not s.startswith((">", "|", "-", "*")):
            cur["description"] = (cur["description"] + " " + plain(s)).strip()
    for r in releases:
        r.pop("_closed", None)
    return releases


def merge_releases(tasks: list, releases: list) -> list:
    """Unify task **Release:** spellings with the registry, and append releases
    that briefs name but the registry does not declare."""
    canon = {r["name"].casefold(): r["name"] for r in releases}
    adhoc: dict = {}
    for t in tasks:
        rel = t.get("release")
        if not rel:
            continue
        c = canon.get(rel.casefold())
        if c:
            t["release"] = c
        else:
            t["release"] = adhoc.setdefault(rel.casefold(), rel)
    for name in sorted(adhoc.values(), key=str.casefold):
        releases.append({"name": name, "target": "", "status": "planned",
                         "releasedOn": "", "description": "", "declared": False})
    return releases


def apply_activity(task: dict, act: dict) -> None:
    """Fold observed git activity into a task: promote, or flag as stale."""
    task["activity"] = act
    days = act["daysAgo"] if act else None
    task["active"] = bool(act and days is not None and days <= ACTIVE_DAYS)
    if task["done"]:
        task["stale"] = False
        return
    # Promotion needs *code*. Writing or re-labelling the brief is not doing the
    # work it describes, and treating it as such put freshly-authored briefs in
    # the In progress column on the day they were created.
    code = bool(act) and not act.get("docsOnly")
    if task["active"] and code and task["state"] in ("planned", "backlog", "other"):
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
    releases = merge_releases(tasks, parse_releases(rm))
    high = max((t["id"] for t in tasks), default=0)
    return {
        "name": name,
        "key": key,
        "path": str(rm),
        "nextId": high + 1,
        "releases": releases,
        "openCount": sum(1 for t in tasks if not t["done"]),
        "doneCount": sum(1 for t in tasks if t["done"]),
        "activeCount": sum(1 for t in tasks if t.get("active") and not t["done"]),
        "tasks": tasks,
    }


# --------------------------------------------------------------------------
# The AI Roadmap: what order to actually do this in.
#
# The board answers "where does everything stand". It does not answer "what
# next", and with twenty open briefs that is the question that matters. So the
# same data is read a second way, into four buckets - and every task carries
# the sentence explaining why it landed where it did, because a running order
# nobody can argue with is a running order nobody trusts.

BUCKETS = ("now", "next", "later", "someday")

# What each signal is worth. Deliberately small and legible: you should be able
# to read a row's "why" and reconstruct its score.
W_STATE = {"inprogress": 45, "planned": 25, "other": 10, "blocked": 5, "backlog": 5}
W_LABEL = {"bug": 18, "feature": 10, "infra": 6, "backlog": 0}
W_ACTIVE = 25            # code committed in the active window - someone is really on it
W_ACTIVE_DOCS = 8        # only the brief was edited: thought about, not built
W_STALE = -8             # declares in progress, nothing committed
W_UNLOCK = 8             # per task transitively waiting on this one
W_UNLOCK_CAP = 24
W_DEPTH = -12            # per layer of blockers between here and startable


def sequence(projects: list) -> list:
    """Order every open task across all projects. Returns bucket dicts."""
    tasks = {}               # (project, id) -> task
    for p in projects:
        for t in p["tasks"]:
            t["_key"] = (p["key"], t["id"])
            tasks[t["_key"]] = t

    def deps_of(t):
        """Resolve **Depends:** ids within the same project; drop what is done."""
        pk = t["_key"][0]
        out = []
        for d in t.get("depends", []):
            other = tasks.get((pk, d))
            if other is not None and not other["done"]:
                out.append(other)
        return out

    # Depth = how many layers of unfinished blockers sit under a task. Cycles
    # cannot happen in a DAG of hand-written ids, but a typo can make one, so
    # the walk carries its own visited set rather than trusting the data.
    depth_memo = {}

    def depth(t, seen=()):
        k = t["_key"]
        if k in depth_memo:
            return depth_memo[k]
        if k in seen:
            return 0                      # a cycle: treat as startable, flag below
        d = deps_of(t)
        val = 0 if not d else 1 + max(depth(x, seen + (k,)) for x in d)
        depth_memo[k] = val
        return val

    # Transitive dependents: how much work this one task is holding up.
    dependents = {k: set() for k in tasks}
    for k, t in tasks.items():
        for d in deps_of(t):
            dependents[d["_key"]].add(k)
    changed = True
    while changed:                        # cheap transitive closure; N is tiny
        changed = False
        for k in tasks:
            grown = set(dependents[k])
            for c in dependents[k]:
                grown |= dependents[c]
            grown.discard(k)
            if grown != dependents[k]:
                dependents[k], changed = grown, True

    rows = []
    for k, t in tasks.items():
        if t["done"]:
            continue
        blockers = deps_of(t)
        d = depth(t)
        unlocks = len(dependents[k])
        score = (W_STATE.get(t["state"], 10)
                 + W_LABEL.get(t["label"], 0)
                 + (0 if not t.get("active")
                    else W_ACTIVE_DOCS if t["activity"].get("docsOnly") else W_ACTIVE)
                 + (W_STALE if t.get("stale") else 0)
                 + min(unlocks * W_UNLOCK, W_UNLOCK_CAP)
                 + d * W_DEPTH)

        # The bucket is a rule, not the score - the score only orders within it.
        if blockers or t["state"] == "blocked":
            bucket = "later"
        elif t["state"] == "backlog" or t["label"] == "backlog":
            bucket = "someday"
        elif t["state"] == "inprogress" or (
                t.get("active") and not t["activity"].get("docsOnly")):
            bucket = "now"
        else:
            bucket = "next"

        why = []
        if t.get("active"):
            a = t["activity"]
            n = a["commits"]
            why.append(f"{n} commit{'' if n == 1 else 's'} in the last {ACTIVE_DAYS} days"
                       + (" — the brief only, no code" if a.get("docsOnly") else ""))
        elif t.get("stale"):
            why.append("declares in progress but nothing is committed")
        if blockers:
            why.append("waits on " + ", ".join(f"#{b['ref']}" for b in blockers))
        elif t["state"] == "blocked":
            why.append("blocked by something outside the brief")
        if unlocks:
            names = sorted(f"#{tasks[c]['ref']}" for c in dependents[k])
            why.append(f"unblocks {', '.join(names)}")
        if t["label"] == "bug":
            why.append("a bug: shipped behaviour is wrong")
        if not why:
            why.append("committed and nothing is in its way"
                       if bucket == "next" else "not committed to yet")

        rows.append({
            "project": t["_key"][0], "id": t["id"], "ref": t["ref"],
            "bucket": bucket, "score": score, "depth": d, "unlocks": unlocks,
            "blockedBy": [{"ref": b["ref"], "title": b["title"]} for b in blockers],
            "why": "; ".join(why),
        })

    rows.sort(key=lambda r: (-r["score"], r["project"], r["id"]))
    order = {b: i for i, b in enumerate(BUCKETS)}
    rows.sort(key=lambda r: order[r["bucket"]])
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows


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
            "sequence": sequence(projects),
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
