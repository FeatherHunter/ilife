/** 查看域 8 卡结果型页面装配（#770；#873 查看席做页内收口）。
 *
 * 卡清单唯一出处＝HELP 场景资产（`src/help/sceneData.ts:52-67`，5 组 8 卡），本件只组装不另立清单。
 * 形状唯一依据＝配方件（`docs/skills/skill-chef/t768-页面族配方.md` §2 结果型 14 格）：每一格都是一次
 * 公共层区块调用；页面级样式走单一入口 `chefSceneCss()`，本域页内版式在它后面**追加一段**
 * `viewPageCss()`（不把公共层那两层拆回去）。只看 X 卡＝同一页只留对应节、锚点 id 与全量页逐字相同。
 *
 * #873 页内收口（七处，逐条都在证据件 `t873-席查看.md` 里有改后读数）：① 分区标题行（图标位＋标题＋
 * 右端读数）替掉「一段接一段的无题正文」——营养／背景／步骤原先只有表注或干脆没有标题；② 页头那行
 * 13 枚无名色块改成「维度名＋值」的分组标签块并**移到正文之后**（此前它占掉首屏三分之一，把真正要看
 * 的内容挤到次屏）；③ 「已做」从徽章行搬进事实条的状态位，不再与口味／季节徽章同形同行同重；
 * ④ 营养成分表改读数瓦片（配方件第 9 格写明「`renderDataTable` 或读数卡网格」两条都收）；⑤ 背景三段
 * 各配一枚小标题（来历／历史脉络／文化意味）；⑥ 新手要点由「一行行等重的字」改成序号牌列表；
 * ⑦ 替换食材「全是同一句时不逐行重复」（配方件第 12 格原话「全是同一句时不印」）——11 行
 * 「螺丝椒 → 无替代品」收成一句读数。
 */

import {
  renderCaliberLine, renderChangeRows, renderChips, renderConclusionBar,
  renderDataTable, renderDisclosure, renderKpiCard, renderPageShell,
  renderProseBlock, renderTocBlock,
} from 'base-paint/blocks';
import { chefCopyArea } from '../render/copyArea.js';
import { renderSceneShell } from '../render/sceneShell.js';
import { escapeHtml, renderActionBar, renderFactStrip, renderTimelineRows } from 'base-paint';
import { chefSceneCss } from '../render/skin.js';
import { viewPageCss } from './pageCss.js';
import { paramBandOf, sectionOf } from './pageSection.js';
import type { SecHead } from './pageSection.js';
import { m } from '../entries/index.js';

/** 换行（本件只在拼 `extraCss` 时用一次）。 */
const LF = String.fromCharCode(10);
/** 五字符归一（与区块层同源 `escapeHtml`，不自写第二份字符表）。 */
const esc = escapeHtml;

/** 8 卡清单（id／标题／唤醒词；出处见文件头注释，细节在 HELP 场景资产里）。
 *
 *  **标题走取值器**：`m()` 只能在函数体内调用，故不做模块级常量；取值器体就是函数体，
 *  访问时才按当前渲染语言解词条。`wake` 是唤醒词（数据，不译）。 */
export const VIEW_CARDS: readonly { id: string; title: string; wake: string }[] = [
  { id: 'view_full_recipe', get title() { return m('skill-chef.view-page.c083'); }, wake: '查看食谱' },
  { id: 'view_for_beginner', get title() { return m('skill-chef.view-page.c084'); }, wake: '查看食谱' },
  { id: 'view_recipe_with_substitution', get title() { return m('skill-chef.view-page.c085'); }, wake: '查看食谱' },
  { id: 'view_ingredients_only', get title() { return m('skill-chef.view-page.c086'); }, wake: '查看食材' },
  { id: 'view_ingredients_grouped', get title() { return m('skill-chef.view-page.c087'); }, wake: '查看食材' },
  { id: 'view_steps_only', get title() { return m('skill-chef.view-page.c088'); }, wake: '查看步骤' },
  { id: 'view_nutrition_only', get title() { return m('skill-chef.view-page.c089'); }, wake: '查看营养' },
  { id: 'view_background_only', get title() { return m('skill-chef.view-page.c090'); }, wake: '查看背景' },
];

