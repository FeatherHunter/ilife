/** popover-menu · **标记契约**（渲染与运行时共用的唯一事实：类名／`data-*`／事件名／闭集／入参类型）。
 *
 *  这一件落地的是原型墙（`.scratch/ui-组件墙/parts-10-容器与浮层.mjs`，2026-09 用户裁定）
 *  里的**形态 A「贴着按钮＝复制格式」**——一颗触发键 ＋ 贴着它弹出来的小菜单
 *  （分组头、快捷键、当前项打勾、危险项垫最后）。用在哪：六个技能的复制格式、更多操作、快捷切换。
 *
 *  落地路线（票面钉死）：**`popover` 属性**——
 *   · 开／关／`Esc`／点外面关，浏览器白送（触发键带 `popovertarget`，**一行脚本都没有也开得出来**）；
 *   · 定位：`@supports (anchor-name: --a)` **之内**才用 CSS 锚定定位（`position-area` ＋
 *     `position-try-fallbacks` 贴不下就翻边），**之外**退回普通定位（打开时由运行时按触发键的矩形算边距）；
 *   · 逐实例锚名从 `id` 算：`--ilife-menu-<id>`，由标记写进 `style` 属性（静态 CSS 认不出逐实例名字）。
 */

/** 本件的类名根（挂在包住「触发键 ＋ 面板」的那层容器上）。 */
export const MENU_CLASS = 'ilife-block-popover-menu';

/** 类名根（带前缀）。 */
export function menuClass(prefix = 'ilife-'): string {
  return prefix + 'block-popover-menu';
}

/** 槽位闭集。 */
export const MENU_SLOTS = [
  /** 触发键（贴着它弹菜单的那颗）。 */
  'trigger',
  /** 面板（`popover` ＋ `role=menu`）。 */
  'panel',
  /** 分组头（「文字」「数据」这一行）。 */
  'group',
  /** 发丝线分隔（比分组头弱一档的分法）。 */
  'sep',
  /** 一枚菜单项。 */
  'item',
  /** 项里的主文字格。 */
  'key',
  /** 项里的次文字（如「带标题与表格」）。 */
  'note',
  /** 项右端的快捷键位。 */
  'shortcut',
  /** 项左端的打勾位（`kind=check` 才出）。 */
  'tick',
] as const;
export type MenuSlot = (typeof MENU_SLOTS)[number];

/** 槽类的类名（唯一拼法）。 */
export function menuSlot(slot: MenuSlot, prefix = 'ilife-'): string {
  return menuClass(prefix) + '-' + slot;
}

/** 形态闭集：本件只落地形态 A「贴着按钮」。 */
export const MENU_FORMS = ['hug'] as const;
export type MenuForm = (typeof MENU_FORMS)[number];

/** 贴哪一边（横向）：`end`＝面板右缘贴触发键右缘（贴右，缺省）／`start`＝左缘贴左缘。 */
export const MENU_ALIGNS = ['start', 'end'] as const;
export type MenuAlign = (typeof MENU_ALIGNS)[number];

/** 项的档闭集：`action`（普通）／`check`（当前项打勾）／`danger`（危险项）。 */
export const MENU_KINDS = ['action', 'check', 'danger'] as const;
export type MenuKind = (typeof MENU_KINDS)[number];

/* ── `data-*` 名 ─────────────────────────────────────────────────── */

/** 容器的发现锚：值＝菜单 `id`。 */
export const MENU_ATTR = 'data-ilife-popover-menu';
/** 触发键：值＝菜单 `id`。 */
export const MENU_TRIGGER_ATTR = 'data-ilife-menu-trigger';
/** 面板：值＝菜单 `id`；**降级路的开关**（值＝`end`／`start`，运行时按它算贴哪边）。 */
export const MENU_PANEL_ATTR = 'data-ilife-menu-panel';
/** 一枚菜单项：值＝该项的机器值。 */
export const MENU_ITEM_ATTR = 'data-ilife-menu-item';
/** 绑定完成标记（幂等）。 */
export const MENU_BOUND_ATTR = 'data-ilife-menu-bound';

