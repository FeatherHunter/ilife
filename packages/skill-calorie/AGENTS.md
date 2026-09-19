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

- **挂号值**＝**第一次挂号时**写的 LF。它是历史事实（那时确实超线），**永不回改**；需求原文里的冻结值是 `src/render/wizardPort.ts｜457`、`scripts/gen-cli.mjs｜729`（来源＝`docs/skills/skill-calorie/t169-设计定稿.md` 票 2 票面；前一件 **#716 起住 `src/photo/wizardPort.ts`**——需求原文那句是 #354 当期验收的历史记录，按「地址随实况、历史不改」逐字不动）。检查脚本只核对这两个冻结值**没被改写**，不拿它们跟实况比。从未挂号过的件记 `—`。
- **当场实测**＝**当刻盘上**数出来的 LF，节点口径 `readFileSync(f,'utf8').split('\n').length - 1`。台账表里**只有这一列**是 `check-warning-line.mjs` 拿来对实况的：与实况不等即红（这就是「台账陈化」）。
- 某个件的 LF 掉回 350 以内：**挂号行不删**（挂号值仍是历史事实），但「当场实测」列要跟着实况改，结论列写明「已落回线内、不再触发第四步」。

## 台账（`check-warning-line.mjs` 的解析源）

下表是本包告警线的**唯一台账**：`件`＝扫描面内的文件；`挂号值`＝首次挂号时的 LF（从未挂号记 `—`）；`当场实测`＝本表成文当刻的 LF（脚本核对的就是这一列）；`结论`＝超线原话＋超因＋拆法或「本次先不拆」的理由。**改这张表就是改台账；表外别处不再写行数**（免得两处走散）。

