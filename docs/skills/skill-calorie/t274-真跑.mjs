/** #274 · 食品库类页（4 条命令 / 8 条唤醒词）**真出口**取证 · 可复跑。
 *
 * 跑法：`node docs/skills/skill-calorie/t274-真跑.mjs`（先 `npx tsc -b packages/base-render packages/skill-calorie`）
 * 日志：`.scratch/t274/真跑.log`（`*>` 重定向），本文件只把机读行打到 stdout。
 *
 * 它做什么：
 *   ① 开一个系统 tmp 里的播种库（5 条在架食品：含 1 组同名同品牌重复、1 条缺来源、1 条缺分类）；
 *   ② 从 **路由层自己**（`dist/triggers/routes.generated.js` 的 `ALL_ROUTES`）筛出 `scene === '02'`
 *      且落在本票四条命令上的唤醒词，**命令原文逐字取自路由记录的 `cli` 列**（不手抄、不猜参数）；
 *   ③ 逐条 spawn `dist/cli/cmd_read.js`（唯一出口），读回执里的绝对路径，核对产物：字节数、
 *      `<!doctype html>` 是否在第 0 字节、charset／样式段／整页容器齐不齐；
 *   ④ 再对**空库**跑同一批命令，取证设计行为 `exit 4 ＋ ERR 4: 取数失败（缺失阻断）`。
 *
 * 一行一个词：`WORD <唤醒词> key=<命令> exit=<码> path=<绝对路径> bytes=<字节> doctype=<yes/no>`
 * 空库一行：   `EMPTY <命令> exit=<码> stderr=<首 80 字>`
 * 末行：       `RESULT: n/n …`（供复核只读摘要）
 *
 * 只读老实物目录 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\`，不执行其中任何脚本。
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { ALL_ROUTES } = await import(
  pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routes.generated.js')).href
);

/** 本票的四条命令（`src/diet/commands.ts` 声明，装配件见 `src/diet/libraryDocs.ts`／`sourceStatsDocs.ts`）。 */
const KEYS = [
  'calorie.view.search',
  'calorie.view.library',
  'calorie.view.dedupe',
  'calorie.view.source-stats',
];

