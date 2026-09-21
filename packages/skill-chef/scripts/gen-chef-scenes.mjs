#!/usr/bin/env node
/** #767 · 域与唤醒词资产单一源：老 48 场景／33 组名 → 仓内 typed 资产。
 *
 * 为什么留一个生成器：50 词 ↔48 卡的映射、13 条新表多出词的归属、域目录中文名与卡 slug，
 * 三件事手抄必漂移；生成器只做「读事实源 → 声明式映射 → 逐字序列化 → 落盘」，跑两次字节一致。
 *
 * 用法：
 *   node packages/skill-chef/scripts/gen-chef-scenes.mjs              # 落盘
 *   node packages/skill-chef/scripts/gen-chef-scenes.mjs --check      # 只比对，不一致 exit 1
 *
 * 三处事实源（全程只读，老件一行不动）：
 *   ① `src/help/sceneData.ts`（机器生成、禁手改）：48 卡的 id／组名／chip 由它派生，不落第二份标题与 prompt；
 *      本件只存 id→组→域→slug 与词→卡映射，标题与 prompt 仍以 sceneData.ts 为唯一事实源；
 *   ② `src/policy/wakewords.ts` 的 `WAKE_TABLE`（37 条）：唤醒词路由的唯一事实源，既有 37 条不改语义；
 *      本件只投影它的短语集合做双向对账，不复制路由逻辑；
 *   ③ `docs/skills/skill-chef/t2-content-reconcile.md` §5.1：13 条新表多出词的内容来源与落位（9 复用／3 新写／1 参数）。
 *
 * 双向对账口径：并集 50＝老 33 组名＋新表多出 13＋HELP 触发 4；`WAKE_TABLE` 37＝其中可路由 37；
 *   老组名中有 13 个不在表中（→14 张待开发卡，状态仍由 sceneData.ts 派生，本件不重判）；
 *   差集＝可路由词缺表＋表词缺并集＋业务词无卡＋卡无词，任一即红。
 * 摘要锁：`WAKE_TABLE` 37 短语集合＋`sceneData.ts` 48 卡 id 集合；任一漂移即 exit 1 并点名。
 *   改内容＝改本生成器声明表再重跑（`sceneData.ts` 的标题与 prompt 不在这里改）。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const OUT = join(PKG_DIR, 'src', 'triggers', 'chef-scenes.ts');
const WAKE_SRC = join(PKG_DIR, 'src', 'policy', 'wakewords.ts');
const SCENE_SRC = join(PKG_DIR, 'src', 'help', 'sceneData.ts');

/** 十域（取自 HELP 域 label，逐字；域目录中文名＝label，见 t767-命名.md）。 */
const DOMAINS = [
  { id: 'cook', label: '做菜', icon: '🍳' },
  { id: 'view', label: '查看', icon: '👀' },
  { id: 'search', label: '搜索筛选', icon: '🔍' },
  { id: 'update', label: '修改', icon: '✏️' },
  { id: 'history', label: '历史', icon: '📜' },
  { id: 'shopping', label: '采购', icon: '🛒' },
  { id: 'add', label: '录入', icon: '📝' },
  { id: 'relation', label: '派生', icon: '🌿' },
  { id: 'setup', label: '开始使用', icon: '🚀' },
  { id: 'data', label: '数据管理', icon: '🗄️' },
];

/** 老 33 组→域（t2 §二归属表逐行；组序＝HELP 载荷序按域收组）。 */
const GROUP_DOMAIN = {
  '做菜模式': 'cook',
  '查看食谱': 'view', '查看食材': 'view', '查看步骤': 'view', '查看营养': 'view', '查看背景': 'view',
  '搜索食谱': 'search', '筛选菜系': 'search', '筛选食材': 'search', '筛选难度': 'search', '筛选时间': 'search',
  '筛选炊具': 'search', '筛选口味': 'search', '筛选季节': 'search', '筛选状态': 'search', '查看全部': 'search',
  '修改食谱': 'update', '修改步骤': 'update', '修改食材': 'update', '废弃食谱': 'update',
  '记录做菜': 'history', '查看历史': 'history', '查看统计': 'history',
  '生成清单': 'shopping',
  '录入食谱': 'add', '导入食谱': 'add',
  '添加派生关系': 'relation', '查看派生关系': 'relation', '从已有派生新菜': 'relation',
  '首次使用': 'setup',
  '体检': 'data', '批量改': 'data', '备份': 'data',
};

