/** 场景件：记退款（`kind=refund`）。
 *
 * 服务哪条唤醒词：记退款（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'refund' }`）。
 * 这一件出的两张页（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记退款」那一行）：
 *   采集页：类型徽章（退款·#tag 流转）、结论摘要行、退款口径三格卡（退款额／原支出／净差）、超支警示条、
 *           流程三段式（原记账→退款→结果，第一段用候选单选）、缺项阻断条、照这句跟助手说一遍、复制区；
 *   回执页：类型徽章、结论摘要行（＋状态／这次记了几笔／写进去的项）、#tag 流转条、写入明细表、对账折叠区、退出口、复制区。
 * 另一半的场景事实：原支出在哪一笔上（候选单选「为什么是它」）、退款额写正数、分类一律「退款/冲销」、
 *   原支出只追加 `#已退款`（金额不动）——判定与文案都住本件，别处不抄。
 *
 * 老侧对应：`templates/写入/flow_confirm.html:206-228`（候选默认选中第一笔、超支可继续）、
 *   `scripts/render_write.py:301-304`（`pool`＝金额为负的记录）。本件两处**不照抄**：候选不给默认选中、
 *   超支警示写明可以继续但不当阻断（施工图第三节点名「超支警示条（写明可继续）」）。
 *
 * 缺项阻断：槽位表缺的（分类／金额）走共用位 `blockedItems`；本型自己多要一格**原支出编号**——
 *   少了它就不出可复制的写库指令。这一格是页面侧的闸门，写库那一半的闸门在 `src/record/write.ts`
 *   （公共件，本窗不许改；见交付回执的遗留一条）。
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

const KIND = 'refund';
/** 退款一律落这个分类（老侧同一处口径）。 */
const CATEGORY = '退款/冲销';
/** 这一型自己多要的那一格：退的是哪一笔原支出。 */
const SOURCE_NAME = 'source_id';
const SOURCE_LABEL = '原支出编号';
/** 可列出的候选条数上限（列表是给人挑的，不是台账）。 */
const CAND_MAX = 6;

/** 一个值的字符串形态。 */
function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' ? String(v) : '';
}

/** 金额：数字或数字串；解析不出给 `null`（缺项那一支由阻断条说话）。 */
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

