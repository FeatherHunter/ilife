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
 *
 *  **两个形态各一支**：`decisions` 那一支照旧住本文件；`track` 那一支住同目录 `model-track.ts`
 *  （两个骨架的入参不同，挤在一份里会超本包告警线 350）。共用的那几条守卫住 `rules.ts`。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
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
import { assertKeys, reqChosen, reqIdentifier, reqOptions, reqPicked, reqRealText } from './rules.js';
import { normalizeTrack, type ReminderSetterTrackItemModel } from './model-track.js';

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

/** 两个形态共有的那几样（根上的发现锚与形态键）。 */
interface ReminderSetterCommonModel {
  readonly id: string;
  readonly extraClass?: string;
}

/** `decisions` 那一支的内部类型（`render.ts` 只吃它，不再自己碰 `any`）。 */
export interface ReminderSetterDecisionsModel extends ReminderSetterCommonModel {
  readonly form: 'decisions';
  readonly title: string;
  /** 现在设的时间（`HH:MM`，机器读数）。 */
  readonly time: string;
  /** 第一次从哪一天（`YYYY-MM-DD`，机器读数）。 */
  readonly startDate: string;
  /** 三行决定（顺序＝屏上顺序：什么时候响 → 提前多久 → 走哪条通知）。 */
  readonly rows: readonly ReminderSetterRow[];
  /** **全件唯一的读数行**（一行说完现在设的是多少）。 */
  readonly recap: string;
}

/** `track` 那一支的内部类型（一天刻度上那几条提醒，谁被选中、各自三个决定是什么）。 */
export interface ReminderSetterTrackModel extends ReminderSetterCommonModel {
  readonly form: 'track';
  /** 刻度上那几条提醒（屏上顺序＝刻度上的先后）。 */
  readonly items: readonly ReminderSetterTrackItemModel[];
  /** 现在选中的是哪一条（须是上面某一枚的 `id`）。 */
  readonly picked: string;
  /** 选中那一条的三个决定（下面那块面板画的**只有这一条**）。 */
  readonly rows: readonly ReminderSetterRow[];
}

/** 内部类型：两个形态的联合（`render.ts` 按 `form` 分派，各自只读自己那一支的字段）。 */
export type ReminderSetterModel = ReminderSetterDecisionsModel | ReminderSetterTrackModel;

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

/** `ReminderSetterInput` 的**全部**键（顶层入参表：两个形态的键都在，缺哪个由形态自己定）。 */
const INPUT_KEYS = ['id', 'title', 'repeats', 'repeat', 'time', 'startDate',
  'leads', 'lead', 'routes', 'chosen', 'form', 'extraClass', 'items', 'picked'] as const;

/** 三排可点项（两个形态共用：档名由调用方给，件不猜有哪几条通知通道）。 */
function reqRows(raw: Record<string, unknown>): {
  repeats: ReminderSetterOption[]; leads: ReminderSetterOption[]; routes: ReminderSetterOption[];
} {
  return {
    repeats: reqOptions(raw.repeats, 'reminder-setter: input.repeats',
      REMINDER_SETTER_MIN_CHOICES, REMINDER_SETTER_MAX_CHOICES),
    leads: reqOptions(raw.leads, 'reminder-setter: input.leads',
      REMINDER_SETTER_MIN_CHOICES, REMINDER_SETTER_MAX_CHOICES),
    routes: reqOptions(raw.routes, 'reminder-setter: input.routes',
      REMINDER_SETTER_MIN_ROUTES, REMINDER_SETTER_MAX_ROUTES),
  };
}

/** 三行决定的**装配**（两个形态共用：`decisions` 是那条提醒的，`track` 是选中那条的）。 */
function rowsOf(rows: {
  repeats: readonly ReminderSetterOption[]; leads: readonly ReminderSetterOption[]; routes: readonly ReminderSetterOption[];
}, repeat: string, lead: string, chosen: readonly string[]): ReminderSetterRow[] {
  return [
    { part: 'repeat', label: REMINDER_SETTER_TEXT.repeatLabel, multi: false,
      options: rows.repeats.map((o) => ({ key: o.key, label: o.label, on: o.key === repeat })) },
    { part: 'lead', label: REMINDER_SETTER_TEXT.leadLabel, multi: false,
      options: rows.leads.map((o) => ({ key: o.key, label: o.label, on: o.key === lead })) },
    { part: 'route', label: REMINDER_SETTER_TEXT.routeLabel, multi: true,
      options: rows.routes.map((o) => ({ key: o.key, label: o.label, on: chosen.includes(o.key) })) },
  ];
}

/** `decisions` 那一支：一件提醒、三行决定、一行复述。 */
function decisionsModel(raw: Record<string, unknown>, rows: {
  repeats: ReminderSetterOption[]; leads: ReminderSetterOption[]; routes: ReminderSetterOption[];
}): Omit<ReminderSetterDecisionsModel, 'id' | 'extraClass'> {
  const time = reqTime(raw.time, 'reminder-setter: input.time');
  const startDate = reqDate(raw.startDate, 'reminder-setter: input.startDate');
  const repeat = reqPicked(rows.repeats, raw.repeat, 'reminder-setter: input.repeat');
  const lead = reqPicked(rows.leads, raw.lead, 'reminder-setter: input.lead');
  const chosen = reqChosen(rows.routes, raw.chosen, 'reminder-setter: input.chosen',
    REMINDER_SETTER_MAX_ROUTES);
  const repeatLabel = rows.repeats.filter((o) => o.key === repeat)[0].label;
  return {
    form: 'decisions',
    title: reqRealText(raw.title, 'reminder-setter: input.title'),
    time,
    startDate,
    rows: rowsOf(rows, repeat, lead, chosen),
    recap: reminderSetterRecap(repeatLabel, startDate, time, chosen.length, REMINDER_SETTER_TEXT),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `ReminderSetterModel`。 */
export function normalizeReminderSetter(input: unknown): ReminderSetterModel {
  assertPlainObject(input, 'renderReminderSetter: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, INPUT_KEYS, 'renderReminderSetter: input');

  const form = raw.form === undefined ? REMINDER_SETTER_FORMS[0] : raw.form;
  if (!(REMINDER_SETTER_FORMS as readonly unknown[]).includes(form)) {
    badInput('reminder-setter: input.form 必须是 ' + REMINDER_SETTER_FORMS.join('／')
      + ' 之一（`decisions`＝一行一个决定／`track`＝一天刻度上摆点）');
  }

  const id = reqIdentifier(raw.id, 'reminder-setter: input.id');
  /* `optText` 在这里只为把「不是字符串」挡掉；类名正则由 `optExtraClass` 管。 */
  const extraClass = optExtraClass(optText(raw.extraClass, 'reminder-setter: input.extraClass'),
    'reminder-setter: input.extraClass');
  const rows = reqRows(raw);
  if (form === 'track') return normalizeTrack(raw, rows, id, extraClass);
  return { ...decisionsModel(raw, rows), id, extraClass };
}
