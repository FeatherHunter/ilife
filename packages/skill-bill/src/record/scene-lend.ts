/** 场景件：记借出（`kind=lend`）。
 *
 * 服务哪条唤醒词：记借出（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'lend' }`）。
 * 这一件出的两张页（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记借出」那一行）：
 *   采集页：类型徽章（借出·#借贷 流转）、结论摘要行、借贷口径三格卡、借出对象与期限字段、
 *           流程三段式（借给谁→这一步→结果）、候选单选（同一个人名下还没还的借出记录）、
 *           缺项阻断条、复制 prompt 区、复制区；
 *   回执页：类型徽章、结论摘要行、#tag 流转条、写入明细表、对账折叠区、退出口、复制区。
 * 另一半的场景事实：分类「借贷/借出」、账本「借贷」、**金额写负数**（钱出去）、
 *   备注写 `#借出 #借给<对象> #未还`；对象没给或金额方向不符都不许写库。
 *   「同一个人名下还没还的借出」候选**只列带 `#未还` 的借出记录**——已还的不列，
 *   一眼看出这个人手上还有没有没还的，免得同一笔记两遍。
 *
 * 缺项阻断：槽位表缺的（分类／金额）走共用位 `blockedItems`；本型自己多要两格**借给谁**与**金额方向**，
 *   少了或反了都不出可复制的写库指令（页面侧闸门；写库那一半的闸门在 `src/record/write.ts`，公共件，本窗不许改）。
 * 期限那一格只在借贷两型出（施工图第四节点名要修老侧 `#deadlineWrap` 的无条件建点）。
 */
import { renderToast } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { candidateRows } from '../shared/candidatePick.js';
import type { CandidateItem } from '../shared/candidatePick.js';
import { copyArea, copyLog, undoExit } from '../shared/copyArea.js';
import { flowSteps } from '../shared/flowSteps.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { money2, summaryCards, summaryRow } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { typeBadge } from '../shared/typeBadge.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

const KIND = 'lend';
/** 借贷两型各落一个分类与一个账本（老侧同一处口径）。 */
const CATEGORY = '借贷/借出';
const LEDGER = '借贷';
/** 这一型自己多要的两格：借给谁 ＋ 期限。 */
const WHO_NAME = 'who';
const WHO_LABEL = '借给谁';
const DUE_NAME = 'due';
const DUE_LABEL = '期限';
/** 借贷标签三件套（本件唯一写一次）。 */
const TAG_LEND = '#借出';
const TAG_UNPAID = '#未还';
const CAND_MAX = 6;

/** 一个值的字符串形态。 */
function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' ? String(v) : '';
}

/** 金额：数字或数字串；解析不出给 `null`。 */
function amountOf(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(textOf(v));
  return Number.isFinite(n) ? n : null;
}

