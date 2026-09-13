/** #313 B 段 · 未搬迁路由声明**汇总**（10 个场景分片按场景号顺序拼接）。
 *
 * 一能力一行的同构做法：本件只做拼接与再导出，不新增记录；已搬迁能力件（今天只有 `src/weight/routes.ts`）
 * 另计，由生成器合流成 `src/triggers/routes.generated.ts` 的三个列表（按 `(list, order)` 排序）。
 */
import type { RouteDecl } from '../../../triggers/routeSpec.js';
import { ROUTES_SCENE_01 } from './scene-01.js';
import { ROUTES_SCENE_02 } from './scene-02.js';
import { ROUTES_SCENE_03 } from './scene-03.js';
import { ROUTES_SCENE_04 } from './scene-04.js';
import { ROUTES_SCENE_05 } from './scene-05.js';
import { ROUTES_SCENE_06 } from './scene-06.js';
import { ROUTES_SCENE_07 } from './scene-07.js';
import { ROUTES_SCENE_08 } from './scene-08.js';
import { ROUTES_SCENE_09 } from './scene-09.js';
import { ROUTES_SCENE_10 } from './scene-10.js';

export const LEGACY_ROUTES: readonly RouteDecl[] = [
  ...ROUTES_SCENE_01,
  ...ROUTES_SCENE_02,
  ...ROUTES_SCENE_03,
  ...ROUTES_SCENE_04,
  ...ROUTES_SCENE_05,
  ...ROUTES_SCENE_06,
  ...ROUTES_SCENE_07,
  ...ROUTES_SCENE_08,
  ...ROUTES_SCENE_09,
  ...ROUTES_SCENE_10,
];
