/** drawer-sheet · **标记契约**（渲染与运行时共用的唯一事实：类名／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-10-容器与浮层.mjs`，2026-09 用户裁定）
 *  里的**形态 C「多选 ＋ 完成 N 项」**——抓手 ＋ 标题 ＋ 副语 ＋ 可滚的候选项清单 ＋
 *  钉子一样的脚条（已选几个 ＋ 完成键）。用在哪：记账（选账户）／卡路里（选餐别、选食物）／
 *  私家大厨（选份量）／备忘录（选分类）。
 *
 *  落地路线（与 `dialog` 同一条）：**真 `<dialog>` ＋ `showModal()`**——多选弹层自己搓焦点锁与 `Esc`
 *  必漏（原型墙那页的注记就写着这句），原生 `<dialog>` 直接给全。`edge` 决定它贴底还是贴右侧，
 *  **是形态参数不是媒体查询**（视口宽 ≠ 组件宽：同一个弹层可能被嵌进侧栏里）。
 */

/** 本件的类名根。 */
export const DRAWER_CLASS = 'ilife-block-drawer-sheet';

/** 类名根（带前缀）。 */
export function drawerClass(prefix = 'ilife-'): string {
  return prefix + 'block-drawer-sheet';
}

/** 触发键的类名（与面板分开）。 */
export function drawerOpenerClass(prefix = 'ilife-'): string {
  return drawerClass(prefix) + '-opener';
}

