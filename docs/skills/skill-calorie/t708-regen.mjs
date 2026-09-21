/**
 * #708 清账的一次性重出器 —— 判据的产物来源。
 *
 * 判据（本票主判据）：**改动前后逐页逐字节相同**（删除的都是生产零调用方的代码，产物必须一个字都不动）。
 * 写法照两份先例：`docs/skills/skill-calorie/t518-W1-搬家-证据.md` 的 31 页重出器（逐页 sha256＋bytes 双比、
 * 别名逐字节同、失败即不落盘）与 `docs/skills/skill-calorie/t704-搬家-证据.md` 的**时钟冻结件**
 * （只读页的复制日志第 5 段走 `render/receipt.ts:155` 的 `nowStamp()`，不冻时钟这条判据既不成立也判不准）。
 *
 * 覆盖口径＝**按删除面能影响到的页**定，不按页数好看定：本票删的四处在生产里零调用方，
 * 所以覆盖取「跨能力各取一条 ＋ 被删的老模板（饮食／运动／目标）那三条 ＋ 场景 10 全族 31 页」——
 * 每条都是控制面，任一条变红就说明删除动了产物。
 *
 * 只写 `.scratch/t708/`（本票独占草稿目录）：`产物/` 与 `基线-页.json`。零源码改动、零 git 动作、真库零触碰。
 * 用法（须持锁）：
 *   node .scratch/t708/regen.mjs                                   # 出产物＋落基线
 *   node .scratch/t708/regen.mjs --tag W1 --compare .scratch/t708/基线-页.json
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, copyFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
/** 产物来源树：默认真实 dist；铸基线时指冻结副本（`--dist .scratch/t708/dist-W0`），
 * 好让「改前那一份」在别席并发改写 dist 的情况下仍然可复现。 */
const DIST = join(ROOT, argOf('--dist', 'packages/skill-calorie/dist'));
const require = createRequire(import.meta.url);
const { openDb } = require(join(DIST, 'index.js'));
const BIN = join(DIST, 'cli', 'cmd_read.js');
const FREEZE = pathToFileURL(join(HERE, 'freeze.mjs')).href;
const DB_DIR = join(HERE, 'db');
const CFG_DIR = join(HERE, 'cfg');
const HTML_DIR = join(HERE, 'html');
const PHOTOS_DIR = join(HERE, 'photos');
const OUT_DIR = join(ROOT, argOf('--out', '.scratch/t708/产物'));
const BASE_JSON = join(ROOT, argOf('--baseline', '.scratch/t708/基线-页.json'));
const CMP_JSON = argOf('--compare', '');
const TAG = argOf('--tag', 'W0');
const TMP = join(HERE, 'tmp-out');

/* ── 0. 隔绝基座（#676 起库落点已改成**配置文件**，`SKILLS_DB_PATH` 不是出口） ──────────
 * 教训（本票具名记账）：第一版重出器只传了 `SKILLS_DB_PATH`，于是 CLI 按默认落点去开
 * `~/.ilife/data/calorie_data.db`——那是真实家目录。已清场并核过：那份库 11 张表全 0 行
 * （本次运行建的空 schema 库），另两页「操作失败」单据已删。此处的守卫就是防它再来一次。 */
if (!CFG_DIR.replace(/\\/g, '/').includes('/.scratch/')) throw new Error('配置目录不在 .scratch 下：' + CFG_DIR);
mkdirSync(CFG_DIR, { recursive: true });
mkdirSync(HTML_DIR, { recursive: true });
mkdirSync(PHOTOS_DIR, { recursive: true });
mkdirSync(join(CFG_DIR, '.ilife'), { recursive: true }); // #754：写配置前目录得在
writeFileSync(join(CFG_DIR, '.ilife', 'calorie.yaml'), [
  'db:',
  '  dir: ' + JSON.stringify(DB_DIR),
  'html:',
  '  dir: ' + JSON.stringify(HTML_DIR),
  'photos:',
  '  dir: ' + JSON.stringify(PHOTOS_DIR),
  'xunji:',
  '  stateDir: ' + JSON.stringify(join(HERE, 'xunji-state')),
  '',
].join('\n'), 'utf8');
const CHILD_ENV = { ...process.env, USERPROFILE: CFG_DIR, HOME: CFG_DIR, SKILLS_DB_PATH: DB_DIR };

