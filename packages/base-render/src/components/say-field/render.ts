/** say-field · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 一句话表单的**一格**（分类／金额／备注／时间…）——
 *
 *  它是什么：一个 <label> 抱住「字段名（可带必填星）＋ 一个输入件」，即原型 `.say-field`
 *  （判地＝`docs/skills/skill-bill/proto/say-collect/x01-记支出-采集-v2.3.html` 的内嵌 <style>）。
 *  它替掉哪几种错法：
 *   · 各技能各自拼 <label><span><input> —— 标签宽度／触控下限／禁用态三处各写一份，
 *     同一页上两族字段长得不一样；
 *   · 必填只靠颜色（那枚星没有字面语义）、禁用只改透明度（读不出「它现在不能改」）；
 *   · 缺 `label` ／缺 `control` 时静默返空串 —— 页面上少一格，却没人报错。
 *  它不管什么：不管校验（这一格合不合法由技能侧判）、不管取值（`value` 只是照抄进标记）、
 *  不管表单容器（外层 `.say-form` 的几何落在 `sayFieldSlot('form')` 上，本件不产出那个容器）、
 *  不管焦点（本件没有运行时段）。
 */
import { esc } from '../shared/escape.js';
import { assertDenseArray, assertPlainObject, badInput, optText, reqText } from '../shared/validate.js';

/** 本件的类名根（**常量只住这里**：样式从这里取，不各写一份）。 */
export const SAY_FIELD_CLASS = 'ilife-block-say-field';
/** 输入件闭集（一格一只）。 */
export const SAY_FIELD_CONTROLS = ['input', 'select'] as const;
export type SayFieldControl = (typeof SAY_FIELD_CONTROLS)[number];
/** `input` 那一支的类型闭集（`inputType` 只许取这里面的值）。 */
export const SAY_FIELD_INPUT_TYPES = ['text', 'number', 'date', 'time', 'tel', 'email', 'search'] as const;
export type SayFieldInputType = (typeof SAY_FIELD_INPUT_TYPES)[number];
/** 槽位闭集（`form` 是外层容器那一格：本件标出类名，容器由调用方产出）。 */
export const SAY_FIELD_SLOTS = ['form', 'lbl', 'req', 'ctl', 'hint'] as const;
export type SayFieldSlot = (typeof SAY_FIELD_SLOTS)[number];
/** 槽类名（唯一拼法）。 */
export function sayFieldSlot(slot: SayFieldSlot, prefix = 'ilife-'): string {
  return prefix + 'block-say-field-' + slot;
}
/** 一格候选（`select` 用；占位项就是 `value: ''` 那一条）。 */
export interface SayFieldOption {
  readonly value: string;
  readonly label: string;
}
/** say-field 入参（10 位）。 */
export interface SayFieldInput {
  /** 字段名（如「分类」；必填那枚星不带在它里面）。 */
  readonly label: string;
  /** 必填：在字段名后出一枚星（它是**标记**；拦不拦提交由技能侧判）。 */
  readonly required?: boolean;
  /** 输入件（`input` ／ `select`）。 */
  readonly control: SayFieldControl;
  /** 表单件名（`name` 属性；不给就不写这一条）。 */
  readonly name?: string;
  /** 已给的取值（**照抄**进标记；空串也算给了——原型里占位项就是 `value=""`）。 */
  readonly value?: string;
  /** `select` 的候选（非空数组，逐项 `{value, label}`；`input` 上不许给）。 */
  readonly options?: readonly SayFieldOption[];
  /** `input` 的 `type`（缺省 `text`；闭集见 `SAY_FIELD_INPUT_TYPES`）。 */
  readonly inputType?: SayFieldInputType;
  /** 这一格下面的提示行（占满一整行；说不出就别放它）。 */
  readonly hint?: string;
  /** 这一格现在改不了（出 `disabled`）。 */
  readonly disabled?: boolean;
  /** 这一格现在填得不对（输入件挂 `is-bad`；除色之外还有描边这一样，见样式段）。 */
  readonly bad?: boolean;
}
/** 归一化后的入参（内部形态）。 */
export interface SayFieldModel {
  readonly label: string;
  readonly required: boolean;
  readonly control: SayFieldControl;
  readonly name?: string;
  readonly value?: string;
  readonly options: readonly SayFieldOption[];
  readonly inputType: SayFieldInputType | undefined;
  readonly hint?: string;
  readonly disabled: boolean;
  readonly bad: boolean;
}
/** 根对象只许带的键（未知键一律拒：静默吞掉＝调用方拼错字段名还绿）。 */
const ROOT_KEYS: readonly string[] = ['label', 'required', 'control', 'name', 'value',
  'options', 'inputType', 'hint', 'disabled', 'bad'];
/** 一条候选只许带的键。 */
const OPTION_KEYS: readonly string[] = ['value', 'label'];

function assertKeys(value: object, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) badInput(field + ' 不认识这个键：' + key);
  }
}
/** 可选布尔（本件与 `say-opt` 各持一份：`shared/validate.ts` 不在 #1114 的写集里，不许顺手改它）。 */
function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔值');
  return value;
}
/** 可选文本，但**空串算给了**（`value` 专用：原型里占位项就是 `value=""`，
 *  按 `optText` 的「空串＝未给」读会**丢一态**——占位项那一条选中不了）。 */
