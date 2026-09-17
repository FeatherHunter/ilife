/** 计划叠加：用本仓计划覆盖训记某天的训练（老 `xunji_bridge/overlay.py`，代码新写）。
 *
 * 口径（逐条对老）：
 * - 先拉训记当天 list（只拿 title→localid，不取 start/end），再读本仓当天 sessions，按 title 对账；
 * - 构造 `res[]`：localid 用训记已有的，start＝end＝0（覆盖＝新建语义，老 `:116-120`）；
 * - 单次 upsert 推全部（训记单次最多 4 条，老 `:161-174`），幂等键 `overlay_{date}_{uuid8}`；
 * - `missing` 缺省 `fail`（有缺即报 err 不推，老 `:123-138`），`skip` 只推匹配的（老 `:140-143`）；
 * - 拉取失败即带 err 回（老 `:66-78`）；`missing=fail` 的 err 走用法错 1（老 `__main__:230-233`），
 *   拉取／upsert 失败走 `exitMap`（无 KEY→2，401／403→3）。
 *
 * 修掉的老缺陷（不照抄）：老 `overlay.py:80` 的推导式 `{t["title"]: t["localid"]}`
 * 把同 title 的多条压成一条，后面的 localid 静默丢失——新仓按 title 分组收全部 localid，
 * sessions 按序逐条消耗（同 label 的第 2 个 session 拿第 2 个 localid），耗不完的 title
 * 留在 `extra_in_xunji`，每条已消耗的 localid 都写在 `matched` 里（逐 session 一项）。
 */

import { randomUUID } from 'node:crypto';
import { fetchTrains, parseTrains } from './fetch.js';
import type { FetchOptions, FetchOutcome } from './fetch.js';
import { sessionToResItem } from './request.js';
import type { XunjiResItem } from './request.js';
import { upsertTrains } from './upsert.js';
import type { UpsertOptions, UpsertOutcome } from './upsert.js';
import { dateProblem, resolveDayPlan } from './planSource.js';
import type { DayPlanSource } from './planSource.js';
import type { XunjiFailure } from './retry.js';
import { exitForFailure } from './exitMap.js';
import { XUNJI_EXIT_CODES } from './subcommands.js';
import type { XunjiSubcommand } from './subcommands.js';
import type { XunjiRun } from './run.js';

/** `missing` 策略（老 `overlay_day_plan` 签名同名同值）：`fail` 有缺即报／`skip` 跳过只推有的。 */
export type OverlayMissing = 'fail' | 'skip';

/** `overlayDayPlan` 的注入缝（测试挡板从这里进；生产全缺省＝真拉取＋真单次 upsert）。 */
export interface OverlayDeps {
  /** 取某天 sessions（缺省读卡路里库，见 `planSource.ts`）。 */
  readonly planSource?: DayPlanSource;
  /** 拉训记当天（缺省 `fetchTrains(..., includeFullData: true)`：要 localid 全表）。 */
  readonly fetchDay?: (dateStr: string) => Promise<FetchOutcome>;
  /** 缺省拉取的透传件（KEY／传输／超时／重试／睡眠）。 */
  readonly fetchOpts?: FetchOptions;
  /** 单次 upsert（缺省走 `upsertTrains`；测试给挡板，**不许打真接口**）。 */
  readonly upsert?: (resList: readonly XunjiResItem[], clientRequestId: string) => Promise<UpsertOutcome>;
  /** 缺省 upsert 的透传件（KEY／传输／超时／重试／睡眠）。 */
  readonly upsertOpts?: UpsertOptions;
  /** 只组请求不调接口（老 `dry_run` 同述；传输 0 次）。 */
  readonly dryRun?: boolean;
  /** 缺 title 策略（缺省 `fail`，老签名同值）。 */
  readonly missing?: OverlayMissing;
}

/** title → localid 全表（同 title 多条全留；修老 `overlay.py:80` 推导式丢 localid）。 */
export function groupLocalidsByTitle(trains: readonly { readonly title: unknown; readonly localid: unknown }[]): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const t of trains) {
    if (typeof t.title !== 'string' || t.title === '') continue;
    if (typeof t.localid !== 'number' || !Number.isInteger(t.localid)) continue;
    const list = out.get(t.title);
    if (list !== undefined) list.push(t.localid);
    else out.set(t.title, [t.localid]);
  }
  return out;
}

