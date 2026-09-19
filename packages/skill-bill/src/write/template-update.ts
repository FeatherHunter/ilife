/** 写入域模板之二 · **改记录确认**（`t685-按域页型表.md` §2.1 第 5 张）。
 *
 * **本件是块位序列的唯一住所**：两张页的块序、每块的出现条件、每块吃到的数据都写在这里；场景件
 *  （`scene-update`／`scene-undo`／`scene-restore`）只给差异值——唤醒词、几句文案、中段按形态出哪一岔、
 *  回执页的结果表与退出口取哪一种。改一次版式只动本件一处，三张页同时跟着改。
 * 盖住的场景（老侧一张 `update_confirm.html` 扛三条词，本仓按「一命令一页」拆开、装配体共用一份）：
 *  改记录 `update` · 撤销 `undo` · 恢复 `restore`——三条都是 `bill.record.update` 的一支，靠 `op` 分。
 *
 * **块位序列**（照 #688 §五 5.2 的 ① 采集／④ 回执 两类；● 恒出、○ 有内容才出）：
 *   采集页：类型徽章 ● → 第 1 段标题 ○（缺项才出）→ 缺项标签 ● → 摘要行 ● → 口径行 ○（改记录不出）→
 *     第 2 段标题 ● → 缺项阻断条（折叠）● → 中段 ●（缺编号＝候选单选；选定＝只读回显 ＋ 一岔：
 *     diff 表／说明块／一行口径／不出）→ 复制 prompt 区 ● → 复制区 ● → 来源脚注 ●（#688 §五 第 26 行）
 *   回执页：类型徽章 ● → 页内导航 ●（表序第 4 行；回执页＝结果型 ④，采集页＝过程型 ① 故不出）→ 读数行 ● →
 *     口径行 ○ → 结果表 ○（撤销＝撤销标记对照、恢复＝标记现值）→ 明细表 ● → 对账折叠区 ● →
 *     退出口 ○ → 复制区 ● → 来源脚注 ●（第 26 行）
 * 谁在用（三个调用点，指名）：`src/write/scene-{update,undo,restore}.ts`——各件的 `Scene.collect`／`Scene.receipt`
 *  都是 `bindUpdatePages(spec)` 的产物，本件不自己出页。
 */
