# t269 · 门禁运行对账导出件（`.scratch/locks/gate-runs.log` 对应行抄录）

> 协议 §2.3 第 4 条：运行记录在未受版本控制的锁目录下，收尾时导出到受版本控制的归属件路径。
> 导出时刻 `2026-09-14T04:20Z`；源 `gate-runs.log:3350-3513`。`START` 行略去，只列 `RUN` 行（一对一）。

| 运行标识 | 命令 | 退出码 | 证据作用 |
|---|---|---|---|
| t269-build-after | `pnpm --filter skill-calorie build` | 1 | 非门禁：挡住现场（#276 中间态 `TS2820`） |
| t269-build-green | `pnpm --filter skill-calorie build` | 1 | 非门禁：挡住现场（第三方 weight 19 处 `TS2459/TS2304`，本票两件零错误） |
| t269-verify-after | `node .scratch/t269/verify.mjs --out .scratch/t269/after.json` | 1 | 中间轮（`profile` 种子缺失致 5 FAIL），被 after2 取代 |
| t269-verify-after2 | `node .scratch/t269/verify.mjs --out .scratch/t269/after2.json` | 1 | 门禁快照：`RESULT: 42/45 DIET_FULL=13/13 FAIL=3`（3 FAIL 皆第三方运动域半成品 `out is not defined`） |
| t269-mut-red | `npx tsc --noEmit -p packages/skill-calorie` | 2 | 变异红：本票文件 1 处 `TS2552`（`dietReceiptDocBROKEN`） |
| t269-mut-green | `npx tsc --noEmit -p packages/skill-calorie` | 0 | 变异绿：本票两件零错误，`write.ts` sha256 还原一致 |
| t269-commit-1 | `git add`（5 件）＋`git diff --cached --name-only` | 0 | 留痕：暂存区含本票 5 件（另有他席 3 件在途，未纳入提交） |
| t269-commit-2 | `git commit -F … -- <5 件>` | 1 | 非门禁：索引被他席活动重置后未重 `add` 即提交（已用 commit-3/4 纠正） |
| t269-commit-3 | `git add <5 件>` | 0 | 留痕：重暂存 |
| t269-commit-4 | `git commit -F … -- <5 件>` | 0 | 门禁提交：`1f88525`（5 件精确，`--stat` 见证据） |

原文逐行（`RUN`）：

```text
RUN ticket=269 runId=t269-build-after cmd="pnpm --filter skill-calorie build" waitedMs=0 exit=1 pid=37692 at=2026-09-14T04:03:13.666Z
RUN ticket=269 runId=t269-build-green cmd="pnpm --filter skill-calorie build" waitedMs=0 exit=1 pid=20820 at=2026-09-14T04:05:31.830Z
RUN ticket=269 runId=t269-verify-after cmd="node .scratch/t269/verify.mjs --out .scratch/t269/after.json" waitedMs=0 exit=1 pid=40948 at=2026-09-14T04:06:19.726Z
RUN ticket=269 runId=t269-verify-after2 cmd="node .scratch/t269/verify.mjs --out .scratch/t269/after2.json" waitedMs=0 exit=1 pid=38104 at=2026-09-14T04:06:40.059Z
RUN ticket=269 runId=t269-mut-red cmd="npx tsc --noEmit -p packages/skill-calorie" waitedMs=0 exit=2 pid=45496 at=2026-09-14T04:08:05.764Z
RUN ticket=269 runId=t269-mut-green cmd="npx tsc --noEmit -p packages/skill-calorie" waitedMs=40009 exit=0 pid=32604 at=2026-09-14T04:09:16.413Z
RUN ticket=269 runId=t269-commit-1 cmd="pwsh -NoProfile -Command \"git add …; git diff --cached --name-only\"" waitedMs=390053 exit=0 pid=43432 at=2026-09-14T04:16:13.315Z
RUN ticket=269 runId=t269-commit-2 cmd="git commit -F .scratch/t269/commit-msg-1.txt -- <5 件>" waitedMs=30002 exit=1 pid=32480 at=2026-09-14T04:16:57.933Z
RUN ticket=269 runId=t269-commit-3 cmd="git add <5 件>" waitedMs=1 exit=0 pid=47124 at=2026-09-14T04:17:32.070Z
RUN ticket=269 runId=t269-commit-4 cmd="git commit -F .scratch/t269/commit-msg-1.txt -- <5 件>" waitedMs=0 exit=0 pid=32220 at=2026-09-14T04:17:45.606Z
```
