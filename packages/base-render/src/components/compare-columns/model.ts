/** compare-columns · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级：猜出来的骨架会在页面上长成
 *      另一种东西，而调用方以为拿到了本件。
 *   2. **两窗的数值是「数」，不是「串」**：条长按它们算，数字也由它们出——两处同源，才不会有
 *      「条长按 A、数字写 B」这种对不上的对照表。显示串由 `showNumber()` 统一出（千分位、最多两位小数）。
 *   3. **只列两窗都有的项**：交集归调用方算。本件没有「这一侧缺值」这一档——缺一边的项不是对照项，
 *      硬塞进来会让差额的含义变味（差额 ＝ 各共同项之差的和）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  COMPARE_COLUMNS_CALIBER_LABEL,
  COMPARE_COLUMNS_DIFF_LABEL,
  COMPARE_COLUMNS_DOWN,
  COMPARE_COLUMNS_FLAT,
  COMPARE_COLUMNS_FORMS,
  COMPARE_COLUMNS_MINUS,
  COMPARE_COLUMNS_PLUS,
  COMPARE_COLUMNS_SENSES,
  COMPARE_COLUMNS_UP,
  type CompareColumnsDirection,
  type CompareColumnsForm,
  type CompareColumnsSense,
} from './attrs.js';

/** 方向 → 字形。 */
const GLYPHS: Readonly<Record<CompareColumnsDirection, string>> = {
  up: COMPARE_COLUMNS_UP,
  down: COMPARE_COLUMNS_DOWN,
  flat: COMPARE_COLUMNS_FLAT,
};

/** 语气档 → 这一档下「涨／跌」各自是 good 还是 bad（`flat` 永不着色：持平没有方向可言）。 */
const SENSE_TONE: Readonly<Record<CompareColumnsSense, Readonly<Record<'up' | 'down', 'good' | 'bad'>>>> = {
  neutral: { up: 'good', down: 'good' },
  'up-good': { up: 'good', down: 'bad' },
  'down-good': { up: 'bad', down: 'good' },
};

/** 显示串：千分位 ＋ 最多两位小数（尾零去掉）＋ 负号。本件所有数字只经它上屏（一处口径，两列与差额同款）。 */
export function showNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const text = String(Math.abs(rounded));
  const dot = text.indexOf('.');
  const int = dot < 0 ? text : text.slice(0, dot);
  const frac = dot < 0 ? '' : text.slice(dot + 1);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (rounded < 0 ? COMPARE_COLUMNS_MINUS : '') + grouped + (frac === '' ? '' : '.' + frac);
}

/** 条长：这一侧的值 ÷ 两窗共同的最大值（0–100 的一位小数；两窗共用一条刻度才可直比）。 */
function widthOf(value: number, max: number): string {
  if (max <= 0) return '0';
  return String(Math.round((value / max) * 1000) / 10);
}

/** 一行归一化后的形状：显示串与条长都在这里定下来，`render.ts` 只拼标记。 */
export interface CompareColumnsRowModel {
  readonly label: string;
  readonly leftText: string;
  readonly rightText: string;
  readonly leftWidth: string;
  readonly rightWidth: string;
}

/** 归一化后的入参（`render.ts` 只吃它，不再自己碰 `any`）。 */
export interface CompareColumnsModel {
  readonly form: CompareColumnsForm;
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly rows: readonly CompareColumnsRowModel[];
  /** 差额 ＝ 各共同项「右 − 左」之和（四舍五入到两位小数）。 */
  readonly diff: number;
  readonly diffDirection: CompareColumnsDirection;
  /** 差额的方向字形（`aria-hidden` 的 `<i>` 里那一枚）。 */
  readonly diffGlyph: string;
  /** 差额的显示串（带 `＋`／`−` 号；持平不带号）。 */
  readonly diffText: string;
  /** 差额的语气色阶；`undefined` ＝ 不上语义色（缺省 / 持平）。 */
  readonly diffTone?: 'good' | 'bad';
  readonly diffLabel: string;
  readonly caliberLabel: string;
  readonly unit?: string;
  readonly caliber?: string;
  readonly extraClass?: string;
}

