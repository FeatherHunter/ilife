# t1187-reds 诊断修复单：MAP1179 全量3红·复现→根因→停手遗留（未改源码）

分支 feat/1187-reds-fix · worktree D:/ilife-wt-reds · 基 d0f2b5b8（integ/1179-bill-copy-three-forms 尖，与 D:/ilife-wt-integ 同提交）
主区 D:/ilife 未动（master 3f21d023）；禁令遵守：未 switch/checkout、未 reset/stash/clean/restore .、未 amend/rebase/push --force；未碰 base三包/registry/指纹账本（未 --declare 重录）
诊断循环：先调 diagnosing-bugs（Phase1 紧循环→Phase2 复现→Phase3 假设→Phase4 取证），读测试与源码，不猜。

## 一、根因一句话

MAP1179 子票的人话复制改动把写域阻断原话移出了页面可测文本、并在非声明件里新增了6处唤醒词字面量书写位，导致旧断言逐字命中失败。

## 二、复现（落盘读尾，稳定红）

- `node --test packages/skill-bill/test/record-write.test.mjs` | runId 1fee171b-8dda-41ff-b843-ddd820ab6a77 | exit 1 | 21 tests / 19 pass / 2 fail
  - `record-write.test.mjs:246 缺 id → 采集页` 在 :261 红：`改记录采集页缺：缺必需槽位：记录编号`（10 针中 9 中、仅此 1 缺；页实测 HIT 9 / MISS 1，见 §三）
  - `record-write.test.mjs:413 方向不符` 在 :422 红：`阻断条须说清方向`（期望页含 `方向和这一型对不上：记支出要负数，给的是 +35.00`，页实测 MISS）
- `node --test packages/skill-bill/test/t721-判据与摘要锁.test.mjs` | runId 697d5862-437b-40cb-985b-bdebf68f7f3d | exit 1 | 6 tests / 5 pass / 1 fail
  - `t721:110 非声明件整串字面量命中即红` 在 :123 红，hits 6 件（与集成落盘 .scratch/merger/full.log runId 1239426f 尾段一致）：
    `account/copyTextAccount.ts:60「看账户汇总」`、`analysis/scene-monthly.ts:55「看月度」`、`analysis/scene-range-compare.ts:126「看双区间」`、`analysis/scene-trend.ts:134「看趋势」`、`goal/copyTextGoal.ts:94「看预算」`、`goal/copyTextGoal.ts:99「看目标」`
- 对照：主区同命令绿（1187 证据：record 21/0 runId 9b2805ba；t721 6/0 runId ad86469e），故 MAP 引入；另 5 红已判环境抖动单跑绿，不管（本次复现前 `dist 缺失` 假红 1 次，经 pnpm install + tsc 三段后消除，不计入）。

## 三、因果链（读测试与源码，逐条对上）

### 3.1 record-write:261（缺 id 页缺一针）

- 断言：test 246-264 检查信封 `env.data.message.includes('缺必需槽位：记录编号')`（此行绿）+ 页文本 10 针（:256-260），第 4 针 `缺必需槽位：记录编号` 页缺即红（:261）。
- 页实测（D:/ilife-wt-reds/.scratch/manual-update.html，BILL_DB_DIR 临时库）：10 针 HIT 9 / MISS 1，仅 `缺必需槽位：记录编号` MISS；其余 `data-slot/data-page/data-key/slot miss/data-chip rid/还差1项/say-form/say-cfg/say-btn` 全 HIT。
- 源码：`write/template-update.ts:213-229 collectPage` 先算 `blockedMessage→envelope`，再调 `sayCollectOut({sayKey:'update:'+receiptResult})`，SAY 有数据即 `return sayOut`（:229），老回落壳（含 blockedBar 文案）不走。
- SAY 载荷：`write/saySheet.ts:231-248 sayConfigJson` 在 8e1e333a 后改走 `buildCollectCopyText/Json/Csv（write/collectCopyText.ts:93-98 人话三行：页身份/已给/还差/下一步）`，不再走 base-paint `buildDataText`（信封原话 verbatim 嵌入）。主区页 HIT 因旧载荷含 `"message":"缺必需槽位：记录编号…"`（.scratch/manual-update-main.html 实测 HIT），本尖新载荷仅 `还差 记录编号 / 下一步 补齐后跟助手说一遍`，故页 MISS。
- MAP 改动：`8e1e333a feat(1181): 采集未写库已给还差分行三份人话＋采集门新立与SAY回落同门三份覆写`（template-update.ts +7/-0 仅加回落壳三份覆写；saySheet.ts 换载荷门 + buildCollectCopy*）。页缺的正是该提交换掉的那份 verbatim。

### 3.2 record-write:422（方向阻断页缺原话）