/** 48 卡（id＋组；域由组派生，slug＝id，见 t767-命名.md；标题与 prompt 以 sceneData.ts 为准，这里不复制）。 */
const CARDS = [
  ['cooking_start_fresh', '做菜模式'], ['cooking_start_with_history', '做菜模式'], ['cooking_start_double_servings', '做菜模式'], ['cooking_resume_after_pause', '做菜模式'], ['cooking_during_waiting_step', '做菜模式'],
  ['view_full_recipe', '查看食谱'], ['view_for_beginner', '查看食谱'], ['view_recipe_with_substitution', '查看食谱'],
  ['view_ingredients_only', '查看食材'], ['view_ingredients_grouped', '查看食材'],
  ['view_steps_only', '查看步骤'], ['view_nutrition_only', '查看营养'], ['view_background_only', '查看背景'],
  ['search_by_name_keyword', '搜索食谱'], ['search_fuzzy_match', '搜索食谱'],
  ['filter_cuisine_basic', '筛选菜系'], ['filter_combined', '筛选菜系'],
  ['filter_by_ingredient_basic', '筛选食材'], ['filter_exclude_ingredient', '筛选食材'],
  ['filter_difficulty_easy', '筛选难度'], ['filter_time_quick', '筛选时间'], ['filter_by_cookware', '筛选炊具'],
  ['filter_by_flavor', '筛选口味'], ['filter_by_season', '筛选季节'], ['filter_by_status', '筛选状态'],
  ['list_all_recipes', '查看全部'],
  ['update_main_fields', '修改食谱'], ['update_step_content', '修改步骤'], ['update_ingredient', '修改食材'], ['discard_recipe', '废弃食谱'],
  ['record_cook', '记录做菜'], ['view_history_list', '查看历史'], ['view_stats_dashboard', '查看统计'], ['view_stats_global', '查看统计'],
  ['shopping_generate', '生成清单'],
  ['add_from_image', '录入食谱'], ['add_from_markdown', '录入食谱'], ['add_from_conversation', '录入食谱'], ['add_from_template', '录入食谱'],
  ['import_from_json', '导入食谱'], ['import_validation_failed', '导入食谱'],
  ['add_relation', '添加派生关系'], ['view_relation_tree', '查看派生关系'], ['derive_from_existing', '从已有派生新菜'],
  ['first_use', '首次使用'],
  ['data_quality_report', '体检'], ['data_batch_edit', '批量改'], ['data_export_backup', '备份'],
];

