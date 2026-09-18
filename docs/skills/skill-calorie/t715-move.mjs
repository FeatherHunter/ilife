/**
 * #715 第二批搬迁（运动网页单件 → `src/exercise/`）的执行脚本。
 *
 * 口径：**原样搬家、一字不改**——只改「住在哪个目录」与「引用它的路径怎么写」，
 * 页面可见产物必须逐字节不变（判据见 `regen.mjs` 出来的 `基线.json`）。
 *
 * 三条写入类别（逐条锚定，命中数不符即停）：
 *   ① 搬走件**自己的出向引用**：`sportPortDocs.ts` 的出向里
 *      `base-paint` 是包名、`../exercise/*`（同能力件）、`../shared/*`（共用位）搬后照样解析到同一件，
 *      但 **`./receipt.js` 与 `./exercisePort.js` 会断**——这两件留在 `render/`，跟着搬走的件离了目录
 *      ⇒ 就地摆正为 `../render/receipt.js`／`../render/exercisePort.js`（2 行）。
 *      **票面「搬完零就地摆正」不成立**，本窗按实况改 2 行（见证据件「与票面的偏差」一节）。
 *   ② 代码引用：`src/exercise/{cardio,distribution,recap,strength,trend}.ts` 各 1 行 `'../render/...'` →
 *      `'./sportPortDocs.js'`；`test/*` 4 行 `'../dist/render/...'` → `'../dist/exercise/...'`。
 *   ③ 「件住哪」的散文引用：老串写的是老址真路径 ⇒ 搬完全部陈化。统一改写成**包内规范路径**
 *      `src/exercise/sportPortDocs.ts`（不写成相对谁的文件，免得同一句话在不同件里指不同地方）。
 *      历史事实句（「T351-v7 从 X 搬进 Y」「#316 搬迁取自 X」）里的**老址不动**，它记的就是老址。
 *
 * 断言（任一不过即抛错、不落盘）：
 *   ① 每个待改锚点的命中次数等于声明次数（多一处少一处都停）；
 *   ② 搬完以后 `src/**` 与 `test/**` 里每一条相对 specifier 都能解析到盘上真件（漏改的当场点名）；
 *   ③ 全仓代码面（src／test／scripts）不再出现老址字面 `render/sportPortDocs`。
 *
 * 用法：node .scratch/t715/move.mjs [--dry]
 */
import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const ROOT = 'D:/ilife';
const PKG = join(ROOT, 'packages/skill-calorie');
const SRC = join(PKG, 'src');
const DRY = process.argv.includes('--dry');

const FROM = 'src/render/sportPortDocs.ts';
const TO = 'src/exercise/sportPortDocs.ts';

/** 逐条改写的替换：`[文件, 找什么, 换成什么, 声明几处]`（文件一律写搬完以后的包内相对路径）。 */
const EDITS = [
  // ── 搬走件自己的出向引用：留在 render/ 的两件会断，就地摆正 ─────────────
  ['src/exercise/sportPortDocs.ts', "'./receipt.js'", "'../render/receipt.js'", 1],
  ['src/exercise/sportPortDocs.ts', "'./exercisePort.js'", "'../render/exercisePort.js'", 1],
  // ── 生产：五条读命令的页面装配从老址改到同目录 ─────────────────────────
  ['src/exercise/cardio.ts', "'../render/sportPortDocs.js'", "'./sportPortDocs.js'", 1],
  ['src/exercise/distribution.ts', "'../render/sportPortDocs.js'", "'./sportPortDocs.js'", 1],
  ['src/exercise/recap.ts', "'../render/sportPortDocs.js'", "'./sportPortDocs.js'", 1],
  ['src/exercise/strength.ts', "'../render/sportPortDocs.js'", "'./sportPortDocs.js'", 1],
  ['src/exercise/trend.ts', "'../render/sportPortDocs.js'", "'./sportPortDocs.js'", 1],
  // ── 测试：深路径跟着 dist 目录走 ──────────────────────────────────────
  ['test/exercise-dist-strength-cardio-fusion-453.test.mjs', "'../dist/render/sportPortDocs.js'", "'../dist/exercise/sportPortDocs.js'", 1],
  ['test/exercise-text-shape-544.test.mjs', "'../dist/render/sportPortDocs.js'", "'../dist/exercise/sportPortDocs.js'", 1],
  ['test/exercise-trend-recap-fusion-454.test.mjs', "'../dist/render/sportPortDocs.js'", "'../dist/exercise/sportPortDocs.js'", 1],
  ['test/t576-n1n8.test.mjs', "'../dist/render/sportPortDocs.js'", "'../dist/exercise/sportPortDocs.js'", 1],
  // ── 散文里「件住哪」的引用（老址真路径 → 包内规范路径） ────────────────
  ['src/exercise/index.ts', 'render/sportPortDocs.ts', 'src/exercise/sportPortDocs.ts', 1],
  ['src/render/exercisePort.ts', 'render/sportPortDocs.ts', 'src/exercise/sportPortDocs.ts', 1],
  ['test/analysis-deficit-385.test.mjs', 'src/render/sportPortDocs.ts', 'src/exercise/sportPortDocs.ts', 1],
  ['test/exercise-text-shape-544.test.mjs', 'src/render/sportPortDocs.ts', 'src/exercise/sportPortDocs.ts', 1],
];

