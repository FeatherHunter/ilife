// 日程与计划·#13 补计划（合成写）：本地按三元组补，远端按四元组认——一条命令把两侧对齐。
//
// 本地：`ensurePlanEvent`（三元组幂等，title 只展示不参与身份，S-02）。
// 远端：**一律查一趟再判**（D-12 的修法）——认出来就回填标识（`found_feishu`，幂等），
//      认不出就建（描述带归属锚 `作息管家自动同步[ · notes]`，S-06），建完回填标识（S-05）。
// 远端不在场：本地照写（A6① 降级），回执如实标 `unavailable`，退出码非零（A6②／用户故事 6）。
import { ensurePlanEvent, setFeishuEventId } from '../fetch/index.js';
import { validateEnsureBatchInput, validateEnsureInput } from '../policy/index.js';
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

// #599 补计划多天批量（写侧）：`dates[]` 按天展开，逐天走既有单天合成写 `runEnsure`，不另造写路径。
// 逐天幂等（三元组口径由单天那一侧保证）；有任一天没对齐 ⇒ 顶层 errors 非空（逐条前缀日期点名）
// ＋ remote 置 `unavailable` ⇒ 退出码非 0；回执 `items[]` 逐天分字段（local／remote／remoteId／id／date）。
export function runEnsureBatch(ctx: PlanOpCtx): PlanOpResult {
  const { items } = validateEnsureBatchInput(ctx.params);
  const perDay: Record<string, unknown>[] = [];
  const errors: string[] = [];
  const notes: string[] = [];
  const dates: string[] = [];
  let created = 0;
  let found = 0;
  let failed = 0;
  const remotes = new Set<RemoteState>();

  for (const item of items) {
    const sub: PlanOpCtx = {
      handle: ctx.handle,
      params: {
        date: item.date,
        time_start: item.time_start,
        time_end: item.time_end,
        title: item.title,
        ...(item.notes !== undefined ? { notes: item.notes } : {}),
        ...(item.category !== undefined ? { category: item.category } : {}),
      },
      cli: ctx.cli,
      remoteWhy: ctx.remoteWhy,
    };
    const r = runEnsure(sub);
    const d = r.data as { local: string; remote: RemoteState; errors: string[]; notes: string[]; achieved: boolean };
    dates.push(item.date);
    perDay.push(r.data);
    if (d.local === 'created') created++;
    else found++;
    remotes.add(d.remote);
    if (!d.achieved) {
      failed++;
      if (d.errors.length) {
        for (const e of d.errors) errors.push(item.date + '：' + e);
      } else {
        errors.push(item.date + '：远端没成（remote=' + d.remote + '）');
      }
    }
    for (const n of d.notes) notes.push(item.date + '：' + n);
  }

  let remote: RemoteState;
  if (remotes.has('unavailable')) remote = 'unavailable';
  else if (remotes.has('created_feishu')) remote = 'created_feishu';
  else if (remotes.has('found_feishu')) remote = 'found_feishu';
  else remote = 'skipped';

  const sorted = [...dates].sort();
  const message = '批量补计划 ' + sorted[0] + '~' + sorted[sorted.length - 1] + '：' + items.length
    + ' 天（本地新建 ' + created + '／已有 ' + found + '／失败 ' + failed + '／' + REMOTE_LABEL[remote] + '）';
  return receiptResult(buildReceipt({
    op: 'ensure',
    message,
    local: created > 0 ? 'created' : 'found',
    remote,
    remoteId: null,
    errors,
    notes,
    dates: sorted,
    counts: { days: items.length, created, found, failed },
    items: perDay,
  }));
}
