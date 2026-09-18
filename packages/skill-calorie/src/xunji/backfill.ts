/** 回写编排：范围口径 ＋ 拉取 ＋ 事务落库（老 `xunji_bridge/backfill.py`，代码新写）。
 *
 * 口径（逐条对老）：
 * - 范围只能「结束日＋往前 N 天」：`[end-days+1, end]`，新在前（老 `:190-193` 的循环；
 *   起始日倒算的形状不支持，老 `__main__.py:101` 同述）；
 * - 默认 **1 天**：照 `backfill_range` 签名 `days=1`（老 `:165`），不照 docstring「默认 2」
 *   （老 `:166-170`，文档错了）；
 * - 单日与范围走同一个函数（老 `:13-14` 统一 API，输出格式永远一致）；
 * - 当天体重取 `weight_log` 最新一条（老 `:50-68`），读不出即 null、不阻塞回写；
 * - 写库走显式事务，失败回滚（老 `:131-148`）。
 *
 * 修掉的老缺陷（不照抄）：老「写库失败仍退 0」（`backfill.py:139,147` 的 `fetch_ok: True`
 * 配 `__main__.py:108-111` 只看 `fetch_ok`）——新仓读数分清「拉到了没写进」
 * （`fetch_ok: true`＋`err` 写库）与「没拉到」（`fetch_ok: false`），退出码由 `run.ts` 按此分流。
 */

import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { resolveDbDir, resolveDbFileName } from '../paths.js';
import { CALORIE_CONFIG_DEFAULTS, loadCalorieConfig } from '../config.js';
import { openDb } from '../schema.js';
import { fetchTrains } from './fetch.js';
import type { FetchOptions, FetchOutcome } from './fetch.js';
import { xunjiResponseToRows } from './rows.js';
import { upsertXunjiRows } from './store.js';
import type { XunjiFailure } from './retry.js';

/** 回写默认天数的**默认档**（照签名 `days=1`，不照文档「默认 2」；默认值表里的那一项就是唯一定义地）。 */
export const BACKFILL_DEFAULT_DAYS = CALORIE_CONFIG_DEFAULTS.xunji.backfillDays;

/** 回写默认天数：配置里 `xunji.backfillDays`（<1 的坏值回落到默认档，写入口已按 ≥1 整数校验）。 */
export function backfillDefaultDays(): number {
  const configured = loadCalorieConfig().values.xunji.backfillDays;
  return configured >= 1 ? configured : BACKFILL_DEFAULT_DAYS;
}

/** 回写的注入缝（测试挡板从这里进；生产缺省＝真拉取＋真开库）。 */
export interface BackfillDeps {
  /** 拉一天（缺省 `fetchTrains(..., includeFullData: true)`：回写要 `done` 标记）。 */
  readonly fetchDay?: (dateStr: string) => Promise<FetchOutcome>;
  /** 缺省拉取的透传件（KEY／传输／超时／重试／睡眠；`includeFullData` 恒 true）。 */
  readonly fetchOpts?: FetchOptions;
  /** 开库（缺省 `openDb`：可写打开＋迁移；回写是写路径，不走只读口）。 */
  readonly openDb?: (dbFile: string) => DatabaseSync;
  /** 库文件（缺省 `<配置 db.dir／数据目录>/<配置 db.name>`；测试传 tmp）。 */
  readonly dbFile?: string;
}

/** 一天的回写读数（老 `_backfill_one`，`:77-89` 八键 ＋ 失败分类 `failure`）。 */
export interface BackfillDayResult {
  readonly date: string;
  readonly fetch_ok: boolean;
  readonly trains_count: number;
  readonly inserted: number;
  readonly updated: number;
  readonly skipped_empty: boolean;
  readonly body_weight_kg: number | null;
  readonly errors: readonly string[];
  /** 人话失败（null＝成功；`fetch_ok` 真＋`err` 有＝「拉到了没写进」）。 */
  readonly err: string | null;
  /** 拉取失败的分类（供退出码分流；拉取成功时为 null）。 */
  readonly failure: XunjiFailure | null;
}

/** 一个区间的回写读数（老 `backfill_range`，`:174-180` 五键）。 */
export interface BackfillRangeResult {
  readonly end_date: string;
  readonly days: number;
  readonly results: readonly BackfillDayResult[];
  readonly total_inserted: number;
  readonly total_updated: number;
}

