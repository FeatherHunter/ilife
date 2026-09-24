/** editableValue · **渲染**（纯函数：一个值 → 一段标记；零 DOM、零副作用）。
 *
 *  形态：`<span class="ilife-edit-value …" data-ilife-edit="name" …><button …>值 ＋ 单位 ＋ 铅笔</button></span>`。
 *  用它的是「先看一眼、顺手改一处」的页面；改的行为归 `runtime.ts`（产出 JS 文本），
 *  两者只通过 `attrs.ts` 的名字耦合。
 *
 *  为什么是"值＋铅笔"而不是另挂一颗「改」按钮：值本身即入口（整块是命中区，鼠标／手指同一个大目标），
 *  铅笔只是"可编辑"的通用记号；另一颗按钮会同时带来控件噪声与语义打架（按钮 vs 链接）。
 */
import { esc } from '../shared/escape.js';
import { badInput, optExtraClass, optNumeric, optText, reqText } from '../shared/validate.js';
import {
  EDIT_AFFORDANCE_ATTR, EDIT_AFFORDANCES, EDIT_DISPLAY_ATTR, EDIT_HIT_ATTR, EDIT_KINDS,
  EDIT_KIND_ATTR, EDIT_LABEL_ATTR, EDIT_MAX_ATTR, EDIT_MIN_ATTR, EDIT_NAME_ATTR, EDIT_OPTIONS_ATTR,
  EDIT_PLACEHOLDER_ATTR, EDIT_REQUIRED_ATTR, EDIT_STEP_ATTR, EDIT_UNIT_ATTR, EDIT_VALUE_ATTR,
  EDIT_VALUE_CLASS, EDIT_DISABLED_ATTR,
} from './attrs.js';
import type { EditableValueAffordance, EditableValueInput, EditableValueKind } from './attrs.js';

/** 铅笔图标（13px，`currentColor`）。内联 SVG 是**公共层自产标记**，不含内联事件处理器。 */
const PEN_SVG = '<svg class="' + EDIT_VALUE_CLASS + '-pen" viewBox="0 0 24 24" width="13" height="13" fill="none"'
  + ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
  + ' focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

/** 候选项归一：字符串项 → `{value,label}` 同值；对象项逐字校验。 */
function normalizeOptions(raw: unknown): { value: string; label: string }[] {
  if (!Array.isArray(raw) || raw.length === 0) badInput('renderEditableValue: options 必须是非空数组');
  return raw.map((item, i) => {
    if (typeof item === 'string') {
      if (item === '') badInput('renderEditableValue: options[' + i + '] 不得为空串');
      return { value: item, label: item };
    }
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      badInput('renderEditableValue: options[' + i + '] 必须是字符串或 { value, label }');
    }
    const o = item as { value?: unknown; label?: unknown };
    return {
      value: reqText(o.value, 'renderEditableValue: options[' + i + '].value'),
      label: reqText(o.label, 'renderEditableValue: options[' + i + '].label'),
    };
  });
}

