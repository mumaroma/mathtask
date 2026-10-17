/* ============================================================
   실시간 수업용(Beta) — 학생 상태 중계와 교사 모니터
   Supabase Realtime Broadcast + Presence 만 사용합니다 (표·RLS 변경 없음).
   공간 유형(mode)이 "live" 일 때만 동작하며, 다른 유형에는 전혀 관여하지 않습니다.

   과제 HTML 과의 규약 (iframe ↔ 부모 창, postMessage):
     과제 → 부모 : { type: "sim:state", state: <JSON>, mode: <문자열> }   (조작할 때마다, 초당 ≤4회 권장)
     부모 → 과제 : { type: "sim:apply", state: <JSON> }                   (교사가 보낸 상태를 적용)
   과제 쪽에는 window.getState() / window.setState(state) 를 두고 위 메시지로 감싸면 됩니다.
   ============================================================ */

var LIVE = { ch: null, code: null, role: null, sid: null, name: null, appId: null, appTitle: null, lastSent: 0, timer: null,
  students: {}, html: {}, spot: null, teacherDrive: false, msgFn: null };

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
  if (LIVE.ch) { try { sb.removeChannel(LIVE.ch); } catch (e) { } }
  LIVE.ch = null; LIVE.code = null; LIVE.students = {}; LIVE.spot = null; LIVE.teacherDrive = false;
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
    if (p.action === "apply" && p.state) { try { fr.contentWindow.postMessage({ type: "sim:apply", state: p.state }, "*"); } catch (e) { } }
    if (p.action === "lock") { fr.style.pointerEvents = p.on ? "none" : ""; liveBanner(p.on ? "선생님이 내 화면을 조작하고 있습니다" : ""); }
    if (p.action === "spotlight") liveBanner(p.on ? "내 화면이 TV에 공유되고 있습니다" : "");
    if (p.action === "ping") { try { fr.contentWindow.postMessage({ type: "sim:request" }, "*"); } catch (e) { } }
  });
  ch.subscribe(function (s) {
    if (s === "SUBSCRIBED") ch.track({ name: LIVE.name, app: LIVE.appId, title: LIVE.appTitle, joined: Date.now() });
  });
}
function liveBanner(text) {
  var b = app.querySelector("#livebanner");
  if (!b) { var holder = $("#holder"); if (!holder) return; b = document.createElement("div"); b.id = "livebanner"; b.className = "banner livebanner"; holder.parentNode.insertBefore(b, holder); }
  b.textContent = text; b.style.display = text ? "block" : "none";
}

/* ── 교사: 실시간 탭 ────────────────────────────────────── */
function panelLive() {
  var sp = ST.space;
  $("#panel").innerHTML =
    '<div class="card"><div class="between" style="margin-bottom:8px"><h2 style="margin:0">실시간 모니터 <span class="modetag" style="background:#B7410E">Beta</span></h2>' +
      '<span class="row" style="gap:8px"><span class="m" id="livecount">접속 0명</span>' +
      '<button class="btn-s" id="liveTV">TV 모드</button></span></div>' +
    '<p class="hint">학생이 과제를 열고 조작하면 그 상태가 아래 카드에 그대로 다시 그려집니다. 카드를 누르면 크게 보고, 크게 보기 화면에서 직접 조작해 그 학생에게 보낼 수 있습니다. ' +
      '과제 HTML 에 <code>sim:state</code> / <code>sim:apply</code> 규약이 들어 있어야 합니다.</p>' +
    '<div class="livesum" id="livesum"></div>' +
    '<div class="livespot" id="livespot" hidden></div>' +
    '<div class="livegrid" id="livegrid"><div class="empty">학생이 과제를 열면 여기에 나타납니다.</div></div></div>';
  on("#liveTV", "click", function () { document.body.classList.toggle("tvmode"); });

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
    liveEnsureHtml(s.app, function () { liveApplyCard(s); if (LIVE.spot === s.sid && !LIVE.teacherDrive) liveApplySpot(s); liveRenderSummary(); });
  });
  ch.subscribe(function (s) { if (s === "SUBSCRIBED") ch.track({ teacher: true }); });

  /* 크게 보기 화면(교사 조작)에서 오는 상태 → 해당 학생에게 */
  LIVE.msgFn = function (e) {
    var big = app.querySelector("#livespot iframe"); if (!big || e.source !== big.contentWindow) return;
    var d = e.data; if (!d || d.type !== "sim:state" || !LIVE.teacherDrive || !LIVE.spot) return;
    var now = Date.now(); if (now - LIVE.lastSent < 200) return; LIVE.lastSent = now;
    LIVE.ch.send({ type: "broadcast", event: "control", payload: { sid: LIVE.spot, action: "apply", state: d.state } });
  };
  window.addEventListener("message", LIVE.msgFn);
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
  var list = Object.keys(LIVE.students).map(function (k) { return LIVE.students[k]; })
    .sort(function (a, b) { return (b.online - a.online) || String(a.name).localeCompare(String(b.name), "ko"); });
  if (!list.length) { grid.innerHTML = '<div class="empty">학생이 과제를 열면 여기에 나타납니다.</div>'; return; }
  list.forEach(function (s) {
    var card = grid.querySelector('[data-sid="' + CSS.escape(s.sid) + '"]');
    if (!card) {
      var e = grid.querySelector(".empty"); if (e) e.remove();
      card = document.createElement("div"); card.className = "livecard"; card.dataset.sid = s.sid;
      card.innerHTML = '<div class="lhead"><b class="lname"></b><span class="lmode m"></span></div><div class="lframe"></div>';
      card.addEventListener("click", function () { liveSpot(s.sid); });
      grid.appendChild(card);
    }
    card.classList.toggle("off", !s.online);
    card.classList.toggle("spot", LIVE.spot === s.sid);
    card.querySelector(".lname").textContent = s.name || "학생";
    card.querySelector(".lmode").textContent = (s.mode || (s.online ? "접속" : "나감"));
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
    fr.addEventListener("load", function () { fr.dataset.ready = "1"; if (s.state) fr.contentWindow.postMessage({ type: "sim:apply", state: s.state }, "*"); });
    box.appendChild(fr);
    return;
  }
  if (fr.dataset.ready && s.state) fr.contentWindow.postMessage({ type: "sim:apply", state: s.state }, "*");
}

