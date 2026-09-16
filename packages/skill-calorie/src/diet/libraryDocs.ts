/** #274 · 食品库类页装配（查食品／食品库／去重报告），逐块照老实物重做，版式照 `t425-融合基准.md`。
 *
 * 老实物（只读，`D:\2Study\StudyNotes\SKILLS\卡路里\templates\`）：
 *   · `food_search.html` 7913 B —— 搜索框＋匹配数＋食品卡网格（类别标签／食品名／品牌／四宏量／
 *     来源·更新于）＋数据来源行；**老实物零 `<table>`**（`t425` §四 裁定 10：本类页面用卡片格，
 *     不许改成表格；P0#74 那条「改成表格」的建议已由 #511 裁掉）。
 *   · `dedupe_report.html` 6458 B —— 干净／重复条幅＋三枚读数＋重复组表＋处理建议＋数据来源行。
 * 两张页共用一张老实物：老技能把「查食品（按分类）」也接 `food_search.html`（场景登记
 * `html_template: templates/food_search.html`），`scripts/render_food_search.py --category <分类>`
 * 只是换注入数据（`query_label = 分类:<分类>`）；故查食品／食品库两页同走这一张卡片格。
 *
 * #274 融合版式（`t425` §五 第 ⑤ 类骨架，逐行落位）：
 *   ① 眉标行（唤醒词 · 饮食 ＋ 类型徽章「食品库」）→ ② 内容标题 → ③ 结论句一行（普通小字，
 *   不走深底块）→ ④ 页内导航（`renderTocBlock`）→ ⑤ 读数卡 → ⑨ 主列表（卡片格／重复组表）→
 *   ⑫ 空态块＋下一句（`shared/emptyGuide.ts`）→ ⑬ 口径说明行（`renderCaliberLine`）→
 *   ⑭ 复制区**双按钮**（`shared/copyArea.ts` 的 `data`＋`log` 同给；日志第 4 段「调用链」
 *   写命令原文含本次参数，段序正本见 `base-render/src/spec/text.ts` 的 `LOG_SECTIONS`）→
 *   ⑮ 来源脚注一行。本类页没有窗口，`shared/sourceLine.ts` 那支要起止日期的口径用不上，
 *   来源脚注同样走公共层的 `renderCaliberLine`（页面本地不造样式、不写色值）。
 *
 * 老实物的可见文案里，凡 P0 文本审查（`.scratch/t155o/text-review-P0.md`）点过、并由 #496／#511
 * 落过的人话版本（如「搜索：鸡胸 · 找到 1 条」「可合并的重复食品」「📂 数据来自本机食品库」），
 * 本件**沿用现文案**、不退回老实物原句——那是两张票已交付的口径，退回等于把审查结论吃掉。
 *
 * 本件不出 `src/diet/`；只做装配与呈现，取数由 `diet/libraryPlate.ts` 备齐。
 * 卡片的食品名／品牌／类别／来源走 `escapeHtml`——老实物 `renderCard` 逐字转义，本件同口径。
 */
import { escapeHtml } from 'base-paint';
import {
  renderCaliberLine, renderDataTable, renderKpiGrid, renderListRows, renderParamForm, renderTocBlock,
} from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { emptyGuide } from '../shared/emptyGuide.js';
import { DB_FILENAME } from '../paths.js';
import { nowStamp } from '../render/receipt.js';
import type { DataTableColumn } from 'base-paint/blocks';
import type { DataTextInput } from 'base-paint';
import type { DedupeView } from '../render/insightPlate.js';
import type { ProductLibrary, ProductSearch } from './libraryPlate.js';
import type { ProductRow } from './productStore.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** head 标题（各老实物 `<title>` 逐字：查食品／食品库同走 `food_search.html`，去重页走 `dedupe_report.html`）。 */
const DOC_TITLE_SEARCH = '卡路里食物热量查询';
const DOC_TITLE_DEDUPE = '卡路里食品库去重';