/** `[end-days+1, end]` 的日期表（新在前，老 `:190-193` 同序；纯函数）。 */
export function rangeDates(endISO: string, days: number): string[] {
  const [y, m, d] = endISO.split('-').map(Number);
  const endMs = Date.UTC(y as number, (m as number) - 1, d as number);
  const out: string[] = [];
  for (let i = 0; i < days; i += 1) {
    out.push(new Date(endMs - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

/** 本地今天（老 `date.today()` 同口径；可注 `now` 供测试钉住）。 */
export function todayLocalISO(now: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return now.getFullYear() + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate());
}

function asTrains(response: unknown): readonly unknown[] {
  if (typeof response !== 'object' || response === null) return [];
  const res = (response as { res?: unknown }).res;
  if (typeof res !== 'object' || res === null) return [];
  const trains = (res as { trains?: unknown }).trains;
  return Array.isArray(trains) ? trains : [];
}

/** 最新体重（kg；读不出即 null，不阻塞回写，老 `:50-68` 同述）。 */
function readBodyWeightKg(db: DatabaseSync): number | null {
  try {
    const row = db
      .prepare('SELECT weight_kg FROM weight_log ORDER BY date DESC, id DESC LIMIT 1')
      .get() as { weight_kg?: unknown } | undefined;
    const w = row?.weight_kg;
    return typeof w === 'number' && Number.isFinite(w) ? w : null;
  } catch {
    return null;
  }
}

function closeQuietly(db: DatabaseSync | null): void {
  if (db === null) return;
  try {
    db.close();
  } catch {
    /* 关库失败不掩盖回写结论 */
  }
}

/** 回写一天：拉 → 转行 → 事务落库（调用方给什么日期就回写哪天，不做默认）。 */
export async function backfillOneDay(dateStr: string, deps: BackfillDeps = {}): Promise<BackfillDayResult> {
  const fetchDay = deps.fetchDay ?? ((d: string) => fetchTrains(d, { ...deps.fetchOpts, includeFullData: true }));
  const outcome = await fetchDay(dateStr);
  if (!outcome.ok) {
    return {
      date: dateStr, fetch_ok: false, trains_count: 0, inserted: 0, updated: 0,
      skipped_empty: true, body_weight_kg: null, errors: [],
      err: '拉取失败（没拉到）：' + outcome.failure.message, failure: outcome.failure,
    };
  }
  const trains = asTrains(outcome.response);
  let db: DatabaseSync | null = null;
  let openErr: string | null = null;
  try {
    db = (deps.openDb ?? openDb)(deps.dbFile ?? join(resolveDbDir(), resolveDbFileName()));
  } catch (e) {
    openErr = e instanceof Error ? e.message : String(e);
  }
  const weight = db === null ? null : readBodyWeightKg(db);
  const rows = xunjiResponseToRows(outcome.response);
  if (rows.length === 0) {
    closeQuietly(db);
    return {
      date: dateStr, fetch_ok: true, trains_count: trains.length, inserted: 0, updated: 0,
      skipped_empty: true, body_weight_kg: weight, errors: [], err: null, failure: null,
    };
  }
  if (db === null) {
    return {
      date: dateStr, fetch_ok: true, trains_count: trains.length, inserted: 0, updated: 0,
      skipped_empty: false, body_weight_kg: weight, errors: [openErr ?? '打不开库'],
      err: '写库失败（拉到了没写进）：打不开库：' + (openErr ?? '未知原因'), failure: null,
    };
  }
  try {
    db.exec('BEGIN');
    const report = upsertXunjiRows(db, rows);
    db.exec('COMMIT');
    closeQuietly(db);
    return {
      date: dateStr, fetch_ok: true, trains_count: trains.length,
      inserted: report.inserted, updated: report.updated,
      skipped_empty: false, body_weight_kg: weight, errors: report.errors, err: null, failure: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      db.exec('ROLLBACK');
    } catch {
      /* 回滚失败不掩盖原错 */
    }
    closeQuietly(db);
    return {
      date: dateStr, fetch_ok: true, trains_count: trains.length, inserted: 0, updated: 0,
      skipped_empty: false, body_weight_kg: weight, errors: [msg],
      err: '写库失败（拉到了没写进，已回滚）：' + msg, failure: null,
    };
  }
}

/** 回写 `[end-days+1, end]` 区间（`endDateStr` 空即今天；`days` 须为 ≥1 整数）。 */
export async function backfillRange(
  endDateStr: string | null,
  days: number = backfillDefaultDays(),
  deps: BackfillDeps = {},
): Promise<BackfillRangeResult> {
  if (!Number.isInteger(days) || days < 1) throw new Error('days 须为 ≥1 整数（实际：' + String(days) + '）');
  const end = endDateStr ?? todayLocalISO();
  const results: BackfillDayResult[] = [];
  let totalInserted = 0;
  let totalUpdated = 0;
  for (const d of rangeDates(end, days)) {
    const r = await backfillOneDay(d, deps);
    results.push(r);
    totalInserted += r.inserted;
    totalUpdated += r.updated;
  }
  return { end_date: end, days, results, total_inserted: totalInserted, total_updated: totalUpdated };
}
