# #1076 分析域 25 页人眼复验 · 复验证据（真跑产物 vs 冻结原型）

> 本件是**读数件**：记录墙怎么来的、每页真跑读数是多少、门禁红了会怎样、以及并发落地后重跑过什么。**人眼逐格判定不在这里**——它在 `docs/skills/skill-bill/1076-analysis-逐格结论.md`（用户逐格判完后落盘）。

## 一、快照（应对并发：别席随后改码不影响本墙作为该提交时点快照的效力）

| 项 | 读数 |
|---|---|
| 本墙所用提交 | `945a19d3139ba062a335f20960c55e43675fb703` |
| 生成时点 `packages/` 工作区改动 | **无**（真跑读的就是这个提交的代码） |
| `packages/skill-bill/dist/cli/cmd_read.js` sha256 | `73ee4aeb3cb83ca3eb1a053b28f9431c996987c049ee55d7579e5606021cf709` |
| 生成时刻（UTC） | 2026-10-03T11:46:40.043Z |
| 隔离家目录 | `D:\Temp\tick-1076`（本票号命名，禁碰真实家目录的库） |

**首跑与重跑**：首跑快照是 `4ec7d7ab`（dist `95fe69d2…`）；#1080 于 19:44 落地 `945a19d3`，**改了共用件 `src/shared/docPage.ts` 的票据纸家具 CSS**，而分析域页正是走这件（`src/analysis/ticket.ts` import `assembleSheetPage`）——故**当场重跑**，本墙以重跑为准（量化读数见 §八）。

## 二、样本（不再造第二份：直接用仓内 #729 分析域夹具）

| 项 | 读数 |
|---|---|
| 夹具件 | `packages/skill-bill/test/helpers/bill-seed.mjs（#729 分析域夹具，只读引用、未改一字）` |
| 记录条数 | 39（2025-05 ~ 2026-06） |
| 夹具「今天」 | 2026-06-14（经 `freezeClock` 钉住子进程时钟） |
| 本次运行的库文件 sha256 | `c067cd96d3e0680fd93570df67b09526b48e481f23aa9571a7047f5a08ff1db1`（每条记录的 `created_at` 走 `CURRENT_TIMESTAMP`，故每次建库的库文件字节不同；**记录集本身逐条相同**） |
| 样本集逐页参数 | `.scratch/1076-analysis/样本集.json` |

夹具本身刻意造出的局面（少一样就有判据没有触发点）：空月（2025-07~12）／去年同月（2025-05）／本周与上周（2026-06-08~14 与 06-01~07）／多账户多账本多分类层级／四类 #标签（借贷未还已还／报销待与已到／分期／退款）／金额五档分层。**25 页的窗口参数按夹具覆盖的月份搬**（见下表），不照抄原型那轮的 2026-09/10。

## 三、25 页真跑读数（逐页，不做抽查）

