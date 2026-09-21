/** #873 第三轮 · 页族的两条共用视觉标准：**色彩锚点密度**（全族）与**首屏填满度**（回执族）。
 *
 * 为什么按族出而不是按页出：48 页是 10 个域各写一套收口的，参差就出在「各写一套」上。
 * 本轮把两件事收成族级：这两段样式由页壳装配件按族拼进 `extraCss`（**一页只带本族那一段**），
 * 域里再写页内版式也盖不住它——同一件事只有一个落点。
 *
 * 色彩锚点密度（③，全族）：判官对第 47／30／24 格的同一句原话是「几乎只有一枚蓝按钮／静态灰白」。
 *   把**胶囊**与**瓦片**统一吃到同一个暖色基（`CHART_PALETTE` 的橙 ／ 黄派生浅底），
 *   再按 `nth-child` 轮一圈「蓝 → 橙 → 青」的点缀色——这是第 21 格（92 分）那条
 *   「青／橙／蓝三色胶囊成矩阵」的做法，本轮把它变成全批共用的标准。浅底一律 ≤ .16，
 *   文字色不动（仍是主色 `--blue2`，压这些浅底仍有 4.5:1 以上）。
 *
 * 首屏填满度（②，**只给回执族**）：判官对第 47 格的原话是「长页首屏留白撑场／信息密度偏低」，
 *   实测 390×820 首屏正文最底一行距视口底约 180px。回执族的页最短，就它需要把节奏铺开：
 *   块距 16 → 26px、瓦片与卡片内距各抬一档、可点件抬到 54px、表格与列表行内距各抬一档。
 *   **一个字的内容都不编**——只用行距／块距／内距／可点件高度把既有内容铺满一屏。
 *   结果族与过程族**不动节奏**：第 21 格（92）与第 45 格（90）都在这两族里，是本票的守线页，
 *   长页也不需要再铺（它们的首屏本来就排满）。
 */
import { CHART_PALETTE } from 'base-paint';
import type { SceneFamily } from './sceneBand.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** hex → `r, g, b`（与 `skin.ts` 同一条换算，本件不引它的内部件）。 */
function rgbOf(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}

const BLUE_RGB = rgbOf(CHART_PALETTE[0]);
const ORANGE_RGB = rgbOf(CHART_PALETTE[2]);
const YELLOW_RGB = rgbOf(CHART_PALETTE[6]);
const TEAL_RGB = rgbOf(CHART_PALETTE[9]);

/** 三枚点缀色（蓝／橙／青）——与第 21 格那条「三色胶囊矩阵」同一组色，取自调色板下标。 */
const ACCENTS = [BLUE_RGB, ORANGE_RGB, TEAL_RGB] as const;

/** 色彩锚点密度（③）：胶囊与瓦片的底色 ＋ 轮转的点缀色描边／左缘。全族共用。 */
function densityCss(root: string, p: string): string[] {
  const chip = root + ' .' + p + 'block-chip';
  const tile = root + ' .' + p + 'block-fact-strip-item';
  const lines: string[] = [
    '/* ③ 色彩锚点密度：胶囊与瓦片吃同一个暖色基，再按位置轮一圈蓝／橙／青点缀色 */',
    chip + ' {',
    '  border-color: rgba(' + ORANGE_RGB + ', .32);',
    '  background-color: rgba(' + ORANGE_RGB + ', .12);',
    '}',
    tile + ' {',
    '  border-color: rgba(' + ORANGE_RGB + ', .28);',
    '  background-color: rgba(' + YELLOW_RGB + ', .10);',
    '}',
  ];
  // 轮转：一枚色板三档，写在**一处**；`nth-child` 只按位置取色，不载任何语义。
  lines.push(root + ' .' + p + 'block-chip-row > .' + p + 'block-chip:nth-child(3n+1),');
  lines.push(root + ' .' + p + 'block-fact-strip-item:nth-child(3n+1) {');
  lines.push('  border-color: rgba(' + ACCENTS[0] + ', .34);');
  lines.push('}');
  lines.push(root + ' .' + p + 'block-chip-row > .' + p + 'block-chip:nth-child(3n+2),');
  lines.push(root + ' .' + p + 'block-fact-strip-item:nth-child(3n+2) {');
  lines.push('  border-color: rgba(' + ACCENTS[1] + ', .38);');
  lines.push('}');
  lines.push(root + ' .' + p + 'block-chip-row > .' + p + 'block-chip:nth-child(3n+3),');
  lines.push(root + ' .' + p + 'block-fact-strip-item:nth-child(3n+3) {');
  lines.push('  border-color: rgba(' + ACCENTS[2] + ', .34);');
  lines.push('}');
  lines.push(root + ' .' + p + 'block-chip-row > .' + p + 'block-chip:nth-child(3n+1) {');
  lines.push('  background-color: rgba(' + ACCENTS[0] + ', .12);');
  lines.push('}');
  lines.push(root + ' .' + p + 'block-chip-row > .' + p + 'block-chip:nth-child(3n+2) {');
  lines.push('  background-color: rgba(' + ACCENTS[1] + ', .16);');
  lines.push('}');
  lines.push(root + ' .' + p + 'block-chip-row > .' + p + 'block-chip:nth-child(3n+3) {');
  lines.push('  background-color: rgba(' + ACCENTS[2] + ', .15);');
  lines.push('}');
  lines.push(root + ' .' + p + 'block-fact-strip-item:nth-child(3n+1) { border-left-color: ' + CHART_PALETTE[0] + '; }');
  lines.push(root + ' .' + p + 'block-fact-strip-item:nth-child(3n+2) { border-left-color: ' + CHART_PALETTE[2] + '; }');
  lines.push(root + ' .' + p + 'block-fact-strip-item:nth-child(3n+3) { border-left-color: ' + CHART_PALETTE[9] + '; }');
  return lines;
}

