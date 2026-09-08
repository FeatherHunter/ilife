# 新版 base-* 共享层出口实测（#92 取证）

- 票：map #63 子票 #92（冻结 base-* 契约接口，前置 #74–#78）。仓库 `D:\ilife`，branch master。
- 本报告全程只读：未改 `src`／`package.json`／任何配置，未 git commit。唯一写入 = 本文件 + 临时 probe 脚本 `D:\ilife\.scratch\t92\probe-exports.mjs`（其余命令输出只经 stdout 读取，不落盘）。
- 复核对象：`docs/research/t72-shared-layer-gap.md`（t72 报告写于 HEAD `6b0c1e7`；现 HEAD `5aef2cd`）。

---

## 0. 实测环境

| 项 | 实测值 | 证据 |
|---|---|---|
| node | v24.19.0 | `node -v` |
| pnpm | 11.8.0 | `pnpm -v` |
| 仓库 HEAD | `5aef2cd docs(63): 测试接缝收敛为主接缝+共享层边界（spec #114）` | `git log --oneline -3` |
| t72 基线 HEAD | `6b0c1e7` | t72 报告 L3 |
| base-* 源码自 t72 基线是否变过 | **未变**（`git diff --stat 6b0c1e7..HEAD -- packages/base-*` 空；工作树对 base-* 也无改动） | `git status --porcelain -- packages/base-link-core packages/base-render packages/base-combos tooling/check-boundaries.mjs` 空 |
| `pnpm build` | **成功，exit 0**（root script = `tsc -b`，stdout 仅 `$ tsc -b`） | `cmd /c "pnpm build"` → `EXIT=0` |
| 增量导致 dist 陈旧 | 是（dist 时间戳为 2026/9/7）→ 追加 `npx tsc -b packages/base-link-core packages/base-render packages/base-combos --force`，**exit 0**，三包 `dist/index.js` 重建为 2026/9/8 22:48:52 | `Get-ChildItem ...\dist\index.js` 的 `LastWriteTime` |
| 探测方式 | 临时脚本 `node .scratch\t92\probe-exports.mjs`：对三包逐个 `await import()`，先试裸包名（root `node_modules` 无 workspace 链接 → 失败），回落 `packages/<dir>/dist/index.js` 直路径；枚举 `Object.keys(mod)`，记录 `typeof`、函数 `name`/`length`、对象顶层键 | `.scratch\t92\probe-exports.mjs`（可重跑，输出到 stdout） |
| 编译验证状态 | **已编译验证**（force 重建后从 dist 实测；非仅源码层分析） | 同上 |

注：裸包名 `import('base-paint')` 在 root 解析失败（`node_modules` 无 base-* 链接），`base-combos/dist/index.js` 内部 `import 'base-link-core'` 靠 `packages/base-combos/node_modules/base-link-core` 解析成功。

---

## 1. 三包出口实测表

### 1.1 `base-link-core`（npm `base-link-core` v0.1.0）— 运行时出口 **13** 个 + 纯类型出口 **8** 个