| # | 唤醒词 | 命令键 | 窗口参数 | exit | 真跑字节 | 冻结原型 sha256（前 16） |
|---|---|---|---|---|---|---|
| 01 | 看月度 | `bill.analysis.overview` | `{"kind":"monthly","month":"2026-05"}` | 0 | 145888 | `17bfe036f2b794ac` |
| 02 | 看年度 | `bill.analysis.overview` | `{"kind":"yearly","year":2026}` | 0 | 152517 | `e66a20fbd235aee5` |
| 03 | 看总览 | `bill.analysis.overview` | `{"kind":"overview","start":"2026-04-01","end":"2026-06-14"}` | 0 | 141663 | `405d2f74b5a9a0e6` |
| 04 | 看周报 | `bill.analysis.overview` | `{"kind":"week"}` | 0 | 147064 | `378d67f46519c1f2` |
| 05 | 看分类 | `bill.analysis.overview` | `{"kind":"category","month":"2026-05"}` | 0 | 155059 | `5efa51543ebb7aa6` |
| 06 | 看账户 | `bill.analysis.overview` | `{"kind":"account","month":"2026-05"}` | 0 | 145231 | `e6c70ae2937956cf` |
| 07 | 看账本 | `bill.analysis.overview` | `{"kind":"ledger","month":"2026-05"}` | 0 | 144417 | `ebd8b3e5edd2c3aa` |
| 08 | 看结构 | `bill.analysis.overview` | `{"kind":"structure","month":"2026-05"}` | 0 | 156982 | `16db6fc6ed0d5525` |
| 09 | 做统计 | `bill.analysis.overview` | `{"kind":"stats","month":"2026-05"}` | 0 | 147103 | `bd4c6356a8b30f42` |
| 10 | 看对比 | `bill.analysis.compare` | `{"kind":"period","monthA":"2026-04","monthB":"2026-05"}` | 0 | 145316 | `2f8c2fd4418bf991` |
| 11 | 看双区间 | `bill.analysis.compare` | `{"kind":"range","from1":"2026-05-01","to1":"2026-05-15","from2":"2026-05-16","to2":"2026-06-14"}` | 0 | 151773 | `f6b93ab76681a8b9` |
| 12 | 看同比 | `bill.analysis.compare` | `{"kind":"yoy","month":"2026-05"}` | 0 | 146146 | `a6255c7573d345eb` |
| 13 | 看分类对比 | `bill.analysis.compare` | `{"kind":"category","startA":"2026-05-01","endA":"2026-05-15","startB":"2026-05-16","endB":"2026-06-14"}` | 0 | 146077 | `2f58c634d9346ebe` |
| 14 | 看趋势 | `bill.analysis.trend` | `{"kind":"trend","months":12}` | 0 | 158415 | `61610820f63b74f6` |
| 15 | 看分类趋势 | `bill.analysis.trend` | `{"kind":"category","category":"餐饮","months":12}` | 0 | 149165 | `43acad3decf7f61c` |
| 16 | 看大额 | `bill.analysis.trend` | `{"kind":"top","limit":5}` | 0 | 144541 | `b11fe7e7b54eb441` |
| 17 | 看高频 | `bill.analysis.trend` | `{"kind":"frequent","limit":5}` | 0 | 143969 | `03848474bcb6a94d` |
| 18 | 看分布 | `bill.analysis.trend` | `{"kind":"distribution","month":"2026-05"}` | 0 | 149245 | `10bcc2d94929bbe2` |
| 19 | 看活跃 | `bill.analysis.trend` | `{"kind":"activity","month":"2026-05"}` | 0 | 151649 | `b43891c8c6f72a67` |
| 20 | 看洞察 | `bill.analysis.trend` | `{"kind":"insight","month":"2026-05"}` | 0 | 163942 | `76aac0f92dc82160` |
| 21 | 看异常 | `bill.analysis.trend` | `{"kind":"anomaly","months":12}` | 0 | 155873 | `6e84a4b3d35d05f3` |
| 22 | 看借贷 | `bill.analysis.trend` | `{"kind":"debt"}` | 0 | 143271 | `a0351eeb71adc4b8` |
| 23 | 看报销 | `bill.analysis.trend` | `{"kind":"reimburse"}` | 0 | 143765 | `21eabe9ba9fb5931` |
| 24 | 看分期 | `bill.analysis.trend` | `{"kind":"installment"}` | 0 | 143750 | `966c91a3409f0d6a` |
| 25 | 看退款 | `bill.analysis.trend` | `{"kind":"refund"}` | 0 | 141608 | `550eaba0e7928113` |

**读数**：25/25 exit 0、逐页落盘、`delivery.bytes` 与盘上字节一致、整页且票据纸根类（`ilife-bill-sheet-page`）在；25 件冻结原型的 sha256 与 `docs/skills/skill-bill/proto/manifest.json`（#1073）逐条相等（不等的当场抛错、不出墙）。
产物页对外部资源引用数逐页为 **0**（`extRefs=0`），即 iframe 里跑的是自足整页，不依赖目录外资源。

## 四、墙生成器读数（`docs/skills/skill-bill/1076-analysis-验收墙.mjs`，已入版本库）

```
正例：node docs/skills/skill-bill/1076-analysis-验收墙.mjs .scratch/1076-analysis compare-1076-analysis-25.html
     -> 墙 compare-1076-analysis-25.html：25 格；链接 100 条；缺失 0 -> compare-1076-analysis-25.html 可发（桌面墙同出：compare-1076-analysis-25-桌面.html）  exit 0

反例：node docs/skills/skill-bill/1076-analysis-验收墙.mjs .scratch/1076-analysis-坏清单 compare-坏.html
     （坏清单＝全目录副本，只删掉一格产物 a07-真跑.html）
     -> 墙 compare-坏.html：25 格；链接 0 条；缺 1 件 -> a07 a07-真跑.html  exit 1
```

反例证明这道门**会红、且点名到件**；正例的「链接 100 条」＝ 25 格 ×（2 iframe ＋ 2 整页外链），逐条自证在盘上（`dead` 空）。

## 五、两墙位置与形制

- 手机墙：`.scratch/1076-analysis/compare-1076-analysis-25.html`（390 宽 × 3 列，格高 820，**无 `loading=lazy`**）
- 桌面墙：`.scratch/1076-analysis/compare-1076-analysis-25-桌面.html`（1280 宽 × 1 列，同一格上下两张：上真跑、下原型，各 1280×900）
- 两侧与墙**同目录**（`a01-真跑.html` ~ `a25-真跑.html` ＋ `a01-原型.html` ~ `a25-原型.html`），iframe 走相对路径；原型是从 `docs/skills/skill-bill/proto/analysis/` 逐件核 sha256 后**逐字节副本**，原件一字未动。
- 打勾区：每格「满意／不满意（原因必填）」，工具栏计数＋导出 JSON（判定原文落盘，逐格结论引用它、不靠口述）；`file://` 下 localStorage 不可用时走内存兜底，计数与导出照常。

