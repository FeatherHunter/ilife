/** #275 · 营养／饮水／总览页 4 条词的可复跑脚本（真出口）。
 *
 * 跑法（在仓根）：
 *   npx tsc -b packages/base-link-core packages/base-render packages/skill-calorie
 *   node docs/skills/skill-calorie/t275-真跑.mjs
 *
 * 它做三件事，读数落 `.scratch/t275/`：
 *   ① 四条票面唤醒词各跑一次真出口（`calorie-cmd-read <键> --params <json>`），打印
 *      **exit ／ 绝对路径 ／ 字节数 ／ 是否完整文档**，HTML 落 `.scratch/t275/real/`（双击即开）；
 *   ② **空库**那一态：一个没有数据的库跑五条读命令 ⇒ 一律 `exit 4` ＋ `ERR 4: 取数失败（缺失阻断）`、
 *      不落盘（`t425` 裁定 4 的 2026-09-15 澄清：这是既有设计行为）；
 *   ③ **窗口为空**那一态：有数据的库换到一段零记录的窗口 ⇒ 完整页 ＋ 空态句 ＋ 引导句。
 *
 * 四条词与参数**逐字取路由层的现值**（`src/diet/routes.ts` 与 `src/home/routes.ts` 的 `scene:'02'` 记录，
 * 见脚本里的 `WORDS`）；路由一改，这里跟着红——它不做路径推断、不编参数。
 *
 * 只写 `.scratch/t275/`，不碰任何仓内源码与产物目录。
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, '.scratch', 't275');
const REAL = join(OUT, 'real');
const LOG = join(OUT, 't275-真跑.log');

if (!existsSync(CLI)) {
  console.error('先编译：npx tsc -b packages/base-link-core packages/base-render packages/skill-calorie');
  process.exit(2);
}
rmSync(REAL, { recursive: true, force: true });
mkdirSync(REAL, { recursive: true });

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const D = SEED_TODAY; // 2026-09-07（种子锚点）
const EMPTY_WINDOW = { window: 'custom', start: '2020-01-01', end: '2020-01-07' };

/** 票面四条唤醒词（路由现值逐字）：
 *   · 看营养结构／看今日营养 → `calorie.view.diet-review`（页归 #273，本票交配比区块）
 *   · 看今日喝水           → `calorie.view.today-water`（页归本票）
 *   · 看饮食总览           → `calorie.view.diet`（页归 #271，本票交总览区块） */
const WORDS = [
  { word: '看营养结构', key: 'calorie.view.diet-review', params: { window: '7d' }, from: 'src/diet/routes.ts:46' },
  { word: '看今日营养', key: 'calorie.view.diet-review', params: { window: '今日' }, from: 'src/diet/routes.ts:47' },
  { word: '看今日喝水', key: 'calorie.view.today-water', params: { date: D, entry: 'drink' }, from: 'src/diet/routes.ts:35' },
  { word: '看饮食总览', key: 'calorie.view.diet', params: { window: '7d' }, from: 'src/home/routes.ts:27' },
];

/** 两态判据要看的五条读命令（本票四条 ＋ 同一件里的「查营养配比」「看营养素深度」两条）。 */
const TWO_STATE = [
  ...WORDS.map((w) => ({ id: w.word, key: w.key, params: w.params })),
  { id: '查营养配比', key: 'calorie.view.nutrition-ratio', params: EMPTY_WINDOW },
  { id: '看营养素深度', key: 'calorie.view.nutrition-detail', params: EMPTY_WINDOW },
];

const lines = [];
const say = (s) => { lines.push(s); console.log(s); };

function run(dir, key, params, outPath) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', outPath], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: D },
  });
  const existed = existsSync(outPath);
  const html = r.status === 0 && existed ? readFileSync(outPath, 'utf8') : '';
  return {
    status: r.status, stderr: String(r.stderr).trim(), outPath, existed,
    bytes: r.status === 0 && existed ? statSync(outPath).size : 0, html,
  };
}

/** 一个装好种子的库 + 一个空库。 */
const seedDir = join(REAL, 'db-seed');
const emptyDir = join(REAL, 'db-empty');
mkdirSync(seedDir, { recursive: true });
mkdirSync(emptyDir, { recursive: true });
{ const db = openDb(join(seedDir, 'calorie_data.db')); seedFull(db); db.close(); }
openDb(join(emptyDir, 'calorie_data.db')).close();

say('#275 真跑 · ' + new Date().toISOString());
say('库（种子）：' + seedDir + '    库（空）：' + emptyDir);

say('\n## ① 四条票面唤醒词（真出口）');
for (const w of WORDS) {
  const outPath = join(REAL, 't275-' + w.word + '.html');
  const r = run(seedDir, w.key, w.params, outPath);
  const full = r.html.startsWith('<!doctype html>') && r.html.includes('<meta charset="utf-8">')
    && r.html.includes('<style>');
  say('· ' + w.word + '  [' + w.from + ']  ' + w.key + ' ' + JSON.stringify(w.params));
  say('    exit=' + r.status + '  绝对路径=' + r.outPath + '  字节=' + r.bytes
    + '  完整文档=' + (full ? '是' : '否') + (r.status === 0 ? '' : '  错误=' + r.stderr.split('\n').pop()));
}

say('\n## ② 空库那一态（设计行为：exit 4 ＋ ERR 4 · 取数失败（缺失阻断））');
for (const c of TWO_STATE) {
  const r = run(emptyDir, c.key, c.params, join(emptyDir, 'should-not-exist.html'));
  const tail = r.stderr.split('\n').pop() ?? '';
  say('· ' + c.id + '  exit=' + r.status + '  落盘=' + (r.existed ? '是（不该）' : '否')
    + '  ' + tail.slice(0, 120));
}

say('\n## ③ 窗口为空那一态（完整页 ＋ 空态句 ＋ 引导句）');
for (const c of TWO_STATE) {
  const p = c.key === 'calorie.view.today-water' ? { date: '2020-01-01', entry: 'drink' } : EMPTY_WINDOW;
  const outPath = join(REAL, 't275-空窗-' + c.id + '.html');
  const r = run(seedDir, c.key, p, outPath);
  const hit = /要让它有内容，先用「/.test(r.html);
  say('· ' + c.id + '  exit=' + r.status + '  ' + r.outPath + '  ' + r.bytes + ' B'
    + '  空态句=' + (/没有|也没有/.test(r.html) ? '有' : '无')
    + '  引导句=' + (hit ? '有' : '无／该页由别的票负责'));
}

writeFileSync(LOG, lines.join('\n') + '\n', 'utf8');
console.log('\n读数已落 ' + LOG);
