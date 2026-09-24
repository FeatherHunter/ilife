/** popover-menu · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 浮出菜单 · 形态 A「贴着按钮」——
 *
 *  一句话：把几条动作**贴着触发它的那颗键**弹出来（分组头、快捷键、当前项打勾、危险项垫最后）——
 *  走原生 `popover`：点外面关、`Esc` 关、顶层都是浏览器给的，**脚本坏了也开得出来**。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 要「贴着一颗键弹出几条动作」（复制格式、更多操作、快捷切换）→ 用它；
 *   · 要「页面里摆一排常态可见的动作」→ 用 `action-bar`；
 *   · 要「确认一件破坏性的事」→ 用 `dialog`；要「从一长串里勾几个」→ 用 `drawer-sheet`。
 *
 *  两件出口：
 *   · `renderPopoverMenu(input)` —— 产触发键 ＋ 面板（纯函数，零 DOM；`popovertarget` 已接好）；
 *   · `popoverMenuCss()` —— 该组件样式段（页面按需注入；不进 12 区闭集）；
 *   · `buildPopoverMenuJs()` —— 运行时（产出 JS 文本；DOM 只出现在文本里）。
 *
 *  页面怎么接自己的逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:menu-select', (e) => {
 *    const { id, value, kind } = e.detail;   // 面板已关、焦点已还给触发键
 *    if (id === 'menu-copy' && value === 'markdown') copyAsMarkdown();
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  MENU_ALIGNS, MENU_ANCHOR_PREFIX, MENU_ANCHOR_QUERY, MENU_AREA_QUERY, MENU_ATTR, MENU_BOUND_ATTR,
  MENU_CARET, MENU_CLASS, MENU_EDGE_PX, MENU_EVENT_SELECT, MENU_EVENT_TOGGLE, MENU_FORMS, MENU_GAP_PX,
  MENU_ITEM_ATTR, MENU_KINDS, MENU_MAX_HEIGHT_PX, MENU_MIN_HEIGHT_PX, MENU_OFFSET_PX, MENU_PANEL_ATTR,
  MENU_SLOTS, MENU_TICK, MENU_TRIGGER_ATTR, MENU_WIDTH_PX, menuClass, menuSlot,
} from './attrs.js';
export type {
  MenuAlign, MenuForm, MenuKind, MenuSlot, PopoverMenuInput, PopoverMenuItem,
} from './attrs.js';
export { renderPopoverMenu } from './render.js';
export { popoverMenuCss } from './style.js';
export type { PopoverMenuCssInput } from './style.js';
export { buildPopoverMenuJs } from './runtime.js';
