# V2 门禁与红线验证 · #92 契约冻结（独立结论）

基准：`.scratch/t92/CONSTRAINTS.md`（§1 B1–B8／Q8／Q12–Q14、§2 八条边界、§6 A1–A7）＋ `.scratch/t92/ARCHITECT-CALLS.md`（AC-1…AC-17）＋ `docs/calorie-architecture.md`。
被验对象：`docs/base-paint-contract.md`、`packages/base-render/src/spec/*.ts`、`packages/base-render/test-d/contract-signatures.ts`、`packages/base-render/test/contract-signatures.test.mjs`、`packages/base-render/src/index.ts`、`.changeset/base-paint-contract-freeze.md`、root `package.json`／`tsconfig.json`。
被验提交：`6d7119c feat(92): base-paint 共享层契约冻结（102 条签名面 + 类型 + 签名测试）`（`git show --name-only` = 14 个文件，全部属 #92 交付物）。
纪律：本验证只读；未改任何源码／配置，未 commit，未 `git stash`／`git checkout`。唯一写入 = 本文件。

---

## 命令实跑

| # | 命令（原文） | 退出码 | 关键输出 | 判定 |
|---|---|---|---|---|
| 1 | `pnpm build` | **0** | `$ tsc -b`，无诊断输出 | 通过 |
| 2 | `pnpm boundaries` | **0** | 7 行 `OK:` + `boundaries: PASS`（link-core 零依赖／render 无运行时依赖／render 不依赖 combos／combos 强依赖 link-core／present 只许字符串级引用／link-core 源码不引用 workspace 包／装配 owner 归一 render） | 通过 |
| 3 | `pnpm test:types` | **0** | `$ tsc -b`，无诊断 | 通过 |
| 4 | `pnpm publish:pre` | **0** | 4 包 `无 workspace: 外泄` + `dsh-calorie 声明 dsh-life-pack ^0.1.0`／`skill-calorie ^0.1.0` + `check-publish --pre：PASS` | 通过 |
| 5 | `pnpm test` | **1** | `ℹ tests 430 / suites 63 / pass 408 / fail 22 / duration_ms 15812.7` + `[ELIFECYCLE] Test failed.` | **不绿（22 失败，全部既有；见下节）** |
| 6 | `node --test packages\base-render\test\contract-signatures.test.mjs` | **0** | `ℹ tests 23 / pass 23 / fail 0` | 签名测试绿 |
| 7 | `node --test test\client-bundle-48.test.mjs` | **1** | `tests 21 / pass 9 / fail 12`（可复现，非并行抖动） | 既有红 |
| 8 | `node --test packages\plugin-bill-ilife\test\smoke.test.mjs` | **0** | `tests 7 / pass 7 / fail 0` | 单跑转绿 |
| 9 | `node --test packages\plugin-chef\test\smoke.test.mjs` | **0** | `tests 7 / pass 7 / fail 0` | 单跑转绿 |
| 10 | `node --test packages\plugin-home-ilife\test\smoke.test.mjs` | **0** | `tests 7 / pass 7 / fail 0` | 单跑转绿 |
| 11 | `node --test packages\plugin-schedule-ilife\test\smoke.test.mjs` | **0** | `tests 7 / pass 7 / fail 0` | 单跑转绿 |
| 12 | `node --test packages\plugin-calorie\test\smoke.test.mjs` | **0** | `tests 10 / pass 10 / fail 0` | 单跑转绿 |
| 13 | `node --test packages\plugin-memo-ilife\test\smoke.test.mjs` | **0** | `tests 8 / pass 8 / fail 0` | 单跑转绿 |

注：pnpm 把 `$ <script>` 横幅写 stderr，PowerShell 因此打印 `NativeCommandError` 包裹块；`$LASTEXITCODE` 为权威退出码，上表取的是它。
五命令汇总：**build 0 ／ boundaries 0 ／ test:types 0 ／ publish:pre 0 ／ test 1**。

---

## A4 争议取证

### 0. 计数核对

`pnpm test` 实测 `tests 430 / pass 408 / fail 22`，与争议中给的 430／408／22 一致。22 = 430 − 408，无 skip／todo／cancel。

### 1. 22 条失败逐条归类（文件 / 用例名 / 断言原文）

**A 组：6 个 plugin smoke 文件，10 条**（错误签名 = 子进程 stdout 空白）

