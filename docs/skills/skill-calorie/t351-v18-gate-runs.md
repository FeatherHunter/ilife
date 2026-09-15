# 票 #157 · 场景05 换装窗（T351-v18）· 门禁运行读数件

**本件是什么**：本窗口（v18 换装窗）**所有运行**的声明与对账源。第 §一 节逐条声明**持锁运行**（`GATE-RUN runId=<标识> cmd=<命令>`）；第 §二 节声明**未持锁的直接调用**（只读的那些：读文件、数标记、导表）；第 §三 节把本次窗口内 `.scratch/locks/gate-runs.log` 的相关条目**逐字导出**——导出件即对账源，两条应逐字对得上。

- 锁协议：`docs/subagent-concurrency-protocol.md` §2；包装器 `tooling/run-locked.mjs`；锁目录 `.scratch/locks/`（锁文件 `gate.lock`、归属记录 `owner.json`、留痕 `gate-runs.log`）。
- 票号 `--ticket 157`；本窗口的 `runId` 一律以 `t157-swap-` 开头。
- **起法**（照票面：「会改动工作区的操作（编译／测试／跑批／变异）一律经 `run-locked.mjs`」）：**编译、跑批、变异、测试、墙换代、契约门**全部持锁跑；**只读的读数**（数标记、导表、看日志、`gen-wall --check` 之外的纯读）直接调用。
- 本窗口的每一步都在 `.scratch/t157-swap/`（脚本 ＋ 日志）；源码只写声明的写集（`packages/skill-calorie/src/render/planEditorPort.ts` 新件、`packages/skill-calorie/src/workout/commands.ts` 一处、跑批件、墙目录、两份证据件）。
- **起点与漂移（如实记）**：本窗开工当刻 `HEAD = 2bb647c`（工作区里有别席在途的 M 件，本票一律未碰）。跑批与全部读数取自**当刻工作区**（本窗 `tsc -b` 之后）。收工前重跑 `tsc -b --force` ＋ `gen:check` 均 exit 0、dist 认口 186 指向编辑器实现。

---

## 一、声明（本窗口**持锁**运行，逐条）

