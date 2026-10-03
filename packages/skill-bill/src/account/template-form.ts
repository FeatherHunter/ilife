/** 账户域模板之一 · **账户表单页型**（`t685-按域页型表.md` §2.5 第 1 行）。
 *
 * **本件是这一片页型的块位序列唯一住所**：采集页与回执页的块序、每块的出现条件、每块吃的数据形态都写在这里；
 *  场景件（`scene-{add,transfer}.ts`）只给差异值——唤醒词、口径句、操作预览、文案。
 *  改一次这一片页型的版式只动本件一处，两张页同时跟着改。
 *
 * 盖住的场景（老侧两张模板，本仓按「一命令一页」拆开、装配件共用一份）：
 *   新增账户 `add`（老 `账户/account_form.html`）· 账户转账 `transfer`（老 `账户/transfer_confirm.html`）。
 *
 * **块位序列（#1118 起走票据纸三页型）**：本件只把差异值交给
 *  `../shared/票据纸页型.js` 的 `collectSheetPage`／`receiptSheetPage`——
 *  采集页＝店头 ● → 徽章列 ● → 主数字（待补槽位 N 项）● → 落点 LEDGER ● → 待填 ENTRY
 *    （结论条 ○／阻断折叠 ●／口径行 ○／操作预览 ○／已有账户表 ●／字段卡 ●／口令块 ●）●
 *    → 对账 CHECK ● → 来源脚注 ● → 按钮区 ● → 纸外脚注 ●；**过程型页不出页内导航**。
 *  回执页＝店头 ● → 徽章列 ● → 主数字（已记好，带印章）● → 落点 LEDGER ● → 页内导航 ●
 *    → 明细 DETAIL（读数行 ●／结果块 ○／口径行 ○／明细表 ●／对账折叠 ●）● → 对账 CHECK ●
 *    → 来源脚注 ● → 按钮区 ● → 纸外脚注 ●。
 *
 * 谁在用（两个调用点，指名）：`src/account/scene-{add,transfer}.ts`——两件的 `collect`／`receipt`
 *  都是 `bindAccountFormPages(spec)` 的产物，本件不自己出页。
 */