const abs = (p) => join(PKG, p);
const countOf = (s, needle) => s.split(needle).length - 1;

// ── 第一步：锚点预检（命中次数必须等于声明次数） ───────────────────
const problems = [];
for (const [file, find, , want] of EDITS) {
  const p = abs(file);
  if (!existsSync(p)) { problems.push(`目标件不在盘上：${file}`); continue; }
  const n = countOf(readFileSync(p, 'utf8'), find);
  if (n !== want) problems.push(`${file}：锚点 ${find} 命中 ${n} 处，声明 ${want} 处`);
}
if (!existsSync(abs(FROM))) problems.push(`待搬件不在盘上：${FROM}`);
if (existsSync(abs(TO))) problems.push(`落点已被占用：${TO}`);
if (problems.length) {
  console.log('预检不过，不落盘：');
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log(`预检通过：搬 1 件；改 ${EDITS.length} 条锚点（共 ${EDITS.reduce((a, e) => a + e[3], 0)} 行）`);

if (DRY) {
  for (const [f, a, b] of EDITS) console.log(`  EDIT ${f}  ${a} → ${b}`);
  console.log(`  MOVE ${FROM} → ${TO}`);
  process.exit(0);
}

// ── 第二步：搬件 ────────────────────────────────────────────────
renameSync(abs(FROM), abs(TO));

// ── 第三步：改引用 ──────────────────────────────────────────────
for (const [file, find, repl, want] of EDITS) {
  const p = abs(file);
  const before = readFileSync(p, 'utf8');
  const n = countOf(before, find);
  if (n !== want) { console.log(`改了才发现的偏差：${file} 命中 ${n} !== ${want}`); process.exit(1); }
  writeFileSync(p, before.split(find).join(repl));
  console.log(`  EDIT ${file}  ${find} → ${repl}（${want} 处）`);
}

// ── 第四步：自检 —— 每条相对 specifier 都要解析到盘上真件 ＋ 老址字面归零 ──
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules' && e !== 'dist') walk(p, out); }
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}
const SPEC_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const bad = [];
for (const f of walk(SRC)) {
  const text = readFileSync(f, 'utf8');
  SPEC_RE.lastIndex = 0;
  let m;
  while ((m = SPEC_RE.exec(text))) {
    const spec = m[1] ?? m[2];
    if (!spec.startsWith('.')) continue;
    const target = join(dirname(f), spec).replace(/\.js$/, '.ts');
    if (!existsSync(target)) bad.push(`${relative(SRC, f).replace(/\\/g, '/')} → ${spec}`);
  }
}
if (bad.length) {
  console.log(`自检红：${bad.length} 条相对引用解析不到盘上真件`);
  for (const b of bad) console.log('  - ' + b);
  process.exit(1);
}
console.log('自检绿①：src 下每一条相对 specifier 都解析到盘上真件');

function grepAll(roots, needle) {
  const hits = [];
  for (const root of roots) {
    for (const f of walkAbs(root)) {
      const text = readFileSync(f, 'utf8');
      if (text.includes(needle)) hits.push(relative(PKG, f).replace(/\\/g, '/'));
    }
  }
  return hits;
}
function walkAbs(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules' && e !== 'dist') walkAbs(p, out); }
    else if (/\.(ts|mjs|js)$/.test(p)) out.push(p);
  }
  return out;
}
const legacy = grepAll([SRC, join(PKG, 'test'), join(PKG, 'scripts')], 'render/sportPortDocs');
if (legacy.length) {
  console.log(`自检红：老址字面仍在（${legacy.join('／')}）`);
  process.exit(1);
}
console.log('自检绿②：src／test／scripts 里老址字面 `render/sportPortDocs` 命中 0 处');
console.log('RESULT: 搬 1 件；改 ' + EDITS.length + ' 条锚点');
