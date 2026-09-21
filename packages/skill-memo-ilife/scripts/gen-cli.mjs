#!/usr/bin/env node
/** 备忘录命令登记生成器（票 #855 · 机器门段一）：各域声明 → 三件生成物，配 `--check` 比对门。
 *
 * **输入（唯一的事实）**：
 *   - `src/<域>/commands.ts` 恰好导出的那一个 `<NAME>_COMMANDS` 数组（一条命令的事实）；
 *   - `src/<域>/routes.ts` 恰好导出的那一个 `<NAME>_ROUTES` 数组（一个唤醒词的事实）。
 * 扫描只认「目录里有 `commands.ts`／`routes.ts`」这一件事，**不登记域名单**——新增一个能力只碰它自己的目录。
 * （域名单随生成物一起落盘：空声明的域也在单里，缺／多一目了然。）
 *
 * **输出（三件，全是派生件，人不手改）**：
 *   ① `src/cli/keys.ts`    键表＋键的编译期约束＋标题＋形状＋来源域＋按域键表；
 *   ② `src/cli/registry.ts` 键 → 声明（从各域**门** `src/<域>/index.js` 取数组）；
 *   ③ `src/triggers/routes.generated.ts` 记录面 `WAKE_ROUTES`（按 `order` 升序，运行期路由只读它）。
 *
 * **读数口径**：读**源码文本**（同 chef／home／schedule 三家的现行做法），不依赖 `dist/` 新鲜度——
 * 故本门在编译红时照样能跑，也不会拿旧声明当事实。
 *
 * **守卫（一律在写盘之前抛，绝不产出半成品）**：声明件恰好一个数组；每行六字段在场且类型对；
 * 写命令不写 `shape`；键过 `KEY_RE`；同键两处声明即抛；路由的 `key` 必须真在键表里；
 * `order` 全表唯一；同 `wakeWord` 跨件重复即抛；有 `commands.ts` 的域必须有 `index.ts`（门要转出那个数组）。
 *
 * 用法：`pnpm gen`（写盘）／`pnpm gen:check`（只比对，不等即 exit 1 并逐件点名）。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SRC_DIR = join(PKG_DIR, 'src');
const REPO = join(PKG_DIR, '..', '..');
const CHECK = process.argv.includes('--check');
const BANNER = '本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。';
const KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/;
const WRITE_SHAPE = 'receipt';
const KINDS = ['write', 'read', 'pre-open'];

const rel = (p) => relative(REPO, p).replace(/\\/g, '/');
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

// ── 只认字面量的小解析器（对象／数组／串／数／真伪）────────────────────────────
const die = (where, why) => {
  throw new Error(where + '：' + why);
};
function skip(text, i) {
  for (;;) {
    const c = text[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') { i += 1; continue; }
    if (c === '/' && text[i + 1] === '/') { const j = text.indexOf('\n', i); i = j < 0 ? text.length : j + 1; continue; }
    if (c === '/' && text[i + 1] === '*') { const j = text.indexOf('*/', i); i = j < 0 ? text.length : j + 2; continue; }
    return i;
  }
}
function parseString(text, i, where) {
  let out = '';
  i += 1;
  for (;;) {
    const c = text[i];
    if (c === undefined) die(where, '字符串没有闭合');
    if (c === '\\') {
      const n = text[i + 1];
      out += n === 'n' ? '\n' : n === 't' ? '\t' : n === undefined ? '' : n;
      i += 2;
      continue;
    }
    if (c === "'") return { value: out, next: i + 1 };
    out += c;
    i += 1;
  }
}
/** 值：串／数（含负）／true／false／数组／嵌套对象；其余一律抛（声明必须是纯字面量）。 */
function parseValue(text, i, where) {
  i = skip(text, i);
  const c = text[i];
  if (c === "'") return parseString(text, i, where);
  if (c === '[') {
    const out = [];
    i = skip(text, i + 1);
    while (text[i] !== ']') {
      if (text[i] === undefined) die(where, '数组没有闭合');
      const got = parseValue(text, i, where);
      out.push(got.value);
      i = skip(text, got.next);
      if (text[i] === ',') i = skip(text, i + 1);
    }
    return { value: out, next: i + 1 };
  }
  if (c === '{') {
    const out = {};
    i = skip(text, i + 1);
    while (text[i] !== '}') {
      if (text[i] === undefined) die(where, '对象没有闭合');
      const km = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(text.slice(i));
      if (!km) die(where, '对象里认不出字段名：' + JSON.stringify(text.slice(i, i + 24)));
      const got = parseValue(text, skip(text, i + km[0].length) + 1, where);
      out[km[0]] = got.value;
      i = skip(text, got.next);
      if (text[i] === ',') i = skip(text, i + 1);
    }
    return { value: out, next: i + 1 };
  }
  const m = /^-?\d+(?:\.\d+)?/.exec(text.slice(i));
  if (m) return { value: Number(m[0]), next: i + m[0].length };
  if (text.startsWith('true', i)) return { value: true, next: i + 4 };
  if (text.startsWith('false', i)) return { value: false, next: i + 5 };
  die(where, '只认字面量（串／数／真伪／数组／对象），实得：' + JSON.stringify(text.slice(i, i + 24)));
}
/** 取 `export const <NAME>_<SUFFIX> … = [ … ]` 的数组体与数组名前缀（恰好一处，多一处即抛）。 */
function arrayBodyOf(text, file, suffix) {
  const hits = [...text.matchAll(new RegExp('export\\s+const\\s+([A-Z][A-Z0-9_]*)_' + suffix + '\\b[^=]*=\\s*\\[', 'g'))];
  if (hits.length !== 1) die(file, '须恰好导出一个 `<NAME>_' + suffix + '` 数组，实得 ' + hits.length + ' 个');
  const from = hits[0].index + hits[0][0].length;
  let depth = 1;
  for (let i = from; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'") { i = parseString(text, i, file).next - 1; continue; }
    if (c === '[') depth += 1;
    else if (c === ']') { depth -= 1; if (depth === 0) return { name: hits[0][1], body: text.slice(from, i) }; }
  }
  return die(file, '数组没有闭合');
}
/** 数组体 → 逐个好对象（字段顺序即源码顺序）。 */
function objectsIn(body, file) {
  const out = [];
  let i = 0;
  while (true) {
    i = skip(body, i);
    if (i >= body.length) return out;
    if (body[i] !== '{') die(file, '数组元素必须是对象字面量，实得：' + JSON.stringify(body.slice(i, i + 24)));
    const got = parseValue(body, i, file);
    out.push(got.value);
    i = skip(body, got.next);
    if (body[i] === ',') i += 1;
  }
}
const field = (obj, name, where, required) => {
  const v = obj[name];
  if (v === undefined) {
    if (required) die(where, '缺字段 ' + name);
    return undefined;
  }
  return v;
};
const strField = (obj, name, where, required) => {
  const v = field(obj, name, where, required);
  if (v !== undefined && (typeof v !== 'string' || v === '')) die(where, name + ' 须为非空字符串');
  return v;
};