/** 事件名（冒泡 `CustomEvent`；`detail` 见 README 的「交互契约」）。 */
export const MENU_EVENT_SELECT = 'ilife:menu-select';
/** 面板开／关时派发（`detail.phase`＝`open`／`close`）——页面拿它记账或联动，不拿它开菜单。 */
export const MENU_EVENT_TOGGLE = 'ilife:menu-toggle';

/** 锚定定位的两条能力查询：**CSS 与运行时读同一个串**（两边判据必须说同一件事，否则会各走各的）。 */
export const MENU_ANCHOR_QUERY = 'anchor-name: --a';
export const MENU_AREA_QUERY = 'position-area: bottom';
/** 逐实例锚名的前缀（完整名＝`--ilife-menu-<id>`；触发键与面板**写同一个名字**）。 */
export const MENU_ANCHOR_PREFIX = '--ilife-menu-';

/** 几何口径：触发键与菜单项的命中高度下限／相邻命中区间距／面板宽上限／离容器边至少留多少。 */
export const MENU_MIN_HEIGHT_PX = 44;
export const MENU_GAP_PX = 8;
export const MENU_EDGE_PX = 12;
export const MENU_WIDTH_PX = 262;
export const MENU_MAX_HEIGHT_PX = 320;
/** 面板与触发键之间那道缝（锚定定位下是 `margin`，降级路下是同一个数）。 */
export const MENU_OFFSET_PX = 8;

/** 触发键上那枚「会弹出东西」的记号（纯装饰，`aria-hidden`）。 */
export const MENU_CARET = '▾';
/** 打勾位那枚记号（纯装饰；`aria-checked` 才是语义）。 */
export const MENU_TICK = '✓';

/** 一枚菜单项。 */
export interface PopoverMenuItem {
  /** 机器值（选中时原样送出）。非空串，菜单内唯一。 */
  readonly value: string;
  /** 主文字（如「Markdown」）。非空串；**许换行、不许 `…` 截断**。 */
  readonly label: string;
  /** 次文字（如「带标题与表格」）。 */
  readonly note?: string;
  /** 快捷键位（如 `⌘⇧M`；只是字，不绑键盘——绑定归页面）。 */
  readonly shortcut?: string;
  /** 分组头：与上一项不同时，在它前面出一行分组头。 */
  readonly group?: string;
  /** 这一项之前来一条发丝线（比分组头弱一档的分法）。 */
  readonly sep?: boolean;
  /** 档：`action`（缺省）／`check`（当前项，打勾）／`danger`（危险项，垫最后）。 */
  readonly kind?: MenuKind;
  /** `kind=check` 时的勾选档（缺省 false）。 */
  readonly checked?: boolean;
}

/** 浮出菜单入参（形态 A）。`id`／`trigger`／`items` 必填。 */
export interface PopoverMenuInput {
  /** 菜单 `id`（也是触发键 `popovertarget` 指的那个 id）。同页唯一；只许标识符字符。 */
  readonly id: string;
  /** 触发键上的字（如「复制为」；记号 `▾` 由组件补，不用写进这里）。 */
  readonly trigger: string;
  /** 菜单的无障碍名（不给＝用触发键上的字）。 */
  readonly menuLabel?: string;
  /** 贴哪一边（缺省 `end`＝贴右）。 */
  readonly align?: MenuAlign;
  /** 菜单项（顺序＝屏上顺序；分组头与发丝线都从项上的字段来）。至少一项。 */
  readonly items: readonly PopoverMenuItem[];
  /** 形态键（闭集，缺省 `hug`）。 */
  readonly form?: MenuForm;
  /** 附加类名。 */
  readonly extraClass?: string;
}