| export 名 | 类型 | 逐字签名 | 源码位置 | 一句话职责 |
|---|---|---|---|---|
| `ENVELOPE_VERSION` | const string `'0.1.0'` | `export const ENVELOPE_VERSION = '0.1.0' as const;` | `packages/base-link-core/src/envelope.ts:7` | 信封 semver 版本 |
| `ENVELOPE_SHAPES` | const array(6) | `export const ENVELOPE_SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback'] as const;` | `envelope.ts:10` | 6 形状字面量表 |
| `createEnvelope` | function, `fn.length=1` | `export function createEnvelope<S extends EnvelopeShape>(input: { skill: string; shape: S; key: string; data: EnvelopeDataByShape[S]; }): Envelope<S>` | `envelope.ts:92` | 造信封并逐形状全字段校验（缺即 throw） |
| `parseEnvelope` | function, `fn.length=1` | `export function parseEnvelope(input: unknown): Envelope` | `envelope.ts:108` | 校验未知输入，非法 throw |
| `isEnvelope` | function, `fn.length=1` | `export function isEnvelope(input: unknown): input is Envelope` | `envelope.ts:122` | 布尔守卫（try/catch parse） |
| `assertShapeData` | function, `fn.length=2` | `export function assertShapeData(shape: EnvelopeShape, data: Record<string, unknown>): void` | `envelope.ts:55` | 按形状断言 data 全字段 |
| `createRegistry` | function, `fn.length=1` | `export function createRegistry(knownKeys: readonly string[]): Registry` | `registry.ts:30` | 电话本：`keys/has/resolve`（未知 key throw） |
| `parseRegistryKey` | function, `fn.length=1` | `export function parseRegistryKey(raw: unknown): ParsedKey` | `registry.ts:11` | `skill.combo` 命名空间解析 + 裸 key 拒绝并给修复提示 |
| `runCombo` | function(async), `fn.length=3` | `export async function runCombo<S extends EnvelopeShape>(registry: Registry, req: RunRequest<S>, fetchData: Fetcher<S>): Promise<Envelope<S>>` | `runner.ts:17` | 唯一取数编排：registry → 取数 → envelope |
| `LinkCoreError` | class, `fn.length=3` | `export class LinkCoreError extends Error { constructor(code: string, message: string, options?: { cause?: unknown }) }` | `errors.ts:2` | 错误基类（`readonly code: string`） |
| `EnvelopeError` | class, `fn.length=2` | `export class EnvelopeError extends LinkCoreError { constructor(message: string, options?: { cause?: unknown }) }` | `errors.ts:11` | 码 `ENVELOPE_INVALID` |
| `RegistryError` | class, `fn.length=2` | `export class RegistryError extends LinkCoreError { constructor(message: string, options?: { cause?: unknown }) }` | `errors.ts:18` | 码 `REGISTRY_UNKNOWN_KEY` |
| `RunnerError` | class, `fn.length=2` | `export class RunnerError extends LinkCoreError { constructor(message: string, options?: { cause?: unknown }) }` | `errors.ts:25` | 码 `RUNNER_FAILED` |
| `Envelope<S>` | type only | `export interface Envelope<S extends EnvelopeShape = EnvelopeShape> { version; skill; shape: S; key: string; data: EnvelopeDataByShape[S] }` | `envelope.ts:22` | 信封类型 |
| `EnvelopeShape` | type only | `export type EnvelopeShape = (typeof ENVELOPE_SHAPES)[number];` | `envelope.ts:11` | 形状联合 |
| `EnvelopeDataByShape` | type only | `export interface EnvelopeDataByShape { list; detail; stat; receipt; analysis; fallback }` | `envelope.ts:13` | 形状→载荷映射 |
| `Registry` | type only | `export interface Registry { keys(): string[]; has(key: string): boolean; resolve(key: string): ParsedKey }` | `registry.ts:24` | 注册表接口 |
| `RegistryKey` | type only | `export type RegistryKey = string;` | `registry.ts:4` | key 类型别名 |
| `ParsedKey` | type only | `export interface ParsedKey { skill: string; combo: string; key: string; }` | `registry.ts:8` | 解析结果 |
| `RunRequest<S>` | type only | `export interface RunRequest<S extends EnvelopeShape> { key: string; shape: S; params?: Record<string, unknown>; signal?: AbortSignal }` | `runner.ts:6` | 取数请求 |
| `Fetcher<S>` | type only | `export type Fetcher<S extends EnvelopeShape> = (req: { skill: string; combo: string; params: Record<string, unknown>; signal?: AbortSignal }) => Promise<EnvelopeDataByShape[S]> \| EnvelopeDataByShape[S]` | `runner.ts:13` | 取数函数契约 |

### 1.2 `base-paint`（目录 `packages/base-render`，npm 名 **`base-paint`**）— 运行时出口 **18** 个 + 纯类型出口 **12** 个

