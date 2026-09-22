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
  renderCaliberLine, renderChipRow, renderConclusionBar,
  renderDataTable, renderDisclosure, renderKpiCard, renderPageShell, renderProseBlock,
} from 'base-paint/blocks';
import { chefCopyArea } from '../render/copyArea.js';
import { renderSceneShell } from '../render/sceneShell.js';
import { renderActionBar, renderFactStrip, renderTimelineRows } from 'base-paint';
import { chefSceneCss } from '../render/skin.js';
import { COOK_STEP_CLASS, COOK_STEPS_CLASS, COOK_STEP_SIDE_CLASS, cookPageCss } from './page-css.js';
import { cookCountNote, qtyText, servingsNoteReceipt, stepProseHtml, stepTitle, usageChip } from './page-text.js';

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面换行转义）。 */
const LF = String.fromCharCode(10);

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
  // 回执那一面的份量说明（`page-text.ts` 是它的唯一定义地）；页面结论条走另一句，见那里的注。
  const note = servingsNoteReceipt(servings, base, factor);
  const h = args.history;
  // 人话收尾：命令键不上屏（#768 设计 §10），做完即记的衔接只说动作。
  const historyHint = h && h.count > 0
    ? '做过 ' + h.count + ' 次' + (h.avgRating !== null && h.avgRating !== undefined ? '，平均评分 ' + h.avgRating : '') + '，做完后记一次'
    : '还没做过，做完后记一次';
  return { items: args.steps, total: args.steps.length, recipe: args.recipe, servingsNote: note, historyHint, steps: args.steps };
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
  // 结论条：只说「这道菜做过几次」（见 `cookCountNote` 的注：份量/用料/步骤别处都有，复述不加信息）。
  const conclusion = renderConclusionBar(cookCountNote(data.count));
  const progress = renderKpiCard({
    label: '当前进度', value: String(cur), unit: '/ ' + total + ' 步',
    // 第二轮返修：删掉原来的说明行「本步 中火 5 分钟」——它与下一张步骤卡里的「火候／时长」两格
    // 说的是同一件事，同尺复评把首屏那句读成「四处都在重复」。火候与时长现在只在步骤卡里出现一次。
    bar: { pct: Math.round((cur / total) * 100) },
  });
  // 第三轮返修：页头**只留族级装饰带**（`sceneShell` 插在版面根首节点的那条 process 带）。
  // 本域第二轮自己加的两件——「锅＋热气」图形牌与横贯波线带——是纯装饰且与族级带同题材，
  // 按公共层第三轮的契约撤掉（对照读数见证据件 §7.4）。
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
            // 卡片标题已经是「上次经验」、时间槽已经是那次日期：这行只说评分，不再复述「上次做这道菜」。
            main: data.lastHistory.rating === null ? '未评分' : '评分 ' + data.lastHistory.rating + ' 分',
            note: data.lastHistory.feedback || '这次没写反馈',
          }],
        }),
      }));
  }
  head.push(progress);
  // 断点续做口径：会话记忆由 AI 侧承担（缺字段不编）。第三轮返修：只留「换新会话会怎样」这条
  // 读者真会少知道的事——「上次做到第 3 步、这次从第 4 步接着做」在进度卡（4 / 6 步）与展开的
  // 第 4 步卡上都已经写着，删掉它用户一点不少知道。
  if (opts.kind === 'resume') {
    head.push(renderCaliberLine('断点续接：换新会话后进度不保留。'));
  }
  // 每张步骤卡外面包一层状态类：当前步／已做步／还没做各有自己的形状（`page-css.ts` 里那三条）。
  const cards = data.steps.map((s) => {
    const state = s.sequence < cur ? 'done' : (s.sequence === cur ? 'current' : 'todo');
    // 两个类都挂：`.ilife-cook-step` 是卡本体（第一轮只挂了状态类，样式段里那些按卡本体写的
    // 规则因此一条都没命中——第二轮返修连同这个缺陷一起修），`-done／-current／-todo` 是状态。
    return '<div class="' + COOK_STEP_CLASS + ' ' + COOK_STEP_CLASS + '-' + state + '">' + renderDisclosure({
      title: stepTitle(s.sequence, state), open: s.sequence === cur,
      // 正文走 `stepProseHtml`：库里的动作原文一字不动，只在**已有的标点之后**换行。
      // 参数与用料收进一张侧栏（`ilife-cook-step-side`）：宽档它与正文并排（2:1），窄档落在正文下面。
      contentHtml: renderProseBlock({ html: stepProseHtml(s.action) })
        + '<div class="' + COOK_STEP_SIDE_CLASS + '">'
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
          : renderChipRow({
            items: s.ingredients.map((u) => ({ text: usageChip(u.name, u.quantity, u.unit, u.optional) })),
          }))
        + '</div>',
      // 第二轮返修：删掉渲染层自己拼的那句「这一步做成：…」——它举的成品迹象与库里正文的收尾
      // （「煸至半焦(不是半熟,出油微焦)」）在首屏上复述同义，同尺复评两页都点到这一处。
      // 库里 `expected_result` 字段一字未改，只是这一步不再上屏（派单第二轮第 3 条具名授权）。
    }) + '</div>';
  });
  const stepsHtml = '<div class="' + COOK_STEPS_CLASS + '">' + cards.join('') + '</div>';
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
      // 第三轮返修：删掉「以下按耗时最长的两步给并行建议」——那是把实现讲给读者听；下面两行
  // 已经写着第几步、约几分钟、下一步备什么料。留下的半句是读者真会少知道的（本谱为何没有等待位）。
  contentHtml: renderCaliberLine('本谱没有炖烤腌这类等待步骤。')
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
  // 复制区（三格式菜单）：行文与改前逐行同义（备料行／进度行／评分行），`list` 形逐行透传。
  const copy = chefCopyArea({
    dataActionId: prefix + '-copy',
    data: {
      key: 'chef.cooking.run', shape: 'list',
      items: ['备料清单（' + data.servings + ' 人份）']
        .concat(data.ingredients.map((g) => g.name + ' ' + qtyText(g.quantity, g.unit)))
        .concat(['进度：第 ' + cur + ' 步 / 共 ' + total + ' 步',
          '评分：做过 ' + data.count + ' 次' + (data.avgRating === null ? '' : '，平均 ' + data.avgRating + ' 分')]),
    },
  });
  const body = renderPageShell({
    eyebrow: '私家大厨 ｜ 做菜', title: '做菜模式：' + data.recipe.name,
    content: head.join('') + stepsHtml + stepper + tail.join('') + prep + ware + done + copy,
  });
  return renderSceneShell({
    family: 'process',
    // 文档标题与页内标题错开一处（后者缀技能名）：否则同一句在 `<title>` 与页标题各出现一次，
    // 质量门「重复句」列会红（`t768` 原型即用不同标题避开此列）。
    docTitle: '做菜模式：' + data.recipe.name + '（私家大厨）', bodyHtml: body,
    // 页内收口那一段（本域五页共用的栅格与排印）追加在族级样式之后：两层不拆回去（包内测试守着）。
    extraCss: cookPageCss(),
  });
}
