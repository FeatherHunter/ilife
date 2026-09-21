/** #767 · 域与唤醒词资产单一源：老 48 场景／33 组名 → 仓内 typed 资产。
 *
 * ⚠️ 机器生成，**禁手改**：由 `packages/skill-chef/scripts/gen-chef-scenes.mjs` 产出。
 *    改内容＝改生成器里的声明表（十域表／组→域归属／卡表／50 词表），再跑
 *    `node packages/skill-chef/scripts/gen-chef-scenes.mjs`（`--check` 只比对不落盘）。
 *
 * 事实源（全程只读，老件一行不动）：
 *   ① `src/help/sceneData.ts` 的 48 卡（id／组／chip）：标题与 prompt 以它为准，本件不复制；
 *   ② `src/policy/wakewords.ts` 的 `WAKE_TABLE`（37 条）：路由唯一事实源，既有语义不动；
 *   ③ t2 §5.1：13 条新表多出词的落位与 prompt 口径（9 复用／3 新写／1 参数）。
 * 摘要锁：`WAKE_TABLE` 37 短语 sha256＝edaef07339b594ecbaeffdc26a8f6f14f958ab44402bab8a5c00746855423a50
 *           `sceneData.ts` 48 卡 id sha256＝14033d014cc5cb86e2a79b28696ed8c17cd30708c5df79c63ae171bfc79a8374
 * 域目录中文名＝HELP 域 label；卡 slug＝卡 id（全局唯一，文件名为 `<slug>.html`，见 t767-命名.md）。
 */

export interface ChefDomain { id: string; label: string; icon: string; dir: string; }
export interface ChefGroup { id: string; domain: string; }
export interface ChefCard { id: string; group: string; domain: string; slug: string; }
export interface ChefWake { phrase: string; source: string; routable: boolean; key: string; group: string; cards: readonly string[]; promptKind: string; promptRef: string; }

export const CHEF_DOMAINS: readonly ChefDomain[] = [
  { id: 'cook', label: '做菜', icon: '🍳', dir: '做菜' },
  { id: 'view', label: '查看', icon: '👀', dir: '查看' },
  { id: 'search', label: '搜索筛选', icon: '🔍', dir: '搜索筛选' },
  { id: 'update', label: '修改', icon: '✏️', dir: '修改' },
  { id: 'history', label: '历史', icon: '📜', dir: '历史' },
  { id: 'shopping', label: '采购', icon: '🛒', dir: '采购' },
  { id: 'add', label: '录入', icon: '📝', dir: '录入' },
  { id: 'relation', label: '派生', icon: '🌿', dir: '派生' },
  { id: 'setup', label: '开始使用', icon: '🚀', dir: '开始使用' },
  { id: 'data', label: '数据管理', icon: '🗄️', dir: '数据管理' },
];

export const CHEF_GROUPS: readonly ChefGroup[] = [
  { id: '做菜模式', domain: 'cook' },
  { id: '查看食谱', domain: 'view' },
  { id: '查看食材', domain: 'view' },
  { id: '查看步骤', domain: 'view' },
  { id: '查看营养', domain: 'view' },
  { id: '查看背景', domain: 'view' },
  { id: '搜索食谱', domain: 'search' },
  { id: '筛选菜系', domain: 'search' },
  { id: '筛选食材', domain: 'search' },
  { id: '筛选难度', domain: 'search' },
  { id: '筛选时间', domain: 'search' },
  { id: '筛选炊具', domain: 'search' },
  { id: '筛选口味', domain: 'search' },
  { id: '筛选季节', domain: 'search' },
  { id: '筛选状态', domain: 'search' },
  { id: '查看全部', domain: 'search' },
  { id: '修改食谱', domain: 'update' },
  { id: '修改步骤', domain: 'update' },
  { id: '修改食材', domain: 'update' },
  { id: '废弃食谱', domain: 'update' },
  { id: '记录做菜', domain: 'history' },
  { id: '查看历史', domain: 'history' },
  { id: '查看统计', domain: 'history' },
  { id: '生成清单', domain: 'shopping' },
  { id: '录入食谱', domain: 'add' },
  { id: '导入食谱', domain: 'add' },
  { id: '添加派生关系', domain: 'relation' },
  { id: '查看派生关系', domain: 'relation' },
  { id: '从已有派生新菜', domain: 'relation' },
  { id: '首次使用', domain: 'setup' },
  { id: '体检', domain: 'data' },
  { id: '批量改', domain: 'data' },
  { id: '备份', domain: 'data' },
];

