// 日程与计划·远端当日快照与判重（能力内部件）：一次拉取、多次判定、一次收口。
//
// 两侧自然键**不必相同**（判据第一节）：本地是 `(日期, 起, 止)` 三元组（title 只展示、不参与身份，S-02），
// 远端是 `(日期, 起, 止, 标题)` 四元组（S-03）。所以判重有两道：
//   ① 本地有没有这一条 → 由 `fetch/db.ts` 的三元组查重管（不在本件）
//   ② 远端有没有这一条 → 由本件管（**不再只看本地存的标识**，这就是 D-12 的修法：
//      老家 `op=sync` 调了 `searchFeishuEvents` 却把返回值丢了，见 `cmd_read.ts:293` 旧码）
//
// 「谁是我管的」只有一个判据：远端对象描述里带归属锚（S-06／S-12）。不带锚的**一律不许动**。
import { ScheduleFetchError } from '../fetch/errors.js';
import { larkCreateEvent, larkDeleteEvent, composeFeishuDescription } from '../fetch/feishu.js';
import { pullFeishuDate, type RemoteEvent } from './pull.js';
import { toFeishuISO } from './iso.js';
import type { RemoteState } from './receipt.js';

export interface RemoteSnapshot {
  cli: string;
  date: string;
  events: RemoteEvent[];
  /** 拉取期间记下的错（分片失败等）：不假装远端干净，也不因此阻断本地写。 */
  pullErrors: string[];
  calls: { agenda: number; search: number; detail: number };
  /** 已被本地事件认领的远端对象 id（＝远端一侧的「已对上」集合）。 */
  claimed: Set<string>;
}

/** 一次拉取；拿不到远端（两路全断）即上抛，由调用方按降级处理。 */
export function takeSnapshot(cli: string, date: string): RemoteSnapshot {
  const pulled = pullFeishuDate(cli, date);
  return { cli, date, events: pulled.events, pullErrors: pulled.errors, calls: pulled.calls, claimed: new Set<string>() };
}

export interface AlignSpec {
  date: string;
  timeStart: string;
  timeEnd: string;
  title: string;
  notes?: string | null;
  /** 本地已存的远端标识（有就先按它认；认不到再按四元组认；都没有就建）。 */
  remoteId?: string | null;
}

export interface AlignOutcome {
  remote: RemoteState;
  remoteId: string | null;
  /** 真失败（远端建／写失败等）：非空即这一条没对齐。 */
  errors: string[];
  /** 说明性的话（已自动改认／不是我的对象）：不影响达成判定。 */
  notes: string[];
}

/** 远端判重：先按本地存的标识认，再按四元组认（只看带归属锚的）。 */
export function matchIn(snap: RemoteSnapshot, spec: AlignSpec): RemoteEvent | null {
  if (spec.remoteId) {
    const byId = snap.events.find((e) => e.eventId === spec.remoteId);
    if (byId) return byId;
  }
  return snap.events.find(
    (e) => e.owned && e.summary === spec.title && e.slotStart === spec.timeStart && e.slotEnd === spec.timeEnd,
  ) ?? null;
}

/**
 * 把一条本地事实对齐到远端：命中即回填标识（幂等），未命中即建（描述带归属锚）。
 * 拿不到远端标识（D-11）**绝不写空**：返回 `unavailable` ＋ 明确错误，让调用方与退出码如实反映。
 */
export function alignOne(snap: RemoteSnapshot, spec: AlignSpec): AlignOutcome {
  const errors: string[] = [];
  const notes: string[] = [];
  const hit = matchIn(snap, spec);
  if (hit) {
    snap.claimed.add(hit.eventId);
    if (spec.remoteId && spec.remoteId !== hit.eventId) {
      notes.push('本地存的远端标识与远端实际不符，已按四元组改认：' + spec.remoteId + ' → ' + hit.eventId);
    }
    return { remote: 'found_feishu', remoteId: hit.eventId, errors, notes };
  }
  // 远端同槽位有不带锚的对象：那不是我的，不动它，但要说出来（免得用户以为系统漏了）。
  const foreign = snap.events.find(
    (e) => !e.owned && e.summary === spec.title && e.slotStart === spec.timeStart && e.slotEnd === spec.timeEnd,
  );
  if (foreign) notes.push('远端同槽位存在不带归属标记的事件（不是本技能管的，不动它）：' + foreign.eventId);
  try {
    const created = larkCreateEvent(
      snap.cli,
      toFeishuISO(spec.date, spec.timeStart),
      toFeishuISO(spec.date, spec.timeEnd),
      spec.title,
      composeFeishuDescription(spec.notes),
    );
    snap.events.push({ ...created, slotStart: spec.timeStart, slotEnd: spec.timeEnd });
    snap.claimed.add(created.eventId);
    return { remote: 'created_feishu', remoteId: created.eventId, errors, notes };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { remote: 'unavailable', remoteId: null, errors: [...errors, m], notes };
  }
}

/**
 * 同槽兜底清理（S-12 的同槽一侧）：飞书日历没有「改时间」，改时段＝建新 ＋ 删旧；
 * 删旧失败或历史上留了重复时，把该槽位里**带归属锚**的其它对象删掉，只留 keeper。
 * 不带锚的一律不动。
 */
export function cleanSlot(snap: RemoteSnapshot, spec: AlignSpec & { keepId: string }): { deleted: string[]; errors: string[] } {
  const deleted: string[] = [];
  const errors: string[] = [];
  const others = snap.events.filter(
    (e) => e.owned && e.eventId !== spec.keepId && e.slotStart === spec.timeStart && e.slotEnd === spec.timeEnd,
  );
  for (const e of others) {
    try {
      larkDeleteEvent(snap.cli, e.eventId);
      deleted.push(e.eventId);
      snap.claimed.delete(e.eventId);
      snap.events = snap.events.filter((x) => x.eventId !== e.eventId);
    } catch (err) {
      errors.push('同槽清理失败：' + e.eventId + '（' + (err instanceof Error ? err.message : String(err)) + '）');
    }
  }
  return { deleted, errors };
}

/** 孤儿＝带归属锚、但没有任何本地事件认领的远端对象（S-12：该清；不带锚的进不来这个集合）。 */
export function orphansOf(snap: RemoteSnapshot): RemoteEvent[] {
  return snap.events.filter((e) => e.owned && !snap.claimed.has(e.eventId));
}

/** 删远端对象（删计划、孤儿清理、自检清理共用这一个出口）。 */
export function removeRemote(snap: RemoteSnapshot, eventId: string): { ok: boolean; error?: string } {
  try {
    larkDeleteEvent(snap.cli, eventId);
    snap.claimed.delete(eventId);
    snap.events = snap.events.filter((e) => e.eventId !== eventId);
    return { ok: true };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, error: m };
  }
}

export function rethrowRemoteUnavailable(e: unknown): never {
  if (e instanceof ScheduleFetchError) throw e;
  throw new ScheduleFetchError('LARK_BAD_RESPONSE', '远端不可达：' + (e instanceof Error ? e.message : String(e)));
}
