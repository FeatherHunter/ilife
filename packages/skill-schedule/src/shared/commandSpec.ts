/** 作息命令声明的形状（**唯一定义地**）：一条命令的事实——种类／命令名／形状／标题／代表唤醒词／可执行示例／处理函数。
 *
 * 谁在用（五个能力，指名）：
 *   ① `src/write/commands.ts`——写入与同步（`schedule.record.write`）；
 *   ② `src/query/commands.ts`——查询与浏览（`schedule.record.today`／`range`／`detail`、`schedule.plan.today`）；
 *   ③ `src/plan/commands.ts`——日程与计划（`schedule.plan.write`）；
 *   ④ `src/analyze/commands.ts`——分析与洞察（`schedule.record.compare`）；
 *   ⑤ `src/admin/commands.ts`——辅助与管理（`schedule.help.lookup`）。
 * 五张声明各由本能力的 `index.ts` 转出，`src/cli/registry.ts` 汇总成一张查表供分派层查（Layer2 落定）。
 *
 * 代表唤醒词**写在声明上**（照卡路里，不照饼干 #721）：作息的唤醒词表是 48 条带槽位与预设的路由项，
 * 其全量归属在各能力的 `routes.ts`；声明上的 `wakeWord` 只是其中一条代表（SKILL 速查与示例用），
 * 生成期由 `wakeWordGate()` 逐条查「这个词路由回本键」，主张由机器拦。
 *
 * 写命令的形状不写在声明上（#703）：写命令一律 `receipt` 形，唯一定义地是生成器
 * （`scripts/gen-cli.mjs` 合成 `cli/keys.ts`）；读命令的形状写表里的形状（`list`／`stat`／`detail`／`analysis`）。
 *
 * 口径出处：形状照 `packages/skill-calorie/src/shared/commandSpec.ts` 与
 * `packages/skill-bill/src/shared/commandSpec.ts`（照结构，不照文件；零改动别家文件）。
 * 本件自持，不上公共层（命令事实住能力目录，纪律有定）。
 */
import type { EnvelopeShape } from 'base-link-core';
import type { ScheduleDb } from '../fetch/db.js';

/** 读命令的产物：`data` 过 envelope 形状守卫，`html` 为整页产物。 */
export interface ViewOut {
  data: Record<string, unknown>;
  html: string;
  /** stderr 提示行（不进 envelope）：逐条由出口 `note()` 打出，字节与旧分派一致。 */
  notes?: string[];
  /** 缺省落点意图（仅 `schedule.help.lookup` 有）：出口凭它走统一落盘管线。 */
  landing?: { targetDir: string; stem: string; reuseMs?: number };
}

/** 写命令的产物：写库回执 ＋ 整页 HTML。
 *  `data` 是 receipt 形（`ok`／`message` 必备 ＋ 各能力的分字段，见 `plan/receipt.ts` 的 `PlanReceipt`）：
 *  写成 `Record` 是因为同一 `receipt` 形下各键字段不同（`achieved`／`local`／`remote`…），静态窄化会写假；
 *  真正的形状守卫是运行时的 envelope 全字段校验（错形状载荷即抛，行为与旧分派一致）。 */
export interface WriteOut {
  data: Record<string, unknown>;
  html: string;
  /** 合成写达成通道：非 0 即「本地成了但远端没成」，出口载荷照出、退出码非 0（裁定 A6②）。 */
  exitCode?: number;
}

export type ViewHandler = (params: Record<string, unknown>, db: ScheduleDb) => ViewOut;
export type WriteHandler = (params: Record<string, unknown>, db: ScheduleDb) => WriteOut;

/** 读命令的声明。 */
export interface ReadCommandSpec {
  readonly kind: 'read';
  readonly key: string;
  readonly shape: EnvelopeShape;
  readonly title: string;
  /** 代表唤醒词：须是本键路由表里真有的词（生成期 `wakeWordGate()` 逐条查）。 */
  readonly wakeWord: string;
  /** 照抄即能跑的一行：逐字取自 SKILL.md 联动速查「例」列（缺省即证其可跑）；缺省生成期即抛。 */
  readonly example: string;
  readonly run: ViewHandler;
}

/** 写命令的声明：形状恒 `receipt`，不写第二遍（#703）。 */
export interface WriteCommandSpec {
  readonly kind: 'write';
  readonly key: string;
  readonly title: string;
  readonly wakeWord: string;
  readonly example: string;
  readonly run: WriteHandler;
}

export type CommandSpec = ReadCommandSpec | WriteCommandSpec;

/** 路由项：短语→键＋槽位与预设。`order`＝今日 `WAKE_TABLE` 下标，归并保序、HELP 字节不动。 */
export interface RouteEntry {
  readonly phrase: string;
  readonly key: string;
  readonly needs?: readonly string[];
  readonly preset?: Record<string, unknown>;
  readonly order: number;
}