import { renderCaliberLine, renderCopyBlock, renderDataTable, renderDisclosure, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { blockedBar, blockedItems, blockedMessage } from './blockedSlots.js';
import type { BlockedItem } from './blockedSlots.js';
import { collectMissingTags, collectSectionTitle } from './collectFrame.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { diffOf, diffTable } from './diffTable.js';
import { emptyNote } from './emptyNote.js';
import { DOC_SKILL, DOC_VERSION, docTitleOf, sceneKeyOf } from '../shared/pageIdentity.js';
import { writePageShell as pageShell } from './pageParts.js';
import { diffRowsFor, pickerBlock, readRowById, snapshotTable } from './recordPicker.js';
import { receiptStatusCard, reconcileDisclosure } from './receiptParts.js';
import { summaryCards, summaryRow } from './summaryRow.js';
import type { SummaryFacts } from './summaryRow.js';
import { typeBadge } from './typeBadge.js';
import { fieldLabelOf } from './userWording.js';
import { commandLine } from '../shared/writeParts.js';
import { navBlock, pageBody, pageNav, type PageBlock } from '../shared/pageSections.js';
import { collectSourceNote, receiptSourceNote } from './sourceNote.js';
import type { BillReceipt } from '../shared/writeParts.js';
import type { BillRow } from '../fetch/db.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 采集页文案函数读到的那一份事实（形态判定只在本件做一次）。 */
interface UpdatePage {
  /** 页上认到的记录编号（没给＝null）＋ 被认到的那一行编号（读不到＝null）与撤销标记原文（读不到＝空串）。 */
  readonly id: number | null;
  readonly rowId: number | null;
  readonly deletedAt: string;
  /** 那一行是不是已带撤销标记（软删口径取 `../shared/recordPicker.js`，本件不重判一次）。 */
  readonly deleted: boolean;
  /** 读那一条那一路上的库报错收尾（读通了＝空串；空态正文后面缀的它）。 */
  readonly readFailure: string;
  /** 本次缺的槽位与本次参数（徽章状态那几句、照抄写库指令那几处文案读它们）。 */
  readonly blocked: readonly BlockedItem[];
  readonly params: Record<string, unknown>;
}

/** 中段只读回显之后那一岔：`none`＝不出／`diff`＝改前改后对照表／`caliber`＝一行口径／`note`＝一块说明。 */
type MiddleExtra =
  | { readonly kind: 'none' }
  | { readonly kind: 'diff'; readonly caption: string }
  | { readonly kind: 'caliber'; readonly text: (page: UpdatePage) => string }
  | { readonly kind: 'note'; readonly title: string; readonly text: (page: UpdatePage) => string; readonly next: string };

/** 采集页中段（第 2 段标题下面那一格）的四种形态：缺编号先挑一条，选定之后按库内那一行分三岔。 */
interface MiddleSpec {
  /** 缺编号时那块候选单选认哪些记录（`update`／`undo`／`restore` 三种过筛条件）＋ 换一句话说这一格。 */
  readonly pick: { readonly mode: 'update' | 'undo' | 'restore'; readonly hint?: string };
  /** 那一条已带撤销标记：只读回显的标题 ＋ 回显之后那一岔。 */
  readonly markedCaption: (page: UpdatePage) => string;
  readonly marked: MiddleExtra;
  /** 那一条读不到：空态标题 ＋ 正文头半句（库报错那句收尾由本件缀上，三条词共用一个写法）。 */
  readonly noRowTitle: string;
  readonly noRowText: (page: UpdatePage) => string;
  /** 那一条读到了、也没带标记：只读回显的标题 ＋ 回显之后那一岔。 */
  readonly plainCaption: (page: UpdatePage) => string;
  readonly plain: MiddleExtra;
}

/** 场景给模板的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。 */
export interface UpdateSpec {
  /** 唤醒词（页标题与几句文案里都写它；带 `op` 的两件词面不同）。 */
  readonly wake: string;
  /** 命令全名（三条词同一条 `bill.record.update`；复制指令与信封都引它一份）。 */
  readonly key: string;
  /** 采集页：类型徽章那枚状态（改记录报「三形态之一…」，撤销／恢复报缺没缺项）。 */
  readonly collectState: (page: UpdatePage) => string;
  /** 采集页：选定编号之后页标题里那句「确认什么」。 */
  readonly confirmTitle: string;
  /** 采集页：摘要行之后那一行口径（空串＝本场景不出这一行）。 */
  readonly caliber: string;
  /** 采集页：中段（候选那一格与三种选定形态各自的文案与块岔）。 */
  readonly middle: MiddleSpec;
  /** 采集页：复制 prompt 区那段话（按页上认到的编号与那一行的值算）。 */
  readonly prompt: (page: UpdatePage) => string;
  /** 回执页：类型徽章那枚状态（`ok`＝绿档、`warn`＝黄档）。 */
  readonly receiptStatus: 'ok' | 'warn';
  /** 回执页：类型徽章那句下一步。 */
  readonly receiptNext: string;
  /** 回执页：读数行之后那一行口径（空串＝本场景不出这一行）。 */
  readonly receiptCaliber: string;
  /** 回执页：明细表之前那块结果表取哪一种（`none`＝改记录不出／`undo`＝撤销标记对照／`restore`＝标记现值）。 */
  readonly receiptResult: 'none' | 'undo' | 'restore';
  /** 回执页：退出口那枚给哪件事（`undo`＝「撤销这一笔」；`restore`＝「恢复这一笔」）。 */
  readonly receiptExit: 'undo' | 'restore';
}

/** 场景件拿到手的两张页（`Scene` 的 `collect`／`receipt` 两格）。 */
export function bindUpdatePages(spec: UpdateSpec): Pick<Scene, 'collect' | 'receipt'> {
  return { collect: (input) => collectPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 撤销／恢复两件共用的徽章状态（缺项就报「已阻断」，不缺报「待核对」；改记录那一件另有三种形态的说法）。 */
export function blockedStateOf(page: UpdatePage): string {
  return page.blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库';
}

/** 撤销／恢复两件共用的「这个编号读不到」那句（编号照实写；库报错那句收尾由本件缀在话后）。 */
export function missingRowText(page: UpdatePage): string {
  return '记录编号 ' + page.id + ' 在库里读不到。';
}

/** 一个值的字符串形态（数字写十进制串，其余形态按空串用）。 */
function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' ? String(v) : '';
}

/** 记录编号：`params.id` 是正整数才算给了（其余形态一律当没给，不猜）。 */
function idOf(params: Record<string, unknown>): number | null {
  const raw = params['id'];
  const n = typeof raw === 'number' ? raw : textOf(raw) === '' ? NaN : Number(textOf(raw));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** 摘要行的事实：有原记录就取库内那一行（页面说的是那一条的现状），没有就取本次参数。 */
function factsOf(row: BillRow | null, params: Record<string, unknown>): SummaryFacts {
  if (row !== null) {
    return { amount: row.amount, category: row.category, account: row.account, ledger: row.ledger, time: row.time };
  }
  const raw = params['amount'];
  const n = typeof raw === 'number' ? raw : textOf(raw) === '' ? NaN : Number(textOf(raw));
  return {
    amount: Number.isFinite(n) ? n : null, category: textOf(params['category']), account: textOf(params['account']),
    ledger: textOf(params['ledger']), time: textOf(params['time']),
  };
}

/** 缺项时那条写库指令原文：缺的值留成尖括号占位符，**只给看不给复制**。 */
function blockedCommand(key: string, params: Record<string, unknown>, blocked: readonly BlockedItem[]): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  return commandLine(key, filled);
}

/** 缺项阻断条整条收进折叠区（判定与文案一字不动，仍是共用件 `blockedBar` 的产出，只换摆法）。 */
function blockedFold(items: readonly BlockedItem[], command: string): string {
  if (items.length === 0) return '';
  return renderDisclosure({ title: '还缺什么，以及补齐后照抄的那条', contentHtml: blockedBar({ items, command }) });
}

/** 页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状）。 */
function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key), data: { ok, message } };
}

