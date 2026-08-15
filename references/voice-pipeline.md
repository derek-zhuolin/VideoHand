# 配音变量化（voice-pipeline）

**音色是一个环境变量，不是流程的一部分。** 换音色只换一个值；不配音整条链路照走。
本文件与具体的人无关：`VOLC_SPEAKER_ID` 填谁，就是谁的声音。

## 三种音色源（选一个）

| 源 | 配置 | 质量 | 成本 |
| --- | --- | --- | --- |
| 火山引擎任意音色 / 复刻音 | `.env` 四项：`VOLC_APPID` / `VOLC_ACCESS_TOKEN` / `VOLC_CLUSTER=volcano_icl` / `VOLC_SPEAKER_ID=<你的音色id>` | 高 | 按量付费 |
| 免费 edge-tts | 无密钥，`--voice zh-CN-YunxiNeural` 之类 | 中 | 0 |
| 不配音 | 不建 SCRIPT.md + STORYBOARD 顶部 `music: none` | — | 0 |

火山凭证放 `~/.claude/.env`，**不进项目、不进 git**。

## 合成命令

**这份文件定的是产物契约，不绑任何一家 TTS。** 只要产出 `audio/NN.wav` +
`audio_meta.json`（词级时间戳 + 口型包络），下游的建帧、字幕、口型全都照走。

工作台用户的入口是它的 `tools/tts.sh`（属于工作台，不随本包分发）——
别直接去调 TTS 的 python 脚本 ——
代理、venv、凭证优先级都在这个壳里处理了。绕过它就要自己踩一遍：
本机 socks5 的 `ALL_PROXY` 会挡住火山 API（报 `Missing dependencies for SOCKS support`），
`tts.sh` 在 clone 档位里把这几个变量 unset 掉了。

```bash
tts.sh clone --script SCRIPT.md --out-dir . --speed 1.2 --gap-map "<幕尾帧号>"
```

| 档位 | 什么时候用 |
|---|---|
| `clone` | 你自己的复刻音（`VOLC_SPEAKER_ID`）。默认走这个 |
| `clone-final` | 要多条候选里挑，带 baseline 比对 |
| `free` | 没凭证时的 edge-tts，同一份产物契约 |

产物契约：`audio/NN.wav`（一句一个，尾部已拼气口）+ `audio_meta.json`
（词级时间戳 + 30fps 口型包络）。

气口不是一个固定数字：按句尾标点分档（问句 0.50–0.65s / 逗号 0.30–0.40s /
句号 0.40–0.55s），`--gap-map` 点名的帧走幕尾档 0.65–0.85s。
所以**别再在 STORYBOARD 里手加停顿**，会加两次。

## SCRIPT.md 格式（TTS 解释器认这个）

```markdown
# SCRIPT — 片名 口播
**Voice settings:** speed_ratio 1.0 · volume_ratio 1.0 · pitch_ratio 1.0

## Line 1 — 标题卡 (Frame 1)

    这句会被念出来。五个要点，五句话。

## Line 2 — 要点 (Frame 2)

    第二句。
```

规则：`## Line N — 标签 (Frame N)` 标题行 + **4 空格缩进**的口播词。

**提速只提一次，选一层，别两层都提。** 两条路都成立，默认走第一条：

| | 怎么做 | 代价 |
|---|---|---|
| **TTS 层（默认）** | `tts.sh clone --speed 1.2`，渲染后不再做 setpts | `audio_meta` 的时长就是终值，帧时长直接抄 |
| 成片层 | TTS 走 1.0，渲完 `setpts=PTS/1.2 + atempo=1.2` | 建帧时用的是 1.0 的时长，全片会缩水 1/1.2，心里要一直换算 |

走默认那条，因为**建帧时看到的秒数就是成片里的秒数** —— 字幕锚点、转场落点、
支撑层要在 85% 采样点前写完，这些判断全都不用再乘一个系数。

## 时间轴同步（最容易错的一环）

1. **每格 `data-duration` = `audio_meta.json` 里该段的 `duration_s`，直接抄。**
   帧 `data-start` = 前面所有帧时长之和；根 `data-duration` = 总和。
   字幕的 `t` / `d` 也从 `words[]` 的锚点来 —— 手写时间轴必然对不齐。
2. 音轨两种挂法：

   **① 渲染后 ffmpeg 拼（实测走通的那条）** —— 每段 wav 的时长正好等于对应帧的时长，
   所以按帧序 concat 出来的整轨天然对齐，不用算偏移：

   ```bash
   for i in 1 2 3 4 5 6; do echo "file '$PWD/audio/0$i.wav'"; done > /tmp/list.txt
   ffmpeg -y -f concat -safe 0 -i /tmp/list.txt -c:a pcm_s16le /tmp/voice.wav
   ffmpeg -y -i renders/<渲出来的>.mp4 -i /tmp/voice.wav \
     -c:v copy -c:a aac -b:a 192k -shortest renders/<片名>-final.mp4
   ```

   拼完对一下两个时长，差应在一帧以内（实测 28.852 vs 28.867）。

   **② 主合成里挂 `<audio>`** —— 每句一个
   `<audio data-start="累计起点" data-duration="实际时长" src="audio/NN.wav" preload="auto">`。
   预览里能直接听，但一处改动要同时改帧和音轨两组数字。

3. 改任何一句配音 → 重跑 1–2 + 字幕。

## 字幕

```bash
(cd "$PROJECT_DIR" && npx hyperframes captions build \
  --storyboard STORYBOARD.md --audio-meta audio_meta.json \
  --hyperframes . --out caption_groups.json)
```

前提：`.hyperframes/caption-skin.html`（手绘皮肤，三个孔：GROUPS 数组 /
data-duration+data-width+data-height / data-brand-tokens）已就位。产出
`compositions/captions.html`，主合成挂 track 最高的 clip，`data-start="0"`、
`data-duration` = 总时长。

## 1.2x 收尾（变速不变调）

```bash
ffmpeg -y -i renders/video.mp4 -filter:v "setpts=PTS/1.2" -filter:a "atempo=1.2" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k renders/video-1.2x.mp4
```

交付 1.2x，原速留档。验证三件套：

```bash
# ① 声音在：先转 pcm 再测（直接对压缩音轨测会静默失败）
ffmpeg -i renders/video-1.2x.mp4 -vn -acodec pcm_s16le /tmp/x.wav
ffmpeg -i /tmp/x.wav -af volumedetect -f null -   # mean ≈ -24dB、max ≈ -1dB 为正常人声

# ② 画面在动：抽三帧 md5 不同（每条单独执行！同命令多 -ss 只出第一帧）
ffmpeg -ss 1 -i renders/video-1.2x.mp4 -frames:v 1 /tmp/a.jpg
ffmpeg -ss 12 -i renders/video-1.2x.mp4 -frames:v 1 /tmp/b.jpg
ffmpeg -ss 23 -i renders/video-1.2x.mp4 -frames:v 1 /tmp/c.jpg

# ③ 说的对：whisper 抽听开头（小模型会听岔英文，属正常；听的是"是本人声音、内容大意对"）
```

## 无配音模式

- 不建 SCRIPT.md；STORYBOARD 顶部 YAML 写 `music: none`（两个条件同时成立才算静音片）。
- 时长估算：中文 ~4 字/秒；STORYBOARD 手写 `duration:`。
- 字幕可留可去：留的话 captions 用 STORYBOARD 的口播原文出，时间戳按估算铺。
