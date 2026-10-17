/* ============================================================
   교사 화면 — 공간 목록, 보관함, 대시보드, 각 탭
   ============================================================ */

/* ── 교사: 공간 목록 ────────────────────────────────────── */
function viewSpaces() {
  render('<div class="card"><div class="empty">공간을 불러오는 중…</div></div>');
  sb.from("spaces").select("*").order("created_at", { ascending: false }).then(function (r) {
    ST.spaces = r.data || [];
    var sfolders = [];
    ST.spaces.forEach(function (x) {
      var f = (x.folder || "").trim();
      if (f && sfolders.indexOf(f) < 0) sfolders.push(f);
    });
    var oneGroup = !sfolders.length;
    var drawSpace = function (s) {
          var mine = s.owner === ST.user.id;
          var op = s.mode === "open";
          return '<div class="item ' + (op ? "m-open" : "m-class") + '">' +
            '<span class="code-sm">' + esc(s.code) + '</span>' +
            '<div class="grow"><div class="t">' +
              '<button class="titlebtn open" data-code="' + esc(s.code) + '">' + esc(s.title) + '</button>' +
              '<span class="modetag ' + modeClass(s.mode) + '">' + modeLabel(s.mode) + '</span>' +
              '<button class="iconbtn srn" data-code="' + esc(s.code) + '" data-t="' + esc(s.title) + '" ' +
                'title="이름 수정" aria-label="이름 수정">' + ICON.pencil + '</button>' +
              (mine ? '<button class="iconbtn danger del" data-code="' + esc(s.code) + '" ' +
                'title="삭제" aria-label="삭제">' + ICON.trash + '</button>' : '') +
            '</div>' +
            '<div class="m">' + fmt(s.created_at) + ' 개설' + (mine ? '' : ' · 초대받음') + '</div></div>' +
            '<span class="menuwrap">' +
              '<button class="btn-s dots" data-m="s' + esc(s.code) + '" aria-label="더 보기">⋯</button>' +
              '<div class="menu" id="ms' + esc(s.code) + '" hidden>' +
                '<button class="mi open" data-code="' + esc(s.code) + '">' + ICON.play + '열기</button>' +
                '<button class="mi link" data-code="' + esc(s.code) + '">' + ICON.copy + '링크 복사</button>' +
                '<button class="mi smode" data-code="' + esc(s.code) + '" data-v="' + esc(s.mode || "class") + '" data-n="open">' + ICON.pencil + '공개용으로 바꾸기</button>' +
                '<button class="mi smode" data-code="' + esc(s.code) + '" data-v="' + esc(s.mode || "class") + '" data-n="class">' + ICON.pencil + '수업용으로 바꾸기</button>' +
                '<button class="mi smode" data-code="' + esc(s.code) + '" data-v="' + esc(s.mode || "class") + '" data-n="live">' + ICON.pencil + '실시간 수업용(Beta)으로 바꾸기</button>' +
              '<button class="mi sfold" data-code="' + esc(s.code) + '" data-f="' + esc(s.folder || "") + '">' + ICON.folder + '폴더 옮기기</button>' +
              '<button class="mi sdup" data-code="' + esc(s.code) + '" data-t="' + esc(s.title) + '">' + ICON.copy + '복제</button>' +
              '</div></span></div>';
    };
    var rows = ST.spaces.length
      ? (oneGroup
          ? ST.spaces.map(drawSpace).join("")
          : groupByFolder(ST.spaces).map(function (g) {
              return '<div class="fold"><span class="dl">' + esc(g.label) + '</span><b>' +
                g.rows.length + '개</b></div>' + g.rows.map(drawSpace).join("");
            }).join(""))
      : '<div class="empty">아직 만든 공간이 없습니다.<br>아래에서 첫 공간을 만들어 보세요.</div>';

    render(
      '<div class="between">' +
        '<button class="btn-s" id="out">← 로그아웃</button>' +
        '<span class="row" style="gap:8px;align-items:center">' +
        '<button class="btn-s" id="lib">과제 보관함</button>' + helpBtn("spaces") +
        '<span class="m">' + esc(ST.user.email) + '</span></span></div>' +
      '<div class="card"><h2>내 과제 공간 <span class="num">' + ST.spaces.length + '</span></h2>' +
        '<p class="hint">공간마다 코드가 따로 있습니다. 학급이나 단원별로 나눠 쓰세요.</p>' + rows + '</div>' +
      '<div class="card"><h2>새 공간 만들기</h2>' +
        '<p class="hint">이름만 정하면 5자리 코드가 바로 생깁니다.</p>' +
        '<label>공간 이름</label>' +
        '<input type="text" id="title" placeholder="예: 2학년 3반 일차함수">' +
        '<label>유형</label>' +
        '<select id="smode">' +
          '<option value="class">수업용 — 학생이 이름을 적고 들어오며 결과를 보냅니다</option>' +
          '<option value="open">공개용 — 바로 실행만 하고 기록은 남기지 않습니다</option>' +
          '<option value="live">실시간 수업용(Beta) — 수업용과 같되, 학생 화면 상태를 교사가 실시간으로 보고 조작합니다</option>' +
        '</select>' +
        '<div class="err" id="err"></div>' +
        '<button class="btn-p" id="make">공간 만들기</button></div>' +
      '<div id="modal"></div>');

    on("#lib", "click", viewLibrary);
    wireHelp();
    on("#out", "click", function () { sb.auth.signOut().then(function () { ST.user = null; viewHome(); }); });
    on("#make", "click", createSpace);
    app.querySelectorAll(".open").forEach(function (b) {
      b.addEventListener("click", function () { openSpace(b.dataset.code); });
    });
    app.querySelectorAll(".link").forEach(function (b) {
      b.addEventListener("click", function () { copy(shareLink(b.dataset.code), b); });
    });
    app.querySelectorAll(".srn").forEach(function (b) {
      b.addEventListener("click", function () {
        var next = window.prompt("공간 이름을 바꿉니다.", b.dataset.t);
        if (next === null) return;
        next = next.trim();
        if (!next) return alert("이름은 비워 둘 수 없습니다.");
        sb.from("spaces").update({ title: next }).eq("code", b.dataset.code).then(function (r) {
          if (r.error) return alert("바꾸지 못했습니다: " + r.error.message);
          viewSpaces();
        });
      });
    });
    app.querySelectorAll(".smode").forEach(function (b) {
      b.addEventListener("click", function () {
        var next = b.dataset.n || (b.dataset.v === "open" ? "class" : "open");
        if (next === (b.dataset.v || "class")) return;
        var msg = next === "open"
          ? "공개용으로 바꾸면 학생이 이름 없이 바로 들어와 실행만 합니다. 결과 보내기와 접속 기록이 멈춥니다. 이미 쌓인 기록은 그대로 남습니다."
          : next === "live"
            ? "실시간 수업용(Beta)으로 바꾸면 수업용과 똑같이 기록·제출이 되고, 추가로 학생이 과제를 조작하는 상태가 교사 화면의 '실시간' 탭에 실시간으로 보입니다. 시험 중인 기능입니다."
            : "수업용으로 바꾸면 학생이 이름과 비밀번호를 적고 들어오며 결과를 보낼 수 있습니다.";
        if (!window.confirm(msg)) return;
        sb.from("spaces").update({ mode: next }).eq("code", b.dataset.code).then(function (r) {
          if (r.error) return alert("바꾸지 못했습니다: " + r.error.message);
          viewSpaces();
        });
      });
    });
    app.querySelectorAll(".sfold").forEach(function (b) {
      b.addEventListener("click", function () {
        $("#modal").innerHTML =
          '<div class="modal"><div class="mbox"><div class="pickbox">' +
          '<h2>공간을 폴더로 묶기</h2>' +
          '<label>어느 폴더에 둘까요</label>' + folderSelect("spf", b.dataset.f || "", sfolders) +
          '<input type="text" id="spfnew" placeholder="새 폴더 이름" style="display:none">' +
          '<div class="row"><button class="btn-p" id="spok">옮기기</button>' +
          '<button class="btn-s" id="spcancel">취소</button></div></div></div></div>';
        wireFolderSelect("spf", "spfnew");
        on("#spcancel", "click", function () { $("#modal").innerHTML = ""; });
        on("#spok", "click", function () {
          var next = readFolder("spf", "spfnew");
          if (next === null) return alert("새 폴더 이름을 입력하세요.");
          sb.from("spaces").update({ folder: next || null }).eq("code", b.dataset.code).then(function (r) {
            if (r.error) return alert("옮기지 못했습니다: " + r.error.message);
            viewSpaces();
          });
        });
      });
    });
    app.querySelectorAll(".sdup").forEach(function (b) {
      b.addEventListener("click", function () { duplicateSpace(b.dataset.code, b.dataset.t, b); });
    });
    app.querySelectorAll(".del").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.armed !== "1") {
          b.dataset.armed = "1"; b.classList.add("armed");
          b.title = "한 번 더 누르면 공간이 지워집니다";
          setTimeout(function () {
            if (b.dataset.armed === "1") { b.dataset.armed = ""; b.classList.remove("armed"); b.title = "삭제"; }
          }, 4000);
          return;
        }
        sb.from("spaces").delete().eq("code", b.dataset.code).then(viewSpaces);
      });
    });
    wireMenus();
  });
}

function duplicateSpace(code, title, btn) {
  var next = window.prompt("새 공간의 이름을 적으세요. 과제는 그대로 복사되고 학생 기록은 복사되지 않습니다.",
    title + " (복사본)");
  if (next === null) return;
  next = next.trim();
  if (!next) return alert("이름은 비워 둘 수 없습니다.");
  btn.disabled = true; btn.textContent = "복제 중…";

  var done = function (msg) {
    btn.disabled = false; btn.textContent = "복제";
    if (msg) alert(msg); else viewSpaces();
  };

  var attempt = function (n) {
    var newCode = mkCode();
    var src = (ST.spaces || []).filter(function (x) { return x.code === code; })[0] || {};
    sb.from("spaces").insert({
      code: newCode, owner: ST.user.id, title: next, mode: src.mode || "class",
      folder: src.folder || null,
      teacher_name: ST.user.user_metadata && ST.user.user_metadata.full_name || ""
    }).then(function (r) {
      if (r.error) {
        if (r.error.code === "23505" && n < 5) return attempt(n + 1);
        return done("새 공간을 만들지 못했습니다: " + r.error.message);
      }
      sb.from("apps").select("title,html,folder,position").eq("space_code", code)
        .order("position", { ascending: true, nullsFirst: false }).then(function (rr) {
          var list = (rr.data || []).map(function (a, i) {
            return { space_code: newCode, title: a.title, html: a.html, folder: a.folder || null, position: i };
          });
          if (!list.length) return done();
          sb.from("apps").insert(list).then(function (r3) {
            if (r3.error) return done("공간은 만들었지만 과제를 옮기지 못했습니다: " + r3.error.message);
            done();
          });
        });
    });
  };
  attempt(0);
}

