# #88 实施 B 段证据（S4：helpers 扩展 ＋ 卡级复制按钮运行时注入 ＋ helpShell 新类 CSS）

> 票：wayfinder 地图 #63 / 票 **#88《HELP 速查台重建：取 F3 并回补 F1／F2 独有能力》** · 本段＝**实施 B**（方案 v2 的 **S4**，`docs/research/t88-plan.md:132`）。
> 依据：`.scratch/orchestrator/t88-acceptance.md`（A1–A8 冻结）／`t88-rework-order-1.md`（**R1-1／R1-6／R1-8**）／`docs/research/t88-plan.md`（v2 §3／§5）／`docs/research/t88-review-blue.md`（**N-4**／N-2／N-3）／`docs/research/t88-baseline/BASELINE.md`（门禁唯一基准）／**`docs/research/t88-delta-flake-ruling.md`**（编排者 delta 分类裁定，含 §5 泛化签名与五条反滥用守卫）。
> 纪律：`.scratch/` 被 gitignore（`.gitignore:5`）→ 本文件 ＋ 3 个 `.mjs` 是**入仓正本**；现场日志／变异备份在 `.scratch/t88/run-*.log`／`.scratch/t88/mut-backup-b/`（复跑命令见 §10）。
> 禁区自检：**未改** `packages/base-render/src/help.ts`／`cmd_read.ts`／`keys.ts`／`templates/*`／`plugin-*`／其余 5 技能／`#91` CLI 接线／`#106`／`#107`；`packages/skill-calorie/SKILL.md` 全程未变（`run-skillmd-check.log` 每轮追加为空）。

## 0. 提交与文件清单

| # | commit | 内容 |
|---|---|---|
| 1 | `e3690df` | `feat(88): S4 实施 B——helpers 扩搜索/高亮/自动展开/计数/清空/跳页＋Sheet 参数实时预览＋#backTop＋卡级复制按钮运行时注入（R1-1）＋ helpShell 新类 CSS（R1-6）` |
| 2 | `f2d4be0` | `test(88): S4 新测 help-center-js-88.test.mjs（7 用例）＋ 真实浏览器实证 t88-browser-evidence-b.mjs（CDP 29/29）` |
| 3 | `c49b608` | `test(88): S4-3 类名匹配改组件级（禁子串误满足）＋ 变异 MUT-B2 复证红` |

| 路径 | 归属 | 说明 |
|---|---|---|
| `packages/base-render/src/controls.ts`（+~450 行） | 本段声明 | `buildSharedHelpersJs` 功能面扩展（签名不变） |
| `packages/base-render/src/style.ts`（+131 行） | 本段声明 | helpShell 区 11 个新类（R1-6） |
| `packages/base-render/test/help-center-js-88.test.mjs`（新，~490 行） | 本段声明 | 7 用例（5 静态 ＋ 2 真实浏览器） |
| `docs/research/t88-probe-impl-b.mjs`（新） | 本段声明 | 断言式实施探针 **59/59** ＋ 渲染样本生成 |
| `docs/research/t88-browser-evidence-b.mjs`（新） | 本段声明 | CDP 真实浏览器实证 **29/29**（含无 JS 面） |
| `docs/research/t88-impl-b.md`（新，本文件） | 本段声明 | 证据正本 |
| `.changeset/t88-help-center.md` | 本段声明 | 追加「实施 B 段」小节 |
| `.scratch/t88/**` | 本段声明 | 现场日志／变异备份／渲染样本（gitignore） |

## 1. S4 三项逐条「怎么满足 ＋ 证据」

### A. 扩 `buildSharedHelpersJs`（搜索／`<mark>`／自动展开／命中计数／清空／跳页 ＋ Sheet 参数实时预览 ＋ `#backTop`）

