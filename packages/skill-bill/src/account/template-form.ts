/** 账户域模板之一 · **账户表单页型**（`t685-按域页型表.md` §2.5 第 1 行）。
 *
 * **本件是这一片页型的块位序列唯一住所**：采集页与回执页的块序、每块的出现条件、每块吃的数据形态都写在这里；
 *  场景件（`scene-{add,transfer}.ts`）只给差异值——唤醒词、口径句、读数卡（回执页中段那一串行的取值）。
 *  改一次这一片页型的版式只动本件一处，两张页同时跟着改。
 *
 * 盖住的场景：新增账户 `add` · 账户转账 `transfer`。
 *
 * **块位序列＝判地的序列**（#1118 收官轮；判地＝`docs/skills/skill-bill/proto/acct-goal/` v2.2 十三件）：
 *  采集页＝店头 → 主数字（待补槽位 N 项）→ 落点 LEDGER → 待填 ENTRY（字段卡 ＋ 一行「还差 N 项没填」）
 *    → 对账 CHECK → 按钮区（复制数据／复制日志）→ ✂ 裁切线 → 纸外脚注；**不出页内导航**（判地同）。
 *  回执页＝店头 → 主数字（已记好 ＋ 印章）→ 落点 LEDGER → 明细 DETAIL（读数卡逐条转成明细行）
 *    → 对账 CHECK → 按钮区（主按钮 ＋ 复制数据／复制日志）→ ✂ 裁切线 → 纸外脚注。
 *  **判地没有的块一律不出**：徽章列、页内导航、读数卡网格、数据表、占比条、折叠区、来源脚注。
 *
 * 谁在用（两个调用点，指名）：`src/account/scene-{add,transfer}.ts`——两件的 `collect`／`receipt`
 *  都是 `bindAccountFormPages(spec)` 的产物，本件不自己出页。
 */
import { entryCardCss, renderEntryCard, renderTicketButton, ticketButtonCss } from 'base-paint/blocks';
import type { EntryCardEntry } from 'base-paint/blocks';
import { ticketCollectRuntime } from '../shared/docPage.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { collectEntryCard, collectSheetPage, receiptSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import type { AccountBlocked } from './params.js';
import { accountSlots } from './params.js';
import { accountHelpPrompt, accountHelpTemplate, copyZoneOf, envelopeOf, money, slotFieldsOf, sourceCollect, sourceWrite, textOrDash, timeOf } from './pageParts.js';
import { textOf } from '../shared/params.js';
import type { AccountCollectInput, AccountReceipt, AccountReceiptInput, AccountWriteScene } from './scene.js';
import { m } from '../entries/index.js';

/** 场景给模板的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。
 *
 *  #1118 收官轮起**判地没有那些块**（徽章列／读数卡网格／数据表／操作预览／已有账户表／空态块／结果块）
 *  本件不再读；对应字段留着不删（场景件随下一轮清理一起收），本件只读：`word`／`fieldDescription`／
 *  `subtitle`／`receiptCards`（回执页中段那一串行）／`receiptNote`（回执页主数字下那句小字）／`logDetail`。 */
export interface AccountFormSpec {
  /** 唤醒词（页标题、结论句、复制日志的场景标识都读它）。 */
  readonly word: string;
  /** 类型徽章第二枚胶囊那句话（**本件已不读**：判地没有徽章列）。 */
  readonly caliber: string;
  /** 采集页的口径说明行（**本件已不读**）。 */
  readonly note: string;
  /** 采集页字段卡的操作说明。 */
  readonly fieldDescription: string;
  /** 采集页的操作预览（**本件已不读**：判地没有预览表）。 */
  readonly preview: (input: AccountCollectInput) => readonly { readonly k: string; readonly v: string }[];
  readonly previewCaption: string;
  /** 采集页主按钮的复制载荷（**判地那颗主按钮点一下复制的就是它**；缺项未齐时按钮走 disabled 档）。 */
  readonly prompt: (input: AccountCollectInput) => string;
  /** 采集页副标题（空串＝不出）。 */
  readonly subtitle: (input: AccountCollectInput) => string;
  /** 采集页「已有账户」那张只读表的标题（**本件已不读**）。 */
  readonly registerCaption: string;
  /** 账户表为空时那两句（**本件已不读**）。 */
  readonly emptyAccounts: { readonly text: string; readonly next: string };
  /** 回执页读数卡（**中段明细行的唯一取值面**：每张卡＝一行「标签 值 ＋ 说明」）。 */
  readonly receiptCards: (input: AccountReceiptInput) => readonly { readonly label: string; readonly value: string; readonly detail?: string }[];
  /** 回执页的结果块（**本件已不读**：判地结果块就是明细卡那一串行）。 */
  readonly result: (input: AccountReceiptInput) => {
    readonly navText: string;
    readonly caption: string;
    readonly rows: readonly { readonly k: string; readonly v: string }[];
    readonly note: string;
  } | null;
  /** 回执页主数字那一段的小字（判地逐页一句）。**按数据投影**时就写成函数（#1131：新增页要带类型；
   *  与改账户页同一手法，判地那两句都是逐页固定句）。 */
  readonly receiptNote: (input: AccountReceiptInput) => string;
  /** 回执页明细表的标题（**本件已不读**：段标题按页型给）。 */
  readonly detailCaption: string;
  /** 回执页复制日志第 4 段后半（这一页干了什么）。 */
  readonly logDetail: (input: AccountReceiptInput) => string;
}

