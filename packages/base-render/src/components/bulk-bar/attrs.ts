/** bulk-bar · **标记契约**（渲染与运行时共用的唯一事实：类名／槽位／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs`，2026-09 用户裁定 4 分）
 *  里的 **形态 A「选中后浮出来的操作条（底部）」**：上面一列可勾的条目；选中 ≥1 条时，底下浮出一条
 *  操作条（已选数 ＋ 合计 ＋ 动作按钮 ＋ 一句提示）；点一枚**带预演**的动作，就地展开**确认面**——
 *  「会改哪几条、哪条不适用」在按下去之前先看见。
 *
 *  选型（与既有件的分工，别选错）：
 *   · `multi-checks`（多选清单）管**怎么勾**：全选、分组、合计，底下那排动作按钮**一直在**；
 *   · **本件**管**勾了以后干什么**：条**只在选中 ≥1 条时出现**，选中归零就消失；动作按下去先给一份预演；
 *   · `confirm-strip` 收的是「确定／撤销」两个词（危险动作的二次确认）；本件收的是**要改的那个值** ＋ 预演；
 *   · `action-bar` 是静态底栏（不管有没有选中，一直挂在页脚那儿）。
 *
 *  **形态键写在 `BULK_BAR_FORMS` 闭集里**（今天只有 `A` 一格）：闭集外的值一律 `badInput`——本件只落地
 *  用户认可的那一个形态；日后加第二形态是在闭集里加一格，不是新开一件（「形态是骨架，不是地址」）。
 *
 *  **触屏地板**（触屏优先法条）：条目整行是命中区（≥52px 高）、勾选框命中盒 44×44、
 *  动作按钮与「最近用过」胶囊 ≥44×44、相邻触控目标间距 ≥8px；**没有任何一处把键盘当通路**
 *  （确认与取消都是看得见、点得到的按钮；`:focus-visible` 只留给真实键盘用户）。
 */

/** 本件的类名根：全部槽位类名都是 `BULK_BAR_CLASS + '-' + 槽名`。 */
export const BULK_BAR_CLASS = 'ilife-block-bulk-bar';

/** 槽位闭集（标记契约的一部分：`render.ts`／`style.ts` 与判据都用这里的名字拼类名，不各抄一份字面量）。 */
export const BULK_BAR_SLOTS = [
  /** 宿主（列表 ＋ 底部操作条住这里；操作条在流内，条顶永不盖住条目）。 */
  'host',
  /** 条目那一列（自带纸面与发丝线）。 */
  'list',
  /** 一行（**整行是 `<label>`**＝命中区；选中时挂 `is-on`）。 */
  'row',
  /** 勾选框的命中盒（44×44，视觉盒只有 24×24）。 */
  'check',
  /** 勾选框的视觉盒（纯装饰：真状态在原生 `<input>` 上）。 */
  'box',
  /** 行里那两行字（主字 ＋ 副语）。 */
  'text',
  /** 行主字（如「餐饮 · 午餐」）。 */
  'name',
  /** 行副语（如「09-25 · 现金」）。 */
  'note',
  /** 行右端的读数（金额／条数，已经是给人看的样子）——**永不 `…` 截断**。 */
  'reading',
  /** 这一行为什么勾不动（写出来，不只染色）。 */
  'why',
  /** 空态（设计过的那一种，不是留白）。 */
  'empty',
  /** 底下那条**浮出来的操作条**（选中 0 条 ⇒ 整条 `hidden`：移出可点范围，不只是变透明）。 */
  'bar',
  /** 操作条上那句读数（`3 条已选 · 合计 361.50`）。 */
  'count',
  /** 已选条数（等宽数字；运行时原地改写的就是它）。 */
  'num',
  /** 计数单位那句（`条已选`）。 */
  'unit',
  /** 选中读数的尾段（调用方给的静态读数，如「合计 361.50」；选择一变就换成 `—`）。 */
  'tail',
  /** 动作按钮那一排。 */
  'acts',
  /** 一枚动作按钮。 */
  'act',
  /** 按钮上的字（正常态）。 */
  'label',
  /** 同一枚按钮忙碌态的字——与 `label` **叠在同一个格子里**（宽度锁住：换字不跳版）。 */
  'busy',
  /** 操作条底下那句提示（也是「按钮为什么按不动」的那句说明）。 */
  'hint',
  /** 错态那句字（写在动作按钮旁边，`aria-describedby` 指它）。 */
  'error',
  /** 就地确认面（一枚带预演的动作对应一块；只有展开的那一枚不 `hidden`）。 */
  'confirm',
  /** 确认面的头（标题 ＋ 右端那句话）。 */
  'chead',
  /** 确认面标题（如「批量改分类」）。 */
  'ctitle',
  /** 确认面右端那句（如「已选 3 条 · 改完能整批撤回」）。 */
  'ccap',
  /** 确认面的身子（改成什么 ＋ 最近用过）。 */
  'cbody',
  /** 「改成」那一格（标签 ＋ 输入框并成一块命中区）。 */
  'value',
  /** 「改成」那枚标签。 */
  'vlabel',
  /** 新值的输入框。 */
  'input',
  /** 「最近用过」那一排。 */
  'recent',
  /** 「最近用过」那枚标签。 */
  'rlabel',
  /** 一枚「最近用过」的胶囊（点它＝把它的字填进输入框）。 */
  'chip',
  /** 逐条预演那一列。 */
  'preview',
  /** 预演里的一行（`会改` 或 `is-skip`）。 */
  'prow',
  /** 预演行左端那枚记号（`✓` 会改／`⊘` 跳过——形，不靠颜色）。 */
  'mark',
  /** 旧值（带删除线）。 */
  'old',
  /** 旧值到新值之间的那支箭头。 */
  'arrow',
  /** 新值。 */
  'next',
  /** 这一条的说明（如「午餐 32.00（09-25）」，跳过的写清为什么）。 */
  'pnote',
  /** 行右端那两个字（`会改`／`跳过`——字，不靠颜色）。 */
  'pstate',
  /** 确认面的脚（结论句 ＋ 取消 ＋ 改这 N 条）。 */
  'cfoot',
  /** 脚上那句结论（`会改 2 条 · 跳过 1 条`）。 */
  'sum',
  /** 取消（收起确认面，**看得见、点得到的按钮**）。 */
  'cancel',
  /** 改这 N 条（派发事件；本件不写库）。 */
  'submit',
] as const;
export type BulkBarSlot = (typeof BULK_BAR_SLOTS)[number];

