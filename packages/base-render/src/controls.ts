/** base-paint/controls：#76 控件层运行时（契约 §3.3／§6.3）。
 *
 * 落地冻结面 44 条里 #76 的 13 条 `pending`（10 个运行时出口 ＋ 3 个类型出口）：
 * `copyText`／`createCopyRuntime`／`bindCopyAction`／`buildSharedHelpersJs`／
 * `renderToast`／`createToastController`／`renderActionBar`／`renderStatusBadge`／
 * `renderEmptyState`／`renderErrorReceipt`。签名逐字取 `src/spec/controls.ts`，本文件不改任何冻结值。
 *
 * 三条硬边界（逐条对齐 §3.3／§6.3，违反即红）：
 *  1. **无宿主 ≠ 无浏览器**（C-1）：本层不依赖 DSH 宿主注入（无宿主 DOM 容器、无宿主全局），
 *     浏览器能力一律经**显式端口**（`CopyPorts`／`ToastHostPort`／`CopyActionHostPort`）传入；
 *  2. **模块代码不得触碰 DOM**（C-8／AC-7）：本文件（编译进 `dist/controls.js`）的**代码**里不出现
 *     `document.`／`window.`／`navigator.`——DOM 只允许出现在 `buildSharedHelpersJs` **产出的 JS 文本**里
 *     （`SHARED_HELPERS_JS_RULE.domAllowed = true`），由 §6.3 追加验收的 dist 扫描断言钉死；
 *  3. **零内联脚本**（C-2）：渲染出的按钮只带 `ACTION_ID_ATTR` 与 `DEFAULT_DATA_ATTR`，
 *     激活一律走 `bindCopyAction`（事件委派），产出 JS 必须是**经典 script** 作用域可跑的 IIFE。
 *
 * 文档未规定处的取值（本文显式记账，不留暗猜；契约 §3.3「文档无规定」项）：
 *  - 各控件 HTML 结构／类名细节 → 只冻结「`ilife-` 前缀 ＋ `CONTROL_STYLE_SECTIONS` 命名空间」；
 *    逐区尺寸／色值 owner #75，本文件**不产**任何样式常量（数值一律读 `ACTION_BAR_DEFAULTS` 等冻结常量）；
 *  - `copyText` 非空串失败的 `reason` → 通道 2 返回假值 = `'fallback-failed'`／通道 2 **同步抛错** =
 *    `'fallback-threw'`（只冻结了空串短路的 `'empty'`；两通道皆失败一律**不抛错**，§3.3）；
 *  - `copyText` 的 toast 挂载与回调**先后** → 先挂反馈（失败徽章恒在，不被回调异常吞掉），再回调一次；
 *  - `copyText('', ports)` 的判定**次序** → 先校验 `ports`（非法即 `bad-input`）再判空串短路，即
 *    `copyText('', null)` 抛 `bad-input` 而非返回 `reason:'empty'`（次序文档无规定，本文定死）；
 *  - `renderToast` 的 `actions` 数量上限 → 不截断（旧层 `slice(0, 2)` 未进冻结面）；
 *  - `renderToast` 非法 `badge.type` → 回落 `'ok'`（旧层口径）；
 *  - `renderActionBar` 的 `CopyButtonInput.text` 缺席 → 仍渲染按钮、不写 `DEFAULT_DATA_ATTR`（binder 靠
 *    `readDataText → undefined` 跳过）；`text === ''` → 仍写 `data-t=""`（binder 送进空串短路，无反馈）；
 *    场景按钮 `kind` 取冻结 `ACTION_BAR_KINDS` **全量**（含 `ghost`），不以 §3.3 表格的「primary／red」为限；
 *    `format` 不参与渲染（序列化归 #77）；
 *  - `renderStatusBadge` 的 `text === ''` → 视为缺省（旧层口径）；非法 `status` 降级 `'empty'`（冻结语义）；
 *  - `renderEmptyState` 的 `actionHtml` → **受信 HTML 透传**（契约同口径，调用方负责其内容安全），可含
 *    内联 `onclick`；「零注入面」只约束 base-paint **自产**标记，不约束调用方透传的受信片段；
 *  - helpers JS 的反馈栈容量 → 恒取冻结 `TOAST_DEFAULTS.maxStack`／`mobileMaxStack`（按视口），**不读**
 *    静态 `renderToast` 产出的 `data-max`（后者供页面自建 `createToastController` 读取，两栈互不相干）；
 *  - `renderErrorReceipt` 的 `retryPrompt` → 修正重试按钮的**文案**（缺省 `修正重试`）；该按钮**不带**
 *    `ACTION_ID_ATTR`——冻结输入面没有 retry actionId，不得自造 id（§6.3 红线 8），绑定归调用方；
 *  - `copyText` 判定通道 2 成功用**真值**（旧层 `_fbCopy(s) ? ok() : fail()` 同口径）；对布尔返回值
 *    与 `=== true` 等价，只影响调用方返回非布尔真值的情形；
 *  - **「≤820px 收窄为 3」是页面运行时行为，不是模块行为**（FX-76-2 总架构师裁定）：模块侧
 *    `createToastController` 保持**宿主无关**（AC-7 不变，不读任何浏览器全局）；收窄由**页面侧**
 *    `buildSharedHelpersJs` 的**产出文本**读 `matchMedia('(max-width: mobileMaxPx)')` 承担
 *    （`domAllowed`），或由调用方经 `ToastInput.maxStack` 显式施加。旧层 `window.matchMedia`
 *    （`base.js:96`）本就是页面侧代码。两侧分工见契约 §3.3「toast 移动端收窄的分工（FX-76-2）」。
 */

import { STYLE_PREFIX } from './style.js';
import {
  ACTION_BAR_DEFAULTS,
  ACTION_BAR_KINDS,
  ACTION_ID_ATTR,
  CONTROL_STYLE_SECTIONS,
  COPY_ACTION_IDS,
  COPY_TEXT_DEFAULTS,
  DEFAULT_DATA_ATTR,
  ESCAPE_HTML_CHARS,
  ESCAPE_HTML_ENTITIES,
  HELP_COPY_ACTIONS,
  HELP_SHELL_ID,
  STATUS_DEFAULT_TEXT,
  STATUS_KINDS,
  TOAST_DEFAULTS,
} from './spec/index.js';
import type {
  ActionBarButton,
  ActionBarInput,
  ActionBarKind,
  BindCopyAction,
  BuildSharedHelpersJs,
  CopyActionHostPort,
  CopyButtonInput,
  CopyChannel,
  CopyPorts,
  CopyRuntime,
  CopyText,
  CopyTextOptions,
  CopyTextOutcome,
  ControlsErrorCode,
  EmptyStateInput,
  ErrorReceiptInput,
  EscapeHtmlChar,
  RenderActionBar,
  RenderEmptyState,
  RenderErrorReceipt,
  RenderStatusBadge,
  RenderToast,
  SharedHelpersInput,
  StatusBadgeInput,
  StatusKind,
  ToastBadge,
  ToastController,
  ToastHostPort,
  ToastIcon,
  ToastInput,
} from './spec/index.js';

/* ── 错误形态（§3.3：与既有 RenderError 并列、互不继承、一律抛出、不返空） ── */

/** 控件层错误。**不**从 `src/index.ts` 导出：`SPEC_FROZEN_SURFACE` 44 条内无该运行时条目，
 *  调用方按 `name === 'ControlsError'` ＋ `code` 判定（与 `fillTemplate` 的 `TemplateError` 同口径）。 */
export class ControlsError extends Error {
  readonly code: ControlsErrorCode;

  constructor(code: ControlsErrorCode, message: string) {
    super(message);
    this.name = 'ControlsError';
    this.code = code;
  }
}

function badInput(message: string): never {
  throw new ControlsError('bad-input', message);
}

/* ── 转义（AC-14：唯一口径 = 冻结的 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES`） ── */

const ESCAPE_RE = new RegExp('[' + ESCAPE_HTML_CHARS.join('') + ']', 'g');

function esc(value: string): string {
  return value.replace(ESCAPE_RE, (ch) => ESCAPE_HTML_ENTITIES[ch as EscapeHtmlChar] ?? ch);
}

/* ── 入参校验小件（失败行为恒为 `ControlsError` code `bad-input`） ── */

function assertPlainObject(value: unknown, field: string): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) badInput(field + ' 必须是对象');
}

function assertActionId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') badInput(field + ' 必须是非空字符串');
  return value;
}

/** 零注入面：含内联事件处理器字段（`onclick`／`onClick`／任何 `on*`）的入参一律拒。 */
function assertNoInlineHandler(value: object, field: string): void {
  for (const key of Object.keys(value)) {
    if (/^on/i.test(key)) badInput(field + ' 不得含内联事件处理器字段：' + key);
  }
}

function isStatusKind(value: unknown): value is StatusKind {
  return (STATUS_KINDS as readonly string[]).includes(value as string);
}

/* ── toast（`renderToast` ＋ `createToastController`） ─────────────────── */

/** 图标字形：`TOAST_ICONS` 是**冻结的枚举名**（不是字形），字形属文档未规定项（旧层 `base.js:74` 同值）。 */
const TOAST_ICON_GLYPHS: Readonly<Record<ToastIcon, string>> = Object.freeze({
  copy: '📋',
  ok: '✅',
  warn: '⚠️',
  danger: '❌',
  info: '💡',
});

/** 徽章类型白名单：取冻结类型 `ToastBadge['type']` 的成员（非法值回落 `'ok'`，旧层口径）。 */
const TOAST_BADGE_TYPES = ['ok', 'warn', 'danger'] as const satisfies readonly ToastBadge['type'][];

/** 关闭按钮文案（文档无规定；沿用旧基线 `✓ 知道了`）。 */
const TOAST_CLOSE_LABEL = '✓ 知道了';