| export 名 | 类型 | 逐字签名 | 源码位置 | 一句话职责 |
|---|---|---|---|---|
| `createPageRegistry` | function, `fn.length=0` | `export function createPageRegistry(): PageRegistry` | `packages/base-render/src/ui.ts:35` | 单品页自注册表（重复 slotId throw，返回幂等 disposer） |
| `pageOrReco` | function, `fn.length=2` | `export function pageOrReco(reg: PageRegistry, reco: PageDescriptor): PageDescriptor` | `ui.ts:58` | 缺席纯条件渲染：有页用页，无页用 reco |
| `recoDescriptor` | function, `fn.length=4` | `export function recoDescriptor(skill: string, slotId: string, order: number, title: string): PageDescriptor` | `ui.ts:23` | 推荐安装占位描述子 |
| `STYLE_PREFIX` | const string `'ilife-'` | `export const STYLE_PREFIX = 'ilife-';` | `style.ts:7` | 类名前缀（样式只抖 render 红线） |
| `STYLE_TOKENS` | const frozen object(9) | `export const STYLE_TOKENS = Object.freeze({ radius: 8, gap: 8, fontSize: 13, fg: '#e6edf3', muted: '#8b8b95', accent: '#c084fc', danger: '#f85149', border: '#2a2d35', bg: '#16181d' });` | `style.ts:10-20` | **9 个** token（深色系） |
| `STYLE_VERSION` | const string `'0.1.0'` | `export const STYLE_VERSION = '0.1.0';` | `style.ts:8` | 样式表版本 |
| `cx` | function(rest), `fn.length=0` | `export function cx(...names: Array<string \| false \| null \| undefined>): string` | `style.ts:25` | 类名拼接（自动加前缀，falsy 跳过） |
| `token` | function, `fn.length=1` | `export function token(name: StyleTokenName): string` | `style.ts:30` | 取 token（样式消费唯一入口） |
| `RenderError` | class, `fn.length=2` | `export class RenderError extends Error { constructor(code: RenderErrorCode, message: string) }` | `contract.ts:22` | 渲染错误（`missing-data`/`bad-envelope`/`reco-only`） |
| `RENDER_CONTRACT_VERSION` | const string `'0.1.0'` | `export const RENDER_CONTRACT_VERSION = '0.1.0' as const;` | `contract.ts:10` | 渲染契约版本 |
| `RENDER_ENVELOPE_VERSION` | const string `'0.1.0'` | `export const RENDER_ENVELOPE_VERSION = '0.1.0' as const;` | `contract.ts:12` | 期望信封版本（漂移由单测钉死） |
| `escapeHtml` | function, `fn.length=1` | `export function escapeHtml(s: string): string` | `contract.ts:31` | 转义 `& < > "`（**不转 `'`**） |
| `renderPage` | function, `fn.length=2` | `export function renderPage(page: PageDescriptor, env: Envelope): RenderOutput` | `contract.ts:40` | 实页渲染（reco 误入/data 缺席/版本不符即 throw） |
| `renderReco` | function, `fn.length=1` | `export function renderReco(page: PageDescriptor): RenderOutput` | `contract.ts:50` | 占位渲染（带 `data-missing="1"`） |
| `INJECTOR_DEFAULT_MAX_RETRIES` | const number `10` | `export const INJECTOR_DEFAULT_MAX_RETRIES = 10;` | `injector.ts:48` | 有界重试次数上限 |
| `INJECTOR_DEFAULT_RETRY_MS` | const number `1000` | `export const INJECTOR_DEFAULT_RETRY_MS = 1000;` | `injector.ts:49` | 有界重试间隔 |
| `mountInjector` | function, `fn.length=2` | `export function mountInjector(port: SlotsPort, pages: readonly PageDescriptor[], opts: MountOptions = {}): MountHandle` | `injector.ts:52` | 挂载全部页面描述子（幂等 + 有界重试 + 卸载清理） |
| `openPage` | function, `fn.length=3` | `export function openPage(port: SlotsPort, page: PageDescriptor, sessionId?: string): void` | `injector.ts:104` | path seed 内容型打开；缺席静默返回 |
| `PageDescriptor` | type only | `export interface PageDescriptor { readonly skill; readonly slotId; readonly order: number; readonly title; readonly kind: PageKind }` | `ui.ts:9` | 页面描述子 |
| `PageKind` | type only | `export type PageKind = 'page' \| 'reco';` | `ui.ts:7` | 页面种类 |
| `PageRegistry` | type only | `export interface PageRegistry { registerPage(desc: PageDescriptor): () => void; pages(): PageDescriptor[]; pageForSlot(slotId: string): PageDescriptor \| undefined }` | `ui.ts:27` | 注册表接口 |
| `StyleTokenName` | type only | `export type StyleTokenName = keyof typeof STYLE_TOKENS;` | `style.ts:22` | token 名联合 |
| `RenderErrorCode` | type only | `export type RenderErrorCode = 'missing-data' \| 'bad-envelope' \| 'reco-only';` | `contract.ts:20` | 错误码 |
| `RenderOutput` | type only | `export interface RenderOutput { readonly contractVersion; readonly slotId: string; readonly html: string }` | `contract.ts:14` | 渲染输出 |
| `MountHandle` | type only | `export interface MountHandle { pending(): boolean; dispose(): void }` | `injector.ts:41` | 挂载句柄 |
| `MountOptions` | type only | `export interface MountOptions { readonly maxRetries?: number; readonly retryMs?: number }` | `injector.ts:36` | 挂载选项 |
| `SlotsPort` | type only | `export interface SlotsPort { hasTabs(): boolean; registerTab(entry: TabEntry): () => void; openTab(seed: TabSeed, scope?: TabScope): void }` | `injector.ts:29` | 槽位端口（host 无关） |
| `TabEntry` | type only | `export interface TabEntry { readonly id; readonly title; readonly order; readonly single: boolean; readonly hidden?; readonly component: unknown }` | `injector.ts:11` | tab 注册条目 |
| `TabScope` | type only | `export interface TabScope { readonly sessionId?: string }` | `injector.ts:25` | 打开作用域 |
| `TabSeed` | type only | `export interface TabSeed { readonly type: string; readonly path: string }` | `injector.ts:20` | 打开种子 |

