# t161 持锁运行条目（协议 §2.3 证据件）

**来源**：`.scratch/locks/gate-runs.log` —— 该日志由 `tooling/run-locked.mjs` 追加写，每持锁命令记一对 `START`／`RUN` 行（`RUN` 行带 `exit` 与结束时刻）。**本文件是对账源，可独立复核**：任何人可对该日志重跑同一过滤，逐字比对下列原文。

**导出时刻**：2026-09-14T18:07:44+08:00（China Standard Time）。
**过滤条件**：`ticket=161`（日志共 4892 行，命中 6 行，即原文件第 4886-4891 行）。
**复核命令**：`Select-String -Path .scratch/locks/gate-runs.log -Pattern 'ticket=161' -Encoding utf8`（或 `rg 'ticket=161' .scratch/locks/gate-runs.log`）。

**快照边界（如实记）**：该日志为**追加写**，本快照即上述导出时刻的状态；本轮整改自身的 `git add／commit／push` 会在导出**之后**追加新条目，故不在本快照内。需完整时间线时按上面的复核命令重取。

## 原文（6 行，逐字照录，未改一字）

```
START ticket=161 runId=1d5c8183-3ff2-4c40-982f-bdae7e5e4245 cmd="git add docs/skills/skill-calorie/t161-老技能HTML清单.md docs/skills/skill-calorie/t161-老技能HTML清单-预测与缺口.md docs/skills/skill-calorie/t161-老技能HTML清单-报告族.md" waitedMs=0 pid=12400 at=2026-09-14T10:00:22.139Z
RUN ticket=161 runId=1d5c8183-3ff2-4c40-982f-bdae7e5e4245 cmd="git add docs/skills/skill-calorie/t161-老技能HTML清单.md docs/skills/skill-calorie/t161-老技能HTML清单-预测与缺口.md docs/skills/skill-calorie/t161-老技能HTML清单-报告族.md" waitedMs=0 exit=0 pid=12400 at=2026-09-14T10:00:22.189Z
START ticket=161 runId=e1bb75d4-f53b-4fd0-a173-be9f29c59f86 cmd="git commit -F .scratch/t161/commit-msg.txt -- docs/skills/skill-calorie/t161-老技能HTML清单.md docs/skills/skill-calorie/t161-老技能HTML清单-预测与缺口.md docs/skills/skill-calorie/t161-老技能HTML清单-报告族.md" waitedMs=0 pid=36232 at=2026-09-14T10:00:28.819Z
RUN ticket=161 runId=e1bb75d4-f53b-4fd0-a173-be9f29c59f86 cmd="git commit -F .scratch/t161/commit-msg.txt -- docs/skills/skill-calorie/t161-老技能HTML清单.md docs/skills/skill-calorie/t161-老技能HTML清单-预测与缺口.md docs/skills/skill-calorie/t161-老技能HTML清单-报告族.md" waitedMs=0 exit=0 pid=36232 at=2026-09-14T10:00:28.896Z
START ticket=161 runId=7f20ef7a-d0f9-4777-ac4f-0bbb47bc7579 cmd="git push" waitedMs=0 pid=44216 at=2026-09-14T10:00:37.016Z
RUN ticket=161 runId=7f20ef7a-d0f9-4777-ac4f-0bbb47bc7579 cmd="git push" waitedMs=0 exit=0 pid=44216 at=2026-09-14T10:00:39.638Z
```

## 读数摘要

| 序号 | runId | 命令 | START | RUN 结束 | exit |
| --- | --- | --- | --- | --- | --- |
| 1 | `1d5c8183` | `git add`（3 路径） | 10:00:22.139Z | 10:00:22.189Z | 0 |
| 2 | `e1bb75d4` | `git commit -F …`（3 路径） | 10:00:28.819Z | 10:00:28.896Z | 0 |
| 3 | `7f20ef7a` | `git push` | 10:00:37.016Z | 10:00:39.638Z | 0 |

三对 START／RUN 均成对出现、`exit=0`、`waitedMs=0`（未等待，锁即刻可得）；无 ticket=161 的失败或超时条目。
