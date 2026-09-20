# 卡路里技能解耦架构 · 照抄样板说明书（备忘录包重排用）

**这份是什么**：把 `D:\ilife\packages\skill-calorie\` 当刻的**解耦形状**逐件盘成可照抄的说明书——备忘录包
（`packages/skill-memo-ilife`）要按这套重排时，照本件的表与清单做即可。

**调查口径**：全程只读（本报告是唯一落盘件）。每条结论给「文件路径:行号」或函数名；凡属推断而非直读，
逐条标 `[推断]`。基准＝当刻工作树（未提交改动也算读数，故数字随时会动，**以门和生成器的逐件输出为准**，
不背本件里的数字）。

**读法建议**：要动手前先读 `docs/agents/structure.md`（五条铁律）、`docs/agents/命令登记纪律.md`
与 `docs/agents/命令登记纪律-照抄说明.md`（一页动作清单）；本件是它们的**现场读数索引**，不是替代品。

---

## 〇、一张图看懂

```
用户说唤醒词
   │  → src/triggers/scene-NN-*.ts（冻结词表 437 条，只读）
   │  → src/triggers/routes.generated.ts（生成物：词 → 键 → cli）   ← 声明住 src/<能力>/routes.ts
   ▼
calorie-cmd-read <calorie.key> --params '{…}'          ← 唯一出口，package.json:bin
   │  src/cli/readArgs.ts（参数+预检） → src/cli/config.ts / health.ts（页外键先拦）
   │  src/cli/registry.ts（生成物：键 → 声明）           ← 声明住 src/<能力>/commands.ts
   ▼
