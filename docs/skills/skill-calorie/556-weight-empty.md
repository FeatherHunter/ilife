# #556 体重盘空库缺失阻断 · 证据件

票面：`gh issue view 556`「卡路里体重概览：空库未走缺失阻断（exit 0，应为 4）」（Part of #162，#396 独立复核 S3 转票）。
复核原文：`home-lock-374`「看今日体重概览空库 exit」预期 4 实得 0；口径照 `home-lock-374:96-98`（空库 exit 4、不落盘）。

让路检查（开工前置）：`gh issue view 505 --json updatedAt,comments` 实测 `updatedAt=2026-09-15T00:42:09Z`（当刻已超 1 小时）、`comments=0`；
`git status --porcelain -- packages/skill-calorie/src/weight/log.ts` 为空；前置提交 `f9f3fed 修复(560)` 在历史中（`git log --oneline --grep=560` 可见）。
未触发让路，照票面开工。

## 一、影响清单（结构纪律第一步）与交付对账（第五步）

| # | 文件 | 一句话与理由 | 对账 |
|---|---|---|---|
| 1 | `packages/skill-calorie/src/weight/log.ts`（空库分支定点） | 体重能力：`viewWeight` 空分支加库空分辨（`weight_log` 全表零行 ⇒ 抛 `missing-data` 走 exit 4；库里别处有记录只是这段零记录 ⇒ 仍出完整空态页）；件头 `#337` 注记并入 `#556` 两态一句（LF 402→402） | 落：守卫一行 ＋ 函数注释一句 ＋ 件头两行并一行，写命令入参落库段一行未动 |
| 2 | `packages/skill-calorie/test/556-weight-empty.test.mjs`（新建） | 本票验收用例：空库 exit 4＋零落盘、有数窗行为不变、窗口为空行为不变、两态分开 | 落：4 条测试（见 §五） |
| 3 | `docs/skills/skill-calorie/556-weight-empty.md`（本件）＋ `556-weight-run.log` | 证据与长输出日志（文件名带票号） | 落 |

偏差：零。事前清单与事后对账逐行对得上。
禁区（均未碰）：`log.ts` 内写命令入参落库段（`writeWeightLog`／`writeWeightBatch`）、其余 weight 件（`history.ts`／`compare.ts`／`review.ts`／`plateDocs.ts` 等）、场景 01 的 `src/home/`、命令声明与路由（`commands.ts`／`routes.ts`／`registry.ts`／`keys.ts`）、公共层、产物手改。

## 二、结构设计（第二步）

无新目录。`log.ts` 对外接口不变（`viewWeight`／`buildWeightDashboard` 签名与导出数不变，主盘与空窗共用 `deliveryBlocks` 不动）；
分辨判据照饮食域先例（`diet/nutritionPort.ts:hasAnyDietRow`、`home/today.ts:100`、`diet/nutrition.ts:30-32`）——只看 `weight_log` 全表行数，不看错误文案；
共用位不新增（体重域第二个用法尚未出现，`hasAnyWeightRow` 不单立件，判据内联在能力目录内，铁律一／二守住）。
测试新件只读公开出口（CLI 真跑 `calorie.view.weight` 空库无参／有数窗／空窗）与 `calorie_html/` 件数；无跨能力引用。

## 三、超线报警（第四步）

已超线，需要根据规则进行重构。超因：本件同时住着「读页取数与整页装配」（`viewWeight`／`buildWeightDashboard`／两个 `build*Doc`）＋「两条写命令的入参与落库」（`writeWeightLog`／`writeWeightBatch`），与台账 `src/weight/log.ts` 行一致（挂号值 —，当场实测 LF=402，改前 402 → 改后 402，未越线新增）。
本次先不拆：拆分不在 #556 写集（票面只许动空库分支定点），拆法照台账已写好的那条＝按「读／写」切两件姊妹件：读面留本件，写面另立 `weight/logWrite.ts`，`signed`／`windowDays`／`rangeTextOf` 提为共件；待收口票认领。

## 四、改动明细

