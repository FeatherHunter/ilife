/** 目标域进度人话门（**唯一定义地**）：预算执行/目标进度事实 -> 人话三份（纯文本/JSON/CSV）。
 *
 * 为什么单立一门：base 冻结面（list 投影仍 items/total 薄信封两格，CSV 仍 section,row）不动，
 * bill 内目标口径从此只住这一件。薄信封仍作日志场景标识；复制三份一律走本门，不再经 buildDataText。
 * 复用 1180 口径：标签空格值/未给统一/CSV RFC4180/JSON 数仍数/无尾换行；百分比一位（老侧 fmtPct）。
 *
 * 谁在用（一处，指名）：`src/goal/template-progress.ts`——进度页复制区
 * （dataText + dataJson/dataCsv 三覆写，经 `./pageParts.js` 的 `copyZoneOf` 透传）。
 * 预算与目标两支共一门（同域两套进度口径，新侧取双端夹取后的值；卡片行与合计行各走各行式）。
 *
 * 口径出处：判地 `proto/acct-goal/g05-看预算-v2.2.html`／`g06-看目标-v2.2.html`与
 * `src/goal/goalData.ts` 的 `budgetExecution`／`savingProgress`（合计=Σ卡片，同源）。
 * 规则：预算进度行（目标/已用/剩余/百分比）与合计行各走各行式、每行恒单行（不断）；
 * 合计流水行三份都有（预算合计=Σ已用，目标合计=Σ已存，数字同源）；CSV 纵表真表头 field,value；
 * 复制行与显示行同源（金额两位、百分比一位、名目单行化）。
 */
import { DOC_TITLE } from '../shared/pageIdentity.js';
import type { BudgetExecution, BudgetItem, SavingItem, SavingProgress } from './goalData.js';
import { clampPct } from './pageParts.js';

/** 缺省统一词（文本/CSV 空值口径）。 */
const MISSING = '未给';

/** 单位（只一处定义）。 */
const UNIT = '元';

/** 单行化（CR/LF 压成空格，前后去空；复制每行恒单行）。 */
function oneLine(s: string): string {
  return s.replace(/\r\n|\r|\n/g, ' ').trim();
}

/** 名目取值（空走未给，否则单行化）。 */
function pickName(v: string): string {
  const t = typeof v === 'string' ? v : '';
  return t.trim() === '' ? MISSING : oneLine(t);
}

/** 两位金额文本（空/非有限走未给）。 */
function money2(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return MISSING;
  return (n as number).toFixed(2);
}

/** 百分比文本：一位小数（老侧 fmtPct 同口径），值已双端夹取。 */
function pct1(n: number | null | undefined): string {
  return clampPct(n).toFixed(1) + '%';
}

/** 预算进度行（**唯一定义地**）：目标/已用/剩余/百分比一格一行、恒单行。 */
export function budgetLineOf(b: BudgetItem): string {
  return '目标 ' + pickName(b.category_cn) + ' ｜ 目标 ' + money2(b.amount) + ' ' + UNIT
    + ' ｜ 已用 ' + money2(b.actual) + ' ' + UNIT
    + ' ｜ 剩余 ' + money2(b.remaining) + ' ' + UNIT
    + ' ｜ 进度 ' + pct1(b.pct);
}

/** 目标进度行（**唯一定义地**）：目标/已存/还差/百分比一格一行、恒单行。 */
export function savingLineOf(s: SavingItem): string {
  return '目标 ' + pickName(s.name) + ' ｜ 目标 ' + money2(s.amount) + ' ' + UNIT
    + ' ｜ 已存 ' + money2(s.saved) + ' ' + UNIT
    + ' ｜ 还差 ' + money2(s.remaining) + ' ' + UNIT
    + ' ｜ 进度 ' + pct1(s.pct);
}

/** 预算合计行（不导出：三 builder 共用；合计开头，与进度行不同式）。 */
function budgetTotalLineOf(e: BudgetExecution): string {
  return '合计 ｜ 预算 ' + money2(e.totals.budget) + ' ' + UNIT
    + ' ｜ 实际 ' + money2(e.totals.actual) + ' ' + UNIT
    + ' ｜ 流水 ' + String(e.records) + ' 笔';
}

/** 目标合计行（不导出：同上）。 */
function savingTotalLineOf(p: SavingProgress): string {
  return '合计 ｜ 目标 ' + String(p.count) + ' 个'
    + ' ｜ 已完成 ' + String(p.done_count) + ' 个'
    + ' ｜ 流水 ' + String(p.records) + ' 笔';
}

