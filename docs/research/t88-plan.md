# #88 方案 v2（返修单 R1 逐条对表）

> 关系：v1＝`.scratch/t88/t88-plan.md`（**不重抄**）；本文件**只写变更与新增**。v1 被证伪处逐条勘误见 §0（显式标注，不静默改写）。
> 返修正本：`.scratch/orchestrator/t88-rework-order-1.md`；两席报告 `review-red-t88.md`（FAIL／S1＋75）／`review-blue-t88.md`（FAIL／70）。
> 本 session 自证：`.scratch/t88/probe-rework1.mjs`（**21/21**）／`probe-rework2.mjs`（**6/6**）／`probe-contract.mjs`（**17/17，已改断言式**）＋ 6 个原探针的修复版；全部只读、断言式、`fails>0 → exit 1`。
> **本 session 已闭环的返修项**：R1-3（A1 断言化）／R1-4（证据入仓）／R1-10（NaN）／R1-14（假阳性＋度量窗口）／R1-5（两处勘误）／R1-2 与 R1-1 的**可行性与口径**（S1／S4 落地）。**未闭环（S1–S5 实施）**：R1-1／R1-6／R1-7／R1-8／R1-11／R1-12／R1-13。
> 入仓（R1-4）：`docs/research/t88-plan.md`（本文件）＋ `docs/research/t88-probe-{current,sot,contract,shell,shell2,shell3,rework1,rework2}.mjs`（8 个）；门禁基准 `docs/research/t88-baseline/BASELINE.md`（编排者冻结）。

---

## 0. 勘误（v1 被证伪处 · 不改写历史）

| # | v1 原表述（位置） | 事实 | 证据 |
|---|---|---|---|
| **E-1** | L-17「F3 hero 有渐变」 | **F3 hero 无渐变**（`background:var(--card)`）；全文仅 1 处 `gradient`，在 `.init-banner`，而 F3 payload 无 `init_banner` → **死 CSS** | `卡路里.html:21`／`:31`；本 session 复算 `gradient` 计数 1 |
| **E-2** | §2.1「`types` 取 `[{text,bg,fg}]`，F3 同」 | **F3 payload 的 `types` 是字符串数组** `["结果"]`；三档配色在 F3 控制脚本的 `TYPE_DEFAULT` **运行时**映射 | F3 payload 实测 `"types": ["结果"]`；F3 `:1692-1704`；`help.ts:451-459`（字符串走 CSS 默认色＝丢色） |
| **E-3** | §3.3「卡片级复制按钮**不可达**」＋P-1 推荐转票 | **伪不可达**：helpers 是 `[data-action-id]` 事件委派且不限定 class，436/436 卡 Sheet prompt 按钮 `data-t` 与 `<pre>` **逐字相等** → 运行时注入可达 | `controls.ts:543-547`；本 session `probe-rework1.mjs`：`436 pairs, equal 436`／卡头按钮 0 |
| **E-4** | §1.2 把 975,038 B 与 975,370 B 拼成一次测量 | 两值来自**两次不同输入**（`subtitle` 时间戳 ＋ `contact` 多一条 Issues）；差 **332 B** | `probe-rework2.mjs`：`variantA=975370 variantB=975038 delta=332` |
| **E-5** | 附「复跑入口」含 `probe-shell.mjs` | 该探针 `:54` 因运算符优先级恒打 **NaN**，占位符行永不判红/绿 | 红队复算；本 session 已修（改括号＋覆盖 6 个标记） |
| **E-6** | §3.2③「只用 `document.*`」 | helpers 现有 `window.matchMedia` **只读**用法（不触 `forbidGlobalAssignment`） | `controls.ts:586` |
| **E-7** | R1–R5 未登记 A6 缺口 | 诊断期证据全在 gitignored 的 `.scratch/` → **0 条被跟踪** | `git check-ignore -v` → `.gitignore:5:.scratch/` |
| **E-8** | §3.2⑤ 新增 `help-shell-search/-hitcount/-backtop/-mark` 且称「`help.ts` 零改动」 | 这 4 个类名**撞 T11**（`style.test.mjs:302-315`），且新区根撞 T9（`:270-278`） | 本 session `probe-rework2.mjs`：4 个 T11=false；`ilife-card-*` T9=false |
| **E-9** | L-09「显示 `Scene.id`（＝key）」 | 对 414/436 成立，对 **22 条 legacy 事实错误**（会显示 `legacy_看「有备注」的饮食记录`） | 蓝队 D-2；`help.ts:386-401` |
| **E-10** | §2.2 守卫「每个 `HELP_GROUPS[].label` ∈ `CATEGORIES[].label`」 | **该守卫自身会红**：SoT `CATEGORIES` 的 diet 展示名是「饮食记录」（`index.ts:21`），F3／`render_help_center.py:44` 是「饮食」→ 守卫改为「label 逐字 = F3 十组」＋ 差异登记 **L-18** | 本 session 自查：`probe-contract.mjs` 首版该条 FAIL → 改为逐字比对后 17/17 |

