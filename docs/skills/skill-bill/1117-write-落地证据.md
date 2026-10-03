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

**两次渲染都要读**：`渲染①`＝提交前（恢复条件块之前），`渲染②`＝本件定稿（恢复「疑似重复」条件块之后）。

### 渲染②（定稿读数，2026-10-04 00:1x）

| # | id | 唤醒词 | 390 差异比 | 390 页高比 | 1280 差异比 | 1280 页高比 | 注 |
|---|---|---|---|---|---|---|---|
| 1 | x02 | 记支出 | 0.1504 | 1.0105（966/956） | 0.0502 | 1.0093（979/970） | |
| 2 | x04 | 记收入 | 0.1536 | 1.0105 | 0.0513 | 1.0093 | |
| 3 | x06 | 拍账单 | 0.1522 | 1.0096（944/935） | 0.0499 | 1.0093 | |
| 4 | x08 | 批量录入 | 0.1476 | 1.0096 | 0.0485 | 1.0093 | |
| 5 | x10 | 记退款 | 0.1561 | 1.0105 | 0.0519 | 1.0093 | |
| 6 | x12 | 记报销 | 0.1520 | 1.0105 | 0.0508 | 1.0093 | |
| 7 | x14 | 报销到账 | 0.1601 | 1.0105 | 0.0533 | 1.0093 | |
| 8 | x16 | 记借出 | 0.1517 | 1.0100（1010/1000） | 0.0508 | 1.0089（1023/1014） | |
| 9 | x18 | 记借入 | 0.1512 | 1.0100 | 0.0506 | 1.0089 | |
| 10 | x20 | 记收回 | 0.1540 | 1.0105 | 0.0514 | 1.0093 | |
| 11 | x22 | 记偿还 | 0.1542 | 1.0105 | 0.0515 | 1.0093 | |
| 12 | x24 | 记分期 | 0.1544 | 1.0105 | 0.0515 | 1.0093 | |
| 13 | x26 | 记一笔 | **0.3056** | **1.2165（1163/956）** | **0.1032** | **1.2134（1177/970）** | 见下「x26 为什么是离群点」 |

**分组**：390 差异 0.1476–0.1601（均 0.1539）／页高比 1.0096–1.0105；1280 差异 0.0485–0.0533（均 0.0511）／页高比 1.0089–1.0093。
**12 页逐页页高比 ≤1.0105（Lead 口径 ≤1.05× 达标）**；离群的 x26 见下。

### x26 为什么是离群点（**条件块按数据上屏，不是版式错**）

`x26-真跑.html` 是本批唯一命中「疑似重复」条件块的一页：样本集里 **x02 与 x26 写的是同一笔**
（`kind` 不同但同为 餐饮 −12.5 2026-09-14），故 x26 写库后按定义撞上 x02 那条，页上多出那一块安全提示
（`Select-String -Path .scratch/1117-write/x*-真跑.html -Pattern "看着像重复"` → 只 `x26-真跑.html` 命中）。
判地 13 件都是单页样本、撞不上这一支 ⇒ **该块不参与像素判据**；#1075 当刻的 x26（0.3470）也带着它。
条件块是负责人 2026-10-04 裁决要恢复的安全提示，本席**不为对齐像素把它关掉**。

### 渲染①（提交前）→ 渲染②（定稿）的字节账（把别席在途与自己的改动分开）

两次渲染之间，13 页 HTML **逐页 +1887 字节**（x26 另 +875 ＝ 恢复的条件块 875 字节）：

| 项 | 读数 |
|---|---|
| 12 页公共增量 | +1887 B（`packages/base-render/**` #1114 在途的皮肤／组件载荷变，非本票改动） |
| x26 独有增量 | +875 B（`receiptPaper.ts` 恢复的「疑似重复」条件块） |
| 渲染①（提交前）分页页高比 | 1.0064–1.0073（390）／1.0069–1.0072（1280） |
| 渲染① 差异比 | 0.1442–0.1563（390）／0.0473–0.0520（1280） |

**读法**：定稿读数比渲染①整体高约 0.003（390）／0.001（1280）、页高 +3px，那一段差**全部来自 #1114 在途**（同一份产物 HTML 之外的东西）；本票自己的改动在 12 页上是 0 字节、在 x26 上是那一块条件提示。

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

