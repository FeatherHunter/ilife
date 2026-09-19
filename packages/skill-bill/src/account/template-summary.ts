/** 账户域模板之三 · **账户汇总页型**（`t685-按域页型表.md` §2.5 第 3 行／#688 §五 5.1 的 ⑥ 结果型汇总页）。
 *
 * **本件是这一片页型的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里。
 *  它由读命令 `bill.account.query` 直接出页（一命令一页，没有差异可声明，故不经场景件——
 *  与查询域两张页型同形状）。改一次这一片页型的版式只动本件一处。
 *
 * 盖住的场景：看账户汇总（老 `账户/account_view.html`，288 行／11 个信息块）。
 *
 * **块位序列**（照 #688 §五 5.2 的 ⑥ 汇总／进度／状态 列；● 恒出、○ 有内容才出）：
 *   类型徽章 ●（表序第 6 行，结果胶囊在最前）→ 结论句 ●（第 3 行）→ 页内导航 ●（第 4 行）
 *     → 读数行 ●（第 5 行：总余额／总收入／总支出／净额／转账）→ 各账户余额卡 ●／空态 ●（第 5、23 行）
 *     → 账户余额占比条 ○（第 13 行）→ 停用账户口径注记 ○（第 24 行）→ 最近流水表 ●（第 12 行）
 *     → 长列表明示截断 ○（第 21 行，紧跟流水表）→ 口径说明行 ●（第 24 行）→ 对账折叠区 ●（第 21 行）
 *     → 复制区 ●（第 25 行）→ 来源脚注 ●（第 26 行）
 *   本页**不出**的两块（表序里点了 ⑥ 但这一个域没有对应事实）：第 14 行图表（账户域零图表，
 *   老侧四张模板都没注入图表资源）、第 15 行进度条（账户没有「目标」可比，余额是读数不是进度）。
 *
 * 谁在用（一个调用点，指名）：`src/account/read.ts`——`viewAccountSummary` 装配入参后调 `accountSummaryDoc`。
 */
import { renderCaliberLine, renderConclusionBar, renderDataTable, renderDistributionRows, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn, DataTableRow, KpiCardInput } from 'base-paint/blocks';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import type { AccountFlow, AccountSummary, AccountTotals } from './accounts.js';
import { FLOW_LIMIT } from './accounts.js';
import {
  SOURCE_READ, SOURCE_READ_TEXT, accountPageShell, badgeOf, copyZoneOf, emptyOf, listEnvelopeOf, money, reconcileOf,
  signedMoney, sourceNoteOf, textOrDash,
} from './pageParts.js';

/** 出口载荷（＝envelope `data`）：`items` 是账户卡（`list` 形必填的那一格），其余是本域给页面与下游看的窗口事实。
 *  `items` 这一格**写成可变的 `unknown[]`**：`base-link-core` 的 `list` 形就是这么写的（判据与公共层同宽）。
 *  写成 `type` 而不是 `interface`：`ViewOut['data']` 收 `Record<string, unknown>`，别名形态自带隐式索引签名、
 *  能直接过（同口径见 `../query/list.js` 的 `QueryListData`）。 */
export type AccountSummaryData = {
  readonly items: unknown[];
  readonly total: number;
  readonly totals: AccountTotals;
  readonly flows: readonly AccountFlow[];
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
  /** 来源脚注的窗口起止（记账库里最早与最近一笔的日期；一条都没有时写「不限」）。 */
  readonly windowStart: string;
  readonly windowEnd: string;
  /** 本次执行时刻（复制日志第 5 段）。 */
  readonly actionAt: string;
}

/** 最近流水表的列（本页**唯一一处**定义；表头文本与每格 `data-label` 同源）。 */
const FLOW_COLUMNS: readonly DataTableColumn[] = [
  { key: 'time', label: '时间' },
  { key: 'account', label: '账户' },
  { key: 'category', label: '分类' },
  { key: 'amount', label: '金额', align: 'right' },
  { key: 'note', label: '备注' },
  { key: 'id', label: '编号' },
];

