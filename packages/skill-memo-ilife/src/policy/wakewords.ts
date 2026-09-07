// 口径层·唤醒词路由（M3）：9 查询类 + 写入类；最长匹配；批量改分类向导与改子分类按“批量”消歧；无命中/缺槽位 throw。
import { MemoPolicyError } from '../fetch/errors.js';
import { WAKE_TOPS } from './category.js';

export type MemoKey =
  | 'memo.search' | 'memo.detail' | 'memo.create' | 'memo.update' | 'memo.remove'
  | 'memo.remind' | 'memo.wish' | 'memo.sync' | 'memo.batch' | 'memo.stats';

export interface WakeRoute { key: MemoKey; params: Record<string, unknown>; }
export interface WakeEntry { phrase: string; key: MemoKey; needs?: string[]; preset?: Record<string, unknown>; }

// 全量唤醒词表（HELP 速查唯一上游；改这里，HELP 构建期跟进）。
export const WAKE_TABLE: WakeEntry[] = [
  { phrase: '按时间搜备忘', key: 'memo.search', needs: ['timeRange'] },
  { phrase: '查已提醒备忘', key: 'memo.remind', preset: { done: false } },
  { phrase: '批量改分类', key: 'memo.batch' },
  { phrase: '改子分类', key: 'memo.update', needs: ['id'] },
  { phrase: '搜备忘', key: 'memo.search' },
  { phrase: '查备忘', key: 'memo.search' },
  { phrase: '看备忘', key: 'memo.detail', needs: ['id'] },
  { phrase: '看提醒', key: 'memo.remind' },
  { phrase: '查提醒', key: 'memo.remind' },
  { phrase: '设提醒', key: 'memo.create', needs: ['remindAt'] },
  { phrase: '记提醒', key: 'memo.create', needs: ['remindAt'] },
  { phrase: '废弃提醒', key: 'memo.remove', preset: { mode: 'abandon' } },
  { phrase: '完成心愿', key: 'memo.update', preset: { done: true } },
  { phrase: '心愿排期', key: 'memo.wish' },
  { phrase: '记一条', key: 'memo.create' },
  { phrase: '添加笔记', key: 'memo.create' },
];

for (const [p, top] of Object.entries(WAKE_TOPS)) {
  const verb = p[0];
  if (verb === '记') WAKE_TABLE.push({ phrase: p, key: 'memo.create', preset: { category: top } });
  else if (verb === '查') WAKE_TABLE.push({ phrase: p, key: p === '查心愿' ? 'memo.wish' : 'memo.search', preset: { category: top } });
  else WAKE_TABLE.push({ phrase: p, key: 'memo.update', needs: ['id'], preset: { category: top } });
}

// 最长匹配优先，保证“批量改分类”不落入“改子分类”。
const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);

export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): WakeRoute {
  if (typeof text !== 'string' || text.length === 0) throw new MemoPolicyError('POLICY_NO_MATCH', '唤醒词为空');
  const hit = SORTED.find((e) => text.includes(e.phrase));
  if (!hit) throw new MemoPolicyError('POLICY_NO_MATCH', '无命中唤醒词：' + text);
  for (const s of hit.needs || []) {
    if (ctx[s] === undefined || ctx[s] === null || ctx[s] === '') {
      throw new MemoPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + s + '：' + hit.phrase);
    }
  }
  return { key: hit.key, params: { ...(hit.preset || {}), ...pickCtx(ctx, hit.needs || []) } };
}

function pickCtx(ctx: Record<string, unknown>, needs: string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of needs) o[k] = ctx[k];
  return o;
}
