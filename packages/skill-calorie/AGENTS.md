# skill-calorie 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记一条本包自己的数字。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts` 与包内 `scripts/**/*.mjs`。**生成物不算**——剔除名单只认生成器自己的输出声明
  （`scripts/gen-*.mjs` 里名字带 `OUT`／`TARGET(S)`／`DST`／`DEST`／`GEN…` 段的 `const <名> = join(SRC_DIR, …)`，
  与 `targets` 数组里的 `path: join(SRC_DIR, …)`），不手写一份会过期的名单；判据一条输出声明都抽不到即红。
  当前剔出三件：`src/cli/keys.ts`、`src/cli/registry.ts`（`scripts/gen-cli.mjs` 生成）、
  `src/triggers/routes.generated.ts`（`scripts/gen-cli.mjs`／`scripts/gen-routes.mjs` 生成）——重跑 `pnpm gen`
  改它们不会逼无关的票来同步台账。**手写的 `src/triggers/routing.ts` 仍在扫描面内**：它 import 生成物，
  但本身是人写的逻辑与类型再导出件（`src/triggers/routeSpec.ts` 同），人改了它就照常挂号。
- 不算：`templates/*.html`（页面模板）、`SKILL.md`（说明面）、`test/*.mjs`（测试文件）、`dist/` 与 `.tsbuildinfo`（构建产物）——`structure.md` 的「管辖」一节已把它们划在外面。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」，后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**

口径出处：**用户答复**（私家大厨那张图的 Q4b，逐字「`350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md`」，载 `docs/skills/skill-chef/map-chef-body.md:197`／`:212`）。同数、同落点的兄弟件是 `packages/skill-chef/AGENTS.md`（本文件与它同数、同落点）。`structure.md` 要求这条数字写在各包自己的地方。

## 台账两种口径（别混用）

- **挂号值**＝**第一次挂号时**写的 LF。它是历史事实（那时确实超线），**永不回改**；需求原文里的冻结值是 `src/render/wizardPort.ts｜457`、`scripts/gen-cli.mjs｜729`（来源＝`docs/skills/skill-calorie/t169-设计定稿.md` 票 2 票面）。检查脚本只核对这两个冻结值**没被改写**，不拿它们跟实况比。从未挂号过的件记 `—`。
- **当场实测**＝**当刻盘上**数出来的 LF，节点口径 `readFileSync(f,'utf8').split('\n').length - 1`。台账表里**只有这一列**是 `check-warning-line.mjs` 拿来对实况的：与实况不等即红（这就是「台账陈化」）。
- 某个件的 LF 掉回 350 以内：**挂号行不删**（挂号值仍是历史事实），但「当场实测」列要跟着实况改，结论列写明「已落回线内、不再触发第四步」。

## 台账（`check-warning-line.mjs` 的解析源）

下表是本包告警线的**唯一台账**：`件`＝扫描面内的文件；`挂号值`＝首次挂号时的 LF（从未挂号记 `—`）；`当场实测`＝本表成文当刻的 LF（脚本核对的就是这一列）；`结论`＝超线原话＋超因＋拆法或「本次先不拆」的理由。**改这张表就是改台账；表外别处不再写行数**（免得两处走散）。

