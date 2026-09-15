# #560 来源脚注删（主页＋饮食两处；体重片排队不动）· 证据件

票面：`gh issue view 560`「卡路里场景 01：五页来源脚注删除（体重片排队等505窗口）」（Part of #162）。
用户裁决原文（改动注释与测试注释逐条引用同一句）：
「用户 2026-09-15 点名：所有 HTML 页面底部的「数据来源：xxx」都删掉（用户直接看得见按钮与内容，不需要脚注复读来路）。」

## 一、影响清单（结构纪律第一步）与交付对账（第五步）

| # | 文件 | 一句话与理由 | 对账 |
|---|---|---|---|
| 1 | `packages/skill-calorie/src/home/homeDocs.ts` | 主页能力：删屏上 `renderCaliberLine('数据来源：' + SOURCE_LOGGED)` 一句；`copyLog.source`（技术原件）保留 | 落：调用删、注释换 #560 注记，`SOURCE_LOGGED` 常量与 `copyLog` 未动 |
| 2 | `packages/skill-calorie/src/render/dietDocs.ts` | 饮食装配：删屏上 `sourceLine({ source: '饮食记录', ... })` 一句；`sourceLine` helper 与 `listPageCopy` 载荷保留 | 落：调用删、注释换 #560 注记（2 行，LF 守住 350），import 留（helper 本身保留） |
| 3 | `packages/skill-calorie/test/diet-list-t271.test.mjs` | 本页矛盾断言：直调空窗＋真跑两处由“有”改“零命中”，逐条引裁决 | 落：2 处断言＋1 处 import（`stripCopyPayload`）＋注释 |
| 4 | `packages/skill-calorie/test/560-no-source.test.mjs`（新建） | 本票验收用例：两页零命中＋载荷仍在＋体重排队注记＋390 静态＋变异 | 落：6 条测试全绿 |
| 5 | `docs/skills/skill-calorie/560-no-source.md`（本件）＋ `560-run.log` | 证据与长输出日志（文件名带票号） | 落 |

偏差：`t271-总览接线与两态.test.mjs` 曾试按分支拆判，查明其 CLI 空窗走禁区件（`today.ts → nutritionPortDocs.ts` 空窗共用件），不属本票两处，已整段还原，零残留（`git diff` 无此件）。
禁区（均未碰）：`src/weight/log.ts`（等 #505 窗口）、`sourceLine`／`renderCaliberLine` helper 本身、`today.ts`／`routes.ts`、公共层、别家目录、别家页来源断言（`t272`／`t273`／`t275`／运动各页一行未动）。

## 二、结构设计（第二步）

无新目录。两源码件对外接口不变（`buildHomeDoc`／`buildViewDietDoc` 签名与导出数不变，目录内调用只减不加）；测试新件只读两页公开出口（CLI 真跑＋直调装配）与源码只读注记；无共用件新增，无跨能力引用。

## 三、超线报警（第四步）

当场实测（LF 口径）：`src/home/homeDocs.ts` LF=334（台账 334，不变，未越线）；`src/render/dietDocs.ts` LF=350（守住 350，未越线；中途 3 行注释曾到 351，已压回 2 行注释回到 350）。
结论：两件均未越线，不触发「已超线，需要根据规则进行重构。」。

## 四、改动明细

- 主页：`homeDocs.ts` 内容组装删屏上来源行一句，`renderCaliberLine` import 留（helper 本身保留，别家页在用；本包 `noUnusedLocals` 未开，编译绿）。
- 饮食：`dietDocs.ts` 删屏上 `sourceLine` 一句，`sourceLine` import 留（同上）；`renderCaliberLine` 另三处口径行未动。
- 测试（只改本两页相关）：
  - `diet-list-t271` 直调空窗：`assert.ok(empty.includes('数据来源'))` → `assert.ok(!empty.includes('数据来源') && !visibleText(empty).includes('数据来源'))`（注释引裁决全文）。
  - `diet-list-t271` 真跑：`assert.ok(r.html.includes('数据来源'))` → `assert.ok(!visibleText(stripCopyPayload(r.html)).includes('数据来源'))`（剥载荷后判屏上，载荷保留见 560 用例）。
  - `t271-总览接线`：不改（CLI 空窗属禁区件，见下）。

## 五、关键发现（CLI 空窗归属，决定断言口径）

- 直调 `buildViewDietDoc` 空窗（`dietDocs.ts` 装配）：改后 `数据来源` 0、`饮食记录` 1（载荷保留）。✓
- CLI `calorie.view.diet` 有数窗（`buildViewDietDoc` 常规支）：改后 `数据来源` 0；原样即无日志载荷（命令原文未接线，按编排者裁定归 #276 席），故 560 用例不判它有载荷。✓
- CLI `calorie.view.diet` 空窗：走 `src/home/today.ts:103-113 → src/diet/nutritionPortDocs.ts:159 buildEmptyWindowDoc`（footnote 在 `today.ts:110`），两件皆禁区，本票不碰，脚注仍在（`📊 数据来源 · 饮食记录 · 2020-01-01 → 2020-01-07`）。560 用例对此只注记不断零命中（在即绿），`t271-总览接线` 原断言保留。另票收口。
- 体重页：`src/weight/log.ts:243` 来源行仍在（读源码注记断言绿），等 #505 窗口另派。

## 六、测试读数（均走 `node tooling/run-locked.mjs --ticket 560 -- …`，长输出见 `560-run.log`，回执只看尾 5 行）

- 编译：`npx tsc -b packages/base-render packages/skill-calorie` → exit=0。
- 新用例：`node --test 560-no-source.test.mjs` → tests 6 / pass 6 / fail 0。
- 本页回归：`diet-list-t271` 6 条 ＋ `t271-总览接线` 9 条 → tests 15 / pass 15 / fail 0。
- 形状守卫：`t401-可见文本守卫`＋`t401c`＋`396`＋`551` → tests 17 / pass 17 / fail 0。

## 七、变异自证（两行读数）

- 改坏（`dietDocs.ts` 加回 `parts.push(sourceLine(…))` 一行，重建后跑 560 用例）：tests 6 / pass 4 / fail 2，exit=1，必红 ✓。
- 还原（删掉加回那一行，重建后同命令）：tests 6 / pass 6 / fail 0，exit=0，必绿 ✓。
- 注：最终注释压行（3→2 行）是纯文本改动，行为不变；压行后重跑 `560 ＋ diet-list-t271` → tests 12 / pass 12 / fail 0。

## 八、390 回归

静态形状守卫（560 用例第 ③ 条）：两页页内导航＋复制区都在；饮食页 `flex-wrap:wrap` 在（#551 形状未动）。真浏览器量尺按票面归视觉用户肉眼终审。

## 九、遗留出口

体重片排队（#505 窗口释放后另派）；CLI 空窗共用件（`today.ts:110` footnote＋`nutritionPortDocs.ts:159` 装配）另票收口；运动随 #552、目标随 #467（本票记账不重复做）。
