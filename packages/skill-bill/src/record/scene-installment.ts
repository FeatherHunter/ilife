/** 场景件：记分期（`kind=installment`）。
 *
 * 服务哪条唤醒词：记分期（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'installment' }`）。
 * 这一件出的两张页（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记分期」那一行）：
 *   采集页：类型徽章（分期）、结论摘要行、参数只读回显（总额／期数／首期日）、期数角标、分摊预览表、
 *           折叠说明（>24 期只显前 12 期）、缺项阻断条、照这句跟助手说一遍、复制区；
 *   回执页：类型徽章、结论摘要行、分摊预览表（写库那一笔按期数摊开的同一张）、写入明细表、
 *           对账折叠区、退出口、复制区。
 *
 * 这一件的两处口径：
 *   ① **先校验再算**：总额／期数／首期日缺一项就不写库、也不算；给了但解析不出（如总额写「一千」）
 *      当场把解析失败那句原文摆到阻断条里，**不许静默当空**（施工图第二节「记分期」的缺项阻断那一格）；
 *   ② 分摊表由共用件 `src/shared/installmentPreview.ts` 算与摆（尾差对齐到最后一期、合计逐分等于总价），
 *      本件不自己算钱——算错一处两页就都对不上。
 *
 * 老侧对应：`templates/写入/installment_confirm.html:54-64,114-123`、`scripts/render_write.py:466`；
 *   老侧把差额补在**首期**且裸转数字会先崩，本件两处都不照抄（差额在末期、先校验再算）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderChips, renderDataTable, renderDisclosure, renderFeedbackBlock, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { collectMissingTags, collectSectionTitle } from '../shared/collectFrame.js';
import { copyArea, copyLog, undoExit } from '../shared/copyArea.js';
import { installmentPreview, installmentShares } from '../shared/installmentPreview.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { money2, summaryCards } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { typeBadge, wakeWordOf } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

const KIND = 'installment';
/** 分摊三格（本型自己认的参数名，槽位表之外）。 */
const TOTAL_NAME = 'total';
const TOTAL_LABEL = '总额';
const PERIODS_NAME = 'periods';
const PERIODS_LABEL = '期数';
const FIRST_NAME = 'start_date';
const FIRST_LABEL = '首期日';

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

/** 缺项阻断条整条收进折叠区：首屏只留缺项标签与一行副标题，口令原文不再常驻版面。
 *  内容与判定一字不动（仍是共用件 `blockedBar` 的产出），只换摆法；折叠与否那枚置灰按钮都点不动。 */
function blockedFold(items: readonly BlockedItem[], command: string): string {
  if (items.length === 0) return '';
  return renderDisclosure({
    title: '还缺什么，以及补齐后照抄的那条',
    contentHtml: blockedBar({ items, command }),
  });
}

/** 分摊那一格：三样齐了才算得出来；齐了就交给共用件算，算不动（解析失败）把那句话原样报回来。 */
function previewOrNote(params: Record<string, unknown>): { readonly html: string; readonly err: string } {
  const total = textOf(params[TOTAL_NAME]);
  const periods = textOf(params[PERIODS_NAME]);
  const first = textOf(params[FIRST_NAME]);
  if (total === '' || periods === '' || first === '') {
    return { html: '', err: '' };
  }
  try {
    return { html: installmentPreview({ total, periods, startDate: first }), err: '' };
  } catch (e) {
    return { html: '', err: e instanceof Error ? e.message : String(e) };
  }
}

