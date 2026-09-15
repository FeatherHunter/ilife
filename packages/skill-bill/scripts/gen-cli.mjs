#!/usr/bin/env node
// #432 · 饼干记账命令汇总位的生成器（照卡路里 `skill-calorie/scripts/gen-cli.mjs` 的形状同构，包内最小面）。
//
// 输入（唯一权威源）：`src/<能力>/commands.ts` 导出的唯一一个声明数组（编译后 `dist/<能力>/commands.js`）。
// 本票只纳已迁移的两条（`bill.record.add`／`bill.record.update`，都在 `src/record/commands.ts`）；
// 其余 14 条仍住 `src/render/envelope.ts` 的过渡表，行为与产物一律不动，本生成器不读不写它们。
// 输出（唯一生成物）：`src/cli/registry.ts`（一能力一行，由扫描得出，人不手改）。
// 不派生的落点（本次不动，不上报）：`packages/base-combos/combos.yaml` 属跨技能登记禁区（地图 OutofScope），
// `src/render/envelope.ts` 过渡表、`scripts/build-help.mjs` 的 HELP-AUTO 块、路由与 `wake-assets` 一律不碰。
//
// 新鲜度（照卡路里同构，内容判据，不看时间戳）：生成器读的是编译后的声明模块，故先查
// `dist/.gen-inputs.json` 内容印记（每条记 `{src, dist}`＝源文本 sha256＋编译产物 `.js` 文本 sha256，
// 由 `pnpm build` 在 `tsc -b` 之后调本脚本 `--stamp` 写入）配现场配对门（源事实与编译事实逐件比对）：
//   · 源内容没变（`touch` 只动 mtime）⇒ 放行；· 源变了没重建 ⇒ `GEN-STALE FAIL`（医嘱：跑 `pnpm build` 再跑）；
//   · 保 mtime 让 `tsc -b` 跳过重编＋印记已重签 ⇒ `GEN-PAIR FAIL`（印记自洽也拦，现场比对不信任印记）。
// 确定性：能力名升序；同一份声明跑两次 `pnpm gen`，产物逐字节相同。
// 用法：`pnpm gen`（写盘）／`pnpm gen:check`（只比对，不等即 exit 1）。二者都需先 `pnpm build` 出 `dist/`。
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SRC_DIR = join(PKG_DIR, 'src');
const DIST_DIR = join(PKG_DIR, 'dist');
const REPO_ROOT = join(PKG_DIR, '..', '..');
const CHECK = process.argv.includes('--check');
const STAMP_ONLY = process.argv.includes('--stamp');

const BANNER = '本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。';
const STAMP = join(DIST_DIR, '.gen-inputs.json');
const STAMP_VERSION = 2;

/** 扫 `src/<能力>/commands.ts`：能力名升序（确定性）。 */
function scanCapabilityNames() {
  return readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name)
    .filter((n) => existsSync(join(SRC_DIR, n, 'commands.ts')))
    .sort();
}

/** 读一个能力目录的声明：引编译后模块，取唯一数组导出；字段按饼干口径必填（`wakeWord` 必填，与卡路里不同）。 */
async function loadCapability(name) {
  const distPath = join(DIST_DIR, name, 'commands.js');
  if (!existsSync(distPath)) throw new Error('缺 ' + relative(REPO_ROOT, distPath) + '：请先 `pnpm build`');
  const mod = await import(pathToFileURL(distPath).href);
  const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v));
  if (arrays.length !== 1) throw new Error('src/' + name + '/commands.ts 必须恰好导出一个声明数组，实得 ' + arrays.length);
  const [exportName, list] = arrays[0];
  const idx = await import(pathToFileURL(join(DIST_DIR, name, 'index.js')).href).catch(() => null);
  if (!idx || !Array.isArray(idx[exportName])) {
    throw new Error('src/' + name + '/index.ts 须再导出那个数组（生成的 registry 从 `../' + name + '/index.js` 取）：' + exportName);
  }
  for (const spec of list) {
    for (const f of ['kind', 'key', 'shape', 'title', 'wakeWord', 'example']) {
      if (typeof spec?.[f] !== 'string' || spec[f] === '') throw new Error(name + ' 的声明缺 ' + f + '：' + spec?.key);
    }
    if (spec.kind !== 'write' || spec.shape !== 'receipt') throw new Error(name + ' 本票只收 write／receipt：' + spec.key);
    if (!spec.example.includes(spec.key)) throw new Error(name + ' 的示例须含命令名（照抄即能跑）：' + spec.key);
  }
  return { name, exportName, list };
}