| # | 文件:行 | 用例名 | 断言原文 / 抛错 | 条数 |
|---|---|---|---|---|
| A1 | `packages/plugin-bill-ilife/test/smoke.test.mjs:50` | `#50 envelope 契约：SKILL 直执行 bill.help.lookup 回执 key/shape/data 全字段（空库安全）` | `SyntaxError: Unexpected end of JSON input` @ `smoke.test.mjs:53` = `JSON.parse(String(r.stdout))`；其前 `assert.equal(r.status, 0)` 已通过 → **exit 0 + 空 stdout** | 1 |
| A2 | `packages/plugin-bill-ilife/test/smoke.test.mjs:59` | `#50 envelope 契约：面板路 readViaCli 同键打通不返空` | `Error [SkillBridgeError]: 出口非 JSON` @ `dist/bridge.js:82`，`code: 'bad-json'` | 1 |
| A3 | `packages/plugin-chef/test/smoke.test.mjs:50` | `#50 envelope 契约：SKILL 直执行 chef.help.lookup …` | 同 A1（`smoke.test.mjs:53`） | 1 |
| A4 | `packages/plugin-chef/test/smoke.test.mjs:59` | `#50 envelope 契约：面板路 readViaCli 同键打通不返空` | 同 A2 | 1 |
| A5 | `packages/plugin-home-ilife/test/smoke.test.mjs:50` | `#50 envelope 契约：SKILL 直执行 home.help.lookup …` | 同 A1 | 1 |
| A6 | `packages/plugin-home-ilife/test/smoke.test.mjs:59` | `#50 envelope 契约：面板路 readViaCli 同键打通不返空` | 同 A2 | 1 |
| A7 | `packages/plugin-schedule-ilife/test/smoke.test.mjs:50` | `#50 envelope 契约：SKILL 直执行 schedule.help.lookup …` | 同 A1 | 1 |
| A8 | `packages/plugin-schedule-ilife/test/smoke.test.mjs:59` | `#50 envelope 契约：面板路 readViaCli 同键打通不返空` | 同 A2 | 1 |
| A9 | `packages/plugin-calorie/test/smoke.test.mjs:54` | `#48 envelope 契约：SKILL 直执行 calorie.help.center 回执 key/shape/data 全字段` | 同 A1（`smoke.test.mjs:57`） | 1 |
| A10 | `packages/plugin-memo-ilife/test/smoke.test.mjs:60` | `#50 envelope 契约：SKILL 直执行 memo.search 回执 key/skill/shape/data 全字段（空库安全）` | 同 A1（`smoke.test.mjs:63`） | 1 |

**B 组：`test/client-bundle-48.test.mjs`，12 条**（4 包 × 3 条）

| # | 文件:行 | 用例名 | 断言原文 / 抛错 |
|---|---|---|---|
| B1 | `test/client-bundle-48.test.mjs:65` | `dsh-bill-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归）` | `SyntaxError: Cannot use import statement outside a module` @ `packages/plugin-bill-ilife/dist/client.js:7`（`vm.Script`，`test:59`） |
| B2 | `test/client-bundle-48.test.mjs:74` | `dsh-bill-ilife client：factory 可物化，导出 apply/inject，无 node 依赖` | 同上 |
| B3 | `test/client-bundle-48.test.mjs:104` | `dsh-bill-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）` | `AssertionError: dsh-bill-ilife 产物缺 loader 注册头`（`test:106`） |
| B4–B6 | 同上 :65/:74/:104 | `dsh-chef client：…` ×3 | 同 B1/B2/B3，产物 = `packages/plugin-chef/dist/client.js` |
| B7–B9 | 同上 :65/:74/:104 | `dsh-home-ilife client：…` ×3 | 同上，产物 = `packages/plugin-home-ilife/dist/client.js` |
| B10–B12 | 同上 :65/:74/:104 | `dsh-schedule-ilife client：…` ×3 | 同上，产物 = `packages/plugin-schedule-ilife/dist/client.js` |

10 + 12 = 22，与 `fail 22` 完全对上，无第 23 条隐藏失败。

### 2. 失败文件单跑结果

| 失败文件 | 单跑命令 | 结果 | 判定 |
|---|---|---|---|
| 6 个 smoke 文件 | 命令 8–13 | **全部 exit 0**：7/7、7/7、7/7、7/7、10/10、8/8 = 46/46 pass | 失败**不可复现** → 环境/并行争用 |
| `test/client-bundle-48.test.mjs` | 命令 7 | **exit 1**：21 用例 9 pass / 12 fail，失败签名与 `pnpm test` 内完全一致 | 失败**可复现** → 确定性缺陷，非争用 |

### 3. 失败文件是否引用 #92 产物（grep）

对 7 个失败文件逐一 grep `base-paint|base-render|src/spec|SPEC_FROZEN_SURFACE|fillTemplate|TEMPLATE_MARKERS|MARKER_RULES`：

