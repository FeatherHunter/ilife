/** 复制文本共用口径（**唯一定义地**）：单行化／CSV 格／缺省词／截断。
 *
 * 为什么单立一门：九门各写一份 `oneLine`／`csvCell`（`query/list-copy.ts:65,130`／`detail.ts:138,208`／
 * `write/copyTextReceipt.ts:32,70,163`／`collectCopyText.ts:17,23,138`／`analysis/copyTextAnalysis.ts:96,107`／
 * `account/copyTextAccount.ts:21,28,101`／`goal/copyTextGoal.ts:22,28,136`／`help/copyTextHelp.ts:43,90`／
 * `setup/copyTextSetup.ts:33,81`），同一件事九个结果迟早走散（铁律二）。从此只住这一件，别处引用它。
 *
 * 谁在用（九门，指名）：`src/query/list-copy.ts`／`detail.ts`／`src/write/copyTextReceipt.ts`／
 * `collectCopyText.ts`／`src/analysis/copyTextAnalysis.ts`／`src/account/copyTextAccount.ts`／
 * `src/goal/copyTextGoal.ts`／`src/help/copyTextHelp.ts`／`src/setup/copyTextSetup.ts`——九件各自的
 * 行式（卡片行／合计行／结论行）保留，只复用本件的单行化／CSV／缺省／截断。
 *
 * 口径（照抄不另立第二套，与九门逐字节同义）：
 *   - 单行化 CR／LF 压成空格＋前后去空（与回执门同口径，复制每行恒单行）；
 *   - CSV RFC4180（含逗号／引号／换行包引号，内引号双写；`flat=true` 时换行先压空格，照 help／setup 门）；
 *   - 缺省 `MISSING='未给'`（复制三份空值口径）／`EMPTY_CELL='—'`（纸面占位，查询／明细／向导／帮助门）；
 *   - 截断按 Array.from 计字（CJK 一字一数；`withOmission=true` 时拖尾 `…（省略N字）`，照列表门 30 字口径）。
 *
 * 命名（铁律四）：件名 `copyText` 沿九门已有 `copyText*` 前缀（复制文本）；接口名沿九门已有公开名
 * （`oneLine`／`csvCell`／`MISSING`／截断动词 `truncate` 取自 `truncateNote`），不自造。
 * 本件对外给五个（铁律五上限内）：`MISSING`／`EMPTY_CELL`／`oneLine`／`csvCell`／`truncate`。
 */
export const MISSING = '未给';
export const EMPTY_CELL = '—';
/** 单行化（CR／LF 压成空格，前后去空；复制每行恒单行）。 */
export function oneLine(s: string): string {
  return s.replace(/\r\n|\r|\n/g, ' ').trim();
}
/** CSV 一格（RFC4180：含逗号／引号／换行包引号，内引号双写；flat=true 时换行先压空格，照 help／setup 门）。 */
export function csvCell(s: string, flat = false): string {
  const v = typeof s === 'string' ? s : String(s ?? '');
  const cell = flat ? v.replace(/\r\n|\r|\n/g, ' ') : v;
  if (cell.includes(',') || cell.includes('"') || cell.includes('\r') || cell.includes('\n')) {
    return '"' + cell.split('"').join('""') + '"';
  }
  return cell;
}
/** 截断（Array.from 计字；withOmission=true 时超限拖尾 …（省略N字），照列表门；false 时静默截断，照回执门 200 字口径）。入参已单行化（本件内再压一次幂等）。 */
export function truncate(s: string, limit: number, withOmission = false): string {
  const flat = oneLine(s);
  const chars = Array.from(flat);
  if (chars.length <= limit) return flat;
  const cut = chars.slice(0, limit).join('');
  if (!withOmission) return cut;
  return cut + '…（省略' + String(chars.length - limit) + '字）';
}
