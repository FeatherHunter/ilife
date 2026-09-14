# t156 · 新仓 HTML 盘点（卡路里场景 04 运动）

本轮只做**新仓侧事实**：把「新仓 HTML 是怎么装出来的」逐件点清，供新模板开发吸收（老技能侧由另席盘点）。
全程只读源码与测试，未改任何源码、测试、生成物；未跑重型构建（树上他人在途脏文件多，见 §5）。
检出口 commit：`b549002f36db8feb1634b330f5e66b41bd5c9042`。

## 一、页面装配链（新仓 HTML 的骨架）

**行数口径与时点**：行数＝件内 LF 数（节点口径 `split('\n').length - 1`）；引用行号一律「路径:行号」，取自读出时点 `b549002`。
**注意漂移**：本席盘点期间，`render/exercisePort.ts`（534→541）、`base-render/src/controls.ts`、`render/html.ts` 等件正被他人在途改动（mtime 为当日），**同一件的行号可能与后读的人差几行**；结论所引的行号已逐条按内容核对，不依赖行号本身。

新仓产 HTML 的路子只有一条，四段接力：

1. **区块**＝`base-paint/blocks` 的 12 个 B 区块（壳／KPI／表／图／列表／折叠／参数表单／复制区…）；
2. **整页**＝`packages/skill-calorie/src/shared/docPage.ts:47` 的 `assembleDocPage`：区块 HTML ＋ 标题三件套 → 完整文档；
3. **样式**＝`docPage.ts:50` 的 `buildStyleSheet().css + '\n' + blocksCss()`，**不走 `extraCss`**（`extraCss` 在 `packages/base-render/src/spec/style.ts:52` 明确「不得重定义 token、不得出现禁入 token」）；
4. **包裹**＝`docPage.ts:60` 的 `fillTemplate`：裸标记模板 ＋ 资产，填完 `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`／`<!--CONTENT-->`。

注意：**`base-paint` 就是 `packages/base-render`**（包名见 `packages/base-render/package.json:2`），不是两份东西。

### 整页模板逐字（`docPage.ts:36-44` 的 `docShell`）

- `<!doctype html>` ＋ `<html lang="zh-CN">`（`docPage.ts:38`）
- `<meta charset="utf-8">`（`:39`）
- **`<meta name="viewport" content="width=device-width,initial-scale=1">`（`:39`）——移动端视口自 §一段起就有，不是缺项**
- `<title>` 走参数 `docTitle`（`:40`）
- 正文壳 `<div class="wrap ilife-page">`（`:41`）——`wrap` 类**专为兼容既有 `--html` 断言**而留（`:34` 注释）
- 图表页多一个 `<!--CHARTS-HELPERS-->` 槽（`:37`、`:42-43`），由 `charts: true` 触发（`:48`、`:53`）

### 装配的三处口径（值得吸收）

- **`eyebrow` 空串＝不写这一行**（`docPage.ts:56`）——与旧装配同口径，故「眉标」是可选位而不是必填空串；
- **`subtitle` 空值＝不写**（`docPage.ts:57`）——`null` 不进 DOM；
- **`metricsOf` 冻结口径：null／undefined 不进投影**（`docPage.ts:64-70`）——数字位恒为真数字，故 `stat` 形状的 metrics 天然过守卫（`packages/base-render/src/spec/text.ts` 的 stat 契约）。

## 二、共用件逐件（`packages/skill-calorie/src/shared/`）

