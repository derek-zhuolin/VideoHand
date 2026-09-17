# VideoHand 3 · Doodle Edition

Hand-drawn explainer videos with **Oreo Design / Doodle Icons** and **Hyperframes**. Warm paper, original ink icons, hand-written headings, stable captions, and continuous semantic scenes. Agent authors the story; the included scaffold is a starting point, not a universal auto-video generator.

- Primary visual source: https://github.com/oreo-design/doodle-icons
- Overall design reference: https://oreoui.com/doodle-icons
- 152 original SVGs pinned to `@oreo-design/doodle-icons@0.1.0`.
- Landscape 1920×1080 / portrait 1080×1920 / both, independently laid out.
- Deterministic GSAP draw/boil on one Hyperframes timeline.
- No API credentials, private voice, personal notes or external Skill dependency.

## Start from this local package

Node ≥22. Render tools: Hyperframes (validated with 0.8.42), ffmpeg and ffprobe, installed explicitly by the user.

```bash
node bin/videohand.mjs doctor
node bin/videohand.mjs icons arrow
node bin/videohand.mjs create --config examples/doodle/project.json --out ../my-doodle-film
node bin/videohand.mjs install --target /absolute/agent/skills/videohand
```

Install changes exactly one target. Existing non-Git targets require `--replace` and are backed up. No automatic network, downloads or Git sync. Local v3 is not a claim that version 3 has been published to npm.

Invoke `$videohand` explicitly in your Agent. See [SKILL.md](SKILL.md), [design](references/doodle-design.md), [audio](references/audio.md), [quality](references/quality.md), and [migration](references/portability.md). Legacy HW card assets remain available for existing projects.

`npm test` exercises build validation, portability and non-destructive installation. See [third-party notices](THIRD-PARTY-NOTICES.md); VideoHand's MIT license does not replace dependency/font licenses.