<!-- warning-line-ledger:begin -->
| 件 | 挂号值 | 当场实测 | 结论 |
|---|---|---|---|
| `src/triggers/wake-assets.ts` | — | 4747 | 超因：全量唤醒词资产（逐字落地老实物 HELP 的 typed TS module，见件头「唯一事实源」）与代码同处一件，数据面占了绝大多数行。 |
| `src/render/trendDocs.ts` | — | 826 | 超因：趋势／分析域同质文档装配（数据→区块→填充器）全挤在一件里。 |
| `scripts/gen-cli.mjs` | 729 | 754 | 「#354 挂号原文」超因：命令汇总派生与生成物写回同处一个一次性脚本；本次先不拆：拆分本身不在 #354（该票只登记），拆法待后续票确定。 |
| `src/render/sportPortDocs.ts` | — | 702 | 已超线，需要根据规则进行重构。超因：#111 运动移植 6 键的全文档装配（数据→区块→填充器）同处一件——#453 把分布／力量／有氧三键换成融合版式（卡清单逐卡判空＋页内导航＋口径行＋来源脚注＋三格式复制区＋空态指引），单件继续变长。本次先不拆：本票（#453）只做这三页版式，同件的趋势／复盘两支是第 5 票（#454）的地盘、一行不碰；拆法＝第 5 票落地后按页族切姊妹件（分布／力量／有氧一族 与 趋势／复盘一族分住两件），把两族共用的卡装配、导航、色映射提为一件共件，出口留本件薄转出。 |
| `src/weight/history.ts` | — | 681 | 超因：「看体重明细」与「看体重曲线」在命令面上是同一个命令，两条子功能共用一件。 |
| `src/render/html.ts` | — | 647 | 超因：T8～T10 的多套 HTML 串模板（饮食／总览／照片层等）同处一件。 |
| `src/weight/review.ts` | — | 599 | 超因：体重复盘三形态的判别式与页面装配同处一件。 |
| `src/render/trendMiscPortDocs.ts` | — | 571 | 超因：#113「趋势 2＋其他 6」共 8 键的 HTML 填充器同处一件。 |
| `src/workout/write.ts` | — | 570 | 超因：训练计划 10 个写处理函数（创建类 5＋变更类 5）同处一件。 |
| `src/weight/compare.ts` | — | 555 | 超因：对比体重的主窗口／对比窗口两套参数与对比算式同处一件（算式另有姊妹件 `weightCompare*.ts`）。 |
| `src/render/exercisePort.ts` | — | 541 | 超因：#111 运动移植 6 键取数（行源＋分类口径）同处一件。 |
| `src/migrate/migrate.ts` | — | 494 | 超因：老库到新 schema 的一次性迁移（13 表重建口径）全在一件里。 |
| `src/analysis/multiTrendPage.ts` | — | 490 | 超因：通用分析页最小形态的整页装配与图／表／复制区调用同处一件。 |
| `src/photo/helpCenter.ts` | — | 485 | 超因：#88 HELP 速查台的数据模型与页面装配同处一件。 |
| `src/render/trendMiscPort.ts` | — | 456 | 超因：#113 八模板取数（计数 6＋4＋8 闭合）同处一件。 |
| `src/analysis/commands.ts` | — | 443 | 已超线，需要根据规则进行重构。超因：（**#376～#378 引入**）分析域 14 个键的**声明**与按子功能分段的**处理函数**同处一件——本票给分析域加了 `calorie.view.multi-trend` 的声明与薄转调（取数 `multiTrend.ts`／装配 `multiTrendPage.ts` 已分住姊妹件），声明面仍集中在本件；本次先不拆：拆分不在 #376～#381 写集，拆法待后续票——把处理函数按子功能切成姊妹件（组合分析／整体趋势／对照），声明面留本件，出口经 `analysis/index.ts` 转出。 |
| `src/profile/setup.ts` | — | 428 | 超因：#179 三条写入词共用的写前页与 #175 补的写后回执页同处一件。 |
| `src/diet/nutritionPortDocs.ts` | — | 423 | 超因：#112 营养 4 页的全文档装配（数据→区块→填充器）同处一件。 |
| `src/analysis/reportPlate.ts` | — | 406 | 已超线，需要根据规则进行重构。超因：（**#384 在途件**）报告子形态的取数与聚合（1 个多态底座 9 个 kind：bmi／tdee／bmr／protein／water／score／trend／compare）与页面装配同处一件；本次先不拆：本票（#445）只做告警线门与台账对齐、不改任何件源码，拆法待该件归属票认领。 |
| `src/fetch/body.ts` | 369 | 406 | 「#398 挂号原文」超因：读侧来源词（`SOURCE_FILTER_ALL`／`SourceFilter`／`assertSourceFilter`）与按来源分组取数（`trendCompositionBySource`／`compositionSourceCount`），与既有写侧校验（`validateCompositionInput`）＋围度取数同处一件；#398 先不拆：拆分不在该票写集，拆法待后续票（按「写侧校验／围度取数／体成分取数」切姊妹件）。**该件在 #445 当场实测比挂号值又涨；本行「当场实测」列随实况改，挂号值 369 不回改。** |
| `src/workout/planStore.ts` | — | 369 | 超因：T4 计划取数＋写数（校验三硬止＋两软提示、全量覆盖写）同处一件。 |
| `src/diet/nutritionPort.ts` | — | 367 | 超因：#112 营养 4 键取数与 #275 追加的「看饮食总览」视图同处一件。 |
| `scripts/build-help.mjs` | — | 362 | 已超线，需要根据规则进行重构。超因与拆法待补（本行由 `--sync` 自动补出，请补写超因与拆法）。 |
| `scripts/check-warning-line.mjs` | — | 356 | 已超线，需要根据规则进行重构。超因：（**#445 引入**）本件由 80 行的「`REQUIRED` 硬清单存在性」扩成「扫描面 ＋ 台账逐件对账 ＋ 生成物按生成器声明剔除 ＋ 仓内同步器（`--sync`／`--sync --dry`）」，判据由 4 条涨到 9 条、另加两条自证；本次先不拆：拆分不在 #445 写集，拆法＝按判据族切姊妹件（① 扫描面遍历与生成物剔除 ② 台账解析与逐件对账 ③ 同步器与同步断言 ④ 主入口与报告），出口留本件薄转出。 |
| `src/render/sportDocs.ts` | — | 351 | 已超线，需要根据规则进行重构。超因：（**#452 引入，越过 350**）运动两页（汇总 `calorie.view.exercise`／对照目标 `calorie.view.exercise-goal`）的融合版式装配同处一件——四态页头、页内导航、四块逐卡判空、逐日表截断口径、目标环卡与判决胶囊两态、两页空态、来源脚注与三格式复制区全挤在一件里；本票进场时该件已 346 行（`f743995` 版 171 行 ＋ 在途融合改动净增 175 行），为落「可见文本零 snake_case」（来源名换成读者看得懂的「运动记录／每日目标 ＋ 运动记录」）再添 5 行，到 351 越线。本次先不拆：拆分不在 #452 写集（票面只许动本件版面，出口位与调用方归结构票），拆法＝按页切两件姊妹件（`sportSummaryDocs.ts` 汇总页／`sportGoalDocs.ts` 目标页），把件头现共用的页卡、导航、复制区、来源脚注、截断口径提为一件共件（`sportPageParts.ts`），出口经本件薄转出。 |
| `src/render/wizardPort.ts` | 457 | 265 | 「#354 挂号原文」超因：预检确认页装配与结果型页面装配同处一处；本次先不拆：拆分本身不在 #354（该票只登记），拆法待后续票确定。**#445 当场实测已落回 350 以内，挂号行保留（457 是历史事实、不回改），本行不再触发第四步。** |
<!-- warning-line-ledger:end -->

