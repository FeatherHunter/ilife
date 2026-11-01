/** 结论摘要行（每张页都有的一行，**唯一定义地**）：金额、方向、三级分类、账户、账本、时间一眼看完。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/write/collect.ts`——过程型采集页：事实取自本次 `--params`（缺的槽位写「未给」）；
 *   ② `src/write/receipt.ts`——结果型回执整页：事实取自写库后库内那一行（`BillRow`）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *  本票实测：本包 `src/` 下真引用本件的是上面两个调用点，再无第三处。
 *
 * 四件事一处定义（别处不许再写第二条）：
 *   - **符号即方向**：`moneyDirection` 与 `directionOf`（取值源是件内的 `DIRECTION` 表）——摘要行的方向格、
 *     采集页与回执页的类型徽章那句「…要负数／要正数」、阻断条的方向判定与文案，都走这一份；
 *   - **金额两位小数文本**：`money2`——摘要行、重复检测的比对与列示、阻断条的方向文案共引这一份；
 *   - **缺省时刻**：引 `src/shared/dateRange.ts` 的 `DEFAULT_TIME_SUFFIX`（真源在共用位，本件不留第二份）；
 *   - **缺省值**（账本「生活」／币种「人民币」）：引 `src/shared/category.ts` 的 `DEFAULTS`，本件不另立一份。
 *  分两件出去（`moneyDirection` 与 `summaryRow`）是因为方向那句话在采集页的徽章与阻断条上都要引同一份措辞。
 *
 * 口径出处：`docs/skills/skill-bill/t407-页面块清单-16词.md` 第一节第 3 行（`renderKpiCard` ＋ `renderKpiGrid`
 *  ＋ `renderCaliberLine`）。三级分类的一级取自 `src/shared/category.ts` 的 `l1Of`（分类口径的唯一真相源），
 *  本件不另写一份 L1 名单。
 */
import { renderCaliberLine, renderChips, renderKpiGrid } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { DIRECTION_WORDS } from '../shared/direction.js';
import { l1Of } from '../shared/category.js';
import { DEFAULT_TIME_SUFFIX } from '../shared/dateRange.js';
import { optionLabelOf } from './recentPicks.js';
import { m } from '../entries/index.js';

/** 一型的方向口径（**唯一定义地**，四处引用都走这里）：
 *  `sign`＝这一型要的金额符号（`Math.sign` 的值），`require`＝「这一型为什么得是这个符号」那一句，
 *  `word`＝这一型的方向词（摘要行与组合徽章共用）。 */
export interface DirectionRule {
  readonly word: string;
  readonly sign: number;
  readonly require: string;
}

/** 那张表**按调用现建**（#1197：模块加载期不取词，否则语言会在模块加载时固化）。 */
function directionTable(): Record<string, DirectionRule> {
  return {
    expense: { word: DIRECTION_WORDS.expense, sign: -1, require: m('skill-bill.write-summaryRow.c001') },
    income: { word: DIRECTION_WORDS.income, sign: 1, require: m('skill-bill.write-summaryRow.c002') },
  };
}

/** 一型的方向口径（没有这一型＝返回 `undefined`，调用方照实当「本型不管方向」）。 */
export function directionOf(kind: string): DirectionRule | undefined {
  return directionTable()[kind];
}

/** 金额一律两位小数（**唯一定义地**，比对与展示同一份口径）。`null`／非有限数／`0`＝未给；`+` 只给正数。
 *  上级裁定第 3 条：金额 `0.00` 配「零（本仓不记零）」自相矛盾，值栏一律写「未给」。 */
export function money2(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount) || amount === 0) return m('skill-bill.write-summaryRow.c003');
  return (amount > 0 ? '+' : '') + amount.toFixed(2);
}

/** 方向那句话（**唯一定义地**）：符号即方向——支出负数、收入正数。零与「还没给」都照实说，不拿 0 顶。
 *  用户说法照 `docs/skills/skill-bill/t407-文字审查.md` 第 43、44 条的判法：`未判（金额还没给）` 改「还没给」，
 *  `零（本仓不记零）` 改「还没给」（值栏摆 0.00 配「本仓不记零」自相矛盾，本级不再这么写）。 */
