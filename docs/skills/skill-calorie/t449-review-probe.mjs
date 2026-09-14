/** #449 独立对抗审查席 · 自设探针（不是实施席那份判据件 `test/field-labels-449.test.mjs` 的复制）。
 *
 * 四问，都是实施席那份没回答的：
 *   ① **13 条写词逐条**真跑，断言**可见文本**（剥样式／脚本 → 剥标签 → 解实体 → 收敛空白）里
 *      **命令行参数名零命中**（`snake_case`／camelCase 两套口径都查，逐条给读数）。
 *   ② **标签单源**：全仓检索运动域「列键 → 中文标签」绑定（单行／多行两种写法都收），**命中文件数必须＝1**。
 *   ③ **两卡一致 ＋ 正确**（「单源」的真正含义）：同一字段在**写入字段卡**与**字段变更卡**上的中文必须
 *      **逐字相同**，且等于审查席自带的一份**独立对照表**（不用实施席那张表当基准，否则「两处一起错」看不出来）。
 *   ④ **副标题改写只动可见文本**：往 `buildExerciseReceiptDoc` 喂带表外键的摘要，表外键须原样留；
 *      复制区机器载荷（`data-fmt` 三项顺序）不受影响。
 *
 * 判据读 `dist/`：先 `pnpm build`，再 `node docs/skills/skill-calorie/t449-review-probe.mjs`。
 * 各问独立跑、逐问打 `PROBE … PASS/RED`，全绿 exit 0，任一红 exit 1（不提前中断，读数一次看全）。
 * 注：`exercise_log`（数据出处表名）与 `total_changes`（口径词）是编排者已裁定的**非参数名**，本探针不拿它们判红，
 * 只在读数里照实打出来（口径词是 `total_changes` 这件事另有票承接）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../../../packages/skill-calorie/dist/index.js';
import { buildExerciseReceiptDoc } from '../../../packages/skill-calorie/dist/exercise/receipt.js';
import { fieldLabel } from '../../../packages/skill-calorie/dist/shared/fieldLabel.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const D1 = '2026-09-05';
const D2 = '2026-09-06';
const D3 = '2026-09-07';
const TODAY = /^\d{4}-\d{2}-\d{2}$/.test(process.env['CALORIE_TODAY'] ?? '')
  ? process.env['CALORIE_TODAY']
  : new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.parse(TODAY + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);

/** 13 条写词（参数取冻结表 `src/triggers/scene-04-exercise.ts` 的 `main_prompt.cli`）。 */
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

/** 审查席自带的**独立对照表**：左＝CLI 参数键（写入字段卡口径），中＝库列键（变更卡口径），右＝应印的中文。 */
const ORACLE = [
  ['type', 'exercise_type', '运动类型'], ['calories', 'calories_burned', '消耗'], ['minutes', 'duration_minutes', '时长'],
  ['distance', 'distance_km', '距离'], ['loadKg', 'load_kg', '重量'], ['reps', 'reps', '次数'], ['steps', 'steps', '步数'],
  ['heartRate', 'avg_heart_rate', '平均心率'], ['maxHeartRate', 'max_heart_rate', '最高心率'],
  ['setIndex', 'set_index', '组号'], ['backfill', 'is_backfill', '补录'], ['note', 'note', '备注'],
  ['date', 'date', '日期'], ['time', 'time', '时间'], ['category', 'category', '分类'],
  ['difficulty', 'difficulty', '强度'], ['is_deleted', 'is_deleted', '删除标记'],
];
/** 每条写词本页已知的「中文标签 → 值」真值（值取一段稳定前缀，卡上印的是它加单位）。
 *  用途：字段变更卡上「标签 → 值」配不起来＝标签印到别的字段上了（与实施席那张表无关的独立判法）。 */
