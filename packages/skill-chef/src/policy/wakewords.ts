// 口径层·唤醒词路由：自然语言 → 联动 key；最长匹配；无命中/缺槽位 throw。
// HELP 速查唯一上游；改这里，SKILL.md 的说明面与快照（构建期）、HELP 页的卡状态（生成器）三处跟进。
// 50 条 = 37 条原路由词（下标 1..37 不动）＋ 13 条本次接入词（下标 38..50，按域归组）。
// 改这张表＝同时改三处登记面，判据见 `docs/skills/skill-chef/t841-登记面对账.mjs`。
import { ChefPolicyError } from '../fetch/errors.js';

export type ChefKey =
  | 'chef.recipe.view' | 'chef.recipe.search' | 'chef.recipe.write' | 'chef.cooking.run'
  | 'chef.shopping.query' | 'chef.history.record' | 'chef.history.query' | 'chef.help.lookup'
  // #841 起接入的四条：入口分派与命令键表（`src/cli/keys.ts` 生成物）早在 #839 落位时就有它们，
  // 只是唤醒词层当时还没有词指过来（那 13 条老组名留待本票），本票补齐后不再有「有命令没词」的键。
  | 'chef.relation.write' | 'chef.relation.query' | 'chef.setup.init' | 'chef.data.batch';

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
  { phrase: '看菜谱', key: 'chef.recipe.view', needs: ['name'] },
  { phrase: '看菜', key: 'chef.recipe.view', needs: ['name'] },
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
  // ── 38–50：本次接入的 13 条旧路由表外短语（原文见 `docs/skills/skill-chef/t767-对账表.md` §二）。
  //    这 13 条原是不可路由的老组名；各域在 #770–#776 落好命令分支与页面后，
  //    由 #841 补进本表接管路由。`needs` 逐条对齐各域 run 真正读的参数名，
  //    `preset` 逐条对齐 t767 的卡面 `editable_fields`（筛选四条的维度键照卡面写，
  //    不经 `filter` 绕 `cuisine`——同 #771 对既有三条路由错位的处理）。
  //    排序：按域归组，域序照十域表（搜索筛选 → 修改 → 录入 → 派生 → 开始使用 → 数据管理）。
  { phrase: '筛选难度', key: 'chef.recipe.search', needs: ['difficulty'] },
  { phrase: '筛选时间', key: 'chef.recipe.search', needs: ['time_max'] },
  { phrase: '筛选炊具', key: 'chef.recipe.search', needs: ['cookware'] },
  { phrase: '筛选状态', key: 'chef.recipe.search', needs: ['status'] },
  { phrase: '修改步骤', key: 'chef.recipe.write', needs: ['name', 'step'], preset: { op: 'update', target: 'step' } },
  { phrase: '修改食材', key: 'chef.recipe.write', needs: ['name', 'ingredient'], preset: { op: 'update', target: 'ingredient' } },
  { phrase: '导入食谱', key: 'chef.recipe.write', needs: ['name', 'input'], preset: { op: 'add' } },
  { phrase: '添加派生关系', key: 'chef.relation.write', needs: ['child', 'parent', 'relation_type', 'change_summary'] },
  { phrase: '从已有派生新菜', key: 'chef.relation.write', needs: ['source', 'target', 'differences'], preset: { op: 'derive' } },
  { phrase: '首次使用', key: 'chef.setup.init' },
  { phrase: '查看派生关系', key: 'chef.relation.query', needs: ['name'] },
  { phrase: '批量改', key: 'chef.data.batch', needs: ['name'] },
  { phrase: '备份', key: 'chef.history.query', preset: { kind: 'backup' } },
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
