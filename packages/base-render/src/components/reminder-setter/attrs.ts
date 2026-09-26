/** reminder-setter · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 89 件，2026-09 起用户逐格打分）
 *  里的**两档**（用户 2026-09-26 给 B 档 4／4／4）：
 *   · **A 档 `decisions`「一行一个决定」**：三行——什么时候响 ／ 提前多久 ／ 走哪条通知，一行只做一个决定；
 *   · **B 档 `track`「一天刻度上摆点」**：一天那条刻度上摆着好几条提醒，看得见它们落在哪儿；
 *     点其中一枚点，就改**它自己**的三个决定（重复 ／ 提前多久 ／ 走哪条通知）。
 *  B 档照用户砍过字的那一版落地（原型 398 字 → 172 字：删掉三句口径旁白、删掉编辑面板那行
 *  「选中：22:30 记体重」——图例那行已经印着同一件事），旁白一句都不上屏。
 *
 *  形态键写在 `REMINDER_SETTER_FORMS` 闭集里：键取**骨架的名字**（`decisions`＝一行一个决定），
 *  原型墙上的格号（A）不是接口名（同批 `kanban-columns` 的 `status` 同此口径）。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 *
 *  **一屏只留一层话**（2026-09-25 用户口径：原型里写了好多文字、看起来很混乱）：本件屏上**只有三样**——
 *  「它是什么」（抬头一行）＋「现在设的是多少」（选中态、时间与日期读数、以及**唯一一行**复述）
 *  ＋「能按什么」（三排可点项）。原型里的旁白与口径句（「挑一次或重复，别混着猜」「可选，给容易忘的事留一道」
 *  「可多选，至少留一条；全关掉这条提醒就不存在」「免打扰时段…」）**一句都不进屏面**：那些话住在 README 里。
 *  同一个数只印一次（读数口在根上的 `data-*`，屏上只有时间读数与复述各一处），读数一行说完（`recap`）。
 *  形态 `track` 更省一层：**没有抬头、没有复述那一行**——「现在设的是多少」由图例那一行自己读出来
 *  （序号 ＋ 时间 ＋ 提醒名 ＋ 重复档）。
 *
 *  **触屏可达是底线**（触屏优先法条）：三排可点项每枚 ≥44 高、相邻 8px 缝；**日期与时间不走精确拖点、
 *  也不靠打字**——走两枚 44×44 的步进键（`−`／`＋`）夹一枚读数，一根手指就改得动。
 *  键盘（`:focus-visible`）只留给真实键盘用户，是本件的地板，不是通路。
 *
 *  **零键盘语汇**：标记与文案里没有键帽（`⌘`／`Esc`／`↑↓` 那一路），运行时段不接任何键盘事件。
 */