/** 50 词并集：[短语, 来源, 可路由, 命令, 组, 卡, prompt口径, prompt依据]；tbd＝尚无命令分支，纵向票实现（见对账表）。 */
const WAKES = [
  ['做菜模式', 'old-group', 1, 'chef.cooking.run', '做菜模式', ['cooking_start_fresh', 'cooking_start_with_history', 'cooking_start_double_servings', 'cooking_resume_after_pause', 'cooking_during_waiting_step'], 'group', ''],
  ['查看食谱', 'old-group', 1, 'chef.recipe.view', '查看食谱', ['view_full_recipe', 'view_for_beginner', 'view_recipe_with_substitution'], 'group', ''],
  ['查看食材', 'old-group', 1, 'chef.recipe.view', '查看食材', ['view_ingredients_only', 'view_ingredients_grouped'], 'group', ''],
  ['查看步骤', 'old-group', 1, 'chef.recipe.view', '查看步骤', ['view_steps_only'], 'group', ''],
  ['查看营养', 'old-group', 1, 'chef.recipe.view', '查看营养', ['view_nutrition_only'], 'group', ''],
  ['查看背景', 'old-group', 1, 'chef.recipe.view', '查看背景', ['view_background_only'], 'group', ''],
  ['搜索食谱', 'old-group', 1, 'chef.recipe.search', '搜索食谱', ['search_by_name_keyword', 'search_fuzzy_match'], 'group', ''],
  ['筛选菜系', 'old-group', 1, 'chef.recipe.search', '筛选菜系', ['filter_cuisine_basic', 'filter_combined'], 'group', ''],
  ['筛选食材', 'old-group', 1, 'chef.recipe.search', '筛选食材', ['filter_by_ingredient_basic', 'filter_exclude_ingredient'], 'group', ''],
  ['筛选口味', 'old-group', 1, 'chef.recipe.search', '筛选口味', ['filter_by_flavor'], 'group', ''],
  ['筛选季节', 'old-group', 1, 'chef.recipe.search', '筛选季节', ['filter_by_season'], 'group', ''],
  ['查看全部', 'old-group', 1, 'chef.recipe.search', '查看全部', ['list_all_recipes'], 'group', ''],
  ['修改食谱', 'old-group', 1, 'chef.recipe.write', '修改食谱', ['update_main_fields'], 'group', ''],
  ['废弃食谱', 'old-group', 1, 'chef.recipe.write', '废弃食谱', ['discard_recipe'], 'group', ''],
  ['记录做菜', 'old-group', 1, 'chef.history.record', '记录做菜', ['record_cook'], 'group', ''],
  ['查看历史', 'old-group', 1, 'chef.history.query', '查看历史', ['view_history_list'], 'group', ''],
  ['查看统计', 'old-group', 1, 'chef.history.query', '查看统计', ['view_stats_dashboard', 'view_stats_global'], 'group', ''],
  ['生成清单', 'old-group', 1, 'chef.shopping.query', '生成清单', ['shopping_generate'], 'group', ''],
  ['录入食谱', 'old-group', 1, 'chef.recipe.write', '录入食谱', ['add_from_image', 'add_from_markdown', 'add_from_conversation', 'add_from_template'], 'group', ''],
  ['体检', 'old-group', 1, 'chef.history.query', '体检', ['data_quality_report'], 'group', ''],
  ['筛选难度', 'old-group', 0, 'chef.recipe.search', '筛选难度', ['filter_difficulty_easy'], 'group', ''],
  ['筛选时间', 'old-group', 0, 'chef.recipe.search', '筛选时间', ['filter_time_quick'], 'group', ''],
  ['筛选炊具', 'old-group', 0, 'chef.recipe.search', '筛选炊具', ['filter_by_cookware'], 'group', ''],
  ['筛选状态', 'old-group', 0, 'chef.recipe.search', '筛选状态', ['filter_by_status'], 'group', ''],
  ['修改步骤', 'old-group', 0, 'chef.recipe.write', '修改步骤', ['update_step_content'], 'group', ''],
  ['修改食材', 'old-group', 0, 'chef.recipe.write', '修改食材', ['update_ingredient'], 'group', ''],
  ['导入食谱', 'old-group', 0, 'chef.recipe.write', '导入食谱', ['import_from_json', 'import_validation_failed'], 'group', ''],
  ['添加派生关系', 'old-group', 0, 'tbd', '添加派生关系', ['add_relation'], 'group', ''],
  ['查看派生关系', 'old-group', 0, 'tbd', '查看派生关系', ['view_relation_tree'], 'group', ''],
  ['从已有派生新菜', 'old-group', 0, 'tbd', '从已有派生新菜', ['derive_from_existing'], 'group', ''],
  ['首次使用', 'old-group', 0, 'tbd', '首次使用', ['first_use'], 'group', ''],
  ['批量改', 'old-group', 0, 'tbd', '批量改', ['data_batch_edit'], 'group', ''],
  ['备份', 'old-group', 0, 'chef.history.query', '备份', ['data_export_backup'], 'group', ''],
  ['看菜谱', 'new-extra', 1, 'chef.recipe.view', '查看食谱', ['view_full_recipe'], 'reuse', 'view_full_recipe'],
  ['看菜', 'new-extra', 1, 'chef.recipe.view', '查看食谱', ['view_full_recipe'], 'reuse', 'view_full_recipe'],
  ['搜菜', 'new-extra', 1, 'chef.recipe.search', '搜索食谱', ['search_by_name_keyword'], 'reuse', 'search_by_name_keyword'],
  ['查食材', 'new-extra', 1, 'chef.recipe.search', '搜索食谱', ['search_by_name_keyword'], 'reuse', 'search_by_name_keyword'],
  ['加菜', 'new-extra', 1, 'chef.recipe.write', '录入食谱', ['add_from_template'], 'reuse', 'add_from_template'],
  ['开始做菜', 'new-extra', 1, 'chef.cooking.run', '做菜模式', ['cooking_start_fresh'], 'reuse', 'cooking_start_fresh'],
  ['继续做菜', 'new-extra', 1, 'chef.cooking.run', '做菜模式', ['cooking_resume_after_pause'], 'reuse', 'cooking_resume_after_pause'],
  ['完成做菜', 'new-extra', 1, 'chef.cooking.run', '做菜模式', ['cooking_start_fresh'], 'new', '{{菜名}}做好了,帮我收尾。'],
  ['排除可选', 'new-extra', 1, 'chef.shopping.query', '生成清单', ['shopping_generate'], 'param', 'shopping_generate'],
  ['查清单', 'new-extra', 1, 'chef.shopping.query', '生成清单', ['shopping_generate'], 'new', '请加载私家大厨技能,帮我查看现有采购清单(唤醒词:查清单)。'],
  ['清空清单', 'new-extra', 1, 'chef.shopping.query', '生成清单', ['shopping_generate'], 'new', '请加载私家大厨技能,帮我清空采购清单(唤醒词:清空清单)。'],
  ['补录做菜', 'new-extra', 1, 'chef.history.record', '记录做菜', ['record_cook'], 'reuse', 'record_cook'],
  ['改评分', 'new-extra', 1, 'chef.history.record', '记录做菜', ['record_cook'], 'reuse', 'record_cook'],
  ['私家大厨HELP', 'help', 1, 'chef.help.lookup', '', [], 'help', ''],
  ['菜谱HELP', 'help', 1, 'chef.help.lookup', '', [], 'help', ''],
  ['查帮助', 'help', 1, 'chef.help.lookup', '', [], 'help', ''],
  ['能做什么', 'help', 1, 'chef.help.lookup', '', [], 'help', ''],
];

