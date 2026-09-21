// HELP 速查：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type ChefKey } from '../policy/index.js';
import { CHEF_KEY_SHAPES } from '../render/index.js';

export interface HelpHit { phrase: string; key: ChefKey; shape: string; cli: string; desc: string; }

/** 槽位 → 可照抄的示例值：表里每条的 `needs` 都从这里取一个真值拼进 `cli`。
 *  取值面钉在**真实库实际有的那一道菜**上（`D:\2Study\StudyNotes\.db\chef_data.db` 实测：
 *  只有 `辣椒炒肉` 一道，状态 `已做`，18 分钟，口味 `辣`，食材含 `螺丝椒`／`五花肉`，炊具 `炒锅`）。
 *  为什么较真：这些「例」就是 AI 在 DSH 里照抄的那一串，指向库里不存在的菜＝跑一次报一次「无此菜谱」。 */
const EXAMPLE_VALUES: Record<string, unknown> = {
  id: 1, recipe_id: 1, name: '辣椒炒肉', nameOrId: '辣椒炒肉', names: ['辣椒炒肉'],
  q: '辣椒', filter: '川菜', action: '大火翻炒', rating: 5, feedback: '好吃', date: '2026-09-06',
  servings: 2, quantity: 250, unit: '克', patch: { servings: 3 },
  difficulty: '快手菜', time_max: 30, cookware: '炒锅', status: '已做',
  step: 2, ingredient: '螺丝椒', input: '菜谱.json',
  child: '小炒肉', parent: '辣椒炒肉', relation_type: '派生', change_summary: '换个辣椒',
  source: '辣椒炒肉', target: '小炒肉', differences: '换个辣椒',
};

function exampleParams(e: { needs?: string[]; preset?: Record<string, unknown> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  for (const n of e.needs || []) if (p[n] === undefined) p[n] = n in EXAMPLE_VALUES ? EXAMPLE_VALUES[n] : '<值>';
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
  'chef.relation.write': '记派生关系/从已有派生新菜（op 分流，写走回执）',
  'chef.relation.query': '看家族树（须 name，成环拒绝出图）',
  'chef.setup.init': '首次使用初始化（幂等，写走回执）',
  'chef.data.batch': '批量改既有行（改前对比，写走回执）',
};

// 全量速查表：`WAKE_TABLE` 有几条就有几行（#841 起 50 条，逐行派生，不落第二份短语）。
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
