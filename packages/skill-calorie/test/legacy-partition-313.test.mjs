/**
 * #313 A 段 · 未搬迁清单「按场景分区」自身的机器门。
 *
 * 分区要解决的事：92 条未搬迁声明原住**一个**文件（`src/cli/legacyCommands.ts`），
 * 两个场景的 session 同搬两条命令＝抢同一支笔。分成 `src/cli/legacy/scene-01.ts` … `scene-10.ts` 之后，
 * 「删一个场景的清单」只动它自己那个文件。本文件把这条承诺变成可机械判定的三条：
 *
 *   ① **跨场景同键即抛**：两个场景文件声明同一个键 = 一个键两个定义地（铁律二）＝生成期必须抛。
 *      判据用的是生成器自己的守卫 `mergeLegacyPartition()`（`scripts/gen-cli.mjs` 导出），
 *      不是本文件另写一份判断——铁律二同样管测试。
 *   ② **未搬迁清单 ⊆ 冻结键集，且冻结集里的键都还有定义地**：分区是**纯搬迁**，不许顺手增删命令。
 *      对照＝**版本库内的** `./legacy-frozen-295.mjs` 的 `FROZEN_LEGACY_KEYS`——分区前 92 键的唯一一份冻结定义，
 *      与 `legacy-ratchet-295.test.mjs` 用的是同一条来源（铁律二：一个概念一个定义地）。
 *      （#313 A 段整改：此前这里读 `.scratch/t313/legacy-baseline-keys.json`，那份在 gitignore 下，
 *      干净 clone／CI 上必然红；现在那份 JSON 只是工作草稿，**不再进任何判据**。）
 *      #322 预热整改：此处原为「现行键集与冻结键集**逐字相等**」＋「条数 == 上限」两条等号，
 *      六票每搬一条命令都要回头改本件；改成「⊆ ＋ 零丢失（清单 ∪ 已搬迁 ＝ 冻结）」＋「≤」后，
 *      搬迁票**不必**再动本件（搬走一条＝键从清单与冻结集各去掉、同时进 REGISTRY ⇒ 两种中间态都绿）。
 *   ③ **文件级隔离可机械判定**：生成器的输入恰为 `src/cli/legacy/*.ts`（文件名升序）＋
 *      `src/<能力>/commands.ts`；内容印记 `dist/.gen-inputs.json` 覆盖这些分片；
 *      旧单文件 `src/cli/legacyCommands.ts` 与其编译产物都不再存在（避免长出第三处清单）。
 *
 * 运行：先 `pnpm build`（读 `dist/`），再跑根 `pnpm test`。
 */
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { LEGACY_SCENE_01 } from '../dist/cli/legacy/scene-01.js';
import { LEGACY_SCENE_02 } from '../dist/cli/legacy/scene-02.js';
import { LEGACY_SCENE_03 } from '../dist/cli/legacy/scene-03.js';
import { LEGACY_SCENE_04 } from '../dist/cli/legacy/scene-04.js';
import { LEGACY_SCENE_05 } from '../dist/cli/legacy/scene-05.js';
import { LEGACY_SCENE_06 } from '../dist/cli/legacy/scene-06.js';
import { LEGACY_SCENE_07 } from '../dist/cli/legacy/scene-07.js';
import { LEGACY_SCENE_08 } from '../dist/cli/legacy/scene-08.js';
import { LEGACY_SCENE_09 } from '../dist/cli/legacy/scene-09.js';
import { LEGACY_SCENE_10 } from '../dist/cli/legacy/scene-10.js';
import { mergeLegacyPartition } from '../scripts/gen-cli.mjs';
import { LEGACY_COMMANDS, DECLARED_CAPABILITY_KEYS } from './declared.mjs';
import { FROZEN_LEGACY_KEYS, FROZEN_LEGACY_MAX } from './legacy-frozen-295.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SRC_LEGACY = join(PKG, 'src', 'cli', 'legacy');
const DIST_LEGACY = join(PKG, 'dist', 'cli', 'legacy');

/** 场景分片（键＝场景号，来源＝编译后的场景文件）。 */
const SCENES = {
  '01': LEGACY_SCENE_01,
  '02': LEGACY_SCENE_02,
  '03': LEGACY_SCENE_03,
  '04': LEGACY_SCENE_04,
  '05': LEGACY_SCENE_05,
  '06': LEGACY_SCENE_06,
  '07': LEGACY_SCENE_07,
  '08': LEGACY_SCENE_08,
  '09': LEGACY_SCENE_09,
  '10': LEGACY_SCENE_10,
};

