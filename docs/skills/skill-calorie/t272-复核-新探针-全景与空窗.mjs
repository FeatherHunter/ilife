// #272 独立复核 · 复核者自设新探针（协议 §5.1 硬要求）
//
// 与前任留下的 `t272-复核-新探针-表列与取值.mjs`（P1 单元格取值对齐／P2 全榜逐榜列序／P3 全序单调）
// **不重叠**：本探针打的是另外两个盲区 ——
//
//   A. 「看全部排行榜」是否真出五类榜**全景**（不是空壳）：
//      A1 `详情` 折叠块数 ＝ 本窗**有数据**的榜数（且面板题名逐类落在 RANK_ZH 上）
//      A2 每个折叠块里那张表的行数 ＝ 同一窗口同一 topN 的**单榜页行数**（两条装配路同源）
//      A3 每个折叠块里的表**用它自己那一类**的列序（不拿第一类套五类）
//      A4 全榜页五张读数卡里，空榜写 `—` ＋「本窗无数据」；且**不给空榜出折叠块**
//      A5 全榜页不是空壳：五类榜名在页面上都点得到名（读数卡或口径行）
//
//   B. 空窗（窗口内一条饮食记录也没有）是否按设计 `exit 4` ＋
//      `ERR 4: 取数失败（缺失阻断）：…`，**而不是出一张空页冒充成功**。
//      这一条正是「空窗两态互斥」那个遗留出口的现场读数：单榜 / 全榜两条路都测。
//
// 期望值一律**不复用被审代码的中间量**：有数据的榜／行数由 SQL 现算，列序照老实物 thead 抄录。
//
// 用法：node docs/skills/skill-calorie/t272-复核-新探针-全景与空窗.mjs [outDir]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/ilife';
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, process.argv[2] ?? '.scratch/t272r/pano');
const DB = join(OUT, 'db');
const HTMLDIR = join(DB, 'calorie_html');
const DBF = join(DB, 'calorie_data.db');
const EMPTY = join(OUT, 'empty');
const EMPTY_DB = join(EMPTY, 'db');
const EMPTY_HTML = join(EMPTY_DB, 'calorie_html');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(HTMLDIR, { recursive: true });
mkdirSync(EMPTY_HTML, { recursive: true });

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const db = openDb(DBF);
seedFull(db);
db.close();
const SNAP = readFileSync(DBF);

/** 老实物的列序（`food_ranking.html:243-247` thead 逐类抄录）。 */
const COLS = {
  high_calorie: ['排名', '食物', '总热量', '次数', '餐均', '营养结构'],
  low_calorie: ['排名', '食物', '总热量', '次数', '餐均', '营养结构'],
  frequent: ['排名', '食物', '次数', '总热量', '餐均', '营养结构'],
  high_carb: ['排名', '食物', '总碳水', '次数', '总热量', '营养结构'],
  high_protein: ['排名', '食物', '总蛋白', '次数', '总热量', '营养结构'],
};
const ZH = { high_calorie: '高热量榜', low_calorie: '低热量榜', frequent: '常吃榜', high_carb: '高碳水榜', high_protein: '高蛋白榜' };

const T0 = '2026-09-01';
const T1 = SEED_TODAY;

/** 本窗有数据的榜：由 SQL 现算（主指标 > 0 才算有数据）。 */
const boardsWithData = () => {
  const s = openDb(DBF);
  try {
    const q = (sql) => Number(s.prepare(sql).get(T0, T1)?.n ?? 0);
    return {
      high_calorie: q('SELECT COUNT(*) AS n FROM (SELECT food_name FROM food_log WHERE date>=? AND date<=? GROUP BY food_name HAVING SUM(calories)>0)'),
      low_calorie: q('SELECT COUNT(*) AS n FROM (SELECT food_name FROM food_log WHERE date>=? AND date<=? GROUP BY food_name HAVING SUM(calories)>0)'),
      frequent: q('SELECT COUNT(*) AS n FROM (SELECT food_name FROM food_log WHERE date>=? AND date<=? GROUP BY food_name HAVING COUNT(*)>0)'),
      high_carb: q('SELECT COUNT(*) AS n FROM (SELECT food_name FROM food_log WHERE date>=? AND date<=? GROUP BY food_name HAVING SUM(carbs)>0)'),
      high_protein: q('SELECT COUNT(*) AS n FROM (SELECT food_name FROM food_log WHERE date>=? AND date<=? GROUP BY food_name HAVING SUM(protein)>0)'),
    };
  } finally { s.close(); }
};

