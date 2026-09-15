/** #537 · 身体细节**写后回执**族（七条写词：记体脂两种／记围度／补记两种／删体脂／删围度）的
 *  页内形状件。形状照同仓同族先例 `photo/receiptUi.ts`（#528）抄：**本件只给容器与窄屏收口**，
 *  块本身一律走公共层（`renderChips`／`renderDataTable`／`renderChangeRows`／`renderKpiGrid`），
 *  **不重写公共层任何一条**，也不新造可跨域复用的形状。
 *
 *  —— 这一族为什么需要一条页内形状 ——
 *  「这次写进去的字段」（老页把 12 项压成 `日期、来源、体脂率、年龄、性别、胸、腹…` 一整行
 *  文字，`、` 串就是设计债）改成**徽章列**：名字槽 ＋ 一排小标签，两项都不靠分隔符分家。
 *
 *  —— 手机端口径 ——
 *  `pageUi: true`（#525 的页面级配方）已经给了 `viewport-fit=cover`／安全区／820 档 44px 触摸区／
 *  640 档字号下限与读数卡两格／**表格卡片化**（`td[data-label]`）。本件只补它管不到的两处：
 *  ① 卡片化后每格的列头（`td::before`）公共层写 `11.5px`，抬到 HELP 同档的 **12px**；
 *  ② 折叠块摘要与复制按钮的触摸区在 1440 档仍可能不足 44px——本页就地兜到 44px。
 *  断点只用仓内既有值（**640／400**），不新造。
 */
import { escapeHtml } from 'base-paint';
import { renderChips } from 'base-paint/blocks';

const esc = (s: string): string => escapeHtml(s);

/** 页内样式串（`<style>`；`assembleDocPage` 没有页内 CSS 入口，由调用方放在 `content` 第一项）。 */
export function bodyReceiptCss(): string {
  return '<style>'
    // 名字槽 ＋ 徽章列一行：名字槽与逐格行的标签列同宽，徽章自己折行（不挤成一串）。
    + '.brc-labeled{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin:0 0 14px}'
    + '.brc-k{flex:0 0 88px;font-size:12px;color:var(--fg3)}'
    // 640 档：卡片化后每格的列头抬到 12px（与 HELP 页同档的下限），表头与单元格一起抬。
    + '@media (max-width: 640px){'
    + '.ilife-block-data-table th,.ilife-block-data-table td{font-size:12px}'
    + '.ilife-block-data-table td::before{font-size:12px}'
    + '}'
    // 400 档（既有断点）：名字槽收紧，别把徽章挤到第二行只留半个。
    + '@media (max-width: 400px){.brc-k{flex-basis:72px}}'
    // 触摸区：本页自有的可点元素是折叠块摘要与页尾复制按钮（公共层的），兜到 44px。
    + '.ilife-block-disclosure-summary,.ilife-copy-btn,.ilife-copy-menu-item{min-height:44px}'
    + '</style>';
}

/** 「名字 ＋ 徽章列」一行：并列小标签（这次写进去的字段）不再串成 `A、B、C`。
 *  空表＝空串（没内容不留空壳）；名字槽只出空串时也整行不出。 */
export function labeledChips(label: string, items: readonly string[]): string {
  if (label === '') return '';
  const kept = items.filter((s) => s !== '');
  if (kept.length === 0) return '';
  return '<div class="brc-labeled"><span class="brc-k">' + esc(label) + '</span>'
    + renderChips({ items: kept.map((text) => ({ text })) }) + '</div>';
}
