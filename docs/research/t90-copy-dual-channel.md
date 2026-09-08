# #90 · 复制交互走 Base P0 双通道（Q13／契约 §3.3）— 落地证据

> 票面：`gh issue 90`《复制交互走 Base P0 双通道》（map `#63`，`wayfinder:task`）。
> 契约出处：`公共组件/docs/help-template-contract.md:98`（旧侧，`D:\2Study\StudyNotes\SKILLS\公共组件\docs\`）→ 新契约 `docs/base-paint-contract.md` §3.3（`doc:388-495`）／§4.1（`doc:858`）。
> 基线：`master` @ `e8ccb63`。工作副本：`.scratch/t90/`。

## 0. 结论（前置）

1. **接线已落地，且只落在本图内的 `skill-calorie`**：新增 `packages/skill-calorie/src/render/copy.ts`（复制接线唯一入口），并把 `renderPhotoHelpHtml`（`calorie.help.center` 页）改为「每行复制按钮（`data-action-id` ＋ `data-t`）＋ 页尾注入页面侧运行时」。技能侧**零复制实现**——运行时逐字取 `buildSharedHelpersJs()` 的产出，按钮逐字取 `renderActionBar()` 的产出，actionId 逐字取冻结表 `HELP_COPY_ACTIONS.prompt`。
2. **双通道两条路径都有可执行证据**：① 通道 1（`navigator.clipboard`）**真手势真剪贴板**成功——headless Chrome ＋ CDP `Input.dispatchMouseEvent` ＋ `Browser.grantPermissions`，`navigator.clipboard.readText()` 回读文本逐字等于该行 CLI，反馈「已复制」（**这条正是契约 §8.9 台账 76-8 指定由 #90 补的观测**）；② 通道 1 reject → **降级通道 2（`execCommand` 兜底）**被调用并成功，反馈同为「已复制」；③ 两通道皆失败 → 反馈「复制失败」＋ failDetail ＋ danger 类（失败徽章恒在）。
3. **变异自证 5/5 红、还原复绿**：单通道运行时／内联 `onclick` ＋ 丢 `actionId`／漏注入运行时／自造 actionId／技能侧自造复制实现——五种回退各自把本票测试打红（3／8／2／5／1 条），还原后 13 条全绿。
4. **边界**：其余「复制交互」落点（4 技能共享 `copyItem` 片段、calorie 6 个死模板的内联 `copyData()`、memo 6 个模板的 `window.copyText` 调用）**均不在本票**——前两类属各技能地图／`#107`，且落地需先给那 4 个包加 `base-paint` 依赖（`t74-migration-path.md:211` D4-1 已登记为「各技能地图／#95」）。逐条见 §2。

---

## 1. 取证：全仓「复制交互」落点清单

检索口径（全仓，排除 `node_modules`／`dist`）：`copyItem|copyData|copyLog|copyInfo|copyFiltered|copyText|execCommand|navigator.clipboard|writeText|dataset.t|data-t=`，命中 28 个源文件；下表只列**复制交互实现/落点**（契约与证据文档不计）。

