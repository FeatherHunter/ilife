/** switch-row · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件／闭集／入参类型）。
 *
 *  —— 这一件是**重做件**（`.scratch/ui-组件墙/重做设计口径.md` 第 1 节）——
 *
 *  原型墙里它的三个形态在中性皮肤下 4 分、在纸面与报刊下都是 2 分，**是唯一一处跨形态系统性缺陷**：
 *  病根只有一条——**开与关只靠一个颜色**。皮肤把强调色换成墨黑（大字报刊）或暖红（小票纸）以后，
 *  「已开／已关」就读不出来了。
 *
 *  重做后这一行同时给三样，缺一样都不算成立（**判据逐样断**）：
 *   1. **形**：轨道**实心／空心**两态 ＋ 滑块**离左右边的距离**本身就分得开（离左边近＝关，离右边近＝开）；
 *   2. **字**：开关旁**固定一枚状态字**（`已开`／`已关`／`更新中`），说明句写清**打开会怎样**（`note` 必填），
 *      禁用态写清**为什么不能开**（`disabledReason` 必填）；
 *   3. **色**：`ok` 只是第三样信号；零阴影下开关的边界靠**一圈发丝线**（`line`）立，不靠投影。
 *
 *  形态键写在 `SWITCH_ROW_FORMS`（闭集）：本件只有一格，但键必须存在——「形态是骨架，不是地址」。
 */

/** 本件的类名根。 */
export const SWITCH_ROW_CLASS = 'ilife-block-switch-row';

/** 形态闭集：本件只落地形态「设置页的一行」（标签 ＋ 说明 ＋ 开关）。 */
export const SWITCH_ROW_FORMS = ['row'] as const;
export type SwitchRowForm = (typeof SWITCH_ROW_FORMS)[number];

