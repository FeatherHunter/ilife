/** #295 · 计数断言的**对账源**：命令总数不再手写数字，改从权威声明算出来。
 *
 * 一条命令的声明只有两处：已搬迁的能力目录（`src/<能力>/commands.ts`，经 `src/cli/registry.ts` 汇总）
 * 与未搬迁清单的场景分区（`src/cli/legacy/scene-01.ts` … `scene-10.ts`；`#313` A 段之前是单文件
 * `src/cli/legacyCommands.ts`）。两边之和＝「应该有多少条命令」。
 * 断言写成「生成物键集合 == 这份声明键集合」，于是加／删一条命令**不再需要手改任何数字**
 * （生成物 == 生成器输出 另由 `pnpm gen:check` 钉一道，两处各管一边）。
 *
 * 用法：`import { DECLARED_KEYS, DECLARED_WRITE_KEYS, DECLARED_READ_KEYS } from './declared.mjs'`
 * （根 `test/` 下的用例用相对路径 `../packages/skill-calorie/test/declared.mjs`）。
 * 本文件不是 `*.test.mjs`，不进 `pnpm test` 的 glob；需先 `pnpm build`（读的是 `dist/`）。
 */
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

/** 未搬迁清单的场景分片（键＝场景号）：一个场景一个文件，删一个场景的清单只动它自己那一片。 */
export const LEGACY_SCENES = {
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

/** 未搬迁清单全表（各场景分片并起来；顺序＝场景号升序）。 */
export const LEGACY_COMMANDS = Object.keys(LEGACY_SCENES)
  .sort()
  .flatMap((s) => LEGACY_SCENES[s]);

/** 全部声明（未搬迁清单 ＋ 各能力声明），按键名升序。 */
export const DECLARED = [...LEGACY_COMMANDS, ...Object.values(REGISTRY)].sort((a, b) =>
  a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
);

export const DECLARED_KEYS = DECLARED.map((d) => d.key);
export const DECLARED_WRITE_KEYS = DECLARED.filter((d) => d.kind === 'write').map((d) => d.key);
export const DECLARED_READ_KEYS = DECLARED.filter((d) => d.kind !== 'write').map((d) => d.key);

/** 已搬到能力目录的那一批键（＝生成物 `cli/registry.ts` 的键集合）。
 * 用途：钉「某能力声明的条数 == 已搬迁声明的键数」这类**计数**断言——加／删一条命令时两边一起动，断言不必手改。 */
export const DECLARED_CAPABILITY_KEYS = Object.keys(REGISTRY);

/** 一句话说明本轮对账的分母，失败信息里带上它，看日志不必再回源码。 */
export const DECLARED_NOTE =
  '声明数＝未搬迁 ' + LEGACY_COMMANDS.length + ' ＋ 各能力 ' + Object.keys(REGISTRY).length;
