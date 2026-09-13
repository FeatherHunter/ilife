/** #295 · 计数断言的**对账源**：命令总数不再手写数字，改从权威声明算出来。
 *
 * 一条命令的声明只有两处：已搬迁的能力目录（`src/<能力>/commands.ts`，经 `src/cli/registry.ts` 汇总）
 * 与未搬迁清单（`src/cli/legacyCommands.ts`）。两边之和＝「应该有多少条命令」。
 * 断言写成「生成物键集合 == 这份声明键集合」，于是加／删一条命令**不再需要手改任何数字**
 * （生成物 == 生成器输出 另由 `pnpm gen:check` 钉一道，两处各管一边）。
 *
 * 用法：`import { DECLARED_KEYS, DECLARED_WRITE_KEYS, DECLARED_READ_KEYS } from './declared.mjs'`
 * （根 `test/` 下的用例用相对路径 `../packages/skill-calorie/test/declared.mjs`）。
 * 本文件不是 `*.test.mjs`，不进 `pnpm test` 的 glob；需先 `pnpm build`（读的是 `dist/`）。
 */
import { LEGACY_COMMANDS } from '../dist/cli/legacyCommands.js';
import { REGISTRY } from '../dist/cli/registry.js';

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
