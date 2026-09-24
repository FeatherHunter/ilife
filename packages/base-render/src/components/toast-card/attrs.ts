/** toast-card · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／语气闭集／`data-*`／事件名／入参类型）。
 *
 *  这一件是什么：**另一件 toast**——与冻结面那件 `renderToast`（住 `src/controls.ts`，公开名
 *  `renderToast`／`ToastInput`／`TOAST_ICONS`／`TOAST_DEFAULTS`）**并存**，不是它的替代。
 *  冻结面那件是「以前那种形态」（深色毛玻璃卡 ＋「✓ 知道了」）；本件是另一种样式，供开发者按场景选用：
 *  `surface` 底 ＋ 发丝线 ＋ **左侧语义色竖条**，零阴影、零圆角下也立得住。
 *
 *  四条硬口径（判据逐条断）：
 *   ① **状态不只靠色**：语气档同时给三样——竖条**粗细**（`TOAST_CARD_TONE_RULES`：3／4／6px）
 *      ＋ 图标**字形**（`TOAST_CARD_TONE_GLYPHS`：✓／!／✕）＋ **语气字**（`TOAST_CARD_TONE_WORDS`）；
 *   ② **结构固定**：图标 ＋ 标题 ＋ 一句细节 ＋ 至多一个动作 ＋ 关闭。「至多一个动作」由**入参面**守住
 *      （`action` 是**一个对象**，不是数组：给了数组一律 `badInput`）；
 *   ③ **自动消失有时限**：缺省 `TOAST_CARD_DEFAULT_MS`（4 秒）、可配 `TOAST_CARD_MIN_MS`～`TOAST_CARD_MAX_MS`
 *      （3–5 秒）；要更久就让用户点关闭。同一时刻最多堆 `TOAST_CARD_MAX_STACK` 条，
 *      第 4 条来时挤掉最旧的一条；
 *   ④ **危险档必须说得清**：`tone: 'danger'` 而不给 `detail` ⇒ `badInput`——
 *      关键信息不许只活在这条会自动消失的提示里（写库失败这类必须同时有落点）。
 */

/** 本件的类名根（一条提示）：槽位类名都是 `<前缀>block-toast-card-<槽名>`。 */
export function toastCardName(prefix = 'ilife-'): string {
  return prefix + 'block-toast-card';
}

/** 本件的类名根（缺省前缀）。 */
export const TOAST_CARD_CLASS: string = toastCardName();

