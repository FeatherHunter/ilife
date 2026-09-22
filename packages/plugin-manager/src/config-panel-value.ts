/** 共用配置面板 · 取值与填值半：一份配置取值 ↔ 一张表单态，外加脏基线、跟随键、人话报错与三通电话。
 *
 * 本件**不认识 React**，也不认识宿主：喂一份配置面回执与一张行表，它把「页面上每一行该显示什么」
 * 算出来（取值），再把「表单态里哪几格真能改」还原成一份取值（填值）。因此它在 Node 里就能直测。
 *
 * 三条口径（照 #749 起的定稿）：
 *   · **只读行显示技能算好的绝对值**（回执 `resolved` 组那一格）：面板一个字都不算；回执缺那一格
 *     （旧技能）就显示空串，绝不编一条路径出来。
 *   · **可改行取值空着**时，直接把回执里那个落点绝对路径显示上去——用户不必自己拼路径。
 *   · **保存只提交真能改的行**：只读行显示的是绝对路径，把它当配置值写回去就是把「显示」当「配置」。
 *
 * 对外只经 `config-panel-api.ts` 那一道门；本件自己不出门。
 */

import {
  RPC_ENDPOINT_CONFIG_GET,
  RPC_ENDPOINT_CONFIG_RESET,
  RPC_ENDPOINT_CONFIG_SAVE,
  READ_TIMEOUT_MS,
  isRpcResult,
} from './config-panel-contract.js';
import type { ConfigItem, ConfigSurfaceReply } from './config-panel-contract.js';
import type { RootsCall } from './directory-browser-roots.js';

/** 取数口取用器：每次取数时现取（连接后到也不永久缺席）。 */
export type GetCall = () => unknown;

/** 取值要的那几格：配置取值本身，加上「落点来源」两处（回执顶层那一个与 `resolved` 组那一格）。 */
export interface DraftSource {
  readonly values: Record<string, unknown>;
  /** 回执顶层那个落点绝对路径（各家回执用 `dataDir` 这个名字）。 */
  readonly dataDir?: string;
  /** 回执 `resolved` 组：技能算好的一组绝对路径，按格名取。 */
  readonly resolved?: Readonly<Record<string, string | undefined>>;
}

/** 按 `a.b` 路径从配置取值里读（缺层或类型不符一律回 undefined）。 */
export function readPath(values: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let cur: unknown = values;
  for (const part of parts) {
    if (typeof cur !== 'object' || cur === null || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** 按 `a.b` 路径把值写进配置取值（中间层缺就建一层空组；已存在非组即覆盖成组）。 */
export function writePath(values: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.');
  let cur: Record<string, unknown> = values;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = cur[part];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) cur[part] = {};
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

/** 落点来源取一格：先看回执 `resolved` 组同名格，再看回执顶层同名格（两种写法收成同一格）。
 *
 * 顶层那一格为什么只认 `dataDir`：它是**技能算出来的生效数据目录**这个概念的格名，各家的回执
 * 都叫它 `dataDir`；其余落点（照片目录、附件目录等）一律住在 `resolved` 组里。本件不猜别的名字。 */
function prefillValueOf(source: DraftSource, name: string): string | undefined {
  const fromResolved = source.resolved?.[name];
  if (typeof fromResolved === 'string' && fromResolved !== '') return fromResolved;
  if (name === 'dataDir' && typeof source.dataDir === 'string' && source.dataDir !== '') return source.dataDir;
  return undefined;
}

/** 只读行显示什么：标了 `resolveFrom` ⇒ 回执 `resolved` 组那一格（技能算好的绝对路径）；
 *  没标 ⇒ 配置文件里那个值本身（数字类只读项走这一档：显示的是生效数字）。 */
function readonlyTextOf(item: ConfigItem, raw: string, source: DraftSource): string {
  if (item.resolveFrom === undefined) return raw;
  const shown = source.resolved?.[item.resolveFrom];
  return typeof shown === 'string' ? shown : '';
}

/** 把配置取值铺成「行键 → 控件里的文本」（页面表单态；值缺项即空串，不返空留白）。 */
export function toDraft(
  items: readonly ConfigItem[],
  values: Record<string, unknown>,
  source: DraftSource,
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const item of items) {
    const v = readPath(values, item.key);
    const raw = v === undefined || v === null ? '' : String(v);
    if (item.readonly === true) {
      draft[item.key] = readonlyTextOf(item, raw, source);
      continue;
    }
    const fallback = item.prefillFrom === undefined ? undefined : prefillValueOf(source, item.prefillFrom);
    draft[item.key] = raw === '' && fallback !== undefined ? fallback : raw;
  }
  return draft;
}

/** 表单态 → 配置取值（按控件种类还原类型；空串对文本项照收，语义由「按默认落点」承担）。
 *
 *  **只读行不收**：它们显示的是技能算好的绝对路径，写回配置就是把「显示的路径」当成「配置值」——
 *  保存只提交真能改的那些行，其余键由技能侧做组内合并保留现值。 */
export function fromDraft(items: readonly ConfigItem[], draft: Readonly<Record<string, string>>): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const item of items) {
    if (item.readonly === true) continue;
    const raw = draft[item.key] ?? '';
    if (item.control === 'number') {
      const n = Number(raw);
      writePath(values, item.key, Number.isFinite(n) ? n : 0);
    } else if (item.control === 'switch') {
      writePath(values, item.key, raw === 'true');
    } else {
      writePath(values, item.key, raw);
    }
  }
  return values;
}

