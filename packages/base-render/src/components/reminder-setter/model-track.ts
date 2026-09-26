/** reminder-setter · **形态 `track` 的入参校验与归一化**（一天刻度上摆着好几条提醒那一档）。
 *
 *  这一档的场景是「**一天里好几条提醒、要看它们落在哪儿**」：刻度上摆着**多条**提醒点，
 *  点某一条就改它自己的三个决定。故它比 `decisions` 那一档多两样入参——`items`（这一天有哪几条）
 *  与 `picked`（现在改的是哪一条），其余三排档名与那一档**同一份**（`repeats`／`leads`／`routes`）。
 *
 *  三条口径：
 *   1. **位置由数算出来**：每条提醒只给一个 `at`（一天里的第几分钟），刻度上的位置（`place`）
 *      与屏上那个时刻（`time`）都在这里算好——`render.ts` 只拼标记，一个字都不算。
 *   2. **`at` 是读数，两道闸都过**：有限数（`NaN`／`±Infinity` 一律拒）＋ 可加性上界（`rules.ts`
 *      的 `reqNumber()`）；再过一道**改得到**的闸：整数分钟、落在 `0`–`1439`、踩在步进键那一档上
 *      ——落不到的点屏上点不出来。
 *   3. **两枚点不许落在同一分钟**：命中盒 ≥44、相邻 ≥8px 是底线，同一个时刻摆两条时两枚命中盒
 *      叠在一起（那一条按不准）；改法是给其中一条另一分钟。
 */
import { assertDenseArray, assertPlainObject, badInput } from '../shared/validate.js';
import {
  REMINDER_SETTER_DAY_MIN,
  REMINDER_SETTER_MAX_ITEMS,
  REMINDER_SETTER_MAX_ROUTES,
  REMINDER_SETTER_MIN_ITEMS,
  REMINDER_SETTER_TEXT,
  REMINDER_SETTER_TIME_STEP_MIN,
  reminderSetterClock,
  reminderSetterPlace,
  reminderSetterTrackTail,
  type ReminderSetterOption,
  type ReminderSetterTrackItem,
} from './attrs.js';
import { assertKeys, reqChosen, reqIdentifier, reqNumber, reqPicked, reqRealText } from './rules.js';
import type { ReminderSetterRow, ReminderSetterTrackModel } from './model.js';

/** `ReminderSetterTrackItem` 的键（一档可选值的入参表之外的第二个嵌套层）。 */
const ITEM_KEYS = ['id', 'label', 'at', 'repeat', 'lead', 'chosen'] as const;

/** 归一化后的一条提醒（`render.ts` 与运行时段读的就是它）。 */
export interface ReminderSetterTrackItemModel {
  readonly id: string;
  readonly label: string;
  /** 1 起的序号（刻度上那枚徽章与图例那一行印的是它：两处对得起来）。 */
  readonly index: number;
  /** 一天里的第几分钟（机器读数，`0`–`1439`）。 */
  readonly at: number;
  /** 屏上那个时刻（`07:00`）：由 `at` 算出来，**只印在图例那一行**。 */
  readonly time: string;
  /** 落在刻度上的比例（`0`–`1`）：标记里那一枚点的 `left` 由它算出来。 */
  readonly place: number;
  /** 现在选中的是不是它。 */
  readonly on: boolean;
  readonly repeat: string;
  readonly lead: string;
  readonly chosen: readonly string[];
  /** 图例那一行的尾一截（重复档；一条通知都没勾时换成那句状态）。 */
  readonly tail: string;
}

/** 一天里的第几分钟：**改得到**的那一闸（整数、在一天之内、踩在步进键那一档上）。 */
function reqAt(value: unknown, field: string): number {
  const at = reqNumber(value, field);
  if (!Number.isInteger(at)) badInput(field + ' 必须是整数分钟（一天里的第几分钟），读到 ' + String(at));
  if (at < 0 || at >= REMINDER_SETTER_DAY_MIN) {
    badInput(field + ' 要落在 0–' + String(REMINDER_SETTER_DAY_MIN - 1) + ' 那一圈里（一天里的第几分钟），读到 '
      + String(at));
  }
  if (at % REMINDER_SETTER_TIME_STEP_MIN !== 0) {
    badInput(field + ' 要落在 ' + String(REMINDER_SETTER_TIME_STEP_MIN)
      + ' 分钟那一档上（改法是两枚步进键，落不到的点屏上点不出来）');
  }
  return at;
}

