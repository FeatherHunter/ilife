/** 命令声明的形状（**唯一定义地**，票 #855）：一条命令的事实——键／形状／标题／代表唤醒词／可执行示例／处理函数。
 *
 * 谁在用（写得出哪两个在用）：
 *   ① 八个能力目录的声明件 `src/<能力>/commands.ts`——命令事实的**唯一权威源**（恰好导出一个数组）；
 *   ② 出口分派层的索引 `src/cli/registry.ts`——把各域声明汇总成一张查表（生成物），分派只认表。
 *
 * 为什么是判别式（`kind`）：三种命令的**运行位置与产物形状**不同，分派层必须能静态窄化。
 *   - `read`     读命令：拿库句柄、回列表／详情（`shape` 必写）；
 *   - `write`    写命令：拿库句柄、回回执（**不写 `shape`**——写命令一律 `receipt` 形，
 *                那件事实的唯一定义地是生成器合成的那一行；声明上再写一遍＝同一件事的第二处定义）；
 *   - `pre-open` 开库前分派：不拿库句柄（HELP 交付与初始化渲染要在「库还没建好」时也能跑），
 *                故它的处理函数只吃参数、自己决定开不开库。
 *
 * 库句柄类型住 `src/db/readonly.ts`（#855 起；连接层只读、禁 DDL），本件按新家取。
 */
import type { EnvelopeShape } from 'base-link-core';
import type { MemoDb } from '../db/readonly.js';

/** 整页交付意图：`html`＝本次产物的整页，`stem`＝册子冻结的文件名主体（`src/help/booklet.ts` 的唯一定义地给出）。 */
export interface PageDeliver {
  readonly html: string;
  readonly stem: string;
}

/** 一条命令跑完的产物：`data` 进 envelope（形状由 `shape` 守，对象性由 `buildMemoEnvelope` 在运行期判），
 *  `exit` 是出口退出码，`deliver` 有值即落盘。`data` 取 `unknown` 是与出口旧形 `DispatchOut` 同形——
 *  写侧回执（`WishReceipt` 等具名接口，无索引签名）直接进 `data`，不在声明层加断言式收窄。 */
export interface CommandOut {
  readonly data: unknown;
  readonly exit: number;
  readonly deliver?: PageDeliver;
}

/** 读／写命令的处理函数（拿库句柄）。 */
export type CommandHandler = (params: Record<string, unknown>, db: MemoDb) => CommandOut;

/** 开库前分派的处理函数（不拿库句柄：库不存在时也要能跑）。 */
export type PreOpenHandler = (params: Record<string, unknown>) => CommandOut;

/** 读命令声明。 */
export interface ReadCommandSpec {
  readonly kind: 'read';
  readonly key: string;
  readonly shape: EnvelopeShape;
  readonly title: string;
  /** 代表唤醒词（生成 SKILL.md 速查表那一列用）；**可缺**（如 `memo.auth` 只有诊断两档、没有唤醒词）；
   *  给定时必须是路由声明里真有的词（生成期拦，见 `scripts/gen-cli.mjs`）。 */
  readonly wakeWord?: string;
  /** #953 · 程序面标记：`'program'`＝这条命令只给程序用——生成器把它从**速查表**与
   *  **唤醒词路由**里跳过（模型看不见）；键表与注册表保留，插件程序照样能调。
   *  缺省＝既有行为，生成结果一字不变。出处：`docs/agents/数据族-规格.md` §七主做法①。 */
  readonly surface?: 'program';
  /** 照抄即能跑的一行（生成 SKILL.md 速查表「例」列用）；缺它或为空即生成期抛。 */
  readonly example: string;
  readonly run: CommandHandler;
}

/** 写命令声明（**不写 `shape`**：写命令一律回执形，唯一定义地是生成器合成的 `MEMO_DECLARED_SHAPES` 那一行）。 */
export interface WriteCommandSpec {
  readonly kind: 'write';
  readonly key: string;
  readonly title: string;
  readonly wakeWord?: string;
  /** #953 · 程序面标记（口径见 `ReadCommandSpec.surface`）：只给程序用的键不进速查表与路由。 */
  readonly surface?: 'program';
  readonly example: string;
  readonly run: CommandHandler;
}

/** 开库前分派声明（HELP 交付、初始化渲染两处；库不存在时也要能跑，故不拿库句柄）。 */
export interface PreOpenCommandSpec {
  readonly kind: 'pre-open';
  readonly key: string;
  readonly shape: EnvelopeShape;
  readonly title: string;
  readonly wakeWord?: string;
  /** #953 · 程序面标记（口径见 `ReadCommandSpec.surface`）：只给程序用的键不进速查表与路由。 */
  readonly surface?: 'program';
  readonly example: string;
  readonly run: PreOpenHandler;
}

export type CommandSpec = ReadCommandSpec | WriteCommandSpec | PreOpenCommandSpec;