/** 形状断言（改声明表即跟变；外部事实源的漂移另由摘要锁报）。 */
const EXPECT = {
  domains: 10, groups: 33, cards: 48, wakes: 50,
  oldGroups: 33, newExtra: 13, helpWords: 4, wakeRoutable: 37, wakeNonRoutable: 13,
};

/** 摘要锁（外部事实源；任一不符即 exit 1 并点名；改声明表不改这里，改事实源才红）。 */
const WAKE_DIGEST = 'edaef07339b594ecbaeffdc26a8f6f14f958ab44402bab8a5c00746855423a50';
const CARD_DIGEST = '14033d014cc5cb86e2a79b28696ed8c17cd30708c5df79c63ae171bfc79a8374';

const bad = (msg) => { throw new Error('生成器断言不过：' + msg); };
const eq = (what, got, want) => { if (got !== want) bad(what + ' ＝ ' + got + '，应为 ' + want); };
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const lf = (text) => (text.match(/\n/g) || []).length;

function readWakeTable() {
  const rows = [...readFileSync(WAKE_SRC, 'utf8').matchAll(/\{ phrase: '([^']+)', key: '([^']+)'/g)]
    .map((m) => ({ phrase: m[1], key: m[2] }));
  eq('WAKE_TABLE 条数', rows.length, EXPECT.wakeRoutable);
  return rows;
}

function readSceneCards() {
  const text = readFileSync(SCENE_SRC, 'utf8');
  const ids = [...text.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*title:/g)].map((m) => m[1]);
  const chips = [...text.matchAll(/wake_word:\s*'([^']+)'/g)].map((m) => m[1]);
  return { ids, chips };
}

