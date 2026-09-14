/** #274 · 食品库类页装配（查食品／食品库／去重报告），逐块照老实物重做。
 *
 * 老实物（只读，`D:\2Study\StudyNotes\SKILLS\卡路里\templates\`）：
 *   · `food_search.html` 7913 B —— 卡片格（类别标签／食品名／品牌／四宏量／来源·更新于）＋
 *     搜索框与匹配数＋数据来源行；**老实物零 `<table>`**。
 *   · `dedupe_report.html` 6458 B —— 干净／重复条幅＋三枚 KPI＋重复组表＋处理建议＋数据来源行。
 *
 * 两张页共用一张老实物：老技能把「查食品（按分类）」也接 `food_search.html`（场景登记
 * `html_template: templates/food_search.html`），`scripts/render_food_search.py --category <分类>`
 * 只是换注入数据（`query_label = 分类:<分类>`）；故查食品／食品库两页同走这一张卡片格。
 *
 * 旧装配（#108 的「参数表单＋结果表」）不是老实物形状：本次把查食品／食品库两页换成卡片格，
 * 去重页补上条幅并保留表与处理建议，文案照老实物逐句对齐。
 *
 * 本件不出 `src/diet/`；只做装配与呈现，取数由 `diet/libraryPlate.ts` 备齐。
 * 页内卡片样式落 `FOOD_CSS`（共用样式表由 `shared/docPage.ts` 装配，本票不动它）。
 * 卡片的食品名／品牌／类别／来源走 `escapeHtml`——老实物 `renderCard` 逐字转义，本件同口径。
 */
import { escapeHtml } from 'base-paint';
import { renderDataTable, renderKpiGrid, renderListRows, renderParamForm } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type { DataTableColumn } from 'base-paint/blocks';
import type { DedupeView } from '../render/insightPlate.js';
import type { ProductLibrary, ProductSearch } from './libraryPlate.js';
import type { ProductRow } from './productStore.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** head 标题（各老实物 `<title>` 逐字：查食品／食品库同走 `food_search.html`，去重页走 `dedupe_report.html`）。 */
const DOC_TITLE_SEARCH = '卡路里 · 食物热量查询';
const DOC_TITLE_DEDUPE = '卡路里 · 食品库去重';

/** 老实物「来源」缺失时的显示兜底（`it.source || '未知'`）。 */
const UNKNOWN_SOURCE = '未知';

/** 老实物的缺值破折号（与 `render/dietDocs.ts` 同字面）。 */
const DASH = '—';

/** 食品卡片格样式（局部 CSS；类名只在 `renderFoodGrid` 产出的片段上出现）。 */
const FOOD_CSS = [
  '<style>',
  '.food-grid{display:grid;grid-template-columns:1fr;gap:10px}',
  '.food-card{padding:14px 18px;border:1px solid var(--line);border-radius:12px;background:var(--card)}',
  '.food-card .food-cat{display:inline-block;font-size:11px;font-weight:600;color:var(--blue2);background:var(--soft);border-radius:6px;padding:1px 8px;margin-bottom:6px}',
  '.food-card .food-name{font-weight:600;font-size:15px;color:var(--fg)}',
  '.food-card .food-brand{font-size:12px;color:var(--fg3);margin-bottom:8px}',
  '.food-card .food-macros{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
  '.food-card .food-macro{background:var(--soft);border-radius:8px;padding:6px 8px;text-align:center}',
  '.food-card .food-macro-label{font-size:10px;color:var(--fg3)}',
  '.food-card .food-macro-value{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}',
  '.food-card .food-src{font-size:11px;color:var(--fg3);margin-top:8px}',
  '.food-caption{margin:10px 0 0;font-size:13px;font-weight:600;color:var(--fg2)}',
  '.dedupe-banner{margin:0;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--soft);font-size:13px;font-weight:600;color:var(--fg2)}',
  '.dedupe-h2{margin:16px 0 8px;font-size:15px;font-weight:700;color:var(--fg)}',
  '.dedupe-src{margin:10px 0 0;font-size:12px;color:var(--fg3)}',
  '@media (max-width:640px){.food-card .food-macros{grid-template-columns:repeat(2,1fr)}}',
  '</style>',
].join('\n');