/** 槽位闭集。 */
export const TOAST_CARD_SLOTS = [
  /** 堆栈容器（宿主席位：**位置与宽度归页面**，本件不写 `position`）。 */
  'stack',
  /** 图标底盘（字形落在里面）；`aria-hidden`——语气由语气字承担。 */
  'icon',
  /** 正文区（标题那一行 ＋ 细节句）。 */
  'body',
  /** 标题那一行（语气字 ＋ 标题）。 */
  'head',
  /** 语气字（「已完成」／「请注意」／「没成功」）：**色之外的第二样文字**。 */
  'tone',
  /** 标题（这条提示**做完了什么**）。 */
  'title',
  /** 一句细节（写进哪儿了／出了什么事；`danger` 档必填）。 */
  'detail',
  /** 动作与关闭那一排。 */
  'tool',
  /** 至多一枚动作键（动词：「撤销」／「看详情」）。 */
  'action',
  /** 关闭键（可读名字走 `closeLabel`）。 */
  'close',
] as const;
export type ToastCardSlot = (typeof TOAST_CARD_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function toastCardSlot(slot: ToastCardSlot, prefix = 'ilife-'): string {
  return toastCardName(prefix) + '-' + slot;
}

/** 语气闭集（**机器键**）：`ok` 做成了 ／ `warn` 做成了但要注意 ／ `danger` 没做成。 */
export const TOAST_CARD_TONES = ['ok', 'warn', 'danger'] as const;
export type ToastCardTone = (typeof TOAST_CARD_TONES)[number];

/** 语气 → 屏上那两个字（**色之外的第二样**）。唯一出处，判据从这里取。 */
export const TOAST_CARD_TONE_WORDS: Readonly<Record<ToastCardTone, string>> = Object.freeze({
  ok: '已完成',
  warn: '请注意',
  danger: '没成功',
});

/** 语气 → 图标字形（**色之外的第三样**；图标位 `aria-hidden`，语义由语气字承担）。 */
export const TOAST_CARD_TONE_GLYPHS: Readonly<Record<ToastCardTone, string>> = Object.freeze({
  ok: '✓',
  warn: '!',
  danger: '✕',
});

/** 语气 → 左竖条的粗细（px）：**形状上的第二样**（把三档色压成同一个墨黑也分得开）。 */
export const TOAST_CARD_TONE_RULES: Readonly<Record<ToastCardTone, number>> = Object.freeze({
  ok: 3,
  warn: 4,
  danger: 6,
});

/** 语气 → `role`：普通两档 `status`，危险档 `alert`（**唯一出处**，渲染与 README 都读它）。 */
export const TOAST_CARD_TONE_ROLES: Readonly<Record<ToastCardTone, string>> = Object.freeze({
  ok: 'status',
  warn: 'status',
  danger: 'alert',
});

/** 语气 → `aria-live`：`role="status"` 隐含 polite、`role="alert"` 隐含 assertive；本件**显式写出来**，
 *  让「一条提示什么时候被念」在标记里看得见。 */
export const TOAST_CARD_TONE_LIVE: Readonly<Record<ToastCardTone, string>> = Object.freeze({
  ok: 'polite',
  warn: 'polite',
  danger: 'assertive',
});

/** 关闭键的可读名字（缺省；调用方可用 `closeLabel` 覆盖）。 */
export const TOAST_CARD_CLOSE_LABEL = '关闭这条提示';
/** 关闭键上的字形（**装饰**：`aria-hidden`，名字由 `aria-label` 给）。 */
export const TOAST_CARD_CLOSE_GLYPH = '×';

/** 自动消失的时长（毫秒）：缺省与上下限。**要更久就让用户点关闭**——不许把关键信息押在计时上。 */
export const TOAST_CARD_DEFAULT_MS = 4000;
export const TOAST_CARD_MIN_MS = 3000;
export const TOAST_CARD_MAX_MS = 5000;

/** 同一时刻最多堆几条；第 N+1 条来时挤掉最旧的一条。 */
export const TOAST_CARD_MAX_STACK = 3;

/** 堆栈锚：宿主席位（运行时按它找堆栈；页面用 `renderToastCardStack()` 产它）。 */
export const TOAST_CARD_STACK_ATTR = 'data-ilife-toast-card-stack';
/** 一条提示的锚（运行时按它找每条提示）。 */
export const TOAST_CARD_ITEM_ATTR = 'data-ilife-toast-card-item';
/** 语气锚：`value` ∈ `TOAST_CARD_TONES`。 */
export const TOAST_CARD_TONE_ATTR = 'data-ilife-toast-card-tone';
/** 时长锚（毫秒）：运行时段按它给每条独立计时。 */
export const TOAST_CARD_DURATION_ATTR = 'data-ilife-toast-card-duration';
/** 堆栈容量锚（缺省 `TOAST_CARD_MAX_STACK`；运行时只认 ≤ 它）。 */
export const TOAST_CARD_MAX_ATTR = 'data-ilife-toast-card-max';
/** 动作锚：`value` ＝ 调用方给的动作名（事件里原样回给调用方）。 */
export const TOAST_CARD_ACTION_ATTR = 'data-ilife-toast-card-action';
/** 关闭锚。 */
export const TOAST_CARD_CLOSE_ATTR = 'data-ilife-toast-card-close';
/** 绑定过的记号（重复扫描只绑一次）。 */
export const TOAST_CARD_BOUND_ATTR = 'data-ilife-toast-card-bound';
/** 「计时被拖住」的记号（指针停在上面／键盘焦点在里面 ⇒ 停表；离开后重新计满）。 */
export const TOAST_CARD_PAUSED_ATTR = 'data-ilife-toast-card-paused';
/** 运行时段装好的记号（挂在 `documentElement` 上，重复注入只装一次）。 */
export const TOAST_CARD_RUNTIME_ATTR = 'data-ilife-toast-card-runtime';

/** 正在离场那条上的类名（透明化 ＋ 下移，到时真删；`prefers-reduced-motion` 下不位移）。 */
export const TOAST_CARD_LEAVING_CLASS = 'is-leaving';

/** 动作键派发的事件名（调用方按它去做那件事）。`detail = { action, tone }`。 */
export const TOAST_CARD_EVENT_ACTION = 'ilife:toast-card-action';

/** 动作名（`action.id`）的写法：小写字母开头，小写字母／数字／横线。 */
export const TOAST_CARD_ACTION_ID_RE = /^[a-z][a-z0-9-]*$/;

/** 至多一枚动作（**一个对象，不是数组**）。 */
export interface ToastCardAction {
  /** 动作名（闭集外的写法一律拒）：事件里原样回给调用方。 */
  readonly id: string;
  /** 动作键上的**动词**（「撤销」／「看详情」）：它同时是这枚键的可读名字。 */
  readonly label: string;
}

/** 一条提示的入参。 */
export interface ToastCardInput {
  /** 标题：这条提示**做完了什么**（「写入 3 条」「没能写入」）。**非空**。 */
  readonly title: string;
  /** 语气档（闭集，缺省 `ok`）：竖条粗细 ＋ 图标字形 ＋ 语气字 ＋ `role` 都由它定。 */
  readonly tone?: ToastCardTone;
  /** 一句细节（写进哪儿了／出了什么事）。**`danger` 档必填**。 */
  readonly detail?: string;
  /** 至多一枚动作键（动词）；不给＝这条提示只有「关闭」一条出口。 */
  readonly action?: ToastCardAction;
  /** 关闭键的可读名字（缺省 `TOAST_CARD_CLOSE_LABEL`）。 */
  readonly closeLabel?: string;
  /** 自动消失的时长（毫秒）：只许 `TOAST_CARD_MIN_MS`～`TOAST_CARD_MAX_MS`。 */
  readonly durationMs?: number;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}

/** 堆栈的入参（`renderToastCardStack()`）。 */
export interface ToastCardStackInput {
  /** 同一时刻最多堆几条：1～`TOAST_CARD_MAX_STACK`（缺省 3）。 */
  readonly max?: number;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