## 六、墙上怎么判（给用户的一页说明）

- 两侧**数据不同**是设计如此：左＝夹具合成库（2026-01~06），右＝原型内嵌样例值（2026-09/10）。**判的是版式与件套**，不是数字对不对。
- 每格「该确认什么」写在格子标题下面：前段是分析域专有判据（占比条按同组最大值折算、百分比行内有文案、明细卡序号＋单行文本＋44px 行高、空态直写「空」字、结论句「主要花在「X」，Y 元，占本页支出 Z%。」），后段是本页自己的读数点。
- **本票只出墙与记录，不改任何代码**：发现不 ok 的页，逐条写进 #1076 的遗留出口并当场开票（一条判据一张票）。

## 七、逐页骨架机检（机器读数，给人眼判定当配套，不替代人眼）

探针：`node .scratch/1076-analysis/probe-1076-skeleton.mjs`（只读 25 份真跑产物）。逐页看八项：
票据纸根类 `ilife-bill-sheet-page`／页头 `ilife-sheet-title`／结论块 `ilife-block-conclusion`／落点 `ilife-block-ledger`／图表卡 `ilife-block-chart-block`／复制区 `ilife-block-copy-block`／口径行 `ilife-block-caliber`／明细段 `ilife-block-detail-section`；
另核：页内导航块**恰一个**、来源脚注「数据来源」≥1、可见文本无 `undefined`／`NaN`、无 `loading=lazy`。

```
RESULT: 25/25 骨架判据全过  exit 0
```

**这份读数只证明「件套都在、骨架没坏」——它不回答「看起来像不像」**；像不像只有人眼那一道（§九）。

## 八、并发落地（`945a19d3`）与重跑：量化读数

**事实**：#1080 在 19:44 落地 `945a19d3`，其中 `packages/skill-bill/src/shared/docPage.ts` ＋57 行**改的是票据纸家具 CSS**（脚行距、时刻行、对账卡、复制钮、账目行 44px 面、以及被特指度压死的主数字 @media）。分析域页正是走这件（`src/analysis/ticket.ts:25` import `assembleSheetPage`／`sheetHead`／`ticketRule`／`ticketSection`／`ticketSummary`）。

**处置**：把首跑产物整批快照到 `.scratch/1076-analysis-before-1080/` → 在 `945a19d3`（工作区干净）重建 `dist`（`tsc -b packages/skill-bill --force` exit 0）→ 重跑 25 页 → 逐页比对：

| 读数 | 值 |
|---|---|
| 真跑产物变了的页 | **25/25**（每页 **+658 字节**，逐页增量完全相同） |
| 剔掉 `<style>` 后 DOM 变了的页 | **0/25**（页面结构一字未动） |
| CSS 变了的页 | 25/25 |
| 骨架机检（重跑后） | 25/25 全过 |
| 墙门禁（重跑后） | 正例 exit 0／反例 exit 1（同 §四） |

a01 的 CSS 行级差异（新增／删除，逐条）：

```
+ .ilife-ticket-sec-heading.is-danger::before { background: var(--ilife-danger); }
+ .ilife-ticket-summary … .ilife-block-summary-head-foot { margin-top: 9px; }        （原 0）
+ .ilife-ticket-summary-time { margin: 10px 0 0; font-family: ui-monospace,… ; }     （原 6px、无等宽）
+ .ilife-ticket-detail … , .ilife-ticket-receipt … .ilife-block-ledger-row { min-height: 44px; }（44px 面扩到回执片）
+ .ilife-ticket-check { align-items: flex-start; margin-top: 10px; padding: 10px 12px; border: 1px solid #cfe6d6; background: #f4fbf6; color: #3e5a4a; font-size: 12.8px; }
+ .ilife-bill-sheet-page .ilife-copy-btn { min-height: 44px; border: 1.5px solid #ddd0b6; }（原 47px／var(--ilife-edge)）
+ .ilife-bill-sheet-page .ilife-ticket-summary … .ilife-block-summary-head-value { font-size: 50px; }（把被特指度压死的 390 档抬到 (0,4,0)）
```

**这意味着**：首跑那版墙的画面**已经过时**（主数字在窄屏的档位、时刻行字体、对账卡配色等都变了）。本墙给出的是 `945a19d3` 的画面；**任何再改 `src/` 的落地票落地后，本墙都要按同一套命令重跑**（重跑＝`tsc -b` ＋ `run-1076.mjs` ＋ 墙生成器，三步，读数自动刷新）。

## 九、人眼判定（待回填）

<!-- 用户逐格判完后：判定原文（导出的 JSON ＋ 逐格备注）落 docs/skills/skill-bill/1076-analysis-逐格结论.md，这里只留一行指针 -->
- 待用户逐格判定；判定原文落 `docs/skills/skill-bill/1076-analysis-逐格结论.md`。

