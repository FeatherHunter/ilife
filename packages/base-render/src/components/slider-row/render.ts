/** slider-row · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 形态 A「滑块＋常用档＋加减」——
 *
 *  第一行是「在调什么」（标签 ＋ 状态字 ＋ **右侧那个大数字**），第二行是 `− 〔轨道〕 ＋`，
 *  第三行是一排常用档，最后一行口径。三条硬口径：
 *   · **右侧的大数字永远同步**：拖动、按键、点档三条路都由运行时段写同一枚 `-number`；
 *   · 轨道底下画「底 ＋ 已填」两段（宽度内联写死，与 `scale-bar` 同一手法），上面压一枚原生 `range`
 *     —— 键盘可达、读屏器可读都是原生给的，不用自己造；
 *   · 两端键与常用档各自 ≥44×44，相邻留 8px 缝（连体键在手机上最容易被误点）。
 */
import { esc } from '../shared/escape.js';
import {
  SLIDER_ROW_ACT_ATTR,
  SLIDER_ROW_AT_MAX,
  SLIDER_ROW_AT_MIN,
  SLIDER_ROW_CLASS,
  SLIDER_ROW_COMMIT_ATTR,
  SLIDER_ROW_DECIMALS_ATTR,
  SLIDER_ROW_DISABLED_ATTR,
  SLIDER_ROW_FILL_ATTR,
  SLIDER_ROW_HIT_ATTR,
  SLIDER_ROW_INPUT_ATTR,
  SLIDER_ROW_LABEL_ATTR,
  SLIDER_ROW_LOADING_ATTR,
  SLIDER_ROW_LOADING,
  SLIDER_ROW_MAX_ATTR,
  SLIDER_ROW_MIN_ATTR,
  SLIDER_ROW_MISSING,
  SLIDER_ROW_NAME_ATTR,
  SLIDER_ROW_OUT_ATTR,
  SLIDER_ROW_PRESET_ATTR,
  SLIDER_ROW_STATE_ATTR,
  SLIDER_ROW_STEP_ATTR,
  SLIDER_ROW_UNIT_ATTR,
  SLIDER_ROW_UNSET,
  SLIDER_ROW_VALUE_ATTR,
  sliderRowSlot,
  type SliderRowForm,
} from './attrs.js';
import { normalizeSliderRow, type SliderRowModel } from './model.js';
import { m } from '../../entries/index.js';