### 1.3 `base-combos`（npm `base-combos` v0.1.0）— 运行时出口 **2** 个 + 纯类型出口 **0** 个

| export 名 | 类型 | 逐字签名 | 源码位置 | 一句话职责 |
|---|---|---|---|---|
| `PRESENT_KEYS` | const array(**87**) | `export const PRESENT_KEYS: string[] = [` … `];` | `packages/base-combos/src/present.ts:3`（`@generated`，由 `scripts/gen-present.mjs` 生成） | 87 个 registry key 字面量（calorie + memo） |
| `comboEnvelope` | function, `fn.length=1` | `export function comboEnvelope(key: string): Envelope<'list'>` | `packages/base-combos/src/index.ts:9` | 骨架占位：key 过 registry 后返回 list 空载荷 |

### 1.4 合计

| 包 | 运行时出口 | 纯类型出口 | 合计 |
|---|---|---|---|
| base-link-core | 13 | 8 | 21 |
| base-paint | 18 | 12 | 30 |
| base-combos | 2 | 0 | 2 |
| **三包** | **33** | **20** | **53** |

---

## 2. t72 §3 判定复核表

口径：本次复核只改「判定」与「理由/证据」；t72 §3 共 26 行（`docs/research/t72-shared-layer-gap.md:360-389`）。

