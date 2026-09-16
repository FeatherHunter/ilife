#!/usr/bin/env node
/** #532 · 卡路里场景10 的 **31 页重出器**（入仓件；原样来自 `.scratch/t387/run-all.mjs`）。
 *
 * 用途：本图 31 份产物的**唯一可重出入口**。它逐个真跑 31 条命令、把结果收拢到 `<产物目录>`，
 * 并写出 **`results.json`** —— 那份读数就是 `t532-清单.mjs` 派生序号清单的唯一出处
 * （§6.1「同一个名字只在一处算出来」：文件名的算法只在本件里有一份）。
 *
 * 与原件的唯一差别：**产物目录由参数给**（原件把 `.scratch/t387/html/` 先 `rmSync` 再重写，
 * 多席共享工作区里那样做会打掉别席正在看的样张）。本件因此只会写自己那一个目录。
 * 还差一点：原件写在 `.scratch/t387/` 下（日志／种子库／读数同处）；本件把同样四样
 * （`db/` `logs/` `out/` `html/` `results.json`）都落在 `<产物目录>` 里，自带一套、互不干扰。
 *
 * 用法（须持锁）：
 *   node tooling/run-locked.mjs --ticket 532 --lock-dir .scratch/locks-m158v2 --max-wait-ms 2700000 --poll-ms 15000 \
 *     -- node docs/skills/skill-calorie/t532-run-all.mjs .scratch/t532/regen
 * 出：<产物目录>/{db,logs,out,html}/ ＋ <产物目录>/results.json
 * 退出码：31/31 exit 0 → 0；有一件失败 → 1。
 *
 * 唤醒词／key／参数逐字取自 `packages/skill-calorie/src/analysis/routes.ts`
 * （order393–412 预测 20 条、order426 缺口、new7／new29 两条别名、order331–338 报告 8 条），
 * 并在跑之前逐条与 routes.ts 的 `cli` 字段对账（`PARAM-AUDIT`）。
 * 种子库：饮水写在 `food_log` 且 `food_name='💧水'`（仓内没有 water_log 表）。
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');            // docs/skills/skill-calorie/ → 仓根
const require = createRequire(import.meta.url);
const { openDb } = require(join(ROOT, 'packages/skill-calorie/dist/index.js'));
const BIN = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');
const ROUTES = join(ROOT, 'packages/skill-calorie/src/analysis/routes.ts');

const OUTDIR = resolve(process.argv[2] ?? join(ROOT, '.scratch/t532/regen'));
const DB_DIR = join(OUTDIR, 'db');
const DIRS = { logs: join(OUTDIR, 'logs'), out: join(OUTDIR, 'out'), html: join(OUTDIR, 'html') };
rmSync(DIRS.out, { recursive: true, force: true });
rmSync(DIRS.html, { recursive: true, force: true });
for (const d of [DB_DIR, DIRS.logs, DIRS.out, DIRS.html]) mkdirSync(d, { recursive: true });

/* ── 0. 基线：dist 读数（不猜、不擅自 build；dist 过期即报出来） ────────────────── */
const statOf = (p) => { try { const s = statSync(p); return { path: p, exists: true, bytes: s.size, mtime: s.mtime.toISOString() }; } catch { return { path: p, exists: false }; } };
const distProbe = { cmd_read: statOf(BIN), index: statOf(join(ROOT, 'packages/skill-calorie/dist/index.js')) };
console.log('DIST ' + JSON.stringify(distProbe));
if (!distProbe.cmd_read.exists) { console.error('没有编译产物：' + BIN + '（先跑 node node_modules/typescript/bin/tsc -b packages/skill-calorie）'); process.exit(2); }

/* ── 1. 种子库（自有目录，真库零触碰） ─────────────────────────────────────────── */
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
/* 水分：没有 water_log 表 —— 饮水＝food_log 里 food_name='💧水' 且 grams=ml。 */
for (let ago = 59; ago >= 0; ago--) {
  for (const [time, ml] of [['10:00:00', 1200 + (ago % 3) * 200], ['16:00:00', 600]]) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, 0, 0, 0, 0)')
      .run(day(ago), time, '💧水', ml);
  }
}
db.close();
console.log('SEED: 60 天（体重/三餐/隔日运动/水分）＋档案＋目标 → ' + DB_DIR);

