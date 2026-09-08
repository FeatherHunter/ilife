# #74 V4 定向复验（对抗式 · 独立 · 返修者不得自证）

- 角色：#74 V4 定向复验 agent。判定 #74 能否关闭。**只读被验文件 ＋ 只写本文件**；未 `git add`／`git commit`。
- 工作目录 `D:\ilife`；基线 `HEAD = 361e273`（#74 交付＋返修同一提交，故返修前状态不可 diff，改用「断言鉴别力变异测试 ＋ 用例计数守恒」取证）。
- 被验对象：`packages/base-render/src/{template.ts,contract.ts,index.ts,spec/index.ts}`、`packages/base-render/test/{template.test.mjs,contract-signatures.test.mjs}`、`packages/base-render/test-d/contract-signatures.ts`、`docs/base-paint-contract.md`、`docs/research/t74-*`、`docs/research/t92-baseline-failures.md`、`.changeset/base-paint-fill-template.md`。
- 自写工具（落 `.scratch/t74/v4-mutation/`，**不属被验文件**）：`multiset.mjs`（失败多重集）、`surface-check.mjs`（冻结面签名逐条比对）、`format-check.mjs`（BOM／字面反斜杠 n／LF／控制字符）、`css-variants.mjs`（CSS／HELPERS 变体）、`frozen-const-check.mjs`（冻结常量引用与第二真相字面量）。

---

## A. FX-74-1…9 逐条判定

### FX-74-1（恒真断言）——**已修，鉴别力经我自做变异测试证明**

三处新断言落点：`packages/base-render/test/template.test.mjs:140`（原 `:137`）、`:471`＋`:472-474`（原 `:409`）、`:615`（原 `:549`）。原断言已**删除**，非并列保留（`grep` 无 `!('code' in new Error())`、无 `bytes >= html.length`、无 `!none.html.includes(M.chartsHelpers)`）。

**变异测试（我自己改实现 → 必须变红 → 还原 → 必须全绿）**：

| 变异 | 实现改动（`packages/base-render/src/template.ts`） | 命令与结果 | 变红的断言 |
|---|---|---|---|
| (a) 未消费也注入并置 filled | `:395-407` 注入循环删掉 `if (counts[step] === 0) continue;`，改为 `if (counts[step] === 0) { html = html + replacement; filled.add(step); continue; }` | `pnpm build` exit 0 → `node --test packages/base-render/test/template.test.mjs` → `tests 45 / pass 42 / fail 3` | **`template.test.mjs:140`**「0 次合法：未被消费的 charts 资产不得出现在输出」（另 `:166`、`:605`） |
| (b) `TemplateError` 原型链挂到 `RenderError` | `:46` 增 `import { RenderError } from './contract.js';`；`:82` 后增 `Object.setPrototypeOf(TemplateError.prototype, RenderError.prototype);` | `pnpm build` exit 0 → `node --test …template.test.mjs` → `tests 45 / pass 44 / fail 1` | **`template.test.mjs:471`**「TemplateError 不得是 RenderError 的实例（并列、互不继承）」（`:474` 原型链断言同型） |
| (c) `utf8Bytes` 返回 `text.length` | `:208` `new TextEncoder().encode(text).length` → `text.length` | `pnpm build` exit 0 → `node --test …template.test.mjs` → `tests 45 / pass 43 / fail 2` | **`template.test.mjs:615`**「bytes 必须是 UTF-8 字节数（写成 UTF-16 码元数即红）」（另 `:652`） |

**还原证明**：三变异逐次 `Copy-Item .scratch\t74\v4-mutation\template.ts.orig …` 还原 ＋ `pnpm build` ＋ `node --test` → 每次 `tests 45 / pass 45 / fail 0`。终态：
- `(Get-FileHash packages\base-render\src\template.ts -Algorithm SHA256).Hash` = `D7BF65EC8E737F7C19A803EEFD62C10DB42BE7112021B887173139AC5E71AEF9`，与变异前记录**逐字节相同**（其余 8 个被验文件 hash 亦与变异前一致）。
- `git status --short` = `?? .scratch/`、`?? assets/`、`?? 我的想法.md`（均为仓内既有未跟踪项）；`git diff --stat` **空**；`git diff --cached --stat` 空。
- 用例计数守恒：`(Select-String -Path packages/base-render/test/template.test.mjs -Pattern '^\s*it\(' -AllMatches).Count` = **45** = 返修前 36（V1 `v1-behavior.md:5`）＋ 新增 9 → **无既有用例被删或替换成弱断言**。

### FX-74-2（`u003c` 字面量）——**已修**