/** 分区前的 92 键（冻结基线唯一一份定义，在版本库内）。
 * 口径（#322 预热）：冻结集与上限的关系是「≤」而不是「==」——两边都只许下降，脚本不再要求
 * 「减一个键」与「下调上限」同时落地（对齐 `legacy-ratchet-295.test.mjs:69-70` 的 `<=` 口径）。 */
function baselineKeys() {
  const keys = [...FROZEN_LEGACY_KEYS];
  assert.ok(keys.length <= FROZEN_LEGACY_MAX,
    '冻结键集条数超过了冻结上限（冻结面自相矛盾）：' + keys.length + ' > ' + FROZEN_LEGACY_MAX);
  return keys;
}

/* ── ① 跨场景同键即抛（守卫在生成器里） ─────────────────────────────────────────────────── */

test('#313 跨场景同键即抛：两个场景文件声明同一个键时，合流守卫必须抛', () => {
  // 守卫可用：正常输入返回全量（不误抛）。
  const parts = Object.keys(SCENES).sort().map((s) => ({ name: 'scene-' + s + '.ts', list: SCENES[s] }));
  const all = mergeLegacyPartition(parts);
  assert.deepEqual(all.map((d) => d.key), LEGACY_COMMANDS.map((d) => d.key),
    '合流守卫在没有重复键时也改变了声明集合');

  // 变异：把 01 场景的第一条再声明一次（换成另一个场景文件的名义）→ 必须抛，且报出两个文件。
  const dup = SCENES['01'][0];
  assert.throws(
    () => mergeLegacyPartition([...parts, { name: 'scene-02.ts', list: [dup] }]),
    (err) => /命令键重复登记/.test(err.message) && err.message.includes(dup.key),
    '跨场景重复声明同一个键没有抛（分区后一个键仍可能住两处＝铁律二被破）',
  );

  // 同场景内重复也必须抛（同一个文件里写两遍同样是两个定义地）。
  assert.throws(
    () => mergeLegacyPartition([{ name: 'scene-01.ts', list: [SCENES['01'][0], SCENES['01'][0]] }]),
    /命令键重复登记/,
    '同一个场景文件内重复声明同一个键没有抛',
  );
});

/* ── ② 清单 ⊆ 冻结集 ＋ 零丢失（纯搬迁的机器判据；#322 预热前是「与冻结集逐字相等」） ─────────── */

test('#313 纯搬迁：未搬迁清单 ⊆ 冻结键集，且冻结集里的键都还有定义地', () => {
  const now = Object.keys(SCENES).sort().flatMap((s) => SCENES[s].map((d) => d.key));
  const expected = baselineKeys();
  // ① 只进不出：现行清单的每个键都必须在冻结集里（清单外的新键即红——与 ratchet 同口径）。
  //    #322 预热：原为「与冻结集逐字相等」，搬迁时两边一起动才绿；改成 ⊆ 后搬一条命令不必回头改本件。
  const intruders = now.filter((k) => !FROZEN_LEGACY_KEYS.has(k));
  assert.deepEqual(intruders, [],
    '未搬迁清单出现了冻结集之外的键（这里只进不出）：' + intruders.join('、'));
  assert.equal(new Set(now).size, now.length, '分区后出现重复键');
  // ② 零丢失：冻结集里的每条命令都必须仍有定义地——未搬迁清单里，或已搬进能力目录（生成物 REGISTRY）。
  //    搬迁一条＝它从清单与冻结集里各去掉、同时进 REGISTRY ⇒ 两边都动也对、只动清单（冻结集没跟上）也对，
  //    所以「搬一条命令要不要改本件」的答案是：不必。
  const stillDeclared = new Set([...now, ...DECLARED_CAPABILITY_KEYS]);
  const lost = [...expected].filter((k) => !stillDeclared.has(k));
  assert.deepEqual(lost, [],
    '冻结集里的命令既不在未搬迁清单、也不在能力目录（被静默删掉了一条命令）：' + lost.join('、'));
  // 声明字段逐条存在（不许顺手漏字段；`wakeWord` 按契约可缺，缺了速查表退回命令名）。
  for (const d of LEGACY_COMMANDS) {
    for (const f of ['kind', 'key', 'shape', 'title', 'example']) {
      assert.equal(typeof d[f], 'string', '分区后声明缺字段 ' + f + '：' + JSON.stringify(d.key));
    }
  }
  assert.ok(LEGACY_COMMANDS.length <= FROZEN_LEGACY_MAX,
    '分区后声明条数超过了冻结上限：' + LEGACY_COMMANDS.length + ' > ' + FROZEN_LEGACY_MAX);
});

