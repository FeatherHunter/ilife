/** 采购能力的页面装配（生成清单一页，全走公共层区块＋页内一段收口样式）。
 *
 * 老件骨架来源：`templates/shopping_view.html`（小结四格＋分组表＋工具条）。
 * 新页按同一信息组织：结论条＋品牌装饰带＋读数卡＋分区折叠＋动作行＋复制区。
 *
 * #873 页内收口（公共层只给到形状那一层，层级的最后一档落在页内）：
 *  ① 四条读数（菜数／食材／分组／份量）**只画一遍**，走读数卡栅格：四张＝**偶数**，
 *     ≤640 档公共层那条两列栅格正好排满两行，**没有孤卡**（#871 证据件 §四 E 记的账是「奇数张
 *     必落一张孤卡」；本包不许改公共层的栅格，故用「按偶数张开卡」这一手在页面侧收口）；
 *  ② 读数卡的正下方就是分组折叠——读数说总量、分组说去处，同一件事不画两遍；
 *  ③ 页头图标位 ＋ 品牌装饰带（都是内联 SVG，纯装饰，不载任何数据）。
 */

import { CHART_PALETTE, CSS_VAR_TOKENS, renderActionBar } from 'base-paint';
import {
  renderCaliberLine,
  renderConclusionBar,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderPageShell,
} from 'base-paint/blocks';
import { chefCopyArea } from '../render/copyArea.js';
import { renderSceneShell } from '../render/sceneShell.js';
import type { ShoppingItem } from '../fetch/db.js';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／皮肤件同）。 */
const LF = String.fromCharCode(10);

/** hex → `r, g, b`：本页 `rgba()` 浅底／描边的唯一换算位（色基只从冻结 token 与调色板取）。 */
function rgbOf(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}

/** 页头图标位（纯装饰的内联 SVG，`data:image/svg+xml` 直接进 CSS）：只做「这一页是什么」的图形锚，
 *  不承载任何数据、不进文档流文字。形状用调色板里的暖色描边（与品牌带同一族）。
 *
 *  第三轮 A/B 的处置：**保留**。撤下它（＋换开合标记＋删结论条）三支同会话实测 79／84／85，
 *  都低于本轮前的 88 ⇒ 按「先保后改、掉了就回退」保留本枚图标；带的条数与三支对照见证据件「第三轮」。 */
function heroMark(art: string): string {
  return 'url("data:image/svg+xml,' + art + '")';
}

