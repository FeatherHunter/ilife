/** #251 · 写后回执页的两块共用件：状态卡 ＋ 页尾「对账信息」折叠区。
 *
 * 谁在用（写得出哪两个在用）：
 *   ① **基础信息**（`src/profile/setup.ts` 的两张回执页与 `src/profile/update.ts` 的改档案回执）；
 *   ② **目标管理**（`src/goal/` 的写后回执页）。
 * 这两块此前只在 `src/profile/setup.ts` 里定义、被同目录 `update.ts` 取用——**同一件事的定义地
 * 跟着第二个能力一起上移到共用位**（`docs/agents/structure.md`：共用位是从第二个用法里长出来的）。
 *
 * 块与整页的分工：整页装配住同目录 `docPage.ts`（`assembleDocPage`），本文件只出**页内的两块**；
 * 复制与提示住同目录 `copyArea.ts`。三者各管一段，互不重复定义。
 *
 * 一处由调用方给的措辞：**写入去向那句说明**（`writtenDetail`）。基础信息写的是档案、目标管理写的是
 * 目标，两边说法不同，故它是必填参数——不给默认值，免得哪一页悄悄用了别域的说法。
 */
import { renderDataTable, renderDisclosure } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';

/** 一格的状态值：无改动／已改动 ＋ 一句写入去向的说明（说明由调用方按本域措辞传入）。
 *  承接原「无变化 否」那个双重否定，一页只出现这一处。 */
export function statusCard(receipt: CrudReceipt, writtenDetail: string): KpiCardInput {
  return {
    label: '状态',
    value: receipt.noChange ? '无改动' : '已改动',
    detail: receipt.noChange ? '值与改前一致' : writtenDetail,
  };
}

/** 页尾「对账信息」折叠区：本次写入的**可核对信息**——记录编号／写入时间／回执格式。
 *  影响行数与写入字段已在卡片上，这里不重写；眉标与副标题不再出现版本号与那行机器文本。 */
export function reconcileDisclosure(receipt: CrudReceipt): string {
  return renderDisclosure({
    title: '对账信息',
    contentHtml: renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '记录编号', v: receipt.recordId === null ? '未设置' : String(receipt.recordId) },
        { k: '写入时间', v: receipt.meta.actionAt },
        { k: '回执格式', v: 'v' + receipt.m5Contract + '（写库回执）' },
      ],
    }),
  });
}