/* ── ③ 文件级隔离：生成器输入恰为场景分片，旧单文件不复存在 ───────────────────────────────── */

test('#313 文件级隔离：生成器输入恰为 src/cli/legacy/*.ts，印记覆盖全部分片', () => {
  // 源文件面：只有 scene-NN.ts ＋ index.ts ＋ types.ts，且每个场景文件只声明自己那一票。
  const files = readdirSync(SRC_LEGACY).filter((f) => f.endsWith('.ts')).sort();
  const sceneFiles = files.filter((f) => /^scene-\d\d\.ts$/.test(f));
  assert.deepEqual(files, [...sceneFiles, 'index.ts', 'types.ts'].sort(),
    'src/cli/legacy/ 下出现了预期外的文件（预期只有 scene-NN.ts ＋ index.ts ＋ types.ts）');
  assert.equal(sceneFiles.length, 10, '场景文件个数不是 10');
  for (const f of sceneFiles) {
    const inFile = [...readFileSync(join(SRC_LEGACY, f), 'utf8').matchAll(/key: '([^']+)'/g)].map((m) => m[1]);
    const scene = /^scene-(\d\d)\.ts$/.exec(f)[1];
    assert.deepEqual([...inFile].sort(), SCENES[scene].map((d) => d.key).sort(),
      f + ' 里声明的键与该场景分片的键对不上（场景文件只许住自己那一票）');
  }

  // 生成器面的静态事实：扫的场景目录、汇总入口、跨场景守卫、印记覆盖。
  const gen = readFileSync(join(PKG, 'scripts', 'gen-cli.mjs'), 'utf8');
  assert.ok(/scanLegacySceneNames/.test(gen), '生成器没有扫场景分区的入口');
  assert.ok(/'cli',\s*'legacy'/.test(gen), '生成器扫的不是 src/cli/legacy/');
  assert.ok(/legacySources\(\)/.test(gen) && /declarationSources\(names\)[\s\S]{0,200}legacySources\(\)/.test(gen),
    '内容印记（declarationSources）没有覆盖场景分片');
  assert.ok(/mergeLegacyPartition/.test(gen), '生成器缺「两个场景文件声明同一个键即抛」的守卫');

  // 内容印记（`pnpm build` 打；`--stamp` 写）必须逐分片覆盖，且不再提旧单文件。
  const stamp = JSON.parse(readFileSync(join(PKG, 'dist', '.gen-inputs.json'), 'utf8'));
  const stampKeys = Object.keys(stamp.files);
  for (const f of sceneFiles) {
    assert.ok(stampKeys.includes('cli/legacy/' + f), '内容印记缺场景分片 ' + f);
  }
  assert.ok(!stampKeys.some((k) => k === 'cli/legacyCommands.ts'),
    '内容印记仍在给旧单文件打指纹（应已不存在）');

  // 旧单文件（源与其编译产物）必须都不在：不留第三处清单。
  // 两条都要查：只查 dist 会漏掉「源还在、只是没编译」的情形（`gen:check` 也不会因此变红——它只读分片）。
  assert.ok(!existsSync(join(PKG, 'src', 'cli', 'legacyCommands.ts')),
    'src/cli/legacyCommands.ts 仍在（分区后它不该存在：权威已搬到 src/cli/legacy/scene-NN.ts）');
  assert.ok(!files.includes('legacyCommands.ts'), 'src/cli/legacy/ 下不该有 legacyCommands.ts');
  assert.ok(!readdirSync(join(PKG, 'dist', 'cli')).includes('legacyCommands.js'),
    'dist/cli/legacyCommands.js 仍在（旧编译产物没清干净，会误导读者以为还有单文件清单）');
});
