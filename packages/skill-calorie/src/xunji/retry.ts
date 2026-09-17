/** 训记错误分类 ＋ 退避重试（老 `xunji_bridge/errors.py` 的分类要点与重试口径，代码新写）。
 *
 * 分类（只读参照 `errors.py:39-46` 的 7 类 ＋ `:128-180` 的判定序；本件只收推送链用得到的分支）：
 * - `auth`：HTTP 401／403，或正文含 apikey 缺失／无效（老 `:142-148`）。
 *   注意：此 `auth` 盖两支——本地缺 KEY（无 HTTP 状态码）与服务端 401／403（有状态码）；
 *   退出码由 `exitMap.ts#exitForFailure` 按有无状态码分流（2 vs 3，老实况，#595 §八·2）；
 * - `vip_required`：正文含 仅VIP／vip required（老 `:135-140`）；
 * - `rate_limit`：HTTP 429，或正文含 too frequent／frequent（老 `:151-157`），缺省 45 秒；
 * - `validation`：HTTP 400（老 `:160-165`）；
 * - `server`：HTTP 5xx（老 `:168-173`）；
 * - `network`：超时／连接错（老 `:109-111` 的 NETWORK；本仓超时由 `AbortController` 触发，见 `upsert.ts`）；
 * - `unknown`：其余（老 `:176-180`）。
 * 软错误同判：HTTP 200 但 `success:false`／含 `error` 键／`res` 是 "too frequent" 串，
 * 走同一套分类（老 `:79-103`）。
 *
 * 重试（老 `retry_with_backoff(max_retries=2, sleep_base=5)`，`upsert.py:134-135`）：
 * - 最多调 3 次（首调 ＋ 2 次重试），退避 5 秒、10 秒，限频优先用服务端 `retry_after`
 *   （老 `errors.py:276-282` 的 `5, 10` 与 `retry_after` 优先）；
 * - `auth`／`vip_required`／`validation` **不重试**（老 `:270-274`，票面点名）；
 * - 睡眠可注入（测试挡板；生产真实 sleep）。
 */

/** 训记错误 7 类（老 `ErrorType`，`errors.py:39-46`）。 */
export type XunjiErrorKind =
  | 'auth'
  | 'rate_limit'
  | 'vip_required'
  | 'validation'
  | 'server'
  | 'network'
  | 'unknown';

/** 一次失败的结构化读数（老 `classify_error` 的 5 键，`errors.py:62-70`）。 */
export interface XunjiFailure {
  readonly error_type: XunjiErrorKind;
  readonly message: string;
  readonly retry_after: number | null;
  readonly raw_body: unknown;
  readonly code: number | null;
}

/** 不重试的三类（老 `errors.py:270-274`；本票验收点名，单列常量不断言错位）。 */
const NO_RETRY: ReadonlySet<XunjiErrorKind> = new Set(['auth', 'vip_required', 'validation']);

