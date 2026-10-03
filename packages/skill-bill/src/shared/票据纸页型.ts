/** 票据纸页型（**三份块位序列**：采集页／回执页／列表页）——账户与目标两域十三张页的唯一版式住所。
 *
 * 谁在用（两个能力，指名）：`src/account/`（账户表单页型、改账户页型、账户汇总页型）与
 *  `src/goal/`（设定表单页型、进度视图页型）——五件模板件只给差异值（值、文案、中段那一串行），
 *  块位拼装一律走本件；改一次版式只动本件一处，十三张页同时跟着改。
 *
 * **块位序列＝判地的序列**（`docs/skills/skill-bill/proto/acct-goal/` 十三件 v2.2 原型逐页核过）：
 *   店头（品牌行 ＋ 结论标题 ＋ 副题）→ 虚线 → 主数字（眉标药丸 ＋ 数 ＋ 单位 ＋ 小字 ＋ 印章 ○）
 *   → 虚线 → 落点段 LEDGER（标签 ／ 点线 ／ 值）→ 虚线 → 中段（采集＝待填 ENTRY／其余＝明细 DETAIL）
 *   → 虚线 → 对账段 CHECK（浅绿卡 ＋ 圆点 ＋ 一句）→ 虚线 → 按钮区（主按钮 ＋ 复制数据 ＋ 复制日志）
 *   → 裁切线 `✂ 裁切线` → 纸外页脚。**十三页判地一件都没有页内导航**，故本件三份序列都不出它。
 *   采集页与回执／列表页只差中段那一段与页型机器标记；回执页与列表页同序（判地同序），
 *   各自写一份是为了改一页型时不动另一页型。
 *
 * **家具只用既有导出**：纸走 `renderSheetFrame`（`variant: 'ticket'`，裁切线由它的 `cutLineText` 出），
 *  店头／虚线／段／主数字／按钮区走 `./docPage.js`，账目行走公共层 `renderLedgerRows({layout:'ticket'})`，
 *  主数字走 `renderSummaryHead({layout:'ticket'})`，中段那一串行由调用方给（明细卡走 `renderEntryCard`、
 *  表单走 `renderParamForm`），整页外壳走 `assembleSheetPage`，机器标记走 `writeSection`。
 *  **本件不出第二条样式通道**：颜色、圆角、内距一律由皮肤与 `assembleSheetPage` 那三段共用样式给。
 */
import { escapeHtml } from 'base-paint';
import { renderCheckRow, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from './docPage.js';
import { writeSection } from './writeParts.js';

/** 主数字那一段的差异值（眉标药丸、主读数、单位、下面那句小字、右上角印章）。 */
export interface TicketSheetSummary {
  readonly eyebrow: string;
  readonly value: string;
  readonly unit?: string;
  /** 主数字下面那句小字（判地里就是结论句；空串＝不出）。 */
  readonly note?: string;
  /** 右上角那枚印章（回执页恒出「有效」；采集页与列表页不出）。 */
  readonly stamp?: string;
  /** 眉标走警示档（判地采集页那枚红点；由公共层 `is-warn-head` 出）。 */
  readonly warn?: boolean;
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
  /** 按钮区内容（主按钮 ＋ 复制区；由调用方给已装配好的标记）。 */
  readonly actions: string;
  /** 纸外脚注（如 `饼干记账 · 新增账户采集`）。 */
  readonly foot: string;
  /** 页内样式段（本域自己的补充位；账户域与目标域的复制区与表单 guards 走这一格）。 */
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

/** 结果型两张页（回执／列表）的差异值（中段是一张明细卡那一串行）。 */
export interface ResultSheetPageInput extends TicketSheetCommon {
  /** 中段段标题（如 `明细`／`各账户余额`）。 */
  readonly detailTitle: string;
  readonly detailTag: string;
  readonly detailHtml: string;
}

/** 主数字那一段（眉标药丸 ＋ 主数字 ＋ 下面那句小字 ＋ 可选印章）。 */
function summaryHtmlOf(summary: TicketSheetSummary): string {
  const head = renderSummaryHead({
    eyebrow: summary.eyebrow,
    value: summary.value,
    ...(summary.unit === undefined ? {} : { unit: summary.unit }),
    ...(summary.stamp === undefined ? {} : { stamp: { text: summary.stamp, tone: 'ok' as const } }),
    ...(summary.warn === true ? { extraClass: 'is-warn-head' } : {}),
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

/** 对账那一段（浅绿卡 ＋ 圆点 ＋ 一句；形状走 base 件 `check-row`，默认档字节与改前逐字相同）。 */
function checkHtmlOf(text: string): string {
  return ticketSection({ title: '对账', tag: 'CHECK', content: renderCheckRow({ text }) });
}

/** 三张页型共用的收口：纸（含裁切线）＋ 机器标记段 ＋ 纸外页脚 ＋ 整页外壳。 */
function finish(input: TicketSheetCommon, parts: readonly string[]): string {
  const paper = renderSheetFrame({
    variant: 'ticket',
    cutLine: true,
    cutLineText: '✂ 裁切线',
    content: parts.join(''),
  });
  const section = writeSection({
    slot: input.slot, page: input.page, shape: input.shape, key: input.key,
    content: (input.styleHtml ?? '') + paper + '<div class="ilife-ticket-foot">' + escapeHtml(input.foot) + '</div>',
  });
  return assembleSheetPage({ docTitle: input.docTitle, bodyHtml: section, paper: input.paper });
}

/** 采集页（过程型 ①）：店头 → 主数字 → 落点 → 待填 → 对账 → 按钮区；**不出页内导航**（判地同）。 */
export function collectSheetPage(input: CollectSheetPageInput): string {
  return finish(input, [
    sheetHead(input.brand, escapeHtml(input.title), input.subtitle),
    ticketRule(),
    summaryHtmlOf(input.summary),
    ticketRule(),
    ledgerHtmlOf(input.ledgerTitle, input.ledger),
    ticketRule(),
    ticketSection({ title: input.entryTitle, tag: input.entryTag, content: input.entryHtml }),
    ticketRule(),
    checkHtmlOf(input.check),
    ticketRule(),
    ticketActions(input.actions),
  ]);
}

/** 回执页（结果型 ④）：店头 → 主数字（带印章）→ 落点 → 明细 → 对账 → 按钮区。 */
export function receiptSheetPage(input: ResultSheetPageInput): string {
  return finish(input, [
    sheetHead(input.brand, escapeHtml(input.title), input.subtitle),
    ticketRule(),
    summaryHtmlOf(input.summary),
    ticketRule(),
    ledgerHtmlOf(input.ledgerTitle, input.ledger),
    ticketRule(),
    ticketSection({ title: input.detailTitle, tag: input.detailTag, content: input.detailHtml }),
    ticketRule(),
    checkHtmlOf(input.check),
    ticketRule(),
    ticketActions(input.actions),
  ]);
}

/** 列表页（结果型 ⑥）：与回执页同序（判地同序），纸型走 `detail`。 */
export function listSheetPage(input: ResultSheetPageInput): string {
  return finish(input, [
    sheetHead(input.brand, escapeHtml(input.title), input.subtitle),
    ticketRule(),
    summaryHtmlOf(input.summary),
    ticketRule(),
    ledgerHtmlOf(input.ledgerTitle, input.ledger),
    ticketRule(),
    ticketSection({ title: input.detailTitle, tag: input.detailTag, content: input.detailHtml }),
    ticketRule(),
    checkHtmlOf(input.check),
    ticketRule(),
    ticketActions(input.actions),
  ]);
}