// ── 读数：声明面 ──────────────────────────────────────────────────────────
function scan(suffix) {
  return readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SRC_DIR, d.name, suffix)))
    .map((d) => d.name)
    .sort();
}
function readCommands(name) {
  const file = 'src/' + name + '/commands.ts';
  const arr = arrayBodyOf(readFileSync(join(SRC_DIR, name, 'commands.ts'), 'utf8'), file, 'COMMANDS');
  if (!existsSync(join(SRC_DIR, name, 'index.ts'))) {
    die(file, '域有 commands.ts 就必须有 index.ts（门要把那个数组转出去，生成物从门取数组）');
  }
  const list = objectsIn(arr.body, file).map((o) => {
    const kind = strField(o, 'kind', file, true);
    if (!KINDS.includes(kind)) die(file, 'kind 只许 ' + KINDS.join('｜') + '，实得 ' + JSON.stringify(kind));
    const key = strField(o, 'key', file, true);
    if (!KEY_RE.test(key)) die(file, 'key 不合 ' + String(KEY_RE) + '：' + JSON.stringify(key));
    const shape = strField(o, 'shape', file, kind !== 'write');
    if (kind === 'write' && shape !== undefined) die(file, '写命令不许写 shape（一律回执形）：' + key);
    return {
      kind, key, shape, title: strField(o, 'title', file, true), wakeWord: strField(o, 'wakeWord', file, false),
      example: strField(o, 'example', file, true), from: name, exportName: arr.name + '_COMMANDS',
    };
  });
  return { name, list };
}
function readRoutes(name) {
  const file = 'src/' + name + '/routes.ts';
  const arr = arrayBodyOf(readFileSync(join(SRC_DIR, name, 'routes.ts'), 'utf8'), file, 'ROUTES');
  const list = objectsIn(arr.body, file).map((o) => {
    const order = field(o, 'order', file, true);
    if (!Number.isInteger(order) || order < 0) die(file, 'order 须为 0 基整数');
    const needs = field(o, 'needs', file, false);
    if (needs !== undefined && (!Array.isArray(needs) || needs.some((s) => typeof s !== 'string' || s === ''))) {
      die(file, 'needs 须为非空字符串数组');
    }
    const preset = field(o, 'preset', file, false);
    if (preset !== undefined && (typeof preset !== 'object' || preset === null || Array.isArray(preset))) {
      die(file, 'preset 须为对象');
    }
    return {
      order, wakeWord: strField(o, 'wakeWord', file, true), scene: strField(o, 'scene', file, true),
      key: strField(o, 'key', file, true), cli: strField(o, 'cli', file, true), needs, preset, from: name,
    };
  });
  return { name, list };
}