/** 候选：备注里同时带 `#借出` 与 `#未还` 的记录（老侧 `scripts/render_write.py` 同一条件）。 */
function unpaidLendsOf(recent: CollectInput['recent']): CandidateItem[] {
  const out: CandidateItem[] = [];
  for (const r of recent) {
    if (!r.note.includes(TAG_LEND) || !r.note.includes(TAG_UNPAID)) continue;
    out.push({
      id: r.id,
      label: r.category + ' · ' + r.note.replace(/#/g, ''),
      amount: money2(r.amount),
      time: r.time,
      why: '还带 ' + TAG_UNPAID + '：这一笔还没还回来（已还过的不列在这里）',
    });
    if (out.length >= CAND_MAX) break;
  }
  return out;
}

/** 第几段用的人都认得的那三段（借给谁 → 这一步 → 结果）。 */
function stepsOf(input: {
  readonly params: Record<string, unknown>;
  readonly slots: CollectInput['slots'];
  readonly who: string;
  readonly due: string;
  readonly amount: number | null;
  readonly unpaid: readonly CandidateItem[];
  readonly blockedCount: number;
}): string {
  const { params, who, due, amount, unpaid, blockedCount } = input;
  return flowSteps({
    steps: [
      {
        title: '借给谁',
        note: '对象与期限是借贷这一族的必需格：对象没给不许写库；期限只在这一族里有。',
        done: who !== '',
        state: who === '' ? '还没给对象' : '借给 ' + who + (due === '' ? '' : ' · 期限 ' + due),
        fields: [
          { name: WHO_NAME, label: WHO_LABEL, hint: '借给谁（实名的写称呼也行，如 小王）', required: true, ...(who === '' ? {} : { value: who }) },
          { name: DUE_NAME, label: DUE_LABEL, hint: '说好什么时候还（如 2026-12-31 或 下月底）', ...(due === '' ? {} : { value: due }) },
        ],
        html: unpaid.length === 0
          ? ''
          : candidateRows(unpaid),
      },
      {
        title: '借出（这一步）',
        note: '金额写负数（钱出账）、分类「' + CATEGORY + '」、账本「' + LEDGER + '」；账户是钱从哪张卡出去。',
        done: amount !== null && textOf(params.category) !== '',
        fields: input.slots.map((s) => ({
          name: s.name,
          label: s.name === 'amount' ? '借出金额（负数）' : s.name === 'category' ? '分类（固定）' : s.label,
          hint: s.name === 'ledger' ? '账本固定「' + LEDGER + '」，跨账本要在备注里说明' : s.hint,
          ...(s.required ? { required: true } : {}),
          value: s.name === 'category' && textOf(params.category) === ''
            ? CATEGORY
            : (s.name === 'ledger' && textOf(params[s.name]) === '' ? LEDGER : textOf(params[s.name])),
        })),
      },
      {
        title: '结果',
        note: '备注写「' + TAG_LEND + ' 借给' + (who === '' ? '<对象>' : who) + ' ' + TAG_UNPAID + '」；'
          + '还回来的时候走「记收回」，把 ' + TAG_UNPAID + ' 换成 #已还（金额不动）。',
        done: blockedCount === 0,
        state: blockedCount === 0 ? '可以复制' : '还差 ' + blockedCount + ' 项',
      },
    ],
  });
}

/** 采集页正文：摘要行 ＋ 借贷口径三格卡 ＋ 流程三段式 ＋ 阻断条 ＋ 两段复制区。 */
function collectPage(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const who = textOf(params[WHO_NAME]);
  const due = textOf(params[DUE_NAME]);
  const amount = amountOf(params.amount);
  const base = blockedItems({ params, missing, kind: KIND });
  const extra: BlockedItem[] = [];
  if (who === '') extra.push({ name: WHO_NAME, label: WHO_LABEL, why: '没给：借给谁不许空着（这一族靠对象认人）' });
  if (amount !== null && amount > 0) {
    extra.push({ name: 'amount', label: '金额', why: '方向不符：借出是钱出去，写负数，给的是 ' + money2(amount) });
  }
  const blocked = [...base, ...extra];
  const message = blockedMessage(missing, base)
    + (extra.length === 0 ? '' : '；本型另需：' + extra.map((i) => i.label).join('、'));
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok: false, message },
  };
  const facts: SummaryFacts = {
    amount,
    category: textOf(params.category) === '' ? CATEGORY : textOf(params.category),
    account: textOf(params.account),
    ledger: textOf(params.ledger) === '' ? LEDGER : textOf(params.ledger),
    time: textOf(params.time),
  };
  const unpaid = unpaidLendsOf(input.recent);
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  const prompt = (blocked.length === 0 ? '照下面这个口径记这一笔借出，并留意同一人名下还没还的那几笔。' : '这一笔还差 ' + blocked.length + ' 项：'
    + blocked.map((i) => i.label + '（' + i.name + '：' + i.why + '）').join('、') + '。')
    + '\n请加载「饼干记账」技能，帮我记一笔借出（唤醒词：记借出）：\n'
    + '借给谁：' + (who || '<借给谁>') + '；期限：' + (due || '<期限>') + '\n'
    + '借出金额：' + money2(amount) + '（支出取负数）\n'
    + '分类：「' + CATEGORY + '」；账本：「' + LEDGER + '」；账户：' + (facts.account || '<哪张卡出去>') + '\n'
    + '备注请写：「' + TAG_LEND + ' 借给' + (who || '<对象>') + ' ' + TAG_UNPAID + '」，'
    + '还回来的时候走「记收回」把 ' + TAG_UNPAID + ' 换成 #已还。';
  const content = [
    typeBadge({
      kind: KIND, key,
      status: blocked.length > 0 ? 'danger' : 'warn',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
    }),
    summaryRow(facts),
    renderCaliberLine('借贷走标签流转：这一笔写「' + TAG_LEND + ' #借给<对象> ' + TAG_UNPAID + '」，还回来时把 ' + TAG_UNPAID + ' 换成 #已还，金额不动。'),
    renderKpiGrid([
      { label: '借出金额', value: money2(amount), detail: '支出记负数 · 分类「' + CATEGORY + '」' },
      { label: '借给谁', value: who === '' ? '未给' : who, detail: due === '' ? '期限还没给（可后补）' : '期限 ' + due },
      { label: '同人未还', value: unpaid.length + ' 笔', detail: unpaid.length === 0 ? '这个人名下没有还没还的借出' : '只列带 ' + TAG_UNPAID + ' 的借出记录' },
    ]),
    renderToast({
      msg: '借贷标签流转：' + TAG_LEND + ' ＋ ' + TAG_UNPAID,
      lines: [
        '这一笔打 ' + TAG_LEND + ' 与 ' + TAG_UNPAID + '，对象写进备注（#借给' + (who || '<对象>') + '）。',
        '收回的时候走「记收回」：原记录 ' + TAG_UNPAID + ' 换成 #已还，金额不动。',
        '「查欠款」与「看借贷」按这两个标签数，不按金额猜。',
      ],
      badge: { text: '借贷流转', type: 'warn' },
    }),
    stepsOf({ params, slots, who, due, amount, unpaid, blockedCount: blocked.length }),
    blockedBar({ items: blocked, command: commandLine(key, filled) }),
    copyArea({
      prompt: { text: prompt, label: blocked.length === 0 ? '复制 prompt（照这个口径记一笔）' : '复制 prompt（补齐后重跑）' },
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(key, params),
          source: input.source,
          detail: '未写库（采集页）',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·记借出', title: '记一笔借出', subtitle: message,
    slot: 'collect', page: 'collect', shape: envelope.shape, key, content,
  });
}