/** 徽章行的维度分组（键＝给人看的维度名，字段＝`badges` 里的那一张关联表）。
 *  **按需构建**：`m()` 只能在函数体内调用，故不做模块级常量。 */
function tagGroups(): readonly { readonly key: string; readonly field: string }[] {
  return [
    { key: m('skill-chef.view-page.c091'), field: 'cuisine' }, { key: m('skill-chef.view-page.c092'), field: 'flavors' },
    { key: m('skill-chef.view-page.c093'), field: 'seasons' }, { key: m('skill-chef.view-page.c094'), field: 'meal_types' },
    { key: m('skill-chef.view-page.c095'), field: 'diet_tags' }, { key: m('skill-chef.view-page.c096'), field: 'cooking_methods' },
  ];
}

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

/** 若干枚短词排成一行徽章（分类速览、替换点名用这条形状；与分组标签块同一行制）。 */
function chipRowOf(texts: readonly string[]): string {
  if (texts.length === 0) return '';
  return '<div class="chef-view-tags-row">'
    + renderChips({ items: texts.map((t) => ({ text: t })) }) + '</div>';
}

/** 「这一份由哪几类凑成」：分类名 ＋ 该类的味数。
 *  只看食材那一页先前是光秃秃一张表（全页只有一个块），次一级结构全无；这一行把它补上。 */
function catsOf(d: ViewItem): string {
  const cats = [...new Set(d.ingredients.map((g) => str(g.category)))].filter((c) => c !== '');
  if (cats.length < 2) return '';
  return chipRowOf(cats.map((c) => m('skill-chef.view-page.c001', {
    p0: String(c),
    p1: String(d.ingredients.filter((g) => str(g.category) === c).length),
  })));
}

/** 四枚分区的题头（页内导航与分区标题同源，不许两处各写一份）。 */
function secHeadsOf(d: ViewItem): Record<'ingredients' | 'steps' | 'nutrition' | 'background', SecHead> {
  const n = d.nutrition;
  return {
    // 食材那一位的读数不写「分 N 类」：分类由正文里那行「哪几类各几味」点名，两处同说一件事＝复读。
    ingredients: { title: m('skill-chef.view-page.c002', { p0: String(d.ingredients.length) }), note: '' },
    // 步骤那一位的读数不写「火候与时长」：正文每张卡里就是火候／时长／锅温三格，标题先报一遍＝复读。
    steps: { title: m('skill-chef.view-page.c003', { p0: String(d.steps.length) }), note: '' },
    nutrition: n.estimated === true
      ? { title: m('skill-chef.view-page.c004'), note: m('skill-chef.view-page.c005', { p0: String(String(n.serving_size)), p1: String(str(n.serving_unit)) }) }
      : { title: m('skill-chef.view-page.c006'), note: '' },
    background: { title: m('skill-chef.view-page.c007'), note: '' },
  };
}

function factsOf(d: ViewItem): string {
  // 三格（#873 第三轮）：原先第四格是「状态 已做」，与结论条的「做过 N 次」说同一件事（判官两轮都点
  // 「'已做／做过 1 次' 文案仍可再精炼」）；撤掉那一格之后这一行在 390 档也不再把三枚标签挤到贴边
  // （判官原话「四枚水平并排出现明显挤压」）。状态本身没有丢：结论条的「做过 N 次／还没做过」就是它。
  const items: { label: string; value: string; tone?: 'ok' | 'warn' | 'danger' }[] = [
    { label: m('skill-chef.view-page.c008'), value: d.difficulty || m('skill-chef.view-page.c009') },
    { label: m('skill-chef.view-page.c010'), value: m('skill-chef.view-page.c011', { p0: String(d.servings) }) },
    { label: m('skill-chef.view-page.c012'), value: m('skill-chef.view-page.c013', { p0: String(d.total_time_minutes) }) },
  ];
  return renderFactStrip({ extraClass: 'chef-view-facts', items });
}