---

## 1. R1-1 … R1-14 逐条落地

### R1-1（S1 级）卡级复制按钮＝本票 S4 落地

- **怎么改**：`buildSharedHelpersJs` 的既有 IIFE／既有 `boot()` 内追加 `injectCardCopy()`（不新增标记、不新增第二个 `boot`）：
  1. 卡片选择器由 `STYLE_PREFIX` ＋ `helpShell` 区名 kebab 派生（**不写字面量**）；
  2. 幂等：卡内已有 `.…-card-copy` 即跳过（同页二次 `boot()` 不重复注入）；
  3. 取本卡 Sheet 内 prompt 按钮：`card.querySelector('[' + ACTION_ATTR + '="' + HELP_COPY_ACTIONS.prompt.actionId + '"]')`（**恒读冻结常量**，不自造 actionId）；
  4. `createElement('button')`：`className = cls('card-copy')`、`type="button"`、`textContent = HELP_COPY_ACTIONS.prompt.label`、`setAttribute(ACTION_ATTR, actionId)`、`setAttribute(TEXT_ATTR, sheetBtn.getAttribute(TEXT_ATTR))`；
  5. `card.insertBefore(btn, card.querySelector(sheetSelector))`（卡头位置，视觉对齐 F3 `.mini .copy-btn`）。
- **落点**：`packages/base-render/src/controls.ts`（`buildSharedHelpersJs`）；CSS `.ilife-help-shell-card-copy` 追加进 `packages/base-render/src/style.ts` 的 helpShell 区；**`src/help.ts` 零改动**。
- **契约**：零变更（不导出 `renderSceneCard`、不新增 actionId、不动 `spec/*`）。**降级**：无 JS → 今日形态（仅 Sheet 内按钮）。
- **验收断言**（`packages/base-render/test/help-center-js-88.test.mjs`）：① 注入后 **436/436** 卡头恰 1 个 `[data-action-id]`；② 注入按钮 `data-t` 与该卡 `<pre>` 文本**逐字相等**（解转义比较）；③ 委派点击 → 复制文本 = 该 `data-t`；④ 二次 `boot()` 后按钮数仍 436（幂等）；⑤ 静态 HTML 卡头按钮 **0**（降级保持）。
- **变异自证（S4）**：把注入用的 `actionId` 改成错值字面量 → ①③ 红；`git checkout` 还原 ＋ sha256 一致 → 绿。

### R1-2（S1 级）守卫① 扩到 6/6 冻结标记

- **怎么改**：断言从「5 个字面量」改为：① `Object.values(TEMPLATE_MARKERS)`（**6 个**）逐个 `count===0`；② `report.markers` 六项 key 集合 === 冻结集合，且 `injectData`／`sharedCss`／`sharedHelpers` 三项 `count===1 && filled===true`、`content`／`chartsHelpers`／`noShared` 三项 `count===0`；③ **泛化** `<!--[A-Z0-9-]+-->` 命中 **0**（专抓第 6 个标记泄漏）。
- **落点**：`packages/skill-calorie/test/help-center-88-guards.test.mjs`。
- **变异自证（S3）**：builder 某个 `title` 注入 `<!--NO-SHARED-->` → 泛化口径 **红**（旧 5 字面量口径会**静默通过**，红队 MUT-A 已证）→ 还原绿。

### R1-3（S2 级）A1 断言脚本化 —— 本 session 已执行

- `docs/research/t88-probe-contract.mjs` 由「纯打印恒 exit 0」改为**断言式**：17 条断言（10 分组／54 子功能／436 场景／`id` 436-436／分组序与每分组子功能数逐项等于 F3／types 329·79·6·22／`____` 130／「三句话」436／prompt 无 `</script>`·`<!--`／分组 label 逐字等于 F3 十组）；末行 `RESULT: 17/17 fails=0`，`fails>0 → exit 1`（**实测 exit 0**）。
- **新发现 L-18**：SoT `CATEGORIES` 的 diet 展示名「饮食记录」≠ F3 的「饮食」（`index.ts:21` vs `render_help_center.py:44`）→ 分组 label 取 F3 逐字值，差异登记台账（见 E-10）。
- **落点**：`docs/research/t88-probe-contract.mjs`（已入仓）；S1 测试复用同一期望值常量。
- **自证**：把 `场景数 = 436` 的期望改成 435 → exit 1（会红）。

