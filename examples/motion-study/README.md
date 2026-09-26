# Object motion study · 3.2

A silent, editable 14.162-second portrait study: **voice → three records → sorting → redaction → a shareable note**. The camera stays still. Movement comes from a sequence of operations on the same objects.

[Watch the motion study](https://derek-zhuolin.github.io/VideoHand/#object-motion-study) · [MP4](../../docs/assets/object-motion-study.mp4)

![The same records become a redacted note](../../docs/assets/object-motion-study.jpg)

## Run

From the VideoHand root, with Node ≥22 and HyperFrames installed:

```sh
node examples/motion-study/build.mjs --out ../motion-study
hyperframes check ../motion-study --snapshots --json
hyperframes render ../motion-study -w 1 -o ../motion-study.mp4
```

The output directory must not exist, and must be outside VideoHand. The generated `index.html` is the editable project; it includes local fonts, SVG paths, GSAP and license files. After generation, edit the HTML directly. This example builder is not a general-purpose TTS command and does not provide speech recognition, semantic planning or an audio service.

## What the actions mean

| Time | Operation | Continuity |
| --- | --- | --- |
| 0–6.782 s | A microphone produces three records, with staggered launches and slower landings. | Each record gets one stable DOM id. |
| 6.782–9.432 s | The same records gather into a stack. | Sheets move in sequence; covered labels disappear as they become unreadable. |
| 9.432–11.132 s | A mask covers the sample identity field. | The existing front record enlarges; no replacement slide appears. |
| 11.132–14.162 s | The same sheet becomes a shareable note, settles and introduces a send icon. | The next operation is prepared before the shot ends. |

The generic labels demonstrate visual redaction only; they are not an automatic privacy filter. This study contains no real customer information, personal recordings, TTS voice identifiers or credentials. The supplied artwork is not copied from a private reference video.

`scene.mjs` exports the markup and finite GSAP timeline so the same sequence can be placed at a narration anchor in a longer, separately authored HTML project. Short `power2/power3` acceleration/deceleration and restrained settling are chosen for each operation. A fixed camera and readable holds are intentional; continuous nonzero camera movement is not required.

## Review

Check the normal-speed render, not just stills: are the record identities traceable, do arrivals decelerate, does one operation prepare the next, and is the main action aligned with the narration when used in a voiced film? Random seeks should reproduce the same frame. The optional `tools/check-frame-motion.py` reports sampled-frame freeze and low-motion intervals only; it cannot score natural motion or semantic alignment.

Oreo SVG paths remain unchanged and their MIT license is copied into the project. The sheet outlines and animation are original VideoHand additions; font and GSAP notices are included with the generated assets. See [third-party notices](../../THIRD-PARTY-NOTICES.md).
