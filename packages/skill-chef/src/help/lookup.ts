// HELP 速查：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type ChefKey } from '../policy/index.js';
import { CHEF_KEY_SHAPES } from '../render/index.js';
import { m } from '../entries/index.js';

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
  for (const n of e.needs || []) if (p[n] === undefined) p[n] = n in EXAMPLE_VALUES ? EXAMPLE_VALUES[n] : m('skill-chef.help-lookup.c001');
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

/** 能力描述表（键 → 一句话）：**按需构建**——`m()` 只能在函数体内调用，故不做模块级常量表。 */
function descs(): Record<string, string> {
  return {
    'chef.recipe.view': m('skill-chef.help-lookup.c011'),
    'chef.recipe.search': m('skill-chef.help-lookup.c012'),
    'chef.recipe.write': m('skill-chef.help-lookup.c013'),
    'chef.cooking.run': m('skill-chef.help-lookup.c014'),
    'chef.shopping.query': m('skill-chef.help-lookup.c015'),
    'chef.history.record': m('skill-chef.help-lookup.c016'),
    'chef.history.query': m('skill-chef.help-lookup.c017'),
    'chef.help.lookup': m('skill-chef.help-lookup.c018'),
    'chef.relation.write': m('skill-chef.help-lookup.c019'),
    'chef.relation.query': m('skill-chef.help-lookup.c020'),
    'chef.setup.init': m('skill-chef.help-lookup.c021'),
    'chef.data.batch': m('skill-chef.help-lookup.c022'),
  };
}

// 全量速查表：`WAKE_TABLE` 有几条就有几行（#841 起 50 条，逐行派生，不落第二份短语）。
export function buildHelpLookup(): HelpHit[] {
  const d = descs();
  return WAKE_TABLE.map((e) => ({
    phrase: e.phrase,
    key: e.key,
    shape: CHEF_KEY_SHAPES[e.key] || '??',
    cli: 'chef-cmd-read ' + e.key + exampleParams(e),
    desc: d[e.key] || '',
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
