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
// 一条命令的事实（键／形状／标题／代表唤醒词／可执行示例）全在两处声明里，没有第三处。
// 输出（每个文件头一句「本文件由 scripts/gen-cli.mjs 生成，勿手改」）：
//   ① `src/cli/keys.ts`（导出名不变，调用方导入面不动）；
//   ② `src/cli/registry.ts`（一能力一行，由扫描得出，人工不必再碰）；
//   ③ `packages/base-combos/combos.yaml` 的 calorie 镜像段（标记块）；
//   ④ `scripts/build-help.mjs` 的 `REPR` 表（标记块；手写表退役）；
//   ⑤ `scripts/build-help.mjs` 的 `EXAMPLE` 表（标记块；#295 返修 A3——原先这里有 101 条手写 `case`，
//      是同一文件里第二处手写「一条命令的事实」：加一条命令不补 case 就 `default: throw`，SKILL.md 停更）。
//
// 新鲜度（#295 返修 A4 立、返修第二轮 N1 改成**内容**判据）：生成器读的是**编译后**的声明模块，所以在读之前
// 先查「`dist/` 是不是这些声明的内容产物」——只改 `src/` 不 `pnpm build` 时，旧 `dist/` 会让 `gen`／`gen:check`
// 双双按旧声明判绿（假绿，P4 实测）。查法是**内容印记**（`dist/.gen-inputs.json`：声明源逐文件 sha256，
// 由 `pnpm build` 在 `tsc -b` 之后调本脚本的 `--stamp` 写入），**不看时间戳**：
//   · 源的内容没变（`git checkout -- .`／`touch` 只动 mtime）⇒ 印记相符 ⇒ 放行（mtime 判据会在这里假红）；
//   · 源的内容真变了又没重建 ⇒ 印记不符 ⇒ 大声失败并叫人 `pnpm build`（这句医嘱**可执行**：build 必重打印记）。
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
/** #295 返修第二轮 N1 · 内容印记：声明源逐文件的 sha256，由 `pnpm build`（`tsc -b` 之后）调 `--stamp` 写入。
 * 住 `dist/` 里（与 dist 同生共死，且 `pnpm gen:check` 在仓外沙箱跑时随 dist 一起被复制）。 */
const STAMP = join(DIST_DIR, '.gen-inputs.json');
const STAMP_VERSION = 1;
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
    for (const field of ['kind', 'key', 'shape', 'title', 'wakeWord', 'example']) {
      if (typeof spec?.[field] !== 'string') throw new Error(name + ' 的声明缺 ' + field + '：' + JSON.stringify(spec));
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
    // `wakeWord` **可缺**（缺了速查表退回命令名）；其余五个字段必填。
    for (const field of ['kind', 'key', 'shape', 'title', 'example']) {
      if (typeof spec?.[field] !== 'string') throw new Error('legacy/' + file + ' 的声明缺 ' + field + '：' + JSON.stringify(spec));
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
      shape: decl.shape,
      title: decl.title,
      wakeWord: typeof decl.wakeWord === 'string' ? decl.wakeWord : undefined,
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
  for (const e of writes) L.push('  ' + q(e.key) + ": { shape: 'receipt' as EnvelopeShape, title: " + q(e.title) + ' },');
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

function renderReprBlock(entries) {
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

/** 把标记块替换成生成文本；标记缺失即抛（不静默截断受跟踪的文件）。 */
function replaceBlock(text, start, end, block, path) {
  const si = text.indexOf(start);
  const ei = text.indexOf(end);
  if (si < 0 || ei < 0 || ei < si) throw new Error('标记块缺失：' + relative(REPO_ROOT, path));
  return text.slice(0, si) + block + text.slice(ei + end.length);
}

/** 生成器的两个输入（声明源）：未搬迁清单的场景分区（`src/cli/legacy/*.ts`，文件名升序）
 * ＋ 每个能力目录的声明。印记与判陈旧都以它们为准。 */
function declarationSources(names) {
  return [
    ...legacySources(),
    ...names.map((n) => join(SRC_DIR, n, 'commands.ts')),
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

/** #295 返修第二轮 N1 · `--stamp`：给声明源打内容印记。由 **`pnpm build`** 在 `tsc -b` 之后调用——
 * 只有「刚构建完」这一时刻才有资格宣称「dist/ 是这些声明的内容产物」，所以写印记的入口挂 build，不挂 gen。 */
function writeStamp(names) {
  const files = {};
  for (const src of declarationSources(names)) {
    if (!existsSync(src)) continue;
    files[stampKey(src)] = sha256(readFileSync(src, 'utf8'));
  }
  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(
    STAMP,
    JSON.stringify(
      {
        version: STAMP_VERSION,
        note: '生成器输入（声明源）的内容印记，由 `pnpm build` 调 `node packages/skill-calorie/scripts/gen-cli.mjs --stamp` 写入；`pnpm gen`／`pnpm gen:check` 按它判陈旧——内容判据，不看时间戳。',
        files,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('GEN-STAMP ok ' + relative(REPO_ROOT, STAMP) + '：声明源 ' + Object.keys(files).length + ' 件（' + Object.keys(files).join('／') + '）');
}

/** #295 返修第二轮 N1 · 新鲜度守卫：**内容**判据，不看时间戳。返回逐条说明（空数组＝新鲜）。
 * 三件事各司其职：① 缺编译产物 ⇒ 报「先 build」；② 印记里没有这条（新文件／仓外沙箱里的假能力）⇒ 无对照，放行；
 * ③ 印记与现内容不符 ⇒ 源的内容真变了而没重建 ⇒ 报陈旧。印记整个缺失（没 `pnpm build` 过、或 dist 是别处拷来的）
 * ⇒ **不判陈旧**并打一行告警：无从判断的状态不当红用，宁可少拦一次也不重演「假红＋自锁」。 */
function staleDeclarations(names) {
  const stale = [];
  let files = null;
  try {
    const raw = JSON.parse(readFileSync(STAMP, 'utf8'));
    if (raw && raw.version === STAMP_VERSION && raw.files && typeof raw.files === 'object') files = raw.files;
  } catch {
    files = null;
  }
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
    if (typeof recorded !== 'string') continue;
    const now = sha256(readFileSync(src, 'utf8'));
    if (recorded !== now) {
      stale.push(
        relative(REPO_ROOT, src) + ' 的内容与上次 `pnpm build` 时不同（印记 ' + recorded.slice(0, 12) +
          '… ≠ 现 ' + now.slice(0, 12) + '…）',
      );
    }
  }
  return stale;
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
  const stale = staleDeclarations(names);
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
  for (const file of scanLegacySceneNames()) {
    if (LEGACY_NON_SCENE.has(file)) continue;
    legacyParts.push(await loadLegacyScene(file));
  }
  const entries = merge(mergeLegacyPartition(legacyParts), capabilities);

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
        replaceBlock(readFileSync(BUILD_HELP, 'utf8'), REPR_START, REPR_END, renderReprBlock(entries), BUILD_HELP),
        EXAMPLE_START,
        EXAMPLE_END,
        renderExampleBlock(entries),
        BUILD_HELP,
      ),
    },
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
