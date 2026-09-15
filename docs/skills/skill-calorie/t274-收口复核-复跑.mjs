/** 复核席自建：真出口复跑 8 条唤醒词 ＋ 四张产物两两不同 ＋ 空库 ／ 无命中两态。
 *  命令行逐字取自运行期总表 dist/triggers/routes.generated.js（ALL_ROUTES），不手抄。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 检出根：从本件所在目录往上找，第一个含 `packages/skill-calorie` 的目录。 */
function findRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(d, 'packages', 'skill-calorie', 'package.json'))) return d;
    d = dirname(d);
  }
  throw new Error('找不到检出根：' + from);
}
const ROOT = findRoot(HERE);
const OUT = join(ROOT, '.scratch', 't274g2');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { ALL_ROUTES } = await import(
  pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routes.generated.js')).href
);

const KEYS = [
  'calorie.view.search', 'calorie.view.library',
  'calorie.view.dedupe', 'calorie.view.source-stats',
];

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

function sha(p) { return createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16); }
function full(p) {
  const h = readFileSync(p, 'utf8');
  return h.startsWith('<!doctype html>') && h.includes('charset="utf-8"') && h.includes('<style>')
    && h.includes('ilife-page') && !h.includes('<!--');
}
function fresh(name) {
  const d = join(OUT, name);
  rmSync(d, { recursive: true, force: true });
  mkdirSync(join(d, 'calorie_html'), { recursive: true });
  return d;
}
function seed(dir, rows) {
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1,30,'male',175,'moderate')").run();
  const st = db.prepare('INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const r of rows) st.run(...r);
  db.close();
}