// ── 守卫 ＋ 合并 ─────────────────────────────────────────────────────────
function mergeCommands(caps) {
  const byKey = new Map();
  for (const cap of caps) {
    for (const spec of cap.list) {
      if (byKey.has(spec.key)) die('src/' + cap.name + '/commands.ts', '命令键重复登记：' + spec.key + '（又见于 ' + byKey.get(spec.key).from + '）');
      byKey.set(spec.key, { ...spec, shape: spec.kind === 'write' ? WRITE_SHAPE : spec.shape });
    }
  }
  const rank = (e) => KINDS.indexOf(e.kind);
  const all = [...byKey.values()];
  all.sort((a, b) => rank(a) - rank(b) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return { all, byKey };
}
function checkRoutes(all, byKey) {
  const seenOrder = new Map();
  const seenWord = new Map();
  const merged = [];
  for (const r of all) {
    const where = 'src/' + r.from + '/routes.ts · ' + JSON.stringify(r.wakeWord) + '（order=' + r.order + '）';
    if (!byKey.has(r.key)) die(where, '路由指向未知键：' + r.key);
    if (seenOrder.has(r.order)) die(where, 'order 全表唯一：' + r.order + ' 已被 ' + seenOrder.get(r.order) + ' 占');
    seenOrder.set(r.order, where);
    if (seenWord.has(r.wakeWord)) die(where, '同词两处声明：' + seenWord.get(r.wakeWord));
    seenWord.set(r.wakeWord, where);
    merged.push(r);
  }
  merged.sort((a, b) => a.order - b.order);
  for (let i = 0; i < merged.length; i += 1) {
    if (merged[i].order !== i) {
      die('routes', 'order 必须是 0..' + (merged.length - 1) + ' 连续无洞，第 ' + i + ' 位实得 ' + merged[i].order + '（' + merged[i].wakeWord + '）');
    }
  }
  for (const spec of byKey.values()) {
    if (spec.wakeWord !== undefined && !seenWord.has(spec.wakeWord)) {
      die('src/' + spec.from + '/commands.ts', '代表唤醒词不在任何路由声明里：' + spec.wakeWord + '（键 ' + spec.key + '）');
    }
  }
  return merged;
}

// ── 渲染三件生成物 ────────────────────────────────────────────────────────
function renderKeys(names, entries, domains) {
  const kinds = KINDS.map((k) => k + ' ' + entries.filter((e) => e.kind === k).length + ' 条').join('、');
  const L = ['/** ' + BANNER, ' *', ' * 备忘录命令键表：' + kinds + '，合计 ' + entries.length + ' 条。',
    ' * 一条命令的事实住它自己的能力目录（`src/<域>/commands.ts`）；本文件只是那几处的派生，不手改。',
    ' * 键序：' + KINDS.join(' → ') + '，各段内按键名升序（确定性排序，同一个声明层永远得同一份字节）。',
    ' * `MemoKey` 是键的**编译期约束**：删一条声明而不改指向它的路由声明，`tsc` 当场红（TS2820）。',
    ' */', "import type { EnvelopeShape } from 'base-link-core';", ''];
  L.push('export const MEMO_CLI_SOURCES: readonly string[] = [');
  for (const n of names) L.push('  ' + q(n) + ',');
  L.push('];', '');
  L.push('export const MEMO_CLI_KEYS: readonly string[] = [');
  for (const e of entries) L.push('  ' + q(e.key) + ',');
  L.push('];', '');
  // 空骨架态（还没有任何 commands.ts）时键联合退化为 string：让类型约束先立起来、后续声明一落即自动收窄。
  L.push(entries.length
    ? 'export type MemoKey = ' + entries.map((e) => q(e.key)).join('\n  | ') + ';'
    : 'export type MemoKey = string; // 空骨架态：还没有任何命令声明，键联合退化为 string；建起第一个 commands.ts 即自动收窄');
  L.push('', 'export const MEMO_KEY_TITLES: Record<string, string> = {');
  for (const e of entries) L.push('  ' + q(e.key) + ': ' + q(e.title) + ',');
  L.push('};', '');
  L.push('export const MEMO_KEY_SHAPES: Record<string, EnvelopeShape> = {');
  for (const e of entries) L.push('  ' + q(e.key) + ': ' + q(e.shape) + ',');
  L.push('};', '');
  L.push('export const MEMO_DOMAIN_KEYS: Record<string, readonly string[]> = {');
  for (const n of domains) {
    const ks = entries.filter((e) => e.from === n).map((e) => e.key);
    L.push('  ' + q(n) + ': [' + ks.map(q).join(', ') + '],');
  }
  L.push('};', '');
  return L.join('\n');
}
function renderRegistry(names, entries) {
  const withCommands = names.filter((n) => entries.some((e) => e.from === n));
  const L = ['/** ' + BANNER, ' *', ' * 命令索引（一域一行）：把各域门里的声明数组汇成一张查表。',
    ' * 对外两件：`REGISTRY`（键 → 声明）与 `REGISTRY_KEYS`（全部键，顺序与 `keys.ts` 的 `MEMO_CLI_KEYS` 同）。',
    ' * 分派层只认这张表：命中即走该域的处理函数；**新加一个能力＝建它的 `commands.ts`**（扫到即自动进来）。',
    ' */', "import type { CommandSpec } from '../shared/commandSpec.js';"];
  for (const n of withCommands) L.push('import { ' + entries.find((e) => e.from === n).exportName + " } from '../" + n + "/index.js';");
  L.push('', 'const SOURCES: readonly (readonly CommandSpec[])[] = [');
  for (const n of withCommands) L.push('  ' + entries.find((e) => e.from === n).exportName + ',');
  L.push('];', '');
  L.push('/** 汇总各家声明；同键两个人声明即抛（生成期已先拦一道，这里再拦运行期那一刀）。 */');
  L.push('function build(sources: readonly (readonly CommandSpec[])[]): Record<string, CommandSpec> {');
  L.push('  const out: Record<string, CommandSpec> = {};');
  L.push('  for (const list of sources) {');
  L.push('    for (const spec of list) {');
  L.push("      if (Object.prototype.hasOwnProperty.call(out, spec.key)) throw new Error('命令键重复登记（两个人声明同一个键）：' + spec.key);");
  L.push('      out[spec.key] = spec;');
  L.push('    }');
  L.push('  }');
  L.push('  return out;');
  L.push('}', '');
  L.push('export const REGISTRY: Record<string, CommandSpec> = build(SOURCES);');
  L.push('');
  L.push('export const REGISTRY_KEYS: readonly string[] = Object.keys(REGISTRY);');
  L.push('');
  return L.join('\n');
}
function renderRoutes(merged) {
  const L = ['/** ' + BANNER, ' *',
    ' * 唤醒词记录面：' + merged.length + ' 条（各域 `routes.ts` 的声明按 `order` 升序拼出）。',
    ' * 权威是声明层（`src/<域>/routes.ts`）；本件不含任何顺序知识——顺序事实只住声明的 `order` 字段，',
    ' * 故把记录换文件搬动也不会打乱顺序。运行期路由（`src/triggers/routing.ts`）只读本件。',
    ' */', "import type { WakeRoute } from './routeSpec.js';", '',
    'export const WAKE_ROUTES: readonly WakeRoute[] = ['];
  for (const r of merged) {
    const parts = ['wakeWord: ' + q(r.wakeWord), 'scene: ' + q(r.scene), 'key: ' + q(r.key), 'cli: ' + q(r.cli)];
    if (r.needs !== undefined) parts.push('needs: [' + r.needs.map(q).join(', ') + ']');
    if (r.preset !== undefined) {
      parts.push('preset: { ' + Object.entries(r.preset).map(([k, v]) => k + ': ' + q(v)).join(', ') + ' }');
    }
    L.push('  { ' + parts.join(', ') + ' },');
  }
  L.push('];', '');
  return L.join('\n');
}

// ── 主流程：先把三件产物算齐（任何守卫红即抛，不写盘），再写盘或比对 ──────────────
const names = [...new Set([...scan('commands.ts'), ...scan('routes.ts')])].sort();
const caps = scan('commands.ts').map(readCommands);
const rts = scan('routes.ts').map(readRoutes);
const { all: entries, byKey } = mergeCommands(caps);
const merged = checkRoutes(rts.flatMap((r) => r.list), byKey);
const targets = [
  [join(SRC_DIR, 'cli', 'keys.ts'), renderKeys(names, entries, scan('commands.ts'))],
  [join(SRC_DIR, 'cli', 'registry.ts'), renderRegistry(names, entries)],
  [join(SRC_DIR, 'triggers', 'routes.generated.ts'), renderRoutes(merged)],
];
const summary = '（域 ' + names.length + ' 个、命令 ' + entries.length + ' 条、路由 ' + merged.length + ' 条）';

if (!CHECK) {
  for (const [path, text] of targets) writeFileSync(path, text, 'utf8');
  console.log('GEN-WROTE ' + targets.map(([p]) => rel(p)).join(' ＋ ') + summary);
  process.exit(0);
}
let bad = 0;
for (const [path, expected] of targets) {
  if (!existsSync(path)) {
    console.error('GEN-CHECK FAIL ' + rel(path) + '：生成物缺失，先跑 `pnpm gen`');
    bad += 1;
    continue;
  }
  const actual = readFileSync(path, 'utf8');
  if (actual === expected) {
    console.log('GEN-CHECK ok ' + rel(path) + summary);
    continue;
  }
  console.error('GEN-CHECK FAIL ' + rel(path) + '：生成物 ≠ 生成器输出，先改声明再 `pnpm gen`');
  const a = actual.split('\n');
  const b = expected.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      console.error('首处差异第 ' + (i + 1) + ' 行：盘上=' + JSON.stringify(a[i]) + ' 生成=' + JSON.stringify(b[i]));
      break;
    }
  }
  bad += 1;
}
process.exit(bad === 0 ? 0 : 1);
