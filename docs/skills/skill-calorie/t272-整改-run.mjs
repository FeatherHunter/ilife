#!/usr/bin/env node
/** #272 整改 · 可复跑脚本（一跑到底：两态探针 → 回归 → 变异自证 → 别的族未受影响）。
 *
 * 跑法（**必须由外壳持锁**；本脚本内不再抢锁，与 `t272-收口复核-变异.mjs` 同一约定）：
 *   node tooling/run-locked.mjs --ticket 272 --max-wait-ms 900000 -- node docs/skills/skill-calorie/t272-整改-run.mjs
 * 只要读数不要锁的写法（自查用）：
 *   node docs/skills/skill-calorie/t272-整改-run.mjs
 *
 * 日志落 `.scratch/t272g/`（本脚本自己不写日志，重定向即可）。四段：
 *   一 · 两态探针：**同一命令、两份库**（库空／库非空但窗口内零记录）逐条读出口码与产物件数；
 *   二 · 回归：作者 26 条断言 ＋ 复核席三件探针（复跑 22 条／新探针／变异）当刻读数；
 *   三 · 变异自证：**本票的**两处改坏 → 新补断言必红 → 逐文件还原 → 必绿（两行机器读数）；
 *   四 · 别的族未受影响：挑两条别的族的词，**改前（HEAD 版三件）／改后（本票版）**产物 sha256 对账。
 *
 * 本脚本会**短暂改写** `packages/skill-calorie/src/diet/` 三件源码（变异与 A/B 用），
 * 每一处都按「进场原文逐文件还原」收尾，并在末段复核 sha 与进场一致；不碰别家的件。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const DIST = join(PKG, 'dist');
const CLI = join(DIST, 'cli', 'cmd_read.js');
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const STAMP = join(PKG, 'scripts', 'gen-cli.mjs');
const FREEZE = join(PKG, 'test', 'freeze-clock.cjs');
const SCRATCH = join(ROOT, '.scratch', 't272g', 'run');
/** 钉住当刻：产物里的时间戳因此逐字节可复现（A/B 对 sha256 才说得通）。 */
const FAKE_NOW = '2026-09-15T20:00:00';
const SEED_TODAY = '2026-09-07';

const RANKING_SRC = [
  join(PKG, 'src', 'diet', 'ranking.ts'),
  join(PKG, 'src', 'diet', 'rankingDocs.ts'),
  join(PKG, 'src', 'diet', 'rankingPlate.ts'),
];

const sha16 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const sha256 = (s) => createHash('sha256').update(s).digest('hex').toUpperCase();

function sh(args, opts = {}) {
  return spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, ...opts });
}

/** `git show HEAD:<仓内相对路径>` 的原样字节（改前那一半用）。 */
function gitShowHead(rel) {
  const g = spawnSync('git', ['-C', ROOT, 'show', 'HEAD:' + rel], { encoding: 'buffer', maxBuffer: 128 * 1024 * 1024 });
  if (g.status !== 0) throw new Error('git show 失败：' + rel + '｜' + String(g.stderr));
  return g.stdout;
}

function build() {
  const b = sh([TSC, '-b', 'packages/skill-calorie']);
  if (b.status !== 0) throw new Error('编译失败：' + String(b.stdout ?? '').slice(-800));
  const s = sh([STAMP, '--stamp']);
  if (s.status !== 0) throw new Error('重签失败：' + String(s.stdout ?? '').slice(-400));
}

const line = (t) => console.log(t);

/* ───────────────────────── 一 · 两态探针 ───────────────────────── */

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(DIST, 'index.js')).href);
const { seedFull } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const WIN = { window: 'custom', start: '2026-11-01', end: '2026-11-07' };
const BOTH = [
  ['单榜 看高热量榜', { category: 'high_calorie', topN: 10, ...WIN }],
  ['全榜 看全部排行榜', { topN: 10, ...WIN }],
];

function mkDb(name, seed) {
  const dir = join(SCRATCH, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const db = openDb(join(dir, DB_FILENAME));
  if (seed) seedFull(db);
  db.close();
  return dir;
}

const countHtml = (dir) => (existsSync(join(dir, 'calorie_html'))
  ? readdirSync(join(dir, 'calorie_html')).filter((f) => f.endsWith('.html')).length : 0);

function runCli(dir, params, extraEnv) {
  const before = countHtml(dir);
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.ranking', '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY, CALORIE_FORCE_PROD: '1', ...(extraEnv ?? {}) },
  });
  let out = '';
  try { out = String(JSON.parse(String(r.stdout)).data.output ?? ''); } catch { out = ''; }
  return { status: r.status, stderr: String(r.stderr).trim(), out, made: countHtml(dir) - before };
}

