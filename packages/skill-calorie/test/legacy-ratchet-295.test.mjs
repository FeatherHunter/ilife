/**
 * #295 · 未搬迁命令清单的机器棘轮。
 *
 * #313 A 段起，清单按场景分区住 `src/cli/legacy/scene-01.ts` … `scene-10.ts`（此前是单文件
 * `src/cli/legacyCommands.ts`）。**棘轮的牙齿不随分区消失**：钉的对象从「一个文件」改成
 * 「10 个分片之和」——条数上限 `FROZEN_LEGACY_MAX` 与行数上限 `FROZEN_LEGACY_LINES`
 * **数字一字未动**（仍是 #295 交付时实测的 92／119），只是量法的分母改成场景分片之和。
 *
 * 这份清单是 #295 引入的**过渡期住处**：92 条命令的声明暂时住在 `src/cli/` 这个工种名目录里
 * （#313 起再按场景分片），「每搬走一条＝删它那一片里的一行」。红队实测过它的退化风险：
 * **没有机器门时，「只许变短」只是一句约定**，迟早变成第二个手写 `keys.ts`（蓝队 S2-①）。
 * 这里把约定变成门：
 *   ① 清单外的新键**进不来**（新命令必须住它自己的能力目录 `src/<能力>/commands.ts`）；
 *   ② 条数与行数**只许下降**（改上限数字＝一次显式的加码动作，得在评审里说出来）。
 *
 * 形状照 `cmd-registry-294.test.mjs` 的棘轮（冻结 case 清单 ＋ 行数上限），口径与它一致。
 * 不加身份断言（不钉「谁搬了什么」），只钉「只能变短」——搬场景是各场景图与 #297 的活。
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
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
import { REGISTRY } from '../dist/cli/registry.js';
import { LEGACY_COMMANDS, LEGACY_SCENES, DECLARED_KEYS } from './declared.mjs';
import { FROZEN_LEGACY_KEYS, FROZEN_LEGACY_MAX, FROZEN_LEGACY_LINES } from './legacy-frozen-295.mjs';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const LEGACY_DIR = join(HERE, '..', 'src', 'cli', 'legacy');

/** 场景分片（键＝场景号）。 */
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

/* ── 冻结基线（#295 交付时的值，只许变短） ───────────────────────────────────────────────
 * 键集与两个上限的**唯一一份定义**住 `./legacy-frozen-295.mjs`（#313 A 段整改：此前这里有一份、
 * 分区测试里还有一份、外加一份 gitignored 的 `.scratch/t313/legacy-baseline-keys.json`——
 * 一个概念三个定义地，且那份 JSON 不在版本库里）。 */

/* ── 棘轮 ─────────────────────────────────────────────────────────────────────────────── */

test('#295 棘轮：未搬迁清单只许变短——新键不得住进来', () => {
  const now = LEGACY_COMMANDS.map((d) => d.key);
  assert.equal(new Set(now).size, now.length, '未搬迁清单出现重复键（一个键恰住一处）');
  const intruders = now.filter((k) => !FROZEN_LEGACY_KEYS.has(k));
  assert.deepEqual(intruders, [],
    '未搬迁清单出现了冻结清单外的新键（新命令要住它自己的能力目录 src/<能力>/commands.ts，这里只进不出）：' +
      intruders.join('、'));
  assert.ok(FROZEN_LEGACY_KEYS.size <= FROZEN_LEGACY_MAX,
    '冻结清单本身变长了（加码）：' + FROZEN_LEGACY_KEYS.size + ' > ' + FROZEN_LEGACY_MAX);
});

test('#295 棘轮：未搬迁清单的条数与声明行数只许下降', () => {
  assert.ok(LEGACY_COMMANDS.length <= FROZEN_LEGACY_MAX,
    '未搬迁清单条数变高：' + LEGACY_COMMANDS.length + ' > ' + FROZEN_LEGACY_MAX + '（搬走才减，加一条即红）');
  const lines = readdirSync(LEGACY_DIR)
    .filter((f) => /^scene-\d\d\.ts$/.test(f))
    .reduce((n, f) => n + readFileSync(join(LEGACY_DIR, f), 'utf8').split('\n')
      .filter((l) => l.trimStart().startsWith('{ kind: ')).length, 0);
  assert.ok(lines <= FROZEN_LEGACY_LINES,
    '未搬迁清单声明行数之和变高：' + lines + ' > ' + FROZEN_LEGACY_LINES + '（加一条声明即红）');
});

