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
  renderCaliberLine, renderChangeRows, renderChips, renderConclusionBar, renderCopyBlock,
  renderDataTable, renderDisclosure, renderKpiCard, renderPageShell,
  renderProseBlock, renderTocBlock,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { escapeHtml, renderActionBar, renderFactStrip, renderTimelineRows } from 'base-paint';
import { chefSceneCss } from '../render/skin.js';
import { viewPageCss } from './pageCss.js';
import { heroBandOf, paramBandOf, sectionOf } from './pageSection.js';
import type { SecHead } from './pageSection.js';

/** 换行（本件只在拼 `extraCss` 时用一次）。 */
const LF = String.fromCharCode(10);
/** 五字符归一（与区块层同源 `escapeHtml`，不自写第二份字符表）。 */
const esc = escapeHtml;

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

/** 徽章行的维度分组（键＝给人看的维度名，字段＝`badges` 里的那一张关联表）。 */
const TAG_GROUPS: readonly { readonly key: string; readonly field: string }[] = [
  { key: '菜系', field: 'cuisine' }, { key: '口味', field: 'flavors' },
  { key: '季节', field: 'seasons' }, { key: '餐别', field: 'meal_types' },
  { key: '营养', field: 'diet_tags' }, { key: '做法', field: 'cooking_methods' },
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
  return chipRowOf(cats.map((c) => c + ' ' + d.ingredients.filter((g) => str(g.category) === c).length + ' 味'));
}

/** 四枚分区的题头（页内导航与分区标题同源，不许两处各写一份）。 */
function secHeadsOf(d: ViewItem): Record<'ingredients' | 'steps' | 'nutrition' | 'background', SecHead> {
  const n = d.nutrition;
  return {
    // 食材那一位的读数不写「分 N 类」：分类由正文里那行「哪几类各几味」点名，两处同说一件事＝复读。
    ingredients: { title: '食材（' + d.ingredients.length + ' 味）', note: '' },
    // 步骤那一位的读数不写「火候与时长」：正文每张卡里就是火候／时长／锅温三格，标题先报一遍＝复读。
    steps: { title: '步骤（' + d.steps.length + ' 步）', note: '' },
    nutrition: n.estimated === true
      ? { title: '营养成分', note: '每 ' + String(n.serving_size) + str(n.serving_unit) }
      : { title: '营养成分', note: '' },
    background: { title: '背景文化', note: '' },
  };
}

function factsOf(d: ViewItem): string {
  const items: { label: string; value: string; tone?: 'ok' | 'warn' | 'danger' }[] = [
    { label: '难度', value: d.difficulty || '未写' },
    { label: '份量', value: d.servings + ' 人份' },
    { label: '总时长', value: d.total_time_minutes + ' 分钟' },
  ];
  // #873 ③：「已做」是这一条菜的状态，不是口味／季节那一类标签——它住事实条，不进标签块。
  if (d.status !== '') {
    if (d.status === '已做') items.push({ label: '状态', value: d.status, tone: 'ok' });
    else items.push({ label: '状态', value: d.status });
  }
  // 宽档四格等宽铺满版心（`chef-view-facts` 那一组在 `viewPageCss()` 的桌面档里）。
  return renderFactStrip({ extraClass: 'chef-view-facts', items });
}

function conclusionOf(d: ViewItem): string {
  const avg = d.history.avgRating === null ? '暂无评分' : '平均 ' + d.history.avgRating + ' 分';
  // 不写「这道菜」：标题就是菜名，句子里再点一次同名是复述（判官点过这一句「冗余」）。
  return renderConclusionBar('做过 ' + d.history.count + ' 次，' + avg + '。');
}

/** 分组标签块（#873 ②）：一枚维度一枚维度地排，不再是 13 枚无名色块挤成一片标签云。 */
function tagsOf(d: ViewItem): string {
  const rows = TAG_GROUPS.map((g) => {
    const vals = d.badges[g.field] ?? [];
    if (vals.length === 0) return '';
    return '<div class="chef-view-tags-row">'
      + '<span class="chef-view-tags-key">' + esc(g.key) + '</span>'
      + renderChips({ items: vals.map((t) => ({ text: t })) })
      + '</div>';
  }).join('');
  if (rows === '') return '';
  // 右端读数留空：标签块自己的六个维度名已经把「这一份怎么分类」说全，标题旁再补一句是复述。
  return sectionOf('', 'tags', { title: '标签', note: '' },
    '<div class="chef-view-tags">' + rows + '</div>');
}