/** 一条 session 的叠加结果（老单条目改逐条：同 title 多 localid 才写得下）。 */
export interface OverlayMatch {
  readonly session_label: string;
  readonly localid: number;
  readonly ok: boolean;
  readonly client_request_id: string;
  /** 成功时为训记正文／dry-run 摘要；失败时为 `{ err: true, …失败读数 }`。 */
  readonly resp: unknown;
}

/** 一天的叠加读数（老 `overlay_day_plan` 八键 ＋ 失败分类 `failure` 供退出码分流）。 */
export interface OverlayDayResult {
  readonly date: string;
  readonly session_count: number;
  readonly trains_count: number;
  readonly matched: readonly OverlayMatch[];
  readonly missing_in_xunji: readonly string[];
  /** 还有 localid 没被消耗的 title（含从未匹配的；耗尽的不在内）。 */
  readonly extra_in_xunji: readonly string[];
  readonly ok_count: number;
  readonly fail_count: number;
  /** 人话失败（null＝成功；`failure` 空＋`err` 有＝用法错那支）。 */
  readonly err: string | null;
  readonly note: string | null;
  /** 拉取／upsert 失败的分类（供 `exitForFailure`；成功与用法错时为 null）。 */
  readonly failure: XunjiFailure | null;
}

function base(dateStr: string, sessionCount: number, trainsCount: number): Omit<OverlayDayResult, 'matched' | 'missing_in_xunji' | 'extra_in_xunji' | 'ok_count' | 'fail_count' | 'err' | 'note' | 'failure'> {
  return { date: dateStr, session_count: sessionCount, trains_count: trainsCount };
}

/** 叠加一天：拉训记 → 读本仓 → 按 title 对账 → 单次 upsert（调用方保证日期形状）。 */
export async function overlayDayPlan(dateStr: string, deps: OverlayDeps = {}): Promise<OverlayDayResult> {
  const missingOpt = deps.missing ?? 'fail';
  const fetchDay = deps.fetchDay ?? ((d: string) => fetchTrains(d, { ...deps.fetchOpts, includeFullData: true }));
  const outcome = await fetchDay(dateStr);
  if (!outcome.ok) {
    const err = '拉取失败（没拉到）：' + outcome.failure.message;
    return { ...base(dateStr, 0, 0), matched: [], missing_in_xunji: [], extra_in_xunji: [], ok_count: 0, fail_count: 1, err, note: null, failure: outcome.failure };
  }
  const trains = parseTrains(outcome.response);
  const queues = groupLocalidsByTitle(trains);
  const day = (deps.planSource ?? resolveDayPlan)(dateStr);
  if (!day.found) {
    return { ...base(dateStr, 0, trains.length), matched: [], missing_in_xunji: [], extra_in_xunji: [...queues.keys()], ok_count: 0, fail_count: 0, err: day.reason, note: null, failure: null };
  }
  const sessions = day.sessions;
  if (sessions.length === 0) {
    return {
      ...base(dateStr, 0, trains.length), matched: [], missing_in_xunji: [], extra_in_xunji: [...queues.keys()],
      ok_count: 0, fail_count: 0, err: null, note: '卡路里当天无 session（可能休息日或计划未配置），无可覆盖', failure: null,
    };
  }
  const resList: XunjiResItem[] = [];
  const consumed: { readonly session_label: string; readonly localid: number }[] = [];
  const missingInXunji: string[] = [];
  for (const s of sessions) {
    const label = s.session_label ?? '';
    const localid = queues.get(label)?.shift();
    if (localid === undefined) {
      missingInXunji.push(label);
      continue;
    }
    resList.push({ ...sessionToResItem(dateStr, s), localid });
    consumed.push({ session_label: label, localid });
  }
  const extra = [...queues.entries()].filter(([, q]) => q.length > 0).map(([t]) => t);
  if (missingInXunji.length > 0 && missingOpt === 'fail') {
    return {
      ...base(dateStr, sessions.length, trains.length), matched: [], missing_in_xunji: missingInXunji, extra_in_xunji: extra,
      ok_count: 0, fail_count: 0, err: '卡路里有但训记没：' + missingInXunji.join('、') + '（missing=fail 报错退出）', note: null, failure: null,
    };
  }
  if (resList.length === 0) {
    return {
      ...base(dateStr, sessions.length, trains.length), matched: [], missing_in_xunji: missingInXunji, extra_in_xunji: extra,
      ok_count: 0, fail_count: 0, err: null, note: '无可推送的 session（全部 missing 或空）', failure: null,
    };
  }
  const clientRequestId = 'overlay_' + dateStr + '_' + randomUUID().replace(/-/g, '').slice(0, 8);
  if (deps.dryRun === true) {
    const matched = consumed.map((c) => ({
      session_label: c.session_label, localid: c.localid, ok: true, client_request_id: clientRequestId,
      resp: { dry_run: true, client_request_id: clientRequestId, res_count: resList.length },
    }));
    return {
      ...base(dateStr, sessions.length, trains.length), matched, missing_in_xunji: missingInXunji, extra_in_xunji: extra,
      ok_count: matched.length, fail_count: 0, err: null, note: null, failure: null,
    };
  }
  const callUpsert = deps.upsert ?? ((list: readonly XunjiResItem[], cid: string) => upsertTrains(list, { ...deps.upsertOpts, clientRequestId: cid }));
  const up = await callUpsert(resList, clientRequestId);
  const resp: unknown = up.ok ? up.response : { err: true, ...up.failure, attempts: up.attempts };
  const matched = consumed.map((c) => ({ session_label: c.session_label, localid: c.localid, ok: up.ok, client_request_id: clientRequestId, resp }));
  return {
    ...base(dateStr, sessions.length, trains.length), matched, missing_in_xunji: missingInXunji, extra_in_xunji: extra,
    ok_count: up.ok ? matched.length : 0, fail_count: up.ok ? 0 : 1, err: null, note: null, failure: up.ok ? null : up.failure,
  };
}

