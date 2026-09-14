# t264 交付证据 · 场景 04 运动写后回执页（13 条写词出完整文档）

- 票面差异声明：`gh issue view 264` 与简报一致，无差异（目标／验收／路径／遗留均对齐；五连助手由本票建，与票面一致）。
- 结构落点：所有新代码只落 `packages/skill-calorie/src/exercise/`（`receipt.ts` 新，`log.ts`／`edit.ts` 改产出）；测试助手 `packages/skill-calorie/test/doc-page-assert.mjs` 新（五连唯一定义地，既有三份不动）。

## 持锁运行留痕（GATE-RUN）

- GATE-RUN runId=921d663d-db5d-4e36-aac0-6b4c70f1b237 cmd=pnpm build exit=2（他人在途 `diet/routes.ts` 引未登记 `calorie.product.import`，本票不碰；详见 `.scratch/t264/build.log`）
- GATE-RUN runId=ce396677-d583-416c-afbe-2353853bba42 cmd=npx tsc -p packages/skill-calorie/tsconfig.json exit=2（`exercise` 零错误并正常 emit；错误在 `photo/gif.ts` 等他人件；见 `.scratch/t264/tsc.log`）
- GATE-RUN runId=fa3d5918-de79-4f06-8544-020ded26790b cmd=node --test --test-name-pattern=单条起点 exercise-receipt-264 exit=0 pass=1 fail=0（先验形状第一条绿）
- GATE-RUN runId=87ad099d-718e-4468-9af8-ba23b9cdcb26 cmd=npx tsc（变异后重出） exit=0
- GATE-RUN runId=8e526012-495f-45d6-bedb-3998d192b08b cmd=node --test --test-name-pattern=单条起点 exit=1 pass=0 fail=1（变异红：`receipt.ts` 眉标改坏一处）
- GATE-RUN runId=bc02732a-4298-46e5-9208-52defbff20a0 cmd=npx tsc（还原后重出） exit=0
- GATE-RUN runId=0231c399-dba4-406b-b826-745357fafd6d cmd=node exercise-receipt-264.test.mjs exit=0 tests=13 pass=13 fail=0（还原一致＋全量绿）
- GATE-RUN runId=01cd8ce3-ea3f-40f5-a351-932a8febf306 cmd=node --test cmd-write-40＋m5-receipt-97＋softdelete-125＋profile-doc-179＋cmd-registry-294 exit=1 pass=83 fail=2（2 红归因见下，与本票无关）

## 判据先行（红）

`.scratch/t264/probe-red.mjs`（现有 `dist` 直跑，免锁只读）：`add len=282 doctype=false`／`upd len=252 doctype=false`／`rem len=335 doctype=false`，头皆 `<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:receip`，`RED=1`。与票面 282／252／335 一致，判据有鉴别力。

## 自证两行（机器读数）

- 变异红：`receipt.ts:eyebrow` 改为 `运动 BROKEN 变异点` → 单条测试 `pass 0 fail 1 exit 1`（`记运动 缺运动眉标`，见 `.scratch/t264/test-mut.log:2,6,16`）
- 还原一致：改回 → 全量 `tests 13 pass 13 fail 0 exit 0`（见 `.scratch/t264/test-full.log:15,17,18`）

## 实现形状（照抄实物，不新造）

- `src/exercise/receipt.ts`（新，266 行）：`buildExerciseReceiptDoc(db,key,receipt,command,detail)` ＋ `ExerciseReceiptDetail`（2 件导出）。`assembleDocPage`＋`statusCard`／`reconcileDisclosure`＋`copyArea`／`copyLog`（数据位恒出三格式菜单）。区块：单条明细表／逐条明细表／批量计数（写入跳过失败／复制跳过／命中／删除）／改前→改后对照／目标日累计（`EX_ALIVE` 活行口径）。中文列名只此一处；无 `any`。
- `src/exercise/log.ts`／`edit.ts`（改产出）：回执数据（`recordId`／`ids`／`writtenFields`／`items`／摘要）逐字不动；`affectedRows` 按 `total_changes()` 增量自算（与分派层同口径，页内与信封一致）；删按日／范围先快照再软删（只读装配用，不改行为）；`command` 照抄原文进复制日志。**未碰分派层**（`write.ts` 的 `profileReceiptDoc ?? dietReceiptDoc ?? res.html` 对运动键回落 `res.html`，即本件整页）。
- `test/doc-page-assert.mjs`（新）：`assertDocPage` 五连＋无残留唯一定义地；后续票只引用。
- `test/exercise-receipt-264.test.mjs`（新，212 行）：13 条以词为起点（冻结 `main_prompt.cli`，`<日期>` 填真日；复制按原文先落昨日再复制），逐条断言 exit 0＋绝对路径＋五连＋三格式菜单＋老实物区块。

## 回归（存量）

- 运动相关全绿：`运动记/改/删/批量/复制 + 字段白名单` ✔；M5 `exercise.add`／`update`／`remove` ✔；`softdelete-125` 4 条 ✔；`cmd-registry-294` 全 ✔。
- 2 红与本票无关（他人在途件）：① `m5 45!==46`（`diet/commands.ts` 新增 `product.import` 键，场景表未跟）；② `profile-doc-179 反面 water.log 已是整页`（`diet/receipt.ts`＋`write.ts` 钩子正是在途饮食票的产出）。反面清单不含运动键，本票未碰 `water`／键表。

## 提交与推送

- commit f7d5d90「feat(264): 运动写回执切完整文档＋13词测试全绿（receipt/log/edit＋断言助手＋证据）」：7 文件（上文实现 3＋测试 2＋本证据＋changeset），`git diff --cached --name-only` 复核仅此 7 件。
  GATE-RUN runId=19438da4-3354-4278-ae74-45f451113d56 cmd=git add（7 件） exit=0；
  GATE-RUN runId=3d1d294a-b4a7-4090-a4a3-d71934b85dcf cmd=git diff --cached --name-only exit=0（3 件实现）；
  GATE-RUN runId=20f28cac-b851-4d0c-8db8-583b8cdb04ce cmd=git commit exit=0。
- 已推送：`git ls-remote origin master`=1be7858，`merge-base --is-ancestor f7d5d90 origin/master` exit=0（他人随后推送时一并带上远端；本票 push runId=154238af-9883-455f-ba86-1cb97775bef8 exit=0 up-to-date）。
- 插曲：第一次 `git add` 后暂存被他人并行流程清空（文件无丢失），已重加并提交；以后每次提交前都重做 `diff --cached` 复核。

## 未做项与下一手缺什么

- 未跑通 `pnpm build`（他人树红，`diet/routes.ts:36`＋`photo/gif.ts:263`；本票 `exercise` 零错误，`tsc -p` 可 emit，测试全绿）。下一手：待饮食／照片票把树修绿后重跑 `pnpm build`＋本测试即可，无需改本票代码。
- 未动：分派层、路由、命令声明、冻结表、生成物、读命令、场景 07／体重／场景 05 残件（发现越界即停手，本次无越界）。
- 留给底座线：既有三份五连（175／86／179）收口到本助手；`shared/writeParts.ts:87` 不拆；体重 279B 同形只报告。