/** 千分位分组：`1800` → `1,800`（本仓读数一律分组）。 */
function grouped(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 值 → 显示字（按 `step` 的小数位定好后再去掉多余的 0：`2.0` → `2`）。 */
export function formatSliderValue(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const trimmed = decimals === 0 ? fixed : fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  const dot = trimmed.indexOf('.');
  return dot < 0 ? grouped(trimmed) : grouped(trimmed.slice(0, dot)) + trimmed.slice(dot);
}

/** 已填比例 → 宽度串（`333` → `33.3`，`1000` → `100`）——内联写进 `-fill` 的 `style`。 */
export function fillPercent(permille: number): string {
  return String(permille / 10);
}

/** 值 ＋ 单位连读（`1,800 卡`）——`aria-valuetext`、状态字、`aria-label` 都用这一份口径。 */
function valueWord(value: number | null, unit: string | undefined, decimals: number): string {
  const shown = value === null ? SLIDER_ROW_MISSING : formatSliderValue(value, decimals);
  return unit === undefined ? shown : shown + ' ' + unit;
}

/** 状态字：更新中 → 未设置 → 已到下限／上限 → 不出。 */
function stateWord(model: SliderRowModel): string {
  if (model.loading) return SLIDER_ROW_LOADING();
  if (model.value === null) return SLIDER_ROW_UNSET();
  if (model.value <= model.min) return SLIDER_ROW_AT_MIN();
  if (model.value >= model.max) return SLIDER_ROW_AT_MAX();
  return '';
}

/** 错误说明的锚（控件 `aria-describedby` 指向它）。 */
function errorId(name: string): string {
  return SLIDER_ROW_CLASS + '-' + name + '-error';
}

/** 可点区的「不能按」口径（同 `number-stepper`：禁用是真禁用，更新中只挂 `aria-disabled`）。 */
function hitState(model: SliderRowModel): string {
  if (model.disabled) return ' disabled aria-disabled="true"';
  if (model.loading) return ' aria-disabled="true" tabindex="-1"';
  return '';
}

/** 第一行：标签 ＋ 状态字 ＋ 右侧的大数字（`margin-left:auto` 顶到右缘）。 */
function headHtml(model: SliderRowModel): string {
  const state = stateWord(model);
  const parts: string[] = ['<div class="' + sliderRowSlot('head') + '">'];
  if (model.label !== undefined) {
    parts.push('<span class="' + sliderRowSlot('label') + '">' + esc(model.label) + '</span>');
  }
  if (state !== '') {
    parts.push('<span class="' + sliderRowSlot('state') + '" ' + SLIDER_ROW_STATE_ATTR + '="' + esc(state) + '">'
      + esc(state) + '</span>');
  }
  parts.push('<output class="' + sliderRowSlot('value') + '" ' + SLIDER_ROW_OUT_ATTR + '="">'
    + '<b class="' + sliderRowSlot('number') + '">'
    + esc(model.value === null ? SLIDER_ROW_MISSING : formatSliderValue(model.value, model.decimals)) + '</b>'
    + (model.unit === undefined ? '' : '<small class="' + sliderRowSlot('unit') + '">' + esc(model.unit) + '</small>')
    + '</output>');
  parts.push('</div>');
  return parts.join('');
}

/** 轨道那一排：− 键 ＋ 轨道 ＋ ＋ 键。轨道底下两段（底／已填），上面压一枚原生 `range`。 */
function rowHtml(model: SliderRowModel): string {
  const stepWord = formatSliderValue(model.step, model.decimals);
  const unit = model.unit === undefined ? '' : ' ' + model.unit;
  const described = model.error === undefined && model.disabledReason === undefined
    ? '' : ' aria-describedby="' + esc(errorId(model.name)) + '"';
  const state = hitState(model);
  const label = model.label === undefined ? m('base-render.components-slider-row-render.c001') : model.label;

  const parts: string[] = ['<div class="' + sliderRowSlot('row') + '">'];
  parts.push('<button type="button" class="' + sliderRowSlot('dec') + '"'
    + ' ' + SLIDER_ROW_HIT_ATTR + '="dec" ' + SLIDER_ROW_ACT_ATTR + '="dec"'
    + ' aria-label="' + esc(m('base-render.components-slider-row-render.c002', { word: stepWord + unit })) + '"' + described + state + '>−</button>');
  parts.push('<span class="' + sliderRowSlot('track') + '">'
    + '<span class="' + sliderRowSlot('base') + '" aria-hidden="true"></span>'
    + '<span class="' + sliderRowSlot('fill') + '" aria-hidden="true" style="width: '
    + esc(fillPercent(model.fillPermille)) + '%"></span>'
    + '<input class="' + sliderRowSlot('input') + '" ' + SLIDER_ROW_INPUT_ATTR + '="" type="range"'
    + ' min="' + esc(String(model.min)) + '" max="' + esc(String(model.max)) + '" step="' + esc(String(model.step)) + '"'
    + ' value="' + esc(String(model.value === null ? model.min : model.value)) + '"'
    + ' aria-label="' + esc(label) + '"'
    + (model.value === null ? '' : ' aria-valuetext="' + esc(valueWord(model.value, model.unit, model.decimals)) + '"')
    + (model.disabled ? ' disabled aria-disabled="true"' : '')
    + (model.loading ? ' aria-disabled="true" tabindex="-1"' : '')
    + '></span>');
  parts.push('<button type="button" class="' + sliderRowSlot('inc') + '"'
    + ' ' + SLIDER_ROW_HIT_ATTR + '="inc" ' + SLIDER_ROW_ACT_ATTR + '="inc"'
    + ' aria-label="' + esc(m('base-render.components-slider-row-render.c003', { word: stepWord + unit })) + '"' + described + state + '>＋</button>');
  parts.push('</div>');
  return parts.join('');
}

/** 常用档那一排：当前值命中哪一枚，哪一枚 `aria-pressed="true"`（实心反白 ＋ 加粗）。 */
function presetsHtml(model: SliderRowModel): string {
  if (model.presets.length === 0) return '';
  const state = hitState(model);
  const parts: string[] = ['<div class="' + sliderRowSlot('presets') + '">'];
  for (const preset of model.presets) {
    const pressed = model.value !== null && Math.abs(model.value - preset) < 1e-9;
    parts.push('<button type="button" class="' + sliderRowSlot('preset') + '"'
      + ' ' + SLIDER_ROW_HIT_ATTR + '="preset" ' + SLIDER_ROW_ACT_ATTR + '="preset"'
      + ' ' + SLIDER_ROW_PRESET_ATTR + '="' + esc(String(preset)) + '"'
      + ' aria-pressed="' + (pressed ? 'true' : 'false') + '"' + state
      + '>' + esc(formatSliderValue(preset, model.decimals)) + '</button>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 说明行：错误说明（`error`）与禁用原因（`disabledReason`）各占一行，都能被控件引用到。 */
function notesHtml(model: SliderRowModel): string {
  const parts: string[] = [];
  if (model.error !== undefined) {
    parts.push('<p class="' + sliderRowSlot('error') + '" id="' + esc(errorId(model.name)) + '" role="alert">'
      + esc(model.error) + '</p>');
  } else if (model.disabled && model.disabledReason !== undefined) {
    parts.push('<p class="' + sliderRowSlot('error') + '" id="' + esc(errorId(model.name)) + '">'
      + esc(model.disabledReason) + '</p>');
  }
  if (model.caliber !== undefined) {
    parts.push('<p class="' + sliderRowSlot('caliber') + '">' + esc(model.caliber) + '</p>');
  }
  return parts.join('');
}

/** 形态 A 的骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
function renderTrack(model: SliderRowModel): string {
  return headHtml(model) + rowHtml(model) + presetsHtml(model) + notesHtml(model);
}

const SKELETONS: Readonly<Record<SliderRowForm, (m: SliderRowModel) => string>> = {
  track: renderTrack,
};

/** 渲染滑块行（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderSliderRow(input: unknown): string {
  const m = normalizeSliderRow(input);
  const cls = [SLIDER_ROW_CLASS, 'is-' + m.form];
  if (m.value === null) cls.push('is-unset');
  if (m.disabled) cls.push('is-disabled');
  if (m.loading) cls.push('is-loading');
  if (m.error !== undefined) cls.push('is-invalid');
  if (m.extraClass !== undefined) cls.push(m.extraClass);

  const attrs: string[] = [
    'class="' + esc(cls.join(' ')) + '"',
    SLIDER_ROW_NAME_ATTR + '="' + esc(m.name) + '"',
    SLIDER_ROW_VALUE_ATTR + '="' + esc(m.value === null ? '' : String(m.value)) + '"',
    SLIDER_ROW_MIN_ATTR + '="' + esc(String(m.min)) + '"',
    SLIDER_ROW_MAX_ATTR + '="' + esc(String(m.max)) + '"',
    SLIDER_ROW_STEP_ATTR + '="' + esc(String(m.step)) + '"',
    SLIDER_ROW_DECIMALS_ATTR + '="' + esc(String(m.decimals)) + '"',
    SLIDER_ROW_FILL_ATTR + '="' + esc(String(m.fillPermille)) + '"',
    /* 已落定值（最后一次派发过变更的那个）：渲染期就等于当前值——`detail.prev` 从它读。 */
    SLIDER_ROW_COMMIT_ATTR + '="' + esc(m.value === null ? '' : String(m.value)) + '"',
  ];
  if (m.unit !== undefined) attrs.push(SLIDER_ROW_UNIT_ATTR + '="' + esc(m.unit) + '"');
  if (m.label !== undefined) attrs.push(SLIDER_ROW_LABEL_ATTR + '="' + esc(m.label) + '"');
  if (m.disabled) attrs.push(SLIDER_ROW_DISABLED_ATTR + '="1"');
  if (m.loading) attrs.push(SLIDER_ROW_LOADING_ATTR + '="1"');
  return '<div ' + attrs.join(' ') + '>' + SKELETONS[m.form](m) + '</div>';
}