function conclusionOf(d: ViewItem): string {
  const count = d.history.count;
  // 结论条只说「做过几次 ＋ 最近一次几分」，**不再报平均分**——平均分是页尾读数卡那一位的活
  // （判官第三轮仍点「'平均 4 分' 句式略冗余」）。最近一次的分数取时间轴上最新的一条；没记过就退回平均分。
  const last = d.history_timeline[0];
  const latest = last !== undefined && last.rating !== null ? m('skill-chef.view-page.c014', { p0: String(last.rating) }) : m('skill-chef.view-page.c015');
  return renderConclusionBar(count === 0 ? m('skill-chef.view-page.c016') : m('skill-chef.view-page.c017', { p0: String(count), p1: String(latest) }));
}

/** 分组标签块（#873 ②）：一枚维度一枚维度地排，不再是 13 枚无名色块挤成一片标签云。 */
function tagsOf(d: ViewItem): string {
  const rows = tagGroups().map((g) => {
    const vals = d.badges[g.field] ?? [];
    if (vals.length === 0) return '';
    return '<div class="chef-view-tags-row">'
      + '<span class="chef-view-tags-key">' + esc(g.key) + '</span>'
      + renderChips({ items: vals.map((t) => ({ text: t })) })
      + '</div>';
  }).join('');
  if (rows === '') return '';
  // 右端读数留空：标签块自己的六个维度名已经把「这一份怎么分类」说全，标题旁再补一句是复述。
  return sectionOf('', 'tags', { title: m('skill-chef.view-page.c018'), note: '' },
    '<div class="chef-view-tags">' + rows + '</div>');
}

function ingredientsTableOf(d: ViewItem): string {
  return renderDataTable({
    columns: [{ key: 'name', label: m('skill-chef.view-page.c019') }, { key: 'qty', label: m('skill-chef.view-page.c020'), align: 'right' as const }, { key: 'note', label: m('skill-chef.view-page.c021') }],
    rows: d.ingredients.map((g) => ({
      name: str(g.name),
      qty: g.quantity === null || g.quantity === undefined || g.quantity === '' ? m('skill-chef.view-page.c022') : String(g.quantity) + str(g.unit),
      note: str(g.quantity_text) || m('skill-chef.view-page.c023'),
    })),
  });
}

function stepCardsOf(d: ViewItem, open: boolean): string {
  // #873 第二轮：火候／时长／锅温由「三格白瓦片」换成**带图标位的参数带**——每张步骤卡上因此
  // 有一处色彩锚点，判官点的「卡片纯白底、步骤色块薄」由这条销账。
  return d.steps.map((s) => {
    const expected = str(s.expected_result) || m('skill-chef.view-page.c024');
    return renderDisclosure({
      title: m('skill-chef.view-page.c025', { p0: String(String(s.sequence)) }), open,
      contentHtml: renderProseBlock({ text: str(s.action) || m('skill-chef.view-page.c026') }) + paramBandOf([
        { tone: 'heat', label: m('skill-chef.view-page.c027'), value: str(s.heat_level) || m('skill-chef.view-page.c028') },
        { tone: 'clock', label: m('skill-chef.view-page.c029'), value: m('skill-chef.view-page.c030', { p0: String(s.duration_minutes ?? '—') }) },
        { tone: 'temp', label: m('skill-chef.view-page.c031'), value: str(s.temperature) || m('skill-chef.view-page.c032') },
      ]) + renderCaliberLine(m('skill-chef.view-page.c033', { p0: String(expected) })),
    });
  }).join('');
}

/** 新手要点（#873 ⑥）：一条一枚序号牌——「第几步」由形状承担，不再是一行行等重的字。 */
function keysOf(d: ViewItem): string {
  const rows = d.steps.map((s) => '<li class="chef-view-key">'
    + '<span class="chef-view-key-no">' + m('skill-chef.view-page.c025', { p0: String(s.sequence) }) + '</span>'
    + '<span class="chef-view-key-text">' + esc(str(s.expected_result) || m('skill-chef.view-page.c034')) + '</span></li>').join('');
  return sectionOf('', 'keys', { title: m('skill-chef.view-page.c035'), note: m('skill-chef.view-page.c036', { p0: String(String(d.steps.length)) }) },
    '<ol class="chef-view-keys">' + rows + '</ol>');
}

