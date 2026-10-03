# #1074 查询域 17 页人眼复验 · 复验证据（真跑产物 vs 冻结原型）

> 本件是**读数件**：记录墙怎么来的、每页真跑读数是多少、门禁红了会怎样、以及皮肤在途时重跑要按什么。**人眼逐格判定不在这里**——它在 [1074-query-逐格结论.md](./1074-query-逐格结论.md)（判定列留空，由负责人逐格判）。
> 本票**只出墙与记录，不改任何代码**：`packages/**` 一字未动，`docs/skills/skill-bill/proto/query/` 一字未动。

## 一、快照（应对并发：别席在途改动不影响本墙作为该 dist 快照的效力）

| 项 | 读数 |
|---|---|
| 本墙所用提交 | `5a6905ff7b5270709af42a28e4f8e0f5250023fe` |
| `packages/skill-bill/dist/cli/cmd_read.js` sha256 | `aa562494e0c98c20156a3304f1ee476c10824fbd46e93a65c15d0a9c09f782b6` |
| 生成时刻（UTC） | 2026-10-03T15:44:15.423Z |
| 隔离家目录 | `D:\Temp\tick-1074`（本票号命名；禁碰真实家目录的库） |
| 生成时 `packages/` 工作区**在途改动**（非本票所改） | 11 行：`M` 9 件（`src/write/template-{batch,expense,flow,installment}.ts`、`src/account/template-{form,summary,update}.ts`、`src/goal/template-{form,progress}.ts`）＋ `??` 2 件（`src/shared/票据纸页型.ts`、`src/write/receiptPaper.ts`）——属 #1117／#1118 落地票 |
| 本次是否重建 dist | **否**（W2 窗口规则三：本票期间不跑 `tsc`、不自建 `dist/`；读的就是上面那枚 dist，它与 #1110 证据 §七 记的 dist sha256 逐字节相同） |

**像素读数的有效期**：#1114（票据纸保真）与上面那批在途改动落地后**页面渲染会变**，本件的像素读数按「生成时 dist sha256」作数；负责人通知后按 §十 的第 2、3 条复跑一次，读数才算终值。

## 二、样本（不造第二份：直接用仓内 #729 合成记账库夹具，只加 1 条）

| 项 | 读数 |
|---|---|
| 夹具件 | `packages/skill-bill/test/helpers/bill-seed.mjs`（#729；只读引用、未改一字） |
| 记录条数 | **40** ＝ 夹具 39 条 ＋ 本票追加 1 条 |
| 本票唯一的样本增量 | `[2026-06-14 12:00:00, 餐饮/外卖, -68, 支付宝, 生活, 今天午饭]`——夹具的「今天」是 2026-06-14，而 `SEED_RECORDS` 最后一条落在 06-13，不加这条则 w01 查今天零行、会回落老列表页（本域已知缺口），17 格里就少一格票据纸读数 |
| 夹具「今天」 | 2026-06-14（经 `freezeClock(SEED_TODAY)` 钉住子进程时钟；查昨天由此解出 2026-06-13，那天夹具自带 1 笔） |
| 本次库文件 sha256 | `447d36269256fe89c56a227da14451191728141ae4f1decd4b7adfe621ef65d5`（每条记录 `created_at` 走 `CURRENT_TIMESTAMP`，库文件字节逐次不同；**记录集本身逐条相同**） |
| 逐页参数 | `.scratch/1074-query/样本集.json` |
| 覆盖的态 | 今天／昨天／某天／最近／周／月／区间／分类／账户／账本／搜备注／标签／欠款（#未还 两笔，已还排除）／待报销（#待报销 一笔，#报销到账 排除）／分期（#分期 第 N 期/12 三笔）／单笔详情（id=8）／零行空态（2026-06-04） |

## 三、17 页真跑读数（逐页，不做抽查）

