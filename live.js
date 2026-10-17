/* ============================================================
   실시간 수업용(Beta) — 학생 상태 중계와 교사 모니터
   Supabase Realtime Broadcast + Presence 만 사용합니다 (표·RLS 변경 없음).
   공간 유형(mode)이 "live" 일 때만 동작하며, 다른 유형에는 전혀 관여하지 않습니다.

   과제 HTML 과의 규약 (iframe ↔ 부모 창, postMessage):
     과제 → 부모 : { type: "sim:state", state: <JSON>, mode: <문자열> }   (조작할 때마다, 초당 ≤4회 권장)
     부모 → 과제 : { type: "sim:apply", state: <JSON> }                   (교사가 보낸 상태를 적용)
   과제 쪽에는 window.getState() / window.setState(state) 를 두고 위 메시지로 감싸면 됩니다.
   ============================================================ */

/* 과제 HTML 을 만들 때 AI(클로드 등)에게 붙여 넣는 안내문. 이 규약이 있어야 실시간 모니터에 화면이 재현됩니다. */
var LIVE_PROMPT = [
  "이 HTML 과제 앱에 '실시간 수업' 규약을 넣어 주세요. 앱은 부모 창(iframe 바깥)에 자기 상태를 보내고, 부모가 보내는 상태를 받아 복원할 수 있어야 합니다. 조건은 다음과 같습니다.",
  "",
  "1. window.getState() : 지금 화면을 다시 그리는 데 필요한 모든 값(점·선·원의 좌표, 선택한 문제 번호, 입력값, 체크 상태 등)을 하나의 JSON 객체로 돌려줍니다. 작게 유지하세요(화면 이미지가 아니라 숫자와 짧은 문자열만).",
  "2. window.setState(state) : getState() 가 돌려준 객체를 받아 화면을 그 상태로 완전히 복원합니다. 다른 문제 번호면 그 문제를 먼저 불러옵니다.",
  "3. 사용자가 조작할 때마다(드래그 중 포함) 아래 notify() 를 부릅니다. 초당 4회를 넘지 않게 묶습니다.",
  "4. window.curMode 에 지금 진행 상태를 짧은 한국어 문장으로 둡니다(예: '문제2 탐구중', '문제2 성공 (3/8)'). 교사 화면에서 집계에 쓰입니다.",
  "",
  "아래 코드를 그대로 넣으세요:",
  "",
  "let lastSent = 0, notifyTimer = null;",
  "function notify() {",
  "  const now = Date.now();",
  "  if (now - lastSent < 250) { if (!notifyTimer) notifyTimer = setTimeout(() => { notifyTimer = null; notify(); }, 260); return; }",
  "  lastSent = now;",
  "  try { if (window.parent !== window) window.parent.postMessage({ type: 'sim:state', state: window.getState(), mode: window.curMode || '' }, '*'); } catch (e) {}",
  "}",
  "window.addEventListener('message', (e) => {",
  "  const d = e.data;",
  "  if (d && d.type === 'sim:apply' && d.state) { try { window.setState(d.state); } catch (err) {} }",
  "});",
  "",
  "주의: 외부 라이브러리 없이 한 파일(HTML+CSS+JS)로 만들고, 배경은 흰색, 마우스와 터치 모두 지원하세요. 상태를 받았을 때(setState) 다시 notify() 를 부르지 않아도 됩니다."
].join("\n");

var LIVE = { ch: null, code: null, role: null, sid: null, name: null, appId: null, appTitle: null, lastSent: 0, timer: null,
  students: {}, html: {}, wins: {}, msgFn: null, hideName: false, cols: 4, appFilter: "" };

