/** 账户域模板之二 · **改账户确认页型**（`t685-按域页型表.md` §2.5 第 2 行／#688 §五 5.1 的 ② 过程型确认页）。
 *
 * **本件是这一片页型的块位序列唯一住所**：确认页与它那一张回执页的块序、出现条件、吃的数据都写在这里；
 *  场景件 `scene-update.ts` 只给差异值——唤醒词、口径句、文案。改一次这一片页型的版式只动本件一处。
 *
 * 盖住的场景：改账户 `update`（老 `账户/confirm.html`，`scenes/account.yaml` 里是**选择**型）。
 * 老侧是「确认页（不写库）＋ CLI 另写」两段；新侧一命令一页（照 #688 裁定 8）：
 *   缺项／账户认不出来 ⇒ 出确认页（只读回显原账户 ＋ 变更预览 ＋ 缺项阻断）；
 *   齐了 ⇒ 写库出回执页（结果块给**改前改后对照**，正是老确认页那张 diff 表要用户核的东西）。
 *
 * **块位序列（#1118 起走票据纸三页型）**：差异值交给 `../shared/票据纸页型.js` 的
 *  `collectSheetPage`／`receiptSheetPage`——
 *  确认页（②）：店头 ● → 徽章列 ● → 主数字（待补槽位）● → 落点 LEDGER ● → 待填 ENTRY
 *    （结论条 ○／阻断折叠 ●／口径行 ○／只读回显 ○／变更预览 ○／账户表与空态 ○／字段卡 ●／口令块 ●）●
 *    → 对账 CHECK ● → 来源脚注 ● → 按钮区 ● → 纸外脚注 ●；确认页是过程型故不出页内导航。
 *  回执页（④）：店头 ● → 徽章列 ● → 主数字（已记好）● → 落点 LEDGER ● → 页内导航 ●
 *    → 明细 DETAIL（读数行 ●／改了什么 ●／口径行 ○／明细表 ●／对账折叠 ●）● → 对账 CHECK ●
 *    → 来源脚注 ● → 按钮区 ● → 纸外脚注 ●。
 *
 * 谁在用（一个调用点，指名）：`src/account/scene-update.ts`——它的 `collect`／`receipt` 两格
 *  都是 `bindAccountUpdatePages(spec)` 的产物，本件不自己出页。
 */
