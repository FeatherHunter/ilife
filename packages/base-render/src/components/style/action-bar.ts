/** style 区 · actionBar
 *
 *  自 `src/style.ts` 的 `SECTION_BUILDERS[actionBar]` **连它上面那段注释一起**原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/style.ts` 切成「一份令牌 ＋ 一个区一件 ＋ 一个组装器」，
 *  正文原样搬来；搬迁判据＝产物逐字节相同（`buildStyleSheet()` 的 css 全文 ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { BLUE_RGB, LF, focusRing } from './parts.js';
import { ACTION_BAR_DEFAULTS, TOAST_DEFAULTS } from '../../spec/index.js';

/** actionBar —— 类名产出者 `src/controls.ts:649-695`（`action-bar`／`action-row`／
 *  `action-row-ghost`／`action-btn`／`action-btn-<kind>`）。 */

export const actionBarSection: (prefix: string) => string = (p) => [
  '.' + p + 'action-bar {',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 8px;',
  '  box-sizing: border-box;',
  '  margin: 12px 0;',
  // 旧层冻结值（旧 `base.css:81-91`）。≤552 的窄档内容列不到 520px 时这条不生效；
  // 553–820 的内容列已超 520px（820 实测内容列 780px），须由下方 641 档放开（#427 实测）。
  '  max-width: 520px;',
  '}',
  // #238（用户 2026-09-13 二次裁定「两个按钮平分宽度」）＋ #427 中档修正：
  // 桌面与中档**铺满内容列**，动作条里的整行
  // （`.action-row-ghost` 的 `repeat(2, minmax(0, 1fr))`）随之按内容列平分——两颗按钮各占一半。
  // 放开位取 641（`blocks.ts:1899` 与 `helpShell` 640 档同源的桌面侧补集，不新增断点值；
  // 原 821 位在 641–820 留出 260px 空白，KPI 栅格同档已铺满 780px，见 #427 缺口 1），
  // 故 ≤640 的窄档逐像素不动、≥641 与改前 821 档同为 `max-width: none`（≥821 零变）。
  '@media (min-width: 641px) {',
  '  .' + p + 'action-bar {',
  '    max-width: none;',
  '  }',
  '}',
  '.' + p + 'action-row {',
  '  display: grid;',
  '  grid-template-columns: repeat(' + ACTION_BAR_DEFAULTS.evenRowPairs + ', minmax(0, 1fr));',
  '  gap: 8px;',
  '}',
  '.' + p + 'action-row-ghost {',
  // 复制按钮那一行**平分整行**（#247 用户 2026-09-12 返修）：两列而不是单列——单列只在「一行一颗」时
  // 才好看，一旦有第二颗（复制数据 ＋ 复制日志）就变成「一颗铺满、一颗缩成内容宽」。列数取冻结
  // `ACTION_BAR_DEFAULTS.evenRowPairs`（既有「偶数一行 2 个」的口径，不是新拍的数字）。
  '  grid-template-columns: repeat(' + ACTION_BAR_DEFAULTS.evenRowPairs + ', minmax(0, 1fr));',
  '}',
  // #249：窄屏那档菜单**以整行做锚点**（同档 `copyButton` 区把包裹层改成 `position: static`）——
  // 行盒＝内容宽，菜单 `left:0; right:0` 落进去就恒在视口内，与那颗按钮落在左格还是右格无关。
  // 只在窄屏挂，桌面档的锚点仍是包裹层（菜单贴按钮右缘，用户已验收的样子不动）。
  '@media (max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px) {',
  '  .' + p + 'action-row-ghost {',
  '    position: relative;',
  '  }',
  '}',
  // **#654 后续（负责人 2026-09-16 第二次验收，口径变更）**：#427 的「≤640 单列」**撤回**。
  // 负责人明确「底部应该是并排的两颗：复制数据 ＋ 复制日志」，且同仓参考页（`D:\ilife-验收` 根下
  // 01～05，已验收）**在 390 档也是两列并排** ⇒ ghost 行**各宽档恒两列平分**（回到 #247 口径）。
  // 390 档两列各约 175px 偏窄，由「必须并排」这条更高的要求承担（负责人裁定）。
  // 原规则 `@media (max-width:640px){ .…action-row-ghost{ grid-template-columns: minmax(0,1fr) } }`
  // 已删；`page-finish-427.test.mjs` 的对应断言已按新口径改钉（改成「不许再有单列覆盖」）。
  // #654：ghost 行**只有一颗真按钮**时，让它在整行轨道里铺满——#336 当年靠「补一颗禁用态假按钮」
  // 凑第二格，为的就是保这个几何（不占半格、也不缩成内容宽）；现在列数跟着颗数走，假控件不再需要
  // （负责人 2026-09-16 验收：读页面底部那颗点不动的「复制日志」是缺陷）。
  '.' + p + 'action-row-ghost-single > .' + p + 'copy-btn {',
  '  grid-column: 1 / -1;',
  '}',
  '.' + p + 'action-btn {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  min-height: ' + ACTION_BAR_DEFAULTS.minHeightPx + 'px;',
  '  padding: 0 16px;',
  '  border: 1px solid transparent;',
  '  border-radius: 999px;',
  '  background: var(--blue);',
  '  color: var(--card);',
  '  font-family: inherit;',
  '  font-size: ' + ACTION_BAR_DEFAULTS.fontSizePx + 'px;',
  '  font-weight: ' + ACTION_BAR_DEFAULTS.fontWeight + ';',
  '  line-height: 1;',
  '  cursor: pointer;',
  '  -webkit-tap-highlight-color: transparent;',
  '  touch-action: manipulation;',
  '}',
  '.' + p + 'action-btn-primary {',
  '  background: var(--blue);',
  '  color: var(--card);',
  '}',
  '.' + p + 'action-btn-red {',
  '  background: #ff3b30;',
  '  color: var(--card);',
  '}',
  '.' + p + 'action-btn-ghost {',
  '  border-color: rgba(' + BLUE_RGB + ', ' + ACTION_BAR_DEFAULTS.ghostBorderAlpha + ');',
  '  background: var(--card);',
  '  color: var(--blue2);',
  '}',
  // #733：`disabled`（「标记」而非「可点控件」）的样式。**改前本区没有这一条**——
  //   而 `.copy-btn` 那边早就有（浅底 ＋ `--fg3` 字 ＋ `cursor: not-allowed`，见 `copyButton` 区）。
  //   动作条这一条按同一套值对齐，两处读起来是同一档「不可点」。取既有 `--soft`／`--line`／`--fg3`，
  //   零新色值；只在本区加，不动任何既有选择器。
  '.' + p + 'action-btn[disabled],',
  '.' + p + 'action-btn:disabled {',
  '  opacity: 1;',
  '  border-color: var(--line);',
  '  background: var(--soft);',
  '  color: var(--fg3);',
  '  cursor: not-allowed;',
  '}',
  // #179 触控目标：窄屏按钮抬到 44px。**#525 起两个宽档同值**（`minHeightPx` 40 → 44，见
  // `spec/controls.ts`）；本条留在这里只为不动既有选择器与既有媒体查询。
  '@media (max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px) {',
  '  .' + p + 'action-btn {',
  '    min-height: 44px;',
  '  }',
  '}',
  focusRing('.' + p + 'action-btn'),
].join(LF)