test('#295 对账：一个键恰住一处（未搬迁清单与能力目录不许声明同一个键）', () => {
  const both = [...LEGACY_COMMANDS.map((d) => d.key), ...Object.keys(REGISTRY)];
  assert.equal(new Set(both).size, both.length,
    '一个键住了两处：未搬迁清单与能力目录都声明了它（铁律二：一个键恰一处）');
  assert.deepEqual([...new Set(both)].sort(), [...DECLARED_KEYS].sort(),
    '两个权威源之和 != 全量声明（对账源 test/declared.mjs 应恰为两边合流）');
});

/* ── #313 A 段：分区自身的两条自证（源文件级，不只是 dist 面） ─────────────────────────────── */

test('#313 对账：dist 的汇总 == 10 个场景分片之和，且分片之间没有重复键', () => {
  const flat = Object.keys(SCENES).sort().flatMap((s) => SCENES[s].map((d) => d.key));
  assert.deepEqual(flat, LEGACY_COMMANDS.map((d) => d.key),
    'dist/cli/legacy/index.js 的汇总与 10 个场景分片之和对不上（汇总必须只是分片的拼接）');
  assert.equal(new Set(flat).size, flat.length, '两个场景分片声明了同一个键（跨场景重复声明）');
  assert.deepEqual(Object.keys(SCENES).sort(), Object.keys(LEGACY_SCENES).sort(),
    '测试自己列的场景分片与 test/declared.mjs 里的对账源不一致');
});

test('#313 对账：源文件面 —— 一个场景一个文件，每个场景文件只声明自己那一票', () => {
  const files = readdirSync(LEGACY_DIR).filter((f) => f.endsWith('.ts')).sort();
  const sceneFiles = files.filter((f) => /^scene-\d\d\.ts$/.test(f));
  assert.deepEqual(files, [...sceneFiles, 'index.ts', 'types.ts'].sort(),
    'src/cli/legacy/ 下出现了预期外的文件（预期只有 scene-NN.ts ＋ index.ts ＋ types.ts）');
  assert.equal(sceneFiles.length, Object.keys(SCENES).length, '场景文件个数与场景分片个数不等');
  for (const s of Object.keys(SCENES).sort()) {
    const f = 'scene-' + s + '.ts';
    assert.ok(sceneFiles.includes(f), '缺场景文件 ' + f);
    const src = readFileSync(join(LEGACY_DIR, f), 'utf8');
    // 归属自证：本文件里出现的每个键都在本场景分片里，且分片里的每个键都出现在本文件里。
    const inFile = [...src.matchAll(/key: '([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual([...inFile].sort(), SCENES[s].map((d) => d.key).sort(),
      f + ' 里声明的键与该场景分片的键对不上（场景文件只许住自己那一票）');
    // 逐条可指的依据：文件头必须写明键 → 场景的依据出处。
    assert.ok(/routing\.ts/.test(src), f + ' 文件头没写键 → 场景的依据出处（routing.ts）');
  }
});

test('#313 对账：生成器扫的就是 `src/cli/legacy/*.ts`（分区后没有第二个清单住址）', () => {
  const gen = readFileSync(join(HERE, '..', 'scripts', 'gen-cli.mjs'), 'utf8');
  assert.ok(/scanLegacySceneNames/.test(gen), '生成器没有扫场景分区的入口 scanLegacySceneNames');
  assert.ok(/cli',\s*'legacy'/.test(gen) || /'cli',\s*'legacy'/.test(gen), '生成器扫的不是 src/cli/legacy/');
  assert.ok(/declarationSources\(names\)[\s\S]*?legacySources\(\)/.test(gen), '内容印记没有覆盖场景分片');
  assert.ok(/mergeLegacyPartition/.test(gen), '生成器缺少「两个场景文件声明同一个键即抛」的守卫');
});