| # | 文件:行 | 现状 | 是否属本票 |
|---|---|---|---|
| L1 | `packages/skill-calorie/src/render/help.ts:212-218`（`renderPhotoHelpHtml`，`calorie.help.center` 页） | **零复制交互**（只有 `<pre>` CLI，不可复制）；契约 `docs/base-paint-contract.md:104` 明载「`calorie.help.lookup` 已渲染速查列表但**零复制交互**」 | **是**（本票接线主落点） |
| L2 | `packages/skill-calorie/src/cli/cmd_read.ts:443-456`（`calorie.help.lookup` 内联 HTML） | **零复制交互**；HTML 由 CLI 内联拼接（未走渲染层） | **是（但归属 #93）**——见 §7-1，本票**未改**，只交付可消费的渲染器 |
| L3 | `packages/skill-calorie/templates/*.html`（6 个：`diet`／`exercise`／`goal`／`help`／`home`／`photo-gallery`，均 `:33` 按钮 ＋ `:38` 内联脚本） | **单通道 ＋ 无反馈 ＋ 内联 `onclick`**：`onclick="copyData()"` → `navigator.clipboard.writeText(...)`（无 `execCommand` 兜底、无 toast、无 `actionId`）；且模板 `src/**` 零引用、`files` 不含 `templates`（永不被填充） | **否**（`#107`《6 个死模板并入重建》＋`#88` 壳重建；`t74-migration-path.md:216` D4-6） |
| L4 | `packages/skill-bill/src/render/html.ts:58` | **单通道 ＋ 无反馈 ＋ 无 actionId**：`<script>function copyItem(id){…navigator.clipboard.writeText…}</script>`，经 `fillTemplate` 注入**每个**渲染页；注入后新增**隐式全局 `copyItem`**（AC-7 违规）；全仓**无任何模板调用它**（死函数） | **否**（各技能地图；替换需先加 `base-paint` 依赖，D4-1） |
| L5 | `packages/skill-chef/src/render/html.ts:73` | 同 L4（逐字重复第 4 份；且 chef 生产链零模板调用） | **否**（同 L4） |
| L6 | `packages/skill-home/src/render/html.ts:64` | 同 L4 | **否**（同 L4） |
| L7 | `packages/skill-schedule/src/render/html.ts:67` | 同 L4 | **否**（同 L4） |
| L8 | `packages/skill-memo-ilife/src/render/html.ts:55-61`（`fillSharedMarkers`） | 只做标记替换，**helpers 文本由调用方传入**；本仓无生产调用者，memo 模板里的 `window.copyText`／`window.toast`／`window.buildDataText` 在本仓**无定义者**（跑起来必报错） | **否**（memo 技能地图；`t74-migration-path.md:214` D4-4） |
| L9 | `packages/skill-memo-ilife/templates/*.html`（6 个：`wish_plan`／`wish_complete`／`sync_report`／`memo_query`／`init_report`／`change_category`） | **内联 `onclick` ＋ 调用未定义全局**：`onclick="copyData()"` → `window.copyText(...)`（本仓无产出者）＋ `window.toast(...)`；复制按钮 4～9 处/文件 | **否**（memo 技能地图／D4-4） |
| L10 | `packages/plugin-*`（12 个包） | **复制交互 0 命中**（`grep copy|clipboard|Copy` 全仓插件源码零命中；`plugin-calorie/src/client.ts` 亦无） | **否**（本图 Out of scope：不碰插件包） |
| L11 | `fixtures/help-instances/*.html`（两个旧 HELP 实例，`#94` 冻结入仓） | 旧侧 F1／F2 的 `copyText(text, btn)` ＋ `fallback()`（双通道）——**只读冻结件**，不得改 | **否**（`#94` 冻结面） |
| L12 | `packages/base-render/src/controls.ts`（`copyText`／`bindCopyAction`／`buildSharedHelpersJs`） | **双通道 ＋ toast 反馈的唯一实现**（#76 落地，冻结） | **否**（本票只消费；`packages/base-render/**` 本票禁改） |

**「复制交互」实现计数（本票后）**：仓内**唯一**复制实现 = `base-render/src/controls.ts`（模块侧 `copyText` ＋ 页面侧 `buildSharedHelpersJs` 产出）；技能侧 0 处自造。旧的四份 `copyItem` 片段与 calorie／memo 模板的内联实现仍在，但都属**其它票**（见上表），本票未改。

---

## 2. 本票边界（逐条）

**属本票（已改）**

- **`skill-calorie` 渲染层的复制接线**（L1）：本图（`#63`）唯一在范围的技能；`packages/skill-calorie` 是**唯一已声明 `base-paint` 依赖**的技能包（`package.json` `dependencies: { "base-paint": "^0.1.0" }`），因此也是**唯一能干净消费 Base P0 接口**的落点。
- **接线接缝本身**：`copyRuntimeScriptHtml()`／`copyActionHtml()`／`COPY_RUNTIME_JS` 三个出口，供 `#88`（HELP 速查台）／`#108`–`#113`（内容页）／`#107`（死模板并入）直接消费。