function createSpace() {
  var title = $("#title").value.trim();
  if (!title) return setErr("공간 이름을 입력하세요.");
  var btn = $("#make");
  btn.disabled = true; setErr("");
  var name = ST.user.user_metadata && ST.user.user_metadata.full_name || "";

  var attempt = function (n) {
    var code = mkCode();
    sb.from("spaces").insert({ code: code, owner: ST.user.id, title: title, teacher_name: name,
      mode: ($("#smode") && $("#smode").value) || "class" })
      .then(function (r) {
        if (r.error) {
          if (r.error.code === "23505" && n < 5) return attempt(n + 1);
          btn.disabled = false;
          return setErr("공간을 만들지 못했습니다: " + r.error.message);
        }
        viewSpaces();
      });
  };
  attempt(0);
}

/* 보관함 카드에 작은 미리보기 채우기 (보이는 것부터 하나씩) */
function lazyThumbs() {
  var boxes = Array.prototype.slice.call(app.querySelectorAll(".libthumb[data-lazy]"));
  if (!boxes.length) return;
  var fill = function (box) {
    var id = box.dataset.lazy;
    if (!id) return;
    delete box.dataset.lazy;
    sb.from("apps").select("html").eq("id", id).single().then(function (r) {
      if (!r.data || !r.data.html) return;
      var f = document.createElement("iframe");
      f.setAttribute("sandbox", "allow-scripts");
      f.setAttribute("scrolling", "no");
      f.className = "tframe";
      f.srcdoc = r.data.html;
      box.innerHTML = "";
      box.appendChild(f);
    }).catch(function () { });
  };
  if (!window.IntersectionObserver) { boxes.slice(0, 12).forEach(fill); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { fill(e.target); io.unobserve(e.target); }
    });
  }, { rootMargin: "200px" });
  boxes.forEach(function (b) { io.observe(b); });
}

/* ── 과제 보관함: 내 공간의 모든 과제 한 자리에 ───────── */
function viewLibrary() {
  render('<div class="card"><div class="empty">과제를 모으는 중…</div></div>');
  var codes = (ST.spaces || []).map(function (x) { return x.code; });
  if (!codes.length) {
    render('<div class="between"><button class="btn-s" id="back">← 내 공간 목록</button></div>' +
      '<div class="card"><div class="empty">아직 공간이 없습니다.</div></div>');
    on("#back", "click", viewSpaces);
    return;
  }
  var names = {};
  ST.spaces.forEach(function (x) { names[x.code] = x.title; });

  sb.from("apps").select("id,title,space_code,lib_folder,created_at").in("space_code", codes)
    .order("created_at", { ascending: false }).then(function (r) {
      var all = r.data || [];
      var by = ST.libBy || (ST.libBy = "space");
      var lf = [];
      all.forEach(function (a) {
        var f = (a.lib_folder || "").trim();
        if (f && lf.indexOf(f) < 0) lf.push(f);
      });
      lf.sort(function (a, b) { return a.localeCompare(b, "ko"); });

      var groups = [];
      if (by === "folder") {
        var map = {}, plain = [];
        all.forEach(function (a) {
          var f = (a.lib_folder || "").trim();
          if (!f) return plain.push(a);
          if (!map[f]) { map[f] = { label: f, rows: [] }; groups.push(map[f]); }
          map[f].rows.push(a);
        });
        groups.sort(function (a, b) { return a.label.localeCompare(b.label, "ko"); });
        if (plain.length) groups.push({ label: "분류 없음", rows: plain });
      } else {
        var m2 = {};
        all.forEach(function (a) {
          if (!m2[a.space_code]) { m2[a.space_code] = { label: names[a.space_code] || a.space_code, rows: [] }; groups.push(m2[a.space_code]); }
          m2[a.space_code].rows.push(a);
        });
      }

      render(
        '<div class="between"><button class="btn-s" id="back">← 내 공간 목록</button>' +
          '<span class="row" style="gap:8px;align-items:center">' + helpBtn("lib") +
          '<span class="m">' + esc(ST.user.email) + '</span></span></div>' +
        '<div class="card"><h2>과제 보관함 <span class="num">' + all.length + '</span></h2>' +
        '<p class="hint">내가 관리하는 모든 공간의 과제입니다. 여기서 바로 다른 공간에 넣을 수 있습니다.</p>' +
        '<div class="filters">' +
          '<button class="btn-s' + (by === "space" ? " on" : "") + '" id="bySpace">공간별로 보기</button>' +
          '<button class="btn-s' + (by === "folder" ? " on" : "") + '" id="byFolder">분류별로 보기</button>' +
        '</div>' +
        (all.length
          ? groups.map(function (g) {
              return '<div class="fold"><span class="dl">' + esc(g.label) + '</span><b>' + g.rows.length + '개</b></div>' +
                '<div class="libgrid">' + g.rows.map(function (a) {
                  return '<div class="libcard">' +
                    '<span class="menuwrap libmenu">' +
                      '<button class="btn-s dots" data-m="l' + a.id + '" aria-label="더 보기">⋯</button>' +
                      '<div class="menu" id="ml' + a.id + '" hidden>' +
                        '<button class="mi prev" data-id="' + a.id + '">' + ICON.play + '크게 보기</button>' +
                        '<button class="mi cpto" data-id="' + a.id + '" data-t="' + esc(a.title) + '">' + ICON.copy + '공간에 넣기</button>' +
                        '<button class="mi lfold" data-id="' + a.id + '" data-f="' + esc(a.lib_folder || "") + '">' + ICON.folder + '분류 바꾸기</button>' +
                        '<button class="mi code" data-id="' + a.id + '">' + ICON.code + 'HTML 코드 보기</button>' +
                      '</div></span>' +
                    '<div class="libthumb prev" data-id="' + a.id + '" data-lazy="' + a.id + '">' +
                      '<span class="tph">' + esc(a.title.slice(0, 1)) + '</span></div>' +
                    '<div class="libcap"><b class="prev" data-id="' + a.id + '">' + esc(a.title) + '</b>' +
                    '<i>' + (by === "folder"
                      ? esc(names[a.space_code] || a.space_code)
                      : (a.lib_folder ? esc(a.lib_folder) : "분류 없음")) + '</i>' +
                    '<i>' + fmt(a.created_at) + '</i></div></div>';
                }).join("") + '</div>';
            }).join("")
          : '<div class="empty">아직 올린 과제가 없습니다.</div>') +
        '</div><div id="modal"></div>');

      on("#back", "click", viewSpaces);
      wireHelp();
      on("#bySpace", "click", function () { ST.libBy = "space"; viewLibrary(); });
      on("#byFolder", "click", function () { ST.libBy = "folder"; viewLibrary(); });

      wireMenus();
      app.querySelectorAll(".prev").forEach(function (b) {
        b.addEventListener("click", function () { previewApp(b.dataset.id); });
      });
      app.querySelectorAll(".cpto").forEach(function (b) {
        b.addEventListener("click", function () { copyToSpace(b.dataset.id, b.dataset.t); });
      });
      app.querySelectorAll(".code").forEach(function (b) {
        b.addEventListener("click", function () { showCode(b.dataset.id); });
      });
      lazyThumbs();
      app.querySelectorAll(".lfold").forEach(function (b) {
        b.addEventListener("click", function () {
          $("#modal").innerHTML =
            '<div class="modal"><div class="mbox"><div class="pickbox">' +
            '<h2>보관함 분류</h2>' +
            '<p class="hint">보관함에서만 쓰는 분류입니다. 공간 안의 폴더와는 따로 움직입니다.</p>' +
            '<label>어느 분류에 둘까요</label>' + folderSelect("lfs", b.dataset.f || "", lf) +
            '<input type="text" id="lfsnew" placeholder="새 분류 이름" style="display:none">' +
            '<div class="row"><button class="btn-p" id="lfok">옮기기</button>' +
            '<button class="btn-s" id="lfcancel">취소</button></div></div></div></div>';
          wireFolderSelect("lfs", "lfsnew");
          on("#lfcancel", "click", function () { $("#modal").innerHTML = ""; });
          on("#lfok", "click", function () {
            var next = readFolder("lfs", "lfsnew");
            if (next === null) return alert("새 분류 이름을 입력하세요.");
            sb.from("apps").update({ lib_folder: next || null }).eq("id", b.dataset.id).then(function (rr) {
              if (rr.error) return alert("옮기지 못했습니다: " + rr.error.message);
              viewLibrary();
            });
          });
        });
      });
    });
}

/* QR 만들기 (처음 한 번만 도구를 받아 옵니다) */
function loadQR() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  return new Promise(function (res, rej) {
    var sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
    sc.onload = function () { res(window.qrcode); };
    sc.onerror = function () { rej(new Error("QR 도구를 불러오지 못했습니다.")); };
    document.head.appendChild(sc);
  });
}

function makeQR(text) {
  var q = window.qrcode(0, "M");
  q.addData(text);
  q.make();
  return q;
}

function drawQR(sel, text, cell) {
  var box = $(sel);
  if (!box) return;
  loadQR().then(function () {
    box.innerHTML = makeQR(text).createSvgTag({ cellSize: cell || 4, margin: 2, scalable: true });
    var svg = box.querySelector("svg");
    if (svg) { svg.removeAttribute("width"); svg.removeAttribute("height"); svg.style.width = "100%"; svg.style.height = "100%"; }
  }).catch(function () {
    box.innerHTML = '<span class="m" style="padding:8px;text-align:center">QR 을 만들지 못했습니다</span>';
  });
}

