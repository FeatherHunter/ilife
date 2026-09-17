// 日程与计划·#13 补计划（合成写）：本地按三元组补，远端按四元组认——一条命令把两侧对齐。
//
// 本地：`ensurePlanEvent`（三元组幂等，title 只展示不参与身份，S-02）。
// 远端：**一律查一趟再判**（D-12 的修法）——认出来就回填标识（`found_feishu`，幂等），
//      认不出就建（描述带归属锚 `作息管家自动同步[ · notes]`，S-06），建完回填标识（S-05）。
// 远端不在场：本地照写（A6① 降级），回执如实标 `unavailable`，退出码非零（A6②／用户故事 6）。
import { ensurePlanEvent, setFeishuEventId } from '../fetch/index.js';
import { validateEnsureInput } from '../policy/index.js';
import { receiptResult, type PlanOpCtx, type PlanOpResult } from './context.js';
import { buildReceipt, REMOTE_LABEL, type RemoteState } from './receipt.js';
import { takeSnapshot, alignOne } from './remoteDay.js';

export function runEnsure(ctx: PlanOpCtx): PlanOpResult {
  const input = validateEnsureInput(ctx.params);
  const { event, created } = ensurePlanEvent(ctx.handle, input);

  let remote: RemoteState = 'skipped';
  let remoteId: string | null = event.feishu_event_id;
  const errors: string[] = [];
  const notes: string[] = [];

  if (ctx.cli) {
    let snap = null;
    try {
      snap = takeSnapshot(ctx.cli, input.date);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    if (snap) {
      errors.push(...snap.pullErrors);
      const out = alignOne(snap, {
        date: input.date,
        timeStart: event.time_start,
        timeEnd: event.time_end,
        title: event.title,
        notes: event.notes,
        remoteId: event.feishu_event_id,
      });
      remote = out.remote;
      remoteId = out.remoteId;
      errors.push(...out.errors);
      notes.push(...out.notes);
      if (out.remoteId && out.remoteId !== event.feishu_event_id) setFeishuEventId(ctx.handle, event.id, out.remoteId);
    } else {
      remote = 'unavailable';
    }
  } else if (ctx.remoteWhy) {
    errors.push(ctx.remoteWhy);
    remote = 'unavailable';
  }

  const message = '已补计划 #' + event.id + '：' + input.date + ' ' + event.time_start + '~' + event.time_end + ' '
    + event.title + '（' + (created ? '本地新建' : '本地已有（幂等未重复）') + '／' + REMOTE_LABEL[remote] + '）';
  return receiptResult(buildReceipt({
    op: 'ensure',
    message,
    local: created ? 'created' : 'found',
    remote,
    remoteId,
    errors,
    notes,
    id: event.id,
    date: input.date,
  }));
}
