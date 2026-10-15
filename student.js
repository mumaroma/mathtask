/* ============================================================
   학생 화면 — 입장, 과제 열기, 제출, 내 이력
   ============================================================ */

/* ── 학생 ───────────────────────────────────────────────── */
function studentEnter(code) {
  render('<div class="card"><div class="empty">과제 공간을 찾는 중…</div></div>');
  sb.rpc("space_info", { c: code }).then(function (r) {
    r.data = (r.data || [])[0];
    if (!r.data) {
      render('<div class="card"><h2>공간을 찾을 수 없습니다</h2>' +
        '<p class="hint">코드가 맞는지 선생님께 다시 확인해 주세요.</p>' +
        '<button class="btn-p" id="home">처음으로</button></div>');
      on("#home", "click", goHome);
      return;
    }
    ST.space = r.data;
    if (r.data.mode === "open") { ST.student = null; ST.studentId = null; studentApps(); return; }
    var saved = null;
    try { saved = localStorage.getItem("mt-stu-" + ST.space.code); } catch (e) { }
    if (saved) {
      render('<div class="card"><div class="empty">이어서 들어가는 중…</div></div>');
      sb.rpc("student_resume", { c: ST.space.code, tok: saved }).then(function (rr) {
        var me = (rr.data || [])[0];
        if (me) { ST.student = me.name; ST.studentId = me.token; studentApps(); }
        else { try { localStorage.removeItem("mt-stu-" + ST.space.code); } catch (e) { } studentGate(); }
      });
      return;
    }
    studentGate();
  });
}

function studentGate() {
  render(
    '<div class="card"><h2>' + esc(ST.space.title) + '</h2>' +
      '<p class="hint">' + esc(ST.space.teacher_name || "선생님") + '의 과제 공간입니다. ' +
      '이름과 네 자리 비밀번호를 적으세요. 처음이면 그대로 등록되고, 다음부터는 같은 번호로 들어와 ' +
      '내가 보낸 것들을 볼 수 있습니다.</p>' +
      '<label>이름</label><input type="text" id="name" placeholder="예: 3학년 2반 김민서">' +
      '<label>네 자리 비밀번호</label>' +
      '<input type="text" id="pin" inputmode="numeric" maxlength="8" placeholder="숫자 네 자리" ' +
      'style="font-family:var(--mono);letter-spacing:6px">' +
      '<label class="dl" style="font-size:12.5px;color:var(--ink2);margin-bottom:12px">' +
      '<input type="checkbox" id="keep" checked> 이 기기에서는 다음부터 바로 들어가기</label>' +
      '<div class="err" id="err"></div>' +
      '<button class="btn-g" id="go">들어가기</button></div>');

  var go = function () {
    var name = $("#name").value.trim(), pin = $("#pin").value.trim();
    if (!name) return setErr("이름을 입력하세요.");
    if (pin.length < 4) return setErr("비밀번호는 네 자리 이상입니다.");
    $("#go").disabled = true; setErr("");
    sb.rpc("student_join", { c: ST.space.code, nm: name, pin: pin }).then(function (rr) {
      $("#go").disabled = false;
      if (rr.error) {
        var m = rr.error.message || "";
        if (m.indexOf("BADPIN") >= 0) return setErr("이미 쓰고 있는 이름입니다. 비밀번호가 다르면 선생님께 말씀드리세요.");
        if (m.indexOf("NOTINROSTER") >= 0) return setErr("명단에 없는 이름입니다. 선생님께 확인해 주세요.");
        return setErr("들어가지 못했습니다: " + m);
      }
      var me = (rr.data || [])[0];
      if (!me) return setErr("들어가지 못했습니다. 다시 시도하세요.");
      ST.student = me.name; ST.studentId = me.token;
      if ($("#keep").checked) {
        try { localStorage.setItem("mt-stu-" + ST.space.code, me.token); } catch (e) { }
      }
      studentApps();
    });
  };
  on("#go", "click", go);
  on("#pin", "keydown", function (e) { if (e.key === "Enter") go(); });
}