/** 场景件拿到手的两张页（`AccountWriteScene` 的 `collect`／`receipt` 两格）。 */
export function bindAccountFormPages(spec: AccountFormSpec): Pick<AccountWriteScene, 'collect' | 'receipt'> {
  return { collect: (input) => collectPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 采集页字段卡的格子：槽位表的每一格加候选（`from`／`to` 拿账户表当候选项，同一份数据两处用）。 */
function fieldsOf(input: AccountCollectInput): ReturnType<typeof slotFieldsOf> {
  const names = input.accounts.map((a) => a.name);
  return slotFieldsOf(input.params, accountSlots()[input.op].map((s) => ({
    name: s.name, label: s.label, hint: s.hint, note: s.note, required: s.required,
    ...((s.name === 'from' || s.name === 'to') && names.length > 0 ? { options: names } : {}),
  })));
}

/** 采集页那一条载荷说明（envelope 的 `message`）：说清缺什么、还没写库。 */
function blockedMessageOf(word: string, blocked: readonly AccountBlocked[]): string {
  if (blocked.length === 0) return m('skill-bill.account-template-form.c001', { p0: String(word) });
  return m('skill-bill.account-template-form.c002', {
    p0: String(word),
    p1: String(String(blocked.length)),
    p2: String(blocked.map((b) => b.label).join('、')),
  });
}

/** 一个参数值的上屏文本（空白串＝空；待填的格由落点行自己说清）。 */
function strOf(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim();
}

/** 采集页那几行落点账本（判地逐页 4–5 行）。 */
function collectLedgerOf(input: AccountCollectInput, at: string): readonly TicketSheetRow[] {
  const from = strOf(input.params['from']);
  const to = strOf(input.params['to']);
  if (input.op === 'transfer') {
    return [
      { label: m('skill-bill.account-template-form.c003'), value: m('skill-bill.account-template-form.c004') },
      { label: m('skill-bill.account-template-form.c005'), value: from !== '' || to !== '' ? [from, to].filter((s) => s !== '').join(' → ') : m('skill-bill.account-template-form.c006') },
      { label: m('skill-bill.account-template-form.c007'), value: m('skill-bill.account-template-form.c008') },
      { label: m('skill-bill.account-template-form.c009'), value: strOf(input.params['time']) === '' ? m('skill-bill.account-template-form.c010') : strOf(input.params['time']) },
      { label: m('skill-bill.account-template-form.c011'), value: m('skill-bill.account-template-form.c012') },
    ];
  }
  return [
    { label: m('skill-bill.account-template-form.c013'), value: strOf(input.params['name']) === '' ? m('skill-bill.account-template-form.c014') : strOf(input.params['name']) },
    { label: m('skill-bill.account-template-form.c015'), value: m('skill-bill.account-template-form.c016') },
    { label: m('skill-bill.account-template-form.c017'), value: at },
    { label: m('skill-bill.account-template-form.c018'), value: m('skill-bill.account-template-form.c019') },
  ];
}

/** 回执页那几行落点账本。 */
function receiptLedgerOf(input: AccountReceiptInput, at: string): readonly TicketSheetRow[] {
  const r = input.receipt;
  if (r.op === 'transfer') {
    return [
      { label: m('skill-bill.account-template-form.c020'), value: m('skill-bill.account-template-form.c021') },
      { label: m('skill-bill.account-template-form.c022'), value: textOrDash(input.params['from']) + ' → ' + textOrDash(input.params['to']) },
      { label: m('skill-bill.account-template-form.c023'), value: m('skill-bill.account-template-form.c024') },
      { label: m('skill-bill.account-template-form.c025'), value: strOf(input.params['time']) === '' ? at : strOf(input.params['time']) },
      { label: m('skill-bill.account-template-form.c026'), value: m('skill-bill.account-template-form.c027') },
    ];
  }
  const after = r.after;
  const name = after !== null ? after.name : textOrDash(input.params['name']);
  const type = after !== null ? textOrDash(after.type) : textOrDash(input.params['type']);
  return [
    { label: m('skill-bill.account-template-form.c028'), value: name + '（' + type + '）' },
    { label: m('skill-bill.account-template-form.c029'), value: m('skill-bill.account-template-form.c030') },
    { label: m('skill-bill.account-template-form.c031'), value: at },
    { label: m('skill-bill.account-template-form.c032'), value: m('skill-bill.account-template-form.c033') },
  ];
}

/** 回执页中段那几行（**判地逐页给的行**；A 路：不再由读数卡转写，读数卡那几项的多余信息不再上屏）。 */
function receiptRowsOf(input: AccountReceiptInput): readonly EntryCardEntry[] {
  if (input.receipt.op === 'transfer') {
    return [
      { title: m('skill-bill.account-template-form.c034', { p0: String(textOrDash(input.params['from'])) }), sub: m('skill-bill.account-template-form.c035') },
      { title: m('skill-bill.account-template-form.c036', { p0: String(textOrDash(input.params['to'])) }), sub: m('skill-bill.account-template-form.c037') },
    ];
  }
  return [
    { title: m('skill-bill.account-template-form.c038', { p0: String(textOrDash(input.params['name'])) }), sub: m('skill-bill.account-template-form.c039') },
    { title: m('skill-bill.account-template-form.c040', { p0: String(textOrDash(input.params['type'])) }), sub: m('skill-bill.account-template-form.c041') },
    { title: m('skill-bill.account-template-form.c042'), sub: m('skill-bill.account-template-form.c043') },
  ];
}

/** 过程型采集页（①）：缺项时出这一页（只采集、不写库）。 */
function collectPage(spec: AccountFormSpec, input: AccountCollectInput): string {
  const blocked = input.blocked;
  const missing = blocked.length;
  const at = timeOf(input.params, input.actionAt);
  const envelope = envelopeOf(input.key, false, blockedMessageOf(spec.word, blocked));
  const hint = missing > 0
    ? m('skill-bill.account-template-form.c044', {
      p0: String(String(missing)),
      p1: String(blocked.map((b) => b.label).join('、')),
    })
    : m('skill-bill.account-template-form.c045');
  /* #1130：待填区按判地做成「编号 → 标签 → 右侧输入框」的横向行 ＋ 每格下面一行灰提示（共享件一处实现）。 */
  const entry = collectEntryCard(fieldsOf(input), { text: hint, ready: missing === 0 });
  return collectSheetPage({
    docTitle: m('skill-bill.account-template-form.c046', { p0: String(DOC_TITLE) }),
    brand: m('skill-bill.account-template-form.c047', { p0: String(spec.word) }),
    title: missing > 0 ? m('skill-bill.account-template-form.c048', { p0: String(spec.word), p1: String(String(missing)) }) : m('skill-bill.account-template-form.c049', { p0: String(spec.word) }),
    subtitle: spec.subtitle(input),
    summary: {
      eyebrow: m('skill-bill.account-template-form.c050'),
      warn: true,
      value: String(missing),
      unit: m('skill-bill.account-template-form.c051'),
      note: missing > 0 ? m('skill-bill.account-template-form.c052', { p0: String(blocked.map((b) => b.label).join('、')) }) : m('skill-bill.account-template-form.c053'),
    },
    ledgerTitle: m('skill-bill.account-template-form.c054'),
    ledger: collectLedgerOf(input, at),
    entryTitle: m('skill-bill.account-template-form.c055'),
    entryTag: 'ENTRY',
    entryHtml: entry,
    check: m('skill-bill.account-template-form.c056'),
    actions: renderTicketButton({
      label: m('skill-bill.account-template-form.c057'),
      actionId: 'ilife-collect-prompt',
      copyText: spec.prompt(input),
      disabled: missing > 0,
    }) + copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: sourceCollect(), detail: m('skill-bill.account-template-form.c058'), actionAt: input.actionAt,
    }),
    foot: m('skill-bill.account-template-form.c059', { p0: String(spec.word) }),
    styleHtml: '<style>' + ticketButtonCss() + '</style>',
    slot: 'collect', page: 'collect', shape: 'receipt', key: input.key, paper: 'receipt',
  }) + ticketCollectRuntime({
    buttonActionId: 'ilife-collect-prompt',
    template: accountHelpTemplate(input.op === 'transfer' ? 'account_transfer' : 'account_add'),
    slots: input.op === 'transfer'
      ? [
        { name: 'amount', ph: 'amount', required: true },
        { name: 'from', ph: 'from_account', required: true },
        { name: 'to', ph: 'to_account', required: true },
        { name: 'time', ph: 'transfer_time', required: false },
      ]
      : [
        { name: 'name', ph: 'account_name', required: true },
        { name: 'type', ph: 'account_type', required: false },
      ],
  });
}

