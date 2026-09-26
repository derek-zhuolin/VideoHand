# 离线口播导演工程

当前能力是把已录制的口播与手绘物件放进同一份 HyperFrames 工程。`prepare` 导入素材，Agent 编写语义计划，`compose` 生成工程；命令本身不会调用模型理解句子，也不会自动转录。实时摄像头、流式语义响应和直播不在本轮范围。

## 从录制素材开始

在仓库根目录运行；输出目录必须是尚不存在的目录，且位于仓库／已安装 Skill 之外。

```bash
node bin/videohand.mjs prepare --video /path/to/recording.mp4 --transcript /path/to/captions.srt --out ../talk-brief
```

输入必须同时有视频与音频。转录可选，支持 SRT、VTT、JSON cue 数组，以及 `{ "segments": [...] }` 或 `{ "words": [...] }`；每项使用秒制 `{start,end,text}`。SRT/VTT 和 segments 是句级，只有明确的 words 数组标记词级。`prepare` 输出的 `{cues,granularity}` 也可重新导入，保留句级或词级标记。导入会拒绝倒序、重叠和明显超过媒体时长的字幕，不补造时间、不改原话。没有转录时，先取得与录制对齐的转录，再继续规划。

输出的 `source.json`、`transcript.json` 与 `DIRECTOR-BRIEF.md` 供 Agent 阅读。Agent 应阅读全文，必要时观看原片，按完整意思划分段落，逐段写出：原话 `spoken`、核心含义 `meaning`、关系 `relation`、用途 `purpose`、视觉价值与任务 `visual`、真人是否有表达价值 `presenterAddsValue`，以及选择依据 `reason`。一条字幕不是一个镜头；名词或关键词不直接决定配图和构图。

Agent 将计划保存为 `../talk-brief/director-plan.json`，其中 `source.path` 可用相对计划文件的 `input/recording.mp4`（扩展名以实际导入结果为准）。

```bash
node bin/videohand.mjs compose --plan ../talk-brief/director-plan.json --out ../talk-film
node bin/videohand.mjs inspect --html ../talk-film/landscape/index.html
```

在生成的具体画幅目录中使用已安装的 HyperFrames：

```bash
hyperframes preview
hyperframes check --snapshots --json
hyperframes render -w 1 -o renders/film.mp4
```

命令成功仅证明相应技术检查完成；仍需观看成片检查节奏、字幕、构图与原声同步。

## 计划结构

真实接口定义在 `scripts/director-plan.mjs`，生成逻辑在 `scripts/director-project.mjs`。

| 字段 | 当前约定 |
| --- | --- |
| `version / title / duration` | `version: 1`；时长为 1–3600 秒。所有计划时间均相对成片起点。 |
| `aspect` | `landscape`、`portrait` 或 `both`。横屏 1920×1080，竖屏 1080×1920。 |
| `source` | 录制素材用 `{path,start,kind:"recorded"}`；无声视觉研究用 `null`。测试合成媒体才用 `kind:"test-fixture"`。 |
| `theme` | `background/ink/accent/wash` 使用六位 hex；本风格使用白底。 |
| `presentation` | 可选。`preset:"framed"` 启用留白、阴影画布、圆形 PiP 和上移字幕；省略时是 `classic`，保持原有构图。见下节。 |
| `beats` | 每段有独立 `id/start/end`，从 0 到总时长连续覆盖，不能有空洞或重叠。必须提供原话、含义、理由与语义判断。 |
| `visual` | `value` 为 `none/support/essential`；`detail` 是明确布尔值。需要视觉时必须有非空 `task`。 |
| `objects` | 当前支持 `laptop/cloud/tray/task/icon`。独立物件设置各画幅的中心坐标 `position.{aspect}.{x,y,scale}`；不能把横屏直接裁成竖屏。 |
| `task.owner / slot` | 任务归属于真实容器；slot 为 0–11 的整数，初始位置不能重复。同一任务全片保持同一个 `id`。 |
| `actions` | 按 `at` 排序；每项有 `id/kind/at/duration/meaning`。不要求每段使用全部动作。 |
| `captions` | `{start,end,text,key?}`；互不重叠，关键词必须出现在原字幕中。关键词用于强调或定位，不用于语义分类。 |
| `beats[].anchors / keepObjects` | 可选的关键词定位 `{time,text,action?}` 与延续物件 id；关键词须来自该段原话，时间落在段内，动作与物件须真实存在。导演记录同时显示成片时间和源视频时间。 |

