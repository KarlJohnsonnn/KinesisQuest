# Later chapter: home-row symbol layer (Layer Gate)

## Goal

Keep fingers on the **home row** for high-frequency brackets and symbols used in coding and scientific writing. Avoid stretching to top-row Shift+number chords and far pinky reaches.

## Characters to prioritize

**Brackets (very high use)**

- `(` `)`
- `[` `]`
- `{` `}`

**Operators / specials (high use)**

- `@` `#` `$` `%` `^` `&` `*`
- `-` `_` `=` `+`

(Plus whatever else shows up often in Fortran / Python / bash / LaTeX / prompts.)

## Intended Adv360 approach

1. Finish stock QWERTY chapters first (Home → … → Code Forge) so base muscle memory is stable.
2. Design a **hold/tap layer** (thumb or easy modifier) that remaps **home-row keys** (and maybe nearby keys) to the symbols above while the layer is active.
3. Flash via ZMK / Clique; document the map in-repo when frozen.
4. Unlock **Layer Gate** drills in Kinesis Quest that practice *that* map (not stock Shift+number positions).

## Design notes (for when we implement)

- Prefer **one dedicated symbol layer** over many one-off remaps.
- Pair brackets symmetrically if possible (left/right home keys → open/close).
- Keep Space / Bksp / Enter on thumbs; do not steal those for rare symbols.
- Train the layer in short Layer Gate sessions before using it all day (same accuracy-before-speed rule).
- Until the layer is live and taught in-app, Symbol Caves / Code Forge still use **stock** key positions.

## Status

Stub only — not implemented in firmware or in the trainer yet.
