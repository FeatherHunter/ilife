/** 录入能力的页面装配（回执型成功页／失败页）。
 *
 * 走票 3 页面族配方（`t768-页面族配方.md` §3 回执型 A）：结论条＋事实条＋变更行＋动作行＋复制区；
 * 失败态走老件 `.fail-card` 四段（操作名／失败原因／关键数据／建议下一步）＋ `renderErrorReceipt`。
 * 每一格都是一次公共层区块调用；页内版式只走本页自己那一段 `extraCss`（`addSuccessCss()`）。
 */

import { renderActionBar, renderErrorReceipt, renderFactStrip } from 'base-paint';
import { chefSceneCss } from '../render/skin.js';
import {
  renderCaliberLine,
  renderChangeRows,
  renderConclusionBar,
  renderCopyBlock,
  renderDataTable,
  renderListRows,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';

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
  readonly sourceLabel: string;
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
  return renderDocShell({
    docTitle,
    bodyHtml,
    extraCss: chefSceneCss() + '\n' + addPageCss(),
    pageUi: true,
  });
}

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`pageShapes.ts` 同）。 */
const LF = String.fromCharCode(10);

/** 暖色小砌块（顶部 5px 渐变条与分区标题的图标位）：色值取自 `CHART_PALETTE` 的那三档
 *  （黄 `#ffcc00`／橙 `#ff9500`／粉红 `#ff2d55`），不在本件另发明十六进制串。 */
const WARM_CHIP = 'linear-gradient(135deg, #ffcc00, #ff9500 60%, #ff2d55)';

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
    /* 食材名后跟的量词（「猪里脊 · 切丝」）：字号与色各浅一档，与食材名拉开主次。 */
    root + ' .' + p + 'add-ing-note {',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '  font-weight: 400;',
    '}',
    /* 390 档：每行收成一行 —— 左边「食材 ＋（估计量词）」，右边「用量 数字 ＋ 单位」，
       中间留一段空白把两段分开。公共层那条行卡化按 `space-between` 把每格的「标签」与「值」
       推到一行的左右两端：两列时「用量」的值会独自贴到容器右缘、与自己的标签隔开整行宽
       （第 38 格读到的「贴右墙」）；本段改成「两段各自成块、贴在两端」。 */
    '@media (max-width: 640px) {',
    '  ' + tableCell + ' > .' + p + 'block-data-table-table > tbody > tr > td {',
    '    justify-content: space-between;',
    '    gap: 12px;',
    '    padding: 2px 10px;',
    '  }',
    /* 两段各自占住一半宽：左边的食材名与右边的用量各自靠自己的那一侧。 */
    '  ' + tableCell + ' > .' + p + 'block-data-table-table > tbody > tr > td:first-child {',
    '    flex: 1 1 auto;',
    '    position: relative;',
    '  }',
    '  ' + tableCell + ' > .' + p + 'block-data-table-table > tbody > tr > td:last-child {',
    '    flex: 0 0 auto;',
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
    '    padding: 4px 12px;',
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
    /* 表尾两件事，都在桌面档：
       ① 「食材」列的两条规则（公共层给首列 `width:1%` ＋ `nowrap`）在天宽档把「用量」列拉成
          一条横贯半张卡的空白 —— 列头「用量」停在卡的右缘、三个数值却落在卡的中间
          （第 39 格读到的「食材列与用量列间留白偏宽」）。本件把两列各占一半宽，
          再把「用量」列的内容按右缘对齐：列头与三个数值自此各成一条竖线。
       ② 底部动作行与上方两张卡同一个左右沿：那两张卡的左沿在正文列里各内收 26px
          （1px 边框 ＋ 25px 留白），改前动作行铺满整列、左右各宽出 26px
          （第 37 格读到的「偏出栅格、未与键值列对齐」）。 */
    '@media (min-width: 641px) {',
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
    '  ' + root + ' .' + p + 'action-bar {',
    '    margin-left: 26px;',
    '    margin-right: 26px;',
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

/** 录入成功回执页（结果型／回执型：结论条＋事实条＋备料表＋步骤＋变更行＋口径行＋动作行＋复制区）。 */
export function buildAddSuccessHtml(input: AddSuccessInput): string {
  const ingredients = [...input.ingredients];
  const steps = [...input.steps].sort((a, b) => a.sequence - b.sequence);
  const table = ingredientTable(ingredients);
  const copyData = JSON.stringify(
    {
      scene_id: input.cardId,
      wake_word: input.wakeWord,
      recipe: input.recipeName,
      recipe_id: input.recipeId,
      servings: input.servings,
      ingredients: ingredients.map((g) => ({ name: g.name, quantity: g.quantity, unit: g.unit })),
      steps: steps.map((s) => ({ sequence: s.sequence, action: s.action })),
    },
    null,
    2,
  );
  const copyLog = [
    '唤醒词：' + input.wakeWord + ' · 场景 ' + input.cardId,
    '写入：菜谱 1 行 ＋ 食材 ' + ingredients.length + ' 行 ＋ 步骤 ' + steps.length + ' 行',
    '写入时间：本次运行',
    '异常信息：无',
  ].join('\n');
  const content =
    renderConclusionBar('已录入「' + input.recipeName + '」。') +
    renderFactStrip({
      items: [
        { label: '用时', value: input.totalTime + ' 分钟' },
        { label: '份量', value: input.servings + ' 人份' },
      ],
    }) +
    table +
    stepsBlock(steps) +
    renderChangeRows({
      rows: [
        { label: '菜谱', before: '无', after: '新增' + input.recipeName },
        { label: '食材', before: '0 味', after: ingredients.length + ' 味' },
        { label: '步骤', before: '0 步', after: steps.length + ' 步' },
      ],
    }) +
    renderCaliberLine('来源：' + input.caliberNote) +
    renderActionBar({
      buttons: [
        { label: '看这道菜', kind: 'ghost', actionId: 't773-view-' + input.cardId },
        { label: '再录一道', kind: 'primary', actionId: 't773-add-' + input.cardId },
      ],
    }) +
    renderCopyBlock({ title: '复制区', dataText: copyData, logText: copyLog });
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
