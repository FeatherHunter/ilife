/** 账户域账户汇总人话门（**唯一定义地**）：汇总事实 -> 人话三份（纯文本/JSON/CSV）。
 *
 * 为什么单立一门：base 冻结面（list 投影仍 items/total 薄信封两格，CSV 仍 section,row）不动，
 * bill 内账户口径从此只住这一件。薄信封（items/total）仍作日志场景标识；复制三份一律走本门，
 * 不再经 buildDataText。复用 1180 口径：标签空格值/未给统一/CSV RFC4180/JSON 数仍数/无尾换行。
 *
 * 谁在用（一处，指名）：`src/account/template-summary.ts`——汇总页复制区
 * （经 `./pageParts.js` 的 `copyZoneOf` 的 `copy` 单对象透传）。
 * 后票跨能力经本件公开接口取卡片行与合计行口径，不另抄一份。
 *
 * 口径出处：判地 `proto/acct-goal/b07-看账户汇总-v2.2.html`（卡片行每户一行＋合计行）与
 * `src/account/accounts.ts` 的 `accountSummary`（余额=收入-支出+转入-转出，合计=Σ卡片余额，同源）。
 * 规则：卡片行（户名/余额/币种）与合计行（余额合计/流水笔数）各走各行式、每行恒单行（不断）；
 * 合计行三份都有（余额合计=Σ卡片余额=Σ流水净额，数字同源）；CSV 纵表真表头 field,value；
 * 复制行与显示行同源（金额两位、户名单行化，见 `accountCardLineOf`）。
 */
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { MISSING, csvCell, oneLine } from '../shared/copyText.js';
import type { AccountCard, AccountSummary } from './accounts.js';

/** 账户复制三份（单对象透传 `pageParts.copyZoneOf` 的 `copy` 位；缺省走薄信封零回归）。 */
export interface AccountCopy {
  readonly text?: string;
  readonly json?: string;
  readonly csv?: string;
}



/** 金额单位与币种（只一处定义；库默认人民币，账户卡无币种列故取统一币种）。 */
const UNIT = '元';
const CURRENCY = '人民币';



/** 户名取值（空走未给，否则单行化；与纸面 title 同源）。 */
function pickName(v: string): string {
  const t = typeof v === 'string' ? v : '';
  return t.trim() === '' ? MISSING : oneLine(t);
}

/** 两位金额文本（空/非有限走未给；0 照实写 0.00）。 */
function money2(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return MISSING;
  return (n as number).toFixed(2);
}

/** 卡片行（**唯一定义地**）：户名/余额/币种一格一行、恒单行（不断）；显示 title 与复制同取此件。 */
export function accountCardLineOf(card: AccountCard): string {
  return '账户 ' + pickName(card.name) + ' ｜ 余额 ' + money2(card.balance) + ' ' + UNIT + ' ｜ ' + CURRENCY;
}

/** 合计行（**唯一定义地**）：余额合计/流水笔数一格一行、恒单行；与卡片行不同式（合计开头）。 */
export function accountTotalLineOf(summary: AccountSummary): string {
  return '合计 ｜ 余额 ' + money2(summary.totals.balance) + ' ' + UNIT + ' ｜ 流水 ' + String(summary.flow_count) + ' 笔';
}

/** 页身份行（空格分隔）：饼干记账 + 唤醒词（与纸面 brand 同词不同分隔符）。 */
function pageLine(wakeWord: string): string {
  const w = typeof wakeWord === 'string' && wakeWord.trim() !== '' ? wakeWord.trim() : '看账户汇总';
  return DOC_TITLE + ' ' + w;
}

/** 结论行（查到几户＋余额合计；金额空走未给，不带单位）。 */
function conclusionLine(summary: AccountSummary): string {
  const n = summary.accounts.length;
  const bal = money2(summary.totals.balance);
  return bal === MISSING
    ? '已查到 ' + String(n) + ' 个账户 余额合计 ' + MISSING
    : '已查到 ' + String(n) + ' 个账户 余额合计 ' + bal + ' ' + UNIT;
}

/** 纯文本（LF 连接，无尾换行）：页身份/结论/卡片每户一行/合计行（合计行恒在末行）。 */
export function buildAccountCopyText(wakeWord: string, summary: AccountSummary): string {
  const cards = summary.accounts.map((c) => accountCardLineOf(c));
  return [pageLine(wakeWord), conclusionLine(summary), ...cards, accountTotalLineOf(summary)].join('\n');
}

/** JSON 加厚（票面同等，数仍数，2 空格缩进，无尾换行；合计与卡片同源，另附派生结论）。 */
export function buildAccountCopyJson(wakeWord: string, summary: AccountSummary): string {
  const payload: Record<string, unknown> = {
    version: '1.0',
    skill: 'bill',
    shape: 'list',
    key: 'account.query',
    data: {
      total: summary.accounts.length,
      balance: summary.totals.balance,
      currency: CURRENCY,
      accounts: summary.accounts.map((c) => ({
        name: c.name,
        balance: c.balance,
        currency: CURRENCY,
        count: c.count,
      })),
      total_line: accountTotalLineOf(summary),
      message_derived: conclusionLine(summary) + ' ｜ ' + accountTotalLineOf(summary),
      wakeWord,
    },
  };
  return JSON.stringify(payload, null, 2);
}

/** CSV 纵表（表头 field,value，LF，无尾换行，RFC4180 引号；卡片每户一行＋合计行恒在；格复用共用件）。 */

/** CSV 行（结论/卡片每户一行/合计/余额合计数/流水笔数，值与文本同源）。 */
export function buildAccountCopyCsv(wakeWord: string, summary: AccountSummary): string {
  void wakeWord;
  const lines = ['field,value'];
  lines.push(csvCell('结论') + ',' + csvCell(conclusionLine(summary)));
  for (const c of summary.accounts) lines.push(csvCell('账户') + ',' + csvCell(accountCardLineOf(c)));
  lines.push(csvCell('合计') + ',' + csvCell(accountTotalLineOf(summary)));
  lines.push(csvCell('余额合计') + ',' + csvCell(money2(summary.totals.balance)));
  lines.push(csvCell('流水笔数') + ',' + csvCell(String(summary.flow_count)));
  return lines.join('\n');
}

/** 账户三份一次取齐（汇总页经 `copy` 单对象透传；采集／回执单文本经 `{ text }` 透传，JSON／CSV 缺省零回归）。 */
export function buildAccountCopy(wakeWord: string, summary: AccountSummary): AccountCopy {
  return { text: buildAccountCopyText(wakeWord, summary), json: buildAccountCopyJson(wakeWord, summary), csv: buildAccountCopyCsv(wakeWord, summary) };
}
