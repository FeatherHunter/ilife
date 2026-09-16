/** 场景件：记报销（`kind=reimburse`）。**本票：两格都换成这一件自己的装配体**。
 *
 * 服务哪条唤醒词：记报销（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'reimburse' }`）。
 * 本件出哪张页：**本场景定制的两张**——采集页（缺字段那一支）与回执页（落库后那一支）；
 *  块序列照代表页（`t407-代表-记支出-采集页.html`／`-回执页.html`）同一套积木，只换本场景的差异。
 * 待哪一族窗口来填：特殊收支族（本件＝那一族的交付，本族只认领 9 条里的这一条）。
 *
 * 本件的场景差异（施工图 `t407-页面块清单-16词.md` 第二节「记报销」那一行）：
 *   ① **支出型**：金额取负数（支出侧的分类候选：侧别判定 `../shared/photoEscape.ts` 件内的 `categorySideOf`，
 *     取值口径 `../shared/recentPicks.ts`，本件经 `valuesOf` 的 `pick` 拿到）；
 *   ② **靠 `#待报销` 标记流转**：落库时在备注里带上 `#待报销`，后续「报销到账」按这个标签找它；
 *      **打标提示条与来源提示条各占独立一块**（老侧 `expense_form.html:150-154` 两提示共一个容器互相覆盖，
 *      是施工图第四节第 9 条点名的缺陷，本件修法就是分成两块）；
 *   ③ 报销语义的字段与提示：备注那格写清「垫了什么、什么时候交出去的」，打标那一块写清标签怎么流转。
 *
 * 必有块（逐块在这里落点，核对见证据件第三节）：
 *   采集页＝页头与页面外框、类型徽章 `typeBadge`、结论摘要行 `summaryRow`、口径行、**打标提示条**、**来源提示条**、
 *     重复检测提示条、预填标注、缺项阻断条、字段卡（三级分类＋心法）、空态、复制指令块、动作区、错误回执。
 *   回执页＝页头与页面外框、类型徽章（`ok` 档）、**打标说明条**、结论摘要行、写入明细表、对账折叠区、退出口、复制区。
 */
import { renderCaliberLine, renderDataTable, renderDisclosure, renderFeedbackBlock, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { collectMissingTags, collectSectionTitle } from '../shared/collectFrame.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { emptyNote } from '../shared/emptyNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { blockedPromptOf, fieldCardOf, valuesOf } from '../shared/photoEscape.js';
import { prefillNote, prefillOf } from '../shared/prefillNote.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { summaryCards } from '../shared/summaryRow.js';
import { typeBadge, wakeWordOf } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 服务哪条唤醒词（`Scene.wakeWord`）。 */
const WORD = '记报销';

/** 流转用的标签（打标提示条与打标说明条共引这一处，不各写一份字面量）。 */
const TAG = '#待报销';

/** 缺项时那条「补齐后重跑」的写库指令用什么占位。 */
const REPLACES: Readonly<Record<string, string>> = {
  amount: '<垫付金额取负数，如 -128.6>',
  category: '<支出侧三级分类，如 出行/打车/机场往返>',
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

/** 缺项阻断条整条收进折叠区：首屏只留缺项标签与一行副标题，口令原文不再常驻版面。
 *  内容与判定一字不动（仍是共用件 `blockedBar` 的产出），只换摆法；折叠与否那枚置灰按钮都点不动。 */
function blockedFold(items: readonly BlockedItem[], command: string, note: string): string {
  if (items.length === 0) return '';
  return renderDisclosure({
    title: '还缺什么，以及补齐后照抄的那条',
    contentHtml: blockedBar({ items, command, note }),
  });
}

/** 打标与来源合成一块浅色静态提示（白底页流里不再横插两张深色毛玻璃卡；标题只留一层、两行说全）。 */
function markNote(): string {
  return renderFeedbackBlock({
    toast: {
      msg: '垫付这一步记支出，备注带上 ' + TAG,
      detail: '到账另记一笔收入，按 ' + TAG + ' 找这一笔，不按金额猜。',
      icon: 'info',
    },
    staticNotice: true,
  });
}

/** 过程型采集页：缺字段时出这一页（只采集、不写库）。 */
function collectReimburse(input: CollectInput): string {
  const { params } = input;
  const blocked = blockedItems({ params, missing: input.missing, kind: 'reimburse' });
  const message = blockedMessage(input.missing, blocked);
  /** 副标题只报计数（进度形状）；缺项明细在进度行、标签组与阻断表明细三处形状里。 */
  const subtitle = wakeWordOf('reimburse') + '还差 ' + blocked.length + ' 项';
  const marks = prefillOf({ params, recent: input.recent, today: input.today });
  const { pick, probe, facts } = valuesOf({ recent: input.recent, params, kind: 'reimburse', today: input.today });
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
      kind: 'reimburse',
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
      next: '',
    }),
    blocked.length === 0 ? '' : collectSectionTitle({ no: 1, title: '先看这一笔缺什么' }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    renderKpiGrid(summaryCards(facts)),
    markNote(),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    prefillNote(marks),
    blockedFold(
      blocked,
      bp.command,
      '备注里带上 ' + TAG + ' 才算打了标，之后「报销到账」按它找这一笔。',
    ),
    empties.join(''),
    fieldCardOf({
      description: '补齐必需项即可继续。金额取负数，备注那格写清垫了什么并带上 ' + TAG + '。',
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
    docTitle: DOC_TITLE + '·记报销',
    title: '记一笔报销',
    subtitle,
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}

/** 结果型回执页：写库成功后出这一页（写库那一半在 `./write.ts`）。 */
function receiptReimburse(input: ReceiptInput): string {
  const probe = probeOfReceipt(input);
  const envelope = envelopeOf(input.key, true, input.receipt.summary);
  const content = [
    typeBadge({
      kind: 'reimburse',
      status: 'ok',
      state: '写库成功',
      next: '这一笔已记下，撤销见下方按钮。',
    }),
    renderFeedbackBlock({
      toast: {
        msg: '这一笔已按报销打标，备注里带 ' + TAG,
        detail: '「报销到账」按这个标签找它，不按金额猜。',
        icon: 'ok',
      },
      staticNotice: true,
    }),
    renderKpiGrid([
      ...summaryCards(input.facts),
      receiptStatusCard(input.receipt, input.writtenDetail),
      { label: '记了几笔', value: input.receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
      {
        label: '写进去的项',
        value: input.receipt.writtenFields.length + ' 项',
        detail: input.receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项',
      },
    ]),
    renderCaliberLine('这一条记在支出侧，金额是负数。报销到账是另一笔，按备注里的 ' + TAG + ' 对上。'),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
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
    title: '记报销 · 回执',
    subtitle: input.receipt.summary,
    slot: 'receipt',
    page: 'receipt',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}

export const SCENE: Scene = {
  id: 'reimburse',
  wakeWord: WORD,
  key: 'bill.record.add',
  kind: 'reimburse',
  op: '',
  family: '特殊收支族',
  collect: collectReimburse,
  receipt: receiptReimburse,
};
