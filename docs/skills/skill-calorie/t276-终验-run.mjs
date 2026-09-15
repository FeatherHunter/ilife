#!/usr/bin/env node
/** #276 · 运行时终验（Lane B / wf155-b）
 *
 * 判据全部走「真命令」：每条唤醒词的命令行**从运行期路由总表 `ALL_ROUTES` 取**（不手打），
 * 再原样跑唯一出口 `calorie-cmd-read`，断言落盘产物的存在／字节／首字节与页内结构化读数。
 * 这样「声明改了但派生表没重生成」这类沉默缺陷才会现形（手打命令行会把它绕过去）。
 *
 * 用法：
 *   node docs/skills/skill-calorie/t276-终验-run.mjs            # 重播种子 → 跑全部判据
 *   node docs/skills/skill-calorie/t276-终验-run.mjs --no-seed  # 用现有库跑
 *   node docs/skills/skill-calorie/t276-终验-run.mjs --seed-only
 *   node docs/skills/skill-calorie/t276-终验-run.mjs --phase=1  # 只跑一段（1 六条词／2 接对四处／3 餐别五条）
 *                                                              # 三段各有独立退出码，便于逐族复跑。
 *
 * 环境：本脚本自己设 `SKILLS_DB_PATH`（默认 `<repo>/.scratch/t276/db`，可用 `T276_DB_DIR` 覆盖）。
 * 写命令需要 `CALORIE_FORCE_PROD=1`（`paths.assertWritablePath` 只放行 tmp；拒绝静默写生产）。
 *
 * 退出码：0 全绿；1 有判据为红（逐条打印 RED 行）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PKG = path.join(ROOT, 'packages', 'skill-calorie');
const CLI = path.join(PKG, 'dist', 'cli', 'cmd_read.js');
const DB_DIR = process.env.T276_DB_DIR ?? path.join(ROOT, '.scratch', 't276', 'db');
const SEED = path.join(ROOT, '.scratch', 't276', 'seed.mjs');
const ARGV = process.argv.slice(2);

const results = [];
function check(ok, label, detail) {
  results.push({ ok, label, detail });
  console.log((ok ? 'PASS ' : 'RED  ') + label + (detail === undefined ? '' : '  |  ' + detail));
}

/** 跑一次唯一出口。返回退出码 ＋ 解析出的 envelope。 */
function run(key, params) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  const r = spawnSync(process.execPath, [CLI, ...a], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: DB_DIR, CALORIE_FORCE_PROD: '1' },
  });
  let env = null;
  try { env = JSON.parse((r.stdout ?? '').trim()); } catch { /* 非 0 时 stdout 为空 */ }
  return { code: r.status, env, err: (r.stderr ?? '').trim() };
}

/** 落盘产物读数：路径／字节／首 15 字节／sha256／正文。 */
function artifact(env) {
  const p = env?.data?.output;
  if (typeof p !== 'string' || !fs.existsSync(p)) return null;
  const buf = fs.readFileSync(p);
  return {
    path: p, bytes: buf.length, head15: buf.subarray(0, 15).toString('utf8'),
    sha256: createHash('sha256').update(buf).digest('hex'), html: buf.toString('utf8'),
  };
}

function h1Of(html) {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

/** 行数读数（写后回读用）。 */
async function count(table) {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path.join(DB_DIR, 'calorie_data.db'));
  const row = db.prepare('SELECT COUNT(*) AS n FROM ' + table).get();
  db.close();
  return row.n;
}

/* ── 0 · 种子 ───────────────────────────────────────────── */
if (!ARGV.includes('--no-seed')) {
  const s = spawnSync(process.execPath, [SEED], { encoding: 'utf8', env: { ...process.env, T276_DB_DIR: DB_DIR } });
  check(s.status === 0, '种子播完（写命令真写进库）', (s.stdout ?? '').trim().split('\n')[0]);
  if (ARGV.includes('--seed-only')) { process.exit(results.every((r) => r.ok) ? 0 : 1); }
}

