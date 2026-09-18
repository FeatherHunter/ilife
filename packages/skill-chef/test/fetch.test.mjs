import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChefDb, closeChefDb, addRecipe, updateRecipe, filterRecipes, addIngredient, addStep, listRecipes, searchRecipes, getRecipeDetail, deprecateRecipe, recordHistory, queryHistory, historyStats, buildShoppingList, healthCheck, ChefFetchError } from '../dist/index.js';
import { resolveDbDir, resolveDbPath } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));

let CFG = '';
let DB = '';
let H = null;
let gongbaoId = '';
let mapoId = '';

before(() => {
  // #695：配置走配置文件——隔离目录＝配置目录，数据目录＝它下面的 `data/`。
  CFG = mkdtempSync(join(tmpdir(), 'cheffetch-'));
  DB = join(CFG, 'data');
  process.env.ILIFE_CONFIG_DIR = CFG;
  H = openChefDb(resolveDbPath());
  const g = addRecipe(H, { name: '宫保虾球', difficulty: '中等', status: '未做', servings: 2, total_time_minutes: 25, description: '酸甜微辣' });
  gongbaoId = g.id;
  addIngredient(H, gongbaoId, { name: '虾仁', category: '海鲜', quantity: 300, unit: '克', quantity_text: '300克' });
  addIngredient(H, gongbaoId, { name: '花生米', category: '其他', quantity: 50, unit: '克', quantity_text: '50克' });
  addStep(H, gongbaoId, { action: '虾仁上浆滑油', heat_level: '大火', duration_minutes: 3 });
  addStep(H, gongbaoId, { action: '回锅收汁', heat_level: '中火', duration_minutes: 5 });
  const m = addRecipe(H, { name: '麻婆豆腐', difficulty: '简单', status: '未做', servings: 2, total_time_minutes: 15, description: '麻辣嫩滑' });
  mapoId = m.id;
  addIngredient(H, mapoId, { name: '嫩豆腐', category: '豆制品', quantity: 400, unit: '克', quantity_text: '400克' });
  addIngredient(H, mapoId, { name: '虾仁', category: '海鲜', quantity: 100, unit: '克', quantity_text: '100克' });
  addStep(H, mapoId, { action: '豆腐焯水', heat_level: '中火', duration_minutes: 2 });
});

