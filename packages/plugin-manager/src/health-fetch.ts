/** 面板到各家的配置体检：一次取数、六份报告（纯异步函数：无 DOM、无 react；传输口注入，便于单测）。
 *
 * 三条纪律：
 *   · **只走各家自己的电话**（`rpc.call(CARRIER_BASE, <电话名>, {method, payload}, …)`）——总管不认任何
 *     一家的端点、也不加任何单品的依赖；电话名与端点名都是各家契约件公开的事实。
 *     ⚠ **载体形状**（#735 真机踩到）：第一段必须是**载体基段** `/api`，第二段是那家的电话名
 *     （＝它注册在 `/api<通道>` 上的那一段），端点名写进载荷的 `method`。写错第一段就是 404，
 *     而 404 只落成「那一家取不到数」，屏上看起来像按钮坏了（先例：总管自己的电话在 #678 栽过同一处，
 *     见 `update-contract.ts` 的 `CARRIER_BASE`）。
 *   · **一次取数，六份报告**：总览那行与各家那张表读的是同一份结果（见 `health-panel.ts` 的单一状态源），
 *     不许两处各算一遍。
 *   · 有界超时：一家不回不该拖死整屏（技能侧 spawn 上限 20 s，这里给 25 s）。
 */
import { HEALTH_ENDPOINT, isHealthReport } from './health-contract.js';
import type { HealthReport } from './health-contract.js';
import { CARRIER_BASE } from './update-contract.js';
import type { RpcCallFace } from './dsh-ctx.js';

/** 传输口：与面板共用同一张脸（`connection.rpc.call` 的四参形状，见 dsh-ctx 的 RpcCallFace）。 */
export type HealthCallFace = RpcCallFace;

/** 一家的电话名：通道名去掉前导斜杠那一段（各家宿主半注册在 `/api` ＋ 通道名，信封 `method` 就是它）。 */
export function phoneOf(channel: string): string {
  return channel.startsWith('/') ? channel.slice(1) : channel;
}

/** 一家一份的时限（毫秒）：每家的电话各自带这个上限（`AbortSignal.timeout`），互不牵连。
 *
 * 口径（票 #740 定下，#1294 之后重读依据）：一家在技能侧最坏要等一次 spawn 超时
 * （各单品 `src/bridge.ts` 的 `SPAWN_TIMEOUT_MS = 20_000`），再留两次排队余量，
 * 取 3×20 s = 60 s。`test/plugin-p10-boundaries.test.mjs` 把这条关系写成门槛
 * （`HEALTH_TIMEOUT_MS >= 3 * SPAWN_TIMEOUT_MS`），任何一边改小都会先红。
 * #1294 起六家宿主半改成异步 spawn（不再阻塞宿主事件循环），六通电话真能并行；
 * 单家卡死只坏它自己那一格，不会再把整屏拖住。
 * 单家的错照样逐家报（那家页签里的体检表会写「体检超时（60s）…」）。 */
export const HEALTH_TIMEOUT_MS = 60_000 as const;

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
    const result = await call(
      CARRIER_BASE,
      phoneOf(row.channel),
      { method: HEALTH_ENDPOINT, payload: {} },
      AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    );
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

/** 取六家的体检报告（缺席的包不在此列，由调用方按账本判断）。
 *
 * `onRow`（票 #741）：某一家一落定就回调一次——面板据此**按家增量**画，不再等齐全部。
 * 六家的电话并发打出去，各家的 spawn 也是异步的（#1294），真实到达顺序由各自取数快慢决定；
 * 先回来的那家先画出来，用户才看得见进度。 */
export async function loadHealthReports(
  call: HealthCallFace | null,
  tabs: readonly HealthTabRow[],
  onRow?: (row: HealthFetchRow) => void,
): Promise<HealthFetchResult> {
  if (typeof call !== 'function') return { rows: [], error: '宿主连接缺席：connection.rpc.call 不可用' };
  const rows = await Promise.all(tabs.map(async (tab): Promise<HealthFetchRow> => {
    const one = await fetchOne(call, tab);
    const row: HealthFetchRow = { id: tab.id, report: one.report, error: one.error };
    // 回调里的异常不许把整批拖下水：这是画图的旁路，不是取数本身。
    try {
      onRow?.(row);
    } catch {
      /* 旁路失败不影响整批结果 */
    }
    return row;
  }));
  return { rows, error: null };
}
