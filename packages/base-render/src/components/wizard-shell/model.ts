/** wizard-shell · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与本节其余件同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的骨架会在页面上长成另一种东西，而调用方以为拿到了本件；
 *   2. **缺值与空串是两件事**：`value: null`／不给 ＝ 这一问还没答；`value: ''` ＝ 错
 *      （说不出「答的是哪一个」）；
 *   3. 归一化只做「形状」：走到第几问、整趟几问由页面给；本件**不自己推进**（推进是页面的事，
 *      运行时段只把「按了哪一枚」报出去）。
 *
 *  两条「算出来」的读数都住在这里，不住在 `render.ts`：进度那 N 格的状态、读数行次段那句话。
 *  页面给 `aside` 就整句替换（与 `scatter-fit` 的 `note` 同口径）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  WIZARD_SHELL_ASIDE_FIRST,
  WIZARD_SHELL_CONFIRM_TEXT,
  WIZARD_SHELL_DONE_LABEL,
  WIZARD_SHELL_FIELD_KINDS,
  WIZARD_SHELL_FORMS,
  WIZARD_SHELL_LOADING_TEXT,
  WIZARD_SHELL_NEXT_LABEL,
  WIZARD_SHELL_TOTAL_MAX,
  WIZARD_SHELL_TOTAL_MIN,
  type WizardShellAnswer,
  type WizardShellField,
  type WizardShellFieldKind,
  type WizardShellForm,
  type WizardShellOption,
} from './attrs.js';

/** 进度一格的状态：走过／正走／没到。 */
export type WizardSegState = 'done' | 'now' | 'todo';

/** 内部选项类型：每个字段都已校验、已归一。 */
export interface WizardOption {
  readonly value: string;
  readonly title: string;
  readonly desc?: string;
}

/** 内部填空类型。 */
export interface WizardField {
  readonly name: string;
  readonly label: string;
  readonly value?: string;
  readonly hint?: string;
  readonly kind: WizardShellFieldKind;
}

/** 内部类型（`render.ts` 只吃它，不再自己碰 `any`）。 */
export interface WizardShellModel {
  readonly form: WizardShellForm;
  readonly name: string;
  /** **同页实例标识**（`input.id` 给了就用它，否则退成 `name`）：单选组名与件内 `id` 都由它派生。
   *  它管的是"这一份与那一份分得开"；`name` 管的是"事件报的是哪一件"。 */
  readonly instanceKey: string;
  readonly question: string;
  readonly index: number;
  readonly total: number;
  /** 进度那 N 格的状态（长度恒等于 `total`）。 */
  readonly segments: readonly WizardSegState[];
  /** 这一屏出的答法（根属性 `data-ilife-wizard-answer` 的值）。 */
  readonly answer: WizardShellAnswer;
  readonly options: readonly WizardOption[];
  readonly fields: readonly WizardField[];
  /** `null` ＝ 这一问还没答；串 ＝ 已答的机器值（必然命中一个选项）。 */
  readonly value: string | null;
  readonly why?: string;
  readonly aside: string;
  readonly hint?: string;
  readonly nextLabel: string;
  readonly skippable: boolean;
  readonly loading: boolean;
  readonly loadingText: string;
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly error?: string;
  readonly confirmText: string;
  readonly extraClass?: string;
}

/** 可选布尔：只收真布尔（`'yes'`／`1` 一律拒——它们说不出"是不是真的指 true"）。 */
function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

/** 同页实例标识：只许 `[A-Za-z0-9_-]`。
 *  它直接进 `id=`／`name=`，而这两处的**相等**就意味着"认成同一份"（单选组互踢、`aria-*` 指错屏）；
 *  含糊的写法（空格／点／斜杠）在 `id=` 里会被浏览器当成别的形状，两处归一到同一个值的写法就更读不出区别了。 */
function optInstanceId(value: unknown): string | undefined {
  const s = optText(value, 'wizard-shell: input.id');
  if (s === undefined) return undefined;
  if (!/^[A-Za-z0-9_-]+$/.test(s)) {
    badInput('wizard-shell: input.id 只许用字母／数字／`-`／`_`（它直接进件内 id 与单选组名：含糊的写法会与另一份撞名，撞了就是静默互踢）');
  }
  return s;
}

/** 0 起的整数（第几问／一共几问都走它：小数与负数说不出"第几问"）。 */
function reqIndex(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    badInput(field + ' 必须是 0 起的整数');
  }
  return value as number;
}

