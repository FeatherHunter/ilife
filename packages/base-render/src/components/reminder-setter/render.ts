/** reminder-setter · **渲染**（纯函数产 HTML；按形态分派，两档：`decisions` ／ `track`）。
 *
 *  —— 形态 `decisions`「一行一个决定」——
 *
 *  一屏三层，**每层一句话都没有多的**：
 *   · **抬头**：这一组设定在给哪条提醒设（`「记体重」的提醒`）；
 *   · **三行**：什么时候响 ／ 提前多久 ／ 走哪条通知——左边是这一行问什么，右边是这一行的全部可点项；
 *     日期与时间不走精确拖点，走两枚 44×44 的步进键夹一枚读数（手机上「点得到」）；
 *   · **一行复述**：全件唯一的读数行（`每天 2026-09-26 22:30`），一行说完，`role="status"` 会在变时念出来。
 *
 *  —— 形态 `track`「一天刻度上摆点」——
 *
 *  一天里好几条提醒、要看它们落在哪儿：刻度上摆着**多条**提醒点（每枚 44×44 的可点件），
 *  点某一条就改**它自己**的三个决定（下面那块面板只画选中的那一条）。这一档只留一层话：
 *  刻度 ＋ 小时数 ＋ **图例**（一行一条：序号 ＋ 时间 ＋ 提醒名 ＋ 重复档）＋ 选中那条的决定面板。
 *  **没有抬头、没有复述那一行**——图例那一行就是「现在设的是多少」（再写一行就是同一个数印第二遍）。
 *
 *  原型里的旁白与口径句一句都不上屏（2026-09-25 用户口径：原型里写了好多文字、看起来很混乱；
 *  砍法：删 3 句口径旁白、删编辑面板那行「选中：22:30 记体重」——图例那行已印同一件事）。
 *
 *  五条硬口径（判据断的就是它们）：
 *   · **触屏可达**：三排可点项／两枚步进键／刻度上那几枚点，每枚 ≥`REMINDER_SETTER_TOUCH_PX`、
 *     相邻留 `REMINDER_SETTER_GAP_PX` 缝；
 *   · **状态不只靠颜色**：选中那枚＝形（勾 ＋ 方框／胶囊／圈）＋ 字（档名 ＋ 字重）＋ 色（软底）三样；
 *   · **单选与多选形状分开**：单选留一枚**固定 `REMINDER_SETTER_TICK_PX` 宽的勾选槽位**（未选也留：
 *     一排胶囊的左右沿才齐平），多选是实心方框（这条可以多选，形状自己说得出）；
 *   · **数值永不截断**：时间与日期读数没有省略手段，窄档只换行；
 *   · **同页多实例**：全部 `aria-*` 都按入参 `id` 逐实例派生（`wizard-shell` 同一处教训）。
 */
import { esc } from '../shared/escape.js';
import {
  REMINDER_SETTER_AT_ATTR,
  REMINDER_SETTER_ATTR,
  REMINDER_SETTER_CHOSEN_ATTR,
  REMINDER_SETTER_CLASS,
  REMINDER_SETTER_DEC,
  REMINDER_SETTER_DELTA_ATTR,
  REMINDER_SETTER_FORM_ATTR,
  REMINDER_SETTER_HOURS,
  REMINDER_SETTER_INC,
  REMINDER_SETTER_LEAD_ATTR,
  REMINDER_SETTER_PART_ATTR,
  REMINDER_SETTER_PICKED_ATTR,
  REMINDER_SETTER_READ_ATTR,
  REMINDER_SETTER_REPEAT_ATTR,
  REMINDER_SETTER_ROW_ATTR,
  REMINDER_SETTER_START_ATTR,
  REMINDER_SETTER_STEP_ATTR,
  REMINDER_SETTER_TEXT,
  REMINDER_SETTER_TIME_ATTR,
  REMINDER_SETTER_TOUCH_PX,
  REMINDER_SETTER_VALUE_ATTR,
  reminderSetterHead,
  reminderSetterSlot,
  type ReminderSetterForm,
  type ReminderSetterStep,
} from './attrs.js';
import {
  normalizeReminderSetter,
  type ReminderSetterDecisionsModel,
  type ReminderSetterRow,
  type ReminderSetterTrackModel,
} from './model.js';
import type { ReminderSetterTrackItemModel } from './model-track.js';

/** 根上那两个机器读数（`decisions` 那一档：时间 ＋ 第一次从）。 */
function decisionsRootAttrs(m: ReminderSetterDecisionsModel): string {
  return ' ' + REMINDER_SETTER_TIME_ATTR + '="' + esc(m.time) + '"'
    + ' ' + REMINDER_SETTER_START_ATTR + '="' + esc(m.startDate) + '"';
}

