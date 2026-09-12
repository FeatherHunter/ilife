# t202 · help 模板的 `meta_blocks` 分组页落点：契约与在用四家

这份记录归公共层包 `base-render`（目录名逐字，见 `docs/agents/doc-homes.md`）。记的是共享 help 模板
`packages/base-render/assets/help-template.html` 上 `meta_blocks` 的**渲染落点**：它自 #197／#202 起有了，
落点是**分组页页首**、按 `id` 命中分组才渲。

## 1. 改了什么

两处插入，共 7 行，都在 `packages/base-render/assets/help-template.html`（模板是唯一真相源，
生成物 `src/helpShell.ts` 与哈希锁 `test/help-shell-136.test.mjs` 由它机器生成，禁手工改）：

| 位置 | 行 | 内容 |
| --- | --- | --- |
| CSS | `:56-57` | `:56` 注释一行；`:57` 规则 `.meta-sec .a-t span{color:var(--fg2);font-size:12.5px;line-height:1.5}`。它与 `:52` 的 `.about-row .a-t span` 特异度相同，靠**源序在后**取胜；不写这行，90 条会落回 `:52` 的 10.5px／弱色 |
| 运行时 | `:1785-1789` | 在**分组页锚点**（`h += '<div class="page" data-page="' + g.key + '">';`）之后，遍历 `META_BLOCKS`，`m.id !== g.key` 即跳过，命中就拼 `<div class="about-sec meta-sec">`（`esc(m.title)` 作表头、`m.html` 原样入 DOM） |

本票（#202 记录面补齐）另外把 `:1786` 的**冗余守卫**去掉了：改动前是
`if (META_BLOCKS && META_BLOCKS.length) META_BLOCKS.forEach(…)`，而 `:1653` 已写
`var META_BLOCKS = HELP.meta_blocks || [];`（恒为数组），守卫删掉后语义不变、少一个分支。
改完必须重跑生成器：`pnpm --filter base-paint gen:help-shell`。

页面侧读入点是 `:1653` `var META_BLOCKS = HELP.meta_blocks || [];`；
模板里 `META_BLOCKS` 只出现 3 次（`:56` 注释、`:1653` 读入、`:1786` 渲染）。

## 2. 契约

1. **不传就不渲染，且输出与旧版逐字节相同。** 缺省 `HELP.meta_blocks` ⇒ `META_BLOCKS = []` ⇒
   `:1786` 的 `forEach` 零迭代 ⇒ 零输出。**页 DOM（运行时段 `#screen` 的内容）与改动前逐字节相同**，
   `sha256` 同值（bill 两态、calorie 一态均已实测，见 §4）。整篇文档会比旧版多 551 字节——那是模板的
   CSS 与页面侧脚本内联进了每个产物，与载荷无关，仓内没有对整篇字节的锁。
2. **`meta_blocks[].html` 原样透传进 DOM，不转义、不消毒。** `:1788` 只做 `esc(m.title)`，
   `m.html` 直接拼进 `innerHTML`。**这是 A 路模板里唯一的「载荷原文直入 DOM」接收点**（同文件其它载荷插值
   全部走 `esc()`：`esc(SKILL_NAME)`、`esc(TITLE)`、`esc(INIT_BANNER.prompt)`、`esc(r.desc)` 等，另有
   `:1814` 起「关于」Tab 各段）。该口径与 B 路既有先例一致（`packages/base-render/src/help.ts:596`
   的 `renderMetaBlocks` 同为「标题转义／正文原样」）。
3. **转义责任因此落在技能侧**：传 `meta_blocks` 的一方必须自己转义，否则含 ASCII 尖括号的原文会被
   浏览器当标签解析、用户看不到原文。今天两家传块的做法不同，都合规：
   `skill-schedule` 逐条 `escapeHtml`（`packages/skill-schedule/src/help/helpFile.ts:192-204`）；
   `skill-bill` 传的是自造片段（`<p>…</p>`，内容全是自家常量，无待转义字符）。
4. **块 `id` 必须逐字等于某个一级分组的 `id` 才上页。** `id` 不命中任何分组的块是**死载荷**：
   它进 `help-data` 的 JSON，但永远不会渲到页上。

## 3. 在用四家（本票逐家 grep 复核）