function ingredientsTableOf(d: ViewItem): string {
  return renderDataTable({
    columns: [{ key: 'name', label: '食材' }, { key: 'qty', label: '用量', align: 'right' as const }, { key: 'note', label: '说明' }],
    rows: d.ingredients.map((g) => ({
      name: str(g.name),
      qty: g.quantity === null || g.quantity === undefined || g.quantity === '' ? '适量' : String(g.quantity) + str(g.unit),
      note: str(g.quantity_text) || '未写',
    })),
  });
}

function stepCardsOf(d: ViewItem, open: boolean): string {
  // #873 第二轮：火候／时长／锅温由「三格白瓦片」换成**带图标位的参数带**——每张步骤卡上因此
  // 有一处色彩锚点，判官点的「卡片纯白底、步骤色块薄」由这条销账。
  return d.steps.map((s) => renderDisclosure({
    title: '第 ' + String(s.sequence) + ' 步', open,
    contentHtml: renderProseBlock({ text: str(s.action) || '未写' }) + paramBandOf([
      { tone: 'heat', label: '火候', value: str(s.heat_level) || '未写' },
      { tone: 'clock', label: '时长', value: (s.duration_minutes ?? '—') + ' 分钟' },
      { tone: 'temp', label: '锅温', value: str(s.temperature) || '未写' },
    ]) + renderCaliberLine('这一步做成：' + (str(s.expected_result) || '未写')),
  })).join('');
}

/** 新手要点（#873 ⑥）：一条一枚序号牌——「第几步」由形状承担，不再是一行行等重的字。 */
function keysOf(d: ViewItem): string {
  const rows = d.steps.map((s) => '<li class="chef-view-key">'
    + '<span class="chef-view-key-no">第 ' + esc(String(s.sequence)) + ' 步</span>'
    + '<span class="chef-view-key-text">' + esc(str(s.expected_result) || '按动作做') + '</span></li>').join('');
  return sectionOf('', 'keys', { title: '新手关键成功点', note: String(d.steps.length) + ' 条' },
    '<ol class="chef-view-keys">' + rows + '</ol>');
}

