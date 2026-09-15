#!/usr/bin/env node
/** #276 · 餐别 5 条词（地图 #155 · 卡路里场景 02 饮食）的可复跑判据。
 *
 * 为什么命令行**从运行期总表取**、不手打：`src/home/routes.ts` 改了、`src/triggers/routes.generated.ts`
 * 没重生成，就会「声明看着改了、运行期还是老参数」——手打命令行会把这个沉默缺陷绕过去。
 * 所以每条词的命令行读 `ALL_ROUTES`（运行期派生件）原文，再原样跑唯一出口 `calorie-cmd-read`。
 *
 * 判据（逐条出真／假）：
 *   1 五条词各自 exit 0，产物落盘且是完整文档；
 *   2 五份产物 sha256 互异；
 *   3 各自页内出现对应餐别名（早餐／午餐／晚餐／加餐／全部餐别），且页头是餐别分布页；
 *   4 各页只出**本餐别**的明细行（种子按餐别打了互斥标记，别的餐别的标记不许出现）；
 *   5 不给 `meal` 的调用逐字节不变：场景 01「看今日饮食概览」与「看饮食总览」两条记录，
 *     产物 sha256 与改动前基线逐字相同（先跑 `--baseline` 取基线）；
 *   6 餐别取值只认值不猜值：未知值 exit 2；别名（`all`／`全部餐别`）走同一处别名表，非本票新增取值表。
 *
 * 用法：
 *   node docs/skills/skill-calorie/t276-餐别修复-run.mjs --baseline      # 改动前取基线（判据 5 的对照面）
 *   node docs/skills/skill-calorie/t276-餐别修复-run.mjs                 # 播种 ＋ 跑全部判据
 *   node docs/skills/skill-calorie/t276-餐别修复-run.mjs --no-seed       # 用现有库跑（别重播种子）
 *   node docs/skills/skill-calorie/t276-餐别修复-run.mjs --mutate-check  # 变异自证整圈（改坏→红，还原→绿）
 *
 * 环境：自设 `SKILLS_DB_PATH`（默认 `<repo>/.scratch/t276f/db`，可用 `T276F_DB_DIR` 覆盖）；
 * 「今天」用 `CALORIE_TODAY` 钉住（默认机器当刻 UTC 日，可用 `T276F_TODAY` 覆盖）——窗口与种子同源，
 * 故本脚本换一天照样复跑。写命令要 `CALORIE_FORCE_PROD=1`（`paths.assertWritablePath` 只放行 tmp）。
 * 退出码：0 全绿；1 有判据为红（逐条打印 RED 行）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PKG = path.join(ROOT, 'packages', 'skill-calorie');
const CLI = path.join(PKG, 'dist', 'cli', 'cmd_read.js');
const TODAY_FILE = path.join(PKG, 'src', 'home', 'today.ts');
const DIST_TODAY = path.join(PKG, 'dist', 'home', 'today.js');
const TSC = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const SCRATCH = path.join(ROOT, '.scratch', 't276f');
const DB_DIR = process.env.T276F_DB_DIR ?? path.join(SCRATCH, 'db');
const BASELINE = path.join(SCRATCH, 'baseline.json');
const TODAY = process.env.T276F_TODAY ?? new Date().toISOString().slice(0, 10);
const ARGV = process.argv.slice(2);
fs.mkdirSync(SCRATCH, { recursive: true });

/* ── 日期算术（一律 UTC，与 `todayISO()`／`shiftISODate()` 同口径） ── */
const DAY = 86400000;
const at = (iso) => Date.parse(iso + 'T12:00:00Z');
const shift = (iso, n) => new Date(at(iso) + n * DAY).toISOString().slice(0, 10);
const firstOfMonth = (iso, back) => {
  const d = new Date(at(iso));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1)).toISOString().slice(0, 10);
};

/* ── 逐条判据 ＋ 一份落盘日志（`.scratch/t276f/`） ─────────────── */
const STAMP = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const LOG = path.join(SCRATCH, 'run-' + STAMP + '.log');
const results = [];
function emit(line) {
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}
function check(ok, label, detail) {
  results.push({ ok, label, detail });
  emit((ok ? 'PASS ' : 'RED  ') + label + (detail === undefined ? '' : '  |  ' + detail));
}
const note = (line) => emit('  ' + line);

