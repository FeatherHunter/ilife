// #272 独立复核 · 自设新探针（协议 §5.1「自设新探针」硬要求）
//
// 打的是**作者脚本覆盖不到的盲区**：作者那 26 条断言只钉「表头列序」「前三金银铜」「三段条」
// 「空榜不出折叠块」「融合四条」「机器话」「复制区」「窗口三写法」——**一个单元格都没钉**。
// 而本票票面专属约束①要的是「表列与排序口径照老实物」，老实物 `food_ranking.html` 的真缺陷
// 恰恰是**标签与值错位**（`:243-247` 的 thead 与 `:308-310` 的行值对照）。
//
// 本探针三条，全部**不复用被审代码的中间量**，期望值直接由 SQL 现算：
//   P1 取值对齐：每一行每个单元格的值＝该食物在该窗口的那个量（标签说什么，值就是什么）
//   P2 全榜页逐榜列序：`<details>` 里每一张表用它**自己那一类**的列序（不是拿第一类的列序套五类）
//   P3 排序口径：按各榜的排序键对**全序**做单调性检查（不只是看头名）
//   交叉：全榜页里每一类的行数 ＝ 同一窗口同一 topN 的单榜页行数（两条装配路必须同源）
//
// 用法：node docs/skills/skill-calorie/t272-复核-新探针-表列与取值.mjs [outDir]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/ilife';
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, process.argv[2] ?? '.scratch/t272r/probe');
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

/** 老实物的列序（`food_ranking.html:243-247` 的 thead 逐类抄录，去掉「食物名→食物」「均热量/次→餐均」
 *  两个已被 `test/diet-homogeneity-108.test.mjs:194` 钉住的新侧词）。 */
const COLS = {
  high_calorie: ['排名', '食物', '总热量', '次数', '餐均', '营养结构'],
  low_calorie: ['排名', '食物', '总热量', '次数', '餐均', '营养结构'],
  frequent: ['排名', '食物', '次数', '总热量', '餐均', '营养结构'],
  high_carb: ['排名', '食物', '总碳水', '次数', '总热量', '营养结构'],
  high_protein: ['排名', '食物', '总蛋白', '次数', '总热量', '营养结构'],
};
/** 各榜排序键（老实物取数层口径：热量降／餐均升／次数降／碳水降／蛋白降）。 */
const KEYS = {
  high_calorie: { label: '总热量', dir: -1 }, low_calorie: { label: '餐均', dir: 1 },
  frequent: { label: '次数', dir: -1 }, high_carb: { label: '总碳水', dir: -1 }, high_protein: { label: '总蛋白', dir: -1 },
};
const NAME2CAT = { 高热量榜: 'high_calorie', 低热量榜: 'low_calorie', 常吃榜: 'frequent', 高碳水榜: 'high_carb', 高蛋白榜: 'high_protein' };
const UNITS = { 总热量: '卡', 餐均: '卡/餐', 总碳水: '克', 总蛋白: '克', 次数: '次' };

const run = (key, params) => {
  for (const s of ['', '-wal', '-shm']) rmSync(DBF + s, { force: true });
  writeFileSync(DBF, SNAP);
  const before = new Set(readdirSync(HTMLDIR).filter((f) => f.endsWith('.html')));
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: DB, CALORIE_TODAY: SEED_TODAY },
  });
  const made = readdirSync(HTMLDIR).filter((f) => f.endsWith('.html') && !before.has(f));
  const abs = made[0] ? join(HTMLDIR, made[0]) : null;
  if (r.status !== 0 || abs === null) {
    return { status: r.status, html: '', bytes: 0, err: String(r.stderr).trim().split('\n').slice(-1)[0] ?? '' };
  }
  return { status: r.status, html: readFileSync(abs, 'utf8'), bytes: statSync(abs).size, abs, err: '' };
};

/** 第一张表的 thead 列序 ＋ 逐行单元格。 */
const tableOf = (html) => {
  const ths = [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
  const body = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
  const rows = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]));
  return { ths, rows };
};