/* ── 2. 本图 31 条唤醒词（唤醒词／key／参数／命令串逐字取 routes.ts） ────────────── */
const cases = [
  /* 01–20 预测模拟（order393–412，key calorie.view.predict） */
  ['预测体重(1 周后)', 'calorie.view.predict', { horizonDays: 7, window: '14d' }, '393', 'wake'],
  ['预测体重(1 月后)', 'calorie.view.predict', { horizonDays: 30, window: '14d' }, '394', 'wake'],
  ['预测体重(3 月后)', 'calorie.view.predict', { horizonDays: 90, window: '14d' }, '395', 'wake'],
  ['预测体重(6 月后)', 'calorie.view.predict', { horizonDays: 180, window: '14d' }, '396', 'wake'],
  ['预测体重(自定义时间)', 'calorie.view.predict', { horizonDays: 60, window: '14d' }, '397', 'wake'],
  ['预测体重(自定义目标)', 'calorie.view.predict', { target: 65, window: '14d' }, '398', 'wake'],
  ['模拟减重(每天-300卡)', 'calorie.view.predict', { cut_kcal: 300, window: '14d' }, '399', 'wake'],
  ['模拟减重(每天-500卡)', 'calorie.view.predict', { cut_kcal: 500, window: '14d' }, '400', 'wake'],
  ['模拟减重(每天-700卡)', 'calorie.view.predict', { cut_kcal: 700, window: '14d' }, '401', 'wake'],
  ['模拟减重(30天减Xkg)', 'calorie.view.predict', { target_loss: 2, days_target: 30, window: '14d' }, '402', 'wake'],
  ['模拟减重(60天减Xkg)', 'calorie.view.predict', { target_loss: 4, days_target: 60, window: '14d' }, '403', 'wake'],
  ['模拟减重(90天减Xkg)', 'calorie.view.predict', { target_loss: 6, days_target: 90, window: '14d' }, '404', 'wake'],
  ['模拟减重(自定义天数减Xkg)', 'calorie.view.predict', { target_loss: 3, days_target: 45, window: '14d' }, '405', 'wake'],
  ['摄入预测(按当前速率 1 周)', 'calorie.view.predict', { kind: 'calorie_forecast', horizonDays: 7, window: '14d' }, '406', 'wake'],
  ['摄入预测(按当前速率 1 月)', 'calorie.view.predict', { kind: 'calorie_forecast', horizonDays: 30, window: '14d' }, '407', 'wake'],
  ['摄入预测(按当前速率 3 月)', 'calorie.view.predict', { kind: 'calorie_forecast', horizonDays: 90, window: '14d' }, '408', 'wake'],
  ['摄入预测(自定义)', 'calorie.view.predict', { kind: 'calorie_forecast', horizonDays: 60, window: '14d' }, '409', 'wake'],
  ['摄入预测(营养目标达成预测)', 'calorie.view.predict', { kind: 'calorie_goal', window: '30d' }, '410', 'wake'],
  ['摄入预测(卡路里缺口预测)', 'calorie.view.predict', { kind: 'calorie_deficit', window: '30d' }, '411', 'wake'],
  ['摄入预测(摄入稳定性预测)', 'calorie.view.predict', { kind: 'calorie_stability', window: '30d' }, '412', 'wake'],
  /* 21–23 缺口＋别名（order426／new 7／new 29） */
  ['查热量缺口', 'calorie.view.deficit', { window: '7d' }, '426', 'wake'],
  ['看热量缺口', 'calorie.view.deficit', { window: '7d' }, '7', 'new'],
  ['看体重预测', 'calorie.view.predict', { horizonDays: 7, window: '14d' }, '29', 'new'],
  /* 24–31 报告 8 条（order331–338） */
  ['看BMI报告', 'calorie.report.bmi', { window: '90d' }, '331', 'wake'],
  ['看TDEE报告', 'calorie.report.tdee', { window: '30d' }, '332', 'wake'],
  ['看BMR报告', 'calorie.report.bmr', { window: '30d' }, '333', 'wake'],
  ['看蛋白质摄入报告', 'calorie.report.protein', { window: '30d' }, '334', 'wake'],
  ['看水分摄入报告', 'calorie.report.water', { window: '30d' }, '335', 'wake'],
  ['看综合评分', 'calorie.report.score', { window: '30d' }, '336', 'wake'],
  ['看健康趋势', 'calorie.report.trend', { window: '90d' }, '337', 'wake'],
  ['看健康报告(含对比)', 'calorie.report.compare', { window: '7d' }, '338', 'wake'],
].map(([wake, key, params, order, list]) => ({ wake, key, params, order, list }));

/* 参数逐字核对：routes.ts 原文里该 order 的 cli 字段必须与本脚本 JSON 完全一致
   （routes.ts 里 cli 值内层的单引号在源码里写作 \'，比对前先还原，否则是假红）。 */
const routesText = readFileSync(ROUTES, 'utf8');
const paramAudit = cases.map((c) => {
  const line = routesText.split(/\r?\n/).find((l) => l.includes(`order: ${c.order},`) && l.includes(`key: '${c.key}'`) && l.includes(`wakeWord: '${c.wake}'`));
  const captured = line ? (line.match(/cli: '(.*)' \},?$/) || [])[1] : null;
  const cli = captured === null ? null : captured.replace(/\\'/g, "'");
  const expected = `${c.key} --params '${JSON.stringify(c.params)}'`;
  const ok = Boolean(cli && cli.includes(expected));
  return { n: null, order: c.order, wake: c.wake, key: c.key, paramsVerbatim: ok, routesCli: cli };
});
paramAudit.forEach((a, i) => { a.n = String(i + 1).padStart(2, '0'); });
const paramMismatch = paramAudit.filter((a) => !a.paramsVerbatim);
console.log(`PARAM-AUDIT: ${cases.length - paramMismatch.length}/${cases.length} 与 routes.ts cli 逐字一致`
  + (paramMismatch.length ? ` 不符=${JSON.stringify(paramMismatch.map((m) => m.n + ':' + m.wake))}` : ''));