- `Select-String -Path packages\base-render\src\template.ts -Pattern 'u003c' -CaseSensitive:$false` → **0 命中**（src 与 dist 同）。
- 改引冻结常量：`src/template.ts:45` `import { TEXT_JSON_LT_RULE } from './spec/text.js';`、`:402` `.replace(/</g, '\\' + TEXT_JSON_LT_RULE)`；常量正本 `src/spec/text.ts:129` `export const TEXT_JSON_LT_RULE = 'u003c' as const;`（契约 §3.1:172 点名该常量）。
- 输出等价：`'\\' + 'u003c'` 与旧字面量逐字节同值；行为测试 `template.test.mjs:629-631`（payload 无裸 `<`、含 `u003c`、`JSON.parse` 逐值等于输入）实跑绿。

### FX-74-3（补边界用例 ＋ 12 条逐条处置）——**已修**

- 新增 9 个 `it()`（45−36），逐条落点：`template.test.mjs:206`（NO-SHARED＋SHARED-CSS×2）、`:213`（多标记重复归因）、`:296`（容器属性五形态）、`:363`（`chartsHelpers` 预包裹）、`:374`（纯空白资产）、`:641`（JSON 载荷 `$&`／`` $` ``／`$'`）、`:657`／`:664`／`:672`（输入形态边界 3 例）。实跑全绿（`tests 45 / pass 45 / fail 0`）。
- 12 条边界逐条处置：补测试 7 条（上表 1／2／4／5／6／8／9）＋ 登记 5 条，登记行**均写明「不冻结也不排除」＋ owner**：`docs/base-paint-contract.md:1063`（N-3 无闭标签，owner 契约）、`:1064`（N-10 资产含标记，owner #76／#78）、`:1065`（strict 继承口径，owner 契约）、`:1066`（非 JSON 保真，owner #77）、`:1067`（`INJECTION_ORDER` 行为断言，owner 契约）；`:1069` 另注 4／8／9 为实现口径。

### FX-74-4／5（门禁口径与判据）——**已写进契约，判据指向入仓文件**

- `docs/base-paint-contract.md:868`：「门禁全绿」**只**读作 `pnpm build`／`pnpm boundaries`／`pnpm test:types` 三条 exit 0 ＋ `pnpm test` 新增失败 = 0；`pnpm test` 整体 exit 1 属既有台账态。同条写明判据 = #92 台账**失败用例名多重集（test 级）**，基线文件为 **`docs/research/t92-baseline-failures.md`（入仓常驻判据）**，并显式**不采用** `.scratch/t74/baseline-fail-names.txt`（FX-74-5）。旁证：`:866`（既有失败台账）、`:919`（§8 同口径）、`:1083`（#74 结论同口径）。
- 我独立复核该判据文件与施工期台账**逐名同量**（见 B 节）。

### FX-74-6（必修 · memo 连带改动面）——**已补，且我逐条对照源码核实为真**

`docs/research/t74-migration-path.md` §2.5：
- `:107-109` 补「**同步删再导出** `src/render/index.ts:3`」——实读 `packages/skill-memo-ilife/src/render/index.ts:3` 确实再导出 `escapeHtml`／`SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／`fillSharedMarkers`；并写明「**漏删则 `tsc` 必红**」。
- `:117-118` 补「**同步改导入面** `test/render.test.mjs:3`」——实读 `packages/skill-memo-ilife/test/render.test.mjs:3` 确从 `../dist/index.js` 导入上述四项。
- `:119-120` 补「**并删 `test/render.test.mjs:37-39`**」——实读 `:37` `escapeHtml('<a>&"')` 逐值断言、`:38` emoji、`:39` 代理对原样，与描述逐字相符。
- 与 bill 同口径对照位：`:56`（§2.1 动作 1「同步删 `src/render/index.ts:3` 的再导出」）——memo 侧现已对齐，**按字面执行不再 tsc 报错**。

### FX-74-7（必修 · 资产替换字节影响 ＋ 批准归属）——**已声明，数字我独立复算为真**

`docs/research/t74-migration-path.md:19-42`（§1.1「资产替换面」）＋ `:202-204`（§5 ④口径修订）＋ `:218`（D4-8 登记）＋ `.changeset/base-paint-fill-template.md:26`。我自写 `css-variants.mjs` 从 `packages/skill-*/src/render/html.ts` 提取字面量复算：

| 项 | 文档声明 | 我的复算 | 结论 |
|---|---|---|---|
| CSS 变体数 | 2（`:29-30`） | `distinctCssVariants = 2` | 一致 |
| 变体 A | bill `:57`／chef `:72` = **440**，含 `.amt{font-weight:700}` | bill 440／chef 440，含该规则 | 一致 |
| 变体 B | home `:63`／schedule `:66` = **419** | home 419／schedule 419，无该规则 | 一致 |
| 首个差异位 | 260（`:30`） | `firstDiffAt = 260` | 一致 |
| HELPERS | 4 家同值 **145**（`:32`） | `distinctHelpersVariants = 1`，len 145 | 一致 |
| 声明行号 | 57／58、72／73、63／64、66／67 | 逐个 MATCH | 一致 |
| 批准归属 | 资产正本 #75；字节改变由 #96 快照门 ＋ 各技能地图 owner 批准；#74 只声明（`:38-40`） | — | 归属明确 |

另：「迁移后输出零变化**只对包裹与转义成立**，不对资产内容成立」（`:41-42`）＋「任何『迁移后 HTML 逐字节不变』的断言在 CSS 侧必假」（`:42`）已显式写死，满足「避免下游误以为零差异」。

### FX-74-8（措辞）——**已修**

`docs/research/t74-escape-html-calorie-diff.md:4-7`：标题行改「**归一前实现（base-paint）**」，并明写「此处的『旧』指 base-paint 自身归一之前，**不是**旧版本／旧共享层——旧基线 `D:\2Study\StudyNotes\SKILLS\公共组件\assets\base.js:14` **本就五字符**（`'` → `&#39;`）」。与 V3 `v3-migration.md:72` 的整改要求逐条对应。