| 件 | 行数 | 对外导出 | 各一句 | 产出页面族 |
|---|---|---|---|---|
| `docPage.ts` | 70 | 2：`assembleDocPage`（:47）、`metricsOf`（:64） | 区块 HTML＋标题三件套 → 完整文档；度量投影只收确定数字 | **全仓所有文档页**（唯一整页装配入口） |
| `receiptParts.ts` | 43 | 2：`statusCard`（:21）、`reconcileDisclosure`（:31） | 写后回执的「状态」KPI 格 ＋ 页尾「对账信息」折叠区 | 回执页（档案／目标／运动写后） |
| `copyArea.ts` | 187 | 5：`promptCopyArea`（:101）、`copyArea`（:116）、`dataCopyArea`（:162）、`copyLog`（:167）、`notice`（:178） | 复制区（prompt／数据／日志）＋复制日志六段入参＋静态提示块 | 全仓页面（复制区） |
| `contentSuffix.ts` | 118 | 1：`writeSuffixFor`（:16） | 落盘文件名的内容标识段（纯 params 派生，不读库） | 不影响页面，影响**落盘文件名** |
| `params.ts` | 180 | 20 | 参数读取（`needStr`／`optNum`／`needId`…）＋时间窗口口径（`windowRange`／`dayField`／`defaultRange`） | 全仓页面（取数窗口） |
| `commandSpec.ts` | 66 | 7 | 命令声明的形状：`kind` 判别式 ＋ `ViewOut`／`WriteOut` ＋ 四个类型别名 | **不产页面**，是命令事实的唯一定义地 |
| `writeParts.ts` | 113 | 16 | 写命令回执底座：`R`／`out`／`receiptHtml` ＋ 影响行数／写入字段摘要 ＋ 删除措辞 | 回执页（信封 ＋ 复制日志） |

### 三格式复制菜单（#247，用户裁定「恢复老仓原样」）

- 开关**已收口为恒开**：`data` 位在场就出「复制数据 ▾ ＋ 纯文本／JSON／CSV 三选一」（`copyArea.ts:111-113` 注释：留一个每页都要写的开关只是假自由度）；
- 三种格式由 `formatsOf` 序列化（`copyArea.ts:146-159`），走 `buildDataText` 的 `format` 字段（`:154-156`）——**#77 的唯一出口**，卡路里侧不自造序列化；
- 菜单三项的用途提示**逐字取老仓** `crud_receipt.html` 的 `.fmt-menu` 三行（`copyArea.ts:43-45`：纯文本「粘贴给 AI / 自己看」／JSON「结构化存档」／CSV「表格导入」）；
- 样式与形态**全在 base-render**（`copyArea.ts:22-24` 注释）：`copyButton` 样式区 ＋ `renderActionBar` 三格式分支 ＋ 页面运行时菜单委派；卡路里侧只递序列化好的三份文本；
- 三格式取值表 `COPY_FORMATS = ['text','json','csv']`（`packages/base-render/src/spec/text.ts:12`）；
- 按钮无障碍：`aria-haspopup="menu"` ＋ `aria-expanded` 运行时翻转（`packages/base-render/src/controls.ts:1322`、`:1339`、`:764-777`）。

### 折叠与脚本段

- **折叠＝原生 `<details>/<summary>`**，交互态纯 CSS（`packages/base-render/src/blocks.ts:490`、`:500`、`:507-510`）；复制按钮放在内容里不触发 toggle（`:500` 注释）。
- **脚本段**＝`buildSharedHelpersJs()`（`docPage.ts:51`）：复制、toast、菜单委派、搜索/回顶等控件的运行时；图表页另加 `buildChartsHelpersJs()`（`:53`）。
- **版面无锚点导航**：全仓 grep `href="#`／`id="sec`／`renderToc`／`renderAnchor` **零命中**——运动页与其余页一样，没有目录／跳转锚点（见 §4 可提升点）。
- **无 `@media print`**：`packages/base-render/src` 全目录 grep `@media print` 零命中——**产物不可打印定制**（见 §4）。

## 三、运动域逐件（`packages/skill-calorie/src/exercise/`，本图新家）

新家共 13 件（含 `exerciseStore.ts`），全部**搬迁薄壳**：命令声明与分派搬进来了，取数与整页装配仍住旧渲染层。

