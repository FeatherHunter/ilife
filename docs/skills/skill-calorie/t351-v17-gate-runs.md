# 票 #157 · 场景05 收口窗 · 门禁运行读数件（`t351-v17` 窗口）

**本件是什么**：本窗口**所有运行**的声明与对账源。第 §一 节逐条声明**持锁运行**（`GATE-RUN runId=<标识> cmd=<命令>`），第 §二 节声明**未持锁的直接调用**（本窗唯一写者，§五 纪律：改工作区的步骤直接调用、不再包一层加锁包装器），第 §三 节把本次窗口内 `.scratch/locks/gate-runs.log` 的相关条目**逐字导出**——导出件即对账源，两条应逐字对得上。

- 锁协议：`docs/subagent-concurrency-protocol.md` §2；包装器 `tooling/run-locked.mjs`；锁目录 `.scratch/locks/`（锁文件 `gate.lock`、归属记录 `owner.json`、留痕 `gate-runs.log`）。
- 票号 `--ticket 157`；本窗口的 `runId` 一律以 `t157-close-` 开头。
- **起法两条**（照派单 §二.3 与 §五）：**跑批与测试**走 `run-locked.mjs`（`--ticket 157 --run-id …`）；其余改工作区的步（台账 `--sync`／`tsc -b`／`gen-cli --stamp`・`--check`／墙 `--stage`／变异夹具）**直接调用**——本窗是唯一写者，包一层会与别人的窗口互相等锁（本窗实测：等锁 70s 与 80s 各一次已够）。
- 本窗口读数取自 `HEAD = c1f0977884c5301dbcebd841b3321e3ce3bdfa0b` 时的**工作区**（编排者持锁提交 `24fb121`（435）／`a05feda`（554）／`ecb665d`（550）／`d1af159`（351-v16）之后）。**写回执当刻 HEAD 已漂到 `e3cc0fcf123a2ebbcd1335a7da89d963fee39209`**（别席在继续提交），本窗未跟到那一次上；场景05 用到的九件源码最后一改 21:01:26、早于本窗跑批 21:19:38。
- 本件只导出 `ticket=157` 且 `runId` 以 `t157-close-` 开头的条目；**同窗口其它会话（253-R／543／548-R／554 等）的条目不在件**。

---

## 一、声明（本窗口**持锁**运行，逐条）

