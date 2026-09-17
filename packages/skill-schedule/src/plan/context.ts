// 日程与计划·命令上下文与结果（能力内部件）：出口把「谁在写、能不能碰远端」交给各 op，op 回一份回执 ＋ 退出码。
import type { ScheduleDb } from '../fetch/db.js';
import type { PlanReceipt } from './receipt.js';

export interface PlanOpCtx {
  handle: ScheduleDb;
  params: Record<string, unknown>;
  /** 远端四门过了才给出 lark-cli 路径；`null` ＝ 这一趟不碰远端（参数只要本地，或远端不在场）。 */
  cli: string | null;
  /** 远端为什么不在场（说人话，写进回执；在场时 null）。 */
  remoteWhy: string | null;
}

export interface PlanOpResult {
  /** 出口 envelope 的 data（receipt 形状：ok／message ＋ 分字段三格）。 */
  data: Record<string, unknown>;
  /** 0＝这一趟达成；非 0 交出口（没达成 → 4，照裁定 A6②）。 */
  exitCode: number;
}

export function receiptResult(r: PlanReceipt): PlanOpResult {
  return { data: { ...r }, exitCode: r.achieved ? 0 : 4 };
}
