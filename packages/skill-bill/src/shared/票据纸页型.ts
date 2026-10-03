/** 票据纸页型（**三份块位序列**：采集页／回执页／列表页）——账户与目标两域十三张页的唯一版式住所。
 *
 * 谁在用（两个能力，指名）：`src/account/`（账户表单页型、改账户页型、账户汇总页型）与
 *  `src/goal/`（设定表单页型、进度视图页型）——五件模板件都只给差异值（值、文案、哪一块出不出），
 *  块位拼装一律走本件；改一次版式只动本件一处，十三张页同时跟着改。
 *
 * **为什么住 `src/shared/`**：本件是「同一形状的第二个能力用上之后长出来的共用件」——
 *  账户域与目标域语义上互不依赖，谁引谁都会长出一条跨能力直引的债（#1082 已记过一条同型的）；
 *  两个能力都要用，落点只能是共用位。十三张页的判地＝`docs/skills/skill-bill/proto/acct-goal/` 十三件
 *  v2.2 原型（只作判据、不作模板）。
 *
 * **家具只用既有导出**（票面口径）：纸走 `renderSheetFrame`（`variant: 'ticket'`，页尾那一行「✂ 裁切线」
 *  由它的 `cutLineText` 出），店头／虚线／段／主数字／按钮区走 `./docPage.js` 的
 *  `sheetHead`／`ticketRule`／`ticketSection`／`ticketSummary`／`ticketActions`，
 *  账目行走公共层 `renderLedgerRows({ layout: 'ticket' })`，主数字走 `renderSummaryHead({ layout: 'ticket' })`，
 *  页内导航与区块锚点走 `./pageSections.js`，机器标记走 `./writeParts.js` 的 `writeSection`，
 *  整页外壳走 `./docPage.js` 的 `assembleSheetPage`。**本件不出第二条样式通道**：
 *  颜色、圆角、内距一律由皮肤与 `assembleSheetPage` 那三段共用样式给（页面自抄一份＝把皮肤保真重做 N 遍）。
 *
 * 三份块位序列（● 恒出、○ 有内容才出）：
 *   采集页（过程型 ①）：店头 ● → 虚线 → 主数字（待补槽位）● → 虚线 → 落点段 LEDGER ● → 虚线 →
 *     待填段 ENTRY ● → 虚线 → 对账段 CHECK ● → 来源脚注 ○ → 虚线 → 按钮区 ● → 纸外脚注 ●；**不出页内导航**。
 *   回执页（结果型 ④）：店头 ● → 虚线 → 主数字（已记好，带印章 ○）● → 虚线 → 落点段 LEDGER ● → 虚线 →
 *     页内导航 ● → 明细段 DETAIL ● → 虚线 → 对账段 CHECK ● → 来源脚注 ● → 虚线 → 按钮区 ● → 纸外脚注 ●。
 *   列表页（结果型 ⑥）：与回执页同序，中段换成结果块（读数行／占比条／各表，块数按页给）；纸型走 `detail`。
 */
