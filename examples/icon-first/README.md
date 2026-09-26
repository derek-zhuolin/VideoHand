# Icon-first study · VideoHand 3.3

A silent 20-second portrait study of **reuse → obstruction → drawing**. Original Oreo icons lead the explanation; a hand-drawn presenter placeholder stays in the lower-right circle and briefly moves to the center with a supporting lock action.

[Watch the study](https://derek-zhuolin.github.io/VideoHand/#icon-first-study) · [MP4](../../docs/assets/icon-first-study.mp4) · [Composition rules](../../references/icon-first-composition.md)

![Icon-first frames](../../docs/assets/icon-first-overview.jpg)

## Build

From the repository root, with Node ≥22 and HyperFrames installed:

```sh
node examples/icon-first/build.mjs --out ../icon-first-study
hyperframes check ../icon-first-study --snapshots --json
hyperframes render ../icon-first-study -w 1 -o ../icon-first-study.mp4
```

Choose an existing parent directory outside VideoHand and a new output directory. The builder refuses to overwrite existing projects. It copies fonts, GSAP, and their notices, and embeds unchanged Oreo SVG paths. The resulting `index.html` is the editable source; `storyboard.json` describes its neutral sample content.

## What to watch

| Time | Action | Composition |
| --- | --- | --- |
| 0–4.48 s | The same puzzle piece docks into two tools. | One shared object, two destinations. |
| 4.48–7.28 s | A tool moves forward with a flame indicating popularity. | Two icons; no decorative container. |
| 7.28–10.8 s | The tool approaches, the lock closes, the tool retreats. | Movement makes the obstacle visible. |
| 10.8–13.12 s | The presenter briefly leads while the lock closes beside it. | A supported statement, with the previous object retained. |
| 13.12–20 s | A pencil traces the mountain path and adds the sun. | A picture changes state instead of floating as a sticker. |

Titles and Xiaolai captions use one almond-colored (`#ECB775`) hand-drawn emphasis per line of meaning. The stage avoids large paper props, oval washes, and unrelated squiggles. A finite GSAP timeline determines each frame; the pencil follows `getPointAtLength()` on the same path being drawn.

This is a custom HTML example, not a new CLI preset or an automatic editing service. It demonstrates one portrait composition. To use real footage, supply your own authorized local media, transcribe and time it, and revise the scene around its meaning; do not assume these sample timing anchors match another recording. Standard `prepare/compose` behavior is unchanged.

The public study is silent and uses generic text and an icon in place of a real presenter. No private recording, transcript, voice identifier, credential, or machine path is included. It does not demonstrate lip sync, automatic face tracking, or automatic layout avoidance. See [third-party notices](../../THIRD-PARTY-NOTICES.md).
