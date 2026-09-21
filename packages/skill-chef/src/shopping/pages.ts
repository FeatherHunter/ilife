/** 采购能力的页面装配（生成清单一页，全走公共层区块＋页内一段收口样式）。
 *
 * 老件骨架来源：`templates/shopping_view.html`（小结四格＋分组表＋工具条）。
 * 新页按同一信息组织：结论条＋读数带＋分区折叠＋库存口径行＋复制区。
 *
 * #873 页内收口（公共层只给到形状那一层，层级的最后一档落在页内）：
 *  ① **四条读数只画一遍**（菜数／食材／分组／份量），读数卡网格下线——≤640 档公共层把读数卡栅格
 *    写成两列，奇数张必落一张孤卡（#871 证据件 §四 E 记过同一类账：恢复奇数格读数卡要先给公共层
 *    补一条规则，本包不许改公共层，故走页面侧收口）；
 *  ② 格与格之间用**发丝线**分区、标签 12px／数值 17px、桌面档格内居中——「这是几件事、各是什么」
 *    由形状与字号说，不靠读者数间距；
 *  ③ 页头图标位（采购袋）与开合标记的暖色圆点（纯装饰，进 CSS 的只有空串）。
 */

import { CHART_PALETTE, CSS_VAR_TOKENS, renderActionBar, renderFactStrip } from 'base-paint';
import {
  renderCaliberLine,
  renderConclusionBar,
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderPageShell,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { chefSceneCss } from '../render/skin.js';
import type { ShoppingItem } from '../fetch/db.js';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／皮肤件同）。 */
const LF = String.fromCharCode(10);

/** hex → `r, g, b`：本页 `rgba()` 浅底／描边的唯一换算位（色基只从冻结 token 与调色板取）。 */
function rgbOf(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}

/** 页头图标位（纯装饰的内联 SVG，`data:image/svg+xml` 直接进 CSS）：只做「这一页是什么」的图形锚，
 *  不承载任何数据、不进文档流文字。形状用调色板里的暖色描边（与品牌带同一族）。 */
function heroMark(art: string): string {
  return 'url("data:image/svg+xml,' + art + '")';
}

/** 采购袋（页头图标位）。 */
const BAG_MARK = heroMark(
  '%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2064%2064%27%3E'
  + '%3Cpath%20d=%27M15%2024h34l-4%2030h-26Z%27%20fill=%27%23ffcc00%27%20fill-opacity=%27.25%27'
  + '%20stroke=%27%23ff9500%27%20stroke-width=%273%27%20stroke-linejoin=%27round%27/%3E'
  + '%3Cpath%20d=%27M24%2024v-4a8%208%200%200%201%2016%200v4%27%20fill=%27none%27'
  + '%20stroke=%27%23ff2d55%27%20stroke-width=%273%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E',
);

/** 本页收口样式（#873 采购席）。每一条都在本技能根类之下，别的技能页一行不变。 */
function shoppingPageCss(): string {
  const yellow = rgbOf(CHART_PALETTE[6]);
  const warm = rgbOf(CHART_PALETTE[2]);
  const line = rgbOf(CSS_VAR_TOKENS['--line']);
  const root = '.ilife-page-ui ';
  return [
    '/* #873 采购·生成清单 页内收口 · 每一条都挂在根类之下 */',
    '/* 页头图标位：页名右侧一枚采购袋（纯装饰）。 */',
    root + '.ilife-block-page-shell-title {',
    '  position: relative;',
    '}',
    root + '.ilife-block-page-shell-title::after {',
    '  content: "";',
    '  position: absolute;',
    '  right: 0;',
    '  top: 0;',
    '  width: 48px;',
    '  height: 48px;',
    '  background-image: ' + BAG_MARK + ';',
    '  background-repeat: no-repeat;',
    '  background-size: 48px 48px;',
    '}',
    '/* 读数带：四条读数收进一张暖色面板，格间发丝线分区（不用任何分隔符字符）。 */',
    root + '.ilife-chef-deck {',
    '  box-sizing: border-box;',
    '  margin: 16px 0 0;',
    '  padding: 0;',
    '  border: 1px solid rgba(' + warm + ', .30);',
    '  border-radius: 14px;',
    '  background-image: linear-gradient(100deg, rgba(' + yellow + ', .20), var(--card) 58%);',
    '  box-shadow: 0 1px 3px rgba(' + line + ', .50);',
    '}',
    root + '.ilife-chef-deck .ilife-block-fact-strip-item {',
    '  flex: 1 1 auto;',
    '  padding: 11px 12px;',
    '  border: 0;',
    '  border-radius: 0;',
    '  background-color: transparent;',
    '}',
    root + '.ilife-chef-deck .ilife-block-fact-strip-item + .ilife-block-fact-strip-item {',
    '  border-left: 1px solid rgba(' + line + ', .90);',
    '}',
    // 标签与数值差 5px：一屏里「哪一列是什么」不再靠猜。
    root + '.ilife-chef-deck .ilife-block-fact-strip-label {',
    '  letter-spacing: .06em;',
    '}',
    root + '.ilife-chef-deck .ilife-block-fact-strip-value {',
    '  font-size: 17px;',
    '  font-weight: 700;',
    '}',
    // 桌面档把格内容居中：四格等宽时短值不再孤零零贴左，整条读数带读起来是一排读数而不是四个洞。
    '@media (min-width: 820px) {',
    '  ' + root + '.ilife-chef-deck .ilife-block-fact-strip-item {',
    '    align-items: center;',
    '    text-align: center;',
    '  }',
    '}',
    // 开合标记：改成 10px 暖色小圆点（公共层给的蓝三角落在 24px 圆底上读起来像一个播放键，
    // 且「左边条 ＋ 圆底」两件记号在同一行里是重复的层级记号）。
    root + '.ilife-block-page-shell-body > .ilife-block-disclosure > .ilife-block-disclosure-summary::before {',
    '  width: 10px;',
    '  height: 10px;',
    '  line-height: 0;',
    '  border-radius: 999px;',
    '  background-color: rgba(' + warm + ', .85);',
    '  color: transparent;',
    '}',
  ].join(LF);
}

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
  const round = (n: number): number => Math.round(n * 100) / 100;
  const blocks = [
    renderConclusionBar('已按' + input.servingsText + '算好，照着买就行。'),
    renderFactStrip({
      extraClass: 'ilife-chef-deck',
      items: [
        { label: '菜数', value: String(input.recipes.length) + ' 道' },
        { label: '食材', value: String(input.items.length) + ' 味' },
        { label: '分组', value: String(groups.length) + ' 组' },
        { label: '份量', value: input.servingsText },
      ],
    }),
    ...groups.map(([cat, rows], index) =>
      renderDisclosure({
        // 第一组默认展开：首屏要看得见「这一单到底买什么」，其余三组折叠。
        open: index === 0,
        title: cat + '（' + rows.length + '味）',
        contentHtml: renderDataTable({
          // 不画表注：分组名已由折叠条标题承载，同一组名画两遍是复读。
          // 「来自哪道菜」只在真的多道菜合并时才成一列；一道菜时它每一行都是同一个值（已在读数带
          // ——菜数 1 道——说过一次了），留着只是把同一句话重复 N 行。
          columns: input.recipes.length > 1
            ? [
                { key: 'name', label: '食材' },
                { key: 'qty', label: '用量', align: 'right' },
                { key: 'from', label: '来自哪道菜' },
              ]
            : [
                { key: 'name', label: '食材' },
                { key: 'qty', label: '用量', align: 'right' },
              ],
          rows: rows.map((g) => ({
            name: g.name,
            qty: g.quantity === null || g.quantity === undefined
              ? g.quantity_text || '适量'
              : String(round(Number(g.quantity))) + ' ' + g.unit,
            from: g.recipes.join('、'),
          })),
        }),
      }),
    ),
    renderCaliberLine(
      (input.excludeOptional ? '已排除可选食材。' : '')
      + (input.stockSkipped ? '这次不核对家里的库存。' : '家里的库存交给居家管家核对。'),
    ),
    renderActionBar({
      buttons: [
        { label: '复制清单核对库存', kind: 'primary', actionId: 'shopping-stock' },
        { label: '再算一份清单', kind: 'ghost', actionId: 'shopping-again' },
      ],
    }),
    renderCopyBlock({
      title: '复制采购清单',
      dataActionId: 'shopping-copy',
      dataText: input.recipes.join('、') + '：' + input.items.map((g) => g.name + round(Number(g.quantity)) + g.unit).join('、'),
    }),
  ];
  return renderDocShell({
    docTitle: '生成清单',
    bodyHtml: renderPageShell({ eyebrow: '私家大厨 ｜ 采购', title: '生成清单', content: blocks.join('') }),
    extraCss: chefSceneCss() + LF + shoppingPageCss(),
    pageUi: true,
  });
}
