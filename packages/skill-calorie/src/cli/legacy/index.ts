/** 未搬迁命令的**汇总**（`#313` 起）：把 10 个场景分区的声明数组并成一张表给测试面用。
 *
 * 本文件**不声明任何命令**——分区之后一条未搬迁命令的事实只住它自己那个 `scene-NN.ts`，
 * 删一个场景的清单只动那一个文件，与别的场景零交集（这正是本票的目的）。
 * 生成器（`scripts/gen-cli.mjs`）不读本文件，它直接扫 `scene-*.ts`（按文件名升序）；
 * 本文件只服务「测试面要知道全量清单」这一件事（`test/declared.mjs`、棘轮测试）。
 */
import type { LegacyCommandDecl } from './types.js';
import { LEGACY_SCENE_01 } from './scene-01.js';
import { LEGACY_SCENE_02 } from './scene-02.js';
import { LEGACY_SCENE_03 } from './scene-03.js';
import { LEGACY_SCENE_04 } from './scene-04.js';
import { LEGACY_SCENE_05 } from './scene-05.js';
import { LEGACY_SCENE_06 } from './scene-06.js';
import { LEGACY_SCENE_07 } from './scene-07.js';
import { LEGACY_SCENE_08 } from './scene-08.js';
import { LEGACY_SCENE_09 } from './scene-09.js';
import { LEGACY_SCENE_10 } from './scene-10.js';
export type { LegacyCommandDecl } from './types.js';

/** 未搬迁命令全表。顺序＝场景号升序、场景内保持原清单顺序（原清单本身按键名升序）。 */
export const LEGACY_COMMANDS: readonly LegacyCommandDecl[] = [
  ...LEGACY_SCENE_01,
  ...LEGACY_SCENE_02,
  ...LEGACY_SCENE_03,
  ...LEGACY_SCENE_04,
  ...LEGACY_SCENE_05,
  ...LEGACY_SCENE_06,
  ...LEGACY_SCENE_07,
  ...LEGACY_SCENE_08,
  ...LEGACY_SCENE_09,
  ...LEGACY_SCENE_10,
];

/** 场景文件 → 该场景的声明（键集自证用：并集应恰为 `LEGACY_COMMANDS` 的键集）。 */
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
} as const;
