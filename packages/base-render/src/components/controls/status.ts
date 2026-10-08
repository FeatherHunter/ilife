/** controls · status
 *
 *  自 `src/controls.ts` 原样切出。
 *
 *  **住址**：目录化批次⑤把 `src/controls.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（五个渲染器 ＋ 共享 helpers JS ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { resolve } from 'base-entries';
import { assertActionId, assertPlainObject, badInput, esc, isStatusKind } from './shared.js';
import { BASE_RENDER_CATALOG, type BaseRenderMessageId } from '../../entries/index.js';
import { ACTION_BAR_DEFAULTS, ACTION_ID_ATTR, COPY_ACTION_IDS, DEFAULT_DATA_ATTR, EmptyStateInput, ErrorReceiptInput, RenderEmptyState, RenderErrorReceipt, RenderStatusBadge, STATUS_DEFAULT_TEXT, StatusBadgeInput, StatusKind } from '../../spec/index.js';
import { STYLE_PREFIX } from '../../style.js';

/* ── 状态三控件 ───────────────────────────────────────────────────────── */

/** 状态闭集 → 词条 key（**逐格写死**：拼错 key 编译期红）。这是「契约 key 化」的落点：
 *  契约上留的种类是**机器键**（STATUS_KINDS），默认字按 key 从词条表取，不再写死在渲染函数里。 */
const STATUS_TEXT_ID = {
  ok: 'status-badge.text.ok',
  warn: 'status-badge.text.warn',
  danger: 'status-badge.text.danger',
  empty: 'status-badge.text.empty',
} as const satisfies Readonly<Record<StatusKind, BaseRenderMessageId>>;

/** 冻结签名：`renderStatusBadge(input: StatusBadgeInput): string`。
 *  非法 `status` 降级 `'empty'`（不抛错，防无样式徽章）；`text` 缺省／空串取`STATUS_DEFAULT_TEXT`。
 *  `language` 给了就按 key 取词条（走回退链）；不给（空串）⇒ 取到 zh 那一条，逐字等于
 *  `STATUS_DEFAULT_TEXT`，故既有产物逐字节不变。 */
export const renderStatusBadge: RenderStatusBadge = (input) => {
  const badge = input === null || input === undefined || typeof input !== 'object' ? undefined : (input as StatusBadgeInput);
  const status: StatusKind = badge !== undefined && isStatusKind(badge.status) ? badge.status : 'empty';
  const text = badge === undefined ? undefined : badge.text;
  const label = typeof text === 'string' && text !== ''
    ? text
    : resolve(BASE_RENDER_CATALOG, badge?.language ?? '', STATUS_TEXT_ID[status]);
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
  // #733 复现实测：这一颗**从来不带** ACTION_ID_ATTR 与 DEFAULT_DATA_ATTR（件头第 42 行自述「该按钮不带…」），
  //   而产物内联委派的第一道 `node.closest("[data-action-id]")` 就早退 ⇒ **点了零动作、零反馈**。
  //   记账写入域 16 张采集页上，它是整块错误回执里视觉权重最重的一颗（primary ＋ wide），
  //   维护者逐字要求：「要么真能点，要么看起来就不能点，不许留在『看着能点、点了没反应』这一档」。
  //   改法＝走后者：加 `disabled` ＋ `aria-disabled`，吃既有的 `.copy-btn[disabled]` 样式
  //   （浅底 ＋ `--fg3` 字 ＋ `cursor: not-allowed`），它当场从「最响的一颗」变成明显不可点的一行。
  //   不改成「真能点」的原因：它的文案是「补齐了，说一遍试试」，而这一页是静态文档，
  //   「再试一次」这件事只有宿主（助手）能做——给它编一个动作才是说谎。
  const actions: string[] = [
    '<button type="button" class="' + STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-primary ' + STYLE_PREFIX + 'copy-btn-wide"'
    + ' disabled aria-disabled="true">' + esc(retryLabel) + '</button>',
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
