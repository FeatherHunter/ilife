/** editableValue · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 就地可编辑值（"值即入口"）——
 *
 *  一句话：把**一个已算好的值**变成可点的编辑入口——常态是「文本 ＋ 铅笔提示」，
 *  编辑态在**同一格里**换成 `input／select`，两种状态**同一盒模型**（列 x 与行高逐值相等）。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 要「先给我看一眼、顺手改一处」→ 用它（预检确认页、目标预检、批量导入预览、编辑器参数面）；
 *   · 要「用户从头填一张表」→ 用 `renderParamForm`（表单优先：每字段一行、标签在上）；
 *   · 要「只读对比，不许改」→ 用 `renderChangeRows`／`renderDataTable`。
 *
 *  三件出口：
 *   · `renderEditableValue(input)` —— 产标记（纯函数，零 DOM）；
 *   · `editableValueCss()` —— 该组件的样式段（页面按需注入；不进 12 区闭集）；
 *   · `buildEditableValueJs()` —— 运行时（产出 JS 文本；`renderDocShell({ editableValue: true })`
 *     会把它与样式段一起挂上，见 `src/docShell.ts`）。
 *
 *  页面怎么接自己的重算逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:edit-commit', (e) => {
 *    const { name, value, prev, label, unit } = e.detail;   // 值已就地更新完毕
 *    // 重算摘要 / 影响 / 主按钮载荷…
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  EDIT_AFFORDANCE_ATTR, EDIT_AFFORDANCES, EDIT_BOUND_ATTR, EDIT_DISABLED_ATTR, EDIT_DISPLAY_ATTR,
  EDIT_EVENT_CANCEL, EDIT_EVENT_COMMIT, EDIT_HIT_ATTR, EDIT_KINDS, EDIT_KIND_ATTR, EDIT_LABEL_ATTR,
  EDIT_MAX_ATTR, EDIT_MIN_ATTR, EDIT_NAME_ATTR, EDIT_OPTIONS_ATTR, EDIT_PLACEHOLDER_ATTR,
  EDIT_REQUIRED_ATTR, EDIT_STEP_ATTR, EDIT_UNIT_ATTR, EDIT_VALUE_ATTR, EDIT_VALUE_CLASS,
} from './attrs.js';
export type {
  EditableValueAffordance, EditableValueInput, EditableValueKind, EditableValueOption,
} from './attrs.js';
export { renderEditableValue } from './render.js';
export { editableValueCss, EDIT_VALUE_EDITOR_MAX_WIDTH_PX, EDIT_VALUE_MIN_HEIGHT_PX } from './style.js';
export { buildEditableValueJs } from './runtime.js';