- **签名不变**：`SharedHelpersInput` 未动、`BuildSharedHelpersJs` 类型未动、`src/spec/*` 零改动 → 冻结面仍 **130 条 implemented／0 pending**（`contract-signatures.test.mjs` exit 0）。
- **挂进同一个既有 `boot()`、共用同一个幂等 marker**：`controls.ts:651` 在既有 `boot()` 内追加 `initHelpShell();`；产出文本里 `var MARKER_ATTR =` 恰 1 处、`setAttribute(MARKER_ATTR` 恰 1 处、`function boot()` 恰 1 处（测试 S4-1 ＋ 探针 B-P10／B-P11 断言）。
- **类名来源不引 `help.ts`（避免模块环）**：`controls.ts:499` 的 `helpShellSlug()` 用「`CONTROL_STYLE_SECTIONS` 闭集里 kebab 后与 `HELP_SHELL_ID` 同值者」派生，与 `help.ts:87-93` 同构；**延迟求值**（`style → charts → controls → style` 存在模块环，顶层读 `STYLE_PREFIX` 会 TDZ，实测 `ReferenceError` → 改为调用期派生）。两侧一致性由 S4-4 ＋ 探针 B-C4／B-C5 机读钉死。
- **搜索**（`controls.ts:888` `initSearch`／`:928` `runSearch`）：跨分组按 `card.textContent` 过滤 → 未命中加 `card-hidden`、无命中的子功能组加 `subgroup-hidden`；命中卡片 `markCard`（`:983`）走 `wrapTerm`（`:1013`）建 `<mark class="…card-mark">`；命中计数 `匹配 N 个场景`（F3 `#hitC` 逐字）／零命中 `没有找到相关场景,换个词试试～`（F3 `#emptyC` 逐字）；清空复原（移除 mark／hidden／搜索期展开的 `<details>`）；**跳页**＝自动 `jumpTo(hitPages[0])`（切 `:checked` radio）＋ `Enter` 在命中分组页间循环跳。
- **Sheet 参数实时预览**（`controls.ts:819` `initSheetPreview`／`:845` `refreshPreview`）：`editable_fields` 的静态 `.field-value` 换成 `input.field-input`，输入即重组「prompt ＋ 空行 ＋ `label: value` 行」（F3 `buildPrompt` 语义），并同步 prompt／params 复制按钮的 `data-t`（否则复制到编辑前旧文本）。
- **`#backTop`**（`controls.ts:1032` `initBackTop`／`:1058` `syncBackTop`）：`id="backTop"`（H-19 逐字点名）、字形 `↑`；`document.addEventListener("scroll", syncBackTop, true)` ＋ 只读 `document.scrollingElement.scrollTop > 400` 才加 `-show`；点击 `scrollTo({top:0,behavior:"smooth"})`（失败回落 `scrollTop = 0`）。
- **纯度**：只用 `document.*`（含只读 `document.scrollingElement`）＋ 既有只读 `window.matchMedia`；**零** `window.<id>=`／`globalThis.<id>=`／`node:`／`classList`／`inline on*`／`<canvas>`（探针 B-P3…B-P9 ＋ `style.test.mjs` T23／T28 ＋ `contract-signatures` 纯度门全过）。类名增删走 `className` 字符串（`hasClass`／`addClass`／`removeClass`），不触 `classList`。
- **无 JS 降级**：`initHelpShell()` 首行 `document.querySelector(SHELL_SEL)` 为空即 `return`；静态 HTML 里卡级按钮／搜索框／`#backTop` 命中 **0**（S4-5 ＋ 探针 B-S3／B-S5 ＋ 浏览器无 JS 面 B27）。

### B. 卡级复制按钮运行时注入（R1-1，S1 级 parity 项）

- **实现**：`controls.ts:799` `injectCardCopy()` —— 逐卡 `card.querySelector('[' + ACTION_ATTR + '="' + COPY_ACTION + '"]')` 取同卡 Sheet 内 prompt 按钮（**恒读 `HELP_COPY_ACTIONS.prompt.actionId`，不自造**），`document.createElement("button")` ＋ `className`／`textContent`／`setAttribute(ACTION_ATTR/TEXT_ATTR)` 创建，`data-t` 取该按钮原文，注入**卡头** `card-top`（`appendChild`；缺 `card-top` 时 `insertBefore(btn, card.firstChild)`）。**复用既有事件委派**（`controls.ts:663-667` 读 `[data-action-id]` → `getAttribute('data-t')`）→ **零新增监听、零契约变更、零新增 actionId**。
- **幂等**：卡内已有 `.card-copy` 即跳过（`controls.ts:801`）；更强者——删掉幂等 marker 后二次注入同一份 helpers 文本，卡级按钮仍 436（浏览器实证 B25）。
- **断言实测（真实浏览器，436 卡）**：卡头恰 1 个按钮 **436/436**；`data-t` ＝ 同卡 `<pre>` 文本 **436/436**；委派点击复制得到同一文本 **436/436**；`actionId`／文案逐字 **436/436**；`className` 恰为 `ilife-help-shell-card-copy` **436/436**；静态 HTML 卡头按钮 **0**；二次注入不重复 **436／1／1／1**（`t88-browser-evidence-b.mjs` B2…B10／B25；测试 S4-6 同口径用 436 条夹具复证）。
- **未改 `help.ts`**：`git show --stat` 无该路径；卡级按钮为**运行时**元素，壳渲染器零改动。