/** 采集页正文：参数只读回显 ＋ 期数角标 ＋ 分摊预览表 ＋ 阻断条 ＋ 两段复制区。 */
function collectPage(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const total = textOf(params[TOTAL_NAME]);
  const periods = textOf(params[PERIODS_NAME]);
  const first = textOf(params[FIRST_NAME]);
  const amount = amountOf(params.amount);
  const base = blockedItems({ params, missing, kind: KIND });
  const extra: BlockedItem[] = [];
  if (total === '') extra.push({ name: TOTAL_NAME, label: TOTAL_LABEL, why: '没给：不分总额就摊不了期' });
  if (periods === '') extra.push({ name: PERIODS_NAME, label: PERIODS_LABEL, why: '没给：分几期由用户定，不许默认' });
  if (first === '') extra.push({ name: FIRST_NAME, label: FIRST_LABEL, why: '没给：首期日不定就算不出每期日期' });
  const preview = previewOrNote(params);
  if (preview.err !== '') {
    // 解析失败照实报错（不静默当空、不拿 0 顶）：这一格进了阻断条，复制指令就不出。
    extra.push({ name: TOTAL_NAME, label: TOTAL_LABEL, why: preview.err });
  }
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
    category: textOf(params.category),
    account: textOf(params.account),
    ledger: textOf(params.ledger),
    time: textOf(params.time),
  };
  const shares = preview.err === '' && preview.html !== ''
    ? installmentShares({ total, periods, startDate: first })
    : [];
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  // 缺项逐项一行（一行一件事），不带库列名、不用顿号连写。
  const lackLines = blocked.map((i) => i.label + '：' + (i.why === '没给' ? '没给' : i.why)).join('\n');
  const prompt = (blocked.length === 0
    ? '照下面这个口径记这一笔分期，每期金额与日期按预览表来。'
    : '这一笔还差 ' + blocked.length + ' 项，逐项补齐：\n' + lackLines)
    + '\n请加载「饼干记账」技能，帮我记一笔分期。\n唤醒词：记分期\n'
    + '总额：' + (total || '<总额>') + '\n'
    + '期数：' + (periods || '<期数>') + '\n'
    + '首期日：' + (first || '<首期日>') + '\n'
    + '分类：' + (facts.category || '<三级分类>') + '\n'
    + '账户：' + (facts.account || '<账户>') + '\n'
    + '账本：' + (facts.ledger || '<账本>') + '\n'
    + (shares.length === 0 ? '分摊预览还没算出来，三样齐了才算。' : '分摊预览见上面那张表。')
    + '\n每期按上面那张表逐期记，尾差归最后一期。';
  const content = [
    typeBadge({
      kind: KIND,
      status: blocked.length > 0 ? 'danger' : 'warn',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
      next: '',
    }),
    blocked.length === 0 ? '' : collectSectionTitle({ no: 1, title: '先看这一笔缺什么' }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    renderKpiGrid(summaryCards(facts)),
    renderChips({
      items: [
        { text: '总额' },
        { text: '期数' },
        { text: '首期日' },
        { text: '尾差归最后一期' },
        { text: '合计等于总价' },
      ],
    }),
    collectSectionTitle({ no: 2, title: '分期参数只回显' }),
    renderParamForm({
      description: '参数只回显，改值重说。',
      fields: [
        { name: TOTAL_NAME, label: TOTAL_LABEL, readonly: true, value: total, hint: '总价，如 1200' },
        { name: PERIODS_NAME, label: PERIODS_LABEL, readonly: true, value: periods, hint: '分几期，如 12' },
        { name: FIRST_NAME, label: FIRST_LABEL, readonly: true, value: first, hint: '第 1 期哪一天，如 2026-10-01' },
      ],
    }),
    collectSectionTitle({ no: 3, title: '分摊预览' }),
    shares.length === 0
      ? ''
      : renderFeedbackBlock({
        toast: {
          msg: '共 ' + shares.length + ' 期，已摊出来',
          detail: shares.length > 24 ? '本页先显前 12 期，其余折在下面那一格里。' : '全列在下面那张表里。',
          icon: 'info',
        },
        staticNotice: true,
      }),
    preview.html,
    preview.html === ''
      ? renderChips({ items: [{ text: '三样齐了才算得出分摊' }] })
      : '',
    blockedFold(blocked, commandLine(key, filled)),
    copyArea({
      prompt: { text: prompt, label: blocked.length === 0 ? '照这个口径逐期记，点这颗复制' : '补齐后照这句跟助手说一遍' },
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
    docTitle: DOC_TITLE + '·记分期', title: wakeWordOf(KIND), subtitle,
    slot: 'collect', page: 'collect', shape: envelope.shape, key, content,
  });
}

/** 回执页正文：分摊预览表（写库那一笔按期数摊开的同一张）＋ 写入明细表 ＋ 对账折叠区 ＋ 退出口 ＋ 复制区。 */
function receiptPage(input: ReceiptInput): string {
  const { key, params, receipt } = input;
  const preview = previewOrNote(params);
  const total = textOf(params[TOTAL_NAME]);
  const periods = textOf(params[PERIODS_NAME]);
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
      { label: '分期参数', value: (total || '未给') + ' ÷ ' + (periods || '未给') + ' 期', detail: '首期日 ' + (textOf(params[FIRST_NAME]) || '未给') },
    ]),
    renderFeedbackBlock({
      toast: {
        msg: '这一笔按 ' + (periods || '未给') + ' 期摊，尾差归最后一期',
        detail: '每期日期＝每月同日，该月没有那一天就回退月末。改期数走「改记录」。',
        icon: 'ok',
      },
      staticNotice: true,
    }),
    preview.html === ''
      ? renderChips({ items: [{ text: preview.err === '' ? '缺分期参数，未分摊，这一笔仍已记下' : '分摊没算出来：' + preview.err }] })
      : preview.html,
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
    docTitle: DOC_TITLE + '·写库回执', title: '记分期 · 回执', subtitle: receipt.summary,
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key, content,
  });
}

export const SCENE: Scene = {
  id: 'installment',
  wakeWord: '记分期',
  key: 'bill.record.add',
  kind: 'installment',
  op: '',
  family: '特殊收支族',
  collect: collectPage,
  receipt: receiptPage,
};
