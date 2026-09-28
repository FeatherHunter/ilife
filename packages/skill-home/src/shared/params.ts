// 共用位·参数整形：`asInt` 的唯一定义地（#800 从 cmd_read 搬出）。
//
// 被 items（合并／关联）／express（阈值）／receipt（证件／账号）等能力共用，故住共用位。

import { fail } from './fail.js';

export function asInt(v: unknown, field: string): number | undefined {
  if (v === undefined) return undefined;
  if (!Number.isInteger(v) || (v as number) <= 0) fail(2, field + ' 须为正整数');
  return v as number;
}

// 列表分页上限（#928）：缺省给安全值，超界大声失败，不静默钳制。
// 住共用位因 items（标签）与 space（位置）两能力共用同一口径。
export function asLimit(v: unknown, field: string, def: number, min: number, max: number): number {
  if (v === undefined) return def;
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (!Number.isInteger(n) || (n as number) < min || (n as number) > max) fail(2, field + ' 须为 ' + min + '~' + max + ' 正整数');
  return n as number;
}

// 列表过滤关键词（#928）：与 HELP 现找 q 同形（非空字符串才算给）。
export function asQueryString(v: unknown, field: string): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') fail(2, field + ' 须为字符串');
  const s = (v as string).trim();
  return s === '' ? undefined : s;
}