声明的 run(params, db) 住该能力目录
   │  取数（*Port/*Plate/engine）→ 视图数据
   │  *Docs.ts 装配区块 → shared/docPage.ts assembleDocPage()
   │  → base-paint/docShell renderDocShell()（doctype/head/资产/图表位）
   ▼
ViewOut{data, html} → src/cli/delivery.ts buildDeliveredEnvelope()
   │  → src/output.ts deliverHtml() → base-paint/save-html saveHtmlFile()
   ▼
stdout 一行 envelope JSON：version/skill/shape/key/data（+ data.output=绝对路径、delivery）
```

**六个关键数字**（当刻实测）：

| 项 | 值 | 出处 |
|---|---|---|
| 能力域目录数 | **10** | `src/cli/registry.ts:10-32` 的 `SOURCES` 十个数组；`test/t367-唤醒词门.test.mjs:205` `DIRS.length >= 10` |
| 命令键数 | **134**（写 52 ＋ 读 82） | `src/cli/keys.ts:3`（生成物横幅） |
| 路由记录数 | **507**（WAKE 437 ＋ NEW 69 ＋ REPAIR 1） | `src/triggers/routes.generated.ts:7` |
| 最小能力目录必开件数 | **3**（`index.ts`／`commands.ts`／`routes.ts`） | 见 §1.4 |
| 加一条命令要碰的手写处数 | **2**（`commands.ts` ＋ `routes.ts`） | `docs/agents/命令登记纪律.md:93-94`、`:140-142` |
| 断点值 | **820 / 640 / 400**（＋宽屏 641／1001） | `packages/base-render/src/pageUi.ts:15-16`、`:213`、`:228` |

---

## 一、七个域目录是怎么切的

### 1.0 先纠一个数：今天不是 7 个，是 **10 个能力域**

现场读数（`src/` 下第一层，共 18 个目录）：

| 类别 | 目录 | 判据 |
|---|---|---|
| **能力域（10）** | `analysis` `body` `diet` `exercise` `goal` `home` `photo` `profile` `weight` `workout` | 每个都有 `index.ts` ＋ `commands.ts` ＋ `routes.ts` 三件 |
| **共用位 / 框架（8）** | `cli` `shared` `render` `triggers` `fetch` `db` `migrate` `xunji` | `cli`／`shared` 无 `index.ts`；`fetch`／`render`／`triggers`／`xunji` 有 `index.ts` 但无 `commands.ts` |

- 10 这个数是**被机器钉住的**：`test/t367-唤醒词门.test.mjs:205` 与 `test/wakeword-gate-343.test.mjs:95`
  都断言 `DIRS.length >= 10`（扫描面＝所有带 `commands.ts` 的目录）。
- **若你手上那份清单写「七个域目录」**，最可能出自 `docs/skills/skill-calorie/t179-impact-list.md:167`：
  那句记的是**按域重排之前**的旧账（「`src/` 下只有 `analysis/ cli/ db/ fetch/ migrate/ render/ triggers/`
  七个目录与 5 个根文件」）。那是 2026-09 中旬的历史快照，与今天无关。`[推断]`（旧数字→今天的 10 个
  之间没有一份「7 → 10」的迁徙证词，我只能按读数判它是对历史那句话的引用）。

### 1.1 域是怎么切的（切法三条，全是直读）

1. **域名取自 HELP 的一级分组**——铁律四（`docs/agents/structure.md:48-53`「能力目录名取自 HELP 的一级分组」）。
   十个域逐字对上 HELP 的十个场景分组：`src/triggers/scene-01-home.ts` … `scene-10-analysis.ts`
   （`src/triggers/index.ts:66-78` 的 `SCENES` 表把 `'01'→SCENE_01_HOME … '10'→SCENE_10_ANALYSIS` 逐条列出）。
2. **一个域可以有好几个「子功能」，但只有一个域目录**——域名＝一级分组，文件名＝**下一级**（子功能）。
   先例：体重域（场景 03）的 HELP 下一级是 量体重／改体重记录／看体重明细／看体重曲线／看体重稳不稳／
   看体重备注／对比体重／体重复盘，对应文件 `log.ts`／`edit.ts`／`history.ts`／`volatility.ts`／
   `compare.ts`／`review.ts`（对照表写在 `src/weight/commands.ts:8-10` 的件头）。
3. **路由声明按「键所属的能力目录」住，不按唤醒词的场景号住**——先例：`calorie.view.exercise` 这个键
   的场景分区是 01（主页），故走它的 19 条词住在 `src/home/routes.ts`，不搬去 `exercise/`
   （账见 `docs/skills/skill-calorie/t167-重新设计-新底座.md:70`）。

### 1.2 逐域：域名 → 职责 → 目录内文件的角色分类

下表每行的「件数／键数／路由数」都是当刻实测；角色代号见 §1.3。

| 域 | 职责（HELP 一级分组） | 文件角色分类（当刻） | 件数 | 键 | 路由 |
|---|---|---|---|---|---|
| `home` | 主页 dashboard（今日／本周／本月／连续／预算五档） | 门 `index.ts`／com `commands.ts`／rt `routes.ts`；取数 `home.ts`；命令事实 `today.ts`；装配 `homeDocs.ts` `goalProgressDocs.ts`；视图分档 `homeViewParts.ts`；运动块 `exercise.ts` | 9 | 4 | 40 |
| `profile` | 基础信息（设／改／查档案） | 门／com／rt；取数 `read.ts`；写 `write.ts` `update.ts` `setup.ts`（含写前页）；装配 `view.ts`；回执 `receipt.ts`；标签 `labels.ts` | 10 | 5 | 6 |
| `weight` | 体重（盘／历史曲线／波动／对比／复盘／明细） | 门／com／rt；存取 `records.ts`；算式 `figures.ts`；子功能 `history.ts` `log.ts` `edit.ts` `compare.ts` `volatility.ts` `weightCompare{,2,3}.ts` `review.ts`；装配 `plate.ts` `plateDocs.ts`；回执 `receipt.ts` `logReceipt.ts`；形状 `weightUi.ts`；标签 `fieldLabels.ts` | 21 | 9 | 62 |
| `diet` | 饮食（记／改／删／看／查食品／营养／榜单／复盘／批量导入） | 门／com／rt；算式 `dietEngine.ts`；取数 `nutritionPort.ts` `precheckPort.ts` `productStore.ts` `products.ts` `library.ts` `nutrition.ts` `ranking.ts` `review.ts` `today.ts` `log.ts` `edit.ts`；plate `libraryPlate.ts` `rankingPlate.ts`；装配 `nutritionPortDocs.ts` `libraryDocs.ts` `rankingDocs.ts` `reviewDocs.ts` `todayDocs.ts` `sourceStatsDocs.ts` `precheck.ts` `precheckParts.ts` `precheckLabel.ts`；回执 `receipt.ts`；形状 `dietUi.ts` | 30 | 26 | 83 |
| `exercise` | 运动（记／改／删／分布／力量／有氧／趋势／复盘／记录明细） | 门／com／rt；存取 `exerciseStore.ts`；子功能薄页 `log.ts` `edit.ts` `goal.ts` `distribution.ts` `strength.ts` `cardio.ts` `trend.ts` `recap.ts`；取数+装配 `records.ts` `sportPortDocs.ts`；回执 `receipt.ts`；形状 `sportUi.ts`；色表 `categoryColors.ts`；写前页 `precheck.ts`；标签 `fieldLabels.ts` | 19 | 10 | 35 |
| `workout` | 健身计划（计划概览／完整计划／某天练什么／编辑器／落地／同步训记／复盘） | 门／com／rt；存取 `planStore.ts` `plan.ts`；写 `write.ts`；写前页 `wizard.ts` `precheckPrompt.ts`；落地 `land.ts` `landBatch.ts` `landPages.ts` `landBatchPages.ts` `landRunner.ts`；训记桥 `xunjiRunner.ts` `xunjiPush.ts` `xunjiBackfill.ts`；编辑器 `planEditor{,Port,Docs,Css,Runtime}.ts`；复盘 `review.ts` `reviewDocs.ts` `reviewDocsCss.ts`；回执 `receipt.ts`；复制区 `planCopyBlock.ts`；小件 `dayPhrase.ts` `movementType.ts` `progress.ts` `contraindication.ts` `fieldLabels.ts` | 31 | 22 | 46 |
| `goal` | 目标管理（营养／饮水／体重／运动目标、推荐、预检、历史） | 门／com／rt；存取 `goalStore.ts` `goalHistory.ts`；算式 `nutritionGoal.ts`；写 `set.ts` `write.ts`；读 `read.ts`；写前页 `precheck.ts`；plate `goalPlate.ts` `goalPlates.ts` `goalExtraPlate.ts`；装配 `resultDocs.ts` `goalRecommendDoc.ts` `goalWeightDoc.ts`；回执 `receipt.ts` | 17 | 15 | 26 |
| `body` | 身体细节（体脂皮褶钳／围度／两向导／对比） | 门／com／rt；存取 `log.ts` `remove.ts`；取数 `view.ts` `compare.ts`；plate `bodyPlate.ts` `wizardPlate.ts`；装配 `bodyDocs.ts` `wizardDocs.ts` `compareCompositionDoc.ts` `compareMeasureDoc.ts`；写前页 `wizard.ts` `wizardPrompt.ts`；回执 `receipt.ts` `receiptData.ts`；形状 `bodyReadUi.ts` `wizardUi.ts` `compareUi.ts` `receiptUi.ts` | 21 | 10 | 17 |
| `photo` | 身材照片（存／看／比／GIF／管／标签／HELP 速查台／三张流程内页） | 门／com／rt；存取 `store.ts` `manage.ts` `photo.ts` `photos.ts` `photoThumb.ts` `dir.ts`；取数 `gallery.ts` `compare.ts` `gif.ts` `picker.ts`；装配 `galleryDoc.ts` `compareDoc.ts` `gifDoc.ts` `pickerDoc.ts` `viewerDoc.ts` `receipt.ts` `wizardPortDocs.ts` `helpCenter.ts` `helpFile.ts`；写前页 `wizard.ts` `wizardPort.ts`；形状 `photoUi.ts` `receiptUi.ts` `wizardUi.ts`；HELP 壳 `helpShell.ts` `helpPaths.ts` `templates.ts` `help.ts` | 31 | 11 | 22 |
| `analysis` | 分析（趋势／缺口／预测／异常／禁忌／报告族／组合配对／多指标趋势） | 门／com／rt；算式与取数 `deficit.ts` `trend.ts` `series.ts` `cross.ts` `exercise.ts` `exerciseReview.ts` `contraindications.ts` `dashboard.ts` `precision.ts` `multiTrend.ts` `simulate{,2}.ts` `review.ts` `historyStore.ts` `result.ts` `utils.ts`；子目录 `anomaly/`（8 件分项检测）；plate `reportPlate.ts` `healthPlate.ts`；装配 `reportDoc*.ts`（6 件）`multiTrendPage.ts` | 36 | 22 | 170 |

> **一处反例值得记住**：`analysis` **没有** `*Ui.ts`，`diet` 只有一件 `dietUi.ts`，而 `workout`／`photo`
> 形状件最多。也就是说「ui 件」不是每域必备件——它按该域的**页内形状债**长出来，不是模板里的一格。

### 1.3 角色表：每个角色负责什么 ｜ 命名后缀约定

| 角色代号 | 负责什么 | 命名后缀约定 | 真实实例（路径:行 或函数） |
|---|---|---|---|
| **门** | 该能力对外的**唯一一道门**；只转出跨目录真要用的名字（一般就一个 `*_COMMANDS`） | `index.ts` | `src/photo/index.ts:13`、`src/diet/index.ts:20-22`、`src/weight/index.ts:18-21`（件头逐条写明「对外几件」与「为什么别的件不出这个目录」） |
| **commands** | 命令事实的**唯一定义地**：键／形状／标题／代表唤醒词／工作流程名／可执行示例／处理函数 | `commands.ts` | `src/weight/commands.ts:30-40`、`src/photo/commands.ts:27-43` |
| **routes** | 唤醒词 → 键 → cli 的**声明**（顺序权威住 `order` 字段） | `routes.ts` | `src/weight/routes.ts:7-73` |
| **engine**（算式） | 纯口径与算式：给输入算输出，不做页面、不碰库 | `*Engine.ts`／`figures.ts`／`trend.ts`／`deficit.ts`／`series.ts` | `src/diet/dietEngine.ts:1-3`、`src/weight/figures.ts:1-4` |
| **port**（取数） | 从库／外部取数并投影成**视图数据**；名字里的 `Port` ＝ 取数端口 | `*Port.ts` | `src/diet/nutritionPort.ts`、`src/diet/precheckPort.ts`、`src/workout/planEditorPort.ts` |
| **plate**（视图） | 「取数结果 → 视图形状」这一层（老叫法沿用：盘），常与 docs 配对出现 | `*Plate.ts` | `src/diet/libraryPlate.ts:1-3`、`src/weight/plate.ts:1-3` |
| **docs**（整页装配） | 把视图数据拼成区块 HTML ＋ 走整页装配；**一页一族一件** | `*Docs.ts`／`*Doc.ts`／`*Page.ts` | `src/diet/nutritionPortDocs.ts`、`src/photo/galleryDoc.ts`、`src/analysis/multiTrendPage.ts` |
| **ui**（页内形状与样式） | 把「`·`／`；` 串」落成有形状的元素（窗口条／事实条／徽章列／键值行）＋本族 CSS | `*Ui.ts`／`*Css.ts` | `src/exercise/sportUi.ts:1-4`、`src/photo/photoUi.ts:1-4`、`src/render/reviewDocsCss.ts` |
| **receipt**（写后回执） | 写命令的整页回执（数据面 ＋ 版面），写声明用 `doc:` 位挂出去 | `receipt.ts`／`*Receipt.ts`／`receiptData.ts` | `src/weight/receipt.ts:1-3`（含端口 `weightReceiptDoc`）、`src/diet/receipt.ts`、`src/body/receiptData.ts:1-3` |
| **wizard**（写前页／预检确认页） | 写类流程先出的那一页（收集／确认／预览），出可复制 prompt | `wizard*.ts`／`precheck*.ts` | `src/photo/wizardPort.ts:1-3`、`src/diet/precheck.ts`、`src/goal/precheck.ts` |
| **共用位**（不属于任何一个能力） | 装配底座、复制区、参数口径、落盘、路由记录、键表 | 住 `src/shared/`／`src/render/`／`src/cli/`／`src/triggers/` | `src/shared/docPage.ts`（装配）、`src/shared/copyArea.ts`（复制区）、`src/shared/params.ts`（参数口径）、`src/output.ts`（落盘） |

**两条硬约束**（决定了上面这张表能不能成立）：

- **共用位里不许出现任何一个能力的名字**（`docs/agents/structure.md:70`）。实例：`src/shared/pageStrips.ts:25`
  件头明写「本件不取数、不取时钟、不出现任何一个能力目录的名字」——三族共用一套拼装逻辑，类名词汇由
  **族参数**传进来（`WINDOW_VOCAB`／`FACT_VOCAB`，`pageStrips.ts:48-58`）。
- **共用件是从第二个用法里长出来的，不是预先设计的**（`structure.md:71`）。实例：`src/render/pageChromeCss.ts:3-5`
  明写「这套规则本来只有看计划族一处，复盘族落地时又抄了一份，本轮写族要第三次用 ⇒ 才提为一件」。

### 1.4 最小能力目录的模板（照抄用）

**一个新域要开的文件数 ＝ 3 件（必开）**，其余按需长：

```
src/<能力>/
├── index.ts      ← ① 能力门：`export { X_COMMANDS } from './commands.js';`（多导一个数组生成器即抛）
├── commands.ts    ← ② 命令声明（**恰好导出一个声明数组**，数组名约定 `<大写域名>_COMMANDS`）
└── routes.ts      ← ③ 路由声明（`export const X_ROUTES: readonly RouteDecl[] = [...]`）
```

- ①②由命令登记纪律钉死：`docs/agents/命令登记纪律.md:53-57`「建它的 `src/<能力>/commands.ts`
  （**恰好导出一个声明数组**，多导一个数组生成器即抛），并在该能力的 `index.ts` 再导出那个数组
  （生成的 `registry.ts` 从 `../<能力>/index.js` 取）」。
- ③的必要性看该域**有没有唤醒词**：有词要被命中就得声明一条路由（`命令登记纪律.md:116-119`）；
  域内三个流程内页命令（`photo` 的 picker／wizard／gif-planner）就**没有代表唤醒词**
  （`src/photo/commands.ts:10-13`，`wakeWord` 可缺的契约在 `src/shared/commandSpec.ts:45-47`）。
- **到这一步就完了**：`registry.ts`／`keys.ts`／`routes.generated.ts` 全是 `pnpm gen` 的派生件，
  新域的声明会被自动扫到（`src/cli/registry.ts:7` 注释「**新加一个能力＝建它的 `commands.ts`**（扫到即自动进来）」）。
- **再往上长**（实测各域件数 9–36，最小的 `home` 9 件）：按「取数 → 装配 → 形状」三族分文件；
  形状件（`*Ui.ts`）与算式件（`*Engine.ts`）**不是必开**，按该域的实际债长（见 §1.2 末尾那条反例）。

### 1.5 能力内部的分层与依赖方向

- **能力内部一层到两层即可**，分层依据是**变化频率**（`structure.md:68-69`）。实例：唯一带子目录的域
  `analysis/anomaly/`（8 件分项检测）——它内部第一层是「按检测对象分片」，不是按工种分。
- **依赖方向只许往下**（`structure.md:70`）。能力之间只经门：`src/diet/index.ts:8-13` 明写
  `buildMealDistributionView` 是「#271／#276 **跨能力调用**」的出口，且**门只留「取数口径要跨能力对齐」
  的那一件**，其余四个走深路径（那是搬迁债务，不是新违规）。
- **能力门也有「对外几件」的上限意识**：铁律五定「一个文件对外不多于五个」，`src/weight/index.ts:6-7`
  老实登记「对外六件（**已越铁律五**……本票把它从 8 件收到 6 件；余下几件的去向登记在 #703 解决评论」）。
  照抄时按 5 以内设计，不要照抄这条越线。

---

## 二、命令登记与唤醒词链

### 2.1 一条命令声明长什么样

形状的**唯一定义地**是 `src/shared/commandSpec.ts`（件头 `:1-10` 明写「谁在用：① 各能力目录的声明文件
② 出口分派层的索引 `src/cli/registry.ts`」）。两条判别式各一个接口：

**读命令 `ReadCommandSpec`（`commandSpec.ts:40-58`，8 个字段）**

| 字段 | 类型 | 逐条说明 |
|---|---|---|
| `kind` | `'read'` | 判别式：读／写两条路产物形状不同（读＝`ViewOut`、写＝`WriteOut`），分派层要能**静态**窄化（`commandSpec.ts:7-9`） |
| `key` | `string` | 命令键，`calorie.` 前缀，必须过 `COMBO_KEY_RE`（`src/cli/keys.ts:18`） |
| `shape` | `EnvelopeShape` | 信封形状（`stat`／`list`／`detail`／`analysis`／`fallback`…），**只有读命令写它** |
| `title` | `string` | 用户看到的中文名；也决定默认落盘文件名（`src/output.ts:74` `chineseCommandFor`） |
| `wakeWord?` | `string` | **代表**唤醒词，可缺；给定时必须是 `TRIGGERS` 里真有的词（生成期 `wakeWordGate()` 拦，见 §2.4） |
| `flows?` | `readonly string[]` | 这条命令服务的**工作流程名**（可零条或多条，取值是封闭表，名单外的名字 `pnpm gen` 与 `pnpm help:build` 当场抛） |
| `example` | `string` | **必填且非空**，照抄即能跑的一行，进 SKILL.md 速查表「例」列 |
| `run` | `ViewHandler` | 处理函数 `(params, db) => ViewOut`，住该能力目录 |

**写命令 `WriteCommandSpec`（`commandSpec.ts:67-88`，字段数同样是 8）**：`kind:'write'`／`key`／`title`／
`wakeWord?`／`flows?`／`example`／`run` ＋ `doc?`。两条与读不同的口径：

- **写命令不写 `shape`**（`commandSpec.ts:62-65`、`命令登记纪律.md:33-35`）：写命令一律 `receipt` 形，
  那件事实的唯一定义地在生成器合成的 `CALORIE_WRITE_COMBOS`；声明上再写一遍就是同一件事的第二种说法。
- **`doc?` 是「整页回执端口」**（`commandSpec.ts:77-87`）：给了就由它出这一条的整页，返 `null` 即让路。
  它为的是**第 7 个带整页回执的能力不必改 `cli/`**（原先是 `cli/write.ts` 里一行六个 `??` 的硬接线）。

**真实样例（照抄这两行即可，共 4 行含外壳）**——出自 `src/weight/commands.ts:31` 与 `:36`：

```ts
export const WEIGHT_COMMANDS = [
  { kind: 'read',  key: 'calorie.view.weight', shape: 'stat', title: '体重盘', wakeWord: '看今日体重', flows: ['量体重', '体重复盘'], run: viewWeight,         example: 'calorie-cmd-read calorie.view.weight' },
  { kind: 'write', key: 'calorie.weight.log',                 title: '记体重', wakeWord: '记体重',     flows: ['量体重'],                    run: writeWeightLog, doc: weightReceiptDoc, example: 'calorie-cmd-read calorie.weight.log --params \'{"kg":70.5}\'' },
] satisfies readonly CommandSpec[];
```

（数组尾写 `satisfies readonly CommandSpec[]`，见 `weight/commands.ts:40`、`photo/commands.ts:43`。）

### 2.2 `routeSpec.ts` 与 `routes.generated.ts` 的关系

| 件 | 是什么 | 谁写 | 手改会怎样 |
|---|---|---|---|
| `src/triggers/routeSpec.ts`（73 行） | **类型唯一处**：`RouteKey`／`SceneNo`／`NonExecBucket`／`ExecWakeRoute`／`NonExecWakeRoute`／`WakeRoute`／`RouteDecl`。**不含任何记录数据**（件头 `:3` 明写） | 人手写 | 改它＝改框架（要抢 `gate.lock` ＋广播） |
| `src/<能力>/routes.ts`（每域一件，共 10 件） | **路由声明的唯一住处**：`RouteDecl[]`，一条记录＝一个词的归属 | 人手写 | 这是**你唯一该改的**（加／删词改这里） |
| `src/triggers/routes.generated.ts`（531 行） | **记录面**：`WAKE_ROUTES`／`NEW_KEY_ROUTES`／`COVERAGE_REPAIR_ROUTES`／`ALL_ROUTES` | `scripts/gen-routes.mjs` 生成 | 手改即被 `pnpm gen:check` 判红（横幅在 `:1`） |
| `src/triggers/routing.ts`（268 行） | **只剩逻辑**：`routesFor`／`execCliForKey`／`routingSummary` ＋ 类型再导出 ＋ 两张说明性常量表（`NON_EXEC_REASONS`／`TWIN_WAKE_WORDS`／`T71_DIFFS`） | 人手写 | **不在生成器 `targets` 里、也不进 `gen:check`**（`命令登记纪律.md:122-124`）——加／删唤醒词**别改它** |

**`RouteDecl` 的七个字段**（`routeSpec.ts:63-73`）：`list`（`'wake'|'new'|'repair'` 属于哪个列表）／
`order`（原列表内 0 基位次，**顺序权威**）／`wakeWord`／`scene`（`'01'…'10'`）／`kind`（`'exec'|'non-exec'`）／
`key?`＋`cli?`（exec 必有）／`bucket?`＋`reason?`（non-exec 必有）。机械不变式写在 `routeSpec.ts:56-62`：
`(list, order)` 全声明件内唯一、`order` 连续无洞、同一条记录只住一个声明件。

生成器保证的三件事（`scripts/gen-routes.mjs:1-14`）：① 顺序知识**只在** `order` 字段里（换文件搬记录不打乱顺序）；
② 守卫全在生成期抛（重复 `(list, order)`／`order` 空洞／`kind` 与字段不配套／同 list 内同 `wakeWord` 跨件重复）；
③ 产物与声明逐条自洽（`pnpm gen:check` 验真）。

### 2.3 生成器在哪；仓根 `pnpm gen` 到底跑什么

- **主生成器**：`packages/skill-calorie/scripts/gen-cli.mjs`（847 LF，件头 `:1-40` 是正本说明）。
  它 `import { loadDecls, renderRoutesGenerated, routeDeclarationSources } from './gen-routes.mjs'`（`gen-cli.mjs:42`）。
- **路由生成器**：`packages/skill-calorie/scripts/gen-routes.mjs`——**可单独跑**（`node …/gen-routes.mjs`），
  也被 `gen-cli.mjs` 引（`gen-routes.mjs:6-8`）。
- **仓根 `pnpm gen`（三条串起来，`package.json:12`）**：
  1. `node packages/skill-calorie/scripts/gen-cli.mjs`
  2. `node packages/skill-bill/scripts/gen-cli.mjs`
  3. `node tooling/skill-call-form.mjs`
- **`gen-cli.mjs` 的六个输出**（件头 `:10-20`，当刻 `targets` 表在 `:770-800`）：
  ① `src/cli/keys.ts` ② `src/cli/registry.ts` ③ `packages/base-combos/combos.yaml` 的 calorie 镜像段
  ④ `scripts/build-help.mjs` 的 `REPR` 表（代表唤醒词）⑤ 同文件的 `EXAMPLE` 表 ⑥ 同文件的 `FLOW` 表
  ＋ 路由产物 `src/triggers/routes.generated.ts`（`:800`）。
- **`pnpm gen:check`（`package.json:13`）守四件事**：上面三条命令各加 `--check`。它比对**盘上文件与生成器
  输出**，不等即 `GEN-CHECK FAIL` 并指出第一处差异；另有**陈旧守卫**（`GEN-STALE FAIL`）与**现场配对门**
  （`GEN-PAIR FAIL`），判据是**内容印记** `dist/.gen-inputs.json`（源文本 sha256 ＋ 编译产物 sha256 一对），
  **不看时间戳**（`gen-cli.mjs:24-37`）。
- **CI 里真跑**（`.github/workflows/ci.yml`，`build-test` 作业）：`pnpm build` 在前，`pnpm gen:check`
  带 `if: always()`；注释里点明成立要件是「**确定性 ＋ 产物入仓 ＋ CI 校验**」三条，缺一条生成物就会
  被人手改、退化成第四份手抄。

### 2.4 唤醒词表住哪、怎么与命令绑

**三张表，三种角色**：

| 表 | 住哪 | 内容 | 与命令怎么绑 |
|---|---|---|---|
| **冻结词表（SoT）** | `src/triggers/scene-01-home.ts` … `scene-10-analysis.ts`（10 片，共 437 条） | 逐词 19 字段（`main_prompt.cli`／`prompt_template`／`subcategory`…），**是 parity 证据，不是路由**（`routing.ts:3-5` 裁定 D-1） | **不绑**：它只是「老实物逐字落地」，改它＝改 SoT（`src/triggers/wake-assets.ts:1-3` 的「唯一事实源」注释） |
| **唤醒词资产** | `src/triggers/wake-assets.ts`（4757 LF，typed TS module） | 全部 436 条场景资产：`WAKE_GROUPS`／`WAKE_ASSETS`／`SCENE_BY_ID`，含 `prompt_template` | 供 HELP 呈现；`wake-assets.ts:3-4` 明写「由实物 JSON 机器生成，**禁止手工改词**，改词即改 SoT」 |
| **路由记录** | 生成物 `src/triggers/routes.generated.ts`，声明住 `src/<能力>/routes.ts` | 词 → `key` → `cli` | **这就是绑定**：exec 记录里 `key` 必在键表内（编译期由 `RouteKey` 约束，`routeSpec.ts:24`） |

- **命令侧的代表唤醒词**在 `commands.ts` 的 `wakeWord` 字段；生成期有一道**代表唤醒词门**：
  `gen-cli.mjs` 的 `checkWakeWords()` ＋ `wakeWordGate()` ＋ `WAKE_GATE_REGISTERED` 登记位
  （台账在 `packages/skill-calorie/AGENTS.md` 的 `scripts/gen-cli.mjs` 那一行）。
- **词表与命令的权威对照**：`src/triggers/help-lookup.ts` 的 `buildHelpLookup`／`lookupWake`
  （真实查找入口，`:34`／`:55`）＋ `CATEGORY_SCENE`（分类 → 场景号）。
- **"例"列与"代表词"列**：`REPR` 表与 `EXAMPLE` 表都是生成物，手写表已退役（`gen-cli.mjs:11-16`）。

### 2.5 加一条新命令要走哪几步（可照抄清单）

**手写面只有 2 处**（`命令登记纪律.md:93-94`、`:140-142`），其余全是派生：

| # | 动作 | 落点 | 机器后果 |
|---|---|---|---|
| 1 | 写命令声明一行（六件事写全，`example` 必填且**先在本地跑通**） | `src/<能力>/commands.ts` | 生成器扫到即进 `registry.ts`／`keys.ts`／`combos.yaml` 镜像／`REPR`／`EXAMPLE`／`FLOW` |
| 2 | 要能被唤醒词命中：加一条路由声明 | `src/<能力>/routes.ts` | 生成物按 `(list, order)` 排序复原三个列表 |
| 3 | 跑生成链**四步**：`pnpm build` → `pnpm gen` → `pnpm build` → `pnpm help:build` | 仓根 | 两次 build 各有用处：第一次编译声明并打内容印记；第二次把生成出来的三件 TS（`keys.ts`／`registry.ts`／`routes.generated.ts`）编进 `dist/`（`命令登记纪律-照抄说明.md:37-43`） |
| 4 | 自证：`pnpm gen:check` ＋ `node docs/skills/skill-calorie/t293-验收-命令自治.mjs`（看 `P1` 的 `UNACCOUNTED` 必须为空） | 仓根 | 前者判「生成物 == 生成器输出」；后者判「有没有第四类手写面悄悄长出来」 |
| 5 | 写命令**多一步**：补逐键落库断言 ＋ 回执场景行 | `test/cmd-write-40-persist.test.mjs`、`docs/research/t97-probe-receipts.mjs` | 这是覆盖门的既有要求，不是计数数字（`照抄说明.md:80-82`） |
| 6 | 命令集一变，还有几处 parity／快照要手跟 | `docs/research/t81-exec-smoke.md`、`test/help-center-106.test.mjs` 的场景数 | 同上（`照抄说明.md:86-90`） |

**两条会被踩到的实测事实**（`照抄说明.md:72-85`）：
**搬迁**一条既有命令 ⇒ `test/` 下 **0 件**必改；**删**命令会先撞**类型门**——`RouteKey` 是编译期约束
（类型唯一处 `src/triggers/routeSpec.ts`），删了声明不先动自己那份路由声明就直接 `TS2820`。
**新增能力的抢锁口径**（`命令登记纪律.md:58-61`）：只有两种情形要**先抢 `gate.lock` ＋广播**——
新增一个能力、或框架级变更（生成器／类型形状／共用底座）；日常加改一条命令是**零接触**共用位。

---

## 三、页面装配

### 3.1 `shared/docPage.ts` 的接口（参数逐个说明）

`assembleDocPage(input: DocPageInput): string`——`src/shared/docPage.ts:106`。接口在 `:25-55`，
共 **11 个字段**（件头 `:12` 明写「本文件不做取数、不装任何能力名，只按参数拼页」）：

| 参数 | 类型 | 逐个说明 |
|---|---|---|
| `docTitle` | `string` | head 的 `<title>` 文本（如「卡路里·饮食」）——:26-27 |
| `title` | `string` | 正文标题（B-01 页面壳的 H1；口径＝人话短标题，**不带日期**）——:28-29 |
| `eyebrow` | `string` | 正文眉标；空串＝不写这一行。**只走 A 线**（B 线忽略它）——:30-31 |
| `subtitle` | `string \| null` | 副标题；假值＝不渲染——:32 |
| `content` | `string` | **已组合好的区块 HTML**（页面装配只负责「最后一公里」）——:33-34 |
| `charts?` | `boolean` | 图表页：模板多一个 `CHARTS-HELPERS` 标记并带上图表 helpers 资产——:35-36 |
| `metaLeft?` | `string` | 第 1 行左：参数一行小字（窗口／区间）。**给了它才走 B 线**，且**同过眉标那道源码标识符筛**——:37-38 |
| `badge?` | `string` | B 线第 1 行右：类型徽章，**由调用方传页型**；不传／空串 ⇒ **整颗徽章不渲染**——:39-42 |
| `summary?` | `string \| null` | B 线第 3 行：结论摘要（一句话人话）；空串／null ⇒ 不出这一行——:43-44 |
| `printable?` | `boolean` | 可打印版式（#448 透传位）：为真时版面根带 `ilife-page-printable`——:45-48 |
| `pageUi?` | `boolean` | **页面级移动端配方开关（#525）**：为真时这一页继承 HELP 页当刻的手机端能力（断点／44px／安全区／窄屏栅格／表格卡片化…）。**不给／给假 → 产出物与旧版逐字节相同**——:49-54 |

**两条路的选择**：`metaLeft` 给了 → B 线（老 A 壳两行式 `meta-bar` ＋ H1 ＋ 结论摘要，`:119-129`）；
没给 → A 线（`renderPageShell({title, eyebrow?, subtitle?, content, printable})`，`:131-139`）。两条最后都交
`renderDocShell({docTitle, bodyHtml, extraCss, charts, pageUi})`（`:129`／`:139`）。

**另外两个出口**：`metricsOf(obj)`（`:143-148`，stat 度量投影：`null`／`undefined` 不进投影）；
`BLINE_CSS`（`:59-67`，B 线补丁样式）；`SOURCE_IDENTIFIER_RE`（`:81`，**恒挡**眉标里的命令键／英文标识符：
`calorie.view.diet`／`app_user` 这类含点号或下划线的连写英文小写串一律整行不出）。

### 3.2 `sceneEnvelope.ts` / `copyArea.ts` / `pageStrips.ts` 各是什么形状

**`shared/sceneEnvelope.ts`（39 行）——一个纯函数，做「场景键归一」**

```ts
export function sceneEnvelope(envelope: SerializableEnvelope): SerializableEnvelope   // :32
```
- 干什么：`key` 已带 `{skill}.` 前缀时**剥掉那一层**（`:36-38`）。背景：公共层的场景标识算式是
  `skill ＋ '.' ＋ key`，而卡路里这侧 50 处信封装配位都写的是**整名**，于是日志第 1 段印成
  `calorie.calorie.view.plan（stat）`——用户照抄回来的是一个**不存在的命令键**（`:4-10`）。
- 两条不回归判据（`:16-19`）：合规写法**返回入参那一只对象本身**（`===`，字节不变）；不合规写法剥一层。
- 规则从 `envelope.skill` 派生，**不写任何能力名**（共用位纪律）。谁在用：`shared/copyArea.ts` 的日志位
  漏斗 ＋ 三族自己直调 `buildLogText` 的页面（`:24-27`）。

**`shared/copyArea.ts`（202 行）——复制与提示共用件，对外 5 个名字**（件头 `:16-18`）

| 名字 | 签名 | 形状 |
|---|---|---|
| `promptCopyArea` | `(prompt: string, label?: string \| null) => string` | prompt 预览块 ＋ 复制按钮；`label` 给了用小标题、`null` 不出小标题、不给用缺省「复制 prompt（必走）」（:109-115） |
| `copyArea` | `(input: CopyAreaInput) => string` | **主入口**：`{title?, prompt?, data?, dataFormats?, log?, emptyText?}` 六位，给了什么出什么，0–3 颗按钮；三样全不给 ⇒ 一句空态、**不出按钮**（:124-151） |
| `dataCopyArea` | `(title: string, input: DataTextInput) => string` | `copyArea` 的薄转发（46 处老调用点仍走这个名字，:172-174） |
| `copyLog` | `(input: CopyLogInput) => CopyLogFields` | 复制日志第 2–6 段入参：`{command, source?, m5Line?, actionAt, version?}`；**时间戳必填、本件不自己取时钟**（:177-185） |
| `notice` | `(input: NoticeInput) => string` | 静态提示块（浅底细描边、**不出「知道了」按钮**，走 `staticNotice: true`）（:192-202） |

**`shared/pageStrips.ts`（197 行）——页内两类形状的唯一定义地：窗口条与事实条**

```ts
export function windowStrip(start, end, chipText: string | undefined, vocab: WindowVocab): string   // :83
export function factStrip(facts: ReadonlyArray<{k,v}>, vocab: FactVocab, variant?: {...}): string   // :99
export function windowStripCss(): string   // :115     export function factStripCss(): string   // :159
export const WINDOW_VOCAB = {...}          // :48      export const FACT_VOCAB = {...}          // :55
```
- 形状的拼装**只写一次**，「族用什么类名」与「几处几何值」由族参数给（件头 `:1-12`）。
- 谁在用（写得出哪两个在用）：**运动族**（`src/exercise/sportUi.ts`）／**体重族**
  （`src/weight/weightUi.ts`）／**饮食族**（`src/diet/dietUi.ts`）——三族各留一行包装并转出原名字（:8-11）。
- 两处**故意不统一**（`:13-23`）：类名（`sui-`／`wui-`／`dui-` 三套是既有**外部契约**，十余件测试按字面断言）
  与几何值（圆角 8px vs 10px、内距 `4px 8px` vs `3px 9px`…那是历次视觉裁定落下的值，统一＝改三族外观）。
- 退化分支：`start === end`（单日窗）只出一枚日期块、不出箭头，块内写「（单日）」（`:81-86`）。

### 3.3 页面产出的完整链路（逐段点名文件）

| 段 | 文件与函数 | 干什么 |
|---|---|---|
| ① 取数 | 域内 `*Port.ts`／`*Plate.ts`／`engine`（如 `src/diet/nutritionPort.ts`、`src/weight/records.ts`） | 从库取数 → 视图数据（**不拼 HTML**） |
| ② 装配 | 域内 `*Docs.ts` 的 `buildXxxDoc() → ViewOut`（如 `src/photo/galleryDoc.ts`、`src/diet/nutritionPortDocs.ts`） | 视图数据 → **区块 HTML**（区块来自公共层 `base-paint/blocks`），再调 `assembleDocPage` |
| ③ 整页 | `src/shared/docPage.ts:106` `assembleDocPage()` | 区块 ＋ 页头语义 → 正文 ＋ 补丁样式，交骨架件 |
| ④ 骨架 | `packages/base-render/src/docShell.ts:73` `renderDocShell()` | doctype／`<html lang="zh-CN">`／charset／viewport／title／`<!--SHARED-CSS-->`／`<!--CONTENT-->`／`<!--SHARED-HELPERS-->`／图表位；资产＝`buildStyleSheet().css + blocksCss() + extraCss`（`:77-81`） |
| ⑤ 声明出口 | `commands.ts` 的 `run`（读）／`run` ＋ `doc`（写） | 分派层查 `registry.ts` 后直接调（`src/cli/cmd_read.ts:64-68`、`src/cli/write.ts:64-70`） |
| ⑥ 交付装配 | `src/cli/delivery.ts:96` `buildDeliveredEnvelope({key, shape, out, params, explicit})` | **三态判定 ＋ envelope 装配的唯一点**：③文本态／②内联态／①文件态（默认）——:90-95 |
| ⑦ 落盘 | `src/output.ts:236` `deliverHtml({key, params, explicit?, target?, html})` | 落点优先级：`--html`（显式覆盖，覆盖写）> `target`（产物意图）> 默认 `<库目录>/calorie_html/<中文command>_<TS>[_N].html`；只读类失败 → `{mode:'inline'}`（`:243-273`） |
| ⑧ 写文件 | `base-paint/save-html` 的 `saveHtmlFile({dir, stem \| file, html, onExists?})`（`packages/base-render/src/output/saveHtml.ts:339`） | **唯一仲裁者**：`wx` 独占创建、同秒递补、`onExists` 四态（`succession`／`overwrite`／`fail`／`{reuse}`），`bytes` 写后回读（`output.ts:172-181` 的注释口径） |
| ⑨ 回执 | 同上 `buildDeliveredEnvelope` 的返回（`delivery.ts:126-132`） | `data.output` ＝ **绝对路径**（文件态）、`data.html`（内联态）；顶层追加 `delivery{mode,path?,template?,bytes?}`（`render/envelope.ts:206` `withDelivery`） |
| ⑩ stdout | `src/cli/cmd_read.ts:161` | 只打一行 envelope JSON：`version/skill/shape/key/data`（＋`delivery`／`data.output`），**stdout 纯净**（`:6`） |

**失败路**（同样点得出文件）：`delivery.ts:139` `failWithReceipt()`——**模板化**回执
（`buildErrorReceipt` ＋ `renderErrorHtml`，**严禁手写 HTML 兜底**），一行 `RECEIPT {…}` 落 **stderr**，exit 5；
身体域的缺数据／缺参数走整页版姐妹件 `failWithBodyReceipt()`（`:187`，外层经 `assembleDocPage` 包成完整文档）。

**落盘走哪个共用件、函数名与签名**（照抄直接抄这两条）：

```ts
// ① 本包：src/output.ts:236
export function deliverHtml(input: { key: string; params: Record<string, unknown>;
  explicit?: string; target?: HtmlLanding; html: string }): HtmlDelivery

// ② 公共层：base-paint/save-html（packages/base-render/src/output/saveHtml.ts:339）
export function saveHtmlFile(input: { dir: string; stem?: string; file?: string;
  html: string; onExists?: HtmlOnExists }): HtmlReceipt   // 回执 {mode:'file', path, bytes}
```
`HtmlLanding` 定义在 `saveHtml.ts:75-78`：`{ dir: string; stem: string }`——**只给落点意图，不给名字怎么解释**
（`output.ts:172-181`）。

---

## 四、响应式与视觉配方

### 4.1 断点值（只用仓内既有值，不新造）

| 断点 | 语义 | 定义地 |
|---|---|---|
| **640** | 共享区块层（`blocks.ts`）的窄屏档：安全区留白、字号节奏、读数卡栅格、页内导航横滑、表格卡片化 | `packages/base-render/src/pageUi.ts:15-16`、`:89`、`:173`；`blocks.ts:1430`／`:1889`／`:2043` |
| **820** | **页面级**窄屏档（照 HELP 页当刻能力）：页壳收紧内距、页头字号、读数卡两列、页内导航换行 | `pageUi.ts:15-16`；卡路里侧 `src/render/pageChromeCss.ts:38`；各域 `*Ui.ts`（见 4.2） |
| **400** | 曾用于「读数卡塌单列」，**#728 已撤**（撤因：390 正落在 `max-width:400` 里 ⇒ 那条永远不生效，8 张卡一路单列吃掉 40–45% 高度） | `pageUi.ts:162-167`（撤规则的说明就写在原地） |
| **641**／**1001** | 宽屏档的反向补集：`min-width:641px`（两列表键贴左值贴右）、`min-width:1001px`（页壳放宽到 1280、正文 880 居中、读数卡一行四张、参数表单两列） | `pageUi.ts:213`、`:228`、`:307` |

> 口径一句话：**断点只用仓内既有值 820／640／400，不新造**（`pageUi.ts:15-16` 逐字）。

### 4.2 媒体查询写在哪

| 层 | 文件 | 写什么 |
|---|---|---|
| **公共层·页面级配方** | `packages/base-render/src/pageUi.ts`（320 行，导出 `pageUiCss()`） | ①图片兜底 ②置灰规则 ③页内定位 `scroll-margin-top:20px` ④表格横滑兜底 **⑤触摸区（全宽档 44px）** ⑥窄屏 640 的安全区／字号下限／读数卡两格／页内导航横滑／表格卡片化 ⑦（已撤）⑧宽屏 1001 按栅格收窄 ⑨状态字 13px ⑩提示块图标位 ⑪桌面参数表单两列。**全部规则挂在根类 `.ilife-page-ui` 之下**，未启用的页一条都命中不到（`:23-24`） |
| **公共层·页面级形状** | `packages/base-render/src/pageShapes.ts`（`pageShapeCss`／`renderFactStrip`／`renderMediaFigure`／`renderMediaPlaceholder`／`renderTimelineRows`；入口 `src/index.ts` 尾部转出） | 事实条／图片与 GIF 容器／时间轴条／媒体占位件 |
| **共享区块层** | `packages/base-render/src/blocks.ts`（`@media (max-width:640px)` 数段）+ `style.ts` | 12 个区块自己的窄屏行为 |
| **卡路里·页面级** | `src/render/pageChromeCss.ts:24` `pageChromeCss(maxWidth: number): string` | 页宽（`max-width` 参数化：看计划族 900／复盘与写族 960）＋触屏三件（`-webkit-tap-highlight-color:transparent`／`touch-action:manipulation`／`summary{min-height:44px}`）＋按钮行自约束宽度居中（`.ilife-action-bar{max-width:520px;margin:0 auto}`）＋ **820 档**页壳收紧与读数卡两列（`:26-44`） |
| **卡路里·各域自己的样式** | 各域 `*Ui.ts`／`*Css.ts`（`sportUi.ts:99,:127`／`weightUi.ts:131`／`photoUi.ts:168,:181`／`bodyReadUi.ts:45,:53`／`wizardUi.ts:68,:71`／`sportPortDocs.ts:262`／`trendDocs.ts:430`／`planWizardCss.ts:103`／`workoutPlanCss.ts:165`／`planEditorCss.ts:128`／`rankingDocs.ts:181`／`reviewDocsCss.ts:106` 等） | **820 为主、640 为辅**（820 管页内自造的件、640 管共享件——`pageChromeCss.ts:16-17` 明写两段「同向、不打架」） |

### 4.3 共用「响应式门」判据脚本（点名文件与判据条数）

**`packages/skill-calorie/scripts/measure-responsive.mjs`（350 LF）**——真浏览器（headless Chrome ＋ CDP
`Emulation.setDeviceMetricsOverride`）三档读数，**不是静态 HTML 文本比对**（件头 `:2-6`）：

- **三档视口**：`DEFAULT_WIDTHS = [390, 768, 1440]`（`:35`）。
- **判据三条**（唯一事实源函数 `cellWhy(o, uf, got, want)`，`:259-260`）：① 文档横向溢出
  `docScrollWidth − innerWidth > 0`；② 图片放不下 `img.fits === false`（实际渲染宽 > 容器内容宽）；
  ③ **视口守卫** `|innerWidth − 设定宽| > 0.5`。任一破 ⇒ 该格失败，失败格印 `✗ ＋原因`。
- 另有两条**只报不计**的旁证（`:223-228`）：`clipped`（`overflow-x: hidden/clip` 且 `scrollWidth > clientWidth`
  ＝**悄悄裁掉**的那一类）＋ `scrollers`（`auto/scroll` ＝设计内横滑）。
- 退出码：`failed === 0 ? 0 : 1`（`:350`）；范围外件用 `--exclude` 显式声明，读数照打、只不进退出码
  （`--exclude` 的口径写在 `:14-15`：「**没有缺省的放宽，要放宽必须逐件写在命令行上**」）。

**触摸与字号的独立探针**：`docs/skills/skill-calorie/t525-触摸探针.mjs`（真 Chrome ＋ CDP）——
可点元素＝`a[href]／button／input／select／textarea／[role=button]／summary` 且当刻有面积、
`visibility` 非 hidden、`opacity` 非 0、不带 `disabled`；**命中区 w×h 两者都要 ≥44**；
另量**字号下限**（只数有直接文本节点的元素）。退出码 0／1／2（`:17-19`）。

**同族还有两件视觉债工具**（不在退出码链上，按需跑）：
`scripts/audit-separators.mjs`（#516 分隔符与内部标识符设计债门：可见文本里出现 `；`／`·` 并列分隔符
即判设计债）；`src/render/…` 一族页内样式（无独立工具）。

### 4.4 触摸目标尺寸、字体族／字号是否跟随宿主的做法

- **触摸目标 ＝ 44×44（全宽档口径，不只窄屏）**：`pageUi.ts:69-80` 给
  `.ilife-copy-btn`／`.ilife-copy-menu-item`／`.ilife-action-btn`／`.ilife-block-disclosure-summary`／
  `.ilife-block-param-form-input`／`.ilife-block-toc a` 一律 `min-height: 44px`；注释 `:70-71` 记了这条
  **原来只在媒体查询里、实测 1440 档页内导航只有 27px 高**，故移出媒体查询。页面级另有一半：
  `pageChromeCss.ts:31-34` 的 `summary{min-height:44px}` 与触屏两属性。
- **字体族 ＝ 公共层唯一真相源 `BODY_FONT_STACK`**（`packages/base-render/src/font.ts`）：
  `'"SF Pro Display", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif'`。
  谁在用（写得出哪两处在用）：help 模板（`style.ts:771`）与共享页面模板（`blocks.ts:1338`）——
  `font.ts:3-7` 明写「此前只写在 `style.ts` 一处、只有 help 模板用；#179 给共享页面模板补字体基础时
  出现**第二个用法** ⇒ 抽出来」（等宽栈不在此列，各产出器自己的 `"SF Mono", monospace` 原样保留）。
- **HELP 壳是另一条独立串**：`packages/base-render/src/helpShell.ts:42` 的
  `body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;…font-size:14px}`。
- **「是否跟随宿主」＝不跟随宿主进程，而是「跟随 HELP 页当刻的能力」**：口径正本在
  `pageUi.ts:1-6`「把 HELP 页当刻的手机端能力搬进『结果型／过程型／回执』三类页面共走的那条链」，
  且在 `docPage.ts:49-54` 用一个**显式开关** `pageUi` 决定要不要继承（不给／给假 ⇒ 产出物与旧版**逐字节相同**）。
  也就是说：宿主（DSH／飞书／浏览器）不提供字体与断点，**页面自带字体栈 ＋ 自带 `<meta name=viewport>`**
  （`docShell.ts:58`：`width=device-width,initial-scale=1`，启用配方时换成 `…,viewport-fit=cover`，`pageUi.ts:35`）。
- **字号下限**：`pageUi.ts:95-100` 窄屏把正文类文本抬到 ≥12px（口径行／列表行／读数卡说明）；
  `pageUi.ts:267-275` 把「状态字」（徽章与读数卡说明）抬到 **13px**——不比正文 15px 高、也不与标签 12px 齐平，
  与 HELP 侧 13px 那一档逐值同。

---

## 五、机器门与棘轮

### 5.1 本包 `package.json` 的 scripts（逐条）

`packages/skill-calorie/package.json:31-34`，**只有两条**：

| script | 命令 | 跑什么 |
|---|---|---|
| `build` | `tsc -b && node scripts/build-help.mjs` | 编译 ＋ 重写 SKILL.md 的标记块（`build-help.mjs` 里**没有一条命令的手写事实**，`REPR`／`EXAMPLE`／`FLOW` 三表都是生成物——件头 `:3-6`） |
| `test` | `node --test ../../test/scaffold.test.mjs ../../test/calorie-triggers.test.mjs test/fetch-t6.test.mjs test/help-reuse-245.test.mjs` | **只跑这四件**；本包测试面全量由仓根 `pnpm test` 的 glob 收（见 5.2） |

> 注意 `exports` 只有三条：`.`／`./cli`／`./package.json`（`package.json:8-12`）——包门「只许收窄」
> （`docs/agents/structure.md:17-21`），`src/index.ts:1-13` 的件头记了收窄到 63 个对外名字的账。

### 5.2 仓根 `package.json` 里与本包有关的 scripts（逐条）

`package.json:10-31`：

| script | 命令（要点） | 与本包的关系 |
|---|---|---|
| `build` | `tsc -b && node packages/skill-calorie/scripts/gen-cli.mjs --stamp && node packages/skill-bill/scripts/gen-cli.mjs --stamp && pnpm -r --if-present run build:client` | **打内容印记**这一步挂在 build 里——绕过 `pnpm build` 直接调 `tsc` 印记不会更新（`命令登记纪律.md:72`） |
| `gen` | `node packages/skill-calorie/scripts/gen-cli.mjs && node packages/skill-bill/scripts/gen-cli.mjs && node tooling/skill-call-form.mjs` | 写盘生成物（本包六件 ＋ bill ＋ 调用形态） |
| `gen:check` | 同上三条各加 `--check` | **生成物一致性门**（CI 真跑） |
| `test:types` | `tsc -b` | 类型门（删命令忘改路由声明即在这里红） |
| `test` | `node --test "test/*.test.mjs" "packages/*/test/*.test.mjs" …`（15 个 glob） | 本包 `test/*.test.mjs` **201 件**全量在这里跑（含棘轮与各门测试） |
| `doctor` | `node tooling/skilllink.mjs doctor` | 装机/链接体检 |
| `snapshot:html` / `:check` / `:list` | `node tooling/skill-html-snapshot.mjs …` | 其余技能 HTML 不回归门（逐件 sha256） |
| `help:build` | `node packages/skill-calorie/scripts/build-help.mjs` | 重生成 SKILL.md 标记块 |
| `help:examples:check` | `node packages/skill-calorie/scripts/check-examples.mjs` | SKILL.md「例」列**逐行 spawn 真 CLI 断言 exit 0**（判据四条：块内容新鲜／行数==键数且每键恰一行／`--params` 可 `JSON.parse`／真跑 exit 0 且 envelope `key` 对得上）；**今天带着票外既有红**（CI 里排在 job 末尾） |
| `boundaries` | `node tooling/check-boundaries.mjs` | 边界门 |
| `publish:pre` / `:tarball` / `:fresh` / `:plan` | `node tooling/check-publish.mjs …` / `publish-chain.mjs --plan` | 发布三门（G1 workspace 外泄／G2 tarball 清单／G3 fresh 安装态） |
| `changeset:status` | `changeset status` | 变更集状态 |
| `gate:run` / `gate:audit` / `gate:selftest` / `gate:selftest:html` | `node tooling/run-locked.mjs …` 等 | 持锁跑命令／门禁审计／门禁工具自证 |

**本包自带的检查脚本**（`packages/skill-calorie/scripts/`，13 件）：
`audit-separators.mjs`（分隔符设计债门）、`build-help.mjs`、`check-examples.mjs`、`check-one-path.mjs`
（同一符号只许一条 `dist` 路径）、`check-page-assert.mjs`（spawn 真交付出口又断成功的件必须解析 stdout 成
envelope）、`check-warning-line.mjs`（行数台账对账 ＋ `--sync` 同步器）、`gen-cli.mjs`、`gen-photo-baseline.mjs`
（照片十页 sha 冻结，`--write`／`--check`）、`gen-routes.mjs`、`gen-sot-snapshot.mjs`（SoT `entry_sha` 重算，
`--write`／`--check`）、`measure-responsive.mjs`、`migrate-calorie.mjs`、`wizard-publish.sh`。

### 5.3 行数告警线（数值 ＋ 门在哪）

- **告警线＝350 行；数法＝LF 口径，只数 `\n`**（`packages/skill-calorie/AGENTS.md:7`「**告警线＝350 行。
  数法：LF 口径，只数 `\n`**」）。
- **范围**：本包 `src/**/*.ts` 与包内 `scripts/**/*.mjs`；**生成物不算**——剔除名单**只认生成器自己的输出声明**
  （`scripts/gen-*.mjs` 里名字带 `OUT`／`TARGET(S)`／`DST`／`DEST`／`GEN…` 段的 `const <名> = join(SRC_DIR, …)`
  与 `targets` 数组里的 `path:`），**不手写一份会过期的名单**；判据「一条输出声明都抽不到即红」。
  当刻剔出三件：`src/cli/keys.ts`／`src/cli/registry.ts`／`src/triggers/routes.generated.ts`（`:9-15`）。
  不算：`templates/*.html`、`SKILL.md`、`test/*.mjs`、`dist/`、`.tsbuildinfo`（`:16`）。
- **门 ＝ `packages/skill-calorie/scripts/check-warning-line.mjs`**（356 LF）：
  - 绿＝台账齐全**且**与实况逐件一致：`exit 0`、`RESULT: n/n`、`PASS: 告警线台账齐全且与实况一致`（`:122`）；
  - 红**五种**并逐条点名（`:123-128`）：漏报（台账没有）／台账陈化（台账≠实况）／台账件在扫描面内不成立／
    台账缺行／挂号值被改写／生成物判据自证与印记已认领；
  - 回绿＝跑同步器 `--sync`（先 `--sync --dry` 只演练），**不用手改数**（`:129`）。
- **台账住 `packages/skill-calorie/AGENTS.md` 的 `<!-- warning-line-ledger:begin -->` 块**——
  表列＝`件`／`挂号值`（首次挂号时的 LF，历史事实**永不回改**）／`当场实测`（脚本核对的就是这一列）／`结论`。
  当刻该表在册 **45 行 / 44 件**（`scripts/build-help.mjs` 各占两行），其中超线件实测 **355–4757 LF**
  （最大的是 `src/triggers/wake-assets.ts` 4757 LF），另有一件 334 LF 在册但标明未越线（`src/home/homeDocs.ts`）。
  `structure.md:74` 明文：**超线申报警、不是拦路**；超线即触发必报五步的**第四步**（当场报一句
  「已超线，需要根据规则进行重构。」＋超因＋拆法或为什么不拆）。
- **口径出处**：`AGENTS.md:19`——用户答复（私家厨房那张图的 Q4b，逐字「350 ＋ LF 口径，写进
  packages/skill-chef/AGENTS.md」）；兄弟件 `packages/skill-chef/AGENTS.md` 与 `packages/base-render/AGENTS.md`
  同数、同落点。

### 5.4 生成物一致性门、棘轮与其他结构门（点名文件）

| 类别 | 点名文件 | 钉住什么 |
|---|---|---|
| **生成物一致性门** | `pnpm gen:check` → `packages/skill-calorie/scripts/gen-cli.mjs --check`（＋ bill ＋ skill-call-form）；`.github/workflows/ci.yml` 里 `pnpm build` 之后 `pnpm gen:check`（`if: always()`） | 盘上生成物 == 生成器输出；另有陈旧守卫 `GEN-STALE FAIL` 与现场配对门 `GEN-PAIR FAIL`（`gen-cli.mjs:24-37`） |
| **棘轮** | `packages/skill-calorie/test/cmd-registry-294.test.mjs` | ① `FROZEN_READ_LINES = 1146`／`FROZEN_WRITE_LINES = 745`（`:67-68`），两个分派文件**行数只许减少**（`:187-191`）——**量行数用节点口径** `readFileSync(f,'utf8').split('\n').length - 1`（`命令登记纪律.md:158-159`）；② 「往分派层加一条分支」无上限可调：空白名单是硬断言（`:6-7`），行为口径扫描器不认真引号／`if` 阶梯／就地键集查询（`:84-88`）；③ 老路容器缺席：`src/cli/legacy/` 与 `test/legacy-frozen-295.mjs` 都不许回来（`:238-242`） |
| **告警线台账门** | `packages/skill-calorie/scripts/check-warning-line.mjs` ＋ `test/t445-告警线门.test.mjs` | 台账不随实况更新即报警（含 `--root`／`--agents` 夹具与变异用例） |
| **结构门（测试面）** | `scripts/check-one-path.mjs`（`test/t717-防复发门.test.mjs` 跑它） | 测试面每个符号只有一条 `dist` 路径；例外从源码的薄转出声明派生，不认手写清单 |
| **结构门（断言面）** | `scripts/check-page-assert.mjs` | spawn 真交付出口又断它成功的件必须把 stdout 解析成 envelope；`--selftest` 五条 |
| **页面基线冻结** | `scripts/gen-photo-baseline.mjs --check` | 照片十页「规范化正文 sha256」逐页比对（固定种子库＋固定照片目录＋钉死时钟） |
| **SoT 快照** | `scripts/gen-sot-snapshot.mjs --check` | 冻结词表 19 字段 sha（`entry_sha`） |
| **跨技能 HTML** | `tooling/skill-html-snapshot.mjs --check`（`pnpm snapshot:html:check`） | 其余技能 HTML 逐件 sha256 不回归 |
| **命令自治探针**（独立验收，不进 `pnpm test`） | `docs/skills/skill-calorie/t293-验收-命令自治.mjs` | 五条承诺：P1 自治（手写面三桶 `UNACCOUNTED` 必须为空）／P2 单一权威源／P3 两道机器门／P4 薄分派／P5 parity |

---

## 六、备忘录照抄这套需要哪些件

### 6.1 「卡路里有什么 → 备忘录对应要开什么」映射表

**照抄原则：抄形状，不抄内容；每条事实只有一个定义地。**

| 卡路里件（路径） | 备忘录对应要开的件 | 动作与注意 |
|---|---|---|
| `src/<能力>/commands.ts`（10 件） | `src/<能力>/commands.ts` | 备忘录按**自己** HELP 的一级分组建域；数组名 `<大写域名>_COMMANDS`；**恰好导出一个声明数组** |
| `src/<能力>/routes.ts`（10 件，507 条记录） | `src/<能力>/routes.ts` | 词 → 键 → cli 的声明；`order` 是顺序权威 |
| `src/<能力>/index.ts`（能力门） | 同名件 | 只转出 `*_COMMANDS`（＋真跨域要用的取数）；**一个文件对外不多于五个**（卡路里 `weight/index.ts:6` 那 6 件是越线登记，别照抄） |
| `src/shared/commandSpec.ts`（91 行） | `src/shared/commandSpec.ts` | **本包自己一份**（铁律一：不许跨包 import 卡路里的）；字段按备忘录实际需要裁（读／写两判别式至少要有） |
| `src/cli/registry.ts`（生成物，51 行） | `src/cli/registry.ts`（生成物） | **不许手写**；备忘录的生成器扫自己的 `src/*/commands.ts` |
| `src/cli/keys.ts`（生成物，182 行） | `src/cli/keys.ts`（生成物） | 键表 ＋ 写键形状（`*_WRITE_COMBOS`）；键前缀换成备忘录的（`memo.`） |
| `src/cli/cmd_read.ts`（166 行） | 唯一出口 `memo-cmd-read`（`src/cli/cmd_read.ts`） | **四件套**：`readArgs.ts`（参数＋预检）／`delivery.ts`（envelope＋三态交付＋失败回执）／`write.ts`（写分发）／`config.ts`＋`health.ts`（页外键先拦）。备忘录今天的 `src/cli/cmd_read.ts` 是 570 LF 单件，照卡路里拆成这四件即达标 |
| `src/output.ts`（321 行） | `src/output.ts` | 落盘命名与落点意图 ＋ `deliverHtml`；**真正的写文件仍交公共层** `base-paint/save-html` 的 `saveHtmlFile` |
| `src/shared/docPage.ts`（150 行） | `src/shared/docPage.ts` | 整页装配（`assembleDocPage` 11 参数 ＋ `metricsOf`）；文档壳交 `base-paint/docShell` 的 `renderDocShell` |
| `src/shared/copyArea.ts`（202 行）＋ `src/shared/sceneEnvelope.ts`（39 行） | 同名两件 | 复制区 5 出口 ＋ 场景键归一；`sceneEnvelope` 那条坑（`skill＋'.'＋key` 拼两遍）备忘录同样会踩 |
| `src/shared/pageStrips.ts`（197 行） | 按需（第二个用法出现再抽） | 窗口条／事实条；**两族共用才抽**——备忘录若只有一族在用，先留在族里（`structure.md:71`） |
| `src/shared/params.ts`（181 行）／`receiptParts.ts`／`writeParts.ts`／`fieldLabel.ts`／`sourceLine.ts`／`emptyGuide.ts`／`operationHead.ts`／`contentSuffix.ts`／`time.ts`／`meal.ts`／`kcalPerKg.ts`／`healthRate.ts`／`nutritionRange.ts`／`alive.ts`／`copyBlock.ts`／`planCopyBlock.ts` | 逐个对照，**只开备忘录真用得上的** | 这些是「第二个用法长出来」的共用件，不是模板必备项；按 `pnpm`/测试红绿灯决定 |
| `src/render/pageChromeCss.ts`（45 行） | `src/render/pageChromeCss.ts` | 页宽参数化 ＋ 触屏三件 ＋ 820 档；**断点值别自造**（用 820／640／400） |
| `src/render/envelope.ts`（209 行） | `src/render/envelope.ts` | 五 shape 键表 ＋ `Delivery` 三态契约 ＋ `buildDelivery`／`withDelivery` |
| `src/triggers/routeSpec.ts`／`routing.ts`／`routes.generated.ts` ／`scene-NN-*.ts`／`wake-assets.ts`／`types.ts`／`help-lookup.ts`／`index.ts` | 同名一族 | 类型唯一处／逻辑／生成物／冻结词表（备忘录 8 域 13 组 30 场景）／资产／查找层 |
| `scripts/gen-cli.mjs` ＋ `scripts/gen-routes.mjs` | 同名两件（或合成一件） | 生成器输入＝**编译后的** `dist/<能力>/commands.js`；输出＝键表／注册表／路由生成物／HELP 标记块。备忘录要改：包路径、键前缀、产物路径、扫描的域目录 |
| `scripts/check-warning-line.mjs` ＋ `AGENTS.md` 的台账块 | 同名件 ＋ 自己的台账 | 备忘录要定自己的告警线数字并写进 `packages/skill-memo-ilife/AGENTS.md`（`structure.md:74` 要求数字写在各包自己的地方） |
| `scripts/check-one-path.mjs`／`check-page-assert.mjs`／`measure-responsive.mjs`／`audit-separators.mjs`／`gen-photo-baseline.mjs`／`gen-sot-snapshot.mjs` | 分别评估 | 前两件判据与内容无关（可整份搬）；`measure-responsive`／`audit-separators` 与页面有关（搬形状、换页清单）；后两件卡路里专属 |
| `test/cmd-registry-294.test.mjs`（棘轮，331 行） | 备忘录自己的棘轮件 | 抄三件事：空白名单硬断言（分派层不许有按键分派字面量）／分派文件行数上限（只许变短）／老路容器缺席断言；冻结值按备忘录自己的实测定 |
| 根 `package.json` 的 `gen`／`gen:check` | 同上 | 备忘录若并入仓根生成链：加一行 `node packages/skill-memo-ilife/scripts/gen-cli.mjs`；否则自己一条脚本 ＋ CI 里一道 `--check` |
| `.github/workflows/ci.yml` 的 `pnpm build` → `pnpm gen:check`（`if: always()`） | 同一条 | 三条成立要件（确定性／产物入仓／CI 校验）缺一这套形状就塌（`命令登记纪律.md:16-24`） |

**最小开工集（备忘录先能跑通一条命令的最小件）**＝
`src/<能力>/commands.ts` ＋ `src/<能力>/routes.ts` ＋ `src/<能力>/index.ts`（3 件）
＋ `src/shared/commandSpec.ts` ＋ `src/cli/registry.ts`（生成物）＋ `src/cli/keys.ts`（生成物）
＋ 出口 `src/cli/cmd_read.ts`（先合体，之后再拆四件）＋ 生成器 `scripts/gen-cli.mjs` ＝ **7 件手写 ＋ 2 件生成物**。

### 6.2 哪些卡路里特有的东西，备忘录**不该抄**

**A. 整域不该抄（备忘录没有这项业务）**

| 卡路里的域 | 为什么不抄 |
|---|---|
| `workout`（健身计划 22 键／46 路由／31 件） | 训练计划、编辑器运行时（`planEditorRuntime.ts` 427 LF 一段 JS 文本）、落地五键、**训记桥**（`xunji*.ts` 三件 ＋ `src/xunji/` 20 件）——备忘录没有训练与外部同步目标 |
| `body`（身体细节 10 键／17 路由） | 皮褶钳体脂、围度、两向导——身体测量专属 |
| `photo`（身材照片 11 键／22 路由／31 件） | 照片目录解析（`dir.ts`）、缩略图、GIF 合成（`gif.ts` 274 LF）、媒体内嵌——备忘录的媒体只有「图片/附件」那点面，若确要抄只抄 `photoUi.ts` 的形状手法 |
| `exercise`（运动 10 键／35 路由） | 运动记录与 MET 估算 |
| `diet`（饮食 26 键／83 路由——**最大域**） | 食品库、营养表、批量导入预检、榜单、餐别分布 |
| `weight`（体重 9 键／62 路由） | 体重／体脂曲线、波动分析、体重对比（`weightCompare{,2,3}.ts` 三件） |
| `goal`（目标管理 15 键／26 路由） | 营养／饮水／体重／运动四类目标与推荐算式 |
| `analysis` 的大部分（22 键／170 路由——**路由最多**） | 缺口／预测／异常／禁忌／报告族／组合配对——备忘录没有这些统计形态 |

**B. 卡路里专属的数字与名字（抄了就变成第二个定义地）**

- 数字：**436／437** 唤醒词、**134** 键、**507** 路由、**1146／745** 棘轮冻结行数、
  `350` 行的**台账在册行数**、HELP 的 10 场景 × 逐场景条数（9/70/58/39/32/25/4/13/10/176）。
- 名字：`calorie.*` 键前缀、`calorie-cmd-read`、`CALORIE_*` 常量名、`calorie.yaml`、
  `calorie_html` / `calorie_data.db`、`CardioRenderError` 一类错误类名、每一条中文命令标题与唤醒词
  （「看今日主页」「记一餐」…）、`CATEGORY_SCENE` 的十个分类。
- 卡路里那份配置表 `CALORIE_CONFIG_DEFAULTS`（`src/config.ts:25-31`：`db`／`html`／`photos`／`xunji`／`land`）
  ——备忘录用**自己的**键（备忘录没有 `photos`／`xunji`／`land`）。

**C. 卡路里特有的机制（备忘录不该跟着建）**

- **训记外调链**：`src/xunji/`（20 件：密钥 `key.ts`、限流 `rateLimit.ts`、重试 `retry.ts`、推送/回填）
  ＋ `workout/xunjiRunner.ts`（子进程，因为能力目录的处理函数是同步的）。
- **跨技能落地**：`CALORIE_CONFIG_DEFAULTS.land`（`scheduleCli`／`memoCli`／两个秒数）——**这恰恰是备忘录
  可能被调用的那一侧**，备忘录只抄「被调用」的接法，不抄「去调别人」的那一套。
- **照片二进制与 GIF 合成**：`photo/gif.ts`／`photoThumb.ts`／`GIF_SUB_DIR`／`stageHtml`。
- **卡路里 HELP 三段式**：`calorie.help.center` 的 `mode:'file|inline|text'` 三态 ＋
  436 条 `prompt_template` 资产（`wake-assets.ts` 4757 LF）——备忘录的 HELP 走**自己的** 30 场景骨架
  （与饼干记账／私家厨房同一套共享 help 模板），不要搬卡路里这台速查台。
- **`src/migrate/migrate.ts`（495 LF）那 13 表迁移**：卡路里数据库的搬家史，备忘录库表不同。

### 6.3 备忘录今天离这套差在哪（现场读数，便于对齐工作量）

`packages/skill-memo-ilife/src/` 当刻：

| 现状 | 卡路里形状要求 | 差 |
|---|---|---|
| `src/cli/cmd_read.ts` **570 LF 单件** | 拆 `readArgs.ts`＋`delivery.ts`＋`write.ts`（卡路里四件，166／237／84 LF） | 出口未拆，且超出 350 告警线 |
| 无 `commands.ts`／`routes.ts`／`registry.ts`／`keys.ts` | 每域三件 ＋ 两张生成表 | **命令登记这层还没长**（备忘录命令散在 `cmd_read.ts` 里） |
| `src/policy/`（`category.ts`／`crud.ts`／`media.ts`／`reminder.ts`／`wakewords.ts`／`wish.ts`） | 铁律四：目录名取自 HELP 一级分组，**不许按工种起名**（`structure.md:53` 点名 `utils`／`helpers`／`common`／`misc`／`core`／`types`／`base` 一律不许） | `policy` 是工种名，要按域拆散到各能力目录（哪些真属于某一个域？哪些是共用件？逐件判） |
| `src/fetch/`（14 件）／`src/render/`（7 件）／`src/help/`（11 件） | 取数与装配件应**住各能力目录**（卡路里：`diet/nutritionPort.ts` 而不是 `fetch/nutritionPort.ts`） | 全局 `fetch`／`render` 是「按工种分」的旧形状，要按域重排 |
| 已有 `src/wish/`（10 件，一个真域） | 与卡路里能力目录同形（有 `index.ts`） | **这一件已接近目标形状**：可作备忘录重排的第一个样板域 |
| `src/index.ts` **6 行**（包门） | 卡路里包门 26 行、63 个名字、`exports` 三条 | 备忘录 `exports` 今天有五条子路径（`.`／`./fetch`／`./policy`／`./render`／`./cli`）——按「**只许收窄**」要评估有没有人取 |
| `scripts/` 只有 `build-help.mjs`＋`gen-help-assets.mjs`＋一个 parity 探针 | 生成器 ＋ 五道检查脚本 | **生成链与门都还没建** |
| `package.json` scripts 两条（`build`／`test`） | 同形即可 | 一致；缺 `gen`／`gen:check` |
| 无 `AGENTS.md` 行数台账块 | `structure.md:74` 要求各包自己定并写在自己地方 | **备忘录还未定告警线数字** |

---

## 七、证据索引（本报告引到的正本件）

| 主题 | 正本 |
|---|---|
| 五条铁律／结构标准／必报五步 | `docs/agents/structure.md`（五条铁律 :25-62；结构标准 :64-74；必报五步 :76-111） |
| 命令登记形状与判据 | `docs/agents/命令登记纪律.md`（最长的一句 :8；四条形状 :26-130；判据四条 :133-150） |
| 一页动作清单 | `docs/agents/命令登记纪律-照抄说明.md` |
| 包的对外门 | `packages/skill-calorie/src/index.ts`；`packages/skill-calorie/package.json:8-12` |
| 声明形状唯一定义地 | `packages/skill-calorie/src/shared/commandSpec.ts` |
| 路由类型唯一定义地 | `packages/skill-calorie/src/triggers/routeSpec.ts` |
| 生成器正本 | `packages/skill-calorie/scripts/gen-cli.mjs`（件头 :1-40）；`scripts/gen-routes.mjs`（件头 :1-14） |
| 整页装配 | `packages/skill-calorie/src/shared/docPage.ts`；`packages/base-render/src/docShell.ts:73` |
| 复制区／日志 | `packages/skill-calorie/src/shared/copyArea.ts`；`src/shared/sceneEnvelope.ts` |
| 页内形状 | `packages/skill-calorie/src/shared/pageStrips.ts` |
| 交付三态 | `packages/skill-calorie/src/cli/delivery.ts:96`；`src/render/envelope.ts:139-207` |
| 落盘 | `packages/skill-calorie/src/output.ts:236`；`packages/base-render/src/output/saveHtml.ts:339` |
| 移动端配方 | `packages/base-render/src/pageUi.ts`（断点口径 :15-16；触摸区 :69-80；窄屏 :89-161；宽屏 :228-266；状态字 :267-275） |
| 字体栈唯一定义地 | `packages/base-render/src/font.ts` |
| 页面级样式（卡路里内） | `packages/skill-calorie/src/render/pageChromeCss.ts:24` |
| 响应式门 | `packages/skill-calorie/scripts/measure-responsive.mjs`（判据 :259-260）；`docs/skills/skill-calorie/t484-响应式.md`（判据面 §〇） |
| 触摸探针 | `docs/skills/skill-calorie/t525-触摸探针.mjs` |
| 行数告警线 ＋ 台账 | `packages/skill-calorie/AGENTS.md:7`（350／LF）、:29（台账唯一住处）、:120-128（门的绿红口径） |
| 棘轮 | `packages/skill-calorie/test/cmd-registry-294.test.mjs:67-68,187-191,238-242` |
| 命令自治验收 | `docs/skills/skill-calorie/t293-验收-命令自治.md`（五条承诺与三桶口径） |
| CI 门序列 | `.github/workflows/ci.yml`（`build-test` 作业：build → gen:check → doctor → test → boundaries → snapshot:html:check → gate:selftest:html → changeset → help:examples:check） |
| 场景顺序与验收基准 | `docs/skills/skill-calorie/core-approach.md` |