`purpose` 支持 `personal/explanation/evidence/conclusion/neutral`。`relation` 支持 `personal/capacity/handoff/division/sequence/cause/comparison/hierarchy/evidence/conclusion/none`。这里记录 Agent 的上下文判断，不是自动分类器。

构图默认由这些判断决定：真人足以表达时用 `a`；小注释辅助真人时用 `a-support`；画面解释关系且真人仍有价值时用 `b-pip`；细节需要全画面或真人没有新增价值时用 `b`。没有新视觉需求的 `neutral` 段落保持上一构图。`layout` 可显式覆盖，用户编辑优先；`pip` 默认 `bottom-right`，也接受其他三个角。没有固定的真人／B-roll 轮换周期。

## 留白画布与圆形人像

首次计划只需增加 `"presentation":{"preset":"framed"}`。完整可调配置如下；值是普通 JSON，不含模型供应商、API 或可执行 CSS。

```json
{
  "presentation": {
    "preset": "framed",
    "canvas": {"scale": 0.925, "radius": 48, "background": "#F2F1ED", "shadow": true},
    "presenter": {
      "pipShape": "circle",
      "size": {"portrait": 272, "landscape": 200},
      "cropPosition": {"x": 50, "y": 10}
    }
  }
}
```

`theme.background` 是内画布颜色，默认白色；`canvas.background` 是外底色。`scale` 在 0.8–1 之间，内画布连同字幕、视频等比缩放并居中，四边留白；`radius` 是缩放前的逻辑像素，范围 0–100；`shadow` 为布尔值。竖版默认内画布左边距 40.5、上边距 72，圆角 48；上下和左右是同一缩放比例产生的边距，不是把视频拉伸进固定框。

四种构图仍然存在：`a` 的真人填满内画布并隐藏标题；`a-support` 让注释和较大的真人并排或上下布局；`b-pip` 用画面讲解并保留角落人像；`b` 隐藏真人画面但保持同一源视频的音频。不会根据秒数自动轮换。

`pipShape` 可为 `circle` 或 `rounded`。圆形人像始终等宽等高；默认竖版 272×272、逻辑位置 `(764,1604)`，横版 200×200、位置 `(1676,836)`。四角由段落的 `pip` 指定，默认右下。可调尺寸为竖版 160–320、横版 140–240。竖版字幕默认 top 1472、高 124；横版独立使用 top 700、高 92。头像增大时字幕带自动继续上移，避免遮住底部头像；`a-support` 也为此预留空间。真人主镜头下字幕正常叠加在视频中，需要观看素材确认不挡嘴部。

`cropPosition` 是 `object-position` 的百分数，x/y 均为 0–100，默认 50/10；这是可调裁切，不是人脸追踪、抠像或自动主体识别。换一段原片后仍需观看并调整，尤其是横屏输入和多人素材。图解物件有独立横竖坐标，不能仅靠画布缩放解决所有避让问题。

可运行的中性示例：

```bash
node bin/videohand.mjs compose --plan examples/director/framed-presenter.json --out ../framed-study
```

此例只有通用演示文案和人像占位图，没有私人录制、转录、个人路径或原声。它演示四种布局，不能充当真人声画同步验收。任何能输出同一计划结构、且运行环境能读写文件并执行 CLI 的模型／Agent 都可使用这个入口；校验和渲染不调用模型。此接口兼容性不等于已经实测每一家模型的语义理解或视觉质量。

## 当前五类动作

