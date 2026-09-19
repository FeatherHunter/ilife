/** 写入域模板之一 · **分期确认**（`t685-按域页型表.md` §2.1 的「分期确认」那一行）。
 *
 * **本件是块位序列的唯一住所**：采集页与回执页的块序、每块的出现条件、每块吃的数据形态都写在这里；
 *  场景件（`scene-installment`）只给差异值——唤醒词、型名、分摊三格的参数名与中文名、几段标题与角标。
 *  改一次版式只动本件一处。
 *
 * 盖住的场景（**单场景族**，一个 `installment`）：老侧 `templates/写入/installment_confirm.html`
 *  （块位锚点 `:41-66`：页壳与标题 `:41-45`、表单区 `.params` `:48-51`、分摊预览小表 `:55-58`、
 *  〔折叠说明〕`.fold-hint` `:59`、复制区 `:63-66`）与 `scripts/render_write.py:466`；本仓按「一命令一页」
 *  拆成采集／回执两张，两张都住本件。
 *
 * **块位序列**（照 #688 §五 5.2 的 ① 采集／④ 回执 两类；● 恒出、○ 有内容才出）：
 *
 *   采集页：类型徽章 ● → 第 1 段标题 ○（缺项才出）→ 缺项标签 ● → 读数行（摘要五格）● → 期数角标 ● →
 *     第 2 段标题 ● → 参数只读回显（表单区）● → 第 3 段标题 ● → 分摊预览标注 ○ → 分摊预览表 ○ →
 *     算不出分摊那枚角标 ○ → 缺项阻断条（折叠）○ → 复制区（含口径那段话）●
 *   回执页：类型徽章 ● → 读数行（摘要五格 ＋ 写入状态 ＋ 这一次记了几笔 ＋ 分期参数）● → 分摊口径提示 ● →
 *     分摊预览表 ○（算不出时换成那枚角标 ○）→ 写入明细表 ● → 对账折叠区 ● → 退出口 ○ → 复制区 ●
 *
 * 本件的两处口径（与老侧不同处逐条记在这里）：
 *   ① **先校验再算**：总额／期数／首期日缺一项就不写库、也不算；给了但解析不出（如总额写「一千」）
 *      当场把解析失败那句原文摆到阻断条里，**不许静默当空**（施工图第二节「记分期」的缺项阻断那一格）；
 *   ② 分摊表由共用件 `src/write/installmentPreview.ts` 算与摆（尾差对齐到最后一期、合计逐分等于总价），
 *      本件不自己算钱——老侧把差额补在**首期**且裸转数字会先崩，本件两处都不照抄（差额在末期、先校验再算）。
 *
 * 本件自己拼的句子（不入 `InstallmentSpec`）：带数字、带本次取值的那几句——副标题、复制区那段话、
 *  分摊那条标注、回执那条分摊提示；spec 只收**一句一句的固定文案**。
 *
 * 谁在用（一个调用点，指名）：`src/write/scene-installment.ts`——它的 `Scene.collect`／`Scene.receipt`
 *  都是 `bindInstallmentPages(spec)` 的产物，本件不自己出页。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderChips, renderDataTable, renderDisclosure, renderFeedbackBlock, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import { blockedBar, blockedItems, blockedMessage } from './blockedSlots.js';
import type { BlockedItem } from './blockedSlots.js';
import { collectMissingTags, collectSectionTitle } from './collectFrame.js';
import { copyArea, copyLog, undoExit } from '../shared/copyArea.js';
import { installmentPreview, installmentShares } from './installmentPreview.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { receiptStatusCard, reconcileDisclosure } from './receiptParts.js';
import { summaryCards } from './summaryRow.js';
import type { SummaryFacts } from './summaryRow.js';
import { typeBadge } from './typeBadge.js';
import { fieldLabelOf } from './userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 场景给模板的**差异声明**：值、文案与「哪一块长什么样」，**不含任何块位拼装**。 */
export interface InstallmentSpec {
  /** 唤醒词（页标题、副标题前缀、复制区那段话里那句「唤醒词：…」）。 */
  readonly word: string;
  /** 认的 `kind`（类型徽章上的型名，也是缺项方向判定的入参）。 */
  readonly kind: string;

  /** 分摊第一格「总额」的参数名（`params` 里那一格）。 */
  readonly totalName: string;
  /** 分摊第一格的中文名（表单标签、缺项阻断条、复制区那段话三处共用）。 */
  readonly totalLabel: string;
  /** 分摊第一格怎么给（字段卡里那一句）。 */
  readonly totalHint: string;
  /** 分摊第一格没给时那句「为什么写不进去」。 */
  readonly totalWhy: string;
  /** 分摊第二格「期数」的参数名。 */
  readonly periodsName: string;
  /** 分摊第二格的中文名。 */
  readonly periodsLabel: string;
  /** 分摊第二格怎么给。 */
  readonly periodsHint: string;
  /** 分摊第二格没给时那句「为什么写不进去」。 */
  readonly periodsWhy: string;
  /** 分摊第三格「首期日」的参数名。 */
  readonly firstDateName: string;
  /** 分摊第三格的中文名（回执页读数行那一格也引它）。 */
  readonly firstDateLabel: string;
  /** 分摊第三格怎么给。 */
  readonly firstDateHint: string;
  /** 分摊第三格没给时那句「为什么写不进去」。 */
  readonly firstDateWhy: string;

