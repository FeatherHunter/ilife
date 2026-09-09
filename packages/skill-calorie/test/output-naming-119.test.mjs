/** #119 · 动态段与后缀段复刻（M10 残项）验收测试。
 *
 * 旧版真值：`D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`
 * （`html_scene_path` 类型段）＋ `scripts/_cmd_maps.py`（动态参数中文化）＋
 * `render_food_ranking.py`／`render_weight_receipt.py`／`render_crud_receipt.py`（suffix 内容标识）。
 * 全量「键 → 期望文件名」对照表与残留见 `docs/research/t119-dynamic-suffix.md`。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/output-naming-119.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { CALORIE_COMBOS, calorieShapeFor } from '../dist/cli/keys.js';
import {
  DYNAMIC_COMMAND_SEGMENTS,
  LEGACY_COMMAND_OVERRIDES,
  OUTPUT_TYPE_LABELS,
  dynamicSegmentFor,
  resolveDefaultHtmlPath,
  sanitizeFilenamePart,
  sceneTypeFor,
  writeSuffixFor,
} from '../dist/output.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const STAMP_RE = '\\d{8}_\\d{6}';
const NOW = new Date(2026, 6, 26, 12, 30, 0);

function tmpDbDir(tag) {
  return mkdtempSync(join(tmpdir(), 't119-' + tag + '-'));
}

function runCli(dir, args) {
  return spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: dir },
  });
}

function runOk(dir, args) {
  const r = runCli(dir, args);
  assert.equal(r.status, 0, 'exit=' + r.status + ' stderr=' + String(r.stderr).slice(-400));
  return JSON.parse(String(r.stdout));
}

// ---------------------------------------------------------------- ① 类型段：写键一律 receipt，视图键不加段
test('#119 ① sceneTypeFor：35 写键一律 receipt（旧 render_*_receipt 全走 html_scene_path receipt）', () => {
  assert.deepEqual(OUTPUT_TYPE_LABELS, { process: '过程', result: '结果', receipt: '回执' });
  const keys = Object.keys(CALORIE_COMBOS);
  assert.equal(keys.length, 95);
  let receiptCount = 0;
  for (const k of keys) {
    if (calorieShapeFor(k) === 'receipt') {
      assert.equal(sceneTypeFor(k), 'receipt', k + ' 写键须加 _回执 段');
      receiptCount++;
    } else {
      assert.equal(sceneTypeFor(k), null, k + ' 视图键默认不加类型段');
    }
  }
  assert.equal(receiptCount, 35, 'receipt 形写键须为 35 个');
});

// ---------------------------------------------------------------- ② 旧命令名覆盖：ranking 食物≠食品
test('#119 ② ranking 旧命令名覆盖：title 食品排行 → 落盘食物排行（旧 render_food_ranking.py）', () => {
  assert.equal(CALORIE_COMBOS['calorie.view.ranking'].title, '食品排行');
  assert.equal(LEGACY_COMMAND_OVERRIDES['calorie.view.ranking'], '食物排行');
  const dir = tmpDbDir('override');
  const p = resolveDefaultHtmlPath('calorie.view.ranking', { now: NOW, dbDir: dir, params: { category: 'high_calorie' } });
  assert.equal(basename(p), '食物排行_高热量_20260726_123000.html');
});

// ---------------------------------------------------------------- ③ 动态段：ranking 五榜＋全榜同秒可区分
test('#119 ③ ranking 动态段全表（旧 FOOD_RANKING_CATEGORY_MAP）：六名互异，不靠 _2 区分语义', () => {
  assert.deepEqual(DYNAMIC_COMMAND_SEGMENTS['calorie.view.ranking'], {
    high_calorie: '高热量', low_calorie: '低热量', frequent: '常吃', high_carb: '高碳水', high_protein: '高蛋白', all: '全部',
  });
  const dir = tmpDbDir('ranking-segs');
  const names = new Set();
  for (const [cat, zh] of Object.entries({ high_calorie: '高热量', low_calorie: '低热量', frequent: '常吃', high_carb: '高碳水', high_protein: '高蛋白' })) {
    assert.equal(dynamicSegmentFor('calorie.view.ranking', { category: cat }), zh);
    const p = resolveDefaultHtmlPath('calorie.view.ranking', { now: NOW, dbDir: dir, params: { category: cat } });
    assert.equal(basename(p), '食物排行_' + zh + '_20260726_123000.html');
    names.add(basename(p));
  }
  // 缺省（全榜）→ 全部
  assert.equal(dynamicSegmentFor('calorie.view.ranking', {}), '全部');
  const all = basename(resolveDefaultHtmlPath('calorie.view.ranking', { now: NOW, dbDir: dir, params: {} }));
  assert.equal(all, '食物排行_全部_20260726_123000.html');
  names.add(all);
  assert.equal(names.size, 6, '五榜＋全榜同秒六名互异');
  for (const n of names) assert.doesNotMatch(n, /_2\.html$/, '语义区分不得靠 _N 兜底：' + n);
  // 未知 category → 不加段（不断言崩溃）
  assert.equal(dynamicSegmentFor('calorie.view.ranking', { category: 'nope' }), '');
  assert.equal(basename(resolveDefaultHtmlPath('calorie.view.ranking', { now: NOW, dbDir: dir, params: { category: 'nope' } })), '食物排行_20260726_123000.html');
});

// ---------------------------------------------------------------- ④ 动态段：contraindication 部位
test('#119 ④ contraindication 动态段（旧 CONTRAINDICATION_PART_MAP）：部位可区分，缺省全部', () => {
  assert.deepEqual(DYNAMIC_COMMAND_SEGMENTS['calorie.view.contraindication'], { 腰: '腰', 膝: '膝', 肩: '肩', all: '全部' });
  const dir = tmpDbDir('contra-segs');
  assert.equal(basename(resolveDefaultHtmlPath('calorie.view.contraindication', { now: NOW, dbDir: dir, params: { part: '腰' } })), '禁忌扫描_腰_20260726_123000.html');
  assert.equal(basename(resolveDefaultHtmlPath('calorie.view.contraindication', { now: NOW, dbDir: dir, params: {} })), '禁忌扫描_全部_20260726_123000.html');
  assert.equal(basename(resolveDefaultHtmlPath('calorie.view.contraindication', { now: NOW, dbDir: dir, params: { part: 'all' } })), '禁忌扫描_全部_20260726_123000.html');
});

// ---------------------------------------------------------------- ⑤ suffix：逐键 params 派生（旧 #49/#266/#284/#286）
test('#119 ⑤ writeSuffixFor：内容标识纯 params 派生（旧 suffix 口径）', () => {
  assert.equal(writeSuffixFor('calorie.diet.add', { foodName: '香蕉', calories: 100, protein: 1 }), '香蕉');
  assert.equal(writeSuffixFor('calorie.diet.add', { food_name: '香蕉' }), '香蕉');
  assert.equal(writeSuffixFor('calorie.diet.update', { foodName: '苹果' }), '苹果');
  assert.equal(writeSuffixFor('calorie.diet.batch', { items: [{ food_name: '米饭' }, { food_name: '面' }, { food_name: '粥' }] }), '米饭等3项');
  assert.equal(writeSuffixFor('calorie.diet.batch', { items: [{ foodName: '米饭' }] }), '米饭');
  assert.equal(writeSuffixFor('calorie.diet.copy', { from: '2026-08-10' }), '20260810');
  assert.equal(writeSuffixFor('calorie.diet.update-by-date', { date: '2026-08-10' }), '20260810');
  assert.equal(writeSuffixFor('calorie.diet.remove-by-date', { date: '2026-08-10' }), '20260810');
  assert.equal(writeSuffixFor('calorie.diet.remove-by-range', { start: '2026-08-01', end: '2026-08-10' }), '20260801至20260810');
  assert.equal(writeSuffixFor('calorie.diet.remove-by-type', { date: '2026-08-10', mealType: '早餐' }), '20260810早餐');
  assert.equal(writeSuffixFor('calorie.water.log', { ml: 500 }), '500ml');
  assert.equal(writeSuffixFor('calorie.weight.log', { kg: 68 }), '68kg', 'format g 去尾零：68.0→68');
  assert.equal(writeSuffixFor('calorie.weight.log', { kg: 70.5 }), '70.5kg');
  assert.equal(writeSuffixFor('calorie.weight.update', { date: '2026-08-10' }), '20260810');
  assert.equal(writeSuffixFor('calorie.weight.remove', { date: '2026-08-10' }), '20260810');
  assert.equal(writeSuffixFor('calorie.weight.remove', { start: '2026-08-01', end: '2026-08-10' }), '20260801至20260810');
  assert.equal(writeSuffixFor('calorie.weight.batch', { items: [{ kg: 70.5 }, { kg: 70 }] }), '70.5kg等2项');
  assert.equal(writeSuffixFor('calorie.exercise.add', { type: '跑步', calories: 100 }), '跑步');
  assert.equal(writeSuffixFor('calorie.exercise.add', { items: [{ type: '跑步' }, { type: '游泳' }] }), '跑步等2项');
  assert.equal(writeSuffixFor('calorie.exercise.update', { date: '2026-08-10' }), '20260810');
  assert.equal(writeSuffixFor('calorie.exercise.remove', { from: '2026-08-01', to: '2026-08-10' }), '20260801至20260810');
  assert.equal(writeSuffixFor('calorie.photo.add', { tag: '腹肌' }), '腹肌');
  assert.equal(writeSuffixFor('calorie.photo.tag', { op: 'set', tags: ['腹肌', '背'] }), '腹肌、背');
  assert.equal(writeSuffixFor('calorie.product.add', { productName: '香蕉' }), '香蕉');
  assert.equal(writeSuffixFor('calorie.photo.gif', { tag: '腹肌' }), '腹肌');
  // 残留：需写后回执/id 读库的键返回 ''（不断言崩溃，见 t119 对照表）
  for (const [k, p] of [
    ['calorie.diet.remove', { id: 1 }], ['calorie.product.update', { id: 1, note: 'x' }],
    ['calorie.product.deprecate', { id: 1 }], ['calorie.photo.remove', { id: 1 }],
    ['calorie.weight.remove', { id: 1 }], ['calorie.body.composition-remove', { id: 1 }],
    ['calorie.profile.set', { age: 30 }], ['calorie.goal.set', { calorie: 1800, protein: 1, carbs: 1, fat: 1 }],
    ['calorie.view.home', {}], ['calorie.help.lookup', { q: 'x' }],
  ]) {
    assert.equal(writeSuffixFor(k, p), '', k + ' 须返回空后缀');
  }
});

// ---------------------------------------------------------------- ⑥ 段拼接＋清洗截断（含 emoji 边界）
test('#119 ⑥ 段拼接：title_回执_内容_<TS>，suffix 走 sanitize（非法字符→_、按码点截 32）', () => {
  const dir = tmpDbDir('segs-join');
  assert.equal(
    basename(resolveDefaultHtmlPath('calorie.diet.add', { now: NOW, dbDir: dir, params: { foodName: '香蕉' }, suffix: writeSuffixFor('calorie.diet.add', { foodName: '香蕉' }) })),
    '记一餐_回执_香蕉_20260726_123000.html',
  );
  assert.equal(
    basename(resolveDefaultHtmlPath('calorie.weight.log', { now: NOW, dbDir: dir, params: { kg: 68 }, suffix: writeSuffixFor('calorie.weight.log', { kg: 68 }) })),
    '记体重_回执_68kg_20260726_123000.html',
  );
  // 无内容标识的写键：记喝水 ml=500 → 记喝水_回执_500ml_<TS>
  assert.equal(
    basename(resolveDefaultHtmlPath('calorie.water.log', { now: NOW, dbDir: dir, params: { ml: 500 }, suffix: '500ml' })),
    '记喝水_回执_500ml_20260726_123000.html',
  );
  // emoji 长后缀：按码点截 32，落盘名与回传名逐字节一致
  const rawSuffix = '😀'.repeat(40);
  const p = resolveDefaultHtmlPath('calorie.diet.add', { now: NOW, dbDir: dir, params: {}, suffix: rawSuffix });
  const name = basename(p);
  assert.equal(name, '记一餐_回执_' + '😀'.repeat(32) + '_20260726_123000.html');
  writeFileSync(p, '<html>e</html>', 'utf8');
  const onDisk = readdirSync(dirname(p));
  assert.equal(onDisk.length, 1);
  assert.ok(Buffer.from(onDisk[0], 'utf8').equals(Buffer.from(name, 'utf8')), '磁盘目录项 = 回传名（逐字节）');
  // 非法字符后缀被清洗（/ → _），不穿越目录
  const evil = basename(resolveDefaultHtmlPath('calorie.diet.add', { now: NOW, dbDir: dir, params: {}, suffix: 'a/b:c' }));
  assert.equal(evil, '记一餐_回执_a_b_c_20260726_123000.html');
  assert.equal(dirname(resolveDefaultHtmlPath('calorie.diet.add', { now: NOW, dbDir: dir, params: {}, suffix: 'a/b:c' })), join(dir, 'calorie_html'));
});

// ---------------------------------------------------------------- ⑦ CLI 端到端：同秒六榜单可区分＋回传逐字节一致
test('#119 ⑦ CLI 同秒六榜单：五榜＋全榜同秒落盘六名互异（无 _N），data.output 与盘上名逐字节一致', async () => {
  const dir = tmpDbDir('cli-ranking');
  const { openDb } = await import('../dist/index.js');
  const d = openDb(join(dir, 'calorie_data.db'));
  const dd = (ago) => {
    const t = new Date(Date.now() - ago * 86400000);
    const p2 = (n) => String(n).padStart(2, '0');
    return t.getFullYear() + '-' + p2(t.getMonth() + 1) + '-' + p2(t.getDate());
  };
  const seed = [
    ['肥肠面', 1000, 30, 100, 60], ['米饭', 300, 6, 65, 1], ['米饭', 300, 6, 65, 1],
    ['米饭', 300, 6, 65, 1], ['鸡胸', 200, 40, 0, 5], ['黄瓜', 30, 1, 5, 0], ['香蕉', 100, 1, 25, 0],
  ];
  for (let i = 0; i < seed.length; i++) {
    d.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, 100, ?, ?, ?, ?)').run(dd(i % 3), '12:00:00', seed[i][0], seed[i][1], seed[i][2], seed[i][3], seed[i][4]);
  }
  d.close();
  const range = JSON.stringify({ start: dd(2), end: dd(0), topN: 5 });
  const names = new Set();
  for (const cat of ['high_calorie', 'low_calorie', 'frequent', 'high_carb', 'high_protein']) {
    const env = runOk(dir, ['calorie.view.ranking', '--params', JSON.stringify({ start: dd(2), end: dd(0), topN: 5, category: cat })]);
    void range;
    const n = basename(env.data.output);
    assert.match(n, new RegExp('^食物排行_.+_' + STAMP_RE + '\\.html$'), '实际落点：' + n);
    assert.doesNotMatch(n, /_2\.html$/, '同秒语义区分不得靠 _N：' + n);
    assert.ok(existsSync(env.data.output), '回传路径必须真实存在');
    names.add(n);
  }
  const envAll = runOk(dir, ['calorie.view.ranking', '--params', JSON.stringify({ start: dd(2), end: dd(0), topN: 5 })]);
  names.add(basename(envAll.data.output));
  assert.equal(names.size, 6, '五榜＋全榜同秒六名互异：' + [...names].join(' / '));
  // 回传路径与磁盘目录项逐字节一致（含中文段）
  const disk = readdirSync(join(dir, 'calorie_html'));
  for (const n of names) {
    assert.ok(disk.some((e) => Buffer.from(e, 'utf8').equals(Buffer.from(n, 'utf8'))), '盘上有逐字节一致的条目：' + n);
  }
});

// ---------------------------------------------------------------- ⑧ CLI 端到端：写键回执＋后缀＋回传一致
test('#119 ⑧ CLI 写键：记体重落 记体重_回执_68kg_<TS>.html，data.output 与盘上名逐字节一致', () => {
  const dir = tmpDbDir('cli-weight');
  const env = runOk(dir, ['calorie.weight.log', '--params', JSON.stringify({ kg: 68 })]);
  assert.equal(env.shape, 'receipt');
  const n = basename(env.data.output);
  assert.match(n, new RegExp('^记体重_回执_68kg_' + STAMP_RE + '\\.html$'), '实际落点：' + n);
  assert.ok(existsSync(env.data.output));
  const disk = readdirSync(join(dir, 'calorie_html'));
  assert.ok(disk.some((e) => Buffer.from(e, 'utf8').equals(Buffer.from(n, 'utf8'))), '逐字节一致');
  assert.ok(readFileSync(env.data.output, 'utf8').includes('记体重'), '产物为回执 HTML');
  // --output 显式覆盖不受命名管线影响
  const explicit = join(dir, '自定义', '报告.html');
  const env2 = runOk(dir, ['calorie.diet.add', '--params', JSON.stringify({ foodName: '香蕉', calories: 100, protein: 5 }), '--output', explicit]);
  assert.equal(env2.data.output, explicit);
  assert.ok(existsSync(explicit));
});

// ---------------------------------------------------------------- ⑨ 旧 unstable：sanitize 恒等（title 天然安全，段拼接不引入非法字符）
test('#119 ⑨ 段拼接产物天然文件名安全（无非法/ glob 元字符）', () => {
  const dir = tmpDbDir('safe');
  const cases = [
    ['calorie.view.ranking', { category: 'high_calorie' }],
    ['calorie.view.contraindication', { part: '腰' }],
    ['calorie.diet.add', { foodName: '香蕉' }],
    ['calorie.weight.log', { kg: 68 }],
    ['calorie.photo.tag', { op: 'set', tags: ['a', 'b'] }],
  ];
  for (const [k, params] of cases) {
    const n = basename(resolveDefaultHtmlPath(k, { now: NOW, dbDir: dir, params, suffix: writeSuffixFor(k, params) }));
    assert.equal(sanitizeFilenamePart(n.replace(/\.html$/, '')), n.replace(/\.html$/, ''), k + ' 拼接名须清洗恒等：' + n);
    assert.doesNotMatch(n, /[\\/:*?"<>|[\]]/, k + ' 不得含非法字符：' + n);
  }
});
