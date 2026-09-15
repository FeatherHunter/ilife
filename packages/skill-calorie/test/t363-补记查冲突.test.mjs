/** #363 · 补记查冲突（真出口验收）：同一天已有记录时，**先把既有那条的字段值摆出来**再让用户确认。
 *
 * 需求原文（票面权威）：唤醒词「补记体脂」／「补记围度」的 prompt 逐字——「我要补录之前某天的体脂／围度
 * 测量(不是今天的)。**如果那天已有记录,请先告诉我冲突再确认**」（`src/triggers/scene-08-body.ts:8-9`）。
 * 验收＝**造一条与既有记录同日的数据后跑补记 → 可见文本里的既有值逐字等于脚本查库值**；负向＝把冲突检查
 * 短路 → 必红；不许动＝**写库行为本身（补记仍然写）**。
 *
 * 期望值来源（只认手写样例 ＋ 脚本查库，不拿新实现输出当期望）：
 *   ① **手写样例**（下面的 `SEED_*` 与 `PART_13`）：体脂既有 1 条（gym／18.5%／胸 10、腹 12、其余 5 槽空），
 *      围度既有 1 条（腰 86／臀 95、其余 11 项空）与同日 2 条那一组；每格期望值由种子直接读出。
 *   ② **脚本查库**：同一条 tmp 库上另开 `node:sqlite` 句柄，把可见文本解析出的值与库内原始列值逐格比。
 *   ③ **基准** `docs/skills/skill-calorie/t395-融合基准.md` §四 裁定 2：可见文本缺项写 `—`、
 *      原始空值留在数据层与库内（**两条分开断言**，不许互相顶替）。
 *   ④ **唯一来源**：13 部位中文名取 `fetch/body.ts` 的 `MEASUREMENT_ZH`（#440 已收成一处，本文件写死一份
 *      冻结副本并与它逐字对账）；7 点站名取 `body/bodyPlate.ts` 的 `CALIPER_SITE_LABELS`（#359）。
 * 负向对照（源码级变异，持锁另做，两行机器读数见 `docs/skills/skill-calorie/t363-冲突证据.md`）：
 *   M1 把 `body/log.ts` 的写前查同日短路（`existing` 恒空）→ 「同日必有冲突段」判据必红；还原 ⇒ 必绿。
 *   M2 把既有值取错列（`body_fat_pct` → `caliper_chest_mm`）→ 「逐字等于查库值」判据必红；还原 ⇒ 必绿。
 * 运行：先 `npx tsc -b packages/skill-calorie`（本票不走 `pnpm --filter skill-calorie build`），再
 *   `node --test packages/skill-calorie/test/t363-补记查冲突.test.mjs`。
 * 真库零写入：一切数据走 mkdtemp tmp 库（`SKILLS_DB_PATH` 指过去），真库一个字节不动。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { MEASUREMENT_FIELDS, MEASUREMENT_ZH, compositionsOnDate, measurementsOnDate } from '../dist/fetch/body.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const ROUTES = join(HERE, '..', 'src', 'body', 'routes.ts');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILE = 'calorie_data.db';

/** 缺值占位（裁定 2 的可见文本那一半；取数层与库内不给这个字）。 */
const MISSING = '—';

/** 两条写命令的键（票面：命令名以 `src/body/commands.ts` 注册表为准）。 */
const KEY_C = 'calorie.body.composition-add';
const KEY_M = 'calorie.body.measure-add';

/** 手写样例的四个日期：D＝有既有记录；D2＝无既有记录（对照，不许恒打）；D3＝同日两条。 */
const D_C = '2026-09-05';
const D_C2 = '2026-09-04';
const D_M = '2026-09-06';
const D_M2 = '2026-09-03';
const D_M3 = '2026-09-02';

/** 手写样例①：体脂既有记录（其余 5 个皮褶槽为 `null`）。 */
const SEED_C = { source: 'gym', bodyFatPct: 18.5, chest: 10, abdominal: 12 };

