/** controls · bind
 *
 *  自 `src/controls.ts` 原样切出。
 *
 *  **住址**：目录化批次⑤把 `src/controls.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（五个渲染器 ＋ 共享 helpers JS ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { assertCopyPorts, copyText } from './copy.js';
import { assertPlainObject, badInput } from './shared.js';
import { BindCopyAction } from '../../spec/index.js';

/* ── 复制接线（FX-3③／FX-17；#90 仅凭契约即可接线） ──────────────────── */

/** 冻结签名：`bindCopyAction(port, ports, opts?): { dispose(): void }`。
 *
 *  - id 来源**只有** `port.listActionIds()`：不猜 id、不通配前缀、不订阅未列出的 id；
 *  - 重复 id 由 binder 自行去重（同一 id 只订阅一次）；
 *  - 激活时读 `port.readDataText(actionId)`：非字符串（含 `undefined`）→ 跳过（不抛错、不产 toast），
 *    非复制按钮（场景按钮）即由此跳过，不另设允许清单；
 *  - 反馈一律走 `ports.toast`（`copyText` 内部），binder 不另出反馈；
 *  - **激活回调恒不产生未处理拒绝**（FX-76-6）：`copyText` 正常路径的失败已在内部 `settle()` 处理，
 *    这里只兜「逃出 `copyText` 的异常」（端口实现抛错／`ports.toast.mount` 抛错／回调抛错）——
 *    契约 §3.3 明写 binder 不另出反馈，故不产第二份 UI 反馈，也不重入 `opts.onFail`（防重复回调）；
 *  - `dispose()` 解绑全部已订阅 id 且幂等；解绑后激活不再触发复制。 */
export const bindCopyAction: BindCopyAction = (port, ports, opts) => {
  assertPlainObject(port, 'bindCopyAction: port');
  if (typeof port.listActionIds !== 'function') badInput('bindCopyAction: port.listActionIds 必须是函数');
  if (typeof port.readDataText !== 'function') badInput('bindCopyAction: port.readDataText 必须是函数');
  if (typeof port.onActivate !== 'function') badInput('bindCopyAction: port.onActivate 必须是函数');
  assertCopyPorts(ports, 'bindCopyAction');

  const unbinds: Array<() => void> = [];
  const seen = new Set<string>();
  let disposed = false;

  const list = port.listActionIds();
  for (const actionId of Array.isArray(list) ? list : []) {
    if (typeof actionId !== 'string' || actionId === '' || seen.has(actionId)) continue;
    seen.add(actionId);
    const off = port.onActivate(actionId, () => {
      if (disposed) return;
      const text = port.readDataText(actionId);
      if (typeof text !== 'string') return;
      // FX-76-6：`void` 丢弃结果，但**必须**接住 rejection（否则端口抛错 → unhandledRejection）。
      // 反馈只经 `ports.toast`（§3.3），故此处不产反馈、不重入 `opts.onFail`。
      void copyText(text, ports, opts).catch(() => {});
    });
    unbinds.push(typeof off === 'function' ? off : () => {});
  }

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const off of unbinds) off();
      unbinds.length = 0;
    },
  };
};

