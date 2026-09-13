/** 命令层的参数读取与时间窗口口径（**唯一定义地**）。
 *
 * 谁在用（写得出哪两个在用）：
 *   ① 出口分派层 `src/cli/cmd_read.ts`／`write.ts`——尚未搬进能力目录的老命令；
 *   ② 能力目录（本票：体重 `src/weight/`）——命令的实现搬回能力目录后，它仍要同一套失败码
 *      与同一套窗口口径（`#250` 的时间说法正本在 `analysis/series.ts`，本文件只是它的参数层读法）。
 *
 * 以前 `fail`／`needStr`／`optStr`／`optNum`／`assertISO` 在 `cmd_read.ts` 与 `write.ts` 各写一份，
 * 本票按「概念唯一」收成一份：同一个语义只留一个定义地，两处引用它。
 *
 * 退出码沿 T11 冻结（P9）：1 预检；2 用法／参数；3 key；4 取数／超时；5 envelope／渲染／落盘。
 */
import type { DatabaseSync } from 'node:sqlite';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { applyOffset, resolveDay, resolveWindow } from '../analysis/series.js';
import { CalorieRenderError } from '../render/errors.js';

export function fail(code: number, msg: string): never {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}

export function needStr(params: Record<string, unknown>, name: string): string {
  const v = params[name];
  if (typeof v !== 'string' || v.length === 0) fail(2, '缺参数 ' + name);
  return v as string;
}

export function optStr(params: Record<string, unknown>, name: string): string | undefined {
  const v = params[name];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') fail(2, '参数 ' + name + ' 须为字符串');
  return v as string;
}

export function needNum(params: Record<string, unknown>, name: string): number {
  const v = params[name];
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(2, '缺参数 ' + name + '（须为有限 number）');
  return v as number;
}

export function optNum(params: Record<string, unknown>, name: string): number | undefined {
  const v = params[name];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(2, '参数 ' + name + ' 须为有限 number');
  return v as number;
}

export function optInt(params: Record<string, unknown>, name: string): number | undefined {
  const v = optNum(params, name);
  if (v === undefined) return undefined;
  if (!Number.isInteger(v)) fail(2, '参数 ' + name + ' 须为整数');
  return v as number;
}

export function needId(params: Record<string, unknown>, name = 'id'): number {
  const v = params[name];
  if (typeof v !== 'number' || !Number.isInteger(v) || (v as number) <= 0) fail(2, '缺参数 ' + name + '（正整数记录 id）');
  return v as number;
}

export function needArr(params: Record<string, unknown>, name: string): unknown[] {
  const v = params[name];
  if (!Array.isArray(v) || v.length === 0) fail(2, '缺参数 ' + name + '（非空数组）');
  return v as unknown[];
}

export function assertISO(v: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(2, field + ' 非法（须 YYYY-MM-DD）：' + v);
}

/** 非空数挑拣：null/undefined/NaN/Infinity 一律丢弃（stat.metrics 须全有限 number）。 */
export function nums(input: Record<string, number | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

/** 锚点：`today` 可显式传入（演示／测试／面板用来复现固定日）；缺省＝**真实今天**（语义正确）。 */
export function anchorOf(params: Record<string, unknown>): string {
  const t = optStr(params, 'today');
  if (!t) return todayISO();
  const d = resolveDay(t, todayISO());
  assertISO(d, 'today');
  return d;
}

/** 窗口：`window`（今日／本周／最近 Nd／custom…）＋ `offset`（整体平移 ±Nd/±Nw/±Nm/±Ny）。
 *  给了 `window` 就以它为准；**显式 start+end 仍然优先**（`custom` 除外——它本来就用这对日期）；
 *  两样都没有则回 null，由各命令沿用旧口径。 */
export function windowRange(params: Record<string, unknown>): { start: string; end: string } | null {
  const w = optStr(params, 'window');
  if (!w) return null;
  const s0 = optStr(params, 'start');
  const e0 = optStr(params, 'end');
  if (w !== 'custom' && s0 && e0) return null;
  let s: string;
  let e: string;
  try {
    // 窗口词／偏移是**参数**错（用法错），统一报 bad-input（exit 2）；别混进「取数失败」那一档。
    [s, e] = applyOffset(resolveWindow(w, s0, e0, anchorOf(params)), optStr(params, 'offset'));
  } catch (err) {
    throw new CalorieRenderError('bad-input', err instanceof Error ? err.message : String(err));
  }
  assertISO(s, 'start');
  assertISO(e, 'end');
  if (s > e) fail(2, 'start 不得晚于 end');
  return { start: s, end: e };
}

/** 单日字段：`date`／`from`／`to` 这类「一个日」可写相对词（今日／昨日／前天），并吃 `offset` 平移。 */
export function dayField(params: Record<string, unknown>, field: string): string | null {
  const raw = optStr(params, field);
  if (!raw) return null;
  const anchor = anchorOf(params);
  const shifted = applyOffset([resolveDay(raw, anchor), resolveDay(raw, anchor)], optStr(params, 'offset'))[0];
  assertISO(shifted, field);
  return shifted;
}

/** 单日字段（必填）：相对词与显式日期都收；缺则按用法报 exit 2。 */
export function needDay(params: Record<string, unknown>, field: string): string {
  const v = dayField(params, field);
  if (!v) fail(2, '缺参数 ' + field);
  return v as string;
}

/** 写命令的日期位与读命令**同一套时间说法**：显式 ISO 日照旧，另收相对词（今日／昨日／前天）
 *  与 `offset` 平移（±Nd／±Nw／±Nm／±Ny）——「补记昨天的饮食」这类话不必由 AI 自己算日期。
 *  非日期值原样返回（本函数只做「相对词 → 具体日」的翻译，不认识的值交给各自的校验）。 */
export function wday(params: Record<string, unknown>, field: string): string | undefined {
  const raw = optStr(params, field);
  if (!raw) return undefined;
  const anchor = resolveDay(optStr(params, 'today') ?? todayISO(), todayISO());
  return applyOffset([resolveDay(raw, anchor), resolveDay(raw, anchor)], optStr(params, 'offset'))[0];
}

/** 写命令的必填日期位（语义同 `wday`）。 */
export function needWday(params: Record<string, unknown>, field: string): string {
  const v = wday(params, field);
  if (!v) fail(2, '缺参数 ' + field);
  return v as string;
}

/** 闭区间天数（含首末日）。 */
export function daysIn(range: { start: string; end: string }): number {
  return Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86400000) + 1;
}

export function latestFoodDate(db: DatabaseSync): string | null {
  try {
    const row = db.prepare('SELECT MAX(date) AS m FROM food_log').get() as { m: string | null } | undefined;
    return row?.m ?? null;
  } catch {
    return null;
  }
}

export function defaultRange(db: DatabaseSync, params: Record<string, unknown>, defDays = 7): { start: string; end: string } {
  const win = windowRange(params);
  if (win) return win;
  let end = dayField(params, 'end') ?? dayField(params, 'date') ?? dayField(params, 'today') ?? undefined;
  const start = dayField(params, 'start') ?? undefined;
  if (end) assertISO(end, 'end');
  if (start) assertISO(start, 'start');
  if (start && end) {
    if (start > end) fail(2, 'start 不得晚于 end');
    return { start, end };
  }
  const latest = latestFoodDate(db) ?? todayISO();
  end = end ?? latest;
  assertISO(end, 'end');
  if (start) {
    if (start > (end as string)) fail(2, 'start 不得晚于 end');
    return { start, end: end as string };
  }
  return { start: shiftISODate(end as string, -(defDays - 1)), end: end as string };
}
