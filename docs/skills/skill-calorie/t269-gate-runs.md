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

## 追加：运行时终验与漏改修补这一段（2026-09-14T06:17:45.272Z）

> 导出时刻见本行上方时间戳；源 `.scratch/locks/gate-runs.log`。`START` 行略去，只列 `RUN` 行（一对一）。
> 逐条声明与判据见 `t269-final-verify.md` 第七节。

| 运行标识 | 命令 | 退出码 | 证据作用 |
|---|---|---|---|
| t269f-build | `cmd /c .scratch\\t269-final\\g1-build.cmd` | 0 | 门禁：`pnpm build`（tsc -b ＋ 生成命令表 ＋ 客户端构建） |
| t269f-targeted-before | `cmd /c .scratch\\t269-final\\g2-targeted.cmd` | 1 | 诊断：修补前靶向三件（5 红，本票 4 ＋ 他席 #239 1） |
| t269f-probe-shapes | `cmd /c .scratch\\t269-final\\g3-probe.cmd` | 0 | 探针：选断言锚点（产物形状与可见文案） |
| t269f-verify-first | `cmd /c .scratch\\t269-final\\g4-verify.cmd` | 1 | 诊断：前后比对第一跑（时刻归一缺口，`others_changed=1` 假红） |
| t269f-probe-exercise | `cmd /c .scratch\\t269-final\\g5-exercise.cmd` | 0 | 探针：定位上述假红（时刻单列一格） |
| t269f-ex2 | `cmd /c .scratch\\t269-final\\g6-ex2.cmd` | 0 | 探针：假红原件与逐字节对照（`fc /b` 一处 1 字节） |
| t269f-verify-2 | `cmd /c .scratch\\t269-final\\g4-verify.cmd` | 0 | 门禁：前后逐条比对（`others_same=33/33`，`RESULT: PASS`） |
| t269f-cli13 | `cmd /c .scratch\\t269-final\\g7-cli13.cmd` | 0 | 门禁：13 条写命令逐条实跑真出口（`RUN13 ok=13/13 doc=13/13`） |
| t269f-full-before | `cmd /c .scratch\\t269-final\\g8-full-before.cmd` | 1 | 诊断：全量测试自测基线（tests 1608／fail 28） |
| t269f-targeted-after | `cmd /c .scratch\\t269-final\\g9-targeted-after.cmd` | 1 | 诊断：修补后靶向三件（只剩他席 #239 一红） |
| t269f-window | `cmd /c .scratch\\t269-final\\g10-window.cmd` | 20 | 诊断：变异自检判据写错的第一轮（未跑全量，exit=20） |
| t269f-window2 | `cmd /c .scratch\\t269-final\\g10-window.cmd` | 1 | 诊断：变异电池 exit=0 ＋ 全量测试（tests 1616／fail 28） |
| t269f-windowA | `cmd /c .scratch\\t269-final\\g11-windowA.cmd` | 0 | 门禁：变异电池 ＋ 入仓脚本复跑 ＋ 13 条实跑 ＋ gen:check（窗口内三步骤皆 exit=0） |
| t269f-windowB1 | `cmd /c .scratch\\t269-final\\g12-windowB1.cmd` | 0 | （未登记作用） |

原文逐行（`RUN`）：

```text
RUN ticket=269 runId=t269f-build cmd="cmd /c .scratch\\t269-final\\g1-build.cmd" waitedMs=0 exit=0 pid=17020 at=2026-09-14T05:43:48.906Z
RUN ticket=269 runId=t269f-targeted-before cmd="cmd /c .scratch\\t269-final\\g2-targeted.cmd" waitedMs=0 exit=1 pid=43556 at=2026-09-14T05:44:16.496Z
RUN ticket=269 runId=t269f-probe-shapes cmd="cmd /c .scratch\\t269-final\\g3-probe.cmd" waitedMs=10002 exit=0 pid=26520 at=2026-09-14T05:45:08.947Z
RUN ticket=269 runId=t269f-verify-first cmd="cmd /c .scratch\\t269-final\\g4-verify.cmd" waitedMs=10001 exit=1 pid=44536 at=2026-09-14T05:46:52.269Z
RUN ticket=269 runId=t269f-probe-exercise cmd="cmd /c .scratch\\t269-final\\g5-exercise.cmd" waitedMs=0 exit=0 pid=45712 at=2026-09-14T05:47:07.631Z
RUN ticket=269 runId=t269f-ex2 cmd="cmd /c .scratch\\t269-final\\g6-ex2.cmd" waitedMs=1 exit=0 pid=27924 at=2026-09-14T05:47:46.816Z
RUN ticket=269 runId=t269f-verify-2 cmd="cmd /c .scratch\\t269-final\\g4-verify.cmd" waitedMs=1 exit=0 pid=43048 at=2026-09-14T05:48:13.775Z
RUN ticket=269 runId=t269f-cli13 cmd="cmd /c .scratch\\t269-final\\g7-cli13.cmd" waitedMs=0 exit=0 pid=50340 at=2026-09-14T05:48:48.050Z
RUN ticket=269 runId=t269f-full-before cmd="cmd /c .scratch\\t269-final\\g8-full-before.cmd" waitedMs=160032 exit=1 pid=6568 at=2026-09-14T05:53:35.209Z
RUN ticket=269 runId=t269f-targeted-after cmd="cmd /c .scratch\\t269-final\\g9-targeted-after.cmd" waitedMs=50003 exit=1 pid=4048 at=2026-09-14T06:05:41.663Z
RUN ticket=269 runId=t269f-window cmd="cmd /c .scratch\\t269-final\\g10-window.cmd" waitedMs=10002 exit=20 pid=52832 at=2026-09-14T06:07:43.903Z
RUN ticket=269 runId=t269f-window2 cmd="cmd /c .scratch\\t269-final\\g10-window.cmd" waitedMs=60006 exit=1 pid=41332 at=2026-09-14T06:11:34.618Z
RUN ticket=269 runId=t269f-windowA cmd="cmd /c .scratch\\t269-final\\g11-windowA.cmd" waitedMs=40009 exit=0 pid=48988 at=2026-09-14T06:14:29.619Z
RUN ticket=269 runId=t269f-windowB1 cmd="cmd /c .scratch\\t269-final\\g12-windowB1.cmd" waitedMs=50008 exit=0 pid=26824 at=2026-09-14T06:17:03.773Z
```

## 追加：运行时终验与漏改修补这一段（2026-09-14T06:18:49.420Z）

> 导出时刻见本行上方时间戳；源 `.scratch/locks/gate-runs.log`。`START` 行略去，只列 `RUN` 行（一对一）。
> 逐条声明与判据见 `t269-final-verify.md` 第七节。

| 运行标识 | 命令 | 退出码 | 证据作用 |
|---|---|---|---|
| t269f-commit | `cmd /c .scratch\\t269-final\\g13-commit.cmd` | 0 | 门禁：`git add` 点名 14 件 → 复核暂存集 → `git commit -F … -- <14 件>` → 回读提交范围 → `git push` |

原文逐行（`RUN`）：

```text
RUN ticket=269 runId=t269f-commit cmd="cmd /c .scratch\\t269-final\\g13-commit.cmd" waitedMs=10001 exit=0 pid=11784 at=2026-09-14T06:18:29.268Z
```
