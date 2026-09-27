/** #975 · 作息管家 HELP 重写表（**85 场景的唯一内容源**；结构仍由 fixture 定）。
 *
 * 分工（与 `gen-help-assets.mjs` 的约定）：
 *  - **结构**（5 个一级分组／34 条唤醒词／85 条场景的 id、次序、待开发状态）取自受跟踪 fixture
 *    `test/fixtures/t198-old-scenarios.json`——那是老实物取证，**一个字不改**；
 *  - **内容**（标题／唤醒词／prompt 正文／字段表）取自本表，逐场景按 id 对齐。
 *  两者缺一即生成器 fail-closed：fixture 里有而本表没写 = 漏改；本表里 id 写错 = 没人认领。
 *
 * 本文件只是**聚合件**：分域内容住 `help-rewrite/<域>.mjs`（一域一件，便于并行改、也便于按域复核），
 * 写法约定（首行／约束句／`F`／`scene` 简写）住 `help-rewrite-base.mjs`。
 *
 * 重写口径（逐字照卡路里标杆，不另起规范）：
 *  - `.scratch/help-prompt-rewrite/PROMPT-REWRITE.md` §0–§3：预置值剥离成 `{{name}}`、相对默认词进 `hint`、
 *    唤醒词行逐字保留、约束句保留、双空位拆两行、标签不列枚举／单位／格式；
 *  - 首行固定 `请你加载技能 作息管家,执行唤醒词「<唤醒词>」。`，唤醒词本体取自**路由表**
 *    （`src/triggers/routes.generated.ts` 的 `phrase`，裸词无 `#0`／`T4` 前缀）；
 *  - kind 闭集（`packages/base-render/src/spec/help.ts`）：`text／number／select／date／week／month／year／time`
 *    （`time` 由 #975 新加，值形态 `HH:MM`）；
 *  - **不立字段的两种东西**：场景条件开关（描述当前局面的值）与口径层自算的值——都进意图句，
 *    并在该条的 `drops` 里**具名声明**（生成器按「老维度要么在新字段、要么在 drops」查，缺一声明即红）。
 */
import { SCENES as WRITE } from './help-rewrite/write.mjs';
import { SCENES as QUERY } from './help-rewrite/query.mjs';
import { SCENES as PLAN } from './help-rewrite/plan.mjs';
import { SCENES as ANALYZE } from './help-rewrite/analyze.mjs';
import { SCENES as ADMIN } from './help-rewrite/admin.mjs';

/** 五个域（次序与 fixture 的一级分组一致：write／query／plan／analyze／admin）。 */
const DOMAINS = [
  ['write', WRITE],
  ['query', QUERY],
  ['plan', PLAN],
  ['analyze', ANALYZE],
  ['admin', ADMIN],
];

/** 逐域条数（生成器与测试都按它核对「一条不漏、一条不多」）。 */
export const REWRITE_COUNTS = Object.freeze(Object.fromEntries(DOMAINS.map(([k, v]) => [k, v.length])));

const ALL = DOMAINS.flatMap(([, v]) => v);

/** 场景 id → 重写记录。重复 id 即抛（分域文件之间撞车时当场暴露，不静默后者胜）。 */
export const REWRITE = new Map(ALL);
if (REWRITE.size !== ALL.length) throw new Error('重写表有重复的场景 id：' + ALL.length + ' 条里只有 ' + REWRITE.size + ' 个键');