/** 本件的类名根：全部槽位类名都是 `REMINDER_SETTER_CLASS + '-' + 槽名`。 */
export const REMINDER_SETTER_CLASS = 'ilife-block-reminder-setter';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts`／`runtime.ts` 与判据都用这里的名字拼类名）。
 *
 *  取名避开「容器名是项名的前缀」那种撞法（`pills` 与 `pill`），判据在标记串上找槽位时不会把容器当项。 */
export const REMINDER_SETTER_SLOTS = [
  /** 宿主（卡：抬头 ＋ 三行决定 ＋ 复述；它自己就是容器）。 */
  'host',
  /** 抬头：这一组设定是在给哪条提醒设（「记体重」的提醒）。 */
  'head',
  /** 一行决定（左边问什么，右边这一行的全部可点项）。 */
  'row',
  /** 这一行问什么（如「什么时候响」；一行一个决定）。 */
  'label',
  /** 这一行的控制列（三排可点项与两个步进位都住这里）。 */
  'ctl',
  /** 单选那一排（什么时候响／提前多久）。 */
  'tray',
  /** 单选的**一枚胶囊**（未选也留一枚 14px 的勾选槽位：一排胶囊左右沿齐平）。 */
  'chip',
  /** 步进位的容器（读数的两个字段并排；窄档折行）。 */
  'fields',
  /** 一个步进位（「时间」或「第一次从」）。 */
  'field',
  /** 步进位的名字（弱文字档：时间／第一次从）。 */
  'flabel',
  /** 步进器（减 ＋ 读数 ＋ 加；读数**永不截断**）。 */
  'stepper',
  /** 减一枚（44×44，无障碍名写清减多少）。 */
  'dec',
  /** 中间的读数（时间或日期；`tabular-nums`）。 */
  'num',
  /** 加一枚（44×44）。 */
  'inc',
  /** 多选那一排（走哪条通知）。 */
  'rack',
  /** 多选的**一枚方框**（形是方框：这条可以多选；一枚都不勾＝这条提醒不会响，照实读出来）。 */
  'check',
  /** 复述那一行（**全件唯一的读数行**：一行说完现在设的是多少；`role="status"`）。 */
  'read',
  /* ── 形态 `track`（一天刻度上摆着好几条提醒）多出来的槽位 ──────────────
   *
   *  **一屏只留一层话**：这一档**没有抬头、没有复述那一行**——「现在设的是多少」由图例那一行
   *  （`lg`）自己读出来：序号 ＋ 时间 ＋ 提醒名 ＋ 重复档（一条通知都没勾时那一截换成那句状态）。
   *  再写一行复述就是把同一个数印第二遍（用户 2026-09-25 砍掉的正是这一句）。 */
  /** 一天那一整块（刻度 ＋ 小时数 ＋ 图例）。 */
  'day',
  /** 刻度条（**位置的参照**：一枚点落在哪一格由 `at` 算出来）。 */
  'ruler',
  /** 刻度上的一枚提醒点（可点：命中盒不小于触控地板）。 */
  'dot',
  /** 刻度下面那几个小时数（0／6／12／18／24）。 */
  'hours',
  /** 图例那一列（一行一条提醒）。 */
  'legend',
  /** 图例里的一行（可点；选中那行有那一档形——它是这一档的「现在设的是多少」）。 */
  'lg',
  /** 选中那一条的三个决定（这块面板**只画选中的那一条**）。 */
  'pick',
] as const;
export type ReminderSetterSlot = (typeof REMINDER_SETTER_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `REMINDER_SETTER_CLASS + '-' + …`）。 */
export function reminderSetterSlot(slot: ReminderSetterSlot, prefix = 'ilife-'): string {
  return prefix + 'block-reminder-setter-' + slot;
}

/** 形态闭集：两档英文键（**键取骨架的名字**，不是原型墙上的格号）。
 *
 *   · `decisions`——**一行一个决定**：什么时候响 ／ 提前多久 ／ 走哪条通知（一件提醒，三行摊开）；
 *   · `track`——**一天刻度上摆着好几条提醒**：一圈点上认「它们落在哪儿」，点其中一条就改它自己的三个决定。
 *  两个键都取骨架名（同批 `kanban-columns` 的 `status` 同此口径）；闭集外的值一律 `badInput`。 */
export const REMINDER_SETTER_FORMS = ['decisions', 'track'] as const;
export type ReminderSetterForm = (typeof REMINDER_SETTER_FORMS)[number];

/* ── `data-*` 名（渲染与运行时共用的发现锚） ───────────────────────── */

/** 根（值＝提醒 `id`）。 */
export const REMINDER_SETTER_ATTR = 'data-ilife-reminder';
/** 形态（值是闭集内的那一个键，照实写进标记）。 */
export const REMINDER_SETTER_FORM_ATTR = 'data-ilife-reminder-form';
/** 一行决定是哪一个（`repeat`／`lead`／`route`）：只做分组标记，**不是可点锚**。 */
export const REMINDER_SETTER_ROW_ATTR = 'data-ilife-reminder-row';
/** 一枚可点项属于哪一个决定（`repeat`／`lead`／`route`；运行时按它认「点的是哪一排」）。 */
export const REMINDER_SETTER_PART_ATTR = 'data-ilife-reminder-part';
/** 这一枚的机器键（事件 `detail.value` 就是它）。 */
export const REMINDER_SETTER_VALUE_ATTR = 'data-ilife-reminder-value';
/** 步进键／读数属于哪一档（`time`／`start`）。 */
export const REMINDER_SETTER_STEP_ATTR = 'data-ilife-reminder-step';
/** 步进键的方向（`-1`／`1`）。 */
export const REMINDER_SETTER_DELTA_ATTR = 'data-ilife-reminder-delta';
/** 读数格是哪一格（`time`／`start`／`recap`；运行时按它原地重写）。 */
export const REMINDER_SETTER_READ_ATTR = 'data-ilife-reminder-read';
/** 根上：现在设的时间（机器读数 `HH:MM`；**屏上那枚读数只是它的另一种摆法**）。 */
export const REMINDER_SETTER_TIME_ATTR = 'data-ilife-reminder-time';
/** 根上：第一次从哪一天（机器读数 `YYYY-MM-DD`）。 */
export const REMINDER_SETTER_START_ATTR = 'data-ilife-reminder-start';
/** 记账：这张卡已被运行时段接管（幂等读数，不是开关）。 */
export const REMINDER_SETTER_BOUND_ATTR = 'data-ilife-reminder-bound';
/** 幂等开关：挂在 `<html>` 上（重复注入只绑一次）。 */
export const REMINDER_SETTER_RUNTIME_ATTR = 'data-ilife-reminder-runtime';
/** 根上（形态 `track`）：现在选中的是哪一条（机器键，`items[].id`）。 */
export const REMINDER_SETTER_PICKED_ATTR = 'data-ilife-reminder-picked';
/** 一天里的第几分钟（`0`–`1439`）：**根上＝选中那一条的，每一枚点上＝这一条自己的**。 */
export const REMINDER_SETTER_AT_ATTR = 'data-ilife-reminder-at';
/** 形态 `track`：这一条现在选的重复档键（住在它自己那几枚可点件上）。 */
export const REMINDER_SETTER_REPEAT_ATTR = 'data-ilife-reminder-repeat';
/** 形态 `track`：这一条现在选的提前档键。 */
export const REMINDER_SETTER_LEAD_ATTR = 'data-ilife-reminder-lead';
/** 形态 `track`：这一条勾上的通知档键（**空格分隔**，顺序＝ `routes` 里的顺序）。 */
export const REMINDER_SETTER_CHOSEN_ATTR = 'data-ilife-reminder-chosen';

/* ── 事件（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」） ────── */

/** 任何一处改动（换档／勾选／步进）之后派发一条：`detail={id,part,value,state}`（`state` 见 README）。 */
export const REMINDER_SETTER_EVENT_CHANGE = 'ilife:reminder-setter-change';

/* ── 三个决定的机器键（行序与屏上顺序一致：什么时候响 → 提前多久 → 走哪条通知） ── */

/** 三个决定的机器键（也是行标记的顺序；`time`／`start` 两个步进位不在这一份里）。 */
export const REMINDER_SETTER_PARTS = ['repeat', 'lead', 'route'] as const;
export type ReminderSetterPart = (typeof REMINDER_SETTER_PARTS)[number];
/** 两个步进位（时间与第一次从）。 */
export const REMINDER_SETTER_STEPS = ['time', 'start'] as const;
export type ReminderSetterStep = (typeof REMINDER_SETTER_STEPS)[number];

/* ── 几何与能力（判据与样式段读同一份常量） ─────────────────────── */

/** 触控地板：三排可点项与两枚步进键的命中盒不小于这个数（px）。 */
export const REMINDER_SETTER_TOUCH_PX = 44;
/** 相邻触控目标之间的缝（px）。 */
export const REMINDER_SETTER_GAP_PX = 8;
/** 勾选槽位的固定宽度（px）：**未选也留**，一排胶囊的左右沿才齐平。 */
export const REMINDER_SETTER_TICK_PX = 14;
/** 多选那一枚的方框边长（px，形：方框＝这条可以多选）。 */
export const REMINDER_SETTER_BOX_PX = 16;
/** 行首「这一行问什么」那一列的宽上限（px）：宽档左标签右控件，窄档折成上下两段。 */
export const REMINDER_SETTER_LABEL_PX = 158;
/** 本件自己的**容器**名（`@container` 按它命中，不会跟别件的容器串味）。 */
export const REMINDER_SETTER_CONTAINER = 'ilife-reminder-setter';
/** 窄档断点（px）：**本件自己**窄于它就把「左标签右控件」折成上下两段。这是容器断点，不是视口断点。 */
export const REMINDER_SETTER_NARROW_PX = 560;
/** 悬停只许是增强：这一段能力查询**样式段读它**（运行时不抢焦点，不读它）。 */
export const REMINDER_SETTER_HOVER_QUERY = '(hover: hover) and (pointer: fine)';
/** 时间步进的步长（分钟）：**5** —— 读数永远落在 00:00 起的 5 分钟格子上，步进键够得着每一个合法取值。 */
export const REMINDER_SETTER_TIME_STEP_MIN = 5;
/** 日期步进的步长（天）。 */
export const REMINDER_SETTER_DATE_STEP_DAYS = 1;
/** 单选档的上下限（档）：1 档谈不上「挑一次或重复」。 */
export const REMINDER_SETTER_MIN_CHOICES = 2;
export const REMINDER_SETTER_MAX_CHOICES = 4;
/** 通知通道档的上下限（档）：至少给一条（否则这条提醒设了也不会响），至多 4 条。 */
export const REMINDER_SETTER_MIN_ROUTES = 1;
export const REMINDER_SETTER_MAX_ROUTES = 4;
/** 形态 `track` 一天的分钟数（刻度那一圈就是它：`at` 是它里面的第几分钟）。 */
export const REMINDER_SETTER_DAY_MIN = 24 * 60;
/** 形态 `track` 刻度上能摆几条：1 条谈不上「好几条落在哪儿」，5 条以上窄容器里两枚点的命中盒会叠。 */
export const REMINDER_SETTER_MIN_ITEMS = 2;
export const REMINDER_SETTER_MAX_ITEMS = 4;
/** 刻度下面那几个小时数（0 点起，每 6 小时一格，末枚就是一天到头那一格）。 */
export const REMINDER_SETTER_HOURS = [0, 6, 12, 18, 24] as const;

/* ── 形（选中态的「形」那一半：不只靠颜色） ────────────────────────── */

/** 单选与多选选中的那枚勾。 */
export const REMINDER_SETTER_TICK = '✓';
/** 步进键上的两枚记号（不是键帽，是加减号）。 */
export const REMINDER_SETTER_DEC = '−';
export const REMINDER_SETTER_INC = '＋';

/* ── 文案（缺省的那几句；调用方换档名与提醒名，这三句别换） ─────────────
 *
 *  **屏上只留一层话**：这一份里每一句都是「它是什么／这一行问什么／这一格是什么」，
 *  一句解释性的话都没有（「至少留一条」「可多选」这类口径由形与复述承担，不由句子承担）。 */

export const REMINDER_SETTER_TEXT = Object.freeze({
  /** 抬头的两半：`「记体重」的提醒`。 */
  headPrefix: '「',
  headSuffix: '」的提醒',
  /** 三行各自问什么（一行只做一个决定）。 */
  repeatLabel: '什么时候响',
  leadLabel: '提前多久',
  routeLabel: '走哪条通知',
  /** 两个步进位的名字。 */
  timeLabel: '时间',
  startLabel: '第一次从',
  /** 两枚步进键的无障碍名（步长从常量算，不写死数字）。 */
  early: '早 ' + String(REMINDER_SETTER_TIME_STEP_MIN) + ' 分钟',
  late: '晚 ' + String(REMINDER_SETTER_TIME_STEP_MIN) + ' 分钟',
  prevDay: '前 ' + String(REMINDER_SETTER_DATE_STEP_DAYS) + ' 天',
  nextDay: '后 ' + String(REMINDER_SETTER_DATE_STEP_DAYS) + ' 天',
  /** 一条通知都没勾时，唯一那行读数写的**状态**（不是旁白：它就是现在设的是多少）。 */
  silent: '没有通知，不会响',
} as const);

/** 抬头那一行（`「记体重」的提醒`）。 */
export function reminderSetterHead(title: string): string {
  return REMINDER_SETTER_TEXT.headPrefix + title + REMINDER_SETTER_TEXT.headSuffix;
}

/** 两位补零（时间与日期共用一处口径）。
 *
 *  **这一段源码会被运行时段原样嵌一份**（`runtime.ts` 用 `.toString()` 嵌 `pad2`／两个步进函数／
 *  `reminderSetterRecap`）：两份必须逐字同源，两处各写一遍「步进怎么算」迟早走散
 *  （口径与 `relation-picker` 嵌 `HITS`／`FOOT` 同一处）。 */
export function pad2(value: number): string {
  return value < 10 ? '0' + String(value) : String(value);
}

/** 时间步进（`steps` 步、每步 `stepMinutes` 分钟，跨零点绕回）：读数恒是 `HH:MM`。
 *
 *  步长当**入参**传进来（不在这儿读常量）：运行时段嵌的是这一段源码，它拿不到模块里的常量。 */
export function reminderSetterStepTime(time: string, steps: number, stepMinutes: number): string {
  const parts = time.split(':');
  const total = (Number(parts[0]) * 60 + Number(parts[1])
    + steps * stepMinutes + 24 * 60) % (24 * 60);
  return pad2(Math.floor(total / 60)) + ':' + pad2(total % 60);
}

/** 日期步进（`steps` 步、每步 `stepDays` 天，按 UTC 算：不随本机时区跳一天）。 */
export function reminderSetterStepDate(date: string, steps: number, stepDays: number): string {
  const parts = date.split('-');
  const at = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    + steps * stepDays * 24 * 60 * 60 * 1000);
  const y = at.getUTCFullYear();
  return (y < 1000 ? ('000' + String(y)).slice(-4) : String(y))
    + '-' + pad2(at.getUTCMonth() + 1) + '-' + pad2(at.getUTCDate());
}

/** 复述那一行（**全件唯一的读数行**，一行说完）：`每天 2026-09-26 22:30`。
 *
 *  一条通知都没勾时换成那句状态（`没有通知，不会响`）——**这一支口径只有这一处**：
 *  文案表当入参传进来（运行时段嵌的是这一段源码，同上一条理由）。 */
export function reminderSetterRecap(repeatLabel: string, startDate: string, time: string, chosen: number,
  text: { readonly silent: string }): string {
  if (chosen === 0) return text.silent;
  return repeatLabel + ' ' + startDate + ' ' + time;
}

/* ── 形态 `track` 的三个纯函数（渲染期与运行时段**同一份源码**：同上，运行时嵌的就是它们） ── */

/** 一天里的第几分钟 → 屏上那个时刻（`420` ⇒ `07:00`）。机器读数与它印出来的样子只差这一处换算。 */
export function reminderSetterClock(at: number): string {
  const rest = ((at % (24 * 60)) + 24 * 60) % (24 * 60);
  return pad2(Math.floor(rest / 60)) + ':' + pad2(rest % 60);
}

/** 一天里的第几分钟 → 落在刻度上的比例（`0`–`1`，刻度从左端 0 点到右端一天到头）。
 *
 *  这个数就是**位置**：标记里那一枚点的 `left` 由它算出来（`render.ts` 只把它摆进样式串）。 */
export function reminderSetterPlace(at: number): number {
  return at / (24 * 60);
}

/** `at` 步进（一步 `stepMinutes` 分钟，跨零点绕回）：读数恒落在 `0`–`1439` 那一圈里。 */
export function reminderSetterStepAt(at: number, steps: number, stepMinutes: number): number {
  const day = 24 * 60;
  return ((at + steps * stepMinutes) % day + day) % day;
}

/** 图例那一行的**尾一截**：一条通知都没勾时读成那句状态（与 `reminderSetterRecap` 同一处口径：
 *  这一支只写一遍——「没有通知，不会响」不是旁白，它就是现在设的是多少）。 */
export function reminderSetterTrackTail(repeatLabel: string, chosen: number,
  text: { readonly silent: string }): string {
  if (chosen === 0) return text.silent;
  return repeatLabel;
}

/* ── 入参类型 ───────────────────────────────────────────────────── */

/** 一档可选值（重复档／提前档／通知档共用同一个形状：机器键 ＋ 屏上那两个字）。 */
export interface ReminderSetterOption {
  /** 机器键（事件 `detail.value`／`state` 里原样送出）。**非空、只许标识符字符**，同一排内唯一。 */
  readonly key: string;
  /** 屏上那一档的名字（如「每天」「提前 10 分钟」「系统通知」）。**非空、且不能只有空白**；长了换行。 */
  readonly label: string;
}

/** 提醒设置入参。`id`／`title`／`repeats`／`repeat`／`time`／`startDate`／`leads`／`lead`／`routes`／`chosen` 十样必填。
 *
 *  **三排档名由调用方给**（本件不猜「每周几」是哪一天、也不猜有哪几条通知通道）：件只负责把它摆成
 *  「一行一个决定」并守住可达性。 */
export interface ReminderSetterInput {
  /** 机器键（事件 `detail.id` 就是它）。**只许标识符字符**。 */
  readonly id: string;
  /** 给哪条提醒设（如「记体重」）。**非空、且不能只有空白**；屏上写「「记体重」的提醒」。 */
  readonly title: string;
  /** 什么时候响的那一排（**2–4 档**，顺序＝屏上顺序）。 */
  readonly repeats: readonly ReminderSetterOption[];
  /** 现在选的是哪一档（须命中 `repeats` 里的一枚）。 */
  readonly repeat: string;
  /** 提醒时间（`HH:MM`，24 小时制）。**分钟要落在 `REMINDER_SETTER_TIME_STEP_MIN` 那一档上**：
   *  改法是两枚步进键，落不到的点不许给（给了也点不到 ⇒ 当场报 `BlocksError`）。 */
  readonly time: string;
  /** 第一次从哪一天（`YYYY-MM-DD`；必须是真实存在的一天）。 */
  readonly startDate: string;
  /** 提前多久的那一排（**2–4 档**）。 */
  readonly leads: readonly ReminderSetterOption[];
  /** 现在选的是哪一档（须命中 `leads` 里的一枚）。 */
  readonly lead: string;
  /** 走哪条通知的那一排（**1–4 档**；形是方框＝这条可以多选）。 */
  readonly routes: readonly ReminderSetterOption[];
  /** 勾上的通知档（`routes` 里的机器键，**0–4 个**）。
   *  给空数组＝合法：屏上照实读成「没有通知，不会响」（本件不把「至少留一条」写成一句话，也不用变灰的控件挡人）。 */
  readonly chosen: readonly string[];
  /** 形态键（闭集，缺省 `decisions`）。 */
  readonly form?: ReminderSetterForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
  /** **形态 `track`**：这一天刻度上摆着的那几条提醒（**2–4 条**，顺序＝刻度上的先后由 `at` 定）。 */
  readonly items?: readonly ReminderSetterTrackItem[];
  /** **形态 `track`**：现在选中的是哪一条（须命中 `items` 里的一枚 `id`）；下面那块面板改的就是它。 */
  readonly picked?: string;
}

/** 形态 `track` 里的一条提醒＝一天刻度上的一枚点（它自己的三个决定住在它自己身上）。
 *
 *  「一天里好几条提醒、要看它们落在哪儿」：位置由 `at` 算出来，三个决定（重复／提前多久／通知）
 *  是**这一条自己的**——点它一下，下面那块面板换成它的。 */
export interface ReminderSetterTrackItem {
  /** 机器键（事件 `detail.value`／`state.items[].id` 就是它）。**只许标识符字符**，一整天里唯一。 */
  readonly id: string;
  /** 提醒名（如「吃药」）。**非空、且不能只有空白**；图例那一行印它。 */
  readonly label: string;
  /** 一天里的第几分钟（`0`–`1439`，**落在 `REMINDER_SETTER_TIME_STEP_MIN` 那一档上**）：
   *  刻度上的位置与屏上那个时刻都由它算出来——改它只有一条路：两枚 44 的步进键。 */
  readonly at: number;
  /** 这一条选的重复档（须命中 `repeats` 里的一枚）。 */
  readonly repeat: string;
  /** 这一条选的提前档（须命中 `leads` 里的一枚）。 */
  readonly lead: string;
  /** 这一条勾上的通知档（`routes` 里的机器键，**0–4 个**；给空数组＝照实读成「没有通知，不会响」）。 */
  readonly chosen: readonly string[];
}
