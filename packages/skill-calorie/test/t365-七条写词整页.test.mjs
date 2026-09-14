/** #365 · 七条写词的结果型整页（真出口验收）。
 *
 * 票面（权威 `gh issue view 365`）：目标＝「7 条写词今天交出的是片段（无 doctype／无共享样式／
 * 无复制区），要换成整页」；验收＝七条写词各跑一次真出口 → 每件产物**六项读数**全绿
 * （首行 `<!doctype html>`／含 charset／内联样式 ≥ 2KB／无外链／回执路径可读／可见文本含关键字段值），
 * **字段值 == 脚本查库值**。
 *
 * 七条写词 → 四条命令（命令名以 `src/body/commands.ts` 注册表为准，本文件不抄票面）：
 *   记体脂（皮褶钳）／记体脂（外部测量）／补记体脂 → `calorie.body.composition-add`；
 *   记围度／补记围度 → `calorie.body.measure-add`；
 *   删体脂 → `calorie.body.composition-remove`；删围度 → `calorie.body.measure-remove`。
 *
 * 期望值来源（只认手写样例 ＋ 脚本查库 ＋ 老正本，不拿新实现输出当期望）：
 *   ① **手写样例**（`SEED_*`）：每格期望值由种子直接读出；
 *   ② **脚本查库**：另开 `node:sqlite` 句柄按 `receipt.recordId` 读整行，逐格比（不是回显输入）；
 *   ③ **老正本** `templates/crud_receipt.html:328-350`（删除前快照逐字段行）／`:26-29`（id 卡三态）／
 *      `:414-429`（撤销按钮只在带撤销指令时出现）；
 *   ④ **基准** `docs/skills/skill-calorie/t395-融合基准.md` §四 裁定 2：可见文本缺值写 `—`、
 *      复制数据缺项**整项缺位**（**两条分开断言**，不互相顶替）＋ §六-C 回执页骨架；
 *   ⑤ **唯一来源**：13 部位 `MEASUREMENT_ZH`、7 点站名 `CALIPER_SITE_LABELS`、来源 `SOURCE_LABELS`
 *      （本文件各写一份冻结副本与它们逐字对账，不抄第二份真名表）。
 * 负向对照（源码级变异，持锁另做，两行机器读数见 `docs/skills/skill-calorie/t365-整页证据.md`）：
 *   M1 把 `cli/write.ts:84` 那条链里的 `bodyReceiptDoc(...)` 摘掉（端口退回片段）→ 六项读数必红；
 *   还原 ⇒ 必绿。本文件另在**行为层**钉住同一条（组装口缺席即落回 `receiptHtml` 的 `op=` 片段）。
 * 运行：先 `npx tsc -b packages/skill-calorie`（本票不走 `pnpm --filter skill-calorie build`），再
 *   `node --test packages/skill-calorie/test/t365-七条写词整页.test.mjs`。
 * 真库零写入：一切数据走 mkdtemp tmp 库（`SKILLS_DB_PATH` 指过去），真库一个字节不动。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { SOURCE_LABELS } from '../dist/kcal.js';
import { MEASUREMENT_FIELDS, MEASUREMENT_ZH, measureCamelName } from '../dist/fetch/body.js';
import { CALIPER_SITE_LABELS } from '../dist/body/bodyPlate.js';
import { BODY_COMMANDS } from '../dist/body/commands.js';
import { bodyReceiptDoc } from '../dist/body/index.js';
import { buildCrudReceipt, withM5 } from '../dist/render/receipt.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const WRITE_TS = join(HERE, '..', 'src', 'cli', 'write.ts');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILE = 'calorie_data.db';
/** 内联样式读数门槛（票面逐字「内联样式 ≥ 2KB」）。 */
const CSS_MIN_BYTES = 2048;
/** 缺值占位（裁定 2 的可见文本那一半）。 */
const MISSING = '—';