**不属本票（未改，列清归属）**

| 落点 | 归属 | 依据 |
|---|---|---|
| L2 `cmd_read.ts:443-456` 内联 HTML | **#93 的 owner**（编排者 2026-09-09 追加边界：`#93` 正在改 `src/cli/cmd_read.ts`） | 本票**按指令未改**；渲染器 `renderHelpLookupHtml` 已就绪，接线 = 把该处换成一行调用（§7-1） |
| L3 calorie 6 死模板 | **#107**（6 个死模板并入重建）＋ `#88`（HELP 壳） | `t74-migration-path.md:216` D4-6「calorie 6 遗留模板的载荷槽改造与并入 HELP 重建 → #107」 |
| L4–L7 四技能 `SHARED_HELPERS` | **各技能地图**（＋`#95` 发布链） | `t74-migration-path.md:211` D4-1「5 技能 `package.json` 增 `base-paint` 依赖 → 各技能地图／#95」；替换 `SHARED_HELPERS` 必然同时改依赖与 `fillTemplate`，本票红线内不可满足 |
| L8–L9 memo 模板与 `fillSharedMarkers` | **memo 技能地图** | `t74-migration-path.md:214` D4-4「memo 生产接线 → memo 地图（不属 #74）」 |
| L10 插件包 | **插件图 #64／#57–#60** | map `#63` Out of scope：「本图不碰插件包」；且实测 0 命中，无需处置 |
| L11 旧 HELP 实例 | **#94 冻结面** | 只读冻结，禁止改 |
| L12 base-paint 复制实现 | **#76（已冻结）／#78（施工中）** | 本票只消费；`packages/base-render/**` 禁改 |

---

## 3. 改法与改动文件

| 文件 | 改动 |
|---|---|
| `packages/skill-calorie/src/render/copy.ts`（**新增**，48 行） | 复制接线唯一入口：`COPY_RUNTIME_JS = buildSharedHelpersJs()`（页面侧运行时，逐字取产出）；`copyRuntimeScriptHtml()`（`<script>` 包裹）；`CALORIE_COPY_ACTION = HELP_COPY_ACTIONS.prompt`（冻结表）；`copyActionHtml(text)` → `renderActionBar({ copyData: { actionId, label, text } })`；`COPY_BUTTON_ATTRS`（`ACTION_ID_ATTR`／`DEFAULT_DATA_ATTR` 只读转发，供断言）。文件内**零** `navigator`／`document`／`execCommand`／`addEventListener`／`writeText`。 |
| `packages/skill-calorie/src/render/html.ts`（改 3 处） | ① `renderPhotoHelpHtml` 每行追加 `copyActionHtml(h.exec)`，页尾追加 `copyRuntimeScriptHtml()`；② 新增 `helpRowHtml()`（一行 = 标题 ＋ 描述 ＋ `<pre>` CLI ＋ 复制按钮）；③ 新增 `HelpLookupHit` 类型 ＋ `renderHelpLookupHtml(hits, query)`（把 L2 的内联 HTML 收编为渲染器，**本票不接线到 cmd_read**，见 §7-1）。 |
| `packages/skill-calorie/src/render/index.ts`（改 1 处） | 导出 `renderHelpLookupHtml`／`HelpLookupHit`／`CALORIE_COPY_ACTION`／`COPY_BUTTON_ATTRS`／`COPY_RUNTIME_JS`／`copyActionHtml`／`copyRuntimeScriptHtml`。 |
| `packages/skill-calorie/test/render-copy-90.test.mjs`（**新增**，13 用例） | 见 §5／§6。 |

