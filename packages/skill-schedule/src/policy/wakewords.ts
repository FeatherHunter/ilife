// 口径层·唤醒词路由：自然语言 → 8 联动 key；最长匹配；废弃词（同步作息/作息计划表等）无命中。
// HELP 速查唯一上游；改这里，HELP 构建期跟进。
import { SchedulePolicyError } from '../fetch/errors.js';

export type ScheduleKey =
  | 'schedule.record.today' | 'schedule.record.range' | 'schedule.record.detail'
  | 'schedule.record.write' | 'schedule.record.compare'
  | 'schedule.plan.today' | 'schedule.plan.write'
  | 'schedule.help.lookup';

export interface WakeRoute { key: ScheduleKey; params: Record<string, unknown>; }
export interface WakeEntry { phrase: string; key: ScheduleKey; needs?: string[]; preset?: Record<string, unknown>; }

export const WAKE_TABLE: WakeEntry[] = [
  // HELP（§07 契约 4 条，不在自身 HELP 展示中列出自身，查询走 lookup）。
  { phrase: '作息管家 HELP', key: 'schedule.help.lookup' },
  { phrase: '作息管家帮助', key: 'schedule.help.lookup' },
  { phrase: '作息管家能做什么', key: 'schedule.help.lookup' },
  { phrase: '作息管家使用说明', key: 'schedule.help.lookup' },
  // record.today（#4/#6/#8/#11/#22：单日查 + 状态 + 初始化即开库验证）。
  { phrase: '今天总结', key: 'schedule.record.today' },
  { phrase: '查作息时间轴', key: 'schedule.record.today' },
  { phrase: '查作息状态', key: 'schedule.record.today' },
  { phrase: '初始化数据库', key: 'schedule.record.today' },
  { phrase: '查作息', key: 'schedule.record.today' },
  // record.range（#5/#9：汇总 + 范围）。
  { phrase: '汇总作息', key: 'schedule.record.range', needs: ['start', 'end'] },
  { phrase: '查作息范围', key: 'schedule.record.range', needs: ['start', 'end'] },
  { phrase: '查作息游标', key: 'schedule.record.range', needs: ['start', 'end'] },
  // record.detail（#7/#23：详情 + 按 ID）。
  { phrase: '查作息详情', key: 'schedule.record.detail' },
  { phrase: '按ID查记录', key: 'schedule.record.detail', needs: ['id'] },
  // record.write（#0/#26/#24：记 + 修正 + 写摘要）。
  { phrase: '补一条作息', key: 'schedule.record.write', preset: { op: 'add' } },
  { phrase: '录作息', key: 'schedule.record.write', preset: { op: 'add' } },
  { phrase: '修正作息', key: 'schedule.record.write', preset: { op: 'amend' }, needs: ['id'] },
  { phrase: '改作息', key: 'schedule.record.write', preset: { op: 'amend' }, needs: ['id'] },
  { phrase: '这条记错了', key: 'schedule.record.write', preset: { op: 'amend' }, needs: ['id'] },
  { phrase: '写作息摘要', key: 'schedule.record.write', preset: { op: 'summary' } },
  { phrase: '记作息', key: 'schedule.record.write', preset: { op: 'add' } },
  // record.compare（#25/T4/T5：对比 + 类别深挖 + 异常）。
  { phrase: '对比两个月', key: 'schedule.record.compare', preset: { kind: 'months' } },
  { phrase: '月份对比', key: 'schedule.record.compare', preset: { kind: 'months' } },
  { phrase: '跨月对比', key: 'schedule.record.compare', preset: { kind: 'months' } },
  { phrase: '类别深挖', key: 'schedule.record.compare', preset: { kind: 'category' } },
  { phrase: '异常检测', key: 'schedule.record.compare', preset: { kind: 'anomaly' } },
  // plan.today（#12/#15/#16：查日程 + 概览 + 多日）。
  { phrase: '查多日计划', key: 'schedule.plan.today' },
  { phrase: '24h 概览', key: 'schedule.plan.today' },
  { phrase: '查日程', key: 'schedule.plan.today' },
  { phrase: '看日程', key: 'schedule.plan.today' },
  // plan.write（#13/#14/#17/#18/#19/#20/#21 + 复盘 4 粒度）。
  { phrase: '商量计划', key: 'schedule.plan.write', preset: { op: 'preview' } },
  { phrase: '一起规划', key: 'schedule.plan.write', preset: { op: 'preview' } },
  { phrase: '规划明天', key: 'schedule.plan.write', preset: { op: 'preview' } },
  { phrase: '规划一天', key: 'schedule.plan.write', preset: { op: 'preview' } },
  { phrase: '讨论计划', key: 'schedule.plan.write', preset: { op: 'preview' } },
  { phrase: '补计划', key: 'schedule.plan.write', preset: { op: 'ensure' } },
  { phrase: '改计划', key: 'schedule.plan.write', preset: { op: 'update' }, needs: ['id'] },
  { phrase: '删计划', key: 'schedule.plan.write', preset: { op: 'deactivate' }, needs: ['id'] },
  { phrase: '复盘今日', key: 'schedule.plan.write', preset: { op: 'review', granularity: 'day' } },
  { phrase: '复盘本周', key: 'schedule.plan.write', preset: { op: 'review', granularity: 'week' } },
  { phrase: '复盘本月', key: 'schedule.plan.write', preset: { op: 'review', granularity: 'month' } },
  { phrase: '复盘区间', key: 'schedule.plan.write', preset: { op: 'review', granularity: 'range' } },
  { phrase: '日程管家同步', key: 'schedule.plan.write', preset: { op: 'sync' } },
  { phrase: '飞书探测', key: 'schedule.plan.write', preset: { op: 'sync', dryRun: true } },
  { phrase: '复盘', key: 'schedule.plan.write', preset: { op: 'review' } },
];

// 最长匹配优先（“查作息时间轴”不落入“查作息”，“复盘今日”不落入“复盘”）。
const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);

export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): WakeRoute {
  if (typeof text !== 'string' || text.length === 0) {
    throw new SchedulePolicyError('POLICY_NO_MATCH', '唤醒词为空');
  }
  const hit = SORTED.find((e) => text.includes(e.phrase));
  if (!hit) {
    throw new SchedulePolicyError(
      'POLICY_NO_MATCH',
      '无命中唤醒词：' + text + '（废弃词如同步作息/作息计划表不再路由）',
    );
  }
  for (const s of hit.needs || []) {
    if (ctx[s] === undefined || ctx[s] === null || ctx[s] === '') {
      throw new SchedulePolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + s + '：' + hit.phrase);
    }
  }
  return { key: hit.key, params: { ...(hit.preset || {}), ...pickCtx(ctx, hit.needs || []) } };
}

function pickCtx(ctx: Record<string, unknown>, needs: string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of needs) o[k] = ctx[k];
  return o;
}
