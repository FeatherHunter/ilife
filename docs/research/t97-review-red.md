# #97 · M5 写库回执契约 · 红队（对抗式）审查报告

> 被审 `4671169`／`11be0c7`／`a2e95be`；基线 HEAD `525cc2e`；窗口 13:36Z–13:49Z（#120／#97 实施／蓝队同跑）。全部 build／test／变异经 `run-locked.mjs --ticket 97`，复跑前先 `tsc -b --force` 干净重建（§7）。

## 1. 复跑清单

| 命令 | runId | exit | 结果 |
|---|---|---|---|
| `tsc -b --force`／`t97-probe-receipts.mjs` | `6448aa56`／`677c4d26` | 0／0 | 重建；**35/35** |
| 靶向 `m5-receipt-97.test.mjs` ＋ 压力 ×2（`--test-concurrency=8`） | `08ad4f41`／`b835e1fa`／`1b1265fb` | 0 | 40/40/0 ×3 |
| 红队独立探针 `red7-probe.mjs` | `3b9e7a0d` | 0 | **17/17** |
| 变异 1／2（单锁内变异→红→还原→绿） | `1525cdfd`／`a43aaafb` | 0／0 | 39/40→40/40；5/40→40/40 |
| `goal.set` 补探针 | `7b2d5a1b` | 0 | 见 D-1 |

未做 canonical `pnpm test`（他票占锁；13:38Z 的 `fc68e5ef` 因 wedged 子进程被杀作废）。改独立重算实施者日志：`t101-fail-set.mjs … .scratch/t97/g5-test.log` → **`base=34 after=29 新增=0 消失=5`**，白名单 `git diff 93e27f9` = 0 行，日志绑定 `a86df04a`（审计日志 exit=1 一致）。

GATE-RUN runId=6448aa56-504a-494a-b069-f60b7457f0eb cmd=node node_modules/typescript/bin/tsc -b --force
GATE-RUN runId=677c4d26-01a6-459d-be0e-8ec97d6a6e39 cmd=node docs/research/t97-probe-receipts.mjs --json .scratch/orchestrator/red7-runs/probe.json
GATE-RUN runId=08ad4f41-69c4-40a4-b4eb-622287a189ca cmd=node --test packages/skill-calorie/test/m5-receipt-97.test.mjs
GATE-RUN runId=b835e1fa-6971-4a50-903c-6004c7b8c2e8 cmd=node --test --test-concurrency=8 packages/skill-calorie/test/m5-receipt-97.test.mjs
GATE-RUN runId=1b1265fb-2945-4824-95d7-418a40bfa682 cmd=node --test --test-concurrency=8 packages/skill-calorie/test/m5-receipt-97.test.mjs
GATE-RUN runId=1525cdfd-ae60-4451-8b34-125608723013 cmd=node .scratch/orchestrator/red7-mut.mjs 1
GATE-RUN runId=a43aaafb-ecb7-428b-b569-7573bf77c303 cmd=node .scratch/orchestrator/red7-mut.mjs 2
GATE-RUN runId=7b2d5a1b-2cb5-4c5b-a28c-8acac433de69 cmd=node .scratch/orchestrator/red7-probe-goal.mjs

自证：`check-gate-audit --evidence docs/research/t97-review-red.md --ticket 97 --since 13:36Z --until 13:50Z` → **matched=8/8**（余下 undeclared 为窗口内他票运行，共享日志固有）；§2.4.4 导出受「只 add 本报告」约束未出。

## 2. 逐条验收

| 验收项 | 结论 | 独立证据 |
|---|---|---|
| 四要素逐键 35 键 | 过 | 探针 35/35 ＋ 本席 17 例对账 |
| `affectedRows`＝库真实行数（非自报） | 过 | §3：0／1／2／3 四值均与只读句柄回查一致 |
| 来源＝`total_changes()` 增量 | 过 | `write.ts:136,287-290`；变异 1 恒 1 → 对账用例立即红 |
| 时间戳＝既有 `meta.actionAt` | 过 | 逐例正则；未新增重复字段 |
| `writtenFields` 与传入参数一致 | **不过** | `goal.set` 例外 → **D-1** |
| 既有 10 字段一字未改／只追加 | 过 | 逐例键集恰 10＋7；`4671169` receipt.ts 仅 4 行删除且为 const 重构；`out()`／`receiptHtml` 零改动 |
| 键表零变动（D2） | 过 | 场景表与 `CALORIE_WRITE_COMBOS` 35 键一一对应 |
| 门禁证据可机械对账 | **不过** | **D-2**：`matched=0/0 undeclared=43`，exit 1 |
| 证据真实性 | 过 | 13 个被引 runId 全命中且 exit 一致；无裸跑 |

