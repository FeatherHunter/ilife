/** invoice-lines · **渲染**（纯函数产 HTML；两形态：`chain` 逐行分解 ／ `waterfall` 瀑布条）。
 *
 *  —— 形态 A：逐行分解 ＋ 收口 ——
 *
 *  原价 → 各减项／加项 → 实付，**一条链读下来**：减项／加项逐级**缩进**（谁从谁身上减下去，一眼看得出），
 *  实付那一行由一条**重线**收口、**加粗放大**；均摊不另开一块，写进实付行的副语。
 *  每个减项／加项自带**「为什么」**（左端一枚标签点出来）——说不出原因的行在 `model.ts` 就被拒了。
 *
 *  —— 形态 D：纯 CSS 瀑布条 ——
 *
 *  条长以「原价 ＋ 加项」为满分：段宽与金额等比，**减项与实付合起来正好铺满**（加项自己抬高了起点）。
 *  段太窄写不下字时不写字（**金额仍然在图例里逐行出**，关键语义一个都不截）。
 *
 *  它替掉的两种错法：
 *   · 只列一串金额（像普通账目行）——读者算不出「省了多少」；
 *   · 把原因写成行尾灰字一笔带过——读者不知道为什么减、下次还踩同一个坑。
 */
import { esc } from '../shared/escape.js';
import {
  INVOICE_LINES_CLASS,
  INVOICE_LINES_WHY_ADD,
  INVOICE_LINES_WHY_CUT,
  invoiceLinesSlot,
} from './attrs.js';
import { normalizeInvoiceLines, type InvoiceLinesModel, type InvoiceLineModel } from './model.js';

/** 一行（原价／减项／加项）。 */
function lineHtml(line: InvoiceLineModel): string {
  const parts: string[] = ['<li class="' + invoiceLinesSlot('line') + ' is-' + line.kind
    + '" data-ilife-invoice-kind="' + esc(line.kind) + '">'];
  parts.push('<span class="' + invoiceLinesSlot('label') + '">' + esc(line.label) + '</span>');
  parts.push('<span class="' + invoiceLinesSlot('amount') + '">' + esc(line.amountText) + '</span>');
  if (line.why !== undefined) {
    const tag = line.kind === 'base' ? '' : '<b>' + esc(line.kind === 'cut' ? INVOICE_LINES_WHY_CUT : INVOICE_LINES_WHY_ADD) + '</b>';
    parts.push('<span class="' + invoiceLinesSlot('why') + '">' + tag + esc(line.why) + '</span>');
  }
  parts.push('</li>');
  return parts.join('');
}

/** 实付那一行：重线收口 ＋ 加粗放大；均摊与前后的差额都写在它的副语里。 */
function totalHtml(m: InvoiceLinesModel): string {
  const parts: string[] = ['<li class="' + invoiceLinesSlot('line') + ' is-total" data-ilife-invoice-kind="total">'];
  parts.push('<span class="' + invoiceLinesSlot('label') + '">' + esc(m.totalLabel) + '</span>');
  parts.push('<span class="' + invoiceLinesSlot('amount') + '">' + esc(m.totalText) + '</span>');
  const subs: string[] = ['<span>' + esc(m.deltaText) + '</span>'];
  if (m.discountText !== undefined) subs.push('<span>' + esc(m.discountText) + '</span>');
  if (m.shareText !== undefined) subs.push('<span>' + esc(m.shareText) + '</span>');
  parts.push('<span class="' + invoiceLinesSlot('why') + '">' + subs.join('') + '</span>');
  if (m.shareNote !== undefined) {
    parts.push('<span class="' + invoiceLinesSlot('share') + '">' + esc(m.shareNote) + '</span>');
  }
  parts.push('</li>');
  return parts.join('');
}

