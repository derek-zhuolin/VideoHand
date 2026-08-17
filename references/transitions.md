# 手绘转场家族 — 8 种

> **先看这条**：下面的代码片段是**配方说明**，不是让你往每帧里抄的。
> 现成实现在 `assets/hw-trans.js` —— 四种带盖子的转场
> （scribble-wipe / paper-slide / ink-blot / eraser-swipe）两半都写好了，
> 每帧两行就能用（见 `SKILL.md` 的「转场」一节）。
> 照着片段手抄最常见的后果是**只抄了「盖上」那半**，缝里于是出现半秒白场。

> **硬规则**：相邻两条缝禁用同一种转场；全片转场种类 ≥ ⌈缝数/2⌉。
> `scripts/scene-lint.mjs` 会查。

缩放 / 淡入淡出**依然禁止**——那不是手绘语言，会破坏「纸面连续」的错觉。

## 目录

- 怎么配（Vector Law：A 怎么出，决定 B 怎么进）
- 8 种做法
- 已知坑

---

## 怎么配（Vector Law：A 怎么出，决定 B 怎么进）

| 上一镜的收势 | 配这个转场 |
|---|---|
| 内容收拢到一点 | `ink-blot` 墨点扩散 |
| 内容向下沉 | `paper-slide` 纸张滑走 |
| 内容被划掉 / 被否定 | `eraser-swipe` 擦除 |
| 内容涂满 / 高能收尾 | `scribble-wipe` 涂抹 |
| 讲完一段、翻篇 | `page-flip` 翻页 |
| 内容折叠收起 | `fold-away` 折叠 |
| 从上往下展开的镜 | `roll-up` 卷帘 |
| 节奏要快、不需要过渡 | `hard-cut` 硬切 |

**硬切不是偷懒**——全片一半以上的缝应该是硬切，转场太多会让片子黏。
转场用在**段落之间**，不是每一镜之间。

## 8 种做法

转场都做成独立的 clip，放在**更高的 track**，跨切点叠放（开始早 0.4s、结束晚 0.4s）。

### 1. scribble-wipe 涂抹

**这是一条缝，不是一格的收尾 —— 必须两半分开写：前一格盖上，后一格揭开。**

以前这里只给了单侧写法（`draw` 在 0–0.42s、`opacity:0` 在 0.5s），
可整条缝只有 0.44s —— **揭开那一半永远轮不到执行**。
实测后果：4.30s 整幅涂满 → 4.50s 硬切全白 → 4.90s 下一格才画第一笔，
缝里半秒白场加一记闷棍，看着就是「卡住了」。

两半必须**用同一个 SEED**，涂鸦形状才对得上 —— 才像同一片涂鸦被揭开，而不是换了一片。

```js
// ── 前一格 A 的尾巴：盖上 ──
var COVER = 0.34;
var bandA = S.add(HW.scribbleFill(S.frame.w, S.frame.h, { seed: SEED, gap: 46 }),
                  { x: 0, y: 0, ink: "accent", width: 40 });
HW.draw(tl, bandA, { at: DUR - COVER, dur: COVER });

// ── 后一格 B 的开头：揭开 ──
// B 一开场就处在「已经被盖住」的状态，涂鸦退开才露出 B
var REVEAL = 0.30;
var bandB = S.add(HW.scribbleFill(S.frame.w, S.frame.h, { seed: SEED, gap: 46 }),
                  { x: 0, y: 0, ink: "accent", width: 40 });
gsap.set(HW.host(bandB), { opacity: 1 });
tl.to(HW.host(bandB), { opacity: 0, duration: REVEAL, ease: "power3.in" }, 0);
// B 自己的内容从 0 就开始画 —— 那 0.3s 底下要有东西在长，不是等涂鸦退完再动
```

**三条硬约束，每条都对应一次翻车：**

