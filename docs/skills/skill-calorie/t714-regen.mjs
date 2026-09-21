/**
 * #714 搬家（第三批：计划复盘簇两件）的一次性重出器 —— 判据的产物来源。
 *
 * 判据：**搬迁前后逐页逐字节相同**（票面「判据」段逐字）。做法照 `docs/skills/skill-calorie/t704-搬家-证据.md` §一
 * 与 `t518-W1-搬家-证据.md` 的先例：逐页 sha256 ＋ bytes 双比、逐条比、不抽样。
 *
 * 覆盖口径按「搬迁面能影响到的页」定：被搬的两件（`reviewDocs`／`reviewDocsCss`）只喂一条产出
 * `calorie.view.exercise-review`（`src/workout/commands.ts:50`），故把**这一页的每个分支**各出一遍：
 *   - 票面点名的全部唤醒词：order 201–206（`src/workout/routes.ts:39-44`）＋ `list:'new'` 那条
 *     `看训练计划复盘`（`routes.ts:48`）。七条里 `204／205／206` 的 params 逐字相同（都 `{"window":"7d"}`），
 *     全出——它们是票面点名的唤醒词，也是现成的稳定性对照。
 *   - 票面点名的「窗口为空那一态」：本页的空窗**不是一张页**——`buildReviewView` 在窗内没有安排训练时
 *     抛 `missing-data`，交付层走阻断路（exit 4、stdout 空）。故这一态按**阻断路**记读数（exit ＋ 归一化
 *     stderr），不参与逐字节比。
 *   - 另补 `reviewDocs.ts` 里**只有别的种子才走得到**的分支：`planTitle === ''` 的副题空态、
 *     `plannedMovements === 0` 的「这份计划没有登记动作」与随之而来的 `pct === null`（不出进度条、值位
 *     写 `—`），以及进度条三档里最低那档（`completionPct < 50`）。这些走第二只种子库。
 *
 * 时钟冻结：**用仓内自己那件** `packages/skill-calorie/test/freeze-clock.cjs`（`node --require` 预载 ＋
 * `FAKE_NOW_ISO`，`--require` 经 `NODE_OPTIONS` 传）。它就是 `.scratch/t704/freeze.mjs` 那套手法的**正本**
 * （#326 起在仓、被 199 件测试的隔离基座 `test/helpers/config-test.mjs` 引用）：同样只换 `Date` 一个内建、
 * 同样盖住无参构造与 `now()`，故 `render/receipt.ts:155` 的 `nowStamp()` 一并冻住。
 * 不另在 `.scratch/` 抄第二份（同一件事只留一处定义）。**不动源码、不改判据口径。**
 *
 * 只写 `.scratch/714/`（本票独占草稿目录）。零源码改动、零 git 动作、真库零触碰。
 * 用法：node .scratch/714/regen.mjs [--out <目录>] [--compare <基线.json>] [--tag <标签>]
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 仓库根：往上找到 `pnpm-workspace.yaml` 为止 —— 本件与当窗副本住不同层级（当窗住 `.scratch/714/`，
 *  入仓副本住 `docs/skills/skill-calorie/`），写死层数就有一边跑不起来。#714 归档时补的。 */
function repoRoot(start) {
  let d = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(d, 'pnpm-workspace.yaml'))) return d;
    d = dirname(d);
  }
  throw new Error('找不到仓库根（往上没有 pnpm-workspace.yaml）：' + start);
}
const ROOT = repoRoot(HERE);
const require = createRequire(import.meta.url);
const { openDb } = require(join(ROOT, 'packages/skill-calorie/dist/index.js'));
const BIN = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');
/** 仓内正本冻结件（走 `NODE_OPTIONS=--require`）。路径含空白则 NODE_OPTIONS 传不了，当场报错。 */
const FREEZE_CJS = resolve(ROOT, 'packages/skill-calorie/test/freeze-clock.cjs');
const TODAY = '2026-09-07'; // 与种子数据同锚点（`test/exercise-port-111.test.mjs:30` 的历史锚点）
const FAKE_NOW_ISO = TODAY + 'T12:00:00';
const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const OUT_DIR = join(ROOT, argOf('--out', '.scratch/714/产物'));
const BASE_JSON = join(ROOT, argOf('--baseline', '.scratch/714/基线.json'));
const TMP = join(ROOT, '.scratch/t714/tmp-out');
/** 本票的工作目录**锚在仓库根下**，不锚在 `HERE`：入仓副本住 `docs/skills/skill-calorie/`，
 *  锚 `HERE` 的话它一跑就往 `docs/` 里落 `db1`／`cfg1`／`tmp-out`（本窗归档时发现并改掉）。
 *  两种住法解析出来的目录本来就是同一个（当窗副本的 `HERE` 就是 `.scratch/714`），故这处改动不改任何读数。 */
