# gate-runs 导出（受 git 跟踪的对账源，协议 §2.4）

> 来源日志：`D:\ilife\.scratch\locks\gate-runs.log`（gitignored，不可单独作为第三方复核依据）
> 票号过滤：694｜since：（无）｜until：（无）｜条目数：16｜导出时间：2026-09-18T13:21:11.721Z
> 复核用法：`node tooling/check-gate-audit.mjs --evidence <证据文件> --log <本文件> --ticket <票号> --since <同上> --until <同上>`

```text
RUN ticket=694 runId=930e35c8-dd49-4c2c-b5c8-a066d64b1942 cmd="node node_modules/typescript/bin/tsc -b packages/base-link-core" waitedMs=10005 exit=0 pid=36868 at=2026-09-18T13:03:49.398Z
RUN ticket=694 runId=45539c02-a8ce-4799-93a3-40bce284aad0 cmd="node --test test/config-694.test.mjs" waitedMs=1 exit=1 pid=6448 at=2026-09-18T13:04:55.554Z
RUN ticket=694 runId=7c45104d-2db5-48a4-9fdf-a417cb6cb594 cmd="node --test test/config-694.test.mjs" waitedMs=0 exit=0 pid=30948 at=2026-09-18T13:05:11.644Z
RUN ticket=694 runId=5e62caf5-a1e7-4ba8-93e2-d92aa0793b5d cmd="node node_modules/typescript/bin/tsc -b packages/base-link-core" waitedMs=0 exit=0 pid=32368 at=2026-09-18T13:06:04.535Z
RUN ticket=694 runId=3bcd6da4-62e8-4d01-b970-cf2af491d9ef cmd="node --test test/config-694.test.mjs" waitedMs=0 exit=1 pid=36264 at=2026-09-18T13:06:08.928Z
RUN ticket=694 runId=95b47e7f-9421-4bff-9bea-a8a0298edcef cmd="node node_modules/typescript/bin/tsc -b packages/base-link-core" waitedMs=0 exit=0 pid=41832 at=2026-09-18T13:06:16.495Z
RUN ticket=694 runId=245a666f-e6a2-4c6b-ac28-c8bb39773cd9 cmd="node --test test/config-694.test.mjs" waitedMs=1 exit=1 pid=11104 at=2026-09-18T13:06:25.353Z
RUN ticket=694 runId=10662d01-8cc3-4c62-951e-1411caabf981 cmd="node node_modules/typescript/bin/tsc -b packages/base-link-core --force" waitedMs=0 exit=0 pid=20524 at=2026-09-18T13:07:11.387Z
RUN ticket=694 runId=0156994f-b7e1-46ed-83c8-37af01097bc9 cmd="node --test test/config-694.test.mjs" waitedMs=0 exit=0 pid=40052 at=2026-09-18T13:07:41.626Z
RUN ticket=694 runId=0d8f5093-a3e6-436d-8508-0914a328c03e cmd="node node_modules/typescript/bin/tsc -b packages/base-link-core" waitedMs=0 exit=0 pid=26524 at=2026-09-18T13:07:48.906Z
RUN ticket=694 runId=15078803-c187-4002-8c21-487e1084ca2e cmd="pnpm test" waitedMs=0 exit=1 pid=37176 at=2026-09-18T13:10:33.858Z
RUN ticket=694 runId=30326be4-8abe-4a4a-a4fe-94d739f3573b cmd="pnpm gen:check" waitedMs=0 exit=0 pid=23724 at=2026-09-18T13:19:56.673Z
RUN ticket=694 runId=f6b25aa0-9e55-418d-af90-146b7c8f8ba0 cmd="pnpm doctor" waitedMs=0 exit=0 pid=27628 at=2026-09-18T13:19:57.296Z
RUN ticket=694 runId=220715e1-76a3-4fe8-98fd-10ac8b27a1e5 cmd="node tooling/check-boundaries.mjs" waitedMs=0 exit=0 pid=9696 at=2026-09-18T13:19:57.472Z
RUN ticket=694 runId=33d77c21-3441-4d12-aa32-e689fe93291a cmd="node docs/base/base-link-core/t694-读数.mjs" waitedMs=0 exit=0 pid=34556 at=2026-09-18T13:20:03.222Z
RUN ticket=694 runId=d6cb77fd-229b-4a41-9d45-13d9e44f4a0e cmd="node tooling/check-gate-audit.mjs --evidence docs/base/base-link-core/t694-证据.md --ticket 694" waitedMs=0 exit=0 pid=12180 at=2026-09-18T13:20:56.555Z
```
