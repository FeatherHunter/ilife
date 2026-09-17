// 日程与计划·#20 日程管家同步（op=sync）：反向对账（阶段 0）＋ 全量 diff ＋ 两侧兜底清理。
//
// 阶段 0 · 反向对账（S-11）：远端有、本地缺标识的，按 `(起, 止, 标题)` 索引回填；**多条候选不猜**（跳过并记账）。
// 阶段 A · 按本地存的标识配对：远端那条若被手动改了时段，尊重用户，把时段同步回本地（老口径）；
//           题／备注与本地不一致则以本地为准改远端。
// 阶段 B · 本地没标识的按四元组认；认不出才建。**过去日期默认不补建**（避免死灰复燃，老口径 `feishu_sync.py:756-759`）。
// 阶段 C · 远端有、本地没有、且**带归属锚**的 → 孤儿，删；不带锚的一律不动（S-12）。
// 收口 · 同一时间槽里带锚的冗余对象（历史重复建的残留）有兜底清理（S-12 同槽一侧）。
//
// 远端不可用即阻断（S-09／老家唯一「不可用就阻断」的入口）：回执标 `unavailable`，退出码非 0。
import { listPlanEvents, setFeishuEventId, updatePlanEvent, larkUpdateEvent, composeFeishuDescription } from '../fetch/index.js';
import { resolveDateParam, todayStr } from '../policy/index.js';
import type { PlanEvent } from '../fetch/index.js';
import { receiptResult, type PlanOpCtx, type PlanOpResult } from './context.js';
import { buildReceipt } from './receipt.js';
import { takeSnapshot, alignOne, matchIn, orphansOf, removeRemote, cleanSlot, type RemoteSnapshot } from './remoteDay.js';

export interface ReconcileOutcome {
  backfilled: { id: number; remoteId: string }[];
  skipped: string[];
}

/** 阶段 0：远端 → 本地回填标识。唯一命中才回填；多候选记「需手工处理」并跳过。 */
export function reconcileIds(snap: RemoteSnapshot, locals: PlanEvent[]): ReconcileOutcome {
  const index = new Map<string, string[]>();
  for (const e of snap.events) {
    if (!e.owned) continue;
    const k = e.slotStart + '|' + e.slotEnd + '|' + e.summary;
    index.set(k, [...(index.get(k) ?? []), e.eventId]);
  }
  const out: ReconcileOutcome = { backfilled: [], skipped: [] };
  for (const e of locals) {
    if (e.feishu_event_id) {
      // 已绑标识的也认领一下：免得阶段 C 把它们当成孤儿删掉。
      if (snap.events.some((r) => r.eventId === e.feishu_event_id)) snap.claimed.add(e.feishu_event_id);
      continue;
    }
    const hit = index.get(e.time_start + '|' + e.time_end + '|' + e.title) ?? [];
    if (hit.length === 1) out.backfilled.push({ id: e.id, remoteId: hit[0] });
    else if (hit.length > 1) out.skipped.push('本地 #' + e.id + '「' + e.title + '」远端有 ' + hit.length + ' 条撞键候选，跳过（需手工处理）');
  }
  return out;
}