/** 页身份行：饼干记账 + 唤醒词。 */
function pageLine(wakeWord: string, fallback: string): string {
  const w = typeof wakeWord === 'string' && wakeWord.trim() !== '' ? wakeWord.trim() : fallback;
  return DOC_TITLE + ' ' + w;
}

/** 纯文本：页身份/结论/进度每条一行/合计行（合计恒末行，无尾换行）。 */
export function buildGoalCopyText(wakeWord: string, budget: BudgetExecution | null, saving: SavingProgress | null): string {
  if (budget !== null) {
    const lines = budget.budgets.map((b) => budgetLineOf(b));
    const conclusion = '已查到 ' + String(budget.budgets.length) + ' 条预算';
    return [pageLine(wakeWord, '看预算'), conclusion, ...lines, budgetTotalLineOf(budget)].join('\n');
  }
  const p = saving as SavingProgress;
  const lines = p.savings.map((s) => savingLineOf(s));
  const conclusion = '已查到 ' + String(p.savings.length) + ' 个目标';
  return [pageLine(wakeWord, '看目标'), conclusion, ...lines, savingTotalLineOf(p)].join('\n');
}

/** JSON 加厚（数仍数，2 空格，无尾换行；合计与进度同源，另附派生结论）。 */
export function buildGoalCopyJson(wakeWord: string, budget: BudgetExecution | null, saving: SavingProgress | null): string {
  if (budget !== null) {
    const payload: Record<string, unknown> = {
      version: '1.0', skill: 'bill', shape: 'list', key: 'goal.query',
      data: {
        op: 'budget', month: budget.month, total: budget.budgets.length,
        budgets: budget.budgets.map((b) => ({
          category: b.category, amount: b.amount, actual: b.actual,
          remaining: b.remaining, pct: b.pct, count: b.count,
        })),
        totals: budget.totals, records: budget.records,
        total_line: budgetTotalLineOf(budget),
        message_derived: '已查到 ' + String(budget.budgets.length) + ' 条预算 ｜ ' + budgetTotalLineOf(budget),
        wakeWord,
      },
    };
    return JSON.stringify(payload, null, 2);
  }
  const p = saving as SavingProgress;
  const payload: Record<string, unknown> = {
    version: '1.0', skill: 'bill', shape: 'list', key: 'goal.query',
    data: {
      op: 'saving', total: p.savings.length, count: p.count, done_count: p.done_count,
      savings: p.savings.map((s) => ({
        name: s.name, amount: s.amount, saved: s.saved,
        remaining: s.remaining, pct: s.pct, status: s.status,
      })),
      records: p.records,
      total_line: savingTotalLineOf(p),
      message_derived: '已查到 ' + String(p.savings.length) + ' 个目标 ｜ ' + savingTotalLineOf(p),
      wakeWord,
    },
  };
  return JSON.stringify(payload, null, 2);
}

/** CSV 纵表（表头 field,value，LF，无尾换行，RFC4180；进度每条一行＋合计恒在）。 */
function csvCell(s: string): string {
  const v = typeof s === 'string' ? s : String(s ?? '');
  if (v.includes(',') || v.includes('"') || v.includes('\r') || v.includes('\n')) {
    return '"' + v.split('"').join('""') + '"';
  }
  return v;
}

/** CSV 行（结论/进度每条一行/合计，值与文本同源）。 */
export function buildGoalCopyCsv(wakeWord: string, budget: BudgetExecution | null, saving: SavingProgress | null): string {
  void wakeWord;
  const lines = ['field,value'];
  if (budget !== null) {
    lines.push(csvCell('结论') + ',' + csvCell('已查到 ' + String(budget.budgets.length) + ' 条预算'));
    for (const b of budget.budgets) lines.push(csvCell('目标') + ',' + csvCell(budgetLineOf(b)));
    lines.push(csvCell('合计') + ',' + csvCell(budgetTotalLineOf(budget)));
    lines.push(csvCell('预算合计') + ',' + csvCell(money2(budget.totals.budget)));
    lines.push(csvCell('流水笔数') + ',' + csvCell(String(budget.records)));
    return lines.join('\n');
  }
  const p = saving as SavingProgress;
  lines.push(csvCell('结论') + ',' + csvCell('已查到 ' + String(p.savings.length) + ' 个目标'));
  for (const s of p.savings) lines.push(csvCell('目标') + ',' + csvCell(savingLineOf(s)));
  lines.push(csvCell('合计') + ',' + csvCell(savingTotalLineOf(p)));
  lines.push(csvCell('目标个数') + ',' + csvCell(String(p.count)));
  lines.push(csvCell('流水笔数') + ',' + csvCell(String(p.records)));
  return lines.join('\n');
}
