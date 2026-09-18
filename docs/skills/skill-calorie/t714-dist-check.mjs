/**
 * #714 · 清残渣前后各跑一次：旧地址还能不能 load、新地址在不在。
 * 用法：node .scratch/714/dist-check.mjs <标签>
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
const DIST = join(ROOT, 'packages/skill-calorie/dist');
const label = process.argv[2] ?? 'CHECK';
const OLD = join(DIST, 'render/reviewDocs.js');
const NEW = join(DIST, 'workout/reviewDocs.js');

let oldLoad = 'n/a';
if (existsSync(OLD)) {
  try {
    const m = await import(pathToFileURL(OLD).href);
    oldLoad = typeof m.buildReviewDoc === 'function' ? '能 load 且导出 buildReviewDoc（旧装配仍在盘上）' : '能 load 但不导出 buildReviewDoc';
  } catch (e) { oldLoad = 'load 抛错：' + e.code; }
} else {
  oldLoad = '文件不在';
}
let newLoad = 'n/a';
try {
  const m = await import(pathToFileURL(NEW).href);
  newLoad = typeof m.buildReviewDoc === 'function' ? '能 load 且导出 buildReviewDoc' : '能 load 但不导出';
} catch (e) { newLoad = 'load 抛错：' + e.code; }

console.log(`${label} 旧 dist/render/reviewDocs.js：${oldLoad}`);
console.log(`${label} 新 dist/workout/reviewDocs.js：${newLoad}`);