  /** 采集页：第 1 段标题（只在有缺项时出）。 */
  readonly section1: string;
  /** 采集页：期数角标那几枚，按序（前三枚正是三格的中文名）。 */
  readonly chips: readonly string[];
  /** 采集页：第 2 段标题（参数只供核对）。 */
  readonly section2: string;
  /** 采集页：字段卡的操作说明（参数只读，改值重说）。 */
  readonly description: string;
  /** 采集页：第 3 段标题（分摊预览）。 */
  readonly section3: string;
  /** 采集页：三样没齐（算不出分摊）时那枚角标。 */
  readonly noSharesChip: string;
  /** 采集页：缺项阻断条那个折叠区的标题。 */
  readonly foldTitle: string;
  /** 采集页：不缺项时复制区那颗按钮上的小标题。 */
  readonly promptLabel: string;
  /** 采集页：有缺项时复制区那颗按钮上的小标题。 */
  readonly promptLabelBlocked: string;

  /** 回执页：类型徽章那句状态。 */
  readonly receiptState: string;
  /** 回执页：徽章那句下一步（这一句本族定死，不按有没有退出口算）。 */
  readonly receiptNext: string;
  /** 回执页：读数行里「这一次记了几笔」那一格的标签。 */
  readonly receiptRowsLabel: string;
  /** 回执页：那一格的详情句（写着「按库里的改动算」）。 */
  readonly receiptRowsDetail: string;
  /** 回执页：读数行里「分期参数」那一格的标签。 */
  readonly receiptPeriodsLabel: string;
  /** 回执页：分摊口径提示那条的详情句。 */
  readonly receiptFeedbackDetail: string;
  /** 回执页：分摊也算不出时那枚角标（缺参数那一档说哪句）。 */
  readonly receiptNoSharesChip: string;
  /** 回执页：写入明细表的小标题。 */
  readonly receiptCaption: string;
}

/** 场景件拿到手的两张页（`Scene` 的 `collect`／`receipt` 两格）。 */
export function bindInstallmentPages(spec: InstallmentSpec): Pick<Scene, 'collect' | 'receipt'> {
  return { collect: (input) => collectPage(spec, input), receipt: (input) => receiptPage(spec, input) };
}

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

/** 页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状）。 */
function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok, message },
  };
}

/** 缺项阻断条整条收进折叠区：首屏只留缺项标签与一行副标题，口令原文不再常驻版面。
 *  内容与判定一字不动（仍是共用件 `blockedBar` 的产出），只换摆法；折叠与否那枚置灰按钮都点不动。 */
function blockedFold(title: string, items: readonly BlockedItem[], command: string): string {
  if (items.length === 0) return '';
  return renderDisclosure({
    title,
    contentHtml: blockedBar({ items, command }),
  });
}

/** 分摊那一格：三样齐了才算得出来；齐了就交给共用件算，算不动（解析失败）把那句话原样报回来。 */
function previewOrNote(spec: InstallmentSpec, params: Record<string, unknown>): { readonly html: string; readonly err: string } {
  const total = textOf(params[spec.totalName]);
  const periods = textOf(params[spec.periodsName]);
  const first = textOf(params[spec.firstDateName]);
  if (total === '' || periods === '' || first === '') {
    return { html: '', err: '' };
  }
  try {
    return { html: installmentPreview({ total, periods, startDate: first }), err: '' };
  } catch (e) {
    return { html: '', err: e instanceof Error ? e.message : String(e) };
  }
}

