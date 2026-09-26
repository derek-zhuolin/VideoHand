# 验收：运行正确和画面好看分别检查

工具基线：Node ≥22，HyperFrames 3.2 示例本次验证使用 0.8.77，ffmpeg + ffprobe。其他版本先跑小样，不宣称全部兼容。doctor 只读，不自动安装或切换 registry。

## 自动与结构检查

- 生成器校验真实图标名、字体字形、参数、时间轴边界、音频实测时长、字幕重叠和禁止覆盖已有目录。
- composition 是固定宽高时长的实际 DIV；一个内联注册的 paused timeline；资源本地化，无父目录依赖、外链字体、无限 SMIL 或 CSS 动画。
- 对每个画幅执行 `hyperframes check ./landscape --snapshots --json > landscape-check.json`（portrait 同理）。所有错误修复；警告逐条解释或修复，不把所有标记都关掉。
- 每个布局审计目标用唯一 selector。标题或正文不可用 data-layout-ignore 逃避校验；装饰性无内容背景可例外。

## 视觉与声音检查

新动作风格先做 10–15 秒、包含完整语义交接的小样，按正常速度观看再扩展。全片抽查开头、每次主角变化前后、字幕交接、最后一秒；长视频覆盖每段。检查：

1. 字体完整、中文无方框；正文对比度够、关键信息在手机尺寸可读。
2. 主体始终有焦点，箭头表达真实关系，标注跟随对象，没有小图标铺满画面的装饰噪声。
3. 所有可见物体及运动轨迹在安全区；字幕无遮挡。横竖版分别看，不能以一版通过代替另一版。
4. 随机 seek / 往回 seek 到同一时间画面一致；没有空白闪帧、字幕幽灵和过界首尾。
5. 导出 MP4 的分辨率、时长、帧率正确；有音频则试听并检查峰值与截断。
6. 物件的状态变化能解释内容，跨段保留同一对象身份；起步、减速落位与错峰接力可感知。相机可以静止，必要的阅读停留可以保留。整页匀速上移、全体图标同步摆动和机械循环不能代替叙事动作。
7. 逐段对照旁白、字幕与主动作。新增片头、重排分段或变速后重新核对时间锚点，不能只检查片长一致。无露脸 TTS 的具体做法见 [动作编排规范](continuous-noface.md)。

`tools/check-frame-motion.py` 只提供重复解码帧与像素变化的辅助证据。它不评价 easing、因果动作、声画对齐或审美，也不能自动区分有意阅读停留与故障停帧。不能把“零重复帧”写成“连续动效已通过”，更不能为通过数值检查而加入无意义的镜头或背景漂移。

```bash
hyperframes render ./landscape --output ./landscape.mp4 --fps 30 --quality high --workers 1
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate -show_entries format=duration -of json ./landscape.mp4
```

长片先抽样渲染，再完整渲染。最终交付记录工具版本、通过项目、人工复核、未覆盖项；“lint 通过”不能代替审美与叙事判断。
