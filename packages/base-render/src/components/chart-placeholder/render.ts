/** chart-placeholder · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 图表占位（1016 B-位：占位文案直升 base 默认，真图待回填）——
 *
 *  7 页真图（a05／a08 donut、a14／a15／a18／a20／a21）回填前，先立这个占位：
 *  标题 ＋ 三行“不重算口径” ＋ 需真图标记 ＋ 种类。真图由 `charts/` 直调回填，
 *  本件只占位、不画图、不重算任何口径。本件**没有运行时段**。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, reqText } from '../shared/validate.js';

/** 本件的类名根（**常量只住这里**：样式从这里取，不各写一份）。 */
export const CHART_PLACEHOLDER_CLASS = 'ilife-block-chart-placeholder';
/** 种类闭集（真图回填的种类以基线复核为准；占位只声明它占的是哪一种）。 */
export const CHART_PLACEHOLDER_KINDS = ['donut', 'line', 'bar'] as const;
export type ChartPlaceholderKind = (typeof CHART_PLACEHOLDER_KINDS)[number];
/** 缺省三行（调用方不给就用它：“不重算口径”三行）。 */
export const CHART_PLACEHOLDER_DEFAULT_LINES = Object.freeze([
  '本页只放占位，不重算口径',
  '真图回填前不做结论',
  '种类以基线复核为准',
]);
/** 槽位闭集。 */
export const CHART_PLACEHOLDER_SLOTS = ['title', 'lines', 'line', 'need'] as const;
export type ChartPlaceholderSlot = (typeof CHART_PLACEHOLDER_SLOTS)[number];
/** 槽类名（唯一拼法）。 */
export function chartPlaceholderSlot(slot: ChartPlaceholderSlot, prefix = 'ilife-'): string {
  return prefix + 'block-chart-placeholder-' + slot;
}
/** 图表占位入参（4 位）。 */
export interface ChartPlaceholderInput {
  /** 占位标题（如“CHART”）。 */
  readonly title: string;
  /** 说明行（1～4 行；缺省三行“不重算口径”）。 */
  readonly lines?: readonly string[];
  /** 需真图标记（为真时出“需真图”一句）。 */
  readonly needReal?: boolean;
  /** 种类（占的是哪一种图的位）。 */
  readonly kind?: ChartPlaceholderKind;
  readonly extraClass?: string;
}
/** 归一化后的入参（内部形态）。 */
export interface ChartPlaceholderModel {
  readonly title: string;
  readonly lines: readonly string[];
  readonly needReal: boolean;
  readonly kind: ChartPlaceholderKind;
  readonly extraClass?: string;
}
/** 入参归一化（唯一入口：`renderChartPlaceholder` 只吃它产出的模型）。 */
export function normalizeChartPlaceholder(input: unknown): ChartPlaceholderModel {
  assertPlainObject(input, 'renderChartPlaceholder: input');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (/^on/i.test(k)) badInput('renderChartPlaceholder: input 不得含内联事件字段：' + k);
  const title = reqText(raw.title, 'renderChartPlaceholder: input.title');
  let lines: readonly string[] = CHART_PLACEHOLDER_DEFAULT_LINES;
  if (raw.lines !== undefined) {
    if (!Array.isArray(raw.lines) || raw.lines.length === 0 || raw.lines.length > 4) {
      badInput('renderChartPlaceholder: input.lines 须是 1～4 行的数组');
    }
    lines = raw.lines.map((ln, i) => {
      if (typeof ln !== 'string' || ln === '') badInput('renderChartPlaceholder: input.lines[' + i + '] 必须是非空字符串');
      return ln;
    });
  }
  const needReal = raw.needReal === undefined ? false : raw.needReal;
  if (typeof needReal !== 'boolean') badInput('renderChartPlaceholder: input.needReal 必须是布尔值');
  const kind = raw.kind === undefined ? 'bar' : raw.kind;
  if (!(CHART_PLACEHOLDER_KINDS as readonly unknown[]).includes(kind)) {
    badInput('renderChartPlaceholder: input.kind 必须是 ' + CHART_PLACEHOLDER_KINDS.join('／') + ' 之一');
  }
  return {
    title,
    lines,
    needReal,
    kind: kind as ChartPlaceholderKind,
    extraClass: optExtraClass(raw.extraClass, 'renderChartPlaceholder: input.extraClass'),
  };
}
/** 渲染图表占位（纯函数：同样入参恒产同样字节；转义只经 `shared/escape.ts`）。 */
export function renderChartPlaceholder(input: unknown): string {
  const m = normalizeChartPlaceholder(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const parts: string[] = ['<div class="' + CHART_PLACEHOLDER_CLASS + ' is-' + m.kind + extra + '" data-chart-kind="' + esc(m.kind) + '">'];
  parts.push('<p class="' + chartPlaceholderSlot('title') + '">' + esc(m.title) + '</p>');
  parts.push('<ul class="' + chartPlaceholderSlot('lines') + '">');
  for (const ln of m.lines) parts.push('<li class="' + chartPlaceholderSlot('line') + '">' + esc(ln) + '</li>');
  parts.push('</ul>');
  if (m.needReal) parts.push('<p class="' + chartPlaceholderSlot('need') + '">需真图</p>');
  parts.push('</div>');
  return parts.join('');
}