/** 采集页正文：参数只读回显 ＋ 期数角标 ＋ 分摊预览表 ＋ 阻断条 ＋ 两段复制区。块序见件头。 */
function collectPage(spec: InstallmentSpec, input: CollectInput): string {
  const { key, params, missing } = input;
  const total = textOf(params[spec.totalName]);
  const periods = textOf(params[spec.periodsName]);
  const first = textOf(params[spec.firstDateName]);
  const amount = amountOf(params.amount);
  const base = blockedItems({ params, missing, kind: spec.kind });
  const extra: BlockedItem[] = [];
  if (total === '') extra.push({ name: spec.totalName, label: spec.totalLabel, why: spec.totalWhy });
  if (periods === '') extra.push({ name: spec.periodsName, label: spec.periodsLabel, why: spec.periodsWhy });
  if (first === '') extra.push({ name: spec.firstDateName, label: spec.firstDateLabel, why: spec.firstDateWhy });
  const preview = previewOrNote(spec, params);
  if (preview.err !== '') {
    // 解析失败照实报错（不静默当空、不拿 0 顶）：这一格进了阻断条，复制指令就不出。
    extra.push({ name: spec.totalName, label: spec.totalLabel, why: preview.err });
  }
  const blocked = [...base, ...extra];
  const message = blockedMessage(missing, base)
    + (extra.length === 0 ? '' : '；本型另需：' + extra.map((i) => i.label).join('、'));
  /** 副标题只报计数（进度形状）；缺项明细在标签组与阻断表明细两处形状里。 */
  const subtitle = spec.word + '还差 ' + blocked.length + ' 项';
  const envelope = envelopeOf(key, false, message);
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
    + '\n请加载「饼干记账」技能，帮我记一笔分期。\n唤醒词：' + spec.word + '\n'
    + spec.totalLabel + '：' + (total || '<' + spec.totalLabel + '>') + '\n'
    + spec.periodsLabel + '：' + (periods || '<' + spec.periodsLabel + '>') + '\n'
    + spec.firstDateLabel + '：' + (first || '<' + spec.firstDateLabel + '>') + '\n'
    + '分类：' + (facts.category || '<三级分类>') + '\n'
    + '账户：' + (facts.account || '<账户>') + '\n'
    + '账本：' + (facts.ledger || '<账本>') + '\n'
    + (shares.length === 0 ? '分摊预览还没算出来，三样齐了才算。' : '分摊预览见上面那张表。')
    + '\n每期按上面那张表逐期记，尾差归最后一期。';
  const content = [
    typeBadge({
      kind: spec.kind,
      status: blocked.length > 0 ? 'danger' : 'warn',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待核对 · 未写库',
      next: '',
    }),
    blocked.length === 0 ? '' : collectSectionTitle({ no: 1, title: spec.section1 }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    renderKpiGrid(summaryCards(facts)),
    renderChips({ items: spec.chips.map((text) => ({ text })) }),
    collectSectionTitle({ no: 2, title: spec.section2 }),
    renderParamForm({
      description: spec.description,
      fields: [
        { name: spec.totalName, label: spec.totalLabel, readonly: true, value: total, hint: spec.totalHint },
        { name: spec.periodsName, label: spec.periodsLabel, readonly: true, value: periods, hint: spec.periodsHint },
        { name: spec.firstDateName, label: spec.firstDateLabel, readonly: true, value: first, hint: spec.firstDateHint },
      ],
    }),
    collectSectionTitle({ no: 3, title: spec.section3 }),
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
      ? renderChips({ items: [{ text: spec.noSharesChip }] })
      : '',
    blockedFold(spec.foldTitle, blocked, commandLine(key, filled)),
    copyArea({
      prompt: { text: prompt, label: blocked.length === 0 ? spec.promptLabel : spec.promptLabelBlocked },
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
    docTitle: DOC_TITLE + '·' + spec.word, title: spec.word, subtitle,
    slot: 'collect', page: 'collect', shape: envelope.shape, key, content,
  });
}

/** 回执页正文：分摊预览表（写库那一笔按期数摊开的同一张）＋ 写入明细表 ＋ 对账折叠区 ＋ 退出口 ＋ 复制区。 */
function receiptPage(spec: InstallmentSpec, input: ReceiptInput): string {
  const { key, params, receipt } = input;
  const preview = previewOrNote(spec, params);
  const total = textOf(params[spec.totalName]);
  const periods = textOf(params[spec.periodsName]);
  const envelope = envelopeOf(key, true, receipt.summary);
  const content = [
    typeBadge({
      kind: spec.kind,
      status: 'ok',
      state: spec.receiptState,
      next: spec.receiptNext,
    }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(receipt, input.writtenDetail),
      { label: spec.receiptRowsLabel, value: receipt.affectedRows + ' 笔', detail: spec.receiptRowsDetail },
      {
        label: spec.receiptPeriodsLabel,
        value: (total || '未给') + ' ÷ ' + (periods || '未给') + ' 期',
        detail: spec.firstDateLabel + ' ' + (textOf(params[spec.firstDateName]) || '未给'),
      },
    ]),
    renderFeedbackBlock({
      toast: {
        msg: '这一笔按 ' + (periods || '未给') + ' 期摊，尾差归最后一期',
        detail: spec.receiptFeedbackDetail,
        icon: 'ok',
      },
      staticNotice: true,
    }),
    preview.html === ''
      ? renderChips({ items: [{ text: preview.err === '' ? spec.receiptNoSharesChip : '分摊没算出来：' + preview.err }] })
      : preview.html,
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: input.detail,
      caption: spec.receiptCaption,
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
    docTitle: DOC_TITLE + '·写库回执', title: spec.word + ' · 回执', subtitle: receipt.summary,
    slot: 'receipt', page: 'receipt', shape: envelope.shape, key, content,
  });
}
