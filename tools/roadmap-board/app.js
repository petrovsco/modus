"use strict";

const $ = (sel, el) => (el || document).querySelector(sel);
const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

const STATE_COLS = [
  { key: "backlog",    name: "Backlog" },
  { key: "planned",    name: "Planned" },
  { key: "inprogress", name: "In progress" },
  { key: "blocked",    name: "Blocked", optional: true },
  { key: "other",      name: "Other",   optional: true },
  { key: "done",       name: "Done" },
];
const STATE_DOT = {
  backlog: "#8b8d98", planned: "#4f6ef7",
  inprogress: "#2f9e63", blocked: "#e5484d", other: "#9aa0aa", done: "#5cb87a",
};
const LABELS = ["bug", "infra", "feature", "backlog"];
const LABEL_DOT = { bug: "#e5484d", infra: "#8e4ec6", feature: "#2f9e63", backlog: "#8b8d98", none: "#b3b7be" };
const PROJECT_COLORS = ["#4f6ef7", "#0ea5a4", "#e8842c", "#d6549e", "#7a63e0", "#5f8f2f", "#c8a232", "#3f8cd6"];
const REL_DOT = "#0e8f8e";

let DATA = null;
const F = { q: "", projects: new Set(), labels: new Set(), releases: new Set(), showDone: true, group: "state", view: "board" };

/* ---------- helpers ---------- */

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function clip(s, n) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function labKey(t) {
  return LABELS.includes(t.label) ? t.label : "none";
}

function relKey(t) {
  return t.release || "none";
}

/* Every release name known to the board, in registry order, deduped across
   projects (two projects can ship a "2.0.0" of their own). */
function releaseNames() {
  const seen = new Set();
  const names = [];
  for (const p of DATA.projects) {
    for (const r of p.releases || []) {
      if (!seen.has(r.name)) { seen.add(r.name); names.push(r.name); }
    }
  }
  return names;
}

/* ---------- activity ---------- */

function ago(d) {
  if (d == null) return "";
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 14) return d + "d ago";
  if (d < 60) return Math.round(d / 7) + "w ago";
  return Math.round(d / 30) + "mo ago";
}

/* The Status line says what was decided; git says what was done. A card shows
   both, and says so when they disagree. */
function activityHTML(t) {
  if (t.done) return "";
  const a = t.activity;
  if (t.active && a) {
    const why = t.promoted
      ? ' <span class="why" title="Column set by commits, not the Status line — that still reads &quot;' +
        esc(clip(t.status, 60)) + '&quot;">moved here</span>'
      : "";
    return '<div class="act live"><span class="adot"></span>' +
      a.commits + (a.commits === 1 ? " commit · " : " commits · ") + ago(a.daysAgo) + why +
      '</div><div class="act-msg" title="' + esc(a.subject) + '">' + esc(clip(a.subject, 70)) + "</div>";
  }
  if (t.stale) {
    return '<div class="act stale">◌ says in progress · ' +
      (a ? "last commit " + ago(a.daysAgo) : "no commits on record") + "</div>";
  }
  return "";
}

function byActivity(a, b) {
  const da = a.activity && a.activity.daysAgo != null ? a.activity.daysAgo : 9999;
  const db = b.activity && b.activity.daysAgo != null ? b.activity.daysAgo : 9999;
  if (da !== db) return da - db;
  const ca = (a.activity && a.activity.commits) || 0;
  const cb = (b.activity && b.activity.commits) || 0;
  if (ca !== cb) return cb - ca;
  return byProjectAndId(a, b);
}

function stateName(k) {
  const col = STATE_COLS.find((c) => c.key === k);
  return col ? col.name : k;
}

function labelChip(label) {
  if (!label) return '<span class="lchip lbl-none">—</span>';
  const known = LABELS.includes(label);
  return '<span class="lchip lbl-' + (known ? label : "none") + '">' + esc(label) + "</span>";
}

function relChip(t) {
  return t.release ? '<span class="rchip">' + esc(t.release) + "</span>" : "";
}

