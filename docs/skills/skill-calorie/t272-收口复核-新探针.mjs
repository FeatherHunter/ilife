#!/usr/bin/env node
/** #272 收口复核席 · 探针二：取值是否真随 category 变 ＋ 权威写死的假样例（专打「脚本自我满足」）。
 *
 * 三组：
 *   C 五类榜互不相同 —— 同一窗口渲染五类榜，**逐对**比较产物全文（10 对），并逐类核对表头与主指标列；
 *   D 权威写死的假样例 —— 自己造一条食物，营养数据由**纸上手算**得出期望值，写死在脚本里：
 *       测试饭 ×2 条记录（每条 protein 10 / carbs 20 / fat 5 / calories 165）
 *       ⇒ 盘上应得 totalCal 330、cnt 2、餐均 floor(330/2)=165、总蛋白 20、总碳水 40、总脂肪 10
 *       ⇒ 热量占比：蛋白 round(20*4/330*100)=24、碳水 round(40*4/330*100)=48、脂肪吃余数 100-24-48=28
 *       期望串写死为「蛋白 24%｜碳水 48%｜脂肪 28%」（三段和恒 100；老实物各段四舍五入会得 27 ⇒ 和 99）。
 *       这一组判的是**「收窄有没有变成放宽」**：若把余数改回逐段四舍五入，或把列序退回写死一套，本组必红。
 *   E 部分空 —— 只播一条 💧水：全榜页只给有数据的榜出折叠块，空榜在读数卡与口径行点名。
 *
 * 跑法：`node docs/skills/skill-calorie/t272-收口复核-新探针.mjs`
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const DIST = join(ROOT, 'packages', 'skill-calorie', 'dist');
const CLI = join(DIST, 'cli', 'cmd_read.js');

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(DIST, 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const BASE = join(ROOT, '.scratch', 't272', 'probe2');
const WEEK = '2026-09-01 ~ 2026-09-07';

/** 逐类表头（**照老实物 `food_ranking.html:242-247` 的 thead 逐类抄**，不是照新代码抄）。 */
const COLS = {
  high_calorie: ['排名', '食物', '总热量', '次数', '餐均', '营养结构'],
  low_calorie: ['排名', '食物', '总热量', '次数', '餐均', '营养结构'],
  frequent: ['排名', '食物', '次数', '总热量', '餐均', '营养结构'],
  high_carb: ['排名', '食物', '总碳水', '次数', '总热量', '营养结构'],
  high_protein: ['排名', '食物', '总蛋白', '次数', '总热量', '营养结构'],
};

let red = 0;
const notes = [];
function check(cond, msg) {
  if (!cond) { red += 1; notes.push('✖ ' + msg); } else { notes.push('✔ ' + msg); }
}

function freshDir(name) {
  const d = join(BASE, name);
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
  return d;
}

function render(dbDir, params) {
  const out = join(dbDir, 'out-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.ranking', '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dbDir, CALORIE_TODAY: SEED_TODAY, CALORIE_FORCE_PROD: '1' },
  });
  return { status: r.status, stderr: String(r.stderr ?? '').trim(), html: r.status === 0 && existsSync(out) ? readFileSync(out, 'utf8') : '' };
}

const thsOf = (html) => [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);

/* ---------- C · 五类榜互不相同 ---------- */
const seedDir = freshDir('seed');
{
  const db = openDb(join(seedDir, DB_FILENAME));
  seedFull(db);
  db.close();
}
const docs = {};
for (const cat of Object.keys(COLS)) {
  const r = render(seedDir, { category: cat, topN: 10, window: '7d' });
  if (r.status !== 0) { red += 1; notes.push('✖ ' + cat + ' 渲染失败 exit=' + r.status + ' ' + r.stderr.slice(-120)); continue; }
  docs[cat] = r.html;
  check(JSON.stringify(thsOf(r.html)) === JSON.stringify(COLS[cat]),
    cat + ' 表头＝' + COLS[cat].join('｜') + '（实测 ' + thsOf(r.html).join('｜') + '）');
}
const cats = Object.keys(docs);
let pairs = 0;
let same = 0;
for (let i = 0; i < cats.length; i++) {
  for (let j = i + 1; j < cats.length; j++) {
    pairs += 1;
    if (docs[cats[i]] === docs[cats[j]]) { same += 1; notes.push('✖ ' + cats[i] + ' 与 ' + cats[j] + ' 产物完全相同'); }
  }
}
check(same === 0, '五类榜两两产物互不相同（比了 ' + pairs + ' 对，相同 ' + same + ' 对）');
console.log('RESULT-C: 表头逐类 ' + cats.length + '/5 对上；两两不同 ' + (pairs - same) + '/' + pairs);

