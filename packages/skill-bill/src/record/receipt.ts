/** 结果型回执整页装配：两条写命令各出一页（记一笔的一页、改记录的一页／撤销／恢复各一页形态）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/write.ts` 的 `writeRecordAdd`——记一笔写库成功后出本页；
 *   ② `src/record/write.ts` 的 `writeRecordEdit`（改字段／撤销／恢复三支共用）——改记录写库成功后出本页。
 *
 * 用 base 现成组件，一件不自造：状态徽标 `renderStatusBadge`／三格卡 `renderKpiGrid`（状态卡住
 *   `src/shared/receiptParts.ts`）／明细表 `renderDataTable`／页尾对账折叠区 `renderDisclosure`（同上）／
 *   复制区与复制日志住 `src/shared/copyArea.ts`／整页包裹住 `src/shared/docPage.ts`。
 * 页标题由回执事实的 `op` 派生（**唯一来源**）：一次写库只有 add／update／undo／restore 四种，页面名跟着它走，
 *   不另立一张「命令名 → 页标题」的表。
 * 未用到的 base 组件（记成遗留，不硬塞）：`renderErrorReceipt`——写库失败仍走 stderr ＋ 非 0 退出码、不出错误页，
 *   失败回执面是后票的事；`renderEmptyState`——回执页恒有数据、采集页恒有缺槽位明示，本票没有正当落点。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { renderStatusBadge, type SerializableEnvelope } from 'base-paint';
import type { RecordOp } from '../policy/record.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { commandLine, DOC_SKILL, DOC_TITLE, DOC_VERSION, writeSection } from '../shared/writeParts.js';
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

/** 回执整页入参：回执事实 ＋ 本次写入的明细行 ＋ 一句写入去向的说明（`receiptStatusCard` 要它）。 */
interface ReceiptInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly receipt: BillReceipt;
  readonly writtenDetail: string;
  readonly detail: readonly DetailRow[];
}

/** 结果型回执整页：状态徽标 ＋ 状态／影响行数／写入字段三格 ＋ 写入明细表 ＋ 对账折叠区 ＋ 复制区。 */
export function recordReceiptDoc(input: ReceiptInput): string {
  const { key, params, receipt } = input;
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION,
    skill: DOC_SKILL,
    shape: 'receipt',
    key,
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    renderStatusBadge({ status: 'ok', text: '写库成功' }),
    renderKpiGrid([
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: input.detail,
      caption: '本次写入的字段与值',
    }),
    reconcileDisclosure(receipt),
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
  return assembleDocPage({
    docTitle: DOC_TITLE + '·写库回执',
    title: PAGE_TITLES[receipt.op],
    eyebrow: '记账 · 写入域',
    subtitle: receipt.summary,
    content: writeSection({ slot: 'receipt', key, content }),
  });
}
