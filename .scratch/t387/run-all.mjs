/** MAP #161 范围重跑（票 387）：用**当前 dist** 把 31 条唤醒词真跑一遍，收拢到 .scratch/t387/html/。
 *
 * 只写 .scratch/t387/，零源码改动、零 git 动作、真库零触碰。
 * 写法逐字照抄 .scratch/t161demo/run-all.mjs 与 .scratch/t384demo/step23-run.mjs：
 *   node packages/skill-calorie/dist/cli/cmd_read.js <calorie.key> --params '<json>' --html <路径>
 *   环境 SKILLS_DB_PATH=<自建种子库目录>（唯一出口 cmd_read 的启动预检要求）
 * 唤醒词／key／参数逐字取自 packages/skill-calorie/src/analysis/routes.ts：
 *   order393–412（预测 20 条）、order426（缺口）、new 7／new 29（别名 2）、order331–338（报告 8）。
 * 种子库：饮水在 food_log 且 food_name='💧水'（仓内没有 water_log 表）。
 * 用法（须持锁）：node .scratch/t387/run-all.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const require = createRequire(import.meta.url);
const { openDb } = require(join(ROOT, 'packages/skill-calorie/dist/index.js'));
const BIN = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');
const ROUTES = join(ROOT, 'packages/skill-calorie/src/analysis/routes.ts');
const DB_DIR = join(HERE, 'db');
const DIRS = { logs: join(HERE, 'logs'), out: join(HERE, 'out'), html: join(HERE, 'html') };
for (const d of [DIRS.logs, DIRS.out, DIRS.html]) mkdirSync(d, { recursive: true });
rmSync(DIRS.out, { recursive: true, force: true });
rmSync(DIRS.html, { recursive: true, force: true });
for (const d of [DIRS.out, DIRS.html]) mkdirSync(d, { recursive: true });

/* ── 0. 基线：dist／base-render 读数（不猜、不擅自 build；dist 过期即停手上报） ─────── */
const statOf = (p) => { try { const s = statSync(p); return { path: p, exists: true, bytes: s.size, mtime: s.mtime.toISOString() }; } catch { return { path: p, exists: false }; } };
const distProbe = { cmd_read: statOf(BIN), index: statOf(join(ROOT, 'packages/skill-calorie/dist/index.js')) };
console.log('DIST ' + JSON.stringify(distProbe));

/* ── 1. 种子库（自有目录） ───────────────────────────────────────────────────── */
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
/* 水分：没有 water_log 表——饮水＝food_log 里 food_name='💧水' 且 grams=ml（写侧 diet/log.ts 口径，读侧 analysis/series.ts 按 food_name='💧水' SUM(grams)）。 */
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

/* 参数逐字核对：routes.ts 原文里该 order 的 cli 字段必须与本脚本 JSON 完全一致 */
const routesText = readFileSync(ROUTES, 'utf8');
const paramAudit = cases.map((c) => {
  const line = routesText.split(/\r?\n/).find((l) => l.includes(`order: ${c.order},`) && l.includes(`key: '${c.key}'`) && l.includes(`wakeWord: '${c.wake}'`));
  const captured = line ? (line.match(/cli: '(.*)' \},?$/) || [])[1] : null;
  /* routes.ts 里 cli 值内层的单引号在源码里写作 \'（转义），比对前先还原，否则是假红。 */
  const cli = captured === null ? null : captured.replace(/\\'/g, "'");
  /* #519 裁定 R（编排者 2026-09-16，一次性、具名）：这一行原先写成
   *   `${c.key}' --params '${JSON.stringify(c.params)}`
   * ——键名后多了一个单引号、末尾少了一个单引号 ⇒ `cli.includes(expected)` 恒假，自检读出假红 `0/31`。
   *   **裁定给的说法是「正则对行尾不匹配」，实测不是**：上一行的 `/cli: '(.*)' \},?$/` 逐字可命中
   *   （诊断读数 `.scratch/t519/diag-param.mjs`：m1 捕获到完整命令串），真因就是本行的引号数。
   *   本窗只改这一行（裁定「只改 `PARAM-AUDIT` 那一处正则（或等价的读法），别处一行不动」）。 */
  const expected = `${c.key} --params '${JSON.stringify(c.params)}'`;
  const ok = Boolean(cli && cli.includes(expected));
  return { n: null, order: c.order, wake: c.wake, key: c.key, paramsVerbatim: ok, routesCli: cli, routesCliRaw: captured };
});
paramAudit.forEach((a, i) => { a.n = String(i + 1).padStart(2, '0'); });
const paramMismatch = paramAudit.filter((a) => !a.paramsVerbatim);
console.log(`PARAM-AUDIT: ${cases.length - paramMismatch.length}/${cases.length} 与 routes.ts cli 逐字一致` + (paramMismatch.length ? ` 不符=${JSON.stringify(paramMismatch.map((m) => m.n + ':' + m.wake))}` : ''));

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
  console.log(`${r.status === 0 ? 'OK  ' : 'FAIL'} ${stem} exit=${r.status} bytes=${rec.bytes ?? '-'} ` +
    `doctype=${rec.probe?.doctype_at_start ?? '-'} charset_utf8=${rec.probe?.charset_utf8 ?? '-'} ` +
    `ends_html=${rec.probe?.ends_with_html ?? '-'}`);
});

