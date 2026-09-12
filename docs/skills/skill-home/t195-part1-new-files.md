# t195 第四节 · 新增件清单（居家「居家管家 帮助」）

范围：只写「新件住哪、每件对外给什么」与照抄对应；不写实现细节。票号口径：票 5 #188 内容资产／票 6 #189 渲染接线／票 7 #190 出口落盘。

> 更正（2026-09-12）：新 HELP 件落点统一收进 src/help/；账单 output.ts 已是薄封装（递补在共用件）。依据 t187-decision.md 第四节。

## 1. 新增件逐条表（居家侧路径 → 职责 → 对外给什么 → 归哪张票）

| 新增件（`packages/skill-home/` 下） | 一句话职责 | 对外给什么（导出名） | 票 |
| --- | --- | --- | --- |
| `src/help/manifest.ts` | **只有落点值**：目录名与文件名主体（零 IO 纯常量；通式／递补不在本件） | `HELP_HTML_DIR_NAME`＝`'home_manager_html'`；`LOOKUP_FILE_STEM`＝`'居家管家_速查表'`（票 4 #187 裁决：速查支产物 `居家管家_速查表_<stamp>.html`，与 HELP 分名）；HELP 文件名主体 `居家管家_HELP` 照 bill 仍住 `helpFile.ts` | 票 7 #190 |
| `src/help/helpFile.ts` | 内容资产＋派生 → 全量 HELP JSON → 全页 HTML，零 IO、零落盘 | 照 bill 的 21 个导出名单（6 常量＋8 接口＋7 函数），值换居家：`HELP_FILE_STEM`／`HELP_FILE_SKILL_NAME`／`HELP_FILE_TITLE`／`HELP_FILE_VERSION`／`HELP_INIT_SCENE_ID`／`HELP_CONTACT`、`HelpFileData`／`HelpFileOptions`／`HelpMetaBlock`／`HelpInitBanner`／`HelpIndex`／`HelpIndexItem`／`HelpContact*`、`formatHelpMinute`／`deriveSummaryLine`／`buildMetaBlocks`／`buildInitBanner`／`buildHelpFileData`／`renderHelpFileHtml`／`buildHelpIndex` | 票 6 #189 |
| `src/help/output.ts` | HTML 产物唯一落盘点＝**薄封装**：出口裁决（`explicit` 优先且覆盖写、`target` 缺位即抛）＋委派共用件 `saveHtmlFile`＋写失败 `exit 5`＋顶层追加 `delivery{mode,path,bytes}`；**不自持递补** | `deliverHtml`｜`HtmlDelivery`｜`HtmlLanding`（后两者自 `base-paint/save-html` 再导出） | 票 7 #190 |
| `src/help/helpAssets.ts`（内容资产，机器生成物，**不搬** `src/triggers/`；事实源＝已入库的 `src/help/scenarios.yaml`） | 生成物：全量 HELP 资产（域／组／场景／唤醒词／场景索引） | 导出名单留给你票 5 定（bill 那份给 `WAKE_GROUPS`／`SCENE_BY_ID`／`HELP_WAKE_WORDS`／`WAKE_ASSETS`） | 票 5 #188 |
| `scripts/gen-help-assets.mjs` | 由事实源生成上一件，含 `--check` 分支 | 无（脚本，不对外） | 票 5 #188 |
| `test/help-delivery-*.test.mjs` | 模块级锁：落点值（纯常量零 IO）／同秒三写不被覆盖（通式与递补机制在共用件，锁的是调用面） | 无 | 票 7 #190 |
| `test/help-exit-*.test.mjs` | 真 spawn 出口锁：回执五字段序＋顶层 `delivery`＋失败 exit 5 ＋ stdout 空 | 无 | 票 7 #190 |
| `test/help-assets.test.mjs` | 资产锁：摘要锁＋与事实源双向对账 | 无 | 票 5 #188 |
| `src/render/errors.ts`（仅当居家还没有同类错误件） | 渲染期错误类型（bill 侧是 `BillRenderError`） | 名单留给票 6 定 | 票 6 #189 |

