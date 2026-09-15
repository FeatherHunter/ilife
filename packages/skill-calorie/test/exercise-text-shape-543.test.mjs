/** #543 · 运动写后回执族 13 页「文本形状」守卫：分隔符＝设计债（#508 口径）＋ 机器词零上屏 ＋ 显示层取整。
 *
 * 判据与口径**逐字同源** `.scratch/sep-audit/probe.mjs`（#508 立规票的探针，本件按它复述，不另立一套）：
 *   R1 可见文本含 `·`(U+00B7)；R2 含 `；`(U+FF1B)；
 *   R3 ≥3 段并列：以**同一个**并列分隔符切开后，连续 ≥3 个非空片段、且每段 ≤40 字。
 *   并列分隔符集＝`· ； ; ｜ | ／ / 、 ＋`；`，。：~ → ＝` 不算（免得把散文误判）。
 * 可见文本＝剥 `<style>`／`<script>`／注释／全部标签／解实体；属性里的复制载荷与命令原文**不算**。
 *
 * 覆盖的页形（本票 13 页只有这一种页形，其余只是写形态不同）：
 *   新增单条／批量补记／复制昨日／改单条／改三字段／改某日／删单条／删多条／零变更复制。
 * 夹具数字故意带库内浮点原值（`320.40000000000003` 那类），恰是本票要收的脏数。
 *
 * 变异自证（本件末节，读数逐条打 `T543-MUT`）：往产物里塞一处 `·`／一处 `；` 并列 ⇒ 守卫**必红**；
 * 逐文件还原 ⇒ **必绿**。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { buildExerciseReceiptDoc } from '../dist/exercise/receipt.js';

/* ───────────────────────── 一、口径（与 probe.mjs 逐字同源） ───────────────────────── */

const MAXSEG = 40;
const PARALLEL = ['·', '；', ';', '｜', '|', '／', '/', '、', '＋'];
const SENTINEL = '\u0000';
const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&nbsp;': ' ', '&middot;': '·', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&times;': '×', '&rarr;': '→', '&larr;': '←', '&deg;': '°', '&permil;': '‰',
};
const dec = (s) => s.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-zA-Z]+);/g, (m, d, h) => {
  if (d !== undefined) return String.fromCodePoint(Number(d));
  if (h !== undefined) return String.fromCodePoint(parseInt(h, 16));
  return Object.prototype.hasOwnProperty.call(ENTITIES, m.toLowerCase()) ? ENTITIES[m.toLowerCase()] : m;
});
const blank = (m) => m.replace(/[^\n]/g, SENTINEL);

