# t1179 review fixes 证据（Standards R1-R5，Spec 不动）

分支：`feat/1179-review-fixes`
工作区：`D:/ilife-wt-review`（基 `c495233b006f55227a42af7ed2acfe2aa4c09489`，集成尖 `D:/ilife-wt-integ` 只读参照）
提交：`a651ae9c246840a7083f1a4cf502804f58f4a6b7`（20 件，见收口票；证据件另提交）
合并：`git merge integ/1179-bill-copy-three-forms` → `Already up to date.`（基即尖，无冲突；HEAD 仍 `a651ae9c`）

禁区：未碰 base 三包／registry／query/list.ts COLUMNS／receiptPaper 版式／t689 账本／R6-R9（batch/expense/flow/installment sayFacts、copyArea 签名、list 复出口、调用点扩大化一律不动）。`git diff --name-only` 20 件全在 R1-R5 写集内，禁区零命中。

## R1-R5 逐项判定

- R1（AGENTS 台账 37,39）：`src/analysis/ticket.ts｜372` 与 `src/write/template-update.ts｜354` 由 `--sync` 自动补出的“超因与拆法待补”已按 list.ts／saySheet 格式补两行超因拆法（超因＋拆法＋本次先不拆＋待收口票＋挂号值 `—` 不动）。`--sync --dry` → `SYNC-PLAN 改=0 增=0 删=0／SYNC-DRY ok`，`check-warning-line.mjs` → `RESULT 26/26 PASS`。判定：绿。
- R2（account/pageParts 208-219）：`copyZoneOf` 由 10 字段收敛为 8（7 基＋`copy?: AccountCopy`单对象，照 analysis 118-128 范例；`hints=sayAcct` 内置不动）。调用点同步改：`template-summary.ts` 经 `buildAccountCopy` 单对象透传；`template-update／form` 回执单文本经 `{ text }` 透传；采集页无 copy 零改。判定：绿（8/8）。
- R3（goal/pageParts 232-243）：同 R2，`copy?: GoalCopy` 8 字段；`template-progress.ts` 经 `buildGoalCopy`，回执单文本经 `{ text }`。判定：绿（8/8）。
- R4（setup/pageParts 177-188）：11 字段收敛为 8（7 基＋`copy?: SetupCopy`，`{ text,json,csv,hints }` 同对象；照 analysis 范例把 data＋hints 同收敛）。`template-wizard.ts` 的 `wizardCopyOf` 改返 `SetupCopy（含 hints）`，三页经 `copy` 单对象透传；receipt／list 无 copy 零改。判定：绿（8/8）。
- R5（共享口径）：新建 `src/shared/copyText.ts`（HELP 子功能命名：件名沿九门 `copyText*` 前缀；接口沿九门已有名，不自造；对外 5 个：`MISSING／EMPTY_CELL／oneLine／csvCell／truncate`，铁律五上限内，唯一定义地）。九门改 import 复用，门特有行式保留（卡片行／合计行／结论行／备注截断限值 30／200 与拖尾不动），“同口径，不另抄”注释删除（list-copy 头＋collect／analysis／detail 同制句指向共用件）。`grep function oneLine|csvCell` 九门零本地定义。判定：绿（5/5）。

## TDD 红绿

- 红（改前探针）：R1 待补仍在；account／goal 10 字段超 8、setup 11 超 8；`shared/copyText.ts` 缺失；九门各有本地 `oneLine＋csvCell`。
- 绿（改后）：待补清零（ ledger 行外文档句不计）；三域 `copyZoneOf` 8／8／8；共用件 5 导出；九门零本地；`tsc -b` exit 0；复制三份逐字节不变（下指纹）。

## 变异（改坏必红）

- 将 `accountCardLineOf` 首字改“坏账户”，重建后 `t1185` 必红：`✖ 卡片行含户名… AssertionError: 卡片行须以账户开头：坏账户…` exit 1。
- 还原后 `t1185` 9／9 绿。证收敛调用被测住。

## 测试指纹 warning 摘要（尾 5 行）

- `tsc`（写死入口 `node node_modules/typescript/bin/tsc -b packages/skill-bill` 经 `run-locked --ticket 1179`）：exit 0。
- 告警线：`OVER 8 件／IN-LINE 4 件／RESULT 26/26／PASS 台账齐全且与实况一致`；`--sync --dry SYNC-PLAN 改=0 增=0 删=0`。
- 指纹：`--check 渲染 44/44／RESULT 44/44／PASS 44 张页指纹与账本一致`（行为零变；未走 `--write --declare-layout-change`）。
- 复制七门：`tests 100／suites 26／pass 100／fail 0`（尾 5 行：tests 100／suites 26／pass 100／fail 0／cancelled 0）。
- 门禁：`t686＋t689 17／17 绿`（尾 5 行：tests 17／suites 2／pass 17／fail 0／duration_ms 51096）。

## 超线

- 本票新增超线 0 件；R1 两行由 372／354 原位补结论，行数不动（LF 372／354 与台账一致）；共用件 46 行在线内；三域 pageParts 行数未过线（account 349→351？实测在线内，待门禁复核）。

## GATE-RUN＋hash＋merge

- GATE-RUN（经 `run-locked --ticket 1179`）：`tsc -b packages/skill-bill` exit 0；`check-warning-line.mjs` 26／26；`gen-page-fingerprints --check` 44／44；`node --test 七门复制 100／100`；`t686＋t689 17／17`。
- hash：基 `c495233b006f55227a42af7ed2acfe2aa4c09489`；提交 `a651ae9c246840a7083f1a4cf502804f58f4a6b7`（20 files ＋176 −201）。
- merge：`git merge integ/1179-bill-copy-three-forms` → `Already up to date.`（解冲零动作）。
