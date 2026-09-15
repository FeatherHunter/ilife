#!/usr/bin/env node
/** #272 收口复核席 · 探针一：scene 02 全部 22 条排行榜路由逐条真跑（独立复跑，不采信作者读数）。
 *
 * 与作者脚本的两处不同（专治「脚本自我满足」）：
 *   ① 路由表**从编译产物 `dist/diet/routes.js` 直接 import** 取（不是抄一遍字面量，也不是正则扫源码），
 *      故「21 条＋1 条」这个条数是当刻真实声明算出来的；
 *   ② 每条跑前**还原同一份库快照 ＋ 清空产物目录**，产物计数按当次实际新增文件数算。
 *
 * 另附两个空态探针（作者的 26 条探针没有真跑过出口的空态）：
 *   A 空库（schema 在、零记录）：读出口退出码与 stderr，数产物
 *   B 有数据但窗口为空（窗口整段在数据之外）：读出口退出码与 stderr，数产物
 *
 * 跑法：`node docs/skills/skill-calorie/t272-收口复核-复跑22条.mjs`
 * 环境：库与产物落 `.scratch/t272/`（不入仓）。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const DIST = join(ROOT, 'packages', 'skill-calorie', 'dist');
const CLI = join(DIST, 'cli', 'cmd_read.js');

const { DIET_ROUTES } = await import(pathToFileURL(join(DIST, 'diet', 'routes.js')).href);
const { openDb, DB_FILENAME } = await import(pathToFileURL(join(DIST, 'index.js')).href);
const { seedFull, SEED_TODAY, PLACEHOLDER_SUBSTITUTIONS } = await import(
  pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href
);

const BASE = join(ROOT, '.scratch', 't272', 'probe1');
const DB_DIR = join(BASE, 'db');
const HTML_DIR = join(DB_DIR, 'calorie_html');
const SNAP = join(BASE, 'snapshot.db');
const EMPTY_DIR = join(BASE, 'empty-db');

const ENV = {
  ...process.env,
  SKILLS_DB_PATH: DB_DIR,
  CALORIE_TODAY: SEED_TODAY,
  CALORIE_FORCE_PROD: '1',
};

/** 占位符 → 真实值（与 `t81-seed` 同一张表，别处不另抄一份）。 */
function fill(cli) {
  let s = cli;
  for (const [k, v] of PLACEHOLDER_SUBSTITUTIONS) {
    if (v === null) continue;
    s = s.split(k).join(v);
  }
  return s;
}

/** 从路由声明的 cli 串里取出 `--params` 的 JSON 文本（原样，不重排键）。 */
function paramsOf(cli) {
  const m = /--params\s+'([\s\S]*)'\s*$/.exec(cli.trim());
  if (!m) throw new Error('路由声明里没有 --params：' + cli);
  return m[1];
}

function decls() {
  return DIET_ROUTES
    .filter((r) => r.key === 'calorie.view.ranking' && String(r.scene) === '02')
    .sort((a, b) => (a.list === b.list ? a.order - b.order : String(a.list).localeCompare(String(b.list))));
}

function countHtml() {
  if (!existsSync(HTML_DIR)) return 0;
  return readdirSync(HTML_DIR).filter((f) => f.endsWith('.html')).length;
}

function clearHtml() {
  if (!existsSync(HTML_DIR)) return;
  for (const f of readdirSync(HTML_DIR)) rmSync(join(HTML_DIR, f), { force: true });
}

function restoreSnapshot() {
  copyFileSync(SNAP, join(DB_DIR, DB_FILENAME));
  clearHtml();
}

function runCli(key, paramsText, env) {
  const before = existsSync(HTML_DIR) ? readdirSync(HTML_DIR).length : 0;
  const r = spawnSync(process.execPath, [CLI, key, '--params', paramsText], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env,
  });
  const after = existsSync(HTML_DIR) ? readdirSync(HTML_DIR).length : 0;
  return { status: r.status, stderr: String(r.stderr ?? '').trim(), made: after - before, before };
}