<!-- warning-line-ledger:begin -->
| 件 | 挂号值 | 当场实测 | 结论 |
|---|---|---|---|
| `src/triggers/wake-assets.ts` | — | 4757 | 超因：全量唤醒词资产（逐字落地老实物 HELP 的 typed TS module，见件头「唯一事实源」）与代码同处一件，数据面占了绝大多数行。 |
| `src/render/trendPredictDocs.ts` | — | 1190 | 已超线，需要根据规则进行重构。超因：（**#518 W1 搬家引入**，新件）`trendDocs.ts` 里 10 个 `build*Doc` 与它们的独占页内小件原样搬来——缺口族（`DEFICIT_TREND_ZH`／`DEFICIT_SECTIONS`／`deficitSection`／`deficitVerdict`／`signed`／`deficitConclusion`／`deficitBurnMix`／`deficitStatusChips` ＋ `buildDeficitDoc`）与预测族 9 页（`buildPredictDoc`／`buildPredictTargetDoc`／`buildSimCutDoc`／`buildSimTargetDoc`／`buildCalorieForecastDoc`／`buildCalorieGoalDoc`／`buildCalorieDeficitDoc`／`buildCalorieStabilityDoc`／`buildGoalPredictDoc`）同住一件，每页的取字段→KPI→表→口径行→复制区都摊在同一个文件里。搬迁判据＝搬迁前后 31 页产物逐字节相同（`docs/skills/skill-calorie/t518-W1-搬家-证据.md`）。**本次先不拆**：W1 的口径是「原样搬家、一字不改」，同一窗口里再叠一次结构变更会把「逐字节相同」这条判据变成两条变更的合成读数（分不清是谁改的产物）；拆法＝按页族再切两件姊妹件（缺口族一件、预测族一件），两族共用的页框（页头胶囊／结论条／导航／口径行／来源脚注／复制区接线）提为一件共件，出口经本件薄转出；待本票 W4 收尾评估或收口票认领。 **#518 W2／W3 已在该件上把 20 页铺开**（649→747，LF）：W2 给预测体重族 4 个装配件铺骨架（页头胶囊／结论条／页内导航／参数区／KPI／轨迹小表／口径行／来源脚注，页宽走包内既有件 `pageChromeCss(1120)`），W3 给摄入预测族 4 个装配件铺同一套（另加轨迹表的「预计区间」一列），共新增 6 个页框小件（`PREDICT_SECTIONS`／`predictNav`／`predictChips`／`sourceFootnote`／`spanDaysOf`／`trackTable`），`deficitSection` 改名 `pageSection`（两族共用）；本件因此仍在 350 线之上，**拆法不变**（按页族切两件），待收口票认领。 **#518 W6 收尾在场**（852→897，LF；「当场实测」列由 `--sync` 派生）：判定卡的值位**整格撤掉**（本件页族自出的判定卡 `verdictCard`——公共层 `KpiCardInput.value` 必填非空、产不出「没有值位的卡」，而红线不许动 `packages/base-render/**`；判定词只由公共层徽标承担，空出那一格由 `detail` 补一句人话、不引入新数字）、**单位形态全族统一成 `kg`**（本页族样式压掉公共层 `th` 的 `text-transform:uppercase`，口径行与参数说明里的人话「公斤」一并改 `kg`）、**轨迹列固定 1 位**（`fmtWeight` 走 `toFixed(1)` 字面，整数也补 `.0`）；本件因此仍在 350 线之上，**拆法不变**（按页族切两件），待收口票认领。 |
| `src/exercise/sportPortDocs.ts` | — | 966 | 已超线，需要根据规则进行重构。超因：#111 运动移植 6 键的全文档装配（数据→区块→填充器）同处一件——#453 把分布／力量／有氧三键换成融合版式（卡清单逐卡判空＋页内导航＋口径行＋来源脚注＋三格式复制区＋空态指引），单件继续变长。本次先不拆：本票（#453）只做这三页版式，同件的趋势／复盘两支是第 5 票（#454）的地盘、一行不碰；拆法＝第 5 票落地后按页族切姊妹件（分布／力量／有氧一族 与 趋势／复盘一族分住两件），把两族共用的卡装配、导航、色映射提为一件共件，出口留本件薄转出。**T351-v7 已走完这条拆法的「复盘」那一半**：计划复盘（`calorie.view.exercise-review`，order201–206）整支搬进姊妹件 `src/render/reviewDocs.ts`（页内样式另立 `reviewDocsCss.ts`，两件均在 350 以内），本件 760→666，只剩「分布／力量／有氧／运动复盘／趋势」五键；剩下那一半（分布／力量／有氧 与 趋势／运动复盘 两族仍同件）待收口票。 **#544 在场**（666→809）：类型分布／力量／有氧／运动复盘／趋势五页去分隔符形状化＋文案去冗余＋HELP 同档手机端——页头 `<title>` 与眉标两处去 `·`、KPI 卡撤重复事实（窗口住窗口条胶囊）、来源脚注改键值行、口径行由 `；` 串改一条一行、分布条与徽章给形状、空窗页不印取数层那句三连零、数值走显示层取整；**视觉第 1 轮整改**（88.8 分）另加三件：三张折线补纵轴刻度（`yTicks:3`，同族先例 `analysis-deficit-385`）＋全等序列显式给域不再贴底、窄屏页内导航由横滑改回换行铺开、窗口卡两格并一行收掉空洞；另加件头与逐段注释。 **#544 终审席返修在场**（809→944）：票 #268 终审席的五条打回项里有四条落本件——P1-5／K2 纵轴刻度印负数（38／39 印出 `-87.4`）与带 `.0`／`.5` 尾巴，改法是把量程改成「下界恒 0 ＋ 上界＝刻度步长×（条数−1）」一次算齐（`valueAxisOf()`／`axisHeightOf()`，峰值落在图高 0.60 附近）；P1-6／K6 盘族三节无可见标题，改法是把节身份落到正文（`Card.head` → `<section>` 首个子节点 `<h2>`，样式走本件内联段一条）；K1 一排四卡字号 28／22 混用，撤掉首卡放大规则、整排退回公共层 22px；K4 窄屏长序列读不出点落在哪一天，改法是长窗（≥45 天）在折线卡的画布容器里补一条日期轴（`xRulerOf()`＋`withXRuler()`：只出窗口内部 4–5 条日期、等宽槽＋轴线＋刻度点；内距按 viewBox 比例给——左 10%＝58/580、右 2.414%＝1−566/580，再加 4% 槽内距让槽心与绘图区 1/6…5/6 同列，不碰共用层标签口径；初版出 7 条并复读首尾、次版挂在卡外、三版内距写死 px，三次都被视觉复评逐条量出偏差，第 4 版才定形）；K5 占比 <1% 的分布条实渲不到 1px，给填充条 4px 下限。 **#715 已在场**（纯搬迁，966→966；「件」列地址由本票手改，挂号值 `—` 与以上结论原样带过去）：本件按归属律自 `src/render/sportPortDocs.ts` **原样迁入能力目录 `src/exercise/`**（它是 `render/` 里只被 `exercise` 一个能力目录引的最大单件；出向引用里留在 `render/` 的 `receipt.ts`／`exercisePort.ts` 两行就地摆正为 `../render/…`）；搬迁判据＝分布／力量／有氧／趋势／复盘五键 25 条分支路径产物 ＋ 空窗直调 5 页逐字节相同（`docs/skills/skill-calorie/t715-搬家-证据.md`）；拆法一字未改、待收口票认领。 |
| `src/weight/history.ts` | — | 879 | 超因：「看体重明细」与「看体重曲线」在命令面上是同一个命令，两条子功能共用一件。 |
| `scripts/gen-cli.mjs` | 729 | 847 | 「#354 挂号原文」超因：命令汇总派生与生成物写回同处一个一次性脚本；本次先不拆：拆分本身不在 #354（该票只登记），拆法待后续票确定。 **#343 在场**（796→933，LF；「当场实测」列由 `--sync` 派生）：本票在它身上加代表唤醒词的生成期门（`checkWakeWords()` ＋ `wakeWordGate()` ＋ `WAKE_GATE_REGISTERED` 登记位 ＋ 件头注释，约 137 行）。本次仍**不拆**：拆分（结构重排）不在 #343 写集（票面只给「生成期的校验」一处 ＋ 各能力声明 ＋ 测试件 ＋ 证据件）；拆法照本条＝把「命令汇总派生」与「生成物写回」切成两件姊妹件，出口经本件薄转出；待收口票认领。 |
| `src/diet/nutritionPortDocs.ts` | — | 771 | 已超线，需要根据规则进行重构。超因：#112 营养 4 页的全文档装配（数据→区块→填充器）同处一件；**#496 在场**（423→462：配比卡说明改 `goalDetail`（「占 N% · 未设定每天目标」）、环图中心与图例带单位、加 `kcalNote` 折算口径句，另加逐段注释）；**#511 在场**（462→492：营养素深度页的单位改「克／毫克」、配比页的推荐范围对比表把「%（48g）」改成「克 / N 天合计」并补表题口径、两组同源入口页（78／38、80／24）各按进来的那条唤醒词出页头（入口经路由带 `entry` 标记，另加 `ENTRY_DETAIL`／`ENTRY_DRINK` 常量与逐段注释））。本次先不拆：拆分不在 #496／#511 写集（两票都只动可见文本与标题）；拆法＝按页切姊妹件（配比页／营养素深度页／来源统计页三件），块层共用的小件（`sourceLine`／`goalDetail`／`kcalNote`）提为共件，出口经 `diet/index.ts` 薄转出；待收口票认领。**这条拆法的第一步已由 #274 走完**（编排者 2026-09-15 裁定 (b)）：来源统计页装配搬进姊妹件 `diet/sourceStatsDocs.ts`（123 行，产物逐字节不变后再补 ⑤ 类骨架），本件 492→449，只剩配比页／营养素深度页两支与「看饮食总览」区块。 |
| `src/weight/review.ts` | — | 754 | 已超线，需要根据规则进行重构。超因：体重复盘三形态的判别式与页面装配同处一件；**#504 形状化与手机端在场**（669→730）：页顶「记录太少」的 `；` 串改 `bulletList()`、期间变化卡的三条事实（首末对／最高／最低）从卡片 `detail` 撤到卡下那条 `periodStrip()`（卡片槽吃纯文本、形状落不进去，见 `base-render/src/blocks.ts:543`）、里程碑表三个 `·` 拆成 `left`／`main`／`right` 三槽、`weightUiCss()` 进 parts 第一项，另加件头与逐段注释。本次先不拆：拆分不在 #504 写集（票面只许动 `review.ts`／`volatility.ts`／`volatilityDoc.ts` 三件的形状与装配），拆法＝按形态切姊妹件（目标复核／期间复盘／里程碑回溯三支各一件），量程算式 `niceBounds` 与三支共用的形状装配提为一件共件，出口经本件薄转出；待收口票认领。 |
| `scripts/build-help.mjs` | — | 752 | 已超线，需要根据规则进行重构。超因与拆法待补（本行由 `--sync` 自动补出，请补写超因与拆法）。 |
| `scripts/build-help.mjs` | — | 752 | 已超线，需要根据规则进行重构。超因与拆法待补（本行由 `--sync` 自动补出，请补写超因与拆法）。 |
| `src/weight/compare.ts` | — | 700 | 超因：对比体重的主窗口／对比窗口两套参数与对比算式同处一件（算式另有姊妹件 `weightCompare*.ts`）。 |
| `src/workout/write.ts` | — | 623 | 超因：训练计划 10 个写处理函数（创建类 5＋变更类 5）同处一件。 |
| `src/render/trendMiscPortDocs.ts` | — | 618 | 已超线，需要根据规则进行重构。超因：#113「趋势 2＋其他 6」共 8 键的 HTML 填充器同处一件；**#496 在场**（625→641：营养分析换算说明改人话、环图中心改「折算合计（千卡）」＋图例带单位＋差额口径句、六因素说明句、缺库食物那一段改读者的话，另加逐段注释）；**#509 在场**（641→650：33／81 批量导入预览页的读数卡与表头改读者的话——「食品库里有同名的／食品库里没有的／食品库里的热量（卡）／是否已匹配／食品库中无此食物／未匹配」、单元格 `—`／`✗ 缺库` 换成字面短语、副标题去掉命令名 `diet.batch`，另加逐段注释）；**#511 在场**（650→676：营养分析页副标题改「这页有什么」（原「配比＋微量＋规则建议（建议阈值见数据层注释，不编造结论）」）；六因素页的**数据层文案上屏归一**——`humanText()` 把取数层写死的「热量达标」换成「热量（千卡）达标」、把三句「无 X 目标（先设目标）」换成人话（说清为什么判不了达标 ＋ 要设该说哪条唤醒词），副题后补一句热量单位口径，另加逐段注释）。本次先不拆：拆分不在 #496／#509／#511 写集（三票都只动可见文本与标题，编排者已裁「一行不搬」）；拆法＝按页族切姊妹件（营养分析／六因素／批量导入预览／其余薄页分开），块层共用的小件（`windowForm`／`dateLabelOf`／`axisOf`）提为共件，出口经本件薄转出；待收口票认领。**#277 已走完这条拆法的第二半**（编排者派单 §十二 点名「⑦ 预检确认页 → `src/diet/precheck.ts`」）：`batch_import_preview` 那一页整支搬进 `src/diet/precheck.ts`（装配，204 行）＋ `src/diet/precheckPort.ts`（取数与逐行校验，235 行），676→608；仍超线，剩下 7 键待收口票。 |
| `src/photo/helpCenter.ts` | — | 590 | 已超线，需要根据规则进行重构。超因：#88 HELP 速查台的数据模型与页面装配同处一件。**#471 在场**（523→590）：＋「新词别名」节（`list:'new'` 族 → 命令，`NEW_KEY_ROUTES` 派生；`meta_blocks` 块 ＋ `text` 段，三态同源）——补充节的投影面（本节 ＋ 「看板页入口」）与三态壳落地（`sectionFragment`／`inlineFragment`／`renderTextIndex`）仍挤在这一件里，故越线更多。本次先不拆：结构重排不在 #471 写集（票面只给本件、`help-lookup.ts`、新测试件与证据件四处，新建文件要走编排者派单）。拆法＝把**补充节的投影**整支搬进姊妹件 `src/photo/helpSections.ts`（`buildHelpViewEntries`／`renderViewEntriesHtml`／`helpViewEntriesMetaBlock` 与 `buildHelpNewAliases`／`newAliasesTitle`／`renderNewAliasesHtml`／`helpNewAliasesMetaBlock`，两节的 `META_ID`／`META_TITLE` 常量随行），本件只留 `buildHelpSceneData` 与三态壳落地并薄转出；待收口票认领。 |
| `src/render/html.ts` | — | 586 | 超因：T8～T10 的多套 HTML 串模板（饮食／总览／照片层等）同处一件。 |
| `src/render/exercisePort.ts` | — | 544 | 超因：#111 运动移植 6 键取数（行源＋分类口径）同处一件。 |
| `src/health.ts` | — | 537 | 已超线，需要根据规则进行重构。超因与拆法待补（本行由 `--sync` 自动补出，请补写超因与拆法）。 |
| `src/render/trendDocs.ts` | — | 528 | 已超线，需要根据规则进行重构。超因：趋势／分析域同质文档装配（数据→区块→填充器）全挤在一件里——组合配对 11 键与缺口／异常／禁忌／预测共 12 个薄页同住一件；**#160 文本返工在场**（826→892，＋66 行，其中十余行是「被删掉的技术口径改住 HTML 注释」＋图例／表名／口径卡的逐块注释）；**#160 回炉（同票第二席）再 ＋99 行到 991**：12 个薄页的参数卡说明改人话＋数据层文案上屏归一（`humanText`）＋分层表 `备注` 列按数据裁剪＋延迟表补「可排序的量」。本次先不拆：拆分不在 #160 写集（该票只动可见文本，结构重排归结构票），拆法＝按页族切两件——`buildCombinedDoc`（组合配对，11 配对共用一种版式）留本件，后 12 个预测／诊断薄页（deficit／anomaly／contraindication／predict 族／goal-predict）切姊妹件 `trendPredictDocs.ts`；`DOC_TITLE`／`DOC_VERSION`／`fmt`／`unitOf`／`deltaHuman`／`corrLevel` 提为两族共件，出口经本件薄转出。 **#517 在场**（1019→1135，LF）：这一票给缺口样板页补形状——可见口径行（`renderCaliberLine`）／结论条（`renderConclusionBar`）／页内导航 6 锚点（`renderTocBlock`＋`deficitSection`）／状态徽章与状态徽章列（`renderKpiCard` 的 status 槽＋`renderChips`）／消耗构成堆叠条（`renderDistributionRows`）／明细表 6→5 列（撤掉 7 行同值的「目标」列，该事实落口径行）／页宽 1120（包内既有件 `pageChromeCss`），另加 `DEFICIT_SECTIONS`／`deficitVerdict`／`signed`／`deficitConclusion`／`deficitBurnMix`／`deficitStatusChips` 七个小件与逐段注释。**已超线，需要根据规则进行重构。** 拆法照本条已写好的那条＝按页族切两件（`buildCombinedDoc` 留本件，后 12 个预测／诊断薄页切姊妹件 `trendPredictDocs.ts`，`DOC_TITLE`／`DOC_VERSION`／`fmt`／`unitOf`／`deltaHuman`／`corrLevel` 提为两族共件）；**实际搬迁归 #518 的 W1 窗，本票不搬**（本票只动 `buildDeficitDoc` 段与其上方共用小件）。 **#518 W1 已走完这条拆法的第一半**（1135→528，LF）：`buildDeficitDoc`（含 `DEFICIT_*` 七个小件）与预测族 9 页整支搬进姊妹件 `src/render/trendPredictDocs.ts`（新件 649，见本表该行），两族共用件 `DOC_TITLE`／`DOC_VERSION`／`DOC_SKILL`／`fmt`／`humanText`／`techNoteHtml` 留本件并改为导出、10 个出口经本件薄转出；搬迁判据＝31 页产物逐字节相同（`docs/skills/skill-calorie/t518-W1-搬家-证据.md`）。本件现只剩 `buildCombinedDoc`（组合配对 11 键）／`buildAnomalyDoc`／`buildContraDoc` 三支，仍超线；**第二半拆法**＝按页族再切（组合配对一件；异常诊断与禁忌扫描一件），三支共用的件头小件提为共件，出口经本件薄转出；待本票 W4 收尾评估或收口票认领。 |
| `src/analysis/multiTrendPage.ts` | — | 523 | 超因：通用分析页最小形态的整页装配与图／表／复制区调用同处一件。 |
| `src/migrate/migrate.ts` | — | 494 | 超因：老库到新 schema 的一次性迁移（13 表重建口径）全在一件里。 |
| `src/render/sportDocs.ts` | — | 466 | 已超线，需要根据规则进行重构。超因：（**#452 引入，越过 350**）运动两页（汇总 `calorie.view.exercise`／对照目标 `calorie.view.exercise-goal`）的融合版式装配同处一件——四态页头、页内导航、四块逐卡判空、逐日表截断口径、目标环卡与判决胶囊两态、两页空态、来源脚注与三格式复制区全挤在一件里；本票进场时该件已 346 行（`f743995` 版 171 行 ＋ 在途融合改动净增 175 行），为落「可见文本零 snake_case」（来源名换成读者看得懂的「运动记录／每日目标 ＋ 运动记录」）再添 5 行，到 351 越线。本次先不拆：拆分不在 #452 写集（票面只许动本件版面，出口位与调用方归结构票），拆法＝按页切两件姊妹件（`sportSummaryDocs.ts` 汇总页／`sportGoalDocs.ts` 目标页），把件头现共用的页卡、导航、复制区、来源脚注、截断口径提为一件共件（`sportPageParts.ts`），出口经本件薄转出。**用户删文波（2026-09-15，运动汇总去标题日期／副题／口径／来源，423→417）**；**#523 在场**（351→417）：汇总／记录级明细／对照目标 17 页去分隔符形状化＋文案去冗余＋HELP 同档手机端——页头两处去 `·`、KPI 卡去重复事实、逐日表截断只报一句、类型分布图收成前 8 类、口径行由 `；` 串改一条一行、来源行改键值行（`exerciseUiCss()`／`windowStrip()`／factStrip 那一族另立 `src/exercise/sportUi.ts`，127 行），另加件头与逐段注释。本次仍**不拆**（同上：拆法已定但本票不含结构重排；`sportUi.ts` 的建立已把「页内形状与样式」这半边先分出去）。**#523 R5 返修在场**（417→434）：终审席 P2-7／P2-8 两处——逐日表表题由「按日消耗（本窗共 N 天）」收成「按日消耗」（窗口天数只住页头窗口条，被截窗把它并进截断明示那一句「本窗共 N 天，显示最近 100 天，其余 M 天」）、两张表的三个数值列带上单位（「2 次」「800 卡」「90 分钟」，与同页分布条／折叠体同一写法）。本次仍**不拆**，拆法照旧＝按页切 `sportSummaryDocs.ts`／`sportGoalDocs.ts`，两页共用的页卡、导航、复制区、来源脚注、截断口径提为 `sportPageParts.ts`，出口经本件薄转出；待收口票认领。 |
| `src/exercise/receipt.ts` | — | 464 | 已超线，需要根据规则进行重构。超因与拆法待补（本行由 `--sync` 自动补出，请补写超因与拆法）。 |
| `src/fetch/body.ts` | 369 | 458 | 「#398 挂号原文」超因：读侧来源词（`SOURCE_FILTER_ALL`／`SourceFilter`／`assertSourceFilter`）与按来源分组取数（`trendCompositionBySource`／`compositionSourceCount`），与既有写侧校验（`validateCompositionInput`）＋围度取数同处一件；#398 先不拆：拆分不在该票写集，拆法待后续票（按「写侧校验／围度取数／体成分取数」切姊妹件）。**该件在 #445 当场实测比挂号值又涨；本行「当场实测」列随实况改，挂号值 369 不回改。** |
| `src/profile/setup.ts` | — | 447 | 超因：#179 三条写入词共用的写前页与 #175 补的写后回执页同处一件。 |
| `src/home/goalProgressDocs.ts` | — | 446 | 已超线，需要根据规则进行重构。超因：（**#467 引入**）这一件同时住着「本窗四张 KPI 卡与结论条」＋「摄入走势图与**目标线量程判定**」＋「每日达标表与两档窗口转场」＋「本期之外那三项目标（蛋白／饮水／运动）那一块」＋「复制区与页框接线」；#467 建件时 350，复核整场（目标虚线改判量程、卡四牌子带窗口、图下那句改读数式、补窗口转场与三项目标说明、页签标题带窗口）涨到 451（含件头与逐段注释）；**用户缺陷 6（2026-09-15，复制区去标题＋导航减项）再 ＋1 到 452；用户删文波（2026-09-15，目标页删口径句 8 组）净 −6 到 446**。本次先不拆：拆分不在 #467 写集（票面只动本件与出口 `src/home/today.ts` 两件），拆法＝按页族切姊妹件——「目标线量程判定 ＋ 走势图 ＋ 图下读法」（与同族 `homeDocs.ts:254-259` 的折线口径配对）另立一件，四卡／结论条／达标表／复制区留本件，出口经本件薄转出；待收口票认领。 |
| `src/analysis/commands.ts` | — | 443 | 已超线，需要根据规则进行重构。超因：（**#376～#378 引入**）分析域 14 个键的**声明**与按子功能分段的**处理函数**同处一件——本票给分析域加了 `calorie.view.multi-trend` 的声明与薄转调（取数 `multiTrend.ts`／装配 `multiTrendPage.ts` 已分住姊妹件），声明面仍集中在本件；本次先不拆：拆分不在 #376～#381 写集，拆法待后续票——把处理函数按子功能切成姊妹件（组合分析／整体趋势／对照），声明面留本件，出口经 `analysis/index.ts` 转出。 |
| `src/workout/planEditorRuntime.ts` | — | 426 | 已超线，需要根据规则进行重构。超因：（**T351-v14 引入，311→356**）这一件是整台计划编辑器的页面运行时——周页签、每天 4 次训练的增删、时段选择、参数面切换（力量填组数次数负重、有氧只填时长）、锁定周的只读分支、产物表与复制指令生成，全在一段 JS 文本里；V14 加周页签与「第 2 周起锁动作」两条分支后越线。拆法＝按**交互族**切两件姊妹件：动作库选择层（筛选／搜索／选中）另立 `planEditorPicker.ts`，编辑主体（页签／日／段／参数／产物）留本件，两件之间只过一个「选中了哪个动作」的回调，无共享状态；待收口票认领。 **#704 已在场**（纯搬迁，426→426）：本件按归属律自 `src/render/planEditorRuntime.ts` **原样迁入能力目录 `src/workout/`**（同族四件 `planEditorPort`／`planEditorDocs`／`planEditor`／`planEditorCss` 与复制区接线 `planCopyBlock` 一并迁入）；搬迁判据＝计划编辑器页 8 条分支路径产物逐字节相同（`docs/skills/skill-calorie/t704-搬家-证据.md`）；拆法一字未改、待收口票认领。 |
| `src/diet/receipt.ts` | — | 425 | 已超线，需要根据规则进行重构。超因（**#270 引入**）：这一件同时住着 15＋1 条写命令的整页回执——四个区块（操作回执／字段变更／今日累计／复制明细）各自的取词与分支、改类「改前 → 改后」对照与删类快照两套表、今日累计七行、页内导航／口径行／来源脚注与复制区双按钮＋日志第 4 段命令原文，另加件头的四块老实物对照与「数据面缺口」登记。**拆法**＝按**区块**切姊妹件：`diet/receiptChange.ts`（字段变更那一块：`snapshotTable`／`changeRowsOf`／`beforeOf`／`beforeMissing`）另立一件，操作回执／今日累计／复制明细与整页装配留本件，两块之间只过 `CrudReceipt` 与本次参数；**本次先不拆**：结构重排不在 #270 写集（票面只给 `receipt.ts` 与三件测试），且四个区块的边界还要靠负责人肉眼验收再看一轮；待收口票认领。**#277 在场**（379→383）：本件只加 4 行——`dietReceiptDoc` 见入口标记 `entry:"precheck"` 就返 `null`（把页面让给预检确认页），不带这一位一字不差。**已超线，需要根据规则进行重构**；拆法照本条原样，本次仍不拆（本票只加一个分支，重排归收口票）。 |
| `src/render/trendMiscPort.ts` | — | 416 | 超因：#113 八模板取数（计数 6＋4＋8 闭合）同处一件。**#277 在场**：`batch_import_preview` 的取数与逐行校验搬进 `src/diet/precheckPort.ts`（同一个搬迁：页属饮食的 #277、件属 #113 的杂项，是归属错配），本件 456→404；拆法照同表 `trendMiscPortDocs.ts` 那行的「按页族切姊妹件」，剩下 7 键待收口票。 |
| `src/weight/volatilityDoc.ts` | — | 411 | 已超线，需要根据规则进行重构。超因：（**#504 引入，越过 350**）这一件同时住着「四张 KPI 卡 ＋ 卡下阈值事实条」（`kpiCards`／`thresholdStrip`）＋「两张折线图」（`deviationChart`／`sigmaChart`）＋「异常表」（`anomalyTable`）＋「结论块」（`volatilityConclusion`）＋「页脚来源行／页顶两态提示」（`sourceLine`／`premiseNotice`）＋「复制载荷」（`volatilityCopyPayload`）＋整页装配与复制区出口。本票给它补形状化与手机端：卡②那行三件事的 `·` 串改由卡下 `thresholdStrip()` 承载（卡片槽吃纯文本）、近期异常那行 `·` 串改两条「标签 ＋ 值」、结论 `；` 串拆 `verdict()` ＋ `note()`、只看异常点读法的 `；` 串改 `bulletList()`、`weightUiCss()` 进 parts 第一项，328→392（含件头与逐段注释）。本次先不拆：拆分不在 #504 写集（同上，只许动三件的形状与装配），拆法＝按「取数／版式」切姊妹件：复制载荷与来源行另立一件，四卡＋条子＋两图＋表＋结论的版式留本件，出口经本件薄转出；待收口票认领。 |
| `src/diet/libraryDocs.ts` | — | 408 | 已超线，需要根据规则进行重构。超因：（**#274 引入，164→396**）这一件同时住着三组活——①查食品／食品库／去重三张页的取数结果→区块→文档装配；②三页共用的页框（眉标＋徽章／结论句／页内导航／口径行／复制区双按钮＋日志第 4 段命令原文／来源脚注，照 `t425-融合基准.md` §五 第 ⑤ 类骨架逐行落位）；③食品卡片格（`renderFoodGrid`：类别标签／食品名／品牌／四宏量取整口径／来源·更新于）与两套页内局部样式（`.food-grid`／`.food-card` 一族、去重页条幅与小节标题），件头另记老实物对照（`food_search.html`／`dedupe_report.html`）与逐条裁定出处。本次先不拆：本票的声明路径只给了 `libraryDocs.ts`／`library.ts`／`libraryPlate.ts`／`products.ts` 四件，新建文件要走编排者派单，不宜在交付窗里自开新面。拆法＝按「卡与样式」切姊妹件 `diet/libraryCard.ts`（`FOOD_CSS`／`DEDUPE_CSS`／`renderFoodGrid`／取整口径 `fixed0`／`fixed1`），三页装配与页框留本件，出口经本件薄转出；待收口票认领。 |
| `src/analysis/reportPlate.ts` | — | 406 | 已超线，需要根据规则进行重构。超因：（**#384 在途件**）报告子形态的取数与聚合（1 个多态底座 9 个 kind：bmi／tdee／bmr／protein／water／score／trend／compare）与页面装配同处一件；本次先不拆：本票（#445）只做告警线门与台账对齐、不改任何件源码，拆法待该件归属票认领。 |
| `src/weight/log.ts` | — | 402 | 已超线，需要根据规则进行重构。超因：（**#505 引入，越过 350**）这一件同时住着「读页取数与整页装配」（`viewWeight`／`buildWeightDashboard`／`buildWeightDoc`／空窗页）＋「两条写命令的入参与落库」（`writeWeightLog`／`writeWeightBatch`）。#505 给它补形状化与手机端：体重盘正文首件加窗口条＋方向胶囊、四卡里那几件事实改由结论块的形状承载（`plateCards()` 因此改成回 `{cards, facts}`）、结论句拆判语＋事实条、页头副标题去 `·`，337→382（含件头与各段注释）。本次先不拆：拆分不在 #505 写集（票面只许动 `log.ts`／`logReceipt.ts`／`receipt.ts`／`plateDocs.ts` 四件的文本与装配），拆法＝按「读／写」切两件姊妹件：读面（`viewWeight`／`buildWeightDashboard`／两个 `build*Doc`）留本件，写面（`writeWeightLog`／`writeWeightBatch` 两条入参校验与落库调用）另立 `weight/logWrite.ts`，`signed`／`windowDays`／`rangeTextOf` 这类两族共用的小件提为共件；待收口票认领。 |
| `src/photo/gifDoc.ts` | — | 400 | 已超线，需要根据规则进行重构。超因：（**#352 引入，越过 350**）这一件同时住着两摊活——「GIF 合成的编排」（帧序 `byFrameOrder`／落盘命名 `gifFileNameOf`／降级 `synthOf`／超限改提示）与「整页装配」（三格 KPI／事实条／舞台 `stageHtml`／七列明细表／复制区）。**#654 在场**（365→393）：本票给场景09 十页补真「复制日志」，本件只在复制区那一处补命令原文入参（`GifPageInput.command`）＋ 复制区小件 ＋ 逐段注释，合成与版面一行未动。**本次先不拆**：拆件会把「产物逐字节可解释」这条判据搅成两条变更的合成读数（本票只做日志接线），且 `GifPageResult` 的四个读数出口归 #352 的门钉着。**拆法**＝按「合成／装配」切两件姊妹件：`photo/gifSynth.ts` 留 `synthOf`／`gifFileNameOf`／`byFrameOrder`／`stageHtml`／`GIF_SUB_DIR`，`photo/gifDoc.ts` 只留页装配与复制区（`GifPageData`／`pageDataOf`／`contentOf`／`shellOf`／`buildPhotoGifPage` 薄转出），两件之间只过 `Synth` 与 `GifPageData`、无共享状态；同族先例照 `sportDocs.ts`（版式）＋`sportUi.ts`（形状）那次一分为二；待收口票认领。 |
| `src/workout/planStore.ts` | — | 386 | 超因：T4 计划取数＋写数（校验三硬止＋两软提示、全量覆盖写）同处一件。 |
| `src/diet/nutritionPort.ts` | — | 385 | 超因：#112 营养 4 键取数与 #275 追加的「看饮食总览」视图同处一件。 |
| `src/exercise/records.ts` | — | 381 | 已超线，需要根据规则进行重构。超因：**#523 R3 引入**（350→356，越过 350）——记录级明细族的**取数＋三筛选口径＋整页装配**同处一件：窗口／分类／备注三路筛选与合计（`buildView`）、入参解析（`hasNoteOf`／`categoryOf`）、四张卡装配（窗口／指标／明细表／来源脚注）、八列表头与数值列对齐档、截断明示与空态指引、页内导航与三格式复制区、出口 `viewExerciseRecords` 全挤在一件里；R3 只加「数值四列走公共层 `align:'right'`」的常量与注释（视觉复评 R2 硬伤①），越线 6 行。**#523 R4 返修在场**（356→365，改动全是注释与一段函数）：来源脚注撤「窗口」一格（日期已有 H1 与窗口卡两处落点）、口径行三行收一行（`caliberLines()` 收成单值 `caliberLine()`，段间分隔交公共层竖线拆段），两处只改落点与行数、事实一条不减。**#523 R5 返修在场**（365→381）：终审席 P1-1／G2 两处——`#sec-window` 由写页 `renderParamForm`（两个可编辑 `<input>`、窗口日期只住 `value` 属性、390 档复制读不到）改只读键值行 `factStrip`（日期进文本流；单日窗退化成一格「日期」）；来源脚注**有表时**只留「数据来源」一格（条数已在读数卡与表标题各一处），**空态仍报「共 0 条」**（#451 的空态判据读的正是这一句，空态页没有表标题可承载条数）。**拆法**＝按「取数／版式」切两件姊妹件：`exercise/recordsView.ts`（`RecordsView` 类型 ＋ `buildView` 三条筛选与合计 ＋ `hasNoteOf`／`categoryOf` ＋ `viewExerciseRecords` 薄转出）与 `exercise/recordsDocs.ts`（`COLUMNS`／`NUMERIC`／`captionOf`／`subtitleOf`／`caliberLines`／`unitCaps`／`filterText`／`truncationText` 与 `buildRecordsDoc` 的版式半边），两件之间只过 `RecordsView` 与筛选结果，无共享状态；同族先例照 `sportDocs.ts`（版式）＋`sportUi.ts`（形状与样式）那次一分为二。**本次先不拆**：结构重排不在 #523 写集（票面只许动 `sportDocs.ts`／`records.ts`／`sportUi.ts` 三件的版面与文本），且本件正在返修窗内；待收口票认领。 |
| `src/diet/reviewDocs.ts` | — | 380 | 已超线，需要根据规则进行重构。超因：（**#273 引入**）这一件同时住着**两张页**的装配——① `calorie.view.diet-review` 八个唤醒词那张复盘页（老实物 `diet_review.html` 的块 ＋ `t425-融合基准.md` §五 ④ 类页框：结论句／页内导航／四张读数卡／趋势图／高频 TOP5／按餐汇总／口径行／复制区双按钮／来源脚注／窗口为空那一态）；②**交 #271 调用**的餐别分布区块 `buildMealDistributionBlock`（老实物 `meal_distribution.html` 的块 ＋ 四桶环图与占比条 ＋ 明细七列 ＋ 空态支）以及它的视图类型（`MealDistributionView`／`MealDistributionItem`／`MealDistributionSlice`／`MealParam`）与四色表。本次先不拆：拆分（结构重排）不在 #273 写集——票面只给 `reviewDocs.ts`／`review.ts` 两件，新建文件要走编排者派单；且餐别那一半的调用方（#271 的 `calorie.view.diet`）尚未落地，窗口内搬件会与它的集成互相踩。拆法＝按**页**切姊妹件：`diet/mealDocs.ts`（餐别区块 ＋ 四色表 ＋ 上列视图类型）另立一件，本件只留复盘页装配与 `docCopy`／`anchored`／`fmt` 这类两页共件，出口经本件薄转出；**本票不做拆分，留给收口票执行**（编排者 2026-09-15 具名授权只改本行结论列）。 |
| `src/diet/rankingDocs.ts` | — | 369 | 已超线，需要根据规则进行重构。超因：（**#272 整改引入，322→359**）这一件同时住着**两页**的装配——单榜页与全榜页（读数卡／榜单表／逐榜折叠／口径行／复制区／来源脚注）＋ 页内样式段 `RANK_CSS` ＋「名次行＋三段堆叠条」那一块；#272 整改照 `t425-融合基准.md` 裁定 4 的 2026-09-15 澄清，把「窗口为空」那一支的整页空态（空态句 ＋ 引导句 ＋ 两页各自的分支）补进本件，另把三段条三色的逐色对照如实写进件头。本次先不拆：整改窗只许动判定与空窗这一支，结构重排（拆件）另开票。拆法＝按「样式与装配」切姊妹件：页内样式段 `RANK_CSS`（含 `.r1／.r2／.r3` 左色条）另立同目录 `rankingDocsCss.ts`（照 `src/render/reviewDocsCss.ts` 的先例），本件只留两页装配与复制区，出口经本件薄转出；待收口票认领。 |
| `src/home/homeViewParts.ts` | — | 366 | 已超线，需要根据规则进行重构。超因：（**#401m 引入**）这一件同时住着五档视图的内容件——五档（`overview`／`week`／`streak`／`budget`／`month`）的区块身份清单（锚点 id／图标／名，各档一份）与各档正文装配（`overviewBody`／`weekBody`／`streakBody`／`budgetBody`）＋ 随档变的页名与结论句（`viewTitle`／`viewConclusion`）＋ 两块按日视图（缺口列的按日汇总表／记录情况列的记录情况表与它们的行装配）＋ 折线块与「今日账」块 ＋ 连续记录档的两条算式（`longestRun`／`lastGap`）＋ 窗内五张卡的卡件输入（`weekCardInputs`）；建件时按「一档一函数、正文与页名同源」写，五档注释与逐段说明再加 #401m 复查的两处返修（`week` 档 `#sec-days` 补段标题、`streak` 档头条句由 `；` 串改一条一句）越线到 366。本次先不拆：拆分（结构重排）不在 #401m 写集（票面只给 `home/routes.ts`／`commands.ts`／`today.ts`／`homeDocs.ts` 与新建本件五件），且本件刚立、五档的档间边界还要靠验收墙与实拍再看一轮。拆法＝按**视图档**切姊妹件：本件只留共件（`HomeSection`／`HOME_SECTIONS`／`HOME_VIEW_BODIES` 收口表、区块身份与段标题形状、折线块、两块按日表的行装配），`streak` 档（两条算式 ＋ 头条句 ＋ 记录情况表）另立 `home/streakView.ts`，`budget` 档（剩余预算卡件 ＋ 今日账块 ＋ 结论句）另立 `home/budgetView.ts`，出口经本件薄转出；待收口票认领。 |
| `src/photo/receipt.ts` | — | 361 | 已超线，需要根据规则进行重构。超因：（**#528 引入**）这一件同时住着**回执族两个窄席位**的整页装配——窄席位 A 的「记身材照 09-09／删身材照 09-13」两页（读数卡／反馈条／逐张结果块／删除快照块／批次键值行）与窄席位 B 的「标签三态三页 09-10／11／12」（标签对照块／结果句），另加两页共用的页内样式串入口、键值行与徽章列装配件、复制区与给 AI 核对块；`--sync` 自动挂号时 351，两席位补完注释与形状后 356。本次先不拆：拆分（结构重排）不在本票写集——票面只许动 `receipt.ts`／`store.ts`／`manage.ts`／`photo.ts` 与「本族专属的页内样式件与文本件」，且两个席位正在同一份件上并行落盘，窗口内大搬会互相踩。拆法＝按**页族**切两件姊妹件：`photo/receiptAddRemoveDoc.ts`（记身材照／删身材照）与 `photo/receiptTagDoc.ts`（标签三态三页），两族共用的页壳、复制区、给 AI 核对块、键值行／徽章列／分块提为 `photo/receiptParts.ts`，本件只留薄转出；待收口票认领。 |
| `scripts/check-warning-line.mjs` | — | 356 | 已超线，需要根据规则进行重构。超因：（**#445 引入**）本件由 80 行的「`REQUIRED` 硬清单存在性」扩成「扫描面 ＋ 台账逐件对账 ＋ 生成物按生成器声明剔除 ＋ 仓内同步器（`--sync`／`--sync --dry`）」，判据由 4 条涨到 9 条、另加两条自证；本次先不拆：拆分不在 #445 写集，拆法＝按判据族切姊妹件（① 扫描面遍历与生成物剔除 ② 台账解析与逐件对账 ③ 同步器与同步断言 ④ 主入口与报告），出口留本件薄转出。 |
| `src/photo/photo.ts` | — | 355 | 已超线，需要根据规则进行重构。超因：（**#476 引入，越过 350**）这一件同时住着三组活——照片行的写口与卡片映射（`toCard`／`addPhotos`／`deletePhoto`／`updateTag`／`tagAdd`／`tagRemove` 等）＋四条读口的取数（`buildGalleryData`／`buildCompareData`／`buildViewerData`／`buildGifTask`）＋三条写后回执的数据面（`buildAddReceipt`／`buildDeleteReceipt`／`buildTagReceipt`）；#476 为「失败张逐张上页」在 `buildAddReceipt` 里补了缺源复算与逐条 items（＋件头与函数注释），LF 328→355。本次先不拆：拆分不在 #476 写集（本票只许动 `photo/receipt.ts`／`photo/photo.ts`／`store.ts` 三件的文本与装配），拆法＝按场景把这一件切两件姊妹件：①「读口取数」（看身材照／对比两张照片／查身材照／生成身材照GIF 四个 `build*Data` 搬去与同族的 `gallery.ts`／`gif.ts`／`compare.ts` 并排）②「回执数据面」（三条 `build*Receipt` 随 `store.ts`／`manage.ts` 的写口族走）；照片卡类型 `PhotoCard` 与 `toCard` 提为两族共用的卡件；出口经 `photo/index.ts` 薄转出；待收口票认领。 |
| `src/home/homeDocs.ts` | — | 334 | **停留告警线（LF=350，未越线）**。超因（**#401 引入**）：本件同时住着主页族的整页装配（KPI／折线／按日表／结论条／复制区接线）＋按窗口分视图的页名与口径；本次先不拆：拆分不在 #401 写集，拆法＝把「结论条与复制区接线」与「页头/页名派生」切成同目录姊妹件，出口经本件薄转出；待收口票认领。 |
| `scripts/gen-photo-baseline.mjs` | — | 289 | 已超线，需要根据规则进行重构。超因与拆法待补（本行由 `--sync` 自动补出，请补写超因与拆法）。 |
| `src/photo/wizardPort.ts` | 457 | 275 | 「#354 挂号原文」超因：预检确认页装配与结果型页面装配同处一处；本次先不拆：拆分本身不在 #354（该票只登记），拆法待后续票确定。**#445 当场实测已落回 350 以内，挂号行保留（457 是历史事实、不回改），本行不再触发第四步。** **#716 已在场**（纯搬迁，277→275；「件」列地址由本票手改，挂号值 457 与以上结论原样带过去）：本件按归属律自 `src/render/wizardPort.ts` **原样迁入能力目录 `src/photo/`**（同族 `wizardPortDocs`／`helpShell`／`templates` 一并迁入）；迁入时删掉两行**零生产调用方**的身体域转出（`export … from '../body/wizardPlate.js'`，唯一消费者 `test/wizard-86.test.mjs` 已改指 `dist/body/wizardPlate.js` 这个定义地）——那是搬迁做出来的能力↔能力内部件直引，按铁律一在本窗摆正；其余 275 行逐字节相同。搬迁判据＝向导两键全分支 ＋ HELP 三支共 20 页 ＋ 2 条对照页逐字节相同（`docs/skills/skill-calorie/t716-搬家-证据.md`）；拆法一字未改、待收口票认领。 |
<!-- warning-line-ledger:end -->