- `test/client-bundle-48.test.mjs`：**NO MATCH**
- `packages/plugin-bill-ilife/test/smoke.test.mjs`：**NO MATCH**
- `packages/plugin-chef/test/smoke.test.mjs`：**NO MATCH**
- `packages/plugin-home-ilife/test/smoke.test.mjs`：**NO MATCH**
- `packages/plugin-schedule-ilife/test/smoke.test.mjs`：**NO MATCH**
- `packages/plugin-calorie/test/smoke.test.mjs`：**NO MATCH**
- `packages/plugin-memo-ilife/test/smoke.test.mjs`：**NO MATCH**

import 面同样零 base-*：`client-bundle-48` 只 import `node:*`；6 个 smoke 只 import `node:*` + 自身包的 `../dist/index.js`（calorie/memo 另加自身 `../dist/bridge.js`／`../dist/slot.js`）。**没有一个失败用例触达 #92 的任何冻结面。**

补充：`packages/base-render/dist/index.js` 对 `slot|bridge|client` 零命中 → #92 的出口面与失败包无交叉。

### 4. 失败能否由「构建产物缺失」或「并行争用」解释

**B 组 = 构建产物缺失，已证到根因：**

- 失败签名是 tsc 原样 ESM 产物：`packages/plugin-bill-ilife/dist/client.js` 仅 721 B，含 `import { TAB_COMPONENT, registerSingle, openSingle } from './slot.js';`，`__ModuleLoader__` 出现次数 = **false**。
- 逐包对比 `dist/client.js` 的 `__ModuleLoader__`：`plugin-bill-ilife=False(721B)`、`plugin-chef=False(715B)`、`plugin-home-ilife=False(721B)`、`plugin-schedule-ilife=False(725B)`、`plugin-calorie=True(12467B)`、`plugin-memo-ilife=True(11517B)`、`plugin-manager=True(9564B)`。
- 根因在 `package.json.scripts`：`plugin-{bill,chef,home,schedule}-ilife` 只有 `"build": "tsc -b"`（无 client 打包步骤）；`plugin-calorie`／`plugin-memo-ilife`／`plugin-manager` 有 `"build:client": "tsdown"`（全仓 `tsdown` 命中仅这 3 包 + 其 `tsdown.config.ts`）。root `pnpm build` = `tsc -b`，从不跑任何包的 `build:client`，故这 4 包**永远不会**产出 loader 工厂包。
- 与 #92 无关的三重证明：① 失败文件与这 4 个 `package.json` 均**不在** `6d7119c` 的 14 文件清单内；② `git log --oneline -1 -- packages/plugin-bill-ilife/package.json` = `1c07c7d feat(50)`，`-- test/client-bundle-48.test.mjs` = `6b0c1e7 fix(48)`，都早于 #92；③ `git show HEAD~1:packages/plugin-bill-ilife/package.json` 的 scripts 同样只有 `"build": "tsc -b"` —— 该缺陷在 #92 之前即已存在。

**A 组 = 并行 spawn 争用，已由测试文件自身注释与单跑对照证实：**

- 测试文件自述该现象：`packages/plugin-bill-ilife/test/smoke.test.mjs:39-40`「Windows 并行 spawn 配额抖动（沿 #41 调查结论，见 `test/combos-42.test.mjs`）：满载时子进程偶发 exit 0 配空白 stdout——产品侧不可能态（出口必出一行 envelope JSON）。仅此签名即时重跑一次；仍坏/他错即真红」，`:47` 实现 `if (r.status === 0 && String(r.stdout).trim() === '') r = spawnCliOnce(args, db);`，`:66-67` 对 `bad-json` 同样重跑一次。
- 即：`pnpm test` 一次拉起 15 个 glob（含全部 skill/plugin/DB 重活，`ℹ duration_ms 15812`），失败是「exit 0 + 空 stdout」这一被文档化的抖动签名；单跑（命令 8–13）负载骤降后 46/46 全绿。
- 与 #92 无关：这些用例走 `spawnSync(process.execPath, [cliPath(), ...args])` 调技能 CLI，链路里没有 base-render；且 #92 的 14 个文件不含任何 skill/plugin 包。

### 5. 结论

- **新增失败 = 0。** 22 条全部为 #92 之前既有、且与 base-paint 冻结面零耦合的失败：
  - 10 条（A 组）= 已知 Windows 并行 spawn 抖动，单跑 46/46 转绿，不可复现；
  - 12 条（B 组）= 4 个 plugin 包缺 client 打包步骤的既有构建配置缺陷，单跑同样红，可复现但与 #92 无关。