## 本包现状（2026-09-14 #445 当场扫描）

`#445` 把检查脚本从「`REQUIRED` 硬清单存在性」扩成「扫描面＋台账逐件对账」之后，当场扫描发现**超线件远不止 #354 在册的三件**：多出来的那些此前从未挂号（#354 只按票面点名登记了两件，却写了「其余均在 350 以内」的整句结论，那句话当场就不成立；#445 改正为**逐件**口径）。逐件读数只看上表「当场实测」列——本段不重复抄写数字，免得和表走散。

其中生成物（`src/cli/keys.ts`／`src/cli/registry.ts`／`src/triggers/routes.generated.ts`）按上「范围」一节的
判据剔在扫描面外、不挂号；其余各件的拆法均不在 #445 写集（本票不改任何件源码），逐件结论待归属票认领。

## 检查脚本

`packages/skill-calorie/scripts/check-warning-line.mjs`：

- **绿**＝台账齐全**且**与实况逐件一致：`exit 0`、`RESULT: n/n`、`PASS: 告警线台账齐全且与实况一致`。
- **红**（`exit 1`）五种，都在输出里点名，末段直接给修法（`修法：node packages/skill-calorie/scripts/check-warning-line.mjs --sync`）：
  - `RED 漏报（台账没有）：<件> LF=<n>`——盘上超线了却没进台账（新增件、或把某件撑过 350）；
  - `RED 台账陈化：<件> 台账=<a> 实况=<b>`——台账「当场实测」列与实况不等；
  - `RED 台账件在扫描面内不成立：<件>`——台账点名了不在扫描面内的件（改过名／搬过家／后来判成生成物）；
  - `RED 台账缺行：<件>`／`RED 挂号值被改写：<件>`——删台账任意一行、或改写冻结挂号值（#354 起的负向对照）；
  - `RED 生成物判据自证`／`RED 生成物印记已认领：<件>`——生成物剔除法的自证（见下）。
- **回绿＝跑同步器，不用手改数**：`node packages/skill-calorie/scripts/check-warning-line.mjs --sync`
  ——「当场实测」列照当刻 LF 改、超线件补新行（挂号值 `—`，结论列写明「超因与拆法待补」）、不在扫描面内的行剔、
  冻结行缺了补回；**先加 `--dry` 只演练**（打印 `SYNC-PLAN 改=／增=／删=` 与逐条 `SYNC-CHANGE／ADD／DROP`，不落盘）。
  同步器只改 `begin/end` 之间那块表（落盘前断言块外前后缀逐字节相同、断言全过才落盘；落盘后回读自证打 `SYNC-VERIFY ok`）。
- **改了超线件、或新增／删除扫描面内的件，就必须同步这张台账表**，否则本门必红。这是设计行为（#445 要的就是「台账不随实况更新即报警」），不是误报。
- 复跑：`node packages/skill-calorie/scripts/check-warning-line.mjs`；夹具与变异可用 `--root`／`--agents` 指另一份包根与另一份 AGENTS.md（真实门禁**一律无参运行**，脚本会打印 `SCAN-ROOT:`／`LEDGER:` 两行供认口，剔出的生成物逐条打 `GENERATED-SKIP`）。
- 测试：`packages/skill-calorie/test/t445-告警线门.test.mjs`（漏报必红／陈化必红／还原必绿／缩面失明／生成物剔除与自证／同步器 `--dry` 不改文件 ＋ `--sync` 回绿）。
