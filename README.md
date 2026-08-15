# handdrawn

**给一段文字，出一支像是随手画在纸上的小视频。**

[![CI](https://github.com/derek-zhuolin/VideoHand/actions/workflows/ci.yml/badge.svg)](https://github.com/derek-zhuolin/VideoHand/actions/workflows/ci.yml)

不是把字打进模板，是让每一句话自己决定它该长什么样。

---

## 为什么会有这个 skill

做内容的人都撞过同一堵墙：第一支挺好，第十支跟第一支长得一模一样。

问题不在审美，在结构。市面上的工具给你一个模板，你往里填字——**模板不认识你的内容**，
所以十支片子共用一副骨架，观众三秒就认出「又是这个」，手指一划就走了。

可你想想真正会讲的人是怎么做的。他说到「这三件事缺一不可」，手会在空中比一个三角；
说到「先这样，再那样，最后那样」，手会往前推三下。**画面是从句子的形状里长出来的**，
不是从模板里套出来的。

这个 skill 干的就是这件事：把那个本能拆成 64 张画面卡，逐句去挑。

| 你的句子 | 它挑的画面 |
|---|---|
| 「A 变成 B 变成 C」 | 流程箭头 |
| 「这三个只能选两个」 | 不可能三角 |
| 「不是 X，是 Y」 | 划掉，重写 |
| 「说到底就一句话」 | 大字砸下来 |
| 「这事儿有四个原因」 | 鱼骨图 |

于是同一支片里不会有两个镜头长得一样，不同的片子也不会长成一个样——因为**决定画面的
是你的稿子，不是模板**。开场和落版各锁一张，中间几镜完全跟着句子走，还有硬规则拦着：
相邻不许重样、高能镜头不许扎堆、必须留一张让观众喘气的。

## 为什么偏偏是手绘

因为手绘看起来像**在想**，不像在卖。

线条画得抖、方框四个角对不齐、下划线是歪的波浪——这些「不完美」在替你说一句话：
这是有人一边想一边画给你看的。观众对这种东西的防备心最低。反倒是精致的模板动画，
每一帧都在提醒对方「你正在看一支广告」。

所以抖动不是滤镜贴上去的，是算出来的：底座用 [rough.js](https://roughjs.com)——
Excalidraw 自己那套手绘渲染引擎，字体也沿用 Excalidraw 的官方搭配
（Excalifont + 小赖字体）。同一句话每次渲染抖在同一个地方，因为随机数带种子。

```
一段文字  →  逐句选卡（64 张可选）  →  笔画原语建帧  →  五道闸  →  MP4
```

画面不是手写三百行代码画出来的，是 65 个**确定性笔画原语**（抖动方框、弧线箭头、
涂鸦填充、火柴人、齿轮…）加 8 套版面槽位拼出来的。所以加一种新画面 ≈ 30 行配置，
不是从零画一遍几何。

## 它替你盯着的那些事

这类片子翻车从来不翻在创意上，翻在细节上。所以有五道闸拦着，每一条都是真出过一次
才写进去的：

- **中文断行不许出孤字。** 浏览器不知道「正反馈」是一个词，会把标题断成「x 上的正反 / 馈」。
  这里的断点由算好的语义规则决定，标点优先、末行至少两个字。
- **字不许压字。** 文字的真实高度取决于字体渲染，人在写坐标时算不出来，所以交给自检去量。
- **主体不许坠底、不许出安全区。** 竖屏下面 14% 是抖音小红书的按钮区，谁也不许进。
- **不许拿占位符充数。** 灰条和空心圆在任何结构里都读作「没做完」。

跑不过就不给渲。

---

## 装

一条命令：

```bash
curl -fsSL https://raw.githubusercontent.com/derek-zhuolin/VideoHand/main/tools/install.sh | bash
```

它会**探测你本机装了哪些 agent**（Claude Code / agents / Codex / Cursor / Crush /
Gemini），往每个已经存在的 skill 目录里 clone 一份，生成 64 张卡的动图墙，
最后跑一遍自检把结果打给你看。已经存在的目录不覆盖 —— 那里面可能有你没提交的改动，
遇到就停下来报告，让你自己决定。

不想执行来路不明的脚本（合理），就手动：

```bash
git clone https://github.com/derek-zhuolin/VideoHand.git ~/.claude/skills/handdrawn
node ~/.claude/skills/handdrawn/tools/doctor.mjs        # 自检
node ~/.claude/skills/handdrawn/scripts/build-gallery.mjs && \
  open ~/.claude/skills/handdrawn/playground/index.html  # 看看能画什么
```

### 装不上的时候

先跑自检，它会把"跑不起来"拆成几种不同的原因，每条都带一句能直接粘贴的命令：

```bash
node tools/doctor.mjs
```

查这六件事：Node 版本、ffmpeg、skill 的件是否齐、**中文字体是不是被换成了 LFS 指针**
（1.4 MB 的字体常在 clone 时变成几十字节，现象是中文全部掉回系统宋体）、
npx 拉不拉得到 hyperframes（多半是 registry 不通，它会给你镜像命令）、
以及**你装的位置 agent 认不认**。

需要的东西只有：Node ≥ 20、ffmpeg、以及
[HyperFrames](https://hyperframes.heygen.com/)（`npx` 直接调，不用预装）。
**不绑定任何一家模型** —— 整个目录就是 skill 本身。

### 为什么是 clone，不是复制、也不是软链

复制会得到 N 份各自漂移的副本 —— 改了一份，其余 N-1 份还是老的，而你不知道哪个
agent 在用哪份。这个坑踩过不止一次：某个 skill 目录里躺着一份旧拷贝，于是
「仓库修好了、成片还是老问题」，排查很久才发现根本不在同一份代码上。

软链看似解决了漂移，但它把"指向哪里"变成一个看不见的状态，出问题时更难查。
clone 的好处是**每一份都能 `git log` 自证版本**，一眼就知道谁老了。要拉齐：

```bash
git -C ~/.claude/skills/handdrawn pull
```

### 漂移这件事，别指望自己发现

"坏了就删"防不住 —— **因为你看不出它坏了**。实测过一次：本机同时有两份 handdrawn，
目录结构、文件名、大部分内容都一模一样，只有一份带着已经修好的 bug。
差别要**渲一支片出来**才看得见。

所以规矩不是"发现坏了就删"，是**让每一份都必须能自证版本**：

| 规矩 | 谁来查 |
|---|---|
| skill 目录里只允许有 git 仓库，不允许有实体拷贝 | `node tools/doctor.mjs` 的副本盘点 |
| 每支片带的 `assets/` 必须跟 skill 那份逐字节一致 | `portability-lint` 第四条，按内容哈希比 |

第二条尤其容易中招：建片时会把 `assets/` 复制进片目录，**改完 skill 的引擎不同步过去，
重渲毫无变化**。人会以为"没修好"，回头去改本来已经对的代码。这个坑今天刚踩过。

```bash
node tools/doctor.mjs                       # 全机副本盘点：谁是仓库、谁是哪版
node scripts/portability-lint.mjs <片目录>   # 这支片带的引擎是不是最新的
```

> 实测：同一份 `SKILL.md` 用 `deepseek-v4-flash` 跑，闸和字幕契约都能准确复述。
> 换模型不用改 skill。DeepSeek / GLM / Kimi 这类一般是把 harness 指到别的 API 端点，
> skill 目录不变，装一次就够了。

---

## 怎么用

跟你的 agent 说人话就行：

> 把这段话做成手绘视频：<你的稿子>

它会读 `SKILL.md`，逐句选卡，建帧，跑五道闸，然后渲染。你不用懂卡名，也不用写配置。

想让它照你的意思走，就在稿子后面加一句大白话——这些都是它听得懂的：

> …开场别太用力，中间那句「三选二」要重点画出来，结尾放我的名字。

**中文标题最好自己断行。** 机器断行是能看的兜底，但你知道词在哪儿断最好看：

```
标题写成 ["直接推出去", "速度不允许精致维护"]
比写成 "直接推出去速度不允许精致维护" 好
```

### 先看看有哪些画面可选

```bash
node scripts/build-gallery.mjs   # 重建 playground/index.html
open playground/index.html
```

64 格全在墙上循环播，顶部可切 9:16 / 16:9 / 1:1 和中英文，四个滑杆实时调笔触。
**每一格跑的都是那张卡的真实代码**——所以这面墙同时是 64 张卡的冒烟测试，
哪张写错了那格会红着报错。

挑片子之前先来这儿逛一圈，比读文档快得多。

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

## 五道闸

```bash
node scripts/portability-lint.mjs <片目录>  # 跨平台：合成之后才发作的那一类
npm run check                            # HyperFrames：渲染错误 + 对比度 + Runtime
node scripts/scene-lint.mjs  <片目录>     # 选卡纪律：相邻不重、能量配比、转场种类
node scripts/motion-lint.mjs <片目录>     # 动效尺度：时长、错峰、缓动词表
node tools/gate.mjs . --stage 2 --spans <每格秒数> --captions 1   # 画面审计（gate + frame-audit 随包在 tools/）
```

五个都得退出 0 才能渲。它们看的是**互不重叠的四个层**：

- **portability-lint** 看合成之后的结构。这道闸是一次真实事故换来的：
  单帧预览全对、playground 全对、其余四道闸全绿，渲出来的片子**一条手绘笔画都没有**。
  原因是帧里的 CSS 选择器跟根的真实 id 对不上，`--hw-ink` 落空，
  于是 `stroke: var(--hw-ink)` 解析失败、描边变成 `none` ——
  形状一直好好地在 DOM 里，只是全透明。它还查根 id 撞车、CDN 外链、`../` 路径。
- **check 的 Runtime 段**看浏览器真的报没报错。建帧脚本抛一个异常，
  那一格在成片里就是一整段纯白，而只读源码的闸一个都看不见。**别只看总退出码。**
- **scene-lint / motion-lint** 只读代码和 STORYBOARD——它们看不见画面。
- **gate** 抓帧判像素，真正让人一眼说「这不对」的几件事只有它查得出来：
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
│   ├── pitfalls.md             # 坑位全录（40 条实测，第七节＝合成之后才发作的）
│   └── voice-pipeline.md       # 配音契约（不绑定任何 TTS 厂商）
├── scripts/                    # portability-lint / scene-lint / motion-lint / build-gallery
├── tools/                      # install.sh / doctor.mjs / gate.mjs / frame-audit.py
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

## 出问题了，或者想要点什么

直接开 [issue](https://github.com/derek-zhuolin/VideoHand/issues/new/choose)，
不用懂代码。三个模板对应三种情况：

| 你遇到的 | 开哪个 |
|---|---|
| 成片里字挤在一起、断行断错、画面重叠 | **出片效果不对**——拖张截图 + 贴上原文就行 |
| 有句话在 64 张卡里找不到对应形状 | **想要一张新画面卡**——说清楚那句话「是什么形状」 |
| clone 完 agent 不认，或者跑起来报错 | **装不上**——贴路径和报错 |

报「出片效果不对」时，**截图和原文最有用**。中文的断行、字宽问题跟具体句子强相关，
没有原文很难复现。如果控制台里有 `[hw-audit]` 开头的行，一并贴上——那说明自检已经
抓到了，能直接定位。

每次 push 都会在 CI 里把 64 张卡中英文各真跑一轮（[看运行记录](https://github.com/derek-zhuolin/VideoHand/actions)），
所以主干上的卡是活的。

## 致谢

- [rough.js](https://roughjs.com) — MIT，手绘渲染引擎
- [Excalidraw](https://excalidraw.com) — MIT，字体与画风底座
- [wired-elements](https://github.com/rough-stuff/wired-elements) — MIT © Preet Shihn，7 张 UI 组件卡的绘制配方来源

## License

MIT