- 断言：test 413-423 检查信封 `match /方向和这一型对不上：记支出要负数/`（此行绿，信封实测 `写库已阻断：金额（方向…+35.00）…`）+ 页含 `方向和这一型对不上：记支出要负数，给的是 +35.00`（:422 红）。
- 页实测（.scratch/manual-expense.html）：MISS；页内 SAY hint 为 `已填齐，可以复制去说了。`（ready=true），方向细节仅 `fill-line 方向 金额取负数`，无 `给的是 +35.00`。
- 源码：`write/template-expense.ts:150-171 collectPage` 同样 SAY 优先（:159-171）；SAY 缺项 `saySheet.ts:119-123 missingLabels` 只按 cfg 必填位算，不含 `blockedItems` 的方向判定（`blockedSlots.ts:52-64` 方向只服务录入路径，SAY 不读它）。本例 kind/category/amount/time 全给 → SAY miss=0 → ready 页，不印阻断条。
- 主区页 HIT 因旧载荷 verbatim 含信封 `message`（manual-expense-main.html 实测 HIT，三份 `text/json/csv` 均含该句）；本尖新载荷 `buildCollectCopyText`（collectCopyText.ts:56-82：已给分类/金额35.00… 还差无 下一步已填齐）不含方向原话，故 MISS。
- MAP 改动：同 8e1e333a（template-expense.ts +11/-? + saySheet.ts 换门）。判定 `directionOf('expense').require='记支出要负数'`（summaryRow.ts:38）与 `money2(35)='+35.00'`（:49-52）本身未变，变的是载荷门。

### 3.3 t721:110（6 件唤醒词第二书写位）

- 判据：test 109-124 扫 `src/**.ts`（除 8 份 declaration + wakeTable），`codeLiterals`（单/双引号，跳模板串，去注释，title: 值位豁免）整串 == WAKE_TABLE phrase 即红。
- 6 处源码（行号为本尖实测，与 merger full.log 一致）：
  - `account/copyTextAccount.ts:58-62 pageLine(wakeWord)` fallback `'看账户汇总'`（:60）
  - `goal/copyTextGoal.ts:84-86 pageLine(wakeWord,fallback)` 调用位 :94 fallback `'看预算'`、:99 `'看目标'`
  - `analysis/scene-monthly.ts:54-55 copy: buildAnalysisCopy({kind:'period', word:'看月度'…})`
  - `analysis/scene-range-compare.ts:125-126 copy: buildAnalysisCopy({kind:'range', word:'看双区间'…})`
  - `analysis/scene-trend.ts:133-134 copy: buildAnalysisCopy({kind:'trend', word:'看趋势'…})`
- MAP 改动：
  - 账户/目标 fallback 由 `59cdbe6b 账户目标：卡片加合计不断（三份人话+余额=流水对账）` 新增 `pageLine` fallback 字面量（diff 含 `+ const w = … ? … : '看账户汇总'`；goal 同提交两处）；`a651ae9c 1179修单 R1-R5` 仅注释/口径收敛，未增字面量。
  - 分析三处 `word:` 由 `1e0ebf56 1184分析人话行：新人话门＋三场景接线` 新增（diff 含 `+ kind:'period', word:'看月度'` 等）。
  - 对照正确示范：写入域场景件已用投影避字面量（`scene-expense.ts:13 wakeWordOfKind('expense')`、`scene-update.ts:12 projectWakeWord({key:'bill.record.update'})`），分析/账户目标三处未跟进。
- 另：`sayWords.ts` 全表仅 `{word}` 占位符、无字面量（设计正确），故 SAY 本身不红；红的是上述 copy 门 fallback 与 scene 接线。

## 四、停手判定（大则停手，不当场修/开票）

- 修法若要同时满足“MAP 复制三份不变＋指纹 44/44＋warning 26/26 不红”：
  - record 两红：把旧原话加回页 HTML 即改页 → 指纹重录（t689 账本 44 页）必动，需 --declare 重录 + 像素墙复验；改测试放宽逐字即动他人件（record-write 系写入域行为契约），不属本分支写集。
  - t721 六处：去字面量需改投影 plumbing（account/goal fallback 改查表、analysis word 改 projectWakeWord/wakeWordOfKind），跨 1184/1185 两票 + review 口径，单窗口改 6 文件 + 摘要锁/指纹回归，超“小修 TDD+变异”量级。
- 故按做法“大则停手”：本分支零源码改动，仅落本文 + scratch 日志；不当场开票，交编排者聚合。

## 五、开票判据（给编排者三问，不当场开票）

