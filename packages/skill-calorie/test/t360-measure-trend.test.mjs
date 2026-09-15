/** #360 · 看围度趋势不带部位也出趋势（自动挑最近有数据部位）＋ 五项 KPI 与图同批定。
 *
 * 期望值来源＝**手算**（t169 口径①，不拿新实现自己的输出当期望）：
 *   冻结种子（相对日，防墙钟滑出 90 天窗；t359 同款 `dayBefore` 手法）——
 *     D4 ＝ 4 天前：`chest_cm=95`（固定首项只有旧数据）；
 *     D3 ＝ 3 天前：`chest_cm=94, waist_cm=80`；
 *     D2 ＝ 2 天前：`waist_cm=79`；
 *     D1 ＝ 1 天前：`waist_cm=78`（最新一条只有腰围）。
 *   手算：
 *     最近有数据部位＝`waist_cm`（最新非空 D1＞胸围最新 D3；固定首项 `chest_cm` 是旧口径，见负向）；
 *     腰围趋势序列（按日 ASC）＝ [80, 79, 78] ⇒ N＝3；
 *     五项 KPI：点数 3 ／ 均值 (80+79+78)/3＝79 ／ 最小 78 ／ 最大 80 ／ 变化量 78-80＝-2；
 *     最新＝78；胸围趋势点数＝2（负向改回固定首项时会读到 2＋「胸围趋势」，本件断言 3＋「腰围趋势」即红）。
 * 负向对照（源码级变异，持锁另做，机器读数见证据）：
 *   把 `latestMeasurementMetric` 改回固定首项（`return MEASUREMENT_FIELDS[0]`）→ 本件「腰围趋势」／「趋势点 3」必红；
 *   还原 → 本件必绿。
 * 运行：先 `npx tsc -b packages/skill-calorie`（本票不走 `pnpm --filter skill-calorie build`，
 *   那条会重注入他席 SKILL.md），再 `node --test packages/skill-calorie/test/t360-measure-trend.test.mjs`。
 * 真库零写入：一切数据走 mkdtemp tmp 库（`SKILLS_DB_PATH` 指过去）， shapes 与 t359 同。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { buildBodyMeasureView } from '../dist/body/bodyPlate.js';
import { latestMeasurementMetric } from '../dist/fetch/body.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'calorie.view.body-measure';
const DB_FILE = 'calorie_data.db';

const DAY_MS = 86400000;

/** 相对日：围度缺省窗口近 90 天，绝对日会随墙钟滑出窗口（日期腐坏），故取「近 N 天」。 */
function dayBefore(n) {
  return new Date(Date.now() - n * DAY_MS).toISOString().slice(0, 10);
}

/** 冻结种子（手算 N＝3 的唯一依据；行由早到晚，最后一条＝最新）。 */
function seedRows() {
  return [
    { n: 4, chest_cm: 95, waist_cm: null, note: 'd4' },
    { n: 3, chest_cm: 94, waist_cm: 80, note: 'd3' },
    { n: 2, chest_cm: null, waist_cm: 79, note: '' },
    { n: 1, chest_cm: null, waist_cm: 78, note: 'd1' },
  ];
}

/** 手算期望（t169 来源①；测试只认这组数，不认新输出）。 */
const EXPECT = {
  picked: 'waist_cm',
  pickedZh: '腰围',
  fixedFirst: 'chest_cm',
  fixedFirstZh: '胸围',
  n: 3,
  avg: 79,
  min: 78,
  max: 80,
  delta: -2,
  latest: 78,
  fixedFirstN: 2,
};

function mkTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 't360-'));
  const db = openDb(join(dir, DB_FILE));
  const stmt = db.prepare('INSERT INTO body_measurements (date, chest_cm, waist_cm, note) VALUES (?, ?, ?, ?)');
  for (const r of seedRows()) stmt.run(dayBefore(r.n), r.chest_cm, r.waist_cm, r.note);
  db.close();
  return dir;
}

function mkEmptyDb() {
  const dir = mkdtempSync(join(tmpdir(), 't360-empty-'));
  openDb(join(dir, DB_FILE)).close();
  return dir;
}

