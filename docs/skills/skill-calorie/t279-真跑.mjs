/** #279 · 场景 02 饮食 · 83 条唤醒词的**共用跑法**（种子 ＋ 运行期总表取词 ＋ 真出口实跑）。
 *
 * 本件是 `packages/skill-calorie/test/t279-真出口用例.test.mjs`（判据）与
 * `node docs/skills/skill-calorie/t279-真跑.mjs`（可复跑脚本，出那张表）的**同一处定义**：
 * 种子的形状、占位符的替换、命令行的取法只有这一份，两边不许各写一套。
 *
 * 三条口径：
 *  ① **唤醒词与命令行从运行期总表取**：`dist/triggers/routes.generated.js` 的 `ALL_ROUTES`
 *     筛 `scene === '02'`，不手抄字面量。表里 `cli` 是 `calorie-cmd-read <命令> [--params '<json>']`，
 *     本件只做**词法切分 ＋ JSON 解析 ＋ 日期占位符替换**，不重写命令与参数。
 *  ② **每条跑前把库还原成同一份快照**（会改数据库的命令会写库，一条库从头跑到尾会把后面的读词打成取数失败），
 *     并把上一趟的产物目录清空 —— 这样「这一趟落没落盘」是干净的读数。
 *  ③ **落点用缺省**：不给 `--html`，走真出口的 `<SKILLS_DB_PATH>/calorie_html/<中文名>_<时刻>.html`，
 *     路径与字节从信封里读（`data.output`／`delivery.bytes`）。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// #676 · 卡路里技能侧的落点改成读配置文件（环境变量读取已删），本跑法跟着换隔离口；
// #763 · 隔离口再换成**家目录**（配置落 `<家目录>/.life/calorie.yaml`，`db.dir` 仍指传入的那个目录）：
// 测试侧同一个基座（`homeEnvOf(calorieConfigDir(dir))`），本件与判据件 `t279-真出口用例.test.mjs` 共用这一份。
import { calorieConfigDir, freezeClock, homeEnvOf } from '../../../packages/skill-calorie/test/helpers/config-test.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..', '..');
export const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
export const DB_FILE = 'calorie_data.db';
/** 产物子目录（`src/photo/helpPaths.ts:HELP_HTML_DIR_NAME`）。 */
export const HTML_DIR = 'calorie_html';

/** 钉住的「今天」（与 `docs/skills/skill-calorie/t280-真跑台账.md` 同一锚点，读数可并排看）。 */
export const TODAY = '2026-09-15';
export const YESTERDAY = '2026-09-14';

/** 表里 `cli` 的日期占位符 → 种子窗口内的真日子（`<日期>` 照 `docs/research/t81-seed.mjs` 取**昨日**）。 */
export const DATE_SUBSTITUTIONS = new Map([
  ['<日期>', YESTERDAY],
  ['<开始日期>', '2026-09-09'],
  ['<结束日期>', TODAY],
]);

