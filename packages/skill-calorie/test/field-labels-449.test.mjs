/** #449 · 运动域回执「写入字段／字段变更」走字段中文标签（查表口径住 `shared/fieldLabel.ts`）。
 *
 * 判据（真假由程序判）：
 *   ① 「可见文本零参数名」：13 条写词产物逐条真跑，参数取冻结表 `src/triggers/scene-04-exercise.ts`
 *      的 `main_prompt.cli`（`<日期>` 填真实日期；改／删按 id 的先落一条种子再取 id），
 *      产物可见文本里检索冻结参数名清单，命中数必须 0（逐条给读数）；
 *   ② 卡区兜底：写入字段卡与字段变更卡所在的卡区，参数名 0 命中，且**一个 snake_case 形态 token 都没有**
 *      （挡「表里没登记于是原样印出去」这种静默漏网）；
 *   ③ 缺项回退原键名：查表口径一条（缺项＝原键名、不是英文标签、不是编的中文）＋ 页面端到端一条
 *      （往 `buildExerciseReceiptDoc` 喂一个表里没有的字段键，页面必须原样印这个键）；
 *   ④ 标签单源：`packages/<包>/src` 面里「运动域列键 → 中文标签」绑定命中文件数＝1、
 *      `registerFieldLabels(` 调用命中文件数＝1，两处都必须是 `exercise/fieldLabels.ts`。
 *
 * 「可见文本」口径：剥 `<style>`／`<script>` 段 → 剥全部标签 → 解实体 → 收敛空白。
 * 复制区与对账区的机器载荷（命令原文、M5 行）住在 HTML 属性里（`data-t`／`data-fmt`，`#264` 钉着它们的形状），
 * 不是文字节点，故不进本判据；卡片正文（用户真正读的那几行）全部进本判据。
 *
 * 运行：先 `pnpm build`，再 `node packages/skill-calorie/test/field-labels-449.test.mjs`
 * （`--test-name-pattern=记运动` 即单条）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { buildExerciseReceiptDoc } from '../dist/exercise/receipt.js';
import { fieldLabel } from '../dist/shared/fieldLabel.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const D1 = '2026-09-05';
const D2 = '2026-09-06';
const D3 = '2026-09-07';
/** 复制昨日运动（冻结原文不带日期，目标即今天）要先把种子落在昨天：按 `CALORIE_TODAY` 钉的口径取今天。 */
const TODAY = /^\d{4}-\d{2}-\d{2}$/.test(process.env['CALORIE_TODAY'] ?? '')
  ? process.env['CALORIE_TODAY']
  : new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.parse(TODAY + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);

/** 冻结参数名清单：写命令回执 `writtenFields` 报的 CLI 参数名（`F.exercise`／`cliNames` 两路实测）＋
 *  字段变更卡按行键摆的库列名（`exercise_log` 的列）。两套都要零命中。 */
const PARAM_NAMES = [
  'type', 'calories', 'minutes', 'note', 'category', 'difficulty', 'distance', 'steps', 'reps', 'date', 'time',
  'loadKg', 'heartRate', 'maxHeartRate', 'setIndex', 'backfill', 'copyFrom', 'items', 'id', 'from', 'to',
  'exercise_type', 'duration_minutes', 'calories_burned', 'distance_km', 'avg_heart_rate', 'max_heart_rate',
  'load_kg', 'set_index', 'is_backfill', 'is_deleted',
];

