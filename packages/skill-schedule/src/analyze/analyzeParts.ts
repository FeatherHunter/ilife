/** #789 · 「分析与洞察」域的族级页内自造件（本域页内自造件与样式常量的唯一住处）。
 *
 *  为什么住这里（写得出哪几处在用）：本票三张页上有三处公共层给不出的形状——
 *    · **7 维差异柱**（老侧 f03「作息记录·对比」的必现块）：同一条维度上两个区间并排对照 ＋ 差值。
 *      公共层八种图（`CHART_KINDS`）给不出这一形状；`renderDistributionRows` 是「一行一段」，
 *      两段要并排就得自己摆栅格。
 *    · **7 维雷达**（老侧 f05「异常检测」的必现块）：`CHART_KINDS` 里没有雷达这一项。
 *    · **红框与黄框的异常条目**（老侧 f05 的另一个必现块）：公共层没有「按严重度整条套框」的列表件
 *      （`renderListRows` 的左槽是给 `▲` 这类小标记的，套不上整条框）。
 *  三处都只在本域用，故照 `src/write/writeParts.ts`／`src/plan/planParts.ts` 的先例，把本域的
 *  自造件落在本域的族级件文件里，**不往共用位塞**（共用位不是各域的样式收容所）。
 *
 *  **只认形状，不认领域**：进来的是摆好的读数（哪一维、两段各多少分钟、格式化后的字串），
 *  出去是 HTML 串——本件不引 `policy`，也不认一级分类那八个名字。
 *
 *  **样式纪律（本票的代码层窄判据）**：本文件是族级样式常量的唯一住处——CSS 里的长度一律取
 *  下面那组具名常量（`px()` 是唯一的拼接处）、颜色一律取公共层冻结 token（`var(--…)`）与冻结色板
 *  `CHART_PALETTE`，`px` 字面量一处也不写。断点只用仓内既有值 **820**（页内自造件那一档），不新造。
 */
import { CHART_PALETTE } from 'base-paint';

/* ─────────────────────────── 风格常量（本域 CSS 所有长度的出处） ─────────────────────────── */

const FS_TITLE = 15;
const FS_BODY = 13;
const FS_SMALL = 12;
const FS_TINY = 11;
const GAP = 8;
const ROW_GAP = 10;
const PAD_Y = 12;
const PAD_X = 14;
const RADIUS = 12;
const HAIRLINE = 1;
const RAIL = 4;
const NAME_W = 92;
const DELTA_W = 76;
const TAG_W = 22;
const BAR_H = 10;
const BAR_RADIUS = 5;
const FRAME_RADIUS = 10;
/** 雷达几何（viewBox 的边长与中心、半径、环数与标签外扩——`SVG` 侧的长度全取这里）。 */
const RADAR_W = 400;
const RADAR_H = 430;
const RADAR_CX = 200;
const RADAR_CY = 205;
const RADAR_R = 118;
const RADAR_LABEL_GAP = 16;
const RADAR_MAX_W = 420;
const STROKE_HAIRLINE = 0.5;
const STROKE_CURVE = 2;
const STROKE_FILL = 1;
const OPACITY_BASE = 0.18;
const OPACITY_CURVE = 0.28;
/** 环（由外到内；比例相对半径）。 */
const RADAR_RINGS = [1, 0.75, 0.5, 0.25];
const NARROW = 820;

/** 取色只此一处：两段对照走「主色 对 橙」，框与差值走冻结色板的绿／红／灰。 */
const COLOR_A = 'var(--blue)';
const COLOR_B = CHART_PALETTE[2];
const COLOR_RED = CHART_PALETTE[3];
const COLOR_UP = CHART_PALETTE[1];
const COLOR_DOWN = CHART_PALETTE[3];
const COLOR_FLAT = 'var(--fg3)';

const px = (n: number): string => n + 'px';
const LF = String.fromCharCode(10);

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

/** 域内段名（页上一段的标题）。老侧每个区块都有自己的名字，出页门与探针按名字认块，
 *  故段名由一处产出：本件。 */
export function renderSectionTitle(text: string): string {
  return '<h2 class="sch-an-h2">' + esc(text) + '</h2>';
}

/* ─────────────────────────── ① 7 维差异柱 ─────────────────────────── */