/** 两个权威源合流：同键两个人声明即抛。 */
function merge(capabilities) {
  const out = new Map();
  for (const cap of capabilities) for (const decl of cap.list) {
    if (out.has(decl.key)) throw new Error('命令名重复登记：' + decl.key + '（又见 ' + cap.name + '）');
    out.set(decl.key, decl);
  }
  return [...out.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

function renderRegistryTs(capabilities) {
  const L = [];
  L.push('/** ' + BANNER);
  L.push(' *');
  L.push(' * 命令索引（一能力一行）：把能力目录里的声明汇总成一张查表。');
  L.push(' * 对外两件：`REGISTRY`（命令名 → 声明）与 `REGISTRY_KEYS`（全部命令名）。');
  L.push(' * 谁在用（两个调用点，指名）：① `src/cli/cmd_read.ts`——迁移过的命令先查这张表；');
  L.push(' * ② `src/render/envelope.ts`——迁移过的命令的形状从这张表运行期派生。');
  L.push(' * 本次只纳已迁移的两条，其余 14 条仍在过渡表（行为产物不动，本生成器不读写它们）。');
  L.push(' * `combos.yaml` 不在本生成器派生面（跨技能登记禁区，本次不动）。');
  L.push(' * 新加一个能力＝建它的 `commands.ts` 并在该能力 `index.ts` 再导出那个数组；');
  L.push(' * 新加一条命令＝改它的声明加它那个子功能文件，本文件不动。');
  L.push(' */');
  L.push("import type { CommandSpec } from '../shared/commandSpec.js';");
  for (const cap of capabilities) L.push('import { ' + cap.exportName + " } from '../" + cap.name + "/index.js';");
  L.push('');
  L.push('const SOURCES: readonly (readonly CommandSpec[])[] = [');
  for (const cap of capabilities) L.push('  ' + cap.exportName + ',');
  L.push('];');
  L.push('');
  L.push('/** 汇总各家声明；同一个命令名两个人声明即抛（只在代码缺陷时触发，生成期已先拦一道）。 */');
  L.push('function build(sources: readonly (readonly CommandSpec[])[]): Record<string, CommandSpec> {');
  L.push('  const out: Record<string, CommandSpec> = {};');
  L.push('  for (const list of sources) {');
  L.push('    for (const spec of list) {');
  L.push('      if (Object.prototype.hasOwnProperty.call(out, spec.key)) {');
  L.push("        throw new Error('命令名重复登记（两个人声明同一条命令）：' + spec.key);");
  L.push('      }');
  L.push('      out[spec.key] = spec;');
  L.push('    }');
  L.push('  }');
  L.push('  return out;');
  L.push('}');
  L.push('');
  L.push('export const REGISTRY: Record<string, CommandSpec> = build(SOURCES);');
  L.push('');
  L.push('export const REGISTRY_KEYS: readonly string[] = Object.keys(REGISTRY);');
  L.push('');
  return L.join('\n');
}

/** 声明源（文件名升序）；印记与判陈旧都以它为准。 */
function declarationSources(names) {
  return names.map((n) => join(SRC_DIR, n, 'commands.ts'));
}
function distOf(src) {
  return join(DIST_DIR, relative(SRC_DIR, src).replace(/\\/g, '/').replace(/\.ts$/, '.js'));
}
function stampKey(src) {
  return relative(SRC_DIR, src).replace(/\\/g, '/');
}
function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function writeStamp(names) {
  const files = {};
  for (const src of declarationSources(names)) {
    if (!existsSync(src)) continue;
    const dist = distOf(src);
    files[stampKey(src)] = { src: sha256(readFileSync(src, 'utf8')), dist: existsSync(dist) ? sha256(readFileSync(dist, 'utf8')) : null };
  }
  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(STAMP, JSON.stringify({ version: STAMP_VERSION, note: '饼干记账生成器输入的内容印记：每条记 {src, dist} 配对，由 `pnpm build` 调 `--stamp` 写入；`pnpm gen`／`gen:check` 按它判陈旧、按现场配对门判脱钩。', files }, null, 2) + '\n');
  console.log('GEN-STAMP ok ' + relative(REPO_ROOT, STAMP) + '：声明源 ' + Object.keys(files).length + ' 件');
}

function readStamp() {
  let raw;
  try { raw = readFileSync(STAMP, 'utf8'); } catch { return { state: 'missing' }; }
  let data;
  try { data = JSON.parse(raw); } catch (e) { return { state: 'corrupt', reason: 'JSON 解析失败（' + (e && e.message) + '）' }; }
  if (!data || data.version !== STAMP_VERSION || !data.files || typeof data.files !== 'object' || Array.isArray(data.files)) {
    return { state: 'corrupt', reason: 'version 不是 ' + STAMP_VERSION };
  }
  const files = {};
  for (const [k, v] of Object.entries(data.files)) {
    const distOk = v && typeof v === 'object' && (v.dist === null || (typeof v.dist === 'string' && /^[0-9a-f]{64}$/.test(v.dist)));
    if (!distOk || typeof v.src !== 'string' || !/^[0-9a-f]{64}$/.test(v.src)) return { state: 'corrupt', reason: '条目 ' + k + ' 不是 {src, dist} 形状' };
    files[k] = v;
  }
  return { state: 'ok', files };
}

/** 内容判据，不看时间戳。印记缺失时不判陈旧（打 WARN 放行，只查编译产物在不在）。 */
function staleDeclarations(names, files) {
  const stale = [];
  if (files === null) console.error('GEN-STAMP WARN：没有可用的内容印记 ' + relative(REPO_ROOT, STAMP) + '（`pnpm build` 会写），本次只查编译产物在不在、不判陈旧。');
  for (const src of declarationSources(names)) {
    const dist = distOf(src);
    if (!existsSync(dist)) { stale.push('缺 ' + relative(REPO_ROOT, dist) + '（源：' + relative(REPO_ROOT, src) + '）'); continue; }
    if (files === null) continue;
    const recorded = files[stampKey(src)];
    if (recorded === undefined) continue;
    const now = sha256(readFileSync(src, 'utf8'));
    if (recorded.src !== now) stale.push(relative(REPO_ROOT, src) + ' 的内容与上次 `pnpm build` 时不同（印记 ' + recorded.src.slice(0, 12) + '… ≠ 现 ' + now.slice(0, 12) + '…）');
  }
  return stale;
}

function extractExportedArray(srcText, rel) {
  const m = /export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*(?::[^=;]+)?=\s*\[/.exec(srcText);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0; let quote = null; let escape = false; let lineComment = false; let blockComment = false;
  for (let i = start; i < srcText.length; i += 1) {
    const c = srcText[i]; const n = srcText[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote !== null) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === '[') depth += 1;
    else if (c === ']') { depth -= 1; if (depth === 0) return srcText.slice(start, i + 1); }
  }
  throw new Error('声明源静态解析失败：' + rel + '（数组括号不配平）');
}

function evalDeclArrayText(arrText, rel) {
  const cleaned = arrText.replace(/\brun\s*:\s*[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*\s*,?/g, '');
  try {
    const v = new Function('return (' + cleaned + '\n)')();
    if (!Array.isArray(v)) throw new Error('求值结果不是数组');
    return v;
  } catch (e) { throw new Error('声明源静态解析失败：' + rel + '（' + (e && e.message) + '）'); }
}

function normFacts(list) {
  return JSON.stringify(list.map((o) => {
    const entries = Object.entries(o).filter(([k, v]) => !k.startsWith('__') && k !== 'run' && typeof v !== 'function' && v !== undefined);
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries);
  }));
}

function srcFactsJson(src) {
  const rel = relative(REPO_ROOT, src);
  const arr = extractExportedArray(readFileSync(src, 'utf8'), rel);
  if (arr === null || /\.\.\./.test(arr)) return null;
  return normFacts(evalDeclArrayText(arr, rel));
}

/** 现场配对门：不经过印记，逐件查源事实↔编译事实＋编译字节↔印记。 */
function pairMismatches(names, files, cmdDist) {
  const bad = [];
  for (const src of declarationSources(names)) {
    if (!existsSync(src)) continue;
    const key = stampKey(src);
    const dist = distOf(src);
    if (!existsSync(dist)) continue;
    if (files !== null && files[key] !== undefined) {
      const nowDist = sha256(readFileSync(dist, 'utf8'));
      if (files[key].dist === null || files[key].dist !== nowDist) {
        bad.push(relative(REPO_ROOT, src) + ' 的编译产物与印记对不上：dist 变了而印记没重打，请跑 `pnpm build`。');
        continue;
      }
    }
    let srcJson;
    try { srcJson = srcFactsJson(src); } catch (e) { bad.push((e && e.message)); continue; }
    if (srcJson === null || !cmdDist.has(key)) continue;
    if (srcJson !== cmdDist.get(key)) {
      bad.push(relative(REPO_ROOT, src) + ' 的声明内容与 ' + relative(REPO_ROOT, dist) + ' 的编译内容对不上：构建可能跳过了重编（可 touch 源文件后重跑 `pnpm build`）。');
    }
  }
  return bad;
}

async function main() {
  const names = scanCapabilityNames();
  if (STAMP_ONLY) { writeStamp(names); return; }
  const stamp = readStamp();
  if (stamp.state === 'corrupt') {
    console.error('GEN-STAMP FAIL：内容印记 ' + relative(REPO_ROOT, STAMP) + ' 不完整（' + stamp.reason + '）。请跑 `pnpm build` 重打后再跑。');
    process.exitCode = 1; return;
  }
  const stale = staleDeclarations(names, stamp.state === 'ok' ? stamp.files : null);
  if (stale.length) {
    console.error('GEN-STALE FAIL：dist/ 不是这些声明现在的内容的产物，继续跑会把旧声明当事实（假绿）。先 `pnpm build` 再跑。');
    for (const s of stale) console.error('  ' + s);
    process.exitCode = 1; return;
  }
  const capabilities = [];
  for (const name of names) capabilities.push(await loadCapability(name));
  const cmdDist = new Map();
  for (const cap of capabilities) cmdDist.set(cap.name + '/commands.ts', normFacts(cap.list));
  const pair = pairMismatches(names, stamp.state === 'ok' ? stamp.files : null, cmdDist);
  if (pair.length) {
    console.error('GEN-PAIR FAIL：声明源与编译产物对不上（' + pair.length + ' 件），继续跑会把旧声明当事实（假绿）。先 `pnpm build` 再跑。');
    for (const s of pair) console.error('  ' + s);
    process.exitCode = 1; return;
  }
  merge(capabilities);
  const targets = [{ path: join(SRC_DIR, 'cli', 'registry.ts'), text: renderRegistryTs(capabilities) }];
  const summary = '命令 ' + capabilities.reduce((n, c) => n + c.list.length, 0) + ' 条；能力 ' + capabilities.length + ' 个（' + capabilities.map((c) => c.name).join('／') + '）';
  if (!CHECK) {
    for (const t of targets) writeFileSync(t.path, t.text);
    console.log('gen 完成：' + summary);
    for (const t of targets) console.log('  ' + relative(REPO_ROOT, t.path) + '  sha256=' + sha256(t.text));
    return;
  }
  const bad = [];
  for (const t of targets) {
    const onDisk = readFileSync(t.path, 'utf8').replace(/\r\n/g, '\n');
    const want = t.text.replace(/\r\n/g, '\n');
    if (onDisk === want) { console.log('GEN-CHECK ok ' + relative(REPO_ROOT, t.path) + ' sha256=' + sha256(want)); continue; }
    const a = onDisk.split('\n'); const b = want.split('\n');
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
    bad.push(relative(REPO_ROOT, t.path) + ' 与生成器输出不一致（第 ' + (i + 1) + ' 行起）：\n  盘上：' + String(a[i]).slice(0, 200) + '\n  生成：' + String(b[i]).slice(0, 200));
  }
  if (bad.length) {
    console.error('GEN-CHECK FAIL：' + summary);
    for (const b of bad) console.error('  ' + b);
    console.error('  生成物是派生件：手改无效。跑 `pnpm gen` 重生成，或改权威声明（各能力 commands.ts）。');
    process.exitCode = 1; return;
  }
  console.log('GEN-CHECK PASS：' + summary);
}

const RUN_AS_SCRIPT = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (RUN_AS_SCRIPT) await main();