/* QR 크게 보기 · 이미지로 받기 */
function bigQR(sp) {
  var link = shareLink(sp.code);
  var box = $("#qrmodal");
  if (!box) { box = document.createElement("div"); box.id = "qrmodal"; app.appendChild(box); }
  box.innerHTML =
    '<div class="modal"><div class="mbox"><div class="pickbox" style="text-align:center">' +
    '<h2 style="text-align:center">' + esc(sp.title) + '</h2>' +
    '<div class="qrbig" id="qrbig"></div>' +
    '<p style="font-family:var(--mono);font-size:22px;letter-spacing:5px;color:#1B4965;margin:12px 0 4px">' + esc(sp.code) + '</p>' +
    '<p class="hint" style="text-align:center;overflow-wrap:anywhere">' + esc(link) + '</p>' +
    '<div class="row" style="justify-content:center">' +
    '<button class="btn-p" id="qrdl">이미지로 받기</button>' +
    '<button class="btn-s" id="qrprint">인쇄</button>' +
    '<button class="btn-s" id="qrclose">닫기</button></div></div></div></div>';
  drawQR("#qrbig", link, 8);
  on("#qrclose", "click", function () { box.innerHTML = ""; });
  on("#qrprint", "click", function () { window.print(); });
  on("#qrdl", "click", function () {
    loadQR().then(function () {
      var q = makeQR(link), n = q.getModuleCount(), m = 4, px = 12;
      var c = document.createElement("canvas");
      c.width = c.height = (n + m * 2) * px;
      var g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#1A1A1A";
      for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) {
        if (q.isDark(r, k)) g.fillRect((k + m) * px, (r + m) * px, px, px);
      }
      g.fillStyle = "#1A1A1A";
      g.font = "bold " + (px * 2.2) + "px monospace";
      g.textAlign = "center";
      g.fillText(sp.code, c.width / 2, c.height - px * 1.2);
      var a = document.createElement("a");
      a.href = c.toDataURL("image/png");
      a.download = (sp.title || "space").replace(/[\\/:*?"<>|]/g, "") + "_QR.png";
      a.click();
    });
  });
}

/* ── 교사: 공간 대시보드 ────────────────────────────────── */
function openSpace(code) {
  var sp = ST.spaces.filter(function (s) { return s.code === code; })[0];
  ST.space = sp; ST.tab = "apps"; ST.myRole = null;
  if (sp.owner === ST.user.id) { ST.myRole = "owner"; return viewDash(); }
  render('<div class="card"><div class="empty">여는 중…</div></div>');
  sb.from("space_members").select("role,expires_at").eq("space_code", code).then(function (r) {
    var m = (r.data || [])[0];
    ST.myRole = m && m.role === "viewer" ? "viewer" : "editor";
    viewDash();
  });
}

function viewDash() {
  var sp = ST.space;
  render(
    '<div class="between">' +
      '<button class="btn-s" id="back">← 내 공간 목록</button>' +
      '<span class="m">' + esc(ST.user.email) + '</span></div>' +
    '<div class="card ' + (sp.mode === "open" ? "m-open" : "m-class") + '">' +
      '<span class="modetag ' + modeClass(sp.mode) + '" style="margin-bottom:8px">' +
      (sp.mode === "open" ? "공개용 · 기록을 남기지 않습니다" : sp.mode === "live" ? "실시간 수업용(Beta) · 접속과 제출이 기록되고 학생 화면을 실시간으로 봅니다" : "수업용 · 접속과 제출이 기록됩니다") + '</span>' +

      '<div class="titlerow"><h2>' + esc(sp.title) + '</h2>' +
      (sp.owner === ST.user.id ? '<button class="btn-d" id="renSpace">이름 수정</button>' : '') + '</div>' +
      '<p class="hint">' + (sp.mode === "open"
        ? '공개용 공간입니다. 들어온 사람은 이름 없이 바로 과제를 실행하고, 기록은 남지 않습니다.'
        : '코드를 알려 주거나 링크를 보내세요. 링크로 들어온 학생은 코드를 입력하지 않아도 됩니다.') + '</p>' +
      '<div class="row"><span class="code-chip">' + esc(sp.code) + '</span>' +
      '<button class="btn-s" id="cpCode">코드 복사</button>' +
      '<button class="btn-s" id="cpLink">링크 복사</button>' +
      '<button class="btn-s" id="openLink">링크 열기</button></div>' +
      '<div class="qrrow"><div class="qrbox" id="qrbox" title="QR 크게 보기"></div>' +
        '<div class="qrtext"><b>휴대폰으로 바로 들어오기</b>' +
        '<span>학생이 카메라로 비추면 이 공간이 열립니다. 눌러서 크게 보거나 이미지로 받으세요.</span></div></div>' +
      '<div class="linkbox">' + esc(shareLink(sp.code)) + '</div>' +
      (sp.mode === "open" || sp.owner !== ST.user.id ? '' :
        '<label class="dl" style="margin-top:12px"><input type="checkbox" id="slock"' +
        (sp.submit_locked ? ' checked' : '') + '> 지금은 제출 받지 않기 (수업이 끝난 뒤 잠가 두세요)</label>') +
      '<p class="hint" style="margin:10px 0 0">링크가 길면 ' +
      '<a href="https://숏.한국" target="_blank" rel="noopener" style="color:var(--terra);font-weight:600">숏.한국</a>' +
      '에서 줄여 보내시면 칠판에 적기 좋습니다.</p></div>' +
    '<div class="tabs">' +
      '<button class="tab' + (ST.tab === "apps" ? " on" : "") + '" data-tab="apps">과제 앱</button>' +
      (sp.mode === "open" || isViewer() ? '' :
        '<button class="tab' + (ST.tab === "log" ? " on" : "") + '" data-tab="log">접속 기록</button>' +
        '<button class="tab' + (ST.tab === "sub" ? " on" : "") + '" data-tab="sub">제출 결과</button>' +
        '<button class="tab' + (ST.tab === "stu" ? " on" : "") + '" data-tab="stu">학생 명단</button>' +
        (sp.mode === "live" ? '<button class="tab' + (ST.tab === "live" ? " on" : "") + '" data-tab="live">실시간 <span class="modetag live" style="margin-left:4px">Beta</span></button>' : '')) +
      (sp.owner === ST.user.id
        ? '<button class="tab' + (ST.tab === "mem" ? " on" : "") + '" data-tab="mem">함께 관리</button>'
        : '') +
    helpBtn(ST.tab) +
    '</div><div id="panel"><div class="card"><div class="empty">불러오는 중…</div></div></div>');

  on("#back", "click", viewSpaces);
  wireHelp();
  on("#cpCode", "click", function (e) { copy(sp.code, e.target); });
  on("#cpLink", "click", function (e) { copy(shareLink(sp.code), e.target); });
  on("#openLink", "click", function () { window.open(shareLink(sp.code), "_blank"); });
  on("#slock", "change", function () {
    var v = $("#slock").checked;
    sb.from("spaces").update({ submit_locked: v }).eq("code", sp.code).then(function (r) {
      if (r.error) { $("#slock").checked = !v; return alert("바꾸지 못했습니다: " + r.error.message); }
      sp.submit_locked = v;
    });
  });
  drawQR("#qrbox", shareLink(sp.code), 3);
  on("#qrbox", "click", function () { bigQR(sp); });
  on("#renSpace", "click", function () {
    var next = window.prompt("과제 공간 이름을 바꿉니다.", sp.title);
    if (next === null) return;
    next = next.trim();
    if (!next) return alert("이름은 비워 둘 수 없습니다.");
    sb.from("spaces").update({ title: next }).eq("code", sp.code).then(function (r) {
      if (r.error) return alert("바꾸지 못했습니다: " + r.error.message);
      sp.title = next;
      ST.spaces.forEach(function (x) { if (x.code === sp.code) x.title = next; });
      viewDash();
    });
  });
  app.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { ST.tab = b.dataset.tab; viewDash(); });
  });

  if ((sp.mode === "open" || isViewer()) && ST.tab !== "apps" && ST.tab !== "mem") ST.tab = "apps";
  if (typeof liveClose === "function" && ST.tab !== "live") liveClose();
  if (ST.tab === "apps") panelApps();
  else if (ST.tab === "live" && sp.mode === "live") panelLive();
  else if (ST.tab === "log") panelLog();
  else if (ST.tab === "mem") panelMembers();
  else if (ST.tab === "stu") panelStudents();
  else panelSubs();
}

/* 폴더 선택 상자 만들기 */
function folderSelect(id, current, folders) {
  var opts = '<option value=""' + (current ? "" : " selected") + '>폴더 없음</option>';
  folders.forEach(function (f) {
    opts += '<option value="' + esc(f) + '"' + (f === current ? " selected" : "") + '>' + esc(f) + '</option>';
  });
  opts += '<option value="__new">+ 새 폴더 만들기…</option>';
  return '<select id="' + id + '">' + opts + '</select>';
}

/* 선택 상자 + 새 폴더 칸에서 최종 폴더 이름 읽기 (미입력이면 null) */
function readFolder(selId, inputId) {
  var v = $("#" + selId).value;
  if (v !== "__new") return v;
  var t = $("#" + inputId).value.trim();
  return t || null;
}

/* '새 폴더 만들기'를 고르면 입력칸이 나타나도록 */
function wireFolderSelect(selId, inputId) {
  var sel = $("#" + selId), box = $("#" + inputId);
  if (!sel || !box) return;
  sel.addEventListener("change", function () {
    box.style.display = sel.value === "__new" ? "block" : "none";
    if (sel.value === "__new") box.focus();
  });
}

/* 화면마다 다른 도움말 */
var HELP = {
  spaces: ["내 과제 공간", [
    "공간은 학급이나 단원별로 여러 개 만들 수 있고, 폴더로 묶어 정리합니다.",
    "수업용 공간은 학생이 이름으로 들어와 결과를 보내고 기록이 남습니다. 공개용 공간은 이름 없이 바로 실행만 하고 기록이 남지 않습니다. 실시간 수업용(Beta)은 수업용에 학생 화면 실시간 모니터가 더해진 시험 기능입니다.",
    "공간 이름을 누르면 안으로 들어가고, 연필로 이름을 고치고 휴지통으로 지웁니다. ⋯ 안에는 열기·링크 복사·폴더 옮기기·복제가 있습니다.",
    "복제는 과제를 그대로 옮겨 담은 새 공간을 만듭니다. 학생 기록은 따라가지 않습니다.",
    "오른쪽 위 과제 보관함에서는 내 모든 공간의 과제를 한눈에 보고 원하는 공간에 바로 넣을 수 있습니다."
  ]],
  apps: ["과제 앱", [
    "만드신 HTML을 붙여넣거나 파일로 올리면 과제가 됩니다. 안내문을 한 줄 달아 두면 학생 화면에 함께 보입니다.",
    "제목을 누르면 미리보기, 옆의 연필은 제목 수정, 휴지통은 삭제입니다. 삭제는 두 번 눌러야 지워집니다.",
    "⋯ 안에 숨기기·이전 버전·폴더 옮기기·코드 보기·다른 공간으로 복사가 있습니다.",
    "숨긴 과제는 학생 목록에서 사라집니다. 준비 중인 과제를 감춰 뒀다가 수업 시작할 때 여세요.",
    "과제를 고치면 바뀌기 전 모습이 7일 동안 보관되어 ⋯의 이전 버전에서 되돌릴 수 있습니다.",
    "▲▼로 순서를 바꿉니다. 공간을 만든 사람만 순서를 조정할 수 있습니다."
  ]],
  log: ["접속 기록", [
    "학생이 이름을 넣고 들어온 시각이 날짜별로 쌓입니다.",
    "왼쪽 네모로 고른 뒤 선택 삭제하거나, 그날 것을 한 번에 지울 수 있습니다. 삭제는 두 번 눌러야 실행됩니다.",
    "기록을 지우는 것은 공간을 만든 사람만 할 수 있습니다."
  ]],
  sub: ["제출 결과", [
    "학생이 보낸 캡처·HTML·파일이 날짜별로 모입니다. 카드를 누르면 크게 보거나 실행해 볼 수 있습니다.",
    "위쪽 선택 상자로 과제별·학생별로 걸러 볼 수 있습니다.",
    "확인·피드백을 누르면 확인 표시가 남고 한마디를 적을 수 있습니다. 학생은 자기 제출 이력에서 그 피드백을 봅니다.",
    "날짜 머리글의 내려받기는 그날 제출물을 zip으로 묶어 줍니다. 안에 이름·과제·시각이 담긴 목록표가 함께 들어갑니다."
  ]],
  stu: ["학생 명단", [
    "맨 위 표는 학생별로 어떤 과제를 냈는지 보여 줍니다. 초록 체크는 제출, 점은 미제출입니다.",
    "양식 받기로 엑셀 파일을 내려받아 이름과 비밀번호를 채워 올리면 한 번에 등록됩니다. 예시 두 줄은 지우고 쓰세요.",
    "비밀번호는 네 자리 이상이어야 합니다. 학번이 짧으면 앞에 0을 붙여 맞춰 주세요.",
    "명단에 없는 이름은 들어오지 못하게 잠글 수 있습니다. 명단을 다 넣은 뒤 켜세요.",
    "비밀번호를 잊은 학생은 초기화를 눌러 주시면 그 이름으로 다시 등록합니다. 이미 낸 제출물은 그대로 남습니다."
  ]],
  live: ["실시간 모니터 (Beta)", [
    "학생이 과제를 열고 조작하면 그 상태가 카드마다 다시 그려집니다. 영상이 아니라 좌표·각도 같은 숫자만 오가므로 가볍습니다.",
    "카드를 누르면 새 창에 그 학생의 작업 화면이 크게 열리고 계속 따라 바뀝니다(보기 전용). 그 창을 TV 화면으로 옮겨 두면 됩니다.",
    "위의 과제 선택 상자로 특정 과제를 열어 둔 학생만 골라 볼 수 있고, 이름 숨기기와 한 줄 개수도 조절합니다.",
    "TV 모드는 윗부분을 숨기고 카드만 크게 보여 줍니다. TV 에 연결한 컴퓨터에서 켜 두세요.",
    "과제 HTML 에 sim:state / sim:apply 규약(getState·setState)이 들어 있어야 상태가 전달됩니다. 규약이 없는 과제는 접속 여부만 보입니다. 별도 프로그램이나 스킬 설치는 필요 없고, 과제를 만들 때 AI 에게 붙여 넣는 안내문이 실시간 탭 위쪽 '실시간 규약' 상자에 있습니다(복사·텍스트 파일 받기)."
  ]],
  mem: ["함께 관리", [
    "상대 선생님이 구글 로그인에 쓰는 이메일로 초대합니다. 메일이 자동으로 가지는 않으니 직접 알려 주세요.",
    "초대받은 선생님은 과제를 올리고 자기가 올린 과제를 고칠 수 있으며, 접속 기록과 제출 결과도 봅니다.",
    "남이 올린 과제 삭제, 공간 이름·유형 변경, 공간 삭제, 학생 기록 삭제는 만든 사람만 할 수 있습니다.",
    "만료일을 정해 두면 그날이 지나는 순간 그 선생님 목록에서 공간이 사라집니다. 한 공간에 20명까지 초대할 수 있습니다."
  ]],
  lib: ["과제 보관함", [
    "내가 관리하는 모든 공간의 과제가 미리보기 카드로 모입니다. 공간별 또는 분류별로 볼 수 있습니다.",
    "분류는 보관함에서만 쓰는 꼬리표입니다. 공간 안의 폴더와는 따로 움직입니다.",
    "카드의 ⋯에서 공간에 넣기를 고르면 원하는 공간으로 복사됩니다. 원본은 그대로 남습니다."
  ]]
};

