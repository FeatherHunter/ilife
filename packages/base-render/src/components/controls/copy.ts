/** controls · copy
 *
 *  自 `src/controls.ts` 原样切出。
 *
 *  **住址**：目录化批次⑤把 `src/controls.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（五个渲染器 ＋ 共享 helpers JS ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { badInput } from './shared.js';
import { renderToast } from './toast.js';
import { COPY_TEXT_DEFAULTS, CopyChannel, CopyPorts, CopyRuntime, CopyText, CopyTextOptions, CopyTextOutcome, STATUS_DEFAULT_TEXT, ToastInput } from '../../spec/index.js';

/* ── copyText 双通道（Q13／AC-16①） ──────────────────────────────────── */

export function assertCopyPorts(ports: CopyPorts, field: string): void {
  if (ports === null || typeof ports !== 'object') badInput(field + ': ports 必填');
  if (typeof ports.fallback !== 'function') badInput(field + ': ports.fallback 必须是函数');
  const clipboard = ports.clipboard;
  if (clipboard !== null && clipboard !== undefined && typeof clipboard.writeText !== 'function') {
    badInput(field + ': ports.clipboard.writeText 必须是函数');
  }
}

function pickCopyText(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value !== '' ? value : fallback;
}

/** 成功反馈：`opts.toast.ok` 逐字段覆盖（`silent` 只静默它，不静默失败徽章）。 */
function okToastInput(opts: CopyTextOptions): ToastInput {
  const override = opts.toast === undefined || opts.toast === null ? undefined : opts.toast.ok;
  const input: ToastInput = {
    msg: pickCopyText(override?.msg, COPY_TEXT_DEFAULTS.okMessage),
    detail: typeof override?.detail === 'string' ? override.detail : COPY_TEXT_DEFAULTS.okDetail,
  };
  return typeof override?.icon === 'string' ? { ...input, icon: override.icon } : input;
}

/** 失败反馈：徽章恒在（`badge.type` 恒 `danger`，文案取冻结的 `STATUS_DEFAULT_TEXT.danger`）。 */
function failToastInput(opts: CopyTextOptions): ToastInput {
  const override = opts.toast === undefined || opts.toast === null ? undefined : opts.toast.fail;
  return {
    msg: pickCopyText(override?.msg, COPY_TEXT_DEFAULTS.failMessage),
    detail: typeof override?.detail === 'string' ? override.detail : COPY_TEXT_DEFAULTS.failDetail,
    icon: typeof override?.icon === 'string' ? override.icon : 'danger',
    badge: { type: 'danger', text: STATUS_DEFAULT_TEXT.danger },
  };
}

/** 冻结签名：`copyText(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>`。 */
export const copyText: CopyText = async (text, ports, opts) => {
  assertCopyPorts(ports, 'copyText');
  if (typeof text !== 'string') badInput('copyText: text 必须是字符串');
  const options: CopyTextOptions = opts === null || opts === undefined || typeof opts !== 'object' ? {} : opts;

  if (COPY_TEXT_DEFAULTS.emptyTextShortCircuit && text === '') {
    return { ok: false, channel: null, reason: 'empty' };
  }

  const mountFeedback = (input: ToastInput): void => {
    const host = ports.toast;
    if (host === null || host === undefined) return;
    if (typeof host.mount !== 'function') badInput('copyText: ports.toast.mount 必须是函数');
    host.mount(renderToast(input));
  };

  const settle = (ok: boolean, channel: CopyChannel | null, reason?: string): CopyTextOutcome => {
    if (ok) {
      if (options.silent !== true) mountFeedback(okToastInput(options));
      if (typeof options.onOk === 'function') options.onOk(channel as CopyChannel);
      return { ok: true, channel };
    }
    if (COPY_TEXT_DEFAULTS.failBadgeAlwaysOn) mountFeedback(failToastInput(options));
    if (typeof options.onFail === 'function') options.onFail(reason ?? 'unknown');
    return { ok: false, channel: null, reason };
  };

  const clipboard = ports.clipboard ?? null;
  if (clipboard !== null) {
    try {
      await clipboard.writeText(text);
      return settle(true, 'clipboard');
    } catch {
      // 通道 1 失败 → 通道 2（不得只留 execCommand 的单通道，§3.3）
    }
  }
  // 通道 2：**同步抛错同样不得逃出**（§3.3「两通道皆失败 → `{ok:false,…}`（不抛错）」＋「失败徽章恒在」；
  // 旧层 `_fbCopy` 整段 try/catch、失败返回 false 同口径）。只包住 `ports.fallback` 调用本身，
  // 不包 `settle()`——否则反馈通道抛错会被误判成「通道 2 失败」而重复出徽章。
  let fallbackOk = false;
  try {
    fallbackOk = Boolean(ports.fallback(text));
  } catch {
    return settle(false, null, 'fallback-threw');
  }
  return fallbackOk ? settle(true, 'fallback') : settle(false, null, 'fallback-failed');
};

/** 冻结签名：`createCopyRuntime(ports: CopyPorts): CopyRuntime`。
 *
 *  除转发 `copyText` 外，本 runtime 记录自己挂载的反馈节点，`dispose()` 一并移除（幂等）。
 *  「dispose 后仍可复制」是文档未规定处的取值：`dispose` 只回收反馈节点，不改端口语义。 */
export const createCopyRuntime = (ports: CopyPorts): CopyRuntime => {
  assertCopyPorts(ports, 'createCopyRuntime');
  const handles = new Set<{ remove(): void }>();
  const host = ports.toast;
  const wrapped: CopyPorts = host === null || host === undefined
    ? ports
    : {
      clipboard: ports.clipboard,
      fallback: ports.fallback,
      toast: {
        mount: (html: string) => {
          const handle = host.mount(html);
          handles.add(handle);
          return {
            remove: () => {
              handles.delete(handle);
              handle.remove();
            },
          };
        },
      },
    };
  return {
    copyText: (text: string, opts?: CopyTextOptions) => copyText(text, wrapped, opts),
    dispose: () => {
      for (const handle of [...handles]) handle.remove();
      handles.clear();
    },
  };
};

