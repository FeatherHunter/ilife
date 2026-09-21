/** 采购能力的页面装配（生成清单一页，全走公共层区块，不自写样式）。
 *
 * 老件骨架来源：`templates/shopping_view.html`（小结四格＋分组表＋工具条）。
 * 新页按同一信息组织：结论条＋事实条＋读数卡＋分组折叠＋库存降级口径行＋复制区。
 */

import { renderActionBar, renderFactStrip } from 'base-paint';
import {
  renderCaliberLine,
  renderConclusionBar,
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderPageShell,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { pageShapeCss, pageUiCss } from 'base-paint';
import type { ShoppingItem } from '../fetch/db.js';

/** 生成清单页（结果型）。 */
export function shoppingListPage(input: {
  recipes: string[];
  items: ShoppingItem[];
  servingsText: string;
  excludeOptional: boolean;
  stockSkipped: boolean;
}): string {
  const byCategory = new Map<string, ShoppingItem[]>();
  for (const it of input.items) {
    const cat = it.category || '其他';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)?.push(it);
  }
  const groups = [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'));
  const blocks = [
    renderConclusionBar('清单已按' + input.servingsText + '备齐，直接照单采购。'),
    renderFactStrip({
      items: [
        { label: '菜数', value: String(input.recipes.length) + '道' },
        { label: '食材', value: String(input.items.length) + '味' },
        { label: '份量', value: input.servingsText },
      ],
    }),
    renderKpiGrid([
      { label: '菜数', value: String(input.recipes.length), unit: '道' },
      { label: '食材', value: String(input.items.length), unit: '味' },
      { label: '分组', value: String(groups.length), unit: '组' },
    ]),
    ...groups.map(([cat, rows]) =>
      renderDisclosure({
        title: cat + '（' + rows.length + '味）',
        contentHtml: renderDataTable({
          caption: cat,
          columns: [
            { key: 'name', label: '食材' },
            { key: 'qty', label: '用量', align: 'right' },
            { key: 'from', label: '来自哪道菜' },
          ],
          rows: rows.map((g) => ({
            name: g.name,
            qty: g.quantity === null || g.quantity === undefined ? g.quantity_text || '适量' : String(Math.round(Number(g.quantity) * 100) / 100) + ' ' + g.unit,
            from: g.recipes.join('、'),
          })),
        }),
      }),
    ),
    renderCaliberLine(
      (input.excludeOptional ? '已排除可选食材。' : '') + (input.stockSkipped ? '本次不核对家里库存。' : '库存核对走调用契约：复制清单找居家管家核对，本页不直连他库。'),
    ),
    renderActionBar({
      buttons: [
        { label: '复制清单去核库存', kind: 'primary', actionId: 'shopping-stock' },
        { label: '再算一份清单', kind: 'ghost', actionId: 'shopping-again' },
      ],
    }),
    renderCopyBlock({
      title: '复制采购清单',
      dataActionId: 'shopping-copy',
      dataText: input.recipes.join('、') + '：' + input.items.map((g) => g.name + String(Math.round(Number(g.quantity) * 100) / 100) + g.unit).join('、'),
    }),
  ];
  return renderDocShell({
    docTitle: '生成清单',
    bodyHtml: renderPageShell({ eyebrow: '私家大厨 ｜ 采购', title: '生成清单', content: blocks.join('') }),
    extraCss: pageUiCss() + '\n' + pageShapeCss(),
    pageUi: true,
  });
}