function allTasks() {
  const out = [];
  for (const p of DATA.projects) {
    for (const t of p.tasks) {
      out.push({ ...t, project: p.name, projectKey: p.key, color: p.color, projPath: p.path });
    }
  }
  return out;
}

function matches(t) {
  // The releases view keeps done tickets whatever the toggle says - without
  // them a release's progress bar cannot mean anything.
  if (!F.showDone && t.state === "done" && F.view !== "releases") return false;
  if (F.projects.size && !F.projects.has(t.projectKey)) return false;
  if (F.labels.size && !F.labels.has(labKey(t))) return false;
  if (F.releases.size && !F.releases.has(relKey(t))) return false;
  if (F.q) {
    const q = F.q.toLowerCase();
    const hay = [t.title, t.summary, t.status, t.file, t.project, "#" + t.id, t.ref, t.label, t.release, t.body]
      .join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function byProjectAndId(a, b) {
  return a.project === b.project ? a.id - b.id : a.project.localeCompare(b.project);
}

/* Grouping and the done toggle only mean something on the board and the list —
   the roadmap shows open work in one fixed order, and the releases view always
   includes done (the progress bars need it). */
function syncControls() {
  const rm = F.view === "roadmap" || F.view === "releases";
  $("#group").disabled = rm;
  $("#showDone").disabled = rm;
  $("#group").classList.toggle("dim", rm);
  $("#showDone").closest("label").classList.toggle("dim", rm);
}

/* ---------- load + render ---------- */

async function load() {
  try {
    const res = await fetch("/api/board");
    if (!res.ok) throw new Error("HTTP " + res.status);
    DATA = await res.json();
  } catch (err) {
    $("#main").innerHTML =
      '<div class="empty big">Could not load /api/board — is server.py running? (' + esc(String(err)) + ")</div>";
    return;
  }
  DATA.projects.forEach((p, i) => { p.color = PROJECT_COLORS[i % PROJECT_COLORS.length]; });
  renderFilters();
  render();
  openFromHash();
}

/* Deep link: #<projectKey>:<id> opens that task's modal */
function openFromHash() {
  const m = /^#(.+):(\d+)$/.exec(location.hash || "");
  if (!m) return;
  const key = decodeURIComponent(m[1]);
  const id = Number(m[2]);
  const t = allTasks().find((x) => x.projectKey === key && x.id === id);
  if (t) openModal(t);
}

function render() {
  const tasks = allTasks().filter(matches);
  renderStats(tasks);
  const main = $("#main");
  main.innerHTML = "";
  main.appendChild(
    F.view === "list" ? renderList(tasks)
      : F.view === "roadmap" ? renderRoadmap(tasks)
      : F.view === "releases" ? renderReleases(tasks)
      : renderBoard(tasks)
  );
}

/* ---------- the AI Roadmap ----------
   The board says where each brief stands. It does not say what to do next, and
   with twenty open briefs that is the question that matters. The server ranks
   the open work into four buckets and hands back the sentence explaining each
   placement; this renders it. Every row is arguable — that is the point, an
   order you cannot interrogate is an order you cannot trust. */

const BUCKETS = [
  { key: "now", name: "Now",
    blurb: "Started, and nothing is in the way. Finish these before opening anything new." },
  { key: "next", name: "Next",
    blurb: "Committed, unblocked, nobody on it. This is where the next session starts." },
  { key: "later", name: "Later",
    blurb: "Something has to land first. The blocker is named on every row." },
  { key: "someday", name: "Someday",
    blurb: "Not committed to. It needs a decision before it can be scheduled, not a slot." },
];

function seqRows(tasks) {
  const seq = (DATA && DATA.sequence) || [];
  const by = new Map(tasks.map((t) => [t.projectKey + ":" + t.id, t]));
  return seq
    .map((r) => ({ r, t: by.get(r.project + ":" + r.id) }))
    .filter((x) => x.t);
}

function renderRoadmap(tasks) {
  const wrap = document.createElement("div");
  wrap.className = "roadmap";
  const rows = seqRows(tasks);

  if (!rows.length) {
    wrap.innerHTML = '<div class="empty big">No open tasks match.</div>';
    return wrap;
  }

  const intro = document.createElement("p");
  intro.className = "rm-intro";
  intro.innerHTML =
    "A proposed running order for the <b>" + rows.length + "</b> open brief" +
    (rows.length === 1 ? "" : "s") + ". Order comes from declared " +
    '<code>**Depends:**</code> lines first, then from state, label, observed git ' +
    "activity, and how much other work each one unblocks. Nothing here is written " +
    "back to the briefs — it is a read, like the board.";
  wrap.appendChild(intro);

  for (const b of BUCKETS) {
    const mine = rows.filter((x) => x.r.bucket === b.key);
    const sec = document.createElement("section");
    sec.className = "rm-band rm-" + b.key;
    sec.innerHTML =
      '<header class="rm-head"><h2>' + esc(b.name) + '</h2>' +
      '<span class="cnt">' + mine.length + "</span>" +
      '<span class="rm-blurb">' + esc(b.blurb) + "</span></header>";
    const body = document.createElement("div");
    body.className = "rm-body";
    if (!mine.length) {
      body.innerHTML = '<div class="empty">—</div>';
    } else {
      for (const { r, t } of mine) body.appendChild(roadmapRow(r, t));
    }
    sec.appendChild(body);
    wrap.appendChild(sec);
  }
  return wrap;
}

function roadmapRow(r, t) {
  const el = document.createElement("article");
  el.className = "rm-row" + (t.active ? " is-active" : "") + (t.stale ? " is-stale" : "");
  const blockers = (r.blockedBy || [])
    .map((b) => '<span class="dep" title="' + esc(b.title) + '">#' + esc(b.ref) + "</span>")
    .join("");
  el.innerHTML =
    '<span class="rm-rank">' + r.rank + "</span>" +
    '<div class="rm-main">' +
      '<div class="rm-title"><span class="ref">#' + t.id + "</span> " +
        esc(t.title) + labelChip(t.label) + "</div>" +
      '<div class="rm-why">' + esc(r.why) + "</div>" +
    "</div>" +
    '<div class="rm-side">' +
      '<span class="pdot" style="background:' + t.color + '"></span>' +
      '<span class="rm-proj">' + esc(t.project) + "</span>" +
      (blockers ? '<span class="rm-deps">waits on ' + blockers + "</span>" : "") +
      (r.unlocks ? '<span class="rm-unlocks" title="Tasks transitively waiting on this one">' +
        "unblocks " + r.unlocks + "</span>" : "") +
    "</div>";
  el.addEventListener("click", () => openModal(t));
  return el;
}

function renderStats(shown) {
  const open = shown.filter((t) => !t.done).length;
  const done = shown.filter((t) => t.done).length;
  const active = shown.filter((t) => t.active && !t.done).length;
  const stale = shown.filter((t) => t.stale).length;
  $("#stats").textContent =
    shown.length + " shown · " + open + " open · " + active + " active · " +
    (stale ? stale + " stale · " : "") + done + " done · " +
    DATA.projects.length + " projects · scan " + DATA.scanMs + "ms";
  $("#stats").title =
    "active = a commit touching the brief, or naming it in the subject, within " +
    DATA.activeDays + " days\nstale = the Status line says in progress but nothing has been committed";
}

function mkChip(o) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip " + (o.cls || "") + (o.active ? " on" : "");
  if (o.title) b.title = o.title;
  b.innerHTML =
    (o.dot ? '<span class="pdot" style="background:' + o.dot + '"></span>' : "") +
    esc(o.text) +
    (o.count != null ? ' <span class="cnt">' + o.count + "</span>" : "");
  b.addEventListener("click", () => o.onClick(b));
  return b;
}

function toggleSet(set, v) {
  if (set.has(v)) set.delete(v); else set.add(v);
}

function renderFilters() {
  const pc = $("#projChips");
  pc.innerHTML = "";
  for (const p of DATA.projects) {
    pc.appendChild(mkChip({
      text: p.name,
      dot: p.color,
      count: p.openCount,
      title: p.path + "  —  next free ID " + String(p.nextId).padStart(3, "0"),
      active: F.projects.has(p.key),
      onClick: (el) => { toggleSet(F.projects, p.key); el.classList.toggle("on"); render(); },
    }));
  }
  const lc = $("#labelChips");
  lc.innerHTML = "";
  const tasks = allTasks();
  const keys = LABELS.slice();
  if (tasks.some((t) => labKey(t) === "none")) keys.push("none");
  for (const l of keys) {
    const n = tasks.filter((t) => labKey(t) === l).length;
    lc.appendChild(mkChip({
      text: l === "none" ? "no label" : l,
      cls: "lbl-" + l,
      count: n,
      active: F.labels.has(l),
      onClick: (el) => { toggleSet(F.labels, l); el.classList.toggle("on"); render(); },
    }));
  }
  renderReleaseChips(tasks);
}

/* The release row only exists once something declares or names a release —
   until then it would be a separator with nothing after it. */
function renderReleaseChips(tasks) {
  const rc = $("#relChips");
  const meta = new Map();
  for (const p of DATA.projects) for (const r of p.releases || []) if (!meta.has(r.name)) meta.set(r.name, r);
  const keys = releaseNames();
  if (keys.length && tasks.some((t) => !t.release)) keys.push("none");
  rc.hidden = $("#relSep").hidden = !keys.length;
  rc.innerHTML = "";
  for (const name of keys) {
    const r = meta.get(name);
    const bits = r && r.status === "released"
      ? ["released" + (r.releasedOn ? " " + r.releasedOn : "")]
      : r ? ["planned"] : [];
    if (r && r.target) bits.push("target " + r.target);
    if (r && r.declared === false) bits.push("undeclared — named by briefs only");
    rc.appendChild(mkChip({
      text: name === "none" ? "no release" : name,
      dot: name === "none" ? LABEL_DOT.none : REL_DOT,
      count: tasks.filter((t) => relKey(t) === name).length,
      title: bits.join(" · ") || undefined,
      active: F.releases.has(name),
      onClick: (el) => { toggleSet(F.releases, name); el.classList.toggle("on"); render(); },
    }));
  }
}

function groupsFor(tasks) {
  if (F.group === "label") {
    const keys = LABELS.concat(["none"]);
    return keys
      .map((l) => ({
        key: l,
        name: l === "none" ? "no label" : l,
        dot: LABEL_DOT[l],
        optional: l === "none",
        items: tasks.filter((t) => labKey(t) === l),
      }))
      .filter((g) => !g.optional || g.items.length);
  }
  if (F.group === "project") {
    return DATA.projects.map((p) => ({
      key: p.key, name: p.name, dot: p.color,
      items: tasks.filter((t) => t.projectKey === p.key),
    }));
  }
  if (F.group === "release") {
    // A release filter narrows the columns too - otherwise picking one release
    // leaves every other column standing and empty.
    let names = releaseNames();
    if (F.releases.size) names = names.filter((n) => F.releases.has(n));
    const groups = names.map((name) => ({
      key: "rel:" + name, name: name, dot: REL_DOT,
      items: tasks.filter((t) => t.release === name),
    }));
    groups.push({
      key: "rel:none", name: "no release", dot: LABEL_DOT.none, optional: true,
      items: tasks.filter((t) => !t.release),
    });
    return groups.filter((g) => !g.optional || g.items.length);
  }
  const cols = F.showDone ? STATE_COLS : STATE_COLS.filter((c) => c.key !== "done");
  return cols
    .map((c) => ({
      key: c.key, name: c.name, dot: STATE_DOT[c.key], optional: c.optional,
      items: tasks.filter((t) => t.state === c.key),
    }))
    .filter((g) => !g.optional || g.items.length);
}

function card(t) {
  const el = document.createElement("article");
  el.className = "card" + (t.done ? " is-done" : "");
  if (t.active) el.classList.add("is-active");
  if (t.stale) el.classList.add("is-stale");
  el.innerHTML =
    '<div class="card-top"><span class="ref">#' + t.id + '</span>' +
    '<span class="card-chips">' + relChip(t) + labelChip(t.label) + "</span></div>" +
    '<h3 class="card-title">' + esc(t.title) + "</h3>" +
    '<div class="card-status">' + esc(clip(t.status, 90)) + "</div>" +
    activityHTML(t) +
    '<div class="card-foot"><span class="pdot" style="background:' + t.color + '"></span>' + esc(t.project) + "</div>";
  el.addEventListener("click", () => openModal(t));
  return el;
}

function renderBoard(tasks) {
  const wrap = document.createElement("div");
  wrap.className = "board";
  const groups = groupsFor(tasks);
  for (const g of groups) {
    const col = document.createElement("section");
    col.className = "col";
    const head = document.createElement("header");
    head.className = "col-head";
    head.innerHTML =
      (g.dot ? '<span class="pdot" style="background:' + g.dot + '"></span>' : "") +
      "<span>" + esc(g.name) + '</span><span class="cnt">' + g.items.length + "</span>";
    col.appendChild(head);
    const body = document.createElement("div");
    body.className = "col-body";
    // In progress reads most-recently-worked first; everywhere else, by ID.
    const items = g.items.slice().sort(g.key === "inprogress" ? byActivity : byProjectAndId);
    for (const t of items) body.appendChild(card(t));
    if (!items.length) {
      const e = document.createElement("div");
      e.className = "empty";
      e.textContent = "—";
      body.appendChild(e);
    }
    col.appendChild(body);
    wrap.appendChild(col);
  }
  if (!groups.length) {
    const e = document.createElement("div");
    e.className = "empty big";
    e.textContent = "No tasks match.";
    wrap.appendChild(e);
  }
  return wrap;
}

function renderList(tasks) {
  const wrap = document.createElement("div");
  wrap.className = "listwrap";
  const table = document.createElement("table");
  table.className = "list";
  table.innerHTML =
    "<thead><tr><th>Project</th><th>ID</th><th>Task</th><th>Label</th><th>Release</th><th>State</th>" +
    "<th>Activity</th><th>Status</th></tr></thead>";
  const tb = document.createElement("tbody");
  for (const t of tasks.slice().sort(byProjectAndId)) {
    const tr = document.createElement("tr");
    if (t.done) tr.className = "is-done";
    tr.innerHTML =
      '<td class="nowrap"><span class="pdot" style="background:' + t.color + '"></span>' + esc(t.project) + "</td>" +
      '<td class="ref">#' + t.id + "</td>" +
      "<td>" + esc(t.title) + '<div class="sub">' + esc(clip(t.summary, 140)) + "</div></td>" +
      "<td>" + labelChip(t.label) + "</td>" +
      '<td class="nowrap">' + (relChip(t) || '<span class="sub">—</span>') + "</td>" +
      '<td class="nowrap">' + esc(stateName(t.state)) +
        (t.promoted ? ' <span class="why">moved</span>' : "") +
        (t.stale ? ' <span class="why stale">stale</span>' : "") + "</td>" +
      '<td class="nowrap">' + (t.activity
        ? esc(ago(t.activity.daysAgo)) + ' <span class="sub">· ' + t.activity.commits + "</span>"
        : '<span class="sub">—</span>') + "</td>" +
      "<td>" + esc(clip(t.status, 110)) + "</td>";
    tr.addEventListener("click", () => openModal(t));
    tb.appendChild(tr);
  }
  table.appendChild(tb);
  wrap.appendChild(table);
  if (!tasks.length) {
    const e = document.createElement("div");
    e.className = "empty big";
    e.textContent = "No tasks match.";
    wrap.appendChild(e);
  }
  return wrap;
}

/* ---------- Releases — the Jira version view ----------
   One panel per release, per project: status and target, a progress bar
   (done / in progress / remaining), and the tickets committed to it. The
   registry is docs/roadmap/releases.md; a release that only briefs name still
   shows, marked undeclared. Open tickets with no release land in Unscheduled —
   that pile is the planning inbox. */

const REL_STATE_ORDER = ["inprogress", "blocked", "planned", "backlog", "other", "done"];

function relSort(a, b) {
  const d = REL_STATE_ORDER.indexOf(a.state) - REL_STATE_ORDER.indexOf(b.state);
  return d !== 0 ? d : a.id - b.id;
}

function relRow(t) {
  const el = document.createElement("div");
  el.className = "rel-task" + (t.done ? " is-done" : "");
  el.innerHTML =
    '<span class="ref">#' + t.id + "</span>" +
    '<span class="rel-title">' + esc(t.title) + "</span>" +
    (t.promoted ? '<span class="why">moved</span>' : "") +
    (t.stale ? '<span class="why stale">stale</span>' : "") +
    labelChip(t.label) +
    '<span class="rel-state st-' + t.state + '">' + esc(stateName(t.state)) + "</span>" +
    '<span class="rel-ago">' + (t.activity ? esc(ago(t.activity.daysAgo)) : "") + "</span>";
  el.addEventListener("click", () => openModal(t));
  return el;
}

function relPanel(rel, items, open) {
  const d = document.createElement("details");
  d.className = "rel" + (rel.pseudo ? " pseudo" : "");
  d.open = open;

  const n = items.length;
  const done = items.filter((t) => t.done).length;
  const prog = items.filter((t) => !t.done && t.state === "inprogress").length;
  const pct = n ? Math.round((done / n) * 100) : 0;

  const chips = rel.pseudo ? "" :
    (rel.status === "released"
      ? '<span class="relpill released">released' + (rel.releasedOn ? " " + esc(rel.releasedOn) : "") + "</span>"
      : '<span class="relpill">planned</span>') +
    (rel.target ? '<span class="relpill">target ' + esc(rel.target) + "</span>" : "") +
    (rel.declared === false
      ? '<span class="relpill undeclared" title="Named by briefs but not declared in releases.md">undeclared</span>'
      : "");
  const count = rel.pseudo
    ? n + " open, no release"
    : n ? pct + "% · " + done + " of " + n + " done" : "no tickets";
  const bar = rel.pseudo || !n ? "" :
    '<div class="bar" title="' + done + " done · " + prog + " in progress · " +
      (n - done - prog) + ' to do">' +
      '<span class="b-done" style="width:' + (done / n) * 100 + '%"></span>' +
      '<span class="b-prog" style="width:' + (prog / n) * 100 + '%"></span></div>';

  const sum = document.createElement("summary");
  sum.innerHTML =
    '<span class="rel-name">' + esc(rel.name) + "</span>" + chips +
    '<span class="rel-count">' + count + "</span>" + bar;
  d.appendChild(sum);

  const body = document.createElement("div");
  body.className = "rel-body";
  if (rel.description) {
    const p = document.createElement("p");
    p.className = "rel-desc";
    p.textContent = rel.description;
    body.appendChild(p);
  }
  if (!n) {
    const e = document.createElement("div");
    e.className = "empty";
    e.textContent = "No tickets yet — put **Release: " + rel.name + "** in a brief's header.";
    body.appendChild(e);
  }
  for (const t of items.slice().sort(relSort)) body.appendChild(relRow(t));
  d.appendChild(body);
  return d;
}

function renderReleases(tasks) {
  const wrap = document.createElement("div");
  wrap.className = "releases";
  const filtered = F.q || F.projects.size || F.labels.size || F.releases.size;
  let any = false;

  for (const p of DATA.projects) {
    if (!(p.releases || []).length) continue;
    // A release filter hides the panels it excludes, so the view shows the
    // releases you asked for rather than a page of empty ones.
    const rels = p.releases.filter((r) => !F.releases.size || F.releases.has(r.name));
    const mine = tasks.filter((t) => t.projectKey === p.key);
    const un = mine.filter((t) => !t.release && !t.done);
    if (!rels.length && !un.length) continue;
    if (!mine.length && filtered) continue;
    any = true;

    const sec = document.createElement("section");
    sec.className = "rel-proj";
    sec.innerHTML =
      '<h2><span class="pdot" style="background:' + p.color + '"></span>' + esc(p.name) + "</h2>";
    for (const r of rels) {
      const items = mine.filter((t) => t.release === r.name);
      sec.appendChild(relPanel(r, items, r.status !== "released"));
    }
    if (un.length) sec.appendChild(relPanel({ name: "Unscheduled", pseudo: true }, un, false));
    wrap.appendChild(sec);
  }

  if (!any) {
    wrap.innerHTML =
      '<div class="empty big">No releases' + (filtered ? " match." : " yet.") +
      (filtered ? "" :
        " Add a <code>**Release:** 2.0.0</code> line to a brief, or declare releases in " +
        "<code>docs/roadmap/releases.md</code> (one <code>## name</code> section each, with " +
        "optional <code>**Target:**</code> and <code>**Status:** released …</code> lines).") +
      "</div>";
  }
  return wrap;
}

/* ---------- modal ---------- */

function openModal(t) {
  $("#m-ref").textContent = "#" + t.id;
  $("#m-proj").innerHTML = '<span class="pdot" style="background:' + t.color + '"></span>' + esc(t.project);
  $("#m-label").innerHTML = labelChip(t.label);
  $("#m-rel").innerHTML = relChip(t);
  const a = t.activity;
  $("#m-state").textContent = stateName(t.state) + (t.done ? " · in done/" : "");
  $("#m-state").className = "statepill" + (t.active ? " live" : t.stale ? " stale" : "");
  const seq = ((DATA && DATA.sequence) || [])
    .find((r) => r.project === t.projectKey && r.id === t.id);
  $("#m-seq").innerHTML = seq
    ? '<span class="rm-rank">' + seq.rank + "</span>" +
      "<b>" + esc(BUCKETS.find((b) => b.key === seq.bucket).name) + "</b> in the running order — " +
      esc(seq.why)
    : "";
  $("#m-act").innerHTML = t.done ? "" : a
    ? '<span class="adot"></span>' + a.commits + (a.commits === 1 ? " commit · " : " commits · ") +
      ago(a.daysAgo) + " · " + esc(clip(a.subject, 60)) +
      (t.promoted ? ' <span class="why">moved here by commits; Status says "' +
        esc(clip(t.declaredState ? stateName(t.declaredState) : "", 20)) + '"</span>' : "")
    : (t.stale ? '<span class="why stale">no commits on record</span>' : "");
  $("#m-title").textContent = t.title;
  $("#m-file").textContent = t.projPath + (t.done ? "/done/" : "/") + t.file;
  const body = t.body.replace(/^\s*#\s+.*$/m, "");
  $("#m-body").innerHTML = md(body);
  $$("#m-body a.tlink").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = (a.dataset.md || "").split("/").pop();
      const found = allTasks().find((x) => x.projectKey === t.projectKey && x.file === target);
      if (found) openModal(found);
    });
  });
  $("#modal").hidden = false;
  $(".m-panel").scrollTop = 0;
  history.replaceState(null, "", "#" + encodeURIComponent(t.projectKey) + ":" + t.id);
}

