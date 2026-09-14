# #342 收口-review GATE-RUN 导出（docs/skills/skill-calorie/t342-收口-review-导出.md）

> 源：`.scratch/locks/gate-runs.log` 中本审查 `t342-review-*` 行的逐字导出（备查，可复核）。
> 注意：日志中另有 05:12–05:17 的 uuid-runId 旧轮 `t342-review` 行（`t342-review-probe.mjs`/`t342-review-runs.md`），属前轮审查，不在本导出内，
> 本导出仅收本轮 `t342-review-build…probe4` 共 14 对 START/RUN（28 行），一一配对，无孤儿。
> 另：`t342-review-probe`/`probe2`/`routing81`/`106`/`106b` exit=1 均为审查探针或别域脏树的只读运行，非门禁项（门禁项 §2 全绿）。

```
START ticket=342 runId=t342-review-build cmd="pnpm build" waitedMs=1 pid=18364 at=2026-09-14T06:19:30.308Z
RUN ticket=342 runId=t342-review-build cmd="pnpm build" waitedMs=1 exit=0 pid=18364 at=2026-09-14T06:19:33.025Z
START ticket=342 runId=t342-review-t342 cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=0 pid=18152 at=2026-09-14T06:19:40.587Z
RUN ticket=342 runId=t342-review-t342 cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=0 exit=0 pid=18152 at=2026-09-14T06:19:46.166Z
START ticket=342 runId=t342-review-gen cmd="pnpm gen" waitedMs=10001 pid=25316 at=2026-09-14T06:20:00.062Z
RUN ticket=342 runId=t342-review-gen cmd="pnpm gen" waitedMs=10001 exit=0 pid=25316 at=2026-09-14T06:20:01.116Z
START ticket=342 runId=t342-review-build2 cmd="pnpm build" waitedMs=0 pid=11532 at=2026-09-14T06:20:05.356Z
RUN ticket=342 runId=t342-review-build2 cmd="pnpm build" waitedMs=0 exit=0 pid=11532 at=2026-09-14T06:20:08.156Z
START ticket=342 runId=t342-review-help cmd="pnpm help:build" waitedMs=0 pid=35092 at=2026-09-14T06:20:11.073Z
RUN ticket=342 runId=t342-review-help cmd="pnpm help:build" waitedMs=0 exit=0 pid=35092 at=2026-09-14T06:20:11.984Z
START ticket=342 runId=t342-review-gencheck cmd="pnpm gen:check" waitedMs=40002 pid=45116 at=2026-09-14T06:20:54.760Z
RUN ticket=342 runId=t342-review-gencheck cmd="pnpm gen:check" waitedMs=40002 exit=0 pid=45116 at=2026-09-14T06:20:55.812Z
START ticket=342 runId=t342-review-probe cmd="node .scratch/t342-收口-review/probe-150-151.mjs" waitedMs=0 pid=42852 at=2026-09-14T06:21:29.808Z
RUN ticket=342 runId=t342-review-probe cmd="node .scratch/t342-收口-review/probe-150-151.mjs" waitedMs=0 exit=1 pid=42852 at=2026-09-14T06:21:29.890Z
START ticket=342 runId=t342-review-probe2 cmd="node .scratch/t342-收口-review/probe-150-151.mjs" waitedMs=0 pid=41972 at=2026-09-14T06:21:37.902Z
RUN ticket=342 runId=t342-review-probe2 cmd="node .scratch/t342-收口-review/probe-150-151.mjs" waitedMs=1 pid=41972 at=2026-09-14T06:21:42.156Z
START ticket=342 runId=t342-review-probe3 cmd="node .scratch/t342-收口-review/probe-150-151.mjs" waitedMs=1 pid=34988 at=2026-09-14T06:21:51.640Z
RUN ticket=342 runId=t342-review-probe3 cmd="node .scratch/t342-收口-review/probe-150-151.mjs" waitedMs=1 exit=0 pid=34988 at=2026-09-14T06:21:55.705Z
START ticket=342 runId=t342-review-routing81 cmd="node packages/skill-calorie/test/calorie-routing-81.test.mjs" waitedMs=0 pid=50984 at=2026-09-14T06:22:03.324Z
RUN ticket=342 runId=t342-review-routing81 cmd="node packages/skill-calorie/test/calorie-routing-81.test.mjs" waitedMs=0 exit=1 pid=50984 at=2026-09-14T06:22:03.418Z
START ticket=342 runId=t342-review-265 cmd="node packages/skill-calorie/test/exercise-routes-265.test.mjs" waitedMs=0 pid=50148 at=2026-09-14T06:22:21.917Z
RUN ticket=342 runId=t342-review-265 cmd="node packages/skill-calorie/test/exercise-routes-265.test.mjs" waitedMs=0 exit=0 pid=50148 at=2026-09-14T06:22:24.463Z
START ticket=342 runId=t342-review-106 cmd="node packages/skill-calorie/test/help-center-106.test.mjs" waitedMs=0 pid=48676 at=2026-09-14T06:22:29.984Z
RUN ticket=342 runId=t342-review-106 cmd="node packages/skill-calorie/test/help-center-106.test.mjs" waitedMs=0 exit=1 pid=48676 at=2026-09-14T06:22:30.153Z
START ticket=342 runId=t342-review-106b cmd="node packages/skill-calorie/test/help-center-106.test.mjs" waitedMs=20005 pid=18012 at=2026-09-14T06:22:53.804Z
RUN ticket=342 runId=t342-review-106b cmd="node packages/skill-calorie/test/help-center-106.test.mjs" waitedMs=20005 exit=1 pid=18012 at=2026-09-14T06:22:53.993Z
START ticket=342 runId=t342-review-probe4 cmd="node docs/skills/skill-calorie/t342-收口-review-探针.mjs" waitedMs=1 pid=37348 at=2026-09-14T06:24:35.851Z
RUN ticket=342 runId=t342-review-probe4 cmd="node docs/skills/skill-calorie/t342-收口-review-探针.mjs" waitedMs=1 exit=0 pid=37348 at=2026-09-14T06:24:39.924Z
```

## exit=1 行说明（均非本票门禁失败）

- `probe` exit=1：探针 Windows ESM 路径 bug（已修，probe3/probe4 绿）。
- `probe2` exit=1：探针 TS 转义比对 bug（已修，probe3/probe4 绿）。
- `routing81` exit=1：文件名误写（`calorie-routing-81.test.mjs` 不存在，MODULE_NOT_FOUND）；对应守卫实为 `exercise-routes-265`，已绿。
- `106`/`106b` exit=1：别域脏树（首 mismatch 在 `diet_scan_label` diet/help 层），与本票无关；路由层 exec 桶与 118 键正常。
