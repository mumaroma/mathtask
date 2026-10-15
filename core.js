/* ============================================================
   공통 도우미 · 시작 · 첫 화면
   ============================================================ */

/* ══════════════════════════════════════════════════════════ */

var sb = null;
var app = document.getElementById("app");
var ST = { studentId: null, user: null, spaces: [], space: null, apps: [], student: "", tab: "apps" };

/* ── 도우미 ─────────────────────────────────────────────── */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function fmt(iso) {
  var d = new Date(iso), p = function (n) { return String(n).padStart(2, "0"); };
  return p(d.getMonth() + 1) + "/" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
function hm(iso) {
  var d = new Date(iso), p = function (n) { return String(n).padStart(2, "0"); };
  return p(d.getHours()) + ":" + p(d.getMinutes());
}
var WD = ["일", "월", "화", "수", "목", "금", "토"];
function dayLabel(iso) {
  var d = new Date(iso), t = new Date();
  var same = d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + WD[d.getDay()] + ")" + (same ? " · 오늘" : "");
}
function sortApps(rows) {
  return rows.slice().sort(function (a, b) {
    var pa = (a.position == null ? 1e9 : a.position), pb = (b.position == null ? 1e9 : b.position);
    if (pa !== pb) return pa - pb;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

/* 폴더 묶음(표시 순서 그대로)을 다시 펴서 0,1,2… 로 번호를 매기고 바뀐 것만 저장 */
function saveOrder(groups, done) {
  var flat = [], jobs = [];
  groups.forEach(function (g) { g.rows.forEach(function (a) { flat.push(a); }); });
  flat.forEach(function (a, i) {
    if (a.position !== i) {
      a.position = i;
      jobs.push(sb.from("apps").update({ position: i }).eq("id", a.id));
    }
  });
  if (!jobs.length) return done();
  Promise.all(jobs).then(function (rs) {
    var bad = rs.filter(function (r) { return r && r.error; })[0];
    if (bad) alert("순서를 저장하지 못했습니다: " + bad.error.message);
    done();
  });
}

function swap(arr, i, j) {
  if (j < 0 || j >= arr.length) return false;
  var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  return true;
}

function groupByFolder(rows) {
  var named = [], plain = [], map = {};
  rows.forEach(function (r) {
    var f = (r.folder || "").trim();
    if (!f) { plain.push(r); return; }
    if (!map[f]) { map[f] = { label: f, rows: [] }; named.push(map[f]); }
    map[f].rows.push(r);
  });
  if (plain.length) named.push({ label: "폴더 없음", plain: true, rows: plain });
  return named;
}
function groupByDay(rows) {
  var out = [], map = {};
  rows.forEach(function (r) {
    var d = new Date(r.created_at);
    var k = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    if (!map[k]) { map[k] = { label: dayLabel(r.created_at), rows: [] }; out.push(map[k]); }
    map[k].rows.push(r);
  });
  return out;
}
/* 비공개 버킷: 잠깐 열리는 주소를 만들어 씁니다 (2시간) */
var SIGN = {};
function signPaths(paths) {
  var need = paths.filter(function (p) { return p && !SIGN[p]; });
  if (!need.length) return Promise.resolve(SIGN);
  return sb.storage.from("submissions").createSignedUrls(need, 7200).then(function (r) {
    (r.data || []).forEach(function (x) { if (x && x.path && x.signedUrl) SIGN[x.path] = x.signedUrl; });
    return SIGN;
  }).catch(function () { return SIGN; });
}
function signed(p) { return SIGN[p] || ""; }

function render(html) { app.innerHTML = html; window.scrollTo(0, 0); }
function $(sel) { return app.querySelector(sel); }
function on(sel, ev, fn) { var e = $(sel); if (e) e.addEventListener(ev, fn); }
function setErr(msg) { var e = $("#err"); if (e) e.textContent = msg || ""; }

var SV = function (d) {
  return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
};
var ICON = {
  pencil: SV('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/>'),
  trash:  SV('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  play:   SV('<path d="M7 4v16l13-8z"/>'),
  folder: SV('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  code:   SV('<path d="M9 8l-5 4 5 4M15 8l5 4-5 4"/>'),
  copy:   SV('<path d="M9 9h10v10H9zM5 15V5h10"/>'),
  eye:    SV('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'),
  clock:  SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  check:  SV('<path d="M5 13l4 4L19 7"/>')
};

var ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function mkCode() {
  var s = "";
  for (var i = 0; i < 5; i++) s += ALPH[Math.floor(Math.random() * ALPH.length)];
  return s;
}
function extractCode(raw) {
  var s = String(raw || "").trim().toUpperCase();
  var m = s.match(/[?&#]C=([A-Z0-9]{5})/);
  if (m) return m[1];
  var t = s.replace(/[^A-Z0-9]/g, "");
  return t.length > 5 ? t.slice(-5) : t;
}
function shareLink(code) {
  return location.origin + location.pathname + "?c=" + code;
}
function copy(text, btn) {
  navigator.clipboard.writeText(text).then(function () {
    var old = btn.textContent;
    btn.textContent = "복사했습니다";
    setTimeout(function () { btn.textContent = old; }, 1600);
  }).catch(function () { });
}
function goHome() { history.replaceState(null, "", location.pathname); boot(); }

/* 캡처 이미지 줄이기 → JPEG Blob */
function compress(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var max = 1400, scale = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? resolve(b) : reject(new Error("이미지를 만들지 못했습니다")); }, "image/jpeg", 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("이미지를 읽을 수 없습니다")); };
    img.src = url;
  });
}

/* iframe 에 과제 HTML 넣기 (innerHTML 로 넣지 않습니다) */
function mountFrame(holderSel, html, title) {
  var holder = $(holderSel);
  if (!holder) return;
  holder.innerHTML = "";
  var f = document.createElement("iframe");
  f.className = "frame";
  f.title = title || "과제";
  f.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-popups");
  f.setAttribute("allowfullscreen", "");
  f.srcdoc = html;
  holder.appendChild(f);
}

/* 캡처 받기 (고르기 / 붙여넣기 / 끌어놓기) */
function wirePicker(onPick) {
  var drop = $("#drop"), input = $("#file"), btn = $("#pick");
  if (!drop) return;
  var take = function (f) { if (f && f.type.indexOf("image/") === 0) onPick(f); };
  drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("hot"); });
  drop.addEventListener("dragleave", function () { drop.classList.remove("hot"); });
  drop.addEventListener("drop", function (e) {
    e.preventDefault(); drop.classList.remove("hot"); take(e.dataTransfer.files[0]);
  });
  document.addEventListener("paste", function (e) {
    if (!document.body.contains(drop) || !drop.offsetParent) return;
    var items = e.clipboardData ? e.clipboardData.items : [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image/") === 0) { take(items[i].getAsFile()); break; }
    }
  });
  btn.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () { take(input.files[0]); input.value = ""; });
}

