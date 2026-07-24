/* Kinesis Quest — UI + session orchestration */
window.KKApp = (function () {
  var C = window.KKCurriculum;
  var S = window.KKSave;
  var E = window.KKEngine;

  var state = null;
  var engine = null;
  var phase = null; // warmup | main | checkpoint | boss
  var sessionStartedAt = null;
  var sessionTimerId = null;
  var breakNudged = false;
  var phaseStats = { hits: 0, misses: 0 };
  var sessionAcc = [];
  var listening = false;

  var el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    state = S.load();
    if (!state.progress.unlocked || state.progress.unlocked.length === 0) {
      state.progress.unlocked = ["home", "thumbs"];
    }
    if (state.progress.unlocked.indexOf("thumbs") === -1) {
      state.progress.unlocked.push("thumbs");
    }
    cacheEls();
    bind();
    applySettings();
    showHub();
  }

  function cacheEls() {
    el.app = $("app");
    el.hub = $("view-hub");
    el.session = $("view-session");
    el.settings = $("view-settings");
    el.map = $("territory-map");
    el.xp = $("stat-xp");
    el.streak = $("stat-streak");
    el.duration = $("stat-duration");
    el.phase = $("phase-label");
    el.prompt = $("prompt-text");
    el.timer = $("session-timer");
    el.acc = $("session-acc");
    el.wpm = $("session-wpm");
    el.territory = $("session-territory");
    el.overlay = $("overlay");
    el.modal = $("modal");
  }

  function bind() {
    $("btn-continue").addEventListener("click", startSession);
    $("btn-settings").addEventListener("click", showSettings);
    $("btn-settings-back").addEventListener("click", showHub);
    $("btn-pain").addEventListener("click", painStop);
    $("btn-end").addEventListener("click", function () {
      endSession(false, false);
    });
    $("btn-export").addEventListener("click", doExport);
    $("btn-import").addEventListener("click", doImport);
    $("btn-reset").addEventListener("click", doReset);
    $("btn-paste-drill").addEventListener("click", startPasteDrill);
    $("chk-sound").addEventListener("change", syncSettings);
    $("chk-guide").addEventListener("change", syncSettings);
    $("chk-motion").addEventListener("change", syncSettings);
    window.addEventListener("keydown", onKey, true);
  }

  function applySettings() {
    $("chk-sound").checked = !!state.settings.sound;
    $("chk-guide").checked = state.settings.fingerGuide !== false;
    $("chk-motion").checked = !!state.settings.reduceMotion;
    document.documentElement.classList.toggle(
      "reduce-motion",
      !!state.settings.reduceMotion
    );
    var wrap = document.querySelector(".kb-wrap");
    if (wrap) {
      wrap.style.display = state.settings.fingerGuide === false ? "none" : "";
    }
  }

  function syncSettings() {
    state.settings.sound = $("chk-sound").checked;
    state.settings.fingerGuide = $("chk-guide").checked;
    state.settings.reduceMotion = $("chk-motion").checked;
    applySettings();
    S.save(state);
  }

  function showHub() {
    stopListening();
    clearTimer();
    el.hub.classList.remove("hidden");
    el.session.classList.add("hidden");
    el.settings.classList.add("hidden");
    renderHub();
  }

  function showSettings() {
    stopListening();
    el.hub.classList.add("hidden");
    el.session.classList.add("hidden");
    el.settings.classList.remove("hidden");
    applySettings();
  }

  function renderHub() {
    el.xp.textContent = state.stats.xp + " XP";
    el.streak.textContent = "Streak " + state.sessionPlan.streak;
    el.duration.textContent = state.sessionPlan.targetDurationMin + " min";
    el.map.innerHTML = "";
    C.TERRITORIES.forEach(function (t) {
      var div = document.createElement("div");
      div.className = "territory";
      if (state.progress.unlocked.indexOf(t.id) !== -1) div.classList.add("unlocked");
      if (state.progress.completed.indexOf(t.id) !== -1) div.classList.add("done");
      if (state.progress.territoryId === t.id) div.classList.add("current");
      div.innerHTML = "<h3>" + t.name + "</h3><p>" + t.blurb + "</p>";
      el.map.appendChild(div);
    });
    var tip = $("tip-panel");
    if (state.settings.tipSeen) tip.classList.add("hidden");
    else tip.classList.remove("hidden");
    $("btn-dismiss-tip").onclick = function () {
      state.settings.tipSeen = true;
      S.save(state);
      tip.classList.add("hidden");
    };
  }

  function startSession() {
    var tid = state.progress.territoryId || "home";
    var tmeta = C.TERRITORIES[C.territoryIndex(tid)];
    if (tmeta && tmeta.stub) {
      state.progress.territoryId = "symbols";
      tid = "symbols";
    }

    sessionStartedAt = Date.now();
    breakNudged = false;
    sessionAcc = [];
    phaseStats = { hits: 0, misses: 0 };
    state.sessionPlan.targetDurationMin = C.durationFor(state.progress.passedSessions);

    el.hub.classList.add("hidden");
    el.settings.classList.add("hidden");
    el.session.classList.remove("hidden");
    el.territory.textContent = territoryName(tid);

    startTimer();
    beginPhase("warmup");
  }

  function territoryName(id) {
    var t = C.TERRITORIES[C.territoryIndex(id)];
    return t ? t.name : id;
  }

  function beginPhase(name) {
    phase = name;
    var tid = state.progress.territoryId || "home";
    var text = "";

    if (name === "warmup") {
      el.phase.textContent = "Warm-up · weak keys";
      text = C.warmupFromWeak(S.weakCharsForWarmup(state));
    } else if (name === "main") {
      el.phase.textContent = "Main drill · " + territoryName(tid);
      text = C.drillFor(tid, state.progress.sessionIndex);
      state.progress.lastDrillId = tid + ":" + state.progress.sessionIndex;
    } else if (name === "checkpoint") {
      el.phase.textContent = "Checkpoint";
      text = C.drillFor(tid, state.progress.sessionIndex + 1).slice(0, 48);
    } else if (name === "boss") {
      el.phase.textContent = "Boss · " + territoryName(tid);
      text = C.bossFor(tid);
    }

    engine = E.create(text, {
      onHit: function (ch) {
        phaseStats.hits += 1;
        S.noteKeyHit(state, ch);
        beep(true);
        highlightKey(ch, "hit");
      },
      onMiss: function (ch) {
        phaseStats.misses += 1;
        S.noteKeyError(state, ch);
        beep(false);
        highlightKey(ch, "miss");
      },
      onAdvance: function (p) {
        renderPrompt();
        updateLiveStats(p);
        highlightKey(p.current, "target");
      },
      onFinish: function (p) {
        sessionAcc.push(p.accuracy);
        updateLiveStats(p);
        nextPhase();
      },
    });

    renderPrompt();
    updateLiveStats(engine.progress());
    highlightKey(engine.progress().current, "target");
    startListening();
    S.save(state);
  }

  function nextPhase() {
    if (phase === "warmup") {
      beginPhase("main");
      return;
    }
    if (phase === "main") {
      if (C.isBossSession(state.progress.sessionIndex)) beginPhase("boss");
      else beginPhase("checkpoint");
      return;
    }
    // checkpoint or boss → end
    endSession(true, phase === "boss");
  }

  function startPasteDrill() {
    showHub();
    var raw = ($("paste-input").value || "").trim();
    if (!raw) {
      alert("Paste some real text first.");
      return;
    }
    if (raw.length > 800) raw = raw.slice(0, 800);
    state.progress.territoryId = state.progress.territoryId || "near";
    sessionStartedAt = Date.now();
    breakNudged = true;
    sessionAcc = [];
    phaseStats = { hits: 0, misses: 0 };
    el.hub.classList.add("hidden");
    el.settings.classList.add("hidden");
    el.session.classList.remove("hidden");
    el.territory.textContent = "Real-work paste";
    startTimer();
    phase = "main";
    el.phase.textContent = "Real-work transfer";
    engine = E.create(raw, {
      onHit: function (ch) {
        phaseStats.hits += 1;
        S.noteKeyHit(state, ch);
        highlightKey(ch, "hit");
      },
      onMiss: function (ch) {
        phaseStats.misses += 1;
        S.noteKeyError(state, ch);
        highlightKey(ch, "miss");
      },
      onAdvance: function (p) {
        renderPrompt();
        updateLiveStats(p);
        highlightKey(p.current, "target");
      },
      onFinish: function (p) {
        sessionAcc.push(p.accuracy);
        endSession(true, false);
      },
    });
    renderPrompt();
    updateLiveStats(engine.progress());
    highlightKey(engine.progress().current, "target");
    startListening();
  }

  function renderPrompt() {
    el.prompt.innerHTML = engine.renderSpans();
  }

  function updateLiveStats(p) {
    var acc = Math.round(p.accuracy * 100);
    el.acc.textContent = acc + "%";
    el.wpm.textContent = p.wpm + " WPM";
  }

  function startListening() {
    listening = true;
  }

  function stopListening() {
    listening = false;
  }

  function onKey(e) {
    var tag = (e.target && e.target.tagName) || "";
    var typingInField = tag === "TEXTAREA" || tag === "INPUT";

    if (!el.overlay.classList.contains("hidden")) {
      handleOverlayKeys(e);
      return;
    }

    if (listening && engine) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        painStop();
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        endSession(false, false);
        return;
      }
      engine.onKeyDown(e);
      return;
    }

    if (typingInField) {
      if (
        !el.settings.classList.contains("hidden") &&
        e.ctrlKey &&
        e.key === "Enter"
      ) {
        e.preventDefault();
        startPasteDrill();
      }
      return;
    }

    if (!el.settings.classList.contains("hidden")) {
      if (e.key === "Escape") {
        e.preventDefault();
        showHub();
      } else if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        startPasteDrill();
      }
      return;
    }

    if (!el.hub.classList.contains("hidden")) {
      var tip = $("tip-panel");
      var tipOpen = tip && !tip.classList.contains("hidden");
      if (tipOpen && (e.key === "Enter" || e.key === "Escape")) {
        e.preventDefault();
        state.settings.tipSeen = true;
        S.save(state);
        tip.classList.add("hidden");
        if (e.key === "Escape") return;
        // Enter after dismiss can continue — fall through only if still Enter desire: start
        startSession();
        return;
      }
      if (e.key === "Enter" || e.key === "c" || e.key === "C") {
        e.preventDefault();
        startSession();
      } else if (e.key === "," || e.key === "s" || e.key === "S") {
        e.preventDefault();
        showSettings();
      }
    }
  }

  function handleOverlayKeys(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      el.overlay.classList.add("hidden");
      showHub();
      return;
    }
    var urgeSkip = $("urge-skip");
    var modalOk = $("modal-ok");
    if (/^[1-5]$/.test(e.key) && $("urge-btns")) {
      e.preventDefault();
      state.sessionPlan.mbUrgeHistory.push({
        at: new Date().toISOString(),
        urge: Number(e.key),
      });
      S.save(state);
      el.overlay.classList.add("hidden");
      showHub();
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && modalOk) {
      e.preventDefault();
      modalOk.click();
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && urgeSkip && !modalOk) {
      e.preventDefault();
      urgeSkip.click();
    }
  }

  function startTimer() {
    clearTimer();
    tickTimer();
    sessionTimerId = setInterval(tickTimer, 1000);
  }

  function clearTimer() {
    if (sessionTimerId) clearInterval(sessionTimerId);
    sessionTimerId = null;
  }

  function tickTimer() {
    if (!sessionStartedAt) return;
    var elapsed = Date.now() - sessionStartedAt;
    var targetMs = state.sessionPlan.targetDurationMin * 60 * 1000;
    var remain = Math.max(0, targetMs - elapsed);
    var m = Math.floor(remain / 60000);
    var s = Math.floor((remain % 60000) / 1000);
    el.timer.textContent =
      String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");

    if (!breakNudged && elapsed > targetMs * 0.5) {
      breakNudged = true;
      flashPhase("Half-time · shake out right wrist if needed");
    }
  }

  function flashPhase(msg) {
    var prev = el.phase.textContent;
    el.phase.textContent = msg;
    setTimeout(function () {
      if (el.phase.textContent === msg) el.phase.textContent = prev;
    }, 3500);
  }

  function painStop() {
    endSession(false, false, true);
  }

  function endSession(completed, wasBoss, pain) {
    stopListening();
    clearTimer();
    engine = null;

    var avgAcc =
      sessionAcc.length === 0
        ? 0
        : sessionAcc.reduce(function (a, b) {
            return a + b;
          }, 0) / sessionAcc.length;

    if (completed && !pain) {
      state.progress.sessionIndex += 1;
      state.stats.xp += Math.round(40 + avgAcc * 60);
      state.stats.accuracyHistory.push(Math.round(avgAcc * 1000) / 1000);
      state.sessionPlan.lastCompletedAt = new Date().toISOString();
      state.sessionPlan.streak += 1;

      var gate = wasBoss ? C.BOSS_ACCURACY : C.ACCURACY_GATE;
      if (avgAcc >= gate) {
        state.progress.passedSessions += 1;
        state.sessionPlan.targetDurationMin = C.durationFor(
          state.progress.passedSessions
        );
        maybeUnlock(wasBoss, avgAcc);
      }
    } else if (pain) {
      // streak preserved
      state.stats.xp += 5;
    }

    S.save(state);

    if (pain) {
      showModal(
        "Pain Stop",
        "Progress saved. Streak kept. Rest the right wrist — quest waits.",
        function () {
          showHub();
        }
      );
      return;
    }

    if (!completed) {
      showHub();
      return;
    }

    askUrge(avgAcc, wasBoss);
  }

  function maybeUnlock(wasBoss, avgAcc) {
    var tid = state.progress.territoryId;
    if (wasBoss && avgAcc >= C.BOSS_ACCURACY) {
      if (state.progress.completed.indexOf(tid) === -1) {
        state.progress.completed.push(tid);
      }
      var next = C.nextTerritoryId(tid);
      if (next) {
        if (state.progress.unlocked.indexOf(next) === -1) {
          state.progress.unlocked.push(next);
        }
        state.progress.territoryId = next;
      }
      return;
    }
    // Soft advance home → thumbs early without boss if enough passes
    if (
      tid === "home" &&
      state.progress.passedSessions >= 1 &&
      state.progress.unlocked.indexOf("thumbs") !== -1 &&
      state.progress.completed.indexOf("home") === -1
    ) {
      // stay on home until boss, but thumbs already unlocked for map
    }
    if (
      tid === "home" &&
      state.progress.sessionIndex >= 2 &&
      avgAcc >= C.ACCURACY_GATE
    ) {
      state.progress.territoryId = "thumbs";
    }
  }

  function askUrge(avgAcc, wasBoss) {
    el.overlay.classList.remove("hidden");
    el.modal.innerHTML =
      "<h2>Session complete</h2>" +
      "<p>Accuracy " +
      Math.round(avgAcc * 100) +
      "%." +
      (wasBoss ? " Boss fought." : "") +
      " How strong is the pull to switch back to the MacBook keyboard? (1 = none, 5 = strong). Keys: 1–5 or Esc.</p>" +
      '<div class="urge-row" id="urge-btns"></div>' +
      '<button type="button" class="ghost" id="urge-skip">Skip</button>';

    var row = $("urge-btns");
    [1, 2, 3, 4, 5].forEach(function (n) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = String(n);
      b.addEventListener("click", function () {
        state.sessionPlan.mbUrgeHistory.push({
          at: new Date().toISOString(),
          urge: n,
        });
        S.save(state);
        el.overlay.classList.add("hidden");
        showHub();
      });
      row.appendChild(b);
    });
    $("urge-skip").addEventListener("click", function () {
      el.overlay.classList.add("hidden");
      showHub();
    });
  }

  function showModal(title, body, onOk) {
    el.overlay.classList.remove("hidden");
    el.modal.innerHTML =
      "<h2>" +
      title +
      "</h2><p>" +
      body +
      '</p><button type="button" class="primary" id="modal-ok">OK</button>';
    $("modal-ok").addEventListener("click", function () {
      el.overlay.classList.add("hidden");
      if (onOk) onOk();
    });
  }

  function keyIdForChar(ch) {
    var shifted = {
      "!": "Digit1",
      "@": "Digit2",
      "#": "Digit3",
      $: "Digit4",
      "%": "Digit5",
      "^": "Digit6",
      "&": "Digit7",
      "*": "Digit8",
      "(": "Digit9",
      ")": "Digit0",
      _: "Minus",
      "+": "Equal",
      "{": "BracketLeft",
      "}": "BracketRight",
      "|": "Backslash",
      ":": "Semicolon",
      '"': "Quote",
      "<": "Comma",
      ">": "Period",
      "?": "Slash",
    };
    if (shifted[ch]) return shifted[ch];
    if (ch === " ") return "Space";
    if (ch === "\n") return "Enter";
    if (ch === "\b") return "Backspace";
    if (ch === ";") return "Semicolon";
    if (ch === "'") return "Quote";
    if (ch === ",") return "Comma";
    if (ch === ".") return "Period";
    if (ch === "-") return "Minus";
    if (ch === "/") return "Slash";
    if (ch === "=") return "Equal";
    if (ch === "[") return "BracketLeft";
    if (ch === "]") return "BracketRight";
    if (ch === "\\") return "Backslash";
    if (ch >= "0" && ch <= "9") return "Digit" + ch;
    if (ch && ch.length === 1 && /[a-zA-Z]/.test(ch)) return "Key" + ch.toUpperCase();
    return null;
  }

  function highlightKey(ch, mode) {
    var svg = $("kb-svg");
    if (!svg) return;
    svg.querySelectorAll(".kb-key").forEach(function (n) {
      n.classList.remove("target", "hit", "miss");
    });
    var id = keyIdForChar(ch);
    if (!id) return;
    var node = svg.querySelector('[data-key="' + id + '"]');
    if (!node) return;
    node.classList.add(mode === "target" ? "target" : mode);
  }

  function beep(ok) {
    if (!state.settings.sound) return;
    try {
      var ctx = beep._ctx || (beep._ctx = new (window.AudioContext || window.webkitAudioContext)());
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = ok ? 660 : 220;
      g.gain.value = 0.03;
      o.start();
      o.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  }

  function doExport() {
    var blob = new Blob([S.exportJson(state)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kk-quest-save.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function doImport() {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          state = S.importJson(String(reader.result));
          showHub();
          alert("Save imported.");
        } catch (e) {
          alert("Import failed.");
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function doReset() {
    if (!confirm("Reset all Kinesis Quest progress?")) return;
    state = S.reset();
    state.progress.unlocked = ["home", "thumbs"];
    S.save(state);
    showHub();
  }

  return { init: init };
})();

document.addEventListener("DOMContentLoaded", function () {
  window.KKApp.init();
});