function optRawText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') badInput(field + ' 必须是字符串');
  return value;
}
/** `select` 的候选表（非空、无洞、逐项两键、值不重）。 */
function normalizeOptions(value: unknown, field: string): readonly SayFieldOption[] {
  if (value === undefined) badInput(field + ' 必须给（control=select 的格子没有候选就选不了）');
  if (!Array.isArray(value)) badInput(field + ' 必须是数组');
  const list = value as readonly unknown[];
  if (list.length === 0) badInput(field + ' 一枚候选都没有（要占位项就给 value 为空串的那一枚）');
  assertDenseArray(list, field);
  const out: SayFieldOption[] = [];
  const seen = new Set<string>();
  list.forEach((one, i) => {
    const at = field + '[' + String(i) + ']';
    assertPlainObject(one, at);
    const o = one as Record<string, unknown>;
    assertKeys(o, OPTION_KEYS, at);
    if (typeof o.value !== 'string') badInput(at + '.value 必须是字符串（占位项写空串）');
    if (seen.has(o.value)) badInput(at + '.value 与前面某一条重了：' + JSON.stringify(o.value));
    seen.add(o.value);
    out.push({ value: o.value, label: reqText(o.label, at + '.label') });
  });
  return out;
}
/** 入参归一化（唯一入口：`renderSayField` 只吃它产出的模型）。 */
export function normalizeSayField(input: unknown): SayFieldModel {
  assertPlainObject(input, 'renderSayField: input');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (/^on/i.test(k)) badInput('renderSayField: input 不得含内联事件字段：' + k);
  assertKeys(raw, ROOT_KEYS, 'renderSayField: input');
  const control = raw.control;
  if (!(SAY_FIELD_CONTROLS as readonly unknown[]).includes(control)) {
    badInput('renderSayField: input.control 必须是 ' + SAY_FIELD_CONTROLS.join('／') + ' 之一');
  }
  const kind = control as SayFieldControl;
  if (kind === 'select') {
    if (raw.inputType !== undefined) badInput("renderSayField: control 是 'select' 时不带 inputType（那一支的类型是 select 自己）");
    if (raw.options === undefined) badInput('renderSayField: input.options 必须给（select 的候选）');
  } else {
    if (raw.options !== undefined) badInput("renderSayField: control 是 'input' 时不带 options（那是 select 的候选）");
    if (raw.inputType !== undefined && !(SAY_FIELD_INPUT_TYPES as readonly unknown[]).includes(raw.inputType)) {
      badInput('renderSayField: input.inputType 必须是 ' + SAY_FIELD_INPUT_TYPES.join('／') + ' 之一');
    }
  }
  const options = kind === 'select' ? normalizeOptions(raw.options, 'renderSayField: input.options') : [];
  const value = optRawText(raw.value, 'renderSayField: input.value');
  if (value !== undefined && kind === 'select' && !options.some((o) => o.value === value)) {
    badInput('renderSayField: input.value 不在 options 里（那一条选不中）：' + JSON.stringify(value));
  }
  return {
    label: reqText(raw.label, 'renderSayField: input.label'),
    required: optBool(raw.required, 'renderSayField: input.required') === true,
    control: kind,
    name: optText(raw.name, 'renderSayField: input.name'),
    value,
    options,
    inputType: kind === 'select' ? undefined
      : (raw.inputType === undefined ? 'text' : raw.inputType as SayFieldInputType),
    hint: optText(raw.hint, 'renderSayField: input.hint'),
    disabled: optBool(raw.disabled, 'renderSayField: input.disabled') === true,
    bad: optBool(raw.bad, 'renderSayField: input.bad') === true,
  };
}
/** 输入件的共用属性（`name` ／ `disabled` ／ `aria-label`）。 */
function controlAttrs(m: SayFieldModel): string[] {
  const out: string[] = [];
  if (m.name !== undefined) out.push('name="' + esc(m.name) + '"');
  if (m.disabled) out.push('disabled');
  // 包着输入件的 <label> 已经给了可读名；这一条是判地上就有的**显式**名（去掉必填星那段）。
  out.push('aria-label="' + esc(m.label) + '"');
  return out;
}
/** 输入件的类名（含 `is-bad` 那一档）。 */
function controlClass(m: SayFieldModel): string {
  return sayFieldSlot('ctl') + (m.bad ? ' is-bad' : '');
}
/** `input` 那一支。 */
function inputHtml(m: SayFieldModel): string {
  const attrs = ['type="' + esc(m.inputType === undefined ? 'text' : m.inputType) + '"'];
  if (m.value !== undefined) attrs.push('value="' + esc(m.value) + '"');
  return '<input class="' + controlClass(m) + '" ' + attrs.concat(controlAttrs(m)).join(' ') + '>';
}
/** `select` 那一支（`value` 命中的那一条带 `selected`）。 */
function selectHtml(m: SayFieldModel): string {
  const opts = m.options.map((o) => '<option value="' + esc(o.value) + '"'
    + (m.value !== undefined && o.value === m.value ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');
  return '<select class="' + controlClass(m) + '" ' + controlAttrs(m).join(' ') + '>' + opts + '</select>';
}
/** 渲染一格（纯函数：同样入参恒产同样字节；转义只经 `shared/escape.ts`）。 */
export function renderSayField(input: unknown): string {
  const m = normalizeSayField(input);
  const star = m.required ? ' <i class="' + sayFieldSlot('req') + '">*</i>' : '';
  const parts: string[] = ['<label class="' + SAY_FIELD_CLASS + '">'];
  parts.push('<span class="' + sayFieldSlot('lbl') + '">' + esc(m.label) + star + '</span>');
  parts.push(m.control === 'select' ? selectHtml(m) : inputHtml(m));
  if (m.hint !== undefined) parts.push('<span class="' + sayFieldSlot('hint') + '">' + esc(m.hint) + '</span>');
  parts.push('</label>');
  return parts.join('');
}
