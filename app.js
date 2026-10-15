/* 成人专升本刷题 · 纯前端 PWA
   数据：questions.json  |  存储：localStorage
   题型：single 单选 / multiple 多选 / judge 判断 / fill 填空 / essay 主观题 */
(function () {
  "use strict";

  var STORE_KEY = "ckb_app_v1";
  var TYPE_LABEL = { single: "单选", multiple: "多选", judge: "判断", fill: "填空", essay: "主观" };

  /* ---------------- 状态 ---------------- */
  var DB = { answered: {}, wrong: [], fav: [], progress: {}, words: [] };
  var QUESTIONS = [];
  var SUBJECTS = [];
  var curSubj = "全部";
  var session = { list: [], idx: 0, key: "", mode: "", selected: [], submitted: false };
  var wordEditIdx = -1;        // 生词编辑：-1=新增，>=0=编辑已有
  var wordSrc = "", wordNo = 0; // 待保存生词的来源（章节 + 题号）

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) DB = Object.assign(DB, JSON.parse(raw));
    } catch (e) { console.warn("读取本地数据失败", e); }
    if (!Array.isArray(DB.words)) DB.words = [];   // 旧数据无 words 字段时的兼容
  }
  function saveStore() { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* 文本渲染：转义 HTML + 把 $...$ 渲染成数学公式（KaTeX） */
  function md(s) {
    var parts = String(s == null ? "" : s).split(/(\$[^$]+?\$)/g);
    return parts.map(function (p) {
      if (p.length > 2 && p.charAt(0) === "$" && p.charAt(p.length - 1) === "$") {
        var tex = p.slice(1, -1);
        if (window.katex) {
          try {
            return katex.renderToString(tex, { throwOnError: false, display: false });
          } catch (e) { /* 退回原文本 */ }
        }
        return esc(tex);
      }
      return esc(p).replace(/\n/g, "<br>");
    }).join("");
  }

  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("show"); }, 1600);
  }
  function showView(name) {
    ["home", "chapter", "quiz", "done", "words"].forEach(function (v) {
      $("view-" + v).classList.toggle("hidden", v !== name);
    });
    window.scrollTo(0, 0);
  }

  /* ---------------- 题库加载 ---------------- */
  fetch("questions.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      QUESTIONS = (Array.isArray(data) ? data : []).filter(function (q) { return q && q.id && q.question; });
      QUESTIONS.forEach(function (q, i) {
        if (!q.subject) q.subject = "政治";
        if (!q.chapter) q.chapter = "默认章节";
        if (!q.type) q.type = "single";
        q._i = i;
      });
      SUBJECTS = [];
      var seen = {};
      QUESTIONS.forEach(function (q) { if (!seen[q.subject]) { seen[q.subject] = 1; SUBJECTS.push(q.subject); } });
      loadStore();
      renderSubjTabs();
      renderHome();
    })
    .catch(function (e) {
      document.body.innerHTML = '<p style="padding:40px;text-align:center">题库加载失败：' + e.message +
        '<br><br>请确认 questions.json 与 index.html 在同一目录，并通过 http 服务打开（不要直接双击 file://）。</p>';
    });

  function pool() {
    return curSubj === "全部" ? QUESTIONS : QUESTIONS.filter(function (q) { return q.subject === curSubj; });
  }
  function renderSubjTabs() {
    var tabs = ["全部"].concat(SUBJECTS);
    $("subj-tabs").innerHTML = tabs.map(function (s) {
      var n = s === "全部" ? QUESTIONS.length : QUESTIONS.filter(function (q) { return q.subject === s; }).length;
      return '<button class="stab' + (s === curSubj ? " on" : "") + '" data-subj="' + esc(s) + '">' +
        esc(s) + '<i>' + n + '</i></button>';
    }).join("");
    $("subj-tabs").querySelectorAll(".stab").forEach(function (b) {
      b.onclick = function () { curSubj = b.dataset.subj; renderSubjTabs(); renderHome(); };
    });
  }

  /* ---------------- 首页 ---------------- */
  function stats() {
    var ids = {};
    pool().forEach(function (q) { ids[q.id] = 1; });
    var keys = Object.keys(DB.answered).filter(function (k) { return ids[k]; });
    var right = keys.filter(function (k) { return DB.answered[k].last === true; }).length;
    return {
      total: pool().length,
      answered: keys.length,
      right: right,
      acc: keys.length ? Math.round(right / keys.length * 100) : 0,
      wrong: DB.wrong.filter(function (id) { return ids[id]; }).length,
      fav: DB.fav.filter(function (id) { return ids[id]; }).length,
      words: DB.words.length,
      essay: pool().filter(function (q) { return q.type === "essay"; }).length
    };
  }
  function renderHome() {
    var s = stats();
    $("st-total").textContent = s.total;
    $("st-done").textContent = s.answered;
    $("st-acc").textContent = s.acc + "%";
    $("st-wrong").textContent = s.wrong;
    $("st-fav").textContent = s.fav;
    $("st-src").textContent = s.total;
    $("m-wrong").textContent = s.wrong ? s.wrong + " 道待攻克" : "暂无错题";
    $("m-words").textContent = s.words ? s.words + " 个生词" : "暂无生词";
    $("m-fav").textContent = s.fav ? s.fav + " 道已收藏" : "暂无收藏";
    $("m-essay").textContent = s.essay ? s.essay + " 道 · 未掌握自动入错题本" : "本科目暂无主观题";
    showView("home");
  }

  /* ---------------- 练习入口 ---------------- */
  document.querySelectorAll(".menu-item").forEach(function (btn) {
    btn.onclick = function () {
      var act = btn.dataset.act;
      var ids = pool().map(function (q) { return q.id; });
      if (act === "chapter") { renderChapters(); return; }
      if (act === "words") { renderWords(); return; }
      if (act === "essay") {
        var eids = pool().filter(function (q) { return q.type === "essay"; }).map(function (q) { return q.id; });
        startSession(eids, "essay:" + curSubj, (curSubj === "全部" ? "" : curSubj + " ") + "主观题专练");
        return;
      }
      if (act === "wrong") {
        startSession(DB.wrong.filter(function (id) { return ids.indexOf(id) >= 0; }), "wrong:" + curSubj, "错题重刷");
        return;
      }
      if (act === "fav") {
        startSession(DB.fav.filter(function (id) { return ids.indexOf(id) >= 0; }), "fav:" + curSubj, "收藏题");
        return;
      }
      if (act === "order") { startSession(ids, "order:" + curSubj, "顺序练习"); return; }
      if (act === "random") {
        var arr = ids.slice();
        for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
        startSession(arr, "random:" + curSubj, "随机练习");
      }
    };
  });

  function renderChapters() {
    var map = {}, order = [];
    pool().forEach(function (q) {
      if (!map[q.chapter]) { map[q.chapter] = []; order.push(q.chapter); }
      map[q.chapter].push(q.id);
    });
    $("chapter-list").innerHTML = order.map(function (ch) {
      return '<button class="chapter-item" data-ch="' + esc(ch) + '"><b>' + esc(ch) +
        '</b><span>' + map[ch].length + ' 题</span></button>';
    }).join("") || '<p style="padding:20px;color:#8a8f99">暂无章节</p>';
    $("chapter-list").querySelectorAll(".chapter-item").forEach(function (b) {
      b.onclick = function () { startSession(map[b.dataset.ch], "chapter:" + b.dataset.ch, b.dataset.ch); };
    });
    showView("chapter");
  }

  /* ---------------- 会话 ---------------- */
  function startSession(ids, mode, title) {
    if (!ids.length) { toast("这里还没有题目"); return; }
    // 随机 / 错题重刷 / 收藏题：每次都从当前列表第 1 题开始；
    // 顺序练习 / 按章节练习：沿用原来的断点续刷（读 DB.progress）
    var head = String(mode).split(":")[0];
    var noResume = head === "random" || head === "wrong" || head === "fav";
    session = {
      list: ids.filter(function (id) { return byId(id); }),
      idx: noResume ? 0 : (DB.progress[mode] || 0),
      key: mode, mode: mode, title: title,
      selected: [], submitted: false
    };
    if (session.idx >= session.list.length) session.idx = 0;
    renderQuestion();
    showView("quiz");
  }
  function byId(id) { return QUESTIONS.filter(function (q) { return q.id === id; })[0]; }

  function renderQuestion() {
    var q = byId(session.list[session.idx]);
    if (!q) { finishSession(); return; }
    session.selected = [];
    session.submitted = false;
    session.essayRecorded = false;   // 本轮主观题是否已写入记录
    session.essayTouched = false;    // 本轮主观题是否被操作过（看答案/自评）
    var rec = DB.answered[q.id];

    $("q-meta").textContent = (session.idx + 1) + "【" + (TYPE_LABEL[q.type] || q.type) + "】";
    $("q-pos").textContent = (session.idx + 1) + "/" + session.list.length;
    $("q-source").textContent = (q.subject ? q.subject + " · " : "") + (q.chapter || "");
    $("q-text").innerHTML = md(q.question);
    $("btn-fav").classList.toggle("on", DB.fav.indexOf(q.id) >= 0);
    $("btn-fav").textContent = DB.fav.indexOf(q.id) >= 0 ? "★" : "☆";
    $("q-progress").style.width = ((session.idx + 1) / session.list.length * 100) + "%";

    // 原文（阅读 / 完形 / 对话）
    if (q.passage) {
      $("q-passage").classList.remove("hidden");
      $("psg-body").innerHTML = md(q.passage);
      $("psg-body").classList.add("hidden");
      $("btn-psg").textContent = "📄 显示原文";
    } else {
      $("q-passage").classList.add("hidden");
    }

    // 选项 / 填空 / 主观
    var isFill = q.type === "fill", isEssay = q.type === "essay";
    $("q-options").classList.toggle("hidden", isFill || isEssay);
    $("q-fill").classList.toggle("hidden", !isFill);
    $("q-essay").classList.toggle("hidden", !isEssay);

    if (!isFill && !isEssay) {
      $("q-options").innerHTML = (q.options || []).map(function (o) {
        return '<div class="opt" data-k="' + esc(o.key) + '"><span class="key">' + esc(o.key) +
          '</span><span class="txt">' + md(o.text) + "</span></div>";
      }).join("");
      $("q-options").querySelectorAll(".opt").forEach(function (el) {
        el.onclick = function () {
          if (session.submitted) return;
          var k = el.dataset.k;
          if (q.type === "multiple") {
            var i = session.selected.indexOf(k);
            if (i >= 0) session.selected.splice(i, 1); else session.selected.push(k);
          } else {
            session.selected = [k];
          }
          syncSelection();
        };
      });
    }
    if (isFill) { $("fill-input").value = ""; $("fill-input").disabled = false; }
    if (isEssay) { $("essay-input").value = ""; }

    $("q-result").classList.add("hidden");
    $("q-self").classList.add("hidden");
    $("btn-submit").classList.remove("hidden");
    $("btn-submit").disabled = false;
    $("btn-submit").textContent = isEssay ? "查看参考答案"
      : (rec && rec.count > 0 ? "检查答案看解析（已答过）" : "检查答案看解析");
    $("btn-prev").disabled = session.idx === 0;
    $("btn-next").textContent = session.idx === session.list.length - 1 ? "完成" : "下一题";
    $("btn-remove-wrong").classList.add("hidden");
    window.scrollTo(0, 0);
  }
  function syncSelection() {
    document.querySelectorAll("#q-options .opt").forEach(function (el) {
      el.classList.toggle("selected", session.selected.indexOf(el.dataset.k) >= 0);
    });
  }
  $("btn-psg").onclick = function () {
    var b = $("psg-body");
    b.classList.toggle("hidden");
    $("btn-psg").textContent = b.classList.contains("hidden") ? "📄 显示原文" : "📄 收起原文";
  };

  /* 答案等价归一化（填空判分用） */
  function normAns(s) {
    var t = String(s == null ? "" : s).toLowerCase();
    t = t.replace(/\$/g, "")
      .replace(/\\left|\\right|\\!|\\,|\\;/g, "")
      .replace(/\\dfrac|\\tfrac|\\frac/g, "\\frac")
      .replace(/\\sqrt\[3\]\{([^{}]*)\}/g, "cbrt($1)")
      .replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)")
      .replace(/\\(ln|sin|cos|tan|arctan|arcsin|arccos|log|pi|lim)\b/g, "$1");
    for (var i = 0; i < 3; i++) {          // \frac{a}{b} -> a/b
      t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2");
    }
    return t.replace(/\\/g, "")
      .replace(/\s+/g, "")
      .replace(/[{}]/g, "")
      .replace(/[（）]/g, "()")
      .replace(/，/g, ",").replace(/[－—–]/g, "-")
      .replace(/²/g, "^2").replace(/³/g, "^3")
      .replace(/[×✕]/g, "*").replace(/π/g, "pi")
      .replace(/。$/, "");
  }

  /* ---------------- 提交判题 ---------------- */
  $("btn-submit").onclick = function () {
    var q = byId(session.list[session.idx]);
    if (!q) return;

    if (q.type === "essay") {          // 主观题：直接看参考答案 + 自评
      session.submitted = true;
      session.essayTouched = true;
      showResult(q, null, true);
      $("rb-answer").innerHTML = '<span class="essay-tip">看完参考答案后请用下方按钮自评：' +
        '选「会了」记为掌握；选「没答好」或<b>直接翻到下一题（不选）</b>，都会按「未掌握」自动记入错题本。</span>';
      $("q-self").classList.remove("hidden");
      $("btn-submit").classList.add("hidden");
      return;
    }

    var correct;
    if (q.type === "fill") {
      var val = $("fill-input").value.trim();
      if (!val) { toast("请先填写答案"); return; }
      session.selected = [val];
      correct = (q.answer || []).some(function (a) { return normAns(a) === normAns(val); });
      $("fill-input").disabled = true;
    } else {
      if (!session.selected.length) { toast("请先选择答案"); return; }
      correct = sameSet(session.selected, q.answer || []);
      document.querySelectorAll("#q-options .opt").forEach(function (el) {
        el.classList.add("locked");
        var k = el.dataset.k;
        if ((q.answer || []).indexOf(k) >= 0) { el.classList.add("right"); el.classList.remove("selected"); }
        else if (session.selected.indexOf(k) >= 0) { el.classList.add("wrong"); el.classList.remove("selected"); }
      });
    }
    session.submitted = true;
    record(q, correct);
    showResult(q, correct, false);
    $("btn-submit").classList.add("hidden");
  };

  function record(q, correct) {
    var rec = DB.answered[q.id] || { count: 0, right: 0, last: null };
    rec.count++; if (correct) rec.right++;
    rec.last = correct;
    DB.answered[q.id] = rec;
    // 错题重刷模式：客观题答对 → 立即移出错题本（list 为快照，不动 session.list，故不跳题）
    // 其余情况：答错首次自动加入错题本；答对只更新记录，历史错题保留，需手动移出
    var inWrongMode = String(session.mode || "").indexOf("wrong:") === 0;
    var objective = q.type === "single" || q.type === "multiple" || q.type === "judge";
    var wi = DB.wrong.indexOf(q.id);
    if (inWrongMode && objective && correct) {
      if (wi >= 0) { DB.wrong.splice(wi, 1); toast("✓ 已掌握，本题已移出错题本"); }
    } else if (!correct && wi < 0) {
      DB.wrong.push(q.id);
    }
    DB.progress[session.key] = session.idx;
    saveStore();
  }

  /* 主观题兜底：离开本题时若还没自评，按「未掌握」自动记入错题本 */
  function commitPendingEssay() {
    if ($("view-quiz").classList.contains("hidden")) return;
    if (session.essayRecorded) return;
    var q = byId(session.list[session.idx]);
    if (!q || q.type !== "essay") return;
    // 既没输入答案、也没查看参考答案 → 视为未做过，不记入错题本
    if (!session.essayTouched && !$("essay-input").value.trim()) return;
    record(q, false);
    session.essayRecorded = true;
    toast(session.essayTouched ? "主观题未自评，已按「未掌握」记入错题本" : "主观题已作答未自评，已记入错题本");
  }

  function showResult(q, correct, isEssay) {
    var box = $("q-result");
    box.classList.remove("hidden");
    $("rb-head").className = "rb-head " + (isEssay ? "info" : (correct ? "ok" : "bad"));
    $("rb-head").textContent = isEssay ? "参考答案" : (correct ? "✓ 回答正确" : "✗ 回答错误");

    if (isEssay) {
      $("rb-answer").innerHTML = "";
    } else if (q.type === "fill") {
      var disp = q.display || (q.answer || [])[0] || "";
      $("rb-answer").innerHTML = "正确答案：<b>" + md(disp) + "</b>" +
        (correct ? "" : "　你的答案：<span style='color:var(--red)'>" + esc(session.selected[0]) + "</span>");
    } else {
      var ansText = (q.answer || []).map(function (k) {
        var o = (q.options || []).filter(function (x) { return x.key === k; })[0];
        return k + (o ? ". " + o.text : "");
      }).join("　");
      $("rb-answer").innerHTML = "正确答案：<b>" + esc(ansText) + "</b>" +
        (correct ? "" : "　你选了：<span style='color:var(--red)'>" + esc(session.selected.join("、")) + "</span>");
    }
    $("rb-explain").innerHTML = md(q.explanation || "（本题暂无解析）");
    // 主观题：自评按钮放在完整参考答案（答案 + 解析）之后
    var selfRow = $("q-self");
    if (selfRow.parentNode === box) box.appendChild(selfRow);
    // 客观题：答案与长篇解析之间放「加入 / 移出错题本」按钮；主观题沿用自评按钮
    var wrongBtn = $("btn-remove-wrong");
    if (isEssay) {
      wrongBtn.classList.add("hidden");
    } else {
      wrongBtn.classList.remove("hidden");
      refreshWrongBtn(q);
      box.insertBefore(wrongBtn, box.querySelector(".rb-exp"));
    }
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* 主观题自评 */
  document.querySelectorAll("#q-self [data-self]").forEach(function (b) {
    b.onclick = function () {
      var q = byId(session.list[session.idx]);
      if (!q) return;
      var ok = b.dataset.self === "1";
      record(q, ok);
      // 自评「会了」= 已掌握，与「移出错题本」按钮同义，显式移出
      if (ok) {
        var wi = DB.wrong.indexOf(q.id);
        if (wi >= 0) { DB.wrong.splice(wi, 1); saveStore(); }
      }
      session.essayRecorded = true;
      session.essayTouched = true;
      $("q-self").classList.add("hidden");
      $("rb-answer").innerHTML = ok
        ? '<span class="essay-tip">已记为 <b style="color:var(--green)">掌握</b>，未记入错题本。</span>'
        : '<span class="essay-tip">已记为 <b>未掌握</b>，已加入错题本，可去「错题本」反复背。</span>';
      toast(ok ? "已记为掌握" : "已加入错题本");
    };
  });

  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    return a.slice().sort().join(",") === b.slice().sort().join(",");
  }

  function refreshWrongBtn(q) {
    var inWrong = DB.wrong.indexOf(q.id) >= 0;
    $("btn-remove-wrong").textContent = inWrong ? "✓ 已掌握，移出错题本" : "＋ 标记不会，加入错题本";
  }

  $("btn-remove-wrong").onclick = function () {
    var id = session.list[session.idx];
    var q = byId(id);
    if (!q) return;
    var i = DB.wrong.indexOf(id);
    if (i >= 0) { DB.wrong.splice(i, 1); toast("已移出错题本"); }
    else { DB.wrong.push(id); toast("已加入错题本"); }
    saveStore();
    refreshWrongBtn(q);   // 不调用 renderHome()，操作后停留在当前题
  };

  /* ---------------- 导航 ---------------- */
  $("btn-prev").onclick = function () {
    if (session.idx > 0) { commitPendingEssay(); session.idx--; DB.progress[session.key] = session.idx; saveStore(); renderQuestion(); }
  };
  $("btn-next").onclick = function () {
    if (session.idx < session.list.length - 1) {
      commitPendingEssay();
      session.idx++; DB.progress[session.key] = session.idx; saveStore(); renderQuestion();
    } else {
      commitPendingEssay();
      DB.progress[session.key] = 0; saveStore(); finishSession();
    }
  };
  function finishSession() {
    var s = stats();
    $("done-text").textContent = "本次练习结束 · 累计正确率 " + s.acc + "% · 错题 " + s.wrong + " 道";
    showView("done");
  }
  $("btn-done-home").onclick = function () { renderHome(); };
  $("btn-done-retry").onclick = function () { startSession(session.list.slice(), session.key, session.title || "练习"); };
  document.querySelectorAll("[data-back]").forEach(function (b) { b.onclick = function () { commitPendingEssay(); renderHome(); }; });

  /* ---------------- 收藏 ---------------- */
  $("btn-fav").onclick = function () {
    var id = session.list[session.idx];
    var i = DB.fav.indexOf(id);
    if (i >= 0) { DB.fav.splice(i, 1); toast("已取消收藏"); }
    else { DB.fav.push(id); toast("已收藏"); }
    saveStore();
    $("btn-fav").classList.toggle("on", DB.fav.indexOf(id) >= 0);
    $("btn-fav").textContent = DB.fav.indexOf(id) >= 0 ? "★" : "☆";
  };

  /* ---------------- 生词本 ---------------- */
  function normWord(w) { return String(w == null ? "" : w).trim().toLowerCase(); }
  function wordIndex(w) {
    var k = normWord(w);
    for (var i = 0; i < DB.words.length; i++) { if (normWord(DB.words[i].w) === k) return i; }
    return -1;
  }
  function srcLabel(w) {
    var s = w.src || "";
    if (!s) return "";
    return s + (w.no ? " · 第" + w.no + "题" : "");
  }
  function renderWords() {
    var list = $("word-list");
    $("words-count").textContent = DB.words.length ? DB.words.length + " 个" : "";
    if (!DB.words.length) {
      list.innerHTML = '<p class="word-empty">还没有生词。<br>做英语阅读时展开原文，长按选中单词，点「＋ 收录生词」即可。</p>';
      showView("words"); return;
    }
    list.innerHTML = DB.words.map(function (w, i) { return i; }).reverse().map(function (i) {
      var w = DB.words[i];
      return '<div class="word-item"><div class="wi-main">' +
        '<div class="wi-word">' + esc(w.w) + (w.def ? '<span class="wi-def">' + esc(w.def) + '</span>' : '') + '</div>' +
        (w.note ? '<div class="wi-note">' + esc(w.note) + '</div>' : '') +
        (srcLabel(w) ? '<div class="wi-src">' + esc(srcLabel(w)) + '</div>' : '') +
        '</div><div class="wi-ops">' +
        '<button class="btn edit" data-wedit="' + i + '">编辑</button>' +
        '<button class="btn del" data-wdel="' + i + '">删除</button>' +
        '</div></div>';
    }).join("");
    list.querySelectorAll("[data-wedit]").forEach(function (b) {
      b.onclick = function () { openWordSheet({ index: Number(b.dataset.wedit) }); };
    });
    list.querySelectorAll("[data-wdel]").forEach(function (b) {
      b.onclick = function () {
        var i = Number(b.dataset.wdel), w = DB.words[i];
        if (!w) return;
        if (!confirm('删除生词「' + w.w + '」？')) return;
        DB.words.splice(i, 1); saveStore(); renderWords(); toast("已删除");
      };
    });
    showView("words");
  }
  function openWordSheet(opts) {
    opts = opts || {};
    wordEditIdx = typeof opts.index === "number" ? opts.index : -1;
    var w = wordEditIdx >= 0 ? DB.words[wordEditIdx] : null;
    $("ws-title").textContent = w ? "编辑生词" : "收录生词";
    $("ws-word").value = w ? w.w : (opts.word || "");
    $("ws-def").value = w ? (w.def || "") : "";
    $("ws-note").value = w ? (w.note || "") : "";
    $("ws-src").textContent = "来源：" + (w ? (srcLabel(w) || "手动添加")
      : (wordSrc ? srcLabel({ src: wordSrc, no: wordNo }) : "手动添加"));
    $("word-sheet").classList.remove("hidden");
    setTimeout(function () { $("ws-word").focus(); }, 60);
  }
  function closeWordSheet() { $("word-sheet").classList.add("hidden"); wordEditIdx = -1; }
  function saveWord() {
    var w = $("ws-word").value.trim();
    var def = $("ws-def").value.trim();
    var note = $("ws-note").value.trim();
    if (!w) { toast("请先选择或手动输入单词"); $("ws-word").focus(); return; }
    if (!/[A-Za-z]/.test(w)) { toast("请输入英文单词"); return; }
    var dup = wordIndex(w);
    if (wordEditIdx >= 0) {
      if (dup >= 0 && dup !== wordEditIdx) { toast("「" + w + "」已在生词本中"); return; }
      DB.words[wordEditIdx].w = w;
      DB.words[wordEditIdx].def = def;
      DB.words[wordEditIdx].note = note;
      saveStore(); closeWordSheet(); renderWords(); toast("已更新");
      return;
    }
    if (dup >= 0) { toast("「" + w + "」已在生词本中"); return; }   // 忽略大小写/首尾空格去重
    DB.words.push({ w: w, def: def, note: note, src: wordSrc || "", no: wordNo || 0, at: Date.now() });
    saveStore(); closeWordSheet();
    toast("已收录：" + w);
    if (!$("view-words").classList.contains("hidden")) renderWords();
  }
  $("btn-add-word").onclick = function () {
    var q = byId(session.list[session.idx]);
    wordSrc = q ? (q.chapter || "") : "";
    wordNo = session.idx + 1;
    var sel = "";
    try { sel = String(window.getSelection ? window.getSelection().toString() : ""); } catch (e) { /* 选词失败走手动输入 */ }
    var m = sel.match(/[A-Za-z][A-Za-z'\-]*/);
    openWordSheet({ word: m ? m[0] : "", index: -1 });   // 选不中时留空，手动输入
  };
  $("ws-cancel").onclick = closeWordSheet;
  $("ws-save").onclick = saveWord;
  $("word-sheet").onclick = function (e) { if (e.target === $("word-sheet")) closeWordSheet(); };

  /* ---------------- 导出 / 导入 ---------------- */
  $("btn-export").onclick = function () {
    var payload = { app: "成人专升本刷题", version: 1, exportedAt: new Date().toISOString(), data: DB };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "成考刷题数据_" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("已导出 JSON 文件");
  };
  $("btn-import").onclick = function () { $("file-import").click(); };
  $("file-import").onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var obj = JSON.parse(fr.result);
        var d = obj.data || obj;
        if (!d || typeof d !== "object") throw new Error("文件格式不正确");
        DB.answered = d.answered || {};
        DB.wrong = d.wrong || [];
        DB.fav = d.fav || [];
        DB.progress = d.progress || {};
        DB.words = Array.isArray(d.words) ? d.words : [];
        saveStore(); renderHome(); toast("导入成功");
      } catch (err) { toast("导入失败：" + err.message); }
    };
    fr.readAsText(f);
    e.target.value = "";
  };
  $("btn-clear").onclick = function () {
    if (confirm("确定清空全部答题记录、错题本、生词本和收藏？")) {
      DB = { answered: {}, wrong: [], fav: [], progress: {}, words: [] };
      saveStore(); renderHome(); toast("已清空");
    }
  };

  /* ---------------- PWA ---------------- */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function (e) { console.warn("SW 注册失败", e); });
    });
  }
})();