/** 一个选项：`value`／`title` 必填（机器值与屏上字分离）。 */
function normalizeOption(raw: unknown, index: number): WizardOption {
  assertPlainObject(raw, 'wizard-shell: input.options[' + index + ']');
  const o = raw as WizardShellOption;
  return {
    value: reqText(o.value, 'wizard-shell: input.options[' + index + '].value'),
    title: reqText(o.title, 'wizard-shell: input.options[' + index + '].title'),
    desc: optText(o.desc, 'wizard-shell: input.options[' + index + '].desc'),
  };
}

/** 一格填空：`name`／`label` 必填，`kind` 只认闭集。 */
function normalizeField(raw: unknown, index: number): WizardField {
  assertPlainObject(raw, 'wizard-shell: input.fields[' + index + ']');
  const f = raw as WizardShellField;
  const kind = f.kind === undefined ? WIZARD_SHELL_FIELD_KINDS[0] : f.kind;
  if (!(WIZARD_SHELL_FIELD_KINDS as readonly unknown[]).includes(kind)) {
    badInput('wizard-shell: input.fields[' + index + '].kind 必须是 ' + WIZARD_SHELL_FIELD_KINDS.join('／') + ' 之一');
  }
  return {
    name: reqText(f.name, 'wizard-shell: input.fields[' + index + '].name'),
    label: reqText(f.label, 'wizard-shell: input.fields[' + index + '].label'),
    value: optText(f.value, 'wizard-shell: input.fields[' + index + '].value'),
    hint: optText(f.hint, 'wizard-shell: input.fields[' + index + '].hint'),
    kind: kind as WizardShellFieldKind,
  };
}

/** 数组字段：不给＝空数组；给了不是数组／元素不是对象一律拒。 */
function listOf(raw: unknown, field: string, indexField: string): readonly unknown[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) badInput(field + ' 必须是数组（' + indexField + '）');
  return raw as readonly unknown[];
}