**产出形态（真实回读）**：每个复制按钮为
`<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" data-action-id="ilife-help-copy-prompt" data-t="<该行 CLI 全文>">复制指令</button>`，
页面尾部一次 `<script>` ＋ `buildSharedHelpersJs()` 产出（自带双通道 ＋ toast ＋ `[data-action-id]` 事件委派）。**零内联 `onclick`、零自造 id、零第二套复制实现。**

**页面内 actionId 重复的口径（R27）**：每行写**同一个**冻结 id（`HELP_COPY_ACTIONS.prompt`），与 §3.5.3「每张场景卡逐字写三个复制目标 id」同形（`docs/base-paint-contract.md:426` R27 已记账）；歧义由页面侧委派解决——它读**被点击元素**的 `data-t`，不做 id → 元素反查（本票测试与浏览器实证都断言了这一点）。

---

## 4. 双通道两条路径证据（headless Chrome，真实页面回读）

- 浏览器：`C:\Program Files\Google\Chrome\Application\chrome.exe` **152.0.7977.83**（本机实测；找不到时脚本 `exit 1` **显式失败**，不静默跳过）。
- 页面：**真实产出** `renderPhotoHelpHtml(buildPhotoHelp(), '记身材照')`（10 行 HELP 速查 ＋ 10 个复制按钮 ＋ 运行时），不是手搭夹具。
- 脚本：`.scratch/t90/browser/evidence.mjs`（页面侧桩固定通道）＋ `.scratch/t90/browser/cdp-real-clipboard.mjs`（**零桩**、真手势、真剪贴板）。

### 4.1 通道 1：`navigator.clipboard` 真实成功（CDP 真手势 ＋ 真剪贴板）

```
- 按钮：`ilife-help-copy-prompt`，中心坐标 (52, 199)
- 页面内 navigator.clipboard 存在：true
{ "toast": "TOAST:已复制",
  "clipboardReadText": "node --input-type=module -e \"import { openDb } from 'skill-calorie/dist/index.js'; …" }
实测 5 条断言：PASS 5／FAIL 0
```

断言：点击的是冻结 actionId 按钮 ／ `data-t` 逐字等于该行 CLI ／ 页面内 `navigator.clipboard` 存在 ／ 真手势点击后反馈 = 冻结 `okMessage`（「已复制」）／ **`navigator.clipboard.readText()` 回读文本逐字等于该行 CLI**。
→ 这条补上了契约 §8.9 台账 **76-8**「真实剪贴板成功路径从未在真浏览器里被观测……**后续票：#90 接线时在真实页面（有用户手势）补一次人工观测**」（`docs/base-paint-contract.md:1282`）。

### 4.2 通道 1 失败 → 降级通道 2（`execCommand` 兜底）成功

```
clipboard.writeText → reject("stub-denied")
clipboardCalls = [<该行 CLI>]            # 通道 1 先被尝试
fallbackCalls  = ["copy:<该行 CLI>"]     # 降级到 execCommand 且选区里就是该行 CLI
toast          = "已复制"                 # 降级成功仍出反馈
```
（`evidence-run.txt` 观测页 B；同一页面同一按钮，只改页面侧环境桩。）

### 4.3 两通道皆失败 → 失败徽章恒在

```
clipboardCalls = [<该行 CLI>] ／ fallbackCalls = ["copy"] ／ toast = "复制失败"
detail = "长按选择文本手动复制" ／ 反馈块类名 = "ilife-toast ilife-toast-danger"
```
（`evidence-run.txt` 观测页 C。）

### 4.4 汇总

| 证据 | 断言 | 结果 |
|---|---|---|
| `evidence-run.txt`（页面侧桩 A／B／C 三档） | 21 | **PASS 21／FAIL 0** |
| `cdp-real-clipboard.txt`（零桩 ＋ 真手势 ＋ 真剪贴板） | 5 | **PASS 5／FAIL 0** |

三档共同断言：页面里复制按钮数 = HELP 行数（10）／`data-t` 与页面上可见 `<pre>` 逐字相同（首行、次行）／运行时幂等挂载点恰 1 个／页面零内联事件处理器。

---

