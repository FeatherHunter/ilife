/** 场景件：报销到账（`kind=reimburse-done`）。
 *
 * 服务哪条唤醒词：报销到账（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'reimburse-done' }`）。
 * 这一件出的两张页（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「报销到账」那一行）：
 *   采集页：类型徽章（到账·消 #待报销）、结论摘要行、到账口径三格卡、超支警示条、打标说明条、
 *           流程三段式（待报销记录→到账→结果，第一段用候选单选）、缺项阻断条、照这句跟助手说一遍、复制区；
 *   回执页：类型徽章、结论摘要行、#tag 流转条、写入明细表、对账折叠区、退出口、复制区。
 * 另一半的场景事实：候选**只列备注里带 `#待报销` 的记录**（老侧 `scripts/render_write.py:308` 的 `pool`），
 *   到账这一笔落「其他收入/报销回款」＋ `#报销到账`，原记录消 `#待报销`、补 `#已报销`。
 *   候选一条都没有就直接反问用户，不拿最近一笔顶替（施工图第二节「缺项阻断」那一格）。
 *
 * 缺项阻断：槽位表缺的（分类／金额）走共用位 `blockedItems`；本型自己多要一格**待报销记录编号**，
 *   少了它就不出可复制的写库指令（页面侧闸门；写库那一半的闸门在 `src/record/write.ts`，公共件，本窗不许改）。
 */
import { renderToast } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderChips, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
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

const KIND = 'reimburse-done';
/** 到账一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '其他收入/报销回款';
/** 这一格：哪一笔报销到账了。 */
const SOURCE_NAME = 'source_id';
const SOURCE_LABEL = '待报销记录编号';
/** 待报销的标记（候选只认它）与到账后换上的标记。 */
const TAG_WAIT = '#待报销';
const TAG_DONE = '#已报销';
const TAG_ARRIVE = '#报销到账';
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

