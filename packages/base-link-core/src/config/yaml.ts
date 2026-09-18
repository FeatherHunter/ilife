// config/yaml：手写受限子集解析器 ＋ 生成器（照 `packages/base-combos/scripts/build-help.mjs:56-63` 读
// combos.yaml 的先例：全仓零 YAML 依赖，只认我们自己写出去的那个子集）。
// 支持范围与不支持清单写在包 README 的同名一节里，冻结在此；解析失败给人话报错 ＋ 行号。
import { ConfigError } from '../errors.js';

/** 子集里的标量：字符串／数字／布尔。 */
export type ConfigValue = string | number | boolean;

/** 一层嵌套：组里的值只能是标量（再深一层即拒绝）。 */
export interface ConfigGroup {
  [key: string]: ConfigValue;
}

/** 一份配置：键 → 标量，或键 → 组。 */
export interface ConfigRecord {
  [key: string]: ConfigValue | ConfigGroup;
}

/** 解析结果：取值 ＋ 每个键的行号（`db`／`db.dir` 两种键形都记），行号用于人话报错。 */
export interface ParsedConfig {
  readonly values: ConfigRecord;
  readonly lineOf: ReadonlyMap<string, number>;
}

const KEY_RE = /^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$/;
const NUMBER_RE = /^-?\d+(?:\.\d+)?$/;
/** 裸值（不加引号）：不以空白／#／:／引号开头，且不含空白与这些字符。 */
const PLAIN_RE = /^[A-Za-z0-9_\u4e00-\u9fff][^#:'"\s]*$/;

/** 是不是「组」（一层嵌套的对象）。数组／null 都不算。 */
export function isConfigGroup(value: unknown): value is ConfigGroup {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return '数组';
  return typeof value === 'object' ? '对象' : typeof value;
}

/**
 * 取值必须落在子集里（默认值与待落盘的取值都过这一关）：键 → 标量，或键 → 一层组。
 * 组不许为空（`key:` 底下没子项写出去就解析不回来），不许再深一层。
 */
export function assertConfigRecord(value: unknown, label: string): asserts value is ConfigRecord {
  if (!isConfigGroup(value)) {
    throw new ConfigError('CONFIG_SHAPE_INVALID', label + '必须是一个键值记录（对象），实为 ' + describeType(value));
  }
  for (const [key, entry] of Object.entries(value)) {
    if (isConfigGroup(entry)) {
      if (Object.keys(entry).length === 0) {
        throw new ConfigError('CONFIG_SHAPE_INVALID', label + '的组「' + key + '」没有任何子项：子集里空组写出去解析不回来');
      }
      for (const [child, inner] of Object.entries(entry)) {
        if (typeof inner !== 'string' && typeof inner !== 'number' && typeof inner !== 'boolean') {
          throw new ConfigError('CONFIG_SHAPE_INVALID',
            label + '的「' + key + '.' + child + '」只能是字符串／数字／布尔（本子集只支持一层嵌套），实为 ' + describeType(inner));
        }
      }
      continue;
    }
    if (typeof entry !== 'string' && typeof entry !== 'number' && typeof entry !== 'boolean') {
      throw new ConfigError('CONFIG_SHAPE_INVALID',
        label + '的「' + key + '」只能是字符串／数字／布尔，实为 ' + describeType(entry));
    }
  }
}

/**
 * 解析受限子集。`file` 只进报错文案。
 *
 * 失败一律抛 `ConfigError`（code `CONFIG_PARSE_FAILED`，带 `line`），绝不返回半份取值冒充正常。
 */
export function parseConfigYaml(text: unknown, file = '<内存>'): ParsedConfig {
  if (typeof text !== 'string') {
    throw new ConfigError('CONFIG_PARSE_FAILED', '配置内容须为字符串，实为 ' + describeType(text) + '（文件：' + file + '）');
  }
  const fail = (line: number, why: string): ConfigError =>
    new ConfigError('CONFIG_PARSE_FAILED', '配置件第 ' + line + ' 行：' + why + '（文件：' + file + '）', { line });

  const values: ConfigRecord = {};
  const lineOf = new Map<string, number>();
  let openGroup: string | null = null;
  let openGroupLine = 0;

  const closeGroup = (): void => {
    if (openGroup !== null && Object.keys(values[openGroup] as ConfigGroup).length === 0) {
      throw fail(openGroupLine, '键「' + openGroup + '」冒号后没有值，也没有子项');
    }
    openGroup = null;
  };

  // 编辑器可能给文件开头加 BOM：先剥掉，否则第一行会报「不是「键: 值」形状」。
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const raw = lines[i];
    if (raw.trim() === '') continue;
    if (/^\s*#/.test(raw)) continue; // 整行注释
    const indentMatch = /^[ \t]*/.exec(raw);
    const indent = indentMatch === null ? 0 : indentMatch[0].length;
    const head = indentMatch === null ? '' : indentMatch[0];
    const body = raw.slice(indent);
    if (head.includes('\t')) throw fail(lineNo, '缩进里有制表符：本子集只许空格，且嵌套缩进恰好 2 个空格');
    if (body.startsWith('-')) throw fail(lineNo, '本子集不支持列表（「-」开头的行）');
    const matched = KEY_RE.exec(body);
    if (matched === null) throw fail(lineNo, '不是「键: 值」形状：' + body.trim());
    const key = matched[1];
    const rest = matched[2].trim();

    if (indent > 0) {
      if (indent !== 2) throw fail(lineNo, '缩进必须恰好 2 个空格（本子集只支持一层嵌套），实为 ' + indent + ' 个空格');
      if (openGroup === null) throw fail(lineNo, '缩进的子项「' + key + '」上面没有开着子的顶层键');
      const group = values[openGroup] as ConfigGroup;
      if (Object.prototype.hasOwnProperty.call(group, key)) {
        throw fail(lineNo, '键「' + openGroup + '.' + key + '」重复定义（第 ' + String(lineOf.get(openGroup + '.' + key)) + ' 行已定义）');
      }
      if (rest === '') throw fail(lineNo, '键「' + openGroup + '.' + key + '」冒号后没有值');
      group[key] = parseScalar(rest, lineNo, fail);
      lineOf.set(openGroup + '.' + key, lineNo);
      continue;
    }

    closeGroup();
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      throw fail(lineNo, '键「' + key + '」重复定义（第 ' + String(lineOf.get(key)) + ' 行已定义）');
    }
    lineOf.set(key, lineNo);
    if (rest === '') {
      values[key] = {};
      openGroup = key;
      openGroupLine = lineNo;
      continue;
    }
    values[key] = parseScalar(rest, lineNo, fail);
  }
  closeGroup();
  return { values, lineOf };
}

