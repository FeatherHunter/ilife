/** 回写链读口：拉某天训记实绩（老 `xunji_bridge/fetch.py`，代码新写；只读，不改库）。
 *
 * 口径（逐条对老）：
 * - 接口 `POST https://trains.xunjiapp.cn/api_trains_for_llm_v2`（老 `fetch.py:43-44`）；
 * - 包体三键 `schema_version／datestr／include_full_data`（老 `:68-72`），`datestr` 原样送；
 * - 超时缺省 30 秒（老 `:47` 的 `timeout=30`），超时走 `network` 进重试（老 `:107-110`）；
 * - 重试 `max_retries=2`（老 `:113`），分类与退避走 `retry.ts`（软错误同判，老 `:94-101`）；
 * - 限频档 `full=30s／light=15s`（老 `auth.py:42-44`），缺省**不守**（老 `:47` 缺省关）；
 *   开关打开时才看状态文件 `<状态目录>/xunji_bridge_rate.json`（老 `:40` 同件名；目录＝配置 `xunji.stateDir`）；
 * - 无 KEY 直接失败（老 `:66` 的 `require_key` 抛错位），不调网、不重试；
 * - `attempts > 1` 才回写（老 `:114-115`）；
 * - 响应 `gzip` 由运行时自动解（Node 全局 fetch 缺省解压；老 `:89-90` 手工解是 urllib 才要的）。
 *
 * #676 · KEY 口径住 `key.ts`（配置文件里的 `xunji.key`；环境变量读取已删）。 */

import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { classifyStatusBody, classifyThrown, retryWithBackoff, softFailureOf } from './retry.js';
import type { XunjiCallOutcome } from './retry.js';
import { xunjiStateDir } from './rateLimit.js';
import { readKey } from './key.js';
import type { UpsertTransport } from './upsert.js';

/** 拉取接口地址（老 `fetch.py:43-44` 同值；全模块只此一处）。 */
export const XUNJI_FETCH_ENDPOINT = 'https://trains.xunjiapp.cn/api_trains_for_llm_v2';

/** 拉取限频两档（秒；老 `auth.py:42-44` 同值；全模块只此一处，别处引用）。 */
export const FETCH_RATE_LIMIT_SECONDS = { full: 30, light: 15 } as const;

/** 缺省限频状态文件（老 `auth.py:40` 同件名，目录＝`xunjiStateDir()`；与推送侧 `xunji_push_rate.json` 分开）。 */
export function defaultFetchRateLimitPath(): string {
  return join(xunjiStateDir(), 'xunji_bridge_rate.json');
}

/** `fetchTrains` 的可注入件（测试挡板从这里进；生产全缺省）。 */
export interface FetchOptions {
  /** 回写恒 true（要 `done` 标记，老 `backfill.py:76`）；`fetch` 子命令按 `--full` 走。 */
  readonly includeFullData?: boolean;
  /** 显式 KEY（给了就不用 `readKey`）。 */
  readonly key?: string | null;
  /** KEY 来源（缺省读环境变量；#610 后改走能力门）。 */
  readonly readKey?: () => string | null;
  /** 传输（缺省全局 fetch；与推送侧同形状）。 */
  readonly transport?: UpsertTransport;
  /** 超时毫秒（缺省 30000，老 `:47` 的 `timeout=30`）。 */
  readonly timeoutMs?: number;
  /** 重试次数（缺省 2，老 `:113`）。 */
  readonly maxRetries?: number;
  /** 睡眠（缺省真实 sleep；重试退避与限频等待共用）。 */
  readonly sleep?: (ms: number) => Promise<void>;
  /** 打开限频等待（缺省 false，老缺省关；回写链经本开关显式打开）。 */
  readonly respectRateLimit?: boolean;
  /** 现在（毫秒；限频门用；缺省 `Date.now`）。 */
  readonly now?: () => number;
  /** 限频状态文件（缺省 `defaultFetchRateLimitPath()`；传 null 即不守不记）。 */
  readonly rateLimitPath?: string | null;
}

/** `fetchTrains` 的结局（成功透传训记正文；失败带结构化读数）。 */
export type FetchOutcome = XunjiCallOutcome;

/** 限频状态（老 `auth.py:202-212` 的两键；坏文件当无历史，不抛）。 */
interface FetchRateState {
  readonly last_full_call_iso?: unknown;
  readonly last_light_call_iso?: unknown;
}

function readRateState(statePath: string): FetchRateState {
  try {
    return JSON.parse(readFileSync(statePath, 'utf8')) as FetchRateState;
  } catch {
    return {};
  }
}

function secondsSince(statePath: string, full: boolean, nowMs: number): number | null {
  const key = full ? 'last_full_call_iso' : 'last_light_call_iso';
  const iso = readRateState(statePath)[key];
  if (typeof iso !== 'string' || iso === '') return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? (nowMs - ms) / 1000 : null;
}