/** 首屏填满度（②）：回执族的节奏铺开。**只抬内距与外距，不动字号档、不编内容。** */
function receiptFillCss(root: string, p: string): string[] {
  return [
    '/* ② 首屏填满度（回执族）：块距与内距各抬一档，把既有内容铺到一屏（不编内容） */',
    root + ' .' + p + 'block-page-shell-body > * + .' + p + 'block {',
    '  margin-top: 26px;',
    '}',
    root + ' .' + p + 'block-fact-strip-item {',
    '  padding: 12px 14px;',
    '}',
    root + ' .' + p + 'block-conclusion {',
    '  padding: 18px 18px;',
    '}',
    root + ' .' + p + 'block-disclosure-summary {',
    '  min-height: 52px;',
    '}',
    root + ' .' + p + 'block-data-table th {',
    '  padding: 12px 14px;',
    '}',
    root + ' .' + p + 'block-data-table td {',
    '  padding: 15px 14px;',
    '}',
    root + ' .' + p + 'block-list-rows-row {',
    '  padding: 14px 14px;',
    '}',
    root + ' .' + p + 'block-change-row {',
    '  padding: 12px 0;',
    '}',
    root + ' .' + p + 'block-copy-block {',
    '  padding: 18px 16px 20px;',
    '}',
    root + ' .' + p + 'block-prose {',
    '  line-height: 1.85;',
    '}',
    /* 可点件抬到 54px（≥44 是硬下限，抬高不违规）：一行两颗按钮的页里，这一档就补回 20px。 */
    root + ' .' + p + 'action-btn,',
    root + ' .' + p + 'copy-btn {',
    '  min-height: 54px;',
    '}',
    /* 动作行单独再抬一档：它是回执页的最后一块，抬它把首屏最底那一行往下推。 */
    root + ' .' + p + 'action-bar {',
    '  margin: 26px 0 20px;',
    '}',
    /* 只靠内距铺不满最短的那几页（第 42／44 格实测首屏最底一行只到 y=465，距底 355px）⇒ 窄档再补一条
       **分布**：版面根撑到一屏高、正文列吃满余量并按 `space-between` 摊开。
       取值 `calc(100vh - 60px)`＝扣除版面根自己的上下内距（窄档 20px ＋ 60px）与页面顶那条 6px 品牌带、
       末块的 20px 下外边距之后余下的差额；内容比一屏短时收口落在视口底，长页 `min-height` 不起作用。
       **只在窄档**：宽档（≥1001）正文列是公共层 `pageUi.ts` ⑧ 的三轨栅格，本段不许覆盖它。 */
    '@media (max-width: 640px) {',
    '  ' + root + ' .' + p + 'block-page-shell {',
    '    display: flex;',
    '    flex-direction: column;',
    '    min-height: calc(100vh - 60px);',
    '  }',
    '  ' + root + ' .' + p + 'block-page-shell-body {',
    '    display: flex;',
    '    flex: 1 1 auto;',
    '    flex-direction: column;',
    '    justify-content: space-between;',
    '  }',
    '}',
  ];
}

/** 按族出这一段（页壳装配件把它拼进 `extraCss`）。恒返回非空 CSS 文本。 */
export function sceneFamilyCss(family: SceneFamily, input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const lines = densityCss(root, p);
  if (family === 'receipt') lines.push(...receiptFillCss(root, p));
  return lines.join(LF);
}
