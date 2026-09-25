/** reminder-setter · **渲染**（纯函数产 HTML；按形态分派，今天只有 `decisions` 一支）。
 *
 *  —— 形态 `decisions`「一行一个决定」——
 *
 *  一屏三层，**每层一句话都没有多的**：
 *   · **抬头**：这一组设定在给哪条提醒设（`「记体重」的提醒`）；
 *   · **三行**：什么时候响 ／ 提前多久 ／ 走哪条通知——左边是这一行问什么，右边是这一行的全部可点项；
 *     日期与时间不走精确拖点，走两枚 44×44 的步进键夹一枚读数（手机上「点得到」）；
 *   · **一行复述**：全件唯一的读数行（`每天 2026-09-26 22:30`），一行说完，`role="status"` 会在变时念出来。
 *
 *  原型里的旁白与口径句一句都不上屏（2026-09-25 用户口径：原型里写了好多文字、看起来很混乱）。
 *
 *  五条硬口径（判据断的就是它们）：
 *   · **触屏可达**：三排可点项每枚 ≥`REMINDER_SETTER_TOUCH_PX` 高、相邻留 `REMINDER_SETTER_GAP_PX` 缝；
 *   · **状态不只靠颜色**：选中那枚＝形（勾 ＋ 方框／胶囊）＋ 字（档名 ＋ 字重）＋ 色（软底）三样；
 *   · **单选与多选形状分开**：单选留一枚**固定 `REMINDER_SETTER_TICK_PX` 宽的勾选槽位**（未选也留：
 *     一排胶囊的左右沿才齐平），多选是实心方框（这条可以多选，形状自己说得出）；
 *   · **数值永不截断**：时间与日期读数没有省略手段，窄档只换行；
 *   · **同页多实例**：全部 `aria-*` 都按入参 `id` 逐实例派生（`wizard-shell` 同一处教训）。
 */
import { esc } from '../shared/escape.js';
import {
  REMINDER_SETTER_ATTR,
  REMINDER_SETTER_CLASS,
  REMINDER_SETTER_DEC,
  REMINDER_SETTER_DELTA_ATTR,
  REMINDER_SETTER_FORM_ATTR,
  REMINDER_SETTER_INC,
  REMINDER_SETTER_PART_ATTR,
  REMINDER_SETTER_READ_ATTR,
  REMINDER_SETTER_ROW_ATTR,
  REMINDER_SETTER_START_ATTR,
  REMINDER_SETTER_STEP_ATTR,
  REMINDER_SETTER_TEXT,
  REMINDER_SETTER_TIME_ATTR,
  REMINDER_SETTER_VALUE_ATTR,
  reminderSetterHead,
  reminderSetterSlot,
  type ReminderSetterForm,
  type ReminderSetterStep,
} from './attrs.js';
import { normalizeReminderSetter, type ReminderSetterModel, type ReminderSetterRow } from './model.js';

/** 抬头那一行（`「记体重」的提醒`：它是什么）。 */
function headHtml(m: ReminderSetterModel): string {
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

/** 这一行的可点项那一排（`role="group"` 带这一行的名字：屏读器念得出「什么时候响」是哪一组）。 */
function trayHtml(m: ReminderSetterModel, row: ReminderSetterRow): string {
  return '<div class="' + reminderSetterSlot(row.multi ? 'rack' : 'tray') + '" role="group"'
    + ' aria-label="' + esc(row.label + '（' + m.title + '）') + '">'
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
function fieldsHtml(m: ReminderSetterModel): string {
  const T = REMINDER_SETTER_TEXT;
  return '<div class="' + reminderSetterSlot('fields') + '">'
    + stepFieldHtml('time', T.timeLabel, m.time, T.early, T.late, m.title)
    + stepFieldHtml('start', T.startLabel, m.startDate, T.prevDay, T.nextDay, m.title)
    + '</div>';
}

/** 一行决定（左标签右控件；窄档折成上下两段，仍是这一行只做一个决定）。 */
function rowHtml(m: ReminderSetterModel, row: ReminderSetterRow): string {
  return '<div class="' + reminderSetterSlot('row') + '"'
    + ' ' + REMINDER_SETTER_ROW_ATTR + '="' + esc(row.part) + '">'
    + '<p class="' + reminderSetterSlot('label') + '">' + esc(row.label) + '</p>'
    + '<div class="' + reminderSetterSlot('ctl') + '">'
    + trayHtml(m, row)
    + (row.part === 'repeat' ? fieldsHtml(m) : '')
    + '</div></div>';
}

/** **全件唯一的读数行**：一行说完现在设的是多少（变的时候 `role="status"` 会念出来）。 */
function recapHtml(m: ReminderSetterModel): string {
  return '<p class="' + reminderSetterSlot('read') + '"'
    + ' ' + REMINDER_SETTER_READ_ATTR + '="recap" role="status">' + esc(m.recap) + '</p>';
}

/** 形态 `decisions` 的骨架：抬头 → 三行决定 → 一行复述。 */
function renderDecisions(m: ReminderSetterModel): string {
  return headHtml(m) + m.rows.map((row) => rowHtml(m, row)).join('') + recapHtml(m);
}

/** 形态 → 骨架（加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<ReminderSetterForm, (m: ReminderSetterModel) => string>> = {
  decisions: renderDecisions,
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
    + ' ' + REMINDER_SETTER_TIME_ATTR + '="' + esc(m.time) + '"'
    + ' ' + REMINDER_SETTER_START_ATTR + '="' + esc(m.startDate) + '">'
    + SKELETONS[m.form](m)
    + '</div>';
}
