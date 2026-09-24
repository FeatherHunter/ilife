/** task-list · **标记契约**（渲染与运行时共用的唯一事实：类名／`data-*`／事件名／形态闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-06-状态与台账.mjs`，2026-09 用户裁定）
 *  里的**形态 A「纯勾选 ＋ 组内进度」**——一条一行、整行是勾选命中区（触区＝行高 ≥44），
 *  组头给「这一组勾了几样」，表头给整单进度。买菜清单／盘点／待办都用它。
 *
 *  **它是交互件**：勾选走真运行时（`runtime.ts` 产出 JS 文本）。标记与运行时只通过本文件的名字耦合：
 *  行的机器键 `data-ilife-task`、勾选态的**唯一事实** `data-ilife-task-done`、计数锚 `data-ilife-task-counts`。
 */
export const TASK_LIST_CLASS = 'ilife-block-task-list';

/** 一行、以及行内命中区的类名（运行时也要认它们 ⇒ 与 `render.ts` 共用这一份）。 */
export const TASK_ROW_CLASS = TASK_LIST_CLASS + '-row';
export const TASK_HIT_CLASS = TASK_LIST_CLASS + '-hit';
export const TASK_LABEL_CLASS = TASK_LIST_CLASS + '-label';
export const TASK_CHECK_CLASS = TASK_LIST_CLASS + '-check';

/** 槽位闭集（渲染与判据都用这里的名字拼类名，不各抄一份字面量）。
 *  数组里带注释 ⇒ 它不会被 `gen-components.mjs` 当成"形态闭集"。 */
export const TASK_LIST_SLOTS = [
  /* 表头：标题 ＋ 整单进度 ＋ 进度条。 */
  'head',
  'title',
  'progress',
  'bar',
  'bar-fill',
  /* 清单本体：分组与行。 */
  'body',
  'group',
  'group-title',
  'group-name',
  'group-count',
  'label',
  'note',
  'amount',
  'err',
  'absent',
  'foot',
] as const;
export type TaskListSlot = (typeof TASK_LIST_SLOTS)[number];

/** 类名根。 */
export function taskListClass(prefix = 'ilife-'): string {
  return prefix + 'block-task-list';
}

/** 槽类的唯一拼法。 */
export function taskListSlot(slot: TaskListSlot, prefix = 'ilife-'): string {
  return taskListClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 A「纯勾选 ＋ 组内进度」。 */
export const TASK_LIST_FORMS = ['checklist'] as const;
export type TaskListForm = (typeof TASK_LIST_FORMS)[number];

/** 行的机器键属性：**运行时的发现锚**（`[data-ilife-task]` 即一行）。 */
export const TASK_KEY_ATTR = 'data-ilife-task';
/** 行的人类可读名（事件 `detail.label` 用它；也省得运行时去抠标记文本）。 */
export const TASK_LABEL_ATTR = 'data-ilife-task-label';
/** 组键（组内进度按它归组；不给＝无组那一档）。 */
export const TASK_GROUP_ATTR = 'data-ilife-task-group';
/** **勾选态的唯一事实**（`1`＝已勾，缺＝未勾）：页面读它、运行时写它、标记也照它渲染。 */
export const TASK_DONE_ATTR = 'data-ilife-task-done';
/** 计数锚（计数文本的唯一写入口：`5 / 11`；组头与表头各一枚）。 */
export const TASK_COUNTS_ATTR = 'data-ilife-task-counts';
/** 组头指向哪个组键（运行时按它对上号）。 */
export const TASK_OF_ATTR = 'data-ilife-task-of';
/** 进度条填充（运行时只动它的 `transform: scaleX()`）。 */
export const TASK_BAR_ATTR = 'data-ilife-task-bar';
/** 根上的清单键（一页可挂多张清单；事件里原样带回）。 */
export const TASK_LIST_ATTR = 'data-ilife-task-list';
/** 忙态（整单正在写：`1`＝勾选不落账、不派发，复选框回弹到 `data-ilife-task-done` 记着的那个态）。 */
export const TASK_BUSY_ATTR = 'data-ilife-task-busy';
/** 绑定完成标记（运行时幂等：重复注入只绑一次）。 */
export const TASK_BOUND_ATTR = 'data-ilife-task-bound';
/** 已勾行的修饰类（渲染与运行时共用；样式段也认它）。 */
export const TASK_ROW_DONE_CLASS = 'is-done';
/** 计数文本的格式（唯一写入口用；改这里运行时跟着改）。 */
export const TASK_COUNTS_SEPARATOR = ' / ';

/** 勾选事件（冒泡 `CustomEvent`，`detail = { list, key, label, group, done, doneCount, totalCount }`）。
 *  页面用 `root.addEventListener(TASK_EVENT_TOGGLE, …)` 接自己的存盘逻辑——**不引入任何全局**。 */
export const TASK_EVENT_TOGGLE = 'ilife:task-toggle';

/** 清单键缺省值（不挂清单键的页也有一条稳定的键）。 */
export const TASK_LIST_DEFAULT_KEY = 'tasks';

/** 一行。 */
export interface TaskListRow {
  /** 机器键（同页唯一；运行时按它派发与回写）。必填非空。 */
  readonly key: string;
  /** 这一条是什么（`螺丝椒 250g`）。必填非空。 */
  readonly label: string;
  /** 组名（`已买`／`待买`）。不给的行归到"无组"那一档（排在它首次出现的位置）。 */
  readonly group?: string;
  /** 行下小字（`家里还有 5g，只买 10g`）。 */
  readonly note?: string;
  /** 右侧读数（`¥6.5`）：等宽数字、**永不截断**。 */
  readonly amount?: string;
  /** 初始勾选态（缺省未勾）。**它只是起点**：勾选后的事实住 `data-ilife-task-done`。 */
  readonly done?: boolean;
  /** 锁定这一行（不许勾，如"已下架"）：**必须同时给 `note` 说明为什么**（含糊地禁用是不许留的中间档）。 */
  readonly disabled?: boolean;
  /** 这一行没存上的错（`没存上：网络错误`）：写在复选框旁边 ＋ `aria-describedby` 指过去。 */
  readonly error?: string;
}

export interface TaskListInput {
  /** 清单键（同一页多张清单时用来分辨；缺省 `TASK_LIST_DEFAULT_KEY`）。 */
  readonly key?: string;
  /** 清单标题（`买菜清单 · 今天 17:20`）。 */
  readonly title?: string;
  /** 整单进度里那个词（`已买`）；与 `progressUnit` 一起读作「已买 5 / 11 样」。 */
  readonly progressLabel?: string;
  /** 整单进度里的量词（`样`）。 */
  readonly progressUnit?: string;
  /** 清单逐行（**平铺**：归组靠每行的 `group`，不套一层 groups）。空数组且无 `absentLine` ⇒ 空串。 */
  readonly rows: readonly TaskListRow[];
  /** 空态那一句（`清单是空的`）——**这是"没什么"，不是一行**，所以住独立槽位、不进 `rows`。 */
  readonly absentLine?: string;
  /** 脚注（`合计 ¥57.4`）：串＝一句；数组＝逐段一枚。 */
  readonly foot?: string | readonly string[];
  /** 忙态：整单正在写（勾选被挡住、复选框回弹、不派发事件；`aria-busy="true"`）。 */
  readonly busy?: boolean;
  /** 形态键（闭集，缺省 `checklist`）。 */
  readonly form?: TaskListForm;
  /** 附加类名（空格分隔；逐个过类名正则）。 */
  readonly extraClass?: string;
}
