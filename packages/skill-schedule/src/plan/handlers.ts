/** 日程与计划的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 * 逐字搬自 `src/cli/cmd_read.ts` 的 switch 一臂 ＋ 远端门（行为零改动）。
 * 写 op 全部统一成合成写（裁定 A6③）：本地 ＋（可选）远端一条命令走完，回执分字段、退出码报达成与否。
 */
import { larkReady } from '../fetch/index.js';
import { parseFeishuMode, parsePlanOp, type PlanWriteOp } from '../policy/index.js';
import { runPlanOp } from './index.js';
import type { ScheduleDb } from '../fetch/db.js';
import type { WriteHandler } from '../shared/commandSpec.js';

/** 哪些 op 要碰远端（其余 op 连 lark-cli 都不探——探测本身是三次子进程）。 */
const REMOTE_OPS: PlanWriteOp[] = ['ensure', 'upsert', 'update', 'deactivate', 'sync', 'check'];

/** 远端门：过了给 cliPath；没过给「为什么不在场」——**不拦本地写**，只如实进回执与退出码。 */
function remoteGate(op: PlanWriteOp, params: Record<string, unknown>): { cli: string | null; why: string | null } {
  if (!REMOTE_OPS.includes(op)) return { cli: null, why: null };
  // sync／check 本身就是远端命令：`feishu:'skip'` 对它们不成立，照探（探不到即阻断／降级）。
  if (op !== 'sync' && op !== 'check' && parseFeishuMode(params) === 'skip') return { cli: null, why: null };
  try { return { cli: larkReady().cliPath, why: null }; }
  catch (e) { return { cli: null, why: (e as Error).message }; }
}

export const writePlan: WriteHandler = (params, handle: ScheduleDb) => {
  const op = parsePlanOp(params);
  const gate = remoteGate(op, params);
  const out = runPlanOp(op, { handle, params, cli: gate.cli, remoteWhy: gate.why });
  return { data: out.data, html: '', exitCode: out.exitCode };
};