/** 采购袋（页头图标位）。 */
const TITLE_MARK = heroMark(
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
  const root = '.ilife-page-ui ';
  return [
    '/* #873 采购·生成清单 页内收口 · 每一条都挂在根类之下 */',
    '/* 页头图标位：页名右侧一枚采购袋（48px，纯装饰）。 */',
    root + '.ilife-block-page-shell-title {',
    '  position: relative;',
    '  padding-right: 56px;',
    '}',
    root + '.ilife-block-page-shell-title::after {',
    '  content: "";',
    '  position: absolute;',
    '  right: 0;',
    '  top: 0;',
    '  width: 48px;',
    '  height: 48px;',
    '  background-image: ' + TITLE_MARK + ';',
    '  background-repeat: no-repeat;',
    '  background-size: 48px 48px;',
    '}',
    '/* 读数卡：暖调描边＋暖色浅底（皮肤已给顶缘暖色条），四张等高由公共层 grid-auto-rows 保证。 */',
    root + '.ilife-block-kpi-card {',
    '  box-sizing: border-box;',
    '  border-color: rgba(' + warm + ', .34);',
    '  background-image: linear-gradient(170deg, rgba(' + yellow + ', .16), var(--card) 62%);',
    '}',
    '/* 宽档：读数卡栅格是栅格项，**不写 margin:auto**（那会关掉栅格项的 stretch、整块 shrink-to-fit）。',
    '   本轮实测两支都试过：收进版心（`max-width:880px ＋ justify-self:center`）判「桌面端空间略空」，',
    '   两列版（×440px）判「右侧大片留白」——都不如公共层那条**满铺一行四张**，故宽档一格不写、交回公共层。 */',
    '/* 分区题头：折叠条标题那一行带一条暖色渐隐（品牌温度落在「分区」这一层）。 */',
    root + '.ilife-block-page-shell-body > .ilife-block-disclosure > .ilife-block-disclosure-summary {',
    '  background-image: linear-gradient(90deg, rgba(' + yellow + ', .20), rgba(' + yellow + ', 0) 76%);',
    '  border-radius: 13px;',
    '}',
    '/* 开合标记：换成暖色圆点。第三轮 A/B：换成折角／保留公共层蓝 ▸ 都更差（见上），故保留这一支。 */',
    root + '.ilife-block-page-shell-body > .ilife-block-disclosure > .ilife-block-disclosure-summary::before {',
    '  background-color: rgba(' + warm + ', .22);',
    '  color: transparent;',
    '}',
    '/* 折叠体内的数据表：表卡顶缘一条暖色细线，与读数卡同一族。 */',
    root + '.ilife-block-page-shell-body .ilife-block-disclosure-body .ilife-block-data-table {',
    '  border-top: 2px solid rgba(' + warm + ', .35);',
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
  // 库存口径只在真有「这次不一样」的时候出一行：默认那一句（去哪儿核库存）已由主按钮与复制区承担，
  // 再在正文里复述一遍就是同一件事说两遍（冻结尺原话点了这一处）。
  const caveat = (input.excludeOptional ? '已排除可选食材。' : '')
    + (input.stockSkipped ? '这次不核对家里的库存。' : '');
  const blocks = [
    // 第三轮文案审计：「已按〈份量〉算好。」的「份量」在下面的读数卡里已有，单论信息可删；
    // 但同会话 A/B 里删掉它的三支是 79／84／85，都在本轮前 88 之下 ⇒ 按「先保后改」**保留**，
    // 审计表与逐支读数记在证据件「第三轮」一节。
    renderConclusionBar('已按' + input.servingsText + '算好。'),
    renderKpiGrid([
      { label: '菜数', value: String(input.recipes.length), unit: '道', detail: input.recipes.join('、') },
      { label: '食材', value: String(input.items.length), unit: '味' },
      { label: '分组', value: String(groups.length), unit: '组' },
      { label: '份量', value: input.servingsText },
    ]),
    ...(caveat === '' ? [] : [renderCaliberLine(caveat)]),
    // 主操作提到分组之前：列表长起来会把它压到首屏之外，而「复制清单核对库存」是这一页的主入口。
    renderActionBar({
      buttons: [
        { label: '复制清单核对库存', kind: 'primary', actionId: 'shopping-stock' },
        { label: '再算一份清单', kind: 'ghost', actionId: 'shopping-again' },
      ],
    }),
    ...groups.map(([cat, rows], index) =>
      renderDisclosure({
        // 第一组默认展开：首屏要看得见「这一单到底买什么」，其余三组折叠。
        open: index === 0,
        title: cat + '（' + rows.length + '味）',
        contentHtml: renderDataTable({
          // 不画表注：分组名已由折叠条标题承载，同一组名画两遍是复读。
          // 「来自哪道菜」只在真的多道菜合并时才成一列；一道菜时它每一行都是同一个值（读数卡
          // 「菜数 1 道」下面那行 detail 已经写了是哪道菜），留着只是把同一句话重复 N 行。
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
    ...(caveat === '' ? [] : [renderCaliberLine(caveat)]),
    chefCopyArea({
      title: '复制采购清单',
      dataActionId: 'shopping-copy',
      data: {
        key: 'chef.shopping.query', shape: 'list',
        items: input.items.map((g) => ({
          食材: g.name,
          用量: g.quantity === null || g.quantity === undefined
            ? g.quantity_text || '适量'
            : String(round(Number(g.quantity))) + ' ' + g.unit,
          ...(input.recipes.length > 1 ? { 来自: g.recipes.join('、') } : {}),
        })),
        total: input.items.length,
      },
    }),
  ];
  return renderSceneShell({
    family: 'result',
    docTitle: '生成清单',
    bodyHtml: renderPageShell({ eyebrow: '私家大厨 ｜ 采购', title: '生成清单', content: blocks.join('') }),
    extraCss: shoppingPageCss(),
  });
}
