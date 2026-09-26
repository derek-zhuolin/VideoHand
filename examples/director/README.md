# 按表达关系组织的示例

这些示例使用演示文案；没有本人原始口播。源码、导演记录和运行命令可以复现画面，但不构成真人音画同步验收。

| 表达关系 | 源计划 / 导演记录 | 重点 |
| --- | --- | --- |
| 有限容量 → 任务迁移 → 本地释放 | [计划](capacity-handoff.json) / [导演记录](capacity-handoff.md) | 同一批任务跨场景保持身份，不复制出新任务冒充交接。横竖独立构图。 |
| 委托重复工作 → 保留关键判断 | [计划](team-handoff.json) / [导演记录](team-handoff.md) | 复用交接，换成团队与伙伴的托盘；关键判断仍在人这一侧。 |
| 同内容旧版起点 | [旧 starter 计划](capacity-starter.json) | 与容量迁移案例的标题、28 秒时长、字幕文字和字幕时间一致，保留旧 starter 原有表现方式。 |

从仓库根目录运行，输出到尚不存在的相邻目录：

```bash
node bin/videohand.mjs compose --plan examples/director/capacity-handoff.json --out ../capacity-film
node bin/videohand.mjs compose --plan examples/director/team-handoff.json --out ../team-film
node bin/videohand.mjs create --config examples/director/capacity-starter.json --out ../capacity-before
```

进入具体画幅目录后运行 `hyperframes preview`、`hyperframes check --snapshots --json`、`hyperframes render -w 1 -o renders/film.mp4`。容量案例生成 `landscape` 与 `portrait`，其余两个仅生成 `landscape`。

[旧 starter 视频](../../docs/assets/director/capacity-starter.mp4)与[新连续场景视频](../../docs/assets/director/capacity-landscape.mp4)的内容保持一致。前者用图标节点交代顺序；后者让观众追踪具体任务的归属与容器状态。不是通过更换文案或修改旧引擎制造差异，也不是用户实验或效果评分。

各导演记录解释了为什么当前无声研究采用纯 B-roll。真实口播接入后，应重新判断 A-roll、辅助图形、B-roll + PiP 与 B-roll 独占，不能照抄样例中的布局覆盖。

实际编辑和扩展方法见 [局部编辑与扩展](../../references/director-editing.md)。
