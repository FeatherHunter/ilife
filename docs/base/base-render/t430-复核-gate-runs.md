# #430 复核运行条目导出（对账源）

来源：`.scratch/locks/gate-runs.log`。下文逐行抄录，行号为抄录时刻值，供复核对账。

## 被复核回执声称的两条（复核已在日志中找到一对一对应，均为 `exit=0`）

```
START ticket=430 runId=fc501603-2f1c-46d5-8414-44e96ff0e49f cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=1 pid=36080 at=2026-09-16T10:46:43.418Z
RUN ticket=430 runId=fc501603-2f1c-46d5-8414-44e96ff0e49f cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=1 exit=0 pid=36080 at=2026-09-16T10:46:43.530Z
START ticket=430 runId=939a730a-9ba5-48a8-aaa9-b0096ff06e3e cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=0 pid=6284 at=2026-09-16T10:46:45.894Z
RUN ticket=430 runId=939a730a-9ba5-48a8-aaa9-b0096ff06e3e cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=0 exit=0 pid=6284 at=2026-09-16T10:46:46.061Z
```

## 复核独立复跑的三条（本次新标识，均为 `exit=0`）

```
START ticket=430 runId=7a6277d5-3aca-4f3d-a953-ca8acab1c5cc cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 pid=56832 at=2026-09-16T10:48:21.720Z
RUN ticket=430 runId=7a6277d5-3aca-4f3d-a953-ca8acab1c5cc cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 exit=0 pid=56832 at=2026-09-16T10:48:21.821Z
START ticket=430 runId=d5278cca-3f89-4809-aff9-eac73fb3d41f cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=0 pid=52716 at=2026-09-16T10:48:24.552Z
RUN ticket=430 runId=d5278cca-3f89-4809-aff9-eac73fb3d41f cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=0 exit=0 pid=52716 at=2026-09-16T10:48:24.737Z
START ticket=430 runId=c7cbe4fb-0f48-4935-89dd-4a546d0080ed cmd="node --test packages/base-render/test/charts.test.mjs packages/base-render/test/controls.test.mjs packages/base-render/test/style.test.mjs packages/base-render/test/contract-signatures.test.mjs" waitedMs=0 pid=40616 at=2026-09-16T10:49:04.700Z
RUN ticket=430 runId=c7cbe4fb-0f48-4935-89dd-4a546d0080ed cmd="node --test packages/base-render/test/charts.test.mjs packages/base-render/test/controls.test.mjs packages/base-render/test/style.test.mjs packages/base-render/test/contract-signatures.test.mjs" waitedMs=0 exit=0 pid=40616 at=2026-09-16T10:49:06.188Z
```

摘要行：`tsc` 复跑 `exit=0`；`blocks` 复跑 `tests 50／pass 50／fail 0 exit=0`；宽门探针 `tests 232／pass 232／fail 0 exit=0`。
