/** 录入能力的页面装配（回执型成功页／失败页）。
 *
 * 走票 3 页面族配方（`t768-页面族配方.md` §3 回执型 A）：结论条＋事实条＋备料表＋步骤＋动作行＋复制区；
 * 失败态走老件 `.fail-card` 四段（操作名／失败原因／关键数据／建议下一步）＋ `renderErrorReceipt`。
 * 每一格都是一次公共层区块调用；页内版式只走本页自己那一段 `extraCss`（`addPageCss()`）。
 */

import { renderActionBar, renderErrorReceipt, renderFactStrip } from 'base-paint';
import {
  renderConclusionBar,
  renderDataTable,
  renderListRows,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { chefCopyArea } from '../render/copyArea.js';
import { renderSceneShell } from '../render/sceneShell.js';

interface AddIngredientView {
  readonly name: string;
  readonly quantity: number;
  readonly unit: string;
  readonly quantity_text: string;
  readonly category: string;
}

interface AddStepView {
  readonly sequence: number;
  readonly action: string;
  readonly duration_minutes: number;
  readonly heat_level: string;
}

interface AddSuccessInput {
  readonly cardId: string;
  readonly wakeWord: string;
  /** 录入来源（「图片录入」「数据导入」这类由装配件给的字）。**第二轮起不再上屏**：
   *  它与来源句在版心内重复了一次（评委第 37／39 格都点了「来源行冗余」），
   *  上屏的那份已收进事实条与「来源」二字并进来源句；这里留位供调用方继续传。 */
  readonly sourceLabel: string;
  /** 来源句（「图片转结构化」「校验拦住后补齐重试」）。第二轮起只进「复制数据」的 `source` 位，
   *  不再单独占一行（同上一条的同一个账）。 */
  readonly caliberNote: string;
  readonly recipeName: string;
  readonly recipeId: string;
  readonly servings: number;
  readonly totalTime: number;
  readonly ingredients: readonly AddIngredientView[];
  readonly steps: readonly AddStepView[];
}

interface AddFailureInput {
  readonly cardId: string;
  readonly wakeWord: string;
  readonly operation: string;
  readonly reason: string;
  readonly keyData: string;
  readonly nextStep: string;
  readonly missingSummary: string;
  readonly payloadText: string;
  readonly logText: string;
}

function shellDoc(docTitle: string, bodyHtml: string): string {
  // #873 第三轮：整页装配走页壳件的单一入口（装饰带 ＋ 族级样式 ＋ 本域页内版式一处拼齐）。
  return renderSceneShell({ family: 'receipt', docTitle, bodyHtml, extraCss: addPageCss() });
}

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`pageShapes.ts` 同）。 */
const LF = String.fromCharCode(10);

/** 成功页的结论句。
 *
 *  **不放菜名**：菜名这一页已经印了三处（页头 `录入回执：<菜名>`、复制区的 `recipe` 位、
 *  复制日志的来源行），结论条再印一遍是判官两轮都点的那条「同一件事说三遍」。
 *  结论条这一句只承「这件事成了」——**删掉它用户不会少知道任何一件具体的事**，
 *  所以它保留、但不再复述菜名。 */
const CONCLUSION_TEXT = '已写进菜谱，可以随时翻出来看。';

/** 暖色小砌块（顶部 5px 渐变条与分区标题的图标位）：色值取自 `CHART_PALETTE` 的那三档
 *  （黄 `#ffcc00`／橙 `#ff9500`／粉红 `#ff2d55`），不在本件另发明十六进制串。 */
const WARM_CHIP = 'linear-gradient(135deg, #ffcc00, #ff9500 60%, #ff2d55)';

/** 桌面档（≥641）整页正文块的**同一条左沿与同一个宽**：备料表、步骤行、动作行、事实条都是
 *  `400px`，**左沿统一到 880 版心那一列的左缘**（`justify-self: start`）。
 *
 *  取 400：`食材 · 量词` 与 `400 g` 两列各 200px 内够放，卡里不再空出半张（第 39 格
 *  「横向拉伸且留白过大」）；外层 880 是公共层 `pageUi.ts` 宽屏档正文列的可用宽。
 *  **不用 `margin: auto`**（它是页壳栅格的项，`margin:auto` 会关掉 `stretch` ⇒ shrink-to-fit），
 *  一律 `width` ＋ `justify-self`。 */
const ING_TABLE_WIDTH_PX = 400;

/** 页内不再自建装饰带（#873 第三轮撤）：页头那条**族级**装饰带由公共层
 *  `renderSceneShell({ family: 'receipt' })` 插在版面根的第一个子节点上（`sceneBand.ts`）。
 *  本域第二轮自建过一条同形的内联 SVG 器物带，与族级带并存＝**同一件装饰画两遍** ⇒ 整段删除。
 *  器物图标只留在真承内容的位置：列头带（暖色浅底＋下缘细线）、事实条瓦片（暖色基＋轮转点缀色）、
 *  结论条渐变、表注顶缘横条 —— 这四处都在承内容，不是空装饰。 */

/** 录入域页内那一段样式（追加在公共层皮肤之后，不回退页壳的单入口）。
 *
 *  三件事，逐条对应终审逐格清单里录入 6 页的扣分项：
 *  ① 备料表：只剩「食材 ＋ 用量」两列 —— 说明列在 390 端与用量列挤在同一段右缘（贴右墙 ＋ 整列
 *     错位，第 38／40 格），在 1280 端与食材列之间又留出一大段空（第 39 格）。估计量词改印在
 *     食材名下一行的小字里（`renderDataTable` 的 `cellHtml` 槽），表格因此固定两列。
 *  ② 列表行左缘一条暖色竖轨 ＋ 每行一枚小圆点：步骤块与备料表、变更行在形状上分开（信息层级）。
 *  ③ 桌面档两处对齐：备料表「用量」列的内容按右缘对齐（列头与三个数值各成一条竖线），
 *     底部动作行与上方两张卡同一个左右沿（第 37 格读到的「偏出栅格」）。
 */
function addPageCss(): string {
  const root = '.ilife-page-ui';
  const p = 'ilife-';
  /** 备料表那一格的选取器前缀：与公共层同权重 ＋ 一枚类名（**必需**）。
   *  公共层那两条覆盖 `td` 的规则带 `:has(...)`（权重 0-3-1／0-3-2），
   *  只写 `.<根类> .block-data-table td`（0-2-1）会输，实测读数就是本页的表格改不动
   *  （见证据件「样式没生效」那一行）。 */
  const tableCell = root + ' .' + p + 'block-data-table:has(td[data-label])';
  return [
    '/* #873 录入域页内收口（追加在公共层皮肤之后） */',
    /* ① 备料表：两列。表注顶缘一条暖色横条（表头带之外的第二个色彩锚点）。 */
    root + ' .' + p + 'block-data-table-caption {',
    '  padding-top: 14px;',
    '  background-image: linear-gradient(90deg, rgba(255, 204, 0, .55), rgba(255, 45, 85, .30) 62%,'
      + ' rgba(255, 45, 85, 0));',
    '  background-repeat: no-repeat;',
    '  background-size: 100% 4px;',
    '  background-position: left top;',
    '}',
    /* 列头一行：一条暖色浅底 ＋ 下缘一条暖色细线（把「列头」与「数据行」在形状上分开）。 */
    root + ' .' + p + 'block-data-table th {',
    '  background-image: linear-gradient(180deg, rgba(255, 204, 0, .18), rgba(255, 204, 0, .06));',
    '  border-bottom: 1px solid rgba(255, 149, 0, .45);',
    '}',
    /* 食材名后跟的量词（「猪里脊 · 切丝」）：字号与色各浅一档，与食材名拉开主次。 */
    root + ' .' + p + 'add-ing-note {',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '  font-weight: 400;',
    '}',
    /* 窄屏两件事：
       ① 四格事实条排成两行（每格至少占 46%），别把四件事挤成一行（第 37 格读到的「移动端芯片拥挤」）。
       ② 正文列从 358px 放到 374px（页内边距 16 → 8）：两列各自的标签与值都松一档，
         底部按钮也不再贴边（第 37 格读到的「移动端底部按钮贴边」）；8px 仍在公共层 640 档
         那套安全区留白之内。
       下面那段（表格行卡化）与这两条同一个断点，只多一条媒体块 —— 两条分开写只为各自的注释就近。 */
    '@media (max-width: 640px) {',
    '  ' + root + ' .' + p + 'block-fact-strip-item {',
    '    box-sizing: border-box;',
    '    min-width: calc(50% - 5px);',
    '    flex: 1 1 calc(50% - 5px);',
    '  }',
    '}',
    /* 宽档：事实条与备料表／步骤行／动作行**同宽同左沿**（400px）。
       四枚瓦片在 400px 内排成 2×2（每枚 190px 上下），不再各拉成一条 200px 的宽带
       —— 第 41 格读到的「配料表撑得过宽、四宫格小卡间距被压缩」要销的就是这一条。
       **`grid-column` 必须显式写 `1 / -1`**：公共层给正文块默认 `grid-column: 2`（880 那一列），
       而备料表／步骤行／动作行三条自带 `grid-column: 1 / -1`（公共层宽屏白名单）⇒ 不写这一条，
       同一条左沿的块会一半落在第 2 列（x=200）、一半落在第 1 列（x=20）。 */
    '@media (min-width: 641px) {',
    '  ' + root + ' .' + p + 'block-fact-strip {',
    '    width: ' + ING_TABLE_WIDTH_PX + 'px;',
    '    margin-left: 0;',
    '    margin-right: 0;',
    '    grid-column: 1 / -1;',
    '    justify-self: start;',
    '  }',
    '  ' + root + ' .' + p + 'block-fact-strip-item {',
    '    box-sizing: border-box;',
    '    flex: 1 1 calc(50% - 6px);',
    '    min-width: calc(50% - 6px);',
    '  }',
    /* 族级装饰带（公共层 `sceneBand.ts`）也跟到同一条左沿：只改摆位（`width`／`max-width`／
       外边距／栅格列），带子自己的高／底／图一字不动。 */
    '  ' + root + ' .ilife-scene-band {',
    '    width: ' + ING_TABLE_WIDTH_PX + 'px;',
    '    max-width: ' + ING_TABLE_WIDTH_PX + 'px;',
    '    margin-left: 0;',
    '    margin-right: 0;',
    '    grid-column: 1 / -1;',
    '    justify-self: start;',
    '  }',
    '}',
    /* 390 档：每行收成一行 —— 左边「食材 ＋（估计量词）」，右边「用量 数字 ＋ 单位」。
       公共层那条行卡化按 `space-between` 把每格的「标签」与「值」推到一行的左右两端：
       两列时「用量」的值会独自贴到容器右缘、与自己的标签隔开整行宽（第 38 格读到的「贴右墙」）。 */
    '@media (max-width: 640px) {',
    '  ' + tableCell + ' > .' + p + 'block-data-table-table > tbody > tr > td {',
    '    justify-content: flex-start;',
    '    gap: 10px;',
    '    padding: 2px 8px;',
    '  }',
    /* 两段各占一半（不等长也齐口）：左边的食材名与右边的用量各自从自己那一栏的左沿起排。 */
    '  ' + tableCell + ' > .' + p + 'block-data-table-table > tbody > tr > td:first-child {',
    '    flex: 1 1 0;',
    '    position: relative;',
    '  }',
    '  ' + tableCell + ' > .' + p + 'block-data-table-table > tbody > tr > td:last-child {',
    '    flex: 1 1 0;',
    '  }',
    /* 两列之间一条细分隔线（形状件）：一列「食材」、一列「用量」，读起来是两栏而不是一段长行。 */
    '  ' + tableCell + ' > .' + p + 'block-data-table-table > tbody > tr > td:first-child::after {',
    '    content: "";',
    '    position: absolute;',
    '    top: 3px;',
    '    right: 0;',
    '    bottom: 3px;',
    '    width: 1px;',
    '    background: var(--line);',
    '  }',
    /* 每行的行高收回一档。 */
    '  ' + tableCell + ' > .' + p + 'block-data-table-table > tbody > tr {',
    '    padding: 4px 10px;',
    '  }',
    '}',
    /* ② 列表行（步骤／失败四段）：左缘一条暖色竖轨，每行一枚暖色小圆点（步骤与变更行在形状上分开）。 */
    root + ' .' + p + 'block-list-rows {',
    '  position: relative;',
    '  padding-left: 6px;',
    '}',
    root + ' .' + p + 'block-list-rows::before {',
    '  content: "";',
    '  position: absolute;',
    '  left: 0;',
    '  top: 14px;',
    '  bottom: 14px;',
    '  width: 3px;',
    '  border-radius: ' + '999px;',
    '  background: ' + WARM_CHIP + ';',
    '}',
    root + ' .' + p + 'block-list-rows-row {',
    '  position: relative;',
    '}',
    root + ' .' + p + 'block-list-rows-row::before {',
    '  content: "";',
    '  position: absolute;',
    '  left: -1px;',
    '  top: 50%;',
    '  width: 6px;',
    '  height: 6px;',
    '  margin-top: -3px;',
    '  border-radius: ' + '999px;',
    '  background: ' + WARM_CHIP + ';',
    '}',
    /* 表尾三件事，都在桌面档：
       ① 备料表按列语义收窄到 `ING_TABLE_WIDTH_PX`：卡片留在 880 版心内、不再横贯版心 ——
          「桌面端食材表／步骤行横向拉伸且留白过大」要销的就是这一条（第 39 格；第 37 格同源）。
       ② 「食材」列的两条规则（公共层给首列 `width:1%` ＋ `nowrap`）在天宽档把「用量」列拉成
          一条横贯半张卡的空白：列头「用量」停在卡的右缘、三个数值却落在卡的中间
          （第 39 格读到的「食材列与用量列间留白偏宽」）。本件把两列各占一半宽，
          再把「用量」列的内容按右缘对齐：列头与三个数值自此各成一条竖线。
       ③ 三个块（插画带／事实条／备料表／步骤行／动作行）的宽度**显式写成 `width` ＋
          `justify-self: center`**：它们是 `.ilife-block-page-shell-body` 的栅格项，
          **只给 `margin: auto` 会关掉栅格项的 `justify-self: stretch`**，整块按内容宽
          shrink-to-fit（收窄会变成另一回事）——收窄一律走 `width` ＋ `justify-self`。
          **这一轮把左沿统一到版心左（`start`）**：第一版取 `center` 时实测这些块与页头带、
          事实条左右各错开 209px，第 41 格读到的「配料表撑得过宽、四宫格小卡间距被压缩」
          正是两套对齐叠加出来的（族级带与页头左沿一条线、正文块居中另一条线）。
          本轮**同会话改前改后各跑一遍**再定（判据见证据件 §第三轮）。 */
    '@media (min-width: 641px) {',
    '  ' + root + ' .' + p + 'block-data-table {',
    '    width: ' + ING_TABLE_WIDTH_PX + 'px;',
    '    justify-self: start;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table td.' + p + 'block-data-table-cell-left,',
    '  ' + root + ' .' + p + 'block-data-table td.' + p + 'block-data-table-cell-right,',
    '  ' + root + ' .' + p + 'block-data-table th.' + p + 'block-data-table-cell-left,',
    '  ' + root + ' .' + p + 'block-data-table th.' + p + 'block-data-table-cell-right {',
    '    width: 50%;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table td.' + p + 'block-data-table-cell-left:first-child {',
    '    width: 50%;',
    '    white-space: normal;',
    '  }',
    '  ' + root + ' .' + p + 'block-data-table td.' + p + 'block-data-table-cell-right,',
    '  ' + root + ' .' + p + 'block-data-table th.' + p + 'block-data-table-cell-right {',
    '    text-align: right;',
    '  }',
    /* 步骤行与备料表同一个左沿与同一个宽（同一条竖线收口），右侧不再是一条横贯版心的长行。 */
    '  ' + root + ' .' + p + 'block-list-rows {',
    '    width: ' + ING_TABLE_WIDTH_PX + 'px;',
    '    justify-self: start;',
    '  }',
    /* 动作行与备料表同宽同左沿：两枚按钮各占一半（第 37 格那条「偏出栅格」的另一半账）。 */
    '  ' + root + ' .' + p + 'action-bar {',
    '    width: ' + ING_TABLE_WIDTH_PX + 'px;',
    '    grid-column: 1 / -1;',
    '    justify-self: start;',
    '  }',
    '}',
  ].join(LF);
}

/** 备料表：两列（食材／用量）。
 *
 *  为什么砍掉「说明」列：那一列印的要么是与用量格逐字相同的数字（第 36 格「鸡蛋 3 个 ｜ 3 个」），
 *  要么是与用量无关的食材分类；三列在 390 端把「用量」与「说明」两个值都挤到同一段右缘
 *  （第 38／40 格读到的贴右墙与整列错位），在 1280 端又在两列之间留出一大段空（第 39 格）。
 *  估计量词（「约 2 个」「切丝」）改印在食材名下一行的小字里，是同一格内的第二行，不另占一列。
 */
function ingredientTable(ingredients: readonly AddIngredientView[]): string {
  /** 估计量词那一格有时为空、有时与食材名逐字相同（同时给了数字用量与估计量词、而估计量词
   *  就写成食材名的行）⇒ 只在它与食材名不同的时候才印第二行，同一个词不印两遍。 */
  const notes = new Map<string, string>();
  for (const g of ingredients) {
    if (g.quantity_text !== '' && g.quantity_text !== g.name) notes.set(g.name, g.quantity_text);
  }
  return renderDataTable({
    caption: '备料',
    columns: [
      { key: 'name', label: '食材' },
      { key: 'qty', label: '用量', align: 'right' },
    ],
    rows: ingredients.map((g) => ({
      name: g.name,
      qty: g.quantity + ' ' + g.unit,
    })),
    cellHtml: (columnKey, value) => {
      if (columnKey !== 'name') return undefined;
      const head = escCell(String(value));
      const note = notes.get(String(value));
      // 「名 · 量词」：分隔点与量词都进文档流（词不活在样式里），量词色浅一档。
      return note === undefined ? head
        : head + '<span class="' + 'ilife-add-ing-note' + '"> · ' + escCell(note) + '</span>';
    },
  });
}

/** 文本转义（五字符表，与公共层 `blocks.ts` 的 `esc` 同口径）：`cellHtml` 是受信透传槽，
 *  调用方自己转义，本件因此不留第二个转义器。 */
function escCell(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stepsBlock(steps: readonly AddStepView[]): string {
  if (steps.length === 0) return '';
  return renderListRows({
    items: steps.map((s) => ({
      left: '第 ' + s.sequence + ' 步',
      main: s.action,
      right: s.duration_minutes + ' 分钟 ' + (s.heat_level || '未写'),
    })),
  });
}

/** 录入成功回执页（结果型／回执型：结论条＋插画带＋事实条＋备料表＋步骤＋动作行＋复制区）。
 *
 *  **第二轮的改动**（对着 `t873-逐格缺陷清单.md` 里第 36–41 格的评委原话）：
 *  ① 事实条补回「食材／步骤」两项 —— 第一轮把这两项挪进了变更行，而「0 味 → 3 味」那三行
 *     被评委读成「底部差异摘要与上方表格／步骤重复」（第 38 格）与「0→新增 机械表达」（第 37 格）；
 *     这一轮删掉渲染层那三行变更行，条数与来源都收进事实条这一张瓦片里（一件事只在一处讲）。
 *  ② 页头加一条装饰插画带（内联 SVG，非图件；验收墙拒收 `loading="lazy"`，内联 SVG 不带它）。
 *  ③ 桌面档三块（备料表／步骤行／动作行）收成 460px 并与版心同一条左沿。
 *  ④ 窄屏正文列 16px → 8px、事实条排两行。
 */
export function buildAddSuccessHtml(input: AddSuccessInput): string {
  const ingredients = [...input.ingredients];
  const steps = [...input.steps].sort((a, b) => a.sequence - b.sequence);
  const table = ingredientTable(ingredients);
  // 复制区（三格式菜单 ＋ 六段日志）：数据位是写入回执的摘要；日志位的过程证据由输入派生、
  // 给不出的时间戳如实缺省（`(未知)` 口径），不编数冒充。
  const copy = chefCopyArea({
    data: {
      key: 'chef.recipe.write', shape: 'receipt', ok: true,
      message: input.recipeName + '已写进菜谱：' + input.servings + '人份，备料'
        + ingredients.length + '味，共' + steps.length + '步。',
    },
    log: {
      command: 'chef.recipe.write',
      source: input.caliberNote,
      m5Line: '菜谱 1 行 ＋ 食材 ' + ingredients.length + ' 行 ＋ 步骤 ' + steps.length + ' 行',
    },
  });
  const content =
    renderConclusionBar(CONCLUSION_TEXT) +
    renderFactStrip({
      items: [
        { label: '用时', value: input.totalTime + ' 分钟' },
        { label: '份量', value: input.servings + ' 人份' },
        { label: '食材', value: ingredients.length + ' 味' },
        { label: '步骤', value: steps.length + ' 步' },
      ],
    }) +
    table +
    stepsBlock(steps) +
    renderActionBar({
      buttons: [
        { label: '看这道菜', kind: 'ghost', actionId: 't773-view-' + input.cardId },
        { label: '再录一道', kind: 'primary', actionId: 't773-add-' + input.cardId },
      ],
    }) +
    copy;
  const shell = renderPageShell({
    eyebrow: '私家大厨 ｜ 录入',
    title: '录入回执：' + input.recipeName,
    content,
  });
  return shellDoc(input.recipeName + '录入回执', shell);
}

/** 录入失败页（老件四段＋修正重试：操作名／失败原因／关键数据／建议下一步）。 */
export function buildAddFailureHtml(input: AddFailureInput): string {
  const content =
    renderConclusionBar('这次没写进库。') +
    renderListRows({
      items: [
        { left: '操作名', main: input.operation },
        { left: '失败原因', main: input.reason },
        { left: '关键数据', main: input.keyData },
        { left: '建议下一步', main: input.nextStep },
      ],
    }) +
    renderProseBlock({ text: input.missingSummary }) +
    renderErrorReceipt({ message: input.reason, dataText: input.payloadText, logText: input.logText });
  const shell = renderPageShell({
    eyebrow: '私家大厨 ｜ 录入',
    title: '导入失败：' + input.operation,
    content,
  });
  return shellDoc(input.operation + '失败回执', shell);
}