/* TV 모드 켜기/끄기 — 켜면 화면 오른쪽 위에 '되돌아오기' 버튼이 고정되고, Esc 로도 끕니다 */
function liveTV(on) {
  document.body.classList.toggle("tvmode", !!on);
  var btn = document.getElementById("tvexit");
  if (on) {
    if (!btn) {
      btn = document.createElement("button"); btn.id = "tvexit"; btn.className = "tvexit"; btn.textContent = "✕ TV 모드 끝내기";
      btn.addEventListener("click", function () { liveTV(false); });
      document.body.appendChild(btn);
    }
    if (!LIVE.escFn) { LIVE.escFn = function (e) { if (e.key === "Escape") liveTV(false); }; document.addEventListener("keydown", LIVE.escFn); }
  } else {
    if (btn) btn.remove();
    if (LIVE.escFn) { document.removeEventListener("keydown", LIVE.escFn); LIVE.escFn = null; }
    var t = document.getElementById("liveTV"); if (t) t.textContent = "TV 모드";
  }
}
function liveRenderAppOptions() {
  var sel = $("#liveApp"); if (!sel) return;
  var apps = {}; Object.keys(LIVE.students).forEach(function (k) { var s = LIVE.students[k]; if (s.app) apps[s.app] = s.title || ("과제 " + s.app); });
  var cur = sel.value, html = '<option value="">모든 과제</option>';
  Object.keys(apps).forEach(function (id) { html += '<option value="' + esc(id) + '">' + esc(apps[id]) + '</option>'; });
  if (sel.innerHTML !== html) { sel.innerHTML = html; sel.value = (apps[cur] ? cur : ""); LIVE.appFilter = sel.value; }
}
function liveApplyCols() { var g = $("#livegrid"); if (g) g.style.gridTemplateColumns = "repeat(" + (LIVE.cols || 4) + ", minmax(0, 1fr))"; setTimeout(liveScaleThumbs, 50); }
/* 카드 안 iframe(1000×750 고정)을 카드 너비에 맞춰 축소 */
function liveScaleThumbs() {
  var grid = $("#livegrid"); if (!grid) return;
  grid.querySelectorAll(".lframe iframe").forEach(function (fr) {
    var w = fr.parentElement.clientWidth || 200; fr.style.transform = "scale(" + (w / 1000) + ")";
  });
}
if (!window.__liveResizeWired) { window.__liveResizeWired = true; window.addEventListener("resize", function () { liveScaleThumbs(); }); }
function liveRoom(code) { return "room-" + code; }
function liveIsOn() { return ST.space && ST.space.mode === "live"; }

/* ── 공통: 채널 열기/닫기 ───────────────────────────────── */
function liveOpen(code, presenceKey) {
  liveClose();
  LIVE.code = code;
  LIVE.ch = sb.channel(liveRoom(code), { config: { broadcast: { self: false }, presence: { key: presenceKey } } });
  return LIVE.ch;
}
function liveClose() {
  if (document.body.classList.contains("tvmode")) liveTV(false);
  if (LIVE.ch) { try { sb.removeChannel(LIVE.ch); } catch (e) { } }
  LIVE.ch = null; LIVE.code = null; LIVE.students = {}; liveCloseWindows(); 
  if (LIVE.msgFn) { window.removeEventListener("message", LIVE.msgFn); LIVE.msgFn = null; }
  if (LIVE.timer) { clearTimeout(LIVE.timer); LIVE.timer = null; }
}

/* ── 학생: 과제를 연 뒤 호출 ────────────────────────────── */
function liveStudentStart(appRow) {
  if (!liveIsOn()) return;
  LIVE.role = "student";
  LIVE.sid = ST.studentId || ("anon-" + (sessionStorage.getItem("mt-anon") || (function () {
    var v = Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem("mt-anon", v); } catch (e) { } return v; })()));
  LIVE.name = ST.student || "익명"; LIVE.appId = appRow.id; LIVE.appTitle = appRow.title;
  var ch = liveOpen(ST.space.code, LIVE.sid);
  var frame = function () { return app.querySelector("#holder iframe"); };

  var pendingState = null;
  var flush = function () {
    LIVE.timer = null;
    if (!pendingState || !LIVE.ch) return;
    var payload = pendingState; pendingState = null; LIVE.lastSent = Date.now();
    LIVE.ch.send({ type: "broadcast", event: "state", payload: payload });
  };
  LIVE.msgFn = function (e) {
    var fr = frame(); if (!fr || e.source !== fr.contentWindow) return;
    var d = e.data; if (!d || d.type !== "sim:state") return;
    pendingState = { sid: LIVE.sid, name: LIVE.name, app: LIVE.appId, title: LIVE.appTitle, state: d.state, mode: d.mode || "", t: Date.now() };
    var wait = Math.max(0, 250 - (Date.now() - LIVE.lastSent));
    if (!LIVE.timer) LIVE.timer = setTimeout(flush, wait);
  };
  window.addEventListener("message", LIVE.msgFn);

  ch.on("broadcast", { event: "control" }, function (m) {
    var p = m.payload || {}; if (p.sid !== LIVE.sid && p.sid !== "*") return;
    var fr = frame(); if (!fr) return;
    if (p.action === "spotlight") liveBanner(p.on ? "내 화면이 TV에 공유되고 있습니다" : "");
    if (p.action === "ping") { try { fr.contentWindow.postMessage({ type: "sim:request" }, "*"); } catch (e) { } }
  });
  ch.subscribe(function (s) {
    if (s === "SUBSCRIBED") ch.track({ name: LIVE.name, app: LIVE.appId, title: LIVE.appTitle, joined: Date.now() });
  });
}
function liveBanner(text, btnText, onBtn) {
  var b = app.querySelector("#livebanner");
  if (!b) { var holder = $("#holder"); if (!holder) return; b = document.createElement("div"); b.id = "livebanner"; b.className = "banner livebanner"; holder.parentNode.insertBefore(b, holder); }
  b.innerHTML = ""; b.style.display = text ? "flex" : "none";
  if (!text) return;
  var span = document.createElement("span"); span.textContent = text; b.appendChild(span);
  if (btnText) { var bt = document.createElement("button"); bt.className = "btn-s"; bt.textContent = btnText; bt.addEventListener("click", onBtn); b.appendChild(bt); }
}