/** 13 条写词（输出类型 receipt 的场景 04 条目）：唤醒词 ＋ 冻结 cli 参数；第 4 位＝种子日期（改／删按 id 与复制类要用）。 */
const CASES = [
  ['记运动', 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30 }],
  ['记运动（含备注）', 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, note: '夜跑' }],
  ['记力量训练', 'calorie.exercise.add', { type: '卧推', calories: 150, category: '力量', loadKg: 60, reps: 10 }],
  ['记有氧运动', 'calorie.exercise.add', { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5 }],
  ['记日常活动', 'calorie.exercise.add', { type: '步行', calories: 80, minutes: 20, category: '日常', steps: 3000 }],
  ['补记运动', 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D1 }],
  ['批量补记运动', 'calorie.exercise.add', { items: [{ type: '慢跑', calories: 320, minutes: 30, date: D1 }] }],
  ['复制昨日运动', 'calorie.exercise.add', { copyFrom: 'yesterday' }, YESTERDAY],
  ['改运动记录', 'calorie.exercise.update', 'byId', D2],
  ['改某日运动', 'calorie.exercise.update', { note: '补记', date: D2 }, D2],
  ['删运动记录', 'calorie.exercise.remove', 'byId', D2],
  ['删某日运动', 'calorie.exercise.remove', { date: D2 }, D2],
  ['批量删运动', 'calorie.exercise.remove', { from: D1, to: D2 }, D1],
];

/** 13 条写词里真跑带到的字段键（`writtenFields` 原样），给覆盖面判据当凭据。 */
const SEEN_KEYS = new Set();

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't449-labels-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.close();
  return dir;
}

