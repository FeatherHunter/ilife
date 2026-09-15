/** 场景件：记收回（`kind=collect`）。
 *
 * 服务哪条唤醒词：记收回（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'collect' }`）。
 * 这一件出的两张页（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记收回」那一行）：
 *   采集页：类型徽章（收回·消借出标）、结论摘要行、收回口径三格卡、超支警示条、打标说明条、
 *           流程三段式（借出记录→收回→结果，第一段用候选单选）、缺项阻断条、照这句跟助手说一遍、复制区；
 *   回执页：类型徽章、结论摘要行、#tag 流转条、写入明细表、对账折叠区、退出口、复制区。
 * 另一半的场景事实：候选**只列带 `#借出` 且还带 `#未还` 的记录**（老侧 `scripts/render_write.py:312` 的 `pool`），
 *   收回这一笔落「借贷/收回」＋ `#收回`、金额写正数，原记录把 `#未还` 换成 `#已还`（金额不动）。
 *   消标与金额都要用户确认，不按最近一笔顶替（施工图第二节「缺项阻断」那一格）。
 *
 * 缺项阻断：槽位表缺的（分类／金额）走共用位 `blockedItems`；本型自己多要一格**借出记录编号**，
 *   少了它就不出可复制的写库指令（页面侧闸门；写库那一半的闸门在 `src/record/write.ts`，公共件，本窗不许改）。
 */
import { renderToast } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { candidatePick } from '../shared/candidatePick.js';
import type { CandidateItem } from '../shared/candidatePick.js';
import { copyArea, copyLog, undoExit } from '../shared/copyArea.js';
import { flowSteps } from '../shared/flowSteps.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { money2, summaryCards, summaryRow } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { nextStepOf, typeBadge, wakeWordOf } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

const KIND = 'collect';
/** 收回一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '借贷/收回';
/** 这一格：哪一笔借出收回来了。 */
const SOURCE_NAME = 'source_id';
const SOURCE_LABEL = '借出记录编号';
/** 借贷标签：只列没还的那一批。 */
const TAG_LEND = '#借出';
const TAG_UNPAID = '#未还';
const TAG_PAID = '#已还';
const TAG_COLLECT = '#收回';
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

/** 记录编号那一格：正整数才算给。 */
function idOf(v: unknown): number | null {
  const n = amountOf(v);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
}