## 5. 变异自证（红/绿，逐条）

脚本：`.scratch/t90/mutate.mjs`（每条变异**只改一处** → `pnpm --filter skill-calorie build` → 跑本票测试 → 记录变红用例名 → 还原）。产出：`.scratch/t90/mutation-run.txt`。

| 变异 | 改法 | 结果 | 变红用例（条数） |
|---|---|---|---|
| **M1 单通道运行时** | 页面侧运行时换成本地只走 `navigator.clipboard` 的单通道（= F3 形态） | **红** pass 10／fail 3 | 运行时逐字等于产出者 ／ 双通道（clipboard ＋ execCommand） ／ 技能侧零复制实现 |
| **M2 内联 onclick ＋ 丢 actionId** | 按钮退回「只有 `data-t` ＋ `onclick="copyText(this.dataset.t)"`」 | **红** pass 5／fail 8 | 按钮属性（`ACTION_ID_ATTR`＋`DEFAULT_DATA_ATTR`＋冻结 id）／零内联处理器 ／ lookup 接线 ／ 走 `renderActionBar` ／ 端到端三条（通道 1／降级／双失败） ／ CLI 落盘 |
| **M3 漏注入运行时** | 渲染层只产按钮、不注入运行时 | **红** pass 11／fail 2 | 运行时恰注入一次 ／ CLI 落盘产物带运行时 |
| **M4 自造 actionId** | 不取冻结表，自造 `ilife-calorie-copy-cli` | **红** pass 8／fail 5 | 按钮 id 取冻结表 ／ lookup 接线 ／ 走 `renderActionBar` ／ 端到端通道 1 ／ CLI 落盘 |
| **M5 技能侧自造复制实现** | 在 `copy.ts` 里加 `navigator.clipboard.writeText(...)` | **红** pass 12／fail 1 | 技能侧零复制实现（源码级哨兵） |
| **还原后** | — | **绿** pass 13／fail 0 | — |

还原完整性：`.scratch/t90/pristine/{copy.ts,html.ts}` 与工作区文件 **SHA-256 相等**（实测 `True`／`True`）。

---

## 6. 相关测试（本票范围，未跑全量）

| 命令 | 结果 |
|---|---|
| `pnpm --filter skill-calorie build` | exit 0（`tsc -b` ＋ `build-help.mjs`；`git status` 下 `SKILL.md` 无变化） |
| `node --test packages/skill-calorie/test/render-copy-90.test.mjs` | **13 用例，pass 13／fail 0** |
| `node --test packages/skill-calorie/test/{render-t8,render-t9,render-t10,cmd-read-t11,cli-smoke-t41,render-t41}.test.mjs` | **41 用例，pass 41／fail 0**（既有渲染／出口链无回归） |
| `node --test packages/skill-calorie/test/{skill-t11,cmd-write-40,calorie-c43}.test.mjs` | **24 用例，pass 24／fail 0**（模板存在性断言／写回执 HTML／C43 链无回归） |
| `.scratch/t90/browser/evidence.mjs` | PASS 21／FAIL 0 |
| `.scratch/t90/browser/cdp-real-clipboard.mjs` | PASS 5／FAIL 0 |

未跑 `pnpm test`（全量）——本票红线（#78 门禁基线保护）。未跑 `pnpm boundaries`／`pnpm test:types`：本票未改 `base-*` 包、未动冻结面。

---

## 7. 已知问题／待裁定项