function studentApps() {
  if (ST.msgFn) { window.removeEventListener("message", ST.msgFn); ST.msgFn = null; }
  render('<div class="card"><div class="empty">과제를 불러오는 중…</div></div>');
  sb.rpc("space_apps", { c: ST.space.code }).then(function (r) {
    ST.apps = sortApps(r.data || []);
    render(
      '<div class="between"><span class="m">' + esc(ST.space.title) + '</span>' +
        (ST.studentId
          ? '<span class="row" style="gap:8px;align-items:center">' +
            '<span class="m">' + esc(ST.student) + '</span>' +
            '<button class="btn-s" id="mine">내 제출 이력</button>' +
            '<button class="btn-s" id="pinbtn">비밀번호 바꾸기</button>' +
            '<button class="btn-d" id="leave">나가기</button></span>'
          : '<span class="m">공개용</span>') + '</div>' +
      '<div class="card"><h2>과제 목록</h2><p class="hint">과제를 골라 여세요.</p>' +
      (ST.apps.length
        ? (function () {
            var n = 0, gs = groupByFolder(ST.apps);
            var one = gs.length === 1 && gs[0].plain;
            return gs.map(function (g, gi) {
              var body = g.rows.map(function (a) {
                n++;
                return '<div class="item"><span class="num">' + String(n).padStart(2, "0") + '</span>' +
                  '<div class="grow"><div class="t">' + esc(a.title) + '</div>' +
                  (a.note ? '<div class="note">' + esc(a.note) + '</div>' : '') + '</div>' +
                  '<button class="btn-p open" data-id="' + a.id + '">열기</button></div>';
              }).join("");
              if (one) return body;
              return '<button class="ftog" data-i="' + gi + '"><span>▾ ' + esc(g.label) + '</span>' +
                '<b>' + g.rows.length + '개</b></button>' +
                '<div class="fbody" id="fb' + gi + '">' + body + '</div>';
            }).join("");
          })()
        : '<div class="empty">아직 올라온 과제가 없습니다.</div>') + '</div>');
    on("#mine", "click", studentHistory);
    on("#pinbtn", "click", studentPin);
    on("#leave", "click", function () {
      try { localStorage.removeItem("mt-stu-" + ST.space.code); } catch (e) { }
      ST.student = null; ST.studentId = null; studentGate();
    });
    app.querySelectorAll(".ftog").forEach(function (b) {
      b.addEventListener("click", function () {
        var body = $("#fb" + b.dataset.i);
        var open = body.style.display !== "none";
        body.style.display = open ? "none" : "block";
        var lab = b.querySelector("span");
        lab.textContent = (open ? "▸ " : "▾ ") + lab.textContent.slice(2);
      });
    });
    app.querySelectorAll(".open").forEach(function (b) {
      b.addEventListener("click", function () { studentOpen(b.dataset.id); });
    });
  });
}

