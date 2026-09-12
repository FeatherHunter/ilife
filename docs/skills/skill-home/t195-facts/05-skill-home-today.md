# skill-home 今天的真实形状（t195 取证·05）

取证方式：只读观察（glob／grep／定点读小文件），未改任何文件、未 `git add`／commit。时刻标记：当时 `git status --porcelain -- packages/skill-home` 为 ` M SKILL.md` 与 ` M package.json` 两件未提交改动。

## 1. `packages/skill-home/src/**`：21 件

```
src/
  index.ts                                    5 行
  cli/cmd_read.ts                           741 行
  fetch/   db.ts 434 · domains.ts 182 · errors.ts 22 · index.ts 16 · paths.ts 38
  help/    index.ts 2 · lookup.ts 56
  policy/  care.ts 12 · category.ts 46 · index.ts 8 · item.ts 68 · ticket.ts 24 · wakewords.ts 137
  render/  envelope.ts 54 · errors.ts 11 · html.ts 76 · index.ts 14 · templates.ts 68 · views.ts 77
```

| 件 | 一句话职责 | 导出名（逐个） |
|---|---|---|
| `src/index.ts` | 包入口，四条 star 转发 | 无自有符号：`* from './fetch/index.js'`、`'./policy/index.js'`、`'./render/index.js'`、`'./help/index.js'` |
| `src/cli/cmd_read.ts` | 唯一出口 CLI（bin `home-cmd-read`）：argv → envelope JSON(stdout) → exit | **零 export**（全文唯一 `export` 字样是 `:662` 的字符串字面 `'export'`，care kind 值） |
| `src/fetch/db.ts` | 开库建表（基础 5 表＋D1 9 域表＋8 顶级种子）、物品 CRUD、标签分类、密码加解密 | `SCHEMA_VERSION`、`HomeItem`、`HomeLocation`、`HomeDb`、`SearchFilter`、`openHomeDb`、`closeHomeDb`、`addItem`、`getItemById`、`listLocationsByItem`、`listTagsByItem`、`searchItems`、`updateItem`、`adjustQuantity`、`setLocationStatus`、`moveLocation`、`setItemTags`、`listAllTags`、`mergeTags`、`listCategories`、`getCategoryById`、`encryptPassword`、`decryptPassword`、`assertMasterKey` |
| `src/fetch/domains.ts` | 9 域表直连 SQL helper（盘点／位置／购物／票据／协作／统计） | `addInventoryRecord`、`listInventoryRecords`、`listLocationNodes`、`ensureLocationNode`、`listShopping`、`addShopping`、`checkShopping`、`missingItems`、`stockList`、`setThreshold`、`listPurchases`、`addPurchase`、`purchaseYearStats`、`listWarranties`、`addWarranty`、`addServiceEvent`、`listCerts`、`addCert`、`listAccounts`、`listMembers`、`addMember`、`listBorrows`、`addBorrow`、`statsOverview`、`highFreq`、`idleItems`、`expiringItems`（27 名） |
| `src/fetch/errors.ts` | 取数／口径两个错误类 | `HomeFetchError`、`HomePolicyError` |
| `src/fetch/index.ts` | 取数层 barrel | 转发 `HomeFetchError`、`HomePolicyError`、`SCHEMA_VERSION`、`openHomeDb`、`closeHomeDb`、`addItem`、`getItemById`、`listLocationsByItem`、`listTagsByItem`、`searchItems`、`updateItem`、`adjustQuantity`、`setLocationStatus`、`moveLocation`、`setItemTags`、`listAllTags`、`mergeTags`、`listCategories`、`getCategoryById`、`encryptPassword`、`decryptPassword`、`assertMasterKey`、type `HomeItem`／`HomeLocation`／`HomeDb`／`SearchFilter`、`resolveDbDir`、`resolveDbPath`、`assertWritablePath`、`DB_FILENAME`，以及 `domains.ts` 全部 27 名 |
| `src/fetch/paths.ts` | DB 路径解析与隔离守卫（`SKILLS_DB_PATH` 必设；非 tmp 写库须哨兵） | `DB_FILENAME`、`resolveDbDir`、`resolveDbPath`、`assertWritablePath` |
| `src/help/index.ts` | HELP 层 barrel（只转发 `lookup.ts`） | `buildHelpLookup`、`lookupHelp`、type `HelpHit` |
| `src/help/lookup.ts` | HELP 速查真身：`WAKE_TABLE` → 短语／key／cli／一句话 | `HelpHit`、`buildHelpLookup`、`lookupHelp` |
| `src/policy/care.ts` | 协作与运维口径（kind 白名单） | `CARE_QUERY_KINDS`、`CARE_WRITE_KINDS`、`parseCareKind` |
| `src/policy/category.ts` | 分类／位置／状态口径与食品判定 | `HOME_TOPS`、type `HomeTop`、`HOME_STATUSES`、`normalizeLocation`、`normalizeStatus`、`isFoodItem`、`validateCategoryName` |
| `src/policy/index.ts` | 口径层 barrel | 转发 `HOME_TOPS`、`HOME_STATUSES`、`normalizeLocation`、`normalizeStatus`、`isFoodItem`、`validateCategoryName`、type `HomeTop`、`validateAddInput`、`parseUpdateOp`、`needId`、`TICKET_KINDS`、`parseTicketKind`、`checkDate`、`checkMoney`、type `TicketKind`、`CARE_QUERY_KINDS`、`CARE_WRITE_KINDS`、`parseCareKind`、`WAKE_TABLE`、`DEPRECATED_PHRASES`、`routeWakeword`、type `HomeKey`／`WakeRoute`／`WakeEntry` |
| `src/policy/item.ts` | 物品增改校验（add 强校验、update op 分流、id 必填） | `validateAddInput`、`parseUpdateOp`、`needId` |
| `src/policy/ticket.ts` | 票据凭证口径（四种 kind、日期／金额校验） | `TICKET_KINDS`、type `TicketKind`、`parseTicketKind`、`checkDate`、`checkMoney` |
| `src/policy/wakewords.ts` | 唤醒词路由（最长匹配、废弃词不路由）；HELP 的唯一上游 | `HomeKey`、`WakeRoute`、`WakeEntry`、`WAKE_TABLE`、`DEPRECATED_PHRASES`、`routeWakeword` |
| `src/render/envelope.ts` | 21 联动 key × shape 映射与信封构建／解析 | `HOME_KEY_SHAPES`、`homeShapeFor`、`buildHomeEnvelope`、`parseHomeEnvelope` |
| `src/render/errors.ts` | 渲染层错误类 | `HomeRenderError` |
| `src/render/html.ts` | envelope → section HTML、转义、体积门、模板填充 | `HOME_HTML_MAX_BYTES`、`escapeHtml`、`renderEnvelopeHtml`、`estimateBytes`、`assertHtmlSize`、`SHARED_CSS_MARKER`、`SHARED_HELPERS_MARKER`、`CONTENT_MARKER`、`SHARED_CSS`、`SHARED_HELPERS`、`fillTemplate` |
| `src/render/index.ts` | 渲染层 barrel | 转发 `HomeRenderError`、`HOME_KEY_SHAPES`、`homeShapeFor`、`buildHomeEnvelope`、`parseHomeEnvelope`、`toItemCard`、`buildSearchList`、`buildDetail`、`buildReceipt`、`buildTagList`、`buildInventoryRecords`、`buildLocationList`、`buildOutfitList`、`buildStatsOverview`、`buildStatsAlert`、`buildShoppingList`、`buildTicketList`、`buildCareList`、`buildHelpItems`、type `ItemCard`／`HelpItem`、`HOME_HTML_MAX_BYTES`、`escapeHtml`、`renderEnvelopeHtml`、`estimateBytes`、`assertHtmlSize`、`SHARED_CSS_MARKER`、`SHARED_HELPERS_MARKER`、`CONTENT_MARKER`、`SHARED_CSS`、`SHARED_HELPERS`、`fillTemplate`、`HOME_TEMPLATES`、`templateFor`、`loadTemplate`、type `HomeTemplate` |
| `src/render/templates.ts` | 21 模板清单、key→模板映射、按名装载（未知／缺失大声失败） | `HOME_TEMPLATES`、type `HomeTemplate`、`templateFor`、`loadTemplate` |
| `src/render/views.ts` | DB 行 → 各 key 的 envelope data（含 HELP 现找） | `ItemCard`、`toItemCard`、`buildSearchList`、`buildDetail`、`buildReceipt`、`buildTagList`、`buildInventoryRecords`、`buildLocationList`、`buildOutfitList`、`buildStatsOverview`、`buildStatsAlert`、`buildShoppingList`、`buildTicketList`、`buildCareList`、`HelpItem`、`buildHelpItems` |