/* ── 교사: 실시간 탭 ────────────────────────────────────── */
function panelLive() {
  var sp = ST.space;
  $("#panel").innerHTML =
    '<div class="card"><div class="between livehead" style="margin-bottom:8px"><h2 style="margin:0">실시간 모니터 <span class="modetag" style="background:#B7410E">Beta</span></h2>' +
      '<span class="row" style="gap:8px;align-items:center"><span class="m" id="livecount">접속 0명</span>' +
      '<select id="liveApp" title="과제별로 보기"><option value="">모든 과제</option></select>' +
      '<label class="dl" style="font-size:12px;margin:0"><input type="checkbox" id="liveHideName"> 이름 숨기기</label>' +
      '<select id="liveCols" title="한 줄에 몇 개"><option value="3">3개씩</option><option value="4" selected>4개씩</option><option value="5">5개씩</option><option value="6">6개씩</option></select>' +
      '<button class="btn-s" id="liveTV">TV 모드</button></span></div>' +
    '<details class="liveproto"><summary>과제 HTML 에 넣을 실시간 규약 — AI 에게 붙여 넣는 안내문</summary>' +
      '<p class="hint">과제를 만들 때(클로드·GPT 등) 이 안내문을 함께 붙여 넣으면 실시간 모니터에서 화면이 재현됩니다. 이미 만든 과제는 HTML 과 이 안내문을 같이 주고 "규약을 추가해 줘"라고 하면 됩니다.</p>' +
      '<div class="row" style="margin-bottom:8px"><button class="btn-s" id="liveCopyPrompt">안내문 복사</button><button class="btn-s" id="liveDlPrompt">텍스트 파일로 받기</button></div>' +
      '<textarea id="livePromptBox" readonly style="width:100%;height:200px;font-family:var(--mono);font-size:12px"></textarea></details>' +
    '<p class="hint">학생이 과제를 열고 조작하면 그 상태가 아래 카드에 그대로 다시 그려집니다. 카드를 누르면 <b>새 창</b>에 그 학생의 작업 화면이 크게 열리고 계속 따라 바뀝니다(TV에 끌어다 놓기 좋습니다). ' +
      '과제 HTML 에 <code>sim:state</code> / <code>sim:apply</code> 규약이 들어 있어야 합니다.</p>' +
    '<div class="livesum" id="livesum"></div>' +
    '<div class="livegrid" id="livegrid"><div class="empty">학생이 과제를 열면 여기에 나타납니다.</div></div></div>';
  on("#liveTV", "click", function () { liveTV(!document.body.classList.contains("tvmode")); });
  $("#livePromptBox").value = LIVE_PROMPT;
  on("#liveCopyPrompt", "click", function (e) { copy(LIVE_PROMPT, e.target); });
  on("#liveDlPrompt", "click", function () {
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([LIVE_PROMPT], { type: "text/plain;charset=utf-8" })); a.download = "실시간수업_규약_안내문.txt"; a.click();
  });
  on("#liveHideName", "change", function () { LIVE.hideName = $("#liveHideName").checked; liveRenderGrid(); });
  on("#liveCols", "change", function () { LIVE.cols = +$("#liveCols").value; liveApplyCols(); });
  on("#liveApp", "change", function () { LIVE.appFilter = $("#liveApp").value; liveRenderGrid(); liveRenderSummary(); });
  $("#liveHideName").checked = !!LIVE.hideName; $("#liveCols").value = String(LIVE.cols || 4); liveApplyCols();

  LIVE.role = "teacher";
  var ch = liveOpen(sp.code, "teacher-" + (ST.user ? ST.user.id : "x"));
  ch.on("presence", { event: "sync" }, function () {
    var st = ch.presenceState(); var n = 0;
    Object.keys(st).forEach(function (k) {
      if (k.indexOf("teacher-") === 0) return;
      n++; var meta = st[k][0] || {};
      LIVE.students[k] = LIVE.students[k] || { sid: k };
      LIVE.students[k].name = meta.name || LIVE.students[k].name || "학생"; LIVE.students[k].app = meta.app; LIVE.students[k].title = meta.title; LIVE.students[k].online = true;
    });
    Object.keys(LIVE.students).forEach(function (k) { if (!st[k]) LIVE.students[k].online = false; });
    var c = $("#livecount"); if (c) c.textContent = "접속 " + n + "명";
    liveRenderGrid();
  });
  ch.on("broadcast", { event: "state" }, function (m) {
    var p = m.payload || {}; if (!p.sid) return;
    var s = LIVE.students[p.sid] = LIVE.students[p.sid] || { sid: p.sid, online: true };
    s.name = p.name || s.name; s.app = p.app; s.title = p.title; s.state = p.state; s.mode = p.mode; s.t = p.t || Date.now();
    liveEnsureHtml(s.app, function () { liveApplyCard(s); liveApplyWindow(s); liveRenderSummary(); });
  });
  ch.subscribe(function (s) { if (s === "SUBSCRIBED") ch.track({ teacher: true }); });

}

