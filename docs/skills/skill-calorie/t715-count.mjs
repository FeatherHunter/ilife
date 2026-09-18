/**
 * #715 票面四个计数器的量法（开工／收工各跑一次，两边口径必须逐字相同）。
 *
 * 量的是**源码面**，三个读数：
 *   ① 外面 → `render/` 深路径 import 行数——`src/**` 里（`render/` 自身除外）指向 `../render/<件>` 的
 *      `import … from` 行；**不含**走 barrel（`../render/index.js`）的那条（票面「深路径」口径）。
 *   ② `render/` → 能力目录数——`render/**` 里 import 到的第一层兄弟目录（`../<能力>/`），`shared` 不计
 *      （共用位不是能力目录）；`render` 自身不计。
 *   ③ `render/` 自身件数与 LF（LF 口径＝只数 `\n`）。
 *
 * 另加一条**件级**读数（不是票面要求的，是本票自身要交代的）：被搬的那一件的 LF。
 *
 * 用法：node .scratch/t715/count.mjs [--src <源码根>] [--label <标签>]
 *   `--src` 指到一份 `src` 目录（当刻树＝`packages/skill-calorie/src`；
 *   开窗源码面＝用 `git archive` 取出来后解出来的那份）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'D:/ilife';
const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const SRC = join(ROOT, argOf('--src', 'packages/skill-calorie/src'));
const LABEL = argOf('--label', '当刻');

const CAPABILITY = /^\.\.\/([^/.][^/]*)\//;              // ../<目录>/…
const SPEC_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function walk(dir, filter, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules' && e !== 'dist') walk(p, filter, out); }
    else if (filter(p)) out.push(p);
  }
  return out;
}
const rel = (p) => relative(SRC, p).replace(/\\/g, '/');
const lfOf = (p) => (readFileSync(p, 'utf8').match(/\n/g) ?? []).length;

const tsFiles = walk(SRC, (p) => p.endsWith('.ts'));
const renderFiles = tsFiles.filter((p) => rel(p).startsWith('render/'));

/* ① 外面 → render/ 深路径 import 行数 */
let deepLines = 0;
const deepDetail = [];
for (const f of tsFiles) {
  if (rel(f).startsWith('render/')) continue;
  const lines = readFileSync(f, 'utf8').split('\n');
  for (const line of lines) {
    const m = /^\s*(?:import|export)[\s\S]*?from\s*['"](\.\.\/render\/(?!index\.js)[^'"]+)['"]/.exec(line)
      ?? /^\s*import\(\s*['"](\.\.\/render\/(?!index\.js)[^'"]+)['"]\s*\)/.exec(line);
    if (m) { deepLines += 1; deepDetail.push(`${rel(f)}: ${m[1]}`); }
  }
}

/* ② render/ → 能力目录数 */
const caps = new Set();
const capDetail = [];
for (const f of renderFiles) {
  const text = readFileSync(f, 'utf8');
  SPEC_RE.lastIndex = 0;
  let m;
  while ((m = SPEC_RE.exec(text))) {
    const spec = m[1] ?? m[2];
    if (!spec || !spec.startsWith('.')) continue;
    const hit = CAPABILITY.exec(spec);
    if (!hit) continue;
    const name = hit[1];
    if (name === 'shared' || name === 'render') continue;
    caps.add(name);
    capDetail.push(`${rel(f)}: ${spec}`);
  }
}

/* ③ render/ 自身 */
const renderLf = renderFiles.reduce((a, p) => a + lfOf(p), 0);

console.log(`【${LABEL}】src=${SRC.replace(/\\/g, '/').replace(ROOT.replace(/\\/g, '/') + '/', '')}`);
console.log(`① 外面 → render/ 深路径 import 行数 = ${deepLines}`);
console.log(`② render/ → 能力目录数 = ${caps.size}（${[...caps].sort().join('／')}）`);
console.log(`③ render/ 自身 = ${renderFiles.length} 件／${renderLf} LF`);
for (const cand of ['render/sportPortDocs.ts', 'exercise/sportPortDocs.ts']) {
  const p = join(SRC, cand);
  try { console.log(`④ ${cand} = ${lfOf(p)} LF`); } catch { /* 不在这一侧，正常 */ }
}
if (process.argv.includes('--detail')) {
  console.log('--- ① 明细 ---'); for (const d of deepDetail) console.log('  ' + d);
  console.log('--- ② 明细（按件） ---'); for (const d of capDetail) console.log('  ' + d);
}