/* ── 1 · 路由总表：6 条唤醒词必须有可执行命令 ───────────────── */
const { ALL_ROUTES } = await import(pathToUrl(path.join(PKG, 'dist', 'triggers', 'routes.generated.js')));
const { isCalorieWriteKey } = await import(pathToUrl(path.join(PKG, 'dist', 'cli', 'keys.js')));

function pathToUrl(p) { return new URL('file:///' + p.replace(/\\/g, '/')); }

function routeOf(word) {
  const hits = ALL_ROUTES.filter((r) => r.wakeWord === word);
  if (hits.length !== 1) throw new Error('唤醒词在路由总表里不是恰好一条：' + word + '（' + hits.length + ' 条）');
  return hits[0];
}

/** 路由记录的 `cli` 原文 → {key, params}；`<日期>` 类占位符换成具体值（终端入口的本来做法）。 */
function parseCli(cli) {
  const m = /^calorie-cmd-read\s+(\S+)(?:\s+--params\s+'([\s\S]*)')?$/.exec(cli);
  if (!m) throw new Error('cli 原文解析不了：' + cli);
  const raw = m[2];
  const params = raw === undefined ? undefined
    : JSON.parse(raw.replace(/<日期>/g, '2026-09-13').replace(/<开始日期>/g, '2026-09-01').replace(/<结束日期>/g, '2026-09-30'));
  return { key: m[1], params };
}

const SIX = ['看有备注的饮食记录', '看「有备注」的饮食记录', '校验批量导入', '批量导入食品', '拍营养表记一餐', '拍营养表补记一餐'];

/** 只跑指定段（不给＝三段全跑）。*/
const PHASE = (ARGV.find((a) => a.startsWith('--phase=')) ?? '--phase=all').slice('--phase='.length);
const want = (n) => PHASE === 'all' || PHASE === n;

if (want('1')) {
console.log('\n== 一 · 6 条唤醒词逐条实跑 ==');
for (const word of SIX) {
  const route = routeOf(word);
  check(route.kind === 'exec' && typeof route.cli === 'string',
    '路由可执行：' + word, 'kind=' + route.kind + ' key=' + route.key);
  const { key, params } = parseCli(route.cli);
  const isWrite = isCalorieWriteKey(key);
  const before = isWrite ? await count(key === 'calorie.product.import' ? 'nutrition_products' : 'food_log') : 0;
  const r = run(key, params);
  const art = artifact(r.env);
  const row = [word, 'key=' + key, 'exit=' + r.code, art ? art.path : '(无产物)',
    art ? art.bytes + 'B' : '-', art ? JSON.stringify(art.head15) : '-'].join('  ');
  console.log('  ' + row);
  check(r.code === 0, 'exit 0：' + word, r.code === 0 ? '' : r.err.split('\n')[0]);
  check(art !== null && art.bytes > 0, '产物落盘且在 0 字节以上：' + word);
  check(art !== null && art.head15.toLowerCase() === '<!doctype html>', '首字节是 <!doctype html>：' + word,
    art === null ? '无产物' : JSON.stringify(art.head15));
  if (isWrite) {
    const after = await count(key === 'calorie.product.import' ? 'nutrition_products' : 'food_log');
    check(after > before, '写后回读（真写进库）：' + word, (key === 'calorie.product.import' ? 'nutrition_products' : 'food_log') + ' ' + before + ' → ' + after);
  }
}

} /* ── 一段结束 ── */