| 件 | 行数 | 对外导出 | 产出页面族 | 关键函数＋行号 |
|---|---|---|---|---|
| `receipt.ts` | 266 | 2：`buildExerciseReceiptDoc`（:185）、`ExerciseReceiptDetail`（:30） | 写后回执（记／改／删共用一张） | `dayTable`（:161）、`writtenDetailOf`（:177）、`diffTable`（:152 起） |
| `records.ts` | 199 | 3：`RecordsView`（:30）、`buildRecordsDoc`（:125）、`viewExerciseRecords`（:189） | 记录级明细页 | `modeText`（:115）；装配在 `:179` |
| `log.ts` | 110 | 1：`writeExerciseLog`（:61） | 写命令（不产独立页，出回执） | 三形态分支：复制昨日（:65-77）／批量（:78-89）／单条（:90-98）；收口 `done`（:102） |
| `edit.ts` | 134 | 2：`writeExerciseUpdate`（:43）、`writeExerciseRemove`（:94） | 同上 | — |
| `index.ts` | 38 | 3：`EXERCISE_COMMANDS`（:18）、`runExerciseView`（:23）、`runExerciseWrite`（:32） | 不产页面（域门） | 查表 `BY_KEY`（:20） |
| `commands.ts` | 35 | 1：`EXERCISE_COMMANDS`（:24） | 不产页面（**命令事实权威源，10 键**） | 声明 10 条（:25-34） |
| `routes.ts` | 57 | 1：`EXERCISE_ROUTES`（:21） | 不产页面（唤醒词路由） | 42 条记录（`wake` 29 ＋ `new` 13，:22-56） |
| `strength.ts` | 22 | 1：`viewExerciseStrength`（:14） | 力量训练总览 | 转 `buildStrengthView`（`render/exercisePort.ts:107`）→ `buildStrengthDoc`（`render/sportPortDocs.ts:76`） |
| `cardio.ts` | 22 | 1：`viewExerciseCardio`（:14） | 有氧训练总览 | `buildCardioView`（`exercisePort.ts:179`）→ `buildCardioDoc`（`sportPortDocs.ts:147`） |
| `distribution.ts` | 22 | 1：`viewExerciseDistribution`（:14） | 运动类型分布 | `buildDistributionView`（`exercisePort.ts:249`）→ `buildDistributionDoc`（`sportPortDocs.ts:218`） |
| `trend.ts` | 22 | 1：`viewExerciseTrend`（:14） | 运动趋势 | `buildTrendView`（`exercisePort.ts:484`）→ `buildTrendDoc`（`sportPortDocs.ts:458`） |
| `recap.ts` | 22 | 1：`viewExerciseRecap`（:14） | 运动复盘 | `buildRecapView`（`exercisePort.ts:316`）→ `buildRecapDoc`（`sportPortDocs.ts:292`） |
| `goal.ts` | 18 | 1：`viewExerciseGoal`（:14） | 运动目标视图 | `buildExerciseGoalView`（`render/planPlate.ts:199`）→ `buildExerciseGoalDoc`（`render/sportDocs.ts:135`） |
| `exerciseStore.ts` | 288 | 22 | 不产页面（取数与写入） | `lookupMet`（:37）、`resolveWindow`（:119）、`addRecord`（:169）、`updateRecord`（:196）、`deleteRecord`（:225）、`copyYesterday`（:251）、`batchAdd`（:278）、`listWindow`（:284） |

**五个 20 行件的共同形状**（以 `trend.ts` 为样板，:14-22）：读 `defaultRange` 取窗 → 调旧层 `buildXxxView` 取数 → `nums()` 投影 metrics → `return { data, html: buildXxxDoc(v) }`。它们**不做装配**，页面全由旧渲染层出。

## 四、运动页面版块结构（从装配函数与区块字符串读出）

### 4.1 六张「运动移植」页（`packages/skill-calorie/src/render/sportPortDocs.ts`，531 行）

统一骨架：`窗口表单 → KPI 格 → 图表（可选）→ 明细表 → 复制数据`（`dataCopyArea('复制数据', …)`）→ `assembleDocPage`。