### FX-74-9（其余 7 条）——**逐条修或登记，无默默略过**

| 项 | 要求 | 落点（我实读） | 判定 |
|---|---|---|---|
| ② | 测试导入面 | `t74-migration-path.md:65-66`（bill `test/render.test.mjs:3`）、`:95`（chef `:6`） | 修 |
| ④ | 两文档行号口径 | `:181-183`（声明行 vs 实现体行「各自正确」，取件以声明行为准） | 修 |
| ⑤ | 「同批删除」不可满足 | `:189-192` 改「同一迁移批次（各技能地图执行时）」＋登记并存窗口，承接 D4-2／D4-7 | 修 |
| ⑥ | 「12 个模板」实为 12 处 | `:126-127` 明写 12 处 ＋ calorie 6 处 = 全仓 18 处；`.changeset/…:25` 同步改「12 处预包裹（6 模板 × 2 标记）」 | 修 |
| ⑦ | memo「调用点」措辞 | `:110-113` 改「实指**测试调用**」＋补「`src/render/index.ts:4` 只导出 `MEMO_TEMPLATES, loadTemplate`（**无 `templateFor`**）」（实读 `index.ts:4` 一致） | 修 |
| ⑧ | 5 技能零变化 ＋ `renderPage`／`renderReco` | `:184-185`（5 份本地副本同五字符 → 输出零变化）、`:186-188`（`contract.ts:47`／`:57` 同实现，仓内 0 消费方） | 修 |
| ⑨ | 反推法依赖零字面 `&#39;` | `t74-escape-html-calorie-diff.md:10-12` 补失效条件「真实用户数据含 `&#39;` 时反推法失效，只影响算法不影响结论」 | 修 |

我另独立复核 ⑥ 的计数：memo 6 模板 `<style><!--SHARED-CSS--></style>` 6 处 ＋ `<script><!--SHARED-HELPERS--></script>` 6 处 = 12 处，行号（7/111、8/108、7/65、8/325、7/93、7/96）**逐个 MATCH**；calorie 6 模板各 1 处 → 全仓 18 处，与文档一致。

---

## B. 归档与指针

**归档一致性（自己比 SHA256，逐对）——6／6 全 MATCH**：

```
MATCH  docs/research/t74-migration-path.md          docs/research/t74-migration-path.md
MATCH  docs/research/t74-escape-html-calorie-diff.md docs/research/t74-escape-html-calorie-diff.md
MATCH  docs/research/t74-escape-html-calorie-diff.mjs docs/research/t74-escape-html-calorie-diff.mjs
MATCH  docs/research/t74-verify-v1-behavior.md      docs/research/t74-verify-v1-behavior.md
MATCH  docs/research/t74-verify-v2-gates.md         docs/research/t74-verify-v2-gates.md
MATCH  docs/research/t74-verify-v3-migration.md     docs/research/t74-verify-v3-migration.md
```

