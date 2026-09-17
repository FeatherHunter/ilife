/** 训记响应 → `exercise_log` 行（老 `adapters/xunji_adapter.py:xunji_response_to_rows`，代码新写）。
 *
 * 口径（逐条对老 `:28-69`）：
 * - 一 train 一 localid（转串）＋ title ＋ datestr；difficulty 取 train 级（老 `:35`）；
 * - 只收 `done` 的 set（老 `:38-39` 未完成不同步）；
 * - `load_kg` 走单位换算（`exerciseStore.convertLoadKg`，即老 `convert_load_kg`）；
 * - `reps` 范围串 `"12-16"` 取最大（老 `:44-48`），转坏即 0（老 `:50-53`）；
 * - 热量＝容量 × 0.08（`exerciseStore.estimateCaloriesFromTraining`，即老公式）；
 * - 分类走动作名推断（`exerciseStore.inferCategory`，即老 `_infer_category`）。
 *
 * 本件是纯函数：不读库、不调网、不读时钟——同输入必得同输出（挡板断言直接调它）。
 * 跨能力引用（`exerciseStore` 三件）是过渡债务 R2（见证据件；收口前认领，不在本票重构别家门）。
 */

import { convertLoadKg, estimateCaloriesFromTraining, inferCategory } from '../exercise/exerciseStore.js';

/** 回写一行（`store.ts` 落库的输入形状；`setIndex` 缺时为 null）。 */
export interface XunjiBackfillRow {
  readonly date: string;
  readonly exerciseType: string;
  readonly reps: number;
  readonly setIndex: number | null;
  readonly loadKg: number;
  readonly caloriesBurned: number;
  readonly category: string;
  readonly difficulty: string | null;
  readonly xunjiLocalid: string;
  readonly xunjiTitle: string;
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function asList(v: unknown): readonly unknown[] {
  return Array.isArray(v) ? v : [];
}

function asText(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

/** set 的次数：范围串取最大（老 `:44-48`），转坏即 0（老 `:50-53`）。 */
export function parseSetReps(raw: unknown): number {
  if (typeof raw === 'string' && raw.includes('-')) {
    const parts = raw.split('-').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n));
    return parts.length > 0 ? Math.max(...parts) : 0;
  }
  const n = Number(raw);
  return Number.isInteger(n) ? n : 0;
}

function parseSetIndex(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

/** 训记 GET 响应 → 回写行列表（每行一个完成的 set；形状不对即空表，不抛）。 */
export function xunjiResponseToRows(response: unknown): XunjiBackfillRow[] {
  const rows: XunjiBackfillRow[] = [];
  const trains = asList(asRecord(asRecord(response).res).trains);
  for (const t of trains) {
    const train = asRecord(t);
    const localid = String(train.localid ?? '');
    const title = asText(train.title, '');
    const datestr = asText(train.datestr, '');
    const rawDifficulty = train.difficulty;
    const difficulty = typeof rawDifficulty === 'string' ? rawDifficulty : null;
    for (const m of asList(train.movements)) {
      const move = asRecord(m);
      const name = asText(move.name, '');
      for (const s of asList(move.sets)) {
        const set = asRecord(s);
        if (set.done !== true) continue;
        const load = convertLoadKg(set.weight ?? '0', set.unit ?? 'kg');
        const reps = parseSetReps(set.reps ?? 0);
        rows.push({
          date: datestr,
          exerciseType: name,
          reps,
          setIndex: parseSetIndex(set.index),
          loadKg: load,
          caloriesBurned: estimateCaloriesFromTraining(load * reps),
          category: inferCategory(name),
          difficulty,
          xunjiLocalid: localid,
          xunjiTitle: title,
        });
      }
    }
  }
  return rows;
}
