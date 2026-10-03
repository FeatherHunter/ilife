# #1117 写入域回执 13 页切票据纸 · 落地证据（真跑产物 vs 冻结原型，逐页读数）

> 本件是**读数件**：记录实现落在哪、判据怎么量、每页读数是多少、门禁红了会怎样。
> **人眼逐格判定不在这里**——判定归负责人，本席不代判。

## 一、快照（应对并发：别席随后改码不影响本件作为该提交时点快照的效力）

| 项 | 读数 |
|---|---|
| 渲染当刻提交 | `aa47fe703771044f6435932beed7b4d130b94302`（工作区另有别席在途件，见下） |
| 渲染当刻 `dist/cli/cmd_read.js` sha256 | `aa562494e0c98c20156a3304f1ee476c10824fbd46e93a65c15d0a9c09f782b6` |
| 渲染当刻**本票真正碰到的** dist 件 | `receiptPaper.js 5e1bee6faff9a68a`／`template-expense.js fd6ccc9959cfc5d9`／`template-flow.js 00371726d1399deb`／`template-batch.js a142c3889024677f`／`template-installment.js f3f3b56c471ad596`（前 16 位） |
| 生成时刻（本地） | 2026-10-04 00:0x（Asia/Shanghai） |
| 隔离家目录 | `%TEMP%\tick-1117`（＝ `D:\Temp\tick-1117`；本票号命名，禁碰真实家目录的库） |
| 样本集 | `docs/skills/skill-bill/1117-write-样本集.json`（照 #1075 抄件，逐条对得上判地原型可见文本） |
| 渲染器 | `docs/skills/skill-bill/1117-write-渲染16页.mjs`（照 #1075 抄件，只改票号／家目录／产物目录） |
| 墙生成器 | `docs/skills/skill-bill/1117-write-验收墙.mjs`（照 #1075 抄件） |
| 锚定检查器 | `docs/skills/skill-bill/1117-write-锚定检查.mjs`（本票新增：13 页逐页 DOM 锚定判据） |

**`cmd_read.js` 的 sha 为什么与 #1075 当刻逐字相同**：它只 import 各域件，本票改的是被 import 的那几件，外壳自身的文本没变——故另附上表「本票真正碰到的 dist 件」五个 sha 作渲染当刻锚点。

## 二、实现（**一次实现 ＋ 13 次实例化**）

- **一处实现**：`packages/skill-bill/src/write/receiptPaper.ts`（186 LF）——回执纸的块位序列只此一份：
  店头（品牌行＋结论标题＋副题）→ 虚线 → 主数字（眉标＋金额＋单位＋说明＋印章）→ 虚线 →
  「记到哪里」（账目行：账户／账本／时间，借出借入多一行标签）→ 虚线 → 「核对」（编号一行）→
  虚线 → 操作区（退出口真按钮＋复制区）→ ✂ 裁切线 → 纸外页脚。
- **13 次实例化**：13 行文案表（键＝这一件认的 `kind`）＋ 载荷数据；**版式实现不含任何 per-page 分支**。
- **四个调用点**：`template-expense.ts`（守住 x02／x04／x06／x12／x26）、`template-flow.ts`（x10／x14／x16／x18／x20／x22）、
  `template-batch.ts`（x08）、`template-installment.ts`（x24）——四张模板的回执支各缩成 3 行：
  `return receiptPaper({ ...input, word: spec.word, kind: spec.kind });`
- **家具只用既有导出**（票面口径）：`assembleSheetPage`／`sheetHead`／`ticketRule`／`ticketSection`／`ticketSummary`／
  `ticketActions`／`ticketPrimaryButton`／`renderSheetFrame`／`renderSummaryHead`／`renderLedgerRows`；
  **零页面自出样式段、零字面色值**（样式只走 `assembleSheetPage` 那三段共用样式与皮肤）。
- **载荷键、值、条数一字未动**（票面红线）：本票只换版式。
- 顺手清掉四张模板件里因回执支搬迁而失效的 import 共 28 处。

### 13 页与判地的块位对齐（Lead 口径：判地有的出、判地没有的删）

判地 13 件（`proto/write-receipt/x{02..26}-*-v2.html`）块序逐页相同，本件逐块对齐：

