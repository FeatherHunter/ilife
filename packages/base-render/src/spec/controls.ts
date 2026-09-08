/** base-paint/spec/controls：控件层契约（#76 冻结面）。
 *
 * 「无宿主（纯 HTML）可用」（AC-16）：本层全部是**纯函数产 HTML 字符串** +
 * **显式端口**（CopyPorts／ToastHostPort），不读浏览器全局对象（AC-7），
 * 不引 `node:`（浏览器侧资产 browser-safe）。纯静态可用的控件零运行时；
 * 需交互的控件由调用方注入端口，在**普通 .html 文件**里即可跑（不依赖 DSH 宿主）。
 *
 * #76／#77／#90 共用同一签名：本文件是唯一真相源，三票不得各定一套。
 */

import type { CopyFormat } from './text.js';

/** AC-14：HTML 转义集固定五字符（技能侧本地副本一律删除，执行归 #74／#79）。 */
export const ESCAPE_HTML_CHARS = ['&', '<', '>', '"', "'"] as const;

export type EscapeHtmlChar = (typeof ESCAPE_HTML_CHARS)[number];

export const ESCAPE_HTML_ENTITIES = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
} as const satisfies Record<EscapeHtmlChar, string>);

/** 冻结签名：`escapeHtml(s: string): string`。 */
export type EscapeHtml = (s: string) => string;

/* ── 复制双通道（Q13／AC-16①） ───────────────────────────── */

/** 通道 1 = 浏览器 Clipboard API；通道 2 = 兜底（选区 + execCommand 等）。 */
export const COPY_CHANNELS = ['clipboard', 'fallback'] as const;

export type CopyChannel = (typeof COPY_CHANNELS)[number];

export interface ClipboardChannel {
  writeText(text: string): Promise<void>;
}

/** 调用方显式注入（禁全局对象兜底）。 */
export interface CopyPorts {
  /** 无宿主／无 Clipboard API 时传 null，直接走 fallback。 */
  readonly clipboard: ClipboardChannel | null;
  readonly fallback: (text: string) => boolean;
  /** 反馈通道（FX-3 定死）：`copyText` **直接挂载**，不把 HTML 片段交调用方插入。
   *  缺省（未提供）时只回调 + 返回 outcome，不产 HTML、不抛错（降级，非「需要宿主」）。 */
  readonly toast?: ToastHostPort;
}

export interface CopyToastText {
  readonly msg: string;
  readonly detail?: string;
  readonly icon?: ToastIcon;
}

export interface CopyTextOptions {
  /** 静默：不弹 toast，但回调仍触发。 */
  readonly silent?: boolean;
  readonly toast?: { readonly ok?: CopyToastText; readonly fail?: CopyToastText };
  readonly onOk?: (channel: CopyChannel) => void;
  readonly onFail?: (reason: string) => void;
}

export interface CopyTextOutcome {
  readonly ok: boolean;
  /** 命中通道；空串短路时为 null。 */
  readonly channel: CopyChannel | null;
  readonly reason?: string;
}

/** 冻结签名：`copyText(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>`。 */
export type CopyText = (text: string, ports: CopyPorts, opts?: CopyTextOptions) => Promise<CopyTextOutcome>;

export const COPY_TEXT_DEFAULTS = Object.freeze({
  emptyTextShortCircuit: true,
  /** 失败徽章恒在：失败态经 `ports.toast.mount` 挂载，不受 `opts.silent` 影响。 */
  failBadgeAlwaysOn: true,
  okMessage: '已复制',
  okDetail: '粘贴给 AI',
  failMessage: '复制失败',
  failDetail: '长按选择文本手动复制',
} as const);

export interface CopyRuntime {
  copyText(text: string, opts?: CopyTextOptions): Promise<CopyTextOutcome>;
  dispose(): void;
}

/** 冻结签名：`createCopyRuntime(ports: CopyPorts): CopyRuntime`。 */
export type CreateCopyRuntime = (ports: CopyPorts) => CopyRuntime;

/* ── 复制接线（FX-3／FX-17／#90 可直接使用） ────────────────── */

/** 复制按钮上承载 `actionId` 的属性名（FX-17④，冻结）：`renderActionBar`／`renderErrorReceipt`
 *  ／HELP 壳**渲染期**写入该属性；调用方的 `CopyActionHostPort.listActionIds()` 据此发现 id 集合。
 *  文本仍走 `SharedHelpersInput.dataAttr`（缺省 `DEFAULT_DATA_ATTR = 'data-t'`）——id 与文本是两个属性，不得混用。 */
export const ACTION_ID_ATTR = 'data-action-id' as const;

