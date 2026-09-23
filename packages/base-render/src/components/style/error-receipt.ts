/** style 区 · errorReceipt
 *
 *  自 `src/style.ts` 的 `SECTION_BUILDERS[errorReceipt]` **连它上面那段注释一起**原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/style.ts` 切成「一份令牌 ＋ 一个区一件 ＋ 一个组装器」，
 *  正文原样搬来；搬迁判据＝产物逐字节相同（`buildStyleSheet()` 的 css 全文 ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { LF } from './parts.js';
import { ACTION_BAR_DEFAULTS, TOAST_DEFAULTS } from '../../spec/index.js';

/** errorReceipt —— 类名产出者 `src/controls.ts:763-765`。
 *  **类名撞车处置（裁定 R6／施工单 B-R4）**：`ilife-error` 亦由
 *  `packages/skill-calorie/src/render/html.ts:254`（`cx('error')`，语义为「错误页正文」）产出，
 *  故容器规则**不得**用裸 `.ilife-error` 选择器（会污染 calorie 错误页）；改用
 *  `:has(> .ilife-error-title)` 精确限定「本组件自己的类组合」——
 *  calorie 的 `ilife-error` 节点无该子元素，**不命中**。 */

export const errorReceiptSection: (prefix: string) => string = (p) => [
  '.' + p + 'error:has(> .' + p + 'error-title) {',
  '  margin: 12px 0;',
  '  padding: 20px 22px;',
  '  border: 1px solid rgba(255, 59, 48, .28);',
  '  border-radius: 14px;',
  '  background: rgba(255, 59, 48, .06);',
  '  color: var(--fg);',
  '}',
  '.' + p + 'error-title {',
  '  margin-bottom: 14px;',
  '  color: #a83228;',
  '  font-size: 15px;',
  '  font-weight: 700;',
  '}',
  // **旧层两行 grid 语义对齐**（施工单 B §1.6 要求「等价」）：旧层 `.hm-actions`
  // `{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:520px;margin:0 auto}`（`base.css:81-91`，
  // 其中 `max-width:520px;margin:0 auto` 在 **`:87-89`**）＋ `.hm-error .hm-actions{margin-top:0}` 与
  // 相邻 `+ .hm-actions{margin-top:14px}`（两行之间的竖向间距 14px）。
  // A2 返修项⑤实测旧实现 retry 独占 1352px、两个 ghost 仅 78px（单 flex 行）→ 改为
  // grid 2 列（列数取 `ACTION_BAR_DEFAULTS.evenRowPairs`）＋ `.ilife-copy-btn-wide` 跨全列。
  // **返修 W5**：上一轮漏了 `max-width:520px;margin:0 auto`（实测 retry 1352／ghost 672，
  // 旧应为 520／256）→ 本节补上；两行间距由 `gap:8px` 改为 `row-gap:14px;column-gap:8px`
  // 以逐值对齐旧层 `+.hm-actions{margin-top:14px}`。
  '.' + p + 'error-actions {',
  '  display: grid;',
  '  grid-template-columns: repeat(' + ACTION_BAR_DEFAULTS.evenRowPairs + ', minmax(0, 1fr));',
  '  row-gap: 14px;',
  '  column-gap: 8px;',
  '  max-width: 520px;',
  '  margin-left: auto;',
  '  margin-right: auto;',
  '}',
  '.' + p + 'error-actions > .' + p + 'copy-btn-wide {',
  '  grid-column: 1 / -1;',
  '}',
  '@media (max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px) {',
  '  .' + p + 'error:has(> .' + p + 'error-title) {',
  '    padding: 16px 14px;',
  '  }',
  '}',
].join(LF)
