/**
 * #714 · 找出 `dist/` 里**源码已不在**的旧编译产物（重命名留下的残渣），并按需清除。
 *
 * 背景（本票独立审查席 S2 指出的）：`tsc -b` **不删**已删源码的旧输出。`package.json` 的
 * `files:["dist"]` 会把它一起打进 tarball ⇒ 包里躺着一份**能 load 的旧页装配实现**。
 *
 * 口径（协议 §2.5 第 2 条「按当刻内容变更，不按预备记录变更」）：候选集**当刻**从盘上派生 ——
 * 遍历 `dist/**` 的 `.js`／`.d.ts`／`.js.map`／`.d.ts.map`，算出对应的 `src/` 源件；源件不在即判残渣。
 * 白名单只认两条，都**显式具名**（不写会过期的通配）：`.gen-inputs.json`、`*.tsbuildinfo`。
 * 删除逐条点名、带路径守卫（必须落在 `packages/skill-calorie/dist/` 之下）。
 *
 * 用法：node .scratch/714/dist-sweep.mjs [--delete]
 */
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 仓库根：往上找到 `pnpm-workspace.yaml` 为止 —— 本件与当窗副本住不同层级（当窗住 `.scratch/714/`，
 *  入仓副本住 `docs/skills/skill-calorie/`），写死层数就有一边跑不起来。#714 归档时补的。 */
function repoRoot(start) {
  let d = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(d, 'pnpm-workspace.yaml'))) return d;
    d = dirname(d);
  }
  throw new Error('找不到仓库根（往上没有 pnpm-workspace.yaml）：' + start);
}
const ROOT = repoRoot(HERE);
const PKG = join(ROOT, 'packages/skill-calorie');
const SRC = join(PKG, 'src');
const DIST = join(PKG, 'dist');
const DELETE = process.argv.includes('--delete');
/** **只许清本票那一片**：全 `dist` 实测有 **284 件**残渣，横跨 #704／#705／#715／#717 五张票
 *  （最大一片是 `cli/legacy/**`，那是 #705 按 ADR-0002 退役整目录留下的）。
 *  那不属于本票写集：本票只声明过 `render/reviewDocs*` 与 `workout/reviewDocs*`。
 *  清全量要么得走一次 `tsc -b --clean` ＋ 重编（别的席此刻源码正改到一半、编不过，会把 dist 弄得更碎），
 *  要么得逐个删别人票的产物 —— 两条都不是本票该做的，故只清自己那 8 件、其余具名记账。 */
const ONLY = (() => { const i = process.argv.indexOf('--only-prefix'); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : null; })();
const posix = (p) => p.split(sep).join('/');

/** dist 里某个产物 → 它应当对应的 src 源件（`.js`／`.d.ts`／`.js.map`／`.d.ts.map` → `.ts`）。 */
function srcCounterpart(relFromDist) {
  return relFromDist
    .replace(/\.d\.ts\.map$/, '.ts')
    .replace(/\.js\.map$/, '.ts')
    .replace(/\.d\.ts$/, '.ts')
    .replace(/\.js$/, '.ts');
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const stale = [];
const kept = [];
for (const f of walk(DIST)) {
  const relFromDist = posix(relative(DIST, f));
  const base = relFromDist.split('/').pop();
  if (base === '.gen-inputs.json' || base.endsWith('.tsbuildinfo')) { kept.push([relFromDist, '白名单：生成记录／编译记录']); continue; }
  if (!/\.(js|d\.ts|js\.map|d\.ts\.map)$/.test(relFromDist)) { kept.push([relFromDist, '非编译产物后缀']); continue; }
  const srcRel = srcCounterpart(relFromDist);
  if (existsSync(join(SRC, srcRel))) { kept.push([relFromDist, 'src 里有源件']); continue; }
  stale.push(relFromDist);
}

console.log(`DIST-SWEEP 扫描 ${kept.length + stale.length} 件产物，判为残渣 ${stale.length} 件（全量，仅报数）`);
// 本票两件单列出来（审查席点名的那一批）
const MINE = stale.filter((p) => /^render\/reviewDocs/.test(p));
console.log(`  ↳ 本票两件（render/reviewDocs*）：${MINE.length} 件`);
for (const p of MINE) console.log('  STALE-MINE ' + p);

const targets = ONLY ? stale.filter((p) => p.startsWith(ONLY)) : stale;
if (ONLY) console.log(`DIST-SWEEP --only-prefix ${ONLY} ⇒ 本次只处理 ${targets.length} 件`);

if (!DELETE) { console.log('DIST-SWEEP 只演练不删（加 --delete 才落盘）'); process.exit(0); }
if (!ONLY) { console.log('FAIL 拒绝无限制删除：本脚本的全量结果横跨五张票，落盘必须给 --only-prefix'); process.exit(1); }

// 路径守卫：逐条断言目标落在 dist 之下
const DIST_ABS = resolve(DIST);
let n = 0;
for (const p of targets) {
  const abs = resolve(DIST, p);
  if (!abs.startsWith(DIST_ABS + sep)) { console.log('FAIL 路径守卫拦住：' + abs); process.exit(1); }
  unlinkSync(abs);
  n += 1;
}
console.log(`DIST-SWEEP 已删 ${n} 件残渣（限 ${ONLY}）`);
