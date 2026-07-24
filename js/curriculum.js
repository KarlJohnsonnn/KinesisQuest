/* Kinesis Quest curriculum — Adv360 QWERTY, atmospheric-scientist stack */
window.KKCurriculum = (function () {
  var DURATION_STEPS = [10, 12, 15, 20, 25, 30];
  var SESSIONS_PER_DURATION_UP = 3;
  var BOSS_EVERY_N = 3;
  var ACCURACY_GATE = 0.92;
  var BOSS_ACCURACY = 0.94;

  var TERRITORIES = [
    {
      id: "home",
      name: "Home Wells",
      blurb: "ASDF / JKL; find the wells",
      keys: "asdfjkl;",
    },
    {
      id: "thumbs",
      name: "Thumb Essentials",
      blurb: "Space · Bksp · Enter — stay on keys",
      keys: " ",
    },
    {
      id: "near",
      name: "Near Reach",
      blurb: "Science words without stretch",
      keys: "qweruiopghtynm",
    },
    {
      id: "numbers",
      name: "Number Ridge",
      blurb: "Indices, years, levels",
      keys: "1234567890",
    },
    {
      id: "symbols",
      name: "Symbol Caves",
      blurb: "Punctuation for prose + paths",
      keys: ".,-/'\":",
    },
    {
      id: "code",
      name: "Code Forge",
      blurb: "Fortran · Python · bash · md · LaTeX",
      keys: "()[]{}=_<>\\",
    },
    {
      id: "layers",
      name: "Layer Gate",
      blurb: "Mouse-less nav layers — remap later",
      keys: "",
      stub: true,
    },
  ];

  var DRILLS = {
    home: [
      "aaa sss ddd fff jjj kkk lll ;;;",
      "asdf jkl; asdf jkl;",
      "sad lad flask; dad asks",
      "a sad lad; all fall; ask dad",
      "fjfj jf jf asdf jkl; fjdksla;",
    ],
    thumbs: [
      "a a a  s s s  d d d",
      "as as  df df  jk jk",
      "add a flask\nask dad\nfall",
      "save the run\nplot later\nok",
      "aaa\b\b\b asdf\nok",
    ],
    near: [
      "the quiet writer\ngrew right",
      "water vapor pathway",
      "tropopause height trend",
      "reanalysis grid point",
      "moisture transport right now",
    ],
    numbers: [
      "123 456 789 0",
      "i = 1, n\nk = 0",
      "year 2026 level 500",
      "dt = 0.25\nnz = 32",
      "era5 1940-2024",
    ],
    symbols: [
      "hi, dad.",
      "it's fine — really.",
      "path/to/file.nc",
      "say \"hello\" then go.",
      "Fig. 1: mean T, 850 hPa.",
    ],
    code: [
      "do i = 1, n\n  x(i) = x(i) + dt\nend do",
      "import numpy as np\nfig, ax = plt.subplots()",
      "#!/usr/bin/env bash\nfor f in *.nc; do echo $f; done",
      "## Methods\n- ERA5 reanalysis\n- $T$ tendency",
      "\\begin{equation}\n\\partial_t T = -u \\cdot \\nabla T\n\\end{equation}",
      "def anomaly(x, clim):\n    return x - clim.mean()",
      "gfortran -O2 main.f90 -o run.x",
    ],
  };

  var BOSSES = {
    home: "a sad lad asks dad; all fall fast",
    thumbs: "save the run\nplot later\nok",
    near: "water vapor pathway grew right",
    numbers: "era5 1940-2024 level 500",
    symbols: "Fig. 1: mean T, path/to/file.nc",
    code:
      "do i = 1, n\n  x(i) = x(i) + dt\nend do\nfig, ax = plt.subplots()",
  };

  var WARMUP_FALLBACK = "asdf jkl; asdf jkl; fj dk sl a;";

  function territoryIndex(id) {
    return TERRITORIES.findIndex(function (t) {
      return t.id === id;
    });
  }

  function nextTerritoryId(id) {
    var i = territoryIndex(id);
    if (i < 0 || i >= TERRITORIES.length - 1) return null;
    var n = TERRITORIES[i + 1];
    return n.stub ? null : n.id;
  }

  function drillFor(territoryId, sessionIndex) {
    var list = DRILLS[territoryId] || DRILLS.home;
    return list[sessionIndex % list.length];
  }

  function bossFor(territoryId) {
    return BOSSES[territoryId] || BOSSES.home;
  }

  function durationFor(passedSessions) {
    var step = Math.floor(passedSessions / SESSIONS_PER_DURATION_UP);
    return DURATION_STEPS[Math.min(step, DURATION_STEPS.length - 1)];
  }

  function isBossSession(sessionIndex) {
    return sessionIndex > 0 && sessionIndex % BOSS_EVERY_N === 0;
  }

  function warmupFromWeak(weakChars) {
    var pool = (weakChars && weakChars.length ? weakChars : "asdfjkl;").slice(0, 12);
    var out = [];
    var i;
    for (i = 0; i < 36; i++) {
      out.push(pool[i % pool.length]);
      if ((i + 1) % 4 === 0) out.push(" ");
    }
    return out.join("").trim() || WARMUP_FALLBACK;
  }

  return {
    DURATION_STEPS: DURATION_STEPS,
    ACCURACY_GATE: ACCURACY_GATE,
    BOSS_ACCURACY: BOSS_ACCURACY,
    TERRITORIES: TERRITORIES,
    DRILLS: DRILLS,
    BOSSES: BOSSES,
    WARMUP_FALLBACK: WARMUP_FALLBACK,
    territoryIndex: territoryIndex,
    nextTerritoryId: nextTerritoryId,
    drillFor: drillFor,
    bossFor: bossFor,
    durationFor: durationFor,
    isBossSession: isBossSession,
    warmupFromWeak: warmupFromWeak,
  };
})();
