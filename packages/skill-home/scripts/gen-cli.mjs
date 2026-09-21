#!/usr/bin/env node
// #800 · 居家命令登记生成器：目录扫描 → 三件派生件（确定性＋哈希锁＋CI 真跑）。
//
// 输入（唯一的事实）：`src/<能力>/commands.ts` 导出的唯一一个声明数组、
// `src/<能力>/routes.ts` 导出的唯一一个路由数组（文本级读取，不依赖 dist 新鲜度，
// 故「声明改了没重建」不可能假绿——生成器永远读最新源码）。
// 输出（派生件，入仓，人不手改，`--check` 逐字节比对）：
//   ① `src/cli/keys.ts`（键表＋出参形状；写命令的 receipt 由本生成器合成）；
//   ② `src/cli/registry.ts`（一能力一行，查表分派的唯一上游）；
//   ③ `src/policy/routes.generated.ts`（路由记录面；运行期路由读它）。
// 用法：`pnpm gen`（写盘）／`pnpm gen:check`（只比对，不等即 exit 1）。
// 本文件是 fail-closed 的：声明写法只认规范子集，认不出带文件名与行号抛错，
// 绝不静默跳过（同 `scripts/lib/yaml-subset.mjs` 的规矩）。
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SRC_DIR = join(PKG_DIR, 'src');
const CHECK = process.argv.includes('--check');

const BANNER = '本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。';
const READ_SHAPES = new Set(['list', 'detail', 'receipt', 'stat']);
// 技能级入口登记行（不进能力目录，权威＝SKILL 的 help_wake_word＋lookup 口径）：照旧表头三行。
const HELP_ROWS = [
  { phrase: '居家管家 帮助', key: 'home.help.lookup' },
  { phrase: '居家管家帮助', key: 'home.help.lookup' },
  { phrase: '居家管家能做什么', key: 'home.help.lookup' },
];
const HELP_SHAPE = { key: 'home.help.lookup', shape: 'list', title: '居家管家HELP' };

function fail(file, line, msg) {
  throw new Error(file + ' 第 ' + line + ' 行：' + msg);
}

/** 抽单引号字符串字面量（含 \\' 转义），返回 { value, next }（next＝闭合引号后下标）。 */
function strLit(src, i) {
  if (src[i] !== "'") throw new Error('不是字符串起头');
  let out = '';
  let j = i + 1;
  for (;;) {
    if (j >= src.length) throw new Error('字符串未闭合');
    const c = src[j];
    if (c === '\\') { out += src[j + 1] ?? ''; j += 2; continue; }
    if (c === "'") return { value: out, next: j + 1 };
    out += c;
    j++;
  }
}

/** 在对象字面量文本里按字段名抽字符串值（字段缺失返回 undefined）。 */
function fieldStr(objText, file, line, field) {
  const m = new RegExp(field + "\\s*:\\s*'").exec(objText);
  if (!m) return undefined;
  try {
    return strLit(objText, m.index + m[0].length - 1).value;
  } catch (e) {
    fail(file, line, '字段 ' + field + ' 的字符串解析失败：' + e.message);
  }
}