function runCli(dir, key, params) {
  const out = join(dir, key.replace(/\./g, '_') + '-' + Math.random().toString(36).slice(2, 7) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  const stdout = String(r.stdout || '').trim();
  return {
    status: r.status,
    stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

function shiftISO(iso, delta) {
  return new Date(Date.parse(iso + 'T12:00:00Z') + delta * 86400000).toISOString().slice(0, 10);
}

/** 剥样式／脚本段（这两段是机器面，不是可见文本）。 */
function stripStyleScript(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
}

/** 可见文本＝文字节点：剥样式／脚本 → 剥全部标签 → 解实体 → 收敛空白。 */
function visibleText(html) {
  return stripStyleScript(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

/** 取一段 HTML 的字面（起止标记之间的内容）；找不到即红（免得静默退化成空串放行）。 */
function sliceBetween(html, from, to) {
  const i = html.indexOf(from);
  assert.ok(i >= 0, '产物里找不到起点标记：' + from);
  const j = to === null ? html.length : html.indexOf(to, i + from.length);
  assert.ok(j > i, '产物里找不到终点标记：' + to);
  return html.slice(i, j);
}

/** 一张卡的卡体字面（`<section id="…">` 到它自己的 `</section>`；卡内不再套 section）。空卡返回空串。 */
function cardHtml(html, id) {
  const start = html.indexOf('<section id="' + id + '">');
  if (start < 0) return '';
  const end = html.indexOf('</section>', start);
  assert.ok(end > start, id + ' 卡没有闭合标记');
  return html.slice(start, end);
}

/** 参数名命中（词边界匹配，`heartRate` 不许在别的词里蹭到）。 */
function paramHits(text) {
  const hit = [];
  for (const name of PARAM_NAMES) {
    const re = new RegExp('(^|[^A-Za-z0-9_])' + name + '([^A-Za-z0-9_]|$)', 'g');
    const m = text.match(re);
    if (m !== null) hit.push(name + '×' + m.length);
  }
  return hit;
}

/** snake_case 形态 token 白名单：表名与 SQLite 口径词，不是参数名（页头来源行与口径行的既有说法）。 */
const CALIBER_WORDS = new Set(['exercise_log', 'total_changes', 'calorie_data']);
function snakeTokens(text) {
  const raw = text.match(/(^|[^A-Za-z0-9_])[a-z][a-z0-9]*_[a-z0-9_]+/g) ?? [];
  return [...new Set(raw.map((s) => s.replace(/^[^A-Za-z0-9_]+/, '')))];
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git' || e.name === '.scratch') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|mjs|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

function snapName(name) {
  return name.replace(/[（）]/g, '');
}

for (const [name, key, spec, seed] of CASES) {
  test('#449 ①／② ' + name + '：可见文本与卡区零参数名', () => {
    const dir = mkDir();
    let params = spec;
    if (seed !== undefined) {
      const s = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: seed });
      assert.equal(s.status, 0, name + ' 种子 exit=' + s.status + ' stderr=' + s.stderr.slice(-200));
      if (key === 'calorie.exercise.update' && params === 'byId') params = { id: s.envelope.data.receipt.recordId, minutes: 40 };
      if (key === 'calorie.exercise.remove' && params === 'byId') params = { id: s.envelope.data.receipt.recordId };
    }
    if (name === '批量删运动') {
      const s2 = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 });
      assert.equal(s2.status, 0, name + ' 第二条种子 exit=' + s2.status);
      const s3 = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D3 });
      assert.equal(s3.status, 0, name + ' 范围外的第三条种子 exit=' + s3.status);
    }
    const r = runCli(dir, key, params);
    assert.equal(r.status, 0, name + ' exit=' + r.status + ' stderr=' + r.stderr.slice(-300));
    const file = r.file;
    assert.ok(file !== null && file.length > 10000, name + ' 产物缺失或过短');

    const text = visibleText(file);
    const textHits = paramHits(text);
    const cardText = visibleText(sliceBetween(file, '<div class="ilife-block-kpi-card-grid">', '<p class="ilife-block-caliber">'));
    assert.ok(cardText.includes('写入字段'), name + ' 卡区切片里没有「写入字段」卡，切片口径已失效');
    const cardHits = paramHits(cardText);
    const cardSnake = snakeTokens(cardText).filter((t) => !CALIBER_WORDS.has(t));
    const changeCard = visibleText(cardHtml(file, 'sec-change'));
    const changeHits = paramHits(changeCard);
    const changeSnake = snakeTokens(changeCard).filter((t) => !CALIBER_WORDS.has(t));
    const residual = snakeTokens(text).filter((t) => !CALIBER_WORDS.has(t));

    console.log('READING #449 ' + name + ' 可见文本命中=' + textHits.length + JSON.stringify(textHits)
      + ' 卡区命中=' + cardHits.length + ' 变更卡命中=' + changeHits.length
      + ' 卡区残留=' + JSON.stringify(cardSnake));

    assert.deepEqual(textHits, [], name + ' 可见文本里还有参数名：' + textHits.join('、'));
    assert.deepEqual(cardHits, [], name + ' 写入字段卡里还有参数名：' + cardHits.join('、'));
    assert.deepEqual(cardSnake, [], name + ' 写入字段卡里还有 snake_case 形态 token：' + cardSnake.join('、'));
    assert.deepEqual(changeHits, [], name + ' 字段变更卡里还有参数名：' + changeHits.join('、'));
    assert.deepEqual(changeSnake, [], name + ' 字段变更卡里还有 snake_case 形态 token：' + changeSnake.join('、'));
    assert.deepEqual(residual, [], name + ' 可见文本里还有白名单外的 snake_case token：' + residual.join('、'));

    // 读数留档：写入字段卡上的字段键逐条记一份（标签表覆盖面的凭据）。
    const written = r.envelope?.data?.receipt?.writtenFields ?? [];
    for (const f of written) SEEN_KEYS.add(f);
    console.log('READING #449 ' + name + ' writtenFields=' + JSON.stringify(written)
      + ' 标签=' + JSON.stringify(written.map((f) => fieldLabel('exercise', f))));
  });
}

test('#449 ③a 缺项回退原键名（查表口径）', () => {
  assert.equal(fieldLabel('exercise', 'duration_minutes'), '时长', '已登记键必须给中文标签');
  assert.equal(fieldLabel('exercise', 'no_such_field_449'), 'no_such_field_449', '缺项必须回退原键名');
  assert.equal(fieldLabel('exercise', ''), '', '空键回退空串（不编字）');
});