- **A4 的字面判据（「`pnpm build`／`pnpm test`／`pnpm boundaries` 全绿」）不成立**：`pnpm test` 退出码 1。该不成立**不可归因于 #92**（新增失败 0），但也不等于字面判据被满足——口径是否放宽为「零回归」需总架构师书面拍板，本验证不代拍。
- 可以确认成立的部分：类型可编译（命令 1、3 = 0）、签名测试可执行且绿（命令 6 = 23/23）、`pnpm build` 0、`pnpm boundaries` 0。

---

## spec 纪律

逐文件读全文（`src/spec/index.ts` 156 行、`template.ts` 121、`style.ts` 63、`controls.ts` 261、`text.ts` 95、`charts.ts` 255、`help.ts` 268）：

| 判据 | 结果 | 证据 |
|---|---|---|
| 无函数体实现 | ✅ | 全目录 `\bfunction\b` 零命中（仅 3 处注释里出现 `node:` 字样：`charts.ts:4`、`controls.ts:5`、`index.ts:7`）；顶层语句全是 `export const`（纯数据）／`export type`／`export interface` |
| 无副作用 | ✅ | 顶层仅有 `Object.freeze(...)` / `as const` / `satisfies` 等纯表达式；无 I/O、无赋值给外部、无 `process.`／`globalThis` 命中 |
| 无第三方 import | ✅ | 全部 import 只有 3 行：`text.ts:10 import type { Envelope } from 'base-link-core'`、`help.ts:12 import type {...} from './template.js'`、`controls.ts:11 import type { CopyFormat } from './text.js'`；`from '(?!\.|base-link-core)` 零命中 |
| 无 `node:` | ✅ | `node:` 零命中（含注释外的真实 import） |
| 只 `import type` base-link-core | ✅ | 唯一跨包 import 即 `text.ts:10`，带 `type` 关键字；`test/contract-signatures.test.mjs:300-309` 的 `src/spec/*.ts 只许 import type` 用例通过 |
| L15 真实成立（dist 侧） | ✅ | `packages/base-render/dist/*.js` 外部 import 仅相对路径（`index.js: [./ui.js,./style.js,./contract.js,./injector.js,./spec/index.js]`），`base-link-core` 在 dist 零命中（`import type` 被擦除），`node:` 零命中；`package.json.dependencies` 为空 |

**`SPEC_FROZEN_SURFACE` 条目数与 status 分布**（实跑 `node -e` 读 `dist/index.js`）：

- `total = 102`
- `status`：**implemented 82 / pending 20**
- `kind`：runtime 68 / type 34（其中 implemented 的运行时项 54、implemented 的类型项 28）
- 票分布：`#74` 15、`#75` 8、`#76` 34、`#77` 20、`#78` 23、`#92` 2
- 章节分布：`3.1` 15、`3.2` 8、`3.3` 34、`3.4` 20、`3.5` 23、`5` 1、`7` 1
- 20 个 pending（= 执行票施工面）：`FillTemplate/fillTemplate`、`BuildStyleSheet/buildStyleSheet`、`CopyText/copyText/createCopyRuntime`、`renderToast/createToastController`、`renderActionBar/renderStatusBadge/renderEmptyState/renderErrorReceipt`、`BuildDataText/buildDataText`、`BuildLogText/buildLogText`、`charts`、`RenderHelpShell/renderHelpShell`
- 一致性：`Object.keys(dist/index.js)` = 72 = 既有 18 + 新增 implemented 运行时 54，与 `SPEC_FROZEN_SURFACE` 自洽（签名测试「新增运行时出口恰好等于清单 implemented 的运行时项」用例通过）。

---

## 命名红线

全仓 grep（`*.ts,*.mjs,*.js,*.md,*.json,*.html`，排除 `node_modules`／`dist`／`.git`）`injector|Injector|inject`：

