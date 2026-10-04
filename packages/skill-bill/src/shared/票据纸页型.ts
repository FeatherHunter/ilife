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


/** 待填卡的一格（判地 \`.fill-field\` 那一行：编号在左、标签居中、输入框占右半）。 */
export interface CollectEntryField {
  /** 表单名（运行时段按 \`[name=…]\` 取值；#1118 的主按钮开关读的就是它）。 */
  readonly name: string;
  /** 标签文字（判地逐页给，含「（选填）」这种尾注）。 */
  readonly label: string;
  /** 占位文字（与 base ParamFieldInput.hint 同一语义；不给＝不带 placeholder）。 */
  readonly hint?: string;
  /** 控件下面那一行灰提示（判地 .entry-sub；与 base ParamFieldInput.helpText 同一语义）。 */
  readonly helpText?: string;
  /** 候选项（非空即出 select，首项＝hint 那句占位；账户域的从／到账户走它）。
   *  形态与 base `ParamFieldInput.options` 同（串或 `{ value, label }`）。 */
  readonly options?: readonly (string | { readonly value: string; readonly label?: string })[];
  /** 必需：出 \`*\` ＋ \`required\`／\`data-required\`。 */
  readonly required?: boolean;
  /** 已给的值（回显；不给＝空）。 */
  readonly value?: string;
  /** 输入提示（如 \`decimal\`）。 */
  readonly inputmode?: string;
}

/** 待填卡那一族的样式段（判地 \`.fill-field\`／\`.fill-label\`／\`.req\`／输入框四条，逐值照抄）。
 *
 *  为什么住这里而不是公共层：这四条只服务「票据纸采集页的待填卡」这一处形状，
 *  公共层没有对应件（#1130 判据：一处实现、五张采集页共用）；容器与行仍走公共层已有的
 *  \`.ilife-ticket-card\`／\`.ilife-ticket-entries\`（判地 \`.entry-card\`／\`.entry-rows\` 同形）。
 *  编号方块那一枚：判地 \`.idx\` 是 22×22／圆角 7px／底 \`#f4efe2\`／字 \`#8a857a\`，
 *  公共层票据族的 \`::before\` 取的是另一档（\`radius-sm\`／\`surface-2\`／\`ink-3\`）⇒
 *  在 \`.is-entry\` 之下按判地覆盖（回执页 DETAIL 卡不在本票，留给 #1131）。 */
export function collectEntryCss(): string {
  return [
    '.ilife-ticket-card.is-entry .ilife-ticket-entries > li::before { border-radius: 7px; background: #f4efe2; color: #8a857a; }',
    '.ilife-ticket-fill { display: flex; align-items: center; gap: 10px; min-height: 44px; width: 100%; max-width: 100%; min-width: 0; }',
    '.ilife-ticket-fill-label { flex: none; min-width: 64px; color: var(--ilife-ink-2); font-weight: 700; white-space: nowrap; font-size: 14px; }',
    '.ilife-ticket-fill-req { color: var(--ilife-danger); font-style: normal; font-weight: 900; }',
    '.ilife-ticket-fill-input { flex: 1 1 0; min-width: 0; max-width: 100%; box-sizing: border-box; min-height: 44px; border: 1.5px solid #ddd0b6; border-radius: 10px; background: #fff; color: var(--ilife-ink); font-size: 15px; font-weight: 700; padding: 8px 10px; font-family: var(--ilife-font); }',
    '.ilife-ticket-fill-input:focus { outline: 2px solid var(--ilife-accent); outline-offset: 1px; border-color: var(--ilife-accent); }',
    '.ilife-ticket-fill-input.is-bad { border-color: var(--ilife-danger); outline: 2px solid var(--ilife-danger); }',
    /* 每格下面那一行灰提示（判地 `.entry-sub`：块级、12px、`ink-2`、上距 2px）。
       公共层那份只在 `.ilife-ticket-receipt`／`.ilife-ticket-detail` 之下，采集页的卡按本段自带一份。 */
    '.ilife-ticket-card.is-entry .ilife-ticket-entry-sub { display: block; color: var(--ilife-ink-2); font-size: 12px; font-weight: 400; margin-top: 2px; }',
    /* 卡里那一行「还差 N 项没填」（判地 `.help-hint`：8px 上距、12.5px／行高 1.7、危险档 w700；齐了转绿）。 */
    '.ilife-ticket-fill-hint { margin: 8px 2px 0; font-size: 12.5px; line-height: 1.7; color: var(--ilife-danger); font-weight: 700; }',
    '.ilife-ticket-fill-hint.is-ready { color: var(--ilife-ok); }',
  ].join(String.fromCharCode(10));
}