/** 关闭按钮的命名空间类（helpers JS 按 `prefix` 派生同名选择器，见 `buildSharedHelpersJs`）。 */
const TOAST_CLOSE_CLASS = 'toast-close';

/** toast 结构类名（**静态产出器与 helpers 运行时共用同一份**，故提为常量）：
 *  `body` 包裹 `title-row`（＋ 可选 detail），close 在 body 之外 —— 与旧层
 *  `.hm-toast-icon + .hm-toast-body(> .hm-toast-title-row + .hm-toast-detail) + .hm-toast-close`
 *  **同构**（旧层取证 `.scratch/t76/old-controls.md` §1.1；返修 W1 根因修）。
 *  运行时详情类名沿用 `toast-title-detail`（既有 helpers 产出，不新增类名）。 */
const TOAST_BODY_CLASS = 'toast-body';
const TOAST_TITLE_ROW_CLASS = 'toast-title-row';
const TOAST_DETAIL_CLASS = 'toast-title-detail';

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

/** 冻结签名：`renderToast(input: ToastInput): string`（`input.msg` 非字符串 → `bad-input`）。 */
export const renderToast: RenderToast = (input) => {
  assertPlainObject(input, 'renderToast: input');
  const msg = (input as ToastInput).msg;
  if (typeof msg !== 'string') badInput('renderToast: input.msg 必须是字符串');
  const toast = input as ToastInput;

  const icon = typeof toast.icon === 'string' && toast.icon in TOAST_ICON_GLYPHS ? toast.icon : TOAST_DEFAULTS.defaultIcon;
  const maxStack = positiveInt(toast.maxStack, TOAST_DEFAULTS.maxStack);

  const head: string[] = ['<span class="' + STYLE_PREFIX + 'toast-icon" aria-hidden="true">' + TOAST_ICON_GLYPHS[icon] + '</span>'];
  const titleRow: string[] = ['<span class="' + STYLE_PREFIX + 'toast-title">' + esc(msg) + '</span>'];

  const badge = toast.badge;
  if (badge !== undefined && badge !== null) {
    assertPlainObject(badge, 'renderToast: input.badge');
    if (typeof badge.text !== 'string') badInput('renderToast: input.badge.text 必须是字符串');
    const badgeType = (TOAST_BADGE_TYPES as readonly string[]).includes(badge.type) ? badge.type : 'ok';
    titleRow.push('<span class="' + STYLE_PREFIX + 'toast-chip ' + STYLE_PREFIX + 'toast-chip-' + badgeType + '">' + esc(badge.text) + '</span>');
  }

  if (typeof toast.count === 'string' && toast.count !== '') {
    titleRow.push('<span class="' + STYLE_PREFIX + 'toast-count">' + esc(toast.count) + '</span>');
  }

  const actions = toast.actions;
  if (actions !== undefined && actions !== null) {
    if (!Array.isArray(actions)) badInput('renderToast: input.actions 必须是数组');
    actions.forEach((action, i) => {
      const field = 'renderToast: input.actions[' + i + ']';
      assertPlainObject(action, field);
      assertNoInlineHandler(action, field);
      const actionId = assertActionId(action.actionId, field + '.actionId');
      if (typeof action.label !== 'string') badInput(field + '.label 必须是字符串');
      titleRow.push('<button type="button" class="' + STYLE_PREFIX + 'toast-act" ' + ACTION_ID_ATTR + '="' + esc(actionId) + '">' + esc(action.label) + '</button>');
    });
  }

  const body: string[] = ['<div class="' + STYLE_PREFIX + TOAST_TITLE_ROW_CLASS + '">' + titleRow.join('') + '</div>'];
  if (typeof toast.detail === 'string' && toast.detail !== '') {
    body.push('<div class="' + STYLE_PREFIX + 'toast-detail">' + esc(toast.detail) + '</div>');
  }
  if (Array.isArray(toast.lines) && toast.lines.length > 0) {
    body.push('<div class="' + STYLE_PREFIX + 'toast-lines">' + toast.lines.map((line) => esc(String(line))).join('<br>') + '</div>');
  }
  if (typeof toast.code === 'string' && toast.code !== '') {
    body.push('<pre class="' + STYLE_PREFIX + 'toast-code">' + esc(toast.code) + '</pre>');
  }

  return (
    '<div class="' + STYLE_PREFIX + 'toast" role="' + TOAST_DEFAULTS.role + '" aria-live="' + TOAST_DEFAULTS.ariaLive + '" data-max="' + maxStack + '">'
    + head.join('')
    + '<div class="' + STYLE_PREFIX + TOAST_BODY_CLASS + '">' + body.join('') + '</div>'
    + '<button type="button" class="' + STYLE_PREFIX + TOAST_CLOSE_CLASS + '">' + TOAST_CLOSE_LABEL + '</button>'
    + '</div>'
  );
};

/** 冻结签名：`createToastController(port: ToastHostPort): ToastController`。
 *
 *  堆叠口径（旧层 `stackCap()` 同语义）：容量 = 栈内各条 `maxStack` 的**最大值**，空栈回落
 *  `TOAST_DEFAULTS.maxStack`；超容量 FIFO 挤出最旧；单条独立计时（`timeoutMs` 缺省 4500）。
 *  `flush()` 清栈；`dispose()` = `flush()` ＋ 之后 `show()` 变 no-op（幂等）。 */
export const createToastController = (port: ToastHostPort): ToastController => {
  assertPlainObject(port, 'createToastController: port');
  if (typeof port.mount !== 'function') badInput('createToastController: port.mount 必须是函数');

  interface Entry {
    readonly handle: { remove(): void };
    readonly cap: number;
    timer: ReturnType<typeof setTimeout> | null;
  }

  const entries: Entry[] = [];
  let disposed = false;

  const drop = (entry: Entry): void => {
    if (entry.timer !== null) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    const index = entries.indexOf(entry);
    if (index >= 0) entries.splice(index, 1);
    entry.handle.remove();
  };

  const capacity = (): number => {
    let cap = 0;
    for (const entry of entries) if (entry.cap > cap) cap = entry.cap;
    return cap > 0 ? cap : TOAST_DEFAULTS.maxStack;
  };

  return {
    show(input: ToastInput): void {
      if (disposed) return;
      const html = renderToast(input);
      const cap = positiveInt(input === null || input === undefined ? undefined : input.maxStack, TOAST_DEFAULTS.maxStack);
      const timeoutMs = positiveInt(input === null || input === undefined ? undefined : input.timeoutMs, TOAST_DEFAULTS.timeoutMs);
      const entry: Entry = { handle: port.mount(html), cap, timer: null };
      entries.push(entry);
      entry.timer = setTimeout(() => drop(entry), timeoutMs);
      while (entries.length > capacity()) {
        const oldest: Entry | undefined = entries[0];
        if (oldest === undefined) break;
        drop(oldest);
      }
    },
    flush(): void {
      for (const entry of [...entries]) drop(entry);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const entry of [...entries]) drop(entry);
    },
  };
};

/* ── copyText 双通道（Q13／AC-16①） ──────────────────────────────────── */

function assertCopyPorts(ports: CopyPorts, field: string): void {
  if (ports === null || typeof ports !== 'object') badInput(field + ': ports 必填');
  if (typeof ports.fallback !== 'function') badInput(field + ': ports.fallback 必须是函数');
  const clipboard = ports.clipboard;
  if (clipboard !== null && clipboard !== undefined && typeof clipboard.writeText !== 'function') {
    badInput(field + ': ports.clipboard.writeText 必须是函数');
  }
}

function pickCopyText(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value !== '' ? value : fallback;
}

/** 成功反馈：`opts.toast.ok` 逐字段覆盖（`silent` 只静默它，不静默失败徽章）。 */
function okToastInput(opts: CopyTextOptions): ToastInput {
  const override = opts.toast === undefined || opts.toast === null ? undefined : opts.toast.ok;
  const input: ToastInput = {
    msg: pickCopyText(override?.msg, COPY_TEXT_DEFAULTS.okMessage),
    detail: typeof override?.detail === 'string' ? override.detail : COPY_TEXT_DEFAULTS.okDetail,
  };
  return typeof override?.icon === 'string' ? { ...input, icon: override.icon } : input;
}

/** 失败反馈：徽章恒在（`badge.type` 恒 `danger`，文案取冻结的 `STATUS_DEFAULT_TEXT.danger`）。 */
function failToastInput(opts: CopyTextOptions): ToastInput {
  const override = opts.toast === undefined || opts.toast === null ? undefined : opts.toast.fail;
  return {
    msg: pickCopyText(override?.msg, COPY_TEXT_DEFAULTS.failMessage),
    detail: typeof override?.detail === 'string' ? override.detail : COPY_TEXT_DEFAULTS.failDetail,
    icon: typeof override?.icon === 'string' ? override.icon : 'danger',
    badge: { type: 'danger', text: STATUS_DEFAULT_TEXT.danger },
  };
}