import { escapeHtml } from 'base-paint';
import { renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from './docPage.js';
import { pageBody, pageNav } from './pageSections.js';
import type { PageBlock } from './pageSections.js';
import { writeSection } from './writeParts.js';

/** 主数字那一段的差异值（眉标药丸、主读数、单位、下面那句小字、右上角印章）。 */
export interface TicketSheetSummary {
  readonly eyebrow: string;
  readonly value: string;
  readonly unit?: string;
  readonly note?: string;
  /** 右上角那枚印章（回执页恒出「有效」；列表页与采集页不出）。 */
  readonly stamp?: string;
}

/** 落点账本的一行（标签 ＋ 值；值已是给人看的样子）。 */
export interface TicketSheetRow {
  readonly label: string;
  readonly value: string;
}

/** 三张页型共有的差异值。 */
interface TicketSheetCommon {
  readonly docTitle: string;
  /** 店头品牌行（如 `饼干记账 · 新增账户`）。 */
  readonly brand: string;
  /** 店头结论标题（受信文本，本件转义）。 */
  readonly title: string;
  /** 店头副题（空串＝不出那一行）。 */
  readonly subtitle: string;
  readonly summary: TicketSheetSummary;
  /** 落点段的段标题（如 `账户落点`；英文标恒 `LEDGER`）。 */
  readonly ledgerTitle: string;
  readonly ledger: readonly TicketSheetRow[];
  /** 对账段那一句（三分句用全角斜线分隔）。 */
  readonly check: string;
  /** 按钮区内容（复制区；由调用方给已装配好的标记）。 */
  readonly actions: string;
  /** 纸外脚注（如 `饼干记账 · 新增账户采集`）。 */
  readonly foot: string;
  /** 店头之后、主数字之前的裸块（类型徽章那一列；表序第 6 行「徽章列恒在最前」）。 */
  readonly headExtraHtml?: string;
  /** 对账段之后、按钮区之前的裸块（来源脚注那一行）。 */
  readonly tailHtml?: string;
  /** 页内样式段（本域自己的补充位；账户域与目标域的复制区 guards 走这一格）。 */
  readonly styleHtml?: string;
  readonly slot: 'receipt' | 'collect' | 'list';
  readonly page: 'receipt' | 'collect' | 'list';
  readonly shape: string;
  readonly key: string;
  readonly paper: 'receipt' | 'detail';
}

/** 采集页的差异值（中段是那张要填的表）。 */
export interface CollectSheetPageInput extends TicketSheetCommon {
  /** 中段段标题（如 `待填`）。 */
  readonly entryTitle: string;
  /** 中段英文标（`ENTRY`）。 */
  readonly entryTag: string;
  readonly entryHtml: string;
}

/** 结果型两张页（回执／列表）的差异值（中段是一串带锚点的块，既拼正文也派生页内导航）。 */
export interface ResultSheetPageInput extends TicketSheetCommon {
  /** 中段段标题（如 `明细`／`各账户余额`）。 */
  readonly detailTitle: string;
  readonly detailTag: string;
  readonly blocks: readonly PageBlock[];
}

/** 主数字那一段（眉标药丸 ＋ 主数字 ＋ 下面那句小字 ＋ 可选印章）。 */
function summaryHtmlOf(summary: TicketSheetSummary): string {
  const head = renderSummaryHead({
    eyebrow: summary.eyebrow,
    value: summary.value,
    ...(summary.unit === undefined ? {} : { unit: summary.unit }),
    ...(summary.stamp === undefined ? {} : { stamp: { text: summary.stamp, tone: 'ok' as const } }),
    layout: 'ticket',
  });
  const note = summary.note === undefined || summary.note === ''
    ? '' : '<p class="ilife-ticket-summary-note">' + escapeHtml(summary.note) + '</p>';
  return ticketSummary(head, note);
}

/** 落点那一段（账目行恒走票据纸版式：行间不画分隔线、行距 9px）。 */
function ledgerHtmlOf(title: string, rows: readonly TicketSheetRow[]): string {
  return ticketSection({
    title,
    tag: 'LEDGER',
    content: '<div class="ilife-block-ledger-rows is-ticket">'
      + renderLedgerRows({ rows: rows.map((r) => ({ label: r.label, value: r.value })), layout: 'ticket' }) + '</div>',
  });
}

/** 对账那一段（浅绿卡 ＋ 圆点 ＋ 一句；与查询域详情页同一枚标记）。 */
function checkHtmlOf(text: string): string {
  return ticketSection({
    title: '对账',
    tag: 'CHECK',
    content: '<div class="ilife-ticket-check"><span class="ilife-ticket-check-dot" aria-hidden="true"></span>'
      + '<span>' + escapeHtml(text) + '</span></div>',
  });
}

/** 纸外脚注那一行（与查询域详情页同字同枚）。 */
function footHtmlOf(text: string): string {
  return '<div class="ilife-ticket-foot">' + escapeHtml(text) + '</div>';
}

/** 三张页型共用的收口：纸 ＋ 机器标记段 ＋ 整页外壳。 */
function finish(input: TicketSheetCommon, parts: readonly string[]): string {
  const paper = renderSheetFrame({
    variant: 'ticket',
    cutLine: true,
    cutLineText: '✂ 裁切线',
    content: parts.join(''),
  });
  const section = writeSection({
    slot: input.slot, page: input.page, shape: input.shape, key: input.key,
    content: (input.styleHtml ?? '') + paper + footHtmlOf(input.foot),
  });
  return assembleSheetPage({ docTitle: input.docTitle, bodyHtml: section, paper: input.paper });
}

/** 采集页（过程型 ①）：店头 → 主数字 → 落点 → 待填 → 对账 → 脚注 → 按钮区；无页内导航。 */
export function collectSheetPage(input: CollectSheetPageInput): string {
  return finish(input, [
    sheetHead(input.brand, escapeHtml(input.title), input.subtitle),
    input.headExtraHtml ?? '',
    ticketRule(),
    summaryHtmlOf(input.summary),
    ticketRule(),
    ledgerHtmlOf(input.ledgerTitle, input.ledger),
    ticketRule(),
    ticketSection({ title: input.entryTitle, tag: input.entryTag, content: input.entryHtml }),
    ticketRule(),
    checkHtmlOf(input.check),
    input.tailHtml ?? '',
    ticketRule(),
    ticketActions(input.actions),
  ]);
}

/** 回执页（结果型 ④）：与采集页同序，落点之后插页内导航，中段是明细那一段。 */
export function receiptSheetPage(input: ResultSheetPageInput): string {
  return finish(input, [
    sheetHead(input.brand, escapeHtml(input.title), input.subtitle),
    input.headExtraHtml ?? '',
    ticketRule(),
    summaryHtmlOf(input.summary),
    ticketRule(),
    ledgerHtmlOf(input.ledgerTitle, input.ledger),
    ticketRule(),
    pageNav(input.blocks),
    ticketSection({ title: input.detailTitle, tag: input.detailTag, content: pageBody(input.blocks) }),
    ticketRule(),
    checkHtmlOf(input.check),
    input.tailHtml ?? '',
    ticketRule(),
    ticketActions(input.actions),
  ]);
}

/** 列表页（结果型 ⑥）：与回执页同序；纸型走 `detail`（账目行 44px 触摸档、对账卡那两条只详情纸生效）。 */
export function listSheetPage(input: ResultSheetPageInput): string {
  return finish(input, [
    sheetHead(input.brand, escapeHtml(input.title), input.subtitle),
    input.headExtraHtml ?? '',
    ticketRule(),
    summaryHtmlOf(input.summary),
    ticketRule(),
    ledgerHtmlOf(input.ledgerTitle, input.ledger),
    ticketRule(),
    pageNav(input.blocks),
    ticketSection({ title: input.detailTitle, tag: input.detailTag, content: pageBody(input.blocks) }),
    ticketRule(),
    checkHtmlOf(input.check),
    input.tailHtml ?? '',
    ticketRule(),
    ticketActions(input.actions),
  ]);
}