/** 这一天的提醒：2–4 条，逐条过键表与逐字段校验（`id` 与 `at` 各自唯一）。 */
function reqItems(value: unknown, rows: {
  repeats: readonly ReminderSetterOption[]; leads: readonly ReminderSetterOption[]; routes: readonly ReminderSetterOption[];
}): ReminderSetterTrackItem[] {
  if (!Array.isArray(value)) {
    badInput('reminder-setter: input.items 必须是数组（一天里那几条提醒，'
      + String(REMINDER_SETTER_MIN_ITEMS) + '–' + String(REMINDER_SETTER_MAX_ITEMS) + ' 条）');
  }
  assertDenseArray(value, 'reminder-setter: input.items');
  if (value.length < REMINDER_SETTER_MIN_ITEMS || value.length > REMINDER_SETTER_MAX_ITEMS) {
    badInput('reminder-setter: input.items 要 ' + String(REMINDER_SETTER_MIN_ITEMS) + '–'
      + String(REMINDER_SETTER_MAX_ITEMS) + ' 条（一条谈不上「落在哪儿的几条」，再多窄容器里两枚点的命中盒会叠），读到 '
      + String(value.length) + ' 条');
  }
  const ids = new Set<string>();
  const ats = new Set<number>();
  return value.map((one, i) => {
    const at = 'reminder-setter: input.items[' + String(i) + ']';
    assertPlainObject(one, at);
    const raw = one as Record<string, unknown>;
    assertKeys(raw, ITEM_KEYS, at);
    const id = reqIdentifier(raw.id, at + '.id');
    if (ids.has(id)) badInput(at + '.id 与前面某一条重了（一整天里每条提醒的机器键唯一）');
    ids.add(id);
    const minutes = reqAt(raw.at, at + '.at');
    if (ats.has(minutes)) {
      badInput(at + '.at 与前面某一条落在同一分钟上：两枚点的命中盒会叠在一起（'
        + '命中盒不小于 ' + String(REMINDER_SETTER_TIME_STEP_MIN) + ' 分钟那一档、相邻要留缝），'
        + '改法是给其中一条另一分钟');
    }
    ats.add(minutes);
    return {
      id,
      label: reqRealText(raw.label, at + '.label'),
      at: minutes,
      repeat: reqPicked(rows.repeats, raw.repeat, at + '.repeat'),
      lead: reqPicked(rows.leads, raw.lead, at + '.lead'),
      chosen: reqChosen(rows.routes, raw.chosen, at + '.chosen', REMINDER_SETTER_MAX_ROUTES),
    };
  });
}

/** `track` 那一支：一天刻度上那几条 ＋ 现在选中哪一条 ＋ 选中那条的三个决定。 */
export function normalizeTrack(raw: Record<string, unknown>, rows: {
  repeats: ReminderSetterOption[]; leads: ReminderSetterOption[]; routes: ReminderSetterOption[];
}, id: string, extraClass?: string): ReminderSetterTrackModel {
  const items = reqItems(raw.items, rows);
  /* 屏上顺序＝**刻度上的先后**：按 `at` 升序排（件自己排，调用方不用先排；同一分钟已被上面挡住）。 */
  const sorted = items.slice().sort((a, b) => a.at - b.at);
  const picked = reqIdentifier(raw.picked, 'reminder-setter: input.picked');
  if (!sorted.some((o) => o.id === picked)) {
    badInput('reminder-setter: input.picked 没有命中 items 里的任何一条: ' + picked);
  }
  const repeatLabelOf = (key: string): string => rows.repeats.filter((o) => o.key === key)[0].label;
  const built: ReminderSetterTrackItemModel[] = sorted.map((item, i) => ({
    id: item.id,
    label: item.label,
    index: i + 1,
    at: item.at,
    time: reminderSetterClock(item.at),
    place: reminderSetterPlace(item.at),
    on: item.id === picked,
    repeat: item.repeat,
    lead: item.lead,
    chosen: item.chosen,
    tail: reminderSetterTrackTail(repeatLabelOf(item.repeat), item.chosen.length, REMINDER_SETTER_TEXT),
  }));
  const sel = built.filter((o) => o.on)[0];
  const selRows: ReminderSetterRow[] = [
    { part: 'repeat', label: REMINDER_SETTER_TEXT.repeatLabel, multi: false,
      options: rows.repeats.map((o) => ({ key: o.key, label: o.label, on: o.key === sel.repeat })) },
    { part: 'lead', label: REMINDER_SETTER_TEXT.leadLabel, multi: false,
      options: rows.leads.map((o) => ({ key: o.key, label: o.label, on: o.key === sel.lead })) },
    { part: 'route', label: REMINDER_SETTER_TEXT.routeLabel, multi: true,
      options: rows.routes.map((o) => ({ key: o.key, label: o.label, on: sel.chosen.includes(o.key) })) },
  ];
  return { form: 'track', id, items: built, picked: sel.id, rows: selRows, extraClass };
}
