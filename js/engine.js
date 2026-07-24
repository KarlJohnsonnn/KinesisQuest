/* Typing engine: must-correct, per-key stats */
window.KKEngine = (function () {
  function create(text, hooks) {
    hooks = hooks || {};
    var target = String(text);
    var index = 0;
    var misses = 0;
    var hits = 0;
    var startedAt = null;
    var finished = false;
    var lastMiss = false;

    function currentChar() {
      return target.charAt(index);
    }

    function expectedDisplay() {
      var c = currentChar();
      if (c === " ") return "Space";
      if (c === "\n") return "Enter";
      if (c === "\b") return "Bksp";
      return c;
    }

    function progress() {
      return {
        index: index,
        total: target.length,
        misses: misses,
        hits: hits,
        finished: finished,
        accuracy: hits + misses === 0 ? 1 : hits / (hits + misses),
        wpm: wpm(),
        current: currentChar(),
        expectedLabel: expectedDisplay(),
        lastMiss: lastMiss,
      };
    }

    function wpm() {
      if (!startedAt || hits === 0) return 0;
      var minutes = (Date.now() - startedAt) / 60000;
      if (minutes <= 0) return 0;
      return Math.round(hits / 5 / minutes);
    }

    function matchKey(e) {
      var want = currentChar();
      if (!want) return false;

      if (want === "\n") {
        return e.key === "Enter";
      }
      if (want === "\b") {
        return e.key === "Backspace";
      }
      if (want === " ") {
        return e.key === " " || e.code === "Space";
      }
      if (e.key.length === 1) {
        return e.key === want;
      }
      return false;
    }

    function onKeyDown(e) {
      if (finished) return progress();
      if (e.metaKey || e.ctrlKey || e.altKey) return progress();

      var ignore = ["Shift", "CapsLock", "Tab", "Escape", "Meta", "Control", "Alt"];
      if (ignore.indexOf(e.key) !== -1) return progress();

      // Allow Backspace only when expected
      if (e.key === "Backspace" && currentChar() !== "\b") {
        e.preventDefault();
        return progress();
      }

      e.preventDefault();
      if (!startedAt) startedAt = Date.now();

      if (matchKey(e)) {
        hits += 1;
        lastMiss = false;
        if (hooks.onHit) hooks.onHit(currentChar());
        index += 1;
        if (index >= target.length) {
          finished = true;
          if (hooks.onFinish) hooks.onFinish(progress());
        } else if (hooks.onAdvance) {
          hooks.onAdvance(progress());
        }
      } else {
        misses += 1;
        lastMiss = true;
        if (hooks.onMiss) hooks.onMiss(currentChar(), e.key);
        if (hooks.onAdvance) hooks.onAdvance(progress());
      }
      return progress();
    }

    function renderSpans() {
      var html = "";
      var i;
      for (i = 0; i < target.length; i++) {
        var ch = target.charAt(i);
        var show = ch === "\n" ? "↵\n" : ch === " " ? "·" : ch === "\b" ? "⌫" : ch;
        var cls = "todo";
        if (i < index) cls = "done";
        else if (i === index) cls = lastMiss ? "current miss" : "current";
        html += '<span class="' + cls + '">' + escapeHtml(show) + "</span>";
      }
      return html;
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    return {
      onKeyDown: onKeyDown,
      progress: progress,
      renderSpans: renderSpans,
      getText: function () {
        return target;
      },
    };
  }

  return { create: create };
})();