line('=== 一 · 两态探针（同一命令、两份库） ===');
const EMPTY_DB = mkDb('lib-empty', false);
const SEEDED_DB = mkDb('win-empty', true);
const rows = BOTH.map(([label, params]) => ({
  label,
  lib: runCli(EMPTY_DB, params),
  win: runCli(SEEDED_DB, params),
}));
for (const r of rows) {
  const w = r.win.out !== '' && existsSync(r.win.out) ? readFileSync(r.win.out, 'utf8') : '';
  line(`[two-state] ${r.label} 库空: exit=${r.lib.status} 产物=${r.lib.made} 文案=${JSON.stringify(r.lib.stderr.slice(0, 46))}`
    + ` ｜ 空窗: exit=${r.win.status} 产物=${r.win.made}`
    + ` 完整文档=${w.startsWith('<!doctype html>')} 空态句=${w.includes('里一条饮食记录都没有')} 引导句=${w.includes('说「记一餐」把吃的那顿记上')}`);
}
const twoStateOk = rows.every((r) => r.lib.status === 4 && r.lib.made === 0
  && /ERR 4: 取数失败（缺失阻断）/.test(r.lib.stderr)
  && r.win.status === 0 && r.win.made === 1 && r.lib.status !== r.win.status);
line(`RESULT-TWOSTATE: ${twoStateOk ? 'PASS' : 'FAIL'}（期望：库空 exit 4 ＋ 0 产物 ＋ ERR 4；空窗 exit 0 ＋ 1 产物；两态出口码不同）`);

/* ───────────────────────── 二 · 回归 ───────────────────────── */

line('');
line('=== 二 · 回归：作者 26 条 ＋ 复核席三件探针 ===');
function nodeTestCount(file) {
  const r = sh(['--test', file]);
  const s = String(r.stdout ?? '') + String(r.stderr ?? '');
  const n = (k) => {
    const m = new RegExp('\\n\\u2139 ' + k + ' (\\d+)').exec(s);
    return m === null ? -1 : Number(m[1]);
  };
  return { tests: n('tests'), pass: n('pass'), fail: n('fail') };
}
function probe(script) {
  const r = sh([script]);
  return String(r.stdout ?? '');
}
const authorRun = nodeTestCount(join(PKG, 'test', 't272-排行榜页.test.mjs'));
line(`[回归] 作者原有断言批 tests=${authorRun.tests} pass=${authorRun.pass} fail=${authorRun.fail}`);
const newRun = nodeTestCount(join(PKG, 'test', 't272-空窗两态.test.mjs'));
line(`[回归] 本票新断言批 tests=${newRun.tests} pass=${newRun.pass} fail=${newRun.fail}`);
const p1 = probe(join(HERE, 't272-收口复核-复跑22条.mjs'));
const p2 = probe(join(HERE, 't272-收口复核-新探针.mjs'));
line('[回归] 复核席复跑 22 条：' + (/(RESULT-RUN22: [^\n]*)/.exec(p1) ?? [, '(没读到读数)'])[1]);
line('[回归] 复核席空库档：' + (/(RESULT-EMPTYDB: [^\n]*)/.exec(p1) ?? [, '(没读到读数)'])[1]);
line('[回归] 复核席新探针：' + (/(RESULT-NEW: [^\n]*)/.exec(p2) ?? [, '(没读到读数)'])[1]);
line('[回归] 复核席变异自证：见下一段（本脚本第三段自己那两处之外，另附它的读数）');
const pmut = probe(join(HERE, 't272-收口复核-变异.mjs'));
for (const l of pmut.split('\n')) if (/^(BASELINE|MUTATION|RESTORE|RESULT-MUTATION)/.test(l)) line('[回归·复核席变异] ' + l);
const regressOk = authorRun.fail === 0 && authorRun.tests === 26 && newRun.fail === 0
  && /RESULT-NEW: PASS/.test(p2) && /RESULT-EMPTYDB: PASS/.test(p1) && /exit0 22\/22/.test(p1)
  && /RESTORE-甲: .*与进场一致=true/.test(pmut) && /RESTORE-乙: .*与进场一致=true/.test(pmut);
line(`RESULT-REGRESS: ${regressOk ? 'PASS' : 'FAIL'}`);
build();

/* ───────────────────────── 三 · 变异自证（本票两处） ───────────────────────── */

line('');
line('=== 三 · 变异自证（改坏 → 新断言必红；还原 → 必绿） ===');
const ORIGINAL = new Map(RANKING_SRC.map((p) => [p, readFileSync(p, 'utf8')]));
const ENTRY_SHA = new Map(RANKING_SRC.map((p) => [p, sha16(ORIGINAL.get(p))]));

function mutateOne(file, from, to) {
  const text = ORIGINAL.get(file);
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error('变异点命中 ' + n + ' 次（应为 1）：' + from.slice(0, 60));
  writeFileSync(file, text.split(from).join(to), 'utf8');
}
function restoreAll() {
  for (const p of RANKING_SRC) writeFileSync(p, ORIGINAL.get(p), 'utf8');
}
function newBatch() {
  build();
  const t = nodeTestCount(join(PKG, 'test', 't272-空窗两态.test.mjs'));
  return `tests=${t.tests} pass=${t.pass} fail=${t.fail}`;
}

