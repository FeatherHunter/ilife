/** 账户域模板之二 · **改账户确认页型**（`t685-按域页型表.md` §2.5 第 2 行／#688 §五 5.1 的 ② 过程型确认页）。
 *
 * **本件是这一片页型的块位序列唯一住所**：确认页与它那一张回执页的块序、出现条件、吃的数据都写在这里；
 *  场景件 `scene-update.ts` 只给差异值——唤醒词、口径句、文案。改一次这一片页型的版式只动本件一处。
 *
 * 盖住的场景：改账户 `update`（老 `账户/confirm.html`）。缺项／账户认不出来 ⇒ 出确认页；齐了 ⇒ 写库出回执页。
 *
 * **块位序列＝判地的序列**（#1118 收官轮；判地 `proto/acct-goal/b03`／`b04`）：
 *  确认页＝店头 → 主数字（待补槽位 N 项）→ 落点 LEDGER → 待填 ENTRY（字段卡 ＋ 一行「还差 N 项没填」）
 *    → 对账 CHECK → 按钮区（复制数据／复制日志）→ ✂ 裁切线 → 纸外脚注；**不出页内导航**。
 *  回执页＝店头 → 主数字（已记好 ＋ 印章）→ 落点 LEDGER → 改了什么 DETAIL（改前 → 改后逐行）
 *    → 对账 CHECK → 按钮区（主按钮 ＋ 复制数据／复制日志）→ ✂ 裁切线 → 纸外脚注。
 *  **判地没有的块一律不出**（徽章列／只读回显表／变更预览／账户表与空态／结果块／来源脚注）。
 *
 * 谁在用（一个调用点，指名）：`src/account/scene-update.ts`——它的 `collect`／`receipt` 两格
 *  都是 `bindAccountUpdatePages(spec)` 的产物，本件不自己出页。
 */
import { entryCardCss, renderEntryCard, renderTicketButton, ticketButtonCss } from 'base-paint/blocks';
import type { ChangeRowInput, EntryCardEntry } from 'base-paint/blocks';
import { ticketCollectRuntime } from '../shared/docPage.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { collectEntryCard, collectSheetPage, receiptSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import type { AccountRow } from './accounts.js';
import type { AccountBlocked } from './params.js';
import { accountSlots, changeSlot, textOf } from './params.js';
import { accountHelpPrompt, accountHelpTemplate, changeTextOf, copyZoneOf, envelopeOf, money, slotFieldsOf, sourceCollect, sourceWrite, textOrDash, timeOf } from './pageParts.js';
import type { AccountCollectInput, AccountReceiptInput, AccountWriteScene } from './scene.js';
import { m } from '../entries/index.js';

/** 场景给模板的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。
 *
 *  #1118 收官轮起**判地没有那些块**（徽章列／只读回显表／变更预览／账户表与空态／结果块）本件不再读；
 *  对应字段留着不删（场景件随下一轮清理一起收），本件只读：`word`／`fieldDescription`／`subtitle`／
 *  `prompt`（口令块）／`receiptCards`／`receiptNote`／`logDetail`。 */
export interface AccountUpdateSpec {
  /** 唤醒词（页标题、结论条、下一步动作、复制日志的场景标识都读它）。 */
  readonly word: string;
  /** 类型徽章第二枚胶囊那句话（**本件已不读**）。 */
  readonly caliber: string;
  /** 确认页的口径说明行（**本件已不读**）。 */
  readonly note: string;
  /** 确认页字段卡的操作说明。 */
  readonly fieldDescription: string;
  /** 确认页主按钮的复制载荷（缺项未齐时按钮走 disabled 档）。 */
  readonly prompt: (input: AccountCollectInput, target: AccountRow | null) => string;
  /** 确认页副标题（空串＝不出）。 */
  readonly subtitle: (input: AccountCollectInput, target: AccountRow | null) => string;
  /** 回执页读数卡（**中段明细行的取值面之一**：改名那一路由改动行出，其余读数走这里）。 */
  readonly receiptCards: (input: AccountReceiptInput) => readonly { readonly label: string; readonly value: string; readonly detail?: string }[];
  /** 回执页主数字那一段的小字（#1131 起按数据投影：类型／状态随数据变）。 */
  readonly receiptNote: (input: AccountReceiptInput) => string;
  /** 回执页明细表的标题（**本件已不读**：段标题按页型给）。 */
  readonly detailCaption: string;
  /** 回执页复制日志第 4 段后半。 */
  readonly logDetail: (input: AccountReceiptInput) => string;
}