## 3. 独立抽验（17 例，覆盖 diet／weight／exercise／photo／product／profile／goal／body）

| 键 | 自报 | 只读回查 | id／idSource | writtenFields |
|---|---|---|---|---|
| diet.add | 1 | food_log +1 | id=1／record | 9 项全集 |
| diet.add 重复 | **0** | 无新行 | record | `[]` |
| diet.remove-by-date | **2** | 删 2 行 | `ids=[]`／condition／`m5Line` 起 `id=n/a` | `[]` |
| weight.log | 1 | +1 | record | kg,note,date,time |
| weight.remove(date) | **2** | 删 2 行 | condition | `[]` |
| exercise.add(items×3) | **3** | +3 | ids 3 条 | 16 项 |
| exercise.remove(date) | **2** | 行数不变、2 行 `is_deleted=1` | condition | `[is_deleted]` |
| photo.add | 1 | +1 | record | 5 项 |
| product.deprecate | 1 | `is_deprecated=1` | record | `[is_deprecated]` |
| profile.set | 1 | age／height_cm 落库 | singleton／1 | ＝传入 2 项 |
| goal.water | 1 | `water_goal=2300` | singleton | `[water]` |
| body.composition-add | 1 | +1 | record | date,source,bodyFatPct |
| body.measure-remove | 1 | `is_deprecated=1` | record | `[is_deprecated]` |

**结论**：`affectedRows` 在 0／1／2／3 四值上与库真实增量逐例相等 → 确为 `total_changes()` 增量，非自报、非恒值。

## 4. P9 与形状

全部 17 例的每次 CLI 调用强制断言 stdout 恰 1 行 JSON（不止 1 个键）→ 全过；envelope 恒 `{version,skill,key,shape:'receipt',data:{ok,message,receipt}}`，`rc.summary === data.message` 逐例相等；receipt 键集恰 17（10＋7）；`m5Line` 四段与结构化字段同源，delete 为 `字段 —`。

## 5. 变异复核（2 处 src 级）

| 变异 | 变异后 | 还原 sha256 | 还原后 |
|---|---|---|---|
| `totalChanges` 恒 1 | 红 39/40，唯一红项＝`affectedRows＝库真实行数…` | `35E98EB9…A0C7` ✅ | 40/40 |
| `m5LineOf` 丢「影响 N 行」 | 红 5/40，35 条「M5 四要素」全红 | `16EACC10…575A` ✅ | 40/40 |

两处均在**同一持锁区内**完成还原＋重建（dist 变异态窗口全程持锁），规避 §7 陈旧 dist 假红。收尾 `git status --short` 无 `Bin … -> …`；`MUT-\d|MUTATION` 扫描零命中。

## 6. 新探针（被审脚本覆盖不到）

① **空库首写**：不 seed 直接 `weight.log` → `affectedRows=1`（迁移未计入，`cmd_read.ts:963`）。② **`total_changes()` 与 ROLLBACK**：实测 `0→1→1`（不回退），与 `t97-impl.md` §8 风险 1 陈述**一致**。③ **`writtenFields` 静态全集 vs fetch INSERT 列**：diet／exercise／product 完全一致；`weight.log` 实写 `height_cm`／`bmi` 而常量不含（D-3）。④ **`ids=[]` 与旧版 `id=n/a` 同口径**：条件删键 `recordId=null`／`ids=[]`／`condition`／`m5Line` 以 `id=n/a` 起 → 成立。⑤ **`goal.set` 不传 water**（D-1）：seed `water_goal=2300, weight_goal=68, deadline=2026-12-31` → 实跑后 `water_goal 2300→2000`（列默认）、`weight_goal 68→null`、`deadline→null`；回执 `op=update`、`writtenFields=["calorie","protein","carbs","fat","water"]`。