/** 四宏量的取值口径照老实物：热量取整、三大营养素留一位小数，缺值一律破折号（不编数）。 */
function fixed1(n: number | null | undefined): string {
  return n === null || n === undefined ? DASH : n.toFixed(1);
}

function fixed0(n: number | null | undefined): string {
  return n === null || n === undefined ? DASH : n.toFixed(0);
}

/** 老实物把空品牌显示成破折号；空来源显示成「未知」。 */
function text(v: string | null | undefined): string {
  return v === null || v === undefined || v === '' ? DASH : v;
}

/** 一条可见文案行（区块函数只收文本字段，这里同样只交文本，不走受信透传）。 */
function line(cls: string, s: string): string {
  return '<p class="' + cls + '">' + s + '</p>';
}

/** 卡片格（老实物 `food_search.html` 的 `.food-grid`／`.food-card` 一族）。 */
function renderFoodGrid(items: readonly ProductRow[], withUpdatedAt: boolean): string {
  const cards = items.map((it) => {
    const macros = [
      { label: '热量', value: fixed0(it.calories) + ' 卡' },
      { label: '蛋白', value: fixed1(it.protein) + ' g' },
      { label: '脂肪', value: fixed1(it.fat) + ' g' },
      { label: '碳水', value: fixed1(it.carbohydrates) + ' g' },
    ];
    let source = '来源：' + escapeHtml(it.source || UNKNOWN_SOURCE);
    if (withUpdatedAt && it.updated_at) source += ' · 更新于 ' + escapeHtml(it.updated_at);
    const cat = it.category ? '<div class="food-cat">' + escapeHtml(it.category) + '</div>' : '';
    return '<div class="food-card">'
      + cat
      + '<div class="food-name">' + escapeHtml(it.product_name) + '</div>'
      + '<div class="food-brand">' + escapeHtml(text(it.brand)) + '</div>'
      + '<div class="food-macros">' + macros.map((m) =>
        '<div class="food-macro"><div class="food-macro-label">' + m.label + '</div>'
        + '<div class="food-macro-value">' + m.value + '</div></div>').join('') + '</div>'
      + '<div class="food-src">' + source + '</div>'
      + '</div>';
  }).join('');
  return '<div class="food-grid">' + cards + '</div>';
}

/* ── 查食品（food_search.html 对照：搜索框＋匹配数＋卡片格＋来源行） ── */

export function buildSearchDoc(s: ProductSearch): string {
  const parts: string[] = [
    FOOD_CSS,
    renderParamForm({
      fields: [{ name: 'keyword', label: '搜索', value: s.keyword, hint: '输入食物关键词，如 牛肉 / 鸡胸 / 可乐' }],
      description: '食品库按名称／品牌模糊查找（营养值为每 100g；实时搜索归宿主）',
    }),
    renderKpiGrid([{ label: '匹配', value: String(s.total), unit: '条', detail: '关键词：' + s.keyword }]),
    renderFoodGrid(s.items, true),
    line('food-src', '📂 数据源：calorie_data.db · nutrition_products'),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.search',
        data: { items: s.items.map(productCopyRow), total: s.total },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE_SEARCH,
    title: '🍱 食物热量查询',
    eyebrow: 'calorie.view.search · 饮食域',
    subtitle: '查询关键词:' + s.keyword + ' · 匹配 ' + s.total + ' 条',
    content: parts.join(''),
    charts: false,
  });
}

/* ── 食品库（按分类／全量；同一张卡片格，照老实物「按分类也接 food_search.html」） ── */

export function buildLibraryDoc(lib: ProductLibrary, statsTotal: number): string {
  const parts: string[] = [
    FOOD_CSS,
    renderParamForm({
      fields: [{
        name: 'category', label: '分类', value: lib.category ?? '',
        hint: '输入分类，如 主食 / 蛋白类 / 水果（留空＝全量）',
      }],
      description: '按分类浏览食品库（空＝全量；分页与实时筛选归宿主）',
    }),
    renderKpiGrid([{
      label: '本页',
      value: String(lib.total),
      unit: '条',
      detail: (lib.category === null ? '全量' : '分类：' + lib.category) + ' · 库内 ' + statsTotal + ' 条',
    }]),
    renderFoodGrid(lib.items, true),
    '<h3 class="food-caption">' + libraryCaption(lib, statsTotal) + '</h3>',
    line('food-src', '📂 数据源：calorie_data.db · nutrition_products'),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.library',
        data: { items: lib.items.map(productCopyRow), total: lib.total },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE_SEARCH,
    title: '🍱 食物热量查询',
    eyebrow: 'calorie.view.library · 饮食域',
    subtitle: librarySubtitle(lib, statsTotal),
    content: parts.join(''),
    charts: false,
  });
}