## 2. `home.help.lookup` 今天怎么走

- 唤醒词三条：`policy/wakewords.ts:21-23`（`居家管家 帮助`／`居家管家帮助`／`居家管家能做什么`）；`HomeKey` 联合含 `'home.help.lookup'`（`wakewords.ts:15`）。
- `help/index.ts:1-2`：只 re-export `buildHelpLookup`／`lookupHelp` 与类型 `HelpHit`，无自有逻辑。
- `help/lookup.ts`：`HelpHit { phrase, key, shape, cli, desc }`（`:5`）；`buildHelpLookup()`（`:43-51`）＝ `WAKE_TABLE.map(...)` 全量逐条，`shape` 取 `HOME_KEY_SHAPES[e.key] || '??'`，`cli` 由 `exampleParams()`（`:7-16`）按 `needs`／`preset` 补 `--params`；`DESCS` 21 条中文一句话（`:18-40`，含 `'home.help.lookup': 'HELP 现找（q 可空，不过滤即全表）'`）；`lookupHelp(hits, word)`（`:53-56`）＝空词返全表，否则 `word.includes(phrase) || phrase.includes(word.trim())`。
- 出口分派入口：`cli/cmd_read.ts:32` import；`dispatch()` 定义 `:54`，`:56` `openHomeDb`（help 也开库），`switch (key)` `:59`，`case 'home.help.lookup'` `:674-678`：取 `params.q`（字符串才用）→ `buildHelpLookup()` 映射后交 `buildHelpItems(all, q)`（`render/views.ts:74-77`，与 `lookupHelp` 是**两条独立实现**的同一过滤规则）；`default` 未知 key → `fail(3)` `:679`。
- shape 门：`main()` `:709` 先 `homeShapeFor(o.key)`；`'home.help.lookup': 'list'` 在 `render/envelope.ts:26`。
- HTML 支路：`:719-724` `fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(env))`；`templateFor` 的 `home.help.lookup → 'help'` 在 `render/templates.ts:55`；`loadTemplate` 在 `:62-67`。
- 构建期注入：`scripts/build-help.mjs:7,16` import `dist/help/index.js` 的 `buildHelpLookup()`，写 `SKILL.md` 的 `<!-- HELP-AUTO-START -->` 块。

