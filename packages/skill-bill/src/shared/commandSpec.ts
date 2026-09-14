/** 命令声明的形状（**唯一定义地**）：一条命令的事实——种类／命令名／形状／标题／代表唤醒词／可执行示例／处理函数。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/commands.ts`——命令事实的唯一权威源（本票两条写命令：记一笔、改记录）；
 *   ② `src/cli/registry.ts`——把能力声明汇总成一张查表，供 `src/cli/cmd_read.ts` 先查注册表。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，查命令的声明与产物落点意图也走这一份形状）。
 *
 * 口径出处：形状照 `packages/skill-calorie/src/shared/commandSpec.ts`（照结构，不照文件）。
 * `docs/skills/skill-bill/t406-共用件依赖与提升改造清单.md` 第三节第 1 条判「`commandSpec.ts` 不上移公共层」，
 * 理由是命令事实按 `docs/agents/命令登记纪律.md` 住各能力目录——故饼干自持这一份，不上公共层。
 *
 * 为什么写命令一律 `shape: 'receipt'`：写命令的产物是一次写库的事实（`ok`／`message`／回执三件），
 * 与 `base-link-core` 的 `receipt` 形同一件事实的两种说法，测试里钉死二者等价。
 *
 * 本票只搬写命令：读命令那一支（读形状／产物落点意图）待读命令搬迁的票按需加，这里不先写空的占位。
 */
import type { BillDb } from '../fetch/db.js';
import type { BillReceipt } from './writeParts.js';

/** 写命令的产物：回执三件（`ok`／`message`／`receipt`）＋ 整页 HTML（`html`）。
 *  `receipt` **可缺**：必需槽位缺失时出的是过程型采集页，那一次没有写库事实可报。 */
export interface WriteOut {
  data: { ok: boolean; message: string; receipt?: BillReceipt };
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
  /** 代表唤醒词；**必填**，且必须是 `src/policy/wakewords.ts` 的 `WAKE_TABLE` 里真有的词（测试里逐条核）。 */
  readonly wakeWord: string;
  /** 照抄即能跑的一行（本票两条都在空库上真跑过，退出码 0）。 */
  readonly example: string;
  readonly run: WriteHandler;
}

/** 命令声明的联合。今天只有写命令这一支；读命令搬进来时在这里加一支，分派层按 `kind` 静态窄化。 */
export type CommandSpec = WriteCommandSpec;
