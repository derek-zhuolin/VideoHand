# 编辑当前导演工程与扩展动作

本教程修改已经生成的 HTML，不重新 compose。原始 `director-plan.json` 只是首次生成输入；当前 HTML 中的 DOM、样式和 `vh-plan` 数据块共同构成可编辑工程。不要再用旧计划覆盖它们。下列命令从 VideoHand 仓库根目录执行；示例工程是 `../team-handoff-study/landscape/index.html`，对应 [团队交接计划](../examples/director/team-handoff.json)。

## 先保存当前版本

```bash
cp -n ../team-handoff-study/landscape/index.html ../team-handoff-study/landscape/index.before-director-edit.html
node bin/videohand.mjs inspect --html ../team-handoff-study/landscape/index.html
```

`cp -n` 不覆盖已有备份；以后每轮编辑使用新的备份文件名。横竖版是独立文件，分别备份、修改和检查。下文手动修改只触及指定节点与字段，保留其他人工布局、样式和标签。

## 修改新版留白与圆形头像

由新版生成的工程有 `id="composition-surface"`，以及支持 `presentation` 的 `assets/director.js`。在当前 HTML 的 `vh-plan` 数据块中设置 `"presentation":{"preset":"framed"}`，即可使用留白、柔和阴影、圆形 PiP 与上移字幕。运行时读取此配置，不必同时修改字幕 DOM。完整字段、取值范围与默认值见 [导演计划的视觉配置](director.md#留白画布与圆形人像)。例如只改变圆形头像尺寸：

```json
"presentation": {
  "preset": "framed",
  "presenter": {"pipShape": "circle", "size": {"portrait": 240, "landscape": 180}}
}
```

保留该数据块中的其他字段。`canvas.scale` 同时等比缩放所有内容；只给人物宽高设不同缩放会把圆形变成椭圆。`presenter.cropPosition` 可调整人物在裁切框内的位置，但不提供自动人脸跟随。更改后正向播放、倒退拖动，检查字幕、人物头部与图解关系；真人 `a` 下字幕与视频叠放是正常情况，`b-pip` 下字幕不得覆盖头像。

旧工程若没有 `composition-surface` 或使用旧 runtime，单加 JSON 不会迁移样式。不要用 compose 覆盖旧的人工编辑：先备份，在独立的新示例里确认新版结构后，逐项迁移 wrapper、CSS 和 runtime，并保留旧 DOM、时间轴与源音轨。`revise` 的有限接口仍只有 label/layout/timing，不接受 presentation 修改类型。

## 1. 修正字幕文字，不改原声

先听原声，确认是转录或标点错误，而不是改写讲述者说过的话。团队例子是无声研究，下面只演示删除一处逗号。

打开当前 HTML，找到 `id="caption-0"`。将它内部的 `<span>` 改成：

```html
<span><mark>重复任务</mark>也会占住团队的注意力。</span>
```

保留外层 `id="caption-0"`、`class="caption"` 和安全区属性；只替换这一条字幕内容。再在同文件 `<script type="application/json" id="vh-plan">` 中，找到 `captions` 的第 0 项，保留其起止时间，改为：

```json
{"start":0.5,"end":4,"text":"重复任务也会占住团队的注意力。","key":"重复任务"}
```

DOM 决定屏幕上的文字，`vh-plan.captions` 保存工程记录和显示时间，两者要一致。若删除了关键词，也要去掉对应 `<mark>` 和 `key`；`key` 必须出现在新字幕中。文字中的 `&`、`<`、`>` 在 HTML 文本中写为 `&amp;`、`&lt;`、`&gt;`，JSON 字符串仍使用原字符并遵守 JSON 转义。

这一步不修改视频文件、`speaker-video`、`source.start` 或音量，因此不会改变原声。若确实纠正了转录中的错字，同步修正有关 `beats[].spoken` 的原话记录及引用该错字的 anchors；不得更改原话的事实、限定条件或含义。`revise` 暂不提供字幕类型，不能把字幕请求伪装成 `label`。

## 2. 局部替换图标或物件画法

### 换一个 Oreo 图标

团队示例的 `judgment` 是独立 `icon` 物件。以下以“改成确认标记”为例；只有含义确实需要“确认”时才选择 `check`。

```bash
node bin/videohand.mjs icons check
```

在当前 HTML 找到 `id="motion-judgment"`，仅替换它内部的第一个 `<svg class="figure" ...>...</svg>`：复制仓库 `assets/doodle/icons/check.svg` 的完整 SVG，并在根 `<svg>` 上添加 `class="figure"`，保留该物件的 `id="shape-judgment"`。保留复制来的 `viewBox="0 0 48 48"`、path、描边和线帽。不要改仓库里的原始 SVG。

同文件 `vh-plan.objects` 中找到 `id:"judgment"`，只将 `icon` 改为 `"check"`，保留 id、kind、at 和横竖位置。不要只改 JSON：图形已内联在 DOM 中，刷新时不会根据 `icon` 字段重新生成 SVG。

### 换原创具体物件的一部分

例如把 `team` 的托盘画成带页签的文件框，仍使用 `kind:"tray"` 的容器语义。在 `id="motion-team"` 内的 `viewBox="0 0 500 310"` SVG 中，仅替换 `object-wash` 和 `object-outline` 两条路径：

```html
<path class="object-wash" id="part-team-object-wash" d="M34 63 L173 63 L196 83 Q330 76 468 84 L489 245 Q251 263 13 248 Z"/>
<path class="object-outline" id="part-team-object-outline" d="M34 63 L173 63 L196 83 Q330 76 468 84 L489 245 Q251 263 13 248 Z M17 202 L170 201 Q182 233 252 230 Q316 231 328 202 L484 201"/>
```

新工程可直接用 `#part-team-object-outline` 定位托盘轮廓，用 `#shape-team` 定位整幅 SVG；容量示例的电脑屏幕是 `#part-local-screen`，同配置重建时这些 ID 保持稳定。

已有工程补 ID 时，先备份当前 HTML，只在各 `object-{id}` 内的现有 `svg.figure` 起始标签追加 `id="shape-{id}"`，在现有 `object-wash/object-outline/screen/task-paper/task-lines/identity-badge` 部件标签追加 `id="part-{id}-{部件class}"`。保留路径、尺寸、样式、其他属性和时间轴；已有不同 ID 的节点先人工核对，不覆盖。完成后检查文档内 ID 唯一性，不重新生成或替换整个 SVG／HTML。

保留同一 SVG 的 `identity-badge`，以及外面的 `load-team`、标签和 `motion-team`／`object-team` 两层 wrapper。外层位置和尺寸不变，现有交接动作仍控制同一个容器。不要直接把 `kind` 改成不存在的 `folder`；新增类型需要下面的代码扩展步骤。

这种局部 SVG 修改只影响这份工程。把自定义画法和作者记到输出工程的 `provenance.json`，不要登记成 Oreo 原图标。若需要所有新工程都复用它，再修改生成器。

## 3. 修改强调色

当前 HTML 的 `id="root"` 节点有内联 CSS 变量。例如，将其中：

```css
--accent:#B9511D;--wash:#FAE6C9
```

改为：

```css
--accent:#386C63;--wash:#E4F0EB
```

只替换这两个变量，保留其他内联尺寸和人工样式。同步修改同文件 `vh-plan.theme.accent` 为 `"#386C63"`、`theme.wash` 为 `"#E4F0EB"`。背景仍使用 `#FFFFFF`。`accent` 控制负载条等强调部分，`wash` 控制浅填色和字幕关键词底色；只改 plan 不会更新根节点已有的 CSS。

## 4. 调整动作时间

将以下内容保存为仓库外的 `../team-handoff-changes.json`：

```json
[
  {"type":"timing","target":"move-tasks","at":5.2,"duration":2.6}
]
```

```bash
node bin/videohand.mjs revise --html ../team-handoff-study/landscape/index.html --changes ../team-handoff-changes.json
```

该命令只改当前 HTML 的动作数据，先校验，再备份并写入；不会重新生成场景或覆盖人工 CSS。`at` 是成片时间，`duration` 是动作占用窗口。修改不得超出总时长或与同一任务的其他动作冲突。

动作若被 `beats[].anchors` 引用，还要在当前 HTML 内核对该 anchor 的时间与原话。`revise timing` 不会自动重对齐语音、字幕、段落或 anchors。

## 5. 覆盖 A/B-roll 和 PiP 角落

将修改文件改为：

```json
[
  {"type":"layout","target":"shared-handoff","value":"b-pip","pip":"bottom-left"}
]
```

再运行同一条 `revise` 命令。`value` 可选 `a`、`a-support`、`b-pip`、`b`；`pip` 可选 `bottom-right/bottom-left/top-right/top-left`。该修改作为显式 override 保留，优先于自动构图判断；在当前 HTML 的对应 beat 中补充选择理由，便于 `inspect` 阅读。

团队无声示例没有真人素材，改成 `b-pip` 只会显示真人占位框，不能作为真人效果验收。对已有录制素材的工程，替换为它自己的 beat id 后再操作。角落不会自动避让；在浏览器中检查人物、物件与字幕是否相互遮挡。若这句由真人说更清楚，用 `a`；若画面需要独占，就用 `b`，不要为了展示功能固定轮换。

## 改完怎样检查

```bash
node bin/videohand.mjs inspect --html ../team-handoff-study/landscape/index.html
```

然后在 `../team-handoff-study/landscape` 内运行：

```bash
hyperframes preview
hyperframes check --snapshots --json
hyperframes render -w 1 -o renders/film.mp4
```

重点看改动前一刻、动作中途、完成后的停留和倒拖回起点。听录制工程的原声，确认只是字幕校正，没有改变所表达的事实。`inspect` 验证计划字段，不能替代检查手改后的 SVG 和 DOM；这部分必须预览。竖版重复同样操作，但按竖屏画面重新判断位置和遮挡。

## 五类动作的当前契约

共同字段是 `id/kind/at/duration/meaning`。时间均为成片秒数；有原声时，先找到语义发生的位置，再写时间。可在所属 beat 的 `anchors` 中记录 `{"text":"交给协作伙伴","time":5.2,"action":"move-tasks"}`；text 必须来自该段原话。Anchor 是可审查记录，不会自动触发或重定时动作，实际执行仍由 `action.at` 决定。

### `accumulate`：累积、容量压力

- 必要输入：`owner` 和不重复的 `objects:[taskId...]`；任务已经归属于该 owner。
- 身份与状态：同一个 task 从不可见、轻微上移和倾斜，进入当前位置并稳定可见；不创建新 task，也不改变 owner。
- 时间锚点：开始出现“越来越多／逐渐积累”的意思时入场，全部入场后留出观察时间。
- 边界：只对尚未显示的任务使用。再次 accumulate 会重新执行淡入，当前校验不会判断任务是否已显示；不要用它重新入场已经在场的任务。同一任务不能与未完成的 accumulate、transfer 或 emphasis 重叠。

### `transfer`：交接、迁移、职责变化

- 必要输入：真实容器 `from/to` 和不重复的 task id 列表；from 必须与当时 owner 一致，且不能等于 to。
- 身份与状态：同一个 DOM 任务从当前位置移动到目的容器的同一 slot，更新运行时位移和归属事件；移交不复制，不在原处留下另一个任务。
- 时间锚点：对齐“交给／移到”等关系开始变化的位置。多个任务会错峰移动，在动作窗口内到达；下一次操作按完整窗口留空。
- 边界：目标只能是当前支持的容器；目的地相同 slot 已有任务时校验拒绝，不自动覆盖、堆叠或另找空位。起始／目的容器须在视觉上可见。同一任务的移动与强调不得重叠。

### `load`：容量或负载状态

- 必要输入：容器 `target` 和 `amount:0..1`。
- 身份与状态：同一个 `load-{id}` 条从先前值（默认 0）过渡到 amount；不移动或复制任务，不改变 owner。
- 时间锚点：对齐“变满／恢复空闲”等状态变化，不按每个名词分别触发。
- 边界：同一容器的负载动画不能重叠。没有数据依据时只能表示定性状态，不能加上虚构的百分比、收益或速度数字。

### `focus`：聚焦细节、返回整体

- 必要输入：物件 `target`、`scale:1..1.65`；返回全景用 `target:null, scale:1`。
- 身份与状态：物件及 owner 不变，镜头从上一 camera 状态转向目标当前中心；已完成的任务交接位移纳入目标位置。
- 时间锚点：在观众确实需要看清细节时靠近；理解完成后才返回全景，不机械推拉。
- 边界：两个 focus 不能重叠；目标仍在已开始的移动中时拒绝聚焦。不要在聚焦途中另行启动目标移动，也不要聚焦尚未出现的物件；这类未来冲突仍需作者检查。字幕与标题不随 `world` 镜头缩放。

### `emphasis`：一次注意力引导

- 必要输入：现有物件 `target`。
- 身份与状态：同一物件只做 `rotation:0 → -2 → 0` 的轻摇，不重写 x、y、scale 或 opacity；位置和归属不变。
- 时间锚点：对齐一句话的关键转折或落点，不逐词触发。
- 边界：不能与该对象未完成的 accumulate、transfer 或 emphasis 重叠。完成后恢复正常方向，不留下持续摇动；物件应已经显示并结束入场。

## 把一个新物件做成可复用类型

仅换某片的外观，用前面的局部 SVG 编辑即可。若所有新工程都要使用一种新 `kind`，例如 `folder`，需要同步修改以下实际入口：

| 文件 / 函数 | 必须做的事情 |
| --- | --- |
| [scripts/director-plan.mjs](../scripts/director-plan.mjs) 的 `validatePlan()` | 把新 kind 加入允许列表并验证其字段；若它能拥有任务，所有 owner、transfer from/to、load 的容器白名单都要加入，不只改第一处 kind 判断。 |
| [scripts/director-project.mjs](../scripts/director-project.mjs) 的 `DIMENSIONS`、`figure()` | 给出固有尺寸、viewBox 和原创 SVG 层；补上默认 icon 映射或要求显式 icon，避免读取不存在的图标。保持填色／轮廓 class；若支持 load，提供唯一 `load-{id}` 节点。不要修改 Oreo 原文件。 |
| 同文件的 `objectBox()`、`slotPosition()`、`actor()` | 普通静态物件可复用现有尺寸逻辑；新容器必须保证任务 slot 在可用区域内。保留外层位置与内层动作分离，以及唯一 object/motion id。 |
| [assets/director/runtime.js](../assets/director/runtime.js) 的 `slot()` 与状态初始化 | 若新容器的 slot 布局不同，运行时目标位置必须与生成器的初始 slot 完全一致。不能只改其中一边。 |
| [templates/director.css](../templates/director.css) | 仅在需要新层样式时补充规则，核对字体、描边及两画幅占位，不使用无限 CSS 动画。 |
| [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md) 与示例计划 | 登记原创或第三方来源，补一个实际能编译的新类型示例。若新增外部资产，确保 `copyAssets()` 将所需文件及许可复制进输出。 |

验证：在 `tests/director-plan.test.mjs` 增加合法／非法字段和容器归属用例；在 `tests/director-project.test.mjs` 核对生成 DOM、两个画幅与本地资产；若改 slot，在 `tests/director-runtime.test.mjs` 验证不同容器尺寸的交接终点和聚焦位置。运行 `npm test` 后构建新示例，浏览器正向／反向 seek 并渲染查看，不以单测代替视觉验收。

源代码扩展只影响之后构建的新工程。已有工程使用自己复制的 `assets/director.js`、`director.css` 和已内联的 SVG；要迁移它，备份后有针对性地合并相应修改，不重新 compose 覆盖人工布局。

## 增加一种新动作

以拟增加的 `reveal` 为例，这个名字当前**不受支持**。实现顺序是：

1. 在 `scripts/director-plan.mjs` 的动作 kind 允许列表和分支中定义必要输入、范围、目标类型、起止状态及冲突规则。决定是否使用 `motionEnds`、`cameraEnd` 或独立的状态锁；不能只让未知字段通过。
2. 在 `assets/director/runtime.js` 的 `createVideoHandDirector()` 动作循环中增加分支。使用同一 paused timeline，以显式 from/to 和成片时间编排；需要记住终态时更新 `states`，只修改该动作拥有的属性。
3. 若动作改变归属，必须同步验证器的 owners 与运行时 `ownershipEvents`，并让 `ownersAt(time)` 在到达前后、倒拖后都正确。若增加 DOM 层，同步 `scripts/director-project.mjs` 的 `figure()`／`actor()`；若仅操作现有图层，不增加无用 markup。
4. 不引入 `setTimeout`、墙钟、未播完的无限循环或运行时随机数。保留 `tl.totalTime(P.duration,true)` 再回到 0 的初始化方式，并确认首次零帧与倒拖零帧相同。
5. 在 `tests/director-plan.test.mjs` 写无效参数、缺失目标和重叠拒绝测试；在 `tests/director-runtime.test.mjs` 写起止状态、无关属性不被覆盖、连续动作承接测试；增加 DOM 或资产时补 `tests/director-project.test.mjs`。浏览器检查开始前、开始、中间、结束、后续动作和反向 seek。

最后给新增动作补上本页同样的契约与一个最小示例。不要仅增加一个动作名称就宣传“支持扩展”；必须有校验、实际执行、状态恢复和可复现的验证。
