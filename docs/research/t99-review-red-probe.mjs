#!/usr/bin/env node
/**
 * #99 红队审查探针（红队 session `red10` 的 7 支探针合并为**单文件**，可独立复跑）。
 *
 * 审查对象：wayfinder 地图 #63 / 票 #99《G1 SKILL.md 示例可执行门》
 *   commit `05cac10`／`2775822`／`c0fb6d2`／`33c166a`；报告 `docs/research/t99-review-red.md`
 *   （commit `a819d8f`／`3ebbefe`／`b876271`）。
 * 审查时的 `SKILL.md` 基准（本文件所有「未变」判定都以此为锚）：
 *   `size=27965`、前 3 字节 `2d 2d 2d`、`sha256=e81c4b2ff80281d6…`、
 *   `git hash-object=51bcf2cffe84a3da285eb49e29ddd52155b22db1`。
 *
 * 用法：
 *   node docs/research/t99-review-red-probe.mjs premises
 *   node docs/research/t99-review-red-probe.mjs mutate
 *   node docs/research/t99-review-red-probe.mjs params-effect
 *   node docs/research/t99-review-red-probe.mjs ismain
 *   node docs/research/t99-review-red-probe.mjs default-throw
 *   node docs/research/t99-review-red-probe.mjs gen-e2e
 *   node docs/research/t99-review-red-probe.mjs seed-dep
 *   node docs/research/t99-review-red-probe.mjs all          # 顺序跑全部（各自子进程）
 *
 * 只读纪律：**永不**对仓库内 `SKILL.md` 写盘——`mutate`／`gen-e2e` 的变异只落在系统 tmp 的副本上
 * （被审门自身支持 `--skill <副本>`，故副本级变异无需触碰事故面文件）。唯一写盘位置＝
 * `mkdtempSync(tmpdir(),'t99-red10-')` 下的临时目录，清理前有路径守卫（协议 §2.1.3）。
 * 前置：`pnpm build`（门与探针都读 `packages/skill-calorie/dist/`）。
 *
 * 末行均为机读摘要 `RESULT: …`；exit 0＝该子命令的断言全部成立。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const SKILL = join(PKG, 'SKILL.md');
const GATE = join(PKG, 'scripts', 'check-examples.mjs');
const BH = join(PKG, 'scripts', 'build-help.mjs');
const KEYS = join(PKG, 'dist', 'cli', 'keys.js');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const SEED = join(HERE, 't81-seed.mjs');
const START = '<!-- HELP-AUTO-START -->';
const END = '<!-- HELP-AUTO-END -->';

const cmd = process.argv[2] || 'help';
const TMP = mkdtempSync(join(tmpdir(), 't99-red10-'));
/** 删除守卫：只允许删 TMP 根之下，且不得落在仓库敏感路径（协议 §2.1.3）。 */
const guard = (p) => {
  const abs = resolve(p);
  if (abs !== resolve(TMP) && !abs.startsWith(resolve(TMP) + sep)) throw new Error('守卫拒绝删除（非本探针 tmp 根）：' + abs);
  if (/[\\/](node_modules|packages|docs|test|tooling|\.git)([\\/]|$)/.test(abs)) throw new Error('守卫拒绝删除（仓库敏感路径）：' + abs);
  return abs;
};

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const fp = (p) => {
  const b = readFileSync(p);
  return { size: b.length, first3: [...b.slice(0, 3)].map((x) => x.toString(16).padStart(2, '0')).join(' '), sha256: sha256(b).slice(0, 16), mtimeMs: statSync(p).mtimeMs };
};
const blob = (p) => spawnSync('git', ['hash-object', p], { encoding: 'utf8' }).stdout.trim();
const banner = () => {
  const f = fp(SKILL);
  console.log(`# SKILL.md 锚：size=${f.size} first3=${f.first3} sha256=${f.sha256} blob=${blob(SKILL)}`);
  console.log(`# node ${process.version}｜仓库 ${ROOT}`);
};

/** 解析 SKILL.md AUTO 块的示例行（自数，不复用被审门的解析器）。 */
function parseRows(text) {
  const si = text.indexOf(START), ei = text.indexOf(END);
  if (si < 0 || ei < si) throw new Error('SKILL.md 缺 HELP 标记块');
  return text.slice(si, ei).split('\n')
    .filter((l) => l.startsWith('| ') && l.includes('calorie-cmd-read '))
    .map((l) => {
      const cells = l.split('|').map((c) => c.trim());
      return { key: cells[2], cmd: cells[4].replace(/^`/, '').replace(/`$/, ''), line: l };
    });
}

