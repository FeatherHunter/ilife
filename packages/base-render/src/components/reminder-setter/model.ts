/** reminder-setter · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `kanban-columns/model.ts`／`relation-picker/model.ts` 同一条）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      · **上屏文本全空白＝拒**（`'   '` 会在屏上留一块空白：无字提醒名、无字档名；
 *        **零宽字符那类不可见字符同样算空白**——`trim()` 剥不掉它们，得先剥再判）；
 *      · **入参表以外的键＝拒**（写错一个键名，调用方以为自己设上了，屏上却没有；
 *        自有的不可枚举键与原型链上继承来的键**同样算**——只走 `Object.keys` 会漏掉这两类）；
 *      · **改不到的值＝拒**：时间的分钟必须落在步进键的格子上（否则那枚读数屏上点不到）、
 *        日期必须是真实存在的一天、选中的档必须真的在那一排里。
 *   2. **能算的都算出来**：三行（每一行的可点项与「现在选的是哪一枚」）与**唯一那行复述**都在这里算好；
 *      `render.ts` 只拼标记，一个字都不算。
 *   3. **一条通知都不勾是合法态**：`chosen: []` ⇒ 复述读成「没有通知，不会响」（照实读数，不是错误）。
 */
import { assertDenseArray, assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  REMINDER_SETTER_FORMS,
  REMINDER_SETTER_MAX_CHOICES,
  REMINDER_SETTER_MAX_ROUTES,
  REMINDER_SETTER_MIN_CHOICES,
  REMINDER_SETTER_MIN_ROUTES,
  REMINDER_SETTER_TEXT,
  REMINDER_SETTER_TIME_STEP_MIN,
  reminderSetterRecap,
  type ReminderSetterForm,
  type ReminderSetterOption,
  type ReminderSetterPart,
} from './attrs.js';

/** 归一化后的一枚可点项（`on`＝现在选的是它／勾的是它）。 */
export interface ReminderSetterOptionRow {
  readonly key: string;
  readonly label: string;
  readonly on: boolean;
}

/** 归一化后的一行决定（一行只做一个决定）。 */
export interface ReminderSetterRow {
  readonly part: ReminderSetterPart;
  /** 这一行问什么（`什么时候响`／`提前多久`／`走哪条通知`）。 */
  readonly label: string;
  /** 这一行是不是多选（形不同：单选是胶囊，多选是方框）。 */
  readonly multi: boolean;
  readonly options: readonly ReminderSetterOptionRow[];
}

/** 内部类型：`render.ts` 只吃它，不再自己碰 `any`。 */
export interface ReminderSetterModel {
  readonly form: ReminderSetterForm;
  readonly id: string;
  readonly title: string;
  /** 现在设的时间（`HH:MM`，机器读数）。 */
  readonly time: string;
  /** 第一次从哪一天（`YYYY-MM-DD`，机器读数）。 */
  readonly startDate: string;
  /** 三行决定（顺序＝屏上顺序：什么时候响 → 提前多久 → 走哪条通知）。 */
  readonly rows: readonly ReminderSetterRow[];
  /** **全件唯一的读数行**（一行说完现在设的是多少）。 */
  readonly recap: string;
  readonly extraClass?: string;
}

/** 不可见字符：零宽与格式那一类（`\u200b` 零宽空格、`\u200c/\u200d` 连接符、`\u200e/\u200f` 方向标记、
 *  `\u2060` 词连接符、`\ufeff` 零宽不换行空格、`\u00ad` 软连字符）。**`String.prototype.trim()` 不管它们**
 *  ——它按 Unicode WhiteSpace 剥，这几个是格式类（Cf）——所以「全空白」的判定得先把它们剥掉。 */
const INVISIBLE_RE = /[\u00ad\u200b-\u200f\u2060\ufeff]/g;

/** 「在屏上就是一块空白」：剥掉不可见字符再 `trim()`，剩下的还是空。 */
function isBlank(text: string): boolean {
  return text.replace(INVISIBLE_RE, '').trim() === '';
}

/** 机器值：非空、**只许标识符字符**（它要当 `data-*` 的值使）。 */
function reqIdentifier(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(text)) {
    badInput(field + ' 只许标识符字符（字母、数字、下划线、连字符），它还要当 data-* 的值用');
  }
  return text;
}