| 判地原型块 | 本票产物对应物 | 在位 |
|---|---|---|
| `.shop-head`（品牌／h2／shop-sub） | `ilife-sheet-head`（`ilife-sheet-eyebrow`／`ilife-sheet-title`／`ilife-sheet-sub`） | ✅ |
| `hr.dashed` | `ilife-ticket-rule` | ✅ |
| `.summary-head`（eyebrow／amount／summary-note／stamp） | `ilife-ticket-summary` ＋ `ilife-block-summary-head.is-ticket` ＋ `ilife-ticket-summary-note` | ✅ |
| `.sec`「记到哪里」＋ `ul.ledger-rows` | `ilife-ticket-sec` ＋ `ilife-block-ledger-rows.is-ticket` | ✅ |
| `.sec`「核对」＋ `.check-mini` | `ilife-ticket-sec` ＋ `ilife-ticket-check` | ✅ |
| `.actions`（btn-primary＋copy-wrap＋copy-log） | `ilife-ticket-actions` ＋ `ilife-ticket-btn.is-primary` ＋ `ilife-block-copy-block` | ✅ |
| `.cut-line`「✂ 裁切线」 | `ilife-block-sheet-cut`（`renderSheetFrame({cutLine:true})`） | ✅ |
| `.foot-note` | `ilife-ticket-foot` | ✅ |

**判地没有、本票随之删掉的块**（改前文档壳回执页有）：页内导航（`ilife-block-toc`）、读数行（KPI 网格）、
「对账信息」折叠区、重复检测提示条、退出口 danger 标记（改判地那种带复制载荷的真按钮）、复制区下方口径行。
**判地没有、本席认为值得保留的信息**（Lead 口径第 2 条，一页一行）：`重复检测提示条`——改前这一块在回执页上
报「这一笔看着像重复，撞上的是记录编号 N」；判地 13 件没有这一块，本票照判地删；判定本身没丢（采集页那一支仍在，
见 §八 测试）。**要不要给回执页单开一块，请负责人裁。**

## 三、DOM 锚定判据（票面 §判据 ①；13 页逐页）

```
node docs/skills/skill-bill/1117-write-锚定检查.mjs .scratch/1117-write
  SCAN-ROOT: .scratch/1117-write   （13 页逐行 PASS）
  RESULT: 13/13 页锚定判据在位
  PASS: 13 页逐页出票据纸根类 ＋ ✂ 裁切线 ＋ 八件套块位        exit 0
```

锚 ＝ `<div class="ilife-bill-sheet-page `／`✂ 裁切线`／八件套（店头／虚线／主数字／主数字说明／落点账目行／核对卡／按钮区／纸外页脚）。
渲染器骨架读数同步由 `{"doc":13,"sheet":3}` 变为 `页族={"sheet":16}`（13 页切族 ＋ 原有 3 页）。

## 四、验收墙（macOS 读数照 #1075 抄件，正例／反例／还原三行）

```
正例：node docs/skills/skill-bill/1117-write-验收墙.mjs .scratch/1117-write compare-1117-write-16.html
     -> 墙 compare-1117-write-16.html：16 格；链接 64 条；缺失 0 -> 可发（桌面墙同出）   exit 0
反例：同目录副本只删掉一格真跑产物 x12-真跑.html
     -> 墙 compare-坏-1117.html：16 格；链接 0 条；缺 1 件 -> x12 x12-真跑.html          exit 1
还原：把 x12-真跑.html 放回后重跑
     -> 墙 compare-还原-1117.html：16 格；链接 64 条；缺失 0 -> 可发                    exit 0
```

墙与两侧产物同目录（`.scratch/1117-write/`），iframe 走相对路径；原型是从 `proto/` 逐件核 sha256 后**逐字节副本**，原件一字未动。

## 五、像素读数（390×844 ／ 1280×720，`fullPage=true`，original＝判地原型、rebuilt＝真跑，threshold 16）