/** 四条命令（`src/body/commands.ts` 注册表；本文件按注册表取，不写第二份键表）。 */
const KEY_C_ADD = 'calorie.body.composition-add';
const KEY_M_ADD = 'calorie.body.measure-add';
const KEY_C_RM = 'calorie.body.composition-remove';
const KEY_M_RM = 'calorie.body.measure-remove';

const CALIPER_COLS = [
  'caliper_chest_mm', 'caliper_abdominal_mm', 'caliper_thigh_mm', 'caliper_tricep_mm',
  'caliper_subscapular_mm', 'caliper_suprailiac_mm', 'caliper_midaxillary_mm',
];
const COMPOSITION_COLS = ['date', 'source', 'body_fat_pct', ...CALIPER_COLS, 'note'];
const MEASURE_COLS = ['date', ...MEASUREMENT_FIELDS, 'note'];

/** 13 部位冻结名表（与 `MEASUREMENT_ZH` 逐位对齐；票面用词：肩部＝「肩围」）。 */
const PART_13 = [
  '胸围', '腰围', '腹围', '臀围', '左大腿', '右大腿', '左小腿', '右小腿',
  '左上臂', '右上臂', '左前臂', '右前臂', '肩围',
];
/** 7 点站名冻结表（`body/bodyPlate.ts` 的 `CALIPER_SITE_LABELS` 同字同序）。 */
const SITE_7 = ['胸', '腹', '大腿', '三头肌', '肩胛下', '髂上', '腋中线'];
/** 来源中文名冻结表（`kcal.ts` 的 `SOURCE_LABELS` 同字）。 */
const SRC_ZH = { home_caliper: '家测皮褶钳', gym: '健身房 InBody', hospital: '医院测' };

/** 手写样例①体脂：三条（有备注／无 7 点／有 7 点）。 */
const SEED_C = [
  { date: '2026-09-05', source: 'gym', bodyFatPct: 18.5, calipers: { chest: 10, abdominal: 12 }, note: '晨起' },
  { date: '2026-09-03', source: 'hospital', bodyFatPct: 21.25, calipers: {}, note: '' },
  { date: '2026-09-01', source: 'home_caliper', bodyFatPct: 16.75, calipers: { chest: 9 }, note: '' },
];
/** 手写样例②围度：一条两项（其余 11 项空）、一条 13 项全填。 */
const SEED_M = [
  { date: '2026-09-06', values: { waist_cm: 86, hip_cm: 95 }, note: '' },
  {
    date: '2026-09-02',
    values: {
      chest_cm: 100.5, waist_cm: 80.25, abdomen_cm: 90, hip_cm: 95.5,
      left_thigh_cm: 55, right_thigh_cm: 56.5, left_calf_cm: 37, right_calf_cm: 38.5,
      left_arm_cm: 30, right_arm_cm: 31.5, left_forearm_cm: 25, right_forearm_cm: 26.5, shoulder_cm: 110,
    },
    note: '全填',
  },
];

/** 造一条 tmp 库并播下手写样例（记录**由 SQL 直插**，不经命令）。 */
function mkTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 't365-'));
  const db = openDb(join(dir, DB_FILE));
  const cStmt = db.prepare('INSERT INTO body_composition (' + COMPOSITION_COLS.join(', ') + ') VALUES ('
    + COMPOSITION_COLS.map(() => '?').join(', ') + ')');
  const SITES = ['chest', 'abdominal', 'thigh', 'tricep', 'subscapular', 'suprailiac', 'midaxillary'];
  for (const s of SEED_C) {
    cStmt.run(s.date, s.source, s.bodyFatPct, ...SITES.map((k) => s.calipers[k] ?? null), s.note);
  }
  const mStmt = db.prepare('INSERT INTO body_measurements (' + MEASURE_COLS.join(', ') + ') VALUES ('
    + MEASURE_COLS.map(() => '?').join(', ') + ')');
  for (const s of SEED_M) mStmt.run(s.date, ...MEASUREMENT_FIELDS.map((f) => s.values[f] ?? null), s.note);
  db.close();
  return dir;
}

