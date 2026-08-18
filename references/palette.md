# 色板与字体契约

## 四色，写在一处

```css
--hw-paper:      #FFFFFC;   /* 纸面，配 26px 点阵纸纹 */
--hw-ink:        #003E1F;   /* 墨线深绿，正文与结构线 */
--hw-ink-soft:   rgba(0, 62, 31, .68);   /* 淡墨，次要信息 */
--hw-accent:     #53A548;   /* 马克笔绿，只做笔画 */
--hw-accent-ink: #3C7A33;   /* 强调色的文字版 */
```

**卡里禁止出现 hex，一律 `var(--hw-*)`。** 改配色只动这一个 token 块，64 张卡不用碰。

## 为什么强调色分两个

`#53A548` 在 `#FFFFFC` 上只有 **2.75:1**，过不了 3:1 的对比度闸——`npm run check` 会挂。

| 用法 | 用哪个 | 对比度 |
|---|---|---|
| 笔画、边框、箭头、填充 | `--hw-accent` `#53A548` | 2.75:1（笔画不受文字标准约束） |
| **文字** | `--hw-accent-ink` `#3C7A33` | 5.2:1 ✓ |
| 正文 | `--hw-ink` `#003E1F` | 12.3:1 ✓ |

一句话：**绿色可以画线，不可以写字**。要写绿字走 `--hw-accent-ink`。

## 换一套配色

**纸绿是默认，不是锁死的。** 读题（SKILL.md 第 0 步）时如果片子的调性明显不是绿
（比如砖红更配一个「纠偏/警示」主题的片，靛蓝更配一个「工具/理性」主题的片），
直接换下面的预设——整块 token 换掉即可，64 张卡一张都不用碰。对比度都已算过。

### 预设 · 炭墨砖红（暖、有锋利感）

```css
--hw-paper:      #FFFDF8;
--hw-ink:        #2B2521;                  /* 14.9:1 */
--hw-ink-soft:   rgba(43, 37, 33, .68);
--hw-accent:     #C4553B;                  /* 笔画 4.4:1 */
--hw-accent-ink: #9A3F2B;                  /* 文字 6.6:1 ✓ */
```

### 预设 · 靛蓝米纸（冷、理性、工具感）

```css
--hw-paper:      #FBF8F0;
--hw-ink:        #1F2B52;                  /* 13.0:1 */
--hw-ink-soft:   rgba(31, 43, 82, .68);
--hw-accent:     #5B79D8;                  /* 笔画 3.8:1 */
--hw-accent-ink: #3A55B0;                  /* 文字 6.4:1 ✓ */
```

纸纹的点阵色也要跟 ink 走：`rgba(ink 的 RGB, .07)`，别留着绿点阵配蓝墨线。

### 自己配一套

只改 token 块，但要重新算两件事：

1. 正文色对纸面 ≥ 4.5:1
2. 强调色如果要当文字用，得单独派生一个 ≥ 4.5:1 的深版

改完跑 `npm run check`，对比度是硬闸。

## 字体

| 用途 | 字体 | 来源 |
|---|---|---|
| 拉丁 | **Excalifont** | Excalidraw 自家字体，SIL OFL，25KB |
| 中文 | **小赖字体 Xiaolai** | Excalidraw 的 CJK 字体，SIL OFL |

两者是 Excalidraw 官方搭配，所以中英混排的手写调子是一致的——这是选它们而不是 Caveat + 马善政的原因。

`assets/fonts/` 里带的是 GB2312 常用 6796 字子集（playground 用）。

**成片必须按本片字符重新子集化**：

```bash
pyftsubset Xiaolai-Regular.ttf \
  --text-file=<(cat 你的所有文案.txt) \
  --flavor=woff2 --output-file=Xiaolai-film.woff2
```

不子集化 = 21MB 字体进包。子集错 = 缺字变豆腐块。

## 纸纹

```css
background:
  radial-gradient(circle, rgba(0,62,31,.07) 1px, transparent 1px) 0 0 / 26px 26px,
  var(--hw-paper);
```

26px 点阵。别调大——网格一明显就从「纸」变成「表格」。
