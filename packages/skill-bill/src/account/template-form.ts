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
import { buildDataText } from 'base-paint';
import { renderEntryCard, renderParamForm } from 'base-paint/blocks';
import type { EntryCardEntry } from 'base-paint/blocks';
import { ticketPrimaryButton } from '../shared/docPage.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { collectSheetPage, receiptSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import type { AccountBlocked } from './params.js';
import { ACCOUNT_SLOTS } from './params.js';
import { SOURCE_COLLECT, SOURCE_WRITE, accountStyleTag, copyZoneOf, envelopeOf, money, slotFieldsOf, textOrDash, timeOf } from './pageParts.js';
import type { AccountCollectInput, AccountReceiptInput, AccountWriteScene } from './scene.js';

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
  /** 采集页的复制口令（**本件已不读**：口令块只在回执页主按钮上，采集页那一颗待 base 侧给 disabled 位）。 */
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
  /** 回执页主数字那一段的小字（判地逐页一句）。 */
  readonly receiptNote: string;
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
  return slotFieldsOf(input.params, ACCOUNT_SLOTS[input.op].map((s) => ({
    name: s.name, label: s.label, hint: s.hint, required: s.required,
    ...((s.name === 'from' || s.name === 'to') && names.length > 0 ? { options: names } : {}),
  })));
}

/** 采集页那一条载荷说明（envelope 的 `message`）：说清缺什么、还没写库。 */
function blockedMessageOf(word: string, blocked: readonly AccountBlocked[]): string {
  if (blocked.length === 0) return word + '：等你确认（这一页还没写库）';
  return word + '还差 ' + String(blocked.length) + ' 项：' + blocked.map((b) => b.label).join('、')
    + '（已出采集页，补齐之后跟助手说一遍）';
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
      { label: '分类', value: '—（转账不计收支）' },
      { label: '账户', value: from !== '' || to !== '' ? [from, to].filter((s) => s !== '').join(' → ') : '—（待填从／到）' },
      { label: '账本', value: '转账（记成转账）' },
      { label: '时间', value: strOf(input.params['time']) === '' ? '—（待填）' : strOf(input.params['time']) },
      { label: '编号', value: '—（还没记）' },
    ];
  }
  return [
    { label: '账户', value: strOf(input.params['name']) === '' ? '—（待填账户名）' : strOf(input.params['name']) },
    { label: '账本', value: '账户和账本' },
    { label: '时间', value: at },
    { label: '编号', value: '—（还没记）' },
  ];
}

/** 回执页那几行落点账本。 */
function receiptLedgerOf(input: AccountReceiptInput, at: string): readonly TicketSheetRow[] {
  const r = input.receipt;
  if (r.op === 'transfer') {
    return [
      { label: '分类', value: '—（转账不计收支）' },
      { label: '账户', value: textOrDash(input.params['from']) + ' → ' + textOrDash(input.params['to']) },
      { label: '账本', value: '转账' },
      { label: '时间', value: strOf(input.params['time']) === '' ? at : strOf(input.params['time']) },
      { label: '编号', value: '—（转出／转入各 1 笔，共 2 条）' },
    ];
  }
  const after = r.after;
  const name = after !== null ? after.name : textOrDash(input.params['name']);
  const type = after !== null ? textOrDash(after.type) : textOrDash(input.params['type']);
  return [
    { label: '账户', value: name + '（' + type + '）' },
    { label: '账本', value: '账户和账本（已记好）' },
    { label: '时间', value: at },
    { label: '编号', value: '—（账户域无小票编号）' },
  ];
}

/** 读数卡逐条转成明细行（判地中段那一串「标签 值 ＋ 说明」）。 */
function rowsOfCards(cards: readonly { readonly label: string; readonly value: string; readonly detail?: string }[]): readonly EntryCardEntry[] {
  return cards.map((c) => ({
    title: c.label + ' ' + c.value,
    ...(c.detail === undefined || c.detail === '' ? {} : { sub: c.detail }),
  }));
}