命令一律 `<BIN> = node packages/skill-bill/dist/cli/cmd_read.js`，逐页 `--html .scratch/1074-query/<页>-真跑.html`；封套 `delivery.bytes` 与盘上字节逐页相等。

| # | 页 | 唤醒词 | 页族 | 命令键 | 窗口参数 | exit | 真跑字节 | 冻结原型 sha256（前 16） |
|---|---|---|---|---|---|---|---|---|
| 01 | w00 | 查某天（空态） | 回落老列表页 | `bill.record.today` | `{"date":"2026-06-04"}` | 0 | 103897 | `21993acf0a485f93` |
| 02 | w01 | 查今天 | 票据纸 | `bill.record.today` | `{}` | 0 | 145235 | `aa34d678b74dc0d4` |
| 03 | w02 | 查昨天 | 票据纸 | `bill.record.today` | `{"date":"yesterday"}` | 0 | 145082 | `b23736379cda46f0` |
| 04 | w03 | 查某天 | 票据纸 | `bill.record.today` | `{"date":"2026-05-15"}` | 0 | 145099 | `5d14524df4837f09` |
| 05 | w04 | 查最近 | 票据纸 | `bill.record.today` | `{"recent":true,"limit":10}` | 0 | 158929 | `4e9c6ee107a09ecc` |
| 06 | w06 | 查周 | 票据纸 | `bill.record.range` | `{"range":"week","today":"2026-06-14"}` | 0 | 151418 | `421dd9ce7fb94bdf` |
| 07 | w07 | 查月 | 票据纸 | `bill.record.range` | `{"range":"month","today":"2026-06-14"}` | 0 | 154329 | `52fc73e7bd0359b1` |
| 08 | w08 | 查区间 | 票据纸 | `bill.record.range` | `{"start":"2026-05-01","end":"2026-05-31"}` | 0 | 166208 | `638c6a587eee4386` |
| 09 | w09 | 查分类 | 票据纸 | `bill.record.range` | `{"category":"餐饮"}` | 0 | 158621 | `38a55c38c9519cd2` |
| 10 | w10 | 查账户 | 票据纸 | `bill.record.range` | `{"account":"支付宝"}` | 0 | 163360 | `1856bb50abbb4703` |
| 11 | w11 | 查账本 | 票据纸 | `bill.record.range` | `{"ledger":"旅行"}` | 0 | 148466 | `791c4c4fb715597d` |
| 12 | w12 | 搜备注 | 票据纸 | `bill.record.search` | `{"q":"午饭"}` | 0 | 157006 | `edcbbf2529d428f1` |
| 13 | w13 | 查标签 | 票据纸 | `bill.record.search` | `{"kind":"tag","tag":"未还"}` | 0 | 146242 | `56fd0dc9fcbc7c54` |
| 14 | w14 | 查欠款 | 票据纸 | `bill.record.search` | `{"kind":"debt"}` | 0 | 146544 | `e2ff1518a82b25c9` |
| 15 | w15 | 查待报销 | 票据纸 | `bill.record.search` | `{"kind":"reimburse"}` | 0 | 145084 | `07f54c0153d54a5f` |
| 16 | w16 | 查分期 | 票据纸 | `bill.record.search` | `{"kind":"installment"}` | 0 | 148187 | `06f97f14eff24c3e` |
| 17 | w17 | 账单详情 | 票据纸 | `bill.record.detail` | `{"id":8}` | 0 | 143914 | `8af2ae8e24de9737` |

**读数**：17/17 exit 0、逐页落盘、`delivery.bytes` 与盘上字节一致、整页且 `ilife-page-ui` 在；17 件冻结原型的 sha256 与 `docs/skills/skill-bill/proto/manifest.json`（#1073）**登记值逐条相等**（不等的当场抛错、不出墙）；17 页对外部资源引用数逐页为 **0**（iframe 里跑的是自足整页）。

