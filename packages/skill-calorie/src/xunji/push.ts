/** 推一天的训练计划（老 `xunji_bridge/push.py:push_day_plan`，`:113-197`，代码新写）。
 *
 * 行为（逐条对老）：
 * - 入参是**日期 ＋ 当天的 sessions**（读库取天是 `planSource.ts` 的活；本件只转＋推）；
 * - 无 session 即回 `session_count: 0` ＋ `note`（老 `:135-143`），不算失败；
 * - 每个 session 一个 `client_request_id`：`{date}_{label}_{uuid8}`（老 `:151-153`，
 *   语义前缀便查日志、短 uuid 防训记去重）；
 * - 逐个 upsert，每次调用前过 45 秒限频门（`rateLimit.ts`；老 `:156-158` 的“睡够再调”保留，
 *   跨段／跨天一视同仁是本票修掉的那条，见该件决议）；
 * - 汇总 `{date, session_count, results, ok_count, fail_count, verify_note}`（老 `:187-197`）；
 * - `verified` 只在响应里真看得到 train 才 true（训记 v2 响应缺陷，老 `:173-184` 同述，
 *   真值以 `fetch --full` 为准，归 #608）；
 * - 失败不吞：每条结果带原响应／结构化失败，`fail_count` 进退出码（见 `exitMap.ts`；
 *   老 `sync_plan.py:337-339` “只打印不进退出码”是缺陷，不照抄）。
 */

import { randomUUID } from 'node:crypto';
import { sessionToResItem } from './request.js';
import type { XunjiResItem } from './request.js';
import { createRateLimiter } from './rateLimit.js';
import type { RateLimiterDeps } from './rateLimit.js';
import { upsertTrains } from './upsert.js';
import type { UpsertOptions, UpsertOutcome } from './upsert.js';
import type { PlanSessionRow } from '../workout/planStore.js';

/** `pushDayPlan` 要的 session 形状（`planSource.ts` 给的就是这形；`movements` 缺时当空表）。 */
export type PushSession = Pick<PlanSessionRow, 'session_label' | 'movements'>;

/** 一个 session 的推送结果（老 `:179-185` 五键；`resp` 失败时为结构化失败，不吞）。 */
export interface PushSessionResult {
  readonly session_label: string;
  readonly client_request_id: string;
  readonly ok: boolean;
  /** 响应里真看得到 train（老 `:183`）；dry-run 时为 false（没调接口，不断言写入）。 */
  readonly verified: boolean;
  /** 成功时为训记正文／dry-run 摘要；失败时为 `{ err: true, …失败读数 }`。 */
  readonly resp: unknown;
}

/** 一天的推送汇总（老 `:187-197`；`note` 只在无 session 时出现）。 */
export interface PushDaySummary {
  readonly date: string;
  readonly session_count: number;
  readonly results: readonly PushSessionResult[];
  readonly ok_count: number;
  readonly fail_count: number;
  readonly verify_note: string;
  readonly note?: string;
}

/** `pushDayPlan` 的可注入件（测试挡板从这里进；生产全缺省）。 */
export interface PushDayDeps {
  /** 只转不调（仍过转换与汇总；不限频、不记限频，老 `push.py:156` 同述）。 */
  readonly dryRun?: boolean;
  /** upsert 调用（缺省走 `upsertTrains`；测试给挡板，**不许打真接口**）。 */
  readonly upsert?: (resItem: XunjiResItem, clientRequestId: string) => Promise<UpsertOutcome>;
  /** upsert 缺省路径的透传件（`key／transport／timeoutMs／maxRetries／sleep`，见 `UpsertOptions`）。 */
  readonly upsertOpts?: UpsertOptions;
  /** 限频门的可注入件（时钟／睡眠／状态文件，见 `RateLimiterDeps`）。 */
  readonly rateLimit?: RateLimiterDeps;
}

/** 响应里有没有 train（老 `:176-184`：`res.trains` 非空数组才算强证据）。 */
function hasTrains(response: unknown): boolean {
  if (typeof response !== 'object' || response === null) return false;
  const res = (response as { res?: unknown }).res;
  if (typeof res !== 'object' || res === null) return false;
  const trains = (res as { trains?: unknown }).trains;
  return Array.isArray(trains) && trains.length > 0;
}

const VERIFY_NOTE =
  '响应里 verified=True 的表示训记已显式回执；verified=False 的实际可能已写入，' +
  '但训记 v2 接口响应缺陷导致 trains 为空——用 fetch --full 二次确认（归 #608）';

/** 推一天（`dateStr` 原样进 `res[].datestr` 与幂等键前缀，不做任何日期换算）。 */
export async function pushDayPlan(dateStr: string, sessions: readonly PushSession[], deps: PushDayDeps = {}): Promise<PushDaySummary> {
  const dryRun = deps.dryRun ?? false;
  if (sessions.length === 0) {
    return {
      date: dateStr,
      session_count: 0,
      results: [],
      ok_count: 0,
      fail_count: 0,
      verify_note: VERIFY_NOTE,
      note: '无 session（可能休息日或计划未配置）',
    };
  }
  const limiter = createRateLimiter(deps.rateLimit ?? {});
  const callUpsert =
    deps.upsert ??
    ((resItem: XunjiResItem, clientRequestId: string) =>
      upsertTrains([resItem], { ...deps.upsertOpts, clientRequestId, dryRun }));
  const results: PushSessionResult[] = [];
  let ok = 0;
  let fail = 0;
  for (const s of sessions) {
    const label = s.session_label ?? '';
    const clientRequestId = dateStr + '_' + label + '_' + randomUUID().replace(/-/g, '').slice(0, 8);
    await limiter.guard(dryRun);
    const resItem = sessionToResItem(dateStr, s);
    const outcome = await callUpsert(resItem, clientRequestId);
    if (outcome.ok) {
      ok += 1;
      results.push({ session_label: label, client_request_id: clientRequestId, ok: true, verified: dryRun ? false : hasTrains(outcome.response), resp: outcome.response });
    } else {
      fail += 1;
      results.push({ session_label: label, client_request_id: clientRequestId, ok: false, verified: false, resp: { err: true, ...outcome.failure, attempts: outcome.attempts } });
    }
  }
  return { date: dateStr, session_count: sessions.length, results, ok_count: ok, fail_count: fail, verify_note: VERIFY_NOTE };
}