export function isoShift(iso, days) {
  const t = Date.parse(iso + 'T12:00:00Z') + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/* ── 种子 ─────────────────────────────────────────────────────────────────── */

/** 10 种食物轮换（热量／蛋白／碳水／脂肪），只为让窗口里有真数据可算。 */
const FOODS = [
  ['燕麦', 100, 389, 13, 66, 7],
  ['鸡胸', 150, 200, 35, 2, 4],
  ['米饭', 200, 500, 10, 80, 5],
  ['粥', 300, 150, 3, 30, 2],
  ['苹果', 200, 100, 1, 25, 0],
  ['包子', 150, 300, 8, 50, 5],
  ['牛肉饭', 250, 620, 28, 70, 18],
  ['豆浆', 250, 90, 6, 8, 3],
  ['煎蛋', 60, 120, 8, 1, 9],
  ['酸奶', 150, 110, 5, 12, 3],
];

/** 一天四餐（时分落在 `MEAL_WINDOWS` 的四个窗里：早餐／午餐／下午茶＝加餐／晚餐）。 */
const SLOTS = [
  ['08:00:00', '早餐'],
  ['12:30:00', '午餐'],
  ['15:30:00', '下午茶'],
  ['19:00:00', '晚餐'],
];

/** 种子的覆盖面（报告与断言消息共用这一份说明）。 */
export const SEED_COVER = [
  '饮食记录：' + TODAY + ' 往前 75 天 × 每天四餐（早餐／午餐／下午茶／晚餐）',
  '窗口：当日／昨日／本周／上周／本月／上月／最近 7 天／最近 30 天／最近 90 天／今年／自定义区间',
  '餐别：早餐／午餐／晚餐／加餐（下午茶）／全部餐别',
  '备注：当日午餐＝「煎的，少油」；昨日晚餐＝「食堂」',
  '食品库：10 条 6 个分类，含 2 组同名近重复（供去重报告）',
  '饮水：当日 3 条＋昨日 1 条＋8 天前 1 条',
  '体脂 2 条＋围度 2 条＋体重 4 条＋档案 1 条＋目标 1 条',
];

/**
 * 播一份够用的种子（只写库文件，不落仓内件）。
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function makeSeed(db) {
  let n = 0;
  const run = (sql, ...args) => { db.prepare(sql).run(...args); n += 1; };

  run("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', 't279')");
  run("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, '2026-12-31', 300)");

  /* 饮食：75 天 × 四餐，10 种食物轮换；两条带备注（当日午餐／昨日晚餐）。 */
  const insMeal = 'INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  for (let i = 0; i < 75; i += 1) {
    const date = isoShift(TODAY, -i);
    for (const [k, [time, slot]] of SLOTS.entries()) {
      const [name, g, cal, p, cb, f] = FOODS[(i * 4 + k) % FOODS.length];
      let note = null;
      if (date === TODAY && slot === '午餐') note = '煎的，少油';
      if (date === YESTERDAY && slot === '晚餐') note = '食堂';
      run(insMeal, date, time, name, g, cal, p, cb, f, note);
    }
  }

  /* 饮水（`food_log` 内 name='💧水'，`src/fetch/diet.ts` 口径）。 */
  const insWater = "INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, '💧水', ?, 0, 0, 0, 0)";
  for (const [d, t, ml] of [[TODAY, '09:00:00', 300], [TODAY, '14:00:00', 500], [TODAY, '20:00:00', 400], [YESTERDAY, '10:00:00', 1500], [isoShift(TODAY, -8), '10:00:00', 1200]]) {
    run(insWater, d, t, ml);
  }

  /* 体脂（皮褶钳）＋围度＋体重。 */
  for (const [d, pct] of [[TODAY, 18.9], [YESTERDAY, 19.2]]) {
    run('INSERT INTO body_composition (date, source, body_fat_pct, caliper_chest_mm, caliper_abdominal_mm, caliper_thigh_mm, caliper_tricep_mm, caliper_subscapular_mm, caliper_suprailiac_mm, caliper_midaxillary_mm) VALUES (?, ?, ?, 10, 12, 14, 11, 13, 12, 10)', d, 'home_caliper', pct);
  }
  for (const [d, waist, hip] of [[TODAY, 84, 94], [YESTERDAY, 84.5, 94.5]]) {
    run('INSERT INTO body_measurements (date, waist_cm, hip_cm) VALUES (?, ?, ?)', d, waist, hip);
  }
  for (const [d, w] of [[TODAY, 74.2], [YESTERDAY, 74.3], [isoShift(TODAY, -15), 75.0], [isoShift(TODAY, -40), 75.6]]) {
    run('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)', d, '07:00:00', w);
  }

  /* 食品库：10 条 6 个分类，含 2 组同名近重复（看去重报告要有东西可报）。 */
  const insProduct = 'INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  for (const [name, brand, cal, p, f, cb, na, cat] of [
    ['鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类'],
    ['鸡胸肉', '测试', 170, 30, 4.0, 0, 72, '蛋白类'],
    ['鸡蛋', '测试', 144, 13, 9.5, 1.1, 131, '蛋白类'],
    ['米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食类'],
    ['米饭', '测试', 133, 2.6, 0.4, 28.6, 1, '主食类'],
    ['燕麦', '测试', 389, 13, 7, 66, 5, '主食类'],
    ['橄榄油', '测试', 884, 0, 100, 0, 2, '脂肪类'],
    ['西兰花', '测试', 34, 2.8, 0.4, 7, 33, '蔬菜类'],
    ['牛奶', '测试', 54, 3, 3.2, 3.4, 44, '乳品类'],
    ['苹果', '测试', 52, 0.3, 0.2, 14, 1, '水果类'],
  ]) {
    run(insProduct, name, brand, cal, p, f, cb, na, cat, '测试');
  }
  return n;
}

