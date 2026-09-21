#!/usr/bin/env node
// 私家大厨命令键表的生成器：各能力目录的声明表 → `src/cli/keys.ts`，配 `--check` 比对门。
//
// 输入（唯一的事实）：`src/<能力>/commands.ts` 恰好导出的那一个声明数组。新增一个能力＝
// 建它的 `commands.ts`（扫到即自动进来）；新增一条命令＝改它自己的声明，生成物不动手。
// 扫描只认「目录里有 `commands.ts`」这一件事，不登记能力名单——新增域只碰该域自己的目录。
// 输出：`src/cli/keys.ts`（键表＋标题＋形状＋来源域名单＋按域键表，头一句生成横幅，勿手改）。
// 本票试点范围：只校验六字段在场（`kind`／`key`／`shape`／`title`／`wakeWord`／`example`），
// 只派生键、标题、形状、来源域、按域键表；代表唤醒词与示例的派生（速查表那几块）由后续票接走。
// 会改数据库的命令不写 `shape`（一律回执形，唯一定义地就是这里合成的那一行）。
// 用法：`pnpm gen` 写盘；`pnpm gen:check` 只比对，不等即 exit 1（根 `package.json` 接后者）。
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SRC_DIR = join(PKG_DIR, 'src');
const OUT = join(SRC_DIR, 'cli', 'keys.ts');
const CHECK = process.argv.includes('--check');

const BANNER = '本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。';
const KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/;
const WRITE_SHAPE = 'receipt';

/** 扫域目录：有 `commands.ts` 的子目录即一个能力，能力名升序（确定性）。 */
function scanCapabilityNames() {
  return readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => existsSync(join(SRC_DIR, name, 'commands.ts')))
    .sort();
}