export interface DiffBarInput {
  readonly label: string;
  /** 维度名前的字形（由调用方给，本件不认领域）。 */
  readonly glyph: string;
  /** 两段的原始读数（分钟）——只用来算柱长，不上屏。 */
  readonly aValue: number;
  readonly bValue: number;
  /** 两段已格式化的读数（上屏的那两串）。 */
  readonly aText: string;
  readonly bText: string;
  /** 差值已格式化的样子（上屏）。 */
  readonly deltaText: string;
  readonly tone: 'up' | 'down' | 'flat';
}

/** 一条维度一行：名字 ＋ 差值 ／ A 与 B 各一条柱子与读数。柱长按**本行两段的较大者**比
 *  （逐行归一：一维与另一维的量级差一个数量级时，跨行归一会把小维度压成看不见的一条线）。 */
export function renderDiffBars(rows: readonly DiffBarInput[]): string {
  if (rows.length === 0) return '';
  const max = Math.max(1, ...rows.map((row) => Math.max(row.aValue, row.bValue)));
  const line = (tag: string, cls: string, value: number, text: string): string =>
    '<div class="sch-an-diff-line">'
    + '<span class="sch-an-diff-tag">' + esc(tag) + '</span>'
    + '<span class="sch-an-diff-bar"><i class="' + cls + '" style="width:'
    + String(Math.round((value / max) * 100)) + '%"></i></span>'
    + '<span class="sch-an-diff-val">' + esc(text) + '</span>'
    + '</div>';
  return '<div class="sch-an-diff">' + rows.map((row) =>
    '<div class="sch-an-diff-item">'
    + '<div class="sch-an-diff-head">'
    + '<span class="sch-an-diff-name">' + esc(row.glyph === '' ? row.label : row.glyph + ' ' + row.label) + '</span>'
    + '<span class="sch-an-diff-delta" style="color:' + toneColor(row.tone) + '">' + esc(row.deltaText) + '</span>'
    + '</div>'
    + line('A', 'sch-an-diff-fill-a', row.aValue, row.aText)
    + line('B', 'sch-an-diff-fill-b', row.bValue, row.bText)
    + '</div>').join('') + '</div>';
}

/** 差值取色（涨绿降红平灰，与老侧 `build_diff_table` 的 `color` 同一条口径）。 */
function toneColor(tone: DiffBarInput['tone']): string {
  if (tone === 'up') return COLOR_UP;
  if (tone === 'down') return COLOR_DOWN;
  return COLOR_FLAT;
}

/* ─────────────────────────── ② 7 维雷达 ─────────────────────────── */

export interface RadarDimInput {
  readonly label: string;
  /** 当前段的日均分钟数。 */
  readonly current: number;
  /** 基线段的日均分钟数。 */
  readonly baseline: number;
}

export interface RadarInput {
  readonly dims: readonly RadarDimInput[];
  readonly currentLabel: string;
  readonly baselineLabel: string;
  /** 图上那一行的读法（两圈各是什么）。 */
  readonly caption: string;
}

/** 七维雷达：一张多边形图，两个面＝当前段与基线段。少于三维不出（画不成面）。 */
export function renderRadar(input: RadarInput): string {
  const n = input.dims.length;
  if (n < 3) return '';
  const max = Math.max(1, ...input.dims.map((d) => Math.max(d.current, d.baseline)));
  const angle = (i: number): number => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const at = (i: number, ratio: number, radius: number): string =>
    (RADAR_CX + radius * ratio * Math.cos(angle(i))).toFixed(1) + ','
    + (RADAR_CY + radius * ratio * Math.sin(angle(i))).toFixed(1);
  const rings = RADAR_RINGS.map((ratio) => '<polygon class="sch-an-radar-ring" points="'
    + input.dims.map((_, i) => at(i, ratio, RADAR_R)).join(' ') + '"/>').join('');
  const axes = input.dims.map((dim, i) => {
    const a = angle(i);
    const x = (RADAR_CX + RADAR_R * Math.cos(a)).toFixed(1);
    const y = (RADAR_CY + RADAR_R * Math.sin(a)).toFixed(1);
    const lx = (RADAR_CX + (RADAR_R + RADAR_LABEL_GAP) * Math.cos(a)).toFixed(1);
    const ly = (RADAR_CY + (RADAR_R + RADAR_LABEL_GAP) * Math.sin(a)).toFixed(1);
    return '<line class="sch-an-radar-axis" x1="' + String(RADAR_CX) + '" y1="' + String(RADAR_CY)
      + '" x2="' + x + '" y2="' + y + '"/>'
      + '<text class="sch-an-radar-label" x="' + lx + '" y="' + ly + '">' + esc(dim.label) + '</text>';
  }).join('');
  const face = (pick: (dim: RadarDimInput) => number, cls: string): string =>
    '<polygon class="' + cls + '" points="'
    + input.dims.map((dim, i) => at(i, pick(dim) / max, RADAR_R)).join(' ') + '"/>';
  return '<figure class="sch-an-radar">'
    + '<svg class="sch-an-radar-svg" viewBox="0 0 ' + String(RADAR_W) + ' ' + String(RADAR_H)
    + '" role="img" aria-label="' + esc(input.caption) + '">'
    + rings
    + axes
    + face((dim) => dim.baseline, 'sch-an-radar-face-baseline')
    + face((dim) => dim.current, 'sch-an-radar-face-current')
    + '</svg>'
    + '<figcaption class="sch-an-radar-caption">' + esc(input.caption) + '</figcaption>'
    + '</figure>';
}

