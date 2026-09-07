// HELP 速查：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type BillKey } from '../policy/index.js';
import { BILL_KEY_SHAPES } from '../render/index.js';

export interface HelpHit { phrase: string; key: BillKey; shape: string; cli: string; desc: string; }

function exampleParams(key: BillKey, e: { needs?: string[]; preset?: Record<string, unknown> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  // B2：record.add 示例须可直跑——补最小槽位 category/amount/note（kind preset 仅路由提示，校验忽略未知键）。
  if (key === 'bill.record.add') {
    if (p.category === undefined) p.category = '餐饮';
    if (p.amount === undefined) p.amount = -35;
    if (p.note === undefined) p.note = '午饭';
  }
  for (const n of e.needs || []) {
    if (p[n] === undefined) p[n] = n === 'id' ? 1 : n === 'date' ? '2026-09-06' : n === 'start' || n === 'end' ? '2026-09-01' : n === 'month' ? '2026-09' : n === 'amount' ? 35 : n === 'q' ? '午饭' : n === 'tag' ? '旅行' : n === 'category' ? '餐饮' : n === 'account' ? '支付宝' : n === 'ledger' ? '生活' : n === 'name' ? '招行卡' : n === 'from' ? '支付宝' : n === 'to' ? '招行卡' : n === 'file' ? 'bills.csv' : '<值>';
  }
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

const DESCS: Record<string, string> = {
  'bill.record.add': '记一笔（须 category+amount，note 可选；含借贷/分期/退款/报销，拍账单图片识别以外置为准）',
  'bill.record.update': '改/撤销（软删）/恢复（须 id）',
  'bill.record.today': '查今天/昨天/某天/最近/查账单',
  'bill.record.range': '查周/月/区间/分类/账户/账本',
  'bill.record.search': '搜备注/查标签/查欠款/查待报销/查分期',
  'bill.record.detail': '看单条详情（须 id）',
  'bill.analysis.overview': '看月度/年度/总览/周报/分类/账户/账本/结构/统计',
  'bill.analysis.compare': '看对比/双区间/同比/分类对比',
  'bill.analysis.trend': '看趋势/大额/高频/分布/活跃/洞察/异常/借贷/报销/分期/退款',
  'bill.goal.write': '设定预算/目标（覆盖须 --force）',
  'bill.goal.query': '看预算执行/目标进度',
  'bill.account.write': '新增/改账户/转账（双笔 #转账）',
  'bill.account.query': '看账户汇总（余额实算）',
  'bill.link.submit': '买东西/吃饭联动（主操作复用记账，跨技能仅复制 prompt）',
  'bill.setup.run': '初始化/备份/恢复/导入（列映射 dry-run 先行）',
  'bill.help.lookup': '能力速查 HELP 现找',
};

// 全量速查表（77 短语：72 功能 + 4 HELP + 1 补齐）。
export function buildHelpLookup(): HelpHit[] {
  return WAKE_TABLE.map((e) => ({
    phrase: e.phrase,
    key: e.key,
    shape: BILL_KEY_SHAPES[e.key] || '??',
    cli: 'bill-cmd-read ' + e.key + exampleParams(e.key, e),
    desc: DESCS[e.key] || '',
  }));
}

export function lookupWake(hits: HelpHit[], word: string): HelpHit[] {
  return hits.filter((h) => word.includes(h.phrase));
}
