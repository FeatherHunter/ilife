/** #717 · 口径唯一 —— 交付面判据（每一批一条，全走真出口 `dist/cli/cmd_read.js`）。
 *
 * **本件守什么**（每个 test 对应验收标准里的一处口径；已交付的与待做的都在这里，红的那些就是下一步的账）：
 *  ① **批① 餐别**：「餐别分布」页与「诊断饮食结构问题」页在同一窗口、同一份库上给出**同样的餐次统计**；
 *     分歧点三个（14:30／21:30／22:30）各一条记录。
 *  ② **批① 按窗删**：含 22:30 那一餐的记录 ⇒ 归夜宵 ⇒ 按餐别删「夜宵」删得掉它（收口前删不掉）。
 *  ③ **批② 区间与判决**：配比页印的推荐区间与「诊断营养不均衡」判决所依据的区间必须**同值**
 *     （收口前：配比页 `10%（83 克 / 7 天）`／诊断页证据句里的 `蛋白15-30 碳水40-60 脂肪20-35`）。
 *  ④ **批③ 钉钟**：把当刻钉到某一天后，**落库日 ＝ 回执日 ＝ 累计读的那一天**。
 *  ⑤ **批④ 闭区间天数**：窗口天数按含首末日的闭区间算。
 *
 * **不断实现细节**：不断「某函数被调了几次」、不读源码字符串；断言只打在**命令产物**与**包对外的门**上。
 *
 * 跑法：`node --test packages/skill-calorie/test/t717-口径唯一.test.mjs`
 * （先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { configDirOf, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

// #763 · 隔离基座：当刻进程的家目录也接管（本件进程内要 import／调 dist 的门），真库与真实家目录零接触。
configTestBase('t717-cfg-base-');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const FREEZE = join(HERE, 'freeze-clock.cjs');

const { openDb, KCAL_PER_KG } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
/* 时间窗口径走**既有对外读法**（`dist/fetch/diet.js` 的薄转出，包门 `fetch/index.ts` 也在转它），
   不新开第二条对外路径（#703「包门只许收窄」）：本件要看的正是「对外读到的窗口」这件事。 */
const { MEAL_WINDOWS, inferMealType } =
  await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'fetch', 'diet.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const START = '2026-09-01';
const END = SEED_TODAY;                 // 2026-09-07（种子锚点）
const PINNED_NOW = SEED_TODAY + 'T12:00:00';
/** 三个分歧点：两套小时边界（正本 6/10/14/18/22 vs 诊断旧的 10/15/21）在这些时刻给出不同餐别。 */
const PROBES = [
  ['2026-09-02', '14:30:00', '探针-14:30'],
  ['2026-09-03', '21:30:00', '探针-21:30'],
  ['2026-09-04', '22:30:00', '探针-22:30'],
];

/** 一份隔离的家目录（配置在 `<它>/.ilife/` 里、库在它里面），返回目录；`probe=true` 顺带落三条分歧点记录。 */
function freshDb(probe = true) {
  const dir = mkdtempSync(join(tmpdir(), 't717-'));
  const cfgDir = configDirOf(dir);
  mkdirSync(cfgDir, { recursive: true });
  writeFileSync(join(cfgDir, 'calorie.yaml'),
    'db:\n  dir: ' + JSON.stringify(dir) + '\n  name: calorie_data.db\nxunji:\n  stateDir: ' + JSON.stringify(join(dir, 'xunji-state')) + '\n',
    'utf8');
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  if (probe) {
    for (const [d, t, n] of PROBES) {
      db.prepare('INSERT INTO food_log (date,time,food_name,grams,calories,protein,carbs,fat) VALUES (?,?,?,100,300,10,30,10)').run(d, t, n);
    }
  }
  return { dir, db };
}

/** 一条词一次真跑（钉住当刻时钟；`params` 里给显式窗口）。 */
function run(dir, key, params, iso = PINNED_NOW) {
  const out = join(dir, 't717-out-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(dir), NODE_OPTIONS: '--require ' + FREEZE, FAKE_NOW_ISO: iso },
  });
  return { status: r.status, stderr: String(r.stderr), stdout: String(r.stdout), html: r.status === 0 ? readFileSync(out, 'utf8') : '' };
}

