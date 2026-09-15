# 票 #157 · 场景05 收口窗（T351-v19）· 门禁运行读数件

**本件是什么**：本窗口（v19 收口窗）**所有运行**的声明与对账源。第 §一 节逐条声明**持锁运行**（`GATE-RUN runId=<标识> cmd=<命令>`）；第 §二 节声明**未持锁的直接调用**（只读的那些：读文件、数标记、导表）；第 §三 节把本次窗口内 `.scratch/locks/gate-runs.log` 的相关条目**逐字导出**——导出件即对账源，两条应逐字对得上。

- 锁协议：`docs/subagent-concurrency-protocol.md` §2；包装器 `tooling/run-locked.mjs`；锁目录 `.scratch/locks/`（锁文件 `gate.lock`、归属记录 `owner.json`、留痕 `gate-runs.log`）。
- 票号 `--ticket 157`；本窗口的 `runId` 一律以 `t157-final-` 开头。
- **起法**（照票面：「编译／测试／跑批／变异一律经 `run-locked.mjs`」）：**重编＋重生成、跑批、墙换代、契约门、回归测试、变异与还原**全部持锁跑；**只读的读数**（数标记、导表、看日志、台账检查）直接调用。
- 本窗口的每一步都在 `.scratch/t157-final/`（脚本 ＋ 日志）；源码只写声明的写集（`test/skill-t11.test.mjs`、`src/workout/index.ts` 注释、`src/workout/commands.ts` 标题一处、`SKILL.md:33`、`scene-inventory.md:81-90`、生成物经 `gen-cli.mjs` 重出、墙目录、两份证据件）。
- **起点与漂移（如实记）**：本窗开工当刻 `HEAD = 393e45a`（工作区里有别席在途的 M 件——`scene01-验收墙/**` 8 件、`t351-v7-run-176-207.mjs` 等他席改动，本票一律未碰）。跑批与全部读数取自**当刻工作区**（本窗 `tsc -b` ＋ `gen-cli.mjs` 重出生成物之后）。

---

## 一、声明（本窗口**持锁**运行，逐条）

