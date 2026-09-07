/** base-paint/injector：装配唯一 owner（归一 render）。
 *
 * better-sidebar 槽位注册只许住这里：link-core/combos 禁止自装配
 *（tooling/check-boundaries.mjs 可执行断言）。host 无关设计——
 * 以 SlotsPort 注入真实服务，B 落地实测时接线，单测用假端口。
 * 语义抄 matt 实证：幂等（disposer 非空即跳过）+ 有界重试（1s×10）+
 * 卸载清理（ctx.effect 同构），成功后无轮询；openTab 走 path seed 内容型打开。
 */
import type { PageDescriptor } from './ui.js';

export interface TabEntry {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly single: boolean;
  readonly hidden?: boolean;
  readonly component: unknown;
}

export interface TabSeed {
  readonly type: string;
  readonly path: string;
}

export interface TabScope {
  readonly sessionId?: string;
}

export interface SlotsPort {
  /** 能力探测（对应 ctx.get betterSidebar 存在且 registerTab 可用）。 */
  hasTabs(): boolean;
  registerTab(entry: TabEntry): () => void;
  openTab(seed: TabSeed, scope?: TabScope): void;
}

export interface MountOptions {
  readonly maxRetries?: number;
  readonly retryMs?: number;
}

export interface MountHandle {
  /** 仍在重试等待服务就绪。 */
  pending(): boolean;
  /** 停重试定时器 + 逐个调 tab disposer（幂等）。 */
  dispose(): void;
}

export const INJECTOR_DEFAULT_MAX_RETRIES = 10;
export const INJECTOR_DEFAULT_RETRY_MS = 1000;

/** 挂载全部页面描述子（按 order 注册，ilife 星号 id）。幂等：同 slotId 不重复注册。 */
export function mountInjector(port: SlotsPort, pages: readonly PageDescriptor[], opts: MountOptions = {}): MountHandle {
  const maxRetries = opts.maxRetries ?? INJECTOR_DEFAULT_MAX_RETRIES;
  const retryMs = opts.retryMs ?? INJECTOR_DEFAULT_RETRY_MS;
  const disposers = new Map<string, () => void>();
  const wanted = new Set(pages.map((p) => p.slotId));
  let timer: ReturnType<typeof setInterval> | null = null;
  let tries = 0;
  let disposed = false;

  const tryMount = (): boolean => {
    if (disposed || !port.hasTabs()) return false;
    const ordered = [...pages].sort((a, b) => a.order - b.order);
    for (const p of ordered) {
      if (disposers.has(p.slotId)) continue;
      try {
        const d = port.registerTab({ id: p.slotId, title: p.title, order: p.order, single: true, component: { skill: p.skill, kind: p.kind } });
        disposers.set(p.slotId, d);
      } catch {
        return false;
      }
    }
    return disposers.size === wanted.size;
  };

  const stopTimer = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  if (!tryMount()) {
    timer = setInterval(() => {
      tries += 1;
      if (tryMount() || tries >= maxRetries) stopTimer();
    }, retryMs);
  }

  return {
    pending: () => timer !== null,
    dispose: () => {
      disposed = true;
      stopTimer();
      for (const d of disposers.values()) {
        try { d(); } catch { /* 忽略 */ }
      }
      disposers.clear();
    },
  };
}

/** 打开一页：path seed 内容型打开（折叠面板自动展开）；缺席直接返回，由调用方渲染 reco。 */
export function openPage(port: SlotsPort, page: PageDescriptor, sessionId?: string): void {
  if (!port.hasTabs()) return;
  port.openTab({ type: page.slotId, path: page.slotId }, sessionId ? { sessionId } : undefined);
}
