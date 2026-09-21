// 日程与计划（HELP 一级分组「日程与计划」）能力门。
//
// 这个目录装什么（照票 #199 的结构裁定）：`schedule.plan.write` 的全部 op（补计划／商量计划／改计划／
// 删计划／复盘／日程管家同步 ＋ 飞书自检）与日程查询的 24h 聚合视图（#15／#16）。
// 出门只给三件：一个 op 分发器、一个聚合视图装配、两个类型。
//
// 一条命令的六件事（键／形状／标题／唤醒词／示例／处理函数）里，键与唤醒词的声明已住本目录
// （`./commands.ts`＋`./routes.js`，#780 Layer1）；分派翻转在 Layer2（退役 `policy/` 手表与 `cli/` switch）。
export * from './commands.js';
export * from './routes.js';
import { getPlanEventsRange, SchedulePolicyError } from '../fetch/index.js';
import { resolveDateParam, resolveRangeParam, VALID_COMPLETIONS, type PlanWriteOp } from '../policy/index.js';
import { receiptResult, type PlanOpCtx, type PlanOpResult } from './context.js';
import { buildReceipt } from './receipt.js';
import { runEnsure, runEnsureBatch } from './ensure.js';
import { runPreview, runUpsert } from './upsert.js';
import { runUpdate, runDeactivate } from './single.js';
import { runSync } from './sync.js';
import { runCheck } from './check.js';

export type { PlanOpCtx, PlanOpResult } from './context.js';
export { buildPlanOverview } from './overview.js';
export type { PlanOverviewPayload, PlanDayRow, PlanHourRow } from './overview.js';
// #786 · 「查日程」那一张页的口径（空档推算住本域：`plan` 侧与 `query` 侧都要用——f10 查日程页与
// f12 商量计划预览的空档提示是同一件事）经能力门出门，`query` 侧只走这个门、不深引用内部件。
export { eventsInWindow, renderPlanDayPage } from './planDocs.js';
export type { PlanDayPageOptions, PlanDaySearch } from './planDocs.js';

/** #14 复盘：本地读，不碰远端（四粒度：day／week／month／range）。 */
function runReview(ctx: PlanOpCtx): PlanOpResult {
  const { start, end } = ctx.params.granularity === 'range' || ctx.params.start !== undefined
    ? resolveRangeParam(ctx.params)
    : { start: resolveDateParam(ctx.params), end: resolveDateParam(ctx.params) };
  const events = getPlanEventsRange(ctx.handle, start, end);
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.completion || '未复盘'] = (counts[e.completion || '未复盘'] || 0) + 1;
  const parts = VALID_COMPLETIONS.filter((k) => counts[k]).map((k) => k + counts[k]);
  const message = events.length
    ? '已复盘 ' + start + '~' + end + '：' + events.length + ' 个事件（' + parts.join('、') + '）'
    : '复盘空：' + start + '~' + end + ' 没有日程事件（不是故障，是这天没排）';
  return receiptResult(buildReceipt({
    op: 'review', message, local: 'reviewed', remote: 'none', remoteId: null,
    errors: [], date: start, dates: [start, end], counts: { events: events.length },
  }));
}

/** `schedule.plan.write` 的唯一入口：把 op 分给各件，回执与退出码由各件给。 */
export function runPlanOp(op: PlanWriteOp, ctx: PlanOpCtx): PlanOpResult {
  switch (op) {
    case 'preview': return runPreview(ctx);
    case 'upsert': return runUpsert(ctx);
    // #599：同 op 内分流——带 `dates[]` 走多天批量（逐天复用 runEnsure），否则单天；`sync` 口径不动。
    case 'ensure': return ctx.params.dates !== undefined ? runEnsureBatch(ctx) : runEnsure(ctx);
    case 'update': return runUpdate(ctx);
    case 'deactivate': return runDeactivate(ctx);
    case 'review': return runReview(ctx);
    case 'sync': return runSync(ctx);
    case 'check': return runCheck(ctx);
    default: {
      // 穷尽性：op 类型加了新值却忘了在这里分发，编译期与运行期各拦一道。
      const never: never = op;
      throw new SchedulePolicyError('POLICY_BAD_INPUT', '未知 plan op：' + String(never));
    }
  }
}
