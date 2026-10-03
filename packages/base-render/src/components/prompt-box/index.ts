/** prompt-box · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderPromptBox(input)`（产标记，零 DOM）／`promptBoxCss()`（样式段）／
 *  `buildPromptBoxJs()`（运行时：产出 JS 文本，把点击翻译成 `ilife:prompt-copy`）／
 *  形态闭集 `PROMPT_BOX_FORMS`／类名根 `PROMPT_BOX_CLASS` 与槽助手 `promptBoxSlot()`。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  PROMPT_BOX_BOUND_ATTR,
  PROMPT_BOX_CLASS,
  PROMPT_BOX_COPY_ATTR,
  PROMPT_BOX_COPY_TEXT,
  PROMPT_BOX_EVENT_COPY,
  PROMPT_BOX_FORMS,
  PROMPT_BOX_ROOT_ATTR,
  PROMPT_BOX_SLOTS,
  promptBoxSlot,
} from './render.js';
export type { PromptBoxForm, PromptBoxInput, PromptBoxSlot } from './render.js';
export { renderPromptBox } from './render.js';
export {
  PROMPT_BOX_BUTTON_MIN_HEIGHT_PX,
  PROMPT_BOX_MIN_HEIGHT_PX,
  promptBoxCss,
} from './style.js';
export { buildPromptBoxJs } from './runtime.js';
