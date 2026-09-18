#!/usr/bin/env node
// #295 · 命令汇总位的生成器（地图 #293 第二级）：把「一条命令的事实」从各能力的权威声明
// 确定性地派生成四件生成物，配 `pnpm gen:check`（生成物 ≠ 生成器输出即红）。
//
// 输入（**两个权威源，一个键恰住一处**）：
//   ① 已搬迁的能力：`src/<能力>/commands.ts` 导出的唯一一个声明数组（编译后 `dist/<能力>/commands.js`）；
//   ② 未搬迁的命令：`src/cli/legacy/scene-NN.ts` 各导出它自己那一段（`#313` 起按场景分区；
//      此前是单一清单 `src/cli/legacyCommands.ts`）。扫描口径＝**按文件名升序**（确定性），
//      所以「删一个场景的清单」只动它自己那个文件，与别的场景零交集。
//   扫描顺序不影响产物：`merge()` 最后按键排序（写键在前、读键在后），故与写入次序无关。
// 一条命令的事实（键／形状／标题／代表唤醒词／工作流程名／可执行示例）全在两处声明里，没有第三处。
// 输出（每个文件头一句「本文件由 scripts/gen-cli.mjs 生成，勿手改」）：
//   ① `src/cli/keys.ts`（导出名不变，调用方导入面不动）；
//   ② `src/cli/registry.ts`（一能力一行，由扫描得出，人工不必再碰）；
//   ③ `packages/base-combos/combos.yaml` 的 calorie 镜像段（标记块）；
//   ④ `scripts/build-help.mjs` 的 `REPR` 表（标记块；手写表退役）；
//   ⑤ `scripts/build-help.mjs` 的 `EXAMPLE` 表（标记块；#295 返修 A3——原先这里有 101 条手写 `case`，
//      是同一文件里第二处手写「一条命令的事实」：加一条命令不补 case 就 `default: throw`，SKILL.md 停更）；
//   ⑥ `scripts/build-help.mjs` 的 `FLOW` 表（标记块；#338——命令 → 工作流程名，源是声明上的可选 `flow`）。
//
// 新鲜度（#295 返修 A4 立、第二轮 N1 换成**内容**判据、#325 补成**配对**判据）：生成器读的是**编译后**
// 的声明模块，所以在读之前先查「`dist/` 是不是这些声明的内容产物」——只改 `src/` 不 `pnpm build` 时，
// 旧 `dist/` 会让 `gen`／`gen:check` 双双按旧声明判绿（假绿，P4 实测）。查法是**内容印记** v2
// （`dist/.gen-inputs.json`：每条声明源记一对哈希 `{src, dist}`＝源文本 sha256 ＋ 它编译产物 `.js`
// 文本 sha256，由 `pnpm build` 在 `tsc -b` 之后调本脚本的 `--stamp` 写入）配**现场配对门**
// （`pairMismatches()`：不经过印记，直接把源里的声明事实与 dist 编译出的事实逐件比对），**都不看时间戳**：
//   · 源的内容没变（`git checkout -- .`／`touch` 只动 mtime）⇒ 印记相符、现场相符 ⇒ 放行；
//   · 源的内容真变了又没重建 ⇒ 印记不符 ⇒ `GEN-STALE FAIL`（医嘱**可执行**：build 必重打印记）；
//   · 源改了＋保 mtime 让 `tsc -b` 跳过重编＋`--stamp` 已重签（#325 假绿链）⇒ dist 字节绑定与现场
//     事实比对必有一处对不上 ⇒ `GEN-PAIR FAIL`（印记自洽也拦不住它，因为现场比对不信任印记）。
// 为什么不能只看 mtime（旧判据的死结）：`tsc -b` 在 emit 与现有 `dist/` 逐字节相同时**不重写文件**，
// 于是源 mtime 被正常动作刷新后 dist 的 mtime 永远追不平 —— 门恒红而 `pnpm build` 解不开，`gen` 一并被挡死。
//
// 确定性：键序＝**写键（键名升序）在前、读键（键名升序）在后**；能力名与键名一一对应，
// 故同一份输入必得逐字节同一份输出（判据不是「用了生成器」，而是「确定性 ＋ 生成物入库 ＋ CI 校验」）。
//
// 用法：`pnpm gen`（写盘）／`pnpm gen:check`（只比对，不等即 exit 1）。二者都需先 `pnpm build`
// 出 `dist/`——生成器读的是编译后的声明模块（TS 不能直接被 node 引）。
// `--stamp` 是给 `pnpm build` 用的第三个模式（不是给人手敲的）：只给声明源打内容印记（见下「新鲜度」）。
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { loadDecls, renderRoutesGenerated, routeDeclarationSources } from './gen-routes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SRC_DIR = join(PKG_DIR, 'src');
const DIST_DIR = join(PKG_DIR, 'dist');
const REPO_ROOT = join(PKG_DIR, '..', '..');
const CHECK = process.argv.includes('--check');
const STAMP_ONLY = process.argv.includes('--stamp');

const BANNER = '本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。';
const COMBO_YAML = join(REPO_ROOT, 'packages', 'base-combos', 'combos.yaml');
const BUILD_HELP = join(PKG_DIR, 'scripts', 'build-help.mjs');
const YAML_START = '# -- GEN-CLI-START calorie 段（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）';
const YAML_END = '# -- GEN-CLI-END calorie 段';
const REPR_START = '// -- GEN-CLI-START REPR 表（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）';
const REPR_END = '// -- GEN-CLI-END REPR 表';
const EXAMPLE_START = '// -- GEN-CLI-START EXAMPLE 表（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）';
const EXAMPLE_END = '// -- GEN-CLI-END EXAMPLE 表';
const FLOW_START = '// -- GEN-CLI-START FLOW 表（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）';
const FLOW_END = '// -- GEN-CLI-END FLOW 表';
/** #368 · 预检确认页表（写命令 → 它先出的那一页命令）：源＝能力目录 `src/body/wizardPlate.ts` 的
 *  `WIZARD_WRITE_KEYS`（两个向导页各自服务的写命令），本生成器只做**反查**（页 → 写命令），
 *  写命令到页的映射不在别处存第二份。 */
const PRECHECK_START = '// -- GEN-CLI-START 预检页表（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）';
const PRECHECK_END = '// -- GEN-CLI-END 预检页表';
/** #295 返修第二轮 N1 · 内容印记，#325 升到 v2（配对）：每条声明源记一对哈希
 * `{src, dist}`＝源文本 sha256 ＋ 它编译产物 `.js` 文本 sha256（编译产物缺席记 `dist: null`），
 * 由 `pnpm build`（`tsc -b` 之后）调 `--stamp` 写入。住 `dist/` 里（与 dist 同生共死，且
 * `pnpm gen:check` 在仓外沙箱跑时随 dist 一起被复制）。 */