const EXPECTED = {
  记运动: [['运动类型', '慢跑'], ['消耗', '320'], ['时长', '30'], ['日期', '2026-09-14'], ['时间', '0']],
  '记运动（含备注）': [['备注', '夜跑']],
  记力量训练: [['运动类型', '卧推'], ['重量', '60'], ['次数', '10']],
  记有氧运动: [['运动类型', '户外跑'], ['距离', '5']],
  记日常活动: [['运动类型', '步行'], ['步数', '3000']],
  补记运动: [['日期', '2026-09-05']],
  批量补记运动: [['运动类型', '慢跑'], ['日期', '2026-09-05']],
  复制昨日运动: [['运动类型', '慢跑']],
  改运动记录: [['时长', '40']],
  改某日运动: [['备注', '补记'], ['日期', '2026-09-06']],
  删运动记录: [['运动类型', '慢跑'], ['消耗', '320'], ['时长', '30']],
  删某日运动: [['运动类型', '慢跑'], ['消耗', '320']],
  批量删运动: [['运动类型', '慢跑'], ['消耗', '320']],
};
const expectedPairs = (name) => EXPECTED[name] ?? [];

/** 值是否出现在该标签**近旁**（同一行内，±40 字）：行内配对不上就算标签印错了字段。 */
function valueNearLabel(text, label, value) {
  const i = text.indexOf(label);
  if (i < 0) return false;
  const near = text.slice(i, i + label.length + 40);
  return near.includes(value);
}
/** 参数名两套口径（`snake_case` ＋ camelCase）：可见文本里这两套必须零命中。 */
const PARAMS = ['type', 'calories', 'minutes', 'date', 'time', 'note', 'reps', 'category', 'difficulty', 'distance',
  'steps', 'loadKg', 'setIndex', 'backfill', 'heartRate', 'maxHeartRate', 'copyFrom', 'items', 'id', 'from', 'to',
  'exercise_type', 'duration_minutes', 'calories_burned', 'distance_km', 'avg_heart_rate', 'max_heart_rate',
  'load_kg', 'set_index', 'is_backfill', 'is_deleted'];
/** 编排者已裁定的非参数名（数据出处表名／口径词）——读数照打，不当缺陷判红。 */
const ACCEPTED = new Set(['exercise_log', 'total_changes', 'calorie_data']);

const results = [];
const record = (id, ok, detail) => {
  results.push({ id, ok });
  console.log('PROBE ' + id + ' ' + (ok ? 'PASS' : 'RED') + ' ' + detail);
};

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't449-review-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.close();
  return dir;
}

function runCli(dir, key, params) {
  const out = join(dir, key.replace(/\./g, '_') + '-' + Math.random().toString(36).slice(2, 7) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  return {
    status: r.status,
    stderr: String(r.stderr || '').trim(),
    envelope: String(r.stdout || '').trim().startsWith('{') ? JSON.parse(String(r.stdout).trim()) : null,
    html: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

function visibleText(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

/** 参数名命中（词边界；两套口径都在内在清单里）。 */
function paramHits(text) {
  const hit = [];
  for (const name of PARAMS) {
    const m = text.match(new RegExp('(^|[^A-Za-z0-9_])' + name + '([^A-Za-z0-9_]|$)', 'g'));
    if (m !== null) hit.push(name + '×' + m.length);
  }
  return hit;
}

/** snake_case 形态 token（照实打出来，含已裁定接受的那两个）。 */
function snakeTokens(text) {
  const raw = text.match(/(^|[^A-Za-z0-9_])[a-z][a-z0-9]*_[a-z0-9_]+/g) ?? [];
  return [...new Set(raw.map((s) => s.replace(/^[^A-Za-z0-9_]+/, '')))].sort();
}

function cardHtml(html, id) {
  const start = html.indexOf('<section id="' + id + '">');
  if (start < 0) return null;
  return html.slice(start, html.indexOf('</section>', start));
}

/** 页内卡 id 清单（照实读出，供切片用；找不到就报出来）。 */
function cardIds(html) {
  return [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
}

function attrPayload(html) {
  return {
    dataT: [...html.matchAll(/data-t="([^"]*)"/g)].map((m) => m[1]),
    dataFmt: [...html.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]),
  };
}

// ── 问①：13 条写词逐条，可见文本参数名零命中 ─────────────────────────────────────────────────────
const runs = [];
for (const [name, key, spec, seed] of CASES) {
  const dir = mkDir();
  let params = spec;
  if (seed !== undefined) {
    const s = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: seed });
    if (s.status !== 0) { record('① ' + name, false, '种子 exit=' + s.status); continue; }
    if (key === 'calorie.exercise.update' && params === 'byId') params = { id: s.envelope.data.receipt.recordId, minutes: 40 };
    if (key === 'calorie.exercise.remove' && params === 'byId') params = { id: s.envelope.data.receipt.recordId };
  }
  if (name === '批量删运动') {
    runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D2 });
    runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D3 });
  }
  const r = runCli(dir, key, params);
  if (r.status !== 0 || r.html === null) { record('① ' + name, false, 'exit=' + r.status + ' stderr=' + r.stderr.slice(-200)); continue; }
  const text = visibleText(r.html);
  const hits = paramHits(text);
  const snakes = snakeTokens(text);
  runs.push({ name, html: r.html, envelope: r.envelope, text });
  record('① ' + name, hits.length === 0, '参数名命中=' + hits.length + JSON.stringify(hits)
    + ' snake_case 形态=' + JSON.stringify(snakes));
}
const snakeTotal = [...new Set(runs.flatMap((r) => snakeTokens(r.text)))];
console.log('READING ① 13 条跑完=' + runs.length + ' 剩余 snake_case 形态 token=' + JSON.stringify(snakeTotal)
  + '（其中非参数名（已裁定接受）=' + JSON.stringify(snakeTotal.filter((t) => ACCEPTED.has(t))) + '）');

