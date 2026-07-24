/* Persist progress in localStorage */
window.KKSave = (function () {
  var KEY = "kk-quest-v1";

  function defaultState() {
    return {
      version: 1,
      progress: {
        territoryId: "home",
        unlocked: ["home", "thumbs"],
        completed: [],
        sessionIndex: 0,
        lastDrillId: null,
        passedSessions: 0,
      },
      stats: {
        accuracyHistory: [],
        wpmHistory: [],
        perKeyErrors: {},
        weakKeyQueue: [],
        totalChars: 0,
        totalMisses: 0,
        xp: 0,
      },
      sessionPlan: {
        targetDurationMin: 10,
        lastCompletedAt: null,
        streak: 0,
        mbUrgeHistory: [],
      },
      settings: {
        sound: false,
        fingerGuide: true,
        reduceMotion: false,
        tipSeen: false,
      },
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return merge(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function merge(base, over) {
    var out = JSON.parse(JSON.stringify(base));
    Object.keys(over || {}).forEach(function (k) {
      if (
        over[k] &&
        typeof over[k] === "object" &&
        !Array.isArray(over[k]) &&
        base[k] &&
        typeof base[k] === "object"
      ) {
        out[k] = merge(base[k], over[k]);
      } else {
        out[k] = over[k];
      }
    });
    return out;
  }

  function exportJson(state) {
    return JSON.stringify(state, null, 2);
  }

  function importJson(text) {
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid save");
    var state = merge(defaultState(), parsed);
    save(state);
    return state;
  }

  function reset() {
    var s = defaultState();
    save(s);
    return s;
  }

  /** Push char to weak queue (front if miss). Cap 24 unique-ish slots. */
  function noteKeyError(state, ch) {
    if (!ch || ch === "\n") ch = "↵";
    if (ch === " ") ch = "␣";
    state.stats.perKeyErrors[ch] = (state.stats.perKeyErrors[ch] || 0) + 1;
    var q = state.stats.weakKeyQueue.filter(function (c) {
      return c !== ch;
    });
    q.unshift(ch);
    state.stats.weakKeyQueue = q.slice(0, 24);
  }

  function noteKeyHit(state, ch) {
    if (!ch || ch === "\n") ch = "↵";
    if (ch === " ") ch = "␣";
    var err = state.stats.perKeyErrors[ch] || 0;
    if (err > 0) state.stats.perKeyErrors[ch] = err - 1;
    if ((state.stats.perKeyErrors[ch] || 0) <= 0) {
      state.stats.weakKeyQueue = state.stats.weakKeyQueue.filter(function (c) {
        return c !== ch;
      });
    }
  }

  function weakCharsForWarmup(state) {
    return state.stats.weakKeyQueue
      .map(function (c) {
        if (c === "␣") return " ";
        if (c === "↵") return "\n";
        return c;
      })
      .filter(function (c) {
        return c.length === 1;
      });
  }

  return {
    KEY: KEY,
    load: load,
    save: save,
    exportJson: exportJson,
    importJson: importJson,
    reset: reset,
    defaultState: defaultState,
    noteKeyError: noteKeyError,
    noteKeyHit: noteKeyHit,
    weakCharsForWarmup: weakCharsForWarmup,
  };
})();
