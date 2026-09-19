/** 目标域场景件的公共契约与落点表（**唯一定义地**）。
 *
 * 本件回答两件事：
 *   ① 一件场景件长什么样——写命令那件 `GoalWriteScene`（两张页的装配函数 ＋ 它的差异值），
 *      读命令那件 `GoalReadScene`（一条读命令两支操作，各出一张整页）；
 *   ② 一条命令该落哪一件——`writeSceneFor`／`readSceneFor`。
 *
 * 落点表两张、共 **4 行**（＝T4 §2.4 那 4 个场景；`packages/skill-bill/docs/t685-按域页型表.md:92-97`）：
 *   写命令 `bill.goal.write` 两支（设定预算／设定目标）→ 设定表单页型 `./template-form.js` 的两件场景件；
 *   读命令 `bill.goal.query` 两支（看预算／看目标）→ 进度视图页型 `./template-progress.js` 的两件场景件。
 *
 * 为什么读命令也有场景件（与账户域不同的一处，写在这里免得后人以为多了一层）：
 *   账户域那条读命令**只有一支操作**（看账户汇总），一命令一页、没有差异可声明，故落点表只有 3 行；
 *   目标域这条读命令有**两支**（预算执行／目标进度），两张页的读数卡、每卡读数、口径行、空态句都不同——
 *   那是「差异值」，正是场景件该住的东西（判据乙），块序仍只住模板件一处。
 *
 * 老侧对应件：`scenes/goal.yaml` 的 4 个场景 ＋ `scripts/goal/render.py` 的四件一张表（`MODE_TEMPLATE:64-69`）。
 *  老侧一域四张模板与本题两片页型的对应写在 `docs/skills/skill-bill/t730-差异表.md`。
 *
 * 谁在用（四个调用点，指名）：
 *   ① `./write.js`——写命令处理体：缺项时叫落点表里那件的 `collect`，写库成功后叫 `receipt`；
 *   ② `./read.js`——读命令处理体：两支各叫自己那件的 `view`；
 *   ③ `./index.js`——域门把两张落点表转出给测试（域内别处不读它们）。
 */
import { BillPolicyError } from '../fetch/errors.js';
import type { DataTableColumn, DataTableRow, KpiCardInput } from 'base-paint/blocks';
import type { GoalBlocked, GoalWriteOp, GoalReadOp } from './params.js';
import type { BudgetExecution, GoalBudgetRow, GoalSavingRow, SavingProgress } from './goalData.js';
import { SCENE as sceneBudget } from './scene-budget.js';
import { SCENE as sceneSaving } from './scene-saving.js';
import { SCENE as sceneSetBudget } from './scene-set-budget.js';
import { SCENE as sceneSetSaving } from './scene-set-saving.js';

/** 采集页入参：这一页是谁 ＋ 缺什么 ＋ 目标表现状 ＋ 复制日志与脚注的取数。 */
export interface GoalCollectInput {
  /** 对外命令名（`bill.goal.write`）。 */
  readonly key: string;
  /** 这一页是哪一支操作。 */
  readonly op: GoalWriteOp;
  /** 本次参数（复制日志那行命令原文照它拼，可照抄重跑）。 */
  readonly params: Record<string, unknown>;
  /** 缺什么／哪一格的值进不去（空数组＝可以写库，本页不该出）。 */
  readonly blocked: readonly GoalBlocked[];
  /** 预算表现状（设定预算那一件的「已有条目」只读表读它）。 */
  readonly budgets: readonly GoalBudgetRow[];
  /** 目标表现状（设定目标那一件同上）。 */
  readonly savings: readonly GoalSavingRow[];
  /** 本次数据来源（复制日志第 3 段）。 */
  readonly source: string;
  /** 本次执行时刻（复制日志第 5 段）。 */
  readonly actionAt: string;
}

/** 一次写库的事实（回执页与复制日志都读它）。**形状由本域定**：目标域动的是 `goals.json`
 *  的 `budgets`／`savings` 两键里的一条，与写入域的「一条记录」、账户域的「账户表 ＋ 账本」都不是同一件事。 */
export interface GoalReceipt {
  readonly op: GoalWriteOp;
  /** 一句人话回执（页副标题、复制日志、出口 message 共用）。 */
  readonly summary: string;
  /** 库里改动的处数（目标表那一层**自报**：一条预算或一个目标＝1；见 `./write.js` 的口径注）。 */
  readonly affectedRows: number;
  /** 写入时刻（本地时钟，`YYYY-MM-DD HH:MM:SS`）。 */
  readonly actionAt: string;
  /** 本次数据来源（复制日志第 3 段）。 */
  readonly source: string;
  /** 被覆盖掉的那一条（只可能出现在设定预算那一支；没覆盖＝`null`）。 */
  readonly overwritten: { readonly month: string; readonly category: string; readonly amount: number } | null;
  /** 写完之后预算表里一共几条。 */
  readonly budgetCount: number;
  /** 写完之后目标表里一共几个。 */
  readonly savingCount: number;
}

/** 回执页入参：回执事实 ＋ 明细行 ＋ 取数。 */
export interface GoalReceiptInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly receipt: GoalReceipt;
  /** 明细表的行（本次写进去的项与值）。 */
  readonly detail: readonly { readonly k: string; readonly v: string }[];
}

