/** 写入域场景件的公共契约与落点表（**唯一定义地**）。
 *
 * 本件回答两件事：
 *   ① 一件场景件长什么样——`Scene`（id／唤醒词／命令全名／认的 kind／认的 op／待哪一族窗口来填／两张页的装配函数）；
 *   ② 一条命令该落哪一件——`sceneFor`，判定只有四条（见该函数）。
 *
 * `SCENES` 是 16 行的落点表：13 条 `bill.record.add`（含无 kind 的通用词「记一笔」）＋
 *  `bill.record.update` 的改记录／撤销／恢复三支，一条词一行、一件。这张表与
 *  `docs/skills/skill-bill/t407-场景落点清单.md` 是同一件事的两面：清单给人看，这张表给分派看。
 *
 * 拆件的用意：拆件前 16 条词共用 `collect.ts`／`receipt.ts` 两个件里的装配体，同一时刻只允许一个执行者在写，
 *  15 张页只能串行；拆成一场景一件之后，三族窗口各改各那一件，零文件重叠。
 * 本票**只搬不改行为**：16 件现在都指同一对通用装配体（`./collectBody.ts`／`./receiptBody.ts`），
 *  逐条真跑的产物与拆件前逐字节同量级（读数见 `t407-拆件与三个缺口块-证据.md` 第六节）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/write/collect.ts`——采集页分派：`sceneFor` 取件，叫它的 `collect`；
 *   ② `src/write/receipt.ts`——回执页分派：同一件，叫它的 `receipt`。
 */
import type { BillRow } from '../fetch/db.js';
import type { SummaryFacts } from './summaryRow.js';
import type { BillReceipt } from '../shared/writeParts.js';
import type { RecordSlot } from './slots.js';
import { SCENE as sceneBorrow } from './scene-borrow.js';
import { SCENE as sceneBatch } from './scene-batch.js';
import { SCENE as sceneCollect } from './scene-collect.js';
import { SCENE as sceneExpense } from './scene-expense.js';
import { SCENE as sceneIncome } from './scene-income.js';
import { SCENE as sceneInstallment } from './scene-installment.js';
import { SCENE as sceneLend } from './scene-lend.js';
import { SCENE as scenePhoto } from './scene-photo.js';
import { SCENE as scenePlain } from './scene-plain.js';
import { SCENE as sceneRefund } from './scene-refund.js';
import { SCENE as sceneReimburse } from './scene-reimburse.js';
import { SCENE as sceneReimburseDone } from './scene-reimburse-done.js';
import { SCENE as sceneRepay } from './scene-repay.js';
import { SCENE as sceneRestore } from './scene-restore.js';
import { SCENE as sceneUndo } from './scene-undo.js';
import { SCENE as sceneUpdate } from './scene-update.js';

/** 采集页入参：时刻与来源由调用方给（共用位不取时钟、不取库文件名）；`recent`＝近期记录（预填／重复检测／候选三处共用）。 */
export interface CollectInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly slots: readonly RecordSlot[];
  readonly missing: readonly RecordSlot[];
  readonly source: string;
  readonly actionAt: string;
  /** 本页执行那天（`YYYY-MM-DD`）：缺省时间的取值、重复检测的比对面都用它。 */
  readonly today: string;
  /** 近期记录（按时间倒序，最近在先）；取数由处理体给，页面不碰库。 */
  readonly recent: readonly BillRow[];
}

/** 回执页入参：回执事实 ＋ 本次写入的明细行 ＋ 一句写入去向的说明（`receiptStatusCard` 要它）
 *  ＋ 摘要行的六个事实 ＋ 近期记录（重复检测用；取数由处理体给，页面不碰库）。 */
export interface ReceiptInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly receipt: BillReceipt;
  readonly writtenDetail: string;
  /** 明细表的行（本次写入的字段与值）；写成字面量类型（不是 interface）的理由见 `receiptBody.ts`。 */
  readonly detail: readonly { readonly k: string; readonly v: string }[];
  readonly facts: SummaryFacts;
  readonly recent: readonly BillRow[];
}

/** 一件场景件：一条唤醒词的落点。 */
export interface Scene {
  /** 件的名字（与文件名 `scene-<id>.ts` 对得上）。 */
  readonly id: string;
  /** 命令全名（`bill.record.add` 或 `bill.record.update`）。 */
  readonly key: string;
  /** 认的 `kind` 值（空串＝这一件不按 kind 认，靠命令名落）。 */
  readonly kind: string;
  /** 认的 `op` 值（空串＝这一件不按 op 认）。 */
  readonly op: string;
  /** 待哪一族窗口来填这一件的页（三族：基础收支族／特殊收支族／批量与修正族）。 */
  readonly family: string;
  /** 这一件的过程型采集页（缺项那一支）。 */
  readonly collect: (input: CollectInput) => string;
  /** 这一件的结果型回执页（写库成功那一支）。 */
  readonly receipt: (input: ReceiptInput) => string;
}

/** 16 行的落点表（**唯一定义地**）。顺序与 `t407-场景落点清单.md` 一致：先 13 条录入词，后 3 条修正词。
 *
 * 表里**不写唤醒词**（#721 撤）：这一件认哪些 `kind`／`op` 是**处理方声明**（`sceneFor` 靠它选件，
 * 不走词表），而「这一件服务哪条词」是**词条**的事实、由域声明拥有。要那一行词就现算：
 * `projectWakeWord({ key: s.key, kind: s.kind, op: s.op })`（`src/triggers/wakeTable.ts`）；
 * 两者的一致性由 `test/t721-域声明.test.mjs` 的「落点表 ↔ 词条」逐件断言钉住。 */
export const SCENES: readonly Scene[] = [
  sceneExpense, sceneIncome, scenePhoto, sceneBatch, sceneRefund, sceneReimburse, sceneReimburseDone,
  sceneLend, sceneBorrow, sceneCollect, sceneRepay, sceneInstallment, scenePlain,
  sceneUpdate, sceneUndo, sceneRestore,
];

const BY_KIND = new Map(SCENES.filter((s) => s.kind !== '').map((s) => [s.kind, s]));
const BY_OP = new Map(SCENES.filter((s) => s.op !== '').map((s) => [s.op, s]));

/** 取件（判定只有四条，见件头；认不得的 kind 落「记一笔」，不猜、不抛——命令本身已由注册表拦过）。 */
export function sceneFor(input: { readonly key: string; readonly kind?: string; readonly op?: string }): Scene {
  const kind = typeof input.kind === 'string' ? input.kind : '';
  const op = typeof input.op === 'string' ? input.op : '';
  const byKind = BY_KIND.get(kind);
  if (kind !== '' && byKind !== undefined) return byKind;
  const byOp = BY_OP.get(op);
  if (byOp !== undefined) return byOp;
  if (input.key === 'bill.record.update') return sceneUpdate;
  return scenePlain;
}