export function runSync(ctx: PlanOpCtx): PlanOpResult {
  const date = resolveDateParam(ctx.params);
  if (!ctx.cli) {
    const why = ctx.remoteWhy ?? '远端不可用';
    return receiptResult(buildReceipt({
      op: 'sync',
      message: '重同步阻断：远端不可用（' + why + '）',
      local: 'unchanged', remote: 'unavailable', remoteId: null,
      errors: [why], date,
    }));
  }

  const errors: string[] = [];
  const notes: string[] = [];
  let snap: RemoteSnapshot;
  try {
    snap = takeSnapshot(ctx.cli, date);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return receiptResult(buildReceipt({
      op: 'sync', message: '重同步阻断：' + m, local: 'unchanged', remote: 'unavailable',
      remoteId: null, errors: [m], date,
    }));
  }
  errors.push(...snap.pullErrors);

  // 阶段 0：反向对账
  const rec = reconcileIds(snap, listPlanEvents(ctx.handle, date));
  for (const m of rec.backfilled) setFeishuEventId(ctx.handle, m.id, m.remoteId);
  notes.push(...rec.skipped);

  const isPast = date < todayStr();
  const counts = { backfilled: rec.backfilled.length, created: 0, updated: 0, deleted: 0, timeSynced: 0, pastSkipped: 0, duplicates: 0, failed: 0 };

  // 阶段 A／B：本地 → 远端
  for (const e of listPlanEvents(ctx.handle, date)) {
    const spec = {
      date, timeStart: e.time_start, timeEnd: e.time_end,
      title: e.title, notes: e.notes, remoteId: e.feishu_event_id,
    };
    const hit = matchIn(snap, spec);
    if (!hit) {
      if (isPast) { counts.pastSkipped++; continue; } // 过去日期：本地有、远端无 → 默认不补建
      const made = alignOne(snap, spec);
      errors.push(...made.errors);
      notes.push(...made.notes);
      if (made.remote === 'unavailable' || !made.remoteId) { counts.failed++; continue; }
      setFeishuEventId(ctx.handle, e.id, made.remoteId);
      counts.created++;
      continue;
    }
    snap.claimed.add(hit.eventId);
    if (hit.eventId !== e.feishu_event_id) setFeishuEventId(ctx.handle, e.id, hit.eventId);
    // 飞书侧被手动改了时段 → 尊重用户，把时段同步回本地
    if (hit.slotStart !== e.time_start || hit.slotEnd !== e.time_end) {
      updatePlanEvent(ctx.handle, e.id, { time_start: hit.slotStart, time_end: hit.slotEnd });
      counts.timeSynced++;
    }
    const want = composeFeishuDescription(e.notes);
    if (hit.summary !== e.title || hit.description !== want) {
      try {
        larkUpdateEvent(ctx.cli, hit.eventId, { summary: e.title, description: want });
        counts.updated++;
      } catch (err) {
        counts.failed++;
        errors.push('远端改失败：' + hit.eventId + '（' + (err instanceof Error ? err.message : String(err)) + '）');
      }
    }
  }

  // 阶段 C：孤儿（带锚、无人认领）→ 删
  for (const orphan of orphansOf(snap)) {
    const r = removeRemote(snap, orphan.eventId);
    if (r.ok) counts.deleted++;
    else { counts.failed++; errors.push('孤儿清理失败：' + orphan.eventId + '（' + r.error + '）'); }
  }

  // 收口：同槽冗余（带锚）兜底清理——留一条（优先认领过的那条），其余删。
  const owned = snap.events.filter((e) => e.owned);
  const bySlot = new Map<string, typeof owned>();
  for (const e of owned) {
    const k = e.slotStart + '|' + e.slotEnd;
    bySlot.set(k, [...(bySlot.get(k) ?? []), e]);
  }
  for (const [, group] of bySlot) {
    if (group.length < 2) continue;
    counts.duplicates += group.length - 1;
    const keeper = group.find((g) => snap.claimed.has(g.eventId)) ?? group[0];
    const slot = cleanSlot(snap, {
      date, timeStart: keeper.slotStart, timeEnd: keeper.slotEnd,
      title: keeper.summary, notes: null, keepId: keeper.eventId,
    });
    counts.deleted += slot.deleted.length;
    errors.push(...slot.errors);
  }

  const remote = counts.failed > 0 ? 'unavailable'
    : counts.created > 0 ? 'created_feishu'
      : counts.updated > 0 ? 'updated_feishu'
        : counts.deleted > 0 ? 'deleted_feishu' : 'found_feishu';
  const message = '已同步 ' + date + '：回填 ' + counts.backfilled + '／新增 ' + counts.created
    + '／更新 ' + counts.updated + '／清理 ' + counts.deleted + '／时段回写 ' + counts.timeSynced
    + (counts.pastSkipped ? '／过去日期跳过 ' + counts.pastSkipped : '')
    + (counts.duplicates ? '／同槽冗余 ' + counts.duplicates : '')
    + (errors.length ? '／错误 ' + errors.length : '');
  return receiptResult(buildReceipt({
    op: 'sync', message, local: 'updated', remote, remoteId: null, errors, notes, date, counts,
  }));
}
