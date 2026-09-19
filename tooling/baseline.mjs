#!/usr/bin/env node
/**
 * tooling/baseline.mjs —— 基线指纹（#327 其二）："开窗存／收窗比"两行命令。
 * 存＝源码 tree sha＋派生面指纹＋冻结文件结果；比＝逐项对照并报差异面。
 * 只读输入、只报结论，不替人执行。
 * 用法：--save <基线.json> ｜ --compare <基线.json> ｜ --help（可加 --root）。
 * 路径清单每次从当刻树派生：源码＝`git ls-files` **取盘上真实存在者**（「已删未提交」的件
 * 仍在索引里但盘上已无，直读会 ENOENT ⇒ 见 `sourceList` 的说明）；派生面＝递归枚举 dist（含
 * .gen-inputs.json，另单列一行）；冻结面＝枚举 triggers/scene-*.ts＋冻结测试。
 * 基线形状：{version,savedAt,source:{tree,files},dist:{tree,files},
 * genInputs:{sha|null},frozen:{files}}；比对只查基线里有的面。退出码：0 一致；
 * 1 有差异／不可读；2 用法错。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIST_DIR = 'packages/skill-calorie/dist';
export const GEN_INPUTS = 'packages/skill-calorie/dist/.gen-inputs.json';
export const FROZEN_TEST = 'test/calorie-routing-81.test.mjs';
export const FROZEN_TRIGGERS_DIR = 'packages/skill-calorie/src/triggers';
const posix = (p) => p.split(path.sep).join('/');

export const shaFile = (abs) => createHash('sha256').update(fs.readFileSync(abs)).digest('hex');

/**
 * 源面路径清单：取**盘上真实存在**的受跟踪件。
 *
 * ⚠️ 为什么不直接用 `git ls-files`：它列的是**索引**，而「已删、未提交」的件仍在索引里、盘上已无。
 * `saveBaseline` 随后要对每个路径 `shaFile()` 直读 ⇒ 撞上这种件就 `ENOENT` 抛错，
 * **整个工具当场不可用**（不是报差异，是崩）。多席共用工作区里别席的未提交删除是常态，
 * 故这里按存在性过滤，让「索引有、盘上无」如实表现为**该件不在源面**（其删除正是 `--compare` 要报的差异）。
 * 复现与出处：`docs/skills/skill-calorie/t715-搬家-证据.md` §4.4（票 #715 实测）。
 */
export function sourceList(root) {
  const r = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'buffer' });
  if (r.status !== 0) throw new Error('git ls-files 失败（须在 git 仓库内运行）');
  return r.stdout.toString('utf8').split('\0').filter(Boolean)
    .map((s) => s.replace(/\\/g, '/'))
    .filter((p) => fs.existsSync(path.join(root, p)));
}

export const treeHash = (entries) => createHash('sha256').update([...entries].sort().join('\n')).digest('hex');

export function hashDir(root, dir) {
  const out = {};
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.isFile()) out[posix(path.relative(root, f))] = shaFile(f);
    }
  };
  walk(abs);
  return out;
}

export function saveBaseline(root) {
  const src = sourceList(root);
  const dist = hashDir(root, DIST_DIR);
  const genAbs = path.join(root, GEN_INPUTS);
  const frozen = {};
  const trigAbs = path.join(root, FROZEN_TRIGGERS_DIR);
  if (fs.existsSync(trigAbs)) {
    for (const n of fs.readdirSync(trigAbs).filter((n) => /^scene-.*\.ts$/.test(n))) {
      frozen[posix(path.join(FROZEN_TRIGGERS_DIR, n))] = shaFile(path.join(trigAbs, n));
    }
  }
  if (fs.existsSync(path.join(root, FROZEN_TEST))) frozen[FROZEN_TEST] = shaFile(path.join(root, FROZEN_TEST));
  return {
    version: 1, savedAt: new Date().toISOString(), root: path.resolve(root),
    source: { tree: treeHash(src.map((p) => `${shaFile(path.join(root, p))} ${p}`)), files: src.length },
    dist: { dir: DIST_DIR, tree: treeHash(Object.entries(dist).map(([p, s]) => `${s} ${p}`)), files: dist },
    genInputs: { path: GEN_INPUTS, sha: fs.existsSync(genAbs) ? shaFile(genAbs) : null },
    frozen: { files: frozen },
  };
}

