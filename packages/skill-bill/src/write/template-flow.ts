/** 写入域模板之二 · **流程确认**（`t685-按域页型表.md` §2.1 第 2 张）。
 *
 * **本件是块位序列的唯一住所**：采集页与回执页的块序、每块的出现条件、每块吃的数据形态都写在这里；
 *  场景件（`scene-refund`／`scene-reimburse-done`／`scene-lend`／`scene-borrow`／`scene-collect`／`scene-repay`）
 *  只给差异值——唤醒词、固定分类与账本、阻断项、几句文案、哪个可选块出不出。改一次版式只动本件一处。
 * 盖住的场景：记退款 `refund` · 报销到账 `reimburse-done` · 记借出 `lend` · 记借入 `borrow` · 记收回 `collect` · 记偿还 `repay`。
 * **块位序列**（照 `t685-按域页型表.md` §2.1「流程确认」那一行；● 恒出、○ 有内容才出）：
 *   采集页：类型徽章 ● → 结论摘要行 ● → 口径徽章行 ○ → 口径行 ○ → 本型三格卡 ● → 打标说明条 ○ →
 *     缺项标签 ● → 流程三段式 ● → 缺项阻断条（折叠）● → 复制区 ●
 *   回执页：类型徽章 ● → 结论摘要行（＋状态卡与本次那两格）● → #tag 流转条 ● → 写入明细表 ● →
 *     对账折叠区 ● → 退出口 ○ → 复制区 ●
 *
 * 谁在用（六个调用点，指名）：`src/write/scene-{refund,reimburse-done,lend,borrow,collect,repay}.ts`——
 *  各件 `Scene.collect`／`Scene.receipt` 都是 `bindFlowPages(spec)` 的产物，本件不自己出页。
 */
import { renderCaliberLine, renderChips, renderDataTable, renderDisclosure, renderFeedbackBlock, renderKpiGrid } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { BillRow } from '../fetch/db.js';
import { blockedBar, blockedItems, blockedMessage } from './blockedSlots.js';
import type { BlockedItem } from './blockedSlots.js';
import { candidatePick, candidateRows } from './candidatePick.js';
import type { CandidateItem } from './candidatePick.js';
import { collectMissingTags } from './collectFrame.js';
import { copyArea, copyLog, undoExit } from '../shared/copyArea.js';
import { flowSteps } from './flowSteps.js';
import type { FlowField, FlowStepInput } from './flowSteps.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { writePageShell as pageShell } from './pageParts.js';
import { receiptStatusCard, reconcileDisclosure } from './receiptParts.js';
import { money2, summaryCards } from './summaryRow.js';
import type { SummaryFacts } from './summaryRow.js';
import { typeBadge } from './typeBadge.js';
import { fieldLabelOf } from './userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';
import type { RecordSlot } from './slots.js';

/** 提示条那一块要的图标档（`renderFeedbackBlock` 的闭集）。 */
export type NoticeIcon = 'danger' | 'ok' | 'warn' | 'copy' | 'info';

/** 一条提示条：说什么、细节是什么、哪一档图标（`renderFeedbackBlock` 那个受信形状）。 */
export interface FlowNote {
  /** 提示条的主句。 */ readonly msg: string;
  /** 主句下面那句细节。 */ readonly detail: string;
  /** 哪一档图标。 */ readonly icon: NoticeIcon;
}

/** 模板每页算好、递给场景文案函数的第一批值：**值只算一遍**，各件的几支文案函数共用它，不各算一遍。 */
export interface FlowValues {
  /** 采集页原样的入参（少数件要 `slots`／`recent`／`today`）。 */ readonly input: CollectInput;
  /** 这一页的命令全名（`bill.record.add`）。 */ readonly key: string;
  /** 本次参数。 */ readonly params: Record<string, unknown>;
  /** 槽位表里为这条命令要的那几格。 */ readonly slots: readonly RecordSlot[];
  /** 槽位表里必需的、这次没给的那些（方向不符那一半在 `blocked` 里）。 */ readonly missing: readonly RecordSlot[];
  /** 这一笔的金额（解析不出＝`null`）。 */ readonly amount: number | null;
  /** 结论摘要行的五个事实（分类／账本已按本型固定值兜底）。 */ readonly facts: SummaryFacts;
  /** 摘要行那五格：本型卡片要引其中某几格时用它，不另抄一份字面量。 */ readonly cards: readonly KpiCardInput[];
  /** 本型指向的那条原记录（没声明 `sourceSlot`、或这一格没给时，两格都是 `null`）。 */
  readonly source: { readonly id: number | null; readonly row: BillRow | null };
}