/** 进度那 N 格：`index` 之前走过、`index` 那一格正走、之后没到。 */
function segmentsOf(index: number, total: number): readonly WizardSegState[] {
  const out: WizardSegState[] = [];
  for (let i = 0; i < total; i += 1) out.push(i < index ? 'done' : (i === index ? 'now' : 'todo'));
  return out;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `WizardShellModel`。 */
export function normalizeWizardShell(input: unknown): WizardShellModel {
  assertPlainObject(input, 'renderWizardShell: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? WIZARD_SHELL_FORMS[0] : raw.form;
  if (!(WIZARD_SHELL_FORMS as readonly unknown[]).includes(form)) {
    badInput('wizard-shell: input.form 必须是 ' + WIZARD_SHELL_FORMS.join('／') + ' 之一（本件只落地形态 B「一问一屏」）');
  }

  const name = reqText(raw.name, 'wizard-shell: input.name');
  const question = reqText(raw.question, 'wizard-shell: input.question');
  const index = reqIndex(raw.index, 'wizard-shell: input.index');
  const total = reqIndex(raw.total, 'wizard-shell: input.total');
  /* 次序要紧：先判「一共几问要落在第几问之后」（这条报错能被横切判据的一般文法补上：补成 index ＋ 1），
     再判趟数上限——反过来的话，样例里 total 与 index 同时不合规时，补不到点上。 */
  if (total <= index) {
    badInput('wizard-shell: input.total 必须大于 input.index（第几问要落在一共几问里）');
  }
  if (total < WIZARD_SHELL_TOTAL_MIN || total > WIZARD_SHELL_TOTAL_MAX) {
    badInput('wizard-shell: input.total 必须落在 ' + String(WIZARD_SHELL_TOTAL_MIN) + '…'
      + String(WIZARD_SHELL_TOTAL_MAX) + ' 之间（一问不成"分步"，十几问该拆成几趟）');
  }

  const optionsRaw = listOf(raw.options, 'wizard-shell: input.options', '每个元素是一条选项');
  const fieldsRaw = listOf(raw.fields, 'wizard-shell: input.fields', '每个元素是一格填空');
  if (optionsRaw.length > 0 && fieldsRaw.length > 0) {
    badInput('wizard-shell: input.options 与 input.fields 恰好给一个（选择问给前者，填空问给后者）');
  }

  const options: WizardOption[] = [];
  for (let i = 0; i < optionsRaw.length; i += 1) options.push(normalizeOption(optionsRaw[i], i));
  const seenValue = new Set<string>();
  for (const o of options) {
    if (seenValue.has(o.value)) {
      badInput('wizard-shell: input.options 里机器值重复（这一问按 value 定位答的是哪一个）：' + o.value);
    }
    seenValue.add(o.value);
  }

  const fields: WizardField[] = [];
  for (let i = 0; i < fieldsRaw.length; i += 1) fields.push(normalizeField(fieldsRaw[i], i));
  const seenField = new Set<string>();
  for (const f of fields) {
    if (seenField.has(f.name)) {
      badInput('wizard-shell: input.fields 里字段名重复（事件 detail.fields 按它当键）：' + f.name);
    }
    seenField.add(f.name);
  }

  /* 已答的机器值：`null`／不给 ＝ 未答；串必须命中一个选项（否则"答过了，屏上却没有哪条是选中的"）。 */
  let value: string | null = null;
  const rawValue = raw.value;
  if (rawValue !== undefined && rawValue !== null) {
    if (typeof rawValue !== 'string') badInput('wizard-shell: input.value 必须是字符串或 null');
    if (rawValue === '') badInput('wizard-shell: input.value 不许给空串：没答请给 null');
    if (options.length === 0) badInput('wizard-shell: input.value 只在有选项的那一问上给（这一问没有可选的答法）');
    if (!seenValue.has(rawValue)) badInput('wizard-shell: input.value 必须命中 options 里的一条：' + rawValue);
    value = rawValue;
  }

  const loading = optBool(raw.loading, 'wizard-shell: input.loading') === true;
  const loadingText = optText(raw.loadingText, 'wizard-shell: input.loadingText');
  if (loadingText !== undefined && !loading) {
    badInput('wizard-shell: input.loadingText 只在 loading=true 时给（不推进就换字，读者会以为按坏了）');
  }
  const disabled = optBool(raw.disabled, 'wizard-shell: input.disabled') === true;
  const disabledReason = optText(raw.disabledReason, 'wizard-shell: input.disabledReason');
  if (disabled && disabledReason === undefined) {
    badInput('wizard-shell: disabled=true 时必须给 disabledReason（说不出为什么不能动＝读者只能猜）');
  }
  if (disabledReason !== undefined && !disabled) {
    badInput('wizard-shell: input.disabledReason 只在 disabled=true 时给（否则这句"为什么不能动"说不清）');
  }
  const error = optText(raw.error, 'wizard-shell: input.error');
  if (error !== undefined && disabled) {
    badInput('wizard-shell: input.error 与 disabled=true 不同时给（一行里两个"为什么"会互相盖住）');
  }

  const givenAside = optText(raw.aside, 'wizard-shell: input.aside');
  const givenNext = optText(raw.nextLabel, 'wizard-shell: input.nextLabel');
  const confirmText = optText(raw.confirmText, 'wizard-shell: input.confirmText');
  const givenId = optInstanceId(raw.id);

  return {
    form: form as WizardShellForm,
    name,
    instanceKey: givenId === undefined ? name : givenId,
    question,
    index,
    total,
    segments: segmentsOf(index, total),
    answer: options.length > 0 ? 'options' : (fields.length > 0 ? 'fields' : 'confirm') as WizardShellAnswer,
    options,
    fields,
    value,
    why: optText(raw.why, 'wizard-shell: input.why'),
    aside: givenAside === undefined
      ? (index === 0 ? WIZARD_SHELL_ASIDE_FIRST : '前面 ' + String(index) + ' 问走过，随时能回')
      : givenAside,
    hint: optText(raw.hint, 'wizard-shell: input.hint'),
    nextLabel: givenNext === undefined
      ? (index === total - 1 ? WIZARD_SHELL_DONE_LABEL : WIZARD_SHELL_NEXT_LABEL)
      : givenNext,
    skippable: optBool(raw.skippable, 'wizard-shell: input.skippable') !== false,
    loading,
    loadingText: loadingText === undefined ? WIZARD_SHELL_LOADING_TEXT : loadingText,
    disabled,
    disabledReason,
    error,
    confirmText: confirmText === undefined ? WIZARD_SHELL_CONFIRM_TEXT : confirmText,
    extraClass: optExtraClass(raw.extraClass, 'wizard-shell: input.extraClass'),
  };
}

/** 件内 `id` 的唯一拼法（机器键里不合法 id 的字符一律换成 `-`）。
 *  **传 `instanceKey`，不是 `name`**：同页摆两份同名实例时，`id` 必须按实例分开（否则重号，
 *  `aria-labelledby`／`aria-describedby` 会指到另一份上去）。
 *  三个用处：大字问题的 id（选项组的 `aria-labelledby` 指它）、读数行的 id（按不动的"上一问"指它）、
 *  错态那一行的 id（答题区与三枚键的 `aria-describedby` 指它）。 */
export function wizardShellId(part: string, name: string, sub?: string): string {
  const safe = (s: string): string => s.replace(/[^A-Za-z0-9_-]+/g, '-');
  return 'ilife-wizard-' + safe(part) + '-' + safe(name) + (sub === undefined ? '' : '-' + safe(sub));
}
