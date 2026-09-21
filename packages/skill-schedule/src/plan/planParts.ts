/** #787 · 「日程与计划」写侧这一族的**族级页内自造件**（页内自造件与样式常量的唯一住处）。
 *
 *  为什么住这里：本票五张页里只有一处公共层给不出的件——**改前改后逐格对照的蓝调面板**
 *  （老侧 f14「改/删日程回执」与 f15「补日程回执」的必现块「字段前后对照」）。公共层
 *  `renderChangeRows` 给的是「行即件」（不返容器），直接当一块塞进页壳，宽档栅格下每行各占一整行；
 *  而老侧那层底（浅蓝底 ＋ 左侧蓝档）也只在作息这一族用。写法照 `src/write/writeParts.ts` 的先例
 *  （同族两处自造件），**不跨能力引它**——那份是写入与同步域自己的件。
 *
 *  **只认形状，不认领域**：进来的是摆好的数据（哪几格改过、改前改后是什么值，都由 `receiptDocs.ts`
 *  算好），出去是 HTML 串。
 *
 *  **样式纪律（本票的代码层窄判据）**：本文件是**族级样式常量的唯一住处**——CSS 里的长度一律取下面
 *  那组具名常量、颜色一律取公共层冻结 token（`var(--…)`），`px` 字面量一处也不写。断点只用仓内
 *  既有值 **820**（页内自造件那一档），不新造。
 */
import { renderChangeRows, type ChangeRowInput } from 'base-paint/blocks';

/** 五字符转义（与公共层 `blocks.ts` 同口径；本件不引区块层内部件）。 */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

/** 族级样式常量（本域 CSS 里所有长度的出处；数值只在这里出现一次）。 */
const PANEL_GAP = 8;
const PANEL_PAD_Y = 12;
const PANEL_PAD_X = 14;
const PANEL_RADIUS = 12;
const RAIL_W = 3;
const HAIRLINE = 1;
const FS_TITLE = 15;
const FS_BODY = 13;
const NARROW = 820;
/** #788 目标达成卡那一件的长度（与上面同表：本文件是唯一住处）。 */
const GOAL_COLS = 2;
const GOAL_FS_VALUE = 22;
const GOAL_FS_LABEL = 13;
const GOAL_FS_HINT = 12;

const px = (n: number): string => n + 'px';
const LF = String.fromCharCode(10);

/** 蓝调前后对照面板（老侧必现块「字段前后对照」）：一行标题 ＋ 一段逐格对照。
 *  只改了一处也要出（一行也是对照）；`rows` 为空＝空串（不留空壳）。 */
export function renderChangePanel(input: {
  readonly title: string;
  readonly rows: readonly ChangeRowInput[];
}): string {
  if (input.rows.length === 0) return '';
  return '<h2 class="sch-pl-h2">' + esc(input.title) + '</h2>'
    + '<div class="sch-pl-diff">' + renderChangeRows({ rows: input.rows }) + '</div>';
}

/** #788 · 段名（页上一段的标题）：走公共层区块自己的段名类 `heat-title`（与 `shared/overviewPage`
 *  的逐日段名同一条口径），**不新造类名、不新添 CSS**。老侧那四档的每个区块都有自己的名字，
 *  出页门与探针按名字认块，故段名必须由一处产出。 */
export function renderSectionTitle(text: string): string {
  return '<h2 class="heat-title">' + esc(text) + '</h2>';
}

/** #788 · 目标达成卡（老侧 month 档的「目标达成」：`.goal-card` 那一件）。 */
export interface GoalCardInput {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}

/** 目标达成：一格一张卡（标签 ＋ 读数 ＋ 一句怎么读）。`cards` 为空＝空串（不留空壳）。 */
export function renderGoalCards(cards: readonly GoalCardInput[]): string {
  if (cards.length === 0) return '';
  return '<div class="sch-pl-goals">' + cards.map((card) =>
    '<div class="sch-pl-goal">'
    + '<div class="sch-pl-goal-label">' + esc(card.label) + '</div>'
    + '<div class="sch-pl-goal-value">' + esc(card.value) + '</div>'
    + '<div class="sch-pl-goal-hint">' + esc(card.hint) + '</div>'
    + '</div>').join('') + '</div>';
}

/** 本处族级件的样式唯一产出者（只对用上它的页面有作用）。
 *  颜色只取公共层冻结 token；长度只取上面那组常量——本串里不出现 `px` 字面量。 */
export function planPartsCss(): string {
  return [
    '/* #787 日程与计划域·族级件（断点只用仓内既有值 820） */',
    '.sch-pl-h2 { margin: 0 0 ' + px(PANEL_GAP) + '; font-size: ' + px(FS_TITLE) + '; font-weight: 600; color: var(--fg); }',
    '.sch-pl-diff { padding: ' + px(PANEL_PAD_Y) + ' ' + px(PANEL_PAD_X) + '; border: ' + px(HAIRLINE) + ' solid var(--line);',
    '  border-left: ' + px(RAIL_W) + ' solid var(--blue); border-radius: ' + px(PANEL_RADIUS) + '; background: var(--soft); }',
    '.sch-pl-note { margin: 0; color: var(--fg2); font-size: ' + px(FS_BODY) + '; line-height: 1.7; }',
    '/* #788 复盘与飞书域·族级件：目标达成卡（断点只用仓内既有值 820） */',
    '.sch-pl-goals { display: grid; grid-template-columns: repeat(' + String(GOAL_COLS) + ', minmax(0, 1fr));',
    '  gap: ' + px(PANEL_GAP) + '; margin: ' + px(PANEL_GAP) + ' 0 ' + px(PANEL_GAP) + '; }',
    '.sch-pl-goal { padding: ' + px(PANEL_PAD_Y) + ' ' + px(PANEL_PAD_X) + '; border: ' + px(HAIRLINE) + ' solid var(--line);',
    '  border-radius: ' + px(PANEL_RADIUS) + '; background: var(--soft); }',
    '.sch-pl-goal-label { color: var(--fg2); font-size: ' + px(GOAL_FS_LABEL) + '; }',
    '.sch-pl-goal-value { margin-top: ' + px(PANEL_GAP) + '; font-size: ' + px(GOAL_FS_VALUE) + '; font-weight: 600;',
    '  color: var(--fg); font-variant-numeric: tabular-nums; }',
    '.sch-pl-goal-hint { margin-top: ' + px(PANEL_GAP) + '; color: var(--fg2); font-size: ' + px(GOAL_FS_HINT) + '; line-height: 1.7; }',
    '@media (max-width: ' + px(NARROW) + ') {',
    '  .sch-pl-diff { padding: ' + px(PANEL_PAD_Y) + ' ' + px(PANEL_GAP) + '; }',
    '  .sch-pl-goals { grid-template-columns: minmax(0, 1fr); }',
    '}',
  ].join(LF);
}