- `log.ts:9-11`：件头 `#337` 两行（空窗注记）并成一行 ＋ `#556` 两态半句（`空窗出整页空态（§5.7）＋空库缺失阻断（#556）`），LF -1，为守卫腾一行（台账 LF 不动）。
- `log.ts:57-64`：`viewWeight` 函数注释 `窗口内 0 条＝整页空态` → `空库缺失阻断（#556），窗口为空出整页空态`；空分支加守卫一行：
  `if (((db.prepare('SELECT COUNT(*) AS n FROM weight_log').get() as { n: number } | undefined)?.n ?? 0) === 0) throw new CalorieRenderError('missing-data', '无体重记录（' + start + ' ~ ' + end + '）');`
  （`CalorieRenderError` 本件已 import；`missing-data` 由 `cli/cmd_read.ts:124-126` 接 `ERR 4: 取数失败（缺失阻断）` exit 4、不进 `buildDeliveredEnvelope` 故不落盘）。
- 主盘 `sourceText`／空窗 `共 0 条`／`deliveryBlocks`／写命令段一字未动（#560 口径不动）。

## 五、测试读数（均走 `node tooling/run-locked.mjs --ticket 556 -- …`，长输出见 `556-weight-run.log`，回执只看尾 5 行）

- 编译：`npx tsc -b packages/skill-calorie` → exit=0（重做 `runId=efeebe07-0af2-4df1-b68c-29c2aa7f7d62`；还原重建 `runId=cdb133ce-4cd1-4c1a-bbd7-6d2af6d2282c` 同绿）。
- 新用例：`node --test 556-weight-empty.test.mjs` → tests 4 / pass 4 / fail 0，exit=0（重做初绿 `runId=ea533cdc-3e6d-40c5-8c17-f2677bc5b999`；终绿 `runId=f0f67b97-297c-4c93-8957-fa7bff18e6b7`）。
- 旧用例回归：`node --test home-lock-374.test.mjs` → tests 9 / pass 9 / fail 0，exit=0（`runId=2e2f87bb-34f8-4244-9259-0f6981c959a2`，含 `看今日体重概览`有段出页／无段阻断）；`node --test 560-weight-no-source.test.mjs` → tests 4 / pass 4 / fail 0，exit=0（`runId=f8f34508-9fc4-475d-b44a-5dacded12fba`，空窗仍是空态页，来源脚注仍零命中）。
- LF：`log.ts` 改前 402 → 改后 402（台账 `当场实测 402` 不动）。
- 重做注记：首轮改动曾被并发窗分支重置清掉（`log.ts` 回到 402 原文、新建三件消失），已按本件 §四逐行重做并重跑，读数以重做后持锁重跑为准（本节 runId 均为重做后）。

## 六、变异自证（两行读数，真码变异＋重建）

- 改坏（`log.ts` 删守卫一行，重建 `runId=522136dd-0457-404b-bba3-ac35bb992dde` exit=0 后跑本票用例）：tests 4 / pass 2 / fail 2，exit=1，必红 ✓（`runId=f8e4ac4d-2b60-4456-ac72-547642b1e628`；红在 ① 空库实得 exit 0 与 ④ 两态塌成同 exit 0）。
- 还原（加回守卫一行，重建 `runId=cdb133ce-4cd1-4c1a-bbd7-6d2af6d2282c` exit=0 后同命令）：tests 4 / pass 4 / fail 0，exit=0，必绿 ✓（`runId=f0f67b97-297c-4c93-8957-fa7bff18e6b7`）。
- 另有字串级自证（用例第 ④ 条）：`T556-MUT 空库改坏红=1 还原绿=1；有数窗与空窗行为不变`。

## 七、遗留与终审

- 锁等待：并发窗多票持锁（`544`／`546`／`561C-R`）均按「活进程一律不抢回」正常排队；首轮另有 `561C-R` 死锁抢回一行（`LOCK-STOLEN … owner-dead`），判据读数以释放后持锁重跑为准。
- 分支重置：首轮提交曾误带他票已暂存四件（`t449`／`t486`／`t561`／`field-label-486`），已 `reset --soft` 拆回；随后分支被并发窗重置致本票四件全丢，已重做。本次提交一律带 pathspec，只收声明四路。
- 390 真浏览器量尺与最终版式按票面归用户肉眼终审（本件只做出口与落盘守卫）。
