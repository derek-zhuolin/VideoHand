# VideoHand

**Turn a paragraph of text into a hand-drawn, marker-on-paper video — an agent skill that picks the right scene for every sentence from 63 drawn cards.**

```bash
npx github:derek-zhuolin/VideoHand
```

![16 of the 63 hand-drawn cards looping](docs/assets/wall.gif)

*↑ 16 of the 63 cards.* **[▶ See all 63 on the live wall](https://derek-zhuolin.github.io/VideoHand/)** —
nothing to install. Switch 9:16 / 16:9 / 1:1 and English / Chinese, and dial the stroke feel
with four sliders. Every cell runs that card's **real code**, so the wall doubles as a smoke
test: a broken card shows up red.

[![CI](https://github.com/derek-zhuolin/VideoHand/actions/workflows/ci.yml/badge.svg)](https://github.com/derek-zhuolin/VideoHand/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/videohand.svg)](https://www.npmjs.com/package/videohand)
[![node](https://img.shields.io/node/v/videohand.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](./LICENSE)

**English** | [中文](./README.zh-CN.md) — the Chinese doc is the full story; this page is the tour.

---

## What it is

You give your agent (Claude Code / Codex / Cursor / …) a paragraph of text. It reads this
skill and decides, sentence by sentence, what to draw and how — then hands you an MP4 that
looks like someone sketched it on paper while thinking out loud.

No templates. The structure of your script decides the visuals:

| Your sentence | The card it picks |
|---|---|
| "A becomes B becomes C" | flow arrows |
| "pick two of these three" | impossible triangle |
| "it's not X, it's Y" | strike-through, rewrite |
| "it comes down to one thing" | giant word slam |
| "there are four reasons" | fishbone diagram |

Hard rules on top: no two adjacent shots alike, high-energy shots never cluster,
one breathing-room shot per film.

## Why hand-drawn

Wobbly lines and crooked boxes read as *thinking*, not *selling* — viewers drop their guard.
The wobble isn't a filter: shapes render through [rough.js](https://roughjs.com)
(Excalidraw's own engine) with seeded randomness, set in Excalifont + Xiaolai — the same
faces Excalidraw ships. The same sentence wobbles in the same place on every render.

## Install

```bash
npx github:derek-zhuolin/VideoHand
```

The only prerequisite is [Node](https://nodejs.org) ≥ 22. The command installs straight
from this repo — no npm account, no git required. It detects which agents you have
(Claude Code / Codex / Cursor / Crush / Gemini / WorkBuddy) and installs into each
existing skill directory. `ffmpeg` is needed only for the final MP4 render.

Something broken? `npx github:derek-zhuolin/VideoHand doctor` splits "it doesn't run"
into six concrete causes, each with a paste-ready fix.

## Quality gates

Five lint gates run **before** rendering — all must exit 0 or the render is refused:
cross-platform structure, browser runtime errors, shot-selection discipline
(no adjacent repeats, energy pacing), motion scale (durations, stagger, easing), and a
pixel-level frame audit (nothing sinks below the safe area, no empty seams, no
placeholder-looking grey bars). Chinese line-breaking gets its own gate: no orphan
characters, ever.

## The card library

Nine families, 53 cards + 10 bonus = 63: openers, assertions, lists, flows, comparisons,
data, metaphors, UI frames, end cards. Each card is ~30 lines of config over 65
deterministic stroke primitives, so adding one is an evening, not a project.
See them all move on the [live wall](https://derek-zhuolin.github.io/VideoHand/).

## License

[MIT](./LICENSE) — with thanks to [rough.js](https://roughjs.com),
[Excalidraw](https://excalidraw.com), and
[wired-elements](https://github.com/rough-stuff/wired-elements).