/** 槽类的类名（唯一拼法：别处不许再写 `BULK_BAR_CLASS + '-' + …`）。 */
export function bulkBarSlot(slot: BulkBarSlot, prefix = 'ilife-'): string {
  return prefix + 'block-bulk-bar-' + slot;
}

/** 形态闭集：本件只落地形态 A「选中后浮出来的操作条（底部）」。 */
export const BULK_BAR_FORMS = ['A'] as const;
export type BulkBarForm = (typeof BULK_BAR_FORMS)[number];

/** 动作的色档闭集（`plain` 素／`danger` 不可逆／`primary` 主动作，一排里至多一枚）。
 *  `primary` 是「有文字的选中面」那一档：**软底 ＋ 强调字 ＋ 强调描边**，不是强调实底
 *  （强调实底上只许放图形与勾——见 `docs/base/base-render/选中态与皮肤语言.md` 第三节）。 */
export const BULK_BAR_TONES = [
  /** 素档：白底 ＋ 发丝线（缺省）。 */
  'plain',
  /** 不可逆那一档（删除）：危险色字 ＋ 危险色描边，**不出实底**。 */
  'danger',
  /** 主动作那一档（改这 N 条）：强调软底 ＋ 强调字 ＋ 强调描边。 */
  'primary',
] as const;
export type BulkBarTone = (typeof BULK_BAR_TONES)[number];

/** 机器键：值＝`BulkBarInput.name`（运行时的发现锚 `[data-ilife-bulk-name]`）。 */
export const BULK_BAR_NAME_ATTR = 'data-ilife-bulk-name';
/** 形态键（闭集内的值，照实写进标记：页面自查与判据都用它）。 */
export const BULK_BAR_FORM_ATTR = 'data-ilife-bulk-form';
/** 一行的机器键（原生 `<input value>` 也写同一份）。 */
export const BULK_BAR_ITEM_ATTR = 'data-ilife-bulk-item';
/** **一开始就选中的那一行**的标记：选择一变，操作条上那句静态读数就过期了（换成 `—`），
 *  靠它把「用户动过没有」判出来（勾回原样 ⇒ 读数复原）。 */
