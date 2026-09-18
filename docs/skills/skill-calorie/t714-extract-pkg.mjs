/**
 * #714 · 把**本票提交那棵树**上的 `packages/skill-calorie` 包面取出来（`git archive`），
 * 供告警线门用 `--root`／`--agents` 在这份**只含本票改动的面**上出一次**可归因**读数。
 *
 * 为什么需要：收工当刻工作区里 #705／#718 的在途改动把 `scripts/gen-cli.mjs` 与 `src/render/html.ts`
 * 的 LF 改了却没同步台账，门因此红 —— 那两行**不是本票的文件**。要证明「本票收尾时门是绿的」，
 * 就得在**只含本票改动的那棵树**上跑，不能拿别席的中间态当读数。
 * 用法：node .scratch/714/extract-pkg.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
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
const REV = '87ea157f';
const OUT = join(HERE, 'pkg-' + REV);
const TAR = join(HERE, 'pkg.tar');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let r = spawnSync('git', ['archive', '--format=tar', '--output=' + TAR, REV, 'packages/skill-calorie'], { cwd: ROOT, encoding: 'utf8' });
if (r.status !== 0) { console.log('FAIL git archive：' + r.stderr); process.exit(1); }
r = spawnSync('tar', ['-x', '-f', TAR, '-C', OUT], { cwd: ROOT, encoding: 'utf8' });
if (r.status !== 0) { console.log('FAIL tar：' + r.stderr); process.exit(1); }
rmSync(TAR, { force: true });
const PKG = join(OUT, 'packages/skill-calorie');
console.log('EXTRACT ' + REV + ' → ' + PKG.replace(ROOT + '\\', ''));
// 认口：确认这份面里两件在正确的位置、旧址不在
import { existsSync } from 'node:fs';
for (const p of ['src/workout/reviewDocs.ts', 'src/workout/reviewDocsCss.ts', 'AGENTS.md', 'scripts/check-warning-line.mjs']) {
  console.log(`  ${existsSync(join(PKG, p)) ? 'OK  ' : 'MISS'} ${p}`);
}
console.log(`  ${existsSync(join(PKG, 'src/render/reviewDocs.ts')) ? 'MISS' : 'OK  '} src/render/reviewDocs.ts 已不在`);