const WORK = join(ROOT, '.scratch/t714');

if (/\s/.test(FREEZE_CJS)) {
  console.log('FAIL 冻结件路径含空白（' + FREEZE_CJS + '）：NODE_OPTIONS 传不了，钉不上钟');
  process.exit(1);
}

/* ── 1. 配置文件：库目录与训记状态目录都指进本票草稿目录，真库与真实家目录零接触。
   （与测试隔离基座 `test/helpers/config-test.mjs:50` 同一份口径：`db.dir` ＋ `xunji.stateDir`。） ── */
function writeConfig(dir, dbDir) {
  mkdirSync(join(dir, '.ilife'), { recursive: true });
  const q = (s) => JSON.stringify(String(s));
  writeFileSync(join(dir, '.ilife', 'calorie.yaml'), 'db:\n  dir: ' + q(dbDir) + '\nxunji:\n  stateDir: ' + q(join(dir, 'xunji-state')) + '\n', 'utf8');
  return dir;
}

/* ── 2. 两只种子库。种子面照 `test/exercise-port-111.test.mjs:44` 的 `seedPort`，按本页的分支铺开。 ── */
const EX1 = [
  // date, time, type, min, cal, cat, distKm, hr, loadKg, reps, setIndex
  ['2026-08-31', '07:00:00', '户外跑', 30, 300, '有氧', null, null, null, null, null],
  ['2026-09-02', '19:00:00', '卧推', 40, 180, '力量', null, null, 60, 10, 1],
  ['2026-09-07', '07:05:00', '跑步', 35, 320, '有氧', 6.0, 145, null, null, null],
];
/** 计划锚：周一 2026-08-31 起算（`sessionDate` 走 `mondayOf`），四周。
 *  wk1d1 08-31 上肢[户外跑] 命中且动作对上；wk1d3 09-02 下肢[卧推] 命中且对上；
 *  wk2d1 09-07 上肢[硬拉] 有记录（跑步）但动作对不上 → movementPct < 100；
 *  wk2d3 09-09 下肢[深蹲] 无记录 → `unhit` 非空（未完成折叠那一支）；
 *  wk2d2 09-08 休息日 → 走 `is_rest_day` 跳过那一支。 */
const SESSIONS1 = [
  [1, 1, 1, '上肢', 0, [{ name: '户外跑', part: '腿', type: '有氧', sets: [{}, {}] }]],
  [1, 3, 1, '下肢', 0, [{ name: '卧推', part: '胸', type: '力量', sets: [{}, {}, {}] }]],
  [2, 1, 1, '上肢', 0, [{ name: '硬拉', part: '背', type: '力量', sets: [{}] }]],
  [2, 2, 1, '休息', 1, []],
  [2, 3, 1, '下肢', 0, [{ name: '深蹲', part: '腿', type: '力量', sets: [{}, {}] }]],
];

function seedFull(db) {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, \'2026-10-01\', 300)').run();
  db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, \'male\', 175, \'moderate\')').run();
  for (const [d, t, type, min, cal, cat, dist, hr, load, reps, si] of EX1) {
    db.prepare('INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category, distance_km, avg_heart_rate, load_kg, reps, set_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, type, min, cal, cat, dist, hr, load, reps, si);
  }
  db.prepare('INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, \'port计划\', \'v1\', \'desc\', 4, \'2026-08-31\')').run();
  for (const [w, d, si, label, rest, moves] of SESSIONS1) {
    db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, is_rest_day, movements) VALUES (?, ?, ?, ?, ?, ?)').run(w, d, si, label, rest, JSON.stringify(moves));
  }
}