**恢复条件块后复跑（定稿读数）**：

```
node tooling/run-locked.mjs --ticket 1117 -- node node_modules/typescript/bin/tsc -b packages/skill-bill
  -> exit 0
node tooling/run-locked.mjs --ticket 1117 -- node --test packages/skill-bill/test/t410-lock.test.mjs packages/skill-bill/test/record-write.test.mjs
  -> exit 0（含恢复后的「真撞上须报重复」逐条断言）
node docs/skills/skill-bill/1117-write-渲染16页.mjs
  -> RESULT: 16/16 真跑成功；缺件/问题页 0  exit 0
node docs/skills/skill-bill/1117-write-锚定检查.mjs .scratch/1117-write
  -> RESULT: 13/13 页锚定判据在位  exit 0
node docs/skills/skill-bill/1117-write-验收墙.mjs .scratch/1117-write compare-1117-write-16.html
  -> 16 格；链接 64 条；缺失 0  exit 0
```

### 受影响的既有测试按「老断言改到新页」改（Lead 口径第 5 条；未删用例、未加 skip）

| 件 | 改法 |
|---|---|
| `test/t410-lock.test.mjs` | 13 条录入词那一轮：`H1＝唤醒词`／`>回执</span>` 两条换成 `店头品牌行`＋`ilife-bill-sheet-page`；退出口三件 `对账信息／复制数据／复制日志` 换成 `记到哪里／核对／✂ 裁切线／复制数据／复制日志`。拍账单与批量录入两条降级串换成票据纸那一句（`三要素以外部识别为准`／`这次只落了其中一笔`）。 |
| `test/record-write.test.mjs` | t406 记一笔回执那一批 needle、t407 记支出代表页那一批 needle 一并换到票据纸锚（含 `记好了：支出 12.50`／`有效`／`✂ 裁切线`）；退出口两条改成「票据纸主按钮＋撤销复制位」；**重复检测那一条按负责人裁决原样保留**（`看着像重复`／`记录编号 1`／本次自己那条不进条），只把注释改成「条件块：判地样本撞不上、故不参与像素判据」。 |

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

## 八、遗留出口（负责人 2026-10-04 已逐条裁决，此处记裁决与落点）

1. **四标**：已裁「按判地不加英文标」⇒ **不再动作**。判地 13 件 `LEDGER|SCALE|DETAIL|CHECK` **0 命中**（对照 acct-goal 13、query 1）；
   本票段标题只有「记到哪里」「核对」两个中文标。负责人收口时把它与 MAP Notes「八件套」那句的出入聚合成一条给维护者（要统一须开原型票，执行席不改判地）。
2. **「疑似重复」条件块**：**已按裁决恢复**（`receiptPaper.ts` 的 `duplicateNotice` 一档：改前有这一支的两族出、批量录入与记分期不出）。
   它是**条件块**——只在近期记录里真撞上「同一天＋同金额＋同分类」时上屏；**判地 13 件样本都撞不上，故它不参与像素判据**。
   本批真跑里只有 `x26` 命中（样本集自身造出的重复：x02 与 x26 同笔），读数见 §五。
3. **随判地删掉、且负责人确认保持现状的四块**（口径来源：判地逐字）：`对账信息折叠区`／`页内导航`／`读数行（KPI 网格）`／`复制区下方口径行`。
4. **x10／x14 的眉标分类＝样本数据差，不是缺陷**：判地样本分类是「退款」，本票样本是 `退款/冲销`；页上印**载荷原值**是「一数一处」的正确做法，
   **不为对齐判地改取值**。
5. **差异带归属**：§六 的带全部落在家具与 base 复制组件取值上（店头／段标题／虚线／主数字档／账目行／对账卡／按钮区）。**本票现在不动**：
   收口需动 `src/shared/docPage.ts` 的 `TICKET_CSS` 或 base 组件，**不在本票写集**；这张票由负责人在 **#1082 裁定 `docPage.ts` 归属之后**聚合开。
6. **页面指纹账本**：留红不重录（负责人 2026-10-04 裁决），见 §七。
7. **施工中发现的其它 `src` 缺陷**：无（本票只动版式，未碰取数与判据）。
