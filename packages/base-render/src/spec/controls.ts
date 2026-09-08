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
  readonly label?: string;
  /** 渲染期已序列化的文本（走 buildDataText／buildLogText），存 data-t，零注入面。 */
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