/** 待填卡（判地：\`.entry-card\` 容器 ＋ 逐行「编号 → 标签 → 右侧输入框」＋ 每格下面一行灰提示）。
 *
 *  一处实现：五张采集页（账户 add／update／transfer ＋ 目标 budget／goal）都调它，
 *  差异只在传进来的格子数据（标签／占位／提示逐页照判地）。 */
export function collectEntryCard(fields: readonly CollectEntryField[], hint?: { readonly text: string; readonly ready?: boolean }): string {
  const rows = fields.map((f) => {
    const ph = f.hint === undefined || f.hint === '' ? '' : f.hint;
    const required = f.required === true;
    const value = f.value === undefined ? '' : f.value;
    const opts = f.options === undefined ? [] : f.options;
    /* 有候选项＝下拉（账户域的从／到账户）：首项是 hint 那句占位（空值、禁选），与 base 既有口径一致。 */
    const control = opts.length > 0
      ? '<select class="ilife-ticket-fill-input" name="' + escapeHtml(f.name) + '" aria-label="' + escapeHtml(f.label) + '"'
        + (required ? ' data-required="1" required' : '') + '>'
        + '<option value=""' + (value === '' ? ' selected' : '') + (ph === '' ? '' : ' disabled') + '>' + escapeHtml(ph) + '</option>'
        + opts.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const t = typeof o === 'string' ? o : (o.label === undefined ? o.value : o.label);
          return '<option value="' + escapeHtml(v) + '"' + (v === value ? ' selected' : '') + '>' + escapeHtml(t) + '</option>';
        }).join('')
        + '</select>'
      : '<input class="ilife-ticket-fill-input" type="text" name="' + escapeHtml(f.name) + '"'
        + (f.inputmode === undefined || f.inputmode === '' ? '' : ' inputmode="' + escapeHtml(f.inputmode) + '"')
        + ' value="' + escapeHtml(value) + '"'
        + (ph === '' ? '' : ' placeholder="' + escapeHtml(ph) + '"')
        + ' aria-label="' + escapeHtml(f.label) + '"'
        + (required ? ' data-required="1" required' : '') + '>';
    const label = '<span class="ilife-ticket-fill-label">' + escapeHtml(f.label)
      + (required ? ' <i class="ilife-ticket-fill-req" aria-hidden="true">*</i>' : '') + '</span>';
    const note = f.helpText === undefined || f.helpText === '' ? ''
      : '<span class="ilife-ticket-entry-sub">' + escapeHtml(f.helpText) + '</span>';
    return '<li><span class="ilife-ticket-entry-text">'
      + '<label class="ilife-ticket-fill">' + label + control + '</label>' + note
      + '</span></li>';
  }).join('');
  const hintHtml = hint === undefined || hint.text === '' ? ''
    : '<p class="ilife-ticket-fill-hint' + (hint.ready === true ? ' is-ready' : '') + '" id="helpHint">' + escapeHtml(hint.text) + '</p>';
  return '<div class="ilife-ticket-card is-entry"><ol class="ilife-ticket-entries" id="helpForm">' + rows + '</ol>' + hintHtml + '</div>';
}

/** 采集页（过程型 ①）：店头 → 主数字 → 落点 → 待填 → 对账 → 按钮区；**不出页内导航**（判地同）。 */
export function collectSheetPage(input: CollectSheetPageInput): string {
  return finish(
    { ...input, styleHtml: (input.styleHtml ?? '') + '<style>' + collectEntryCss() + '</style>' },
    [
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
