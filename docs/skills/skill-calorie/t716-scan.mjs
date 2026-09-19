/**
 * #716 开工/收工读数扫描（只读，不写源码、不碰真库、不持锁）。
 *
 * 三个计数器（口径照 #704 解决评论第五节，注明本脚本的取法）：
 *   ① 外面 → `src/render/` 的 import 行数（按深路径 / 经 barrel 分档）；主体＝`src/**` 里非 `render/` 的件。
 *   ② `src/render/` 反向 import 的能力目录数（不含 `shared/`；`../x/…` 形态）。
 *   ③ `src/render/` 自身件数与 LF。
 *   附：测试面（`test/**`）对 `dist/render/*` 的深路径引用行数（#716 票面点名的 3 行在此）。
 *
 * 用法：node .scratch/t716/scan.mjs [--tag 开工]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
/** `--pkg` 可指到 `git archive` 解出来的另一棵树：三个计数器按「谁提交点」分别算，才谈得上可归因。 */
const PKG = join(HERE, '..', '..', argOf('--pkg', 'packages/skill-calorie'));
const SRC = join(PKG, 'src');
const TEST = join(PKG, 'test');
const RENDER = join(SRC, 'render');
const tag = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : '读数';

const walk = (dir, ext, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs, ext, out);
    else if (e.isFile() && e.name.endsWith(ext)) out.push(abs);
  }
  return out;
};
const rel = (abs) => relative(PKG, abs).split(sep).join('/');
const lfOf = (abs) => readFileSync(abs, 'utf8').split('\n').length - 1;
/** 取一份件里全部模块说明符：`from '<spec>'` 的所有形态（含多行 import）＋ `import '<spec>'` 副作用式。 */
const importLines = (abs) => {
  const src = readFileSync(abs, 'utf8');
  const specs = [...src.matchAll(/\bfrom\s+'([^']+)'/g)].map((m) => m[1]);
  for (const m of src.matchAll(/^\s*import\s+'([^']+)'\s*;?/gm)) specs.push(m[1]);
  return specs;
};

/* ── ① 外面 → render/ ───────────────────────────────────────────────── */
const renderTs = new Set(walk(RENDER, '.ts').map(rel));
const outside = walk(SRC, '.ts').map(rel).filter((p) => !p.startsWith('src/render/'));
const deep = [];
const barrel = [];
const other = [];
for (const p of outside) {
  const dir = p.slice(0, p.lastIndexOf('/'));
  for (const spec of importLines(join(PKG, p))) {
    if (!spec.startsWith('.')) continue;
    let target = join(PKG, dir, spec);
    target = relative(PKG, target).split(sep).join('/').replace(/\.js$/, '.ts');
    if (!target.startsWith('src/render/')) continue;
    if (target === 'src/render/index.ts') barrel.push(`${p} -> ${spec}`);
    else if (renderTs.has(target)) deep.push(`${p} -> ${spec}`);
    else other.push(`${p} -> ${spec}`);
  }
}

/* ── ② render/ 反向能力目录 ────────────────────────────────────────── */
const reverseDirs = new Map();
for (const f of [...renderTs].sort()) {
  for (const spec of importLines(join(PKG, f))) {
    const m = /^\.\.\/([a-z0-9_-]+)\//.exec(spec);
    if (!m || m[1] === 'shared') continue;
    if (!reverseDirs.has(m[1])) reverseDirs.set(m[1], []);
    reverseDirs.get(m[1]).push(`${f} -> ${spec}`);
  }
}

/* ── ③ render/ 自身 ────────────────────────────────────────────────── */
const own = [...renderTs].sort().map((p) => ({ p, lf: lfOf(join(PKG, p)) }));

/* ── 附：测试面 → dist/render/ ─────────────────────────────────────── */
const testHits = [];
for (const t of walk(TEST, '.mjs').map(rel)) {
  for (const spec of importLines(join(PKG, t))) {
    if (/\.\.\/dist\/render\//.test(spec)) testHits.push(`${t} -> ${spec}`);
  }
}

console.log(`== #716 ${tag} ==`);
console.log(`① 外面(src/** 非 render) → render/  : 深路径 ${deep.length} 行 / 经 barrel ${barrel.length} 行 / 指向不存在 ${other.length} 行`);
console.log(`   经 barrel: ${barrel.join(' | ') || '（无）'}`);
if (other.length) console.log(`   游离: ${other.join(' | ')}`);
console.log(`② render/ → 能力目录（不含 shared）: ${reverseDirs.size} 个 —— ${[...reverseDirs.keys()].sort().join(', ')}`);
for (const [d, lines] of [...reverseDirs].sort()) console.log(`   ${d}: ${lines.length} 行`);
console.log(`③ src/render/ 自身: ${own.length} 件 / ${own.reduce((s, r) => s + r.lf, 0)} LF`);
console.log(`   逐件: ${own.map((r) => `${r.p.replace('src/render/', '')}=${r.lf}`).join(' ')}`);
console.log(`附 测试面 → dist/render/: ${testHits.length} 行`);
if (process.argv.includes('--dump')) {
  console.log('--- ① 逐行 ---');
  for (const d of deep.sort()) console.log('D ' + d);
  console.log('--- ② 逐行 ---');
  for (const [dir, lines] of [...reverseDirs].sort()) for (const l of lines) console.log('R ' + dir + ' ' + l);
}
for (const h of testHits) console.log(`   ${h}`);