function build() {
  eq('域数', DOMAINS.length, EXPECT.domains);
  eq('组数', Object.keys(GROUP_DOMAIN).length, EXPECT.groups);
  eq('卡数', CARDS.length, EXPECT.cards);
  eq('词数', WAKES.length, EXPECT.wakes);
  eq('老组名数', WAKES.filter((w) => w[1] === 'old-group').length, EXPECT.oldGroups);
  eq('新表多出词数', WAKES.filter((w) => w[1] === 'new-extra').length, EXPECT.newExtra);
  eq('HELP 词数', WAKES.filter((w) => w[1] === 'help').length, EXPECT.helpWords);
  eq('可路由词数', WAKES.filter((w) => w[2] === 1).length, EXPECT.wakeRoutable);
  eq('不可路由词数', WAKES.filter((w) => w[2] === 0).length, EXPECT.wakeNonRoutable);
  const cardIds = CARDS.map((c) => c[0]);
  eq('卡 id 唯一', new Set(cardIds).size, CARDS.length);
  const phrases = WAKES.map((w) => w[0]);
  eq('词不重复', new Set(phrases).size, WAKES.length);
  for (const [id, group] of CARDS) {
    if (!GROUP_DOMAIN[group]) bad('卡 ' + id + ' 的组不在归属表：' + group);
  }
  const slugs = CARDS.map((c) => c[0]);
  eq('slug 唯一', new Set(slugs).size, slugs.length);
  for (const w of WAKES) {
    if (w[1] === 'help') { eq(w[0] + ' 的卡应为空', w[5].length, 0); continue; }
    if (!GROUP_DOMAIN[w[4]]) bad('词 ' + w[0] + ' 的组不在归属表：' + w[4]);
    for (const c of w[5]) if (!cardIds.includes(c)) bad('词 ' + w[0] + ' 点名的卡不存在：' + c);
  }
  const covered = new Set(WAKES.flatMap((w) => w[5]));
  const uncovered = cardIds.filter((c) => !covered.has(c));
  if (uncovered.length) bad('无词覆盖的卡：' + uncovered.join('／'));
  return { cardIds, phrases };
}

function header(digests) {
  return ['/** #767 · 域与唤醒词资产单一源：老 48 场景／33 组名 → 仓内 typed 资产。',
    ' *',
    ' * ⚠️ 机器生成，**禁手改**：由 `packages/skill-chef/scripts/gen-chef-scenes.mjs` 产出。',
    ' *    改内容＝改生成器里的声明表（十域表／组→域归属／卡表／50 词表），再跑',
    ' *    `node packages/skill-chef/scripts/gen-chef-scenes.mjs`（`--check` 只比对不落盘）。',
    ' *',
    ' * 事实源（全程只读，老件一行不动）：',
    ' *   ① `src/help/sceneData.ts` 的 48 卡（id／组／chip）：标题与 prompt 以它为准，本件不复制；',
    ' *   ② `src/policy/wakewords.ts` 的 `WAKE_TABLE`（37 条）：路由唯一事实源，既有语义不动；',
    ' *   ③ t2 §5.1：13 条新表多出词的落位与 prompt 口径（9 复用／3 新写／1 参数）。',
    ' * 摘要锁：`WAKE_TABLE` 37 短语 sha256＝' + digests.wake,
    ' *           `sceneData.ts` 48 卡 id sha256＝' + digests.card,
    ' * 域目录中文名＝HELP 域 label；卡 slug＝卡 id（全局唯一，文件名为 `<slug>.html`，见 t767-命名.md）。',
    ' */'].join('\n');
}

function render(digests) {
  const dirOf = (domainId) => DOMAINS.find((d) => d.id === domainId).label;
  const L = [header(digests), '',
    "export interface ChefDomain { id: string; label: string; icon: string; dir: string; }",
    "export interface ChefGroup { id: string; domain: string; }",
    "export interface ChefCard { id: string; group: string; domain: string; slug: string; }",
    "export interface ChefWake { phrase: string; source: string; routable: boolean; key: string; group: string; cards: readonly string[]; promptKind: string; promptRef: string; }", ''];
  L.push('export const CHEF_DOMAINS: readonly ChefDomain[] = [');
  for (const d of DOMAINS) L.push('  { id: ' + q(d.id) + ', label: ' + q(d.label) + ', icon: ' + q(d.icon) + ', dir: ' + q(d.label) + ' },');
  L.push('];', '');
  L.push('export const CHEF_GROUPS: readonly ChefGroup[] = [');
  for (const [g, dom] of Object.entries(GROUP_DOMAIN)) L.push('  { id: ' + q(g) + ', domain: ' + q(dom) + ' },');
  L.push('];', '');
  L.push('export const CHEF_CARDS: readonly ChefCard[] = [');
  for (const [id, group] of CARDS) L.push('  { id: ' + q(id) + ', group: ' + q(group) + ', domain: ' + q(GROUP_DOMAIN[group]) + ', slug: ' + q(id) + ' },');
  L.push('];', '');
  L.push('export const CHEF_WAKES: readonly ChefWake[] = [');
  for (const w of WAKES) L.push('  { phrase: ' + q(w[0]) + ', source: ' + q(w[1]) + ', routable: ' + (w[2] ? 'true' : 'false') + ', key: ' + q(w[3]) + ', group: ' + q(w[4]) + ', cards: [' + w[5].map(q).join(', ') + '], promptKind: ' + q(w[6]) + ', promptRef: ' + q(w[7]) + ' },');
  L.push('];', '',
    '/** 卡产物相对路径：`<域中文目录>/<slug>.html`（落 `cook_html/` 下；绝对路径由驱动器按配置拼）。 */',
    'export function chefProductPath(cardId: string): string {',
    '  const c = CHEF_CARDS.find((x) => x.id === cardId);',
    '  if (!c) throw new Error(\'[chef-scenes] 未知卡：\' + cardId);',
    '  const d = CHEF_DOMAINS.find((x) => x.id === c.domain);',
    '  if (!d) throw new Error(\'[chef-scenes] 未知域：\' + c.domain);',
    '  return d.dir + \'/\' + c.slug + \'.html\';',
    '}');
  return L.join('\n') + '\n';
}

