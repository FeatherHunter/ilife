// 取数层·飞书任务域自检 sentinel（#666，D-03 任务半场）：真打一次写操作验写权限。
// 老家对照 `备忘录/script/feishu_sync.py:831-921`（`_sentinel_task`：create→update→complete，
// 无删除、完成即终态；`_sentinel_calendar` 日程域归作息侧 `op=check`，D-20，本侧不重复建）。
// D-03 三处改造：① 默认不跑（只经 `memo.auth step:'diag'` 显式调）；② 回执点名「留下了什么／
// 在哪／怎么清」（`left`／`leftId`／`cleanup`）；③ 任务域用 #661 补上的真删先尝试删除，删不掉
// 落回完成态残留＋如实说明＋退出码非 0（D-31）；新建自带一句话描述便于反查（D-32，不带归属正则，
// 对账仍判非自管跳过，见 `src/wish/reconcile.ts` 的 `skippedNoMark`）。
import { larkReady, larkSetupInfo } from './feishu.js';
import { listRelatedTasks, completeTask, createTask, deleteTask, updateTask } from '../wish/index.js';
import type { WishReceipt } from '../wish/index.js';
import { m } from '../entries/index.js';

/** 自检对象前缀（老逐字 `SENTINEL_PREFIX`，`feishu_sync.py:62`）。 */
export const SENTINEL_PREFIX = '[备忘录测试]';

/** 自检新建的描述（一句话说明来历与去向；故意不带「原备忘 #N」归属正则，免得被对账认领）。 */
function sentinelDesc(): string {
  return m('skill-memo-ilife.sync-sentinel.c018', { p0: String(SENTINEL_PREFIX) });
}

export interface SentinelStep {
  readonly name: string;
  readonly ok: boolean;
  readonly error?: string;
  readonly note?: string;
}

export interface SentinelReceipt extends WishReceipt {
  /** 留下了什么（删干净即 null）。 */
  readonly left: string | null;
  /** 留下对象的远端标识（删干净即 null）。 */
  readonly leftId: string | null;
  /** 怎么清（删干净即 null）。 */
  readonly cleanup: string | null;
  readonly dryRun: boolean;
  readonly steps: readonly SentinelStep[];
  readonly errors: readonly string[];
}

function textOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function stampOf(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return p(now.getHours()) + p(now.getMinutes()) + p(now.getSeconds());
}

function closedReceipt(why: string): { receipt: SentinelReceipt; exit: number } {
  return {
    receipt: {
      ok: false, message: m('skill-memo-ilife.sync-sentinel.c001', { p0: String(why) }), local: 'checked', remote: 'unavailable', remoteId: null,
      larkSetup: larkSetupInfo(),
      left: null, leftId: null, cleanup: null, dryRun: false, steps: [], errors: [why],
    },
    exit: 4,
  };
}