/* iframe 이 막 로드됐을 때는 과제 스크립트의 초기화가 아직 끝나지 않았을 수 있어, 상태를 몇 번에 나눠 보냅니다 */
function liveApplyRetry(fr, getState) {
  [0, 300, 900, 2000].forEach(function (ms) {
    setTimeout(function () { var st = getState(); if (!st || !fr || !fr.contentWindow) return; try { fr.contentWindow.postMessage({ type: "sim:apply", state: st }, "*"); } catch (e) { } }, ms);
  });
}
function liveEnsureHtml(appId, done) {
  if (!appId) return done();
  if (LIVE.html[appId]) return done();
  if (LIVE.html[appId] === null) return;   /* 받는 중 */
  LIVE.html[appId] = null;
  sb.from("apps").select("html").eq("id", appId).single().then(function (r) {
    LIVE.html[appId] = (r.data && r.data.html) || "";
    done();
  });
}

function liveRenderGrid() {
  var grid = $("#livegrid"); if (!grid) return;
  liveRenderAppOptions();
  var all = Object.keys(LIVE.students).map(function (k) { return LIVE.students[k]; });
  var list = all.filter(function (s) { return !LIVE.appFilter || String(s.app) === String(LIVE.appFilter); })
    .sort(function (a, b) { return (b.online - a.online) || String(a.name).localeCompare(String(b.name), "ko"); });
  /* 걸러진 카드는 숨김 */
  grid.querySelectorAll(".livecard").forEach(function (c) { var sid = c.dataset.sid; c.style.display = list.some(function (s) { return s.sid === sid; }) ? "" : "none"; });
  if (!list.length) { if (!grid.querySelector(".empty")) { var e0 = document.createElement("div"); e0.className = "empty"; e0.textContent = LIVE.appFilter ? "이 과제를 열어 둔 학생이 없습니다." : "학생이 과제를 열면 여기에 나타납니다."; grid.appendChild(e0); } return; }
  var e1 = grid.querySelector(".empty"); if (e1) e1.remove();
  list.forEach(function (s) {
    var card = grid.querySelector('[data-sid="' + CSS.escape(s.sid) + '"]');
    if (!card) {
      var e = grid.querySelector(".empty"); if (e) e.remove();
      card = document.createElement("div"); card.className = "livecard"; card.dataset.sid = s.sid;
      card.innerHTML = '<div class="lhead"><b class="lname"></b><span class="lmode m"></span></div><div class="lframe"></div>';
      card.addEventListener("click", function () { liveOpenWindow(s.sid); });
      grid.appendChild(card);
    }
    card.classList.toggle("off", !s.online);
    card.classList.toggle("spot", !!(LIVE.wins[s.sid] && !LIVE.wins[s.sid].closed));
    card.querySelector(".lname").textContent = LIVE.hideName ? ("학생 " + (list.indexOf(s) + 1)) : (s.name || "학생");
    card.querySelector(".lmode").textContent = (s.mode || (s.online ? "접속" : "나감")) + (LIVE.appFilter ? "" : (s.title ? " · " + s.title : ""));
  });
}

