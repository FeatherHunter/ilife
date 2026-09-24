/** streak-badge · **样式段**（本件唯一的样式来源）。
 *
 *  三条纪律（与组件层其余件同一份）：
 *   1. 颜色／圆角／字面／字号一律经 `skinVar()` 读；本件源码里不出现手写的 `var(--ilife-…)`；
 *   2. 全部规则 scope 在 `.<prefix>page-ui` 之下；
 *   3. **强弱三档靠形状分**：实底／描边空心／无框只带底线，字重 800／700／600——
 *      「大字报刊」皮肤下强调色＝墨黑，只靠变色就分不出轻重了。
 *
 *  几何契约（钉在判据里）：徽标只在自己的宽度里生长（`flex: 0 1 auto` ＋ `min-width:0`），
 *  读数 `white-space:nowrap`（数不许被 `…` 截断）；窄容器里一个徽标一行。
 *  本件**零动效、零可点元素**（没有可卡住的中间态，也不装作能点）。
 */
import { skinVar } from '../skin/contract.js';
import { streakBadgeClass, streakBadgeSlot, type StreakBadgeSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本件的内容容器名（`@container` 按它命中）。 */
export const STREAK_BADGE_CONTAINER = 'ilife-streak-badge';
/** 窄档断点（px）：容器窄于它就把徽标一行一个（**不是**视口断点）。 */
export const STREAK_BADGE_NARROW_MAX_PX = 380;
/** 徽标的高度下限（px）：本件没有可点元素，先把高度钉在 44 的一半上下（32），行内好排。 */
export const STREAK_BADGE_MIN_HEIGHT_PX = 32;
/** 读数的字号（px）：比前词大一档，让"数"是这一件的主动作。 */
export const STREAK_BADGE_VALUE_PX = 17;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function streakBadgeCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** 槽类的**裸**选择器（不带 `.page-ui` 前缀）：只用在"祖先已经由 `sc()` 给过"的嵌套选择器里——
   *  否则会拼成 `.page-ui .a .page-ui .b`（那要求 `.page-ui` 出现在件内部），永远匹配不上（实拍踩过）。 */
  const n = (name: StreakBadgeSlot): string => '.' + streakBadgeSlot(name, p);
  const sc = (name: StreakBadgeSlot): string => root + ' ' + n(name);
  const s = root + ' .' + streakBadgeClass(p);
  const badge = sc('badge');
  const v = skinVar;
  return [
    '/* streak-badge（连记徽标）：强／中／弱三档 —— 实底／描边空心／无框底线。 */',
    s + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  min-width: 0;',
    '  container: ' + STREAK_BADGE_CONTAINER + ' / inline-size;',
    '}',
    sc('head') + ' {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 8px;',
    '  margin-bottom: 2px;',
    '}',
    sc('heading') + ' {',
    '  color: ' + v('ink-3') + ';',
    '  font-size: 11.5px;',
    '  font-weight: 700;',
    '  letter-spacing: .22em;',
    '}',
    sc('list') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 8px;',
    '  min-width: 0;',
    '}',
    badge + ' {',
    '  display: inline-flex;',
    '  align-items: baseline;',
    '  gap: 6px;',
    '  box-sizing: border-box;',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  min-height: ' + STREAK_BADGE_MIN_HEIGHT_PX + 'px;',
    '  padding: 4px 12px;',
    '  border: 1px solid transparent;',
    '  border-radius: ' + v('radius-pill') + ';',
    '  background: none;',
    '  color: ' + v('ink-2') + ';',
    '  font-size: ' + v('fs-xs') + ';',
    '  line-height: 1.6;',
    '}',
    sc('label') + ' {',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    sc('value') + ' {',
    '  color: ' + v('ink') + ';',
    '  font-family: ' + v('font-num') + ';',
    '  font-size: ' + STREAK_BADGE_VALUE_PX + 'px;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    sc('unit') + ' {',
    '  color: ' + v('ink-2') + ';',
    '  white-space: nowrap;',
    '}',
    '/* 强档：实底（形）＋ 反白字 ＋ 最重一笔。 */',
    badge + '.is-strong {',
    '  border: 0;',
    '  background: ' + v('accent') + ';',
    '  color: ' + v('accent-ink') + ';',
    '  font-weight: 800;',
    '}',
    badge + '.is-strong ' + n('value') + ' { color: ' + v('accent-ink') + '; }',
    badge + '.is-strong ' + n('unit') + ' { color: ' + v('accent-ink') + '; }',
    '/* 中档：描边空底（形）＋ 强调文字档。 */',
    badge + '.is-mid {',
    '  border: 1px solid ' + v('accent') + ';',
    '  background: none;',
    '  color: ' + v('accent-text') + ';',
    '  font-weight: 700;',
    '}',
    badge + '.is-mid ' + n('value') + ' { color: ' + v('accent-text') + '; }',
    '/* 弱档：无框，只有一条底线（形）＋ 最轻一笔 —— 读起来是注脚，不是战绩。 */',
    badge + '.is-weak {',
    '  padding: 4px 2px;',
    '  border: 0;',
    '  border-bottom: 2px solid ' + v('line') + ';',
    '  border-radius: 0;',
    '  color: ' + v('ink-3') + ';',
    '  font-weight: 600;',
    '}',
    badge + '.is-weak ' + n('value') + ' { color: ' + v('ink-2') + '; }',
    sc('absent') + ' {',
    '  margin: 0;',
    '  padding: 6px 0 2px;',
    '  color: ' + v('ink-3') + ';',
    '  font-size: ' + v('fs-sm') + ';',
    '}',
    '/* 窄档：一个徽标一行（徽标自己撑满），读数照旧不截断。 */',
    '@container ' + STREAK_BADGE_CONTAINER + ' (max-width: ' + STREAK_BADGE_NARROW_MAX_PX + 'px) {',
    '  ' + sc('list') + ' { flex-direction: column; align-items: stretch; }',
    '  ' + badge + ' { flex: 1 1 auto; }',
    '}',
  ].join(LF);
}
