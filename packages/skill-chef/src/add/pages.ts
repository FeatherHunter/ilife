/** 录入能力的页面装配（回执型成功页／失败页）。
 *
 * 走票 3 页面族配方（`t768-页面族配方.md` §3 回执型 A）：结论条＋事实条＋变更行＋动作行＋复制区；
 * 失败态走老件 `.fail-card` 四段（操作名／失败原因／关键数据／建议下一步）＋ `renderErrorReceipt`。
 * 每一格都是一次公共层区块调用，页面不自写样式（`extraCss` 只拼公共层两份配方样式）。
 */

import { renderActionBar, renderErrorReceipt, renderFactStrip, pageShapeCss, pageUiCss } from 'base-paint';
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
  readonly channelNote: string;
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
    extraCss: pageUiCss() + '\n' + pageShapeCss(),
    pageUi: true,
  });
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
  const table = renderDataTable({
    caption: '备料',
    columns: [
      { key: 'name', label: '食材' },
      { key: 'qty', label: '用量', align: 'right' },
      { key: 'note', label: '说明' },
    ],
    rows: ingredients.map((g) => ({
      name: g.name,
      qty: g.quantity + ' ' + g.unit,
      note: g.quantity_text || g.category || '未写',
    })),
  });
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
    '场景标识：录入食谱 · 唤醒词' + input.wakeWord + ' · 场景' + input.cardId,
    '思考链：意图理解 → 字段收集 → 校验 → 写入',
    '数据结构：菜谱一行＋食材' + ingredients.length + '行＋步骤' + steps.length + '行',
    '调用链：录入采集 → 确认写入 → 写菜谱库',
    '时间戳：本次运行',
    '异常信息：无',
  ].join('\n');
  const content =
    renderConclusionBar('已录入这道菜。') +
    renderFactStrip({
      items: [
        { label: '菜名', value: input.recipeName },
        { label: '食材', value: ingredients.length + ' 味' },
        { label: '步骤', value: steps.length + ' 步' },
        { label: '来源', value: input.sourceLabel },
      ],
    }) +
    renderProseBlock({ text: input.channelNote }) +
    table +
    stepsBlock(steps) +
    renderChangeRows({
      rows: [
        { label: '菜谱', before: '无', after: '新增' + input.recipeName },
        { label: '食材', before: '0 味', after: ingredients.length + ' 味' },
        { label: '步骤', before: '0 步', after: steps.length + ' 步' },
      ],
    }) +
    renderCaliberLine('记录已写进菜谱库。') +
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
