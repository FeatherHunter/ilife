// 日程与计划·#18 改计划 与 #19 删计划（单条合成写）。
//
// 改计划：本地改一列，远端跟着改。**时段变了＝远端删旧建新**（飞书日历没有「改时间」这个动作，
// 老实现同口径 `schedule_cli.py:1160-1200`），建新成功后才删旧；删旧失败走同槽兜底清理（S-12），
// 保证远端同槽里只剩一条（否则用户日历上会同时挂着旧＋新）。内容变了（题／备注）→ 直接改远端那一条。
// 删计划：本地软删（`is_active=0`）＋ 远端真删——`deleteFeishuEvent` 在老家**零调用**，
// 本实现把它接上（缺口在 #659 已点名）。
import { getPlanEvent, setFeishuEventId, updatePlanEvent, deactivatePlanEvent, larkUpdateEvent, composeFeishuDescription } from '../fetch/index.js';
import { SchedulePolicyError } from '../fetch/errors.js';
import { validateUpdateInput, toMinutes } from '../policy/index.js';
import { receiptResult, type PlanOpCtx, type PlanOpResult } from './context.js';
import { buildReceipt, REMOTE_LABEL, type RemoteState } from './receipt.js';
import { takeSnapshot, alignOne, cleanSlot, removeRemote, type RemoteSnapshot } from './remoteDay.js';

export function runUpdate(ctx: PlanOpCtx): PlanOpResult {
  const { id, patch } = validateUpdateInput(ctx.params);
  const before = getPlanEvent(ctx.handle, id);
  const nextStart = (patch.time_start as string | undefined) ?? before.time_start;
  const nextEnd = (patch.time_end as string | undefined) ?? before.time_end;
  if (toMinutes(nextEnd) <= toMinutes(nextStart)) {
    throw new SchedulePolicyError('POLICY_BAD_TIME', 'time_end 必须晚于 time_start（' + nextStart + '~' + nextEnd + '）');
  }
  const after = updatePlanEvent(ctx.handle, id, patch as Partial<typeof before>);
  const moved = nextStart !== before.time_start || nextEnd !== before.time_end;

  const errors: string[] = [];
  const notes: string[] = [];
  const counts = { moved: moved ? 1 : 0, remoteDeleted: 0, slotCleaned: 0, remoteUpdated: 0 };
  let remote: RemoteState;
  let remoteId: string | null = after.feishu_event_id;

  if (ctx.cli) {
    let snap: RemoteSnapshot | null = null;
    try {
      snap = takeSnapshot(ctx.cli, after.date);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    if (snap) {
      errors.push(...snap.pullErrors);
      if (moved) {
        // 建新的（先建后删：建失败时旧的不动，用户日历不会出现空窗）
        const made = alignOne(snap, {
          date: after.date, timeStart: nextStart, timeEnd: nextEnd,
          title: after.title, notes: after.notes, remoteId: null,
        });
        errors.push(...made.errors);
        notes.push(...made.notes);
        if (made.remote === 'unavailable' || !made.remoteId) {
          remote = 'unavailable';
        } else {
          const old = before.feishu_event_id;
          if (old && old !== made.remoteId) {
            const del = removeRemote(snap, old);
            if (del.ok) counts.remoteDeleted++;
            else errors.push('删旧远端事件失败：' + old + '（' + del.error + '）');
          }
          const slot = cleanSlot(snap, {
            date: after.date, timeStart: nextStart, timeEnd: nextEnd,
            title: after.title, notes: after.notes, keepId: made.remoteId,
          });
          errors.push(...slot.errors);
          counts.slotCleaned += slot.deleted.length;
          setFeishuEventId(ctx.handle, id, made.remoteId);
          remoteId = made.remoteId;
          remote = made.remote;
        }
      } else {
        const out = alignOne(snap, {
          date: after.date, timeStart: after.time_start, timeEnd: after.time_end,
          title: after.title, notes: after.notes, remoteId: after.feishu_event_id,
        });
        errors.push(...out.errors);
        notes.push(...out.notes);
        if (out.remote === 'unavailable' || !out.remoteId) {
          remote = 'unavailable';
        } else {
          const hit = snap.events.find((e) => e.eventId === out.remoteId);
          const want = composeFeishuDescription(after.notes);
          if (hit && (hit.summary !== after.title || hit.description !== want)) {
            try {
              larkUpdateEvent(ctx.cli, out.remoteId, { summary: after.title, description: want });
              counts.remoteUpdated++;
              remote = 'updated_feishu';
            } catch (e) {
              errors.push('远端改失败：' + (e instanceof Error ? e.message : String(e)));
              remote = 'unavailable';
            }
          } else {
            remote = out.remote;
          }
          if (out.remoteId !== after.feishu_event_id) setFeishuEventId(ctx.handle, id, out.remoteId);
          remoteId = out.remoteId;
        }
      }
    } else {
      remote = 'unavailable';
    }
  } else if (ctx.remoteWhy) {
    errors.push(ctx.remoteWhy);
    remote = 'unavailable';
  } else {
    remote = 'skipped';
  }

  const changes = Object.keys(patch).join('／');
  const message = '已改计划 #' + id + '（' + changes + '）' + (moved ? '，时段 → ' + nextStart + '~' + nextEnd : '')
    + '（' + REMOTE_LABEL[remote] + '）';
  return receiptResult(buildReceipt({
    op: 'update', message, local: 'updated', remote, remoteId, errors, notes, id, date: after.date, counts,
  }));
}

export function runDeactivate(ctx: PlanOpCtx): PlanOpResult {
  const id = ctx.params.id as number;
  const before = getPlanEvent(ctx.handle, id);
  deactivatePlanEvent(ctx.handle, id);

  const errors: string[] = [];
  const notes: string[] = [];
  const counts = { remoteDeleted: 0, slotCleaned: 0 };
  let remote: RemoteState;
  let remoteId: string | null = before.feishu_event_id;

  if (ctx.cli) {
    let snap: RemoteSnapshot | null = null;
    try {
      snap = takeSnapshot(ctx.cli, before.date);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    if (snap) {
      errors.push(...snap.pullErrors);
      if (before.feishu_event_id) {
        const r = removeRemote(snap, before.feishu_event_id);
        if (r.ok) counts.remoteDeleted++;
        else errors.push('远端删失败：' + before.feishu_event_id + '（' + r.error + '）');
      }
      // 同槽兜底：软删之后这个槽位不该再留任何「我管的」远端对象（老实现只在改时段时兜底，
      // 删除路径同样会留残——同一口径，一并兜住）。
      const slot = cleanSlot(snap, {
        date: before.date, timeStart: before.time_start, timeEnd: before.time_end,
        title: before.title, notes: before.notes, keepId: '',
      });
      counts.slotCleaned += slot.deleted.length;
      errors.push(...slot.errors);
      remoteId = null;
      remote = errors.length ? 'unavailable'
        : counts.remoteDeleted + counts.slotCleaned > 0 ? 'deleted_feishu' : 'found_feishu';
    } else {
      remote = 'unavailable';
    }
  } else if (ctx.remoteWhy) {
    errors.push(ctx.remoteWhy);
    remote = 'unavailable';
  } else {
    remote = 'skipped';
  }

  const message = '已删计划（软删 #' + id + '）' + (remote === 'deleted_feishu' ? '，远端那条也删了' : '')
    + '（' + REMOTE_LABEL[remote] + '）';
  return receiptResult(buildReceipt({
    op: 'deactivate', message, local: 'deleted', remote, remoteId, errors, notes, id, date: before.date, counts,
  }));
}
