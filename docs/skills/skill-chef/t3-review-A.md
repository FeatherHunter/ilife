# t3 对抗式审查（A：契约断言核对员）

审查日期 2026-09-12（只读审查：未改任何源码、未 `git add`／`commit`／`checkout`／`stash`、未跑 `gen:help-shell`、未跑仓级 build／test；全部证据来自 `Get-Content`／`Select-String`／`git show`／`git log -S`／`node` 纯计算；**未联网**）。
被审件：`docs/skills/skill-chef/t3-template-contract.md`（475 行／61,994 B）。
我的实验件：`D:\ilife\.scratch\chef-help\t3-review-A\`（见 §八）。

## 判定

- **总分：8/10**
- **一句话结论**：第一要害（仓内两套 help 渲染、本图只走 A 路、两个邻居都走 A 路）**成立**；§1.4 老家注入器 15 行硬校验逐字属实；§4.2 的 33／48／10 域计数我自己复点**完全一致**；三条硬事实（boundaries／exports／两个 commit）**全对**；但 §1.5 用了**没有分辨力的哨兵法**去证「读了不渲染」，并因此把 `recommendations` 也判成「声明即死」——**这一条是硬伤**（模板 `:1819-1825` 真渲染它）。另有 6 处行号／事实小错。
- **证伪条数：1 条硬伤**（`recommendations` 读了不渲染）＋ **5 处行号／事实错误** ＋ **1 处方法学缺陷**（哨兵法无分辨力）。

## 一、逐项核对结果

| # | 报告的原话（带行号） | 我的独立证据（命令＋输出） | 判定 | 若错会怎么害票 6 |
| --- | --- | --- | --- | --- |
| 1.1 | 「本图要的是 **A 路** —— 真相源 `assets/help-template.html`（2053 行）→ 生成器 `scripts/gen-help-shell.cjs` → 生成物 `src/helpShell.ts`」（`:12`、`:39-42`） | `Get-Item`＝106,968 B；`(Get-Content).Count`＝2053；`src/helpShell.ts`＝116,173 B；`gen-help-shell.cjs:15-17` `SRC_HTML／OUT_SRC／OUT_TEST`、`:296-297` 两条 `writeFileSync` | **证实** | — |
| 1.2 | 「B 路 `packages/base-render/src/help.ts` 入口 `renderHelpShell(input: HelpShellInput)`（`src/help.ts:675`，`src/index.ts:40` 导出）」（`:29`） | `help.ts:675` `export function renderHelpShell(input: HelpShellInput): FillTemplateOutput {`；`index.ts:40` `export { renderHelpShell } from './help.js';` | **证实** | — |
| 1.3 | 「两套的字段读法不同……B 路真渲染 `meta_blocks`／`subtitle`」（`:31`） | `help.ts:403` `/** 标题区（…`subtitle` 必须渲染，F3 读而不渲染属缺陷）。 */`、`:408-409` 真拼 `parts.push('<p class="' + cls('subtitle')…`；`:596` `function renderMetaBlocks`、`:653-655` 真挂载 | **证实** | — |
| 1.4 | 「文档标题拼法也不同（B 路是 `title · skill_name` 方向，`src/help.ts:611-614`）」（`:31`） | `help.ts:614` `return data.title + ' · ' + data.skill_name;` | **证实** | — |
| 1.5 | `packages/base-render/package.json` 的 `./help-shell`「`:11` `"./help-shell": "./dist/helpShell.js"`」（`:369`） | 逐字：`:8-13` `"exports": { ".": "./dist/index.js", "./blocks": "./dist/blocks.js", "./help-shell": "./dist/helpShell.js", "./package.json": "./package.json" }`；`:3` `"version": "0.3.0"` | **证实（逐字一致）** | — |
| 1.6 | 「消费者：记账（`skill-bill/src/render/helpFile.ts:19,152`）、卡路里（`skill-calorie/src/render/helpFile.ts:23,72`）」（`:28`） | bill `:19` `import { renderHelpShellHtml } from 'base-paint/help-shell';`、`:152` `return renderHelpShellHtml(data);`；calorie `:23` `import { renderHelpShellHtml } from './helpShell.js';`、`:72` 同 | **证实（但证据链少一环，见 §三）** | 不影响施工；但「卡路里直连 A 路」是错的，实际隔了一层本仓 deprecated 垫片 |
| 1.7 | 「卡路里速查台（`skill-calorie/src/render/helpCenter.ts:481`）」走 B 路（`:29`） | `helpCenter.ts:481` `const output = renderHelpShell({ sceneData, assets, strict: opts.strict === true });` | **证实** | — |
| 1.8 | 「`docs/skills/skill-home/t186-template-contract.md:9` 是同一件事的先例报告，结论与本报告一致」（`:33`） | 该行原文：`\| A · 老实物 help 模板 … \| \`base-paint/help-shell\` 的 \`renderHelpShellHtml\` \| ✅ **就走这条** \|` | **证实** | — |
| 2.1 | 「`renderHelpShellHtml`＝PREFIX＋`JSON.stringify(data)`（`<`→`\u003c`）＋SUFFIX（`src/helpShell.ts:73-80`）」（`:13`） | `helpShell.ts:73-80` 逐字一致；`:77` `const json = JSON.stringify(data).replace(/</g, '\\u003c');` | **证实** | — |
| 2.2 | 「页面侧 `var HELP = JSON.parse(document.getElementById('help-data').textContent)`（`help-template.html:1647`）」（`:13`） | `Select-String 'help-data'` → `L190`（容器开标签）、`L1647`（读取）、`L194`（GEN 注释）；`:1647` 原文逐字一致 | **证实** | — |
| 2.3 | 「注入锚点 `src/helpShell.ts:48`；真相源对应行 `help-template.html:190`」（`:73`） | `helpShell.ts:48` `export const HELP_SHELL_DATA_OPEN = "<script id=\"help-data\" type=\"application/json\">" as const;`；`help-template.html:190` 同一字面量＋3 条 `<!--SLOT:…-->` 注释 | **证实** | — |
| 2.4 | 「老家……是 `window.__HELP__`（`render_help.py:132`）」（`:13`） | `...\私家大厨\scripts\render_help.py`（276 行）`:132` `script_tag = f'<script>window.__HELP__ = {payload_json};</script>'`；模板 `help-template.html` 全文 `window.__HELP__` **0 次** | **证实** | — |
| 3.1 | 「类型面（5 项）：`src/helpShell.ts:22-28`」（`:14`、`:62-71`） | `helpShell.ts:22-28` 逐字：`skill_name`／`title`／`subtitle`／`contact: unknown`／`groups: readonly unknown[]` | **证实** | — |
| 3.2 | 「运行时另读 4 项（`meta_blocks`／`init_banner`／`version`／`recommendations`，`help-template.html:1651-1656`）」（`:14`） | `:1651` `HELP.meta_blocks`、`:1652` `HELP.init_banner`、`:1654` `HELP.version`、`:1656` `HELP.recommendations`——行号与字段名逐条属实；`HELP.*` 读取位共 **9** 个（含 `:1648/:1649/:1653` 与 `:1675` 的 `HELP.groups`） | **证实** | — |
| 3.3 | 「`meta_blocks` 在 A 路**不渲染**（声明即死），全文只出现 1 次＝声明处」（`:15`、`:161-162`、`:413`） | 大小写敏感计数：`META_BLOCKS` **1** 次／1 行（只在 `:1651` 声明）；可达性扫描 `RENDERED=false`；老文档 `公共组件/docs/scene-data-contract.md:116` 原文「Base 当前不渲染展示 meta_blocks」 | **证实** | — |
| 3.4 | 「`subtitle` 在 A 路**不渲染**（全模板仅 1 次引用＝声明处）」（`:148`、`:465`） | 大小写敏感：`SUBTITLE` **1** 次／1 行（`:1650` 声明，此后零引用）；大小写不敏感的第 2 行是 `:1775` 的 `INIT_BANNER.subtitle`（另一个字段）；可达性扫描 `RENDERED=false` | **证实** | — |
| 3.5 | 「`recommendations` 在 A 路**不渲染**（各自全文只出现 1 次＝声明处）」（`:15`、`:413`、`:465` 语境） | 大小写敏感：`RECOMMENDATIONS` **4 次／3 行**——`:1656` 声明、`:1819` `if (RECOMMENDATIONS && RECOMMENDATIONS.length) {`、`:1821` `RECOMMENDATIONS.forEach(function(r){`；`:1820`／`:1822` 把 `esc(r.name)`／`esc(r.desc)`／`esc(r.wake)` 拼进 `h`，`:1834` `screen.innerHTML = h` | **证伪（硬伤）** | 票 6 会把它当「透传位」而不当「关于 Tab 第三段」，要么漏做要么照抄结论写错注释；见 §四 |
| 3.6 | 「`init_banner` 判据原文 `(INIT_BANNER && !INIT_BANNER.hidden ? …`（`help-template.html:1775`）」；缺省／`hidden:true` 不显示（`:176-180`） | `:1775` 原文逐字一致；进了分支不再判子字段（`esc(undefined)`→空串）；`:1776` `steps` 读 `st.title`／`st.desc` | **证实** | — |
| 3.7 | 「`init_banner.steps` 模板读对象数组 vs `src/spec/help.ts:73` `readonly string[]`」（`:133`） | `spec/help.ts:73` `readonly steps?: readonly string[];`；模板 `:1776` `esc(st.title)`／`esc(st.desc)` | **证实** | — |
| 3.8 | 「`recommendations` 类型面 `{name, reason?, wake_word?}`（`src/spec/help.ts:86-90`）vs 模板 `:1821-1822` 读 `r.name`／`r.desc`／`r.wake`」（`:134`） | `spec/help.ts:86-90` 逐字；模板 `:1822` 逐字 | **证实（但结论 3.5 又说它不渲染，自相矛盾）** | — |
| 4.1 | 「老家 `injector.py:144` `seen = set()`；group `:148-150` 与 scene `:170-172` **同一集合**；subgroup id 不进该集合」（`:100`、`:108`、`:468`） | `D:\2Study\StudyNotes\SKILLS\公共组件\injector.py`（309 行）：`:144` `seen = set()`（建在 `:145` 组循环之前）；`:148-150` `if g['id'] in seen … seen.add(g['id'])`；`:170-172` `if s['id'] in seen … seen.add(s['id'])`；`:155-156` 只查 `sg.get('label')`，`id` 不查不加入 | **证实（逐字）** | — |
| 4.2 | §1.4 表 15 行的原文与判据（`:96-110`） | 逐行比对 `injector.py:127／136-137／138-140／141-143／144／146-147／148-150／151-153／155-156／157-159／163-166／167-169／170-172／173-179／180`——**15 行全对** | **证实** | — |
| 4.3 | 「老注入器那套硬校验在新仓 A 路**没有实现**」（`:88`） | 搜索式 `Select-String -Pattern 'duplicate\|new Set\|重复\|唯一\|seen'` 于 `gen-help-shell.cjs`（7 命中，唯一 `new Set()` 在 `:49 const pts = new Set();`＝纯度切分点集合，与 id 无关）／`help-template.html`（3 命中，全是「唯一真相源」文案）／`helpShell.ts`（4 命中，全是注释）；`renderHelpShellHtml` 只查 `groups` 非空（`:74-76`） | **证实** | — |
| 4.4 | 模板侧错法：「`:1691` `ALL.push(s); SCENE[s.id] = s;`（重名后者覆盖前者）、`:1782` `data-page` 与 `:1830` `data-nav` 同名即两 Tab 指同页」（`:88`） | `:1691`／`:1782`／`:1830` 三行原文逐字属实；`:1686` `var SCENE = {};` 无去重；`:1781-1797` 无 id 唯一性判断 | **证实** | — |
| 5.1 | 「`tooling/check-boundaries.mjs:37` `const SKILLS_BASE_FROZEN = ['skill-chef', 'skill-home', 'skill-schedule', 'skill-memo-ilife'];`」（`:349`、`:472`） | `:37` 逐字一致（含 `'skill-chef'`） | **证实（逐字）** | — |
| 5.2 | 「两半断言同源派生：`:39-44` 依赖闭包 ∩ `BASE_RUNTIME`（`:38`）；`:45-60` `SRC_RE` 扫 `src/**/*.ts` 与 `templates/*.html`」（`:352-360`、`:472`） | `:38` `const BASE_RUNTIME = new Set(['base-paint', 'base-render']); // 目录名／包名两种写法都算`；`:39-44` `for (const name of SKILLS_BASE_FROZEN) … assert(hit.length === 0, …)`；`:45` `SRC_RE` 逐字；`:56-58` `SRC_SCAN`（`walkSrc(packages/<n>/src)` ＋ `readdirSync(packages/<n>/templates)`）；`:60` `assert(srcHit.length === 0, …)` | **证实** | — |
| 5.3 | 「`packages/base-render/package.json:3` `"version": "0.3.0"`，`:11` `"./help-shell": "./dist/helpShell.js"`」（`:369`、`:473`） | 逐字（见 1.5） | **证实（逐字）** | — |
| 5.4 | 「`git show 3e46ab0:packages/base-render/package.json` 当时 exports 无 `./help-shell`；`21ef322` 才加进来；`7a114b3` 随后又动版本」（`:371`） | 实跑三条 git 命令，输出见 §五 | **证实（逐字）** | — |
| 5.5 | 「`packages/skill-chef/package.json` 现在 `dependencies` 只有 `base-link-core: ^0.3.0`（`:24-26`）」（`:364`） | `:24-26` `"dependencies": { "base-link-core": "^0.3.0" }` | **证实** | — |
| 5.6 | 「`packages/skill-chef/package.json:4` 的 `0.1.0`」（`:170`、`:299`） | 实际在 **`:3`**（`:4` 是 `description`） | **证伪（行号错）** | 极低——但坐实「引号内行号未逐条复读」 |
| 5.7 | 「`pnpm-lock.yaml:132-134` 记 `base-paint: specifier ^0.3.0 → version link:../base-render`」（`:370`） | 实际在 **`:136-138`**（`:132-134` 是 `dependencies:` ＋ `base-link-core`）；`:136-138` 原文 `base-paint: / specifier: ^0.3.0 / version: link:../base-render` | **证伪（行号错）** | 低 |
| 5.8 | 「`packages/skill-chef/templates/` 存在（8 个 html 碎片，`templates/help.html` 是 266 B 的通用文档页碎片，用 `<!--CONTENT-->`＋`<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`，不命中 `SRC_RE`）」（`:365`） | 目录实有 8 个 html；`help.html`＝266 B，内容含 `<!--SHARED-CSS-->`／`<!--CONTENT-->`／`<!--SHARED-HELPERS-->`；用 `SRC_RE` 实测 8 个 html **全不命中**，`src/**/*.ts` **0 命中** | **证实** | — |
| 6.1 | §1.5「`docs/scene-data-contract.md:1` 顶层表只有 5 个字段」（`:132`） | 该文件在 `D:\2Study\StudyNotes\SKILLS\公共组件\docs\scene-data-contract.md`（报告全文未写 `公共组件/` 前缀）；顶层表在 **`:23-29`**，`:1` 是标题 `# 统一 scene_data 契约 v1` | **证伪（行号错＋路径不全）** | 低（结论对：确实 5 个字段） |
| 6.2 | §1.5「模板运行时读 9 个（**多出** `meta_blocks`／`init_banner`／`version`／`recommendations`）」（`:132`） | 老文档顶层表 `:25-29` 已列 `skill_name`／`title`／`subtitle`／`meta_blocks`／`groups`——**`meta_blocks` 不是「多出来」的那个**；真正未收录的是 `contact`／`init_banner`／`version`／`recommendations`（与报告自己的 §1.5 第 7 行「contact 文档未收录」矛盾） | **证伪（事实错）** | 中低——票 6 若照此对文档，会去"补 meta_blocks"（不该补） |
| 6.3 | §6.1「替换值过 `escapeTitleText`（**五字符** `& < > "`，生成物 `:54-56`）」（`:291`） | `helpShell.ts:54-56` 只替换 **4** 个字符：`&`／`<`／`>`／`"`——**没有** `'`；五字符是页面侧 `esc()`（`help-template.html:1696` `[&<>"']`） | **证伪（事实错）** | 极低（标题进 `<title>` 文本，`'` 不转义无实际影响） |
| 6.4 | §1.3「单测 `:243` 断言」（`:61`） | 生成的 `test/help-shell-136.test.mjs` 只有 **65 行**，该断言在 `:34`；`gen-help-shell.cjs:243` 才是它的发射处 | **无法判定（引号所指不明）** | 极低——但「单测 `:243`」写法会让票 6 去翻一个不存在的行 |
| 7.1 | §4.2「顶层组 **33**、展开场景 **48**、`scene_id` 无重号、33 组卡数之和＝48」（`:207`） | 我自写 `probe_yaml_indep.py` 独立复点：`group_count 33`／`scene_count_flat 48`／`dup_ids []` | **证实** | — |
| 7.2 | §4.2「目录名给出 **10** 个域：做菜 5／查看 8／搜索筛选 13／修改 4／历史 4／采购 1／录入 6／派生 3／开始使用 1／数据管理 3＝48」（`:208`） | 独立复点：`domains {做菜:5, 查看:8, 搜索筛选:13, 修改:4, 历史:4, 采购:1, 录入:6, 派生:3, 开始使用:1, 数据管理:3}`、`domain_count 10`、合计 48 | **证实（逐值一致）** | — |
| 7.3 | §4.2 ⚠️「18 条路径里只有 10 条在磁盘上存在；做菜／查看／采购／数据管理这 4 个"域"不是目录；另有两处路径在磁盘上不存在（`历史/data_view_timeline.html`、`历史/data_view_dashboard.html`）」（`:212`） | 独立复点：`distinct_template_paths 18`、`exists_as_written 10`、`not_found_anywhere ['历史/data_view_dashboard.html','历史/data_view_timeline.html']`、`not_a_dir_prefix` 恰为 做菜／查看／采购／数据管理 下的 6 条 | **证实（逐条一致）** | — |
| 7.4 | §4.2「`domain` 字段只覆盖 13/48，取值 8 种，与目录名反推不一致」；`meta.version 0.1.0`、`contact_anywhere false`（`:211`、`:453`） | `meta {skill:私家大厨, version:0.1.0, generated_at:2026-07-27, help_wake_word:私家大厨 HELP}` 独立复点一致；`scenarios.yaml`（897 行）全文 `contact` 0 命中 | **证实** | — |
| 7.5 | §6.5「老 chef 模板 `templates/help.html:11` generator 写死日期；`:12` `<title>私家大厨 HELP · 能力速查</title>`；`:206` `<h1>🍳 私家大厨 HELP</h1>`」（`:293`、`:338`） | 逐行原文一致；`:209` `🔖 v<span id="version">`、`:326` `DATA.meta?.version \|\| '?'` 亦一致 | **证实** | — |
| 7.6 | §6.5「老权威共享模板 `SKILLS\公共组件\assets\help_template.html:6` 写死 `<title>HELP 原型 · V4 三级目录版</title>`」（`:337`） | 该文件 `:6` 原文逐字一致 | **证实** | — |
| 7.7 | §6.3「老 `scripts/render_help.py`（276 行）全文无 `init_banner`／无 `_is_initialized`／无横幅；老模板也无横幅」（`:181`、`:304`） | `私家大厨/scripts/render_help.py`＝**276** 行，`Select-String 'init_banner\|_is_initialized\|横幅\|banner'` **0 命中**；`templates/help.html`（524 行）同样 0 命中；反之 `饼干记账/scripts/render_help.py:91` 确有 `def _is_initialized()`、`:221-224` 确有 `contract["init_banner"]` | **证实** | — |
| 7.8 | §6.3「`packages/skill-chef/src/fetch/paths.ts:20-23` 光算路径就建目录；`DB_FILENAME = 'chef_data.db'`（`:7`）」（`:314-321`） | `:7` `export const DB_FILENAME = 'chef_data.db';`；`:20-23` `resolveDbPath` 内 `mkdirSync(dir, { recursive: true })` | **证实（逐字）** | — |
| 7.9 | §6.3「`db.ts:166-189` `openChefDb` 会 `new DatabaseSync(dbPath)`（`:171`）、`PRAGMA journal_mode=WAL`（`:175`）、跑全量 DDL（`:182`）、`initialized = !existed`（`:177-183`）」（`:322-324`） | 五行原文逐字一致；`DDL` 数组 `:50-96` | **证实** | — |
| 7.10 | §6.3「`cmd_read.ts:98-99` 在 `dispatch()` 里、`switch` **之前**就 `resolveDbPath()`＋`openChefDb()`；`chef.help.lookup` 分支在 `:327-331`」；`preflight()` `:39-45`（`:323`） | `:97-102` 逐字；`:327-331` `case 'chef.help.lookup': { const all = buildHelpLookup(); … }`；`:39-45` `preflight()` 内 `:43` `if (!p) fail(1, 'SKILLS_DB_PATH 未设置…')` | **证实** | — |
| 7.11 | §5「记账 `helpFile.ts:99-111` 一处算两处用`（`:141`／`:144`）；`HELP_WAKE_WORDS` 在 `wake-assets.ts:980-986`（4 条，不进场景目录）」（`:234-266`） | `:137-147` 逐字：`subtitle: summaryLine`（`:141`）、`meta_blocks: buildMetaBlocks(summaryLine)`（`:144`）、`version: HELP_FILE_VERSION`（`:145`）；`wake-assets.ts:980-986` 逐字（`:985` `filter((e) => e.key === 'bill.help.lookup')`，注释写「4 条」） | **证实** | — |
| 7.12 | §5「记账 `helpFile.ts:46-53` 三项含 qq 邮箱；卡路里 `helpCenter.ts:141-146` 两项仅 GitHub＋Issues」（`:149`、`:330`） | bill `:46-53` 逐字（邮箱 `975559549@qq.com`＋GitHub＋Issues，`copy_all: true`）；calorie `helpCenter.ts:141-146` 逐字（GitHub＋Issues，无邮箱） | **证实** | — |
| 7.13 | §1.4／§8「chef `wakewords.ts:12-16` 里 `key === 'chef.help.lookup'` 恰 **4** 条」；全表 37 条；`lookup.ts:27` 注释写「help.lookup4」（`:269`） | `wakewords.ts:2` 注释「37 条 = help4 + …」；`:13-16` 恰 4 条 `chef.help.lookup`（`私家大厨HELP`／`菜谱HELP`／`查帮助`／`能做什么`）；`lookup.ts:27` 注释含「help.lookup4」 | **证实** | — |
| 7.14 | §4.3 甲「卡路里先例是运行期按 `subfunction` 派生二级组（`helpCenter.ts:201-210`），组 id 通式 `group.id + '_' + 序号`（`:206`）；空组剔除 `:263`」（`:218`） | `:201-210` `const push = (scene, category, subfunction) => { … }`；`:206` `subgroup = { id: group.id + '_' + (group.subgroups.length + 1), … }`；`:263` `const rendered: SceneGroup[] = groups.filter((group) => group.subgroups.length > 0);` | **证实（三处行号全对）** | — |
| 7.15 | §6.5「`私家大厨.html`（63,901 B，`<title>私家大厨 — 使用手册</title>`）」（`:341`） | `Get-Item`＝63,901 B；`:6` `<title>私家大厨 — 使用手册</title>` | **证实** | — |
| 8.1 | 用词纪律（`docs/agents/wording.md`：「壳」→ 一律写 help 模板） | 全文 `Select-String '壳'` **0 命中** | **证实** | — |

## 二、证伪与硬伤（最重要）

### 硬伤 ①（唯一实质错误）：`recommendations` 在 A 路**真渲染**，报告判成「声明即死」

报告四处这么写：

- `:15` 结论摘要 4：「**`meta_blocks`／`subtitle`／`recommendations` 在 A 路不渲染**（各自全文只出现 1 次＝声明处）」
- `:413` §八 A：「`subtitle`／`meta_blocks`／`recommendations` 在 A 路读了不用」
- `:465` 自检 2（抽查 β）把 `subtitle`／`meta_blocks` 与 `recommendations` 并列
- `:185` §3.4 —— **这一处是对的**：「渲染落点：关于 Tab 第三段「其他技能」（`:1819-1825`），`name`＋`desc`＋`wake` 徽章；不给整段不出现。」

**反例（逐字源码，`packages/base-render/assets/help-template.html`）**：

```js
1656: var RECOMMENDATIONS = HELP.recommendations || [];
...
1819: if (RECOMMENDATIONS && RECOMMENDATIONS.length) {
1820:   h += '<div class="about-sec">… 其他技能</div><div class="as-body">';
1821:   RECOMMENDATIONS.forEach(function(r){
1822:     h += '<div class="about-row">…<b>' + esc(r.name) + '</b><span>' + esc(r.desc) + '</span></div>' + (r.wake ? '<span class="a-badge">' + esc(r.wake) + '</span>' : '') + '</div>';
1823:   });
1824:   h += '</div></div>';
1825: }
...
1834: screen.innerHTML = h;
```

`RECOMMENDATIONS` 大小写敏感计数＝**4 次／3 行**（`:1656`／`:1819` 两次／`:1821`），不是 1 次；`:1819-1825` 整块把值拼进 `h`，`h` 在 `:1834` 写进 `#screen`。我的可达性探针 `probe_reachability.mjs` 判定 `RECOMMENDATIONS RENDERED=true`。

**报告自己也没统一**：§3.4 与 §八 B.6（「传（须照 A 路三个名 `name/desc/wake`）／不传」）是对的，结论摘要／§1.5／§八 A 是错的。**票 6 读的是摘要**——这会把「关于 Tab 第三段」误当「载荷透传位」。

**害处**：票 6 若照摘要判 `recommendations` 为「读了不显示」，最可能的动作是「不传」（这恰好也是两个邻居的现状，风险有限）；真正的害处是**结论自相矛盾**——同一份施工图里 §3.4 与 §1.5 打架，票 6 无法据此下判断，只能回头重查，等于施工图在这三块上作废。

### 方法学缺陷（硬伤 ①的成因）：哨兵法对「渲染与否」**没有分辨力**

报告 §1.5 的判据是「19 个哨兵在**静态段全部 0 次**，只在 `help-data` 的 JSON 段各 1 次」。但 A 路的正文**全部由页面侧 JS 拼**——`help-template.html:171` 静态段里只有 `<div class="screen" id="screen"></div>`（空容器），正文在 `:1834` 由 `screen.innerHTML = h` 落地。故**任何**注入值都不可能出现在静态段文本里，唯一的例外是经 `composeDocTitle` 服务端插值的 `<title>`。

**用报告自己的探针输出即可反证**（`.scratch/chef-help/t3/probe_render.stdout.txt`）：`CONTACT-LABEL-SENTINEL` 静态段 **0** 次、`GROUP-LABEL-SENTINEL` 静态段 **0** 次——而 `contact` 与 `groups` 是**铁定渲染**的（`:1801-1815`、`:1781-1797`）。我的 `probe_three_blocks.mjs` 把这一现象在全部 8 个键上复现：除 `skill_name`／`title`（进 `<title>`）外，**所有**键的哨兵在静态段都是 0，无论它渲染与否。

⇒ 「静态段 0 次」只能证明「不是服务端插值」，不能证明「不渲染」。报告据此把 `recommendations` 判错，正是这个方法的必然风险。`meta_blocks`／`subtitle` 的结论之所以仍然对，是因为报告**另外**做了一次变量名计数（自检 2），但那次计数在 `RECOMMENDATIONS` 上得出了错误数字「1」。

### 硬伤②（次一级，事实）：§1.5 第 3 行把 `meta_blocks` 说成「文档未列」

报告 `:132`：「`docs/scene-data-contract.md:1` 顶层表只有 5 个字段 ｜ 模板运行时读 9 个（**多出** `meta_blocks`／`init_banner`／`version`／`recommendations`）」。

老文档顶层表在 `公共组件/docs/scene-data-contract.md:23-29`，逐行是 `skill_name`／`title`／`subtitle`／`meta_blocks`／`groups`——**`meta_blocks` 已在表内**。真未收录的是 `contact`／`init_banner`／`version`／`recommendations`。这与报告自己的 §1.5 第 7 行（「`contact` … 文档未收录」，`:136`）直接矛盾；且 §1.5 第 2 行（`:131`）还引用了同一份文档的 `:116`——说明报告读过这份文档，只是这一行的对照对象写错了。

### 小错 ③④⑤⑥（行号／事实，逐个给反例）

| # | 报告写 | 实际 |
| --- | --- | --- |
| ③ | `packages/skill-chef/package.json:4` 的 `0.1.0`（`:170`、`:299`） | `:3` 是 `"version": "0.1.0"`；`:4` 是 `description` |
| ④ | `pnpm-lock.yaml:132-134` 记 `base-paint…link:../base-render`（`:370`） | 实际 `:136-138`（`:132-134` 是 `dependencies:` ＋ `base-link-core`） |
| ⑤ | `docs/scene-data-contract.md:1`（`:132`） | 该文件在 `SKILLS\公共组件\docs\`（全文未写 `公共组件/`）；顶层表在 `:23-29` |
| ⑥ | `escapeTitleText`「**五字符** `& < > "`」（`:291`） | `helpShell.ts:54-56` 只替换 **4** 个（`&`／`<`／`>`／`"`），**不转义 `'`**；五字符是页面侧 `esc()`（`:1696` `[&<>"']`） |
| ⑦ | 「单测 `:243` 断言」（`:61`） | `test/help-shell-136.test.mjs` 只有 65 行，断言在 `:34`；`gen-help-shell.cjs:243` 是发射处。引号所指不明 |

### 一处证据链瑕疵（不算错，但票 6 会以为卡路里是直连）

报告 §1.1 把卡路里列为 A 路消费者（`:28`），实际卡路里 `helpFile.ts:23` import 的是**本仓** `./helpShell.js`：`packages/skill-calorie/src/render/helpShell.ts`（25 行）头注释写「#136 路 help模板消费方转发（deprecated）… 本模块零模板字节：常量全部 re-export 自 base」，`:11` `import { renderHelpShellHtml as renderBaseHelpShellHtml } from 'base-paint/help-shell';`——**垫片也是 A 路**，结论不变，但中间隔了一层「本仓 deprecated 垫片」，且它会重映射错误码（`:20-22` `missing-data` → `CalorieRenderError`）。

## 三、两套渲染的判定（专节）

**结论：报告的判断成立。** 两套是**不同实现、不同模板、不同出口**，不共享同一个模板文件。

| 维度 | A 路（本图的面） | B 路 |
| --- | --- | --- |
| 模板 | `packages/base-render/assets/help-template.html`（2053 行／106,968 B，**页面侧运行时脚本**版） | `packages/base-render/src/help.ts:625` `function buildShellTemplate(data: SceneData)`（TS 拼串，**无页面侧脚本**） |
| 生成链 | 真相源 → `scripts/gen-help-shell.cjs` → `src/helpShell.ts`（116,173 B）＋`test/help-shell-136.test.mjs`（65 行） | 无生成链，直接 TS |
| 主入口 | `packages/base-render/src/helpShell.ts:73` `export function renderHelpShellHtml(data: HelpShellData): string` | `packages/base-render/src/help.ts:675` `export function renderHelpShell(input: HelpShellInput): FillTemplateOutput` |
| 出口路径 | 子路径 `base-paint/help-shell` → `./dist/helpShell.js`（`package.json:11`） | 主入口 `base-paint` → `./dist/index.js`（`package.json:9`），`src/index.ts:40` 导出 |
| 校验 | 只查 `groups` 非空（`helpShell.ts:74-76`），无 id 唯一性 | `validateSceneData`（`SCHEMA` at `src/spec/help.ts:106-238`）＋ `duplicate-id`／`status-invalid`／`types-invalid` |
| 字段读法差异（实证） | `subtitle` 不渲染、`meta_blocks` 不渲染、`recommendations` **渲染**（`name/desc/wake`）、文档标题 `title.includes(skill) ? title : skill+' · '+title` | `subtitle` 必须渲染（`help.ts:403-409`）、`meta_blocks` 渲染（`:596`／`:653-655`）、`recommendations` 名是 `reason/wake_word`、文档标题 `title + ' · ' + skill_name`（`:614`） |

**`packages/base-render/package.json` 的 exports 逐字**：

```json
"exports": {
  ".": "./dist/index.js",
  "./blocks": "./dist/blocks.js",
  "./help-shell": "./dist/helpShell.js",
  "./package.json": "./package.json"
}
```

⇒ `./help-shell` **就是 A 路**（`dist/helpShell.js` 由 `src/helpShell.ts` 编译而来，`:11`）。报告这一条对。

**邻居实际走哪条（import 原文）**：

```ts
// packages/skill-bill/src/render/helpFile.ts:19  →  A 路，直连
import { renderHelpShellHtml } from 'base-paint/help-shell';
// packages/skill-bill/src/render/helpFile.ts:152
  return renderHelpShellHtml(data);
```

```ts
// packages/skill-calorie/src/render/helpFile.ts:23  →  本仓 deprecated 垫片
import { renderHelpShellHtml } from './helpShell.js';
// packages/skill-calorie/src/render/helpFile.ts:72
  return renderHelpShellHtml(data);
// packages/skill-calorie/src/render/helpShell.ts:11  →  垫片内部转 A 路
import { renderHelpShellHtml as renderBaseHelpShellHtml } from 'base-paint/help-shell';
```

⇒ **两个邻居最终都到 A 路**，没有邻居走 B 路。卡的 B 路消费者是**另一个产品**：`skill-calorie/src/render/helpCenter.ts:481` 的「速查台」（`renderHelpShell(...)`）。报告 §1.1 的两行消费者列法在实质上是准确的。

我另外确证「两路都能到同一个模板」**不成立**：`Select-String 'help-template\.html|assets/'` 扫 `packages/base-render/src/*.ts`，B 路侧（`help.ts`／`template.ts`／`spec/help.ts`）**零命中**该资产，只有 `helpShell.ts:3` 的注释提到它。

## 四、「读了不渲染」三块的探针结论

### 探针（全部在 `.scratch/chef-help/t3-review-A/`）

| 件 | 做什么 |
| --- | --- |
| `probe_three_blocks.mjs` ＋ `probe-three-blocks.html` ＋ `probe_three_blocks.stdout.txt` | ① 逐变量给「声明位／渲染位」；② 照原报告写法跑哨兵法，证明它无分辨力；③ 直读模板源码判「正文是否由 JS 拼」 |
| `probe_reachability.mjs` ＋ `probe_reachability.stdout.txt` | 花括号配平 + 正文写入点（`h +=`／`.innerHTML=`／`textContent=`／`document.write`）**可达性扫描**，逐变量判 `RENDERED` |
| `probe_yaml_indep.py`／`probe_yaml_paths.py`（＋ `.stdout.txt`） | 独立复点 §4.2 的 33／48／10 域／18 路径 |

### 结论表

| 键 | 变量 | 大小写敏感出现次数（行） | 可达性 `RENDERED` | 判定 |
| --- | --- | --- | --- | --- |
| `meta_blocks` | `META_BLOCKS` | **1**（`:1651` 声明） | `false` | **证实「声明即死」** |
| `subtitle` | `SUBTITLE` | **1**（`:1650` 声明） | `false` | **证实「声明即死」**（注意：大小写不敏感的第 2 行是 `:1775` 的 `INIT_BANNER.subtitle`，与顶层 `subtitle` 无关） |
| `recommendations` | `RECOMMENDATIONS` | **4／3 行**（`:1656`、`:1819`×2、`:1821`） | **`true`** | **证伪报告的「声明即死」** |

对照（同一探针跑出来的、无争议的渲染键）：`SKILL_NAME`＝3 次 `true`、`TITLE`＝2 次 `true`、`INIT_BANNER`＝11 次 `true`、`CONTACT`＝7 次 `true`、`SKILL_VERSION`＝2 次 `true`、`GROUPS`＝4 次 `true`。

### 哨兵法无效的直接证据（用报告自己的数据）

报告的 `probe_render.stdout.txt` 里：

```
"sentinel_in_static": { "CONTACT-LABEL-SENTINEL": 0, "GROUP-LABEL-SENTINEL": 0, ... }
```

`contact`／`groups` **铁定渲染**（`:1801-1815`／`:1781-1797`），哨兵在静态段却是 0。⇒ 0 次不代表「不渲染」。报告把这条 0 读成了「不渲染」。

`body_built_by_js` 旁证：静态段里 `<div class="screen" id="screen"></div>` 为空容器（`help-template.html:171`），`:1834 screen.innerHTML = h`；全文 `.innerHTML=` 赋值点 9 处（`:362／760／1094／1834／1917／1930／2004／2024／2025`）。

### `init_banner` 缺省分支（报告这条对）

`help-template.html:1775` 原文（逐字核过）：

```js
(INIT_BANNER && !INIT_BANNER.hidden ? '<div class="init-banner" id="initBanner">…' : '') +
```

⇒ 无该字段 → 不显示；有且 `hidden !== true`（含缺 `hidden`、`hidden: null`）→ 显示；`hidden: true` → 不显示；进了分支不再判子字段（`esc(undefined)` → 空串）。报告 §3.3 的表述与代码一致。

## 五、硬事实复核（boundaries／exports／两个 commit）

### （一）`tooling/check-boundaries.mjs`（逐字）

```js
37: const SKILLS_BASE_FROZEN = ['skill-chef', 'skill-home', 'skill-schedule', 'skill-memo-ilife'];
38: const BASE_RUNTIME = new Set(['base-paint', 'base-render']); // 目录名／包名两种写法都算
39: for (const name of SKILLS_BASE_FROZEN) {
40:   const p = pkg(name);
41:   const deps = { ...(p.dependencies ?? {}), ...(p.devDependencies ?? {}), ...(p.peerDependencies ?? {}) };
42:   const hit = Object.keys(deps).filter((d) => BASE_RUNTIME.has(d));
43:   assert(hit.length === 0, `${name} 依赖闭包不含 base-*（实得：${hit.join(',') || '无'}）`);
44: }
45: const SRC_RE = /(?:from|import|require\s*\()\s*['"](?:base-paint|base-render)/;
56: const SRC_SCAN = [...SKILLS_BASE_FROZEN.flatMap((n) => walkSrc(join(root, 'packages', n, 'src'))),
57:   ...SKILLS_BASE_FROZEN.flatMap((n) => readdirSync(join(root, 'packages', n, 'templates'))
58:     .filter((f) => f.endsWith('.html')).map((f) => join(root, 'packages', n, 'templates', f)))];
59: const srcHit = SRC_SCAN.filter((f) => SRC_RE.test(readFileSync(f, 'utf8')));
60: assert(srcHit.length === 0, `未迁移技能源码／模板不 import base-*（命中：…）`);
```

⇒ 报告的行号（`:37`／`:38`／`:39-44`／`:45-60`）**全对**，两半确实同源派生（`:39` 与 `:56-58` 都是 `SKILLS_BASE_FROZEN.flatMap`）。数组内含 `'skill-chef'`，逐字一致。
我另实测 chef 现状**确实命中零**：`src/**/*.ts` 0 命中、`templates/*.html` 8 个全不命中。

### （二）`packages/base-render/package.json`

```json
3:  "version": "0.3.0",
11:     "./help-shell": "./dist/helpShell.js",
```

⇒ 报告逐字一致；`exports` 共 4 条（`.`／`./blocks`／`./help-shell`／`./package.json`），报告说 4 条**对**。

### （三）两个 commit（实跑输出）

```
$ git show 3e46ab0:packages/base-render/package.json
{
  "name": "base-paint",
  "version": "0.3.0",
  ...
  "exports": {
    ".": "./dist/index.js",
    "./blocks": "./dist/blocks.js",
    "./package.json": "./package.json"
  },
  ...
  "devDependencies": { "base-link-core": "^0.2.0" },
  ...
}
```

⇒ **无 `./help-shell`**，与报告判断一致。

```
$ git log --pretty='%H %ad %s' -1 --date=iso 3e46ab0
3e46ab0095c712d31c36440cf096b14b06685bd7 2026-09-10 14:06:58 +0800 fix(s1): 联动发版 base-paint 0.3.0 + skill 0.2.2 + plugin 0.2.3（registry 同号异物必崩）

$ git log --pretty='%H %ad %s' -1 --date=iso 21ef322
21ef322f7442d4b42a59ac79754f8a1652248208 2026-09-10 17:33:31 +0800 feat(136): base-paint登记help-shell子路径出口（主入口/files不动）

$ git log --pretty='%H %ad %s' -1 --date=iso 7a114b3
7a114b31e6cefb25fb3682cd12c454dea8a4ae6f 2026-09-10 20:10:40 +0800 chore(release): base-* 三包版本归位 0.3.0（base-link-core／base-combos 首次上架前置）

$ git log --pretty='%h %ad %s' --date=iso -S'./help-shell' -- packages/base-render/package.json
21ef322 2026-09-10 17:33:31 +0800 feat(136): base-paint登记help-shell子路径出口（主入口/files不动）
```

⇒ 时间序 **14:06:58 → 17:33:31（+3h26m31s ≈ 3.5h）→ 20:10:40**，报告三个 sha／三条提交信息／时间差／`-S` 只命中 `21ef322` **全对**。

### （四）旁证

- `packages/skill-bill/node_modules/base-paint`：`LinkType: Junction`、`Target: {D:\ilife\packages\base-render}` ⇒ 仓内解析到仓内 `package.json`（含子路径），报告对。
- `packages/skill-chef/node_modules/base-paint`：**不存在**（`Test-Path` → `False`），报告对。
- `node_modules/.pnpm/base-paint@0.2.0/…/package.json`：`"exports": { ".": "./dist/index.js" }`（只有主入口），报告对。
- 报告已自陈「本机无法联网复核 registry 上的 0.3.0 tarball」——这一保留**诚实且必要**，我同样无法（本审查未联网），故发布态缺口仍属**推定**而非**实证**。

## 六、票面覆盖（7 问逐条）

| 问 | 内容 | 报告位置 | 判定 |
| --- | --- | --- | --- |
| 1 | 5 项必填 ＋ 三块可选（`meta_blocks`／`version`／`init_banner`）的准确形状与渲染落点 | §二（`:140-152`）＋ §三（`:156-187`）＋ §1.5（`:114-136`） | **答了，但 Q1 的三块里有错**：`meta_blocks`／`version`／`init_banner` 三块形状与落点**全对**；额外把 `recommendations` 也算进来时判错（§二硬伤①）。**Q1 未漏答** |
| 2 | `groups`（10 域／33 组／48 场景）怎么喂进模板；老件两层 vs 模板三层，中间层怎么落 | §四（`:191-223`） | **答全**：§4.1 三层各自渲染什么（带行号）、§4.2 老家两层实测（33／48／10 域／组不跨域／24 个单卡组／`domain` 字段只覆盖 13/48）、§4.3 甲／乙／丙／丁四种落法＋代价。三个选项都列了，且明说「不选」 |
| 3 | `meta_blocks` 两块（HELP 汇总 ＋ HELP 唤醒词）的内容怎么派生（照记账：一处算、两处用） | §五（`:227-272`） | **答全**：给了记账的 `deriveSummaryLine`／`buildMetaBlocks`／`:137-146` 一处算两处用、`HELP_WAKE_WORDS` 的 `filter` 派生，并核到 chef 的 `wakewords.ts:12-16` 恰 4 条，还标出与老家的差异（带空格 vs 无空格） |
| 4 | `version` 取什么（老家 `scenarios.yaml` 有没有版本号；记账取技能数据世代、不是 npm 包版本） | §6.2（`:296-300`） | **答全**：老家有（`scenarios.yaml:3` `version: 0.1.0`，且老页面真显示它）、语义是数据资产版本、记账取 `'2.0'`（技能数据世代）而 chef 两者同值 `0.1.0` 分辨不出、三条可行取值 |
| 5 | `init_banner` 的显隐口径；新仓要不要照搬、要不要「跑完不建库」 | §6.3（`:302-325`） | **答全**：先纠票面前提——**老家私家大厨没有这一块**（`render_help.py` 276 行 0 命中，我复核过）；记账的老口径才是「DB 文件存在＝已初始化」（我另核到 `饼干记账/scripts/render_help.py:91 def _is_initialized`）；再给新仓三个坑（`resolveDbPath` 光算就 mkdir、`openChefDb` 建文件跑 DDL、今天 HELP 路确实会开库）＋三条可行口径 |
| 6 | `contact` 的取值（老家 payload 的 `meta` 里有什么可用的） | §6.4（`:327-331`） | **答全**：老家 `meta` 只有 4 字段无 `contact`（我复核 `scenarios.yaml` 897 行 `contact` 0 命中）、老页无联系段；给记账三项／卡路里两项两套邻居取值 |
| 7 | 文档标题怎么派生（`composeDocTitle`）、有没有原型水印这类要一并清掉的东西 | §6.1（`:278-294`）＋ §6.5（`:333-341`） | **答全**：`composeDocTitle` 源码＋三支实测＋入口只有两个字段；水印表 5 行（老权威共享模板写死 `<title>HELP 原型 · V4 三级目录版</title>` → 新模板 `__HELP_TITLE__` 占位＋生成器 `:42` 断言；generator 日期戳；模板自带 `HELP 模板 v4`；三条 SLOT 注释；同名不同物的 `私家大厨.html`） |

**结论：7 问 0 漏答。** 唯一的内容缺陷是 Q1 的附加项（`recommendations`）判错，不构成漏答。

## 七、给票 6 的修正提示

**能用，但先修 2 处硬伤（＋5 处行号），共 7 处。**

### 必须修（否则会写错）

1. **`recommendations` 是「读了且渲染」，不是「读了不渲染」。** 施工时按 §3.4 走：想显示「其他技能」段就传 `{name, desc, wake}`（**不是** `reason`／`wake_word`），不想显示就不传（整段不出现）。要改的地方：结论摘要 4（报告 `:15`）、§1.5 第 5 行（`:134`）、§八 A（`:413`）、自检 2（`:465`）——四处都要把 `recommendations` 从「读了不用」名单里摘出去。
2. **§1.5 的哨兵法不能用来判「渲染与否」。** 若票 6 要复核其它字段，别再用「哨兵在静态段 0 次」这一步；改用「该变量有没有出现在 `help-template.html:1771-1834` 的 `h +=` 链上」。可直接用我的 `probe_reachability.mjs`。
3. **§1.5 第 3 行：「文档少列」的四个字段是 `contact`／`init_banner`／`version`／`recommendations`，不含 `meta_blocks`**（`meta_blocks` 在老文档顶层表 `:28` 里）。同时把该行的行号从 `:1` 改成 `:23-29`，路径补成 `公共组件/docs/scene-data-contract.md`。

### 建议修（行号，不影响结论）

4. `packages/skill-chef/package.json` 的 `version` 在 **`:3`**（报告两处写 `:4`）。
5. `pnpm-lock.yaml` 的 `base-paint … link:../base-render` 在 **`:136-138`**（报告写 `:132-134`）。
6. `escapeTitleText` 只替换 **4** 个字符（`&`／`<`／`>`／`"`，**不转义 `'`**）；「五字符」是页面侧 `esc()`（`help-template.html:1696`）。若票 6 关心 `title` 里出现单引号，注意这一条。
7. §1.1 的卡路里消费者应写明它走的是**本仓 deprecated 垫片** `skill-calorie/src/render/helpShell.ts`（`:11` 转 `base-paint/help-shell`，`:20-22` 会把 `missing-data` 重映射成 `CalorieRenderError`），不是直连子路径。票 6 的 chef 侧要**直连** `base-paint/help-shell`（照记账），别抄卡路里的垫片。

### 票 6 可以放心照抄的部分（我逐条复核过，全对）

- 出口＝`base-paint/help-shell` 的 `renderHelpShellHtml`（`package.json:11`）；调用形状 `renderHelpShellHtml({skill_name, title, subtitle, contact, groups, …})`；空 `groups` 抛 `HelpShellError{code:'missing-data'}`。
- 注入形状＝`<script id="help-data" type="application/json">` ＋ 整份 JSON（`<`→`\u003c`）；**不是** `window.__HELP__`。
- `composeDocTitle`：`title.includes(skill_name) ? title : skill_name + ' · ' + title`。
- 三层结构：`groups[].id` → Tab／`data-page`；`subgroups[].label` → 折叠组标题（**二级组 `id` 模板根本不用**，别为它编 id 语义）；`scenes[].id` → `data-key`＋`SCENE` 字典键。场景字段名 `id`／`title`／`wake_word`／`types`（数组）／`prompt_template`／`status`／`editable_fields`。
- A 路**没有** id 唯一性校验（老家 `injector.py:144/148-150/170-172` 那套在新仓无实现）⇒ 场景 id 重名会静默覆盖（`help-template.html:1691`）、域 id 重名会让两个 Tab 指同页（`:1782`／`:1830`）。**票 6 若在生成侧拼数据，务必自己加一道 id 唯一性检查**（老家的口径是 group id 与 scene id **共用一个集合**）。
- `TYPE_DEFAULT` 恰 10 个词：`采集`／`查看`／`结果`／`向导`／`批量`／`校验`／`选择`／`过程`／`回执`／`录入`（`help-template.html:1698-1709`，我逐行核过），表外词退到「查看」蓝兜底。
- `SKILLS_BASE_FROZEN` 含 `'skill-chef'`（`tooling/check-boundaries.mjs:37`），两半断言同源派生；chef 移出前还须真加 `base-paint` 依赖（现 `dependencies` 只有 `base-link-core`，且 `packages/skill-chef/node_modules/base-paint` 不存在）。
- 发布态缺口成立但属**推定**：`3e46ab0`（14:06）那次发的 0.3.0 exports 无 `./help-shell`，`21ef322`（17:33）才加；本机不联网，`registry` tarball 未经实证。

## 八、证据目录（本审查产出）

**实验件（全部在 `D:\ilife\.scratch\chef-help\t3-review-A\`）**：

| 件 | 用途 | 关键输出 |
| --- | --- | --- |
| `probe_three_blocks.mjs`＋`probe-three-blocks.html`＋`probe_three_blocks.stdout.txt` | 逐变量「声明位／渲染位」＋哨兵法无分辨力的证明＋正文由 JS 拼的旁证 | `SUBTITLE occ=1 rendered=false`／`META_BLOCKS occ=1 rendered=false`／`RECOMMENDATIONS occ=4`；`sentinel_analysis` 里 `contact／groups／version／init_banner` 的 `in_static` 全为 0（而它们都渲染）；`screen_container_in_static: true`，`innerHTML` 赋值点 9 处 |
| `probe_reachability.mjs`＋`probe_reachability.stdout.txt` | 花括号配平＋正文写入点可达性扫描 | `summary_rendered`：`SUBTITLE false`／`META_BLOCKS false`／`RECOMMENDATIONS true`／`INIT_BANNER true`／`CONTACT true`／`SKILL_VERSION true`／`GROUPS true`／`SKILL_NAME true`／`TITLE true` |
| `probe_yaml_indep.py`＋`.stdout.txt` | 独立复点 §4.2 的组／卡／域 | `group_count 33`／`scene_count_flat 48`／`dup_ids []`／`domains {做菜5,查看8,搜索筛选13,修改4,历史4,采购1,录入6,派生3,开始使用1,数据管理3}`／`domain_count 10`／`meta.version 0.1.0` |
| `probe_yaml_paths.py`＋`.stdout.txt` | 独立复点 §4.2 的路径存在性 | `distinct_template_paths 18`／`exists_as_written 10`／`not_found_anywhere ['历史/data_view_dashboard.html','历史/data_view_timeline.html']`／`not_a_dir_prefix` 恰为 做菜／查看／采购／数据管理 |

**跑过的只读命令**（节选）：`Get-Item`／`Get-Content -Encoding UTF8`／`Select-String -CaseSensitive`／`(Get-Content).Count`／`ConvertFrom-Json`／`node .scratch/chef-help/t3-review-A/probe_*.mjs`／`python .scratch/chef-help/t3-review-A/probe_*.py`／`git show 3e46ab0:packages/base-render/package.json`／`git log --pretty='%H %ad %s' -1 --date=iso <sha>`／`git log -S'./help-shell' -- packages/base-render/package.json`／`Get-Item -Force`（读 Junction）。

**未跑**（按硬约束）：`pnpm --filter base-paint gen:help-shell`（及其 `:check`）、仓级 `pnpm build`／`pnpm test`、`chef-cmd-read`（会建库）、任何 `git add`／`commit`／`checkout`／`stash`、任何联网命令。
