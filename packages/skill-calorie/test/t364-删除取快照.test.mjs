/** #364 · 删除取快照（真出口验收）：删前先把这条记录的内容取出来，删完回执带着它。
 *
 * 需求原文（票面权威）：唤醒词「删体脂」／「删围度」的 prompt 逐字——「删除前先给我看这条记录的内容,
 * 确认无误再删,最后给我确认回执」＋老技能同词条 `SKILL.md:1155-1156`「软删除(先列候选 → 快照确认 → 回执)」
 * （`src/triggers/scene-08-body.ts:16-17`）。验收＝**删除回执可见文本含日期／体脂率／来源（逐字等于脚本
 * 查库值）**＋**被删主键在库里不可查**＋**快照文件路径存在可读**；围度那一侧按「13 项里已填的那些」验。
 *
 * 期望值来源（只认手写样例 ＋ 脚本查库 ＋ 需求原文，不拿新实现输出当期望）：
 *   ① **手写样例**（下面的 `SEED_C*`／`SEED_M*`）：每格期望值由种子直接读出；
 *   ② **脚本查库**：**删前**另开 `node:sqlite` 句柄把整行读成基线，再跑命令，逐格比（不是回显输入）；
 *   ③ **基准** `docs/skills/skill-calorie/t395-融合基准.md` §四 裁定 2：可见文本缺项写 `—`、
 *      原始空值留在取数层与库内（**两条分开断言**，不许互相顶替）；
 *   ④ **唯一来源**：13 部位中文名取 `fetch/body.ts` 的 `MEASUREMENT_ZH`、7 点站名取
 *      `body/bodyPlate.ts` 的 `CALIPER_SITE_LABELS`、来源中文名取 `kcal.ts` 的 `SOURCE_LABELS`
 *      （本文件各写一份冻结副本与它们逐字对账，不抄第二份真名表）。
 * 负向对照（源码级变异，持锁另做，两行机器读数见 `docs/skills/skill-calorie/t364-快照证据.md`）：
 *   M1 把回执里的快照段去掉（回旧一行回执）→ 必红；M2 把删前值取成**删后值**（快照读排在置废之后、
 *   且按活行口径）→ 必红；M3 围度标签取错（列名当标签）→ 13 部位名逐位必红。三处还原 ⇒ 必绿。
 *
 * **#365 口径变更（有意改，票面与提交信息写清）**：#365 把身体细节这一族四条写命令的回执从
 *   「原回执片段」换成**整页**（`src/body/receipt.ts` 的 `bodyReceiptDoc`，接在 `cli/write.ts`
 *   装配链第五个口上），片段里那条 `<li> … · 日期 …` 的删前快照行**不再存在**（那是片段形状，
 *   不是本票要验的东西）；本文件的 `detailFromPage()` 随口径改读整页里的新结构——
 *   `renderChangeRows` 的 `change-row` 逐格行（口径行「删除前的原值」之后那一段，与同目录
 *   `t365-七条写词整页.test.mjs` 的 `sectionRows()` 同一判据），**断言意图一字不变**：
 *   删前值逐格、标签序与格数照旧、两处（回执 `items[0].detail` 与落盘页）仍逐格同源。
 *   其余 5 条用例（裁定 2×2／全填／软删语义／接通面）本票一行未动。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`（本票不走 `pnpm --filter skill-calorie build`），再
 *   `node --test packages/skill-calorie/test/t364-删除取快照.test.mjs`。
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
import { MEASUREMENT_FIELDS, MEASUREMENT_ZH, compositionSnapshot, measurementSnapshot } from '../dist/fetch/body.js';
import { CALIPER_SITE_LABELS } from '../dist/body/bodyPlate.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const ROUTES = join(HERE, '..', 'src', 'body', 'routes.ts');
const COMMANDS = join(HERE, '..', 'src', 'body', 'commands.ts');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILE = 'calorie_data.db';

/** 缺值占位（裁定 2 的可见文本那一半；取数层与库内不给这个字）。 */
const MISSING = '—';