/** 类型徽章（`t425` §五 第 1 行右槽）：本类三页同属食品库。 */
const BADGE = '食品库';

/** 老实物「来源」缺失时的显示兜底（`it.source || '未知'`）。 */
const UNKNOWN_SOURCE = '未知';

/** 老实物的缺值破折号（与 `render/dietDocs.ts` 同字面）。 */
const DASH = '—';

/** 口径说明行（§五 第 ⑬ 行）：这一页的数是怎么来的、单位是什么（#581 起一条一行）。 */
const CALIBER_FOOD = ['营养值都是每 100 克。', '只列没有下架的食品。'];
/** 去重页的口径行照老实物 `.footer .src`（「名称和品牌都一样的算重复」）＋下架口径（同上一条一行）。 */
const CALIBER_DEDUPE = ['判定标准：名称和品牌都一样的算重复。', '已下架的食品不算，也不会出现在这张表里。'];

/** 数据来源脚注（§五 第 ⑮ 行）：库名 ＋ 在架条数（老实物 `.footer .src` 的库名 · 表名在 #496 已换人话）。 */
function sourceNote(count: number): string {
  return '📊 数据来源：本机食品库 · 在架食品共 ' + count + ' 条';
}

/** 复制日志第 3 段后半（数据结构）：本类三页的取数面同一处。 */
const LOG_SOURCE = DB_FILENAME + ' ｜ 食品库（在架食品）';

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
  '@media (max-width:640px){.food-card .food-macros{grid-template-columns:repeat(2,1fr)}}',
  '</style>',
].join('\n');

/** 去重页两件局部样式（条幅＋小节标题；老实物 `dedupe_report.html` 的 `.banner`／`.section h2`）。 */
const DEDUPE_CSS = [
  '<style>',
  '.dedupe-banner{margin:0;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--soft);font-size:13px;font-weight:600;color:var(--fg2)}',
  '.dedupe-h2{margin:0 0 8px;font-size:15px;font-weight:700;color:var(--fg)}',
  '</style>',
].join('\n');

/** 四宏量的取值口径照老实物：热量取整、三大营养素留一位小数，缺值一律破折号（不编数）。 */
function fixed1(n: number | null | undefined): string {
  return n === null || n === undefined ? DASH : n.toFixed(1);
}

function fixed0(n: number | null | undefined): string {
  return n === null || n === undefined ? DASH : n.toFixed(0);
}

/** 卡片格（老实物 `food_search.html` 的 `.food-grid`／`.food-card` 一族）。
 *  零条这一支**不是死代码**：库里非空、只是本次查询零命中时取数层返空盘，装配层走这里出空态
 *  （老实物 `:98-101` 对 `items.length === 0` 出的就是 `emptyState`）。 */
function renderFoodGrid(items: readonly ProductRow[], withUpdatedAt: boolean): string {
  if (items.length === 0) {
    return emptyGuide({
      icon: '🔍',
      text: '没有找到匹配的食品',
      hint: '换个关键词或分类试试。库里还没有的话，说「存食品」就能加进第一条。',
    });
  }
  const cards = items.map((it) => {
    const macros = [
      { label: '热量', value: fixed0(it.calories) + ' 卡' },
      { label: '蛋白', value: fixed1(it.protein) + ' 克' },
      { label: '脂肪', value: fixed1(it.fat) + ' 克' },
      { label: '碳水', value: fixed1(it.carbohydrates) + ' 克' },
    ];
    /* #581 · 来源行去间隔号：一行一键值（来源一行、更新于另起一行）。 */
    let source = '<div class="food-src">来源：' + escapeHtml(it.source || UNKNOWN_SOURCE) + '</div>';
    if (withUpdatedAt && it.updated_at) {
      source += '<div class="food-src">更新于 ' + escapeHtml(it.updated_at) + '</div>';
    }
    const cat = it.category ? '<div class="food-cat">' + escapeHtml(it.category) + '</div>' : '';
    /* #511 · 品牌没填时原样印一个破折号占位，读者在食品名与四个宏量之间单读到一行「—」，
       不知道那是哪一格（审查件第 74 条：「—」夹在中间）⇒ 这一格没有值就不出这一行
       （#496 起来源那一格已经是「没填来源的归到「未知」」，不再用破折号）。 */
    const brandText = it.brand ?? '';
    const brand = brandText === '' ? '' : '<div class="food-brand">' + escapeHtml(brandText) + '</div>';
    return '<div class="food-card">'
      + cat
      + '<div class="food-name">' + escapeHtml(it.product_name) + '</div>'
      + brand
      + '<div class="food-macros">' + macros.map((m) =>
        '<div class="food-macro"><div class="food-macro-label">' + m.label + '</div>'
        + '<div class="food-macro-value">' + m.value + '</div></div>').join('') + '</div>'
      + source
      + '</div>';
  }).join('');
  return '<div class="food-grid">' + cards + '</div>';
}