**页族读数（票面要求「逐页记录该页跑出来的页族读数」）**：16 页走票据纸（`ilife-bill-sheet-page` 族），**w00 走回落老列表页**（`ilife-block-page-shell` 族）——零行那一支是已知空白缺口，本票**只记录不修**。

**判地换件预告（Lead 2026-10-03 裁决）**：上表第 09 格右侧判地本次记的是 `query/w09-查分类-v2.1.html`（seq 49，旧版）；**复跑时换成 `w09/w09-查分类-v2.2.html`（seq 99）**——理由与脚本改动见 §九 第 3 条。

## 四、墙生成器读数（`docs/skills/skill-bill/1074-query-验收墙.mjs`，入仓）

GATE-RUN runId=52677646-85c6-49b1-8823-016c4ed26d05 cmd=`node docs/skills/skill-bill/1074-query-验收墙.mjs .scratch/1074-query compare-1074-query-17.html`
GATE-RUN runId=8215fc38-9770-4cf8-a889-43a7185ed6dd cmd=`node docs/skills/skill-bill/1074-query-验收墙.mjs .scratch/1074-query compare-1074-query-17.html`（变异还原后重跑）
GATE-RUN runId=806d00b7-456d-477a-97b2-7b7dbe6aa485 cmd=`node .scratch/1074-query/run-1074.mjs`

正例（两次，逐字相同）：

```
node docs/skills/skill-bill/1074-query-验收墙.mjs .scratch/1074-query compare-1074-query-17.html
 -> 墙 compare-1074-query-17.html：17 格；链接 68 条；缺失 0 -> compare-1074-query-17.html 可发（桌面墙同出：compare-1074-query-17-桌面.html）   exit 0
```

「链接 68 条」＝ 17 格 ×（2 iframe ＋ 2 整页外链），逐条自证在盘上（`dead` 空）。

三条变异反例（同一道门，三个不同判据各自会红、各自点名到件）：

| 变异 | runId | 读数 | exit |
|---|---|---|---|
| 坏清单①：全目录副本里只删 `w09-真跑.html` | `d1c5d11b-fdd2-404d-abde-19e95aa3ed10` | `墙 compare-坏.html：17 格；链接 0 条；缺 1 件 -> w09 w09-真跑.html` | 1 |
| 坏清单②：只给 `w01-原型.html` 尾追一行 `<!--tamper-->` | `ca0a8a32-3ed4-49e0-9c67-37570f8f4899` | `缺 2 件 -> w01 原型副本 sha256 与清单行不符 w01-原型.html、w01 原型副本 sha256 与判据侧登记值不符 docs/skills/skill-bill/proto/query/w01-查今天-v2.1.html` | 1 |
| 坏清单③：只把 `manifest.json` 里 w12 那行的机检 problems 改成「缺块位：ilife-block-summary-head」 | `ecf5bdfe-8ec4-4166-be03-44e59a4ee964` | `缺 1 件 -> w12 机检：缺块位：ilife-block-summary-head` | 1 |

还原后重跑正例：`缺失 0 … 可发` exit 0（runId 见上）。**改坏必红／还原必绿**两行读数齐。

## 五、两墙位置与形制

- 手机墙：`.scratch/1074-query/compare-1074-query-17.html`（390 宽 × 3 列，格高 820 一致，**无 `loading="lazy"`**）
- 桌面墙：`.scratch/1074-query/compare-1074-query-17-桌面.html`（1280 宽 × 1 列，同一格上下两张：上真跑、下原型，各 1280×900）
- 两侧与墙**同目录**（`w00-真跑.html`~`w17-真跑.html` ＋ `w00-原型.html`~`w17-原型.html`），iframe 走相对路径；原型是从 `docs/skills/skill-bill/proto/query/` 逐件核 sha256 后**逐字节副本**，原件一字未动。
- 打勾区：每格「满意／不满意（原因必填）」，工具栏计数＋导出 JSON（判定原文落盘，逐格结论引用它、不靠口述）；`file://` 下 localStorage 不可用时走内存兜底，计数与导出照常。
- 墙的渲染自检：对手机墙取 1400×1000 截图（`vision_html_screenshot`），可见格内 iframe 已渲染出内容（左真跑／右原型），无空白、无加载失败。