/** 页面上读得到的文本（去脚本／样式／标签）。 */
function visible(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

/** 餐别分布页明细表里「餐次」那一列的逐行计数。 */
function pageMealCounts(html) {
  const counts = {};
  const cells = [...html.matchAll(/<td[^>]*data-label="餐次"[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  for (const c of cells) counts[c] = (counts[c] ?? 0) + 1;
  return counts;
}

/** 诊断页「餐次结构」那条证据里的四桶次数。 */
function diagMealCounts(html) {
  const i = html.indexOf('餐次结构');
  assert.ok(i > 0, '诊断页面上找不到「餐次结构」那一条');
  const seg = html.slice(i, i + 600);
  const counts = {};
  for (const m of seg.matchAll(/(早餐|午餐|晚餐|加餐\/夜宵)\s+(\d+)\s*次/g)) counts[m[1]] = Number(m[2]);
  assert.equal(Object.keys(counts).length, 4, '诊断页「餐次结构」不是四桶：' + seg.slice(0, 200));
  return counts;
}

/** 配比页「推荐范围对比」表印出来的三对区间（从页面上读，不读内部件）。 */
function pageRanges(dir) {
  const r = run(dir, 'calorie.view.nutrition-ratio', { window: '7d' });
  assert.equal(r.status, 0, '配比页 exit=' + r.status + ' stderr=' + r.stderr.slice(-200));
  const text = visible(r.html);
  const at = text.indexOf('推荐范围对比');
  assert.ok(at > 0, '配比页上找不到「推荐范围对比」那张表');
  const seg = text.slice(at, at + 900);   // 表前另有说明段，窗口给足（截短会读到说明段里那个「共 7 天」）
  const out = {};
  for (const name of ['蛋白', '碳水', '脂肪']) {
    const m = new RegExp(name + '\\s+[\\d.]+\\s*克（[\\d.]+%）\\s+(\\d+)%（').exec(seg);
    assert.ok(m, '配比页「' + name + '」那一行的下限读不出来：' + seg.slice(0, 260));
    out[name] = Number(m[1]);
  }
  return { r, ranges: out };
}

test('#717 ① 同一份库、同一窗口：餐别分布页与诊断饮食结构页给出同样的餐次统计', () => {
  const { dir } = freshDb();
  const page = run(dir, 'calorie.view.diet', { window: '7d', meal: 'all' });
  assert.equal(page.status, 0, '餐别分布页真出口 exit=' + page.status + ' stderr=' + page.stderr.slice(-300));
  const diag = run(dir, 'calorie.view.anomaly', { kind: 'diet_structure', window: '7d' });
  assert.equal(diag.status, 0, '诊断页真出口 exit=' + diag.status + ' stderr=' + diag.stderr.slice(-300));

  const p = pageMealCounts(page.html);
  const d = diagMealCounts(diag.html);
  console.log('READING #717 ① 分布页=' + JSON.stringify(p) + ' 诊断页=' + JSON.stringify(d) + ' 窗口=' + START + ' 至 ' + END);
  assert.deepEqual(
    [p['早餐'], p['午餐'], p['晚餐'], p['加餐']],
    [d['早餐'], d['午餐'], d['晚餐'], d['加餐/夜宵']],
    '两页对同一份数据给出不同的餐次统计：分布页=' + JSON.stringify(p) + ' 诊断页=' + JSON.stringify(d));
  /* 三个分歧点各自落在哪一桶（把「同一条记录会不会换桶」钉在产物上）。 */
  const rows = [...page.html.matchAll(/<td[^>]*data-label="时间"[^>]*>(\d\d:\d\d)<\/td>[\s\S]{0,120}?data-label="餐次"[^>]*>([^<]*)</g)]
    .reduce((acc, m) => { acc[m[1]] = m[2]; return acc; }, {});
  assert.equal(rows['14:30'], '加餐', '14:30 那条没归加餐，实测=' + rows['14:30']);
  assert.equal(rows['21:30'], '晚餐', '21:30 那条没归晚餐，实测=' + rows['21:30']);
  assert.equal(rows['22:30'], '加餐', '22:30 那条没归加餐（夜宵），实测=' + rows['22:30']);
});

test('#717 ② 按窗删与归桶同一把尺子：22:30 那条归夜宵，删「夜宵」就删得掉它', () => {
  const { dir, db } = freshDb();
  const rows = db.prepare('SELECT time FROM food_log WHERE date = ? ORDER BY time').all('2026-09-04')
    .map((r) => String(r.time));
  db.close();
  /* 判据不写死小时数：**归桶说它属于哪一类，按窗删就该删掉那些行**（同一条判据的两面）。 */
  const expected = rows.filter((t) => inferMealType(t) === '夜宵');
  assert.ok(expected.includes('22:30:00'), '前提不成立：22:30 这条没被归成夜宵，实测=' + rows.map((t) => t + '→' + inferMealType(t)).join('、'));

  const r = run(dir, 'calorie.diet.remove-by-type', { mealType: '夜宵', date: '2026-09-04' });
  assert.equal(r.status, 0, '删一餐真出口 exit=' + r.status + ' stderr=' + r.stderr.slice(-300));
  const left = openDb(join(dir, 'calorie_data.db'));
  const after = left.prepare('SELECT time FROM food_log WHERE date = ? ORDER BY time').all('2026-09-04').map((x) => String(x.time));
  left.close();
  const deleted = rows.filter((t) => !after.includes(t));
  console.log('READING #717 ② 当天行=' + JSON.stringify(rows) + ' 删除=' + JSON.stringify(deleted));
  assert.deepEqual(deleted, expected, '「夜宵」删掉的行与归桶判成夜宵的行不是同一批');
});

test('#717 ③ 时间窗口径对外只有一份：五类餐的窗口 ＋ 夜宵跨零点 ＋ 加餐＝下午茶＋夜宵', () => {
  assert.deepEqual([...MEAL_WINDOWS['夜宵']], [22, 30],
    '夜宵窗没跨零点（收口前只写 0-6：22 点后的记录归成夜宵却不落进夜宵窗）：' + JSON.stringify(MEAL_WINDOWS['夜宵']));
  assert.deepEqual([...MEAL_WINDOWS['加餐']], [14, 18, 22, 30],
    '加餐窗不是「下午茶 ＋ 夜宵」：' + JSON.stringify(MEAL_WINDOWS['加餐']));
  /* 五个边界两侧各一个读数（6/10/14/18/22 是正本的边界；两套旧边界在这些点分岔）。 */
  const edges = [[5, '夜宵'], [6, '早餐'], [9, '早餐'], [10, '午餐'], [13, '午餐'], [14, '下午茶'], [17, '下午茶'], [18, '晚餐'], [21, '晚餐'], [22, '夜宵']];
  for (const [h, want] of edges) {
    const got = inferMealType(String(h).padStart(2, '0') + ':00:00');
    assert.equal(got, want, h + ' 点归成了 ' + got + '，应当是 ' + want);
  }
  assert.equal(inferMealType('22:30:00'), '夜宵', '22:30 没归夜宵');
  assert.equal(inferMealType('xx'), '其他', '读不出时间该归「其他」');
});

/* ── 批②：推荐区间与判决依据 ── */

test('#717 ④ 推荐区间只有一处：配比页印出来的区间 ＝ 诊断判决依据的那一套（含判决依赖它）', () => {
  const { dir } = freshDb();
  const { ranges } = pageRanges(dir);
  const unbal = run(dir, 'calorie.view.anomaly', { kind: 'diet_unbalanced', window: '7d' });
  assert.equal(unbal.status, 0, '诊断页 exit=' + unbal.status + ' stderr=' + unbal.stderr.slice(-200));
  const text = visible(unbal.html);
  const at = text.indexOf('三大营养占比');
  assert.ok(at > 0, '诊断页上找不到「三大营养占比」那一条');
  const evidence = text.slice(at, at + 260);
  console.log('READING #717 ④ 配比页区间=' + JSON.stringify(ranges) + ' ｜ 诊断证据句=' + evidence);

  const want = { 蛋白: 10, 碳水: 45, 脂肪: 20 };
  assert.deepEqual(ranges, want, '配比页印出来的区间不是有出处那一套：' + JSON.stringify(ranges));
  for (const [name, lo] of Object.entries(want)) {
    assert.ok(new RegExp(name + '\\s*' + lo + '\\s*[-–]').test(evidence),
      '诊断判决依据的「' + name + '」下限不是 ' + lo + '％（证据句：' + evidence + '）');
  }
});

/* ── 批③：钉钟后的三个日期 ── */

/* ── 批④：常数一处定义 ── */

test('#717 ⑥ 千卡↔体重常数只有一处：包门转出的 KCAL_PER_KG ＝ 7700，且源码里只剩一处定义', () => {
  console.log('READING #717 ⑥ KCAL_PER_KG=' + KCAL_PER_KG);
  assert.equal(KCAL_PER_KG, 7700, '包门转出的常数不是 7700：' + KCAL_PER_KG);
  /* 「只有一处」由结构门那条闭集账盯着（test/t717-防复发门.test.mjs 拉的门），
     本处只断**对外读数**与**源码里不再有裸字面**这两件事——不读内部件名、不数函数调用。 */
  const srcRoot = join(ROOT, 'packages', 'skill-calorie', 'src');
  const offenders = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!p.endsWith('.ts')) continue;
      const rel = p.slice(srcRoot.length + 1).replace(/\\/g, '/');
      if (rel === 'shared/kcalPerKg.ts') continue;
      /* 只看**代码**：去掉注释与字符串之外的写法不好判，故只认「除以／乘以 7700」这种算式形状。 */
      const code = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
      for (const m of code.matchAll(/[/\*]\s*7700\b/g)) offenders.push(rel + ' ' + m[0].trim());
    }
  };
  walk(srcRoot);
  assert.deepEqual(offenders, [], '还有地方在算式里写死 7700：' + JSON.stringify(offenders));
});

/* ── 批④：闭区间天数 vs 两点跨度 ── */

test('#717 ⑦ 两个日期口径各有其名：窗内天数按闭区间算，两点跨度不加 1（不合并）', () => {
  /* 判据取自**对外产物**：同一窗口页面上印的「共 N 天」＝含首末日；
     而「两点相隔多久」是另一件事（`daysBetween` 那两个日期之差），两者不可互相顶替。 */
  const { dir } = freshDb(false);
  const page = run(dir, 'calorie.view.diet', { window: '7d', meal: 'all' });
  assert.equal(page.status, 0, '餐别分布页 exit=' + page.status);
  const text = visible(page.html);
  /* 页头窗口条的形状：`2026-09-01 → 2026-09-07 7 天`（区间 → 天数）；天数那一格是闭区间含首末日。 */
  const m = /(\d{4}-\d{2}-\d{2})\s*→\s*(\d{4}-\d{2}-\d{2})\s*(\d+)\s*天/.exec(text);
  assert.ok(m, '页面上读不到窗口条的「区间 → 天数」：' + text.slice(0, 200));
  const span = Math.round((Date.parse(m[2]) - Date.parse(m[1])) / 86400000);
  console.log('READING #717 ⑦ 窗口条=' + m[0] + '（日期差 ' + span + ' 天，印出 ' + m[3] + ' 天）');
  assert.equal(Number(m[3]), span + 1, '窗口天数不是闭区间（含首末日）＝日期差＋1：' + m[0]);
  assert.equal(Number(m[3]), 7, '「最近 7 天」那一档印出的天数不是 7：' + m[0]);
});

test('#717 ⑤ 把当刻钉到某一天：落库日 ＝ 回执日 ＝ 累计读的那一天', () => {
  const { dir } = freshDb(false);
  const day = '2026-08-21';                       // 钉住日（与种子库那一段不同，便于分辨）
  const add = run(dir, 'calorie.diet.add', { foodName: '探针-钉钟', calories: 321, protein: 12 }, day + 'T12:00:00');
  assert.equal(add.status, 0, '记一餐 exit=' + add.status + ' stderr=' + add.stderr.slice(-200));
  const env = JSON.parse(add.stdout);

  const db = openDb(join(dir, 'calorie_data.db'));
  const row = db.prepare('SELECT date FROM food_log WHERE food_name = ?').get('探针-钉钟');
  db.close();
  /* 回执那一侧读**回执正文**（`data.message`），不读落盘文件名——文件名带的是命令名与当刻时分秒，
     与「这一天」不是一回事（本探针第一版就误按文件名找日期，实测文件名里没有日期）。 */
  const receiptText = String(env.data.message ?? '');
  console.log('READING #717 ⑤ 落库=' + JSON.stringify(row) + ' 回执=' + receiptText + ' 钉住日=' + day);

  assert.equal(row.date, day, '落库日不是被钉住的那一天：' + JSON.stringify(row));
  assert.ok(receiptText.includes(day), '回执正文不是被钉住的那一天：' + receiptText);
  const today = run(dir, 'calorie.today', { date: '今日' }, day + 'T12:00:00');
  assert.equal(today.status, 0, '看今日饮食 exit=' + today.status);
  assert.ok(visible(today.html).includes('探针-钉钟'), '累计读的那一天不是被钉住的那一天（今日饮食里没有刚记的那一条）');
});