/** 回执页正文：#tag 流转条 ＋ 写入明细表 ＋ 对账折叠区 ＋ 退出口 ＋ 复制区。 */
function receiptPage(input: ReceiptInput): string {
  const { key, params, receipt } = input;
  const who = textOf(params[WHO_NAME]);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    typeBadge({ kind: KIND, key, status: 'ok', state: '写库成功' }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      { label: '借贷标签', value: TAG_LEND + ' ＋ ' + TAG_UNPAID, detail: who === '' ? '对象没随这次写库给到' : '备注里的对象：#借给' + who },
    ]),
    renderToast({
      msg: '借贷标签流转：这一笔打 ' + TAG_LEND + ' 与 ' + TAG_UNPAID,
      lines: [
        '分类「' + CATEGORY + '」· 账本「' + LEDGER + '」· 金额 ' + money2(input.facts.amount) + '（支出负数）',
        who === '' ? '对象：这次没给到（这一笔仍已落库，补对象走「改记录」）' : '对象写进备注：#借给' + who,
        '还回来的时候走「记收回」把 ' + TAG_UNPAID + ' 换成 #已还；撤销走本页退出口。',
      ],
      badge: { text: '借贷流转', type: 'ok' },
    }),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: input.detail,
      caption: '本次写入的字段与值',
    }),
    reconcileDisclosure(receipt),
    receipt.recordId === null ? '' : undoExit(receipt.recordId),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(key, params),
          source: receipt.source,
          detail: '影响 ' + receipt.affectedRows + ' 行 · 字段 ' + (receipt.writtenFields.join('/') || '未设置'),
          actionAt: receipt.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·写库回执', title: '记借出 · 回执', subtitle: receipt.summary,
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key, content,
  });
}

export const SCENE: Scene = {
  id: 'lend',
  wakeWord: '记借出',
  key: 'bill.record.add',
  kind: 'lend',
  op: '',
  family: '特殊收支族',
  collect: collectPage,
  receipt: receiptPage,
};
