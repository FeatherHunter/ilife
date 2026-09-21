/** 训记官方动作库：读取与动作名校验（老家 `xunji_bridge/catalog.py` 同契约，代码新写；#606 自
 *  `fetch/xunji-catalog.ts` 搬进本模块）。
 *
 * 库文件形状：`{ "actions": ["动作名", …], "source"?, "fetched_at"?, "count"? }`
 * ——**缺后三个键也读得通**（老形状；#595 证据件 §五：预置件是格式超集）。
 * 读不出来（文件不在／解析失败／`actions` 不是数组）＝「库缺失」，**不是「库是空的」**：
 * 调用方按「无法验证」报（`valid: null`），不许当成「动作不合法」（老 `catalog.py:44-89` 同口径）。
 *
 * 库路径（#606 票内定的口径，见证据件 §三；#676 起默认档改成读配置；#757 起老机器路径退场）：
 *  **默认**＝配置里的 `xunji.catalog`；空串时回落到包内预置快照 `src/xunji/data/训记官方动作.json`
 *     （`XUNJI_CATALOG.preset`）——同一句动作名在任何一台机器上算出同一个结果；
 *  **显式覆盖**＝调用方把一条路径传进来（子命令读法 `verify --catalog <路径>`）。
 *  **模块不隐式读机器路径**。
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { loadCalorieConfig } from '../config.js';

/** 包根：本模块往上两级（源码态 `src/xunji` 与构建态 `dist/xunji` 都成立，与渲染层模板装载器同法）。 */
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** 库路径的**唯一定义地**（#757 起只剩包内预置快照这一档；老机器路径已退场）。 */
export const XUNJI_CATALOG = {
  /** 默认：包内预置快照（模块自己的数据件）。`tsc` **不复制资源**（`tooling/check-publish.mjs:10`
   *  「只靠 files 随包发」），故按**源布局**定位；安装态读不读得到由发件清单决定（#601 那一票）。 */
  preset: join(PACKAGE_ROOT, 'src', 'xunji', 'data', '训记官方动作.json'),
} as const;

/** 库来源的缺省落点：配置里 `xunji.catalog` 非空即用它，空串＝包内预置快照（#676 起配置是唯一真相）。 */
export function defaultCatalogPath(): string {
  const configured = loadCalorieConfig().values.xunji.catalog;
  return configured !== '' ? configured : XUNJI_CATALOG.preset;
}

/** 一次读库的读数：`loaded=false` 时 `reason` 一定写清「读哪一份、为什么没读到」。 */
export interface CatalogRead {
  path: string;
  /** true＝读到了一份**有名**的库；false＝读不到（缺失／解析失败／形状不对／空库） */
  loaded: boolean;
  /** 库内动作名（按文件顺序；没读到时为空表） */
  names: readonly string[];
  /** `loaded=false` 时的人话原因（带路径）；读到时为 null */
  reason: string | null;
}

/** 单条动作名的校验读数（老 `verify()` 的四键 ＋ 候选一族）。 */
export interface MovementVerdict {
  name: string;
  /** true＝在库／false＝不在库／null＝库缺失或空，**无法验证**（不是「不合法」） */
  valid: boolean | null;
  catalog_loaded: boolean;
  /** 老口径：不在库时给**一个**候选名（老 `verify()` 的 `suggestion`） */
  suggestion: string | null;
  /** 候选一族（老计划级审计用的那份，最多 5 个） */
  suggestions: readonly string[];
}

/** 批量校验读数（老 `verify_many()` 的五键为超集，另加库口径三键）。 */
export interface MovementVerifyReport {
  catalog_loaded: boolean;
  catalog_path: string;
  /** 库没读到／是空库时的人话原因，读到时为 null */
  catalog_error: string | null;
  total: number;
  valid_count: number;
  invalid_count: number;
  unverifiable_count: number;
  results: readonly MovementVerdict[];
}

/** 校验入参：给了 `catalog` 就用它；否则读 `catalogPath`（缺省＝包内预置快照）。 */
export interface VerifyOptions {
  catalogPath?: string;
  catalog?: ReadonlySet<string>;
}