/** 复制按钮的 actionId 冻结表（FX-17②）：`actionBar` 的复制数据／日志 ＋ `errorReceipt` 的两个按钮。
 *
 *  **与旧侧 `data-t` 口径的偏离（显式声明）**：旧侧复制按钮**无 id**——激活靠内联脚本
 *  `onclick="copyText(this.dataset.t)"`（`base.js:311,648-649`），只有 `data-t` 一个属性。
 *  新契约禁内联脚本（AC-7 零注入面），激活一律经 `bindCopyAction` 事件委派 → **必须**冻结 id 集合；
 *  旧侧 `data-t` 的文本载体语义**保留**（属性名 = `SharedHelpersInput.dataAttr`，缺省 `DEFAULT_DATA_ATTR = 'data-t'`）。
 *
 *  约定：全部 base-paint actionId（含 `HELP_COPY_ACTIONS`）在**同一页面内唯一**；调用方可覆盖
 *  `ErrorReceiptInput.dataActionId`／`logActionId`，覆盖值同样必须唯一且可被 `listActionIds()` 发现。
 */
export const COPY_ACTION_IDS = Object.freeze({
  actionBar: { copyData: 'ilife-copy-data', copyLog: 'ilife-copy-log' },
  errorReceipt: { copyData: 'ilife-error-copy-data', copyLog: 'ilife-error-copy-log' },
} as const);

/** DOM 适配端口（AC-7／§4.1：DOM 不得进 base-paint，故 `el` 以端口替代）。
 *  调用方用内联适配器实现（普通 .html 即可），base-paint 自身不读任何浏览器全局对象。 */
export interface CopyActionHostPort {
  /** **发现机制（FX-17③，必填）**：本端口可接线的全部 actionId（由渲染出的 `ACTION_ID_ATTR` 属性收集，
   *  顺序无语义、可含重复但须自行去重）。`bindCopyAction` **只**订阅这里列出的 id——
   *  不得猜 id、不得约定通配前缀、不得订阅未列出的 id。
   *  允许包含**非复制按钮**（如 `ActionBarButton` 的场景按钮）：binder 一律靠
   *  `readDataText → undefined` 跳过，不报错、不另设白名单。 */
  listActionIds(): readonly string[];
  /** 读取渲染期写入的复制文本（`dataAttr`，缺省 `data-t`）；该 actionId 无文本返回 undefined。 */
  readDataText(actionId: string): string | undefined;
  /** 订阅按钮激活（click／keydown 由宿主适配）；返回解绑函数（幂等，重复调用无害）。 */
  onActivate(actionId: string, handler: () => void): () => void;
}

/** 冻结签名：`bindCopyAction(port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions): { dispose(): void }`。
 *
 *  **语义（FX-17③，逐条定死）**：
 *  1. `port.listActionIds()` 是唯一 id 来源；对每个 id 调 `port.onActivate(actionId, handler)`；
 *  2. `handler` 在**激活时**读 `port.readDataText(actionId)`（与旧侧 `this.dataset.t` 同时机），
 *     返回 `undefined` → 本次跳过（不抛错、不产 toast；非复制按钮即由此跳过）；否则 `void copyText(text, ports, opts)`；
 *  3. 失败徽章仍由 `copyText` 经 `ports.toast` 挂载（FX-3②），binder 不另出反馈；
 *  4. `dispose()` 解绑**全部**已订阅 id，**幂等**（重复调用无害）。 */
export type BindCopyAction = (
  port: CopyActionHostPort,
  ports: CopyPorts,
  opts?: CopyTextOptions,
) => { dispose(): void };

/* ── 共享 JS 文本的唯一产出者（FX-2③，归 #76；#74 只消费） ── */

export interface SharedHelpersInput {
  /** 类名前缀；缺省既有 `STYLE_PREFIX`（`ilife-`）。 */
  readonly prefix?: string;
  /** 复制文本数据属性名；缺省 `DEFAULT_DATA_ATTR`（`data-t`，`renderActionBar` 渲染期写入）。
   *  覆盖**只影响产出 helpers JS 的选择器**；渲染端恒写 `DEFAULT_DATA_ATTR`（不一致由调用方自负，见文档 §3.3「`dataAttr` 覆盖口径」）。 */
  readonly dataAttr?: string;
}

/** 复制文本的默认承载属性名（缺省 `SharedHelpersInput.dataAttr`）：渲染端与 `CopyActionHostPort`
 *  适配端必须用**同一个**名字——它是「渲染期写入 → 激活期读回」的唯一约定，故冻结为常量而非散文。 */
export const DEFAULT_DATA_ATTR = 'data-t' as const;