| # | runId | 命令 | exit | 这次跑出来的是什么 |
|---|---|---|---|---|
| 1 | `t157-final-build` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-final-build -- pwsh -NoProfile -File .scratch/t157-final/step-build.ps1` | **0** | **重编 ＋ 重签 ＋ 重生成 ＋ 生成物门**四步一包（脚本内逐条给 exit）：`tsc -b` 0；`gen-cli --stamp` 0；`gen-cli`（＝`pnpm gen` 的等价体）0 —— 重出 `src/cli/keys.ts`（`:144` 标题 `构建向导`→`定训练计划`）与 `packages/base-combos/combos.yaml`（`:565` 同值）；`gen-cli --check` 0（`GEN-CHECK PASS：键 128（写 46 ＋ 读 82）`）。**逐件 sha256**：`keys.ts c2e30bb886dd22e137bbd7d61aa108439193f7cee45884ac221c1d2334c53c80`／`registry.ts 5c81bfbdaa1ea587a6b6a6fbf2d3a83aff1e76b93f6dc3a24291ce17b517b47b`／`combos.yaml 99cba1b915b3af0bf1651eb650e77fb42ba59e4efaee4dc84b920d181a016aa9`／`build-help.mjs e16d18c666cf50719173070632009d3261b867859224090b7a9a38940eb1de8a`／`routes.generated.ts 71364217a8b4d8d67698f331c482b49bfd06465c33280b64f77dc3d82cb5e5e6`。日志 `logs/tsc-1.log`／`gen-stamp-1.log`／`gen-1.log`／`gen-check-1.log`。`waitedMs=80065`（等票 543 的锁）。 |
| 2 | `t157-final-run` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-final-run -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-final/products` | **0** | **票面验收命令 ③**：全量重跑 37 份产物 ＋ 29 条判据 → `RESULT: 66/66（产物 37 ＋ 判据 29）`、`PROBE: PASS（29/29 判据全绿）`。**186 那一格仍是编辑器**（机检⑱ 绿）。`waitedMs=20010`。日志 `logs-batch.log`。 |
| 3 | `t157-final-wall` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-final-wall -- pwsh -NoProfile -File .scratch/t157-final/step-wall.ps1` | **0** | **改名 ＋ 票面验收命令 ④ 的正例／反例／改回 ＋ 缺陷清单**（一包）：① 旧发布名副本 `定训练计划-预检.html` 留底 sha256 `0CB52DBB…66ECC2`（98433 B）后**删除**；② `--stage` 0（复制进仓 37 件 ＋ 双墙 ＋ 索引 ＋ 内建自检；新副本 `定训练计划-编辑器.html` sha256 `B92E5859…84AFD4`、98447 B，与原批 `order186-process.html` 逐字节同一份）；③ 正例 `--check .` **exit 0**（`37 格；链接 189 条；缺失 0 -> 可发`）；④ 反例（第 1 行 `file` 改成盘上不存在的名字）**exit 1** 且点名 `1 看本周计划 -> 看本周计划-反例-盘上没有.html`；⑤ 逐字节还原后复跑 **exit 0**（清单 sha256 改前改后 `4B26952D…F93BB` **IDENTICAL=true**）；⑥ 缺陷清单骨架重出 0（两列 0 行被填）。日志 `logs/wall-stage.log`／`wall-check-positive.log`／`wall-check-red.log`／`wall-check-restore.log`／`defect-list.log`。`waitedMs=0`。 |
| 4 | `t157-final-gate` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-final-gate -- pwsh -NoProfile -File .scratch/t157-final/step-gate.ps1` | **0** | **票面验收命令 ⑥**：`node docs/skills/skill-calorie/t554-plan-editor-gate.mjs --phase=gate` → `RESULT: 18/18`、exit 0。脚本内把 `PE_OUT` 指到 `.scratch/t157-final/gate`（**只改产物落点，不改判据**，也不覆盖 `.scratch/t554/`）。`waitedMs=0`。日志 `logs/gate.log`。 |
| 5 | `t157-final-t11` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-final-t11 -- node --test packages/skill-calorie/test/skill-t11.test.mjs` | **0** | **票面验收命令 ①**：`tests 9／pass 9／fail 0／cancelled 0／skipped 0／todo 0`。日志 `.scratch/t157-final/logs-t11.log`。 |
| 6 | `t157-final-scene05` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-final-scene05 -- node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs` | **0** | **票面验收命令 ②**（不包脚本、不多不少四条）：`tests 4／pass 4／fail 0／cancelled 0／skipped 0／todo 0`。`waitedMs=10011`。日志 `.scratch/t157-final/logs-scene05.log`。 |
| 7 | `t157-final-mut-skill` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-final-mut-skill -- pwsh -NoProfile -File .scratch/t157-final/step-mut-skill.ps1` | **0** | **票面验收命令 ⑦ 的变异半**（脚本 exit 0 ＝「变异确已见红 ＋ 还原确已逐字节回写」两条都成立）：留底 sha256 `ff9f2bfd…92104c` → 第 63 行那一格改回旧口径（`**当前不可写**：95 键无训练计划写键（见下）`）→ 变异件 sha256 `a305c191…29cbdec` → 跑 t11 **exit 1**、`tests 9／pass 8／fail 1`（红点逐字 `M6 正文缺：**可写**：出计划编辑器（可写页）→ …AI 调 \`calorie.workout.plan-set\` 落库`）→ 逐字节还原 `IDENTICAL=true`。日志 `logs/t11-mutant.log`。 |
| 8 | `t157-final-restore-skill` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-final-restore-skill -- pwsh -NoProfile -File .scratch/t157-final/step-restore-skill.ps1` | **0** | **票面验收命令 ⑦ 的还原半**：盘上 `SKILL.md` 与备份 sha256 逐字一致（`FF9F2BFD…104C`）→ 复跑 t11 **exit 0**、`tests 9／pass 9／fail 0`。日志 `logs/t11-restored.log`。 |

> **⑦ 的两行读数**（票面要的那两行）：**变异 `exit=1`（fail 1，红点是新锚点）／还原 `exit=0`（pass 9）**。

### 1.1 逐条机读行（票面口径：`GATE-RUN runId=… cmd=…`，与 §三 的原始导出一一对账）

```text
GATE-RUN runId=t157-final-build cmd="pwsh -NoProfile -File .scratch/t157-final/step-build.ps1" exit=0
GATE-RUN runId=t157-final-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-final/products" exit=0
GATE-RUN runId=t157-final-wall cmd="pwsh -NoProfile -File .scratch/t157-final/step-wall.ps1" exit=0
GATE-RUN runId=t157-final-gate cmd="pwsh -NoProfile -File .scratch/t157-final/step-gate.ps1" exit=0
GATE-RUN runId=t157-final-t11 cmd="node --test packages/skill-calorie/test/skill-t11.test.mjs" exit=0
GATE-RUN runId=t157-final-scene05 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs" exit=0
GATE-RUN runId=t157-final-mut-skill cmd="pwsh -NoProfile -File .scratch/t157-final/step-mut-skill.ps1" exit=0
GATE-RUN runId=t157-final-restore-skill cmd="pwsh -NoProfile -File .scratch/t157-final/step-restore-skill.ps1" exit=0
```

---

## 二、声明（本窗口**未持锁**的直接调用，逐条：纯只读 或 只写本窗草稿/证据件）

| # | 做了什么 | 命令 | 读数 |
|---|---|---|---|
| 1 | 186 那一格的三份对照计数（v18 批／本窗批／墙里新副本） | `node .scratch/t157-final/count-marks.mjs .scratch/t157-swap/products/order186-process.html .scratch/t157-final/products/order186-process.html docs/skills/skill-calorie/scene05-验收墙/定训练计划-编辑器.html` | 三份逐个相同：`ilw-=0`、`pe-tabs=4`／`pe-daytabs=4`／`pe-day=17`／`data-act=31`、正文 `#pe-out-body=1`、`<script>` 3 块（含 1 块 `#pe-state` JSON）；整页字符数 93908／93918／93918。 |
| 2 | 台账当刻读数（**只读**，不 `--sync`） | `node packages/skill-calorie/scripts/check-warning-line.mjs` | **exit 0、`RESULT: 87/87`、`PASS: 告警线台账齐全且与实况一致`**（台账 42 行；扫描面 327 件，超线 38 件，剔出生成物 3 件；挂号台账命中 2/2）。本窗没有新增件、没把任何件撑过 350、没改在册件的当场值 ⇒ **不触发陈化**，`AGENTS.md` 未动。 |
| 3 | 外部五条三处命中探针（**只读**） | `node .scratch/t157-final/probe-non-exec.mjs` | 路由表 5/5、场景词表（真 `TRIGGERS` 数组，非文本 grep）5/5、HELP 资产 5/5；`reason` 首句「明确不做（架构规格」＋「词只保证命中与文案，执行层不承接」逐字在 5/5 → `probe non-exec PASS`。 |
| 4 | 清单 JSON 合法性与改名落地（**只读**） | `node -e "JSON.parse(…manifest.json…)"` | `JSON ok rows=37 notShipped=3`；`row11 file=定训练计划-编辑器.html`。 |
| 5 | 缺陷清单骨架两列核对（**只读**） | `node -e`（数表行 ＋ 判两列是否恒为 `—（待填）`） | `rows=37`、**两列非空行数 0**、第 11 行唤醒词＝`定训练计划`。 |
| 6 | 工作区归属核对（**只读**） | `git status --porcelain`／`git diff`（只看，**不做任何 git 写操作**） | 本票改动面＝`test/skill-t11.test.mjs`／`src/workout/index.ts`／`src/workout/commands.ts`／`SKILL.md`／`scene-inventory.md`／`src/cli/keys.ts`／`packages/base-combos/combos.yaml`／`scene05-验收墙/**`／两份 v19 证据件；他席在途的件（`scene01-验收墙/**` 8 件、`t351-v7-run-176-207.mjs` 等）**一件未碰**。 |
| 7 | 证据件装配 | `node .scratch/t157-final/gen-evidence.mjs` | 37 行表一 ＋ 29 条判据读数**全部从 `products/detail.json` 读回**（不手抄），写 `docs/skills/skill-calorie/t351-v19-evidence.md`。 |
| 8 | **收工前**在**最终盘面**上复跑一遍自检与台账（**只读**） | `cd docs/skills/skill-calorie/scene05-验收墙 && node gen-wall.mjs --check .`；`node packages/skill-calorie/scripts/check-warning-line.mjs`；`Get-FileHash … SKILL.md` | 墙：`37 格；链接 189 条；缺失 0 -> 可发` · **exit 0**；台账：`RESULT: 87/87` ＋ `PASS` · **exit 0**；`SKILL.md` sha256 `FF9F2BFD1CB4D4AE3745DD94377419BA5A4EF1C3A55AA9FFD0479B2EFF92104C`（＝变异前备份，542 LF）——**还原半的独立性由这条独立读数再钉一道**。 |

