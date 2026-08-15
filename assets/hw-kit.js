/* ═══════════════════════════════════════════════════════════════════
   hw-kit.js — stroke-primitive library for hand-drawn video frames
   ───────────────────────────────────────────────────────────────────
   Why this exists: frames used to carry 60–100 lines of copy-pasted runtime plus ad-hoc path
   builders invented on the spot, so a single frame ran 250–350 lines. With this library a
   scene card is about 30 lines of configuration.

   The three laws are baked into the defaults, so cards never restate them:
     1. Draw-on entrance   HW.draw()    — every shape is stroked into existence
     2. Boil               HW.boil()    — sweet spot amp .55 / rot .15 / frameDrop 4
     3. Word stagger       HW.wordsIn() — text appears word by word, never all at once

   Motion scale is fixed here as well:
     element moves .30–.50s · stagger .06–.10s
     entrances expo.out · exits power3.in · repositioning power4.inOut

   Determinism: only HW.hash(n, seed). No Math.random, no Date.now, no network access.

   Usage — load once inside each frame's <template>. Outside the template it never executes:
     <template>
       <script src="assets/vendor/hw-kit.js"></script>
       ...
   =================================================================== */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var HW = {};

  /* 引擎版本。**它存在的唯一理由是让"带着旧引擎出片"这件事能被看见。**

     这份 kit 会被复制到两个地方，两处都会悄悄漂移：
       ① 各个 agent 的 skill 目录（Claude Code / WorkBuddy / Codex / Cursor …）
       ② **每一支片自己的 assets/**（建片时 copy 一份进去）

     ② 更常发生也更难发现：引擎在仓库里修好了，片目录里那份还是老的，
     于是"改完了怎么还是老问题"。实测就这么绕了很久 —— 改完 kit 的第一次重渲毫无变化，
     因为片子读的是它自己那份三小时前的拷贝。

     光靠这个字符串不够（人会忘记 bump），所以真正的检查是
     `scripts/portability-lint.mjs` 里按**内容哈希**比对片子的 assets/ 和 skill 的 assets/。
     片子从来不该改引擎，所以"不一样"＝"旧了"，不需要判断谁新。
     这个版本号只是让人和日志读得懂。 */
  HW.VERSION = "2.1.0";

  /* ═══════════ 0 · Deterministic noise ══════════════════════════ */

  HW.hash = function (n, seed) {
    var x = Math.sin(n * 127.1 + (seed || 1) * 311.7) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };

  /* Jitter source: each W() call yields the next deterministic offset. */
  function wobbler(seed, amp) {
    var i = 0;
    return function () {
      i += 1;
      return HW.hash(i, seed || 1) * (amp === undefined ? 3.5 : amp);
    };
  }

  function opt(o, k, dflt) {
    return o && o[k] !== undefined ? o[k] : dflt;
  }
  function n1(v) {
    return Math.round(v * 10) / 10;
  }

  /* ═══════════ 1 · Point lists to path data ══════════════════════ */

  /* Polyline — straight segments with jittered vertices. */
  HW.polyD = function (pts) {
    var d = "M " + n1(pts[0][0]) + " " + n1(pts[0][1]);
    for (var i = 1; i < pts.length; i++) d += " L " + n1(pts[i][0]) + " " + n1(pts[i][1]);
    return d;
  };

  /* Smooth curve — quadratic beziers through segment midpoints, so the stroke reads continuous. */
  HW.smoothD = function (pts) {
    if (pts.length < 3) return HW.polyD(pts);
    var d = "M " + n1(pts[0][0]) + " " + n1(pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2;
      var my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += " Q " + n1(pts[i][0]) + " " + n1(pts[i][1]) + " " + n1(mx) + " " + n1(my);
    }
    var last = pts[pts.length - 1];
    d += " L " + n1(last[0]) + " " + n1(last[1]);
    return d;
  };

  /* Sample jittered points along a line, optionally bowed. */
  function sampleLine(x1, y1, x2, y2, segs, W, bow) {
    var pts = [];
    var dx = x2 - x1,
      dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len,
      ny = dx / len; /* normal */
    for (var i = 0; i <= segs; i++) {
      var t = i / segs;
      var b = bow ? Math.sin(t * Math.PI) * bow : 0;
      pts.push([x1 + dx * t + nx * b + W(), y1 + dy * t + ny * b + W()]);
    }
    return pts;
  }

  /* ═══════════ 2 · Container primitives ═════════════════════════ */

  /* Wobbly rounded rectangle. The most-used primitive by a wide margin. */
  HW.rect = function (w, h, o) {
    var r = opt(o, "r", Math.min(26, Math.min(w, h) * 0.12));
    var W = wobbler(opt(o, "seed", 1), opt(o, "amp", 3.5));
    var d = "M " + n1(r + W()) + " " + n1(W());
    d += " L " + n1(w / 2 + W()) + " " + n1(W());
    d += " L " + n1(w - r + W()) + " " + n1(W());
    d += " Q " + n1(w + W()) + " " + n1(W()) + " " + n1(w + W()) + " " + n1(r + W());
    d += " L " + n1(w + W()) + " " + n1(h / 2 + W());
    d += " L " + n1(w + W()) + " " + n1(h - r + W());
    d += " Q " + n1(w + W()) + " " + n1(h + W()) + " " + n1(w - r + W()) + " " + n1(h + W());
    d += " L " + n1(w / 2 + W()) + " " + n1(h + W());
    d += " L " + n1(r + W()) + " " + n1(h + W());
    d += " Q " + n1(W()) + " " + n1(h + W()) + " " + n1(W()) + " " + n1(h - r + W());
    d += " L " + n1(W()) + " " + n1(h / 2 + W());
    d += " L " + n1(W()) + " " + n1(r + W());
    d += " Q " + n1(W()) + " " + n1(W()) + " " + n1(r + W()) + " " + n1(W());
    return d;
  };

  /* Wobbly ellipse and circle — circling, Venn diagrams, heads. */
  HW.ellipse = function (rx, ry, o) {
    var W = wobbler(opt(o, "seed", 1), opt(o, "amp", 4));
    var segs = opt(o, "segs", 22);
    var over = opt(o, "overshoot", 0.12); /* a real pen overshoots when closing a loop */
    var pts = [];
    for (var i = 0; i <= segs; i++) {
      var a = (i / segs) * (Math.PI * 2 + over) - Math.PI / 2;
      pts.push([rx + Math.cos(a) * rx + W(), ry + Math.sin(a) * ry + W()]);
    }
    return HW.smoothD(pts);
  };

  HW.circle = function (r, o) {
    return HW.ellipse(r, r, o);
  };

  /* Circle centred at an arbitrary point. Multi-path primitives — a gear hub, a bulb's glass,
     a stick figure's head — must share one local coordinate space, or each sub-shape lands at
     its own top-left corner and the assembly falls apart. */
  function circleAt(cx, cy, r, seed, amp) {
    var W = wobbler(seed || 1, amp === undefined ? 2.4 : amp);
    var pts = [];
    for (var i = 0; i <= 20; i++) {
      var a = (i / 20) * (Math.PI * 2 + 0.1) - Math.PI / 2;
      pts.push([cx + Math.cos(a) * r + W(), cy + Math.sin(a) * r + W()]);
    }
    return HW.smoothD(pts);
  }
  HW.circleAt = circleAt;

  /* Sticky note with a curled corner. The curl is a folded flap, not a missing corner. */
  HW.sticky = function (w, h, o) {
    var W = wobbler(opt(o, "seed", 1), opt(o, "amp", 2.6));
    var fold = opt(o, "fold", Math.min(52, w * 0.18));
    var body = HW.polyD([
      [W(), W()],
      [w + W(), W()],
      [w + W(), h - fold + W()],
      [w - fold + W(), h + W()],
      [W(), h + W()],
      [W(), W()],
    ]);
    /* the flap: folds back inward from both ends of the cut */
    var curl = HW.polyD([
      [w + W(), h - fold + W()],
      [w - fold * 0.72 + W(), h - fold * 0.72 + W()],
      [w - fold + W(), h + W()],
    ]);
    return [body, curl];
  };

  /* Speech bubble. tail: 'bl' | 'br' | 'tl' | 'tr' | 'none' */
  HW.bubble = function (w, h, o) {
    var seed = opt(o, "seed", 1);
    var tail = opt(o, "tail", "bl");
    var body = HW.rect(w, h, { r: Math.min(h * 0.42, 64), seed: seed, amp: opt(o, "amp", 3.2) });
    if (tail === "none") return [body];
    var W = wobbler(seed + 7, 2.5);
    var tx = tail.charAt(1) === "l" ? w * 0.22 : w * 0.78;
    var ty = tail.charAt(0) === "b" ? h : 0;
    var dir = tail.charAt(0) === "b" ? 1 : -1;
    var tip = HW.polyD([
      [tx - 26 + W(), ty + W()],
      [tx - 6 + W(), ty + 46 * dir + W()],
      [tx + 30 + W(), ty + W()],
    ]);
    return [body, tip];
  };

  /* Thought cloud — assembled from N outward-bulging lobe arcs, not a rounded ellipse. */
  HW.cloud = function (w, h, o) {
    var seed = opt(o, "seed", 1);
    var W = wobbler(seed, 2.6);
    var lobes = opt(o, "lobes", 8);
    var rx = w / 2,
      ry = h / 2;
    var pts = [];
    for (var i = 0; i < lobes; i++) {
      var a = (i / lobes) * Math.PI * 2 - Math.PI / 2;
      /* lobe centres sit on an inner ring; the radius must be large enough to bulge out */
      var lr = Math.min(rx, ry) * 0.5 * (1 + HW.hash(i, seed) * 0.22);
      var ccx = rx + Math.cos(a) * (rx - lr * 0.85);
      var ccy = ry + Math.sin(a) * (ry - lr * 0.85);
      var span = ((Math.PI * 2) / lobes) * 1.3;
      for (var j = 0; j <= 5; j++) {
        var t = a - span / 2 + (span * j) / 5;
        pts.push([ccx + Math.cos(t) * lr + W(), ccy + Math.sin(t) * lr + W()]);
      }
    }
    pts.push(pts[0]);
    return HW.smoothD(pts);
  };

  /* Ribbon banner — title cards. */
  HW.ribbon = function (w, h, o) {
    var W = wobbler(opt(o, "seed", 1), 3);
    var notch = opt(o, "notch", 40);
    return HW.polyD([
      [W(), W()],
      [w + W(), W()],
      [w - notch + W(), h / 2 + W()],
      [w + W(), h + W()],
      [W(), h + W()],
      [notch + W(), h / 2 + W()],
      [W(), W()],
    ]);
  };

  /* Drawn window frame — the interface-evidence family. */
  HW.windowFrame = function (w, h, o) {
    var seed = opt(o, "seed", 1);
    var barH = opt(o, "barH", 56);
    var frame = HW.rect(w, h, { r: opt(o, "r", 18), seed: seed, amp: 2.6 });
    var W = wobbler(seed + 3, 2.2);
    var bar = HW.polyD([
      [W(), barH + W()],
      [w + W(), barH + W()],
    ]);
    var dots = [];
    for (var i = 0; i < 3; i++) {
      dots.push(circleAt(28 + i * 30, barH / 2, 7, seed + i * 5, 1.1));
    }
    return { frame: frame, bar: bar, dots: dots, barH: barH, all: [frame, bar].concat(dots) };
  };

  /* ═══════════ 3 · Line primitives ══════════════════════════════ */

  HW.line = function (x1, y1, x2, y2, o) {
    var W = wobbler(opt(o, "seed", 1), opt(o, "amp", 2.2));
    return HW.smoothD(sampleLine(x1, y1, x2, y2, opt(o, "segs", 6), W, opt(o, "bow", 0)));
  };

  /* Wavy underline — the signature marker stroke of this style. */
  HW.wave = function (w, o) {
    var seed = opt(o, "seed", 1);
    var amp = opt(o, "amp", 9);
    var segs = opt(o, "segs", Math.max(6, Math.round(w / 90)));
    var d = "M 0 " + n1(HW.hash(0, seed) * 4);
    for (var i = 1; i <= segs; i++) {
      var x = (w / segs) * i;
      var y = HW.hash(i * 5 + 1, seed) * 6;
      var cx = x - w / segs / 2 + HW.hash(i * 5 + 2, seed) * 10;
      var cy = (i % 2 ? -1 : 1) * (amp + HW.hash(i * 5 + 3, seed) * 4);
      d += " Q " + n1(cx) + " " + n1(cy) + " " + n1(x) + " " + n1(y);
    }
    return d;
  };

  HW.zigzag = function (w, h, o) {
    var W = wobbler(opt(o, "seed", 1), 2);
    var segs = opt(o, "segs", 8);
    var pts = [];
    for (var i = 0; i <= segs; i++) {
      pts.push([(w / segs) * i + W(), (i % 2 ? h : 0) + W()]);
    }
    return HW.polyD(pts);
  };

  HW.arc = function (r, a0, a1, o) {
    var W = wobbler(opt(o, "seed", 1), opt(o, "amp", 2.5));
    var segs = opt(o, "segs", 18);
    var pts = [];
    for (var i = 0; i <= segs; i++) {
      var a = a0 + ((a1 - a0) * i) / segs;
      pts.push([r + Math.cos(a) * r + W(), r + Math.sin(a) * r + W()]);
    }
    return HW.smoothD(pts);
  };

  HW.spiral = function (r, o) {
    var turns = opt(o, "turns", 2.2);
    var W = wobbler(opt(o, "seed", 1), 2);
    var segs = opt(o, "segs", Math.round(turns * 22));
    var pts = [];
    for (var i = 0; i <= segs; i++) {
      var t = i / segs;
      var a = t * Math.PI * 2 * turns;
      var rr = r * t;
      pts.push([r + Math.cos(a) * rr + W(), r + Math.sin(a) * rr + W()]);
    }
    return HW.smoothD(pts);
  };

  /* Trend polyline — the data family. */
  HW.trend = function (values, w, h, o) {
    var W = wobbler(opt(o, "seed", 1), opt(o, "amp", 2.5));
    var max = opt(o, "max", Math.max.apply(null, values)) || 1;
    var pts = [];
    for (var i = 0; i < values.length; i++) {
      var x = values.length === 1 ? w / 2 : (w / (values.length - 1)) * i;
      pts.push([x + W(), h - (values[i] / max) * h + W()]);
    }
    return { d: HW.smoothD(pts), pts: pts };
  };

  /* ═══════════ 4 · Arrows ═══════════════════════════════════════ */

  /* kind: straight | curve | swoop | elbow | loop
     Returns { shaft, head, tip, angle }. Shaft and head stroke separately. */
  HW.arrow = function (w, h, o) {
    var kind = opt(o, "kind", "straight");
    var seed = opt(o, "seed", 1);
    var W = wobbler(seed, opt(o, "amp", 2.4));
    var pts;

    if (kind === "straight") {
      pts = sampleLine(0, h / 2, w, h / 2, 7, W, 0);
    } else if (kind === "curve") {
      pts = sampleLine(0, h / 2, w, h / 2, 12, W, opt(o, "bow", -h * 0.45));
    } else if (kind === "swoop") {
      pts = [];
      for (var i = 0; i <= 16; i++) {
        var t = i / 16;
        pts.push([w * t + W(), h * (0.5 + 0.42 * Math.sin(t * Math.PI * 1.15 - 0.25)) + W()]);
      }
    } else if (kind === "elbow") {
      pts = sampleLine(0, 0, 0, h * 0.75, 4, W, 0).concat(sampleLine(0, h * 0.75, w, h * 0.75, 6, W, 0));
    } else {
      /* loop: comes back around — for cycles and retries */
      pts = [];
      var r = Math.min(w, h) / 2;
      for (var j = 0; j <= 26; j++) {
        var a = -Math.PI / 2 + (j / 26) * Math.PI * 1.78;
        pts.push([w / 2 + Math.cos(a) * r + W(), h / 2 + Math.sin(a) * r + W()]);
      }
    }

    var shaft = HW.smoothD(pts);
    var p1 = pts[pts.length - 2],
      p2 = pts[pts.length - 1];
    var ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    var hl = opt(o, "head", 26);
    var spread = opt(o, "spread", 0.42);
    var head = HW.polyD([
      [p2[0] - Math.cos(ang - spread) * hl + W(), p2[1] - Math.sin(ang - spread) * hl + W()],
      [p2[0], p2[1]],
      [p2[0] - Math.cos(ang + spread) * hl + W(), p2[1] - Math.sin(ang + spread) * hl + W()],
    ]);
    return { shaft: shaft, head: head, tip: p2, angle: ang };
  };

  /* ═══════════ 5 · Symbol primitives ════════════════════════════ */

  HW.check = function (size, o) {
    var W = wobbler(opt(o, "seed", 1), 2);
    return HW.polyD([
      [W(), size * 0.55 + W()],
      [size * 0.38 + W(), size * 0.92 + W()],
      [size + W(), W()],
    ]);
  };

  HW.cross = function (size, o) {
    var seed = opt(o, "seed", 1);
    return [
      HW.line(0, 0, size, size, { seed: seed, amp: 2 }),
      HW.line(size, 0, 0, size, { seed: seed + 4, amp: 2 }),
    ];
  };

  /* Radiating lines — insight, impact. */
  HW.burst = function (r, o) {
    var rays = opt(o, "rays", 8);
    var seed = opt(o, "seed", 1);
    var inner = opt(o, "inner", r * 0.55);
    var out = [];
    for (var i = 0; i < rays; i++) {
      var a = (i / rays) * Math.PI * 2 + HW.hash(i, seed) * 0.12;
      out.push(
        HW.line(
          r + Math.cos(a) * inner,
          r + Math.sin(a) * inner,
          r + Math.cos(a) * r,
          r + Math.sin(a) * r,
          { seed: seed + i * 3, amp: 1.6, segs: 3 }
        )
      );
    }
    return out;
  };

  /* Square bracket — gathering a group. */
  HW.bracket = function (h, o) {
    var W = wobbler(opt(o, "seed", 1), 2);
    var arm = opt(o, "arm", 26);
    var side = opt(o, "side", "left");
    var s = side === "left" ? 1 : -1;
    var x = side === "left" ? 0 : arm;
    return HW.polyD([
      [x + s * arm + W(), W()],
      [x + W(), W()],
      [x + W(), h + W()],
      [x + s * arm + W(), h + W()],
    ]);
  };

  /* Curly brace. side "left" gives `{` (point faces left, gathering content on the right);
     side "right" gives `}` (point faces right, gathering content on the left).
     Getting this backwards is the most common mistake — the point always faces the name that
     the group is being generalised into. */
  HW.brace = function (h, o) {
    var seed = opt(o, "seed", 1);
    var W = wobbler(seed, 2);
    var arm = opt(o, "arm", 30);
    var right = opt(o, "side", "left") === "right";
    var X = function (v) { return right ? arm - v : v; };
    var pts = [
      [X(arm) + W(), W()],
      [X(arm * 0.4) + W(), h * 0.12 + W()],
      [X(arm * 0.4) + W(), h * 0.42 + W()],
      [X(0) + W(), h / 2 + W()],
      [X(arm * 0.4) + W(), h * 0.58 + W()],
      [X(arm * 0.4) + W(), h * 0.88 + W()],
      [X(arm) + W(), h + W()],
    ];
    return HW.smoothD(pts);
  };

  /* Serrated stamp ring — sign-offs. */
  HW.stamp = function (r, o) {
    var teeth = opt(o, "teeth", 26);
    var W = wobbler(opt(o, "seed", 1), 1.6);
    var pts = [];
    for (var i = 0; i <= teeth * 2; i++) {
      var a = (i / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
      var rr = i % 2 ? r : r * 0.9;
      pts.push([r + Math.cos(a) * rr + W(), r + Math.sin(a) * rr + W()]);
    }
    return HW.polyD(pts);
  };

  /* Push pin — head, neck, and point, sharing one coordinate space. */
  HW.pin = function (o) {
    var seed = opt(o, "seed", 1);
    var r = opt(o, "r", 17);
    var W = wobbler(seed + 3, 1.4);
    return [
      circleAt(r, r, r, seed, 1.6),
      HW.polyD([
        [r - r * 0.42 + W(), r * 1.9 + W()],
        [r + r * 0.42 + W(), r * 1.9 + W()],
      ]),
      HW.polyD([
        [r + W(), r * 1.9 + W()],
        [r + W(), r * 3.4 + W()],
      ]),
    ];
  };

  HW.magnifier = function (r, o) {
    var seed = opt(o, "seed", 1);
    var W = wobbler(seed + 9, 2);
    return [
      HW.circle(r, { seed: seed, amp: 2.6 }),
      HW.polyD([
        [r * 1.72 + W(), r * 1.72 + W()],
        [r * 2.5 + W(), r * 2.5 + W()],
      ]),
    ];
  };

  /* Light bulb — returns an array of path data, all in one coordinate space. */
  HW.bulb = function (size, o) {
    var seed = opt(o, "seed", 1);
    var W = wobbler(seed + 2, 1.6);
    var r = size * 0.3;
    var cx = size / 2;
    var glass = circleAt(cx, r + 4, r, seed, 2.2);
    var neck = HW.polyD([
      [cx - r * 0.5 + W(), r * 1.82 + W()],
      [cx - r * 0.44 + W(), r * 2.2 + W()],
      [cx + r * 0.44 + W(), r * 2.2 + W()],
      [cx + r * 0.5 + W(), r * 1.82 + W()],
    ]);
    var screw1 = HW.polyD([
      [cx - r * 0.44 + W(), r * 2.46 + W()],
      [cx + r * 0.44 + W(), r * 2.46 + W()],
    ]);
    var screw2 = HW.polyD([
      [cx - r * 0.36 + W(), r * 2.72 + W()],
      [cx + r * 0.36 + W(), r * 2.72 + W()],
    ]);
    return [glass, neck, screw1, screw2];
  };

  /* Gear — outline plus a concentric hub. */
  HW.gear = function (r, o) {
    var seed = opt(o, "seed", 1);
    var teeth = opt(o, "teeth", 9);
    var W = wobbler(seed, 1.6);
    var pts = [];
    var steps = teeth * 4;
    for (var i = 0; i <= steps; i++) {
      var a = (i / steps) * Math.PI * 2 - Math.PI / 2;
      var phase = i % 4;
      var rr = phase === 0 || phase === 1 ? r : r * 0.76;
      pts.push([r + Math.cos(a) * rr + W(), r + Math.sin(a) * rr + W()]);
    }
    return [HW.polyD(pts), circleAt(r, r, r * 0.3, seed + 5, 1.4)];
  };

  /* Stick figure. pose: stand | walk | raise | fall | point | wave
     Returns an array of path data with head and limbs already assembled, so the caller only
     supplies a single translate. */
  HW.stickman = function (size, o) {
    var pose = opt(o, "pose", "stand");
    var seed = opt(o, "seed", 1);
    var hr = size * 0.13;
    var cx = size * 0.5;
    var neck = hr * 2 + 4;
    var hip = size * 0.62;
    var shoulder = neck + size * 0.07;

    /* [left arm angle, right arm angle]: 0 points right, -PI/2 points straight up */
    var A = {
      stand: [2.35, 0.8],
      walk: [2.6, 0.5],
      raise: [-2.2, -0.95],
      fall: [2.9, 0.25],
      point: [2.35, -0.15],
      wave: [2.35, -1.05],
    };
    /* [left leg angle, right leg angle]: PI/2 points straight down */
    var L = {
      stand: [1.85, 1.29],
      walk: [2.25, 0.95],
      raise: [1.85, 1.29],
      fall: [2.7, 0.6],
      point: [1.85, 1.29],
      wave: [1.85, 1.29],
    };
    var aa = A[pose] || A.stand;
    var ll = L[pose] || L.stand;
    var armLen = size * 0.28,
      legLen = size * 0.33;

    function limb(x, y, ang, len, s) {
      return HW.line(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, { seed: s, amp: 1.4, segs: 3 });
    }
    return [
      circleAt(cx, hr + 2, hr, seed, 1.5),
      HW.line(cx, neck, cx, hip, { seed: seed + 1, amp: 1.3, segs: 4 }),
      limb(cx, shoulder, aa[0], armLen, seed + 2),
      limb(cx, shoulder, aa[1], armLen, seed + 3),
      limb(cx, hip, ll[0], legLen, seed + 4),
      limb(cx, hip, ll[1], legLen, seed + 5),
    ];
  };

  /* Corner flourish — closing-frame decoration. */
  HW.corner = function (size, o) {
    var seed = opt(o, "seed", 1);
    var W = wobbler(seed, 2);
    return HW.polyD([
      [W(), size + W()],
      [W(), W()],
      [size + W(), W()],
    ]);
  };

  /* ═══════════ 5.5 · UI widget primitives ═══════════════════════
     Drawing recipes adapted from wired-elements (github.com/rough-stuff/wired-elements,
     MIT © Preet Shihn) — the same rough.js lineage as this kit, re-expressed as hw-kit
     path primitives so they draw on, boil, and pass the audits like everything else.
     Only the geometry is borrowed; none of its runtime is. */

  /* Toggle switch — rounded track plus a round knob. Pass on=true/false for the RESTING
     state; the flip itself is the orchestrator's job (slide the knob's host). knobAt()
     returns the knob centre for either state so a card can animate between them. */
  HW.toggle = function (w, o) {
    var seed = opt(o, "seed", 1);
    var h = opt(o, "h", w * 0.5);
    var r = h / 2;
    var track = HW.rect(w, h, { r: r, seed: seed, amp: 2.4 });
    var pad = h * 0.14;
    var kr = r - pad;
    var knobAt = function (on) { return { x: on ? w - r : r, y: r }; };
    var kc = knobAt(opt(o, "on", false));
    var knob = circleAt(kc.x, kc.y, kr, seed + 5, 1.6);
    return { track: track, knob: knob, knobAt: knobAt, kr: kr, all: [track, knob] };
  };

  /* Slider — a bowed track line with a round handle. frac places the handle. */
  HW.sliderTrack = function (w, o) {
    var seed = opt(o, "seed", 1);
    var kr = opt(o, "kr", Math.max(12, w * 0.045));
    var frac = opt(o, "frac", 0.5);
    var track = HW.line(0, kr, w, kr, { seed: seed, amp: 2.2, segs: 8 });
    var hx = function (f) { return kr + (w - kr * 2) * f; };
    var knob = circleAt(hx(frac), kr, kr, seed + 5, 1.6);
    return { track: track, knob: knob, xAt: hx, kr: kr, all: [track, knob] };
  };

  /* Progress ring — a soft base ring plus a bolder arc covering frac of the turn,
     both starting at 12 o'clock. Draw the arc with HW.draw and the growth IS the fill. */
  HW.progressRing = function (r, o) {
    var seed = opt(o, "seed", 1);
    var frac = Math.max(0.02, Math.min(1, opt(o, "frac", 0.75)));
    var a0 = -Math.PI / 2;
    var base = HW.arc(r, a0, a0 + Math.PI * 2 - 0.06, { seed: seed, amp: 2.2, segs: 26 });
    var arc = HW.arc(r, a0, a0 + Math.PI * 2 * frac, { seed: seed + 7, amp: 2.6, segs: Math.max(8, Math.round(26 * frac)) });
    return { base: base, arc: arc, all: [base, arc] };
  };

  /* Spinner — a gapped arc; sustained rotation comes from the orchestrator, exactly like
     gear-mesh's idle turn. */
  HW.spinnerArc = function (r, o) {
    var seed = opt(o, "seed", 1);
    var gap = opt(o, "gap", 0.35); /* fraction of the turn left open */
    var a0 = -Math.PI / 2;
    return HW.arc(r, a0, a0 + Math.PI * 2 * (1 - gap), { seed: seed, amp: 2.4, segs: 20 });
  };

  /* Calendar — frame, header band, and a date grid. Returns cellAt(col,row) in local
     coordinates so a card can ring a date without re-deriving the grid math. */
  HW.calendarGrid = function (w, h, o) {
    var seed = opt(o, "seed", 1);
    var cols = opt(o, "cols", 7), rows = opt(o, "rows", 4);
    var headH = opt(o, "headH", h * 0.2);
    var frame = HW.rect(w, h, { r: Math.min(18, w * 0.04), seed: seed, amp: 2.6 });
    var head = HW.line(0, headH, w, headH, { seed: seed + 1, amp: 2, segs: 8 });
    var lines = [frame, head];
    var gh = (h - headH) / rows, gw = w / cols;
    for (var i = 1; i < rows; i++) lines.push(HW.line(0, headH + gh * i, w, headH + gh * i, { seed: seed + 2 + i, amp: 1.6, segs: 7 }));
    for (var j = 1; j < cols; j++) lines.push(HW.line(gw * j, headH, gw * j, h, { seed: seed + 12 + j, amp: 1.6, segs: 5 }));
    var cellAt = function (col, row) {
      return { x: gw * col + gw / 2, y: headH + gh * row + gh / 2, w: gw, h: gh };
    };
    return { all: lines, frame: frame, cellAt: cellAt, headH: headH, cw: gw, ch: gh };
  };

  /* Checkbox — a small square; the tick is separate so it can land later, drawn as its own
     two strokes. */
  HW.checkbox = function (size, o) {
    var seed = opt(o, "seed", 1);
    var box = HW.rect(size, size, { r: Math.min(8, size * 0.14), seed: seed, amp: 2 });
    /* The tick overshoots the box on purpose — a pen ticking a list never stays inside. */
    var tick = HW.polyD((function () {
      var W = wobbler(seed + 5, 1.6);
      return [
        [size * 0.2 + W(), size * 0.55 + W()],
        [size * 0.44 + W(), size * 0.82 + W()],
        [size * 1.05 + W(), size * -0.12 + W()],
      ];
    })());
    return { box: box, tick: tick, all: [box, tick] };
  };

  /* Tab bar — n tabs over a content frame. The active tab merges with the frame: its bottom
     edge is left open, which is the one visual cue that actually reads as "selected". */
  HW.tabbar = function (w, h, n, o) {
    var seed = opt(o, "seed", 1);
    var active = opt(o, "active", 0);
    var tabH = opt(o, "tabH", Math.min(h * 0.22, 72));
    var tabW = w / Math.max(2, n + 0.6);
    var W = wobbler(seed, 2.2);
    var out = { tabs: [], tabRects: [], active: active, tabH: tabH };
    /* content frame drawn as one open path whose top edge skips the active tab's mouth */
    var ax0 = tabW * active, ax1 = tabW * (active + 1);
    out.frame = HW.polyD([
      [ax0 + W(), tabH + W()],
      [W(), tabH + W()],
      [W(), h + W()],
      [w + W(), h + W()],
      [w + W(), tabH + W()],
      [ax1 + W(), tabH + W()],
    ]);
    for (var i = 0; i < n; i++) {
      var x = tabW * i;
      var Wt = wobbler(seed + 3 + i, 2);
      /* every tab is an upside-down U; the active one reaches the frame line, others stop short */
      var drop = i === active ? 0 : tabH * 0.12;
      out.tabs.push(HW.polyD([
        [x + Wt(), tabH - drop + Wt()],
        [x + Wt(), tabH * 0.18 + Wt()],
        [x + tabW * 0.14 + Wt(), Wt()],
        [x + tabW * 0.86 + Wt(), Wt()],
        [x + tabW + Wt(), tabH * 0.18 + Wt()],
        [x + tabW + Wt(), tabH - drop + Wt()],
      ]));
      out.tabRects.push({ x: x, y: 0, w: tabW, h: tabH });
    }
    out.all = [out.frame].concat(out.tabs);
    return out;
  };

  /* ═══════════ 6 · Fill primitives ══════════════════════════════ */

  /* Scribble fill — one continuous back-and-forth stroke, the closest thing to a marker swipe.
     Rows must be slanted and must overshoot the bounds; without both it draws as tidy venetian
     blinds and reads as fake immediately. */
  /* ══ 字幕 ══════════════════════════════════════════════════════════
     这一节以前**完全不存在**。SKILL.md 的 description 写着「词级手绘字幕」，
     kit 里却搜不到一行字幕代码，CAPTION_RESERVE 只被拿去缩 SAFE 就没下文了 ——
     于是每支片都少一层，底部还空着一条带子。

     三条设计约束，都是踩出来的：

     ① **玻璃拟态长在纸上要重新解释。** 标准玻璃拟态靠背后的花花绿绿折射出层次；
        纸面手绘片背景是一张接近纯白的纸（#f7f7f6），直接套 backdrop-blur
        只会得到一个灰方块。所以这里做的是「磨砂胶带 / 硫酸纸条」：
        半透明暖白 + 真的 backdrop-filter 模糊（笔画扫过带子时会被糊开，玻璃感就成立了）
        + 一根发丝亮边 + 一道软阴影把它从纸上抬起来。玻璃的**行为**留着，材质换成纸。

     ② **断句按语义，不按字数。** 中文没有词间空格，按字数硬折会把词劈开
        （实测踩过「真实的观 / 点 / 细节」）。所以在标点和连词处断，
        一行装不下就找最靠近中点的合法断点。

     ③ **一行里只有一个重点。** 全高亮等于没高亮。重点词用点缀色 + 稍粗，
        其余保持墨色；一句里最多一处。

     用法：
       HW.captions(tl, S, [{ t: 0.0, d: 2.1, text: "做内容不用会剪辑", key: "不用会剪辑" }, ...])
  */
  HW.captions = function (tl, S, lines, o) {
    o = o || {};
    var band = S.caption;
    var host = document.createElement("div");
    host.className = "hw-captions";
    host.style.cssText =
      "position:absolute;left:" + band.x + "px;top:" + band.y + "px;" +
      "width:" + band.w + "px;height:" + band.h + "px;" +
      "display:flex;align-items:center;justify-content:center;pointer-events:none";
    (S.layer || S.root).appendChild(host);

    /* 字号：竖屏 1080 短边 × 0.044 ≈ 48px。以前是 0.052（≈56px）—— 实测偏大，
       两行中文几乎顶满整条带子，胶带被撑成一块板，抢主体。字幕是"跟读用的第二条
       信息通道"，不是标题；它该让人扫一眼就回到画面上，所以要比主体明显小一档。
       长句同样别靠调大字号救，靠 HW.wrapZh 断成两行短句。 */
    var FS = Math.round(S.short * opt(o, "size", 0.044));
    /* 颜色走本帧已装好的调色板（HW.stage 会把它内联到根上），var() 只作兜底。
       写死 #141615 那版在"变量落空"的平台上会让字幕跟画风脱节：笔画是墨绿，
       字幕是中性灰黑。 */
    var pal = (S.palette || {});
    var ink = opt(o, "ink", pal["--hw-ink"] || "var(--hw-ink,#003E1F)");
    var accent = opt(o, "accent", pal["--hw-accent-ink"] || "var(--hw-accent-ink,#3C7A33)");

    lines.forEach(function (ln, i) {
      var card = document.createElement("div");
      /* 磨砂胶带本体。radius 给得比按钮大、比气泡小 —— 太圆会变成药丸，
         在手绘纸面上读作 UI 组件而不是贴上去的一条胶带。 */
      card.style.cssText =
        "position:absolute;max-width:100%;padding:" + Math.round(FS * 0.46) + "px " + Math.round(FS * 0.72) + "px;" +
        "border-radius:" + Math.round(FS * 0.34) + "px;" +
        "background:rgba(255,255,255,0.62);" +
        "-webkit-backdrop-filter:blur(14px) saturate(1.15);backdrop-filter:blur(14px) saturate(1.15);" +
        "box-shadow:0 1px 0 rgba(255,255,255,0.9) inset,0 0 0 1px rgba(20,22,21,0.07),0 10px 26px rgba(20,22,21,0.10);" +
        "font-family:" + (pal["--hw-font-print"] || "'Xiaolai','Excalifont',sans-serif") +
        ";font-size:" + FS + "px;line-height:1.42;" +
        "color:" + ink + ";text-align:center;white-space:pre-line;opacity:0";
      card.textContent = "";

      // 重点词切成三段，只染中间那段
      var txt = HW.wrapZh(ln.text, opt(o, "perLine", 13));
      if (ln.key && txt.indexOf(ln.key) >= 0) {
        var at = txt.indexOf(ln.key);
        card.appendChild(document.createTextNode(txt.slice(0, at)));
        var em = document.createElement("span");
        em.textContent = ln.key;
        em.style.cssText = "color:" + accent + ";font-weight:700";
        card.appendChild(em);
        card.appendChild(document.createTextNode(txt.slice(at + ln.key.length)));
      } else {
        card.textContent = txt;
      }
      host.appendChild(card);

      /* 进出都是 240ms 级别 + 位移配虚化（判据①：只动位置不动清晰度就是硬）。
         不做逐词跳字：口播已经在说了，字幕再逐词蹦会抢注意力。 */
      tl.fromTo(card, { opacity: 0, y: 14, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.26, ease: "expo.out" }, ln.t);
      tl.to(card, { opacity: 0, y: -10, filter: "blur(5px)", duration: 0.22, ease: "power3.in" },
        ln.t + ln.d);
    });
    return host;
  };

  /* 中文按语义断行。按字数硬折会把词劈开（实测：「真实的观 / 点 / 细节」）。
     所以优先在标点断，其次在连词前断，都找不到才退回按字数 —— 且断点取最靠近中点的那个，
     两行长短才不会一头沉。 */
  HW.wrapZh = function (s, per) {
    s = String(s || "").trim();
    if (s.length <= per) return s;
    var marks = "，,。.、；;：:？?！!—…";
    var conj = ["但是", "所以", "因为", "而且", "然后", "其实", "就是", "只要", "如果", "不是", "而是"];
    var mid = s.length / 2, best = -1, bestD = 1e9;
    for (var i = 1; i < s.length - 1; i++) {
      var ok = marks.indexOf(s[i]) >= 0 ? i + 1 : -1;   // 标点归上一行
      if (ok < 0) for (var c = 0; c < conj.length; c++) if (s.startsWith(conj[c], i)) { ok = i; break; }
      if (ok > 0 && Math.abs(ok - mid) < bestD) { bestD = Math.abs(ok - mid); best = ok; }
    }
    if (best < 0) best = Math.round(mid);
    return (s.slice(0, best) + "\n" + s.slice(best)).replace(/\n[，,。.、；;：:？?！!]/, function (m) { return m[1] + "\n"; }).trim();
  };

  /* 断行的通用词法。CJK 逐字、拉丁按词、空白单独成 token，末尾 |[^\s] 兜底分支不能删 ——
     没有它 String.match 会静默丢字（实测 `node scripts/x.mjs` 渲染成 `node scriptsx.mjs`）。 */
  HW.tokenize = function (s) {
    return (
      String(s).match(
        /[一-鿿㐀-䶿　-〿＀-￯]|[A-Za-z0-9._\-\/:$%#@+=~&?!,;'"()[\]{}<>*^|\\]+|\s+|[^\s]/g
      ) || []
    );
  };

  var BREAK_CLOSER = /^[。，、；：！？…—·”’）』」】》!?,.;:%]/;   /* 不能起行 */
  var BREAK_OPENER = /[“‘（『「【《]$/;                          /* 不能收行 */
  var BREAK_CONJ = ["但是", "所以", "因为", "而且", "然后", "其实", "就是", "只要", "如果", "不是", "而是", "并且", "于是"];

  /* 把 token 序列切成若干行，返回每行的 token 下标数组。
     这是 wrapZh 的通用化版本：wrapZh 只切两行且按字数估宽，这里按**实测宽度**切任意行数。

     浏览器对中文的换行规则是「任意两字之间都能断」—— 它不知道「正反馈」是一个词，
     于是「x 上的正反馈」会断成「x 上的正反 / 馈」。所以断点必须由这里决定，
     容器则设 white-space:pre 让浏览器彻底没有发言权。

     优先级：标点后 > 连词前 > 接近等宽。再加三条硬约束：
       行首不给闭合标点、行尾不留开放标点、末行至少两个 token（孤字禁令）。 */
  HW.planLines = function (toks, ws, boxW, o) {
    var total = 0, i;
    for (i = 0; i < ws.length; i++) total += ws[i];
    var k = Math.max(1, Math.ceil(total / Math.max(1, boxW)));
    if (k < 2) return [toks.map(function (_, ix) { return ix; })];
    var target = total / k;
    var maxLines = opt(o, "maxLines", 0);
    if (maxLines && k > maxLines) k = maxLines;

    /* 语义分：断在标点后最好，断在连词前次之。 */
    function semantic(at) {
      if (at <= 0 || at >= toks.length) return -1;
      var prev = toks[at - 1];
      if (BREAK_CLOSER.test(prev)) return 3;              /* 标点归上一行，断在它后面 */
      var rest = toks.slice(at, at + 2).join("");
      for (var c = 0; c < BREAK_CONJ.length; c++) {
        if (rest.indexOf(BREAK_CONJ[c]) === 0) return 2;  /* 连词起新行 */
      }
      if (/^\s+$/.test(prev)) return 1;                   /* 拉丁词间空格 */
      return 0;
    }
    function legal(at) {
      if (at <= 0 || at >= toks.length) return false;
      if (BREAK_CLOSER.test(toks[at])) return false;      /* 闭合标点不能起行 */
      if (BREAK_OPENER.test(toks[at - 1])) return false;  /* 开放标点不能收行 */
      return true;
    }

    var lines = [];
    var start = 0;
    for (var line = 0; line < k - 1 && start < toks.length; line++) {
      var acc = 0, at = start;
      while (at < toks.length && acc + ws[at] / 2 < target) { acc += ws[at]; at++; }
      if (at <= start) at = start + 1;
      /* 在候选点附近开个窗口找语义更好的断点，窗口宽度随行长走。 */
      var span = Math.max(2, Math.round((at - start) * 0.34));
      var best = -1, bestScore = -1e9;
      for (var cand = Math.max(start + 1, at - span); cand <= Math.min(toks.length - 1, at + span); cand++) {
        if (!legal(cand)) continue;
        var w = 0;
        for (i = start; i < cand; i++) w += ws[i];
        var score = semantic(cand) * 1.0 - Math.abs(w - target) / Math.max(1, target) * 1.6;
        if (score > bestScore) { bestScore = score; best = cand; }
      }
      if (best < 0) best = Math.min(toks.length - 1, Math.max(start + 1, at));
      var idx = [];
      for (i = start; i < best; i++) idx.push(i);
      lines.push(idx);
      start = best;
    }
    var tail = [];
    for (i = start; i < toks.length; i++) tail.push(i);
    lines.push(tail);

    /* 孤字禁令：末行只剩一个实体 token 时，从上一行借一个回来。 */
    function solid(idx) {
      var n = 0;
      for (var j = 0; j < idx.length; j++) if (!/^\s+$/.test(toks[idx[j]])) n++;
      return n;
    }
    var guard = 0;
    while (lines.length > 1 && solid(lines[lines.length - 1]) < 2 && guard++ < 8) {
      var prevLine = lines[lines.length - 2];
      if (solid(prevLine) <= 2) break;
      lines[lines.length - 1].unshift(prevLine.pop());
    }
    return lines.filter(function (l) { return l.length; });
  };

  HW.scribbleFill = function (w, h, o) {
    var seed = opt(o, "seed", 1);
    var gap = opt(o, "gap", 16);
    var slant = opt(o, "slant", 0.32); /* row rise across its width, as a fraction of gap */
    var W = wobbler(seed, 3.4);
    var rows = Math.max(2, Math.floor(h / gap));
    var pts = [];
    for (var i = 0; i <= rows; i++) {
      var y = (h / rows) * i;
      var dy = gap * slant;
      var over = 6 + HW.hash(i * 7, seed) * 5; /* a hand-drawn stroke runs past the edge */
      if (i % 2 === 0) {
        pts.push([-over + W(), y - dy + W()]);
        pts.push([w * 0.5 + W(), y - dy * 0.3 + W()]);
        pts.push([w + over + W(), y + dy + W()]);
      } else {
        pts.push([w + over + W(), y + dy + W()]);
        pts.push([w * 0.5 + W(), y + dy * 0.3 + W()]);
        pts.push([-over + W(), y - dy + W()]);
      }
    }
    return HW.smoothD(pts);
  };

  /* Cross-hatch fill — shading, negated regions. */
  HW.hatchFill = function (w, h, o) {
    var seed = opt(o, "seed", 1);
    var gap = opt(o, "gap", 20);
    var out = [];
    var n = Math.floor((w + h) / gap);
    for (var i = 1; i < n; i++) {
      var x0 = Math.min(i * gap, w);
      var y0 = i * gap - x0;
      var x1 = Math.max(0, i * gap - h);
      var y1 = Math.min(i * gap, h);
      if (y1 - y0 > 6) out.push(HW.line(x0, y0, x1, y1, { seed: seed + i, amp: 1.4, segs: 3 }));
    }
    return out;
  };

  /* Drawn bar. Bottom-aligned; animate scaleY only, never height. */
  HW.bar = function (w, h, o) {
    return HW.rect(w, h, { r: opt(o, "r", 4), seed: opt(o, "seed", 1), amp: opt(o, "amp", 2.4) });
  };

  /* Pie slice. Angles in radians. */
  HW.pieSlice = function (r, a0, a1, o) {
    var W = wobbler(opt(o, "seed", 1), 2.4);
    var segs = Math.max(4, Math.round((Math.abs(a1 - a0) / (Math.PI * 2)) * 30));
    var pts = [[r + W(), r + W()]];
    for (var i = 0; i <= segs; i++) {
      var a = a0 + ((a1 - a0) * i) / segs;
      pts.push([r + Math.cos(a) * r + W(), r + Math.sin(a) * r + W()]);
    }
    pts.push([r + W(), r + W()]);
    return HW.polyD(pts);
  };

  /* ═══════════ 7 · Stage — cards write configuration, not DOM ════ */

  var STROKE = {
    ink: { stroke: "var(--hw-ink)", width: 4 },
    accent: { stroke: "var(--hw-accent)", width: 4.5 },
    soft: { stroke: "var(--hw-ink-soft)", width: 3 },
    thin: { stroke: "var(--hw-ink)", width: 2.5 },
  };

  /* Excalidraw-equivalent defaults. rough.js multi-strokes every shape, so stroke widths here
     are thinner than a single-pass equivalent — two overlapping passes read heavier. */
  var ROUGH = {
    roughness: 1.05,    /* Excalidraw calls this level "artist"; 2.5 is its "cartoonist" */
    bowing: 1.4,        /* how far straight segments bow out */
    fillWeight: 2.2,
    hachureGap: 9,
    hachureAngle: -41,  /* Excalidraw's default hachure angle */
    defaultFillStyle: "hachure",
  };

  /* ══ 画风契约的 JS 真源 ═══════════════════════════════════════════════
     以前这份配色只存在于每帧的 <style> 里（`#frame-root { --hw-ink: … }`），
     kit 全靠 `stroke: var(--hw-ink)` 去读。**这是这条 skill 最贵的一个坑。**

     出事的是"其他平台"：hyperframes 渲染时会把子合成的每一条 CSS 规则重写成
       [data-composition-id="03-visualize"] <你写的选择器>
     而根元素**自己**就是那个带 data-composition-id 的元素。于是
       #root { --hw-ink: … }  →  [data-composition-id="…"] #root { … }
     变成一条后代选择器，永远匹配不到根自己。整份调色板落空。

     后果不是"颜色不对"，是**画面全灭**：rough.js 把颜色写成 SVG 呈现属性，
     kit 改走 `style.stroke = "var(--hw-ink)"`，变量解析失败 → 描边为 none →
     笔画一条都看不见，只剩 DOM 文字活着。三路探针实测：
       手写 path + #c00        可见
       手写 path + var(--hw-ink) 不可见
       rough.js  + #c00        可见         ← rough.js 一直是好的
       kitPaths=21, inkVar=""               ← 21 条 path 都在，只是没颜色
     同一条也让 `font-family: var(--hw-font-print)` 落空，中文掉回系统宋体。

     所以配色的真源搬到 JS：HW.stage 开场把这套值**内联写死在根元素上**。
     内联样式不受任何选择器重写影响，在 hyperframes / Studio / iframe /
     playground / 别人家的渲染器里一律成立。外部 CSS 仍然可以覆盖 —— 读得到就用
     读到的，读不到才落这份默认。卡片照旧写 var(--hw-*)，一个字都不用改。 */
  HW.PALETTE = {
    "--hw-paper": "#FFFFFC",
    "--hw-ink": "#003E1F",
    "--hw-ink-soft": "rgba(0,62,31,.68)",
    "--hw-accent": "#53A548",      /* 只做笔画：纸面上 2.75:1，过不了 3:1 的闸 */
    "--hw-accent-ink": "#3C7A33",  /* 要绿色文字用这个：5.2:1 */
    "--hw-font-print": '"Excalifont","Xiaolai",sans-serif',
  };

  /* 把调色板落到根上。已经被外部 CSS 定义过的值原样保留，只补没定义的。 */
  HW.installPalette = function (root) {
    if (!root || !root.style) return null;
    var cs = window.getComputedStyle(root);
    var out = {};
    for (var k in HW.PALETTE) {
      if (!Object.prototype.hasOwnProperty.call(HW.PALETTE, k)) continue;
      var got = (cs.getPropertyValue(k) || "").trim();
      var val = got || HW.PALETTE[k];
      root.style.setProperty(k, val);
      out[k] = val;
    }
    /* 字体同理。计算值里认不出本 skill 的两款字面就强制接管 —— 否则中文会静默
       掉回系统衬线，而且这件事在缩略图上很容易被当成"就该长这样"放过去。 */
    var ff = (cs.fontFamily || "");
    if (!/Excalifont|Xiaolai/i.test(ff)) root.style.fontFamily = out["--hw-font-print"];
    /* 根的盒子也别指望外部 CSS。少了 position:relative，所有 absolute 定位的
       笔画层会跑去跟最近的定位祖先对齐，整帧偏移。 */
    if (cs.position === "static") root.style.position = "relative";
    return out;
  };

  /* Frame-root resolver. The runtime strips the root div's id and replaces it with
     data-hf-authored-id="frame-root", so querySelector("#frame-root") always returns null and
     any gsap.set("#frame-root", ...) is a silent no-op. Always resolve through HW.el. */
  /* 本帧的作用域。子合成被克隆进主合成后，**七个帧的 DOM 同时挂在一个 document 里**，
     每个帧的根都叫 id="root"（脚手架就是这么教的，hyperframes 的 lint 也这么要求）。
     于是 document.querySelector("#root") 对七个帧全部返回**第一个** ——
     后面六帧的笔画一律画进第一帧的画布，全片叠成一坨，转场盖子从第 0 秒糊到最后。

     这就是"其他平台跑不出流程图"里最狠的一半：单帧预览永远是对的（页面里只有一个
     #root），一进主合成就全乱，而且不报任何错。

     解法是**就近解析**：document.currentScript 在 inline script 执行期间指向那个
     script 元素本身（跟函数定义在哪无关），从它往上找最近的 [data-composition-id]
     就是本帧的容器，再在容器内部找根。拿不到 currentScript 才退回全局。 */
  /* 按合成 id 取本帧的根。data-composition-id 按 hyperframes 的定义在整页唯一，
     所以这是唯一可靠的定位方式 —— 见上面那段注释里 #root 撞车的账。
     内联之后可能有两个元素带同一个 comp id：index.html 里的宿主 div（带
     data-composition-src）和 <template> 里真正的根。要的是后者，也就是不带 src 的那个。 */
  HW.byComp = function (compId) {
    if (!compId) return null;
    var all = [].slice.call(document.querySelectorAll('[data-composition-id="' + compId + '"]'));
    if (!all.length) return null;
    for (var i = all.length - 1; i >= 0; i--) {
      if (!all[i].hasAttribute("data-composition-src")) return all[i];
    }
    return all[all.length - 1];
  };

  HW.el = function (sel, compId) {
    if (!sel) return null;
    if (sel.nodeType) return sel;
    /* 给了合成 id 就走它，一步到位。 */
    var byComp = HW.byComp(compId);
    if (byComp) return byComp;

    var id = String(sel).replace(/^#/, "");
    var all = [].slice.call(document.querySelectorAll(
      '[id="' + id + '"],[data-hf-authored-id="' + id + '"]'));

    /* 撞车必须炸，不许静默拿第一个 —— 静默正是"七帧叠成一坨"的成因，
       而且它在单帧预览里永远看不出来（那时页面上确实只有一个 #root）。 */
    if (all.length > 1) {
      throw new Error(
        'HW.stage: 根 "' + id + '" 在合成后的页面里出现了 ' + all.length + ' 次。\n' +
        "  七个帧会全部画进第一个根，整片叠成一坨，而且不报错、单帧预览还是对的。\n" +
        "  修：把本帧的合成 id 传给 stage —— HW.stage(\"#" + id + '", { w: …, h: …, id: "<data-composition-id>" })\n' +
        "  （hyperframes 要求 id 在合成后的整页唯一；data-composition-id 天然满足。）");
    }
    if (all[0]) return all[0];
    if (document.currentScript && document.currentScript.parentElement) {
      return document.currentScript.parentElement.querySelector("[data-hf-inner-root]");
    }
    return null;
  };

  HW.stage = function (rootSel, o) {
    var root = HW.el(rootSel, opt(o, "id", null));
    if (!root) throw new Error("HW.stage: frame root not found: " + rootSel + " (the runtime strips ids — resolve with HW.el)");
    /* 先装调色板，再建任何形状 —— 见 HW.PALETTE 上面那段。顺序不能反：
       mkPath 建 path 的当下就要读到 var(--hw-ink)。 */
    var PAL = HW.installPalette(root);
    var VW = opt(o, "w", 1920),
      VH = opt(o, "h", 1080);
    /* Every layout number in this stage derives from these. Nothing downstream may hardcode a
       pixel: that is what made the old module-level VW/VH drift away from the real canvas and
       take every card's coordinates with it. */
    var SHORT = Math.min(VW, VH);
    var PORTRAIT = VH > VW * 1.05;

    /* Safe area. Content lives here; the frame is opt-in for full-bleed transitions only.
       The bottom reserve is the caption band — cards should not have to remember it.

       ── 这块重写过，因为旧值有两个真实事故 ────────────────────────
       ① CAPTION_RESERVE 以前是 VH*0.16，而且**只被用来把 SAFE 缩短，没有任何东西去画它**。
          全 kit 搜不到一个字幕渲染器，SKILL.md 却写着「词级手绘字幕」。
          结果：底部 16% 永远空着，片子看起来重心坠底、而且真的没字幕。
       ② 竖屏发抖音/小红书时，最底下约 14% 会被平台 UI（作者名、话题、按钮）盖住。
          字幕压在那儿等于没有。所以字幕带要往上抬，坐在 75%–86% 之间。

       于是现在分三层，互不重叠：
          SAFE      4% – 74%   内容住这儿
          CAPTION   75% – 86%  字幕带（见 HW.captions）
          平台 UI    86% – 100% 谁也不许进 */
    var MARGIN = Math.round(SHORT * 0.075);
    var PLATFORM_UI = Math.round(VH * 0.14);        // 抖音/小红书底部控件压掉的高度
    var CAPTION_H = Math.round(VH * 0.11);          // 字幕带自身高度（两行中文 + 呼吸）
    var CAPTION_RESERVE = PLATFORM_UI + CAPTION_H;  // SAFE 要让开的总高
    function mkRect(x, y, w, h) {
      return { x: x, y: y, w: w, h: h, cx: x + w / 2, cy: y + h / 2, x2: x + w, y2: y + h };
    }
    var SAFE = mkRect(MARGIN, MARGIN, VW - MARGIN * 2, VH - MARGIN - CAPTION_RESERVE);
    var FRAME = mkRect(0, 0, VW, VH);
    var CAPTION = mkRect(MARGIN, VH - CAPTION_RESERVE, VW - MARGIN * 2, CAPTION_H);

    /* HERO —— 主体该落在哪儿。
       SAFE 只说「别出界」，不说「别坠底」：一张落版卡把字放在 SAFE 的最下沿是完全合法的，
       实测就这么翻过车——落版格「有观点，就够了」的视觉重心落在画面 70%，
       上方 53% 全空，读起来像掉下去了。
       竖屏的光学中心在 38%–45%（比几何中心高），所以主体重心必须落在 HERO 里。
       `HW.audit` 会按这个区间检出坠底，别只靠肉眼。 */
    var HERO = mkRect(SAFE.x, Math.round(VH * 0.18), SAFE.w, Math.round(VH * 0.42));
    HERO.lo = Math.round(VH * 0.30);   // 重心允许的最高
    HERO.hi = Math.round(VH * 0.58);   // 重心允许的最低——过了就是坠底
    SAFE.hero = HERO;

    /* Type scale as a fraction of the short side, so a card written once holds at any aspect. */
    var TYPE = { hero: 0.30, display: 0.14, title: 0.085, body: 0.052, label: 0.040, note: 0.034 };

    var svg = root.querySelector("svg.hw-svg");
    if (!svg) {
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "hw-svg");
      svg.setAttribute("viewBox", "0 0 " + VW + " " + VH);
      svg.setAttribute("data-layout-allow-overflow", "");
      svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none";
      root.appendChild(svg);
    }
    /* One rough.js SVG renderer per stage. */
    var rc = rough.svg(svg);
    svg.__hwPending = svg.__hwPending || [];

    var layer = root.querySelector(".hw-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "hw-layer";
      layer.style.cssText = "position:absolute;inset:0;pointer-events:none";
      root.appendChild(layer);
    }

    /* Shape layer is rough.js — the same engine Excalidraw draws with. Any path data this kit
       produces is roughened through it, so all the existing geometry is reused and only the
       rendering changes.

       Two wrappers, deliberately. The ANCHOR carries the static placement and is never
       animated. The MOVER is what HW.host() hands back for movement tweens. They cannot be the
       same element: GSAP replaces an SVG transform attribute wholesale, so animating the
       element that also holds the placement drops the placement on the first frame. */
    function mkPath(d, opts) {
      opts = opts || {};
      var sk = STROKE[opt(opts, "ink", "ink")] || STROKE.ink;

      var ro = {
        /* Seeded, so the sketchy offsets are identical on every render and every preview. */
        seed: ((opt(opts, "seed", 1) * 1013) % 65536) || 1,
        roughness: opt(opts, "roughness", ROUGH.roughness),
        bowing: opt(opts, "bowing", ROUGH.bowing),
        strokeWidth: opt(opts, "width", sk.width),
        stroke: "#000",
        preserveVertices: opt(opts, "preserveVertices", false),
      };
      var fillStyle = opts.fill ? opt(opts, "fillStyle", ROUGH.defaultFillStyle || "hachure") : null;
      if (fillStyle) {
        ro.fill = "#000";
        ro.fillStyle = fillStyle;
        ro.fillWeight = opt(opts, "fillWeight", ROUGH.fillWeight);
        ro.hachureGap = opt(opts, "hachureGap", ROUGH.hachureGap);
        ro.hachureAngle = opt(opts, "hachureAngle", ROUGH.hachureAngle);
      }

      var g = rc.path(d, ro);
      var kids = g.querySelectorAll("path");
      var paths = [];
      for (var i = 0; i < kids.length; i++) paths.push(kids[i]);
      if (!paths.length) return null;

      /* rough.js writes colors as presentation attributes, which do not resolve var().
         Set them through style, where custom properties do resolve. */
      var strokeVar = opt(opts, "stroke", sk.stroke);
      var fillVar = opts.fill === true ? strokeVar : opts.fill;
      for (var j = 0; j < paths.length; j++) {
        var isFillPass = !!(fillStyle && paths.length > 1 && j === 0);
        if (isFillPass && fillStyle === "solid") {
          /* A solid fill is a filled polygon, not a stroked one. Forcing fill:none on it —
             which every other pass does need — makes solid fills silently invisible. */
          paths[j].style.fill = fillVar;
          paths[j].style.stroke = "none";
        } else {
          paths[j].style.stroke = isFillPass ? fillVar : strokeVar;
          paths[j].style.fill = "none";
          paths[j].style.strokeLinecap = "round";
          paths[j].style.strokeLinejoin = "round";
        }
        if (isFillPass) paths[j].setAttribute("data-hw-fill", "");
        /* Full-bleed is opt-in and explicit, so "it runs off the edge" is a decision on the
           record rather than an oversight the layout audit has to guess about. */
        if (opts.bleed) paths[j].setAttribute("data-hw-bleed", "");
      }

      var parent = svg, anchor = null;
      if (opts.x !== undefined || opts.y !== undefined || opts.rot) {
        anchor = document.createElementNS(NS, "g");
        anchor.setAttribute("transform", "translate(" + n1(opts.x || 0) + " " + n1(opts.y || 0) + ")");
        svg.appendChild(anchor);
        parent = anchor;
      }
      var mover = document.createElementNS(NS, "g");
      parent.appendChild(mover);
      for (var k = 0; k < paths.length; k++) {
        mover.appendChild(paths[k]);
        paths[k].__hwHost = mover;
        paths[k].__hwAnchor = anchor;
        paths[k].__hwMover = mover;
        /* Law 1 enforced structurally: a shape stays invisible until an orchestrator reveals
           it. Without this, a shape you forget to animate renders fully-formed at t=0 — which
           is how an odometer grew a fourth divider for a three-digit number. Pass
           {static: true} for the rare shape that is meant to sit there undrawn. */
        if (!opts.static) {
          paths[k].style.opacity = "0";
          paths[k].__hwPending = true;
          if (svg.__hwPending) svg.__hwPending.push(paths[k]);
        }
      }
      if (opts.cls) mover.setAttribute("class", opts.cls);

      /* Rotation is about the shape's OWN centre, not the anchor origin. SVG's default
         rotate() pivots at the translated origin — the shape's top-left — so a note tilted a
         few degrees swings its far corner well outside the slot it was placed in. */
      if (anchor && opts.rot) {
        var bb = mover.getBBox();
        anchor.setAttribute(
          "transform",
          "translate(" + n1(opts.x || 0) + " " + n1(opts.y || 0) + ") rotate(" +
            n1(opts.rot) + " " + n1(bb.x + bb.width / 2) + " " + n1(bb.y + bb.height / 2) + ")"
        );
      }

      /* A shape is now one or more passes (optional fill pass plus rough.js multi-stroke).
         Return them all so HW.draw strokes every pass. */
      return paths.length === 1 ? paths[0] : paths;
    }

    /* Anchored slots must be clamped on BOTH axes. Clamping only the axis the anchor moves
       along leaves the other free: a label hung under a peak that sits near the right edge
       still runs off the side. */
    function clampToSafe(x, y, w, h) {
      return mkRect(
        Math.max(SAFE.x, Math.min(x, SAFE.x2 - w)),
        Math.max(SAFE.y, Math.min(y, SAFE.y2 - h)),
        w, h
      );
    }

    /* Bounds of anything, in composition coordinates.
       SVG elements go through getBBox + getCTM, which lands in the viewBox space directly and
       is immune to the stage's CSS scale. HTML text goes through layout geometry. */
    function svgBounds(el) {
      var b = el.getBBox();
      var m = el.getCTM && el.getCTM();
      if (!m) return mkRect(b.x, b.y, b.width, b.height);
      var pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]];
      var xs = [], ys = [];
      for (var i = 0; i < 4; i++) {
        xs.push(m.a * pts[i][0] + m.c * pts[i][1] + m.e);
        ys.push(m.b * pts[i][0] + m.d * pts[i][1] + m.f);
      }
      var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
      return mkRect(x0, y0, Math.max.apply(null, xs) - x0, Math.max.apply(null, ys) - y0);
    }

    var api = {
      root: root,
      svg: svg,
      layer: layer,
      palette: PAL,      // 本帧最终生效的配色（已内联到根上，见 HW.PALETTE）
      /* Canvas facts a card is allowed to read. */
      W: VW, H: VH, short: SHORT, portrait: PORTRAIT,
      safe: SAFE,
      frame: FRAME,
      hero: HERO,        // 主体重心该落的区间（见上面 HERO 的注释）
      caption: CAPTION,  // 字幕带。卡片不许往里放东西，那是 HW.captions 的地盘
      rect: mkRect,
      /* Font size for a role, in px. Cards never write a pixel size. */
      type: function (role, mul) {
        return Math.round(SHORT * (TYPE[role] !== undefined ? TYPE[role] : TYPE.body) * (mul || 1));
      },
      /* Bounds of a text element, an SVG element, a slot rect, or an array of any of them
         (unioned).

         **矩形这一路是补上去的。** 槽位（S.slots.* / S.below 的返回值）本身就是
         {x,y,w,h,cx,cy,x2,y2}，卡片顺手把一个槽位传给 S.below 是最自然的写法：
             S.below(chain.slots[chain.slots.length - 1], { gap: 0.06 })
         以前这会掉进 rectOf 的 DOM 分支，`el.getBoundingClientRect is not a function`
         直接抛出来 —— 而这个异常发生在建帧 IIFE 里，**整帧就此中断**：那一格在成片里
         是一整段纯白，前面已经建好的形状也一个都不会动。实测两帧就这么空着，
         四道闸没有一道看得见（它们都不读运行时）。所以这里认矩形，
         并且 hyperframes check 的 Runtime 段要纳入验收（见 SKILL.md 渲染前的闸）。 */
      boundsOf: function (target) {
        if (target && target.nodeType === undefined &&
            typeof target.x === "number" && typeof target.w === "number") {
          return mkRect(target.x, target.y, target.w, target.h);
        }
        var els = Object.prototype.toString.call(target) === "[object Array]" ? target : [target];
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (!el) continue;
          var r = el.getBBox ? svgBounds(el) : api.rectOf(el);
          if (!r || (!r.w && !r.h)) continue;
          x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
          x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
        }
        if (!isFinite(x0)) return mkRect(0, 0, 0, 0);
        return mkRect(x0, y0, x1 - x0, y1 - y0);
      },
      /* ── Slots ────────────────────────────────────────────────────
         Every argument is a FRACTION of the safe area, never a pixel. A card states the
         relationship it wants; the stage decides the axis, so the same card holds at 16:9,
         9:16 and 1:1. */
      slots: {
        /* One centred slot. fw/fh are fractions of the safe area; dy shifts it by a fraction
           of safe height. */
        center: function (fw, fh, o) {
          o = o || {};
          var w = SAFE.w * (fw === undefined ? 0.86 : fw);
          var h = SAFE.h * (fh === undefined ? 0.34 : fh);
          var dy = SAFE.h * (o.dy || 0);
          return mkRect(SAFE.cx - w / 2, SAFE.cy - h / 2 + dy, w, h);
        },
        /* n rows stacked down the safe area. */
        rows: function (n, o) {
          o = o || {};
          var gap = SAFE.h * (o.gap === undefined ? 0.035 : o.gap);
          var w = SAFE.w * (o.w === undefined ? 1 : o.w);
          var h = o.h !== undefined ? SAFE.h * o.h : (SAFE.h * (o.block === undefined ? 0.72 : o.block) - gap * (n - 1)) / n;
          var total = n * h + (n - 1) * gap;
          var y0 = o.y !== undefined ? SAFE.y + SAFE.h * o.y : SAFE.cy - total / 2;
          var x = SAFE.cx - w / 2;
          var out = [];
          for (var i = 0; i < n; i++) out.push(mkRect(x, y0 + (h + gap) * i, w, h));
          return out;
        },
        /* n columns across the safe area. */
        cols: function (n, o) {
          o = o || {};
          var gap = SAFE.w * (o.gap === undefined ? 0.05 : o.gap);
          var w = (SAFE.w - gap * (n - 1)) / n;
          var h = SAFE.h * (o.h === undefined ? 0.4 : o.h);
          var y = o.y !== undefined ? SAFE.y + SAFE.h * o.y : SAFE.cy - h / 2;
          var out = [];
          for (var i = 0; i < n; i++) out.push(mkRect(SAFE.x + (w + gap) * i, y, w, h));
          return out;
        },
        /* Peers shown side by side. Landscape lays them across, portrait stacks them —
           two boxes squeezed into 1080px of width read as a pair of slivers. */
        split: function (n, o) {
          o = o || {};
          n = n || 2;
          return PORTRAIT
            ? api.slots.rows(n, { gap: o.gap === undefined ? 0.05 : o.gap, w: o.w === undefined ? 0.92 : o.w, block: 0.8 })
            : api.slots.cols(n, { gap: o.gap === undefined ? 0.06 : o.gap, h: o.h === undefined ? 0.5 : o.h });
        },
        /* A chain of n steps. Returns the slots plus the direction connectors should point,
           so a card never has to ask which way is "forward" at this aspect. */
        series: function (n, o) {
          o = o || {};
          var slots = PORTRAIT
            ? api.slots.rows(n, { gap: o.gap === undefined ? 0.055 : o.gap, w: o.w === undefined ? 0.68 : o.w, block: 0.86 })
            : api.slots.cols(n, { gap: o.gap === undefined ? 0.075 : o.gap, h: o.h === undefined ? 0.26 : o.h });
          return { slots: slots, axis: PORTRAIT ? "y" : "x", dir: PORTRAIT ? "down" : "right" };
        },
        /* n cells, shape of the grid chosen by aspect. */
        grid: function (n, o) {
          o = o || {};
          var cols = o.cols || (PORTRAIT ? Math.min(2, n) : Math.ceil(Math.sqrt(n * (SAFE.w / SAFE.h))));
          cols = Math.max(1, Math.min(cols, n));
          var rows = Math.ceil(n / cols);
          var gx = SAFE.w * (o.gap === undefined ? 0.05 : o.gap);
          var gy = SAFE.h * (o.gapY === undefined ? 0.06 : o.gapY);
          var w = (SAFE.w - gx * (cols - 1)) / cols;
          var h = (SAFE.h * (o.block === undefined ? 0.82 : o.block) - gy * (rows - 1)) / rows;
          var totalH = rows * h + (rows - 1) * gy;
          var y0 = SAFE.cy - totalH / 2;
          var out = [];
          for (var i = 0; i < n; i++) {
            var c = i % cols, r = Math.floor(i / cols);
            var rowCount = Math.min(cols, n - r * cols);
            var rowW = rowCount * w + (rowCount - 1) * gx;
            var x0 = SAFE.cx - rowW / 2;
            out.push(mkRect(x0 + (w + gx) * c, y0 + (h + gy) * r, w, h));
          }
          out.cols = cols;
          out.rows = rows;
          return out;
        },
        /* A ring of n. The orbit follows the safe area's shape rather than forcing a circle
           into a tall frame. */
        radial: function (n, o) {
          o = o || {};
          var w = SAFE.w * (o.w === undefined ? 0.26 : o.w);
          var h = SAFE.h * (o.h === undefined ? 0.1 : o.h);
          /* The orbit radius is where the CENTRES go, so the cells' own half-size has to come
             off it or the ring pushes them out through the safe edge. The extra breath matters
             too: clamped flush against the boundary, a rough.js stroke's natural wobble still
             crosses it — nothing should sit exactly on the safe line. */
          var breath = Math.min(SAFE.w, SAFE.h) * 0.02;
          var rx = Math.min(SAFE.w / 2 * (o.r === undefined ? 0.68 : o.r), SAFE.w / 2 - w / 2 - breath);
          var ry = Math.min(SAFE.h / 2 * (o.r === undefined ? 0.68 : o.r), SAFE.h / 2 - h / 2 - breath);
          var a0 = o.a0 === undefined ? -Math.PI / 2 : o.a0;
          var out = [];
          for (var i = 0; i < n; i++) {
            var a = a0 + (i / n) * Math.PI * 2;
            var px = SAFE.cx + Math.cos(a) * rx, py = SAFE.cy + Math.sin(a) * ry;
            var r = mkRect(px - w / 2, py - h / 2, w, h);
            r.angle = a;
            out.push(r);
          }
          /* The orbit itself, so a card can put something BETWEEN two nodes — a connecting
             arrow belongs on the arc, not on the chord through the middle of the ring. */
          out.rx = rx; out.ry = ry; out.cx = SAFE.cx; out.cy = SAFE.cy;
          out.at = function (a, k) {
            k = k === undefined ? 1 : k;
            return { x: SAFE.cx + Math.cos(a) * rx * k, y: SAFE.cy + Math.sin(a) * ry * k };
          };
          return out;
        },
        /* Ascending steps. */
        ladder: function (n, o) {
          o = o || {};
          var w = SAFE.w * (o.w === undefined ? 0.34 : o.w);
          var h = SAFE.h * (o.h === undefined ? 0.13 : o.h);
          var out = [];
          for (var i = 0; i < n; i++) {
            var t = n === 1 ? 0.5 : i / (n - 1);
            var x = SAFE.x + t * (SAFE.w - w);
            var y = SAFE.y2 - h - t * (SAFE.h - h) * (o.rise === undefined ? 0.86 : o.rise);
            out.push(mkRect(x, y, w, h));
          }
          return out;
        },
        /* Jittered grid — sticky-note walls. Deterministic. */
        scatter: function (n, o) {
          o = o || {};
          var seed = o.seed || 1;
          var g = api.slots.grid(n, { gap: 0.045, gapY: 0.055, block: o.block === undefined ? 0.78 : o.block });
          for (var i = 0; i < n; i++) {
            /* Jitter, then clamp: an un-clamped offset on a cell that already fills its slot
               is exactly how a wall of notes ends up hanging over the safe edge. Rotation
               needs headroom too, hence the extra breath. */
            var breath = Math.min(SAFE.w, SAFE.h) * 0.015;
            var nx = g[i].x + HW.hash(i * 3 + 1, seed) * SAFE.w * 0.014;
            var ny = g[i].y + HW.hash(i * 3 + 2, seed) * SAFE.h * 0.014;
            g[i].x = Math.max(SAFE.x + breath, Math.min(nx, SAFE.x2 - g[i].w - breath));
            g[i].y = Math.max(SAFE.y + breath, Math.min(ny, SAFE.y2 - g[i].h - breath));
            g[i].cx = g[i].x + g[i].w / 2;
            g[i].cy = g[i].y + g[i].h / 2;
            g[i].x2 = g[i].x + g[i].w;
            g[i].y2 = g[i].y + g[i].h;
            g[i].rot = HW.hash(i * 3 + 3, seed) * 3.2;
          }
          return g;
        },
      },

      /* ── Anchors ──────────────────────────────────────────────────
         Place something relative to what it annotates, so a label can never land on the arc
         it is labelling. gap is a fraction of the safe area's short dimension. */
      below: function (target, o) {
        o = o || {};
        var b = api.boundsOf(target);
        var gap = SAFE.h * (o.gap === undefined ? 0.035 : o.gap);
        var w = SAFE.w * (o.w === undefined ? 0.7 : o.w);
        var h = SAFE.h * (o.h === undefined ? 0.1 : o.h);
        var y = Math.min(b.y2 + gap, SAFE.y2 - h);
        return clampToSafe((o.cx === undefined ? b.cx : o.cx) - w / 2, y, w, h);
      },
      above: function (target, o) {
        o = o || {};
        var b = api.boundsOf(target);
        var gap = SAFE.h * (o.gap === undefined ? 0.035 : o.gap);
        var w = SAFE.w * (o.w === undefined ? 0.7 : o.w);
        var h = SAFE.h * (o.h === undefined ? 0.1 : o.h);
        var y = Math.max(b.y - gap - h, SAFE.y);
        return clampToSafe((o.cx === undefined ? b.cx : o.cx) - w / 2, y, w, h);
      },
      leftOf: function (target, o) {
        o = o || {};
        var b = api.boundsOf(target);
        var gap = SAFE.w * (o.gap === undefined ? 0.03 : o.gap);
        var w = SAFE.w * (o.w === undefined ? 0.24 : o.w);
        var h = SAFE.h * (o.h === undefined ? 0.16 : o.h);
        var x = Math.max(b.x - gap - w, SAFE.x);
        return clampToSafe(x, (o.cy === undefined ? b.cy : o.cy) - h / 2, w, h);
      },
      rightOf: function (target, o) {
        o = o || {};
        var b = api.boundsOf(target);
        var gap = SAFE.w * (o.gap === undefined ? 0.03 : o.gap);
        var w = SAFE.w * (o.w === undefined ? 0.24 : o.w);
        var h = SAFE.h * (o.h === undefined ? 0.16 : o.h);
        var x = Math.min(b.x2 + gap, SAFE.x2 - w);
        return clampToSafe(x, (o.cy === undefined ? b.cy : o.cy) - h / 2, w, h);
      },

      /* ── Text inside a box ────────────────────────────────────────
         Auto-fitting is mandatory here, and it fits to the BOX, not to some width the card
         happened to pass. This is the contract that stops a CTA's second line falling out
         through the bottom edge. */
      boxText: function (slot, str, o) {
        o = o || {};
        var pad = Math.max(16, Math.min(slot.w, slot.h) * (o.pad === undefined ? 0.12 : o.pad));
        var inner = mkRect(slot.x + pad, slot.y + pad, slot.w - pad * 2, slot.h - pad * 2);
        var size = o.size || api.type(o.role || "body");
        var handle = api.words(str, {
          cx: inner.cx, y: inner.y, w: inner.w, size: size,
          color: o.color, align: o.align, cls: o.cls, font: o.font,
          fit: true, maxLines: o.maxLines || 2, maxH: inner.h, min: o.min || 20,
        });
        /* Vertically centre inside the box now that the fitted height is known. */
        var h = handle.el.offsetHeight || size * 1.28;
        handle.el.style.top = Math.round(inner.cy - h / 2) + "px";
        handle.box = inner;
        handle.el.__hwBox = inner;
        return handle;
      },

      /* ── Media ────────────────────────────────────────────────────
         contain: the asset is never cropped. A rough.js frame stitches the photo to the paper,
         which is what keeps an imported image from reading as a foreign object. */
      media: function (slot, aspect, o) {
        o = o || {};
        aspect = aspect || 16 / 9;
        var pad = Math.min(slot.w, slot.h) * (o.pad === undefined ? 0.04 : o.pad);
        var availW = slot.w - pad * 2, availH = slot.h - pad * 2;
        var w = availW, h = w / aspect;
        if (h > availH) { h = availH; w = h * aspect; }
        var rect = mkRect(slot.cx - w / 2, slot.cy - h / 2, w, h);
        var frame = null;
        if (o.frame !== false) {
          var inset = Math.max(6, Math.min(w, h) * 0.02);
          frame = api.add(HW.rect(w + inset * 2, h + inset * 2, {
            seed: o.seed || 1, r: Math.min(w, h) * 0.03,
          }), { x: rect.x - inset, y: rect.y - inset, seed: o.seed || 1, ink: o.ink || "ink" });
        }
        return { rect: rect, frame: frame };
      },

      /* Add strokes. d may be a string or an array of strings; returns a path or an array of paths.
         opts.ghost: 先垫一层同形虚框（0.18 透明度 static），描线动画在它上面跑 ——
         描线中段不再被读成"消失的空框"。同 seed 同抖动，虚框和实框完全重叠。 */
      add: function (d, opts) {
        opts = opts || {};
        if (opts.ghost) {
          var gopts = {};
          for (var gk in opts) if (gk !== "ghost") gopts[gk] = opts[gk];
          gopts.static = true;
          gopts.ink = "thin";
          var gd = Object.prototype.toString.call(d) === "[object Array]" ? d : [d];
          for (var gi = 0; gi < gd.length; gi++) {
            var gp = mkPath(gd[gi], gopts);
            if (!gp) continue;
            var gpArr = Object.prototype.toString.call(gp) === "[object Array]" ? gp : [gp];
            for (var gj = 0; gj < gpArr.length; gj++) {
              if (gpArr[gj].style) gpArr[gj].style.opacity = "0.18";
            }
          }
        }
        if (Object.prototype.toString.call(d) === "[object Array]") {
          var out = [];
          for (var i = 0; i < d.length; i++) {
            var r = mkPath(d[i], opts);
            if (r) out = out.concat(r);
          }
          /* Several strokes passed together are ONE object — an arrow is a shaft plus a head.
             Each stroke got its own anchor, and each anchor pivots on its own centre, so a
             shared rot spins the pieces apart: the head stays put while the shaft turns, and
             a cycle diagram ends up with an arrowhead floating off its own arc. Re-pivot the
             whole group on its union centre. */
          if (opts && opts.rot && out.length > 1) {
            var seen = [], bb = null, m;
            for (var a = 0; a < out.length; a++) {
              m = out[a].__hwMover;
              if (!m || seen.indexOf(m) >= 0) continue;
              seen.push(m);
              var r2 = m.getBBox();
              bb = bb ? {
                x: Math.min(bb.x, r2.x), y: Math.min(bb.y, r2.y),
                x2: Math.max(bb.x2, r2.x + r2.width), y2: Math.max(bb.y2, r2.y + r2.height),
              } : { x: r2.x, y: r2.y, x2: r2.x + r2.width, y2: r2.y + r2.height };
            }
            if (bb) {
              var pivot = n1((bb.x + bb.x2) / 2) + " " + n1((bb.y + bb.y2) / 2);
              var tf = "translate(" + n1(opts.x || 0) + " " + n1(opts.y || 0) + ") rotate(" +
                n1(opts.rot) + " " + pivot + ")";
              for (var b2 = 0; b2 < out.length; b2++) {
                if (out[b2].__hwAnchor) out[b2].__hwAnchor.setAttribute("transform", tf);
              }
            }
          }
          return out;
        }
        return mkPath(d, opts);
      },
      /* Shrink a text element until it fits its box. Hand-drawn faces have wide, irregular
         metrics, so a size that fits in one language overflows in another — and text spilling
         out of a drawn box is the single most obvious way this style looks broken.
         maxLines defaults to 1: a title that wraps loses the word-stagger rhythm. */
      fit: function (el, o) {
        var maxW = opt(o, "w", 1200);
        var maxLines = opt(o, "maxLines", 1);
        /* maxH is the real constraint when the text sits in a box. Fitting only to
           size x lineHeight x maxLines lets a legal two-line block be taller than the box that
           is supposed to contain it — which is how a CTA's second line ended up outside. */
        var maxH = opt(o, "maxH", 0);
        var min = opt(o, "min", 24);
        var size = parseFloat(el.style.fontSize) || 64;
        var lineH = 1.28;
        for (var guard = 0; guard < 60 && size > min; guard++) {
          var ext = api.textExtent(el);
          var w = ext.w, h = ext.h;
          var limitH = maxH ? Math.min(maxH, size * lineH * maxLines + 4) : size * lineH * maxLines + 4;
          if (w <= maxW + 0.5 && h <= limitH + 0.5) break;
          size = Math.max(min, size * 0.94);
          el.style.fontSize = size + "px";
        }
        return size;
      },
      /* Add a text block. Use {cx} to centre, {x} to left-align.
         Pass {fit: true} to auto-shrink until it fits w / maxLines. */
      text: function (str, opts) {
        var el = document.createElement("div");
        var size = opt(opts, "size", 64);
        var color = opt(opts, "color", "var(--hw-ink)");
        var align = opt(opts, "align", "center");
        /* An ARRAY is the author's own semantic line split — one meaning unit per line, kept
           verbatim. That is the preferred form for a CJK title, because no measurement-driven
           breaker beats a human who knows where the phrase joints are. */
        if (Object.prototype.toString.call(str) === "[object Array]") str = str.join("\n");
        el.textContent = str;
        /* A card that wants a different face (a terminal's monospace, say) must declare it HERE,
           before the fit runs. Overriding font-family after the fact re-measures nothing, so the
           text keeps a size that only fitted the old metrics and spills out of its box. */
        var face = opt(opts, "font", "var(--hw-font-print)");
        /* white-space:pre, not pre-wrap. pre-wrap lets the BROWSER pick CJK breaks, and it will
           break between any two characters — it has no idea 正反馈 is one word, which is how a
           title renders as "x 上的正反 / 馈". Under pre, a break exists only where this kit put
           one: either the author's \n, or a measured break from HW.planLines below. */
        el.style.cssText =
          "position:absolute;font-family:" + face + ";font-weight:700;line-height:1.28;white-space:pre;" +
          "font-size:" + size + "px;color:" + color + ";text-align:" + align + ";opacity:0;";
        if (opts && opts.cx !== undefined) {
          var wd = opt(opts, "w", VW);
          el.style.left = n1(opts.cx - wd / 2) + "px";
          el.style.width = wd + "px";
        } else {
          el.style.left = n1(opt(opts, "x", 0)) + "px";
          if (opts && opts.w) el.style.width = opts.w + "px";
        }
        el.style.top = n1(opt(opts, "y", 0)) + "px";
        if (opts && opts.cls) el.className = opts.cls;
        /* Never let a browser translation rewrite drawn text: annotations are positioned from
           measurements taken at build time, and swapped-in characters usually fall outside the
           font subset. */
        el.setAttribute("translate", "no");
        el.classList.add("notranslate");
        layer.appendChild(el);
        /* Now that pre suppresses browser wrapping, a long line would run off the side instead
           of wrapping. So re-create wrapping here, semantically: measure, plan breaks, insert
           them. Only for a plain single-line string — an author's \n or array is never redone. */
        if (String(str).indexOf("\n") < 0) api.relineate(el, opts);
        if (opts && opts.fit) api.fit(el, opts);
        return el;
      },
      /* Insert <br> between the spans of a words() element, at measured semantic break points.
         hardBreak marks token indices the author already forced onto a new line. */
      breakSpans: function (el, toks, hardBreak, opts) {
        var boxW = opt(opts, "w", el.offsetWidth || 0);
        var kids = Array.prototype.slice.call(el.childNodes);
        /* Map token index -> the node that carries it, so a plan in token space can be
           applied in DOM space. Whitespace tokens are text nodes, not spans. */
        var nodeOf = [];
        var ni = 0;
        for (var t = 0; t < toks.length; t++) {
          while (ni < kids.length && kids[ni].nodeType === 1 && kids[ni].tagName === "BR") ni++;
          nodeOf[t] = kids[ni] || null;
          ni++;
        }
        /* Spans report offsetWidth directly; a whitespace token is a text node and has to be
           measured through a Range, or every Latin gap counts as zero and the plan drifts. */
        var rr = root.getBoundingClientRect();
        var k = rr.width / VW || 1;
        var ws = [];
        for (t = 0; t < toks.length; t++) {
          var n = nodeOf[t];
          if (!n) { ws.push(0); continue; }
          if (n.nodeType === 1) { ws.push(n.offsetWidth); continue; }
          var rg = document.createRange();
          rg.selectNodeContents(n);
          ws.push(rg.getBoundingClientRect().width / k);
        }
        var lines;
        var hasHard = false;
        for (var h in hardBreak) { hasHard = true; break; }
        if (hasHard) {
          /* Author-supplied lines win outright — never re-broken, never merged. */
          lines = [[]];
          for (t = 0; t < toks.length; t++) {
            if (hardBreak[t] && lines[lines.length - 1].length) lines.push([]);
            lines[lines.length - 1].push(t);
          }
        } else {
          if (!boxW) return 1;
          var wsum = 0;
          for (t = 0; t < ws.length; t++) wsum += ws[t];
          if (wsum <= boxW) return 1;
          lines = HW.planLines(toks, ws, boxW, opts);
        }
        if (lines.length < 2) return lines.length;
        for (var li = 1; li < lines.length; li++) {
          var first = lines[li][0];
          var node = nodeOf[first];
          if (!node || !node.parentNode) continue;
          node.parentNode.insertBefore(document.createElement("br"), node);
        }
        return lines.length;
      },
      /* Insert measured line breaks into a plain-text element so it fits its width.
         Returns the number of lines. Shared by text(); words() has its own span-aware path. */
      relineate: function (el, opts) {
        var boxW = opt(opts, "w", el.offsetWidth || 0);
        if (!boxW) return 1;
        var s = el.textContent;
        if (!s || !s.replace(/\s+/g, "")) return 1;
        if (api.textExtent(el).w <= boxW) return 1;
        var toks = HW.tokenize(s);
        if (toks.length < 2) return 1;
        var probe = document.createElement("div");
        probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font:inherit;";
        var spans = [];
        for (var i = 0; i < toks.length; i++) {
          var sp = document.createElement("span");
          sp.style.display = "inline-block";
          sp.textContent = toks[i];
          probe.appendChild(sp);
          spans.push(sp);
        }
        el.appendChild(probe);
        var ws = [];
        for (i = 0; i < spans.length; i++) ws.push(spans[i].offsetWidth);
        el.removeChild(probe);
        var lines = HW.planLines(toks, ws, boxW, opts);
        var out = [];
        for (i = 0; i < lines.length; i++) {
          var t = "";
          for (var j = 0; j < lines[i].length; j++) t += toks[lines[i][j]];
          t = t.replace(/^\s+|\s+$/g, "");
          if (t) out.push(t);
        }
        if (out.length > 1) el.textContent = out.join("\n");
        return out.length;
      },
      /* Measure an element in COMPOSITION coordinates.

         Uses LAYOUT geometry (offsetLeft/offsetTop), not getBoundingClientRect. The rect API
         includes any transform currently applied, and orchestrators set transforms at build
         time — HW.wordsIn parks every word at y+14 before the timeline runs. Measuring through
         the rect API therefore places annotations 14px low and, under a scaled preview, at the
         wrong scale as well. Layout geometry is immune to both. */
      rectOf: function (el) {
        var x = 0, y = 0, node = el;
        var guard = 0;
        while (node && node !== root && guard++ < 20) {
          x += node.offsetLeft;
          y += node.offsetTop;
          node = node.offsetParent;
        }
        if (guard >= 20 || !el.offsetWidth) {
          /* Fallback for anything outside the normal layer chain. */
          var rr = root.getBoundingClientRect();
          var k = rr.width / VW || 1;
          var r = el.getBoundingClientRect();
          return { x: (r.left - rr.left) / k, y: (r.top - rr.top) / k, w: r.width / k, h: r.height / k };
        }
        return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
      },
      /* The real extent of the glyphs inside an element, in composition coordinates.

         Measuring the div's own box is not enough: a single unbreakable word cannot wrap, so
         it overflows the box sideways while the box keeps reporting its fixed width. Both the
         width and the height check then pass and the fitter concludes everything is fine —
         which is how a 324px "Shape" ended up 153px wider than the box holding it. */
      textExtent: function (el) {
        if (el.children && el.children.length) {
          var out = api.glyphBand(Array.prototype.slice.call(el.children));
          return { w: out.w, h: out.fullH !== undefined ? out.fullH : out.h };
        }
        var rr = root.getBoundingClientRect();
        var k = rr.width / VW || 1;
        var rg = document.createRange();
        rg.selectNodeContents(el);
        var g = rg.getBoundingClientRect();
        rg.detach && rg.detach();
        var box = el.getBoundingClientRect();
        return { w: Math.max(g.width, 0) / k, h: Math.max(g.height, box.height) / k };
      },
      /* The glyph band of one target, or the union of several.
         Excludes line-height leading, so annotations hug the letters rather than the box.

         Pass a container div and you get the BOX width, which for centred text is much wider
         than the text — a strike drawn to that overshoots the sentence badly. Pass the spans
         (the `items` from S.words) and you get the real text extent. Passing several spans
         unions them, which is how a CJK word of two or three characters gets ringed as a unit
         instead of one cramped character at a time. */
      glyphBand: function (target) {
        var els = Object.prototype.toString.call(target) === "[object Array]" ? target : [target];
        /* A words() container with span children: union the children, not the box. */
        if (els.length === 1 && els[0].children && els[0].children.length) {
          els = Array.prototype.slice.call(els[0].children);
        }
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, fs = 0;
        for (var i = 0; i < els.length; i++) {
          var r = api.rectOf(els[i]);
          if (!r.w && !r.h) continue;
          x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
          x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
          fs = Math.max(fs, parseFloat(getComputedStyle(els[i]).fontSize) || 0);
        }
        if (!isFinite(x0)) { var b = api.rectOf(els[0] || target); x0 = b.x; y0 = b.y; x1 = b.x + b.w; y1 = b.y + b.h; }
        if (!fs) fs = parseFloat(getComputedStyle(els[0] || target).fontSize) || 60;
        var gh = fs * 0.80;
        var h = y1 - y0;
        /* h is the CAP BAND of one line — what a ring or a strike-through wants to hug.
           fullH is how tall the block really is once it wraps. Anything asking "does this
           fit?" needs fullH; handing it h approves a five-line block as if it were one line. */
        return {
          x: x0, y: y0 + (h - gh) / 2, w: x1 - x0, h: gh, fullH: h, fullY: y0,
          fs: fs, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
        };
      },
      /* Annotation marks. One tested implementation each, because eyeballing padding per card
         is exactly how a circled word ends up loose and off-centre.
         Marks are drawn deliberately, so they use lower roughness than structural shapes —
         a sloppy circle reads as a mistake rather than as hand-drawn. */
      ringAround: function (target, o) {
        o = o || {};
        var g = api.glyphBand(target);
        var rx = g.w / 2 + opt(o, "padX", g.fs * 0.34);
        var ry = g.h / 2 + opt(o, "padY", g.fs * 0.30);
        return api.add(HW.ellipse(rx, ry, {
          seed: opt(o, "seed", 1), overshoot: opt(o, "overshoot", 0.18), segs: 26, amp: g.fs * 0.018,
        }), {
          x: g.cx - rx, y: g.cy - ry,
          ink: opt(o, "ink", "accent"), seed: opt(o, "seed", 1),
          roughness: opt(o, "roughness", 0.75), bowing: opt(o, "bowing", 1.0),
        });
      },
      /* Strike a target through its optical middle. */
      strikeThrough: function (target, o) {
        o = o || {};
        var g = api.glyphBand(target);
        var over = opt(o, "overshoot", g.fs * 0.22);
        var tilt = opt(o, "tilt", g.fs * 0.10);
        return api.add(HW.line(0, tilt, g.w + over * 2, 0, {
          seed: opt(o, "seed", 1), amp: g.fs * 0.035, segs: 6, bow: opt(o, "bow", g.fs * 0.06),
        }), {
          x: g.x - over, y: g.cy - tilt / 2,
          ink: opt(o, "ink", "accent"), seed: opt(o, "seed", 1),
          width: opt(o, "width", Math.max(4, g.fs * 0.09)),
          roughness: opt(o, "roughness", 0.8), bowing: opt(o, "bowing", 1.1),
        });
      },
      /* Add text split into spans for word stagger: CJK per character, Latin per word. */
      words: function (str, opts) {
        var el = api.text("", opts);
        el.style.opacity = 1;
        var items = [];
        /* An array (or an author's \n) is a semantic line split and is honoured exactly. */
        var isArr = Object.prototype.toString.call(str) === "[object Array]";
        var authored = isArr ? str.slice() : String(str).split("\n");
        /* Tokenizer: CJK and CJK punctuation one character at a time, then runs of Latin /
           digits / path characters, then whitespace, then a single-character catch-all.
           That final |[^\s] branch is load-bearing. Without it, characters matching no branch
           are silently dropped by String.match — `node scripts/x.mjs` rendered as
           `node scriptsx.mjs`. Regression-test with a path and a command line after editing. */
        var chunks = [];
        var hardBreak = {}; /* token index that must start a new line */
        for (var a = 0; a < authored.length; a++) {
          var part = HW.tokenize(authored[a]);
          if (a > 0 && part.length) hardBreak[chunks.length] = true;
          chunks = chunks.concat(part);
        }
        for (var i = 0; i < chunks.length; i++) {
          if (/^\s+$/.test(chunks[i])) {
            el.appendChild(document.createTextNode(chunks[i]));
            continue;
          }
          var s = document.createElement("span");
          s.textContent = chunks[i];
          s.style.cssText = "display:inline-block;opacity:0;will-change:transform,opacity";
          el.appendChild(s);
          items.push(s);
          /* Same contract as shapes: a word stays hidden until an orchestrator reveals it,
             and the audit reports any that were never handed to one. */
          s.__hwPending = true;
          if (svg.__hwPending) svg.__hwPending.push(s);
        }
        /* Line breaks, inserted as <br> between spans. Under white-space:pre the browser will
           not break a run of inline-blocks at all, so every break has to be placed here —
           which is exactly the point: the break points are chosen by measurement and semantics
           (HW.planLines), never by the browser's "anywhere between two CJK characters" rule.
           A <br> measures 0x0 and is skipped by glyphBand/textExtent, so annotations, rings
           and the fitter all keep measuring only the real glyphs. */
        api.breakSpans(el, chunks, hardBreak, opts);
        /* Fit AFTER splitting, never before. Each word becomes an inline-block, and an
           inline-block cannot break in the middle — so "scenes-index", which the browser
           happily breaks at the hyphen while it is plain text, becomes one rigid box once
           split. Measuring the plain string therefore approves a size that wraps to two
           lines and then renders as four. Measure the layout that actually ships. */
        if (opts && opts.fit) api.fit(el, opts);
        return { el: el, items: items };
      },
    };
    return api;
  };

  /* ═══════════ 8 · Orchestrators — the three laws and motion scale ═ */

  var EASE_IN = "expo.out";
  var EASE_OUT = "power3.in";
  var EASE_MOVE = "power4.inOut";

  function arr(x) {
    return Object.prototype.toString.call(x) === "[object Array]" ? x : [x];
  }
  function flat(x) {
    var out = [];
    arr(x).forEach(function (i) {
      if (Object.prototype.toString.call(i) === "[object Array]") out = out.concat(flat(i));
      else out.push(i);
    });
    return out;
  }

  /* Law 1 — draw-on entrance: strokeDasharray to offset 0. */
  HW.draw = function (tl, targets, o) {
    var els = flat(targets);
    var at = opt(o, "at", 0);
    var dur = opt(o, "dur", 0.46);
    var stag = opt(o, "stagger", 0.08);
    for (var i = 0; i < els.length; i++) {
      /* A solid fill has no outline to trace, so stroke it in with opacity instead —
         otherwise the shape simply never appears. */
      HW.claim(els[i]);
      if (els[i].getAttribute && els[i].getAttribute("data-hw-fill") !== null && els[i].style.stroke === "none") {
        tl.fromTo(els[i], { opacity: 0 },
          { opacity: 1, duration: dur, ease: EASE_IN }, at + i * stag);
        continue;
      }
      var len = els[i].getTotalLength ? els[i].getTotalLength() : 0;
      if (!len) continue;
      gsap.set(els[i], { strokeDasharray: len, strokeDashoffset: len });
      /* opacity 闸，**做进引擎而不是留给调用方**。
         以前这里写的是 `gsap.set(…, opacity: 1)` —— 建帧当下就点亮，全靠
         strokeDashoffset = len 把形状藏住。但粗圆头笔触在虚线相位上会漏成一串圆点，
         整块转场涂抹于是从第 0 秒就糊在画面上。以前这条 bug 一直没人看见，因为
         var(--hw-ink) 解析失败让所有笔画本来就是透明的（见 HW.PALETTE）——
         把颜色修好的第一秒，它就全冒出来了。

         补救办法本来写在 hw-trans 的 X.D 里，SKILL.md 还专门叮嘱"别直接用 HW.draw"。
         但**靠人记得绕开默认路径的规矩，迟早会被忘掉**（这支片七帧就忘了）。
         所以闸挪进 HW.draw 本身：默认就是安全的，X.D 保留只为兼容。

         用 fromTo + immediateRender，不用 tl.set：raw set 只在建帧那一刻跑一次，
         时间轴被直接 seek 到某个时刻时不会回滚，抓帧和 Studio 拖动都会看到未来的画面。 */
      tl.fromTo(els[i], { opacity: 0 },
        { opacity: 1, duration: 0.001, ease: "none", immediateRender: true }, at + i * stag);
      tl.to(els[i], { strokeDashoffset: 0, duration: dur, ease: opt(o, "ease", EASE_MOVE) }, at + i * stag);
    }
    return at + dur + Math.max(0, els.length - 1) * stag;
  };

  /* Exit: every element that enters must also leave. */
  HW.undraw = function (tl, targets, o) {
    var els = flat(targets);
    var at = opt(o, "at", 0);
    var dur = opt(o, "dur", 0.32);
    var stag = opt(o, "stagger", 0.05);
    for (var i = 0; i < els.length; i++) {
      tl.to(els[i], { opacity: 0, duration: dur, ease: EASE_OUT }, at + i * stag);
    }
    return at + dur;
  };

  /* Law 3 — word stagger. */
  HW.wordsIn = function (tl, items, o) {
    var els = flat(items.items || items);
    var at = opt(o, "at", 0);
    var step = opt(o, "step", 0.08);
    var dur = opt(o, "dur", 0.38);
    var rise = opt(o, "rise", 14);
    for (var i = 0; i < els.length; i++) {
      HW.claim(els[i]);
      gsap.set(els[i], { opacity: 0, y: rise });
      tl.to(els[i], { opacity: 1, y: 0, duration: dur, ease: EASE_IN }, at + i * step);
    }
    return at + dur + Math.max(0, els.length - 1) * step;
  };

  HW.wordsOut = function (tl, items, o) {
    var els = flat(items.items || items);
    var at = opt(o, "at", 0);
    var step = opt(o, "step", 0.04);
    for (var i = 0; i < els.length; i++) {
      tl.to(els[i], { opacity: 0, y: -10, duration: 0.28, ease: EASE_OUT }, at + i * step);
    }
  };

  /* Growth entrance — a bar rising, a band sweeping, a card squashing shut. Scale-driven
     motion needs its own orchestrator: without one a card reaches for raw gsap, and a shape
     that never passes through an orchestrator stays hidden by the law-1 rule. */
  HW.grow = function (tl, targets, o) {
    var els = flat(targets);
    var at = opt(o, "at", 0);
    var dur = opt(o, "dur", 0.46);
    var stag = opt(o, "stagger", 0);
    var axis = opt(o, "axis", "y");
    var from = opt(o, "from", 0.04);
    var origin = opt(o, "origin", axis === "y" ? "50% 100%" : "0% 50%");
    var prop = axis === "y" ? "scaleY" : "scaleX";
    for (var i = 0; i < els.length; i++) {
      HW.claim(els[i]);
      var a = {};
      a[prop] = from;
      a.transformOrigin = origin;
      a.opacity = 1;
      gsap.set(els[i], a);
      var b = {};
      b[prop] = opt(o, "to", 1);
      b.duration = dur;
      b.ease = opt(o, "ease", EASE_IN);
      tl.to(els[i], b, at + i * stag);
    }
    return at + dur;
  };

  /* Whole-block entrance — text blocks, icon groups. */
  HW.pop = function (tl, targets, o) {
    var els = flat(targets);
    var at = opt(o, "at", 0);
    var dur = opt(o, "dur", 0.4);
    var stag = opt(o, "stagger", 0.08);
    for (var i = 0; i < els.length; i++) {
      HW.claim(els[i]);
      gsap.set(els[i], { opacity: 0, scale: opt(o, "from", 0.86), transformOrigin: "50% 50%" });
      tl.to(els[i], { opacity: 1, scale: 1, duration: dur, ease: EASE_IN }, at + i * stag);
    }
    return at + dur + Math.max(0, els.length - 1) * stag;
  };

  HW.fadeOut = function (tl, targets, o) {
    var els = flat(targets);
    var at = opt(o, "at", 0);
    for (var i = 0; i < els.length; i++) {
      tl.to(els[i], { opacity: 0, duration: opt(o, "dur", 0.3), ease: EASE_OUT }, at + i * opt(o, "stagger", 0.04));
    }
  };

  /* Get a stroke's outer positioning <g>.
     Load-bearing rule: HW.boil writes x / y / rotation every frame via gsap.set, so a movement
     or rotation tween on the SAME element is overwritten frame by frame. When an element both
     moves and boils, put the movement on HW.host(el) and the boil on el itself. */
  HW.host = function (targets) {
    var els = flat(targets);
    var out = [];
    for (var i = 0; i < els.length; i++) out.push(els[i].__hwHost || els[i]);
    return out.length === 1 ? out[0] : out;
  };

  /* Reposition, power4.inOut. Routes through the outer <g> so boil cannot overwrite it. */
  HW.move = function (tl, targets, vars, o) {
    var els = flat(HW.host(targets));
    var at = opt(o, "at", 0);
    var v = {};
    for (var k in vars) v[k] = vars[k];
    v.duration = opt(o, "dur", 0.5);
    v.ease = opt(o, "ease", EASE_MOVE);
    tl.to(els, v, at);
    return at + v.duration;
  };

  /* Law 2 — boil. Seek-safe, defaults already in the sweet spot. */
  HW.onUpdate = function (tl, fn) {
    if (!tl.__hwRenders) {
      tl.__hwRenders = [];
      tl.eventCallback("onUpdate", function () {
        for (var i = 0; i < tl.__hwRenders.length; i++) tl.__hwRenders[i]();
      });
    }
    tl.__hwRenders.push(fn);
    fn();
  };

  HW.boil = function (tl, targets, o) {
    var amp = opt(o, "amp", 0.55); /* sweet spot 0.5–0.6; raising it makes viewers motion-sick */
    var rot = opt(o, "rot", 0.15); /* sweet spot 0.12–0.18 */
    var fps = opt(o, "fps", 30);
    var drop = opt(o, "frameDrop", 4);
    var seed = opt(o, "seed", 1);
    var base = opt(o, "baseRot", 0);
    var els = flat(targets);
    HW.onUpdate(tl, function () {
      var step = Math.floor((tl.time() * fps) / drop);
      for (var i = 0; i < els.length; i++) {
        gsap.set(els[i], {
          x: HW.hash(step * 3 + i * 97, seed) * amp,
          y: HW.hash(step * 3 + 1 + i * 97, seed) * amp,
          rotation: base + HW.hash(step * 3 + 2 + i * 97, seed) * rot,
        });
      }
    });
  };

  /* Count-up. Runs on the same beat as the shape it labels. */
  HW.countUp = function (tl, el, from, to, o) {
    var at = opt(o, "at", 0);
    var dur = opt(o, "dur", 0.5);
    var suffix = opt(o, "suffix", "");
    var box = { v: from };
    tl.to(
      box,
      {
        v: to,
        duration: dur,
        ease: EASE_IN,
        onUpdate: function () {
          el.textContent = Math.round(box.v) + suffix;
        },
      },
      at
    );
  };

  /* Frame shell: entrance, exit, and end-of-shot hide. Call this last in every frame. */
  /* 第二个参数收 stage（推荐，`HW.frame(tl, S, DUR)`）或选择器（旧写法）。
     收 stage 时直接复用 stage 已经解析对的那个根 —— 选择器那条路会再查一次全局，
     多帧同名时会炸在这儿，而这时候明明已经有正确答案在手上了。 */
  HW.frame = function (tl, rootSel, DUR, o) {
    var root = (rootSel && rootSel.root) ? rootSel.root : HW.el(rootSel, (o && o.id) || null);
    if (!root) throw new Error("HW.frame: frame root not found: " + rootSel);
    if (opt(o, "fadeIn", true)) {
      gsap.set(root, { opacity: 0 });
      tl.to(root, { opacity: 1, duration: 0.3, ease: EASE_IN }, 0.06);
    }
    if (opt(o, "fadeOut", true)) {
      tl.to(root, { opacity: 0, duration: 0.3, ease: EASE_OUT }, DUR - 0.35);
    }
    tl.set(root, { visibility: "hidden" }, DUR - 0.02);
    return tl;
  };

  /* ═══════════ 9 · Layout ═══════════════════════════════════════
     Layout lives on the stage (S.safe / S.type / S.slots / S.below / S.boxText / S.media),
     because it has to know the real canvas size.

     The old module-level HW.slots is deliberately kept as a thrower rather than an alias. It
     computed against constants VW=1920, VH=1080 that had drifted away from the actual stage,
     so every card built on it silently laid out for a canvas that no longer existed. A card
     that misses the migration should fail loudly, not quietly place things off-frame. */
  HW.slots = new Proxy({}, {
    get: function (_, name) {
      throw new Error(
        "HW.slots." + String(name) + " was removed — layout is stage-bound now. Use S.slots." +
        String(name) + "(), which sizes from the real canvas and adapts to portrait."
      );
    },
  });

  /* Report anything that escaped the safe area, or text that overflowed the box it was
     placed in. Same idea as the unrevealed-shape audit: turn "spot it by eye" into a build
     -time report. */
  HW.auditLayout = function (S) {
    var out = [];
    var safe = S.safe;
    function check(el, label, tol) {
      if (el.getAttribute && el.getAttribute("data-hw-bleed") !== null) return;
      var r = el.getBBox ? S.boundsOf(el) : S.rectOf(el);
      if (!r || (!r.w && !r.h)) return;
      var over = Math.max(safe.x - r.x, safe.y - r.y, r.x + r.w - (safe.x + safe.w), r.y + r.h - (safe.y + safe.h));
      if (over > tol) out.push({ what: label, by: Math.round(over) });
    }
    /* A hand-drawn stroke wanders past its nominal rect by design — that is the whole point of
       rough.js. Tolerance for shapes therefore scales with stroke width; text gets almost none,
       because letters have no business wobbling. */
    function shapeTol(el) {
      var w = parseFloat(getComputedStyle(el).strokeWidth) || 4;
      return w * 1.6 + 4;
    }
    var paths = S.svg.querySelectorAll("path");
    for (var i = 0; i < paths.length; i++) check(paths[i], "shape", shapeTol(paths[i]));
    var divs = S.layer.querySelectorAll(":scope > div");
    for (var j = 0; j < divs.length; j++) {
      var d = divs[j];
      if (d.getAttribute("data-hw-bleed") === null) {
        /* Glyph extent, centred on the div — catches a word that overflowed its box sideways,
           which measuring the box itself never can. */
        var dr = S.rectOf(d), ex = S.textExtent(d);
        var gx = dr.x + (dr.w - ex.w) / 2, gy = dr.y + (dr.h - ex.h) / 2;
        var ov = Math.max(safe.x - gx, safe.y - gy, gx + ex.w - (safe.x + safe.w), gy + ex.h - (safe.y + safe.h));
        if (ov > 2) out.push({ what: "text \"" + (d.textContent || "").slice(0, 14) + "\"", by: Math.round(ov) });
      }
      if (divs[j].__hwBox) {
        var b = divs[j].__hwBox, tr = S.rectOf(divs[j]);
        var e2 = S.textExtent(divs[j]);
        tr = { x: tr.x + (tr.w - e2.w) / 2, y: tr.y + (tr.h - e2.h) / 2, w: e2.w, h: e2.h };
        var esc = Math.max(b.x - tr.x, b.y - tr.y, tr.x + tr.w - (b.x + b.w), tr.y + tr.h - (b.y + b.h));
        if (esc > 1.5) out.push({ what: "text out of its box \"" + (divs[j].textContent || "").slice(0, 14) + "\"", by: Math.round(esc) });
      }
    }

    return out;
  };

  /* ── The same check, but across the whole timeline ─────────────────
     HW.auditLayout only sees t=0. Everything that travels — a door sliding open, a lid
     swinging, a chip flying out of a box — is still parked at its start pose there, so a
     shape can pass the build-time check and then walk straight out of frame at t=1.4s.
     This seeks the timeline through N samples and re-runs the check at each one, which is
     what makes "always inside the safe area" a property of the animation and not just of
     the first frame.

     Measurement differs from the static audit on purpose: transforms ARE the thing under
     test here, so paths go through getCTM and text divs through the client rect, both
     converted back to composition coordinates. */
  HW.auditMotion = function (S, tl, o) {
    o = o || {};
    if (!tl || !tl.duration || !tl.duration()) return [];
    var N = o.samples || 14;
    var safe = S.safe, dur = tl.duration(), was = tl.time(), paused = tl.paused();
    var worst = {};
    /* rr/k are re-read at every sample, not snapshotted once: on an aspect switch the grid
       is mid-reflow, and a stale scale factor turns a 2px wobble into a phantom 265px
       escape. Measuring scale and position in the same breath keeps them consistent. */
    var rr, k;
    function note(key, label, over) {
      if (over <= 0) return;
      if (!worst[key] || worst[key].by < over) worst[key] = { what: label, by: Math.round(over) };
    }
    function escOf(r) {
      return Math.max(safe.x - r.x, safe.y - r.y, r.x + r.w - (safe.x + safe.w), r.y + r.h - (safe.y + safe.h));
    }
    /* The on-screen box of the VISIBLE glyphs inside a text div, transforms included, in
       composition coordinates. Spans when the text was split for word stagger, a Range
       otherwise.

       Per-span opacity is what decides visibility, not the container's. S.words() leaves the
       container at opacity 1 and hides the individual words, so a block whose turn has not
       come yet still measures as a full-size visible box — which is how a toggle's incoming
       label looked like it was sitting on top of the outgoing one for the whole shot. */
    function glyphRect(d, rr2, k2, hostOp) {
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      var kids = d.children;
      if (kids && kids.length) {
        for (var i2 = 0; i2 < kids.length; i2++) {
          var c2 = kids[i2];
          if (c2.tagName === "BR") continue;
          if (hostOp * (parseFloat(getComputedStyle(c2).opacity) || 0) < 0.6) continue;
          var q = c2.getBoundingClientRect();
          if (!q.width && !q.height) continue;
          x0 = Math.min(x0, q.left); y0 = Math.min(y0, q.top);
          x1 = Math.max(x1, q.right); y1 = Math.max(y1, q.bottom);
        }
        if (!isFinite(x0)) return null; /* split text with nothing revealed yet */
      } else {
        var rg = document.createRange();
        rg.selectNodeContents(d);
        var g = rg.getBoundingClientRect();
        if (!g.width && !g.height) return null;
        x0 = g.left; y0 = g.top; x1 = g.right; y1 = g.bottom;
      }
      return { x: (x0 - rr2.left) / k2, y: (y0 - rr2.top) / k2, w: (x1 - x0) / k2, h: (y1 - y0) / k2 };
    }
    var paths = S.svg.querySelectorAll("path");
    var divs = S.layer.querySelectorAll(":scope > div");
    tl.pause();
    for (var s = 0; s <= N; s++) {
      tl.time((dur * s) / N, true);
      rr = S.root.getBoundingClientRect();
      k = rr.width / S.W || 1;
      for (var i = 0; i < paths.length; i++) {
        var p = paths[i];
        if (p.getAttribute("data-hw-bleed") !== null) continue;
        if (parseFloat(getComputedStyle(p).opacity) < 0.04) continue;
        var tol = (parseFloat(getComputedStyle(p).strokeWidth) || 4) * 1.6 + 4;
        var e = escOf(S.boundsOf(p));
        if (e > tol) note("p" + i, "shape", e - tol);
      }
      var lit = [];
      for (var j = 0; j < divs.length; j++) {
        var d = divs[j];
        if (d.getAttribute("data-hw-bleed") !== null) continue;
        var op = parseFloat(getComputedStyle(d).opacity);
        if (op < 0.04) continue;
        var b = d.getBoundingClientRect();
        if (!b.width && !b.height) continue;
        var box = { x: (b.left - rr.left) / k, y: (b.top - rr.top) / k, w: b.width / k, h: b.height / k };
        var e2 = escOf(box);
        if (e2 > 3) note("d" + j, "text \"" + (d.textContent || "").slice(0, 14) + "\"", e2 - 3);
        /* Only blocks that are properly ON screen take part in the collision test. A crossfade
           legitimately has two blocks in the same place while one is at 0.3 and climbing.
           And the box has to be the GLYPH extent, not the container: a centred title is
           routinely given w:1200 while its text is 300px wide, so comparing container boxes
           would report every second card as a collision. */
        if (op > 0.6 && (d.textContent || "").replace(/\s+/g, "")) {
          var gb = glyphRect(d, rr, k, op);
          if (gb) lit.push({ i: j, box: gb, label: (d.textContent || "").replace(/\s+/g, " ").slice(0, 14) });
        }
      }
      /* Text sitting on top of other text, checked where visibility is real — at t=0 every
         block is still parked at opacity 0, so the static audit cannot tell a genuine collision
         from a flip card whose two faces share a slot by design. The failure this catches is
         the one that actually ships: a line landing across another line, both fully drawn.
         Text height follows font metrics that cannot be predicted while authoring coordinates,
         so it has to be measured. Mark a deliberate overlay with data-hw-bleed. */
      for (var u = 0; u < lit.length; u++) {
        for (var v = u + 1; v < lit.length; v++) {
          var A = lit[u].box, B = lit[v].box;
          var ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
          var oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
          if (ox > 3 && oy > 3) {
            note(
              "x" + lit[u].i + "-" + lit[v].i,
              'text over text "' + lit[u].label + '" / "' + lit[v].label + '"',
              Math.min(ox, oy)
            );
          }
        }
      }
    }
    tl.time(was, true);
    if (!paused) tl.play();
    var out = [];
    for (var key in worst) out.push(worst[key]);
    return out.sort(function (a, b2) { return b2.by - a.by; });
  };

  /* Mark a shape as revealed by an orchestrator, so the audit does not flag it. */
  HW.claim = function (el) {
    if (el && el.__hwPending) {
      el.__hwPending = false;
      /* Leave opacity to whatever orchestrator claimed it; it sets its own from/to. */
    }
  };

  /* Report shapes that were created but never handed to an orchestrator. They are invisible
     by design, so this is the only way to notice you forgot one. */
  HW.audit = function (S) {
    var pend = (S.svg.__hwPending || []).filter(function (p) { return p.__hwPending; });
    var shapes = 0, words = 0;
    for (var i = 0; i < pend.length; i++) {
      if (pend[i].tagName === "path") shapes++; else words++;
    }
    return { total: pend.length, shapes: shapes, words: words };
  };

  /* ═══════════ 9.5 · Live style knobs (playground) ══════════════
     Lets a host page retune the Excalidraw stroke feel without editing cards. */
  HW.setRough = function (o) {
    for (var k in o) if (o[k] !== undefined) ROUGH[k] = o[k];
  };
  HW.setStrokeWidths = function (base) {
    STROKE.ink.width = base;
    STROKE.accent.width = base * 1.12;
    STROKE.soft.width = base * 0.75;
    STROKE.thin.width = base * 0.62;
  };
  HW.setFillStyle = function (style) {
    ROUGH.defaultFillStyle = style;
  };

  /* ═══════════ 10 · Exports ═════════════════════════════════════ */

  global.HW = HW;
  /* Back-compat: window.hw* calls from older frames keep working. */
  global.hwHash = HW.hash;
  global.hwBoil = function (tl, target, o) {
    HW.boil(tl, gsap.utils.toArray(target), o);
  };
  global.hwOnUpdate = HW.onUpdate;
  global.hwWobbleRect = function (w, h, r, seed, amp) {
    return HW.rect(w, h, { r: r, seed: seed, amp: amp });
  };
})(window);
