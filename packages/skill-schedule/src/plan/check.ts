// 日程与计划·飞书自检（op=check，D-03 的日历半场）。
//
// 老实现的自检是「每跑一次就在用户飞书里永久留一个已完成任务」——价值（真验写权限，只看授权证明不了
// 能写）要留，代价要可见。本 op 的三处改造照裁定件 D-03：
//   ① **默认不跑**：只有显式 `op=check` 才动远端（普通写路径一次调用都不发）；
//   ② **回执点名**：留下什么、在哪、怎么清，逐格写在回执里（`left`／`leftId`／`cleanup`）；
//   ③ **能删的必须删干净**：日程域删不掉即报错 ＋ 退出码非 0（不拿一句备注糊过去）。
// 备注：任务域（`task +complete` 终态、lark-cli 无删除子命令）那半场归备忘侧 #661。
import { larkCreateEvent, larkDeleteEvent, FEISHU_SENTINEL_MARK, FEISHU_OWNER_MARK } from '../fetch/feishu.js';
import { dayStartISO } from './iso.js';
import { receiptResult, type PlanOpCtx, type PlanOpResult } from './context.js';
import { buildReceipt } from './receipt.js';

export function runCheck(ctx: PlanOpCtx): PlanOpResult {
  const now = new Date();
  const date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const stamp = date + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const dryRun = ctx.params.dryRun === true;

  if (!ctx.cli) {
    const why = ctx.remoteWhy ?? '远端不可用';
    return receiptResult(buildReceipt({
      op: 'check', message: '自检未跑：' + why, local: 'checked', remote: 'unavailable',
      remoteId: null, errors: [why],
      extra: { left: null, leftId: null, cleanup: null, dryRun },
    }));
  }
  if (dryRun) {
    return receiptResult(buildReceipt({
      op: 'check', message: '自检（dryRun）：远端四门已过，未写任何对象', local: 'checked',
      remote: 'none', remoteId: null,
      extra: { left: null, leftId: null, cleanup: null, dryRun: true },
    }));
  }

  // 真打一次写：建 → 删。描述带归属锚，标题带可识别前缀（用户能自己认出来并手工清）。
  const startISO = dayStartISO(date);
  let sentinelId: string;
  try {
    const made = larkCreateEvent(
      ctx.cli, startISO, startISO.replace('T00:00:00', 'T00:30:00'),
      FEISHU_SENTINEL_MARK + ' 日程写权限自检 ' + stamp,
      FEISHU_OWNER_MARK + ' · 自检留下，跑完即删',
    );
    sentinelId = made.eventId;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return receiptResult(buildReceipt({
      op: 'check', message: '自检失败：远端建对象没成（' + m + '）', local: 'checked',
      remote: 'unavailable', remoteId: null, errors: [m],
      extra: { left: null, leftId: null, cleanup: null, dryRun: false },
    }));
  }

  try {
    larkDeleteEvent(ctx.cli, sentinelId);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    const cleanup = 'lark-cli calendar events delete --calendar-id primary --event-id ' + sentinelId;
    return receiptResult(buildReceipt({
      op: 'check',
      message: '自检写下了一条测试日程但**没删掉**：' + sentinelId + '（飞书日历 ' + date + ' 00:00~00:30，标题带「'
        + FEISHU_SENTINEL_MARK + '」）。清法：' + cleanup,
      local: 'checked', remote: 'unavailable', remoteId: sentinelId,
      errors: ['自检清理失败：' + m],
      extra: { left: '飞书日历上一条 30 分钟测试日程', leftId: sentinelId, cleanup, dryRun: false },
    }));
  }

  return receiptResult(buildReceipt({
    op: 'check',
    message: '自检通过：远端写权限真验过（建了一条测试日程并已删干净，' + sentinelId + '）',
    local: 'checked', remote: 'deleted_feishu', remoteId: sentinelId,
    counts: { created: 1, deleted: 1 },
    extra: { left: null, leftId: null, cleanup: null, dryRun: false },
  }));
}