function stampCall(statePath: string, full: boolean, nowMs: number): void {
  try {
    const prev = readRateState(statePath) as Record<string, unknown>;
    const key = full ? 'last_full_call_iso' : 'last_light_call_iso';
    mkdirSync(dirname(statePath), { recursive: true });
    const tmp = statePath + '.tmp';
    writeFileSync(tmp, JSON.stringify({ ...prev, [key]: new Date(nowMs).toISOString() }, null, 2), 'utf8');
    renameSync(tmp, statePath);
  } catch {
    /* 状态写坏不许堵死拉取（坏文件当无历史，老 `auth.py:207-212` 同口径） */
  }
}

/** 拉某天（`dateStr` 原样进包体，不做任何换算；调用方保证形状）。 */
export async function fetchTrains(dateStr: string, opts: FetchOptions = {}): Promise<FetchOutcome> {
  const full = opts.includeFullData ?? false;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }));
  const now = opts.now ?? Date.now;
  const statePath = opts.rateLimitPath === undefined ? defaultFetchRateLimitPath() : opts.rateLimitPath;
  if (opts.respectRateLimit === true && statePath !== null) {
    const threshold = full ? FETCH_RATE_LIMIT_SECONDS.full : FETCH_RATE_LIMIT_SECONDS.light;
    const since = secondsSince(statePath, full, now());
    if (since !== null && since < threshold) await sleep((threshold - since) * 1000);
  }
  const key = opts.key !== undefined && opts.key !== null && opts.key !== '' ? opts.key : (opts.readKey ?? readKey)();
  if (key === null || key === '') {
    return {
      ok: false,
      failure: {
        error_type: 'auth',
        message: '未配置训记 KEY（配置文件里的 xunji.key；用 key set <KEY> 写进去）',
        retry_after: null,
        raw_body: null,
        code: null,
      },
      attempts: 0,
    };
  }
  const transport = opts.transport ?? defaultTransport;
  const timeoutMs = opts.timeoutMs ?? 30000;
  const payload = JSON.stringify({ schema_version: 'train_open_api_v2', datestr: dateStr, include_full_data: full });
  const once = async (): Promise<FetchOutcome> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await transport(XUNJI_FETCH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: payload,
        signal: ctrl.signal,
      });
      const text = await resp.bodyText();
      if (opts.respectRateLimit === true && statePath !== null) stampCall(statePath, full, now());
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          ok: false,
          failure: { error_type: 'validation', message: '响应 JSON 解析失败', retry_after: null, raw_body: text.slice(0, 200), code: resp.status },
          attempts: 1,
        };
      }
      if (resp.status >= 200 && resp.status < 300) {
        const soft = softFailureOf(parsed);
        if (soft !== null) return { ok: false, failure: soft, attempts: 1 };
        return { ok: true, response: parsed, attempts: 1 };
      }
      return { ok: false, failure: classifyStatusBody(resp.status, parsed, text.slice(0, 2000)), attempts: 1 };
    } catch (e) {
      return { ok: false, failure: classifyThrown(e), attempts: 1 };
    } finally {
      clearTimeout(timer);
    }
  };
  return retryWithBackoff(once, opts.maxRetries ?? 2, 5000, sleep);
}

/** 缺省传输（全局 fetch；缺失即明确失败，不静默）。 */
const defaultTransport: UpsertTransport = (url, init) => {
  const f: unknown = (globalThis as { fetch?: unknown }).fetch;
  if (typeof f !== 'function') return Promise.reject(new Error('HTTP 通道不可用：全局 fetch 缺失'));
  return (f as typeof fetch)(url, init).then((r) => ({
    status: r.status,
    bodyText: () => r.text(),
  }));
};

/** 可读 set（老 `parse_trains`，`fetch.py:130-136` 五键；回写不用它，用 `rows.ts`）。 */
export interface FetchTrainSet {
  readonly index: unknown;
  readonly done: unknown;
  readonly weight: unknown;
  readonly unit: unknown;
  readonly reps: unknown;
}

/** 可读 movement（老 `:137-140` 两键）。 */
export interface FetchTrainMovement {
  readonly name: unknown;
  readonly sets: readonly FetchTrainSet[];
}

/** 可读训练（老 `:141-147` 五键）。 */
export interface FetchTrain {
  readonly localid: unknown;
  readonly title: unknown;
  readonly datestr: unknown;
  readonly difficulty: unknown;
  readonly movements: readonly FetchTrainMovement[];
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function asList(v: unknown): readonly unknown[] {
  return Array.isArray(v) ? v : [];
}

/** 训记响应 → 可读训练列表（每条 session 一项；形状不对即空表，不抛）。 */
export function parseTrains(response: unknown): FetchTrain[] {
  const trains = asList(asRecord(asRecord(response).res).trains);
  return trains.map((t) => {
    const train = asRecord(t);
    const movements = asList(train.movements).map((m) => {
      const move = asRecord(m);
      const sets = asList(move.sets).map((s) => {
        const set = asRecord(s);
        return { index: set.index, done: set.done, weight: set.weight, unit: set.unit, reps: set.reps };
      });
      return { name: move.name, sets };
    });
    return { localid: train.localid, title: train.title, datestr: train.datestr, difficulty: train.difficulty, movements };
  });
}