/* ── 跑一次唯一出口 ─────────────────────────────────────────── */
function run(key, params) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  const r = spawnSync(process.execPath, [CLI, ...a], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: DB_DIR, CALORIE_TODAY: TODAY, CALORIE_FORCE_PROD: '1' },
  });
  let env = null;
  try { env = JSON.parse((r.stdout ?? '').trim()); } catch { /* 非 0 时 stdout 为空 */ }
  return { code: r.status, env, err: (r.stderr ?? '').trim() };
}

/** 落盘产物读数：绝对路径／字节／sha256／正文。 */
function artifact(env) {
  const p = env?.data?.output;
  if (typeof p !== 'string' || !fs.existsSync(p)) return null;
  const buf = fs.readFileSync(p);
  return {
    path: path.resolve(p), bytes: buf.length, html: buf.toString('utf8'),
    sha256: createHash('sha256').update(buf).digest('hex'),
  };
}
function h1Of(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}
function tail(line, n = 100) { return line.replace(/\s+/g, ' ').slice(0, n); }

/* ── 运行期总表：命令行取原文，不手打 ───────────────────────── */
const { ALL_ROUTES } = await import(pathToFileURL(path.join(PKG, 'dist', 'triggers', 'routes.generated.js')).href);
function routeFor(name) {
  const hits = ALL_ROUTES.filter((r) => r.wakeWord === name);
  if (hits.length !== 1) throw new Error('唤醒词在运行期总表里不是恰好一条：' + name + '（' + hits.length + ' 条）');
  const m = /^calorie-cmd-read\s+(\S+)(?:\s+--params\s+'([\s\S]*)')?$/.exec(hits[0].cli);
  if (!m) throw new Error('cli 原文解析不了：' + hits[0].cli);
  return { name, key: m[1], params: m[2] === undefined ? undefined : JSON.parse(m[2]), cli: hits[0].cli, route: hits[0] };
}

/* ── 种子 ──────────────────────────────────────────────────────
 * 餐别判据靠**时间**归桶（`fetch/diet.ts` 的 inferMealType：6-9 早餐／10-13 午餐／18-21 晚餐／
 * 其余归加餐），故每条记录都带钟点；食物名带本餐别专属标记（BF-／LN-／DN-／SN-），供判据 4 判
 * 「这一页只出这一餐的明细」。窗口：今日／昨日／本周／上周（相对今天）＋本月靠前 ＋上月两个散点。 */
const MEALS = [
  { label: '早餐', time: '08:00', tag: 'BF', cal: 320 },
  { label: '午餐', time: '12:30', tag: 'LN', cal: 620 },
  { label: '晚餐', time: '20:00', tag: 'DN', cal: 700 },
  { label: '加餐', time: '15:30', tag: 'SN', cal: 180 },
];
const seedDates = () => [
  ...Array.from({ length: 15 }, (_, i) => shift(TODAY, -i)),          // 今日／昨日／本周／上周／7d
  ...(process.env.T276F_SKIP_MONTH === '1' ? [] : [shift(firstOfMonth(TODAY, 1), 4), shift(firstOfMonth(TODAY, 1), 19)]),
];
const seedItems = (dates) => dates.flatMap((date) => MEALS.map((m) => ({
  date, time: m.time, foodName: m.tag + '-' + date.slice(5).replace('-', ''),
  grams: 150, calories: m.cal, protein: 12, carbs: 30, fat: 6,
})));
/** 真表读数（不采信 CLI 自报，直接读 SQLite 数窗口内的记录）。 */
function bucketCounts(start, end) {
  const db = new DatabaseSync(path.join(DB_DIR, 'calorie_data.db'));
  const rows = db.prepare('SELECT date, time FROM food_log WHERE date >= ? AND date <= ? ORDER BY date, time').all(start, end);
  db.close();
  const by = { 早餐: 0, 午餐: 0, 晚餐: 0, 加餐: 0 };
  for (const r of rows) {
    const h = Number(String(r.time ?? '').slice(0, 2));
    by[h >= 6 && h < 10 ? '早餐' : h >= 10 && h < 14 ? '午餐' : h >= 18 && h < 22 ? '晚餐' : '加餐'] += 1;
  }
  return { rows: rows.length, by };
}
function seed() {
  fs.rmSync(DB_DIR, { recursive: true, force: true });
  fs.mkdirSync(DB_DIR, { recursive: true });
  const dates = seedDates();
  const r = run('calorie.diet.batch', { items: seedItems(dates) });
  check(r.code === 0, '种子：批量写命令 exit 0', r.code === 0 ? '' : tail(r.err.split('\n')[0] ?? ''));
  const start = shift(TODAY, -6);                                     // 五条词的窗＝7d＝今天-6..今天
  const c = bucketCounts(start, TODAY);
  note('种子 ' + dates.length + ' 天（' + dates[dates.length - 1] + ' ~ ' + TODAY + '）；7d 窗 ' + start + ' ~ ' + TODAY + ' 真表 ' + c.rows + ' 条');
  for (const m of MEALS) check(c.by[m.label] > 0, '种子：7d 窗内「' + m.label + '」有记录', '真表 ' + c.by[m.label] + ' 条');
}