/** 槽位闭集。 */
export const SWITCH_ROW_SLOTS = [
  /** 整行（一枚 `<label>`：点哪儿都能翻）。 */
  'row',
  /** 文字那一段（名字 ＋ 说明）。 */
  'text',
  /** 名字（`记完自动同步飞书`）。 */
  'label',
  /** 说明句：**打开（关掉）会怎样**（重做口径要求必填）。 */
  'note',
  /** 状态字（`已开`／`已关`／`更新中`）：**字**这一档，固定一枚，永远在。 */
  'state',
  /** 开关本体（命中盒，≥44×44）。 */
  'sw',
  /** 原生 `checkbox`（真语义、真键盘：`空格` 翻）；视觉由轨道与滑块承担。 */
  'input',
  /** 轨道（**关＝空心**：透明底 ＋ 一圈发丝线；**开＝实心**：填充 ＋ 同色边）。 */
  'track',
  /** 滑块（**离左右边的距离**本身读出开合，不靠颜色）。 */
  'thumb',
  /** 错误说明（写在控件旁边；输入 `aria-describedby` 指向它）。 */
  'error',
  /** 口径行（可选：这一行影响什么）。 */
  'caliber',
] as const;
export type SwitchRowSlot = (typeof SWITCH_ROW_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function switchRowSlot(slot: SwitchRowSlot, prefix = 'ilife-'): string {
  return prefix + 'block-switch-row-' + slot;
}

/** 机器键属性：值＝`SwitchRowInput.name`。**运行时的发现锚**。 */
export const SWITCH_ROW_NAME_ATTR = 'data-ilife-switch';
/** 开合态的机器读数（`1`／`0`）——**运行时段与判据都读它**，不从文本反推。 */
export const SWITCH_ROW_CHECKED_ATTR = 'data-ilife-switch-checked';
/** 名字（进 `aria-label` 与事件 `detail.label`）。 */
export const SWITCH_ROW_LABEL_ATTR = 'data-ilife-switch-label';
/** 禁用／更新中标记。 */
export const SWITCH_ROW_DISABLED_ATTR = 'data-ilife-switch-disabled';
export const SWITCH_ROW_LOADING_ATTR = 'data-ilife-switch-loading';
/** 原生 `checkbox` 的锚（运行时段按它收 `change`）。 */
export const SWITCH_ROW_INPUT_ATTR = 'data-ilife-switch-input';
/** 轨道与滑块的锚（判据按它量「离左右边的距离」）。 */
export const SWITCH_ROW_TRACK_ATTR = 'data-ilife-switch-track';
export const SWITCH_ROW_THUMB_ATTR = 'data-ilife-switch-thumb';
/** 状态字的锚（运行时段重写它）。 */
export const SWITCH_ROW_STATE_ATTR = 'data-ilife-switch-state';
/** 说明句的锚（输入的 `aria-describedby` 指向它：**打开会怎样**要读得出来）。 */
export const SWITCH_ROW_NOTE_ATTR = 'data-ilife-switch-note';
/** 命中区标记（开关本体 ≥44×44）。 */
export const SWITCH_ROW_HIT_ATTR = 'data-ilife-switch-hit';
/** 绑定完成标记（运行时幂等）。 */
export const SWITCH_ROW_BOUND_ATTR = 'data-ilife-switch-bound';

/** 变更事件名（冒泡 `CustomEvent`，`detail = { name, label, checked, prev }`）。 */
export const SWITCH_ROW_EVENT_CHANGE = 'ilife:switch-change';

/** 触控目标（px）：开关本体的命中盒不小于它（整行也是命中区，比它还大）。 */
export const SWITCH_ROW_TOUCH_PX = 44;
/** 轨道尺寸（px）：宽 × 高（视觉盒可以比命中盒小，命中盒由 `.sw` 承担）。 */
export const SWITCH_ROW_TRACK_W_PX = 56;
export const SWITCH_ROW_TRACK_H_PX = 32;
/** 滑块直径（px）与离轨道边的距离（px）——**这两条就是"离左右边多远"的形状事实**。 */
export const SWITCH_ROW_THUMB_PX = 24;
export const SWITCH_ROW_THUMB_INSET_PX = 3;
/** 滑块从"贴左"滑到"贴右"的距离（px）：轨道内宽（56 − 2×1 边框）− 滑块 24 − 两侧内距 2×3 ＝ 24。
 *  这个数就是"开"与"关"在**形状**上的全部差别：不靠颜色也读得出来（判据量它）。 */
export const SWITCH_ROW_THUMB_TRAVEL_PX =
  SWITCH_ROW_TRACK_W_PX - 2 - SWITCH_ROW_THUMB_PX - 2 * SWITCH_ROW_THUMB_INSET_PX;

/** 状态字（**字**这一档：不依赖任何颜色）。 */
export const SWITCH_ROW_ON = '已开';
export const SWITCH_ROW_OFF = '已关';
export const SWITCH_ROW_LOADING = '更新中';

/** 开关行入参。`name`／`checked`／`label`／`note` 必填——
 *  **没有"打开会怎样"这句说明的开关不许上屏**（那正是原型墙这一件丢分的地方）。 */
export interface SwitchRowInput {
  /** 机器键（变更事件与载荷按它定位）。非空字符串。 */
  readonly name: string;
  /** 开还是关。**缺席＝错**：开关没有"未设置"这一档（说不出开还是关＝读者只能猜）。 */
  readonly checked: boolean;
  /** 这一行的名字（`记完自动同步飞书`）。 */
  readonly label: string;
  /** 说明句：**打开（关掉）会怎样**。必填（后果写不清的开关＝读者只能试）。 */
  readonly note: string;
  /** 口径行（可选：这一行影响什么、什么时候生效）。 */
  readonly caliber?: string;
  /** 错误说明：写在控件旁边，输入 `aria-describedby` 指向它（**不只染色**）。 */
  readonly error?: string;
  /** 禁用；**`disabledReason` 写清为什么不能开**（如「还没定训练计划，先定计划才能开」）。 */
  readonly disabled?: boolean;
  /** 禁用原因（禁用时必填）。 */
  readonly disabledReason?: string;
  /** 更新中：状态字换成「更新中」，期间不接翻动。 */
  readonly loading?: boolean;
  /** 形态键（闭集，缺省 `row`）。 */
  readonly form?: SwitchRowForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
