// 口径层·唤醒词路由：自然语言 → 8 联动 key；最长匹配；无命中/缺槽位 throw。
// HELP 速查唯一上游；改这里，HELP 构建期跟进。35 条 = help4 + view5 + search8 + write4 + cooking4 + shopping4 + record3 + query3。
import { ChefPolicyError } from '../fetch/errors.js';

export type ChefKey =
  | 'chef.recipe.view' | 'chef.recipe.search' | 'chef.recipe.write' | 'chef.cooking.run'
  | 'chef.shopping.query' | 'chef.history.record' | 'chef.history.query' | 'chef.help.lookup';

export interface WakeRoute { key: ChefKey; params: Record<string, unknown>; }
export interface WakeEntry { phrase: string; key: ChefKey; needs?: string[]; preset?: Record<string, unknown>; }

export const WAKE_TABLE: WakeEntry[] = [
  { phrase: '私家大厨HELP', key: 'chef.help.lookup' },
  { phrase: '菜谱HELP', key: 'chef.help.lookup' },
  { phrase: '查帮助', key: 'chef.help.lookup' },
  { phrase: '能做什么', key: 'chef.help.lookup' },
  { phrase: '查看食谱', key: 'chef.recipe.view', needs: ['name'] },
  { phrase: '查看食材', key: 'chef.recipe.view', needs: ['name'] },
  { phrase: '查看步骤', key: 'chef.recipe.view', needs: ['name'] },
  { phrase: '查看营养', key: 'chef.recipe.view', needs: ['name'] },
  { phrase: '查看背景', key: 'chef.recipe.view', needs: ['name'] },
  { phrase: '查看全部', key: 'chef.recipe.search', preset: { kind: 'all' } },
  { phrase: '搜索食谱', key: 'chef.recipe.search', needs: ['q'] },
  { phrase: '搜菜', key: 'chef.recipe.search', needs: ['q'] },
  { phrase: '查食材', key: 'chef.recipe.search', needs: ['q'] },
  { phrase: '筛选菜系', key: 'chef.recipe.search', needs: ['filter'] },
  { phrase: '筛选食材', key: 'chef.recipe.search', needs: ['filter'] },
  { phrase: '筛选口味', key: 'chef.recipe.search', needs: ['filter'] },
  { phrase: '筛选季节', key: 'chef.recipe.search', needs: ['filter'] },
  { phrase: '录入食谱', key: 'chef.recipe.write', needs: ['name'], preset: { op: 'add' } },
  { phrase: '修改食谱', key: 'chef.recipe.write', needs: ['name'], preset: { op: 'update' } },
  { phrase: '废弃食谱', key: 'chef.recipe.write', needs: ['name'], preset: { op: 'deprecate' } },
  { phrase: '加菜', key: 'chef.recipe.write', needs: ['name'], preset: { op: 'add' } },
  { phrase: '做菜模式', key: 'chef.cooking.run', needs: ['name'] },
  { phrase: '开始做菜', key: 'chef.cooking.run', needs: ['name'] },
  { phrase: '继续做菜', key: 'chef.cooking.run', needs: ['name'] },
  { phrase: '完成做菜', key: 'chef.cooking.run', needs: ['name'] },
  { phrase: '生成清单', key: 'chef.shopping.query', needs: ['names'] },
  { phrase: '排除可选', key: 'chef.shopping.query', needs: ['names'] },
  { phrase: '查清单', key: 'chef.shopping.query', needs: ['names'] },
  { phrase: '清空清单', key: 'chef.shopping.query', needs: ['names'] },
  { phrase: '记录做菜', key: 'chef.history.record', needs: ['name'] },
  { phrase: '补录做菜', key: 'chef.history.record', needs: ['name'] },
  { phrase: '改评分', key: 'chef.history.record', needs: ['name'] },
  { phrase: '查看历史', key: 'chef.history.query', needs: ['name'] },
  { phrase: '查看统计', key: 'chef.history.query', preset: { kind: 'stats' } },
  { phrase: '体检', key: 'chef.history.query', preset: { kind: 'quality' } },
];

const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);

export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): WakeRoute {
  if (typeof text !== 'string' || text.length === 0) throw new ChefPolicyError('POLICY_NO_MATCH', '唤醒词为空');
  const hit = SORTED.find((e) => text.includes(e.phrase));
  if (!hit) throw new ChefPolicyError('POLICY_NO_MATCH', '无命中唤醒词：' + text);
  for (const s of hit.needs || []) {
    const v = (ctx as Record<string, unknown>)[s];
    if (v === undefined || v === null || v === '') {
      throw new ChefPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + s + '：' + hit.phrase);
    }
  }
  const params: Record<string, unknown> = { ...(hit.preset || {}) };
  for (const k of hit.needs || []) params[k] = (ctx as Record<string, unknown>)[k];
  if (hit.key === 'chef.history.record' && (ctx as Record<string, unknown>).rating !== undefined && params.rating === undefined) {
    params.rating = (ctx as Record<string, unknown>).rating;
  }
  if (hit.key === 'chef.history.record' && (ctx as Record<string, unknown>).feedback !== undefined && params.feedback === undefined) {
    params.feedback = (ctx as Record<string, unknown>).feedback;
  }
  return { key: hit.key, params };
}