/** 只读查询同一条 tmp 库（**可见文本的对照物＝脚本查库值**）。 */
function rowsOf(dir, sql, ...args) {
  const db = openDb(join(dir, DB_FILE));
  try { return db.prepare(sql).all(...args); } finally { db.close(); }
}

/** 不经命令直改库内一个字段（负向对照「防回显输入」用）。 */
function pokeDb(dir, sql, ...args) {
  const db = openDb(join(dir, DB_FILE));
  try { db.prepare(sql).run(...args); } finally { db.close(); }
}

/** 真出口：跑一条写命令（`SKILLS_DB_PATH` 指 tmp 库），回执、落盘页路径、页文本一并取回。 */
function runWrite(dir, key, params) {
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(r.stdout); } catch { /* 非 0 退出时 stdout 可能不是 JSON */ }
  const out = env?.data?.output;
  const html = typeof out === 'string' && existsSync(out) ? readFileSync(out, 'utf8') : '';
  return { status: r.status, env, out: typeof out === 'string' ? out : '', html, stderr: String(r.stderr || '') };
}

/** 复制载荷（页面 `data-t` 属性里的原文；复制按钮点了复制的就是它）。 */
function payloadsOf(html) {
  return [...String(html).matchAll(/data-t="([^"]*)"/g)]
    .map((m) => m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
}

/** 可见文本：剥 script／style／标签与复制载荷属性（判据只看用户能看见的字）。 */
function visible(html) {
  return String(html)
    .replace(/data-t="[^"]*"/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

/** 六项读数（票面逐条）。 */
function sixReadings(r) {
  const html = r.html;
  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const ext = [...html.matchAll(/<(?:link|script)\b[^>]*\s(?:src|href)\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]);
  return {
    doctypeFirst: html.split('\n')[0].trim().toLowerCase() === '<!doctype html>',
    charset: /<meta\s+charset\s*=\s*["']?utf-8/i.test(html),
    cssBytes: Buffer.byteLength(inlineCss, 'utf8'),
    cssOk: Buffer.byteLength(inlineCss, 'utf8') >= CSS_MIN_BYTES,
    externalLinks: ext,
    noExternal: ext.length === 0,
    pathReadable: r.out !== '' && existsSync(r.out) && statSync(r.out).size > 0 && readFileSync(r.out, 'utf8').length > 0,
  };
}

/** 六项读数逐条断言并打一行机器读数（`T365-READINGS`）。 */
function assertSixReadings(name, r, expect) {
  assert.equal(r.status, 0, name + ' 必须 exit 0，stderr=' + r.stderr.slice(-300));
  const rd = sixReadings(r);
  assert.equal(rd.doctypeFirst, true, name + ' 首行必须是 `<!doctype html>`');
  assert.equal(rd.charset, true, name + ' 必须含 charset');
  assert.equal(rd.cssOk, true, name + ' 内联样式须 ≥ ' + CSS_MIN_BYTES + 'B，实测 ' + rd.cssBytes + 'B');
  assert.equal(rd.noExternal, true, name + ' 不得有外链，实测 ' + JSON.stringify(rd.externalLinks));
  assert.equal(rd.pathReadable, true, name + ' 回执路径必须存在且可读：' + r.out);
  // 关键字段值：逐格比由 `assertRows` 做，这里先钉住「不是片段」这一条（老片段带 `op=` 裸词）。
  assert.ok(!r.html.includes('data-slot="ilife:calorie:receipt"'), name + ' 不得再落在 writeParts.receiptHtml 片段上');
  if (expect !== undefined) {
    for (const v of expect) {
      assert.ok(r.html.includes(v), name + ' 可见文本必须含关键字段值 ' + JSON.stringify(v));
    }
  }
  console.log('T365-READINGS ' + name + ' exit=' + r.status + ' doctype=' + rd.doctypeFirst
    + ' charset=' + rd.charset + ' css=' + rd.cssBytes + 'B ext=' + rd.externalLinks.length
    + ' pathOk=' + rd.pathReadable);
  return rd;
}

/** 逐格行的标记（`renderChangeRows` 的产出；箭头位 `visibility:hidden` 仍占栏，与老正本 `:344` 同一手法）。 */
const ROW_RE = new RegExp(
  '<div class="ilife-block-change-row">'
  + '<span class="ilife-block-change-row-label">([^<]*)</span>'
  + '<span class="ilife-block-change-row-old">([^<]*)</span>'
  + '<span class="ilife-block-change-row-arrow"[^>]*>',
  'g',
);

/** 页内一段（口径行为界）的 `[标签, 值]` 有序对；口径行前缀即段名。 */
function sectionRows(html, prefix) {
  const segs = String(html).split('<p class="ilife-block-caliber">');
  for (const seg of segs.slice(1)) {
    const end = seg.indexOf('</p>');
    if (end < 0 || !seg.slice(0, end).startsWith(prefix)) continue;
    return [...seg.slice(end).matchAll(ROW_RE)].map((m) => [m[1], m[2]]);
  }
  return null;
}

/** 一格可见文本的期望值：`null`／`undefined`／空串 → `—`；来源列换中文名（唯一来源）。 */
function expectCell(col, raw) {
  if (col === 'source') return SRC_ZH[String(raw)] ?? (raw === null || raw === undefined || raw === '' ? MISSING : String(raw));
  return raw === null || raw === undefined || String(raw) === '' ? MISSING : String(raw);
}

/** 逐格比：页内 `rows` 的每一格 == **脚本查库**那一格（缺项两边分别是 `—` 与 `null`／空串）。 */
function assertRows(name, rows, key, row) {
  const isMeasure = key.includes('measure');
  const cols = isMeasure ? MEASURE_COLS : COMPOSITION_COLS;
  const wantLabels = isMeasure ? ['日期', ...PART_13, '备注'] : ['日期', '来源', '体脂率', ...SITE_7, '备注'];
  assert.ok(rows !== null, name + ' 页内应有逐格段（口径行未找到）');
  assert.deepEqual(rows.map(([k]) => k), wantLabels, name + ' 字段序与中文标签逐位：' + JSON.stringify(rows.map(([k]) => k)));
  assert.equal(rows.length, cols.length, name + ' 格数 == 列数');
  for (const [i, col] of cols.entries()) {
    const want = expectCell(col, row[col]);
    assert.equal(rows[i][1], want, name + ' / ' + rows[i][0] + ' 页内=' + rows[i][1] + '，查库=' + want);
  }
  return rows;
}

/** 脚本查库：按 `receipt.recordId` 读整行（**期望值不来自命令输出**）。 */
function dbRow(dir, key, id) {
  const isMeasure = key.includes('measure');
  const table = isMeasure ? 'body_measurements' : 'body_composition';
  const cols = isMeasure ? MEASURE_COLS : COMPOSITION_COLS;
  const got = rowsOf(dir, 'SELECT ' + cols.join(', ') + ' FROM ' + table + ' WHERE id = ?', id);
  assert.equal(got.length, 1, table + ' 应能按 id=' + id + ' 查到 1 行，实测 ' + got.length);
  return got[0];
}

/* ── 七条写词：真出口 → 六项读数 ＋ 逐格 == 脚本查库值 ── */

/** 七条写词各跑一次真出口（返回逐条读数，供打印与后续断言）。 */
function runSeven(dir) {
  const idc = rowsOf(dir, "SELECT id FROM body_composition WHERE date='2026-09-05'")[0].id;
  const idm = rowsOf(dir, "SELECT id FROM body_measurements WHERE date='2026-09-06'")[0].id;
  return [
    ['记体脂（皮褶钳）', KEY_C_ADD, {
      source: 'home_caliper', sex: 'male', age: 30, date: '2026-09-10',
      caliper_chest_mm: 10, caliper_abdominal_mm: 12, caliper_thigh_mm: 14, caliper_tricep_mm: 11,
      caliper_subscapular_mm: 13, caliper_suprailiac_mm: 12, caliper_midaxillary_mm: 10,
    }],
    ['记体脂（外部测量）', KEY_C_ADD, { source: 'gym', bodyFatPct: 18.5, date: '2026-09-11' }],
    ['记围度', KEY_M_ADD, { waistCm: 85, hipCm: 95, date: '2026-09-12' }],
    ['补记体脂', KEY_C_ADD, { source: 'gym', bodyFatPct: 19, date: '2026-09-05' }],
    ['补记围度', KEY_M_ADD, { waistCm: 86, date: '2026-09-06' }],
    ['删体脂', KEY_C_RM, { id: idc }],
    ['删围度', KEY_M_RM, { id: idm }],
  ];
}

test('#365 七条写词真出口：六项读数全绿 ＋ 页内逐格 == 脚本查库值', () => {
  const dir = mkTmpDb();
  const results = [];
  for (const [name, key, params] of runSeven(dir)) {
    const r = runWrite(dir, key, params);
    assertSixReadings(name, r);
    const id = r.env.data.receipt.recordId;
    const row = dbRow(dir, key, id);
    const prefix = key.includes('remove') ? '删除前的原值' : '记录现值';
    const rows = sectionRows(r.html, prefix);
    assertRows(name, rows, key, row);
    // 关键字段值也在**可见文本**里（剥掉复制载荷属性后仍能读到）
    const text = visible(r.html);
    for (const col of key.includes('measure') ? ['waist_cm'] : ['date', 'body_fat_pct']) {
      if (row[col] === null || row[col] === undefined) continue;
      assert.ok(text.includes(expectCell(col, row[col])), name + ' 可见文本含查库值 ' + row[col]);
    }
    results.push([name, r, rows.length]);
  }
  assert.equal(results.length, 7, '七条写词各跑一次');
  console.log('T365-SEVEN 条数=' + results.length + ' 逐格全等查库值');
});

/* ── 裁定 2：可见文本 `—` ／ 复制数据缺项整项缺位（两条分开断言，不互相顶替） ── */

test('#365 裁定2-可见：缺项在页内逐格写 `—`（按格定位，不做全文 includes）', () => {
  const dir = mkTmpDb();
  // 记体脂（外部测量）：7 点皮褶全空 ＋ 备注空 → 8 格 `—`
  const r = runWrite(dir, KEY_C_ADD, { source: 'gym', bodyFatPct: 18.5, date: '2026-09-11' });
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const rows = sectionRows(r.html, '记录现值');
  assert.deepEqual(rows.filter(([, v]) => v === MISSING).map(([k]) => k),
    [...SITE_7, '备注'], '体脂：未填的 7 点与空备注逐格写 `—`');
  for (const [, v] of rows) assert.notEqual(v, '', '缺值格不得留空串');
  console.log('T365-DASH-VISIBLE 体脂缺项=' + rows.filter(([, v]) => v === MISSING).length + '/' + rows.length);
});

test('#365 裁定2-载荷：复制数据里缺项整项缺位、全文不含 `—`', () => {
  const dir = mkTmpDb();
  const r = runWrite(dir, KEY_M_ADD, { waistCm: 85, hipCm: 95, date: '2026-09-12' });
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const payloads = payloadsOf(r.html);
  assert.ok(payloads.length >= 3, '复制区应有数据／日志载荷，实测 ' + payloads.length);
  const data = payloads.find((p) => p.includes('message:') || p.trimStart().startsWith('{'));
  assert.ok(data, '复制数据载荷应在页内：' + JSON.stringify(payloads.map((p) => p.slice(0, 40))));
  assert.ok(!data.includes(MISSING), '复制数据里不得出现 `—`（缺项整项缺位）：' + data.slice(0, 300));
  for (const p of payloads) assert.ok(!p.includes(MISSING), '任何复制载荷都不得出现 `—`');
  // 有值的项照原值进载荷；缺的项**整项不在**
  assert.ok(data.includes('腰围 85'), '有值的项进载荷：' + data.slice(0, 300));
  assert.ok(data.includes('臀围 95'), '有值的项进载荷');
  assert.ok(!data.includes('胸围'), '缺项整项缺位（连标签一起省）');
  assert.ok(!data.includes('备注'), '空备注整项缺位');
  console.log('T365-PAYLOAD 载荷数=' + payloads.length + ' 含—=' + data.includes(MISSING)
    + ' 腰围=' + data.includes('腰围 85') + ' 缺项标签出现=' + data.includes('胸围'));
});

/* ── 负向对照：手改库里一个字段 → 页面必变（防「回显输入」） ── */

test('#365 防回显：跑之前不经命令直改库一个字段 → 页面跟库真值变，不跟命令参数', () => {
  const dir = mkTmpDb();
  // 删类：种子写的是 18.5，库里直改成 33.3 ⇒ 删体脂页必须摆 33.3（而命令参数里只有 id）
  pokeDb(dir, "UPDATE body_composition SET body_fat_pct = 33.3 WHERE date = '2026-09-05'");
  const idc = rowsOf(dir, "SELECT id FROM body_composition WHERE date='2026-09-05'")[0].id;
  const del = runWrite(dir, KEY_C_RM, { id: idc });
  assert.equal(del.status, 0, 'stderr=' + del.stderr.slice(-300));
  const delRows = sectionRows(del.html, '删除前的原值');
  assertRows('防回显/删体脂', delRows, KEY_C_RM, dbRow(dir, KEY_C_RM, idc));
  assert.ok(delRows.some(([k, v]) => k === '体脂率' && v === '33.3'), '删前快照须读库内 33.3：' + JSON.stringify(delRows.slice(0, 3)));
  assert.ok(!delRows.some(([k, v]) => k === '体脂率' && v === '18.5'), '页面不得再出现种子旧值 18.5');

  // 记类：同日已有记录那一块同样读库（直改 86 → 111 后跑「补记围度」）
  pokeDb(dir, "UPDATE body_measurements SET waist_cm = 111 WHERE date = '2026-09-06'");
  const back = runWrite(dir, KEY_M_ADD, { waistCm: 86, date: '2026-09-06' });
  assert.equal(back.status, 0, 'stderr=' + back.stderr.slice(-300));
  const existing = sectionRows(back.html, '同日已有记录');
  assert.ok(existing !== null, '补记命中同日既有记录时应有「同日已有记录」段');
  assert.equal(existing.find(([k]) => k === '腰围')?.[1], '111', '既有记录那一块须读库内 111：' + JSON.stringify(existing.slice(0, 2)));
  console.log('T365-ANTI-ECHO 删体脂快照体脂率=' + delRows.find(([k]) => k === '体脂率')?.[1]
    + ' 同日已有腰围=' + existing.find(([k]) => k === '腰围')?.[1]);
});

/* ── id 卡三态 ＋ M5 自证 ＋ 撤销入口 ＋ 复制区 ── */

test('#365 id 卡三态：三态词由 op 驱动（新增／删除），同一页只出现一处徽章', () => {
  const dir = mkTmpDb();
  const add = runWrite(dir, KEY_M_ADD, { waistCm: 85, date: '2026-09-12' });
  const del = runWrite(dir, KEY_M_RM, { id: rowsOf(dir, "SELECT id FROM body_measurements WHERE date='2026-09-06'")[0].id });
  for (const [name, r, word] of [['记围度', add, '新增'], ['删围度', del, '删除']]) {
    const badge = (r.html.match(new RegExp('ilife-\\S*-badge[^>]*>[^<]*' + word, 'g')) ?? []).length;
    assert.ok(badge >= 1, name + ' 应在徽章位给出三态词「' + word + '」');
    assert.equal(r.env.data.receipt.op, name === '记围度' ? 'create' : 'delete', name + ' 回执 op');
  }
  console.log('T365-IDCARD 记围度=新增 删围度=删除');
});

test('#365 M5 自证进整页：影响行数／来源＋记录号来源＋契约版本四样都在页上', () => {
  const dir = mkTmpDb();
  const r = runWrite(dir, KEY_C_ADD, { source: 'gym', bodyFatPct: 18.5, date: '2026-09-11' });
  const text = visible(r.html);
  for (const token of ['影响行数来源', 'sqlite:total_changes', '记录号来源', 'record', '回执契约版本', 'v1']) {
    assert.ok(text.includes(token), 'M5 自证项上页：' + token);
  }
  const rc = r.env.data.receipt;
  assert.equal(rc.m5Contract, '1', 'M5 契约版本');
  assert.equal(rc.affectedRowsSource, 'sqlite:total_changes', '影响行数来源');
  assert.equal(rc.idSource, 'record', '记录号来源');
  assert.ok(text.includes(rc.affectedRows + ' 行'), '页上影响行数 == 回执读数');
  console.log('T365-M5 affectedRows=' + rc.affectedRows + ' idSource=' + rc.idSource + ' 契约=v' + rc.m5Contract);
});

test('#365 撤销入口：回执不带撤销指令就不出（真出口 7 件产物都没有）；带了就出可复制指令块', () => {
  const dir = mkTmpDb();
  const idc = rowsOf(dir, "SELECT id FROM body_composition WHERE date='2026-09-05'")[0].id;
  const real = runWrite(dir, KEY_C_RM, { id: idc });
  assert.ok(!visible(real.html).includes('撤销'), '真出口产物里连「撤销」二字都没有（老正本 :427-428 自动隐藏）');

  // 直接调端口：给回执挂撤销指令 → 出「撤销指令」可复制块（`data-action-id` 非空 ⇒ 点了走冻结
  // 复制运行时给的 toast，不是死按钮；老正本 :420 的指令文本、:423 的复制提示由运行时给）
  const db = openDb(join(dir, DB_FILE));
  const base = withM5(buildCrudReceipt({
    scene: '删体脂', action: '删体脂', op: 'delete', recordId: idc, summary: '已删除体脂记录（示例）',
    wakeWord: '删体脂', source: 'body_composition (写库回执)',
    items: [{ id: idc, date: '2026-09-05', status: '已删除（软，不可恢复）', reason: '', detail: '日期 2026-09-05' }],
  }), { affectedRows: 1 });
  let page = '';
  try {
    page = bodyReceiptDoc(KEY_C_RM, { id: idc }, { ...base, undoCli: '请撤销刚才的删体脂操作（操作时间 ' + base.meta.actionAt + '）' }, db) ?? '';
  } finally { db.close(); }
  assert.ok(page.includes('撤销指令'), '带了撤销指令就必须出撤销块');
  const btn = /<button[^>]*data-action-id="([^"]+)"[^>]*data-t="([^"]*)"/.exec(page);
  assert.ok(btn, '撤销块里应有一颗可复制按钮');
  assert.ok(btn[1] !== '', '撤销按钮 actionId 非空（点了才有反馈）');
  assert.ok(btn[2].includes('撤销'), '按钮载荷就是那句撤销指令：' + btn[2]);
  console.log('T365-UNDO 真出口含撤销=' + visible(real.html).includes('撤销') + ' 带指令时出块=' + page.includes('撤销指令')
    + ' actionId=' + btn[1]);
});

/* ── 组装口：链上第五个口 ＋ 行为层负向（端口缺席必落回片段） ── */

test('#365 组装口：`cli/write.ts` 的链上第五个口是 bodyReceiptDoc，且在 `?? res.html` 之前', () => {
  const src = readFileSync(WRITE_TS, 'utf8');
  const line = src.split('\n').find((l) => l.includes('?? res.html'));
  assert.ok(line, 'chains 行必须在：' + src.slice(0, 200));
  const at = line.indexOf('bodyReceiptDoc(key, params, receipt, db)');
  assert.ok(at > 0, '链上应有 bodyReceiptDoc 那一口：' + line.trim());
  assert.ok(line.indexOf('workoutReceiptDoc(') < at, 'body 口排在训练计划之后（第五个口）');
  assert.ok(at < line.indexOf('?? res.html'), 'body 口排在 `?? res.html` 之前');
  for (const dom of ['profileReceiptDoc', 'dietReceiptDoc', 'weightReceiptDoc', 'workoutReceiptDoc']) {
    assert.ok(line.includes(dom), '既有四口一字不动：' + dom);
  }
  // 行为层负向：端口缺席（非 body 键）＝ 落回片段的形态（本票的 7 条键不再走这条）
  const dir = mkTmpDb();
  const seg = runWrite(dir, KEY_C_ADD, { source: 'gym', bodyFatPct: 18.5, date: '2026-09-11' });
  assert.ok(!seg.html.includes('data-slot="ilife:calorie:receipt"'), '七条写词不再落片段');
  console.log('T365-PORT 链上第五口=bodyReceiptDoc 位次=' + at + ' 片段标记缺席=true');
});

/* ── 不许动：登记形状仍是 receipt 形 ＋ 另外 32 条写命令行为不变 ── */

test('#365 不许动：body 4 条写命令仍 receipt 形；别的域写命令仍走各自整页', () => {
  const writes = BODY_COMMANDS.filter((c) => c.kind === 'write');
  assert.deepEqual([...writes.map((c) => c.key)].sort(), [KEY_C_ADD, KEY_C_RM, KEY_M_ADD, KEY_M_RM].sort(),
    'body 写命令清单就是这 4 条（注册表是命令名权威源）');
  assert.equal(writes.length, 4, 'body 写命令仍是 4 条');
  for (const c of writes) assert.equal(c.shape, 'receipt', c.key + ' 登记形状仍是 receipt 形');

  // 别的域：体重那条仍出体重整页（body 口不吃它的键）
  const dir = mkTmpDb();
  const db = openDb(join(dir, DB_FILE));
  try {
    db.prepare("INSERT INTO weight_log (date, weight_kg) VALUES ('2026-09-05', 72.5)").run();
  } finally { db.close(); }
  const wr = runWrite(dir, 'calorie.weight.remove', { id: rowsOf(dir, 'SELECT id FROM weight_log')[0].id });
  assert.equal(wr.status, 0, '体重写命令仍 exit 0，stderr=' + wr.stderr.slice(-200));
  assert.ok(wr.html.includes('体重'), '体重写命令仍走体重整页');
  assert.ok(!wr.html.includes('身体细节 · 写后回执'), 'body 页不得吃掉体重键');
  // 唯一来源对账（本文件的冻结副本逐字等于实现引的那两张表）
  for (const [i, f] of MEASUREMENT_FIELDS.entries()) {
    assert.equal(MEASUREMENT_ZH[f], PART_13[i], '冻结名表 == MEASUREMENT_ZH：' + f);
  }
  assert.equal(measureCamelName('left_forearm_cm'), 'leftForearmCm', '围度 camel 换算（实现引的唯一来源）');
  assert.equal(SOURCE_LABELS.gym, SRC_ZH.gym, '冻结来源名 == SOURCE_LABELS');
  assert.deepEqual([...CALIPER_SITE_LABELS], SITE_7, '冻结站名表 == CALIPER_SITE_LABELS');
  console.log('T365-UNTOUCHED body写命令=' + writes.length + ' 条仍 receipt 形；体重键仍走体重页');
});

/* ── 真出口七条各跑一遍的收口读数（一条汇总行，供证据件抄） ── */

test('#365 收口：七条写词的真出口读数汇总可复跑', () => {
  const dir = mkTmpDb();
  const lines = [];
  for (const [name, key, params] of runSeven(dir)) {
    const r = runWrite(dir, key, params);
    assert.equal(r.status, 0, name + ' exit 0');
    const row = dbRow(dir, key, r.env.data.receipt.recordId);
    const rows = sectionRows(r.html, key.includes('remove') ? '删除前的原值' : '记录现值');
    assertRows(name, rows, key, row);
    lines.push(name + '=' + sixReadings(r).cssBytes + 'B');
  }
  console.log('T365-SUMMARY ' + lines.join(' '));
});