/** 允许改的字段名单：取自槽位表（`id`／`op` 两格不是被改的字段），本件不另抄一份。 */
function changeFieldsOf(input: CollectInput): readonly string[] {
  return input.slots.filter((s) => s.name !== 'id' && s.name !== 'op').map((s) => s.name);
}

/** 采集页上认到的那一份事实：文案函数读的那一格 ＋ 那一行本身（摘要行与 diff 表要整行，只读一次库）。 */
function pageOf(input: CollectInput): { readonly page: UpdatePage; readonly row: BillRow | null } {
  const id = idOf(input.params);
  const probe = id === null ? null : readRowById(id);
  const row = probe === null ? null : probe.row;
  return {
    row,
    page: {
      id, rowId: row === null ? null : row.id, deletedAt: row === null ? '' : String(row.deleted_at),
      deleted: probe !== null && probe.deleted,
      readFailure: probe !== null && !probe.ok ? probe.reason + '。' : '',
      blocked: blockedItems({ params: input.params, missing: input.missing, kind: '' }),
      params: input.params,
    },
  };
}

/** 中段：缺编号先挑一条；选定之后按库内那一行分三岔，每岔＝只读回显 ＋ 只读回显之后那一岔块。 */
function middleBlock(spec: MiddleSpec, page: UpdatePage, row: BillRow | null, input: CollectInput): string {
  if (page.id === null) {
    return pickerBlock({ mode: spec.pick.mode, ...(spec.pick.hint === undefined ? {} : { hint: spec.pick.hint }) });
  }
  if (row === null) {
    return emptyNote({
      title: spec.noRowTitle, text: spec.noRowText(page) + page.readFailure,
      next: '核一下编号，或先说清是哪一笔。',
    });
  }
  if (page.deleted) return snapshotTable(row, spec.markedCaption(page)) + extraBlock(spec.marked, page, row, input);
  return snapshotTable(row, spec.plainCaption(page)) + extraBlock(spec.plain, page, row, input);
}

