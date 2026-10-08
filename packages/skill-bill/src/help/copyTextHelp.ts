/** 帮助人话门（**唯一定义地**）：速查分组事实 -> 人话三份（纯文本/JSON/CSV）。
 *
 * 为什么单立一门：base 冻结面不动，bill 内帮助口径从此只住这一件。
 * 薄信封仍作日志场景标识；复制三份一律走本门，不再经 buildDataText。
 *
 * 谁在用（一处，指名）：`src/help/lookupPage.js`——速查表复制区（dataText + dataJson + dataCsv 覆写）。
 * 向导走 `src/setup/copyTextSetup.js`，不抄本件。
 *
 * 规则：页身份二段/总数/每行唤醒词去向/CSV RFC4180/JSON数仍数。
 * 空分组不硬凑行：文本空态有下一步，JSON空数组，CSV仅表头。
 */
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { EMPTY_CELL, csvCell, oneLine } from '../shared/copyText.js';

/** 帮助复制事实：标题/总数/分组（**三个**）。 */
export interface HelpCopyFacts {
  readonly title: string;
  readonly total: number;
  readonly groups: readonly HelpCopyGroup[];
}

/** 一组：组名/行（显示与复制同源：lookup-index那两格）。 */
interface HelpCopyGroup {
  readonly label: string;
  readonly rows: readonly HelpCopyRow[];
}

/** 一行：唤醒词/去向（两格都是声明事实，不复写）。 */
interface HelpCopyRow {
  readonly wake: string;
  readonly goto: string;
}

/** 空态下一步（文本与JSON共用，页面空态同源）。 */
export const HELP_EMPTY_NEXT = '下一步：跟助手说一遍「饼干记账HELP」，看看能做什么。';

/** 页身份行：饼干记账 + 标题。 */
function pageLine(title: string): string {
  const t = typeof title === 'string' ? title.trim() : '';
  return DOC_TITLE + ' ' + (t === '' ? '能力速查' : t);
}



/** 一行人话：唤醒词 + 去向（复制恒等于已显示行；门特有行式保留）。 */
function rowLine(r: HelpCopyRow): string {
  const w = typeof r.wake === 'string' ? oneLine(r.wake) : '';
  const g = typeof r.goto === 'string' ? oneLine(r.goto) : '';
  return '唤醒词 ' + (w === '' ? EMPTY_CELL : w) + ' ｜ 去向 ' + (g === '' ? EMPTY_CELL : g);
}

/** 纯文本（LF，无尾换行）：页身份/总数/每行一条；空出空态有下一步。 */
export function buildHelpCopyText(facts: HelpCopyFacts): string {
  const head = pageLine(facts.title);
  const rows: HelpCopyRow[] = [];
  for (const g of facts.groups ?? []) for (const r of g.rows ?? []) rows.push(r);
  if (rows.length === 0) {
    return head + '\n' + '还没有可查的唤醒词，' + HELP_EMPTY_NEXT;
  }
  const lines = [head, '共 ' + String(facts.total) + ' 条唤醒词'];
  for (const r of rows) lines.push(rowLine(r));
  return lines.join('\n');
}

/** JSON加厚（数仍数，2空格，无尾换行；空空数组+next）。 */
export function buildHelpCopyJson(facts: HelpCopyFacts): string {
  const groups = (facts.groups ?? []).map((g) => ({
    label: g.label,
    rows: (g.rows ?? []).map((r) => ({ wake: r.wake, goto: r.goto })),
  }));
  const payload: Record<string, unknown> = {
    version: '1.0',
    skill: 'bill',
    shape: 'list',
    key: 'help.lookup',
    data: {
      title: facts.title,
      total: facts.total,
      groups,
      empty: groups.reduce((n, g) => n + g.rows.length, 0) === 0,
      ...(groups.reduce((n, g) => n + g.rows.length, 0) === 0 ? { next: HELP_EMPTY_NEXT } : {}),
    },
  };
  return JSON.stringify(payload, null, 2);
}



/** CSV表（表头wake,goto；空仅表头，不硬凑行）。 */
export function buildHelpCopyCsv(facts: HelpCopyFacts): string {
  const lines = ['wake,goto'];
  for (const g of facts.groups ?? []) for (const r of g.rows ?? []) {
    lines.push(csvCell(r.wake, true) + ',' + csvCell(r.goto, true));
  }
  return lines.join('\n');
}