/** 手写样例①：围度既有记录（腰 86／臀 95，其余 11 项 `null`）。 */
const SEED_M = { waist_cm: 86, hip_cm: 95 };

/** 手写样例①：同日两条（第二条只填腹围）。 */
const SEED_M3 = [{ waist_cm: 80 }, { abdomen_cm: 78 }];

/** 13 部位冻结名表（与 `MEASUREMENT_FIELDS` 逐位对齐；票面用词：肩部＝「肩围」）。 */
const PART_13 = [
  '胸围', '腰围', '腹围', '臀围', '左大腿', '右大腿', '左小腿', '右小腿',
  '左上臂', '右上臂', '左前臂', '右前臂', '肩围',
];

/** 7 点站名冻结表（`body/bodyPlate.ts` 的 `CALIPER_SITE_LABELS` 同字同序）。 */
const SITE_7 = ['胸', '腹', '大腿', '三头肌', '肩胛下', '髂上', '腋中线'];

/** 来源中文名冻结表（`kcal.ts` 的 `SOURCE_LABELS` 同字）。 */
const SRC_ZH = { home_caliper: '家测皮褶钳', gym: '健身房 InBody', hospital: '医院测' };

const CALIPER_COLS = [
  'caliper_chest_mm', 'caliper_abdominal_mm', 'caliper_thigh_mm', 'caliper_tricep_mm',
  'caliper_subscapular_mm', 'caliper_suprailiac_mm', 'caliper_midaxillary_mm',
];

/** 造一条 tmp 库并播下手写样例（既有记录**由 SQL 直插**，不经命令——期望值不来自实现）。 */
function mkTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 't363-'));
  const db = openDb(join(dir, DB_FILE));
  const cCols = ['date', 'source', 'body_fat_pct', ...CALIPER_COLS, 'note'];
  const cStmt = db.prepare('INSERT INTO body_composition (' + cCols.join(', ') + ') VALUES ('
    + cCols.map(() => '?').join(', ') + ')');
  cStmt.run(D_C, SEED_C.source, SEED_C.bodyFatPct, SEED_C.chest, SEED_C.abdominal, null, null, null, null, null, '');
  const mCols = ['date', ...MEASUREMENT_FIELDS, 'note'];
  const mStmt = db.prepare('INSERT INTO body_measurements (' + mCols.join(', ') + ') VALUES ('
    + mCols.map(() => '?').join(', ') + ')');
  mStmt.run(D_M, ...MEASUREMENT_FIELDS.map((f) => SEED_M[f] ?? null), '');
  for (const row of SEED_M3) mStmt.run(D_M3, ...MEASUREMENT_FIELDS.map((f) => row[f] ?? null), '');
  db.close();
  return dir;
}

/** 只读查询同一条 tmp 库（可见文本的对照物＝**脚本查库值**）。 */
function rowsOf(dir, sql, ...args) {
  const db = openDb(join(dir, DB_FILE));
  try { return db.prepare(sql).all(...args); } finally { db.close(); }
}

/** 真出口：跑一条写命令（SKILLS_DB_PATH 指 tmp 库），回执、落盘页、可见文本一并取回。 */
function runWrite(dir, key, params) {
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(r.stdout); } catch { /* 非 0 退出时 stdout 可能不是 JSON */ }
  const out = env?.data?.output;
  const html = typeof out === 'string' ? readFileSync(out, 'utf8') : '';
  return {
    status: r.status, env, html, text: visible(html),
    message: String(env?.data?.message ?? ''), stderr: String(r.stderr || ''),
  };
}

/** 可见文本：剥 script／style／标签（判据只看用户能看见的字）。 */
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

/** 冲突段**结构化解析**（不做全文 `includes`）：`冲突：<日> 已有 N 条<表名>记录 #id（<既有值>）…。已记…`。
 *  `(?:^| )` 是为了同一段文字在回执 `message` 里起头、在剥标签后的整页可见文本里跟在标题后。 */