/* ── 4. 三项自检（机器读数） ─────────────────────────────────────────────────── */
const readCollected = (n) => {
  const rec = results.find((x) => x.n === n);
  if (!rec || rec.exit !== 0) return { n, ok: false, reason: 'no product' };
  const html = readFileSync(rec.collectedPath, 'utf8');
  return { n, ok: true, file: rec.collectedPath, html };
};
const countOf = (html, needle) => html.split(needle).length - 1;

const compareRec = results.find((x) => x.key === 'calorie.report.compare');
const compareProduct = compareRec && compareRec.exit === 0 ? readFileSync(compareRec.collectedPath, 'utf8') : '';
const deficitProducts = results.filter((x) => x.key === 'calorie.view.deficit');
const tickCounts = deficitProducts.map((x) => {
  if (x.exit !== 0) return { n: x.n, wake: x.wake, file: x.collectedPath, tickCount: null };
  const html = readFileSync(x.collectedPath, 'utf8');
  return { n: x.n, wake: x.wake, file: x.collectedPath, tickCount: countOf(html, '<text class="ilife-charts-tick"') };
});
const bytesList = results.filter((x) => x.exit === 0).map((x) => x.collectedBytes ?? x.bytes).filter((n) => typeof n === 'number');
const selfCheck = {
  exit_all_zero: { pass: results.every((x) => x.exit === 0), detail: `${results.filter((x) => x.exit === 0).length}/${results.length} exit 0` },
  plus79_in_compare: {
    pass: compareProduct !== '' && countOf(compareProduct, '+79') === 0,
    expect: 0,
    actual: compareProduct === '' ? null : countOf(compareProduct, '+79'),
    file: compareRec?.collectedPath ?? null,
    baseline_old_sample: { file: '.scratch/t384demo/html/08-看健康报告(含对比).html', plus79: 4 },
  },
  tick_in_deficit: {
    pass: tickCounts.length > 0 && tickCounts.every((t) => (t.tickCount ?? -1) >= 2),
    expect: '>=2（每条缺口产物内 <text class="ilife-charts-tick" 元素数）',
    actual: tickCounts.map((t) => `${t.n}-${t.wake}=${t.tickCount}`),
    baseline_old_sample: { file: '.scratch/t161demo/html/21-查热量缺口.html', tickCount: 0 },
  },
  bytes_range: {
    min: bytesList.length ? Math.min(...bytesList) : null,
    max: bytesList.length ? Math.max(...bytesList) : null,
    total: bytesList.reduce((a, b) => a + b, 0),
    n: bytesList.length,
  },
};
console.log('SELFCHECK ' + JSON.stringify(selfCheck));

const pass = results.filter((x) => x.exit === 0).length;
writeFileSync(join(HERE, 'results.json'), JSON.stringify({
  ticket: '387', runAt,
  purpose: 'MAP #161 范围（31 条唤醒词）在当前 dist 上重跑，同源可对照样张',
  dist: distProbe,
  bin: BIN, routesSource: ROUTES,
  seed: 'db/ 60 天（体重/三餐/隔日运动/水分）＋档案＋目标（真库零触碰）',
  numbering: '01–20 预测(order393–412)／21 查热量缺口(order426)／22 看热量缺口(new7)／23 看体重预测(new29)／24–31 报告(order331–338)',
  paramAudit, selfCheck, runs: results,
}, null, 2) + '\n', 'utf8');
console.log(`\nRESULT: ${pass}/${results.length} 真跑成功；results.json 已落盘`);
process.exit(pass === results.length ? 0 : 1);
