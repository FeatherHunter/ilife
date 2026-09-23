/** style · parts
 *
 *  自 `src/style.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/style.ts` 切成「一份令牌 ＋ 一个区一件 ＋ 一个组装器」，
 *  正文原样搬来；搬迁判据＝产物逐字节相同（`buildStyleSheet()` 的 css 全文 ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { CSS_VAR_TOKENS, ControlStyleSection, CssVarName } from '../../spec/style.js';

/* ── #75 共享样式资产（契约 §3.2／§6.2） ───────────────────────────────── */

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面 `\n`）。 */
export const LF = String.fromCharCode(10);

/** 样式区名 → kebab 类名根（`actionBar` → `action-bar`）。
 *  **只用于生成注释头**：真实类名恒取各控件产出器里的字面量（见各区注释），
 *  区名 kebab 与类名根并非一一对应（如 `copyButton` 的类名根是 `copy-btn`、
 *  `emptyState` 是 `empty`、`errorReceipt` 是 `error`）——**不得**用本函数臆造类名。 */
export function sectionSlug(section: ControlStyleSection): string {
  return section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

/** `:root` 的 11 个冻结 token 块：逐值取 `CSS_VAR_TOKENS`，顺序即常量声明序。
 *  形态与契约 doc:276-288 的 CSS 块一致（`name + ': ' + value` 带空格）。 */
export function rootBlock(): string {
  const lines: string[] = [':root {'];
  for (const name of Object.keys(CSS_VAR_TOKENS) as CssVarName[]) {
    lines.push('  ' + name + ': ' + CSS_VAR_TOKENS[name] + ';');
  }
  lines.push('}');
  return lines.join(LF);
}

/** 页级基础（非控件区）：**本票不产**。
 *  裁定 R7／施工单 B-D2(a)：共享页面模板／KPI／表格／回到顶部等**无闭集归属**的样式归 #104
 *  （区块组件 owner），#75 只产 11 token ＋ 8 个闭集样式区；`extraCss` 语义被
 *  契约 doc:299-300 限死（只许技能作用域 token 覆盖块），**不得**塞共享页面模板的样式。 */

/** 主色 alpha 派生（`ghostBorderAlpha` 等）：RGB 与 `--blue` 同源（`#007aff`）。
 *  这是**派生字面量**、不是第二份 token 表（不新增 token 名，doc:299）。 */
export const BLUE_RGB = '0, 122, 255';

/** 焦点环（视觉尺 H-20 强制项）：`:focus-visible` 覆盖全部可交互控件。 */
export function focusRing(selector: string): string {
  return selector + ':focus-visible {' + LF + '  outline: 2px solid var(--blue);' + LF + '  outline-offset: 2px;' + LF + '}';
}