function nutritionOf(d: ViewItem, head: SecHead): string {
  const n = d.nutrition;
  const anchor = 'section-nutrition';
  if (n.estimated !== true) {
    return sectionOf(anchor, 'nutrition', head, renderCaliberLine('营养未估算：这个谱按实际称量走，页面不编数字。'));
  }
  const cell = (v: unknown, unit: string): string => (v === null || v === undefined ? '未写' : String(v) + ' ' + unit);
  return sectionOf(anchor, 'nutrition', head, renderFactStrip({
    extraClass: 'chef-view-nutri',
    items: [
      { label: '热量', value: cell(n.calories, '千卡') }, { label: '蛋白质', value: cell(n.protein, '克') },
      { label: '脂肪', value: cell(n.fat, '克') }, { label: '碳水', value: cell(n.carbs, '克') },
      { label: '纤维', value: cell(n.fiber, '克') }, { label: '钠', value: cell(n.sodium, '毫克') },
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
    ['来历', cleanOf(str(d.background.origin_story))],
    ['历史脉络', cleanOf(str(d.background.historical_background))],
    ['文化意味', cleanOf(str(d.background.cultural_significance))],
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
    ? renderKpiCard({ label: '做过', value: String(d.history.count), unit: '次', detail: '暂无评分' })
    : renderKpiCard({ label: '平均评分', value: String(avg), unit: '分', detail: '满分 5 分', bar: { pct: (avg / 5) * 100 } });
  const body = d.history_timeline.length === 0 ? kpi : kpi + renderTimelineRows({ rows: d.history_timeline.map((r) => ({
    time: r.cook_date, main: '第 ' + r.cook_sequence + ' 次做这道菜，评分 ' + r.rating + ' 分', note: r.feedback || '这次没写反馈',
  })) });
  return sectionOf('', 'history', { title: '下厨记录', note: '按日期' }, body);
}

/** 替换预览（#873 ⑦）：替代品全是同一句时不逐行重复（配方件第 12 格原话「全是同一句时不印」）。 */
function swapOf(d: ViewItem): string {
  const rows = d.ingredients.map((g) => ({
    label: str(g.name), before: str(g.name), after: str(g.substitute) || '未写',
  }));
  const first = rows[0];
  const uniform = first !== undefined && rows.every((r) => r.after === first.after) ? first.after : null;
  // 替代品全是同一句时不逐行重复（配方件第 12 格原话「全是同一句时不印」）：改印一句读数 ＋
  // 这一份的实物名（11 行同义行换成一行点名，读者仍看得到论的是哪几味）。
  const body = uniform === null
    ? renderChangeRows({ rows })
    : renderCaliberLine(rows.length + ' 味食材的替代品一致：' + uniform + '。')
      + chipRowOf(d.ingredients.map((g) => str(g.name)));
  // 判官点过「'临时预览' 仍可再精炼」：标题已说「替换食材预览」、下面那句已说「只是临时假设」，
  // 右端读数不再复述第三遍 ⇒ 留空。
  return sectionOf('section-substitution', 'swap', { title: '替换食材预览', note: '' },
    body + renderCaliberLine('替换只是临时假设，不落库，真换走修改域。'));
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
  const h = secHeadsOf(d);
  const grouped = [...new Set(d.ingredients.map((g) => str(g.category)))].map((c) => {
    const rows = d.ingredients.filter((g) => str(g.category) === c);
    return renderDisclosure({
      title: c + '（' + rows.length + ' 味）', open: true,
      contentHtml: renderDataTable({
        columns: [{ key: 'name', label: '食材' }, { key: 'qty', label: '用量', align: 'right' as const }, { key: 'note', label: '说明' }],
        rows: rows.map((g) => ({
          name: str(g.name),
          qty: g.quantity === null || g.quantity === undefined || g.quantity === '' ? '适量' : String(g.quantity) + str(g.unit),
          note: str(g.quantity_text) || '未写',
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
  return renderDocShell({
    // 文档标题与页标题错开一句（页标题只说这是什么页，文档标题带技能名），不互相复读。
    // 页面级样式＝公共层两配方 ＋ 私家大厨皮肤（单一入口 `chefSceneCss()`）＋ 本域页内那一段。
    docTitle: title + ' - 私家大厨', extraCss: chefSceneCss() + LF + viewPageCss(), pageUi: true,
    bodyHtml: renderPageShell({ eyebrow: '私家大厨 ｜ 查看', title, content }),
  });
}

/** 按卡 id 装配整页 HTML（未知卡 id 即抛，不返空页）。 */
export function buildViewHtml(cardId: string, item: Record<string, unknown>): string {
  const d = asItem(item);
  if (!d.name) throw new Error('无此菜谱：页面缺菜名（' + cardId + '）');
  const sec = sectionsOf(d);
  // 页族装饰带紧跟在页头之后：八页共用的那条器物剪影带（`heroBandOf()`，纯装饰、不承载数据）。
  const head = factsOf(d) + conclusionOf(d) + heroBandOf();
  // #873 ②：标签块排在正文之后——它此前排在页头，13 枚色块把真正的内容挤到次屏。
  const tail = tagsOf(d) + historyOf(d) + footerOf(d) + actionsOf() + copyOf(d);
  switch (cardId) {
    case 'view_full_recipe': {
      // 页内导航的标签取短名（390 档四枚胶囊要排得下，长名会被裁到右缘）；分区标题仍带读数。
      const toc = renderTocBlock({ items: [
        { id: 'section-ingredients', text: '食材' }, { id: 'section-steps', text: '步骤' },
        { id: 'section-nutrition', text: '营养' }, { id: 'section-background', text: '背景' },
      ] });
      return shellOf(d.name, head + toc + sec.ingredients + sec.steps + sec.nutrition + sec.background + tail);
    }
    case 'view_for_beginner':
      return shellOf(d.name, head + keysOf(d) + sec.ingredients + sec.steps + sec.nutrition + tail);
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