/** 第二只库：计划无题（`planTitle === ''` → 副题走 null）＋ 计划未登记动作（`plannedMovements === 0`
 *  → 「这份计划没有登记动作」＋ `movementPct === null` → 值位 `—`、不出进度条）。
 *  场次排在 09-07 与 09-09；记录刻意排在 09-02 与 **09-09**（都不是 09-07）——
 *  于是 `7d` 窗里 09-07 那场没有人记录 ⇒ `completionPct === 0`（进度条最低那一档 `ilr-bar-bad`）
 *  且 `unhit` 非空（未完成折叠那一支）；同时两个窗里都各有记录，穿得过
 *  `rows.length === 0` 那道阻断（否则连页都出不来，上面几支一支都测不到）。 */
const EX2 = [
  ['2026-09-02', '07:00:00', '跑步', 30, 250, '有氧', null, null, null, null, null],
  ['2026-09-09', '07:00:00', '散步', 20, 60, '有氧', null, null, null, null, null],
];
/** wk2d1 09-07 没有记录（未完成）；wk2d3 09-09 有记录（命中）。两场都没登记动作。 */
const SESSIONS2 = [
  [2, 1, 1, '上肢', 0, []],
  [2, 3, 1, '下肢', 0, []],
];

function seedSparse(db) {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, \'2026-10-01\', 300)').run();
  db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, \'male\', 175, \'moderate\')').run();
  for (const [d, t, type, min, cal, cat, dist, hr, load, reps, si] of EX2) {
    db.prepare('INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category, distance_km, avg_heart_rate, load_kg, reps, set_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, type, min, cal, cat, dist, hr, load, reps, si);
  }
  db.prepare('INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, \'\', \'v1\', \'desc\', 4, \'2026-08-31\')').run();
  for (const [w, d, si, label, rest, moves] of SESSIONS2) {
    db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, is_rest_day, movements) VALUES (?, ?, ?, ?, ?, ?)').run(w, d, si, label, rest, JSON.stringify(moves));
  }
}

const DB_DIR = [null, join(WORK, 'db1'), join(WORK, 'db2')];
const CFG_DIR = [null, join(WORK, 'cfg1'), join(WORK, 'cfg2')];
rmSync(DB_DIR[1], { recursive: true, force: true });
rmSync(DB_DIR[2], { recursive: true, force: true });
rmSync(CFG_DIR[1], { recursive: true, force: true });
rmSync(CFG_DIR[2], { recursive: true, force: true });
for (const [i, seed] of [[1, seedFull], [2, seedSparse]]) {
  mkdirSync(DB_DIR[i], { recursive: true });
  const db = openDb(join(DB_DIR[i], 'calorie_data.db'));
  seed(db);
  db.close();
  writeConfig(CFG_DIR[i], DB_DIR[i]);
}
console.log('SEED: 库 ' + DB_DIR[1] + ' ／ ' + DB_DIR[2] + '（配置文件同目录，真库零触碰）');

/* ── 3. 本案：票面点名的七条唤醒词 ＋ 窗口为空那一态 ＋ 只有第二只库走得到的两支 ───────────
 *
 * 窗口口径**按当刻实测**写下来（不是在票面上猜）——`resolveWindow`（`src/analysis/series.ts:63`）：
 *   · `本周`＝`[本周周一, 今天]`；锚点 2026-09-07 恰是周一 ⇒ 该窗**只有一天**（本窗第一次跑就踩到：
 *     按「周一到周日」推会以为它有七天）。
 *   · `7d`＝`[今天-6, 今天]`＝`2026-09-01 ~ 2026-09-07`；`本月`＝`[本月 1 日, 今天]`＝同一条区间。
 *   · `custom` 走 `start`／`end` 原文。 */