| # | 能力项 | t72 原判 | 实测复核 | 证据 |
|---|---|---|---|---|
| 1 | 占位符标准与填充机制 | 部分 | **判定仍成立**；理由中 2 处与实测不符（见 §6-1/6-2） | base-paint 18 出口零占位符 API（probe）；常量 5 份 `skill-{bill,schedule,home,chef,memo-ilife}/src/render/html.ts:53/62/59/68/52`；错误码 5 个 `*_MARKER_INVALID`；calorie `src/render/*` 零 `SHARED` 引用；**`<!--INJECT-DATA-->` 实测 6 处**（`skill-memo-ilife/templates/{memo_query:64,change_category:110,init_report:107,sync_report:324,wish_complete:92,wish_plan:95}.html`） |
| 2 | `NO-SHARED` + `CHARTS-HELPERS` 占位符 | 无 | **仍成立** | `packages/**` 内 `<!--CHARTS-HELPERS-->`=0、`<!--NO-SHARED-->`=0（74 CSS/74 HELPERS 对比） |
| 3 | payload 信封 + 结构校验 | 有 | **仍成立** | probe：`ENVELOPE_VERSION`/`ENVELOPE_SHAPES`(6)/`createEnvelope`/`parseEnvelope`/`isEnvelope`/`assertShapeData` + `Envelope` 型（`envelope.ts:7-122`） |
| 4 | P0 守卫组 `esc/arr/val/yes/validate` | 部分 | **仍成立**；"至少 3 处 escapeHtml"低估为 **6 处** | 定义点：`base-render/src/contract.ts:31`、`skill-{bill,chef,schedule}/src/render/html.ts:7`、`skill-home/src/render/html.ts:8`、`skill-memo-ilife/src/render/html.ts:8`；calorie 改为 `import { cx, escapeHtml, token } from 'base-paint'`（`skill-calorie/src/render/html.ts:14`）；`arr/val/yes` 零命中 |
| 5 | toast 通用提示控件 | 无 | **仍成立** | 6 处 CLI stderr：`skill-{schedule:36,home:37,bill:34,calorie:64,memo-ilife:16,chef:36}/src/cli/cmd_read.ts` `function toast(msg){console.error(...)}` |
| 6 | `buildDataText`/`buildLogText` | 无 | **仍成立** | `packages/**/*.ts` 零命中 |
| 7 | 复制按钮三件套 `actionBar` | 无 | **仍成立** | `actionBar` 零命中 |
| 8 | `copyText` | 无 | **仍成立** | `copyText` 零命中 |
| 9 | `formPrompt` | 无 | **仍成立** | `formPrompt` 零命中 |
| 10 | `selectList` | 无 | **仍成立** | `selectList` 零命中 |
| 11 | `confirm` | 无 | **仍成立** | `confirm(`/`window.confirm` 零命中 |
| 12 | `foldBox` | 无 | **仍成立** | `foldBox` 零命中 |
| 13 | `statusBadge`/`emptyState`/`errorReceipt` | 部分 | **仍成立** | 三 API 零命中；视觉雏形仍在：`skill-memo-ilife/src/render/html.ts:20` `<div class="hm-empty">暂无记录</div>`，`SHARED_CSS` 串含 `.hm-empty/.receipt/.stat/.analysis` |
| 14 | `smartSelect` | 无 | **仍成立** | 零命中 |
| 15 | 样式 token A 组 + 控件样式 | 部分 | **仍成立** | probe `STYLE_TOKENS` objectKeys 恰 9 个；`packages/base-render/style/tokens.css` 49 B / 3 行；`files:["dist"]` 不含 style |
| 16 | 图表组件 `charts.*` | 无 | **仍成立** | `packages/**/*.ts` 无 `<svg`/`<canvas`/`polyline`/`createElementNS`；calorie 仅 div 进度条 `bar()`（`skill-calorie/src/render/html.ts:55`） |
| 17 | 复合形态 `combo`/`sparkline`/`gauge` | 无 | **仍成立** | 同 #16（无图表层） |
| 18 | 注入器接口 `injector.py` | 部分 | **仍成立** | `base-render/src/injector.ts:1-8` 头注释自述"装配唯一 owner / better-sidebar 槽位注册"；`SlotsPort:29-34`；无 CLI、无 `--strict-payload`、无注入顺序、无 HELP 模式、无结果 JSON |
| 19 | HELP 模板 + scene-data 契约 | 部分 | **仍成立** | `base-combos/scripts/build-help.mjs` 把 combos.yaml 投影成 `HELP.md` 标记块；无 HTML 模板、无 scene-data 契约；t72 附录 B 缺陷**仍在**：`base-combos/HELP.md:66-71` 六行 `undefined：undefined（undefined）` |
| 20 | HELP 速查台一键复制 | 无 | **仍成立**；描述需更正（见 §6-4） | `skill-calorie/src/cli/cmd_read.ts:436`（`calorie.help.center`）与 `:443-456`（`calorie.help.lookup` 已渲染唤醒词 HTML 速查列表）；但**零复制交互**（无 copy 按钮/无 JS） |
| 21 | 版本与变更机制 | 部分 | **仍成立** | 三包 `version=0.1.0`；4 个版本常量；漂移单测 `packages/base-render/test/render.test.mjs:63` `assert.equal(RENDER_ENVELOPE_VERSION, ENVELOPE_VERSION)`；无统一版本表/CHANGELOG；changesets 含 base-* 共 7 条（见 §5） |
| 22 | 与 08-HTML交互规范的关系 | 无 | **仍成立** | `docs/` 递归无文件名含 `08`/`交互` 的文档 |
| 23 | 领域无关声明 | 有 | **仍成立** | 三包 src 无领域词表：base-paint 只认 `PageDescriptor`/`Envelope`；base-combos 只出 key 字面量 |
| 24 | 技能侧专属块 `metaHeader`/`remindersBlock` | 无 | **仍成立** | 零命中 |
| 25 | 控件层测试资产 | 无 | **仍成立**；行数更正 133→**132** | `packages/base-render/test/render.test.mjs` 132 行；root `test/` 15 个 mjs（`link-core.test.mjs` 64 行等）；控件层零测试 |
| 26 | 图表白名单例外 | 无 | **仍成立** | 无图表层 |