## 3. `package.json`

- `scripts` 原文两条：`"build": "tsc -b && node scripts/build-help.mjs"`、`"test": "node --test ../../test/scaffold.test.mjs"`。
- `files` 原文三条：`"dist"`、`"SKILL.md"`、`"templates/*.html"`（`SKILL.md` 是本工作区新加的未提交行，见 §7）。
- 包内 test 脚本**盖不到**包内新用例。判据：`../../test/scaffold.test.mjs` 相对包目录解析为 `D:\ilife\test\scaffold.test.mjs`（14 行，仅 2 个 `it`：跑 `tooling/check-boundaries.mjs`、`tooling/write-snapshot.mjs --check`，cwd 取仓根）；`node --test` 只跑显式给出的文件路径，不做目录发现，故 `packages/skill-home/test/*.test.mjs` 五件一律不跑。要覆盖包内用例只能从仓根跑 `pnpm test`——仓根 `test` 脚本显式列了 `"packages/skill-home/test/*.test.mjs"`。另：包内用例 import `../dist/index.js`／`dist/cli/cmd_read.js`，须先 build。

## 4. `templates/help.html`

- 实物：16 行／约 0.3KB 的裸壳——`<title>居家管家 HELP</title>`、`<h1>居家管家 HELP</h1>`、`<p class="cmd">home-cmd-read home.help.lookup</p>`；三个未包裹标记 `<!--SHARED-CSS-->`（`:6`）、`<!--CONTENT-->`（`:12`）、`<!--SHARED-HELPERS-->`（`:14`）。`HOME_TEMPLATES:27` 里有 `'help'`（清单共 21 件）。
- 谁读它：只有 `src/render/templates.ts` 的 `loadTemplate(name)`（`:62-67`，读 `templates/<name>.html`），经 `:55` 的 `templateFor('home.help.lookup') → 'help'`；生产调用点在 `src/cli/cmd_read.ts:721`，且仅当命令行给了 `--html <路径>`。
- `src/render/**` 今天用它做什么：**只做填充，不做 help 专属分支**——`fillTemplate()`（`render/html.ts:66`，标记常量 `:59-61`、`SHARED_CSS:63`、`SHARED_HELPERS:64`）把 `renderEnvelopeHtml()`（`:27`）产出的 section 注入 `<!--CONTENT-->`，再 `assertHtmlSize()`（`:52`，上限 `HOME_HTML_MAX_BYTES = 256*1024`，`:6`）。
- 仓内其它引用点：`tooling/skill-html-snapshot.mjs`（`:46` 有 `skill-home`／前缀 `HOME` 条目、`:137` 源路径 `packages/<dir>/templates/<n>.html`、`:177` 逐件入库）＋快照实物 `tooling/skill-html.snapshot.json`（home 21 条模板条目，含 `packages/skill-home/templates/help.html`）；`packages/skill-home/test/render.test.mjs:67-85` 经 `loadTemplate(templateFor(key))` 间接读全部 21 件（含 help），断言各件三标记恰 1 次且含 `home-cmd-read`。

