/** controls · toast
 *
 *  自 `src/controls.ts` 原样切出。
 *
 *  **住址**：目录化批次⑤把 `src/controls.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（五个渲染器 ＋ 共享 helpers JS ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { assertActionId, assertNoInlineHandler, assertPlainObject, badInput, esc } from './shared.js';
import { ACTION_ID_ATTR, RenderToast, TOAST_DEFAULTS, ToastBadge, ToastController, ToastHostPort, ToastIcon, ToastInput } from '../../spec/index.js';
import { STYLE_PREFIX } from '../../style.js';

/* ── toast（`renderToast` ＋ `createToastController`） ─────────────────── */

/** 图标字形：`TOAST_ICONS` 是**冻结的枚举名**（不是字形），字形属文档未规定项（旧层 `base.js:74` 同值）。
 *  **导出（#154）**：区块层 B-12 的「页内静态提示」形态要把同一个图标放进浅色块里，
 *  字形只此一份（`blocks.ts` 引用本表，不另抄）；本表**不进** `src/index.ts` 出口面。 */
export const TOAST_ICON_GLYPHS: Readonly<Record<ToastIcon, string>> = Object.freeze({
  copy: '📋',
  ok: '✅',
  warn: '⚠️',
  danger: '❌',
  info: '💡',
});

/** 图标位的**文字标签**（#733 新增）：与 `TOAST_ICON_GLYPHS` 一一对应的中文词。
 *
 *  为什么要有它：`pageUi` ⑩ 那条为了治「emoji 在手机上小且糊」，把字形用 `font-size: 0` 收起、
 *  再用 `::after { content: "已完成" }` 把词**画**在屏幕上——词只活在 CSS 里。
 *  实测（32/32 页）：整份产物里「已完成」只出现 1 次，就是那行 `content:`；`<body>` 里一次都没有。
 *  后果＝屏幕上那个词**不可选中、不可搜索、不可复制、屏读器读不到、打印与 PDF 取不到字**。
 *  改法＝词进 DOM：图标位里同时放字形与这枚标签，谁显谁隐交 CSS（见 `blocks.ts` 的 note 区 CSS
 *  与 `pageUi` ⑩）。不启用 `pageUi` 的页仍只显字形，外观与改前逐值相同。 */
export const TOAST_ICON_LABELS: Readonly<Record<ToastIcon, string>> = Object.freeze({
  copy: '已复制',
  ok: '已完成',
  warn: '注意',
  danger: '未通过',
  info: '提示',
});

/** 徽章类型允许清单：取冻结类型 `ToastBadge['type']` 的成员（非法值回落 `'ok'`，旧层口径）。 */
const TOAST_BADGE_TYPES = ['ok', 'warn', 'danger'] as const satisfies readonly ToastBadge['type'][];

/** 关闭按钮文案（文档无规定；沿用旧基线 `✓ 知道了`）。 */
export const TOAST_CLOSE_LABEL = '✓ 知道了';

/** 关闭按钮的命名空间类（helpers JS 按 `prefix` 派生同名选择器，见 `buildSharedHelpersJs`）。 */
export const TOAST_CLOSE_CLASS = 'toast-close';

/** toast 结构类名（**静态产出器与 helpers 运行时共用同一份**，故提为常量）：
 *  `body` 包裹 `title-row`（＋ 可选 detail），close 在 body 之外 —— 与旧层
 *  `.hm-toast-icon + .hm-toast-body(> .hm-toast-title-row + .hm-toast-detail) + .hm-toast-close`
 *  **同构**（旧层取证 `.scratch/t76/old-controls.md` §1.1；返修 W1 根因修）。
 *  运行时详情类名沿用 `toast-title-detail`（既有 helpers 产出，不新增类名）。 */
export const TOAST_BODY_CLASS = 'toast-body';
export const TOAST_TITLE_ROW_CLASS = 'toast-title-row';
export const TOAST_DETAIL_CLASS = 'toast-title-detail';

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