/** `buildSharedHelpersJs`／`buildChartsHelpersJs` 的**产出内容契约（FX-18，机读）**——
 *  dist 纯度扫描（`test/contract-signatures.test.mjs`）与 §6.3 验收条文**必须**与本表逐项一致：
 *
 *  - `selfContained`：自包含，不依赖外部脚本／其它全局，不 import 任何东西；
 *  - `idempotent`：可重复注入（同页面注入两次，行为与注入一次等价）；
 *  - `domAllowed`：**允许**页面侧 DOM API（`document.*` 读取／事件绑定）——共享 JS 是页面侧代码；
 *  - `forbidGlobalAssignment`：**禁止**向 `window.<id>`／`globalThis.<id>` **赋值**（不得新增隐式全局，AC-7）；
 *  - `forbidNodeBuiltins`：禁止 `node:` 内建（浏览器侧资产必须 browser-safe，边界规则 7）。
 *
 *  注意：本表约束的是**产出的 JS 文本**，不是 base-paint 自身运行时——`src/spec/*.ts` 与
 *  base-paint 的运行时代码仍**不得**读 `window.`／`document.`（AC-7；DOM 只经端口或产出文本）。 */
export const SHARED_HELPERS_JS_RULE = Object.freeze({
  selfContained: true,
  idempotent: true,
  domAllowed: true,
  forbidGlobalAssignment: true,
  forbidNodeBuiltins: true,
} as const);

/** 冻结签名：`buildSharedHelpersJs(input?: SharedHelpersInput): string`。
 *  恒返回非空 JS 文本（IIFE／显式挂载点，不得引入隐式全局，AC-7）；产出内容受
 *  `SHARED_HELPERS_JS_RULE` 约束（FX-18）；空串视为实现缺陷 → `fillTemplate` 抛 `asset-missing`。 */
export type BuildSharedHelpersJs = (input?: SharedHelpersInput) => string;

/* ── toast（堆叠提示） ──────────────────────────────────── */

export const TOAST_ICONS = ['copy', 'ok', 'warn', 'danger', 'info'] as const;

export type ToastIcon = (typeof TOAST_ICONS)[number];

export const TOAST_DEFAULTS = Object.freeze({
  timeoutMs: 4500,
  maxStack: 5,
  mobileMaxStack: 3,
  mobileMaxPx: 820,
  gapPx: 8,
  role: 'status',
  ariaLive: 'polite',
  defaultIcon: 'copy',
} as const);

export interface ToastBadge {
  readonly text: string;
  readonly type: 'ok' | 'warn' | 'danger';
}

/** 操作按钮只带 actionId：HTML 里零内联脚本（零注入面）。 */
export interface ToastAction {
  readonly label: string;
  readonly actionId: string;
}

export interface ToastInput {
  readonly msg: string;
  readonly detail?: string;
  readonly icon?: ToastIcon;
  readonly badge?: ToastBadge;
  readonly actions?: readonly ToastAction[];
  readonly count?: string;
  readonly lines?: readonly string[];
  readonly code?: string;
  readonly timeoutMs?: number;
  readonly maxStack?: number;
}

/** 冻结签名：`renderToast(input: ToastInput): string`。 */
export type RenderToast = (input: ToastInput) => string;

export interface ToastHostPort {
  mount(html: string): { remove(): void };
}

export interface ToastController {
  show(input: ToastInput): void;
  /** 清空栈（旧 `__hmToastFlush` 的显式替代，不落全局）。 */
  flush(): void;
  dispose(): void;
}

/** 冻结签名：`createToastController(port: ToastHostPort): ToastController`。 */
export type CreateToastController = (port: ToastHostPort) => ToastController;

/* ── actionBar（复制三件套） ─────────────────────────────── */

export const ACTION_BAR_KINDS = ['primary', 'red', 'ghost'] as const;

export type ActionBarKind = (typeof ACTION_BAR_KINDS)[number];

export interface ActionBarButton {
  readonly label: string;
  readonly kind: ActionBarKind;
  readonly actionId: string;
}

export interface CopyButtonInput {
  /** **必填（FX-17①）**：按钮的 `actionId`——`renderActionBar` 的复制数据／日志取
   *  `COPY_ACTION_IDS.actionBar.copyData`／`copyLog`（或调用方自定，须页面内唯一），
   *  渲染期写入 `ACTION_ID_ATTR` 属性，供 `CopyActionHostPort.listActionIds()` 发现。
   *  空串／非字符串／与同一次渲染内其它按钮重复 → 抛 `ControlsError` code `bad-input`。 */
  readonly actionId: string;
  /** 缺省 `ACTION_BAR_DEFAULTS.copyDataLabel`／`copyLogLabel`（按用途）。 */
  readonly label?: string;
  /** 渲染期已序列化的文本（走 buildDataText／buildLogText），存 `data-t`，零注入面。 */
  readonly text?: string;
  readonly format?: CopyFormat;
}

