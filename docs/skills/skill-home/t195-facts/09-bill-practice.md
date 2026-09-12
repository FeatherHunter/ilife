# 09 · 饼干记账 HELP 内容资产做法（t195 事实取证）

范围：`packages/skill-bill/**` 只读；行数为当前工作区实数。

## 1 内容资产形态＝机器生成的 `.ts` 常量

- `packages/skill-bill/src/triggers/wake-assets.ts`，986 行：类型 `:30-52`、数据体 `WAKE_GROUPS` `:55-965`、派生 `WAKE_ASSETS` `:968`／`SCENE_BY_ID` `:973`／`WAKE_ASSET_TOTAL` `:978`／`HELP_WAKE_WORDS` `:984`。
- 头注释自述「由 `scripts/gen-wake-assets.mjs` 机器生成（逐字 `JSON.stringify`），禁止手工改词」（`:8-10`）。不是 JSON、不是手写、不是包内 `.html`。
- 老事实源在仓外：`D:\2Study\StudyNotes\SKILLS\饼干记账\饼干记账.html` 的 `<script id="help-data">`（生成器 `:3-5,25,27`）。
- HELP 页壳不在本包：`src/render/helpFile.ts:19` 用共享件 `base-paint/help-shell`；`templates/*.html`（15 个）是各命令渲染片段，不是 HELP 内容资产。
- 规模：7 域／20 二级组／74 场景 ＝ 老 71 条逐字 ＋ 生成器写死的 3 条新增（`scripts/gen-wake-assets.mjs:34-70`）。

## 2 生成器与摘要锁

- 生成器 `packages/skill-bill/scripts/gen-wake-assets.mjs`（254 行）。命令原文（`:8-10`）：`node packages/skill-bill/scripts/gen-wake-assets.mjs`＝落盘；加 `--check`＝只比对、不一致 exit 1（判定 `:231,246`）；`--src <老实物.html> --out <目标.ts>` 可换源与落点。
- 摘要锁：**有**，但在测试里不在生成器里——`test/wake-assets.test.mjs:14` 写死 `LEGACY_DIGEST=93099ecd345b85c65d69231c348fea663af40617a72509968e3829d6e2e108a0`（老 71 条 6 字段 sha256），断言 `:52`。
- 一等门：**无**。`build`（`package.json:32`）只跑 `tsc -b && node scripts/build-help.mjs`；生成器只挂 `gen:wake-assets`（`:33`）；事实源在仓外故「CI 不跑」（生成器 `:12-13`），仓内 `.github` 对 `gen-wake-assets` 零引用。

## 3 分组命名 ≠ 命令命名空间

- 一级域 id 原词（顺序被 `test/wake-assets.test.mjs:16` 钉住）：`write`（写入 ✏️ `:57-59`）、`query`（查询 🔍 `:242-244`）、`analysis`（分析 📊 `:437-439`）、`goal`（目标 🎯 `:736-738`）、`account`（账户 💳 `:795-797`）、`link`（联动 🔗 `:848-850`）、`setup`（开始使用 🚀 `:881-883`）。
- 二级组 id ＝`<域>_<序号>`、无语义：`write_1..3`、`query_1..3`、`analysis_1..7`、`goal_1..2`、`account_1`、`link_1`、`setup_1..3`（`:62-948`）。
- 命令命名空间（`src/policy/wakewords.ts:5-12`）：`bill.record.add|update|today|range|search|detail`、`bill.analysis.overview|compare|trend`、`bill.goal.write|query`、`bill.account.write|query`、`bill.link.submit`、`bill.setup.run`、`bill.help.lookup`。
- 对照：同词 5 个——`analysis`／`goal`／`account`／`link`／`setup`；对不上——域 `write` 命令侧无（命令按资源分 `record`）、域 `query` 命令侧无（散在 `bill.record.*`／`bill.goal.query`／`bill.account.query`／`bill.help.lookup`）；反向缺——命令段 `record`、`help` 在域词里没有。即域按「写/查」动作切、命令按「资源」切，无一比一映射。

