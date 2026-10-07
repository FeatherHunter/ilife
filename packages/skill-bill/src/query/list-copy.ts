/** 查询列表复制门（1182 唯一定义地）：一笔一行＋截断拖尾＋窗口元数据＋CSV 真表头。
 *
 * base 冻结面不动（`buildDataText` 的 thin 一坨 JSON／旧表头不动），bill 内查询列表的复制三份
 * 从此只走本门：调用方经 `copyArea` 的 `dataText／dataJson／dataCsv` 覆写位传入（`copyArea` 本体不动）。
 * 地基复用（t1180 §七）：单行化／截断计数（Array.from）／CSV RFC4180／JSON 数仍数（金额按显示串原样）
 * 与回执门 `copyTextReceipt` 同口径，不另抄。
 *
 * 三份同源：文本／JSON／CSV 的行值同一次算出（金额原串、备注同一次截断、空值同一占位），
 * 行数＝已显示行（调用方传已截后的 `shown`，全量 `total` 只进元数据不进行）。
 * 旧门零产出：本门不经 `buildDataText`，文本无一坨 JSON，CSV 首行是真列名，JSON 无旧信封 `items` 键。
 *
 * 列序与表头同源：本件的 `COLUMNS` 即表格列的唯一定义（`./list.js`  import 本件，不再各写一次）。
 * 键序 时间／分类／金额／账户／账本／备注／编号，文案同上。
 */
import type { DataTableColumn } from 'base-paint/blocks';

/** 表格列（唯一定义地）：表头文本、列序；复制行标签与 CSV 表头同源于此。 */
export const COLUMNS: readonly DataTableColumn[] = [
  { key: 'time', label: '时间' },
  { key: 'category', label: '分类' },
  { key: 'amount', label: '金额', align: 'right' },
  { key: 'account', label: '账户' },
  { key: 'ledger', label: '账本' },
  { key: 'note', label: '备注' },
  { key: 'id', label: '编号' },
];

/** 备注截断上限（字数按 Array.from 计，CJK 一字一数；回执 200，列表一行须更紧，取 30）。 */
export const NOTE_TRUNC_LIMIT = 30;

/** 空值占位（与票据纸 DETAIL／空态同字 `—`，复制恒等于已显示行的人话面）。 */
const EMPTY_CELL = '—';

/** 已显示行（一律文本化串；金额是 `toFixed(2)` 后的串，三份原样用，不二次格式化）。 */
export interface ListCopyRow {
  readonly id: string;
  readonly time: string;
  readonly category: string;
  readonly amount: string;
  readonly account: string;
  readonly ledger: string;
  readonly note: string;
}

/** 票据侧库行投影入参（`BillRow` 的子集结构，调用方直接传 `BillRow[]`）。 */
export interface BillTicketRow {
  readonly id: number;
  readonly time: string;
  readonly category: string;
  readonly amount: number;
  readonly account: string;
  readonly ledger: string;
  readonly note: string;
}

/** 三份输入：标题（唤醒词）＋窗口原文＋全窗总数＋已显示行（已截后）。 */
export interface ListCopyInput {
  readonly title: string;
  readonly window: string;
  readonly total: number;
  readonly shown: readonly ListCopyRow[];
}

/** 单行化（CR／LF 压成空格，前后去空；复制每行恒单行，与回执门同口径）。 */
function oneLine(s: string): string {
  return s.replace(/\r\n|\r|\n/g, ' ').trim();
}

/** 文本格（空走占位，否则单行化）。 */
function cell(v: string): string {
  const t = typeof v === 'string' ? v : '';
  const flat = oneLine(t);
  return flat === '' ? EMPTY_CELL : flat;
}

/** 备注格（空走占位，否则单行化后超限截断＋拖尾 `…（省略N字）`，N＝省掉的字数）。 */
export function truncateNote(note: string): string {
  const t = typeof note === 'string' ? note : '';
  const flat = oneLine(t);
  if (flat === '') return EMPTY_CELL;
  const chars = Array.from(flat);
  if (chars.length <= NOTE_TRUNC_LIMIT) return flat;
  return chars.slice(0, NOTE_TRUNC_LIMIT).join('') + '…（省略' + String(chars.length - NOTE_TRUNC_LIMIT) + '字）';
}