| 判据 | 结果 | 证据 |
|---|---|---|
| `injector` 只指 sidebar 槽位装配 | ✅ | 源码仅 `packages/base-render/src/injector.ts`（`:1` 头注「装配唯一 owner」、`:48-49` `INJECTOR_DEFAULT_*`、`:52` `mountInjector`）+ `src/index.ts:8-9` 导出 + `spec/template.ts:6-9`／`spec/help.ts:14` 注释；测试侧 `test/render.test.mjs:90` `describe('injector 装配归一')`。无第二处新职责 |
| `inject` 其余命中不构成污染 | ✅ | 全部为 cordis 插件约定（`packages/plugin-*/src/index.ts` 的 `export const inject = [...]`、`package.json` 的 `"inject"`、`src/client.ts` 的 `ctx.slots.inject('ilife.config-tab', …)`——后者正是「槽位装配」，与定调一致）；`packages/skill-memo-ilife/src/render/html.ts:51` 仅注释提「老家 `_inject` 对应」 |
| 禁止清单零实作 | ✅ | `htmlInjector|injectHtml|injectPlaceholders|htmlTemplateInjector|mountTemplate|templateInjector` 全仓命中**只出现在禁止性语境**：`docs/base-paint-contract.md:66-70`（禁止清单表）、`:491`（不许自造）、`spec/template.ts:9`（禁止用法注释）、`docs/research/t92-contract-freeze-brief.md`（上位 brief 本身）。**没有任何代码／导出／文件用这些名字** |
| 无新增 `inject*` 填充函数 | ✅ | `src/**` 内 `export (function|const) inject*` 命中仅 `INJECTOR_DEFAULT_*`（既有）与 `INJECTION_ORDER`（常量，非函数）；HTML 填充器对外名 `fillTemplate`（`spec/template.ts:121`，`status: pending`） |

附带观察（**非 #92 引入**，不判违规）：`packages/skill-bill/scripts/build-help.mjs:28 export function injectHelpBlock()` —— 既有构建脚本，把块注入 `base-combos/HELP.md`（#80 地盘），非 base-paint 占位符填充器，且不在契约 §1 禁止清单内。建议 #74／#79 顺手改名（如 `embedHelpBlock`）以免日后与 `injector` 语义混淆。

---

## 边界与裁决打勾

### §2 八条边界

| # | 边界规则 | 判定 | 证据 |
|---|---|---|---|
| 1 | `base-link-core` 零依赖；源码不得引用任何 workspace 包 | ✅ | `pnpm boundaries`：`OK: link-core 零依赖`、`OK: link-core 源码不引用任何 workspace 包`（命令 2，exit 0） |
| 2 | `base-paint` 无运行时依赖（link-core 仅 dev／`import type`）；不依赖 `base-combos` | ✅ | `OK: render 无运行时依赖（link-core 仅 dev/typeof）`、`OK: render 不依赖 combos`；`package.json.dependencies` 为空；dist 无 `base-link-core` 命中；契约 §4.3 第 2 条 + `docs/base-paint-contract.md:116`（AC-13 全局红线） |
| 3 | `base-combos` 的 `present.ts` 只许字符串级引 key，禁 import render | ✅ | `OK: present 只许字符串级引用，禁 import render`；契约 §4.3 第 3 条（`:452`） |
| 4 | 装配 owner 归一 base-paint：`registerTab`／`openTab`／`mountInjector` 只许住 base-paint | ✅ | `OK: 装配 owner 归一 render（link-core/combos 无自装配）`；契约 §4.3 第 4 条（`:453`） |
| 5 | 缺失阻断不返空：一律抛错（`RenderError` 形态），禁止静默空页 | ✅（措辞待补） | 契约 `:158`「失败**不返回** `html: ''`——一律抛错（边界规则 5）」；`TEMPLATE_ERROR_CODES`／`CONTROLS_ERROR_CODES`／`TEXT_ERROR_CODES`／`CHART_ERROR_CODES`／`HELP_SCHEMA_ERROR_CODES` 五个错误码集 + `*ErrorShape` 形态齐备。⚠️ 但契约未写明新错误形态与既有 `RenderError`（`contract.ts`，code 集 `missing-data|bad-envelope|reco-only`）的关系：是继承、并行还是复用？「`RenderError` 形态」只在本票里体现为「有 name/code/message」，属**留一句没写** |
| 6 | 样式只抖 base-paint；类名前缀 `ilife-`；token 表冻结；单品包禁自带样式常量 | ✅ | 契约 §3.2 `:197-201`（`STYLE_SHEET_ID='ilife-base'`、`CONTROL_STYLE_SECTIONS` 闭集、`STYLE_FORBIDDEN_TOKENS`、「单品包禁自带样式常量（边界规则 6）」）；`spec/style.ts:7-9` 头注同口径 |
| 7 | 浏览器侧资产必须 browser-safe（不得出现 `node:`） | ✅ | 契约 §4.3 第 7 条（`:456`）；签名测试「dist 资产 browser-safe」用例通过；实测 dist 无 `node:` |
| 8 | 术语以 `CONTEXT.md` 为准（设置面／干活面／sidebar槽／技能功能页） | ⚠️ **未落笔** | 契约全文 grep `CONTEXT` = **0 命中**；术语本身合规（用「sidebar 槽位装配」`:54,58,98`，无「侧边栏／前端页」等冲突词；`面板` 仅出现在 `:91` 旧侧 `confirm` 归属说明与 `:283-284` 纯 HTML 用法描述）。判为**遗漏引用**而非误用 |