/* ---------- 0 · 建一份种子库并冻结快照（每条跑前还原这一份） ---------- */
rmSync(BASE, { recursive: true, force: true });
mkdirSync(DB_DIR, { recursive: true });
mkdirSync(HTML_DIR, { recursive: true });
{
  const db = openDb(join(DB_DIR, DB_FILENAME));
  seedFull(db);
  db.close();
}
copyFileSync(join(DB_DIR, DB_FILENAME), SNAP);

/* ---------- 一 · 22 条逐条真跑 ---------- */
const rows = decls();
const fails = [];
let okExit = 0;
let okArtifact = 0;
for (const d of rows) {
  restoreSnapshot();
  const p = paramsOf(fill(d.cli));
  const r = runCli('calorie.view.ranking', p, ENV);
  if (r.status === 0) okExit += 1;
  else fails.push(`${d.wakeWord} exit=${r.status} stderr=${r.stderr.slice(-160)}`);
  if (r.made >= 1) okArtifact += 1;
  else fails.push(`${d.wakeWord} 没落盘（made=${r.made}）`);
  console.log(`[route] ${d.list}/${d.order} exit=${r.status} made=${r.made} params=${p}`);
}
console.log(`RESULT-RUN22: exit0 ${okExit}/${rows.length} 有产物 ${okArtifact}/${rows.length}`);

/* ---------- A · 空库（schema 在、零记录）---------- */
rmSync(EMPTY_DIR, { recursive: true, force: true });
mkdirSync(EMPTY_DIR, { recursive: true });
{
  const db = openDb(join(EMPTY_DIR, DB_FILENAME));
  db.close();
}
const emptyEnv = { ...ENV, SKILLS_DB_PATH: EMPTY_DIR };
const emptyRes = [];
for (const [label, params] of [
  ['单榜 看高热量榜', '{"category":"high_calorie","topN":10,"window":"7d"}'],
  ['全榜 看全部排行榜', '{"topN":10,"window":"7d"}'],
]) {
  const r = runCli('calorie.view.ranking', params, emptyEnv);
  const madeAll = existsSync(join(EMPTY_DIR, 'calorie_html'))
    ? readdirSync(join(EMPTY_DIR, 'calorie_html')).filter((f) => f.endsWith('.html')).length : 0;
  emptyRes.push({ label, status: r.status, stderr: r.stderr, made: madeAll });
  console.log(`[empty-db] ${label} exit=${r.status} 产物=${madeAll} stderr=${r.stderr}`);
}
const emptyOk = emptyRes.every((x) => x.status === 4 && x.made === 0 && /ERR 4: 取数失败（缺失阻断）/.test(x.stderr));
console.log(`RESULT-EMPTYDB: ${emptyOk ? 'PASS' : 'FAIL'}（期望：exit 4 ＋ ERR 4 ＋ 0 产物）`);

/* ---------- B · 有数据但窗口为空（窗口整段在数据之外）---------- */
restoreSnapshot();
const farWindow = '{"category":"high_calorie","topN":10,"window":"custom","start":"2026-11-01","end":"2026-11-07"}';
const bSingle = runCli('calorie.view.ranking', farWindow, ENV);
restoreSnapshot();
const farAll = '{"topN":10,"window":"custom","start":"2026-11-01","end":"2026-11-07"}';
const bAll = runCli('calorie.view.ranking', farAll, ENV);
console.log(`[empty-window] 单榜 exit=${bSingle.status} made=${bSingle.made} stderr=${bSingle.stderr}`);
console.log(`[empty-window] 全榜 exit=${bAll.status} made=${bAll.made} stderr=${bAll.stderr}`);

console.log('RESULT: ' + JSON.stringify({
  routes: rows.length, exit0: okExit, artifacts: okArtifact,
  emptyDbExit: emptyRes.map((x) => x.status), emptyDbArtifacts: emptyRes.map((x) => x.made),
  emptyWindowSingleExit: bSingle.status, emptyWindowAllExit: bAll.status,
}));
if (fails.length > 0) {
  console.log('FAILS:\n' + fails.join('\n'));
  process.exit(1);
}