## 本包现状（2026-09-14 #445 当场扫描）

`#445` 把检查脚本从「`REQUIRED` 硬清单存在性」扩成「扫描面＋台账逐件对账」之后，当场扫描发现**超线件远不止 #354 在册的三件**：多出来的那些此前从未挂号（#354 只按票面点名登记了两件，却写了「其余均在 350 以内」的整句结论，那句话当场就不成立；#445 改正为**逐件**口径）。逐件读数只看上表「当场实测」列——本段不重复抄写数字，免得和表走散。

其中生成物（`src/cli/keys.ts`／`src/cli/registry.ts`／`src/triggers/routes.generated.ts`）按上「范围」一节的
判据剔在扫描面外、不挂号；其余各件的拆法均不在 #445 写集（本票不改任何件源码），逐件结论待归属票认领。

## 测试面口径（#702 立，只立在本包）

`docs/agents/structure.md` 的「管辖」明写**不管测试文件**——所以这三条是本包自己的口径，不是仓规。
它管的是**测试打在哪条缝上**（结构面），不管断言写什么、覆盖多少：

1. **断言打在接口上**：测试断言的落点必须是**生产真正走的那条路**——页面走真正的交付出口
   （`dist/cli/cmd_read.js`／`cmd_write.js` 那条 spawn 路；同逻辑不 spawn 时走同件的 `dispatch(key, params, db)`），
   算式走**包对外的门**（`dist/index.js`，即 `src/index.ts` 转出的值名）或**能力门**
   （`dist/<能力>/index.js`，门没有的名字就说明它不在对外面上）。
   先例＝`test/566-result-title.test.mjs:51` 那条真跑（exit 码 ＋ envelope ＋ `delivery` ＋ 落盘路径四件一起断言）。
   机器门＝`scripts/check-page-assert.mjs`（`#702` 立）：**spawn 真交付出口又断它成功的件，必须把 stdout 解析成 envelope**——
   只断 `exit 0` 是假绿。口径窄而准：只 `import { dispatch }` 直调不进判，只断阻断路（非 0）也不判
   （失败路没有 envelope；`data.output` 只在文件态存在，内联态是设计里就有的，故不要求咬落点）。
   自证 `--selftest` 五条（只断 exit 码⇒红／断成功且解析 stdout⇒绿／直调 dispatch⇒不进判／只断阻断⇒不判／spawn 别的脚本⇒不进判）。