### §1 B1–B8／Q8／Q12–Q14

| 编号 | 约束 | 判定 | 证据 |
|---|---|---|---|
| B1 | 含 v1.30 逐条对照表；不许逐字搬旧实现 | ✅ | `docs/base-paint-contract.md` §2（`:75-108`）26 行表，`有 2 / 部分 7 / 无 17`（`:108`）；签名测试「§2 覆盖 v1.30 全部 26 项且判定合法」断言 26 行 × 7 列 + 判定 ∈ {有,部分,无}，通过 |
| B2 | envelope `shape` 取代 snapshot；保留 `buildDataText`／`buildLogText` | ✅ | `:86`（§6.1 行，snapshot 不移植）、`:336`（「snapshot 结构接口**不移植**（B2）」）、§3.4 `:316-323` 冻结 `SerializableEnvelope`/`DataTextInput`/`BuildDataText`/`buildDataText`/`BuildLogText`/`buildLogText` |
| B3 | base-paint 统一填充；技能可留私有模板但必须走同一填充器 | ✅ | `:162`「**B3 强约束**：技能可保留私有模板，但**必须走同一填充器**；技能侧 `SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／`fillTemplate`／`fillSharedMarkers` 全部删除」；`:428` HELP 壳不得自填 |
| B4 | 去掉图表白名单例外 | ✅ | `:106`（§2 行「不移植（B4）」）、`:401`（§3.5.1「白名单例外 … **不移植**（B4）」）；签名测试断言文档含 `**不移植**（B4）`，通过 |
| B5 | `08 规范` 不移植 | ✅ | `:102`「**不移植**（B5）」+ 理由（改由 `ACTION_BAR_DEFAULTS`／`CSS_VAR_TOKENS`／`CHART_BREAKPOINTS` 承载） |
| B6 | HELP 形态 = HTML 速查台 | ✅ | `:22`、§3.5.3 `:425`「形态：HTML 速查台（B6）」+ 分区结构 + `:427` 一键复制 + `:429` #88 复用面 |
| B7 | `formPrompt`／`selectList`／`smartSelect` 归插件 client；不得出现在 base-paint；写明归属边界 | ✅ | §2 五行均写「**不移植**（B7 → 插件 client）」+ 理由（`:89-94`）；§4.1 `:440` 显式清单（含 `confirm`／`foldBox`）+ `:442` 边界判定法；签名测试「B7：交互控件不得进 base-paint」断言 5 个名字既不在清单也非运行时出口，通过 |
| B8 | base-* 三包统一版本 | ✅ | §5 `:479`（三包统一版本、#79 用 changesets `fixed` 组落地、现 `"fixed": []`） |
| Q8 | 不保留 `status`，以 envelope 为准，不引入 `ok/warn/fail` | ⚠️ **消歧缺失** | envelope 侧合规：`:83`「旧 `status/data.meta/scene` 不得直接搬（Q8）」；但全文 `Q8` 仅命中 `:12`（索引）与 `:83`，**未写一句**说明 `STATUS_KINDS=['ok','warn','danger','empty']`（`:224`）与 `TOAST_ICONS` 含 `ok/warn/danger`（`:220`）是 v1.30 **视觉徽章枚举**、与 envelope `status` 无关。冻结契约的验收口径是「无需再猜」，此处读者会撞上 Q8 字面 |
| Q12 | 视觉目标锁 B1；token 口径以 B1 为标 | ✅ | `:60`、`:197`「`--blue: #007aff` 与 Q12 锁定的 B1 主色一致 → 主色口径按 B1，不得改」；签名测试断言 `CSS_VAR_TOKENS['--blue'] === '#007aff'`，通过 |
| Q13 | 复制走 Base P0 双通道，不得只留 `execCommand` | ✅ | `:266-277`（`COPY_CHANNELS=['clipboard','fallback']`、「**不得只留 `execCommand`**」、空串短路、失败徽章恒在）；签名测试「复制双通道逐字」通过 |
| Q14 | 不引入 `--r-xl`／`--pink`／深色区 | ✅ | `:198`（`STYLE_FORBIDDEN_TOKENS = ['--r-xl','--pink']` + 「不得引入深色区」）；签名测试断言 token 恰 11 个且禁入项逐值，通过 |

### §6 A1–A7

