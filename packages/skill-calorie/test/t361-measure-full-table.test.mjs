/** #361 · 看围度页印全量 13 项（宽表 13 列＋窄屏卡同源）＋裁定 2 表头与复制区。
 *
 * 期望值来源（t169 只认三样，不拿新输出当期望）：
 *   ① 手算：冻结种子（相对日，防墙钟滑出 90 天窗；t360 同款 `dayBefore` 手法）——
 *     R0 ＝ 6 天前：只填肩围 44（note='r0'；库触发器禁全空行，故单填一行验「只列已填项」）；
 *     R1 ＝ 5 天前：13 项全填（胸95/腰80/腹78/臀92/左大腿55/右大腿55.5/左小腿36/右小腿36.2/
 *       左上臂32/右上臂32.1/左前臂26/右前臂26.3/肩45，note='r1'）；
 *     R2 ＝ 4 天前：腰围与右小腿缺（其余胸95.5/腹78.5/臀92.2/左大腿55.2/右大腿55.6/左小腿36.1/
 *       左上臂32.2/右上臂32.4/左前臂26.1/右前臂26.4/肩45.2，note='r2'）；
 *     R3 ＝ 1 天前（最新）：13 项全填（胸96/腰81/腹79/臀93/左大腿56/右大腿56.5/左小腿37/右小腿37.2/
 *       左上臂33/右上臂33.1/左前臂27/右前臂27.3/肩46，note='r3'）。
 *     全空行卡片「未填围度」走合成视图直调断言（库触发器 `schema.ts:144-152` 禁全空行落库，
 *     真库语义下不可达；口径认老原文 `:397`，不断言真出口）。
 *   ① 手算之二（趋势闸门保持，#360 不许动）：13 部位最新非空同为 R3 → 平局按既有列序取首位
 *     `chest_cm`（`latestMeasurementMetric` 平局口径）；胸围趋势序列 [95, 95.5, 96] ⇒ 点数 3、
 *     均值 95.5、最小 95、最大 96、变化量 +1、最新 96。
 *   ③ 需求原文：13 个部位名取老正本 `render_body_measurements_view.py:41-48 METRIC_LABELS`
 *     与新侧 `bodyDocs.ts` 的 `MEASUREMENT_ZH`（#440 起两处 13/13 同字：肩部旧用词已按
 *     「软尺环绕量」裁定统一为「肩围」，本件的期望字串随票同改；口径差异见证据）。
 * 负向对照（源码级变异，持锁另做，机器读数见证据）：
 *   M1 删掉一列（如肩围列）→ 13 名断言必红；还原 → 必绿。
 *   M2 复制 payload 把空写成「—」→ 载荷断言必红；还原 → 必绿。
 * 运行：先 `npx tsc -b packages/skill-calorie`（本票不走 `pnpm --filter skill-calorie build`，
 *   那条会重注入他席 SKILL.md），再 `node --test packages/skill-calorie/test/t361-measure-full-table.test.mjs`。
 * 真库零写入：一切数据走 mkdtemp tmp 库（`SKILLS_DB_PATH` 指过去），真库只读对账见证据。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { MEASUREMENT_FIELDS } from '../dist/fetch/body.js';

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

/** 13 部位冻结名表（字段 → 中文名；中文名认新侧 `MEASURE_ZH` 冻结口径，见头注③）。 */
const SEED_13 = [
  ['chest_cm', '胸围'], ['waist_cm', '腰围'], ['abdomen_cm', '腹围'], ['hip_cm', '臀围'],
  ['left_thigh_cm', '左大腿'], ['right_thigh_cm', '右大腿'],
  ['left_calf_cm', '左小腿'], ['right_calf_cm', '右小腿'],
  ['left_arm_cm', '左上臂'], ['right_arm_cm', '右上臂'],
  ['left_forearm_cm', '左前臂'], ['right_forearm_cm', '右前臂'],
  ['shoulder_cm', '肩围'],
];