/** `FlowValues` ＋ 阻断清单 ＋ 候选：这两块要等本件那几支算完才有，故另立一层。 */
export interface FlowCtx extends FlowValues {
  /** 阻断清单：槽位缺的 ＋ 本型自己多要的（空＝这一页可以往下走写库那一步）。 */
  readonly blocked: readonly BlockedItem[];
  /** 这一页的候选（过筛条件与「为什么是它」由本件给，摆法由模板给）。 */
  readonly candidates: readonly CandidateItem[];
}

/** 流程三段式第 1 段（挑原记录那一段）的差异。 */
export interface FlowFirst {
  /** 这一段叫什么（如「原记账」「待报销记录」「借给谁」）。 */ readonly title: string;
  /** 这一段的一句说明。 */ readonly note: string;
  /** 这一段定没定（看本件自己那一格给没给）。 */ readonly done: (ctx: FlowCtx) => boolean;
  /** 徽标上那句状态（如「已认准 #15」「借给 小王，期限 下月底」）。 */ readonly state: (ctx: FlowCtx) => string;
  /** 这一段要填的格（借贷两型在这里出「借给谁／期限」）；不给＝这一段没有要填的格。 */
  readonly fields?: (ctx: FlowCtx) => readonly FlowField[];
  /** 候选那一格的单选写法（指向原记录的那四件给）；不给＝候选只列表、不在页上选（借贷两型）。 */
  readonly pick?: {
    /** 单选控件的槽位名（如 `source_id`）。 */ readonly name: string;
    /** 这一格的中文名。 */ readonly label: string;
    /** 本次已认准的那条（给 `null`＝不预选）。 */ readonly selectedId: (ctx: FlowCtx) => number | null;
    /** 这一格要的是哪一类记录（候选一条都没有时，那句反问引它）。 */ readonly hint: string;
  };
}

/** 流程三段式第 2 段（填这一笔那一段）的差异。 */
export interface FlowSecond {
  /** 这一段叫什么（如「退款这一步」「借出这一步」）。 */ readonly title: string;
  /** 这一段的一句说明（金额往哪个方向写、分类／账本固定成什么）。 */ readonly note: string;
  /** 每一格怎么写：`input.slots` 逐格过这一支（换中文名、换提示、给缺省值）。 */
  readonly field: (slot: RecordSlot, ctx: FlowCtx) => FlowField;
}

/** 场景给模板的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。 */
export interface FlowSpec {
  /** 唤醒词（页标题、副标题那句「…还差 N 项」、回执页标题都用它）。 */ readonly word: string;
  /** 认的 `kind`（阻断判定与类型徽章那枚方向口径都用它）。 */ readonly kind: string;
  /** 本型固定的分类：用户没给分类时，摘要行与各格文案都按它出。 */ readonly category: string;
  /** 本型固定的账本（借贷两型是「借贷」）；不给＝账本这一格照用户给的 `params.ledger` 原样。 */
  readonly ledger?: string;
  /** 采集页 `<title>` 的尾缀（如 `·记退款`）。 */ readonly docTitle: string;

  /** 本型多要的那一格「指向哪一条原记录」（`source_id`）：给了它，模板就把编号与那一行算进上下文、并把它并进阻断清单。 */
  readonly sourceSlot?: { readonly name: string; readonly label: string; readonly why: string };
  /** 本型另外多要的阻断项（借贷两型的对象格与金额方向）；不给＝本型不再多要。 */
  readonly extraBlocked?: (values: FlowValues) => readonly BlockedItem[];