/** 库来源：既给判定用的集合，也给候选算子的**名序**（老实现按库内顺序扫）。 */
interface CatalogSource {
  loaded: boolean;
  path: string;
  error: string | null;
  names: string[];
  set: Set<string>;
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 读一份库文件（缺省＝配置里的 `xunji.catalog`，空＝包内预置快照）。缺文件／解析失败／形状不对一律**不抛错**，读成 `loaded=false`。 */
export function readMovementCatalog(path: string = defaultCatalogPath()): CatalogRead {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    return { path, loaded: false, names: [], reason: '动作库读不到（' + path + '）：' + errorText(e) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { path, loaded: false, names: [], reason: '动作库解析不出（' + path + '）：' + errorText(e) };
  }
  const actions = (parsed as { actions?: unknown } | null | undefined)?.actions;
  if (!Array.isArray(actions)) {
    return { path, loaded: false, names: [], reason: '动作库形状不对（' + path + '）：缺 actions 名数组' };
  }
  // 只收非空字符串：老 `loadCatalog()` 对任意项做 `String()` 强转，会把数字／对象也变成「合法动作名」
  // （#606 有意偏离，见证据件 §四）——官方库 1092 条全是字符串，故这一档只影响坏输入。
  const names = actions.filter((a): a is string => typeof a === 'string' && a.trim() !== '');
  if (names.length === 0) {
    return { path, loaded: false, names: [], reason: '动作库是空的（' + path + '）：0 个动作名' };
  }
  return { path, loaded: true, names, reason: null };
}

function sourceOf(opts: VerifyOptions): CatalogSource {
  const given = opts.catalog;
  if (given !== undefined) {
    const names = [...given];
    return {
      loaded: names.length > 0,
      path: '调用方传入的动作名集合',
      error: names.length > 0 ? null : '动作库缺失：调用方传了个空集合，无法验证',
      names,
      set: new Set(names),
    };
  }
  const path = opts.catalogPath ?? defaultCatalogPath();
  const read = readMovementCatalog(path);
  return { loaded: read.loaded, path, error: read.reason, names: [...read.names], set: new Set(read.names) };
}

/** 相似候选（老实现同法：命中含 2 字及以上子串的动作名，排序后截断）。 */
export function suggestSimilar(name: string, names: Iterable<string>, maxN = 5): string[] {
  const keys = new Set<string>();
  for (const tok of name.replace(/-/g, ' ').split(/\s+/)) {
    if (tok.length >= 2) keys.add(tok);
  }
  if (name.trim().length >= 2) keys.add(name.trim());
  const out: string[] = [];
  for (const c of names) {
    for (const k of keys) {
      if (c.includes(k)) {
        out.push(c);
        break;
      }
    }
  }
  return out.sort().slice(0, maxN);
}

function verdictOf(name: string, src: CatalogSource): MovementVerdict {
  const clean = (name ?? '').trim();
  if (clean === '') {
    return { name: clean, valid: false, catalog_loaded: src.loaded, suggestion: '动作名为空', suggestions: [] };
  }
  if (!src.loaded) {
    return { name: clean, valid: null, catalog_loaded: false, suggestion: src.error, suggestions: [] };
  }
  if (src.set.has(clean)) {
    return { name: clean, valid: true, catalog_loaded: true, suggestion: null, suggestions: [] };
  }
  const suggestions = suggestSimilar(clean, src.names, 5);
  return { name: clean, valid: false, catalog_loaded: true, suggestion: suggestions[0] ?? null, suggestions };
}

/** 校验一批动作名（老 `verify_many()` 同口径＋库缺失时的明确读数）。 */
export function verifyMovements(names: readonly string[], opts: VerifyOptions = {}): MovementVerifyReport {
  const src = sourceOf(opts);
  const results = names.map((n) => verdictOf(n, src));
  return {
    catalog_loaded: src.loaded,
    catalog_path: src.path,
    catalog_error: src.error,
    total: results.length,
    valid_count: results.filter((r) => r.valid === true).length,
    invalid_count: results.filter((r) => r.valid === false).length,
    unverifiable_count: results.filter((r) => r.valid === null).length,
    results,
  };
}