export function moneyDirection(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount)) return m('skill-bill.write-summaryRow.c004');
  if (amount < 0) return m('skill-bill.write-summaryRow.c005');
  if (amount > 0) return m('skill-bill.write-summaryRow.c006');
  return m('skill-bill.write-summaryRow.c007');
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
export function summaryCards(
  facts: SummaryFacts,
  options?: { readonly defaultHints?: boolean },
): readonly KpiCardInput[] {
  const l1 = facts.category.trim() === '' ? '' : l1Of(facts.category);
  // 缺省说法（「不填就记到…」）只在**值没给**或调用方要它时才缀（#1197：判据走事实，不走本地化文本）。
  const hints = options?.defaultHints !== false;
  const account = facts.account.trim();
  const ledger = facts.ledger.trim();
  const time = facts.time.trim();
  return [
    { label: m('skill-bill.write-summaryRow.c008'), value: money2(facts.amount), detail: moneyDirection(facts.amount) },
    {
      label: m('skill-bill.write-summaryRow.c009'),
      // t728：层级值（`借贷/借出`）在页面上改走**层级字形**显示，机器值一个字不改；
      //  一条口径只许一处实现 ⇒ 显示写法引 `recentPicks.ts` 的 `optionLabelOf`，本件不另写一份。
      value: facts.category.trim() === '' ? m('skill-bill.write-summaryRow.c010') : optionLabelOf(facts.category),
      detail: facts.category.trim() === '' ? m('skill-bill.write-summaryRow.c011') : m('skill-bill.write-summaryRow.c012', { p0: String(l1) }),
    },
    account === ''
      ? { label: m('skill-bill.write-summaryRow.c013'), value: m('skill-bill.write-summaryRow.c014'), detail: m('skill-bill.write-summaryRow.c015') }
      : { label: m('skill-bill.write-summaryRow.c016'), value: account, ...(hints ? { detail: m('skill-bill.write-summaryRow.c017') } : {}) },
    ledger === ''
      ? { label: m('skill-bill.write-summaryRow.c018'), value: m('skill-bill.write-summaryRow.c019'), detail: m('skill-bill.write-summaryRow.c020') }
      : { label: m('skill-bill.write-summaryRow.c021'), value: ledger, ...(hints ? { detail: m('skill-bill.write-summaryRow.c022') } : {}) },
    time === ''
      ? { label: m('skill-bill.write-summaryRow.c023'), value: m('skill-bill.write-summaryRow.c024'), detail: m('skill-bill.write-summaryRow.c025', { p0: String(DEFAULT_TIME_SUFFIX) }) }
      : { label: m('skill-bill.write-summaryRow.c026'), value: time, ...(hints ? { detail: m('skill-bill.write-summaryRow.c027', { p0: String(DEFAULT_TIME_SUFFIX) }) } : {}) },
  ];
}

/** 方向词裸字（**已搬共用位**）：`directionWord` 与那两个词现在住 `src/shared/direction.ts`——
 *  查询域详情页的眉标也要用同一份（跨域引用会让本包出现第一条 query→write 的依赖）。
 *  本件的 `DIRECTION` 表读它的 `DIRECTION_WORDS`，两域仍是同一处定义。 */

/** 结论摘要行：那张网格 ＋ 方向两枚胶囊 ＋ 分类一行口径。
 *  R3 改形状：原先一句 `支出的金额记成负数、收入记成正数；分类要选到最细那一级。`
 *  拿顿号分方向、用分号缀分类，三件事挤一句（采集 10 页同句）。现拆三枚独立形状：
 *  方向两条各一枚胶囊（分行并列），分类单独一行口径；不再用连接符串版式。
 *
 *  第 3 轮返工：记借入-采集页要把「必需项置顶、可选项折叠」重排进自己那张网格（首屏 8 张同形卡太挤），
 *  故允许只取后面两件（`cards: false`）——那两枚胶囊与那一行口径的字面量仍只此一份，调用方不另抄一遍。 */
export function summaryRow(facts: SummaryFacts, options?: { readonly cards?: boolean }): string {
  const notes = renderChips({ items: [{ text: m('skill-bill.write-summaryRow.c028') }, { text: m('skill-bill.write-summaryRow.c029') }] })
    + renderCaliberLine(m('skill-bill.write-summaryRow.c030'));
  return (options?.cards === false ? '' : renderKpiGrid(summaryCards(facts))) + notes;
}