/** 跑一次任务域自检。只写远端测试对象，本地库零写；默认不跑，由调用方显式触发。 */
export function runSentinel(opts?: { dryRun?: boolean }): { receipt: SentinelReceipt; exit: number } {
  const dry = opts?.dryRun === true;
  let cli: string;
  let openId: string;
  try {
    const k = larkReady('task');
    cli = k.cliPath;
    openId = k.openId;
  } catch (e) {
    return closedReceipt(textOf(e));
  }
  if (dry) {
    return {
      receipt: {
        ok: true, message: m('skill-memo-ilife.sync-sentinel.c002'),
        local: 'checked', remote: 'not-applicable', remoteId: null,
        left: null, leftId: null, cleanup: null, dryRun: true, steps: [], errors: [],
      },
      exit: 0,
    };
  }

  const errors: string[] = [];
  const steps: SentinelStep[] = [];
  const summary = m('skill-memo-ilife.sync-sentinel.c003', { p0: String(SENTINEL_PREFIX), p1: String(stampOf(new Date())) });

  // 建（老同形：建失败短路，后续无对象可测）。
  let guid: string;
  try {
    guid = createTask(cli, { summary, description: sentinelDesc(), assignee: openId });
    steps.push({ name: 'task_create', ok: true });
  } catch (e) {
    const errMsg = m('skill-memo-ilife.sync-sentinel.c004', { p0: String(textOf(e)) });
    steps.push({ name: 'task_create', ok: false, error: errMsg });
    return {
      receipt: {
        ok: false, message: m('skill-memo-ilife.sync-sentinel.c005', { p0: String(errMsg) }), local: 'checked', remote: 'failed', remoteId: null,
        left: null, leftId: null, cleanup: null, dryRun: false, steps, errors: [errMsg],
      },
      exit: 4,
    };
  }

  // 改（老逐字后缀 `(已更新)`；失败仍往完成态收，不短路）。
  try {
    updateTask(cli, guid, { summary: m('skill-memo-ilife.sync-sentinel.c006', { p0: String(summary) }) });
    steps.push({ name: 'task_update', ok: true });
  } catch (e) {
    const errMsg = m('skill-memo-ilife.sync-sentinel.c007', { p0: String(textOf(e)) });
    errors.push(errMsg);
    steps.push({ name: 'task_update', ok: false, error: errMsg });
  }

  // 完成（老终态；失败也继续删尝试，能清干净就不是残留）。
  try {
    completeTask(cli, guid);
    steps.push({ name: 'task_complete', ok: true, note: m('skill-memo-ilife.sync-sentinel.c008') });
  } catch (e) {
    const errMsg = m('skill-memo-ilife.sync-sentinel.c009', { p0: String(textOf(e)) });
    errors.push(errMsg);
    steps.push({ name: 'task_complete', ok: false, error: errMsg });
  }

  // 删（D-31：#661 补的真删先尝试；删不掉落回完成态残留＋点名）。
  let deleted = false;
  try {
    deleteTask(cli, guid);
    deleted = true;
    steps.push({ name: 'task_delete', ok: true });
  } catch (e) {
    let still = true;
    try {
      still = listRelatedTasks(cli).some((t) => t.guid === guid);
    } catch {
      still = true;
    }
    if (!still) {
      deleted = true;
      steps.push({ name: 'task_delete', ok: true, note: m('skill-memo-ilife.sync-sentinel.c010') });
    } else {
      const errMsg = m('skill-memo-ilife.sync-sentinel.c011', { p0: String(textOf(e)) });
      errors.push(errMsg);
      steps.push({ name: 'task_delete', ok: false, error: errMsg });
    }
  }

  if (deleted && errors.length === 0) {
    return {
      receipt: {
        ok: true, message: m('skill-memo-ilife.sync-sentinel.c012', { p0: String(guid) }),
        local: 'checked', remote: 'synced', remoteId: guid,
        left: null, leftId: null, cleanup: null, dryRun: false, steps, errors,
      },
      exit: 0,
    };
  }
  if (deleted) {
    const errMsg = m('skill-memo-ilife.sync-sentinel.c013', { p0: String(errors.join('；')) });
    return {
      receipt: {
        ok: false, message: m('skill-memo-ilife.sync-sentinel.c014', { p0: String(errMsg) }), local: 'checked', remote: 'failed',
        remoteId: guid, left: null, leftId: null, cleanup: null, dryRun: false, steps, errors,
      },
      exit: 4,
    };
  }
  const cleanup = m('skill-memo-ilife.sync-sentinel.c015', { p0: String(guid), p1: String(SENTINEL_PREFIX) });
  return {
    receipt: {
      ok: false,
      message: m('skill-memo-ilife.sync-sentinel.c016', { p0: String(guid), p1: String(summary), p2: String(cleanup) }),
      local: 'checked', remote: 'failed', remoteId: guid,
      left: m('skill-memo-ilife.sync-sentinel.c017'), leftId: guid, cleanup, dryRun: false, steps, errors,
    },
    exit: 4,
  };
}