/** 一件写场景件：一条唤醒词的落点（两张页：采集页与回执页）。 */
export interface GoalWriteScene {
  /** 件的名字（与文件名 `scene-<id>.ts` 对得上）。 */
  readonly id: string;
  readonly key: 'bill.goal.write';
  readonly op: GoalWriteOp;
  /** 待哪一族窗口来填这一件的页（目标域的一族：设定）。 */
  readonly family: string;
  /** 这一件的过程型采集页（缺项那一支）。 */
  readonly collect: (input: GoalCollectInput) => string;
  /** 这一件的结果型回执页（写库成功那一支）。 */
  readonly receipt: (input: GoalReceiptInput) => string;
}

/** 进度视图入参：这一页看的是哪一段 ＋ 那一支的事实 ＋ 取数。两支里恰好一支非空（由 `./read.js` 给）。 */
export interface GoalProgressInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  /** 唤醒词（页标题；由域声明投影算出）。 */
  readonly wakeWord: string;
  /** 预算执行那一支的事实（`op=budget` 时给）。 */
  readonly budget: BudgetExecution | null;
  /** 目标进度那一支的事实（`op=saving` 时给）。 */
  readonly saving: SavingProgress | null;
  /** 出口载荷（与页面同一份事实；复制区直接序列化它）。 */
  readonly data: GoalProgressData;
  /** 来源脚注的窗口起止（一条记录都没有时写「不限」）。 */
  readonly windowStart: string;
  readonly windowEnd: string;
  /** 本次执行时刻（复制日志第 5 段）。 */
  readonly actionAt: string;
}

/** 出口载荷：`items` 是 `list` 形必填的那一格，其余是本域给页面与下游看的窗口事实。
 *  写成 `type` 而不是 `interface`：`ViewOut['data']` 收 `Record<string, unknown>`，别名形态自带隐式索引签名。 */
export type GoalProgressData = {
  readonly items: unknown[];
  readonly total: number;
  readonly op: GoalReadOp;
  readonly [k: string]: unknown;
};

/** 一件读场景件：一条读操作出一张整页（进度视图页型的一支）。 */
export interface GoalReadScene {
  readonly id: string;
  readonly key: 'bill.goal.query';
  readonly op: GoalReadOp;
  /** 待哪一族窗口来填这一件的页（目标域的一族：进度）。 */
  readonly family: string;
  /** 这一件的整页产物。 */
  readonly view: (input: GoalProgressInput) => string;
}

/** 写命令的两行落点表（**唯一定义地**）：顺序＝域声明里那两条词的书写顺序（设定预算／设定目标）。 */
export const GOAL_WRITE_SCENES: readonly GoalWriteScene[] = [sceneSetBudget, sceneSetSaving];

/** 读命令的两行落点表（**唯一定义地**）：顺序＝域声明里那两条词的书写顺序（看预算／看目标）。 */
export const GOAL_READ_SCENES: readonly GoalReadScene[] = [sceneBudget, sceneSaving];

const WRITE_BY_OP = new Map<GoalWriteOp, GoalWriteScene>(GOAL_WRITE_SCENES.map((s) => [s.op, s]));
const READ_BY_OP = new Map<GoalReadOp, GoalReadScene>(GOAL_READ_SCENES.map((s) => [s.op, s]));

/** 取件：按 `op` 认（写命令两支各一件）。认不得的 op 即抛——**不猜、不兜底**
 *  （`op` 已在 `./params.js` 拦过一道，走到这里还认不得即是代码缺陷）。 */
export function writeSceneFor(op: GoalWriteOp): GoalWriteScene {
  const hit = WRITE_BY_OP.get(op);
  if (hit === undefined) throw new BillPolicyError('POLICY_BAD_INPUT', '目标写命令没有这一支操作：' + String(op));
  return hit;
}

/** 取件：读命令两支各一件，认不得即抛（同上）。 */
export function readSceneFor(op: GoalReadOp): GoalReadScene {
  const hit = READ_BY_OP.get(op);
  if (hit === undefined) throw new BillPolicyError('POLICY_BAD_INPUT', '目标读命令没有这一支操作：' + String(op));
  return hit;
}

/** 已有条目只读表（采集页）的取值面：普通数据（列／行／标题／空态两句），块位拼装仍归模板件。 */
export interface GoalExistingTable {
  readonly caption: string;
  readonly columns: readonly DataTableColumn[];
  readonly rows: readonly DataTableRow[];
  readonly empty: { readonly text: string; readonly next: string };
}

/** 回执页结果块（覆盖了哪一条；没覆盖就不出这一块）：普通数据。 */
export interface GoalReceiptResult {
  readonly navText: string;
  readonly caption: string;
  readonly rows: readonly { readonly k: string; readonly v: string }[];
  readonly note: string;
}

/** 读数卡与结果块共用的「一行键值」（明细表、结果表都用它）。 */
export type GoalRows = readonly { readonly k: string; readonly v: string }[];

/** 场景件给模板件的读数卡列表（模板件只管把它交给 `renderKpiGrid`）。 */
export type GoalCards = readonly KpiCardInput[];
