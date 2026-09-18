/** #632 · D4 榜单餐均列单位去重（值去单位：`卡/餐` → `卡`，列名 `餐均` 不动）。
 *
 * 守什么（票面终审 D4）：
 *  ① 有 `餐均` 列的三类单榜页（高热量／低热量／常吃）产物无 `卡/餐`；
 *  ② 全榜页产物无 `卡/餐`（折叠明细与单榜同源 `rowOf`）；
 *  ③ 390 档卡片态同式：卡片由 `td data-label="餐均"` ＋ 值同源渲染，断言该格值无 `卡/餐`；
 *  ④ `reviewDocs.ts:160` 同形只复核不改：复盘页高频 TOP5 `餐均` 列值无 `卡/餐`（不断言改动）；
 *  ⑤ 变异自证：把值改回 `卡/餐`，同一段断言必红。
 *
 * 跑法：先持锁编译，再 `node --test packages/skill-calorie/test/t632-avg-unit.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const D = SEED_TODAY;

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't632-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  return dir;
}

function renderOk(dir, key, params, what) {
  const out = join(dir, 'out-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir), ...freezeClock(D) },
  });
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + String(r.stderr).slice(-300));
  return readFileSync(out, 'utf8');
}

/** 餐均格：桌面表 `<td … data-label="餐均">值</td>`；390 卡片由同一格 `td::before{content:attr(data-label)}` 出标签。 */
const avgCellsOf = (html) => [...html.matchAll(/<td[^>]*data-label="餐均"[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]);
const thsOf = (html) => [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);

const AVG_CATS = [
  { id: '高热量榜', params: { category: 'high_calorie', topN: 10, window: '7d' } },
  { id: '低热量榜', params: { category: 'low_calorie', topN: 10, window: '7d' } },
  { id: '常吃榜', params: { category: 'frequent', topN: 10, window: '7d' } },
];

for (const c of AVG_CATS) {
  test('#632 单榜页餐均无“卡/餐”重复（桌面表＋390 卡片同源）—— ' + c.id, () => {
    const html = renderOk(freshDb(), 'calorie.view.ranking', c.params, c.id);
    assert.ok(thsOf(html).includes('餐均'), c.id + ' 表头缺“餐均”列');
    const cells = avgCellsOf(html);
    assert.ok(cells.length > 0, c.id + ' 没找到 data-label="餐均" 的格');
    for (const v of cells) assert.ok(!v.includes('卡/餐'), c.id + ' 餐均格仍带重复单位：' + v);
    assert.ok(cells.some((v) => /^\d+ 卡$/.test(v.trim())), c.id + ' 餐均格不是“<数> 卡”形：' + cells.join('｜'));
    assert.ok(!html.includes('卡/餐'), c.id + ' 页内还有“卡/餐”残留');
  });
}

test('#632 全榜页餐均无“卡/餐”重复', () => {
  const html = renderOk(freshDb(), 'calorie.view.ranking', { topN: 10, window: '7d' }, '看全部排行榜');
  const cells = avgCellsOf(html);
  assert.ok(cells.length > 0, '全榜页没找到 data-label="餐均" 的格');
  for (const v of cells) assert.ok(!v.includes('卡/餐'), '全榜页餐均格仍带重复单位：' + v);
  assert.ok(!html.includes('卡/餐'), '全榜页内还有“卡/餐”残留');
});

test('#632 只复核不改：复盘页高频 TOP5 餐均列同形无重复', () => {
  const html = renderOk(freshDb(), 'calorie.view.diet-review', { window: '7d' }, '饮食复盘');
  assert.ok(thsOf(html).includes('餐均'), '复盘页表头缺“餐均”列');
  for (const v of avgCellsOf(html)) assert.ok(!v.includes('卡/餐'), '复盘页餐均格带重复单位：' + v);
});

test('#632 变异自证：值改回“卡/餐”，同一段断言必红', () => {
  const html = renderOk(freshDb(), 'calorie.view.ranking', AVG_CATS[0].params, '高热量榜');
  const cells = avgCellsOf(html);
  assert.ok(cells.length > 0, '原样产物没有餐均格');
  const broken = html.replace(
    /(<td[^>]*data-label="餐均"[^>]*>)(\d+ 卡)(<\/td>)/,
    (_, a, b, c2) => a + b.replace(' 卡', ' 卡/餐') + c2,
  );
  assert.notEqual(broken, html, '变异点没命中（餐均格“<数> 卡”没找到）');
  assert.ok(avgCellsOf(broken).some((v) => v.includes('卡/餐')), '改坏之后断言没变红——本探针是永真的');
});
