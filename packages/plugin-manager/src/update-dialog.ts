/** 面板薄包装（票 1170 起，浏览器侧：无 node 内建，可进 client 束；完全上游 UI，本包零自家样式）。
 *
 * 只定死三组参数，不自建文案与样式：批量入口形态 button、皮肤 archive、打开策略沿上游缺省 always
 *（查完总是开批量面板；0.5.4 #49 到达，manual 桥接已删）；弹窗 dialog 由入口件内置（含关闭落地）；
 * 轮询与更新日志沿上游缺省，中文标题沿目标表（不传 titles 覆盖）。
 */
import { mountUpdateBatchEntry } from 'dsh-plugin-update/entry-batch';
import type { UpdateBatchEntryController, UpdateBatchEntryOptions } from 'dsh-plugin-update/entry-batch';
import type { BatchPanelContainer } from 'dsh-plugin-update/panel-batch';
import { MANAGER_RPC } from './update-contract.js';
import { BATCH_PREFIX } from './update-targets.js';
import type { RpcCallFace } from './dsh-ctx.js';

/** 面板调宿主： upstream 面板唯一的宿主接触面（电话名 + 参数）。 */
export type LifePanelCall = (name: string, args: Record<string, unknown>) => Promise<unknown>;

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

/** 挂批量入口（一颗按钮看七家聚合，弹窗 dialog 由入口件内置，关闭落地自带）。
 *
 * 0.5.4 #49 到达：`prefix: life` 直调批量五电话，徽标与面板总账同一份数法；manual 桥接与容器事件同步已整段删除。
 */
export function mountLifeBatchEntry(
  container: BatchPanelContainer,
  call: LifePanelCall,
  overrides?: Partial<Pick<UpdateBatchEntryOptions, 'autoCheck' | 'label'>> | undefined,
): UpdateBatchEntryController {
  return mountUpdateBatchEntry(container, {
    prefix: BATCH_PREFIX,
    call,
    variant: 'button',
    theme: 'archive',
    autoCheck: overrides?.autoCheck ?? 'mount',
    label: overrides?.label,
  });
}
