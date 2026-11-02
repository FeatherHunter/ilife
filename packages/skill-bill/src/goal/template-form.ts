/** 目标域模板之一 · **设定表单页型**（`t685-按域页型表.md` §2.4 第 1 行／#688 §五 5.2 的 ① 采集 与 ④ 回执 两类）。
 *
 * **本件是这一片页型的块位序列唯一住所**：采集页与回执页的块序、每块的出现条件、每块吃的数据形态都写在这里；
 *  场景件（`scene-set-{budget,saving}.ts`）只给差异值。改一次这一片页型的版式只动本件一处。
 *
 * 盖住的场景：设定预算 `set-budget` · 设定目标 `set-saving`。
 *
 * **块位序列＝判地的序列**（#1118 收官轮；判地 `proto/acct-goal/g01…g04`）：
 *  采集页＝店头 → 主数字（待补槽位 N 项）→ 落点 LEDGER → 待填 ENTRY（字段卡 ＋ 一行「还差 N 项没填」）
 *    → 对账 CHECK → 按钮区（复制数据／复制日志）→ ✂ 裁切线 → 纸外脚注；**不出页内导航**。
 *  回执页＝店头 → 主数字（已记好 ＋ 印章）→ 落点 LEDGER → 明细 DETAIL（新设／覆盖逐行）
 *    → 对账 CHECK → 按钮区（主按钮 ＋ 复制数据／复制日志）→ ✂ 裁切线 → 纸外脚注。
 *  **判地没有的块一律不出**（徽章列／覆盖冲突提示块／已有条目只读表／空态块／结果块／来源脚注）。
 *
 * 谁在用（两个调用点，指名）：`src/goal/scene-set-{budget,saving}.ts`——两件的 `collect`／`receipt`
 *  都是 `bindGoalFormPages(spec)` 的产物，本件不自己出页。
 */
import { entryCardCss, renderEntryCard, renderTicketButton, ticketButtonCss } from 'base-paint/blocks';
import type { EntryCardEntry } from 'base-paint/blocks';
import { ticketCollectRuntime } from '../shared/docPage.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { collectEntryCard, collectSheetPage, receiptSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import type { GoalBlocked } from './params.js';
import { goalWriteSlots } from './params.js';
import { copyZoneOf, envelopeOf, goalHelpPrompt, goalHelpTemplate, money, slotFieldsOf, sourceCollect, sourceWrite } from './pageParts.js';
import type { GoalCollectInput, GoalExistingTable, GoalReceiptInput, GoalReceiptResult, GoalWriteScene } from './scene.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

/** 场景给模板件的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。
 *
 *  #1118 收官轮起**判地没有那些块**（徽章列／覆盖冲突提示／已有条目只读表／结果块）本件不再读；
 *  对应字段留着不删（场景件随下一轮清理一起收），本件只读：`word`／`fieldDescription`／`subtitle`／
 *  `result`（覆盖那一路的对照行）／`receiptNote`／`logDetail`。 */
export interface GoalFormSpec {
  /** 唤醒词（页标题、结论条与下一步动作、复制日志的场景标识都读它）。 */
  readonly word: string;
  /** 类型徽章第二枚胶囊那句话（**本件已不读**）。 */
  readonly caliber: string;
  /** 采集页的口径说明行（**本件已不读**）。 */
  readonly note: string;
  /** 采集页字段卡的操作说明。 */
  readonly fieldDescription: string;
  /** 采集页副标题（空串＝不出）。 */
  readonly subtitle: (input: GoalCollectInput) => string;
  /** 采集页「已有条目」那张只读表（**本件已不读**）。 */
  readonly existing: (input: GoalCollectInput) => GoalExistingTable;
  /** 采集页主按钮的复制载荷（缺项未齐时按钮走 disabled 档）。 */
  readonly prompt: (input: GoalCollectInput) => string;
  /** 回执页读数卡（**本件已不读**：回执行由覆盖对照或页型固定行出）。 */
  readonly receiptCards: (input: GoalReceiptInput) => readonly unknown[];
  /** 回执页的结果块（覆盖那一路的对照行；`null`＝没覆盖）。 */
  readonly result: (input: GoalReceiptInput) => GoalReceiptResult | null;
  /** 回执页主数字那一段的小字。 */
  /** 回执页主数字下那句小字（#1131 起按数据投影：截止档随数据变）。 */
  readonly receiptNote: (input: GoalReceiptInput) => string;
  /** 回执页明细表的标题（**本件已不读**：段标题按页型给）。 */
  readonly detailCaption: string;
  /** 回执页复制日志第 4 段后半（这一页干了什么）。 */
  readonly logDetail: (input: GoalReceiptInput) => string;
}