/** 场景件拿到手的两张页（`AccountWriteScene` 的 `collect`／`receipt` 两格）。 */
export function bindAccountUpdatePages(spec: AccountUpdateSpec): Pick<AccountWriteScene, 'collect' | 'receipt'> {
  return { collect: (input) => confirmPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 这一段改动在账户那一行上改了什么（改前 → 改后；没改的不列）。 */
export function changeRowsOf(before: AccountRow, after: AccountRow): readonly ChangeRowInput[] {
  const rows: ChangeRowInput[] = [];
  if (before.name !== after.name) rows.push({ label: m('skill-bill.account-template-update.c001'), before: before.name, after: after.name });
  if (before.type !== after.type) rows.push({ label: m('skill-bill.account-template-update.c002'), before: textOrDash(before.type), after: textOrDash(after.type) });
  if (before.disabled !== after.disabled) {
    rows.push({ label: m('skill-bill.account-template-update.c003'), before: before.disabled ? m('skill-bill.account-template-update.c004') : m('skill-bill.account-template-update.c005'), after: after.disabled ? m('skill-bill.account-template-update.c006') : m('skill-bill.account-template-update.c007') });
  }
  return rows;
}

/** 按名字在账户表里找目标（找不到给 `null`）。 */
function targetOf(input: AccountCollectInput): AccountRow | null {
  const name = textOf(input.params['name']);
  return input.accounts.find((a) => a.name === name) ?? null;
}

/** 确认页那一条载荷说明（envelope 的 `message`）。 */
function messageOf(word: string, blocked: readonly AccountBlocked[]): string {
  if (blocked.length === 0) return m('skill-bill.account-template-update.c008', { p0: String(word) });
  return m('skill-bill.account-template-update.c009', {
    p0: String(word),
    p1: String(String(blocked.length)),
    p2: String(blocked.map((b) => b.label).join('、')),
  });
}

/** 确认页那几行落点账本。 */
function confirmLedgerOf(input: AccountCollectInput, target: AccountRow | null, at: string): readonly TicketSheetRow[] {
  const name = textOf(input.params['name']);
  return [
    { label: m('skill-bill.account-template-update.c010'), value: target !== null ? target.name : name !== '' ? m('skill-bill.account-template-update.c011', { p0: String(name) }) : m('skill-bill.account-template-update.c012') },
    { label: m('skill-bill.account-template-update.c013'), value: m('skill-bill.account-template-update.c014') },
    { label: m('skill-bill.account-template-update.c015'), value: at },
    { label: m('skill-bill.account-template-update.c016'), value: m('skill-bill.account-template-update.c017') },
  ];
}

/** 过程型确认页（②）：缺项／认不出来时出这一页；**不写库**。 */
function confirmPage(spec: AccountUpdateSpec, input: AccountCollectInput): string {
  const blocked = input.blocked;
  const missing = blocked.length;
  const target = targetOf(input);
  const at = timeOf(input.params, input.actionAt);
  const envelope = envelopeOf(input.key, false, messageOf(spec.word, blocked));
  const hint = missing > 0
    ? m('skill-bill.account-template-update.c018', {
      p0: String(String(missing)),
      p1: String(blocked.map((b) => b.label).join('、')),
    })
    : m('skill-bill.account-template-update.c019');
  // A 路（严格按判地）：待填段只列判地那两行——「账户」「改成什么」。
  // 「停用／启用」是本仓能力，命令侧照收（`accountSlots().update` 与 `./params.js` 一字未动），只是页上不再列出。
  // 判地那两行＝「账户」与「改成什么」；槽位表里后者叫 `new-name`（`changeSlot().name` 是 `change`，
  // 它只在缺项探针里用）——这里按**槽位表的真名**过滤，别按 changeSlot().name（#1118 收尾修正）。
  const change = changeSlot();
  const shown = accountSlots()[input.op].filter((s) => s.name === 'name' || s.name === 'new-name');
  /* #1130：待填区走共享件（编号 → 标签 → 右侧输入框 ＋ 每格一行灰提示），判地 b03 那两行逐字照抄。 */
  const entry = collectEntryCard(slotFieldsOf(input.params, shown.map((s) => (
    s.name === change.name
      ? { name: 'new-name', label: change.label, hint: change.hint, note: change.note, required: true }
      : { name: s.name, label: s.label, hint: s.hint, note: s.note, required: s.required }
  ))), { text: hint, ready: missing === 0 });
  return collectSheetPage({
    docTitle: m('skill-bill.account-template-update.c020', { p0: String(DOC_TITLE) }),
    brand: m('skill-bill.account-template-update.c021', { p0: String(spec.word) }),
    title: missing > 0 ? m('skill-bill.account-template-update.c022', { p0: String(spec.word), p1: String(String(missing)) }) : m('skill-bill.account-template-update.c023', { p0: String(spec.word) }),
    subtitle: spec.subtitle(input, target),
    summary: {
      eyebrow: m('skill-bill.account-template-update.c024'),
      warn: true,
      value: String(missing),
      unit: m('skill-bill.account-template-update.c025'),
      note: missing > 0 ? m('skill-bill.account-template-update.c026', { p0: String(blocked.map((b) => b.label).join('、')) }) : m('skill-bill.account-template-update.c027'),
    },
    ledgerTitle: m('skill-bill.account-template-update.c028'),
    ledger: confirmLedgerOf(input, target, at),
    entryTitle: m('skill-bill.account-template-update.c029'),
    entryTag: 'ENTRY',
    entryHtml: entry,
    check: m('skill-bill.account-template-update.c030'),
    actions: renderTicketButton({
      label: m('skill-bill.account-template-update.c031'),
      actionId: 'ilife-confirm-prompt',
      copyText: spec.prompt(input, target),
      disabled: missing > 0,
    }) + copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: sourceCollect(), detail: m('skill-bill.account-template-update.c032'), actionAt: input.actionAt,
    }),
    foot: m('skill-bill.account-template-update.c033', { p0: String(spec.word) }),
    styleHtml: '<style>' + ticketButtonCss() + '</style>',
    slot: 'collect', page: 'collect', shape: 'receipt', key: input.key, paper: 'receipt',
  }) + ticketCollectRuntime({
    buttonActionId: 'ilife-confirm-prompt',
    template: accountHelpTemplate('account_update'),
    slots: [
      { name: 'name', ph: 'account', required: true },
      { name: 'new-name', ph: 'change', required: true },
    ],
  });
}