2. **生产不走的缝不算缝**：只被 `src/**` 内部消费的件（`render/*` 一族、`analysis/*` 的算式件一类）
   是**实现**，不是接口。测试直取它 = 断言锁在实现上：实现一搬（#704／#714～#716 那类搬迁票）测试就红，
   而用户看得见的那条契约其实没动——那正是「假红」。
3. **算法正本的单元测试**是例外，但要写明白：被测件就是本次断言的正本（例如 `analysis/trend.ts` 的算法读数），
   在件头注明「这是算法正本的单元测试，不是交付面验收」，并进「同一符号不许从两个 `dist` 路径被取」那道门的账
   （见下），迁移票点到它时一起收口。

**同一符号只许一条 `dist` 路径**（结构门 `scripts/check-one-path.mjs`，`#702` 立）：

- 绿＝`PASS: 测试面每个符号只有一条 dist 路径`；红＝逐条点名符号与两条路径（`exit 1`）。
- 三条口径：① **包门豁免**——`../dist/index.js` 与任何路径配对都不判（包门转出包内件是它的本分）；
  ② **例外从源码派生**——`src/**/*.ts` 里写着 `export { X } from './件.js'` 的**薄转出声明**即放行
  （不认手写清单：薄转出件被删，例外当场消失，防陈化）；③ 其余即红，修法＝把断言换到生产走的那条缝上。
