/** #90 · 复制交互接线（裁决 Q13／AC-16①／契约 §3.3）：**只消费** base-paint 的复制面。
 *
 * 本文件是「复制交互走 Base P0 双通道」在 skill-calorie 侧的**唯一接线点**，三件东西：
 * ① 页面侧运行时 = `buildSharedHelpersJs()` 的**产出文本**（base-paint 唯一产出者，B3 禁技能侧自产）；
 *    它自带双通道（`navigator.clipboard` → `execCommand` 兜底）＋ toast 反馈 ＋
 *    `[data-action-id]` 事件委派（激活时读 `data-t`，零内联 `onclick`）。
 * ② 复制按钮 = `renderActionBar({ copyData })` 的**产出 HTML**（不手写按钮、不自造承载属性）。
 * ③ actionId = 冻结表 `HELP_COPY_ACTIONS`（不自造命名；页面内重复由 R27 记账——见下）。
 *
 * 为什么不自己写复制：契约 §6.3「不许自造」明列「只留 `execCommand` 的单通道复制（Q13）」
 * 「第二套共享 JS 产出者（唯一产出者 `buildSharedHelpersJs`）」「自造复制按钮 actionId 或承载属性」。
 *
 * 页面内 actionId 重复的口径（#78 记账 R27）：HELP 速查列表每行一个「复制指令」按钮，
 * 逐行写**同一个**冻结 id（`HELP_COPY_ACTIONS.prompt`），与 §3.5.3「每张场景卡逐字写入三个
 * 复制目标 actionId」同形；歧义由**页面侧** helpers 委派解决——它读的是**被点击元素**的
 * `data-t`，不做 id → 元素的反查。`CopyActionHostPort.listActionIds()` 允许含重复（自行去重）。
 */
import {
  ACTION_ID_ATTR,
  DEFAULT_DATA_ATTR,
  HELP_COPY_ACTIONS,
  buildSharedHelpersJs,
  renderActionBar,
} from 'base-paint';

/** 页面侧复制运行时（**逐字**等于 base-paint 唯一产出者的产出，禁本地改写）。 */
export const COPY_RUNTIME_JS: string = buildSharedHelpersJs();

/** 页面侧运行时的 `<script>` 包裹（页面模板/片段尾部注入；运行时自身幂等，重复注入等价一次）。 */
export function copyRuntimeScriptHtml(): string {
  return '<script>' + COPY_RUNTIME_JS + '</script>';
}

/** 复制目标的 actionId／文案（冻结表取用，缺省「复制指令」）。 */
export const CALORIE_COPY_ACTION: { readonly actionId: string; readonly label: string } = HELP_COPY_ACTIONS.prompt;

/** 单个复制按钮（走 `renderActionBar` 的 ghost 复制行；`text` 渲染期写入 `DEFAULT_DATA_ATTR`）。 */
export function copyActionHtml(text: string, action: { readonly actionId: string; readonly label: string } = CALORIE_COPY_ACTION): string {
  return renderActionBar({ copyData: { actionId: action.actionId, label: action.label, text } });
}

/** 页面内复制按钮的承载属性名（供测试与调用方断言，恒读冻结常量）。 */
export const COPY_BUTTON_ATTRS = Object.freeze({
  actionId: ACTION_ID_ATTR,
  text: DEFAULT_DATA_ATTR,
} as const);
