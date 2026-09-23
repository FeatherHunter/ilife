/** style 区 · statusBadge
 *
 *  自 `src/style.ts` 的 `SECTION_BUILDERS[statusBadge]` **连它上面那段注释一起**原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/style.ts` 切成「一份令牌 ＋ 一个区一件 ＋ 一个组装器」，
 *  正文原样搬来；搬迁判据＝产物逐字节相同（`buildStyleSheet()` 的 css 全文 ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { LF } from './parts.js';

/** statusBadge —— 类名产出者 `controls.ts:702-707`。
 *  **逐值对齐施工单 B §1.4**：`gap:6px;padding:6px 14px;font-size:13px;font-weight:600;
 *  border-radius:999px;width:fit-content`。四组底色／字色**逐值取旧 `.hm-status.{ok,warn,danger,empty}`**
 *  （`公共组件/assets/base.css:225-228`；旧值清单亦见施工单 B `:253`）——**实色**背景，非 alpha：
 *  ok `#e6f7ec`／`#1f8c3d`、warn `#fff5e0`／`#a25b00`、danger `#fff0ee`／`#a83228`、
 *  empty `#f0f0f3`／`var(--fg2)`（empty 字色旧层 `base.css:228` 为 `#6e6e73`＝`--fg2` 解析值，底色为实色 `#f0f0f3`）。
 *  **返修 W2**：上一轮误用 `#1f8f3d`／`#b25000`（全仓无出处）＋ 12% alpha 底色，且注释谎称「沿用旧值」
 *  → 已改回旧逐值，注释与实现一致（非 token 硬编码色按 D-5 以 CSS 常量实施，不新增 token 名）。 */

export const statusBadgeSection: (prefix: string) => string = (p) => [
  '.' + p + 'status-badge {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 6px;',
  '  padding: 6px 14px;',
  '  border-radius: 999px;',
  '  background: var(--soft);',
  '  color: var(--fg2);',
  '  font-size: 13px;',
  '  font-weight: 600;',
  '  line-height: 1.6;',
  '  width: fit-content;',
  '}',
  '.' + p + 'status-badge-ok {',
  '  background: #e6f7ec;',
  '  color: #1f8c3d;',
  '}',
  '.' + p + 'status-badge-warn {',
  '  background: #fff5e0;',
  '  color: #a25b00;',
  '}',
  '.' + p + 'status-badge-danger {',
  '  background: #fff0ee;',
  '  color: #a83228;',
  '}',
  '.' + p + 'status-badge-empty {',
  '  background: #f0f0f3;',
  '  color: var(--fg2);',
  '}',
].join(LF)