- 不是新增、但要同批改的既有件（同报）：`packages/skill-home/package.json`（依赖闭包加 `base-paint`）、`packages/skill-home/SKILL.md`（补「HELP 交付」节）、`packages/skill-home/src/cli/cmd_read.ts`（HELP 在开库之前分派）、`tooling/check-boundaries.mjs`（把 `skill-home` 移出 `SKILLS_BASE_FROZEN`）。**不在册的**：`src/render/index.ts`——新 HELP 件全收进 `src/help/` 后不与既有 barrel 撞名，本票**不加行、不动它**（t187-decision.md 第四节理由 3），原表那行「`src/render/index.ts` 汇总出口」已删。

## 2. 照抄对应表（bill 件含真实导出名 → 居家对应件）

| bill 件（导出名） | 居家对应件 | 保留什么 | 必须改什么 |
| --- | --- | --- | --- |
| `packages/skill-bill/src/render/helpPaths.ts`（`HELP_HTML_DIR_NAME`／`LOOKUP_FILE_STEM`） | `src/help/manifest.ts` | 零 import、零函数、零类型的纯常量形状（**只有落点值**） | 文件名取 `manifest.ts`——照大厨 `src/help/manifest.ts` 先例（账单那一件叫 `helpPaths.ts`，且它的 `HELP_FILE_STEM` 其实住在 `src/render/helpFile.ts:24`，不是 `helpPaths.ts`——照抄会抄错位）；两常量取值换居家口径（目录名 `home_manager_html`／速查主体 `居家管家_速查表`）；速查支**已按票 4 #187 裁决写死**，不再待定。**通式口径不抄进来**：时间戳通式／`_N` 递补／独占写／复用窗口／绝对路径回执的唯一定义地是共用件 `base-paint/save-html` 的 `saveHtmlFile`（`packages/base-render/src/output/saveHtml.ts:355` 自建落点目录；旁证 `packages/skill-calorie/src/render/helpPaths.ts:6`） |
| `packages/skill-bill/src/output.ts`（`deliverHtml`／`HtmlDelivery`／`HtmlLanding`） | `src/help/output.ts` | **薄封装形状**（现行件，`packages/skill-bill/src/output.ts:5,24,49,54`）：`explicit` 优先且覆盖写、`target` 缺位即抛、回执 `{ mode:'file', path, bytes }` 且 `path` 恒绝对——两路都只委派 `saveHtmlFile` | 注释里的技能名与报错前缀（`[skill-bill]` → 居家）；`HtmlLanding`／`HtmlReceipt` 仍从 `base-paint/save-html` 取。**删掉旧写法「递补只认 `EEXIST`」**：递补循环已不住 `output.ts`（本件不自持 `nextExclusiveCandidate`／`writeFileExclusiveWithRetry`） |
| `packages/skill-bill/src/render/helpFile.ts`（21 导出：6 常量＋8 接口＋7 函数） | `src/help/helpFile.ts` | 全量 HELP JSON 形状（`renderHelpFileHtml` 直调 `renderHelpShellHtml`）；三块可选内容字段一律带着、显隐走 `hidden`；域数／场景数／版本计数一律派生；`now` 显式传入 | 六个常量取值（`HELP_FILE_STEM`＝`'居家管家_HELP'` 照 bill 住本件**不**住 `manifest.ts`）；`groups` 换成居家内容资产；`init_banner` 的 `prompt` 来源换居家场景 |
| （不抄）`packages/skill-bill/src/render/index.ts` | **不动** `src/render/index.ts` | — | 收进 `src/help/` 后不再有「既有 barrel 上加行」这一条，也免掉 `export *` 重名静默丢名的风险（t187-decision.md 第四节理由 3） |

## 3. 不许照抄的件（逐条＋一句话理由）

