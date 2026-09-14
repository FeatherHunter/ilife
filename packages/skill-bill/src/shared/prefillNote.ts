/** 预填标注（缺口块之一，**唯一定义地**）：每个被历史数据预填的字段标出来源（老侧 `prefillBox` 的形态）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：账户／账本／币种／时间这四格能由历史与缺省顶上，
 *      顶上哪一格就在表单那一格的提示里写「预填·来源」，另出一张「预填标注」表把来源逐条列清；
 *   ② `src/record/receipt.ts`——结果型回执整页：回执页不再预填，本件不出（那一页报的是已写入的值）。
 *  第二个消费者：记收入／拍账单／记报销／记一笔（施工图第一节与第二节各条的字段卡都走这一件）。
 *
 * 口径（两件事一处定义）：
 *   - **只预填四项**：账户／账本／币种（来源＝近期最近一笔的库内值）＋ 时间（来源＝本页执行那天的缺省 12:00:00）；
 *     分类**一律不预填**（施工图第四节第 10 条：分类不许留空交 AI 猜），备注是自由文本也不预填；
 *   - **来源逐格可追**：库里顶来的写「来自记录编号 N（最近一笔）」，缺省顶的写「缺省值（库里还没有可用的…）」，
 *     两种来源不许混成一句「自动填的」。
 */
import { renderDataTable } from 'base-paint/blocks';
import type { BillRow } from '../fetch/db.js';

/** 一条预填标注：哪一格／中文名／顶上去的值／来源。 */
export interface PrefillMark {
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly from: string;
}

/** 采集页要的四格缺省（值 ＋ 中文名 ＋ 来源后缀），一处定义。 */
const PREFILL_FIELDS: readonly { readonly name: string; readonly label: string; readonly fallback: string; readonly what: string }[] = [
  { name: 'account', label: '账户', fallback: '', what: '账户' },
  { name: 'ledger', label: '账本', fallback: '生活', what: '账本' },
  { name: 'currency', label: '币种', fallback: '人民币', what: '币种' },
];

/** 取一个字段的字符串值（非字符串／空串一律当没给）。 */
function textOf(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 预填判定：`params` 里没给的字段，按近期最近一笔顶；历史也没有就按缺省顶。`today`＝本页执行那天（`YYYY-MM-DD`）。 */
export function prefillOf(input: {
  readonly params: Record<string, unknown>;
  readonly recent: readonly BillRow[];
  readonly today: string;
}): PrefillMark[] {
  const marks: PrefillMark[] = [];
  const last = input.recent.length > 0 ? input.recent[0] : undefined;
  for (const f of PREFILL_FIELDS) {
    if (textOf(input.params[f.name]) !== '') continue;
    const fromHistory = last === undefined ? '' : textOf(last[f.name as keyof BillRow]);
    if (fromHistory !== '') {
      marks.push({ name: f.name, label: f.label, value: fromHistory, from: '来自记录编号 ' + last?.id + '（最近一笔）' });
      continue;
    }
    marks.push({
      name: f.name, label: f.label, value: f.fallback,
      from: f.fallback === '' ? '缺省值（库里还没有可用的' + f.what + '，留空＝落库默认）' : '缺省值（' + f.what + '）',
    });
  }
  if (textOf(input.params['time']) === '') {
    marks.push({ name: 'time', label: '时间', value: input.today + ' 12:00:00', from: '缺省值（本页执行那天 12:00:00）' });
  }
  return marks;
}

/** 某一格的来源一句（给表单字段的提示用）；没有这一格＝返回 `undefined`。 */
export function prefillHint(marks: readonly PrefillMark[], name: string): string | undefined {
  const hit = marks.find((m) => m.name === name);
  return hit === undefined ? undefined : '预填 ' + hit.value + ' · ' + hit.from;
}

/** 预填标注表：字段／取值／来源三列。**空数组＝没有预填，页上不出这一段**（返回空串）。 */
export function prefillNote(marks: readonly PrefillMark[]): string {
  if (marks.length === 0) return '';
  return renderDataTable({
    columns: [
      { key: 'label', label: '预填的格' },
      { key: 'value', label: '顶上去的值' },
      { key: 'from', label: '来源' },
    ],
    rows: marks.map((m) => ({ label: m.label, value: m.value === '' ? '（留空＝落库默认）' : m.value, from: m.from })),
    caption: '预填标注（每个被顶上的格都写清来源）',
  });
}
