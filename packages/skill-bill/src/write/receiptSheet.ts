/** 小票纸取值小件（#993）：改动结论标题、印章、落点账目、退出口真按钮。
 *
 * 为什么另立一件：块位序列住 `./template-update.ts`，这些管的是**值**（标题怎么拼、印章哪一枚、
 * 账目行取哪几格）——两者变化频率不同；且模板件曾越 350 线，本件分担后它落回线内。
 * 本件零块位拼装（纸／头／账的渲染调用仍在模板件里，店头块住共用位 `../shared/docPage.js`），
 * 只把普通数据加工成普通数据与小段标记。
 *
 * 谁在用（一处，指名）：`./template-update.ts` 的 `receiptPage`（改记录／撤销／恢复三支共用）。
 */
import { escapeHtml } from 'base-paint';
import type { BillReceipt } from '../shared/writeParts.js';
import { WRITE_DECLARATION } from './declaration.js';
import { categoryLabelOf } from '../shared/category.js';
import type { SummaryFacts } from './summaryRow.js';
import { fieldLabelOf } from './userWording.js';

/** 回执分支（与 `UpdateSpec.receiptResult` 同一闭集，不另立第二份）。 */
export type ReceiptResult = 'none' | 'undo' | 'restore';

/** 回执纸头标题（一数一处）：改记录支按本次改动的字段拼改动结论（明细首行是编号行，不算改动）；
 *  撤销／恢复两支报状态＋编号。 */
export function receiptTitle(
  result: ReceiptResult,
  receipt: BillReceipt,
  detail: readonly { readonly k: string; readonly v: string }[],
  params: Record<string, unknown>,
): string {
  if (result === 'undo') {
    return '已撤销记录' + (receipt.recordId === null ? '' : ' ' + receipt.recordId);
  }
  if (result === 'restore') {
    return '已恢复记录' + (receipt.recordId === null ? '' : ' ' + receipt.recordId);
  }
  const labels = receipt.writtenFields.map((f) => fieldLabelOf(f));
  if (labels.length === 1 && labels[0] !== undefined) {
    const label = labels[0];
    const row = detail.find((d) => d.k === label);
    const raw = row?.v ?? params[receipt.writtenFields[0] as string];
    const value = typeof raw === 'string' ? raw : String(raw ?? '');
    return escapeHtml(label) + (value === '' ? '已改' : '已改为<span class="hl">' + escapeHtml(value) + '</span>');
  }
  if (labels.length === 0) return '没有改动';
  return '改了' + labels.length + '项：' + escapeHtml(labels.join('、'));
}

/** 主数字头那枚印章：改记录支按有无改动；撤销／恢复两支按状态（tone 走公共层闭集）。 */
export function receiptStamp(result: ReceiptResult, receipt: BillReceipt): { readonly text: string; readonly tone: 'ok' | 'warn' | 'danger' } {
  if (result === 'undo') return { text: '已撤销', tone: 'danger' };
  if (result === 'restore') return { text: '已恢复', tone: 'ok' };
  return receipt.noChange ? { text: '无改动', tone: 'warn' } : { text: '已改动', tone: 'ok' };
}

/** 改后落点账目行：分类／账户／账本／时间各一处（空值写「未给」，与摘要行同一口径）。
 *  分类走纸面显示写法（`../shared/category.js` 的 `categoryLabelOf`，原型 v5 印的是全角斜线那串）。 */
export function landedRows(facts: SummaryFacts): readonly { readonly label: string; readonly value: string }[] {
  const pick = (v: string): string => (v.trim() === '' ? '未给' : v);
  return [
    { label: '分类', value: facts.category.trim() === '' ? '未给' : categoryLabelOf(facts.category) },
    { label: '账户', value: pick(facts.account) },
    { label: '账本', value: pick(facts.ledger) },
    { label: '时间', value: pick(facts.time) },
  ];
}

/** 退出口那一行口径（#993 v5 原型的 `.caliber`）：撤销是**打标**不是物理删除。
 *  逐字取原型那一句，只去掉它前面那截设计注记「口径小字：」（注记不上屏）。
 *  只给带撤销出口的两支（改记录／撤销）；恢复那一支不印这一句。 */
export const UNDO_CALIBER = '撤销只打标、可恢复，原记录保留痕迹，不会物理删除。';

/** 退出口真按钮的复制位（#993）：#733 杀的是无载荷死按钮，本位带撤销／恢复的人话 prompt。
 *  文案不另写第二份——逐字取写入域声明（`./declaration.js`，HELP 页上同一份）里
 *  `write_undo`／`write_restore` 的 `prompt_template`，只把 `{{target}}` 填成这一笔的编号；
 *  机器命令原文仍在复制日志第 4 段，人话与机器各走各的（#688 裁定）。
 *  返回给模板件的是 `ticketPrimaryButton` 那一格，由模板件拼进行动条（按钮形态归公共层）。 */
const EXIT_SCENE_OF = { undo: 'write_undo', restore: 'write_restore' } as const;

export function exitCopyOf(
  exit: 'undo' | 'restore',
  recordId: number | null,
): { readonly label: string; readonly actionId: string; readonly text: string } | null {
  if (recordId === null) return null;
  const isUndo = exit === 'undo';
  const want = EXIT_SCENE_OF[exit];
  let template: string | null = null;
  for (const entry of WRITE_DECLARATION.entries) {
    const scene = entry.scenes.find((s) => s.id === want);
    if (scene !== undefined) { template = scene.prompt_template; break; }
  }
  if (template === null) throw new Error('receiptSheet: 写入域声明里找不到场景 `' + want + '`（退出口复制位无模板可用）');
  return {
    label: isUndo ? '撤销这一笔' : '恢复这一笔',
    actionId: isUndo ? 'ilife-undo-copy' : 'ilife-restore-copy',
    text: template.replace('{{target}}', '记录编号 ' + recordId),
  };
}
