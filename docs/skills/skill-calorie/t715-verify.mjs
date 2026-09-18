/**
 * #715 收工的机械自检（不写任何件，可反复跑）：
 *   ① `src/**` 与 `test/**` 里每一条相对 specifier 都解析到盘上真件（漏改的当场点名）；
 *   ② 代码面（`src`／`test`／`scripts`）里老址字面 `render/sportPortDocs` 命中 0 处；
 *   ③ 台账那一行的「件」列已改到新址（旧址 0 命中、新址 1 命中）。
 *
 * 用法：node .scratch/t715/verify.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = 'D:/ilife';
const PKG = join(ROOT, 'packages/skill-calorie');
const SRC = join(PKG, 'src');
const fails = [];

function walk(dir, filter, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules' && e !== 'dist') walk(p, filter, out); }
    else if (filter(p)) out.push(p);
  }
  return out;
}
const rel = (base, p) => relative(base, p).replace(/\\/g, '/');

/* ① 相对 specifier 全部解析得到 */
const SPEC_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
let specCount = 0;
for (const root of [SRC, join(PKG, 'test')]) {
  for (const f of walk(root, (p) => /\.(ts|mjs)$/.test(p))) {
    const text = readFileSync(f, 'utf8');
    SPEC_RE.lastIndex = 0;
    let m;
    while ((m = SPEC_RE.exec(text))) {
      const spec = m[1] ?? m[2];
      if (!spec.startsWith('.')) continue;
      specCount += 1;
      const base = dirname(f);
      const cand = [join(base, spec), join(base, spec.replace(/\.js$/, '.ts'))];
      if (!cand.some((c) => existsSync(c))) fails.push(`① ${rel(PKG, f)} → ${spec}`);
    }
  }
}
console.log(`① 相对 specifier 解析：${specCount} 条，未解析 ${fails.length} 条`);

/* ② 老址字面：**代码行必须归零**；`*` 开头的注释行里留着的那几处是**历史事实句**
 *（「#316 搬迁取自 `src/cli/cmd_read.ts` 的 case…」／「T351-v7 从 X 搬进 Y」），它记的就是老址，
 * 改了等于改历史——那几处逐条点名、如实记账，不判红。 */
const legacyCode = [];
const legacyComments = [];
for (const root of [SRC, join(PKG, 'test'), join(PKG, 'scripts')]) {
  for (const f of walk(root, (p) => /\.(ts|mjs|js)$/.test(p))) {
    const hits = readFileSync(f, 'utf8').split('\n')
      .map((line, i) => [i + 1, line])
      .filter(([, line]) => line.includes('render/sportPortDocs'));
    for (const [ln, line] of hits) {
      const t = line.trim();
      const commentish = t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
      (commentish ? legacyComments : legacyCode).push(`${rel(PKG, f)}:${ln}`);
    }
  }
}
if (legacyCode.length) fails.push(`② 代码行里仍有老址字面：${legacyCode.join('／')}`);
console.log(`② 老址字面：代码行 ${legacyCode.length} 处（要求 0）／注释行 ${legacyComments.length} 处（历史事实句，逐条记账）`);
for (const c of legacyComments) console.log(`     ${c}`);

/* ③ 台账那一行已改到新址 */
const agents = readFileSync(join(PKG, 'AGENTS.md'), 'utf8');
const oldLedger = agents.split('| `src/render/sportPortDocs.ts` |').length - 1;
const newLedger = agents.split('| `src/exercise/sportPortDocs.ts` |').length - 1;
console.log(`③ 台账「件」列：旧址 ${oldLedger} 行／新址 ${newLedger} 行`);
if (oldLedger !== 0 || newLedger !== 1) fails.push(`③ 台账「件」列不符：旧 ${oldLedger} 新 ${newLedger}`);

if (fails.length) { console.log('自检红：'); for (const f of fails) console.log('  - ' + f); process.exit(1); }
console.log('RESULT: 自检全绿（① 相对引用全解析 ② old 0 ③ 台账 1 行）');