| 消费方 | 模板路 | 传不传 `meta_blocks` | 页上是否渲染 |
| --- | --- | --- | --- |
| `skill-bill` | 直连 `base-paint/help-shell`（`src/render/helpFile.ts:19`） | 传 2 块：`help_summary`／`help_wake_words` | **不渲染**。两块 `id` 与它的 7 个分组 `id`（`write`／`query`／`analysis`／`goal`／`account`／`link`／`setup`）**零碰撞** ⇒ `.meta-sec` 命中 0 个，页 DOM 逐字节同旧版 |
| `skill-calorie` | 隔一层自家转发（`src/render/helpFile.ts` 只造 5 键） | **不传**（`buildHelpFileData` 只回 `skill_name`／`title`／`subtitle`／`contact`／`groups`） | 不渲染。页 DOM 逐字节同旧版 |
| `skill-schedule` | 直连 `base-paint/help-shell` | 传 **5 块**（每个一级分组一块） | **渲染 5 块／90 行**，落在各自分组页页首、该组场景卡之前。这是本次唯一预期变化方 |
| `skill-memo-ilife` | 直连 `base-paint/help-shell`（`src/help/helpFile.ts:35`） | **不传**（`:31` 明写「`meta_blocks` 整块不传」，属用户裁定 V1） | 不渲染 |

`skill-chef`／`skill-home` 与六家 `plugin-*` 不依赖 `base-paint`、不 import `help-shell`，不涉及。

注：`skill-schedule` 此前还造第 6 块 `help_summary`（`id` 不命中任何分组 ⇒ 永不上页的死载荷），
本票已删，`buildMetaBlocks` 现在只造 5 个分组块（`src/help/helpFile.ts:206-213`）。

## 4. 复现命令

**① 运行时段页 DOM 与「90 条逐条可见」**（入仓文件，长期可用；用例读 `dist/`，先编译）：

```powershell
pnpm -C packages/skill-schedule exec tsc -b
node --test packages/skill-schedule/test/help-file-202.test.mjs
```

13 个用例全绿即「85 条场景预期结果说明 ＋ 5 条一级分组说明逐条出现在页的可见文本里」
（用例逐条核，计数全由内容资产派生，不写死 85／5）。

**② 跨消费方「不传即逐字节相同」**（草稿脚本，`.scratch/` 是过程草稿目录、不入仓，见 `.gitignore:5`）：

```powershell
node .scratch/t197-review-i/extract-harness.cjs   # 从 202 用例抽出最小 DOM 桩成独立模块
node .scratch/t197-review-i/cmp-dom.mjs           # 旧模板（git HEAD blob 还原 CRLF）对 新模板，逐家渲染比对
```

实测输出（本票复跑）：bill `page DOM bytes 43880 identical=true`、bill 已初始化态 `43341 identical=true`、
calorie `277776 identical=true`、schedule `35549→51399`（`meta-sec` 0→5）。重建口径：从
`packages/skill-schedule/test/help-file-202.test.mjs` 里截 `describe('#202` 之前的 DOM 桩（`runPage`／
`visibleText`）成模块，再按 `PREFIX ＋ JSON ＋ SUFFIX` 造新旧两版模板的渲染器，比对 `screen.innerHTML`
的 `sha256`。

**③ 本票自己的 90 条计数**（草稿）：`node .scratch/t202-record/verify-90.mjs` ⇒
`页上 .meta-sec = 5`、`页上 .meta-sec 行数 = 90`、`85/85`、`5/5`、`id 不命中分组的块 = []`。

**④ 模板侧的门**（改模板后必跑）：

```powershell
pnpm --filter base-paint gen:help-shell
pnpm --filter base-paint gen:help-shell:check
```

本票结果：`prefix=b09b2ffb…8f0a`（CSS 与 PREFIX 未变）、`suffix=1335391b…c41f`（运行时改了，哈希随之变）。

## 5. 已知限制

- **`m.html` 直入 DOM ⇒ 未来消费方必须自己转义。** 模板不做任何消毒：传一个 `id` 恰好等于分组 `id`
  的未转义块，它的 HTML 就会在交付的 `file://` 文档里执行。这是既有口径的延续，不是本票新开的口子，
  但**新增消费方接 `meta_blocks` 前必须先读第 2 节第 3 条**。
- **载荷正文与模板 CSS 是耦合的。** `:57` 的选择器 `.meta-sec .a-t span` 要求正文用模板内部类名
  `.about-row`／`.a-t`。改模板 `.meta-sec` 区须同步技能侧正文形状，反之亦然。
