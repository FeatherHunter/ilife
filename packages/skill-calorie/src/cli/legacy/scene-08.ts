/** 未搬迁命令的场景分区 · 场景 08（body）：8 条。
 *
 * 键 → 场景的依据：`src/triggers/routing.ts` 的路由表逐条记 `scene` 字段（`WAKE_ROUTES` 优先，
 * 表内取场景号最小；判定全表与逐键依据见 `docs/skills/skill-calorie/t313a-分区-证据.md`）。
 * 搬迁一条＝从本文件删掉那一行（生成的汇总位随之变短）；本文件只属于本场景，别的场景不碰它。
 *
 * 本文件是**手写权威声明**，不是生成物：`scripts/gen-cli.mjs` 扫 `src/cli/legacy/*.ts`（按文件名升序）汇总。
 */
import type { LegacyCommandDecl } from './types.js';

export const LEGACY_SCENE_08: readonly LegacyCommandDecl[] = [
  { kind: 'write', key: 'calorie.body.composition-add', shape: 'receipt', title: '记体脂', wakeWord: '记体脂', example: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":18.5}\'' },
  { kind: 'write', key: 'calorie.body.composition-remove', shape: 'receipt', title: '删体脂', wakeWord: '删体脂', example: 'calorie-cmd-read calorie.body.composition-remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.body.measure-add', shape: 'receipt', title: '记围度', wakeWord: '记围度', example: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":85}\'' },
  { kind: 'write', key: 'calorie.body.measure-remove', shape: 'receipt', title: '删围度', wakeWord: '删围度', example: 'calorie-cmd-read calorie.body.measure-remove --params \'{"id":1}\'' },
  { kind: 'read', key: 'calorie.view.body-composition', shape: 'stat', title: '体成分看', example: 'calorie-cmd-read calorie.view.body-composition' },
  { kind: 'read', key: 'calorie.view.body-measure', shape: 'stat', title: '围度看', example: 'calorie-cmd-read calorie.view.body-measure --params \'{"metric":"waist_cm"}\'' },
  { kind: 'read', key: 'calorie.view.composition-wizard', shape: 'stat', title: '体脂向导', wakeWord: '看体脂向导', example: 'calorie-cmd-read calorie.view.composition-wizard' },
  { kind: 'read', key: 'calorie.view.measure-wizard', shape: 'stat', title: '围度向导', wakeWord: '看围度向导', example: 'calorie-cmd-read calorie.view.measure-wizard' },
] satisfies readonly LegacyCommandDecl[];
