/** 一键全部更新的串行队列与并发门禁（纯函数：无 DOM、无 react；面板钩子与单测共用同一份）。
 *
 * 拍板出处（#925 决议，用户已逐条确认，不可改语义）：
 * 1. 一键排队串行：按目标顺序逐家查→装→轮询到收尾，一家收尾才起下一家；失败一家记 failed
 *    继续下一家；单家重试走行按钮 recheck/retry；删并行发起与交叉轮询。
 * 2. 安装中题头点不得：任一行 installing 时题头检查更新禁用；人话沿用 reasonText('update-busy') 原句。
 * 3. 行按钮全局互斥：installing 行自锁，其余行禁用不进队列；act 入口有忙拒 update-busy 且不改 rows。
 * 4. 进度各行自显：每行各自显示，他行保持 phase；题头不汇总排队数；待重启跳过安装继续下一家。
 *
 * 本文件只管「排队形状与忙判据」：传输动作由调用方注入（查／装／轮询的真实现住 `update-client.ts`，
 * 面板钩子转交，单测给假件），故改坏串行形状必被门禁逮到。
 */
import { reasonText } from './update-contract.js';
import { isAbsent, restartPendingOf, verdictOf } from './update-view.js';
import type { CheckOutcome, TargetInfo } from './update-view.js';
import type { CallFailure, CallOutcome } from './update-client.js';

/** 行相位（与 `update-panel.ts` 的 `UpdateRowState['phase']` 同形；结构上兼容，不另起第二套名字）。 */
export type QueuePhase = 'idle' | 'checking' | 'ready' | 'installing' | 'failed';

/** 队列读写的一行（结构型：面板那行原样传进来即可，不必 import 面板）。 */
export interface QueueRowState {
  readonly phase: QueuePhase;
  readonly outcome: CheckOutcome | null;
  readonly failure: CallFailure | null;
}

/** 任一行 installing 即忙：题头检查更新禁用、行按钮全局互斥、checkAll/act 入口直接返回的同一判据。 */
export function hasInstallingRow(rows: Readonly<Record<string, { readonly phase: string }>>): boolean {
  for (const key of Object.keys(rows)) {
    if (rows[key]?.phase === 'installing') return true;
  }
  return false;
}

/** 忙时拒绝的那枚失败：码与人话都取 `update-busy` 原句（#678/#740 冻结文案，本文件不写第二套话）。 */
export function updateBusyFailure(targetKey: string): CallFailure {
  return { ok: false, code: 'update-busy', message: reasonText('update-busy'), details: { target: targetKey }, manual: null };
}

/** 串行一轮的传输注入（面板传真实现，单测传假件；每一步的顺序断言即并发门禁）。 */
export interface SerialDeps {
  /** 查一家最新版（面板：`checkTarget(getCall(), target)`）。 */
  readonly check: (target: TargetInfo) => Promise<CallOutcome<CheckOutcome>>;
  /** 装完后重读真实状态（面板：`checkTarget(getCall(), target, target.phones?.status)`）。 */
  readonly checkStatus: (target: TargetInfo) => Promise<CallOutcome<CheckOutcome>>;
  /** 装上缺席包（面板：`installAbsent(getCall(), target, version)`）。 */
  readonly installAbsent: (target: TargetInfo, version: string) => Promise<CallOutcome<{ readonly packageName: string; readonly version: string }>>;
  /** 装上已装包：查→装→轮询到收尾（面板：`updateInstalled(getCall(), target, pollMs)`，形状冻结）。 */
  readonly installPresent: (target: TargetInfo) => Promise<CallOutcome<CheckOutcome>>;
  /** 只改这一行的补丁（他行保持各自 phase：各行自显的全部依据）。 */
  readonly patch: (key: string, next: QueueRowState) => void;
  /** 读这一行当前态（串行起步的那次 checking 要带着旧 outcome）。 */
  readonly getRow: (key: string) => QueueRowState | undefined;
}

/** 按目标顺序逐家查→装→收尾：一家收尾才起下一家；失败记 failed 继续；待重启跳过安装。
 *
 * 跳过安装只有一种：快照事实已是待重启（`restartPendingOf`）——由横幅点名，不在这里装第二遍。
 * 不可装（已是最新／拦下且无安装动作）记 ready 收尾；缺席且无最新版本号记 ready 收尾（等下一次检查）。
 * 本函数不汇总排队数、不碰他行（`patch` 只收本家 key）。
 */
export async function runSerialUpdateAll(targets: readonly TargetInfo[], deps: SerialDeps): Promise<void> {
  for (const target of targets) {
    const current = deps.getRow(target.key);
    deps.patch(target.key, { phase: 'checking', outcome: current?.outcome ?? null, failure: null });
    const checked = await deps.check(target);
    if (!checked.ok) {
      deps.patch(target.key, { phase: 'failed', outcome: null, failure: checked });
      continue;
    }
    if (restartPendingOf(checked.value.snapshot)) {
      deps.patch(target.key, { phase: 'ready', outcome: checked.value, failure: null });
      continue;
    }
    const verdict = verdictOf(target, checked.value.snapshot);
    const needInstall = verdict.action === 'update' || verdict.action === 'install' || verdict.action === 'retry';
    if (!needInstall) {
      deps.patch(target.key, { phase: 'ready', outcome: checked.value, failure: null });
      continue;
    }
    deps.patch(target.key, { phase: 'installing', outcome: checked.value, failure: null });
    if (isAbsent(target)) {
      const version = checked.value.snapshot.latestVersion;
      if (!version) {
        deps.patch(target.key, { phase: 'ready', outcome: checked.value, failure: null });
        continue;
      }
      const done = await deps.installAbsent(target, version);
      if (done.ok) {
        const refreshed = await deps.checkStatus(target);
        deps.patch(
          target.key,
          refreshed.ok
            ? { phase: 'ready', outcome: refreshed.value, failure: null }
            : { phase: 'failed', outcome: null, failure: refreshed },
        );
      } else {
        deps.patch(target.key, {
          phase: 'failed',
          outcome: checked.value,
          failure: { ...done, manual: done.manual ?? checked.value.manual ?? null },
        });
      }
      continue;
    }
    const done = await deps.installPresent(target);
    if (done.ok) {
      const refreshed = await deps.checkStatus(target);
      deps.patch(
        target.key,
        refreshed.ok
          ? { phase: 'ready', outcome: refreshed.value, failure: null }
          : { phase: 'failed', outcome: null, failure: refreshed },
      );
    } else {
      deps.patch(target.key, {
        phase: 'failed',
        outcome: checked.value,
        failure: { ...done, manual: done.manual ?? checked.value.manual ?? null },
      });
    }
  }
}