import { renderCaliberLine, renderChangeRows, renderConclusionBar, renderDataTable, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import type { ChangeRowInput, KpiCardInput } from 'base-paint/blocks';
import { collectSheetPage, receiptSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import type { AccountRow } from './accounts.js';
import type { AccountBlocked } from './params.js';
import { ACCOUNT_SLOTS, CHANGE_SLOT, textOf } from './params.js';
import {
  SOURCE_COLLECT, SOURCE_COLLECT_TEXT, SOURCE_WRITE, SOURCE_WRITE_TEXT, MISSING, accountStyleTag, accountsTableOf,
  badgeOf, blockedCommandOf, blockedFoldOf, copyZoneOf, emptyOf, envelopeOf, promptBlockOf, reconcileOf,
  receiptStatusCard, slotFieldsOf, sourceNoteOf, textOrDash, timeOf,
} from './pageParts.js';
import type { AccountCollectInput, AccountReceiptInput, AccountWriteScene } from './scene.js';

/** 对账折叠区里那句怎么核对。 */
const RECONCILE_NOTE = '账户余额由收支流水累计推算；改名之后历史流水也跟着换了名字，核对时看账本里那几笔就是。';

/** 场景给模板的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。 */
export interface AccountUpdateSpec {
  /** 唤醒词（页标题、结论条、下一步动作、复制日志的场景标识都读它）。 */
  readonly word: string;
  /** 类型徽章第二枚胶囊那句话。 */
  readonly caliber: string;
  /** 确认页的口径说明行（空串＝不出这一行）。 */
  readonly note: string;
  /** 确认页字段卡的操作说明。 */
  readonly fieldDescription: string;
  /** 确认页的复制口令（照这句跟助手说一遍）。 */
  readonly prompt: (input: AccountCollectInput, target: AccountRow | null) => string;
  /** 确认页副标题（空串＝不出）。 */
  readonly subtitle: (input: AccountCollectInput, target: AccountRow | null) => string;
  /** 回执页读数行除状态卡之外的几格。 */
  readonly receiptCards: (input: AccountReceiptInput) => readonly KpiCardInput[];
  /** 回执页的口径说明行（空串＝不出）。 */
  readonly receiptNote: string;
  /** 回执页明细表的标题。 */
  readonly detailCaption: string;
  /** 回执页复制日志第 4 段后半。 */
  readonly logDetail: (input: AccountReceiptInput) => string;
}

/** 场景件拿到手的两张页（`AccountWriteScene` 的 `collect`／`receipt` 两格）。 */
export function bindAccountUpdatePages(spec: AccountUpdateSpec): Pick<AccountWriteScene, 'collect' | 'receipt'> {
  return { collect: (input) => confirmPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 这一段改动在账户那一行上改了什么（改前 → 改后；没改的不列）。确认页的预览与回执页的结果块共用本函数。 */
export function changeRowsOf(before: AccountRow, after: AccountRow): readonly ChangeRowInput[] {
  const rows: ChangeRowInput[] = [];
  if (before.name !== after.name) rows.push({ label: '账户名', before: before.name, after: after.name });
  if (before.type !== after.type) rows.push({ label: '类型', before: textOrDash(before.type), after: textOrDash(after.type) });
  if (before.disabled !== after.disabled) {
    rows.push({ label: '状态', before: before.disabled ? '已停用' : '使用中', after: after.disabled ? '已停用' : '使用中' });
  }
  return rows;
}

/** 按名字在账户表里找目标（找不到给 `null`；本件不抛——那一岔走「认不出来」那条路）。 */
function targetOf(input: AccountCollectInput): AccountRow | null {
  const name = textOf(input.params['name']);
  return input.accounts.find((a) => a.name === name) ?? null;
}

/** 用户想改成什么（预览用；缺的口子不预览）。 */
function previewOf(input: AccountCollectInput, target: AccountRow | null): readonly ChangeRowInput[] {
  const rows: ChangeRowInput[] = [];
  const next = textOf(input.params['new-name']);
  if (next !== '' && next !== target?.name) rows.push({ label: '账户名', before: target?.name ?? MISSING, after: next });
  if (input.params['disable'] === true) {
    rows.push({ label: '状态', before: target?.disabled === true ? '已停用' : '使用中', after: '已停用' });
  }
  if (input.params['enable'] === true) {
    rows.push({ label: '状态', before: target?.disabled === true ? '已停用' : '使用中', after: '使用中' });
  }
  return rows;
}

/** 确认页那一条载荷说明（envelope 的 `message`）。 */
function messageOf(word: string, blocked: readonly AccountBlocked[]): string {
  if (blocked.length === 0) return word + '：等你确认（这一页还没写库）';
  return word + '还差 ' + String(blocked.length) + ' 项：' + blocked.map((b) => b.label).join('、')
    + '（已出确认页，补齐之后跟助手说一遍）';
}

/** 确认页那几行落点账本。 */
function confirmLedgerOf(input: AccountCollectInput, target: AccountRow | null, at: string): readonly TicketSheetRow[] {
  const name = textOf(input.params['name']);
  return [
    { label: '账户', value: target !== null ? target.name : name !== '' ? name + '（认不出来）' : '—（待填）' },
    { label: '账本', value: '账户和账本' },
    { label: '时间', value: at },
    { label: '编号', value: '—（还没记）' },
  ];
}

/** 过程型确认页（②）：只读回显 ＋ 变更预览 ＋ 缺项阻断；**不写库**。 */
function confirmPage(spec: AccountUpdateSpec, input: AccountCollectInput): string {
  const blocked = input.blocked;
  const missing = blocked.length;
  const target = targetOf(input);
  const preview = target === null ? [] : previewOf(input, target);
  const at = timeOf(input.params, input.actionAt);
  const envelope = envelopeOf(input.key, false, messageOf(spec.word, blocked));
  const entry = [
    missing === 0 ? '' : renderConclusionBar(spec.word + '还差 ' + String(missing) + ' 项，补齐就能写进去'),
    blockedFoldOf({ blocked, command: blockedCommandOf(input.key, input.params, blocked) }),
    spec.note === '' ? '' : renderCaliberLine(spec.note),
    target === null ? '' : renderDataTable({
      columns: [{ key: 'k', label: '字段' }, { key: 'v', label: '当前值' }],
      rows: [
        { k: '账户名', v: target.name },
        { k: '类型', v: textOrDash(target.type) },
        { k: '状态', v: target.disabled ? '已停用' : '使用中' },
      ],
      caption: '要改的就是这个账户',
    }),
    preview.length === 0
      ? ''
      : renderConclusionBar('改了之后是这样') + renderChangeRows({ rows: preview })
        + renderCaliberLine('执行后历史流水保留；改名会同步更新这个账户的历史记录。'),
    target === null
      ? accountsTableOf(input.accounts, '账户表里挑一个（账户名照上面这一列写）')
        + emptyOf({
          title: '这个账户认不出来',
          text: textOf(input.params['name']) === ''
            ? '还没说清要改哪一个账户。'
            : '账户表里没有「' + textOf(input.params['name']) + '」这个账户。',
          next: '照上面那张表里的账户名说一遍，或者先说「新增账户」把它登记进来。',
        })
      : '',
    renderParamForm({
      description: spec.fieldDescription,
      fields: slotFieldsOf(input.params, ACCOUNT_SLOTS[input.op].map((s) => (
        s.name === CHANGE_SLOT.name
          ? { name: 'new-name', label: CHANGE_SLOT.label, hint: CHANGE_SLOT.hint, required: true }
          : { name: s.name, label: s.label, hint: s.hint, required: s.required }
      ))),
    }),
    promptBlockOf(spec.prompt(input, target)),
  ].join('');
  return collectSheetPage({
    docTitle: DOC_TITLE + '·改账户确认',
    brand: '饼干记账 · ' + spec.word,
    title: missing > 0 ? spec.word + '还差 ' + String(missing) + ' 项' : spec.word + '等你确认',
    subtitle: spec.subtitle(input, target),
    summary: {
      eyebrow: missing > 0 ? '待补槽位' : '等你确认',
      value: String(missing),
      unit: '项',
      note: missing > 0 ? '缺：' + blocked.map((b) => b.label).join('、') : '值都齐了，看准了就复制下面那句。',
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
    ledger: confirmLedgerOf(input, target, at),
    entryTitle: '待填',
    entryTag: 'ENTRY',
    entryHtml: entry,
    check: missing > 0 ? '还没记 ／ 共 0 条 ／ 没有异常' : '等你确认 ／ 共 0 条 ／ 没有异常',
    tailHtml: sourceNoteOf({ sourceText: SOURCE_COLLECT_TEXT, start: at, end: at, count: 0 }),
    actions: copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_COLLECT, detail: '没写库（确认页）', actionAt: input.actionAt,
    }),
    foot: '饼干记账 · ' + spec.word + '确认',
    styleHtml: accountStyleTag(),
    slot: 'collect', page: 'collect', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}

/** 结果型回执页（④）：写库成功后出这一页（写库那一半在 `./write.js`）。 */
function receiptPage(spec: AccountUpdateSpec, input: AccountReceiptInput): string {
  const { receipt } = input;
  const at = timeOf(input.params, receipt.actionAt);
  const envelope = envelopeOf(input.key, true, receipt.summary);
  const rows = receipt.before === null || receipt.after === null ? [] : changeRowsOf(receipt.before, receipt.after);
  const blocks: readonly PageBlock[] = [
    navBlock(renderKpiGrid([
      receiptStatusCard(receipt.noChange, '值与改前一致，等于没改', '已经改好了'),
      ...spec.receiptCards(input),
    ]), 'sec-kpi', '读数'),
    navBlock(rows.length === 0
      ? renderCaliberLine('这一次没有一处字段真的变了。')
      : renderChangeRows({ rows }), 'sec-change', '改了什么'),
    { html: spec.receiptNote === '' ? '' : renderCaliberLine(spec.receiptNote) },
    navBlock(renderDataTable({
      columns: [{ key: 'k', label: '字段' }, { key: 'v', label: '值' }],
      rows: input.detail, caption: spec.detailCaption,
    }), 'sec-detail', '明细'),
    navBlock(reconcileOf({ actionAt: receipt.actionAt, changed: receipt.affectedRows, note: RECONCILE_NOTE }),
      'sec-reconcile', '对账'),
  ];
  const after = receipt.after;
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
      {
        label: '账户',
        value: after === null
          ? '账户表已更新'
          : after.name + '（' + (after.type.trim() === '' ? MISSING : after.type) + '·' + (after.disabled ? '已停用' : '使用中') + '）',
      },
      { label: '账本', value: '账户和账本（已记好）' },
      { label: '时间', value: at },
      { label: '编号', value: receipt.renamedRows > 0 ? '—（连带 ' + String(receipt.renamedRows) + ' 笔流水改名）' : '—（账户域无小票编号）' },
    ],
    detailTitle: '改了什么',
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

/** 一张卡上「改完之后是什么样」的读数值（回执页读数行用）。 */
export function afterCardOf(after: AccountRow): KpiCardInput {
  return {
    label: '改完之后',
    value: after.name,
    detail: (after.type.trim() === '' ? '类型 ' + MISSING : '类型 ' + after.type)
      + ' ／ 状态 ' + (after.disabled ? '已停用' : '使用中'),
    status: after.disabled ? 'empty' : 'ok',
    statusText: after.disabled ? '已停用' : '使用中',
  };
}

/** 一句「改了几笔历史流水」的读数值（改名那一路用；没改名写 0 笔）。 */
export function renamedCardOf(renamed: number): KpiCardInput {
  return {
    label: '历史流水跟着改名',
    value: String(renamed) + ' 笔',
    detail: renamed === 0 ? '这一次没改账户名' : '这些记录上的账户名一起换过来了',
  };
}
