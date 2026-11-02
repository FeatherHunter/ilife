/** number-stepper · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 形态 A「标准：加减＋常用值排」——
 *
 *  第一行是「这是什么数」（标签 ＋ 右上状态字），第二行是 **`− n ＋` 三个可点区**，
 *  第三行是一排常用值（点一下直接落到那一档），最后是口径行。本形态的两条硬口径：
 *   · 三枚可点区**各自 ≥44×44**，而且**不做连体**（相邻留 8px 缝：连体键在手机上最容易被误点）；
 *   · 值位是一枚按钮（第三个可点区）：点它就在**同一格里**换成数字输入框，用来填一个精确数。
 *
 *  字这一档落在状态字上（`已到下限`／`已到上限`／`未设置`／`更新中`）——状态不只靠颜色：
 *  小票纸与大字报刊两套皮肤里 `accent` 已接近墨色，只靠底色深浅根本读不出"还能不能再按"。
 */
import { esc } from '../shared/escape.js';
import {
  NUMBER_STEPPER_AT_MAX,
  NUMBER_STEPPER_AT_MIN,
  NUMBER_STEPPER_CLASS,
  NUMBER_STEPPER_DEC_GLYPH,
  NUMBER_STEPPER_FORMS,
  NUMBER_STEPPER_INC_GLYPH,
  NUMBER_STEPPER_LOADING,
  NUMBER_STEPPER_MISSING,
  NUMBER_STEPPER_NAME_ATTR,
  NUMBER_STEPPER_QUICK_ATTR,
  NUMBER_STEPPER_QUICK_LABEL,
  NUMBER_STEPPER_STATE_ATTR,
  NUMBER_STEPPER_UNSET,
  NUMBER_STEPPER_LABEL_ATTR,
  NUMBER_STEPPER_ACT_ATTR,
  NUMBER_STEPPER_DECIMALS_ATTR,
  NUMBER_STEPPER_DISABLED_ATTR,
  NUMBER_STEPPER_HIT_ATTR,
  NUMBER_STEPPER_LOADING_ATTR,
  NUMBER_STEPPER_MAX_ATTR,
  NUMBER_STEPPER_MIN_ATTR,
  NUMBER_STEPPER_STEP_ATTR,
  NUMBER_STEPPER_UNIT_ATTR,
  NUMBER_STEPPER_VALUE_ATTR,
  numberStepperSlot,
  type NumberStepperForm,
} from './attrs.js';
import { normalizeNumberStepper, type NumberStepperModel } from './model.js';
import { m } from '../../entries/index.js';