/** 回执页**店头那一行**（判地 H2）——#1131：按判地给**固定句**，与载荷那句话各按各的。
 *
 *  判地两处本来就不是同一句：店头是短句（`已新增账户「招行卡」`／`已转账 支付宝 → 招行工资卡`），
 *  而**复制区／载荷 `message` 是长句**（带「账户表现在 N 个」／带金额与「转出与转入各一笔，不算进收支」）。
 *  本件因此只改**上屏那一行**：`envelope`／`buildDataText` 仍读 `receipt.summary`（长句）——事实一项不丢。
 *
 *  - `add`：`已新增账户「<名>」`；账户总数不进店头（它住在载荷 `message` 与复制日志里，判地同款）；
 *  - `transfer`：`已转账 <转出> → <转入>`；金额在主数字段、口径句在载荷 `message`；
 *  - 其余 op（含 `update` 已收的改名句）与加这一支之前**逐字节相同**：原样用 `receipt.summary`。 */
function receiptHeadline(receipt: AccountReceipt, params: Record<string, unknown>): string {
  if (receipt.op === 'add' && receipt.after !== null) return m('skill-bill.account-template-form.c060', { p0: String(receipt.after.name) });
  if (receipt.op === 'transfer') {
    const from = textOf(params['from']);
    const to = textOf(params['to']);
    if (from !== '' && to !== '') return m('skill-bill.account-template-form.c061', { p0: String(from), p1: String(to) });
  }
  return receipt.summary;
}