export const CHEF_CARDS: readonly ChefCard[] = [
  { id: 'cooking_start_fresh', group: '做菜模式', domain: 'cook', slug: 'cooking_start_fresh' },
  { id: 'cooking_start_with_history', group: '做菜模式', domain: 'cook', slug: 'cooking_start_with_history' },
  { id: 'cooking_start_double_servings', group: '做菜模式', domain: 'cook', slug: 'cooking_start_double_servings' },
  { id: 'cooking_resume_after_pause', group: '做菜模式', domain: 'cook', slug: 'cooking_resume_after_pause' },
  { id: 'cooking_during_waiting_step', group: '做菜模式', domain: 'cook', slug: 'cooking_during_waiting_step' },
  { id: 'view_full_recipe', group: '查看食谱', domain: 'view', slug: 'view_full_recipe' },
  { id: 'view_for_beginner', group: '查看食谱', domain: 'view', slug: 'view_for_beginner' },
  { id: 'view_recipe_with_substitution', group: '查看食谱', domain: 'view', slug: 'view_recipe_with_substitution' },
  { id: 'view_ingredients_only', group: '查看食材', domain: 'view', slug: 'view_ingredients_only' },
  { id: 'view_ingredients_grouped', group: '查看食材', domain: 'view', slug: 'view_ingredients_grouped' },
  { id: 'view_steps_only', group: '查看步骤', domain: 'view', slug: 'view_steps_only' },
  { id: 'view_nutrition_only', group: '查看营养', domain: 'view', slug: 'view_nutrition_only' },
  { id: 'view_background_only', group: '查看背景', domain: 'view', slug: 'view_background_only' },
  { id: 'search_by_name_keyword', group: '搜索食谱', domain: 'search', slug: 'search_by_name_keyword' },
  { id: 'search_fuzzy_match', group: '搜索食谱', domain: 'search', slug: 'search_fuzzy_match' },
  { id: 'filter_cuisine_basic', group: '筛选菜系', domain: 'search', slug: 'filter_cuisine_basic' },
  { id: 'filter_combined', group: '筛选菜系', domain: 'search', slug: 'filter_combined' },
  { id: 'filter_by_ingredient_basic', group: '筛选食材', domain: 'search', slug: 'filter_by_ingredient_basic' },
  { id: 'filter_exclude_ingredient', group: '筛选食材', domain: 'search', slug: 'filter_exclude_ingredient' },
  { id: 'filter_difficulty_easy', group: '筛选难度', domain: 'search', slug: 'filter_difficulty_easy' },
  { id: 'filter_time_quick', group: '筛选时间', domain: 'search', slug: 'filter_time_quick' },
  { id: 'filter_by_cookware', group: '筛选炊具', domain: 'search', slug: 'filter_by_cookware' },
  { id: 'filter_by_flavor', group: '筛选口味', domain: 'search', slug: 'filter_by_flavor' },
  { id: 'filter_by_season', group: '筛选季节', domain: 'search', slug: 'filter_by_season' },
  { id: 'filter_by_status', group: '筛选状态', domain: 'search', slug: 'filter_by_status' },
  { id: 'list_all_recipes', group: '查看全部', domain: 'search', slug: 'list_all_recipes' },
  { id: 'update_main_fields', group: '修改食谱', domain: 'update', slug: 'update_main_fields' },
  { id: 'update_step_content', group: '修改步骤', domain: 'update', slug: 'update_step_content' },
  { id: 'update_ingredient', group: '修改食材', domain: 'update', slug: 'update_ingredient' },
  { id: 'discard_recipe', group: '废弃食谱', domain: 'update', slug: 'discard_recipe' },
  { id: 'record_cook', group: '记录做菜', domain: 'history', slug: 'record_cook' },
  { id: 'view_history_list', group: '查看历史', domain: 'history', slug: 'view_history_list' },
  { id: 'view_stats_dashboard', group: '查看统计', domain: 'history', slug: 'view_stats_dashboard' },
  { id: 'view_stats_global', group: '查看统计', domain: 'history', slug: 'view_stats_global' },
  { id: 'shopping_generate', group: '生成清单', domain: 'shopping', slug: 'shopping_generate' },
  { id: 'add_from_image', group: '录入食谱', domain: 'add', slug: 'add_from_image' },
  { id: 'add_from_markdown', group: '录入食谱', domain: 'add', slug: 'add_from_markdown' },
  { id: 'add_from_conversation', group: '录入食谱', domain: 'add', slug: 'add_from_conversation' },
  { id: 'add_from_template', group: '录入食谱', domain: 'add', slug: 'add_from_template' },
  { id: 'import_from_json', group: '导入食谱', domain: 'add', slug: 'import_from_json' },
  { id: 'import_validation_failed', group: '导入食谱', domain: 'add', slug: 'import_validation_failed' },
  { id: 'add_relation', group: '添加派生关系', domain: 'relation', slug: 'add_relation' },
  { id: 'view_relation_tree', group: '查看派生关系', domain: 'relation', slug: 'view_relation_tree' },
  { id: 'derive_from_existing', group: '从已有派生新菜', domain: 'relation', slug: 'derive_from_existing' },
  { id: 'first_use', group: '首次使用', domain: 'setup', slug: 'first_use' },
  { id: 'data_quality_report', group: '体检', domain: 'data', slug: 'data_quality_report' },
  { id: 'data_batch_edit', group: '批量改', domain: 'data', slug: 'data_batch_edit' },
  { id: 'data_export_backup', group: '备份', domain: 'data', slug: 'data_export_backup' },
];

