/** 推送请求形状：训练 session → 训记 `res[]` 项 ＋ upsert 包体组装。
 *
 * 口径（严格模仿老实现，代码新写；只读参照 `xunji_bridge/push.py:81-110`、`upsert.py:90-96`）：
 * - `res[].datestr` 用传入的 `YYYY-MM-DD` 原样（**不转时间戳**）；
 * - `localid = 0`（新建；更新语义是 `overlay-plan` 那条的活，归 #610）；
 * - `start ＝ end ＝ 0`（避训记 BUG，老 `push.py:84-89` 注释同述）；
 * - `movements[].name` **原样上报**：推送前**不校验**动作库（老 `push.py` 不 import `catalog`；
 *   “先审计”是调用链的第一步，不是推送本身的能力）；
 * - 每条 set 写死 `done: false`，重量／次数／单位各自标量化（缺省 `"0"`／`"0"`／`"kg"`，
 *   老 `push.py:95-100`；`weight` 缺时回退读 `load`，兼容两种库内写法）。
 *
 * 本件是纯函数：不读库、不调网、不读时钟——同输入必得同输出（挡板断言直接调它）。
 */

import type { PlanMovement, PlanSessionRow } from '../workout/index.js';

/** 训记 `res[]` 里一条 set 的形状（上报口径，老 `push.py:95-100`）。 */
export interface XunjiSet {
  readonly done: boolean;
  readonly weight: string;
  readonly unit: string;
  readonly reps: string;
}

/** 训记 `res[]` 里一个 movement 的形状（上报口径：只留 `name ＋ sets` 两键）。 */
export interface XunjiMovement {
  readonly name: string;
  readonly sets: readonly XunjiSet[];
}

/** 训记 `res[]` 的一项（一次推送的最小单位，老 `push.py:103-110` 六键）。 */
export interface XunjiResItem {
  readonly datestr: string;
  readonly localid: number;
  readonly title: string;
  readonly start: number;
  readonly end: number;
  readonly movements: readonly XunjiMovement[];
}

/** upsert 包体（老 `upsert.py:90-96` 五键；`res` 透传，本件不改它一字）。 */
export interface UpsertPayload {
  readonly schema_version: 'train_open_api_v2';
  readonly client_request_id: string;
  readonly dry_run: boolean;
  readonly include_full_data: boolean;
  readonly res: readonly XunjiResItem[];
}

/** 任意值安全转上报串（老 `_safe_str`，`push.py:32-43`）：标量转串，非标量退回缺省。 */
function safeStr(v: unknown, fallback: string): string {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  return fallback;
}

/** 一条库内 set → 上报 set（`done` 写死 false；`weight` 缺时回退 `load`）。 */
function toXunjiSet(s: unknown): XunjiSet {
  const rec = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
  const weight = 'weight' in rec && rec.weight !== undefined && rec.weight !== null ? rec.weight : rec.load;
  return {
    done: false,
    weight: safeStr(weight, '0'),
    unit: safeStr(rec.unit ?? 'kg', 'kg'),
    reps: safeStr(rec.reps, '0'),
  };
}

/** 一个库内动作 → 上报 movement（`name` 原样，只过标量化；`sets` 缺时为空表）。 */
function toXunjiMovement(m: PlanMovement): XunjiMovement {
  const sets = Array.isArray(m.sets) ? m.sets : [];
  return { name: safeStr(m.name ?? '', ''), sets: sets.map(toXunjiSet) };
}

/** 一天里一个 session → 训记 `res[]` 一项（老 `_session_to_res`，`push.py:81-110`）。 */
export function sessionToResItem(dateStr: string, session: Pick<PlanSessionRow, 'session_label' | 'movements'>): XunjiResItem {
  const movements = Array.isArray(session.movements) ? session.movements : [];
  return {
    datestr: dateStr,
    localid: 0,
    title: session.session_label ?? '',
    start: 0,
    end: 0,
    movements: movements.map(toXunjiMovement),
  };
}

/** 组 upsert 包体（`res` 透传；调用方已备好的 `res[]` 进来是什么出去就是什么）。 */
export function buildUpsertPayload(
  resList: readonly XunjiResItem[],
  clientRequestId: string,
  includeFullData: boolean,
): UpsertPayload {
  return {
    schema_version: 'train_open_api_v2',
    client_request_id: clientRequestId,
    dry_run: false,
    include_full_data: includeFullData,
    res: resList,
  };
}