/** 候选：备注里带 `#待报销` 的记录（老侧 `pool` 同一条件），每条一句「为什么是它」。 */
function candidatesOf(recent: CollectInput['recent'], amount: number | null): CandidateItem[] {
  const out: CandidateItem[] = [];
  for (const r of recent) {
    if (!r.note.includes(TAG_WAIT)) continue;
    const same = amount !== null && Math.abs(Math.abs(r.amount) - amount) <= 0.005;
    out.push({
      id: r.id,
      label: r.category + '　' + r.note.replace(/#/g, ''),
      amount: money2(r.amount),
      time: r.time,
      why: same ? '打了 ' + TAG_WAIT + ' 且金额与到账额一致' : '打了 ' + TAG_WAIT + '，金额与到账额不符',
    });
    if (out.length >= CAND_MAX) break;
  }
  return out;
}

/** 采集页正文：摘要行 ＋ 到账口径三格卡 ＋ 超支警示条 ＋ 打标说明条 ＋ 流程三段式 ＋ 阻断条 ＋ 两段复制区。 */
function collectPage(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const source = idOf(params[SOURCE_NAME]);
  const amount = amountOf(params.amount);
  const original = source === null ? null : (input.recent.find((r) => r.id === source) ?? null);
  const base = blockedItems({ params, missing, kind: KIND });
  const extra: BlockedItem[] = source === null
    ? [{ name: SOURCE_NAME, label: SOURCE_LABEL, why: '没给：到账要指名消哪一笔的 ' + TAG_WAIT + '，不许按金额猜' }]
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
  const candidates = candidatesOf(input.recent, amount);
  const diff = amount === null || original === null ? null : Math.round((amount + original.amount) * 100) / 100;
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  const prompt = (blocked.length === 0 ? '照下面这个口径写到账这一笔，并把原记录的标签换过来。' : '这一笔还差 ' + blocked.length + ' 项：'
    + blocked.map((i) => i.label + '（' + i.name + '：' + i.why + '）').join('、') + '。')
    + '\n请加载「饼干记账」技能，帮我记一笔报销到账（唤醒词：报销到账）：\n'
    + '待报销记录：' + (source === null ? '<待报销记录编号>' : '#' + source + '（' + (original === null ? '近期记录里没读到' : original.category + ' ' + money2(original.amount) + ' ' + original.time) + '）') + '\n'
    + '到账额：' + money2(amount) + '（收入正数）\n'
    + '分类：' + CATEGORY + '；到账账户：' + (facts.account || '<到账账户>') + '；账本：' + (facts.ledger || '<账本>') + '\n'
    + '请照这个口径办两件：① 记一笔收入，分类「' + CATEGORY + '」，备注写「' + TAG_ARRIVE + ' 原记录:#' + (source ?? '<待报销记录编号>') + '」；'
    + '② 原记录 #' + (source ?? '<待报销记录编号>') + ' 的备注把 ' + TAG_WAIT + ' 换成 ' + TAG_DONE + '，金额不动。';
  const content = [
    typeBadge({
      kind: KIND,
      status: blocked.length > 0 ? 'danger' : 'warn',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
      next: nextStepOf({ page: 'collect', missing: blocked.length, wakeWord: wakeWordOf(KIND) }),
    }),
    summaryRow(facts),
    renderChips({ items: [{ text: '到账记正数' }, { text: '落「' + CATEGORY + '」' }] }),
    renderCaliberLine('原记录那一笔只动标签：' + TAG_WAIT + ' 换成 ' + TAG_DONE + '，金额不动。'),
    renderKpiGrid([
      { label: '到账额', value: money2(amount), detail: '收入记正数，归在「' + CATEGORY + '」下面' },
      {
        label: '待报销原记录',
        value: original === null ? '未认准' : money2(original.amount),
        detail: original === null
          ? (source === null ? '还没认准是哪一笔（候选里点一行）' : '#' + source + '（近期记录里没读到原记录）')
          : '#' + source + '　' + original.category + '　' + original.time,
      },
      {
        label: '净差',
        value: diff === null ? '未算' : money2(diff),
        detail: diff === null ? '认准原记录后这里出净差' : (diff === 0 ? '全额到账，未产生差额' : '到账额与支出不等，差额照记'),
      },
    ]),
    renderToast({
      msg: '超支警示：到账额与原支出比一比',
      detail: '到账额高于原支出（多退）或低于原支出（自付一部分）都照记、不阻断，可继续；差额在「净差」那一格里。',
      badge: { text: '超支警示', type: 'warn' },
    }),
    renderToast({
      msg: '打标说明：' + TAG_WAIT + ' 靠标签流转，不按金额猜',
      lines: [
        '这一笔打 ' + TAG_ARRIVE + '。原记录备注把 ' + TAG_WAIT + ' 换成 ' + TAG_DONE + '（金额不动，不删原记录）。',
        '候选只列备注里带 ' + TAG_WAIT + ' 的记录；一条都没有就反问用户，不拿最近一笔顶替。',
        '「查待报销」看的是 ' + TAG_WAIT + '，「看报销」看的是这一笔与 ' + TAG_DONE + '。',
      ],
      badge: { text: '打标说明', type: 'warn' },
    }),
    flowSteps({
      steps: [
        {
          title: '待报销记录',
          note: '消哪一笔的 ' + TAG_WAIT + '：从候选里挑一行；候选只列带这个标签的记录。',
          done: source !== null,
          state: source === null ? '还没认准是哪一笔' : '已认准 #' + source,
          html: candidatePick({
            name: SOURCE_NAME,
            label: SOURCE_LABEL,
            candidates,
            selectedId: source,
            hint: '这一格要的是打了 ' + TAG_WAIT + '、钱还没回来的那一笔；拿不准就让助手先查「查待报销」。',
          }),
        },
        {
          title: '到账（这一步）',
          note: '到账额写正数（收入口径）；分类固定「' + CATEGORY + '」。',
          done: amount !== null && textOf(params.category) !== '',
          fields: slots.map((s) => ({
            name: s.name,
            label: s.name === 'amount' ? '到账额' : s.name === 'category' ? '分类（固定）' : s.label,
            hint: s.hint,
            ...(s.required ? { required: true } : {}),
            value: s.name === 'category' && textOf(params.category) === '' ? CATEGORY : textOf(params[s.name]),
          })),
        },
        {
          title: '结果',
          note: source === null
            ? '认准原记录之后：把它的 ' + TAG_WAIT + ' 换成 ' + TAG_DONE + '（金额不动），这一笔补 ' + TAG_ARRIVE + '。'
            : '原记录 #' + source + '：' + TAG_WAIT + ' 换成 ' + TAG_DONE + '（金额不动）；这一笔补 ' + TAG_ARRIVE + '。',
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
    docTitle: DOC_TITLE + '·报销到账', title: '记一笔报销到账', subtitle: message,
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
        value: source === null ? TAG_ARRIVE : TAG_WAIT + ' → ' + TAG_DONE,
        detail: '原记录只动标签，金额不动',
      },
    ]),
    renderToast({
      msg: '标签是备注里的记号，给助手用来找报销关系：这一笔打 ' + TAG_ARRIVE,
      lines: [
        '这一笔记在「' + CATEGORY + '」，金额 ' + money2(input.facts.amount) + '（收入记正数）',
        source === null
          ? '原记录这次没说清是哪一笔，换名下次补上（这一笔仍已落库）'
          : '原记录 #' + source + '：备注把 ' + TAG_WAIT + ' 换成 ' + TAG_DONE + '，金额不动',
        '「查待报销」按 ' + TAG_WAIT + ' 数，这一笔写完之后它就少一笔。撤销走本页退出口。',
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
    docTitle: DOC_TITLE + '·写库回执', title: '报销到账 · 回执', subtitle: receipt.summary,
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key, content,
  });
}

export const SCENE: Scene = {
  id: 'reimburse-done',
  wakeWord: '报销到账',
  key: 'bill.record.add',
  kind: 'reimburse-done',
  op: '',
  family: '特殊收支族',
  collect: collectPage,
  receipt: receiptPage,
};
