/** ledger-rows · **渲染**（账目行：一页的读数逐项列成"账"）。
 *
 *  —— 账目行 ——
 *
 *  形状：`标签 …………… 值 单位`——标签靠左、值靠右、中间一条点线把两只眼睛连起来（读的时候不会串行）。
 *  两种行：`item`＝普通项（缺省）／`total`＝合计行（上一条实线、加粗）。
 *
 *  它替掉的是哪几种错法：
 *   · 一行里"标签：值"用冒号串起来，多行排下来右边的值参差不齐（列没对齐 ⇒ 没法纵向比数）；
 *   · 用表格做"只有两列、且第二列是值"的清单（表格的表头、斑马纹、列宽规则都是多余的）；
 *   · 同一页里"目标／剩余／记录条数"各占一张 KPI 卡（三张卡说三行字）。
 *
 *  与既有件的关系（**选型先看这三条**）：
 *   · 值是一排**并列的格子**、要横着比（拍摄时间／标签／文件名）→ 用 `renderFactStrip`；
 *   · 值是**一列**、要竖着比、且行数不定（本件）→ 用账目行；
 *   · 要"改前 → 改后"两列对照 → 用 `renderChangeRows`。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';

/** 行的两种身份：`item`＝普通项（缺省）／`total`＝合计行。 */
export const LEDGER_ROW_KINDS = ['item', 'total'] as const;
export type LedgerRowKind = (typeof LEDGER_ROW_KINDS)[number];

/** 引导线的两形态：`dots`＝点线（缺省，纸质单据语汇）／`none`＝不画（干净版）。 */
export const LEDGER_LEADERS = ['dots', 'none'] as const;
export type LedgerLeader = (typeof LEDGER_LEADERS)[number];

export interface LedgerRowInput {
  /** 这一行说的是什么（人话短标签，如「目标」「餐别覆盖」）。 */
  readonly label: string;
  /** 这一行的值（**已是给人看的样子**）。 */
  readonly value: string;
  /** 值的单位（`卡`／`g`／`天`）；给了就小一号跟值后面。 */
  readonly unit?: string;
  readonly kind?: LedgerRowKind;
}

export interface LedgerRowsInput {
  /** 一行一条账目；0 条＝空串（与"没内容不留空块"同口径）。 */
  readonly rows: readonly LedgerRowInput[];
  /** 小标题（如「账目」）；不给＝不出。字距由样式段统一，调用方不要自己加空格的写法。 */
  readonly heading?: string;
  /** 引导线；缺省 `dots`。 */
  readonly leader?: LedgerLeader;
  readonly extraClass?: string;
}

/** 账目行：一列"标签 → 值"的对齐清单。空数组出不了一个字。 */
export function renderLedgerRows(input: LedgerRowsInput): string {
  assertPlainObject(input, 'renderLedgerRows: input');
  if (!Array.isArray(input.rows)) badInput('ledger-rows: input.rows 必须是数组');
  if (input.rows.length === 0) return '';
  const leader = input.leader ?? 'dots';
  if (!(LEDGER_LEADERS as readonly string[]).includes(leader)) {
    badInput('ledger-rows: input.leader 必须是 ' + LEDGER_LEADERS.join('／') + ' 之一');
  }
  const heading = optText(input.heading, 'ledger-rows: input.heading');
  const extra = optExtraClass(input.extraClass, 'ledger-rows: input.extraClass');
  const p = 'ilife-block-ledger-row';
  const rows = input.rows.map((raw, i) => {
    const field = 'ledger-rows: input.rows[' + i + ']';
    assertPlainObject(raw, field);
    const label = reqText(raw.label, field + '.label');
    const value = reqText(raw.value, field + '.value');
    const unit = optText(raw.unit, field + '.unit');
    const kind = raw.kind ?? 'item';
    if (!(LEDGER_ROW_KINDS as readonly string[]).includes(kind)) {
      badInput('ledger-rows: ' + field + '.kind 必须是 ' + LEDGER_ROW_KINDS.join('／') + ' 之一');
    }
    return '<div class="' + p + (kind === 'item' ? '' : ' is-' + kind) + '">'
      + '<span class="' + p + '-label">' + esc(label) + '</span>'
      + (leader === 'dots' ? '<span class="' + p + '-leader" aria-hidden="true"></span>' : '')
      + '<span class="' + p + '-value">' + esc(value)
      + (unit === undefined ? '' : '<small>' + esc(unit) + '</small>') + '</span>'
      + '</div>';
  }).join('');
  return '<div class="ilife-block-ledger-rows' + (extra === undefined ? '' : ' ' + extra) + '">'
    + (heading === undefined ? '' : '<div class="ilife-block-ledger-rows-heading">' + esc(heading) + '</div>')
    + rows + '</div>';
}