**死链扫描**：
- `.changeset/base-paint-fill-template.md`：`Select-String -Pattern '\.scratch'` → **0 命中**；其 `:17`／`:25` 均指 `docs/research/t74-*`（已入仓）。**无死链**。
- `docs/base-paint-contract.md`：`.scratch` 命中 4 处，全部为**负面／已标注**引用——`:868`（`baseline-fail-names.txt`，任务明示可接受）、`:197`／`:777`／`:788`（均写「归档前旧位置、未入仓、**勿据此取件**」，并给出仓内替代）。**可接受**。
- 低（见 D-L1）：`docs/research/t74-migration-path.md:178,179,182,201` 与 `docs/research/t74-escape-html-calorie-diff.md:3,7` 仍指向 `.scratch/…`（该目录 `git status` 为 `?? .scratch/`，未入仓），其中 `:182`／`:201` 的 `docs/research/t74-migration-map.md` **无入仓对应件**。

**`docs/research/t92-baseline-failures.md` 与 `.scratch/t92/test-full.txt` 多重集（自写 `multiset.mjs`）**：

```
baseline counts: {"tests":430,"suites":63,"pass":408,"fail":22}
baseline failing entries: 22  baseline unique: 19
md rows: 19  md total: 22
md-missing (log 有 md 无) = []   md-extra (md 有 log 无) = []
md 与 log 逐名同量 = true
```

→ **22 次／19 唯一名，逐名同量**，与文档 `:4`（总失败次数 22；唯一名 19）一致。低（见 D-L2）：`:31` 含 1 个 U+0008 控制字符。

---

## C. 门禁与改动面（全部实跑，退出码取自 `$LASTEXITCODE`）

| # | 命令 | 退出码 | 关键输出 |
|---|---|---|---|
| 1 | `pnpm build` | **0** | 无诊断 |
| 2 | `pnpm boundaries` | **0** | 7 条 `OK:` ＋ 末行 `boundaries: PASS` |
| 3 | `pnpm test:types` | **0** | 无诊断 |
| 4 | `node --test packages/base-render/test/*.test.mjs` | **0** | `tests 105 / suites 21 / pass 105 / fail 0`（template 45／contract-signatures 46／render 14，逐文件单跑均 exit 0） |
| 5 | `pnpm test` | **1**（既有台账态） | `tests 498 / suites 75 / pass 486 / fail 12 / cancelled 0 / skipped 0 / todo 0` |

**失败多重集比对（自写脚本，不复用施工者脚本）**：

```
baseline counts: {"tests":430,"suites":63,"pass":408,"fail":22}
now      counts: {"tests":498,"suites":75,"pass":486,"fail":12}
baseline failing entries: 22   now failing entries: 12
baseline unique: 19            now unique: 12
新增 = 0 []
消失 = 7 [["#50 envelope 契约：面板路 readViaCli 同键打通不返空",4],
          ["#48 envelope 契约：SKILL 直执行 calorie.help.center …",1],
          ["#50 envelope 契约：SKILL 直执行 bill/chef/home/memo/schedule …",1×5]]
```

- **新增失败 = 0**（与 `docs/research/t92-baseline-failures.md` 台账逐名同量比对）。
- 「消失 = 10 次」（7 个名字）：**全部是台账 A 组**（`docs/research/t92-baseline-failures.md:30` 自述「Windows 全量并行下 CLI spawn 抖动…**不可复现**」），本次运行未复现；V2 当日 `fail 22`（`v2-gates.md:72`）亦为同一抖动的另一种抽样。**非返修引入、非返修修复**。
- 本次 12 条失败逐条列出，全部是 B 组（`dsh-{bill,chef,home,schedule}-ilife client` × 3）＝ `docs/research/t92-baseline-failures.md:31` 归因的 `build:client` 缺项（归 #57–#60／#64）；`Select-String … | Select-String 'base-render|template|contract-signatures|base-paint'` → **0 命中**，base-paint 面零失败。

**改动面与红线**：
- `git status --short -- 'packages/skill-*'` → **空**（技能包零改动）；`git status --short` → 仅 `?? .scratch/`、`?? assets/`、`?? 我的想法.md`（既有未跟踪项）；`git diff --stat` 空 → 未改任何被验文件、未提交。
- 冻结面（自写 `surface-check.mjs`，逐条解析 `HEAD~1` 与工作区 `packages/base-render/src/spec/index.ts`）：

```
old entries 130  new entries 130
signature-changed count: 0
status flips: ["FillTemplate: pending -> implemented","fillTemplate: pending -> implemented"]
implemented: 106  pending: 24  runtime: 88  type: 42
```