import { renderCaliberLine, renderConclusionBar, renderDataTable, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { collectSheetPage, receiptSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import type { AccountBlocked } from './params.js';
import { ACCOUNT_SLOTS } from './params.js';
import {
  SOURCE_COLLECT, SOURCE_COLLECT_TEXT, SOURCE_WRITE, SOURCE_WRITE_TEXT, accountStyleTag, accountsTableOf,
  badgeOf, blockedCommandOf, blockedFoldOf, copyZoneOf, emptyOf, envelopeOf, promptBlockOf, reconcileOf,
  receiptStatusCard, slotFieldsOf, sourceNoteOf, timeOf,
} from './pageParts.js';
import type { AccountCollectInput, AccountReceiptInput, AccountWriteScene } from './scene.js';

/** 对账折叠区里那句怎么核对（三支写操作同一句）。 */
const RECONCILE_NOTE = '账户余额由收支流水累计推算，核对时看账本里那几笔就是。';

/** 场景给模板的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。 */
export interface AccountFormSpec {
  /** 唤醒词（页标题、采集页的结论条与下一步动作、复制日志的场景标识都读它）。 */
  readonly word: string;
  /** 类型徽章第二枚胶囊那句话（这一片页型共两件，各说各的这一页在做什么）。 */
  readonly caliber: string;
  /** 采集页的口径说明行（空串＝不出这一行）。 */
  readonly note: string;
  /** 采集页字段卡的操作说明。 */
  readonly fieldDescription: string;
  /** 采集页的操作预览（「将执行以下操作」每一行；空数组＝这一件不出这一块）。 */
  readonly preview: (input: AccountCollectInput) => readonly { readonly k: string; readonly v: string }[];
  readonly previewCaption: string;
  /** 采集页的复制口令（照这句跟助手说一遍）。 */
  readonly prompt: (input: AccountCollectInput) => string;
  /** 采集页副标题（空串＝不出）。 */
  readonly subtitle: (input: AccountCollectInput) => string;
  /** 采集页「已有账户」那张只读表的标题。 */
  readonly registerCaption: string;
  /** 账户表为空时那两句（空态句 ＋ 下一步）。 */
  readonly emptyAccounts: { readonly text: string; readonly next: string };
  /** 回执页读数行除状态卡之外的几格。 */
  readonly receiptCards: (input: AccountReceiptInput) => readonly KpiCardInput[];
  /** 回执页的结果块（`null`＝这一件不出）：模板把它拼成一块带锚点的小表 ＋ 一句口径。 */
  readonly result: (input: AccountReceiptInput) => {
    readonly navText: string;
    readonly caption: string;
    readonly rows: readonly { readonly k: string; readonly v: string }[];
    readonly note: string;
  } | null;
  /** 回执页的口径说明行（空串＝不出）。 */
  readonly receiptNote: string;
  /** 回执页明细表的标题。 */
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

/** 一个参数值的上屏文本（空白串＝空；不做 `—` 占位，那由落点行自己说清「待填」）。 */
function strOf(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim();
}

/** 采集页那四／五行落点账本（值即本页已知的事实；待填的格写清「待填」）。 */
function collectLedgerOf(input: AccountCollectInput, at: string): readonly TicketSheetRow[] {
  const name = strOf(input.params['name']);
  const from = strOf(input.params['from']);
  const to = strOf(input.params['to']);
  const pair = from !== '' || to !== '' ? [from, to].filter((s) => s !== '').join(' → ') : '';
  const rows: TicketSheetRow[] = [];
  if (input.op === 'transfer') rows.push({ label: '分类', value: '—（转账不计收支）' });
  rows.push({ label: '账户', value: name !== '' ? name : pair !== '' ? pair : '—（待填）' });
  rows.push({ label: '账本', value: input.op === 'transfer' ? '转账（记成转账）' : '账户和账本' });
  rows.push({ label: '时间', value: at });
  rows.push({ label: '编号', value: '—（还没记）' });
  return rows;
}

/** 过程型采集页（①）：缺项时出这一页（只采集、不写库）。 */
function collectPage(spec: AccountFormSpec, input: AccountCollectInput): string {
  const blocked = input.blocked;
  const missing = blocked.length;
  const preview = spec.preview(input);
  const at = timeOf(input.params, input.actionAt);
  const envelope = envelopeOf(input.key, false, blockedMessageOf(spec.word, blocked));
  const entry = [
    missing === 0 ? '' : renderConclusionBar(spec.word + '还差 ' + String(missing) + ' 项，补齐就能写进去'),
    blockedFoldOf({ blocked, command: blockedCommandOf(input.key, input.params, blocked) }),
    spec.note === '' ? '' : renderCaliberLine(spec.note),
    preview.length === 0 ? '' : renderConclusionBar('将执行以下操作') + renderDataTable({
      columns: [{ key: 'k', label: '步骤' }, { key: 'v', label: '值' }],
      rows: preview, caption: spec.previewCaption,
    }),
    input.accounts.length === 0 ? emptyOf(spec.emptyAccounts) : accountsTableOf(input.accounts, spec.registerCaption),
    renderParamForm({ description: spec.fieldDescription, fields: fieldsOf(input) }),
    promptBlockOf(spec.prompt(input)),
  ].join('');
  return collectSheetPage({
    docTitle: DOC_TITLE + '·采集页',
    brand: '饼干记账 · ' + spec.word,
    title: missing > 0 ? spec.word + '还差 ' + String(missing) + ' 项' : spec.word + '等你确认',
    subtitle: spec.subtitle(input),
    summary: {
      eyebrow: missing > 0 ? '待补槽位' : '等你确认',
      value: String(missing),
      unit: '项',
      note: missing > 0
        ? '缺：' + blocked.map((b) => b.label).join('、')
        : '值都齐了，看准了就复制下面那句。',
    },
    headExtraHtml: badgeOf({
      word: spec.word,
      caliber: spec.caliber,
      status: missing > 0 ? 'danger' : 'warn',
      statusText: missing > 0 ? '还没写进去' : '等你确认',
      next: missing > 0
        ? '还差 ' + String(missing) + ' 项：补齐了，再说一遍「' + spec.word + '」。'
        : '这一页先不写库；看准了就照下面那句复制。',
    }),
    ledgerTitle: '账户落点',
    ledger: collectLedgerOf(input, at),
    entryTitle: '待填',
    entryTag: 'ENTRY',
    entryHtml: entry,
    check: missing > 0 ? '还没记 ／ 共 0 条 ／ 没有异常' : '等你确认 ／ 共 0 条 ／ 没有异常',
    tailHtml: sourceNoteOf({ sourceText: SOURCE_COLLECT_TEXT, start: at, end: at, count: 0 }),
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
  const result = spec.result(input);
  const blocks: readonly PageBlock[] = [
    navBlock(renderKpiGrid([
      receiptStatusCard(receipt.noChange, '值与改前一致', '已经记进账户表与账本'),
      ...spec.receiptCards(input),
    ]), 'sec-kpi', '读数'),
    ...(result === null ? [] : [navBlock(
      renderDataTable({
        columns: [{ key: 'k', label: '记录' }, { key: 'v', label: '值' }],
        rows: result.rows, caption: result.caption,
      }) + (result.note === '' ? '' : renderCaliberLine(result.note)),
      'sec-result', result.navText,
    )]),
    { html: spec.receiptNote === '' ? '' : renderCaliberLine(spec.receiptNote) },
    navBlock(renderDataTable({
      columns: [{ key: 'k', label: '字段' }, { key: 'v', label: '值' }],
      rows: input.detail, caption: spec.detailCaption,
    }), 'sec-detail', '明细'),
    navBlock(reconcileOf({ actionAt: receipt.actionAt, changed: receipt.affectedRows, note: RECONCILE_NOTE }),
      'sec-reconcile', '对账'),
  ];
  return receiptSheetPage({
    docTitle: DOC_TITLE + '·写库回执',
    brand: '饼干记账 · ' + spec.word,
    title: spec.word + ' · 回执',
    subtitle: receipt.summary,
    summary: {
      eyebrow: receipt.noChange ? '没改动' : '已记好',
      value: String(receipt.affectedRows),
      unit: '处',
      note: receipt.summary,
      ...(receipt.noChange ? {} : { stamp: '有效' }),
    },
    headExtraHtml: badgeOf({
      word: spec.word, caliber: spec.caliber, status: 'ok', statusText: '已经写进去了',
      next: '这一件事办完了，不用再做什么。',
    }),
    ledgerTitle: '账户落点',
    ledger: [
      { label: '账户', value: receipt.after === null ? '账户表已更新' : receipt.after.name + '（' + (receipt.after.type.trim() === '' ? '—' : receipt.after.type) + '）' },
      { label: '账本', value: '账户和账本（已记好）' },
      { label: '时间', value: at },
      { label: '编号', value: receipt.renamedRows > 0 ? '—（连带 ' + String(receipt.renamedRows) + ' 笔流水改名）' : '—（账户域无小票编号）' },
    ],
    detailTitle: '明细',
    detailTag: 'DETAIL',
    blocks,
    check: '已经记进账本 ／ 共 ' + String(receipt.affectedRows) + ' 条 ／ 没有异常',
    tailHtml: sourceNoteOf({ sourceText: SOURCE_WRITE_TEXT, start: at, end: at, count: receipt.affectedRows }),
    actions: copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_WRITE, detail: spec.logDetail(input), actionAt: receipt.actionAt,
    }),
    foot: '饼干记账 · ' + spec.word + '回执',
    styleHtml: accountStyleTag(),
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}