| 页 | 装配函数 | 版块（行号） |
|---|---|---|
| 力量训练总览 | `buildStrengthDoc`（:76） | 窗口表单 → KPI（:76 起）→ 逐条表（:120 caption，**100 条截断明示** `RECORD_CAP` :62）→ 复制数据（:124）→ 整页（:135，`charts` :141） |
| 有氧训练总览 | `buildCardioDoc`（:147） | 窗口表单（:149）→ KPI 四格（:150-155）→ 按类型柱图（:159）→ 复制数据 → 整页（:206） |
| 运动类型分布 | `buildDistributionDoc`（:218） | 窗口表单 → KPI → 占比图 → 联动 → 复制数据 → 整页（:280，副标题逐字「分类占比＋摄入/TDEE 联动（缺摄入不断缺口，不编数）」:284） |
| 运动复盘 | `buildRecapDoc`（:292） | 窗口表单（:294）→ KPI 四格（:295-300）→ 每日消耗折线（:304-309，**空缺断点不断 0**）→ 分类表（:311）→ 复制数据 → 整页（:342） |
| 计划复盘 | `buildReviewDoc`（:387） | 计划 vs 实绩 → 整页（:446） |
| 运动趋势 | `buildTrendDoc`（:458） | 窗口表单（:460）→ KPI 四格（:461-469，含峰值日）→ 折线（消耗实线＋时长虚线**独立刻度** :475-487）→ 周频次柱图（:491）→ 逐日表（:501，**100 天截断明示** :498-509）→ 复制数据（:512）→ 整页（:523） |

### 4.2 两张记录／目标页

- **运动记录**（`exercise/records.ts:125` → :179 装配）：**参数表单**（`:130`，开始／结束两字段＋描述）→ **KPI 四格**（`:137-142`：记录数／总消耗／总时长／活跃天数）→ **八列明细表**（`:143-166`：日期／类型／分类／时长／消耗／距离／心率／备注）→ **复制数据**（`:167`）→ 整页（`:179`）。副标题 `modeText`（:115-122）把「分类筛选·有备注｜起止｜共 N 条」拼一句。
- **运动目标视图**（`render/sportDocs.ts:135` → :161 装配）。

### 4.3 一张写后回执（三条写命令共用）

`exercise/receipt.ts:185` 的 `buildExerciseReceiptDoc`，版块序（:236-258）：

1. **KPI 三格**（:237-245）：`statusCard(receipt, writtenDetailOf(key))`（:238，措辞由 `writtenDetailOf` :177-181 按键分「已写入／已更新／已删除运动记录」）＋「影响行数」（:239）＋「写入字段」（:240-244）；
2. **分支明细块**（:200-235）：批量补记→计数表＋逐条表（:201-202）；复制昨日→复制／跳过／目标日期表＋逐条表＋**目标日累计**（:205-215）；单条→单条项值表＋目标日累计（:217-220）；改→命中条数＋改前→改后对照表（:222-227）；删→删除条数（**caption 内嵌软删除措辞** :232）＋逐条表（:234）；
3. **对账信息折叠区**（:247）＝`reconcileDisclosure(receipt)`：记录编号／写入时间／回执格式三行（`shared/receiptParts.ts:34-41`）；
4. **复制区**（:248-257）：`data`（envelope）＋`log`（`copyLog`，命令原文／来源／M5 行／时间戳／版本）——三格式菜单恒开。

`dayTable`（:161-175）按**活行口径** `EX_ALIVE` 算写后现值（:163），自陈「不过滤即错」。

### 4.4 命令与路由规模（#316 搬迁事实）

- `exercise/commands.ts:24` 共 **10 键**（读 7 ＋ 写 3）；
- `exercise/routes.ts:21` 共 **42 条**（`wake` 29 条 order 137–151／159–163／167–175 ＋ `new` 13 条 order 28–37／39）；
- `cli/legacy/scene-04.ts:1` 已清零：「0 条（#316 已全部搬进 `src/exercise/`）」。