/** 最近流水的一行（值一律已文本化；金额带方向符号，照库里的符号写）。 */
function flowRow(f: AccountFlow): DataTableRow {
  return {
    id: String(f.id),
    time: f.time,
    account: textOrDash(f.account),
    category: textOrDash(f.category),
    amount: signedMoney(f.amount),
    note: textOrDash(f.note),
  };
}

/** 结果胶囊那一枚（徽章列第二枚）：有几个账户、最近几笔、停用几个。 */
function chipsOf(s: AccountSummary): string {
  const out = [String(s.accounts.length) + ' 个账户', '最近流水 ' + String(s.flow_count) + ' 笔'];
  if (s.totals.disabled_count > 0) out.push('停用 ' + String(s.totals.disabled_count) + ' 个');
  return out.join(' ／ ');
}

/** 结论句一行（表序第 3 行）：说的不是读数卡那几个数，而是「这批账户现在是什么局面」。 */
function conclusionOf(s: AccountSummary): string {
  if (s.accounts.length === 0) return '账户表还是空的。';
  const top = [...s.accounts].sort((a, b) => b.balance - a.balance)[0];
  const head = '一共 ' + String(s.accounts.length) + ' 个账户，余额加起来 ' + money(s.totals.balance) + ' 元。';
  if (top === undefined || s.totals.balance === 0) return head;
  return head + '余额最多的是「' + top.name + '」（' + money(top.balance) + ' 元）。';
}

/** 读数行五格（老侧 `账户/account_view.html:194-199` 的五张 KPI 卡同数同序）。 */
function kpiOf(s: AccountSummary): readonly KpiCardInput[] {
  const t = s.totals;
  return [
    { label: '总余额', value: money(t.balance), unit: '元', detail: '只算还开着的账户；转账也算进余额' },
    { label: '总收入', value: money(t.income), unit: '元', detail: '转账不算收入' },
    { label: '总支出', value: money(t.expense), unit: '元', detail: '转账不算支出' },
    { label: '净额', value: money(t.net), unit: '元', detail: '收入减支出' },
    {
      label: '转账', value: String(t.transfer_count) + ' 笔',
      detail: t.transfer_count === 0 ? '还没有转过账' : '合计 ' + money(t.transfer_total) + ' 元（不动收支）',
    },
  ];
}

/** 一张账户卡：余额 ＋ 老侧卡上那六样读数（收入／支出／转入／转出／笔数／最近一次）。 */
function accountCards(s: AccountSummary): readonly KpiCardInput[] {
  return s.accounts.map((a) => {
    const parts = [
      '收入 ' + money(a.income), '支出 ' + money(a.expense),
      '转入 ' + money(a.transfer_in), '转出 ' + money(a.transfer_out),
      '笔数 ' + String(a.count), '最近 ' + (a.last_time.trim() === '' ? '—' : a.last_time),
    ];
    const marks = a.disabled ? '已停用' : a.registered ? '' : '还没有登记';
    return {
      label: a.type.trim() === '' ? a.name : a.name + '（' + a.type + '）',
      value: money(a.balance),
      unit: '元',
      detail: (marks === '' ? '' : marks + ' ／ ') + parts.join(' ／ '),
      status: a.disabled ? 'empty' : 'ok',
      statusText: a.disabled ? '已停用' : a.registered ? '使用中' : '没登记',
    };
  });
}

/** 账户余额占比条（表序第 13 行）：条长＝这个账户余额占全部账户余额绝对值和的比例。
 *  **比值不看符号**（余额可以是负数，条长不能是负的），谁正谁负由数值栏与卡上颜色交代。 */
function balanceBars(s: AccountSummary): string {
  const total = s.accounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
  if (s.accounts.length === 0 || total === 0) return '';
  return renderDistributionRows({
    rows: s.accounts.map((a) => ({
      label: a.name,
      value: money(a.balance) + ' 元',
      pct: (Math.abs(a.balance) / total) * 100,
    })),
  });
}

