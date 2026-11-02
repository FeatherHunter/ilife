// 共用位·参数整形：`asInt` 的唯一定义地（#800 从 cmd_read 搬出）。
//
// 被 items（合并／关联）／express（阈值）／receipt（证件／账号）等能力共用，故住共用位。

import { fail } from './fail.js';
import { m } from '../entries/index.js';

export function asInt(v: unknown, field: string): number | undefined {
  if (v === undefined) return undefined;
  if (!Number.isInteger(v) || (v as number) <= 0) fail(2, m('skill-home.shared-params.c001', { p0: String(field) }));
  return v as number;
}

// 列表取行上限（#928 收口：**不给即全量**）。页面不再按体积截断，`limit` 只是调用方主动要小页时的手段；
// 给了就校验范围、超界大声失败（不静默钳制）。住共用位因 items（标签）与 space（位置）两能力共用同一口径。
export function asLimit(v: unknown, field: string, min: number, max: number): number | undefined {
  if (v === undefined) return undefined;
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (!Number.isInteger(n) || (n as number) < min || (n as number) > max) fail(2, m('skill-home.shared-params.c002', { p0: String(field), p1: String(min), p2: String(max) }));
  return n as number;
}

// 列表过滤关键词（#928）：与 HELP 现找 q 同形（非空字符串才算给）。
export function asQueryString(v: unknown, field: string): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') fail(2, m('skill-home.shared-params.c003', { p0: String(field) }));
  const s = (v as string).trim();
  return s === '' ? undefined : s;
}