/* ── 判据主场 ──────────────────────────────────────────────── */
const FIVE = [
  { word: '看早餐（最近 7 天）', meal: '早餐', label: '早餐', tag: 'BF' },
  { word: '看午餐（最近 7 天）', meal: '午餐', label: '午餐', tag: 'LN' },
  { word: '看晚餐（最近 7 天）', meal: '晚餐', label: '晚餐', tag: 'DN' },
  { word: '看加餐（最近 7 天）', meal: '加餐', label: '加餐', tag: 'SN' },
  { word: '看全部餐别分布（最近 7 天）', meal: 'all', label: '全部餐别', tag: null },
];
/** 不给 `meal` 的对照面（判据 5 的比对对象）：场景 01 那条 ＋ 同键的「看饮食总览」。 */
const NO_MEAL = ['看今日饮食概览', '看饮食总览'];
const TAGS = MEALS.map((m) => m.tag);

function phaseFive() {
  emit('\n== 判据 1-4 · 五条词各自实跑 ==');
  const seen = new Map();
  for (const f of FIVE) {
    const w = routeFor(f.word);
    check(w.params?.meal === f.meal, '运行期总表带餐别参数 meal=' + f.meal + '：' + f.word, JSON.stringify(w.params));
    const r = run(w.key, w.params);
    const art = artifact(r.env);
    note(f.word + '  key=' + w.key + '  cli=' + w.cli);
    note('   exit=' + r.code + '  路径=' + (art === null ? '(无产物)' : art.path) +
      '  字节=' + (art === null ? '-' : art.bytes) + '  sha256=' + (art === null ? '-' : art.sha256) +
      '  h1=' + JSON.stringify(art === null ? '' : h1Of(art.html)));
    check(r.code === 0, '判据 1 exit 0：' + f.word, r.code === 0 ? '' : tail(r.err.split('\n')[0] ?? ''));
    check(art !== null && art.bytes > 0 && art.html.trimEnd().endsWith('</html>'), '判据 1 产物是完整文档：' + f.word,
      art === null ? '无产物' : art.bytes + ' B');
    check(art !== null && art.html.includes(f.label), '判据 3 页内出现餐别名「' + f.label + '」：' + f.word);
    check(art !== null && h1Of(art.html).includes('餐别分布'), '判据 3 页头是餐别分布页：' + f.word,
      'h1=' + JSON.stringify(art === null ? '' : h1Of(art.html)));
    if (f.tag === null) {
      check(art !== null && TAGS.every((t) => art.html.includes(t + '-')), '判据 4 全部餐别页出四餐明细：' + f.word);
    } else {
      const other = TAGS.filter((t) => t !== f.tag).map((t) => t + '-');
      check(art !== null && art.html.includes(f.tag + '-'), '判据 4 页内出本餐别明细行：' + f.word, f.tag + '-');
      check(art !== null && other.every((t) => !art.html.includes(t)), '判据 4 页内不出别的餐别明细行：' + f.word,
        '不该出现 ' + other.join('／'));
    }
    if (art !== null) seen.set(f.word, art.sha256);
  }
  const uniq = new Set(seen.values());
  check(uniq.size === FIVE.length, '判据 2 五份产物内容互不相同', '互异 ' + uniq.size + '/' + FIVE.length);
  return { uniq: uniq.size };
}

