/* ============================================================
   RTL for AI Sites - content script
   Smart per-block RTL: the direction of each paragraph/heading/list
   item is decided by whether it CONTAINS Persian/Arabic letters
   (not by its first character). This fixes the issue where a reply
   starting with an English word flipped the whole message to LTR.

   Icon safety: sites like Gemini render icons as LIGATURES inside icon
   fonts (Material Symbols / Material Icons / Google Symbols). If the
   font is changed to a Persian font, the ligature breaks and the raw
   text (e.g. "mic", "tune") shows up. We detect icon elements and lock
   their icon font with an inline !important rule (inline !important
   beats any stylesheet rule), so icons always stay intact.
   ============================================================ */
(function () {
  "use strict";

  // Persian/Arabic letters
  const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const RTL_GLOBAL = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

  let settings = { enabled: true, font: true };

  /* ---------- Per-site message container selectors ---------- */
  const SITE_SELECTORS = {
    "claude.ai": [".font-claude-message", "[data-testid='user-message']", ".prose"],
    "chatgpt.com": ["[data-message-author-role]", ".markdown", ".prose"],
    "chat.openai.com": ["[data-message-author-role]", ".markdown", ".prose"],
    "gemini.google.com": ["message-content", ".markdown", ".query-text", ".model-response-text"],
    "notebooklm.google.com": [".markdown", ".prose", "[class*='markdown']", "[class*='message']", "[class*='response']", "[class*='answer']", "[class*='chat']", "[class*='notebook']", "[class*='source']", "[class*='note']"],
    "grok.com": [".message-bubble", ".prose", "[class*='message']"],
    "chat.deepseek.com": [".ds-markdown", "[class*='message']"],
    "perplexity.ai": [".prose", "[class*='prose']", "[class*='answer']"],
    "copilot.microsoft.com": ["[data-content='ai-message']", "[class*='message']", ".prose"],
    "poe.com": ["[class*='Markdown_markdownContainer']", "[class*='ChatMessage']", "[class*='Message_']"],
    "arena.ai": [".markdown", ".prose", "[class*='markdown']", "[class*='message']", "[class*='Message']", "[class*='chat']"]
  };

  const GENERIC_SELECTORS = [
    ".markdown", ".prose", "[class*='markdown']", "[class*='message-content']",
    "[class*='message-body']", "[data-message-author-role]"
  ];

  // Block-level text elements that are checked individually
  const BLOCK_SELECTOR =
    "p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, dd, dt, summary, figcaption, " +
    "div.paragraph, .katex-display";

  const INPUT_SELECTORS = ["textarea", "[contenteditable='true']", "[role='textbox']"];

  /* ---------- Icon detection ---------- */
  // Class names that indicate an icon element
  const ICON_CLASS_RE =
    /(^|[\s_-])(material-symbols|material-icons|google-symbols|mat-icon|gmat-icon|glyphicon|fonticon|icon|fa|fas|far|fab|fal|fad)([\s_-]|$)|(^|\s)fa-|google-material-icons/i;
  // Computed font-family names that indicate an icon font
  const ICON_FONT_RE =
    /symbols|material icons|material-icons|font ?awesome|fontawesome|glyphicons|icomoon|fontello|googlesans icons|product sans icons/i;
  // Fallback icon font stack to restore broken icons (covers Google + FA)
  const ICON_FONT_STACK =
    "'Material Symbols Outlined','Material Symbols Rounded','Material Symbols Sharp'," +
    "'Material Icons','Material Icons Outlined','Material Icons Round','Material Icons Sharp'," +
    "'Material Icons Two Tone','Google Symbols','Google Material Icons'," +
    "'Font Awesome 6 Free','Font Awesome 6 Brands','Font Awesome 6 Pro'," +
    "'Font Awesome 5 Free','Font Awesome 5 Brands','FontAwesome'," +
    "'glyphicons-halflings'";

  const ICON_QUERY =
    "[class*='material-symbols'],[class*='material-icons'],[class*='google-symbols']," +
    "mat-icon,.mat-icon,.gmat-icon,[class*='glyphicon'],[class*='fonticon']," +
    "i.fa,i.fas,i.far,i.fab,i.fal,i.fad,[class*='fa-'],[class*='Icon'],[class*='icon']," +
    "[data-icon],[fonticon]";

  function looksLikeIcon(el) {
    if (!el || el.nodeType !== 1) return false;
    const cls = (typeof el.className === "string") ? el.className : (el.getAttribute && el.getAttribute("class")) || "";
    if (ICON_CLASS_RE.test(cls)) return true;
    if (el.hasAttribute && (el.hasAttribute("data-icon") || el.hasAttribute("fonticon"))) return true;
    if (el.tagName === "MAT-ICON") return true;
    return false;
  }

  function getSelectors() {
    const host = location.hostname.replace(/^www\./, "");
    for (const key in SITE_SELECTORS) {
      if (host === key || host.endsWith("." + key)) {
        return SITE_SELECTORS[key].concat(GENERIC_SELECTORS);
      }
    }
    return GENERIC_SELECTORS;
  }
  const containerSelectors = getSelectors();

  /* ---------- Helper: is this element inside a code block? ---------- */
  function inCode(el) {
    return !!(el.closest && el.closest("pre, code"));
  }

  /* ---------- Lock icon fonts so the Persian font never breaks them ----------
     We mark the element so we don't reprocess it, then pin its icon font
     with inline !important (which beats any stylesheet, including ours). */
  function lockIcon(el) {
    if (!el || el.nodeType !== 1 || el.dataset.rtlAiIconLocked === "1") return;

    let family = "";
    try {
      family = getComputedStyle(el).fontFamily || "";
    } catch (e) {}

    if (ICON_FONT_RE.test(family)) {
      // The element already resolves to a real icon font -> keep exactly that.
      el.style.setProperty("font-family", family, "important");
    } else if (looksLikeIcon(el)) {
      // Class says it's an icon but the font got overridden (or inherited).
      // Restore with a broad icon-font stack so it renders an icon, not text.
      el.style.setProperty("font-family", ICON_FONT_STACK, "important");
    } else {
      return; // not an icon
    }
    // Ligatures must stay enabled and direction LTR for icon fonts.
    el.style.setProperty("font-variant-ligatures", "normal", "important");
    el.style.setProperty("-webkit-font-feature-settings", "'liga'", "important");
    el.style.setProperty("font-feature-settings", "'liga'", "important");
    el.dataset.rtlAiIconLocked = "1";
  }

  function lockIcons(scope) {
    if (!settings.font) return;
    const root = scope && scope.querySelectorAll ? scope : document;
    let nodes;
    try { nodes = root.querySelectorAll(ICON_QUERY); } catch (e) { return; }
    nodes.forEach(lockIcon);
  }

  /* ---------- Set a block's direction based on its content ---------- */
  function setDirByContent(el) {
    if (!el || el.nodeType !== 1 || inCode(el)) return;
    const text = el.textContent;
    if (!text || !text.trim()) return;

    const hasRTL = RTL_REGEX.test(text);

    if (hasRTL) {
      // Any block with at least one Persian/Arabic letter -> RTL.
      // dir="rtl" + unicode-bidi:isolate lets embedded English words
      // render correctly without breaking the line.
      el.setAttribute("dir", "rtl");
      el.style.setProperty("direction", "rtl", "important");
      el.style.setProperty("text-align", "right", "important");
      el.style.setProperty("unicode-bidi", "isolate", "important");
      el.classList.add("rtl-ai-text", "rtl-ai-rtl");
      el.classList.remove("rtl-ai-ltr");
    } else {
      // Pure English block -> keep it LTR
      el.setAttribute("dir", "ltr");
      el.style.setProperty("direction", "ltr", "important");
      el.style.setProperty("text-align", "left", "important");
      el.style.setProperty("unicode-bidi", "isolate", "important");
      el.classList.add("rtl-ai-text", "rtl-ai-ltr");
      el.classList.remove("rtl-ai-rtl");
    }
  }

  /* ---------- Decide the dominant direction of a container ---------- */
  function setContainerDir(container) {
    if (inCode(container)) return;
    const text = container.textContent || "";
    if (!text.trim()) return;

    const rtlCount = (text.match(RTL_GLOBAL) || []).length;

    // No Persian at all -> leave it alone (pure English)
    if (rtlCount === 0) return;

    // If there is any Persian content, make the container RTL so the
    // overall layout (e.g. list bullets) aligns correctly.
    container.setAttribute("dir", "rtl");
    container.style.setProperty("direction", "rtl", "important");
    container.classList.add("rtl-ai-text", "rtl-ai-container");
  }

  /* ---------- Process a single message container ---------- */
  function processContainer(container) {
    if (inCode(container)) return;

    // 1) Overall container direction
    setContainerDir(container);

    // 2) Check each inner block individually
    let blocks;
    try {
      blocks = container.querySelectorAll(BLOCK_SELECTOR);
    } catch (e) {
      blocks = [];
    }
    if (blocks.length) {
      blocks.forEach(setDirByContent);
    } else {
      // Container without blocks (e.g. a single-line user message)
      setDirByContent(container);
    }

    // 3) Protect any icons inside this container
    lockIcons(container);
  }

  /* ---------- Input boxes ---------- */
  function applyInputs(scope) {
    INPUT_SELECTORS.forEach(function (sel) {
      scope.querySelectorAll(sel).forEach(function (el) {
        el.setAttribute("dir", "auto");
        el.classList.add("rtl-ai-text", "rtl-ai-input");
        // The input toolbar often holds icon buttons; protect them.
        lockIcons(el.parentElement || el);
      });
    });
  }

  /* ---------- Process the whole page or a subtree ---------- */
  function process(root) {
    if (!settings.enabled) return;
    const scope = root && root.querySelectorAll ? root : document;

    containerSelectors.forEach(function (sel) {
      let nodes;
      try { nodes = scope.querySelectorAll(sel); } catch (e) { return; }
      nodes.forEach(processContainer);
    });

    applyInputs(scope);

    // Global safety net: lock every icon on the page (cheap, deduped via flag)
    lockIcons(scope);
  }

  /* ---------- Toggle root-level classes ---------- */
  function syncRootClasses() {
    const html = document.documentElement;
    html.classList.toggle("rtl-ai-enabled", !!settings.enabled);
    html.classList.toggle("rtl-ai-font", !!(settings.enabled && settings.font));
  }

  /* ---------- DOM mutation observer ---------- */
  let observer = null;
  let pending = false;
  function scheduleProcess() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      process(document);
    });
  }
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(function (mutations) {
      for (const m of mutations) {
        if ((m.addedNodes && m.addedNodes.length) || m.type === "characterData") {
          scheduleProcess();
          break;
        }
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true // for streamed replies whose text is typed gradually
    });
  }
  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
  }

  /* ---------- Cleanup when disabled ---------- */
  function clearAll() {
    document.querySelectorAll(".rtl-ai-text").forEach(function (el) {
      el.removeAttribute("dir");
      el.style.removeProperty("direction");
      el.style.removeProperty("text-align");
      el.style.removeProperty("unicode-bidi");
      el.classList.remove("rtl-ai-text", "rtl-ai-rtl", "rtl-ai-ltr", "rtl-ai-container", "rtl-ai-input");
    });
    // Release locked icons
    document.querySelectorAll("[data-rtl-ai-icon-locked]").forEach(function (el) {
      el.style.removeProperty("font-family");
      el.style.removeProperty("font-variant-ligatures");
      el.style.removeProperty("-webkit-font-feature-settings");
      el.style.removeProperty("font-feature-settings");
      delete el.dataset.rtlAiIconLocked;
    });
  }

  /* ---------- Init ---------- */
  function init() {
    syncRootClasses();
    if (settings.enabled) {
      process(document);
      startObserver();
    }
  }

  /* ---------- Stored settings ---------- */
  const api = (typeof browser !== "undefined") ? browser : chrome;

  // storageGet: works with both Promise (Firefox) and callback (Chrome)
  function storageGet(keys, cb) {
    try {
      var result = api.storage.local.get(keys);
      if (result && typeof result.then === "function") {
        result.then(function (res) { cb(res || {}); }).catch(function () { cb({}); });
      } else {
        cb(result || {});
      }
    } catch (e) { cb({}); }
  }

  function loadSettings(cb) {
    storageGet(["enabled", "font"], function (res) {
      if (typeof res.enabled === "boolean") settings.enabled = res.enabled;
      if (typeof res.font    === "boolean") settings.font    = res.font;
      cb();
    });
  }
  try {
    api.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local") return;
      let changed = false;
      if (changes.enabled) { settings.enabled = changes.enabled.newValue; changed = true; }
      if (changes.font) { settings.font = changes.font.newValue; changed = true; }
      if (!changed) return;
      syncRootClasses();
      if (settings.enabled) { process(document); startObserver(); }
      else { stopObserver(); clearAll(); }
    });
  } catch (e) {}

  /* ---------- Run ---------- */
  function boot() {
    loadSettings(function () {
      if (document.body) init();
      else document.addEventListener("DOMContentLoaded", init, { once: true });
    });
  }
  boot();

  // Support SPAs that change the URL without a reload
  let lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (settings.enabled) scheduleProcess();
    }
  }, 1500);
})();