/** 必填文本：非空串**且不是全空白**（全空白——含零宽那类不可见字符——会在屏上留一块空白，那是看得到的错）。 */
function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (isBlank(text)) badInput(field + ' 必须是真正的文本（全空白不算，零宽字符这类不可见字符也不算）');
  return text;
}

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。
 *
 *  **两条都会被查到**（只走 `Object.keys` 会漏一半）：
 *   · `Object.getOwnPropertyNames` —— 自有的**全部**键，含**不可枚举**的；
 *   · `for…in` —— 走**整条原型链**（继承来的键就是这一路）。
 */
function assertKeys(raw: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const bad: string[] = [];
  const note = (key: string): void => {
    if (!allowed.includes(key) && !bad.includes(key)) bad.push(key);
  };
  for (const key of Object.getOwnPropertyNames(raw)) note(key);
  for (const key in raw) note(key);
  if (bad.length > 0) {
    badInput(field + ' 里没有 `' + bad.join('`／`') + '` 这个键（入参表以外的键一律拒：'
      + '写错的键静默吞掉会让调用方以为自己设上了；继承来的与不可枚举的键同样算）');
  }
}

/** `ReminderSetterInput` 的键（顶层入参表）。 */
const INPUT_KEYS = ['id', 'title', 'repeats', 'repeat', 'time', 'startDate',
  'leads', 'lead', 'routes', 'chosen', 'form', 'extraClass'] as const;

/** `ReminderSetterOption` 的键（一档可选值的入参表）。 */
const OPTION_KEYS = ['key', 'label'] as const;

/** `HH:MM`（24 小时制）。 */
const TIME_RE = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
/** `YYYY-MM-DD`。 */
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 提醒时间：`HH:MM`，**且分钟落在步进键的格子上**（落不到的点屏上点不出来 ⇒ 不许给）。 */
function reqTime(value: unknown, field: string): string {
  const text = reqText(value, field);
  const m = TIME_RE.exec(text);
  if (m === null) badInput(field + ' 必须是 HH:MM（24 小时制，如 22:30）');
  if (Number(m[2]) % REMINDER_SETTER_TIME_STEP_MIN !== 0) {
    badInput(field + ' 的分钟要落在 ' + String(REMINDER_SETTER_TIME_STEP_MIN)
      + ' 分钟那一档上（改法是两枚步进键，落不到的点屏上点不出来）');
  }
  return text;
}

/** 起始日：`YYYY-MM-DD`，**且是真实存在的一天**（`2026-02-30` 这类不是）。 */
function reqDate(value: unknown, field: string): string {
  const text = reqText(value, field);
  const m = DATE_RE.exec(text);
  if (m === null) badInput(field + ' 必须是 YYYY-MM-DD');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const at = new Date(Date.UTC(y, mo - 1, d));
  if (at.getUTCFullYear() !== y || at.getUTCMonth() !== mo - 1 || at.getUTCDate() !== d) {
    badInput(field + ' 不是真实存在的一天：' + text);
  }
  return text;
}

/** 一排可点项 → 一行（逐字段校验；键在同排内唯一）。 */
function reqOptions(value: unknown, field: string, min: number, max: number): ReminderSetterOption[] {
  if (!Array.isArray(value)) badInput(field + ' 必须是数组（一排 ' + String(min) + '–' + String(max) + ' 档）');
  assertDenseArray(value, field);
  if (value.length < min || value.length > max) {
    badInput(field + ' 要 ' + String(min) + '–' + String(max) + ' 档，读到 ' + String(value.length) + ' 档');
  }
  const seen = new Set<string>();
  return value.map((one, i) => {
    const at = field + '[' + String(i) + ']';
    assertPlainObject(one, at);
    const raw = one as Record<string, unknown>;
    assertKeys(raw, OPTION_KEYS, at);
    const key = reqIdentifier(raw.key, at + '.key');
    if (seen.has(key)) badInput(at + '.key 与这一排前面某一档重了（同一排内键唯一）');
    seen.add(key);
    const label = reqRealText(raw.label, at + '.label');
    return { key, label };
  });
}