/** 候选：带 `#借出` 且还带 `#未还` 的记录（老侧 `pool` 同一条件）——已还的不列。 */
function unpaidLendsOf(recent: CollectInput['recent'], amount: number | null): CandidateItem[] {
  const out: CandidateItem[] = [];
  for (const r of recent) {
    if (!r.note.includes(TAG_LEND) || !r.note.includes(TAG_UNPAID)) continue;
    const same = amount !== null && Math.abs(Math.abs(r.amount) - amount) <= 0.005;
    out.push({
      id: r.id,
      label: r.category + ' · ' + r.note.replace(/#/g, ''),
      amount: money2(r.amount),
      time: r.time,
      why: (same ? '还带 ' + TAG_UNPAID + ' 且金额与收回额一致' : '还带 ' + TAG_UNPAID + ' · 金额与收回额不符'),
    });
    if (out.length >= CAND_MAX) break;
  }
  return out;
}

/** 采集页正文：摘要行 ＋ 收回口径三格卡 ＋ 超支警示条 ＋ 打标说明条 ＋ 流程三段式 ＋ 阻断条 ＋ 两段复制区。 */
function collectPage(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const source = idOf(params[SOURCE_NAME]);
  const amount = amountOf(params.amount);
  const original = source === null ? null : (input.recent.find((r) => r.id === source) ?? null);
  const base = blockedItems({ params, missing, kind: KIND });
  const extra: BlockedItem[] = source === null
    ? [{ name: SOURCE_NAME, label: SOURCE_LABEL, why: '没给：收回要指名销哪一笔的 ' + TAG_UNPAID + '，不拿最近一笔顶替' }]
    : [];
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
    ledger: textOf(params.ledger),
    time: textOf(params.time),
  };
  const candidates = unpaidLendsOf(input.recent, amount);
  const diff = amount === null || original === null ? null : Math.round((amount - Math.abs(original.amount)) * 100) / 100;
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  const prompt = (blocked.length === 0 ? '照下面这个口径记这一笔收回，并把原记录的标签换过来。' : '这一笔还差 ' + blocked.length + ' 项：'
    + blocked.map((i) => i.label + '（' + i.name + '：' + i.why + '）').join('、') + '。')
    + '\n请加载「饼干记账」技能，帮我记一笔收回（唤醒词：记收回）：\n'
    + '借出记录：' + (source === null ? '<借出记录编号>' : '#' + source + '（' + (original === null ? '近期记录里没读到' : original.category + ' ' + money2(original.amount) + ' ' + original.time) + '）') + '\n'
    + '收回金额：' + money2(amount) + '（收入正数）\n'
    + '分类：「' + CATEGORY + '」；账户：' + (facts.account || '<钱回到哪张卡>') + '；账本：' + (facts.ledger || '<账本>') + '\n'
    + '请照这个口径办两件：① 记一笔收入，分类「' + CATEGORY + '」，备注写「' + TAG_COLLECT + ' 原记录:#' + (source ?? '<借出记录编号>') + '」；'
    + '② 原记录 #' + (source ?? '<借出记录编号>') + ' 的备注把 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '，金额不动。';
  const content = [
    typeBadge({
      kind: KIND,
      status: blocked.length > 0 ? 'danger' : 'warn',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
      next: nextStepOf({ page: 'collect', missing: blocked.length, wakeWord: wakeWordOf(KIND) }),
    }),
    summaryRow(facts),
    renderCaliberLine('收回照收入口径写正数、落「' + CATEGORY + '」；原记录只动标签：' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '，金额不动。'),
    renderKpiGrid([
      { label: '收回金额', value: money2(amount), detail: '收入记正数，归在「' + CATEGORY + '」下面' },
      {
        label: '借出原记录',
        value: original === null ? '未认准' : money2(original.amount),
        detail: original === null
          ? (source === null ? '还没认准是哪一笔（候选里点一行）' : '#' + source + '（近期记录里没读到借出记录）')
          : '#' + source + ' · ' + original.category + ' · ' + original.time,
      },
      {
        label: '未收净差',
        value: diff === null ? '未算' : money2(diff),
        detail: diff === null ? '认准借出记录后这里出净差' : (diff === 0 ? '全额收回，未留尾' : '收回额与借出额不等，尾差照记'),
      },
    ]),
    renderToast({
      msg: '超支警示：收回额与借出额比一比',
      detail: '收多了（利息／补偿）或收少了（抹零）都照记、不阻断，可继续；尾差在「未收净差」那一格里。',
      badge: { text: '超支警示', type: 'warn' },
    }),
    renderToast({
      msg: '打标说明：' + TAG_UNPAID + ' 靠标签流转，不按金额猜',
      lines: [
        '原记录备注把 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '（金额不动，不删原记录）；这一笔补 ' + TAG_COLLECT + '。',
        '候选只列带 ' + TAG_LEND + ' 且还带 ' + TAG_UNPAID + ' 的记录；一条都没有就反问用户。',
        '「查欠款」看的是还带 ' + TAG_UNPAID + ' 的那几笔，「看借贷」看这一笔与 ' + TAG_PAID + '。',
      ],
      badge: { text: '打标说明', type: 'warn' },
    }),
    flowSteps({
      steps: [
        {
          title: '借出记录',
          note: '销哪一笔的 ' + TAG_UNPAID + '：从候选里挑一行；候选只列带 ' + TAG_LEND + ' 且还带 ' + TAG_UNPAID + ' 的记录。',
          done: source !== null,
          state: source === null ? '还没认准是哪一笔' : '已认准 #' + source,
          html: candidatePick({
            name: SOURCE_NAME,
            label: SOURCE_LABEL,
            candidates,
            selectedId: source,
            hint: '这一格要的是还没还回来的那笔借出；拿不准就让助手先查「查欠款」。',
          }),
        },
        {
          title: '收回（这一步）',
          note: '收回额写正数（收入口径）；分类固定「' + CATEGORY + '」。',
          done: amount !== null && textOf(params.category) !== '',
          fields: slots.map((s) => ({
            name: s.name,
            label: s.name === 'amount' ? '收回金额' : s.name === 'category' ? '分类（固定）' : s.label,
            hint: s.hint,
            ...(s.required ? { required: true } : {}),
            value: s.name === 'category' && textOf(params.category) === '' ? CATEGORY : textOf(params[s.name]),
          })),
        },
        {
          title: '结果',
          note: source === null
            ? '认准原记录之后：把它的 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '（金额不动），这一笔补 ' + TAG_COLLECT + '。'
            : '原记录 #' + source + '：' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '（金额不动）；这一笔补 ' + TAG_COLLECT + '。',
          done: blocked.length === 0,
          state: blocked.length === 0 ? '可以复制' : '还差 ' + blocked.length + ' 项',
        },
      ],
    }),
    blockedBar({ items: blocked, command: commandLine(key, filled) }),
    copyArea({
      prompt: { text: prompt, label: blocked.length === 0 ? '照这个口径写两笔，点这颗复制' : '补齐后照这句跟助手说一遍' },
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(key, params),
          source: input.source,
          detail: '没写库（采集页）',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·记收回', title: '记一笔收回', subtitle: message,
    slot: 'collect', page: 'collect', shape: envelope.shape, key, content,
  });
}

/** 回执页正文：#tag 流转条 ＋ 写入明细表 ＋ 对账折叠区 ＋ 退出口 ＋ 复制区。 */
function receiptPage(input: ReceiptInput): string {
  const { key, params, receipt } = input;
  const source = idOf(params[SOURCE_NAME]);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok: true, message: receipt.summary },
  };
  const content = [
    typeBadge({
      kind: KIND,
      status: 'ok',
      state: '写库成功',
      next: nextStepOf({ page: 'receipt', exit: true }),
    }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '这次记了几笔', value: receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      {
        label: '配对标签',
        value: source === null ? TAG_COLLECT : TAG_UNPAID + ' → ' + TAG_PAID,
        detail: '原记录只动标签，金额不动',
      },
    ]),
    renderToast({
      msg: '标签流转：这一笔打 ' + TAG_COLLECT + '，原记录换成 ' + TAG_PAID,
      lines: [
        '标签是备注里的记号，给助手用来找借贷关系；这一笔记在「' + CATEGORY + '」，金额 ' + money2(input.facts.amount) + '（收入记正数）',
        source === null
          ? '原记录这次没说清是哪一笔，消标下次补上（这一笔仍已落库）'
          : '原记录 #' + source + '：备注把 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '，金额不动',
        '「查欠款」按 ' + TAG_UNPAID + ' 数，这一笔写完之后它就少一笔；撤销走本页退出口。',
      ],
      badge: { text: '标签流转', type: 'ok' },
    }),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: input.detail,
      caption: '写进去的项与值',
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
          detail: '改了 ' + receipt.affectedRows + ' 笔，写进去 '
            + (receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项'),
          actionAt: receipt.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·写库回执', title: '记收回 · 回执', subtitle: receipt.summary,
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key, content,
  });
}

export const SCENE: Scene = {
  id: 'collect',
  wakeWord: '记收回',
  key: 'bill.record.add',
  kind: 'collect',
  op: '',
  family: '特殊收支族',
  collect: collectPage,
  receipt: receiptPage,
};