function closeModal() {
  $("#modal").hidden = true;
  history.replaceState(null, "", location.pathname);
}

/* ---------- tiny markdown renderer ---------- */

function inline(s) {
  // s is already HTML-escaped
  let out = "";
  const parts = s.split(/(`[^`]*`)/);
  for (const part of parts) {
    if (part.length > 1 && part.startsWith("`") && part.endsWith("`")) {
      out += "<code>" + part.slice(1, -1) + "</code>";
      continue;
    }
    let x = part;
    x = x.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, href) {
      if (/\.md$/i.test(href) && !/^https?:/i.test(href)) {
        return '<a href="#" class="tlink" data-md="' + href + '">' + txt + "</a>";
      }
      return '<a href="' + href + '" target="_blank" rel="noopener">' + txt + "</a>";
    });
    x = x.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    x = x.replace(/(^|[\s(])\*([^*\s](?:[^*]*[^*\s])?)\*(?=$|[\s.,;:!?)])/g, "$1<em>$2</em>");
    out += x;
  }
  return out;
}

function splitRow(t) {
  let s = t.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function md(src) {
  const lines = String(src).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let para = [];

  const flush = () => {
    if (para.length) {
      out.push("<p>" + inline(esc(para.join(" "))) + "</p>");
      para = [];
    }
  };

  while (i < lines.length) {
    const t = lines[i].trim();

    if (t.startsWith("```")) {
      flush();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
      continue;
    }

    if (!t) { flush(); i++; continue; }

    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      flush();
      const lv = h[1].length;
      out.push("<h" + lv + ">" + inline(esc(h[2])) + "</h" + lv + ">");
      i++;
      continue;
    }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(t)) { flush(); out.push("<hr>"); i++; continue; }

    if (t.startsWith("|") && i + 1 < lines.length && /^\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1].trim())) {
      flush();
      const header = splitRow(t);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      let html = '<div class="tbl"><table><thead><tr>';
      for (const c of header) html += "<th>" + inline(esc(c)) + "</th>";
      html += "</tr></thead><tbody>";
      for (const r of rows) {
        html += "<tr>";
        for (const c of r) html += "<td>" + inline(esc(c)) + "</td>";
        html += "</tr>";
      }
      html += "</tbody></table></div>";
      out.push(html);
      continue;
    }

    if (t.startsWith(">")) {
      flush();
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push("<blockquote>" + md(buf.join("\n")) + "</blockquote>");
      continue;
    }

    const li = /^([-*+]|\d+[.)])\s+(.*)$/.exec(t);
    if (li) {
      flush();
      const ordered = /\d/.test(li[1][0]);
      const items = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        const lm = /^([-*+]|\d+[.)])\s+(.*)$/.exec(lt);
        if (lm) { items.push(lm[2]); i++; continue; }
        if (lt && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1] += " " + lt;
          i++;
          continue;
        }
        break;
      }
      const tag = ordered ? "ol" : "ul";
      out.push("<" + tag + ">" + items.map((x) => "<li>" + inline(esc(x)) + "</li>").join("") + "</" + tag + ">");
      continue;
    }

    para.push(t);
    i++;
  }
  flush();
  return out.join("\n");
}

