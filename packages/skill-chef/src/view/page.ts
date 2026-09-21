/** 查看域 8 卡结果型页面装配（#770）。
 *
 * 卡清单唯一出处＝HELP 场景资产（`src/help/sceneData.ts:52-67`，5 组 8 卡），本件只组装不另立清单。
 * 形状唯一依据＝配方件（`docs/skills/skill-chef/t768-页面族配方.md` §2 结果型 14 格）：每一格都是一次
 * 公共层区块调用，页面不自写样式（`extraCss` 空串）；正文段落走 #860 的 `renderProseBlock`。
 * 只看 X 卡＝同一页只留对应节、锚点 id 与全量页逐字相同（老场景资产口径：其他隐藏、锚点保留）。
 */

import {
  renderCaliberLine, renderChangeRows, renderChipRow, renderConclusionBar, renderCopyBlock,
  renderDataTable, renderDisclosure, renderKpiCard, renderListRows, renderPageShell,
  renderProseBlock, renderTocBlock,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { renderActionBar, renderFactStrip, renderStatusBadge, renderTimelineRows } from 'base-paint';
import { chefSceneCss } from '../render/skin.js';

/** 8 卡清单（id／标题／唤醒词；出处见文件头注释，细节在 HELP 场景资产里）。 */
export const VIEW_CARDS: readonly { id: string; title: string; wake: string }[] = [
  { id: 'view_full_recipe', title: '完整食谱', wake: '查看食谱' },
  { id: 'view_for_beginner', title: '新手强调(关键成功点)', wake: '查看食谱' },
  { id: 'view_recipe_with_substitution', title: '替换食材预览(临时假设)', wake: '查看食谱' },
  { id: 'view_ingredients_only', title: '只看食材', wake: '查看食材' },
  { id: 'view_ingredients_grouped', title: '食材分组(11 大类)', wake: '查看食材' },
  { id: 'view_steps_only', title: '只看步骤', wake: '查看步骤' },
  { id: 'view_nutrition_only', title: '只看营养', wake: '查看营养' },
  { id: 'view_background_only', title: '只看背景文化', wake: '查看背景' },
];

interface ViewItem extends Record<string, unknown> {
  name: string; difficulty: string; servings: number; total_time_minutes: number; status: string;
  description: string; source: string; source_url: string; created_at: string; updated_at: string;
  ingredients: Record<string, unknown>[]; steps: Record<string, unknown>[];
  history: { count: number; avgRating: number | null };
  history_timeline: { cook_date: string; cook_sequence: number; rating: number | null; feedback: string }[];
  nutrition: Record<string, unknown>; background: Record<string, unknown> | null;
  badges: Record<string, string[]>;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const asItem = (item: Record<string, unknown>): ViewItem => item as unknown as ViewItem;

function factsOf(d: ViewItem): string {
  return renderFactStrip({ items: [
    { label: '难度', value: d.difficulty || '未写' },
    { label: '份量', value: d.servings + ' 人份' },
    { label: '总时长', value: d.total_time_minutes + ' 分钟' },
  ] });
}

function conclusionOf(d: ViewItem): string {
  const avg = d.history.avgRating === null ? '暂无评分' : '平均 ' + d.history.avgRating + ' 分';
  return renderConclusionBar('这道菜做过 ' + d.history.count + ' 次，' + avg + '。');
}

function badgeRowOf(d: ViewItem): string {
  const texts = [...d.badges.cuisine, ...d.badges.flavors, ...d.badges.seasons,
    ...d.badges.meal_types, ...d.badges.diet_tags, ...d.badges.cooking_methods];
  if (!texts.length && !d.status) return '';
  return renderChipRow({
    items: texts.map((t) => ({ text: t })),
    tailHtml: d.status ? renderStatusBadge({ status: 'ok', text: d.status }) : '',
  });
}

function ingredientsTableOf(d: ViewItem, caption: string | null, withCat: boolean): string {
  const columns = [{ key: 'name', label: '食材' }, { key: 'qty', label: '用量', align: 'right' as const }, { key: 'note', label: '说明' }];
  if (withCat) columns.push({ key: 'cat', label: '分类' });
  return renderDataTable({
    caption: caption ?? undefined, columns,
    rows: d.ingredients.map((g) => ({
      name: str(g.name),
      qty: g.quantity === null || g.quantity === undefined || g.quantity === '' ? '适量' : String(g.quantity) + str(g.unit),
      note: str(g.quantity_text) || '未写', cat: str(g.category),
    })),
  });
}

function stepCardsOf(d: ViewItem, open: boolean): string {
  return d.steps.map((s) => renderDisclosure({
    title: '第 ' + String(s.sequence) + ' 步', open,
    contentHtml: renderProseBlock({ text: str(s.action) || '未写' }) + renderFactStrip({ items: [
      { label: '火候', value: str(s.heat_level) || '未写' },
      { label: '时长', value: (s.duration_minutes ?? '—') + ' 分钟' },
      { label: '锅温', value: str(s.temperature) || '未写' },
    ] }) + renderCaliberLine('这一步做成：' + (str(s.expected_result) || '未写')),
  })).join('');
}

function nutritionOf(d: ViewItem): string {
  const n = d.nutrition;
  if (n.estimated !== true) return renderCaliberLine('营养未估算：这个谱按实际称量走，页面不编数字。');
  const cell = (v: unknown, unit: string): string => (v === null || v === undefined ? '未写' : String(v) + ' ' + unit);
  return renderDataTable({
    caption: '营养成分（每 ' + String(n.serving_size) + str(n.serving_unit) + '）',
    columns: [{ key: 'k', label: '项目' }, { key: 'v', label: '含量', align: 'right' as const }],
    rows: [
      { k: '热量', v: cell(n.calories, '千卡') }, { k: '蛋白质', v: cell(n.protein, '克') },
      { k: '脂肪', v: cell(n.fat, '克') }, { k: '碳水', v: cell(n.carbs, '克') },
      { k: '纤维', v: cell(n.fiber, '克') }, { k: '钠', v: cell(n.sodium, '毫克') },
    ],
  });
}

/** 数据侧的机器标注（真库里那一条的原文形状：`(AI 补:用户手写本没写,根据常识补)`）。
 *
 * #871 C 类裁定（维护者 2026-09-21 授权自裁）：**渲染侧清洗**——标注是作者写的机器记号，不是内容，
 * 用户口径「文字不能出现冗余和不合理」；**库仍是权威、不改库**。窄口径：只剥「括号包起来的
 * `AI` ＋ 冒号」这一种；正文自己的括号（如「湖南人叫它土菜」）一字不动。
 * 清洗落在本域（全库实测只此一处，见 #871 证据件）；第二个用法出现再提共用件。
 */
const MACHINE_ANNOTATION = /[（(]\s*AI\s*补?\s*[:：][^）)]*[）)]/g;
const cleanOf = (s: string): string => s.replace(MACHINE_ANNOTATION, '');

function backgroundOf(d: ViewItem): string {
  if (!d.background) return '';
  return renderProseBlock({ text: cleanOf(str(d.background.origin_story)) })
    + renderProseBlock({ text: cleanOf(str(d.background.historical_background)) })
    + renderProseBlock({ text: cleanOf(str(d.background.cultural_significance)) });
}

function historyOf(d: ViewItem): string {
  const avg = d.history.avgRating;
  const kpi = avg === null
    ? renderKpiCard({ label: '做过', value: String(d.history.count), unit: '次', detail: '暂无评分' })
    : renderKpiCard({ label: '平均评分', value: String(avg), unit: '分', detail: '满分 5 分，共做过 ' + d.history.count + ' 次', bar: { pct: (avg / 5) * 100 } });
  if (!d.history_timeline.length) return kpi;
  return kpi + renderTimelineRows({ rows: d.history_timeline.map((r) => ({
    time: r.cook_date, main: '第 ' + r.cook_sequence + ' 次做这道菜，评分 ' + r.rating + ' 分', note: r.feedback || '这次没写反馈',
  })) });
}

function swapOf(d: ViewItem): string {
  return renderChangeRows({ rows: d.ingredients.map((g) => ({
    label: str(g.name), before: str(g.name), after: str(g.substitute) || '未写',
  })) }) + renderCaliberLine('替换只是临时假设，不落库，真换走修改域。')
    + renderCaliberLine('当前库内 11 味均标注无替代品。');
}

function footerOf(d: ViewItem): string {
  return renderCaliberLine('出处：' + (d.source || '未写'))
    + renderCaliberLine('建档 ' + (d.created_at || '未写') + '，最近更新 ' + (d.updated_at || '未写'));
}

function copyOf(d: ViewItem): string {
  return renderCopyBlock({
    title: '复制这份菜谱', dataActionId: 't770-copy-recipe',
    dataText: JSON.stringify({ 菜名: d.name, 食材数: d.ingredients.length, 步骤数: d.steps.length }, null, 2),
  });
}

function actionsOf(): string {
  return renderActionBar({ buttons: [
    { label: '开始做菜', kind: 'primary', actionId: 't770-cook' },
    { label: '记一次', kind: 'ghost', actionId: 't770-record' },
  ] });
}

// 全量节（含锚点 id）：只看 X 卡复用同一节字符串，保证锚点逐字相同。
// #871 D 类裁定（维护者 2026-09-21 授权自裁）：原先另有一节「切配清单」（`renderListRows`，成对键值
// 清单）只由完整食谱页用，画的是同一批食材的**同两列**（name ＋ quantity_text，数据表已有）⇒ 同一份
// 内容画两遍、两段还共用一个 `id="section-ingredients"`。**保留三列数据表**（多「用量」一列、列头承担
// 语义），删掉清单——配方格 7「切配建议」的内容由表的「说明」列承载，锚点随之唯一。
function sectionsOf(d: ViewItem): Record<string, string> {
  const prep = ingredientsTableOf(d, '食材（' + d.ingredients.length + ' 味）', false);
  const grouped = [...new Set(d.ingredients.map((g) => str(g.category)))].map((c) => renderDisclosure({
    title: c, contentHtml: renderDataTable({
      columns: [{ key: 'name', label: '食材' }, { key: 'qty', label: '用量', align: 'right' as const }, { key: 'note', label: '说明' }],
      rows: d.ingredients.filter((g) => str(g.category) === c).map((g) => ({
        name: str(g.name),
        qty: g.quantity === null || g.quantity === undefined || g.quantity === '' ? '适量' : String(g.quantity) + str(g.unit),
        note: str(g.quantity_text) || '未写',
      })),
    }),
  })).join('');
  return {
    ingredients: '<div id="section-ingredients">' + prep + '</div>',
    grouped: '<div id="section-ingredients">' + grouped + '</div>',
    steps: '<div id="section-steps">' + stepCardsOf(d, true) + '</div>',
    nutrition: '<div id="section-nutrition">' + nutritionOf(d) + '</div>',
    background: '<div id="section-background">' + backgroundOf(d) + '</div>',
    swap: '<div id="section-substitution">' + swapOf(d) + '</div>',
  };
}

function shellOf(title: string, content: string): string {
  return renderDocShell({
    // 文档标题与页标题错开一句（页标题只说这是什么页，文档标题带技能名），不互相复读。
    // 页面级样式走单一入口 `chefSceneCss()`（公共层两配方 ＋ 私家大厨皮肤）：事实条多列、
    // 表格双端行为与皮肤都在它里面；本页零自写样式。
    docTitle: title + ' - 私家大厨', extraCss: chefSceneCss(), pageUi: true,
    bodyHtml: renderPageShell({ eyebrow: '私家大厨 ｜ 查看', title, content }),
  });
}

/** 按卡 id 装配整页 HTML（未知卡 id 即抛，不返空页）。 */
export function buildViewHtml(cardId: string, item: Record<string, unknown>): string {
  const d = asItem(item);
  if (!d.name) throw new Error('无此菜谱：页面缺菜名（' + cardId + '）');
  const sec = sectionsOf(d);
  const head = factsOf(d) + conclusionOf(d) + badgeRowOf(d);
  const tail = historyOf(d) + footerOf(d) + actionsOf() + copyOf(d);
  switch (cardId) {
    case 'view_full_recipe': {
      const toc = renderTocBlock({ items: [
        { id: 'section-ingredients', text: '食材与备料' }, { id: 'section-steps', text: '步骤' },
        { id: 'section-nutrition', text: '营养' }, { id: 'section-background', text: '背景' },
      ] });
      return shellOf(d.name, head + toc + sec.ingredients + sec.steps + sec.nutrition + sec.background + tail);
    }
    case 'view_for_beginner': {
      const keys = renderDisclosure({
        title: '新手关键成功点', open: true,
        contentHtml: renderListRows({ items: d.steps.map((s) => ({ main: '第 ' + String(s.sequence) + ' 步', right: str(s.expected_result) || '按动作做' })) }),
      });
      return shellOf(d.name, head + keys + sec.ingredients + sec.steps + sec.nutrition + tail);
    }
    case 'view_recipe_with_substitution':
      return shellOf(d.name, head + sec.swap + sec.ingredients + tail);
    case 'view_ingredients_only':
      return shellOf(d.name + '（只看食材）', head + sec.ingredients + tail);
    case 'view_ingredients_grouped':
      return shellOf(d.name + '（食材分组）', head + sec.grouped + tail);
    case 'view_steps_only':
      return shellOf(d.name + '（只看步骤）', head + sec.steps + tail);
    case 'view_nutrition_only':
      return shellOf(d.name + '（只看营养）', head + sec.nutrition + tail);
    case 'view_background_only':
      if (!d.background) throw new Error('无背景数据：' + d.name + '（' + cardId + '）');
      return shellOf(d.name + '（只看背景）', head + sec.background + tail);
    default:
      throw new Error('未知查看卡：' + cardId);
  }
}