### R1-4（S2 级）A6 证据入仓 —— 本 session 已执行

- `docs/research/t88-plan.md`（本文件）＋ `docs/research/t88-probe-{current,sot,contract,shell,shell2,shell3,rework1,rework2}.mjs`（8 个），持锁 `git add` 具名文件后 commit。后续每阶段产物同规（S1–S5 各自 commit）。

### R1-5（S2 级）两处事实误记

- 已按 **E-1／E-2** 勘误。P-3 改法见 §4：**必须发 `SceneTypeBadge{text,bg,fg}`**；P-4 改判见 §4。

### R1-6（S2 级）S4 新类名改法（T9＋T11 双绿，已实测）

- **规则**：新类名一律落在 `ilife-help-shell` 根内（T9 闭集），且**后缀必须 startsWith 某个既有 `cls()` 实参**（T11 的 `startsWith` 容忍）。

| 用途 | 类名（`cls()` 实参） | T9 | T11 |
|---|---|---|---|
| 卡级复制按钮 | `card-copy` → `.ilife-help-shell-card-copy` | ✓ | ✓（`card`） |
| 搜索高亮 | `card-mark` → `.ilife-help-shell-card-mark` | ✓ | ✓（`card`） |
| 搜索框容器 | `tab-search` → `.ilife-help-shell-tab-search` | ✓ | ✓（`tab`） |
| 命中计数 | `page-hitcount` → `.ilife-help-shell-page-hitcount` | ✓ | ✓（`page`） |
| 回到顶部 | `btn-backtop` → `.ilife-help-shell-btn-backtop` | ✓ | ✓（`btn`） |

- **反例**（不可用）：`help-shell-search`／`-hitcount`／`-backtop`／`-mark`（T11 红）；`ilife-card-*`（T9 红）。
- **S4 门禁新增**：`packages/base-render/test/style.test.mjs`（T9／T11）＋ `help.test.mjs` ＋ `contract-signatures.test.mjs` ＋ `pnpm snapshot:check`。
- **变异自证（S4）**：任一新类名改回 `help-shell-search` → T11 红；还原绿。

### R1-7（S2 级）legacy 卡不再显示不存在的字符串

- **怎么改**：`buildHelpSceneData` 对 22 条 legacy 的 `Scene.id` 取 **`main_prompt.cli` 原文**（414 条仍取 `key`）。效果：`cliText`＝真命令、`params` 无字段回落＝真命令、复制＝真命令、`data-scene-id` 可追溯。
- **前置实测**（`probe-rework1.mjs`）：22/22 `main_prompt.cli` 非空、互不重复、与 414 键无碰撞。
- **验收断言**：22/22 legacy 卡 `code.cli` 文本 === 该条 `main_prompt.cli`；`new Set(ids).size===436`；`duplicate-id` 反向用例仍抛。
- **备选**（若编排者要求保留可读 `legacy_*` id）：按协议 §6 **书面改期 ＋ 具名票号**，台账登记为未闭合项；本方案默认取上面的解耦。
- **边界**：本票只消除「不存在的字符串」；把 414 条也显示成 `calorie-cmd-read …` 可执行串属 **#106**（逐场景 CLI 展示）。

### R1-8（S2 级）S4 共享样式面影响

- **门禁**：四门（`build`／`boundaries`／`snapshot:check`／`publish:pre`）＋ `contract-signatures.test.mjs` ＋ `style.test.mjs` ＋ `help.test.mjs`。
- **理由**：`buildStyleSheet` 的 helpShell 区被**所有技能页面**消费 → `pnpm snapshot:check` 必须证明其余技能 HTML 快照不变（本票不产其它技能 HTML）。

### R1-9（S2 级）A4 口径 —— 基准已冻结，按实文对齐