/* ── 시작 ───────────────────────────────────────────────── */
function boot() {
  if (SUPABASE_URL.indexOf("여기에") >= 0 || SUPABASE_ANON_KEY.indexOf("여기에") >= 0) {
    return render(
      '<div class="card"><h2>설정이 남았습니다</h2>' +
      '<p class="hint">index.html 위쪽 <code>SUPABASE_URL</code> 과 <code>SUPABASE_ANON_KEY</code> 를 ' +
      '본인 Supabase 프로젝트 값으로 바꾼 뒤 다시 올려 주세요. ' +
      'Supabase 대시보드 → Project Settings → API 에 있습니다.</p></div>');
  }
  if (!sb) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var code = (new URLSearchParams(location.search).get("c") || "").toUpperCase();
  if (code.length === 5) return studentEnter(code);

  sb.auth.getSession().then(function (r) {
    ST.user = r.data.session ? r.data.session.user : null;
    ST.user ? viewSpaces() : viewHome();
  });
}

/* ── 첫 화면 ────────────────────────────────────────────── */
function viewHome() {
  render(
    '<div class="kit">' +
      '<span class="tag">HTML 과제 배포소</span>' +
      '<h2>자신이 만든 과제를<br><em>배포하세요</em></h2>' +
      '<p class="lead">내가 만든 HTML 한 장이 다섯 글자 코드를 타고 학생들 화면으로 바로 갑니다.</p>' +
      '<svg class="flow" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="내가 만든 HTML 과제가 다섯 글자 코드를 거쳐 학생들 화면으로 바로 전달되는 그림"><g transform="rotate(-3 72 70)"><rect x="24" y="30" width="96" height="78" rx="8" fill="#fff" stroke="#2C2C2A" stroke-width="3"/><path d="M96 30 L120 54 L96 54 Z" fill="#FAC775" stroke="#2C2C2A" stroke-width="3" stroke-linejoin="round"/><text x="68" y="78" text-anchor="middle" font-family="monospace" font-size="21" font-weight="700" fill="#2C2C2A">&lt;/&gt;</text><text x="68" y="97" text-anchor="middle" font-size="11" fill="#5F5E5A">내 HTML 과제</text></g><path d="M132 70 H178" stroke="#2C2C2A" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round"/><path d="M172 63 L182 70 L172 77 Z" fill="#2C2C2A"/><g transform="rotate(4 232 70)"><rect x="186" y="50" width="92" height="40" rx="10" fill="#FAC775" stroke="#2C2C2A" stroke-width="3"/><text x="232" y="76" text-anchor="middle" font-family="monospace" font-size="18" font-weight="700" letter-spacing="3" fill="#412402">GYF2Q</text><text x="232" y="106" text-anchor="middle" font-size="11" fill="#5F5E5A">코드 한 줄이면 끝</text></g><path d="M288 70 H334" stroke="#2C2C2A" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round"/><path d="M328 63 L338 70 L328 77 Z" fill="#2C2C2A"/><g transform="rotate(-2 372 66)"><rect x="350" y="34" width="44" height="66" rx="7" fill="#9FE1CB" stroke="#2C2C2A" stroke-width="3"/><rect x="358" y="46" width="28" height="30" rx="3" fill="#fff" stroke="#2C2C2A" stroke-width="2"/><circle cx="372" cy="89" r="3.5" fill="#2C2C2A"/></g><g transform="rotate(5 428 72)"><rect x="406" y="40" width="44" height="66" rx="7" fill="#F4C0D1" stroke="#2C2C2A" stroke-width="3"/><rect x="414" y="52" width="28" height="30" rx="3" fill="#fff" stroke="#2C2C2A" stroke-width="2"/><circle cx="428" cy="95" r="3.5" fill="#2C2C2A"/></g><g transform="rotate(-4 484 64)"><rect x="462" y="32" width="44" height="66" rx="7" fill="#B5D4F4" stroke="#2C2C2A" stroke-width="3"/><rect x="470" y="44" width="28" height="30" rx="3" fill="#fff" stroke="#2C2C2A" stroke-width="2"/><circle cx="484" cy="87" r="3.5" fill="#2C2C2A"/></g><text x="428" y="131" text-anchor="middle" font-size="11" fill="#5F5E5A">학생들 화면에 바로</text></svg>' +
      '<button class="btn-google" id="login">' +
        '<svg viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.5 5-4.4 7l6.7 5.2C42.2 36 45 30.6 45 24z"/>' +
        '<path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.9-12.5-9.2l-7.1 5.5C8 40.4 15.4 46 24 46z"/>' +
        '<path fill="#FBBC05" d="M11.5 28.3c-.5-1.4-.8-2.8-.8-4.3s.3-3 .8-4.3l-7.1-5.5C2.9 17.1 2 20.4 2 24s.9 6.9 2.4 9.8l7.1-5.5z"/>' +
        '<path fill="#EA4335" d="M24 10.7c3.2 0 5.4 1.4 6.7 2.6l5.9-5.8C33 4.1 29.9 2 24 2 15.4 2 8 7.6 4.4 14.2l7.1 5.5c1.8-5.3 6.7-9 12.5-9z"/></svg>' +
        '구글 계정으로 시작하기</button>' +
    '</div>' +
    '<div class="kitcard">' +
      '<h2>학생은 여기로</h2>' +
      '<p class="hint">선생님이 준 5자리 코드를 넣거나, 받은 링크를 그대로 붙여넣으세요.</p>' +
      '<input type="text" id="entry" placeholder="ABCDE 또는 https://…?c=ABCDE">' +
      '<div class="err" id="err"></div>' +
      '<button class="btn-g" id="join">과제 공간 들어가기</button>' +
    '</div>' +
    '<div class="kitgrid">' +
      '<div class="kitcard" style="box-shadow:5px 5px 0 #F7E2B8"><span class="who t">선생님은 이렇게</span>' +
        '<div class="kitsteps">' +
        '<div><span class="num">01</span> 구글 계정으로 로그인합니다</div>' +
        '<div><span class="num">02</span> 과제 공간을 만들면 다섯 글자 코드가 생깁니다</div>' +
        '<div><span class="num">03</span> 만든 HTML을 붙여넣거나 파일로 올립니다</div>' +
        '<div><span class="num">04</span> 코드나 링크를 학생에게 보냅니다</div>' +
        '<div><span class="num">05</span> 접속 기록과 제출 결과를 확인합니다</div>' +
        '</div></div>' +
      '<div class="kitcard" style="box-shadow:5px 5px 0 #CDE8DC"><span class="who s">학생은 이렇게</span>' +
        '<div class="kitsteps">' +
        '<div><span class="num">01</span> 받은 링크를 누르거나 코드를 입력합니다</div>' +
        '<div><span class="num">02</span> 이름을 적고 들어갑니다</div>' +
        '<div><span class="num">03</span> 과제를 골라 열고 활동합니다</div>' +
        '<div><span class="num">04</span> 다 하면 결과를 선생님께 보냅니다</div>' +
        '<div><span class="num">05</span> 가입도 로그인도 필요 없습니다</div>' +
        '</div></div>' +
    '</div>' +
    '<div class="tip">링크가 길어 보이면 <a href="https://숏.한국" target="_blank" rel="noopener">숏.한국</a>에서 ' +
      '짧게 줄여 보내세요. 칠판에 적거나 말로 불러 주기 좋습니다.</div>');

  on("#login", "click", function () {
    sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname }
    });
  });
  var join = function () {
    var c = extractCode($("#entry").value);
    if (c.length !== 5) return setErr("5자리 코드나 선생님이 준 링크를 넣어 주세요.");
    location.search = "?c=" + c;
  };
  on("#join", "click", join);
  on("#entry", "keydown", function (e) { if (e.key === "Enter") join(); });
}