function runGate(skillPath, extra = []) {
  const r = spawnSync(process.execPath, [GATE, '--skill', skillPath, ...extra], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return {
    exit: r.status,
    resultLine: (out.match(/^RESULT: .*$/m) || ['RESULT: <none>'])[0],
    red: out.split('\n').filter((l) => /^RED |^STRUCT |^FAIL: /.test(l)).slice(0, 2),
  };
}

// ─────────────────────────────────────────────────────────── premises
async function premises() {
  banner();
  const { CALORIE_COMBOS } = await import(pathToFileURL(KEYS).href);
  const { buildHelpBlock } = await import(pathToFileURL(BH).href);
  const rows = parseRows(readFileSync(SKILL, 'utf8'));
  const keys = Object.keys(CALORIE_COMBOS).sort();
  const rowKeys = rows.map((r) => r.key);
  const missing = keys.filter((k) => !rowKeys.includes(k));
  const extra = rowKeys.filter((k) => !keys.includes(k));
  const dup = rowKeys.length !== new Set(rowKeys).size;
  let bhRows = -1, bhErr = null;
  try { bhRows = buildHelpBlock().split('\n').filter((l) => l.startsWith('| ') && l.includes('calorie-cmd-read ')).length; } catch (e) { bhErr = e.message; }
  console.log(`示例行(自数)=${rows.length}｜CALORIE_COMBOS 键=${keys.length}｜缺=${missing.length}｜未注册=${extra.length}｜重复=${dup}`);
  console.log(`buildHelpBlock() 行数=${bhRows} err=${bhErr || 'none'}`);
  const ok = rows.length === keys.length && !missing.length && !extra.length && !dup && bhErr === null && bhRows === keys.length;
  console.log('RESULT: premises=' + (ok ? 'ok' : 'FAIL'));
  return ok ? 0 : 1;
}

// ─────────────────────────────────────────────────────────── mutate
const MUTATIONS = [
  ['a1-params键名改错 days→day', 'calorie.view.weight-history', (l) => l.replace('{"days":7}', '{"day":7}')],
  ['a2-params键名拼错 days→dais', 'calorie.history', (l) => l.replace('{"days":7}', '{"dais":7}')],
  ['a3-params键名改错 start→begin', 'calorie.view.diet', (l) => l.replace('{"start"', '{"begin"')],
  ['b-删掉示例行', 'calorie.view.dedupe', null],
  ['c-重复示例行', 'calorie.view.profile', 'dup'],
  ['d1-指向不存在数据(写命令 id→99999)', 'calorie.diet.update', (l) => l.replace('{"id":1,"grams":150}', '{"id":99999,"grams":150}')],
  ['d2-指向不存在数据(照片 id→99999)', 'calorie.photo.detail', (l) => l.replace('{"id":1}', '{"id":99999}')],
  ['d3-指向不存在数据(读视图空区间)', 'calorie.view.diet', (l) => l.replace('"start":"2026-09-05","end":"2026-09-07"', '"start":"2019-01-01","end":"2019-01-02"')],
  ['e-未登记占位符', 'calorie.photo.add', (l) => l.replace('<照片路径>', '<另一张照片>')],
  ['f-params 非法 JSON', 'calorie.view.search', (l) => l.replace('\'{"keyword":"鸡胸"}\'', '\'{"keyword":"鸡胸"\'')],
];

function mutate() {
  banner();
  const base = readFileSync(SKILL, 'utf8');
  const dir = join(TMP, 'mut');
  mkdirSync(dir, { recursive: true });
  const write = (name, text) => { const p = join(dir, name + '.md'); writeFileSync(p, text, 'utf8'); return p; };
  const results = [];
  for (const [name, key, fn] of MUTATIONS) {
    const lines = base.split('\n');
    const idx = lines.findIndex((l) => l.startsWith('| ') && l.split('|')[2] && l.split('|')[2].trim() === key);
    if (idx < 0) throw new Error('副本里找不到行：' + key);
    let text;
    if (fn === null) text = lines.filter((_, i) => i !== idx).join('\n');
    else if (fn === 'dup') { const copy = [...lines]; copy.splice(idx + 1, 0, lines[idx]); text = copy.join('\n'); }
    else text = lines.map((l, i) => (i === idx ? fn(l) : l)).join('\n');
    const r = runGate(write(name, text));
    results.push({ name, exit: r.exit, resultLine: r.resultLine });
    console.log(`[${name}] exit=${r.exit} ${r.resultLine}  ${r.red[0] || ''}`);
  }
  const green = runGate(write('restored-clean', base));
  console.log(`[还原自证] exit=${green.exit} ${green.resultLine}（副本 blob=${blob(join(dir, 'restored-clean.md'))} vs 仓库 ${blob(SKILL)}）`);
  const caught = results.filter((r) => r.exit === 1);
  const missed = results.filter((r) => r.exit !== 1);
  console.log(`被抓 ${caught.length}/${results.length}；**漏检 ${missed.length}**：${missed.map((m) => m.name).join('、') || '（无）'}`);
  const ok = green.exit === 0;
  console.log('RESULT: mutate=' + (ok ? `ok caught=${caught.length}/${results.length} missed=${missed.length}` : 'FAIL'));
  return ok ? 0 : 1;
}

// ─────────────────────────────────────────────────────────── params-effect
async function paramsEffect() {
  banner();
  const { createHarness } = await import(pathToFileURL(SEED).href);
  const { DB_FILENAME } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
  const rows = parseRows(readFileSync(SKILL, 'utf8')).filter((r) => /--params '/.test(r.cmd));
  const h = createHarness();
  const tpl = join(h.workDir, 'tpl', DB_FILENAME);
  const photos = join(h.workDir, 'photos');
  let seq = 0;
  const run = (cli) => {
    seq += 1;
    const dir = join(h.workDir, 'pe-' + seq);
    mkdirSync(dir, { recursive: true });
    copyFileSync(tpl, join(dir, DB_FILENAME));
    const toks = cli.match(/'[^']*'|\S+/g).map((t) => t.replace(/^'/, '').replace(/'$/, ''));
    const r = spawnSync(process.execPath, [CLI, ...toks.slice(1)], {
      encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_PHOTOS_DIR: photos },
    });
    let key = null;
    try { key = JSON.parse(String(r.stdout || '').trim()).key ?? null; } catch { key = null; }
    return { status: r.status, key, out: String(r.stdout || '') };
  };
  const rename = (c) => c.replace(/--params '(.+)'$/, (_, j) => {
    const o = JSON.parse(j); const n = {};
    for (const k of Object.keys(o)) n['zz_' + k] = o[k];
    return "--params '" + JSON.stringify(n) + "'";
  });
  const ignored = [], effective = [], other = [];
  try {
    for (const r of rows) {
      const a = run(r.cmd);
      const b = run(rename(r.cmd));
      const same = sha256(a.out) === sha256(b.out);
      if (a.status === 0 && b.status === 0 && same) ignored.push(r.key);
      else if (b.status !== 0) effective.push(r.key);
      else other.push(`${r.key}(exit=${a.status}/${b.status},out_same=${same})`);
    }
  } finally { h.cleanup(); rmSync(guard(TMP), { recursive: true, force: true }); }
  console.log(`含 --params 的示例行=${rows.length}`);
  console.log(`参数被静默忽略(stdout 逐字节相同)=${ignored.length}${ignored.length ? '：' + ignored.join('、') : ''}`);
  console.log(`参数有效(改键名后非 0)=${effective.length}`);
  console.log(`键名可打错仍 exit 0 但输出不同（门看不出）=${other.length}${other.length ? '：' + other.slice(0, 5).join('、') + ' …' : ''}`);
  console.log(`RESULT: paramsIgnored=${ignored.length}/${rows.length} blindSpot=${other.length}/${rows.length}`);
  return ignored.length === 0 ? 0 : 1;
}

// ─────────────────────────────────────────────────────────── ismain
async function ismain() {
  banner();
  const before = fp(SKILL);
  const b0 = blob(SKILL);
  const t0 = Date.now();
  await import(pathToFileURL(BH).href);
  const after = fp(SKILL);
  const changed = ['size', 'first3', 'sha256', 'mtimeMs'].filter((k) => before[k] !== after[k]);
  console.log(`import(build-help.mjs) 用时 ${Date.now() - t0} ms`);
  console.log(`BEFORE ${JSON.stringify(before)} blob=${b0}`);
  console.log(`AFTER  ${JSON.stringify(after)} blob=${blob(SKILL)}`);
  console.log('changed=' + (changed.length ? changed.join(',') : 'none'));
  console.log('RESULT: noWriteOnImport=' + (changed.length === 0 ? 'ok' : 'FAIL:' + changed.join(',')));
  return changed.length === 0 ? 0 : 1;
}

// ─────────────────────────────────────────────────────────── default-throw
async function defaultThrow() {
  banner();
  const before = fp(SKILL);
  const { CALORIE_COMBOS } = await import(pathToFileURL(KEYS).href);
  const FAKE = 'calorie.view.__red10_unregistered_probe';
  CALORIE_COMBOS[FAKE] = { shape: 'view' };
  const { buildHelpBlock } = await import(pathToFileURL(BH).href);
  let err = null;
  try { buildHelpBlock(); } catch (e) { err = e; }
  const after = fp(SKILL);
  const same = before.size === after.size && before.sha256 === after.sha256 && before.mtimeMs === after.mtimeMs;
  console.log(`注入假键后 keys=${Object.keys(CALORIE_COMBOS).length} frozen=${Object.isFrozen(CALORIE_COMBOS)}`);
  console.log(`THROW=${err ? 'yes' : 'no'} msg=${JSON.stringify(err && err.message)}`);
  console.log(`点名键=${err && err.message.includes(FAKE) ? 'yes' : 'no'}｜SKILL 写盘=${same ? 'none' : 'WRITTEN'}`);
  const ok = Boolean(err && err.message.includes(FAKE) && same);
  console.log('RESULT: defaultThrow=' + (ok ? 'ok' : 'FAIL'));
  return ok ? 0 : 1;
}

// ─────────────────────────────────────────────────────────── gen-e2e
function genE2e() {
  banner();
  const dir = join(TMP, 'pkg');
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  const src = readFileSync(BH, 'utf8');
  const importLine = "import { CALORIE_COMBOS } from '../dist/cli/keys.js';";
  if (!src.includes(importLine)) throw new Error('生成器 import 行已变，副本改写失败');
  writeFileSync(join(dir, 'scripts', 'build-help.mjs'), src.replace(importLine, "import { CALORIE_COMBOS } from './keys-plus.mjs';"), 'utf8');
  writeFileSync(join(dir, 'scripts', 'keys-plus.mjs'), `import { CALORIE_COMBOS as REAL } from ${JSON.stringify(pathToFileURL(KEYS).href)};
REAL['calorie.view.__red10_e2e_probe'] = { shape: 'view' };
export const CALORIE_COMBOS = REAL;
`, 'utf8');
  copyFileSync(SKILL, join(dir, 'SKILL.md'));
  const target = join(dir, 'SKILL.md');
  const before = fp(target);
  const r = spawnSync(process.execPath, [join(dir, 'scripts', 'build-help.mjs')], { cwd: ROOT, encoding: 'utf8' });
  const after = fp(target);
  const wrote = before.size !== after.size || before.sha256 !== after.sha256 || before.mtimeMs !== after.mtimeMs;
  const named = /缺 case：calorie\.view\.__red10_e2e_probe/.test((r.stderr || '') + (r.stdout || ''));
  console.log(`生成器 exit=${r.status}｜点名键=${named ? 'yes' : 'no'}｜副本 SKILL.md 被写=${wrote}`);
  const ok = r.status !== 0 && named && !wrote;
  console.log('RESULT: gen-e2e=' + (ok ? 'ok' : 'FAIL'));
  return ok ? 0 : 1;
}

// ─────────────────────────────────────────────────────────── seed-dep
function seedDep() {
  banner();
  const src = readFileSync(GATE, 'utf8');
  const abs = (p) => pathToFileURL(join(ROOT, p)).href;
  const out = src
    .replace("await import('./build-help.mjs')", `await import(${JSON.stringify(abs('packages/skill-calorie/scripts/build-help.mjs'))})`)
    .replace("await import('../dist/cli/keys.js')", `await import(${JSON.stringify(abs('packages/skill-calorie/dist/cli/keys.js'))})`)
    .replace("const SEED = join(ROOT, 'docs', 'research', 't81-seed.mjs');", "const SEED = join(ROOT, 'docs', 'research', '__red10_missing_seed.mjs');");
  if (out === src) throw new Error('门依赖行已变，副本改写失败');
  const copy = join(TMP, 'check-examples-no-seed.mjs');
  writeFileSync(copy, out, 'utf8');
  const r = spawnSync(process.execPath, [copy], { cwd: ROOT, encoding: 'utf8' });
  const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-1)[0] || '';
  console.log(`exit=${r.status}｜tail=${JSON.stringify(tail.slice(0, 160))}`);
  const ok = r.status === 2 && /门依赖不可用/.test(tail);
  console.log('RESULT: seed-dep=' + (ok ? 'explicit-fail(exit2)' : 'UNEXPECTED:' + r.status));
  return ok ? 0 : 1;
}

const SUBS = { premises, mutate, 'params-effect': paramsEffect, ismain, 'default-throw': defaultThrow, 'gen-e2e': genE2e, 'seed-dep': seedDep };

function runAll() {
  const order = ['premises', 'ismain', 'default-throw', 'gen-e2e', 'seed-dep', 'params-effect', 'mutate'];
  let worst = 0;
  for (const s of order) {
    console.log(`\n===== ${s} =====`);
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), s], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) worst = 1;
  }
  console.log('\nRESULT: all=' + (worst === 0 ? 'ok' : 'FAIL'));
  return worst;
}

try {
  let rc;
  if (cmd === 'all') rc = runAll();
  else if (cmd === 'help' || !SUBS[cmd]) {
    console.log('用法：node docs/research/t99-review-red-probe.mjs <' + Object.keys(SUBS).join('|') + '|all>');
    rc = cmd === 'help' ? 0 : 2;
  } else rc = await SUBS[cmd]();
  process.exit(rc);
} finally {
  try { rmSync(guard(TMP), { recursive: true, force: true }); } catch { /* 已在 params-effect 内清理 */ }
}