/** 由 SQL 现算某食物在某窗口的量（完全不复用被审代码的中间量）。 */
const windowAgg = (food, start, end) => {
  const s = openDb(DBF);
  try {
    const r = s.prepare('SELECT SUM(calories) AS c, SUM(protein) AS p, SUM(carbs) AS cb, SUM(fat) AS f, COUNT(*) AS n'
      + ' FROM food_log WHERE date >= ? AND date <= ? AND food_name = ?').get(start, end, food);
    return { cal: Number(r.c ?? 0), pro: Number(r.p ?? 0), carb: Number(r.cb ?? 0), fat: Number(r.f ?? 0), n: Number(r.n ?? 0) };
  } finally { s.close(); }
};
const numOf = (cell) => {
  const m = String(cell).match(/-?\d+(?:\.\d+)?/);
  return m === null ? null : Number(m[0]);
};
const nutriText = (a) => {
  const t = a.pro * 4 + a.carb * 4 + a.fat * 9;
  if (t <= 0) return '—';
  const p = Math.round((a.pro * 4 / t) * 100);
  const c = Math.round((a.carb * 4 / t) * 100);
  return '蛋白 ' + p + '%｜碳水 ' + c + '%｜脂肪 ' + (100 - p - c) + '%';
};

const RANGE = { start: '2026-09-01', end: SEED_TODAY };
const fails = [];
const notes = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); return cond; };

/* ── P1 ＋ P3：五个单榜页逐行取值对齐 ＋ 全序单调 ── */
const single = {};
for (const cat of Object.keys(COLS)) {
  const r = run('calorie.view.ranking', { category: cat, topN: 10, window: '7d' });
  check(r.status === 0, 'P1 ' + cat + ' 真出口 exit=' + r.status + ' ' + r.err);
  if (r.status !== 0) continue;
  const t = tableOf(r.html);
  single[cat] = t;
  check(JSON.stringify(t.ths) === JSON.stringify(COLS[cat]), 'P1 ' + cat + ' 列序不是该类的：' + t.ths.join('｜'));
  const series = [];
  t.rows.forEach((cells, idx) => {
    check(cells.length === t.ths.length, 'P1 ' + cat + ' 第 ' + (idx + 1) + ' 行列数 ' + cells.length + ' ≠ 表头 ' + t.ths.length);
    const byLabel = {};
    t.ths.forEach((h, j) => { byLabel[h] = cells[j] ?? ''; });
    const food = byLabel['食物'];
    const a = windowAgg(food, RANGE.start, RANGE.end);
    const want = {
      '排名': idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : String(idx + 1),
      '食物': food,
      '总热量': String(a.cal) + ' 卡',
      '次数': String(a.n) + ' 次',
      '餐均': String(Math.floor(a.cal / Math.max(a.n, 1))) + ' 卡/餐',
      '总碳水': String(a.carb) + ' 克',
      '总蛋白': String(a.pro) + ' 克',
      '营养结构': nutriText(a),
    };
    for (const h of t.ths) {
      if (h === '食物' || h === '营养结构' || h === '排名') {
        check(byLabel[h] === want[h], 'P1 ' + cat + ' 「' + food + '」「' + h + '」值=' + byLabel[h] + ' 应为 ' + want[h]);
      } else {
        const got = numOf(byLabel[h]);
        const exp = numOf(want[h]);
        check(got === exp && String(byLabel[h]).includes(UNITS[h]),
          'P1 ' + cat + ' 「' + food + '」「' + h + '」值=' + byLabel[h] + ' 应为 ' + want[h]);
      }
    }
    if (cat === 'low_calorie' || cat === 'frequent') check(food !== '💧水', 'P1 ' + cat + ' 没按老口径滤掉饮水');
    series.push(byLabel[KEYS[cat].label]);
  });
  /* P3：全序单调（非严格，允许并列） */
  const vals = series.map(numOf);
  for (let i = 1; i < vals.length; i++) {
    const d = KEYS[cat].dir;
    check(d * (vals[i - 1] - vals[i]) >= 0, 'P3 ' + cat + ' 第 ' + i + '／' + (i + 1) + ' 行排序键逆序：' + vals[i - 1] + ' → ' + vals[i]);
  }
}

