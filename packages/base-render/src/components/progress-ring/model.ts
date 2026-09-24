/** progress-ring · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的分母会在页面上长成另一个比例，而调用方以为拿到了本件。
 *   2. **弧长与读数同一份真值**：`ratio` 只算一次，`stroke-dasharray` 的弧长与那句
 *      「已完成 75%」都从它出——两处各算一次迟早走散（判据断的就是这条等式）。
 *   3. 归一化只做「形状」与「算数」：**千分位由本件做**（这是排版），单位口径归调用方。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  PROGRESS_RING_ARC_LEN,
  PROGRESS_RING_FORMS,
  type ProgressRingForm,
  type ProgressRingRow,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一、已算好（`render.ts` 只负责拼标记）。 */
export interface ProgressRingModel {
  readonly form: ProgressRingForm;
  readonly title: string;
  /** 卡头右端那句（时间窗／期数）；不给＝不出。 */
  readonly stamp?: string;
  readonly over: boolean;
  /** 已完成量（原值，供 `aria-label` 与脚注用）。 */
  readonly value: number;
  /** 目标量（原值）。 */
  readonly goal: number;
  /** 值／目标，落在 `[0, 1]`（超目标画满，与 `scale-bar` 的「满格」同一条口径）。 */
  readonly ratio: number;
  /** 已完成的百分数（一位小数，整数不写 `.0`）。 */
  readonly pctText: string;
  /** 填充弧的弧长（px，两位小数）；空格 ＝ `PROGRESS_RING_ARC_LEN`。 */
  readonly dash: number;
  /** 已完成量与目标量的显示串（千分位空格分隔）。 */
  readonly valueText: string;
  readonly goalText: string;
  readonly unit?: string;
  readonly rows: readonly ProgressRingRow[];
  /** 脚注那句人话（超目标时是超目标那句）。 */
  readonly note: string;
  /** 无障碍名（写给读屏的那一句：标题 ＋ 百分数 ＋ 值／目标）。 */
  readonly ariaLabel: string;
  readonly extraClass?: string;
}

/** 必须是有限数（本件唯一的数值校验；第二处要用时提为 `shared/` 件）。 */
function reqFinite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput(field + ' 必须是有限数');
  }
  return value;
}

/** 千分位：每三位插一个空格（与原型墙同款；读数一律 `tabular-nums`，空格不参与对位）。 */
function group(s: string): string {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (i > 0 && (body.length - i) % 3 === 0) out += ' ';
    out += body[i];
  }
  return (neg ? '-' : '') + out;
}

/** 数量 → 给人看的串：整数走千分位；小数最多两位（末尾的 0 去掉）。 */
function fmtQty(n: number): string {
  if (Number.isInteger(n)) return group(String(n));
  const rounded = Math.round(n * 100) / 100;
  const s = String(rounded);
  const dot = s.indexOf('.');
  return group(s.slice(0, dot)) + s.slice(dot);
}

/** 百分数 → 一位小数；整数不写 `.0`（读数上屏的字面量只有这一处）。 */
function fmtPct(ratio: number): string {
  const p = Math.round(ratio * 1000) / 10;
  return String(Number.isInteger(p) ? p : p.toFixed(1));
}

/** 右侧读数列：逐行校验（行必须是对象，名字与值都必须是非空串——缺值写 `—`）。 */
function optRows(value: unknown): readonly ProgressRingRow[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) badInput('progress-ring: input.rows 必须是数组（逐行一枚）');
  return value.map((item, i) => {
    assertPlainObject(item, 'progress-ring: input.rows[' + i + ']');
    const r = item as Record<string, unknown>;
    return {
      label: reqText(r.label, 'progress-ring: input.rows[' + i + '].label'),
      value: reqText(r.value, 'progress-ring: input.rows[' + i + '].value'),
    };
  });
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `ProgressRingModel`，不再自己碰 `any`。 */
export function normalizeProgressRing(input: unknown): ProgressRingModel {
  assertPlainObject(input, 'renderProgressRing: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? PROGRESS_RING_FORMS[0] : raw.form;
  if (!(PROGRESS_RING_FORMS as readonly unknown[]).includes(form)) {
    badInput('progress-ring: input.form 必须是 ' + PROGRESS_RING_FORMS.join('／')
      + ' 之一（本件只落地形态 A「半环 ＋ 环下大字 ＋ 右侧读数」）');
  }

  const value = reqFinite(raw.value, 'progress-ring: input.value');
  if (value < 0) badInput('progress-ring: input.value 不得为负（没做的事不算已完成）');
  const goal = reqFinite(raw.goal, 'progress-ring: input.goal');
  if (goal <= 0) badInput('progress-ring: input.goal 必须大于 0（它就是分母与弧长标尺）');

  const unit = optText(raw.unit, 'progress-ring: input.unit');
  const ratio = value <= 0 ? 0 : Math.min(1, value / goal);
  const over = value > goal;
  const pctText = fmtPct(value / goal);
  const unitText = unit === undefined ? '' : ' ' + unit;
  const valueText = fmtQty(value);
  const goalText = fmtQty(goal);

  let note = optText(raw.note, 'progress-ring: input.note');
  if (over) {
    const overNote = optText(raw.overNote, 'progress-ring: input.overNote');
    const overPct = fmtPct(value / goal - 1);
    note = overNote ?? ('已超出目标 ' + overPct + '%（多 ' + fmtQty(value - goal) + unitText + '）。');
  } else if (note === undefined) {
    note = value === goal
      ? ('正好用满目标（' + goalText + unitText + '）。')
      : ('已用 ' + pctText + '%，还剩 ' + fmtQty(goal - value) + unitText + '。');
  }

  return {
    form: form as ProgressRingForm,
    title: reqText(raw.title, 'progress-ring: input.title'),
    stamp: optText(raw.stamp, 'progress-ring: input.stamp'),
    over,
    value,
    goal,
    ratio,
    pctText,
    /* 弧长与读数同一份真值：`dash / PROGRESS_RING_ARC_LEN` 就是那句百分数。 */
    dash: Math.round(ratio * PROGRESS_RING_ARC_LEN * 100) / 100,
    valueText,
    goalText,
    unit,
    rows: optRows(raw.rows),
    note,
    ariaLabel: '已完成 ' + pctText + '%：'
      + valueText + unitText + ' / ' + goalText + unitText + (over ? '（超目标）' : ''),
    extraClass: optExtraClass(raw.extraClass, 'progress-ring: input.extraClass'),
  };
}