**计数：仍成立 26 / 已过时 0。** 其中 4 项（#1、#4、#20、#25）的**判定成立但理由/数字需更正**，见 §6。根因：`git diff --stat 6b0c1e7..HEAD -- packages/base-*` 为空 —— 三包源码与 t72 基线**逐字节相同**。

---

## 3. 占位符注入器现状

### 3.1 全仓 grep 结果（排除 `node_modules`/`dist`/`.git`/`.scratch`）

| 标记 | `packages/**` 出现次数 / 文件数 | 备注 |
|---|---|---|
| `<!--SHARED-CSS-->` | 74 / 74 | 6 个技能模板全覆盖 |
| `<!--SHARED-HELPERS-->` | 74 / 74 | 同上 |
| `<!--INJECT-DATA-->` | **6 / 6** | **仅在 `skill-memo-ilife`** |
| `<!--CONTENT-->` | 60 / 60 | bill/chef/home/schedule 各 16/8/21/8 = **模板 53** + src 常量 4 + 测试 3 |
| `<!--CHARTS-HELPERS-->` | 0 / 0 | — |
| `<!--NO-SHARED-->` | 0 / 0 | — |

按技能拆模板：

| 技能包 | templates | CSS | HELPERS | INJECT-DATA | CONTENT |
|---|---|---|---|---|---|
| skill-bill | 16 | 16 | 16 | 0 | 16 |
| skill-calorie | 6 | 6 | 6 | 0 | 0 |
| skill-chef | 8 | 8 | 8 | 0 | 8 |
| skill-home | 21 | 21 | 21 | 0 | 21 |
| skill-memo-ilife | 6 | 6 | 6 | **6** | 0 |
| skill-schedule | 8 | 8 | 8 | 0 | 8 |

### 3.2 `SHARED_*` 常量与填充者落点

- 定义 `SHARED_CSS_MARKER`/`SHARED_HELPERS_MARKER` 的**只有 5 个技能包**（`export const ... = '<!--SHARED-CSS-->'`）：
  - `skill-bill/src/render/html.ts:53-55`（含 `CONTENT_MARKER`）
  - `skill-schedule/src/render/html.ts:62-64`（含 `CONTENT_MARKER`）
  - `skill-home/src/render/html.ts:59-61`（含 `CONTENT_MARKER`）
  - `skill-chef/src/render/html.ts:68-70`（含 `CONTENT_MARKER`）
  - `skill-memo-ilife/src/render/html.ts:52-53`（**无** `CONTENT_MARKER`）
- 填充函数：
  - `fillTemplate(template: string, contentHtml: string): string` — `skill-bill/src/render/html.ts:60`、`skill-schedule:69`、`skill-home:66`、`skill-chef:75`；调用点 `skill-{bill,schedule,home}/src/cli/cmd_read.ts:450/286/721`
  - `fillSharedMarkers(template: string, css: string, helpers: string): string` — `skill-memo-ilife/src/render/html.ts:55`；**全仓零生产调用**（仅定义 + `packages/skill-memo-ilife/test/render.test.mjs:49,52`）
- 恰一次校验的错误码 5 套：`BILL_MARKER_INVALID`（`bill/src/render/html.ts:63`）、`CHEF_MARKER_INVALID`（`chef:78`）、`SCHEDULE_MARKER_INVALID`（`schedule:72`）、`HOME_MARKER_INVALID`（`home:69`）、`MEMO_MARKER_INVALID`（`memo-ilife:58`）。
- `<!--INJECT-DATA-->` 的**填充者全仓不存在**：`packages/skill-memo-ilife/src` 对 `payload`/`INJECT` 零命中；模板里 `<script id="payload" type="application/json"><!--INJECT-DATA--></script>` 也**没有**任何 `getElementById('payload')` 消费方。
- `tooling/**` 零占位符逻辑（仅 `check-publish.mjs:78-79` 校验 tarball 含 `templates/`）；`packages/plugin-calorie/src` 零命中。

