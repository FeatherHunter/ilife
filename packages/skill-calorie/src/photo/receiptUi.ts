/** #528 窄席位 A · 身材照片**写后回执**族的页内形状件（本件是唯一产出者）。
 *
 * 与读侧的 `photoUi.ts` 同族不同件：读侧四页要卡片格与观看舞台，回执页要的是
 * 「**一处说清**（反馈条）＋ 其余只给形状（徽章列／键值行／读数卡／逐张结果行）」。两份
 * 件同用 `.phu-`／`.phr-` 两套前缀，互不覆盖；形状本身一律走公共层件
 * （`renderChips`／`renderListRows`／`renderFeedbackBlock`），本件只给容器与窄屏收口，
 * **不重写公共层任何一条**。
 *
 * —— 分隔符债为什么必须靠形状还（用户第 5 条，逐字）——
 * 「当一个内容需要通过「；」和「·」分割时代表需要进行 UI 上的设计，该问题是用这些符号
 *  简化了 UI 展示的设计。」判据是 `scripts/audit-separators.mjs` 的**节点级命中全零**：
 *  于是「编号 36 · 2026-09-15 · 正面」这类串一律拆成各自独立的节点——键值行拆名字与值、
 *  并列小标签走徽章列、逐张结果走列表行的左／中／右三槽。**同一段可见文本里既不留
 *  `·`／`、`／`；`，也不留 `#36` 这种带井号的编号**（`#N` 是票号形状，读者看到的是照片号）。
 *
 * —— 手机端口径（脚本 #525 的 `pageUi` 位已在页上，本件只补它管不到的三件）——
 *  ① 逐张结果行：公共层给的是 `44px` 标记列 ＋ `nowrap` 截断——390px 上「编号 36」会被
 *     切成「编号 3…」。本件把首列改 `auto`、中槽改可换行，文件名的每一段都看得全；
 *  ② 结果分组：存好的与没存进来的分两块，右侧槽按色档上色（成功绿／失败红），失败块
 *     整块淡红底——**三态不靠一个字说明，靠颜色与分组本身就是形状**；
 *  ③ 删除快照：图与键值行同住一块，图自带浅底圆角舞台（宽高比交给图自己的
 *     `max-height` ＋ `width:auto`，不写死比例免得竖图被裁）。
 *  窄屏数字一律走 `@media (max-width: 400px)`（既有断点，不新造值）。
 */

import { escapeHtml } from 'base-paint';
import { renderChips } from 'base-paint/blocks';

const esc = (s: string): string => escapeHtml(s);

/** 键值行的一行：左名字、右值（两个槽都当纯文本，形状不落进值槽）。 */
export interface ReceiptFact {
  readonly k: string;
  readonly v: string;
}