| # | id | 唤醒词 | 390 差异像素比 | 390 差异/总 | 390 页高比 | 1280 差异像素比 | 1280 差异/总 | 1280 页高比 |
|---|---|---|---|---|---|---|---|---|
| 1 | x02 | 记支出 | 0.1469 | 54770/372840 | 1.0073 | 0.0490 | 60822/1241600 | 1.0072 |
| 2 | x04 | 记收入 | 0.1496 | 55779/372840 | 1.0073 | 0.0499 | 61969/1241600 | 1.0072 |
| 3 | x06 | 拍账单 | 0.1487 | 54239/364650 | 1.0064 | 0.0487 | 60425/1241600 | 1.0072 |
| 4 | x08 | 批量录入 | 0.1442 | 52590/364650 | 1.0064 | 0.0473 | 58727/1241600 | 1.0072 |
| 5 | x10 | 记退款 | 0.1522 | 56763/372840 | 1.0073 | 0.0507 | 62936/1241600 | 1.0072 |
| 6 | x12 | 记报销 | 0.1483 | 55295/372840 | 1.0073 | 0.0495 | 61482/1241600 | 1.0072 |
| 7 | x14 | 报销到账 | 0.1563 | 58258/372840 | 1.0073 | 0.0520 | 64521/1241600 | 1.0072 |
| 8 | x16 | 记借出 | 0.1472 | 57416/390000 | 1.0070 | 0.0494 | 64155/1297920 | 1.0069 |
| 9 | x18 | 记借入 | 0.1468 | 57271/390000 | 1.0070 | 0.0493 | 63968/1297920 | 1.0069 |
| 10 | x20 | 记收回 | 0.1499 | 55891/372840 | 1.0073 | 0.0501 | 62184/1241600 | 1.0072 |
| 11 | x22 | 记偿还 | 0.1500 | 55941/372840 | 1.0073 | 0.0501 | 62226/1241600 | 1.0072 |
| 12 | x24 | 记分期 | 0.1502 | 55994/372840 | 1.0073 | 0.0501 | 62220/1241600 | 1.0072 |
| 13 | x26 | 记一笔 | 0.1456 | 54294/372840 | 1.0073 | 0.0486 | 60319/1241600 | 1.0072 |

**分组均值**：390 差异 0.1489／页高比 1.0071；1280 差异 0.0496／页高比 1.0072。
**页高比逐页 ≤ 1.0073（Lead 口径 ≤1.05× 达标）**；13 页之间差异 ≤0.012（390）／≤0.005（1280），属数据与文案差。

### 改前（#1075 当刻）→ 改后（本票）对照

| 组 | 390 改前 | 390 改后 | 1280 改前 | 1280 改后 |
|---|---|---|---|---|
| 13 页（本票） | 0.3294–0.3546（均 0.3434） | 0.1442–0.1563（均 0.1489） | 0.7277–0.7503（均 0.7423） | 0.0473–0.0520（均 0.0496） |
| 3 页同族邻居（x28／x30／x32，本席同法复量） | 0.2420／0.2709／0.2625 | 未动 | 0.0840／0.0893／0.0987 | 未动 |

本票 13 页在两档视口上的差异比**都低于**已交付的同族三页；同族三页的读数由本席用同一套命令复量（读数落 `.scratch/1117-write/对照读数-x28x30x32.json`），**未改它们一支笔**。

## 六、差异带剖面（纯像素行扫描，本席自算；判据仍是上面的 `vision_pixel_diff`）

x02＠390：overall 0.1323（按两图共同高度 956 裁齐后重算）。差异按行成带，最大一条 **y668–737（70 行，21964 差像素，单行最高比 0.836）**
＝操作区那一带（红主按钮＋复制钮）；其余带分别在店头（y65–81）、主数字（y143–178／y256–298）、账目行（y325–502 每 ~44px 一条）、
核对（y550–610）、裁切线／页脚（y768–867）。**形态是「同内容、同块序、逐带几像素级错位与字体度量差」，不是缺块或换版式**——
旁证：13 页可见文本与判地逐字对照只差复制钮那几处（判地印 `复制数据 ▾`，本仓由 base 组件画三角、且菜单小字为
`纯文本 自己看，发助手都行`／`JSON 以后查账用`／`CSV 表格打开看`；判地是 `自己看或发给助手`／`存档用`／`表格用`）。

**归属**：按 Lead 口径第 3 条（皮肤账只覆盖家具与皮肤取值差），上面这些带全是家具（店头／段标题／虚线／主数字档／账目行／
对账卡／按钮区）与 base 复制组件文本的取值差，**不含块位序列与页高差**（页高比 1.0064–1.0073）。热力图与报告：
`.scratch/1117-write/像素读数.json`（逐页含截图绝对路径与 heatmapPath）。

## 七、门禁读数

```
node tooling/run-locked.mjs --ticket 1117 -- node node_modules/typescript/bin/tsc -b packages/skill-bill
  -> exit 0（runId a6dd4ba9-5c23-4073-a2bc-84b9ac19a89d）
node tooling/run-locked.mjs --ticket 1117 -- node --test packages/skill-bill/test/t410-lock.test.mjs packages/skill-bill/test/record-write.test.mjs
  -> exit 0（受本票影响的既有测试两件全绿；无 ✖）
node packages/skill-bill/scripts/check-warning-line.mjs
  -> RESULT: 23/23  PASS: 告警线台账齐全且与实况一致  exit 0
node docs/skills/skill-bill/1117-write-渲染16页.mjs
  -> RESULT: 16/16 真跑成功；缺件/问题页 0  exit 0（页族={"sheet":16}）
node docs/skills/skill-bill/1117-write-锚定检查.mjs .scratch/1117-write
  -> RESULT: 13/13 页锚定判据在位  exit 0
```