function showHelp(key) {
  var h = HELP[key];
  if (!h) return;
  var box = $("#helpmodal");
  if (!box) { box = document.createElement("div"); box.id = "helpmodal"; app.appendChild(box); }
  box.innerHTML =
    '<div class="modal"><div class="mbox"><div class="pickbox">' +
    '<h2>' + esc(h[0]) + ' 도움말</h2>' +
    h[1].map(function (t) { return '<p class="helpline">' + esc(t) + '</p>'; }).join("") +
    '<div class="row" style="margin-top:14px"><button class="btn-p" id="hclose">닫기</button></div>' +
    '</div></div></div>';
  on("#hclose", "click", function () { box.innerHTML = ""; });
}

function helpBtn(key) {
  return '<button class="btn-s helpbtn" data-h="' + key + '" aria-label="도움말" title="도움말">?</button>';
}

function wireHelp() {
  app.querySelectorAll(".helpbtn").forEach(function (b) {
    b.addEventListener("click", function () { showHelp(b.dataset.h); });
  });
}

/* ⋯ 메뉴 열고 닫기 */
function wireMenus() {
  var closeAll = function () { app.querySelectorAll(".menu").forEach(function (m) { m.hidden = true; }); };
  app.querySelectorAll(".dots").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var box = $("#m" + b.dataset.m), was = box.hidden;
      closeAll();
      box.hidden = !was;
    });
  });
  app.querySelectorAll(".mi").forEach(function (b) { b.addEventListener("click", closeAll); });
  if (!window.__menuClose) {
    window.__menuClose = true;
    document.addEventListener("click", function () {
      app.querySelectorAll(".menu").forEach(function (m) { m.hidden = true; });
    });
  }
}

function isOwner() { return !!(ST.space && ST.user && ST.space.owner === ST.user.id); }
function isViewer() { return ST.myRole === "viewer"; }
function canEditApp(a) { return !isViewer() && (isOwner() || (a && a.created_by === ST.user.id)); }

var GROUPS = [];
function panelApps() {
  sb.from("apps").select("id,title,created_at,folder,position,note,created_by,hidden").eq("space_code", ST.space.code)
    .order("created_at").then(function (r) {
      ST.apps = sortApps(r.data || []);
      var n = 0;
      var rows = ST.apps.length
        ? (GROUPS = groupByFolder(ST.apps)).map(function (g, gi) {
            return '<div class="fold"><span class="dl">' +
              (isOwner()
                ? '<button class="mini fup" data-g="' + gi + '" title="폴더 위로">▲</button>' +
                  '<button class="mini fdn" data-g="' + gi + '" title="폴더 아래로">▼</button>'
                : '') +
              esc(g.label) + '</span><b>' + g.rows.length + '개</b></div>' +
              g.rows.map(function (a, ai) {
                n++;
                return '<div class="item' + (a.hidden ? " dimmed" : "") + '"><span class="num">' + String(n).padStart(2, "0") + '</span>' +
                  (isOwner()
                    ? '<span class="ord"><button class="mini aup" data-g="' + gi + '" data-a="' + ai + '" title="위로">▲</button>' +
                      '<button class="mini adn" data-g="' + gi + '" data-a="' + ai + '" title="아래로">▼</button></span>'
                    : '') +
                  '<div class="grow"><div class="t">' +
                    '<button class="titlebtn prev" data-id="' + a.id + '">' + esc(a.title) + '</button>' +
                    (canEditApp(a)
                      ? '<button class="iconbtn ren" data-id="' + a.id + '" data-t="' + esc(a.title) + '" ' +
                          'title="제목 수정" aria-label="제목 수정">' + ICON.pencil + '</button>' +
                        '<button class="iconbtn danger del" data-id="' + a.id + '" ' +
                          'title="삭제" aria-label="삭제">' + ICON.trash + '</button>'
                      : '<span class="lockmark" title="다른 선생님이 올린 과제입니다">읽기 전용</span>') +
                    (a.hidden ? '<span class="lockmark">숨김</span>' : '') + '</div>' +
                  (a.note ? '<div class="note">' + esc(a.note) + '</div>' : '') +
                  '<div class="m">' + fmt(a.created_at) + ' 등록</div></div>' +
                  '<span class="menuwrap">' +
                    '<button class="btn-s dots" data-m="' + a.id + '" aria-label="더 보기">⋯</button>' +
                    '<div class="menu" id="m' + a.id + '" hidden>' +
                      '<button class="mi prev" data-id="' + a.id + '">' + ICON.play + '미리보기</button>' +
                      (canEditApp(a)
                        ? '<button class="mi hide" data-id="' + a.id + '" data-h="' + (a.hidden ? "1" : "") + '">' +
                            ICON.eye + (a.hidden ? '학생에게 보이기' : '학생에게 숨기기') + '</button>' +
                          '<button class="mi vers" data-id="' + a.id + '" data-t="' + esc(a.title) + '">' +
                            ICON.clock + '이전 버전' + '</button>'
                        : '') +
                      (canEditApp(a)
                        ? '<button class="mi anote" data-id="' + a.id + '" data-n="' + esc(a.note || "") + '">' + ICON.pencil + '안내문 쓰기</button>' +
                          '<button class="mi move" data-id="' + a.id + '" data-f="' + esc(a.folder || "") + '">' + ICON.folder + '폴더 옮기기</button>'
                        : '') +
                      '<button class="mi code" data-id="' + a.id + '">' + ICON.code + 'HTML 코드 보기</button>' +
                      '<button class="mi cpto" data-id="' + a.id + '" data-t="' + esc(a.title) + '">' + ICON.copy + '다른 공간으로 복사</button>' +
                    '</div></span></div>';
              }).join("");
          }).join("")
        : '<div class="empty">아직 과제가 없습니다.<br>아래에서 첫 과제를 올려 보세요.</div>';

      var folders = [];
      ST.apps.forEach(function (a) {
        var f = (a.folder || "").trim();
        if (f && folders.indexOf(f) < 0) folders.push(f);
      });

      $("#panel").innerHTML =
        '<div class="card"><h2>등록된 과제 <span class="num">' + ST.apps.length + '</span></h2>' + rows + '</div>' +
        (isViewer() ? '' : '<div class="card"><h2>과제 추가</h2>' +
          '<p class="hint">HTML 파일 하나로 된 활동을 그대로 올립니다. 코드를 붙여넣거나 .html 파일을 고르세요.</p>' +
          '<label>과제 제목</label><input type="text" id="atitle" placeholder="예: 활동 1 — 일차함수의 그래프">' +
          '<label>안내문 (선택 — 학생에게 함께 보입니다)</label>' +
          '<input type="text" id="anote" placeholder="예: 모둠별로 해 보고 결과를 캡처해 보내세요">' +
          '<label>폴더</label>' + folderSelect("afolder", "", folders) +
          '<input type="text" id="anewf" placeholder="새 폴더 이름" style="display:none">' +
          '<label>HTML 코드</label><textarea id="ahtml" placeholder="&lt;!DOCTYPE html&gt; …"></textarea>' +
          '<div class="row"><button class="btn-s" id="pickfile">.html 파일 고르기</button>' +
          '<button class="btn-p" id="addapp">과제 추가</button></div>' +
          '<input type="file" id="hfile" accept=".html,.htm,text/html" style="display:none">' +
          '<div class="err" id="err" style="margin-top:10px"></div></div>') +
        '<div id="modal"></div>';

      wireFolderSelect("afolder", "anewf");
      on("#pickfile", "click", function () { $("#hfile").click(); });
      on("#hfile", "change", function (e) {
        var f = e.target.files[0]; if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          $("#ahtml").value = String(rd.result);
          if (!$("#atitle").value) $("#atitle").value = f.name.replace(/\.html?$/i, "");
        };
        rd.readAsText(f); e.target.value = "";
      });
      on("#addapp", "click", function () {
        var title = $("#atitle").value.trim(), html = $("#ahtml").value;
        var folder = readFolder("afolder", "anewf");
        if (folder === null) return setErr("새 폴더 이름을 입력하세요.");
        if (!title) return setErr("과제 제목을 입력하세요.");
        if (!html.trim()) return setErr("HTML 코드를 붙여넣거나 파일을 고르세요.");
        var btn = $("#addapp"); btn.disabled = true; setErr("");
        sb.from("apps").insert({ space_code: ST.space.code, title: title, html: html,
          note: ($("#anote").value.trim() || null), created_by: ST.user.id,
          folder: folder || null, position: ST.apps.length })
          .then(function (r) {
            btn.disabled = false;
            if (r.error) return setErr("저장하지 못했습니다: " + r.error.message);
            panelApps();
          });
      });
      var reorder = function (fn) {
        return function (e) {
          var b = e.currentTarget;
          app.querySelectorAll(".ord .mini, .fup, .fdn").forEach(function (x) { x.disabled = true; });
          if (!fn(Number(b.dataset.g), Number(b.dataset.a))) {
            app.querySelectorAll(".ord .mini, .fup, .fdn").forEach(function (x) { x.disabled = false; });
            return;
          }
          saveOrder(GROUPS, panelApps);
        };
      };
      app.querySelectorAll(".aup").forEach(function (b) {
        b.addEventListener("click", reorder(function (g, a) { return swap(GROUPS[g].rows, a, a - 1); }));
      });
      app.querySelectorAll(".adn").forEach(function (b) {
        b.addEventListener("click", reorder(function (g, a) { return swap(GROUPS[g].rows, a, a + 1); }));
      });
      app.querySelectorAll(".fup").forEach(function (b) {
        b.addEventListener("click", reorder(function (g) { return swap(GROUPS, g, g - 1); }));
      });
      app.querySelectorAll(".fdn").forEach(function (b) {
        b.addEventListener("click", reorder(function (g) { return swap(GROUPS, g, g + 1); }));
      });

      app.querySelectorAll(".ren").forEach(function (b) {
        b.addEventListener("click", function () {
          var next = window.prompt("과제 제목을 바꿉니다.", b.dataset.t);
          if (next === null) return;
          next = next.trim();
          if (!next) return alert("제목은 비워 둘 수 없습니다.");
          sb.from("apps").update({ title: next }).eq("id", b.dataset.id).then(function (r) {
            if (r.error) return alert("바꾸지 못했습니다: " + r.error.message);
            panelApps();
          });
        });
      });

      app.querySelectorAll(".move").forEach(function (b) {
        b.addEventListener("click", function () {
          var cur = b.dataset.f || "";
          $("#modal").innerHTML =
            '<div class="modal"><div class="mbox"><div class="pickbox">' +
            '<h2>폴더 옮기기</h2>' +
            '<label>옮길 폴더를 고르세요</label>' + folderSelect("mfolder", cur, folders) +
            '<input type="text" id="mnewf" placeholder="새 폴더 이름" style="display:none">' +
            '<div class="row"><button class="btn-p" id="mok">옮기기</button>' +
            '<button class="btn-s" id="mcancel">취소</button></div></div></div></div>';
          wireFolderSelect("mfolder", "mnewf");
          on("#mcancel", "click", function () { $("#modal").innerHTML = ""; });
          on("#mok", "click", function () {
            var next = readFolder("mfolder", "mnewf");
            if (next === null) return alert("새 폴더 이름을 입력하세요.");
            sb.from("apps").update({ folder: next || null }).eq("id", b.dataset.id).then(function (r) {
              if (r.error) return alert("옮기지 못했습니다: " + r.error.message);
              panelApps();
            });
          });
        });
      });

      wireMenus();

      app.querySelectorAll(".hide").forEach(function (b) {
        b.addEventListener("click", function () {
          sb.from("apps").update({ hidden: !b.dataset.h }).eq("id", b.dataset.id).then(function (r) {
            if (r.error) return alert("바꾸지 못했습니다: " + r.error.message);
            panelApps();
          });
        });
      });

      app.querySelectorAll(".vers").forEach(function (b) {
        b.addEventListener("click", function () { showVersions(b.dataset.id, b.dataset.t); });
      });

      app.querySelectorAll(".anote").forEach(function (b) {
        b.addEventListener("click", function () {
          var next = window.prompt("학생에게 함께 보일 안내문입니다. 비우면 지워집니다.", b.dataset.n || "");
          if (next === null) return;
          sb.from("apps").update({ note: next.trim() || null }).eq("id", b.dataset.id).then(function (r) {
            if (r.error) return alert("저장하지 못했습니다: " + r.error.message);
            panelApps();
          });
        });
      });

      app.querySelectorAll(".code").forEach(function (b) {
        b.addEventListener("click", function () { showCode(b.dataset.id); });
      });
      app.querySelectorAll(".cpto").forEach(function (b) {
        b.addEventListener("click", function () { copyToSpace(b.dataset.id, b.dataset.t); });
      });

      app.querySelectorAll(".prev").forEach(function (b) {
        b.addEventListener("click", function () { previewApp(b.dataset.id); });
      });
      app.querySelectorAll("#panel .del").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1";
            b.classList.add("armed");
            b.title = "한 번 더 누르면 지워집니다";
            setTimeout(function () {
              if (b.dataset.armed === "1") { b.dataset.armed = ""; b.classList.remove("armed"); b.title = "삭제"; }
            }, 4000);
            return;
          }
          sb.from("apps").delete().eq("id", b.dataset.id).then(panelApps);
        });
      });
    });
}

