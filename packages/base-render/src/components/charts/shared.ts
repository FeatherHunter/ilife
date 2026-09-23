/** charts · shared
 *
 *  自 `src/charts.ts` 第 73–232 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { charts } from './dispatch.js';
import { escapeHtml } from '../../contract.js';
import { CHART_PALETTE, ChartErrorCode, ChartItem, ChartKind } from '../../spec/index.js';

export const LF = String.fromCharCode(10);
/* ── 错误形态（§3.5：与 `TemplateError`／`ControlsError` 并列、互不继承、一律抛出、不返空） ── */

/** 图表层错误。**不**从 `src/index.ts` 导出：调用方按 `name === 'ChartError'` ＋ `code` 判定。 */
export class ChartError extends Error {
  readonly code: ChartErrorCode;

  constructor(code: ChartErrorCode, message: string) {
    super(message);
    this.name = 'ChartError';
    this.code = code;
  }
}

export function badStructure(message: string): never {
  throw new ChartError('structure-invalid', message);
}

function badPct(message: string): never {
  throw new ChartError('pct-invalid', message);
}

export function badKind(kind: string): never {
  throw new ChartError('kind-unknown', 'charts: 未知图表 kind：' + kind);
}

/* ── 小件 ─────────────────────────────────────────────────────────────── */

export function esc(value: string): string {
  return escapeHtml(value);
}

export function jsStr(value: string): string {
  return JSON.stringify(value);
}

export function isPlainObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNum(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}

export function numOr(value: unknown, fallback: number): number {
  return isNum(value) ? value : fallback;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 数值文本（旧 `_fmt`：函数格式化器优先，否则 `String(值)`）。 */
export function fmtValue(value: number, format: ((v: number) => string) | undefined): string {
  if (typeof format === 'function') return String(format(value));
  return String(round2(value));
}

/** 坐标文本（旧版 `toFixed(1)` 口径）。 */
export function n1(value: number): string {
  return value.toFixed(1);
}

/** 缺省单序列色（旧版 `var(--blue,#007aff)` 带 fallback，§3.5 语义色）。 */
export const DEFAULT_SERIES_COLOR = 'var(--blue,#007aff)';
export const DEFAULT_MARK_COLOR = '#ff9500';
export const DEFAULT_REGRESSION_COLOR = '#ff3b30';
export const ANOMALY_COLOR = CHART_PALETTE[3];
export const UP_COLOR = 'var(--ok,#34c759)';
export const DOWN_COLOR = CHART_PALETTE[3];
export const GRID_COLOR = 'var(--line,#d2d2d7)';
export const MUTED_COLOR = 'var(--fg3,#86868b)';
export const DOT_FACE_COLOR = 'var(--card,#ffffff)';
export const DOT_DEFAULT_PX = 7;
export const SCATTER_DOT_DEFAULT_PX = 9;
/** 折线数据点抽稀上限（#424）：`showDots` **未显式给**且点数超过它时不逐点画圆——
 *  逐点画必重叠成一团（90 点 / 580 单位宽 → 点距 6.1，圆径 7）。显式 `showDots` 一律照办。 */
export const DOT_STRIDE_MAX = 30;
/** scatter 缺省 Y 轴刻度条数（旧 `charts.js:854` `yTicks:4`；冻结 `ScatterChartOptions` 无该字段，
 *  故按**缺省行为**渲染 4 条、不新增可关闭开关——登记为契约缺口，归后续票，R2-G1 裁定）。 */
export const SCATTER_Y_TICKS = 4;
export const EMPTY_ICON = '📊';
export const EMPTY_HINT = '有记录后自动生成图表';
export const DONUT_ZERO_HINT = '合计为零, 无环形数据';
export const OWN_SCALE_NOTE = '各指标独立刻度';
/** 水平网格线**无 Y 轴标注时**的条数（#512：有标注时改按标注条数画，见 `gridSvg`）。 */
export const GRID_LINES = 3;

/** 稳定 32 位散列（FNV-1a）——渐变 `<linearGradient id>` 由**渐变参数**派生，
 *  同一输入恒得同一 id、不同参数得不同 id，且**不跨调用共享可变状态**（R1-A1／FX-78-A1b-11）。 */
export function hash32(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/* ── 输入校验（`CHART_STRUCTURE_RULE = 'throw'`） ──────────────────────── */

export function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (!isPlainObject(value)) badStructure(field + ' 必须是对象');
  return value as Record<string, unknown>;
}

/** 统一数据形状校验：`items` 非数组／缺 `label`／`value` 非法 → `structure-invalid`。
 *  `mode = 'values'` 用于 bar 的 stacked／grouped 多值路径：`values` 是多值真相源，
 *  但 `value` **不豁免**——冻结类型 `ChartItem.value` 必填，且 `docs/base-paint-contract.md:799`
 *  要求「`value` 非法（非数且非 null）→ 抛 `structure-invalid`」；旧 `_barMulti` 的宽松行为
 *  （静默置 0）不复刻（R1-A2／FX-78-A1b-12，记账见 a1-evidence.md）。 */
export function normalizeItems(raw: unknown, kind: ChartKind, allowNull: boolean, mode: 'value' | 'values' = 'value'): ChartItem[] {
  if (!Array.isArray(raw)) {
    badStructure('charts.' + kind + ': items 必须是数组, 收到 ' + (raw === null ? 'null' : typeof raw));
  }
  const list = raw as readonly unknown[];
  return list.map((entry, i) => {
    const field = 'charts.' + kind + ': items[' + i + ']';
    const item = requireObject(entry, field);
    if (typeof item.label !== 'string' || item.label.trim() === '') badStructure(field + '.label 缺失');
    const value = item.value;
    let values: readonly number[] | undefined;
    if (mode === 'values') {
      if (!isNum(value)) {
        badStructure(field + '.value 无效（缺省/非数字）: ' + JSON.stringify(value === undefined ? null : value));
      }
      if (!Array.isArray(item.values) || item.values.length === 0) badStructure(field + '.values 必须是非空数组');
      values = (item.values as readonly unknown[]).map((v, j) => {
        if (!isNum(v)) badStructure(field + '.values[' + j + '] 无效（缺省/非数字）');
        return v;
      });
    } else {
      if (!(value === null && allowNull) && !isNum(value)) {
        badStructure(field + '.value 无效（缺省/非数字）: ' + JSON.stringify(value === undefined ? null : value));
      }
      if (item.values !== undefined) {
        if (!Array.isArray(item.values) || item.values.length === 0) badStructure(field + '.values 必须是非空数组');
        values = (item.values as readonly unknown[]).map((v, j) => {
          if (!isNum(v)) badStructure(field + '.values[' + j + '] 无效（缺省/非数字）');
          return v;
        });
      }
    }
    const color = typeof item.color === 'string' && item.color !== '' ? item.color : undefined;
    const out: ChartItem = {
      label: item.label,
      value: mode === 'values' ? (value as number) : value === null ? null : (value as number),
      ...(color === undefined ? {} : { color }),
      ...(values === undefined ? {} : { values }),
      ...(item.anomaly === true ? { anomaly: true } : {}),
    };
    return out;
  });
}

/** `pct` 非数 → `pct-invalid`；超界统一为 0~100（旧 §6.5 逐字行为）。 */
export function normalizePct(raw: unknown, kind: ChartKind): number {
  if (!isNum(raw)) badPct('charts.' + kind + ': pct 无效: ' + String(raw));
  return Math.max(0, Math.min(100, raw));
}

