/**
 * #79 审查席 1（红队）· lockstep 断言**变异自证**（交付席的 §8 之外，本席独立重跑）。
 *
 * 原则：变异与还原都在**同一次持锁**内完成（`run-locked --ticket 79 -- node 本脚本`），
 * 逐字节备份／还原，每步打印 sha256 自证，绝不留下 MUT 痕迹。
 *
 * CLI：
 *   node docs/research/t79-review-red-mutate.mjs all     # 全序列（MUT-1..4 + 还原自证）
 *   node docs/research/t79-review-red-mutate.mjs show     # 只打印基线版本与 sha256
 *   node docs/research/t79-review-red-mutate.mjs residue  # 扫 MUT-\d 残留
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (p) => relative(root, p).replace(/\\/g, '/');
const TARGETS = {
  combos: join(root, 'packages/base-combos/package.json'),
  core: join(root, 'packages/base-link-core/package.json'),
  render: join(root, 'packages/base-render/package.json'),
  changeset: join(root, '.changeset/config.json'),
  bill: join(root, 'packages/skill-bill/package.json'),
};
const TEST = 'packages/base-render/test/base-version-lockstep.test.mjs';
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', ...opts });
  return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};

const state = () => Object.fromEntries(Object.entries(TARGETS).map(([k, p]) => [k, { path: rel(p), sha: sha(readFileSync(p)), version: JSON.parse(readFileSync(p, 'utf8')).version ?? null }]));
const show = (tag) => {
  const s = state();
  console.log(`${tag} sha256: ` + Object.entries(s).map(([k, v]) => `${k}=${v.sha.slice(0, 16)}${v.version ? `@${v.version}` : ''}`).join(' '));
  return s;
};

/** 变异：对目标文件做**唯一**文本替换；备份原始字节到内存并落一份 .mut-bak（用完即删）。 */
function mutate(key, from, to) {
  const p = TARGETS[key];
  const before = readFileSync(p);
  const text = before.toString('utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`变异锚点必须唯一：${key} 「${from}」命中 ${n} 次`);
  writeFileSync(`${p}.mut-bak`, before);
  writeFileSync(p, Buffer.from(text.replace(from, to), 'utf8'));
  const after = readFileSync(p);
  return { before: sha(before), after: sha(after) };
}
function restore(key) {
  const p = TARGETS[key];
  const bak = `${p}.mut-bak`;
  if (!existsSync(bak)) throw new Error(`缺备份：${bak}`);
  const orig = readFileSync(bak);
  writeFileSync(p, orig);
  unlinkSync(bak);
  return { restored: sha(readFileSync(p)), expect: sha(orig) };
}

/** 变异（正则版）：整块替换，锚点必须唯一命中。 */
function mutateRe(key, re, to) {
  const p = TARGETS[key];
  const before = readFileSync(p);
  const text = before.toString('utf8');
  const hits = [...text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))];
  if (hits.length !== 1) throw new Error(`变异锚点必须唯一：${key} ${re} 命中 ${hits.length} 次`);
  writeFileSync(`${p}.mut-bak`, before);
  writeFileSync(p, Buffer.from(text.replace(re, to), 'utf8'));
  return { before: sha(before), after: sha(readFileSync(p)) };
}

function lockstepTest(label) {
  const r = run('node', ['--test', TEST]);
  const pass = /\bpass (\d+)/.exec(r.out)?.[1];
  const fail = /\bfail (\d+)/.exec(r.out)?.[1];
  const failing = [...r.out.matchAll(/not ok \d+ - (.+)/g)].map((m) => m[1].trim());
  console.log(`MUT-RESULT ${label} exit=${r.status} pass=${pass ?? '?'} fail=${fail ?? '?'} failing=${JSON.stringify(failing)}`);
  const msg = /base-\* 三包版本必须一致，实得：[^\n]*/.exec(r.out)?.[0]
    ?? /fixed 组必须恰含[^\n]*/.exec(r.out)?.[0]
    ?? /与工作区版本 [^\n]*不同版本线/.exec(r.out)?.[0];
  if (msg) console.log(`MUT-MESSAGE ${label} ${msg}`);
  return r;
}

const mode = process.argv[2] ?? 'show';

if (mode === 'residue') {
  const hits = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(json|md|mjs|ts|yaml|yml|txt)$/.test(e.name) && statSync(p).size < 4e6) {
        const t = readFileSync(p, 'utf8');
        if (/MUT-\d/.test(t)) hits.push(rel(p));
      }
    }
  };
  walk(root);
  console.log('MUT-RESIDUE-SCAN ' + JSON.stringify(hits));
  const baks = Object.values(TARGETS).filter((p) => existsSync(`${p}.mut-bak`));
  console.log('MUT-BAK-FILES ' + JSON.stringify(baks.map(rel)));
  process.exit(0);
}

