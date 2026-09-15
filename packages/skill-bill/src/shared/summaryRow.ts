/** 结论摘要行（每张页都有的一行，**唯一定义地**）：金额、方向、三级分类、账户、账本、时间一眼看完。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：事实取自本次 `--params`（缺的槽位写「未给」）；
 *   ② `src/record/receipt.ts`——结果型回执整页：事实取自写库后库内那一行（`BillRow`）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *  本票实测：本包 `src/` 下真引用本件的是上面两个调用点，再无第三处。
 *
 * 四件事一处定义（别处不许再写第二条）：
 *   - **符号即方向**：`moneyDirection` 与 `directionOf`（取值源是件内的 `DIRECTION` 表）——摘要行的方向格、
 *     采集页与回执页的类型徽章那句「…要负数／要正数」、阻断条的方向判定与文案，都走这一份；
 *   - **金额两位小数文本**：`money2`——摘要行、重复检测的比对与列示、阻断条的方向文案共引这一份；
 *   - **缺省时刻**：引 `src/policy/category.ts` 的 `DEFAULT_TIME_SUFFIX`（真源在口径层，本件不留第二份）；
 *   - **缺省值**（账本「生活」／币种「人民币」）：引 `src/policy/category.ts` 的 `DEFAULTS`，本件不另立一份。
 *  分两件出去（`moneyDirection` 与 `summaryRow`）是因为方向那句话在采集页的徽章与阻断条上都要引同一份措辞。
 *
 * 口径出处：`docs/skills/skill-bill/t407-页面块清单-16词.md` 第一节第 3 行（`renderKpiCard` ＋ `renderKpiGrid`
 *  ＋ `renderCaliberLine`）。三级分类的一级取自 `src/policy/category.ts` 的 `l1Of`（分类口径的唯一真相源），
 *  本件不另写一份 L1 名单。
 */
import { renderCaliberLine, renderChips, renderKpiGrid } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { DEFAULT_TIME_SUFFIX, l1Of } from '../policy/category.js';

/** 一型的方向口径（**唯一定义地**，四处引用都走这里）：
 *  `sign`＝这一型要的金额符号（`Math.sign` 的值），`require`＝「这一型为什么得是这个符号」那一句，
 *  `word`＝这一型的方向词（摘要行与组合徽章共用）。 */
export interface DirectionRule {
  readonly word: string;
  readonly sign: number;
  readonly require: string;
}

const DIRECTION: Record<string, DirectionRule> = {
  expense: { word: '支出', sign: -1, require: '记支出要负数' },
  income: { word: '收入', sign: 1, require: '记收入要正数' },
};

/** 一型的方向口径（没有这一型＝返回 `undefined`，调用方照实当「本型不管方向」）。 */
export function directionOf(kind: string): DirectionRule | undefined {
  return DIRECTION[kind];
}

/** 金额一律两位小数（**唯一定义地**，比对与展示同一份口径）。`null`／非有限数／`0`＝未给；`+` 只给正数。
 *  上级裁定第 3 条：金额 `0.00` 配「零（本仓不记零）」自相矛盾，值栏一律写「未给」。 */
export function money2(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount) || amount === 0) return '未给';
  return (amount > 0 ? '+' : '') + amount.toFixed(2);
}

/** 方向那句话（**唯一定义地**）：符号即方向——支出负数、收入正数。零与「还没给」都照实说，不拿 0 顶。
 *  用户说法照 `docs/skills/skill-bill/t407-文字审查.md` 第 43、44 条的判法：`未判（金额还没给）` 改「还没给」，
 *  `零（本仓不记零）` 改「还没给」（值栏摆 0.00 配「本仓不记零」自相矛盾，本级不再这么写）。 */
export function moneyDirection(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount)) return '还没给';
  if (amount < 0) return '支出（取负数）';
  if (amount > 0) return '收入（取正数）';
  return '还没给';
}

/** 摘要行的事实：六格取值。`amount` 用 `null` 表示「还没给」；数字 `0` 视同没给（本仓不记零，裁定第 3 条）。 */
export interface SummaryFacts {
  readonly amount: number | null;
  readonly category: string;
  readonly account: string;
  readonly ledger: string;
  readonly time: string;
}

/** 结论摘要行的几格（**唯一定义地**）：采集页直接出网格，回执页把它们并进自己那张网格里。
 *  `amount` 未给时那一格写「未给」，不拿 0 顶替。时间缺省那句取口径层的缺省时刻，本件不抄第二份。
 *
 *  三处口径句改成用户说法（本轮整改，原文见 `docs/skills/skill-bill/t407-文字审查.md` 第 40、42、43、60 条）：
 *   `L1/L2/L3 三级` 改成「分类要选到最细那一级」（内部层级名不上屏）；`缺省＝…` 改成「不填就记到…」；
 *   采集页那一格给的是**真值**（这一笔打算记成什么），所以不再配「不填就记成…」——那是没给时才成立的话。 */
export function summaryCards(facts: SummaryFacts): readonly KpiCardInput[] {
  const l1 = facts.category.trim() === '' ? '' : l1Of(facts.category);
  return [
    { label: '金额', value: money2(facts.amount), detail: moneyDirection(facts.amount) },
    {
      label: '分类',
      value: facts.category.trim() === '' ? '未给' : facts.category,
      detail: facts.category.trim() === '' ? '分类要选到最细那一级' : '归在「' + l1 + '」下面',
    },
    { label: '账户', value: facts.account.trim() === '' ? '未给' : facts.account, detail: '不填就记到默认账户' },
    { label: '账本', value: facts.ledger.trim() === '' ? '未给' : facts.ledger, detail: '不填就记到默认账本' },
    { label: '时间', value: facts.time.trim() === '' ? '未给' : facts.time, detail: '不填就记成今天 ' + DEFAULT_TIME_SUFFIX },
  ];
}

/** 结论摘要行：那张网格 ＋ 方向两枚胶囊 ＋ 分类一行口径。
 *  R3 改形状：原先一句 `支出的金额记成负数、收入记成正数；分类要选到最细那一级。`
 *  拿顿号分方向、用分号缀分类，三件事挤一句（采集 10 页同句）。现拆三枚独立形状：
 *  方向两条各一枚胶囊（分行并列），分类单独一行口径；不再用连接符串版式。 */
export function summaryRow(facts: SummaryFacts): string {
  return renderKpiGrid(summaryCards(facts))
    + renderChips({ items: [{ text: '支出记负数' }, { text: '收入记正数' }] })
    + renderCaliberLine('分类要选到最细那一级。');
}