→ **条目数 130 不变、签名值零改动、status 翻转恰 2 条且方向正确**，与契约 §8.8／changeset `:19-21` 声明一致。出口面复核：`TemplateError` **未**导出（`import('…/dist/index.js')` → `TemplateError exported: false`），`fillTemplate` 为 function。

**格式**（自写 `format-check.mjs`，读原始 bytes）：16 个被验文件**全部无 BOM、无字面反斜杠 n、CRLF=0、纯 LF**；唯一例外 `docs/research/t92-baseline-failures.md` 含 1 个 U+0008（见 D-L2）。本文件亦按同口径自检（见文末）。

---

## D. 新洞扫描（按严重度）

**高／中：0 条。**

- **L1（低）**：入仓文档仍指向未入仓的 `.scratch/…`——`docs/research/t74-migration-path.md:178`（`docs/research/t74-escape-html-calorie-diff.md`，入仓孪生件在 `docs/research/t74-escape-html-calorie-diff.md`）、`:179`（`.mjs` 同理）、`:182`／`:201`（`docs/research/t74-migration-map.md`，**无入仓对应件**）、`docs/research/t74-escape-html-calorie-diff.md:3`（复跑命令）／`:7`（取证指针）。仓内既有约定（`docs/research/t118-template-inventory.md:3` 的 FX-118-8 口径）是「归档后指针恒为仓内路径」，此处未同步。不影响任何 A／B／C 判据，**不阻塞**。
- **L2（低）**：`docs/research/t92-baseline-failures.md:31` 含 1 个 U+0008 控制字符，渲染成「缺 uild:client」（应为 `build:client`）。该文件作为入仓常驻判据，正文有肉眼可见残字；**多重集判据不受影响**（22／19 已逐名同量复核）。
- **N1（nit）**：`packages/base-render/test/template.test.mjs:630`（`payload.includes('u003c')`）与 `:650`（`payload.includes('$\\u003c')`）把 `TEXT_JSON_LT_RULE` 的值写成字面量，与该文件 `:11` 自述纪律「标记字面量／包裹标签／错误码全部读冻结常量，测试内不自带第二份副本」不符；但该常量**已从 `dist/index.js` 导出**（实测 `TEXT_JSON_LT_RULE exported: true "u003c"`），且此写法客观上充当漂移哨兵。**非第二真相（实现侧零字面量，已证）**。
- **N2（nit）**：`docs/research/t74-escape-html-calorie-diff.md:4` 引 `packages/base-render/src/contract.ts:31-32` 指「归一前」实现——该行号只在 `HEAD~1` 版本成立（实测 `git show HEAD~1:…contract.ts` 的 `escapeHtml` 确在 `:31-32`），现文件该处为注释；文中已标「归一前」，交叉阅读无歧义。
- **N3（nit，V1 已提、不在返修范围）**：`template.test.mjs:475` 硬编码 3 个 `RenderError` 码名（`missing-data`／`bad-envelope`／`reco-only`）而非从实现读码集（V1 `v1-behavior.md:101` 原为 `:410`）。鉴别力正常，仅漂移风险。
- **无新矛盾／第二真相**（自写 `frozen-const-check.mjs`）：`src/template.ts` 仍**恒读全部 15 个冻结常量**（`ASSET_MARKER_KEYS` 4／`ASSET_WRAPPERS` 7／`ASSET_WRAP_RULE` 3／`CONTAINER_CHECK_RULE` 17／`INJECTION_ORDER` 5／`MARKER_RULES` 5／`PAYLOAD_SLOT_RULE` 9／`STRICT_ENVELOPE_FIELDS` 2／`STRICT_ENVELOPE_SHAPES` 2／`TEMPLATE_CHECK_ORDER` 4／`TEMPLATE_KIND_RULE` 3／`TEMPLATE_KINDS` 1／`TEMPLATE_MARKERS` 19／`WRAP_PREDICATES` 5／`TEXT_JSON_LT_RULE` 3，引用计数均 > 0）；剥注释后 `u003c`／`<style>`／`</style>`／`<script>`／`</script>`／`payload`／`application/json`／`<!--`／`-->` 字面量**全部 0 命中**；`dist/template.js` 运行时 import 仅 `./spec/template.js`＋`./spec/text.js`，`parseEnvelope`／`base-link-core`／`node:` **0 命中**。
- **无未授权签名改动**：见 C 节 `signature-changed count: 0`；**无恒真断言**：新增 9 用例逐条审读，鉴别力断言均可因实现错误变红（3 处已由变异测试实证，其余为「必须抛错／必须逐值相等」型）。

V4 结论：通过
阻塞级洞（高/中）数量：0
