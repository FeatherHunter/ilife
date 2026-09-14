/** 场景件：拍账单（`kind=photo`）。**本票：两格都换成这一件自己的装配体**。
 *
 * 服务哪条唤醒词：拍账单（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'photo' }`）。
 * 本件出哪张页：**本场景定制的两张**——采集页（先收三要素那一支）与回执页（落库后那一支）。
 * 待哪一族窗口来填：特殊收支族（本件＝那一族的交付）。
 *
 * 本件的场景差异（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「拍账单」那一行
 *  ＋第三节「图片识别入口」那一行，缺陷见第四节第 7 条）：
 *   ① **识别在本仓之外办**：本仓不装识别引擎、也不做上传控件（老侧同样没有，只有一行「已收到 N 张账单图片」）。
 *     页上那条通道只做一件事——把「已收到几张图／三要素还缺哪样／补齐后照抄哪条命令」讲清并给成可复制的一段
 *     （`../shared/photoEscape.ts` 的 `imageNote`／`escapeCard`／`escapePrompt`，口径只有那一处定义）；
 *   ② **文字三要素填空**：金额／分类／时间三格，名字取自 `../shared/photoEscape.ts` 的 `ESCAPE_FIELDS`
 *     （**唯一定义地**），表单、明示表、提示话术三处都引它，本件不另抄一份；
 *   ③ **缺一不许写库**：三要素缺哪样，阻断条就报哪样，缺项时不出可跑的写库指令（不给复制按钮）。
 *     也不替用户猜三要素里缺的值。
 *
 * 两个页面级的入参约定（本件读 `params`，不由命令注册表声明）：
 *   `params.images`＝本次交上来的账单图片张数（不给＝0）；`params.imageWhere`＝这些图现在在哪（不给＝「AI 侧」）。
 *   本仓不落图片，这两格只用来把「收图」这一步讲清楚。
 *
 * 必有块（逐块在这里落点，核对见证据件第三节）：
 *   采集页＝页头与页面外框、类型徽章 `typeBadge`、结论摘要行 `summaryRow`、口径行、已收图片数说明、
 *     识别外置分工卡、重复检测提示条、预填标注、缺项阻断条、字段卡（文字三要素填空）、复制指令块、
 *     动作区（复制数据／复制日志）、错误回执（阻断条内）。
 *   回执页＝页头与页面外框、类型徽章（`ok` 档）、结论摘要行、写入明细表、对账折叠区、退出口、复制区。
 */
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import {
  ESCAPE_FIELDS, commandsOf, escapeCard, escapePrompt, factsOf, fieldCardOf, imageNote, pickOf, probeOf, promptOf,
} from '../shared/photoEscape.js';
import type { FieldSlot, PhotoScale } from '../shared/photoEscape.js';
import { prefillNote, prefillOf } from '../shared/prefillNote.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { summaryCards, summaryRow } from '../shared/summaryRow.js';
import { typeBadge } from '../shared/typeBadge.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 服务哪条唤醒词（`Scene.wakeWord`）。 */
const WORD = '拍账单';

/** 本件认的 `kind`。 */
const KIND = 'photo';

/** 缺项时那条「补齐后重跑」的写库指令用什么占位：三要素各给自己那一格的说法。 */
const REPLACES: Readonly<Record<string, string>> = {
  amount: '<外部识别出的金额：支出为负、收入为正>',
  category: '<外部识别出的分类：L1/L2/L3>',
  time: '<账单上的时间，如 2026-09-14>',
};

/** 三要素的字段卡（名字与提示取自 `ESCAPE_FIELDS`，本件只补「必需」这一格）。 */
const ESCAPE_SLOTS: readonly FieldSlot[] = ESCAPE_FIELDS.map((f) => ({
  name: f.name,
  label: f.label,
  hint: f.hint,
  required: true,
}));

/** 一个值算不算「给了」：`undefined`／`null`／空白串都不算，0 算给了。 */
function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 已收图片数入参（页面级约定，见件头）：`params.images` 是张数、`params.imageWhere` 是图现在在哪。 */
function scaleOf(params: Record<string, unknown>): PhotoScale {
  const raw = params['images'];
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  const where = isGiven(params['imageWhere']) ? String(params['imageWhere']) : 'AI 侧（本仓不存图、也不读图）';
  return { count: Number.isFinite(n) ? n : 0, where };
}

