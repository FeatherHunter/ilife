#!/usr/bin/env node
// 作息命令汇总位的生成器（#780 Layer1）：把「一条命令的事实」从五个能力目录的权威声明
// 确定性地派生成三件生成物，配 `pnpm gen:check`（生成物 ≠ 生成器输出即红）。
//
// 输入（**唯一权威源**）：`src/<能力>/commands.ts` 导出的唯一声明数组 ＋
//   `src/<能力>/routes.ts` 导出的唯一路由数组（编译后 `dist/<能力>/commands.js`／`routes.js`）。
//   扫描顺序不影响产物：`merge()` 最后按（写前读后、键名码点升序）排，路由按 `order` 排。
// 输出（每件文件头一句「由本脚本生成，勿手改」）：
//   ① `src/cli/keys.ts`（键集＋键→形状，Layer2 由 `render/envelope.ts` 消费）；
//   ② `src/cli/registry.ts`（一能力一行，Layer2 由分派层消费，switch 整段删）；
//   ③ `src/triggers/routes.generated.ts`（路由归并，Layer2 由 `routeWakeword`／速查／HELP 构建消费）。
// 不派生的落点（本次不动）：`packages/base-combos/combos.yaml`（跨技能登记禁区，照 bill；
//   作息命令无 combos 消费者）与 `scripts/build-help.mjs`（作息走 HELP-AUTO 块，无 REPR 表要写）。
//
// 新鲜度（照卡路里同构，内容判据，不看时间戳）：生成器读的是**编译后**的声明模块，故先查
//   `dist/.gen-inputs.json` 内容印记 v2（每条声明源记一对哈希 `{src, dist}`＝源文本 sha256 ＋
//   编译产物 `.js` 文本 sha256，由根 `pnpm build` 在 `tsc -b` 之后调本脚本 `--stamp` 写入）
//   配现场配对门（`checkPair()`：源文本里正则抽出的键／短语事实与 dist 模块事实逐件比对）：
//   · 源内容没变 ⇒ 放行；· 源变了没重建 ⇒ `GEN-STALE FAIL`（医嘱：跑根 `pnpm build` 再跑一次）；
//   · 改源＋保 mtime 跳过重编＋印记已重签 ⇒ `GEN-PAIR FAIL`（现场比对不信任印记）。
// Layer1 奇偶校验（过渡期双源机守）：归并路由（去 `order`、归一化缺省）必须与今日
//   `WAKE_TABLE` 逐条相等（含顺序），否则 `GEN-WAKE FAIL`——Layer2 退役 `WAKE_TABLE` 时此门退役。
//
// 确定性：同一份声明跑两次 `pnpm gen`，产物逐字节相同。
// 用法：`pnpm gen`（写盘）／`pnpm gen:check`（只比对，不等即 exit 1）。二者都需先有 `dist/`。
// `--stamp` 是给根 `pnpm build` 用的第三个模式：只打内容印记。
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
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
/** #703 · 写命令的信封形状（唯一事实源）：写声明不写形状，由本文件合成派生品。 */
const WRITE_SHAPE = 'receipt';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const rel = (p) => relative(REPO_ROOT, p);
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

/** 扫 `src/<能力>/commands.ts`：能力名升序（确定性排序的第一半）。 */
export function scanCapabilityNames() {
  return readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name)
    .filter((name) => existsSync(join(SRC_DIR, name, 'commands.ts')))
    .sort();
}

/** 读一个能力目录的命令声明：引编译后模块，取唯一的数组导出；字段按口径必填。 */
export async function loadCapability(name) {
  const distPath = join(DIST_DIR, name, 'commands.js');
  if (!existsSync(distPath)) throw new Error('缺 ' + rel(distPath) + '：请先跑根 `pnpm build`');
  const mod = await import(pathToFileURL(distPath).href);
  const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v));
  if (arrays.length !== 1) {
    throw new Error('src/' + name + '/commands.ts 必须恰好导出一个声明数组，实得 ' + arrays.length);
  }
  const [exportName, list] = arrays[0];
  const idx = await import(pathToFileURL(join(DIST_DIR, name, 'index.js')).href).catch(() => null);
  if (!idx || !Array.isArray(idx[exportName])) {
    throw new Error('src/' + name + '/index.ts 须再导出那个数组（生成的 registry 从 `../' + name + '/index.js` 取）：' + exportName);
  }
  for (const spec of list) {
    for (const field of ['kind', 'key', 'title', 'wakeWord', 'example']) {
      if (typeof spec?.[field] !== 'string' || spec[field] === '') {
        throw new Error(name + ' 的声明缺 ' + field + '：' + JSON.stringify(spec?.key));
      }
    }
    if (typeof spec?.run !== 'function') throw new Error(name + ' 的声明缺 run（须为函数）：' + spec?.key);
    if (spec.kind === 'read') {
      if (typeof spec.shape !== 'string' || spec.shape === '') throw new Error(name + ' 的读声明缺 shape：' + spec.key);
    } else if (spec.kind !== 'write') {
      throw new Error(name + ' 的声明 kind 只认 write／read：' + spec.key);
    }
    if (!spec.example.includes(spec.key)) throw new Error(name + ' 的示例须含命令名（照抄即能跑）：' + spec.key);
  }
  return { name, exportName, list };
}

