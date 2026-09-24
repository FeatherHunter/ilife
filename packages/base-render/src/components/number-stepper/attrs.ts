/** number-stepper · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-08-表与输入.mjs`，2026-09 用户裁定）里的
 *  **形态 A「标准：加减＋常用值排」**——「− n ＋」三个可点区并排，下面一排常用值省点击。
 *  它替掉的两种错法：
 *   · 只能敲键盘填数量（手指在手机上够不到"精确到 0.5"）；
 *   · 加减按钮小到点不中（本形态把两边各 **≥44px** 的触区写进闭集，是硬口径不是建议）。
 *
 *  形态键写在 `NUMBER_STEPPER_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」：日后加第二形态是在闭集里加一格，不是新开一件。
 *  闭集外的值一律 `badInput`（不静默降级：降级会让调用方以为自己拿到了另一种骨架）。
 */

/** 本件的类名根：全部槽位类名都是 `numberStepperSlot(槽名)` 拼出来的。 */
export const NUMBER_STEPPER_CLASS = 'ilife-block-number-stepper';

/** 形态闭集：本件只落地形态 A「标准：加减＋常用值排」。 */
export const NUMBER_STEPPER_FORMS = ['standard'] as const;
export type NumberStepperForm = (typeof NUMBER_STEPPER_FORMS)[number];

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const NUMBER_STEPPER_SLOTS = [
  /** 第一行：标签（左）＋ 可选的右上状态字位。 */
  'head',
  /** 数量的名字（`份数`／`份量`／`数量`）。 */
  'label',
  /** 右上状态字（`已到下限`／`未设置`／`更新中`）——**字**这一档的落点，不只靠颜色。 */
  'state',
  /** 「− n ＋」三个可点区并排的那一排（本形态的识别特征）。 */
  'controls',
  /** 减号键（触区 ≥44×44）。 */
  'dec',
  /** 值位：一枚按钮——点它直接填一个数（本形态的第三个可点区）。 */
  'value',
  /** 值文本（数字本体，等宽数字）。 */
  'number',
  /** 单位（小一号，跟在值后）。 */
  'unit',
  /** 加号键（触区 ≥44×44）。 */
  'inc',
  /** 行内编辑器（值位点开后在同一格里换上的 `<input type="number">`，由运行时段产出）。 */
  'editor',
  /** 常用值那一排。 */
  'quick',
  /** 「常用」这枚小标签。 */
  'quickLabel',
  /** 一枚常用值（按钮；当前值命中它时 `aria-pressed="true"`）。 */
  'preset',
  /** 错误说明（写在控件旁边；控件 `aria-describedby` 指向它）。 */
  'error',
  /** 口径行：这一件的加减步长与取值范围怎么定的。 */
  'caliber',
] as const;
export type NumberStepperSlot = (typeof NUMBER_STEPPER_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `NUMBER_STEPPER_CLASS + '-' + …`）。 */
export function numberStepperSlot(slot: NumberStepperSlot, prefix = 'ilife-'): string {
  return prefix + 'block-number-stepper-' + slot;
}

/** 机器键属性：值＝`NumberStepperInput.name`。**运行时的发现锚**（`[data-ilife-stepper]`）。 */
export const NUMBER_STEPPER_NAME_ATTR = 'data-ilife-stepper';
/** 机器值（**数字串**：`1.5`／`3`，不带千分位、不带单位；显示字另算）。 */
export const NUMBER_STEPPER_VALUE_ATTR = 'data-ilife-stepper-value';
/** 人类可读字段名（`aria-label` 与事件 `detail.label` 用它）。 */
export const NUMBER_STEPPER_LABEL_ATTR = 'data-ilife-stepper-label';
/** 单位（小号，跟在值后；不参与机器值）。 */
export const NUMBER_STEPPER_UNIT_ATTR = 'data-ilife-stepper-unit';
/** 下限／上限／步长（数字串；运行时的夹取与吸附都读它们）。 */
export const NUMBER_STEPPER_MIN_ATTR = 'data-ilife-stepper-min';
export const NUMBER_STEPPER_MAX_ATTR = 'data-ilife-stepper-max';
export const NUMBER_STEPPER_STEP_ATTR = 'data-ilife-stepper-step';
/** 显示小数位（由 `step` 推出来：`step=0.5` ⇒ 1 位；`step=1` ⇒ 0 位）。 */
export const NUMBER_STEPPER_DECIMALS_ATTR = 'data-ilife-stepper-decimals';
/** 禁用标记（三枚可点区一起落 `disabled` ＋ `aria-disabled`；**不留"看着能点、点了没反应"**）。 */
export const NUMBER_STEPPER_DISABLED_ATTR = 'data-ilife-stepper-disabled';
/** 更新中标记（原地换字，值位宽度锁住不跳版）。 */
export const NUMBER_STEPPER_LOADING_ATTR = 'data-ilife-stepper-loading';
/** 动作标记：这一枚按钮按下去要干什么。 */
export const NUMBER_STEPPER_ACT_ATTR = 'data-ilife-stepper-act';
/** 一枚常用值带的目标值（数字串；点它＝直接落到那一档）。 */
export const NUMBER_STEPPER_QUICK_ATTR = 'data-ilife-stepper-quick';
/** 命中区标记（运行时按它找可点控件；**每一枚都 ≥44×44**）。 */
export const NUMBER_STEPPER_HIT_ATTR = 'data-ilife-stepper-hit';
/** 值位状态字（`已到下限`／`已到上限`／`未设置`／`更新中`；空串＝这一行不出）。 */
export const NUMBER_STEPPER_STATE_ATTR = 'data-ilife-stepper-state';
/** 行内编辑器在场标记（运行时进出编辑用它做幂等；样式按它切显示）。 */
export const NUMBER_STEPPER_EDITING_ATTR = 'data-ilife-stepper-editing';
/** 绑定完成标记（运行时幂等：重复注入不重复绑定）。 */
export const NUMBER_STEPPER_BOUND_ATTR = 'data-ilife-stepper-bound';

/** 动作闭集（闭集外的值一律 `badInput`）。 */
export const NUMBER_STEPPER_ACTIONS = ['dec', 'inc', 'quick', 'edit'] as const;
export type NumberStepperAction = (typeof NUMBER_STEPPER_ACTIONS)[number];

/** 变更事件名（冒泡 `CustomEvent`，`detail = { name, label, value, prev, unit }`）。
 *  页面用 `root.addEventListener(NUMBER_STEPPER_EVENT_CHANGE, …)` 接自己的重算逻辑——**不引入任何全局**。 */
export const NUMBER_STEPPER_EVENT_CHANGE = 'ilife:stepper-change';

/** 触控目标（px）：三枚可点区与常用值一律不小于它（用户裁定：44 是全宽口径，不只窄屏）。 */
export const NUMBER_STEPPER_TOUCH_PX = 44;
/** 相邻触控目标的最小间距（px）：『− n ＋』三个可点区**不做连体**，留缝防误点。 */
export const NUMBER_STEPPER_GAP_PX = 8;
/** 值位的最小宽度（px）：数字位数变了也不让整排跳版（配合等宽数字使用）。 */
export const NUMBER_STEPPER_VALUE_MIN_PX = 88;

/** 缺值的写法：**缺值写成 `—`**（与「0」区分；全仓同一条地板）。 */
export const NUMBER_STEPPER_MISSING = '—';

/** 状态字（字这一档的四个词：**状态不只靠颜色**）。 */
export const NUMBER_STEPPER_AT_MIN = '已到下限';
export const NUMBER_STEPPER_AT_MAX = '已到上限';
export const NUMBER_STEPPER_UNSET = '未设置';
export const NUMBER_STEPPER_LOADING = '更新中';
/** 常用值那一排左端的小标签。 */
export const NUMBER_STEPPER_QUICK_LABEL = '常用';
/** 减号／加号键面（几何上是两个全角符号，读屏器另有 `aria-label`）。 */
export const NUMBER_STEPPER_DEC_GLYPH = '−';
export const NUMBER_STEPPER_INC_GLYPH = '＋';

/** 一枚常用值：`value` 是机器值（必须落在 `[min, max]` 里），显示字按 `step` 的小数位格式化。 */
export type NumberStepperPreset = number;

/** 数量步进入参。`name`／`min`／`max`／`step` 必填——**没有上下限的步进器不成立**
 *  （它会一路加到无穷），所以本件不提供"只有步长"的档。`value: null` ＝ 缺值（写成 `—`）。 */
export interface NumberStepperInput {
  /** 机器键（变更事件与载荷按它定位；同一页内应唯一）。非空字符串。 */
  readonly name: string;
  /** 当前值。`null` ＝ **缺值**（屏上写 `—`，按 ＋ 从下限起算）；缺席＝错。 */
  readonly value: number | null;
  /** 下限（含）。 */
  readonly min: number;
  /** 上限（含）。 */
  readonly max: number;
  /** 每次加减的步长（> 0）。 */
  readonly step: number;
  /** 单位（`份`／`g`／`件`）：小一号跟在值后，不参与任何机器口径。 */
  readonly unit?: string;
  /** 数量的名字（`份数`），进 `aria-label` 与事件 `detail.label`。 */
  readonly label?: string;
  /** 常用值（点一下直接落到那一档）。缺省＝不出这一排；每一项必须落在 `[min, max]` 里。 */
  readonly presets?: readonly NumberStepperPreset[];
  /** 口径行：加减步长与取值范围怎么定的（如「加减每次 0.5 份，范围 0.5–6 份」）。 */
  readonly caliber?: string;
  /** 错误说明：写在控件旁边，控件 `aria-describedby` 指向它（**不只染色**）。 */
  readonly error?: string;
  /** 禁用：三枚可点区一起禁用；`disabledReason` 写清**为什么**不能动。 */
  readonly disabled?: boolean;
  /** 禁用原因（禁用时必填：说不出为什么不能开＝读者只能猜）。 */
  readonly disabledReason?: string;
  /** 更新中：原地换字，值位宽度锁住不跳版。 */
  readonly loading?: boolean;
  /** 形态键（闭集，缺省 `standard`）。 */
  readonly form?: NumberStepperForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