/** 播种：5 条在架食品，覆盖卡片格四种字段态（有类别／缺类别、有品牌／缺品牌、有来源／缺来源）。 */
function seedProducts(db) {
  db.prepare(
    "INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')",
  ).run();
  const rows = [
    ['鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '包装'],
    ['米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '自制'],
    ['米饭', '测试', 131, 2.8, 0.3, 28, 1, '主食', '复核'],
    ['苹果', '果园', 52, 0.3, 0.2, 14, 1, '', '自制'],
    ['牛奶', '牧场', 54, 3, 3.2, 3.4, 40, '乳制品', ''],
  ];
  const st = db.prepare(
    'INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source)'
    + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (const r of rows) st.run(...r);
}

/** 路由记录的 `cli` 列 → argv（`calorie-cmd-read <命令> [--params '<json>']`，与声明逐字一致）。 */
function argvOf(cli) {
  const m = /^calorie-cmd-read (calorie\.[a-z0-9.-]+)(?: --params '(\{.*\})')?$/.exec(cli);
  if (!m) throw new Error('路由 cli 列不合形状：' + cli);
  return m[2] === undefined ? [m[1]] : [m[1], '--params', m[2]];
}

function run(dir, cli) {
  const r = spawnSync(process.execPath, [CLI, ...argvOf(cli)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let out = null;
  try { out = JSON.parse(String(r.stdout).trim()); } catch { out = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr).trim(), out };
}

/** 产物三档里的第①档与第②档的一半：存在 ＋ 完整文档（视觉留给负责人肉眼）。 */
function inspect(path) {
  const bytes = statSync(path).size;
  const html = readFileSync(path, 'utf8');
  const full = html.startsWith('<!doctype html>')
    && html.includes('charset="utf-8"')
    && html.includes('<style>')
    && html.includes('ilife-page')
    && !html.includes('<!--');
  return { bytes, doctype: html.startsWith('<!doctype html>') ? 'yes' : 'no', full };
}

const DIR = mkdtempSync(join(tmpdir(), 't274-live-'));
{
  const db = openDb(join(DIR, 'calorie_data.db'));
  seedProducts(db);
  db.close();
}

const ROUTES = ALL_ROUTES.filter((r) => r.scene === '02' && KEYS.includes(r.key))
  .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.order - b.order));

console.log('== 四条命令各有哪些 scene=02 唤醒词（逐字抄自 routes.generated.js）==');
for (const k of KEYS) {
  const ws = ROUTES.filter((r) => r.key === k);
  console.log('CMD ' + k + ' 词数=' + ws.length + ' 词=' + ws.map((r) => '「' + r.wakeWord + '」').join('')
    + (ws[0] ? ' cli=' + ws[0].cli : ''));
}

console.log('== 有库真跑 ==');
let ok = 0;
for (const r of ROUTES) {
  const res = run(DIR, r.cli);
  const path = res.out && res.out.data && typeof res.out.data.output === 'string' ? res.out.data.output : '(无落点)';
  let bytes = 0;
  let doctype = 'no';
  let full = false;
  if (res.status === 0 && path !== '(无落点)') {
    const info = inspect(path);
    bytes = info.bytes;
    doctype = info.doctype;
    full = info.full;
  }
  if (res.status === 0 && full) ok += 1;
  console.log('WORD ' + r.wakeWord + ' key=' + r.key + ' exit=' + res.status + ' path=' + path
    + ' bytes=' + bytes + ' doctype=' + doctype + ' 完整文档=' + (full ? 'yes' : 'no'));
}
console.log('RESULT: ' + ok + '/' + ROUTES.length + ' 条 exit 0 且产物是完整文档');

console.log('== 干净库真跑（有命令、库非空、窗口内零重复 ⇒ 出完整页 ＋ 空态句 ＋ 引导句）==');
const CLEAN = mkdtempSync(join(tmpdir(), 't274-clean-'));
{
  const db = openDb(join(CLEAN, 'calorie_data.db'));
  db.prepare(
    'INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source)'
    + " VALUES ('苹果', '测试', 52, 0.3, 0.2, 14, 1, '水果', '自制')",
  ).run();
  db.close();
}
{
  const res = run(CLEAN, 'calorie-cmd-read calorie.view.dedupe');
  const path = res.out && res.out.data && typeof res.out.data.output === 'string' ? res.out.data.output : '(无落点)';
  const html = res.status === 0 && path !== '(无落点)' ? readFileSync(path, 'utf8') : '';
  const info = html === '' ? { bytes: 0, full: false } : inspect(path);
  console.log('CLEAN calorie.view.dedupe exit=' + res.status + ' path=' + path + ' bytes=' + info.bytes
    + ' 完整文档=' + (info.full ? 'yes' : 'no')
    + ' 空态块=' + (html.includes('ilife-block-empty') ? 'yes' : 'no')
    + ' 空态句=' + (html.includes('没有重复食品') ? 'yes' : 'no')
    + ' 引导句=' + (html.includes('无需处理') ? 'yes' : 'no')
    + ' 建议行=' + (html.includes('处理建议') ? 'yes' : 'no'));
}

console.log('== 空库真跑（设计行为：缺失阻断，不是失败）==');
const EMPTY = mkdtempSync(join(tmpdir(), 't274-empty-'));
openDb(join(EMPTY, 'calorie_data.db')).close();
let blocked = 0;
for (const r of ROUTES) {
  const res = run(EMPTY, r.cli);
  if (res.status === 4 && res.stderr.includes('ERR 4: 取数失败（缺失阻断）')) blocked += 1;
  console.log('EMPTY ' + r.key + ' exit=' + res.status + ' stdout空=' + (res.stdout === '' ? 'yes' : 'no')
    + ' stderr=' + res.stderr.slice(0, 80));
}
console.log('RESULT-EMPTY: ' + blocked + '/' + ROUTES.length + ' 条 exit 4 ＋ 缺失阻断');
console.log('TMPDIR ' + DIR + ' ｜ 空库 ' + EMPTY);