/** 路由示例（不带部位）：`calorie.view.body-measure --params '{"days":90}'`（路由 order 245「看围度趋势」）。 */
function readAutoPage(dir) {
  const r = spawnSync(NODE_BIN, [BIN, KEY, '--params', '{"days":90}'], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  assert.equal(r.status, 0, '路由示例 exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(-400));
  return JSON.parse(r.stdout);
}

function readWithParams(dir, params) {
  return spawnSync(NODE_BIN, [BIN, KEY, '--params', JSON.stringify(params)], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
}

/** 可见文本：剥掉 script／style 与标签（判据只看用户能看见的字）。 */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
}

/** 取 caption 含 `needle` 的那张数据表，按行解析单元格（含表头行）。 */
function tableRows(html, needle) {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const hit = tables.find((t) => {
    const cap = /<caption[^>]*>([\s\S]*?)<\/caption>/.exec(t);
    return cap !== null && cap[1].includes(needle);
  });
  assert.ok(hit, '整页缺「' + needle + '」那张表');
  return [...hit.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((tr) => [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => c[1].replace(/\s+/g, ' ').trim()));
}

/** 同一 tmp 库的 sqlite 期望：窗口内所选部位按日聚合的点数（与 `trendMeasurement` 同 GROUP BY 口径）。 */
function sqliteTrendCount(dir, metric) {
  const cutoff = dayBefore(90);
  const db = openDb(join(dir, DB_FILE));
  const row = db.prepare(
    'SELECT COUNT(*) AS c FROM (SELECT date FROM body_measurements'
    + ' WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ? AND ' + metric + ' IS NOT NULL GROUP BY date)',
  ).get(cutoff);
  db.close();
  return row.c;
}

test('#360 自动挑部位：不带部位跑出的是最近有数据部位（腰围），不是固定首项（胸围）', () => {
  const dir = mkTmpDb();
  const db = openDb(join(dir, DB_FILE));
  const picked = latestMeasurementMetric(db, { days: 90 });
  db.close();
  assert.equal(picked, EXPECT.picked, '自动挑部位应为 waist_cm（固定首项 chest_cm 是旧口径）');
  const env = readAutoPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const text = visibleText(html);
  assert.ok(text.includes(EXPECT.pickedZh + '趋势'), '可见文本缺「腰围趋势」（裁定 4 读数①）');
  assert.ok(!text.includes(EXPECT.fixedFirstZh + '趋势'), '不应出现固定首项的「胸围趋势」');
});

test('#360 路由示例 exit 0 ＋ 图区非空（有 svg、无空态句）', () => {
  const dir = mkTmpDb();
  const env = readAutoPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  assert.ok(html.includes('<svg'), '图区应有自绘 svg（裁定 4 读数②：图区不是空态）');
  assert.ok(!html.includes('data-chart-empty'), '图区不应是空态联动');
  assert.ok(!visibleText(html).includes('该部位暂无趋势数据'), '有数据时不应出现空态句');
});

test('#360 恰 N 个趋势点：KPI 趋势点 == sqlite 按日聚合计数 == 手算 3', () => {
  const dir = mkTmpDb();
  const env = readAutoPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const text = visibleText(html);
  assert.match(text, /趋势点\s*3\s*个/, 'KPI「趋势点」读数应为 3 个（裁定 4 读数③；#535 起「3 天」改「3 个」，手算仍是 3）');
  const n = sqliteTrendCount(dir, EXPECT.picked);
  assert.equal(n, EXPECT.n, 'sqlite 窗口内腰围按日聚合点数应为手算 3');
  const db = openDb(join(dir, DB_FILE));
  const v = buildBodyMeasureView(db, { days: 90 });
  db.close();
  assert.equal(v.autoMetric, EXPECT.picked);
  assert.equal(v.trend.length, EXPECT.n, 'plate 趋势点数应为手算 3');
  assert.equal(v.kpi.count, n, 'KPI 点数应等于所选部位 sqlite 计数（KPI 与图同批定）');
  console.log('T360-READOUT N=' + v.trend.length + ' sqlite=' + n + ' 部位=' + v.autoMetric);
});

test('#360 五项 KPI 与手算逐值相同（点数/均值/最小/最大/变化量）', () => {
  const dir = mkTmpDb();
  const env = readAutoPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const text = visibleText(html);
  assert.match(text, /趋势点\s*3\s*个/, '点数（#535 起「3 天」改「3 个」）');
  assert.match(text, /均值\s*79\s*cm/, '均值 (80+79+78)/3=79');
  assert.match(text, /最小\s*78\s*cm/, '最小 78');
  assert.match(text, /最大\s*80\s*cm/, '最大 80');
  assert.match(text, /变化量\s*-2\s*cm/, '变化量 78-80=-2');
  assert.match(text, /最新\s*78\s*cm/, '最新 78');
  const db = openDb(join(dir, DB_FILE));
  const v = buildBodyMeasureView(db, { days: 90 });
  db.close();
  assert.deepEqual(
    [v.kpi.count, v.kpi.avg, v.kpi.min, v.kpi.max, v.kpi.delta],
    [EXPECT.n, EXPECT.avg, EXPECT.min, EXPECT.max, EXPECT.delta],
    'plate 五项 KPI 应与手算逐值相同（KPI 与图同一来源 `measureTrendKpi(trend)`）',
  );
  assert.deepEqual(v.trend.map((t) => t.avgVal), [80, 79, 78], '趋势序列应为手算 [80,79,78]');
});

test('#360 裁定 2 表体：缺值格可见「—」，且无连续空单元', () => {
  const dir = mkTmpDb();
  const env = readAutoPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const rows = tableRows(html, '围度记录');
  const body = rows.slice(1);
  assert.ok(body.length >= 4, '全量表应有 4 行');
  const d4 = body.find((r) => r[0] === dayBefore(4));
  assert.ok(d4, '应有 D4 行');
  assert.equal(d4[2], '—', 'D4 腰围缺值格应为「—」（老 :385）');
  assert.equal(d4[3], '—', 'D4 腹围缺值格应为「—」');
  for (const r of body) {
    for (let i = 0; i + 1 < r.length; i++) {
      assert.ok(!(r[i] === '' && r[i + 1] === ''), '连续空单元：' + JSON.stringify(r));
    }
  }
  assert.ok(visibleText(html).includes('—'), '可见文本应含「—」');
});

test('#360 样本不足兜底：无数据部位 → KPI 三格「—」＋ 图区空态句（仍注部位）', () => {
  const dir = mkTmpDb();
  const r = readWithParams(dir, { metric: 'shoulder_cm', days: 90 });
  assert.equal(r.status, 0, '有库但该部位无数据时应出兜底页而非阻断，exit=' + r.status);
  const env = JSON.parse(r.stdout);
  const html = readFileSync(env.data.output, 'utf8');
  const text = visibleText(html);
  assert.ok(text.includes('肩围趋势'), '图注仍写该部位（裁定 4 反向）');
  assert.ok(text.includes('这个部位还没有可以连成趋势的记录'), '图区应是空态句（#535 起「该部位暂无趋势数据」改人话）');
  assert.ok(!html.includes('<svg'), '兜底页不应有趋势 svg');
  assert.match(text, /均值\s*—/, '均值格「—」');
  assert.match(text, /最小\s*—/, '最小格「—」');
  assert.match(text, /最大\s*—/, '最大格「—」');
  assert.match(text, /变化量\s*—/, '变化量格「—」');
  assert.match(text, /趋势点\s*—/, '趋势点格「—」');
  assert.ok(text.includes('这个部位还没有记录'), '单项表应是空态（#535 起「该项目无记录」改人话）');
});

test('#360 空库语义不变：无记录时仍 missing-data（exit 4），不编兜底页', () => {
  const dir = mkEmptyDb();
  for (const p of [undefined, { metric: 'waist_cm' }]) {
    const a = p === undefined ? [KEY] : [KEY, '--params', JSON.stringify(p)];
    const r = spawnSync(NODE_BIN, [BIN, ...a], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
    assert.equal(r.status, 4, '空库应阻断 exit 4，params=' + JSON.stringify(p));
    assert.equal(r.stdout, '', '空库 stdout 纯净');
  }
});

test('#360 整页六项：doctype／charset／内联样式≥2KB／无外链／回执绝对路径可读', () => {
  const dir = mkTmpDb();
  const env = readAutoPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('');
  assert.ok(html.startsWith('<!doctype html>'), '首行 doctype');
  assert.match(html, /<meta charset="utf-8">/, 'charset');
  assert.ok(Buffer.byteLength(css, 'utf8') >= 2048, '内联样式 ≥2KB');
  assert.ok(!/<link[\s>]/i.test(html) && !/(?:src|href)\s*=\s*["']https?:/i.test(html), '无外链');
  assert.ok(isAbsolute(env.data.output), '回执绝对路径');
  assert.ok(readFileSync(env.data.output, 'utf8').includes('腰围趋势'), '落盘页含趋势图题');
  console.log('T360-PAGE metrics=' + JSON.stringify(env.data.metrics) + ' 落点=' + env.data.output);
});