/** 结果型回执页（④）：写库成功后出这一页（写库那一半在 `./write.js`）。 */
function receiptPage(spec: AccountFormSpec, input: AccountReceiptInput): string {
  const { receipt } = input;
  const at = timeOf(input.params, receipt.actionAt);
  const envelope = envelopeOf(input.key, true, receipt.summary);
  const isTransfer = receipt.op === 'transfer';
  return receiptSheetPage({
    docTitle: m('skill-bill.account-template-form.c062', { p0: String(DOC_TITLE) }),
    brand: m('skill-bill.account-template-form.c063', { p0: String(spec.word) }),
    title: receiptHeadline(receipt, input.params),
    subtitle: m('skill-bill.account-template-form.c064', { p0: String(spec.word) }),
    summary: {
      eyebrow: receipt.noChange ? m('skill-bill.account-template-form.c065') : m('skill-bill.account-template-form.c066'),
      value: isTransfer ? money(Number(input.params['amount'])) : String(receipt.affectedRows),
      unit: isTransfer ? m('skill-bill.account-template-form.c067') : m('skill-bill.account-template-form.c068'),
      note: spec.receiptNote(input),
      ...(receipt.noChange ? {} : { stamp: m('skill-bill.account-template-form.c069') }),
    },
    ledgerTitle: m('skill-bill.account-template-form.c070'),
    ledger: receiptLedgerOf(input, at),
    detailTitle: isTransfer ? m('skill-bill.account-template-form.c071') : m('skill-bill.account-template-form.c072'),
    detailTag: 'DETAIL',
    detailHtml: renderEntryCard({ entries: receiptRowsOf(input) }),
    check: m('skill-bill.account-template-form.c073', { p0: String(String(receipt.affectedRows)) }),
    actions: renderTicketButton({
      label: isTransfer ? m('skill-bill.account-template-form.c074') : m('skill-bill.account-template-form.c075'),
      actionId: 'ilife-undo-' + receipt.op,
      // #1136（返工）：复制出去的纯文本走 HELP 句（与采集页 `spec.prompt` 同一句话，填本次实参），
      // 不再是裸 envelope 行。JSON／CSV／日志不动；页上不增块。本模板只服务 add／transfer 两支，op 即判据。
      copyText: accountHelpPrompt(receipt.op === 'transfer' ? 'account_transfer' : 'account_add', input.params),
    }) + copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: sourceWrite(), detail: spec.logDetail(input), actionAt: receipt.actionAt,
      copy: { text: accountHelpPrompt(receipt.op === 'transfer' ? 'account_transfer' : 'account_add', input.params) },
    }),
    foot: m('skill-bill.account-template-form.c076', { p0: String(spec.word) }),
    styleHtml: '<style>' + ticketButtonCss() + entryCardCss() + '</style>',
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}