/* 학생: 내 비밀번호 바꾸기 */
function studentPin() {
  var box = $("#pinmodal");
  if (!box) { box = document.createElement("div"); box.id = "pinmodal"; app.appendChild(box); }
  box.innerHTML =
    '<div class="modal"><div class="mbox"><div class="pickbox">' +
    '<h2>비밀번호 바꾸기</h2>' +
    '<p class="hint">선생님이 정해 준 처음 비밀번호를 내 것으로 바꿀 수 있습니다. 네 자리 이상으로 정하세요.</p>' +
    '<label>지금 비밀번호</label>' +
    '<input type="password" id="oldpin" inputmode="numeric" style="font-family:var(--mono);letter-spacing:6px">' +
    '<label>새 비밀번호</label>' +
    '<input type="password" id="newpin" inputmode="numeric" style="font-family:var(--mono);letter-spacing:6px">' +
    '<label>새 비밀번호 다시</label>' +
    '<input type="password" id="newpin2" inputmode="numeric" style="font-family:var(--mono);letter-spacing:6px">' +
    '<div class="err" id="perr"></div><div class="ok" id="pok"></div>' +
    '<div class="row"><button class="btn-p" id="pgo">바꾸기</button>' +
    '<button class="btn-s" id="pcancel">취소</button></div></div></div></div>';

  var perr = function (m) { $("#perr").textContent = m || ""; };
  on("#pcancel", "click", function () { box.innerHTML = ""; });
  on("#pgo", "click", function () {
    var o = $("#oldpin").value.trim(), n = $("#newpin").value.trim(), n2 = $("#newpin2").value.trim();
    if (!o) return perr("지금 비밀번호를 입력하세요.");
    if (n.length < 4) return perr("새 비밀번호는 네 자리 이상입니다.");
    if (n !== n2) return perr("새 비밀번호가 서로 다릅니다.");
    var btn = $("#pgo"); btn.disabled = true; btn.textContent = "바꾸는 중…"; perr("");
    sb.rpc("student_change_pin", { tok: ST.studentId, old_pin: o, new_pin: n }).then(function (r) {
      btn.disabled = false; btn.textContent = "바꾸기";
      if (r.error) {
        var m = r.error.message || "";
        if (m.indexOf("BADPIN") >= 0) return perr("지금 비밀번호가 맞지 않습니다.");
        if (m.indexOf("SHORTPIN") >= 0) return perr("새 비밀번호는 네 자리 이상입니다.");
        return perr("바꾸지 못했습니다: " + m);
      }
      $("#pok").textContent = "비밀번호를 바꿨습니다.";
      setTimeout(function () { box.innerHTML = ""; }, 1200);
    });
  });
}

function studentHistory() {
  render('<div class="card"><div class="empty">내가 보낸 것을 찾는 중…</div></div>');
  sb.rpc("student_history", { tok: ST.studentId })
    .then(function (r) {
      return signPaths((r.data || []).map(function (x) { return x.image_path; })).then(function () { return r; });
    })
    .then(function (r) {
    var rows = r.data || [];
    var url = signed;
    render(
      '<div class="between"><button class="btn-s" id="back">← 과제 목록</button>' +
        '<span class="m">' + esc(ST.student) + '</span></div>' +
      '<div class="card"><h2>내가 보낸 것 <span class="num">' + rows.length + '</span></h2>' +
      '<p class="hint">선생님께 보낸 결과입니다. 눌러서 다시 볼 수 있습니다.</p>' +
      (rows.length
        ? groupByDay(rows).map(function (g) {
            return '<div class="dayhead">' + esc(g.label) + '<b>' + g.rows.length + '건</b></div>' +
              g.rows.map(function (h) {
                var kind = h.image_path ? "사진" : h.html_len ? "HTML" : h.has_payload ? "기록" : "";
                return '<div class="item"><span class="num">' + esc(kind) + '</span>' +
                  '<div class="grow"><div class="t">' + esc(h.app_title || "과제") +
                  (h.reviewed_at ? '<span class="modetag" style="background:#1D9E75">확인함</span>' : '') + '</div>' +
                  (h.note ? '<div class="m">' + esc(h.note) + '</div>' : '') +
                  (h.feedback ? '<div class="note">선생님: ' + esc(h.feedback) + '</div>' : '') + '</div>' +
                  '<div class="m">' + hm(h.created_at) + '</div>' +
                  '<button class="btn-s hopen" data-id="' + h.id + '" data-p="' + esc(h.image_path || "") + '">다시 보기</button></div>';
              }).join("");
          }).join("")
        : '<div class="empty">아직 보낸 것이 없습니다.<br>과제를 열고 결과를 보내 보세요.</div>') +
      '</div><div id="modal"></div>');

    on("#back", "click", studentApps);
    app.querySelectorAll(".hopen").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.p) {
          $("#modal").innerHTML =
            '<div class="modal"><div class="mbox"><p>내가 보낸 사진</p>' +
            '<img src="' + esc(url(b.dataset.p)) + '" alt="내가 보낸 결과">' +
            '<div style="margin-top:12px"><button class="btn-p" id="close">닫기</button></div></div></div>';
          on("#close", "click", function () { $("#modal").innerHTML = ""; });
          return;
        }
        sb.rpc("student_submission", { tok: ST.studentId, sub: b.dataset.id }).then(function (rr) {
          var d = (rr.data || [])[0];
          if (!d) return;
          var body = d.html ? d.html
            : '<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;padding:16px">' +
              esc(JSON.stringify(d.payload, null, 2)) + '</pre>';
          $("#modal").innerHTML =
            '<div class="modal"><div class="mbox"><p>' + esc(d.app_title || "과제") + '</p>' +
            '<div id="holder"></div><div style="margin-top:12px">' +
            '<button class="btn-p" id="close">닫기</button></div></div></div>';
          mountFrame("#holder", body, d.app_title || "제출물");
          on("#close", "click", function () { $("#modal").innerHTML = ""; });
        });
      });
    });
  });
}