## 五、新仓优秀部分（相对老技能的长处，均有实据）

1. **完整文档壳、且唯一一份模板**：整页模板只在 `shared/docPage.ts:36-44` 定义一次；#179 之前「这套模板与装配函数在 7 个 `*Docs.ts` 里各抄了一份」，收成一份（`docPage.ts:5`）。
2. **统一装配入口，无一页例外**：`packages/skill-calorie/src/render/` 下 **85 处 `assembleDocPage` 命中**（全部 `build*Doc` 都走它）；运动侧连写后回执也走它（`exercise/receipt.ts:259`）。
3. **三格式复制菜单恒开且与老仓逐字对齐**：`copyArea.ts:111-113`（收口开关）＋`:43-45`（提示逐字取老仓）＋`formatsOf`（:146-159）。
4. **结构断言与生成一致性**：`test/doc-page-assert.mjs:12-20` 一条 `assertDocPage` 钉 doctype／charset／style／script／`ilife-page`／**无残留标记**；运动侧三份测试直接引用它（`test/exercise-receipt-264.test.mjs:26`、`exercise-routes-265.test.mjs:29`、`exercise-records-342.test.mjs:35`）。
5. **生成物可重生成、不可手改**：`cli/registry.ts:1` 头部声明「由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）」；`registry.ts:39-41` 同键两人声明即抛。
6. **空态与截断都不留死按钮／不静默截数**：复制区三样全没给时出「本页没有可复制的数据」**且不出按钮**（`copyArea.ts:40-41`、`:137-140`）；明细表 100 条截断在 caption 里明示（`sportPortDocs.ts:121`、`:509`）。
7. **无障碍不是空白**：菜单有 `aria-haspopup`／`aria-expanded`（`controls.ts:1339`），焦点环 `:focus-visible` 覆盖全部可交互控件（`style.ts:91-93`），toast 有 `role`／`aria-live`（`controls.ts:236`）。
8. **样式单源＋token 冻结**：11 个 CSS 变量逐值冻结在 `spec/style.ts:12-24`，禁入 token 名单在 `:46`（`--r-xl`／`--pink`），红线「样式只抖 base-paint；类名前缀 `ilife-`」（`:7`）。
9. **写入口径同源**：删除措辞单一定义（`shared/writeParts.ts:19-27`，`recoverable` 恒 false）；`affectedRows` 按 `total_changes()` 增量自算（`exercise/log.ts:58`、`:75`），页内影响行数与信封同源。

## 六、可提升点（视觉信息密度／版式精细度／交互丰富度／移动端）