function nutritionOf(d: ViewItem, head: SecHead): string {
  const n = d.nutrition;
  const anchor = 'section-nutrition';
  if (n.estimated !== true) {
    return sectionOf(anchor, 'nutrition', head, renderCaliberLine(m('skill-chef.view-page.c037')));
  }
  const cell = (v: unknown, unit: string): string => (v === null || v === undefined ? m('skill-chef.view-page.c038') : String(v) + ' ' + unit);
  return sectionOf(anchor, 'nutrition', head, renderFactStrip({
    extraClass: 'chef-view-nutri',
    items: [
      { label: m('skill-chef.view-page.c039'), value: cell(n.calories, m('skill-chef.view-page.c040')) }, { label: m('skill-chef.view-page.c041'), value: cell(n.protein, m('skill-chef.view-page.c042')) },
      { label: m('skill-chef.view-page.c043'), value: cell(n.fat, m('skill-chef.view-page.c044')) }, { label: m('skill-chef.view-page.c045'), value: cell(n.carbs, m('skill-chef.view-page.c046')) },
      { label: m('skill-chef.view-page.c047'), value: cell(n.fiber, m('skill-chef.view-page.c048')) }, { label: m('skill-chef.view-page.c049'), value: cell(n.sodium, m('skill-chef.view-page.c050')) },
    ],
  }));
}

/** 数据侧的机器标注（真库里那一条的原文形状：`(AI 补:用户手写本没写,根据常识补)`）。
 *
 * #871 C 类裁定（维护者 2026-09-21 授权自裁）：**渲染侧清洗**——标注是作者写的机器记号，不是内容，
 * 用户口径「文字不能出现冗余和不合理」；**库仍是权威、不改库**。窄口径：只剥「括号包起来的
 * `AI` ＋ 冒号」这一种；正文自己的括号（如「湖南人叫它土菜」）一字不动。
 * 清洗落在本域（全库实测只此一处，见 #871 证据件）；第二个用法出现再提共用件。
 */
const MACHINE_ANNOTATION = /[（(]\s*AI\s*补?\s*[:：][^）)]*[）)]/g;
const cleanOf = (s: string): string => s.replace(MACHINE_ANNOTATION, '').trim();

/** 背景三小节（#873 ⑤）：来历／历史脉络／文化意味各一枚小标题——三级层级从此看得见。 */
function backgroundOf(d: ViewItem, head: SecHead): string {
  if (!d.background) return '';
  const segs: readonly (readonly [string, string])[] = [
    [m('skill-chef.view-page.c051'), cleanOf(str(d.background.origin_story))],
    [m('skill-chef.view-page.c052'), cleanOf(str(d.background.historical_background))],
    [m('skill-chef.view-page.c053'), cleanOf(str(d.background.cultural_significance))],
  ];
  const body = segs.filter((seg) => seg[1] !== '').map((seg) =>
    '<div class="chef-view-prose-block">'
    + '<h3 class="chef-view-prose-title">' + esc(seg[0]) + '</h3>'
    + renderProseBlock({ text: seg[1] }) + '</div>').join('');
  return sectionOf('section-background', 'background', head, body);
}

function historyOf(d: ViewItem): string {
  const avg = d.history.avgRating;
  // #873：结论条已说「做过 N 次」，读数卡的说明位不再把同一句复读一遍。
  const kpi = avg === null
    ? renderKpiCard({ label: m('skill-chef.view-page.c054'), value: String(d.history.count), unit: m('skill-chef.view-page.c055'), detail: m('skill-chef.view-page.c056') })
    : renderKpiCard({ label: m('skill-chef.view-page.c057'), value: String(avg), unit: m('skill-chef.view-page.c058'), detail: m('skill-chef.view-page.c059'), bar: { pct: (avg / 5) * 100 } });
  const body = d.history_timeline.length === 0 ? kpi : kpi + renderTimelineRows({ rows: d.history_timeline.map((r) => ({
    time: r.cook_date, main: m('skill-chef.view-page.c060', { p0: String(r.cook_sequence), p1: String(r.rating) }), note: r.feedback || m('skill-chef.view-page.c061'),
  })) });
  return sectionOf('', 'history', { title: m('skill-chef.view-page.c062'), note: m('skill-chef.view-page.c063') }, body);
}