/** 页内一张卡（`id` 即页内导航的锚点，导航项按同一份清单生成）。 */
interface Card { readonly id: string; readonly label: string; readonly html: string }

function shell(card: Card): string {
  return '<section id="' + card.id + '">' + card.html + '</section>';
}

/** 页尾三件（§五 第 ⑭⑮ 行 ＋ 末尾口径行）：复制区恒双按钮、日志第 4 段是命令原文、来源脚注一行。
 *  三页共用这一处出口，免得每页各抄一遍复制区与脚注。 */
function finishPage(o: {
  readonly command: string;
  readonly envelope: DataTextInput['envelope'];
  readonly caliber: readonly string[];
  readonly sourceCount: number;
}): string {
  return [
    ...o.caliber.map((line) => renderCaliberLine(line)),
    copyArea({
      data: { envelope: o.envelope },
      log: {
        envelope: o.envelope,
        copyLog: copyLog({
          command: o.command, source: LOG_SOURCE, actionAt: nowStamp(), version: DOC_VERSION,
        }),
      },
    }),
    renderCaliberLine(sourceNote(o.sourceCount)),
  ].join('');
}

/** 一页的正文＝本页局部样式 ＋ 页内导航（§五 第 ④ 行）＋逐卡（⑤⑨⑫）＋页尾三件（⑬⑭⑮）。
 *  `sourceCount` 由调用方给：去重页的复制投影里 `total` 是**重复组数**，不是库内在架条数，
 *  脚注报的条数不能从 envelope 反推。 */
function body(o: {
  readonly css: string;
  readonly cards: readonly Card[];
  readonly command: string;
  readonly envelope: DataTextInput['envelope'];
  readonly caliber: readonly string[];
  readonly sourceCount: number;
}): string {
  return [
    o.css,
    renderTocBlock({ items: o.cards.map((c) => ({ id: c.id, text: c.label })) }),
    o.cards.map(shell).join(''),
    finishPage(o),
  ].join('');
}

/* ── 查食品（food_search.html 对照：搜索框＋匹配数＋卡片格＋来源行） ── */

