/** #359 · 看体脂页回显 7 点皮褶值（验收 ＋ 负向对照读数）。
 *
 * 期望值来源＝**变更前快照**（基线提交 `6c7d2b2`，不是新实现的输出）：
 *   ① 7 个皮褶值与次序：`src/fetch/body.ts:19-23` 的 `CALIPER_FIELDS`（胸／腹／大腿／三头／肩胛下／髂上／腋中）；
 *   ② 冻结种子值 `10/12/14/11/13/12/10` 与**冻结条目数 3 条**：`test/render-t41.test.mjs:57-58`（同值另见
 *      `wizard-86.test.mjs:36`、`db-readonly-93.test.mjs:79`、`cli-smoke-t41.test.mjs:57`）。
 * 页面读数一律走 CLI 真出口（`SKILLS_DB_PATH` 指 mkdtemp，真实库零写入），比对对象＝**同一 tmp 库的查库值**。
 * 「互异」两读都覆盖：冻结种子里 `10`／`12` 各出现两次，故「逐位对上」按槽位判（串位必红）；
 * 另加一组两两不同的种子判严格「互异」。
 * 运行：先 `node node_modules/typescript/bin/tsc -b`（包内编译；本票不走 `pnpm --filter skill-calorie build`，那条会顺带重注入
 * 别席在途的 `SKILL.md`），再 `node --test packages/skill-calorie/test/t359-seven-point.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { CALIPER_FIELDS } from '../dist/fetch/body.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'calorie.view.body-composition';
const DB_FILE = 'calorie_data.db';

/** 站点标签（照老技能向导页 `body_composition_wizard.html:515` 原文），次序＝`CALIPER_FIELDS`。 */
const SITE_LABELS = ['胸', '腹', '大腿', '三头肌', '肩胛下', '髂上', '腋中线'];
/** 冻结种子（基线逐位同值）＋ 冻结条目数 3 条 ＋ 同文件三条的体脂率。
 *  条目数一律按 `FROZEN_PCTS` 取（3 条＝基线快照的条目数），值按 `FROZEN_CALIPERS` 取（7 位）。 */
const FROZEN_CALIPERS = [10, 12, 14, 11, 13, 12, 10];
const FROZEN_PCTS = [19.5, 19.2, 18.9];
/** 严格「互异」读法单独用的一组两两不同值（本票新写；不与冻结种子的读法混用）。 */
const DISTINCT_CALIPERS = [9, 11, 12, 13, 14, 15, 16];

/** 冻结种子三行（同值同皮褶，日期在 mkTmpDb 里按「近 N 天」铺）。 */
function frozenSeedRows(calipers = FROZEN_CALIPERS, source = 'home_caliper') {
  return FROZEN_PCTS.map((pct) => ({ pct, source, calipers }));
}

const DAY_MS = 86400000;

/** 相对日：页面的体成分缺省窗口是近 90 天，写绝对日会随墙钟滑出窗口（日期腐坏），故日期取「近 N 天」。 */
function dayBefore(n) {
  return new Date(Date.now() - n * DAY_MS).toISOString().slice(0, 10);
}

/** 建 tmp 库：`rows` 由早到晚（最后一条＝最新，页面取它）。缺省＝冻结种子三行。 */
function mkTmpDb(rows) {
  const dir = mkdtempSync(join(tmpdir(), 't359-'));
  const db = openDb(join(dir, DB_FILE));
  const cols = ['date', 'source', 'body_fat_pct', ...CALIPER_FIELDS];
  const stmt = db.prepare('INSERT INTO body_composition (' + cols.join(', ') + ') VALUES ('
    + cols.map(() => '?').join(', ') + ')');
  const list = rows ?? frozenSeedRows();
  list.forEach((r, i) => stmt.run(dayBefore(list.length - 1 - i), r.source ?? 'home_caliper', r.pct, ...r.calipers));
  db.close();
  return dir;
}

/** 同一 tmp 库的查库值：最新一条（date DESC, id DESC）的 7 个皮褶字段。 */
function dbLatestCalipers(dir) {
  const db = openDb(join(dir, DB_FILE));
  const row = db.prepare('SELECT date, ' + CALIPER_FIELDS.join(', ') + ' FROM body_composition'
    + ' WHERE COALESCE(is_deprecated, 0) = 0 ORDER BY date DESC, id DESC LIMIT 1').get();
  db.close();
  return row;
}

