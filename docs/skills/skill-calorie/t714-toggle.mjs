/**
 * #714 · 搬迁状态的「回摆」开关：`--revert`（摆回搬迁前）｜`--reapply`（再摆到搬迁后）。
 *
 * 为什么要它：本窗第一次比出的是**全 9 页各 +8 字节**——那不是搬迁的形状（搬迁改的是代码住哪，
 * 产物该一个字节都不动），而开窗期间 **#717 正在同一棵树里改源码**（它的 `tsc` 在我存基线之前后
 * 各跑过一次，实测 B2 那次是 1,081 ms 的真重编，说明这中间源码又动过）。⇒ 两次读数不是同一棵树上的
 * 两次读数，差值是**合成读数**，分不清是搬迁还是别席改的。
 *
 * 处置：把「搬迁前」与「搬迁后」两个状态**摆进同一只持锁窗口里背靠背比**（§2.6 安静窗口/指纹绑定：
 * 做不到「无写者」就把窗口判出来）。这样比跨窗比更硬——中间没有别席落笔的机会。
 *
 * 「搬迁前」的三个件逐字取自 `git show HEAD:`（HEAD 里我一行未改），**不是**从记忆或快照恢复的。
 * 用法：node .scratch/714/toggle.mjs --revert ｜ --reapply
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
const SNAP = join(HERE, 'post-state');
/** 搬迁写集里的三个件：两个搬走件 ＋ 一个调用方。 */
const FILES = [
  'packages/skill-calorie/src/render/reviewDocs.ts',
  'packages/skill-calorie/src/render/reviewDocsCss.ts',
  'packages/skill-calorie/src/workout/reviewDocs.ts',
  'packages/skill-calorie/src/workout/reviewDocsCss.ts',
  'packages/skill-calorie/src/workout/review.ts',
];
const abs = (p) => join(ROOT, p);
const headContent = (p) => {
  const r = spawnSync('git', ['show', 'HEAD:' + p], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) { console.log(`FAIL 从 HEAD 读不到 ${p}：${r.stderr.trim()}`); process.exit(1); }
  return r.stdout;
};
const mode = process.argv[2];

if (mode === '--revert') {
  // 先把当刻（搬迁后）状态逐件留底
  mkdirSync(SNAP, { recursive: true });
  for (const p of FILES) if (existsSync(abs(p))) writeFileSync(join(SNAP, p.replace(/[\\/]/g, '__')), readFileSync(abs(p)));
  // 再摆回搬迁前：两件回 render/，两件从 workout/ 删掉，调用方取 HEAD 原文
  for (const p of ['packages/skill-calorie/src/render/reviewDocs.ts', 'packages/skill-calorie/src/render/reviewDocsCss.ts']) writeFileSync(abs(p), headContent(p), 'utf8');
  for (const p of ['packages/skill-calorie/src/workout/reviewDocs.ts', 'packages/skill-calorie/src/workout/reviewDocsCss.ts']) rmSync(abs(p), { force: true });
  writeFileSync(abs('packages/skill-calorie/src/workout/review.ts'), headContent('packages/skill-calorie/src/workout/review.ts'), 'utf8');
  console.log('REVERT 摆回搬迁前（两件回 render/，workout/ 新件已删，review.ts 取 HEAD 原文）');
} else if (mode === '--reapply') {
  let n = 0;
  for (const p of FILES) {
    const snap = join(SNAP, p.replace(/[\\/]/g, '__'));
    if (!existsSync(snap)) continue;
    writeFileSync(abs(p), readFileSync(snap));
    n += 1;
  }
  for (const p of ['packages/skill-calorie/src/render/reviewDocs.ts', 'packages/skill-calorie/src/render/reviewDocsCss.ts']) {
    if (existsSync(join(SNAP, p.replace(/[\\/]/g, '__'))) === false) rmSync(abs(p), { force: true });
  }
  console.log(`REAPPLY 摆回搬迁后（逐件写回 ${n} 件）`);
} else {
  console.log('用法：node .scratch/714/toggle.mjs --revert ｜ --reapply');
  process.exit(2);
}
