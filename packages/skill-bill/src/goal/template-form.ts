/** 目标域模板之一 · **设定表单页型**（`docs/skills/skill-bill/t685-按域页型表.md` §2.4 第 1 行／
 *  #688 §五 5.2 的 ① 采集 与 ④ 回执 两类）。
 *
 * **本件是这一片页型的块位序列唯一住所**：采集页与回执页的块序、每块的出现条件、每块吃的数据形态都写在这里；
 *  场景件（`scene-set-{budget,saving}.ts`）只给差异值——唤醒词、口径句、字段卡说明、已有条目只读表、
 *  读数卡内容、明细行与文案。改一次这一片页型的版式只动本件一处，两张页同时跟着改。
 *
 * 盖住的场景（老侧两张模板，本仓按「一族两件共用一份装配件」办）：
 *   设定预算 `set-budget`（老 `目标/budget_form.html`）· 设定目标 `set-saving`（老 `目标/saving_form.html`）。
 *
 * **块位序列（#1118 起走票据纸三页型）**：差异值交给 `../shared/票据纸页型.js` 的
 *  `collectSheetPage`／`receiptSheetPage`——
 *  采集页（①）：店头 ● → 徽章列 ● → 主数字（待补槽位 N 项）● → 落点 LEDGER ● → 待填 ENTRY
 *    （结论条 ○／覆盖冲突提示 ○／阻断折叠 ●／口径行 ○／已有条目只读表 ●／空态 ●／字段卡 ●／口令块 ●）●
 *    → 对账 CHECK ● → 来源脚注 ● → 按钮区 ● → 纸外脚注 ●；过程型页不出页内导航。
 *  回执页（④）：店头 ● → 徽章列 ● → 主数字（已记好，带印章）● → 落点 LEDGER ● → 页内导航 ●
 *    → 明细 DETAIL（读数行 ●／结果块 ○／口径行 ○／明细表 ●／对账折叠 ●）● → 对账 CHECK ●
 *    → 来源脚注 ● → 按钮区 ● → 纸外脚注 ●。
 *
 * **缺项与「覆盖冲突」走同一条阻断路径**（#688 裁定 9）：缺项时那页**不给可跑的写库指令**——
 *  折叠里那条口令只给看不给复制（`renderPreBlock` 不给 `actionId`），任何复制通道（`data-t`）都不含它。
 *
 * 谁在用（两个调用点，指名）：`src/goal/scene-set-{budget,saving}.ts`——两件的 `collect`／`receipt`
 *  都是 `bindGoalFormPages(spec)` 的产物，本件不自己出页。
 */