| `kind` | 专用参数与行为 |
| --- | --- |
| `accumulate` | `owner`、`objects:[taskId...]`：让已归属该容器的任务依次出现。 |
| `transfer` | `from`、`to`、`objects`：让同一任务连续移入另一容器；from 必须等于当时的真实 owner。保留原 slot，校验会拒绝占用目的地槽位，不自动重排或寻找空位。 |
| `load` | `target`、`amount:0..1`：改变容器的示意负载条。没有真实数据时不能把它宣称为统计结果。 |
| `focus` | `target`、`scale:1..1.65`：聚焦一个物件；`target:null, scale:1` 返回全景。 |
| `emphasis` | `target`：一次轻微摇动，用于引导注意。 |

同一个任务不能同时执行两次移动，目的地必须是 `laptop/cloud/tray`。动作服务于累积、交接、分工等关系；没有理解上的收益，就保留画面让观众看清。

## 原声与剪辑边界

当前工程使用一个连续录制源，保留视频中的原声，按一条口播音轨使用，不提供独立音轨编排或多路混音。多音轨素材先明确并整理要保留的口播音轨。`source.start` 只选择连续片段的起点，`duration` 决定截取长度；暂不支持在一份计划里跳切、拼接多段源素材、删除中间停顿或变速。

原始转录时间以源素材为基准。截掉开头后，Agent 必须把保留内容的字幕与动作时间转换到成片起点，不能直接照搬原时间戳。B-roll 独占画面时原声仍连续播放；没有额外 TTS 替换原话。

## 后续编辑以 HTML 为准

构建后的每个 `index.html` 是可编辑权威来源：标签在 DOM 中，位置在物件外层样式中，导演判断与动作在同一 HTML 的 `vh-plan` 数据块中。原始计划只是首次生成输入；`DIRECTOR.md` 是生成时快照。不要重新 compose 到已编辑项目来覆盖人工修改。

`revise` 只支持三种有限修改，不保证任意 Studio 操作都能往返保存：

- `label`：修改已有物件标签，`target` 为物件 id，`value` 为新文字。
- `layout`：修改某段构图，`target` 为段落 id，`value` 为四种构图之一，可另设 `pip`。
- `timing`：修改某个动作的 `at` 或 `duration`，`target` 为动作 id；不改语义段落或源视频剪辑点。

把修改保存为 JSON 数组，例如 `[{"type":"timing","target":"move-tasks","at":5.2,"duration":2.6}]`，然后运行：

```bash
node bin/videohand.mjs revise --html ../team-handoff-study/landscape/index.html --changes /path/to/changes.json
```

修改前会备份 HTML，并重新校验计划。横竖版各自编辑、各自检查；标签 DOM 若已被手动改成其他结构，需直接编辑该标签。改后通过 `inspect` 查看当前 HTML 中的导演记录。

## 团队协作视觉研究

`examples/director/team-handoff.json` 是 18 秒无声研究：四张示意任务进入团队托盘，保持原 id 交给协作伙伴，团队一侧保留代表关键判断的小灯泡。只使用累积、转移和一次强调，不虚构效率数字。

```bash
node bin/videohand.mjs compose --plan examples/director/team-handoff.json --out ../team-handoff-study
```

本例 `source:null`，没有本人视频、录音或真实转录；`spoken` 与字幕是演示文案。各段显式 `layout:"b"` 仅用于视觉研究，不能作为真人 A/B-roll 选择效果或声画同步的验收。计划提供了横竖坐标，目前 `aspect:"landscape"`；竖版仍需单独构建并观看检查。接入真实录制后，须重新按上下文决定构图，并观看实际成片完成验收。

## 浏览器定位检查

维护动作组件时可运行 `node tools/verify-director-browser.mjs /path/to/index.html /path/to/report.json`。预先将 `VIDEOHAND_PUPPETEER` 指向已安装的 puppeteer-core 入口，将 `VIDEOHAND_CHROME` 指向本机 Chromium；脚本不会下载依赖。它在语义段和动作中途／端点比较正向、反向 seek 的 DOM 状态，检查人物与画面／字幕的重叠。它不驱动 HyperFrames 的视频播放，因此媒体同步仍需检查实际导出的 MP4。