/** 冻结签名：`copyText(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>`。 */
export const copyText: CopyText = async (text, ports, opts) => {
  assertCopyPorts(ports, 'copyText');
  if (typeof text !== 'string') badInput('copyText: text 必须是字符串');
  const options: CopyTextOptions = opts === null || opts === undefined || typeof opts !== 'object' ? {} : opts;

  if (COPY_TEXT_DEFAULTS.emptyTextShortCircuit && text === '') {
    return { ok: false, channel: null, reason: 'empty' };
  }

  const mountFeedback = (input: ToastInput): void => {
    const host = ports.toast;
    if (host === null || host === undefined) return;
    if (typeof host.mount !== 'function') badInput('copyText: ports.toast.mount 必须是函数');
    host.mount(renderToast(input));
  };

  const settle = (ok: boolean, channel: CopyChannel | null, reason?: string): CopyTextOutcome => {
    if (ok) {
      if (options.silent !== true) mountFeedback(okToastInput(options));
      if (typeof options.onOk === 'function') options.onOk(channel as CopyChannel);
      return { ok: true, channel };
    }
    if (COPY_TEXT_DEFAULTS.failBadgeAlwaysOn) mountFeedback(failToastInput(options));
    if (typeof options.onFail === 'function') options.onFail(reason ?? 'unknown');
    return { ok: false, channel: null, reason };
  };

  const clipboard = ports.clipboard ?? null;
  if (clipboard !== null) {
    try {
      await clipboard.writeText(text);
      return settle(true, 'clipboard');
    } catch {
      // 通道 1 失败 → 通道 2（不得只留 execCommand 的单通道，§3.3）
    }
  }
  // 通道 2：**同步抛错同样不得逃出**（§3.3「两通道皆失败 → `{ok:false,…}`（不抛错）」＋「失败徽章恒在」；
  // 旧层 `_fbCopy` 整段 try/catch、失败返回 false 同口径）。只包住 `ports.fallback` 调用本身，
  // 不包 `settle()`——否则反馈通道抛错会被误判成「通道 2 失败」而重复出徽章。
  let fallbackOk = false;
  try {
    fallbackOk = Boolean(ports.fallback(text));
  } catch {
    return settle(false, null, 'fallback-threw');
  }
  return fallbackOk ? settle(true, 'fallback') : settle(false, null, 'fallback-failed');
};

/** 冻结签名：`createCopyRuntime(ports: CopyPorts): CopyRuntime`。
 *
 *  除转发 `copyText` 外，本 runtime 记录自己挂载的反馈节点，`dispose()` 一并移除（幂等）。
 *  「dispose 后仍可复制」是文档未规定处的取值：`dispose` 只回收反馈节点，不改端口语义。 */
export const createCopyRuntime = (ports: CopyPorts): CopyRuntime => {
  assertCopyPorts(ports, 'createCopyRuntime');
  const handles = new Set<{ remove(): void }>();
  const host = ports.toast;
  const wrapped: CopyPorts = host === null || host === undefined
    ? ports
    : {
      clipboard: ports.clipboard,
      fallback: ports.fallback,
      toast: {
        mount: (html: string) => {
          const handle = host.mount(html);
          handles.add(handle);
          return {
            remove: () => {
              handles.delete(handle);
              handle.remove();
            },
          };
        },
      },
    };
  return {
    copyText: (text: string, opts?: CopyTextOptions) => copyText(text, wrapped, opts),
    dispose: () => {
      for (const handle of [...handles]) handle.remove();
      handles.clear();
    },
  };
};

/* ── 复制接线（FX-3③／FX-17；#90 仅凭契约即可接线） ──────────────────── */

/** 冻结签名：`bindCopyAction(port, ports, opts?): { dispose(): void }`。
 *
 *  - id 来源**只有** `port.listActionIds()`：不猜 id、不通配前缀、不订阅未列出的 id；
 *  - 重复 id 由 binder 自行去重（同一 id 只订阅一次）；
 *  - 激活时读 `port.readDataText(actionId)`：非字符串（含 `undefined`）→ 跳过（不抛错、不产 toast），
 *    非复制按钮（场景按钮）即由此跳过，不另设白名单；
 *  - 反馈一律走 `ports.toast`（`copyText` 内部），binder 不另出反馈；
 *  - **激活回调恒不产生未处理拒绝**（FX-76-6）：`copyText` 正常路径的失败已在内部 `settle()` 处理，
 *    这里只兜「逃出 `copyText` 的异常」（端口实现抛错／`ports.toast.mount` 抛错／回调抛错）——
 *    契约 §3.3 明写 binder 不另出反馈，故不产第二份 UI 反馈，也不重入 `opts.onFail`（防重复回调）；
 *  - `dispose()` 解绑全部已订阅 id 且幂等；解绑后激活不再触发复制。 */
export const bindCopyAction: BindCopyAction = (port, ports, opts) => {
  assertPlainObject(port, 'bindCopyAction: port');
  if (typeof port.listActionIds !== 'function') badInput('bindCopyAction: port.listActionIds 必须是函数');
  if (typeof port.readDataText !== 'function') badInput('bindCopyAction: port.readDataText 必须是函数');
  if (typeof port.onActivate !== 'function') badInput('bindCopyAction: port.onActivate 必须是函数');
  assertCopyPorts(ports, 'bindCopyAction');

  const unbinds: Array<() => void> = [];
  const seen = new Set<string>();
  let disposed = false;

  const list = port.listActionIds();
  for (const actionId of Array.isArray(list) ? list : []) {
    if (typeof actionId !== 'string' || actionId === '' || seen.has(actionId)) continue;
    seen.add(actionId);
    const off = port.onActivate(actionId, () => {
      if (disposed) return;
      const text = port.readDataText(actionId);
      if (typeof text !== 'string') return;
      // FX-76-6：`void` 丢弃结果，但**必须**接住 rejection（否则端口抛错 → unhandledRejection）。
      // 反馈只经 `ports.toast`（§3.3），故此处不产反馈、不重入 `opts.onFail`。
      void copyText(text, ports, opts).catch(() => {});
    });
    unbinds.push(typeof off === 'function' ? off : () => {});
  }

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const off of unbinds) off();
      unbinds.length = 0;
    },
  };
};

/* ── 共享 JS 文本的唯一产出者（FX-2③／FX-18；#74 只消费） ─────────────── */

/** JS 字符串字面量（产出文本里嵌值唯一出口）。 */
function jsStr(value: string): string {
  return JSON.stringify(value);
}

function helpersPrefix(input?: SharedHelpersInput): string {
  const prefix = input === undefined || input === null ? undefined : input.prefix;
  return typeof prefix === 'string' && prefix !== '' ? prefix : STYLE_PREFIX;
}

function helpersDataAttr(input?: SharedHelpersInput): string {
  const attr = input === undefined || input === null ? undefined : input.dataAttr;
  return typeof attr === 'string' && attr !== '' ? attr : DEFAULT_DATA_ATTR;
}

/* ── #88 S4：HELP 速查台运行时增强的类名来源（**不引 `src/help.ts`**） ────────────
 *  helpers 运行时注入的元素必须与 `src/help.ts` 的 `cls()` 同一命名空间，否则样式落空。
 *  这里**不** `import` help.ts：help.ts 已 `import { STYLE_PREFIX } from './style.js'`，
 *  controls.ts 再引 help.ts 会形成 `controls → help → template` 的潜在模块环；改为
 *  「`CONTROL_STYLE_SECTIONS` 闭集里 kebab 后与 `HELP_SHELL_ID` 同值者」这条**与 help.ts:87-93
 *  逐条同构**的派生式，闭集漂移即在此 fail-fast（不静默换命名空间）。两侧一致性由
 *  `test/help-center-js-88.test.mjs` 机读钉死（对照 `renderHelpShell` 的真实产出类名）。 */