/** 可改行（脏基线只看这一档）。 */
export function editableItemsOf(items: readonly ConfigItem[]): readonly ConfigItem[] {
  return items.filter((item) => item.readonly !== true);
}

/** 常用项与高级项按行表自己的分级切开（不再另要一个「常用几行」的数：那是同一件事的第二处定义）。 */
export function tiersOf(items: readonly ConfigItem[]): {
  readonly common: readonly ConfigItem[];
  readonly advanced: readonly ConfigItem[];
} {
  return {
    common: items.filter((item) => item.tier === 'common'),
    advanced: items.filter((item) => item.tier === 'advanced'),
  };
}

/** 脏键：表单态里与「刚读到的整面」不一致的**可改行**。
 *
 *  只读行不进来：它们显示的是技能算好的绝对路径，拿它当「改动」会让面板一打开就显示「未保存」。 */
export function dirtyKeysOf(
  items: readonly ConfigItem[],
  draft: Readonly<Record<string, string>>,
  baseline: Readonly<Record<string, string>>,
): readonly string[] {
  return editableItemsOf(items)
    .filter((item) => (draft[item.key] ?? '') !== (baseline[item.key] ?? ''))
    .map((item) => item.key);
}

/** 跟随映射的缺省：没有映射就是「一行都不跟随」。 */
export function noFollowKeys(): readonly string[] {
  return [];
}

/** 「值非法回落」那一条要的两个事实（不为空就说明这一行写的值与生效值不是一个）。
 *
 * 本件只能看见**两个事实**：配置里写的是什么、技能算出来的生效值是什么。所以这里只报事实，
 * **不下「用不了」的判断**——写的是相对路径、尾分隔符写法不同、大小写不同，都会让两个字符串不等，
 * 而那几种情形下配置其实是生效的。判断留给技能侧（它的回执里有且只有一个生效值）。 */
export interface FallbackFacts {
  readonly written: string;
  readonly effective: string;
}

/** 这一行有没有「写的值 ≠ 生效值」这回事：只要是可改行、标了落点来源、写的非空、
 *  且技能算出来的生效值另有其值（去掉尾分隔符后仍不同），就报这两个事实。 */
export function fallbackFactsOf(item: ConfigItem, raw: string, source: DraftSource): FallbackFacts | null {
  if (item.readonly === true || item.prefillFrom === undefined) return null;
  const written = raw.trim();
  if (written === '') return null;
  const effective = prefillValueOf(source, item.prefillFrom);
  if (effective === undefined) return null;
  const strip = (path: string): string => path.replace(/[\\/]+$/, '');
  if (strip(written) === strip(effective)) return null;
  return { written, effective };
}

/** 配置面报错 → 人话指引。
 *
 *  报文由技能侧给出（`base-link-core` 的 `ConfigError` 已带行号与文件名，技能 `cli/config.ts`
 *  原样交出，插件 bridge 原样带上），所以这里**不重写报文**，只按报错类补一句「接下来怎么办」。 */
