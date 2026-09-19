/** 写后回执页与采集页的两块共用件：状态卡 ＋ 页尾「对账信息」折叠区。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/write/receipt.ts`——结果型回执整页：`receiptStatusCard`（已改动／无改动）＋ `reconcileDisclosure`；
 *   ② `src/write/collect.ts`——过程型采集页：`statusCard`（那一格写「待补槽位」）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *
 * 口径出处：照 `packages/skill-calorie/src/write/receiptParts.ts` 的两块（状态卡＋页尾对账折叠区），
 *   分「块」与「整页」的分工也照它：整页装配住同目录 `docPage.ts`，本文件只出页内的两块。
 * 一处由调用方给的措辞：**写入去向那句说明**（`writtenDetail`）——记一笔写的是账单、改记录改的是同一条，
 *   两边说法不同，故它是必填参数，不给默认值，免得哪张页悄悄用了别处的说法。
 */
import { renderDataTable, renderDisclosure } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { BillReceipt } from '../shared/writeParts.js';
import { RECEIPT_FORMAT } from '../shared/writeParts.js';

/** 一格的状态值：值 ＋ 一句说明（说明由调用方按本页措辞传入）。 */
export function statusCard(value: string, detail: string): KpiCardInput {
  return { label: '状态', value, detail };
}

/** 回执页的状态卡：无改动／已改动 ＋ 一句写入去向的说明。 */
export function receiptStatusCard(receipt: BillReceipt, writtenDetail: string): KpiCardInput {
  return statusCard(
    receipt.noChange ? '无改动' : '已改动',
    receipt.noChange ? '值与改前一致' : writtenDetail,
  );
}

/** 页尾「对账信息」折叠区：本次写入的**可核对信息**——记录编号／写入时间。
 *  这次记了几笔与写进去的项已在上方卡片上，这里不重写。
 *  本轮整改删掉两行内部话（照 `docs/skills/skill-bill/t407-文字审查.md` 第 54 条）：
 *  `本地时钟` 与 `回执格式 / v1（写库回执）`——前者是实现细节，后者是版本自指，用户都拿它没动作可做。 */
export function reconcileDisclosure(receipt: BillReceipt): string {
  return renderDisclosure({
    title: '对账信息',
    contentHtml: renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: [
        { k: '记录编号', v: receipt.recordId === null ? '还没有' : String(receipt.recordId) },
        { k: '写入时间', v: receipt.actionAt },
      ],
    }),
  });
}