/** 一行的七格（固定列序，与 COLUMNS 同序；备注走截断，其余走 cell）。 */
function rowCells(r: ListCopyRow): readonly [string, string, string, string, string, string, string] {
  return [cell(r.time), cell(r.category), cell(r.amount), cell(r.account), cell(r.ledger), truncateNote(r.note), cell(r.id)];
}

/** 窗口元数据行（共N笔／全列或仅列前M笔／窗口原文；M＝已显示数）。 */
function metaLine(window: string, total: number, shownCount: number): string {
  const w = oneLine(window) === '' ? EMPTY_CELL : oneLine(window);
  if (shownCount >= total) return '共 ' + String(total) + ' 笔，已全列 · 窗口：' + w;
  return '共 ' + String(total) + ' 笔，仅列前 ' + String(shownCount) + ' 笔 · 窗口：' + w;
}

/** 标题行（唤醒词原文；空走记账数据）。 */
function titleLine(title: string): string {
  const t = typeof title === 'string' ? title.trim() : '';
  return t === '' ? '记账数据' : t;
}

/** 纯文本：标题＋元数据＋一笔一行（固定列序带标签，` | ` 分隔；LF，无尾换行）。 */
export function buildListCopyText(input: ListCopyInput): string {
  const lines = [titleLine(input.title), metaLine(input.window, input.total, input.shown.length)];
  for (const r of input.shown) {
    const [time, category, amount, account, ledger, note, id] = rowCells(r);
    lines.push('时间 ' + time + ' | 分类 ' + category + ' | 金额 ' + amount + ' | 账户 ' + account + ' | 账本 ' + ledger + ' | 备注 ' + note + ' | 编号 ' + id);
  }
  return lines.join('\n');
}

/** JSON：标题／窗口／总数／已显示数＋行数组（键序固定，金额原串，备注同截断；2 空格，无尾换行）。 */
export function buildListCopyJson(input: ListCopyInput): string {
  const rows = input.shown.map((r) => {
    const [time, category, amount, account, ledger, note, id] = rowCells(r);
    return { time, category, amount, account, ledger, note, id };
  });
  return JSON.stringify({
    title: titleLine(input.title),
    window: oneLine(input.window),
    total: input.total,
    shown: input.shown.length,
    rows,
  }, null, 2);
}

/** CSV 格（RFC4180：含逗号／引号／换行时包引号，内引号双写；与回执门同口径）。 */
function csvCell(s: string): string {
  const v = typeof s === 'string' ? s : String(s ?? '');
  if (v.includes(',') || v.includes('"') || v.includes('\r') || v.includes('\n')) {
    return '"' + v.split('"').join('""') + '"';
  }
  return v;
}

/** CSV：真表头列名行＋一笔一行（值与文本同源；LF，无尾换行）。 */
export function buildListCopyCsv(input: ListCopyInput): string {
  const lines = [COLUMNS.map((c) => String(c.label)).join(',')];
  for (const r of input.shown) {
    lines.push(rowCells(r).map(csvCell).join(','));
  }
  return lines.join('\n');
}

/** 票据侧快捷口（库行→显示行：金额 `toFixed(2)`、编号字符串化；其余原样进三份）。 */
export function ticketCopyOf(title: string, window: string, records: readonly BillTicketRow[]): {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
} {
  const shown: ListCopyRow[] = records.map((r) => ({
    id: String(r.id),
    time: r.time,
    category: r.category,
    amount: Number.isFinite(r.amount) ? r.amount.toFixed(2) : String(r.amount),
    account: r.account,
    ledger: r.ledger,
    note: r.note,
  }));
  const input: ListCopyInput = { title, window, total: records.length, shown };
  return {
    text: buildListCopyText(input),
    json: buildListCopyJson(input),
    csv: buildListCopyCsv(input),
  };
}