if (want('2')) {
console.log('\n== 二 · 接对 4 处 ==');

/* 第 1 处：查高热量排行（票面点名）——必须出「高热量榜」，不是「全部排行」。 */
{
  const word = '查高热量排行';
  const route = routeOf(word);
  const { key, params } = parseCli(route.cli);
  check(params?.category === 'high_calorie', '路由参数带 category=high_calorie：' + word, JSON.stringify(params));
  const art = artifact(run(key, params).env);
  check(art !== null && art.html.includes('高热量榜'), '页面上是「高热量榜」：' + word);
  check(art !== null && !art.html.includes('全部排行'), '页面上不是「全部排行」：' + word);
  check(art !== null && /食物排行_高热量_/.test(path.basename(art.path)), '产物名是单榜名：' + word,
    art === null ? '' : path.basename(art.path));
  const ctrl = artifact(run(key, parseCli(routeOf('看全部排行榜').cli).params).env);
  check(ctrl !== null && ctrl.html.includes('全部排行'), '对照面（看全部排行榜）出「全部排行」');
  check(art !== null && ctrl !== null && art.sha256 !== ctrl.sha256, '单榜页与全榜页逐字节不同');
}

/* 第 3 处：看本周饮食——窗口口径读数（新仓＝本周一..今天；老实物＝整周恒 7 天）。 */
{
  const word = '看本周饮食';
  const { key, params } = parseCli(routeOf(word).cli);
  const r = run(key, params);
  const days = r.env?.data?.metrics?.days;
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const expectDays = mondayOffset + 1;
  console.log('  ' + word + '  window=' + JSON.stringify(params) + '  metrics.days=' + days +
    '  （新仓口径＝本周一..今天＝' + expectDays + ' 天；老实物整周＝7 天）');
  check(r.code === 0 && days === expectDays, '窗口＝本周一..今天（口径读数，非路由接错）', 'days=' + days + ' 期望=' + expectDays);
}

/* 第 4 处：看食品来源统计——票面说「接错命令」，当刻读数判它是接对的。 */
{
  const word = '看食品来源统计';
  const route = routeOf(word);
  const { key, params } = parseCli(route.cli);
  check(key === 'calorie.view.source-stats', '路由指向 calorie.view.source-stats：' + word, '当刻 key=' + key);
  const r = run(key, params);
  check(r.code === 0, 'exit 0：' + word, r.code === 0 ? '' : r.err.split('\n')[0]);
  const lib = parseCli(routeOf('查食品库').cli).key;
  check(lib === 'calorie.view.library', 'calorie.view.library 只服务「查食品库」那一族', '查食品库 key=' + lib);
}

} /* ── 二段结束 ── */

/* 第 2 处：5 条餐别词——各自要出「餐别分布」页，5 份互不相同。 */
if (want('3')) {
console.log('\n== 三 · 餐别 5 条 ==');
const MEAL_WORDS = [
  ['看早餐（最近 7 天）', '早餐'], ['看午餐（最近 7 天）', '午餐'], ['看晚餐（最近 7 天）', '晚餐'],
  ['看加餐（最近 7 天）', '加餐'], ['看全部餐别分布（最近 7 天）', '全部餐别'],
];
{
  const seen = new Map();
  for (const [word, label] of MEAL_WORDS) {
    const route = routeOf(word);
    const { key, params } = parseCli(route.cli);
    const r = run(key, params);
    const art = artifact(r.env);
    const h1 = art === null ? '' : h1Of(art.html);
    console.log('  ' + word + '  exit=' + r.code + '  ' + (art === null ? '(无产物)' : art.bytes + 'B  h1=' + JSON.stringify(h1)) +
      '  params=' + JSON.stringify(params));
    check(r.code === 0, 'exit 0：' + word, r.code === 0 ? '' : r.err.split('\n')[0]);
    check(art !== null && h1.includes('餐别分布'), '页头是「餐别分布」页：' + word, 'h1=' + JSON.stringify(h1));
    check(art !== null && art.html.includes(label), '页面上出现餐别名「' + label + '」：' + word);
    if (art !== null) seen.set(word, art.sha256);
  }
  const uniq = new Set(seen.values());
  check(uniq.size === MEAL_WORDS.length, '5 份产物内容互不相同', '互异 ' + uniq.size + '/' + MEAL_WORDS.length);
}
} /* ── 三段结束 ── */

/* ── 汇总 ───────────────────────────────────────────────── */
const red = results.filter((r) => !r.ok);
console.log('\n判据合计 ' + results.length + ' 条：绿 ' + (results.length - red.length) + '，红 ' + red.length);
for (const r of red) console.log('  RED  ' + r.label + (r.detail === undefined ? '' : '  |  ' + r.detail));
console.log(red.length === 0 ? 'T276-VERIFY: GREEN' : 'T276-VERIFY: RED');
process.exit(red.length === 0 ? 0 : 1);
