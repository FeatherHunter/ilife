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
 *   ③ **老正本** `templates/crud_receipt.html:328-350`（删除前快照逐字段行；`:343` 写 `.diff-old`）／
 *      `:351-371`（新增内容逐字段行；`:364` 写 `.diff-new`）／`:26-29`（id 卡三态配色）／
 *      `:192-197`（标签／色档／图标三张表）／`:202-203`（图标与标题上卡）／
 *      `:414-429`（撤销按钮只在带撤销指令时出现）；**值槽口径＝逐支读**：增类落新值槽、删类落旧值槽，
 *      `:315-322` 那一支是「改」模式、不是全体（`body/receipt.ts` 件头 ② 记同一条）；
 *   ④ **基准** `docs/skills/skill-calorie/t395-融合基准.md` §四 裁定 2：可见文本缺值写 `—`、
 *      复制数据缺项**整项缺位**（**两条分开断言**，不互相顶替）＋ §六-C 回执页骨架；
 *   ⑤ **唯一来源**：13 部位 `MEASUREMENT_ZH`、7 点站名 `CALIPER_SITE_LABELS`、来源 `SOURCE_LABELS`
 *      （本文件各写一份冻结副本与它们逐字对账，不抄第二份真名表）。
 * 负向对照（源码级变异，持锁另做，两行机器读数见 `docs/skills/skill-calorie/t365-整页证据.md`）：
 *   M1 把 `cli/write.ts:84` 那条链里的 `bodyReceiptDoc(...)` 摘掉（端口退回片段）→ 六项读数必红；
 *   还原 ⇒ 必绿。本文件另在**行为层**钉住同一条（组装口缺席即落回 `receiptHtml` 的 `op=` 片段）。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`（本票不走 `pnpm --filter skill-calorie build`），再
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
import { OPERATION_ICONS, OPERATION_LABELS, OPERATION_TONES } from '../dist/shared/operationHead.js';
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

/** 逐格行的标记（`renderChangeRows` 的产出；箭头位 `visibility:hidden` 仍占栏，与老正本 `:344`／`:365`
 *  同一手法）。**四个槽都读**：值落哪一槽由**操作类型**定——增类落 `-new`（老正本增支 `:351-371`，
 *  `:364` 写 `.diff-new`）、删类落 `-old`（删支 `:328-350`，`:343` 写 `.diff-old`）。只读一个槽会把
 *  「增类现值落进旧槽」这种错读成绿——`.ilife-block-change-row-old` 自带红删除线
 *  （`base-render/src/blocks.ts:1333-1336`），增类页那样摆等于把刚写入的现值画成待删。 */
const ROW_RE = new RegExp(
  '<div class="ilife-block-change-row">'
  + '<span class="ilife-block-change-row-label">([^<]*)</span>'
  + '<span class="ilife-block-change-row-old">([^<]*)</span>'
  + '<span class="ilife-block-change-row-arrow"[^>]*>[^<]*</span>'
  + '<span class="ilife-block-change-row-new">([^<]*)</span>'
  + '</div>',
  'g',
);

/** 页内一段（口径行为界）的 `[标签, 值]` 有序对；口径行前缀即段名。
 *  `slot` ＝ 该 op 值**应落**的那一槽（增 `new`／删 `old`）；另一槽逐行必须留空（两槽都有值＝一段摆两遍）。 */
function sectionRows(html, prefix, slot) {
  const segs = String(html).split('<p class="ilife-block-caliber">');
  for (const seg of segs.slice(1)) {
    const end = seg.indexOf('</p>');
    if (end < 0 || !seg.slice(0, end).startsWith(prefix)) continue;
    const all = [...seg.slice(end).matchAll(ROW_RE)]
      .map((m) => ({ label: m[1], old: m[2], new: m[3] }));
    for (const row of all) {
      assert.equal(slot === 'old' ? row.new : row.old, '',
        '「' + prefix + '」段的「' + row.label + '」不该出现在另一槽（值只落该 op 的那一槽）');
    }
    return all.map((row) => [row.label, slot === 'old' ? row.old : row.new]);
  }
  return null;
}

/** 一格可见文本的期望值：`null`／`undefined`／空串 → `—`；来源列换中文名（唯一来源）。 */
function expectCell(col, raw) {
  if (col === 'source') return SRC_ZH[String(raw)] ?? (raw === null || raw === undefined || raw === '' ? MISSING : String(raw));
  return raw === null || raw === undefined || String(raw) === '' ? MISSING : String(raw);
}

/** 逐格比：页内 `rows` 的每一格 == **脚本查库**那一格（缺项两边分别是 `—` 与 `null`／空串）。
 *
 *  #537 重排：口径行由「记录现值」改「这次记下的」，且**记／补记类只摆有值的行**
 *  （缺值不占位，缺了几项由段下那句计数说清）⇒ 增类按**有值子集**比；
 *  删类仍摆全字段（删除回执要摆的是「这条记录里原来有什么」，缺的格子也是它的一部分）。 */
function assertRows(name, rows, key, row, op = 'create') {
  const isMeasure = key.includes('measure');
  const cols = isMeasure ? MEASURE_COLS : COMPOSITION_COLS;
  const allLabels = isMeasure ? ['日期', ...PART_13, '备注'] : ['日期', '来源', '体脂率', ...SITE_7, '备注'];
  const kept = cols
    .map((c, i) => [c, allLabels[i]])
    .filter(([c]) => op === 'delete' || (row[c] !== null && row[c] !== undefined && String(row[c]) !== ''));
  assert.ok(rows !== null, name + ' 页内应有逐格段（口径行未找到）');
  assert.deepEqual(rows.map(([k]) => k), kept.map(([, l]) => l),
    name + ' 字段序与中文标签逐位（只比上屏的那几项）：' + JSON.stringify(rows.map(([k]) => k)));
  assert.equal(rows.length, kept.length, name + ' 格数 == 上屏的列数');
  for (const [i, [col]] of kept.entries()) {
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
    // 增类现值落新值槽（`new`）；删类删前原值落旧值槽（`old`）。
    const slot = key.includes('remove') ? 'old' : 'new';
    const prefix = key.includes('remove') ? '删除前的原值' : '这次记下的';
    const rows = sectionRows(r.html, prefix, slot);
    assertRows(name, rows, key, row, key.includes('remove') ? 'delete' : 'create');
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

test('#365 裁定2-可见：缺值的行整行不摆、上屏的行全为查库真值（#537 收）', () => {
  const dir = mkTmpDb();
  // 记体脂（外部测量）：7 点皮褶全空 ＋ 备注空 ⇒ **缺值的行整行不摆**（#537：缺值不占位，
  // 「没记」由段下那句计数说清）；剩下三行（日期／来源／体脂率）逐格是查库真值，一格 `—` 都没有。
  const r = runWrite(dir, KEY_C_ADD, { source: 'gym', bodyFatPct: 18.5, date: '2026-09-11' });
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const rows = sectionRows(r.html, '这次记下的', 'new');
  assert.deepEqual(rows.map(([k]) => k), ['日期', '来源', '体脂率'],
    '缺值的 7 点与空备注整行不摆：' + JSON.stringify(rows.map(([k]) => k)));
  assert.equal(rows.filter(([, v]) => v === MISSING).length, 0, '上屏的行不得有 `—` 格');
  for (const [, v] of rows) assert.notEqual(v, '', '上屏的格不得留空串');
  assert.ok(visible(r.html).includes('另有 8 项这次没记'),
    '缺了几项由段下那句计数说清：' + visible(r.html).slice(0, 200));
  console.log('T365-DASH-VISIBLE 体脂上屏行=' + rows.length + ' 全为查库真值');
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
  const delRows = sectionRows(del.html, '删除前的原值', 'old');
  assertRows('防回显/删体脂', delRows, KEY_C_RM, dbRow(dir, KEY_C_RM, idc), 'delete');
  assert.ok(delRows.some(([k, v]) => k === '体脂率' && v === '33.3'), '删前快照须读库内 33.3：' + JSON.stringify(delRows.slice(0, 3)));
  assert.ok(!delRows.some(([k, v]) => k === '体脂率' && v === '18.5'), '页面不得再出现种子旧值 18.5');

  // 记类：同日已有记录那一块同样读库（直改 86 → 111 后跑「补记围度」）
  pokeDb(dir, "UPDATE body_measurements SET waist_cm = 111 WHERE date = '2026-09-06'");
  const back = runWrite(dir, KEY_M_ADD, { waistCm: 86, date: '2026-09-06' });
  assert.equal(back.status, 0, 'stderr=' + back.stderr.slice(-300));
  const existing = sectionRows(back.html, '同一天还记过这条', 'new');
  assert.ok(existing !== null, '补记命中同日既有记录时应有「同一天还记过这条」段');
  assert.equal(existing.find(([k]) => k === '腰围')?.[1], '111', '既有记录那一块须读库内 111：' + JSON.stringify(existing.slice(0, 2)));
  console.log('T365-ANTI-ECHO 删体脂快照体脂率=' + delRows.find(([k]) => k === '体脂率')?.[1]
    + ' 同日已有腰围=' + existing.find(([k]) => k === '腰围')?.[1]);
});

/* ── id 卡三态 ＋ M5 自证 ＋ 撤销入口 ＋ 复制区 ── */

test('#365 id 卡三态：图标＋三态词＋色档三样都由 op 驱动（新增／删除），同一页只出现一处徽章', () => {
  const dir = mkTmpDb();
  // #539 收口：徽章标签多一条规则——落库日期早于写入日即补记（J6），与唤醒词无关。
  // 本用例的 add 必须落在"今天"（否则按规则出补记徽章，见下）；墙钟哪天跑都成立。
  const today = new Date().toISOString().slice(0, 10);
  const add = runWrite(dir, KEY_M_ADD, { waistCm: 85, date: today });
  const del = runWrite(dir, KEY_M_RM, { id: rowsOf(dir, "SELECT id FROM body_measurements WHERE date='2026-09-06'")[0].id });
  for (const [name, r, op] of [['记围度', add, 'create'], ['删围度', del, 'delete']]) {
    assert.equal(r.env.data.receipt.op, op, name + ' 回执 op');
    const word = OPERATION_LABELS[op];
    const icon = OPERATION_ICONS[op];
    // 三样都查（老正本 `:192-197` 的标签／色档／图标三张表）：色档落在公共层徽章档名上。
    const re = new RegExp('class="ilife-status-badge ilife-status-badge-' + OPERATION_TONES[op] + '">([^<]*)<', 'g');
    const texts = [...r.html.matchAll(re)].map((m) => m[1]);
    assert.equal(texts.length, 1, name + ' 同一页只应出现一处 id 卡三态徽章，实测 ' + JSON.stringify(texts));
    assert.ok(texts[0].includes(icon),
      name + ' 徽章须带三态图标「' + icon + '」（老 `:194` 的 opIcons），实测「' + texts[0] + '」');
    assert.ok(texts[0].includes(word),
      name + ' 徽章须带三态词「' + word + '」（老 `:192` 的 opLabels），实测「' + texts[0] + '」');
  }
  console.log('T365-IDCARD 记围度=' + OPERATION_ICONS.create + ' ' + OPERATION_LABELS.create
    + ' 删围度=' + OPERATION_ICONS.delete + ' ' + OPERATION_LABELS.delete);
});

test('#365 补记徽章：落库日期早于写入日时徽章写「补记」（J6 规则回归）', () => {
  const dir = mkTmpDb();
  const r = runWrite(dir, KEY_M_ADD, { waistCm: 86, date: '2026-09-06' });
  assert.equal(r.status, 0, '补记写入 exit 0，stderr=' + r.stderr.slice(-200));
  const re = new RegExp('class="ilife-status-badge ilife-status-badge-' + OPERATION_TONES.create + '">([^<]*)<', 'g');
  const texts = [...r.html.matchAll(re)].map((m) => m[1]);
  assert.equal(texts.length, 1, '同一页只应出现一处徽章，实测 ' + JSON.stringify(texts));
  assert.ok(texts[0].includes('✓') && texts[0].includes('补记'),
    '落库日期早于写入日时徽章应为「✓ 补记」（色档沿用新增档），实测「' + texts[0] + '」');
  console.log('T365-BACKFILL 徽章=' + texts[0].trim());
});

test('#365 值槽：增类全页现值落新值槽（无一格进旧槽被画成删除线）；删类全页落旧值槽', () => {
  const dir = mkTmpDb();
  const lines = [];
  for (const [name, key, params] of runSeven(dir)) {
    const r = runWrite(dir, key, params);
    assert.equal(r.status, 0, name + ' exit 0，stderr=' + r.stderr.slice(-200));
    const op = r.env.data.receipt.op;
    const wantNew = op !== 'delete';
    const all = [...r.html.matchAll(ROW_RE)].map((m) => ({ label: m[1], old: m[2], new: m[3] }));
    assert.ok(all.length > 0, name + '（op=' + op + '）页内应有逐格行');
    for (const row of all) {
      // **全页扫**：不只「记录现值」那一段——同日已有记录那一块同样不许进旧槽。
      assert.equal(wantNew ? row.old : row.new, '',
        name + '（op=' + op + '）的「' + row.label + '」落错槽：' + JSON.stringify(row));
      assert.notEqual(wantNew ? row.new : row.old, '', name + ' 的「' + row.label + '」应有值');
    }
    // 判据的机理面：旧槽的红删除线是真的（落错槽看得见），从**产物自带 CSS** 读出。
    assert.match(r.html, /\.ilife-block-change-row-old\s*\{[^}]*text-decoration:\s*line-through/,
      name + ' 产物自带 CSS 里旧槽应是删除线');
    lines.push(name + ' op=' + op + ' 槽=' + (wantNew ? 'new' : 'old') + ' 行=' + all.length);
  }
  console.log('T365-SLOT ' + lines.join(' ｜ '));
});

test('#365 M5 自证进整页：读者核得着的三样都在页上，代码怎么取数的两样不上屏', () => {
  const dir = mkTmpDb();
  const r = runWrite(dir, KEY_C_ADD, { source: 'gym', bodyFatPct: 18.5, date: '2026-09-11' });
  const text = visible(r.html);
  // #537：`影响行数来源`（值恒是内部计数器）与 `记录号来源`（值恒是内部枚举）两行整行撤——
  // 它们说的是代码怎么取数，读者核不了，且 `sqlite:total_changes` 是点名不上屏的内部标识符。
  for (const token of ['sqlite:total_changes', '记录号来源', '影响行数来源', 'body_composition']) {
    assert.ok(!text.includes(token), '#537 内部标识符不得上屏：' + token);
  }
  const rc = r.env.data.receipt;
  assert.equal(rc.m5Contract, '1', 'M5 契约版本（回执载荷里仍带）');
  assert.equal(rc.affectedRowsSource, 'sqlite:total_changes', '影响行数来源（回执载荷里仍带）');
  assert.equal(rc.idSource, 'record', '记录号来源（回执载荷里仍带）');
  // 页上留的是读者能核对的三样：影响行数（与回执读数同值）／回执格式／写入时间。
  assert.ok(text.includes('影响行数') && text.includes(rc.affectedRows + ' 行'), '页上影响行数 == 回执读数');
  assert.ok(text.includes('回执格式') && text.includes('v' + rc.m5Contract), '页上回执格式');
  assert.ok(text.includes(rc.meta.actionAt), '页上写入时间 == 回执读数');
  console.log('T365-M5 affectedRows=' + rc.affectedRows + ' idSource=' + rc.idSource + ' 契约=v' + rc.m5Contract);
});

/* ── #537 重排：页头／内部标识符／结论一页一处（七页共用一条判据） ── */

test('#537 回执七页：页头三处不带 `·`、标题按唤醒词读得懂、内部标识符与主键不上屏', () => {
  const dir = mkTmpDb();
  /** 七条写词各跑一次（与 `runSeven` 同一组参数），逐页查四类债。 */
  const pages = [];
  for (const [name, key, params] of runSeven(dir)) {
    const r = runWrite(dir, key, params);
    assert.equal(r.status, 0, name + ' exit 0，stderr=' + r.stderr.slice(-200));
    pages.push([name, key, visible(r.html), r.html]);
  }
  assert.equal(pages.length, 7, '七条写词各跑一次');
  for (const [name, key, text, html] of pages) {
    // ① 页头三处 `·` 清零：`<title>`／眉标／H1 都换成读者看得懂的页名（R1 节点级命中 0 的其中三处）。
    const title = /<title>([^<]*)<\/title>/.exec(html);
    assert.ok(title && !title[1].includes('·'), name + ' 页签名不得带 `·`：' + (title && title[1]));
    assert.ok(!/ilife-block-page-shell-eyebrow">[^<]*·/.test(html), name + ' 眉标不得带 `·`');
    const h1 = /ilife-block-page-shell-title">([^<]*)</.exec(html);
    assert.ok(h1 && h1[1] !== '' && !h1[1].includes('·'), name + ' H1 不得带 `·`：' + (h1 && h1[1]));
    // 副标题整行撤：回执摘要与结论条说的是同一件事，只留一处。
    assert.ok(!html.includes('class="sub"'), name + ' 不得再有副标题（结论条一处说清）');
    // ② 库内世界不上屏：库表名／库文件名／内部计数器／记录主键／CLI 参数名。
    for (const token of ['body_composition', 'body_measurements', 'calorie_data.db', 'sqlite:total_changes', '删除标志', 'waistCm', 'hipCm']) {
      assert.ok(!text.includes(token), name + ' 内部标识符不得上屏：' + token);
    }
    assert.ok(!/(?:^|\s)#\d+(?:\s|$)/.test(text), name + ' 可见文本不得出现记录主键：' + text.slice(0, 80));
    // ③ 逐格快照的口径行只留读者话（括号里那截库内口径整段撤）。
    assert.ok(!text.includes('逐格读自库内'), name + ' 不得再印「逐格读自库内」');
    assert.ok(!text.includes('同一事实') && !text.includes('body_'), name + ' 内部叫法不上屏');
    // ④ 库内 ↔ 页面同源：这一页的逐格段仍在（删类读旧槽、记类读新槽）。
    const rows = sectionRows(html, key.includes('remove') ? '删除前的原值' : '这次记下的', key.includes('remove') ? 'old' : 'new');
    assert.ok(rows !== null && rows.length > 0, name + ' 逐格段仍在');
  }
  console.log('T537-HEADER 七页页头/内部标识符读数：' + pages.map(([n]) => n).join('、'));
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
    const rows = sectionRows(r.html, key.includes('remove') ? '删除前的原值' : '这次记下的',
      key.includes('remove') ? 'old' : 'new');
    assertRows(name, rows, key, row, key.includes('remove') ? 'delete' : 'create');
    lines.push(name + '=' + sixReadings(r).cssBytes + 'B');
  }
  console.log('T365-SUMMARY ' + lines.join(' '));
});