/** 必须是**有限数且 ≥ 0**（两窗的金额／次数／热量都不该是负的；负值的条长无从谈起）。 */
function reqAmount(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数（两窗的数值给数、不给串）');
  if (value < 0) badInput(field + ' 必须 ≥ 0（条长按「值 ÷ 两窗最大值」算，负值无长度可言）');
  return value;
}

/** 一行：项名必填非空；两侧各是一个 ≥ 0 的有限数。 */
function rowModel(raw: unknown, index: number): { label: string; left: number; right: number } {
  const field = 'compare-columns: input.rows[' + index + ']';
  assertPlainObject(raw, field);
  const row = raw as Record<string, unknown>;
  return {
    label: reqText(row.label, field + '.label'),
    left: reqAmount(row.left, field + '.left'),
    right: reqAmount(row.right, field + '.right'),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `CompareColumnsModel`。 */
export function normalizeCompareColumns(input: unknown): CompareColumnsModel {
  assertPlainObject(input, 'renderCompareColumns: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? COMPARE_COLUMNS_FORMS[0] : raw.form;
  if (!(COMPARE_COLUMNS_FORMS as readonly unknown[]).includes(form)) {
    badInput('compare-columns: input.form 必须是 ' + COMPARE_COLUMNS_FORMS.join('／') + ' 之一（本件只落地形态 A）');
  }
  const sense = raw.sense === undefined ? COMPARE_COLUMNS_SENSES[0] : raw.sense;
  if (!(COMPARE_COLUMNS_SENSES as readonly unknown[]).includes(sense)) {
    badInput('compare-columns: input.sense 必须是 ' + COMPARE_COLUMNS_SENSES.join('／') + ' 之一');
  }

  const unit = optText(raw.unit, 'compare-columns: input.unit');
  const caliber = optText(raw.caliber, 'compare-columns: input.caliber');
  const extra = optExtraClass(raw.extraClass, 'compare-columns: input.extraClass');
  const leftLabel = reqText(raw.leftLabel, 'compare-columns: input.leftLabel');
  const rightLabel = reqText(raw.rightLabel, 'compare-columns: input.rightLabel');

  const list = raw.rows;
  if (!Array.isArray(list)) badInput('compare-columns: input.rows 必须是数组（只列两窗都有的项）');
  const items = list.map((row, i) => rowModel(row, i));
  const max = items.reduce((acc, r) => Math.max(acc, r.left, r.right), 0);
  const rows: CompareColumnsRowModel[] = items.map((r) => ({
    label: r.label,
    leftText: showNumber(r.left),
    rightText: showNumber(r.right),
    leftWidth: widthOf(r.left, max),
    rightWidth: widthOf(r.right, max),
  }));

  let sum = 0;
  for (const r of items) sum += r.right - r.left;
  const diff = Math.round(sum * 100) / 100;
  const diffDirection: CompareColumnsDirection = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'flat');
  const senseTone = SENSE_TONE[sense as CompareColumnsSense];
  const diffTone = diffDirection === 'flat' || sense === 'neutral' ? undefined : senseTone[diffDirection];

  return {
    form: form as CompareColumnsForm,
    leftLabel,
    rightLabel,
    rows,
    diff,
    diffDirection,
    diffGlyph: GLYPHS[diffDirection],
    diffText: (diff > 0 ? COMPARE_COLUMNS_PLUS : (diff < 0 ? COMPARE_COLUMNS_MINUS : '')) + showNumber(Math.abs(diff)),
    ...(diffTone === undefined ? {} : { diffTone }),
    diffLabel: COMPARE_COLUMNS_DIFF_LABEL,
    caliberLabel: COMPARE_COLUMNS_CALIBER_LABEL,
    ...(unit === undefined ? {} : { unit }),
    ...(caliber === undefined ? {} : { caliber }),
    ...(extra === undefined ? {} : { extraClass: extra }),
  };
}