const check = process.argv.includes('--check');
const built = build();
const wakeTable = readWakeTable();
const scene = readSceneCards();
const routablePhrases = WAKES.filter((w) => w[2] === 1).map((w) => w[0]).sort();
const tablePhrases = wakeTable.map((r) => r.phrase).sort();
if (JSON.stringify(routablePhrases) !== JSON.stringify(tablePhrases)) {
  const missing = routablePhrases.filter((p) => !tablePhrases.includes(p));
  const extra = tablePhrases.filter((p) => !routablePhrases.includes(p));
  bad('WAKE_TABLE 与 50 词表可路由子集对不上：缺 ' + missing.join('／') + '；多 ' + extra.join('／'));
}
for (const w of WAKES.filter((x) => x[2] === 1)) {
  const hit = wakeTable.find((r) => r.phrase === w[0]);
  if (hit && hit.key !== w[3]) bad('词 ' + w[0] + ' 的命令对不上：表内 ' + hit.key + ' ≠ 声明 ' + w[3]);
}
eq('sceneData.ts 卡数', scene.ids.length, EXPECT.cards);
const wantIds = [...built.cardIds].sort();
if (JSON.stringify([...scene.ids].sort()) !== JSON.stringify(wantIds)) {
  bad('sceneData.ts 卡 id 与声明表对不上');
}
const digests = {
  wake: sha256(JSON.stringify(tablePhrases)),
  card: sha256(JSON.stringify([...scene.ids].sort())),
};
const locks = [['WAKE_TABLE 37 短语', digests.wake, WAKE_DIGEST], ['sceneData.ts 48 卡 id', digests.card, CARD_DIGEST]];
if (locks.some((l) => String(l[2]).startsWith('FILL_'))) {
  throw new Error('摘要锁未回填（fail-closed）：\n  ' + locks.map(([n, got]) => n + ' = ' + got).join('\n  '));
}
for (const [name, got, want] of locks) {
  if (got !== want) throw new Error('摘要锁对不上：' + name + ' 实测 ' + got + ' ≠ 锁定 ' + want);
}
const text = render(digests);
console.log('事实源：WAKE_TABLE ' + wakeTable.length + ' 条／sceneData.ts ' + scene.ids.length + ' 卡');
console.log('三层：域 ' + DOMAINS.length + '／组 ' + Object.keys(GROUP_DOMAIN).length + '／卡 ' + CARDS.length + '；词 ' + WAKES.length + '（可路由 ' + WAKES.filter((w) => w[2] === 1).length + '／不可路由 ' + WAKES.filter((w) => w[2] === 0).length + '）');
console.log('摘要锁：WAKE ' + digests.wake + '；CARD ' + digests.card);
if (check) {
  const now = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (now !== text) {
    console.error('DRIFT：' + OUT + ' 与生成结果不一致（禁手改；重跑不带 --check 即覆盖）');
    process.exit(1);
  }
  console.log('OK：chef-scenes.ts 与生成结果字节一致（' + lf(text) + ' LF；--check 不落盘）');
} else {
  const { mkdirSync } = await import('node:fs');
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, text, 'utf8');
  console.log('已写入 ' + OUT + '（' + lf(text) + ' LF）');
}