import { renderCaliberLine, renderConclusionBar, renderDataTable, renderFeedbackBlock, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { collectSheetPage, receiptSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import {
  DETAIL_COLUMNS, SOURCE_COLLECT, SOURCE_COLLECT_TEXT, SOURCE_WRITE, SOURCE_WRITE_TEXT, badgeOf, blockedCommandOf,
  blockedFoldOf, copyZoneOf, detailRows, emptyOf, envelopeOf, goalStyleTag, promptBlockOf, receiptStatusCard,
  reconcileOf, slotFieldsOf, sourceNoteOf,
} from './pageParts.js';
import type { GoalBlocked } from './params.js';
import { GOAL_WRITE_SLOTS } from './params.js';
import type {
  GoalCollectInput, GoalExistingTable, GoalReceiptInput, GoalReceiptResult, GoalWriteScene,
} from './scene.js';

/** 对账折叠区里那句怎么核对（两支写操作同一句）。 */
const RECONCILE_NOTE = '预算执行与目标进度都按账本里的收支流水现算，核对时看当月的记录就是。';

/** 场景给模板件的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。 */
export interface GoalFormSpec {
  /** 唤醒词（页标题、采集页的结论条与下一步动作、复制日志的场景标识都读它）。 */
  readonly word: string;
  /** 类型徽章第二枚胶囊那句话（这一片页型共两件，各说各的这一页在做什么）。 */
  readonly caliber: string;
  /** 采集页的口径说明行（空串＝不出这一行）。 */
  readonly note: string;
  /** 采集页字段卡的操作说明。 */
  readonly fieldDescription: string;
  /** 采集页副标题（空串＝不出）。 */
  readonly subtitle: (input: GoalCollectInput) => string;
  /** 采集页「已有条目」那张只读表（列／行／标题／空态两句）。 */
  readonly existing: (input: GoalCollectInput) => GoalExistingTable;
  /** 采集页的复制口令（照这句跟助手说一遍）。 */
  readonly prompt: (input: GoalCollectInput) => string;
  /** 回执页读数行除状态卡之外的几格。 */
  readonly receiptCards: (input: GoalReceiptInput) => readonly KpiCardInput[];
  /** 回执页的结果块（`null`＝这一件不出）：模板把它拼成一块带锚点的小表 ＋ 一句口径。 */
  readonly result: (input: GoalReceiptInput) => GoalReceiptResult | null;
  /** 回执页的口径说明行（空串＝不出）。 */
  readonly receiptNote: string;
  /** 回执页明细表的标题。 */
  readonly detailCaption: string;
  /** 回执页复制日志第 4 段后半（这一页干了什么）。 */
  readonly logDetail: (input: GoalReceiptInput) => string;
}

/** 场景件拿到手的两张页（`GoalWriteScene` 的 `collect`／`receipt` 两格）。 */
export function bindGoalFormPages(spec: GoalFormSpec): Pick<GoalWriteScene, 'collect' | 'receipt'> {
  return { collect: (input) => collectPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 采集页字段卡的格子：一律取本次参数（老侧表单页也是把 AI 解析出的字段透传回来回显）。 */
function fieldsOf(op: GoalCollectInput['op'], params: Record<string, unknown>): ReturnType<typeof slotFieldsOf> {
  return slotFieldsOf(params, GOAL_WRITE_SLOTS[op]);
}

/** 采集页那一条载荷说明（envelope 的 `message`）：说清缺什么、还没写库。 */
function blockedMessageOf(word: string, blocked: readonly GoalBlocked[]): string {
  if (blocked.length === 0) return word + '：等你确认（这一页还没写库）';
  return word + '还差 ' + String(blocked.length) + ' 项：' + blocked.map((b) => b.label).join('、')
    + '（已出采集页，补齐之后跟助手说一遍）';
}

/** 一个参数值的上屏文本（空白串＝空）。 */
function strOf(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim();
}

/** 采集页那几行落点账本（值即本页已知的事实；待填的格写清「待填」）。 */
function collectLedgerOf(input: GoalCollectInput, at: string): readonly TicketSheetRow[] {
  const amount = strOf(input.params['amount']);
  if (input.op === 'set-budget') {
    const month = strOf(input.params['month']);
    const category = strOf(input.params['category']);
    return [
      { label: '分类', value: category !== '' ? category : '总预算' },
      { label: '账本', value: '目标和当月支出' },
      { label: '时间', value: month !== '' ? month : '本月起' },
      { label: '金额', value: amount !== '' ? amount : '—（待填金额）' },
      { label: '编号', value: '—（还没记）' },
    ];
  }
  const name = strOf(input.params['name']);
  const deadline = strOf(input.params['deadline']);
  return [
    { label: '分类', value: '—（储蓄目标）' },
    { label: '目标', value: name !== '' ? name : '—（待填目标）' },
    { label: '账本', value: '目标和账本累计' },
    { label: '截止', value: deadline !== '' ? deadline : '不限' },
    { label: '编号', value: '—（还没记）' },
  ];
}

/** 结果块那一句落点（回执页用写完之后的事实）。 */
function receiptLedgerOf(input: GoalReceiptInput, at: string): readonly TicketSheetRow[] {
  const op = input.receipt.op;
  const month = strOf(input.params['month']);
  const name = strOf(input.params['name']);
  return [
    { label: op === 'set-budget' ? '预算' : '目标', value: op === 'set-budget'
      ? (month !== '' ? month : '本月起') + (strOf(input.params['category']) !== '' ? ' · ' + strOf(input.params['category']) : ' · 总预算')
      : (name !== '' ? name : '—') },
    { label: '账本', value: op === 'set-budget' ? '目标和预算（已记好）' : '目标和预算（已记好）' },
    { label: '时间', value: at },
    { label: '编号', value: op === 'set-budget' ? '预算表 ' + String(input.receipt.budgetCount) + ' 条' : '目标表 ' + String(input.receipt.savingCount) + ' 个' },
  ];
}

/** 过程型采集页（①）：缺项或覆盖冲突时出这一页（只采集、不写库）。 */
function collectPage(spec: GoalFormSpec, input: GoalCollectInput): string {
  const blocked = input.blocked;
  const missing = blocked.length;
  const conflict = blocked.find((b) => b.name === 'force');
  const table = spec.existing(input);
  const envelope = envelopeOf(input.key, false, blockedMessageOf(spec.word, blocked));
  const entry = [
    missing === 0 ? '' : renderConclusionBar(spec.word + '还差 ' + String(missing) + ' 项，补齐就能写进去'),
    conflict === undefined ? '' : renderFeedbackBlock({
      title: '同月同类预算已存在',
      toast: { msg: '这一条要是写进去，会把原来那条覆盖掉', detail: conflict.why, icon: 'warn' },
      staticNotice: true,
    }),
    blockedFoldOf({ blocked, command: blockedCommandOf(input.key, input.params, blocked) }),
    spec.note === '' ? '' : renderCaliberLine(spec.note),
    table.rows.length === 0 ? emptyOf(table.empty) : renderDataTable({
      columns: table.columns, rows: table.rows, caption: table.caption,
    }),
    renderParamForm({ description: spec.fieldDescription, fields: fieldsOf(input.op, input.params) }),
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
    ledgerTitle: input.op === 'set-budget' ? '预算落点' : '目标落点',
    ledger: collectLedgerOf(input, input.actionAt),
    entryTitle: '待填',
    entryTag: 'ENTRY',
    entryHtml: entry,
    check: missing > 0 ? '还没记 ／ 共 0 条 ／ 没有异常' : '等你确认 ／ 共 0 条 ／ 没有异常',
    tailHtml: sourceNoteOf({ sourceText: SOURCE_COLLECT_TEXT, start: input.actionAt, end: input.actionAt, count: 0 }),
    actions: copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_COLLECT, detail: '没写库（采集页）', actionAt: input.actionAt,
    }),
    foot: '饼干记账 · ' + spec.word + '采集',
    styleHtml: goalStyleTag(),
    slot: 'collect', page: 'collect', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}

/** 结果型回执页（④）：写库成功后出这一页（写库那一半在 `./write.js`）。 */
function receiptPage(spec: GoalFormSpec, input: GoalReceiptInput): string {
  const { receipt } = input;
  const envelope = envelopeOf(input.key, true, receipt.summary);
  const result = spec.result(input);
  const blocks: readonly PageBlock[] = [
    navBlock(renderKpiGrid([receiptStatusCard(receipt.overwritten !== null), ...spec.receiptCards(input)]),
      'sec-kpi', '读数'),
    ...(result === null ? [] : [navBlock(
      renderDataTable({ columns: DETAIL_COLUMNS, rows: detailRows(result.rows), caption: result.caption })
        + (result.note === '' ? '' : renderCaliberLine(result.note)),
      'sec-result', result.navText,
    )]),
    { html: spec.receiptNote === '' ? '' : renderCaliberLine(spec.receiptNote) },
    navBlock(renderDataTable({
      columns: DETAIL_COLUMNS, rows: detailRows(input.detail), caption: spec.detailCaption,
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
      eyebrow: '已记好',
      value: String(receipt.affectedRows),
      unit: '处',
      note: receipt.summary,
      stamp: '有效',
    },
    headExtraHtml: badgeOf({
      word: spec.word, caliber: spec.caliber, status: 'ok', statusText: '已经写进去了',
      next: '这一件事办完了，不用再做什么。',
    }),
    ledgerTitle: receipt.op === 'set-budget' ? '预算落点' : '目标落点',
    ledger: receiptLedgerOf(input, receipt.actionAt),
    detailTitle: '明细',
    detailTag: 'DETAIL',
    blocks,
    check: '已经记好 ／ 共 ' + String(receipt.affectedRows) + ' 条 ／ 没有异常',
    tailHtml: sourceNoteOf({
      sourceText: SOURCE_WRITE_TEXT, start: receipt.actionAt, end: receipt.actionAt, count: receipt.affectedRows,
    }),
    actions: copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_WRITE, detail: spec.logDetail(input), actionAt: receipt.actionAt,
    }),
    foot: '饼干记账 · ' + spec.word + '回执',
    styleHtml: goalStyleTag(),
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}