/** 读一个能力目录的路由声明：同命令声明，取唯一的数组导出；条目按口径必填。 */
export async function loadRoutes(name) {
  const distPath = join(DIST_DIR, name, 'routes.js');
  if (!existsSync(distPath)) throw new Error('缺 ' + rel(distPath) + '：请先跑根 `pnpm build`');
  const mod = await import(pathToFileURL(distPath).href);
  const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v));
  if (arrays.length !== 1) {
    throw new Error('src/' + name + '/routes.ts 必须恰好导出一个路由数组，实得 ' + arrays.length);
  }
  const [exportName, list] = arrays[0];
  const idx = await import(pathToFileURL(join(DIST_DIR, name, 'index.js')).href).catch(() => null);
  if (!idx || !Array.isArray(idx[exportName])) {
    throw new Error('src/' + name + '/index.ts 须再导出那个路由数组：' + exportName);
  }
  for (const e of list) {
    if (typeof e?.phrase !== 'string' || e.phrase === '') throw new Error(name + ' 的路由缺 phrase');
    if (typeof e?.key !== 'string' || e.key === '') throw new Error(name + ' 的路由缺 key');
    if (!Number.isInteger(e?.order) || e.order < 0) throw new Error(name + ' 的路由缺 order（须为非负整数）：' + e?.phrase);
    if (e.needs !== undefined && !Array.isArray(e.needs)) throw new Error(name + ' 的路由 needs 须为数组：' + e.phrase);
  }
  return { name, exportName, list };
}

const DECL_FILES = (name) => ['commands.ts', 'routes.ts'].map((f) => join(SRC_DIR, name, f));

/** 内容印记：10 条声明源各记 `{src, dist}`（源文本 sha256 ＋ 编译产物文本 sha256，缺席记 null）。 */
export function computeStamp(names) {
  const files = {};
  for (const name of names) {
    for (const src of DECL_FILES(name)) {
      const dist = join(DIST_DIR, name, src.endsWith('commands.ts') ? 'commands.js' : 'routes.js');
      files[rel(src)] = {
        src: sha256(readFileSync(src, 'utf8')),
        dist: existsSync(dist) ? sha256(readFileSync(dist, 'utf8')) : null,
      };
    }
  }
  return { version: STAMP_VERSION, files };
}

export function runStamp(names) {
  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(STAMP, JSON.stringify(computeStamp(names), null, 2) + '\n');
  console.log('GEN-STAMP ok ' + rel(STAMP));
}

/** 陈旧门：源或产物的内容与上次 `--stamp` 不同 ⇒ `GEN-STALE FAIL`（医嘱可执行）。 */
export function checkStale(names) {
  if (!existsSync(STAMP)) {
    console.log('GEN-STAMP WARN：无印记，不判陈旧（只查编译产物在不在）');
    for (const name of names) {
      for (const f of ['commands.js', 'routes.js']) {
        if (!existsSync(join(DIST_DIR, name, f))) throw new Error('缺 ' + rel(join(DIST_DIR, name, f)) + '：请先跑根 `pnpm build`');
      }
    }
    return;
  }
  const stamp = JSON.parse(readFileSync(STAMP, 'utf8'));
  const bad = [];
  for (const name of names) {
    for (const src of DECL_FILES(name)) {
      const dist = join(DIST_DIR, name, src.endsWith('commands.ts') ? 'commands.js' : 'routes.js');
      const want = stamp.files?.[rel(src)];
      const now = {
        src: sha256(readFileSync(src, 'utf8')),
        dist: existsSync(dist) ? sha256(readFileSync(dist, 'utf8')) : null,
      };
      if (!want || want.src !== now.src || want.dist !== now.dist) bad.push(rel(src));
    }
  }
  if (bad.length > 0) {
    throw new Error('GEN-STALE FAIL：以下声明源的内容与上次 `pnpm build` 时不同，先跑根 `pnpm build` 再跑一次：' + bad.join('、'));
  }
}

