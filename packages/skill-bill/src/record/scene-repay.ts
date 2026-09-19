/** 场景件：记偿还（`kind=repay`）。
 *
 * 服务哪条唤醒词：记偿还（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'repay' }`）。
 * 这一件出的两张页（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记偿还」那一行）：
 *   采集页：类型徽章（偿还·消借入标）、结论摘要行、偿还口径三格卡、超支警示条、打标说明条、
 *           流程三段式（借入记录→偿还→结果，第一段用候选单选）、缺项阻断条、照这句跟助手说一遍、复制区；
 *   回执页：类型徽章、结论摘要行、#tag 流转条、写入明细表、对账折叠区、退出口、复制区。
 * 另一半的场景事实：候选**只列带 `#借入` 且还带 `#未还` 的记录**（老侧 `scripts/render_write.py:316` 的 `pool`），
 *   偿还这一笔落「借贷/偿还」＋ `#偿还`、**金额写负数**（钱出去），原记录把 `#未还` 换成 `#已还`（金额不动）。
 *   消标与金额都要用户确认，不按最近一笔顶替（施工图第二节「缺项阻断」那一格）。
 *
 * 缺项阻断：槽位表缺的（分类／金额）走共用位 `blockedItems`；本型自己多要一格**借入记录编号**，
 *   少了它就不出可复制的写库指令（页面侧闸门；写库那一半的闸门在 `src/record/write.ts`，公共件，本窗不许改）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderChips, renderDataTable, renderDisclosure, renderFeedbackBlock, renderKpiGrid } from 'base-paint/blocks';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { candidatePick } from '../shared/candidatePick.js';
import type { CandidateItem } from '../shared/candidatePick.js';
import { collectMissingTags } from '../shared/collectFrame.js';
import { copyArea, copyLog, undoExit } from '../shared/copyArea.js';
import { flowSteps } from '../shared/flowSteps.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { money2, summaryCards } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { typeBadge, wakeWordOf } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

const KIND = 'repay';
/** 偿还一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '借贷/偿还';
/** 这一格：哪一笔借入还回去了。 */
const SOURCE_NAME = 'source_id';
const SOURCE_LABEL = '借入记录编号';
/** 借贷标签：只列没还的那一批。 */
const TAG_BORROW = '#借入';
const TAG_UNPAID = '#未还';
const TAG_PAID = '#已还';
const TAG_REPAY = '#偿还';
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

/** 缺项阻断条整条收进折叠区：首屏只留缺项标签与一行副标题，口令原文不再常驻版面。
 *  内容与判定一字不动（仍是共用件 `blockedBar` 的产出），只换摆法；折叠与否那枚置灰按钮都点不动。 */
function blockedFold(items: readonly BlockedItem[], command: string): string {
  if (items.length === 0) return '';
  return renderDisclosure({
    title: '还缺什么，以及补齐后照抄的那条',
    contentHtml: blockedBar({ items, command }),
  });
}

/** 分类路径换成面包屑形状（`/` 不再进正文，见 D-/-01）。 */
function crumbOf(category: string): string {
  return category.split('/').join(' › ');
}

