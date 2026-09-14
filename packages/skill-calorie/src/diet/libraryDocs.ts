/** #393 · 食品库类页装配（查食品／食品库／去重报告）。
 *
 * 原地搬自 `src/render/dietDocs.ts`：本票只换住处，函数体与注释原样照抄，产物逐字节不变。
 * 服务页面类：⑤ 食品库类页。
 */
import { renderDataTable, renderDisclosure, renderKpiGrid, renderListRows, renderParamForm } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type { DataTableColumn } from 'base-paint/blocks';
import type { DedupeView } from '../render/insightPlate.js';
import type { ProductLibrary, ProductSearch } from './libraryPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·饮食';

/* ── 查食品／食品库（food_search／food_library 对照：参数表单＋结果表＋复制） ── */

const PRODUCT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: '食品名' },
  { key: 'brand', label: '品牌' },
  { key: 'cal', label: '热量', align: 'right' },
  { key: 'pro', label: '蛋白', align: 'right' },
  { key: 'fat', label: '脂肪', align: 'right' },
  { key: 'carbs', label: '碳水', align: 'right' },
  { key: 'sodium', label: '钠', align: 'right' },
  { key: 'source', label: '来源' },
];

export function buildSearchDoc(s: ProductSearch): string {
  const rows = s.items.map((p) => ({
    name: p.product_name, brand: p.brand ?? '', cal: p.calories, pro: p.protein,
    fat: p.fat, carbs: p.carbohydrates, sodium: p.sodium, source: p.source ?? '',
  }));
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'keyword', label: '关键词', value: s.keyword }],
      description: '食品库按名称/品牌模糊查找（营养值为每 100g；实时搜索归宿主）',
    }),
    renderKpiGrid([{ label: '关键词', value: s.keyword, detail: '命中 ' + s.total + ' 条' }]),
    renderDataTable({
      columns: [...PRODUCT_COLUMNS],
      rows,
      caption: '查食品 ' + s.keyword + '（共 ' + s.total + ' 条）',
      emptyText: '无命中',
    }),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.search',
        data: { items: rows, total: s.total },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '查食品 ' + s.keyword,
    eyebrow: 'calorie.view.search · 饮食域',
    subtitle: null,
    content: parts.join(''),
    charts: false,
  });
}

export function buildLibraryDoc(lib: ProductLibrary, statsTotal: number): string {
  const rows = lib.items.map((p) => ({
    name: p.product_name, brand: p.brand ?? '', cal: p.calories, pro: p.protein,
    fat: p.fat, carbs: p.carbohydrates, sodium: p.sodium, source: p.source ?? '',
  }));
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'category', label: '分类', value: lib.category ?? '' }],
      description: '按分类浏览食品库（空=全量；分页与实时筛选归宿主）',
    }),
    renderKpiGrid([
      { label: '食品库', value: lib.category ?? '全量', detail: '本页 ' + lib.total + ' 条 / 库 ' + statsTotal + ' 条' },
    ]),
    renderDataTable({
      columns: [...PRODUCT_COLUMNS],
      rows,
      caption: '食品库' + (lib.category ? '（' + lib.category + '）' : '（全量）') + '（共 ' + lib.total + ' 条）',
      emptyText: '该分类空库',
    }),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.library',
        data: { items: rows, total: lib.total },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '食品库' + (lib.category ? '（' + lib.category + '）' : ''),
    eyebrow: 'calorie.view.library · 饮食域',
    subtitle: null,
    content: parts.join(''),
    charts: false,
  });
}

/* ── 去重报告（dedupe_report.html 对照：KPI＋重复组表＋处理建议） ── */

export function buildDedupeDoc(v: DedupeView): string {
  const parts: string[] = [renderKpiGrid([
    { label: '重复组', value: String(v.groupCount), unit: '组' },
    { label: '冗余条', value: String(v.rowCount), unit: '条' },
    { label: '库内食品', value: String(v.totalProducts), unit: '条' },
  ])];
  parts.push(renderDataTable({
    columns: [
      { key: 'name', label: '食品名' },
      { key: 'brand', label: '品牌' },
      { key: 'count', label: '条数', align: 'right' },
      { key: 'ids', label: 'ID' },
    ],
    rows: v.groups.slice(0, 50).map((g) => ({
      name: g.productName, brand: g.brand ?? '', count: g.ids.length, ids: g.ids.join(','),
    })),
    caption: '重复组列表（共 ' + v.groupCount + ' 组' + (v.groups.length > 50 ? '，仅列前 50 组' : '') + '）',
    emptyText: '无重复组（库内 ' + v.totalProducts + ' 条均唯一）',
  }));
  parts.push(renderDisclosure({
    title: '处理建议',
    contentHtml: renderListRows({
      items: v.groupCount === 0
        ? [{ main: '库内无重复，无需处理' }]
        : [
          { main: '每组合并保留一条（取数据最全者）', right: '共 ' + v.groupCount + ' 组' },
          { main: '其余条目下架（deprecate），查询/搜索/导入去重不再出现' },
        ],
    }),
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.dedupe',
      data: {
        items: v.groups.map((g) => ({ productName: g.productName, brand: g.brand, ids: g.ids })),
        total: v.groupCount,
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '去重报告',
    eyebrow: 'calorie.view.dedupe · 饮食域',
    subtitle: '数据来源：nutrition_products',
    content: parts.join(''),
    charts: false,
  });
}