- 自证：`node packages/skill-calorie/scripts/check-one-path.mjs --selftest`（三条：薄转出声明在⇒绿／
  没有声明⇒红／包门配对⇒绿）。

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

## 发布（npm 官方源，交互式 wizard）

- 技能发版脚本：`scripts/wizard-publish.sh` —— 发 `skill-calorie@0.2.6`（硬前提 `base-paint@0.3.6` 已在 registry，第 1 stage 自动查）。
- 插件发版脚本：`packages/plugin-calorie/scripts/wizard-publish.sh` —— 发 `dsh-calorie@0.2.7`。它住插件自己的目录（发谁的包，脚本就住谁的家）；硬前提是技能已落 registry（插件精确 pin 技能版本，wizard 第 1 stage 自动拦）。
- 跑法（必须 Git Bash，脚本必须 LF；发布命令绝不重定向输出，否则 stdout 非 TTY 会直接 EOTP —— 见 `SKILLS/npm-publish/SKILL.md` §4；OTP 不进聊天，见该 §4 铁律）：
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/skill-calorie/scripts/wizard-publish.sh`（先跑，人扫码）
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/plugin-calorie/scripts/wizard-publish.sh`（后跑，人扫码）
- 两脚本只做“前置门＋登录＋打包预检＋发布＋验证”，版本号定死在脚本头（对不上即停，不在脚本里改版本）；发完由编排者收口 G3 安装态断言 ＋ `check-publish --post`。