/** 场景件拿到手的两张页（`GoalWriteScene` 的 `collect`／`receipt` 两格）。 */
export function bindGoalFormPages(spec: GoalFormSpec): Pick<GoalWriteScene, 'collect' | 'receipt'> {
  return { collect: (input) => collectPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 采集页字段卡的格子：一律取本次参数；占位里的月份按当次时间给（判地冻结在 2026-10）。 */
function fieldsOf(op: GoalCollectInput['op'], params: Record<string, unknown>, actionAt: string): ReturnType<typeof slotFieldsOf> {
  const month = actionAt.length >= 7 ? actionAt.slice(0, 7) : new Date().toISOString().slice(0, 7);
  return slotFieldsOf(params, goalWriteSlots(op, month));
}

/** 采集页那一条载荷说明（envelope 的 `message`）：说清缺什么、还没写库。 */
function blockedMessageOf(word: string, blocked: readonly GoalBlocked[]): string {
  if (blocked.length === 0) return m('skill-bill.goal-template-form.c001', { p0: String(word) });
  return m('skill-bill.goal-template-form.c002', {
    p0: String(word),
    p1: String(String(blocked.length)),
    p2: String(listJoin(currentRenderLanguage(), blocked.map((b) => b.label))),
  });
}

/** 一个参数值的上屏文本（空白串＝空）。 */
function strOf(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim();
}

/** 采集页那几行落点账本（判地 g01／g03 各四行）。 */
function collectLedgerOf(input: GoalCollectInput, at: string): readonly TicketSheetRow[] {
  if (input.op === 'set-budget') {
    const category = strOf(input.params['category']);
    return [
      { label: m('skill-bill.goal-template-form.c003'), value: category !== '' ? category : m('skill-bill.goal-template-form.c004') },
      { label: m('skill-bill.goal-template-form.c005'), value: m('skill-bill.goal-template-form.c006') },
      { label: m('skill-bill.goal-template-form.c007'), value: at },
      { label: m('skill-bill.goal-template-form.c008'), value: m('skill-bill.goal-template-form.c009') },
    ];
  }
  return [
    { label: m('skill-bill.goal-template-form.c010'), value: m('skill-bill.goal-template-form.c011') },
    { label: m('skill-bill.goal-template-form.c012'), value: m('skill-bill.goal-template-form.c013') },
    { label: m('skill-bill.goal-template-form.c014'), value: at },
    { label: m('skill-bill.goal-template-form.c015'), value: m('skill-bill.goal-template-form.c016') },
  ];
}

/** 回执页那几行落点账本（判地 g02／g04 各四行）。 */
function receiptLedgerOf(input: GoalReceiptInput, at: string): readonly TicketSheetRow[] {
  const month = strOf(input.params['month']);
  if (input.receipt.op === 'set-budget') {
    return [
      { label: m('skill-bill.goal-template-form.c017'), value: strOf(input.params['category']) === '' ? m('skill-bill.goal-template-form.c018') : strOf(input.params['category']) },
      { label: m('skill-bill.goal-template-form.c019'), value: m('skill-bill.goal-template-form.c020') },
      { label: m('skill-bill.goal-template-form.c021'), value: m('skill-bill.goal-template-form.c022', { p0: String(month === '' ? at.slice(0, 7) : month) }) },
      { label: m('skill-bill.goal-template-form.c023'), value: m('skill-bill.goal-template-form.c024', { p0: String(String(input.receipt.budgetCount)) }) },
    ];
  }
  return [
    { label: m('skill-bill.goal-template-form.c025'), value: m('skill-bill.goal-template-form.c026') },
    { label: m('skill-bill.goal-template-form.c027'), value: m('skill-bill.goal-template-form.c028') },
    { label: m('skill-bill.goal-template-form.c029'), value: at },
    { label: m('skill-bill.goal-template-form.c030'), value: m('skill-bill.goal-template-form.c031', { p0: String(String(input.receipt.savingCount)) }) },
  ];
}

/** 回执页中段那两行（判地：这条是这次新加的 ／ 口径那一条）。 */
function detailRowsOf(input: GoalReceiptInput, result: GoalReceiptResult | null): readonly EntryCardEntry[] {
  if (result !== null) {
    return result.rows.map((r) => ({ title: r.k + ' ' + r.v }));
  }
  if (input.receipt.op === 'set-budget') {
    return [
      { title: m('skill-bill.goal-template-form.c032'), sub: m('skill-bill.goal-template-form.c033') },
      { title: m('skill-bill.goal-template-form.c034'), sub: m('skill-bill.goal-template-form.c035') },
    ];
  }
  return [
    { title: m('skill-bill.goal-template-form.c036'), sub: m('skill-bill.goal-template-form.c037') },
    { title: m('skill-bill.goal-template-form.c038'), sub: m('skill-bill.goal-template-form.c039') },
  ];
}

/** 过程型采集页（①）：缺项或覆盖冲突时出这一页（只采集、不写库）。 */
function collectPage(spec: GoalFormSpec, input: GoalCollectInput): string {
  const blocked = input.blocked;
  const missing = blocked.length;
  const envelope = envelopeOf(input.key, false, blockedMessageOf(spec.word, blocked));
  const hint = missing > 0
    ? m('skill-bill.goal-template-form.c040', {
      p0: String(String(missing)),
      p1: String(listJoin(currentRenderLanguage(), blocked.map((b) => b.label))),
    })
    : m('skill-bill.goal-template-form.c041');
  /* #1130：待填区走共享件（编号 → 标签 → 右侧输入框 ＋ 每格一行灰提示），判地 g01／g03 逐字照抄。 */
  const entry = collectEntryCard(fieldsOf(input.op, input.params, input.actionAt), { text: hint, ready: missing === 0 });
  return collectSheetPage({
    docTitle: m('skill-bill.goal-template-form.c042', { p0: String(DOC_TITLE) }),
    brand: m('skill-bill.goal-template-form.c043', { p0: String(spec.word) }),
    title: missing > 0 ? m('skill-bill.goal-template-form.c044', { p0: String(spec.word), p1: String(String(missing)) }) : m('skill-bill.goal-template-form.c045', { p0: String(spec.word) }),
    subtitle: spec.subtitle(input),
    summary: {
      eyebrow: m('skill-bill.goal-template-form.c046'),
      warn: true,
      value: String(missing),
      unit: m('skill-bill.goal-template-form.c047'),
      note: missing > 0 ? m('skill-bill.goal-template-form.c048', { p0: String(listJoin(currentRenderLanguage(), blocked.map((b) => b.label))) }) : m('skill-bill.goal-template-form.c049'),
    },
    ledgerTitle: input.op === 'set-budget' ? m('skill-bill.goal-template-form.c050') : m('skill-bill.goal-template-form.c051'),
    ledger: collectLedgerOf(input, input.actionAt),
    entryTitle: m('skill-bill.goal-template-form.c052'),
    entryTag: 'ENTRY',
    entryHtml: entry,
    check: m('skill-bill.goal-template-form.c053'),
    actions: renderTicketButton({
      label: m('skill-bill.goal-template-form.c054'),
      actionId: 'ilife-collect-prompt',
      copyText: spec.prompt(input),
      disabled: missing > 0,
    }) + copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: sourceCollect(), detail: m('skill-bill.goal-template-form.c055'), actionAt: input.actionAt,
    }),
    foot: m('skill-bill.goal-template-form.c056', { p0: String(spec.word) }),
    styleHtml: '<style>' + ticketButtonCss() + '</style>',
    slot: 'collect', page: 'collect', shape: 'receipt', key: input.key, paper: 'receipt',
  }) + ticketCollectRuntime({
    buttonActionId: 'ilife-collect-prompt',
    template: goalHelpTemplate(input.op === 'set-budget' ? 'goal_set_budget' : 'goal_set_saving'),
    slots: input.op === 'set-budget'
      ? [
        { name: 'amount', ph: 'amount', required: true },
        { name: 'month', ph: 'month', required: false },
        { name: 'category', ph: 'category', required: false },
      ]
      : [
        { name: 'name', ph: 'goal_name', required: true },
        { name: 'amount', ph: 'amount', required: true },
        { name: 'deadline', ph: 'deadline', required: false },
      ],
  });
}