function liveRenderSummary() {
  var box = $("#livesum"); if (!box) return;
  var cnt = {}; Object.keys(LIVE.students).forEach(function (k) { var s = LIVE.students[k]; if (!s.online) return; var m = (s.mode || "접속").split("(")[0].trim(); cnt[m] = (cnt[m] || 0) + 1; });
  var keys = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
  box.innerHTML = keys.length ? keys.map(function (k) { return '<span class="chip"><b>' + cnt[k] + '</b> ' + esc(k) + '</span>'; }).join("") : "";
}

/* 크게 보기 */
function liveSpot(sid) {
  var s = LIVE.students[sid]; if (!s) return;
  if (LIVE.spot && LIVE.spot !== sid) liveControl(LIVE.spot, { action: "spotlight", on: false });
  if (LIVE.teacherDrive) liveDrive(false);
  LIVE.spot = sid;
  var box = $("#livespot"); box.hidden = false;
  box.innerHTML =
    '<div class="between" style="margin-bottom:6px"><b>' + esc(s.name || "학생") + ' <span class="m">' + esc(s.title || "") + '</span></b>' +
    '<span class="row" style="gap:6px">' +
      '<button class="btn-s" id="spDrive">교사 조작 켜기</button>' +
      '<button class="btn-s" id="spAll">이 화면을 전체에게</button>' +
      '<button class="btn-s" id="spClose">닫기</button></span></div>' +
    '<div class="spframe"></div>' +
    '<p class="hint" style="margin-top:6px">교사 조작을 켜면 이 화면에서 움직인 것이 그 학생 화면에 그대로 반영되고, 학생 입력은 잠깁니다.</p>';
  on("#spClose", "click", function () { liveDrive(false); liveControl(sid, { action: "spotlight", on: false }); LIVE.spot = null; box.hidden = true; box.innerHTML = ""; liveRenderGrid(); });
  on("#spDrive", "click", function () { liveDrive(!LIVE.teacherDrive); });
  on("#spAll", "click", function (e) {
    var big = box.querySelector("iframe"); if (!big) return;
    var st = LIVE.students[LIVE.spot] && LIVE.students[LIVE.spot].state; if (!st) return;
    liveControl("*", { action: "apply", state: st }); copyFlash(e.target, "전체에게 보냈습니다");
  });
  liveControl(sid, { action: "spotlight", on: true });
  liveEnsureHtml(s.app, function () { liveApplySpot(s, true); });
  liveRenderGrid();
}
function liveApplySpot(s, rebuild) {
  var box = app.querySelector("#livespot .spframe"); if (!box) return;
  var fr = box.querySelector("iframe");
  if (rebuild || !fr || fr.dataset.app !== String(s.app)) {
    box.innerHTML = ""; fr = document.createElement("iframe"); fr.dataset.app = String(s.app); fr.className = "frame";
    fr.setAttribute("sandbox", "allow-scripts allow-forms allow-modals");
    fr.srcdoc = LIVE.html[s.app] || "";
    fr.addEventListener("load", function () { fr.dataset.ready = "1"; if (s.state) fr.contentWindow.postMessage({ type: "sim:apply", state: s.state }, "*"); });
    box.appendChild(fr); return;
  }
  if (fr.dataset.ready && s.state) fr.contentWindow.postMessage({ type: "sim:apply", state: s.state }, "*");
}
function liveDrive(on) {
  LIVE.teacherDrive = on;
  var b = $("#spDrive"); if (b) { b.textContent = on ? "교사 조작 끄기" : "교사 조작 켜기"; b.classList.toggle("btn-p", on); }
  if (LIVE.spot) liveControl(LIVE.spot, { action: "lock", on: on });
}
function liveControl(sid, payload) {
  if (!LIVE.ch) return;
  payload.sid = sid;
  LIVE.ch.send({ type: "broadcast", event: "control", payload: payload });
}
function copyFlash(btn, text) { var old = btn.textContent; btn.textContent = text; setTimeout(function () { btn.textContent = old; }, 1500); }