/** 槽位闭集。 */
export const DRAWER_SLOTS = [
  /** 抓手（纯装饰，`aria-hidden`；只有贴底档出）。 */
  'grab',
  /** 头部那一排（标题块 ＋ 关闭键）。 */
  'head',
  /** 头部文字块。 */
  'headtext',
  /** 标题（面板的 `aria-labelledby` 指它）。 */
  'title',
  /** 副语（如「可多选」）。 */
  'sub',
  /** 关闭键（≥44×44）。 */
  'close',
  /** 候选项清单（滚的是它）。 */
  'body',
  /** 一枚候选项（整行是命中区）。 */
  'opt',
  /** 候选项里的勾选框。 */
  'box',
  /** 候选项的主文字。 */
  'text',
  /** 候选项的次文字（如「7 条里 3 条像餐费」）。 */
  'note',
  /** 候选项右端的读数位（如 `¥86.00`；缺值写成 `—`）。 */
  'meta',
  /** 清单尾部的说明行。 */
  'hint',
  /** 设计过的空态（一项都没有时出，替掉清单）。 */
  'empty',
  /** 脚条（滚不动的那一格）。 */
  'foot',
  /** 脚条左端的计数（串 ＋ `<b>` 里的数）。 */
  'count',
  /** 计数后的说明（可缺）。 */
  'countnote',
  /** 完成键。 */
  'done',
] as const;
export type DrawerSlot = (typeof DRAWER_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function drawerSlot(slot: DrawerSlot, prefix = 'ilife-'): string {
  return drawerClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 C「多选 ＋ 完成 N 项」。 */
export const DRAWER_FORMS = ['multi'] as const;
export type DrawerForm = (typeof DRAWER_FORMS)[number];

/** 贴哪一边（**形态参数**：贴底＝底部弹层；贴右＝侧抽屉。同一份标记，两种骨架）。 */
export const DRAWER_EDGES = ['bottom', 'side'] as const;
export type DrawerEdge = (typeof DRAWER_EDGES)[number];

/** 关闭原因闭集（`ilife:drawer-close` 的 `detail.reason`）。 */
export const DRAWER_CLOSE_REASONS = ['done', 'dismiss', 'esc', 'backdrop', 'programmatic'] as const;
export type DrawerCloseReason = (typeof DRAWER_CLOSE_REASONS)[number];

/* ── `data-*` 名 ─────────────────────────────────────────────────── */

/** 面板的发现锚：值＝面板 `id`。 */
export const DRAWER_ATTR = 'data-ilife-drawer-sheet';
/** 触发键：值＝它开的面板 `id`。 */
export const DRAWER_OPEN_ATTR = 'data-ilife-drawer-open';
/** 候选项：值＝该项的机器值（提交时按它收）。 */
export const DRAWER_OPT_ATTR = 'data-ilife-drawer-opt';
/** 完成键（值＝`1`）。 */
export const DRAWER_DONE_ATTR = 'data-ilife-drawer-done';
/** 关闭键（值＝`1`）。 */
export const DRAWER_CLOSE_ATTR = 'data-ilife-drawer-close';
/** 计数位：`<b>` 上的标记（运行时只改这一个数）。 */
export const DRAWER_COUNT_ATTR = 'data-ilife-drawer-count';
/** 脚条那句话（`summary`）：一个都没勾时它被 `hidden` 收起。 */
export const DRAWER_NOTE_ATTR = 'data-ilife-drawer-note';
/** 「一个都没勾」那句话：勾上以后它被 `hidden` 收起。 */
export const DRAWER_ZERO_ATTR = 'data-ilife-drawer-zero';
/** 完成键上的模板（含 `{n}` 时，运行时就地换数；不含就一个字不动）。 */
export const DRAWER_TEMPLATE_ATTR = 'data-ilife-drawer-template';
/** 绑定完成标记（幂等）。 */
export const DRAWER_BOUND_ATTR = 'data-ilife-drawer-bound';

/** 事件名（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」）。 */
export const DRAWER_EVENT_CHANGE = 'ilife:drawer-change';
export const DRAWER_EVENT_DONE = 'ilife:drawer-done';
export const DRAWER_EVENT_CLOSE = 'ilife:drawer-close';

/** 计数行与完成键的两句现成话（**模板里的 `{n}` 是唯一可变处**）。 */
export const DRAWER_COUNT_LEAD = '已选';
export const DRAWER_COUNT_UNIT = '个';
export const DRAWER_DONE_TEMPLATE = '完成 {n} 项';
/** 一个都没勾时的那句话（替掉完成键的可用档，说明「为什么按不动」）。 */
export const DRAWER_ZERO_NOTE = '一个都没勾';
/** 缺项一律写成它（全仓同一条地板：缺值写成 `—`，不写 0、不留空）。 */
export const DRAWER_MISSING = '—';

/** 几何口径：候选项命中高度／键的命中下限／相邻命中区间距／面板宽上限／离容器边至少留多少。 */
export const DRAWER_OPTION_MIN_HEIGHT_PX = 52;
export const DRAWER_MIN_HEIGHT_PX = 44;
export const DRAWER_GAP_PX = 8;
export const DRAWER_MAX_WIDTH_PX = 520;
export const DRAWER_SIDE_WIDTH_PX = 380;
export const DRAWER_EDGE_PX = 16;

/** 一枚候选项。 */
export interface DrawerOption {
  /** 机器值（提交时按它收）。非空串，面板内唯一。 */
  readonly value: string;
  /** 主文字（如「餐费」）。非空串；**许换行、不许 `…` 截断**。 */
  readonly label: string;
  /** 次文字（如「7 条里 3 条像餐费」）。 */
  readonly note?: string;
  /** 右端读数位（如 `¥86.00`）。`null`＝缺值（写成 `—`，与「0」区分）。 */
  readonly meta?: string | null;
  /** 开面板时就勾上。 */
  readonly checked?: boolean;
  /** 按不动的那一项（给不出理由的空档不许留 ⇒ 必须同时给 `note` 说明为什么）。 */
  readonly disabled?: boolean;
}

/** 底部弹层入参（形态 C）。`id`／`title`／`options` 必填。 */
export interface DrawerSheetInput {
  /** 面板 `id`（也是触发键 `data-ilife-drawer-open` 的值）。同页唯一；只许标识符字符。 */
  readonly id: string;
  /** 标题（面板的 `aria-labelledby` 指它）。 */
  readonly title: string;
  /** 副语（如「可多选」）。 */
  readonly sub?: string;
  /** 候选项（顺序＝屏上顺序）。 **空数组＝设计过的空态**（出 `emptyLine`）。 */
  readonly options: readonly DrawerOption[];
  /** 一项都没有时那句话（不出空态也行——不给就用组件那句现成话）。 */
  readonly emptyLine?: string;
  /** 清单尾部说明行（如「勾几个都行；一条记录可以同时属于两个分类」）。 */
  readonly hint?: string;
  /** 脚条计数后的说明（如「覆盖 7 条记录」）。 */
  readonly summary?: string;
  /** 完成键的字模板（含 `{n}` 时就地换数）；缺省 `完成 {n} 项`。 */
  readonly doneLabel?: string;
  /** 贴哪一边，缺省 `bottom`（底部弹层）。 */
  readonly edge?: DrawerEdge;
  /** 形态键（闭集，缺省 `multi`）。 */
  readonly form?: DrawerForm;
  /** 渲染时就打开（非模态；静态样张／打印快照用）。 */
  readonly open?: boolean;
  /** 附加类名。 */
  readonly extraClass?: string;
}