export function compareBaseline(base, root) {
  if (!base || typeof base !== 'object' || base.version !== 1) throw new Error('基线形状不对（须含 version:1）');
  const now = saveBaseline(root);
  const notes = [], diffs = [];
  if (base.source) {
    if (now.source.tree === base.source.tree) notes.push('source：一源 tree 一致');
    else diffs.push(`差异面 source：tree ${base.source.tree}→${now.source.tree}（文件数 ${base.source.files}→${now.source.files}）`);
  } else notes.push('source：基线无此面，跳过');
  if (base.dist) {
    const b = base.dist.files || {}, n = now.dist.files;
    let ok = true;
    for (const [p, s] of Object.entries(b)) {
      if (!(p in n)) { diffs.push(`差异面 dist：删除 ${p}`); ok = false; }
      else if (n[p] !== s) { diffs.push(`差异面 dist：变化 ${p}`); ok = false; }
    }
    if (ok && base.dist.tree && now.dist.tree !== base.dist.tree) {
      diffs.push(`差异面 dist：清单外文件有增减（tree ${base.dist.tree}→${now.dist.tree}）`);
      ok = false;
    }
    if (ok) notes.push('dist：派生面一致');
  } else notes.push('dist：基线无此面，跳过');
  if (base.genInputs) {
    if (now.genInputs.sha === base.genInputs.sha) notes.push('dist（.gen-inputs.json）：一致');
    else diffs.push(`差异面 dist（.gen-inputs.json）：${base.genInputs.sha}→${now.genInputs.sha}`);
  }
  if (base.frozen) {
    const b = base.frozen.files || {}, n = now.frozen.files;
    let ok = true;
    for (const [p, s] of Object.entries(b)) {
      if (!(p in n)) { diffs.push(`差异面 frozen：缺失 ${p}`); ok = false; }
      else if (n[p] !== s) { diffs.push(`差异面 frozen：变化 ${p}`); ok = false; }
    }
    if (ok) notes.push('frozen：冻结文件一致');
  } else notes.push('frozen：基线无此面，跳过');
  return { notes, diffs };
}

function usage() {
  const m = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//);
  return m ? m[1].replace(/^\s*\*?/gm, '').trim() : 'baseline.mjs';
}

function main(argv) {
  let mode = '', file = '', root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { console.log(usage()); return 0; }
    else if (a === '--save' || a === '--compare') { mode = a.slice(2); file = argv[++i] ?? ''; }
    else if (a === '--root') { root = argv[++i] ?? ''; }
    else { console.error(`FAIL: 未知参数：${a}。用法见 --help`); return 2; }
  }
  if (!mode || !file) { console.error('FAIL: 须给 --save <文件> 或 --compare <文件>。用法见 --help'); return 2; }
  const out = path.resolve(path.resolve(root), file);
  if (mode === 'save') {
    let base;
    try { base = saveBaseline(path.resolve(root)); }
    catch (err) { console.error(`FAIL: ${err.message}`); return 1; }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(base, null, 2)}\n`, 'utf8');
    console.log(`baseline: SAVED ${out}（源码 ${base.source.files} 件／派生 ${Object.keys(base.dist.files).length} 件／冻结 ${Object.keys(base.frozen.files).length} 件）`);
    return 0;
  }
  let base;
  try { base = JSON.parse(fs.readFileSync(out, 'utf8')); }
  catch { console.error(`FAIL: 基线文件不可读或非 JSON：${out}`); return 1; }
  let r;
  try { r = compareBaseline(base, path.resolve(root)); }
  catch (err) { console.error(`FAIL: ${err.message}`); return 1; }
  for (const n of r.notes) console.log(`  - ${n}`);
  for (const d of r.diffs) console.error(`FAIL: ${d}`);
  console.log(`baseline: ${r.diffs.length === 0 ? 'PASS' : 'FAIL'}（差异 ${r.diffs.length} 项）`);
  return r.diffs.length === 0 ? 0 : 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error(`FAIL: ${err.message}`); process.exit(1); }
}