### 受影响的既有测试按「老断言改到新页」改（Lead 口径第 5 条；未删用例、未加 skip）

| 件 | 改法 |
|---|---|
| `test/t410-lock.test.mjs` | 13 条录入词那一轮：`H1＝唤醒词`／`>回执</span>` 两条换成 `店头品牌行`＋`ilife-bill-sheet-page`；退出口三件 `对账信息／复制数据／复制日志` 换成 `记到哪里／核对／✂ 裁切线／复制数据／复制日志`。拍账单与批量录入两条降级串换成票据纸那一句（`三要素以外部识别为准`／`这次只落了其中一笔`）。 |
| `test/record-write.test.mjs` | t406 记一笔回执那一批 needle、t407 记支出代表页那一批 needle 一并换到票据纸锚（含 `记好：支出 12.50`／`有效`／`✂ 裁切线`）；退出口两条改成「票据纸主按钮＋撤销复制位」；重复检测那一条改成钉「票据纸回执页不出提示条」＋「这一笔照常写库」。 |

**改坏必红／还原必绿**（把 `dist/write/receiptPaper.js` 的 `cutLine: true` 改成 `false` 一处，其余不动）：

```
改坏：t410-lock.test.mjs -> ✖ 记支出／记收入／拍账单／批量录入／…（13 条逐条红）  exit 1
还原：t410-lock.test.mjs -> ✖ 行数 0（全绿）                                      exit 0
```

### 页面指纹账本（判据甲）——**本票不重录，报请负责人裁**

```
node packages/skill-bill/scripts/gen-page-fingerprints.mjs --check
  -> RED 页数 44／44；RESULT: 0/44  exit 1
```
44 页**全红**（含各域采集页、查询域 12 页、分析域等**与本票无关的页**），根因不是本票：`packages/base-render/**` 正在被
#1114 改（皮肤与组件保真），任何页的整页哈希都会变。重录（`--write --declare-layout-change`）会把别席在途改动一并
烙进共同账本，且 `packages/skill-bill/test/t689-页面指纹.json` **不在本票写集**（task-5：`src/write/**`＋`docs/.../1117-*`＋`.scratch/1117-write/**`）
——故**本票不动这本账**。

**负责人已裁（2026-10-04）**：谁都不许重录，一律留红并在证据与票面写明红因归属；定稿重录只有一次，由负责人在 #1113／#1117／#1118 全部落地后指定一席
`--write --declare-layout-change <票号>` 录完。**这一行红是本票的读数、不是本票的缺陷**（44 张全红，其中 31 张与写入域回执无关）。

## 八、遗留出口

1. **判地 13 件没有 `LEDGER|SCALE|DETAIL|CHECK` 四个英文标**（本席与 Lead 各自 grep：write-receipt 原型 0 命中；对照 acct-goal 13、query 1）。
   本票按判地办＝段标题只有「记到哪里」「核对」两个中文标；八件套那句概括与判地的出入由负责人收口（要统一须开原型票，执行席不改判地）。
2. **能力面变化（一页一行，请负责人裁）**：`重复检测提示条` 随判地删（判定仍住采集页那一支）；`对账信息折叠区`／`页内导航`／`读数行`／
   复制区下方口径行同删。若负责人判必须保留，本席按指点的落点补回（会拉开与判地的像素差）。
3. **x10／x14 的眉标分类**：判地印 `退款 · 退款`／`收入 · 其他收入`，载荷给的是 `退款/冲销`／`其他收入/报销回款`。本票按「页上照载荷原值印」
   （与 x16…x24 判地印 `借贷/借出` 这类原值同一条规则），故这两页眉标与判地不同值——这是数据与判地文本的差，不是版式差。
4. **差异带归属**：§六 的带全部落在家具与 base 复制组件取值上；**本票不自行加页面样式段**（Lead 口径第 4 条），故未就地收口。
   若收口需要动 `src/shared/docPage.ts` 的 `TICKET_CSS` 或 base 组件，请负责人指写集。
5. **施工中发现的其它 `src` 缺陷**：无（本票只动版式，未碰取数与判据）。
