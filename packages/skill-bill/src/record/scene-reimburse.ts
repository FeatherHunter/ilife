/** 场景件：记报销（`kind=reimburse`）。**本票：两格都换成这一件自己的装配体**。
 *
 * 服务哪条唤醒词：记报销（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'reimburse' }`）。
 * 本件出哪张页：**本场景定制的两张**——采集页（缺字段那一支）与回执页（落库后那一支）；
 *  块序列照代表页（`t407-代表-记支出-采集页.html`／`-回执页.html`）同一套积木，只换本场景的差异。
 * 待哪一族窗口来填：特殊收支族（本件＝那一族的交付，本族只认领 9 条里的这一条）。
 *
 * 本件的场景差异（施工图 `t407-页面块清单-16词.md` 第二节「记报销」那一行）：
 *   ① **支出型**：金额取负数（支出侧的分类候选，`../shared/photoEscape.ts` 的 `categorySideOf`）；
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
import { renderCaliberLine, renderDataTable, renderFeedbackBlock, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope, ToastInput } from 'base-paint';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { emptyNote } from '../shared/emptyNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { commandsOf, factsOf, fieldCardOf, pickOf, probeOf, promptOf } from '../shared/photoEscape.js';
import { prefillNote, prefillOf } from '../shared/prefillNote.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { summaryCards, summaryRow } from '../shared/summaryRow.js';
import { typeBadge } from '../shared/typeBadge.js';
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

/** 打标提示条（采集页那一块）：报「这一笔落库时要在备注里带 `#待报销`」＋ 标签怎么流转。**独立一块**。 */
function tagNote(): string {
  const toast: ToastInput = {
    msg: '这一笔落库时要在备注里带上 ' + TAG,
    detail: '报销是「先垫后补」：垫付这一步记成支出并打 ' + TAG + '，之后「报销到账」按这个标签把原垫付那一笔找出来。',
    icon: 'warn',
    badge: { text: '打标流转', type: 'warn' },
    lines: [
      '打标这一步：本页落库时由备注那一格带 ' + TAG,
      '之后找它：走「报销到账」那条唤醒词，按 ' + TAG + ' 检索，不按金额猜',
      '标签与备注同一格：' + TAG + ' 写在备注里（如「机场往返 ' + TAG + '」）',
    ],
  };
  return renderFeedbackBlock({ title: '打标提示条（这一笔带 ' + TAG + '）', toast });
}

/** 来源提示条（采集页那一块）：报「这一笔是从哪来的」＋ 与打标提示**各占独立一块**。 */
function sourceNote(): string {
  const toast: ToastInput = {
    msg: '来源提示：这一笔是你先垫出去的钱',
    detail: '金额取负数（支出型）——钱从你的账户出；报销到账是另一笔（钱回到账户），两条记录不合并。',
    icon: 'info',
    badge: { text: '来源', type: 'warn' },
    lines: [
      '钱的方向：这一步是出（负数）',
      '与「报销到账」的分工：那一条是进（正数）＋ 带 ' + TAG,
      '两块提示各占一格：这一块说来源，上一块说打标，不共容器（老侧两提示共一个容器互相覆盖，本件修掉）',
    ],
  };
  return renderFeedbackBlock({ title: '来源提示条（与打标提示各占独立一块）', toast });
}

/** 过程型采集页：缺字段时出这一页（只采集、不写库）。 */
function collectReimburse(input: CollectInput): string {
  const { params } = input;
  const blocked = blockedItems({ params, missing: input.missing, kind: 'reimburse' });
  const message = blockedMessage(input.missing, blocked);
  const marks = prefillOf({ params, recent: input.recent, today: input.today });
  const probe = probeOf({ params, today: input.today });
  const facts = factsOf({ params, date: input.today });
  const pick = pickOf(input.recent, 'reimburse');
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
      key: input.key,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库（打 ' + TAG + '）',
    }),
    summaryRow(facts),
    renderCaliberLine('写库：未发生——这一页只采集、不碰库；补齐后重跑同一条命令才会写。'),
    tagNote(),
    sourceNote(),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    prefillNote(marks),
    blockedBar({
      items: blocked,
      command: commandsOf(input.key, params, blocked, REPLACES),
      note: '报销这几格补齐之后重跑同一条命令才会写库；'
        + '备注里带上 ' + TAG + ' 才算打了标，之后「报销到账」按它找这一笔。',
    }),
    empties.join(''),
    fieldCardOf({
      description: '填好必需槽位后重跑同一条命令；这一步不写库。金额取负数（垫付出去的钱）；'
        + '备注那格写清垫了什么，并带上 ' + TAG + '。',
      slots: input.slots,
      params,
      marks,
      pick,
    }),
    promptCopyArea(promptOf(input.key, blocked), '复制 prompt（补齐后重跑）'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, params),
          source: input.source,
          detail: '未写库（采集页）',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·补齐报销槽位',
    title: '补齐报销槽位',
    subtitle: message,
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
  const toast: ToastInput = {
    msg: '这一笔已按报销打标：备注里带 ' + TAG,
    detail: '记的是垫付那一步（支出）。「报销到账」那一条是另一笔（收入 ＋ 消标），两条记录不合并。',
    icon: 'ok',
    badge: { text: '打标结果', type: 'ok' },
    lines: [
      '标签：' + TAG + '（写在备注里，跟着这一行走）',
      '怎么找回来：走「报销到账」，按 ' + TAG + ' 检索',
      '别按金额猜：同一天可能有好几笔同额垫付，标签才是准的',
    ],
  };
  const content = [
    typeBadge({ kind: 'reimburse', key: input.key, status: 'ok', state: '写库成功（已打 ' + TAG + '）' }),
    renderFeedbackBlock({ title: '打标说明条（这一笔怎么流转）', toast }),
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
    renderCaliberLine('这一条记在支出侧（垫付那一步）：金额是负数；'
      + '报销到账是另一笔（正数），按备注里的 ' + TAG + ' 对上。'),
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
