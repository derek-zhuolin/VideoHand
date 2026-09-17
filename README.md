# VideoHand 3.0

**把一段想法，画成一支会讲故事的手绘视频。**

VideoHand 是一个给 Agent 使用的手绘视频 Skill。它用 **Oreo Design / Doodle Icons** 做视觉基底，用 **Hyperframes** 做确定性渲染：先理解文案里的关系，再让同一组物件被画出、被标注、被移动和重新组合，最后交付可编辑工程与 MP4。

> **Doodle 优先，旧版兼容。** 3.0 默认采用暖纸、墨线、Xiaolai 手写字幕、浅杏色关键词衬底和偶发框线；旧 VideoHand 的 HW 卡片工程仍可维护，但不再是新片的默认效果。

[![CI](https://github.com/derek-zhuolin/VideoHand/actions/workflows/ci.yml/badge.svg)](https://github.com/derek-zhuolin/VideoHand/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/videohand.svg)](https://www.npmjs.com/package/videohand)
[![Node](https://img.shields.io/node/v/videohand.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](./LICENSE)

## 先看画面

- [在线预览墙](https://derek-zhuolin.github.io/VideoHand/)：浏览已有画面与横竖屏布局。
- [横屏示例](examples/doodle/landscape.png) / [竖屏示例](examples/doodle/portrait.png)：查看 3.0 的纸面、字体、图标和字幕标尺。
- [Doodle 设计与来源](references/doodle-design.md)：记录 GitHub Reference、字体、配色和使用边界。

## 它适合做什么片子

它适合“内容里有关系、有顺序、有变化”的短视频：观点解释、知识拆解、产品介绍、教程、数据说明、会议复盘和创意提案。它会根据句子的形状来设计画面，而不是把每句话塞进同一张模板。

| 内容形状 | 适合的画面语言 | 适合的片子 |
| --- | --- | --- |
| 先后顺序、流程 | 箭头、节点、同一物件逐步移动 | 教程、产品流程、工作方法 |
| 对照、取舍 | 两组物件、划掉、重新标注 | 观点片、方案比较、决策解释 |
| 因果、层级 | 连接线、聚合、拆分 | 知识拆解、复盘、研究结论 |
| 一个关键结论 | 留白、大字、单个原始图标 | 开场、转折、结尾 |
| 数据与清单 | 少量数字、标签和局部框线 | 数据陈述、功能清单 |

## 实践组合

VideoHand 把“内容结构”“视觉风格”“输出画幅”分开，所以可以组合使用。下面是几种可以直接拿来做的路线：

| 路线 | 结构 | 视觉组合 | 适合场景 |
| --- | --- | --- | --- |
| Doodle 讲解 | 连续语义场景 | Oreo 原始图标 + 暖纸墨线 + Xiaolai 字幕 | 默认的知识、产品和观点视频 |
| Doodle Hyperlapse | 节奏更快，物件持续变形或换位 | 同一主角贯穿，多处短促入场和退出 | 20 秒以内的抖音、Reels、短教程 |
| 竖屏口播增强 | 旁白主线 + 右下角圆形画中画 | 留白字幕区 + 偶发关系框 | 真人口播、知识分享、直播切片 |
| Reference B-roll | 主线场景中插入几秒图标或关系图 | Doodle 图标墙、局部放大、手绘标注 | 产品展示、案例说明、转场呼吸 |
| 兼容模式 | 旧版 HW 卡片工程 | 原有卡片、布局和工程思维 | 维护已有 VideoHand 项目 |

### 默认视觉规则

- 暖纸 `#F7F6F2`、墨色 `#2B2A33`，每幕只保留 1–2 个强调色。
- 优先使用 152 个 Oreo SVG；不混入其他图标库或 emoji。
- 中文字幕默认 Xiaolai；关键词使用浅杏色 `#ECB775` 手绘笔触承托，每句最多一个关键词。
- 框线是偶发的语义容器，只在对照、关系或 Reference 素材需要时出现。
- 16:9 使用 `1920×1080`，9:16 使用 `1080×1920`；横竖屏分别构图，字幕固定在安全区。

## Reference：为什么选 Doodle

3.0 的视觉基准来自 [oreo-design/doodle-icons](https://github.com/oreo-design/doodle-icons)，整体设计参考 [Oreo Doodle Icons](https://oreoui.com/doodle-icons)。仓库内的 [doodle-design.md](references/doodle-design.md) 把来源、图标、字体、配色和动画约束写成可复用的 reference；这意味着“手绘感”来自一套可追溯的设计系统，而不是临时给旧卡片加滤镜。

工程上继续借鉴旧 VideoHand 的长处：语义选场景、连续构图、固定安全区、可编辑 HTML、确定性时间轴和渲染前检查。Hyperframes 负责把这些画面按一条暂停的 GSAP timeline 变成可复现的关键帧。

## 工作原理

```text
文案 / 笔记 / SRT
        ↓
识别每句话的关系：流程、对照、因果、结论
        ↓
选择 Oreo 图标与连续场景，安排字幕、B-roll 和偶发框线
        ↓
用一条确定性的 Hyperframes 时间轴生成关键帧
        ↓
检查画面、安全区、字幕、音频与最后一秒
        ↓
MP4 + 可编辑工程 + 分镜记录
```

Agent 会替你处理场景选择、横竖屏构图、字幕安全区、音画对齐和渲染检查；你只需要提供内容，以及希望保留的节奏、风格、素材和声音。

## 安装与快速开始

需要预先安装 Node.js ≥ 22、Hyperframes、ffmpeg 和 ffprobe。Skill 本身不绑定模型、TTS 厂商、私人音色或个人笔记。

```bash
npx github:derek-zhuolin/VideoHand

# 安装后自检
node bin/videohand.mjs doctor

# 查看一个原始图标
node bin/videohand.mjs icons arrow

# 从中性示例创建可编辑工程
node bin/videohand.mjs create \
  --config examples/doodle/project.json \
  --out ../my-doodle-film
```

在 Agent 中明确调用 `$videohand`，然后直接给它文案、受众、时长、画幅、配音和参考素材。例如：

> 用 VideoHand 3.0 把这段内容做成 20 秒竖屏 Doodle Hyperlapse。字幕偏上，关键词用浅杏色笔触，每一幕只保留一个重点，中间插入两次 Oreo 图标 B-roll，最后保留一个简洁落版。

Agent 会按真实音频时长排分镜；没有配音时，也可以先做无声工程，再补 Volcengine 或其他已获授权的 TTS。字幕要对齐真实音频，不能只按估算字数切镜头。

## 交付什么

- MP4 成片：16:9、9:16，或两种画幅各自构图。
- 可编辑工程：每个 composition 都能单独调整，不需要从头重做整片。
- 分镜与来源记录：包括图标、字体、音频提供方和已知限制，不包含秘密。
- 关键帧检查、Hyperframes 检查和渲染记录。

## 二创与扩展

欢迎基于这个 Skill 做二创：

1. Fork 仓库，复制 `examples/doodle/project.json`，先改文案、时长和画幅。
2. 新增场景时，优先复用 Oreo 原始 SVG 和 `references/` 中的设计约束；找不到合适的图标，就登记一个明确的定制图形，不要偷偷混入别的图标库。
3. 可以替换字体、强调色、字幕位置和 B-roll 组合，但请在自己的 README 中写清改动，并保留第三方许可和来源。
4. 可以把这个 Skill 接到自己的 Agent、TTS 或素材工作流中；不要把密钥、私有音色和个人笔记提交到仓库。

旧工程请阅读 [legacy-workflow.md](references/legacy-workflow.md)；新片不要加载旧 HW 卡片，除非你明确需要兼容原有项目。

## 检查与质量

提交或交付前至少运行：

```bash
npm test
npm run doctor
git diff --check
```

每个输出画幅还应运行 `hyperframes check <composition> --snapshots --json`，检查关键帧、字幕安全区、入场与退出、最后一秒和实际音频。完整规则见 [quality.md](references/quality.md)；音频接口见 [audio.md](references/audio.md)；安装和迁移见 [portability.md](references/portability.md)。

## 欢迎点星，也欢迎定制开发

如果 VideoHand 帮你做出了片子，欢迎在 GitHub 上 [点 Star](https://github.com/derek-zhuolin/VideoHand)。你也可以提交 Issue、Pull Request 或自己的风格参考：Doodle 组件、字幕系统、Hyperframes 动画和旧工程迁移都欢迎贡献。

如果你需要一套专属的 Agent Skill——例如品牌色、固定片头、自己的 TTS、行业图标、自动从 Obsidian 取稿，或者一套团队可复用的剪辑规范——可以联系定制开发：

**微信：`zhuolin25`**

## 目录

- [SKILL.md](SKILL.md)：给 Agent 读取的创作流程。
- [references/](references/)：设计、构图、音频、质量、迁移与场景索引。
- [examples/doodle/](examples/doodle/)：可复制的 3.0 中性示例。
- [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)：图标、字体和依赖的许可说明。

VideoHand 以 MIT 发布；第三方图标、字体和依赖仍以各自许可证为准。