/** 建一份播种快照（返回库文件路径）。 */
export function buildSnapshot(dir, openDb) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, DB_FILE);
  rmSync(file, { force: true });
  const db = openDb(file);
  const rows = makeSeed(db);
  db.close();
  return { file, rows, bytes: statSync(file).size };
}

/** 每条跑前的还原：库覆盖回快照。
 *
 *  **产物目录不清**：清了的话「这一趟落没落盘」会随下一趟的还原一起消失，判据①的「文件真落盘」
 *  就成了「最后一趟还活着」。改记**这一趟新增的件**（跑前清单 → 跑后清单取差集），产物留盘供复看。 */
export function restore(dir, snapshotFile) {
  mkdirSync(dir, { recursive: true });
  copyFileSync(snapshotFile, join(dir, DB_FILE));
}

export function productFiles(dir) {
  const p = join(dir, HTML_DIR);
  if (!existsSync(p)) return [];
  return readdirSync(p);
}

/* ── 运行期总表 ───────────────────────────────────────────────────────────── */

const routesMod = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routes.generated.js')).href);

/** 词法切分：单引号／双引号成对，空格分列（与 `docs/research/t81-seed.mjs:tokenize` 同法）。 */
export function tokenize(cli) {
  const out = [];
  let cur = '';
  let q = null;
  for (const ch of String(cli)) {
    if (q) { if (ch === q) q = null; else cur += ch; } else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** `calorie-cmd-read <命令> [--params '<json>']` → `{key, params}`。 */
export function parseCli(cli) {
  const toks = tokenize(cli);
  const key = toks[1];
  const i = toks.indexOf('--params');
  const params = i >= 0 ? JSON.parse(toks[i + 1]) : null;
  return { key, params };
}

/** 参数里的日期占位符 → 真日子（逐字替换，其余一字不动）。 */
export function substituteDates(v) {
  if (typeof v === 'string') {
    let s = v;
    for (const [ph, real] of DATE_SUBSTITUTIONS) s = s.split(ph).join(real);
    return s;
  }
  if (Array.isArray(v)) return v.map(substituteDates);
  if (v !== null && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = substituteDates(x);
    return o;
  }
  return v;
}

/** 当刻运行期总表里 `scene === '02'` 的**每一条**（顺序即总表顺序）。 */
export function scene02Routes() {
  return routesMod.ALL_ROUTES.filter((r) => r.scene === '02').map((r) => {
    const { key, params } = parseCli(r.cli);
    return { wakeWord: r.wakeWord, key, params: substituteDates(params), cli: r.cli };
  });
}

/** 总表里的全部条数（供「83 是当刻读数」这条口径对账）。 */
export function totalRoutes() { return routesMod.ALL_ROUTES.length; }

/* ── 真出口 ───────────────────────────────────────────────────────────────── */

/**
 * 跑一条命令（缺省不给 `--html`，产物落 `<配置 db.dir>/calorie_html/`）。
 * @returns {{status:number|null, stdout:string, stderr:string, env:any, out:string|null, bytes:number|null, html:string}}
 */
export function runCli(dir, key, params, env = {}) {
  const args = [CLI, key];
  if (params !== null && params !== undefined) args.push('--params', JSON.stringify(params));
  const r = spawnSync(process.execPath, args, {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(TODAY), ...env },
  });
  let parsed = null;
  try { parsed = JSON.parse(String(r.stdout || '').trim()); } catch { parsed = null; }
  const out = parsed?.data?.output ?? null;
  return {
    status: r.status,
    stdout: String(r.stdout || ''),
    stderr: String(r.stderr || '').trim(),
    env: parsed,
    out,
    bytes: parsed?.delivery?.bytes ?? null,
    html: out !== null && existsSync(out) ? readFileSync(out, 'utf8') : '',
  };
}

/** 一条词的读数（还原快照 → 实跑 → 读盘）。`produced` ＝ 这一趟**新增**的产物件。 */
export function readOne(dir, snapshotFile, route, paramsOverride) {
  restore(dir, snapshotFile);
  const 跑前 = productFiles(dir);
  const params = paramsOverride === undefined ? route.params : paramsOverride;
  const r = runCli(dir, route.key, params);
  const onDisk = r.out !== null && existsSync(r.out);
  return {
    ...route,
    usedParams: params,
    status: r.status,
    stderr: r.stderr,
    out: r.out,
    reportedBytes: r.bytes,
    diskBytes: onDisk ? statSync(r.out).size : 0,
    html: r.html,
    produced: productFiles(dir).filter((f) => !跑前.includes(f)),
  };
}

/** 空窗／空库这类「换一套参数再跑一遍」的读数。 */
export function readWith(dir, snapshotFile, key, params) {
  restore(dir, snapshotFile);
  const 跑前 = productFiles(dir);
  const r = runCli(dir, key, params);
  const onDisk = r.out !== null && existsSync(r.out);
  return {
    key, usedParams: params, status: r.status, stderr: r.stderr, out: r.out,
    reportedBytes: r.bytes, diskBytes: onDisk ? statSync(r.out).size : 0,
    html: r.html, produced: productFiles(dir).filter((f) => !跑前.includes(f)),
  };
}

/* ── 库面读数（写类词要用的「写前／写后」） ───────────────────────────────── */

export function openDirDb(dir, openDb) { return openDb(join(dir, DB_FILE)); }
export function countOf(dir, openDb, table) {
  const db = openDirDb(dir, openDb);
  const n = db.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n;
  db.close();
  return Number(n);
}
export function rowOf(dir, openDb, table, id) {
  const db = openDirDb(dir, openDb);
  const r = db.prepare('SELECT * FROM ' + table + ' WHERE id = ?').get(id) ?? null;
  db.close();
  return r;
}
/** 走一次写类词：还原 → 记写前 → 实跑 → 记写后。 */
export function readWrite(dir, snapshotFile, route, openDb) {
  restore(dir, snapshotFile);
  const 跑前 = productFiles(dir);
  const before = { food_log: countOf(dir, openDb, 'food_log'), nutrition_products: countOf(dir, openDb, 'nutrition_products') };
  const r = runCli(dir, route.key, route.params);
  const after = { food_log: countOf(dir, openDb, 'food_log'), nutrition_products: countOf(dir, openDb, 'nutrition_products') };
  return {
    ...route, status: r.status, stderr: r.stderr, out: r.out, reportedBytes: r.bytes,
    diskBytes: r.out !== null && existsSync(r.out) ? statSync(r.out).size : 0,
    html: r.html, before, after, produced: productFiles(dir).filter((f) => !跑前.includes(f)),
    foodRow1: rowOf(dir, openDb, 'food_log', 1),
    productRow1: rowOf(dir, openDb, 'nutrition_products', 1),
  };
}

/* ── 完整文档／可见文本（判据与探针共用一处定义） ───────────────────────────── */

/** 完整文档的四条硬事实：第 0 字节是 `<!doctype html>` ＋ charset ＋ 内联样式段 ＋ `</html>` 收尾。 */
export function completeDoc(html) {
  return typeof html === 'string'
    && html.startsWith('<!doctype html>')
    && html.includes('<meta charset="utf-8">')
    && html.includes('<style>')
    && html.trimEnd().endsWith('</html>');
}
/** 剥掉脚本／样式／标签后的可见文本（判空态句与引导句用）。 */
export function visible(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── 两态：空库（整表零行）／空窗（库有底、窗口内零记录） ─────────────────────── */

/** 空窗用的替代参数：保留本条的类别／条数／餐别／入口，只把窗口挪到无记录区间。 */
export const EMPTY_WINDOW = { window: 'custom', start: '2000-01-01', end: '2000-01-31' };
export function emptyWindowParams(params) {
  return { ...(params ?? {}), ...EMPTY_WINDOW };
}
/** 本条是不是「带窗口」的读命令（窗口为空那条裁定管的就是这一族）。 */
export function isWindowRoute(route) {
  return route.params !== null && Object.prototype.hasOwnProperty.call(route.params, 'window');
}

/** 写类词的两条判据：命令登记为会改数据库的命令，或参数带写前确认／校验入口。 */
export const PRECHECK_ENTRIES = ['precheck', 'validate'];
export function isPrecheckRoute(route) {
  return route.params !== null && PRECHECK_ENTRIES.includes(route.params.entry);
}
const writeKeysMod = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'keys.js')).href);
export const WRITE_KEYS = writeKeysMod.CALORIE_WRITE_COMBOS;
export function isWriteRoute(route) {
  return Object.prototype.hasOwnProperty.call(WRITE_KEYS, route.key) || isPrecheckRoute(route);
}