/** 根上那两个机器读数（`track` 那一档：现在改的是哪一条 ＋ 它落在一天里的第几分钟）。 */
function trackRootAttrs(m: ReminderSetterTrackModel): string {
  const sel = m.items.filter((o) => o.on)[0];
  return ' ' + REMINDER_SETTER_PICKED_ATTR + '="' + esc(m.picked) + '"'
    + ' ' + REMINDER_SETTER_AT_ATTR + '="' + String(sel.at) + '"';
}

/** 抬头那一行（`「记体重」的提醒`：它是什么）。 */
function headHtml(m: ReminderSetterDecisionsModel): string {
  return '<p class="' + reminderSetterSlot('head') + '">' + esc(reminderSetterHead(m.title)) + '</p>';
}

/** 一枚可点项：单选走 `-chip`（胶囊）、多选走 `-check`（方框）——**形状本身就是「这条可以多选」**。
 *  选中态照法条（有文字的选中面）：软底 ＋ 主色字 ＋ 主色描边 ＋ 勾（形），字重 700。 */
function optionHtml(row: ReminderSetterRow, key: string, label: string, on: boolean): string {
  return '<button type="button" class="' + reminderSetterSlot(row.multi ? 'check' : 'chip')
    + (on ? ' is-on' : '') + '"'
    + ' ' + REMINDER_SETTER_PART_ATTR + '="' + esc(row.part) + '"'
    + ' ' + REMINDER_SETTER_VALUE_ATTR + '="' + esc(key) + '"'
    + ' aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>';
}

/** 这一行的可点项那一排（`role="group"` 带这一行的名字：屏读器念得出「什么时候响」是哪一组）。
 *  `who`＝这条提醒叫什么（`decisions` 那一档是抬头那个提醒名，`track` 那一档是选中那条的名字）。 */
function trayHtml(who: string, row: ReminderSetterRow): string {
  return '<div class="' + reminderSetterSlot(row.multi ? 'rack' : 'tray') + '" role="group"'
    + ' aria-label="' + esc(row.label + '（' + who + '）') + '">'
    + row.options.map((o) => optionHtml(row, o.key, o.label, o.on)).join('')
    + '</div>';
}

/** 一个步进位（名字 ＋ 减 ＋ 读数 ＋ 加）：两枚键的命中盒都不小于触控地板，中间那枚是机器读数的另一种摆法。 */
function stepFieldHtml(step: ReminderSetterStep, label: string, value: string,
  decLabel: string, incLabel: string, what: string): string {
  const stepAttr = ' ' + REMINDER_SETTER_STEP_ATTR + '="' + esc(step) + '"';
  return '<div class="' + reminderSetterSlot('field') + '">'
    + '<span class="' + reminderSetterSlot('flabel') + '">' + esc(label) + '</span>'
    + '<div class="' + reminderSetterSlot('stepper') + '" role="group"'
    + ' aria-label="' + esc(label + '（' + what + '）') + '">'
    + '<button type="button" class="' + reminderSetterSlot('dec') + '"' + stepAttr
    + ' ' + REMINDER_SETTER_DELTA_ATTR + '="-1"'
    + ' aria-label="' + esc(decLabel + '（' + what + '）') + '">' + esc(REMINDER_SETTER_DEC) + '</button>'
    + '<span class="' + reminderSetterSlot('num') + '"'
    + ' ' + REMINDER_SETTER_READ_ATTR + '="' + esc(step) + '">' + esc(value) + '</span>'
    + '<button type="button" class="' + reminderSetterSlot('inc') + '"' + stepAttr
    + ' ' + REMINDER_SETTER_DELTA_ATTR + '="1"'
    + ' aria-label="' + esc(incLabel + '（' + what + '）') + '">' + esc(REMINDER_SETTER_INC) + '</button>'
    + '</div></div>';
}

/** 「什么时候响」那一行多出来的两个步进位：时间 ＋ 第一次从（都住在这一行的控制列里）。 */
function fieldsHtml(m: ReminderSetterDecisionsModel): string {
  const T = REMINDER_SETTER_TEXT;
  return '<div class="' + reminderSetterSlot('fields') + '">'
    + stepFieldHtml('time', T.timeLabel, m.time, T.early, T.late, m.title)
    + stepFieldHtml('start', T.startLabel, m.startDate, T.prevDay, T.nextDay, m.title)
    + '</div>';
}

/** 一行决定（左标签右控件；窄档折成上下两段，仍是这一行只做一个决定）。
 *  `fields`＝这一行下面再挂的那两个步进位（只有 `decisions` 那一档的「什么时候响」要挂）。 */
