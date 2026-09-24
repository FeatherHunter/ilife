/** heat-grid · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      行列对不齐的网格画出来是"错位"，而调用方以为自己给了一张完整的表。
 *   2. **色键与实际着色同一份真值**：`heatGridLevel()` 是本件唯一的着色函数，
 *      色键上那几段数字区间也由它用的 `levelStops` 算出来——两处各写一套必然走散。
 *   3. 归一化只做「形状」与「算数」：色不是唯一信息的三条通路（色键区间／峰值符号／右侧数字）
 *      都写在这里算好，`render.ts` 只负责拼标记。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  HEAT_GRID_COLUMNS,
  HEAT_GRID_FORMS,
  HEAT_GRID_LEVEL_STOPS,
  HEAT_GRID_WEEKDAYS,
  type HeatGridFact,
  type HeatGridForm,
  type HeatGridRow,
} from './attrs.js';

/** 一格：值 ＋ 色档 ＋ 是不是峰值。 */
export interface HeatGridCellModel {
  readonly value: number;
  /** 色档 0…4（＝ `is-l<n>` 的 n）。 */
  readonly level: number;
  readonly peak: boolean;
}

/** 一行：行标签 ＋ 七格。 */
export interface HeatGridRowModel {
  readonly label: string;
  readonly cells: readonly HeatGridCellModel[];
}

/** 色键的一项：色档 ＋ 它的数字区间（**色键就是从这里出的，不许另一处再写一套区间**）。 */
export interface HeatGridKeyItemModel {
  readonly level: number;
  readonly text: string;
}

/** 内部类型：每个字段都已校验、已归一、已算好（`render.ts` 只负责拼标记）。 */
export interface HeatGridModel {
  readonly form: HeatGridForm;
  readonly title: string;
  readonly stamp?: string;
  readonly unit?: string;
  readonly weekdays: readonly string[];
  readonly rows: readonly HeatGridRowModel[];
  readonly keyItems: readonly HeatGridKeyItemModel[];
  readonly facts: readonly HeatGridFact[];
  readonly note?: string;
  /** 峰值（全网格最大值，0 表示"没有峰值"——全零不点峰值符号）。 */
  readonly max: number;
  /** 无障碍名（写给读屏的那一句：标题 ＋ 合计 ＋ 峰值那一格）。 */
  readonly ariaLabel: string;
  readonly extraClass?: string;
}

/** **本件唯一的着色函数**：值 → 色档 0…4（上界闭区间；`stops` 是三个递增上界）。
 *  色键上那几段区间与格子的深浅都由它决定 ⇒ 读者按色键数格子一定数得对。 */
export function heatGridLevel(value: number, stops: readonly number[] = HEAT_GRID_LEVEL_STOPS): number {
  if (value <= 0) return 0;
  for (let i = 0; i < stops.length; i += 1) {
    if (value <= stops[i]) return i + 1;
  }
  return stops.length + 1;
}

/** 色键的一项文字：一档区间 ＋ 单位（如「1–2 条」「7 条以上」）。 */
function keyText(level: number, stops: readonly number[], unit?: string): string {
  const u = unit === undefined ? '' : ' ' + unit;
  if (level === 0) return '0' + u;
  const low = level === 1 ? 1 : stops[level - 2] + 1;
  /* 最后一档是开区间（「7 条以上」）：它的下界取自**最后一个上界 ＋ 1**，没有对应的上界。 */
  const high = stops[Math.min(level, stops.length) - 1];
  return level === stops.length + 1
    ? String(high + 1) + u + '以上'
    : String(low) + '–' + String(high) + u;
}

/** 分档上界：恰好三个、严格递增的非负整数（非整数或乱序会让区间文字与着色对不上）。 */
function reqStops(value: unknown): readonly number[] {
  if (value === undefined) return HEAT_GRID_LEVEL_STOPS;
  if (!Array.isArray(value) || value.length !== HEAT_GRID_LEVEL_STOPS.length) {
    badInput('heat-grid: input.levelStops 必须是恰好 ' + HEAT_GRID_LEVEL_STOPS.length + ' 个分档上界');
  }
  let prev = 0;
  return value.map((one, i) => {
    if (typeof one !== 'number' || !Number.isInteger(one) || one < 0) {
      badInput('heat-grid: input.levelStops[' + i + '] 必须是非负整数');
    }
    if (one <= prev) badInput('heat-grid: input.levelStops 必须严格递增（第 ' + i + ' 项不大于上一项）');
    prev = one;
    return one;
  });
}

/** 列头：给了就必须恰好七枚非空串（列维度是「一周七天」，多一枚少一枚都会错位）。 */
function reqWeekdays(value: unknown): readonly string[] {
  if (value === undefined) return HEAT_GRID_WEEKDAYS;
  if (!Array.isArray(value) || value.length !== HEAT_GRID_COLUMNS) {
    badInput('heat-grid: input.weekdays 必须恰好 ' + HEAT_GRID_COLUMNS + ' 枚列头（周一…周日）');
  }
  return value.map((one, i) => reqText(one, 'heat-grid: input.weekdays[' + i + ']'));
}

