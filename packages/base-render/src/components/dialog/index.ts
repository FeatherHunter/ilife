/** dialog · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 对话框 · 形态 A「确认型」——
 *
 *  一句话：把「这一步要不要做」摆到页面正中间，**拿浏览器的真模态顶事**——
 *  焦点锁在里面、`Esc` 关掉、背景点不动、关掉把焦点还给按它的那颗按钮。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 要「一件破坏性的事，做完不好撤，得先问一句」→ 用它（覆盖确认、删记录、写库确认）；
 *   · 要「用户从头填一张表」→ 用 `renderParamForm`（表单优先）；
 *   · 要「从一组里挑一个／挑几个，不打断页面」→ 用 `drawer-sheet`（底部弹层）；
 *   · 要「贴着一颗键弹出几条动作」→ 用 `popover-menu`。
 *
 *  三件出口 ＋ 一枚触发键：
 *   · `renderDialog(input)` —— 产面板标记（纯函数，零 DOM）；
 *   · `renderDialogOpener(input)` —— 产触发键（**焦点归还回路的另一头**，同一份契约给两端）；
 *   · `dialogCss()` —— 该组件样式段（页面按需注入；不进 12 区闭集）；
 *   · `buildDialogJs()` —— 运行时（产出 JS 文本；DOM 只出现在文本里）。
 *
 *  页面怎么接自己的逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:dialog-close', (e) => {
 *    const { id, reason, value } = e.detail;    // 面板已关、焦点已归还
 *    if (id === 'dlg-overwrite' && value === 'cover') writeInstead();
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  DIALOG_ACT_ATTR, DIALOG_ATTR, DIALOG_BOUND_ATTR, DIALOG_CLASS, DIALOG_CLOSE_REASONS,
  DIALOG_EDGE_PX, DIALOG_EVENT_CLOSE, DIALOG_EVENT_OPEN, DIALOG_FORMS, DIALOG_MAX_WIDTH_PX,
  DIALOG_MIN_HEIGHT_PX, DIALOG_OPEN_ATTR, DIALOG_OPENER_CLASS, DIALOG_SLOTS, DIALOG_STATUS_ATTR,
  DIALOG_STATUS_KINDS, DIALOG_TONES, dialogClass, dialogOpenerClass, dialogSlot,
} from './attrs.js';
export type {
  DialogAction, DialogCloseReason, DialogForm, DialogInput, DialogOpenerInput, DialogSlot,
  DialogStatusKind, DialogTone,
} from './attrs.js';
export { renderDialog, renderDialogOpener } from './render.js';
export { dialogCss, dialogEdgeMix, dialogHaloMix, dialogScrimMix } from './style.js';
export { buildDialogJs } from './runtime.js';