| # | runId | 命令 | exit | 这次跑出来的是什么 |
|---|---|---|---|---|
| 1 | `t157-swap-build` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-build -- pwsh -NoProfile -File .scratch/t157-swap/step-build.ps1` | **0** | **重编＋重签＋重生成＋生成物门**四步一包（脚本内逐条给 exit）：`tsc -b` 0；`gen-cli --stamp` 0（声明源 41 件）；`gen-cli`（＝`pnpm gen` 的等价体）0，**生成物逐件 sha256 与盘上一致**；`gen-cli --check` 0（`键 128（写 46 ＋ 读 82）`）。日志 `logs/tsc-1.log`／`gen-stamp-1.log`／`gen-1.log`／`gen-check-1.log`。`waitedMs=40029`。 |
| 2 | `t157-swap-run` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-run -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-swap/products` | **0** | **票面验收命令 ②**：全量重跑 37 份产物 ＋ 29 条判据 → `RESULT: 66/66（产物 37 ＋ 判据 29）`、`PROBE: PASS（29/29 判据全绿）`。**186 那一格是编辑器**（机检⑱ 绿）。`waitedMs=220179`（等锁 220s）。日志 `logs/batch-products.log`。**同 runId 前两次 exit=1**：第 1 次是脚本自身的 `edBad is not defined`（判据代码笔误）、第 2 次是同一处未修完；两次都不改判据、只修脚本 —— 逐条见 §三 原始导出。 |
| 3 | `t157-swap-wall` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-wall -- pwsh -NoProfile -File .scratch/t157-swap/step-wall.ps1` | **0** | **票面验收命令 ③ 的正例 ＋ 反例 ＋ 改回**（一包）：墙换代 `--stage` 0（复制进仓 37 件 ＋ 双墙 ＋ 索引 ＋ 内建自检）；正例 `--check .` **exit 0**（`37 格；链接 189 条；缺失 0 -> 可发`）；反例（清单第 1 行 `file` 改成盘上不存在的名字）**exit 1** 且点名 `1 看本周计划 -> 看本周计划-反例-盘上没有.html`；逐字节还原后复跑 **exit 0**（清单 sha256 改前改后 `B34406E5…C30BD` **IDENTICAL=true**）；缺陷清单骨架重出 0（两列 0 行被填）。日志 `logs/wall-stage.log`／`wall-check-positive.log`／`wall-check-red.log`／`wall-check-restore.log`／`defect-list.log`。`waitedMs=0`。 |
| 4 | `t157-swap-gate` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-gate -- pwsh -NoProfile -File .scratch/t157-swap/step-gate.ps1` | **0** | **票面验收命令 ①**：`node docs/skills/skill-calorie/t554-plan-editor-gate.mjs --phase=gate` → `RESULT: 18/18`、exit 0。脚本内把 `PE_OUT` 指到 `.scratch/t157-swap/gate`（**只改产物落点，不改判据**，也不覆盖 `.scratch/t554/`）。`waitedMs=20020`。日志 `logs/gate-after.log`。 |
| 5 | `t157-swap-mut` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-mut -- pwsh -NoProfile -File .scratch/t157-swap/step-mut.ps1` | **0** | **票面验收命令 ⑥ 的变异半**：留底（`commands.ts` sha256 `e85c37a9…37b8`）→ 把「186 指向编辑器」那一处改成旧向导（`run: viewPlanEditor,` → `run: viewPlanWizard,` ＋ import 行）→ `tsc -b` **exit 0** → 重跑批 **exit 1**、`RESULT: 63/66`：**机检⑱／过程页 prompt／机检⑩ 三条同时红**，186 那份实测 `ilw-` 回到 119、`pe-tabs` 0、复制数据标题回到 `【calorie · 构建向导】`。日志 `logs/mut-*.log`／`batch-mut.log`。`waitedMs=30038`。 |
| 6 | `t157-swap-restore` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-restore -- pwsh -NoProfile -File .scratch/t157-swap/step-restore.ps1` | **1** | **如实记账的一次未回绿**：源逐字节还原成功（`IDENTICAL=true`），但 Windows `CopyFile` 保留旧时间戳 ⇒ 源比 `dist`「旧」⇒ `tsc -b` 判定最新、**跳过 emit** ⇒ 复跑批照旧 `63/66`、逐件比对点名 `order186-process.html` 不等。**处置见下一行**。日志 `logs/batch-restore.log`（该次）／`cmp-restore.log`。`waitedMs=10006`。 |
| 7 | `t157-swap-restore2` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-restore2 -- pwsh -NoProfile -File .scratch/t157-swap/step-restore2.ps1` | **0** | **票面验收命令 ⑥ 的还原半（返修后）**：还原件 sha256 `e85c37a9…37b8` **IDENTICAL=true**；`tsc -b --force` **0**；dist 认口 `run: viewPlanEditor,` 命中 **1**／`run: viewPlanWizard,` **0**；重签 0 ＋ `gen:check` 0；复跑批 **`RESULT: 66/66` exit 0**；逐件比对基线批 `归一化后sha相等=37/37` **PASS**（只抹页脚生成时间）。`waitedMs=100083`。日志 `logs/restore2-*.log`／`batch-restore.log`／`cmp-restore.log`。 |
| 8 | `t157-swap-regress` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-regress -- pwsh -NoProfile -File .scratch/t157-swap/step-regress.ps1` | **1** | 回归三组一包：**场景05 票面四条 exit 0**（`tests 4／pass 4／fail 0`）；相邻三条 `pass 18／fail 1`（唯一红是 `db-readonly-93` 点名 **`calorie.today`**，他席在途）；登记类四条 `pass 17／fail 7`（全是他席已落盘的现状：`src/cli/readArgs.ts:63` 的两条字面量 ＋ 路由/冻结表漂移）。**脚本 exit 1 ＝ 我把它并成一包后取了「三组全绿才 0」的严格口径**，票面那条命令本身是 exit 0（见 #9）。日志 `logs/regress-*.log`。`waitedMs=1`。 |
| 9 | `t157-swap-regress-scene05` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-regress-scene05 -- node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs` | **0** | **票面验收命令 ⑤ 的逐字命令**（不包脚本、不多不少四条）：`tests 4／pass 4／fail 0／cancelled 0／skipped 0／todo 0`。日志 `logs/regress-scene05-standalone.log`。 |

---

## 二、声明（本窗口**未持锁**的直接调用，逐条：纯只读）

| # | 做了什么 | 命令 | 读数 |
|---|---|---|---|
| 1 | 186 那一格的**改前**标记计数 | `node node_modules/typescript/bin/tsc -b` 之外的纯读：`node .scratch/t157-swap/count-marks.mjs .scratch/t157-swap/baseline-186-wall-before.html` | `ilw-=119`、`pe-tabs/daytabs/day=0/0/0`、`#pe-out-body=0`、`<script>` 1 块、73484 B。留底 `logs/counts-before.txt`（改前那一份页面另留底 `.scratch/t157-swap/baseline-186-wall-before.html`）。 |
| 2 | 186 那一格的**改后**同口径计数 | `node .scratch/t157-swap/count-marks.mjs <墙>/定训练计划-预检.html .scratch/t157-swap/products/order186-process.html` | 两边逐字同：`ilw-=0`、`pe-tabs=4`／`pe-daytabs=4`／`pe-day=17`／`data-act=31`、正文 `#pe-out-body=1`、`<script>` 3 块（含 1 块 `#pe-state`）、93908 B；sha256 `0CB52DBB…66ECC2`。留底 `logs/counts-after.txt`。 |
| 3 | 台账当刻读数（**只读**，不 `--sync`） | `node packages/skill-calorie/scripts/check-warning-line.mjs` | ⓐ 开工当刻 **exit 1**，四条 `台账陈化` 全部点名**他席的件**（`scripts/build-help.mjs`／`src/render/trendMiscPort.ts`／`scripts/gen-photo-baseline.mjs`／`src/diet/receipt.ts`）；**没有一条点名本票的件**（`planEditorPort.ts` 254 LF／`commands.ts` 52 LF，均在线内 350）。ⓑ 收工前复跑：他席已 `--sync`，**exit 0、`RESULT: 85/85`、`PASS: 告警线台账齐全且与实况一致`**。日志 `logs/ledger-check.log`／`logs/ledger-check2.log`。**理由见 `t351-v18-evidence.md` §十 第 2 条**（`--sync` 会写 `AGENTS.md`，不在本票写集）。 |
| 4 | 旧向导引用面（票面要报的那一段） | `grep viewPlanWizard|planWizardDocs|renderPlanWizardHtml`（src／test 两处）＋ `git status` 对写集 | 逐条读数与结论见 `t351-v18-evidence.md` §十 第 1 条。 |
| 5 | 证据件装配 | `node .scratch/t157-swap/gen-evidence.mjs` | 37 行表一 ＋ 29 条判据读数**全部从 `products/detail.json` 读回**（不手抄），写 `docs/skills/skill-calorie/t351-v18-evidence.md`。 |