  /** 采集页：这一页的候选（过筛条件与「为什么是它」由本件给）。 */
  readonly candidates: (values: FlowValues) => readonly CandidateItem[];

  /** 采集页：口径徽章行那几条文字（记借出／记借入不出这一行＝不给）。 */
  readonly chips?: (ctx: FlowCtx) => readonly string[];
  /** 采集页：本型三格卡之后那条口径行（借贷两型的标签流转）；不给＝不出。 */
  readonly caliber?: (ctx: FlowCtx) => string;
  /** 采集页：本型那三格卡（或本型自己给的整行读数行——见下一条）。 */
  readonly cards: (ctx: FlowCtx) => readonly KpiCardInput[];
  /** 采集页：读数行是不是「摘要五格 ＋ 本型三格」两行。
   *  不给＝是（记退款／报销到账／记借出／记偿还四件：摘要五格在前、本型三格在三段式之前）；
   *  **记借入**那一页自己给整行（今天只出「借入金额／分类／向谁借／同人未还」四格、没有摘要五格）⇒ 给 `false`：
   *  模板就把 `cards` 那一行摆到读数行那一位（chips 之前），不再另出摘要五格。
   *  这条差异是**本票照旧保留**的：把它并成族内同形会让那一页多出账户／账本／时间三格，属改版式，留给维护者定。 */
  readonly genericCards?: boolean;
  /** 采集页：打标说明条（记退款不出＝不给）。 */
  readonly note?: (ctx: FlowCtx) => FlowNote;
  /** 采集页：流程三段式那三段的差异（骨位、「第 N 段」与定没定的口径由模板摆）。 */
  readonly flow: {
    /** 第 1 段：挑原记录那一段。 */ readonly first: FlowFirst;
    /** 第 2 段：填这一笔那一段。 */ readonly second: FlowSecond;
    /** 第 3 段：结果那一段。 */
    readonly third: {
      /** 这一段叫什么（六件都叫「结果」）。 */ readonly title: string;
      /** 这一段的一句说明（原记录认没认准，这句分岔）。 */ readonly note: (ctx: FlowCtx) => string;
    };
  };
  /** 采集页：复制区那段话与它那颗按钮写什么。 */
  readonly prompt: (ctx: FlowCtx) => { readonly text: string; readonly label: string };

  /** 回执页：读数行里状态卡之后那两格。 */
  readonly receiptTail: (input: ReceiptInput) => readonly KpiCardInput[];
  /** 回执页：#tag 流转条那一块。 */
  readonly receiptNote: (input: ReceiptInput) => FlowNote;
}