export function humanizeConfigFailure(code: string, message: string): string {
  const text = message.trim().length > 0 ? message.trim() : `（${code}，宿主未给报文）`;
  if (/解析|YAML|parse/i.test(text)) return `${text}\n改回「键: 值」的写法，或点「重置为默认」。`;
  if (/不认识|未知键|UNKNOWN_KEY/i.test(text)) return `${text}\n删掉页面上没有的行，或点「重置为默认」。`;
  if (/类型|TYPE_MISMATCH/i.test(text)) return `${text}\n按本页的控件形状填，或点「重置为默认」。`;
  if (/缺席|missing-cli/i.test(text)) return `${text}\n技能出口没找到：先确认技能包已装好，再点「重新读取」。`;
  return `${text}\n改不动就点「重置为默认」，或照上面那条路径手工改配置文件。`;
}

/** 一次配置电话的结果（收整面／落字；永不抛）。 */
export type ConfigOutcome =
  | { readonly ok: true; readonly surface: ConfigSurfaceReply }
  | { readonly ok: false; readonly message: string };

/** 有界等待：借平台 `AbortSignal.timeout` 的 abort 事件做**一次**超时拒绝。
 *
 * 为什么不自建定时器：本仓冻结边界是「无数据轮询」，而设置页等的是一次电话回执，不是轮询；
 * 用平台自带的一次性超时既守住边界的本意，也把「不转圈」落到实处。同一个 signal 也交给传输，
 * 双保险：它搭理 signal 就早收工，不理也有这一道兜底（桌面端自研传输会忽略 signal，见 #760）。 */
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  const signal = AbortSignal.timeout(ms);
  const limit = new Promise<never>((_, reject) => {
    signal.addEventListener(
      'abort',
      () => {
        const e = new Error(`配置请求超时（${Math.round(ms / 1000)}s）：宿主未回`);
        e.name = 'TimeoutError';
        reject(e);
      },
      { once: true },
    );
  });
  return Promise.race([promise, limit]);
}

/** 一次配置电话（走调用方给的那条通道，靠端点名分发；永不抛，失败落字）。 */
async function configRpc(
  call: unknown,
  channel: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<ConfigOutcome> {
  if (typeof call !== 'function') return { ok: false, message: '宿主连接缺席：connection.rpc.call 不可用' };
  try {
    const raw: unknown = await withDeadline(
      (call as RootsCall)('/api', channel.replace(/^\//, ''), { method, payload }, AbortSignal.timeout(READ_TIMEOUT_MS)),
      READ_TIMEOUT_MS,
    );
    if (!isRpcResult(raw)) return { ok: false, message: '回执信封异常（非 ok 信封）' };
    if (!raw.ok) {
      return { ok: false, message: humanizeConfigFailure(raw.error?.code ?? 'unknown', raw.error?.message ?? '') };
    }
    return { ok: true, surface: raw.value as ConfigSurfaceReply };
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      return { ok: false, message: `配置请求超时（${Math.round(READ_TIMEOUT_MS / 1000)}s）：宿主未回` };
    }
    return { ok: false, message: `配置失败：${e instanceof Error ? e.message : String(e)}` };
  }
}

/** 读设置页整面。 */
export function fetchConfigSurface(call: unknown, channel: string): Promise<ConfigOutcome> {
  return configRpc(call, channel, RPC_ENDPOINT_CONFIG_GET, {});
}

/** 保存一份取值（回执只有 `{path, values}`，**不是**整面：写完要重新读一份整面）。 */
export function saveConfigSurface(
  call: unknown,
  channel: string,
  values: Record<string, unknown>,
): Promise<ConfigOutcome> {
  return configRpc(call, channel, RPC_ENDPOINT_CONFIG_SAVE, { values });
}

/** 重置为默认（技能侧先落一份备份；回执同样不是整面，写完要重新读一份整面）。 */
export function resetConfigSurface(call: unknown, channel: string): Promise<ConfigOutcome> {
  return configRpc(call, channel, RPC_ENDPOINT_CONFIG_RESET, {});
}