| 编号 | 判据 | 判定 | 证据 |
|---|---|---|---|
| A1 | 26 项全覆盖，每项有判定 + 新落点 + 新签名（或不移植理由） | ✅ | 签名测试「§2 覆盖 v1.30 全部 26 项且判定合法」逐行断言 `r.length === 7`、判定合法、`:173-174` 新落点与新签名非空，通过 |
| A2 | top5 冻结签名完整 | ✅ | §3.1 填充器 15 条／§3.2 样式 8 条／§3.3 控件 34 条／§3.4 序列化 20 条／§3.5 图表+HELP 23 条 = 100 条 + §5／§7 各 1 = 102 |
| A3 | 命名区分无歧义（文档 + 代码落点） | ✅ | §1（`:52-73`）+ 禁止清单表 + `spec/template.ts:6-9`；全仓禁止名零实作（见「命名红线」） |
| A4 | 类型可编译；签名测试可执行且绿；三命令全绿 | ⚠️ **部分** | 类型可编译 ✅（命令 1、3 = 0）；签名测试绿 ✅（命令 6 = 23/23）；`pnpm build` 0 ✅／`pnpm boundaries` 0 ✅／**`pnpm test` 1 ❌**。22 条失败新增数 = 0（见 A4 争议取证），但字面「全绿」不成立 |
| A5 | 独立性：#74–#78 仅凭文档＋类型可实现，且写明「用哪些签名、不许自造什么」 | 未在本次范围内（V1 职责） | 仅记录可核事实：§6.1–§6.5 每票均有「**用**」／「**不许自造**」／「**验收怎么测**」三栏（`:488-516`） |
| A6 | 版本机制（B8）与 B7 归属边界写明 | ✅ | §5（`:471-482`）＋ §4.1（`:436-442`） |
| A7 | 文档格式合规（真实换行、无字面反斜杠+n、无 BOM） | ✅ | 见「格式」节 |

---

## 格式

逐字节实测（`[System.IO.File]::ReadAllBytes` + `ReadAllText`）：

| 文件 | BOM | CRLF 数 | 纯 LF 数 | 字面反斜杠+n |
|---|---|---|---|---|
| `docs/base-paint-contract.md` | False | 0 | 533 | False |
| `packages/base-render/src/spec/index.ts` | False | 0 | 156 | False |
| `packages/base-render/src/spec/template.ts` | False | 0 | 121 | False |
| `packages/base-render/src/spec/style.ts` | False | 0 | 63 | False |
| `packages/base-render/src/spec/controls.ts` | False | 0 | 261 | False |
| `packages/base-render/src/spec/text.ts` | False | 0 | 95 | False |
| `packages/base-render/src/spec/charts.ts` | False | 0 | 255 | False |
| `packages/base-render/src/spec/help.ts` | False | 0 | 268 | False |
| `packages/base-render/test-d/contract-signatures.ts` | False | 0 | 226 | False |
| `packages/base-render/test/contract-signatures.test.mjs` | False | 0 | 310 | False |
| `.changeset/base-paint-contract-freeze.md` | False | 0 | 9 | False |

- `## ` 独占行：`docs/base-paint-contract.md` 的 8 个二级标题（`:3,52,75,110,434,471,484,518`）全部 `## ` + 空格；`^##` 而不带空格的命中全部是 `###`／`####` 三级／四级标题，无违规。
- 签名测试自带两条格式断言（「格式合规：无 BOM、无字面反斜杠 n」）并通过；`pnpm test` 中该用例亦绿。

---

## 改动面

- `git status --short`（跑完 5 命令后复核，与开跑前一致）：
  - 已修改：`docs/agents/dsh-client-contract.md`、`packages/plugin-calorie/src/dsh-ctx.ts`、`packages/plugin-calorie/src/index.ts`、`packages/skill-calorie/package.json`
  - 未跟踪：`.changeset/skill-provider-56-calorie.md`、`.scratch/`、`assets/`、`packages/plugin-calorie/src/skill-provider.ts`、`packages/plugin-calorie/test/skills-provider.test.mjs`、`我的想法.md`
- `git diff --stat` = 上述 4 个已跟踪文件（71 insertions / 2 deletions），**无一个属 #92**：#92 的交付物已全部落在 `6d7119c`。
- **未碰 `packages/skill-calorie/package.json`**：`git show --name-only 6d7119c` 不含它；`git log --oneline -1 -- packages/skill-calorie/package.json` = `1519c10 chore(release)`。工作区那条改动（`files` 加 `"SKILL.md"`）是 #48/#56 的既有未提交改动，非 #92。
- **未碰 `packages/base-combos/HELP.md`**：`git status --short -- packages/base-combos/HELP.md` 为空、`git diff --stat` 为空；跑测试时脚本打印「HELP 已注入」但产出与已提交内容一致（`present.ts` 同样保持 clean）。
- **未碰 `D:\2Study`**：该树最新 3 个文件的 mtime 为 `2026-09-08 16:07:23`（`wizard-ilife-014.sh`）、`12:36:03`、`12:30:12`，均早于本次会话（当前 `2026-09-08 23:03:29`）。
- **既有 export 只被追加、未删改**：`git diff HEAD~1 -- packages/base-render/src/index.ts` 仅 `+2` 行（一条注释 + `export * from './spec/index.js';`）；`HEAD~1` 的 9 行原样保留。签名测试「既有 18 个出口仍在（D4 只追加）」与 `test-d` 的 `_B01–_B20` 锁形断言均通过。
- 另两项配置改动（均在 #92 内、均属 D3 接线）：root `package.json` 增 `"test:types": "tsc -b"`；root `tsconfig.json` `include: []` → `["packages/base-render/test-d"]`。二者不改任何既有脚本／references。