export const BULK_BAR_ON_ATTR = 'data-ilife-bulk-on';
/** 动作键（运行时的发现锚；值＝`BulkBarAction.key`）。 */
export const BULK_BAR_ACTION_ATTR = 'data-ilife-bulk-action';
/** 色档（闭集内的值，照实写进标记）。 */
export const BULK_BAR_TONE_ATTR = 'data-ilife-bulk-tone';
/** 忙碌标记（`1`＝这一枚动作正在跑：字原地换掉、宽度锁住、按钮按不动）。 */
export const BULK_BAR_BUSY_ATTR = 'data-ilife-bulk-busy';
/** 取消（收起确认面）。 */
export const BULK_BAR_CANCEL_ATTR = 'data-ilife-bulk-cancel';
/** 提交（派发事件；真正写库归页面／技能命令）。 */
export const BULK_BAR_SUBMIT_ATTR = 'data-ilife-bulk-submit';
/** 「最近用过」那一枚胶囊（值＝它的字）。 */
export const BULK_BAR_RECENT_ATTR = 'data-ilife-bulk-recent';
/** 绑定完成标记（运行时幂等：重复注入不重复绑定）。 */
export const BULK_BAR_BOUND_ATTR = 'data-ilife-bulk-bound';
/** 运行时装在文档根上的幂等键。 */
export const BULK_BAR_RUNTIME_ATTR = 'data-ilife-bulk-runtime';

/** 勾选变化事件（冒泡 `CustomEvent`，`detail = { name, keys, count }`）。 */
export const BULK_BAR_EVENT_CHANGE = 'ilife:bulk-change';
/** 动作事件（冒泡 `CustomEvent`，`detail = { name, action, keys, value }`；不写库，只报「谁要改什么」）。 */
export const BULK_BAR_EVENT_ACTION = 'ilife:bulk-action';

/** 缺值的写法：**缺值写成 `—`，不许写 0、不许留空**（全仓同一条地板）。 */
export const BULK_BAR_MISSING = '—';
/** 计数单位（缺省 `条`）。 */
export const BULK_BAR_COUNT_UNIT = '条';
/** 计数单位后面那句（`条已选`）。 */
export const BULK_BAR_COUNT_SUFFIX = '已选';
/** 空态的缺省写法（设计过的空态，不是留白）。 */
export const BULK_BAR_EMPTY_TEXT = '没有可挑的条目';
/** 「改成」那枚标签的缺省字。 */
export const BULK_BAR_VALUE_LABEL = '改成';
/** 确认面脚上那两枚按钮的缺省字。 */
export const BULK_BAR_CANCEL_LABEL = '取消';
/** 一条都改不了时（预演里每一条都跳过），主按钮的字。 */
export const BULK_BAR_NOTHING_TEXT = '一条都改不了';
/** 预演行右端那两个字（**字**是状态的一重：不靠颜色）。 */
export const BULK_BAR_KEEP_TEXT = '会改';
export const BULK_BAR_SKIP_TEXT = '跳过';
/** 预演行左端那两枚记号（**形**是状态的另一重：`✓` 会改／`⊘` 跳过）。 */
export const BULK_BAR_KEEP_MARK = '✓';
export const BULK_BAR_SKIP_MARK = '⊘';

/** 一行。`key`／`title` 必填：`key` 是机器键（同清单唯一），`title` 是屏上主字。 */
export interface BulkBarItem {
  /** 机器键（原生 `<input value>` 与事件 `detail.keys`）。**非空、清单内唯一**。 */
  readonly key: string;
  /** 行主字（如「餐饮 · 午餐」）。**非空**。 */
  readonly title: string;
  /** 行副语（小字，如「09-25 · 现金」）。 */
  readonly note?: string;
  /** 行右端读数（金额／条数，**已经是给人看的样子**：取整与千分位归调用方）。**永不 `…` 截断**。 */
  readonly reading?: string;
  /** 一开始就选中（缺省不选）。 */
  readonly selected?: boolean;
  /** 勾不动：`<input disabled>` ＋ `cursor: not-allowed`（"看着能勾、勾了不算"是不许留的中间档）。 */
  readonly disabled?: boolean;
  /** 勾不动的原因（**写出来**，不只染色；只在 `disabled: true` 时给）。 */
  readonly disabledReason?: string;
}

