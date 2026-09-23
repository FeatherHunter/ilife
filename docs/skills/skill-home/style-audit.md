# 居家管家 · 样式与文案机审说明（票 #803）

三件判据脚本住 `packages/skill-home/scripts/`，全部经 `tooling/run-locked.mjs` 排队跑。
设计源头：卡路里 `audit-separators.mjs`（R1–R7 引擎）＋ `measure-responsive.mjs`
（CDP 真渲染 harness）＋ 记账 `t407`／`t417`（位置四分、共享层 vs 本页）——
出处与行号对照见 `docs/skills/skill-home/html-scenes-precedents.md` §C。

## 一 · 跑法（验收命令）

文案与分隔符：

```sh
node tooling/run-locked.mjs --ticket <票号> --max-wait-ms 600000 -- node packages/skill-home/scripts/audit-separators.mjs --dir <样例产物目录> [--json <路径>] [--quiet]
```

双端与触摸：

```sh
node tooling/run-locked.mjs --ticket <票号> --max-wait-ms 600000 -- node packages/skill-home/scripts/audit-responsive.mjs --dir <样例产物目录> [--widths 390,1280] [--json <路径>] [--fail-on-clip] [--fail-on-viewport]
```

结构块：

```sh
node tooling/run-locked.mjs --ticket <票号> --max-wait-ms 600000 -- node packages/skill-home/scripts/audit-page-blocks.mjs --dir <样例产物目录> --blocks packages/skill-home/scripts/page-blocks.json [--json <路径>]
```

退出码三件统一：0＝全绿；1＝有命中或缺件（含读不动）；2＝用法错（分隔符／结构）或缺浏览器
（双端：本件量的是真浏览器里的版面事实，静态 HTML 查不到，缺浏览器不静默变绿）。
门禁测试 `packages/skill-home/test/style-audit.test.mjs` 已接进包内 `test` 串（11 例）。

## 二 · 位置四分（居家口径）

直接套 `ilife-block-*` 类名会读数全 0（居家普通产物用自家极简 `SHARED_CSS`，
见 `packages/skill-home/src/render/html.ts`），故四个正则按居家自己的类名重写：

- 版式位（分隔符顶替设计，进红）：`badge`（状态徽章）／`item-head`（条目头）／`stat`（统计块）。
  刻意不含 `.content`（条目正文，数据）与 `.cmd`（命令原文 boilerplate，载荷）。
- 标题写法位（允许保留一个分隔符，不进红，逐处照打）：`page-shell-eyebrow`／
  `page-shell-title`（HELP 分支共享模板类名）＋ 裸 `h1`（普通产物页标题）＋ `<title>`。
- 非版式位（旁证，不进红）：`.content` 等数据区。
- 载荷位（标点是载荷本来的样子，不是页面文案）：`pre-block-code`／`data-t`／
  `copy-btn`／`copy-menu`／`cmd`。`.cmd` 行（每页那行 `home-cmd-read home.…`）的
  R7 命中照打节点读数，不进红——它是模板 chrome，不是作者写下的文案。

红判据（照 t417）＝版式位 `·`／`|` ＋ 载荷区外英文裸词行 ＋ 重复句 ＋ 缺件。
R1–R7 节点读数全部照打（`；`／`;` 只报告不进红：大量是正经句末分号）。
英文裸词列剔除 `<pre>`／`data-t`／`.cmd` 后再判；统计块的键名裸奔（如 `items`／
`done`）会被点名——键名必须用中文标签，这是本件在本票现场抓到的真命中（见 §五）。

共享层 vs 本页（照 t417）：head 里那份样式表单列成「共享层的成绩」
（断点／44px／换行／塌列／内距／色值），不记到每页头上；本页只看 body 之后的
样式块与内联 `style`。普通产物今天是 419 字符、无断点、无 44px 的极简表——
这是共享层的现状，不是每页的错。

## 三 · 双端读数口径

390／1280 两档真渲染：横向溢出像素（`scrollWidth − innerWidth`，越界元素点名到
`blame` 前三）／最窄触控目标（全部可点件最短边的最小值，可点件为 0 记「无可点件」
不判红）／横滚藏匿（`overflow-x:hidden/clip` 且内容被裁的个数，只报告，
`--fail-on-clip` 才进红）。每页另打 `vp有/vp无`（有无 viewport meta，只报告）。

harness 与卡路里同形（零第三方依赖），一处故意不同：`mobile` 恒传 `false`。
实测 `mobile:true` 会让布局视口跟内容走（1200px 定宽块把 `innerWidth` 撑到 1208，
溢出永远量成 0）；`false` 时档宽即真值（390 档量出 `overflow+830` 并点名到块）。
档宽已足够驱动媒体查询，`mobile` 行为不参与判据。

## 四 · 结构块合同

`scripts/page-blocks.json`（`version:1`）是清单事实源，`kind` 只三种：
`substr`（必须出现）／`regexp`（必须命中）／`absent`（必须不出现）。
`defaults[]` 7 条是现状骨架可机检块（`doc-doctype`／`doc-lang`／`shell-page`／`page-title`／
`cmd-line`／`content-filled`／`css-inlined`）：渲染管线的结构事实。
`pages[]` 46 条是领域必需块（2026-09-21 由契约附录派生：46 族 755 块，见 §五），
每条按产物命名“**命令中文名** 开头”匹配（`pattern`，如 `detail` 族是 `^(看物品)_`；#859 改名后不再认场景 id 段），
块 id 形如 `<族>:<组>:<序号>`（如 `detail:fields:0`），缺块点名到文件＋块。
checker 不用改：只读 `file` 精确名／`pattern` 正则＋`blocks[]`，其余字段（`family`／
`domain`／`names`）是给人看的。