---

## 三、原始导出（`.scratch/locks/gate-runs.log`，逐字，只取 `ticket=157` 且 `runId` 以 `t157-final-` 开头的条目，按时间序）

```text
START ticket=157 runId=t157-final-build cmd="pwsh -NoProfile -File .scratch/t157-final/step-build.ps1" waitedMs=80065 pid=31772 at=2026-09-15T16:08:26.404Z
RUN ticket=157 runId=t157-final-build cmd="pwsh -NoProfile -File .scratch/t157-final/step-build.ps1" waitedMs=80065 exit=0 pid=31772 at=2026-09-15T16:08:29.161Z
START ticket=157 runId=t157-final-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-final/products" waitedMs=20010 pid=29088 at=2026-09-15T16:09:05.253Z
RUN ticket=157 runId=t157-final-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-final/products" waitedMs=20010 exit=0 pid=29088 at=2026-09-15T16:09:15.877Z
START ticket=157 runId=t157-final-wall cmd="pwsh -NoProfile -File .scratch/t157-final/step-wall.ps1" waitedMs=0 pid=43288 at=2026-09-15T16:10:21.093Z
RUN ticket=157 runId=t157-final-wall cmd="pwsh -NoProfile -File .scratch/t157-final/step-wall.ps1" waitedMs=0 exit=0 pid=43288 at=2026-09-15T16:10:25.074Z
START ticket=157 runId=t157-final-gate cmd="pwsh -NoProfile -File .scratch/t157-final/step-gate.ps1" waitedMs=0 pid=69156 at=2026-09-15T16:11:23.673Z
RUN ticket=157 runId=t157-final-gate cmd="pwsh -NoProfile -File .scratch/t157-final/step-gate.ps1" waitedMs=0 exit=0 pid=69156 at=2026-09-15T16:11:28.110Z
START ticket=157 runId=t157-final-t11 cmd="node --test packages/skill-calorie/test/skill-t11.test.mjs" waitedMs=0 pid=13528 at=2026-09-15T16:11:48.583Z
RUN ticket=157 runId=t157-final-t11 cmd="node --test packages/skill-calorie/test/skill-t11.test.mjs" waitedMs=0 exit=0 pid=13528 at=2026-09-15T16:11:48.934Z
START ticket=157 runId=t157-final-scene05 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs" waitedMs=10011 pid=57496 at=2026-09-15T16:11:58.627Z
RUN ticket=157 runId=t157-final-scene05 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs" waitedMs=10011 exit=0 pid=57496 at=2026-09-15T16:12:02.785Z
START ticket=157 runId=t157-final-mut-skill cmd="pwsh -NoProfile -File .scratch/t157-final/step-mut-skill.ps1" waitedMs=1 pid=30944 at=2026-09-15T16:12:14.980Z
RUN ticket=157 runId=t157-final-mut-skill cmd="pwsh -NoProfile -File .scratch/t157-final/step-mut-skill.ps1" waitedMs=1 exit=0 pid=30944 at=2026-09-15T16:12:17.984Z
START ticket=157 runId=t157-final-restore-skill cmd="pwsh -NoProfile -File .scratch/t157-final/step-restore-skill.ps1" waitedMs=0 pid=49588 at=2026-09-15T16:12:22.154Z
RUN ticket=157 runId=t157-final-restore-skill cmd="pwsh -NoProfile -File .scratch/t157-final/step-restore-skill.ps1" waitedMs=0 pid=49588 at=2026-09-15T16:12:24.874Z
```

> 逐字对上：本文件 §一 逐条的 runId／命令／exit 与上面这些行一致；§一 #1／#3／#4／#7／#8 是**一包脚本**，包装器只记脚本自己的 exit（0），脚本内每一步的 exit 在 §一 那一列逐条写明；`pid`／`at` 以 `.scratch/locks/gate-runs.log` 当刻原文为准。

---

## 四、本窗**引用**但不由本窗跑的（照抄，免责声明）

1. **编排者的提交**：本窗**不提交、不推送**（票面禁止）；工作区改动留在原地由编排者持锁统一收。
2. **他席在途的 M 件**：本窗开工当刻工作区里就有别席的未提交改动（`scene01-验收墙/**` 8 件、`t351-v7-run-176-207.mjs` 等），本窗一件未碰、也不代收。
3. **v18 的读数**：`docs/skills/skill-calorie/t351-v18-gate-runs.md` 记的是**换装窗**那一轮；两件**并存不删**，各记各的窗口。本件只对本窗的 `t157-final-` 条目负责。