- `packages/skill-calorie/src/output.ts`：卡路里的「命令名→中文段落映射」「动态段」「写不进去就换形态的兜底」是它自己的产物模型；本线目的地是明确拿到文件，写不进去就是真失败（exit 5）。
- `packages/skill-calorie/src/render/helpShell.ts`：卡路里侧转发件且已标 deprecated；新技能直连公共层出口，不再多一层转发（铁律五）。
- `packages/base-render/src/helpShell.ts` ＋ `assets/help-template.html` ＋ `scripts/gen-help-shell.cjs`：通用 help 模板的出口与真相源，只 import，不抄、不改。
- `tooling/skill-html-snapshot.mjs`：本图只新增 HELP 文件、不动居家 `templates/*.html`，`pnpm snapshot:html:check` 应保持绿——注意别被误伤。
- `packages/skill-home/src/help/lookup.ts` ＋ `src/render/views.ts:buildHelpItems`：居家速查表数据源与渲染「照用不改」，不重写。
- `src/triggers/` 这个目录名：工种名，且这份早于 `docs/agents/structure.md` 立规；居家不该照搬（铁律四）。
- `gen-wake-assets.mjs` 的读取段：事实源从老实物 HTML 的 payload 换成 `src/help/scenarios.yaml`（已入库），读取段要重写。
- `cmd_read.ts` 的居家开库顺序：形状照抄，但居家现状相反（`dispatch` 首行就 `openHomeDb`、`resolveDbPath` 会 `mkdirSync`），「看帮助先把库建出来并跑 DDL」不能抄。

## 4. 两处生成物禁手改（路径 ＋ 改源命令原文）

### 4.1 通用 help 模板出口：`packages/base-render/src/helpShell.ts`（含 `assets/help-template.html`、`scripts/gen-help-shell.cjs`）

- 禁手改原文：「**`packages/base-render/src/helpShell.ts` 是生成物，禁手改**：真相源是 `packages/base-render/assets/help-template.html`，生成器 `scripts/gen-help-shell.cjs`」。
- 改源命令原文：「改模板要跑 `pnpm --filter base-paint gen:help-shell` 并过 `gen:help-shell:check`」。

### 4.2 内容资产生成物：bill 侧 `packages/skill-bill/src/triggers/wake-assets.ts`（986 行）→ 居家 `src/help/helpAssets.ts`（同性质，事实源 `src/help/scenarios.yaml` 已入库）

- 禁手改原文：「**内容资产也是生成物，禁手改词**：`wake-assets.ts:8-10` 与生成器头注释（`gen-wake-assets.mjs:144-146`）都写明『改内容＝改事实源或改生成器里的新增条目段，再跑生成器』」。
- 改源命令：t184 原文只给到生成器脚本名、`--check` 分支（`gen-wake-assets.mjs:243-249`）与用法注释（`:7-13`），**未给完整命令行**（记为事实缺口）→ 居家同样要留 `--check`，住 `packages/skill-home/scripts/gen-help-assets.mjs`。

## 5. 我定不下来的（交给下一棒或用户；2026-09-12 更正：原第 1／2 条已定、原第 5 条已核实，见条内标注）

- （原第 1 条已定，2026-09-12）：内容资产生成物的居家路径＝`src/help/helpAssets.ts`、事实源＝已入库的 `src/help/scenarios.yaml`——「新 HELP 件全部收进 `src/help/`」同时解掉「不能照搬 `src/triggers/`」的顾虑（t187-decision.md 第四节）。
- （原第 2 条已定，2026-09-12）：居家 `LOOKUP_FILE_STEM`＝`'居家管家_速查表'`，速查支与 HELP **分名**（票 4 #187 裁决），不再「属票 4 的事」。
- 居家 HELP 五字段取值（`title`／`contact` 三项／`version`／首次使用横幅文案）与 `init_banner` 显隐口径：无仓内依据。
- 居家是否已有渲染期错误件（bill 的 `./errors.js`＋`BillRenderError`）：本窗只读两份事实包，未核实。
- （原第 5 条已核实，2026-09-12）：`src/help/scenarios.yaml` 已在库，即居家现成事实源；生成器读取段照它重写。
- 居家 HELP 用的徽章类型词：应断言**模板实际那张表的 10 个词**（`packages/base-render/assets/help-template.html:1698-1709`）；这里原写的「共享模板认的 5 个（`采集／查看／选择／向导／回执`）」是引用错误，已在 `t195-part6-questions.md` 与 t187-decision.md 追加约束 11 更正。
- 三件测试件的票归属是我按件归（模块级／出口锁归票 7、资产锁归票 5，part5 §3 问 4 采纳）；原「`src/help/<名>.ts` 交叉归属待定」已消——该件就是 `src/help/output.ts`，归票 7；`src/render/index.ts` **不动**（不加行、不新增），已定。