describe('私家大厨取数 fetch', () => {
  it('list/search/filter + 废弃过滤', () => {
    assert.equal(listRecipes(H).length, 2);
    assert.equal(searchRecipes(H, '虾球').length, 1);
    assert.equal(searchRecipes(H, '虾球')[0].name, '宫保虾球');
    assert.equal(listRecipes(H, { difficulty: '简单' }).length, 1);
    const d = getRecipeDetail(H, gongbaoId);
    assert.equal(d.recipe.name, '宫保虾球');
    assert.equal(d.ingredients.length, 2);
    assert.equal(d.steps.length, 2);
    deprecateRecipe(H, mapoId);
    assert.equal(listRecipes(H).length, 1);
    assert.equal(listRecipes(H, { includeDeprecated: true }).length, 2);
  });
  it('空查询抛，不返空冒充', () => {
    assert.throws(() => searchRecipes(H, '  '), /关键词|空查询/);
    assert.throws(() => searchRecipes(H, ''), /关键词|空查询/);
    assert.throws(() => getRecipeDetail(H, '不存在的菜名xxx'), (e) => e instanceof ChefFetchError);
  });
  it('历史统计闭环', () => {
    recordHistory(H, { recipe_id: gongbaoId, rating: 5, feedback: '很香' });
    recordHistory(H, { recipe_id: gongbaoId, rating: 4, feedback: '稍咸' });
    const rows = queryHistory(H, gongbaoId);
    assert.equal(rows.length, 2);
    const st = historyStats(H, gongbaoId);
    assert.equal(st.count, 2);
    assert.equal(st.avgRating, 4.5);
  });
  it('采购合并：同食材跨菜累加', () => {
    const list = buildShoppingList(H, ['宫保虾球', '麻婆豆腐']);
    const shrimp = list.find((x) => x.name === '虾仁');
    assert.ok(shrimp);
    assert.equal(shrimp.quantity, 400);
    assert.ok(shrimp.recipes.includes('宫保虾球'));
  });
  it('体检排序：缺口/风险有序', () => {
    const issues = healthCheck(H);
    assert.ok(Array.isArray(issues));
    const levels = issues.map((x) => x.level);
    assert.deepEqual([...levels].sort(), levels);
  });
  it('filter 多维筛选 + update 闭环', () => {
    // update：改份数与描述，读回验证。
    const u = updateRecipe(H, gongbaoId, { servings: 4, description: '改后酸甜' });
    assert.equal(u.servings, 4);
    assert.equal(u.description, '改后酸甜');
    assert.equal(getRecipeDetail(H, gongbaoId).recipe.servings, 4);
    assert.throws(() => updateRecipe(H, gongbaoId, {}), /至少改一个字段/);
    // filter 维度落子表（addRecipe 一期只写主表，维度经子表直插，只读不迁真相）。
    H.db.prepare('INSERT INTO recipe_categories (id, recipe_id, cuisine_type) VALUES (?, ?, ?)').run('fc1', gongbaoId, '川菜');
    H.db.prepare('INSERT INTO recipe_seasons (id, recipe_id, season) VALUES (?, ?, ?)').run('fs1', gongbaoId, '夏季');
    H.db.prepare('INSERT INTO recipe_cooking_methods (id, recipe_id, method) VALUES (?, ?, ?)').run('fm1', gongbaoId, '炒');
    H.db.prepare('INSERT INTO recipe_flavors (id, recipe_id, flavor) VALUES (?, ?, ?)').run('ff1', gongbaoId, '麻辣');
    H.db.prepare('INSERT INTO recipe_diet_tags (id, recipe_id, tag) VALUES (?, ?, ?)').run('ft1', gongbaoId, '高蛋白');
    H.db.prepare('INSERT INTO recipe_meal_types (id, recipe_id, meal_type) VALUES (?, ?, ?)').run('fe1', gongbaoId, '晚餐');
    H.db.prepare('INSERT INTO cookware (id, recipe_id, name) VALUES (?, ?, ?)').run('fw1', gongbaoId, '炒锅');
    assert.ok(filterRecipes(H, { cuisine: '川菜' }).some((r) => r.name === '宫保虾球'));
    assert.ok(filterRecipes(H, { season: '夏季' }).some((r) => r.name === '宫保虾球'));
    assert.ok(filterRecipes(H, { method: '炒' }).some((r) => r.name === '宫保虾球'));
    assert.ok(filterRecipes(H, { flavor: '麻辣' }).some((r) => r.name === '宫保虾球'));
    assert.ok(filterRecipes(H, { tag: '高蛋白' }).some((r) => r.name === '宫保虾球'));
    assert.ok(filterRecipes(H, { meal: '晚餐' }).some((r) => r.name === '宫保虾球'));
    assert.ok(filterRecipes(H, { cookware: '炒锅' }).some((r) => r.name === '宫保虾球'));
    assert.ok(filterRecipes(H, { difficulty: '中等' }).some((r) => r.name === '宫保虾球'));
    assert.ok(filterRecipes(H, { maxTime: 30 }).some((r) => r.name === '宫保虾球'));
    assert.equal(filterRecipes(H, { maxTime: 10 }).filter((r) => r.name === '宫保虾球').length, 0);
    assert.ok(filterRecipes(H, { cuisine: '川菜', difficulty: '中等' }).some((r) => r.name === '宫保虾球'));
    assert.equal(filterRecipes(H, { cuisine: '粤菜' }).length, 0);
  });
  it('配置件的默认值逐项等于改造前的代码常量；库目录由配置给', () => {
    // 改造前的代码常量：库名 `chef_data.db`、落点子目录 `cook_html/help`、两个产物主体名。
    // 默认配置下数据目录＝<配置目录>/data，库文件就叫 chef_data.db。
    assert.equal(resolveDbDir(), DB);
    assert.equal(resolveDbPath(), join(DB, 'chef_data.db'));
  });
  it('测试缺隔离即响亮失败（没设 ILIFE_CONFIG_DIR 的测试进程不许读配置）', () => {
    // 本进程的配置已经读过（before 那次，进程内有缓存），故用**子进程**验护栏：
    // 清掉 ILIFE_CONFIG_DIR 且带测试上下文时，现读配置必须响亮失败，不许静默落到真实家目录。
    // 整条链的读数见同包 `test/config-695.test.mjs`。
    const r = spawnSync(process.execPath, ['-e',
      "import('./dist/index.js').then((m)=>{try{m.resolveDbPath();process.exit(0);}catch(e){console.error(String(e.message));process.exit(9);}})",
    ], {
      cwd: join(HERE, '..'), encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: '', NODE_TEST_CONTEXT: '1' },
    });
    assert.equal(r.status, 9, '缺 ILIFE_CONFIG_DIR 的测试进程读配置必须抛：' + String(r.stdout));
    assert.match(String(r.stderr), /ILIFE_CONFIG_DIR/);
  });
});
