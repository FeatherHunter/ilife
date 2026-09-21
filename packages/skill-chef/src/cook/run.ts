/** 做菜能力的命令处理（`chef.cooking.run`）＋ 本域独占的视图与页面装配。
 *
 * 老分派层（`src/cli/cmd_read.ts`）分支逐字节下沉：只改 import 出处，判定与装配一字不动。
 * `buildCookingRun`（原 `src/render/views.ts`）只被本域调用，按“写不出的留回域目录”搬入本文件；
 * 旧址改转出（搬迁债务，见 `src/render/index.ts`）。
 *
 * #772：取数缺口两条收在本域——`step_ingredients` 按步切分（每步只出本步用料，不再把全量
 * 11 味挂在每一步上）与 `cookware` 炊具行；查法直连 `fetch/db` 既有原语（只读不写共用位，
 * 共用位一行不动）。页面装配 `renderCookingPage` 照 `t768-页面族配方.md` §1 过程型十二格逐格调
 * 公共层区块（含 #860 正文段落件），零自写样式；暂停／声音／重做／计时器／份量步进器归宿主，
 * 页面只摆形状与 `data-action-id`。
 */

import type { ChefDb } from '../fetch/db.js';
import { getRecipeDetail, historyStats, qAll, queryHistory } from '../fetch/db.js';
import { ChefFetchError } from '../fetch/errors.js';
import type { CookingStep, RecipeHistoryStats, RecipeItem } from '../render/views.js';
import { toRecipeItem } from '../render/views.js';
import { needServings, resolveNameOrId } from '../shared/slots.js';
import {
  renderCaliberLine, renderChipRow, renderConclusionBar, renderCopyBlock,
  renderDataTable, renderDisclosure, renderKpiCard, renderPageShell, renderProseBlock,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { renderActionBar, renderFactStrip, renderTimelineRows } from 'base-paint';
import { chefSceneCss } from '../render/skin.js';

// 开做 list：items 为步骤（内联本步用料）+ total；recipe/份数放大说明/历史提示作扩展字段（list 形只校验 items/total）。
// 原 `src/render/views.ts`，本域独占。
export function buildCookingRun(args: {
  recipe: RecipeItem;
  steps: CookingStep[];
  servings?: number;
  history?: RecipeHistoryStats | null;
}): { items: CookingStep[]; total: number; recipe: RecipeItem; servingsNote: string; historyHint: string; steps: CookingStep[] } {
  const base = args.recipe.servings > 0 ? args.recipe.servings : 2;
  const servings = args.servings ?? base;
  const factor = Math.round((servings / base) * 100) / 100;
  // 结论条不复读事实条的份量格：默认只说无需换算，放大只说相对原谱的倍率（#768 设计 §8.1）。
  const servingsNote = servings === base
    ? '按原谱份量备料即可，无需换算'
    : '用量是原谱（' + base + ' 人份）的 ' + factor + ' 倍，照这份清单备料就行。';
  const h = args.history;
  // 人话收尾：命令键不上屏（#768 设计 §10），做完即记的衔接只说动作。
  const historyHint = h && h.count > 0
    ? '做过 ' + h.count + ' 次' + (h.avgRating !== null && h.avgRating !== undefined ? '，平均评分 ' + h.avgRating : '') + '，做完后记一次'
    : '还没做过，做完后记一次';
  return { items: args.steps, total: args.steps.length, recipe: args.recipe, servingsNote, historyHint, steps: args.steps };
}

/** 本步用料一行（`step_ingredients` 联 `ingredients`，用量按份数倍率放大）。 */
export interface StepUsage extends Record<string, unknown> {
  name: string;
  quantity: number | null;
  unit: string;
  quantity_text: string;
  optional: boolean;
}

/** 带本步用料的步骤（其余字段与 `CookingStep` 同形，可直接进信封）。 */
export interface CookStep extends Record<string, unknown> {
  sequence: number;
  action: string;
  duration_minutes: number | null;
  heat_level: string;
  temperature: string;
  expected_result: string;
  ingredients: StepUsage[];
}

/** 炊具一行（`cookware`）。 */
export interface CookwareItem {
  name: string;
  category: string;
}

interface StepLinkRow {
  seq: number;
  stepId: string;
  name: string;
  quantityText: string;
  isOptional: number;
  quantityUsed: number | null;
  stepUnit: string;
  ingUnit: string;
}

function scaleQty(q: number | null, factor: number): number | null {
  return q === null ? null : Math.round(q * factor * 100) / 100;
}

/** 按步切分用料：悬空关联（指到不存在的步骤或食材）即抛错点名，不静默吞行。 */
function stepUsages(handle: ChefDb, recipeId: string, seqs: number[], factor: number): Map<number, StepUsage[]> {
  const orphans = qAll<Record<string, unknown>>(handle,
    'SELECT si.id AS id, si.step_id AS stepId, si.ingredient_id AS ingId FROM step_ingredients si'
    + ' LEFT JOIN cooking_steps s ON s.id = si.step_id LEFT JOIN ingredients i ON i.id = si.ingredient_id'
    + ' WHERE (s.id IS NULL OR i.id IS NULL) AND si.step_id IN (SELECT id FROM cooking_steps WHERE recipe_id = ?)',
    [recipeId]);
  if (orphans.length > 0) {
    const o = orphans[0];
    throw new ChefFetchError('CHEF_RECIPE_CORRUPT',
      '某步的食材关联已坏（关联行 ' + String(o.id) + ' 指到不存在的步骤或食材：step_id=' + String(o.stepId) + ' ingredient_id=' + String(o.ingId) + '），须先清关联再出页');
  }
  const rows = qAll<Record<string, unknown>>(handle,
    'SELECT s.sequence AS seq, s.id AS stepId, i.name AS name, i.quantity_text AS quantityText,'
    + ' i.is_optional AS isOptional, si.quantity_used AS quantityUsed, si.unit AS stepUnit, i.unit AS ingUnit'
    + ' FROM step_ingredients si JOIN cooking_steps s ON s.id = si.step_id'
    + ' JOIN ingredients i ON i.id = si.ingredient_id WHERE s.recipe_id = ? ORDER BY s.sequence ASC, i.sequence ASC',
    [recipeId]);
  const out = new Map<number, StepUsage[]>();
  // 零关联菜谱（录入流未写过一行 step_ingredients）＝数据本就没有：逐歩显式缺，不抛；
  // 有关联但某步缺行＝数据断了：抛错点名到步，不许静默少显示一步。
  if (rows.length === 0) return out;
  for (const r of rows) {
    const row = r as unknown as StepLinkRow;
    const list = out.get(row.seq) ?? [];
    list.push({
      name: String(row.name ?? ''), quantity: scaleQty(row.quantityUsed ?? null, factor),
      unit: String(row.stepUnit || row.ingUnit || ''), quantity_text: String(row.quantityText ?? ''),
      optional: Number(row.isOptional ?? 0) === 1,
    });
    out.set(row.seq, list);
  }
  // 有步骤无关联＝取数断了：抛错点名到步，不许静默少显示一步。
  for (const seq of seqs) {
    if (!out.has(seq)) {
      throw new ChefFetchError('CHEF_RECIPE_CORRUPT', '第 ' + seq + ' 步没有关联食材（step_ingredients 缺行），须先补关联再出页');
    }
  }
  return out;
}

/** 炊具行（`cookware` 2 行，见配方 §4）。 */
function recipeCookware(handle: ChefDb, recipeId: string): CookwareItem[] {
  const rows = qAll<Record<string, unknown>>(handle,
    'SELECT name, category FROM cookware WHERE recipe_id = ? ORDER BY name ASC', [recipeId]);
  return rows.map((r) => ({ name: String(r.name ?? ''), category: String(r.category ?? '') }));
}

/** 页面取数全貌（命令数据＋页面要的备料／炊具／历史，一次取齐）。 */
export interface CookingPageData {
  recipe: RecipeItem;
  baseServings: number;
  servings: number;
  factor: number;
  ingredients: StepUsage[];
  steps: CookStep[];
  cookware: CookwareItem[];
  count: number;
  avgRating: number | null;
  lastHistory: { cook_date: string; rating: number | null; feedback: string } | null;
}

/** 取 `renderCookingPage` 要的整份数据（含校验：关联坏即抛错点名）。 */
export function getCookingPageData(handle: ChefDb, params: Record<string, unknown>): CookingPageData {
  const servings = needServings(params);
  const detail = getRecipeDetail(handle, resolveNameOrId(params));
  const base = detail.recipe.servings > 0 ? detail.recipe.servings : 2;
  const actual = servings ?? base;
  const factor = Math.round((actual / base) * 100) / 100;
  const ingredients: StepUsage[] = [...detail.ingredients]
    .sort((a, b) => a.sequence - b.sequence)
    .map((g) => ({
      name: g.name, quantity: scaleQty(g.quantity, factor), unit: g.unit,
      quantity_text: g.quantity_text, optional: g.is_optional === 1,
    }));
  const ordered = [...detail.steps].sort((a, b) => a.sequence - b.sequence);
  const usages = stepUsages(handle, detail.recipe.id, ordered.map((s) => s.sequence), factor);
  const steps: CookStep[] = ordered.map((s) => ({
    sequence: s.sequence, action: s.action, duration_minutes: s.duration_minutes,
    heat_level: s.heat_level, temperature: s.temperature, expected_result: s.expected_result,
    ingredients: usages.get(s.sequence) ?? [],
  }));
  const stat = historyStats(handle, detail.recipe.id);
  const histories = queryHistory(handle, detail.recipe.id);
  const last = histories.length > 0 ? histories[histories.length - 1] : undefined;
  return {
    recipe: toRecipeItem(detail.recipe), baseServings: base, servings: actual, factor,
    ingredients, steps, cookware: recipeCookware(handle, detail.recipe.id),
    count: stat.count, avgRating: stat.avgRating,
    lastHistory: last === undefined ? null : { cook_date: last.cook_date, rating: last.rating, feedback: last.feedback },
  };
}

/** 跑 `chef.cooking.run`：取单菜全貌＋份数放大＋历史提示（list 形）。 */
export function runCookingRun(handle: ChefDb, params: Record<string, unknown>): unknown {
  const d = getCookingPageData(handle, params);
  return buildCookingRun({ recipe: d.recipe, steps: d.steps, servings: d.servings, history: { count: d.count, avgRating: d.avgRating } });
}

/** 五张卡的取向（同一命令，不同参数＋不同强调块）。 */
export type CookCardKind = 'fresh' | 'with-history' | 'double' | 'resume' | 'waiting';

function qtyText(q: number | null, unit: string): string {
  if (q === null) return '适量';
  return (String(q) + ' ' + unit).trim();
}

function usageChip(u: StepUsage): string {
  return u.name + ' ' + qtyText(u.quantity, u.unit) + (u.optional ? '（可选）' : '');
}

function stepTitle(seq: number, done: boolean): string {
  return '第 ' + seq + ' 步' + (done ? '（已做）' : '');
}

/** 渲染过程型整页（配方 §1 十二格；全部步骤由六张折叠卡承载，不另起速览清单以避重复句）。 */
export function renderCookingPage(data: CookingPageData, opts: { kind: CookCardKind; currentStep?: number }): string {
  const total = data.steps.length;
  const cur = opts.currentStep ?? 1;
  if (!Number.isInteger(cur) || cur < 1 || cur > total) {
    throw new Error('当前步非法（须为 1–' + total + ' 的整数）：' + String(opts.currentStep));
  }
  const prefix = 't772-' + opts.kind;
  const facts = renderFactStrip({
    items: [
      { label: '份量', value: data.servings + ' 人份' },
      { label: '步骤', value: total + ' 步' },
      { label: '预计', value: data.recipe.total_time_minutes + ' 分钟' },
      { label: '状态', value: data.recipe.status },
    ],
  });
  const conclusion = renderConclusionBar(data.servings === data.baseServings
    ? '按原谱份量备料即可，无需换算'
    : '用量是原谱（' + data.baseServings + ' 人份）的 ' + data.factor + ' 倍，照这份清单备料就行。');
  const current = data.steps[cur - 1];
  const progress = renderKpiCard({
    label: '当前进度', value: String(cur), unit: '/ ' + total + ' 步',
    detail: current.heat_level + ' ' + (current.duration_minutes ?? '—') + ' 分钟',
    bar: { pct: Math.round((cur / total) * 100) },
  });
  const head: string[] = [facts, conclusion];
  // 含上次经验卡：把上一次的日期／评分／反馈摆出来（缺历史就显式缺）。
  if (opts.kind === 'with-history') {
    head.push(data.lastHistory === null
      ? renderCaliberLine('暂无历史记录，本次做完后记一次。')
      : renderDisclosure({
        title: '上次经验', open: true,
        contentHtml: renderTimelineRows({
          rows: [{
            time: data.lastHistory.cook_date,
            main: '上次做这道菜' + (data.lastHistory.rating === null ? '，未评分' : '，评分 ' + data.lastHistory.rating + ' 分'),
            note: data.lastHistory.feedback || '这次没写反馈',
          }],
        }),
      }));
  }
  head.push(progress);
  // 断点续做口径：会话记忆由 AI 侧承担，页面只承当前进度与下一步（缺字段不编）。
  if (opts.kind === 'resume') {
    head.push(renderCaliberLine('断点续接：会话记住做到第 ' + (cur - 1) + ' 步，页面只承当前进度与下一步，跨会话进度暂不保留。'));
  }
  const cards = data.steps.map((s) => renderDisclosure({
    title: stepTitle(s.sequence, s.sequence < cur), open: s.sequence === cur,
    contentHtml: renderProseBlock({ text: s.action })
      + renderFactStrip({
        items: [
          { label: '火候', value: s.heat_level || '未写' },
          { label: '时长', value: (s.duration_minutes ?? '—') + ' 分钟' },
          { label: '锅温', value: s.temperature || '未写' },
        ],
      })
      // 零关联菜谱的步：无料可内联就显式缺，不留空白让人猜。
      + (s.ingredients.length === 0
        ? renderCaliberLine('本步用料未登记。')
        : renderChipRow({ items: s.ingredients.map((u) => ({ text: usageChip(u) })) }))
      + renderCaliberLine('这一步做成：' + (s.expected_result || '未写')),
  }));
  const stepper = renderActionBar({
    buttons: [
      { label: '上一步', kind: 'ghost', actionId: prefix + '-prev' },
      { label: '下一步', kind: 'primary', actionId: prefix + '-next' },
    ],
  });
  const tail: string[] = [];
  // 等待并行卡：本谱无炖烤腌类典型等待步骤，口径如实写，按耗时最长的两步给并行建议。
  if (opts.kind === 'waiting') {
    const longest = [...data.steps].sort((a, b) => (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0)).slice(0, 2);
    tail.push(renderDisclosure({
      title: '等待时可并行', open: true,
      contentHtml: renderCaliberLine('本谱无炖烤腌类典型等待步骤，以下按耗时最长的两步给并行建议。')
        + renderTimelineRows({
          // 建议写“备下一步”，注里就摆下一步的料名（当前步的料已在步骤卡里，不复读）。
          rows: longest.map((s) => {
            const next = data.steps.find((x) => x.sequence === s.sequence + 1);
            return {
              time: '第 ' + s.sequence + ' 步',
              main: '约 ' + (s.duration_minutes ?? '—') + ' 分钟，可同步备下一步用料。',
              note: next === undefined ? '已是最后一步。' : next.ingredients.map((u) => u.name).join('、') || '下一步用料未登记',
            };
          }),
        }),
    }));
  }
  const prep = renderDisclosure({
    title: '备料清单（' + data.servings + ' 人份）',
    contentHtml: renderDataTable({
      columns: [
        { key: 'name', label: '食材' },
        { key: 'qty', label: '用量', align: 'right' },
        { key: 'note', label: '说明' },
      ],
      rows: data.ingredients.map((g) => ({ name: g.name, qty: qtyText(g.quantity, g.unit), note: g.quantity_text || '未写' })),
    }),
  });
  const ware = renderDisclosure({
    title: '炊具',
    contentHtml: data.cookware.length === 0
      ? renderCaliberLine('未登记炊具。')
      : renderChipRow({ items: data.cookware.map((c) => ({ text: c.category ? c.name + '（' + c.category + '）' : c.name })) }),
  });
  const done = renderActionBar({
    buttons: [
      { label: '做完了，记一次', kind: 'primary', actionId: prefix + '-record' },
      { label: '看这道菜的历史', kind: 'ghost', actionId: prefix + '-history' },
    ],
  });
  const copyText = ['备料清单（' + data.servings + ' 人份）']
    .concat(data.ingredients.map((g) => g.name + ' ' + qtyText(g.quantity, g.unit)))
    .concat(['进度：第 ' + cur + ' 步 / 共 ' + total + ' 步',
      '评分：做过 ' + data.count + ' 次' + (data.avgRating === null ? '' : '，平均 ' + data.avgRating + ' 分')]).join('\n');
  const copy = renderCopyBlock({ title: '复制备料清单与进度', dataActionId: prefix + '-copy', dataText: copyText });
  const body = renderPageShell({
    eyebrow: '私家大厨 ｜ 做菜', title: '做菜模式：' + data.recipe.name,
    content: head.join('') + cards.join('') + stepper + tail.join('') + prep + ware + done + copy,
  });
  return renderDocShell({
    // 文档标题与页内标题错开一处（后者缀技能名）：否则同一句在 `<title>` 与页标题各出现一次，
    // 质量门「重复句」列会红（`t768` 原型即用不同标题避开此列）。
    docTitle: '做菜模式：' + data.recipe.name + '（私家大厨）', bodyHtml: body,
    extraCss: chefSceneCss(), pageUi: true,
  });
}