/** 空态句的形状（不钉整句文案：`t425` 裁定 11 —— 钉形状、不钉人话）。 */
export const EMPTY_RE = /(没有记录|没有[^。；！？]{0,24}记录|一条[^。；！？]{0,24}也没有|本窗没有)/;
/** 引导句的形状：一句「怎么记第一条」的话，点名一个饮食记录类唤醒词（或一句记法）。 */
export const GUIDE_RE = /(?:先用?「|可以用「|用「|说「|只要说「)[^」]{1,20}」|怎么记第一条|补以前的日期/;

/** 建一份「有表、零行」的空库快照。 */
export function buildEmptySnapshot(dir, openDb) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, DB_FILE);
  rmSync(file, { force: true });
  const db = openDb(file);
  db.close();
  return { file, rows: 0, bytes: statSync(file).size };
}

/* ── 可复跑脚本的入口（被 import 时不跑） ───────────────────────────────────── */

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
  const scratch = join(ROOT, '.scratch', 't279');
  mkdirSync(scratch, { recursive: true });

  const snap = buildSnapshot(join(scratch, 'snapshot'), openDb);
  const emptySnap = buildEmptySnapshot(join(scratch, 'snapshot-empty'), openDb);
  const dir = join(scratch, 'db');
  const routes = scene02Routes();
  console.log('种子快照 ' + snap.bytes + ' B（' + snap.rows + ' 次写）；空库快照 ' + emptySnap.bytes + ' B');
  console.log('运行期总表 ' + totalRoutes() + ' 条，其中场景 02 共 ' + routes.length + ' 条；带窗口读命令 ' + routes.filter(isWindowRoute).length + ' 条');

  const 甲 = [];
  for (const [i, route] of routes.entries()) {
    const r = readOne(dir, snap.file, route);
    const doc = r.html;
    甲.push({
      n: i + 1, 唤醒词: route.wakeWord, 命令: route.key,
      参数: route.params === null ? '' : JSON.stringify(route.params),
      exit: r.status, 产物: r.out, 字节: r.reportedBytes, 盘上字节: r.diskBytes,
      产物件数: r.produced.length,
      完整文档: doc.startsWith('<!doctype html>') && doc.includes('<meta charset="utf-8">')
        && doc.includes('<style>') && doc.trimEnd().endsWith('</html>'),
      stderr: r.stderr,
    });
    console.log('甲 ' + (i + 1) + '/' + routes.length + ' ' + route.wakeWord + ' exit=' + r.status + ' bytes=' + r.reportedBytes);
  }

  const 乙 = [];
  for (const [i, route] of routes.entries()) {
    const r = readOne(dir, emptySnap.file, route);
    乙.push({
      n: i + 1, 唤醒词: route.wakeWord, 命令: route.key,
      参数: route.params === null ? '' : JSON.stringify(route.params),
      exit: r.status, 产物: r.out, 字节: r.reportedBytes, 产物件数: r.produced.length, stderr: r.stderr,
    });
    if (r.status !== 4) console.log('乙(空库) ' + (i + 1) + '/' + routes.length + ' ' + route.wakeWord + ' exit=' + r.status);
  }

  const 丙 = [];
  for (const route of routes.filter(isWindowRoute)) {
    const r = readOne(dir, snap.file, route, emptyWindowParams(route.params));
    const text = visible(r.html);
    丙.push({
      唤醒词: route.wakeWord, 命令: route.key, 参数: JSON.stringify(emptyWindowParams(route.params)),
      exit: r.status, 产物: r.out, 字节: r.reportedBytes, 产物件数: r.produced.length, stderr: r.stderr,
      完整文档: completeDoc(r.html), 空态命中: EMPTY_RE.test(text), 引导命中: GUIDE_RE.test(text),
    });
    console.log('丙 ' + route.wakeWord + ' exit=' + r.status + ' 完整=' + completeDoc(r.html)
      + ' 空态=' + EMPTY_RE.test(text) + ' 引导=' + GUIDE_RE.test(text));
  }

  /* 丁 · 写类词：写前／写后库面读数（会改数据库的命令 ＋ 带写前确认入口的 4 条词）。 */
  const 丁 = [];
  for (const route of routes.filter(isWriteRoute)) {
    const r = readWrite(dir, snap.file, route, openDb);
    const text = visible(r.html);
    丁.push({
      唤醒词: route.wakeWord, 命令: route.key, 参数: route.params === null ? '' : JSON.stringify(route.params),
      入口: route.params?.entry ?? '', exit: r.status, 产物: r.out, 字节: r.reportedBytes, stderr: r.stderr,
      写前: r.before, 写后: r.after,
      目标行: route.key.startsWith('calorie.product') ? r.productRow1 : r.foodRow1,
      预检徽章: text.includes('预检确认'), 操作回执: text.includes('✅ 操作回执'),
      字段变更: text.includes('📋 字段变更'), 改前改后对照: text.includes('改前 → 改后对照'),
      删除前原值: text.includes('删除前的原值（逐条）'), 本次结果: text.includes('本次结果'),
    });
    console.log('丁 ' + route.wakeWord + ' exit=' + r.status + ' 饮食 ' + r.before.food_log + '→' + r.after.food_log
      + ' 食品 ' + r.before.nutrition_products + '→' + r.after.nutrition_products);
  }

  writeFileSync(join(scratch, 't279-真跑.json'), JSON.stringify({
    批次: 't279 · 场景 02 饮食 · 真出口逐条实跑',
    基线: process.env.T279_BASELINE ?? '',
    锚点: TODAY, 快照字节: snap.bytes, 播种条数: snap.rows,
    条数: routes.length, 甲_有数据: 甲, 乙_空库: 乙, 丙_空窗: 丙, 丁_写类: 丁,
  }, null, 1), 'utf8');

  const ok甲 = 甲.filter((r) => r.exit === 0).length;
  const ok乙 = 乙.filter((r) => r.exit === 0).length;
  const ok丙 = 丙.filter((r) => r.exit === 0).length;
  console.log('=== 甲 有数据：' + 甲.length + ' 条，exit 0 共 ' + ok甲 + '；完整文档 ' + 甲.filter((r) => r.完整文档).length);
  console.log('=== 乙 空库：exit 0 共 ' + ok乙 + '（其余 ' + (乙.length - ok乙) + ' 条按设计 exit 4）');
  console.log('=== 丙 空窗：' + 丙.length + ' 条，exit 0 共 ' + ok丙 + '；空态＋引导都命中 ' + 丙.filter((r) => r.空态命中 && r.引导命中).length);
  console.log('=== 丁 写类：' + 丁.length + ' 条，exit 0 共 ' + 丁.filter((r) => r.exit === 0).length);
}