/** 冻结种子（行由早到晚；null＝该格缺值，手算期望的唯一依据）。 */
function seedRows() {
  return [
    {
      n: 6, note: 'r0',
      chest_cm: null, waist_cm: null, abdomen_cm: null, hip_cm: null,
      left_thigh_cm: null, right_thigh_cm: null, left_calf_cm: null, right_calf_cm: null,
      left_arm_cm: null, right_arm_cm: null, left_forearm_cm: null, right_forearm_cm: null,
      shoulder_cm: 44,
    },
    {
      n: 5, note: 'r1',
      chest_cm: 95, waist_cm: 80, abdomen_cm: 78, hip_cm: 92,
      left_thigh_cm: 55, right_thigh_cm: 55.5, left_calf_cm: 36, right_calf_cm: 36.2,
      left_arm_cm: 32, right_arm_cm: 32.1, left_forearm_cm: 26, right_forearm_cm: 26.3,
      shoulder_cm: 45,
    },
    {
      n: 4, note: 'r2',
      chest_cm: 95.5, waist_cm: null, abdomen_cm: 78.5, hip_cm: 92.2,
      left_thigh_cm: 55.2, right_thigh_cm: 55.6, left_calf_cm: 36.1, right_calf_cm: null,
      left_arm_cm: 32.2, right_arm_cm: 32.4, left_forearm_cm: 26.1, right_forearm_cm: 26.4,
      shoulder_cm: 45.2,
    },
    {
      n: 1, note: 'r3',
      chest_cm: 96, waist_cm: 81, abdomen_cm: 79, hip_cm: 93,
      left_thigh_cm: 56, right_thigh_cm: 56.5, left_calf_cm: 37, right_calf_cm: 37.2,
      left_arm_cm: 33, right_arm_cm: 33.1, left_forearm_cm: 27, right_forearm_cm: 27.3,
      shoulder_cm: 46,
    },
  ];
}

function mkTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 't361-'));
  const db = openDb(join(dir, DB_FILE));
  const cols = ['date', ...MEASUREMENT_FIELDS, 'note'];
  const stmt = db.prepare('INSERT INTO body_measurements (' + cols.join(', ') + ') VALUES ('
    + cols.map(() => '?').join(', ') + ')');
  for (const r of seedRows()) {
    stmt.run(dayBefore(r.n), ...MEASUREMENT_FIELDS.map((f) => r[f]), r.note);
  }
  db.close();
  return dir;
}

function mkEmptyDb() {
  const dir = mkdtempSync(join(tmpdir(), 't361-empty-'));
  openDb(join(dir, DB_FILE)).close();
  return dir;
}

