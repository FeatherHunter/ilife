#!/usr/bin/env node
/** 备忘录命令登记生成器的**渲染段**（票 #855 拆件）：三件生成物怎么印出来，只住本件。
 *
 * 与驱动件 `scripts/gen-cli.mjs` 的分工（照本票 `gen-help-assets.mjs` → `help-assets.data.mjs`
 * ＋ `help-assets.render.mjs` 的同款切法）：
 *   · 驱动件：扫源码文本 → 守卫 → 把三件产物算齐 → 写盘／比对（它不认识生成物的长相）；
 *   · 本件：把算好的声明印成 `cli/keys.ts`／`cli/registry.ts`／`triggers/routes.generated.ts` 三份文本。
 * 两家都读的小事实（`BANNER`／`KINDS`／`q`）住本件：`KINDS` 解析器也要（`kind` 只许三类），故对外导出。
 */

export const BANNER = '本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。';
export const KINDS = ['write', 'read', 'pre-open'];
export const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

// ── 渲染三件生成物 ────────────────────────────────────────────────────────
export function renderKeys(names, entries, domains) {
  const kinds = KINDS.map((k) => k + ' ' + entries.filter((e) => e.kind === k).length + ' 条').join('、');
  const L = ['/** ' + BANNER, ' *', ' * 备忘录命令键表：' + kinds + '，合计 ' + entries.length + ' 条。',
    ' * 一条命令的事实住它自己的能力目录（`src/<域>/commands.ts`）；本文件只是那几处的派生，不手改。',
    ' * 键序：' + KINDS.join(' → ') + '，各段内按键名升序（确定性排序，同一个声明层永远得同一份字节）。',
    ' * `MemoKey` 是键的**编译期约束**：删一条声明而不改指向它的路由声明，`tsc` 当场红（TS2820）。',
    ' * `MEMO_DECLARED_SHAPES` 是**声明面投影**（13 条命令自己声明的形状；写命令的 `receipt` 由生成器合成）；',
    ' * envelope 认的全表是 `render/envelope.ts` 的 `MEMO_KEY_SHAPES`＝本表 ＋ 框架位那几行（`memo.help.lookup`），',
    ' * 两张表逐键一致由测试守着（`test/cmd-registry-855.test.mjs`），不靠人记。',
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
  L.push('', 'export const MEMO_DECLARED_SHAPES: Record<string, EnvelopeShape> = {');
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
export function renderRegistry(names, entries) {
  const withCommands = names.filter((n) => entries.some((e) => e.from === n));
  const L = ['/** ' + BANNER, ' *', ' * 命令索引（一域一行）：把各域门里的声明数组汇成一张查表。',
    ' * 对外两件：`REGISTRY`（键 → 声明）与 `REGISTRY_KEYS`（全部键，顺序与 `cli/keys.ts` 的 `MEMO_CLI_KEYS` 同）。',
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
/** 字面量序列化（生成物里的值必须与声明的字面量**同类型**）：串加引号、数与真伪裸写、
 *  数组与对象递归；函数引用（`__ref`）到这里就是生成器 bug，直接抛（不静默降级成串）。 */
function lit(v, where) {
  if (typeof v === 'string') return q(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return '[' + v.map((x) => lit(x, where)).join(', ') + ']';
  if (typeof v === 'object' && v !== null) {
    return '{ ' + Object.entries(v).map(([k, x]) => k + ': ' + lit(x, where)).join(', ') + ' }';
  }
  throw new Error(where + '：生成物里出现了不可序列化的值（函数引用不该进记录面）：' + JSON.stringify(v));
}
export function renderRoutes(merged) {
  const L = ['/** ' + BANNER, ' *',
    ' * 唤醒词记录面：' + merged.length + ' 条（各域 `routes.ts` 的声明按 `order` 升序拼出）。',
    ' * 权威是声明层（`src/<域>/routes.ts`）；本件不含任何顺序知识——顺序事实只住声明的 `order` 字段，',
    ' * 故把记录换文件搬动也不会打乱顺序。运行期路由（`src/triggers/routing.ts`）只读本件。',
    ' */', "import type { WakeRoute } from './routeSpec.js';", '',
    'export const WAKE_ROUTES: readonly WakeRoute[] = ['];
  for (const r of merged) {
    const parts = ['wakeWord: ' + q(r.wakeWord), 'scene: ' + q(r.scene), 'key: ' + q(r.key), 'cli: ' + q(r.cli)];
    if (r.needs !== undefined) parts.push('needs: [' + r.needs.map((s) => lit(s, r.wakeWord)).join(', ') + ']');
    if (r.preset !== undefined) {
      parts.push('preset: ' + lit(r.preset, r.wakeWord));
    }
    L.push('  { ' + parts.join(', ') + ' },');
  }
  L.push('];', '');
  return L.join('\n');
}