/** 停用账户口径注记（老侧 `:201-203` 的 `.note-chip` 同义）：停用的余额单列，说清为什么不在总余额里。 */
function disabledNote(s: AccountSummary): string {
  if (s.totals.disabled_count === 0) return '';
  return renderCaliberLine(
    '停用账户（' + s.totals.disabled_accounts.join('、') + '）另有 ' + money(s.totals.disabled_balance)
    + ' 元，没算进上面的总余额。',
  );
}

/** 账户汇总页：一整页。块序在本件只写一份（`blocks` 既拼正文也派生页内导航）。
 *
 *  **账户表为空时不出读数卡**（照 #688 裁定 6 的同一条判法：没有账户就没有余额可报，五张全 0 的读数卡
 *  只是把「什么都没有」说五遍）——那一支出空态句 ＋ 引导句，页仍然是完整的（标题／结论句／复制区／来源脚注都在）。
 *  **流水为空与账户为空是两件事**：账户表空但有流水（记录上没写账户）时照出流水表——老侧在
 *  `cards.length === 0` 时把已经取到的 `flows` 一起藏掉（`账户/account_view.html:188-191`），**不照抄**。 */
export function accountSummaryDoc(input: AccountSummaryInput): string {
  const s = input.summary;
  const hasAccounts = s.accounts.length > 0;
  const envelope = listEnvelopeOf(input.key, input.data);
  const bars = balanceBars(s);
  const flowBlock = s.flows.length === 0
    ? emptyOf({
      title: '还没有流水',
      text: '这个库里一条记录都还没有，所以还没有任何账户余额。',
      next: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
    })
    : renderDataTable({
      columns: FLOW_COLUMNS,
      rows: s.flows.map(flowRow),
      caption: '最近流水（最多 ' + String(FLOW_LIMIT) + ' 笔）',
    }) + renderCaliberLine('这一页只列最近 ' + String(FLOW_LIMIT) + ' 笔流水；要看某一段就说「查区间」并给出起止日期。');
  const blocks: readonly PageBlock[] = [
    ...(hasAccounts
      ? [
        navBlock(renderKpiGrid(kpiOf(s)), 'sec-kpi', '读数'),
        navBlock(renderKpiGrid(accountCards(s), { title: '各账户余额' }), 'sec-accounts', '各账户余额'),
        { html: bars === '' ? '' : renderConclusionBar('各账户余额占了多少') + bars },
        { html: disabledNote(s) },
      ]
      : []),
    navBlock(flowBlock, 'sec-flows', hasAccounts ? '最近流水' : '现在的记录'),
    {
      html: renderCaliberLine('余额＝收入 − 支出 ＋ 转入 − 转出，按账本里的流水累计推算'
        + '｜转账在两个账户之间一增一减，不算进收入与支出｜停用账户的历史记录保留，只是不算进总余额。'),
    },
    navBlock(reconcileOf({
      actionAt: input.actionAt, changed: 0,
      note: '这一页看了 ' + String(s.records) + ' 条流水、' + String(s.accounts.length) + ' 个账户；只读，没有改动任何数据。',
    }), 'sec-reconcile', '对账'),
    navBlock(copyZoneOf({
      envelope, title: input.wakeWord, key: input.key, params: input.params,
      source: SOURCE_READ, detail: '查到 ' + String(s.accounts.length) + ' 个账户', actionAt: input.actionAt,
    }), 'sec-copy', '复制'),
  ];
  const content = badgeOf({
    word: input.wakeWord,
    caliber: hasAccounts ? chipsOf(s) : '还没有账户',
    status: hasAccounts ? 'ok' : 'empty',
    statusText: hasAccounts ? '查到了' : '账户表是空的',
    next: hasAccounts ? '' : '先说「新增账户」登记一个，余额就有地方算了。',
  }) + renderConclusionBar(conclusionOf(s))
    + pageNav(blocks) + pageBody(blocks)
    + sourceNoteOf({
      sourceText: SOURCE_READ_TEXT, start: input.windowStart, end: input.windowEnd, count: s.records,
    });
  return accountPageShell({
    docTitle: DOC_TITLE + '·账户汇总',
    title: input.wakeWord,
    subtitle: input.window,
    slot: 'list', page: 'list', shape: 'list', key: input.key, content,
  });
}
