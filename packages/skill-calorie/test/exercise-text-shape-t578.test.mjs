/** #578 · 记族 13 页 P1 文案债机读判据：副标题复述／重复事实／空值行零命中。
 *
 * 三类计数（口径单源在本件，`.scratch/t578/scan.mjs` 的重出页扫描是它的操作镜像，
 * 规则逐字照抄本件并在文件头具名指向本件；概念只定义一次）：
 *  - subtitle：副标题含记录值（`#id`／`N 条`／`→日期`／`~`）或长度 >16 即命中。
 *    副标题只许是短结论（动作＋域），记录号／日期／条数由操作头／计数卡／来源卡各说一遍。
 *  - dup：同一裸计数（`N 条`／`N 行`，含括号口径后缀逐字比）同时出现在 ≥2 个汇总位
 *   （计数卡／读数卡／当日累计／来源卡）即命中。逐条表里的按记录列示是正常列示，不算。
 *  - empty：数据卡里出现无信息量占位（`—`／`未设置`）即命中。两处除外，各有去处：
 *    ① `aria-hidden` 的隐藏箭头（公共层对齐占位，文本抽取时剥掉）；② 操作头那行
 *    `记录号 未设置`（共用件 `shared/operationHead.ts` 的冻结形态，本票禁区，见证据件遗留节）。
 *
 * 变异自证（末节，打 `T578-MUT`）：副标题塞回记录值／把当日口径后缀抹掉／塞回 `—`
 *  ⇒ 三类各必红；还原 ⇒ 三类各必绿。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { buildExerciseReceiptDoc } from '../dist/exercise/receipt.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

/* ───────────────────────── 一、探针（与 scan.mjs 同源，本件是单源） ───────────────────────── */

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&nbsp;': ' ', '&middot;': '·', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&times;': '×', '&rarr;': '→', '&larr;': '←',
};
const dec = (s) => s.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-zA-Z]+);/g, (m, d, h) => {
  if (d !== undefined) return String.fromCodePoint(Number(d));
  if (h !== undefined) return String.fromCodePoint(parseInt(h, 16));
  return Object.prototype.hasOwnProperty.call(ENTITIES, m.toLowerCase()) ? ENTITIES[m.toLowerCase()] : m;
});

