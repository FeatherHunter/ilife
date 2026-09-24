/** scale-bar · **渲染**（值／目标进度：同一份数，两种形状）。
 *
 *  —— 刻度条 ——
 *
 *  形状：一条刻度 ＋ 底下一行"左右两端各一句"（左：这一格是多少／占几成；右：离目标差多少）。
 *  两形态：`cells`＝**条形码**（N 格，够几格实几格——不用把数字换算成长度就能数出来）／
 *          `line`＝**细线**（一条填充轨，适合窄位与密集排布）。
 *
 *  它替掉的是哪几种错法：
 *   · 只给一个 `46%` 或一根无刻度的细条 ⇒ 读者没法"数"出还剩几格；
 *   · 超目标时把填充条画到底就不管了（颜色不变、也不说超了多少）；
 *   · 进度条自己带一句话，而那句话本页别处已经说过一遍（本件的两端标签**由调用方给**，
 *     不给就不出——本件不替调用方编文案）。
 *
 *  数值口径：`goal` 必须 > 0（分母为零是调用方的错，不静默兜底）；`value` 可越界，
 *  **不算错**——越界是"超了"，形状上必须看得出来（`is-over` ＋ 满格）。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText } from '../shared/validate.js';

/** 两个形态：`cells`＝条形码（N 格）／`line`＝细线（缺省）。 */
export const SCALE_BAR_VARIANTS = ['cells', 'line'] as const;
export type ScaleBarVariant = (typeof SCALE_BAR_VARIANTS)[number];

/** 条形码档的总格数上下限（格数太少看不出比例、太多在窄屏糊成一片）。 */
const CELLS_MIN = 4;
const CELLS_MAX = 64;
/** 条形码档的总格数缺省值（原型实测：24 格在手机宽度上刚好能逐格数清）。 */
export const SCALE_BAR_DEFAULT_CELLS = 24;

/** 必须是有限数（本组件唯一的数值校验；第二处要用时提为 `shared/` 件）。 */
function reqFinite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput('scale-bar: ' + field + ' 必须是有限数');
  }
  return value;
}

export interface ScaleBarInput {
  /** 当前量（与 `goal` 同单位）。 */
  readonly value: number;
  /** 目标量（**必须 > 0**，作比例的分母）。 */
  readonly goal: number;
  /** 形态；缺省 `line`。 */
  readonly variant?: ScaleBarVariant;
  /** 条形码档的总格数（4–64 的整数）；缺省 24。细线档忽略本项。 */
  readonly cells?: number;
  /** 刻度下左侧那句（如「46% ｜ 860 / 1850 卡」）；不给＝不出。 */
  readonly leftLabel?: string;
  /** 刻度下右侧那句（如「差 990 卡」）；不给＝不出。 */
  readonly rightLabel?: string;
  readonly extraClass?: string;
}

/** 刻度条：值／目标的比例形状。`value` 为 0 ⇒ 全空（不画一格假进度）。 */
export function renderScaleBar(input: ScaleBarInput): string {
  assertPlainObject(input, 'renderScaleBar: input');
  const value = reqFinite(input.value, 'input.value');
  const goal = reqFinite(input.goal, 'input.goal');
  if (goal <= 0) badInput('scale-bar: input.goal 必须大于 0');
  const variant = input.variant ?? 'line';
  if (!(SCALE_BAR_VARIANTS as readonly string[]).includes(variant)) {
    badInput('scale-bar: input.variant 必须是 ' + SCALE_BAR_VARIANTS.join('／') + ' 之一');
  }
  const total = input.cells ?? SCALE_BAR_DEFAULT_CELLS;
  if (!Number.isInteger(total) || total < CELLS_MIN || total > CELLS_MAX) {
    badInput('scale-bar: input.cells 必须是 ' + CELLS_MIN + '–' + CELLS_MAX + ' 的整数');
  }
  const left = optText(input.leftLabel, 'scale-bar: input.leftLabel');
  const right = optText(input.rightLabel, 'scale-bar: input.rightLabel');
  const extra = optExtraClass(input.extraClass, 'scale-bar: input.extraClass');

  const over = value > goal;
  const ratio = value <= 0 ? 0 : Math.min(1, value / goal);
  const p = 'ilife-block-scale-bar-';
  let track: string;
  if (variant === 'cells') {
    // 有值却不足一格时也给一格：**"有"与"没有"必须看得出来**（四舍五入到 0 会把"吃了 5 卡"画成没吃）。
    let on = Math.round(ratio * total);
    if (value > 0 && on === 0) on = 1;
    const segs: string[] = [];
    for (let i = 0; i < total; i += 1) {
      segs.push('<span class="' + p + 'cell' + (i < on ? ' is-on' : '') + '"></span>');
    }
    track = '<div class="' + p + 'track">' + segs.join('') + '</div>';
  } else {
    const width = String(Math.round(ratio * 1000) / 10);
    track = '<div class="' + p + 'track">'
      + '<span class="' + p + 'fill" style="width: ' + width + '%"></span></div>';
  }
  const cap = left === undefined && right === undefined ? ''
    : '<div class="' + p + 'cap">'
      + (left === undefined ? '<span></span>' : '<span class="' + p + 'cap-left">' + esc(left) + '</span>')
      + (right === undefined ? '' : '<span class="' + p + 'cap-right">' + esc(right) + '</span>')
      + '</div>';
  return '<div class="ilife-block-scale-bar is-' + variant + (over ? ' is-over' : '')
    + (extra === undefined ? '' : ' ' + extra) + '">' + track + cap + '</div>';
}