---

## 三、原始导出（`.scratch/locks/gate-runs.log`，逐字，只取 `ticket=157` 且 `runId` 以 `t157-swap-` 开头的条目，按时间序）

```text
START ticket=157 runId=t157-swap-build cmd="pwsh -NoProfile -File .scratch/t157-swap/step-build.ps1" waitedMs=40029 pid=61956 at=2026-09-15T14:59:33.700Z
RUN ticket=157 runId=t157-swap-build cmd="pwsh -NoProfile -File .scratch/t157-swap/step-build.ps1" waitedMs=40029 exit=0 pid=61956 at=2026-09-15T14:59:37.529Z
START ticket=157 runId=t157-swap-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-swap/products" waitedMs=20004 pid=57580 at=2026-09-15T15:06:22.978Z
RUN ticket=157 runId=t157-swap-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-swap/products" waitedMs=20004 exit=1 pid=57580 at=2026-09-15T15:06:33.019Z
START ticket=157 runId=t157-swap-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-swap/products" waitedMs=60062 pid=57760 at=2026-09-15T15:08:14.090Z
RUN ticket=157 runId=t157-swap-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-swap/products" waitedMs=60062 exit=1 pid=57760 at=2026-09-15T15:08:24.626Z
START ticket=157 runId=t157-swap-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-swap/products" waitedMs=220179 pid=7136 at=2026-09-15T15:22:40.364Z
RUN ticket=157 runId=t157-swap-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-swap/products" waitedMs=220179 exit=0 pid=7136 at=2026-09-15T15:22:51.184Z
START ticket=157 runId=t157-swap-wall cmd="pwsh -NoProfile -File .scratch/t157-swap/step-wall.ps1" waitedMs=0 pid=52420 at=2026-09-15T15:23:16.805Z
RUN ticket=157 runId=t157-swap-wall cmd="pwsh -NoProfile -File .scratch/t157-swap/step-wall.ps1" waitedMs=0 exit=0 pid=52420 at=2026-09-15T15:23:19.832Z
START ticket=157 runId=t157-swap-gate cmd="pwsh -NoProfile -File .scratch/t157-swap/step-gate.ps1" waitedMs=20020 pid=72500 at=2026-09-15T15:24:14.232Z
RUN ticket=157 runId=t157-swap-gate cmd="pwsh -NoProfile -File .scratch/t157-swap/step-gate.ps1" waitedMs=20020 exit=0 pid=72500 at=2026-09-15T15:24:18.111Z
START ticket=157 runId=t157-swap-mut cmd="pwsh -NoProfile -File .scratch/t157-swap/step-mut.ps1" waitedMs=30038 pid=64540 at=2026-09-15T15:25:11.164Z
RUN ticket=157 runId=t157-swap-mut cmd="pwsh -NoProfile -File .scratch/t157-swap/step-mut.ps1" waitedMs=30038 exit=0 pid=64540 at=2026-09-15T15:25:24.571Z
START ticket=157 runId=t157-swap-restore cmd="pwsh -NoProfile -File .scratch/t157-swap/step-restore.ps1" waitedMs=10006 pid=35228 at=2026-09-15T15:25:40.212Z
RUN ticket=157 runId=t157-swap-restore cmd="pwsh -NoProfile -File .scratch/t157-swap/step-restore.ps1" waitedMs=10006 exit=1 pid=35228 at=2026-09-15T15:25:53.177Z
START ticket=157 runId=t157-swap-restore2 cmd="pwsh -NoProfile -File .scratch/t157-swap/step-restore2.ps1" waitedMs=100083 pid=47948 at=2026-09-15T15:27:55.516Z
RUN ticket=157 runId=t157-swap-restore2 cmd="pwsh -NoProfile -File .scratch/t157-swap/step-restore2.ps1" waitedMs=100083 exit=0 pid=47948 at=2026-09-15T15:28:16.431Z
START ticket=157 runId=t157-swap-regress cmd="pwsh -NoProfile -File .scratch/t157-swap/step-regress.ps1" waitedMs=1 pid=49096 at=2026-09-15T15:28:39.927Z
RUN ticket=157 runId=t157-swap-regress cmd="pwsh -NoProfile -File .scratch/t157-swap/step-regress.ps1" waitedMs=1 exit=1 pid=49096 at=2026-09-15T15:28:51.926Z
START ticket=157 runId=t157-swap-regress-scene05 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs" waitedMs=0 pid=44516 at=2026-09-15T15:31:56.724Z
RUN ticket=157 runId=t157-swap-regress-scene05 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs" waitedMs=0 exit=0 pid=44516 at=2026-09-15T15:32:01.170Z
```

> 逐字对上：本文件 §一 #9 声明的 runId／命令／exit 与上面这两行一致；`pid`／`at` 以 `.scratch/locks/gate-runs.log` 当刻原文为准（上面逐字导出）。

---

## 四、本窗**引用**但不由本窗跑的（照抄，免责声明）

1. **编排者的提交**：本窗**不提交、不推送**（票面禁止）；工作区改动留在原地由编排者持锁统一收。
2. **他席的红的**：`db-readonly-93` 的 `calorie.today` 一条、登记类四条的七条，都是**他席已落盘的现状**（逐条点名见 `t351-v18-evidence.md` §九），本窗未碰、也不代修。
3. **v17 的读数**：`docs/skills/skill-calorie/t351-v17-gate-runs.md` 记的是**换装之前**那一轮；两件**并存不删**，各记各的窗口。本件只对本窗的 `t157-swap-` 条目负责。