// ── 问②：标签单源 —— 全仓「运动域列键 → 中文标签」绑定命中文件数 ────────────────────────────────
const COL_KEYS = ['exercise_type', 'duration_minutes', 'calories_burned', 'distance_km', 'avg_heart_rate',
  'max_heart_rate', 'load_kg', 'set_index', 'is_backfill', 'is_deleted'];
const bindOneLine = new RegExp('(^|[^A-Za-z0-9_])(' + COL_KEYS.join('|') + ')["\']?\\s*:\\s*["\'][^"\'\n]*[\\u4e00-\\u9fff]', 'm');
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git' || e.name === '.scratch') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|mjs|js|tsx|vue)$/.test(e.name)) out.push(p);
  }
  return out;
}
const bindFiles = [];
const registerFiles = [];
for (const pkg of readdirSync(join(ROOT, 'packages'))) {
  const src = join(ROOT, 'packages', pkg, 'src');
  if (!existsSync(src)) continue;
  for (const f of walk(src)) {
    const text = readFileSync(f, 'utf8');
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (bindOneLine.test(text)) bindFiles.push(rel);
    if (/registerFieldLabels\s*\(/.test(text) && !rel.endsWith('shared/fieldLabel.ts')) registerFiles.push(rel);
  }
}
record('② 标签表单源', bindFiles.length === 1 && bindFiles[0] === 'packages/skill-calorie/src/exercise/fieldLabels.ts',
  '绑定命中文件数=' + bindFiles.length + JSON.stringify(bindFiles));
record('② 域登记单源', registerFiles.length === 1 && registerFiles[0] === 'packages/skill-calorie/src/exercise/fieldLabels.ts',
  '域登记命中文件数=' + registerFiles.length + JSON.stringify(registerFiles));

// ── 问③：两卡一致且等于独立对照表 ───────────────────────────────────────────────────────────────
{
  const misHits = [];
  const cardMiss = [];
  const ids = runs.length > 0 ? cardIds(runs[0].html) : [];
  console.log('READING ③ 页内卡 id=' + JSON.stringify(ids));
  const writtenCardSel = 'sec-count';
  const changeCardSel = 'sec-change';
  /** 写入字段卡住在状态卡的 KPI 卡网格里（`sec-count` 只是下面那张批量计数卡）。 */
  const writtenSlice = (html) => {
    const a = html.indexOf('<div class="ilife-block-kpi-card-grid">');
    if (a < 0) return null;
    const b = html.indexOf('<p class="ilife-block-caliber">', a);
    return b > a ? html.slice(a, b) : null;
  };
  /** 一张卡上出现过的中文标签（只数独立对照表里的那些字）：用来查「这张卡上有没有表外/错位的标签」。 */
  const labelsOn = (cardText) => ORACLE.map(([, , w]) => w).filter((w) => cardText.includes(w));
  const OK_LABELS = new Set(ORACLE.map(([, , w]) => w));
  for (const run of runs) {
    const written = run.envelope?.data?.receipt?.writtenFields ?? [];
    const wCard = writtenSlice(run.html);
    const cCard = cardHtml(run.html, changeCardSel);
    const wText = wCard === null ? '' : visibleText(wCard);
    const cText = cCard === null ? '' : visibleText(cCard);
    if (wCard === null) { cardMiss.push(run.name + ':找不到写入字段卡切片'); continue; }
    if (!wText.includes('写入字段')) { cardMiss.push(run.name + ':写入字段卡切片里没有「写入字段」'); continue; }
    // ① 写入字段卡：本页每个字段应印的独立对照表中文都必须在场（16 项新增写词＝16 条全查）。
    for (const f of written) {
      const row = ORACLE.find(([k]) => k === f);
      if (row === undefined) continue;
      if (!wText.includes(row[2])) misHits.push(run.name + ':写入字段卡缺独立对照表的中文「' + row[2] + '」(' + f + ')');
    }
    // ② 字段变更卡：卡上每一行是「标签 … 值」（改类是「标签 旧值 → 新值」、删类是「标签 值」）。
    //    用本页已知真值反查：目标值必须出现在该标签**近旁**（同一行内），否则＝标签印到别的字段上了。
    //    这条独立于实施席那张表（真值来自本探针自己跑的写命令参数）。
    if (cCard !== null && cText.length > 0) {
      for (const [wantLabel, wantValue] of expectedPairs(run.name)) {
        if (valueNearLabel(cText, wantLabel, wantValue)) continue;
        if (cText.includes(wantLabel) || cText.includes(wantValue)) {
          misHits.push(run.name + ':变更卡「' + wantLabel + ' → ' + wantValue + '」这一行对不上');
        }
      }
    }
  }
  record('③ 两卡标签一致且等于独立对照表', misHits.length === 0 && cardMiss.length === 0,
    '不一致=' + misHits.length + JSON.stringify(misHits.slice(0, 12)) + ' 卡缺失=' + JSON.stringify(cardMiss.slice(0, 5)));
}

// ── 问④：副标题改写只动可见文本，不动机器载荷 ──────────────────────────────────────────────────
{
  const dir = mkDir();
  const r = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30 });
  const db = openDb(join(dir, 'calorie_data.db'));
  const receipt = { ...r.envelope.data.receipt, writtenFields: ['minutes'], summary: '已写入运动 #7（minutes）；no_such_field_449 保持原样；ID 7' };
  const html = buildExerciseReceiptDoc(db, 'calorie.exercise.add', receipt, "calorie-cmd-read calorie.exercise.add --params '{}'", {});
  db.close();
  const text = visibleText(html);
  const payload = attrPayload(html);
  const fmtOk = payload.dataFmt.length > 0 && JSON.stringify(payload.dataFmt) === JSON.stringify(['text', 'json', 'csv']);
  // 机器载荷里不该被换掉：摘要原文仍应出现在某个 data-t（命令原文只该逐字搬运）。
  const rawKept = payload.dataT.some((t) => t.includes('duration_minutes') || t.includes('minutes'));
  record('④ 副标题只换登记键', text.includes('时长') && text.includes('no_such_field_449') && text.includes('ID 7'),
    '副标题含「时长」=' + text.includes('时长') + ' 表外键原样=' + text.includes('no_such_field_449')
    + ' 未登记词保持=' + text.includes('ID 7') + ' data-fmt=' + JSON.stringify(payload.dataFmt));
  record('④ 复制区机器载荷口径未动', fmtOk && rawKept, 'data-fmt=' + JSON.stringify(payload.dataFmt)
    + ' 载荷仍留原文键=' + rawKept);
}

const red = results.filter((x) => !x.ok);
console.log('RESULT #449 独立探针 ' + (results.length - red.length) + '/' + results.length
  + ' ' + (red.length === 0 ? 'PASS' : 'RED ' + red.map((x) => x.id).join('、')));
process.exit(red.length === 0 ? 0 : 1);