## 5. `SKILL.md` 现状（我读到的时刻）

- **有** YAML frontmatter（`:1-5`）：`name: skill-home`、`description: "…"`（含触发词串）、`help_wake_word: "居家管家 帮助"`。
- 一级标题只有 1 个：`# 居家管家（home）SKILL`（`:7`）。二级标题 4 个：`## 快速开始`（`:11`）、`## 口径`（`:19`）、`## 联动速查（构建期注入，勿手改）`（`:28`）、`## 环境与出 scope`（`:128`）。
- 说明面结构：定位段（家庭物品全生命周期＋唯一出口 argv+JSON+exit，`:9`）→ 快速开始 3 条命令（`:13-17`）→ 口径 6 条（分类／位置与状态／账号加密／折入项／废弃词／坏输入阻断，`:21-26`）→ `<!-- HELP-AUTO-START -->`…`<!-- HELP-AUTO-END -->` 自动块（`:30-126`，88 行短语表＋21 键「相关场景」行）→ 环境与出 scope 2 条（`:130-131`）。全文 131 行／12,979 B。
- ⚠️ 另一子代理正在改它：**我读到的是某一时刻的快照，最终内容可能不同**；当时 `git diff` 只显示 +6 行（即 frontmatter 整段），正文与 HEAD 一致。

## 6. `test/**`：5 件

| 文件（行数） | 测什么 |
|---|---|
| `cli.test.mjs`（113） | 黑盒 spawn `dist/cli/cmd_read.js`，21 键端到端（含 `home.help.lookup` 全表 `total>=88` 与 `q` 现找命中 search），并验退出码 3／2／1、stdout 纯净、`--html` 落盘含 `<section`。 |
| `fetch.test.mjs`（48） | tmp 隔离开库：8 顶级种子、增查闭环、查无对条大声失败、非 tmp 写库守卫 `HOME_FORCE_PROD`、标签合并、账号加解密与 master-key 门。 |
| `policy.test.mjs`（45） | 位置两级／11 状态／食品判定、`add` 强校验与 update op 分流、唤醒词最长匹配＋废弃词无命中＋缺槽位、错误皆为 `HomePolicyError`。 |
| `render.test.mjs`（100） | 21 键 shape 分配、全字段 envelope 往返、看密码脱敏／体积门／转义、21 件模板三标记与填充、`analysis`／`fallback` 直调降级分支、`toItemCard` 装配。 |
| `skill.test.mjs`（45） | SKILL.md 含出口／口径／出 scope／标记块；速查条数＝`WAKE_TABLE` 且每条可路由回同 key；互联区与 `buildHelpBlock()` 归一化后一致；废弃词不进速查。 |

## 7. 中间态／不确定（逐条）

1. **并发改动**：`SKILL.md` 与 `package.json` 在工作区为 modified（未提交）。SKILL.md 的 frontmatter 6 行是工作区新加；另一子代理正在改它，§5 的实际标题／结构可能与最终不同。
2. `package.json` 的 `files` 里 `SKILL.md` 条目是本工作区新加（`git diff` +1 行），HEAD 版本里没有它——发布面今天是否含 SKILL.md，取决于该改动是否落地。
3. `docs/skills/skill-home/t195-facts/` 在我两次列目录间从「只有 `03-bill-recipe.md`」变为「`03`／`04`／`06` 三件」，说明有并发写入；本文件是其中的 `05`。
4. 包内所有测试 import `dist/**`，本次**未**逐件比对 `dist` 与 `src` 是否同步；若 src 已改而 dist 未 build，测试结论与 src 现状会不一致。
5. 行号来源：`cmd_read.ts` 只读了 `:1-40` 与 `:660-727` 两段（按纪律未读整份），中间行号来自 grep，故 `cmd_read.ts` 的「段内行号」可靠、未读段的细节未核。行数为文本文件总行数（`read` 工具口径）；字节数为文件大小。
