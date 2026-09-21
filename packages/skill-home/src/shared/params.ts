// 共用位·参数整形：`asInt` 的唯一定义地（#800 从 cmd_read 搬出）。
//
// 被 items（合并／关联）／express（阈值）／receipt（证件／账号）等能力共用，故住共用位。

import { fail } from './fail.js';

export function asInt(v: unknown, field: string): number | undefined {
  if (v === undefined) return undefined;
  if (!Number.isInteger(v) || (v as number) <= 0) fail(2, field + ' 须为正整数');
  return v as number;
}