test('#449 ③b 缺项回退原键名（页面端到端）', () => {
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30 });
  assert.equal(r.status, 0, '种子 exit=' + r.status);
  const receipt = { ...r.envelope.data.receipt, writtenFields: ['no_such_field_449'] };
  const db = openDb(join(dir, 'calorie_data.db'));
  const html = buildExerciseReceiptDoc(db, 'calorie.exercise.add', receipt, "calorie-cmd-read calorie.exercise.add --params '{}'", {});
  db.close();
  const text = visibleText(html);
  assert.ok(text.includes('no_such_field_449'), '页面端到端：表里没有的字段键应原样印出（回退原键名）');
  assert.equal(text.includes('时长'), true, '同页已登记字段仍走中文标签');
});

test('#449 ④ 标签单源：运动域标签表与域登记都只有一处', () => {
  const colKeys = PARAM_NAMES.filter((n) => n.includes('_'));
  const bind = new RegExp('(^|[^A-Za-z0-9_])(' + colKeys.join('|') + ')["\']?\\s*:\\s*["\'][^"\']*[\\u4e00-\\u9fff]');
  const tableFiles = [];
  const registerFiles = [];
  for (const pkg of readdirSync(join(ROOT, 'packages'))) {
    const src = join(ROOT, 'packages', pkg, 'src');
    if (!existsSync(src)) continue;
    for (const f of walk(src)) {
      const text = readFileSync(f, 'utf8');
      const rel = relative(ROOT, f).replace(/\\/g, '/');
      if (bind.test(text)) tableFiles.push(rel);
      // 登记调用：定义件（`shared/fieldLabel.ts` 自己那份导出）不算调用方，除它之外只许一处登记。
      if (/registerFieldLabels\s*\(/.test(text) && !rel.endsWith('shared/fieldLabel.ts')) registerFiles.push(rel);
    }
  }
  console.log('READING #449 单源 标签表命中文件=' + JSON.stringify(tableFiles));
  console.log('READING #449 单源 域登记命中文件=' + JSON.stringify(registerFiles));
  assert.deepEqual(tableFiles, ['packages/skill-calorie/src/exercise/fieldLabels.ts'], '运动域字段中文标签表必须只有一处定义');
  assert.deepEqual(registerFiles, ['packages/skill-calorie/src/exercise/fieldLabels.ts'], '运动域标签表登记必须只有一处');
});

test('#449 ⑤ 标签表覆盖本票 13 条写词印出的全部字段键（无沉默回退）', async () => {
  const mod = await import(pathToFileURL(join(HERE, '..', 'dist', 'exercise', 'fieldLabels.js')).href);
  const table = mod.EXERCISE_FIELD_LABELS;
  // 冻结面：① 三种写命令回执 `writtenFields` 报的键（`F.exercise` 16 键 ＋ 删类的 `is_deleted`）；
  // ② 字段变更卡按行键摆的库列名（`SNAPSHOT_COLS` 那批）。
  const frozen = ['type', 'calories', 'minutes', 'date', 'time', 'note', 'reps', 'category', 'difficulty', 'distance',
    'heartRate', 'maxHeartRate', 'steps', 'setIndex', 'loadKg', 'backfill', 'is_deleted',
    'exercise_type', 'duration_minutes', 'calories_burned', 'distance_km', 'avg_heart_rate', 'max_heart_rate',
    'load_kg', 'set_index', 'is_backfill'];
  for (const f of frozen) {
    const label = fieldLabel('exercise', f);
    assert.notEqual(label, f, '字段 ' + f + ' 在标签表里缺项（不许沉默回退）');
    assert.equal(/[A-Za-z0-9]/.test(label), false, '字段 ' + f + ' 的标签不是纯中文：「' + label + '」');
    assert.equal(table[f], label, '字段 ' + f + ' 的标签必须来自标签表本身');
  }
  // 真跑带到的字段键（本文件前几条判据逐条实测所得）也应落在同一张表里。
  if (SEEN_KEYS.size > 0) {
    for (const f of SEEN_KEYS) assert.equal(fieldLabel('exercise', f), table[f], '真跑字段 ' + f + ' 必须走标签表');
  }
  console.log('READING #449 覆盖面 冻结字段键=' + frozen.length + ' 全部有纯中文标签；真跑带到字段键=' + SEEN_KEYS.size + ' 全部走标签表');
});
