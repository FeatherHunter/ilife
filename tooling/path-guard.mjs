/** 路径守卫（删前断言）：只允许删除 root 之下的路径，且不得落在禁区目录内。
 *
 * 来源：`tooling/run-locked.mjs`（锁删除时随锁机制一并退役；守卫本身与锁无关，
 * 仍被 `docs/skills/skill-calorie/t269-cli-run13.mjs` 等清理探针引用，故单立本件）。
 */
import path from 'node:path';

export const FORBIDDEN_REMOVE_SEGMENTS = new Set(['node_modules', 'packages', 'docs', 'test', 'tooling', '.git']);

/** 断言 target 可删：必须在 root 之下，且路径上不含禁区目录名；否则抛错。 */
export function assertSafeToRemove(target, root) {
  const abs = path.resolve(target);
  const rootAbs = path.resolve(root);
  if (abs === rootAbs) throw new Error(`拒绝删除根目录自身: ${abs}`);
  if (!abs.startsWith(rootAbs + path.sep)) throw new Error(`拒绝删除 root 之外的路径: ${abs}`);
  const segs = [...rootAbs.split(path.sep), ...path.relative(rootAbs, abs).split(path.sep)];
  for (const seg of segs) {
    if (FORBIDDEN_REMOVE_SEGMENTS.has(seg)) throw new Error(`拒绝删除禁区目录下的路径: ${abs}`);
  }
}