type Values = Readonly<Record<string, string | boolean | readonly string[]>>;

/** `overlay-plan` 子命令的分派（`run.ts` 调；`missing=fail` 的缺 title 走 1）。 */
export async function runOverlayPlanCommand(sub: XunjiSubcommand, values: Values, deps: OverlayDeps = {}): Promise<XunjiRun> {
  const refuse = (why: string, data: unknown): XunjiRun => ({
    subcommand: 'overlay-plan', code: XUNJI_EXIT_CODES.error, message: why, data, stderr: why + '（用法：' + sub.usage + '）',
  });
  const date = values['--date'];
  if (typeof date !== 'string') return refuse('缺参数：--date', { usage: sub.usage });
  const bad = dateProblem(date);
  if (bad !== null) return refuse(bad, { usage: sub.usage });
  const missingRaw = values['--missing'];
  if (missingRaw !== undefined && missingRaw !== 'fail' && missingRaw !== 'skip') {
    return refuse('--missing 只能是 fail|skip（实际：' + String(missingRaw) + '）', { usage: sub.usage });
  }
  const result = await overlayDayPlan(date, {
    ...deps, dryRun: values['--dry-run'] === true, missing: missingRaw === 'skip' ? 'skip' : 'fail',
  });
  if (result.failure !== null) {
    const line = result.err ?? '叠加失败';
    return { subcommand: 'overlay-plan', code: exitForFailure(result.failure), message: line, data: result, stderr: line };
  }
  if (result.err !== null) {
    return { subcommand: 'overlay-plan', code: XUNJI_EXIT_CODES.error, message: result.err, data: result, stderr: result.err };
  }
  if (result.fail_count > 0) {
    const line = '叠加失败：' + date + ' upsert 未成功';
    return { subcommand: 'overlay-plan', code: XUNJI_EXIT_CODES.api, message: line, data: result, stderr: line };
  }
  return {
    subcommand: 'overlay-plan', code: XUNJI_EXIT_CODES.ok,
    message: '叠加成功：' + date + ' ' + result.ok_count + ' 条（训记 ' + result.trains_count + ' 条里对上 ' + result.matched.length + ' 条）',
    data: result, stderr: null,
  };
}
