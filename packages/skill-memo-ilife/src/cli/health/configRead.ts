/** 配置体检 · **只读配置解析**（票 #706 判据，票 #855 从这里分件出来）。
 *
 * 与 `loadConfig()` 的差别只有一处、也正是体检要的那一处：**文件不在时不落默认件**；
 * 取值语义与它一致（文件里缺的项按默认值补）。受限子集与 `base-link-core` 同一套校验，口径逐条对齐：
 * 剥 BOM、去 `\r`、空行与整行注释跳过、缩进只许 2 个空格且不许制表符、不支持列表、
 * 一行须是「键: 值」、不许重复定义、顶层键冒号后没值即开一个组。
 *
 * 谁在用：`src/cli/health/items.ts`（九条体检项）——本件不做判定、不下结论，只把文件读成取值。
 */
import { existsSync, readFileSync } from 'node:fs';
import { configPaths } from 'base-link-core';
import { MEMO_CONFIG_DEFAULTS, MEMO_CONFIG_STEM } from '../../config.js';

/** 只读解析结果：文件不在／读得出取值与「哪些键真在文件里」／读不出来（报文带行号与文件名）。 */
export type ConfigRead =
  | { readonly kind: 'missing' }
  | { readonly kind: 'ok'; readonly values: Record<string, Record<string, unknown>>; readonly present: ReadonlySet<string> }
  | { readonly kind: 'bad'; readonly message: string };

/** 只读解析那份配置文件（文件不在时不落默认件，其余口径与配置件同）。 */
export function readMemoConfigReadOnly(): ConfigRead {
  const file = configPaths(MEMO_CONFIG_STEM).configFile;
  if (!existsSync(file)) return { kind: 'missing' };
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (e) {
    return { kind: 'bad', message: '读配置文件失败：' + file + '（' + (e instanceof Error ? e.message : String(e)) + '）' };
  }
  const parsed = parseSubset(text, file);
  if (!parsed.ok) return { kind: 'bad', message: parsed.message };
  return { kind: 'ok', values: projectOnDefaults(parsed.values), present: presentKeysOf(parsed.values) };
}

/** 文件里真写了哪些键（扁平成 `组.键`）：给「这个值从哪来」那条判据用。
 *
 * 为什么不能直接看投到默认值表之后的值：**空串＝按默认落点**——留空的项值看起来与默认值一样，
 * 但它的来源是「用户写了空串」，不是「文件里没有这一项」。混起来就会把来源报错。 */
function presentKeysOf(values: Record<string, unknown>): ReadonlySet<string> {
  const out = new Set<string>();
  for (const [group, got] of Object.entries(values)) {
    if (typeof got !== 'object' || got === null) {
      out.add(group);
      continue;
    }
    for (const key of Object.keys(got as Record<string, unknown>)) out.add(group + '.' + key);
  }
  return out;
}