/** 千分位分组：`1234.5` → `1,234.5`（本仓读数一律分组，与账目／热量同一条口径）。 */
function grouped(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 值 → 显示字：先按 `step` 推出来的小数位定好，再去掉多余的 0（`2.0` → `2`，`1.50` → `1.5`）。 */
export function formatStepperValue(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const trimmed = decimals === 0 ? fixed : fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  const dot = trimmed.indexOf('.');
  return dot < 0 ? grouped(trimmed) : grouped(trimmed.slice(0, dot)) + trimmed.slice(dot);
}

/** 值 ＋ 单位连读（`1.5 份`／`350 g`）——`aria-label` 与状态字都用这一份口径。 */
function valueWord(value: number | null, unit: string | undefined, decimals: number): string {
  const shown = value === null ? NUMBER_STEPPER_MISSING : formatStepperValue(value, decimals);
  return unit === undefined ? shown : shown + ' ' + unit;
}

/** 右上状态字：更新中 → 未设置 → 已到下限／上限 → 不出（**四档是闭集外的空档，不是颜色**）。 */
function stateWord(model: NumberStepperModel): string {
  if (model.loading) return NUMBER_STEPPER_LOADING();
  if (model.value === null) return NUMBER_STEPPER_UNSET();
  if (model.value <= model.min) return NUMBER_STEPPER_AT_MIN();
  if (model.value >= model.max) return NUMBER_STEPPER_AT_MAX();
  return '';
}

/** 第一行：标签（左）＋ 状态字（右）。状态字是**字**这一档的落点（不只靠颜色）。 */
function headHtml(model: NumberStepperModel): string {
  const state = stateWord(model);
  const parts: string[] = ['<div class="' + numberStepperSlot('head') + '">'];
  if (model.label !== undefined) {
    parts.push('<span class="' + numberStepperSlot('label') + '">' + esc(model.label) + '</span>');
  }
  if (state !== '') {
    parts.push('<span class="' + numberStepperSlot('state') + '" ' + NUMBER_STEPPER_STATE_ATTR + '="'
      + esc(state) + '">' + esc(state) + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 错误说明的锚（控件 `aria-describedby` 指向它）：同一页里按机器键区分。 */
function errorId(name: string): string {
  return NUMBER_STEPPER_CLASS + '-' + name + '-error';
}

/** 可点区的「不能按」口径：`disabled` 是真禁用（原生键）；`loading` 期只挂 `aria-disabled`
 *  ＋ `tabindex="-1"`，由运行时段拦下点击（**原地换字、宽度锁住**，不让脏点击串成两次变更）。 */
function hitState(model: NumberStepperModel): string {
  if (model.disabled) return ' disabled aria-disabled="true"';
  if (model.loading) return ' aria-disabled="true" tabindex="-1"';
  return '';
}

/** `− n ＋` 三个可点区。三枚都带 `data-ilife-stepper-hit`（判据按它量触控目标 ≥44×44）。 */
function controlsHtml(model: NumberStepperModel): string {
  const stepWord = formatStepperValue(model.step, model.decimals);
  const unit = model.unit === undefined ? '' : ' ' + model.unit;
  const described = model.error === undefined && model.disabledReason === undefined
    ? '' : ' aria-describedby="' + esc(errorId(model.name)) + '"';
  const state = hitState(model);

  const decLabel = m('base-render.components-number-stepper-render.c001', { p0: String(stepWord), p1: String(unit) });
  const incLabel = m('base-render.components-number-stepper-render.c002', { p0: String(stepWord), p1: String(unit) });
  const labelText = model.label === undefined ? m('base-render.components-number-stepper-render.c003') : model.label;
  const valueLabel = m('base-render.components-number-stepper-render.c004', {
    p0: String(labelText),
    p1: String(valueWord(model.value, model.unit, model.decimals)),
  });

  const parts: string[] = ['<div class="' + numberStepperSlot('controls') + '">'];
  parts.push('<button type="button" class="' + numberStepperSlot('dec') + '"'
    + ' ' + NUMBER_STEPPER_HIT_ATTR + '="dec" ' + NUMBER_STEPPER_ACT_ATTR + '="dec"'
    + ' aria-label="' + esc(decLabel) + '"' + described + state + '>'
    + esc(NUMBER_STEPPER_DEC_GLYPH) + '</button>');
  parts.push('<button type="button" class="' + numberStepperSlot('value') + '"'
    + ' ' + NUMBER_STEPPER_HIT_ATTR + '="value" ' + NUMBER_STEPPER_ACT_ATTR + '="edit"'
    + ' aria-label="' + esc(valueLabel) + '"' + described + state + '>'
    + '<b class="' + numberStepperSlot('number') + '">'
    + esc(model.value === null ? NUMBER_STEPPER_MISSING : formatStepperValue(model.value, model.decimals))
    + '</b>'
    + (model.unit === undefined ? '' : '<small class="' + numberStepperSlot('unit') + '">' + esc(model.unit) + '</small>')
    + '</button>');
  parts.push('<button type="button" class="' + numberStepperSlot('inc') + '"'
    + ' ' + NUMBER_STEPPER_HIT_ATTR + '="inc" ' + NUMBER_STEPPER_ACT_ATTR + '="inc"'
    + ' aria-label="' + esc(incLabel) + '"' + described + state + '>'
    + esc(NUMBER_STEPPER_INC_GLYPH) + '</button>');
  parts.push('</div>');
  return parts.join('');
}

/** 常用值那一排：当前值命中哪一枚，哪一枚就是 `aria-pressed="true"`（形＋色一起给）。 */
function quickHtml(model: NumberStepperModel): string {
  if (model.presets.length === 0) return '';
  const state = hitState(model);
  const parts: string[] = ['<div class="' + numberStepperSlot('quick') + '">'];
  parts.push('<span class="' + numberStepperSlot('quickLabel') + '">' + esc(NUMBER_STEPPER_QUICK_LABEL()) + '</span>');
  for (const preset of model.presets) {
    const pressed = model.value !== null && Math.abs(model.value - preset) < 1e-9;
    parts.push('<button type="button" class="' + numberStepperSlot('preset') + '"'
      + ' ' + NUMBER_STEPPER_HIT_ATTR + '="preset" ' + NUMBER_STEPPER_ACT_ATTR + '="quick"'
      + ' ' + NUMBER_STEPPER_QUICK_ATTR + '="' + esc(String(preset)) + '"'
      + ' aria-pressed="' + (pressed ? 'true' : 'false') + '"' + state
      + '>' + esc(formatStepperValue(preset, model.decimals)) + '</button>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 说明行：错误说明（`error`）与禁用原因（`disabledReason`）各占一行，**都能被控件引用到**。 */
function notesHtml(model: NumberStepperModel): string {
  const parts: string[] = [];
  if (model.error !== undefined) {
    parts.push('<p class="' + numberStepperSlot('error') + '" id="' + esc(errorId(model.name)) + '" role="alert">'
      + esc(model.error) + '</p>');
  } else if (model.disabled && model.disabledReason !== undefined) {
    /* 禁用时也留一个可被 `aria-describedby` 指到的锚（否则读屏器只报"不可用"，不报为什么）。 */
    parts.push('<p class="' + numberStepperSlot('error') + '" id="' + esc(errorId(model.name)) + '">'
      + esc(model.disabledReason) + '</p>');
  }
  if (model.caliber !== undefined) {
    parts.push('<p class="' + numberStepperSlot('caliber') + '">' + esc(model.caliber) + '</p>');
  }
  return parts.join('');
}

/** 形态 A 的骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
function renderStandard(model: NumberStepperModel): string {
  return headHtml(model) + controlsHtml(model) + quickHtml(model) + notesHtml(model);
}

const SKELETONS: Readonly<Record<NumberStepperForm, (m: NumberStepperModel) => string>> = {
  standard: renderStandard,
};

/** 渲染数量步进（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderNumberStepper(input: unknown): string {
  const model = normalizeNumberStepper(input);
  const cls = [NUMBER_STEPPER_CLASS, 'is-' + model.form];
  if (model.value === null) cls.push('is-unset');
  if (model.disabled) cls.push('is-disabled');
  if (model.loading) cls.push('is-loading');
  if (model.error !== undefined) cls.push('is-invalid');
  if (model.extraClass !== undefined) cls.push(model.extraClass);

  const attrs: string[] = [
    'class="' + esc(cls.join(' ')) + '"',
    NUMBER_STEPPER_NAME_ATTR + '="' + esc(model.name) + '"',
    NUMBER_STEPPER_VALUE_ATTR + '="' + esc(model.value === null ? '' : String(model.value)) + '"',
    NUMBER_STEPPER_MIN_ATTR + '="' + esc(String(model.min)) + '"',
    NUMBER_STEPPER_MAX_ATTR + '="' + esc(String(model.max)) + '"',
    NUMBER_STEPPER_STEP_ATTR + '="' + esc(String(model.step)) + '"',
    NUMBER_STEPPER_DECIMALS_ATTR + '="' + esc(String(model.decimals)) + '"',
  ];
  if (model.unit !== undefined) attrs.push(NUMBER_STEPPER_UNIT_ATTR + '="' + esc(model.unit) + '"');
  if (model.label !== undefined) attrs.push(NUMBER_STEPPER_LABEL_ATTR + '="' + esc(model.label) + '"');
  if (model.disabled) attrs.push(NUMBER_STEPPER_DISABLED_ATTR + '="1"');
  if (model.loading) attrs.push(NUMBER_STEPPER_LOADING_ATTR + '="1"');
  return '<div ' + attrs.join(' ') + '>' + SKELETONS[model.form](model) + '</div>';
}