/* 이전 버전 보기 · 되돌리기 (7일 보관) */
function showVersions(id, title) {
  sb.from("app_versions").select("id,title,saved_at").eq("app_id", id)
    .order("saved_at", { ascending: false }).limit(30).then(function (r) {
      var rows = r.data || [];
      $("#modal").innerHTML =
        '<div class="modal"><div class="mbox"><div class="pickbox">' +
        '<h2>이전 버전 — ' + esc(title) + '</h2>' +
        '<p class="hint">과제를 고칠 때마다 바뀌기 전 모습이 7일 동안 보관됩니다.</p>' +
        (rows.length
          ? rows.map(function (v) {
              return '<div class="item"><div class="grow"><div class="t">' + esc(v.title || "(제목 없음)") + '</div>' +
                '<div class="m">' + fmt(v.saved_at) + '</div></div>' +
                '<button class="btn-s vprev" data-id="' + v.id + '">열어 보기</button>' +
                '<button class="btn-d vback" data-id="' + v.id + '" data-a="' + id + '">되돌리기</button></div>';
            }).join("")
          : '<div class="empty">보관된 이전 버전이 없습니다.</div>') +
        '<div class="row" style="margin-top:12px"><button class="btn-s" id="vclose">닫기</button></div>' +
        '</div></div></div>';
      on("#vclose", "click", function () { $("#modal").innerHTML = ""; });

      app.querySelectorAll(".vprev").forEach(function (b) {
        b.addEventListener("click", function () {
          sb.from("app_versions").select("title,html").eq("id", b.dataset.id).single().then(function (rr) {
            if (!rr.data) return;
            $("#modal").innerHTML =
              '<div class="modal"><div class="mbox"><p>' + esc(rr.data.title || "") + '</p>' +
              '<div id="holder"></div><div style="margin-top:12px">' +
              '<button class="btn-p" id="close">닫기</button></div></div></div>';
            mountFrame("#holder", rr.data.html, rr.data.title);
            on("#close", "click", function () { $("#modal").innerHTML = ""; });
          });
        });
      });

      app.querySelectorAll(".vback").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.textContent === "되돌리기") { b.textContent = "정말 되돌리기"; return; }
          b.disabled = true;
          sb.from("app_versions").select("title,html").eq("id", b.dataset.id).single().then(function (rr) {
            if (!rr.data) throw new Error("불러오지 못했습니다.");
            return sb.from("apps").update({ title: rr.data.title, html: rr.data.html }).eq("id", b.dataset.a);
          }).then(function (r3) {
            if (r3 && r3.error) throw new Error(r3.error.message);
            $("#modal").innerHTML = "";
            panelApps();
          }).catch(function (e) {
            b.disabled = false; b.textContent = "되돌리기";
            alert("되돌리지 못했습니다: " + (e.message || ""));
          });
        });
      });
    });
}

