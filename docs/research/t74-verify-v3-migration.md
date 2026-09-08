# #74 V3 迁移与影响面验证（独立 · 对抗式）

- 角色：V3，判 A8／A10／A11／A13。**只读 + 只写本文件**；未改任何被验文件，未 `git add`／`git commit`。
- 基线：`git diff --name-only` = 6 个已跟踪文件（`packages/base-render/{src/contract.ts,src/index.ts,src/spec/index.ts,test/contract-signatures.test.mjs,test-d/contract-signatures.ts}` ＋ `docs/base-paint-contract.md`）＋ 4 个未跟踪交付件；`pnpm build` exit 0。
- 复跑命令原文：`node tooling/classify-templates.mjs --inventory`；`node --test <packages/base-render/test/*.test.mjs 五个文件>`；`pnpm test:types`；`pnpm boundaries`；作者脚本按「内存复跑、不覆盖仓内文件」执行（见 A10）。
- 独立复算一律用**自写 fixture**（与作者不同值），不引用作者结论。

## A8／A10／A11／A13 逐条

### A8 零残留标记：**通过**（六标记口径；字面 `<!--…-->` 口径有 1 处已登记的例外）

自己复算（未落盘脚本，`node -e` + 自写资产 `sharedCssText='/*v3-own-fixture-css*/'`、`sharedHelpersJs='/*v3-own-fixture-js*/'`）：

- 53 个内容页（bill 16／chef 8／home 21／schedule 8）逐个 `fillTemplate({template,assets,content:'<p>V3正文</p>'})` → `contentPagesFilled=53 markerResidue=[] contentCommentResidue=[]`（六标记零残留 ＋ 输出内 `<!--` 计数 0）。
- 6 个 memo 数据页：**迁移前**原样调用 → `change_category/init_report/memo_query/sync_report/wish_complete/wish_plan` 全部 `marker-conflict`（与 `packages/base-render/test/template.test.mjs:500` 一致）；**内存去包裹后** `strict:true` 填充 → `memoDataPagesFilled=6 markerResidue=[]`，容器保留（`id="payload"`）。
- 复跑作者用例：`node --test packages/base-render/test/template.test.mjs` → **36 pass / 0 fail**（A8 两条用例绿）。
- 复跑分型：`node tooling/classify-templates.mjs --inventory` → 数据页 6／内容页 53／遗留 6，`[OK] 与清单逐条一致（65 条）`。
- 作者自证链核对：`migration-path.md:8`、`:83-84`、`:150` 引用的 D3 A8 用例确为真；`packages/base-render/test/template.test.mjs:473-512` 逐文件断言。

**例外（低，不阻塞）**：施工单 A8 的字面是「无 `<!--…-->` 残留」，而 `packages/skill-memo-ilife/templates/sync_report.html:296,304,307,310,313` 有 5 条**装饰性**注释，填充后原样保留（我的复算 `memoCommentResidue=["sync_report.html comments=5"]`）。它们不是占位符，且仓内已登记：`docs/research/t118-template-inventory.md:184`「非标记注释只出现在 1 个模板 … 5 条装饰性 HTML 注释（`:296`、`:304`、`:307`、`:310`、`:313`）」。故 A8 应读作「六标记零残留」；若评审按字面口径，需在施工单侧改措辞，**不应**要求删除这 5 条注释（删了会改模板正文）。

### A10 `escapeHtml` 五字符 ＋ 哨兵翻转 ＋ calorie 差异证据：**通过**