/** 受限子集的极简解析：只算值与行号，不算别的（校验口径与配置件同一套）。 */
function parseSubset(text: string, file: string):
  | { readonly ok: true; readonly values: Record<string, unknown> }
  | { readonly ok: false; readonly message: string } {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const values: Record<string, unknown> = {};
  const lineOf = new Map<string, number>();
  let openGroup: string | null = null;
  let openGroupLine = 0;
  /** 标量解析的失败口：`parseScalar` 把报文写进 `scalarError`，调用处读它即可（不抛，免得类型糊）。 */
  let scalarError = '';
  const fail = (line: number, why: string) => ({ ok: false as const, message: '配置件第 ' + String(line) + ' 行：' + why + '（文件：' + file + '）' });
  const closeGroup = (): string | null => {
    if (openGroup !== null && Object.keys(values[openGroup] as Record<string, unknown>).length === 0) {
      return fail(openGroupLine, '键「' + openGroup + '」冒号后没有值，也没有子项').message;
    }
    openGroup = null;
    return null;
  };
  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const raw = lines[i] ?? '';
    if (raw.trim() === '') continue;
    if (/^\s*#/.test(raw)) continue;
    const head = /^[ \t]*/.exec(raw)?.[0] ?? '';
    const body = raw.slice(head.length);
    if (head.includes('\t')) return fail(lineNo, '缩进里有制表符：本子集只许空格，且嵌套缩进恰好 2 个空格');
    if (body.startsWith('-')) return fail(lineNo, '本子集不支持列表（「-」开头的行）');
    const matched = /^([A-Za-z_][A-Za-z0-9_.-]*)[ \t]*:[ \t]*(.*)$/.exec(body);
    if (matched === null) return fail(lineNo, '不是「键: 值」形状：' + body.trim());
    const key = matched[1] as string;
    const rest = (matched[2] ?? '').trim();
    if (head.length > 0) {
      if (head.length !== 2) return fail(lineNo, '缩进必须恰好 2 个空格（本子集只支持一层嵌套），实为 ' + String(head.length) + ' 个空格');
      if (openGroup === null) return fail(lineNo, '缩进的子项「' + key + '」上面没有开着子的顶层键');
      const group = values[openGroup] as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(group, key)) {
        return fail(lineNo, '键「' + openGroup + '.' + key + '」重复定义（第 ' + String(lineOf.get(openGroup + '.' + key)) + ' 行已定义）');
      }
      if (rest === '') return fail(lineNo, '键「' + openGroup + '.' + key + '」冒号后没有值');
      const scalar = parseScalar(rest, lineNo, fail, (message) => {
        scalarError = message;
      });
      if (scalarError !== '') return { ok: false, message: scalarError };
      group[key] = scalar;
      lineOf.set(openGroup + '.' + key, lineNo);
      continue;
    }
    const closedError = closeGroup();
    if (closedError !== null) return { ok: false, message: closedError };
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return fail(lineNo, '键「' + key + '」重复定义（第 ' + String(lineOf.get(key)) + ' 行已定义）');
    }
    lineOf.set(key, lineNo);
    if (rest === '') {
      values[key] = {};
      openGroup = key;
      openGroupLine = lineNo;
      continue;
    }
    const scalar = parseScalar(rest, lineNo, fail, (message) => {
      scalarError = message;
    });
    if (scalarError !== '') return { ok: false, message: scalarError };
    values[key] = scalar;
  }
  const tailError = closeGroup();
  if (tailError !== null) return { ok: false, message: tailError };
  return { ok: true, values };
}

/** 标量：带引号／数字／布尔／裸字符串（值后的 `#` 注释照配置件同一口径切掉）。 */
function parseScalar(
  text: string,
  lineNo: number,
  fail: (line: number, why: string) => { readonly ok: false; readonly message: string },
  onError: (message: string) => void,
): string | number | boolean {
  const first = text[0];
  if (first === '"' || first === "'") {
    const quote = first;
    let out = '';
    let i = 1;
    let closed = false;
    for (; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === quote) {
        if (quote === "'" && text[i + 1] === "'") {
          out += "'";
          i += 1;
          continue;
        }
        closed = true;
        break;
      }
      if (quote === '"' && ch === '\\') {
        const next = text[i + 1];
        out += next === 'n' ? '\n' : next === 't' ? '\t' : (next ?? '');
        i += 1;
        continue;
      }
      out += ch;
    }
    if (!closed) {
      onError(fail(lineNo, '引号没有闭合：' + text).message);
      return '';
    }
    return out;
  }
  let cut = text.length;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '#' && (i === 0 || /\s/.test(text[i - 1] as string))) {
      cut = i;
      break;
    }
  }
  const body = text.slice(0, cut).trim();
  if (body === '') {
    onError(fail(lineNo, '冒号后没有值（只有注释）').message);
    return '';
  }
  if (body === 'true') return true;
  if (body === 'false') return false;
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(body)) return Number(body);
  return body;
}

/** 把文件里读到的取值投到默认值表的形状上（缺项补默认值；组内只取默认值表认得的键）。 */
export function projectOnDefaults(values: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [group, def] of Object.entries(MEMO_CONFIG_DEFAULTS)) {
    const bucket: Record<string, unknown> = {};
    const got = values[group];
    const source = typeof got === 'object' && got !== null ? (got as Record<string, unknown>) : {};
    for (const [key, defValue] of Object.entries(def as Record<string, unknown>)) {
      const mine = source[key];
      bucket[key] = typeof mine === typeof defValue ? mine : defValue;
    }
    out[group] = bucket;
  }
  return out;
}

/** 取值：一层嵌套按 `组.键` 读（缺层或类型不符回 undefined）。 */
export function readValue(values: Record<string, Record<string, unknown>>, group: string, key: string): unknown {
  return values[group]?.[key];
}

/** 有值的字符串（空串＝未配，按 `undefined` 处理，语义与各取用处一致）。 */
export function textOf(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : '';
}

/** 「这个值从哪来」：真在文件里写了就是「配置文件」，否则按默认值（文件不存在则全按默认值）。 */
export function sourceOf(present: ReadonlySet<string>, key: string): string {
  return present.has(key) ? '配置文件' : '默认值';
}