function phaseNoMeal(baseline) {
  emit('\n== 判据 5-6 · 不给 meal 的调用逐字节不变 ＋ 只认值不猜值 ==');
  for (const name of NO_MEAL) {
    const w = routeFor(name);
    check(w.params?.meal === undefined, '这条记录确实不带 meal：' + name, JSON.stringify(w.params));
    const r = run(w.key, w.params);
    const art = artifact(r.env);
    check(r.code === 0, 'exit 0：' + name, r.code === 0 ? '' : tail(r.err.split('\n')[0] ?? ''));
    note(name + '  cli=' + w.cli);
    note('   exit=' + r.code + '  字节=' + (art === null ? '-' : art.bytes) +
      '  sha256=' + (art === null ? '-' : art.sha256) + '  h1=' + JSON.stringify(art === null ? '' : h1Of(art.html)));
    const want = baseline?.[name];
    check(art !== null && want !== undefined && art.sha256 === want, '判据 5 与改动前基线逐字节相同：' + name,
      art === null ? '无产物' : want === undefined ? '基线缺失（先跑 --baseline）' : '当刻 ' + art.sha256 + ' 基线 ' + want);
  }
  const w = routeFor('看全部餐别分布（最近 7 天）');
  const bad = run(w.key, { window: '7d', meal: '宵夜' });
  check(bad.code === 2, '判据 6 未知餐别值 exit 2（只认值不猜值）', 'exit=' + bad.code + ' ' + tail(bad.err.split('\n')[0] ?? ''));
  const alias = run(w.key, { window: '7d', meal: '全部餐别' });
  note('别名「全部餐别」读数：exit=' + alias.code + '（`mealParamOf` 的别名表同一处，非本票新增取值表）');
  return bad.code;
}

/** 变异圈读数：五条词各自实跑，数三个数（exit 0 条数／命中餐别名条数／产物互异份数）。 */
function probeFive() {
  const seen = new Set();
  let okExit = 0;
  let okLabel = 0;
  for (const f of FIVE) {
    const w = routeFor(f.word);
    const r = run(w.key, w.params);
    const art = artifact(r.env);
    if (r.code === 0) okExit += 1;
    if (art !== null && art.html.includes(f.label) && h1Of(art.html).includes('餐别分布')) okLabel += 1;
    if (art !== null) seen.add(art.sha256);
  }
  return { okExit, okLabel, uniq: seen.size };
}