### C. 新类 CSS（`style.ts` helpShell 区内）

- **落点**：`style.ts:862`（`tab-search`）／`:899`（`page-hitcount`）／`:904`（`card-copy`）／`:922`（`card-mark`）／`:931`（`card-hidden`）／`:934`（`subgroup-hidden`）／`:937`（`field-input`）／`:952`（`btn-backtop`）／`:977`（`btn-backtop-show`）＋ 焦点环 ＋ `:1010` reduced-motion 归零。
- **不越区／不新增 token**：全部规则在 `SECTION_BUILDERS.helpShell` 数组内（`:510` 注释同步登记第二个类名产出者 `controls.ts`）；只用 11 个冻结 token（`--fg/--fg2/--fg3/--line/--card/--soft/--blue/--blue2/--shadow`），`style.test.mjs` T4／T5／T9／T11／T13／T23／T28 全绿。
- **R1-6 双绿实测**：新后缀 `card-copy`／`card-mark`／`card-hidden`／`subgroup-hidden`／`tab-search`／`tab-search-clear`／`page-hitcount`／`field-input`／`btn-backtop` 全部 `startsWith` 既有 `cls()` 实参（T11 归属）；T9 闭集根 `ilife-help-shell` 全覆盖。**v1 被拒名 `help-shell-search` 的鉴别力**由 MUT-B2 证（T11 红）。
- **样式单一来源**：未走技能侧 `extraCss`（`grep extraCss packages/skill-calorie/src` 无新增命中）。

## 2. 真实浏览器实证（headless Chrome ＋ CDP，样本逐字未插探针）

`node docs/research/t88-browser-evidence-b.mjs` → **RESULT: 29/29 fails=0**（样本 sha256 `6b60752b4422f51fe2212eb08b50dc5a087858a617ea93631b5e9210ecc62fca`，1,027,870 B／4,042 行）。

| # | 断言 | 实测 |
|---|---|---|
| B1–B3 | 436 卡／卡头注入按钮 436（每卡恰 1）／落点 `card-top` | 436／436／436 |
| B4–B7 | `data-t` ＝ 同卡 `<pre>` 逐字／actionId／文案／**注入按钮真带新类名（N-4）** | 436／436／436／436（`className` 恰为 `ilife-help-shell-card-copy`） |
| B8–B9 | 该类名有 CSS 规则且生效（computed `border-radius:999px`／`color:rgb(0,122,255)`／`display:flex`（flex 容器内块化）／`cursor:pointer`）／全页零内联 `on*` | true／0 |
| B10–B11 | 委派点击复制 436/436 且文本 = 该卡 `<pre>`／反馈经既有 toast 栈（容量上限 5） | 436／5 |
| B12–B19 | 搜索框（placeholder `搜索全部场景`）／过滤（命中 44，隐藏 392）／`<mark>` 99 个且文本 = 词／命中计数「匹配 44 个场景」／自动展开 44 个 Sheet ＋ 隐藏 35 个子功能组／自动跳到第一个命中页／`Enter` 跳页（`tab-0 → tab-1`）／清空复原 | 全 PASS |
| B20–B24 | `#backTop`（id／`↑`／初始 `opacity:0`＋`pointer-events:none`／42×42／`border-radius:50%`／`fixed` 右下 24px）／**原生滚动** `scrollY=900` → `-show`＋`opacity:1`＋可点击／**可信点击**（`Input.dispatchMouseEvent`）→ `scrollTop 900 → 0`／回顶后再次隐藏 | 全 PASS |
| B25 | 删 marker 后二次注入：卡级按钮仍 436／搜索框 1／`#backTop` 1／marker 1 | PASS |
| B26 | Sheet 参数预览：真实 payload `editable_fields` **0 条**（与 F3 同形，见 §5 偏离 1） | fields=0／inputs=0／sheets=436 |
| B27–B29 | **禁用脚本引擎**（`Emulation.setScriptExecutionDisabled` ＋ reload ＋ `DOM.getOuterHTML`）：436 卡／436 prompt／1308 静态复制按钮／0 卡级按钮／0 搜索框／0 `#backTop`／0 marker；11 个 Tab 标签＋默认选中＋`:checked + page-body` 规则在页内；**原生点击分组标签**（无脚本）→ 选中 `tab-1 → tab-0` | 全 PASS |