/* ---------- boot ---------- */

function boot() {
  // ?view=board|list|releases|roadmap and ?group=state|label|project|release
  // make a view bookmarkable.
  const qs = new URLSearchParams(location.search);
  const want = qs.get("view");
  const vb = want && $('#view button[data-view="' + CSS.escape(want) + '"]');
  if (vb) {
    F.view = want;
    $$("#view button").forEach((x) => x.classList.toggle("on", x === vb));
  }
  const grp = qs.get("group");
  if (grp && $$("#group option").some((o) => o.value === grp)) {
    F.group = grp;
    $("#group").value = grp;
  }
  $("#q").addEventListener("input", (e) => { F.q = e.target.value.trim(); render(); });
  $("#group").addEventListener("change", (e) => { F.group = e.target.value; render(); });
  $("#showDone").addEventListener("change", (e) => { F.showDone = e.target.checked; render(); });
  syncControls();
  $("#refresh").addEventListener("click", load);
  $$("#view button").forEach((b) => {
    b.addEventListener("click", () => {
      F.view = b.dataset.view;
      $$("#view button").forEach((x) => x.classList.toggle("on", x === b));
      syncControls();
      render();
    });
  });
  $("#modal").addEventListener("click", (e) => {
    if (e.target === $("#modal") || e.target.closest(".m-close")) closeModal();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  load();
}

boot();
