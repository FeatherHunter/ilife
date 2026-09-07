// 口径层·唤醒词路由：自然语言 → 16 联动 key；最长匹配；无命中/缺槽位 throw。
// HELP 速查唯一上游；改这里，HELP 构建期跟进。77 短语 = 72 功能 + 4 HELP + 1 补齐读链（查账单详情，老家无直接词）。
import { BillPolicyError } from '../fetch/errors.js';

export type BillKey =
  | 'bill.record.add' | 'bill.record.update'
  | 'bill.record.today' | 'bill.record.range' | 'bill.record.search' | 'bill.record.detail'
  | 'bill.analysis.overview' | 'bill.analysis.compare' | 'bill.analysis.trend'
  | 'bill.goal.write' | 'bill.goal.query'
  | 'bill.account.write' | 'bill.account.query'
  | 'bill.link.submit' | 'bill.setup.run'
  | 'bill.help.lookup';

export interface WakeRoute { key: BillKey; params: Record<string, unknown>; }
export interface WakeEntry { phrase: string; key: BillKey; needs?: string[]; preset?: Record<string, unknown>; }

// 全量唤醒词表（HELP 速查唯一上游；改这里，HELP 构建期跟进）。
export const WAKE_TABLE: WakeEntry[] = [
  // HELP 现找 4 条（§141~144，不在自身 HELP 展示中列出自身，查询走 lookup）。
  { phrase: '饼干记账 HELP', key: 'bill.help.lookup' },
  { phrase: '饼干记账帮助', key: 'bill.help.lookup' },
  { phrase: '查帮助', key: 'bill.help.lookup' },
  { phrase: '能做什么', key: 'bill.help.lookup' },
  // record.add 13（#11/#12/#13/#14/#15/#16/#17/#18/#19/#20/#21/#22：支出/收入/拍账单/批量/退款/报销/到账/借出/借入/收回/偿还/分期 + 记一笔通用）。
  { phrase: '记支出', key: 'bill.record.add', preset: { kind: 'expense' } },
  { phrase: '记收入', key: 'bill.record.add', preset: { kind: 'income' } },
  { phrase: '拍账单', key: 'bill.record.add', preset: { kind: 'photo' } },
  { phrase: '批量录入', key: 'bill.record.add', preset: { kind: 'batch' } },
  { phrase: '记退款', key: 'bill.record.add', preset: { kind: 'refund' } },
  { phrase: '记报销', key: 'bill.record.add', preset: { kind: 'reimburse' } },
  { phrase: '报销到账', key: 'bill.record.add', preset: { kind: 'reimburse-done' } },
  { phrase: '记借出', key: 'bill.record.add', preset: { kind: 'lend' } },
  { phrase: '记借入', key: 'bill.record.add', preset: { kind: 'borrow' } },
  { phrase: '记收回', key: 'bill.record.add', preset: { kind: 'collect' } },
  { phrase: '记偿还', key: 'bill.record.add', preset: { kind: 'repay' } },
  { phrase: '记分期', key: 'bill.record.add', preset: { kind: 'installment' } },
  { phrase: '记一笔', key: 'bill.record.add' },
  // record.update 3（#23/#24/#25：改/撤销/恢复）。
  { phrase: '改记录', key: 'bill.record.update', needs: ['id'] },
  { phrase: '撤销', key: 'bill.record.update', preset: { op: 'undo' }, needs: ['id'] },
  { phrase: '恢复', key: 'bill.record.update', preset: { op: 'restore' }, needs: ['id'] },
  // record.today 5（#51~#54：今天/昨天/某天/最近 + 查账单通用别名；查账单详情走 detail 最长匹配）。
  { phrase: '查今天', key: 'bill.record.today' },
  { phrase: '查昨天', key: 'bill.record.today', preset: { date: 'yesterday' } },
  { phrase: '查某天', key: 'bill.record.today', needs: ['date'] },
  { phrase: '查最近', key: 'bill.record.today', preset: { recent: true } },
  { phrase: '查账单', key: 'bill.record.today' },
  // record.range 6（#55~#58/#61/#62：周/月/区间/分类/账户/账本）。
  { phrase: '查周', key: 'bill.record.range', preset: { range: 'week' } },
  { phrase: '查月', key: 'bill.record.range', preset: { range: 'month' } },
  { phrase: '查区间', key: 'bill.record.range', needs: ['start', 'end'] },
  { phrase: '查分类', key: 'bill.record.range', needs: ['category'] },
  { phrase: '查账户', key: 'bill.record.range', needs: ['account'] },
  { phrase: '查账本', key: 'bill.record.range', needs: ['ledger'] },
  // record.search 5（#59/#60/#63/#64/#65：搜备注/查标签/查欠款/查待报销/查分期）。
  { phrase: '搜备注', key: 'bill.record.search', needs: ['q'] },
  { phrase: '查标签', key: 'bill.record.search', preset: { kind: 'tag' }, needs: ['tag'] },
  { phrase: '查欠款', key: 'bill.record.search', preset: { kind: 'debt' } },
  { phrase: '查待报销', key: 'bill.record.search', preset: { kind: 'reimburse' } },
  { phrase: '查分期', key: 'bill.record.search', preset: { kind: 'installment' } },
  // record.detail 1（单条详情，id 分流）。
  { phrase: '查账单详情', key: 'bill.record.detail', needs: ['id'] },
  // analysis.overview 9（#81/#82/#83/#84/#85/#86/#87/#88/#98：月度/年度/总览/周报/分类/账户/账本/结构/统计）。
  { phrase: '看月度', key: 'bill.analysis.overview', preset: { kind: 'monthly' } },
  { phrase: '看年度', key: 'bill.analysis.overview', preset: { kind: 'yearly' } },
  { phrase: '看总览', key: 'bill.analysis.overview', preset: { kind: 'overview' } },
  { phrase: '看周报', key: 'bill.analysis.overview', preset: { kind: 'week' } },
  { phrase: '看分类', key: 'bill.analysis.overview', preset: { kind: 'category' } },
  { phrase: '看账户', key: 'bill.analysis.overview', preset: { kind: 'account' } },
  { phrase: '看账本', key: 'bill.analysis.overview', preset: { kind: 'ledger' } },
  { phrase: '看结构', key: 'bill.analysis.overview', preset: { kind: 'structure' } },
  { phrase: '做统计', key: 'bill.analysis.overview', preset: { kind: 'stats' } },
  // analysis.compare 4（#89/#90/#91/#92：对比/双区间/同比/分类对比）。
  { phrase: '看对比', key: 'bill.analysis.compare', preset: { kind: 'period' } },
  { phrase: '看双区间', key: 'bill.analysis.compare', preset: { kind: 'range' } },
  { phrase: '看同比', key: 'bill.analysis.compare', preset: { kind: 'yoy' } },
  { phrase: '看分类对比', key: 'bill.analysis.compare', preset: { kind: 'category' } },
  // analysis.trend 12（#93~#105：趋势/分类趋势/大额/高频/分布/活跃/洞察/异常/借贷/报销/分期/退款）。
  { phrase: '看趋势', key: 'bill.analysis.trend', preset: { kind: 'trend' } },
  { phrase: '看分类趋势', key: 'bill.analysis.trend', preset: { kind: 'category' } },
  { phrase: '看大额', key: 'bill.analysis.trend', preset: { kind: 'top' } },
  { phrase: '看高频', key: 'bill.analysis.trend', preset: { kind: 'frequent' } },
  { phrase: '看分布', key: 'bill.analysis.trend', preset: { kind: 'distribution' } },
  { phrase: '看活跃', key: 'bill.analysis.trend', preset: { kind: 'activity' } },
  { phrase: '看洞察', key: 'bill.analysis.trend', preset: { kind: 'insight' } },
  { phrase: '看异常', key: 'bill.analysis.trend', preset: { kind: 'anomaly' } },
  { phrase: '看借贷', key: 'bill.analysis.trend', preset: { kind: 'debt' } },
  { phrase: '看报销', key: 'bill.analysis.trend', preset: { kind: 'reimburse' } },
  { phrase: '看分期', key: 'bill.analysis.trend', preset: { kind: 'installment' } },
  { phrase: '看退款', key: 'bill.analysis.trend', preset: { kind: 'refund' } },
  // goal.write 2（#111/#113：设定预算/设定目标）。
  { phrase: '设定预算', key: 'bill.goal.write', preset: { op: 'set-budget' }, needs: ['amount'] },
  { phrase: '设定目标', key: 'bill.goal.write', preset: { op: 'set-saving' }, needs: ['name', 'amount'] },
  // goal.query 2（#112/#114：看预算/看目标）。
  { phrase: '看预算', key: 'bill.goal.query', preset: { op: 'budget' } },
  { phrase: '看目标', key: 'bill.goal.query', preset: { op: 'saving' } },
  // account.write 3（#121/#122/#123：新增/改/转账）。
  { phrase: '新增账户', key: 'bill.account.write', preset: { op: 'add' }, needs: ['name'] },
  { phrase: '改账户', key: 'bill.account.write', preset: { op: 'update' }, needs: ['name'] },
  { phrase: '账户转账', key: 'bill.account.write', preset: { op: 'transfer' }, needs: ['amount', 'from', 'to'] },
  // account.query 1（#124：看账户汇总）。
  { phrase: '看账户汇总', key: 'bill.account.query' },
  // link.submit 2（#131/#132：买东西/吃饭；主操作复用 record.add，跨技能仅复制 prompt）。
  { phrase: '买东西', key: 'bill.link.submit', preset: { scene: 'purchase' } },
  { phrase: '吃饭', key: 'bill.link.submit', preset: { scene: 'meal' } },
  // setup.run 5（#1~#5：初始化/初始化状态/备份/恢复备份/导入）。
  { phrase: '初始化', key: 'bill.setup.run', preset: { op: 'init' } },
  { phrase: '初始化状态', key: 'bill.setup.run', preset: { op: 'init-status' } },
  { phrase: '备份', key: 'bill.setup.run', preset: { op: 'backup-create' } },
  { phrase: '恢复备份', key: 'bill.setup.run', preset: { op: 'restore' } },
  { phrase: '导入', key: 'bill.setup.run', preset: { op: 'import' }, needs: ['file'] },
];

// 最长匹配优先（“看分类对比”不落入“看分类”，“初始化状态”不落入“初始化”，“报销到账”不落入“记报销”）。
const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);

export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): WakeRoute {
  if (typeof text !== 'string' || text.length === 0) throw new BillPolicyError('POLICY_NO_MATCH', '唤醒词为空');
  const hit = SORTED.find((e) => text.includes(e.phrase));
  if (!hit) throw new BillPolicyError('POLICY_NO_MATCH', '无命中唤醒词：' + text);
  for (const s of hit.needs || []) {
    if (ctx[s] === undefined || ctx[s] === null || ctx[s] === '') {
      throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + s + '：' + hit.phrase);
    }
  }
  return { key: hit.key, params: { ...(hit.preset || {}), ...pickCtx(ctx, hit.needs || []) } };
}

function pickCtx(ctx: Record<string, unknown>, needs: string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of needs) o[k] = ctx[k];
  return o;
}
