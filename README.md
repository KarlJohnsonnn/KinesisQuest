# Kinesis Quest

**Learn the Kinesis Advantage360 Pro without hating the first weeks.**

A free, offline HTML adventure that rebuilds muscle memory for the contoured wells and thumb keys — so you can leave the laptop keyboard behind for real work: writing, coding, and staying on the keys.

[Open the live app](#quick-start) · Built for **Advantage360 / Adv360 Pro** (stock QWERTY) · No account · Progress saves in your browser

---

## Why this exists

Switching to a Kinesis is worth it (less pinky stretch, thumbs do Space / Backspace / Enter), but your hands still “want” the MacBook or flat board. Random typing sites ignore that layout.

**Kinesis Quest** trains the *physical* Adv360 habits with short sessions, weak-key warm-ups, and content that matches how people actually use a keyboard:

| Track | What you practice |
|-------|-------------------|
| **Write Desk** | Email, text messages, LLM prompts, article prose |
| **Code Forge** | Fortran, Python, bash, Markdown, LaTeX (science / engineering stack) |
| **Home → Thumbs → Near → Numbers → Symbols** | Foundations before the hard stuff |

Sessions start around **10 minutes** and grow as you improve. **Pain Stop** saves progress and keeps your streak — never grind through wrist pain.

---

## Who it’s for

- New **Kinesis Advantage360 / Adv360 Pro** owners
- Anyone retraining after years on a laptop keyboard
- Writers + programmers who want **keyboard-first** work (less mouse)
- People who want practice that feels like mail, papers, and code — not only “asdf jkl;”

---

## Quick start

1. Clone or download this repo.
2. In the project folder, start a tiny local server:

```bash
python3 -m http.server 8765
```

3. Open [http://localhost:8765](http://localhost:8765) in Safari or Chrome.
4. Type on your **physical Kinesis** (not the laptop keys).
5. Press **Enter** (or click **Continue last quest**).

Progress is stored in `localStorage` on that browser. Export / import a JSON save from **Settings** if you switch machines.

> Tip: freeze custom ZMK remaps until Home Wells + Thumb Essentials feel natural. Learn stock positions first; customize later.

---

## How a session works

1. **Warm-up** — keys you’ve been missing  
2. **Main drill** — current territory (writing or coding content as you unlock)  
3. **Checkpoint** (or occasional **boss**)  
4. Optional **MB urge** check — how strong is the pull back to the old keyboard?

Unlock order:

`Home Wells` → `Thumb Essentials` → `Near Reach` → `Number Ridge` → `Symbol Caves` → **`Write Desk`** → **`Code Forge`** → Layer Gate (stub for later remaps)

---

## Keyboard shortcuts (mouse optional)

| Where | Keys |
|-------|------|
| Hub | `Enter` / `c` continue · `,` / `s` settings |
| Tip panel | `Enter` dismiss + start |
| Session | `Ctrl+Shift+P` Pain Stop · `Ctrl+Shift+E` End |
| Settings | `Esc` back · `Ctrl+Enter` start paste drill |
| After session | `1`–`5` MB-urge · `Esc` skip |

**Paste drill:** drop a real email, prompt, paragraph, or code snippet in Settings and practice transfer to real work.

---

## Design principles (short)

- Accuracy before speed  
- Thumbs early (Space / Bksp / Enter) — drop laptop pinky habits  
- Weak-key targeting, not flashcard SRS cosplay  
- Distributed practice (short sessions that get longer)  
- Pain-aware: stopping is allowed and rewarded with a kept streak  

---

## Repo layout

```
index.html      # app shell + Adv360-style key guide
css/quest.css   # UI
js/curriculum.js
js/engine.js
js/save.js
js/app.js
```

No build step. No backend. Classic script tags so it runs with a simple local server.

---

## Roadmap ideas

- Deeper **Layer Gate** lessons for mouse-less nav (ZMK / Clique)
- Optional layout profiles beyond stock QWERTY
- Richer figure/IDE workflow drills

PRs and issues welcome — especially from new Kinesis users sharing what confused them in week one.

---

## License

Released under the [MIT License](LICENSE).

Shared so other Adv360 users can get productive faster. If you fork it, keep the pain-aware session design.

**Hardware:** [Kinesis Advantage360](https://kinesis-ergo.com/) · firmware notes often live in the [Adv360-Pro-ZMK](https://github.com/KinesisCorporation/Adv360-Pro-ZMK) ecosystem.