| # | runId | 命令 | exit | 这次跑出来的是什么 |
|---|---|---|---|---|
| 1 | `t157-close-run` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-close-run -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/products` | **0** | **全量重跑**：37 份产物 ＋ 29 条判据 → `RESULT: 66/66（产物 37 ＋ 判据 29）`、`PROBE: PASS（29/29 判据全绿）`。`waitedMs=70085`（等锁 70s）。日志 `.scratch/t157-close/logs/batch-176-207.log`。 |
| 2 | `t157-close-mut-run` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-close-mut-run -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/mut` | **0** | **变异批**（`sceneEnvelope.ts` 剥离步改回不剥离后重跑）：`RESULT: 66/66`、`PROBE: PASS`——**跑批件自身 29 条判据照样全绿**（双前缀的盲区）；双前缀由外挂机检量出 **27/27**。日志 `.scratch/t157-close/logs/batch-mut.log`。 |
| 3 | `t157-close-restore-run` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-close-restore-run -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/products-restore` | **0** | **逐字节还原后复跑**：`RESULT: 66/66`；双前缀回 **0/0**；与基线批逐件 sha256（只抹页脚生成时间）**37/37 全等**。`waitedMs=80067`。日志 `.scratch/t157-close/logs/batch-restore.log`。 |
| 4 | `t157-close-regress` | `node tooling/run-locked.mjs --ticket 157 --run-id t157-close-regress -- node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs` | **0** | **场景05 回归四条**：`tests 4 / pass 4 / fail 0 / cancelled 0 / skipped 0 / todo 0`。`waitedMs=1`。日志 `.scratch/t157-close/logs/regress-scene05.log`。 |

---

## 二、声明（本窗口**未持锁**的直接调用，逐条：只读或只改本窗自己声明的路径）

| # | runId | 命令 | exit | 这次跑出来的是什么 |
|---|---|---|---|---|
| 1 | `t157-ledger-sync-dry` | `node packages/skill-calorie/scripts/check-warning-line.mjs --sync --dry` | **1** | 演练：`SYNC-PLAN mode=dry 行=40 改=6 增=0 删=0`；**未落盘**（脚本口径：计划非空即非 0 退出，末行明说「未落盘」）。日志 `logs/ledger-sync-dry.log`。 |
| 2 | `t157-ledger-sync-1` | `node packages/skill-calorie/scripts/check-warning-line.mjs --sync` | **0** | 台账落盘：`改=6 增=0 删=0`、`SYNC-VERIFY ok`、`RESULT: 85/85`；sha `0ADE77F8…3ED8AD8`。日志 `logs/ledger-sync-write.log`。 |
| 3 | `t157-ledger-resync-2` | 同上（被外部回写后按既定步骤幂等重跑） | **0** | `改=5 增=0 删=0`、`SYNC-VERIFY ok`、`RESULT: 85/85`；sha `2AB5AE87…B22BCC62`。日志 `logs/ledger-resync-2.log`。 |
| 4 | `t157-ledger-sync-final` | 同上（**本窗最后一次**，照编排者流程修正） | **0** | `改=5 增=0 删=0`、`SYNC-VERIFY ok`、`RESULT: 85/85`；sha `E464E391…1800AE9`。日志 `logs/ledger-sync-final.log`。 |
| 5 | `t157-tsc` | `node node_modules/typescript/bin/tsc -b`（先 `-b --dry` 认口） | **0** | 各引用工程最新、根工程（`noEmit`）过一遍；实跑无输出。日志 `logs/tsc-dry.log`／`logs/tsc-build.log`。 |
| 6 | `t157-gen-stamp` | `node packages/skill-calorie/scripts/gen-cli.mjs --stamp` | **0** | `GEN-STAMP ok packages\skill-calorie\dist\.gen-inputs.json：声明源 41 件`。日志 `logs/gen-stamp.log`。 |
| 7 | `t157-gen-check` | `node packages/skill-calorie/scripts/gen-cli.mjs --check` | **0** | `GEN-CHECK ok` 四件 ＋ `GEN-CHECK PASS：键 127（写 46 ＋ 读 81）；能力 10 个…未搬迁清单 0 条`。日志 `logs/gen-check.log`。 |
| 8 | `t157-wall-stage` | `node gen-wall.mjs --stage D:\ilife\.scratch\t157-close\products .`（cwd＝墙目录） | **0** | 换代：`复制进仓：37 件` ＋ 双墙＋索引重出 ＋ 内建自检 `37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发`。日志 `logs/wall-stage.log`。 |
| 9 | `t157-wall-check` | `node gen-wall.mjs --check .`（cwd＝墙目录） | **0** | **票面验收命令 ① 的正例读数**。日志 `logs/wall-check-positive.log`。 |
| 10 | `t157-wall-check-red` | `node …\mutate-manifest.mjs backup …\manifest.bak.json && … break manifest.json 1 && node gen-wall.mjs --check .` | **1** | **票面验收命令 ② 的反例**：`36 格；…；缺失 1 -> 不可发` ＋ 点名 `清单点名却没有文件：1 看本周计划 -> 看本周计划-反例-盘上没有.html`。日志 `logs/wall-check-counter.log`。 |
| 11 | `t157-wall-check-restore` | `node …\mutate-manifest.mjs restore …\manifest.bak.json && node gen-wall.mjs --check .` | **0** | **反例改回**：回 `37 格；链接 189 条；缺失 0 -> 可发`；清单 sha256 改前改后逐字一致 `086E6975…0371E78`。日志 `logs/wall-check-restore.log`。 |
| 12 | `t157-defect-list` | `node .scratch/t157-close/gen-defect-list.mjs docs/skills/skill-calorie/scene05-验收墙` | **0** | `逐格缺陷清单.md` 重出为骨架：`rows=37 notShipped=3`；改前旧骨架留底 `logs/../逐格缺陷清单.改前骨架.bak.md`。 |
| 13 | `t157-mut-baseline` | `node .scratch/t157-close/tree-hash.mjs packages/skill-calorie/src` ＋ `mutate-scene-envelope.mjs backup` | **0** | 源码树 `files=314 digest=25E6BFE6…45B778`；`sceneEnvelope.ts` sha256 `A4C66F49…1830F863`。日志 `logs/src-tree-BASELINE.txt`。 |
| 14 | `t157-mut-break` | `node .scratch/t157-close/mutate-scene-envelope.mjs break packages/skill-calorie/src/shared/sceneEnvelope.ts` | **0** | 剥离那一步改回不剥离（`return { ...envelope, key: key.slice(prefix.length) };` → `return envelope;`）；变异件 sha256 `FFA63AB2…8129D8E`。 |
| 15 | `t157-tsc-mut` | `node node_modules/typescript/bin/tsc -b` | **0** | 变异已进 dist（`dist/shared/sceneEnvelope.js` 三处 `return envelope;`）。日志 `logs/tsc-mutated.log`。 |
| 16 | `t157-mut-restore` | `node .scratch/t157-close/mutate-scene-envelope.mjs restore … .scratch/t157-close/baseline-sceneEnvelope.ts` | **0** | `RESTORE sha256 备份=A4C66F49…1830F863 盘上=A4C66F49…1830F863 IDENTICAL=true`（逐字节回写）。 |
| 17 | `t157-tsc-restored` | `node node_modules/typescript/bin/tsc -b` | **0** | 还原已进 dist。日志 `logs/tsc-restored.log`。 |
| 18 | `t157-mut-verify` | `t550-check-copy-log-scene.mjs`（三个批次）＋ `cmp-products.mjs`（两对）＋ `tree-hash.mjs`（两处） | 双前缀机检 **三次全 0**；`cmp` 变异对 **1**（红）／还原对 **0**（绿）；`tree-hash` **0** | 变异批 `27/27` 命中（`cmp` exit 1＝归一化后 27 份不等）／还原批 `0/0`（`cmp` exit 0＝归一化后 37/37 全等）／源码树还原后 ≡ 基线。日志 `logs/check-copy-log-scene-*.log`／`cmp-base-vs-*.log`／`src-tree-RESTORED.txt`／`products-*.txt`。 |
| 19 | `t157-evidence-gen` | `node .scratch/t157-close/gen-evidence.mjs` | **0** | 出 `t351-v17-evidence.md`（表一 37 行／表二 5 条／撤销后读 1 条／判据 29 条）。 |

> 第 18 行是把四次只读比对并成一条声明；四次的实际命令与读数分别见 `t351-v17-evidence.md` §六、§七。

---

## 三、原始导出（`D:\ilife\.scratch\locks\gate-runs.log`，逐字，按时间序）

```text
START ticket=157 runId=t157-close-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/products" waitedMs=70085 pid=32756 at=2026-09-15T13:19:16.497Z
RUN ticket=157 runId=t157-close-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/products" waitedMs=70085 exit=0 pid=32756 at=2026-09-15T13:19:38.301Z
START ticket=157 runId=t157-close-mut-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/mut" waitedMs=0 pid=47280 at=2026-09-15T13:24:44.139Z
RUN ticket=157 runId=t157-close-mut-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/mut" waitedMs=0 exit=0 pid=47280 at=2026-09-15T13:24:56.096Z
START ticket=157 runId=t157-close-restore-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/products-restore" waitedMs=80067 pid=66064 at=2026-09-15T13:27:01.375Z
RUN ticket=157 runId=t157-close-restore-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/products-restore" waitedMs=80067 exit=0 pid=66064 at=2026-09-15T13:27:12.971Z
START ticket=157 runId=t157-close-regress cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs" waitedMs=1 pid=44872 at=2026-09-15T13:28:10.176Z
RUN ticket=157 runId=t157-close-regress cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs" waitedMs=1 exit=0 pid=44872 at=2026-09-15T13:28:14.606Z
```

---

## 四、本窗**引用**但不由本窗跑的两条（照抄，免责声明）

1. **编排者持锁提交**（`runId=t157-commit-protect`，四条提交 `24fb121`／`a05feda`／`ecb665d`／`d1af159`）：本席**未跑**，只按编排者通报记入 `t351-v17-evidence.md` 件头的「本窗基线的提交」。
2. **`pnpm gen:check`**：本席**未跑**（理由见 `t351-v17-evidence.md` §1.2 的注）；跑了与 `package.json` 的 `gen:check` 逐字同源的那条 `node packages/skill-calorie/scripts/gen-cli.mjs --check`（本件 §一 之外的 §二 #7）。

> **未持锁的口径说明**：本窗派单 §五 明写「本窗一切会改动工作区的步骤直接调用，不要再包一层加锁包装器（避免自堵）；**但跑批与测试仍按上面给的 `run-locked.mjs` 起法**——那是本窗的外层锁」。§二 那些步即按此直接调用；实测锁被其它窗口占着（本窗两次等锁 70s／80s），再包一层只会自堵。