## 六、墙上怎么判（给逐格判的人一页说明）

- 两侧**数据不同**是设计如此：左＝夹具合成库（2025-05~2026-06 真实流水，40 条），右＝原型内嵌样例值（原型那轮是 2026-10）。**判的是版式与件套**，不是数字对不对。
- 每格「该确认什么」写在格子标题下面：前半＝本页自己的读数点（H2 字面／窗口／哪些行必须排除／#1110 笔数口径），后半＝查询域票据纸八部位（纸头／H2／主数字／落点 LEDGER／占比 SCALE／明细 DETAIL／对账 CHECK／✂ 裁切线／页脚只有场景名）。
- 第 01 格（w00 空态）**左右不同族**：左＝零行回落的老列表页，右＝原型的票据纸空态纸。这一格怎么判归负责人——本席只记录。
- **本票只出墙与记录，不改任何代码**：不 ok 的页逐条写进 #1074 遗留出口并由负责人决定是否开票（一条判据一张票）；本席**不替负责人判 ok／不 ok**。

## 七、逐页骨架机检（按页族；机器读数，给人眼判定当配套，不替代人眼）

> **判据口径（Lead 2026-10-03 裁决，本域要紧的一条）**：query 侧判地整套是**设计稿类名**（`sheet-frame`／`ledger-rows`／`sec`／`cut-line`／`summary-head`…，剥样式后 `ilife-*` 命中 **0**），产物整套是 **`ilife-*`** —— **「逐块对类名」在本域不成立**；本域判据只能是**像素 ＋ 可见文本块序**。故下面这些类名读数**只作产物侧自查**（自己的块位有没有缺、两种页族内部一不一致），**不拿它与判地逐块比**。

探针：`.scratch/1074-query/run-1074.mjs`（只读 17 份真跑产物，逐页读数落 `manifest.json`）。本域当刻**两种页族**，判据按族分判：

- **票据纸 16 页**（w01~w17）：8 主块位 `ilife-page-ui`／`ilife-bill-sheet-page`／`ilife-skin-ticket`／`ilife-block-sheet`／`ilife-sheet-title`／`ilife-block-summary-head`／`ilife-block-ledger-rows`／`ilife-ticket-rule` —— **16/16 全在（缺 0）**。
- **回落老列表页 1 页**（w00）：8 主块位 `ilife-page-ui`／`ilife-block-page-shell`／`ilife-block-kpi-card`／`ilife-block-conclusion`／`ilife-block-copy-block`／`ilife-block-caliber`／`ilife-block-chip`／`ilife-block-empty-block` —— **8/8 全在（缺 0）**。
- **页内导航**：票据纸 16 页 `ilife-block-toc` **0 个**、老列表页 w00 **1 个**——逐页与页族预期相符（**Lead 2026-10-03 已裁：跨页族级清单不作为单页判据，单页只认它自己那份判地；票据纸判地逐字可见「无 nav、无来源脚注」，故不算缺件**——见 §九 第 1、2 条）。
- **来源脚注「数据来源」**：老列表页 w00 **1 处**；票据纸 16 页 **0 处**（该页型不上屏来源脚注，它的对应位是页脚 `饼干记账 · <唤醒词>`，16/16 各 1 处）。
- **可见文本无 `undefined`／`NaN`**：17/17 为 0。**无 `loading="lazy"`**：17/17 为 0。**外部资源引用**：17/17 为 0。
- **另记据实读数（不下判定）**：占比 SCALE 块 `ilife-block-dist-row`（**判 DOM 元素，不数 `<style>` 里的 CSS 规则**）16 张票据页有、**w09 查分类 DOM 里 0 个**——w09 产物 `<style>` 里仍有 16 处 `.ilife-block-dist-row` 规则、DOM 里 0 个元素，占比区改走本页自有的 `ilife-category-bar`（DOM 2 个）；明细 DETAIL `ilife-ticket-entries` 17/17 在；复制区 `ilife-block-copy-block` 17/17 在；对账 CHECK 文本 16 票据页各 1 处（w00 老列表页 0）；`✂ 裁切线` 文本 16 票据页各 1 处（w00 老列表页 0）。