/** 结果型回执页（④）：写库成功后出这一页（写库那一半在 `./write.js`）。 */
function receiptPage(spec: AccountUpdateSpec, input: AccountReceiptInput): string {
  const { receipt } = input;
  const at = timeOf(input.params, receipt.actionAt);
  const envelope = envelopeOf(input.key, true, receipt.summary);
  const changes = receipt.before === null || receipt.after === null ? [] : changeRowsOf(receipt.before, receipt.after);
  const nameLabel = m('skill-bill.account-template-update.c001');
  const renamed = changes.find((c) => c.label === nameLabel);
  // A 路（严格按判地 b04）：中段就是「原名／现名／历史流水」三行；其余口子（停用／启用）判地没有，
  // 但它们是真改动，照实出成一行（不是信息删减，是判地没覆盖到的那一支）。
  const rows: readonly EntryCardEntry[] = [
    ...(renamed === undefined ? [] : [
      { title: m('skill-bill.account-template-update.c034', { p0: String(renamed.before) }), sub: m('skill-bill.account-template-update.c035') },
      { title: m('skill-bill.account-template-update.c036', { p0: String(renamed.after) }), sub: m('skill-bill.account-template-update.c037') },
    ]),
    ...changes.filter((c) => c.label !== nameLabel).map((c) => ({ title: c.label + ' ' + c.after, sub: m('skill-bill.account-template-update.c038', { p0: String(c.before) }) })),
    ...(receipt.renamedRows > 0
      ? [{ title: m('skill-bill.account-template-update.c039', { p0: String(String(receipt.renamedRows)) }), sub: m('skill-bill.account-template-update.c040') }]
      : []),
  ];
  const detailRows = rows.length === 0
    ? [{ title: m('skill-bill.account-template-update.c041'), sub: m('skill-bill.account-template-update.c042') }]
    : rows;
  const after = receipt.after;
  return receiptSheetPage({
    docTitle: m('skill-bill.account-template-update.c043', { p0: String(DOC_TITLE) }),
    brand: m('skill-bill.account-template-update.c044', { p0: String(spec.word) }),
    title: receipt.summary,
    subtitle: m('skill-bill.account-template-update.c045', { p0: String(spec.word) }),
    summary: {
      eyebrow: receipt.noChange ? m('skill-bill.account-template-update.c046') : m('skill-bill.account-template-update.c047'),
      value: String(receipt.renamedRows > 0 ? receipt.renamedRows : receipt.affectedRows),
      unit: receipt.renamedRows > 0 ? m('skill-bill.account-template-update.c048') : m('skill-bill.account-template-update.c049'),
      note: spec.receiptNote(input),
      ...(receipt.noChange ? {} : { stamp: m('skill-bill.account-template-update.c050') }),
    },
    ledgerTitle: m('skill-bill.account-template-update.c051'),
    ledger: [
      {
        label: m('skill-bill.account-template-update.c052'),
        value: after === null
          ? m('skill-bill.account-template-update.c053')
          : after.name + '（' + (after.type.trim() === '' ? '—' : after.type) + '·' + (after.disabled ? m('skill-bill.account-template-update.c054') : m('skill-bill.account-template-update.c055')) + '）',
      },
      { label: m('skill-bill.account-template-update.c056'), value: m('skill-bill.account-template-update.c057') },
      { label: m('skill-bill.account-template-update.c058'), value: at },
      { label: m('skill-bill.account-template-update.c059'), value: receipt.renamedRows > 0 ? m('skill-bill.account-template-update.c060', { p0: String(String(receipt.renamedRows)) }) : m('skill-bill.account-template-update.c061') },
    ],
    detailTitle: m('skill-bill.account-template-update.c062'),
    detailTag: 'DETAIL',
    detailHtml: renderEntryCard({ entries: detailRows }),
    check: m('skill-bill.account-template-update.c063', { p0: String(String(receipt.affectedRows)) }),
    actions: renderTicketButton({
      label: m('skill-bill.account-template-update.c064'),
      actionId: 'ilife-undo-update',
      // #1136（返工）：同 template-form.ts 那一条（复制出去的纯文本走 HELP 句）。
      copyText: accountHelpPrompt('account_update', input.params, changeTextOf(input.params)),
    }) + copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: sourceWrite(), detail: spec.logDetail(input), actionAt: receipt.actionAt,
      copy: { text: accountHelpPrompt('account_update', input.params, changeTextOf(input.params)) },
    }),
    foot: m('skill-bill.account-template-update.c065', { p0: String(spec.word) }),
    styleHtml: '<style>' + ticketButtonCss() + entryCardCss() + '</style>',
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}

