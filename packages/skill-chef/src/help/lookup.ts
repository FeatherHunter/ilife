// HELP 速查：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type ChefKey } from '../policy/index.js';
import { CHEF_KEY_SHAPES } from '../render/index.js';

export interface HelpHit { phrase: string; key: ChefKey; shape: string; cli: string; desc: string; }

function exampleParams(e: { needs?: string[]; preset?: Record<string, unknown> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  for (const n of e.needs || []) {
    if (p[n] === undefined) p[n] = n === 'id' ? 1 : n === 'recipe_id' ? 1 : n === 'name' ? '宫保虾球' : n === 'nameOrId' ? '宫保虾球' : n === 'names' ? ['宫保虾球', '鱼香肉丝'] : n === 'q' ? '排骨' : n === 'filter' ? '川菜' : n === 'action' ? '大火翻炒' : n === 'rating' ? 5 : n === 'feedback' ? '好吃' : n === 'date' ? '2026-09-06' : n === 'servings' ? 2 : n === 'quantity' ? 2 : n === 'unit' ? '克' : n === 'patch' ? { servings: 3 } : '<值>';
  }
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

const DESCS: Record<string, string> = {
  'chef.recipe.view': '看单菜全貌（基本+食材+步骤+历史统计，须 nameOrId）',
  'chef.recipe.search': '搜菜/按条件筛菜/看全部（q 或 cuisine/season/method/flavor/tag/meal/cookware/difficulty/status/maxTime/filter，filter=菜系别名）',
  'chef.recipe.write': '新增/改菜/废弃/加食材/加步骤（op 分流，写走回执）',
  'chef.cooking.run': '开做（步骤内联食材+份数放大说明，须 nameOrId）',
  'chef.shopping.query': '跨菜合并采购清单（names 数组+servings+excludeOptional）',
  'chef.history.record': '记一次做菜（name+rating/feedback/date，写走回执）',
  'chef.history.query': '查做菜时间线/统计/质检/备份（kind 分流，统一 list）',
  'chef.help.lookup': '能力速查 HELP 现找',
};

// 全量速查表（WAKE_TABLE 35 短语：help.lookup4 + recipe.view5 + recipe.search8 + recipe.write4 + cooking.run4 + shopping.query4 + history.record3 + history.query3）。
export function buildHelpLookup(): HelpHit[] {
  return WAKE_TABLE.map((e) => ({
    phrase: e.phrase,
    key: e.key,
    shape: CHEF_KEY_SHAPES[e.key] || '??',
    cli: 'chef-cmd-read ' + e.key + exampleParams(e),
    desc: DESCS[e.key] || '',
  }));
}

export function lookupWake(hits: HelpHit[], word: string): HelpHit[] {
  const exact = hits.filter((h) => word.includes(h.phrase));
  if (exact.length) return exact;
  const q = word || '';
  if (['搜', '找', '查', '寻'].some((c) => q.includes(c))) {
    const rs = hits.filter((h) => h.key.includes('recipe.search'));
    if (rs.length) return rs;
  }
  if (['做菜', '做饭', '下厨'].some((c) => q.includes(c))) return hits.filter((h) => h.key.includes('cooking.run'));
  if (['清单', '买菜'].some((c) => q.includes(c))) return hits.filter((h) => h.key.includes('shopping.query'));
  return [];
}
