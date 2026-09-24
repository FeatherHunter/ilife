/** radio-cards · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与本节其余件同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的骨架会在页面上长成另一种东西，而调用方以为拿到了本件；
 *   2. **缺值与空串是两件事**：`value: null` ＝ 显式未选（一个都不勾）；`value: ''` ＝ 错（说不出"选了哪一个"）；
 *   3. 归一化只做「形状」：读数怎么取整、千分位怎么写**归调用方**（本件只收「已经是给人看的样子」的串）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  RADIO_CARDS_EMPTY_TEXT,
  RADIO_CARDS_FORMS,
  RADIO_CARDS_LEAD_MAX,
  RADIO_CARDS_LOADING_TEXT,
  type RadioCardsForm,
  type RadioCardsOption,
} from './attrs.js';

/** 内部选项类型：每个字段都已校验、已归一。 */
export interface RadioCardsCard {
  readonly value: string;
  readonly title: string;
  readonly desc?: string;
  readonly reading?: string;
  readonly readingLabel?: string;
  readonly lead?: string;
  readonly disabled: boolean;
  readonly disabledReason?: string;
}

/** 内部类型（`render.ts` 只吃它，不再自己碰 `any`）。 */
export interface RadioCardsModel {
  readonly form: RadioCardsForm;
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly cards: readonly RadioCardsCard[];
  /** `null` ＝ 显式未选（一个都不勾）；串 ＝ 选中项机器值（必然命中某一项）。 */
  readonly value: string | null;
  readonly required: boolean;
  readonly loading: boolean;
  readonly loadingText: string;
  readonly error?: string;
  readonly emptyText: string;
  readonly extraClass?: string;
}

/** 可选布尔：只收真布尔（`'yes'`／`1` 一律拒——它们说不出"是不是真的指 true"）。 */
function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

/** 一个选项：逐字段校验（`value`／`title` 必填；`lead` 只许 1–2 字）。 */
function normalizeCard(raw: unknown, index: number): RadioCardsCard {
  assertPlainObject(raw, 'radio-cards: input.options[' + index + ']');
  const o = raw as RadioCardsOption;
  const value = reqText(o.value, 'radio-cards: input.options[' + index + '].value');
  const title = reqText(o.title, 'radio-cards: input.options[' + index + '].title');
  const lead = optText(o.lead, 'radio-cards: input.options[' + index + '].lead');
  if (lead !== undefined && [...lead].length > RADIO_CARDS_LEAD_MAX) {
    badInput('radio-cards: input.options[' + index + '].lead 只许 1–' + String(RADIO_CARDS_LEAD_MAX) + ' 个字（它是记号位，不是第二个标题）：' + lead);
  }
  const disabled = optBool(o.disabled, 'radio-cards: input.options[' + index + '].disabled') === true;
  const disabledReason = optText(o.disabledReason, 'radio-cards: input.options[' + index + '].disabledReason');
  if (disabledReason !== undefined && !disabled) {
    badInput('radio-cards: input.options[' + index + '].disabledReason 只在 disabled=true 时给（否则这句"为什么不能选"说不清）');
  }
  return {
    value,
    title,
    desc: optText(o.desc, 'radio-cards: input.options[' + index + '].desc'),
    reading: optText(o.reading, 'radio-cards: input.options[' + index + '].reading'),
    readingLabel: optText(o.readingLabel, 'radio-cards: input.options[' + index + '].readingLabel'),
    lead,
    disabled,
    disabledReason,
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `RadioCardsModel`。 */
export function normalizeRadioCards(input: unknown): RadioCardsModel {
  assertPlainObject(input, 'renderRadioCards: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? RADIO_CARDS_FORMS[0] : raw.form;
  if (!(RADIO_CARDS_FORMS as readonly unknown[]).includes(form)) {
    badInput('radio-cards: input.form 必须是 ' + RADIO_CARDS_FORMS.join('／') + ' 之一（本件只落地形态 A「竖排卡」）');
  }

  const given = raw.options;
  if (given !== undefined && !Array.isArray(given)) badInput('radio-cards: input.options 必须是数组');
  const cards: RadioCardsCard[] = [];
  if (Array.isArray(given)) {
    for (let i = 0; i < given.length; i += 1) cards.push(normalizeCard(given[i], i));
  }
  const seen = new Set<string>();
  for (const c of cards) {
    if (seen.has(c.value)) {
      badInput('radio-cards: input.options 里机器值重复（单选组按 value 定位，重了就读不出选了哪一个）：' + c.value);
    }
    seen.add(c.value);
  }

  /* 机器值：`null`／不给 ＝ 未选；串必须命中某一项（否则"选了但屏上没有哪张卡是选中的"）。 */
  let value: string | null = null;
  const rawValue = raw.value;
  if (rawValue !== undefined && rawValue !== null) {
    if (typeof rawValue !== 'string') badInput('radio-cards: input.value 必须是字符串或 null');
    if (rawValue === '') badInput('radio-cards: input.value 不许给空串：未选请给 null');
    if (!seen.has(rawValue)) badInput('radio-cards: input.value 必须命中 options 里的一项：' + rawValue);
    value = rawValue;
  }

  const loading = optBool(raw.loading, 'radio-cards: input.loading') === true;
  const loadingText = optText(raw.loadingText, 'radio-cards: input.loadingText');
  if (loadingText !== undefined && !loading) {
    badInput('radio-cards: input.loadingText 只在 loading=true 时给');
  }
  const emptyText = optText(raw.emptyText, 'radio-cards: input.emptyText');

  return {
    form: form as RadioCardsForm,
    name: reqText(raw.name, 'radio-cards: input.name'),
    label: reqText(raw.label, 'radio-cards: input.label'),
    hint: optText(raw.hint, 'radio-cards: input.hint'),
    cards,
    value,
    required: optBool(raw.required, 'radio-cards: input.required') === true,
    loading,
    loadingText: loadingText === undefined ? RADIO_CARDS_LOADING_TEXT : loadingText,
    error: optText(raw.error, 'radio-cards: input.error'),
    emptyText: emptyText === undefined ? RADIO_CARDS_EMPTY_TEXT : emptyText,
    extraClass: optExtraClass(raw.extraClass, 'radio-cards: input.extraClass'),
  };
}

/** 错态那一句挂的 `id`（`aria-describedby` 指它）：机器键里不合法 id 的字符一律换成 `-`。 */
export function radioCardsErrorId(name: string): string {
  return 'ilife-radio-err-' + name.replace(/[^A-Za-z0-9_-]+/g, '-');
}