/* ── 3. 逐个真跑 ─────────────────────────────────────────────────────────────── */
const num = (i) => String(i + 1).padStart(2, '0');
const fileWord = (w) => w.replace(/\s+/g, '').replace(/[\\/:*?"<>|]/g, '_');
const runAt = new Date().toISOString();
const results = [];
cases.forEach((c, i) => {
  const stem = `${num(i)}-${fileWord(c.wake)}`;
  const outPath = join(DIRS.out, `${stem}.html`);
  const argv = [BIN, c.key, '--params', JSON.stringify(c.params), '--html', outPath];
  const cmdLine = ['node', ...argv].map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ');
  const r = spawnSync(process.execPath, argv, {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB_DIR }, timeout: 60000,
  });
  const tail = (s, n) => String(s || '').trimEnd().split(/\r?\n/).slice(-n).join('\n');
  writeFileSync(join(DIRS.logs, `${stem}.log`),
    [`wake=${c.wake}`, `order=${c.order}`, `key=${c.key}`, `args=${JSON.stringify(c.params)}`,
     `cmd_line=${cmdLine}`, `started=${runAt}`, `exit=${r.status}`, `signal=${r.signal ?? 'none'}`, '',
     '--- stdout ---', String(r.stdout || ''), '--- stderr ---', String(r.stderr || '')].join('\n'), 'utf8');
  const rec = {
    n: num(i), wake: c.wake, order: c.order, list: c.list, key: c.key, params: c.params,
    cliRegistered: `calorie-cmd-read ${c.key} --params '${JSON.stringify(c.params)}'`,
    cmdLine, exit: r.status, signal: r.signal ?? null,
    stdoutTail5: tail(r.stdout, 5), stderrTail5: tail(r.stderr, 5),
    outPath, collectedPath: join(DIRS.html, `${stem}.html`), logPath: join(DIRS.logs, `${stem}.log`),
  };
  if (r.status === 0) {
    let html = '';
    try { html = readFileSync(outPath, 'utf8'); } catch (e) { rec.readError = String(e.message); }
    const trimmed = html.replace(/^\uFEFF/, '');
    rec.bytes = Buffer.byteLength(html, 'utf8');
    rec.sha256_12 = createHash('sha256').update(html, 'utf8').digest('hex').slice(0, 12);
    rec.probe = {
      first_bytes: trimmed.slice(0, 24),
      doctype_at_start: /^\s*<!doctype html>/i.test(trimmed.slice(0, 300)),
      charset_utf8: /<meta[^>]+charset=["']?utf-8["']?/i.test(trimmed),
      ends_with_html: /<\/html>\s*$/i.test(trimmed.trimEnd()),
      openable: /^\s*<!doctype html>/i.test(trimmed.slice(0, 300)) && /<\/html>\s*$/i.test(trimmed.trimEnd()),
      title: (trimmed.match(/<title>([^<]*)<\/title>/i) || [])[1] || null,
    };
    let envJson = null;
    try { envJson = JSON.parse(String(r.stdout).trim().split(/\r?\n/).pop()); } catch { /* 不阻断 */ }
    rec.envelope = envJson ? { version: envJson.version, skill: envJson.skill, key: envJson.key, shape: envJson.shape, output: envJson.data?.output ?? null } : null;
    try { copyFileSync(outPath, rec.collectedPath); rec.collectedBytes = statSync(rec.collectedPath).size; } catch (e) { rec.copyError = String(e.message); }
  } else {
    rec.failure = { stdoutTail5: tail(r.stdout, 5), stderrTail5: tail(r.stderr, 5) };
  }
  results.push(rec);
  console.log(`${r.status === 0 ? 'OK  ' : 'FAIL'} ${stem} exit=${r.status} bytes=${rec.bytes ?? '-'} `
    + `doctype=${rec.probe?.doctype_at_start ?? '-'} charset_utf8=${rec.probe?.charset_utf8 ?? '-'} `
    + `ends_html=${rec.probe?.ends_with_html ?? '-'}`);
});

const pass = results.filter((x) => x.exit === 0).length;
writeFileSync(join(OUTDIR, 'results.json'), JSON.stringify({
  ticket: '532', runAt,
  purpose: '卡路里场景10（31 条唤醒词）在当前 dist 上重跑；这份读数就是 t532-清单.mjs 的唯一出处',
  dist: distProbe, bin: BIN, routesSource: ROUTES,
  seed: 'db/ 60 天（体重/三餐/隔日运动/水分）＋档案＋目标（真库零触碰）',
  numbering: '01–20 预测(order393–412)／21 查热量缺口(order426)／22 看热量缺口(new7)／23 看体重预测(new29)／24–31 报告(order331–338)',
  paramAudit, runs: results,
}, null, 2) + '\n', 'utf8');
console.log(`\nRESULT: ${pass}/${results.length} 真跑成功；results.json 已落盘 -> ${OUTDIR}`);
process.exit(pass === results.length ? 0 : 1);
