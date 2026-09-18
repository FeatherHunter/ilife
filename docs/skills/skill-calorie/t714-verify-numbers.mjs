/**
 * #714 · 复核独立审查席点名的两个数（它们支撑 §1.1 与 §二 的说明，数错了就该改）。
 * 量的是 **87ea157f 那棵树**（不是当刻工作区——工作区里别席还在加件）。
 * 用法：node .scratch/714/verify-numbers.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const ROOT = repoRoot(dirname(fileURLToPath(import.meta.url)));
const TREE = join(ROOT, '.scratch/714/c87/packages/skill-calorie');
const walk = (d, a = []) => {
  for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p, a) : a.push(p); }
  return a;
};
const SPEC = /(?:from|import)\s+['"](\.[^'"]+)['"]/g;

let specs = 0;
let files = 0;
for (const f of walk(join(TREE, 'src'))) {
  if (!f.endsWith('.ts')) continue;
  files += 1;
  specs += (readFileSync(f, 'utf8').match(SPEC) || []).length;
}
console.log(`87ea157f 树：src 下 .ts ${files} 件，相对 specifier ${specs} 条`);

let tests = 0, refHelpers = 0;
for (const f of walk(join(TREE, 'test'))) {
  if (!f.endsWith('.test.mjs')) continue;
  tests += 1;
  if (readFileSync(f, 'utf8').includes('config-test.mjs')) refHelpers += 1;
}
console.log(`87ea157f 树：*.test.mjs ${tests} 件，其中引 config-test.mjs 的 ${refHelpers} 件`);