/** 两条写命令的键（票面：命令名以 `src/body/commands.ts` 注册表为准）。 */
const KEY_C = 'calorie.body.composition-remove';
const KEY_M = 'calorie.body.measure-remove';

/** 手写样例①体脂：三个来源各一条（有备注／无备注／全空皮褶）。 */
const SEED_C = [
  { date: '2026-09-05', source: 'gym', bodyFatPct: 18.5, calipers: { chest: 10, abdominal: 12 }, note: '晨起' },
  { date: '2026-09-03', source: 'hospital', bodyFatPct: 21.25, calipers: {}, note: '' },
  { date: '2026-09-01', source: 'home_caliper', bodyFatPct: 16.75, calipers: { chest: 9, abdominal: 11, thigh: 13 }, note: '' },
];

/** 手写样例①围度：一条两项（其余 11 项空）、一条 13 项全填。 */
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

/** 造一条 tmp 库并播下手写样例（记录**由 SQL 直插**，不经命令——期望值不来自实现）。 */
function mkTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 't364-'));
  const db = openDb(join(dir, DB_FILE));
  const cCols = ['date', 'source', 'body_fat_pct', ...CALIPER_COLS, 'note'];
  const cStmt = db.prepare('INSERT INTO body_composition (' + cCols.join(', ') + ') VALUES ('
    + cCols.map(() => '?').join(', ') + ')');
  for (const s of SEED_C) {
    cStmt.run(s.date, s.source, s.bodyFatPct,
      ...['chest', 'abdominal', 'thigh', 'tricep', 'subscapular', 'suprailiac', 'midaxillary']
        .map((k) => s.calipers[k] ?? null), s.note);
  }
  const mCols = ['date', ...MEASUREMENT_FIELDS, 'note'];
  const mStmt = db.prepare('INSERT INTO body_measurements (' + mCols.join(', ') + ') VALUES ('
    + mCols.map(() => '?').join(', ') + ')');
  for (const s of SEED_M) mStmt.run(s.date, ...MEASUREMENT_FIELDS.map((f) => s.values[f] ?? null), s.note);
  db.close();
  return dir;
}

/** 只读查询同一条 tmp 库（可见文本的对照物＝**脚本查库值**）。 */
function rowsOf(dir, sql, ...args) {
  const db = openDb(join(dir, DB_FILE));
  try { return db.prepare(sql).all(...args); } finally { db.close(); }
}

/** **删前**取基线整行（跑命令之前读；期望值不来自命令输出）。 */
function rowBefore(dir, table, cols, date) {
  const sel = ['id', 'date', ...cols.filter((c) => c !== 'date')];
  const rows = rowsOf(dir, 'SELECT ' + sel.join(', ') + ' FROM ' + table + ' WHERE date = ? ORDER BY id ASC', date);
  assert.equal(rows.length, 1, table + ' 在 ' + date + ' 应有且仅有 1 条手写样例行，实测 ' + rows.length);
  return rows[0];
}

/** 真出口：跑一条写命令（SKILLS_DB_PATH 指 tmp 库），回执、落盘页路径、可见文本一并取回。 */
function runWrite(dir, key, params) {
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) },
  });
  let env = null;
  try { env = JSON.parse(r.stdout); } catch { /* 非 0 退出时 stdout 可能不是 JSON */ }
  const out = env?.data?.output;
  const html = typeof out === 'string' && existsSync(out) ? readFileSync(out, 'utf8') : '';
  return {
    status: r.status, env, out: typeof out === 'string' ? out : '', html, text: visible(html),
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
  assert.equal(pair[1], expect, where + ' 可见文本「' + pair[0] + '」格=' + pair[1] + '，查库值=' + expect);
}

/** 逐格行标记：整页里 `renderChangeRows` 的产出（label／old／arrow／new 四段一行）。箭头位
 *  `arrow: false` 时 `visibility:hidden` 仍占栏，故正则读到箭位即止，不读它的内容。 */