/** 走 CLI 真出口读整页；回 envelope。 */
function readPage(dir) {
  const r = spawnSync(NODE_BIN, [BIN, KEY], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  assert.equal(r.status, 0, '读命令 exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(-400));
  return JSON.parse(r.stdout);
}

/** 可见文本：剥掉 script／style 与标签（判据只看用户能看见的字，不看复制证据里的 JSON）。 */
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

/** 7 点表读数（跳表头，一行＝一槽）：[{ site, mm, date }]。 */
function caliperReadout(html) {
  return tableRows(html, '皮褶 7 点原始值').slice(1).map(([site, mm, date]) => ({ site, mm, date }));
}

/** 整页六项读数。`output` ＝ envelope 回执里的落点。 */
function pageChecks(html, output) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('');
  let receiptAbsReadable = false;
  let bytes = 0;
  try {
    const text = readFileSync(output, 'utf8');
    receiptAbsReadable = isAbsolute(output) && text.startsWith('<!doctype html>') && text.includes('皮褶 7 点原始值');
    bytes = Buffer.byteLength(text, 'utf8');
  } catch {
    receiptAbsReadable = false;
  }
  return {
    doctype: html.startsWith('<!doctype html>'),
    charset: /<meta charset="utf-8">/.test(html),
    inlineCss2k: Buffer.byteLength(css, 'utf8') >= 2048,
    noExternal: !/<link[\s>]/i.test(html) && !/(?:src|href)\s*=\s*["']https?:/i.test(html)
      && !/@import\s+url\(\s*["']?https?:/i.test(html),
    receiptAbsReadable,
    visible7: false, // 由调用方按本页 7 值填
    bytes,
  };
}

test('#359 口径：7 列次序与站点标签逐位对齐（冻结自基线）', () => {
  assert.equal(CALIPER_FIELDS.length, 7, '皮褶列必须 7 项');
  assert.deepEqual([...CALIPER_FIELDS], [
    'caliper_chest_mm', 'caliper_abdominal_mm', 'caliper_thigh_mm',
    'caliper_tricep_mm', 'caliper_subscapular_mm', 'caliper_suprailiac_mm',
    'caliper_midaxillary_mm',
  ], '7 列次序与基线逐位相同');
  assert.equal(SITE_LABELS.length, 7);
});

test('#359 看体脂页：7 点逐个出现、逐位等于查库值（冻结种子 3 条）', () => {
  const dir = mkTmpDb();
  const env = readPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const dbRow = dbLatestCalipers(dir);
  const cells = caliperReadout(html);
  assert.equal(cells.length, 7, '7 点表应有 7 行（一行一槽）');
  const text = visibleText(html);
  cells.forEach((c, i) => {
    assert.equal(c.site, SITE_LABELS[i], '第 ' + (i + 1) + ' 槽标签');
    assert.equal(c.mm, String(dbRow[CALIPER_FIELDS[i]]), '第 ' + (i + 1) + ' 槽值与查库值逐字相同');
    assert.equal(c.date, dbRow.date, '第 ' + (i + 1) + ' 槽日期');
    assert.ok(text.includes(c.mm), '可见文本缺该槽值 ' + c.mm);
  });
  // 逐位次序（串位即红）：读数序列 == 库值序列。
  assert.deepEqual(cells.map((c) => c.mm), CALIPER_FIELDS.map((f) => String(dbRow[f])), '7 槽次序 == 库内次序');
  console.log('T359-READOUT 冻结种子 cells=' + JSON.stringify(cells.map((c) => c.site + '=' + c.mm))
    + ' 查库=' + JSON.stringify(CALIPER_FIELDS.map((f) => dbRow[f])) + ' 条目数=' + env.data.metrics.total);
});

test('#359 互异读法：7 个两两不同的值都在页面上（另一组种子）', () => {
  const dir = mkTmpDb(frozenSeedRows(DISTINCT_CALIPERS));
  const env = readPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const cells = caliperReadout(html);
  const mm = cells.map((c) => c.mm);
  assert.equal(new Set(mm).size, 7, '7 槽值应两两不同：' + JSON.stringify(mm));
  assert.deepEqual(mm, DISTINCT_CALIPERS.map(String), '互异组 7 值逐位等于种子');
  const dbRow = dbLatestCalipers(dir);
  assert.deepEqual(mm, CALIPER_FIELDS.map((f) => String(dbRow[f])), '互异组 7 值逐字等于查库值');
  const text = visibleText(html);
  for (const v of DISTINCT_CALIPERS) assert.ok(text.includes(String(v)), '可见文本缺互异值 ' + v);
  console.log('T359-READOUT 互异组 cells=' + JSON.stringify(mm.map((v, i) => SITE_LABELS[i] + '=' + v))
    + ' 互异数=' + new Set(mm).size);
});

test('#359 缺一项不冒充：缺槽位写「—」，不拿别的值顶上', () => {
  const partial = [...FROZEN_CALIPERS.slice(0, 6), null];
  const dir = mkTmpDb(FROZEN_PCTS.map((pct, i) => ({ pct, source: 'home_caliper', calipers: i === 2 ? partial : FROZEN_CALIPERS })));
  const env = readPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const cells = caliperReadout(html);
  assert.equal(cells.length, 7, '缺一项也仍是 7 槽（缺项如实留空）');
  assert.equal(cells[6].mm, '—', '第 7 槽无值时应写「—」');
  assert.equal(cells[6].site, SITE_LABELS[6]);
  cells.slice(0, 6).forEach((c, i) => assert.equal(c.mm, String(FROZEN_CALIPERS[i]), '有值槽位照旧逐字'));
});

test('#359 外部设备来源（无皮褶数据）→ 整页不渲染 7 点表，也不编值', () => {
  const dir = mkTmpDb(frozenSeedRows(CALIPER_FIELDS.map(() => null), 'gym'));
  const env = readPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  assert.ok(!html.includes('皮褶 7 点原始值'), '无皮褶数据时不该有 7 点表');
  assert.ok(visibleText(html).includes('19.5'), '其余内容照旧（体脂率仍在）');
});

test('#359 整页六项：doctype／charset／内联样式≥2KB／无外链／回执绝对路径可读／可见文本含 7 值', () => {
  const dir = mkTmpDb();
  const env = readPage(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const dbRow = dbLatestCalipers(dir);
  const text = visibleText(html);
  const checks = pageChecks(html, env.data.output);
  checks.visible7 = CALIPER_FIELDS.every((f) => text.includes(String(dbRow[f])));
  for (const [k, v] of Object.entries(checks)) {
    if (k === 'bytes') continue;
    assert.ok(v, '整页六项缺 ' + k);
  }
  assert.ok(checks.bytes >= 2048, '整页字节数 ≥2KB，实得 ' + checks.bytes);
  console.log('T359-PAGE 六项=' + JSON.stringify(checks) + ' 回执落点=' + env.data.output);
});
