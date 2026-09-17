# 分发、安装与旧项目

## 可移植边界

只有 Node 是建项必需运行时；有配音需要 ffprobe 验证；检查与渲染需要用户显式安装 Hyperframes、ffmpeg。正文与字幕字体、图标、GSAP 都随包带入输出项目。运行不依赖 Obsidian、某个用户主目录、另一个 Skill 或私人 TTS。

`node bin/videohand.mjs install --target /absolute/path/to/skills/videohand` 只安装指定目标。目标已存在需显式 `--replace`，先旁置备份；Git checkout 拒绝自动替换，走经审查的本地差异升级。命令默认显示帮助，不再把无参数理解成全局覆盖。CLI 不自动 fetch/push、不安装 post-commit hook、不调用 npx 下载、不改系统 registry。

安装载荷含 bin、package.json、agents、完整 references、资产、模板和示例，安装后 CLI 自包含。npm 包排除私人 films、.git、缓存和凭证。审查不等于替用户发布，发布需单独授权。

## v2 → v3

- 名称保留 videohand，版本 3.0.0；默认入口变成 Doodle。
- 原 hw-kit.js、hw-cards.js、hw-trans.js 与 make-frame.mjs 等留作兼容，不改已经生成的旧工程。
- 旧 palette/layout/scene-lint 只在 legacy 模式生效。新参考为 doodle-design / composition / quality。
- 原 SKILL 归档于 legacy-workflow.md，仅供旧项目；其中旧安装、自动同步命令已经停用。原目录其他历史资料不是 v3 默认工作流。
- 升级前完整备份，记录变更文件；回滚恢复对应备份，不能把别人的后续修改一起无条件覆盖。
- 若存在 VideoHand 自己安装的自动 push hook，升级时记录并停用该 hook；不修改无关用户 hook，不自动提交。

## 扩展点

增加新构图优先扩展场景组件和测试，不膨胀主 SKILL；新增图标登记来源，不伪装成 Oreo 原图标。换 TTS 遵循 audio.md；新品牌用主题 token，不改每个 path。只把已复验的经验写成通用规则，样片文案与音色永远属于具体项目。
