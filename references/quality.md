# 验收：运行正确和画面好看分别检查

工具基线：Node ≥22，Hyperframes 本次验证 0.8.42，ffmpeg + ffprobe。其他版本先跑小样，不宣称全部兼容。doctor 只读，不自动安装或切换 registry。

## 自动与结构检查

- 生成器校验真实图标名、字体字形、参数、时间轴边界、音频实测时长、字幕重叠和禁止覆盖已有目录。
- composition 是固定宽高时长的实际 DIV；一个内联注册的 paused timeline；资源本地化，无父目录依赖、外链字体、无限 SMIL 或 CSS 动画。
- 对每个画幅执行 `hyperframes check ./landscape --snapshots --json > landscape-check.json`（portrait 同理）。所有错误修复；警告逐条解释或修复，不把所有标记都关掉。
- 每个布局审计目标用唯一 selector。标题或正文不可用 data-layout-ignore 逃避校验；装饰性无内容背景可例外。

## 视觉与声音检查

抽查开头、每次主角变化前后、字幕交接、最后一秒；长视频覆盖每段。检查：

1. 字体完整、中文无方框；正文对比度够、关键信息在手机尺寸可读。
2. 主体始终有焦点，箭头表达真实关系，标注跟随对象，没有小图标铺满画面的装饰噪声。
3. 所有可见物体及运动轨迹在安全区；字幕无遮挡。横竖版分别看，不能以一版通过代替另一版。
4. 随机 seek / 往回 seek 到同一时间画面一致；没有空白闪帧、字幕幽灵和过界首尾。
5. 导出 MP4 的分辨率、时长、帧率正确；有音频则试听并检查峰值与截断。

```bash
hyperframes render ./landscape --output ./landscape.mp4 --fps 30 --quality high --workers 1
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate -show_entries format=duration -of json ./landscape.mp4
```

长片先抽样渲染，再完整渲染。最终交付记录工具版本、通过项目、人工复核、未覆盖项；“lint 通过”不能代替审美与叙事判断。
