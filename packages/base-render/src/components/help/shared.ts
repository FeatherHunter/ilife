/** help · shared
 *
 *  自 `src/help.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/help.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { HELP_SHELL_ID, HelpSchemaErrorCode, HelpSchemaErrorShape } from '../../spec/help.js';
import { CONTROL_STYLE_SECTIONS, ControlStyleSection } from '../../spec/style.js';
import { STYLE_PREFIX } from '../../style.js';

export const LF = String.fromCharCode(10);
function sectionSlug(section: ControlStyleSection): string {
  return section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

/** 样式区名（`helpShell`）：**恒取 `CONTROL_STYLE_SECTIONS` 的闭集成员**——kebab 后与 `HELP_SHELL_ID`
 *  同值者（**不自写字面量**）。闭集漂移即在此 fail-fast，不会静默改用别的命名空间。 */
const HELP_SECTION = CONTROL_STYLE_SECTIONS.find(
  (section) => STYLE_PREFIX + sectionSlug(section) === HELP_SHELL_ID,
);
if (HELP_SECTION === undefined) {
  throw new Error('base-paint/help：CONTROL_STYLE_SECTIONS 闭集缺与 HELP_SHELL_ID 同 kebab 的区名（'
    + HELP_SHELL_ID + '）');
}

/** 类名命名空间根（`ilife-help-shell`）：由**闭集区名**派生，与根元素 id（`HELP_SHELL_ID`）同值但来源独立。 */
export const HELP_CLASS_ROOT = STYLE_PREFIX + sectionSlug(HELP_SECTION);

/** 类名拼装（命名空间内，不自写第二份前缀）。 */
export function cls(suffix: string): string {
  return HELP_CLASS_ROOT + '-' + suffix;
}

/** 分组 Tab 的 radio `name`（页内唯一分组名，标签用 `for` 跨节点指向）。 */
export const TAB_GROUP_NAME = cls('tab-group');

/** 分组页 radio 的 id（**索引派生**：数据里的 group.id 可能重复，不得用作 HTML id）。 */
export function tabRadioId(index: number): string {
  return cls('tab-' + index);
}

/** 关于 Tab 的 radio id。 */
export const ABOUT_TAB_ID = cls('tab-about');

/* ── 1. 错误形态 ────────────────────────────────────────────── */

/** 校验失败（形态逐字对齐冻结的 `HelpSchemaErrorShape`：`{ name, code, path, message }`）。
 *
 * **不从 `src/index.ts` 导出**：冻结面 `SPEC_FROZEN_SURFACE` 无该运行时条目，导出会打破
 * 「新增运行时出口恰好等于清单 implemented 的运行时项」出口面锁（与 `TemplateError`／`ControlsError` 同口径，
 * 裁定 R13）。调用方按 `name`／`code`／`path` 判定。
 */
export class HelpSchemaError extends Error implements HelpSchemaErrorShape {
  readonly name: 'HelpSchemaError' = 'HelpSchemaError';
  readonly code: HelpSchemaErrorCode;
  /** JSON 指针式路径（根为 `/`）。 */
  readonly path: string;

  constructor(code: HelpSchemaErrorCode, path: string, message: string) {
    super(message);
    this.code = code;
    this.path = path;
  }
}

export function fail(code: HelpSchemaErrorCode, path: string, message: string): never {
  throw new HelpSchemaError(code, path, message);
}

