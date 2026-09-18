/** 面板到各家的配置体检：一次取数、六份报告（纯异步函数：无 DOM、无 react；传输口注入，便于单测）。
 *
 * 三条纪律：
 *   · **只走各家自己的通道**（`rpc.call(channel, HEALTH_ENDPOINT, …)`）——总管不认任何一家、也不加
 *     任何单品的依赖；通道名从「爱生活页签槽」的账本条目带出来（各家注册时写进 options）。
 *   · **一次取数，六份报告**：总览那行与各家那张表读的是同一份结果（见 `health-panel.ts` 的单一状态源），
 *     不许两处各算一遍。
 *   · 有界超时：一家不回不该拖死整屏（技能侧 spawn 上限 20 s，这里给 25 s）。
 */
import { HEALTH_ENDPOINT, isHealthReport } from './health-contract.js';
import type { HealthReport } from './health-contract.js';

/** 传输口（DSH 载体 `connection.rpc.call` 的形状，cookbook §6）。 */
export type HealthCallFace = (
  channel: string,
  endpoint: string,
  payload: unknown,
  signal?: AbortSignal,
) => Promise<
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string; readonly details: Record<string, unknown> } }
>;

/** 一次取数的时限（毫秒）：技能侧 spawn 上限 20 s，这里留一点余量。 */
export const HEALTH_TIMEOUT_MS = 25_000 as const;

/** 一家的一行：报告取到了就是 `report`，取不到就是 `error`（缺席的包不进这张表）。 */
export interface HealthFetchRow {
  /** 该家插件包名（＝爱生活页签槽 id，也是缺席判定的那个 join 键）。 */
  readonly id: string;
  readonly report: HealthReport | null;
  readonly error: string | null;
}

/** 一次取数的结果：每家一行（顺序照页签顺序）。 */
export interface HealthFetchResult {
  readonly rows: readonly HealthFetchRow[];
  /** 取数过程本身的错（通道缺席之类），不是某一家的问题。 */
  readonly error: string | null;
}

/** 账本条目里本票要用的那一段（页签槽注册时写进 options）。 */
export interface HealthTabRow {
  readonly id: string;
  readonly channel: string;
}

function timeoutText(): string {
  return '体检超时（' + String(Math.round(HEALTH_TIMEOUT_MS / 1000)) + 's）：技能没在时限内回话。';
}

async function fetchOne(call: HealthCallFace, row: HealthTabRow): Promise<{ readonly report: HealthReport | null; readonly error: string | null }> {
  try {
    const result = await call(row.channel, HEALTH_ENDPOINT, {}, AbortSignal.timeout(HEALTH_TIMEOUT_MS));
    if (!result || typeof result !== 'object' || typeof (result as { ok?: unknown }).ok !== 'boolean') {
      return { report: null, error: '回执信封异常（非 ok 信封）。' };
    }
    if (!result.ok) {
      const error = (result as { error?: { code?: unknown; message?: unknown } }).error;
      const message = typeof error?.message === 'string' && error.message.length > 0 ? error.message : '体检没跑起来。';
      return { report: null, error: message };
    }
    const value = (result as { value?: unknown }).value;
    if (!isHealthReport(value)) return { report: null, error: '体检报告形状认不出（技能包与总管版本对不上？）。' };
    return { report: value, error: null };
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return { report: null, error: timeoutText() };
    }
    return { report: null, error: '体检没跑起来：' + (error instanceof Error ? error.message : String(error)) };
  }
}

/** 取六家的体检报告（缺席的包不在此列，由调用方按账本判断）。 */
export async function loadHealthReports(call: HealthCallFace | null, tabs: readonly HealthTabRow[]): Promise<HealthFetchResult> {
  if (typeof call !== 'function') return { rows: [], error: '宿主连接缺席：connection.rpc.call 不可用' };
  const rows = await Promise.all(tabs.map(async (tab): Promise<HealthFetchRow> => {
    const one = await fetchOne(call, tab);
    return { id: tab.id, report: one.report, error: one.error };
  }));
  return { rows, error: null };
}
