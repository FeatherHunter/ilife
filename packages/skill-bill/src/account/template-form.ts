/** 账户域模板之一 · **账户表单页型**（`t685-按域页型表.md` §2.5 第 1 行）。
 *
 * **本件是这一片页型的块位序列唯一住所**：采集页与回执页的块序、每块的出现条件、每块吃的数据形态都写在这里；
 *  场景件（`scene-{add,transfer}.ts`）只给差异值——唤醒词、口径句、操作预览、文案。
 *  改一次这一片页型的版式只动本件一处，两张页同时跟着改。
 *
 * 盖住的场景（老侧两张模板，本仓按「一命令一页」拆开、装配件共用一份）：
 *   新增账户 `add`（老 `账户/account_form.html`）· 账户转账 `transfer`（老 `账户/transfer_confirm.html`）。
 *
 * **块位序列**（照 #688 §五 5.2 的 ① 采集／④ 回执 两类；● 恒出、○ 有内容才出）：
 *   采集页（①）：类型徽章 ●（表序第 6 行）→ 结论条 ○（第 3 行，缺项才出）→ 缺项标签与阻断折叠 ●（第 16 行）
 *     → 口径说明行 ○（第 24 行）→ 操作预览 ○（第 10 行，转账才出）→ 已有账户只读表 ●／空态 ●（第 12、23 行）
 *     → 字段卡 ●（第 7 行）→ 复制指令块 ●（第 22 行）→ 复制区 ●（第 25 行）→ 来源脚注 ●（第 26 行）
 *   回执页（④）：类型徽章 ● → 页内导航 ●（第 4 行）→ 读数行 ●（第 5 行）→ 结果块 ○（第 9、12 行）
 *     → 口径说明行 ○（第 24 行）→ 明细表 ●（第 12 行）→ 对账折叠区 ●（第 21 行）→ 复制区 ● → 来源脚注 ●
 *   页内导航只回执页出（过程型页不出，照表序第 4 行的 `—`）；徽章列恒在最前（与写入域五张模板同形）。
 *
 * 谁在用（两个调用点，指名）：`src/account/scene-{add,transfer}.ts`——两件的 `collect`／`receipt`
 *  都是 `bindAccountFormPages(spec)` 的产物，本件不自己出页。
 */
import { renderCaliberLine, renderConclusionBar, renderDataTable, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import type { AccountBlocked } from './params.js';
import { ACCOUNT_SLOTS } from './params.js';
import {
  SOURCE_COLLECT, SOURCE_COLLECT_TEXT, SOURCE_WRITE, SOURCE_WRITE_TEXT, accountPageShell, accountsTableOf,
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
  /** 回执页的结果块（`null`＝这一件不出）：模板把它拼成一块带锚点的小表 ＋ 一句口径。
   *  **块位拼装住本件**，场景件只给这张表要的行与文案（判据乙：场景件里不许有块序）。 */
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

/** 过程型采集页（①）：缺项时出这一页（只采集、不写库）。 */
function collectPage(spec: AccountFormSpec, input: AccountCollectInput): string {
  const blocked = input.blocked;
  const missing = blocked.length;
  const preview = spec.preview(input);
  const at = timeOf(input.params, input.actionAt);
  const envelope = envelopeOf(input.key, false, blockedMessageOf(spec.word, blocked));
  const content = [
    badgeOf({
      word: spec.word,
      caliber: spec.caliber,
      status: missing > 0 ? 'danger' : 'warn',
      statusText: missing > 0 ? '还没写进去' : '等你确认',
      next: missing > 0
        ? '还差 ' + String(missing) + ' 项：补齐了，再说一遍「' + spec.word + '」。'
        : '这一页先不写库；看准了就照下面那句复制。',
    }),
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
    copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_COLLECT, detail: '没写库（采集页）', actionAt: input.actionAt,
    }),
    sourceNoteOf({ sourceText: SOURCE_COLLECT_TEXT, start: at, end: at, count: 0 }),
  ].join('');
  return accountPageShell({
    docTitle: DOC_TITLE + '·采集页',
    title: spec.word,
    subtitle: spec.subtitle(input),
    slot: 'collect', page: 'collect', shape: 'receipt', key: input.key, content,
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
    navBlock(copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_WRITE, detail: spec.logDetail(input), actionAt: receipt.actionAt,
    }), 'sec-copy', '复制'),
    { html: sourceNoteOf({ sourceText: SOURCE_WRITE_TEXT, start: at, end: at, count: receipt.affectedRows }) },
  ];
  const content = badgeOf({
    word: spec.word, caliber: spec.caliber, status: 'ok', statusText: '已经写进去了',
    next: '这一件事办完了，不用再做什么。',
  }) + pageNav(blocks) + pageBody(blocks);
  return accountPageShell({
    docTitle: DOC_TITLE + '·写库回执',
    title: spec.word + ' · 回执',
    subtitle: receipt.summary,
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key, content,
  });
}