/* 变异甲：两态判别改成「窗口为空也照样抛」（两态重新塌成一条） */
mutateOne(join(PKG, 'src', 'diet', 'rankingPlate.ts'),
  '      if (!hasAnyDietRow(db) || dietRowsInWindow(db, start, end) > 0) throw e;',
  '      throw e;');
line('MUTATION-甲（两态判别改坏：窗口为空照样抛缺失阻断）: 新断言批 ' + newBatch() + '（期望 fail>0）');
restoreAll();
line('RESTORE-甲: ' + newBatch() + ' 与进场一致='
  + String([...ORIGINAL].every(([p, t]) => readFileSync(p, 'utf8') === t)));

/* 变异乙：三段条第三段从「吃余数」退回「各段四舍五入」 */
mutateOne(join(PKG, 'src', 'diet', 'rankingDocs.ts'),
  '  return { p, c, f: 100 - p - c };',
  '  return { p, c, f: Math.round((it.totalFat * 9 / total) * 100) };');
line('MUTATION-乙（三段恒 100% 退回各段四舍五入）: 新断言批 ' + newBatch() + '（期望 fail>0）');
restoreAll();
line('RESTORE-乙: ' + newBatch() + ' 与进场一致='
  + String([...ORIGINAL].every(([p, t]) => readFileSync(p, 'utf8') === t)));
line('ENTRY-SHA: ' + [...ENTRY_SHA].map(([p, s]) => p.slice(-20) + '=' + s).join(' '));

/* ───────────────────────── 四 · 别的族未受影响 ───────────────────────── */

line('');
line('=== 四 · 别的族未受影响（改前／改后产物 sha256 对账） ===');
const WORDS = ['看今日饮食', '饮食复盘（本周）'];
const ENV = { SKILLS_DB_PATH: SEEDED_DB, CALORIE_TODAY: SEED_TODAY, CALORIE_FORCE_PROD: '1', FAKE_NOW_ISO: FAKE_NOW };

function shaOfProduct(key, paramsText, tag) {
  const out = join(SCRATCH, 'ab-' + tag + '.html');
  rmSync(out, { force: true });
  const r = spawnSync(process.execPath, ['--require', FREEZE, CLI, key, '--params', paramsText, '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...ENV },
  });
  if (r.status !== 0 || !existsSync(out)) return { status: r.status, sha: '(没出页) ' + String(r.stderr).slice(-120) };
  return { status: r.status, sha: sha256(readFileSync(out, 'utf8')) };
}

const picks = [];
for (const w of WORDS) {
  const { routesFor } = await import(pathToFileURL(join(DIST, 'triggers', 'routing.js')).href);
  const hit = routesFor(w).find((r) => r.kind === 'exec');
  if (hit === undefined) throw new Error('路由里找不到词：' + w);
  const m = /--params\s+'([\s\S]*)'\s*$/.exec(String(hit.cli).trim());
  picks.push({ word: w, key: hit.key, params: m === null ? '{}' : m[1] });
}
for (const p of picks) p.after = shaOfProduct(p.key, p.params, 'after-' + sha16(p.word));

/* 改前那一半：把三件源码按 git HEAD 原样放回，重编重签，再跑同一批词。 */
for (const f of RANKING_SRC) {
  const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/');
  writeFileSync(f, gitShowHead(rel));
}
build();
for (const p of picks) p.before = shaOfProduct(p.key, p.params, 'before-' + sha16(p.word));
restoreAll();
build();

let abOk = true;
for (const p of picks) {
  const same = p.after.sha === p.before.sha;
  if (!same) abOk = false;
  line(`[A/B] ${p.word}（${p.key}）改前 sha256=${p.before.sha.slice(0, 32)}… 改后 sha256=${p.after.sha.slice(0, 32)}… 逐字节一致=${same}`);
}
line(`RESULT-OTHERFAMILY: ${abOk ? 'PASS' : 'FAIL'}（期望：两条别的族的词改前／改后产物 sha256 一致）`);
line('RESTORE-末: 三件源码与进场一致='
  + String([...ORIGINAL].every(([p, t]) => readFileSync(p, 'utf8') === t)));

line('');
line(`RESULT-ALL: ${twoStateOk && regressOk && abOk ? 'PASS' : 'FAIL'}`
  + `（两态=${twoStateOk ? 'PASS' : 'FAIL'} 回归=${regressOk ? 'PASS' : 'FAIL'} 别的族=${abOk ? 'PASS' : 'FAIL'}）`);
if (!(twoStateOk && regressOk && abOk)) process.exit(1);