### 3.3 明确回答：base-paint 是否已有 HTML 占位符注入器？

**没有。** 证据：
1. base-paint 的 30 个出口（§1.2）里没有任何 HTML 模板/占位符 API（无 `fillTemplate`/`fillSharedMarkers`/`inject`/`template` 字样）。
2. `packages/base-render/src/injector.ts` 的 `injector` **同名不同物**：它是 DSH sidebar 槽位装配（`SlotsPort.hasTabs/registerTab/openTab`，`injector.ts:29-34`；`mountInjector`/`openPage` 只操作 `PageDescriptor` + `TabSeed`），完全不碰 HTML 文本。
3. 全仓唯一的"填充"是各技能包私有的字符串 `.split(MARKER).join(...)`，且是 2 套语义（bill/schedule/home/chef 给 CSS 包 `<style>`；memo-ilife 原样注入且无调用方）。
4. `packages/base-render/src/contract.ts:45-46` 的 `renderPage` 只是 `JSON.stringify(env.data)` 后转义，**不是页面模板渲染器**。

---

## 4. 门禁规则摘录（`tooling/check-boundaries.mjs`，30 行）

共 **7 条断言**（`assert(cond, msg)`，任一条失败即 `boundaries: N 处破界` + `exit 1`，`L10/L29-30`）：

| 行号 | 规则原文要点 | 实测 |
|---|---|---|
| `L13` | `assert(Object.keys(core.dependencies ?? {}).length === 0, 'link-core 零依赖')` | PASS |
| `L15` | `assert(Object.keys(render.dependencies ?? {}).length === 0, 'render 无运行时依赖（link-core 仅 dev/typeof）')` | PASS |
| `L16` | `assert(!JSON.stringify(render).includes('base-combos'), 'render 不依赖 combos')` | PASS |
| `L18` | `assert(combos.dependencies?.['base-link-core'] !== undefined, 'combos 强依赖 link-core')` | PASS |
| `L20` | `assert(!present.includes('base-paint') && !/from\s+['"].*(?:render\|paint)/.test(present), 'present 只许字符串级引用，禁 import render')` | PASS |
| `L23` | `assert(!/from\s+['"](?:@[A-Za-z_]+\/\|base-\|skill-\|plugin-\|ilife-skills\|dsh-)/.test(coreSrc), 'link-core 源码不引用任何 workspace 包')` | PASS |
| `L25-28` | `assert(!grepHit, '装配 owner 归一 render（link-core/combos 无自装配）')`；`grepHit` = `base-link-core/src` 或 `base-combos/src` 任一文件命中 `/registerTab\|openTab\|mountInjector/` | PASS |

**最容易被违反的 1 条：`L15`（render 无运行时依赖）。** 理由：`base-render/package.json:17-19` 目前把 `base-link-core` 放在 `devDependencies`，而 `contract.ts:6` 用 `import type` 消费 —— 一旦把 HTML 注入器/占位符校验写进 base-paint 并**运行时**调用 link-core 的 `parseEnvelope`/`EnvelopeError`（而非 `import type`），`L15` 与 `L23` 会同时亮红。次易踩：`L16` 是整份 `package.json` 的**子串**检查，哪怕只在 `description`/注释里写 `base-combos` 也 fail。

---

## 5. 版本 / files / changeset 现状

### 5.1 三包 package.json

| 目录 | npm `name` | `version` | `files` | `dependencies` | `devDependencies` |
|---|---|---|---|---|---|
| `packages/base-link-core` | `base-link-core` | `0.1.0` | `["dist"]` | （无） | （无） |
| `packages/base-render` | **`base-paint`** | `0.1.0` | `["dist"]` | （无） | `base-link-core: ^0.1.0` |
| `packages/base-combos` | `base-combos` | `0.1.0` | `["dist"]` | `base-link-core: workspace:^0.1.0` | （无） |

关键差异：**base-paint 对 link-core 是 devDependency + `import type`（可单发）；base-combos 对 link-core 是运行时 `dependencies`（不可单发）**。三包 `engines.node` 均 `>=22.13`，`exports` 均只有 `"."` → `./dist/index.js`（无子路径导出）。

### 5.2 与 base-* 相关的 changeset（`.changeset/` 共 40 个文件，其中 39 个 `.md` + `config.json`；含 base-* 版本影响的 7 个）