## 4 速查与 HELP＝两份事实源（交叠处锁住）

- 速查：`buildHelpLookup()`（`src/help/lookup.ts:42-50`）读口径表 `WAKE_TABLE`（`src/policy/wakewords.ts:18-112`，77 短语），出 `{phrase,key,shape,cli,desc}`；desc 表 `lookup.ts:22-39`。
- HELP 页内容：`WAKE_GROUPS`（生成物）。链：`src/cli/cmd_read.ts:126` `renderHelpFileHtml(buildHelpFileData(now,…))` → `src/render/helpFile.ts:136` 组装 → `:154-156` 共享壳渲染；`groups` 直转资产 `:146`。
- 派生方向：HELP 页 `meta_blocks[help_wake_words]` ← `WAKE_TABLE`（`wake-assets.ts:984-986` → `helpFile.ts:112`）；SKILL.md 互联速查表 ← `buildHelpLookup()`（`scripts/build-help.mjs:12-19`，`test/skill.test.mjs:45-47` 锁逐字新鲜）。
- 形状差：速查无分组／无 `prompt_template`／有 `key`+`cli`；场景无 `key`／有 `title`+`status`+`prompt_template`+`types`；只见面于 `phrase` ↔ `wake_word`，由 `test/wake-assets.test.mjs:68-84` 双向对账（77＝4 HELP＋73，两边条条有落）。

## 5 门里锁了什么

- `package.json:34`：`test`＝`node --test test/*.test.mjs`，9 个文件（cli、fetch、policy、render、skill、wake-assets、help-delivery-144、help-exit-148、help-file-145）。
- `test/wake-assets.test.mjs`：`:52` 老 71 条 sha256 逐字锁（改一字即红）；`:26-32` 7 域顺序／20 组／74 场景／老 71＋新 3；`:68-84` 与 `WAKE_TABLE` 双向对账。
- `test/help-file-145.test.mjs`：`:27` `data.groups` 深等于 `WAKE_GROUPS`（HELP 页零改写直转）；`:48` 唤醒词块由口径层派生。
- `test/help-exit-148.test.mjs`：`:95-96` HTML 前后缀逐字等于共享壳；`:147` 速查表 77 条。
- 「生成物不被手改」：无 `--check` 用例，靠摘要锁兜底；摘要**只盖老 71 条**，新增 3 条不在锁内（`test/wake-assets.test.mjs:53-54`）。

## 6 照抄到居家会缺什么

1. 事实源：bill 的 71 条读仓外老实物 HTML；居家无同类 payload ⇒ 先定事实源（照抄生成器需有 `--src` 可读的源，否则改成「手写资产＋生成器只做序列化」）。
2. 生成器本体：`scripts/gen-wake-assets.mjs` 的 `EXPECT` 形状断言、`ADDED_SCENES` 增量段、`DEFAULT_SRC`/`DEFAULT_OUT` 全要照改。
3. 摘要锁：按居家新资产重算 `LEGACY_DIGEST`，并定锁覆盖范围（只锁老条目还是全量）。
4. 口径表：双向对账需等价的 `WAKE_TABLE`（短语→key）；`77＝4＋73` 一类断言要按居家域数改写。
5. 共享壳：HELP 页不是包内模板，靠 `base-paint/help-shell`（`helpFile.ts:19`）＋落盘 `base-paint/save-html`（`helpPaths.ts:8`）；本技能只出自己的值 `HELP_HTML_DIR_NAME`／两个文件名主体（`helpPaths.ts:16,20-24`）。
6. `types` 词表：老 5 词（采集／查看／选择／向导／回执，`wake-assets.ts:17-18,28`）必须已在共享壳 `TYPE_DEFAULT` 配色表内；居家出新词要先改壳。
7. 出口两支：`cmd_read.ts:104-136` 的 `mode`（速查产物）／`q`（现找）互斥＋两支分名落盘；居家要补等价分发。
8. 门：bill 把「生成物新鲜」交给测试摘要、CI 不跑 `--check`；居家若事实源在仓内，可把 `--check` 接进 build/CI（这一格 bill 是空的）。