/** 结果型回执页（④）：写库成功后出这一页（写库那一半在 `./write.js`）。 */
function receiptPage(spec: GoalFormSpec, input: GoalReceiptInput): string {
  const { receipt } = input;
  const envelope = envelopeOf(input.key, true, receipt.summary);
  const result = spec.result(input);
  const amount = Number(input.params['amount']);
  return receiptSheetPage({
    docTitle: m('skill-bill.goal-template-form.c057', { p0: String(DOC_TITLE) }),
    brand: m('skill-bill.goal-template-form.c058', { p0: String(spec.word) }),
    title: receipt.summary,
    subtitle: m('skill-bill.goal-template-form.c059', { p0: String(spec.word) }),
    summary: {
      eyebrow: m('skill-bill.goal-template-form.c060'),
      value: money(Number.isFinite(amount) ? amount : 0),
      unit: m('skill-bill.goal-template-form.c061'),
      note: spec.receiptNote(input),
      stamp: m('skill-bill.goal-template-form.c062'),
    },
    ledgerTitle: receipt.op === 'set-budget' ? m('skill-bill.goal-template-form.c063') : m('skill-bill.goal-template-form.c064'),
    ledger: receiptLedgerOf(input, receipt.actionAt),
    detailTitle: result === null ? m('skill-bill.goal-template-form.c065') : result.caption,
    detailTag: 'DETAIL',
    detailHtml: renderEntryCard({ entries: detailRowsOf(input, result) }),
    check: m('skill-bill.goal-template-form.c066', { p0: String(String(receipt.affectedRows)) }),
    actions: renderTicketButton({
      label: m('skill-bill.goal-template-form.c067'),
      actionId: 'ilife-undo-' + receipt.op,
      // #1136（返工）：同 account/template-form.ts 那一条（复制出去的纯文本走 HELP 句）。
      copyText: goalHelpPrompt(receipt.op === 'set-budget' ? 'goal_set_budget' : 'goal_set_saving', input.params),
    }) + copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: sourceWrite(), detail: spec.logDetail(input), actionAt: receipt.actionAt,
      copy: { text: goalHelpPrompt(receipt.op === 'set-budget' ? 'goal_set_budget' : 'goal_set_saving', input.params) },
    }),
    foot: m('skill-bill.goal-template-form.c068', { p0: String(spec.word) }),
    styleHtml: '<style>' + ticketButtonCss() + entryCardCss() + '</style>',
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}