/* ─────────────────────────── ③ 红框与黄框的异常条目 ─────────────────────────── */

export interface AnomalyFrameInput {
  readonly level: 'red' | 'yellow';
  /** 一条框的第一行（这一维怎么了）。 */
  readonly headline: string;
  /** 一条框的第二行（读数与怎么读）。 */
  readonly detail: string;
}

/** 红框（过两成）与黄框（过一成）的条目列表；一条都没有＝一行空态文案（不留空壳）。 */
export function renderAnomalyFrames(items: readonly AnomalyFrameInput[], emptyText: string): string {
  if (items.length === 0) {
    return '<p class="sch-an-empty">' + esc(emptyText) + '</p>';
  }
  return '<div class="sch-an-frames">' + items.map((item) => {
    const red = item.level === 'red';
    return '<div class="sch-an-frame ' + (red ? 'sch-an-frame-red' : 'sch-an-frame-yellow') + '">'
      + '<div class="sch-an-frame-head">'
      + '<span class="sch-an-frame-badge">' + (red ? '红框' : '黄框') + '</span>'
      + '<span class="sch-an-frame-title">' + esc(item.headline) + '</span>'
      + '</div>'
      + '<div class="sch-an-frame-detail">' + esc(item.detail) + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

/* ─────────────────────────── 样式唯一产出者 ─────────────────────────── */

/** 本处族级件的样式（只对用上它们的页面有作用）。
 *  颜色只取冻结 token 与 `CHART_PALETTE`；长度只取上面那组常量——本串里不出现 `px` 字面量。 */
export function analyzePartsCss(): string {
  return [
    '/* #789 分析与洞察域·族级件（断点只用仓内既有值 820） */',
    '.sch-an-h2 { margin: 0 0 ' + px(GAP) + '; font-size: ' + px(FS_TITLE) + '; font-weight: 600; color: var(--fg); }',
    '.sch-an-note { margin: 0 0 ' + px(GAP) + '; color: var(--fg2); font-size: ' + px(FS_BODY) + '; line-height: 1.7; }',
    '.sch-an-empty { margin: 0; padding: ' + px(PAD_Y) + ' ' + px(PAD_X) + '; border: ' + px(HAIRLINE) + ' solid var(--line);',
    '  border-left: ' + px(RAIL) + ' solid var(--fg3); border-radius: ' + px(FRAME_RADIUS) + '; background: var(--soft);',
    '  color: var(--fg2); font-size: ' + px(FS_BODY) + '; line-height: 1.7; }',
    '/* ① 7 维差异柱 */',
    '.sch-an-diff { display: flex; flex-direction: column; gap: ' + px(ROW_GAP) + '; margin: 0 0 ' + px(GAP) + '; }',
    '.sch-an-diff-item { padding: ' + px(PAD_Y) + ' ' + px(PAD_X) + '; border: ' + px(HAIRLINE) + ' solid var(--line);',
    '  border-radius: ' + px(RADIUS) + '; background: var(--card); }',
    '.sch-an-diff-head { display: flex; align-items: baseline; justify-content: space-between; gap: ' + px(GAP) + ';',
    '  margin-bottom: ' + px(GAP) + '; }',
    '.sch-an-diff-name { color: var(--fg); font-size: ' + px(FS_BODY) + '; font-weight: 600; }',
    '.sch-an-diff-delta { font-size: ' + px(FS_SMALL) + '; font-variant-numeric: tabular-nums; white-space: nowrap; }',
    // 第三栏取 `minmax(最小值, auto)`：读数串长了自己长，柱子那栏跟着缩——不靠 nowrap 顶出容器外
    // （`nowrap` 的定宽栏在窄屏是横向溢出的一条真路，出页门量的就是它）。
    '.sch-an-diff-line { display: grid; grid-template-columns: ' + px(TAG_W) + ' minmax(0, 1fr) minmax(' + px(DELTA_W) + ', auto);',
    '  align-items: center; gap: ' + px(GAP) + '; margin-top: ' + px(GAP) + '; }',
    '.sch-an-diff-tag { color: var(--fg3); font-size: ' + px(FS_TINY) + '; }',
    '.sch-an-diff-bar { display: block; height: ' + px(BAR_H) + '; border-radius: ' + px(BAR_RADIUS) + ';',
    '  background: var(--soft); overflow: hidden; }',
    '.sch-an-diff-bar i { display: block; height: 100%; border-radius: ' + px(BAR_RADIUS) + '; }',
    '.sch-an-diff-fill-a { background: ' + COLOR_A + '; }',
    '.sch-an-diff-fill-b { background: ' + COLOR_B + '; }',
    '.sch-an-diff-val { color: var(--fg2); font-size: ' + px(FS_TINY) + '; text-align: right;',
    '  font-variant-numeric: tabular-nums; white-space: nowrap; }',
    '/* ② 7 维雷达 */',
    '.sch-an-radar { margin: 0; }',
    '.sch-an-radar-svg { display: block; width: 100%; max-width: ' + px(RADAR_MAX_W) + '; height: auto; margin: 0 auto; }',
    '.sch-an-radar-ring, .sch-an-radar-axis { fill: none; stroke: var(--line); }',
    '.sch-an-radar-ring { stroke-width: ' + String(STROKE_HAIRLINE) + '; }',
    '.sch-an-radar-axis { stroke-width: ' + String(STROKE_HAIRLINE) + '; }',
    '.sch-an-radar-label { fill: var(--fg2); font-size: ' + px(FS_TINY) + '; text-anchor: middle; }',
    '.sch-an-radar-face-baseline { fill: var(--fg3); fill-opacity: ' + String(OPACITY_BASE) + '; stroke: var(--fg3); stroke-width: ' + String(STROKE_FILL) + '; }',
    '.sch-an-radar-face-current { fill: var(--blue); fill-opacity: ' + String(OPACITY_CURVE) + '; stroke: var(--blue); stroke-width: ' + String(STROKE_CURVE) + '; }',
    '.sch-an-radar-caption { margin: ' + px(GAP) + ' 0 0; color: var(--fg2); font-size: ' + px(FS_SMALL) + '; text-align: center; }',
    '/* ③ 红框与黄框 */',
    '.sch-an-frames { display: flex; flex-direction: column; gap: ' + px(GAP) + '; }',
    '.sch-an-frame { padding: ' + px(PAD_Y) + ' ' + px(PAD_X) + '; border: ' + px(HAIRLINE) + ' solid var(--line);',
    '  border-radius: ' + px(FRAME_RADIUS) + '; background: var(--soft); }',
    '.sch-an-frame-red { border-left: ' + px(RAIL) + ' solid ' + COLOR_RED + '; }',
    '.sch-an-frame-yellow { border-left: ' + px(RAIL) + ' solid ' + COLOR_B + '; }',
    '.sch-an-frame-head { display: flex; align-items: baseline; gap: ' + px(GAP) + '; }',
    '.sch-an-frame-badge { font-size: ' + px(FS_TINY) + '; font-weight: 600; color: var(--fg2);',
    '  border: ' + px(HAIRLINE) + ' solid var(--line); border-radius: ' + px(FRAME_RADIUS) + '; padding: 0 ' + px(GAP) + '; }',
    '.sch-an-frame-red .sch-an-frame-badge { color: ' + COLOR_RED + '; }',
    '.sch-an-frame-yellow .sch-an-frame-badge { color: ' + COLOR_B + '; }',
    '.sch-an-frame-title { color: var(--fg); font-size: ' + px(FS_BODY) + '; font-weight: 600; }',
    '.sch-an-frame-detail { margin-top: ' + px(GAP) + '; color: var(--fg2); font-size: ' + px(FS_SMALL) + '; line-height: 1.7; }',
    '@media (max-width: ' + px(NARROW) + ') {',
    '  .sch-an-diff-val { font-size: ' + px(FS_TINY) + '; }',
    '}',
  ].join(LF);
}