/* 과제의 HTML 코드 보기 */
function showCode(id) {
  sb.from("apps").select("title,html").eq("id", id).single().then(function (r) {
    if (!r.data) return;
    $("#modal").innerHTML =
      '<div class="modal"><div class="mbox"><div class="pickbox">' +
      '<h2>' + esc(r.data.title) + '</h2>' +
      '<p class="hint">이 과제의 HTML 코드입니다. 그대로 복사해 고치거나 다른 곳에 쓸 수 있습니다.</p>' +
      '<textarea id="codebox" readonly style="min-height:300px"></textarea>' +
      '<div class="row"><button class="btn-p" id="cpcode">코드 복사</button>' +
      '<button class="btn-s" id="dlcode">파일로 받기</button>' +
      '<button class="btn-s" id="ccancel">닫기</button></div></div></div></div>';
    $("#codebox").value = r.data.html;
    on("#cpcode", "click", function (e) { copy(r.data.html, e.target); });
    on("#dlcode", "click", function () {
      var blob = new Blob([r.data.html], { type: "text/html" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (r.data.title || "과제").replace(/[\\/:*?"<>|]/g, "") + ".html";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    on("#ccancel", "click", function () { $("#modal").innerHTML = ""; });
  });
}

/* 다른 과제 공간으로 복사 */
function copyToSpace(id, title) {
  var cur = ST.space ? ST.space.code : "";
  var others = (ST.spaces || []).filter(function (x) { return x.code !== cur; });
  if (!others.length) {
    alert("복사해 넣을 다른 공간이 없습니다. 먼저 공간을 하나 더 만들어 주세요.");
    return;
  }
  $("#modal").innerHTML =
    '<div class="modal"><div class="mbox"><div class="pickbox">' +
    '<h2>다른 공간으로 복사</h2>' +
    '<p class="hint">' + esc(title) + ' 을(를) 복사합니다. 원본은 이 공간에 그대로 남습니다.</p>' +
    '<label>어느 공간으로 보낼까요</label>' +
    '<select id="tospace">' + others.map(function (x) {
      return '<option value="' + esc(x.code) + '">' + esc(x.title) + ' · ' + esc(x.code) + '</option>';
    }).join("") + '</select>' +
    '<div class="err" id="err"></div>' +
    '<div class="row"><button class="btn-p" id="docopy">복사하기</button>' +
    '<button class="btn-s" id="pcancel">취소</button></div></div></div></div>';
  on("#pcancel", "click", function () { $("#modal").innerHTML = ""; });
  on("#docopy", "click", function () {
    var to = $("#tospace").value, btn = $("#docopy");
    btn.disabled = true; btn.textContent = "복사하는 중…";
    sb.from("apps").select("title,html,folder").eq("id", id).single().then(function (r) {
      if (!r.data) throw new Error("원본을 읽지 못했습니다.");
      return sb.from("apps").insert({
        space_code: to, title: r.data.title, html: r.data.html, folder: r.data.folder || null
      });
    }).then(function (rr) {
      btn.disabled = false; btn.textContent = "복사하기";
      if (rr && rr.error) return setErr("복사하지 못했습니다: " + rr.error.message);
      $("#modal").innerHTML = "";
      var nm = others.filter(function (x) { return x.code === to; })[0];
      alert((nm ? nm.title : to) + " 으로 복사했습니다.");
    }).catch(function (e) {
      btn.disabled = false; btn.textContent = "복사하기";
      setErr(e.message || "복사하지 못했습니다.");
    });
  });
}

function previewApp(id) {
  sb.from("apps").select("title,html").eq("id", id).single().then(function (r) {
    if (!r.data) return;
    $("#modal").innerHTML =
      '<div class="modal"><div class="mbox"><p>' + esc(r.data.title) + '</p>' +
      '<div id="holder"></div><div style="margin-top:12px">' +
      '<button class="btn-p" id="close">닫기</button></div></div></div>';
    mountFrame("#holder", r.data.html, r.data.title);
    on("#close", "click", function () { $("#modal").innerHTML = ""; });
  });
}

function panelLog() {
  sb.from("visits").select("id,student_name,created_at").eq("space_code", ST.space.code)
    .order("created_at", { ascending: false }).limit(500).then(function (r) {
      var rows = (r.data || []);
      $("#panel").innerHTML =
        '<div class="card"><h2>접속 기록 <span class="num">' + rows.length + '</span></h2>' +
        '<p class="hint">날짜별로 묶여 있습니다. 왼쪽 네모를 눌러 고른 뒤 선택 삭제하거나, 그날 것을 한 번에 지울 수 있습니다.</p>' +
        (rows.length
          ? groupByDay(rows).map(function (g, gi) {
              return '<div class="daygroup" data-g="' + gi + '">' +
                '<div class="dayhead"><label class="dl"><input type="checkbox" class="dchk">' +
                  esc(g.label) + '</label>' +
                '<span class="dbtns"><b>' + g.rows.length + '명</b>' +
                (isOwner() ? '<button class="btn-d dsel">선택 삭제</button>' +
                  '<button class="btn-d dall">전체 삭제</button>' : '') + '</span></div>' +
                g.rows.map(function (v) {
                  return '<div class="item"><input type="checkbox" class="chk" data-id="' + v.id + '">' +
                    '<div class="grow"><div class="t">' + esc(v.student_name) + '</div></div>' +
                    '<div class="m">' + hm(v.created_at) + '</div>' +
                    (isOwner() ? '<button class="btn-d vdel" data-id="' + v.id + '">삭제</button>' : '') + '</div>';
                }).join("") + '</div>';
            }).join("")
          : '<div class="empty">아직 들어온 학생이 없습니다.</div>') + '</div>';

      wireGroups(function (ids) {
        return sb.from("visits").delete().in("id", ids);
      }, panelLog);

      app.querySelectorAll(".vdel").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.textContent === "삭제") { b.textContent = "정말 삭제"; return; }
          b.disabled = true;
          sb.from("visits").delete().eq("id", b.dataset.id).then(function (r) {
            if (r.error) { b.disabled = false; b.textContent = "삭제"; alert("지우지 못했습니다: " + r.error.message); return; }
            panelLog();
          });
        });
      });
    });
}

/* 날짜 묶음의 전체 선택 · 선택 삭제 · 전체 삭제 */
function wireGroups(deleteFn, reload) {
  app.querySelectorAll(".daygroup").forEach(function (grp) {
    var boxes = grp.querySelectorAll(".chk");
    var head = grp.querySelector(".dchk");

    head.addEventListener("change", function () {
      boxes.forEach(function (c) { c.checked = head.checked; });
    });
    boxes.forEach(function (c) {
      c.addEventListener("change", function () {
        var all = Array.prototype.every.call(boxes, function (x) { return x.checked; });
        head.checked = all;
      });
    });

    var run = function (btn, list, label) {
      if (!list.length) { alert("고른 항목이 없습니다."); return; }
      if (btn.dataset.armed !== "1") {
        btn.dataset.armed = "1";
        btn.textContent = list.length + "건 정말 삭제";
        setTimeout(function () {
          if (btn.dataset.armed === "1") { btn.dataset.armed = ""; btn.textContent = label; }
        }, 4000);
        return;
      }
      btn.disabled = true;
      btn.textContent = "지우는 중…";
      var ids = list.map(function (c) { return c.dataset.id; });
      var paths = list.map(function (c) { return c.dataset.path; }).filter(Boolean);
      var step = paths.length
        ? sb.storage.from("submissions").remove(paths).then(function () { return deleteFn(ids); })
        : deleteFn(ids);
      step.then(function (r) {
        if (r && r.error) {
          btn.disabled = false; btn.dataset.armed = ""; btn.textContent = label;
          alert("지우지 못했습니다: " + r.error.message);
          return;
        }
        reload();
      });
    };

    if (!grp.querySelector(".dsel")) return;
    grp.querySelector(".dsel").addEventListener("click", function (e) {
      run(e.target, Array.prototype.filter.call(boxes, function (c) { return c.checked; }), "선택 삭제");
    });
    grp.querySelector(".dall").addEventListener("click", function (e) {
      run(e.target, Array.prototype.slice.call(boxes), "전체 삭제");
    });
  });
}

/* 하루치 제출물을 zip 으로 묶어 내려받기 */
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise(function (res, rej) {
    var sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
    sc.onload = function () { res(window.JSZip); };
    sc.onerror = function () { rej(new Error("압축 도구를 불러오지 못했습니다.")); };
    document.head.appendChild(sc);
  });
}