/** 标量：带引号／数字／布尔／裸字符串。 */
function parseScalar(text: string, lineNo: number, fail: (line: number, why: string) => ConfigError): ConfigValue {
  const first = text[0];
  if (first === '"' || first === "'") return parseQuoted(text, lineNo, fail);
  let cut = text.length;
  for (let i = 0; i < text.length; i += 1) {
    // 值后的注释：`#` 前面是空白（或它就在收尾处的行首）才开始注释——值里要写 `#` 就加引号。
    if (text[i] === '#' && (i === 0 || /\s/.test(text[i - 1]))) { cut = i; break; }
  }
  const body = text.slice(0, cut).trim();
  if (body === '') throw fail(lineNo, '冒号后没有值（只有注释）');
  if (body === 'true') return true;
  if (body === 'false') return false;
  if (NUMBER_RE.test(body)) return Number(body);
  return body;
}

/** 单双引号字符串：双引号认 `\n`／`\t`／`\"`／`\\`，单引号内 `''` 表示一个单引号。 */
function parseQuoted(text: string, lineNo: number, fail: (line: number, why: string) => ConfigError): string {
  const quote = text[0];
  let out = '';
  let i = 1;
  let closed = false;
  while (i < text.length) {
    const ch = text[i];
    if (quote === '"' && ch === '\\') {
      const next = text[i + 1];
      if (next === undefined) break;
      if (next === 'n') out += '\n';
      else if (next === 't') out += '\t';
      else if (next === '"') out += '"';
      else if (next === '\\') out += '\\';
      else out += next; // 认不得的转义：原样留那个字符，不吞
      i += 2;
      continue;
    }
    if (ch === quote) {
      if (quote === "'" && text[i + 1] === "'") { out += "'"; i += 2; continue; }
      closed = true;
      i += 1;
      break;
    }
    out += ch;
    i += 1;
  }
  if (!closed) throw fail(lineNo, '引号没有闭合');
  const tail = text.slice(i).trim();
  if (tail !== '' && !tail.startsWith('#')) throw fail(lineNo, '引号闭合后还有多余内容：' + tail);
  return out;
}

/** 一个标量怎么写出去：数字与布尔裸写，字符串只在必要时加双引号。 */
function formatScalar(value: ConfigValue, where: string): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ConfigError('CONFIG_SHAPE_INVALID', '「' + where + '」不是有限数字，写不出去：' + String(value));
    }
    const text = String(value);
    if (!NUMBER_RE.test(text)) {
      throw new ConfigError('CONFIG_SHAPE_INVALID', '「' + where + '」写不成子集里的十进制数字：' + text);
    }
    return text;
  }
  if (value === '' || NUMBER_RE.test(value) || value === 'true' || value === 'false' || !PLAIN_RE.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

/** 一份配置怎么写出去：调用的键序即落盘的键序（常用项在前由调用方排），一行一键。 */
export function formatConfigYaml(values: ConfigRecord): string {
  assertConfigRecord(values, '配置取值');
  const out: string[] = [];
  for (const [key, entry] of Object.entries(values)) {
    if (isConfigGroup(entry)) {
      out.push(key + ':');
      for (const [child, inner] of Object.entries(entry)) out.push('  ' + child + ': ' + formatScalar(inner, key + '.' + child));
      continue;
    }
    out.push(key + ': ' + formatScalar(entry, key));
  }
  return out.length === 0 ? '' : out.join('\n') + '\n';
}
