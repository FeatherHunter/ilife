/** wizard-shell · **组件出口**（本组件对外的唯一名字面）。
 *
 *  六个运行名：`renderWizardShell(input)`（产标记，零 DOM）／`wizardShellCss()`（样式段）／
 *  `buildWizardShellJs()`（运行时段，产出 JS 文本）／类名根 `WIZARD_SHELL_CLASS` 与 `wizardShellSlot()`（标记契约）／
 *  形态闭集 `WIZARD_SHELL_FORMS`（本件只落地形态 B「一问一屏」）。
 *  几何事实另给四个：`WIZARD_SHELL_MIN_TARGET_PX`（触控地板）／`WIZARD_SHELL_OPTION_MIN_HEIGHT_PX`（选项高）／
 *  `WIZARD_SHELL_TARGET_GAP_PX`（相邻触控目标间距）／`WIZARD_SHELL_SEG_PX`＋`WIZARD_SHELL_SEG_NOW_PX`（进度两档高）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderWizardShell } from './render.js';
export { buildWizardShellJs } from './runtime.js';
export type {
  WizardShellField,
  WizardShellFieldKind,
  WizardShellForm,
  WizardShellGo,
  WizardShellInput,
  WizardShellOption,
  WizardShellSlot,
} from './attrs.js';
export {
  WIZARD_SHELL_BACK_LABEL,
  WIZARD_SHELL_BAR_PX,
  WIZARD_SHELL_CLASS,
  WIZARD_SHELL_CONFIRM_TEXT,
  WIZARD_SHELL_DONE_LABEL,
  WIZARD_SHELL_EVENT_GO,
  WIZARD_SHELL_EVENT_PICK,
  WIZARD_SHELL_FIELD_ATTR,
  WIZARD_SHELL_FIELD_KINDS,
  WIZARD_SHELL_FORMS,
  WIZARD_SHELL_GO_ATTR,
  WIZARD_SHELL_LOADING_TEXT,
  WIZARD_SHELL_MIN_TARGET_PX,
  WIZARD_SHELL_NAME_ATTR,
  WIZARD_SHELL_NARROW_PX,
  WIZARD_SHELL_NEXT_LABEL,
  WIZARD_SHELL_OPTION_ATTR,
  WIZARD_SHELL_OPTION_MIN_HEIGHT_PX,
  WIZARD_SHELL_PAD_PX,
  WIZARD_SHELL_ROOT_ATTR,
  WIZARD_SHELL_SEG_NOW_PX,
  WIZARD_SHELL_SEG_PX,
  WIZARD_SHELL_SKIP_LABEL,
  WIZARD_SHELL_SLOTS,
  WIZARD_SHELL_STEP_ATTR,
  WIZARD_SHELL_TARGET_GAP_PX,
  WIZARD_SHELL_TOTAL_ATTR,
  WIZARD_SHELL_TOTAL_MAX,
  WIZARD_SHELL_TOTAL_MIN,
  WIZARD_SHELL_VALUE_ATTR,
  wizardShellSlot,
} from './attrs.js';
export { wizardShellCss } from './style.js';
