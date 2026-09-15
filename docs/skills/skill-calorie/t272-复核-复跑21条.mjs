// #272 独立复核 · 21 条榜单词（＋1 条 查高热量排行）逐条真跑 ＋ 窗口三层核对
//
// 复核者自跑，不引用作者的任何读数表：
//   · 路由记录从**生成物** `dist/triggers/routes.generated.js` 现读（不手抄作者的 22 行表）；
//   · 真出口 = `packages/skill-calorie/dist/cli/cmd_read.js`；每条跑前还原同一份播种快照；
//   · 三层核对：① 唤醒词语面 → 声明参数（window／category）② 声明参数 → 页面读数（H1 区间）
//                ③ 页面本身是完整文档（doctype ＋ charset ＋ 样式）。
//
// 用法：node docs/skills/skill-calorie/t272-复核-复跑21条.mjs [outDir]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/ilife';
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, process.argv[2] ?? '.scratch/t272r/run');
const DB = join(OUT, 'db');
const HTMLDIR = join(DB, 'calorie_html');
const DBF = join(DB, 'calorie_data.db');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(HTMLDIR, { recursive: true });

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const db = openDb(DBF);
seedFull(db);
db.close();
const SNAP = readFileSync(DBF);

/* ── 路由记录：现读生成物 ── */
const mod = await import('file:///' + join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routes.generated.js'));
const ALL = [...mod.WAKE_ROUTES, ...(mod.NEW_KEY_ROUTES || []), ...(mod.COVERAGE_REPAIR_ROUTES || [])];
const ROUTES = ALL.filter((r) => String(r.scene) === '02' && r.key === 'calorie.view.ranking');

/* ── 由种子日算期望区间（不硬编码作者的 2026-08-09 之类） ── */
const day = (iso, delta) => {
  const d = new Date(Date.parse(iso + 'T12:00:00Z') + delta * 86400000);
  return d.toISOString().slice(0, 10);
};
const WANT_RANGE = {
  '7d': day(SEED_TODAY, -6) + ' ~ ' + SEED_TODAY,
  '30d': day(SEED_TODAY, -29) + ' ~ ' + SEED_TODAY,
  '本月': SEED_TODAY.slice(0, 7) + '-01 ~ ' + SEED_TODAY,
};
const CAT_OF_WORD = (w) => {
  for (const [cat, kw] of [['high_calorie', '高热量'], ['low_calorie', '低热量'], ['frequent', '频繁吃'],
    ['high_carb', '高碳水'], ['high_protein', '高蛋白']]) if (w.includes(kw)) return cat;
  return null;
};
const WIN_OF_WORD = (w) => (w.includes('最近 30 天') ? '30d' : w.includes('本月') ? '本月' : w.includes('自定义') ? 'custom' : '7d');

const h1Of = (html) => (html.match(/ilife-block-page-shell-title"[^>]*>([^<]*)</) ?? [])[1] ?? '';
const rangeIn = (s) => (String(s).match(/(\d{4}-\d{2}-\d{2}) ~ (\d{4}-\d{2}-\d{2})/) ?? []).slice(1, 3).join(' ~ ');

const rows = [];
for (const r of ROUTES) {
  const m = /calorie-cmd-read\s+(\S+)(?:\s+--params\s+(?:"([\s\S]*)"|'([\s\S]*)'))?\s*$/.exec(String(r.cli || ''));
  const params = JSON.parse(m[2] !== undefined ? m[2] : m[3]);
  const wake = String(r.wakeWord);
  for (const s of ['', '-wal', '-shm']) rmSync(DBF + s, { force: true });
  writeFileSync(DBF, SNAP);
  utimesSync(DBF, new Date(), new Date());
  const before = new Set(readdirSync(HTMLDIR).filter((f) => f.endsWith('.html')));
  const out = spawnSync(process.execPath, [CLI, m[1], '--params', JSON.stringify(params)], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: DB, CALORIE_TODAY: SEED_TODAY },
  });
  const made = readdirSync(HTMLDIR).filter((f) => f.endsWith('.html') && !before.has(f));
  const file = made[0] ?? null;
  const abs = file === null ? null : join(HTMLDIR, file);
  const html = abs === null ? '' : readFileSync(abs, 'utf8');
  const bytes = abs === null ? 0 : statSync(abs).size;

  /* ① 词面 → 声明参数 */
  const wantWin = WIN_OF_WORD(wake);
  const gotWin = params.window === undefined ? '(缺省)' : String(params.window);
  const winOk = wantWin === '7d' ? (gotWin === '7d' || gotWin === '(缺省)') : gotWin === wantWin;
  const wantCat = CAT_OF_WORD(wake);
  const gotCat = params.category === undefined ? null : String(params.category);
  /* 「看全部排行榜」「查食物排行」这一类是**有意**不给 category（全榜页）。 */
  const allBoardWord = /全部排行榜|查食物排行/.test(wake);
  const catOk = allBoardWord ? gotCat === null : gotCat === wantCat;
  /* 自定义必须有显式 start／end */
  const customOk = wantWin !== 'custom' || (typeof params.start === 'string' && typeof params.end === 'string');

  /* ② 声明参数 → 页面读数 */
  const h1 = h1Of(html);
  const pageRange = rangeIn(h1);
  const expRange = wantWin === 'custom' ? params.start + ' ~ ' + params.end : WANT_RANGE[wantWin];
  const pageWinOk = pageRange === expRange;
  /* 单榜页 H1 里的榜名要与词面那一类一致（全榜页除外） */
  const nameOk = allBoardWord || wantCat === null ? true : /高热量榜|低热量榜|常吃榜|高碳水榜|高蛋白榜/.test(h1) && h1.includes(
    { high_calorie: '高热量榜', low_calorie: '低热量榜', frequent: '常吃榜', high_carb: '高碳水榜', high_protein: '高蛋白榜' }[wantCat]);

  /* ③ 完整文档 */
  const docOk = /^<!doctype html>/i.test(html) && /charset/i.test(html) && html.includes('<style>');

  rows.push({
    i: rows.length + 1, wake, params, exit: out.status, file, abs, bytes, h1, pageRange,
    ths: [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((x) => x[1]),
    details: (html.match(/<details/g) ?? []).length,
    winOk, catOk, customOk, pageWinOk, nameOk, docOk,
    stderr: String(out.stderr).trim().split('\n').filter(Boolean).slice(-1)[0] ?? '',
  });
}

const ok = (k, rs = rows) => rs.filter((r) => r[k]).length;
/** 第 22 条（`查高热量排行`）是**已裁定归 #276** 的已知缺陷，不并进「21 条」的判定，单列复现读数。 */
const KNOWN = rows.filter((r) => r.wake === '查高热量排行');
const TWENTYONE = rows.filter((r) => r.wake !== '查高热量排行');
const L = [];
L.push('#250 口径：真出口 ' + CLI.replace(/\\/g, '/'));
L.push('ROUTE-RECORDS = ' + ROUTES.length + '（生成物现读）  SEED_TODAY = ' + SEED_TODAY);
L.push('');
L.push('| # | 唤醒词 | window | category | exit | 字节 | H1 区间 | 文档 | 词面→参数 | 参数→页 | 榜名 | 折叠 |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  L.push('| ' + r.i + ' | ' + r.wake + ' | `' + (r.params.window ?? '(缺省)') + '` | `' + (r.params.category ?? '—') + '` | ' + r.exit
    + ' | ' + r.bytes + ' | ' + r.pageRange + ' | ' + (r.docOk ? '●' : '✗') + ' | ' + (r.winOk && r.catOk && r.customOk ? '●' : '✗')
    + ' | ' + (r.pageWinOk ? '●' : '✗') + ' | ' + (r.nameOk ? '●' : '✗') + ' | ' + r.details + ' |');
}
L.push('');
L.push('产物目录（绝对路径）：' + OUT.replace(/\//g, '\\') + '\\db\\calorie_html');
for (const r of rows) if (r.abs) L.push('  ' + String(r.i).padStart(2) + '  ' + r.abs.replace(/\//g, '\\') + '  ' + r.bytes + ' B');

writeFileSync(join(OUT, '_manifest.json'), JSON.stringify(rows, null, 1), 'utf8');
writeFileSync(join(OUT, '_table.md'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
console.log('');
console.log('RESULT: route-records = ' + ROUTES.length + '（21 条榜单词 ＋ ' + KNOWN.length + ' 条 查高热量排行）');
console.log('RESULT: 21 条真跑 exit0 = ' + TWENTYONE.filter((r) => r.exit === 0).length + '/' + TWENTYONE.length);
console.log('RESULT: 21 条有产物 = ' + TWENTYONE.filter((r) => r.file !== null).length + '/' + TWENTYONE.length);
console.log('RESULT: 21 条完整文档 = ' + ok('docOk', TWENTYONE) + '/' + TWENTYONE.length);
console.log('RESULT: 21 条词面→声明参数 = ' + TWENTYONE.filter((r) => r.winOk && r.catOk && r.customOk).length + '/' + TWENTYONE.length);
console.log('RESULT: 21 条声明参数→页面窗口 = ' + ok('pageWinOk', TWENTYONE) + '/' + TWENTYONE.length);
console.log('RESULT: 21 条页题榜名合词面 = ' + ok('nameOk', TWENTYONE) + '/' + TWENTYONE.length);
for (const r of KNOWN) {
  console.log('RESULT: 查高热量排行（已知缺陷，归 #276）= category 声明=' + (r.params.category ?? '(缺)')
    + ' 实测页题=「' + r.h1 + '」 折叠块=' + r.details + ' → ' + (r.params.category === undefined && r.details === 5 ? '复现（落成全部排行）' : '未复现'));
}
const bad = TWENTYONE.filter((r) => r.exit !== 0 || !r.docOk || !r.winOk || !r.catOk || !r.customOk || !r.pageWinOk || !r.nameOk);
for (const r of bad) console.log('  RED #' + r.i + ' ' + r.wake + ' exit=' + r.exit + ' window=' + (r.params.window ?? '—')
  + ' category=' + (r.params.category ?? '—') + ' h1=' + r.h1 + ' winOk=' + r.winOk + ' catOk=' + r.catOk + ' customOk=' + r.customOk
  + ' pageWinOk=' + r.pageWinOk + ' nameOk=' + r.nameOk + ' docOk=' + r.docOk + (r.stderr ? ' stderr=' + r.stderr.slice(0, 120) : ''));
console.log(bad.length === 0 ? 'RESULT: 21 条逐条真跑 PASS' : 'RESULT: 21 条逐条真跑 FAIL red=' + bad.length);
process.exit(bad.length === 0 ? 0 : 1);