function downloadDay(label, rows, btn) {
  if (!rows.length) return alert("내려받을 것이 없습니다.");

  var old = btn.textContent;
  btn.disabled = true; btn.textContent = "준비 중…";
  var safe = function (t) { return String(t || "").replace(/[\\/:*?"<>|]/g, "").slice(0, 40); };
  var csv = "\uFEFF이름,과제,시각,한마디,파일\n";

  signPaths(rows.map(function (r) { return r.image_path; })).then(loadJSZip).then(function (JSZip) {
    var zip = new JSZip(), jobs = [], used = {};
    rows.forEach(function (r, i) {
      var base = safe(r.student_name) + "_" + safe(r.app_title || "과제");
      var nm = base; var k = 2;
      while (used[nm]) { nm = base + "(" + (k++) + ")"; }
      used[nm] = true;
      csv += '"' + (r.student_name || "") + '","' + (r.app_title || "") + '","' + fmt(r.created_at) +
             '","' + (r.note || "").replace(/"/g, "'") + '","' + nm + '"\n';
      if (r.image_path) {
        var url = signed(r.image_path);
        var ext = (r.file_name && (r.file_name.match(/\.[A-Za-z0-9]+$/) || [])[0]) || ".jpg";
        jobs.push(fetch(url).then(function (res) { return res.blob(); })
          .then(function (b) { zip.file(nm + ext, b); })
          .catch(function () { }));
      } else {
        jobs.push(sb.from("submissions").select("html,payload").eq("id", r.id).single()
          .then(function (rr) {
            if (!rr.data) return;
            if (rr.data.html) zip.file(nm + ".html", rr.data.html);
            else if (rr.data.payload) zip.file(nm + ".json", JSON.stringify(rr.data.payload, null, 2));
          }).catch(function () { }));
      }
    });

    return Promise.all(jobs).then(function () {
      zip.file("목록.csv", csv);
      return zip.generateAsync({ type: "blob" });
    }).then(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = safe(ST.space.title) + "_" + label.replace(/[^0-9]/g, "") + ".zip";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      btn.disabled = false; btn.textContent = old;
    });
  }).catch(function (e) {
    btn.disabled = false; btn.textContent = old;
    alert(e.message || "내려받지 못했습니다.");
  });
}

function panelSubs() {
  sb.from("submissions").select("id,space_code,app_id,app_title,student_name,image_path,file_name,note,created_at,html_len,has_payload,feedback,reviewed_at").eq("space_code", ST.space.code)
    .order("created_at", { ascending: false }).limit(500)
    .then(function (r) {
      return signPaths((r.data || []).map(function (x) { return x.image_path; })).then(function () { return r; });
    })
    .then(function (r) {
      var all = r.data || [];
      var f = ST.subFilter || (ST.subFilter = { app: "", stu: "" });
      var apps = [], stus = [];
      all.forEach(function (x) {
        var t = x.app_title || "(과제 없음)";
        if (apps.indexOf(t) < 0) apps.push(t);
        if (stus.indexOf(x.student_name) < 0) stus.push(x.student_name);
      });
      apps.sort(function (a, b) { return a.localeCompare(b, "ko"); });
      stus.sort(function (a, b) { return a.localeCompare(b, "ko"); });
      var rows = all.filter(function (x) {
        return (!f.app || (x.app_title || "(과제 없음)") === f.app) && (!f.stu || x.student_name === f.stu);
      });
      var opt = function (list, cur) {
        return list.map(function (v) {
          return '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + '>' + esc(v) + '</option>';
        }).join("");
      };
      var url = signed;
      $("#panel").innerHTML =
        '<div class="card"><h2>제출 결과 <span class="num">' + rows.length +
        (rows.length !== all.length ? ' / ' + all.length : '') + '</span></h2>' +
        '<div class="filters">' +
        '<select id="fapp"><option value="">모든 과제</option>' + opt(apps, f.app) + '</select>' +
        '<select id="fstu"><option value="">모든 학생</option>' + opt(stus, f.stu) + '</select>' +
        (f.app || f.stu ? '<button class="btn-s" id="fclear">거르기 해제</button>' : '') +
        '</div>' +
        '<p class="hint">날짜별로 묶여 있습니다. 카드를 눌러 크게 보고, 네모를 골라 선택 삭제하거나 그날 것을 한 번에 지울 수 있습니다.</p>' +
        (rows.length
          ? groupByDay(rows).map(function (g, gi) {
              return '<div class="daygroup" data-g="' + gi + '">' +
                '<div class="dayhead"><label class="dl"><input type="checkbox" class="dchk">' +
                  esc(g.label) + '</label>' +
                '<span class="dbtns"><b>' + g.rows.length + '건</b>' +
                '<button class="btn-d ddl" data-g="' + gi + '">내려받기</button>' +
                (isOwner() ? '<button class="btn-d dsel">선택 삭제</button>' +
                  '<button class="btn-d dall">전체 삭제</button>' : '') + '</span></div>' +
                '<div class="grid" style="margin-top:10px">' + g.rows.map(function (s) {
                  var isImg = s.image_path && (!s.file_name || /\.(jpe?g|png|gif|webp|bmp|heic|svg)$/i.test(s.file_name));
                  var face = isImg
                    ? '<img loading="lazy" src="' + esc(url(s.image_path)) + '" alt="제출 캡처">'
                    : s.image_path
                      ? '<div class="face file">FILE<small>' + esc(s.file_name || "파일") + '</small></div>'
                    : s.html_len
                      ? '<div class="face">HTML<small>' + Math.max(1, Math.round(s.html_len / 1000)) + 'KB · 눌러서 실행</small></div>'
                      : '<div class="face data">DATA<small>눌러서 보기</small></div>';
                  return '<div class="thumb"><div class="open" data-id="' + s.id + '" data-p="' + esc(s.image_path || "") +
                    '" data-f="' + esc(s.file_name || "") + '" data-img="' + (isImg ? "1" : "") + '" data-n="' +
                    esc(s.student_name + " · " + (s.app_title || "") + " · " + fmt(s.created_at) +
                    (s.note ? " · " + s.note : "")) + '">' + face +
                    '<div class="cap"><b>' + esc(s.student_name) + '</b>' +
                    '<i>' + esc(s.app_title || "") + '</i><i>' + hm(s.created_at) + '</i></div></div>' +
                    '<div class="fb' + (s.reviewed_at ? ' done' : '') + '">' +
                      '<button class="btn-s fbbtn" data-id="' + s.id + '" data-f="' + esc(s.feedback || "") +
                      '" data-r="' + (s.reviewed_at ? "1" : "") + '" data-n="' + esc(s.student_name) + '">' +
                      (s.reviewed_at ? '확인함' : '확인·피드백') + '</button>' +
                      (s.feedback ? '<span class="fbtext">' + esc(s.feedback) + '</span>' : '') + '</div>' +
                    '<div class="foot"><label class="dl"><input type="checkbox" class="chk" data-id="' + s.id +
                    '" data-path="' + esc(s.image_path || "") + '">고르기</label>' +
                    (isOwner() ? '<button class="btn-d sdel" data-id="' + s.id +
                      '" data-path="' + esc(s.image_path || "") + '">삭제</button>' : '') + '</div></div>';
                }).join("") + '</div></div>';
            }).join("")
          : '<div class="empty">' + (all.length ? '고른 조건에 맞는 제출이 없습니다.' : '아직 제출된 결과가 없습니다.') +
            '</div>') + '</div><div id="modal"></div>';

      var days = groupByDay(rows);
      app.querySelectorAll(".ddl").forEach(function (b) {
        b.addEventListener("click", function () {
          var g = days[Number(b.dataset.g)];
          var picked = Array.prototype.filter.call(
            b.closest(".daygroup").querySelectorAll(".chk"), function (c) { return c.checked; });
          var ids = picked.length ? picked.map(function (c) { return c.dataset.id; }) : null;
          var list = ids ? g.rows.filter(function (x) { return ids.indexOf(x.id) >= 0; }) : g.rows;
          downloadDay(g.label, list, b);
        });
      });

      on("#fapp", "change", function () { ST.subFilter.app = $("#fapp").value; panelSubs(); });
      on("#fstu", "change", function () { ST.subFilter.stu = $("#fstu").value; panelSubs(); });
      on("#fclear", "click", function () { ST.subFilter = { app: "", stu: "" }; panelSubs(); });

      wireGroups(function (ids) {
        return sb.from("submissions").delete().in("id", ids);
      }, panelSubs);

      app.querySelectorAll(".fbbtn").forEach(function (b) {
        b.addEventListener("click", function () {
          $("#modal").innerHTML =
            '<div class="modal"><div class="mbox"><div class="pickbox">' +
            '<h2>' + esc(b.dataset.n) + ' 제출물</h2>' +
            '<p class="hint">확인 표시를 남기고 한마디 적어 주면 학생이 자기 이력에서 봅니다.</p>' +
            '<label>피드백 (비워도 됩니다)</label>' +
            '<input type="text" id="fbtxt" placeholder="예: 그래프 설명이 좋았어요">' +
            '<div class="row"><button class="btn-p" id="fbok">확인함으로 저장</button>' +
            (b.dataset.r ? '<button class="btn-s" id="fbundo">확인 취소</button>' : '') +
            '<button class="btn-s" id="fbcancel">닫기</button></div></div></div></div>';
          $("#fbtxt").value = b.dataset.f || "";
          on("#fbcancel", "click", function () { $("#modal").innerHTML = ""; });
          var save = function (reviewed) {
            sb.from("submissions").update({
              feedback: $("#fbtxt").value.trim() || null,
              reviewed_at: reviewed ? new Date().toISOString() : null
            }).eq("id", b.dataset.id).then(function (r) {
              if (r.error) return alert("저장하지 못했습니다: " + r.error.message);
              $("#modal").innerHTML = "";
              panelSubs();
            });
          };
          on("#fbok", "click", function () { save(true); });
          on("#fbundo", "click", function () { save(false); });
        });
      });

      app.querySelectorAll(".sdel").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.textContent === "삭제") { b.textContent = "정말 삭제"; return; }
          b.disabled = true;
          (b.dataset.path ? sb.storage.from("submissions").remove([b.dataset.path]) : Promise.resolve()).then(function () {
            return sb.from("submissions").delete().eq("id", b.dataset.id);
          }).then(function (r) {
            if (r && r.error) { b.disabled = false; b.textContent = "삭제"; alert("지우지 못했습니다: " + r.error.message); return; }
            panelSubs();
          });
        });
      });

      app.querySelectorAll(".thumb .open").forEach(function (b) {
        b.addEventListener("click", function () {
          if (!b.dataset.p) return openHtmlSub(b.dataset.id, b.dataset.n);
          var link = url(b.dataset.p);
          $("#modal").innerHTML =
            '<div class="modal"><div class="mbox"><p>' + esc(b.dataset.n) + '</p>' +
            (b.dataset.img
              ? '<img src="' + esc(link) + '" alt="제출 캡처">'
              : '<div class="pickbox"><h2>' + esc(b.dataset.f || "파일") + '</h2>' +
                '<p class="hint">그림이 아닌 파일입니다. 받아서 열어 보세요.</p>' +
                '<a class="btn-p" style="display:inline-block;text-decoration:none" href="' + esc(link) +
                '" download="' + esc(b.dataset.f || "submission") + '" target="_blank" rel="noopener">파일 받기</a></div>') +
            '<div style="margin-top:12px"><button class="btn-p" id="close">닫기</button></div></div></div>';
          on("#close", "click", function () { $("#modal").innerHTML = ""; });
        });
      });
    });
}
/* 교사: HTML / 자료 제출물 보기 (추가) — 샌드박스 iframe 안에서만 실행합니다 */
function openHtmlSub(id, label) {
  $("#modal").innerHTML = '<div class="modal"><div class="mbox wide"><p>불러오는 중…</p></div></div>';
  sb.from("submissions").select("html,payload").eq("id", id).single().then(function (r) {
    if (r.error || !r.data) { $("#modal").innerHTML = ""; alert("불러오지 못했습니다."); return; }
    var d = r.data;
    $("#modal").innerHTML =
      '<div class="modal"><div class="mbox wide"><p>' + esc(label) + '</p>' +
      (d.html ? '<div id="mholder"></div>' : '') +
      (d.payload ? '<pre>' + esc(JSON.stringify(d.payload, null, 2)) + '</pre>' : '') +
      '<div class="row" style="margin-top:12px;justify-content:center">' +
      (d.html ? '<button class="btn-s" id="dl" style="background:#fff">HTML 내려받기</button>' : '') +
      '<button class="btn-p" id="close">닫기</button></div></div></div>';
    if (d.html) mountFrame("#mholder", d.html, "학생 제출 HTML");
    on("#close", "click", function () { $("#modal").innerHTML = ""; });
    on("#dl", "click", function () {
      /* 새 탭에서 열지 않고 파일로만 받습니다 (새 탭은 이 사이트 권한으로 실행될 수 있어 위험) */
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([d.html], { type: "application/octet-stream" }));
      a.download = (label.split(" · ").slice(0, 2).join("_") || "submission").replace(/[\\/:*?"<>|]/g, "") + ".html";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
  });
}

/* ── 함께 관리하는 교사 ───────────────────────────────── */
function panelMembers() {
  sb.from("space_members").select("id,email,created_at,role,expires_at").eq("space_code", ST.space.code)
    .order("created_at").then(function (r) {
      var rows = r.data || [];
      $("#panel").innerHTML =
        '<div class="card"><h2>함께 관리하는 선생님 <span class="num">' + rows.length + '</span></h2>' +
        '<p class="hint">초대한 선생님은 과제를 올리고 자기가 올린 과제를 고칠 수 있으며, 접속 기록과 제출 결과도 봅니다. ' +
        '남이 올린 과제를 지우거나, 공간 이름과 유형을 바꾸거나, 학생 기록을 지우는 것은 만든 사람만 할 수 있습니다.</p>' +
        (rows.length
          ? rows.map(function (m) {
              var gone = m.expires_at && m.expires_at < new Date().toISOString().slice(0, 10);
              return '<div class="item"><div class="grow"><div class="t">' + esc(m.email) +
                (gone ? '<span class="lockmark">기간 지남</span>' : '') + '</div>' +
                '<div class="m">' + fmt(m.created_at) + ' 초대' +
                (m.expires_at ? ' · ' + esc(m.expires_at) + '까지' : ' · 기한 없음') + '</div></div>' +
                '<button class="btn-d mdel" data-id="' + m.id + '">내보내기</button></div>';
            }).join("")
          : '<div class="empty">아직 초대한 선생님이 없습니다.</div>') + '</div>' +
        '<div class="card"><h2>선생님 초대</h2>' +
        '<p class="hint">상대 선생님이 구글 로그인에 쓰는 이메일을 적으세요. ' +
        '그 주소로 로그인하면 자기 공간 목록에 이 공간이 함께 보입니다. 따로 메일이 가지는 않으니 직접 알려 주세요. ' +
        '한 공간에 20명까지 초대할 수 있습니다.</p>' +
        '<label>이메일</label><input type="text" id="memail" placeholder="teacher@school.kr">' +
        '<label>언제까지 (비우면 기한 없음)</label>' +
        '<input type="date" id="mexp">' +
        '<div class="err" id="err"></div>' +
        '<button class="btn-p" id="minvite">초대하기</button></div>';

      on("#minvite", "click", function () {
        var email = $("#memail").value.trim().toLowerCase();
        if (!/.+@.+\..+/.test(email)) return setErr("이메일 형식을 확인하세요.");
        if (ST.user.email && email === ST.user.email.toLowerCase()) return setErr("본인은 이미 이 공간의 주인입니다.");
        var btn = $("#minvite"); btn.disabled = true; setErr("");
        sb.from("space_members").insert({
          space_code: ST.space.code, email: email,
          expires_at: $("#mexp").value || null
        }).then(function (r) {
          btn.disabled = false;
          if (r.error) {
            var m = r.error.message || "";
            if (r.error.code === "23505") return setErr("이미 초대한 선생님입니다.");
            if (m.indexOf("MEMBERCAP") >= 0) return setErr("한 공간에는 20명까지 초대할 수 있습니다.");
            return setErr("초대하지 못했습니다: " + m);
          }
          panelMembers();
        });
      });

      app.querySelectorAll(".mdel").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.textContent === "내보내기") { b.textContent = "정말 내보내기"; return; }
          b.disabled = true;
          sb.from("space_members").delete().eq("id", b.dataset.id).then(function (r) {
            if (r.error) { b.disabled = false; b.textContent = "내보내기"; alert("내보내지 못했습니다: " + r.error.message); return; }
            panelMembers();
          });
        });
      });
    });
}

/* 엑셀 도구 받아 오기 */
function ensureXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise(function (res, rej) {
    var sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    sc.onload = function () { res(window.XLSX); };
    sc.onerror = function () { rej(new Error("엑셀 도구를 불러오지 못했습니다.")); };
    document.head.appendChild(sc);
  });
}