```
RESULT: 17/17 真跑成功；出问题的页 0    （GATE-RUN runId=806d00b7-456d-477a-97b2-7b7dbe6aa485，exit 0）
```

**这份读数只证明「件套都在、骨架没坏」——它不回答「看起来像不像」**；像不像只有人眼那一道（§十一）。

## 八、像素基线读数（生成时 dist，待 #1114 落地后复跑）

口径：两侧各取 **390×844 视口**截图（`vision_html_screenshot`，非 fullPage），再 `vision_pixel_diff(threshold=16)`；纯像素、可复跑。

| 页 | 差异像素比 | 最差区块（8×8 网格） |
|---|---|---|
| w01 查今天 | **0.1190**（39171/329160） | y742–844 那一带（区块比 0.27~0.39） |
| w12 搜备注 | **0.1294**（42579/329160） | y212–318 与 y636–844 两带（区块比 0.28~0.34） |
| w17 账单详情 | **0.1351**（44455/329160） | y106–318 那一带（区块比 0.33~0.59） |

**这三行是基线，不是判定**：差值里至少含「两侧数据不同（夹具 2025-05~2026-06 vs 原型 2026-10）」与「皮肤在途（#1114）」两摊，本席不拆解成因。负责人通知 #1114 落地后按 §十 复跑。

## 九、据实读数与偏差（不下判定，交负责人）

1. **「页内导航恰一个」（已裁：票据纸 16 页 0 个不算缺件）**：判地 `proto/query/w01-查今天-v2.1.html`／`w09-查分类-v2.1.html` 逐字可见票据纸页**无 nav 块**；产物的对应位是页脚 `饼干记账 · <唤醒词>`（16/16 各 1 处）。Lead 2026-10-03 裁决原文：「单页判据**只认它自己那份判地**——页内导航恰一个／来源脚注 ≥1 这类**跨页族级清单不作为单页判据**；判地有的块产物必须有、判地没有的产物不该有。」⇒ 本席按族分判（票据纸 0／老列表页 1）**放行**，逐页读数照记。
2. **「来源脚注 ≥1」（已裁：票据纸 16 页 0 处不算缺件）**：同上裁决——该页型不上屏来源脚注（`src` 里票据页的 `SOURCE_TEXT_QUERY` 注释即写「回落老列表路时用」），判地也没有这一位。列表页（w00）判来源脚注（1 处）、票据纸判页脚，读数逐页照记。
3. **w09 查分类与同类页的占比段不一致（记成偏差，不放松判据，交负责人验收时裁）**：其余 15 张票据页的占比段是 `ilife-block-dist-row`（DOM 元素），**w09 产物的占比段 DOM 里 0 个 dist-row 元素、改走本页自有的 `ilife-category-bar`**（`<style>` 里那 16 处 `.ilife-block-dist-row` 规则是残留，**判 DOM 时不计**；数 CSS 文本会把这一条读反）。**两条事实更正（供复核）**：① 「产物有 dist-row」若按整文件 grep 会命中 `<style>` 里的 CSS 规则，判 DOM 须先剥 `<style>`／`<script>`；② 本墙右侧用的是 `docs/skills/skill-bill/proto/query/w09-查分类-v2.1.html`（本票票面「判地原件在 `proto/query/`」；`proto/manifest.json` 的 `domain=query` 第 49 行那件），**不是** `proto/w09/w09-查分类-v2.2.html`（那是 `domain=w09` 的另一件、manifest seq 99）；两件都没有 `dist-row` 元素。**判地这一侧的类词汇是老一套**（`sheet-frame`／`ledger-rows`／`sec`，`ilife-*` 命中 0），故「判地有的块产物必须有」这条**无法按 `ilife-*` 类名逐块套到本域判地上**——据实记，不下判定。
   **v2.1／v2.2 同页两版（Lead 2026-10-03 第二次裁决）**：`proto/w09/w09-查分类-v2.2.html`（manifest seq 99，`domain=w09`）是**负责人已批并已落地**的那一版（#1078 verdict 的 24 格里有它、落地走 #1080）；`proto/query/w09-查分类-v2.1.html`（seq 49）是**同一页的旧版**，「总账只许一行 w09、v2.1 不计行」已登记进 #1081。⇒ **第 09 格右侧判地改用 v2.2 件**（sha256 与 manifest 该件登记值相等），其余 16 格判地不动；该更正**并入 #1113 落地后的那次复跑**，不单独跑。
   **本次提交同时改了脚本（复跑时才生效，产物与墙一字未动）**：`run-1074.mjs` 的 `PROTO_REL.w09` → `w09/w09-查分类-v2.2.html`、判地查找面放宽到全部 proto 件；`1074-query-验收墙.mjs` 的登记表同样放宽到全部 proto 件（否则 v2.2 那件会被判「判据侧未登记」）。**盘上现役墙仍是最初那版（右侧 v2.1）**，复跑后才是 v2.2。