/** 一张卡上「改完之后是什么样」的读数值（回执页读数行用）。 */
export function afterCardOf(after: AccountRow): { readonly label: string; readonly value: string; readonly detail: string } {
  // #1212 手工处置：链内两个条件各抽局部变量，中间的「／ 状态」才随整句进模板。
  const typeText = after.type.trim() === '' ? m('skill-bill.account-template-update.c066') : m('skill-bill.account-template-update.c067', { p0: String(after.type) });
  const stateText = after.disabled ? m('skill-bill.account-template-update.c068') : m('skill-bill.account-template-update.c069');
  return {
    label: m('skill-bill.account-template-update.c070'),
    value: after.name,
    detail: m('skill-bill.account-template-update.c071', { p0: String(typeText), p1: String(stateText) }),
  };
}

/** 一句「改了几笔历史流水」的读数值（改名那一路用；没改名写 0 笔）。 */
export function renamedCardOf(renamed: number): { readonly label: string; readonly value: string; readonly detail: string } {
  return {
    label: m('skill-bill.account-template-update.c072'),
    value: m('skill-bill.account-template-update.c073', { p0: String(String(renamed)) }),
    detail: renamed === 0 ? m('skill-bill.account-template-update.c074') : m('skill-bill.account-template-update.c075'),
  };
}
