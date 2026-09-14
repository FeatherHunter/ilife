# T351 修复证据：order201–207 复制区双按钮（实施兵A）

范围：只做 7 个结果型（201 计划复盘本周／202 本月／203 全部／204 完成率／205 未完成／206 动作完成率／207 扫禁忌）。
176–195 一字未动；issue 未动；命令登记未动。

做法（融合方案“复用新卡片只修复制区”）：头部/KPI/图表/明细不动，只换底部复制区装配——
三格式菜单（`dataCopyArea`）→「复制数据／复制日志」双按钮（`renderCopyBlock({ dataText, logText })`
单格式直挂），共用页面双通道运行时（剪贴板→命令兜底＋已复制态＋提示），文本走承载属性
`data-t`，零内联脚本。201–206 去掉与按钮同名的块标题；207 保留既有中文块标题「复制修改指令」
（与按钮不同名，且单测钉死该串）。

## 一、写集合对账（偏差零）

| 文件 | 改动 | 着落 |
|---|---|---|
| `packages/skill-calorie/src/render/sportPortDocs.ts` | 加本地非导出 `reviewCopyBlock`，`buildReviewDoc` 复制区改调它；其余 5 构建函数不动 | 对上 |
| `packages/skill-calorie/src/render/trendDocs.ts` | 加本地非导出 `contraCopyBlock`，`buildContraDoc` 复制区改调它；其余构建函数不动 | 对上 |

复用只读不改：`base-paint` 的 `renderCopyBlock`／`buildDataText`／`buildLogText`（`render/` 已有进线方向）、
`shared/copyArea` 的 `copyLog`、`render/receipt` 的 `nowStamp`。零新增导出，零新概念。
日志第 4 段命令：复盘 `calorie-cmd-read calorie.view.exercise-review`（来源 `workout_plans ＋ exercise_log（只读）`）；
禁忌 `calorie-cmd-read calorie.view.contraindication`（来源 `workout_plans（只读）`）；第 5 段取渲染时刻＋版本。

超线报警：`sportPortDocs.ts` 505 行、`trendDocs.ts` 785 行，均已超 350 线（LF 口径）。
已超线，需要根据规则进行重构。超因：两件各装多页文档同处一处；本次先不拆：融合方案限定只修复制区，
拆分属另票；包内检查脚本台账只钉两件，本次不扩台账。

## 二、机器证据

- 类型检查：`tsc -b packages/skill-calorie` exit 0（中途一次字面量 widen 已收敛为 `DataTextInput` 上下文类型）。
- 单测：`trend-homogeneity-110`＋`copy-component-179` 18/18 绿；`exercise-port-111` 11/12——
  绿的含「计划复盘」「复制头与冻结 envelope 版本对齐」；唯一红是「唤醒词→键」路由断言
  （`看运动记录（按力量筛选）` 命中漂移），路由层零引用本次两件，属现网并发改动遗留，与本票无关。
- 真机（持锁）：`node tooling/run-locked.mjs --ticket 351 -- node .scratch/t351-fix/run-201-207.mjs`
  → 7/7 exit 0，种子与预演同口径，库隔离在 `.scratch/t351-fix/dbs/`，明细见 `.scratch/t351-fix/detail.json`。
- 机检：`node .scratch/t351-fix/check-201-207.mjs` → ALL7 PASS（双冻结 id `ilife-copy-data`／`ilife-copy-log`，
  正文区零 `copy-menu`／`data-fmt`／`▾`，可见正文零裸字段名，零内联事件属性）。

## 三、逐份路径（双击可打开）

| order | 路径 | 字节 | 双按钮 | 无英文菜单 | 无明文泄漏 | 可打开 |
|---|---|---|---|---|---|---|
| 201 | `D:\ilife\.scratch\t351-fix\order201-result.html` | 63532 | 过 | 过 | 过 | 过 |
| 202 | `D:\ilife\.scratch\t351-fix\order202-result.html` | 64610 | 过 | 过 | 过 | 过 |
| 203 | `D:\ilife\.scratch\t351-fix\order203-result.html` | 65103 | 过 | 过 | 过 | 过 |
| 204 | `D:\ilife\.scratch\t351-fix\order204-result.html` | 64302 | 过 | 过 | 过 | 过 |
| 205 | `D:\ilife\.scratch\t351-fix\order205-result.html` | 64302 | 过 | 过 | 过 | 过 |
| 206 | `D:\ilife\.scratch\t351-fix\order206-result.html` | 64302 | 过 | 过 | 过 | 过 |
| 207 | `D:\ilife\.scratch\t351-fix\order207-result.html` | 60643 | 过 | 过 | 过 | 过 |