function parseConflict(message) {
  const head = /(?:^| )冲突：(\d{4}-\d{2}-\d{2}) 已有 (\d+) 条(体脂|围度)记录 ([\s\S]*?)。(?:已记)/.exec(message);
  if (head === null) return null;
  const rows = [...head[4].matchAll(/#(\d+)（([^）]*)）/g)].map((m) => ({ id: Number(m[1]), parts: m[2].split('；') }));
  return { date: head[1], count: Number(head[2]), what: head[3], rows };
}

/** `标签 值` 逐对文本（项间「、」）→ 有序 `[标签, 值]`（标签里无空格，值里可以有：如「健身房 InBody」）。 */
function pairsOf(text) {
  return text.split('、').map((seg) => {
    const i = seg.indexOf(' ');
    assert.ok(i > 0, '「标签 值」格式不成立：' + seg);
    return [seg.slice(0, i), seg.slice(i + 1)];
  });
}

/** 逐格比对：可见文本那一格 == 库内原始值的文本（缺项两边分别是 `—` 与 `null`／空串）。 */
function assertCell(pair, raw, where) {
  const expect = raw === null || raw === undefined || raw === '' ? MISSING : String(raw);
  assert.equal(pair[1], expect, where + ' 可见文本「' + pair[0] + '」格=' + pair[1] + '，查库=' + expect);
}

/** 落盘页里某一段（口径行为界）的 `[标签, 值]` 有序对（与 `t365-七条写词整页.test.mjs:215`
 *  的 `sectionRows()` 同一判据）。**#537 重排**：既有记录那一块改由「同一天还记过这条」承载
 *  ——原先那件事是把整句回执摘要当副标题压在页头，与读数卡／逐格表各说一遍。 */
const CHANGE_ROW_RE = new RegExp(
  '<div class="ilife-block-change-row">'
  + '<span class="ilife-block-change-row-label">([^<]*)</span>'
  + '<span class="ilife-block-change-row-old">([^<]*)</span>'
  + '<span class="ilife-block-change-row-arrow"[^>]*>[^<]*</span>'
  + '<span class="ilife-block-change-row-new">([^<]*)</span>'
  + '</div>',
  'g',
);

function sectionRows(html, prefix, slot) {
  for (const seg of String(html).split('<p class="ilife-block-caliber">').slice(1)) {
    const end = seg.indexOf('</p>');
    if (end < 0 || !seg.slice(0, end).startsWith(prefix)) continue;
    return [...seg.slice(end).matchAll(CHANGE_ROW_RE)].map((m) => [m[1], slot === 'old' ? m[2] : m[3]]);
  }
  return null;
}

/* ── 判据①：同日已有记录 → exit 0（补记仍写）＋ 可见文本既有值逐字等于脚本查库值 ── */

test('#363 判据①体脂：同日已有记录 → 冲突段摆在最前，既有值逐格 == 查库值，补记照写', () => {
  const dir = mkTmpDb();
  const r = runWrite(dir, KEY_C, { source: 'gym', bodyFatPct: 19, date: D_C });
  assert.equal(r.status, 0, '补记必须 exit 0（冲突不拦写），stderr=' + r.stderr.slice(-300));

  const sql = rowsOf(dir, 'SELECT id, date, source, body_fat_pct, ' + CALIPER_COLS.join(', ')
    + " FROM body_composition WHERE date = ? AND COALESCE(is_deprecated, 0) = 0 ORDER BY id ASC", D_C);
  assert.equal(sql.length, 2, '补记仍然写：D 日应有既有 1 条 ＋ 本次 1 条，实测 ' + sql.length);
  const old = sql.find((x) => x.id !== r.env.data.receipt.recordId);
  assert.ok(old, '库里应能认出既有那条（id != 本次回执 recordId）');

  // ① 可见文本（回执 message 那一面）：冲突段在最前，先摆既有值
  for (const [what, text, atHead] of [['message', r.message, true]]) {
    if (atHead) assert.ok(text.startsWith('冲突：'), what + ' 必须先出冲突段：' + text.slice(0, 120));
    const c = parseConflict(text);
    assert.ok(c, what + ' 冲突段格式不合：' + text.slice(0, 160));
    assert.equal(c.what, '体脂', what + ' 冲突段点名的表');
    assert.equal(c.date, D_C, what + ' 冲突段点名的日期 == 本次补记日');
    assert.equal(c.count, 1, what + ' 冲突段条数 == 既有 1 条（本次这条不许算进去）');
    assert.equal(c.rows.length, 1, what + ' 冲突段逐条摆出：' + JSON.stringify(c.rows));
    assert.equal(c.rows[0].id, old.id, what + ' 冲突段点名的 id == 既有那条 id');

    // ② 既有值逐字等于脚本查库值（逐格）
    const [p0, p1, p2, p3] = c.rows[0].parts;
    assertCell(pairsOf(p0)[0], SRC_ZH[old.source], what + '/来源');
    assertCell(['体脂率', p1.slice('体脂率 '.length).replace(/%$/, '')], old.body_fat_pct, what + '/体脂率');
    const sites = pairsOf(p2.slice('皮褶 7 点 '.length));
    assert.deepEqual(sites.map(([k]) => k), SITE_7, what + ' 7 点站名逐位：' + JSON.stringify(sites));
    for (let i = 0; i < 7; i++) assertCell(sites[i], old[CALIPER_COLS[i]], what + '/皮褶 ' + SITE_7[i]);
    assert.equal(p3, '备注 ' + MISSING, what + ' 空备注写 `—`：' + p3);
  }

  // ①′ 落盘页（读者看的那一面）：#537 重排后同一事实改由**形状**承载——「同一天还记过这条」
  //     那一块逐格摆出既有值（带主键的整句摘要不再压上页头，库内世界不上屏）。
  const pageRows = sectionRows(r.html, '同一天还记过这条', 'new');
  assert.ok(pageRows !== null, '落盘页应有「同一天还记过这条」块：' + r.text.slice(0, 160));
  // #537：只摆**有值的行**（缺值不占位）——故只比这一版页面上真的上屏的那几项，
  // 逐格仍是查库真值；标签序照库列序。
  const filled = (v) => v !== null && v !== undefined && String(v) !== '';
  const wantLabels = ['日期', '来源', '体脂率',
    ...SITE_7.filter((_, i) => filled(old[CALIPER_COLS[i]])),
    ...(filled(old.note) ? ['备注'] : [])];
  assert.deepEqual(pageRows.map(([k]) => k), wantLabels,
    '既有记录块标签序（只比上屏的项）：' + JSON.stringify(pageRows.map(([k]) => k)));
  const get = (k) => (pageRows.find(([x]) => x === k) || [])[1];
  /** 可见文本那一格的期望值（裁定 2 的可见文本口径：缺项写 `—`）。 */
  const want = (raw) => (raw === null || raw === undefined || raw === '' ? MISSING : String(raw));
  assert.equal(get('日期'), want(old.date), '落盘页/既有日期 == 查库值');
  assert.equal(get('来源'), want(SRC_ZH[old.source]), '落盘页/来源 == 查库值');
  assert.equal(get('体脂率'), want(old.body_fat_pct), '落盘页/体脂率 == 查库值');
  for (let i = 0; i < 7; i++) {
    if (old[CALIPER_COLS[i]] === null || old[CALIPER_COLS[i]] === undefined) continue;
    assert.equal(get(SITE_7[i]), want(old[CALIPER_COLS[i]]), '落盘页/皮褶 ' + SITE_7[i]);
  }
  assert.ok(!r.text.includes('#' + old.id), '落盘页不再印既有记录的主键（#537）：' + r.text.slice(0, 120));
  assert.ok(!r.text.includes('body_composition'), '落盘页不印库表名（#537）');

  // ② 本次结论照旧写在后头（写库回执一字未丢）
  assert.ok(r.message.endsWith('已记体脂：' + D_C + ' 健身房 InBody 19%'), '回执结论句：' + r.message.slice(-60));

  // ④ 结构化载荷：冲突行带既有记录 id／日期（原始值），本次记录 id 仍是回执 recordId
  const items = r.env.data.receipt.items;
  assert.equal(items.length, 2, 'items ＝ 冲突 1 行 ＋ 本次 1 行：' + JSON.stringify(items));
  assert.equal(items[0].id, old.id, 'items[0] 是既有那条');
  assert.equal(items[0].date, D_C, 'items[0].date 原始日期');
  assert.equal(items[0].status, '同日已有记录（冲突）', 'items[0].status');
  assert.equal(items[1].id, r.env.data.receipt.recordId, 'items[1] 是本次写的那条');
  assert.equal(items[1].status, '成功', 'items[1].status');
  console.log('T363-CONFLICT-C exit=' + r.status + ' 既有id=' + old.id + ' 新id=' + r.env.data.receipt.recordId
    + ' 库里同日=' + sql.length + ' 段=' + JSON.stringify(r.message.slice(0, 96)));
});

test('#363 判据①围度：同日已有记录 → 13 部位逐格摆出（已填原值／缺项 `—`），补记照写', () => {
  const dir = mkTmpDb();
  const r = runWrite(dir, KEY_M, { waistCm: 86.5, date: D_M });
  assert.equal(r.status, 0, '补记必须 exit 0，stderr=' + r.stderr.slice(-300));

  const sql = rowsOf(dir, 'SELECT id, date, ' + MEASUREMENT_FIELDS.join(', ')
    + " FROM body_measurements WHERE date = ? AND COALESCE(is_deprecated, 0) = 0 ORDER BY id ASC", D_M);
  assert.equal(sql.length, 2, '补记仍然写：D 日应有既有 1 条 ＋ 本次 1 条');
  const old = sql.find((x) => x.id !== r.env.data.receipt.recordId);

  const c = parseConflict(r.message);
  assert.ok(c, '冲突段必须出现：' + r.message.slice(0, 160));
  assert.equal(c.what, '围度');
  assert.equal(c.count, 1);
  assert.equal(c.rows[0].id, old.id);

  // 13 部位逐项：标签 == 冻结名表（并与 `MEASUREMENT_ZH` 唯一来源逐字对账），值逐格 == 查库值
  const pairs = pairsOf(c.rows[0].parts[0]);
  assert.deepEqual(pairs.map(([k]) => k), PART_13, '13 部位名逐位：' + JSON.stringify(pairs.map(([k]) => k)));
  for (let i = 0; i < 13; i++) {
    const f = MEASUREMENT_FIELDS[i];
    assert.equal(MEASUREMENT_ZH[f], PART_13[i], '冻结名表 == MEASUREMENT_ZH（唯一来源）：' + f);
    assertCell(pairs[i], old[f], '围度/' + PART_13[i]);
  }
  // 已填 2 项是原值、11 项缺值写 `—`（手写样例的直接推论）
  assert.equal(pairs.filter(([, v]) => v === MISSING).length, 11, '缺项数 == 11');
  assert.deepEqual(pairs.filter(([, v]) => v !== MISSING), [['腰围', '86'], ['臀围', '95']], '已填项照原值');
  assert.equal(c.rows[0].parts[1], '备注 ' + MISSING, '空备注写 `—`');
  assert.ok(r.message.endsWith('已记围度：' + D_M + '（waistCm 86.5）'), '回执结论句：' + r.message.slice(-60));
  console.log('T363-CONFLICT-M exit=' + r.status + ' 既有id=' + old.id + ' 缺项=' + pairs.filter(([, v]) => v === MISSING).length
    + '/13 已填=' + JSON.stringify(pairs.filter(([, v]) => v !== MISSING)));
});

test('#363 判据①同日多条：既有 2 条时逐条摆出（不取首条、不合并）', () => {
  const dir = mkTmpDb();
  const r = runWrite(dir, KEY_M, { waistCm: 81, date: D_M3 });
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const sql = rowsOf(dir, 'SELECT id, waist_cm, abdomen_cm FROM body_measurements WHERE date = ? ORDER BY id ASC', D_M3);
  assert.equal(sql.length, 3, '同日 3 条（既有 2 ＋ 本次 1）');
  const c = parseConflict(r.message);
  assert.ok(c, '冲突段必须出现：' + r.message.slice(0, 160));
  assert.equal(c.count, 2, '冲突段条数 == 既有 2 条');
  assert.deepEqual(c.rows.map((x) => x.id), sql.slice(0, 2).map((x) => x.id), '逐条按 id 升序列出');
  for (let i = 0; i < 2; i++) {
    const pairs = pairsOf(c.rows[i].parts[0]);
    assertCell(pairs[1], sql[i].waist_cm, '第 ' + i + ' 条/腰围');
    assertCell(pairs[2], sql[i].abdomen_cm, '第 ' + i + ' 条/腹围');
  }
  console.log('T363-CONFLICT-MULTI exit=' + r.status + ' 条数=' + c.count + ' ids=' + JSON.stringify(c.rows.map((x) => x.id)));
});

/* ── 判据②：换一天（无既有记录）→ 可见文本不出现冲突段（不许恒打） ── */

test('#363 判据②：无既有记录的那天，回执里冲突段一个字都不出现（逐字等于旧口径）', () => {
  const dir = mkTmpDb();
  const c = runWrite(dir, KEY_C, { source: 'gym', bodyFatPct: 19, date: D_C2 });
  assert.equal(c.status, 0, 'stderr=' + c.stderr.slice(-300));
  assert.equal(c.message, '已记体脂：' + D_C2 + ' 健身房 InBody 19%', '无冲突 ⇒ 回执就是旧口径那一句');
  assert.equal(parseConflict(c.message), null, '不许恒打冲突段');
  const m = runWrite(dir, KEY_M, { waistCm: 86, date: D_M2 });
  assert.equal(m.status, 0, 'stderr=' + m.stderr.slice(-300));
  assert.equal(m.message, '已记围度：' + D_M2 + '（waistCm 86）', '无冲突 ⇒ 回执就是旧口径那一句');
  assert.equal(parseConflict(m.message), null, '不许恒打冲突段');
  // 同一条库里有别的日期的记录 ⇒ 说明「无冲突」是按**当天**判的，不是「库空才不打」
  const other = rowsOf(dir, 'SELECT COUNT(*) AS n FROM body_measurements WHERE date = ?', D_M);
  assert.equal(other[0].n, 1, '同库其它日期有记录（对照成立）');
  console.log('T363-NOCONFLICT 体脂="' + c.message + '" 围度="' + m.message + '"');
});

/* ── 裁定 2：可见文本 `—` ／ 原始空值（两条分开断言，不互相顶替） ── */

test('#363 裁定2-可见：缺项在可见文本里是 `—`（按格定位，不做全文 includes）', () => {
  const dir = mkTmpDb();
  const r = runWrite(dir, KEY_M, { waistCm: 86.5, date: D_M });
  const pairs = pairsOf(parseConflict(r.message).rows[0].parts[0]);
  const dash = pairs.filter(([, v]) => v === MISSING).map(([k]) => k);
  assert.deepEqual(dash, PART_13.filter((x) => x !== '腰围' && x !== '臀围'), '缺项逐格写 `—`：' + JSON.stringify(dash));
  for (const [, v] of pairs) assert.notEqual(v, '', '缺值格不得留空串');
  console.log('T363-DASH-VISIBLE 缺项=' + dash.length + ' 名单=' + JSON.stringify(dash));
});

test('#363 裁定2-原始空值：库内与取数层保留 `null`（可见文本的 `—` 不回写、不互染）', () => {
  const dir = mkTmpDb();
  runWrite(dir, KEY_M, { waistCm: 86.5, date: D_M });
  const fresh = rowsOf(dir, 'SELECT ' + MEASUREMENT_FIELDS.join(', ') + ' FROM body_measurements WHERE id = ?',
    rowsOf(dir, 'SELECT MAX(id) AS id FROM body_measurements')[0].id)[0];
  assert.equal(fresh.chest_cm, null, '本次写入的未传字段仍是 `null`（不是 `—`）');
  assert.equal(fresh.shoulder_cm, null, '本次写入的未传字段仍是 `null`（不是 `—`）');
  const all = rowsOf(dir, 'SELECT ' + MEASUREMENT_FIELDS.join(', ') + ', note FROM body_measurements WHERE id = ?',
    rowsOf(dir, 'SELECT MAX(id) AS id FROM body_measurements')[0].id)[0];
  for (const f of MEASUREMENT_FIELDS) assert.notEqual(all[f], MISSING, '库内不得存 `—`：' + f);
  // 取数层直调：同日既有记录给的是原始列值（这条断言与上面的可见文本断言分开成立）
  const db = openDb(join(dir, DB_FILE));
  let existing;
  try {
    existing = measurementsOnDate(db, D_M);
    assert.equal(compositionsOnDate(db, D_C).length, 1, '体脂同日取数口（同一口径的姊妹函数）');
  } finally { db.close(); }
  assert.equal(existing.length, 2, '同日取数口给 D 日两条');
  assert.equal(existing[0].chest_cm, null, '取数层给 `null`，不给 `—`');
  assert.equal(existing[0].waist_cm, 86, '取数层给原始数字');
  const rows = rowsOf(dir, 'SELECT id FROM body_measurements WHERE date = ? ORDER BY id ASC', D_M);
  assert.equal(rows.length, 2, 'D 日两条');
  const old = rowsOf(dir, 'SELECT chest_cm, waist_cm, shoulder_cm FROM body_measurements WHERE id = ?', rows[0].id)[0];
  assert.deepEqual({ ...old }, { chest_cm: null, waist_cm: 86, shoulder_cm: null }, '既有那行的原始列值：' + JSON.stringify(old));
  console.log('T363-RAW-NULL 既有行=' + JSON.stringify(old) + ' 本次行胸围=' + JSON.stringify(fresh.chest_cm));
});

/* ── 接通面：两条唤醒词指到哪条命令（只读断言，routes.ts 本票一行不碰） ── */

test('#363 接通面：唤醒词「补记体脂」／「补记围度」仍指向本票改的两条命令', () => {
  const lines = readFileSync(ROUTES, 'utf8').split('\n');
  const hit = (wake) => lines.find((l) => l.includes("wakeWord: '" + wake + "'")) ?? '';
  const c = hit('补记体脂');
  const m = hit('补记围度');
  assert.ok(c.includes("key: '" + KEY_C + "'"), '「补记体脂」→ ' + KEY_C + '：' + c.trim());
  assert.ok(m.includes("key: '" + KEY_M + "'"), '「补记围度」→ ' + KEY_M + '：' + m.trim());
  assert.ok(c.includes('calorie-cmd-read ' + KEY_C), '示例照抄即跑：' + c.trim());
  assert.ok(m.includes('calorie-cmd-read ' + KEY_M), '示例照抄即跑：' + m.trim());
  console.log('T363-ROUTE 补记体脂→' + KEY_C + ' 补记围度→' + KEY_M);
});