**为什么用 CDP 而不是 `--dump-dom`**：本机实测（`.scratch/t88/cdp-scroll-test.mjs`）headless Chrome 在 `--dump-dom`（含 `--virtual-time-budget`）下**不投递原生 scroll 事件**（`win/doc/docCap/html/body` 全 0，而 `scrollTop` 已 = 900），CDP 真实时间下 `window`／`document`（含捕获）均命中 1 → H-19「`scrollY>400` 才出现」**只能**用 CDP 证。另：CDP 下样本页面**原样加载**（零探针注入），断言由驱动侧 `Runtime.evaluate` 完成。**找不到浏览器／CDP 未建立 → exit 2**（绝不静默变绿）。

**测试内嵌浏览器面**（`packages/base-render/test/help-center-js-88.test.mjs` S4-6／S4-7，436 条夹具）：卡头按钮 436／`data-t` 逐字／委派复制／幂等／搜索＋`<mark>`＋计数＋`Enter` 跳页＋清空／Sheet 预览（`<pre>` ＝ prompt ＋ 空行 ＋ `label: value` 行，卡级与 params 按钮 `data-t` 跟随）／`#backTop` 出现与隐藏；S4-7 静态壳 436 卡／1308 静态按钮／0 注入。**注**：`--dump-dom` 在 `scriptEnabled=false` 下输出为空（实测），故 S4-7 用「不注入 helpers」等价物；真实禁用脚本引擎的浏览器证据由 CDP 脚本 B27–B29 承担。

## 3. 门禁实测（全部持锁 `D:\ilife\.scratch\locks\gate.lock`）

| 门 | 命令 | exit | 关键行 |
|---|---|---|---|
| ① | `pnpm build` | **0** | `FINAL_BUILD=0`／`GATE_BUILD=0` |
| ② | `pnpm boundaries` | **0** | `FINAL_BOUNDARIES=0` |
| ③ | `pnpm snapshot:check` | **0** | `FINAL_SNAPSHOT=0`（`OK: 快照 == 实际拉取版`） |
| ④ | `pnpm publish:pre` | **0** | `FINAL_PUBLISH_PRE=0` |
| 靶向 | `contract-signatures`／`style`／`help`／`controls`／`help-center-js-88`／`help-center-88` | **0** | `FINAL_CONTRACT/STYLE/HELP/CONTROLS/S4/SKILL88=0`（变异还原后复跑，`run-final-b-*.log`） |
| 探针 | `t88-probe-impl-b.mjs`（新）／`t88-probe-impl-a.mjs`／`t88-probe-contract.mjs` | **0** | `59/59`／`44/44`／`17/17` |
| 浏览器 | `t88-browser-evidence-b.mjs` | **0** | `RESULT: 29/29 fails=0` |
| 事故自检 | 每轮 `git status --short -- packages/skill-calorie/SKILL.md` | — | 8 轮全部为空（无 `Bin … -> …`，事故票 #124 未复现） |
| 不计入 | `pnpm changeset:status` | 1（环境红） | 基线即红（`BASELINE.md:134-144`），按 R1-9 不列入本票门禁 |

### 3.1 `pnpm test` 失败集 delta（canonical **8 轮**；分类口径＝`t88-delta-flake-ruling.md` §2／§5）

判定命令：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t88/after-b<i>.log`；并集：`node .scratch/t88/union-compare.mjs after-b1..8.log`。

| 轮 | exit | delta | 新增（白名单外） | 签名 | 分类 | 单独复跑 |
|---|---|---|---|---|---|---|
| 1 | 1 | 新增 1 | `#87 ⑧ --output 覆盖：写显式路径、不改名、不碰 calorie_html；--html 为等价别名` | `exit=3221225477`（`0xC0000005`）`output-naming-87.test.mjs:58` 的 `spawnSync` node 子进程，stderr 空 | **B** | 6/6 绿（`run-flake-87-1..6.log`） |
| 2 | 1 | 新增 1 | `T9 目标分析盘 parity：12 键抽查 stat + 缺失阻断` | `exit=3221225477`（`cmd-read-t11.test.mjs:69`） | **B** | 6/6 绿（`run-flake-t11-1..6.log`） |
| 3–7 | 1 | **新增 0** | — | — | — | — |
| 8 | 1 | 新增 1 | `落库 · 体重 log/update/batch/remove：三删法各自真删` | `exit=3221225501`（`0xC000001D`）`cmd-write-40-persist.test.mjs:80` 子进程，stderr 空 | **B**（编排者 §5.3 裁定） | 4/4 绿（`run-flake-persist-1..4.log`） |

