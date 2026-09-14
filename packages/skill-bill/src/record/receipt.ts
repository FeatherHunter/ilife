/** 结果型回执整页装配：两条写命令各出一页（记一笔的一页、改记录的一页／撤销／恢复各一页形态）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/write.ts` 的 `writeRecordAdd`——记一笔写库成功后出本页；
 *   ② `src/record/write.ts` 的 `writeRecordUpdate`（改字段／撤销／恢复三支共用）——改记录写库成功后出本页。
 *
 * 页内块按第一节的页面积木拼，一件不自造：类型徽章（`src/shared/typeBadge.ts` 的 `typeBadge`）／结论摘要行
 *   `src/shared/summaryRow.ts` 的 `summaryCards`（与状态卡、影响行数、写入字段并进同一张网格）／
 *   重复检测提示条 `src/shared/duplicateNote.ts`（写完再报一次，排除本次这条编号）／明细表 `renderDataTable`／
 *   页尾对账折叠区与状态卡 `src/shared/receiptParts.ts`／退出口与复制区三件 `src/shared/copyArea.ts`／
 *   整页包裹 `src/shared/pageShell.ts`。
 * 页标题由回执事实的 `op` 派生（**唯一来源**）：一次写库只有 add／update／undo／restore 四种，页面名跟着它走，
 *   不另立一张「命令名 → 页标题」的表。
 * 未用到的 base 组件（记成遗留，不硬塞）：`renderEmptyBlock`——回执页恒有数据；失败那一面走
 *   `src/shared/errorReceipt.ts`（共用位内部件），它的整页替换落点是后票的事（见该文件头）。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { BillRow } from '../fetch/db.js';
import type { RecordOp } from '../policy/record.js';
import { copyArea, copyLog, undoExit } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { summaryCards } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { typeBadge } from '../shared/typeBadge.js';
import { commandLine } from '../shared/writeParts.js';
import type { BillReceipt } from '../shared/writeParts.js';

/** 四个操作各自的页标题。 */
const PAGE_TITLES: Record<RecordOp, string> = {
  add: '记一笔 · 回执',
  update: '改记录 · 回执',
  undo: '撤销 · 回执',
  restore: '恢复 · 回执',
};

/** 明细表的一行（本次写入的字段与值）。写成类型别名（不是 interface）：`renderDataTable` 的 rows
 *  收 `Readonly<Record<string, unknown>>`，对象字面量类型带隐式索引签名，interface 没有。 */
type DetailRow = {
  readonly k: string;
  readonly v: string;
};

/** 回执整页入参：回执事实 ＋ 本次写入的明细行 ＋ 一句写入去向的说明（`receiptStatusCard` 要它）
 *  ＋ 摘要行的六个事实 ＋ 近期记录（重复检测用；取数由处理体给，页面不碰库）。 */
interface ReceiptInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly receipt: BillReceipt;
  readonly writtenDetail: string;
  readonly detail: readonly DetailRow[];
  readonly facts: SummaryFacts;
  readonly recent: readonly BillRow[];
}

/** 结果型回执整页：类型徽章 ＋ 一张大网格（摘要行五格 ＋ 状态／影响行数／写入字段）＋ 重复检测提示条
 *  ＋ 写入明细表 ＋ 对账折叠区 ＋ 退出口 ＋ 复制区三件。 */
export function recordReceiptDoc(input: ReceiptInput): string {
  const { key, params, receipt } = input;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION,
    skill: DOC_SKILL,
    shape: 'receipt',
    key: sceneKeyOf(key),
    data: { ok: true, message: receipt.summary },
  };
  const kind = typeof params.kind === 'string' ? params.kind : '';
  const probe: DuplicateProbe = {
    amount: input.facts.amount,
    category: input.facts.category,
    date: input.facts.time,
    account: input.facts.account,
    ...(receipt.recordId === null ? {} : { excludeId: receipt.recordId }),
  };
  const content = [
    typeBadge({ kind, key, status: 'ok', state: '写库成功' }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: input.detail,
      caption: '本次写入的字段与值',
    }),
    reconcileDisclosure(receipt),
    receipt.recordId === null ? '' : undoExit(receipt.recordId),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(key, params),
          source: receipt.source,
          detail: '影响 ' + receipt.affectedRows + ' 行 · 字段 ' + (receipt.writtenFields.join('/') || '未设置'),
          actionAt: receipt.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·写库回执',
    title: PAGE_TITLES[receipt.op],
    subtitle: receipt.summary,
    slot: 'receipt',
    page: 'receipt',
    shape: envelope.shape,
    key,
    content,
  });
}