- **带子用点缀色，不许纯黑，不许 100% 覆盖。** `ink: "accent"` + `width` 要小于 `gap`
  （40 < 46）留出纸缝。做成满屏纯黑，纸面手绘片会突然挨一记闷棍。
- **缝里不许出现空帧。** 任意时刻画面上都得有东西 —— A 的内容、涂鸦、或 B 的内容。
  自查：在缝的 −0.1s / 0 / +0.1s / +0.25s 抓四帧，没有一张是纯白或纯黑。
- **尺寸走 `S.frame.w / S.frame.h`，不许写死。** 这份文档以前写的是 `1920, 1080` ——
  竖屏片里长宽是反的，带子只盖得住上半截。

### 2. page-flip 翻页
一张纸从右向左翻过去，用 `scaleX` + `transformOrigin: "0% 50%"` 模拟。
```js
var page = S.add(HW.rect(S.frame.w, S.frame.h, { seed: SEED, r: 0 }), { x: 0, y: 0 });
page.setAttribute("fill", "var(--hw-paper)");
gsap.set(page, { transformOrigin: "0% 50%", scaleX: 0 });
tl.to(page, { scaleX: 1, duration: 0.34, ease: "power4.inOut" }, 0);
tl.to(page, { scaleX: 0, transformOrigin: "100% 50%", duration: 0.34, ease: "power4.inOut" }, 0.42);
```

### 3. eraser-swipe 擦除
一条粗的纸色带从左扫到右，扫过的地方内容消失。
```js
var er = S.add(HW.rect(360, 1200, { seed: SEED, r: 0 }), { x: -400, y: -60 });
er.setAttribute("fill", "var(--hw-paper)");
tl.to(er, { x: 2000, duration: 0.5, ease: "power4.inOut" }, 0);
```

### 4. ink-blot 墨点扩散
一个墨点从切点位置扩散铺满，再收回去。
```js
var blot = S.add(HW.circle(1400, { seed: SEED, overshoot: 0.3 }), { x: 960 - 1400, y: 540 - 1400 });
blot.setAttribute("fill", "var(--hw-ink)");
gsap.set(blot, { transformOrigin: "50% 50%", scale: 0 });
tl.to(blot, { scale: 1, duration: 0.36, ease: "power4.inOut" }, 0);
tl.to(blot, { scale: 0, duration: 0.36, ease: "power4.inOut" }, 0.48);
```

### 5. paper-slide 纸张滑走
整张纸向上滑出，露出下一张。位移走 `power4.inOut`。
```js
tl.to(S.root, { y: -1080, duration: 0.46, ease: "power4.inOut" }, 0);
```

### 6. fold-away 折叠
画面从中间对折收起（`scaleY` → 0，`transformOrigin: "50% 50%"`）。
```js
gsap.set(S.root, { transformOrigin: "50% 50%" });
tl.to(S.root, { scaleY: 0.02, duration: 0.4, ease: "power4.inOut" }, 0);
```

### 7. roll-up 卷帘
从上往下拉一张纸盖住，再向上收走。
```js
var blind = S.add(HW.rect(S.frame.w, S.frame.h, { seed: SEED, r: 0 }), { x: 0, y: 0 });
blind.setAttribute("fill", "var(--hw-paper)");
gsap.set(blind, { transformOrigin: "50% 0%", scaleY: 0 });
tl.to(blind, { scaleY: 1, duration: 0.36, ease: "power4.inOut" }, 0);
tl.to(blind, { scaleY: 0, duration: 0.36, ease: "power4.inOut" }, 0.46);
```

### 8. hard-cut 硬切
不做任何东西。上一镜 `visibility: hidden`，下一镜 `data-start` 接上。
**这是默认选项**，其余 7 种是特例。

## 已知坑

- 转场 clip 的 track 必须高于两侧镜头，否则会被盖住
- 转场时长控制在 0.34–0.5s；超过 0.6s 观众会等
- 转场里禁止出现文字
- 同一支片里 `page-flip` 和 `roll-up` 不要都用——两者观感太近，等于重复