const STAMP = join(DIST_DIR, '.gen-inputs.json');
const STAMP_VERSION = 2;
/** `src/cli/legacy/` 里**不是**场景分片的文件：`index.ts` 是汇总（不声明命令）、`types.ts` 只给声明形状。
 * 两者都不该被当成声明源读——汇总若也算输入，就成了「第三处清单」。 */
const LEGACY_NON_SCENE = new Set(['index.ts', 'types.ts']);

/** 读一个能力目录的声明：扫 `src/*&#47;commands.ts` 定名，引编译后模块取那个唯一的数组导出。 */
async function loadCapability(name) {
  const distPath = join(DIST_DIR, name, 'commands.js');
  if (!existsSync(distPath)) {
    throw new Error('缺 ' + relative(REPO_ROOT, distPath) + '：生成器读编译后的声明模块，请先 `pnpm build`');
  }
  const mod = await import(pathToFileURL(distPath).href);
  const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v));
  if (arrays.length !== 1) {
    throw new Error(
      'src/' + name + '/commands.ts 必须恰好导出一个声明数组，实得 ' + arrays.length +
        ' 个（' + arrays.map(([k]) => k).join('／') + '）',
    );
  }
  const [exportName, list] = arrays[0];
  for (const spec of list) {
    // `wakeWord` **可缺**（缺了速查表退回命令名），但**写了就必须是真词**——生成期由 `wakeWordGate()`
    // 逐条查「这个词路由回本键」（#343：票面原话「让主张由机器拦，而不是只写在文件头注释里」）；
    // 其余五个字段必填。
    for (const field of ['kind', 'key', 'title', 'example']) {
      if (typeof spec?.[field] !== 'string') throw new Error(name + ' 的声明缺 ' + field + '：' + JSON.stringify(spec));
    }
    // #703 · 信封形状：读声明的 `shape` 仍是声明面的事实（list／detail／stat／analysis／fallback），
    // 写声明的形状不写在声明上——写命令一律 receipt 形，那件事的唯一定义地是本文件（`WRITE_SHAPE`）。
    if (spec.kind === 'read' && typeof spec.shape !== 'string') {
      throw new Error(name + ' 的读声明缺 shape：' + JSON.stringify(spec));
    }
  }
  return { name, exportName, list };
}

/** 扫未搬迁清单的分区目录 `src/cli/legacy/*.ts`：**按文件名升序**（确定性；`types.ts` 只给类型，不导出数组）。
 * 一个场景一个文件，故「搬走一个场景的清单」只动它自己那个文件。 */
function scanLegacySceneNames() {
  const dir = join(SRC_DIR, 'cli', 'legacy');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.ts'))
    .map((d) => d.name)
    .sort();
}

/** 读未搬迁清单的一个场景分区：引编译后模块，取它唯一那个声明数组导出（形状同 `loadCapability`）。 */
async function loadLegacyScene(file) {
  const distPath = join(DIST_DIR, 'cli', 'legacy', file.replace(/\.ts$/, '.js'));
  if (!existsSync(distPath)) {
    throw new Error('缺 ' + relative(REPO_ROOT, distPath) + '：生成器读编译后的声明模块，请先 `pnpm build`');
  }
  const mod = await import(pathToFileURL(distPath).href);
  const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v));
  if (arrays.length === 0) return null; // `types.ts` 这类只给类型的文件：不算声明源
  if (arrays.length !== 1) {
    throw new Error(
      'src/cli/legacy/' + file + ' 必须恰好导出一个声明数组，实得 ' + arrays.length +
        ' 个（' + arrays.map(([k]) => k).join('／') + '）',
    );
  }
  const [exportName, list] = arrays[0];
  for (const spec of list) {
    // `wakeWord` **可缺**（缺了速查表退回命令名），但**写了就必须是真词**（同上，见 `wakeWordGate()`）；
    // 其余五个字段必填。
    for (const field of ['kind', 'key', 'title', 'example']) {
      if (typeof spec?.[field] !== 'string') throw new Error('legacy/' + file + ' 的声明缺 ' + field + '：' + JSON.stringify(spec));
    }
    if (spec.kind === 'read' && typeof spec.shape !== 'string') {
      throw new Error('legacy/' + file + ' 的读声明缺 shape：' + JSON.stringify(spec));
    }
  }
  return { name: 'legacy/' + file, exportName, list };
}

/** 未搬迁清单的声明源（文件名升序，跳过 `index.ts`／`types.ts`）；`--stamp` 与陈旧守卫都按这份算。 */
function legacySources() {
  return scanLegacySceneNames()
    .filter((f) => !LEGACY_NON_SCENE.has(f))
    .map((f) => join(SRC_DIR, 'cli', 'legacy', f));
}

/** 合流未搬迁清单的 10 个场景分区：**两个文件声明同一个键即抛**（分区后同场景／跨场景都拦）。
 * 导出给 `test/legacy-partition-313.test.mjs` 与证据脚本复用——它们要能的正是**同一个守卫**，
 * 而不是各自重写一份「跨场景不许重复」的判断（铁律二：判断只写一处）。 */
export function mergeLegacyPartition(parts) {
  const out = [];
  const seen = new Map();
  for (const part of parts) {
    if (part === null) continue;
    for (const decl of part.list) {
      const earlier = seen.get(decl.key);
      if (earlier !== undefined) {
        throw new Error('命令键重复登记：' + decl.key + '（' + earlier + ' 与 ' + part.name + ' 都声明了它）');
      }
      seen.set(decl.key, part.name);
      out.push(decl);
    }
  }
  return out;
}

/** 扫 `src/<能力>/commands.ts`：能力名升序（确定性排序的第一半）。 */
function scanCapabilityNames() {
  return readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name)
    .filter((name) => existsSync(join(SRC_DIR, name, 'commands.ts')))
    .sort();
}

