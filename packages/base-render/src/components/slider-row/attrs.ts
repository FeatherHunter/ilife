/** slider-row · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-08-表与输入.mjs`，2026-09 用户裁定）里的
 *  **形态 A「滑块＋常用档＋加减」**——一条轨道（拖）、两端各一枚走一档的键、下面一排常用档，
 *  **右侧永远同步一个大数字**。它替掉的是「只能填一个数、不知道这个数在区间里偏哪头」。
 *
 *  形态键写在 `SLIDER_ROW_FORMS`（闭集）：本件只有一格，但键必须存在——
 *  「形态是骨架，不是地址」：日后加第二形态（双色轨道／刻度尺）是在闭集里加一格，不是新开一件。
 */

/** 本件的类名根：全部槽位类名都是 `sliderRowSlot(槽名)` 拼出来的。 */
export const SLIDER_ROW_CLASS = 'ilife-block-slider-row';

/** 形态闭集：本件只落地形态 A「滑块＋常用档＋加减」。 */
export const SLIDER_ROW_FORMS = ['track'] as const;
export type SliderRowForm = (typeof SLIDER_ROW_FORMS)[number];

/** 槽位闭集（标记契约的一部分：`render.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const SLIDER_ROW_SLOTS = [
  /** 第一行：标签（左）＋ 状态字 ＋ **右侧那个大数字**。 */
  'head',
  /** 这一条在调的量的名字（`热量目标`／`本月预算`／`库存下限`）。 */
  'label',
  /** 状态字（`未设置`／`更新中`／`已到下限`／`已到上限`）——**字**这一档的落点。 */
  'state',
  /** 大数字（值 ＋ 单位）：右侧那一枚，拖动／按键／点档都同步它。 */
  'value',
  /** 数字本体（等宽数字，本形态的识别特征之一）。 */
  'number',
  /** 单位（小一号，跟在数字后）。 */
  'unit',
  /** 轨道那一排：− 键 ＋ 轨道 ＋ ＋ 键。 */
  'row',
  /** 减一档的键（触区 ≥44×44）。 */
  'dec',
  /** 轨道容器（底下画底与已填，上面压一枚原生 `range`）。 */
  'track',
  /** 轨道的底色条（未填部分）。 */
  'base',
  /** 已填部分（宽度按比例内联写死，与 `scale-bar` 同一手法）。 */
  'fill',
  /** 原生 `input[type=range]`（键盘可达、读屏器可读；透明轨道 ＋ 自绘拇指）。 */
  'input',
  /** 加一档的键（触区 ≥44×44）。 */
  'inc',
  /** 常用档那一排。 */
  'presets',
  /** 一枚常用档（按钮；当前值命中它时 `aria-pressed="true"`）。 */
  'preset',
  /** 错误说明（写在控件旁边；控件 `aria-describedby` 指向它）。 */
  'error',
  /** 口径行：区间与常用档的口径（`区间 1,200–3,000 卡；常用四档是按目标体重算的`）。 */
  'caliber',
] as const;
export type SliderRowSlot = (typeof SLIDER_ROW_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function sliderRowSlot(slot: SliderRowSlot, prefix = 'ilife-'): string {
  return prefix + 'block-slider-row-' + slot;
}

/** 机器键属性：值＝`SliderRowInput.name`。**运行时的发现锚**。 */
export const SLIDER_ROW_NAME_ATTR = 'data-ilife-slider';
/** 机器值（数字串，不带千分位与单位）。 */
export const SLIDER_ROW_VALUE_ATTR = 'data-ilife-slider-value';
/** 人类可读字段名（`aria-label` 与事件 `detail.label`）。 */
export const SLIDER_ROW_LABEL_ATTR = 'data-ilife-slider-label';
/** 单位（不参与机器值）。 */
export const SLIDER_ROW_UNIT_ATTR = 'data-ilife-slider-unit';
/** 下限／上限／步长（数字串；夹取与吸附读它们）。 */
export const SLIDER_ROW_MIN_ATTR = 'data-ilife-slider-min';
export const SLIDER_ROW_MAX_ATTR = 'data-ilife-slider-max';
export const SLIDER_ROW_STEP_ATTR = 'data-ilife-slider-step';
/** 显示小数位（由 `step` 推出来）。 */
export const SLIDER_ROW_DECIMALS_ATTR = 'data-ilife-slider-decimals';
/** 已填比例（千分之一为单位的整数，如 `333` ＝ 33.3%）：运行时按它同步 `-fill` 的宽度。 */
export const SLIDER_ROW_FILL_ATTR = 'data-ilife-slider-fill';
/** **已落定**的值（最后一次派发过变更事件的那个）：拖动过程只改上面那枚 `-value`，
 *  松手（`change`）才落定 —— `detail.prev` 就是从这里读出来的。 */
export const SLIDER_ROW_COMMIT_ATTR = 'data-ilife-slider-committed';
/** 禁用标记。 */
export const SLIDER_ROW_DISABLED_ATTR = 'data-ilife-slider-disabled';
/** 更新中标记。 */
export const SLIDER_ROW_LOADING_ATTR = 'data-ilife-slider-loading';
/** 动作标记（`dec`｜`inc`｜`preset`）。 */
export const SLIDER_ROW_ACT_ATTR = 'data-ilife-slider-act';
/** 原生 `range` 的锚（运行时段读它的 `value`）。 */
export const SLIDER_ROW_INPUT_ATTR = 'data-ilife-slider-input';
/** 右侧大数字的锚（运行时段写它的数字文本）。 */
export const SLIDER_ROW_OUT_ATTR = 'data-ilife-slider-out';
/** 一枚常用档带的目标值。 */
export const SLIDER_ROW_PRESET_ATTR = 'data-ilife-slider-preset';
/** 命中区标记（**每一枚都 ≥44×44**）。 */
export const SLIDER_ROW_HIT_ATTR = 'data-ilife-slider-hit';
/** 状态字标记（四档词）。 */
export const SLIDER_ROW_STATE_ATTR = 'data-ilife-slider-state';
/** 绑定完成标记（运行时幂等）。 */
export const SLIDER_ROW_BOUND_ATTR = 'data-ilife-slider-bound';

/** 动作闭集。 */
export const SLIDER_ROW_ACTIONS = ['dec', 'inc', 'preset'] as const;
export type SliderRowAction = (typeof SLIDER_ROW_ACTIONS)[number];

/** 变更事件名（冒泡 `CustomEvent`，`detail = { name, label, value, prev, unit }`）。
 *  拖动过程只同步读数；**变更事件在 `input` 落定（`change`）与按档／按键时派发**。 */
export const SLIDER_ROW_EVENT_CHANGE = 'ilife:slider-change';

/** 触控目标（px）：两端键与常用档一律不小于它。 */
export const SLIDER_ROW_TOUCH_PX = 44;
/** 相邻触控目标的最小间距（px）。 */
export const SLIDER_ROW_GAP_PX = 8;
/** 轨道（含拇指）的高度（px）：原生 `range` 的命中盒就是它。 */
export const SLIDER_ROW_TRACK_PX = 44;
/** 轨道线的高度（px）：细线给"这是一条区间"读；拇指是唯一的可拖点。 */
export const SLIDER_ROW_LINE_PX = 8;
/** 拇指直径（px）。 */
export const SLIDER_ROW_THUMB_PX = 26;

/** 缺值的写法（未设置时右侧大数字写 `—`，与「0」区分）。 */
export const SLIDER_ROW_MISSING = '—';

/** 状态字四档。 */
export const SLIDER_ROW_UNSET = '未设置';
export const SLIDER_ROW_LOADING = '更新中';
export const SLIDER_ROW_AT_MIN = '已到下限';
export const SLIDER_ROW_AT_MAX = '已到上限';

/** 一枚常用档：`number`（必须落在 `[min, max]` 的格子上）。 */
export type SliderRowPreset = number;

/** 滑块行入参。`name`／`min`／`max`／`step` 必填（区间是这一件的骨架：没有区间的滑块不成立）。 */
export interface SliderRowInput {
  /** 机器键（变更事件与载荷按它定位）。非空字符串。 */
  readonly name: string;
  /** 当前值。`null` ＝ **未设置**（右侧写 `—`，拖动／按键／点档都会把它定下来）。 */
  readonly value: number | null;
  /** 区间下限（含）。 */
  readonly min: number;
  /** 区间上限（含）。必须 > `min`，且**必须落在步长格子上**。 */
  readonly max: number;
  /** 步长（> 0；小数位 ≤ 6）。 */
  readonly step: number;
  /** 单位（`卡`／`元`／`件`）。 */
  readonly unit?: string;
  /** 名字（`热量目标`），进 `aria-label`、大数字的 `aria-valuetext` 与事件 `detail.label`。 */
  readonly label?: string;
  /** 常用档（点一下直接落到那一档）。每枚必须落在 `[min, max]` 的格子上、不许重复。 */
  readonly presets?: readonly SliderRowPreset[];
  /** 口径行：区间与常用档怎么定的。 */
  readonly caliber?: string;
  /** 错误说明：写在控件旁边，控件 `aria-describedby` 指向它（**不只染色**）。 */
  readonly error?: string;
  /** 禁用；`disabledReason` 写清**为什么**不能拖。 */
  readonly disabled?: boolean;
  /** 禁用原因（禁用时必填）。 */
  readonly disabledReason?: string;
  /** 更新中：状态字换成「更新中」，大数字宽度锁住不跳版。 */
  readonly loading?: boolean;
  /** 形态键（闭集，缺省 `track`）。 */
  readonly form?: SliderRowForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