/* ---------- D · 权威写死的假样例 ---------- */
const synDir = freshDir('synthetic');
{
  const db = openDb(join(synDir, DB_FILENAME));
  const ins = db.prepare('INSERT INTO food_log (food_name, date, time, calories, protein, carbs, fat, grams) VALUES (?,?,?,?,?,?,?,?)');
  /* 测试饭：两条一样的记录 ⇒ 手算期望见件头。 */
  ins.run('测试饭', '2026-09-03', '12:00', 165, 10, 20, 5, 100);
  ins.run('测试饭', '2026-09-04', '12:00', 165, 10, 20, 5, 100);
  /* 💧水：零值（热量与三大营养素全 0）⇒ 该行文字写 —、不画条身。 */
  ins.run('💧水', '2026-09-03', '09:00', 0, 0, 0, 0, 300);
  db.close();
}
const EXPECT_NUTRI = '蛋白 24%｜碳水 48%｜脂肪 28%';
for (const [cat, expectCols, thirdHeader, thirdCell, fifthHeader, fifthCell] of [
  ['high_calorie', COLS.high_calorie, '总热量', '330 卡', '餐均', '165 卡/餐'],
  ['high_carb', COLS.high_carb, '总碳水', '40 克', '总热量', '330 卡'],
  ['high_protein', COLS.high_protein, '总蛋白', '20 克', '总热量', '330 卡'],
]) {
  const r = render(synDir, { category: cat, topN: 10, window: '7d' });
  if (r.status !== 0) { red += 1; notes.push('✖ ' + cat + ' 假样例渲染失败 exit=' + r.status + ' ' + r.stderr.slice(-120)); continue; }
  const ths = thsOf(r.html);
  check(ths[2] === thirdHeader && ths[4] === fifthHeader,
    cat + ' 表头 3/5 列＝' + thirdHeader + '/' + fifthHeader + '（实测 ' + ths[2] + '/' + ths[4] + '）');
  /* 表体第一行（测试饭，应为头名）的第 3／5 格值。 */
  const bodyRows = [...r.html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const foodRow = bodyRows.find((b) => b.includes('测试饭'));
  const tds = foodRow === undefined ? [] : [...foodRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].replace(/<[^>]*>/g, '').trim());
  check(tds[2] === thirdCell, cat + ' 第 3 格值＝' + thirdCell + '（实测 ' + tds[2] + '）');
  check(tds[4] === fifthCell, cat + ' 第 5 格值＝' + fifthCell + '（实测 ' + tds[4] + '）');
  check(r.html.includes(EXPECT_NUTRI), cat + ' 营养结构文字＝' + EXPECT_NUTRI + '（三段和恒 100）');
  /* 三段条宽即 24／48／28，与文字同源。 */
  const bar = /<span class="ilife-block-rank-bar"[\s\S]*?<\/span><\/span>/.exec(r.html);
  const widths = bar === null ? [] : [...bar[0].matchAll(/width:(\d+)%/g)].map((m) => Number(m[1]));
  check(JSON.stringify(widths) === JSON.stringify([24, 48, 28]), cat + ' 三段条宽＝24/48/28（实测 ' + widths.join('/') + '）');
  /* 💧水 那一行：文字写 —、不画条。 */
  const waterRow = /<div class="ilife-block-rank-row[^"]*">(?:(?!<\/div>)[\s\S])*?💧水(?:(?!<\/div>)[\s\S])*?<\/div>/.exec(r.html);
  if (waterRow !== null) {
    check(waterRow[0].includes('—'), cat + ' 💧水 那行文字位写 —');
    check(!waterRow[0].includes('ilife-block-rank-bar'), cat + ' 💧水 那行没画条身');
  }
  console.log('RESULT-D[' + cat + ']: 表头3/5=' + ths[2] + '/' + ths[4] + ' 第3格=' + tds[2] + ' 第5格=' + tds[4] + ' 条宽=' + widths.join('/'));
}

/* ---------- E · 部分空（只播一条 💧水）---------- */
const waterDir = freshDir('water-only');
{
  const db = openDb(join(waterDir, DB_FILENAME));
  db.prepare('INSERT INTO food_log (food_name, date, time, calories, protein, carbs, fat, grams) VALUES (?,?,?,?,?,?,?,?)')
    .run('💧水', '2026-09-03', '09:00', 0, 0, 0, 0, 300);
  db.close();
}
const all = render(waterDir, { topN: 10, window: '7d' });
check(all.status === 0, '只播一条 💧水：全榜页仍出页（exit=' + all.status + '）');
const details = (all.html.match(/<details/g) ?? []).length;
check(details === 3, '只给有数据的榜出折叠块：details=' + details + '（期望 3／5）');
check(all.html.includes('本窗无数据'), '空榜读数卡写「本窗无数据」');
check(/本窗没有数据的榜不出明细块：低热量榜、常吃榜/.test(all.html), '口径行点名两个空榜：低热量榜、常吃榜');
console.log('RESULT-E: 全榜 exit=' + all.status + ' details=' + details + ' 空榜点名=' + /本窗没有数据的榜不出明细块：低热量榜、常吃榜/.test(all.html));

/* ---------- 汇总 ---------- */
console.log('RESULT-NEW: ' + (red === 0 ? 'PASS' : 'FAIL') + ' 红=' + red + ' 检查项=' + notes.length);
for (const n of notes) console.log('  ' + n);
if (red > 0) process.exit(1);
if (existsSync(join(ROOT, 'packages', 'skill-calorie', 'calorie_html'))) console.log('WARN: 仓内出现 calorie_html');
if (readdirSync(join(DIST, 'diet')).length === 0) console.log('WARN: dist/diet 空');
console.log('WEEK=' + WEEK);