- **作者脚本复跑（不覆盖仓内文件）**：读入 `.scratch/t74/escape-html-calorie-diff.mjs`，仅在内存把 `ROOT` 固定为 `D:/ilife/` 并**摘掉最后一行 `writeFileSync`**，以 `data:text/javascript;base64,…` 执行 → EXIT=0，stdout 与仓内 `.scratch/t74/escape-html-calorie-diff.md` **逐字相同**（`MATCH=True`）。即：可复现，且未改动被验文件。
- **独立复算（自写复现同值 fixture）**：`renderPhotoReceiptHtml 8/+32`、`renderErrorHtml 7/+28`、`renderGalleryHtml 6/+24`、`renderPhotoHelpHtml 6/+24`、`renderGifHtml 2/+8` → `TOTAL hits=29 delta=+116 changed=5/5`，且**逐样本 `delta === 4*hits`** 成立。核对结论：`escape-html-calorie-diff.md:24`「29 个 `'`→`&#39;`、+116 字节、5/5 输出改变」**属实**。
- **41 处调用点**：`packages/skill-calorie/src/render/html.ts` grep 命中 41 条，行号与 `escape-html-calorie-diff.md:11` 逐条一致。
- **哨兵翻转**：`packages/base-render/test/contract-signatures.test.mjs:421-429`（`assert.equal(escapeHtml("'"), '&#39;')` ＋ 五字符逐值 `ESCAPE_HTML_ENTITIES[ch]`）；类型层 `packages/base-render/test-d/contract-signatures.ts:140`（`Absent<'fillTemplate'>` → `Present<'fillTemplate'>`）。实跑：base-render 全量 `96 pass / 0 fail`、`pnpm test:types` exit 0、`pnpm boundaries` exit 0、`pnpm build` exit 0。
- **实现面**：`packages/base-render/src/contract.ts:35-40` 恒读冻结常量（`packages/base-render/src/spec/controls.ts:14,18-24`），不自写第二份字符表。
- 影响面结论见「## calorie 影响面」——**成立**。

### A11 迁移路径文档：**通过（现状/动作/落点逐条核实为真）**，有 1 处连带改动面未列全（详见「迁移路径的空白」1）

现状 `file:line` 逐条复核（**全部正确**）：

| 技能 | 复核项（我实读） |
|---|---|
| skill-bill | `src/render/html.ts:7` escapeHtml；`:53-55` 三标记常量；`:57` SHARED_CSS 裸；`:58` SHARED_HELPERS **自带 `<script>`**；`:60-70` 私有 fillTemplate（`:67` CSS 包 `<style>`、`:68` HELPERS 裸注入）；`:63` `BILL_MARKER_INVALID`；生产调用 `src/cli/cmd_read.ts:450`；16 模板标记 @6/12/14 |
| skill-schedule | `:7`／`:62-64`／`:66`／`:67`／`:69-79`／`:72`；`cmd_read.ts:286`；测试 `test/render.test.mjs:79,84` |
| skill-home | `:8`／`:59-61`／`:63`／`:64`／`:66-76`／`:69`；`cmd_read.ts:721`；测试 `:80,85` |
| skill-chef | `:7`／`:68-70`／`:72`／`:73`／`:75-85`／`:78`；生产零调用 `cmd_read.ts:373-375`；测试 `:53,55` |
| skill-memo-ilife | `:8`／`:52-53`（仅两标记）／`:55-62` 私有 `fillSharedMarkers`（`:61` 原样注入不包标签）／`:58` `MEMO_MARKER_INVALID`；生产零调用 `cmd_read.ts:133-135`；测试 `:49,52` |