/** 正文里找 `retry after Ns`（老 `_parse_retry_after` 覆盖的 `(\d+)\s*s` 那一支）。 */
function parseRetryAfterMs(body: unknown): number | null {
  const pick = (v: unknown): string => (typeof v === 'string' ? v : '');
  const text = [body]
    .filter((b): b is Record<string, unknown> => typeof b === 'object' && b !== null)
    .map((b) => [pick(b.retry_after), pick(b.retryAfter), pick(b.message), pick(b.msg), pick(b.error), pick(b.res)].join(' '))
    .join(' ');
  const m = /(\d+)\s*s/.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** HTTP 状态 ＋ 已解析正文 → 结构化失败（老 `_classify_by_code_and_body`，`errors.py:128-180`）。 */
export function classifyStatusBody(code: number | null, body: unknown, rawBody: unknown): XunjiFailure {
  const lowered = JSON.stringify(body ?? rawBody ?? '').toLowerCase();
  if (lowered.includes('仅vip') || lowered.includes('vip required') || lowered.includes('仅 vip')) {
    return { error_type: 'vip_required', message: '训记仅 VIP 可用，需要会员权限', retry_after: null, raw_body: rawBody, code };
  }
  if (
    code === 401 ||
    code === 403 ||
    (lowered.includes('apikey') && (lowered.includes('missing') || lowered.includes('invalid')))
  ) {
    return { error_type: 'auth', message: '训记 API KEY 缺失或无效', retry_after: null, raw_body: rawBody, code };
  }
  if (code === 429 || lowered.includes('too frequent') || lowered.includes('frequent')) {
    const after = parseRetryAfterMs(body) ?? 45;
    return { error_type: 'rate_limit', message: '训记限频（需等 ' + after + 's）', retry_after: after, raw_body: rawBody, code };
  }
  if (code === 400) {
    return { error_type: 'validation', message: '请求字段错（400）', retry_after: null, raw_body: rawBody, code };
  }
  if (code !== null && code >= 500 && code < 600) {
    return { error_type: 'server', message: '训记服务端错（' + code + '）', retry_after: null, raw_body: rawBody, code };
  }
  return { error_type: 'unknown', message: '未分类错误（code=' + String(code) + '）', retry_after: null, raw_body: rawBody, code };
}

/** 异常（超时／连接错／JSON 解析失败）→ 结构化失败（老 `classify_error` 的 Exception 分支，`:106-117`）。 */
export function classifyThrown(e: unknown): XunjiFailure {
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError' || /timed out|timeout|aborted/i.test(msg))) {
    return { error_type: 'network', message: '训记调用超时：' + msg, retry_after: null, raw_body: msg, code: null };
  }
  if (/ECONN|ENOTFOUND|EAI_AGAIN|fetch failed|network/i.test(msg)) {
    return { error_type: 'network', message: '网络错误：' + msg, retry_after: null, raw_body: msg, code: null };
  }
  return { error_type: 'unknown', message: '未知错误：' + msg, retry_after: null, raw_body: msg, code: null };
}

/** 2xx 正文的软错误检测（老 `:83-93`）：命中即按失败走分类，否则当成功。 */
export function softFailureOf(body: unknown): XunjiFailure | null {
  if (typeof body !== 'object' || body === null) return null;
  const rec = body as Record<string, unknown>;
  const resStr = typeof rec.res === 'string' ? rec.res : '';
  if (rec.success === false || 'error' in rec || resStr.toLowerCase().includes('too frequent')) {
    return classifyStatusBody(200, body, body);
  }
  return null;
}

/** 单次调用的两种结局：成功透传正文，失败带结构化读数（`attempts` 只在 >1 时回写，老规矩）。 */
export type XunjiCallOutcome =
  | { readonly ok: true; readonly response: unknown; readonly attempts: number }
  | { readonly ok: false; readonly failure: XunjiFailure; readonly attempts: number };

/** 重试包装（老 `retry_with_backoff`，`errors.py:242-295`；`call` 抛错也按失败走分类重试）。 */
export async function retryWithBackoff(
  call: () => Promise<XunjiCallOutcome>,
  maxRetries = 2,
  sleepBaseMs = 5000,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }),
): Promise<XunjiCallOutcome> {
  let last: XunjiCallOutcome = { ok: true, response: null, attempts: 0 };
  for (let i = 0; i <= maxRetries; i += 1) {
    let out: XunjiCallOutcome;
    try {
      out = await call();
    } catch (e) {
      const failure = classifyThrown(e);
      out = { ok: false, failure, attempts: i + 1 };
    }
    last = { ...out, attempts: i + 1 };
    if (out.ok) return last;
    if (NO_RETRY.has(out.failure.error_type)) return last;
    if (i < maxRetries) {
      const wait = out.failure.retry_after !== null ? out.failure.retry_after * 1000 : sleepBaseMs * 2 ** i;
      await sleep(wait);
    }
  }
  return last;
}