/** 形态 A 的骨架。 */
function renderChain(m: InvoiceLinesModel): string {
  const parts: string[] = ['<ol class="' + invoiceLinesSlot('list') + '">'];
  for (const line of m.lines) parts.push(lineHtml(line));
  parts.push(totalHtml(m));
  parts.push('</ol>');
  if (m.note.length > 0) {
    const spans = m.note.map((s) => '<span>' + esc(s) + '</span>').join('');
    parts.push('<p class="' + invoiceLinesSlot('note') + '">' + spans + '</p>');
  }
  return parts.join('');
}

/** 形态 D 的骨架：一条纯 CSS 瀑布条 ＋ 逐行图例。 */
function renderWaterfall(m: InvoiceLinesModel): string {
  const parts: string[] = ['<div class="' + invoiceLinesSlot('bar') + '" role="img" aria-label="'
    + esc('从 ' + m.baseText + ' 到 ' + m.totalText + ' 的分解：' + m.deltaText) + '">'];
  for (const seg of m.segments) {
    parts.push('<span class="' + invoiceLinesSlot('seg') + ' is-' + seg.kind + '" style="width: '
      + esc(String(seg.pct)) + '%">'
      + (seg.wide ? '<b>' + esc(seg.label) + '</b><i>' + esc(seg.amountText) + '</i>' : '')
      + '</span>');
  }
  parts.push('</div>');
  parts.push('<p class="' + invoiceLinesSlot('foot') + '">' + esc('条长以「原价 ＋ 加项」为满分：' + m.spanText
    + '；减项与实付合起来正好铺满。') + '</p>');
  parts.push('<ul class="' + invoiceLinesSlot('legend') + '">');
  parts.push('<li class="' + invoiceLinesSlot('legend-row') + ' is-base">'
    + '<i class="' + invoiceLinesSlot('legend-swatch') + ' is-base" aria-hidden="true"></i>'
    + '<span class="' + invoiceLinesSlot('legend-label') + '">' + esc(m.lines[0].label) + '</span>'
    + '<span class="' + invoiceLinesSlot('legend-amount') + '">' + esc(m.baseText) + '</span></li>');
  for (const line of m.lines) {
    if (line.kind === 'base') continue;
    parts.push('<li class="' + invoiceLinesSlot('legend-row') + ' is-' + line.kind + '">'
      + '<i class="' + invoiceLinesSlot('legend-swatch') + ' is-' + line.kind + '" aria-hidden="true"></i>'
      + '<span class="' + invoiceLinesSlot('legend-label') + '">' + esc(line.label) + '</span>'
      + '<span class="' + invoiceLinesSlot('legend-amount') + '">' + esc(line.amountText) + '</span></li>');
  }
  parts.push('<li class="' + invoiceLinesSlot('legend-row') + ' is-total">'
    + '<i class="' + invoiceLinesSlot('legend-swatch') + ' is-total" aria-hidden="true"></i>'
    + '<span class="' + invoiceLinesSlot('legend-label') + '">' + esc(m.totalLabel) + '</span>'
    + '<span class="' + invoiceLinesSlot('legend-amount') + '">' + esc(m.totalText) + '</span></li>');
  parts.push('</ul>');
  const subs: string[] = ['<span>' + esc(m.deltaText) + '</span>'];
  if (m.discountText !== undefined) subs.push('<span>' + esc(m.discountText) + '</span>');
  if (m.shareText !== undefined) subs.push('<span>' + esc(m.shareText) + '</span>');
  for (const seg of m.note) subs.push('<span>' + esc(seg) + '</span>');
  parts.push('<p class="' + invoiceLinesSlot('note') + '">' + subs.join('') + '</p>');
  return parts.join('');
}

/** 形态 → 骨架（分派写在这里，加第三形态就是加一支）。 */
const SKELETONS: Readonly<Record<InvoiceLinesModel['form'], (m: InvoiceLinesModel) => string>> = {
  chain: renderChain,
  waterfall: renderWaterfall,
};

/** 渲染金额分解（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderInvoiceLines(input: unknown): string {
  const m = normalizeInvoiceLines(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + INVOICE_LINES_CLASS + ' is-' + m.form + extra + '">'
    + SKELETONS[m.form](m) + '</div>';
}
