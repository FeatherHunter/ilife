# #342 收口 GATE-RUN 对账导出（docs/skills/skill-calorie/t342-收口-gate-runs.md）

> 源：`.scratch/locks/gate-runs.log` 中 `t342-shoukou` 行的逐字导出（落盘备查，第三方可复核）。
> 本票声称的每次运行都有一对一 START/RUN；变异红 `mutred2 exit=1` 为负向证据，不充作门禁。

```
START ticket=342 runId=t342-shoukou-build2 cmd="pnpm build" waitedMs=0 pid=31520 at=2026-09-14T05:53:43.464Z
RUN ticket=342 runId=t342-shoukou-build2 cmd="pnpm build" waitedMs=0 exit=0 pid=31520 at=2026-09-14T05:53:46.746Z
START ticket=342 runId=t342-shoukou-helpbuild cmd="pnpm help:build" waitedMs=0 pid=5808 at=2026-09-14T05:53:46.845Z
RUN ticket=342 runId=t342-shoukou-helpbuild cmd="pnpm help:build" waitedMs=0 exit=0 pid=5808 at=2026-09-14T05:53:47.774Z
START ticket=342 runId=t342-shoukou-gencheck cmd="pnpm gen:check" waitedMs=0 pid=10660 at=2026-09-14T05:53:47.853Z
RUN ticket=342 runId=t342-shoukou-gencheck cmd="pnpm gen:check" waitedMs=0 exit=0 pid=10660 at=2026-09-14T05:53:48.968Z
START ticket=342 runId=t342-shoukou-t342 cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=0 pid=49988 at=2026-09-14T05:53:49.042Z
RUN ticket=342 runId=t342-shoukou-t342 cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=0 exit=0 pid=49988 at=2026-09-14T05:53:55.203Z
START ticket=342 runId=t342-shoukou-mutbuild cmd="pnpm build" waitedMs=260016 pid=48824 at=2026-09-14T05:59:41.689Z
RUN ticket=342 runId=t342-shoukou-mutbuild cmd="pnpm build" waitedMs=260016 exit=0 pid=48824 at=2026-09-14T05:59:44.361Z
START ticket=342 runId=t342-shoukou-mutred cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=0 pid=36196 at=2026-09-14T05:59:44.437Z
RUN ticket=342 runId=t342-shoukou-mutred cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=0 exit=0 pid=36196 at=2026-09-14T05:59:49.681Z
START ticket=342 runId=t342-shoukou-mutgen cmd="pnpm gen" waitedMs=340016 pid=41320 at=2026-09-14T06:05:44.336Z
RUN ticket=342 runId=t342-shoukou-mutgen cmd="pnpm gen" waitedMs=340016 exit=0 pid=41320 at=2026-09-14T06:05:45.381Z
START ticket=342 runId=t342-shoukou-mutbuild2 cmd="pnpm build" waitedMs=0 pid=24160 at=2026-09-14T06:05:45.463Z
RUN ticket=342 runId=t342-shoukou-mutbuild2 cmd="pnpm build" waitedMs=0 exit=0 pid=24160 at=2026-09-14T06:05:48.569Z
START ticket=342 runId=t342-shoukou-mutred2 cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=1 pid=23980 at=2026-09-14T06:05:48.668Z
RUN ticket=342 runId=t342-shoukou-mutred2 cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=1 exit=1 pid=23980 at=2026-09-14T06:05:52.754Z
START ticket=342 runId=t342-shoukou-restore-build cmd="pnpm build" waitedMs=70009 pid=30892 at=2026-09-14T06:07:45.014Z
RUN ticket=342 runId=t342-shoukou-restore-build cmd="pnpm build" waitedMs=70009 exit=0 pid=30892 at=2026-09-14T06:07:47.659Z
START ticket=342 runId=t342-shoukou-restore-gen cmd="pnpm gen" waitedMs=0 pid=47424 at=2026-09-14T06:07:47.741Z
RUN ticket=342 runId=t342-shoukou-restore-gen cmd="pnpm gen" waitedMs=0 exit=0 pid=47424 at=2026-09-14T06:07:48.793Z
START ticket=342 runId=t342-shoukou-restore-build2 cmd="pnpm build" waitedMs=1 pid=47420 at=2026-09-14T06:07:48.874Z
RUN ticket=342 runId=t342-shoukou-restore-build2 cmd="pnpm build" waitedMs=1 exit=0 pid=47420 at=2026-09-14T06:07:51.912Z
START ticket=342 runId=t342-shoukou-restore-green cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=1 pid=45768 at=2026-09-14T06:07:51.991Z
RUN ticket=342 runId=t342-shoukou-restore-green cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" waitedMs=1 exit=0 pid=45768 at=2026-09-14T06:07:57.316Z
START ticket=342 runId=t342-shoukou-final-help cmd="pnpm help:build" waitedMs=30002 pid=5840 at=2026-09-14T06:09:16.104Z
RUN ticket=342 runId=t342-shoukou-final-help cmd="pnpm help:build" waitedMs=30002 exit=0 pid=5840 at=2026-09-14T06:09:17.007Z
START ticket=342 runId=t342-shoukou-final-gencheck cmd="pnpm gen:check" waitedMs=1 pid=46420 at=2026-09-14T06:09:17.088Z
RUN ticket=342 runId=t342-shoukou-final-gencheck cmd="pnpm gen:check" waitedMs=1 exit=0 pid=46420 at=2026-09-14T06:09:18.118Z
```
