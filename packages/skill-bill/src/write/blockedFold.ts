/** 缺项阻断条的**折叠摆法**（写入域共用件）：共用的阻断条——「还缺什么」错误回执、缺项明示表、
 *  写库口令原文、置灰的写库按钮——整条收进折叠区，首屏只留缺项标签与进度两处形状承担提示。
 *  派单的架构级整改要的就是这一条（口令原文块整条可见 → 折叠）。
 *
 * **判定与文案仍是 `./blockedSlots.js` 那一份**：本件只把共用件的产出换个位置摆，不另写第二份缺项口径，
 *  也不改阻断行为（写库那一半照旧由 `src/write/write.ts` 拦）。折叠区里那枚置灰按钮不带 `data-t`，
 *  折叠与否都点不动（`packages/base-render/src/controls.ts` 的点击委派读到空 `data-t` 即早退）。
 *
 * 谁在用（两张模板、两族，指名）：`src/write/template-expense.ts`（记账族五条词：记支出／记收入／
 *  拍账单／记报销／记一笔）与 `src/write/template-batch.ts`（批量录入）——两张族的采集页同一摆法，
 *  改一处两族同时改。（另三张模板 `template-{flow,installment,update}.ts` 各有自己的折叠摆法，不指本件。）
 *
 * 件史：本件此前是 `src/write/collectBody.ts` 的通用采集页装配体，那件已无任何调用方（场景件都走模板了），
 *  随票删除；那个装配体里只剩这一个函数还有用，故搬到件名说了它是什么的本件。
 */
import { renderDisclosure } from 'base-paint/blocks';
import { blockedBar } from './blockedSlots.js';
import type { BlockedItem } from './blockedSlots.js';

/** 采集页的缺项阻断块（折叠形）：不给内容（没缺项）＝不出这一块。 */
export function collectBlockedFold(input: {
  readonly items: readonly BlockedItem[];
  /** 写库口令原文（补齐后照抄重跑那条）；带尖括号占位符。 */
  readonly command: string;
  /** 补齐之后会发生什么（不给＝走共用件那句缺省口径）。 */
  readonly note?: string;
}): string {
  if (input.items.length === 0) return '';
  return renderDisclosure({
    title: '还缺什么，以及补齐后照抄的那条',
    contentHtml: blockedBar({
      items: input.items,
      command: input.command,
      ...(input.note === undefined ? {} : { note: input.note }),
    }),
  });
}
