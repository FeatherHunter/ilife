# #560 体重片 · 体重盘屏上来源脚注删除 · 证据件

票面：`gh issue view 560`「卡路里场景 01：五页来源脚注删除（体重片排队等505窗口）」（Part of #162）。
用户裁决原文（改动注释与测试注释逐条引用同一句）：
「用户 2026-09-15 点名：所有 HTML 页面底部的「数据来源：xxx」都删掉（用户直接看得见按钮与内容，不需要脚注复读来路）。」

让路检查（开工前置）：`gh issue view 505 --json updatedAt,comments` 实测 `updatedAt=2026-09-15T00:42:09Z`（当刻已超 1 小时）、`comments=0`；`git status --porcelain -- packages/skill-calorie/src/weight/log.ts` 为空。未触发让路，照票面开工。

## 一、影响清单（结构纪律第一步）与交付对账（第五步）

| # | 文件 | 一句话与理由 | 对账 |
|---|---|---|---|
| 1 | `packages/skill-calorie/src/weight/log.ts`（来源行一带） | 体重能力：删 `deliveryBlocks` 内 `+ renderCaliberLine('📊 数据来源：' + sourceText)` 一段；`sourceText` 转进 `copyLog.source`（技术原件）保留；`renderCaliberLine` import 清 | 落：调用删、注释换 #560 注记、空窗注释同步一句，写命令入参落库段一行未动 |
| 2 | `packages/skill-calorie/test/560-weight-no-source.test.mjs`（新建） | 本票验收用例：主盘与空窗两窗可见文本零命中＋载荷仍在＋变异 | 落：4 条测试全绿 |
| 3 | `docs/skills/skill-calorie/560-weight-no-source.md`（本件）＋ `560-weight-run.log` | 证据与长输出日志（文件名带票号） | 落 |

偏差：零。事前清单与事后对账逐行对得上。
禁区（均未碰）：`log.ts` 内写命令入参落库段（`writeWeightLog`／`writeWeightBatch`）、其余 weight 件（`history.ts`／`compare.ts`／`review.ts`／`plateDocs.ts` 等）、`today.ts`／`routes.ts`／公共层（`base-paint` helper 本身保留）。

## 二、结构设计（第二步）

无新目录。`log.ts` 对外接口不变（`viewWeight`／`buildWeightDashboard` 签名与导出数不变，主盘与空窗共用 `deliveryBlocks` 一并处理）；测试新件只读公开出口（CLI 真跑 `calorie.view.weight` 两窗）与 `data-t` 载荷；无共用件新增，无跨能力引用。

## 三、超线报警（第四步）

已超线，需要根据规则进行重构。超因：本件同时住着「读页取数与整页装配」（`viewWeight`／`buildWeightDashboard`／两个 `build*Doc`）＋「两条写命令的入参与落库」（`writeWeightLog`／`writeWeightBatch`），与台账 `src/weight/log.ts` 行一致（挂号值 —，当场实测 LF=402，未越线新增：改前 402 → 改后 402）。
本次先不拆：拆分不在 #560 写集（票面只许动来源行一带），拆法照台账已写好的那条＝按「读／写」切两件姊妹件：读面留本件，写面另立 `weight/logWrite.ts`，`signed`／`windowDays`／`rangeTextOf` 提为共件；待收口票认领。

## 四、改动明细

- `log.ts:41-46`：`base-paint/blocks` import 清 `renderCaliberLine` 一名（本件他处无用；helper 本身保留，别家页在用）。
- `log.ts:232-244`：`deliveryBlocks` 注释换 #560 注记（含裁决全文引用）；`copyLog({ command, … })` → `copyLog({ command, source: sourceText, … })`；`+ renderCaliberLine('📊 数据来源：' + sourceText)` 整段撤，函数只回 `copyArea(…)`。
- `log.ts:338`：空窗注释「复制区、数据来源行一件不少」→「复制区一件不少（#560 屏上来源行已撤，来源只留复制载荷）」。
- 主盘 `sourceText = '体重记录 ｜ 窗口 ' + rangeText + ' ｜ 共 N 条'` 与空窗 `… ｜ 共 0 条` 两处定义一字未动（只换去向：由屏上改走载荷）。

## 五、测试读数（均走 `node tooling/run-locked.mjs --ticket 560 -- …`，长输出见 `560-weight-run.log`，回执只看尾 5 行）

- 编译：`npx tsc -b packages/skill-calorie` → exit=0。
- 新用例：`node --test 560-weight-no-source.test.mjs` → tests 4 / pass 4 / fail 0。
- 旧用例回归：`node --test 560-no-source.test.mjs` → tests 6 / pass 6 / fail 0（含体重排队注记，在即绿）。
- 本页回归抽查：`cmd-registry-294` 中体重两条（新路／能力门）绿；该件 `#320` 一条红系并发窗口他票残留（`composition-wizard`／`measure-wizard`），与本票无关（见 §七）。

## 六、变异自证（两行读数，真码变异＋重建）

- 改坏（`log.ts` 加回 import 一名 ＋ `+ renderCaliberLine('📊 数据来源：' + sourceText)` 一段，重建后跑体重用例）：tests 4 / pass 1 / fail 3，exit=1，必红 ✓。
- 还原（撤掉加回的两处，重建后同命令）：tests 4 / pass 4 / fail 0，exit=0，必绿 ✓。
- 另有字串级自证（用例第 ③ 条）：`T560W-MUT 主盘改坏红=1 还原绿=1；空窗改坏红=1 还原绿=1`。

## 七、遗留与终审

- `cmd-registry-294` 的 `#320` 红（`calorie.view.composition-wizard`、`calorie.view.measure-wizard` 在分派层仍有字面量）是并发窗口他票在途件，非本票引入：本票 `git diff` 只含声明三路（见 §一），未碰 `src/cli` 任何件。
- 390 真浏览器量尺与最终版式按票面归用户肉眼终审（本件只做静态守卫：复制区仍在、文档壳完整）。