/** 选中的那一档：必须真的在这一排里（不然屏上没有任何一枚是选中的，而复述会念出空档名）。 */
function reqPicked(keys: readonly ReminderSetterOption[], value: unknown, field: string): string {
  const key = reqIdentifier(value, field);
  if (!keys.some((o) => o.key === key)) badInput(field + ' 没有命中那一排里的任何一档: ' + key);
  return key;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `ReminderSetterModel`。 */
export function normalizeReminderSetter(input: unknown): ReminderSetterModel {
  assertPlainObject(input, 'renderReminderSetter: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, INPUT_KEYS, 'renderReminderSetter: input');

  const form = raw.form === undefined ? REMINDER_SETTER_FORMS[0] : raw.form;
  if (!(REMINDER_SETTER_FORMS as readonly unknown[]).includes(form)) {
    badInput('reminder-setter: input.form 必须是 ' + REMINDER_SETTER_FORMS.join('／')
      + ' 之一（本件只落地形态 A「一行一个决定」）');
  }

  const id = reqIdentifier(raw.id, 'reminder-setter: input.id');
  const title = reqRealText(raw.title, 'reminder-setter: input.title');
  const time = reqTime(raw.time, 'reminder-setter: input.time');
  const startDate = reqDate(raw.startDate, 'reminder-setter: input.startDate');

  const repeats = reqOptions(raw.repeats, 'reminder-setter: input.repeats',
    REMINDER_SETTER_MIN_CHOICES, REMINDER_SETTER_MAX_CHOICES);
  const repeat = reqPicked(repeats, raw.repeat, 'reminder-setter: input.repeat');
  const leads = reqOptions(raw.leads, 'reminder-setter: input.leads',
    REMINDER_SETTER_MIN_CHOICES, REMINDER_SETTER_MAX_CHOICES);
  const lead = reqPicked(leads, raw.lead, 'reminder-setter: input.lead');
  const routes = reqOptions(raw.routes, 'reminder-setter: input.routes',
    REMINDER_SETTER_MIN_ROUTES, REMINDER_SETTER_MAX_ROUTES);

  const chosenRaw = raw.chosen;
  if (!Array.isArray(chosenRaw)) badInput('reminder-setter: input.chosen 必须是数组（一条通知都不勾请显式给 []）');
  assertDenseArray(chosenRaw, 'reminder-setter: input.chosen');
  const chosen: string[] = [];
  chosenRaw.forEach((one, i) => {
    const at = 'reminder-setter: input.chosen[' + String(i) + ']';
    const key = reqIdentifier(one, at);
    if (chosen.includes(key)) badInput(at + ' 与前面某一档重了（同一条通知勾两次没有意义）');
    if (!routes.some((o) => o.key === key)) badInput(at + ' 没有命中 routes 里的任何一档: ' + key);
    chosen.push(key);
  });

  const rows: ReminderSetterRow[] = [
    { part: 'repeat', label: REMINDER_SETTER_TEXT.repeatLabel, multi: false,
      options: repeats.map((o) => ({ key: o.key, label: o.label, on: o.key === repeat })) },
    { part: 'lead', label: REMINDER_SETTER_TEXT.leadLabel, multi: false,
      options: leads.map((o) => ({ key: o.key, label: o.label, on: o.key === lead })) },
    { part: 'route', label: REMINDER_SETTER_TEXT.routeLabel, multi: true,
      options: routes.map((o) => ({ key: o.key, label: o.label, on: chosen.includes(o.key) })) },
  ];
  const repeatLabel = repeats.filter((o) => o.key === repeat)[0].label;

  return {
    form: form as ReminderSetterForm,
    id,
    title,
    time,
    startDate,
    rows,
    recap: reminderSetterRecap(repeatLabel, startDate, time, chosen.length, REMINDER_SETTER_TEXT),
    /* `optText` 在这里只为把「不是字符串」挡掉；类名正则由 `optExtraClass` 管。 */
    extraClass: optExtraClass(optText(raw.extraClass, 'reminder-setter: input.extraClass'),
      'reminder-setter: input.extraClass'),
  };
}
