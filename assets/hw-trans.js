/* hw-trans.js — 手绘转场的两半（盖上 / 揭开），从上一支片的帧里抽出来。
 *
 * 为什么抽出来：上一支片七帧各抄了一份两百行的转场机器，改一条约束要改七处。
 * 这里只暴露一个入口，每帧两行就够：
 *
 *     var X = HWT(S, tl);
 *     X.TI["paper-slide"](SEED_SEAM);          // 这一格开头：把上一格的盖子揭开
 *     X.T ["ink-blot"](DUR - 0.40, SEED_SEAM); // 这一格结尾：给下一格盖上
 *
 * 硬约束（每条都对应一次翻车，见 handdrawn/references/transitions.md）：
 *   · 一条缝是两半，两半必须同一个 SEED，否则不是「同一片涂鸦被揭开」而是换了一片
 *   · 缝里任意时刻画面上都得有东西 —— 纯白纯黑都判空帧
 *   · 盖住画面的块不许 100% 覆盖（>60% 判闷棍），所以墨点走排线不走实心
 *   · 尺寸一律 S.frame.w / S.frame.h，不许写死 1920×1080
 */
window.HWT = function (S, tl) {
  var W = S.frame.w, H = S.frame.h;
  var ROOT = S.root;
  /* 笔画在 svg.hw-svg，文字在它后面的 .hw-layer —— 文字永远压在笔画之上。
     用笔画盖住画面的转场（涂抹/擦除/翻页/墨点）因此盖不住字，得在那一刻把笔画层抬上去。
     纸张滑走 / 对折收起 动的是 ROOT 本身，天然连字一起带走，不用抬。 */
  var SVGL = ROOT.querySelector("svg.hw-svg");
  function lift(at) { tl.set(SVGL, { zIndex: 5 }, at); }
  function unlift(at) { tl.set(SVGL, { zIndex: 0 }, at); }

  function flat(x) {
    var out = [];
    (function walk(v) {
      (Object.prototype.toString.call(v) === "[object Array]" ? v : [v])
        .forEach(function (i) {
          Object.prototype.toString.call(i) === "[object Array]" ? walk(i) : out.push(i);
        });
    })(x);
    return out;
  }

  /* opacity 闸现在长在 HW.draw 里了（见 hw-kit.js 里那段注释）。
     D 保留下来只为兼容已经写好的帧 —— 直接转交，不再自己加第二道闸。
     加第二道会打架：两条 tween 同时管一个 opacity，seek 到边界上闪一下。 */
  function D(targets, o) {
    return HW.draw(tl, targets, o || {});
  }
  /* 到点亮起。用 fromTo 不用 tl.set —— raw set 不可回滚，直接 seek 到闸之前的时刻
     仍然会看到亮着的画面（抓帧、Studio 拖动、快照都踩这个）。 */
  function gate(els, at) {
    tl.fromTo(els, { opacity: 0 },
      { opacity: 1, duration: 0.001, ease: "none", immediateRender: true }, at);
  }
  function claimOn(els, at) {
    els.forEach(function (e) { HW.claim(e); });
    gate(els, at);
  }

  /* ── 盖子的三种材料 ───────────────────────────────────────────── */
  function coverPaper(seed) {
    return flat(S.add(HW.rect(W + 40, H + 40, { seed: seed, r: 0, amp: 2 }),
      { x: -20, y: -20, seed: seed, fill: "var(--hw-paper)", fillStyle: "solid", bleed: true }));
  }
  /* 墨点用排线填充，不是实心。实心墨点铺满就是 100% 覆盖 —— 纸面手绘片挨这么一记就是闷棍
     （画面审计 >60% 直接判死）。排线留纸缝，覆盖压到 45% 上下，读起来是一坨马克笔墨团。 */
  function coverInk(seed) {
    var R = Math.round(Math.max(W, H) * 0.78);
    return flat(S.add(HW.circle(R, { seed: seed, overshoot: 0.3 }),
      { x: W / 2 - R, y: H / 2 - R, seed: seed, fill: "var(--hw-ink)",
        fillStyle: "hachure", fillWeight: 6, hachureGap: 34, bleed: true }));
  }
  /* 涂抹带 —— 两半共用这一个构造。点缀色不是纯黑、width 40 < gap 76 留纸缝。
     拆两列是为了让单条笔画短于短边 60%（motion-lint 的尺度判据）。 */
  function scribbleBand(seed) {
    return [0, 1].map(function (i) {
      return S.add(HW.scribbleFill(W / 2 + 30, H + 60, { seed: seed + i * 5, gap: 76 }),
        { x: i * (W / 2) - 15, y: -30, ink: "accent", width: 40, seed: seed + i * 5, bleed: true });
    });
  }
  /* 纸边 —— 一根整幅宽的手绘横线，当纸张的边沿。
     paper-slide 在缝里空掉是因为「一张白纸滑过白纸」压根看不见：
     纸的边沿必须是一根墨线，观众才知道有东西在走。 */
  function sheetEdge(seed, y, showAt) {
    var el = flat(S.add(HW.line(0, 0, W, 0, { seed: seed, amp: 3.2, segs: 7 }),
      { x: 0, y: y, ink: "ink", width: 13, seed: seed, bleed: true }));
    el.forEach(function (e) { HW.claim(e); });
    /* showAt 省略 = 揭开半，第 0 帧就该在；给了 = 盖上半，到点才放行。
       不按住的话这根线会从第 0 秒横在画面中间。 */
    if (showAt === undefined) gsap.set(el, { opacity: 1 });
    else gate(el, showAt);
    return el;
  }

  /* ── 盖上（放在上一格的尾巴）────────────────────────────────── */
  var T = {
    "scribble-wipe": function (at, seed) {
      lift(at);
      D(scribbleBand(seed), { at: at, dur: 0.34, stagger: 0.06, ease: "power4.inOut" });
    },
    "paper-slide": function (at, seed) {
      sheetEdge(seed, H - 10, at);
      /* 走 -(H-130) 不是 -H：整张纸正好出画时，下边沿那根墨线也一起出画了，
         缝的最后 0.04s 又变回一张白纸。留 130px 交给下一格的上边沿接力。 */
      tl.to(ROOT, { y: -(H - 130), duration: 0.46, ease: "power4.inOut" }, at);
    },
    "ink-blot": function (at, seed) {
      lift(at);
      var bl = coverInk(seed);
      gsap.set(HW.host(bl), { transformOrigin: "50% 50%", scale: 0 });
      claimOn(bl, at);
      tl.to(HW.host(bl), { scale: 1, duration: 0.4, ease: "power4.inOut" }, at);
    },
    "eraser-swipe": function (at, seed) {
      lift(at);
      /* 擦过的地方要真的空掉：纸色底跟在橡皮条后面同速展开。
         只让条扫过、内容原样留着，读起来是一根棍子飘过去，不是擦除。 */
      var pad = coverPaper(seed);
      gsap.set(HW.host(pad), { transformOrigin: "0% 50%", scaleX: 0 });
      claimOn(pad, at);
      tl.to(HW.host(pad), { scaleX: 1, duration: 0.5, ease: "power4.inOut" }, at);
    },
  };

  /* ── 揭开（放在这一格的开头，t=0）──────────────────────────── */
  var TI = {
    /* 同一片涂鸦被揭开，不是换了一片 —— SEED 必须跟上一格一样 */
    "scribble-wipe": function (seed) {
      var els = flat(scribbleBand(seed));
      els.forEach(function (e) { HW.claim(e); });
      gsap.set(SVGL, { zIndex: 5 });
      gsap.set(els, { opacity: 1 });
      tl.to(els, { opacity: 0, duration: 0.30, ease: "power3.in", stagger: 0.05 }, 0);
      unlift(0.36);
    },
    /* 上一格向上滑走，这一格从下面顶上来，上边沿同样是一根墨线 */
    "paper-slide": function (seed) {
      var e = sheetEdge(seed, 10);
      gsap.set(ROOT, { y: H * 0.45 });
      tl.to(ROOT, { y: 0, duration: 0.34, ease: "power4.inOut" }, 0);
      tl.to(e, { opacity: 0, duration: 0.24, ease: "power3.in" }, 0.40);
    },
    /* 吞掉画面的那坨墨自己缩回去 */
    "ink-blot": function (seed) {
      var bl = coverInk(seed);
      bl.forEach(function (e) { HW.claim(e); });
      gsap.set(SVGL, { zIndex: 5 });
      gsap.set(bl, { opacity: 1 });
      gsap.set(HW.host(bl), { transformOrigin: "50% 50%", scale: 1 });
      tl.to(HW.host(bl), { scale: 0, duration: 0.34, ease: "power4.inOut" }, 0);
      unlift(0.36);
    },
    "eraser-swipe": function (seed) {
      var pad = coverPaper(seed);
      pad.forEach(function (e) { HW.claim(e); });
      gsap.set(SVGL, { zIndex: 5 });
      gsap.set(pad, { opacity: 1 });
      gsap.set(HW.host(pad), { transformOrigin: "100% 50%", scaleX: 1 });
      tl.to(HW.host(pad), { scaleX: 0, duration: 0.34, ease: "power4.inOut" }, 0);
      unlift(0.36);
    },
  };

  return { T: T, TI: TI, D: D, flat: flat, lift: lift, unlift: unlift };
};