function rowHtml(who: string, row: ReminderSetterRow, fields: string): string {
  return '<div class="' + reminderSetterSlot('row') + '"'
    + ' ' + REMINDER_SETTER_ROW_ATTR + '="' + esc(row.part) + '">'
    + '<p class="' + reminderSetterSlot('label') + '">' + esc(row.label) + '</p>'
    + '<div class="' + reminderSetterSlot('ctl') + '">'
    + trayHtml(who, row) + fields
    + '</div></div>';
}

/** **全件唯一的读数行**：一行说完现在设的是多少（变的时候 `role="status"` 会念出来）。 */
function recapHtml(m: ReminderSetterDecisionsModel): string {
  return '<p class="' + reminderSetterSlot('read') + '"'
    + ' ' + REMINDER_SETTER_READ_ATTR + '="recap" role="status">' + esc(m.recap) + '</p>';
}

/** 形态 `decisions` 的骨架：抬头 → 三行决定 → 一行复述。 */
function renderDecisions(m: ReminderSetterDecisionsModel): string {
  return headHtml(m)
    + m.rows.map((row) => rowHtml(m.title, row, row.part === 'repeat' ? fieldsHtml(m) : '')).join('')
    + recapHtml(m);
}

/* ── 形态 `track`：一天刻度上摆着好几条提醒，点其中一条改它自己的三个决定 ────────────
 *
 *  **这一档比 `decisions` 省一层话**：没有抬头、没有复述那一行——
 *  「现在设的是多少」由图例那一行自己读出来（序号 ＋ 时间 ＋ 提醒名 ＋ 重复档／那句状态）。
 *  再写一行复述就是把同一个数印第二遍（用户 2026-09-25 砍掉的正是那一句）。
 *
 *  一枚提醒点＝**一个 44×44 的可点件**（命中盒不小于触控地板），落点由 `at` 算出来的
 *  `place` 写进行内样式：`left: calc((100% - 44px) * place + 22px)` ——
 *  两端各让出半个命中盒，最左／最右那一条的命中盒也不会顶出刻度条（窄档零横溢）。
 */

/** 一枚提醒点（刻度上那一个可点件）：徽章印序号，点本身印位置（形与色都在样式段里）。 */
function dotHtml(item: ReminderSetterTrackItemModel, touch: number): string {
  return '<button type="button" class="' + reminderSetterSlot('dot') + (item.on ? ' is-on' : '') + '"'
    + ' ' + REMINDER_SETTER_PART_ATTR + '="pick"'
    + ' ' + REMINDER_SETTER_VALUE_ATTR + '="' + esc(item.id) + '"'
    + ' ' + REMINDER_SETTER_AT_ATTR + '="' + String(item.at) + '"'
    + itemStateAttrs(item)
    + ' aria-pressed="' + (item.on ? 'true' : 'false') + '"'
    + ' aria-label="' + esc(item.time + ' ' + item.label) + '"'
    + ' style="left: calc((100% - ' + String(touch) + 'px) * ' + String(item.place) + ' + '
    + String(touch / 2) + 'px)">'
    + '<b>' + String(item.index) + '</b><i></i></button>';
}

/** 一条提醒自己的那三枚读数的**机器读数锚**（点与图例那一行都挂着：同一份状态的两种摆法）。 */
function itemStateAttrs(item: ReminderSetterTrackItemModel): string {
  return ' ' + REMINDER_SETTER_REPEAT_ATTR + '="' + esc(item.repeat) + '"'
    + ' ' + REMINDER_SETTER_LEAD_ATTR + '="' + esc(item.lead) + '"'
    + ' ' + REMINDER_SETTER_CHOSEN_ATTR + '="' + esc(item.chosen.join(' ')) + '"';
}

/** 图例里的一行（这条提醒现在设的是多少）：序号 ＋ 时间 ＋ 提醒名 ＋ 重复档；可点（点它＝选中它）。 */
function legendRowHtml(item: ReminderSetterTrackItemModel): string {
  return '<button type="button" class="' + reminderSetterSlot('lg') + (item.on ? ' is-on' : '') + '"'
    + ' ' + REMINDER_SETTER_PART_ATTR + '="pick"'
    + ' ' + REMINDER_SETTER_VALUE_ATTR + '="' + esc(item.id) + '"'
    + ' ' + REMINDER_SETTER_AT_ATTR + '="' + String(item.at) + '"'
    + itemStateAttrs(item)
    + ' aria-pressed="' + (item.on ? 'true' : 'false') + '">'
    + '<b>' + String(item.index) + '</b>'
    + '<em class="' + reminderSetterSlot('num') + '"'
    + ' ' + REMINDER_SETTER_READ_ATTR + '="at">' + esc(item.time) + '</em>'
    + '<span>' + esc(item.label) + '</span>'
    + '<span ' + REMINDER_SETTER_READ_ATTR + '="tail">' + esc(item.tail) + '</span></button>';
}

