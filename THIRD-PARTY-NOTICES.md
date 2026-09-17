# Third-party assets

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

No voice recording, voice clone, API credential, Obsidian note or proprietary system font is part of the distributable. The neutral example is silent. VideoHand Sans is a reusable common-character subset, not a promise of complete Unicode coverage; coverage.json is checked before generation.

The upstream webpage uses infinite motion. VideoHand's separate MIT adapter preserves the original icon shapes and drives a finite deterministic GSAP timeline instead. This package is an adaptation, not an endorsement by Oreo Design.