/** 样式区名 kebab（`helpShell` → `help-shell`）：与 `src/help.ts:81-83` 同一映射。 */
function styleSectionSlug(section: string): string {
  return section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

/** HELP 壳类名命名空间 kebab 后缀（`help-shell`；缺省前缀下根 = `ilife-help-shell`）。
 *  **延迟求值**（不在模块顶层）：`style.ts → charts.ts → controls.ts → style.ts` 存在模块环，
 *  顶层读 `STYLE_PREFIX` 会在 `style.js` 初始化完成前触发 TDZ（实测 `ReferenceError`），
 *  故派生式只在 `buildSharedHelpersJs()` **调用时**执行（此时全部模块已初始化）。 */
function helpShellSlug(): string {
  const section = CONTROL_STYLE_SECTIONS.find(
    (name) => STYLE_PREFIX + styleSectionSlug(name) === HELP_SHELL_ID,
  );
  if (section === undefined) {
    throw new Error('base-paint/controls：CONTROL_STYLE_SECTIONS 闭集缺与 HELP_SHELL_ID 同 kebab 的区名（'
      + HELP_SHELL_ID + '）');
  }
  return styleSectionSlug(section);
}

/** 回到顶部按钮的 `id`（视觉尺 H-19 逐字点名 `#backTop`；`backTop` 是**冻结规格值**）。 */
const HELP_BACKTOP_ID = 'backTop';
/** H-19：`scrollY > 400` 才出现（阈值逐字取规格）。 */
const HELP_BACKTOP_MIN_Y = 400;
/** H-19：按钮字形 `↑`（18px／600 由 CSS 承担）。 */
const HELP_BACKTOP_LABEL = '↑';
/** 无障碍名（文档未规定 → 本票取值，与 `TOAST_CLOSE_LABEL` 同口径记账）。 */
const HELP_BACKTOP_ARIA = '回到顶部';
/** 搜索框占位文案（F3 `卡路里.html` 的 `#sB` 逐字：`搜索全部场景`）。 */
const HELP_SEARCH_PLACEHOLDER = '搜索全部场景';
/** 搜索框无障碍名（文档未规定 → 本票取值）。 */
const HELP_SEARCH_ARIA = '搜索全部场景';
/** 清空按钮字形（F3 `#sClear` 逐字：`✕`）与无障碍名。 */
const HELP_CLEAR_LABEL = '✕';
const HELP_CLEAR_ARIA = '清空搜索';
/** H-16 双反馈的**按钮通道**类名（#121；规格逐字 `copied`，**非** `ilife-` 前缀 → 不占样式区命名空间）。
 *  CSS 侧两处已就位：`style.ts` 的 `copyButton` 区（`.ilife-copy-btn.copied`，#75）与本区追加的
 *  helpShell 复制按钮 `.copied`（#121）；本常量只供运行时**加类**，不产第二份样式真相。 */
const HELP_COPY_COPIED_CLASS = 'copied';
/** 复制成功态停留时长 = 弹簧动画时长 **450ms**（`docs/visual-spec-help.md:195,197`「按钮变绿进入
 *  `copied` 态并跑 450ms 弹簧动画」）。与 `style.ts` 的 `transition: transform .45s …` 同源数值，
 *  由 `test/copy-copied-121.test.mjs` 跨文件交叉钉死（改一侧不改另一侧即红）。 */
const HELP_COPY_COPIED_MS = 450;
/** 命中计数文案（F3 `#hitC` 逐字：`匹配 N 个场景`）。 */
const HELP_HIT_PREFIX = '匹配 ';
const HELP_HIT_SUFFIX = ' 个场景';
/** 零命中文案（F3 `#emptyC` 逐字）。 */
const HELP_HIT_EMPTY = '没有找到相关场景,换个词试试～';

/** 冻结签名：`buildSharedHelpersJs(input?: SharedHelpersInput): string`。
 *
 *  产出恒为**非空**、**经典 script** 作用域可跑的 IIFE（无 `import`／`export`／顶层 `await`），
 *  逐项满足 `SHARED_HELPERS_JS_RULE`：自包含（不依赖其它脚本或既有全局）／幂等（判据**只落 DOM**：
 *  标记属性 ＋ `querySelector` 早退，**不**用全局哨兵）／允许页面侧 DOM（`document.*` 读取与事件绑定）／
 *  不向 `window.<id>`／`globalThis.<id>` 赋值／不引 `node:`。
 *
 *  功能面（文档无规定，本文记账）：① 幂等挂载点标记；② 事件委派 `[ACTION_ID_ATTR]` 点击 →
 *  读 `dataAttr` 文本 → 复制（`navigator.clipboard` → `execCommand` 兜底）；③ 反馈块
 *  **与 `renderToast` 同构**（`.toast` > `.toast-icon` ＋ `.toast-body` > `.toast-title-row` ＋ 可选
 *  `.toast-title-detail`，`.toast-close` 在 body 之外；W1 根因修 ＋ F-c 图标），`prefix` 命名空间类，
 *  `maxStack`／`timeoutMs`／移动端收窄取冻结常量；④ 关闭按钮。
 *  产出文本里的文案／数值**全部**取自冻结常量（不产第二份真相）。
 *  注：`execCommand` 兜底用临时 textarea 的两个内联定位属性（`position`／`left`），属临时节点
 *  定位而非控件样式，不构成第二份样式常量。
 *
 *  **#88 S4 追加（HELP 速查台运行时增强；文档无规定 → 本文记账）**：全部挂进**既有 `boot()`**、
 *  共用**既有幂等 marker**（`MARKER_SEL` ＋ `querySelector` 早退），**不新增第二个标记**；每一项都
 *  先判 HELP 壳是否在页面（helpers 被所有技能页面共享，非 HELP 页逐项早退、零副作用）：
 *  - **卡级复制按钮**（`card-copy`）：每张场景卡的**卡头**注入 1 个按钮，`actionId`／文案恒读
 *    `HELP_COPY_ACTIONS.prompt`，`dataAttr` 取同卡 `<pre class="prompt">` 的原文（＝该卡 prompt 逐字；
 *    #88 S5 起改以 `<pre>` 为**主源**，读不到才回落 Sheet 内 prompt 按钮的 data-t），
 *    复用上面的 `[ACTION_ID_ATTR]` 委派（零新增监听、零契约变更）；卡内已有该类即跳过（幂等）。
 *  - **搜索**（`tab-search` ＋ `tab-search-input` ＋ `tab-search-clear` ＋ `page-hitcount`）：跨分组过滤卡片、
 *    `<mark class="card-mark">` 高亮命中、自动展开命中卡片的 Sheet 与子功能组、命中计数、
 *    清空复原、`Enter` 在命中分组页间跳页（自动跳第一个命中页）。
 *  - **Sheet 参数实时预览**：`editable_fields` 的静态值换成输入框，输入即重组
 *    「prompt ＋ 空行 ＋ `label: value` 行」（F3 `buildPrompt` 语义），并同步 prompt／params 复制按钮的
 *    `dataAttr`（否则复制到的是编辑前的旧文本）。
 *  - **回到顶部**（`btn-backtop`，`id="backTop"`，H-19）：`scrollTop > 400` 加 `-show`，点击平滑回顶。
 *  纯度：只用 `document.*`（含只读 `document.scrollingElement`）＋ 既有只读 `window.matchMedia`；
 *  不向 `window.<id>`／`globalThis.<id>` 赋值、不引 `node:`、不用 `classList`（类名走 `className` 字符串
 *  增删，兼容 `style.test.mjs` T28 的「动效纯 CSS」断言）、不产内联 `on*`。
 *
 *  **#121 追加（H-16 双反馈的按钮通道；文档 `docs/visual-spec-help.md:195,197`）**：复制**成功**时给
 *  **被点击的那个按钮**加 `copied` 类（`HELP_COPY_COPIED_CLASS`，规格逐字、无 `ilife-` 前缀），
 *  `HELP_COPY_COPIED_MS`（450ms）后移除；失败路径**不**加类（不静默变绿）。落点仍在**既有
 *  `boot()`／既有委派**内：`onClick` 把命中的按钮一并传给 `copy()` → 两条成功通道
 *  （`navigator.clipboard`／`execCommand` 兜底）各自在成功分支调 `markCopied(btn)`，零新增监听、
 *  零新增 marker、零新签名；类名增删复用既有 `addClass`／`removeClass`（`className` 字符串口径）。 */
export const buildSharedHelpersJs: BuildSharedHelpersJs = (input) => {
  const prefix = helpersPrefix(input);
  const dataAttr = helpersDataAttr(input);
  const markerAttr = 'data-' + prefix.replace(/-+$/, '') + '-helpers';
  const markerSelector = '[' + markerAttr + '="1"]';
  // #88 S4：HELP 壳命名空间（缺省 `ilife-help-shell`；`prefix` 覆盖时随动，不残留缺省前缀）。
  const shellClass = prefix + helpShellSlug();
  const shellPart = (suffix: string): string => shellClass + '-' + suffix;
  const promptAttr = 'data-' + prefix.replace(/-+$/, '') + '-help-prompt';
  const copyAction = HELP_COPY_ACTIONS.prompt;
  const paramsAction = HELP_COPY_ACTIONS.params;
  const lines: string[] = [
    '(function () {',
    "  'use strict';",
    '  var MARKER_ATTR = ' + jsStr(markerAttr) + ';',
    '  var MARKER_SEL = ' + jsStr(markerSelector) + ';',
    '  var ACTION_ATTR = ' + jsStr(ACTION_ID_ATTR) + ';',
    '  var TEXT_ATTR = ' + jsStr(dataAttr) + ';',
    '  var STACK_CLASS = ' + jsStr(prefix + 'toast-stack') + ';',
    '  var TOAST_CLASS = ' + jsStr(prefix + 'toast') + ';',
    '  var ICON_CLASS = ' + jsStr(prefix + 'toast-icon') + ';',
    '  var ICON_OK = ' + jsStr(TOAST_ICON_GLYPHS.copy) + ';',
    '  var ICON_FAIL = ' + jsStr(TOAST_ICON_GLYPHS.danger) + ';',
    '  var CHIP_CLASS = ' + jsStr(prefix + 'toast-chip') + ';',
    '  var CHIP_DANGER_CLASS = ' + jsStr(prefix + 'toast-chip-danger') + ';',
    '  var TITLE_CLASS = ' + jsStr(prefix + 'toast-title') + ';',
    '  var BODY_CLASS = ' + jsStr(prefix + TOAST_BODY_CLASS) + ';',
    '  var TITLE_ROW_CLASS = ' + jsStr(prefix + TOAST_TITLE_ROW_CLASS) + ';',
    '  var DETAIL_CLASS = ' + jsStr(prefix + TOAST_DETAIL_CLASS) + ';',
    '  var CLOSE_CLASS = ' + jsStr(prefix + TOAST_CLOSE_CLASS) + ';',
    '  var OK_MSG = ' + jsStr(COPY_TEXT_DEFAULTS.okMessage) + ';',
    '  var OK_DETAIL = ' + jsStr(COPY_TEXT_DEFAULTS.okDetail) + ';',
    '  var FAIL_MSG = ' + jsStr(COPY_TEXT_DEFAULTS.failMessage) + ';',
    '  var FAIL_DETAIL = ' + jsStr(COPY_TEXT_DEFAULTS.failDetail) + ';',
    // 失败徽章文案取 `STATUS_DEFAULT_TEXT.danger`（与静态产出器 `copyText` 的失败徽章同一处常量，不产第二份真相）
    '  var FAIL_BADGE = ' + jsStr(STATUS_DEFAULT_TEXT.danger) + ';',
    '  var CLOSE_LABEL = ' + jsStr(TOAST_CLOSE_LABEL) + ';',
    '  var TIMEOUT_MS = ' + TOAST_DEFAULTS.timeoutMs + ';',
    '  var MAX_STACK = ' + TOAST_DEFAULTS.maxStack + ';',
    '  var MOBILE_MAX_STACK = ' + TOAST_DEFAULTS.mobileMaxStack + ';',
    '  var MOBILE_MAX_PX = ' + TOAST_DEFAULTS.mobileMaxPx + ';',
    '  var LF = String.fromCharCode(10);',
    '  var LF2 = LF + LF;',
    // #88 S4：HELP 速查台类名／选择器（同一命名空间，逐条由 `shellClass` 派生）
    '  var SHELL_SEL = ' + jsStr('.' + shellClass) + ';',
    '  var CARD_CLASS = ' + jsStr(shellPart('card')) + ';',
    '  var CARD_TOP_CLASS = ' + jsStr(shellPart('card-top')) + ';',
    '  var CARD_COPY_CLASS = ' + jsStr(shellPart('card-copy')) + ';',
    '  var CARD_MARK_CLASS = ' + jsStr(shellPart('card-mark')) + ';',
    '  var CARD_HIDDEN_CLASS = ' + jsStr(shellPart('card-hidden')) + ';',
    '  var SHEET_CLASS = ' + jsStr(shellPart('sheet')) + ';',
    '  var PROMPT_CLASS = ' + jsStr(shellPart('prompt')) + ';',
    '  var PROMPT_ATTR = ' + jsStr(promptAttr) + ';',
    '  var FIELD_CLASS = ' + jsStr(shellPart('field')) + ';',
    '  var FIELD_LABEL_CLASS = ' + jsStr(shellPart('field-label')) + ';',
    '  var FIELD_VALUE_CLASS = ' + jsStr(shellPart('field-value')) + ';',
    '  var FIELD_HINT_CLASS = ' + jsStr(shellPart('field-hint')) + ';',
    '  var FIELD_INPUT_CLASS = ' + jsStr(shellPart('field-input')) + ';',
    '  var TAB_BAR_CLASS = ' + jsStr(shellPart('tab-bar')) + ';',
    '  var TAB_INPUT_CLASS = ' + jsStr(shellPart('tab-input')) + ';',
    '  var SEARCH_BOX_CLASS = ' + jsStr(shellPart('tab-search')) + ';',
    '  var SEARCH_INPUT_CLASS = ' + jsStr(shellPart('tab-search-input')) + ';',
    '  var SEARCH_CLEAR_CLASS = ' + jsStr(shellPart('tab-search-clear')) + ';',
    '  var HITCOUNT_CLASS = ' + jsStr(shellPart('page-hitcount')) + ';',
    '  var PAGE_CLASS = ' + jsStr(shellPart('page')) + ';',
    '  var SUBGROUP_CLASS = ' + jsStr(shellPart('subgroup')) + ';',
    '  var SUBGROUP_HIDDEN_CLASS = ' + jsStr(shellPart('subgroup-hidden')) + ';',
    '  var CLI_CLASS = ' + jsStr(shellPart('cli')) + ';',
    '  var BACKTOP_CLASS = ' + jsStr(shellPart('btn-backtop')) + ';',
    '  var BACKTOP_SHOW_CLASS = ' + jsStr(shellPart('btn-backtop-show')) + ';',
    '  var BACKTOP_ID = ' + jsStr(HELP_BACKTOP_ID) + ';',
    '  var BACKTOP_MIN_Y = ' + HELP_BACKTOP_MIN_Y + ';',
    '  var BACKTOP_LABEL = ' + jsStr(HELP_BACKTOP_LABEL) + ';',
    '  var BACKTOP_ARIA = ' + jsStr(HELP_BACKTOP_ARIA) + ';',
    '  var SEARCH_PLACEHOLDER = ' + jsStr(HELP_SEARCH_PLACEHOLDER) + ';',
    '  var SEARCH_ARIA = ' + jsStr(HELP_SEARCH_ARIA) + ';',
    '  var CLEAR_LABEL = ' + jsStr(HELP_CLEAR_LABEL) + ';',
    '  var CLEAR_ARIA = ' + jsStr(HELP_CLEAR_ARIA) + ';',
    '  var HIT_PREFIX = ' + jsStr(HELP_HIT_PREFIX) + ';',
    '  var HIT_SUFFIX = ' + jsStr(HELP_HIT_SUFFIX) + ';',
    '  var HIT_EMPTY = ' + jsStr(HELP_HIT_EMPTY) + ';',
    '  var COPY_ACTION = ' + jsStr(copyAction.actionId) + ';',
    '  var COPY_LABEL = ' + jsStr(copyAction.label) + ';',
    '  var COPIED_CLASS = ' + jsStr(HELP_COPY_COPIED_CLASS) + ';',
    '  var COPIED_MS = ' + HELP_COPY_COPIED_MS + ';',
    '  var PARAMS_ACTION = ' + jsStr(paramsAction.actionId) + ';',
    '  var searchTerm = "";',
    '  var clickBound = false;',
    // #88 S5（B 段红队 S3-a）：委派去重的**跨实例**判据——同一页面里 helpers 被多次注入时，
    // 每个实例各有自己的闭包（`clickBound` 管不住别人），故在**事件对象**上打一次性标记：
    // 同一事件只会被第一个处理器消费，一次点击恒只复制 1 次／出 1 个 toast。
    '  var HANDLED_PROP = ' + jsStr(prefix + 'help-click-handled') + ';',
    '',
    '  function boot() {',
    '    if (!document.body) return;',
    '    if (document.querySelector(MARKER_SEL)) return;',
    '    var marker = document.createElement("span");',
    '    marker.setAttribute(MARKER_ATTR, "1");',
    '    marker.hidden = true;',
    '    document.body.appendChild(marker);',
    // #88 S5（B 段红队 S3-a）：委派**只挂一次**——marker 被删后重入 boot() 不得重复 addEventListener，
    // 否则一次点击触发 N 次复制／N 个 toast。按钮／搜索框／#backTop 各自的幂等由自身早退保证。
    '    if (!clickBound) { clickBound = true; document.addEventListener("click", onClick); }',
    '    initHelpShell();',
    '  }',
    '',
    '  function onClick(ev) {',
    '    if (ev[HANDLED_PROP]) return;',
    '    ev[HANDLED_PROP] = 1;',
    '    var node = ev.target;',
    '    if (!node || typeof node.closest !== "function") return;',
    '    var close = node.closest("." + CLOSE_CLASS);',
    '    if (close) {',
    '      var box = close.parentNode;',
    '      if (box && box.parentNode) box.parentNode.removeChild(box);',
    '      return;',
    '    }',
    '    var btn = node.closest("[" + ACTION_ATTR + "]");',
    '    if (!btn) return;',
    '    var text = btn.getAttribute(TEXT_ATTR);',
    '    if (text === null) return;',
    '    copy(text, btn);',
    '  }',
    '',
    '  function copy(text, btn) {',
    '    var clip = navigator.clipboard;',
    '    if (clip && typeof clip.writeText === "function") {',
    '      try {',
    '        var done = clip.writeText(text);',
    '        if (done && typeof done.then === "function") {',
    '          done.then(function () { markCopied(btn); feedback(OK_MSG, false); }, function () { fallback(text, btn); });',
    '          return;',
    '        }',
    '        markCopied(btn);',
    '        feedback(OK_MSG, false);',
    '        return;',
    '      } catch (err) {',
    '        fallback(text, btn);',
    '        return;',
    '      }',
    '    }',
    '    fallback(text, btn);',
    '  }',
    '',
    '  function fallback(text, btn) {',
    '    var sink = document.createElement("textarea");',
    '    sink.value = text;',
    '    sink.setAttribute("readonly", "readonly");',
    '    sink.setAttribute("aria-hidden", "true");',
    '    sink.style.position = "fixed";',
    '    sink.style.left = "-9999px";',
    '    document.body.appendChild(sink);',
    '    sink.select();',
    '    var done = false;',
    '    try { done = document.execCommand("copy"); } catch (err) { done = false; }',
    '    if (sink.parentNode) sink.parentNode.removeChild(sink);',
    '    if (done) markCopied(btn);',
    '    feedback(done ? OK_MSG : FAIL_MSG, !done);',
    '  }',
    '',
    '  /* #121（H-16 双反馈的按钮通道）：成功态加 `copied` 类，450ms 后移除。',
    '     只在**成功**分支调用 → 失败路径不静默变绿；类名走 className 字符串（addClass／removeClass），',
    '     不用 DOM 的类名列表 API（纯度口径）；按钮缺失／已离页时 removeClass 仍安全（操作的是节点自身）。 */',
    '  function markCopied(btn) {',
    '    if (!btn) return;',
    '    addClass(btn, COPIED_CLASS);',
    '    setTimeout(function () { removeClass(btn, COPIED_CLASS); }, COPIED_MS);',
    '  }',
    '',
    '  function feedback(msg, bad) {',
    '    var cap = MAX_STACK;',
    '    if (window.matchMedia && window.matchMedia("(max-width: " + MOBILE_MAX_PX + "px)").matches) cap = MOBILE_MAX_STACK;',
    '    var host = document.querySelector("." + STACK_CLASS);',
    '    if (!host) {',
    '      host = document.createElement("div");',
    '      host.className = STACK_CLASS;',
    '      document.body.appendChild(host);',
    '    }',
    '    var box = document.createElement("div");',
    '    box.className = bad ? TOAST_CLASS + " " + TOAST_CLASS + "-danger" : TOAST_CLASS;',
    '    box.setAttribute("role", ' + jsStr(TOAST_DEFAULTS.role) + ');',
    '    box.setAttribute("aria-live", ' + jsStr(TOAST_DEFAULTS.ariaLive) + ');',
    // W1 根因修（结构对齐）＋ F-c 图标：运行时 DOM 与静态产出器／旧层同构——
    //   box > .toast-icon ＋ .toast-body(> .toast-title-row(> .toast-title) ＋ 可选 .toast-title-detail) ＋ .toast-close
    // 旧层为 `.hm-toast-icon + .hm-toast-body(> .hm-toast-title-row + .hm-toast-detail) + .hm-toast-close`
    // （`.scratch/t76/old-controls.md` §1.1）。图标字形取 `TOAST_ICON_GLYPHS[TOAST_DEFAULTS.defaultIcon]`
    // （📋，旧层 `base.js:74`／契约 `:141` 缺省；与静态产出器 `renderToast` 同源，不产第二份真相）。
    // 缺 body 包裹时标题／详情／关闭被排进同一 flex 行，
    // 靠 `flex-wrap` ＋ `flex:1 1 100%` 补丁才勉强分层，且把关闭按钮挤到第三行（R1 实测 113px 高）。
    // F-c 自证：新增仅用 `document.createElement／className／setAttribute／textContent／appendChild`
    // （`SHARED_HELPERS_JS_RULE.domAllowed=true` 允许 DOM 读取；未向 `window／globalThis` 赋值、
    // 未引 `node:`、未用 `classList／show`），故不破坏 #76 冻结产出内容契约与 T28 纯 CSS 动效断言。
    '    var icon = document.createElement("span");',
    '    icon.className = ICON_CLASS;',
    '    icon.setAttribute("aria-hidden", "true");',
    '    icon.textContent = bad ? ICON_FAIL : ICON_OK;',
    '    var body = document.createElement("div");',
    '    body.className = BODY_CLASS;',
    '    var titleRow = document.createElement("div");',
    '    titleRow.className = TITLE_ROW_CLASS;',
    '    var title = document.createElement("span");',
    '    title.className = TITLE_CLASS;',
    '    title.textContent = msg;',
    '    titleRow.appendChild(title);',
    // 5a（2026-09-12 用户裁定「UI 上要统一」）：失败态与静态产出器／老仓同形——红底「失败」徽章进标题行。
    '    if (bad) {',
    '      var chip = document.createElement("span");',
    '      chip.className = CHIP_CLASS + " " + CHIP_DANGER_CLASS;',
    '      chip.textContent = FAIL_BADGE;',
    '      titleRow.appendChild(chip);',
    '    }',
    '    body.appendChild(titleRow);',
    // 详情行两态都有：成功「粘贴给 AI」、失败「长按选择文本手动复制」（都取 `COPY_TEXT_DEFAULTS`，与老仓逐字同）。
    '    var detail = document.createElement("div");',
    '    detail.className = DETAIL_CLASS;',
    '    detail.textContent = bad ? FAIL_DETAIL : OK_DETAIL;',
    '    body.appendChild(detail);',
    '    box.appendChild(icon);',
    '    box.appendChild(body);',
    '    var close = document.createElement("button");',
    '    close.type = "button";',
    '    close.className = CLOSE_CLASS;',
    '    close.textContent = CLOSE_LABEL;',
    '    box.appendChild(close);',
    '    host.appendChild(box);',
    '    while (host.children.length > cap) host.removeChild(host.children[0]);',
    '    setTimeout(function () {',
    '      if (box.parentNode) box.parentNode.removeChild(box);',
    '    }, TIMEOUT_MS);',
    '  }',
    '',
    // ── #88 S4：HELP 速查台运行时增强（见上方产出内容契约的记账；全部由既有 boot() 调用） ──
    '  function initHelpShell() {',
    '    var shell = document.querySelector(SHELL_SEL);',
    '    if (!shell) return;',
    '    var cards = allOf(shell, "." + CARD_CLASS);',
    '    if (cards.length === 0) return;',
    '    injectCardCopy(cards);',
    '    initSheetPreview(cards);',
    '    initSearch(shell, cards);',
    '    initBackTop();',
    '  }',
    '',
    '  function allOf(root, sel) {',
    '    return Array.prototype.slice.call(root.querySelectorAll(sel));',
    '  }',
    '',
    '  function attrSel(name, value) {',
    '    return "[" + name + "=\\"" + value + "\\"]";',
    '  }',
    '',
    '  function hasClass(el, name) {',
    '    return (" " + el.className + " ").indexOf(" " + name + " ") > -1;',
    '  }',
    '',
    '  function addClass(el, name) {',
    '    if (hasClass(el, name)) return;',
    '    el.className = el.className ? el.className + " " + name : name;',
    '  }',
    '',
    '  function removeClass(el, name) {',
    '    if (!el.className) return;',
    '    var parts = el.className.split(" ");',
    '    var kept = [];',
    '    for (var i = 0; i < parts.length; i++) { if (parts[i] && parts[i] !== name) kept.push(parts[i]); }',
    '    el.className = kept.join(" ");',
    '  }',
    '',
    '  /* 卡级复制按钮（#88 R1-1）：卡头注入 1 个按钮——actionId／文案恒读冻结常量，',
    '     文本取同卡 `<pre class="prompt">` 的**原文**（＝该卡 prompt 逐字，与 F3 卡面同源）；',
    '     读不到 <pre> 才回落同卡 Sheet 内 prompt 按钮的 data-t，两者都无才跳过',
    '     （#88 S5／B 段红队 S3-a：真实壳恒有 <pre>，故 436/436 恒有按钮，不静默丢卡）→ 复用既有委派。 */',
    '  function injectCardCopy(cards) {',
    '    for (var i = 0; i < cards.length; i++) {',
    '      var card = cards[i];',
    '      if (card.querySelector("." + CARD_COPY_CLASS)) continue;',
    '      var pre = card.querySelector("." + PROMPT_CLASS);',
    '      var src = pre !== null ? pre : card.querySelector(attrSel(ACTION_ATTR, COPY_ACTION));',
    '      if (src === null) continue;',
    '      var text = pre !== null ? pre.textContent : src.getAttribute(TEXT_ATTR);',
    '      if (text === null) continue;',
    '      var btn = document.createElement("button");',
    '      btn.type = "button";',
    '      btn.className = CARD_COPY_CLASS;',
    '      btn.textContent = COPY_LABEL;',
    '      btn.setAttribute(ACTION_ATTR, COPY_ACTION);',
    '      btn.setAttribute(TEXT_ATTR, text);',
    '      var head = card.querySelector("." + CARD_TOP_CLASS);',
    '      if (head) head.appendChild(btn); else card.insertBefore(btn, card.firstChild);',
    '    }',
    '  }',
    '',
    '  /* Sheet 参数实时预览：静态值换输入框，输入即重组「prompt ＋ 空行 ＋ label: value 行」。 */',
    '  function initSheetPreview(cards) {',
    '    for (var i = 0; i < cards.length; i++) {',
    '      var card = cards[i];',
    '      var pre = card.querySelector("." + PROMPT_CLASS);',
    '      if (!pre) continue;',
    '      if (pre.getAttribute(PROMPT_ATTR) === null) pre.setAttribute(PROMPT_ATTR, pre.textContent);',
    '      var fields = allOf(card, "." + FIELD_CLASS);',
    '      for (var j = 0; j < fields.length; j++) bindField(card, fields[j]);',
    '    }',
    '  }',
    '',
    '  function bindField(card, field) {',
    '    if (field.querySelector("." + FIELD_INPUT_CLASS)) return;',
    '    var value = field.querySelector("." + FIELD_VALUE_CLASS);',
    '    var input = document.createElement("input");',
    '    input.type = "text";',
    '    input.className = FIELD_INPUT_CLASS;',
    '    input.value = value ? value.textContent : "";',
    '    input.setAttribute("value", input.value);',
    '    var hint = field.querySelector("." + FIELD_HINT_CLASS);',
    '    if (hint) input.setAttribute("placeholder", hint.textContent);',
    '    input.addEventListener("input", function () { refreshPreview(card); });',
    '    if (value && value.parentNode === field) field.replaceChild(input, value);',
    '    else field.appendChild(input);',
    '  }',
    '',
    '  function refreshPreview(card) {',
    '    var pre = card.querySelector("." + PROMPT_CLASS);',
    '    if (!pre) return;',
    '    var base = pre.getAttribute(PROMPT_ATTR);',
    '    if (base === null) return;',
    '    var lines = fieldLines(card);',
    '    var text = lines.length > 0 ? base + LF2 + lines.join(LF) : base;',
    '    pre.textContent = text;',
    '    syncCopyText(card, text, lines);',
    '    if (searchTerm !== "") markCard(card, searchTerm);',
    '  }',
    '',
    '  function fieldLines(card) {',
    '    var fields = allOf(card, "." + FIELD_CLASS);',
    '    var lines = [];',
    '    for (var i = 0; i < fields.length; i++) {',
    '      var input = fields[i].querySelector("." + FIELD_INPUT_CLASS);',
    '      var labelEl = fields[i].querySelector("." + FIELD_LABEL_CLASS);',
    '      var label = labelEl ? labelEl.textContent : "";',
    '      var raw = input ? input.value : "";',
    '      var val = raw.replace(/^\\s+|\\s+$/g, "");',
    '      if (val !== "") lines.push(label + ": " + val);',
    '    }',
    '    return lines;',
    '  }',
    '',
    '  /* 复制按钮文本同步：prompt 目标（卡头 ＋ Sheet 内）＝ 预览文本；params 目标＝label: value 行，',
    '     无字段时回落该卡 CLI 文本（与冻结壳 paramsText 同口径）。 */',
    '  function syncCopyText(card, text, lines) {',
    '    var buttons = allOf(card, "[" + ACTION_ATTR + "]");',
    '    for (var i = 0; i < buttons.length; i++) {',
    '      var id = buttons[i].getAttribute(ACTION_ATTR);',
    '      if (id === COPY_ACTION) buttons[i].setAttribute(TEXT_ATTR, text);',
    '      else if (id === PARAMS_ACTION) buttons[i].setAttribute(TEXT_ATTR, lines.length > 0 ? lines.join(LF) : cliTextOf(card));',
    '    }',
    '  }',
    '',
    '  function cliTextOf(card) {',
    '    var cli = card.querySelector("." + CLI_CLASS);',
    '    return cli ? cli.textContent : "";',
    '  }',
    '',
    '  /* 搜索：过滤 ＋ mark 标签高亮 ＋ 自动展开 ＋ 命中计数 ＋ 清空 ＋ 跳页。 */',
    '  function initSearch(shell, cards) {',
    '    var tabBar = shell.querySelector("." + TAB_BAR_CLASS);',
    '    if (!tabBar || !tabBar.parentNode) return;',
    '    if (shell.querySelector("." + SEARCH_BOX_CLASS)) return;',
    '    var box = document.createElement("div");',
    '    box.className = SEARCH_BOX_CLASS;',
    '    var input = document.createElement("input");',
    '    input.type = "search";',
    '    input.className = SEARCH_INPUT_CLASS;',
    '    input.setAttribute("placeholder", SEARCH_PLACEHOLDER);',
    '    input.setAttribute("aria-label", SEARCH_ARIA);',
    '    input.setAttribute("autocomplete", "off");',
    '    var clear = document.createElement("button");',
    '    clear.type = "button";',
    '    clear.className = SEARCH_CLEAR_CLASS;',
    '    clear.textContent = CLEAR_LABEL;',
    '    clear.setAttribute("aria-label", CLEAR_ARIA);',
    '    var count = document.createElement("span");',
    '    count.className = HITCOUNT_CLASS;',
    '    count.setAttribute("role", "status");',
    '    box.appendChild(input);',
    '    box.appendChild(clear);',
    '    box.appendChild(count);',
    '    tabBar.parentNode.insertBefore(box, tabBar.nextSibling);',
    '    var state = { sheets: [], subgroups: [], pages: [], index: 0 };',
    '    input.addEventListener("input", function () { runSearch(shell, cards, input, count, state); });',
    '    input.addEventListener("keydown", function (ev) {',
    '      if (ev.key !== "Enter") return;',
    '      ev.preventDefault();',
    '      if (state.pages.length === 0) return;',
    '      state.index = (state.index + 1) % state.pages.length;',
    '      jumpTo(state.pages[state.index]);',
    '    });',
    '    clear.addEventListener("click", function () {',
    '      input.value = "";',
    '      runSearch(shell, cards, input, count, state);',
    '      input.focus();',
    '    });',
    '  }',
    '',
    '  function runSearch(shell, cards, input, count, state) {',
    '    var term = input.value.replace(/^\\s+|\\s+$/g, "").toLowerCase();',
    '    resetSearch(shell, cards, state);',
    '    searchTerm = term;',
    '    if (term === "") { count.textContent = ""; state.pages = []; state.index = 0; return; }',
    '    var hits = [];',
    '    var i;',
    '    for (i = 0; i < cards.length; i++) {',
    '      var card = cards[i];',
    '      if (card.textContent.toLowerCase().indexOf(term) < 0) { addClass(card, CARD_HIDDEN_CLASS); continue; }',
    '      hits.push(card);',
    '      markCard(card, term);',
    '      var sheet = card.querySelector("." + SHEET_CLASS);',
    '      if (sheet && !sheet.open) { sheet.open = true; state.sheets.push(sheet); }',
    '    }',
    '    var subgroups = allOf(shell, "." + SUBGROUP_CLASS);',
    '    for (i = 0; i < subgroups.length; i++) {',
    '      var inner = allOf(subgroups[i], "." + CARD_CLASS);',
    '      var visible = false;',
    '      for (var j = 0; j < inner.length; j++) { if (hits.indexOf(inner[j]) > -1) { visible = true; break; } }',
    '      if (visible) { if (!subgroups[i].open) { subgroups[i].open = true; state.subgroups.push(subgroups[i]); } }',
    '      else addClass(subgroups[i], SUBGROUP_HIDDEN_CLASS);',
    '    }',
    '    var pages = allOf(shell, "." + PAGE_CLASS);',
    '    var hitPages = [];',
    '    for (i = 0; i < pages.length; i++) {',
    '      var pageCards = allOf(pages[i], "." + CARD_CLASS);',
    '      for (var k = 0; k < pageCards.length; k++) { if (hits.indexOf(pageCards[k]) > -1) { hitPages.push(pages[i]); break; } }',
    '    }',
    '    state.pages = hitPages;',
    '    state.index = 0;',
    '    count.textContent = hits.length > 0 ? HIT_PREFIX + hits.length + HIT_SUFFIX : HIT_EMPTY;',
    '    jumpTo(hitPages[0]);',
    '  }',
    '',
    '  function resetSearch(shell, cards, state) {',
    '    var i;',
    '    for (i = 0; i < cards.length; i++) {',
    '      removeClass(cards[i], CARD_HIDDEN_CLASS);',
    '      unmarkCard(cards[i]);',
    '    }',
    '    for (i = 0; i < state.sheets.length; i++) state.sheets[i].open = false;',
    '    state.sheets = [];',
    '    for (i = 0; i < state.subgroups.length; i++) state.subgroups[i].open = false;',
    '    state.subgroups = [];',
    '    var subgroups = allOf(shell, "." + SUBGROUP_CLASS);',
    '    for (i = 0; i < subgroups.length; i++) removeClass(subgroups[i], SUBGROUP_HIDDEN_CLASS);',
    '  }',
    '',
    '  function jumpTo(page) {',
    '    if (!page) return;',
    '    var radio = page.querySelector("." + TAB_INPUT_CLASS);',
    '    if (radio && radio.checked !== true) radio.checked = true;',
    '  }',
    '',
    '  function markCard(card, term) {',
    '    unmarkCard(card);',
    '    var nodes = [];',
    '    collectText(card, nodes);',
    '    for (var i = 0; i < nodes.length; i++) wrapTerm(nodes[i], term);',
    '  }',
    '',
    '  function unmarkCard(card) {',
    '    var marks = allOf(card, "." + CARD_MARK_CLASS);',
    '    for (var i = 0; i < marks.length; i++) {',
    '      var parent = marks[i].parentNode;',
    '      if (!parent) continue;',
    '      parent.replaceChild(document.createTextNode(marks[i].textContent), marks[i]);',
    '      if (typeof parent.normalize === "function") parent.normalize();',
    '    }',
    '  }',
    '',
    '  function collectText(root, out) {',
    '    var kids = root.childNodes;',
    '    for (var i = 0; i < kids.length; i++) {',
    '      var node = kids[i];',
    '      if (node.nodeType === 3) { if (node.nodeValue) out.push(node); continue; }',
    '      if (node.nodeType !== 1) continue;',
    '      if (hasClass(node, CARD_MARK_CLASS)) continue;',
    '      var tag = node.tagName;',
    '      if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "INPUT") continue;',
    '      collectText(node, out);',
    '    }',
    '  }',
    '',
    '  function wrapTerm(node, term) {',
    '    var rest = node.nodeValue;',
    '    var at = rest.toLowerCase().indexOf(term);',
    '    if (at < 0) return;',
    '    var frag = document.createDocumentFragment();',
    '    while (at > -1) {',
    '      if (at > 0) frag.appendChild(document.createTextNode(rest.slice(0, at)));',
    '      var mark = document.createElement("mark");',
    '      mark.className = CARD_MARK_CLASS;',
    '      mark.textContent = rest.slice(at, at + term.length);',
    '      frag.appendChild(mark);',
    '      rest = rest.slice(at + term.length);',
    '      at = rest.toLowerCase().indexOf(term);',
    '    }',
    '    if (rest !== "") frag.appendChild(document.createTextNode(rest));',
    '    if (node.parentNode) node.parentNode.replaceChild(frag, node);',
    '  }',
    '',
    '  /* 回到顶部（H-19）：scrollTop > BACKTOP_MIN_Y 才加 -show；点击平滑回顶。 */',
    '  function initBackTop() {',
    '    if (document.querySelector("." + BACKTOP_CLASS)) return;',
    '    var btn = document.createElement("button");',
    '    btn.type = "button";',
    '    btn.id = BACKTOP_ID;',
    '    btn.className = BACKTOP_CLASS;',
    '    btn.textContent = BACKTOP_LABEL;',
    '    btn.setAttribute("aria-label", BACKTOP_ARIA);',
    '    btn.setAttribute("title", BACKTOP_ARIA);',
    '    btn.addEventListener("click", function () {',
    '      var root = scrollRoot();',
    '      if (!root) return;',
    '      if (typeof root.scrollTo === "function") {',
    '        try { root.scrollTo({ top: 0, behavior: "smooth" }); return; } catch (err) { root.scrollTop = 0; return; }',
    '      }',
    '      root.scrollTop = 0;',
    '    });',
    '    document.body.appendChild(btn);',
    '    document.addEventListener("scroll", syncBackTop, true);',
    '    syncBackTop();',
    '  }',
    '',
    '  function scrollRoot() {',
    '    return document.scrollingElement || document.documentElement || document.body;',
    '  }',
    '',
    '  function syncBackTop() {',
    '    var btn = document.querySelector("." + BACKTOP_CLASS);',
    '    if (!btn) return;',
    '    var root = scrollRoot();',
    '    var y = root ? root.scrollTop : 0;',
    '    if (y > BACKTOP_MIN_Y) addClass(btn, BACKTOP_SHOW_CLASS); else removeClass(btn, BACKTOP_SHOW_CLASS);',
    '  }',
    '',
    '  if (document.body) boot();',
    '  else document.addEventListener("DOMContentLoaded", boot);',
    '}());',
  ];
  return lines.join(String.fromCharCode(10));
};

/* ── actionBar（复制三件套） ──────────────────────────────────────────── */

interface NormalizedCopyButton {
  readonly label: string;
  readonly actionId: string;
  readonly text: string | undefined;
}

function normalizeButtons(buttons: ActionBarInput['buttons']): ActionBarButton[] {
  if (buttons === undefined || buttons === null) return [];
  if (!Array.isArray(buttons)) badInput('renderActionBar: input.buttons 必须是数组');
  return buttons.map((button, i) => {
    const field = 'renderActionBar: input.buttons[' + i + ']';
    assertPlainObject(button, field);
    assertNoInlineHandler(button, field);
    if (typeof button.label !== 'string' || button.label === '') badInput(field + '.label 必须是非空字符串');
    if (!(ACTION_BAR_KINDS as readonly string[]).includes(button.kind)) {
      badInput(field + '.kind 必须是 ' + ACTION_BAR_KINDS.join('／'));
    }
    return {
      label: button.label,
      kind: button.kind as ActionBarKind,
      actionId: assertActionId(button.actionId, field + '.actionId'),
    };
  });
}

function normalizeCopyButton(input: CopyButtonInput | undefined, fallbackLabel: string, field: string): NormalizedCopyButton | null {
  if (input === undefined || input === null) return null;
  assertPlainObject(input, 'renderActionBar: input.' + field);
  assertNoInlineHandler(input, 'renderActionBar: input.' + field);
  return {
    label: typeof input.label === 'string' && input.label !== '' ? input.label : fallbackLabel,
    actionId: assertActionId(input.actionId, 'renderActionBar: input.' + field + '.actionId'),
    text: typeof input.text === 'string' ? input.text : undefined,
  };
}

function sceneButtonHtml(button: ActionBarButton): string {
  return '<button type="button" class="' + STYLE_PREFIX + 'action-btn ' + STYLE_PREFIX + 'action-btn-' + button.kind + '" '
    + ACTION_ID_ATTR + '="' + esc(button.actionId) + '">' + esc(button.label) + '</button>';
}

function copyButtonHtml(button: NormalizedCopyButton): string {
  const textAttr = button.text === undefined ? '' : ' ' + DEFAULT_DATA_ATTR + '="' + esc(button.text) + '"';
  return '<button type="button" class="' + STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost" '
    + ACTION_ID_ATTR + '="' + esc(button.actionId) + '"' + textAttr + '>' + esc(button.label) + '</button>';
}

/** 冻结签名：`renderActionBar(input: ActionBarInput): string`。
 *
 *  场景按钮（`primary`／`red`／`ghost`）一行；复制数据／复制日志 ghost 按钮**独立一行**
 *  （`ACTION_BAR_DEFAULTS.ghostOwnRow`）；复制文本渲染期写入 `DEFAULT_DATA_ATTR`、id 写入 `ACTION_ID_ATTR`，
 *  零内联脚本。缺 `actionId`／空串／同次渲染内重复 → `ControlsError` code `bad-input`。
 *  逐区尺寸（`minHeightPx`／`fontSizePx`／`fontWeight`／`ghostBorderAlpha`／`evenRowPairs`）由 #75 的
 *  共享样式区消费（本文件不产样式常量）。 */
export const renderActionBar: RenderActionBar = (input) => {
  assertPlainObject(input, 'renderActionBar: input');
  const bar = input as ActionBarInput;
  const buttons = normalizeButtons(bar.buttons);
  const copyData = normalizeCopyButton(bar.copyData, ACTION_BAR_DEFAULTS.copyDataLabel, 'copyData');
  const copyLog = normalizeCopyButton(bar.copyLog, ACTION_BAR_DEFAULTS.copyLogLabel, 'copyLog');

  const ids = new Set<string>();
  for (const button of buttons) {
    if (ids.has(button.actionId)) badInput('renderActionBar: actionId 同次渲染内重复：' + button.actionId);
    ids.add(button.actionId);
  }
  for (const copy of [copyData, copyLog]) {
    if (copy === null) continue;
    if (ids.has(copy.actionId)) badInput('renderActionBar: actionId 同次渲染内重复：' + copy.actionId);
    ids.add(copy.actionId);
  }

  const sceneHtml = buttons.map(sceneButtonHtml).join('');
  const ghostHtml = [copyData, copyLog].filter((copy): copy is NormalizedCopyButton => copy !== null).map(copyButtonHtml).join('');
  const rowClass = STYLE_PREFIX + 'action-row';
  const ghostRowClass = rowClass + ' ' + STYLE_PREFIX + 'action-row-ghost';
  const rows: string[] = [];
  if (sceneHtml !== '' && ghostHtml !== '' && !ACTION_BAR_DEFAULTS.ghostOwnRow) {
    rows.push('<div class="' + rowClass + '">' + sceneHtml + ghostHtml + '</div>');
  } else {
    if (sceneHtml !== '') rows.push('<div class="' + rowClass + '">' + sceneHtml + '</div>');
    if (ghostHtml !== '') rows.push('<div class="' + ghostRowClass + '">' + ghostHtml + '</div>');
  }
  return '<div class="' + STYLE_PREFIX + 'action-bar">' + rows.join('') + '</div>';
};

/* ── 状态三控件 ───────────────────────────────────────────────────────── */

/** 冻结签名：`renderStatusBadge(input: StatusBadgeInput): string`。
 *  非法 `status` 降级 `'empty'`（不抛错，防无样式徽章）；`text` 缺省／空串取 `STATUS_DEFAULT_TEXT`。 */
export const renderStatusBadge: RenderStatusBadge = (input) => {
  const badge = input === null || input === undefined || typeof input !== 'object' ? undefined : (input as StatusBadgeInput);
  const status: StatusKind = badge !== undefined && isStatusKind(badge.status) ? badge.status : 'empty';
  const text = badge === undefined ? undefined : badge.text;
  const label = typeof text === 'string' && text !== '' ? text : STATUS_DEFAULT_TEXT[status];
  return '<span class="' + STYLE_PREFIX + 'status-badge ' + STYLE_PREFIX + 'status-badge-' + status + '">' + esc(label) + '</span>';
};

/** 冻结签名：`renderEmptyState(input: EmptyStateInput): string`。
 *  `icon`／`text`／`hint` 一律转义；`actionHtml` 受信 HTML 透传（不转义）；`text` 缺失／非字符串 → `bad-input`。 */
export const renderEmptyState: RenderEmptyState = (input) => {
  assertPlainObject(input, 'renderEmptyState: input');
  const state = input as EmptyStateInput;
  if (typeof state.text !== 'string') badInput('renderEmptyState: input.text 必须是字符串');

  const parts: string[] = [];
  if (typeof state.icon === 'string' && state.icon !== '') {
    parts.push('<div class="' + STYLE_PREFIX + 'empty-icon">' + esc(state.icon) + '</div>');
  }
  parts.push('<div class="' + STYLE_PREFIX + 'empty-text">' + esc(state.text) + '</div>');
  if (typeof state.hint === 'string' && state.hint !== '') {
    parts.push('<div class="' + STYLE_PREFIX + 'empty-hint">' + esc(state.hint) + '</div>');
  }
  if (typeof state.actionHtml === 'string' && state.actionHtml !== '') {
    parts.push('<div class="' + STYLE_PREFIX + 'empty-action">' + state.actionHtml + '</div>');
  }
  return '<div class="' + STYLE_PREFIX + 'empty">' + parts.join('') + '</div>';
};

/** 修正重试按钮缺省文案（文档无规定；沿用旧基线）。 */
const ERROR_RETRY_LABEL = '修正重试';

/** 错误标题前缀（文档无规定；沿用旧基线 `❌ `）。 */
const ERROR_TITLE_PREFIX = '❌ ';

/** 冻结签名：`renderErrorReceipt(input: ErrorReceiptInput): string`。
 *  缺 `dataText`／`logText` → **不渲染**对应复制按钮（容错，不抛错）；id 缺省取
 *  `COPY_ACTION_IDS.errorReceipt.*`；**不读** `window.__hmPayload` 之类旧全局（AC-7）。 */
export const renderErrorReceipt: RenderErrorReceipt = (input) => {
  assertPlainObject(input, 'renderErrorReceipt: input');
  const receipt = input as ErrorReceiptInput;
  if (typeof receipt.message !== 'string') badInput('renderErrorReceipt: input.message 必须是字符串');

  const retryLabel = typeof receipt.retryPrompt === 'string' && receipt.retryPrompt !== '' ? receipt.retryPrompt : ERROR_RETRY_LABEL;
  const actions: string[] = [
    '<button type="button" class="' + STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-primary ' + STYLE_PREFIX + 'copy-btn-wide">'
    + esc(retryLabel) + '</button>',
  ];

  const ids = new Set<string>();
  const pushCopy = (text: unknown, rawId: unknown, fallbackId: string, label: string, field: string): void => {
    if (typeof text !== 'string') return;
    const actionId = rawId === undefined ? fallbackId : assertActionId(rawId, 'renderErrorReceipt: input.' + field);
    if (ids.has(actionId)) badInput('renderErrorReceipt: actionId 同次渲染内重复：' + actionId);
    ids.add(actionId);
    actions.push('<button type="button" class="' + STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost" '
      + ACTION_ID_ATTR + '="' + esc(actionId) + '" ' + DEFAULT_DATA_ATTR + '="' + esc(text) + '">' + esc(label) + '</button>');
  };
  pushCopy(receipt.dataText, receipt.dataActionId, COPY_ACTION_IDS.errorReceipt.copyData, ACTION_BAR_DEFAULTS.copyDataLabel, 'dataActionId');
  pushCopy(receipt.logText, receipt.logActionId, COPY_ACTION_IDS.errorReceipt.copyLog, ACTION_BAR_DEFAULTS.copyLogLabel, 'logActionId');

  return '<div class="' + STYLE_PREFIX + 'error">'
    + '<div class="' + STYLE_PREFIX + 'error-title">' + esc(ERROR_TITLE_PREFIX + receipt.message) + '</div>'
    + '<div class="' + STYLE_PREFIX + 'error-actions">' + actions.join('') + '</div>'
    + '</div>';
};
