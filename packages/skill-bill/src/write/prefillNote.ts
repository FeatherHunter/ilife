/** 预填标注（缺口块之一，**唯一定义地**）：每个被历史数据预填的字段标出来源（老侧 `prefillBox` 的形态）。
 *
 * 谁在用（按实际写，别写名义调用点）：
 *   ① `src/write/collect.ts`——过程型采集页：账户／账本／币种／时间这四格能由历史与缺省顶上，
 *      顶上哪一格就在表单那一格的提示里写「预填·来源」，另出一张「预填标注」表把来源逐条列清（本件真调用点）；
 *   ② **本票没有第二个调用点**：回执页报的是已写入的值，不预填，`src/write/receipt.ts` 不引本件
 *      （件头原来写它「会引但本件不出」，那是名义调用点，按实际改掉）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，同一套采集页／回执页／复制区要同一条口径）。
 *  本票实测：本包 `src/` 下真引用本件的只有 `collect.ts` 一处。
 *
 * 口径（三件事一处定义）：
 *   - **只预填四项**：账户／账本／币种（来源＝近期最近一笔的库内值）＋ 时间（来源＝本页执行那天的缺省时刻）；
 *     分类**一律不预填**（施工图第四节第 10 条：分类不许留空交给助手猜），备注是自由文本也不预填；
 *   - **缺省值不在本件另立一份**：账本「生活」／币种「人民币」引 `src/policy/category.ts` 的 `DEFAULTS`；
 *     时间引同一件的 `defaultTimeOn`（`12:00:00` 的真源在口径层，本件不写第二份字面量）；
 *   - **来源逐格可追**：库里顶来的写「来自记录编号 N（最近一笔）」，缺省顶的写「缺省值（库里还没有可用的…）」，
 *     两种来源不许混成一句「自动填的」。
 */
import { renderDataTable } from 'base-paint/blocks';
import { DEFAULTS, DEFAULT_TIME_SUFFIX, defaultTimeOn } from '../policy/category.js';
import type { BillRow } from '../fetch/db.js';

/** 一条预填标注：哪一格／中文名／顶上去的值／来源。 */
export interface PrefillMark {
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly from: string;
}

/** 采集页要的四格（值 ＋ 中文名 ＋ 来源后缀）。缺省值一处定义：账本／币种／账户引口径层的 `DEFAULTS`
 *  （账户缺省是空串＝落库默认，不走「缺省值（账户）」那一岔）。 */
const PREFILL_FIELDS: readonly { readonly name: string; readonly label: string; readonly fallback: string; readonly what: string }[] = [
  { name: 'account', label: '账户', fallback: DEFAULTS.account, what: '账户' },
  { name: 'ledger', label: '账本', fallback: DEFAULTS.ledger, what: '账本' },
  { name: 'currency', label: '币种', fallback: DEFAULTS.currency, what: '币种' },
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
    marks.push({
      name: 'time', label: '时间', value: defaultTimeOn(input.today),
      from: '缺省值（本页执行那天 ' + DEFAULT_TIME_SUFFIX + '）',
    });
  }
  return marks;
}

/** 某一格的来源一句（给表单字段的提示用）；没有这一格＝返回 `undefined`。
 *  本轮整改：原来的 `预填 支付宝 · 来自记录编号 1` 里那个 `·` 落在选择器回显上（版式位），
 *  改一句连读的「已经替你填上 支付宝，来自…」——一句话说清，不用分隔符。 */
export function prefillHint(marks: readonly PrefillMark[], name: string): string | undefined {
  const hit = marks.find((m) => m.name === name);
  return hit === undefined ? undefined : '已经替你填上 ' + hit.value + '，' + hit.from;
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
