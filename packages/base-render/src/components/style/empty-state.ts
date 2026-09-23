/** style 区 · emptyState
 *
 *  自 `src/style.ts` 的 `SECTION_BUILDERS[emptyState]` **连它上面那段注释一起**原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/style.ts` 切成「一份令牌 ＋ 一个区一件 ＋ 一个组装器」，
 *  正文原样搬来；搬迁判据＝产物逐字节相同（`buildStyleSheet()` 的 css 全文 ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { LF } from './parts.js';

export const emptyStateSection: (prefix: string) => string = (p) => [
  '.' + p + 'empty {',
  '  padding: 48px 20px;',
  '  border: 1px solid var(--line);',
  '  border-radius: 20px;',
  '  background: var(--card);',
  '  text-align: center;',
  '  color: var(--fg2);',
  '}',
  '.' + p + 'empty-icon {',
  // #567 J4（§5.2 大数 28 吸收 26／28／32／40）：装饰图标 40→28。
  '  font-size: 28px;',
  '  line-height: 1.2;',
  '  opacity: .5;',
  '}',
  '.' + p + 'empty-text {',
  '  margin-top: 8px;',
  '  color: var(--fg);',
  // #567 J4（§5.2 标题 18 吸收 17／18／20／22）。
  '  font-size: 18px;',
  '  font-weight: 600;',
  '}',
  '.' + p + 'empty-hint {',
  '  margin-top: 4px;',
  '  color: var(--fg3);',
  '  font-size: 13px;',
  '}',
  '.' + p + 'empty-action {',
  '  margin-top: 16px;',
  '}',
].join(LF)