/** 页内样式串（`<style>`，由调用方放在 `parts` 第一项——`assembleDocPage` 没有页内 CSS 入口）。 */
export function receiptUiCss(): string {
  return '<style>'
    // ── 徽章列：回执类型（存入／删除／变更）——并排小标签，不是一串 `·` 拼出来的话 ──
    + '.phr-chips{margin:0 0 14px}'
    // ── 键值行：「名字 ＋ 值」一行一件事；窄屏名字槽不挤值 ──
    + '.phr-facts{margin:0 0 14px}'
    + '.phr-fact{display:flex;gap:12px;align-items:baseline;padding:7px 0;border-top:1px solid var(--line);min-width:0}'
    + '.phr-fact:first-child{border-top:0;padding-top:0}'
    + '.phr-fk{flex:0 0 76px;font-size:12px;color:var(--fg3)}'
    + '.phr-fv{font-size:14px;color:var(--fg);min-width:0;overflow-wrap:anywhere}'
    // ── 警示块的判语抬成主角：这一族页面上最要紧的一句话是「永久删除，无法恢复」，
    //    公共层的静态提示把标题与详情压在同一个字号上，警示就被正文淹了（`:has` 既有选择器，
    //    只在本族两页的样式段里出现，不越位到别页）。 ──
    + '.ilife-block-feedback-block:has(.ilife-block-feedback-block-note-icon-warn) '
    + '.ilife-block-feedback-block-note-title{font-size:16px;font-weight:700;line-height:1.45}'
    // ── 「名字 ＋ 徽章列」一行：名字槽与键值行同名槽对齐，徽章自己折行 ──
    + '.phr-labeled{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin:0 0 10px}'
    + '.phr-labeled .phr-fk{flex:0 0 76px}'
    // ── 小节标题：正文里的分组线索（「逐张结果」这种），不是又一行正文 ──
    + '.phr-h2{font-size:13px;font-weight:600;color:var(--fg2);margin:18px 0 8px}'
    // ── 逐张结果：一张一块（图 ＋ 三槽列表行）——成功绿、失败红与淡红底就是「三态」的形状 ──
    + '.phr-shot{margin:0 0 12px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card)}'
    + '.phr-shot img{display:block;margin:0 auto;background:var(--soft)}'
    + '.phr-shot .ilife-block-list-rows{margin:0;border:0;border-radius:0;background:transparent}'
    + '.phr-shot .ilife-block-list-rows-row{grid-template-columns:auto minmax(0,1fr) auto;gap:8px 12px;padding:9px 12px}'
    + '.phr-shot .ilife-block-list-rows-row-no-left{grid-template-columns:minmax(0,1fr)}'
    + '.phr-shot .ilife-block-list-rows-left{white-space:nowrap}'
    + '.phr-shot .ilife-block-list-rows-main{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}'
    + '.phr-shot .ilife-block-list-rows-right{color:var(--ok);font-weight:600}'
    + '.phr-shot-fail{background:rgba(255,59,48,.05);border-color:rgba(255,59,48,.35)}'
    + '.phr-shot-fail .ilife-block-list-rows-right{color:#ff3b30;font-weight:600}'
    + '.phr-shot-miss{padding:14px 12px;text-align:center;color:var(--fg3);font-size:12px;background:var(--soft)}'
    // ── 删除快照舞台：图居中、浅底、圆角；图自己带 `max-height` 与 `width:auto`，不写死比例 ──
    + '.phr-shot-stage{display:flex;align-items:center;justify-content:center;background:var(--soft);'
    + 'border:1px solid var(--line);border-radius:14px;padding:10px;overflow:hidden}'
    + '.phr-shot-stage img{display:block;border-radius:8px}'
    // ── 640 档：表头与单元格抬到 HELP 同档的字号下限（12px）。公共层表头是 11px（§3.2 点的
    //    就是 `th.ilife-block-data-table-cell-*`），卡片化后每格的列头也走 `td::before`，一抬一起抬。
    + '@media (max-width: 640px){'
    + '.ilife-block-data-table th,.ilife-block-data-table td{font-size:12px}'
    + '.ilife-block-data-table td::before{font-size:12px}'
    + '}'
    // ── 标签对照（09-10／11／12）：列头与公共层 `renderChangeRows` 的四栏同轨（名字／旧值／箭位／
    //    新值），窄屏旧值在上、新值在下，箭位让位——把「一行四栏」收成「一列两行」，不必横滚。 ──
    + '.phr-tags{margin:0 0 14px}'
    + '.phr-tags .ilife-block-change-row,'
    + '.phr-tags-head{display:grid;grid-template-columns:3.6em minmax(0,1fr) 1.4em minmax(0,1fr);'
    + 'gap:0 10px;align-items:baseline;padding:7px 0;border-top:1px solid var(--line)}'
    + '.phr-tags .ilife-block-change-row:first-child,.phr-tags-head:first-child{border-top:0}'
    + '.phr-tags-head{font-size:12px;color:var(--fg3)}'
    + '.phr-tags .ilife-block-change-row-label{font-size:12px;color:var(--fg3);min-width:0}'
    + '.phr-tags .ilife-block-change-row-old,.phr-tags .ilife-block-change-row-new{font-size:14px;min-width:0;overflow-wrap:anywhere}'
    + '.phr-tags .ilife-block-change-row-arrow{font-size:14px}'
    // ── 640 档：表头与单元格抬到 HELP 同档的字号下限（12px）。公共层表头是 11px（§3.2 点的
    //    就是 `th.ilife-block-data-table-cell-*`），卡片化后每格的列头也走 `td::before`，一抬一起抬。
    + '@media (max-width: 640px){'
    + '.ilife-block-data-table th,.ilife-block-data-table td{font-size:12px}'
    + '.ilife-block-data-table td::before{font-size:12px}'
    + '}'
    // ── 400 档（既有断点）：名字槽与行内距收紧；标签对照改「一列两行」——状态词一列、
    //    旧值与新值各占一行、箭位隐去（字符会撞在一起，位置说清顺序比箭头清楚）。 ──
    + '@media (max-width: 400px){'
    + '.phr-fk{flex-basis:64px}'
    + '.phr-shot .ilife-block-list-rows-row{gap:6px 8px;padding:8px 10px}'
    + '.phr-tags .ilife-block-change-row,.phr-tags-head{grid-template-columns:3.4em minmax(0,1fr);'
    + 'gap:2px 10px;padding:8px 0}'
    + '.phr-tags-head{padding-bottom:0}'
    + '.phr-tags-head .phr-tags-arrow{display:none}'
    + '.phr-tags .ilife-block-change-row-label{grid-column:1;grid-row:1/span 2}'
    + '.phr-tags .ilife-block-change-row-old{grid-column:2;grid-row:1}'
    + '.phr-tags .ilife-block-change-row-new{grid-column:2;grid-row:2}'
    + '.phr-tags .ilife-block-change-row-arrow{display:none}'
    + '}'
    // ── 触摸区：本页自有的可点元素两颗（页尾复制按钮与复制菜单项，公共层的）＋折叠块摘要。
    //    公共层的 820 档配方只管窄屏，1440 档仍是 40px（§3.2 点名的 5～49 处）——本页就地兜到
    //    44px，公共层同款规则落地后这两条是空操作，不影响别页。
    + '.ilife-copy-btn,.ilife-copy-menu-item,.ilife-block-disclosure-summary{min-height:44px}'
    + '</style>';
}