/** `params` 是本次真出口收到的参数（用来拼日志第 4 段的命令原文）。 */
export function buildSearchDoc(s: ProductSearch, command: string): string {
  const cards: Card[] = [
    {
      id: 'sec-query',
      label: '搜索',
      html: renderParamForm({
        fields: [{ name: 'keyword', label: '关键词', value: s.keyword, hint: '输入食物关键词，如鸡胸' }],
        description: '按名称或品牌模糊查找',
      }),
    },
    {
      id: 'sec-count',
      label: '匹配',
      /* 这一格的副行写成「搜索：<词>」——同一信息换个槽位承载：`test/diet-homogeneity-108.test.mjs`
         把 #496 那版副标题「搜索：鸡胸 · 找到 1 条」里的 `搜索：鸡胸` 逐字钉住了，而那条引脚在别人
         的测试件里（`t425` 裁定 11：不越界改人家的引脚，改用别的槽位）。结论句仍按裁定 2 出在标题下。 */
      html: renderKpiGrid([{ label: '匹配', value: String(s.total), unit: '条', detail: '搜索：' + s.keyword }]),
    },
    { id: 'sec-list', label: '食品卡片', html: renderFoodGrid(s.items, true) },
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE_SEARCH,
    title: '🍱 食物热量查询',
    pageUi: true,
    eyebrow: '',
    subtitle: null,
    metaLeft: '查食品',
    badge: BADGE,
    summary: '在食品库里搜「' + s.keyword + '」，找到 ' + s.total + ' 条。',
    content: body({
      css: FOOD_CSS,
      cards,
      command,
      caliber: CALIBER_FOOD,
      /* 页脚报的是**库内在架条数**（`s.libraryTotal`），不是本次命中数：这一格写明「在架食品共 N 条」，
         N 若取命中数，搜「鸡胸」会印成「在架食品共 1 条」（库里其实 5 条），本次零命中那一页更会印成
         「在架食品共 0 条」——两处都不是库里真有那么多。 */
      sourceCount: s.libraryTotal,
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.search',
        data: { items: s.items.map(productCopyRow), total: s.total },
      },
    }),
    charts: false,
  });
}

/* ── 食品库（按分类／全量；同一张卡片格，照老实物「按分类也接 food_search.html」） ── */

export function buildLibraryDoc(lib: ProductLibrary, statsTotal: number, command: string): string {
  const byCategory = lib.category !== null;
  const cards: Card[] = [
    {
      id: 'sec-query',
      label: '分类',
      /* 这一页的参数是**分类名**（取数走 `listProductsByCategory` 的等值匹配），提示照实写：
         #511 那一版写「输入名称或品牌」，与本命令的取数口径不符，本次改回分类口径。 */
      html: renderParamForm({
        fields: [{
          name: 'category', label: '分类', value: lib.category ?? '',
          hint: '输入分类名，如主食（留空＝看全部）',
        }],
        description: byCategory ? '只看这个分类的食品' : '列出库里全部在架食品，按名称排序',
      }),
    },
    {
      id: 'sec-count',
      label: '本页条数',
      html: renderKpiGrid([{
        label: byCategory ? '这个分类' : '本页',
        value: String(lib.total),
        unit: '条',
        detail: (byCategory ? '分类：' + lib.category : '全部食品') + '。库内共 ' + statsTotal + ' 条。',
      }]),
    },
    { id: 'sec-list', label: '食品卡片', html: renderFoodGrid(lib.items, true) },
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE_SEARCH,
    title: '🍱 食物热量查询',
    pageUi: true,
    eyebrow: '',
    subtitle: null,
    metaLeft: '查食品库',
    badge: BADGE,
    summary: librarySummary(lib, statsTotal),
    content: body({
      css: FOOD_CSS,
      cards,
      command,
      caliber: CALIBER_FOOD,
      sourceCount: statsTotal,
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.library',
        data: { items: lib.items.map(productCopyRow), total: lib.total },
      },
    }),
    charts: false,
  });
}

/** 结论句（§五 第 ③ 行，句内含本页读数）：全量那支报库内总数，按分类那支报本分类与库内总数。 */
function librarySummary(lib: ProductLibrary, statsTotal: number): string {
  const head = lib.category === null
    ? '食品库共 ' + statsTotal + ' 条在架食品'
    : '分类「' + lib.category + '」下有 ' + lib.total + ' 条';
  const tail = lib.category === null ? '，下面是全部。' : '（库内共 ' + statsTotal + ' 条）。';
  return head + tail;
}

