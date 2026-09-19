/** 命令声明的形状（**唯一定义地**）：一条命令的事实——种类／命令名／形状／标题／可执行示例／处理函数。
 *
 * 谁在用（两个能力，指名）：
 *   ① `src/write/commands.ts`——写入域命令事实的唯一权威源（两条写命令：记一笔、改记录）；
 *   ② `src/query/commands.ts`——查询域命令事实的唯一权威源（四条读命令：查今天／查区间／搜备注／查账单详情）；
 *  两张声明各由本能力的 `index.ts` 转出，`src/cli/registry.ts` 汇总成一张查表供 `src/cli/cmd_read.ts` 先查。
 *
 * 代表唤醒词**不在本形状里**（#721 撤）：它是**派生**——按 `key` 从该域的域声明算
 * （`projectWakeWord({ key })`，见 `src/triggers/wakeTable.ts`）。原来每条声明各写一遍代表词，
 * 是同一件事的第二处书写位；撤掉之后「一条命令有词可路由」由 `test/t721-域声明.test.mjs` 逐键判。
 *
 * 口径出处：形状照 `packages/skill-calorie/src/shared/commandSpec.ts`（照结构，不照文件）。
 * `docs/skills/skill-bill/t406-共用件依赖与提升改造清单.md` 第三节第 1 条判「`commandSpec.ts` 不上移公共层」，
 * 理由是命令事实按 `docs/agents/命令登记纪律.md` 住各能力目录——故饼干自持这一份，不上公共层。
 *
 * 为什么写命令一律 `shape: 'receipt'`：写命令的产物是一次写库的事实（`ok`／`message`／回执三件），
 * 与 `base-link-core` 的 `receipt` 形同一件事实的两种说法，测试里钉死二者等价。
 *
 * 读命令那一支（`ReadCommandSpec`）由查询域那张票（#411）补上：读命令的形状是**表里的形状**
 * （`list`／`detail`，取值来自 `base-link-core` 的 `EnvelopeShape`），产物是一件已取到的事实，
 * 与写命令的 `receipt` 不是同一种；`kind` 判别式让分派层能**静态**窄化到正确的那一支（铁律三）。
 */
import type { EnvelopeShape } from 'base-link-core';
import type { BillDb } from '../fetch/db.js';

/** 写命令的产物：回执三件（`ok`／`message`／`receipt`）＋ 整页 HTML（`html`）。
 *  `receipt` **可缺**：必需槽位缺失时出的是过程型采集页，那一次没有写库事实可报。
 *  `receipt` 那一格**形状由各域自己定**（写域＝`./writeParts.js` 的 `BillReceipt`，账户域＝
 *  `../account/scene.js` 的 `AccountReceipt`）：出口把 `data` 原样交给 envelope 形状守卫，而 `receipt` 形
 *  只校验 `ok`／`message` 两格，故共用位不收窄成某一家——收窄就要让共用位认识每一个域的界内形状
 *  （#691 是这一格上的第一个跨域消费者，故按实测把口径写在这里）。域内读它的人照自己那份类型读。 */
export interface WriteOut {
  data: { ok: boolean; message: string; receipt?: unknown };
  html: string;
}

/** 写命令的处理函数。第二参是饼干的库句柄 `BillDb`（库 ＋ 路径 ＋ 是否新建）——
 *  与卡路里同件收 `DatabaseSync` 不同：饼干的取数层 `addBill`／`updateBill`／`undoBill`／`restoreBill`
 *  收的就是 `BillDb`（`src/fetch/db.ts:155` 起），共用件不自造第二种句柄。 */
export type WriteHandler = (params: Record<string, unknown>, db: BillDb) => WriteOut;

/** 写命令的声明：六件事 ＋ 处理函数。 */
export interface WriteCommandSpec {
  readonly kind: 'write';
  readonly key: string;
  readonly shape: 'receipt';
  readonly title: string;
  /** 照抄即能跑的一行（本票两条都在空库上真跑过，退出码 0）。 */
  readonly example: string;
  readonly run: WriteHandler;
}

/** 命令声明的联合。分派层按 `kind` 静态窄化：`write` 走写入口、`read` 走查询入口。 */
export type CommandSpec = WriteCommandSpec | ReadCommandSpec;

/** 读（查询）命令的产物：`data` 过 envelope 形状守卫，`html` 为整页产物（列表页／详情页）。
 *  与卡路里同件的 `ViewOut` 同一件事的两种形状：饼干这一期不需要 `deliveryKind` 与 `target`
 *  （查询产物只有一种形态、落点由 `--html` 逐字给），故不提前占位。 */
export interface ViewOut {
  data: Record<string, unknown>;
  html: string;
}

/** 读命令的处理函数。第二参同 `WriteHandler` 收饼干的库句柄 `BillDb`（取数层只认这一种句柄）。 */
export type ViewHandler = (params: Record<string, unknown>, db: BillDb) => ViewOut;

/** 读命令的声明：与写命令同五件事，只两处不同——`kind` 是 `read`、`shape` 是**表里的形状**。 */
export interface ReadCommandSpec {
  readonly kind: 'read';
  readonly key: string;
  /** 本次 envelope 的形状（`list`＝列表页、`detail`＝单条详情页）。 */
  readonly shape: EnvelopeShape;
  readonly title: string;
  /** 照抄即能跑的一行（四条都在本机临时库上真跑过，退出码 0）。 */
  readonly example: string;
  readonly run: ViewHandler;
}