- **53 个内容页现状**自算：`contentTemplates=53 violations=0`（标记恒在 `:6/:12/:14`，无预包裹），与 `migration-path.md:26` 等描述一致。
- **12 处预包裹**：`migration-path.md:88-95` 给出 before→after（`<style><!--SHARED-CSS--></style>`→`<!--SHARED-CSS-->`、`<script><!--SHARED-HELPERS--></script>`→`<!--SHARED-HELPERS-->`），`:99-106` 逐模板列出 6 个 memo 模板的两处行号——我逐条核对（`change_category 7/111`、`init_report 8/108`、`memo_query 7/65`、`sync_report 8/325`、`wish_complete 7/93`、`wish_plan 7/96`）**全部命中**，且与 `docs/research/t118-template-classification.md:67-72`、`docs/research/t118-template-inventory.md:140-143` 一致。after 后由填充器补包裹 = `ASSET_WRAPPERS`（`packages/base-render/src/spec/template.ts:157-158`）逐字，故该动作**字节中性**（我复核 `ASSET_WRAPPERS.sharedCssText={openTag:'<style>',closeTag:'</style>'}`）。
- **`escapeHtml` 5 份副本落点齐**：`migration-path.md:130-135` 六行（5 技能＋calorie「无副本」）。逐条核实：bill `src/render/html.ts:7`、chef `:7`、home `:8`、schedule `:7`、memo `:8`（声明行，正确）；5 份均为 5 字符（`&#39;` grep 命中这 5 个文件）；calorie 确无副本（`packages/skill-calorie/src/render/html.ts:14` 已 `import { cx, escapeHtml, token } from 'base-paint'`）。
- **动作 → 验收**：每技能有「删什么／改哪行／测试改哪条」＋ §5 四条验收（`migration-path.md:147-150`）＋自证命令。chef／memo 的「无回归基线」「生产接线不属 #74」已诚实登记（`migration-path.md:65-66`、`:82`、D4-3／D4-4）。
- **唯一实质缺口**：memo 侧 `packages/skill-memo-ilife/src/render/index.ts:3` 仍再导出将被删除的 `escapeHtml`／`SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／`fillSharedMarkers`，而 §2.5 动作 1–5（`migration-path.md:75-84`）**未含**「同步删再导出」——bill 侧有此句（`migration-path.md:31`）。按文档字面执行 memo 迁移 → `tsc` 必红。

### A13 越界检查：**通过**

- `git diff --cached --name-only` → 空（无暂存，未 commit）。
- `git diff --name-only` → 6 个文件，全部在 `packages/base-render/**` ＋ `docs/base-paint-contract.md`。
- `git status --porcelain -- packages/skill-bill packages/skill-chef packages/skill-home packages/skill-schedule packages/skill-memo-ilife packages/skill-calorie` → **空**；`git status --porcelain | Select-String "templates/|package.json"` → **空**。即模板、`package.json`、render 层**零改动**。
- 冻结面只翻 `status`：`packages/base-render/src/spec/index.ts:68-69` 两条 `pending`→`implemented` ＋ `docs/base-paint-contract.md:151-152` 同步，签名值未动。
- **未实现 #75／#76／#78 产出者**：`packages/base-render/src/spec/index.ts:80,112,181` 三条 runtime 仍 `status: 'pending'`；全 `src` grep 无 `export function buildStyleSheet|buildSharedHelpersJs|buildChartsHelpersJs`（仅 spec 类型/签名注释）；测试用自造 fixture（`packages/base-render/test/template.test.mjs:44-48`），未把 `asset-missing` 当通过。
- 未跟踪件 `assets/skill_install_calorie_success.png`（mtime 2026/9/8 8:13）、`我的想法.md`（2026/9/6 18:24）早于本票改动时间（`packages/base-render/src/contract.ts` 2026/9/9 0:25），**非本票产出**，勿误记。

## 旧基线对照

**独立核对（直接读旧层正本）**：`D:\2Study\StudyNotes\SKILLS\公共组件\assets\base.js:14`

```
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
```

→ 转义集 = **`& < > " '` 五字符**，`'`→`&#39;`。**独立核实为真**。另查：旧层第二个转义实现 `D:\2Study\StudyNotes\SKILLS\公共组件\assets\charts.js:15` `_esc` 同为五字符（`window.esc||…` 兜底）；旧层 `*.js/*.py` 全量 grep 未发现任何四字符实现。旧层还把 `esc()` 用在属性上并追加 `.replace(/"/g,'&quot;')`（`base.js:311,645,648,649`）——即旧层本身就把 `'` 当需转义字符。

**判定：`escapeHtml` 归一是「朝旧版对齐」，不是新增偏离。**

- base-paint 归一前的 4 字符实现才是偏离（`git diff` 的 `-` 行：`s.replace(/&/g,'&amp;').replace(/</g,…).replace(/>/g,…).replace(/"/g,…)` 四条），它相对旧基线 `base.js:14` 少了 `'`。
- 归一后 5 字符 ＋ `'`→`&#39;` 与旧层逐值一致（实体表同形：`&amp; &lt; &gt; &quot; &#39;`）。
- 措辞风险（低）：`escape-html-calorie-diff.md:4` 写「旧实现：…只转 4 个字符」——此「旧」指 **base-paint 自身归一前**，非旧共享层；建议改称「base-paint 归一前实现」，否则与「旧基线=五字符」相撞。

## calorie 影响面

- **静态面**：41 处 `escapeHtml` 调用点（grep 命中 41，行号同 `escape-html-calorie-diff.md:11`），覆盖标题／KPI／表格行／收据／错误回执／HELP／照片卡全部动态文本；技能侧无本地副本。
- **会变的页面**：仅当被转义文本含 `'`。fixture 实证 5/5 渲染函数输出改变、共 29 个 `'`→`&#39;`、+116 字节；每个 `'` 恰好 +4 字节（我逐样本验证 `delta===4*hits`）。属性上下文同样受益（`'` 不再可注入），语义等价。
- **现有断言／快照会不会变红：不会。** 自己核对四条：
  1. `packages/skill-calorie` 全包 117 个文件（`src`／`test`／`templates`／`scripts`，排除 `node_modules`／`dist`）扫 `[一-龥A-Za-z0-9]'[一-龥A-Za-z0-9]` → **0 命中**（无 `it's`／`don't` 类内容）。
  2. calorie 测试**无 HTML 全文快照**：`test/calorie-sot.snapshot.json` 是唤醒词/触发清单（键 `sot`／`total`／`scene_counts`／`entry_sha`／`wake_multiset`），与 HTML 无关；calorie 测试对 HTML 只做子串/正则断言（如 `ilife-page`），无 `toMatchSnapshot`／全文 `deepEqual`。
  3. 全仓 `&#39;` 断言只有两处：`packages/base-render/test/contract-signatures.test.mjs:429`（本票已翻转）与 `packages/skill-memo-ilife/test/render.test.mjs:37-39`（技能本地副本，不受本票影响）；`packages/base-render/test/render.test.mjs:86` 的 `escapeHtml('&<>"')` 输入不含 `'`，恒等。
  4. 实跑：base-render 全量 96/96 pass、`pnpm test:types` exit 0。
- **结论**：作者「数据相关／现有资产 0 命中 ⇒ 现网输出零变化」**成立**。补充（低）：影响面正文未明写「5 技能迁移后输出零变化」这一结论（其本地副本同为五字符，需读者自推），亦未提 `packages/base-render/src/contract.ts:47,57` 的 `renderPage`／`renderReco` 也走同一 `escapeHtml`（仓内 0 消费方，影响为空）。

## contract.ts 依赖方向

`packages/base-render/src/contract.ts:9` 新增 `import { ESCAPE_HTML_CHARS, ESCAPE_HTML_ENTITIES } from './spec/controls.js';`

- **是否违反 `tooling/check-boundaries.mjs`：否。** 该脚本 7 条断言只查「包间依赖／link-core 源码引用／present 只许字符串级／装配 owner」（`tooling/check-boundaries.mjs:13-28`），**无一条约束包内模块方向**；实跑 `pnpm boundaries` → 7 条 OK，exit 0。另有 `packages/base-render/test/contract-signatures.test.mjs:910-921` 约束 `src/spec/*.ts` 只许 `import type`（`spec/controls.ts:11` 合规），实跑绿；`contract-signatures.test.mjs:865-876` 的 dist 纯度扫描（覆盖 `dist/spec/*.js` 与 `dist/contract.js`）实跑绿。
- **是否引入循环依赖：否。** 依赖链 `contract.ts → spec/controls.js`（值）→ `spec/text.js`（仅 `import type`，`spec/controls.ts:11`）→ `base-link-core`（仅 `import type`，`spec/text.ts:10`）；`contract.ts` 直连 `spec/controls.js` 而非 `spec/index.js`，故不经 `spec/index.js` 再入环。
- **方向是否符合契约**：符合——`spec/*` 是冻结面（类型＋纯数据常量），运行时消费之正是「唯一真相源」设计（`packages/base-render/src/spec/controls.ts:13` 注释即写「AC-14：HTML 转义集固定五字符」）。
- **残留风险（低，不阻塞）**：字符表归 #76 冻结面，改它即静默改 base-paint 运行时转义；已被逐值断言钉住（`contract-signatures.test.mjs:423-427`），漂移必红。

## 迁移路径的空白

1. **memo 连带改动面未列全**（唯一实质缺口）：`packages/skill-memo-ilife/src/render/index.ts:3` 再导出 `escapeHtml`／`SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／`fillSharedMarkers`，§2.5 动作 1–5（`migration-path.md:75-84`）无「同步删再导出」（bill 有：`migration-path.md:31`）；`packages/skill-memo-ilife/test/render.test.mjs:3` 从 `../dist/index.js` 导入 `escapeHtml`／`fillSharedMarkers`／两标记常量，`:37-39` 是本地 `escapeHtml` 的 5 字符单测，而 §2.5 动作 5 只点 `:49,52`。**判级说明**：按「编译器必拦 ＋ §5 验收③『escapeHtml 无本地副本』＋ 4/5 技能已列该步」判为**低**（下游不会被误导，只是多一次 tsc 报错）；若评审口径要求「动作清单逐条完备」，可上调为中级。
2. **测试导入面普遍未点**：bill `test/render.test.mjs:3`、chef `test/render.test.mjs:6` 从 `../dist/index.js` 导入将被删除的 `fillTemplate`，而 `migration-path.md:38` 只点断言行。低。
3. **资产替换的字节影响未声明**（影响面真空白）：私有 CSS 有 **2 个变体**——bill／chef 440 字符（含 `.amt{font-weight:700}`）、schedule／home 419 字符（无该规则），实测 `distinctCssVariants=2`、首个差异位 `firstDiffAt=260`；HELPERS 4 家同值（145 字符，`distinctHelpersVariants=1`）。迁移后统一由 #75 单一资产提供 ⇒ **输出字节/视觉必变（至少一族）**。`migration-path.md:35` 只写「CSS 侧无需动作：…填充器 `<style>` 包裹后字节不变」（就**包裹动作**而言为真），未声明**资产内容替换**的影响；该信息只在 `migration-map.md:20-23`。建议在 §1／§5 加一句「字节中性仅对包裹与转义成立；资产替换面归 #75 ＋ #96 快照门」。低。
4. **`escapeHtml` 落点行号两文档口径不一**：`migration-path.md:130-134` 用声明行（7/7/8/7/8），`migration-map.md:30` 用实现体行（8/8/9/8/9）——两者各自正确，交叉阅读像矛盾。nit。
5. **「同批删除」在本票红线内不可满足**：`migration-path.md:140` 要求「本地副本删除必须与 base-paint 归一**同批**」，但本票只动 `packages/base-render`（施工单 §4.3）⇒ 必然存在两实现并存窗口（行为等价、无功能漂移，仅未来漂移风险）。建议改「同一迁移批次（各技能地图执行时）」并登记并存窗口。低。
6. **§3 标题「12 个预包裹模板」实为 12 处**（6 模板 × 2 标记）；calorie 另有 6 处预包裹按 §3.2 不动（合计 18 处）。nit。
7. **§2.5 动作 2 的「调用点」措辞**：memo 生产链零调用（`packages/skill-memo-ilife/src/cli/cmd_read.ts:133` 直出裸 `<section>`），实指测试调用；且 memo 的 `src/render/index.ts:4` 只导出 `MEMO_TEMPLATES, loadTemplate`（无 `templateFor`），而动作 2 的示例沿用内容页写法。nit。
8. **影响面未明写两条**：(a) 5 技能迁移后 escapeHtml 输出零变化；(b) `renderPage`／`renderReco`（`packages/base-render/src/contract.ts:47,57`）也走同一实现（仓内 0 消费方）。低/nit。
9. **证据脚本口径**：`escape-html-calorie-diff.md:7` 的「归一前可反推」依赖模板/源码零字面 `&#39;`（脚本自查 `escape-html-calorie-diff.mjs:30-42`，我复核 calorie 侧确实零命中）；若真实用户数据含 `&#39;`，反推法失效（只影响证据表算法，不影响结论）。nit。

V3 结论：通过
阻塞级洞（高/中）数量：0
