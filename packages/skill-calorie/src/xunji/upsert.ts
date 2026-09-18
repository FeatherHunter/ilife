/** 训记 upsert 原子调用（老 `xunji_bridge/upsert.py:57-138`，代码新写）。
 *
 * 行为（逐条对老）：
 * - 接口 `POST https://trains.xunjiapp.cn/api_upsert_trains_for_llm_v2`（老 `:53-54`）；
 * - 包体五键 `schema_version／client_request_id／dry_run／include_full_data／res`
 *   （老 `:90-96`），`res` 透传；`client_request_id` 缺省自动生成（老 `:77-79`）；
 * - `dry_run` 只组包体摘要、不读 KEY、不调网（老 `:81-89` 在 `require_key` 之前）；
 * - 非 dry-run 先要 KEY（缺 KEY 即 `auth` 失败，不调网、不重试；老 `:89` 的 `require_key` 抛错位）；
 * - 超时缺省 30 秒（老 `:62` 的 `timeout=30`），超时走 `network` 进重试（老 `:109-111`）；
 * - 重试 `max_retries=2`（老 `:135`），`auth／vip／validation` 不重试（见 `retry.ts`）；
 * - 响应 `gzip` 由运行时自动解（Node 全局 fetch 缺省解压；老 `:112-114` 手工解是 urllib 才要的）。
 *
 * KEY 口径（只读参照 `auth.py:35-55`；**定义住 `key.ts`**，本件只薄转出保既有引用不断）：
 * - 缺省读**配置文件**里的 `xunji.key`（#676：环境变量读取已删，见 `key.ts` 件头）；
 * - 调用方可显式传 `key` 或换 `readKey`（测试挡板从这里进；真 KEY 永不进仓）。
 */

import { randomUUID } from 'node:crypto';
import { buildUpsertPayload } from './request.js';
import type { XunjiResItem } from './request.js';
import { XUNJI_KEY_FIELD, readKey } from './key.js';
import { classifyStatusBody, classifyThrown, retryWithBackoff, softFailureOf } from './retry.js';
import type { XunjiCallOutcome, XunjiFailure } from './retry.js';

/** KEY 落点名＋缺省读法薄转出（定义见 `key.ts`）。 */
export { XUNJI_KEY_FIELD, readKey };

/** upsert 接口地址（老 `upsert.py:53-54` 同值；全模块只此一处）。 */
export const XUNJI_UPSERT_ENDPOINT = 'https://trains.xunjiapp.cn/api_upsert_trains_for_llm_v2';

/** 最小传输面（只取“状态＋正文”；全局 fetch 与测试挡板都包得住）。 */
export interface UpsertTransport {
  (url: string, init: { method: 'POST'; headers: Record<string, string>; body: string; signal: AbortSignal }): Promise<{
    readonly status: number;
    readonly bodyText: () => Promise<string>;
  }>;
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

/** `upsertTrains` 的可注入件（测试挡板从这里进；生产全缺省）。 */
export interface UpsertOptions {
  /** 幂等键（缺省自动生成，老 `upsert.py:77-79`）。 */
  readonly clientRequestId?: string;
  /** 改 RPE／难度／备注时建议 true（老 `:70`）。 */
  readonly includeFullData?: boolean;
  /** 只组包体摘要，不读 KEY、不调网（老 `:63`）。 */
  readonly dryRun?: boolean;
  /** 显式 KEY（给了就不用 `readKey`）。 */
  readonly key?: string | null;
  /** KEY 来源（缺省读环境变量；#610 后改走能力门）。 */
  readonly readKey?: () => string | null;
  /** 传输（缺省全局 fetch）。 */
  readonly transport?: UpsertTransport;
  /** 超时毫秒（缺省 30000，老 `:62` 的 `timeout=30`）。 */
  readonly timeoutMs?: number;
  /** 重试次数（缺省 2，老 `:135`）。 */
  readonly maxRetries?: number;
  /** 睡眠（缺省真实 sleep；重试退避用）。 */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** `upsertTrains` 的结局（成功透传训记正文；失败带结构化读数；`attempts` 为实际调用次数）。 */
export type UpsertOutcome = XunjiCallOutcome;

function authMissing(): UpsertOutcome {
  const failure: XunjiFailure = {
    error_type: 'auth',
    message: '未配置训记 KEY（配置项 ' + XUNJI_KEY_FIELD + '；用 key set <KEY> 写进配置文件）',
    retry_after: null,
    raw_body: null,
    code: null,
  };
  return { ok: false, failure, attempts: 0 };
}

/** 调一次 upsert（原子层，无业务：不读库、不转计划、不对账，老 `:28` 同述）。 */
export async function upsertTrains(resList: readonly XunjiResItem[], opts: UpsertOptions = {}): Promise<UpsertOutcome> {
  const clientRequestId = opts.clientRequestId !== undefined && opts.clientRequestId !== '' ? opts.clientRequestId : randomUUID().replace(/-/g, '');
  const includeFullData = opts.includeFullData ?? false;
  if (opts.dryRun === true) {
    return {
      ok: true,
      response: { dry_run: true, client_request_id: clientRequestId, include_full_data: includeFullData, res_count: resList.length },
      attempts: 0,
    };
  }
  const key = opts.key !== undefined && opts.key !== null && opts.key !== '' ? opts.key : (opts.readKey ?? readKey)();
  if (key === null || key === '') return authMissing();
  const transport = opts.transport ?? defaultTransport;
  const timeoutMs = opts.timeoutMs ?? 30000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }));
  const payload = buildUpsertPayload(resList, clientRequestId, includeFullData);
  const body = JSON.stringify(payload);
  const once = async (): Promise<UpsertOutcome> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await transport(XUNJI_UPSERT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body,
        signal: ctrl.signal,
      });
      const text = await resp.bodyText();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        const failure: XunjiFailure = { error_type: 'validation', message: '响应 JSON 解析失败', retry_after: null, raw_body: text.slice(0, 200), code: resp.status };
        return { ok: false, failure, attempts: 1 };
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