/** 场景件拿到手的两张页（`Scene` 的 `collect`／`receipt` 两格）。 */
export function bindFlowPages(spec: FlowSpec): Pick<Scene, 'collect' | 'receipt'> {
  return { collect: (input) => collectPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

/** 一个值的字符串形态（六件共用这一处，不再各抄一份）。 */
export function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' ? String(v) : '';
}

/** 记录编号那一格：正整数才算给（指向原记录那四件共用）。 */
export function idOf(v: unknown): number | null {
  const n = amountOf(v);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
}

/** 分类路径换成面包屑形状（`/` 不再进正文，见 D-/-01；五件共用）。 */
export function crumbOf(category: string): string {
  return category.split('/').join(' › ');
}

/** 缺项逐项一行（**唯一定义地**）：一行一件事，不带库列名、不用顿号连写。 */
export function lackLines(blocked: readonly BlockedItem[]): string {
  return blocked.map((i) => i.label + '：' + (i.why === '没给' ? '没给' : i.why)).join('\n');
}

/** 复制 prompt 那段的头一句（**唯一定义地**）：缺项时先说还差几项再逐项列，不缺就出本件那句话。 */
export function promptHead(head: string, blocked: readonly BlockedItem[]): string {
  return blocked.length === 0 ? head : '这一笔还差 ' + blocked.length + ' 项，逐项补齐：\n' + lackLines(blocked);
}

/** 复制 prompt 那颗按钮写什么（**唯一定义地**）：可复制时用本件那句话，缺项时一律「补齐后照这句跟助手说一遍」。 */
export function promptButton(blocked: readonly BlockedItem[], ok: string): string {
  return blocked.length === 0 ? ok : '补齐后照这句跟助手说一遍';
}

/** 可列出的候选条数上限（列表是给人挑的，不是台账）。 */
const CAND_MAX = 6;

/** 候选列表的共用形状（**唯一定义地**）：过筛条件、金额对得上吗、为什么是它三项由本件给，逐条落成候选。
 *  摘要一律「分类 ＋（备注非空时）去掉井号的备注」——本族的过筛条件都要求备注带标签，故两式等价。 */
export function candidatesFrom(input: {
  readonly recent: CollectInput['recent'];
  /** 这一条算不算候选。 */ readonly keep: (row: BillRow) => boolean;
  /** 这一条的金额跟本笔对得上吗（各件判法不同，故由件给）。 */ readonly same: (row: BillRow) => boolean;
  /** 「为什么是它」那一句。 */ readonly why: (row: BillRow, same: boolean) => string;
}): CandidateItem[] {
  const out: CandidateItem[] = [];
  for (const r of input.recent) {
    if (!input.keep(r)) continue;
    out.push({
      id: r.id,
      label: r.category + (r.note === '' ? '' : '　' + r.note.replace(/#/g, '')),
      amount: money2(r.amount),
      time: r.time,
      why: input.why(r, input.same(r)),
    });
    if (out.length >= CAND_MAX) break;
  }
  return out;
}

/** 金额：数字或数字串；解析不出给 `null`（缺项那一支由阻断条说话）。 */
function amountOf(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(textOf(v));
  return Number.isFinite(n) ? n : null;
}

/** 摘要行的五个事实（**唯一定义地**）：金额按本型解析，分类与账本按本型的固定值兜底。 */
function factsOf(spec: FlowSpec, params: Record<string, unknown>, amount: number | null): SummaryFacts {
  const category = textOf(params['category']);
  const ledger = textOf(params['ledger']);
  return {
    amount,
    category: category === '' ? spec.category : category,
    account: textOf(params['account']),
    ledger: ledger === '' && spec.ledger !== undefined ? spec.ledger : ledger,
    time: textOf(params['time']),
  };
}

/** 反查「这一笔指向的原记录」：编号那一格 ＋ 近期记录里那一行。 */
function sourceOf(input: CollectInput, name: string): FlowValues['source'] {
  const id = idOf(input.params[name]);
  return { id, row: id === null ? null : (input.recent.find((r) => r.id === id) ?? null) };
}

/** 页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状）。 */
function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key), data: { ok, message } };
}

/** 缺项阻断条整条收进折叠区：首屏只留缺项标签与一行副标题，口令原文不再常驻版面。
 *  内容与判定一字不动（仍是共用件 `blockedBar` 的产出），只换摆法；折叠与否那枚置灰按钮都点不动。 */
function blockedFold(items: readonly BlockedItem[], command: string): string {
  if (items.length === 0) return '';
  return renderDisclosure({ title: '还缺什么，以及补齐后照抄的那条', contentHtml: blockedBar({ items, command }) });
}

/** 流程三段式那三段：第 1 段的候选那一块两种摆法（单选／只列表），第 2 段的字段逐格过本件那一支。 */
function stepsOf(spec: FlowSpec, ctx: FlowCtx): FlowStepInput[] {
  const { first, second, third } = spec.flow;
  const pick = first.pick;
  const html = pick === undefined
    ? candidateRows(ctx.candidates)
    : candidatePick({ name: pick.name, label: pick.label, candidates: ctx.candidates, selectedId: pick.selectedId(ctx), hint: pick.hint });
  const fields = first.fields === undefined ? [] : first.fields(ctx);
  return [
    {
      title: first.title, note: first.note, done: first.done(ctx), state: first.state(ctx),
      ...(fields.length === 0 ? {} : { fields }), ...(html === '' ? {} : { html }),
    },
    {
      title: second.title, note: second.note,
      done: ctx.amount !== null && textOf(ctx.params['category']) !== '',
      fields: ctx.slots.map((slot) => second.field(slot, ctx)),
    },
    {
      title: third.title, note: third.note(ctx), done: ctx.blocked.length === 0,
      state: ctx.blocked.length === 0 ? '可复制' : '还差 ' + ctx.blocked.length + ' 项',
    },
  ];
}