const run = (key, params, useEmpty) => {
  const base = useEmpty ? EMPTY_DB : DB;
  const f = useEmpty ? join(EMPTY_DB, 'calorie_data.db') : DBF;
  const dir = useEmpty ? EMPTY_HTML : HTMLDIR;
  if (!useEmpty) { for (const s of ['', '-wal', '-shm']) rmSync(DBF + s, { force: true }); writeFileSync(DBF, SNAP); }
  const before = new Set(readdirSync(dir).filter((x) => x.endsWith('.html')));
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: base, CALORIE_TODAY: SEED_TODAY },
  });
  const made = readdirSync(dir).filter((x) => x.endsWith('.html') && !before.has(x));
  const abs = made[0] ? join(dir, made[0]) : null;
  return {
    status: r.status, stdout: String(r.stdout), stderr: String(r.stderr).trim(),
    html: abs === null ? '' : readFileSync(abs, 'utf8'),
    bytes: abs === null ? 0 : statSync(abs).size, abs,
  };
};

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); else passes.push(msg); return cond; };
const passes = [];

/* ══ A. 全榜页全景 ══ */
const full = run('calorie.view.ranking', { topN: 10, window: '7d' });
check(full.status === 0, 'A0 全榜页真出口 exit=' + full.status + ' ' + full.stderr.split('\n').slice(-1)[0]);
const h1Full = (full.html.match(/ilife-block-page-shell-title"[^>]*>([^<]*)</) ?? [])[1] ?? '';
console.log('- A0 全榜页 exit=' + full.status + ' 字节=' + full.bytes + ' 页题=「' + h1Full + '」');

/** 折叠块：<details>…</details> 逐个切出来（含面板题名与块内第一张表的列序／行数）。 */
const blocks = [...full.html.matchAll(/<details[\s\S]*?<\/details>/g)].map((m) => {
  const s = m[0];
  const sum = (s.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) ?? [])[1] ?? '';
  const ths = [...s.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((x) => x[1]);
  const body = s.slice(s.indexOf('<tbody>'), s.indexOf('</tbody>'));
  const rows = [...body.matchAll(/<tr>/g)].length;
  return { text: sum.replace(/<[^>]*>/g, ''), ths, rows };
});

const withData = boardsWithData();
const expectBoards = Object.keys(withData).filter((c) => withData[c] > 0);
console.log('- A1 本窗有数据的榜（SQL 现算）=' + expectBoards.map((c) => ZH[c] + '(' + withData[c] + ' 种)').join('、')
  + ' ⇒ 期望折叠块 ' + expectBoards.length + ' 个（空榜不出块）');
check(blocks.length === expectBoards.length,
  'A1 折叠块数=' + blocks.length + ' 应为有数据的榜数 ' + expectBoards.length
  + '（块题=' + blocks.map((b) => b.text).join('｜') + '）');

/* 逐块核对：题名落在该类榜名上 ＋ 列序是该类的 ＋ 行数＝单榜页行数 */
const singleRows = {};
for (const cat of Object.keys(COLS)) {
  const r = run('calorie.view.ranking', { category: cat, topN: 10, window: '7d' });
  if (r.status !== 0) { singleRows[cat] = null; continue; }
  const body = r.html.slice(r.html.indexOf('<tbody>'), r.html.indexOf('</tbody>'));
  singleRows[cat] = [...body.matchAll(/<tr>/g)].length;
}
for (const cat of expectBoards) {
  const blk = blocks.find((b) => b.text.includes(ZH[cat]));
  check(blk !== undefined, 'A1 面板题名里找不到「' + ZH[cat] + '」');
  if (blk === undefined) continue;
  check(JSON.stringify(blk.ths) === JSON.stringify(COLS[cat]),
    'A3 「' + ZH[cat] + '」折叠块列序=' + blk.ths.join('｜') + ' 应为 ' + COLS[cat].join('｜'));
  check(blk.rows === singleRows[cat],
    'A2 「' + ZH[cat] + '」全榜块行数=' + blk.rows + ' ≠ 同窗口单榜页行数 ' + singleRows[cat]);
}
/* A4／A5：空榜点名 ＋ 五类榜名都点得到名 */
for (const cat of Object.keys(withData)) {
  if (withData[cat] > 0) continue;
  check(!blocks.some((b) => b.text.includes(ZH[cat])), 'A4 空榜「' + ZH[cat] + '」不该出折叠块');
  check(full.html.includes(ZH[cat]), 'A5 空榜「' + ZH[cat] + '」在全榜页上应当仍点得到名（读数卡／口径行）');
}
for (const cat of Object.keys(withData)) {
  check(full.html.includes(ZH[cat]), 'A5 全榜页点不到「' + ZH[cat] + '」的名字');
}
const cardDash = (full.html.match(/—/g) ?? []).length;
console.log('- A4/A5 空榜点名 OK；全榜页可见文本含 5 类榜名；页内「—」出现 ' + cardDash + ' 次（缺值口径）');

/* ══ B. 空窗两态 ══ */
const eSingle = run('calorie.view.ranking', { category: 'high_calorie', topN: 10, window: '7d' }, true);
const eFull = run('calorie.view.ranking', { topN: 10, window: '7d' }, true);
const errLine = (s) => (String(s).split('\n').map((x) => x.trim()).filter((x) => /^ERR /.test(x))[0] ?? '');
console.log('- B1 空窗 单榜  exit=' + eSingle.status + ' 落盘=' + (eSingle.bytes > 0 ? eSingle.bytes + ' B' : '0 件')
  + ' stderr=' + JSON.stringify(errLine(eSingle.stderr)));
console.log('- B2 空窗 全榜  exit=' + eFull.status + ' 落盘=' + (eFull.bytes > 0 ? eFull.bytes + ' B' : '0 件')
  + ' stderr=' + JSON.stringify(errLine(eFull.stderr)));
check(errLine(eSingle.stderr).startsWith('ERR 4: 取数失败（缺失阻断）'),
  'B1 空窗单榜 stderr 不是缺失阻断：' + errLine(eSingle.stderr));
check(errLine(eFull.stderr).startsWith('ERR 4: 取数失败（缺失阻断）'),
  'B2 空窗全榜 stderr 不是缺失阻断：' + errLine(eFull.stderr));
check(eSingle.status === 4, 'B1 空窗单榜 exit=' + eSingle.status + ' 设计期望 4');
check(eFull.status === 4, 'B2 空窗全榜 exit=' + eFull.status + ' 设计期望 4');
check(eSingle.bytes === 0 && eFull.bytes === 0, 'B3 空窗不该落盘 HTML（单榜 ' + eSingle.bytes + ' B／全榜 ' + eFull.bytes + ' B）');

writeFileSync(join(OUT, '_probe.md'),
  '# #272r 新探针 · 全榜全景与空窗两态\n\n' + fails.map((f) => 'RED ' + f).join('\n')
  + '\n' + passes.map((p) => 'OK  ' + p).join('\n') + '\n', 'utf8');

console.log('');
for (const f of fails.slice(0, 12)) console.log('  RED ' + f);
console.log('RESULT: 新探针（全景＋空窗）' + (fails.length === 0 ? ' PASS green=' + passes.length : ' FAIL red=' + fails.length));
process.exit(fails.length === 0 ? 0 : 1);
