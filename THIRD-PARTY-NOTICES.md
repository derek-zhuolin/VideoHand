# VideoHand Director Preview: asset provenance and third-party notices

VideoHand code is MIT. The following retain their own licenses; they are not relicensed by this package.

| Asset | Source/version | License |
|---|---|---|
| Doodle Icons / official design reference | https://github.com/oreo-design/doodle-icons ; npm @oreo-design/doodle-icons 0.1.0, 152 untouched SVGs; design reference fetched 2026-09-17 | assets/doodle/LICENSE (MIT) |
| GSAP | https://gsap.com ; bundled unmodified 3.14.2 | Header retained; assets/vendor/GSAP-LICENSE.txt links canonical Standard License |
| Schoolbell | https://github.com/google/fonts/tree/main/apache/schoolbell | assets/fonts/Schoolbell-LICENSE.txt (Apache 2.0, as actually distributed) |
| Xiaolai | https://github.com/lxgw/kose-font ; inherited VideoHand v2 common Chinese WOFF2 subset, internal version 3.126 | assets/fonts/Xiaolai-OFL.txt |
| VideoHand Sans | Derived common-character subset of Adobe Source Han Sans SC Regular, without hinting, family renamed VideoHand Sans | assets/fonts/SourceHanSans-OFL.txt (OFL 1.1); https://github.com/adobe-fonts/source-han-sans |
| Excalifont (legacy only) | https://github.com/excalidraw/excalidraw/tree/master/packages/excalidraw/fonts/Excalifont | assets/fonts/Excalifont-LICENSE.txt (OFL 1.1) |
| rough.js (legacy only) | https://github.com/rough-stuff/rough | assets/vendor/rough-LICENSE.txt (MIT) |

The original Oreo SVG files remain at `assets/doodle/icons/`. Their paths and upstream attribution are preserved; the Director preview does not replace or redraw those third-party assets.

## Original VideoHand extensions

These are VideoHand-authored additions covered by the repository's MIT license, not new assets attributed to Oreo Design:

| Extension | Source in this repository | Relationship to third-party assets |
|---|---|---|
| Layered laptop, cloud and tray outlines | `scripts/director-project.mjs`, `figure()` | Original hand-drawn SVG geometry; small identity badges reuse the untouched Oreo paths with their MIT attribution |
| Task-paper SVG object | `scripts/director-project.mjs`, `figure()` | Original paper outline and internal marks, with stable object IDs for animation |
| Semantic composition and finite action runtime | `scripts/director-plan.mjs`, `scripts/director-project.mjs`, `assets/director/runtime.js` | Original orchestration using the bundled GSAP library under its own license |
| White-background Director layout | `templates/director.css` | Original composition styling; bundled fonts retain the licenses listed above |
| Capacity handoff and team handoff studies | `examples/director/`, rendered silent studies in `docs/assets/director/` | Original illustrative scripts and arrangements; no claim to real user footage, measured statistics or completed presenter acceptance |

The 28-second capacity and 18-second team examples are silent visual studies. Private presenter recordings are not bundled. Tiny color-frame/sine-tone media produced by automated tests are synthetic technical fixtures, not voice recordings, avatars or acceptance samples. No voice clone, API credential, private Obsidian note or proprietary system font is part of the distributable.

VideoHand Sans is a reusable common-character subset, not a promise of complete Unicode coverage; coverage.json is checked before generation. The legacy warm-paper starter and its source notices remain available.

The upstream webpage uses infinite motion. VideoHand's separate MIT adapter preserves the original icon shapes and drives a finite deterministic GSAP timeline instead. This package is an adaptation, not an endorsement by Oreo Design.

“Director Preview” identifies the current source work, not a statement that version 3.1 has been published to GitHub Releases or npm.
