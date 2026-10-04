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
import { buildDataText } from 'base-paint';
import { entryCardCss, renderEntryCard, renderTicketButton, ticketButtonCss } from 'base-paint/blocks';
import type { EntryCardEntry } from 'base-paint/blocks';
import { ticketCollectRuntime } from '../shared/docPage.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { collectEntryCard, collectSheetPage, receiptSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import type { GoalBlocked } from './params.js';
import { GOAL_WRITE_SLOTS } from './params.js';
import { SOURCE_COLLECT, SOURCE_WRITE, copyZoneOf, envelopeOf, goalHelpTemplate, money, slotFieldsOf } from './pageParts.js';
import type { GoalCollectInput, GoalExistingTable, GoalReceiptInput, GoalReceiptResult, GoalWriteScene } from './scene.js';

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

/** 采集页字段卡的格子：一律取本次参数；占位里的 `{{month}}` 按当次时间代入（判地冻结在 2026-10）。 */
function fieldsOf(op: GoalCollectInput['op'], params: Record<string, unknown>, actionAt: string): ReturnType<typeof slotFieldsOf> {
  const month = actionAt.length >= 7 ? actionAt.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const fill = (s: string): string => s.split('{{month}}').join(month);
  return slotFieldsOf(params, GOAL_WRITE_SLOTS[op].map((s) => ({
    name: s.name, label: s.label, hint: fill(s.hint), note: fill(s.note), required: s.required,
  })));
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

/** 采集页那几行落点账本（判地 g01／g03 各四行）。 */
function collectLedgerOf(input: GoalCollectInput, at: string): readonly TicketSheetRow[] {
  if (input.op === 'set-budget') {
    const category = strOf(input.params['category']);
    return [
      { label: '分类', value: category !== '' ? category : '—（留空＝全月总预算）' },
      { label: '账本', value: '目标和预算' },
      { label: '时间', value: at },
      { label: '编号', value: '—（还没记）' },
    ];
  }
  return [
    { label: '分类', value: '—（储蓄目标）' },
    { label: '账本', value: '目标和预算' },
    { label: '时间', value: at },
    { label: '编号', value: '—（还没记）' },
  ];
}

/** 回执页那几行落点账本（判地 g02／g04 各四行）。 */
function receiptLedgerOf(input: GoalReceiptInput, at: string): readonly TicketSheetRow[] {
  const month = strOf(input.params['month']);
  if (input.receipt.op === 'set-budget') {
    return [
      { label: '分类', value: strOf(input.params['category']) === '' ? '全部支出（总预算）' : strOf(input.params['category']) },
      { label: '账本', value: '目标和预算（已记好）' },
      { label: '时间', value: (month === '' ? at.slice(0, 7) : month) + '（按月）' },
      { label: '编号', value: '预算表 ' + String(input.receipt.budgetCount) + ' 条' },
    ];
  }
  return [
    { label: '分类', value: '—（储蓄目标）' },
    { label: '账本', value: '目标和预算（已记好）' },
    { label: '时间', value: at },
    { label: '编号', value: '目标表 ' + String(input.receipt.savingCount) + ' 个' },
  ];
}

/** 回执页中段那两行（判地：这条是这次新加的 ／ 口径那一条）。 */
function detailRowsOf(input: GoalReceiptInput, result: GoalReceiptResult | null): readonly EntryCardEntry[] {
  if (result !== null) {
    return result.rows.map((r) => ({ title: r.k + ' ' + r.v }));
  }
  if (input.receipt.op === 'set-budget') {
    return [
      { title: '这条是这次新加的', sub: '状态 新设' },
      { title: '每月上限，按月重算', sub: '范围 全部支出（口径见落点）' },
    ];
  }
  return [
    { title: '这条是这次新加的', sub: '状态 新设' },
    { title: '按账本累计已存算进度', sub: '达成 存够就算达成' },
  ];
}

/** 过程型采集页（①）：缺项或覆盖冲突时出这一页（只采集、不写库）。 */
function collectPage(spec: GoalFormSpec, input: GoalCollectInput): string {
  const blocked = input.blocked;
  const missing = blocked.length;
  const envelope = envelopeOf(input.key, false, blockedMessageOf(spec.word, blocked));
  const hint = missing > 0
    ? '还差 ' + String(missing) + ' 项没填：' + blocked.map((b) => b.label).join('、') + '，填完才能复制。'
    : '已填齐，点上面那句复制带数据的口令。';
  /* #1130：待填区走共享件（编号 → 标签 → 右侧输入框 ＋ 每格一行灰提示），判地 g01／g03 逐字照抄。 */
  const entry = collectEntryCard(fieldsOf(input.op, input.params, input.actionAt), { text: hint, ready: missing === 0 });
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
    ledgerTitle: input.op === 'set-budget' ? '预算落点' : '目标落点',
    ledger: collectLedgerOf(input, input.actionAt),
    entryTitle: '待填',
    entryTag: 'ENTRY',
    entryHtml: entry,
    check: '还没记 ／ 共 0 条 ／ 没有异常',
    actions: renderTicketButton({
      label: '填好后复制这句话去跟助手说',
      actionId: 'ilife-collect-prompt',
      copyText: spec.prompt(input),
      disabled: missing > 0,
    }) + copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_COLLECT, detail: '没写库（采集页）', actionAt: input.actionAt,
    }),
    foot: '饼干记账 · ' + spec.word + '采集',
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
    docTitle: DOC_TITLE + '·写库回执',
    brand: '饼干记账 · ' + spec.word,
    title: receipt.summary,
    subtitle: spec.word + ' · 回执',
    summary: {
      eyebrow: '已记好',
      value: money(Number.isFinite(amount) ? amount : 0),
      unit: '元',
      note: spec.receiptNote(input),
      stamp: '有效',
    },
    ledgerTitle: receipt.op === 'set-budget' ? '预算落点' : '目标落点',
    ledger: receiptLedgerOf(input, receipt.actionAt),
    detailTitle: result === null ? '明细' : result.caption,
    detailTag: 'DETAIL',
    detailHtml: renderEntryCard({ entries: detailRowsOf(input, result) }),
    check: '已经记好 ／ 共 ' + String(receipt.affectedRows) + ' 条 ／ 没有异常',
    actions: renderTicketButton({
      label: '撤销这次设定（可恢复）',
      actionId: 'ilife-undo-' + receipt.op,
      copyText: buildDataText({ envelope, title: spec.word, format: 'text' }),
    }) + copyZoneOf({
      envelope, title: spec.word, key: input.key, params: input.params,
      source: SOURCE_WRITE, detail: spec.logDetail(input), actionAt: receipt.actionAt,
    }),
    foot: '饼干记账 · ' + spec.word + '回执',
    styleHtml: '<style>' + ticketButtonCss() + entryCardCss() + '</style>',
    slot: 'receipt', page: 'receipt', shape: 'receipt', key: input.key, paper: 'receipt',
  });
}