/** 现场配对门：源文本里正则抽出的键／短语事实与 dist 模块事实逐件比对（不信任印记）。 */
export function checkPair(capabilities, routes) {
  const srcKeys = new Set();
  for (const name of scanCapabilityNames()) {
    const text = readFileSync(join(SRC_DIR, name, 'commands.ts'), 'utf8');
    for (const m of text.matchAll(/key:\s*'([^']+)'/g)) srcKeys.add(m[1]);
  }
  const distKeys = new Set(capabilities.flatMap((c) => c.list.map((s) => s.key)));
  const keyDiff = [...srcKeys].filter((k) => !distKeys.has(k)).concat([...distKeys].filter((k) => !srcKeys.has(k)));
  if (keyDiff.length > 0) throw new Error('GEN-PAIR FAIL：源文本键集 ≠ 编译键集：' + keyDiff.join('、'));
  const srcRoutes = [];
  for (const name of scanCapabilityNames()) {
    const text = readFileSync(join(SRC_DIR, name, 'routes.ts'), 'utf8');
    for (const m of text.matchAll(/phrase:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?key:\s*'([^']+)'[\s\S]*?order:\s*(\d+)/g)) {
      srcRoutes.push(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\') + '|' + m[2] + '|' + m[3]);
    }
  }
  const distRoutes = routes.flatMap((r) => r.list).map((e) => e.phrase + '|' + e.key + '|' + e.order).sort();
  const a = [...srcRoutes].sort().join('\n'), b = distRoutes.join('\n');
  if (a !== b) throw new Error('GEN-PAIR FAIL：源文本路由 ≠ 编译路由（短语／键／order 逐件对）');
}

/** 代表唤醒词门：声明写的词须是本能力路由里真有且指回本键的词。 */
export function wakeWordGate(capabilities, routes) {
  const byKey = new Map();
  for (const r of routes) for (const e of r.list) {
    if (!byKey.has(e.key)) byKey.set(e.key, new Set());
    byKey.get(e.key).add(e.phrase);
  }
  for (const c of capabilities) for (const s of c.list) {
    if (!byKey.get(s.key)?.has(s.wakeWord)) {
      throw new Error(c.name + ' 的代表唤醒词不是本键路由里的真词：' + s.key + ' ← ' + s.wakeWord);
    }
  }
}

/** Layer1 奇偶校验：归并路由（去 order、归一化缺省）须与今日 WAKE_TABLE 逐条相等（含顺序）。 */
export async function checkWakeParity(routes) {
  const distPath = join(DIST_DIR, 'policy', 'wakewords.js');
  if (!existsSync(distPath)) throw new Error('缺 ' + rel(distPath) + '：奇偶校验需编译产物');
  const { WAKE_TABLE } = await import(pathToFileURL(distPath).href);
  const merged = routes.flatMap((r) => r.list).sort((x, y) => x.order - y.order);
  const norm = (e) => JSON.stringify({
    phrase: e.phrase, key: e.key,
    needs: e.needs === undefined ? undefined : [...e.needs],
    preset: e.preset === undefined ? undefined : stable(e.preset),
  });
  if (merged.length !== WAKE_TABLE.length) {
    throw new Error('GEN-WAKE FAIL：归并路由 ' + merged.length + ' 条 ≠ WAKE_TABLE ' + WAKE_TABLE.length + ' 条');
  }
  for (let i = 0; i < merged.length; i++) {
    if (norm(merged[i]) !== norm(WAKE_TABLE[i])) {
      throw new Error('GEN-WAKE FAIL：第 ' + i + ' 条不一致——归并：' + norm(merged[i]) + '；WAKE_TABLE：' + norm(WAKE_TABLE[i]));
    }
  }
}

const stable = (o) => JSON.stringify(Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k] && typeof o[k] === 'object' ? stable(o[k]) : o[k]])));

