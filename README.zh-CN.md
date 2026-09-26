# VideoHand 3.3 · 中文入口

完整介绍、演示与运行步骤见 [README.md](README.md)。

3.3 增加 Icon 优先口播风格：一个主物件、最多两个辅助图形；人物常驻右下圆窗，关键句短暂居中并配合语义动作。白底、原版手绘 Icon、Xiaolai 字幕与杏仁色划重点保持统一；移除无意义的纸张、色块和曲线。

[20 秒公开示例与构建命令](examples/icon-first/README.md) 展示复用、受阻和沿路径补画。它使用通用文案与手绘人物占位，是无声的可编辑 HTML，不是新增自动剪辑或 CLI preset。

3.2 将连续性明确为物件的因果动作与跨段接力：同一对象改变状态、加减速落位、错峰承接，不用整页滚动或同步摆动制造动感。镜头可以稳定，文字保留阅读时间。先核对旁白与动作锚点，再正常速度观看小样；零重复帧不能证明审美通过。

白色内画布、四周留白、柔和阴影、Oreo 原始 SVG 与圆形人像继续保留。Agent 按语义编排，CLI 校验并构建录制口播工程；无露脸 TTS 需独立编写带本地音频的 HyperFrames HTML，尚未内置纯音频 CLI 输入或 TTS 服务。旧计划与暖纸 starter 保持兼容。

- [瀑布流作品与原始 Icon 集合](https://derek-zhuolin.github.io/VideoHand/)
- [通用视觉示例](examples/director/framed-presenter.json)
- [14 秒无声动作研究](examples/motion-study/README.md)
- [无露脸动作编排](references/continuous-noface.md) / [更新记录](CHANGELOG.md)
- [跨模型使用与提示词](references/model-compatibility.md)
- [构建接口](references/director.md) / [局部修改](references/director-editing.md)
- [验证记录](references/validation.md) / [来源与许可](THIRD-PARTY-NOTICES.md)

公开演示为中性文案无声研究，真人原片、原声与转录保留在本地。当前不内置 ASR、自动找脸、抠像或实时直播。模型兼容指通用接口，不表示所有模型都已实际测试。