/* ── P2 ＋ 交叉：全榜页逐榜列序与行数 ── */
const all = run('calorie.view.ranking', { topN: 10, window: '7d' });
check(all.status === 0, 'P2 全榜页真出口 exit=' + all.status + ' ' + all.err);
if (all.status === 0) {
  const chunks = all.html.split('<details').slice(1);
  check(chunks.length === 5, 'P2 全榜页折叠块 ' + chunks.length + ' 个（五类榜都有数据时应 5 个）');
  const seen = new Set();
  for (const ch of chunks) {
    const name = (ch.match(/<summary[^>]*>([^<]*)</) ?? [])[1] ?? '';
    const cat = NAME2CAT[name.slice(0, name.indexOf('（'))];
    check(cat !== undefined, 'P2 折叠标题认不出是哪一类：' + name.slice(0, 40));
    if (cat === undefined) continue;
    seen.add(cat);
    const t = tableOf(ch.slice(0, ch.indexOf('</details>')));
    check(JSON.stringify(t.ths) === JSON.stringify(COLS[cat]),
      'P2 全榜页「' + cat + '」那张表用的是别的类的列序：' + t.ths.join('｜') + ' 应为 ' + COLS[cat].join('｜'));
    check(single[cat] !== undefined && t.rows.length === single[cat].rows.length,
      'P2 全榜页「' + cat + '」行数 ' + t.rows.length + ' ≠ 单榜页同行数 ' + (single[cat] ? single[cat].rows.length : 'N/A'));
    const names1 = t.rows.map((c) => c[1]).join(',');
    const names2 = single[cat].rows.map((c) => c[1]).join(',');
    check(names1 === names2, 'P2 全榜页「' + cat + '」上榜名单与单榜页不一致：' + names1 + ' ≠ ' + names2);
  }
  check(seen.size === 5, 'P2 全榜页只覆盖 ' + seen.size + ' 类榜');
  /* 交叉：全榜页五类行数合计 ＝ 结论句里的「合计 N 种」 */
  const total = Object.keys(single).reduce((acc, c) => acc + single[c].rows.length, 0);
  const h1sub = (all.html.match(/ilife-block-page-shell-subtitle"[^>]*>([^<]*)</) ?? [])[1] ?? '';
  check(h1sub.includes('合计 ' + total + ' 种'), 'P2 结论句合计与逐榜行数之和不符：句=「' + h1sub + '」 算得 ' + total);
  notes.push('全榜页五类行数合计 = ' + total + '；结论句 = 「' + h1sub.slice(0, 60) + '」');
}

/** 空榜那一支：只播饮水一条 ⇒ 低热量／常吃两榜滤空，全榜页只该出 3 个折叠块。 */
const EMPTY = join(OUT, 'empty');
rmSync(EMPTY, { recursive: true, force: true });
mkdirSync(join(EMPTY, 'calorie_html'), { recursive: true });
{
  const e = openDb(join(EMPTY, 'calorie_data.db'));
  e.exec("INSERT INTO food_log (food_name, date, time, calories, protein, carbs, fat, grams) VALUES ('💧水', '"
    + SEED_TODAY + "', '09:00', 0, 0, 0, 0, 300)");
  e.close();
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.ranking', '--params', JSON.stringify({ topN: 10, window: '7d' })], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: EMPTY, CALORIE_TODAY: SEED_TODAY },
  });
  const made = readdirSync(join(EMPTY, 'calorie_html'));
  check(r.status === 0 && made.length === 1, 'P2 坏窗口/空榜：exit=' + r.status + ' 产物=' + made.length);
  if (made.length === 1) {
    const html = readFileSync(join(EMPTY, 'calorie_html', made[0]), 'utf8');
    const n = (html.match(/<details/g) ?? []).length;
    check(n === 3, 'P2 只播饮水时全榜页该出 3 个折叠块（低热量／常吃滤空），实测 ' + n);
  }
}

/* ── 空窗：按设计应是 exit 4 ＋ ERR 4（不是一张空页冒充成功） ── */
{
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.ranking', '--params', JSON.stringify({ category: 'high_calorie', window: '7d' })], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: EMPTY, CALORIE_TODAY: '2026-08-20' },
  });
  const err = String(r.stderr);
  check(r.status === 4, 'P4 空窗该 exit 4，实测 ' + r.status);
  check(/ERR 4: 取数失败（缺失阻断）/.test(err), 'P4 空窗 stderr 不是缺失阻断话术：' + err.slice(0, 160));
  check((r.stdout || '').trim() === '', 'P4 空窗不该往 stdout 吐页');
  notes.push('空窗读数：exit=' + r.status + ' stderr=' + err.trim().split('\n').slice(-1)[0]);
}

const L = ['#272r 新探针 · 表列与取值（P1）／全榜逐榜列序与同源（P2）／全序单调（P3）／空窗两态（P4）', ''];
for (const n of notes) L.push('- ' + n);
L.push('');
L.push('RESULT: 新探针断言 ' + (fails.length === 0 ? 'PASS' : 'FAIL') + ' red=' + fails.length);
for (const f of fails) L.push('  RED ' + f);
writeFileSync(join(OUT, '_probe.md'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
process.exit(fails.length === 0 ? 0 : 1);
