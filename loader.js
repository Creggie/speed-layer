/* Speed Layer Loader v1.1 — synchronous header script
   Embed like this:
   <script src="https://cdn.jsdelivr.net/gh/Creggie/speed-layer@latest/loader.js"
           data-manifest="https://cdn.jsdelivr.net/gh/Creggie/speed-layer@latest/manifest/"></script>
*/
(function () {
  "use strict";
  if (window.__SPEED_LAYER__) return; // prevent duplicate load
  window.__SPEED_LAYER__ = { version: "1.1" };

  // --- Config ---
  var scriptEl = document.currentScript || (function(){
    var s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();
  var MANIFEST_BASE = (scriptEl && scriptEl.getAttribute("data-manifest")) || "";
  var host = location.hostname.toLowerCase();
  var manifestURL = (MANIFEST_BASE.replace(/\/?$/, "/")) + encodeURIComponent(host) + ".json";

  var cfg = null, allow = [], deferList = [], booted = false;
  var eagerSel = []; // selectors for eager images

  // --- Utils ---
  function idle(fn) { 
    if ("requestIdleCallback" in window) requestIdleCallback(fn, { timeout: 1500 }); 
    else setTimeout(fn, 120);
  }
  function add(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in (attrs || {})) if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
    (document.head || document.documentElement).appendChild(el);
    return el;
  }
  function toRegexList(arr) { 
    return (arr || []).map(function (p) { 
      try { return new RegExp(p); } catch(e){ return /$a/; } 
    }); 
  }
  function testAny(list, url) {
    for (var i = 0; i < list.length; i++) if (list[i].test(url)) return true;
    return false;
  }
  function isEager(el) {
    try { return eagerSel.some(function (sel) { return el.matches && el.matches(sel); }); }
    catch (e) { return false; }
  }

  // --- Analytics stubs ---
  window.dataLayer = window.dataLayer || [];
  if (!window.fbq) {
    var fbq = function () { (fbq.q = fbq.q || []).push(arguments); };
    fbq.loaded = false; window.fbq = fbq;
  }

  // --- Element governance ---
  var _create = document.createElement;
  document.createElement = function (tag) {
    var el = _create.call(document, tag);
    try {
      if (tag === "img") {
        if (isEager(el)) {
          el.loading = "eager";
          el.setAttribute("fetchpriority", "high");
        } else {
          if (!el.loading) el.loading = "lazy";
        }
        if (!el.decoding) el.decoding = "async";
      }
      if (tag === "iframe") {
        if (!el.loading) el.loading = "lazy";
        el.setAttribute("fetchpriority", "low");
      }
      if (tag === "script") hookScript(el);
    } catch (e) {}
    return el;
  };

  function hookScript(node) {
    var _setAttr = node.setAttribute;
    node.setAttribute = function (name, value) {
      if (name === "src") { govern(node, value); return; }
      return _setAttr.apply(node, arguments);
    };
    Object.defineProperty(node, "src", {
      configurable: true,
      get: function () { return node.getAttribute("src"); },
      set: function (v) { govern(node, v); }
    });
  }

  function allowNow(url) { return testAny(allow, url); }
  function shouldDefer(url) {
    if (!cfg) return false; // fail-safe: allow everything if no manifest
    return deferList.length ? testAny(deferList, url) : !allowNow(url);
  }

  function loadAsync(url, fromNode) {
    var s = document.createElement("script");
    s.async = true;
    if (fromNode && fromNode.type) s.type = fromNode.type; // preserve module if present
    s.src = url;
    (document.head || document.documentElement).appendChild(s);
  }

  function govern(node, url) {
    try {
      if (allowNow(url)) { node.setAttribute("src", url); return; }
      var runner = function () { loadAsync(url, node); };
      shouldDefer(url) ? idle(runner) : runner();
    } catch (e) {
      node.setAttribute("src", url);
    }
  }

  // --- Mutation observer for dynamically inserted elements ---
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      (m.addedNodes || []).forEach(function (n) {
        if (!n.tagName) return;
        var t = n.tagName.toUpperCase();
        if (t === "IMG") {
          if (isEager(n)) {
            n.loading = "eager";
            n.setAttribute("fetchpriority", "high");
          } else if (!n.loading) {
            n.loading = "lazy";
          }
          if (!n.decoding) n.decoding = "async";
        }
        if (t === "IFRAME") {
          if (!n.loading) n.loading = "lazy";
          n.setAttribute("fetchpriority", "low");
        }
        if (t === "SCRIPT") hookScript(n);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  // --- First-interaction boot: only vendorScripts now ---
  function boot() {
    if (booted || !cfg) return; booted = true;
    try {
      (cfg.vendorScripts || []).forEach(function (u) { idle(function () { loadAsync(u); }); });
    } catch (e) {}
  }

  addEventListener("pointerdown", boot, { once: true });
  addEventListener("scroll", boot, { once: true, passive: true });
  addEventListener("load", function () { setTimeout(boot, 500); });

  // --- Manifest fetch ---
  try {
    var x = new XMLHttpRequest();
    x.open("GET", manifestURL, true);
    x.onreadystatechange = function () {
      if (x.readyState === 4 && x.status >= 200 && x.status < 300) {
        try {
          cfg = JSON.parse(x.responseText || "{}");
          allow = toRegexList(cfg.allowScripts || []);
          deferList = toRegexList(cfg.deferScripts || []);
          eagerSel = (cfg && cfg.eagerSelectors) || [];

          // --- Run early hints immediately (not waiting for interaction) ---
          (cfg.preconnect || []).forEach(function (h) {
            add("link", { rel: "preconnect", href: h, crossorigin: "anonymous" });
          });
          (cfg.preload || []).forEach(function (o) {
            var attrs = { rel: "preload", as: o.as || "", href: o.href || "" };
            if (o.crossorigin) attrs.crossorigin = "anonymous";
            add("link", attrs);
          });
          if (cfg.criticalCssInline) {
            var st = document.createElement("style");
            st.textContent = cfg.criticalCssInline;
            (document.head || document.documentElement).appendChild(st);
          }
        } catch (e) {}
      }
    };
    x.send(null);
  } catch (e) {}
})();