/** 路由示例（全量表）：`calorie.view.body-measure --params '{"days":90}'`（不带部位）。 */
function readFullTable(dir) {
  const r = spawnSync(NODE_BIN, [BIN, KEY, '--params', '{"days":90}'], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  assert.equal(r.status, 0, '全量表路由 exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(-400));
  return JSON.parse(r.stdout);
}

/** 可见文本：先 stripping 复制菜单的 `data-t`（载荷 JSON 不得漏进可见读数），
 * 再剥 script／style／标签（判据只看用户能看见的字）。 */
function visibleText(html) {
  return html
    .replace(/data-t="[^"]*"/g, ' ')
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

/** 复制菜单三项的 `data-t`（键 → 文本；`profile-doc-179.test.mjs:198` 同形手法）。 */
function menuTexts(html) {
  const out = {};
  for (const m of html.matchAll(/data-fmt="([^"]+)"[^>]*\sdata-t="([^"]*)"/g)) out[m[1]] = decodeAttr(m[2]);
  return out;
}

/** HTML 属性值还原（`&quot;`／`&amp;`／`&lt;`／`&gt;`／`&#39;` 五种，同冻结转义表）。 */
function decodeAttr(value) {
  return value
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 按日期取窄屏卡片块（`msr-card` 内含该日期头的块）。 */
function cardOf(html, date) {
  const cards = [...html.matchAll(/<div class="msr-card">([\s\S]*?)<\/div><\/div><\/div>/g)].map((m) => m[0]);
  const hit = cards.find((c) => c.includes(date));
  assert.ok(hit, '缺日期 ' + date + ' 的窄屏卡片（共 ' + cards.length + ' 张）');
  return hit;
}

test('#361 13 个部位名逐个出现（与冻结种子一致；票面验收）', () => {
  const dir = mkTmpDb();
  const env = readFullTable(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const text = visibleText(html);
  let hit = 0;
  for (const [field, zh] of SEED_13) {
    assert.ok(text.includes(zh), '可见文本缺部位名「' + zh + '」（字段 ' + field + '）');
    hit += 1;
  }
  assert.equal(hit, 13, '部位名命中数应为 13');
  const rows = tableRows(html, '围度记录');
  const head = rows[0];
  assert.equal(head[0], '日期', '表头首列应为日期');
  assert.equal(head[head.length - 1], '备注', '表头末列应为备注');
  for (const [field, zh] of SEED_13) {
    assert.ok(head.includes(zh), '表头缺「' + zh + '」（字段 ' + field + '）');
  }
  assert.deepEqual(
    head.slice(1, -1),
    SEED_13.map(([, zh]) => zh),
    '表头列序应与既有列序一致（`MEASUREMENT_FIELDS` 序）',
  );
  console.log('T361-READOUT names=13/13 fields=' + MEASUREMENT_FIELDS.join(','));
});

test('#361 裁定 2 表体：缺值格可见「—」，且无连续空单元', () => {
  const dir = mkTmpDb();
  const env = readFullTable(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const rows = tableRows(html, '围度记录');
  const body = rows.slice(1);
  assert.equal(body.length, 4, '全量表应有 4 行（冻结种子 4 行）');
  const byDate = Object.fromEntries(body.map((r) => [r[0], r]));
  const head = rows[0];
  const col = (name) => {
    const i = head.indexOf(name);
    assert.ok(i >= 0, '表头缺列 ' + name);
    return i;
  };
  const r2 = byDate[dayBefore(4)];
  assert.ok(r2, '应有 R2 行');
  assert.equal(r2[col('腰围')], '—', 'R2 腰围缺值格应为「—」（老 :385）');
  assert.equal(r2[col('右小腿')], '—', 'R2 右小腿缺值格应为「—」');
  assert.equal(r2[col('胸围')], '95.5', 'R2 胸围有值格应原样印 95.5');
  const r0 = byDate[dayBefore(6)];
  assert.ok(r0, '应有 R0 行');
  assert.equal(r0[col('肩围')], '44', 'R0 行肩围有值格应原样印 44');
  for (const [, zh] of SEED_13) {
    if (zh === '肩围') continue;
    assert.equal(r0[col(zh)], '—', 'R0 行「' + zh + '」缺值格应为「—」');
  }
  for (const r of body) {
    for (let i = 0; i + 1 < r.length; i++) {
      assert.ok(!(r[i] === '' && r[i + 1] === ''), '连续空单元：' + JSON.stringify(r));
    }
  }
  assert.ok(visibleText(html).includes('—'), '可见文本应含「—」');
});

test('#361 裁定 2 复制区：payload 保留原始空值，绝不把「—」写进去（与表体分开断言）', () => {
  const dir = mkTmpDb();
  const db = openDb(join(dir, DB_FILE));
  const dbRow = db.prepare('SELECT waist_cm FROM body_measurements WHERE date = ?').get(dayBefore(4));
  db.close();
  assert.equal(dbRow.waist_cm, null, '库里 R2 腰围应为原始空值（payload 保真的源头）');
  const env = readFullTable(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const texts = menuTexts(html);
  assert.deepEqual(Object.keys(texts).sort(), ['csv', 'json', 'text'], '复制菜单应为三格式');
  const payload = JSON.parse(texts.json);
  assert.equal(payload.key, 'calorie.view.body-measure', '载荷 key');
  assert.equal(payload.shape, 'list', '载荷 shape');
  const items = payload.data.items;
  assert.equal(items.length, 4, '载荷应有 4 行');
  const r2 = items.find((it) => it.date === dayBefore(4));
  assert.ok(r2, '载荷应有 R2 行');
  assert.equal(r2.waist_cm, null, '载荷 R2 腰围应保留原始空值 null（不得写「—」）');
  assert.equal(r2.right_calf_cm, null, '载荷 R2 右小腿应保留原始空值 null');
  assert.equal(r2.chest_cm, 95.5, '载荷 R2 胸围应原样 95.5');
  const dump = JSON.stringify(items);
  assert.equal(dump.includes('—'), false, '载荷里不得出现「—」（表体与载荷两套口径，不许互染）');
});

test('#361 窄屏卡片：与宽表同一份数据，只列已填项，全空行写「未填围度」', () => {
  const dir = mkTmpDb();
  const env = readFullTable(dir);
  const html = readFileSync(env.data.output, 'utf8');
  assert.ok(html.includes('msr-cards'), '缺窄屏卡片区（老 :389-399）');
  assert.ok(html.includes('@media (max-width:640px)'), '缺 640px 断点（老 :128-151）');
  const rows = tableRows(html, '围度记录');
  const tableDates = rows.slice(1).map((r) => r[0]);
  const cardDates = [...html.matchAll(/<span class="msr-date">([^<]*)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(cardDates, tableDates, '卡片日期列应与宽表日期列逐行相同（同一份数据）');
  const r3 = cardOf(html, dayBefore(1));
  assert.ok(r3.includes('腰围'), 'R3 卡片应列腰围（已填项）');
  assert.ok(r3.includes('81 cm'), 'R3 卡片腰围值应为「81 cm」（#535 起数值与单位之间留一个空格）');
  assert.ok(r3.includes('肩围'), 'R3 卡片应列肩围（13 项全列，已填即展示）');
  const r2 = cardOf(html, dayBefore(4));
  assert.equal(r2.includes('msr-k">腰围'), false, 'R2 卡片不得列腰围（缺项不出，老 :393-395 filter 口径）');
  assert.ok(r2.includes('胸围'), 'R2 卡片应列胸围（已填项）');
  const r0 = cardOf(html, dayBefore(6));
  assert.ok(r0.includes('肩围'), 'R0 卡片应列肩围（唯一已填项）');
  assert.ok(r0.includes('44 cm'), 'R0 卡片肩围值应为「44 cm」（#535 起数值与单位之间留一个空格）');
  assert.equal(r0.includes('msr-k">腰围'), false, 'R0 卡片不得列腰围（缺项不出）');
  assert.equal(r0.includes('未填围度'), false, 'R0 有已填项，不得出「未填围度」');
});

test('#361 全空行卡片兜底：合成视图直调出「未填围度」（老 :397 口径）', async () => {
  const { buildBodyMeasureDoc } = await import('../dist/body/bodyDocs.js');
  const html = buildBodyMeasureDoc({
    metric: null, total: 1, trend: [], latestVal: null, autoMetric: null,
    kpi: { count: 0, avg: null, min: null, max: null, delta: null },
    items: [{ date: '2026-01-01', note: '' }],
  });
  assert.ok(html.includes('未填围度'), '全空行卡片应写「未填围度」（老 :397）');
  assert.ok(visibleText(html).includes('—'), '全空行表行缺值格应为「—」');
});

test('#361 趋势闸门保持（#360 不许动）：自动挑部位＋五项 KPI＋图区原样', () => {
  const dir = mkTmpDb();
  const env = readFullTable(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const text = visibleText(html);
  assert.ok(text.includes('胸围趋势'), '平局按既有列序取首位，图题应为「胸围趋势」');
  assert.ok(html.includes('<svg'), '图区应有自绘 svg（#360 图闸门保持）');
  // #535：读数卡「趋势点」的单位由「天」改「个」（编排者复核：3 个点不是跨 3 天），点数仍钉手算值 3。
  assert.match(text, /趋势点\s*3\s*个/, 'KPI 趋势点应为手算 3 个');
  assert.match(text, /均值\s*95\.5\s*cm/, 'KPI 均值应为手算 95.5');
  assert.match(text, /最小\s*95\s*cm/, 'KPI 最小应为手算 95');
  assert.match(text, /最大\s*96\s*cm/, 'KPI 最大应为手算 96');
  assert.match(text, /变化量\s*\+1\s*cm/, 'KPI 变化量应为手算 +1');
  assert.match(text, /最新\s*96\s*cm/, 'KPI 最新应为手算 96cm');
});

test('#361 整页六项：doctype／charset／内联样式≥2KB／无外链／回执绝对路径可读', () => {
  const dir = mkTmpDb();
  const env = readFullTable(dir);
  const html = readFileSync(env.data.output, 'utf8');
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('');
  assert.ok(html.startsWith('<!doctype html>'), '首行 doctype');
  assert.match(html, /<meta charset="utf-8">/, 'charset');
  assert.ok(Buffer.byteLength(css, 'utf8') >= 2048, '内联样式 ≥2KB');
  assert.ok(!/<link[\s>]/i.test(html) && !/(?:src|href)\s*=\s*["']https?:/i.test(html), '无外链');
  assert.ok(isAbsolute(env.data.output), '回执绝对路径');
  assert.ok(readFileSync(env.data.output, 'utf8').includes('围度记录'), '落盘页含全量表');
});

test('#361 空库语义不变：无记录时仍 missing-data（exit 4），不编兜底页', () => {
  const dir = mkEmptyDb();
  const r = spawnSync(NODE_BIN, [BIN, KEY, '--params', '{"days":90}'], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  assert.equal(r.status, 4, '空库应阻断 exit 4');
  assert.equal(r.stdout, '', '空库 stdout 纯净');
});
