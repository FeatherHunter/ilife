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
import { entryCardCss, renderEntryCard, ticketButtonCss } from 'base-paint/blocks';
import type { EntryCardEntry } from 'base-paint/blocks';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { listSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import type { AccountSummary, AccountTotals } from './accounts.js';
import { buildAccountCopy } from './copyTextAccount.js';
import { copyZoneOf, emptyOf, listEnvelopeOf, money, sourceRead } from './pageParts.js';
import { m } from '../entries/index.js';

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
  if (s.accounts.length === 0) return m('skill-bill.account-template-summary.c001');
  const top = [...s.accounts].sort((a, b) => b.balance - a.balance)[0];
  const head = m('skill-bill.account-template-summary.c002', {
    p0: String(String(s.accounts.length)),
    p1: String(money(s.totals.balance)),
  });
  if (top === undefined || s.totals.balance === 0) return head;
  return m('skill-bill.account-template-summary.c003', {
    p0: String(head),
    p1: String(top.name),
    p2: String(money(top.balance)),
  });
}

/** 落点那几行（判地五行：分类／账户／账本／时间／编号）。 */
function ledgerOf(s: AccountSummary): readonly TicketSheetRow[] {
  const last = s.flows.length === 0 ? '' : s.flows[0].time;
  return [
    { label: m('skill-bill.account-template-summary.c004'), value: m('skill-bill.account-template-summary.c005') },
    { label: m('skill-bill.account-template-summary.c006'), value: m('skill-bill.account-template-summary.c007', { p0: String(String(s.accounts.length)) }) },
    { label: m('skill-bill.account-template-summary.c008'), value: m('skill-bill.account-template-summary.c009') },
    { label: m('skill-bill.account-template-summary.c010'), value: last === '' ? m('skill-bill.account-template-summary.c011') : m('skill-bill.account-template-summary.c012', { p0: String(last) }) },
    { label: m('skill-bill.account-template-summary.c013'), value: m('skill-bill.account-template-summary.c014', { p0: String(String(s.flow_count)) }) },
  ];
}

/** 中段那一串行（判地：每户一行「账户 ｜ 余额 X」＋ 说明；末尾两行总收入／总支出）。 */
function detailRowsOf(s: AccountSummary): readonly EntryCardEntry[] {
  /** 占比条的分母＝本页余额绝对值最大那一户（判地 M4「相对最大户口径」；全 0 时不画实条）。 */
  const maxAbs = s.accounts.reduce((m, a) => Math.max(m, Math.abs(a.balance)), 0);
  const rows: EntryCardEntry[] = s.accounts.map((a) => {
    const marks = [a.type.trim() === '' ? '—' : a.type, a.disabled ? m('skill-bill.account-template-summary.c015') : a.registered ? m('skill-bill.account-template-summary.c016') : m('skill-bill.account-template-summary.c017')];
    return {
      title: m('skill-bill.account-template-summary.c018', { p0: String(a.name), p1: String(money(a.balance)) }),
      sub: m('skill-bill.account-template-summary.c019', {
        p0: String(marks.join(' · ')),
        p1: String(String(a.count)),
      }),
      // 判地：每户一枚占比条；余额为负那一档走 neg（虚线空框、不画实条，M5）。
      bar: { pct: maxAbs <= 0 ? 0 : Math.round((Math.abs(a.balance) / maxAbs) * 1000) / 10, neg: a.balance < 0 },
    };
  });
  rows.push({
    title: m('skill-bill.account-template-summary.c020', { p0: String(money(s.totals.income)) }),
    sub: m('skill-bill.account-template-summary.c021'),
  });
  rows.push({
    title: m('skill-bill.account-template-summary.c022', { p0: String(money(s.totals.expense)) }),
    sub: m('skill-bill.account-template-summary.c023'),
  });
  return rows;
}

/** 对账那一句（账户数 ＋ 参与汇总的流水笔数）。 */
function checkOf(s: AccountSummary): string {
  return m('skill-bill.account-template-summary.c024', {
    p0: String(String(s.accounts.length)),
    p1: String(String(s.flow_count)),
  });
}

/** 账户汇总页：一整页（判地那一套块位序列）。 */
export function accountSummaryDoc(input: AccountSummaryInput): string {
  const s = input.summary;
  const hasAccounts = s.accounts.length > 0;
  const envelope = listEnvelopeOf(input.key, input.data);
  const detailHtml = hasAccounts
    ? renderEntryCard({ entries: detailRowsOf(s) })
    : emptyOf({
      title: m('skill-bill.account-template-summary.c025'),
      text: s.records === 0
        ? m('skill-bill.account-template-summary.c026')
        : m('skill-bill.account-template-summary.c027'),
      next: m('skill-bill.account-template-summary.c028'),
    });
  return listSheetPage({
    docTitle: m('skill-bill.account-template-summary.c029', { p0: String(DOC_TITLE) }),
    brand: m('skill-bill.account-template-summary.c030', { p0: String(input.wakeWord) }),
    title: input.wakeWord,
    subtitle: input.window,
    summary: {
      eyebrow: hasAccounts ? m('skill-bill.account-template-summary.c031') : m('skill-bill.account-template-summary.c032'),
      value: hasAccounts ? money(s.totals.balance) : '0',
      unit: m('skill-bill.account-template-summary.c033'),
      note: conclusionOf(s),
    },
    ledgerTitle: m('skill-bill.account-template-summary.c034'),
    ledger: ledgerOf(s),
    detailTitle: m('skill-bill.account-template-summary.c035'),
    detailTag: 'DETAIL',
    detailHtml,
    check: checkOf(s),
    // #1137 D 类：删「复制这份汇总去对账」按钮——复制区里的「复制数据」按钮载的是同一份载荷
    // （同是 buildDataText 的 text 格式），留两个是语义重复。负责人 2026-10-05 原话点名删除。
    actions: copyZoneOf({
      envelope, title: input.wakeWord, key: input.key, params: input.params,
      source: sourceRead(), detail: m('skill-bill.account-template-summary.c036', { p0: String(String(s.accounts.length)) }), actionAt: input.actionAt,
      copy: buildAccountCopy(input.wakeWord, s),
    }),
    foot: m('skill-bill.account-template-summary.c037', { p0: String(input.wakeWord) }),
    styleHtml: '<style>' + ticketButtonCss() + entryCardCss() + '</style>',
    slot: 'list', page: 'list', shape: 'list', key: input.key, paper: 'detail',
  });
}