/** 过程型采集页（①）：缺项时出这一页（只采集、不写库）。 */
function collectPage(spec: AccountFormSpec, input: AccountCollectInput): string {
  const blocked = input.blocked;
  const missing = blocked.length;
  const at = timeOf(input.params, input.actionAt);
  const envelope = envelopeOf(input.key, false, blockedMessageOf(spec.word, blocked));
  const hint = missing > 0
    ? '还差 ' + String(missing) + ' 项没填：' + blocked.map((b) => b.label + (b.why === '没给' ? '' : '（' + b.why + '）')).join('、') + '，填完才能复制。'
    : '已填齐，点上面那句复制带数据的口令。';
  const entry = renderParamForm({ description: spec.fieldDescription, fields: fieldsOf(input) })
    + '<p class="ilife-block-caliber">' + hint + '</p>';
  return collectSheetPage({
    docTitle: DOC_TITLE + '·采集页',
    brand: '饼干记账 · ' + spec.word,
    title: missing > 0 ? spec.word + '还差 ' + String(missing) + ' 项' : spec.word + '等你确认',
    subtitle: spec.subtitle(input),
    summary: {
      eyebrow: '待补槽位',
      warn: true,
      value: String(missing),
      unit: '项',
      note: missing > 0 ? '缺：' + blocked.map((b) => b.label).join('、') : '值都齐了，看准了就复制下面那句。',
    },
    ledgerTitle: '账户落点',
    ledger: collectLedgerOf(input, at),
    entryTitle: '待填',
    entryTag: 'ENTRY',
    entryHtml: entry,
    check: '还没记 ／ 共 0 条 ／ 没有异常',
    actions: copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_COLLECT, detail: '没写库（采集页）', actionAt: input.actionAt,
    }),
    foot: '饼干记账 · ' + spec.word + '采集',
    styleHtml: accountStyleTag(),
    slot: 'collect', page: 'collect', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}

/** 结果型回执页（④）：写库成功后出这一页（写库那一半在 `./write.js`）。 */
function receiptPage(spec: AccountFormSpec, input: AccountReceiptInput): string {
  const { receipt } = input;
  const at = timeOf(input.params, receipt.actionAt);
  const envelope = envelopeOf(input.key, true, receipt.summary);
  const isTransfer = receipt.op === 'transfer';
  return receiptSheetPage({
    docTitle: DOC_TITLE + '·写库回执',
    brand: '饼干记账 · ' + spec.word,
    title: receipt.summary,
    subtitle: spec.word + ' · 回执',
    summary: {
      eyebrow: receipt.noChange ? '没改动' : '已记好',
      value: isTransfer ? money(Number(input.params['amount'])) : String(receipt.affectedRows),
      unit: isTransfer ? '元' : '处',
      note: spec.receiptNote,
      ...(receipt.noChange ? {} : { stamp: '有效' }),
    },
    ledgerTitle: '账户落点',
    ledger: receiptLedgerOf(input, at),
    detailTitle: isTransfer ? '两笔分录' : '明细',
    detailTag: 'DETAIL',
    detailHtml: renderEntryCard({ entries: rowsOfCards(spec.receiptCards(input)) }),
    check: '已经记进账本 ／ 共 ' + String(receipt.affectedRows) + ' 条 ／ 没有异常',
    actions: ticketPrimaryButton({
      label: isTransfer ? '撤销这次转账（可恢复）' : '撤销这次新增（可恢复）',
      actionId: 'ilife-undo-' + receipt.op,
      text: buildDataText({ envelope, title: spec.word, format: 'text' }),
    }) + copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_WRITE, detail: spec.logDetail(input), actionAt: receipt.actionAt,
    }),
    foot: '饼干记账 · ' + spec.word + '回执',
    styleHtml: accountStyleTag(),
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}