/** 副题照老实物 `.sub`（`查询<query_label> · 匹配 N 条`；全量那支报库内总数，本页条数在下行计数里）。 */
function librarySubtitle(lib: ProductLibrary, statsTotal: number): string {
  return lib.category === null
    ? '查询全量 · 匹配 ' + statsTotal + ' 条'
    : '查询分类:' + lib.category + ' · 匹配 ' + lib.total + ' 条';
}

/** 卡片格下面那行计数（老实物结果表的 caption 位）。 */
function libraryCaption(lib: ProductLibrary, statsTotal: number): string {
  const scope = lib.category === null ? '（全量）' : '（' + escapeHtml(lib.category) + '）';
  return '食品库' + scope + '（共 ' + lib.total + ' 条'
    + (statsTotal > lib.total ? '，库内 ' + statsTotal + ' 条' : '') + '）';
}

/** 复制区的行形（保持 #108 起的 list 投影字段：name／brand／cal／pro／fat／carbs／sodium／source）。 */
function productCopyRow(p: ProductRow): Record<string, string | number> {
  return {
    name: p.product_name, brand: p.brand ?? '', cal: p.calories, pro: p.protein,
    fat: p.fat, carbs: p.carbohydrates, sodium: p.sodium, source: p.source ?? '',
  };
}

/* ── 去重报告（dedupe_report.html 对照：条幅＋三 KPI＋重复组表＋处理建议＋来源行） ── */

const DEDUPE_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: '食品名' },
  { key: 'brand', label: '品牌' },
  { key: 'count', label: '条数', align: 'right' },
  { key: 'ids', label: 'ID' },
];

export function buildDedupeDoc(v: DedupeView): string {
  const clean = v.groupCount === 0;
  const parts: string[] = [
    '<h3 class="dedupe-banner">' + (clean
      ? '✅ 食品库无重复，数据干净'
      : '⚠ 发现 ' + v.groupCount + ' 组重复，共 ' + v.rowCount + ' 条冗余记录') + '</h3>',
    renderKpiGrid([
      { label: '重复组', value: String(v.groupCount), unit: '组' },
      { label: '冗余行', value: String(v.rowCount), unit: '条' },
      { label: '库内食品', value: String(v.totalProducts), unit: '条' },
    ]),
    '<h2 class="dedupe-h2">重复组列表</h2>',
    renderDataTable({
      columns: DEDUPE_COLUMNS,
      rows: v.groups.slice(0, 50).map((g) => ({
        name: g.productName, brand: g.brand ?? DASH, count: g.ids.length, ids: g.ids.join(', '),
      })),
      emptyText: '无重复组（库内 ' + v.totalProducts + ' 条均唯一）',
    }),
    renderListRows({
      items: clean
        ? [{ main: '无需处理。' }]
        : [
          { main: '处理建议：保留营养数据最完整的一条，其余可用「下架食品」标废弃（软删，数据保留可溯源）。' },
          { main: '或「改食品」合并数据后下架多余条目。' },
        ],
    }),
    line('dedupe-src', '📊 数据来源：nutrition_products · product_name+brand 分组'),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.dedupe',
        data: {
          items: v.groups.map((g) => ({ productName: g.productName, brand: g.brand, ids: g.ids })),
          total: v.groupCount,
        },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE_DEDUPE,
    title: '📦 食品库去重',
    eyebrow: 'calorie.view.dedupe · 饮食域',
    subtitle: '重复组 ' + v.groupCount + ' 组 · 冗余 ' + v.rowCount + ' 条 · 库内 ' + v.totalProducts + ' 条',
    content: parts.join(''),
    charts: false,
  });
}
