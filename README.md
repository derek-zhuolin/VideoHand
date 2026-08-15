# handdrawn

给一段文字，出一支纸面马克笔手绘风格的小视频。

每一句话按**语义形状**选一张画面卡——是断言、是列举、是流程、还是对比——所以同一支片里
不会有两个镜头长得一样，不同的片子也不会长成一个样。

```
一段文字  →  逐句选卡（64 张可选）  →  笔画原语建帧  →  四道闸  →  MP4
```

底座是 [rough.js](https://roughjs.com)（Excalidraw 自己用的手绘渲染引擎）+
Excalifont / 小赖字体（Excalidraw 官方字体搭配）。

---

## 这东西解决什么问题

用固定模板做视频，第十支和第一支长得一模一样。

这个 skill 不给固定结构。它只锁两端——开场一张、落版一张——中间几镜完全跟着稿子走：
一句话一张卡，卡从 64 张里按语义挑，而且有硬规则禁止相邻重复、禁止高能镜头扎堆、
强制留一张让观众喘气的低能镜头。

画面不是手写三百行代码画出来的，是 65 个**确定性笔画原语**（抖动方框、弧线箭头、
涂鸦填充、火柴人、齿轮…）加 8 套版面槽位拼出来的。所以加一种新画面 ≈ 30 行配置，
不是从零画一遍几何。

---

## 装

需要 Node、ffmpeg，以及 [HyperFrames](https://hyperframes.heygen.com/)（`npx` 直接调，不用预装）。

```bash
git clone <this-repo> handdrawn
```

整个目录就是 skill 本身，**不绑定任何一家模型**。软链到你的 harness 认的 skill 目录即可：

```bash
ln -s "$(pwd)/handdrawn" ~/.claude/skills/handdrawn      # Claude Code / Agent SDK
ln -s "$(pwd)/handdrawn" ~/.agents/skills/handdrawn      # 通用 agent 目录
ln -s "$(pwd)/handdrawn" ~/.codebuddy/skills/handdrawn   # CodeBuddy（DeepSeek / GLM / Kimi…）
```

> 实测：同一份 `SKILL.md` 用 `deepseek-v4-flash` 跑，四道闸和字幕契约都能准确复述。
> 换模型不用改 skill —— 但**软链要一个个挂**，只挂在 `~/.claude/skills` 下，
> 别的 harness 是看不见的（这个坑踩过：agent 找不到 skill 会自己瞎编画风）。

验证装好了：

```bash
node scripts/build-gallery.mjs   # 重建 playground/index.html
open playground/index.html
```

---

## 怎么用

跟你的 agent 说人话就行：

> 把这段话做成手绘视频：<你的稿子>

它会读 `SKILL.md`，逐句选卡，建帧，跑四道闸，然后渲染。

64 格全在墙上循环播，顶部可切 9:16 / 16:9 / 1:1 和中英文，四个滑杆实时调笔触。
**每一格跑的都是那张卡的真实代码**——所以这面墙同时是 64 张卡的冒烟测试，
哪张写错了那格会红着报错。

---

## 画面卡库

九个族 54 张 + 附加族 10 张 = 64 张：

| 族 | 数量 | 什么时候用 |
|---|---|---|
| A 开场 | 6 | 片头。必选一张 |
| B 断言 | 5 | 一个数字、一句金句、一次纠偏 |
| C 列举 | 6 | 清单、便签墙、并列概念 |
| D 流程 | 7 | 变化、递进、时间线、循环、分岔、漏斗 |
| E 对比 | 8 | A vs B、前后、天平、维恩、象限、金字塔、辐射 |
| F 数据 | 7 | 柱、折线、饼、仪表、进度、滑杆、环 |
| G 隐喻 | 8 | 放大镜、灯泡、齿轮、火柴人、开门、拆盒、路标、等待 |
| H 界面 | 4 | 窗口、对话、终端、标签页 |
| I 落版 | 3 | 片尾。必选一张 |
| 附加族 | 10 | 揭示 / 文字动效 / 连续 / 变换 / 强调 / 数字。不占选卡配额 |

语义查表在 `references/scenes-index.md`。**卡的代码是唯一真源**——
查到卡名就去 `assets/hw-cards.js` 搜它，抄 `build` 函数改文案。
（早先每张卡有一份 `.md` 副本，删掉了：副本一定会跟代码走散。）

---

## 版面三层

竖屏 1080×1920 从上到下切三层，**互不重叠**：

| 层 | 位置 | 谁的地盘 |
|---|---|---|
| `S.safe` | 4% – 74% | 内容 |
| `S.caption` | 75% – 86% | 字幕带，只归 `HW.captions` |
| 平台 UI | 86% – 100% | 抖音/小红书的作者名、话题、按钮，谁也不许进 |

两条硬约束，都是实测翻车换来的：**主体重心必须落在 30%–58%**（safe 只说别出界，
不说别坠底），**safe 里不许有超过 25% 的连续空带**（不然画面从中间断成两截）。
所以每格至少两层：主视觉 + 支撑层。

---

## 画风

| | |
|---|---|
| 纸面 | `#FFFFFC` + 26px 点阵 |
| 墨线 | `#003E1F` 深绿 |
| 强调 | `#53A548` 马克笔绿——**只做笔画**，写字用 `#3C7A33` |
| 字体 | Excalifont（拉丁）+ 小赖字体（中文，按本片字符重新子集化） |

颜色只写在**一处 token 块**里，改色不用碰 64 张卡。换配色和字体子集化都在
`references/palette.md`——那里也记着为什么马克笔绿只能画线不能写字
（在纸上只有 2.75:1，过不了 3:1 的对比度闸）。

---

## 四道闸

```bash
npm run check                            # HyperFrames：渲染错误 + 对比度
node scripts/scene-lint.mjs  <片目录>     # 选卡纪律：相邻不重、能量配比、转场种类
node scripts/motion-lint.mjs <片目录>     # 动效尺度：时长、错峰、缓动词表
node tools/gate.mjs . --stage 2 --spans <每格秒数> --captions 1   # 画面审计（gate + frame-audit 随包在 tools/）
```

四个都得退出 0 才能渲。前三道只读代码和 STORYBOARD——**它们看不见画面**。
第四道抓帧判像素，真正让人一眼说「这不对」的几件事只有它查得出来：
坠底、缝里空帧、字幕带空着、留白断层。

> 判闸一律看退出码，**不许 `命令 | tail -N`**——那拿到的是 tail 的 0，永远是「过」。

**顺序很重要：验收要排在渲染前面。** `hyperframes snapshot` 吃的是工程目录不是视频，
建完帧就能抓图，不必先渲。把顺序倒过来，发现问题的时间从 20+ 分钟掉到 2–5 分钟。

---

## 目录

```
handdrawn/
├── SKILL.md                    # agent 读这个
├── README.md                   # 你在读的这个
├── assets/
│   ├── hw-kit.js               # 引擎：笔画原语 + 槽位 + 编排器 + 审计 + 字幕
│   ├── hw-cards.js             # 64 张卡的 build 函数（唯一真源）
│   ├── hw-trans.js             # 转场的两半（盖上 / 揭开），每帧两行调用
│   ├── fonts/                  # Excalifont + 小赖子集
│   └── vendor/                 # rough.js + gsap
├── references/
│   ├── scenes-index.md         # ← 选卡从这里查
│   ├── layout.md               # 安全区 / 画幅自适应 / 槽位 / 入框契约
│   ├── palette.md              # 配色与对比度算账、字体子集化
│   ├── transitions.md          # 8 种手绘转场
│   ├── pitfalls.md             # 坑位全录（33 条实测）
│   └── voice-pipeline.md       # 配音契约（不绑定任何 TTS 厂商）
├── scripts/                    # scene-lint / motion-lint / build-gallery
├── templates/                  # 帧脚手架 + 字幕皮肤
├── playground/index.html       # 64 格动图墙，双击就能看
└── evals/                      # 3 个评估场景，改 skill 之后跑它
```

---

## 改这个 skill 的话

先跑 `evals/` 里的三个场景建立基线，改完再跑一遍对比。视频 skill 的失败方式
（镜头重复、跑偏画风、拿占位符充数）单元测试抓不到，只能靠场景评估。

要加一张新卡：在 `assets/hw-cards.js` 里加一条（照抄邻居的结构），
在 `references/scenes-index.md` 的表里加一行，跑 `node scripts/build-gallery.mjs`，
打开画廊看那格红不红。

---

## 致谢

- [rough.js](https://roughjs.com) — MIT，手绘渲染引擎
- [Excalidraw](https://excalidraw.com) — MIT，字体与画风底座
- [wired-elements](https://github.com/rough-stuff/wired-elements) — MIT © Preet Shihn，7 张 UI 组件卡的绘制配方来源

## License

MIT
