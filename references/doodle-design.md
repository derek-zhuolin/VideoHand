# Doodle 视觉基准与图标

## 必须保留的上游 Reference

- **Oreo Design / Doodle Icons GitHub**：https://github.com/oreo-design/doodle-icons
- **整体设计（Overall Design）与交互示范**：https://oreoui.com/doodle-icons
- **官方 Agent 设计规范**：https://github.com/oreo-design/doodle-icons/blob/main/skills/doodle-icons/SKILL.md
- [官方设计规范本地快照](upstream/oreo-doodle-design.md)，抓取于 2026-09-17；它是视觉参考。其网页安装方式、自动触发描述和无限动画写法不覆盖本 Skill 的显式调用、离线视频和有限时间轴约束。
- 包固定为 `@oreo-design/doodle-icons@0.1.0`，152 个静态 SVG 在 `assets/doodle/icons/`；[原包 metadata](../assets/doodle/upstream-package.json) 与 [MIT 许可](../assets/doodle/LICENSE) 随包保存。GitHub main 可能领先 npm，不将其误写成已安装版本。

## 从整体语言落到视频

纸面、墨色、字体、控件轮廓、图标、动效必须像同一只手画出来。图标不是装饰贴纸；用它表达主角、动作、对象和关系。

| 部分 | 默认 | 视频适配 |
|---|---|---|
| 背景 / 主线 | 暖纸 #F7F6F2 / 墨 #2B2A33 | 不叠旧版固定点阵，不自动换回深绿 |
| 原始图标 | 48×48 viewBox，stroke-width 3.4，圆端点 | 保留 path；通过外层尺寸缩放，不额外 rough 化 |
| 大标题 | Schoolbell；中文用 Xiaolai | 与图标共享轻微 boil；标题大而短 |
| 正文 | 稳定易读字体 | 本包 VideoHand Sans；不抖动、不描边闪烁 |
| 口播字幕 | Xiaolai 40px 起 | 默认关键词衬底；每句最多一个浅杏色 `#ECB775` 笔触，未标记文字保持墨色 |
| 强调 | 每场 1–2 色 | 装饰橙 #E87536，橙字 #B9511D；可按内容换色 |
| 控件 / 纸张容器 | 手绘但保持稳定 | 点击区域和字幕不能随 boil 位移；使用合成视频标签时也保持可读 |
| Ink boil | 上游 6 离散帧噪声 | GSAP 离散 seed、7Hz、默认 amplitude 1.3；不是上游默认 amplitude 4 的逐值复刻 |

叙事可用绿色表示完成状态，明确这是 VideoHand 的语义适配；上游网页的选中/填充控件保持墨色。关键词衬底是浅杏色笔触，不把整句变成色块；无需要时不加闪烁、重阴影或渐变。

## 字幕关键词与偶发框线

字幕配置可为每句提供 `key`：

```json
{"start": 2, "end": 3.6, "text": "再画出下一步", "key": "下一步"}
```

模板会把 `key` 包成 `<mark>`，由同一条有限时间轴控制出现和消失。缺少 `key` 时保持素净，不猜测关键词。框线同样由场景时间轴显式控制；一段视频通常只选少数关系镜头使用，避免每幕都有外框。

## 挑选与使用图标

`node "<skill>/bin/videohand.mjs" icons` 列出实际名称，追加一个关键词筛选。不要猜 `settings`，实际名称是 `gear`。原路径无修改；图标缺失抛错，避免静默空白。

```js
const D = VideoHand.create(root, tl, { duration: 20, id: 'scene-ink' });
node.append(D.icon('bulb', { size: 180 }));
heading.style.filter = D.filter;
D.enter(node, 1.2);
D.draw('#hero path', 1.2, .45, .03);
```

每个 composition 使用唯一 filter id；同一文档存在多个 root 时不要复用。draw 只做首次出现，后续承接保留对象。`exit` 在淡出后将 visibility 设为 hidden。库不接管时间轴播放。

## 字体与升级

字体全部本地化，许可见 THIRD-PARTY-NOTICES。官方参考对 Schoolbell 的许可有二手描述；本包以 Google Fonts 实际附带的 Apache 2.0 文本为准。常用中文字集缺字时构建器会报错；换字体后同步 coverage.json 与 integrity.json，重新检查横竖屏。

更新图标必须显式固定版本、保留许可证、更新数量/完整性清单，并复验路径和渲染。不得在每次生成时自动拉 latest。