- **基准（唯一）**：`docs/research/t88-baseline/BASELINE.md`（冻结于 HEAD `90128d8`）＋ 同目录 `test-failset.txt`（**34 条具名白名单**，三轮并集）＋ `failset-union.mjs`。
- **四门（冻结四项）**：① `pnpm build` ② `pnpm boundaries` ③ `pnpm snapshot:check` ④ `pnpm publish:pre` → 基线实测**全 exit 0**（`BASELINE.md:75`）。
- **测试门**：`pnpm test` 基线 exit **1（既有红）**；判据＝**失败集新增 0**（具名集合，不以 exit 码为准）。判定命令：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <after.log>` → 要求 `新增=0`。
- **不计入门禁**：`pnpm changeset:status`（基线即环境红，`BASELINE.md:134-144`，对 delta 口径无影响）——只记录，不阻断。
- **模式纪律**：`node --test` 直跑 ≠ `pnpm test`（直跑 1011/fail 20 vs canonical 1017/fail 26，`BASELINE.md:95-99`）→ 一律用 canonical `pnpm test`。
- **实施者不得自造基准／改口径／自判 delta**（返修单 §2）。
- **事故纪律**：跑完任何 `pnpm test` 后必须 `git status --short`；发现 `packages/skill-calorie/SKILL.md` 变 `Bin … -> …` 立即停报（事故票 #124），不得自行 commit。

### R1-10 / R1-14（S3 级）探针修复 —— 本 session 已执行

- `probe-shell.mjs:54` 改为括号取计数＋覆盖 **6 个**冻结标记＋泛化残留行。
- `probe-shell2.mjs`：`mark` 假阳性改为标签级 `/<mark[\s>]/`（`HELPERS-HAS-MARKTAG 0`），旧口径另列备查。
- `probe-shell3.mjs`：`BODY-CARD-WITH-BTN` 的 400 字符窗口改为**按 `<article>` 分段、只统计 Sheet 之外**（`BODY-CARD-COUNT 436`／`BODY-CARD-HEAD-WITH-BTN 0`）。
- **体积权威值**：**975,038 B**（`probe-shell3` 口径＝S2 生产形状）；975,370 B 为 `probe-shell` 的富字段输入，差 332 B 已归因（E-4）。

### R1-11（S3 级）helpers DOM 描述

- 改述为「只用 `document.*` ＋ `window.matchMedia`（**只读**，`controls.ts:586`）」；不向 `window.<id>`／`globalThis.<id>` **赋值**，不引 `node:` → `SHARED_HELPERS_JS_RULE` 与 `contract-signatures.test.mjs:190-204` 均不触。

### R1-12（S3 级）转票登记

- `fillTemplate` 注入 `JSON.stringify(data)`（`packages/base-render/src/template.ts:237`）**不转义 `<`** → 未来数据含 `</script>` 会破壳；归 **#74／#78** 接缝，本票只登记＋加守卫断言「436 条 prompt 的 `</script>`／`<!--` 命中 0」（本 session 实测 0）。

### R1-13（S3 级）变异分摊

- **S1 一处**（数据层：legacy id 派生）／**S2 一处**（壳层：标记泄漏）／**S4 一处**（helpers：actionId 字面量）＋ **1 处探针级**（改期望值证明断言会红）。每处：持锁 ＋ 跑前 sha256 ＋ 还原自证 ＋ 路径守卫。

---

## 2. 修订后的步骤表（S0–S5 · 路径所有权 ＋ 门禁）

| 步 | 内容 | 路径所有权 | 门禁 |
|---|---|---|---|
| **S0** | 证据入仓（本 session 已做）：v2 方案＋8 探针 | `docs/research/t88-plan.md`、`docs/research/t88-probe-*.mjs` | `git log -1 --format=%s` 中文自检 |
| **S1** | 数据模型＋R1-3 断言脚本（含 R1-7 legacy id 解耦） | `packages/skill-calorie/src/render/helpCenter.ts`(新)、`src/render/index.ts`(+1 行)、`packages/skill-calorie/test/help-center-88.test.mjs`(新)、`docs/research/t88-probe-contract.mjs` | 四门＋`pnpm test` delta 0；变异① |
| **S2** | 壳落地＋三态接缝（`file` 默认；`inline` 钉死 `<style>` 落点） | 同上（`helpCenter.ts` 追加） | 四门＋`test:types`；变异② |
| **S3** | 三守卫（R1-2 六标记／id 唯一／copyText 单实现） | `packages/skill-calorie/test/help-center-88-guards.test.mjs`(新) | 四门＋`pnpm test` delta 0 |
| **S4** | 扩 helpers（搜索／高亮／跳页／Sheet 预览／`#backTop`）＋**卡级复制按钮（R1-1）**＋ helpShell CSS 追加（R1-6 类名） | `packages/base-render/src/controls.ts`、`packages/base-render/src/style.ts`、`packages/base-render/test/help-center-js-88.test.mjs`(新) | 四门＋`contract-signatures`＋`style.test.mjs`＋`help.test.mjs`＋`snapshot:check`；变异③（**与 #91／#121 严格串行**） |
| **S5** | 证据＋changeset＋#91 交接（明写「#88 关闭时用户仍看不到新版速查台」） | `docs/research/t88-*.md`、`.changeset/t88-help-center.md`(新) | 四门＋失败集 delta 0（`changeset:status` 为环境红，仅记录不阻断） |