/** 只读回显之后那一岔：`none` 不出／`caliber` 一行口径／`note` 一块说明／`diff` 改前改后对照表。 */
function extraBlock(extra: MiddleExtra, page: UpdatePage, row: BillRow, input: CollectInput): string {
  if (extra.kind === 'none') return '';
  if (extra.kind === 'caliber') return renderCaliberLine(extra.text(page));
  if (extra.kind === 'note') return emptyNote({ title: extra.title, text: extra.text(page), next: extra.next });
  return diffTable({ rows: diffRowsFor({ row, params: input.params, fields: changeFieldsOf(input) }), caption: extra.caption });
}

/** 过程型采集页：缺项或缺编号时出这一页（只采集、不写库）。 */
function collectPage(spec: UpdateSpec, input: CollectInput): string {
  const { page, row } = pageOf(input);
  const facts = factsOf(row, input.params);
  const envelope = envelopeOf(spec.key, false, blockedMessage(input.missing, page.blocked));
  /** 副标题只报缺哪一项（不重复「已出采集页，补齐之后跟助手说一遍」那句）。 */
  const subtitle = page.blocked.length === 0 ? '' : '还差 ' + page.blocked.length + ' 项必需项';
  const content = [
    typeBadge({ kind: '', status: 'danger', state: spec.collectState(page), pageKind: page.id === null ? '挑一条记录' : '核对这一条', next: '' }),
    page.blocked.length === 0 ? '' : collectSectionTitle({ no: 1, title: '先看这一笔缺什么' }),
    collectMissingTags({ labels: page.blocked.map((i) => i.label) }),
    summaryRow(facts),
    spec.caliber === '' ? '' : renderCaliberLine(spec.caliber),
    collectSectionTitle({ no: 2, title: page.id === null ? '先挑一条记录' : '核对这一条' }),
    blockedFold(page.blocked, blockedCommand(spec.key, input.params, page.blocked)),
    middleBlock(spec.middle, page, row, input),
    promptCopyArea(spec.prompt(page), '挑好记录后照这句跟助手说一遍'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(spec.key, input.params), source: input.source, detail: '没写库（采集页）',
          actionAt: input.actionAt, version: DOC_VERSION,
        }),
      },
    }),
    collectSourceNote(facts.time),
  ].join('');
  return pageShell({
    docTitle: docTitleOf(spec.wake + ' 补齐槽位'),
    title: spec.wake,
    subtitle, slot: 'collect', page: 'collect', shape: envelope.shape, key: spec.key, content,
  });
}

/** 回执页的结果表：改记录不出；撤销出「撤销标记」对照（写库后再读一次那一条），恢复出标记现值。 */
function resultBlock(spec: UpdateSpec, receipt: BillReceipt): string {
  if (spec.receiptResult === 'none') return '';
  const after = receipt.recordId === null ? null : readRowById(receipt.recordId);
  const readAt = after !== null && after.ok && after.row !== null ? after.row.deleted_at : undefined;
  if (spec.receiptResult === 'restore') {
    return renderDataTable({
      columns: [{ key: 'k', label: '字段' }, { key: 'v', label: '值' }],
      rows: [
        { k: fieldLabelOf('id'), v: receipt.recordId === null ? '还没有' : String(receipt.recordId) },
        { k: fieldLabelOf('deleted_at') + '现在是什么样', v: readAt === undefined
          ? '这一页读不回这一条，以写库回执为准'
          : readAt === null || String(readAt).trim() === '' ? '已清掉，这一笔已恢复正常' : '还带着：' + String(readAt) },
        { k: '清掉之后', v: '这一笔回到查询和统计里。想再撤走就说「撤销」' },
      ],
      caption: '恢复结果',
    });
  }
  const stamped = after !== null && after.ok && after.row !== null && after.row.deleted_at !== null
    ? String(after.row.deleted_at) : '';
  const rows = stamped === ''
    ? []
    : diffOf({ fields: ['撤销标记'], before: { 撤销标记: null }, after: { 撤销标记: stamped } });
  if (rows.length > 0) return diffTable({ rows, caption: '改前改后对照　只动「撤销标记」这一项' });
  return renderDataTable({
    columns: [{ key: 'k', label: '字段' }, { key: 'v', label: '值' }],
    rows: [
      { k: fieldLabelOf('deleted_at'), v: '已打上（本页再读时已看不到这一条）' },
      { k: '撤销后能不能找回来', v: '能：点「恢复」把它找回来' },
    ],
    caption: '撤销结果',
  });
}