export const CHEF_WAKES: readonly ChefWake[] = [
  { phrase: '做菜模式', source: 'old-group', routable: true, key: 'chef.cooking.run', group: '做菜模式', cards: ['cooking_start_fresh', 'cooking_start_with_history', 'cooking_start_double_servings', 'cooking_resume_after_pause', 'cooking_during_waiting_step'], promptKind: 'group', promptRef: '' },
  { phrase: '查看食谱', source: 'old-group', routable: true, key: 'chef.recipe.view', group: '查看食谱', cards: ['view_full_recipe', 'view_for_beginner', 'view_recipe_with_substitution'], promptKind: 'group', promptRef: '' },
  { phrase: '查看食材', source: 'old-group', routable: true, key: 'chef.recipe.view', group: '查看食材', cards: ['view_ingredients_only', 'view_ingredients_grouped'], promptKind: 'group', promptRef: '' },
  { phrase: '查看步骤', source: 'old-group', routable: true, key: 'chef.recipe.view', group: '查看步骤', cards: ['view_steps_only'], promptKind: 'group', promptRef: '' },
  { phrase: '查看营养', source: 'old-group', routable: true, key: 'chef.recipe.view', group: '查看营养', cards: ['view_nutrition_only'], promptKind: 'group', promptRef: '' },
  { phrase: '查看背景', source: 'old-group', routable: true, key: 'chef.recipe.view', group: '查看背景', cards: ['view_background_only'], promptKind: 'group', promptRef: '' },
  { phrase: '搜索食谱', source: 'old-group', routable: true, key: 'chef.recipe.search', group: '搜索食谱', cards: ['search_by_name_keyword', 'search_fuzzy_match'], promptKind: 'group', promptRef: '' },
  { phrase: '筛选菜系', source: 'old-group', routable: true, key: 'chef.recipe.search', group: '筛选菜系', cards: ['filter_cuisine_basic', 'filter_combined'], promptKind: 'group', promptRef: '' },
  { phrase: '筛选食材', source: 'old-group', routable: true, key: 'chef.recipe.search', group: '筛选食材', cards: ['filter_by_ingredient_basic', 'filter_exclude_ingredient'], promptKind: 'group', promptRef: '' },
  { phrase: '筛选口味', source: 'old-group', routable: true, key: 'chef.recipe.search', group: '筛选口味', cards: ['filter_by_flavor'], promptKind: 'group', promptRef: '' },
  { phrase: '筛选季节', source: 'old-group', routable: true, key: 'chef.recipe.search', group: '筛选季节', cards: ['filter_by_season'], promptKind: 'group', promptRef: '' },
  { phrase: '查看全部', source: 'old-group', routable: true, key: 'chef.recipe.search', group: '查看全部', cards: ['list_all_recipes'], promptKind: 'group', promptRef: '' },
  { phrase: '修改食谱', source: 'old-group', routable: true, key: 'chef.recipe.write', group: '修改食谱', cards: ['update_main_fields'], promptKind: 'group', promptRef: '' },
  { phrase: '废弃食谱', source: 'old-group', routable: true, key: 'chef.recipe.write', group: '废弃食谱', cards: ['discard_recipe'], promptKind: 'group', promptRef: '' },
  { phrase: '记录做菜', source: 'old-group', routable: true, key: 'chef.history.record', group: '记录做菜', cards: ['record_cook'], promptKind: 'group', promptRef: '' },
  { phrase: '查看历史', source: 'old-group', routable: true, key: 'chef.history.query', group: '查看历史', cards: ['view_history_list'], promptKind: 'group', promptRef: '' },
  { phrase: '查看统计', source: 'old-group', routable: true, key: 'chef.history.query', group: '查看统计', cards: ['view_stats_dashboard', 'view_stats_global'], promptKind: 'group', promptRef: '' },
  { phrase: '生成清单', source: 'old-group', routable: true, key: 'chef.shopping.query', group: '生成清单', cards: ['shopping_generate'], promptKind: 'group', promptRef: '' },
  { phrase: '录入食谱', source: 'old-group', routable: true, key: 'chef.recipe.write', group: '录入食谱', cards: ['add_from_image', 'add_from_markdown', 'add_from_conversation', 'add_from_template'], promptKind: 'group', promptRef: '' },
  { phrase: '体检', source: 'old-group', routable: true, key: 'chef.history.query', group: '体检', cards: ['data_quality_report'], promptKind: 'group', promptRef: '' },
  { phrase: '筛选难度', source: 'old-group', routable: false, key: 'chef.recipe.search', group: '筛选难度', cards: ['filter_difficulty_easy'], promptKind: 'group', promptRef: '' },
  { phrase: '筛选时间', source: 'old-group', routable: false, key: 'chef.recipe.search', group: '筛选时间', cards: ['filter_time_quick'], promptKind: 'group', promptRef: '' },
  { phrase: '筛选炊具', source: 'old-group', routable: false, key: 'chef.recipe.search', group: '筛选炊具', cards: ['filter_by_cookware'], promptKind: 'group', promptRef: '' },
  { phrase: '筛选状态', source: 'old-group', routable: false, key: 'chef.recipe.search', group: '筛选状态', cards: ['filter_by_status'], promptKind: 'group', promptRef: '' },
  { phrase: '修改步骤', source: 'old-group', routable: false, key: 'chef.recipe.write', group: '修改步骤', cards: ['update_step_content'], promptKind: 'group', promptRef: '' },
  { phrase: '修改食材', source: 'old-group', routable: false, key: 'chef.recipe.write', group: '修改食材', cards: ['update_ingredient'], promptKind: 'group', promptRef: '' },
  { phrase: '导入食谱', source: 'old-group', routable: false, key: 'chef.recipe.write', group: '导入食谱', cards: ['import_from_json', 'import_validation_failed'], promptKind: 'group', promptRef: '' },
  { phrase: '添加派生关系', source: 'old-group', routable: false, key: 'tbd', group: '添加派生关系', cards: ['add_relation'], promptKind: 'group', promptRef: '' },
  { phrase: '查看派生关系', source: 'old-group', routable: false, key: 'tbd', group: '查看派生关系', cards: ['view_relation_tree'], promptKind: 'group', promptRef: '' },
  { phrase: '从已有派生新菜', source: 'old-group', routable: false, key: 'tbd', group: '从已有派生新菜', cards: ['derive_from_existing'], promptKind: 'group', promptRef: '' },
  { phrase: '首次使用', source: 'old-group', routable: false, key: 'tbd', group: '首次使用', cards: ['first_use'], promptKind: 'group', promptRef: '' },
  { phrase: '批量改', source: 'old-group', routable: false, key: 'tbd', group: '批量改', cards: ['data_batch_edit'], promptKind: 'group', promptRef: '' },
  { phrase: '备份', source: 'old-group', routable: false, key: 'chef.history.query', group: '备份', cards: ['data_export_backup'], promptKind: 'group', promptRef: '' },
  { phrase: '看菜谱', source: 'new-extra', routable: true, key: 'chef.recipe.view', group: '查看食谱', cards: ['view_full_recipe'], promptKind: 'reuse', promptRef: 'view_full_recipe' },
  { phrase: '看菜', source: 'new-extra', routable: true, key: 'chef.recipe.view', group: '查看食谱', cards: ['view_full_recipe'], promptKind: 'reuse', promptRef: 'view_full_recipe' },
  { phrase: '搜菜', source: 'new-extra', routable: true, key: 'chef.recipe.search', group: '搜索食谱', cards: ['search_by_name_keyword'], promptKind: 'reuse', promptRef: 'search_by_name_keyword' },
  { phrase: '查食材', source: 'new-extra', routable: true, key: 'chef.recipe.search', group: '搜索食谱', cards: ['search_by_name_keyword'], promptKind: 'reuse', promptRef: 'search_by_name_keyword' },
  { phrase: '加菜', source: 'new-extra', routable: true, key: 'chef.recipe.write', group: '录入食谱', cards: ['add_from_template'], promptKind: 'reuse', promptRef: 'add_from_template' },
  { phrase: '开始做菜', source: 'new-extra', routable: true, key: 'chef.cooking.run', group: '做菜模式', cards: ['cooking_start_fresh'], promptKind: 'reuse', promptRef: 'cooking_start_fresh' },
  { phrase: '继续做菜', source: 'new-extra', routable: true, key: 'chef.cooking.run', group: '做菜模式', cards: ['cooking_resume_after_pause'], promptKind: 'reuse', promptRef: 'cooking_resume_after_pause' },
  { phrase: '完成做菜', source: 'new-extra', routable: true, key: 'chef.cooking.run', group: '做菜模式', cards: ['cooking_start_fresh'], promptKind: 'new', promptRef: '{{菜名}}做好了,帮我收尾。' },
  { phrase: '排除可选', source: 'new-extra', routable: true, key: 'chef.shopping.query', group: '生成清单', cards: ['shopping_generate'], promptKind: 'param', promptRef: 'shopping_generate' },
  { phrase: '查清单', source: 'new-extra', routable: true, key: 'chef.shopping.query', group: '生成清单', cards: ['shopping_generate'], promptKind: 'new', promptRef: '请加载私家大厨技能,帮我查看现有采购清单(唤醒词:查清单)。' },
  { phrase: '清空清单', source: 'new-extra', routable: true, key: 'chef.shopping.query', group: '生成清单', cards: ['shopping_generate'], promptKind: 'new', promptRef: '请加载私家大厨技能,帮我清空采购清单(唤醒词:清空清单)。' },
  { phrase: '补录做菜', source: 'new-extra', routable: true, key: 'chef.history.record', group: '记录做菜', cards: ['record_cook'], promptKind: 'reuse', promptRef: 'record_cook' },
  { phrase: '改评分', source: 'new-extra', routable: true, key: 'chef.history.record', group: '记录做菜', cards: ['record_cook'], promptKind: 'reuse', promptRef: 'record_cook' },
  { phrase: '私家大厨HELP', source: 'help', routable: true, key: 'chef.help.lookup', group: '', cards: [], promptKind: 'help', promptRef: '' },
  { phrase: '菜谱HELP', source: 'help', routable: true, key: 'chef.help.lookup', group: '', cards: [], promptKind: 'help', promptRef: '' },
  { phrase: '查帮助', source: 'help', routable: true, key: 'chef.help.lookup', group: '', cards: [], promptKind: 'help', promptRef: '' },
  { phrase: '能做什么', source: 'help', routable: true, key: 'chef.help.lookup', group: '', cards: [], promptKind: 'help', promptRef: '' },
];

/** 卡产物相对路径：`<域中文目录>/<slug>.html`（落 `cook_html/` 下；绝对路径由驱动器按配置拼）。 */
export function chefProductPath(cardId: string): string {
  const c = CHEF_CARDS.find((x) => x.id === cardId);
  if (!c) throw new Error('[chef-scenes] 未知卡：' + cardId);
  const d = CHEF_DOMAINS.find((x) => x.id === c.domain);
  if (!d) throw new Error('[chef-scenes] 未知域：' + c.domain);
  return d.dir + '/' + c.slug + '.html';
}