1. **`cmd_read.ts:443-456` 未接线（需编排者协调）**：`calorie.help.lookup` 的 HTML 仍是 CLI 内联拼接，**复制按钮不会出现在该出口**。编排者 2026-09-09 追加边界：该文件归 `#93` 的 owner，本票禁改。渲染器 `renderHelpLookupHtml(hits, q)` 已就绪并通过单测，接线 = 该处替换为一行调用 ＋ import 一行（净改动 ≈ 3 行，删 2 行长内联字符串）。**建议**：由 `#93` 的 owner 或编排者在合流时执行。
2. **`.changeset` 禁写**：本票改了 `skill-calorie`（发布包，`version 0.1.1`），按仓内惯例需一条 patch changeset，但红线禁碰 `.changeset/**` → **由编排者决定是否补**（`copy.ts` 是新增公开出口 ＋ 渲染页新增 `<script>`，属 minor/patch 待定）。
3. **页面侧 helpers 反馈块 vs 模块侧 `renderToast`**：页面侧失败反馈是 helpers 自己的单行块（`ilife-toast ilife-toast-danger` ＋ `ilife-toast-title-detail`），**不是** `renderToast` 的 danger 徽章（`ilife-toast-chip-danger`）。这是 #76 冻结口径（helpers 是页面侧独立实现），本票证据按实际形态断言；若 #88 要求两者 DOM 同构，需走 changeset 改 `buildSharedHelpersJs`（不属本票）。
4. **R27 同 id 多按钮的宿主适配**：`CopyActionHostPort.listActionIds()` 会看到重复 id（HELP 速查每行一个）。页面侧 helpers 委派无影响（读被点击元素）；但**模块侧**适配器（如未来 DSH client 用 `bindCopyAction`）必须按「最近一次激活元素」关联 `readDataText`，否则只会接第一行。本票未接模块侧适配器（无消费者），风险登记给 `#88`。
5. **内容页尚未有复制按钮**：`renderActionBar` 的「复制数据／复制日志」在 calorie 内容页尚无落点（属 `#108`–`#113`）。接线已备好——内容页加按钮后，页尾追加 `copyRuntimeScriptHtml()` 即可（运行时幂等，重复注入等价一次）。
6. **`copyRuntimeScriptHtml()` 目前只被两处 HELP 页调用**：未做「全局自动注入」（避免改动所有页面字节、且 `#96` 快照门尚未建）。若 `#88` 希望统一注入，可在其壳的 `fillTemplate` 资产里带上（`TemplateAssets.sharedHelpersJs` 已就位）。

---

## 8. 复跑命令

```powershell
# 1) 构建
pnpm --filter skill-calorie build

# 2) 本票单测（13 用例）
node --test packages/skill-calorie/test/render-copy-90.test.mjs

# 3) 相关既有测试（41 ＋ 24 用例）
node --test packages/skill-calorie/test/render-t8.test.mjs packages/skill-calorie/test/render-t9.test.mjs packages/skill-calorie/test/render-t10.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/cli-smoke-t41.test.mjs packages/skill-calorie/test/render-t41.test.mjs
node --test packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/cmd-write-40.test.mjs packages/skill-calorie/test/calorie-c43.test.mjs

# 4) 双通道实证（headless Chrome；无浏览器 → exit 1 显式失败）
node .scratch/t90/browser/evidence.mjs
node .scratch/t90/browser/cdp-real-clipboard.mjs

# 5) 变异自证（5 条变异 → 红；还原 → 绿）
node .scratch/t90/mutate.mjs
```

---

## 9. 边界声明

- 本票**未碰**：`packages/base-render/**`、`.changeset/**`、`docs/base-paint-contract.md`、`fixtures/**`、`docs/visual-spec-*.md`、`docs/research/t78-*`／`t80-*`／`t94-*`／`t105-*`、`.scratch/t78/**`；**未碰** `packages/skill-calorie/src/db/**` 与 `src/cli/cmd_read.ts`（编排者追加边界，`#93` 在改）。
- **未执行任何 git 写命令**（仅 `status`／`log`／`diff` 只读；工作区改动由编排者提交）。
- 改动面：`packages/skill-calorie/src/render/{copy.ts,html.ts,index.ts}` ＋ `packages/skill-calorie/test/render-copy-90.test.mjs`；证据与工作副本在 `docs/research/t90-copy-dual-channel.md` ＋ `.scratch/t90/`。
- 未跑全量 `pnpm test`（#78 门禁基线保护）；只跑与本票相关的测试文件（§6）。