const SEED = [
  ['鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '包装'],
  ['米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '自制'],
  ['米饭', '测试', 131, 2.8, 0.3, 28, 1, '主食', '复核'],
  ['苹果', '果园', 52, 0.3, 0.2, 14, 1, '', '自制'],
  ['牛奶', '牧场', 54, 3, 3.2, 3.4, 40, '乳制品', ''],
];

const ROUTES = ALL_ROUTES.filter((r) => r.scene === '02' && KEYS.includes(r.key));
const art = [];

console.log('=== ① 有库真跑（8 条唤醒词，命令原文取自 ALL_ROUTES）===');
{
  const dir = fresh('live');
  seed(dir, SEED);
  let ok = 0;
  for (const r of ROUTES) {
    const res = run(dir, r.cli);
    const p = res.out && res.out.data && typeof res.out.data.output === 'string' ? res.out.data.output : '(无落点)';
    const isFull = res.status === 0 && p !== '(无落点)' && existsSync(p) ? full(p) : false;
    const bytes = isFull || (p !== '(无落点)' && existsSync(p)) ? statSync(p).size : 0;
    if (res.status === 0 && isFull) ok += 1;
    if (isFull) art.push({ word: r.wakeWord, key: r.key, path: p, bytes, sha: sha(p) });
    console.log(`WORD ${r.wakeWord} key=${r.key} exit=${res.status} bytes=${bytes} 完整文档=${isFull ? 'yes' : 'no'} ${p}`);
  }
  console.log(`RESULT-RUN: ${ok}/${ROUTES.length} 条 exit 0 且产物是完整文档`);
}

console.log('=== ③ 四张产物两两内容是否互不相同（去掉时间戳/文件名后比）===');
{
  const norm = (p) => readFileSync(p, 'utf8')
    .replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/g, '@T@')
    .replace(/\d{14}/g, '@TS@').replace(/_\d{6}(_\d+)?\.html/g, '@F@')
    .replace(/[0-9a-f]{16,64}/g, '@H@');
  const one = new Map();
  for (const a of art) if (!one.has(a.key)) one.set(a.key, a);
  const items = [...one.values()];
  const ns = items.map((a) => ({ ...a, nsha: createHash('sha256').update(norm(a.path)).digest('hex').slice(0, 16) }));
  const uniq = new Set(ns.map((a) => a.nsha));
  for (const a of ns) console.log(`ARTEFACT ${a.key} wake=${a.word} bytes=${a.bytes} 规范化sha=${a.nsha}`);
  const pairs = [];
  for (let i = 0; i < ns.length; i += 1) {
    for (let j = i + 1; j < ns.length; j += 1) pairs.push(`${ns[i].key}≠${ns[j].key}:${ns[i].nsha !== ns[j].nsha}`);
  }
  console.log('ARTEFACT-两两 ' + pairs.join(' '));
  console.log(`RESULT-DISTINCT: 跨命令两两互不相同=${uniq.size === KEYS.length ? 'yes' : 'no'} (${uniq.size}/${KEYS.length})`);
}

console.log('=== ①b 空库（库空）⇒ 设计行为 exit 4 ＋ 缺失阻断 ＋ 不落盘 ===');
{
  const dir = fresh('emptydb');
  openDb(join(dir, 'calorie_data.db')).close();
  let n = 0;
  for (const r of ROUTES) {
    const res = run(dir, r.cli);
    const p = res.out && res.out.data && typeof res.out.data.output === 'string' ? res.out.data.output : null;
    const landed = p !== null && existsSync(p);
    const hit = res.status === 4 && res.stderr.includes('ERR 4: 取数失败（缺失阻断）') && !landed;
    if (hit) n += 1;
    console.log(`EMPTY key=${r.key} wake=${r.wakeWord} exit=${res.status} stdout空=${res.stdout === '' ? 'yes' : 'no'} 落盘=${landed ? 'yes' : 'no'} stderr=${res.stderr.slice(0, 90)}`);
  }
  console.log(`RESULT-EMPTYDB: ${n}/${ROUTES.length} 条 exit 4 ＋ 缺失阻断 ＋ 不落盘`);
}

console.log('=== ② 库非空但本次查询零命中（窗口内零记录）=== 逐条看是否出完整页＋空态句＋引导句');
{
  const cases = [
    ['关键词零命中(查食品)', 'z-search', SEED, "calorie-cmd-read calorie.view.search --params '{\"keyword\":\"螺蛳粉\"}'", '螺蛳粉'],
    ['分类零命中(查食品按分类)', 'z-cat', SEED, "calorie-cmd-read calorie.view.library --params '{\"category\":\"海鲜类\"}'", '海鲜类'],
    ['去重干净库(库非空零重复)', 'z-clean', [['苹果', '测试', 52, 0.3, 0.2, 14, 1, '水果', '自制']], 'calorie-cmd-read calorie.view.dedupe', ''],
  ];
  for (const [name, sub, rows, cli, needle] of cases) {
    const dir = fresh(sub);
    seed(dir, rows);
    const r = run(dir, cli);
    const p = r.out && r.out.data && typeof r.out.data.output === 'string' ? r.out.data.output : null;
    const landed = p !== null && existsSync(p);
    const html = landed ? readFileSync(p, 'utf8') : '';
    console.log(`ZERO ${name} exit=${r.status} 落盘=${landed ? 'yes' : 'no'} bytes=${landed ? statSync(p).size : 0}`
      + ` 完整文档=${landed && full(p) ? 'yes' : 'no'}`
      + ` 空态块=${html.includes('ilife-block-empty') ? 'yes' : 'no'}`
      + ` 空态句=${html.includes('没有找到匹配的食品') || html.includes('没有重复食品') ? 'yes' : 'no'}`
      + ` 引导句=${html.includes('存食品') || html.includes('无需处理') ? 'yes' : 'no'}`
      + ` stderr=${r.stderr.slice(0, 110)}`);
    if (needle) console.log(`ZERO   ↑ 老实物正本 food_search.html:98-101：items.length===0 ⇒ emptyState(🔍 无匹配食物／尝试其他关键词,或先用「存食品」添加)`);
  }
}
