/** 开始使用能力的写处理（`chef.setup.init` 的初始化工作流）＋ 本域独占的取数。
 *
 * 老件语义来源（只读对照）：`scripts/开始使用/ops.py:57-72`（只读数表，不写库）与
 * `scripts/开始使用/ops.py:186-235`（缺表则建，老库齐则跳过并提示迁移）。
 * 新技能建库走 `openChefDb` 的幂等 `CREATE TABLE IF NOT EXISTS`（17 表），本函数只做判定与回执：
 * 只在需要时建库建目录（开库即建），已齐则跳过并报已初始化。
 */

import type { ChefDb } from '../fetch/db.js';
import { qGet } from '../fetch/db.js';
import { buildRecipeReceipt } from '../render/index.js';

/** 跑 `chef.setup.init`：幂等初始化（开库即建表），回执报已初始化或本次建齐。 */
export function runSetupInit(handle: ChefDb): unknown {
  const row = qGet<{ c: number }>(handle, "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const tables = Number(row?.c ?? 0);
  if (handle.initialized) {
    return buildRecipeReceipt('首次使用已就绪：本次建齐' + tables + '张表（空库直接录第一道菜即上手）');
  }
  return buildRecipeReceipt('本地菜谱库已就绪：' + tables + '张表齐全，跳过建库（老库仅提示迁移，不自动迁移）');
}
