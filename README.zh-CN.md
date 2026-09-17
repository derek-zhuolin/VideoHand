# VideoHand 3 · Doodle 手绘视频

默认视觉升级为 Oreo Design / Doodle Icons，使用 Hyperframes 渲染。完整说明见 [SKILL.md](SKILL.md)；跨平台命令见 [README](README.md)。

不是仅替换图标：纸色、墨线、标题字体、手绘抖动、连续场景和字幕稳定性一起构成新风格。原有 HW 排版与旧工程仍可维护，但不再是默认生成效果。

3.0 的字幕默认使用 Xiaolai 手写体和浅杏色关键词衬底；每句最多突出一个关键词。框线只在输入输出、对照或 Reference 等关系需要时偶尔出现，其他段落保留纸面留白。

- [GitHub 原始图标与整体设计 Reference](references/doodle-design.md)
- [构图与动画](references/composition.md)
- [火山、慕斯等音频接入契约](references/audio.md)
- [验收](references/quality.md)
- [安装与迁移](references/portability.md)

中性示例在 examples/doodle；复制配置，改文案和时间后建项。字幕与音频必须按真实配音对齐。建项不需要 Python 或 npm install，渲染需显式安装对应工具。给别人分发时不包含私人笔记、音色和密钥。