---

## 3. A1–A8 修订后覆盖

| # | 状态 | 变化 |
|---|---|---|
| A1 | **S1 达成** | R1-3 把复算改成断言式脚本（`RESULT: n/m`，exit≠0）；R1-7 修正 legacy 事实 |
| A2 | **达成** | R1-6 类名双绿（不新增区根／不新增契约面）；S4 门禁含 `snapshot:check`（R1-8） |
| A3 | **达成** | 守卫① 扩 6/6＋泛化（R1-2）；②③ 原样；卡级按钮不破③（零新增 actionId） |
| A4 | **口径已冻结可执行** | 基准 `docs/research/t88-baseline/BASELINE.md`（HEAD `90128d8`）＋`test-failset.txt` 34 条白名单；四门基线全 0；`pnpm test` 判据＝具名失败集新增 0；`changeset:status` 环境红不计入门禁（R1-9） |
| A5 | **达成** | 3 处 src 变异按 S1／S2／S4 分摊（R1-13）＋1 探针级 |
| A6 | **S0 已达成** | 方案＋8 探针入 `docs/research/` 并被 git 跟踪（R1-4） |
| A7 | **达成** | 步骤表逐格声明路径；`cmd_read.ts`／`keys.ts`／`templates/*`／`plugin-*` 禁改 |
| A8 | **达成** | S4 与 #91／#121 严格串行（#91／#121 blocked-by #88） |

---

## 4. P-1 … P-6 更新裁定（采纳编排者 §0）

- **P-1 卡级复制按钮**：**推翻 v1「不可达／转票」** → 本票 S4 运行时注入（R1-1），零契约变更。
- **P-2 `subtitle` 时间戳**：确认 (a)；`updatedAt` **显式参数**、测试注入固定值；登记「两次调用字节不同」（E-4 实测 delta 332 B）对快照／delta 的影响。
- **P-3 types 三档配色**：确认 (a)，**必须发 `SceneTypeBadge{text,bg,fg}`**（字符串会丢色，E-2）；补**白名单断言**（允许色集 = F3 三档）防 #89 翻案；H-01 禁色表（`#0a84ff/#af52de/#ff375f/#0071e3`）不含 `#0a63ce`／`#00897b`。
- **P-4 H-04 零渐变**：确认 (a)，**改按 CSS 区判**：charts 区外零渐变（实测全 CSS 仅 1 处，在 charts 图例）；**禁止**用 `repeating-` 前缀放宽（＝私自放宽）。
- **P-5 默认交付**：确认 (a) `file`；**`inline` 必须钉死 `<style>` 落点**（片段无 `<head>` → 片段态自带 `<style>` 包裹 `sharedCssText`），否则 inline 无样式。
- **P-6 验收口径**：确认 (a) 模块级验收；S5 证据**明写**「#88 关闭时用户仍看不到新版速查台」，并给出与 #91 的验收交接点（键语义／CLI 接线）。

---

## 5. 风险 top5（修订）

| # | 风险 | 变化 | 建议 |
|---|---|---|---|
| 1 | 扩 `buildSharedHelpersJs` 与 #121 冲突（同 IIFE／同 `boot()`） | 不变，且新增卡级注入 → 影响面更大 | 严格串行；追加块只挂同一 `boot()`；幂等测试 |
| 2 | 卡级注入的幂等／重复注入 | **新增** | 卡内标记判据＋二次 `boot()` 断言 |
| 3 | 新类名撞 T9／T11 | **已解**（R1-6 双绿实测） | S4 门禁含 `style.test.mjs` |
| 4 | legacy id 解耦后 `data-scene-id` 语义变化 | **新增** | 唯一性断言＋台账登记；#106 收敛 CLI 展示 |
| 5 | 975 KB 体积／`pnpm test` 写 SKILL.md 事故 | 不变／**新增事故面** | inline 只取片段；跑测后 `git status --short` 自检，异常即停报 |

---

## 附：复跑（全部只读、断言式）

```
node docs/research/t88-probe-rework1.mjs   # 21/21：legacy CLI／卡级可达／6 标记／T11 违规面
node docs/research/t88-probe-rework2.mjs   # 6/6：T9+T11 双锁镜像／体积差 332 B 归因
node docs/research/t88-probe-contract.mjs  # A1 复算（S1 起改为断言式）
node docs/research/t88-probe-shell3.mjs    # 壳结构：975,038 B／436 卡／卡头按钮 0
```