/** 徽章列（回执类型这类并列小标签）：空表＝空串（没内容不留空壳）。 */
export function chipRow(items: readonly string[]): string {
  const kept = items.filter((s) => s !== '');
  if (kept.length === 0) return '';
  return '<div class="phr-chips">' + renderChips({ items: kept.map((text) => ({ text })) }) + '</div>';
}

/** 键值行块：`[{k:'编号',v:'36'}, …]`；值为空串的行不出（不印空格子）。 */
export function factRows(rows: readonly ReceiptFact[]): string {
  const body = rows
    .filter((r) => r.v !== '')
    .map((r) => '<div class="phr-fact"><span class="phr-fk">' + esc(r.k) + '</span>'
      + '<span class="phr-fv">' + esc(r.v) + '</span></div>')
    .join('');
  return body === '' ? '' : '<div class="phr-facts">' + body + '</div>';
}

/** 「名字 ＋ 徽章列」一行：并列小标签（标签／状态词）不再串成 `A、B、C`。 */
export function labelChips(label: string, items: readonly string[]): string {
  const kept = items.filter((s) => s !== '');
  if (kept.length === 0) return '';
  return '<div class="phr-labeled"><span class="phr-fk">' + esc(label) + '</span>'
    + renderChips({ items: kept.map((text) => ({ text })) }) + '</div>';
}

/** 小节标题（「逐张结果」／「删除前的样子」）。 */
export function sectionTitle(text: string): string {
  return '<h2 class="phr-h2">' + esc(text) + '</h2>';
}

/** 逐张结果的一块（`ok`／`fail` 只决定色档，**不额外印一个字**）：图 ＋ 这一张的三槽列表行。 */
export function shotBlock(tone: 'ok' | 'fail', inner: string): string {
  if (inner === '') return '';
  return '<figure class="phr-shot' + (tone === 'fail' ? ' phr-shot-fail' : '') + '">' + inner + '</figure>';
}