输入口径：本件查的是**装配后的产物**（`CONTENT` 已填充、样式已内联），不是原始模板——
原始模板带未填充标记是设计使然，本来就该红，不进本门。名字不以任何族命令中文名开头的
装配页（如通用页）只走 7 条默认块，`pattern` 不误伤。

附录变更后重跑派生（只换 `pages[]` 与 `note`，`defaults` 与 checker 不动）：

```sh
node .scratch/803-expand-pages.mjs
```

再跑结构门（门禁 11 例里有附录对账，走散即红）。

## 五 · 本票现场读数（2026-09-21，种子由当刻 dist 真渲染，见 `.scratch/803-seed.mjs`）

文案与分隔符——正例（`.scratch/803-sep-clean`，5 页）：节点命中 8（`.cmd` 行 R7、
`#12`／`#25` 票号、`；` 句末分号、HELP 标题 `·` 标题写法位 1），
版式位 0、英文 0、重复 0 → `RESULT: 5/5 PASS`（命中＞0 且清单逐行，绿可达，不是假绿）。
反例（加 `debt-sep.html`：徽章里塞 `在家 · 备用`）：`debt-sep.html(1)`、
逐行点名 `在家 · 备用` → `RESULT: 5/6 FAIL` exit 1。
额外真命中：统计键名用英文（`items`／`done`）时英文裸词列 2 行点名——已改中文标签归零。

双端与触摸——假例（`.scratch/803-resp-clean`，2 页）：两档溢出 0、无可点件、藏匿 0、
`vp无` → `RESULT: 2/2 PASS`。真例（加 `debt-responsive.html`：1200px 定宽块＋20px
按钮）：390 档 `overflow+830｜touch<20`（`blame` 点名到块）、1280 档 `overflow+200｜
touch<20` → `RESULT: 1/2 FAIL` exit 1。
HELP 页（有 viewport，390 真宽）：溢出 0，但 77 件可点件短边＜44（链接 14px、
复制按钮 26px）——这是共享模板壳的触摸债，落点在公共层，不归本图（本图 HELP 页
本身不重做），域票跑普通产物目录时不受它连累。

结构块——假例（`.scratch/803-blocks-good`）：`blocks=7/7` 两页 → `PASS`。
真例（`blocks-bad.html` 摘掉 `h1`）：`缺块 [page-title] kind=regexp` → `FAIL` exit 1。
变异（改坏必红）：`page-blocks.json` 任删一条即对应页红，改回即绿（门禁测试钉死）。

领域半段（2026-09-21，`pages[]` 46 族 755 块已由契约附录派生，派生脚本
`.scratch/803-expand-pages.mjs`，`defaults` 与 checker 一字未动）：

- 三方对账：`dist` 装配登记／契约附录／合同 `pages[]` 的 `detail` 族 29 块原文一致
  （`.scratch/803-expand-proof.mjs` 先对账，对不上直接抛错、不出“绿”）。
- 假例（真装配齐全页 `看物品_2-2_20260921T000000.html`，经 `renderFamilyPage` 实组装，
  非合成夹具）：`blocks=36/36`（默认 7＋`detail` 族 29）；同目录通用页（名字不认任何族）
  `blocks=7/7` → `RESULT: 2/2 PASS`。
- 真例（同页摘掉 `detail:fields:0` 全部出现处）：`blocks=35/36`、
  `缺块 [detail:fields:0] kind=substr value=ID` → `RESULT: 0/1 FAIL` exit 1。
- 门禁 11/11 绿（含新增 3 例：46 族对账／场景页 36/36＋通用页 7/7／摘块点名）；
  包内回归 126/126 绿（`help-assets`／`help-delivery-190`／`backup`／`style-audit`／
  `wake-family-gates`／`scaffold`／`cli`／`skill` 八件）。

## 六 · 遗留出口（本票当场处置）

1. 21 张普通模板无 viewport meta（HELP 分支有）：`vp无` 照打，不进红；曾计划补进
   票 2（#799）契约、模板冻结在本票不许动——票 2 已关且终稿无该条款，现状与跟进见本节 7。
2. 英文裸词允许清单：种子 FIXTURE 为空壳（本域无豁免夹具名）。票 5（#802）种子
   落地若带英文固定串，按 t407  precedent 逐条允许并写明理由，不扩大。
3. 重复句口径：照 t417（长度＞6、剔表格原文、跨行不并）。域页出现合法复述
   （如空态与标题同句）时回写本件，不私自放宽。
4. HELP 壳触摸债（77 件＜44）：公共层写集，本图只记录读数，不修；收口票跑墙时
   HELP 不进双端门，或单列公共层事项。
5. 域必需块：2026-09-21 已由契约附录派生进合同 `pages[]`（46 族 755 块，读数见 §五）；
   域票把本件三条命令接进各自验收（写集不相交，各跑各的产物目录）。
6. 单字块判别力弱（`改`／`移`／`补`／`减`／`标`／`废`等单字 `substr` 几乎恒命中）：
   结构门能证“缺整块即红”，证不了单字块的误用；域页语义正确性由视觉复核兜底，
   不在本件口径内，不属欠账。
7. 普通产物模板仍无 viewport meta（契约终稿无 viewport 条款，票 2 已关）：
   双端门 `vp无` 照打、不进红（见 §三）；若将来契约补丁流补 viewport，
   本件跟进把 `vp无` 转进红——属合同变更，不属本票欠账。