function studentOpen(id) {
  sb.rpc("app_html", { p_id: id, p_code: ST.space.code }).then(function (r) {
    var a = (r.data || [])[0];
    if (!a) return;
    render(
      '<div class="between"><button class="btn-s" id="back">← 과제 목록</button>' +
        '<span class="t">' + esc(a.title) + '</span>' +
        '<button class="btn-s" id="full">전체 화면</button></div>' +
      (function () {
        var cur = (ST.apps || []).filter(function (x) { return x.id === a.id; })[0];
        return cur && cur.note ? '<div class="banner">' + esc(cur.note) + '</div>' : '';
      })() +
      '<div id="holder"></div>' +
      (ST.studentId && ST.space.submit_locked
        ? '<div class="banner" style="margin-top:14px">지금은 제출을 받지 않는 기간입니다. 선생님께 문의하세요.</div>' : '') +
      '<div class="card" style="margin-top:14px"' +
        (ST.studentId && !ST.space.submit_locked ? '' : ' hidden') + '>' +
        '<button class="btn-g toggle" id="toggle">선생님께 결과 보내기<span id="arrow">▼ 열기</span></button>' +
        '<div id="send" style="display:none;margin-top:16px">' +
          '<p class="hint">완성한 화면을 캡처해서 올리세요. 휴대폰은 화면 캡처, 컴퓨터는 캡처 후 붙여넣기가 편합니다.</p>' +
          '<div class="drop" id="drop">캡처 이미지를 여기에 붙여넣기(Ctrl+V)하거나 끌어다 놓으세요' +
            '<div style="margin-top:12px"><button class="btn-s" id="pick">사진 고르기</button></div></div>' +
          '<input type="file" id="file" accept="image/*" style="display:none">' +
          '<div class="sendsec"><h3>HTML 코드 또는 파일로 보내기</h3>' +
            '<p class="hint">과제에서 내려받은 HTML 파일, 직접 만든 HTML, 그 밖의 파일(PDF·문서·그림 등)을 보낼 수 있습니다. ' +
            'HTML 은 선생님이 작동하는 화면 그대로 보고, 다른 파일은 받아서 엽니다.</p>' +
            '<div class="row" style="margin-bottom:12px"><button class="btn-s" id="pickHtml">파일 고르기</button>' +
            '<span class="m" id="htmlName"></span></div>' +
            '<input type="file" id="htmlFile" style="display:none">' +
            '<button class="btn-s toggle" id="pasteToggle" style="width:100%;margin-bottom:12px">' +
              'HTML 코드 붙여넣기<span id="pasteArrow">▼ 열기</span></button>' +
            '<div id="pasteBox" style="display:none;margin-bottom:12px">' +
              '<p class="hint">과제 화면에서 코드를 복사했거나 직접 쓴 코드가 있으면 여기에 붙여넣으세요.</p>' +
              '<textarea id="htmlPaste" placeholder="<!DOCTYPE html> …"></textarea>' +
              '<button class="btn-g" id="sendPaste">붙여넣은 코드 보내기</button></div></div>' +
          '<label>한마디 (선택)</label>' +
          '<input type="text" id="note" placeholder="예: 두 번째 문제가 헷갈렸어요">' +
          '<div class="err" id="err"></div><div class="ok" id="ok"></div></div></div>');
    mountFrame("#holder", a.html, a.title);
    on("#back", "click", studentApps);
    on("#full", "click", function () {
      var fr = app.querySelector("#holder iframe");
      if (!fr) return;
      if (fr.requestFullscreen) fr.requestFullscreen();
      else if (fr.webkitRequestFullscreen) fr.webkitRequestFullscreen();
      else fr.scrollIntoView({ block: "start" });
    });
    on("#toggle", "click", function () {
      var box = $("#send"), open = box.style.display === "none";
      box.style.display = open ? "block" : "none";
      $("#arrow").textContent = open ? "▲ 접기" : "▼ 열기";
      if (open) box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    wirePicker(function (file) { sendResult(file, a); });
    wireHtmlSend(a);
    listenTaskSubmit(a);
  });
}

/* ── HTML 제출 (추가) ─────────────────────────────────────── */
var HTML_MAX = 500000;   /* 약 500KB. Supabase 의 check 제약과 같이 맞춥니다 */

function wireHtmlSend(appRow) {
  var btn = $("#pickHtml"), input = $("#htmlFile");
  if (!btn) return;
  btn.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () {
    var f = input.files[0]; input.value = "";
    if (!f) return;
    if (/\.html?$/i.test(f.name) || f.type === "text/html") {
      var r = new FileReader();
      r.onload = function () { $("#htmlName").textContent = f.name; sendHtml(String(r.result), null, appRow, btn); };
      r.onerror = function () { setErr("파일을 읽지 못했습니다."); };
      r.readAsText(f, "utf-8");
      return;
    }
    $("#htmlName").textContent = f.name;
    sendFile(f, appRow, btn);
  });
  on("#pasteToggle", "click", function () {
    var box = $("#pasteBox"), open = box.style.display === "none";
    box.style.display = open ? "block" : "none";
    $("#pasteArrow").textContent = open ? "▲ 접기" : "▼ 열기";
    if (open) $("#htmlPaste").focus();
  });
  on("#sendPaste", "click", function (e) {
    sendHtml($("#htmlPaste").value, null, appRow, e.target);
  });
}

function sendHtml(html, payload, appRow, btn) {
  var ok = $("#ok");
  html = html == null ? null : String(html);
  setErr(""); if (ok) ok.textContent = "";
  if (html !== null && !html.trim()) { setErr("보낼 HTML 이 비어 있습니다."); return Promise.resolve(false); }
  if (html !== null && html.length > HTML_MAX) {
    setErr("HTML 이 너무 큽니다(" + Math.round(html.length / 1000) + "KB). 이미지는 줄이거나 빼고 다시 보내세요.");
    return Promise.resolve(false);
  }
  var old = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "보내는 중…"; }
  return sb.from("submissions").insert({
    space_code: ST.space.code, app_id: appRow.id, app_title: appRow.title,
    student_name: ST.student, student_id: ST.studentId || null,
    image_path: null, html: html, payload: payload || null,
    note: ($("#note") && $("#note").value.trim()) || null
  }).then(function (res) {
    if (btn) { btn.disabled = false; btn.textContent = old; }
    if (res.error) { setErr("보내지 못했습니다: " + res.error.message); return false; }
    if (ok) ok.textContent = "선생님께 보냈습니다.";
    if ($("#note")) $("#note").value = "";
    if ($("#htmlPaste")) $("#htmlPaste").value = "";
    return true;
  });
}

