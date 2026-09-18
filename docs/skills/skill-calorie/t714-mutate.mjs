/**
 * #714 · 变异自证驱动（协议 §5：**源码级变异**，改坏 → 相关判据必红 → 逐文件写回原文 → 必绿）。
 *
 * 票面「判据」段点名的两行读数由它配合 `regen.mjs` 产出：
 *   ① 「改坏搬走件里一处可见文案 → 重出必红」
 *   ② 「逐文件写回原文 → 重出必绿」
 *
 * 打的是**搬走后的新家**（`src/workout/reviewDocs.ts`）——判据要咬的是这一页的产物，不是路径。
 * 改坏的那一句 `每日完成情况` 是热力图那一节的 `<h2>`，八条页分支**每条都渲染它**，
 * 所以红要红满 8／8：只红一页说明判据没咬住全部覆盖口径。
 *
 * 还原＝**逐文件写回原文并核 sha256**（协议 §5：不是整目录还原），备份落在 `.scratch/714/mut-backup/`。
 *
 * 用法：node .scratch/714/mutate.mjs --break ｜ --restore ｜ --verify-identical
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
const TARGET = join(ROOT, 'packages/skill-calorie/src/workout/reviewDocs.ts');
/** 留底目录**锚在仓库根下**，不锚 `HERE`：入仓副本住 `docs/skills/skill-calorie/`，
 *  锚 `HERE` 会往 `docs/` 里落 `mut-backup/`（本窗归档时发现并改掉；两种住法解析出来是同一个目录）。 */
const BACKUP = join(ROOT, '.scratch/t714/mut-backup/workout__reviewDocs.ts');
/** 锚点取**落进产物的那一段标记本身**，不取光秃秃的词：`每日完成情况` 这句在件里出现两次
 *  （件头 JSDoc 一次、热力图那一节的 `<h2>` 一次），只按词命中会撞上注释那一次 ⇒
 *  本窗实测第一次跑就报「锚点命中数 2（期望 1）」。带上 `</h2>` 才是唯一且**必然上屏**的那一处。 */
const OLD = '每日完成情况</h2>';
const NEW = '每日完成情况（改坏了）</h2>';
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const mode = process.argv[2];

if (mode === '--break') {
  const text = readFileSync(TARGET, 'utf8');
  const hits = text.split(OLD).length - 1;
  if (hits !== 1) { console.log(`FAIL 变异锚点命中数 ${hits}（期望 1）`); process.exit(1); }
  mkdirSync(dirname(BACKUP), { recursive: true });
  writeFileSync(BACKUP, Buffer.from(text, 'utf8')); // 原文逐字节留底
  const broken = text.split(OLD).join(NEW);
  writeFileSync(TARGET, broken, 'utf8');
  console.log(`MUT-BREAK ${JSON.stringify(OLD)} → ${JSON.stringify(NEW)}  +${Buffer.byteLength(NEW) - Buffer.byteLength(OLD)}B 原sha=${sha(Buffer.from(text, 'utf8')).slice(0, 12)}`);
} else if (mode === '--restore') {
  if (!existsSync(BACKUP)) { console.log('FAIL 没有留底，拒绝还原'); process.exit(1); }
  const orig = readFileSync(BACKUP);
  writeFileSync(TARGET, orig);
  const now = readFileSync(TARGET);
  if (sha(orig) !== sha(now)) { console.log('FAIL 还原后 sha256 与原文不等'); process.exit(1); }
  rmSync(BACKUP, { force: true });
  console.log(`MUT-RESTORE 逐文件写回原文 相等=true sha256_12=${sha(now).slice(0, 12)}`);
} else if (mode === '--verify-identical') {
  // 收工自查：还原之后工作区里那件必须与「搬迁后、变异前」的字节完全一致。
  const now = sha(readFileSync(TARGET));
  console.log(`MUT-VERIFY ${TARGET.replace(ROOT, '')} sha256_12=${now.slice(0, 12)}`);
} else {
  console.log('用法：node .scratch/714/mutate.mjs --break ｜ --restore ｜ --verify-identical');
  process.exit(2);
}