/** 复制区的行形（保持 #108 起的 list 投影字段：name／brand／cal／pro／fat／carbs／sodium／source）。 */
function productCopyRow(p: ProductRow): Record<string, string | number> {
  return {
    name: p.product_name, brand: p.brand ?? '', cal: p.calories, pro: p.protein,
    fat: p.fat, carbs: p.carbohydrates, sodium: p.sodium, source: p.source ?? '',
  };
}

/* ── 去重报告（dedupe_report.html 对照：条幅＋三读数＋重复组表＋处理建议＋来源行） ── */

/** #496 · 列名与文案改人话（审查件第 6、7、8 条）：「冗余」「重复组」都是内部词。
 *  表头 `记录编号` 是**记录号**（读者要拿它去下架／改食品，所以留着可核对）。 */
const DEDUPE_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: '食品名' },
  { key: 'brand', label: '品牌' },
  { key: 'count', label: '条数', align: 'right' },
  { key: 'ids', label: '记录编号' },
];

export function buildDedupeDoc(v: DedupeView, command: string): string {
  const clean = v.groupCount === 0;
  const cards: Card[] = [
    /* 老实物的条幅（`dedupe_report.html:64-70`／`:98-104` 的 banner.ok／banner.warn）：
       结论句已按裁定 2 紧跟标题，这条幅仍照老实物留在正文第一块（形状属 §一 第 ⑤ 类用途列）。 */
    {
      id: 'sec-banner',
      label: '结论',
      html: '<h3 class="dedupe-banner">' + (clean
        ? '✅ 食品库无重复，数据干净'
        : '⚠ 发现 ' + v.groupCount + ' 组重复，共 ' + v.rowCount + ' 条可合并的重复食品') + '</h3>',
    },
    {
      id: 'sec-count',
      label: '读数',
      html: renderKpiGrid([
        { label: '重复组', value: String(v.groupCount), unit: '组' },
        { label: '可合并的重复食品', value: String(v.rowCount), unit: '条' },
        { label: '库内食品', value: String(v.totalProducts), unit: '条' },
      ]),
    },
    {
      id: 'sec-groups',
      label: '重复组',
      html: '<h2 class="dedupe-h2">重复组列表</h2>' + renderDataTable({
        columns: DEDUPE_COLUMNS,
        rows: v.groups.slice(0, 50).map((g) => ({
          name: g.productName, brand: g.brand ?? DASH, count: g.ids.length, ids: g.ids.join(', '),
        })),
        emptyText: '没有重复食品（库内 ' + v.totalProducts + ' 条都只出现一次）',
      }),
    },
    {
      id: 'sec-advice',
      label: '处理建议',
      html: '<h2 class="dedupe-h2">处理建议</h2>' + renderListRows({
        items: clean
          ? [{ main: '无需处理。' }]
          : [
            { main: '保留营养数据最完整的一条，其余可用「下架食品」下架（数据保留可溯源）。' },
            { main: '或「改食品」合并数据后下架多余条目。' },
          ],
      }),
    },
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE_DEDUPE,
    title: '📦 食品库去重',
    pageUi: true,
    eyebrow: '',
    subtitle: null,
    metaLeft: '看食品库（去重）',
    badge: BADGE,
    summary: dedupeSummary(v),
    content: body({
      css: DEDUPE_CSS,
      cards,
      command,
      caliber: CALIBER_DEDUPE,
      sourceCount: v.totalProducts,
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.dedupe',
        data: {
          items: v.groups.map((g) => ({ productName: g.productName, brand: g.brand, ids: g.ids })),
          total: v.groupCount,
        },
      },
    }),
    charts: false,
  });
}

/** 结论句（§五 第 ③ 行）：两态各报本页读数（重复组数／可合并条数／库内条数）。 */
function dedupeSummary(v: DedupeView): string {
  if (v.groupCount === 0) return '食品库 ' + v.totalProducts + ' 条没有同名同品牌的重复，可以直接用。';
  return '食品库 ' + v.totalProducts + ' 条里有 ' + v.groupCount + ' 组重复，'
    + v.rowCount + ' 条可以合并后再用。';
}
