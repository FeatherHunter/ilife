/** base-paint/blocks：#104 B1 区块组件整合（12 区块，接口 owner）。
 *
 * 地位（契约 `docs/base-paint-contract.md` §4.1／§4.4 #104 行）：
 *  - 区块级 = 页面级组合：**组合**冻结控件（`renderEmptyState`／`renderActionBar`／
 *    `renderToast`／`renderErrorReceipt`／`renderStatusBadge`／`charts.*`），**不得**
 *    重定义控件签名、不得复制控件实现、不得改 `CONTROL_*`／`STATUS_*`／`COPY_*` 常量；
 *  - **防火墙**：本模块**不在** `src/spec/`、**不进** `SPEC_FROZEN_SURFACE`、
 *    **不从** `src/index.ts` 导出（签名测试把 `dist/index.js` 出口与冻结清单绑死，
 *    区块接口是可演进的组合层，不是冻结签名）。消费方走子路径 `base-paint/blocks`；
 *  - 清单裁定（DB-1）：12 区块取 `docs/visual-spec-blocks.md` §1 拟定清单为终版，
 *    只做命名统一（英文键），锚点语义不变；
 *  - 样式闭集裁定（DB-2）：新增 `BLOCK_STYLE_SECTIONS` 12 区闭集（**不改**
 *    `CONTROL_STYLE_SECTIONS`）；区块 CSS 由本模块唯一产出者 `blocksCss()` 产出，
 *    只读冻结 token（`CSS_VAR_TOKENS`）＋ 局部 CSS 常量（圆角 `{8,14,20,999}`、
 *    `--line` 派生软线），**不新增 token 名**（D-5／DB-5）。
 *
 * 三条硬边界（违反即红）：
 *  1. **静态呈现 ＋ 复制**（§4.1）：12 个函数全是纯函数产 HTML 字符串；B-08 只产原生
 *     `<details>/<summary>`，B-09 只产静态 `label＋input`（实时预览／空值拦截的
 *     **行为**归宿主＝插件 client，B7；本模块只给宿主留 `data-*` 约定）；
 *  2. **禁交互控件名**（B7）：`formPrompt`／`selectList`／`smartSelect`／`confirm`／
 *     `foldBox` 不得出现为导出（含大小写变体）；
 *  3. **模块代码零 DOM**（AC-7）：本文件编译进 `dist/blocks.js` 的**代码**里不出现
 *     `document.`／`window.`／`navigator.`（与 #76 同口径，`test/blocks.test.mjs` 钉死）。
 *
 * 受信透传口径（与 `renderEmptyState` 的 `actionHtml` 同口径）：`contentHtml`／
 * `previewText` 等「已由区块函数自产的 HTML」**不转义**（调用方不得塞入未转义的用户串；
 * 用户串一律走各函数的文本字段，本模块用冻结五字符表转义）；
 * `actionHtml`（B-10）沿用冻结语义（调用方负责内容安全）。
 */

import { charts } from './charts.js';
import { renderActionBar, renderEmptyState, renderErrorReceipt, renderStatusBadge, renderToast } from './controls.js';
import { BODY_FONT_STACK } from './font.js';
import {
  ACTION_BAR_DEFAULTS,
  ACTION_ID_ATTR,
  CHART_KINDS,
  COPY_ACTION_IDS,
  CSS_VAR_TOKENS,
  DEFAULT_DATA_ATTR,
  ESCAPE_HTML_CHARS,
  ESCAPE_HTML_ENTITIES,
  SCENE_STATUS,
  STATUS_KINDS,
  STYLE_FORBIDDEN_TOKENS,
  TOAST_DEFAULTS,
} from './spec/index.js';
import { STYLE_PREFIX } from './style.js';
import type {
  ActionBarInput,
  ChartKind,
  CopyButtonInput,
  EmptyStateInput,
  ErrorReceiptInput,
  EscapeHtmlChar,
  Scene,
  SceneTypeBadge,
  StatusKind,
  ToastInput,
} from './spec/index.js';
import type {
  BarChartInput,
  ComboChartInput,
  DonutChartInput,
  GaugeChartInput,
  LineChartInput,
  ProgressChartInput,
  ScatterChartInput,
  SparklineChartInput,
} from './spec/charts.js';

/* ── 错误形态（与 TemplateError／ControlsError 同口径：抛、不返空；调用方按 name／code 判定） ── */

/** 区块层错误。code 恒为 `bad-input`（输入缺失／非法一律抛，缺失阻断不返空）。 */
export class BlocksError extends Error {
  readonly code: 'bad-input';

  constructor(message: string) {
    super(message);
    this.name = 'BlocksError';
    this.code = 'bad-input';
  }
}

function badInput(message: string): never {
  throw new BlocksError(message);
}

/* ── 转义（AC-14：唯一口径 = 冻结的 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES`，与 controls.ts 同构） ── */

const ESCAPE_RE = new RegExp('[' + ESCAPE_HTML_CHARS.join('') + ']', 'g');

function esc(value: string): string {
  return value.replace(ESCAPE_RE, (ch) => ESCAPE_HTML_ENTITIES[ch as EscapeHtmlChar] ?? ch);
}

/* ── 入参校验小件 ── */

function assertPlainObject(value: unknown, field: string): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) badInput(field + ' 必须是对象');
}

function assertNoInlineHandler(value: object, field: string): void {
  for (const key of Object.keys(value)) {
    if (/^on/i.test(key)) badInput(field + ' 不得含内联事件处理器字段：' + key);
  }
}

function reqText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') badInput(field + ' 必须是非空字符串');
  return value;
}