/** 页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状）。 */
function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok, message },
  };
}

/** 回执页的重复检测探针：写完再报一次，排除本次这条编号。 */
function probeOfReceipt(input: ReceiptInput): DuplicateProbe {
  return {
    amount: input.facts.amount,
    category: input.facts.category,
    date: input.facts.time,
    account: input.facts.account,
    ...(input.receipt.recordId === null ? {} : { excludeId: input.receipt.recordId }),
  };
}

/** 过程型采集页：先收三要素（只采集、不写库）。 */
function collectPhoto(input: CollectInput): string {
  const { params } = input;
  const blocked = blockedItems({ params, missing: input.missing, kind: KIND });
  const message = blockedMessage(input.missing, blocked);
  const marks = prefillOf({ params, recent: input.recent, today: input.today });
  const probe = probeOf({ params, today: input.today });
  const facts = factsOf({ params, date: input.today });
  const pick = pickOf(input.recent, KIND);
  const scale = scaleOf(params);
  const envelope = envelopeOf(input.key, false, message);
  const content = [
    typeBadge({
      kind: KIND,
      key: input.key,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
    }),
    summaryRow(facts),
    renderCaliberLine('写库：未发生——这一页只采集、不碰库；三要素补齐后重跑同一条命令才会写。'),
    renderCaliberLine('识别口径：图片识别在本仓之外办——本仓不装识别引擎，也不做上传控件；'
      + '页上只给三要素文字填空，缺哪样报哪样。'),
    imageNote(scale),
    escapeCard({ params }),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    prefillNote(marks),
    blockedBar({
      items: blocked,
      command: commandsOf(input.key, params, blocked, REPLACES),
      note: '三要素（金额／分类／时间）缺一不许写库，也不替用户猜缺的那一格；'
        + '补齐之后重跑同一条命令才会写库。',
    }),
    fieldCardOf({
      description: '文字三要素填空：金额、分类、时间。分类要 L1/L2/L3 三级'
        + '（如 餐饮/外卖/午餐）；金额带符号，支出为负、收入为正；时间是账单上的日期。',
      slots: ESCAPE_SLOTS,
      params,
      marks,
      pick,
    }),
    promptCopyArea(escapePrompt({ params, blocked, scale }), '复制 prompt（外部识别后补齐重跑）'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, params),
          source: input.source,
          detail: '未写库（采集页） · 已收 ' + (scale.count > 0 ? scale.count : 0) + ' 张图',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·补齐三要素',
    title: WORD + ' · 补齐三要素',
    subtitle: message,
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}

/** 结果型回执页：写库成功后出这一页（写库那一半在 `./write.ts`）。 */
function receiptPhoto(input: ReceiptInput): string {
  const probe = probeOfReceipt(input);
  const envelope = envelopeOf(input.key, true, input.receipt.summary);
  const content = [
    typeBadge({ kind: KIND, key: input.key, status: 'ok', state: '写库成功（三要素来自外部识别）' }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(input.receipt, input.writtenDetail),
      { label: '影响行数', value: input.receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: input.receipt.writtenFields.length + ' 项',
        detail: input.receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    renderCaliberLine('这一条的金额／分类／时间三样都来自本仓之外的识别结果（本仓不存图、不读图）；'
      + '本页的字段与值都取自库内那一行，不是拿参数顶的。'),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: input.detail,
      caption: '本次写入的字段与值',
    }),
    reconcileDisclosure(input.receipt),
    input.receipt.recordId === null ? '' : undoExit(input.receipt.recordId),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: input.receipt.source,
          detail: '影响 ' + input.receipt.affectedRows + ' 行 · 字段 '
            + (input.receipt.writtenFields.join('/') || '未设置'),
          actionAt: input.receipt.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·写库回执',
    title: WORD + ' · 回执',
    subtitle: input.receipt.summary,
    slot: 'receipt',
    page: 'receipt',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}

export const SCENE: Scene = {
  id: 'photo',
  wakeWord: WORD,
  key: 'bill.record.add',
  kind: KIND,
  op: '',
  family: '特殊收支族',
  collect: collectPhoto,
  receipt: receiptPhoto,
};