- **8 轮并集**：`rounds=8 base=34 union=31 新增=3 消失=5` → **新增 3 条全为 B 类、真 delta 0**（`run-delta-union-b8.log`）。
- **反滥用守卫自检（§5.2 五条）**：① 三个崩溃文件**均不在** #88 路径所有权内、被测对象非本票改动；② stderr **无** expected/actual 业务差异（只有 `exit=<NTSTATUS>`）；③ 三个名字在冻结基线两轮 canonical 日志里均为 **✔ 通过**（`09b:750`／`09c:748` 等）；④ 无同一名字连续 ≥3 轮出现；⑤ 单独复跑证据齐全（上表）。
- **白名单未改**：`git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` = **0 行**（`run-failset-diff-b.log`）。
- **并发上下文（每轮）**：8 轮均在**4 个 session 并行**（#88 实施 B／治理返修／#120／#97）下经锁执行；本 session 的浏览器实证在轮 1 之前已结束、**未与全量测试并行**（其余 session 是否并行跑浏览器无法观测）；期间 `pnpm exec tsc -b --force` 曾两次报出**他人未提交**的 `packages/skill-calorie/src/cli/write.ts(327,451) TS2322`（随后消失），说明当时工作区含他人在途改动。
- **模式纪律**：一律 canonical `pnpm test`（`BASELINE.md:95-99`：`node --test` 直跑 ≠ canonical）。

## 4. 变异自证（红 → 还原 → 绿 ＋ sha256；持锁；`tsc -b --force` 重建）

方法：`.scratch/t88/mutate-b-apply.ps1`（路径守卫含 `packages\base-render\src` ＋ 备份 ＋ 锚点唯一性断言 ＋ 跑前/跑后 sha256）→ `pnpm exec tsc -b --force` → 靶向测试 → `mutate-b-restore.ps1`（回拷 ＋ **touch mtime** ＋ 还原 sha256 自证）→ 重建 → 复跑绿。**未用** `git checkout`／`stash`。

| 变异 | 落点／改法 | 红证据 | sha256（前 → 后 → 还原） | 绿证据 |
|---|---|---|---|---|
| **MUT-B1**（controls.ts，S4 级） | `controls.ts:805` `var text = src.getAttribute(TEXT_ATTR);` → `var text = src.textContent;`（卡级按钮 `data-t` 取错源） | S4 测试 exit 1：`AssertionError: data-t 必须与该卡 <pre> 逐字相等`（`run-mutB1b-red.log`，命中 3） | `771E4B746800F0C2717F352B1783B1687AD0B1610BF5F05D94D4B3AF161F353C` → `41E22AE24AB540CB5564F0243929B13E67309D9069673CADD89DAB81C7E193F0` → **`771E4B74…161F353C`** | S4 测试 exit 0（`run-mutB1b-green.log`） |
| **MUT-B2**（style.ts，S4 级 · R1-6 鉴别力） | `style.ts:862` `'.' + p + 'help-shell-tab-search {'` → `'help-shell-search {'`（换回 v1 被拒类名） | `style.test.mjs` exit 1：T11「helpShell 类名无产出者（臆造）：`ilife-help-shell-search`」＋ S4-3 exit 1：「CSS 缺规则（类名作组件级匹配）：`.ilife-help-shell-tab-search`」 | `C2596FB1C55F986DB94EA4B67334564D130FA1AAFBF47B5C6462DCB52CD55D93` → `60C08E3A29D6E30F4BC3C266EC83ED589AB87439B56CF496B35324E2FC357573` → **`C2596FB1…2CD55D93`** | `style.test.mjs`／S4 双 exit 0（`run-mutB2b-green-*.log`） |
| 附带 | dist 自证 | 变异后 `dist/style.js` 含 `help-shell-search {`＝True、还原后＝False；`dist/controls.js` 同理（`MUTB*_DIST_HAS_MUT*`） | — | — |