/** 候选：近期支出记录（老侧 `pool`＝金额为负），每条一句「为什么是它」。 */
function candidatesOf(recent: CollectInput['recent'], amount: number | null): CandidateItem[] {
  const out: CandidateItem[] = [];
  for (const r of recent) {
    if (!(r.amount < 0)) continue;
    const same = amount !== null && Math.abs(r.amount + amount) <= 0.005;
    out.push({
      id: r.id,
      label: r.category + (r.note === '' ? '' : '　' + r.note.replace(/#/g, '')),
      amount: money2(r.amount),
      time: r.time,
      why: same ? '金额一致（' + money2(-r.amount) + ' 对得上这笔退款额）' : '同分类近邻，金额与本笔不符',
    });
    if (out.length >= CAND_MAX) break;
  }
  return out;
}

/** 采集页正文：结论摘要行 ＋ 退款口径三格卡 ＋ 超支警示条 ＋ 流程三段式 ＋ 阻断条 ＋ 两段复制区。 */
function collectPage(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const source = idOf(params[SOURCE_NAME]);
  const amount = amountOf(params.amount);
  const original = source === null ? null : (input.recent.find((r) => r.id === source) ?? null);
  const base = blockedItems({ params, missing, kind: KIND });
  const extra: BlockedItem[] = source === null
    ? [{ name: SOURCE_NAME, label: SOURCE_LABEL, why: '没给：退款要指名退的是哪一笔原支出，不拿最近一笔顶替' }]
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
  const candidates = candidatesOf(input.recent, amount);
  const diff = amount === null || original === null ? null : Math.round((amount + original.amount) * 100) / 100;
  const over = amount !== null && original !== null && amount > -original.amount;
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  // 缺项逐项一行（一行一件事），不带库列名、不用顿号连写。
  const lackLines = blocked.map((i) => i.label + '：' + (i.why === '没给' ? '没给' : i.why)).join('\n');
  const prompt = (blocked.length === 0
    ? '照下面这个口径写两笔，复制前先核一眼原支出。'
    : '这一笔还差 ' + blocked.length + ' 项，逐项补齐：\n' + lackLines)
    + '\n请加载「饼干记账」技能，帮我记一笔退款。\n唤醒词：记退款\n'
    + '原支出：' + (source === null
      ? '<原支出编号>'
      : '#' + source + '　' + (original === null
        ? '近期记录里没读到'
        : original.category + '　' + money2(original.amount) + '　' + original.time)) + '\n'
    + '退款额：' + money2(amount) + '　收入记正数\n'
    + '分类：' + CATEGORY + '\n'
    + '到账账户：' + (facts.account || '<到账账户>') + '\n'
    + '账本：' + (facts.ledger || '<账本>') + '\n'
    + '请办两件：\n'
    + '① 记一笔收入，分类「' + CATEGORY + '」，备注写「#退款 原支出 #' + (source ?? '<原支出编号>') + '」\n'
    + '② 原支出 #' + (source ?? '<原支出编号>') + ' 的备注追加「#已退款」，金额不动';
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
        { text: '退款记正数' },
        { text: '分类 ' + crumbOf(CATEGORY) },
        { text: '原支出只加 #已退款' },
        { text: '金额不动' },
      ],
    }),
    renderKpiGrid([
      { label: '退款额', value: money2(amount), detail: '收入记正数，归在「' + crumbOf(CATEGORY) + '」下面' },
      {
        label: '原支出',
        value: original === null ? '未认准' : money2(original.amount),
        detail: original === null
          ? (source === null ? '还没认准是哪一笔，候选里点一行' : '#' + source + '近期记录里没读到原支出')
          : '#' + source + '　' + original.category + '　' + original.time,
      },
      {
        label: '净差',
        value: diff === null ? '未算' : money2(diff),
        detail: diff === null
          ? '认准原支出后这里出净差'
          : (diff === 0
            ? '全额退，未产生差额'
            : (over ? '退款额超过原支出，超出部分照记、不阻断' : '退款额低于原支出，差额照记、不阻断')),
      },
    ]),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    flowSteps({
      steps: [
        {
          title: '原记账',
          note: '候选只列支出记录，每条附一句「为什么是它」。',
          done: source !== null,
          state: source === null ? '未认准' : '已认准 #' + source,
          html: candidatePick({
            name: SOURCE_NAME,
            label: SOURCE_LABEL,
            candidates,
            selectedId: source,
            hint: '从候选选原支出，未认准不代选。',
          }),
        },
        {
          title: '退款这一步',
          note: '退款额写正数。分类固定为「' + crumbOf(CATEGORY) + '」。',
          done: amount !== null && textOf(params.category) !== '',
          fields: slots.map((s) => ({
            name: s.name,
            label: s.name === 'amount' ? '退款额' : s.name === 'category' ? '分类' : s.label,
            hint: s.name === 'category' ? '固定为 ' + crumbOf(CATEGORY) : s.hint,
            ...(s.required ? { required: true } : {}),
            value: s.name === 'category' && textOf(params.category) === '' ? CATEGORY : textOf(params[s.name]),
          })),
        },
        {
          title: '结果',
          note: source === null
            ? '认准原支出后：那一笔的备注追加 #已退款，金额不动。「看退款」按 #退款 与 #已退款 聚合。'
            : '原支出 #' + source + ' 的备注追加 #已退款，金额不动。「看退款」按 #退款 与 #已退款 聚合。',
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
    docTitle: DOC_TITLE + '·记退款', title: '记一笔退款', subtitle,
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
      { label: '配对标签', value: source === null ? '#退款' : '#退款 → #已退款', detail: '原支出只动标签，金额不动' },
    ]),
    renderFeedbackBlock({
      toast: {
        msg: '这一笔打 #退款' + (source === null ? '，原支出这次没给到' : '，原支出 #' + source + ' 追加 #已退款'),
        detail: '「看退款」按 #退款 与 #已退款 聚合。撤销见下方按钮。',
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
    docTitle: DOC_TITLE + '·写库回执', title: '记退款 · 回执', subtitle: receipt.summary,
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key, content,
  });
}

export const SCENE: Scene = {
  id: 'refund',
  wakeWord: '记退款',
  key: 'bill.record.add',
  kind: 'refund',
  op: '',
  family: '特殊收支族',
  collect: collectPage,
  receipt: receiptPage,
};