/** ISO 日期（`YYYY-MM-DD`）且**真实存在**——`Date` 会把 `2026-02-31` 静默滚成 3 月 3 日，回读比对才拦得住。 */
function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** 渲染一个就地可编辑值。入参不合规一律 `bad-input`（不静默降级：静默降级会让调用方以为已经生效）。 */
export function renderEditableValue(input: EditableValueInput): string {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) badInput('renderEditableValue: input 必须是对象');
  const name = reqText(input.name, 'renderEditableValue: input.name');
  if (typeof input.value !== 'string') badInput('renderEditableValue: input.value 必须是字符串');
  const value = input.value;
  if (value === '' && input.display === undefined) {
    /* **显式空态**：值可以空（档案里"未设置"就是空），但那时必须自己给显示字——
       否则上屏是一片空白，读的人分不出"没有值"与"这里没渲染出来"。 */
    badInput('renderEditableValue: value 为空串时必须同时给 display（显式空态，如「未设置」）');
  }
  const display = input.display === undefined ? value : input.display;
  if (typeof display !== 'string') badInput('renderEditableValue: input.display 必须是字符串');

  const kind: EditableValueKind = input.kind === undefined ? 'text' : input.kind;
  if (!(EDIT_KINDS as readonly string[]).includes(kind)) {
    badInput('renderEditableValue: input.kind 非法（' + EDIT_KINDS.join('／') + '）：' + String(input.kind));
  }
  const affordance: EditableValueAffordance = input.affordance === undefined ? 'always' : input.affordance;
  if (!(EDIT_AFFORDANCES as readonly string[]).includes(affordance)) {
    badInput('renderEditableValue: input.affordance 非法（' + EDIT_AFFORDANCES.join('／') + '）：' + String(input.affordance));
  }
  if (input.align !== undefined && input.align !== 'left' && input.align !== 'right') {
    badInput('renderEditableValue: input.align 只许 left／right：' + String(input.align));
  }

  const options = input.options === undefined ? undefined : normalizeOptions(input.options);
  if (kind === 'select' && options === undefined) badInput('renderEditableValue: kind=select 必须给 options');
  if (kind !== 'select' && options !== undefined) badInput('renderEditableValue: options 只对 kind=select 有效');
  if (kind === 'select' && options !== undefined && !options.some((o) => o.value === value)) {
    badInput('renderEditableValue: value 不在 options 里（机器值必须命中一项）：' + value);
  }

  /* 值域检查在前、承载性检查在后：kind 与 min／max／step 的搭配本身就是错的，先报那一处。 */
  const min = optNumeric(input.min, 'renderEditableValue: input.min');
  const max = optNumeric(input.max, 'renderEditableValue: input.max');
  const step = optNumeric(input.step, 'renderEditableValue: input.step');
  if (step !== undefined && Number(step) <= 0) badInput('renderEditableValue: input.step 必须大于 0');
  if (min !== undefined && max !== undefined && Number(min) > Number(max)) {
    badInput('renderEditableValue: input.min 不得大于 input.max（' + min + ' > ' + max + '）');
  }
  if ((min !== undefined || max !== undefined || step !== undefined) && kind !== 'number') {
    badInput('renderEditableValue: min／max／step 只对 kind=number 有效');
  }
  if (kind === 'number' && value !== '' && String(Number(value)) !== value) {
    /* 编辑器承载不了就别上屏：`<input type=number>` 对 `1,800` 这种机器值只会留个空框，
       用户一失焦就把原值写成空串（审查席 P1-5）。空串例外＝显式空态（"未设置"）。 */
    badInput('renderEditableValue: kind=number 的 value 必须能直接被数字输入承载（如 1800／1.5／-3，不是 1,800）：' + value);
  }
  if (kind === 'date' && value !== '' && !isIsoDate(value)) {
    badInput('renderEditableValue: kind=date 的 value 必须是空串或 YYYY-MM-DD（真实存在的日期）：' + value);
  }

  const unit = optText(input.unit, 'renderEditableValue: input.unit');
  const label = optText(input.label, 'renderEditableValue: input.label');
  const placeholder = optText(input.placeholder, 'renderEditableValue: input.placeholder');
  const extraClass = optExtraClass(input.extraClass, 'renderEditableValue: input.extraClass');

  const classes = [EDIT_VALUE_CLASS, EDIT_VALUE_CLASS + '--' + kind];
  if (input.align === 'right') classes.push(EDIT_VALUE_CLASS + '--right');
  if (extraClass !== undefined) classes.push(extraClass);

  const attrs: string[] = [
    'class="' + esc(classes.join(' ')) + '"',
    EDIT_NAME_ATTR + '="' + esc(name) + '"',
    EDIT_KIND_ATTR + '="' + esc(kind) + '"',
    EDIT_VALUE_ATTR + '="' + esc(value) + '"',
    EDIT_DISPLAY_ATTR + '="' + esc(display) + '"',
    EDIT_AFFORDANCE_ATTR + '="' + esc(affordance) + '"',
  ];
  if (unit !== undefined) attrs.push(EDIT_UNIT_ATTR + '="' + esc(unit) + '"');
  if (label !== undefined) attrs.push(EDIT_LABEL_ATTR + '="' + esc(label) + '"');
  if (options !== undefined) attrs.push(EDIT_OPTIONS_ATTR + '="' + esc(JSON.stringify(options)) + '"');
  if (placeholder !== undefined) attrs.push(EDIT_PLACEHOLDER_ATTR + '="' + esc(placeholder) + '"');
  if (input.required === true) attrs.push(EDIT_REQUIRED_ATTR + '="1"');
  if (min !== undefined) attrs.push(EDIT_MIN_ATTR + '="' + esc(min) + '"');
  if (max !== undefined) attrs.push(EDIT_MAX_ATTR + '="' + esc(max) + '"');
  if (step !== undefined) attrs.push(EDIT_STEP_ATTR + '="' + esc(step) + '"');
  if (input.disabled === true) attrs.push(EDIT_DISABLED_ATTR + '="1"');

  const hitAttrs: string[] = [EDIT_HIT_ATTR + '=""', 'type="button"', 'class="' + EDIT_VALUE_CLASS + '-hit"'];
  hitAttrs.push(label === undefined ? 'aria-label="改这一个值"' : 'aria-label="改' + esc(label) + '"');
  if (input.disabled === true) hitAttrs.push('disabled', 'aria-disabled="true"');

  const body = '<span class="' + EDIT_VALUE_CLASS + '-text">' + esc(display) + '</span>'
    + (unit === undefined ? '' : '<span class="' + EDIT_VALUE_CLASS + '-unit">' + esc(unit) + '</span>')
    + (input.disabled === true || affordance === 'none' ? '' : PEN_SVG);

  return '<span ' + attrs.join(' ') + '><button ' + hitAttrs.join(' ') + '>' + body + '</button></span>';
}