const cases = [
  ['01', 1, 'page', 'order201 计划复盘（本周）', { window: '本周' }],
  ['02', 1, 'page', 'order202 计划复盘（本月）', { window: '本月' }],
  ['03', 1, 'page', 'order203 计划复盘（全部）', { window: 'custom', start: '2026-08-24', end: '2026-09-07' }],
  ['04', 1, 'page', 'order204 看计划完成率', { window: '7d' }],
  ['05', 1, 'page', 'order205 看未完成训练', { window: '7d' }],
  ['06', 1, 'page', 'order206 看动作完成率', { window: '7d' }],
  ['07', 1, 'page', 'list:new 看训练计划复盘（长窗：热力图截断 ＋ 未完成折叠两支同开）', { window: 'custom', start: '2026-06-01', end: '2026-09-13' }],
  ['08', 1, 'blocked', '窗口为空（窗内既无运动记录、也无计划场次）', { window: 'custom', start: '2026-10-01', end: '2026-10-07' }],
  ['09', 2, 'page', '计划无题＋未登记动作＋全场未完成（副题空／值位—／不出条／最低档进度条／未完成折叠）', { window: '7d' }],
  ['10', 2, 'page', '同库 13 天窗（两场一命中，进度条中间那一档）', { window: 'custom', start: '2026-09-01', end: '2026-09-13' }],
];

