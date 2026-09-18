/** 配置体检的状态源：**一份快照**喂两处（面板顶部那行总览 ＋ 各家页签那张表）。
 *
 * 为什么是一个 hook 而不是两处各取一次（票 #706 验收第三条「同一份数据，不许两处各算一遍」）：
 * 这一处取数、这一处存状态，总览与各家表都从它读 —— 那条验收因此是**结构上的性质**，不是靠自觉。
 *
 * 取数是**按需**的（点「体检一次」才跑）：没有轮询、没有定时器（静态门那条「无数据轮询」照旧）。
 */
import * as React from 'react';
import { loadHealthReports } from './health-fetch.js';
import type { HealthCallFace, HealthTabRow } from './health-fetch.js';
import { worstStatus } from './health-contract.js';
import type { HealthReport, HealthStatus } from './health-contract.js';

/** 一家的状态：没跑过／正在跑／有报告／这一家出错。 */
export type HealthPhase = 'idle' | 'running' | 'ready' | 'failed';

export interface HealthPanelFace {
  /** 一次取数的结果：包名 → 该家的状态（缺席的包不在表里）。 */
  readonly rows: Readonly<Record<string, { readonly phase: HealthPhase; readonly report: HealthReport | null; readonly error: string | null }>>;
  /** 取数过程本身的错（通道缺席之类）。 */
  readonly error: string | null;
  /** 正在跑。 */
  readonly running: boolean;
  /** 跑一次（六家一起）。 */
  run(): void;
}

const IDLE = { phase: 'idle' as HealthPhase, report: null, error: null };

/** 一家的灯：没报告＝`null`（不冒充绿）。 */
export function lightOf(row: { readonly report: HealthReport | null } | undefined): HealthStatus | null {
  return row?.report ? worstStatus(row.report.items) : null;
}

/** 体检状态源：挂载时不自动跑（体检要读盘、要起子进程，按需跑），点一次跑六家。 */
export function useHealthPanel(getCall: () => HealthCallFace | null, tabs: readonly HealthTabRow[]): HealthPanelFace {
  const [rows, setRows] = React.useState<HealthPanelFace['rows']>({});
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const run = React.useCallback(() => {
    const diag = (globalThis as { __T706_RUN__?: string[] }).__T706_RUN__;
    if (Array.isArray(diag)) diag.push('run:tabs=' + String(tabs.length));
    setRunning(true);
    setError(null);
    const targets = tabs;
    setRows(Object.fromEntries(targets.map((tab) => [tab.id, { ...IDLE, phase: 'running' as HealthPhase }])));
    void (async () => {
      const loaded = await loadHealthReports(getCall(), targets);
      // 渲染台的调试图（浏览器里没人写它，写入失败无所谓）：只记条数与第一条的错。
      try {
        const diag = (globalThis as { __T706_RUN__?: string[] }).__T706_RUN__;
        if (Array.isArray(diag)) diag.push('rows=' + String(loaded.rows.length) + ' err=' + String(loaded.error) + ' first=' + String(loaded.rows[0]?.error ?? 'null'));
      } catch {
        /* 调试图写不进去不影响正经事 */
      }
      const next: Record<string, { phase: HealthPhase; report: HealthReport | null; error: string | null }> = {};
      for (const row of loaded.rows) {
        next[row.id] = { phase: row.report ? 'ready' : 'failed', report: row.report, error: row.error };
      }
      setRows(next);
      setError(loaded.error);
      setRunning(false);
    })();
  }, [getCall, tabs]);
  const face: HealthPanelFace = { rows, error, running, run };
  // 出图页的取数口（渲染台的 hooks 替身没有真事件环，页内点按钮那条路不落定取数）。
  // 只在有人预先挂了 `__T706_FACE_SINK__` 时写一次，浏览器里没人挂它，等于没有这一行。
  const sink = (globalThis as { __T706_FACE_SINK__?: (value: HealthPanelFace) => void }).__T706_FACE_SINK__;
  if (typeof sink === 'function') {
    try {
      sink(face);
    } catch {
      /* 出图口的错不影响正经渲染 */
    }
  }
  return face;
}
