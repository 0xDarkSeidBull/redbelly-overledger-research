// Report and source list behaviour. No dependencies; everything degrades to plain links without JavaScript.
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- reading progress and back to top ----------
  var bar = $(".progress span"), toTop = $(".dk-top");
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
    if (bar) bar.style.transform = "scaleX(" + p + ")";
    if (toTop) toTop.classList.toggle("show", window.scrollY > 400);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

  // ---------- "On this page": active section, sliding marker, read progress, mobile chips ----------
  var tocLinks = $$(".toc a[data-t]"), chipLinks = $$(".chips a[data-t]");
  var ids = tocLinks.map(function (a) { return a.getAttribute("data-t"); });
  var targets = ids.map(function (id) { return document.getElementById(id); });
  var ind = $(".toc-ind"), fill = $(".toc-fill"), track = $(".toc-track");
  var current = -1;
  function moveMarker(i) {
    if (!ind || !tocLinks[i] || !track) return;
    var a = tocLinks[i], tr = track.getBoundingClientRect(), r = a.getBoundingClientRect();
    ind.style.transform = "translateY(" + (r.top - tr.top + 4) + "px)";
    ind.style.height = Math.max(18, r.height - 8) + "px";
    ind.style.opacity = "1";
  }
  // ---------- chapters: the report opens on the key findings and a chapter list, and shows one chapter at a time ----------
  var chapIds = $$(".chap-card").map(function (a) { return a.getAttribute("href").slice(1); });
  var chapEls = chapIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var homeEls = [$(".hero"), $("#findings"), $(".legend-card"), $("#chapters")].filter(Boolean);
  var view = null;
  function chapterOf(el) {
    for (var n = el; n; n = n.parentNode) { if (n.id && chapIds.indexOf(n.id) !== -1) return n.id; }
    return null;
  }
  function route(first) {
    var h = decodeURIComponent(location.hash.slice(1)), el = h ? document.getElementById(h) : null;
    var next = el ? chapterOf(el) || "home" : "home";
    if (next !== view) {
      view = next;
      homeEls.forEach(function (e) { e.hidden = view !== "home"; });
      chapEls.forEach(function (e) { e.hidden = e.id !== view; e.classList.toggle("chap-view", e.id === view); });
      var shown = view === "home" ? homeEls : [document.getElementById(view)];
      shown.forEach(function (e) {
        $$(".rv", e).forEach(function (r) { r.classList.add("in"); });
        if (!first && !reduce) { e.classList.remove("view-in"); void e.offsetWidth; e.classList.add("view-in"); }
      });
      twJob++;
      if (view !== "home") typeTitle(document.getElementById(view));
    }
    var off = window.innerWidth <= 1080 ? 64 : 16;
    if (el && el.id !== view && !(view === "home" && el.id === "findings" && first)) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: "instant" });
    } else if (!first || view !== "home") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    current = -1; setActive(); onScroll();
  }
  var chapterMode = chapEls.length > 0;

  // Typewriter: when a chapter opens, its title types in behind a red block cursor.
  var twJob = 0;
  function typeTitle(sec) {
    var h = sec && $("h2", sec);
    if (!h || reduce) return;
    var full = h.getAttribute("data-full") || h.textContent;
    h.setAttribute("data-full", full); h.setAttribute("aria-label", full);
    var job = ++twJob, i = 0, txt = document.createElement("span"), caret = document.createElement("span");
    caret.className = "tw-caret"; caret.setAttribute("aria-hidden", "true");
    txt.setAttribute("aria-hidden", "true");
    h.textContent = ""; h.appendChild(txt); h.appendChild(caret);
    (function step() {
      if (job !== twJob) { h.textContent = full; return; }
      i = Math.min(full.length, i + (full.length > 40 ? 2 : 1));
      txt.textContent = full.slice(0, i);
      if (i < full.length) setTimeout(step, 28); else caret.classList.add("done");
    })();
  }

  function setActive() {
    if (!targets.length) return;
    var idx;
    if (chapterMode) {
      var key = view;
      if (view === "home") {
        var cs = document.getElementById("chapters");
        key = cs && cs.getBoundingClientRect().top <= window.innerHeight * 0.4 ? "chapters" : "findings";
      }
      idx = ids.indexOf(key);
      syncChrome(key);
    } else {
      var line = window.innerHeight * 0.32; idx = 0;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= line) idx = i; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = targets.length - 1;
      if (fill && targets[0]) {
        var first = targets[0].getBoundingClientRect().top + window.scrollY;
        var last = targets[targets.length - 1].getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
        var q = last > first ? (window.scrollY - first) / (last - first) : 0;
        fill.style.transform = "scaleY(" + Math.max(0, Math.min(1, q)) + ")";
      }
    }
    if (idx === current) return;
    current = idx;
    [tocLinks, chipLinks].forEach(function (list) {
      list.forEach(function (a, i) {
        a.classList.toggle("active", i === idx);
        if (i === idx) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    });
    moveMarker(idx);
    var chip = chipLinks[idx];
    if (chip && chip.parentNode && chip.parentNode.parentNode) {
      var box = chip.parentNode.parentNode, cr = chip.getBoundingClientRect(), br = box.getBoundingClientRect();
      if (cr.left < br.left || cr.right > br.right) box.scrollBy({ left: cr.left - br.left - 24, behavior: reduce ? "auto" : "smooth" });
    }
  }
  if (targets.length) {
    window.addEventListener("scroll", setActive, { passive: true });
    window.addEventListener("resize", function () { moveMarker(current); setActive(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveMarker(current); });
    if (!chapterMode) {
      setActive();
      tocLinks.concat(chipLinks).forEach(function (a) {
        a.addEventListener("click", function (e) {
          var t = document.getElementById(a.getAttribute("data-t"));
          if (!t) return;
          e.preventDefault();
          var off = window.innerWidth <= 1080 ? 64 : 16;
          window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - off, behavior: reduce ? "auto" : "smooth" });
          history.replaceState(null, "", "#" + t.id);
        });
      });
    }
  }
  // ---------- menu sub list and the bottom dock ----------
  var group = $(".rn-group"), tog = $(".rn-tog"), userOpen = null;
  var dock = $(".dock"), sheet = $("#sheet"), chapBtn = $(".dk-chap"), mid = $(".dk-mid"), home = $(".dk-home");
  function setOpen(open) {
    if (!group) return;
    group.classList.toggle("open", open);
    if (tog) tog.setAttribute("aria-expanded", String(open));
  }
  function syncChrome(key) {
    // The chapter list stays open while a chapter or the chapter grid is in view, unless the reader closed it.
    setOpen(userOpen !== null ? userOpen : key !== "findings");
    var ci = chapIds.indexOf(view);
    if (mid) mid.hidden = ci === -1;
    if (home) { home.hidden = ci !== -1; home.classList.toggle("on", key === "findings"); }
    if (ci !== -1) {
      $(".dk-pos").textContent = (ci + 1) + " / " + chapIds.length;
      $(".dk-prev").setAttribute("href", "#" + (ci > 0 ? chapIds[ci - 1] : "chapters"));
      var nx = $(".dk-next");
      if (ci + 1 < chapIds.length) { nx.setAttribute("href", "#" + chapIds[ci + 1]); nx.setAttribute("aria-label", "Next chapter"); }
      else { nx.setAttribute("href", "sources.html"); nx.setAttribute("aria-label", "Source list"); }
    }
    if (sheet) $$("a", sheet).forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + view); });
  }
  if (tog) tog.addEventListener("click", function () { userOpen = !group.classList.contains("open"); setOpen(userOpen); });
  function closeSheet() { if (sheet && !sheet.hidden) { sheet.hidden = true; chapBtn.setAttribute("aria-expanded", "false"); } }
  if (chapBtn && sheet) {
    chapBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = sheet.hidden;
      sheet.hidden = !open; chapBtn.setAttribute("aria-expanded", String(open));
      if (open) { var a = $("a.active", sheet) || $("a", sheet); if (a) a.focus({ preventScroll: true }); }
    });
    $$("a", sheet).forEach(function (a) { a.addEventListener("click", closeSheet); });
    document.addEventListener("click", function (e) { if (!sheet.contains(e.target) && e.target !== chapBtn) closeSheet(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) { closeSheet(); chapBtn.focus(); } });
  }

  if (chapterMode) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.addEventListener("hashchange", function () { route(false); });
    route(true);
  }

  // ---------- reveal on scroll ----------
  var rv = $$(".rv");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add("in"); });
  }

  // ---------- citation preview ----------
  var dataEl = $("#cite-data"), data = dataEl ? JSON.parse(dataEl.textContent) : null;
  var pop = null, hideTimer = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function showPop(a) {
    if (!data) return;
    clearTimeout(hideTimer);
    var n = a.getAttribute("data-n"), src = data.sources[n];
    if (!src) return;
    var facts = (a.getAttribute("data-f") || "").split(" ").filter(Boolean);
    if (!pop) {
      pop = document.createElement("div"); pop.className = "pop"; pop.setAttribute("role", "tooltip"); pop.id = "cite-pop";
      document.body.appendChild(pop);
      pop.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
      pop.addEventListener("mouseleave", hidePop);
    }
    pop.innerHTML = '<p class="ph"><b>S' + n + '</b><span>' + esc(src.p) + ": " + esc(src.t) + "</span></p>" +
      facts.map(function (f) { return "<q>" + esc(data.facts[f]) + "</q>"; }).join("") +
      '<a class="pl" href="' + a.getAttribute("href") + '">See it in the source list <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>';
    var r = a.getBoundingClientRect(), w = Math.min(380, window.innerWidth - 32);
    var left = Math.max(16, Math.min(r.left + window.scrollX - 20, window.scrollX + window.innerWidth - w - 16));
    pop.style.left = left + "px";
    pop.style.top = "0px";
    pop.classList.add("show");
    var ph = pop.offsetHeight, below = r.bottom + 10, above = r.top - ph - 10;
    pop.style.top = (below + ph > window.innerHeight && above > 0 ? above : below) + window.scrollY + "px";
    a.setAttribute("aria-describedby", "cite-pop");
  }
  function hidePop() {
    hideTimer = setTimeout(function () { if (pop) pop.classList.remove("show"); }, 160);
  }
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  $$("sup.cite a").forEach(function (a) {
    if (fine) {
      a.addEventListener("mouseenter", function () { showPop(a); });
      a.addEventListener("mouseleave", hidePop);
    }
    a.addEventListener("focus", function () { showPop(a); });
    a.addEventListener("blur", hidePop);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pop) pop.classList.remove("show"); });

  // ---------- copy buttons ----------
  var toast = $(".toast");
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, fail) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? ok() : fail(); } catch (err) { fail(err); }
      document.body.removeChild(ta);
    });
  }
  $$(".copy").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-text");
      if (!text) {
        var sel = b.getAttribute("data-copy");
        text = $$(sel).map(function (el) { return el.getAttribute("data-raw") || el.textContent.trim(); }).join("\n\n");
      }
      copyText(text).then(function () {
        b.classList.add("done");
        var lbl = b.querySelector(".lbl"), old = lbl ? lbl.textContent : "";
        if (lbl) lbl.textContent = "Copied";
        if (toast) { toast.textContent = b.getAttribute("data-msg") || "Copied to clipboard"; toast.classList.add("show"); }
        setTimeout(function () {
          b.classList.remove("done"); if (lbl) lbl.textContent = old;
          if (toast) toast.classList.remove("show");
        }, 1800);
      });
    });
  });

  // ---------- full-screen figure viewer ----------
  var viewer = $(".viewer");
  if (viewer) {
    var vin = $(".vin", viewer), lastBtn = null;
    function closeV() { viewer.classList.remove("open"); viewer.setAttribute("aria-hidden", "true"); if (lastBtn) lastBtn.focus(); }
    $$(".fig .zoom").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var art = btn.closest(".fig").querySelector(".art.wide svg");
        vin.innerHTML = ""; vin.appendChild(art.cloneNode(true));
        $$("[id]", vin).forEach(function (el) { el.id = "v-" + el.id; });
        lastBtn = btn; viewer.classList.add("open"); viewer.setAttribute("aria-hidden", "false");
        $(".close", viewer).focus();
      });
    });
    $(".close", viewer).addEventListener("click", closeV);
    viewer.addEventListener("click", function (e) { if (e.target === viewer) closeV(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && viewer.classList.contains("open")) closeV(); });
  }

  // ---------- source list: red box on the source you arrived at, and a filter ----------
  function markHash() {
    var h = location.hash.slice(1);
    $$(".src.hit").forEach(function (el) { el.classList.remove("hit", "flash"); });
    var el = h && document.getElementById(h);
    if (el && el.classList.contains("src")) {
      el.classList.add("hit");
      if (!reduce) { void el.offsetWidth; el.classList.add("flash"); }
    }
  }
  if ($(".src")) { window.addEventListener("hashchange", markHash); markHash(); }
  var input = $(".filter input");
  if (input) {
    var cards = $$(".src"), groups = $$(".group"), count = $(".filter .fc"), empty = $(".empty");
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase(), shown = 0;
      cards.forEach(function (c) {
        var hit = !q || c.textContent.toLowerCase().indexOf(q) !== -1;
        c.hidden = !hit; if (hit) shown++;
      });
      groups.forEach(function (g) { g.hidden = !$$(".src", g).some(function (c) { return !c.hidden; }); });
      if (count) count.textContent = shown + " of " + cards.length + " sources";
      if (empty) empty.style.display = shown ? "none" : "block";
    });
  }
})();
