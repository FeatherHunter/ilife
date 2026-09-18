/**
 * #714 · 票面「开工与收工各记一次读数」的三个计数器。
 *
 * 三个读数（口径向 #704 的对账行校准，见下方 CALIBRATION）：
 *   ① 外面 → `render/` 的 import 计数   （含深路径／barrel 两档）
 *   ② `render/` 反向 import 的能力目录数（distinct 第一层目录名）
 *   ③ `render/` 自身件数与 LF
 *
 * 口径标定：拿 #704 收工当刻的提交 `918a9706` 当参照，挑出与它报的
 * ① 186／② 11／③ 31 件 9,528 LF 逐字吻合的那一种解释，再拿同一份解释量当刻树。
 * 这样本票的读数与 #704 的读数在同一条数轴上，差值才可归因。
 *
 * 用法：node .scratch/714/counters.mjs [--root <src 目录>] [--label <标签>]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const SRC = resolve(argOf('--root', 'packages/skill-calorie/src'));
const LABEL = argOf('--label', 'reading');

/** 递归列出 `src/**\/*.ts`（不跟符号链接，跳过生成物目录）。 */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

/** 抽一个文件里的全部 import／export-from specifier（相对写法才认，裸包名如 `base-paint` 不算）。 */
function specifiersOf(text) {
  const out = [];
  const re = /(?:from|import)\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push({ spec: m[1], line: text.slice(0, m.index).split('\n').length });
  return out;
}

const files = walk(SRC);
const rel = (p) => relative(SRC, p).split(sep).join('/');

/** specifier → 目标件相对 `src/` 的路径（解析不到（裸包名）返 null）。 */
function resolveSpec(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  return rel(resolve(dirname(fromFile), spec));
}

const rows = [];
for (const f of files) {
  for (const { spec, line } of specifiersOf(readFileSync(f, 'utf8'))) {
    const target = resolveSpec(f, spec);
    if (target === null) continue;
    rows.push({ from: rel(f), line, spec, target });
  }
}

const isRender = (p) => p === 'render' || p.startsWith('render/');
const topOf = (p) => p.split('/')[0];
/** 能力目录＝`src/` 下第一层的**目录**。`src/` 直接下的散件（如 `kcal.ts` → `kcal.js`）不是目录，
 *  不计——不排掉它，`918a9706` 的标定读数会比 #704 报的 11 多 1（实测 `kcal.js=3` 行那条）。 */
const isDirTarget = (p) => p.includes('/');
/** 共用位／工具位不是能力目录。 */
const NON_CAPABILITY = new Set(['render', 'shared', 'cli', 'triggers', 'migrate']);

const intoRender = rows.filter((r) => !isRender(r.from) && isRender(r.target));
const barrelLines = intoRender.filter((r) => r.target === 'render/index.js');
const deepLines = intoRender.filter((r) => r.target !== 'render/index.js');

const renderOut = rows.filter((r) => isRender(r.from) && !isRender(r.target) && r.target !== undefined);
const capDirs = [...new Set(renderOut.filter((r) => isDirTarget(r.target) && !NON_CAPABILITY.has(topOf(r.target))).map((r) => topOf(r.target)))].sort();
const capLineOf = (d) => renderOut.filter((r) => topOf(r.target) === d).length;
const looseLines = renderOut.filter((r) => !isDirTarget(r.target)).length;

const renderFiles = files.filter((f) => isRender(rel(f)));
const lfOf = (f) => readFileSync(f, 'utf8').split('\n').length - 1;
const renderLf = renderFiles.reduce((a, f) => a + lfOf(f), 0);

const intoRenderTargets = [...new Set(deepLines.map((r) => r.target))].sort();

console.log(`=== ${LABEL} ===`);
console.log(`src 面：${files.length} 件`);
console.log(`① 外面 → render/：行 ${intoRender.length}（其中深路径 ${deepLines.length} ／ barrel ${barrelLines.length}）`);
console.log(`   外面 → render/ 的**目标件**数（distinct）：${intoRenderTargets.length}`);
console.log(`   ↳ 深路径目标件：${intoRenderTargets.filter((t) => t !== 'render/index.js').join(' ')}`);
console.log(`② render/ → 能力目录数：${capDirs.length}  [${capDirs.join(' ')}]`);
console.log(`   ↳ 逐目录行数：${capDirs.map((d) => d + '=' + capLineOf(d)).join(' ')}`);
console.log(`   ↳ render/ → shared/ 行数：${renderOut.filter((r) => topOf(r.target) === 'shared').length}`);
console.log(`   ↳ render/ → src 下散件（非目录）行数：${looseLines}`);
console.log(`③ render/ 自身：${renderFiles.length} 件／${renderLf} LF`);