注：`gh issue view 351 --comments` 实测评论数为 0（标题“卡路里场景 05：真机端到端＋肉眼终审”），无可读评论。

## 四、未做＋下一手

- 未做：176–195（归另兵）、路由漂移单测（归路由票）、两件超线拆分（另票）。
- 下一手：用户逐份双击上表 HTML 肉眼终审（壳、版式、中文、双按钮）；通过即收。

## 五、补丁兵补 id（data-action-id 不动，功能不动）

- 做法：两件本地复制块 `renderCopyBlock({...})` 后各加两行 `.replace`，把
  `data-action-id="ilife-copy-data"` 前补 `id="ilife-copy-data"`、
  `data-action-id="ilife-copy-log"` 前补 `id="ilife-copy-log"`；不碰 `base-paint`、
  不改文本/逻辑/运行时（委派仍读 `data-action-id`）。
- 类型检查：`npx tsc -b packages/skill-calorie` exit 0。
- 持锁重跑：`node tooling/run-locked.mjs --ticket 351 -- node .scratch/t351-fix/run-201-207.mjs`
  → `{"total":7,"fails":[]}`；`node .scratch/t351-fix/check-201-207.mjs` → ALL7 PASS。
- 新鲜 7 份 grep（前导空格口径，避开 `data-action-id` 子串误计）：
  ` id="ilife-copy-data"` 7、` id="ilife-copy-log"` 7、
  `data-action-id="ilife-copy-data"` 7、`data-action-id="ilife-copy-log"` 7，
  即每份双 `id` 各一且与原 `data-action-id` 双通道并存。

## 六、面包屑修复兵：眉标首段改中文（order201–207）

判定：order201–207 七份的眉标（面包屑行，B-01 壳的 `<p class="ilife-block-page-shell-eyebrow">`）
首段原露英文命令键；本次改成该命令**已有的**中文 title，零新概念。176–185（`workoutPlanDocs.ts`）
与 195 一字未动；他票文件、issue、命令登记未动。

定位：渲染点＝`src/shared/docPage.ts` 的 `assembleDocPage({ eyebrow })` → `base-paint/blocks` 的
`renderPageShell`（眉标只此一处落笔）。201–206 走 `sportPortDocs.ts` 的 `buildReviewDoc`，
207 走 `trendDocs.ts` 的 `buildContraDoc`。

| 渲染点 | 改前 | 改后 | 中文名来源 |
|---|---|---|---|
| `sportPortDocs.ts` `buildReviewDoc` | `calorie.view.exercise-review · 运动移植域` | `计划复盘 · 运动移植域` | `cli/keys.ts` 生成件的 `CALORIE_COMBOS['calorie.view.exercise-review'].title` |
| `trendDocs.ts` `buildContraDoc` | `calorie.view.contraindication · 趋势分析域` | `禁忌扫描 · 趋势分析域` | 同上，`CALORIE_COMBOS['calorie.view.contraindication'].title` |

改法：每处只换眉标字符串一行，另加两行说明注释（`trendDocs.ts` 其余在飞改动非本兵所写，未碰）。
中文名不另立来源：命令名的中文真值本就是 `CALORIE_COMBOS[key].title`（`output.ts:73` 同口径）。

机器证据：

- 类型检查：`pnpm exec tsc -b packages/skill-calorie` 连跑三次，**本票两件零诊断**；
  包级 exit 1，三次的唯一红全在 `packages/skill-calorie/src/weight/compare.ts`
  （行号 151／201／212… → 247／294 → 258 逐轮漂移，mtime 15:00:57 晚于本兵改动 15:00:29），
  属并发在飞的他票件（`docs/skills/skill-calorie/t377-配对页-证据.md` 同批），非本票文件，按红线未碰。