/** 预演里的一行：这条**会改**还是**跳过**，改前是什么、改后是什么。 */
export interface BulkBarPreviewRow {
  /** `true`＝这一条会改；`false`＝跳过（右端写「跳过」，左端一枚 `⊘`）。 */
  readonly keep: boolean;
  /** 改后的值（如「外卖」）。**非空**。 */
  readonly to: string;
  /** 改前的值（跳过的那条可以不给——它本来就不改）。给了就带删除线。 */
  readonly from?: string;
  /** 这一条的说明（如「午餐 32.00（09-25）」；跳过的这条**必须写清为什么**）。 */
  readonly note?: string;
}

/** 一枚动作的预演：**改之前能看见会改哪几条**（B 档的「抽屉式批量编辑」不落，这一层信息留在 A 档的条里）。 */
export interface BulkBarPreview {
  /** 确认面的标题（如「批量改分类」）。**非空**。 */
  readonly title: string;
  /** 标题右端那句（如「已选 3 条 · 改完能整批撤回」）。 */
  readonly cap?: string;
  /** 「改成」那枚标签的字（缺省 `改成`）。 */
  readonly valueLabel?: string;
  /** 输入框里的现值（要改成的那个值）。 */
  readonly value?: string;
  /** 「最近用过」那几枚（点了填进输入框；**至多 6 枚**）。 */
  readonly recent?: readonly string[];
  /** 逐条预演（**至少一条**；顺序＝调用方给的顺序）。 */
  readonly rows: readonly BulkBarPreviewRow[];
  /** 脚上那句结论（不给就按预演算：`会改 2 条 · 跳过 1 条`）。 */
  readonly summary?: string;
  /** 主按钮的字（缺省按会改的条数算：`改这 2 条`）。 */
  readonly submitLabel?: string;
  /** 取消那枚的字（缺省 `取消`）。 */
  readonly cancelLabel?: string;
}

/** 操作条上的一枚动作。 */
export interface BulkBarAction {
  /** 动作键（事件 `detail.action`）。**非空、一排内唯一**。 */
  readonly key: string;
  /** 按钮上的字（**写动词**：「改分类」「删除」，别写「确定」）。**非空**。 */
  readonly label: string;
  /** 色档（闭集，缺省 `plain`）。 */
  readonly tone?: BulkBarTone;
  /** 这枚动作的预演：给了 ⇒ 按下去**先就地展开确认面**（不直接动手）；不给 ⇒ 按下去直接派发事件。 */
  readonly preview?: BulkBarPreview;
  /** 按不动（原因由操作条底下那句 `hint` 承担：按不动时它就是「为什么按不动」）。 */
  readonly disabled?: boolean;
  /** 正在跑：字**原地换掉**（`正在` ＋ 按钮字）、宽度锁住不跳版、按钮按不动。 */
  readonly busy?: boolean;
  /** 这一枚动作的错态那句字（**写在按钮旁边** ＋ `aria-describedby` 指它）。 */
  readonly error?: string;
}

/** 批量操作条入参。`name`／`items`／`actions` 必填——没有动作的操作条没有存在的理由。 */
export interface BulkBarInput {
  /** 机器键（事件 `detail.name`；确认面与错态的行内 `id` 拿它拼）。**非空、同页唯一**。 */
  readonly name: string;
  /** 条目。**给空数组 ＝ 出设计过的空态**（不是空白）；操作条那时也不出（选中 0 条）。 */
  readonly items: readonly BulkBarItem[];
  /** 操作条上的动作。**至少要有一项**。 */
  readonly actions: readonly BulkBarAction[];
  /** 计数单位（缺省 `条`；屏上写「3 条已选」）。 */
  readonly countUnit?: string;
  /** 选中读数的尾段（调用方给的静态读数，如「合计 361.50」）。
   *  选择一变它就过期 ⇒ 运行时会把它换成 `—`（**不许把过期的数留在屏上**），并派发 `ilife:bulk-change`
   *  请调用方按新选择重渲染。为什么本件不自己算金额：算钱的口径只有一处（住 `multi-checks` 那边）。 */
  readonly tail?: string;
  /** 操作条底下那句提示（如「共 5 条 · 删除会先出二次确认条」）。 */
  readonly hint?: string;
  /** 空态那句字（缺省 `没有可挑的条目`）。 */
  readonly emptyText?: string;
  /** 渲染时就展开哪一枚动作的确认面（**必须命中一枚带预演的动作**；不给＝都收起）。 */
  readonly openAction?: string;
  /** 形态键（闭集，缺省 `A`）。 */
  readonly form?: BulkBarForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