/** preset 子集：`{ k: 'v' | 数字 | true | false }` 逗号分隔；其余一律抛错。 */
function parsePreset(objText, file, line) {
  const m = /preset\s*:\s*\{/.exec(objText);
  if (!m) return undefined;
  let j = m.index + m[0].length;
  const out = {};
  const skip = () => { while (j < objText.length && /[\s]/.test(objText[j])) j++; };
  skip();
  if (objText[j] === '}') return out;
  for (;;) {
    skip();
    const km = /[A-Za-z_][A-Za-z_0-9]*/.exec(objText.slice(j));
    if (!km) fail(file, line, 'preset 的键不认识（只认标识符）：' + objText.slice(j, j + 20));
    const k = km[0];
    j += k.length;
    skip();
    if (objText[j] !== ':') fail(file, line, 'preset 缺冒号：' + k);
    j++;
    skip();
    if (objText[j] === "'") {
      const r = strLit(objText, j);
      out[k] = r.value;
      j = r.next;
    } else {
      const vm = /^(true|false|-?[0-9]+(?:\.[0-9]+)?)/.exec(objText.slice(j));
      if (!vm) fail(file, line, 'preset 的值不认识（只认单引号串／数字／true／false）：' + k);
      out[k] = vm[1] === 'true' ? true : vm[1] === 'false' ? false : Number(vm[1]);
      j += vm[1].length;
    }
    skip();
    if (objText[j] === '}') break;
    if (objText[j] !== ',') fail(file, line, 'preset 缺逗号：' + k);
    j++;
  }
  return out;
}

/** needs 子集：`['a', 'b']`；其余一律抛错。 */
function parseNeeds(objText, file, line) {
  const m = /needs\s*:\s*\[/.exec(objText);
  if (!m) return undefined;
  let j = m.index + m[0].length;
  const out = [];
  for (;;) {
    while (j < objText.length && /[\s,]/.test(objText[j])) j++;
    if (objText[j] === ']') break;
    if (objText[j] !== "'") fail(file, line, 'needs 只认单引号串数组');
    const r = strLit(objText, j);
    out.push(r.value);
    j = r.next;
  }
  return out;
}

/** 逐个 `{...}` 对象抽取（花括号配对，字符串内括号不算）。 */
function splitObjects(body, file) {
  const objs = [];
  let i = 0;
  while (i < body.length) {
    const s = body.indexOf('{', i);
    if (s < 0) break;
    let depth = 0;
    let j = s;
    let inStr = false;
    for (; j < body.length; j++) {
      const c = body[j];
      if (inStr) {
        if (c === '\\') j++;
        else if (c === "'") inStr = false;
        continue;
      }
      if (c === "'") inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) break; }
    }
    if (depth !== 0) fail(file, '?', '对象花括号不配对');
    const line = body.slice(0, s).split('\n').length;
    objs.push({ text: body.slice(s, j + 1), line });
    i = j + 1;
  }
  return objs;
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** 读一能力目录的声明（文本级，fail-closed）。 */
function loadCapability(name) {
  const cFile = 'src/' + name + '/commands.ts';
  const rFile = 'src/' + name + '/routes.ts';
  const cText = readFileSync(join(SRC_DIR, name, 'commands.ts'), 'utf8');
  const rText = readFileSync(join(SRC_DIR, name, 'routes.ts'), 'utf8');
  const cArr = /export const ([A-Z_]+)_COMMANDS[^=]*= \[/.exec(cText);
  if (!cArr) fail(cFile, '?', '必须恰好导出一个声明数组 `<NAME>_COMMANDS`');
  const rArr = /export const ([A-Z_]+)_ROUTES[^=]*= \[/.exec(rText);
  if (!rArr) fail(rFile, '?', '必须恰好导出一个路由数组 `<NAME>_ROUTES`');
  const cBody = cText.slice(cArr.index + cArr[0].length);
  const rBody = rText.slice(rArr.index + rArr[0].length);
  const commands = splitObjects(cBody, cFile).map((o) => {
    const kind = fieldStr(o.text, cFile, o.line, 'kind');
    const key = fieldStr(o.text, cFile, o.line, 'key');
    const shape = fieldStr(o.text, cFile, o.line, 'shape');
    const title = fieldStr(o.text, cFile, o.line, 'title');
    const wakeWord = fieldStr(o.text, cFile, o.line, 'wakeWord');
    const example = fieldStr(o.text, cFile, o.line, 'example');
    if (kind !== 'read' && kind !== 'write') fail(cFile, o.line, 'kind 只认 read／write');
    if (!key) fail(cFile, o.line, '缺 key');
    if (!title) fail(cFile, o.line, '缺 title');
    if (!example) fail(cFile, o.line, '缺 example（必填非空，照抄即能跑）');
    if (!/\brun\s*:/.test(o.text)) fail(cFile, o.line, '缺 run（处理函数，住同一能力目录）');
    if (kind === 'read') {
      if (!shape || !READ_SHAPES.has(shape)) fail(cFile, o.line, '读声明的 shape 只认 list／detail／receipt／stat');
    } else if (shape !== undefined) {
      fail(cFile, o.line, '写声明不写 shape（写命令一律 receipt，由生成器合成）');
    }
    return { kind, key, shape, title, wakeWord, example };
  });
  const routes = splitObjects(rBody, rFile).map((o) => {
    const phrase = fieldStr(o.text, rFile, o.line, 'phrase');
    const key = fieldStr(o.text, rFile, o.line, 'key');
    if (!phrase) fail(rFile, o.line, '缺 phrase');
    if (!key) fail(rFile, o.line, '缺 key');
    return { phrase, key, needs: parseNeeds(o.text, rFile, o.line), preset: parsePreset(o.text, rFile, o.line) };
  });
  return { name, commands, routes, commandsName: cArr[1] + '_COMMANDS', routesName: rArr[1] + '_ROUTES' };
}

function scanCapabilities() {
  return readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && ['items', 'space', 'outfit', 'stats', 'express', 'receipt', 'family', 'setup'].includes(d.name))
    .map((d) => d.name)
    .sort();
}

function tsOf(v) {
  if (typeof v === 'string') return "'" + esc(v) + "'";
  return String(v);
}

function main() {
  const caps = scanCapabilities().map(loadCapability);
  // 同键两处声明即抛（铁律二的机器面）。
  const seen = new Map();
  for (const c of caps) {
    for (const d of c.commands) {
      if (seen.has(d.key)) fail('commands', '?', '同键两处声明：' + d.key + '（' + seen.get(d.key) + '／' + c.name + '）');
      seen.set(d.key, c.name);
    }
  }
  if (seen.size !== 20) fail('commands', '?', '业务键应 20 条（含 setup 空声明），实得 ' + seen.size);
  const seenPhrase = new Map();
  for (const c of caps) {
    for (const r of c.routes) {
      if (seenPhrase.has(r.phrase)) fail('routes', '?', '同词两处声明：' + r.phrase);
      seenPhrase.set(r.phrase, c.name);
      if (!seen.has(r.key)) fail('routes', '?', '路由指向未知键：' + r.phrase + ' → ' + r.key);
    }
  }

  const allCmds = caps.flatMap((c) => c.commands);
  const shapeOf = (d) => (d.kind === 'write' ? 'receipt' : d.shape);
  const keysSorted = [...allCmds.map((d) => d.key)].sort();
  const keysTs = '// ' + BANNER + '\n'
    + '// 命令键表（派生件）：一命令的事实住它自己的能力目录，本文件只是那处的派生，不手改。\n'
    + '// 键序＝键名升序（确定性排序，与写入次序无关）；写键在前读键在后是卡路里的序，\n'
    + '// 居家只取确定性（逐字节相同），不取它的写前读后。\n'
    + "export const HOME_KEYS = [\n"
    + keysSorted.map((k) => "  '" + k + "',\n").join('')
    + '] as const;\n'
    + 'export type HomeKeyString = (typeof HOME_KEYS)[number];\n'
    + '\n'
    + '// 出参形状分配（派生件）：读形状来自声明，写一律 receipt。\n'
    + 'export const HOME_KEY_SHAPES: Record<string, string> = {\n'
    + keysSorted.map((k) => {
      const d = allCmds.find((x) => x.key === k);
      return "  '" + k + "': '" + shapeOf(d) + "',\n";
    }).join('')
    + "  '" + HELP_SHAPE.key + "': '" + HELP_SHAPE.shape + "',\n"
    + '};\n';

  const nonEmpty = caps.filter((c) => c.commands.length > 0);
  const registryTs = '// ' + BANNER + '\n'
    + '// 命令索引（一能力一行）：分派层只认这张表。新增能力建它的 `commands.ts`\n'
    + '//（恰好导出一个声明数组，生成器扫到即自动进来）；新增命令改它的声明，本文件不动。\n'
    + "import type { HomeCommandSpec } from '../shared/commandSpec.js';\n"
    + nonEmpty.map((c) => 'import { ' + c.commandsName + " } from '../" + c.name + "/index.js';\n").join('')
    + '\n'
    + 'const SOURCES: readonly (readonly HomeCommandSpec[])[] = [\n'
    + nonEmpty.map((c) => '  ' + c.commandsName + ',\n').join('')
    + '];\n'
    + '\n'
    + '/** 汇总各家声明；同键两个人声明即抛（生成期已先拦一道）。 */\n'
    + 'function build(sources: readonly (readonly HomeCommandSpec[])[]): Record<string, HomeCommandSpec> {\n'
    + '  const out: Record<string, HomeCommandSpec> = {};\n'
    + '  for (const list of sources) for (const spec of list) {\n'
    + "    if (out[spec.key]) throw new Error('同键两处声明（运行期）：' + spec.key);\n"
    + '    out[spec.key] = spec;\n'
    + '  }\n'
    + '  return out;\n'
    + '}\n'
    + '\n'
    + 'export const REGISTRY: Record<string, HomeCommandSpec> = build(SOURCES);\n'
    + 'export const REGISTRY_KEYS = Object.keys(REGISTRY).sort();\n';

  const entryTs = (r) => {
    let s = "  { phrase: '" + esc(r.phrase) + "', key: '" + r.key + "'";
    if (r.needs) s += ', needs: [' + r.needs.map((n) => "'" + esc(n) + "'").join(', ') + ']';
    if (r.preset) {
      const ps = Object.entries(r.preset).map(([k, v]) => k + ': ' + tsOf(v)).join(', ');
      s += ', preset: { ' + ps + ' }';
    }
    return s + ' },\n';
  };
  const routesTs = '// ' + BANNER + '\n'
    + '// 路由记录面（派生件）：运行期路由读它。顺序＝能力名升序＋声明出现序（确定性排序）。\n'
    + '// 技能级入口 3 行是登记行（不进能力目录，权威＝SKILL 的 help_wake_word＋lookup 口径）。\n'
    + "import type { HomeRouteSpec } from '../shared/commandSpec.js';\n"
    + '\n'
    + 'export const ROUTES_GENERATED: readonly HomeRouteSpec[] = [\n'
    + HELP_ROWS.map((r) => "  { phrase: '" + r.phrase + "', key: '" + r.key + "' },\n").join('')
    + caps.flatMap((c) => c.routes).map(entryTs).join('')
    + '];\n';

  const targets = [
    [join(SRC_DIR, 'cli', 'keys.ts'), keysTs],
    [join(SRC_DIR, 'cli', 'registry.ts'), registryTs],
    [join(SRC_DIR, 'policy', 'routes.generated.ts'), routesTs],
  ];
  let bad = 0;
  for (const [path, want] of targets) {
    let cur = null;
    try { cur = readFileSync(path, 'utf8'); } catch { cur = null; }
    const rel = path.split('packages/skill-home/')[1] ?? path.split('packages\\skill-home\\')[1] ?? path;
    if (cur === want) {
      console.log('GEN-CHECK ok ' + rel);
      continue;
    }
    bad++;
    if (CHECK) {
      console.log('GEN-CHECK FAIL ' + rel + '（生成物 ≠ 生成器输出：改权威声明后跑 `pnpm gen` 重生成）');
      continue;
    }
    writeFileSync(path, want, 'utf8');
    console.log('GEN write ' + rel);
  }
  if (bad > 0) {
    if (CHECK) process.exit(1);
    console.log('GEN done：' + bad + ' 件已重生成（含 setup 空声明校验通过）');
  } else {
    console.log('GEN done：三件派生件与生成器输出逐字节一致');
  }
}

main();