/** 可见文本：剥样式／脚本／注释／复制载荷属性／隐藏箭头／全部标签后压空白。 */
export function visibleText(html) {
  const noStyle = String(html).replace(/<style>[\s\S]*?<\/style>/gi, '\n')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\n');
  const noCopy = noStyle.replace(/\sdata-t="[^"]*"/g, '');
  const noHiddenArrow = noCopy.replace(/<span[^>]*aria-hidden[^>]*>[\s\S]*?<\/span>/g, ' ');
  const noComment = noHiddenArrow.replace(/<!--[\s\S]*?-->/g, '\n');
  return dec(noComment.replace(/<[^>]*>/g, '\n'))
    .split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export function subtitleOf(html) {
  const m = /<p class="ilife-block-page-shell-subtitle">([\s\S]*?)<\/p>/.exec(String(html));
  return m === null ? '' : dec(m[1]).trim();
}

/** `<section id="...">…</section>` 切片（含该卡全部文本；没有该卡即空串）。 */
export function sectionOf(html, id) {
  const m = new RegExp('<section id="' + id + '">[\\s\\S]*?<\\/section>').exec(String(html));
  return m === null ? '' : m[0];
}

/** 副标题命中：记录值上副标题，或过长（>16 字）。返回命中名，无命中即空数组。 */
export function subtitleHits(sub) {
  const tags = [];
  if (sub.length > 16) tags.push('LEN' + sub.length);
  if (/#\d/.test(sub)) tags.push('ID');
  if (/\d+\s*条/.test(sub)) tags.push('COUNT');
  if (/→[^\n]*\d{4}-\d{2}-\d{2}/.test(sub)) tags.push('DATEARROW');
  if (sub.includes('~')) tags.push('TILDE');
  return tags;
}

const COUNT_RE = /\d+\s*(?:条|行)(?:（[^）]*）)?/g;

/** 汇总位裸计数重复：同一计数字串落进 ≥2 个汇总位。返回命中清单。 */
export function dupHits(html) {
  const sites = {
    count: sectionOf(html, 'sec-count'),
    readout: sectionOf(html, 'sec-readout'),
    day: sectionOf(html, 'sec-day'),
    source: sectionOf(html, 'sec-source'),
  };
  const where = new Map();
  for (const [site, frag] of Object.entries(sites)) {
    if (frag === '') continue;
    const text = visibleText(frag).join('\n');
    for (const tok of new Set(text.match(COUNT_RE) ?? [])) {
      if (!where.has(tok)) where.set(tok, new Set());
      where.get(tok).add(site);
    }
  }
  return [...where.entries()].filter(([, s]) => s.size >= 2)
    .map(([tok, s]) => tok + '@' + [...s].sort().join('+'));
}

/** 空值行命中：数据卡里的 `—`／`未设置`。两处共用件冻结面 surgical 剔除（见证据件遗留节，
 *  本票禁区动不得）：① 操作头 `记录号 未设置`；② 对账表 `记录编号／未设置`。 */
export function emptyHits(html) {
  const body = String(html)
    .replace(/<p class="[^"]*op-head-id">记录号 未设置<\/p>/g, '<p>记录号（多条）</p>')
    .replace(/(<td[^>]*>记录编号<\/td>\s*<td[^>]*>)未设置(<\/td>)/g, '$1（多条）$2');
  const texts = visibleText(body);
  const hits = [];
  for (const t of texts) {
    if (t.includes('—')) hits.push('DASH:' + t.slice(0, 40));
    if (t.includes('未设置')) hits.push('UNSET:' + t.slice(0, 40));
  }
  return hits;
}

/* ───────────────────────── 二、夹具（记／改／删九形，数字贴近实跑） ───────────────────────── */

const DAY = '2026-09-12';
const DAY2 = '2026-09-13';

function mkDb() {
  const dir = mkdtempSync(join(tmpdir(), 't578-shape-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare('INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category, distance_km, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(DAY, '07:00:00', '慢跑', 30, 320, '有氧', 5, '夜跑');
  db.prepare('INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES (?, ?, ?, ?, ?, ?)')
    .run(DAY, '08:00:00', '卧推', 25, 150, '力量');
  return db;
}

function row(over = {}) {
  return {
    id: 1, date: DAY, time: '07:00:00', exercise_type: '慢跑', duration_minutes: 30,
    calories_burned: 320, category: '有氧', distance_km: 5, note: '夜跑',
    ...over,
  };
}
/** 无备注行：明细备注格走空白（不印 `—`），改前旧备注走 `（空）`。 */
const NOTELESS = { id: 2, date: DAY, time: '08:00:00', exercise_type: '卧推', duration_minutes: 25, calories_burned: 150, category: '力量', note: null };

function receipt(over = {}) {
  const { wakeWord, ...rest } = over;
  return {
    scene: '记运动', action: '记运动', op: 'create', recordId: 1,
    summary: '已记运动：慢跑 320 卡，30 分钟（' + DAY + '）',
    items: [], tagDiff: null, distance: null, noChange: false,
    meta: { actionAt: '2026-09-15 12:00:00', entityType: 'exercise_log', wakeWord: wakeWord ?? '记运动', source: 'exercise_log (写库回执)' },
    m5Contract: '1', affectedRows: 1, affectedRowsSource: 'sqlite:total_changes',
    ids: [1], idSource: 'record', writtenFields: ['type', 'calories', 'minutes'],
    m5Line: 'id=1 | 日期 2026-09-15 12:00:00 | 影响 1 行 | 字段 type,calories,minutes',
    ...rest,
  };
}

const CMD = 'calorie-cmd-read calorie.exercise.add --params \'{}\'';
const db = mkDb();
const PAGES = [
  ['新增单条', () => buildExerciseReceiptDoc(db, 'calorie.exercise.add', receipt(), CMD, { rows: [row()], targetDate: DAY })],
  ['批量补记', () => buildExerciseReceiptDoc(db, 'calorie.exercise.add',
    receipt({ summary: '批量记运动：新增 2 条', wakeWord: '批量补记运动' }), CMD, { rows: [row(), { ...NOTELESS }] })],
  ['复制有行', () => buildExerciseReceiptDoc(db, 'calorie.exercise.add',
    receipt({ summary: '已复制昨日运动→2026-09-15：复制 1，跳过 1', wakeWord: '复制昨日运动' }),
    CMD, { rows: [row()], skipped: 1, targetDate: '2026-09-15' })],
  ['复制零变更', () => buildExerciseReceiptDoc(db, 'calorie.exercise.add',
    receipt({ summary: '已复制昨日运动→2026-09-15：复制 0，跳过 2', wakeWord: '复制昨日运动', noChange: true, affectedRows: 0, writtenFields: [] }),
    CMD, { rows: [], skipped: 2, targetDate: '2026-09-15' })],
  ['改单条', () => buildExerciseReceiptDoc(db, 'calorie.exercise.update',
    receipt({ op: 'update', summary: '已更新运动 #1（duration_minutes）', wakeWord: '改运动记录', writtenFields: ['minutes'] }),
    CMD, { pairs: [{ old: row(), new: row({ duration_minutes: 40 }) }] })],
  ['改多条', () => buildExerciseReceiptDoc(db, 'calorie.exercise.update',
    receipt({ op: 'update', summary: '已更新 ' + DAY + ' 运动 2 条', wakeWord: '改某日运动', recordId: null, writtenFields: ['note'], ids: [], idSource: 'condition', affectedRows: 2 }),
    CMD, { pairs: [{ old: row(), new: row({ note: '补记' }) }, { old: { ...NOTELESS }, new: { ...NOTELESS, note: '补记' } }] })],
  ['删单条', () => buildExerciseReceiptDoc(db, 'calorie.exercise.remove',
    receipt({ op: 'delete', summary: '已删除运动 #1（软删除：行保留，已从查询与统计中排除；暂无恢复入口）', wakeWord: '删运动记录', writtenFields: ['is_deleted'] }),
    CMD, { rows: [row()] })],
  ['删同日多条', () => buildExerciseReceiptDoc(db, 'calorie.exercise.remove',
    receipt({ op: 'delete', summary: '已删除 ' + DAY + ' 运动 2 条（软删除：行保留，已从查询与统计中排除；暂无恢复入口）', wakeWord: '删某日运动', recordId: null, writtenFields: ['is_deleted'], ids: [], idSource: 'condition', affectedRows: 2 }),
    CMD, { rows: [row(), { ...NOTELESS }] })],
  ['范围删', () => buildExerciseReceiptDoc(db, 'calorie.exercise.remove',
    receipt({ op: 'delete', summary: '已删除 ' + DAY + '~' + DAY2 + ' 运动 2 条（软删除：行保留，已从查询与统计中排除；暂无恢复入口）', wakeWord: '批量删运动', recordId: null, writtenFields: ['is_deleted'], ids: [], idSource: 'condition', affectedRows: 2 }),
    CMD, { rows: [row(), { ...NOTELESS, date: DAY2 }] })],
];

/* ───────────────────────── 三、判据（三类各零命中） ───────────────────────── */

test('#578 ① 副标题：短结论，不复述记录值（#id／N 条／→日期／~／过长）', () => {
  const lines = [];
  let bad = 0;
  for (const [name, build] of PAGES) {
    const hits = subtitleHits(subtitleOf(build()));
    if (hits.length > 0) bad += 1;
    lines.push('T578 SUB ' + name.padEnd(12) + ' 「' + subtitleOf(build()) + '」 命中=' + (hits.join(',') || '0'));
  }
  for (const l of lines) console.log(l);
  console.log('T578 SUB-TOTAL 页面=' + PAGES.length + ' 有债页=' + bad);
  assert.equal(bad, 0, '有 ' + bad + ' 页的副标题仍在复述记录值或过长');
});

test('#578 ② 重复事实：同一裸计数只许落一个汇总位（口径后缀逐字比）', () => {
  let bad = 0;
  for (const [name, build] of PAGES) {
    const hits = dupHits(build());
    if (hits.length > 0) bad += 1;
    console.log('T578 DUP ' + name.padEnd(12) + ' 命中=' + (hits.join(' | ') || '0'));
  }
  console.log('T578 DUP-TOTAL 页面=' + PAGES.length + ' 有债页=' + bad);
  assert.equal(bad, 0, '有 ' + bad + ' 页的同一计数裸奔在多个汇总位');
});

test('#578 ③ 空值行：数据卡零 `—`／零 `未设置`（空白格与 `（空）` 不算）', () => {
  let bad = 0;
  for (const [name, build] of PAGES) {
    const hits = emptyHits(build());
    if (hits.length > 0) bad += 1;
    console.log('T578 EMPTY ' + name.padEnd(12) + ' 命中=' + (hits.join(' | ') || '0'));
  }
  console.log('T578 EMPTY-TOTAL 页面=' + PAGES.length + ' 有债页=' + bad);
  assert.equal(bad, 0, '有 ' + bad + ' 页仍印无信息量占位');
});

test('#578 ④ 形状不塌：卡题与口径行仍在（只改文案，不拆卡）', () => {
  const byName = new Map(PAGES.map(([name, build]) => [name, build()]));
  assert.ok(byName.get('新增单条').includes('新增条数'), '新增页缺新增条数');
  assert.ok(byName.get('批量补记').includes('批量计数'), '批量页缺批量计数');
  assert.ok(byName.get('复制有行').includes('目标日期'), '复制页缺目标日期行');
  assert.ok(byName.get('改单条').includes('改前 → 改后'), '改页缺改前改后对照');
  assert.ok(byName.get('改单条').includes('命中条数'), '改页缺命中计数');
  assert.ok(byName.get('删单条').includes('删除前快照'), '删页缺删除前快照');
  assert.ok(byName.get('删同日多条').includes('逐条明细'), '删多条缺逐条明细');
  assert.ok(byName.get('删单条').includes('软删除：行保留，已从查询与统计中排除，暂无恢复入口'), '删页缺单源软删除措辞');
  assert.ok(byName.get('改单条').includes('口径：影响行数'), '缺口径首行');
  assert.ok(byName.get('改单条').includes('sui-facts'), '缺来源键值行');
  assert.ok(byName.get('复制零变更').includes('无改动'), '零变更页缺「无改动」');
  assert.ok(!byName.get('新增单条').includes('只数'), '错字「只数」回潮');
  console.log('T578 SHAPE 计数／对照／快照／口径／来源行俱全');
});

/* ───────────────────────── 四、变异自证（改坏必红／还原必绿） ───────────────────────── */

test('#578 变异：三类各塞一处债 ⇒ 各必红；还原 ⇒ 各必绿', () => {
  const cleanDel = byName0('删单条');
  // 变异①：副标题塞回记录值（#id＋条数＋长串）。
  const mut1 = cleanDel.replace(/<p class="ilife-block-page-shell-subtitle">[^<]*<\/p>/,
    '<p class="ilife-block-page-shell-subtitle">已删除运动 #8344 2026-09-12 5 条（软删除：行保留）</p>');
  assert.notEqual(mut1, cleanDel, '变异①没塞进去');
  assert.ok(subtitleHits(subtitleOf(mut1)).length >= 1, '变异①：副标题塞回记录值后没红');

  // 变异②：把当日口径后缀抹掉（与计数卡裸计数撞车）。
  const cleanUpd = byName0('改多条');
  assert.ok(cleanUpd.includes('（当天）'), '前置：改多条页没有「（当天）」口径后缀（实现没改对？）');
  const mut2 = cleanUpd.replaceAll('（当天）', '');
  assert.notEqual(mut2, cleanUpd, '变异②没塞进去');
  assert.ok(dupHits(mut2).length >= 1, '变异②：抹掉口径后缀后没红');

  // 变异③：明细备注空白格塞回 `—`（批量页明细表里有无备注行）。
  const cleanBatch = byName0('批量补记');
  assert.ok(!emptyHits(cleanBatch).length, '前置：批量页已有空值占位（实现没改对？）');
  const mut3 = cleanBatch.replace('<td class="ilife-block-data-table-cell-left" data-label="备注"></td>',
    '<td class="ilife-block-data-table-cell-left" data-label="备注">—</td>');
  assert.notEqual(mut3, cleanBatch, '变异③没塞进去（明细备注空白格锚点变了）');
  assert.ok(emptyHits(mut3).length >= 1, '变异③：塞回 `—` 后没红');

  // 还原：原样三类各 0。
  assert.equal(subtitleHits(subtitleOf(cleanDel)).length, 0, '还原后副标题没绿');
  assert.equal(dupHits(cleanUpd).length, 0, '还原后重复事实没绿');
  assert.equal(emptyHits(cleanBatch).length, 0, '还原后空值行没绿');
  console.log('T578-MUT 副标题red=1 重复red=1 空值red=1 还原green=0/0/0');
});

function byName0(name) {
  const found = PAGES.find(([n]) => n === name);
  assert.ok(found, '夹具缺页：' + name);
  return found[1]();
}