/** 替换预览（#873 ⑦）：替代品全是同一句时不逐行重复（配方件第 12 格原话「全是同一句时不印」）。 */
function swapOf(d: ViewItem): string {
  const rows = d.ingredients.map((g) => ({
    label: str(g.name), before: str(g.name), after: str(g.substitute) || m('skill-chef.view-page.c064'),
  }));
  const first = rows[0];
  const uniform = first !== undefined && rows.every((r) => r.after === first.after) ? first.after : null;
  // 替代品全是同一句时不逐行重复（配方件第 12 格原话「全是同一句时不印」）：改印一句读数 ＋
  // 这一份的实物名（11 行同义行换成一行点名，读者仍看得到论的是哪几味）。
  const body = uniform === null
    ? renderChangeRows({ rows })
    : renderCaliberLine(m('skill-chef.view-page.c065', { p0: String(rows.length), p1: String(uniform) }))
      + chipRowOf(d.ingredients.map((g) => str(g.name)));
  // 判官点过「'临时预览' 仍可再精炼」：标题已说「替换食材预览」、下面那句已说「只是临时假设」，
  // 右端读数不再复述第三遍 ⇒ 留空。
  return sectionOf('section-substitution', 'swap', { title: m('skill-chef.view-page.c066'), note: '' },
    body + renderCaliberLine(m('skill-chef.view-page.c067')));
}

function footerOf(d: ViewItem): string {
  const source = d.source || m('skill-chef.view-page.c068');
  const created = d.created_at || m('skill-chef.view-page.c069');
  const updated = d.updated_at || m('skill-chef.view-page.c070');
  return renderCaliberLine(m('skill-chef.view-page.c071', { p0: String(source) }))
    + renderCaliberLine(m('skill-chef.view-page.c072', { p0: String(created), p1: String(updated) }));
}

function copyOf(d: ViewItem): string {
  return chefCopyArea({
    dataActionId: 't770-copy-recipe',
    data: {
      key: 'chef.recipe.view', shape: 'detail',
      item: { 菜名: d.name, 食材数: d.ingredients.length, 步骤数: d.steps.length },
    },
  });
}

function actionsOf(): string {
  return renderActionBar({ buttons: [
    { label: m('skill-chef.view-page.c073'), kind: 'primary', actionId: 't770-cook' },
    { label: m('skill-chef.view-page.c074'), kind: 'ghost', actionId: 't770-record' },
  ] });
}

// 全量节（含锚点 id）：只看 X 卡复用同一节字符串，保证锚点逐字相同。
// #871 D 类裁定（维护者 2026-09-21 授权自裁）：原先另有一节「切配清单」（`renderListRows`，成对键值
// 清单）只由完整食谱页用，画的是同一批食材的**同两列**（name ＋ quantity_text，数据表已有）⇒ 同一份
// 内容画两遍、两段还共用一个 `id="section-ingredients"`。**保留三列数据表**（多「用量」一列、列头承担
// 语义），删掉清单——配方格 7「切配建议」的内容由表的「说明」列承载，锚点随之唯一。
function sectionsOf(d: ViewItem): Record<string, string> {
  const h = secHeadsOf(d);
  const grouped = [...new Set(d.ingredients.map((g) => str(g.category)))].map((c) => {
    const rows = d.ingredients.filter((g) => str(g.category) === c);
    return renderDisclosure({
      title: m('skill-chef.view-page.c075', { p0: String(c), p1: String(rows.length) }), open: true,
      contentHtml: renderDataTable({
        columns: [{ key: 'name', label: m('skill-chef.view-page.c076') }, { key: 'qty', label: m('skill-chef.view-page.c077'), align: 'right' as const }, { key: 'note', label: m('skill-chef.view-page.c078') }],
        rows: rows.map((g) => ({
          name: str(g.name),
          qty: g.quantity === null || g.quantity === undefined || g.quantity === '' ? m('skill-chef.view-page.c079') : String(g.quantity) + str(g.unit),
          note: str(g.quantity_text) || m('skill-chef.view-page.c080'),
        })),
      }),
    });
  }).join('');
  return {
    ingredients: sectionOf('section-ingredients', 'ingredients', h.ingredients,
      catsOf(d) + ingredientsTableOf(d)),
    grouped: sectionOf('section-ingredients', 'ingredients', h.ingredients, grouped),
    steps: sectionOf('section-steps', 'steps', h.steps, stepCardsOf(d, true)),
    nutrition: nutritionOf(d, h.nutrition),
    background: backgroundOf(d, h.background),
    swap: swapOf(d),
  };
}