const KEY = 'calorie.view.exercise-review';
const num = (s) => s;
const fileWord = (w) => w.replace(/\s+/g, '').replace(/[\\/:*?"<>|]/g, '_');

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

/** 归一化：把每次运行都会变的绝对路径抹成占位符（只用于阻断路的读数比对）。 */
function norm(s) {
  return String(s || '')
    .replace(/[A-Za-z]:[\\/][^\s'"]*\.scratch[\\/]714[\\/][^\s'"]*/g, '<P>')
    .split('\\').join('/')
    .trimEnd();
}

function renderAll(label) {
  const dir = join(TMP, label);
  mkdirSync(dir, { recursive: true });
  const rows = [];
  let bytesTotal = 0;
  let failed = 0;
  for (const [n, dbIdx, kind, wake, params] of cases) {
    const stem = `${num(n)}-${fileWord(wake)}`;
    const pagePath = join(dir, `${stem}.html`);
    const r = spawnSync(process.execPath, [BIN, KEY, '--params', JSON.stringify(params), '--html', pagePath], {
      encoding: 'utf8',
      timeout: 60000,
      env: {
        ...process.env,
        USERPROFILE: CFG_DIR[dbIdx], HOME: CFG_DIR[dbIdx],
        NODE_OPTIONS: '--require ' + FREEZE_CJS,
        FAKE_NOW_ISO,
      },
    });
    const tail = (s, k) => String(s || '').trimEnd().split(/\r?\n/).slice(-k).join('\n');
    if (kind === 'page') {
      if (r.status !== 0) {
        console.log(`FAIL ${label} ${stem} exit=${r.status}\n  stdout=${tail(r.stdout, 3)}\n  stderr=${tail(r.stderr, 4)}`);
        failed += 1;
        continue;
      }
      const html = readFileSync(pagePath, 'utf8');
      const trimmed = html.replace(/^\uFEFF/, '');
      const bytes = Buffer.byteLength(html, 'utf8');
      const sha256 = createHash('sha256').update(html, 'utf8').digest('hex');
      const probe = {
        doctype: /^\s*<!doctype html>/i.test(trimmed.slice(0, 300)),
        charset: /<meta[^>]+charset=["']?utf-8["']?/i.test(trimmed),
        closed: /<\/html>\s*$/.test(trimmed),
        noSlotResidue: !/\{\{[^}]*\}\}/.test(trimmed),
      };
      if (!Object.values(probe).every(Boolean)) {
        console.log(`FAIL ${label} ${stem} 文档完整性断言不过：${JSON.stringify(probe)}`);
        failed += 1;
      }
      bytesTotal += bytes;
      rows.push({ n, kind, db: dbIdx, wake, params, exit: r.status, file: `${stem}.html`, bytes, sha256, sha256_12: sha256.slice(0, 12), probe });
    } else {
      // 阻断路：这一态的读数就是 exit ＋ stdout（应空）＋ 归一化 stderr，不产页。
      const rec = { n, kind, db: dbIdx, wake, params, exit: r.status, stdout: norm(r.stdout), stderr: norm(r.stderr) };
      if (r.status === 0) { console.log(`FAIL ${label} ${stem} 期望阻断却 exit 0`); failed += 1; }
      if (rec.stdout !== '') { console.log(`FAIL ${label} ${stem} 阻断路 stdout 非空：${tail(rec.stdout, 2)}`); failed += 1; }
      if (!/缺失|取数/.test(rec.stderr)) { console.log(`FAIL ${label} ${stem} 阻断文案对不上：${tail(rec.stderr, 2)}`); failed += 1; }
      rows.push(rec);
    }
  }
  return { dir, rows, bytesTotal, failed };
}

const passA = renderAll('A');
if (passA.failed) { console.log('RESULT: 有失败条目，不落盘'); process.exit(1); }
const passB = renderAll('B');
if (passB.failed) { console.log('RESULT: 有失败条目，不落盘'); process.exit(1); }

/* A/B 自证：同一份源码连出两遍必须逐字节相同，否则判据本身不稳（时钟未冻住就会在这里现形）。 */
const drift = passA.rows
  .map((r, i) => ({ r, b: passB.rows[i] }))
  .filter(({ r, b }) => JSON.stringify(r.sha256 ?? r.stderr) !== JSON.stringify(b.sha256 ?? b.stderr))
  .map(({ r, b }) => `${r.n}(${(r.sha256_12 ?? '')}->${(b.sha256_12 ?? '')})`);
console.log(`STABLE-A-vs-B ${drift.length === 0 ? `cases=${passA.rows.length}/${passA.rows.length} DIFF=none` : `DIFF=${drift.join(',')}`}`);

const rows = passA.rows;

/* ── 4. 与给定基线逐条比（页走 sha256 ＋ bytes 双比；阻断路走 exit ＋ 归一化 stderr） ─────── */
const CMP = argOf('--compare', '');
if (CMP) {
  const prev = JSON.parse(readFileSync(join(ROOT, CMP), 'utf8'));
  const prevByN = new Map(prev.rows.map((r) => [r.n, r]));
  const diff = [];
  for (const r of rows) {
    const p = prevByN.get(r.n);
    if (!p) { diff.push(`${r.n}(基线缺这条)`); continue; }
    if (r.kind === 'page') {
      if (p.sha256 !== r.sha256 || p.bytes !== r.bytes) diff.push(`${r.n}(${p.sha256_12}->${r.sha256_12}, ${p.bytes}B->${r.bytes}B)`);
    } else if (p.exit !== r.exit || p.stderr !== r.stderr) {
      diff.push(`${r.n}(exit ${p.exit}->${r.exit}${p.stderr === r.stderr ? '' : '，阻断文案变了'})`);
    }
  }
  for (const p of prev.rows) if (!rows.some((r) => r.n === p.n)) diff.push(`${p.n}(本次缺这条)`);
  const pages = rows.filter((r) => r.kind === 'page').length;
  console.log(`${argOf('--tag', 'CMP')} byte-identical pages=${diff.length === 0 ? `${pages}/${pages}` : `${pages - diff.filter((d) => !d.includes('exit')).length}/${pages}`} DIFF=${diff.length === 0 ? 'none' : diff.join(',')}`);
  console.log(`  total_before=${prev.bytesTotal} total_after=${passA.bytesTotal}`);
  if (diff.length !== 0) process.exitCode = 1;
}

rows.forEach((r) => { if (r.kind === 'page') writeFileSync(join(OUT_DIR, r.file), readFileSync(join(passA.dir, r.file))); });
/* 只比对不落基线：否则变异轮的产物会把参照本身覆盖掉（t704 就吃到过这个坑）。 */
if (CMP) {
  console.log(`BASELINE 未改写（本次是比对轮）：${BASE_JSON}`);
} else {
  const baseline = { savedAt: new Date().toISOString(), head: argOf('--head', ''), today: TODAY, cases: rows.length, pages: rows.filter((r) => r.kind === 'page').length, bytesTotal: passA.bytesTotal, rows };
  writeFileSync(BASE_JSON, JSON.stringify(baseline, null, 2));
}
console.log(`RESULT: ${rows.length}/${rows.length} 条落盘 pages=${rows.filter((r) => r.kind === 'page').length} blocked=${rows.filter((r) => r.kind === 'blocked').length} bytes_total=${passA.bytesTotal} → ${OUT_DIR}`);
console.log(`BASELINE: ${BASE_JSON}`);
if (drift.length) process.exitCode = 1;