const CHANGE_ROW_RE = new RegExp(
  '<div class="ilife-block-change-row">'
  + '<span class="ilife-block-change-row-label">([^<]*)</span>'
  + '<span class="ilife-block-change-row-old">([^<]*)</span>'
  + '<span class="ilife-block-change-row-arrow"[^>]*>',
  'g',
);

/** HTML 实体还原：逐格值要与 `items[0].detail` 的**原文**比，不能比转义写法。 */
function unesc(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/** 落盘页里**删前逐格值**那一段的 `标签 值` 逐对文本（项间「、」，可直接喂 `pairsOf()`）。
 *
 * #365 口径变更（有意改）：整页把这份数据面改由 `renderChangeRows` 铺成 `change-row` 逐格行
 * （口径行「删除前的原值」之后那一段），不再是片段里那条 `<li> … · 日期 …` 快照行；
 * 取法与同目录 `t365-七条写词整页.test.mjs` 的 `sectionRows()` 同一判据，**断言意图不变**：
 * 段在、格在、第一格是「日期」、逐格仍与回执 `items[0].detail` 同源。 */
function detailFromPage(html) {
  for (const seg of String(html).split('<p class="ilife-block-caliber">').slice(1)) {
    const end = seg.indexOf('</p>');
    if (end < 0 || !seg.slice(0, end).startsWith('删除前的原值')) continue;
    const rows = [...seg.slice(end).matchAll(CHANGE_ROW_RE)].map((m) => [unesc(m[1]), unesc(m[2])]);
    assert.ok(rows.length > 0, '落盘页「删除前的原值」段应有逐格行（`ilife-block-change-row`）');
    assert.equal(rows[0][0], '日期', '落盘页删前逐格行的第一格应是「日期」：' + JSON.stringify(rows[0]));
    return rows.map(([k, v]) => k + ' ' + v).join('、');
  }
  return assert.fail('落盘页应有「删除前的原值」段（整页口径：口径行 ＋ change-row 逐格行）');
}

/** 回执 `items[0]` 的形状（两处同源：结构化载荷与落盘页）。 */
function assertItemShape(r, id, key) {
  const rc = r.env.data.receipt;
  assert.equal(rc.op, 'delete', key + ' 回执 op');
  assert.equal(rc.recordId, id, key + ' 回执 recordId 指向被删行');
  assert.equal(rc.items.length, 1, key + ' 回执应有 1 条 items');
  assert.equal(rc.items[0].id, id, key + ' items[0].id');
  assert.equal(rc.items[0].status, '已删除（软，不可恢复）', key + ' items[].status 与 prose 同源');
  assert.deepEqual(rc.writtenFields, ['is_deprecated'], key + ' 写入字段');
  return rc.items[0];
}

/** 判据③：「被删主键在库里不可查」按本仓软删口径两半都验——读侧口径查不到 ＋ 行仍在（未物理删）。 */
function assertSoftDeleted(dir, table, id, key) {
  const live = rowsOf(dir, 'SELECT id FROM ' + table + ' WHERE id = ? AND COALESCE(is_deprecated, 0) = 0', id);
  assert.equal(live.length, 0, key + ' 被删主键在**读侧口径**下必须查不到，实测 ' + live.length + ' 条');
  const row = rowsOf(dir, 'SELECT is_deprecated FROM ' + table + ' WHERE id = ?', id);
  assert.equal(row.length, 1, key + ' 软删语义：行必须仍在库里（不许物理删）');
  assert.equal(row[0].is_deprecated, 1, key + ' 软删语义：必须置 is_deprecated=1');
}

/** 判据④：快照文件（＝回执落盘页，快照内容的载体）路径存在且可读，且可见文本里带快照。 */
function assertSnapshotFile(r, key) {
  assert.ok(r.out !== '', key + ' 回执未落盘（envelope 无 data.output）');
  const st = statSync(r.out);
  assert.ok(st.isFile() && st.size > 0, key + ' 落盘页路径存在且非空：' + r.out);
  assert.ok(readFileSync(r.out, 'utf8').length > 0, key + ' 落盘页可读');
  assert.ok(!r.text.includes('undefined'), key + ' 可见文本不得出现 undefined');
  console.log('T364-FILE ' + key + ' path=' + r.out + ' bytes=' + st.size);
}

/* ── 判据①②③④：删体脂 → exit 0 ＋ 逐格等于删前查库值 ＋ 主键不可查 ＋ 落盘页可读 ── */

test('#364 判据①②③④体脂：删前快照逐格 == 删前查库值，主键读侧查不到，落盘页带快照', () => {
  const dir = mkTmpDb();
  const cols = ['date', 'source', 'body_fat_pct', ...CALIPER_COLS, 'note'];
  const before = rowBefore(dir, 'body_composition', cols, '2026-09-05'); // 删前基线
  const r = runWrite(dir, KEY_C, { id: before.id });
  assert.equal(r.status, 0, '删体脂必须 exit 0，stderr=' + r.stderr.slice(-300));
  const item = assertItemShape(r, before.id, KEY_C);

  // 可见文本两处：回执 message 的抬头句 ＋ 落盘页的逐字段快照行；两边逐格与**删前查库值**比
  const cells = pairsOf(item.detail);
  const pageCells = pairsOf(detailFromPage(r.html));
  assert.deepEqual(pageCells, cells, '落盘页快照行与回执 items[0].detail 逐格同源');
  assert.deepEqual(cells.map(([k]) => k), ['日期', '来源', '体脂率', ...SITE_7, '备注'], '体脂快照字段序：' + JSON.stringify(cells.map(([k]) => k)));
  assertCell(cells[0], before.date, '体脂/日期');
  assertCell(cells[1], SRC_ZH[before.source], '体脂/来源');
  assertCell(['体脂率', cells[2][1].replace(/%$/, '')], before.body_fat_pct, '体脂/体脂率');
  for (let i = 0; i < 7; i++) {
    assert.equal(cells[3 + i][0], SITE_7[i], '7 点站名逐位：' + cells[3 + i][0]);
    assert.equal(SITE_7[i], CALIPER_SITE_LABELS[i], '冻结站名表 == CALIPER_SITE_LABELS（唯一来源）');
    assertCell(cells[3 + i], before[CALIPER_COLS[i]], '体脂/皮褶 ' + SITE_7[i]);
  }
  assertCell(cells[10], before.note, '体脂/备注');

  // 摘要那一句（用户抬头读数）：日期／体脂率／来源三样逐字
  const head = /^已删除体脂记录 #(\d+)（(.*?)）（软删除：/.exec(r.message);
  assert.ok(head, '摘要形状：「已删除体脂记录 #id（快照）（软删除：…）」：' + r.message);
  assert.equal(Number(head[1]), before.id, '摘要里的记录号 == 被删主键');
  const segs = head[2].split(' · ');
  assert.equal(segs[0], '日期 ' + before.date, '摘要/日期');
  assert.equal(segs[1], '体脂率 ' + before.body_fat_pct + '%', '摘要/体脂率');
  assert.equal(segs[2], '来源 ' + SRC_ZH[before.source], '摘要/来源');
  // #537 重排：那句带主键与「软删除」叫法的摘要不再当副标题压上页头（同一件事原先在页头／读数卡／
  // 表各说一遍，且库内世界上了屏）。**两处同源改由逐格快照段承接**——上面 `detailFromPage()`
  // 已逐格比过；这里补一条负向：摘要句与仓内叫法都不许再出现在页上（摘要句子只留在载荷里给 AI 读）。
  assert.ok(r.text.includes('删除前的原值'), '落盘页保留删前逐格快照段');
  assert.ok(!r.text.includes('已删除体脂记录'), '落盘页不再印带主键的摘要句（#537）');
  assert.ok(!r.text.includes('软删除'), '落盘页不再印「软删除」这个仓内叫法（#537）');
  assert.ok(!r.text.includes('body_composition'), '落盘页不印库表名（#537）');

  assertSoftDeleted(dir, 'body_composition', before.id, KEY_C);
  assertSnapshotFile(r, KEY_C);
  console.log('T364-C exit=' + r.status + ' id=' + before.id + ' 逐格=' + cells.length
    + ' 摘要=' + JSON.stringify(head[2]) + ' 库内可查=' + rowsOf(dir,
      'SELECT COUNT(*) AS n FROM body_composition WHERE id = ? AND COALESCE(is_deprecated, 0) = 0', before.id)[0].n);
});

test('#364 判据①②③④围度：13 部位名逐位（唯一来源）＋ 已填各项逐格 == 删前查库值', () => {
  const dir = mkTmpDb();
  const cols = [...MEASUREMENT_FIELDS, 'note'];
  const before = rowBefore(dir, 'body_measurements', cols, '2026-09-06');
  const r = runWrite(dir, KEY_M, { id: before.id });
  assert.equal(r.status, 0, '删围度必须 exit 0，stderr=' + r.stderr.slice(-300));
  const item = assertItemShape(r, before.id, KEY_M);

  const cells = pairsOf(item.detail);
  assert.deepEqual(pairsOf(detailFromPage(r.html)), cells, '落盘页快照行与回执 items[0].detail 逐格同源');
  assert.deepEqual(cells.map(([k]) => k), ['日期', ...PART_13, '备注'], '围度快照字段序：' + JSON.stringify(cells.map(([k]) => k)));
  assertCell(cells[0], before.date, '围度/日期');
  for (let i = 0; i < 13; i++) {
    const f = MEASUREMENT_FIELDS[i];
    assert.equal(MEASUREMENT_ZH[f], PART_13[i], '冻结名表 == MEASUREMENT_ZH（唯一来源）：' + f);
    assert.equal(cells[1 + i][0], PART_13[i], '13 部位名逐位：' + cells[1 + i][0]);
    assertCell(cells[1 + i], before[f], '围度/' + PART_13[i]);
  }
  assertCell(cells[14], before.note, '围度/备注');

  // 摘要只摆**已填**各项（补记同一口径：缺项不摆），值逐字
  const head = /^已删除围度记录 #(\d+)（(.*?)）（软删除：/.exec(r.message);
  assert.ok(head, '摘要形状：' + r.message);
  const segs = head[2].split(' · ');
  assert.equal(segs[0], '日期 ' + before.date, '摘要/日期');
  const filled = MEASUREMENT_FIELDS.filter((f) => before[f] !== null && before[f] !== undefined);
  assert.deepEqual(segs[1].split('、'), filled.map((f) => MEASUREMENT_ZH[f] + ' ' + before[f] + 'cm'), '摘要/已填各项');
  assert.equal(segs[1].split('、').length, 2, '本样例已填 2 项（未填的 11 项不进摘要）');

  assertSoftDeleted(dir, 'body_measurements', before.id, KEY_M);
  assertSnapshotFile(r, KEY_M);
  console.log('T364-M exit=' + r.status + ' id=' + before.id + ' 缺项=' + cells.slice(1, 14).filter(([, v]) => v === MISSING).length
    + '/13 摘要=' + JSON.stringify(head[2]));
});

test('#364 围度 13 项全填：逐格照原值（含两位小数），摘要摆全 13 项', () => {
  const dir = mkTmpDb();
  const before = rowBefore(dir, 'body_measurements', [...MEASUREMENT_FIELDS, 'note'], '2026-09-02');
  const r = runWrite(dir, KEY_M, { id: before.id });
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const cells = pairsOf(assertItemShape(r, before.id, KEY_M).detail);
  for (let i = 0; i < 13; i++) assertCell(cells[1 + i], before[MEASUREMENT_FIELDS[i]], '全填/' + PART_13[i]);
  assert.equal(cells.filter(([, v]) => v === MISSING).length, 0, '全填样例不该有 `—` 格');
  assert.equal(/^已删除围度记录 #\d+（日期 2026-09-02 · (.*?)）（软删除：/.exec(r.message)[1].split('、').length, 13, '摘要摆全 13 项');
  console.log('T364-M13 exit=' + r.status + ' 全填=13 缺项=0 摘要项数=13');
});

/* ── 裁定 2：可见文本 `—` ／ 原始空值（两条分开断言，不互相顶替） ── */

test('#364 裁定2-可见：缺项在可见文本里逐格是 `—`（按格定位，不做全文 includes）', () => {
  const dir = mkTmpDb();
  const beforeC = rowBefore(dir, 'body_composition', ['date', 'source', 'body_fat_pct', ...CALIPER_COLS, 'note'], '2026-09-05');
  const c = runWrite(dir, KEY_C, { id: beforeC.id });
  const cCells = pairsOf(assertItemShape(c, beforeC.id, KEY_C).detail);
  const dashSites = cCells.slice(3, 10).filter(([, v]) => v === MISSING).map(([k]) => k);
  assert.deepEqual(dashSites, SITE_7.filter((x) => x !== '胸' && x !== '腹'), '未填的 5 处皮褶逐格写 `—`：' + JSON.stringify(dashSites));
  for (const [, v] of cCells) assert.notEqual(v, '', '缺值格不得留空串');
  assert.equal(cCells[1][1], SRC_ZH.gym, '有值格照原值');

  const beforeM = rowBefore(dir, 'body_measurements', [...MEASUREMENT_FIELDS, 'note'], '2026-09-06');
  const m = runWrite(dir, KEY_M, { id: beforeM.id });
  const mCells = pairsOf(assertItemShape(m, beforeM.id, KEY_M).detail);
  assert.deepEqual(mCells.slice(1, 14).filter(([, v]) => v === MISSING).map(([k]) => k),
    PART_13.filter((x) => x !== '腰围' && x !== '臀围'), '围度缺项逐格写 `—`');
  assert.equal(mCells[14][1], MISSING, '空备注写 `—`（不是空串）');
  console.log('T364-DASH-VISIBLE 体脂缺项=' + dashSites.length + '/7 围度缺项=' + mCells.slice(1, 14).filter(([, v]) => v === MISSING).length + '/13');
});

test('#364 裁定2-原始空值：取数层与库内保留 `null`（可见文本的 `—` 不回写、不互染）', () => {
  const dir = mkTmpDb();
  const db = openDb(join(dir, DB_FILE));
  let snapC, snapM;
  try {
    const idc = db.prepare("SELECT id FROM body_composition WHERE date = '2026-09-05'").get().id;
    const idm = db.prepare("SELECT id FROM body_measurements WHERE date = '2026-09-06'").get().id;
    snapC = compositionSnapshot(db, idc);
    snapM = measurementSnapshot(db, idm);
    assert.equal(snapC.caliper_thigh_mm, null, '取数层给 `null`（不给 `—`）：皮褶大腿');
    assert.equal(snapC.note, '晨起', '取数层给原始备注');
    assert.equal(snapM.chest_cm, null, '取数层给 `null`：胸围');
    assert.equal(snapM.waist_cm, 86, '取数层给原始数字');
    assert.equal(compositionSnapshot(db, 999999), null, '库里没有这条 id 时返回 `null`');
    assert.equal(measurementSnapshot(db, 999999), null, '库里没有这条 id 时返回 `null`');
  } finally { db.close(); }

  // 同一条样例被删掉之后：库内列仍 `null`（不是 `—`）且软删不改内容 ⇒ 快照可回读（#365 整页按 id 复取的接口）
  const before = rowBefore(dir, 'body_measurements', [...MEASUREMENT_FIELDS, 'note'], '2026-09-06');
  const r = runWrite(dir, KEY_M, { id: before.id });
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const after = rowsOf(dir, 'SELECT ' + MEASUREMENT_FIELDS.join(', ') + ' FROM body_measurements WHERE id = ?', before.id);
  assert.equal(after.length, 1, '软删后行仍在（快照可回读）');
  for (const f of MEASUREMENT_FIELDS) {
    assert.notEqual(after[0][f], MISSING, '库内不得存 `—`：' + f);
    assert.equal(after[0][f], before[f], '软删不改字段值：' + f);
  }
  const db2 = openDb(join(dir, DB_FILE));
  try {
    const again = measurementSnapshot(db2, before.id);
    assert.equal(again.chest_cm, null, '删后回读仍是 `null`（不是 `—`）');
    assert.equal(again.waist_cm, before.waist_cm, '删后回读给同一份值');
  } finally { db2.close(); }
  console.log('T364-RAW-NULL 取数层=null 库内列=null 备注=' + JSON.stringify(snapC.note) + ' 删后回读腰围=' + JSON.stringify(snapM.waist_cm));
});

/* ── 不许动：软删语义（仍置废、不物理删）＋ 不给 id 就不落空回执 ── */

test('#364 不许动：软删语义逐条（行在、标志位 1、读侧查不到），不存在的主键仍 exit 4', () => {
  const dir = mkTmpDb();
  const cols = ['date', 'source', 'body_fat_pct', ...CALIPER_COLS, 'note'];
  for (const [key, table, date, seeded] of [
    [KEY_C, 'body_composition', '2026-09-03', SEED_C.length], [KEY_M, 'body_measurements', '2026-09-06', SEED_M.length],
  ]) {
    const before = rowBefore(dir, table, key === KEY_C ? cols : [...MEASUREMENT_FIELDS, 'note'], date);
    assert.equal(runWrite(dir, key, { id: before.id }).status, 0, key + ' 首次删除 exit 0');
    assertSoftDeleted(dir, table, before.id, key);
    assert.equal(rowsOf(dir, 'SELECT COUNT(*) AS n FROM ' + table)[0].n, seeded, key + ' 全表行数：只有置废没有物理删');
  }
  const miss = runWrite(dir, KEY_C, { id: 999999 });
  assert.equal(miss.status, 4, '不存在的主键 → exit 4（缺失阻断，不返空回执），实测 ' + miss.status);
  const missM = runWrite(dir, KEY_M, { id: 999999 });
  assert.equal(missM.status, 4, '不存在的主键 → exit 4，实测 ' + missM.status);
  console.log('T364-SOFT 两表行数=' + rowsOf(dir, 'SELECT COUNT(*) AS n FROM body_measurements')[0].n + ' 不存在id exit=' + miss.status);
});

/* ── 接通面：两条唤醒词指到哪条命令（只读断言，routes.ts／commands.ts 本票一行不碰） ── */

test('#364 接通面：唤醒词「删体脂」／「删围度」在注册表与路由上仍指向本票两条命令', () => {
  const routes = readFileSync(ROUTES, 'utf8').split('\n');
  const hit = (wake) => routes.find((l) => l.includes("wakeWord: '" + wake + "'")) ?? '';
  for (const [wake, key] of [['删体脂', KEY_C], ['删围度', KEY_M]]) {
    assert.ok(hit(wake).includes("key: '" + key + "'"), '「' + wake + '」→ ' + key + '：' + hit(wake).trim());
    assert.ok(hit(wake).includes('calorie-cmd-read ' + key), '示例照抄即跑：' + hit(wake).trim());
  }
  const reg = readFileSync(COMMANDS, 'utf8');
  for (const key of [KEY_C, KEY_M]) {
    assert.ok(reg.includes("key: '" + key + "'"), '注册表（命令名权威源）登记了 ' + key);
  }
  assert.equal(SOURCE_LABELS.gym, SRC_ZH.gym, '冻结来源名 == SOURCE_LABELS（唯一来源）');
  console.log('T364-ROUTE 删体脂→' + KEY_C + ' 删围度→' + KEY_M);
});
