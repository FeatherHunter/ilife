/** 推送限频：45 秒常量（唯一定义地）＋ 窗口判定 ＋ 跨进程节流器。
 *
 * 老口径（只读参照 `xunji_bridge/push.py:29`、`push.py:156-158`、`run_sync.py:178-190`）：
 * - 常量 `RATE_LIMIT_SECONDS = 45`（老 `push.py:29`，注释“训记写 API 限频要求（应用层策略）”）；
 * - 老实现只守“同一天内第 2 个 session 起”（`push.py:156-158` 的 `if i > 0`），跨天不守
 *   （`run-sync` 逐天起子进程，天与天之间无 sleep）、`--dry-run` 不守、`overlay` 不守。
 *
 * 本票决议（票面点名“本票内定并写进口径”）：
 * - **按段逐个守**：每次 upsert 调用前都看“距上次 upsert 过去了多久”，窗口内先睡够再调
 *   （老行为“睡够再调”保留，见 `push.py:157-158`；`--dry-run` 仍不守不记，老 `:156` 同述）；
 * - **跨天／跨进程也守**（把“跨天不守”当缺陷修掉）：上次调用时刻落在盘上状态文件里，
 *   不同进程的两次 `push-plan` 照样排开；
 * - 时钟／睡眠／状态文件**全可注入**：生产走真实时间与 `<状态目录>/xunji_push_rate.json`
 *   （状态目录＝配置 `xunji.stateDir`，空串＝默认落点 `<数据目录>/xunji`，见 `xunjiStateDir()`；#757 起不再 `~/.mavis`），
 *   测试一律注入（不许睡真 45 秒，更不许碰真机状态文件）。
 */

import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { loadCalorieConfig } from '../config.js';
import { resolveDbDir, stateDirOf } from '../paths.js';

/** 训记写接口限频窗口（秒）。老 `push.py:29` 同值；全模块只此一处，别处引用。 */
export const RATE_LIMIT_SECONDS = 45;

/** 状态文件目录的**唯一定义地**（读侧限频／写侧限频／同步状态三份状态文件都落这儿）：
 *  配置里 `xunji.stateDir` 非空即用它，空串＝默认落点 `<数据目录>/xunji`（#757 起不再 `~/.mavis`；
 *  算式唯一定义地＝`src/paths.ts` 的 `stateDirOf`，本函数只做「读配置」的薄壳）。
 *  #676：这里原先各自硬写 `join(homedir(), '.mavis')`，三处同式；收成一处，配置也只读一处。 */
export function xunjiStateDir(): string {
  const configured = loadCalorieConfig().values.xunji.stateDir;
  return stateDirOf(resolveDbDir(), configured);
}

/** 缺省状态文件：状态目录下与读侧分开的一份（读侧是 `xunji_bridge_rate.json`，`auth.py:40`）。 */
export function defaultRateLimitPath(): string {
  return join(xunjiStateDir(), 'xunji_push_rate.json');
}

/** 窗口内还差多少毫秒（纯函数）：无历史／已出窗返 0，窗内返剩余量（>0）。 */
export function rateLimitWaitMs(lastCallMs: number | null, nowMs: number, windowSeconds: number = RATE_LIMIT_SECONDS): number {
  if (lastCallMs === null) return 0;
  const wait = lastCallMs + windowSeconds * 1000 - nowMs;
  return wait > 0 ? wait : 0;
}

/** 节流器的可注入件（测试挡板从这里进；生产缺省见 `createRateLimiter`）。 */
export interface RateLimiterDeps {
  /** 现在（毫秒，缺省 `Date.now`）。 */
  readonly now?: () => number;
  /** 睡眠（毫秒，缺省真实 sleep）。 */
  readonly sleep?: (ms: number) => Promise<void>;
  /** 状态文件路径（缺省 `defaultRateLimitPath()`；传 null 即只记内存、不落盘）。 */
  readonly statePath?: string | null;
}

/** 读上次调用时刻（毫秒；文件不在／坏内容一律当“无历史”，不抛——坏文件不许堵死推送）。 */
function readLastCallMs(statePath: string): number | null {
  let raw: string;
  try {
    raw = readFileSync(statePath, 'utf8');
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const iso = (parsed as { last_upsert_iso?: unknown } | null)?.last_upsert_iso;
    if (typeof iso !== 'string' || iso === '') return null;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

/** 写本次调用时刻（原子写：先写 `.tmp` 再改名，老 `auth.py:218-222` 同法；写坏不抛，由调用方记备注）。 */
function writeLastCallMs(statePath: string, nowMs: number): boolean {
  try {
    mkdirSync(dirname(statePath), { recursive: true });
    const tmp = statePath + '.tmp';
    writeFileSync(tmp, JSON.stringify({ last_upsert_iso: new Date(nowMs).toISOString() }, null, 2), 'utf8');
    renameSync(tmp, statePath);
    return true;
  } catch {
    return false;
  }
}

/** 一次 upsert 调用前的限频门：窗内先睡够（返回睡了多少毫秒），并记下本次时刻。 */
export interface RateLimiter {
  /** 睡够再走；`dryRun` 时直接返 0（不睡不记，老 `push.py:156` 同述）。 */
  guard(dryRun: boolean): Promise<{ waitedMs: number; stateSaved: boolean }>;
}

/** 建节流器（`windowSeconds` 只供测试加速窗口换算；生产一律缺省 45 秒）。 */
export function createRateLimiter(deps: RateLimiterDeps = {}, windowSeconds: number = RATE_LIMIT_SECONDS): RateLimiter {
  const now = deps.now ?? Date.now;
  const sleep =
    deps.sleep ??
    ((ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }));
  const statePath = deps.statePath === undefined ? defaultRateLimitPath() : deps.statePath;
  let memLastMs: number | null = null;
  let memUsed = false;
  return {
    async guard(dryRun: boolean): Promise<{ waitedMs: number; stateSaved: boolean }> {
      if (dryRun) return { waitedMs: 0, stateSaved: true };
      const at = now();
      const last = statePath === null ? (memUsed ? memLastMs : null) : (readLastCallMs(statePath) ?? memLastMs);
      const wait = rateLimitWaitMs(last, at, windowSeconds);
      if (wait > 0) await sleep(wait);
      const stamped = now();
      if (statePath === null) {
        memLastMs = stamped;
        memUsed = true;
        return { waitedMs: wait, stateSaved: true };
      }
      memLastMs = stamped;
      return { waitedMs: wait, stateSaved: writeLastCallMs(statePath, stamped) };
    },
  };
}

/** 状态文件是否存在（测试断言“落盘了没有”用；生产不用它做判定）。 */
export function rateLimitStateExists(statePath: string): boolean {
  return existsSync(statePath);
}