/** 各行：行标签非空串；`values` 恰好七个数、逐个是 ≥ 0 的有限数。 */
function reqRows(value: unknown): readonly HeatGridRow[] {
  if (!Array.isArray(value) || value.length === 0) {
    badInput('heat-grid: input.rows 必须是非空数组（≥1 行）');
  }
  if (value.length > 12) {
    badInput('heat-grid: input.rows 最多 12 行（再多一屏读不完，请调用方先聚合）');
  }
  return value.map((item, i) => {
    assertPlainObject(item, 'heat-grid: input.rows[' + i + ']');
    const row = item as Record<string, unknown>;
    const label = reqText(row.label, 'heat-grid: input.rows[' + i + '].label');
    const values = row.values;
    if (!Array.isArray(values) || values.length !== HEAT_GRID_COLUMNS) {
      badInput('heat-grid: input.rows[' + i + '].values 必须恰好 ' + HEAT_GRID_COLUMNS + ' 个数（一周七天）');
    }
    return {
      label,
      values: values.map((one, c) => {
        if (typeof one !== 'number' || !Number.isFinite(one) || one < 0) {
          badInput('heat-grid: input.rows[' + i + '].values[' + c + '] 必须是 ≥ 0 的有限数');
        }
        return one;
      }),
    };
  });
}

/** 右侧读数：逐行校验（名字与值都必须是非空串；脚注可选）。 */
function optFacts(value: unknown): readonly HeatGridFact[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) badInput('heat-grid: input.facts 必须是数组（逐行一枚）');
  return value.map((item, i) => {
    assertPlainObject(item, 'heat-grid: input.facts[' + i + ']');
    const f = item as Record<string, unknown>;
    return {
      label: reqText(f.label, 'heat-grid: input.facts[' + i + '].label'),
      value: reqText(f.value, 'heat-grid: input.facts[' + i + '].value'),
      sub: optText(f.sub, 'heat-grid: input.facts[' + i + '].sub'),
    };
  });
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `HeatGridModel`，不再自己碰 `any`。 */
export function normalizeHeatGrid(input: unknown): HeatGridModel {
  assertPlainObject(input, 'renderHeatGrid: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? HEAT_GRID_FORMS[0] : raw.form;
  if (!(HEAT_GRID_FORMS as readonly unknown[]).includes(form)) {
    badInput('heat-grid: input.form 必须是 ' + HEAT_GRID_FORMS.join('／')
      + ' 之一（本件只落地形态 A「行时段 × 列星期」）');
  }

  const unit = optText(raw.unit, 'heat-grid: input.unit');
  const stops = reqStops(raw.levelStops);
  const weekdays = reqWeekdays(raw.weekdays);
  const rows = reqRows(raw.rows);

  let max = 0;
  for (const row of rows) {
    for (const one of row.values) if (one > max) max = one;
  }

  /* 峰值符号**只点在第一处峰值上**（与原型同款）：读者要的是一个"最高在这儿"的锚点；
     并列最大值全点上会把网格点花（并列了几格，由右侧读数那一列去说）。
     位置在**构造阶段**一次算出来（不在只读数组上回头改格子）。 */
  let peakRow = -1;
  let peakCol = -1;
  if (max > 0) {
    for (let r = 0; r < rows.length && peakRow < 0; r += 1) {
      const at = rows[r].values.indexOf(max);
      if (at >= 0) {
        peakRow = r;
        peakCol = at;
      }
    }
  }

  const built: HeatGridRowModel[] = rows.map((row, r) => ({
    label: row.label,
    cells: row.values.map((one, i) => ({
      value: one,
      level: heatGridLevel(one, stops),
      peak: r === peakRow && i === peakCol,
    })),
  }));

  const keyItems: HeatGridKeyItemModel[] = [];
  for (let level = 0; level < stops.length + 2; level += 1) {
    keyItems.push({ level, text: keyText(level, stops, unit) });
  }

  /* 峰值那一格写进无障碍名：读屏读者至少拿得到"最忙的是哪一格、多少"。 */
  let peakAt = '';
  const unitText = unit === undefined ? '' : ' ' + unit;
  for (const row of built) {
    row.cells.forEach((cell, c) => {
      if (cell.peak && peakAt === '') peakAt = row.label + ' ' + weekdays[c];
    });
  }
  const total = rows.reduce((acc, row) => acc + row.values.reduce((a, one) => a + one, 0), 0);

  return {
    form: form as HeatGridForm,
    title: reqText(raw.title, 'heat-grid: input.title'),
    stamp: optText(raw.stamp, 'heat-grid: input.stamp'),
    unit,
    weekdays,
    rows: built,
    keyItems,
    facts: optFacts(raw.facts),
    note: optText(raw.note, 'heat-grid: input.note'),
    max,
    ariaLabel: '合计 ' + String(total) + unitText
      + (peakAt === '' ? '' : '，峰值 ' + peakAt + ' ' + String(max) + unitText),
    extraClass: optExtraClass(raw.extraClass, 'heat-grid: input.extraClass'),
  };
}
