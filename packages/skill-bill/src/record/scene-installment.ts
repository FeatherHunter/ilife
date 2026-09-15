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
import { renderToast } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { copyArea, copyLog, undoExit } from '../shared/copyArea.js';
import { installmentPreview, installmentShares } from '../shared/installmentPreview.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { money2, summaryCards, summaryRow } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { nextStepOf, typeBadge, wakeWordOf } from '../shared/typeBadge.js';
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
  const prompt = (blocked.length === 0 ? '照下面这个口径记这一笔分期，每期金额与日期按预览表来。' : '这一笔还差 ' + blocked.length + ' 项：'
    + blocked.map((i) => i.label + '（' + i.name + '：' + i.why + '）').join('、') + '。')
    + '\n请加载「饼干记账」技能，帮我记一笔分期（唤醒词：记分期）：\n'
    + '总额：' + (total || '<总额>') + '；期数：' + (periods || '<期数>') + '；首期日：' + (first || '<首期日>') + '\n'
    + '分类：' + (facts.category || '<三级分类>') + '；账户：' + (facts.account || '<账户>') + '；账本：' + (facts.ledger || '<账本>') + '\n'
    + (shares.length === 0 ? '分摊预览还没算出来（三样齐了才算）。' : '分摊：' + shares.map((s) => '第 ' + s.no + ' 期 ' + s.amount.toFixed(2) + '（' + s.date + '）').join('、')
      + '；合计 ' + (total === '' ? '<总额>' : Number(total).toFixed(2)) + '。')
    + '\n每期按上面那张表逐期落库；尾差对齐到最后一期。';
  const content = [
    typeBadge({
      kind: KIND,
      status: blocked.length > 0 ? 'danger' : 'warn',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
      next: nextStepOf({ page: 'collect', missing: blocked.length, wakeWord: wakeWordOf(KIND) }),
    }),
    summaryRow(facts),
    renderCaliberLine('分期先定期数与总额，再按每期金额与日期逐期落库。')
      + renderCaliberLine('尾差对齐到最后一期，合计逐分等于总价。'),
    renderKpiGrid([
      { label: '总额', value: total === '' ? '未给' : total, detail: '这一笔总价（摊的就是它）' },
      { label: '期数', value: periods === '' ? '未给' : periods + ' 期', detail: shares.length === 0 ? '三样齐了才摊得出' : '每期日期＝每月同日，没有那一天就回退月末' },
      { label: '首期日', value: first === '' ? '未给' : first, detail: '第 1 期哪一天落账' },
    ]),
    renderParamForm({
      description: '这三格是这一型的参数，这一页只回显不让人改；要改就重说一遍，带上新值。',
      fields: [
        { name: TOTAL_NAME, label: TOTAL_LABEL, readonly: true, value: total, hint: '总价（元）' },
        { name: PERIODS_NAME, label: PERIODS_LABEL, readonly: true, value: periods, hint: '分几期' },
        { name: FIRST_NAME, label: FIRST_LABEL, readonly: true, value: first, hint: '第 1 期哪一天' },
      ],
    }),
    renderToast({
      msg: shares.length === 0 ? '期数角标：还没摊' : '期数角标：' + shares.length + ' 期',
      detail: shares.length === 0
        ? '总额／期数／首期日三样齐了才算分摊；超 24 期只显前 12 期，其余折起来。'
        : (shares.length > 24
          ? '共 ' + shares.length + ' 期，页面上先显前 12 期，其余折在下面那一格里。'
          : '共 ' + shares.length + ' 期，全列在下面那张表里。'),
      badge: { text: '期数角标', type: 'warn' },
    }),
    preview.html,
    preview.html === ''
      ? renderCaliberLine(
        '补齐总价／期数／首期日后，本页显示分摊预览（每期金额与日期）。'
        + (preview.err === '' ? '' : '分摊没算出来：' + preview.err + '（照实报错，不静默当空）。'),
      )
      : '',
    blockedBar({ items: blocked, command: commandLine(key, filled) }),
    copyArea({
      prompt: { text: prompt, label: blocked.length === 0 ? '照这个口径逐期落库，点这颗复制' : '补齐后照这句跟助手说一遍' },
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
    docTitle: DOC_TITLE + '·记分期', title: '记一笔分期', subtitle: message,
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
      next: nextStepOf({ page: 'receipt', exit: true }),
    }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: '这次记了几笔', value: receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      { label: '分期参数', value: (total || '未给') + ' ÷ ' + (periods || '未给') + ' 期', detail: '首期日 ' + (textOf(params[FIRST_NAME]) || '未给') },
    ]),
    renderToast({
      msg: '分期角标：这一笔按 ' + (periods || '未给') + ' 期摊',
      lines: [
        '总额 ' + (total || '未给') + '，尾差对齐到最后一期，合计逐分等于总价。',
        '每期日期＝每月同日。该月没有那一天就回退到月末。',
        '撤销走本页退出口。改期数走「改记录」，带新的总额与期数重算。',
      ],
      badge: { text: '分期角标', type: 'ok' },
    }),
    preview.html === ''
      ? renderCaliberLine(preview.err === '' ? '分摊预览：这次写库没带总额／期数／首期日，摊不出来（那一笔仍已落库）。' : '分摊没算出来：' + preview.err)
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
