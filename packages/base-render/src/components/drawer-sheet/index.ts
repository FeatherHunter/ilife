/** drawer-sheet · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 底部弹层 · 形态 C「多选 ＋ 完成 N 项」——
 *
 *  一句话：从一长串里**勾几个**，勾的过程随时看得见「勾了几个」，最后按一颗键收工——
 *  真 `<dialog>` ＋ `showModal()`，遮罩、焦点锁、`Esc`、顶层都是浏览器给的。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 要「从一组里挑一个／挑几个」（选账户、选餐别、选份量、选分类）→ 用它；
 *   · 要「确认一件破坏性的事」→ 用 `dialog`（对话框）；
 *   · 要「贴着一颗键弹出几条动作」→ 用 `popover-menu`；
 *   · 要「页面里就地挑一个」→ 用 `radio-cards`（单选卡组，不打断页面）。
 *
 *  四件出口 ＋ 一枚触发键：
 *   · `renderDrawerSheet(input)` —— 产面板标记（纯函数，零 DOM）；
 *   · `renderDrawerOpener(input)` —— 产触发键（**焦点归还回路的另一头**）；
 *   · `drawerSheetCss()` —— 该组件样式段（页面按需注入；不进 12 区闭集）；
 *   · `buildDrawerSheetJs()` —— 运行时（产出 JS 文本；DOM 只出现在文本里）。
 *
 *  页面怎么接自己的逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:drawer-done', (e) => {
 *    const { id, values } = e.detail;   // 面板已关、焦点已归还
 *    if (id === 'dw-account') setAccount(values[0]);
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  DRAWER_ATTR, DRAWER_BOUND_ATTR, DRAWER_CLASS, DRAWER_CLOSE_ATTR, DRAWER_CLOSE_REASONS,
  DRAWER_COUNT_ATTR, DRAWER_COUNT_LEAD, DRAWER_COUNT_UNIT, DRAWER_DONE_ATTR, DRAWER_DONE_TEMPLATE,
  DRAWER_EDGE_PX, DRAWER_EDGES, DRAWER_EVENT_CHANGE, DRAWER_EVENT_CLOSE, DRAWER_EVENT_DONE,
  DRAWER_FORMS, DRAWER_GAP_PX, DRAWER_MAX_WIDTH_PX, DRAWER_MIN_HEIGHT_PX, DRAWER_MISSING,
  DRAWER_NOTE_ATTR, DRAWER_OPEN_ATTR, DRAWER_OPT_ATTR, DRAWER_OPTION_MIN_HEIGHT_PX, DRAWER_SIDE_WIDTH_PX,
  DRAWER_SLOTS, DRAWER_TEMPLATE_ATTR, DRAWER_ZERO_ATTR, DRAWER_ZERO_NOTE,
  drawerClass, drawerOpenerClass, drawerSlot,
} from './attrs.js';
export type {
  DrawerCloseReason, DrawerEdge, DrawerForm, DrawerOption, DrawerSheetInput, DrawerSlot,
} from './attrs.js';
export { renderDrawerOpener, renderDrawerSheet } from './render.js';
export { drawerSheetCss } from './style.js';
export type { DrawerSheetCssInput } from './style.js';
export { buildDrawerSheetJs } from './runtime.js';