**方法论注**：MUT-B2 首轮（`run-mutB2-red-s4.log`）S4-3 未红——`CSS.includes('.x')` 被 `.x-input`／`.x-clear` 子串误满足；已按 `style.test.mjs:99-102` 的组件级口径改为 `cssHasClass`（commit `c49b608`）并复证双红。**这条是自证发现的测试缺陷**（若只看 T11 会漏掉「S4 新类名是否真有 CSS 规则」的自身判据）。

## 5. 偏离记账

1. **Sheet 参数实时预览在真实 卡路里 页面上不可观测**：436 条 prompt 的 `editable_fields` **0 条**（F3 payload 同为 0 条 → 与 F3 同形：代码路径在、数据无）。故该能力由**带字段夹具**在真实浏览器里证（S4-6）；真实页面只登记 `fields=0`（浏览器实证 B26）。**不构成未实现**。
2. **卡级按钮文案取冻结常量 `复制指令`**（F3 卡面是「复制」）：按 R1-1 方案「恒读 `HELP_COPY_ACTIONS.prompt.label`」，不自造第二份文案（探针 B-P12／S4-2）。
3. **`data-t` 在编辑参数后会跟随预览变化**：prompt 目标（卡头 ＋ Sheet 内）＝ 预览文本、params 目标＝`label: value` 行（无字段回落 CLI 文本），与 F3「点击时用当前参数重组 `buildPrompt`」同语义；**初始态（未编辑）逐字等于 `prompt_template`**（B4 的 436/436 即初始态）。若编排者要求「复制恒为原始模板」，属口径变更点。
4. **`#backTop` 用 `document` 捕获监听 ＋ 只读 `document.scrollingElement`**（不用 `window.addEventListener`／`window.scrollY`）：满足派单「只用 `document.*` ＋ 既有只读 `window.matchMedia`」；CDP 实测 `window`／`document` 两侧均能收到原生 viewport scroll 事件，`document` 捕获足够。
5. **`#backTop` 尺寸/位置取 H-19 逐字**（`42px`／`bottom:24px;right:24px`），**未**加 `env(safe-area-inset-bottom)`（toast 已有该写法）：避免与 #89 的「computed bottom=24px」逐值断言冲突，安全区适配登记为可选改进（`t71-old-baseline-inventory.md:635`）。
6. **搜索框落点**：注入在 `tab-bar` **之后**（`tabBar.parentNode.insertBefore(box, tabBar.nextSibling)`），类名仍用 `tab-search`（T11 归属）；未塞进 `<nav class="…tab-bar">` 内以免破坏其 flex 布局。
7. **`--dump-dom` 与禁用脚本不兼容**：`--blink-settings=scriptEnabled=false`／`--disable-javascript` 下 `--dump-dom` 输出为空（本机实测），故「无 JS」在测试内用等价物、在 CDP 里用 `Emulation.setScriptExecutionDisabled` 真禁用。
8. **测试内嵌浏览器面为「不注入 helpers」等价物**（S4-7），非真禁用脚本（见上条）；两者互相印证。

## 6. N-4／R1-1 闭环

| 项 | 蓝队/返修要求 | 本段闭环 |
|---|---|---|
| **R1-1**（S1 级 parity） | S4 增卡级复制按钮运行时注入 ＋ 对应测试（436/436 可点、内容与 Sheet prompt 逐字相等、无 JS 降级） | `controls.ts:799` 注入 ＋ 浏览器实证 B2–B10（436/436／逐字／委派复制／幂等）＋ 无 JS 面 B27（0 注入）；测试 S4-6／S4-7 同口径 |
| **N-4**（T11 `startsWith` 让类名「借道」） | S4 新测必须**显式断言注入按钮真带该类名** | 浏览器 B7 `className` **恰为** `ilife-help-shell-card-copy` 436/436；B8 该类名**有 CSS 规则且 computed 生效**；测试 S4-3 双向（CSS 有规则 ↔ helpers 真产，组件级匹配）＋ S4-6 `classExact`；变异 MUT-B2 证明「类名无产出者／无规则」会红 |
| **R1-6** | 新类名不得撞 T9／T11 | 11 个新类 T9／T11 双绿（`style.test.mjs` exit 0）；MUT-B2 反证 v1 名 `help-shell-search` 会红 |
| **R1-8** | S4 门禁含 `snapshot:check`＋`contract-signatures`＋`style.test.mjs`＋`help.test.mjs` | §3 全部 exit 0 |

