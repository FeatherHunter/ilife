/** T3 #22 · sqlite 参数收口：node:sqlite 类型严格，unknown 一律经 sql() 收窄。 */
import type { SQLInputValue } from 'node:sqlite';

export type { SQLInputValue };

export function sql(v: unknown): SQLInputValue {
  return v as SQLInputValue;
}