/** 一天那条刻度：刻度条（位置的参照） ＋ 上面每一枚提醒点。 */
function dayHtml(m: ReminderSetterTrackModel): string {
  return '<div class="' + reminderSetterSlot('day') + '">'
    + '<div class="' + reminderSetterSlot('ruler') + '">'
    + m.items.map((it) => dotHtml(it, REMINDER_SETTER_TOUCH_PX)).join('')
    + '</div>'
    + '<div class="' + reminderSetterSlot('hours') + '" aria-hidden="true">'
    + REMINDER_SETTER_HOURS.map((h) => '<span>' + String(h) + '</span>').join('')
    + '</div>'
    + '<div class="' + reminderSetterSlot('legend') + '">'
    + m.items.map((it) => legendRowHtml(it)).join('')
    + '</div></div>';
}

/** 选中那一条的「时间」那一行：两枚 44 的步进键夹一枚读数（改的是选中那条的 `at`）。 */
function trackStepHtml(m: ReminderSetterTrackModel): string {
  const T = REMINDER_SETTER_TEXT;
  const sel = m.items.filter((o) => o.on)[0];
  const stepAttr = ' ' + REMINDER_SETTER_STEP_ATTR + '="time"';
  return '<div class="' + reminderSetterSlot('row') + '"'
    + ' ' + REMINDER_SETTER_ROW_ATTR + '="time">'
    + '<p class="' + reminderSetterSlot('label') + '">' + esc(T.timeLabel) + '</p>'
    + '<div class="' + reminderSetterSlot('ctl') + '">'
    + '<div class="' + reminderSetterSlot('field') + '">'
    + '<div class="' + reminderSetterSlot('stepper') + '" role="group"'
    + ' aria-label="' + esc(T.timeLabel + '（' + sel.label + '）') + '">'
    + '<button type="button" class="' + reminderSetterSlot('dec') + '"' + stepAttr
    + ' ' + REMINDER_SETTER_DELTA_ATTR + '="-1"'
    + ' aria-label="' + esc(T.early + '（' + sel.label + '）') + '">' + esc(REMINDER_SETTER_DEC) + '</button>'
    + '<span class="' + reminderSetterSlot('num') + '"'
    + ' ' + REMINDER_SETTER_READ_ATTR + '="sel">' + esc(sel.time) + '</span>'
    + '<button type="button" class="' + reminderSetterSlot('inc') + '"' + stepAttr
    + ' ' + REMINDER_SETTER_DELTA_ATTR + '="1"'
    + ' aria-label="' + esc(T.late + '（' + sel.label + '）') + '">' + esc(REMINDER_SETTER_INC) + '</button>'
    + '</div></div></div></div>';
}

/** 形态 `track` 的骨架：一天那条刻度（点 ＋ 小时数 ＋ 图例） → 选中那一条的三个决定。 */
function renderTrack(m: ReminderSetterTrackModel): string {
  const sel = m.items.filter((o) => o.on)[0];
  const panel = (row: ReminderSetterRow): string => rowHtml(sel.label, row, '');
  return dayHtml(m)
    + '<div class="' + reminderSetterSlot('pick') + '">'
    + m.rows.slice(0, 2).map(panel).join('')
    + trackStepHtml(m)
    + m.rows.slice(2).map(panel).join('')
    + '</div>';
}

/** 形态 → 骨架（加第二形态就是加一支）。 */
const SKELETONS: {
  decisions: (m: ReminderSetterDecisionsModel) => string;
  track: (m: ReminderSetterTrackModel) => string;
} = {
  decisions: renderDecisions,
  track: renderTrack,
};

/** 渲染提醒设置（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderReminderSetter(input: unknown): string {
  const m = normalizeReminderSetter(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  /* 根**就是宿主**：`-host` 那一枚槽类必须落在根上（样式段里卡框与 `container-type`
   *  都挂在它名下；根上不带它 ⇒ 那一条规则成了永不命中的死声明，
   *  卡没有边／没有投影，`@container` 也永远找不到容器 ⇒ 窄档折行整段失效）。 */
  return '<div class="' + REMINDER_SETTER_CLASS + ' ' + reminderSetterSlot('host')
    + ' is-' + m.form + extra + '"'
    + ' ' + REMINDER_SETTER_ATTR + '="' + esc(m.id) + '"'
    + ' ' + REMINDER_SETTER_FORM_ATTR + '="' + m.form + '"'
    + (m.form === 'track' ? trackRootAttrs(m) : decisionsRootAttrs(m))
    + '>'
    + (m.form === 'track' ? SKELETONS.track(m) : SKELETONS.decisions(m))
    + '</div>';
}
