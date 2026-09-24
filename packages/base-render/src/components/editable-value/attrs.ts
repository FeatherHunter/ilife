/** editableValue · **标记契约**（渲染与运行时共用的唯一事实）。
 *
 *  这一份事实的好处：`render.ts` 与 `runtime.ts` 都只认这里的名字——
 *  改一处属性名，两边一起对；写测试时也只用引这里的常量，不抄字面量。
 */

/** 本件的类名根（`ilife-` 前缀 ＋ 自有命名空间）。 */
export const EDIT_VALUE_CLASS = 'ilife-edit-value';

/** 机器键属性：值＝`EditableValueInput.name`。**运行时的发现锚**（`[data-ilife-edit]`）。 */
export const EDIT_NAME_ATTR = 'data-ilife-edit';
/** 输入类型：`text`｜`number`｜`select`｜`date`。 */
export const EDIT_KIND_ATTR = 'data-ilife-edit-kind';
/** 机器值（提交时原样送出的串）。 */
export const EDIT_VALUE_ATTR = 'data-ilife-edit-value';
/** 显示字（缺省＝机器值；显示字可与机器值不同：`男`/`male`、`1,800`/`1800`）。 */
export const EDIT_DISPLAY_ATTR = 'data-ilife-edit-display';
/** 单位（小号，跟在值后；不参与机器值）。 */
export const EDIT_UNIT_ATTR = 'data-ilife-edit-unit';
/** 人类可读字段名（`aria-label` 与提交事件 `detail.label` 用它）。 */
export const EDIT_LABEL_ATTR = 'data-ilife-edit-label';
/** 候选项（JSON：`[{value,label}]`；`kind=select` 必填）。 */
export const EDIT_OPTIONS_ATTR = 'data-ilife-edit-options';
/** 铅笔形态：`always`｜`hover`｜`none`（缺省 `always`）。 */
export const EDIT_AFFORDANCE_ATTR = 'data-ilife-edit-affordance';
/** 命中区标记（运行时按它找可点控件；一个值上恰一枚）。 */
export const EDIT_HIT_ATTR = 'data-ilife-edit-hit';
/** 绑定完成标记（运行时幂等：重复注入不重复绑定）。 */
export const EDIT_BOUND_ATTR = 'data-ilife-edit-bound';
/** 禁用标记（命中区落 `disabled` ＋ `aria-disabled`；运行时不给它开编辑器）。 */
export const EDIT_DISABLED_ATTR = 'data-ilife-edit-disabled';

/** 约束：各自独立属性（不塞 JSON——"没给"与"给了空串"要能分辨）。 */
export const EDIT_REQUIRED_ATTR = 'data-ilife-edit-required';
export const EDIT_PLACEHOLDER_ATTR = 'data-ilife-edit-placeholder';
export const EDIT_MIN_ATTR = 'data-ilife-edit-min';
export const EDIT_MAX_ATTR = 'data-ilife-edit-max';
export const EDIT_STEP_ATTR = 'data-ilife-edit-step';

/** 提交／取消事件名（冒泡 `CustomEvent`，`detail = { name, label?, value, prev, unit? }`）。
 *  页面用 `root.addEventListener(EDIT_EVENT_COMMIT, …)` 接自己的重算逻辑——**不引入任何全局**。 */
export const EDIT_EVENT_COMMIT = 'ilife:edit-commit';
export const EDIT_EVENT_CANCEL = 'ilife:edit-cancel';

/** 输入类型闭集（闭集外的值 → `bad-input`；不静默降级——降级会让调用方以为自己拿到了下拉）。 */
export const EDIT_KINDS = ['text', 'number', 'select', 'date'] as const;
export type EditableValueKind = (typeof EDIT_KINDS)[number];

/** 铅笔形态闭集。 */
export const EDIT_AFFORDANCES = ['always', 'hover', 'none'] as const;
export type EditableValueAffordance = (typeof EDIT_AFFORDANCES)[number];

/** 选择项：字符串项＝机器值与显示字同值；对象项＝机器值走 `value`、显示字走 `label`。 */
export type EditableValueOption = string | { readonly value: string; readonly label: string };

export interface EditableValueInput {
  /** 机器键（提交事件与载荷按它定位；同一页内应唯一）。非空字符串。 */
  readonly name: string;
  /** 机器值（提交时原样送出）。**可为空串——但那时必须同时给 `display`**（显式空态：
   *  档案里"未设置"就是空值，可读性由显示字承担；只给空串不给显示字 → `bad-input`）。 */
  readonly value: string;
  /** 显示字（缺省＝`value`）。可空串（用于"未设置"这类显式空态显示）。 */
  readonly display?: string;
  /** 单位（小号，跟在值后）。 */
  readonly unit?: string;
  /** 人类可读字段名（`aria-label` 与事件 `detail.label`）。 */
  readonly label?: string;
  /** 输入类型，缺省 `text`。 */
  readonly kind?: EditableValueKind;
  /** 候选项（`kind='select'` 必填且非空；其余类型给了即 `bad-input`）。 */
  readonly options?: readonly EditableValueOption[];
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly min?: string | number;
  readonly max?: string | number;
  readonly step?: string | number;
  /** 铅笔形态，缺省 `always`。 */
  readonly affordance?: EditableValueAffordance;
  /** 禁用：命中区落 `disabled` ＋ `aria-disabled`（"看着能点、点了没反应"是不许留的中间档）。 */
  readonly disabled?: boolean;
  /** 值位对齐（数值列常用右对齐）。缺省 `left`。 */
  readonly align?: 'left' | 'right';
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