function phaseMutate() {
  emit('\n== 变异自证 · 把 src/home/today.ts 的餐别分流改坏一处 ==');
  const bak = path.join(SCRATCH, 'today.ts.bak');
  const MUTANT = 'const mealRaw = undefined as string | undefined;';
  const MARK = 'const mealRaw = undefined;';
  /** 直起 `tsc -b --force`（不经 shell／npx，且强制重编：`copyFileSync` 在 Windows 上会把源文件的
   *  时间戳一并复制到目标，还原后的 `today.ts` 时间反而更旧 ⇒ 增量判断会**跳过重编**，dist 留在变异体上。
   *  于是「还原后仍旧红」是假红；编译后**回读 dist** 真判它换了。 */
  const rebuild = () => {
    const r = spawnSync(process.execPath, [TSC, '-b', 'packages/skill-calorie', '--force'], { cwd: ROOT, encoding: 'utf8' });
    const js = fs.existsSync(DIST_TODAY) ? fs.readFileSync(DIST_TODAY, 'utf8') : '';
    return { status: r.status, err: tail((r.stderr ?? '').trim().split('\n')[0] ?? '', 120), distMutant: js.includes(MARK) };
  };
  fs.copyFileSync(TODAY_FILE, bak);
  const src = fs.readFileSync(TODAY_FILE, 'utf8');
  const anchor = "const mealRaw = optStr(params, 'meal');";
  if (!src.includes(anchor)) throw new Error('变异锚点没找到（分流那一行改过？）：' + anchor);
  let mutant;
  let mBuild;
  let rBuild;
  try {
    fs.writeFileSync(TODAY_FILE, src.replace(anchor, MUTANT));
    mBuild = rebuild();
    check(mBuild.status === 0 && mBuild.distMutant, '变异体编译通过且 dist 真换成变异体',
      'tsc=' + mBuild.status + ' dist含变异标记=' + mBuild.distMutant + ' ' + mBuild.err);
    mutant = probeFive();
  } finally {
    fs.copyFileSync(bak, TODAY_FILE);
    const clean = fs.readFileSync(TODAY_FILE, 'utf8') === src;
    check(clean, '还原后 today.ts 与改动前逐字节相同', clean ? '' : '还原不干净！');
    rBuild = rebuild();
    check(rBuild.status === 0 && !rBuild.distMutant, '还原体编译通过且 dist 真换回原版',
      'tsc=' + rBuild.status + ' dist含变异标记=' + rBuild.distMutant + ' ' + rBuild.err);
  }
  const restored = probeFive();
  emit('MUTANT_EXIT=' + (mutant.okExit === FIVE.length && mutant.uniq === FIVE.length ? 0 : 1) +
    '  exit0=' + mutant.okExit + '/' + FIVE.length + '  命中餐别名=' + mutant.okLabel + '/' + FIVE.length + '  互异=' + mutant.uniq + '/' + FIVE.length);
  emit('RESTORED_EXIT=' + (restored.okExit === FIVE.length && restored.uniq === FIVE.length && restored.okLabel === FIVE.length ? 0 : 1) +
    '  exit0=' + restored.okExit + '/' + FIVE.length + '  命中餐别名=' + restored.okLabel + '/' + FIVE.length + '  互异=' + restored.uniq + '/' + FIVE.length);
  check(mutant.uniq < FIVE.length && mutant.okLabel === 0, '变异必红（分流改坏后五份产物不再互异、页头不再是餐别分布页）',
    '互异 ' + mutant.uniq + '/' + FIVE.length + ' 命中 ' + mutant.okLabel + '/' + FIVE.length);
  check(restored.uniq === FIVE.length && restored.okLabel === FIVE.length, '还原必绿（五份产物重新互异且各自命中餐别名）',
    '互异 ' + restored.uniq + '/' + FIVE.length + ' 命中 ' + restored.okLabel + '/' + FIVE.length);
}

/* ── 主流程 ────────────────────────────────────────────────── */
emit('#276 餐别 5 条 · 判据实跑（' + new Date().toISOString() + '，今天钉在 ' + TODAY + '）');
emit('库=' + DB_DIR + '  日志=' + LOG);

if (ARGV.includes('--mutate-check')) {
  phaseMutate();
} else if (ARGV.includes('--baseline')) {
  if (!ARGV.includes('--no-seed')) seed();
  const out = {};
  for (const name of NO_MEAL) {
    const w = routeFor(name);
    const r = run(w.key, w.params);
    const art = artifact(r.env);
    check(art !== null && r.code === 0, '基线取到：' + name, 'exit=' + r.code + ' sha256=' + (art === null ? '-' : art.sha256));
    note(name + '  cli=' + w.cli);
    if (art !== null) out[name] = art.sha256;
  }
  fs.writeFileSync(BASELINE, JSON.stringify({ today: TODAY, sha256: out }, null, 2));
  note('基线写入 ' + BASELINE);
} else {
  if (!ARGV.includes('--no-seed')) seed();
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).sha256 : undefined;
  if (baseline === undefined) check(false, '基线文件存在（判据 5 的对照面）', '缺 ' + BASELINE + '，先跑 --baseline');
  phaseFive();
  phaseNoMeal(baseline);
}

const red = results.filter((r) => !r.ok);
emit('\n判据合计 ' + results.length + ' 条：绿 ' + (results.length - red.length) + '，红 ' + red.length);
for (const r of red) emit('  RED  ' + r.label + (r.detail === undefined ? '' : '  |  ' + r.detail));
emit(red.length === 0 ? 'T276F: GREEN' : 'T276F: RED');
process.exit(red.length === 0 ? 0 : 1);