/** 命令合流：同键两处声明即抛；示例必填含键；确定性排序（写前读后、键名码点升序）。 */
export function merge(capabilities) {
  const out = new Map();
  for (const cap of capabilities) {
    for (const decl of cap.list) {
      if (out.has(decl.key)) throw new Error('命令键重复登记：' + decl.key + '（又见 ' + cap.name + '）');
      if (typeof decl.example !== 'string' || decl.example === '') {
        throw new Error(cap.name + ' 的声明缺 example：' + decl.key);
      }
      out.set(decl.key, {
        kind: decl.kind, key: decl.key,
        shape: decl.kind === 'write' ? WRITE_SHAPE : decl.shape,
        title: decl.title, from: cap.name,
      });
    }
  }
  const all = [...out.values()];
  const rank = (e) => (e.kind === 'write' ? 0 : 1);
  all.sort((x, y) => rank(x) - rank(y) || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
  return all;
}

export function renderKeysTs(entries) {
  const L = ['// ' + BANNER, "import type { EnvelopeShape } from 'base-link-core';", ''];
  L.push('export const SCHEDULE_KEYS = [');
  for (const e of entries) L.push('  ' + q(e.key) + ',');
  L.push('] as const;');
  L.push('export type ScheduleCommandKey = (typeof SCHEDULE_KEYS)[number];');
  L.push('export const SCHEDULE_KEY_SHAPES: Record<ScheduleCommandKey, EnvelopeShape> = {');
  for (const e of entries) L.push('  ' + q(e.key) + ': ' + q(e.shape) + ',');
  L.push('};');
  return L.join('\n') + '\n';
}

export function renderRegistryTs(capabilities) {
  const L = ['// ' + BANNER];
  for (const c of [...capabilities].sort((x, y) => (x.name < y.name ? -1 : 1))) {
    L.push('export { ' + c.exportName + " } from '../" + c.name + "/index.js';");
  }
  return L.join('\n') + '\n';
}

export function renderRoutesGenerated(routes) {
  const merged = routes.flatMap((r) => r.list).sort((x, y) => x.order - y.order);
  const L = ['// ' + BANNER, 'export const SCHEDULE_ROUTES = ['];
  for (const e of merged) {
    const parts = ['phrase: ' + q(e.phrase), 'key: ' + q(e.key)];
    if (e.needs !== undefined) parts.push('needs: [' + e.needs.map(q).join(', ') + ']');
    if (e.preset !== undefined) parts.push('preset: ' + JSON.stringify(e.preset));
    parts.push('order: ' + e.order);
    L.push('  { ' + parts.join(', ') + ' },');
  }
  L.push('] as const;');
  return L.join('\n') + '\n';
}

const TARGETS = (entries, capabilities, routes) => [
  { path: join(SRC_DIR, 'cli', 'keys.ts'), want: renderKeysTs(entries) },
  { path: join(SRC_DIR, 'cli', 'registry.ts'), want: renderRegistryTs(capabilities) },
  { path: join(SRC_DIR, 'triggers', 'routes.generated.ts'), want: renderRoutesGenerated(routes) },
];

export async function loadAll() {
  const names = scanCapabilityNames();
  const capabilities = [];
  for (const n of names) capabilities.push(await loadCapability(n));
  const routes = [];
  for (const n of names) routes.push(await loadRoutes(n));
  return { names, capabilities, routes };
}

export async function runCheck() {
  const { names, capabilities, routes } = await loadAll();
  checkStale(names);
  checkPair(capabilities, routes);
  wakeWordGate(capabilities, routes);
  await checkWakeParity(routes);
  const entries = merge(capabilities);
  // 同键跨能力路由即抛（键归属唯一）。
  const keyCap = new Map();
  for (const r of routes) for (const e of r.list) {
    if (!keyCap.has(e.key)) keyCap.set(e.key, r.name);
    else if (keyCap.get(e.key) !== r.name) throw new Error('路由键跨能力：' + e.key);
  }
  for (const e of entries) {
    if (!keyCap.has(e.key)) throw new Error('命令无路由：' + e.key);
  }
  const fails = [];
  for (const t of TARGETS(entries, capabilities, routes)) {
    const onDisk = existsSync(t.path) ? readFileSync(t.path, 'utf8') : null;
    if (onDisk === t.want) {
      console.log('GEN-CHECK ok ' + rel(t.path) + ' sha256=' + sha256(t.want));
    } else {
      fails.push(t.path);
    }
  }
  if (fails.length > 0) {
    console.error('GEN-CHECK FAIL：以下生成物 ≠ 生成器输出（跑 `pnpm gen` 重生成）：' + fails.map(rel).join('、'));
    process.exitCode = 1;
    return;
  }
  console.log('GEN-CHECK PASS：3 件生成物与生成器输出一致');
}

export async function runGen() {
  const { names, capabilities, routes } = await loadAll();
  checkStale(names);
  checkPair(capabilities, routes);
  wakeWordGate(capabilities, routes);
  await checkWakeParity(routes);
  const entries = merge(capabilities);
  for (const t of TARGETS(entries, capabilities, routes)) {
    mkdirSync(dirname(t.path), { recursive: true });
    writeFileSync(t.path, t.want);
    console.log('GEN-WRITE ok ' + rel(t.path) + ' sha256=' + sha256(t.want));
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    if (STAMP_ONLY) runStamp(scanCapabilityNames());
    else if (CHECK) await runCheck();
    else await runGen();
  } catch (e) {
    console.error(String(e?.message || e));
    process.exitCode = 1;
  }
}