function optText(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/* ── 区块样式区闭集（DB-2：新增闭集，不改 CONTROL_STYLE_SECTIONS） ── */

/** 12 区块样式区（DB-1 清单的代码落点；顺序即 B-01…B-12）。 */
export const BLOCK_STYLE_SECTIONS = [
  'pageShell',
  'kpiCard',
  'dataTable',
  'chartBlock',
  'listRows',
  'preBlock',
  'detailSection',
  'disclosure',
  'paramForm',
  'emptyBlock',
  'copyBlock',
  'feedbackBlock',
] as const;

export type BlockStyleSection = (typeof BLOCK_STYLE_SECTIONS)[number];

/** 区名 → kebab（`kpiCard` → `kpi-card`），只用于类名与 CSS 注释头。 */
function sectionSlug(section: BlockStyleSection): string {
  return section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

/** 区块根类：`ilife-block ilife-block-<slug>`（与控件类的 `ilife-<区>` 拼写不撞）。 */
function blockRoot(section: BlockStyleSection): string {
  return STYLE_PREFIX + 'block ' + STYLE_PREFIX + 'block-' + sectionSlug(section);
}

/** 区块子件类：`ilife-block-<slug>-<part>`。 */
function blockPart(section: BlockStyleSection, part: string): string {
  return STYLE_PREFIX + 'block-' + sectionSlug(section) + '-' + part;
}

/* ══════════════════════════════════════════════════════════════
 * B-01 共享页面模板／标题区
 * ══════════════════════════════════════════════════════════════ */

export interface PageShellInput {
  readonly title: string;
  readonly subtitle?: string;
  readonly eyebrow?: string;
  /** 已组合好的区块 HTML（受信透传，不转义）。 */
  readonly content: string;
}

/** B-01：单页容器＋标题三件套（eyebrow／title／subtitle）＋正文。 */
export function renderPageShell(input: PageShellInput): string {
  assertPlainObject(input, 'renderPageShell: input');
  assertNoInlineHandler(input, 'renderPageShell: input');
  const shell = input as PageShellInput;
  const title = reqText(shell.title, 'renderPageShell: input.title');
  if (typeof shell.content !== 'string') badInput('renderPageShell: input.content 必须是字符串');
  const parts: string[] = ['<section class="' + blockRoot('pageShell') + '">'];
  const eyebrow = optText(shell.eyebrow);
  if (eyebrow !== undefined) parts.push('<p class="' + blockPart('pageShell', 'eyebrow') + '">' + esc(eyebrow) + '</p>');
  parts.push('<h1 class="' + blockPart('pageShell', 'title') + '">' + esc(title) + '</h1>');
  const subtitle = optText(shell.subtitle);
  if (subtitle !== undefined) parts.push('<p class="' + blockPart('pageShell', 'subtitle') + '">' + esc(subtitle) + '</p>');
  parts.push('<div class="' + blockPart('pageShell', 'body') + '">' + shell.content + '</div>');
  parts.push('</section>');
  return parts.join('');
}

/* ══════════════════════════════════════════════════════════════
 * B-02 KPI 卡（四槽 label／value／unit／detail ＋ STATUS_KINDS 徽章）
 * ══════════════════════════════════════════════════════════════ */

export interface KpiCardInput {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly detail?: string;
  readonly status?: StatusKind;
  readonly statusText?: string;
}

/** B-02：单张 KPI 卡（value 带 `tnum`；非法 status 由冻结语义降级 `empty`）。 */
export function renderKpiCard(input: KpiCardInput): string {
  assertPlainObject(input, 'renderKpiCard: input');
  assertNoInlineHandler(input, 'renderKpiCard: input');
  const card = input as KpiCardInput;
  const label = reqText(card.label, 'renderKpiCard: input.label');
  const value = reqText(card.value, 'renderKpiCard: input.value');
  const parts: string[] = ['<div class="' + blockRoot('kpiCard') + '">'];
  parts.push('<div class="' + blockPart('kpiCard', 'label') + '">' + esc(label) + '</div>');
  parts.push('<div class="' + blockPart('kpiCard', 'value-row') + '">'
    + '<span class="' + blockPart('kpiCard', 'value') + '">' + esc(value) + '</span>');
  const unit = optText(card.unit);
  if (unit !== undefined) parts.push('<span class="' + blockPart('kpiCard', 'unit') + '">' + esc(unit) + '</span>');
  parts.push('</div>');
  const detail = optText(card.detail);
  if (detail !== undefined) parts.push('<div class="' + blockPart('kpiCard', 'detail') + '">' + esc(detail) + '</div>');
  if (card.status !== undefined) {
    const status: StatusKind = (STATUS_KINDS as readonly string[]).includes(card.status) ? card.status : 'empty';
    const badge = renderStatusBadge(
      card.statusText === undefined ? { status } : { status, text: card.statusText },
    );
    parts.push('<div class="' + blockPart('kpiCard', 'badge') + '">' + badge + '</div>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** B-02 伴生布局：KPI 卡网格（不是第 13 个区块，无独立样式区，用 `kpiCard` 区）。 */
export function renderKpiGrid(cards: readonly KpiCardInput[]): string {
  if (!Array.isArray(cards) || cards.length === 0) badInput('renderKpiGrid: cards 必须是非空数组');
  return '<div class="' + blockPart('kpiCard', 'grid') + '">'
    + cards.map((card) => renderKpiCard(card)).join('') + '</div>';
}

/* ══════════════════════════════════════════════════════════════
 * B-03 表格（强制语义标签；空数据走 B-10）
 * ══════════════════════════════════════════════════════════════ */

export type DataTableAlign = 'left' | 'center' | 'right';

export interface DataTableColumn {
  readonly key: string;
  readonly label: string;
  readonly align?: DataTableAlign;
}

export interface DataTableInput {
  readonly columns: readonly DataTableColumn[];
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly caption?: string;
  readonly emptyText?: string;
}

const TABLE_ALIGNS: readonly string[] = ['left', 'center', 'right'];

function cellText(value: unknown, field: string): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return esc(String(value));
  }
  badInput(field + ' 只许 string／number／boolean／bigint／null／undefined');
}

/** B-03：语义表格（`table／thead／th／td`；零行 → `renderEmptyState`，不渲染空表）。 */
export function renderDataTable(input: DataTableInput): string {
  assertPlainObject(input, 'renderDataTable: input');
  assertNoInlineHandler(input, 'renderDataTable: input');
  const table = input as DataTableInput;
  if (!Array.isArray(table.columns) || table.columns.length === 0) {
    badInput('renderDataTable: input.columns 必须是非空数组');
  }
  if (!Array.isArray(table.rows)) badInput('renderDataTable: input.rows 必须是数组');
  const columns = table.columns.map((column, i) => {
    const field = 'renderDataTable: input.columns[' + i + ']';
    assertPlainObject(column, field);
    const key = reqText((column as DataTableColumn).key, field + '.key');
    const label = reqText((column as DataTableColumn).label, field + '.label');
    const align = (column as DataTableColumn).align ?? 'left';
    if (!TABLE_ALIGNS.includes(align)) badInput(field + '.align 必须是 left／center／right');
    return { key, label, align: align as DataTableAlign };
  });
  if (table.rows.length === 0) {
    const text = optText(table.emptyText) ?? '无数据';
    return '<div class="' + blockRoot('dataTable') + '">' + renderEmptyState({ text }) + '</div>';
  }
  const head = '<thead><tr>' + columns.map((column) =>
    '<th scope="col" class="' + blockPart('dataTable', 'cell-' + column.align) + '">' + esc(column.label) + '</th>',
  ).join('') + '</tr></thead>';
  const body = '<tbody>' + table.rows.map((row, ri) => {
    assertPlainObject(row, 'renderDataTable: input.rows[' + ri + ']');
    return '<tr>' + columns.map((column) =>
      '<td class="' + blockPart('dataTable', 'cell-' + column.align) + '">'
      + cellText((row as Readonly<Record<string, unknown>>)[column.key], 'renderDataTable: input.rows[' + ri + '].' + column.key)
      + '</td>',
    ).join('') + '</tr>';
  }).join('') + '</tbody>';
  const caption = optText(table.caption);
  return '<div class="' + blockRoot('dataTable') + '"><table class="' + blockPart('dataTable', 'table') + '">'
    + (caption === undefined ? '' : '<caption class="' + blockPart('dataTable', 'caption') + '">' + esc(caption) + '</caption>')
    + head + body + '</table></div>';
}

/* ══════════════════════════════════════════════════════════════
 * B-04 图表（kind 分发 → charts.*；空／结构违规语义恒取冻结规则）
 * ══════════════════════════════════════════════════════════════ */

export type ChartBlockChartInput =
  | BarChartInput | LineChartInput | DonutChartInput | ProgressChartInput
  | ComboChartInput | SparklineChartInput | GaugeChartInput | ScatterChartInput;

export interface ChartBlockInput {
  readonly kind: ChartKind;
  readonly input: ChartBlockChartInput;
  readonly title?: string;
}

/** B-04：图表区块（分发给冻结 `charts` 8 接口；空数组走空态／结构违规抛错恒为冻结语义）。 */
export function renderChartBlock(input: ChartBlockInput): string {
  assertPlainObject(input, 'renderChartBlock: input');
  assertNoInlineHandler(input, 'renderChartBlock: input');
  const block = input as ChartBlockInput;
  if (!(CHART_KINDS as readonly string[]).includes(block.kind)) {
    badInput('renderChartBlock: input.kind 必须是 ' + CHART_KINDS.join('／'));
  }
  if (block.input === null || typeof block.input !== 'object') badInput('renderChartBlock: input.input 必须是对象');
  const chartHtml = (() => {
    switch (block.kind) {
      case 'bar': return charts.bar(block.input as BarChartInput).html;
      case 'line': return charts.line(block.input as LineChartInput).html;
      case 'donut': return charts.donut(block.input as DonutChartInput).html;
      case 'progress': return charts.progress(block.input as ProgressChartInput).html;
      case 'combo': return charts.combo(block.input as ComboChartInput).html;
      case 'sparkline': return charts.sparkline(block.input as SparklineChartInput).html;
      case 'gauge': return charts.gauge(block.input as GaugeChartInput).html;
      case 'scatter': return charts.scatter(block.input as ScatterChartInput).html;
      default: return badInput('renderChartBlock: input.kind 未覆盖（防御，正常不可达）');
    }
  })();
  const title = optText(block.title);
  return '<section class="' + blockRoot('chartBlock') + '">'
    + (title === undefined ? '' : '<h2 class="' + blockPart('chartBlock', 'title') + '">' + esc(title) + '</h2>')
    + '<div class="' + blockPart('chartBlock', 'canvas') + '">' + chartHtml + '</div>'
    + '</section>';
}

/* ══════════════════════════════════════════════════════════════
 * B-05 列表（左／中／右三槽；完成态删除线；空列表走 B-10）
 * ══════════════════════════════════════════════════════════════ */

export interface ListRowInput {
  readonly left?: string;
  readonly main: string;
  readonly right?: string;
  readonly done?: boolean;
}

export interface ListRowsInput {
  readonly items: readonly ListRowInput[];
  readonly emptyText?: string;
}

/** B-05：行列表（首行无边框；`done` → 删除线＋成功色；零行 → 空态）。 */
export function renderListRows(input: ListRowsInput): string {
  assertPlainObject(input, 'renderListRows: input');
  assertNoInlineHandler(input, 'renderListRows: input');
  const list = input as ListRowsInput;
  if (!Array.isArray(list.items)) badInput('renderListRows: input.items 必须是数组');
  if (list.items.length === 0) {
    const text = optText(list.emptyText) ?? '无数据';
    return '<div class="' + blockRoot('listRows') + '">' + renderEmptyState({ text }) + '</div>';
  }
  const rows = list.items.map((item, i) => {
    const field = 'renderListRows: input.items[' + i + ']';
    assertPlainObject(item, field);
    const row = item as ListRowInput;
    const main = reqText(row.main, field + '.main');
    const done = row.done === true;
    const cls = blockPart('listRows', 'row') + (done ? ' ' + blockPart('listRows', 'row-done') : '');
    const left = optText(row.left);
    const right = optText(row.right);
    return '<div class="' + cls + '">'
      + (left === undefined ? '' : '<span class="' + blockPart('listRows', 'left') + '">' + esc(left) + '</span>')
      + '<span class="' + blockPart('listRows', 'main') + '">' + esc(main) + '</span>'
      + (right === undefined ? '' : '<span class="' + blockPart('listRows', 'right') + '">' + esc(right) + '</span>')
      + '</div>';
  }).join('');
  return '<div class="' + blockRoot('listRows') + '" role="list">' + rows + '</div>';
}

/* ══════════════════════════════════════════════════════════════
 * B-06 指令块 <pre>（载体恒为 PRE；复制按钮走冻结双属性）
 * ══════════════════════════════════════════════════════════════ */

export interface PreBlockInput {
  readonly command: string;
  readonly label?: string;
  /** 给出即渲染复制按钮（id 写入 ACTION_ID_ATTR，文本写入 DEFAULT_DATA_ATTR）。 */
  readonly actionId?: string;
  readonly copyText?: string;
  readonly copyLabel?: string;
}

/** B-06：指令块（`<pre>` 逐字命令；无命令 → `bad-input`，不渲染空板）。 */
export function renderPreBlock(input: PreBlockInput): string {
  assertPlainObject(input, 'renderPreBlock: input');
  assertNoInlineHandler(input, 'renderPreBlock: input');
  const block = input as PreBlockInput;
  const command = reqText(block.command, 'renderPreBlock: input.command');
  const parts: string[] = ['<div class="' + blockRoot('preBlock') + '">'];
  const label = optText(block.label);
  if (label !== undefined) parts.push('<div class="' + blockPart('preBlock', 'label') + '">' + esc(label) + '</div>');
  parts.push('<pre class="' + blockPart('preBlock', 'code') + '">' + esc(command) + '</pre>');
  if (block.actionId !== undefined) {
    const actionId = reqText(block.actionId, 'renderPreBlock: input.actionId');
    const text = typeof block.copyText === 'string' ? block.copyText : command;
    const copyLabel = optText(block.copyLabel) ?? '复制指令';
    parts.push('<button type="button" class="' + STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost" '
      + ACTION_ID_ATTR + '="' + esc(actionId) + '" ' + DEFAULT_DATA_ATTR + '="' + esc(text) + '">'
      + esc(copyLabel) + '</button>');
  }
  parts.push('</div>');
  return parts.join('');
}

/* ══════════════════════════════════════════════════════════════
 * B-07 详情区（scene 必填五字段逐字展示；types 复数；status 两值闭集）
 * ══════════════════════════════════════════════════════════════ */

export interface DetailSectionInput {
  readonly scene: Scene;
  /** 该场景的 CLI 形态（调用方按 §3.5.3 `Scene.id` 推导约定组装）。 */
  readonly cli?: string;
}

/** 类型徽章（与 `src/help.ts` 同口径：字符串走 CSS 默认配色；`{text,bg?,fg?}` 配色写内联 style）。 */
function typeBadgeHtml(badge: string | SceneTypeBadge): string {
  if (typeof badge === 'string') {
    return '<span class="' + blockPart('detailSection', 'type') + '">' + esc(badge) + '</span>';
  }
  assertPlainObject(badge, 'renderDetailSection: types[] 元素');
  const element = badge as SceneTypeBadge;
  const text = reqText(element.text, 'renderDetailSection: types[] 元素的 text');
  const style: string[] = [];
  if (typeof element.bg === 'string' && element.bg !== '') style.push('background:' + element.bg);
  if (typeof element.fg === 'string' && element.fg !== '') style.push('color:' + element.fg);
  return '<span class="' + blockPart('detailSection', 'type') + '"'
    + (style.length === 0 ? '' : ' style="' + esc(style.join(';')) + '"') + '>' + esc(text) + '</span>';
}

/** B-07：场景详情（`prompt_template` 全文逐字展示；`【待开发】` 徽章下复制按钮仍可点＝纯展示，无行为）。 */
export function renderDetailSection(input: DetailSectionInput): string {
  assertPlainObject(input, 'renderDetailSection: input');
  assertNoInlineHandler(input, 'renderDetailSection: input');
  const section = input as DetailSectionInput;
  assertPlainObject(section.scene, 'renderDetailSection: input.scene');
  const scene = section.scene as Scene;
  const id = reqText(scene.id, 'renderDetailSection: input.scene.id');
  const title = reqText(scene.title, 'renderDetailSection: input.scene.title');
  const wakeWord = reqText(scene.wake_word, 'renderDetailSection: input.scene.wake_word');
  if (!(SCENE_STATUS as readonly string[]).includes(scene.status)) {
    badInput('renderDetailSection: input.scene.status 必须是 SCENE_STATUS 两值之一');
  }
  if (typeof scene.prompt_template !== 'string' || scene.prompt_template === '') {
    badInput('renderDetailSection: input.scene.prompt_template 必须是非空字符串');
  }
  const parts: string[] = ['<section class="' + blockRoot('detailSection') + '" data-scene-id="' + esc(id) + '">'];
  parts.push('<h2 class="' + blockPart('detailSection', 'title') + '">' + esc(title) + '</h2>');
  parts.push('<div class="' + blockPart('detailSection', 'meta') + '">'
    + '<span class="' + blockPart('detailSection', 'wake') + '">' + esc(wakeWord) + '</span>');
  if (scene.status === '【待开发】') {
    parts.push('<span class="' + blockPart('detailSection', 'dev') + '">待开发</span>');
  }
  if (scene.types !== undefined) {
    if (!Array.isArray(scene.types)) badInput('renderDetailSection: input.scene.types 必须是数组');
    for (const badge of scene.types) {
      if (typeof badge !== 'string') assertNoInlineHandler(badge as object, 'renderDetailSection: types[] 元素');
      parts.push(typeBadgeHtml(badge));
    }
  }
  parts.push('</div>');
  const cli = optText(section.cli);
  if (cli !== undefined) {
    parts.push('<pre class="' + blockPart('preBlock', 'code') + ' ' + blockPart('detailSection', 'cli') + '">'
      + esc(cli) + '</pre>');
  }
  parts.push('<pre class="' + blockPart('preBlock', 'code') + ' ' + blockPart('detailSection', 'prompt') + '">'
    + esc(scene.prompt_template) + '</pre>');
  parts.push('</section>');
  return parts.join('');
}

/* ══════════════════════════════════════════════════════════════
 * B-08 折叠区（强制原生 details；交互态全 CSS-only）
 * ══════════════════════════════════════════════════════════════ */

export interface DisclosureInput {
  readonly title: string;
  /** 已组合好的区块 HTML（受信透传，不转义）。 */
  readonly contentHtml: string;
  readonly open?: boolean;
}

/** B-08：折叠区（原生 `details／summary`；`[open]` 驱动展开态；复制按钮在内容里不触发 toggle＝宿主行为）。 */
export function renderDisclosure(input: DisclosureInput): string {
  assertPlainObject(input, 'renderDisclosure: input');
  assertNoInlineHandler(input, 'renderDisclosure: input');
  const block = input as DisclosureInput;
  const title = reqText(block.title, 'renderDisclosure: input.title');
  if (typeof block.contentHtml !== 'string') badInput('renderDisclosure: input.contentHtml 必须是字符串');
  return '<details class="' + blockRoot('disclosure') + '"' + (block.open === true ? ' open' : '') + '>'
    + '<summary class="' + blockPart('disclosure', 'summary') + '">' + esc(title) + '</summary>'
    + '<div class="' + blockPart('disclosure', 'body') + '">' + block.contentHtml + '</div>'
    + '</details>';
}

/* ══════════════════════════════════════════════════════════════
 * B-09 表单／参数区（静态 label＋input；行为归宿主，模块只留 data-* 约定）
 * ══════════════════════════════════════════════════════════════ */

export interface ParamFieldInput {
  readonly name: string;
  readonly label: string;
  readonly value?: string;
  readonly hint?: string;
  readonly required?: boolean;
}

export interface ParamFormInput {
  readonly fields: readonly ParamFieldInput[];
  readonly description?: string;
  /** 初始预览文本（受信透传；实时重算由宿主在 `input` 事件里做，DB-7）。 */
  readonly previewText?: string;
}

/** B-09：参数表单（`placeholder = hint`；`required` 落 `data-required` 供宿主拦截；零 JS）。 */
export function renderParamForm(input: ParamFormInput): string {
  assertPlainObject(input, 'renderParamForm: input');
  assertNoInlineHandler(input, 'renderParamForm: input');
  const form = input as ParamFormInput;
  if (!Array.isArray(form.fields) || form.fields.length === 0) {
    badInput('renderParamForm: input.fields 必须是非空数组');
  }
  const parts: string[] = ['<div class="' + blockRoot('paramForm') + '">'];
  const description = optText(form.description);
  if (description !== undefined) {
    parts.push('<p class="' + blockPart('paramForm', 'description') + '">' + esc(description) + '</p>');
  }
  form.fields.forEach((field, i) => {
    const path = 'renderParamForm: input.fields[' + i + ']';
    assertPlainObject(field, path);
    assertNoInlineHandler(field as object, path);
    const item = field as ParamFieldInput;
    const name = reqText(item.name, path + '.name');
    const label = reqText(item.label, path + '.label');
    const hint = optText(item.hint);
    const value = typeof item.value === 'string' ? item.value : '';
    const required = item.required === true;
    parts.push('<label class="' + blockPart('paramForm', 'field') + '">'
      + '<span class="' + blockPart('paramForm', 'label') + '">' + esc(label)
      + (required ? '<span class="' + blockPart('paramForm', 'required') + '" aria-hidden="true"> *</span>' : '')
      + '</span>'
      + '<input class="' + blockPart('paramForm', 'input') + '" name="' + esc(name) + '" value="' + esc(value) + '"'
      + (hint === undefined ? '' : ' placeholder="' + esc(hint) + '"')
      + (required ? ' data-required="1" required' : '')
      + ' />'
      + '</label>');
  });
  if (typeof form.previewText === 'string' && form.previewText !== '') {
    parts.push('<pre class="' + blockPart('preBlock', 'code') + ' ' + blockPart('paramForm', 'preview') + '">'
      + esc(form.previewText) + '</pre>');
  }
  parts.push('</div>');
  return parts.join('');
}

/* ══════════════════════════════════════════════════════════════
 * B-10 空态 ／ B-11 复制区 ／ B-12 反馈区（组合冻结控件，不重定义）
 * ══════════════════════════════════════════════════════════════ */

export interface EmptyBlockInput extends EmptyStateInput {
  readonly title?: string;
}

/** B-10：空态区块（冻结 `renderEmptyState` ＋ 区块 wrapper；异常走 B-12，两者不混用 DB-8）。 */
export function renderEmptyBlock(input: EmptyBlockInput): string {
  assertPlainObject(input, 'renderEmptyBlock: input');
  assertNoInlineHandler(input, 'renderEmptyBlock: input');
  const block = input as EmptyBlockInput;
  const title = optText(block.title);
  return '<section class="' + blockRoot('emptyBlock') + '">'
    + (title === undefined ? '' : '<h2 class="' + blockPart('emptyBlock', 'title') + '">' + esc(title) + '</h2>')
    + renderEmptyState(block)
    + '</section>';
}

export interface CopyBlockInput {
  readonly title?: string;
  readonly dataText?: string;
  readonly logText?: string;
  readonly dataActionId?: string;
  readonly logActionId?: string;
  readonly buttons?: ActionBarInput['buttons'];
}

/** B-11：复制区块（冻结 `renderActionBar`；id 缺省取 `COPY_ACTION_IDS.actionBar.*`，调用方须保页内唯一）。 */
export function renderCopyBlock(input: CopyBlockInput): string {
  assertPlainObject(input, 'renderCopyBlock: input');
  assertNoInlineHandler(input, 'renderCopyBlock: input');
  const block = input as CopyBlockInput;
  const bar: ActionBarInput = {};
  if (block.buttons !== undefined) (bar as { buttons?: ActionBarInput['buttons'] }).buttons = block.buttons;
  if (block.dataText !== undefined || block.dataActionId !== undefined) {
    (bar as { copyData?: CopyButtonInput }).copyData = {
      actionId: block.dataActionId ?? COPY_ACTION_IDS.actionBar.copyData,
      label: ACTION_BAR_DEFAULTS.copyDataLabel,
      ...(block.dataText === undefined ? {} : { text: block.dataText }),
    };
  }
  if (block.logText !== undefined || block.logActionId !== undefined) {
    (bar as { copyLog?: CopyButtonInput }).copyLog = {
      actionId: block.logActionId ?? COPY_ACTION_IDS.actionBar.copyLog,
      label: ACTION_BAR_DEFAULTS.copyLogLabel,
      ...(block.logText === undefined ? {} : { text: block.logText }),
    };
  }
  const title = optText(block.title);
  return '<section class="' + blockRoot('copyBlock') + '">'
    + (title === undefined ? '' : '<h2 class="' + blockPart('copyBlock', 'title') + '">' + esc(title) + '</h2>')
    + renderActionBar(bar)
    + '</section>';
}

export interface FeedbackBlockInput {
  readonly title?: string;
  readonly toast?: ToastInput;
  readonly error?: ErrorReceiptInput;
}

/** B-12：反馈区块（冻结 `renderToast` 和／或 `renderErrorReceipt`；两者至少其一）。 */
export function renderFeedbackBlock(input: FeedbackBlockInput): string {
  assertPlainObject(input, 'renderFeedbackBlock: input');
  assertNoInlineHandler(input, 'renderFeedbackBlock: input');
  const block = input as FeedbackBlockInput;
  if (block.toast === undefined && block.error === undefined) {
    badInput('renderFeedbackBlock: input.toast 与 input.error 至少其一');
  }
  const title = optText(block.title);
  return '<section class="' + blockRoot('feedbackBlock') + '">'
    + (title === undefined ? '' : '<h2 class="' + blockPart('feedbackBlock', 'title') + '">' + esc(title) + '</h2>')
    + (block.toast === undefined ? '' : renderToast(block.toast))
    + (block.error === undefined ? '' : renderErrorReceipt(block.error))
    + '</section>';
}

/* ══════════════════════════════════════════════════════════════
 * 区块样式资产（DB-2 后半：12 区的 CSS 唯一产出者）
 * ══════════════════════════════════════════════════════════════ */

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 软线派生字面量：`--line`（`#d2d2d7`）的 RGB（与 `src/style.ts` 的 `BLUE_RGB` 同口径：
 *  派生字面量、不是第二份 token 表，不新增 token 名）。 */
const LINE_RGB = '210, 210, 215';

/** 主色 RGB（`--blue` `#007aff`；与 `src/style.ts` 同值，复用罗列处注明出处）。 */
const BLUE_RGB = '0, 122, 255';

/** 待开发徽章配色（沿用 help 模板 `help-shell-badge-dev` 逐值，不另发明）。 */
const DEV_BG = 'rgba(255, 149, 0, .12)';
const DEV_FG = '#b25000';

/** 必填星号色（沿用 help 模板 `help-shell-field-required` 逐值）。 */
const REQUIRED_FG = '#c0392b';

/** 局部圆角常量（D-5：`{8,14,20,999}`，不新增 token 名）。 */
const RADIUS_SM = 8;
const RADIUS_MD = 14;
const RADIUS_LG = 20;
const RADIUS_PILL = 999;

/** 区块 CSS：12 区各自实现（键与 `BLOCK_STYLE_SECTIONS` 一一对应，缺区导入即抛，防静默缺样式）。 */
const BLOCK_SECTION_BUILDERS: Record<BlockStyleSection, (prefix: string) => string> = {
  pageShell: (p) => [
    // #179 整页基座（文档级）：本区是「共享页面模板」的唯一落点（`style.test.mjs` T22 明写 body／html
    // 规则归 #104，`buildStyleSheet()` 不得产）。此前一条都没有 → 实测 `body` 吃 UA 的 8px 外边距、
    // 白底（`--bg` `#f5f5f7` 定义了却没人用）＋ 系统默认字体（computed 回落到 Noto Sans SC）。
    // 这三条与参照件 HELP 的 `body{font-family…;background:var(--bg);color:var(--text)}` 对齐；
    // 字体栈取 `src/font.ts` 唯一真相源（不各抄一份）。**不搬** HELP 的 `*{margin:0;padding:0}`：
    // 本页没有任何盒子靠全局复位才不溢出（唯一需要 `box-sizing` 的输入框已自带），
    // 搬了会把 `.ilife-block-page-shell` 的桌面内容宽从 960 压到 920（45 张页面一起变），
    // 属另一题材。 */
    'body {',
    '  margin: 0;',
    '  background: var(--bg);',
    '  color: var(--fg);',
    '  font-family: ' + BODY_FONT_STACK + ';',
    '  font-size: 15px;',
    '  line-height: 1.5;',
    '  -webkit-font-smoothing: antialiased;',
    '}',
    '.' + p + 'block-page-shell {',
    '  display: block;',
    '  max-width: 960px;',
    '  margin: 0 auto;',
    '  padding: 32px 20px 80px;',
    '  color: var(--fg);',
    '  font-feature-settings: "tnum";',
    '}',
    '.' + p + 'block-page-shell-eyebrow {',
    '  margin: 0;',
    // #179 对比度：12px 小字压白底，`--blue` 4.02:1 不到 AA 的 4.5:1 → 同族深一档 `--blue2`（5.6:1）。
    '  color: var(--blue2);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '  letter-spacing: .08em;',
    '  text-transform: uppercase;',
    '}',
    '.' + p + 'block-page-shell-title {',
    '  margin: 6px 0 0;',
    '  font-size: 32px;',
    '  font-weight: 700;',
    '  letter-spacing: -.4px;',
    '  line-height: 1.2;',
    '}',
    '.' + p + 'block-page-shell-subtitle {',
    '  margin: 6px 0 0;',
    '  color: var(--fg2);',
    '  font-size: 15px;',
    '}',
    '.' + p + 'block-page-shell-body {',
    '  display: block;',
    '  margin-top: 16px;',
    '}',
    '@media (max-width: 640px) {',
    '  .' + p + 'block-page-shell {',
    '    padding: 20px 16px 60px;',
    '  }',
    '  .' + p + 'block-page-shell-title {',
    '    font-size: 26px;',
    '  }',
    '}',
  ].join(LF),

  kpiCard: (p) => [
    // #179 类名对账（硬证据：`.scratch/t179` 的类名对账脚本）：本区 6 条内层规则此前写成
    // `block-kpi-*`，而 `blockPart('kpiCard', …)` 真产出的是 `block-kpi-card-*`
    // → label／value-row／value／unit／detail／badge **6 条全部落空**（computed 实测：值 16px/400
    // 普通正文色，不是设计的 28px/700）。本区逐条改回真产出的类名，并把说明落在每条前面。
    '.' + p + 'block-kpi-card-grid {',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));',
    '  gap: 12px;',
    '}',
    '.' + p + 'block-kpi-card {',
    '  padding: 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '  box-shadow: var(--shadow);',
    '}',
    '.' + p + 'block-kpi-card-label {',
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-kpi-card-value-row {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  margin-top: 4px;',
    '}',
    '.' + p + 'block-kpi-card-value {',
    '  min-width: 0;',
    '  color: var(--fg);',
    '  font-size: 28px;',
    '  font-weight: 700;',
    '  line-height: 1.2;',
    '  overflow-wrap: anywhere;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.' + p + 'block-kpi-card-unit {',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-kpi-card-detail {',
    '  margin-top: 4px;',
    // #179 对比度：12px 小字取 `--fg3`（`#86868b`）压卡片白底只有 3.62:1，不到 AA 的 4.5:1
    // → 与 label 同色 `--fg2`（4.94:1），层次由字重（600／400）和字号承担，不靠更浅的灰。
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  overflow-wrap: anywhere;',
    '}',
    '.' + p + 'block-kpi-card-badge {',
    '  margin-top: 8px;',
    '}',
  ].join(LF),

  dataTable: (p) => [
    '.' + p + 'block-data-table {',
    '  overflow-x: auto;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '}',
    '.' + p + 'block-data-table-table {',
    '  width: 100%;',
    '  border-collapse: collapse;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.' + p + 'block-data-table-caption {',
    '  padding: 10px 14px;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  text-align: left;',
    '}',
    '.' + p + 'block-data-table th {',
    '  padding: 10px 14px;',
    '  border-bottom: 1px solid var(--line);',
    '  background-color: transparent;',
    // #179 对比度：表头 12px 取 `--fg3` 只有 3.62:1，不到 AA 的 4.5:1 → 取 `--fg2`（4.94:1）。
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '  text-transform: uppercase;',
    '  letter-spacing: .04em;',
    '  white-space: nowrap;',
    '}',
    '.' + p + 'block-data-table td {',
    '  padding: 12px 14px;',
    '  border-bottom: 1px solid rgba(' + LINE_RGB + ', .6);',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-data-table tr:last-child td {',
    '  border-bottom: none;',
    '}',
    '.' + p + 'block-data-table-cell-left {',
    '  text-align: left;',
    '}',
    '.' + p + 'block-data-table-cell-center {',
    '  text-align: center;',
    '}',
    '.' + p + 'block-data-table-cell-right {',
    '  text-align: right;',
    '}',
  ].join(LF),

  chartBlock: (p) => [
    '.' + p + 'block-chart-block {',
    '  margin: 16px 0;',
    '  padding: 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '}',
    '.' + p + 'block-chart-block-title {',
    '  margin: 0 0 10px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
    '.' + p + 'block-chart-block-canvas {',
    '  padding: 0;',
    '}',
  ].join(LF),

  listRows: (p) => [
    '.' + p + 'block-list-rows {',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '}',
    '.' + p + 'block-list-rows-row {',
    '  display: grid;',
    '  grid-template-columns: 44px minmax(0, 1fr) auto;',
    '  gap: 8px;',
    '  align-items: center;',
    '  padding: 10px 14px;',
    '  border-top: 1px solid rgba(' + LINE_RGB + ', .6);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-list-rows-row:first-child {',
    '  border-top: 0;',
    '}',
    '.' + p + 'block-list-rows-left {',
    '  color: var(--fg3);',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.' + p + 'block-list-rows-main {',
    '  min-width: 0;',
    '  overflow: hidden;',
    '  color: var(--fg);',
    '  text-overflow: ellipsis;',
    '  white-space: nowrap;',
    '}',
    '.' + p + 'block-list-rows-right {',
    '  color: var(--fg2);',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.' + p + 'block-list-rows-row-done .' + p + 'block-list-rows-main {',
    '  color: var(--ok);',
    '  text-decoration: line-through;',
    '}',
  ].join(LF),

  preBlock: (p) => [
    '.' + p + 'block-pre-block {',
    '  margin: 12px 0;',
    '}',
    '.' + p + 'block-pre-block-label {',
    '  margin-bottom: 6px;',
    '  color: var(--fg2);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-pre-block-code {',
    '  margin: 0;',
    '  padding: 12px;',
    '  border-radius: ' + RADIUS_SM + 'px;',
    '  background: var(--soft);',
    '  color: var(--fg2);',
    '  font-family: "SF Mono", monospace;',
    '  font-size: 12px;',
    '  line-height: 1.55;',
    '  white-space: pre-wrap;',
    '  overflow-x: auto;',
    '}',
  ].join(LF),

  detailSection: (p) => [
    '.' + p + 'block-detail-section {',
    '  margin: 16px 0;',
    '  padding: 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '  box-shadow: var(--shadow);',
    '}',
    '.' + p + 'block-detail-section-title {',
    '  margin: 0;',
    '  font-size: 17px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-detail-section-meta {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 8px;',
    '  margin-top: 8px;',
    '}',
    '.' + p + 'block-detail-section-wake {',
    '  color: var(--fg3);',
    '  font-family: "SF Mono", monospace;',
    '  font-size: 11.5px;',
    '}',
    '.' + p + 'block-detail-section-dev {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  padding: 1px 8px;',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: ' + DEV_BG + ';',
    '  color: ' + DEV_FG + ';',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-detail-section-type {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  padding: 1px 8px;',
    '  border-radius: ' + RADIUS_PILL + 'px;',
    '  background: var(--soft);',
    '  color: var(--blue2);',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-detail-section-cli,',
    '.' + p + 'block-detail-section-prompt {',
    '  margin-top: 10px;',
    '}',
  ].join(LF),

  disclosure: (p) => [
    '.' + p + 'block-disclosure {',
    '  margin: 12px 0;',
    '  border: 1px solid var(--line);',
    '  border-radius: ' + RADIUS_MD + 'px;',
    '  background: var(--card);',
    '}',
    '.' + p + 'block-disclosure-summary {',
    // #179 触控目标：折叠区整条是可点区域，实测 40px 高（10px 上下留白＋14px 字）不到 44px
    // → 改 44px 定高＋纵向居中，横向留白不变（与 `.block-disclosure-body` 的 14px 对齐）。
    '  display: flex;',
    '  align-items: center;',
    '  min-height: 44px;',
    '  padding: 0 14px;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  list-style: none;',
    '}',
    '.' + p + 'block-disclosure-summary::-webkit-details-marker {',
    '  display: none;',
    '}',
    '.' + p + 'block-disclosure-summary::before {',
    '  content: "▸";',
    '  display: inline-block;',
    '  margin-right: 8px;',
    '  color: var(--fg3);',
    '  transition: transform .15s ease;',
    '}',
    '.' + p + 'block-disclosure[open] > .' + p + 'block-disclosure-summary::before {',
    '  transform: rotate(90deg);',
    '}',
    '.' + p + 'block-disclosure-body {',
    '  padding: 0 14px 14px;',
    '}',
  ].join(LF),

  paramForm: (p) => [
    '.' + p + 'block-param-form {',
    '  margin: 12px 0;',
    '}',
    '.' + p + 'block-param-form-description {',
    '  margin: 0 0 8px;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-param-form-field {',
    '  display: block;',
    '  margin: 8px 0;',
    '}',
    '.' + p + 'block-param-form-label {',
    '  display: block;',
    '  margin-bottom: 4px;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-param-form-required {',
    '  color: ' + REQUIRED_FG + ';',
    '  font-weight: 600;',
    '}',
    '.' + p + 'block-param-form-input {',
    '  box-sizing: border-box;',
    '  width: 100%;',
    '  min-height: 44px;',
    '  padding: 0 12px;',
    '  border: 0;',
    '  border-radius: ' + RADIUS_SM + 'px;',
    '  background: var(--bg);',
    '  color: var(--fg);',
    '  font-family: inherit;',
    '  font-size: 13px;',
    '}',
    '.' + p + 'block-param-form-input:focus {',
    '  background: var(--card);',
    '  border: 1px solid var(--blue);',
    '  box-shadow: 0 0 0 3px rgba(' + BLUE_RGB + ', .25);',
    '  outline: none;',
    '}',
    '.' + p + 'block-param-form-input:focus-visible {',
    '  outline: 2px solid var(--blue);',
    '  outline-offset: 2px;',
    '}',
    '.' + p + 'block-param-form-preview {',
    '  margin-top: 10px;',
    '}',
  ].join(LF),

  emptyBlock: (p) => [
    '.' + p + 'block-empty-block {',
    '  margin: 16px 0;',
    '}',
    '.' + p + 'block-empty-block-title {',
    '  margin: 0 0 8px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
  ].join(LF),

  copyBlock: (p) => [
    '.' + p + 'block-copy-block {',
    '  margin: 16px 0;',
    '}',
    '.' + p + 'block-copy-block-title {',
    '  margin: 0 0 8px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
  ].join(LF),

  feedbackBlock: (p) => [
    '.' + p + 'block-feedback-block {',
    '  margin: 16px 0;',
    '}',
    '.' + p + 'block-feedback-block-title {',
    '  margin: 0 0 8px;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
  ].join(LF),
};

/** 闭集漂移 fail-fast（与 `src/style.ts` 同口径）：缺区实现导入即抛。 */
for (const section of BLOCK_STYLE_SECTIONS) {
  if (BLOCK_SECTION_BUILDERS[section] === undefined) {
    throw new Error('base-paint/blocks：BLOCK_STYLE_SECTIONS 闭集缺样式区实现（' + section + '）');
  }
}

export interface BlocksCssInput {
  /** 类名前缀；缺省 `STYLE_PREFIX`（`ilife-`）。 */
  readonly prefix?: string;
}

/** 区块样式资产唯一产出者（用法：调用方把返回值拼进 `TemplateAssets.sharedCssText`
 *  再交 `fillTemplate` 包裹注入；不得走 `StyleSheetInput.extraCss`——其语义被契约
 *  限死为技能作用域 token 覆盖块，不得塞共享页面模板的样式）。恒返回非空 CSS 文本。 */
export function blocksCss(input?: BlocksCssInput): string {
  const prefix = input !== undefined && input !== null && typeof input.prefix === 'string' && input.prefix !== ''
    ? input.prefix
    : STYLE_PREFIX;
  const parts: string[] = ['/* base-paint 区块样式资产 · #104 · 12 区 */'];
  for (const section of BLOCK_STYLE_SECTIONS) {
    parts.push('/* block-' + sectionSlug(section) + ' */');
    parts.push(BLOCK_SECTION_BUILDERS[section](prefix));
  }
  return parts.join(LF);
}

/* ── 再导出冻结引用（只读透传，方便 108–113 从单一入口取双属性名；零新语义） ── */

export { ACTION_ID_ATTR, COPY_ACTION_IDS, DEFAULT_DATA_ATTR, TOAST_DEFAULTS };
export type {
  ActionBarInput,
  CopyButtonInput,
  EmptyStateInput,
  ErrorReceiptInput,
  StatusKind,
  ToastInput,
};
