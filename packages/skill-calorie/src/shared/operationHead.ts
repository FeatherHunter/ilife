/** #422 · 回执四态头（技能层共用件）：`create`／`add`／`update`／`delete` 四态的**标签／色档／图标**
 *  三张表只在本文件定义一处；回执页族与读页族一律引用本件，不再各写一份。
 *
 * 老实物出处（逐值）：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\crud_receipt.html:192-197`
 * 的三张表加一个回退——`opLabels = {add:'新增', create:'新增', update:'修改', delete:'删除'}`、
 * `opColors = {add:'good', create:'good', update:'warn', delete:'bad'}`、
 * `opIcons = {add:'✓', create:'✓', update:'✎', delete:'✕'}`、`opLabel = opLabels[op] || op`。
 * 老表 `good`／`bad` 两档在本仓公共层叫 `ok`／`danger`（`base-paint` 的 `StatusKind` 四值
 * `ok／warn／danger／empty`），故色档表逐格对到公共层的档名，**本件不写任何色值**：
 * 颜色由公共层 `renderStatusBadge` 的 `ilife-status-badge-<档>` 承担（样式单源住 `packages/base-render/`）。
 *
 * 分工：本件只出**操作卡头部**（图标＋状标签徽章＋标题＋记录号＋时刻行）；
 * 结构词（记录号／未设置）住本件，域词（标题、时刻行里的来源句）一律由调用方给——不给默认标题、
 * 不给默认来源，免得哪一页悄悄用了别域的说法。
 */
import { STYLE_PREFIX, escapeHtml, renderStatusBadge } from 'base-paint';
import type { StatusKind } from 'base-paint';
import { CalorieRenderError } from '../render/errors.js';

/** 四态键（`add` 与 `create` 同态：老表两键一行，新增类命令两种写法都认）。 */
export type ReceiptOp = 'create' | 'add' | 'update' | 'delete';

/** 状标签表（老实物 `opLabels` 逐值）。 */
export const OPERATION_LABELS: Readonly<Record<ReceiptOp, string>> = Object.freeze({
  create: '新增',
  add: '新增',
  update: '修改',
  delete: '删除',
});

/** 色档表（老实物 `opColors` 逐格对到公共层档名：good→ok、bad→danger）。 */
export const OPERATION_TONES: Readonly<Record<ReceiptOp, StatusKind>> = Object.freeze({
  create: 'ok',
  add: 'ok',
  update: 'warn',
  delete: 'danger',
});

/** 图标表（老实物 `opIcons` 逐值）。 */
export const OPERATION_ICONS: Readonly<Record<ReceiptOp, string>> = Object.freeze({
  create: '✓',
  add: '✓',
  update: '✎',
  delete: '✕',
});

/** 表外 op 的图标占位（标签回原 op 字串、色档回 `empty`，与老实物 `|| op` 同口径）。 */
const OP_FALLBACK_ICON = '·';

/** 操作卡头部入参（文案字段由调用方给；记录号给 `null` 即印「未设置」）。 */
export interface OperationHeadInput {
  readonly op: ReceiptOp;
  readonly title: string;
  readonly recordId: number | null;
  readonly actionAt: string;
  /** 时刻行后半句的来源（如「exercise_log (写库回执)」）；不给即只印时刻。 */
  readonly source?: string;
}

function reqText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CalorieRenderError('bad-input', field + ' 必须是非空字符串（本件不给默认文案）');
  }
  return value;
}

/** 操作卡头部：图标 ＋ 状标签（色档徽章）＋ 标题 ＋ 记录号 ＋ 时刻行。 */
export function operationHead(input: OperationHeadInput): string {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new CalorieRenderError('bad-input', 'operationHead: input 必须是对象');
  }
  const head = input as OperationHeadInput;
  const title = reqText(head.title, 'operationHead: input.title');
  const actionAt = reqText(head.actionAt, 'operationHead: input.actionAt');
  const recordId = head.recordId;
  if (recordId !== null && !Number.isInteger(recordId)) {
    throw new CalorieRenderError('bad-input', 'operationHead: input.recordId 须为整数或 null');
  }
  const op = typeof head.op === 'string' ? head.op : '';
  const label = OPERATION_LABELS[op as ReceiptOp] ?? op;
  const tone: StatusKind = OPERATION_TONES[op as ReceiptOp] ?? 'empty';
  const icon = OPERATION_ICONS[op as ReceiptOp] ?? OP_FALLBACK_ICON;
  const source = typeof head.source === 'string' && head.source !== '' ? head.source : undefined;
  const cls = STYLE_PREFIX + 'block-op-head';
  return '<div class="' + cls + ' ' + cls + '-' + tone + '">'
    + '<span class="' + cls + '-icon" aria-hidden="true">' + escapeHtml(icon) + '</span>'
    + renderStatusBadge({ status: tone, text: label })
    + '<h2 class="' + cls + '-title">' + escapeHtml(title) + '</h2>'
    + '<p class="' + cls + '-id">记录号 ' + (recordId === null ? '未设置' : '#' + recordId) + '</p>'
    + '<p class="' + cls + '-time">' + escapeHtml(source === undefined ? actionAt : actionAt + ' · ' + source) + '</p>'
    + '</div>';
}
