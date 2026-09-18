/** #295 · 计数断言的**对账源**：命令总数不手写数字，改从权威声明算出来。
 *
 * #708 · 本件退役后的真实职责（留件、改写法）：三张派生键表（全量／读／写）的**来源是生成物里的
 * 能力注册表**——`src/cli/registry.ts` ← 各能力 `src/<能力>/commands.ts`；本件只是**测试侧的只读对账面**，
 * 不由它定义任何事实。从前它读两份权威源（能力目录 ＋ 未搬迁清单的场景分区
 * `src/cli/legacy/scene-NN.ts`），92 条命令全部搬完之后那一层容器一次性退役（ADR-0002），
 * 于是「两边之和」塌成「就这一边」：`DECLARED_*` 与 `DECLARED_CAPABILITY_KEYS` 现在是**同一个键集**。
 *
 * 断言写成「生成物键集合 == 这份声明键集合」，于是加／删一条命令**不再需要手改任何数字**
 * （生成物 == 生成器输出 另由 `pnpm gen:check` 钉一道，两处各管一边）。
 *
 * 用法：`import { DECLARED_KEYS, DECLARED_WRITE_KEYS, DECLARED_READ_KEYS } from './declared.mjs'`
 * （根 `test/` 下的用例用相对路径 `../packages/skill-calorie/test/declared.mjs`）。
 * 本文件不是 `*.test.mjs`，不进 `pnpm test` 的 glob；需先 `pnpm build`（读的是 `dist/`）。
 */
import { REGISTRY } from '../dist/cli/registry.js';

/** 全部声明（唯一权威源＝各能力目录的声明，经生成物 `cli/registry.ts` 汇总），按键名升序。 */
export const DECLARED = Object.values(REGISTRY).sort((a, b) =>
  a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
);

export const DECLARED_KEYS = DECLARED.map((d) => d.key);
export const DECLARED_WRITE_KEYS = DECLARED.filter((d) => d.kind === 'write').map((d) => d.key);
export const DECLARED_READ_KEYS = DECLARED.filter((d) => d.kind !== 'write').map((d) => d.key);

/** 已搬到能力目录的那一批键（＝生成物 `cli/registry.ts` 的键集合）。
 *  #708 之后它与 `DECLARED_KEYS` 是**同一个集合**（未搬迁清单那一半已退役）；名字保留，是因为多件测试
 *  按它取读数（导入面不动），语义也仍成立：它就是「能力目录声明的键」。 */
export const DECLARED_CAPABILITY_KEYS = Object.keys(REGISTRY);

/** 一句话说明本轮对账的分母，失败信息里带上它，看日志不必再回源码。 */
export const DECLARED_NOTE =
  '声明数＝各能力目录 ' + Object.keys(REGISTRY).length + ' 条（一条命令一个定义地）';
