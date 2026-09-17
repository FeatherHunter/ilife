// 日程与计划·#17 商量计划（整日覆盖式写入）与它的预览档。
//
// 两种语义分得开（S-13）：
//   `op=upsert`＝**覆盖**：整日先软删再整批落，本地以 (日期, 起, 止) 为身份；
//   `op=ensure`＝**缺则补**：命中即认，不改既有字段。
// 覆盖的那一侧还要把远端也覆盖掉：逐条对齐（建／认）＋ 该日**带归属锚**却已无本地对应的远端对象删掉
// （S-12 的孤儿一侧；老实现把这一步留在 `diff_and_sync`，本实现随合成写一起做掉）。
import { upsertPlanEvents, setFeishuEventId } from '../fetch/index.js';
import { validateUpsertInput } from '../policy/index.js';
import { receiptResult, type PlanOpCtx, type PlanOpResult } from './context.js';
import { buildReceipt, REMOTE_LABEL, type RemoteState } from './receipt.js';
import { takeSnapshot, alignOne, orphansOf, removeRemote } from './remoteDay.js';

/** `op=preview`：只校验不落盘（24h 覆盖 ＋ 字段合法），不碰远端。 */
export function runPreview(ctx: PlanOpCtx): PlanOpResult {
  const { date, events } = validateUpsertInput(ctx.params);
  return receiptResult(buildReceipt({
    op: 'preview',
    message: '预览通过：' + date + ' ' + events.length + ' 个事件 00:00~24:00 连续（确认后 op=upsert 落盘）',
    local: 'preview',
    remote: 'none',
    remoteId: null,
    date,
  }));
}

interface AlignCounts { created: number; found: number; deleted: number; failed: number }

/** 一整日里逐条动作合起来算哪一档：只要有一条没成，就是「远端没成」。 */
function dominantRemote(counts: AlignCounts): RemoteState {
  if (counts.failed > 0) return 'unavailable';
  if (counts.created > 0) return 'created_feishu';
  if (counts.deleted > 0) return 'deleted_feishu';
  return 'found_feishu';
}

export function runUpsert(ctx: PlanOpCtx): PlanOpResult {
  const { date, events } = validateUpsertInput(ctx.params);
  const rows = upsertPlanEvents(ctx.handle, date, events);

  const errors: string[] = [];
  const notes: string[] = [];
  const counts: AlignCounts = { created: 0, found: 0, deleted: 0, failed: 0 };
  let remote: RemoteState;

  if (ctx.cli) {
    let snap = null;
    try {
      snap = takeSnapshot(ctx.cli, date);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    if (snap) {
      errors.push(...snap.pullErrors);
      for (const row of rows) {
        const out = alignOne(snap, {
          date,
          timeStart: row.time_start,
          timeEnd: row.time_end,
          title: row.title,
          notes: row.notes,
          remoteId: row.feishu_event_id,
        });
        errors.push(...out.errors);
        notes.push(...out.notes);
        if (out.remote === 'created_feishu') counts.created++;
        else if (out.remote === 'found_feishu') counts.found++;
        else counts.failed++;
        if (out.remoteId && out.remoteId !== row.feishu_event_id) setFeishuEventId(ctx.handle, row.id, out.remoteId);
      }
      // 覆盖语义的第二半：本地这一日已没有的、带归属锚的远端对象，删掉。
      for (const orphan of orphansOf(snap)) {
        const r = removeRemote(snap, orphan.eventId);
        if (r.ok) counts.deleted++;
        else { counts.failed++; errors.push('孤儿清理失败：' + orphan.eventId + '（' + r.error + '）'); }
      }
      remote = dominantRemote(counts);
    } else {
      remote = 'unavailable';
    }
  } else if (ctx.remoteWhy) {
    errors.push(ctx.remoteWhy);
    remote = 'unavailable';
  } else {
    remote = 'skipped';
  }

  const message = '已落盘（覆盖）：' + date + ' ' + rows.length + ' 个事件；远端新增 ' + counts.created
    + '／认出 ' + counts.found + '／清理 ' + counts.deleted + '（' + REMOTE_LABEL[remote] + '）';
  return receiptResult(buildReceipt({
    op: 'upsert', message, local: 'upserted', remote,
    remoteId: null, errors, notes, date, counts: { ...counts, events: rows.length },
  }));
}