/** 回执页的退出口：`undo`＝「撤销这一笔」（走共用件 `../shared/copyArea.js`）；`restore`＝撤销那一张页专用的
 *  「恢复这一笔」——只留那枚按钮与一句去向说明，不带复制按钮、不带 `data-t`（复制按钮走下面复制区那一组）。 */
function exitBlock(kind: UpdateSpec['receiptExit'], recordId: number): string {
  if (kind === 'undo') return undoExit(recordId);
  return renderCopyBlock({
    title: '想反悔（把这一笔找回来）',
    buttons: [{ label: '↩︎ 恢复这一笔', kind: 'red', actionId: 'ilife-exit-restore' }],
  }) + renderCaliberLine('想反悔就用下面那颗「复制数据」，里面带着一句恢复的话。');
}

/** 回执页的结果表那一块：**有内容才进导航**（改记录不出这一块，进导航就会留一枚指向空区块的条目）。 */
function resultBlockOf(spec: UpdateSpec, receipt: BillReceipt): readonly PageBlock[] {
  const html = resultBlock(spec, receipt);
  return html === '' ? [] : [navBlock(html, 'sec-result', '结果')];
}

/** 结果型回执页：写库成功后出这一页（写库那一半在 `./write.ts`）。
 *  块清单既拼正文也派生页内导航（共用位 `../shared/pageSections.js`）；块序见件头。 */
function receiptPage(spec: UpdateSpec, input: ReceiptInput): string {
  const { receipt } = input;
  const envelope = envelopeOf(spec.key, true, receipt.summary);
  const blocks: readonly PageBlock[] = [
    navBlock(renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '这次记了几笔', value: receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      {
        label: '写进去的项', value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.length === 0 ? '没改到任何一项' : '逐项见下面的明细表',
      },
    ]), 'sec-kpi', '读数'),
    { html: spec.receiptCaliber === '' ? '' : renderCaliberLine(spec.receiptCaliber) },
    ...resultBlockOf(spec, receipt),
    navBlock(renderDataTable({
      columns: [{ key: 'k', label: '字段' }, { key: 'v', label: '值' }],
      rows: input.detail, caption: '写进去的项与值',
    }), 'sec-detail', '明细'),
    navBlock(reconcileDisclosure(receipt), 'sec-reconcile', '对账'),
    { html: receipt.recordId === null ? '' : exitBlock(spec.receiptExit, receipt.recordId) },
    navBlock(copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(spec.key, input.params), source: receipt.source,
          detail: '改了 ' + receipt.affectedRows + ' 笔，写进去 '
            + (receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项'),
          actionAt: receipt.actionAt, version: DOC_VERSION,
        }),
      },
    }), 'sec-copy', '复制'),
    { html: receiptSourceNote(input.facts.time, receipt.affectedRows) },
  ];
  const content = typeBadge({ kind: '', status: spec.receiptStatus, state: '写库成功', pageKind: '回执', next: spec.receiptNext })
    + pageNav(blocks) + pageBody(blocks);
  return pageShell({
    docTitle: docTitleOf(spec.wake + ' 回执'),
    title: spec.wake,
    subtitle: receipt.summary, slot: 'receipt', page: 'receipt', shape: envelope.shape, key: spec.key, content,
  });
}