if (mode === 'show') { show('BASE'); process.exit(0); }

/* ---------- all ---------- */
const base = show('BASE');

// ---- MUT-1：base-combos version 0.2.0 → 0.1.0（交付席 §8 的同型变异，本席独立重跑） ----
console.log('--- MUT-1 base-combos version 0.2.0 -> 0.1.0');
let m = mutate('combos', '"version": "0.2.0"', '"version": "0.1.0"');
console.log(`MUT-1-APPLIED before=${m.before.slice(0, 16)} mutated=${m.after.slice(0, 16)}`);
const b1 = run('pnpm', ['build']);
console.log(`MUT-1-BUILD exit=${b1.status}`);
lockstepTest('MUT-1-TEST');
let r1 = restore('combos');
console.log(`MUT-1-RESTORED restored=${r1.restored.slice(0, 16)} expect=${r1.expect.slice(0, 16)} byteEqual=${r1.restored === r1.expect}`);
const b1r = run('pnpm', ['build']);
console.log(`MUT-1-REBUILD exit=${b1r.status}`);
lockstepTest('MUT-1-TEST-AFTER-RESTORE');

// ---- MUT-2：changeset fixed 组清空 ----
console.log('--- MUT-2 changeset fixed -> []');
m = mutateRe('changeset', /"fixed":\s*\[[\s\S]*?\n\s*\],/, '"fixed": [],');
console.log(`MUT-2-APPLIED before=${m.before.slice(0, 16)} mutated=${m.after.slice(0, 16)}`);
lockstepTest('MUT-2-TEST');
let r2 = restore('changeset');
console.log(`MUT-2-RESTORED restored=${r2.restored.slice(0, 16)} expect=${r2.expect.slice(0, 16)} byteEqual=${r2.restored === r2.expect}`);
lockstepTest('MUT-2-TEST-AFTER-RESTORE');

// ---- MUT-3：base-combos 依赖范围退回 workspace:^0.1.0 ----
console.log('--- MUT-3 base-combos dep workspace:^0.2.0 -> workspace:^0.1.0');
m = mutate('combos', '"base-link-core": "workspace:^0.2.0"', '"base-link-core": "workspace:^0.1.0"');
console.log(`MUT-3-APPLIED before=${m.before.slice(0, 16)} mutated=${m.after.slice(0, 16)}`);
lockstepTest('MUT-3-TEST');
let r3 = restore('combos');
console.log(`MUT-3-RESTORED restored=${r3.restored.slice(0, 16)} expect=${r3.expect.slice(0, 16)} byteEqual=${r3.restored === r3.expect}`);

// ---- MUT-4（找盲区）：skill-bill 的 base-link-core 退回 ^0.1.0，lockstep 是否察觉 ----
console.log('--- MUT-4（盲区探针）skill-bill base-link-core ^0.2.0 -> ^0.1.0');
m = mutate('bill', '"base-link-core": "^0.2.0"', '"base-link-core": "^0.1.0"');
console.log(`MUT-4-APPLIED before=${m.before.slice(0, 16)} mutated=${m.after.slice(0, 16)}`);
lockstepTest('MUT-4-LOCKSTEP-TEST');
const fl = run('pnpm', ['install', '--frozen-lockfile']);
console.log(`MUT-4-FROZEN-LOCKFILE exit=${fl.status} tail=${JSON.stringify(fl.out.slice(-400))}`);
let r4 = restore('bill');
console.log(`MUT-4-RESTORED restored=${r4.restored.slice(0, 16)} expect=${r4.expect.slice(0, 16)} byteEqual=${r4.restored === r4.expect}`);

// ---- 终态自证 ----
const end = show('FINAL');
let allEqual = true;
for (const k of Object.keys(TARGETS)) if (base[k].sha !== end[k].sha) { allEqual = false; console.log(`FINAL-DIFF ${k} ${base[k].sha} -> ${end[k].sha}`); }
console.log(`FINAL-BYTE-IDENTICAL ${allEqual}`);
const baks = Object.values(TARGETS).filter((p) => existsSync(`${p}.mut-bak`));
console.log(`FINAL-BAK-LEFT ${JSON.stringify(baks.map(rel))}`);
lockstepTest('FINAL-TEST');
