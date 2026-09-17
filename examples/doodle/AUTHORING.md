# Doodle 项目

这是可渲染的连续场景起点，不是把所有题材套成三步流程的成片器。中性示例无 TTS、无私人笔记。每种画幅的 `index.html` 自包含，资源在对应 `assets/`。

1. 按内容改图形、标签、状态和时间轴。对象在同一概念内保留身份；横屏左右关系改成竖屏上下关系。
2. 建项后直接编辑各画幅 `index.html` 的内联脚本与 `assets/scene.css`；`project.json` 记录初始输入，不会自动更新 HTML。重新生成必须用新目录，避免覆盖手工创作。
3. 接入配音前修改输入配置：`audio: {"path":"./voice.wav","start":0.2,"duration":实测秒数}`。字幕 start/end 是相对全片的绝对秒数，必须已经包含音频起点偏移。配音凭证不写入项目。
4. 每种画幅执行 `hyperframes check ./landscape --snapshots --json`（或 portrait）。修复报错后检查关键帧和字幕交接，再 `hyperframes render ./landscape --output ./landscape.mp4 --fps 30 --quality high --workers 1`。
5. 不允许出现缺字、字幕遮挡主体、音频越界或空白首尾；检查实际 MP4，不只看浏览器预览。

许可证随 assets 分发。网页播放动画需要 Hyperframes preview 的时间控制，直接双击 HTML 只显示暂停的 composition。