/** 逐字同 probe.mjs 的 `visibleText()`（①②③ 全串级剥壳）。 */
function shellOff(text) {
  return text
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<[^>]*>/g, blank);
}
/** 节点级：哨兵切段，段内含非空白即成节点（与 probe.mjs 一致）。 */
function textNodes(html) {
  return shellOff(html).split(SENTINEL)
    .map((p) => dec(p.replace(/\u0000+/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter((t) => t !== '');
}
/** ≥3 段并列（与 probe.mjs 的 `parallelRun()` 同判）。 */
function parallelRun(text) {
  for (const sep of PARALLEL) {
    if (!text.includes(sep)) continue;
    const parts = text.split(sep);
    let i = 0;
    while (i < parts.length) {
      if (parts[i].trim() === '' || parts[i].trim().length > MAXSEG) { i += 1; continue; }
      let end = i;
      while (end + 1 < parts.length
        && parts[end + 1].trim() !== '' && parts[end + 1].trim().length <= MAXSEG) end += 1;
      if (end - i + 1 >= 3) return { sep, n: end - i + 1, segs: parts.slice(i, end + 1).map((s) => s.trim()) };
      i = end + 1;
    }
  }
  return null;
}
/** 判一处文本节点：返回命中的规则名（空数组＝干净）。 */
function judge(text) {
  const tags = [];
  if (text.includes('·')) tags.push('R1');
  if (text.includes('；')) tags.push('R2');
  if (parallelRun(text) !== null) tags.push('R3');
  return tags;
}
/** 整页读数：逐节点判，返回命中清单（空＝该页零债）。 */
function separatorHits(html) {
  const hits = [];
  for (const t of textNodes(html)) {
    const tags = judge(t);
    if (tags.length > 0) hits.push({ tags, text: t.slice(0, 80) });
  }
  return hits;
}
/** 可见文本整串（行级判据与机器词判据读它）。 */
const visibleAll = (html) => textNodes(html).join('\n');

/* ───────────────────────── 二、夹具（覆盖九种写形态） ───────────────────────── */

const DAY = '2026-09-12';
/** 脏数原值（库内浮点）：故意用计算才会出现的尾巴，收口必须在显示层。 */
const DIRTY_CAL = 320.40000000000003;
const DIRTY_MIN = 30.400000000000006;

function mkDb() {
  const dir = mkdtempSync(join(tmpdir(), 't543-shape-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare('INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category, distance_km, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(DAY, '07:00:00', '慢跑', DIRTY_MIN, DIRTY_CAL, '有氧', 5, '夜跑');
  db.prepare('INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES (?, ?, ?, ?, ?, ?)')
    .run(DAY, '08:00:00', '卧推', 25, 150, '力量');
  return db;
}

function row(over = {}) {
  return {
    id: 1, date: DAY, time: '07:00:00', exercise_type: '慢跑', duration_minutes: DIRTY_MIN,
    calories_burned: DIRTY_CAL, category: '有氧', distance_km: 5, note: '夜跑',
    ...over,
  };
}

/** 夹具：`wakeWord` 单列一项＝**页上那条唤醒词**（装配件读的是 `meta.wakeWord`，
 *  写形态的 `isBatch`／`isCopy` 两支都按它判），其余字段照顶层铺开。 */
function receipt(over = {}) {
  const { wakeWord, ...rest } = over;
  return {
    scene: '记运动', action: '记运动', op: 'create', recordId: 1,
    summary: '已记运动：慢跑 ' + DIRTY_CAL + ' 卡 · ' + DIRTY_MIN + ' 分钟（' + DAY + '）',
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
    receipt({ scene: '记运动', summary: '批量记运动：新增 2 条', wakeWord: '批量补记运动' }), CMD, { rows: [row(), row({ id: 2 })] })],
  ['复制昨日', () => buildExerciseReceiptDoc(db, 'calorie.exercise.add',
    receipt({ scene: '复制昨日运动', summary: '已复制昨日运动→2026-09-15：复制 1，跳过 2', wakeWord: '复制昨日运动' }),
    CMD, { rows: [row()], skipped: 2, targetDate: '2026-09-15' })],
  ['改单条', () => buildExerciseReceiptDoc(db, 'calorie.exercise.update',
    receipt({ scene: '改运动记录', op: 'update', summary: '已更新运动 #1（duration_minutes）', wakeWord: '改运动记录', writtenFields: ['minutes'] }),
    CMD, { pairs: [{ old: row(), new: row({ duration_minutes: 40 }) }] })],
  ['改三字段', () => buildExerciseReceiptDoc(db, 'calorie.exercise.update',
    receipt({ scene: '改运动记录', op: 'update', summary: '已更新运动 #1（duration_minutes、date、note）', wakeWord: '改运动记录', writtenFields: ['minutes', 'date', 'note'] }),
    CMD, { pairs: [{ old: row(), new: row({ duration_minutes: 40, date: '2026-09-11', note: '补记' }) }] })],
  ['改某日', () => buildExerciseReceiptDoc(db, 'calorie.exercise.update',
    receipt({ scene: '改某日运动', op: 'update', summary: '已更新 ' + DAY + ' 运动 2 条', wakeWord: '改某日运动', recordId: null, writtenFields: ['note'], ids: [], idSource: 'condition' }),
    CMD, { pairs: [{ old: row(), new: row({ note: '补记' }) }, { old: row({ id: 2 }), new: row({ id: 2, note: '补记' }) }] })],
  ['删单条', () => buildExerciseReceiptDoc(db, 'calorie.exercise.remove',
    receipt({ scene: '删运动记录', op: 'delete', summary: '已删除运动 #1（软删除：行保留，已从查询与统计中排除；暂无恢复入口）', wakeWord: '删运动记录', writtenFields: ['is_deleted'] }),
    CMD, { rows: [row()] })],
  ['删多条', () => buildExerciseReceiptDoc(db, 'calorie.exercise.remove',
    receipt({ scene: '删某日运动', op: 'delete', summary: '已删除 ' + DAY + ' 运动 2 条（软删除：行保留，已从查询与统计中排除；暂无恢复入口）', wakeWord: '删某日运动', recordId: null, writtenFields: ['is_deleted'], ids: [], idSource: 'condition' }),
    CMD, { rows: [row(), row({ id: 2 })] })],
  ['零变更复制', () => buildExerciseReceiptDoc(db, 'calorie.exercise.add',
    receipt({ scene: '复制昨日运动', summary: '已复制昨日运动→2026-09-15：复制 0，跳过 2', wakeWord: '复制昨日运动', noChange: true, affectedRows: 0, writtenFields: [] }),
    CMD, { rows: [], skipped: 2, targetDate: '2026-09-15' })],
];

/* ───────────────────────── 三、判据 ───────────────────────── */

test('#543 ① 分隔符：回执族页面的可见文本零 `·`／`；`／≥3 段并列（节点级）', () => {
  const lines = [];
  let bad = 0;
  for (const [name, build] of PAGES) {
    const hits = separatorHits(build());
    if (hits.length > 0) bad += 1;
    lines.push('T543 SEP ' + name.padEnd(12) + ' 节点级命中=' + hits.length
      + (hits.length === 0 ? '' : '  ' + hits.map((h) => h.tags.join('+') + ':' + h.text).join(' | ')));
  }
  for (const l of lines) console.log(l);
  console.log('T543 SEP-TOTAL 页面=' + PAGES.length + ' 有债页=' + bad + ' 命中合计='
    + PAGES.reduce((a, [, b]) => a + separatorHits(b()).length, 0));
  assert.equal(bad, 0, '有 ' + bad + ' 页仍在可见文本里用 `·`／`；`／多段并列（分隔符＝设计债，#508）');
});

test('#543 ② 文案：零机器词上屏（库表名／常量名／参数名）＋ 页头零 `·`', () => {
  const NAMED = ['exercise_log', 'daily_goal', 'total_changes', 'CALORIE_TODAY', 'calorie.view.'];
  const ROOT = /<div class="wrap ilife-page">/;
  let bad = 0;
  for (const [name, build] of PAGES) {
    const html = build();
    assert.ok(ROOT.test(html), name + ' 不是完整文档（版面根缺失）');
    // 可见面（剥掉属性里的复制载荷）零机器词——复制载荷是机器面，不在判据内。
    const body = html.replace(/data-t="[^"]*"/g, 'data-t="［复制载荷］"');
    const vis = visibleAll(body);
    for (const w of NAMED) {
      if (vis.includes(w)) { bad += 1; console.log('T543 MW ' + name + ' 可见面出现机器词 ' + w); }
    }
    const title = (/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? '';
    const eyebrow = (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html) ?? [])[1] ?? '';
    assert.ok(title !== '' && !title.includes('·'), name + ' 的 `<title>` 仍是品牌 `·`：' + title);
    assert.equal(eyebrow, '运动写后回执', name + ' 的眉标不对：' + eyebrow);
    console.log('T543 HEAD ' + name.padEnd(12) + ' title=' + title + ' eyebrow=' + eyebrow);
  }
  assert.equal(bad, 0, '有 ' + bad + ' 处机器词上屏');
});

test('#543 ③ 取整：页上不出现 ≥6 位小数（库内原值只许在复制载荷里）', () => {
  const DIRTY = /\d+\.\d{6,}/g;
  let bad = 0;
  for (const [name, build] of PAGES) {
    const body = build().replace(/data-t="[^"]*"/g, 'data-t=""');
    const vis = visibleAll(body);
    const hit = vis.match(DIRTY);
    if (hit !== null) { bad += hit.length; console.log('T543 DIRTY ' + name + ' ' + [...new Set(hit)].join(' ')); }
  }
  assert.equal(bad, 0, '页上仍有 ' + bad + ' 处 ≥6 位小数（用户第 4 条：文字不能出现不合理）');
});

test('#543 ④ 形状：计数卡按写形态出数，软删除措辞单源派生', () => {
  const byName = new Map(PAGES.map(([name, build]) => [name, build()]));
  // 新增单条：计数是新增条数，不得误印删除计数（#543 修的事实错误）。
  assert.ok(byName.get('新增单条').includes('新增条数'), '新增页缺新增条数');
  assert.ok(!byName.get('新增单条').includes('删除条数'), '新增页误印删除计数');
  assert.ok(byName.get('批量补记').includes('批量计数'), '批量页缺批量计数');
  assert.ok(byName.get('复制昨日').includes('目标日期'), '复制页缺目标日期行');
  assert.ok(byName.get('改单条').includes('命中条数'), '改页缺命中计数');
  assert.ok(byName.get('改单条').includes('改前 → 改后'), '改页缺改前改后对照');
  assert.ok(byName.get('删单条').includes('删除条数'), '删页缺删除计数');
  assert.ok(byName.get('删单条').includes('删除前快照'), '删页缺删除前快照');
  // 软删除措辞：单源派生（`；` 改行文逗号；`；` 版 absence 由判据①全页零 `；` 覆盖）。
  assert.ok(byName.get('删单条').includes('软删除：行保留，已从查询与统计中排除，暂无恢复入口'), '删页缺单源派生的软删除措辞');
  // 口径行与来源键值行都在（首条保留 `口径：` 前缀，回归判据读它）。
  assert.ok(byName.get('改单条').includes('口径：影响行数'), '缺口径首行');
  assert.ok(byName.get('改单条').includes('sui-facts'), '缺来源键值行');
  console.log('T543 SHAPE 计数／对照／快照／口径／来源行俱全');
});

/* ───────────────────────── 四、变异自证（改坏必红／还原必绿） ───────────────────────── */

test('#543 变异：塞回一处 `·` 并列 ⇒ 守卫必红；还原 ⇒ 必绿', () => {
  const clean = byName0('新增单条');
  assert.equal(separatorHits(clean).length, 0, '原样产物应当零命中');

  // 变异①：把副标题塞回 `·` 串（本票整形过的那一处；整形连符号两侧空档一起收，锚按实写）。
  const mut1 = clean.replace('慢跑 320.4 卡，30.4 分钟', '慢跑 320.4 卡 · 30.4 分钟');
  assert.notEqual(mut1, clean, '变异①没塞进去（夹具变了）');
  const h1 = separatorHits(mut1);
  assert.ok(h1.length >= 1, '变异①：塞回 `·` 串后守卫没红');

  // 变异②：把计数卡的题塞回 `；` 并列串（本票整形过的另一处）。
  const mut2 = clean.replace('>新增结果<', '>新增结果；写入；跳过；失败<');
  assert.notEqual(mut2, clean, '变异②没塞进去（夹具变了）');
  const h2 = separatorHits(mut2);
  assert.ok(h2.length >= 1, '变异②：塞回 `；` 串后守卫没红');

  // 还原：逐文件还原（这里就是原样那一份）⇒ 必绿。
  assert.equal(separatorHits(clean).length, 0, '还原后守卫没绿');
  console.log('T543-MUT 塞`·`=' + h1.length + ' 处命中 塞`；`=' + h2.length + ' 处命中 还原=' + separatorHits(clean).length + ' 处命中');
});

function byName0(name) {
  const found = PAGES.find(([n]) => n === name);
  assert.ok(found, '夹具缺页：' + name);
  return found[1]();
}