/* 명단 작성용 양식 내려받기 */
function downloadRosterForm(btn) {
  var old = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "만드는 중…"; }
  var title = (ST.space && ST.space.title ? ST.space.title : "과제공간").replace(/[\\/:*?"<>|]/g, "");
  var rows = [["이름", "비밀번호"], ["홍길동", "2401"], ["김영희", "2402"]];
  for (var i = 0; i < 40; i++) rows.push(["", ""]);

  var done = function () { if (btn) { btn.disabled = false; btn.textContent = old; } };
  var save = function (href, name) {
    var a = document.createElement("a");
    a.href = href; a.download = name; a.click();
    setTimeout(function () { if (href.indexOf("blob:") === 0) URL.revokeObjectURL(href); }, 1500);
  };

  ensureXLSX().then(function (XLSX) {
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 18 }, { wch: 14 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "학생명단");
    XLSX.writeFile(wb, title + "_학생명단_양식.xlsx");
    done();
  }).catch(function () {
    var csv = "\uFEFF" + rows.map(function (r) { return r.join(","); }).join("\n");
    save(URL.createObjectURL(new Blob([csv], { type: "text/csv" })), title + "_학생명단_양식.csv");
    done();
  });
}

/* 붙여넣은 글에서 명단 뽑기 */
function parseRosterText(text) {
  var out = [];
  String(text || "").split(/\r?\n/).forEach(function (line) {
    var t = line.trim();
    if (!t) return;
    var parts = t.split(/[,\t;]/);
    var nm = (parts[0] || "").trim();
    var pin = (parts[1] || "").trim() || "1234";
    if (!nm) return;
    if (/^(이름|성명|학생|name)$/i.test(nm)) return;          /* 머리글 줄은 건너뜁니다 */
    out.push({ name: nm, pin: pin });
  });
  return out;
}

/* 엑셀·CSV 파일에서 명단 뽑기 */
function readRosterFile(file) {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(parseRosterText(String(r.result))); };
      r.onerror = function () { rej(new Error("파일을 읽지 못했습니다.")); };
      r.readAsText(file, "utf-8");
    });
  }
  return new Promise(function (res, rej) {
    var go = function () {
      var r = new FileReader();
      r.onload = function () {
        try {
          var wb = window.XLSX.read(new Uint8Array(r.result), { type: "array" });
          var sh = wb.Sheets[wb.SheetNames[0]];
          var rows = window.XLSX.utils.sheet_to_json(sh, { header: 1, blankrows: false });
          var out = [];
          rows.forEach(function (row) {
            var nm = String(row[0] == null ? "" : row[0]).trim();
            var pin = String(row[1] == null ? "" : row[1]).trim() || "1234";
            if (!nm || /^(이름|성명|학생|name)$/i.test(nm)) return;
            out.push({ name: nm, pin: pin });
          });
          res(out);
        } catch (e) { rej(new Error("엑셀 파일을 읽지 못했습니다.")); }
      };
      r.onerror = function () { rej(new Error("파일을 읽지 못했습니다.")); };
      r.readAsArrayBuffer(file);
    };
    ensureXLSX().then(go).catch(function () {
      rej(new Error("엑셀 도구를 불러오지 못했습니다. CSV 로 저장해 올려 주세요."));
    });
  });
}

/* 올린 명단 미리 보여 주기 */
function showRosterPreview(rows) {
  var box = $("#rpreview");
  if (!box) return;
  if (!rows.length) { box.innerHTML = '<div class="err">읽어 들인 이름이 없습니다. 첫 열에 이름이 있는지 확인해 주세요.</div>'; return; }
  var bad = rows.filter(function (r) { return r.pin.length < 4; });
  box.innerHTML =
    '<div class="banner">' + rows.length + '명을 읽었습니다' +
    (bad.length ? ' · 비밀번호가 짧은 ' + bad.length + '명은 등록되지 않습니다 (' +
      bad.slice(0, 5).map(function (r) { return esc(r.name); }).join(", ") + (bad.length > 5 ? " 외" : "") + ')' : '') +
    ' — 아래 칸에서 고친 뒤 등록하세요.</div>';
}

/* ── 학생 명단 (교사용) ──────────────────────────────── */
function panelStudents() {
  Promise.all([
    sb.from("students").select("id,name,created_at,last_seen").eq("space_code", ST.space.code).order("name"),
    sb.from("apps").select("id,title,position").eq("space_code", ST.space.code),
    sb.from("submissions").select("student_id,app_id").eq("space_code", ST.space.code).limit(3000)
  ]).then(function (res) {
      var r = res[0];
      var apps = sortApps(res[1].data || []);
      var subs = res[2].data || [];
      var rows = r.data || [];
      var seen = {};
      subs.forEach(function (x) {
        if (!x.student_id || !x.app_id) return;
        var k = x.student_id + "|" + x.app_id;
        seen[k] = (seen[k] || 0) + 1;
      });
      var matrix = "";
      if (rows.length && apps.length) {
        matrix =
          '<div class="card"><h2>제출 현황</h2>' +
          '<p class="hint">학생이 과제별로 결과를 보냈는지 보여 줍니다. 숫자는 보낸 횟수입니다.</p>' +
          '<div class="mwrap"><table class="matrix"><thead><tr><th>학생</th>' +
          apps.map(function (a) { return '<th>' + esc(a.title) + '</th>'; }).join("") +
          '<th>합계</th></tr></thead><tbody>' +
          rows.map(function (st) {
            var done = 0;
            var cells = apps.map(function (a) {
              var c = seen[st.id + "|" + a.id] || 0;
              if (c) done++;
              return '<td class="' + (c ? "yes" : "no") + '">' + (c ? (c > 1 ? c : "✓") : "·") + '</td>';
            }).join("");
            return '<tr><th class="nm">' + esc(st.name) + '</th>' + cells +
              '<td class="sum">' + done + '/' + apps.length + '</td></tr>';
          }).join("") + '</tbody></table></div></div>';
      }
      $("#panel").innerHTML = matrix +
        '<div class="card"><h2>학생 명단 <span class="num">' + rows.length + '</span></h2>' +
        '<p class="hint">학생이 처음 들어올 때 정한 이름입니다. 비밀번호를 잊은 학생은 지워 주세요. ' +
        '지우면 그 이름으로 다시 등록할 수 있고, 이미 보낸 결과는 그대로 남습니다.</p>' +
        (rows.length
          ? rows.map(function (st) {
              return '<div class="item"><div class="grow"><div class="t">' + esc(st.name) + '</div>' +
                '<div class="m">마지막 접속 ' + fmt(st.last_seen) + '</div></div>' +
                '<button class="btn-d stdel" data-id="' + st.id + '">비밀번호 초기화</button></div>';
            }).join("")
          : '<div class="empty">아직 등록한 학생이 없습니다.</div>') + '</div>' +
        '<div class="card"><h2>명단 미리 등록</h2>' +
        '<p class="hint">엑셀 파일을 올리거나, 한 줄에 한 명씩 <b>이름, 비밀번호</b> 로 붙여넣으세요. ' +
        '비밀번호를 빼면 1234 로 넣고, 이미 있는 이름은 비밀번호만 새로 바뀝니다. ' +
        '양식 받기로 엑셀 파일을 내려받아 채워 올리시면 가장 간편합니다. 예시 두 줄은 지우고 쓰세요.</p>' +
        '<div class="row" style="margin-bottom:12px">' +
          '<button class="btn-s" id="dlForm">양식 받기</button>' +
          '<button class="btn-s" id="pickXls">엑셀·CSV 파일 고르기</button>' +
          '<span class="m" id="xlsName"></span></div>' +
        '<input type="file" id="xlsFile" accept=".xlsx,.xls,.csv,text/csv" style="display:none">' +
        '<textarea id="roster" style="min-height:120px" placeholder="김민서, 2401\n이준호, 2402\n박서윤"></textarea>' +
        '<div id="rpreview"></div>' +
        '<label class="dl" style="margin-bottom:12px"><input type="checkbox" id="rlock"' +
        (ST.space.roster_locked ? ' checked' : '') + '> 명단에 없는 이름은 들어오지 못하게 하기</label>' +
        '<div class="err" id="err"></div><div class="ok" id="rok"></div>' +
        '<button class="btn-p" id="rgo">명단 등록</button></div>';

      on("#rlock", "change", function () {
        var v = $("#rlock").checked;
        sb.from("spaces").update({ roster_locked: v }).eq("code", ST.space.code).then(function (rr) {
          if (rr.error) { $("#rlock").checked = !v; return alert("바꾸지 못했습니다: " + rr.error.message); }
          ST.space.roster_locked = v;
        });
      });

      on("#dlForm", "click", function (e) { downloadRosterForm(e.target); });
      on("#pickXls", "click", function () { $("#xlsFile").click(); });
      on("#xlsFile", "change", function (e) {
        var f = e.target.files[0]; e.target.value = "";
        if (!f) return;
        $("#xlsName").textContent = f.name;
        readRosterFile(f).then(function (rows) {
          $("#roster").value = rows.map(function (r) { return r.name + ", " + r.pin; }).join("\n");
          showRosterPreview(rows);
        }).catch(function (err) { setErr(err.message || "파일을 읽지 못했습니다."); });
      });
      on("#roster", "input", function () { $("#rpreview").innerHTML = ""; });

      on("#rgo", "click", function () {
        var rows = parseRosterText($("#roster").value);
        if (!rows.length) return setErr("명단을 붙여넣거나 파일을 올리세요.");
        var btn = $("#rgo"); btn.disabled = true; btn.textContent = "등록 중…"; setErr("");
        $("#rok").textContent = "";

        sb.rpc("student_preregister_bulk", { c: ST.space.code, items: rows }).then(function (rr) {
          btn.disabled = false; btn.textContent = "명단 등록";
          if (rr.error) {
            setErr("등록하지 못했습니다: " + rr.error.message +
              " — patch-roster.sql 을 Supabase 에서 실행했는지 확인해 주세요.");
            return;
          }
          var res = (rr.data || []).map(function (x) {
            return { name: x.out_name || x.name, status: x.out_status || x.status };
          });
          var okN = res.filter(function (x) { return x.status === "OK"; }).length;
          var bad = res.filter(function (x) { return x.status !== "OK"; });
          var why = { EMPTY: "이름이 비어 있음", SHORTPIN: "비밀번호가 네 자리 미만" };
          if (bad.length) {
            setErr(bad.map(function (x) {
              return x.name + " — " + (why[x.status] || x.status);
            }).join(" / "));
          }
          $("#rok").textContent = okN + "명 등록했습니다." + (bad.length ? " (" + bad.length + "명 실패)" : "");
          setTimeout(panelStudents, 900);
        });
      });

      app.querySelectorAll(".stdel").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.textContent === "비밀번호 초기화") { b.textContent = "정말 초기화"; return; }
          b.disabled = true;
          sb.from("students").delete().eq("id", b.dataset.id).then(function (rr) {
            if (rr.error) { b.disabled = false; b.textContent = "비밀번호 초기화"; alert("지우지 못했습니다: " + rr.error.message); return; }
            panelStudents();
          });
        });
      });
    });
}
