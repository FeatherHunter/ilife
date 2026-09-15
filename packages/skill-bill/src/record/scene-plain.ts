/** 场景件：记一笔（`kind` 空＝没有 preset 的通用词）。**本票：两格都换成这一件自己的装配体**。
 *
 * 服务哪条唤醒词：记一笔（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里不带 `preset` 的那一条）。
 *  本件还是**认不得的 `kind` 的兜底**：`src/record/scene.ts` 的 `sceneFor` 第四条判定把「其余」判到本件，
 *  命令本身已由注册表拦过，本件不猜、不抛。
 * 本件出哪张页：**本场景定制的两张**——采集页（缺项那一支）与回执页（落库后那一支）；
 *  块序列照代表页（`t407-代表-记支出-采集页.html`／`-回执页.html`）同一套积木，只换本场景的差异。
 * 待哪一族窗口来填：基础收支族（本件＝那一族的交付）。
 *
 * 本件的场景差异（施工图 `docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记一笔」那一行）：
 *   ① **方向按金额符号判**：没有 preset，支出负数、收入正数都由金额本身说；
 *     徽章那句「按金额符号判支出／收入」走 `../shared/typeBadge.ts`（`kind` 给空串时的缺省那句话）；
 *   ② **分类两侧都给**：一条历史都没有时，分类候选不偏向支出或收入（`../shared/photoEscape.ts` 的 `valuesOf`，`kind` 给空串）；
 *   ③ **符号与方向不符要当面问清**：`kind` 空时本件不替用户定方向——给成什么符号就记什么方向，
 *     这句话写在口径行里，结论摘要行的方向也照实报。
 *
 * 必有块（逐块在这里落点，核对见证据件第三节）：
 *   采集页＝页头与页面外框、类型徽章 `typeBadge`、结论摘要行 `summaryRow`、口径行、重复检测提示条、
 *     预填标注、缺项阻断条、字段卡（三级分类＋心法）、空态 `emptyNote`、复制指令块、动作区（复制数据／复制日志）、
 *     错误回执（阻断条内）。
 *   回执页＝页头与页面外框、类型徽章（`ok` 档）、结论摘要行、写入明细表、对账折叠区、退出口、复制区。
 */
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { emptyNote } from '../shared/emptyNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { blockedPromptOf, fieldCardOf, valuesOf } from '../shared/photoEscape.js';
import { prefillNote, prefillOf } from '../shared/prefillNote.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { summaryCards, summaryRow } from '../shared/summaryRow.js';
import { nextStepOf, typeBadge, wakeWordOf } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 服务哪条唤醒词（`Scene.wakeWord`）。 */
const WORD = '记一笔';

/** 本件认的 `kind`：空串＝不按型认，方向按金额符号判。 */
const KIND = '';

/** 缺项时那条「补齐后重跑」的写库指令用什么占位。 */
const REPLACES: Readonly<Record<string, string>> = {
  amount: '<金额，如 -35 或 5000>',
  category: '<三级分类，如 餐饮/外卖/午餐>',
};

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

/** 过程型采集页：缺项时出这一页（只采集、不写库）。 */
function collectPlain(input: CollectInput): string {
  const { params } = input;
  const blocked = blockedItems({ params, missing: input.missing, kind: KIND });
  const message = blockedMessage(input.missing, blocked);
  const marks = prefillOf({ params, recent: input.recent, today: input.today });
  const { pick, probe, facts } = valuesOf({ recent: input.recent, params, kind: KIND, today: input.today });
  const bp = blockedPromptOf({ key: input.key, params, blocked, replaces: REPLACES });
  const envelope = envelopeOf(input.key, false, message);
  const empties: string[] = [];
  if (pick.account.length === 0) {
    empties.push(emptyNote({
      title: '没有可选的历史账户',
      text: '库里还没有带账户的记录，账户这一格没有候选可以挑。',
      next: '账户留空即落默认账户；想选就先给一笔带账户的记录（例如 支付宝）。',
    }));
  }
  const content = [
    typeBadge({
      kind: KIND,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
      next: nextStepOf({ page: 'collect', missing: blocked.length, wakeWord: wakeWordOf(KIND) }),
    }),
    summaryRow(facts),
    renderCaliberLine('写库：还没发生——这一页先不写库，只采集；补齐之后跟助手说一遍才会写。'),
    renderCaliberLine('方向：这一条方向按金额符号判——支出记负数、收入记正数；'
      + '给什么符号就记什么方向，这一页不替你改符号。'),
    renderCaliberLine('认不得型名的时候，这一页也照实报，不猜是哪一型。'),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    prefillNote(marks),
    blockedBar({
      items: blocked,
      command: bp.command,
      note: '金额与分类补齐之后跟助手说一遍才会写库；分类候选取自近期记录，'
        + '一条历史都没有时支出侧与收入侧的一级名目都给。',
    }),
    empties.join(''),
    fieldCardOf({
      description: '填好必需项再说一遍；这一页先不写库。分类要选到最细那一级'
        + '（最细一级即名目，如 餐饮/外卖/午餐）；金额带符号，符号即方向。',
      slots: input.slots,
      params,
      marks,
      pick,
    }),
    promptCopyArea(bp.prompt, '补齐后照这句跟助手说一遍'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, params),
          source: input.source,
          detail: '没写库（采集页）',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·补齐槽位',
    title: WORD + ' · 补齐槽位',
    subtitle: message,
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}

/** 结果型回执页：写库成功后出这一页（写库那一半在 `./write.ts`）。 */
function receiptPlain(input: ReceiptInput): string {
  const probe = probeOfReceipt(input);
  const envelope = envelopeOf(input.key, true, input.receipt.summary);
  const content = [
    typeBadge({
      kind: KIND,
      status: 'ok',
      state: '写库成功（方向按金额符号判）',
      next: nextStepOf({ page: 'receipt', exit: true }),
    }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(input.receipt, input.writtenDetail),
      { label: '这次记了几笔', value: input.receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      {
        label: '写进去的项',
        value: input.receipt.writtenFields.length + ' 项',
        detail: input.receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项',
      },
    ]),
    renderCaliberLine('这一条是通用词那一件落下来的：方向由金额符号定（负数支出、正数收入）；'
      + '本页的字段与值都取自库内那一行，不是拿参数顶的。'),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: input.detail,
      caption: '写进去的项与值',
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
          detail: '改了 ' + input.receipt.affectedRows + ' 笔，写进去 '
            + (input.receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项'),
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
  id: 'plain',
  wakeWord: WORD,
  key: 'bill.record.add',
  kind: KIND,
  op: '',
  family: '基础收支族',
  collect: collectPlain,
  receipt: receiptPlain,
};