4. **w00 空态回落老列表页**（票面已知缺口）：零行不出一张票据纸空态纸，与原型 w00 不同族。据实记，不在本票修。
5. **#1110 §六 ③ 的遗留**（判据问题，本席未改）：查今天对账分隔符实现半角 ` / `、判地原型全角 ` ／ `。本墙两侧各按各的样子呈现，判定归负责人。
6. **判据侧目录名核对**：票面写原型在 `docs/skills/skill-bill/proto/query/`，实际**一致**（17 件，编号 w00/w01~w04/w06~w17；w05 查账单并入 w01，不单独出纸）——无偏差，记一条是为了与 #1077 的路径偏差区分。

## 十、复跑（照抄即可）

```
# 1. 真跑 17 页（隔离家目录 $env:TEMP\tick-1074；不重建 dist）
node tooling/run-locked.mjs --ticket 1074 -- node .scratch/1074-query/run-1074.mjs
# 2. 出双墙（正例 exit 0）
node tooling/run-locked.mjs --ticket 1074 -- node docs/skills/skill-bill/1074-query-验收墙.mjs .scratch/1074-query compare-1074-query-17.html
# 3. 变异三连（各 exit 1，造夹具 → 逐条跑）
node tooling/run-locked.mjs --ticket 1074 -- node .scratch/1074-query/make-bad-lists.mjs
node docs/skills/skill-bill/1074-query-验收墙.mjs .scratch/1074-query/坏清单  compare-坏.html
node docs/skills/skill-bill/1074-query-验收墙.mjs .scratch/1074-query/坏清单2 compare-坏2.html
node docs/skills/skill-bill/1074-query-验收墙.mjs .scratch/1074-query/坏清单3 compare-坏3.html
```

锁记录导出（协议 §2.3 第 4 条，受版本控制）：[1074-锁记录导出.log](./1074-锁记录导出.log)（ticket=1074 的全部 START／RUN 行，逐行原样）。

## 十一、人眼判定（待回填）

- 待负责人滚过两张墙逐格判 ok／不 ok；判定原文（导出 JSON ＋ 逐格备注）落 [1074-query-逐格结论.md](./1074-query-逐格结论.md)，这里只留一行指针。
- **没有用户那一句（谁看了哪几格、逐格 ok／不 ok）不许关票**；本席不替负责人判 ok。