/** 读一个能力目录的声明：源码文本级抽取，只认扁平声明对象（含 `kind:` 且不含 `readonly` 的花括号块）。 */
function loadCapability(name) {
  const file = join(SRC_DIR, name, 'commands.ts');
  const text = readFileSync(file, 'utf8');
  const arrayExports = text.match(/export\s+const\s+\w+\s*(:[^=]*)?=\s*\[/g) || [];
  if (arrayExports.length !== 1) {
    throw new Error(
      'src/' + name + '/commands.ts 须恰好导出一个声明数组，实得 ' + arrayExports.length + ' 个',
    );
  }
  // 块匹配须越过单引号串（示例里的 `--params '{"name":"…"}'` 自带花括号）：串内逐字吞，不当结构读。
  const str = "'(?:[^'\\\\]|\\\\.)*'";
  const atom = '(?:[^\\\'{}]|' + str + ')';
  const blockRe = new RegExp('\\{(?:' + atom + ')*?\\bkind\\s*:\\s*\'(?:read|write)\'(?:' + atom + ')*?\\}', 'gs');
  const list = [];
  for (const m of text.matchAll(blockRe)) {
    const b = m[0];
    if (b.includes('readonly')) continue;
    list.push(parseDecl(b, name));
  }
  return { name, list };
}

function field(block, name) {
  const m = block.match(new RegExp(name + "\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'"));
  return m ? m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\') : undefined;
}

/** 校验一条声明（六字段在场；写命令禁 `shape`，查询命令须 `shape`）。 */
function parseDecl(block, from) {
  const kind = field(block, 'kind');
  const key = field(block, 'key');
  const shape = field(block, 'shape');
  const title = field(block, 'title');
  const wakeWord = field(block, 'wakeWord');
  const example = field(block, 'example');
  if (kind !== 'read' && kind !== 'write') throw new Error(from + ' 的声明缺 kind（read/write）：' + block.slice(0, 80));
  if (typeof key !== 'string' || key === '' || !KEY_RE.test(key)) {
    throw new Error(from + ' 的声明缺合法 key：' + block.slice(0, 80));
  }
  if (kind === 'read' && (typeof shape !== 'string' || shape === '')) {
    throw new Error(from + ' 的查询声明缺 shape：' + key);
  }
  if (kind === 'write' && shape !== undefined) {
    throw new Error(from + ' 的会改数据库声明不许写 shape：' + key);
  }
  if (typeof title !== 'string' || title === '') throw new Error(from + ' 的声明缺 title：' + key);
  if (typeof example !== 'string' || example === '') throw new Error(from + ' 的声明缺 example：' + key);
  return { kind, key, shape, title, wakeWord, from };
}

/** 两处声明合并：同命令两处声明即抛；写命令在前、查询命令在后，各按命令名升序。 */
function merge(capabilities) {
  const out = new Map();
  for (const cap of capabilities) {
    for (const decl of cap.list) {
      if (out.has(decl.key)) throw new Error('命令重复登记：' + decl.key + '（又见于' + cap.name + '）');
      out.set(decl.key, { ...decl, shape: decl.kind === 'write' ? WRITE_SHAPE : decl.shape });
    }
  }
  const all = [...out.values()];
  const rank = (e) => (e.kind === 'write' ? 0 : 1);
  all.sort((a, b) => rank(a) - rank(b) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return all;
}

function q(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

/** 渲染生成物全文（含来源域名单：空声明的域也在单里，核心判据靠它显形；
 * 含按域键表：`--check` 按域点名缺／多出的命令，删了某域一条声明即指到该域）。 */
function render(names, entries) {
  const writes = entries.filter((e) => e.kind === 'write');
  const reads = entries.filter((e) => e.kind === 'read');
  const L = [];
  L.push('/** ' + BANNER);
  L.push(' *');
  L.push(' * 私家大厨命令键表：会改数据库 ' + writes.length + ' 条、查询 ' + reads.length + ' 条，共 ' + entries.length + ' 条。');
  L.push(' * 一条命令的事实住它自己的能力目录（`src/<能力>/commands.ts`）；本文件只是那几处的派生，不手改。');
  L.push(' * 键序：会改数据库的命令（命令名升序）在前、查询命令（命令名升序）在后（确定性排序）。');
  L.push(' */');
  L.push('export const CHEF_CLI_SOURCES: readonly string[] = [');
  for (const n of names) L.push('  ' + q(n) + ',');
  L.push('];');
  L.push('');
  L.push('export const CHEF_CLI_KEYS: readonly string[] = [');
  for (const e of entries) L.push('  ' + q(e.key) + ',');
  L.push('];');
  L.push('');
  L.push('export const CHEF_KEY_TITLES: Record<string, string> = {');
  for (const e of entries) L.push('  ' + q(e.key) + ': ' + q(e.title) + ',');
  L.push('};');
  L.push('');
  L.push('export const CHEF_KEY_SHAPES: Record<string, string> = {');
  for (const e of entries) L.push('  ' + q(e.key) + ': ' + q(e.shape) + ',');
  L.push('};');
  L.push('');
  L.push('export const CHEF_DOMAIN_KEYS: Record<string, readonly string[]> = {');
  for (const n of names) {
    const ks = entries.filter((e) => e.from === n).map((e) => e.key);
    L.push('  ' + q(n) + ': [' + ks.map((k) => q(k)).join(', ') + '],');
  }
  L.push('};');
  L.push('');
  return L.join('\n') + '\n';
}

/** 从盘上生成物里取出键表与来源域与按域键表（只为报错点名，判据仍是全文逐字节比对）。 */
function parseOnDisk(text) {
  const keys = [];
  const sources = [];
  const byDomain = new Map();
  const km = text.match(/CHEF_CLI_KEYS[^=]*=\s*\[([\s\S]*?)\]/);
  if (km) for (const m of km[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) keys.push(m[1]);
  const sm = text.match(/CHEF_CLI_SOURCES[^=]*=\s*\[([\s\S]*?)\]/);
  if (sm) for (const m of sm[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) sources.push(m[1]);
  const dm = text.match(/CHEF_DOMAIN_KEYS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (dm) {
    for (const m of dm[1].matchAll(/'((?:[^'\\]|\\.)*)'\s*:\s*\[([\s\S]*?)\]/g)) {
      const ks = [];
      for (const k of m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)) ks.push(k[1]);
      byDomain.set(m[1], ks);
    }
  }
  return { keys, sources, byDomain };
}

const names = scanCapabilityNames();
const caps = names.map(loadCapability);
const entries = merge(caps);
const expected = render(names, entries);
const rel = relative(join(PKG_DIR, '..', '..'), OUT);

if (!CHECK) {
  writeFileSync(OUT, expected, 'utf8');
  console.log('GEN-WROTE ' + rel + '（' + names.length + ' 域、' + entries.length + ' 条命令）');
  process.exit(0);
}

if (!existsSync(OUT)) {
  console.error('GEN-CHECK FAIL ' + rel + '：生成物缺失，先跑 `pnpm gen`');
  console.error('缺域：' + names.join('、') + '；缺命令：' + entries.map((e) => e.key).join('、'));
  process.exit(1);
}
const actual = readFileSync(OUT, 'utf8');
if (actual === expected) {
  console.log('GEN-CHECK ok ' + rel + '（' + names.length + ' 域、' + entries.length + ' 条命令）');
  process.exit(0);
}
console.error('GEN-CHECK FAIL ' + rel + '：生成物 ≠ 生成器输出，先改声明再 `pnpm gen`');
const disk = parseOnDisk(actual);
const expKeys = new Set(entries.map((e) => e.key));
const gotKeys = new Set(disk.keys);
for (const k of expKeys) if (!gotKeys.has(k)) console.error('缺命令：' + k);
for (const k of gotKeys) if (!expKeys.has(k)) console.error('多出命令：' + k);
const expSrc = new Set(names);
const gotSrc = new Set(disk.sources);
for (const n of expSrc) if (!gotSrc.has(n)) console.error('缺域：' + n);
for (const n of gotSrc) if (!expSrc.has(n)) console.error('多出域：' + n);
// 按域点名（#839 反例口径）：删了某域一条声明，直接指到该域。
const expByDomain = new Map();
for (const n of names) expByDomain.set(n, entries.filter((e) => e.from === n).map((e) => e.key));
for (const n of [...new Set([...expByDomain.keys(), ...disk.byDomain.keys()])].sort()) {
  const exp = new Set(expByDomain.get(n) || []);
  const got = new Set(disk.byDomain.get(n) || []);
  for (const k of exp) if (!got.has(k)) console.error('域 ' + n + ' 缺命令：' + k);
  for (const k of got) if (!exp.has(k)) console.error('域 ' + n + ' 多出命令：' + k);
}
const aLines = actual.split('\n');
const eLines = expected.split('\n');
for (let i = 0; i < Math.max(aLines.length, eLines.length); i++) {
  if (aLines[i] !== eLines[i]) {
    console.error('首处差异第 ' + (i + 1) + ' 行：盘上=' + JSON.stringify(aLines[i]) + ' 生成=' + JSON.stringify(eLines[i]));
    break;
  }
}
process.exit(1);
