/** 账户域场景件的公共契约与落点表（**唯一定义地**）。
 *
 * 本件回答两件事：
 *   ① 一件场景件长什么样——`AccountWriteScene`（id／命令全名／认的 op／待哪一族窗口来填／两张页的装配函数）；
 *   ② 一条命令该落哪一件——`writeSceneFor`。
 *
 * 落点表只有 **3 行**（`bill.account.write` 的三支操作）；第 4 个场景「看账户汇总」不在本表里——
 *  它是 `bill.account.query` 那条**读命令**，一命令一页、没有差异可声明（与查询域 17 个场景同一形状：
 *  读命令的页型住自己的装配件 `./template-summary.js`，不经场景件）。
 *
 * 老侧对应件：`scenes/account.yaml` 的 4 个场景 ＋ `scripts/account/render.py` 的 4 个渲染器。
 *  老侧一域四张模板与本题三片页型的对应写在 `docs/skills/skill-bill/t691-差异表.md`。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/account/write.ts`——写命令处理体：缺项时叫这一件的 `collect`，写库成功后叫 `receipt`；
 *   ② `src/account/index.ts`——域门把 `ACCOUNT_WRITE_SCENES` 转出给测试（域内别处不读它）。
 */
import { BillPolicyError } from '../fetch/errors.js';
import type { AccountRow } from './accounts.js';
import type { AccountBlocked, AccountOp } from './params.js';
import { SCENE as sceneAdd } from './scene-add.js';
import { SCENE as sceneTransfer } from './scene-transfer.js';
import { SCENE as sceneUpdate } from './scene-update.js';

/** 采集页入参：这一页是谁 ＋ 缺什么 ＋ 账户表现状 ＋ 复制日志与脚注的取数。 */
export interface AccountCollectInput {
  /** 对外命令名（`bill.account.write`）。 */
  readonly key: string;
  /** 这一页是哪一支操作。 */
  readonly op: AccountOp;
  /** 本次参数（复制日志那行命令原文照它拼，可照抄重跑）。 */
  readonly params: Record<string, unknown>;
  /** 缺什么／哪一格的值进不去（空数组＝可以写库，本页不该出）。 */
  readonly blocked: readonly AccountBlocked[];
  /** 账户表现状（登记顺序；建议与只读表都读它）。 */
  readonly accounts: readonly AccountRow[];
  /** 本次数据来源（复制日志第 3 段）。 */
  readonly source: string;
  /** 本次执行时刻（复制日志第 5 段）。 */
  readonly actionAt: string;
}

/** 一次写库的事实（回执页与复制日志都读它）。**形状由本域定**：账户域改的是账户表与账本两处，
 *  与写入域的「一条记录」不是同一件事，故不复用 `../shared/writeParts.js` 的 `BillReceipt`。 */
export interface AccountReceipt {
  readonly op: AccountOp;
  /** 一句人话回执（页副标题、复制日志、出口 message 共用）。 */
  readonly summary: string;
  /** 库里改动的处数（SQLite `total_changes()` 前后差；转账＝2）。 */
  readonly affectedRows: number;
  /** 写入时刻（本地时钟，`YYYY-MM-DD HH:MM:SS`）。 */
  readonly actionAt: string;
  /** 本次数据来源（复制日志第 3 段）。 */
  readonly source: string;
  /** 值与改前一致（只可能出现在改账户那一支）。 */
  readonly noChange: boolean;
  /** 写完之后账户表里一共几个账户。 */
  readonly accountCount: number;
  /** 改名带动的历史流水笔数（其余支＝0）。 */
  readonly renamedRows: number;
  /** 改名那一路的原值（其余支＝`null`）。 */
  readonly before: AccountRow | null;
  /** 改名那一路的新值（其余支＝`null`）。 */
  readonly after: AccountRow | null;
}

/** 回执页入参：回执事实 ＋ 明细行 ＋ 账户表现状 ＋ 取数。 */
export interface AccountReceiptInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly receipt: AccountReceipt;
  /** 明细表的行（本次写进去的项与值）。 */
  readonly detail: readonly { readonly k: string; readonly v: string }[];
  readonly accounts: readonly AccountRow[];
}

/** 一件场景件：一条唤醒词的落点。 */
export interface AccountWriteScene {
  /** 件的名字（与文件名 `scene-<id>.ts` 对得上）。 */
  readonly id: string;
  readonly key: 'bill.account.write';
  readonly op: AccountOp;
  /** 待哪一族窗口来填这一件的页（账户域只有一族：账户管理）。 */
  readonly family: string;
  /** 这一件的过程型采集页（缺项那一支）。 */
  readonly collect: (input: AccountCollectInput) => string;
  /** 这一件的结果型回执页（写库成功那一支）。 */
  readonly receipt: (input: AccountReceiptInput) => string;
}

/** 3 行的落点表（**唯一定义地**）：顺序＝域声明里那三条词的书写顺序（新增账户／改账户／账户转账）。 */
export const ACCOUNT_WRITE_SCENES: readonly AccountWriteScene[] = [sceneAdd, sceneUpdate, sceneTransfer];

const BY_OP = new Map<AccountOp, AccountWriteScene>(ACCOUNT_WRITE_SCENES.map((s) => [s.op, s]));

/** 取件：按 `op` 认（账户写命令的三支操作各一件）。认不得的 op 即抛——**不猜、不兜底**
 *  （`op` 已在 `./params.js` 的 `parseAccountOp` 拦过一道，走到这里还认不得即是代码缺陷）。 */
export function writeSceneFor(op: AccountOp): AccountWriteScene {
  const hit = BY_OP.get(op);
  if (hit === undefined) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '账户写命令没有这一支操作：' + String(op));
  }
  return hit;
}