- **A 路没有视觉门。** `packages/base-render/test/help-visual-lock-89.test.mjs` 锁的是 B 路
  `buildStyleSheet()` 的 CSS 常量，不覆盖本模板；分组页首信息块（90 行 × 5 页）只有肉眼终审。
- **本票没有搬 `docs/base-paint-contract.md`。** 按 `docs/agents/doc-homes.md:54`，它的归属件是
  `base-render`、搬后应为 `docs/base/base-render/contract-v1.md`；本票**不搬**，因为该文件被**代码按字面路径读**：
  `packages/base-render/test/contract-signatures.test.mjs:89` 的 `DOC_URL` 与
  `packages/base-render/test/style.test.mjs:637`（前者另有 `:287` 整个「文档投影绑死」用例），
  另有一个仓内脚本 `docs/research/t75-visual-evidence.mjs:127` 也按路径读它。全仓 62 份受跟踪文件引用该路径。
  搬动要同步改这些读取点，而 `packages/base-render/test/**` 不在本票写面内 ⇒ 留给专题票。

## 6. 本次同时改掉的失效陈述

本次共用资产改动让仓内 5 处「A 路不渲染 `meta_blocks`」的陈述变假，本票一并改掉并指向本记录
（行号＝本票改完后的在盘行号）：

| 位置 | 改前 | 改后 |
| --- | --- | --- |
| `docs/base-paint-contract.md:821`（§3.5.2 顶层键表下） | 「Base **原样透传不渲染**」 | 原样透传、不转义不消毒；自 t202 起按分组 `id` 条件渲染 |
| `docs/skills/skill-home/t186-template-contract.md:48`（§1.2 表格） | 「**不渲染**。…此后 `META_BLOCKS` 全模板零引用」 | 按分组 `id` 条件渲染，给出读入行与渲染行 |
| `docs/skills/skill-chef/t3-template-contract.md:276-277`（§3.1 两条）＋ `:271`（§三 开头） | 「**渲染落点**：**没有**。…此后全文零引用」／「三块可选内容…传与不传逐字节相同」 | 有落点、块 `id` 必须命中分组 `id` 才上页；「传＝白做」加了「只在与分组 `id` 零碰撞时成立」的限定 |
| `docs/skills/skill-memo-ilife/t223-template-contract.md:59`（§1.2 表格） | 「**无落点**。`:1651` 之后全模板零引用」 | 按分组 `id` 条件渲染；本件不传 ⇒ 零差异 |
| `packages/skill-bill/src/render/helpFile.ts:55-58`（`HelpMetaBlock` 的注释） | 「透传信息块（**壳不渲染**，供外部消费）」 | 模板自 t202 起会渲染它；本件两块零碰撞 ⇒ 本件页上仍不渲染 |

第五处之外，`packages/skill-schedule/src/help/helpFile.ts` 里自述的 `subtitle`／`meta_blocks[0]` 同源口径
随汇总块一起改掉（`subtitle` 现在只进载荷、模板无渲染落点；`buildMetaBlocks` 只造分组块）。

同一条失效陈述在三份技能契约里还有若干处，本票**不逐处改写**（那等于重写三份调查报告），
改为在每份文件**标题下各加一行更正指针**（本仓既有惯例，如 `docs/calorie-dual-path-acceptance.md:95`
的「原陈述已成假，勿再引用」），统一声明「凡写不渲染处均已失效」并指向本记录。其余各处：
t186 `:14`／`:86`／`:103`／`:200`／`:211`／`:223`／`:228`；
t3 `:56`／`:57`／`:87`／`:89`／`:103`／`:207`／`:216`／`:219`／`:228`／`:676`／`:810`／`:820`；
t223 `:112`／`:113`／`:190`／`:333`。指针本身落在各文件 `:3`，故上面这些行号是插后的在盘行号。

**行号漂移**：本次在 `:56-57` 插入 2 行 CSS，上述技能文档里 `:1650` 及其之后的行号引用整体 +2
（`:1650→:1652`、`:1651→:1653`）。本票只重算了被改写的那几句里的行号（例如 `t223` 表内 `meta_blocks` 那行），
同一张表里 `subtitle` 那行的 `:1650` 等其余引用未重算——这是已知的、范围受控的旧账。
