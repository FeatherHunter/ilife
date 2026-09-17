# #555 复核运行条目导出（对账源）

来源：`.scratch/locks/gate-runs.log`。下文按复核抄录时刻行号逐行抄录（`START／RUN` 成对，`ticket=555`，`cmd` 逐字），供复核对账。复核新增持锁操作后需重新导出。

## 被复核回执声称的五条（复核已在日志中找到一对一对应）

```text
20165 START ticket=555 runId=0bc04183-1268-49f7-84c4-bec5f992737e cmd="pwsh -File .scratch/t555/do-green.ps1" waitedMs=1 pid=47912 at=2026-09-16T10:46:04.340Z
20166 RUN ticket=555 runId=0bc04183-1268-49f7-84c4-bec5f992737e cmd="pwsh -File .scratch/t555/do-green.ps1" waitedMs=1 exit=0 pid=47912 at=2026-09-16T10:46:07.657Z
20179 START ticket=555 runId=260908d7-c334-4ef0-b5ef-bddaac7f41f7 cmd="pwsh -File .scratch/t555/do-mutate.ps1" waitedMs=0 pid=12276 at=2026-09-16T10:46:26.727Z
20180 RUN ticket=555 runId=260908d7-c334-4ef0-b5ef-bddaac7f41f7 cmd="pwsh -File .scratch/t555/do-mutate.ps1" waitedMs=0 exit=1 pid=12276 at=2026-09-16T10:46:30.441Z
20201 START ticket=555 runId=93949a96-d59c-4dfb-a8d9-67622b25cc2b cmd="pwsh -File .scratch/t555/do-rebuild.ps1" waitedMs=10000 pid=44380 at=2026-09-16T10:47:02.348Z
20202 RUN ticket=555 runId=93949a96-d59c-4dfb-a8d9-67622b25cc2b cmd="pwsh -File .scratch/t555/do-rebuild.ps1" waitedMs=10000 exit=0 pid=44380 at=2026-09-16T10:47:05.391Z
20211 START ticket=555 runId=7c7f5e29-8582-4ea1-a98f-367546777433 cmd="pwsh -File .scratch/t555/do-mutate2.ps1" waitedMs=0 pid=72952 at=2026-09-16T10:47:17.443Z
20212 RUN ticket=555 runId=7c7f5e29-8582-4ea1-a98f-367546777433 cmd="pwsh -File .scratch/t555/do-mutate2.ps1" waitedMs=0 exit=0 pid=72952 at=2026-09-16T10:47:23.126Z
20217 START ticket=555 runId=421d2a50-06e1-4e06-bffe-1b28ab843fc0 cmd="pwsh -File .scratch/t555/do-diff.ps1" waitedMs=0 pid=47820 at=2026-09-16T10:47:55.808Z
20218 RUN ticket=555 runId=421d2a50-06e1-4e06-bffe-1b28ab843fc0 cmd="pwsh -File .scratch/t555/do-diff.ps1" waitedMs=0 exit=0 pid=47820 at=2026-09-16T10:47:58.772Z
```

说明：`260908d7` 为第一次变异（绿段假红，已作废，由 `7c7f5e29` 取代）；`93949a96` 等锁 10 秒，持锁者为 `ticket=441`（活锁未抢回，符合协议）。

## 复核独立复跑的六条（本次新标识，均为 `exit=0`）

```text
20283 START ticket=555 runId=7a0583d4-72d8-41b9-8499-da33a7f1c7fb cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 pid=52188 at=2026-09-16T10:51:38.724Z
20284 RUN ticket=555 runId=7a0583d4-72d8-41b9-8499-da33a7f1c7fb cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 exit=0 pid=52188 at=2026-09-16T10:51:38.835Z
20291 START ticket=555 runId=7911e48b-8fef-4415-a7d2-707ebef4532b cmd="node packages/base-render/test/text.test.mjs" waitedMs=0 pid=52900 at=2026-09-16T10:51:47.637Z
20292 RUN ticket=555 runId=7911e48b-8fef-4415-a7d2-707ebef4532b cmd="node packages/base-render/test/text.test.mjs" waitedMs=0 exit=0 pid=52900 at=2026-09-16T10:51:47.766Z
20295 START ticket=555 runId=e80e0c49-3b30-4c30-8616-da9e38b90b90 cmd="node node_modules/typescript/bin/tsc -b packages/base-render --force" waitedMs=0 pid=61760 at=2026-09-16T10:51:50.260Z
20296 RUN ticket=555 runId=e80e0c49-3b30-4c30-8616-da9e38b90b90 cmd="node node_modules/typescript/bin/tsc -b packages/base-render --force" waitedMs=0 exit=0 pid=61760 at=2026-09-16T10:51:51.487Z
20297 START ticket=555 runId=b0b57bd8-677f-4c29-959d-305b79f56f5b cmd="node packages/base-render/test/text.test.mjs" waitedMs=0 pid=38460 at=2026-09-16T10:51:53.225Z
20298 RUN ticket=555 runId=b0b57bd8-677f-4c29-959d-305b79f56f5b cmd="node packages/base-render/test/text.test.mjs" waitedMs=0 exit=0 pid=38460 at=2026-09-16T10:51:53.334Z
20299 START ticket=555 runId=898d6f9d-e664-4bb0-9725-f3b4a03ed67d cmd="node .scratch/t555r/probe-edge.mjs" waitedMs=0 pid=38380 at=2026-09-16T10:51:54.815Z
20300 RUN ticket=555 runId=898d6f9d-e664-4bb0-9725-f3b4a03ed67d cmd="node .scratch/t555r/probe-edge.mjs" waitedMs=0 exit=0 pid=38380 at=2026-09-16T10:51:54.897Z
20305 START ticket=555 runId=987b7e5e-f184-4839-a995-7e39ef210147 cmd="node .scratch/t555/do-diff.mjs" waitedMs=0 pid=20300 at=2026-09-16T10:52:00.894Z
20306 RUN ticket=555 runId=987b7e5e-f184-4839-a995-7e39ef210147 cmd="node .scratch/t555/do-diff.mjs" waitedMs=0 exit=0 pid=20300 at=2026-09-16T10:52:00.977Z
```

摘要行：`tsc` 复跑 `exit=0`；`text.test.mjs` 复跑 `tests 84／pass 84／fail 0 exit=0`（`--force` 前后各一次）；原 `do-diff.mjs` 重跑 `total=15 onlySceneChanged=15 exit=0`；新探针 `pass=25 fail=0 exit=0`。

## 复核取票面用的两条（只读，不作绿判据）

```text
20309 START ticket=555 runId=0e70c736-bac7-47e5-b418-672690cb61ff cmd="gh issue view 555 --comments" waitedMs=0 pid=43176 at=2026-09-16T10:52:26.954Z
20310 RUN ticket=555 runId=0e70c736-bac7-47e5-b418-672690cb61ff cmd="gh issue view 555 --comments" waitedMs=0 exit=0 pid=43176 at=2026-09-16T10:52:28.417Z
20311 START ticket=555 runId=6cb2736d-d29c-4f0d-b8d9-fcaacaeae464 cmd="gh issue view 555" waitedMs=0 pid=47356 at=2026-09-16T10:52:31.581Z
20312 RUN ticket=555 runId=6cb2736d-d29c-4f0d-b8d9-fcaacaeae464 cmd="gh issue view 555" waitedMs=0 exit=0 pid=47356 at=2026-09-16T10:52:33.011Z
```
