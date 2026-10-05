/** 面板薄包装（票 1170，浏览器侧：无 node 内建，可进 client 束）。
 *
 * 只定死三组参数，不自建文案与样式：入口形态 button、打开策略 manual（点击交由 onOpen 打开批量弹窗）、
 * 皮肤 archive；批量面板内嵌形态（弹窗壳由本包自家 overlay 提供，关闭由自家按钮收）+ 皮肤 archive；
 * 轮询与更新日志沿上游缺省，中文标题沿目标表（不传 titles 覆盖）。
 */
import { mountUpdateBatchPanel } from 'dsh-plugin-update/panel-batch';
import type { BatchPanelController, BatchPanelContainer } from 'dsh-plugin-update/panel-batch';
import { mountUpdateEntry } from 'dsh-plugin-update/entry';
import type { UpdateEntryController, UpdateEntryOptions } from 'dsh-plugin-update/entry';
import { MANAGER_RPC } from './update-contract.js';
import { BATCH_PREFIX, MANAGER_TARGET_KEY, UPDATE_TARGETS } from './update-targets.js';
import type { RpcCallFace } from './dsh-ctx.js';

/** 面板调宿主： upstream 面板唯一的宿主接触面（电话名 + 参数）。 */
export type LifePanelCall = (name: string, args: Record<string, unknown>) => Promise<unknown>;

/** 总管自己那一行的电话名前缀（入口件状态源，取自目标表，不手写字面量）。 */
function managerPrefix(): string {
  const row = UPDATE_TARGETS.find((target) => target.key === MANAGER_TARGET_KEY);
  return row !== undefined ? row.phonePrefix : 'ilife-life-pack';
}

/** 总管自己在批量内的插件标识（与宿主侧上游缺省 batchPrefix-key 同口径）。 */
function managerPluginId(): string {
  return BATCH_PREFIX + '-' + MANAGER_TARGET_KEY;
}

/** 把 RpcCallFace 收成面板要的一参形状：上游回包原样透传（含失败回包的 errorKind 与 diag）。
 *
 * 宿主电话表把上游回包整体装进回执 value（成功失败皆如此，只有宿主级故障才走外层失败信封），
 * 故这里只拆信封、不重组回包：value 里有 ok 布尔即上游原文，原样交面板。
 */
export function managerCallAdapter(call: RpcCallFace | null): LifePanelCall {
  return async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    if (typeof call !== 'function') return { ok: false, error: 'manager-unreachable', errorKind: 'manager-unreachable' };
    let result: unknown;
    try {
      result = await call(MANAGER_RPC.base, MANAGER_RPC.endpoint, { method: name, payload: args });
    } catch {
      return { ok: false, error: 'manager-unreachable', errorKind: 'manager-unreachable' };
    }
    if (typeof result !== 'object' || result === null || (result as { ok?: unknown }).ok !== true) {
      const problem = (result as { error?: { code?: unknown; details?: unknown } } | null)?.error;
      const code = typeof problem?.code === 'string' && problem.code.length > 0 ? problem.code : 'manager-unreachable';
      const details = (problem?.details as Record<string, unknown> | undefined) ?? {};
      const kind = typeof details.errorKind === 'string' && (details.errorKind as string).length > 0
        ? (details.errorKind as string)
        : code;
      const raw: Record<string, unknown> = { ok: false, error: code, errorKind: kind };
      if (details.diag !== undefined) raw.diag = details.diag;
      return raw;
    }
    const value = (result as { value?: unknown }).value;
    if (typeof value === 'object' && value !== null && typeof (value as { ok?: unknown }).ok === 'boolean') return value;
    return { ok: false, error: 'internal', errorKind: 'internal' };
  };
}

/** 挂入口按钮（点击打开批量弹窗，状态取总管自己一行的只读快照）。 */
export function mountLifeUpdateEntry(
  container: BatchPanelContainer,
  call: LifePanelCall,
  onOpen: () => void,
  overrides?: Partial<Pick<UpdateEntryOptions, 'autoCheck' | 'label'>> | undefined,
): UpdateEntryController {
  return mountUpdateEntry(container, {
    pluginId: managerPluginId(),
    prefix: managerPrefix(),
    call,
    variant: 'button',
    openOn: 'manual',
    theme: 'archive',
    autoCheck: overrides?.autoCheck ?? 'mount',
    label: overrides?.label,
    onActivate: () => { onOpen(); },
  });
}

/** 挂批量面板（内嵌形态进自家弹窗壳，离开时 unmount 只停轮询）。 */
export function mountLifeBatchPanel(container: BatchPanelContainer, call: LifePanelCall): BatchPanelController {
  return mountUpdateBatchPanel(container, { prefix: BATCH_PREFIX, call, theme: 'archive', mode: 'embedded' });
}