function shellOf(title: string, content: string): string {
  return renderSceneShell({
    family: 'result',
    // 文档标题与页标题错开一句（页标题只说这是什么页，文档标题带技能名），不互相复读。
    // 页面级样式＝公共层两配方 ＋ 私家大厨皮肤 ＋ 族级标准（单一入口 `renderSceneShell`）＋ 本域页内那一段。
    docTitle: m('skill-chef.view-page.c081', { p0: String(title) }), extraCss: viewPageCss(),
    bodyHtml: renderPageShell({ eyebrow: m('skill-chef.view-page.c082'), title, content }),
  });
}

/** 按卡 id 装配整页 HTML（未知卡 id 即抛，不返空页）。 */
export function buildViewHtml(cardId: string, item: Record<string, unknown>): string {
  const d = asItem(item);
  if (!d.name) throw new Error('无此菜谱：页面缺菜名（' + cardId + '）');
  const sec = sectionsOf(d);
  // 页头不再挂页内装饰带：族级带由页壳（`renderSceneShell`）插在版面根首节点，页内再挂一条＝重复装饰。
  const head = factsOf(d) + conclusionOf(d);
  // #873 ②：标签块排在正文之后——它此前排在页头，13 枚色块把真正的内容挤到次屏。
  // #873 第三轮：标签块与下厨记录收进同一行容器 `chef-view-side`——宽档两栏借位（判官点
  // 「桌面版仍堆叠一列未借位」），窄档照旧一列往下排。
  const tail = '<div class="chef-view-side">' + tagsOf(d) + historyOf(d) + '</div>'
    + footerOf(d) + actionsOf() + copyOf(d);
  switch (cardId) {
    case 'view_full_recipe': {
      // 页内导航的标签取短名（390 档四枚胶囊要排得下，长名会被裁到右缘）；分区标题仍带读数。
      const toc = renderTocBlock({ items: [
        { id: 'section-ingredients', text: m('skill-chef.view-page.c019') }, { id: 'section-steps', text: m('skill-chef.view-page.c097') },
        { id: 'section-nutrition', text: m('skill-chef.view-page.c098') }, { id: 'section-background', text: m('skill-chef.view-page.c099') },
      ] });
      return shellOf(d.name, head + toc + sec.ingredients + sec.steps + sec.nutrition + sec.background + tail);
    }
    case 'view_for_beginner':
      return shellOf(d.name, head + keysOf(d) + sec.ingredients + sec.steps + sec.nutrition + tail);
    case 'view_recipe_with_substitution':
      return shellOf(d.name, head + sec.swap + sec.ingredients + tail);
    case 'view_ingredients_only':
      return shellOf(d.name + m('skill-chef.view-page.c100'), head + sec.ingredients + tail);
    case 'view_ingredients_grouped':
      return shellOf(d.name + m('skill-chef.view-page.c101'), head + sec.grouped + tail);
    case 'view_steps_only':
      return shellOf(d.name + m('skill-chef.view-page.c102'), head + sec.steps + tail);
    case 'view_nutrition_only':
      return shellOf(d.name + m('skill-chef.view-page.c103'), head + sec.nutrition + tail);
    case 'view_background_only':
      if (!d.background) throw new Error('无背景数据：' + d.name + '（' + cardId + '）');
      return shellOf(d.name + m('skill-chef.view-page.c104'), head + sec.background + tail);
    default:
      throw new Error('未知查看卡：' + cardId);
  }
}