| 文件 | 版本影响 |
|---|---|
| `p5-scaffold.md` | `base-link-core` minor + `base-paint` minor + `base-combos` minor |
| `p6-link-core.md` | `base-link-core` minor + `base-combos` patch |
| `p7-render.md` | `'base-paint'` minor |
| `p8-combos-help.md` | `base-combos` minor |
| `combos-41keys.md` | `base-combos` minor |
| `p9-skilllink.md` | `base-combos` patch |
| `memo-m7.md` | `base-combos` patch |

（`t27/t28/t29-calorie-render-*.md` 正文提到 "只引 base-paint tokens"，但**不 bump base-paint 版本**。）

### 5.3 发布链白名单（下游坑）

`package.json:17-20` 的 `publish:pre` / `publish:tarball` / `publish:plan` 均写死 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint` —— **base-link-core 与 base-combos 不在发布集内**。base-paint 可单发（link-core 仅 `import type`），但 base-combos 若将来要发，必须连带 link-core。

---

## 6. 实测与 t72 的差异清单

前置结论：`git diff --stat 6b0c1e7..HEAD -- packages/base-link-core packages/base-render packages/base-combos tooling/check-boundaries.mjs` 为空 → 三包出口面与门禁**逐字节未变**，t72 §2 出口清单与 §6 边界规则**全部复现**。差异只在 t72 的**理由/数字**层面：

1. **t72 §3#1 理由「无 `INJECT-DATA` 占位符约定」不实**：实测 6 处存在（`skill-memo-ilife/templates/{memo_query:64, change_category:110, init_report:107, sync_report:324, wish_complete:92, wish_plan:95}.html`）。正确表述应是"**占位符存在但填充者缺席**"（`skill-memo-ilife/src` 对 `payload`/`INJECT` 零命中，且无 `getElementById('payload')` 消费方）。
2. **t72 §3#1 理由「6 技能各自 `SHARED_CSS_MARKER`」不精确**：定义常量的是 **5 包**（bill/schedule/home/chef/memo-ilife）；`skill-calorie` 只在 6 个模板里留裸标记，src 零引用。
3. **t72 §3#4「`escapeHtml` 至少 3 处独立实现」低估**：实测 **6 处**（base-paint 1 + 5 技能各 1）；且 `skill-calorie` 已 `import { cx, escapeHtml, token } from 'base-paint'`（`html.ts:14`）——收敛度比 t72 记的好一点，但 base-paint 版仍不转 `'`。
4. **t72 §3#20 描述不精确**：`calorie.help.lookup` 已经渲染唤醒词 HTML 速查列表（`skill-calorie/src/cli/cmd_read.ts:443-456`，含 `ilife-item`/`<pre>` cli 串），并非"只返回照片 HELP 命中"；但"无一键复制交互壳"的**判定（无）不变**。
5. **t72 §3#25 行数偏差**：`packages/base-render/test/render.test.mjs` 实测 **132** 行（t72 记 133）。
6. **t72 §4「填充者」漏一层**：`skill-memo-ilife` 的 `fillSharedMarkers` 在**全仓零生产调用**（仅定义 + 单测）——比 t72 的"内容由调用方决定"更严重：调用方根本不存在。
7. **t72 附录 B.1 缺陷仍在**：`packages/base-combos/HELP.md:66-71` 仍是 6 行 `undefined：undefined（undefined）`（`build-help.mjs` 段头正则不匹配 `l6_slots:`）。
8. **新增（t72 未记）**：三包中只有 base-paint 进发布白名单（`package.json:17-20`）；base-combos 的 link-core 是**运行时**依赖，发布时不可拆。

---

## 附录 · 复现命令

```powershell
cd D:\ilife
node -v; pnpm -v
cmd /c "pnpm build"; $LASTEXITCODE
npx tsc -b packages/base-link-core packages/base-render packages/base-combos --force
node .scratch\t92\probe-exports.mjs
node tooling/check-boundaries.mjs
git diff --stat 6b0c1e7..HEAD -- packages/base-link-core packages/base-render packages/base-combos tooling/check-boundaries.mjs
Select-String -Path packages\*\templates\*.html -SimpleMatch '<!--INJECT-DATA-->'
Select-String -Path packages\*\src\render\html.ts -Pattern 'export const SHARED_CSS_MARKER'
```
