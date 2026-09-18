/** #717 批①·餐别归一 —— 交付面判据（守到「同一条命令对同一份输入给出什么产物」这条缝上）。
 *
 * **本件守什么**（每个 test 对应验收标准的一条）：
 *  ① **两页同一份餐次统计**：「餐别分布」页（`calorie.view.diet` ＋ `meal`）与「诊断饮食结构问题」页
 *     （`calorie.view.anomaly` ＋ `kind:"diet_structure"`）在**同一窗口、同一份库**上，四桶次数相等；
 *     分歧点三个（14:30／21:30／22:30）各一条记录。收口前实测：分布页 `{早餐 4, 午餐 4, 晚餐 2, 加餐 3}`，
 *     诊断 `{早餐 4, 午餐 5, 晚餐 2, 加餐/夜宵 2}`——同一条 14:30 记录在一边算加餐、另一边算午餐。
 *  ② **按窗删那一支与归桶同一把尺子**：`含 22:30 那一餐的记录 ⇒ 归夜宵 ⇒ 按餐别删「夜宵」删得掉它`
 *     （收口前夜宵窗只写 `0-6`，22 点后的记录归成夜宵却删不掉——自相矛盾）。
 *  ③ **时间窗只有一处正本**：`MEAL_WINDOWS` 的每一格都等于 `shared/meal.ts` 里那五类餐的窗口，
 *     夜宵跨零点（`[22, 30)`）；不再有第二套小时边界。
 *
 * **不断实现细节**：不断「某函数被调了几次」、不读源码字符串；① 断的是**命令产物**，
 * ②③ 断的是**包对外的门**转出的口径读数。
 *
 * 跑法：`node --test packages/skill-calorie/test/t717-口径归一.test.mjs`
 * （先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

process.env.ILIFE_CONFIG_DIR = mkdtempSync(join(tmpdir(), 't717-cfg-base-'));

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const FREEZE = join(HERE, 'freeze-clock.cjs');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
/* 时间窗口径走**既有对外读法**（`dist/fetch/diet.js` 的薄转出，包门 `fetch/index.ts` 也在转它），
   不新开第二条对外路径（#703「包门只许收窄」）：本件要看的正是「对外读到的窗口」这件事。 */
const { MEAL_WINDOWS, inferMealType } =
  await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'fetch', 'diet.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const START = '2026-09-01';
const END = SEED_TODAY;                 // 2026-09-07（种子锚点）
/** 三个分歧点：两套小时边界（正本 6/10/14/18/22 vs 诊断旧的 10/15/21）在这些时刻给出不同餐别。 */
const PROBES = [
  ['2026-09-02', '14:30:00', '探针-14:30'],
  ['2026-09-03', '21:30:00', '探针-21:30'],
  ['2026-09-04', '22:30:00', '探针-22:30'],
];

/** 一份隔离的库目录（配置在里、库在里），返回目录；`probe=true` 顺带落三条分歧点记录。 */
function freshDb(probe = true) {
  const dir = mkdtempSync(join(tmpdir(), 't717-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'calorie.yaml'),
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

/** 一条词一次真跑（钉住当刻时钟，参数里给显式窗口）。 */
function run(dir, key, params) {
  const out = join(dir, 't717-out-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env, ILIFE_CONFIG_DIR: dir,
      NODE_OPTIONS: '--require ' + FREEZE, FAKE_NOW_ISO: SEED_TODAY + 'T12:00:00',
    },
  });
  return { status: r.status, stderr: String(r.stderr), html: r.status === 0 ? readFileSync(out, 'utf8') : '' };
}

/** 餐别分布页明细表里「餐次」那一列的逐行值（走产物，不走内部件）。 */
function pageMealCounts(html) {
  const counts = {};
  const cells = [...html.matchAll(/<td[^>]*data-label="餐次"[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  for (const c of cells) counts[c] = (counts[c] ?? 0) + 1;
  return counts;
}

/** 诊断页「餐次结构」那条证据里的四桶次数（走产物，不走内部件）。 */
function diagMealCounts(html) {
  const i = html.indexOf('餐次结构');
  assert.ok(i > 0, '诊断页面上找不到「餐次结构」那一条');
  const seg = html.slice(i, i + 600);
  const counts = {};
  for (const m of seg.matchAll(/(早餐|午餐|晚餐|加餐\/夜宵)\s+(\d+)\s*次/g)) counts[m[1]] = Number(m[2]);
  assert.equal(Object.keys(counts).length, 4, '诊断页「餐次结构」不是四桶：' + seg.slice(0, 200));
  return counts;
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
  /* 三个分歧点各自落在哪一桶（这一句把「同一条记录会不会换桶」钉在产物上）。 */
  const rows = [...page.html.matchAll(/<td[^>]*data-label="时间"[^>]*>(\d\d:\d\d)<\/td>[\s\S]{0,120}?data-label="餐次"[^>]*>([^<]*)</g)]
    .reduce((acc, m) => { acc[m[1]] = m[2]; return acc; }, {});
  assert.equal(rows['14:30'], '加餐', '14:30 那条没归加餐，实测=' + rows['14:30']);
  assert.equal(rows['21:30'], '晚餐', '21:30 那条没归晚餐，实测=' + rows['21:30']);
  assert.equal(rows['22:30'], '加餐', '22:30 那条没归加餐（夜宵），实测=' + rows['22:30']);
});

test('#717 ② 按窗删与归桶同一把尺子：22:30 那条归夜宵，删「夜宵」就删得掉它', () => {
  const { dir, db } = freshDb();
  const rows = db.prepare("SELECT time FROM food_log WHERE date = ? ORDER BY time").all('2026-09-04')
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
