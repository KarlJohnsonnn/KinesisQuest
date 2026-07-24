/* Kinesis Quest curriculum — Adv360 QWERTY, writing + science coding */
window.KKCurriculum = (function () {
  var DURATION_STEPS = [10, 12, 15, 20, 25, 30];
  var XP_PER_DURATION_STEP = 180;
  var CLEARS_BEFORE_BOSS = 3;
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
      id: "write",
      name: "Write Desk",
      blurb: "Mail · SMS · LLM prompts · articles",
      keys: "abcdefghijklmnopqrstuvwxyz .,!?'-",
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
      blurb: "Home-row ()[]{} @#$… layer — after stock map sticks",
      keys: "()[]{}@#$%^&*-_=+",
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
      "fads lads; fall falls; ask",
      "salad; flask; dad; lass",
      "jjj fff aaa ;;; kkk ddd",
      "all asdf; all jkl; all fall",
      "ska ska; fla fla; dad dad",
      "left hand asdf; right hand jkl;",
      "home row only: asdf jkl; asdf",
      "aaafffjjj; dddkkklll;",
      "flash; glass; fall; ask; lad",
      "jk jk as as df df l; l;",
    ],
    thumbs: [
      "a a a  s s s  d d d",
      "as as  df df  jk jk",
      "add a flask\nask dad\nfall",
      "save the run\nplot later\nok",
      "aaa\b\b\b asdf\nok",
      "type a line\nthen another\nok",
      "space space space\nok enter",
      "fix a typo: asdd\b\bf jkl;",
      "one\ntwo\nthree\nfour",
      "draft note\nsave it\nsend later",
      "hit space often: a s d f j k l",
      "backspace drill: xxx\b\b\b done",
      "short lines only\nlike this\nyes",
      "thumb rest: as df jk l;\nok",
    ],
    near: [
      "the quiet writer\ngrew right",
      "water vapor pathway",
      "tropopause height trend",
      "reanalysis grid point",
      "moisture transport right now",
      "please review this draft",
      "thanks for your quick reply",
      "write the next paragraph here",
      "upper troposphere wave train",
      "pretty quiet night writeup",
      "query the prior run output",
      "grow the point power right",
      "weather type report tonight",
      "put your pen up; try again",
      "right path; write the truth",
    ],
    numbers: [
      "123 456 789 0",
      "i = 1, n\nk = 0",
      "year 2026 level 500",
      "dt = 0.25\nnz = 32",
      "era5 1940-2024",
      "meeting at 14:30 on 2026-07-24",
      "call at 09:15 on 2026-08-01",
      "deadline 17:00 on 2026-09-30",
      "run 01 of 12; seed 42",
      "lat 51.3 lon 12.4",
      "850 700 500 300 hPa",
      "n = 128; steps = 3600",
      "v1.2.0 build 20260724",
      "score 92; target 95",
      "mix 1a 2s 3d 4f 7j 8k 9l",
    ],
    symbols: [
      "hi, dad.",
      "it's fine — really.",
      "path/to/file.nc",
      "say \"hello\" then go.",
      "Fig. 1: mean T, 850 hPa.",
      "Hi Jane,\nthanks — see you soon.",
      "Re: draft v2 — please reply.",
      "Subject: Q3 notes / follow-up",
      "P.S. I'll send the PDF tonight.",
      "Wait... is that correct?",
      "email: name@institute.edu",
      "cite Smith et al. (2024).",
      "use path/to/out_v2.nc",
      "yes / no / maybe?",
      "Note: don't skip Fig. 2.",
    ],
    write: [
      "Hi Alex,\nThanks for the update. I'll review the draft today and send comments by Friday.\nBest,\nSam",
      "Subject: Meeting notes\nHi team,\nPlease find attached the agenda for Thursday's call.\nThanks,\nJordan",
      "hey — running 10 min late. start without me?",
      "got it, thanks! i'll send the revised figure tonight.",
      "Summarize this abstract in three bullet points for a non-expert audience.",
      "Rewrite this paragraph more concisely while keeping the scientific meaning.",
      "Moisture transport across the tropopause remains a key uncertainty in reanalysis products.",
      "We find a statistically significant trend in mid-tropospheric humidity over 1980-2020.",
      "Dear colleagues,\nCould you please check the methods section before Friday?\nKind regards",
      "Quick prompt: list five risks in this experimental design.",
      "on my way. eta 5 min.",
      "This paper argues that local moisture recycling dominates summer extremes.",
      "Please expand the introduction with one paragraph on prior work.",
      "Hi — can we move the call to Tuesday afternoon?",
      "Turn these notes into a polite decline email.",
    ],
    code: [
      "do i = 1, n\n  x(i) = x(i) + dt\nend do",
      "import numpy as np\nfig, ax = plt.subplots()",
      "#!/usr/bin/env bash\nfor f in *.nc; do echo $f; done",
      "## Methods\n- ERA5 reanalysis\n- $T$ tendency",
      "\\begin{equation}\n\\partial_t T = -u \\cdot \\nabla T\n\\end{equation}",
      "def anomaly(x, clim):\n    return x - clim.mean()",
      "gfortran -O2 main.f90 -o run.x",
      "if (ierr /= 0) stop 'netcdf error'",
      "ax.set_xlabel('time [h]')\nax.set_ylabel('T [K]')",
      "rsync -avP out/ remote:runs/exp01/",
      "\\section{Results}\nWe compare three experiments.",
      "for t in range(nt):\n    step(state, dt)",
      "module load netcdf\nmake -j4",
      "call random_seed()\nx = x + noise",
      "plt.savefig('fig01.pdf', bbox_inches='tight')",
    ],
  };

  var BOSSES = {
    home: "a sad lad asks dad; all fall fast; flasks and salads",
    thumbs: "save the run\nplot later\nok\nfix typo: asdd\b\bf",
    near: "please review this draft pathway tonight",
    numbers: "meeting at 14:30 on 2026-07-24; level 500",
    symbols: "Dear colleague,\nFig. 1: mean T, path/to/file.nc",
    write:
      "Hi team,\nPlease review this draft by Friday.\nThanks — Sam\n\nSummarize the abstract in three bullets.",
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

  function drillList(territoryId) {
    return DRILLS[territoryId] || DRILLS.home;
  }

  function shuffleCopy(arr) {
    var a = arr.slice();
    var i;
    for (i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  /** Pop next unique drill from bag; refill shuffled when empty. */
  function takeDrill(state, territoryId) {
    if (!state.progress.drillBags) state.progress.drillBags = {};
    var list = drillList(territoryId);
    var bag = state.progress.drillBags[territoryId];
    if (!bag || !bag.length) {
      bag = shuffleCopy(
        list.map(function (_, idx) {
          return idx;
        })
      );
      state.progress.drillBags[territoryId] = bag;
    }
    var idx = bag.pop();
    return list[idx];
  }

  function bossFor(territoryId) {
    return BOSSES[territoryId] || BOSSES.home;
  }

  function durationForXp(xp) {
    var step = Math.floor((xp || 0) / XP_PER_DURATION_STEP);
    return DURATION_STEPS[Math.min(step, DURATION_STEPS.length - 1)];
  }

  function xpToNextDuration(xp) {
    var cur = durationForXp(xp);
    var step = Math.floor((xp || 0) / XP_PER_DURATION_STEP);
    if (step >= DURATION_STEPS.length - 1) {
      return { currentMin: cur, nextMin: null, need: 0, have: xp };
    }
    var nextAt = (step + 1) * XP_PER_DURATION_STEP;
    return {
      currentMin: cur,
      nextMin: DURATION_STEPS[step + 1],
      need: nextAt,
      have: xp || 0,
      remaining: Math.max(0, nextAt - (xp || 0)),
    };
  }

  function chapterProgress(state) {
    var clears = state.progress.clearsInChapter || 0;
    var need = CLEARS_BEFORE_BOSS;
    var readyBoss = clears >= need;
    return {
      clears: Math.min(clears, need),
      need: need,
      readyBoss: readyBoss,
      ratio: Math.min(1, clears / need),
    };
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
    XP_PER_DURATION_STEP: XP_PER_DURATION_STEP,
    CLEARS_BEFORE_BOSS: CLEARS_BEFORE_BOSS,
    ACCURACY_GATE: ACCURACY_GATE,
    BOSS_ACCURACY: BOSS_ACCURACY,
    TERRITORIES: TERRITORIES,
    DRILLS: DRILLS,
    BOSSES: BOSSES,
    WARMUP_FALLBACK: WARMUP_FALLBACK,
    territoryIndex: territoryIndex,
    nextTerritoryId: nextTerritoryId,
    takeDrill: takeDrill,
    bossFor: bossFor,
    durationForXp: durationForXp,
    xpToNextDuration: xpToNextDuration,
    chapterProgress: chapterProgress,
    warmupFromWeak: warmupFromWeak,
  };
})();