export interface ActionBarInput {
  readonly buttons?: readonly ActionBarButton[];
  readonly copyData?: CopyButtonInput;
  readonly copyLog?: CopyButtonInput;
}

export const ACTION_BAR_DEFAULTS = Object.freeze({
  copyDataLabel: '复制数据',
  copyLogLabel: '复制日志',
  ghostOwnRow: true,
  evenRowPairs: 2,
  minHeightPx: 40,
  fontSizePx: 12,
  fontWeight: 600,
  ghostBorderAlpha: 0.38,
} as const);

/** 冻结签名：`renderActionBar(input: ActionBarInput): string`。 */
export type RenderActionBar = (input: ActionBarInput) => string;

/* ── 状态三控件 ────────────────────────────────────────── */

export const STATUS_KINDS = ['ok', 'warn', 'danger', 'empty'] as const;

export type StatusKind = (typeof STATUS_KINDS)[number];

export const STATUS_DEFAULT_TEXT = Object.freeze({
  ok: '成功',
  warn: '警告',
  danger: '失败',
  empty: '无数据',
} as const satisfies Record<StatusKind, string>);

export interface StatusBadgeInput {
  readonly status: StatusKind;
  readonly text?: string;
}

/** 非法 status 白名单降级 empty（不抛错，防无样式徽章）。 */
export type RenderStatusBadge = (input: StatusBadgeInput) => string;

export interface EmptyStateInput {
  readonly icon?: string;
  readonly text: string;
  readonly hint?: string;
  /** 受信 HTML 透传：调用方负责其内容安全（不转义）。 */
  readonly actionHtml?: string;
}

export type RenderEmptyState = (input: EmptyStateInput) => string;

export interface ErrorReceiptInput {
  readonly message: string;
  readonly retryPrompt?: string;
  /** 显式传入；不得读旧全局 `__hmPayload` 兜底（AC-7）。 */
  readonly dataText?: string;
  readonly logText?: string;
  /** 复制数据按钮的 `actionId`；缺省 `COPY_ACTION_IDS.errorReceipt.copyData`（FX-17②）。 */
  readonly dataActionId?: string;
  /** 复制日志按钮的 `actionId`；缺省 `COPY_ACTION_IDS.errorReceipt.copyLog`。 */
  readonly logActionId?: string;
}

/** 缺 dataText／logText → 不渲染对应复制按钮（容错，不抛错）。 */
export type RenderErrorReceipt = (input: ErrorReceiptInput) => string;

export const CONTROLS_ERROR_CODES = ['bad-input', 'bad-format'] as const;

export type ControlsErrorCode = (typeof CONTROLS_ERROR_CODES)[number];

export interface ControlsErrorShape {
  readonly name: 'ControlsError';
  readonly code: ControlsErrorCode;
  readonly message: string;
}

/* ── 无宿主可用性边界（AC-16②） ────────────────────────── */

export const CONTROL_NAMES = ['toast', 'copyText', 'actionBar', 'statusBadge', 'emptyState', 'errorReceipt'] as const;

export type ControlName = (typeof CONTROL_NAMES)[number];

/** 全部控件在纯 HTML（无 DSH 宿主）下可用；`needsRuntime` 只表示需浏览器能力。 */
export const CONTROLS_HOST_REQUIREMENT = 'none' as const;

export interface ControlAvailability {
  /** 纯静态即可产出 HTML（Node 侧也可）。 */
  readonly staticHtml: boolean;
  /** 需浏览器运行时（DOM／Clipboard），端口由调用方显式注入。 */
  readonly needsRuntime: boolean;
  readonly runtimePort: 'CopyPorts' | 'ToastHostPort' | 'CopyPorts+ToastHostPort' | null;
}

export const CONTROL_AVAILABILITY = Object.freeze({
  toast: { staticHtml: true, needsRuntime: true, runtimePort: 'ToastHostPort' },
  copyText: { staticHtml: false, needsRuntime: true, runtimePort: 'CopyPorts' },
  actionBar: { staticHtml: true, needsRuntime: true, runtimePort: 'CopyPorts+ToastHostPort' },
  statusBadge: { staticHtml: true, needsRuntime: false, runtimePort: null },
  emptyState: { staticHtml: true, needsRuntime: false, runtimePort: null },
  errorReceipt: { staticHtml: true, needsRuntime: true, runtimePort: 'CopyPorts+ToastHostPort' },
} as const satisfies Record<ControlName, ControlAvailability>);