## 7. 缺陷清单

**D-1（本票引入 · S2）`calorie.goal.set` 的 `writtenFields` 不可对账。** `write.ts:796` 恒取本票新增常量 `[...F.goal]`。不传 `water` 时仍报 `water`，而该列在 SQL 里未被 SET（`fetch/nutritionGoal.ts:74-77`），其值只因 `INSERT OR REPLACE` 落到列默认 2000；真正被重置的 `weight_goal`／`goal_deadline` 反而未列。正本 §3.4 明写「update 键＝**本次实际变更字段**」，该键运行时 `op=update` → **与正本不符**；按「传入参数集」或「实际写入列集」读都对不上。修法：由本次实际 SET 列派生，或在正本 §3.4 显式豁免并写明理由。

**D-2（本票引入 · S2）门禁证据不可机械对账。** `t97-impl.md` 无任何 `GATE-RUN runId=… cmd=…` 声明，也未按 §2.4.4 导出对账源（`docs/research/t97-gate-runs.log` 不存在）→ `check-gate-audit --evidence docs/research/t97-impl.md --ticket 97` = `matched=0/0 … undeclared=43`，exit 1。§2.4 于 `a8d5c1f`(20:44) 生效、`16b0579`(21:01) 加固，证据 commit `a2e95be`(21:26) 在其后 → 适用。**减轻**：13 个被引 runId 全部真实、exit 一致 → 非造假、非裸跑。修法：补声明 ＋ `--export`。

**D-3（本票范围 · S3）** `F.weight` 不含 `bmi`／`height_cm`（fetch 实写，`fetch/weight.ts:52`）。正本 §3.4 声明为 CLI 名口径，二者无 CLI 参数 → 合规，但与「写入字段全集」有落差。

**D-4（范围外 · S3 ＋ 转票）** `goal.set` 经 `INSERT OR REPLACE` 静默重置 `weight_goal`／`goal_deadline`／`goal_paused`／`start_weight`／`start_date`（实测 68→null）＝**数据丢失风险**。归因 `d91a587`(#23)，本票零改动 → 范围外，不单独决定 verdict；建议 #63 图内开票。

**D-5（本票引入 · S3）** 探针与回归共用同一判定代码（测试 `import { SCENARIOS, checkM5 }`），一处漏洞可同时骗过两者；探针对 `affectedRows` 仅做形状断言，逐键库对账只有 5 处手工用例。本席 17 例独立探针已补位。

**D-6（本票引入 · S3）** 改已发布包源码与对外类型（`CrudReceipt extends M5Fields` 新增 7 个必填字段），却未加 changeset（同图 #101／#120 均有）。

**S1 清点**：无 S1-交付缺陷、无 S1-过程违规（无裸跑、无越权路径、无危险 git 命令）。

## 8. 五维与 verdict

| 维度 | 得分 | 依据 |
|---|---|---|
| 契约一致 30 | 27 | 四要素逐键达成、只追加、P9 不变；`goal.set` 字段摘要偏离 §3.4 |
| 证据真实可复现 25 | 21 | 35/35、40/40×3、2 处变异红→绿、delta 重算 0 全复现；门禁对账不可机械核验 |
| parity 20 | 19 | 旧版五段齐备，`m5Line` 逐字复刻 |
| 工程红线 15 | 12 | 无裸跑／越权／变异残留；缺 changeset |
| 文档同步 10 | 8 | 正本＋证据详尽；未按 §2.4 出声明；`idSource` 未入 `SKILL.md`（已声明归后续票） |
| **合计 100** | **87** | |

**verdict：PASS**（无 S1；均分 87 ≥ 85）。**关闭前置**：D-1、D-2 须修完（§6 S2）；D-4 转票；D-3／D-5／D-6 记账。

> 复跑脚本：`.scratch/orchestrator/red7-probe.mjs`（17 例）、`red7-mut.mjs`（单锁内变异自证）、`red7-probe-goal.mjs`（D-1 补证）；日志 `.scratch/orchestrator/red7-runs/*.log`（gitignored）。