/** 候选：带 `#借入` 且还带 `#未还` 的记录（老侧 `pool` 同一条件）——已还的不列。 */
function unpaidBorrowsOf(recent: CollectInput['recent'], amount: number | null): CandidateItem[] {
  const out: CandidateItem[] = [];
  for (const r of recent) {
    if (!r.note.includes(TAG_BORROW) || !r.note.includes(TAG_UNPAID)) continue;
    const same = amount !== null && Math.abs(r.amount - Math.abs(amount)) <= 0.005;
    out.push({
      id: r.id,
      label: r.category + '　' + r.note.replace(/#/g, ''),
      amount: money2(r.amount),
      time: r.time,
      why: same ? '还带 ' + TAG_UNPAID + '，金额与偿还额一致' : '还带 ' + TAG_UNPAID + '，金额与偿还额不符',
    });
    if (out.length >= CAND_MAX) break;
  }
  return out;
}

/** 采集页正文：摘要行 ＋ 偿还口径三格卡 ＋ 超支警示条 ＋ 打标说明条 ＋ 流程三段式 ＋ 阻断条 ＋ 两段复制区。 */
function collectPage(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const source = idOf(params[SOURCE_NAME]);
  const amount = amountOf(params.amount);
  const original = source === null ? null : (input.recent.find((r) => r.id === source) ?? null);
  const base = blockedItems({ params, missing, kind: KIND });
  const extra: BlockedItem[] = source === null
    ? [{ name: SOURCE_NAME, label: SOURCE_LABEL, why: '没给：偿还要指名销哪一笔的 ' + TAG_UNPAID + '，不拿最近一笔顶替' }]
    : [];
  const blocked = [...base, ...extra];
  const message = blockedMessage(missing, base)
    + (extra.length === 0 ? '' : '；本型另需：' + extra.map((i) => i.label).join('、'));
  /** 副标题只报计数（进度形状）；缺项明细在进度行、标签组与阻断表明细三处形状里。 */
  const subtitle = wakeWordOf(KIND) + '还差 ' + blocked.length + ' 项';
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
  const candidates = unpaidBorrowsOf(input.recent, amount);
  const diff = amount === null || original === null ? null : Math.round((amount + Math.abs(original.amount)) * 100) / 100;
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  // 缺项逐项一行（一行一件事），不带库列名、不用顿号连写。
  const lackLines = blocked.map((i) => i.label + '：' + (i.why === '没给' ? '没给' : i.why)).join('\n');
  const prompt = (blocked.length === 0
    ? '照下面这个口径记这一笔偿还，并把原记录的标签换过来。'
    : '这一笔还差 ' + blocked.length + ' 项，逐项补齐：\n' + lackLines)
    + '\n请加载「饼干记账」技能，帮我记一笔偿还。\n唤醒词：记偿还\n'
    + '借入记录：' + (source === null
      ? '<借入记录编号>'
      : '#' + source + '　' + (original === null
        ? '近期记录里没读到'
        : original.category + '　' + money2(original.amount) + '　' + original.time)) + '\n'
    + '偿还金额：' + money2(amount) + '　支出记负数\n'
    + '分类：' + CATEGORY + '\n'
    + '账户：' + (facts.account || '<钱从哪张卡出去>') + '\n'
    + '账本：' + (facts.ledger || '<账本>') + '\n'
    + '请办两件：\n'
    + '① 记一笔支出，分类「' + CATEGORY + '」，备注写「' + TAG_REPAY + ' 原记录 #' + (source ?? '<借入记录编号>') + '」\n'
    + '② 原记录 #' + (source ?? '<借入记录编号>') + ' 的备注把 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '，金额不动';
  const content = [
    typeBadge({
      kind: KIND,
      status: blocked.length > 0 ? 'danger' : 'warn',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
      next: '',
    }),
    renderKpiGrid(summaryCards(facts)),
    renderChips({
      items: [
        { text: '偿还记负数' },
        { text: '分类 ' + crumbOf(CATEGORY) },
        { text: '原记录 ' + TAG_UNPAID + ' 换 ' + TAG_PAID },
        { text: '金额不动' },
      ],
    }),
    renderKpiGrid([
      { label: '偿还金额', value: money2(amount), detail: '支出记负数，归在「' + crumbOf(CATEGORY) + '」下面' },
      {
        label: '借入原记录',
        value: original === null ? '未认准' : money2(original.amount),
        detail: original === null
          ? (source === null ? '还没认准是哪一笔，候选里点一行' : '#' + source + '近期记录里没读到借入记录')
          : '#' + source + '　' + original.category + '　' + original.time,
      },
      {
        label: '未还净差',
        value: diff === null ? '未算' : money2(diff),
        detail: diff === null
          ? '认准借入记录后这里出净差'
          : (diff === 0 ? '全额还清，未留尾' : '偿还额与借入额不等，尾差照记、不阻断'),
      },
    ]),
    renderFeedbackBlock({
      toast: {
        msg: '按标签销账，不按金额猜',
        detail: '候选只列带 ' + TAG_BORROW + ' 且还带 ' + TAG_UNPAID + ' 的记录，一条都没有就直接反问。',
        icon: 'info',
      },
      staticNotice: true,
    }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    flowSteps({
      steps: [
        {
          title: '借入记录',
          note: '候选只列带 ' + TAG_BORROW + ' 且还带 ' + TAG_UNPAID + ' 的记录。',
          done: source !== null,
          state: source === null ? '未认准' : '已认准 #' + source,
          html: candidatePick({
            name: SOURCE_NAME,
            label: SOURCE_LABEL,
            candidates,
            selectedId: source,
            hint: '要的是还没还回去的那笔借入，未认准不代选。',
          }),
        },
        {
          title: '偿还这一步',
          note: '偿还额写负数。分类固定为「' + crumbOf(CATEGORY) + '」。',
          done: amount !== null && textOf(params.category) !== '',
          fields: slots.map((s) => ({
            name: s.name,
            label: s.name === 'amount' ? '偿还金额' : s.name === 'category' ? '分类' : s.label,
            hint: s.name === 'category' ? '固定为 ' + crumbOf(CATEGORY) : s.hint,
            ...(s.required ? { required: true } : {}),
            value: s.name === 'category' && textOf(params.category) === '' ? CATEGORY : textOf(params[s.name]),
          })),
        },
        {
          title: '结果',
          note: source === null
            ? '认准原记录后：把它的 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '，金额不动。这一笔补 ' + TAG_REPAY + '。'
            : '原记录 #' + source + ' 的 ' + TAG_UNPAID + ' 换成 ' + TAG_PAID + '，金额不动。这一笔补 ' + TAG_REPAY + '。',
          done: blocked.length === 0,
          state: blocked.length === 0 ? '可复制' : '还差 ' + blocked.length + ' 项',
        },
      ],
    }),
    blockedFold(blocked, commandLine(key, filled)),
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
    docTitle: DOC_TITLE + '·记偿还', title: wakeWordOf(KIND), subtitle,
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
      next: '这一笔已记下，撤销见下方按钮。',
    }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '这次记了几笔', value: receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      {
        label: '配对标签',
        value: source === null ? TAG_REPAY : TAG_UNPAID + ' → ' + TAG_PAID,
        detail: '原记录只动标签，金额不动',
      },
    ]),
    renderFeedbackBlock({
      toast: {
        msg: '这一笔打 ' + TAG_REPAY + (source === null ? '，原记录这次没给到' : '，原记录 #' + source + ' 换成 ' + TAG_PAID),
        detail: '「查欠款」按 ' + TAG_UNPAID + ' 数，写完少一笔。撤销见下方按钮。',
        icon: 'ok',
      },
      staticNotice: true,
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
    docTitle: DOC_TITLE + '·写库回执', title: '记偿还 · 回执', subtitle: receipt.summary,
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key, content,
  });
}

export const SCENE: Scene = {
  id: 'repay',
  key: 'bill.record.add',
  kind: 'repay',
  op: '',
  family: '特殊收支族',
  collect: collectPage,
  receipt: receiptPage,
};