- Q1 能复现吗：能。复现命令与读数见 §二（record runId 1fee171b 19/21 2 红；t721 runId 697d5862 5/6 1 红 6 件；集成 full.log runId 1239426f 尾段同 6 件 + 另 merger 提及 a1138e2a/0a5bd227 同文件落盘，详见 D:/ilife-wt-integ/.scratch/merger/full.log）。重要性：阻断原话是“真阻断不是提示”的用户证据（blockedSlots 件头三处之一）；唤醒词单书写位是路由唯一性结构判据（t721 件头 D4），非计数噪声。
- Q2 有现存票或 MAP 可认领吗：暂无可直接认领的缺陷票。MAP 1179（饼干记账复制三形态重做）为功能 MAP，非缺陷认领处；1187 为验证票（§五遗留已记“停手记遗留由编排者三问开票；MAP 门不受影响”），1181/1184/1185 为功能子票（改动引入方，非 bug 票）。需编排者决定是回写 1179/1181/1184/1185 其中之一还是另起缺陷票，本单不另起。
- Q3 是已承诺的目标吗：否。MAP 1179 Destination 为空（deck_map_snapshot blocks.destination=""）；1187 证据 §五明确“遗留需另票，本票不碰他人件”。旧断言逐字（缺必需槽位/方向原话 verbatim 进页、唤醒词零第二书写位）与 MAP 已承诺的人话三份（已给/还差/下一步分行）存在口径冲突，需维护者先裁决“页是否须再含信封原话 verbatim”与“fallback/word 是否允许第二书写位”，再转承诺目标。有一问不过 → 只记文档（本文），不当场开票。
- 若编排者三问全过后的回写建议：标题如“写域 SAY 载荷与旧阻断原话口径冲突＋唤醒词 6 处第二书写位”；判据写 §二两条命令 + 本尖读数；归属写 1179 MAP 下 1181（载荷门）+1184/1185（字面量）；承诺引用待维护者裁决后补 Destination/ADR。

## 六、GATE-RUN（run-locked --ticket 1187；tsc 写死 node node_modules/typescript/bin/tsc）

| 门 | 命令 | runId | exit | 读数 |
|---|---|---|---|---|
| worktree | git worktree add D:/ilife-wt-reds -b feat/1187-reds-fix d0f2b5b8 | 23a0e144-74ec-47c2-9c74-8474aa74f7bf | 0 | HEAD d0f2b5b8 |
| install | pnpm install --prefer-offline（本树自洽，复用 138/下载 0） | 03ebf58e-bb12-4fd8-b05d-3979dcbc2308 | 0 | +138 |
| tsc base-link-core | node node_modules/typescript/bin/tsc -b packages/base-link-core | 9d0667b1-d2e9-49ca-a4a7-e09098fcb04f | 0 | 空输出 |
| tsc base-render | node node_modules/typescript/bin/tsc -b packages/base-render | 79995c1b-582c-4f4c-b29b-5527133af3f1 | 0 | 空输出 |
| tsc skill-bill | node node_modules/typescript/bin/tsc -b packages/skill-bill | 3de62986-4913-43e0-b694-ba852e3dbf0b | 0 | 空输出 |
| record-write | node --test packages/skill-bill/test/record-write.test.mjs | 1fee171b-8dda-41ff-b843-ddd820ab6a77 | 1 | 21/19/2（:261/:422） |
| t721 判据锁 | node --test packages/skill-bill/test/t721-判据与摘要锁.test.mjs | 697d5862-437b-40cb-985b-bdebf68f7f3d | 1 | 6/5/1（:110 6 件） |
| 手工页验 | update 缺 id 页 10 针 + expense 方向页（BILL_DB_DIR 临时库） | — | — | update 9/1 MISS 缺必需槽位；expense MISS 方向原话（信封均绿） |
| 主区对照 | 主区同页实测（D:/ilife dist 现成） | — | — | update HIT 缺必需槽位；expense HIT 方向原话，故 MAP 引入 |

未跑：全量 55 件/指纹 --check/warning/shape/gen（MAP 门已在 1187 证据绿，见 t1187-全绿验证-证据.md §二；本单为 reds 定点复现，不重跑全量；CI 矩阵/publish-gates 按 1187 §六 CI 对应表走 CI）。

## 七、尾 5 行（落盘读尾）

- record .scratch/reds-record-write.log 尾 5：
  `operator: '==' / diff: 'simple' / } / LOCK-RELEASED ticket=1187 runId=1fee171b… exit=1 / RESULT: … exit=1`
- t721 .scratch/reds-t721.log 尾 5：
  `operator: 'deepStrictEqual' / diff: 'simple' / } / LOCK-RELEASED ticket=1187 runId=697d5862… exit=1 / RESULT: … exit=1`
- gate-runs.log 本单段尾 5 含上述 7 行 RUN（见 §六 runId 链）。

## 八、merge 状态

- 本分支 feat/1187-reds-fix 基 d0f2b5b8，零源码提交；待提交仅本文（docs/skills/skill-bill/t1187-reds-诊断与遗留.md）+ .scratch 日志（不进仓）。完工前未 merge integ（基即尖，无需合）；主区未动。