- 收尾复跑（同一条命令，第四读）：`exit 0`、零 error——上面那件在飞的他票文件已由对方改完落定；
  本票两件四次连跑始终零诊断，`dist/render/` 两份也已按新眉标出件（`sportPortDocs.js:419`／`trendDocs.js:399`）。
- 持锁复跑（口径照 `run-201-207.mjs`，产物另落 `final-v2/201-207/`）：
  `node tooling/run-locked.mjs --ticket 351 -- node .scratch/t351-fix/run-201-207-v2.mjs`
  → `waitedMs=0`，`{"total":7,"fails":[],"breadcrumbs":["201=计划复盘 · 运动移植域",…,"207=禁忌扫描 · 趋势分析域"]}`。
- 机检：`node .scratch/t351-fix/check-201-207-v2.mjs` → `ALL7 PASS`（双按钮 ＋ 冻结 id ＋
  正文区零 `copy-menu`／`data-fmt`／`▾` ＋ 可见正文零裸字段名 ＋ 零内联事件属性 ＋ **眉标无 ASCII 字母**）。

逐份读数（`node .scratch/t351-fix/readout-201-207-v2.mjs`）：

| order | 路径 | 字节 | 眉标 | 复制数据／复制日志按钮 | `id="ilife-copy-data"`／`-log` |
|---|---|---|---|---|---|
| 201 | `D:\ilife\.scratch\t351-fix\final-v2\201-207\order201-result.html` | 63850 | 计划复盘 · 运动移植域 | 1／1 | 1／1 |
| 202 | `D:\ilife\.scratch\t351-fix\final-v2\201-207\order202-result.html` | 64928 | 计划复盘 · 运动移植域 | 1／1 | 1／1 |
| 203 | `D:\ilife\.scratch\t351-fix\final-v2\201-207\order203-result.html` | 65421 | 计划复盘 · 运动移植域 | 1／1 | 1／1 |
| 204 | `D:\ilife\.scratch\t351-fix\final-v2\201-207\order204-result.html` | 64620 | 计划复盘 · 运动移植域 | 1／1 | 1／1 |
| 205 | `D:\ilife\.scratch\t351-fix\final-v2\201-207\order205-result.html` | 64620 | 计划复盘 · 运动移植域 | 1／1 | 1／1 |
| 206 | `D:\ilife\.scratch\t351-fix\final-v2\201-207\order206-result.html` | 64620 | 计划复盘 · 运动移植域 | 1／1 | 1／1 |
| 207 | `D:\ilife\.scratch\t351-fix\final-v2\201-207\order207-result.html` | 60813 | 禁忌扫描 · 趋势分析域 | 1／1 | 1／1 |

抽查 order201（`node .scratch/t351-fix/spot-201-207-v2.mjs`）：眉标 `计划复盘 · 运动移植域`，无 ASCII；
`>复制数据</button>`／`>复制日志</button>` 各 1；命令键 `calorie.view.exercise-review` 在页内仅剩
两处，均在复制日志的承载属性 `data-t`（「场景标识」「调用链」两段），属复制契约（复制日志要能照抄重跑），
不在面包屑里。order207 同读法一致（眉标 `禁忌扫描 · 趋势分析域`）。

未做：176–185／195、他票在飞件（`weight/compare.ts` 等）、路由与 issue；
同两件里其余页（strength／cardio／distribution／recap／trend、predict／anomaly 等）眉标仍为英文键，
属别的 order 段，不在本票范围，留给对应票。

超线报警：本次改动后 `sportPortDocs.ts` 533 行、`trendDocs.ts` 816 行（各 ＋2 行注释），
均仍超 350 线（LF 口径）。已超线，需要根据规则进行重构。超因与拆法见本文件第 24–26 行旧节；
本次先不拆：本票限定眉标一处，拆分属另票。

新增件（全在 `.scratch/t351-fix/`，不动早前 `run-201-207.mjs`／`check-201-207.mjs`／顶层 7 份）：
`run-201-207-v2.mjs`（复跑，产物落 `final-v2/201-207/`）、`check-201-207-v2.mjs`（判据机检）、
`spot-201-207-v2.mjs`（201／207 逐处抽查）、`readout-201-207-v2.mjs`（逐份读数）。
