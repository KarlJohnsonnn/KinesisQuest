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
  var phaseText = "";
  var lineTimerId = null;
  var sessionRelics = 0;
  var lastPlatinumNote = null;
  var rightGuiDown = false;

  var el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    state = S.load();
    ensureProgressShape();
    cacheEls();
    bind();
    applySettings();
    showHub();
  }

  function ensureProgressShape() {
    if (!state.progress.unlocked || state.progress.unlocked.length === 0) {
      state.progress.unlocked = ["home"];
    }
    if (typeof state.progress.clearsInChapter !== "number") {
      state.progress.clearsInChapter = 0;
    }
    if (!state.progress.drillBags) state.progress.drillBags = {};
    if (!state.progress.difficulty) state.progress.difficulty = "normal";
    if (!state.progress.unlockedDifficulties) {
      state.progress.unlockedDifficulties = ["normal"];
    }
    if (!state.progress.completedDifficulties) {
      state.progress.completedDifficulties = [];
    }
    if (!state.progress.packs) state.progress.packs = {};
    if (!state.stats.bestTimes) state.stats.bestTimes = {};
    if (typeof state.stats.platinumRelics !== "number") {
      state.stats.platinumRelics = 0;
    }
  }

  function cacheEls() {
    el.app = $("app");
    el.hub = $("view-hub");
    el.session = $("view-session");
    el.settings = $("view-settings");
    el.map = $("territory-map");
    el.xp = $("stat-xp");
    el.relics = $("stat-relics");
    el.streak = $("stat-streak");
    el.duration = $("stat-duration");
    el.phase = $("phase-label");
    el.prompt = $("prompt-text");
    el.timer = $("session-timer");
    el.lineTimer = $("line-timer");
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
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", function () {
      rightGuiDown = false;
    });
  }

  function isRightGuiCode(code) {
    return code === "MetaRight" || code === "OSRight";
  }

  function onKeyUp(e) {
    if (isRightGuiCode(e.code)) rightGuiDown = false;
  }

  function quickSave() {
    S.save(state);
    showPlatinumFlash("Quicksave");
  }

  /** Leave active session without scoring, then run fn. */
  function leaveSessionThen(fn) {
    if (!el.session.classList.contains("hidden") && engine) {
      stopListening();
      clearTimer();
      engine = null;
      phase = null;
    }
    fn();
  }

  function goTab(n) {
    if (n === 1) {
      leaveSessionThen(showHub);
      return;
    }
    if (n === 2) {
      leaveSessionThen(showSettings);
      return;
    }
    if (n === 3) {
      if (!el.overlay.classList.contains("hidden")) {
        el.overlay.classList.add("hidden");
      }
      if (!el.session.classList.contains("hidden")) return;
      startSession();
    }
  }

  function handleRightGuiChord(e) {
    if (!rightGuiDown && !isRightGuiCode(e.code)) return false;
    if (isRightGuiCode(e.code)) {
      rightGuiDown = true;
      return true; // consume alone; wait for partner key
    }
    if (!rightGuiDown) return false;

    var k = e.key;
    var digit = null;
    if (k >= "1" && k <= "9") digit = Number(k);
    else if (e.code && e.code.indexOf("Digit") === 0) {
      digit = Number(e.code.slice(5));
    } else if (e.code && e.code.indexOf("Numpad") === 0) {
      digit = Number(e.code.slice(6));
    }

    if (k === "s" || k === "S") {
      e.preventDefault();
      e.stopPropagation();
      quickSave();
      return true;
    }
    if (digit >= 1 && digit <= 9) {
      e.preventDefault();
      e.stopPropagation();
      goTab(digit);
      return true;
    }
    return false;
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
    var xp = state.stats.xp || 0;
    var durInfo = C.xpToNextDuration(xp);
    el.xp.textContent = xp + " XP";
    el.xp.title =
      "XP unlocks longer sessions (not chapters). Next length at " +
      (durInfo.nextMin
        ? durInfo.need + " XP → " + durInfo.nextMin + " min"
        : "max");
    if (el.relics) {
      el.relics.textContent = (state.stats.platinumRelics || 0) + " Pt";
      el.relics.title = "Platinum relics from new best line times";
    }
    el.streak.textContent = "Streak " + state.sessionPlan.streak;
    el.duration.textContent = durInfo.currentMin + " min";

    renderDifficultyRow();
    renderChapterProgress();

    el.map.innerHTML = "";
    C.TERRITORIES.forEach(function (t) {
      var div = document.createElement("div");
      div.className = "territory";
      if (state.progress.unlocked.indexOf(t.id) !== -1) div.classList.add("unlocked");
      if (state.progress.completed.indexOf(t.id) !== -1) div.classList.add("done");
      if (state.progress.territoryId === t.id) div.classList.add("current");
      var gate = "";
      if (t.stub) {
        gate = '<div class="gate">Coming later</div>';
      } else if (state.progress.completed.indexOf(t.id) !== -1) {
        gate = '<div class="gate">Cleared</div>';
      } else if (state.progress.territoryId === t.id) {
        var cp = C.chapterProgress(state);
        gate = cp.readyBoss
          ? '<div class="gate">Boss ready → next chapter</div>'
          : '<div class="gate">' +
            cp.clears +
            "/" +
            cp.need +
            " clears → boss</div>";
      } else if (state.progress.unlocked.indexOf(t.id) === -1) {
        gate = '<div class="gate">Locked</div>';
      }
      div.innerHTML = "<h3>" + t.name + "</h3><p>" + t.blurb + "</p>" + gate;
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

  function renderDifficultyRow() {
    var row = $("difficulty-row");
    if (!row) return;
    row.innerHTML = "";
    var cur = state.progress.difficulty || "normal";
    C.DIFFICULTIES().forEach(function (id) {
      var unlocked =
        (state.progress.unlockedDifficulties || ["normal"]).indexOf(id) !== -1;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = C.difficultyLabel(id);
      if (id === cur) btn.classList.add("active");
      if (!unlocked) {
        btn.disabled = true;
        btn.title = "Finish previous difficulty playthrough to unlock";
      } else {
        btn.addEventListener("click", function () {
          if (id === cur) return;
          switchDifficulty(id);
        });
      }
      row.appendChild(btn);
    });
  }

  function campaignSnapshot() {
    return {
      territoryId: state.progress.territoryId,
      unlocked: state.progress.unlocked.slice(),
      completed: state.progress.completed.slice(),
      clearsInChapter: state.progress.clearsInChapter || 0,
      drillBags: JSON.parse(JSON.stringify(state.progress.drillBags || {})),
      sessionIndex: state.progress.sessionIndex || 0,
    };
  }

  function applyCampaignSnapshot(snap) {
    state.progress.territoryId = snap.territoryId || "home";
    state.progress.unlocked = snap.unlocked || ["home"];
    state.progress.completed = snap.completed || [];
    state.progress.clearsInChapter = snap.clearsInChapter || 0;
    state.progress.drillBags = snap.drillBags || {};
    state.progress.sessionIndex = snap.sessionIndex || 0;
  }

  function freshCampaign() {
    return {
      territoryId: "home",
      unlocked: ["home"],
      completed: [],
      clearsInChapter: 0,
      drillBags: {},
      sessionIndex: 0,
    };
  }

  function switchDifficulty(id) {
    var cur = state.progress.difficulty || "normal";
    if (!state.progress.packs) state.progress.packs = {};
    state.progress.packs[cur] = campaignSnapshot();
    state.progress.difficulty = id;
    if (state.progress.packs[id]) applyCampaignSnapshot(state.progress.packs[id]);
    else applyCampaignSnapshot(freshCampaign());
    S.save(state);
    showHub();
  }

  function renderChapterProgress() {
    var box = $("chapter-progress");
    if (!box) return;
    var tid = state.progress.territoryId || "home";
    var name = territoryName(tid);
    var next = C.nextTerritoryId(tid);
    var nextName = next ? territoryName(next) : null;
    var cp = C.chapterProgress(state);
    var xp = state.stats.xp || 0;
    var durInfo = C.xpToNextDuration(xp);
    var pct = Math.round(cp.ratio * 100);

    box.classList.toggle("boss-ready", cp.readyBoss);
    var status;
    if (cp.readyBoss) {
      status =
        "Boss ready. Next Continue fights the chapter boss" +
        (nextName ? " to unlock <strong>" + nextName + "</strong>" : "") +
        ".";
    } else {
      status =
        "Clear <strong>" +
        cp.need +
        "</strong> accurate practice runs (≥" +
        Math.round(C.ACCURACY_GATE * 100) +
        "%), then beat the boss to open the next chapter.";
    }

    box.innerHTML =
      "<h2>" +
      C.difficultyLabel(state.progress.difficulty || "normal") +
      " · " +
      name +
      "</h2>" +
      '<p class="meta">' +
      status +
      "</p>" +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      pct +
      '"><span style="width:' +
      pct +
      '%"></span></div>' +
      '<p class="meta" style="margin-top:0.55rem">' +
      cp.clears +
      " / " +
      cp.need +
      " practice clears" +
      (cp.readyBoss ? " · boss queued" : "") +
      "</p>" +
      '<p class="xp-note">XP ' +
      xp +
      " → session length " +
      durInfo.currentMin +
      " min" +
      (durInfo.nextMin
        ? " · " + durInfo.remaining + " XP to " + durInfo.nextMin + " min"
        : " · max length") +
      ". Platinum relics: " +
      (state.stats.platinumRelics || 0) +
      " (new best line times). Chapters unlock by clears + boss; Normal→Nightmare→Hell by full playthrough.</p>";
  }

  function startSession() {
    var tid = state.progress.territoryId || "home";
    var tmeta = C.TERRITORIES[C.territoryIndex(tid)];
    if (tmeta && tmeta.stub) {
      state.progress.territoryId = "write";
      tid = "write";
    }
    ensureProgressShape();

    sessionStartedAt = Date.now();
    breakNudged = false;
    sessionAcc = [];
    sessionRelics = 0;
    lastPlatinumNote = null;
    phaseStats = { hits: 0, misses: 0 };
    state.sessionPlan.targetDurationMin = C.durationForXp(state.stats.xp || 0);

    el.hub.classList.add("hidden");
    el.settings.classList.add("hidden");
    el.session.classList.remove("hidden");
    el.territory.textContent =
      C.difficultyLabel(state.progress.difficulty || "normal") +
      " · " +
      territoryName(tid);

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
    var diff = state.progress.difficulty || "normal";
    var text = "";
    var cp = C.chapterProgress(state);
    var doBoss = name === "boss" || (name === "main" && cp.readyBoss);

    if (doBoss && name !== "warmup") {
      phase = "boss";
      name = "boss";
    }

    if (name === "warmup") {
      el.phase.textContent = "Warm-up · mixed keys";
      text = C.warmupFromWeak(S.weakCharsForWarmup(state));
    } else if (name === "main") {
      el.phase.textContent = "Main drill · " + territoryName(tid);
      text = C.takeDrill(state, tid);
      state.progress.lastDrillId = tid + ":" + state.progress.sessionIndex;
    } else if (name === "checkpoint") {
      el.phase.textContent = "Checkpoint · variety";
      text = C.takeDrill(state, tid);
      if (diff === "normal" && text.length > 90) text = text.slice(0, 90);
    } else if (name === "boss") {
      el.phase.textContent = "Boss · unlock next chapter";
      text = C.bossFor(tid, diff);
    }

    phaseText = text;
    clearLineTimer();

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
        maybeAwardPlatinum(p);
        nextPhase();
      },
    });

    renderPrompt();
    updateLiveStats(engine.progress());
    highlightKey(engine.progress().current, "target");
    startLineTimer();
    startListening();
    S.save(state);
  }

  function nextPhase() {
    if (phase === "warmup") {
      var cp = C.chapterProgress(state);
      beginPhase(cp.readyBoss ? "boss" : "main");
      return;
    }
    if (phase === "main") {
      beginPhase("checkpoint");
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
    if (el.lineTimer && engine) {
      el.lineTimer.textContent = formatSec(engine.elapsedMs());
    }
  }

  function formatSec(ms) {
    return (ms / 1000).toFixed(1) + "s";
  }

  function startLineTimer() {
    clearLineTimer();
    if (el.lineTimer) el.lineTimer.textContent = "0.0s";
    lineTimerId = setInterval(function () {
      if (engine && el.lineTimer) {
        el.lineTimer.textContent = formatSec(engine.elapsedMs());
      }
    }, 100);
  }

  function clearLineTimer() {
    if (lineTimerId) clearInterval(lineTimerId);
    lineTimerId = null;
  }

  function bestTimeKey() {
    return [
      state.progress.difficulty || "normal",
      state.progress.territoryId || "home",
      phase || "main",
      C.hashText(phaseText || ""),
    ].join("|");
  }

  function maybeAwardPlatinum(p) {
    if (phase === "warmup") return;
    if (!p || p.misses > 0 || p.accuracy < 0.98) return;
    var ms = engine ? engine.elapsedMs() : 0;
    if (ms <= 0) return;
    if (!state.stats.bestTimes) state.stats.bestTimes = {};
    var key = bestTimeKey();
    var prev = state.stats.bestTimes[key];
    if (prev != null && ms >= prev) return;
    state.stats.bestTimes[key] = ms;
    state.stats.platinumRelics = (state.stats.platinumRelics || 0) + 1;
    state.stats.xp += 25;
    sessionRelics += 1;
    lastPlatinumNote =
      "Platinum relic! New best " +
      formatSec(ms) +
      (prev != null ? " (was " + formatSec(prev) + ")" : "");
    showPlatinumFlash(lastPlatinumNote);
    S.save(state);
  }

  function showPlatinumFlash(msg) {
    var old = document.querySelector(".platinum-flash");
    if (old) old.remove();
    var div = document.createElement("div");
    div.className = "platinum-flash";
    div.innerHTML = '<div class="relic">' + msg + "</div>";
    document.body.appendChild(div);
    setTimeout(function () {
      div.remove();
    }, 1600);
  }

  function startListening() {
    listening = true;
  }

  function stopListening() {
    listening = false;
    clearLineTimer();
  }

  function onKey(e) {
    if (isRightGuiCode(e.code)) rightGuiDown = true;
    if (handleRightGuiChord(e)) return;

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
        startSession();
        return;
      }
      if (e.key === "Enter" || e.key === "c" || e.key === "C") {
        e.preventDefault();
        startSession();
      } else if (e.key === "," || e.key === "s" || e.key === "S") {
        // plain s = settings only when not using RGUI (handled above)
        if (rightGuiDown) return;
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
    var modalOk = $("modal-ok");
    if ((e.key === "Enter" || e.key === " ") && modalOk) {
      e.preventDefault();
      modalOk.click();
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

    var unlockedChapter = null;
    var difficultyUnlocked = null;
    var playthroughDone = false;
    var previousDifficulty = null;
    var earnedXp = 0;

    if (completed && !pain) {
      state.progress.sessionIndex += 1;
      earnedXp = Math.round(40 + avgAcc * 60);
      state.stats.xp += earnedXp;
      state.stats.accuracyHistory.push(Math.round(avgAcc * 1000) / 1000);
      state.sessionPlan.lastCompletedAt = new Date().toISOString();
      state.sessionPlan.streak += 1;
      state.sessionPlan.targetDurationMin = C.durationForXp(state.stats.xp);

      if (wasBoss) {
        if (avgAcc >= C.BOSS_ACCURACY) {
          var result = completeChapter();
          unlockedChapter = result.chapter;
          difficultyUnlocked = result.difficultyUnlocked;
          playthroughDone = result.playthroughDone;
          previousDifficulty = result.previousDifficulty || null;
        }
      } else if (avgAcc >= C.ACCURACY_GATE) {
        state.progress.passedSessions += 1;
        state.progress.clearsInChapter = (state.progress.clearsInChapter || 0) + 1;
      }
    } else if (pain) {
      state.stats.xp += 5;
      earnedXp = 5;
    }

    S.save(state);

    if (pain) {
      showModal(
        "Pain Stop",
        "Progress saved. Streak kept. Rest the right wrist -- quest waits.",
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

    showSessionSummary(
      avgAcc,
      wasBoss,
      earnedXp,
      unlockedChapter,
      difficultyUnlocked,
      playthroughDone,
      previousDifficulty
    );
  }

  function completeChapter() {
    var tid = state.progress.territoryId;
    if (state.progress.completed.indexOf(tid) === -1) {
      state.progress.completed.push(tid);
    }
    state.progress.clearsInChapter = 0;
    var next = C.nextTerritoryId(tid);
    if (next) {
      if (state.progress.unlocked.indexOf(next) === -1) {
        state.progress.unlocked.push(next);
      }
      state.progress.territoryId = next;
      return {
        chapter: next,
        difficultyUnlocked: null,
        previousDifficulty: null,
        playthroughDone: false,
      };
    }

    // Finished last playable chapter on this difficulty
    var diff = state.progress.difficulty || "normal";
    if (!state.progress.completedDifficulties) {
      state.progress.completedDifficulties = [];
    }
    if (state.progress.completedDifficulties.indexOf(diff) === -1) {
      state.progress.completedDifficulties.push(diff);
    }
    if (!state.progress.packs) state.progress.packs = {};
    state.progress.packs[diff] = campaignSnapshot();

    var nd = C.nextDifficulty(diff);
    var unlockedDiff = null;
    if (nd) {
      if (!state.progress.unlockedDifficulties) {
        state.progress.unlockedDifficulties = ["normal"];
      }
      if (state.progress.unlockedDifficulties.indexOf(nd) === -1) {
        state.progress.unlockedDifficulties.push(nd);
        unlockedDiff = nd;
      }
      state.progress.difficulty = nd;
      applyCampaignSnapshot(state.progress.packs[nd] || freshCampaign());
    }
    return {
      chapter: null,
      difficultyUnlocked: unlockedDiff,
      previousDifficulty: diff,
      playthroughDone: true,
    };
  }

  function showSessionSummary(
    avgAcc,
    wasBoss,
    earnedXp,
    unlockedChapter,
    difficultyUnlocked,
    playthroughDone,
    previousDifficulty
  ) {
    var cp = C.chapterProgress(state);
    var body;
    if (playthroughDone && difficultyUnlocked) {
      body =
        "Accuracy " +
        Math.round(avgAcc * 100) +
        "%. <strong>" +
        C.difficultyLabel(previousDifficulty || "normal") +
        "</strong> playthrough complete. Unlocked <strong>" +
        C.difficultyLabel(difficultyUnlocked) +
        "</strong> -- harder strings await.";
    } else if (playthroughDone) {
      body =
        "Accuracy " +
        Math.round(avgAcc * 100) +
        "%. Hell playthrough complete. Legendary.";
    } else if (unlockedChapter) {
      body =
        "Accuracy " +
        Math.round(avgAcc * 100) +
        "%. Boss cleared. Chapter unlocked: <strong>" +
        territoryName(unlockedChapter) +
        "</strong>.";
    } else if (wasBoss) {
      body =
        "Accuracy " +
        Math.round(avgAcc * 100) +
        "%. Boss not cleared yet (need ≥" +
        Math.round(C.BOSS_ACCURACY * 100) +
        "%). Try again when ready.";
    } else if (cp.readyBoss) {
      body =
        "Accuracy " +
        Math.round(avgAcc * 100) +
        "%. Practice clears done (" +
        cp.clears +
        "/" +
        cp.need +
        "). Next Continue = chapter boss.";
    } else {
      body =
        "Accuracy " +
        Math.round(avgAcc * 100) +
        "%. Chapter progress " +
        cp.clears +
        "/" +
        cp.need +
        " clears toward boss" +
        (avgAcc >= C.ACCURACY_GATE
          ? "."
          : " (this run did not count -- need ≥" +
            Math.round(C.ACCURACY_GATE * 100) +
            "%).");
    }
    body +=
      "<br><br>+" +
      earnedXp +
      " XP. Platinum relics this session: " +
      sessionRelics +
      " (new best clean line times).";

    showModal("Session complete", body, function () {
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
    ensureProgressShape();
    S.save(state);
    showHub();
  }

  return { init: init };
})();

document.addEventListener("DOMContentLoaded", function () {
  window.KKApp.init();
});