1. **移动端只有一档断点，且只改内边距与字号**：`packages/base-render/src/blocks.ts:746-751`（`@media (max-width: 640px)` → `padding: 20px 16px 60px`、H1 `26px`）。**表格不转为卡片式堆叠**，只给 `overflow-x: auto`（`blocks.ts:813`、`:939`，`style.ts:738`、`:916`）——八列的运动记录表（`exercise/records.ts:144-153`）在窄屏上必须横向滚动。
2. **版式精细度：桌面留白偏大、单列推进**：正文 `max-width: 960px` ＋ `padding: 32px 20px 80px`（`blocks.ts:715`、`:717`）；无栅格分栏，KPI／图表／表格一律单列堆叠（`grid-template-columns` 只用于 KPI 的 `repeat(auto-fit, minmax(150px,1fr))`，`blocks.ts:763`）。
3. **视觉信息密度：KPI 只有「标签／值／单位／一句 detail」四件**（`blocks.ts:189` 的 `KpiCardInput`），无环比／趋势箭头／迷你图位——运动趋势页的「峰值」只能靠一句 `detail` 写「单日最高 <日期>」（`sportPortDocs.ts:466-468`）。
4. **交互丰富度：无任何页内导航**：全仓无锚点／目录（§2「版面无锚点导航」），长页（趋势页＝折线＋柱图＋逐日表 100 行）只能靠滚动；折叠区也只有回执页用了一处（`exercise/receipt.ts:247`）。
5. **不可打印**：`packages/base-render/src` 无 `@media print`（§2），产物拿去打印没有分页／去装饰定制。
6. **按钮可达性缺 `aria` 细节**：复制与格式菜单有 `aria-haspopup`／`aria-expanded`（`controls.ts:1339`），但原始按钮组未逐颗带 `aria-label`（仅 toast 图标／搜索／清空／回顶有：`controls.ts:196`、`:1031`、`:1037`、`:1172`）。
7. **文案有搬迁残留**：运动五页的 `eyebrow` 仍写「运动移植域」（`sportPortDocs.ts:138`、`:283`，`DOC_TITLE` 亦为「卡路里·运动移植」`sportPortDocs.ts:49`）——「移植」是过程词，新家已成事实后对用户读起来是噪音。
8. **域门有两个导出当前无调用方**：`exercise/index.ts:23` 的 `runExerciseView` 与 `:32` 的 `runExerciseWrite`，全仓（`src` ＋ `test`）除定义处**零命中**；真正分派走生成物 `cli/registry.ts` ＋ `cli/cmd_read.ts:58-62`／`cli/write.ts:73-74`。这是**全 9 个能力目录共有的同形冗余**（`weight/index.ts:30`、`:39` 同形），不是运动独有。

## 七、旧渲染层对照（只作对照，未改）

| 件 | 行数 | 对外导出 | 说明 |
|---|---|---|---|
| `render/exercisePort.ts` | 541 | 18（6 个 view 接口 ＋ 6 个 `buildXxxView` ＋ `PortRow`／`listPortRows` 等） | 运动取数与聚合（**新家仍在用**） |
| `render/sportPortDocs.ts` | 531 | 6（`buildStrengthDoc` :76／`buildCardioDoc` :147／`buildDistributionDoc` :218／`buildRecapDoc` :292／`buildReviewDoc` :387／`buildTrendDoc` :458） | 运动六页整页装配（**新家仍在用**） |
| `render/sportDocs.ts` | 171 | 2（`buildExerciseDoc` :47／`buildExerciseGoalDoc` :135） | 运动总览 ＋ 运动目标视图 |
| `render/html.ts` | 645 | 55 | 老式 `renderXxxHtml` 一族（**另有一条老装配路**，见缺口 §8） |

## 八、覆盖与缺口

**覆盖**：`shared/` 七件 + `exercise/` 十三件 + 旧渲染层四件 + 页面外壳基座（`base-render` 的 `blocks`／`style`／`controls`／`spec`）+ 五连断言，逐件读源码核对，均带行号证据。

**缺口（本席未证或未做）**：
1. **未实跑**：树上 40 处脏文件 + 未跟踪件（他人在途，含 `shared/copyArea.ts` 已改），本席**未构建、未跑样例**，故「产出是真 HTML、用户肉眼验收」这一步**没有本席的实跑证据**——所有结论均来自源码与既有测试的静态阅读。
2. **`render/html.ts` 那条老装配路未逐页核**：它与 `docs.ts` 一路并存（`renderExerciseHtml` :90 等），本席只确认其存在与规模，未逐页比对两路是否逐字等价。
3. **未做老技能侧比对**：老技能侧的四个优点／缺点由另席盘点，本席不重复、不引用其结论。
4. **未做视觉实测**：§6 的信息密度／版式结论来自 CSS 声明（字号、留白、断点、栅格）与区块字段面，**未在浏览器里量过实际渲染效果**。
5. **未改任何源码／测试／生成物**（红线）；临时件只落 `.scratch/t156-new/`。

## 九、产物

- 本件：`docs/skills/skill-calorie/t156-新仓HTML盘点.md`
- 机读索引：`docs/skills/skill-calorie/t156-新仓索引.json`