---

## changeset

`.changeset/base-paint-contract-freeze.md`（9 行，UTF-8 无 BOM、纯 LF）：

- frontmatter：`'base-paint': minor`。
- 正文写明：新增 `docs/base-paint-contract.md` + `src/spec/*`（type-only 类型与纯数据常量）+ 签名测试；「base-paint 只**追加**导出，既有 18 个运行时出口与 12 个类型出口零改动」。
- 与 B8／AC-10 自洽性：**自洽**。① AC-10 要求「签名变更 = 破坏性变更，须走 changeset」→ 有 changeset（additive 冻结面取 `minor`，符合契约 §5 `:480`「minor 起」）；② AC-10 要求「#92 只写机制与现状，不实际升版（#79 落地）」→ 未改任何 `version` 字段，升版动作留给 `changeset version`；③ **只 bump base-paint 有说明**：`:9`「版本口径（B8）：本 changeset 只声明 base-paint 的契约新增；base-* 三包**统一版本**由 #79 的 changesets `fixed` 组落地，本票不单独升 `base-link-core`／`base-combos`」；④ 签名测试「版本口径（B8／AC-10）＋ changeset 交付（D5）」断言 changeset 含 `'base-paint': minor`、`#92`、`#79`，通过。
- 遗留交接（已由 AC-10／AC-15 授权，非本票缺陷）：在 #79 落地 `fixed` 组之前，若有人先跑 `changeset version`，base-paint 会单独升到 0.2.0 而另外两包停在 0.1.0，短暂违反「统一版本」。建议 #79 与本次发版顺序绑定。

---

## 必须修的前 3 条

1. **A4 口径落地（门禁）**：`pnpm test` 退出码 1（22 失败）。本验证已证**新增失败 = 0**，故须由总架构师二选一并写进票面：① 书面把 A4 从「三命令全绿」改为「三命令零回归（新增失败 0）」，并同时开票承接 B 组 12 条（`plugin-{bill,chef,home,schedule}-ilife` 补 `build:client: tsdown`）；② 或维持字面判据、把 #92 置为「门禁未达标但契约无缺陷」的挂起态。**不得默认豁免而不留痕。**
2. **Q8 消歧（契约）**：`docs/base-paint-contract.md` §3.3 补一句——`STATUS_KINDS=['ok','warn','danger','empty']`／`TOAST_ICONS` 是 v1.30 **视觉徽章枚举**，与 Q8 所指 envelope `status` 无关；envelope 侧仍以 `shape` 为准、无 `status` 字段。否则冻结契约在 Q8 上留了「仍需猜」的口。
3. **边界规则 5／8 落笔（契约）**：① 写清新错误形态（`TemplateError`／`ControlsError`／`TextError`／`ChartError`／`HelpSchemaError`）与既有 `RenderError` 的关系（继承／并行／由 `RenderError` 包裹），对齐 §2.5「`RenderError` 形态」；② 补一句术语口径「术语以 `CONTEXT.md` 为准（设置面／干活面／sidebar槽／技能功能页）」，目前全文 `CONTEXT` 零命中。

（次要观察，建议顺手处理但不单独阻塞：`test/contract-signatures.test.mjs:250-254` 把 `escapeHtml("'") === "'"` 这条**已知不符 AC-14 五字符**的现状断言固化为绿；契约 `:293`、`:532` 已声明它是「待翻转哨兵」，但绿着的断言与冻结的五字符集在同一份测试里并存，建议改为显式 `TODO` 型断言或加断言注释锚点，避免 #74／#79 误当既有契约。另 `packages/skill-bill/scripts/build-help.mjs:28 injectHelpBlock` 建议改名以免与 `injector` 语义混称。）

V2 结论：不通过（A4 字面「pnpm test 全绿」不成立；红线与 §1／§2 其余各条全守，22 失败新增数 0，须修的是上列 3 条）
新增失败数：0