/* ── 1. 种子库（自有目录，真库零触碰；口径照 .scratch/t518/gen31.mjs） ─────────────── */
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = new Date();
const day = (ago) => { const d = new Date(today); d.setDate(d.getDate() - ago); return fmt(d); };
rmSync(DB_DIR, { recursive: true, force: true });
mkdirSync(DB_DIR, { recursive: true });
const db = openDb(join(DB_DIR, 'calorie_data.db'));
db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, ?)').run(day(-40));
for (let ago = 59; ago >= 0; ago--) {
  const dt = day(ago);
  const w = Math.round((78.0 - (59 - ago) * 0.05) * 10) / 10;
  db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, ?)')
    .run(dt, '07:00:00', w, Math.round((w / 3.0625) * 10) / 10);
  const dinner = 550 + Math.round(60 * Math.sin(ago * 1.3));
  for (const [time, name, grams, kcal, p, c, f] of [
    ['08:00:00', '燕麦牛奶', 100, 389, 13, 66, 7],
    ['12:00:00', '鸡胸饭', 300, 650, 40, 80, 8],
    ['19:00:00', '蔬菜汤面', 350, dinner, 15, 90, 6],
  ]) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(dt, time, name, grams, kcal, p, c, f);
  }
  if (ago % 2 === 0) db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES (?, '07:30:00', '慢跑', 30, 300, '有氧')").run(dt);
}
for (let ago = 59; ago >= 0; ago--) {
  for (const [time, ml] of [['10:00:00', 1200 + (ago % 3) * 200], ['16:00:00', 600]]) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, 0, 0, 0, 0)')
      .run(day(ago), time, '💧水', ml);
  }
}
// 身体面（体成分／围度）：跨能力控制页要用，每 7 天一条。
for (let ago = 56; ago >= 0; ago -= 7) {
  db.prepare("INSERT INTO body_composition (date, source, body_fat_pct, note) VALUES (?, 'gym', ?, '')")
    .run(day(ago), Math.round((19.5 + ago * 0.01) * 10) / 10);
  db.prepare('INSERT INTO body_measurements (date, waist_cm, hip_cm, chest_cm, left_thigh_cm, right_thigh_cm, left_arm_cm, right_arm_cm, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(day(ago), 80 + ago * 0.02, 95, 100, 55, 55, 33, 33, '');
}
// 训练计划面（工作页面要用）：一份 2 周计划 ＋ 三个 session。
db.prepare("INSERT INTO workout_plan_config (id, title, version, total_weeks, start_date) VALUES (1, '减脂4周', 'v1', 2, ?)").run(day(7));
const mv = (name, part, type, sets) => JSON.stringify([{ name, part, type, sets }]);
const addSession = (week, dow, label, movements) => db.prepare(
  'INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, time_start, time_end, movements) VALUES (?, ?, 1, ?, ?, ?, ?)',
).run(week, dow, label, '19:00', '20:00', movements);
addSession(1, 1, '上肢', mv('俯卧撑', '胸', '力量', [{ reps: 12, weight: 0, rest_seconds: 60 }]));
addSession(1, 3, '有氧', mv('慢跑', '全身', '有氧', [{ reps: 30, unit: '分钟', weight: 0 }]));
addSession(2, 2, '下肢', mv('深蹲', '腿', '力量', [{ reps: 10, weight: 40, rest_seconds: 90 }]));
// 食品库面（食品来源统计／排行页要用）。
for (const [name, brand, kcal, p, c, f, src, cat] of [
  ['燕麦片', '甲牌', 389, 13, 66, 7, '拍营养表', '主食'],
  ['鸡胸肉', '乙牌', 165, 31, 0, 3.6, '拍营养表', '肉蛋'],
  ['希腊酸奶', '丙牌', 97, 9, 3.6, 5, '手工录入', '奶制品'],
]) {
  db.prepare('INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, source, category) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)')
    .run(name, brand, kcal, p, f, c, src, cat);
}
// 播种的时间列**写死**：`user_profile.created_at`／`daily_goal.created_at` 这类值会直接上屏
// （看档案页的「档案创建」、看目标状态页的「创建时间」），SQLite 的 `CURRENT_TIMESTAMP` 让同一份种子库
// 在两次运行里差出分钟数 ⇒「逐页逐字节相同」这条判据会出假红。**判据工具自身必须确定性**。
const FIXED_TS = '2026-09-01 08:00:00';
for (const t of ['user_profile', 'daily_goal', 'weight_log', 'food_log', 'exercise_log', 'body_composition', 'body_measurements', 'nutrition_products', 'workout_plans', 'workout_plan_config']) {
  const cols = db.prepare('PRAGMA table_info(' + t + ')').all().map((r) => r.name);
  for (const c of ['created_at', 'updated_at', 'calculated_at']) {
    if (cols.includes(c)) db.prepare('UPDATE ' + t + ' SET ' + c + ' = ?').run(FIXED_TS);
  }
}
db.close();
console.log('SEED: 60 天（体重/三餐/隔日运动/水分）＋身体面 ＋ 档案 ＋ 目标 → ' + DB_DIR);

/* ── 2. 用例：跨能力各一条（含被删的三个老模板所属的饮食／运动／目标）＋ 场景 10 全族 ── */
const cases = [
  // 被删的三个老模板函数的同名页（饮食总览／运动总览／目标分析）与它们的同族页
  ['看饮食总览', 'calorie.view.diet', {}, ''],
  ['看运动总览', 'calorie.view.exercise', {}, ''],
  ['看目标分析', 'calorie.view.goal', {}, ''],
  ['看今日主页', 'calorie.view.home', {}, ''],
  ['看今日饮食', 'calorie.today', {}, ''],
  ['看饮食复盘', 'calorie.view.diet-review', {}, ''],
  ['看食品排行', 'calorie.view.ranking', {}, ''],
  ['看营养配比', 'calorie.view.nutrition-ratio', {}, ''],
  ['看营养素深度', 'calorie.view.nutrition-detail', {}, ''],
  ['看食品来源统计', 'calorie.view.source-stats', {}, ''],
  ['看今日饮水', 'calorie.view.today-water', {}, ''],
  ['看体重', 'calorie.view.weight', {}, ''],
  ['看体重明细', 'calorie.view.weight-history', {}, ''],
  ['看体重复盘', 'calorie.view.weight-review', { window: '本月' }, ''],
  ['看体重波动', 'calorie.view.volatility', {}, ''],
  ['看体成分', 'calorie.view.body-composition', {}, ''],
  ['看围度', 'calorie.view.body-measure', {}, ''],
  ['看训练计划', 'calorie.view.plan', {}, ''],
  ['看计划复盘', 'calorie.view.exercise-review', {}, ''],
  ['看运动记录', 'calorie.view.exercise-records', {}, ''],
  ['看运动分布', 'calorie.view.exercise-distribution', {}, ''],
  ['看运动趋势', 'calorie.view.exercise-trend', {}, ''],
  ['看档案', 'calorie.view.profile', {}, ''],
  ['看健康盘', 'calorie.view.health', {}, ''],
  ['看热量趋势', 'calorie.view.calorie-trend', {}, ''],
  ['看每日六因素', 'calorie.view.six-factors', {}, ''],
  ['看组合分析', 'calorie.view.combined', { pair: 'weight_calorie', window: '7d' }, ''],
  ['看多指标趋势', 'calorie.view.multi-trend', { window: '90d', compare: 'target' }, ''],
  ['看异常诊断', 'calorie.view.anomaly', { kind: 'weight_volatility', window: '90d' }, ''],
  ['看禁忌扫描', 'calorie.view.contraindication', {}, ''],
  ['看目标进度', 'calorie.view.goal-progress', {}, ''],
  ['看目标配置', 'calorie.view.goal-config', {}, ''],
  ['看目标状态', 'calorie.view.goal-status', {}, ''],
  ['看体重目标', 'calorie.view.goal-weight', {}, ''],
  ['看目标预测', 'calorie.view.goal-predict', {}, ''],
  ['看即将到期目标', 'calorie.view.goal-expiring', {}, ''],
  ['看目标对比实际', 'calorie.view.goal-vs-actual', {}, ''],
  ['看目标推荐', 'calorie.view.goal-recommend', {}, ''],
  ['看目标预检', 'calorie.view.goal-wizard', {}, ''],
  ['看身材照HELP', 'calorie.help.center', {}, ''],
  // 场景 10 全族（照 .scratch/t518/gen31.mjs 的用例表逐字搬，order 一并带上）
  ['预测体重(1 周后)', 'calorie.view.predict', { horizonDays: 7, window: '14d' }, '393'],
  ['预测体重(1 月后)', 'calorie.view.predict', { horizonDays: 30, window: '14d' }, '394'],
  ['预测体重(3 月后)', 'calorie.view.predict', { horizonDays: 90, window: '14d' }, '395'],
  ['预测体重(6 月后)', 'calorie.view.predict', { horizonDays: 180, window: '14d' }, '396'],
  ['预测体重(自定义时间)', 'calorie.view.predict', { horizonDays: 60, window: '14d' }, '397'],
  ['预测体重(自定义目标)', 'calorie.view.predict', { target: 65, window: '14d' }, '398'],
  ['模拟减重(每天-300卡)', 'calorie.view.predict', { cut_kcal: 300, window: '14d' }, '399'],
  ['模拟减重(每天-500卡)', 'calorie.view.predict', { cut_kcal: 500, window: '14d' }, '400'],
  ['模拟减重(每天-700卡)', 'calorie.view.predict', { cut_kcal: 700, window: '14d' }, '401'],
  ['模拟减重(30天减Xkg)', 'calorie.view.predict', { target_loss: 2, days_target: 30, window: '14d' }, '402'],
  ['模拟减重(60天减Xkg)', 'calorie.view.predict', { target_loss: 4, days_target: 60, window: '14d' }, '403'],
  ['模拟减重(90天减Xkg)', 'calorie.view.predict', { target_loss: 6, days_target: 90, window: '14d' }, '404'],
  ['模拟减重(自定义天数减Xkg)', 'calorie.view.predict', { target_loss: 3, days_target: 45, window: '14d' }, '405'],
  ['摄入预测(按当前速率 1 周)', 'calorie.view.predict', { kind: 'calorie_forecast', horizonDays: 7, window: '14d' }, '406'],
  ['摄入预测(按当前速率 1 月)', 'calorie.view.predict', { kind: 'calorie_forecast', horizonDays: 30, window: '14d' }, '407'],
  ['摄入预测(按当前速率 3 月)', 'calorie.view.predict', { kind: 'calorie_forecast', horizonDays: 90, window: '14d' }, '408'],
  ['摄入预测(自定义)', 'calorie.view.predict', { kind: 'calorie_forecast', horizonDays: 60, window: '14d' }, '409'],
  ['摄入预测(营养目标达成预测)', 'calorie.view.predict', { kind: 'calorie_goal', window: '30d' }, '410'],
  ['摄入预测(卡路里缺口预测)', 'calorie.view.predict', { kind: 'calorie_deficit', window: '30d' }, '411'],
  ['摄入预测(摄入稳定性预测)', 'calorie.view.predict', { kind: 'calorie_stability', window: '30d' }, '412'],
  ['查热量缺口', 'calorie.view.deficit', { window: '7d' }, '426'],
  ['看热量缺口', 'calorie.view.deficit', { window: '7d' }, '7'],
  ['看体重预测', 'calorie.view.predict', { horizonDays: 7, window: '14d' }, '29'],
  ['看BMI报告', 'calorie.report.bmi', { window: '90d' }, '331'],
  ['看TDEE报告', 'calorie.report.tdee', { window: '30d' }, '332'],
  ['看BMR报告', 'calorie.report.bmr', { window: '30d' }, '333'],
  ['看蛋白质摄入报告', 'calorie.report.protein', { window: '30d' }, '334'],
  ['看水分摄入报告', 'calorie.report.water', { window: '30d' }, '335'],
  ['看综合评分', 'calorie.report.score', { window: '30d' }, '336'],
  ['看健康趋势', 'calorie.report.trend', { window: '90d' }, '337'],
  ['看健康报告(含对比)', 'calorie.report.compare', { window: '7d' }, '338'],
].map(([wake, key, params, order]) => ({ wake, key, params, order }));

/* ── 3. 逐个真跑（时钟冻结；先落临时目录，断言全过才认定） ─────────────────────── */
const num = (i) => String(i + 1).padStart(2, '0');
const fileWord = (w) => w.replace(/\s+/g, '').replace(/[\\/:*?"<>|]/g, '_');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const runAt = new Date().toISOString();
const rows = [];
let failed = 0;
cases.forEach((c, i) => {
  const stem = `${num(i)}-${fileWord(c.wake)}`;
  const tmpPath = join(TMP, `${stem}.html`);
  const r = spawnSync(process.execPath, ['--import', FREEZE, BIN, c.key, '--params', JSON.stringify(c.params), '--html', tmpPath], {
    encoding: 'utf8', env: CHILD_ENV, timeout: 60000,
  });
  const tail = (s, n) => String(s || '').trimEnd().split(/\r?\n/).slice(-n).join('\n');
  const rec = { n: num(i), wake: c.wake, order: c.order, key: c.key, params: c.params, exit: r.status, file: `${stem}.html` };
  if (r.status !== 0) {
    console.log(`FAIL ${stem} exit=${r.status}\n  stdout=${tail(r.stdout, 3)}\n  stderr=${tail(r.stderr, 3)}`);
    failed += 1;
  } else {
    const html = readFileSync(tmpPath, 'utf8');
    const trimmed = html.replace(/^\uFEFF/, '');
    rec.bytes = Buffer.byteLength(html, 'utf8');
    rec.sha256 = createHash('sha256').update(html, 'utf8').digest('hex');
    rec.sha256_12 = rec.sha256.slice(0, 12);
    rec.probe = {
      doctype: /^\s*<!doctype html>/i.test(trimmed.slice(0, 300)),
      charset: /<meta[^>]+charset=["']?utf-8["']?/i.test(trimmed),
      endsHtml: /<\/html>\s*$/i.test(trimmed.trimEnd()),
      residue: ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->', '<!--CHARTS-HELPERS-->'].filter((m) => trimmed.includes(m)),
    };
    if (!rec.probe.doctype || !rec.probe.charset || !rec.probe.endsHtml || rec.probe.residue.length > 0) {
      console.log('FAIL ' + stem + ' 完整文档判据不过 :: ' + JSON.stringify(rec.probe));
      failed += 1;
    }
    rec.tmpPath = tmpPath;
  }
  rows.push(rec);
});

/* ── 4. 落盘 ─────────────────────────────────────────────────────────────────── */
if (!CMP_JSON) {
  if (failed > 0) { console.log(`RESULT: ${failed} 条红 —— 失败即不落盘，未写产物／基线`); process.exit(1); }
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  for (const r of rows) copyFileSync(r.tmpPath, join(OUT_DIR, r.file));
  rmSync(TMP, { recursive: true, force: true });
  const reading = {
    ticket: '708', tag: TAG, at: runAt, outDir: OUT_DIR, dbDir: DB_DIR,
    seed: '60 天（体重 78.0→75.1/三餐/隔日运动/水分）＋身体面（体成分/围度 每 7 天）＋档案(30/男/175/moderate)＋目标(1800/68.0)',
    bin: BIN, frozenClock: '2026-09-18 12:00:00',
    files: rows.map(({ tmpPath, ...rest }) => rest),
  };
  writeFileSync(BASE_JSON, JSON.stringify(reading, null, 1) + '\n', 'utf8');
  const total = rows.reduce((a, r) => a + r.bytes, 0);
  console.log(`RESULT: ${rows.length}/${rows.length} 页落盘 bytes_total=${total} → ${OUT_DIR}；基线 → ${BASE_JSON}`);
  process.exit(0);
}

/* ── 5. 比对模式：与基线逐页 sha256＋bytes 双比 ──────────────────────────────── */
const base = JSON.parse(readFileSync(join(ROOT, CMP_JSON), 'utf8'));
const baseByN = new Map(base.files.map((f) => [f.n, f]));
const diffs = [];
for (const r of rows) {
  const b = baseByN.get(r.n);
  if (!b) { diffs.push(`${r.n}(新增)`); continue; }
  if (b.key !== r.key || JSON.stringify(b.params) !== JSON.stringify(r.params)) diffs.push(`${r.n}(用例变了)`);
  else if (b.sha256 !== r.sha256) diffs.push(`${r.n}(${b.sha256_12}->${r.sha256_12}, ${b.bytes}B->${r.bytes}B)`);
}
const same = rows.length - diffs.length;
const bytesTotal = rows.reduce((a, r) => a + (r.bytes || 0), 0);
const baseTotal = base.files.reduce((a, f) => a + (f.bytes || 0), 0);
console.log(`${TAG} byte-identical pages=${same}/${rows.length} DIFF=${diffs.length ? diffs.join(',') : 'none'}`);
console.log(`  total_before=${baseTotal} total_after=${bytesTotal}  failed=${failed}`);
if (diffs.length || failed) process.exit(1);
