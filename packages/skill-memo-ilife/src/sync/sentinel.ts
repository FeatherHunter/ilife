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

/** 自检对象前缀（老逐字 `SENTINEL_PREFIX`，`feishu_sync.py:62`）。 */
export const SENTINEL_PREFIX = '[备忘录测试]';

/** 自检新建的描述（一句话说明来历与去向；故意不带「原备忘 #N」归属正则，免得被对账认领）。 */
const SENTINEL_DESC = SENTINEL_PREFIX + ' 备忘录写权限自检（memo.auth step:diag）：建后依次改／完成／删，跑完即删；残留可手工删除';

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
      ok: false, message: '自检未跑：' + why, local: 'checked', remote: 'unavailable', remoteId: null,
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
        ok: true, message: '自检（dryRun）：远端四门已过，未写任何对象',
        local: 'checked', remote: 'not-applicable', remoteId: null,
        left: null, leftId: null, cleanup: null, dryRun: true, steps: [], errors: [],
      },
      exit: 0,
    };
  }

  const errors: string[] = [];
  const steps: SentinelStep[] = [];
  const summary = SENTINEL_PREFIX + ' 任务权限验证 ' + stampOf(new Date());

  // 建（老同形：建失败短路，后续无对象可测）。
  let guid: string;
  try {
    guid = createTask(cli, { summary, description: SENTINEL_DESC, assignee: openId });
    steps.push({ name: 'task_create', ok: true });
  } catch (e) {
    const m = '远端建测试任务没成（' + textOf(e) + '）';
    steps.push({ name: 'task_create', ok: false, error: m });
    return {
      receipt: {
        ok: false, message: '自检失败：' + m, local: 'checked', remote: 'failed', remoteId: null,
        left: null, leftId: null, cleanup: null, dryRun: false, steps, errors: [m],
      },
      exit: 4,
    };
  }

  // 改（老逐字后缀 `(已更新)`；失败仍往完成态收，不短路）。
  try {
    updateTask(cli, guid, { summary: summary + '(已更新)' });
    steps.push({ name: 'task_update', ok: true });
  } catch (e) {
    const m = '测试任务改题没成（' + textOf(e) + '）';
    errors.push(m);
    steps.push({ name: 'task_update', ok: false, error: m });
  }

  // 完成（老终态；失败也继续删尝试，能清干净就不是残留）。
  try {
    completeTask(cli, guid);
    steps.push({ name: 'task_complete', ok: true, note: '测试任务已标完成（终态，不留待办）' });
  } catch (e) {
    const m = '测试任务标完成没成（' + textOf(e) + '）';
    errors.push(m);
    steps.push({ name: 'task_complete', ok: false, error: m });
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
      steps.push({ name: 'task_delete', ok: true, note: '删时报错但对象已不在（幂等达成）' });
    } else {
      const m = '测试任务没删掉（' + textOf(e) + '）';
      errors.push(m);
      steps.push({ name: 'task_delete', ok: false, error: m });
    }
  }

  if (deleted && errors.length === 0) {
    return {
      receipt: {
        ok: true, message: '自检通过：远端写权限真验过（建／改／完成／删各一次，测试任务 ' + guid + ' 已删干净）',
        local: 'checked', remote: 'synced', remoteId: guid,
        left: null, leftId: null, cleanup: null, dryRun: false, steps, errors,
      },
      exit: 0,
    };
  }
  if (deleted) {
    const m = '自检没全成：' + errors.join('；');
    return {
      receipt: {
        ok: false, message: m + '（测试对象已删干净，无残留）', local: 'checked', remote: 'failed',
        remoteId: guid, left: null, leftId: null, cleanup: null, dryRun: false, steps, errors,
      },
      exit: 4,
    };
  }
  const cleanup = 'lark-cli task tasks delete --task-guid ' + guid + ' --yes（或到飞书手工删除标题含「' + SENTINEL_PREFIX + '」的任务）';
  return {
    receipt: {
      ok: false,
      message: '自检写权限已验过，但测试任务没删掉：' + guid + '（飞书任务「' + summary + '」，已标完成）。清法：' + cleanup,
      local: 'checked', remote: 'failed', remoteId: guid,
      left: '飞书上一条测试任务（已标完成）', leftId: guid, cleanup, dryRun: false, steps, errors,
    },
    exit: 4,
  };
}
