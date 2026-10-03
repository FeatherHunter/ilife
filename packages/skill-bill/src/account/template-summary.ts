/** 账户域模板之三 · **账户汇总页型**（`t685-按域页型表.md` §2.5 第 3 行／#688 §五 5.1 的 ⑥ 结果型汇总页）。
 *
 * **本件是这一片页型的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里。
 *  它由读命令 `bill.account.query` 直接出页（一命令一页，不经场景件——与查询域两张页型同形状）。
 *
 * 盖住的场景：看账户汇总（老 `账户/account_view.html`）。
 *
 * **块位序列＝判地的序列**（#1118 收官轮；判地 `proto/acct-goal/b07-看账户汇总-v2.2.html`）：
 *  店头 → 主数字（查到了 ＋ 总余额 ＋ 结论句）→ 落点 LEDGER（分类／账户／账本／时间／编号）
 *  → 各账户余额 DETAIL（每户一行「账户 ｜ 余额 X」＋ 一行总收入／总支出）→ 对账 CHECK
 *  → 按钮区（主按钮 ＋ 复制数据／复制日志）→ ✂ 裁切线 → 纸外脚注。**判地没有页内导航、读数卡网格、
 *  数据表、占比条、折叠区、来源脚注**——一律不出；账户表为空时中段走空态块（判地没有空态那一页，
 *  空库仍要给整页）。
 *
 * 谁在用（一个调用点，指名）：`src/account/read.ts`——`viewAccountSummary` 装配入参后调 `accountSummaryDoc`。
 */
import { buildDataText } from 'base-paint';
import { renderEntryCard } from 'base-paint/blocks';
import type { EntryCardEntry } from 'base-paint/blocks';
import { ticketPrimaryButton } from '../shared/docPage.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { listSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import type { AccountSummary, AccountTotals } from './accounts.js';
import { SOURCE_READ, accountStyleTag, copyZoneOf, emptyOf, listEnvelopeOf, money } from './pageParts.js';

/** 出口载荷（＝envelope `data`）：`items` 是账户卡（`list` 形必填的那一格），其余是本域给页面与下游看的窗口事实。 */
export type AccountSummaryData = {
  readonly items: unknown[];
  readonly total: number;
  readonly totals: AccountTotals;
  readonly flows: readonly unknown[];
  readonly flow_count: number;
  readonly records: number;
};

/** 账户汇总页的入参：这一页是谁 ＋ 汇总事实 ＋ 取数。 */
export interface AccountSummaryInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  /** 唤醒词（页标题；由域声明投影算出）。 */
  readonly wakeWord: string;
  /** 这一页看的是哪一段（副标题）：账户数与流水条数。 */
  readonly window: string;
  readonly summary: AccountSummary;
  /** 出口载荷（与页面同一份事实；复制区直接序列化它）。 */
  readonly data: AccountSummaryData;
  readonly windowStart: string;
  readonly windowEnd: string;
  /** 本次执行时刻（复制日志第 5 段）。 */
  readonly actionAt: string;
}

/** 结论句（判地主数字下面那一句）：说的不是读数卡那几个数，而是这批账户现在是什么局面。 */
function conclusionOf(s: AccountSummary): string {
  if (s.accounts.length === 0) return '账户表还是空的。';
  const top = [...s.accounts].sort((a, b) => b.balance - a.balance)[0];
  const head = '一共 ' + String(s.accounts.length) + ' 个账户，余额加起来 ' + money(s.totals.balance) + ' 元。';
  if (top === undefined || s.totals.balance === 0) return head;
  return head + '余额最多的是「' + top.name + '」（' + money(top.balance) + ' 元）。';
}

/** 落点那几行（判地五行：分类／账户／账本／时间／编号）。 */
function ledgerOf(s: AccountSummary): readonly TicketSheetRow[] {
  const last = s.flows.length === 0 ? '' : s.flows[0].time;
  return [
    { label: '分类', value: '—（按账户归堆）' },
    { label: '账户', value: '共 ' + String(s.accounts.length) + ' 个（详见明细）' },
    { label: '账本', value: '账户和账本' },
    { label: '时间', value: last === '' ? '不限' : '截至 ' + last },
    { label: '编号', value: '最近 ' + String(s.flow_count) + ' 笔流水' },
  ];
}

/** 中段那一串行（判地：每户一行「账户 ｜ 余额 X」＋ 说明；末尾两行总收入／总支出）。 */
function detailRowsOf(s: AccountSummary): readonly EntryCardEntry[] {
  const rows: EntryCardEntry[] = s.accounts.map((a) => {
    const marks = [a.type.trim() === '' ? '—' : a.type, a.disabled ? '已停用' : a.registered ? '已注册' : '没登记'];
    return {
      title: a.name + ' ｜ 余额 ' + money(a.balance),
      sub: marks.join(' · ') + ' ｜ ' + String(a.count) + ' 笔 · 末笔见落点时间',
    };
  });
  rows.push({
    title: '总收入 ' + money(s.totals.income) + '（转账不算收入）',
    sub: '当期累计',
  });
  rows.push({
    title: '总支出 ' + money(s.totals.expense) + '（转账不算支出）',
    sub: '当期累计',
  });
  return rows;
}

/** 对账那一句（账户数 ＋ 参与汇总的流水笔数）。 */
function checkOf(s: AccountSummary): string {
  return String(s.accounts.length) + ' 账户 · 最近 ' + String(s.flow_count) + ' 笔参与汇总 ／ 没有异常';
}

/** 账户汇总页：一整页（判地那一套块位序列）。 */
export function accountSummaryDoc(input: AccountSummaryInput): string {
  const s = input.summary;
  const hasAccounts = s.accounts.length > 0;
  const envelope = listEnvelopeOf(input.key, input.data);
  const detailHtml = hasAccounts
    ? renderEntryCard({ entries: detailRowsOf(s) })
    : emptyOf({
      title: '账户表还是空的',
      text: s.records === 0
        ? '这个库里一条记录都还没有，所以还没有任何账户余额。'
        : '账户表里一个账户都还没有，流水上的账户名也还没登记成账户。',
      next: '先说「新增账户」登记一个，余额就有地方算了。',
    });
  return listSheetPage({
    docTitle: DOC_TITLE + '·账户汇总',
    brand: '饼干记账 · ' + input.wakeWord,
    title: input.wakeWord,
    subtitle: input.window,
    summary: {
      eyebrow: hasAccounts ? '查到了' : '账户表是空的',
      value: hasAccounts ? money(s.totals.balance) : '0',
      unit: '元',
      note: conclusionOf(s),
    },
    ledgerTitle: '账户落点',
    ledger: ledgerOf(s),
    detailTitle: '各账户余额',
    detailTag: 'DETAIL',
    detailHtml,
    check: checkOf(s),
    actions: ticketPrimaryButton({
      label: '复制这份汇总去对账',
      actionId: 'ilife-copy-summary',
      text: buildDataText({ envelope, title: input.wakeWord, format: 'text' }),
    }) + copyZoneOf({
      envelope, title: input.wakeWord, key: input.key, params: input.params,
      source: SOURCE_READ, detail: '查到 ' + String(s.accounts.length) + ' 个账户', actionAt: input.actionAt,
    }),
    foot: '饼干记账 · ' + input.wakeWord,
    styleHtml: accountStyleTag(),
    slot: 'list', page: 'list', shape: 'list', key: input.key, paper: 'detail',
  });
}
