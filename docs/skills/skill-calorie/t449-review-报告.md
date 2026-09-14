# #449 独立对抗审查报告

判定：**PASS**（五维 95/100；无 S1）。交付的可见文本确实不再印参数名；标签单源与缺项回退两条口径都真在身上；`#264` 五原字零回归。

## 一、机器证据段（`node tooling/run-locked.mjs --ticket 449 -- …` 内跑）

| 门 | runId | 读数 |
|---|---|---|
| `pnpm build` | `65bbd9d2-6097-4a09-86af-5d95394b32d7` | exit 0 |
| 新判据 `field-labels-449.test.mjs` | `9e050fd3-39e0-461d-aa67-9792ec432139` | exit 0，**17/17**（waitedMs=60072，他席持锁，正常排队） |
| `node --test exercise-receipt-264.test.mjs` | `51152e47-a69a-4d96-bd93-bd3a075c433a` | exit 0，**13/13** |
| `exercise-receipt-fusion-423.test.mjs` | `f48a0e16-05ea-4f29-b013-08a5fdeb5f36` | exit 0，**20/20** |
| `check-warning-line.mjs` | `3e09eaee-81d8-435e-b246-50f88d44f8a1` | exit 0，`RESULT: 60/60` |

**告警线归因**：首次复跑红（runId `506850cb-…`）报四处台账陈化——`trendDocs.ts`826→892、`trendMiscPortDocs.ts`571→592、`multiTrendPage.ts`490→501、`wizardPort.ts`265→266，全是**他席在途改动**撑起来，本票一行未碰；他席补台账后复跑 60/60。本票两件 LF：`fieldLabels.ts` **33**、`receipt.ts` **341**，均在 350 以内，未新增扫描面内件。

## 二、自设变异两处（都不照抄实施席那两处）

| 变异 | 改哪 | 读数 | 还原后 |
|---|---|---|---|
| ① `duration_minutes` ↔ `calories_burned` 的**中文对调** | `src/exercise/fieldLabels.ts` | 判据件 **exit 0，17/17**（`264`／`423` 同样绿）——见缺陷 1 | 原字节写回（sha256 `6882EA1B…`＝True）、刷 mtime |
| ② 缺项回退**原键名** → 回退**空串**（`? label : key;` → `? label : '';`） | `src/shared/fieldLabel.ts`（临时） | 判据件 **exit 1，15/17**，红的是 ③a／③b：`AssertionError: 缺项必须回退原键名`、`页面端到端：表里没有的字段键应原样印出` | 原字节写回（sha256 `92B91B5D…`＝True）、`git status` 无该件、重建后 exit **0**（17/17） |

变异①的**留痕限制照实记**：本席多次 `pnpm build`／`npx tsc -b` 后读 `dist/exercise/fieldLabels.js`，读到的始终是未对调的表（`docs`／`packages` 下各只有一份该文件；`tsconfig.tsbuildinfo` 时间戳在动、`dist` 不动；另有他席并发跑 `pnpm build`）。故「源件已对调」有字节比对为证，但**「dist 里那份表也换了」未能独立证实**，① 的绿读数不排除是 dist 未更新的结果——本报告不拿它当判据证据，缺陷 1 改由「判据件里根本没有这一条断言」直证（第二节文字＋§四）。

## 三、自设探针（`docs/skills/skill-calorie/t449-review-probe.mjs`，基线 **18/18 PASS**）

- **① 13 条写词逐条**：可见文本（剥样式／脚本→剥标签→解实体→收敛空白）里参数名两套口径（31 键）**13 条全 0 命中**；剩余 `snake_case` 形态 token 只剩 `["exercise_log","total_changes"]`——编排者已裁定的非参数名，照实打读数、不判红。
- **② 标签单源**：全仓「运动域列键→中文标签」绑定**命中文件数＝1**＝`packages/skill-calorie/src/exercise/fieldLabels.ts`；`registerFieldLabels(` 调用（除定义件）也＝1，同一份。
- **③ 两卡一致**：写入字段卡（`sec-count` 与口径行之间的 KPI 网格切片）与字段变更卡（`sec-change`）逐条比对**审查席自带独立对照表**（不拿实施席那张表当基准）：写入字段卡 16／2／1 项中文全中；变更卡按「标签近旁 40 字内须是本页已知真值」反查，13 条全配得上（改类「时长 30 分钟 → 40 分钟」、删类删除前快照）。
- **④ 副标题改写不动机器载荷**：喂带表外键的 `summary`，表外键与 `ID 7` 原样留、`data-fmt` 仍＝`["text","json","csv"]`。

**逐条核票面**（`.scratch/t449-review/ticket-check.mjs`）：13 条产物 `assertDocPage` **13/13**；`#264` 五原字 **13/13**（删类当日零行、当日累计整卡不出现，按 `#423` 空判定口径，非回归）。

## 四、缺陷段

1. **判据件没有「字段 ↔ 中文」绑定判据（本票引入，属本票范围）**：`field-labels-449.test.mjs` 里带具体中文的绑定断言**只有一条**（`:215` `fieldLabel('exercise','duration_minutes')==='时长'`）；其余靠 ④「纯中文＋取自表本身」与 ①「零参数名」兜。两键中文**对调**这类错——用户可见文本把「消耗」印在时长行上——**落在判据盲区**（不编中文、不印参数名，两条都过）。实跑佐证：变异①下判据件仍 exit 0。建议随下一票补一张「字段→中文」独立对照表判据。产品交付内容本身是对的，记 **S2**。
2. **证据件读数不可独立复现（本票引入，留痕口径）**：`t449-字段中文标签.md` §六 逐条列了 runId 与 `60/60`，但**未记读数时刻**；本席复跑时台账正被他席改动撑着红过一轮，读者无法判断那 `60/60` 属于哪个时刻。
3. **`shared/fieldLabel.ts` 的空串分支无判据（范围外 S3）**：③a／③b 只钉「缺项＝原键名」，`label !== ''` 这一支没有判据；本票不许改该件接口。
4. **摘要仍在写侧按库列名给（范围外 S3）**：`exercise/edit.ts` 侧 `duration_minutes` 口径未动，证据件 §八 已明记。

## 五、五维分

判据质量 **22**/30（缺陷 1、2）｜证据与留痕 **21**/25｜边界与范围 **19**/20（票面禁改件一行未碰、工作区干净）｜复现与可双击 **14**/15（13 份样例在位、探针可复跑）｜用词与结构 **19**/20（告警线以内、用词照 `docs/agents/wording.md`）＝**95/100**。
