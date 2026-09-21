/** 日程与计划的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 * 逐字搬自 `src/cli/cmd_read.ts` 的 switch 一臂 ＋ 远端门（行为零改动）。
 * 写 op 全部统一成合成写（裁定 A6③）：本地 ＋（可选）远端一条命令走完，回执分字段、退出码报达成与否。
 *
 * **#787 起这一臂多出「出页」那一半**（照 #783 写域的先例）：写库之后各支出一张真页
 * （`./receiptDocs.ts` 与 `./discussDocs.ts` 装配，件序列见那两件头）。回执载荷（`data`）与退出码口径
 * 一行不改，追加的分字段只多不少。
 *
 * 页要的东西分两处拿：**写之前**的样貌（改前那一条、落盘前这一天的排布）在这一臂里先留一份
 * （写完之后库里已经不是那个样子了）；**写之后**的读数从回执载荷与库里现读。
 */
import { getPlanEvent, larkReady, listPlanEvents } from '../fetch/index.js';
import {
  parseFeishuMode, parsePlanOp, resolveDateParam, validateUpdateInput, validateUpsertInput,
  type PlanEventInput, type PlanWriteOp,
} from '../policy/index.js';
import { runPlanOp } from './index.js';
import type { PlanEvent, ScheduleDb } from '../fetch/db.js';
import type { WriteHandler } from '../shared/commandSpec.js';
import type { RemoteState } from './receipt.js';
import {
  deactivateReceiptPage, ensureBatchReceiptPage, ensureReceiptPage, updateReceiptPage, type EnsureBatchDay,
} from './receiptDocs.js';
import { previewPage, resultPage } from './discussDocs.js';
import { replayPage } from './replaySections.js';
import { replayWindowOf } from './replayDocs.js';
import { reviewPage } from './reviewDocs.js';
import { probePage, syncPage } from './feishuDocs.js';
import type { TierReport } from './probe.js';

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

/** 写之前先留一份的样貌（写完之后库里已经不是那个样子）。取不到就留空——页少一块，命令照跑。 */
interface PreState {
  /** 商量计划那两支的候选（`validateUpsertInput` 归一过日期的那个版本）。 */
  readonly candidates: { readonly date: string; readonly events: readonly PlanEventInput[] } | null;
  /** 落盘前这一天已有的排布（结果页的冲突基线；预览页的锁定事件区）。 */
  readonly locked: readonly PlanEvent[];
  readonly beforeEvent: PlanEvent | null;
  readonly patchKeys: readonly string[];
}

function preStateOf(op: PlanWriteOp, params: Record<string, unknown>, handle: ScheduleDb): PreState {
  const none: PreState = { candidates: null, locked: [], beforeEvent: null, patchKeys: [] };
  try {
    if (op === 'preview' || op === 'upsert') {
      const v = validateUpsertInput(params);
      return { ...none, candidates: v, locked: listPlanEvents(handle, v.date) };
    }
    if (op === 'update') {
      const v = validateUpdateInput(params);
      return { ...none, beforeEvent: getPlanEvent(handle, v.id), patchKeys: Object.keys(v.patch) };
    }
    if (op === 'deactivate') {
      return { ...none, beforeEvent: getPlanEvent(handle, Number(params.id)) };
    }
  } catch {
    // 参数不对时由各 op 自己的校验报那一句原话（本件只少出一块，不抢着报错）。
    return none;
  }
  return none;
}

const remoteOf = (data: Record<string, unknown>): RemoteState => (data.remote ?? 'none') as RemoteState;

/** 各 op 写完之后那张页（不落页的两支——复盘与飞书那两条——回空串，照旧走模板页）。
 *
 *  #788 起「复盘」与「飞书」两条各接上自己的整页：复盘按粒度分两族（裸词那一档是单日逐条标记，
 *  四档是跨域对照与趋势那一张一体页），飞书按 `probe` 那一格分探测（只读）与同步回执两张。 */
function pageOf(op: PlanWriteOp, handle: ScheduleDb, data: Record<string, unknown>, pre: PreState, params: Record<string, unknown>): string {
  if (op === 'preview' && pre.candidates !== null) {
    return previewPage(handle, pre.candidates.date, pre.candidates.events);
  }
  if (op === 'upsert' && pre.candidates !== null) {
    return resultPage(handle, pre.candidates.date, pre.candidates.events, pre.locked, remoteOf(data));
  }
  if (op === 'ensure') {
    if (Array.isArray(data.items)) {
      const days: EnsureBatchDay[] = (data.items as Record<string, unknown>[]).map((d) => ({
        date: String(d.date),
        id: Number(d.id),
        created: d.local === 'created',
        remote: remoteOf(d),
        achieved: d.achieved !== false,
      }));
      return ensureBatchReceiptPage(handle, days);
    }
    return ensureReceiptPage(handle, {
      id: Number(data.id),
      date: String(data.date),
      created: data.local === 'created',
      remote: remoteOf(data),
    });
  }
  if (op === 'update' && pre.beforeEvent !== null) {
    return updateReceiptPage(handle, pre.beforeEvent, getPlanEvent(handle, pre.beforeEvent.id), pre.patchKeys, remoteOf(data));
  }
  if (op === 'deactivate' && pre.beforeEvent !== null) {
    return deactivateReceiptPage(handle, pre.beforeEvent, remoteOf(data));
  }
  if (op === 'review') {
    // 裸词「复盘」＝单日逐条标记那一张；四档（今日／本周／本月／区间）＝一体页。
    const granularity = params.granularity;
    if (typeof granularity === 'string') return replayPage(handle, replayWindowOf(granularity, params));
    return reviewPage(handle, resolveDateParam(params));
  }
  if (op === 'sync') {
    const date = resolveDateParam(params);
    if (data.probe === true) {
      return probePage(handle, date, {
        tier: (data.tier ?? 'missing') as TierReport['tier'],
        cliPath: typeof data.cliPath === 'string' ? data.cliPath : null,
        version: typeof data.cliVersion === 'string' ? data.cliVersion : null,
        openId: null,
        calendar: data.calendarReady === true,
        why: String(data.tierWhy ?? ''),
      });
    }
    return syncPage(handle, date, {
      message: String(data.message ?? ''),
      remote: remoteOf(data),
      counts: (data.counts ?? {}) as Record<string, number>,
      notes: Array.isArray(data.notes) ? (data.notes as string[]) : [],
      errors: Array.isArray(data.errors) ? (data.errors as string[]) : [],
    });
  }
  return '';
}

export const writePlan: WriteHandler = (params, handle: ScheduleDb) => {
  const op = parsePlanOp(params);
  const gate = remoteGate(op, params);
  const pre = preStateOf(op, params, handle);
  const out = runPlanOp(op, { handle, params, cli: gate.cli, remoteWhy: gate.why });
  return { data: out.data, html: pageOf(op, handle, out.data, pre, params), exitCode: out.exitCode };
};