/** 过程型采集页：缺项时出这一页（只采集、不写库）。 */
function collectPage(spec: FlowSpec, input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const amount = amountOf(params['amount']);
  const facts = factsOf(spec, params, amount);
  const cards = summaryCards(facts);
  const source = spec.sourceSlot === undefined ? { id: null, row: null } : sourceOf(input, spec.sourceSlot.name);
  const values: FlowValues = { input, key, params, slots, missing, amount, facts, cards, source };
  const base = blockedItems({ params, missing, kind: spec.kind });
  const extra: BlockedItem[] = [];
  if (spec.sourceSlot !== undefined && source.id === null) {
    extra.push({ name: spec.sourceSlot.name, label: spec.sourceSlot.label, why: spec.sourceSlot.why });
  }
  if (spec.extraBlocked !== undefined) extra.push(...spec.extraBlocked(values));
  const blocked = [...base, ...extra];
  const message = blockedMessage(missing, base)
    + (extra.length === 0 ? '' : '；本型另需：' + extra.map((i) => i.label).join('、'));
  const ctx: FlowCtx = { ...values, blocked, candidates: spec.candidates(values) };
  const envelope = envelopeOf(key, false, message);
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  const prompt = spec.prompt(ctx);
  const content = [
    typeBadge({
      kind: spec.kind, status: blocked.length > 0 ? 'danger' : 'warn', next: '',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
    }),
    spec.genericCards === false ? renderKpiGrid(spec.cards(ctx)) : renderKpiGrid(cards),
    spec.chips === undefined ? '' : renderChips({ items: spec.chips(ctx).map((text) => ({ text })) }),
    spec.caliber === undefined ? '' : renderCaliberLine(spec.caliber(ctx)),
    spec.genericCards === false ? '' : renderKpiGrid(spec.cards(ctx)),
    spec.note === undefined ? '' : renderFeedbackBlock({ toast: spec.note(ctx), staticNotice: true }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    flowSteps({ steps: stepsOf(spec, ctx) }),
    blockedFold(blocked, commandLine(key, filled)),
    copyArea({
      prompt: { text: prompt.text, label: prompt.label },
      data: { envelope },
      log: { envelope, copyLog: copyLog({
        command: commandLine(key, params), source: input.source, detail: '没写库（采集页）',
        actionAt: input.actionAt, version: DOC_VERSION,
      }) },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + spec.docTitle, title: spec.word, subtitle: spec.word + '还差 ' + blocked.length + ' 项',
    slot: 'collect', page: 'collect', shape: envelope.shape, key, content,
  });
}

/** 结果型回执页：写库成功后出这一页（写库那一半在 `./write.ts`）。 */
function receiptPage(spec: FlowSpec, input: ReceiptInput): string {
  const { key, params, receipt } = input;
  const envelope = envelopeOf(key, true, receipt.summary);
  const content = [
    typeBadge({ kind: spec.kind, status: 'ok', state: '写库成功', next: '这一笔已记下，撤销见下方按钮。' }),
    renderKpiGrid([...summaryCards(input.facts), receiptStatusCard(receipt, input.writtenDetail), ...spec.receiptTail(input)]),
    renderFeedbackBlock({ toast: spec.receiptNote(input), staticNotice: true }),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }], rows: input.detail, caption: '写进去的项与值',
    }),
    reconcileDisclosure(receipt),
    receipt.recordId === null ? '' : undoExit(receipt.recordId),
    copyArea({
      data: { envelope },
      log: { envelope, copyLog: copyLog({
        command: commandLine(key, params), source: receipt.source,
        detail: '改了 ' + receipt.affectedRows + ' 笔，写进去 '
          + (receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项'),
        actionAt: receipt.actionAt, version: DOC_VERSION,
      }) },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·写库回执', title: spec.word + ' · 回执', subtitle: receipt.summary,
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key, content,
  });
}
