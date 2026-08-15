/* Playground card set — 20 cards.
   6 survivors of the typography merge · 4 existing form cards re-rendered on rough.js
   · 10 new cards translated from MotionSet techniques.

   LAYOUT RULE: no card writes a pixel. Everything comes from the stage — S.safe, S.type(role),
   S.slots.* (fractions of the safe area, axis chosen by aspect), and the anchors S.below /
   S.above / S.leftOf / S.rightOf. That is what lets one card hold at 16:9, 9:16 and 1:1. */

/* Language picker, installed by the shell before any card builds. */
function pick(v) { return window.__L ? window.__L(v) : v; }

window.CARDS = [
  /* ══════════════ Merged typography family ══════════════
     These are the answer to "too many cards are just words with a line". Six survivors
     absorb nine of the old cards by taking a variant parameter instead of being separate. */
  {
    name: "title-sweep-underline",
    family: "A opening",
    note: "absorbs logo-draw-out — variant: opening | series-outro",
    line: "Big type lights up word by word, a wavy marker line follows",
    cfg: { title: { en: "Sixty-four ways to draw a shot", zh: "一句话，一张画面卡" }, variant: "opening" },
    build: function (S, tl, CFG, SEED, DUR) {
      var slot = S.slots.center(0.9, 0.26, { dy: -0.08 });
      var box = CFG.variant === "opening"
        ? S.add(HW.rect(slot.w, slot.h, { seed: SEED }), { x: slot.x, y: slot.y, seed: SEED })
        : null;
      var title = S.boxText(slot, pick(CFG.title), { role: "title", maxLines: 2 });
      var under = S.below(box || title.el, { gap: 0.022, w: 0.6, h: 0.05 });
      var wave = S.add(HW.wave(under.w, { seed: SEED + 3 }), {
        x: under.x, y: under.cy, ink: "accent", seed: SEED + 3,
      });
      if (box) HW.draw(tl, box, { at: 0.32 });
      HW.wordsIn(tl, title, { at: 0.78, step: 0.075 });
      HW.draw(tl, wave, { at: 1.72 });
      HW.boil(tl, box ? [].concat(box, wave) : wave, { seed: SEED });
      HW.wordsOut(tl, title, { at: DUR - 0.72 });
    },
  },
  {
    name: "emphasis-marks",
    family: "B assertion",
    note: "absorbs underline-triple-punch + word-circle-callout — mark: rules | ring | highlight",
    line: "A finished line gets marked up: triple rule, circled, or highlighted",
    cfg: {
      sentence: { en: "No two adjacent shots repeat", zh: "相邻两镜不许重样" },
      mark: "ring", hit: { en: [3], zh: [6, 7] },
    },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.94, 0.18, { dy: -0.06 });
      var line = S.boxText(slot, pick(CFG.sentence), { role: "title", pad: 0.03, maxLines: 2 });
      HW.wordsIn(tl, line, { at: 0.3, step: 0.07 });
      var hits = pick(CFG.hit).map(function (i) { return line.items[i]; }).filter(Boolean);
      var marks = [];
      if (CFG.mark === "rules") {
        var g = S.glyphBand(line.items);
        [[1, 0], [0.86, 1], [0.42, 2]].forEach(function (m, i) {
          var w = g.w * m[0];
          marks.push(S.add(HW.wave(w, { seed: SEED + i, amp: g.fs * 0.1 }), {
            x: g.x + (g.w - w) * (i === 2 ? 1 : 0.5), y: g.cy + g.h * 0.72 + g.fs * 0.14 * m[1],
            ink: "accent", seed: SEED + i,
          }));
        });
        marks.forEach(function (m, i) { HW.draw(tl, m, { at: 1.5 + i * 0.16, dur: 0.34 }); });
      } else if (CFG.mark === "ring") {
        marks.push(S.ringAround(hits, { seed: SEED }));
        HW.draw(tl, marks[0], { at: 1.5, dur: 0.44 });
      } else {
        var b = S.glyphBand(hits);
        marks.push(S.add(HW.rect(b.w + b.fs * 0.3, b.h + b.fs * 0.26, { seed: SEED, r: 4 }), {
          x: b.x - b.fs * 0.15, y: b.cy - (b.h + b.fs * 0.26) / 2, ink: "accent", seed: SEED,
          fill: "var(--hw-accent)", fillStyle: "hachure", hachureGap: 5, fillWeight: 5,
        }));
        HW.draw(tl, marks[0], { at: 1.5, dur: 0.46, stagger: 0.05 });
      }
      HW.boil(tl, marks, { seed: SEED });
    },
  },
  {
    name: "list-rows",
    family: "C enumeration",
    note: "absorbs checklist-tick + bullet-hand-dots — marker: tick | dot",
    line: "Items write out one at a time, each getting its marker",
    cfg: {
      items: { en: ["Stroke primitives", "Semantic lookup", "Selection lint"], zh: ["笔画原语库", "语义查表", "选卡校验"] },
      marker: "tick",
    },
    build: function (S, tl, CFG, SEED) {
      var items = pick(CFG.items);
      var rows = S.slots.rows(items.length, { w: 0.86, gap: 0.03, block: 0.62 });
      var mk = Math.min(rows[0].h * 0.6, S.type("body"));
      items.forEach(function (item, i) {
        var r = rows[i];
        var textSlot = S.rect(r.x + mk * 2.1, r.y, r.w - mk * 2.1, r.h);
        var t = S.boxText(textSlot, item, { role: "body", pad: 0.04, maxLines: 1 });
        t.el.style.textAlign = "left";
        var marker = CFG.marker === "tick"
          ? S.add(HW.check(mk, { seed: SEED + i }), { x: r.x + mk * 0.4, y: r.cy - mk * 0.5, ink: "accent", seed: SEED + i })
          : S.add(HW.circleAt(0, 0, mk * 0.26, SEED + i, 1.4), { x: r.x + mk * 0.85, y: r.cy, ink: "accent", width: 4, seed: SEED + i });
        var at = 0.4 + i * 1.0;
        HW.wordsIn(tl, t, { at: at, step: 0.055 });
        if (CFG.marker === "tick") HW.draw(tl, marker, { at: at + 0.5, dur: 0.32 });
        else HW.pop(tl, marker, { at: at, dur: 0.24 });
        HW.boil(tl, marker, { seed: SEED + i });
      });
    },
  },
  {
    name: "quote-bracket-hold",
    family: "B assertion",
    note: "the breathing shot — kept, unmerged",
    line: "A pair of brackets holds one line, and then nothing happens",
    cfg: { quote: { en: "Form should follow the sentence", zh: "形式该跟着句子走" } },
    build: function (S, tl, CFG, SEED, DUR) {
      var slot = S.slots.center(0.72, 0.2);
      var line = S.boxText(slot, pick(CFG.quote), { role: "title", maxLines: 2 });
      var bh = slot.h * 0.86;
      var arm = Math.min(S.safe.w * 0.035, bh * 0.24);
      var ql = S.add(HW.bracket(bh, { seed: SEED, side: "left", arm: arm }),
        { x: slot.x - arm * 2.4, y: slot.cy - bh / 2, seed: SEED });
      var qr = S.add(HW.bracket(bh, { seed: SEED + 1, side: "right", arm: arm }),
        { x: slot.x2 + arm * 1.4, y: slot.cy - bh / 2, seed: SEED + 1 });
      HW.draw(tl, [].concat(ql, qr), { at: 0.35, dur: 0.5, stagger: 0 });
      HW.wordsIn(tl, line, { at: 0.9, step: 0.11 });
      HW.boil(tl, [].concat(ql, qr), { seed: SEED, amp: 0.45 });
      HW.wordsOut(tl, line, { at: DUR - 0.6 });
    },
  },
  {
    name: "cross-out-correct",
    family: "B assertion",
    note: "kept — the strike is a distinct gesture, not a decorated line",
    line: "One claim gets struck through and rewritten as another beside it",
    cfg: { wrong: { en: "Five fixed shots", zh: "固定五个画面" }, right: { en: "Chosen by shape", zh: "按语义实时选" } },
    build: function (S, tl, CFG, SEED) {
      var two = S.slots.rows(2, { w: 0.84, gap: 0.06, block: 0.46 });
      var wrong = S.boxText(two[0], pick(CFG.wrong), { role: "title", maxLines: 1 });
      var right = S.boxText(two[1], pick(CFG.right), { role: "title", maxLines: 1, size: S.type("title", 1.12) });
      var slash = S.strikeThrough(wrong.items, { seed: SEED });
      HW.wordsIn(tl, wrong, { at: 0.3, step: 0.07 });
      HW.draw(tl, slash, { at: 1.7, dur: 0.28 });
      tl.to(wrong.el, { opacity: 0.4, duration: 0.24, ease: "power3.in" }, 1.98);
      HW.wordsIn(tl, right, { at: 2.2, step: 0.075 });
      HW.boil(tl, slash, { seed: SEED });
    },
  },
  {
    name: "one-word-explode",
    family: "B assertion",
    note: "kept — high energy, capped at 2 per film",
    line: "One word arrives enormous with radiating lines bursting out",
    cfg: { word: { en: "Shape", zh: "形" } },
    build: function (S, tl, CFG, SEED, DUR) {
      var slot = S.slots.center(0.76, 0.42);
      var word = S.boxText(slot, pick(CFG.word), { role: "hero", pad: 0.02, maxLines: 1 });
      var r = Math.min(S.safe.w, S.safe.h) * 0.4;
      var rays = S.add(HW.burst(r, { seed: SEED, rays: 10, inner: r * 0.72 }), {
        x: slot.cx - r, y: slot.cy - r, ink: "accent", width: Math.max(4, S.short * 0.005), seed: SEED,
      });
      gsap.set(word.el, { transformOrigin: "50% 50%" });
      gsap.set(word.items, { opacity: 1 });
      word.items.forEach(function (it) { HW.claim(it); });
      tl.fromTo(word.el, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "expo.out" }, 0.28);
      HW.draw(tl, rays, { at: 0.58, dur: 0.32, stagger: 0.03 });
      HW.boil(tl, rays, { seed: SEED, amp: 0.6 });
      tl.to(word.el, { opacity: 0, scale: 1.08, duration: 0.28, ease: "power3.in" }, DUR - 0.4);
    },
  },

  /* ══════════════ Form cards, re-rendered on rough.js ══════════════ */
  {
    name: "pipeline-arrow-flow",
    family: "D process",
    note: "series() picks the axis — across in landscape, down in portrait",
    line: "Wobbly boxes joined segment by segment with curved arrows",
    cfg: { nodes: { en: ["One sentence", "Pick a card", "One frame"], zh: ["一句话", "选一张卡", "出一帧"] } },
    build: function (S, tl, CFG, SEED) {
      var nodes = pick(CFG.nodes);
      var chain = S.slots.series(nodes.length);
      var down = chain.axis === "y";
      var t0 = 0.35;
      chain.slots.forEach(function (c, i) {
        var box = S.add(HW.rect(c.w, c.h, { seed: SEED + i }), { x: c.x, y: c.y, seed: SEED + i });
        var lb = S.boxText(c, nodes[i], { role: "body", maxLines: 2 });
        HW.draw(tl, box, { at: t0, dur: 0.46 });
        HW.wordsIn(tl, lb, { at: t0 + 0.5, step: 0.055 });
        HW.boil(tl, box, { seed: SEED + i });
        if (i < chain.slots.length - 1) {
          var next = chain.slots[i + 1];
          var gapLen = down ? next.y - c.y2 : next.x - c.x2;
          var len = gapLen * 0.86;
          var span = len * 0.7;
          var a = HW.arrow(len, span, { kind: "curve", seed: SEED + 20 + i, bow: -span * 0.42 });
          var ar = S.add([a.shaft, a.head], {
            x: down ? c.cx + span / 2 : c.x2 + gapLen * 0.07,
            y: down ? c.y2 + gapLen * 0.07 : c.cy - span / 2,
            rot: down ? 90 : 0, ink: "accent", seed: SEED + 20 + i,
          });
          HW.draw(tl, ar, { at: t0 + 0.95, dur: 0.4, stagger: 0.09 });
          HW.boil(tl, ar, { seed: SEED + 20 + i });
        }
        t0 += 1.35;
      });
    },
  },
  {
    name: "split-vs-fold",
    family: "E comparison",
    note: "split() lays the pair across in landscape and stacks it in portrait",
    line: "The frame splits along a drawn crease, each side arguing its case",
    cfg: {
      left: { title: { en: "Before", zh: "以前" }, body: { en: "300 lines per frame", zh: "每帧手写三百行" } },
      right: { title: { en: "After", zh: "现在" }, body: { en: "30 lines of config", zh: "一张卡三十行配置" }, hot: true },
    },
    build: function (S, tl, CFG, SEED) {
      var sides = S.slots.split(2);
      var stacked = S.portrait;
      var crease = stacked
        ? S.add(HW.line(0, 0, S.safe.w * 0.86, 0, { seed: SEED, amp: 4, segs: 10 }),
            { x: S.safe.cx - S.safe.w * 0.43, y: (sides[0].y2 + sides[1].y) / 2, width: 4, seed: SEED })
        : S.add(HW.line(0, 0, 0, S.safe.h * 0.74, { seed: SEED, amp: 4, segs: 10 }),
            { x: S.safe.cx, y: S.safe.cy - S.safe.h * 0.37, width: 4, seed: SEED });
      HW.draw(tl, crease, { at: 0.3, dur: 0.4 });
      [CFG.left, CFG.right].forEach(function (side, i) {
        var c = sides[i];
        var box = S.add(HW.rect(c.w, c.h, { seed: SEED + i }), {
          x: c.x, y: c.y, seed: SEED + i, ink: side.hot ? "accent" : "ink",
          fill: side.hot ? "var(--hw-accent)" : null, fillStyle: "hachure", hachureGap: 16, fillWeight: 1.6,
        });
        var top = S.rect(c.x, c.y, c.w, c.h * 0.46);
        var bot = S.rect(c.x, c.y + c.h * 0.46, c.w, c.h * 0.54);
        var ttl = S.boxText(top, pick(side.title), { role: "title", maxLines: 1 });
        var body = S.boxText(bot, pick(side.body), { role: "label", color: "var(--hw-ink-soft)", maxLines: 2 });
        var at = 0.85 + i * 0.3;
        HW.draw(tl, box, { at: at, dur: 0.5, stagger: 0.06 });
        HW.wordsIn(tl, ttl, { at: at + 0.42, step: 0.06 });
        HW.wordsIn(tl, body, { at: at + 0.85, step: 0.04 });
        HW.boil(tl, box, { seed: SEED + i });
      });
      HW.boil(tl, crease, { seed: SEED });
    },
  },
  {
    name: "venn-overlap",
    family: "E comparison",
    note: "label anchored below the circles, so it can never land on the arc",
    line: "Two circles intersect and the overlap is filled in",
    cfg: {
      left: { en: "Looseness", zh: "手绘感" }, right: { en: "Information", zh: "信息量" },
      both: { en: "Credible and relaxed", zh: "可信的松弛" },
    },
    build: function (S, tl, CFG, SEED) {
      /* Side by side in landscape, one above the other in portrait. */
      var stacked = S.portrait;
      var field = S.slots.center(0.94, 0.68, { dy: -0.05 });
      var R = stacked
        ? Math.min(field.w * 0.46, field.h * 0.34)
        : Math.min(field.w * 0.34, field.h * 0.46);
      var D = R * 0.56;
      var c1c = stacked ? { x: field.cx, y: field.cy - D } : { x: field.cx - D, y: field.cy };
      var c2c = stacked ? { x: field.cx, y: field.cy + D } : { x: field.cx + D, y: field.cy };
      var c1 = S.add(HW.ellipse(R, R, { seed: SEED, overshoot: 0.2 }), { x: c1c.x - R, y: c1c.y - R, seed: SEED });
      var c2 = S.add(HW.ellipse(R, R, { seed: SEED + 1, overshoot: 0.2 }), { x: c2c.x - R, y: c2c.y - R, seed: SEED + 1 });
      var half = Math.sqrt(Math.max(1, R * R - D * D));
      var lw = stacked ? half : R - D, lh = stacked ? R - D : half;
      var lens = S.add(HW.ellipse(lw, lh, { seed: SEED + 2, overshoot: 0.14 }), {
        x: field.cx - lw, y: field.cy - lh, ink: "accent", width: 3, seed: SEED + 2,
        fill: "var(--hw-accent)", fillStyle: "hachure", hachureGap: 11, fillWeight: 2,
      });
      var l1 = S.boxText(
        stacked ? S.rect(c1c.x - R, c1c.y - R * 0.86, R * 2, R * 0.44)
                : S.rect(c1c.x - R * 0.98, c1c.y - R * 0.28, R * 0.9, R * 0.56),
        pick(CFG.left), { role: "label", maxLines: 1, pad: 0.05 });
      var l2 = S.boxText(
        stacked ? S.rect(c2c.x - R, c2c.y + R * 0.42, R * 2, R * 0.44)
                : S.rect(c2c.x + R * 0.08, c2c.y - R * 0.28, R * 0.9, R * 0.56),
        pick(CFG.right), { role: "label", maxLines: 1, pad: 0.05 });
      /* Anchored to the shapes, not to a guessed y — this is the fix for the label that used
         to sit on the bottom arc. */
      var lm = S.boxText(S.below([].concat(c1, c2), { gap: 0.028, w: 0.82, h: 0.1 }),
        pick(CFG.both), { role: "body", maxLines: 1 });
      HW.draw(tl, c1, { at: 0.3, dur: 0.46 });
      HW.draw(tl, c2, { at: 0.55, dur: 0.46 });
      HW.wordsIn(tl, l1, { at: 1.1, step: 0.05 });
      HW.wordsIn(tl, l2, { at: 1.3, step: 0.05 });
      HW.draw(tl, lens, { at: 1.9, dur: 0.6, stagger: 0.04 });
      HW.wordsIn(tl, lm, { at: 2.6, step: 0.06 });
      HW.boil(tl, [].concat(c1, c2), { seed: SEED });
    },
  },
  {
    name: "bar-hand-draw",
    family: "F data",
    note: "numbers and labels anchored to their bar, all inside the safe area",
    line: "Drawn bars grow one at a time with their values counting",
    cfg: { bars: [{ label: { en: "Before", zh: "以前" }, value: 5 }, { label: { en: "Now", zh: "现在" }, value: 52, hot: true }] },
    build: function (S, tl, CFG, SEED) {
      var n = CFG.bars.length;
      var plot = S.slots.center(0.78, 0.5, { dy: -0.03 });
      var gap = plot.w * 0.14;
      var bw = Math.min((plot.w - gap * (n - 1)) / n, plot.w * 0.3);
      var max = Math.max.apply(null, CFG.bars.map(function (b) { return b.value; }));
      var numH = S.type("body") * 1.6;
      var maxBarH = plot.h - numH;
      CFG.bars.forEach(function (b, i) {
        var cx = plot.cx - ((n - 1) / 2 - i) * (bw + gap);
        var h = maxBarH * (b.value / max);
        var bar = S.add(HW.bar(bw, h, { seed: SEED + i }), {
          x: cx - bw / 2, y: plot.y2 - h, seed: SEED + i, ink: b.hot ? "accent" : "ink",
          fill: b.hot ? "var(--hw-accent)" : "var(--hw-ink)",
          fillStyle: "cross-hatch", hachureGap: 14, fillWeight: 1.6,
        });
        var num = S.text("0", {
          cx: cx, y: plot.y2 - h - numH, size: S.type("body"), w: bw * 1.9,
        });
        num.style.opacity = 1; num.style.fontVariantNumeric = "tabular-nums";
        var lb = S.boxText(S.rect(cx - bw * 0.95, plot.y2 + S.safe.h * 0.014, bw * 1.9, S.safe.h * 0.09),
          pick(b.label), { role: "label", color: "var(--hw-ink-soft)", maxLines: 1, pad: 0.04 });
        var at = 0.4 + i * 0.9;
        HW.grow(tl, bar, { at: at, dur: 0.46, axis: "y", from: 0.04 });
        HW.countUp(tl, num, 0, b.value, { at: at, dur: 0.46 });
        HW.wordsIn(tl, lb, { at: at + 0.4, step: 0.04 });
      });
    },
  },

  /* ══════════════ New — translated from MotionSet ══════════════ */
  {
    name: "torn-paper-reveal",
    family: "J reveal",
    note: "MotionSet: mask reveal (125 files) — the covers are full-bleed by design",
    line: "The sheet tears open and the content shows through the rip",
    cfg: { hidden: { en: "Sixty-four ways", zh: "六十四种画法" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.84, 0.2);
      var inner = S.boxText(slot, pick(CFG.hidden), { role: "title", maxLines: 1 });
      HW.wordsIn(tl, inner, { at: 0.55, step: 0.07 });
      var coverH = S.H * 0.6;
      function half(dir) {
        var edgeY = dir < 0 ? slot.y - S.H * 0.02 : slot.y2 + S.H * 0.02;
        var cover = S.add(HW.rect(S.W, coverH, { seed: SEED + (dir < 0 ? 1 : 2), r: 0 }), {
          x: 0, y: dir < 0 ? edgeY - coverH : edgeY, seed: SEED + (dir < 0 ? 1 : 2),
          ink: "soft", width: 2, fill: "var(--hw-paper)", fillStyle: "solid", bleed: true,
        });
        var edge = S.add(HW.zigzag(S.W, S.short * 0.02, { seed: SEED + (dir < 0 ? 5 : 6), segs: 40 }), {
          x: 0, y: edgeY - S.short * 0.01, seed: SEED + (dir < 0 ? 5 : 6), ink: "soft", width: 2.5, bleed: true,
        });
        [].concat(cover).forEach(function (el) { HW.claim(el); gsap.set(el, { opacity: 1 }); });
        return { cover: cover, edge: edge };
      }
      var top = half(-1), bot = half(1);
      HW.draw(tl, [].concat(top.edge, bot.edge), { at: 0.2, dur: 0.36, stagger: 0.05 });
      [[top, -1], [bot, 1]].forEach(function (h) {
        tl.to(HW.host(h[0].cover), { y: h[1] * coverH, duration: 0.6, ease: "power4.inOut" }, 1.15);
        tl.to(HW.host(h[0].edge), { y: h[1] * coverH, duration: 0.6, ease: "power4.inOut" }, 1.15);
      });
    },
  },
  {
    name: "spotlight-follow",
    family: "J reveal",
    note: "MotionSet: cursor spotlight + canvas mask (127 files)",
    line: "A drawn spotlight travels across and only what it covers stays sharp",
    cfg: {
      sentence: { en: "The trick is reusing primitives", zh: "关键在笔画原语的复用" },
      hit: { en: [4], zh: [3, 4, 5, 6] },
    },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.94, 0.16, { dy: -0.14 });
      var base = S.boxText(slot, pick(CFG.sentence), { role: "body", pad: 0.03, maxLines: 2 });
      HW.wordsIn(tl, base, { at: 0.3, step: 0.06 });
      var hits = pick(CFG.hit).map(function (i) { return base.items[i]; }).filter(Boolean);
      var target = S.glyphBand(hits);
      var lr = Math.min(S.safe.w, S.safe.h) * 0.13;
      var sx = S.safe.x, sy = S.safe.y2 - lr * 2.4;
      var ring = S.add(HW.circle(lr, { seed: SEED, overshoot: 0.22 }), {
        x: sx, y: sy, ink: "accent", width: Math.max(4, S.short * 0.004), seed: SEED,
        fill: "var(--hw-accent)", fillStyle: "dots", hachureGap: lr * 0.34, fillWeight: 1.1,
      });
      [].concat(ring).forEach(function (el) { HW.claim(el); });
      tl.fromTo(ring, { opacity: 0 }, { opacity: 1, duration: 0.24 }, 1.3);
      tl.to(HW.host(ring), { x: target.cx - lr - sx, y: target.cy - lr - sy, duration: 0.6, ease: "power4.inOut" }, 1.5);
      tl.to(base.el, { color: "var(--hw-ink-soft)", duration: 0.3 }, 1.9);
      tl.to(hits, { scale: 1.25, transformOrigin: "50% 50%", duration: 0.34, ease: "expo.out" }, 2.0);
      HW.boil(tl, ring, { seed: SEED });
    },
  },
  {
    name: "typewriter-line",
    family: "K text",
    note: "MotionSet: typewriter (19 files)",
    line: "Characters land one at a time with a blinking caret",
    cfg: { text: { en: "npx hyperframes render", zh: "npx hyperframes render" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.9, 0.3);
      var barH = slot.h * 0.22;
      var wf = HW.windowFrame(slot.w, slot.h, { seed: SEED, barH: barH });
      var frame = S.add(wf.all, { x: slot.x, y: slot.y, seed: SEED });
      HW.draw(tl, frame, { at: 0.3, dur: 0.44, stagger: 0.06 });
      var body = S.rect(slot.x, slot.y + barH, slot.w, slot.h - barH);
      var t = S.boxText(body, pick(CFG.text), { role: "body", maxLines: 1 });
      t.el.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
      HW.wordsIn(tl, t, { at: 0.95, step: 0.05, rise: 0 });
      var g = S.glyphBand(t.items);
      var caret = S.add(HW.line(0, 0, 0, g.h * 1.2, { seed: SEED + 3, amp: 1.6, segs: 2 }), {
        x: g.x + g.w + g.fs * 0.16, y: g.cy - g.h * 0.6, ink: "accent",
        width: Math.max(3, S.short * 0.004), seed: SEED + 3,
      });
      HW.draw(tl, caret, { at: 0.95, dur: 0.2 });
      for (var i = 0; i < 6; i++) tl.set(caret, { opacity: i % 2 ? 1 : 0.15 }, 1.2 + i * 0.34);
      HW.boil(tl, frame, { seed: SEED, amp: 0.4 });
    },
  },
  {
    name: "scramble-settle",
    family: "K text",
    note: "MotionSet: scramble / decode (9 files)",
    line: "Words start as scribble and resolve into real letters one by one",
    cfg: { text: { en: "Decoded", zh: "解出来了" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.84, 0.24);
      var word = S.boxText(slot, pick(CFG.text), { role: "display", pad: 0.04, maxLines: 1 });
      var n = word.items.length;
      var g = S.glyphBand(word.items);
      var cw = g.w / Math.max(1, n);
      var scr = [];
      for (var i = 0; i < n; i++) {
        scr.push(S.add(HW.zigzag(cw * 0.76, g.h * 0.7, { seed: SEED + i, segs: 5 }), {
          x: g.x + cw * i + cw * 0.12, y: g.cy - g.h * 0.35,
          ink: "soft", width: Math.max(3, S.short * 0.004), seed: SEED + i,
        }));
      }
      HW.draw(tl, scr, { at: 0.3, dur: 0.3, stagger: 0.05 });
      gsap.set(word.items, { opacity: 0 });
      word.items.forEach(function (it, i) {
        HW.claim(it);
        tl.set(it, { opacity: 1 }, 1.2 + i * 0.13);
        if (scr[i]) tl.set(scr[i], { opacity: 0 }, 1.2 + i * 0.13);
      });
      HW.boil(tl, scr, { seed: SEED });
    },
  },
  {
    name: "marquee-strip",
    family: "L continuous",
    note: "MotionSet: marquee / infinite scroll (37 files) — the band is full-bleed by design",
    line: "A paper strip scrolls sideways carrying repeated handwriting",
    cfg: { text: { en: "hand drawn · rough.js · Excalifont · ", zh: "手绘 · rough.js · 小赖字体 · " } },
    build: function (S, tl, CFG, SEED) {
      var bandH = S.safe.h * 0.2;
      var y = S.safe.cy - bandH / 2;
      var band = S.add(HW.rect(S.W, bandH, { seed: SEED, r: 2 }), {
        x: 0, y: y, seed: SEED, ink: "ink", width: 3, bleed: true,
        fill: "var(--hw-ink)", fillStyle: "hachure", hachureGap: 24, fillWeight: 1.2,
      });
      HW.draw(tl, band, { at: 0.3, dur: 0.5, stagger: 0.05 });
      var t = pick(CFG.text);
      var size = S.type("body");
      var strip = S.text(t + t + t + t + t, {
        x: 0, y: y + (bandH - size * 1.28) / 2, size: size, w: S.W * 4, align: "left",
      });
      strip.style.opacity = 1;
      strip.style.whiteSpace = "nowrap";
      strip.setAttribute("data-hw-bleed", "");
      tl.fromTo(strip, { x: 0 }, { x: -S.W * 0.9, duration: 6, ease: "none" }, 0.6);
      HW.boil(tl, band, { seed: SEED, amp: 0.4 });
    },
  },
  {
    name: "smudge-focus",
    family: "O emphasis",
    note: "MotionSet: blur — the single most common effect (266 files)",
    line: "Ink blooms out of focus, then pulls back sharp",
    cfg: { word: { en: "Focus", zh: "聚焦" } },
    build: function (S, tl, CFG, SEED, DUR) {
      var slot = S.slots.center(0.66, 0.34);
      var r = Math.min(slot.w, slot.h) * 0.62;
      var halo = S.add(HW.circle(r, { seed: SEED, overshoot: 0.3 }), {
        x: slot.cx - r, y: slot.cy - r, ink: "accent", width: 3, seed: SEED,
        fill: "var(--hw-accent)", fillStyle: "hachure", hachureGap: 7, fillWeight: 2.4,
      });
      var word = S.boxText(slot, pick(CFG.word), { role: "display", pad: 0.08, maxLines: 1 });
      gsap.set(word.items, { opacity: 1 });
      word.items.forEach(function (it) { HW.claim(it); });
      gsap.set(word.el, { opacity: 0, filter: "blur(" + Math.round(S.short * 0.024) + "px)", scale: 1.25, transformOrigin: "50% 50%" });
      [].concat(halo).forEach(function (el) { HW.claim(el); });
      gsap.set(halo, { opacity: 0 });
      tl.to(halo, { opacity: 0.55, duration: 0.4, ease: "expo.out" }, 0.3);
      tl.to(word.el, { opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.5, ease: "expo.out" }, 0.55);
      tl.to(halo, { opacity: 0.16, duration: 0.4, ease: "power3.in" }, 1.1);
      tl.to(word.el, { filter: "blur(" + Math.round(S.short * 0.013) + "px)", opacity: 0, duration: 0.34, ease: "power3.in" }, DUR - 0.5);
      HW.boil(tl, halo, { seed: SEED, amp: 0.5 });
    },
  },
  {
    name: "highlighter-sweep",
    family: "O emphasis",
    note: "MotionSet: shine / shimmer sweep (13 files)",
    line: "A highlighter drags across the line in one pass",
    cfg: { sentence: { en: "Every shot earns its place", zh: "每一镜都得站得住" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.88, 0.18);
      var line = S.boxText(slot, pick(CFG.sentence), { role: "title", pad: 0.04, maxLines: 2 });
      HW.wordsIn(tl, line, { at: 0.3, step: 0.06 });
      var gb = S.glyphBand(line.items);
      var bh = gb.h + gb.fs * 0.34;
      var band = S.add(HW.rect(gb.w + gb.fs * 0.4, bh, { seed: SEED, r: 3 }), {
        x: gb.x - gb.fs * 0.2, y: gb.cy - bh / 2, seed: SEED, ink: "accent", width: 2,
        fill: "var(--hw-accent)", fillStyle: "hachure", hachureGap: 6, fillWeight: 6, hachureAngle: 0,
      });
      HW.grow(tl, band, { at: 1.5, dur: 0.5, axis: "x", from: 0.001, ease: "power4.inOut" });
      tl.to(band, { opacity: 0.45, duration: 0.3 }, 2.0);
      HW.boil(tl, band, { seed: SEED, amp: 0.4 });
    },
  },
  {
    name: "card-flip-turn",
    family: "N transform",
    note: "MotionSet: rotateY / 3D flip (26 files)",
    line: "A card turns over to show what is on its back",
    cfg: { front: { en: "Question", zh: "问题" }, back: { en: "Answer", zh: "答案" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.66, 0.34);
      var f = S.add(HW.rect(slot.w, slot.h, { seed: SEED }), { x: slot.x, y: slot.y, seed: SEED });
      var ft = S.boxText(slot, pick(CFG.front), { role: "title", maxLines: 1 });
      var b = S.add(HW.rect(slot.w, slot.h, { seed: SEED + 6 }), {
        x: slot.x, y: slot.y, seed: SEED + 6, ink: "accent",
        fill: "var(--hw-accent)", fillStyle: "hachure", hachureGap: 18, fillWeight: 1.6,
      });
      var bt = S.boxText(slot, pick(CFG.back), { role: "title", maxLines: 1 });
      [].concat(b).forEach(function (el) { HW.claim(el); });
      gsap.set([].concat(b, bt.el, bt.items), { opacity: 0 });
      bt.items.forEach(function (it) { HW.claim(it); });
      HW.draw(tl, f, { at: 0.3, dur: 0.46 });
      HW.wordsIn(tl, ft, { at: 0.78, step: 0.06 });
      gsap.set([HW.host(f), HW.host(b)], { transformOrigin: "50% 50%" });
      tl.to([HW.host(f), ft.el], { scaleX: 0.02, duration: 0.26, ease: "power3.in" }, 1.7);
      tl.set([].concat(f, ft.el), { opacity: 0 }, 1.96);
      tl.set([].concat(b, bt.el, bt.items), { opacity: 1 }, 1.96);
      tl.fromTo([HW.host(b), bt.el], { scaleX: 0.02 }, { scaleX: 1, duration: 0.3, ease: "expo.out" }, 1.96);
      HW.boil(tl, [].concat(f, b), { seed: SEED });
    },
  },
  {
    name: "odometer-roll",
    family: "P data",
    note: "MotionSet: counter / odometer (26 files)",
    line: "Digits roll into place on a drawn dial",
    cfg: { value: 384, label: { en: "production prompts", zh: "份生产提示词" } },
    build: function (S, tl, CFG, SEED) {
      var digits = String(CFG.value).split("");
      var dial = S.slots.center(Math.min(0.82, 0.2 * digits.length + 0.16), 0.24, { dy: -0.04 });
      var pad = dial.w * 0.05;
      var cw = (dial.w - pad * 2) / digits.length;
      var box = S.add(HW.rect(dial.w, dial.h, { seed: SEED, r: dial.h * 0.06 }), { x: dial.x, y: dial.y, seed: SEED });
      HW.draw(tl, box, { at: 0.3, dur: 0.46 });
      digits.forEach(function (d, i) {
        var cell = S.rect(dial.x + pad + cw * i, dial.y, cw, dial.h);
        /* Only the dividers that exist — one fewer than the digit count. A shape built and
           never animated used to render fully-formed at t=0, which is where the phantom
           fourth divider came from. */
        if (i < digits.length - 1) {
          var sep = S.add(HW.line(0, 0, 0, dial.h, { seed: SEED + i, amp: 2, segs: 4 }),
            { x: cell.x2, y: dial.y, ink: "soft", width: 2, seed: SEED + i });
          HW.draw(tl, sep, { at: 0.55 + i * 0.06, dur: 0.3 });
        }
        var size = Math.round(Math.min(dial.h * 0.56, cw * 0.8));
        var el = S.text("0", { cx: cell.cx, y: cell.cy - size * 0.64, size: size, w: cw });
        el.style.opacity = 1; el.style.fontVariantNumeric = "tabular-nums";
        var roll = { v: 0 };
        tl.to(roll, {
          v: parseInt(d, 10), duration: 0.62 + i * 0.12, ease: "expo.out",
          onUpdate: function () { el.textContent = String(Math.round(roll.v)); },
        }, 0.85);
      });
      var lb = S.boxText(S.below(box, { gap: 0.028, w: 0.72, h: 0.1 }), pick(CFG.label),
        { role: "label", color: "var(--hw-ink-soft)", maxLines: 1 });
      HW.wordsIn(tl, lb, { at: 1.7, step: 0.045 });
      HW.boil(tl, box, { seed: SEED, amp: 0.4 });
    },
  },
  {
    name: "explode-parts",
    family: "N transform",
    note: "MotionSet: morph / assemble (54 files)",
    line: "One object flies apart into its labelled pieces",
    cfg: { parts: { en: ["Primitives", "Slots", "Timing", "Lint"], zh: ["原语", "槽位", "编排", "校验"] } },
    build: function (S, tl, CFG, SEED) {
      var parts = pick(CFG.parts);
      var core = S.slots.center(0.24, 0.13);
      var coreBox = S.add(HW.rect(core.w, core.h, { seed: SEED, r: core.h * 0.08 }), { x: core.x, y: core.y, seed: SEED });
      HW.draw(tl, coreBox, { at: 0.3, dur: 0.46 });
      var cells = S.slots.radial(parts.length, { r: 0.74, w: 0.3, h: 0.11 });
      cells.forEach(function (c, i) {
        var chip = S.add(HW.rect(c.w, c.h, { seed: SEED + 10 + i, r: c.h * 0.1 }), {
          x: c.x, y: c.y, seed: SEED + 10 + i, ink: "accent",
          fill: "var(--hw-accent)", fillStyle: "zigzag", hachureGap: 16, fillWeight: 1.4,
        });
        var t = S.boxText(c, parts[i], { role: "label", maxLines: 1, pad: 0.08 });
        gsap.set(HW.host(chip), { x: core.cx - c.cx, y: core.cy - c.cy, scale: 0.35, transformOrigin: "50% 50%" });
        [].concat(chip).forEach(function (el) { HW.claim(el); });
        gsap.set([].concat(chip, t.el, t.items), { opacity: 0 });
        t.items.forEach(function (it) { HW.claim(it); });
        gsap.set(t.el, { x: core.cx - c.cx, y: core.cy - c.cy });
        var at = 1.15 + i * 0.09;
        tl.to([].concat(chip, t.el, t.items), { opacity: 1, duration: 0.18 }, at);
        tl.to(HW.host(chip), { x: 0, y: 0, scale: 1, duration: 0.52, ease: "expo.out" }, at);
        tl.to(t.el, { x: 0, y: 0, duration: 0.52, ease: "expo.out" }, at);
      });
      tl.to(coreBox, { opacity: 0.3, duration: 0.3 }, 1.3);
      HW.boil(tl, coreBox, { seed: SEED });
    },
  },

  /* ══════════════ Migrated to the layout system ══════════════
     Same geometry as the original cards, expressed as relationships instead of pixels. */
  {
    name: "title-box-stamp", family: "A opening",
    note: "migrated — stamp pops, paper recoils once",
    line: "Title lands, then a serrated stamp slams into the corner",
    cfg: { title: { en: "The card library shipped", zh: "画面卡库上线了" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.88, 0.26, { dy: -0.1 });
      var box = S.add(HW.rect(slot.w, slot.h, { seed: SEED }), { x: slot.x, y: slot.y, seed: SEED });
      var title = S.boxText(slot, pick(CFG.title), { role: "title", maxLines: 2 });
      var sr = Math.min(S.safe.w, S.safe.h) * 0.1;
      var sp = S.below(box, { gap: 0.05, w: 0.3, h: 0.16 });
      var seal = S.add(HW.stamp(sr, { seed: SEED + 9 }), { x: sp.cx + S.safe.w * 0.22, y: sp.cy - sr, ink: "accent", seed: SEED + 9 });
      var tick = S.add(HW.check(sr * 0.9, { seed: SEED + 2 }), { x: sp.cx + S.safe.w * 0.22 + sr * 0.55, y: sp.cy - sr * 0.5, ink: "accent", seed: SEED + 2 });
      HW.draw(tl, box, { at: 0.3 });
      HW.wordsIn(tl, title, { at: 0.76 });
      HW.pop(tl, seal, { at: 2.3, dur: 0.34, from: 1.25 });
      tl.to(S.root, { y: 2, duration: 0.06 }, 2.58).to(S.root, { y: 0, duration: 0.06 }, 2.64);
      HW.draw(tl, tick, { at: 2.78, dur: 0.36 });
      HW.boil(tl, [].concat(box, seal, tick), { seed: SEED });
    },
  },
  {
    name: "title-banner-ribbon", family: "A opening",
    note: "migrated — ribbon unfurls from the centre",
    line: "A drawn ribbon banner unfurls with the title across it",
    cfg: { title: { en: "Episode One · Paper Studies", zh: "第一期 · 手绘实验" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.9, 0.2, { dy: -0.06 });
      var band = S.add(HW.ribbon(slot.w, slot.h, { seed: SEED, notch: slot.w * 0.04 }), { x: slot.x, y: slot.y, seed: SEED });
      var title = S.boxText(slot, pick(CFG.title), { role: "title", pad: 0.1, maxLines: 1 });
      var u = S.below(band, { gap: 0.03, w: 0.44, h: 0.05 });
      var wave = S.add(HW.wave(u.w, { seed: SEED + 4 }), { x: u.x, y: u.cy, ink: "accent", seed: SEED + 4 });
      HW.grow(tl, band, { at: 0.3, dur: 0.42, axis: "x", from: 0.001, origin: "50% 50%" });
      HW.wordsIn(tl, title, { at: 0.82 });
      HW.draw(tl, wave, { at: 1.8 });
      HW.boil(tl, [].concat(band, wave), { seed: SEED });
    },
  },
  {
    name: "title-question-mark", family: "A opening",
    note: "migrated — the film now owes an answer",
    line: "An oversized question mark lands, the question written beside it",
    cfg: { question: { en: "Why does every film\nlook the same?", zh: "为什么每支片\n都长一个样？" } },
    build: function (S, tl, CFG, SEED) {
      var two = S.slots.split(2, { gap: 0.05 });
      var markSlot = two[0], textSlot = two[1];
      var r = Math.min(markSlot.w, markSlot.h) * 0.3;
      var w = Math.max(5, S.short * 0.016);
      var hook = S.add(HW.arc(r, -Math.PI * 0.95, Math.PI * 0.42, { seed: SEED }), { x: markSlot.cx - r, y: markSlot.cy - r * 1.5, ink: "accent", width: w, seed: SEED });
      var tail = S.add(HW.line(0, 0, r * 0.06, r * 0.85, { seed: SEED + 1, amp: 3 }), { x: markSlot.cx, y: markSlot.cy + r * 0.05, ink: "accent", width: w, seed: SEED + 1 });
      var dot = S.add(HW.circleAt(0, 0, r * 0.12, SEED + 2, 1.4), { x: markSlot.cx + r * 0.06, y: markSlot.cy + r * 1.2, ink: "accent", width: w * 0.9, seed: SEED + 2 });
      var q = S.boxText(textSlot, pick(CFG.question), { role: "body", maxLines: 3 });
      HW.draw(tl, [].concat(hook, tail), { at: 0.3, dur: 0.5, stagger: 0.1 });
      HW.pop(tl, dot, { at: 1.0, dur: 0.26 });
      HW.wordsIn(tl, q, { at: 1.2, step: 0.07 });
      HW.boil(tl, [].concat(hook, tail, dot), { seed: SEED });
    },
  },
  {
    name: "title-scribble-reveal", family: "A opening",
    note: "migrated — high energy, at most one per film",
    line: "A scribble block fills the frame and the title emerges from it",
    cfg: { title: { en: "Stop using a fixed formula", zh: "别再用固定套路" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.9, 0.2);
      var title = S.boxText(slot, pick(CFG.title), { role: "title", maxLines: 2 });
      gsap.set(title.items, { opacity: 1 });
      title.items.forEach(function (it) { HW.claim(it); });
      title.el.style.clipPath = "inset(0 100% 0 0)";
      var g = S.glyphBand(title.items);
      var ink = S.add(HW.scribbleFill(g.w + g.fs * 0.4, g.h + g.fs * 0.4, { seed: SEED, gap: g.fs * 0.22 }),
        { x: g.x - g.fs * 0.2, y: g.cy - (g.h + g.fs * 0.4) / 2, ink: "accent", width: Math.max(3, S.short * 0.004), seed: SEED });
      HW.draw(tl, ink, { at: 0.3, dur: 0.62 });
      tl.to(title.el, { clipPath: "inset(0 0% 0 0)", duration: 0.62, ease: "power4.inOut" }, 0.3);
      tl.to(ink, { opacity: 0.28, duration: 0.3, ease: "power3.in" }, 1.05);
      HW.boil(tl, ink, { seed: SEED });
    },
  },
  {
    name: "title-sticky-slap", family: "A opening",
    note: "migrated — settle angle lives on the host, not the note",
    line: "A sticky note slaps onto the paper with the title on it",
    cfg: { title: { en: "Quick note to self", zh: "随手记一笔" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.68, 0.36, { dy: -0.04 });
      var note = S.add(HW.sticky(slot.w, slot.h, { seed: SEED }), { x: slot.x, y: slot.y, seed: SEED });
      var title = S.boxText(slot, pick(CFG.title), { role: "title", pad: 0.14, maxLines: 2 });
      var pin = S.add(HW.pin({ seed: SEED + 4, r: Math.max(10, S.short * 0.016) }), { x: slot.cx - S.short * 0.016, y: slot.y - S.short * 0.03, ink: "accent", seed: SEED + 4 });
      gsap.set(HW.host(note), { transformOrigin: "50% 50%" });
      [].concat(note).forEach(function (el) { HW.claim(el); });
      tl.fromTo(HW.host(note), { rotation: -8, scale: 1.12 }, { rotation: -2, scale: 1, duration: 0.36, ease: "expo.out" }, 0.28);
      tl.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.28);
      HW.wordsIn(tl, title, { at: 0.8 });
      HW.pop(tl, pin, { at: 0.62, dur: 0.28 });
      HW.boil(tl, note, { seed: SEED, amp: 0.5 });
    },
  },
  {
    name: "big-number-annotate", family: "B assertion",
    note: "migrated — annotation anchored to the number",
    line: "An oversized number owns the frame, a handwritten note arrowed in",
    cfg: { value: 52, unit: { en: "cards", zh: "张卡" }, note: { en: "nine families", zh: "覆盖九类语义" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.8, 0.34, { dy: -0.08 });
      var num = S.text("0", { cx: slot.cx, y: slot.cy - S.type("hero") * 0.62, size: S.type("hero"), w: slot.w });
      num.style.opacity = 1; num.style.fontVariantNumeric = "tabular-nums";
      var unitSlot = S.rightOf(num, { gap: 0.01, w: 0.22, h: 0.1, cy: slot.cy + S.type("hero") * 0.24 });
      var unit = S.boxText(unitSlot, pick(CFG.unit), { role: "body", maxLines: 1 });
      var noteSlot = S.below(num, { gap: 0.06, w: 0.56, h: 0.1 });
      var a = HW.arrow(S.safe.w * 0.16, S.safe.h * 0.06, { kind: "swoop", seed: SEED });
      var ar = S.add([a.shaft, a.head], { x: noteSlot.cx - S.safe.w * 0.08, y: noteSlot.y - S.safe.h * 0.06, ink: "accent", seed: SEED });
      var note = S.boxText(noteSlot, pick(CFG.note), { role: "label", color: "var(--hw-ink-soft)", maxLines: 1 });
      HW.countUp(tl, num, 0, CFG.value, { at: 0.35, dur: 0.62 });
      HW.wordsIn(tl, unit, { at: 0.9, step: 0.05 });
      HW.draw(tl, ar, { at: 1.25, dur: 0.42, stagger: 0.1 });
      HW.wordsIn(tl, note, { at: 1.6, step: 0.05 });
      HW.boil(tl, ar, { seed: SEED });
    },
  },
  {
    name: "bracket-group-list", family: "C enumeration",
    note: "migrated — brace points at the name it generalises into",
    line: "A large brace gathers several items into one group",
    cfg: { items: { en: ["Draw-on entrance", "Boil", "Word stagger"], zh: ["描线进场", "沸腾呼吸", "逐词错峰"] },
           groupName: { en: "Three laws", zh: "三定律" } },
    build: function (S, tl, CFG, SEED) {
      var items = pick(CFG.items);
      var two = S.slots.split(2, { gap: 0.04 });
      var listSide = two[0], nameSide = two[1];
      var rows = S.slots.rows(items.length, { w: 1, gap: 0.02, block: 0.42 });
      var els = items.map(function (txt, i) {
        var r = S.rect(listSide.x, rows[i].y, listSide.w, rows[i].h);
        var t = S.boxText(r, txt, { role: "label", maxLines: 1 });
        HW.wordsIn(tl, t, { at: 0.35 + i * 0.14, step: 0.05 });
        return t;
      });
      var span = S.boundsOf(els.map(function (e) { return e.el; }));
      var arm = Math.min(S.safe.w * 0.04, span.h * 0.2);
      var side = S.portrait ? "left" : "right";
      var br = S.add(HW.brace(span.h * 1.15, { seed: SEED, arm: arm, side: side }),
        { x: S.portrait ? span.cx - arm / 2 : span.x2 + arm * 0.6, y: span.cy - span.h * 0.575, seed: SEED });
      var name = S.boxText(nameSide, pick(CFG.groupName), { role: "title", maxLines: 1 });
      var t0 = 0.35 + items.length * 0.14;
      HW.draw(tl, br, { at: t0 + 0.2, dur: 0.5 });
      HW.wordsIn(tl, name, { at: t0 + 0.75, step: 0.07 });
      HW.boil(tl, br, { seed: SEED });
    },
  },
  {
    name: "card-stack-deal", family: "C enumeration",
    note: "migrated — dealt from one point, repositioning ease",
    line: "Cards are dealt out one by one and spread into a row",
    cfg: { items: { en: ["Primitives", "Layout", "Timing"], zh: ["原语", "版面", "编排"] } },
    build: function (S, tl, CFG, SEED) {
      var items = pick(CFG.items);
      var cells = S.slots.grid(items.length, { gap: 0.045, block: 0.4 });
      var origin = S.slots.center(0.1, 0.1);
      items.forEach(function (txt, i) {
        var c = cells[i];
        var box = S.add(HW.rect(c.w, c.h, { seed: SEED + i }), { x: c.x, y: c.y, seed: SEED + i });
        var t = S.boxText(c, txt, { role: "label", maxLines: 1 });
        var at = 0.3 + i * 0.1;
        gsap.set(HW.host(box), { x: origin.cx - c.cx, y: origin.cy - c.cy, rotation: HW.hash(i, SEED) * 14, transformOrigin: "50% 50%" });
        gsap.set(t.el, { x: origin.cx - c.cx, y: origin.cy - c.cy });
        [].concat(box).forEach(function (el) { HW.claim(el); });
        gsap.set([].concat(box, t.el, t.items), { opacity: 0 });
        t.items.forEach(function (it) { HW.claim(it); });
        tl.to([].concat(box, t.el, t.items), { opacity: 1, duration: 0.18 }, at);
        tl.to(HW.host(box), { x: 0, y: 0, rotation: HW.hash(i + 9, SEED) * 2, duration: 0.46, ease: "power4.inOut" }, at);
        tl.to(t.el, { x: 0, y: 0, duration: 0.46, ease: "power4.inOut" }, at);
      });
    },
  },
  {
    name: "icon-row-doodle", family: "C enumeration",
    note: "migrated — only semantic icons, never filler geometry",
    line: "A row of simple drawn icons appears one at a time, labelled",
    cfg: { items: [
      { icon: "bulb", label: { en: "Insight", zh: "洞察" } },
      { icon: "gear", label: { en: "Mechanism", zh: "机制" }, hot: true },
      { icon: "magnifier", label: { en: "Detail", zh: "细看" } },
    ] },
    build: function (S, tl, CFG, SEED) {
      var cells = S.slots.grid(CFG.items.length, { gap: 0.05, block: 0.5 });
      CFG.items.forEach(function (item, i) {
        var c = cells[i];
        var size = Math.min(c.w, c.h) * 0.58;
        /* Primitives disagree about their argument: gear and magnifier take a RADIUS, bulb and
           stickman take an overall size. Normalising here keeps every icon on the row the same
           visual weight — passing size where a radius was expected draws it at double scale. */
        var d, boxW;
        if (item.icon === "gear") { d = HW.gear(size / 2, { seed: SEED + i }); boxW = size; }
        else if (item.icon === "magnifier") { d = HW.magnifier(size * 0.3, { seed: SEED + i }); boxW = size * 0.75; }
        else { d = HW[item.icon](size, { seed: SEED + i }); boxW = size; }
        var ic = S.add(d, { x: c.cx - boxW / 2, y: c.y, ink: item.hot ? "accent" : "ink", width: Math.max(4, S.short * 0.005), seed: SEED + i });
        /* The label band gets the full space below the icon, not a fixed 0.22 slice — at 1:1
           the slice ran 3px shy of one line of label type and the text poked out of it. */
        var lb = S.boxText(S.rect(c.x, c.y + size + c.h * 0.02, c.w, c.y2 - (c.y + size + c.h * 0.02)), pick(item.label), { role: "label", pad: 0.06, maxLines: 1 });
        HW.draw(tl, ic, { at: 0.4 + i * 0.18, dur: 0.42, stagger: 0.06 });
        HW.wordsIn(tl, lb, { at: 0.75 + i * 0.18, step: 0.05 });
        HW.boil(tl, ic, { seed: SEED + i });
      });
    },
  },
  {
    name: "sticky-wall-grid", family: "C enumeration",
    note: "migrated — scatter() jitter is deterministic",
    line: "Sticky notes slap onto a wall one at a time, each slightly askew",
    cfg: { items: { en: ["Opening", "Assertion", "List", "Process", "Compare", "Closing"],
                    zh: ["开场", "断言", "列举", "流程", "对比", "落版"] } },
    build: function (S, tl, CFG, SEED) {
      var items = pick(CFG.items);
      var cells = S.slots.scatter(items.length, { seed: SEED, block: 0.8 });
      /* The slap-in overshoots to 1.14. Drawing the note at the full cell would put that peak
         outside the safe area for the first third of a second — the guarantee is "always
         inside", not "inside once it settles". So the note is drawn at cell / overshoot and the
         peak lands exactly on the cell. */
      var OVER = 1.14;
      items.forEach(function (txt, i) {
        var c = cells[i];
        var nw = c.w / OVER, nh = c.h / OVER;
        var inner = S.rect(c.cx - nw / 2, c.cy - nh / 2, nw, nh);
        var note = S.add(HW.sticky(nw, nh, { seed: SEED + i }), { x: inner.x, y: inner.y, rot: c.rot, seed: SEED + i });
        var t = S.boxText(inner, txt, { role: "label", pad: 0.16, maxLines: 1 });
        var at = 0.35 + i * 0.09;
        gsap.set(HW.host(note), { transformOrigin: "50% 50%" });
        [].concat(note).forEach(function (el) { HW.claim(el); });
        tl.fromTo([].concat(note), { opacity: 0 }, { opacity: 1, duration: 0.18 }, at);
        tl.fromTo(HW.host(note), { scale: OVER }, { scale: 1, duration: 0.32, ease: "expo.out" }, at);
        HW.pop(tl, t.el, { at: at + 0.14, dur: 0.3 });
        t.items.forEach(function (it) { HW.claim(it); });
        gsap.set(t.items, { opacity: 1 });
        HW.boil(tl, note, { seed: SEED + i, amp: 0.5 });
      });
    },
  },

  {
    name: "step-ladder-climb", family: "D process",
    note: "migrated — ladder() rises inside the safe area at any aspect",
    line: "Steps stack upward, one stage written on each",
    cfg: { steps: { en: ["It runs", "It looks right", "It never repeats"], zh: ["能跑", "好看", "不重样"] } },
    build: function (S, tl, CFG, SEED) {
      var steps = pick(CFG.steps);
      var slots = S.slots.ladder(steps.length, { w: 0.36, h: 0.12, rise: 0.82 });
      steps.forEach(function (txt, i) {
        var c = slots[i], top = i === steps.length - 1;
        var box = S.add(HW.rect(c.w, c.h, { seed: SEED + i }), { x: c.x, y: c.y, seed: SEED + i, ink: top ? "accent" : "ink" });
        var lb = S.boxText(c, txt, { role: "label", maxLines: 1 });
        var at = 0.4 + i * 1.1;
        /* The slide-in start state is a real on-screen position, so it has to respect the safe
           area too — an unbounded offset pushes the lowest step out through the bottom edge for
           the first frames. Bound it by the headroom that actually exists below the slot. */
        var rise = Math.min(c.h * 0.34, Math.max(0, S.safe.y2 - c.y2));
        gsap.set(HW.host(box), { y: rise });
        HW.draw(tl, box, { at: at, dur: 0.4 });
        tl.to(HW.host(box), { y: 0, duration: 0.4, ease: "expo.out" }, at);
        HW.wordsIn(tl, lb, { at: at + 0.42, step: 0.05 });
        HW.boil(tl, box, { seed: SEED + i });
      });
    },
  },
  {
    name: "timeline-thread", family: "D process",
    note: "migrated — rail follows the long axis of the frame",
    line: "One long drawn line crosses the frame, nodes lighting up along it",
    cfg: { nodes: { en: ["Fixed formula", "Primitive kit", "64 cards"], zh: ["固定套路", "原语库", "六十四张卡"] } },
    build: function (S, tl, CFG, SEED) {
      var nodes = pick(CFG.nodes);
      var down = S.portrait;
      var run = down ? S.safe.h * 0.7 : S.safe.w * 0.86;
      var x0 = down ? S.safe.cx : S.safe.cx - run / 2;
      var y0 = down ? S.safe.cy - run / 2 : S.safe.cy;
      var rail = S.add(HW.line(0, 0, down ? 0 : run, down ? run : 0, { seed: SEED, amp: 3, segs: 14 }), { x: x0, y: y0, seed: SEED });
      HW.draw(tl, rail, { at: 0.3, dur: 0.7 });
      var nr = Math.max(8, S.short * 0.014);
      nodes.forEach(function (node, i) {
        var t = nodes.length === 1 ? 0.5 : i / (nodes.length - 1);
        var px = down ? x0 : x0 + run * t;
        var py = down ? y0 + run * t : y0;
        var hot = i === nodes.length - 1;
        var dot = S.add(HW.circleAt(0, 0, nr, SEED + i, 1.4), { x: px, y: py, ink: hot ? "accent" : "ink", width: Math.max(4, S.short * 0.005), seed: SEED + i });
        var side = i % 2 === 0 ? -1 : 1;
        var lw = down ? S.safe.w * 0.36 : S.safe.w * 0.24;
        var lh = S.safe.h * 0.08;
        var slot = down
          ? S.rect(px + side * (lw / 2 + nr * 2) - lw / 2, py - lh / 2, lw, lh)
          : S.rect(px - lw / 2, py + side * (lh * 1.1) - lh / 2, lw, lh);
        slot = S.rect(Math.max(S.safe.x, Math.min(slot.x, S.safe.x2 - lw)), Math.max(S.safe.y, Math.min(slot.y, S.safe.y2 - lh)), lw, lh);
        var lb = S.boxText(slot, node, { role: "label", maxLines: 2 });
        var at = 1.0 + i * 0.85;
        HW.pop(tl, dot, { at: at, dur: 0.26 });
        HW.wordsIn(tl, lb, { at: at + 0.12, step: 0.05 });
        HW.boil(tl, dot, { seed: SEED + i });
      });
      HW.boil(tl, rail, { seed: SEED });
    },
  },
  {
    name: "loop-cycle-arrows", family: "D process",
    note: "migrated — the closing arrow returns to the first node",
    line: "Nodes ringed together, arrows joining them head to tail",
    cfg: { nodes: { en: ["Write", "Select", "Render"], zh: ["写稿", "选卡", "出片"] } },
    build: function (S, tl, CFG, SEED) {
      var nodes = pick(CFG.nodes);
      var cells = S.slots.radial(nodes.length, { r: 0.66, w: 0.32, h: 0.11 });
      cells.forEach(function (c, i) {
        var box = S.add(HW.rect(c.w, c.h, { seed: SEED + i }), { x: c.x, y: c.y, seed: SEED + i });
        var lb = S.boxText(c, nodes[i], { role: "label", maxLines: 1 });
        /* On the arc between this node and the next, turned to follow the orbit. Sitting the
           arrow at the chord's midpoint instead drops it in the middle of the ring pointing
           whichever way it was drawn, which reads as three loose arrows rather than a cycle. */
        var mid = c.angle + Math.PI / cells.length;
        var m = cells.at(mid, 1.0);
        var aw = Math.min(S.safe.w, S.safe.h) * 0.18;
        var a = HW.arrow(aw, aw * 0.7, { kind: "curve", seed: SEED + 30 + i, bow: -aw * 0.28 });
        var ar = S.add([a.shaft, a.head], {
          x: m.x - aw / 2, y: m.y - aw * 0.35, rot: (mid + Math.PI / 2) * 180 / Math.PI,
          ink: "accent", seed: SEED + 30 + i,
        });
        var at = 0.4 + i * 1.05;
        HW.draw(tl, box, { at: at, dur: 0.42 });
        HW.wordsIn(tl, lb, { at: at + 0.44, step: 0.05 });
        HW.draw(tl, ar, { at: at + 0.72, dur: 0.36, stagger: 0.08 });
        HW.boil(tl, [].concat(box, ar), { seed: SEED + i });
      });
    },
  },
  {
    name: "flow-branch-fork", family: "D process",
    note: "migrated — branches mirror, recommended path takes accent",
    line: "One path runs out and splits in two",
    cfg: { a: { en: "Semantic pick", zh: "语义选卡" }, b: { en: "Fallback", zh: "兜底骨架" } },
    build: function (S, tl, CFG, SEED) {
      /* Same rule as series(): the trunk runs along the LONG axis. Kept horizontal in
         portrait it pins both branches against the right edge and wastes the whole left
         half of the frame. */
      var P = S.portrait;
      var fork = P
        ? { x: S.safe.cx, y: S.safe.y + S.safe.h * 0.30 }
        : { x: S.safe.x + S.safe.w * 0.34, y: S.safe.cy };
      var stem = P
        ? S.add(HW.line(0, 0, 0, S.safe.h * 0.24, { seed: SEED, amp: 3, segs: 8 }), { x: fork.x, y: S.safe.y + S.safe.h * 0.06, seed: SEED })
        : S.add(HW.line(0, 0, S.safe.w * 0.24, 0, { seed: SEED, amp: 3, segs: 8 }), { x: S.safe.x + S.safe.w * 0.1, y: fork.y, seed: SEED });
      HW.draw(tl, stem, { at: 0.3, dur: 0.44 });
      var dy = S.safe.h * 0.19;
      var bw = S.safe.w * (P ? 0.46 : 0.4), bh = S.safe.h * (P ? 0.12 : 0.14);
      [[-1, pick(CFG.a)], [1, pick(CFG.b)]].forEach(function (br, i) {
        var d = br[0];
        var slot = P
          ? S.rect(d < 0 ? S.safe.x : S.safe.x2 - bw, fork.y + S.safe.h * 0.20, bw, bh)
          : S.rect(Math.min(fork.x + S.safe.w * 0.22, S.safe.x2 - bw), fork.y + d * dy - bh / 2, bw, bh);
        var leg = P
          ? S.add(HW.polyD([[0, 0], [(slot.cx - fork.x) * 0.55, S.safe.h * 0.1], [slot.cx - fork.x, S.safe.h * 0.2]]),
            { x: fork.x, y: fork.y, ink: i === 0 ? "accent" : "ink", seed: SEED + 3 + i })
          : S.add(HW.polyD([[0, 0], [S.safe.w * 0.07, d * dy * 0.55], [S.safe.w * 0.2, d * dy]]),
            { x: fork.x, y: fork.y, ink: i === 0 ? "accent" : "ink", seed: SEED + 3 + i });
        var box = S.add(HW.rect(slot.w, slot.h, { seed: SEED + 5 + i }), { x: slot.x, y: slot.y, seed: SEED + 5 + i, ink: i === 0 ? "accent" : "ink" });
        var lb = S.boxText(slot, br[1], { role: "label", maxLines: 1 });
        HW.draw(tl, leg, { at: 1.0, dur: 0.44 });
        HW.draw(tl, box, { at: 1.5, dur: 0.42 });
        HW.wordsIn(tl, lb, { at: 1.95, step: 0.05 });
        HW.boil(tl, [].concat(leg, box), { seed: SEED + 5 + i });
      });
      HW.boil(tl, stem, { seed: SEED });
    },
  },
  {
    name: "funnel-narrow", family: "D process",
    note: "migrated — widths come from the real ratios",
    line: "A funnel narrows layer by layer, each labelled with its count",
    cfg: { layers: [{ value: 387 }, { value: 96 }, { value: 52 }] },
    build: function (S, tl, CFG, SEED) {
      var n = CFG.layers.length;
      var field = S.slots.center(0.8, 0.62, { dy: -0.02 });
      var LH = field.h / n;
      var max = CFG.layers[0].value;
      var wAt = function (i) { return field.w * (i === 0 ? 1 : CFG.layers[i - 1].value / max); };
      CFG.layers.forEach(function (L, i) {
        var w0 = wAt(i), w1 = field.w * (L.value / max);
        var y = field.y + i * LH;
        var seg = S.add(HW.polyD([[-w0 / 2, 0], [w0 / 2, 0], [w1 / 2, LH], [-w1 / 2, LH], [-w0 / 2, 0]]),
          { x: field.cx, y: y, ink: i === n - 1 ? "accent" : "ink", seed: SEED + i });
        var num = S.text("0", { cx: field.cx, y: y + LH * 0.2, size: Math.round(Math.min(LH * 0.5, S.type("body"))), w: w1 * 0.9 });
        num.style.opacity = 1; num.style.fontVariantNumeric = "tabular-nums";
        var at = 0.4 + i * 0.75;
        HW.draw(tl, seg, { at: at, dur: 0.44 });
        HW.countUp(tl, num, 0, L.value, { at: at, dur: 0.44 });
        HW.boil(tl, seg, { seed: SEED + i });
      });
    },
  },
  {
    name: "before-after-arrow", family: "E comparison",
    note: "migrated — split() flips the axis, arrow follows",
    line: "Before on one side, a heavy arrow, after on the other",
    cfg: { before: { en: "Five fixed shots", zh: "五个固定画面" }, after: { en: "Chosen per sentence", zh: "每句按语义选" } },
    build: function (S, tl, CFG, SEED) {
      var sides = S.slots.split(2, { gap: 0.16 });
      var down = S.portrait;
      var lb = S.add(HW.rect(sides[0].w, sides[0].h, { seed: SEED }), { x: sides[0].x, y: sides[0].y, seed: SEED });
      var lt = S.boxText(sides[0], pick(CFG.before), { role: "body", maxLines: 2 });
      var gapLen = down ? sides[1].y - sides[0].y2 : sides[1].x - sides[0].x2;
      var alen = gapLen * 0.8, aspan = alen * 0.5;
      var a = HW.arrow(alen, aspan, { kind: "straight", seed: SEED + 3, head: alen * 0.22 });
      var ar = S.add([a.shaft, a.head], {
        x: down ? sides[0].cx + aspan / 2 : sides[0].x2 + gapLen * 0.1,
        y: down ? sides[0].y2 + gapLen * 0.1 : sides[0].cy - aspan / 2,
        rot: down ? 90 : 0, ink: "accent", width: Math.max(6, S.short * 0.008), seed: SEED + 3,
      });
      var rb = S.add(HW.rect(sides[1].w, sides[1].h, { seed: SEED + 1 }), { x: sides[1].x, y: sides[1].y, seed: SEED + 1, ink: "accent" });
      var rt = S.boxText(sides[1], pick(CFG.after), { role: "body", maxLines: 2 });
      HW.draw(tl, lb, { at: 0.3, dur: 0.44 });
      HW.wordsIn(tl, lt, { at: 0.75, step: 0.055 });
      HW.draw(tl, ar, { at: 1.65, dur: 0.36, stagger: 0.08 });
      HW.draw(tl, rb, { at: 2.05, dur: 0.44 });
      HW.wordsIn(tl, rt, { at: 2.5, step: 0.06 });
      HW.boil(tl, [].concat(lb, ar, rb), { seed: SEED });
    },
  },
  {
    name: "scale-balance", family: "E comparison",
    note: "migrated — the beam actually tips; rotation on the host",
    line: "A balance holds something on each side, then tips",
    cfg: { sides: { en: ["Hardcoded", "Semantic"], zh: ["写死的结构", "语义驱动"] }, heavy: 1 },
    build: function (S, tl, CFG, SEED) {
      var labels = pick(CFG.sides);
      var field = S.slots.center(0.88, 0.5, { dy: -0.06 });
      var beamW = field.w * 0.86, beamY = field.y + field.h * 0.24;
      var post = S.add(HW.line(0, 0, 0, field.h * 0.62, { seed: SEED, amp: 2.4 }), { x: field.cx, y: beamY, seed: SEED });
      var beam = S.add(HW.line(0, 0, beamW, 0, { seed: SEED + 1, amp: 3 }), { x: field.cx - beamW / 2, y: beamY, width: Math.max(5, S.short * 0.006), seed: SEED + 1 });
      var panW = field.w * 0.3, panH = field.h * 0.22;
      var pans = [-1, 1].map(function (sgn, i) {
        var px = field.cx + sgn * beamW * 0.4;
        var slot = S.rect(px - panW / 2, beamY + field.h * 0.2, panW, panH);
        var pan = S.add(HW.rect(panW, panH, { seed: SEED + 4 + i }), { x: slot.x, y: slot.y, seed: SEED + 4 + i, ink: i === CFG.heavy ? "accent" : "ink" });
        var t = S.boxText(slot, labels[i], { role: "label", maxLines: 2 });
        return { pan: pan, t: t };
      });
      HW.draw(tl, [].concat(post, beam), { at: 0.3, dur: 0.44, stagger: 0.1 });
      pans.forEach(function (p, i) {
        HW.draw(tl, p.pan, { at: 0.9 + i * 0.25, dur: 0.4 });
        HW.wordsIn(tl, p.t, { at: 1.3 + i * 0.25, step: 0.05 });
      });
      var tilt = CFG.heavy === 0 ? -7 : 7;
      var drop = field.h * 0.06;
      gsap.set(HW.host(beam), { transformOrigin: "50% 50%" });
      tl.to(HW.host(beam), { rotation: tilt, duration: 0.5, ease: "power4.inOut" }, 2.3);
      tl.to([HW.host(pans[0].pan), pans[0].t.el], { y: tilt < 0 ? drop : -drop, duration: 0.5, ease: "power4.inOut" }, 2.3);
      tl.to([HW.host(pans[1].pan), pans[1].t.el], { y: tilt < 0 ? -drop : drop, duration: 0.5, ease: "power4.inOut" }, 2.3);
    },
  },
  {
    name: "matrix-quadrant", family: "E comparison",
    note: "migrated — the point lands off the quadrant labels",
    line: "Two axes divide four quadrants and a point lands in one",
    cfg: { quadNames: { en: ["Costly", "Worth it", "Avoid", "Easy win"], zh: ["费力不讨好", "值得做", "别碰", "顺手做"] },
           point: { x: 0.6, y: 0.28 } },
    build: function (S, tl, CFG, SEED) {
      var names = pick(CFG.quadNames);
      var field = S.slots.center(0.82, 0.62, { dy: -0.02 });
      var HX = field.w / 2, HY = field.h / 2;
      var ax = S.add(HW.line(0, 0, field.w, 0, { seed: SEED, amp: 2.6, segs: 10 }), { x: field.x, y: field.cy, ink: "ink", seed: SEED });
      var ay = S.add(HW.line(0, 0, 0, field.h, { seed: SEED + 1, amp: 2.6, segs: 8 }), { x: field.cx, y: field.y, ink: "ink", seed: SEED + 1 });
      HW.draw(tl, ax, { at: 0.3, dur: 0.5 });
      HW.draw(tl, ay, { at: 0.6, dur: 0.5 });
      names.forEach(function (nm, i) {
        var sx = i % 2 ? 1 : -1, sy = i < 2 ? -1 : 1;
        var qw = field.w * 0.4, qh = field.h * 0.16;
        var slot = S.rect(field.cx + sx * HX * 0.52 - qw / 2, field.cy + sy * HY * 0.62 - qh / 2, qw, qh);
        var t = S.boxText(slot, nm, { role: "note", color: "var(--hw-ink-soft)", maxLines: 1 });
        HW.wordsIn(tl, t, { at: 1.3 + i * 0.12, step: 0.04 });
      });
      var px = field.cx + CFG.point.x * HX, py = field.cy - CFG.point.y * HY;
      var pr = Math.max(9, S.short * 0.016);
      var dot = S.add(HW.circleAt(0, 0, pr, SEED + 7, 1.6), { x: px, y: py, ink: "accent", width: Math.max(5, S.short * 0.006), seed: SEED + 7 });
      var ring = S.add(HW.ellipse(pr * 3.4, pr * 2.8, { seed: SEED + 8, overshoot: 0.24 }), { x: px - pr * 3.4, y: py - pr * 2.8, ink: "accent", seed: SEED + 8 });
      HW.pop(tl, dot, { at: 2.2, dur: 0.28 });
      HW.draw(tl, ring, { at: 2.4, dur: 0.42 });
      HW.boil(tl, [].concat(ax, ay, dot, ring), { seed: SEED });
    },
  },
  {
    name: "pyramid-layers", family: "E comparison",
    note: "migrated — builds from the base up, apex called out",
    line: "A pyramid stacks from the base up, with the apex called out",
    cfg: { layers: { en: ["One claim", "Three reasons", "Lots of material"], zh: ["一句话主张", "三条论据", "大量素材"] } },
    build: function (S, tl, CFG, SEED) {
      var layers = pick(CFG.layers);
      var n = layers.length;
      var field = S.slots.center(0.8, 0.6, { dy: -0.02 });
      var LH = field.h / n;
      var wAt = function (i) { return field.w * (0.26 + 0.74 * (i / n)); };
      layers.slice().reverse().forEach(function (txt, k) {
        var i = n - 1 - k;
        var y = field.y2 - (n - i) * LH;
        var w0 = wAt(i), w1 = wAt(i + 1);
        var seg = S.add(HW.polyD([[-w0 / 2, 0], [w0 / 2, 0], [w1 / 2, LH], [-w1 / 2, LH], [-w0 / 2, 0]]),
          { x: field.cx, y: y, ink: i === 0 ? "accent" : "ink", seed: SEED + i });
        var t = S.boxText(S.rect(field.cx - w0 / 2, y, w0, LH), txt, { role: "label", pad: 0.08, maxLines: 1 });
        var at = 0.35 + k * 0.6;
        HW.draw(tl, seg, { at: at, dur: 0.42 });
        HW.wordsIn(tl, t, { at: at + 0.4, step: 0.05 });
        HW.boil(tl, seg, { seed: SEED + i });
      });
    },
  },
  {
    name: "map-orbit-center", family: "E comparison",
    note: "migrated — spokes start at the core's edge",
    line: "One circle at the centre with satellites radiating outward",
    cfg: { center: { en: "hw-kit", zh: "原语库" },
           nodes: { en: ["Boxes", "Lines", "Arrows", "Symbols", "Fills"], zh: ["框类", "线类", "箭头", "符号", "填充"] } },
    build: function (S, tl, CFG, SEED) {
      var nodes = pick(CFG.nodes);
      var CR = Math.min(S.safe.w, S.safe.h) * 0.11;
      var core = S.add(HW.ellipse(CR, CR, { seed: SEED, overshoot: 0.2 }), { x: S.safe.cx - CR, y: S.safe.cy - CR, ink: "accent", seed: SEED });
      var coreT = S.boxText(S.rect(S.safe.cx - CR, S.safe.cy - CR * 0.5, CR * 2, CR), pick(CFG.center), { role: "label", pad: 0.06, maxLines: 1 });
      HW.draw(tl, core, { at: 0.3, dur: 0.46 });
      HW.wordsIn(tl, coreT, { at: 0.72, step: 0.06 });
      var cells = S.slots.radial(nodes.length, { r: 0.82, w: 0.3, h: 0.1 });
      cells.forEach(function (c, i) {
        var a = c.angle;
        var dist = Math.sqrt(Math.pow(c.cx - S.safe.cx, 2) + Math.pow(c.cy - S.safe.cy, 2));
        var ux = (c.cx - S.safe.cx) / dist, uy = (c.cy - S.safe.cy) / dist;
        var spoke = S.add(HW.line(ux * CR, uy * CR, ux * (dist - c.h * 0.5), uy * (dist - c.h * 0.5), { seed: SEED + i, amp: 2.2, segs: 4 }),
          { x: S.safe.cx, y: S.safe.cy, ink: "soft", seed: SEED + i });
        var box = S.add(HW.rect(c.w, c.h, { seed: SEED + 10 + i }), { x: c.x, y: c.y, seed: SEED + 10 + i });
        var t = S.boxText(c, nodes[i], { role: "label", maxLines: 1 });
        var at = 1.3 + i * 0.22;
        HW.draw(tl, spoke, { at: at, dur: 0.34 });
        HW.draw(tl, box, { at: at + 0.2, dur: 0.36 });
        HW.wordsIn(tl, t, { at: at + 0.42, step: 0.04 });
        HW.boil(tl, [].concat(spoke, box), { seed: SEED + i });
      });
    },
  },

  {
    name: "line-trend-draw", family: "F data",
    note: "migrated — peak circled, axes stay quiet",
    line: "A trend line draws in one stroke, the peak circled and annotated",
    cfg: { values: [20, 34, 30, 62, 88], peakIndex: 4,
           note: { en: "after the library landed", zh: "卡库铺满之后" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.82, 0.46, { dy: -0.08 });
      var ax = S.add(HW.line(0, field.h, field.w, field.h, { seed: SEED, amp: 2, segs: 8 }), { x: field.x, y: field.y, ink: "soft", seed: SEED });
      var ay = S.add(HW.line(0, 0, 0, field.h, { seed: SEED + 1, amp: 2, segs: 6 }), { x: field.x, y: field.y, ink: "soft", seed: SEED + 1 });
      var tr = HW.trend(CFG.values, field.w, field.h, { seed: SEED + 2 });
      var line = S.add(tr.d, { x: field.x, y: field.y, ink: "accent", width: Math.max(5, S.short * 0.007), seed: SEED + 2 });
      HW.draw(tl, [].concat(ax, ay), { at: 0.3, dur: 0.4, stagger: 0.08 });
      HW.draw(tl, line, { at: 0.9, dur: 0.62 });
      var pk = tr.pts[CFG.peakIndex];
      var rr = Math.min(field.w, field.h) * 0.09;
      var ring = S.add(HW.ellipse(rr, rr * 0.85, { seed: SEED + 5, overshoot: 0.22 }), { x: field.x + pk[0] - rr, y: field.y + pk[1] - rr * 0.85, ink: "accent", seed: SEED + 5 });
      var noteSlot = S.below(ring, { gap: 0.03, w: 0.5, h: 0.09 });
      var note = S.boxText(noteSlot, pick(CFG.note), { role: "label", color: "var(--hw-ink-soft)", maxLines: 1 });
      HW.draw(tl, ring, { at: 1.7, dur: 0.42 });
      HW.wordsIn(tl, note, { at: 2.05, step: 0.05 });
      HW.boil(tl, [].concat(line, ring), { seed: SEED });
    },
  },
  {
    name: "pie-slice-fill", family: "F data",
    note: "migrated — one slice filled, the rest stays outline",
    line: "A drawn pie with one slice scribbled in",
    cfg: { ratio: 0.62, label: { en: "sentences with a direct match", zh: "语义能直接命中的句子" } },
    build: function (S, tl, CFG, SEED) {
      var two = S.slots.split(2, { gap: 0.05 });
      var pieSide = two[0], textSide = two[1];
      var R = Math.min(pieSide.w, pieSide.h) * 0.42;
      var ring = S.add(HW.circle(R, { seed: SEED, overshoot: 0.18 }), { x: pieSide.cx - R, y: pieSide.cy - R, seed: SEED });
      var a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * CFG.ratio;
      var sl = S.add(HW.pieSlice(R, a0, a1, { seed: SEED + 1 }), {
        x: pieSide.cx - R, y: pieSide.cy - R, ink: "accent", seed: SEED + 1,
        fill: "var(--hw-accent)", fillStyle: "hachure", hachureGap: R * 0.08, fillWeight: 2,
      });
      var numSlot = S.rect(textSide.x, textSide.cy - textSide.h * 0.3, textSide.w, textSide.h * 0.34);
      var num = S.text("0", { cx: numSlot.cx, y: numSlot.y, size: Math.round(Math.min(numSlot.h * 0.9, S.type("display"))), w: numSlot.w });
      num.style.opacity = 1; num.style.fontVariantNumeric = "tabular-nums";
      var lb = S.boxText(S.rect(textSide.x, numSlot.y2, textSide.w, textSide.h * 0.26), pick(CFG.label),
        { role: "label", color: "var(--hw-ink-soft)", maxLines: 2 });
      HW.draw(tl, ring, { at: 0.3, dur: 0.5 });
      HW.draw(tl, sl, { at: 0.9, dur: 0.6, stagger: 0.04 });
      HW.countUp(tl, num, 0, Math.round(CFG.ratio * 100), { at: 1.35, dur: 0.5, suffix: "%" });
      HW.wordsIn(tl, lb, { at: 1.95, step: 0.05 });
      HW.boil(tl, [].concat(ring, sl), { seed: SEED });
    },
  },
  {
    name: "gauge-dial-swing", family: "F data",
    note: "migrated — needle swings once and stops",
    line: "A dial needle swings from zero to its reading and stops",
    cfg: { ratio: 0.78, label: { en: "Style consistency", zh: "画风一致性" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.76, 0.44, { dy: -0.04 });
      var R = Math.min(field.w / 2, field.h * 0.86);
      var cx = field.cx, cy = field.y + R;
      var dial = S.add(HW.arc(R, Math.PI, Math.PI * 2, { seed: SEED }), { x: cx - R, y: cy - R, ink: "accent", width: Math.max(5, S.short * 0.007), seed: SEED });
      HW.draw(tl, dial, { at: 0.3, dur: 0.55 });
      for (var i = 0; i <= 6; i++) {
        var a = Math.PI + (Math.PI * i) / 6;
        var tick = S.add(HW.line(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88, Math.cos(a) * R, Math.sin(a) * R, { seed: SEED + i, amp: 1.4, segs: 2 }),
          { x: cx, y: cy, ink: "soft", seed: SEED + i });
        HW.draw(tl, tick, { at: 0.75 + i * 0.04, dur: 0.24 });
      }
      var needle = S.add(HW.line(0, 0, R * 0.8, 0, { seed: SEED + 9, amp: 2 }), { x: cx, y: cy, width: Math.max(6, S.short * 0.008), seed: SEED + 9 });
      var deg = -180 + 180 * CFG.ratio;
      HW.claim(needle);
      gsap.set(needle, { transformOrigin: "0% 50%", rotation: -180, opacity: 1 });
      tl.to(needle, { rotation: deg + 3, duration: 0.55, ease: "power4.inOut" }, 1.3);
      tl.to(needle, { rotation: deg, duration: 0.16, ease: "power3.in" }, 1.85);
      var lb = S.boxText(S.below(dial, { gap: 0.03, w: 0.68, h: 0.1 }), pick(CFG.label), { role: "body", maxLines: 1 });
      HW.wordsIn(tl, lb, { at: 2.1, step: 0.06 });
      HW.boil(tl, dial, { seed: SEED });
    },
  },
  {
    name: "progress-bar-fill", family: "F data",
    note: "migrated — set stuck:true for the high-energy blockage variant",
    line: "A drawn progress bar fills, or jams partway and refuses to move",
    cfg: { ratio: 1, stuck: false, label: { en: "All 64 in place", zh: "六十四张全部到齐" } },
    build: function (S, tl, CFG, SEED) {
      var bar = S.slots.center(0.86, 0.12, { dy: -0.04 });
      var box = S.add(HW.rect(bar.w, bar.h, { seed: SEED, r: bar.h * 0.12 }), { x: bar.x, y: bar.y, seed: SEED });
      var inset = bar.h * 0.1;
      var fill = S.add(HW.scribbleFill(bar.w - inset * 2, bar.h - inset * 2, { seed: SEED + 1, gap: bar.h * 0.16 }),
        { x: bar.x + inset, y: bar.y + inset, ink: "accent", width: Math.max(3, S.short * 0.004), seed: SEED + 1 });
      HW.draw(tl, box, { at: 0.3, dur: 0.46 });
      HW.grow(tl, fill, { at: 0.85, dur: 0.6, axis: "x", from: 0.001, to: CFG.ratio, ease: "power4.inOut" });
      if (CFG.stuck) {
        var xm = bar.x + bar.w * CFG.ratio;
        var cs = bar.h * 0.8;
        var cr = S.add(HW.cross(cs, { seed: SEED + 4 }), { x: xm - cs / 2, y: bar.cy - cs / 2, ink: "accent", width: Math.max(6, S.short * 0.008), seed: SEED + 4 });
        HW.draw(tl, cr, { at: 1.75, dur: 0.3, stagger: 0.08 });
        tl.to(S.root, { x: -4, duration: 0.06 }, 1.75).to(S.root, { x: 4, duration: 0.06 }, 1.81).to(S.root, { x: 0, duration: 0.06 }, 1.87);
      }
      var lb = S.boxText(S.below(box, { gap: 0.04, w: 0.76, h: 0.1 }), pick(CFG.label), { role: "body", maxLines: 1 });
      HW.wordsIn(tl, lb, { at: 2.1, step: 0.055 });
      HW.boil(tl, box, { seed: SEED });
    },
  },
  {
    name: "magnifier-zoom", family: "G metaphor",
    note: "migrated — travel on the host, or boil eats it",
    line: "A magnifier slides across and what is under it grows",
    cfg: { sentence: { en: "The trick is reusing primitives", zh: "关键在笔画原语的复用" }, hit: { en: [4], zh: [3, 4, 5, 6] } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.92, 0.16, { dy: -0.12 });
      var base = S.boxText(slot, pick(CFG.sentence), { role: "body", pad: 0.03, maxLines: 2 });
      HW.wordsIn(tl, base, { at: 0.3, step: 0.06 });
      var hits = pick(CFG.hit).map(function (i) { return base.items[i]; }).filter(Boolean);
      var target = S.glyphBand(hits);
      var lr = Math.min(S.safe.w, S.safe.h) * 0.11;
      var sx = S.safe.x + lr * 0.2, sy = S.safe.y2 - lr * 3;
      var lens = S.add(HW.magnifier(lr, { seed: SEED }), { x: sx, y: sy, ink: "accent", width: Math.max(5, S.short * 0.006), seed: SEED });
      [].concat(lens).forEach(function (el) { HW.claim(el); });
      tl.fromTo(lens, { opacity: 0 }, { opacity: 1, duration: 0.24 }, 1.5);
      tl.to(HW.host(lens), { x: target.cx - lr - sx, y: target.cy - lr - sy, duration: 0.5, ease: "power4.inOut" }, 1.7);
      gsap.set(hits, { transformOrigin: "50% 50%" });
      tl.to(hits, { scale: 1.4, duration: 0.34, ease: "expo.out" }, 2.2);
      tl.to(base.el, { color: "var(--hw-ink-soft)", duration: 0.3 }, 2.2);
      HW.boil(tl, lens, { seed: SEED });
    },
  },
  {
    name: "lightbulb-spark", family: "G metaphor",
    note: "migrated — the pause before the burst is the whole point",
    line: "A bulb draws in, then rays burst — the idea lands",
    cfg: { insight: { en: "A new shot should not cost 300 lines", zh: "加一种画面不该等于写三百行" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.6, 0.34, { dy: -0.1 });
      var size = Math.min(field.w, field.h) * 0.8;
      var bulb = S.add(HW.bulb(size, { seed: SEED }), { x: field.cx - size / 2, y: field.cy - size * 0.42, width: Math.max(5, S.short * 0.006), seed: SEED });
      var rr = size * 0.72;
      var rays = S.add(HW.burst(rr, { seed: SEED + 3, rays: 9, inner: rr * 0.66 }), { x: field.cx - rr, y: field.cy - rr * 0.9, ink: "accent", width: Math.max(4, S.short * 0.005), seed: SEED + 3 });
      var line = S.boxText(S.below(bulb, { gap: 0.05, w: 0.84, h: 0.14 }), pick(CFG.insight), { role: "body", maxLines: 2 });
      HW.draw(tl, bulb, { at: 0.3, dur: 0.42, stagger: 0.08 });
      HW.draw(tl, rays, { at: 1.05, dur: 0.3, stagger: 0.03 });
      HW.wordsIn(tl, line, { at: 1.5, step: 0.07 });
      HW.boil(tl, [].concat(bulb, rays), { seed: SEED });
    },
  },
  {
    name: "gear-mesh", family: "G metaphor",
    note: "migrated — turns once; sustained rotation is idle motion",
    line: "Two gears mesh; turning one turns the other",
    cfg: { label: { en: "One token changes all 64 cards", zh: "改一处 token，六十四张卡跟着变" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.7, 0.36, { dy: -0.08 });
      var R1 = Math.min(field.w * 0.3, field.h * 0.46), R2 = R1 * 0.68;
      var D = R1 + R2 - R1 * 0.22;
      var cx = field.cx - D * 0.35, cy = field.cy;
      var g1 = S.add(HW.gear(R1, { seed: SEED, teeth: 11 }), { x: cx - R1, y: cy - R1, width: Math.max(5, S.short * 0.006), seed: SEED });
      var g2 = S.add(HW.gear(R2, { seed: SEED + 1, teeth: 8 }), { x: cx + D - R2, y: cy - R2, ink: "accent", width: Math.max(5, S.short * 0.006), seed: SEED + 1 });
      var lb = S.boxText(S.below([].concat(g1, g2), { gap: 0.05, w: 0.84, h: 0.12 }), pick(CFG.label), { role: "body", maxLines: 2 });
      HW.draw(tl, g1, { at: 0.3, dur: 0.46, stagger: 0.1 });
      HW.draw(tl, g2, { at: 0.85, dur: 0.46, stagger: 0.1 });
      gsap.set([HW.host(g1), HW.host(g2)], { transformOrigin: "50% 50%" });
      tl.to(HW.host(g1), { rotation: 18, duration: 0.55, ease: "power4.inOut" }, 1.6);
      tl.to(HW.host(g2), { rotation: -18 * (R1 / R2), duration: 0.55, ease: "power4.inOut" }, 1.6);
      HW.wordsIn(tl, lb, { at: 2.2, step: 0.06 });
    },
  },
  {
    name: "stickman-act", family: "G metaphor",
    note: "migrated — pose swaps are tl.set, never a tween",
    line: "A stick figure performs one action",
    cfg: { poses: ["stand", "raise"], label: { en: "You can change it too", zh: "举个手，你也能改" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.4, 0.42, { dy: -0.08 });
      var size = Math.min(field.w * 1.4, field.h);
      var parts = HW.stickman(size, { seed: SEED, pose: CFG.poses[0] });
      var els = S.add(parts, { x: field.cx - size / 2, y: field.cy - size / 2, width: Math.max(5, S.short * 0.006), seed: SEED });
      HW.draw(tl, els, { at: 0.3, dur: 0.4, stagger: 0.06 });
      CFG.poses.slice(1).forEach(function (pose, k) {
        var nd = HW.stickman(size, { seed: SEED, pose: pose });
        els.forEach(function (el, i) { if (nd[i]) tl.set(el, { attr: { d: nd[i] } }, 1.6 + k * 0.9); });
      });
      var lb = S.boxText(S.below(els, { gap: 0.04, w: 0.8, h: 0.11 }), pick(CFG.label), { role: "body", maxLines: 1 });
      HW.wordsIn(tl, lb, { at: 2.3, step: 0.06 });
      HW.boil(tl, els, { seed: SEED });
    },
  },
  {
    name: "door-open-reveal", family: "G metaphor",
    note: "migrated — the closed door has to be seen first",
    line: "Doors part to reveal what is behind them",
    cfg: { reveal: { en: "Sixty-four ways", zh: "六十四种画法" } },
    build: function (S, tl, CFG, SEED) {
      /* Width is capped at half the safe area on purpose: each leaf has to slide its own
         width sideways to clear the reveal, and only at <= 0.5 is there room for that
         travel without the leaf leaving the safe area. */
      var field = S.slots.center(0.5, 0.5, { dy: -0.04 });
      var DW = field.w / 2;
      var inner = S.boxText(field, pick(CFG.reveal), { role: "title", maxLines: 1 });
      var doors = [-1, 1].map(function (sgn, i) {
        var x = sgn < 0 ? field.x : field.cx;
        var d = S.add(HW.rect(DW, field.h, { seed: SEED + i }), { x: x, y: field.y, seed: SEED + i });
        var kr = Math.max(6, S.short * 0.012);
        var knob = S.add(HW.circleAt(0, 0, kr, SEED + 5 + i, 1.4), { x: field.cx - sgn * DW * 0.12, y: field.cy, width: Math.max(4, S.short * 0.005), seed: SEED + 5 + i });
        return [d, knob];
      });
      HW.draw(tl, doors[0].concat(doors[1]), { at: 0.3, dur: 0.44, stagger: 0.08 });
      [[-1, 0], [1, 1]].forEach(function (m) {
        var room = m[0] < 0 ? field.x - S.safe.x : S.safe.x2 - field.x2;
        var travel = m[0] * Math.min(DW, room);
        var hosts = doors[m[1]].map(function (e) { return HW.host(e); });
        tl.to(hosts, { x: travel, duration: 0.55, ease: "power4.inOut" }, 1.35);
        /* The leaves stop at the safe edge rather than leaving the page, so they fade back to
           let the reveal hold the eye — otherwise two full-strength rectangles crowd it. */
        tl.to(hosts, { opacity: 0.4, duration: 0.5 }, 1.5);
      });
      HW.wordsIn(tl, inner, { at: 1.6, step: 0.07 });
    },
  },
  {
    name: "box-unpack", family: "G metaphor",
    note: "migrated — the lid hinges on whichever side has room to swing",
    line: "A box opens and its contents pop out one by one",
    cfg: { items: { en: ["Primitives", "Slots", "Timing"], zh: ["原语", "槽位", "编排"] } },
    build: function (S, tl, CFG, SEED) {
      var items = pick(CFG.items);
      var boxSlot = S.rect(S.safe.x + S.safe.w * 0.06, S.safe.cy + S.safe.h * 0.06, S.safe.w * 0.34, S.safe.h * 0.2);
      var box = S.add(HW.rect(boxSlot.w, boxSlot.h, { seed: SEED }), { x: boxSlot.x, y: boxSlot.y, seed: SEED });
      var lidH = boxSlot.h * 0.24;
      var lidPts = [[0, 0], [boxSlot.w, 0], [boxSlot.w - lidH * 0.6, -lidH], [lidH * 0.6, -lidH]];
      var lid = S.add(HW.polyD(lidPts.concat([[0, 0]])), { x: boxSlot.x, y: boxSlot.y, seed: SEED + 1 });
      HW.draw(tl, [].concat(box, lid), { at: 0.3, dur: 0.44, stagger: 0.1 });
      /* A lid swings through a quarter-circle of its own width, so where it hinges decides
         whether it stays on the page. Hinge on the side with more room, then walk the angle
         back until the whole swept polygon is inside the safe area — the swing is as open as
         the canvas allows instead of a fixed number that only worked at one aspect. */
      var hingeRight = (S.safe.x2 - boxSlot.x2) >= (boxSlot.x - S.safe.x);
      var hx = hingeRight ? boxSlot.w : 0;
      function swingFits(deg) {
        var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), out = -1e9;
        for (var p = 0; p < lidPts.length; p++) {
          var x = lidPts[p][0] - hx, y = lidPts[p][1];
          var X = boxSlot.x + hx + x * c - y * s, Y = boxSlot.y + x * s + y * c;
          out = Math.max(out, S.safe.x - X, X - S.safe.x2, S.safe.y - Y, Y - S.safe.y2);
        }
        return out <= -8;
      }
      var swing = 105;
      while (swing > 40 && !swingFits(hingeRight ? swing : -swing)) swing -= 5;
      gsap.set(HW.host(lid), { transformOrigin: (hingeRight ? "100%" : "0%") + " 100%" });
      tl.to(HW.host(lid), { rotation: hingeRight ? swing : -swing, duration: 0.42, ease: "power4.inOut" }, 1.0);
      var cw = S.safe.w * 0.28, ch = S.safe.h * 0.1;
      items.forEach(function (txt, i) {
        var cx = S.safe.x2 - cw / 2 - S.safe.w * 0.04;
        var cy = S.safe.y + S.safe.h * (0.16 + i * 0.16);
        var slot = S.rect(cx - cw / 2, cy - ch / 2, cw, ch);
        var chip = S.add(HW.rect(cw, ch, { seed: SEED + 10 + i, r: ch * 0.12 }), { x: slot.x, y: slot.y, seed: SEED + 10 + i, ink: "accent" });
        var t = S.boxText(slot, txt, { role: "label", maxLines: 1 });
        var at = 1.45 + i * 0.13;
        gsap.set(HW.host(chip), { x: boxSlot.cx - slot.cx, y: boxSlot.cy - slot.cy, scale: 0.5, transformOrigin: "50% 50%" });
        gsap.set(t.el, { x: boxSlot.cx - slot.cx, y: boxSlot.cy - slot.cy });
        [].concat(chip).forEach(function (el) { HW.claim(el); });
        gsap.set([].concat(chip, t.el, t.items), { opacity: 0 });
        t.items.forEach(function (it) { HW.claim(it); });
        tl.to([].concat(chip, t.el, t.items), { opacity: 1, duration: 0.16 }, at);
        tl.to(HW.host(chip), { x: 0, y: 0, scale: 1, duration: 0.46, ease: "expo.out" }, at);
        tl.to(t.el, { x: 0, y: 0, duration: 0.46, ease: "expo.out" }, at);
      });
      HW.boil(tl, box, { seed: SEED });
    },
  },
  {
    name: "signpost-choose", family: "G metaphor",
    note: "migrated — one board takes accent, the other stays neutral",
    line: "A signpost with two boards pointing different ways",
    cfg: { a: { en: "Semantic pick", zh: "语义选卡" }, b: { en: "Fallback", zh: "兜底骨架" }, pick: 0 },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.86, 0.52, { dy: -0.04 });
      var pole = S.add(HW.line(0, field.h, 0, 0, { seed: SEED, amp: 2.6, segs: 8 }), { x: field.cx, y: field.y, width: Math.max(6, S.short * 0.008), seed: SEED });
      HW.draw(tl, pole, { at: 0.3, dur: 0.44 });
      var bw = Math.min(field.w * 0.44, S.safe.w * 0.42), bh = field.h * 0.2, tip = bw * 0.16;
      [[-1, pick(CFG.a)], [1, pick(CFG.b)]].forEach(function (sd, i) {
        var dir = sd[0], hot = i === CFG.pick;
        var pts = dir < 0
          ? [[bw, 0], [tip, 0], [0, bh / 2], [tip, bh], [bw, bh], [bw, 0]]
          : [[0, 0], [bw - tip, 0], [bw, bh / 2], [bw - tip, bh], [0, bh], [0, 0]];
        var x = dir < 0 ? field.cx - bw - field.w * 0.01 : field.cx + field.w * 0.01;
        var y = field.y + field.h * (0.14 + i * 0.34);
        var sign = S.add(HW.polyD(pts), { x: x, y: y, rot: dir * 2, ink: hot ? "accent" : "ink", seed: SEED + i });
        var t = S.boxText(S.rect(x + (dir < 0 ? tip : 0), y, bw - tip, bh), sd[1], { role: "label", maxLines: 1 });
        var at = 0.95 + i * 0.45;
        HW.draw(tl, sign, { at: at, dur: 0.42 });
        HW.wordsIn(tl, t, { at: at + 0.42, step: 0.05 });
        HW.boil(tl, sign, { seed: SEED + i });
      });
    },
  },
  {
    name: "screen-frame", family: "H interface",
    note: "merges window-mock-sketch + phone-frame-hold — device: desktop | phone",
    line: "A drawn screen with real interface content written inside it",
    cfg: {
      device: "desktop",
      appTitle: { en: "reference/scenes/", zh: "reference/scenes/" },
      rows: [
        { source: { en: "Family A", zh: "A 族" }, title: "title-sweep-underline.md", time: { en: "6 cards", zh: "6 张" } },
        { source: { en: "Family E", zh: "E 族" }, title: "split-vs-fold.md", time: { en: "7 cards", zh: "7 张" }, hot: true },
        { source: { en: "Family I", zh: "I 族" }, title: "frame-corner-sign.md", time: { en: "5 cards", zh: "5 张" } },
      ],
    },
    build: function (S, tl, CFG, SEED) {
      var phone = CFG.device === "phone";
      var slot = phone ? S.slots.center(0.44, 0.72) : S.slots.center(0.9, 0.44, { dy: -0.04 });
      var barH = slot.h * (phone ? 0.07 : 0.16);
      var wf = HW.windowFrame(slot.w, slot.h, { seed: SEED, barH: barH });
      var win = S.add(phone ? [wf.frame, wf.bar] : wf.all, { x: slot.x, y: slot.y, seed: SEED });
      HW.draw(tl, win, { at: 0.3, dur: 0.44, stagger: 0.06 });
      var title = S.boxText(S.rect(slot.x + slot.w * 0.1, slot.y, slot.w * 0.8, barH), pick(CFG.appTitle),
        { role: "note", color: "var(--hw-ink-soft)", pad: 0.06, maxLines: 1 });
      HW.wordsIn(tl, title, { at: 0.85, step: 0.04 });
      var body = S.rect(slot.x, slot.y + barH, slot.w, slot.h - barH);
      var rowH = body.h / (CFG.rows.length + 0.6);
      CFG.rows.forEach(function (row, i) {
        var y = body.y + rowH * (0.4 + i);
        var cells = phone
          ? [[0.06, 0.88, pick(row.title), "body"]]
          : [[0.03, 0.18, pick(row.source), "note"], [0.23, 0.5, pick(row.title), "label"], [0.78, 0.19, pick(row.time), "note"]];
        cells.forEach(function (c, k) {
          var r = S.rect(body.x + body.w * c[0], y, body.w * c[1], rowH * 0.9);
          var t = S.boxText(r, c[2], { role: c[3], color: k === 1 || phone ? undefined : "var(--hw-ink-soft)", pad: 0.04, maxLines: 1 });
          HW.wordsIn(tl, t, { at: 1.2 + i * 0.11 + k * 0.05, step: 0.03 });
        });
        if (row.hot) {
          var uw = body.w * (phone ? 0.8 : 0.5);
          var u = S.add(HW.wave(uw, { seed: SEED + 20 + i, amp: rowH * 0.08 }),
            { x: body.x + body.w * (phone ? 0.08 : 0.23), y: y + rowH * 0.82, ink: "accent", seed: SEED + 20 + i });
          HW.draw(tl, u, { at: 1.2 + i * 0.11 + 0.6, dur: 0.36 });
        }
      });
      HW.boil(tl, win, { seed: SEED, amp: 0.45 });
    },
  },
  {
    name: "chat-bubble-thread", family: "H interface",
    note: "migrated — turns alternate, earlier turns stay lit",
    line: "Speech bubbles alternate left and right, back and forth",
    cfg: { turns: [
      { who: "me", text: { en: "What shape is this sentence?", zh: "这句话是什么形状？" } },
      { who: "it", text: { en: "Comparison. Use split-vs-fold.", zh: "对比。用 split-vs-fold。" } },
    ] },
    build: function (S, tl, CFG, SEED) {
      var rows = S.slots.rows(CFG.turns.length, { w: 1, gap: 0.04, block: 0.5 });
      CFG.turns.forEach(function (turn, i) {
        var me = turn.who === "me";
        var r = rows[i];
        var bw = r.w * 0.72, bh = r.h;
        var x = me ? r.x : r.x2 - bw;
        var slot = S.rect(x, r.y, bw, bh);
        var b = S.add(HW.bubble(bw, bh, { seed: SEED + i, tail: me ? "bl" : "br" }),
          { x: slot.x, y: slot.y, ink: me ? "ink" : "accent", seed: SEED + i });
        var t = S.boxText(slot, pick(turn.text), { role: "label", pad: 0.1, maxLines: 2 });
        var at = 0.4 + i * 1.25;
        HW.draw(tl, b, { at: at, dur: 0.44, stagger: 0.08 });
        HW.wordsIn(tl, t, { at: at + 0.42, step: 0.05 });
        HW.boil(tl, b, { seed: SEED + i });
      });
    },
  },
  {
    name: "terminal-scribble", family: "H interface",
    note: "migrated — commands type, output pops; monospace is correct here",
    line: "A drawn terminal with commands and output appearing line by line",
    cfg: { lines: [
      { kind: "cmd", text: "$ node scripts/scene-lint.mjs films/demo" },
      { kind: "out", text: { en: "5 shots / 2 seams / 57 cards available", zh: "5 镜 / 2 缝 / 卡库 57 张" } },
      { kind: "out", text: { en: "selection discipline passes", zh: "选卡纪律全过" }, hot: true },
    ] },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.92, 0.38, { dy: -0.02 });
      var barH = slot.h * 0.16;
      var win = S.add(HW.windowFrame(slot.w, slot.h, { seed: SEED, barH: barH }).all, { x: slot.x, y: slot.y, seed: SEED });
      HW.draw(tl, win, { at: 0.3, dur: 0.44, stagger: 0.06 });
      var body = S.rect(slot.x, slot.y + barH, slot.w, slot.h - barH);
      var rowH = body.h / (CFG.lines.length + 0.5);
      var t0 = 0.9;
      CFG.lines.forEach(function (L, i) {
        var txt = pick(L.text);
        var r = S.rect(body.x + body.w * 0.04, body.y + rowH * (0.3 + i), body.w * 0.92, rowH * 0.9);
        var el = S.boxText(r, txt, {
          role: "note", pad: 0.03, maxLines: 1, align: "left",
          /* Declared, not patched on afterwards — the fit has to measure monospace metrics,
             which are wider than the hand face and would otherwise overflow the row. */
          font: "ui-monospace, SFMono-Regular, Menlo, monospace",
          color: L.hot ? "var(--hw-accent-ink)" : (L.kind === "cmd" ? undefined : "var(--hw-ink-soft)"),
        });
        if (L.kind === "cmd") { HW.wordsIn(tl, el, { at: t0, step: 0.035, rise: 0 }); t0 += 0.35 + txt.length * 0.02; }
        else { HW.wordsIn(tl, el, { at: t0, step: 0.012, rise: 0 }); t0 += 0.34; }
      });
      HW.boil(tl, win, { seed: SEED, amp: 0.45 });
    },
  },
  {
    name: "sign-off", family: "I closing",
    note: "merges frame-corner-sign + stamp-seal-end — variant: border | stamp",
    line: "A drawn border with corner flourishes, or a stamp slamming beside the sign-off",
    cfg: { variant: "border", sign: { en: "Handdrawn", zh: "手绘涂鸦" }, sub: { en: "64 scene cards", zh: "六十四张画面卡" } },
    build: function (S, tl, CFG, SEED) {
      var stamp = CFG.variant === "stamp";
      var textSlot = S.slots.center(0.7, 0.24, { dy: stamp ? -0.02 : 0 });
      var sign = S.boxText(S.rect(textSlot.x, textSlot.y, textSlot.w, textSlot.h * 0.6), pick(CFG.sign), { role: "title", maxLines: 1 });
      var sub = S.boxText(S.rect(textSlot.x, textSlot.y + textSlot.h * 0.6, textSlot.w, textSlot.h * 0.4), pick(CFG.sub),
        { role: "label", color: "var(--hw-ink-soft)", maxLines: 1 });
      HW.wordsIn(tl, sign, { at: stamp ? 0.3 : 1.1, step: 0.07 });
      HW.wordsIn(tl, sub, { at: stamp ? 0.8 : 1.6, step: 0.05 });
      if (stamp) {
        var sr = Math.min(S.safe.w, S.safe.h) * 0.11;
        var sp = S.rightOf(sign.el, { gap: 0.02, w: 0.3, h: 0.24 });
        var seal = S.add(HW.stamp(sr, { seed: SEED }), { x: Math.min(sp.cx - sr, S.safe.x2 - sr * 2), y: sp.cy - sr, ink: "accent", seed: SEED });
        var tick = S.add(HW.check(sr * 0.85, { seed: SEED + 2 }), { x: Math.min(sp.cx - sr * 0.42, S.safe.x2 - sr * 1.4), y: sp.cy - sr * 0.42, ink: "accent", seed: SEED + 2 });
        HW.pop(tl, seal, { at: 1.5, dur: 0.32, from: 1.3 });
        tl.to(S.root, { y: 3, duration: 0.06 }, 1.76).to(S.root, { y: 0, duration: 0.06 }, 1.82);
        HW.draw(tl, tick, { at: 1.95, dur: 0.34 });
        HW.boil(tl, [].concat(seal, tick), { seed: SEED });
      } else {
        var b = S.slots.center(1, 1);
        var cl = Math.min(S.safe.w, S.safe.h) * 0.12;
        /* Each mark gets its own corner box so the L opens inward. Rotation pivots on the
           shape's own centre, so a corner placed flush at the safe edge would swing outside —
           the box is inset by its own size instead. */
        var corners = [[b.x, b.y, 0], [b.x2 - cl, b.y, 90], [b.x2 - cl, b.y2 - cl, 180], [b.x, b.y2 - cl, 270]]
          .map(function (c, i) {
            return S.add(HW.corner(cl, { seed: SEED + i }), { x: c[0], y: c[1], rot: c[2], ink: "accent", seed: SEED + i });
          });
        var box = S.add(HW.rect(b.w, b.h, { seed: SEED + 9, r: 8 }), { x: b.x, y: b.y, seed: SEED + 9 });
        HW.draw(tl, corners, { at: 0.3, dur: 0.4, stagger: 0 });
        HW.draw(tl, box, { at: 0.62, dur: 0.5 });
        HW.boil(tl, corners.concat(box), { seed: SEED, amp: 0.45 });
      }
    },
  },
  {
    name: "arrow-cta-point", family: "I closing",
    note: "migrated — boxText forces the CTA inside its box",
    line: "A large arrow points at the call to action",
    cfg: { cta: { en: "Open the lookup table", zh: "去 scenes-index 查表" } },
    build: function (S, tl, CFG, SEED) {
      var slot = S.slots.center(0.5, 0.2, { dy: -0.02 });
      slot = S.rect(S.safe.x2 - slot.w - S.safe.w * 0.04, slot.y, slot.w, slot.h);
      var box = S.add(HW.rect(slot.w, slot.h, { seed: SEED }), { x: slot.x, y: slot.y, seed: SEED, ink: "accent" });
      var t = S.boxText(slot, pick(CFG.cta), { role: "title", maxLines: 2 });
      var av = S.leftOf(box, { gap: 0.02, w: 0.28, h: 0.2 });
      var a = HW.arrow(av.w, av.h, { kind: "swoop", seed: SEED + 3, head: av.w * 0.1 });
      var ar = S.add([a.shaft, a.head], { x: av.x, y: av.y, ink: "accent", width: Math.max(6, S.short * 0.008), seed: SEED + 3 });
      HW.draw(tl, box, { at: 0.3, dur: 0.44 });
      HW.wordsIn(tl, t, { at: 0.75, step: 0.06 });
      HW.draw(tl, ar, { at: 1.4, dur: 0.42, stagger: 0.1 });
      gsap.set(HW.host(box), { transformOrigin: "50% 50%" });
      tl.to(HW.host(box), { scale: 1.04, duration: 0.24, ease: "expo.out" }, 1.95)
        .to(HW.host(box), { scale: 1, duration: 0.24, ease: "power3.in" }, 2.19);
      HW.boil(tl, [].concat(box, ar), { seed: SEED });
    },
  },
  {
    name: "handwave-outro", family: "I closing",
    note: "migrated — split() balances figure and line at any aspect",
    line: "A stick figure waves, with a goodbye written beside it",
    cfg: { bye: { en: "See you next time", zh: "下次见" } },
    build: function (S, tl, CFG, SEED) {
      var two = S.slots.split(2, { gap: 0.04 });
      var figSlot = two[0], textSlot = two[1];
      var size = Math.min(figSlot.w * 1.2, figSlot.h * 0.92);
      var stand = HW.stickman(size, { seed: SEED, pose: "stand" });
      var els = S.add(stand, { x: figSlot.cx - size / 2, y: figSlot.cy - size / 2, width: Math.max(5, S.short * 0.007), seed: SEED });
      HW.draw(tl, els, { at: 0.3, dur: 0.4, stagger: 0.06 });
      var waveP = HW.stickman(size, { seed: SEED, pose: "wave" });
      els.forEach(function (el, i) { if (waveP[i]) tl.set(el, { attr: { d: waveP[i] } }, 1.1); });
      var bye = S.boxText(S.rect(textSlot.x, textSlot.cy - textSlot.h * 0.3, textSlot.w, textSlot.h * 0.34), pick(CFG.bye), { role: "title", maxLines: 1 });
      var u = S.below(bye.el, { gap: 0.02, w: 0.3, h: 0.05, cx: bye.box.cx });
      var line = S.add(HW.wave(u.w, { seed: SEED + 4 }), { x: u.x, y: u.cy, ink: "accent", seed: SEED + 4 });
      HW.wordsIn(tl, bye, { at: 1.3, step: 0.07 });
      HW.draw(tl, line, { at: 1.9, dur: 0.4 });
      HW.boil(tl, els.concat(line), { seed: SEED });
    },
  },

  /* ═══ wired-elements ports — geometry recipes from rough-stuff/wired-elements (MIT),
     re-drawn as hw-kit primitives so they obey draw-on, boil, slots and the audits. ═══ */
  {
    name: "toggle-flip", family: "E comparison", src: "wired",
    note: "from wired-toggle — the knob slides, the label swaps with it",
    line: "A switch flips from one state to the other",
    cfg: { off: { en: "Fixed template", zh: "固定模板" }, on: { en: "Semantic pick", zh: "语义选卡" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.7, 0.4, { dy: -0.05 });
      var tw = Math.min(field.w * 0.6, S.short * 0.34), th = tw * 0.5;
      var tg = HW.toggle(tw, { seed: SEED, on: false });
      var track = S.add(tg.track, { x: field.cx - tw / 2, y: field.cy - th / 2, seed: SEED });
      var knob = S.add(tg.knob, { x: field.cx - tw / 2, y: field.cy - th / 2, ink: "accent", width: Math.max(5, S.short * 0.007), seed: SEED + 5 });
      var lbSlot = S.below(track, { gap: 0.035, w: 0.7, h: 0.12 });
      var off = S.boxText(lbSlot, pick(CFG.off), { role: "title", maxLines: 1, color: "var(--hw-ink-soft)" });
      var on = S.boxText(lbSlot, pick(CFG.on), { role: "title", maxLines: 1, color: "var(--hw-accent-ink)" });
      HW.draw(tl, [].concat(track, knob), { at: 0.3, dur: 0.44, stagger: 0.12 });
      HW.wordsIn(tl, off, { at: 0.85, step: 0.05 });
      /* the flip: knob crosses the track, old label drops out, new one lands */
      var dx = tg.knobAt(true).x - tg.knobAt(false).x;
      tl.to(HW.host(knob), { x: dx, duration: 0.4, ease: "back.out(2.2)" }, 1.7);
      tl.to([off.el].concat(off.items), { opacity: 0, duration: 0.2 }, 1.72);
      HW.wordsIn(tl, on, { at: 1.95, step: 0.05 });
      HW.boil(tl, [].concat(track, knob), { seed: SEED });
    },
  },
  {
    name: "slider-tune", family: "F data", src: "wired",
    note: "from wired-slider — the handle rides to its value and the number follows",
    line: "A handle slides along a track to its value",
    cfg: { from: 0.15, to: 0.8, label: { en: "Hand-drawn energy", zh: "手绘浓度" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.8, 0.3, { dy: 0.02 });
      var sl = HW.sliderTrack(field.w, { seed: SEED, frac: CFG.from, kr: Math.max(14, S.short * 0.02) });
      var track = S.add(sl.track, { x: field.x, y: field.cy - sl.kr, seed: SEED, width: Math.max(5, S.short * 0.007) });
      var knob = S.add(sl.knob, { x: field.x, y: field.cy - sl.kr, ink: "accent", width: Math.max(5, S.short * 0.007), seed: SEED + 5 });
      var vSlot = S.rect(field.x + sl.xAt(CFG.to) - field.w * 0.17, field.y - S.safe.h * 0.02, field.w * 0.34, S.safe.h * 0.11);
      var val = S.boxText(vSlot, Math.round(CFG.to * 100) + "%", { role: "display", maxLines: 1, color: "var(--hw-accent-ink)" });
      var lb = S.boxText(S.below(track, { gap: 0.04, w: 0.7, h: 0.1 }), pick(CFG.label), { role: "body", maxLines: 1 });
      HW.draw(tl, [].concat(track, knob), { at: 0.3, dur: 0.5, stagger: 0.14 });
      HW.wordsIn(tl, lb, { at: 0.9, step: 0.05 });
      tl.to(HW.host(knob), { x: sl.xAt(CFG.to) - sl.xAt(CFG.from), duration: 0.7, ease: "power3.inOut" }, 1.5);
      HW.wordsIn(tl, val, { at: 2.1, step: 0.06 });
      HW.boil(tl, [].concat(track, knob), { seed: SEED });
    },
  },
  {
    name: "ring-progress", family: "F data", src: "wired",
    note: "from wired-progress-ring — drawing the arc IS the fill animation",
    line: "A ring fills to its fraction, the number lands in the middle",
    cfg: { frac: 0.75, label: { en: "Coverage", zh: "语义覆盖" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.7, 0.52, { dy: -0.03 });
      var R = Math.min(field.w, field.h) / 2 * 0.86;
      var ring = HW.progressRing(R, { seed: SEED, frac: CFG.frac });
      var base = S.add(ring.base, { x: field.cx - R, y: field.cy - R, ink: "soft", seed: SEED });
      var arc = S.add(ring.arc, { x: field.cx - R, y: field.cy - R, ink: "accent", width: Math.max(7, S.short * 0.01), seed: SEED + 7 });
      var num = S.boxText(S.rect(field.cx - R * 0.62, field.cy - R * 0.4, R * 1.24, R * 0.8),
        Math.round(CFG.frac * 100) + "%", { role: "display", maxLines: 1 });
      var lb = S.boxText(S.below(base, { gap: 0.03, w: 0.6, h: 0.09 }), pick(CFG.label), { role: "body", maxLines: 1 });
      HW.draw(tl, base, { at: 0.3, dur: 0.5 });
      /* the arc draws slowly — its draw-on is the progress filling up */
      HW.draw(tl, arc, { at: 0.95, dur: 1.1 });
      HW.wordsIn(tl, num, { at: 1.7, step: 0.08 });
      HW.wordsIn(tl, lb, { at: 2.1, step: 0.05 });
      HW.boil(tl, [].concat(base, arc), { seed: SEED });
    },
  },
  {
    name: "spinner-wait", family: "G metaphor", src: "wired",
    note: "from wired-spinner — it spins while the wait lasts, then the result shoves it aside",
    line: "A spinner turns, then the finished thing pops in its place",
    cfg: { wait: { en: "rendering…", zh: "出片中…" }, done: { en: "Done", zh: "出片了" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.6, 0.42, { dy: -0.04 });
      var R = Math.min(field.w, field.h) / 2 * 0.6;
      var spin = S.add(HW.spinnerArc(R, { seed: SEED }), { x: field.cx - R, y: field.cy - R, ink: "accent", width: Math.max(6, S.short * 0.009), seed: SEED });
      var wait = S.boxText(S.below(spin, { gap: 0.03, w: 0.5, h: 0.09 }), pick(CFG.wait), { role: "body", maxLines: 1, color: "var(--hw-ink-soft)" });
      var done = S.boxText(S.rect(field.cx - field.w / 2, field.cy - field.h * 0.3, field.w, field.h * 0.6), pick(CFG.done), { role: "display", maxLines: 1 });
      HW.draw(tl, spin, { at: 0.3, dur: 0.4 });
      HW.wordsIn(tl, wait, { at: 0.7, step: 0.04 });
      gsap.set(HW.host(spin), { transformOrigin: "50% 50%" });
      tl.to(HW.host(spin), { rotation: 720, duration: 1.7, ease: "power1.inOut" }, 0.75);
      tl.to([spin, wait.el].concat(wait.items).flat(), { opacity: 0, duration: 0.25 }, 2.45);
      done.items.forEach(function (it) { HW.claim(it); });
      gsap.set(done.items, { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" });
      tl.to(done.items, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)", stagger: 0.06 }, 2.75);
      HW.boil(tl, spin, { seed: SEED });
    },
  },
  {
    name: "calendar-mark", family: "D process", src: "wired",
    note: "from wired-calendar — the grid is scaffolding, the ringed date is the point",
    line: "A calendar draws and one date gets circled",
    cfg: { date: "14", cell: [4, 1], label: { en: "Ship day", zh: "上线日" } },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.78, 0.44, { dy: -0.05 });
      /* A calendar page has a natural shape. Letting the slot dictate it stretches the grid
         into a flat ribbon at 16:9 — clamp the width to ~1.3× the height and recentre. */
      var cw = Math.min(field.w, field.h * 1.3);
      field = S.rect(field.cx - cw / 2, field.y, cw, field.h);
      var cal = HW.calendarGrid(field.w, field.h, { seed: SEED });
      var grid = S.add(cal.all, { x: field.x, y: field.y, seed: SEED, width: Math.max(3.5, S.short * 0.0045) });
      var c = cal.cellAt(CFG.cell[0], CFG.cell[1]);
      var dSlot = S.rect(field.x + c.x - c.w / 2, field.y + c.y - c.h / 2, c.w, c.h);
      var date = S.boxText(dSlot, CFG.date, { role: "body", pad: 0.08, maxLines: 1 });
      var lb = S.boxText(S.below(grid, { gap: 0.03, w: 0.6, h: 0.1 }), pick(CFG.label), { role: "body", maxLines: 1 });
      HW.draw(tl, grid, { at: 0.3, dur: 0.7, stagger: 0.035 });
      HW.wordsIn(tl, date, { at: 1.35, step: 0.05 });
      var ring = S.ringAround(date.el, { seed: SEED + 9 });
      HW.draw(tl, ring, { at: 1.75, dur: 0.4 });
      HW.wordsIn(tl, lb, { at: 2.15, step: 0.05 });
      HW.boil(tl, [].concat(grid, ring), { seed: SEED, amp: 0.5 });
    },
  },
  {
    name: "checkbox-tick-list", family: "C enumeration", src: "wired",
    note: "from wired-checkbox — each tick is two drawn strokes that overshoot the box",
    line: "A checklist gets ticked off item by item",
    cfg: { items: { en: ["Palette locked", "Cards migrated", "Audits green"], zh: ["配色已锁", "卡库迁完", "审计全绿"] } },
    build: function (S, tl, CFG, SEED) {
      var items = pick(CFG.items);
      var rows = S.slots.rows(items.length, { w: 0.82, h: 0.13, gap: 0.05 });
      items.forEach(function (txt, i) {
        var r = rows[i];
        var cbSize = Math.min(r.h, S.short * 0.06);
        var cb = HW.checkbox(cbSize, { seed: SEED + i });
        var box = S.add(cb.box, { x: r.x, y: r.cy - cbSize / 2, seed: SEED + i });
        var tick = S.add(cb.tick, { x: r.x, y: r.cy - cbSize / 2, ink: "accent", width: Math.max(5, S.short * 0.008), seed: SEED + 40 + i });
        var tSlot = S.rect(r.x + cbSize * 1.5, r.y, r.w - cbSize * 1.5, r.h);
        var t = S.boxText(tSlot, txt, { role: "title", pad: 0.06, maxLines: 1, align: "left" });
        var at = 0.35 + i * 0.18;
        HW.draw(tl, box, { at: at, dur: 0.32 });
        HW.wordsIn(tl, t, { at: at + 0.3, step: 0.04 });
        HW.draw(tl, tick, { at: 1.6 + i * 0.4, dur: 0.3 });
        HW.boil(tl, [].concat(box, tick), { seed: SEED + i });
      });
    },
  },
  {
    name: "tabs-switch", family: "H interface", src: "wired",
    note: "from wired-tabs — the active tab's open mouth into the frame is the selection cue",
    line: "Drawn tabs over a panel; the active one holds the content",
    cfg: {
      tabs: { en: ["Style", "Layout", "Motion"], zh: ["画风", "版面", "动效"] },
      content: { en: "One system underneath", zh: "底下是同一套系统" }, active: 1,
    },
    build: function (S, tl, CFG, SEED) {
      var field = S.slots.center(0.86, 0.46, { dy: -0.04 });
      var tabs = pick(CFG.tabs);
      var tb = HW.tabbar(field.w, field.h, tabs.length, { seed: SEED, active: CFG.active });
      var frame = S.add(tb.frame, { x: field.x, y: field.y, seed: SEED });
      var labels = tabs.map(function (txt, i) {
        var tr = tb.tabRects[i];
        var el = S.add(tb.tabs[i], { x: field.x, y: field.y, ink: i === CFG.active ? "accent" : "soft", seed: SEED + 2 + i });
        var t = S.boxText(S.rect(field.x + tr.x, field.y + tr.y, tr.w, tr.h), txt,
          { role: "label", pad: 0.14, maxLines: 1, color: i === CFG.active ? "var(--hw-accent-ink)" : "var(--hw-ink-soft)" });
        return { el: el, t: t };
      });
      var body = S.rect(field.x, field.y + tb.tabH, field.w, field.h - tb.tabH);
      var content = S.boxText(body, pick(CFG.content), { role: "title", maxLines: 2 });
      labels.forEach(function (L, i) {
        HW.draw(tl, L.el, { at: 0.3 + i * 0.16, dur: 0.34 });
        HW.wordsIn(tl, L.t, { at: 0.6 + i * 0.16, step: 0.04 });
      });
      HW.draw(tl, frame, { at: 1.15, dur: 0.5 });
      HW.wordsIn(tl, content, { at: 1.8, step: 0.06 });
      HW.boil(tl, [frame].concat(labels.map(function (L) { return L.el; })).flat(), { seed: SEED });
    },
  },
];
