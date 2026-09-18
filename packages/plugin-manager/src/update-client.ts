/** 面板到宿主的三条流程（纯异步函数：无 DOM、无 react；传输口由调用方注入，便于单测）。
 *
 * 三条流程与更新包 README 的对应关系：
 * - 检查更新：`updateCheck`（第 3 节第 3 步的 `host.call(UPD_CHECK, {})`）；
 * - 装上更新：`updateCheck` 拿凭证 → `updateInstall` 提交 → **按间隔轮询 `updateStatus`**
 *   直到任务离开 `installing`/`verifying`（第 3 节第 3 步与第 9 节：安装是后台跑，
 *   调用方不干等；凭证过期 `check-expired` 是正常错误码，重查一次再提交，见第 11 节）；
 * - 装上缺席的包：走总管自有的 `ilife-manager.install`（更新包的三个电话只管已装的包）。
 */
import { MANAGER_ACTIONS, MANAGER_RPC, reasonText } from './update-contract.js';
import type { CheckOutcome, TargetInfo } from './update-view.js';

/** 传输口（DSH 载体 `connection.rpc.call` 的形状，cookbook §6）。 */
export type CallFace = (
  channel: string,
  endpoint: string,
  payload: unknown,
  signal?: AbortSignal,
) => Promise<
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string; readonly details: Record<string, unknown> } }
>;

export interface CallFailure {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;
  /** 能给的话给一条可复制的手工命令（更新包每次回包都带，见其 README 第 9 节）。 */
  readonly manual: string | null;
}

export type CallOutcome<T> = { readonly ok: true; readonly value: T } | CallFailure;

/** 轮询上限：1 秒一次、最多 900 次（覆盖更新包 15 分钟的安装时限）。 */
const MAX_POLL_TRIES = 900;
/** 轮询默认间隔（只有在宿主没给 `pollMs` 时才用；正常取值由宿主转交更新包的 panelPollMs）。 */
const FALLBACK_POLL_MS = 1000;
let requestSeq = 0;

function failure(code: string, details: Record<string, unknown> = {}, manual: string | null = null): CallFailure {
  return { ok: false, code, message: reasonText(code), details, manual };
}

/** 取数间隔：settle 即清 timer。定时器有界重试的例外依据（p10 静态门三件套）：
 * 这里有清理（clearTimeout）、有次数上限（MAX_POLL_TRIES）、间隔取自宿主转交的更新包
 * `panelPollMs`（不写死）；用途是更新包 README 第 3 节要求的状态轮询（安装是后台跑，
 * 面板每秒问一次进度），不是无界重试。 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      resolve();
    }, ms);
  });
}

async function callManager<T>(call: CallFace | null, method: string, payload: Record<string, unknown>): Promise<CallOutcome<T>> {
  if (typeof call !== 'function') return failure('internal', { detail: '宿主连接缺席：connection.rpc.call 不可用' });
  let result: Awaited<ReturnType<CallFace>>;
  try {
    result = await call(MANAGER_RPC.channel, MANAGER_RPC.endpoint, { method, payload });
  } catch (error) {
    return failure('check-failed', { detail: String((error as Error)?.message ?? error) });
  }
  if (!result || typeof result !== 'object' || typeof (result as { ok?: unknown }).ok !== 'boolean') {
    return failure('internal', { detail: '回执信封异常（非 ok 信封）' });
  }
  if (result.ok) return { ok: true, value: result.value as T };
  const error = (result as { error?: { code?: unknown; details?: unknown } }).error;
  const code = typeof error?.code === 'string' ? error.code : 'internal';
  const details = error && typeof error.details === 'object' && error.details !== null ? (error.details as Record<string, unknown>) : {};
  return failure(code, details);
}

/** 取七个更新目标的表（宿主转交更新包的三个电话名与版本行，面板不写死任何电话名）。 */
export async function loadTargets(call: CallFace | null): Promise<CallOutcome<{ targets: TargetInfo[]; pollMs: number }>> {
  const out = await callManager<{ targets?: TargetInfo[]; pollMs?: number }>(call, MANAGER_ACTIONS.targets, {});
  if (!out.ok) return out;
  const targets = Array.isArray(out.value?.targets) ? out.value.targets : [];
  const pollMs = typeof out.value?.pollMs === 'number' && out.value.pollMs > 0 ? out.value.pollMs : FALLBACK_POLL_MS;
  return { ok: true, value: { targets, pollMs } };
}

/** 查一家：默认查新版（`updateCheck`，顺带回最新版本与凭证）；给 `phoneName` 时查那个电话。 */
export async function checkTarget(
  call: CallFace | null,
  target: TargetInfo,
  phoneName?: string,
): Promise<CallOutcome<CheckOutcome>> {
  const name = phoneName ?? target.phones?.check;
  if (!target.phones || !name) return failure('bad-request', { target: target.key });
  return callManager<CheckOutcome>(call, name, {});
}

/** 装上缺席的包：版本取自查新版拿到的「最新版本」（宿主用更新包的执行器真装）。 */
export async function installAbsent(
  call: CallFace | null,
  target: TargetInfo,
  version: string,
): Promise<CallOutcome<{ packageName: string; version: string }>> {
  return callManager(call, MANAGER_ACTIONS.install, { packageName: target.packageName, version });
}

/** 装上更新：查新版 → 提交安装 → 有界轮询查状态到任务收尾；凭证过期重查一次再提交。 */
export async function updateInstalled(
  call: CallFace | null,
  target: TargetInfo,
  pollMs: number,
): Promise<CallOutcome<CheckOutcome>> {
  if (!target.phones) return failure('bad-request', { target: target.key });
  const first = await checkTarget(call, target);
  if (!first.ok) return first;
  let checked = first.value;
  if (!checked.receipt) {
    const code = checked.snapshot.blockedReason ?? 'check-failed';
    return failure(code, { target: target.key }, checked.manual);
  }
  requestSeq += 1;
  const requestId = 'ilife-manager-' + Date.now().toString(36) + '-' + String(requestSeq);
  let submitted = await callManager<CheckOutcome>(call, target.phones.install, {
    checkId: checked.receipt.checkId,
    requestId,
  });
  if (!submitted.ok && submitted.code === 'check-expired') {
    const again = await checkTarget(call, target);
    if (!again.ok) return again;
    checked = again.value;
    if (!checked.receipt) {
      return failure(checked.snapshot.blockedReason ?? 'check-failed', { target: target.key }, checked.manual);
    }
    submitted = await callManager<CheckOutcome>(call, target.phones.install, {
      checkId: checked.receipt.checkId,
      requestId: requestId + 'r',
    });
  }
  if (!submitted.ok) return { ...submitted, manual: submitted.manual ?? checked.manual };
  // 安装是后台跑（`service.ts:434-436`：落盘后后台跑，调用方不干等），故按间隔轮询到任务收尾。
  let latest = submitted.value;
  const interval = pollMs > 0 ? pollMs : FALLBACK_POLL_MS;
  for (let tries = 0; ; tries += 1) {
    const job = latest.snapshot.job;
    if (job === null || (job.state !== 'installing' && job.state !== 'verifying')) break;
    if (tries >= MAX_POLL_TRIES) break;
    await sleep(interval);
    const status = await checkTarget(call, target, target.phones.status);
    if (!status.ok) return status;
    latest = status.value;
  }
  return { ok: true, value: latest };
}