/* 과제 HTML 안에서 parent.postMessage({ type: "mathtaskSubmit", html, data }, "*") 로 보내면 받습니다 */
function listenTaskSubmit(appRow) {
  if (ST.msgFn) window.removeEventListener("message", ST.msgFn);
  ST.msgFn = function (e) {
    var fr = app.querySelector("#holder iframe");
    if (!fr || e.source !== fr.contentWindow) return;          /* 지금 열린 과제에서 온 것만 */
    var d = e.data;
    if (!d || d.type !== "mathtaskSubmit") return;
    var reply = function (r) { try { fr.contentWindow.postMessage({ type: "mathtaskSubmitResult", ok: r }, "*"); } catch (x) { } };
    if (!ST.studentId) return reply(false);                     /* 공개용 공간은 제출을 받지 않습니다 */
    if (!confirm("과제 결과를 선생님께 보낼까요?")) return reply(false);
    var html = typeof d.html === "string" ? d.html : null;
    var payload = null;
    if (d.data !== undefined) {
      try { payload = JSON.parse(JSON.stringify(d.data)); } catch (x) { payload = null; }
      if (payload && JSON.stringify(payload).length > HTML_MAX) { setErr("보낼 자료가 너무 큽니다."); return reply(false); }
    }
    if (html === null && payload === null) return reply(false);
    sendHtml(html, payload, appRow, null).then(reply);
  };
  window.addEventListener("message", ST.msgFn);
}