/* 카드 안의 작은 iframe 에 학생 상태 적용 (같은 과제 HTML 을 그대로 씀) */
function liveApplyCard(s) {
  var grid = $("#livegrid"); if (!grid) return;
  liveRenderGrid();
  var card = grid.querySelector('[data-sid="' + CSS.escape(s.sid) + '"]'); if (!card) return;
  var box = card.querySelector(".lframe"); var fr = box.querySelector("iframe");
  if (!fr || fr.dataset.app !== String(s.app)) {
    box.innerHTML = ""; fr = document.createElement("iframe"); fr.dataset.app = String(s.app);
    fr.setAttribute("sandbox", "allow-scripts"); fr.style.pointerEvents = "none";
    fr.srcdoc = LIVE.html[s.app] || "<p style='font:13px sans-serif;color:#888;padding:12px'>과제를 불러오지 못했습니다</p>";
    fr.addEventListener("load", function () { fr.dataset.ready = "1"; liveApplyRetry(fr, function () { return s.state; }); });
    box.appendChild(fr); liveScaleThumbs();
    return;
  }
  if (fr.dataset.ready && s.state) fr.contentWindow.postMessage({ type: "sim:apply", state: s.state }, "*");
}

function liveRenderSummary() {
  var box = $("#livesum"); if (!box) return;
  var cnt = {}; Object.keys(LIVE.students).forEach(function (k) { var s = LIVE.students[k]; if (!s.online) return; if (LIVE.appFilter && String(s.app) !== String(LIVE.appFilter)) return; var m = (s.mode || "접속").split("(")[0].trim(); cnt[m] = (cnt[m] || 0) + 1; });
  var keys = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
  box.innerHTML = keys.length ? keys.map(function (k) { return '<span class="chip"><b>' + cnt[k] + '</b> ' + esc(k) + '</span>'; }).join("") : "";
}

/* 학생 카드 클릭 → 새 창에 그 학생의 작업 화면 (계속 따라 바뀜, 보기 전용) */
function liveOpenWindow(sid) {
  var s = LIVE.students[sid]; if (!s) return;
  var w = LIVE.wins[sid];
  if (w && !w.closed) { w.focus(); return; }
  w = window.open("", "live-" + sid, "width=1000,height=760");
  if (!w) { alert("팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요."); return; }
  LIVE.wins[sid] = w;
  var title = (LIVE.hideName ? "학생" : (s.name || "학생")) + " — " + (s.title || "과제");
  w.document.open();
  w.document.write('<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
    '<style>html,body{margin:0;height:100%;background:#fff;font-family:sans-serif}' +
    '.bar{height:36px;display:flex;align-items:center;gap:10px;padding:0 12px;background:#1B4965;color:#fff;font-size:14px}' +
    '.bar b{font-weight:700}.bar span{opacity:.8;font-size:12px}iframe{border:0;width:100%;height:calc(100% - 36px);display:block;pointer-events:none}</style></head>' +
    '<body><div class="bar"><b>' + esc(title) + '</b><span>실시간 · 보기 전용</span></div><iframe sandbox="allow-scripts"></iframe></body></html>');
  w.document.close();
  var fr = w.document.querySelector("iframe");
  fr.dataset.app = String(s.app);
  fr.addEventListener("load", function () { fr.dataset.ready = "1"; liveApplyRetry(fr, function () { var cur = LIVE.students[sid]; return cur && cur.state; }); });
  fr.srcdoc = LIVE.html[s.app] || "";
  liveControl(sid, { action: "spotlight", on: true });
  var poll = setInterval(function () { if (w.closed) { clearInterval(poll); liveControl(sid, { action: "spotlight", on: false }); liveRenderGrid(); } }, 1000);
  liveRenderGrid();
}
function liveApplyWindow(s) {
  var w = LIVE.wins[s.sid]; if (!w || w.closed) return;
  var fr; try { fr = w.document.querySelector("iframe"); } catch (e) { return; }
  if (!fr) return;
  if (fr.dataset.app !== String(s.app)) { fr.dataset.app = String(s.app); fr.dataset.ready = ""; fr.srcdoc = LIVE.html[s.app] || ""; return; }
  if (fr.dataset.ready && s.state) fr.contentWindow.postMessage({ type: "sim:apply", state: s.state }, "*");
}
function liveCloseWindows() { Object.keys(LIVE.wins).forEach(function (k) { try { if (!LIVE.wins[k].closed) LIVE.wins[k].close(); } catch (e) { } }); LIVE.wins = {}; }
function liveControl(sid, payload) {
  if (!LIVE.ch) return;
  payload.sid = sid;
  LIVE.ch.send({ type: "broadcast", event: "control", payload: payload });
}
function copyFlash(btn, text) { var old = btn.textContent; btn.textContent = text; setTimeout(function () { btn.textContent = old; }, 1500); }