/** 两个权威源合流：同键两个人声明即抛（只在代码缺陷时触发）。 */
function merge(legacy, capabilities) {
  const out = new Map();
  const put = (decl, from) => {
    if (out.has(decl.key)) throw new Error('命令键重复登记：' + decl.key + '（又见 ' + from + '）');
    if (typeof decl.example !== 'string' || decl.example === '') {
      throw new Error(from + ' 的声明缺 example（SKILL.md 的「例」列要照抄能跑）：' + decl.key);
    }
    out.set(decl.key, {
      kind: decl.kind,
      key: decl.key,
      shape: decl.kind === 'write' ? WRITE_SHAPE : decl.shape,
      title: decl.title,
      wakeWord: typeof decl.wakeWord === 'string' ? decl.wakeWord : undefined,
      flows: Array.isArray(decl.flows) ? decl.flows : undefined,
      example: decl.example,
      from,
    });
  };
  for (const decl of legacy) put(decl, 'legacy scene 分区');
  for (const cap of capabilities) for (const decl of cap.list) put(decl, cap.name);
  const all = [...out.values()];
  // 确定性排序：写键在前、读键在后，各按**键名码点升序**。
  const rank = (e) => (e.kind === 'write' ? 0 : 1);
  all.sort((a, b) => rank(a) - rank(b) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return all;
}

/** #703 · 写命令的信封形状（唯一事实源）：写声明的形状不写在声明上，由本文件合成两处派生品。 */
const WRITE_SHAPE = 'receipt';

const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

function renderKeysTs(entries) {
  const writes = entries.filter((e) => e.kind === 'write');
  const reads = entries.filter((e) => e.kind === 'read');
  const L = [];
  L.push('/** ' + BANNER);
  L.push(' *');
  L.push(' * registry 合法键表：写 ' + writes.length + ' ＋ 读 ' + reads.length + ' ＝ ' + entries.length + ' 条。');
  L.push(' * 一条命令的**事实**住它自己的能力目录（`src/<能力>/commands.ts`）或未搬迁清单');
  L.push(' * （`src/cli/legacyCommands.ts`）；本文件只是那两处的派生，不手改。');
  L.push(' *');
  L.push(' * 键序＝写键（键名升序）在前、读键（键名升序）在后（确定性排序，见生成器）。');
  L.push(' * 背景照旧：VIEW_KEYS/PHOTO_VIEW_KEYS 用下划线键，过不了 link-core registry（KEY_RE 只许');
  L.push(' * [a-z0-9-.]），T11 出口把下划线改成点（calorie.view.home）复用同一语义。');
  L.push(' * 仅 type-only 消费 link-core（零运行时依赖）；envelope 手工装配，字段对齐 link-core 0.1.0。');
  L.push(' * 缺失阻断不返空：未知键抛，调用方 exit 3。');
  L.push(' */');
  L.push("import type { EnvelopeShape } from 'base-link-core';");
  L.push("import { CalorieRenderError } from '../render/errors.js';");
  L.push('');
  L.push("export const ENVELOPE_VERSION = '0.1.0' as const;");
  L.push("export const CALORIE_SKILL = 'calorie' as const;");
  L.push('');
  L.push('/** registry 合法键正则（与 base-link-core registry.KEY_RE 同值，本地拷贝不运行时 import）。 */');
  L.push('export const COMBO_KEY_RE = /^[a-z][a-z0-9-]*\\.[a-z0-9][a-z0-9-.]*$/;');
  L.push('');
  L.push('export const CALORIE_WRITE_COMBOS = {');
  for (const e of writes) L.push('  ' + q(e.key) + ": { shape: " + q(WRITE_SHAPE) + ' as EnvelopeShape, title: ' + q(e.title) + ' },');
  L.push('} as const;');
  L.push('');
  L.push('export type CalorieWriteKey = keyof typeof CALORIE_WRITE_COMBOS;');
  L.push('');
  L.push('export function isCalorieWriteKey(key: string): key is CalorieWriteKey {');
  L.push('  return Object.prototype.hasOwnProperty.call(CALORIE_WRITE_COMBOS, key);');
  L.push('}');
  L.push('');
  L.push('export const CALORIE_COMBOS = {');
  L.push('  ...(CALORIE_WRITE_COMBOS as unknown as Record<string, { shape: EnvelopeShape; title: string }>),');
  for (const e of reads) L.push('  ' + q(e.key) + ": { shape: " + q(e.shape) + ' as EnvelopeShape, title: ' + q(e.title) + ' },');
  L.push('} as const;');
  L.push('');
  L.push('export type CalorieComboKey = keyof typeof CALORIE_COMBOS;');
  L.push('');
  L.push('export function calorieShapeFor(key: string): EnvelopeShape {');
  L.push('  if (!COMBO_KEY_RE.test(key)) {');
  L.push("    throw new CalorieRenderError('bad-input', '非法 registry key：' + JSON.stringify(key) + '（形如 skill.combo）');");
  L.push('  }');
  L.push('  const hit = (CALORIE_COMBOS as Record<string, { shape: EnvelopeShape }>)[key];');
  L.push("  if (!hit) throw new CalorieRenderError('bad-input', '未知 calorie key：' + key);");
  L.push('  return hit.shape;');
  L.push('}');
  L.push('');
  L.push('export function assertCalorieKey(key: string): asserts key is CalorieComboKey {');
  L.push('  calorieShapeFor(key);');
  L.push('}');
  L.push('');
  return L.join('\n');
}

function renderRegistryTs(capabilities) {
  const L = [];
  L.push('/** ' + BANNER);
  L.push(' *');
  L.push(' * 命令索引（一能力一行）：把各能力目录里的声明汇总成一张查表。');
  L.push(' * 对外两件：`REGISTRY`（key → 声明）与 `REGISTRY_KEYS`（全部键）。');
  L.push(' * 两个分派文件（`cmd_read.ts`／`write.ts`）只认这张表：命中即走能力目录，未命中的老键落各自的 switch。');
  L.push(' *');
  L.push(' * **新加一个能力＝建它的 `commands.ts`**（扫到即自动进来）；新加一条命令＝改它的声明，本文件不动。');
  L.push(' */');
  L.push("import type { CommandSpec } from '../shared/commandSpec.js';");
  for (const cap of capabilities) {
    L.push("import { " + cap.exportName + " } from '../" + cap.name + "/index.js';");
  }
  L.push('');
  L.push('const SOURCES: readonly (readonly CommandSpec[])[] = [');
  for (const cap of capabilities) L.push('  ' + cap.exportName + ',');
  L.push('];');
  L.push('');
  L.push('/** 汇总各家声明；同键两个人声明即抛（只在代码缺陷时触发，生成期已先拦一道）。 */');
  L.push('function build(sources: readonly (readonly CommandSpec[])[]): Record<string, CommandSpec> {');
  L.push('  const out: Record<string, CommandSpec> = {};');
  L.push('  for (const list of sources) {');
  L.push('    for (const spec of list) {');
  L.push('      if (Object.prototype.hasOwnProperty.call(out, spec.key)) {');
  L.push("        throw new Error('命令键重复登记（两个人声明同一个键）：' + spec.key);");
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

function renderYamlBlock(entries) {
  const L = [YAML_START];
  for (const e of entries) {
    L.push('  - key: ' + e.key);
    L.push('    skill: calorie');
    L.push('    shape: ' + e.shape);
    L.push('    title: ' + e.title);
    L.push('    cmd: skill-calorie');
  }
  L.push(YAML_END);
  return L.join('\n');
}

function renderReprBlock(entries, flows) {
  const L = [REPR_START];
  L.push('// 每组合键一行代表唤醒词（优先真实 TRIGGERS 短语，照片 HELP 10 键原样，通用 HELP 走 lookup）。');
  L.push('const REPR = {');
  for (const e of entries) {
    if (e.wakeWord === undefined) continue;
    L.push('  ' + q(e.key) + ': ' + q(e.wakeWord) + ',');
  }
  L.push('};');
  L.push(REPR_END);
  return L.join('\n');
}

/** #338 · 命令 → 工作流程名（源＝声明上的可选 `flows`）。*/
function renderFlowBlock(entries) {
  const L = [FLOW_START];
  L.push('// #338 · 命令 → 工作流程名（读声明上的可选 `flows`；缺的键此处没有行，不补默认值）。');
  L.push('const FLOW = {');
  for (const e of entries) {
    if (!Array.isArray(e.flows) || e.flows.length === 0) continue;
    L.push('  ' + q(e.key) + ': [' + e.flows.map((f) => q(f)).join(', ') + '],');
  }
  L.push('};');
  L.push(FLOW_END);
  return L.join('\n');
}

/** #295 返修 A3 · SKILL.md 速查表「例」列的来源：原先这里有 101 条手写 `case`（`default: throw`），
 * 是同一文件里第二处「一条命令的事实」。现在逐键从声明的 `example` 字段生成，加一条命令不必碰 `build-help.mjs`。 */
function renderExampleBlock(entries) {
  const L = [EXAMPLE_START];
  L.push('// 每键一行「照抄即能跑」的示例：住声明的 `example` 字段（各能力 `commands.ts`／`legacyCommands.ts`）。');
  L.push('// 无 `--params` 的写法照抄即 exit 2／4——所以新键必须自带可执行示例（#99 生成期结构断言的来意）。');
  L.push('const EXAMPLES = {');
  for (const e of entries) L.push('  ' + q(e.key) + ': ' + q(e.example) + ',');
  L.push('};');
  L.push(EXAMPLE_END);
  return L.join('\n');
}

/** #368 · 预检确认页表：**写命令 → 它先出的那一页命令**（能力目录声明的反查，不手写第二份）。
 *
 *  源＝`src/body/wizardPlate.ts` 的 `WIZARD_WRITE_KEYS`（`{measure: '…measure-add', composition: '…composition-add'}`，
 *  **键名＝页名、值＝该页服务的写命令**）。本函数只做反查：一条写命令有预检页 ⟺ 某个向导页声明它服务这条写命令。
 *  表里出现的每个键都必须在注册表里（不在即抛——不生成读不懂的行）。 */
async function renderPrecheckBlock(entries) {
  const wizardPath = join(DIST_DIR, 'body', 'wizardPlate.js');
  let writeKeys = null;
  if (existsSync(wizardPath)) {
    const mod = await import(pathToFileURL(wizardPath).href);
    writeKeys = mod.WIZARD_WRITE_KEYS ?? null;
  }
  const known = new Set(entries.map((e) => e.key));
  const L = [PRECHECK_START];
  L.push('// 写命令 → 它先出的预检确认页命令（值一律是注册表里的键；读命令与「读—确认—写」那一类没有行）。');
  L.push('// 源＝`src/body/wizardPlate.ts` 的 `WIZARD_WRITE_KEYS`（键名＝页名，值＝该页服务的写命令），本表只做反查。');
  L.push('const PRECHECK_PAGE = {');
  const pairs = writeKeys === null ? [] : Object.entries(writeKeys)
    .map(([pageName, writeKey]) => [writeKey, 'calorie.view.' + pageName + '-wizard'])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [writeKey, pageKey] of pairs) {
    for (const k of [writeKey, pageKey]) {
      if (!known.has(k)) throw new Error('预检页表含注册表里没有的键：' + k);
    }
    L.push('  ' + q(writeKey) + ': ' + q(pageKey) + ',');
  }
  L.push('};');
  L.push(PRECHECK_END);
  return L.join('\n');
}

/** 把标记块替换成生成文本；标记缺失即抛（不静默截断受跟踪的文件）。 */
function replaceBlock(text, start, end, block, path) {
  const si = text.indexOf(start);
  const ei = text.indexOf(end);
  if (si < 0 || ei < 0 || ei < si) throw new Error('标记块缺失：' + relative(REPO_ROOT, path));
  return text.slice(0, si) + block + text.slice(ei + end.length);
}

/** 生成器的输入（声明源）：未搬迁清单的场景分区（`src/cli/legacy/*.ts`，文件名升序）
 * ＋ 每个能力目录的声明 ＋ 路由声明（`src/cli/legacy/routes/*.ts` 与各能力 `routes.ts`——它们住
 * 子目录／不在命令声明扫描面内，必须**显式**纳入，否则「改了路由声明没 build」会被直接放行）。
 * 印记与判陈旧都以它们为准。 */
function declarationSources(names) {
  return [
    ...legacySources(),
    ...names.map((n) => join(SRC_DIR, n, 'commands.ts')),
    ...routeDeclarationSources(),
  ];
}

/** 声明源 → 它编译后的模块路径（印记与陈旧判定都按「源 → dist」配对，一对一路径推导）。 */
function distOf(src) {
  return join(DIST_DIR, relative(SRC_DIR, src).replace(/\\/g, '/').replace(/\.ts$/, '.js'));
}

/** 源在印记里的键：相对 `src/` 的 posix 路径（与仓库绝对位置无关，仓外沙箱复制后仍对得上）。 */
function stampKey(src) {
  return relative(SRC_DIR, src).replace(/\\/g, '/');
}

/** #325 · `--stamp`：给声明源打内容印记 v2（`{src, dist}` 配对）。由 **`pnpm build`** 在 `tsc -b`
 * 之后调用——只有「刚构建完」这一时刻才有资格宣称「dist/ 是这些声明的内容产物」，所以写印记的入口
 * 挂 build，不挂 gen。注意：`--stamp` 仍是无条件重签（它无法独立判断 `tsc -b` 是否跳过），
 * 真正堵假绿的是 `gen`／`gen:check` 入口的 `pairMismatches()` 现场比对，不是这一写。 */
function writeStamp(names) {
  const files = {};
  for (const src of declarationSources(names)) {
    if (!existsSync(src)) continue;
    const dist = distOf(src);
    files[stampKey(src)] = {
      src: sha256(readFileSync(src, 'utf8')),
      dist: existsSync(dist) ? sha256(readFileSync(dist, 'utf8')) : null,
    };
  }
  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(
    STAMP,
    JSON.stringify(
      {
        version: STAMP_VERSION,
        note: '生成器输入（声明源）的内容印记 v2：每条记 {src, dist} 配对（源文本与编译产物 .js 文本的 sha256），由 `pnpm build` 调 `node packages/skill-calorie/scripts/gen-cli.mjs --stamp` 写入；`pnpm gen`／`pnpm gen:check` 按它判陈旧、按现场配对门判脱钩——内容判据，不看时间戳。',
        files,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('GEN-STAMP ok ' + relative(REPO_ROOT, STAMP) + '：声明源 ' + Object.keys(files).length + ' 件（' + Object.keys(files).join('／') + '）');
}

/** #325 · 读印记并验完整：`ok`（可用配对表）／`missing`（文件不在：沿旧口径只告警不判红，
 * 无从判断的状态不当红用）／`corrupt`（JSON 坏／版本不对／条目形状不对：印记不可信即判红，
 * 不拿坏印记判绿）。 */
function readStamp() {
  let raw;
  try {
    raw = readFileSync(STAMP, 'utf8');
  } catch {
    return { state: 'missing' };
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { state: 'corrupt', reason: 'JSON 解析失败（' + (e && e.message) + '）' };
  }
  if (!data || data.version !== STAMP_VERSION || !data.files || typeof data.files !== 'object' || Array.isArray(data.files)) {
    return { state: 'corrupt', reason: 'version 不是 ' + STAMP_VERSION + '（旧印记／外来残留不认）' };
  }
  const files = {};
  for (const [k, v] of Object.entries(data.files)) {
    const distOk = v && typeof v === 'object' && (v.dist === null || (typeof v.dist === 'string' && /^[0-9a-f]{64}$/.test(v.dist)));
    if (!distOk || typeof v.src !== 'string' || !/^[0-9a-f]{64}$/.test(v.src)) {
      return { state: 'corrupt', reason: '条目 ' + k + ' 不是 {src, dist} 配对形状' };
    }
    files[k] = v;
  }
  return { state: 'ok', files };
}

/** #295 返修第二轮 N1 · 新鲜度守卫：**内容**判据，不看时间戳。返回逐条说明（空数组＝新鲜）。
 * 三件事各司其职：① 缺编译产物 ⇒ 报「先 build」；② 印记里没有这条（新文件／仓外沙箱里的假能力）⇒ 无对照，放行；
 * ③ 印记源哈希与现内容不符 ⇒ 源的内容真变了而没重建 ⇒ 报陈旧。印记整个缺失（没 `pnpm build` 过、或
 * dist 是别处拷来的）⇒ **不判陈旧**并打一行告警：无从判断的状态不当红用，宁可少拦一次也不重演「假红＋自锁」。
 * （#325：`files` 由调用方 `readStamp()` 给；`dist` 字节绑定与源↔编译现场比对另归 `pairMismatches()` 管。） */
function staleDeclarations(names, files) {
  const stale = [];
  if (files === null) {
    console.error(
      'GEN-STAMP WARN：没有可用的内容印记 ' + relative(REPO_ROOT, STAMP) +
        '（`pnpm build` 会写），本次只查编译产物在不在、不判陈旧。',
    );
  }
  for (const src of declarationSources(names)) {
    const dist = distOf(src);
    if (!existsSync(dist)) {
      stale.push('缺 ' + relative(REPO_ROOT, dist) + '（源：' + relative(REPO_ROOT, src) + '）');
      continue;
    }
    if (files === null) continue;
    const recorded = files[stampKey(src)];
    if (recorded === undefined) continue;
    const now = sha256(readFileSync(src, 'utf8'));
    if (recorded.src !== now) {
      stale.push(
        relative(REPO_ROOT, src) + ' 的内容与上次 `pnpm build` 时不同（印记 ' + recorded.src.slice(0, 12) +
          '… ≠ 现 ' + now.slice(0, 12) + '…）',
      );
    }
  }
  return stale;
}

/** #325 · 从源文本里取出那个唯一声明数组的字面量（字符串／注释感知，括号配平）。
 * 找不到（路由汇总件这类无数组文件）返回 null；括号不配平抛（ fail closed：宁红不绿）。 */
function extractExportedArray(srcText, rel) {
  const m = /export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*(?::[^=;]+)?=\s*\[/.exec(srcText);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = start; i < srcText.length; i += 1) {
    const c = srcText[i];
    const n = srcText[i + 1];
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote !== null) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '/' && n === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (c === '/' && n === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) return srcText.slice(start, i + 1);
    }
  }
  throw new Error('声明源静态解析失败：' + rel + '（数组括号不配平）');
}

/** #325 · 把源里的声明数组求值成事实（只取生成器关心的字段：`run:`／`doc:` 这类运行时引用先剥掉，
 * 剩下全是字面量才求值）。求值失败抛（fail closed）。
 * #703 · `doc:`（整页回执端口）与 `run:` 同类：它是运行时引用、不是派生品要用的事实
 * （`normFacts()` 在 dist 那一侧也按「函数不算事实」过滤掉它），故与 `run` 同一条剥法。 */
function evalDeclArrayText(arrText, rel) {
  const runtimeRef = (field) =>
    new RegExp('\\b' + field + '\\s*:\\s*[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*\\s*,?', 'g');
  const cleaned = arrText.replace(runtimeRef('run'), '').replace(runtimeRef('doc'), '');
  try {
    const v = new Function('return (' + cleaned + '\n)')();
    if (!Array.isArray(v)) throw new Error('求值结果不是数组');
    return v;
  } catch (e) {
    throw new Error('声明源静态解析失败：' + rel + '（' + (e && e.message) + '）');
  }
}

/** #325 · 事实归一：源里静态求出的与 dist 里 import 出的，走同一个归一（去 `run`／函数／`__` 内务键，
 * 键排序后 JSON 化），字符串相等＝事实相等。时间戳不进归一，所以只碰 mtime 必绿。 */
function normFacts(list) {
  return JSON.stringify(
    list.map((o) => {
      const entries = Object.entries(o).filter(
        ([k, v]) => !k.startsWith('__') && k !== 'run' && typeof v !== 'function' && v !== undefined,
      );
      entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return Object.fromEntries(entries);
    }),
  );
}

/** #325 · 某条声明源的“源事实”JSON；无声明数组、或数组是展开式拼接（路由汇总件：事实住被展开的
 * 各分片，各分片逐件被查）返回 null——这类文件只由印记绑定字节，不管现场。 */
function srcFactsJson(src) {
  const rel = relative(REPO_ROOT, src);
  const arr = extractExportedArray(readFileSync(src, 'utf8'), rel);
  if (arr === null) return null;
  if (/\.\.\./.test(arr)) return null;
  return normFacts(evalDeclArrayText(arr, rel));
}

/** #325 · 现场配对门：不经过印记，逐件查「源的事实 ↔ dist 编译出的事实」＋「dist 字节 ↔ 印记 dist」。
 * `files` 为 null（印记缺失）时只查现场、不查绑定。返回逐条说明（空数组＝配对成立）。
 * 重点：`--stamp` 重签过的自洽假 pair 在这里必现形（源事实 ≠ 编译事实），报 `GEN-PAIR FAIL`。 */
function pairMismatches(names, files, cmdDist, routeDist) {
  const bad = [];
  const jobs = [
    ...legacySources().map((src) => ({ src, kind: 'command' })),
    ...names.map((n) => ({ src: join(SRC_DIR, n, 'commands.ts'), kind: 'command' })),
    ...routeDeclarationSources().map((src) => ({ src, kind: 'route' })),
  ];
  for (const { src, kind } of jobs) {
    if (!existsSync(src)) continue;
    const key = stampKey(src);
    const dist = distOf(src);
    if (!existsSync(dist)) continue; // 缺编译产物已由陈旧守卫报，这里不重复
    if (files !== null && files[key] !== undefined) {
      const nowDist = sha256(readFileSync(dist, 'utf8'));
      if (files[key].dist === null || files[key].dist !== nowDist) {
        bad.push(
          relative(REPO_ROOT, src) + ' 的编译产物与印记对不上（印记 dist ' +
            (files[key].dist === null ? '缺席' : files[key].dist.slice(0, 12) + '…') + ' ≠ 现 ' + nowDist.slice(0, 12) +
            '…）：dist 变了而印记没重打，请跑 `pnpm build`。',
        );
        continue;
      }
    }
    let srcJson;
    try {
      srcJson = srcFactsJson(src);
    } catch (e) {
      bad.push((e && e.message) + '（请检查该声明源是否仍为单个数组字面量）');
      continue;
    }
    if (srcJson === null) continue; // 无声明数组／展开式拼接（如路由汇总件）：印记仍绑定，不管现场
    const distMap = kind === 'command' ? cmdDist : routeDist;
    if (!distMap.has(key)) continue; // 无对照（新文件）：下游 `GEN-CHECK` 兜
    if (srcJson !== distMap.get(key)) {
      bad.push(
        relative(REPO_ROOT, src) + ' 的声明内容与 ' + relative(REPO_ROOT, dist) + ' 的编译内容对不上（源事实 ' +
          sha256(srcJson).slice(0, 12) + '… ≠ 编译事实 ' + sha256(distMap.get(key)).slice(0, 12) +
          '…）：构建可能跳过了重编（保时间戳的复制会让 `tsc -b` 跳过）。请 touch 该源文件后重跑 `pnpm build`，再跑 `pnpm gen` 重生成。',
      );
    }
  }
  return bad;
}

/** #343 · 代表唤醒词门的**登记位**：只登记「修它要动别票的冻结面」的那一类，本票能自己改对的行不登记。
 *
 *  纪律（同 `#367` 的登记表）：**只许变短**——登记行换词＝当违规报出；登记行不再违规（修好了／键搬走）
 *  ＝红，要求删行。这不是「把失败放宽成警告」：违规照红，登记只是把被别票挡住的少数几条挂上名字与主人。
 *
 *  #651 已清掉唯一登记行（`photo|calorie.help.center|卡路里HELP`：补了该词到本命令的新拟路由，
 *  登记陈化即删；本表归零，有新行再按纪律登记）。 */
const WAKE_GATE_REGISTERED = [
];

/** #343 · 代表唤醒词门（生成期，正反一条）：声明里的 `wakeWord` 必须是**能路由回它自己那个键**的真唤醒词。
 *
 *  判据（一条，两面都要成立；源＝路由声明——`src/cli/legacy/routes/*.ts` 与各能力 `routes.ts` 的编译产物）：
 *   · 正向：该词必须真的存在一条 `kind:'exec'` 路由——不存在 ⟺ 幽灵词，用户说它什么也拿不到；
 *   · 反向：该词必须落在**本键自己的 wake 词集**里——不在 ⟺ 它把人领到别的键（错位／复制粘贴）。
 *
 *  为什么**不是**「必须 ∈ `WAKE_ASSETS`（436 条）」：那张表是冻结 SoT 的场景词，各票有意新拟的入口词
 *  （`list:'new'`／`list:'repair'`，如 `看目标配置`／`看目标推荐`）**故意不写进它**——按 ∈436 判会一次点出
 *  几十条合法声明（落地即假红）。真问题是「用户说的词到不了这个命令」，不是「词在不在冻结表里」。
 *
 *  缺字段（没写 `wakeWord`）：契约**允许缺**（缺了速查表退回键名，见 `src/shared/commandSpec.ts`），
 *  不是失败，但逐条打 `WAKE-WORD NOENTRY` 读数——有键确实没有 wake 入口词，一刀切禁止会逼人编造产品文案；
 *  而「写错了」必须大声失败（`WAKE-WORD GATE FAIL`，逐条点名键／词／文件）。
 *
 *  门挂 `gen`／`gen:check` 两条生成入口（`--stamp` 只给声明源盖哈希、不是生成，不在此处拦——否则别人窗口里
 *  一次 `pnpm build` 会被本包一条错声明一并挡死）。下面的纯函数导出给测试件注入合成夹具，做负向对照。 */

/** 纯判据（不打印不抛）：`{ violations, blank, registeredHit, stale }` 四类读数。 */
export function checkWakeWords({ entries, decls, registered = WAKE_GATE_REGISTERED }) {
  const wordsOfKey = new Map();     // 键 → 该键自己的 wake 词集（exec 路由）
  const keysOfWord = new Map();     // 词 → 它实际会把人领到的键（exec 路由）
  for (const d of decls) {
    if (d.kind !== 'exec') continue;  // non-exec 记录（bucket／reason）没有 key，不构成入口
    if (!wordsOfKey.has(d.key)) wordsOfKey.set(d.key, new Set());
    wordsOfKey.get(d.key).add(d.wakeWord);
    if (!keysOfWord.has(d.wakeWord)) keysOfWord.set(d.wakeWord, new Set());
    keysOfWord.get(d.wakeWord).add(d.key);
  }
  const violations = [];
  const blank = [];
  const registeredHit = [];
  const used = new Set();
  for (const e of entries) {
    if (typeof e.wakeWord !== 'string' || e.wakeWord === '') {
      blank.push(e);
      continue;
    }
    const own = wordsOfKey.get(e.key);
    if (own !== undefined && own.has(e.wakeWord)) continue;   // 路由回本键：合格
    const hit = { entry: e, targets: [...(keysOfWord.get(e.wakeWord) ?? [])], ownWords: own === undefined ? [] : [...own] };
    const reg = registered.find((r) => r.from === e.from && r.key === e.key && r.wakeWord === e.wakeWord);
    if (reg !== undefined) {
      used.add(reg.from + '|' + reg.key + '|' + reg.wakeWord);
      registeredHit.push({ ...hit, reg });
      continue;
    }
    violations.push(hit);
  }
  const stale = [];
  for (const r of registered) {
    if (used.has(r.from + '|' + r.key + '|' + r.wakeWord)) continue;
    const row = entries.find((e) => e.from === r.from && e.key === r.key);
    stale.push({
      reg: r,
      reason: row === undefined
        ? '该键的声明已不在（搬走／删了）'
        : '现词「' + String(row.wakeWord) + '」已不违规（修好了，或换了别的词）',
    });
  }
  return { violations, blank, registeredHit, stale, wordsOfKey, keysOfWord, routeHit: [...keysOfWord.keys()].length };
}

/** 门本体：读路由声明 → 判 → 逐条打印读数 → 返回是否放行（`main()` 里排在新鲜度门／配对门之后）。 */
async function wakeWordGate(entries, fileOf) {
  const decls = await loadDecls();
  const r = checkWakeWords({ entries, decls });
  const fileOfKey = (e) => fileOf.get(e.key) ?? 'src/' + e.from + '/commands.ts';
  const withWord = entries.filter((e) => typeof e.wakeWord === 'string' && e.wakeWord !== '').length;
  console.log(
    'WAKE-WORD GATE：代表唤醒词 ' + withWord + ' 条逐条比对路由（exec 路由记录 ' +
      decls.filter((d) => d.kind === 'exec').length + ' 条／词 ' + r.routeHit + ' 个）；缺字段 ' + r.blank.length +
      ' 条（允许缺，读数见下）；登记 ' + r.registeredHit.length + ' 条（只许变短）。',
  );
  for (const b of r.blank) {
    console.log('WAKE-WORD NOENTRY ' + fileOfKey(b) + ' :: ' + b.key + '（没写代表唤醒词：速查表退回键名）');
  }
  for (const h of r.registeredHit) {
    console.log(
      'WAKE-WORD REGISTERED ' + fileOfKey(h.entry) + ' :: ' + h.entry.key + ' :: 「' + h.entry.wakeWord + '」→[' +
        h.targets.join('|') + ']｜owner＝' + h.reg.owner,
    );
  }
  const bad = [];
  if (r.stale.length) {
    bad.push('WAKE-WORD GATE FAIL：登记位陈化（登记表只许变短——这些行已不违规，请从 `WAKE_GATE_REGISTERED` 删掉）：');
    for (const s of r.stale) bad.push('  ← ' + s.reg.from + ' :: ' + s.reg.key + ' :: 「' + s.reg.wakeWord + '」：' + s.reason);
  }
  if (r.violations.length) {
    bad.push('WAKE-WORD GATE FAIL：代表唤醒词路由不回本键（' + r.violations.length + ' 条）——用户说这个词拿不到这条命令：');
    for (const v of r.violations) {
      const how = v.targets.length === 0
        ? '路由表里没有这个词（幽灵词）'
        : '该词实际路由到 ' + v.targets.join('／');
      bad.push('  ← ' + fileOfKey(v.entry) + ' :: ' + v.entry.key + ' :: 「' + v.entry.wakeWord + '」（' + how +
        '）；本键自己的 wake 词集：' + (v.ownWords.length ? '「' + v.ownWords.join('」「') + '」' : '（空——这一键没有 wake 入口词）'));
    }
    bad.push('  修法：改成该键自己那条 wake 词（本键词集见上）；本键词集为空就删掉 `wakeWord`（契约允许缺，速查表退回键名）。');
  }
  if (bad.length) {
    for (const l of bad) console.error(l);
    process.exitCode = 1;
    return false;
  }
  console.log('WAKE-WORD GATE PASS：' + withWord + ' 条代表唤醒词逐条路由回本键（登记 ' + r.registeredHit.length + ' 条，缺字段 ' + r.blank.length + ' 条读数）。');
  return true;
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function main() {
  const names = scanCapabilityNames();
  if (STAMP_ONLY) {
    writeStamp(names);
    return;
  }
  const stamp = readStamp();
  if (stamp.state === 'corrupt') {
    const cmd = CHECK ? 'pnpm gen:check' : 'pnpm gen';
    console.error(
      'GEN-STAMP FAIL：内容印记 ' + relative(REPO_ROOT, STAMP) + ' 不完整（' + stamp.reason +
        '）。印记不可信时不判绿：请跑 `pnpm build` 重打印记后再跑 `' + cmd + '`。',
    );
    process.exitCode = 1;
    return;
  }
  const stale = staleDeclarations(names, stamp.state === 'ok' ? stamp.files : null);
  if (stale.length) {
    const cmd = CHECK ? 'pnpm gen:check' : 'pnpm gen';
    console.error(
      'GEN-STALE FAIL：dist/ 不是这些声明**现在的内容**的产物，继续跑会把旧声明当成事实（假绿）。先 `pnpm build`（重建 dist 并重打内容印记）再 `' + cmd + '`。',
    );
    for (const s of stale) console.error('  ' + s);
    console.error('  （扫到能力目录 ' + names.length + ' 个：' + (names.join('／') || '无') + '）');
    process.exitCode = 1;
    return;
  }
  const capabilities = [];
  for (const name of names) capabilities.push(await loadCapability(name));
  // 未搬迁清单的场景分区：按文件名升序读，两个文件声明同一个键即抛（`mergeLegacyPartition`）。
  const legacyParts = [];
  const legacyFiles = [];
  for (const file of scanLegacySceneNames()) {
    if (LEGACY_NON_SCENE.has(file)) continue;
    legacyFiles.push(file);
    legacyParts.push(await loadLegacyScene(file));
  }
  // #325 · 现场配对门（不经过印记）：源事实 ↔ dist 编译事实逐件比对。`--stamp` 重签过的自洽假 pair
  // 在这里现形（报 GEN-PAIR FAIL，不与 GEN-STALE 混用一个名，方便证据里点名）。
  const cmdDist = new Map();
  for (const cap of capabilities) cmdDist.set(cap.name + '/commands.ts', normFacts(cap.list));
  for (let i = 0; i < legacyFiles.length; i += 1) {
    cmdDist.set('cli/legacy/' + legacyFiles[i], normFacts(legacyParts[i] === null ? [] : legacyParts[i].list));
  }
  const routeDist = new Map();
  for (const d of await loadDecls()) {
    const key = d.__src.replace(/^packages\/skill-calorie\/src\//, '');
    if (!routeDist.has(key)) routeDist.set(key, []);
    routeDist.get(key).push(d);
  }
  for (const [k, v] of routeDist) routeDist.set(k, normFacts(v));
  const pair = pairMismatches(names, stamp.state === 'ok' ? stamp.files : null, cmdDist, routeDist);
  if (pair.length) {
    const cmd = CHECK ? 'pnpm gen:check' : 'pnpm gen';
    console.error(
      'GEN-PAIR FAIL：声明源与编译产物对不上（' + pair.length + ' 件），继续跑会把旧声明当成事实（假绿）。先 `pnpm build`' +
        '（确认 `tsc -b` 真重编了下面这些源——保时间戳的复制会让它跳过，可 touch 源文件后重跑）再 `' + cmd + '`。',
    );
    for (const s of pair) console.error('  ' + s);
    process.exitCode = 1;
    return;
  }
  const entries = merge(mergeLegacyPartition(legacyParts), capabilities);

  // #343 · 代表唤醒词门：声明里的 `wakeWord` 必须路由回本键（逐条点名键／词／文件）。排在上两道门之后
  // ——新鲜度／配对门管「读到的是不是现在这份声明」，本门管「这份声明本身对不对」，前者不放行后者不白跑。
  const fileOf = new Map();
  for (let i = 0; i < legacyFiles.length; i += 1) {
    for (const d of legacyParts[i] === null ? [] : legacyParts[i].list) fileOf.set(d.key, 'src/cli/legacy/' + legacyFiles[i]);
  }
  for (const cap of capabilities) for (const d of cap.list) fileOf.set(d.key, 'src/' + cap.name + '/commands.ts');
  if (!(await wakeWordGate(entries, fileOf))) return;

  const targets = [
    { path: join(SRC_DIR, 'cli', 'keys.ts'), text: renderKeysTs(entries) },
    { path: join(SRC_DIR, 'cli', 'registry.ts'), text: renderRegistryTs(capabilities) },
    {
      path: COMBO_YAML,
      text: replaceBlock(readFileSync(COMBO_YAML, 'utf8'), YAML_START, YAML_END, renderYamlBlock(entries), COMBO_YAML),
    },
    {
      path: BUILD_HELP,
      text: replaceBlock(
        replaceBlock(
          replaceBlock(
            replaceBlock(readFileSync(BUILD_HELP, 'utf8'), REPR_START, REPR_END, renderReprBlock(entries), BUILD_HELP),
            EXAMPLE_START,
            EXAMPLE_END,
            renderExampleBlock(entries),
            BUILD_HELP,
          ),
          FLOW_START,
          FLOW_END,
          renderFlowBlock(entries),
          BUILD_HELP,
        ),
        PRECHECK_START,
        PRECHECK_END,
        await renderPrecheckBlock(entries),
        BUILD_HELP,
      ),
    },
    // 路由声明（`src/cli/legacy/routes/*.ts` ＋ 各能力 `routes.ts`）派生件：与上面同批写盘／比对。
    { path: join(SRC_DIR, 'triggers', 'routes.generated.ts'), text: await renderRoutesGenerated() },
  ];

  const declared = entries.filter((e) => e.from !== 'legacy scene 分区').length;
  const summary =
    '键 ' + entries.length + '（写 ' + entries.filter((e) => e.kind === 'write').length +
    ' ＋ 读 ' + entries.filter((e) => e.kind === 'read').length + '）；能力 ' + capabilities.length +
    ' 个（' + capabilities.map((c) => c.name).join('／') + '）声明 ' + declared + ' 条，未搬迁清单 ' +
    (entries.length - declared) + ' 条';

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
    if (onDisk === want) {
      console.log('GEN-CHECK ok ' + relative(REPO_ROOT, t.path) + ' sha256=' + sha256(want));
      continue;
    }
    const a = onDisk.split('\n');
    const b = want.split('\n');
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
    bad.push(
      relative(REPO_ROOT, t.path) + ' 与生成器输出不一致（第 ' + (i + 1) + ' 行起）：\n  盘上：' + String(a[i]).slice(0, 200) +
        '\n  生成：' + String(b[i]).slice(0, 200),
    );
  }
  if (bad.length) {
    console.error('GEN-CHECK FAIL：' + summary);
    for (const b of bad) console.error('  ' + b);
    console.error('  生成物是派生件：手改无效。跑 `pnpm gen` 重生成，或改权威声明（各能力 commands.ts ／ legacyCommands.ts）。');
    process.exitCode = 1;
    return;
  }

  console.log('GEN-CHECK PASS：' + summary);
}

/** 直接跑：`node scripts/gen-cli.mjs`（`pnpm gen`／`gen:check`）或 `--stamp`（`pnpm build` 调）。
 * 被 `import` 时**不跑**——测试要引本模块的守卫（`mergeLegacyPartition`）做靶向断言，
 * 不能因为 import 就顺手重跑一遍生成（那会让「跑测试」变成「跑生成」，判定不再干净）。 */
const RUN_AS_SCRIPT = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (RUN_AS_SCRIPT) await main();
