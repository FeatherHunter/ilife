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
    // 逐格段里的组头：把一长串裸数字按部位分家（值那一列本来就有单位口径，组头再点一次）。
    + '.brc-h3{font-size:12px;font-weight:600;color:var(--fg3);margin:14px 0 2px}'
    // ── 键值行收窄：公共层的行是「名字 ｜ 旧值 ｜ 箭位 ｜ 新值」四栏，值被推到整行最右边，
    //    一条行拉成一条长横杠（编排者视觉裁定第 3 条）。本页把箭位与空槽让掉、名字槽定宽，
    //    值紧跟名字左边起排——两列排布，眼睛不用横着走一整行。 ──
    + '.ilife-block-change-row{display:flex;gap:0 14px;align-items:baseline;justify-content:flex-start}'
    + '.ilife-block-change-row-label{flex:0 0 92px;font-size:12px;color:var(--fg3)}'
    + '.ilife-block-change-row-old:not(:empty),.ilife-block-change-row-new:not(:empty){flex:0 1 auto;font-size:14px}'
    + '.ilife-block-change-row-old:empty,.ilife-block-change-row-new:empty{display:none}'
    + '.ilife-block-change-row-arrow{display:none}'
    // ── 单位只留**组头**一处（编排者视觉复核：组头写了「（厘米）」，行里再写「厘米」＝
    //    同一事实两处说）。行里不带单位，也就没有那根读起来像负号的短横。 ──
    // ── 身份字段（日期／来源／体脂率／备注）不属于任何一个部位组：整行抬开一档、加一条细线，
    //    让「备注」这些行一眼落在组外。 ──
    + '.brc-meta{margin-top:14px;padding-top:10px;border-top:1px solid var(--line)}'
    // ── 两张表一眼分得开：上面「这次记下的」贴页走，下面「同一天还记过这条」整块浅底＋描边 ──
    + '.brc-alt{margin-top:16px;padding:12px 14px;background:var(--soft);border:1px solid var(--line);border-radius:14px}'
    + '.brc-now{margin-bottom:4px}'
    // 复制区两颗按钮：公共层默认让它们均分整行（约半宽 480px，看着像胶囊条不像按钮）——
    // 本页就地收窄成贴合文字的自宽按钮（触摸区 44px 由页尾兜底条保证）。
    + '.ilife-copy-menu-wrap{width:auto;justify-self:start}'
    + '.ilife-copy-btn{width:auto;min-width:0;justify-self:start;padding-left:18px;padding-right:18px}'
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

/** 逐格段里的组头（「躯干（厘米）」「左右成对（厘米）」「皮褶读数（毫米）」这类）：
 *  一长串裸数字按部位分家，值和它的单位在同一行。它**只插在行与行之间**，不动行序。 */
export function groupHead(text: string): string {
  return '<h3 class="brc-h3">' + esc(text) + '</h3>';
}
