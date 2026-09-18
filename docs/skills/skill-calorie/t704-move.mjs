/**
 * #704 第一批搬迁（计划编辑器簇 ＋ 复制区接线六件 → `src/workout/`）的执行脚本。
 *
 * 口径：**原样搬家、一字不改**——只改「住在哪个目录」与「引用它的路径怎么写」，
 * 页面可见产物必须逐字节不变（判据见 `regen.mjs` 出来的 `基线.json`）。
 *
 * 断言（任一不过即抛错、不落盘）：
 *   ① 每个待改锚点的命中次数等于声明次数（多一处少一处都停）；
 *   ② 搬完以后，`src/**` 里每一条相对 specifier 都能解析到盘上真件（漏改的当场点名）。
 *
 * 用法：node .scratch/t704/move.mjs [--dry]
 */
import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const ROOT = 'D:/ilife';
const SRC = join(ROOT, 'packages/skill-calorie/src');
const DRY = process.argv.includes('--dry');

/** 六件：`src/render/` → `src/workout/`（同层搬迁，故对 `../shared/` 一类相对路径无影响）。 */
const MOVES = [
  ['src/render/planEditorPort.ts', 'src/workout/planEditorPort.ts'],
  ['src/render/planEditorDocs.ts', 'src/workout/planEditorDocs.ts'],
  ['src/render/planEditor.ts', 'src/workout/planEditor.ts'],
  ['src/render/planEditorCss.ts', 'src/workout/planEditorCss.ts'],
  ['src/render/planEditorRuntime.ts', 'src/workout/planEditorRuntime.ts'],
  ['src/render/planCopyBlock.ts', 'src/workout/planCopyBlock.ts'],
];

/** 逐条改写的 specifier：`file` 一律写**搬完以后**的包内相对路径。 */
const EDITS = [
  // ── 搬走的那六件自己的出向引用 ────────────────────────────────
  ['src/workout/planEditorPort.ts', "'../workout/precheckPrompt.js'", "'./precheckPrompt.js'", 1],
  ['src/workout/planEditorPort.ts', "'../workout/planStore.js'", "'./planStore.js'", 1],
  ['src/workout/planEditorPort.ts', "'./planPlate.js'", "'../render/planPlate.js'", 1],
  ['src/workout/planEditorDocs.ts', "'./pageChromeCss.js'", "'../render/pageChromeCss.js'", 1],
  ['src/workout/planEditorDocs.ts', "'./receipt.js'", "'../render/receipt.js'", 1],
  ['src/workout/planCopyBlock.ts', "'./copy.js'", "'../render/copy.js'", 1],
  // ── 外面引用这六件的地方（生产） ──────────────────────────────
  ['src/workout/commands.ts', "'../render/planEditorPort.js'", "'./planEditorPort.js'", 1],
  ['src/workout/landBatchPages.ts', "'../render/planCopyBlock.js'", "'./planCopyBlock.js'", 1],
  ['src/workout/landPages.ts', "'../render/planCopyBlock.js'", "'./planCopyBlock.js'", 1],
  ['src/workout/receipt.ts', '../render/planCopyBlock.js', './planCopyBlock.js', 2],
  ['src/workout/xunjiBackfill.ts', "'../render/planCopyBlock.js'", "'./planCopyBlock.js'", 1],
  ['src/workout/xunjiPush.ts', "'../render/planCopyBlock.js'", "'./planCopyBlock.js'", 1],
  ['src/render/planWizardDocs.ts', "'./planCopyBlock.js'", "'../workout/planCopyBlock.js'", 1],
  ['src/render/workoutPlanDocs.ts', "'./planCopyBlock.js'", "'../workout/planCopyBlock.js'", 1],
  // ── 外面引用这六件的地方（测试：深路径跟着 dist 目录走） ──────
  ['test/preset-catalog.test.mjs', "'../dist/render/planEditorPort.js'", "'../dist/workout/planEditorPort.js'", 1],
  ['test/t550-复制日志场景标识.test.mjs', "'../dist/render/planCopyBlock.js'", "'../dist/workout/planCopyBlock.js'", 1],
];

const abs = (p) => join(ROOT, 'packages/skill-calorie', p);
const countOf = (s, needle) => s.split(needle).length - 1;
/** 编辑表写的是**搬完以后**的路径；预检要拿**搬前**的盘上文件。 */
const postToPre = new Map(MOVES.map(([from, to]) => [to, from]));

// ── 第一步：锚点预检（命中次数必须等于声明次数） ───────────────────
const problems = [];
for (const [file, find, , want] of EDITS) {
  const p = abs(postToPre.get(file) ?? file);
  if (!existsSync(p)) { problems.push(`目标件不在盘上：${postToPre.get(file) ?? file}`); continue; }
  const n = countOf(readFileSync(p, 'utf8'), find);
  if (n !== want) problems.push(`${file}：锚点 ${find} 命中 ${n} 处，声明 ${want} 处`);
}
for (const [from, to] of MOVES) {
  if (!existsSync(abs(from))) problems.push(`待搬件不在盘上：${from}`);
  if (existsSync(abs(to))) problems.push(`落点已被占用：${to}`);
}
if (problems.length) {
  console.log('预检不过，不落盘：');
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log(`预检通过：搬 ${MOVES.length} 件；改 ${EDITS.length} 条锚点（共 ${EDITS.reduce((a, e) => a + e[3], 0)} 行）`);

if (DRY) {
  for (const [f, a, b] of EDITS) console.log(`  EDIT ${f}  ${a} → ${b}`);
  for (const [f, t] of MOVES) console.log(`  MOVE ${f} → ${t}`);
  process.exit(0);
}

// ── 第二步：搬件 ────────────────────────────────────────────────
for (const [from, to] of MOVES) renameSync(abs(from), abs(to));

// ── 第三步：改引用 ──────────────────────────────────────────────
for (const [file, find, repl, want] of EDITS) {
  const p = abs(file);
  const before = readFileSync(p, 'utf8');
  const n = countOf(before, find);
  if (n !== want) { console.log(`改了才发现的偏差：${file} 命中 ${n} !== ${want}`); process.exit(1); }
  writeFileSync(p, before.split(find).join(repl));
  console.log(`  EDIT ${file}  ${find} → ${repl}（${want} 处）`);
}

// ── 第四步：全 src 自检——每条相对 specifier 都要能解析到盘上真件 ──
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
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
console.log('自检绿：src 下每一条相对 specifier 都解析到盘上真件');
console.log(`RESULT: 搬 ${MOVES.length} 件；改 ${EDITS.length} 条锚点`);