/* 그림·문서 등 파일 그대로 보내기 */
function sendFile(file, appRow, btn) {
  var ok = $("#ok"), old = btn ? btn.textContent : "";
  setErr(""); if (ok) ok.textContent = "";
  if (file.size > 12 * 1024 * 1024) return setErr("파일이 너무 큽니다. 12MB 이하로 보내 주세요.");
  if (btn) { btn.disabled = true; btn.textContent = "보내는 중…"; }
  var ext = (file.name.match(/\.[A-Za-z0-9]+$/) || [""])[0];
  var path = ST.space.code + "/" +
    (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)) + ext;

  sb.storage.from("submissions").upload(path, file, { contentType: file.type || "application/octet-stream" })
    .then(function (up) {
      if (up.error) throw new Error(up.error.message);
      return sb.from("submissions").insert({
        space_code: ST.space.code, app_id: appRow.id, app_title: appRow.title,
        student_name: ST.student, student_id: ST.studentId || null,
        image_path: path, file_name: file.name,
        note: ($("#note") && $("#note").value.trim()) || null
      });
    }).then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = old; }
      if (res && res.error) return setErr("보내지 못했습니다: " + res.error.message);
      if (ok) ok.textContent = "선생님께 보냈습니다.";
      if ($("#note")) $("#note").value = "";
    }).catch(function (e) {
      if (btn) { btn.disabled = false; btn.textContent = old; }
      setErr(e.message || "보내지 못했습니다. 다시 시도하세요.");
    });
}

function sendResult(file, appRow) {
  var pick = $("#pick"), ok = $("#ok");
  pick.disabled = true; pick.textContent = "보내는 중…"; setErr(""); ok.textContent = "";
  compress(file).then(function (blob) {
    var path = ST.space.code + "/" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)) + ".jpg";
    return sb.storage.from("submissions").upload(path, blob, { contentType: "image/jpeg" })
      .then(function (up) {
        if (up.error) throw new Error(up.error.message);
        return sb.from("submissions").insert({
          space_code: ST.space.code, app_id: appRow.id, app_title: appRow.title,
          student_name: ST.student, student_id: ST.studentId || null,
          image_path: path, note: $("#note").value.trim() || null
        });
      });
  }).then(function (res) {
    pick.disabled = false; pick.textContent = "사진 고르기";
    if (res && res.error) return setErr("보내지 못했습니다: " + res.error.message);
    ok.textContent = "선생님께 보냈습니다.";
    $("#note").value = "";
  }).catch(function (e) {
    pick.disabled = false; pick.textContent = "사진 고르기";
    setErr(e.message || "보내지 못했습니다. 다시 시도하세요.");
  });
}

boot();