## 7. 未做／未确证（诚实登记）

- **未做**：`#91` CLI 接线（`calorie.help.center` 仍走旧 10 键片段）→ **#88 关闭时用户仍看不到新版速查台**（与 #91 的交接点：键语义 ＋ CLI 接线）；`#106` 逐场景 CLI 展示；`#107` 死模板；`#89` 视觉锁 B1 逐值验收（本段只做模块级 ＋ H-19／H-20 可断言面）。
- **未确证**：`pnpm changeset:status` 仍环境红（协议 §2.1 禁 `pnpm install`，未修）；`pnpm doctor`／`publish:tarball`／`publish:fresh`／`publish:plan` 本段未复跑（基线全 0，本段未改发布面）；**原生 scroll 事件在 headless `--dump-dom` 下不投递**（已用 CDP 替代，但「真人有头浏览器」未验）。
- **未测**：其它 5 个技能的页面（helpers 是共享产出面，本段只证「非 HELP 页逐项早退」逻辑＋ HELP 页行为；`snapshot:check` 与 `boundaries` 未覆盖其它技能 HTML 字节）。
- **未做**：`pnpm test` 在变异轮未跑（只跑靶向），影响面＝唯一新增/改动测试文件。

## 8. 风险 top3

1. **`buildSharedHelpersJs` 与 #121／#91 同面冲突**：本段改了同一 IIFE／同一 `boot()`；若 #121 后续再扩，必须继续「同一 marker ＋ 同一 boot」并在本文件 §1A 的断言下复跑（S4-1／B-P10／B-P11 会立刻红）。
2. **共享样式面影响所有技能页面**：`style.ts` helpShell 区新增 11 类 ＋ `controls.ts` 注入面会在**每个**使用 helpers 的技能页执行；本段只证了「无 HELP 壳逐项早退」与 HELP 页行为，**未**逐技能做浏览器实证 → 若某技能页有同名类（`ilife-help-shell-*` 不会）或异常 DOM 结构，风险在 #89／收尾验收暴露。
3. **delta 判定依赖环境稳定**：8 轮中 3 轮出现子进程 NTSTATUS 崩溃（B 类）；若并发负载更高，白名单外新增可能继续出现，需按 `t88-delta-flake-ruling.md` §5 逐条分类留痕（本段已按 §2／§5 完成）。

## 9. 复跑（全部只读；样本／DOM 落 `.scratch/t88/out/`）

```powershell
node docs/research/t88-probe-impl-b.mjs        # 59/59（含样本生成 .scratch/t88/out/卡路里_HELP_preview_b.html）
node docs/research/t88-browser-evidence-b.mjs  # 29/29（headless Chrome ＋ CDP；无浏览器 → exit 2）
node --test packages/base-render/test/help-center-js-88.test.mjs   # 7/7（须持锁）
node --test packages/base-render/test/style.test.mjs               # T9／T11／T23／T28（须持锁）

# 门禁（须持锁；现场脚本 .scratch/t88/final-b.ps1）
pnpm build; pnpm boundaries; pnpm snapshot:check; pnpm publish:pre

# 失败集 delta（canonical；须持锁）
pnpm test *>&1 | Out-File -Encoding utf8 .scratch/t88/after-bX.log
node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t88/after-bX.log
node .scratch/t88/union-compare.mjs .scratch/t88/after-b1.log ... .scratch/t88/after-b8.log
git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt   # 须为空
```

## 10. 渲染样本（交付物 2）

`.scratch/t88/out/卡路里_HELP_preview_b.html`（file 态，`updatedAt='2026-09-09 12:00'` 固定注入）：

| 指标 | 实测 |
|---|---|
| 字节／行 | **1,027,870 B／4,042 行**（A 段样本 1,010,979 B → **+16,891 B**：本段 helpers 产出文本由 ~11.0 KB 增至 **18,446 B**，另加 11 个新类 CSS 进内联 `<style>`） |
| `data-scene-id` | 436（唯一 436） |
| 静态复制按钮（`data-action-id=`） | **1,308**（436×3；卡级按钮为运行时注入，静态 0） |
| 静态卡头按钮／搜索框／`#backTop`／`<mark>` | **0／0／0／0**（无 JS 降级面） |
| 六标记残留／泛化残留 | 0／0 |
| 浏览器内运行时形态 | 卡级按钮 436 ＋ 搜索框 1 ＋ `#backTop` 1 ＋ marker 1 |
