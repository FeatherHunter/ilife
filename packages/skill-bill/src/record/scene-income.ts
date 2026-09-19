/** 场景件：记收入（`kind=income`）。
 *
 * 服务哪条唤醒词：记收入（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'income' }`）。
 * 本件出哪张页：**本场景定制的两张**——采集页（缺字段那一支）与回执页（落库后那一支）；
 *  块序列照代表页（`t407-代表-记支出-采集页.html`／`-回执页.html`）同一套积木，只换本场景的差异。
 * 待哪一族窗口来填：基础收支族（本件＝那一族的交付）。
 *
 * 本件的场景差异（施工图 `t407-页面块清单-16词.md` 第二节「记收入」那一行 ＋ `../shared/summaryRow.ts` 的方向表）：
 *   ① **金额正数**：方向口径在 `summaryRow.ts` 的 `DIRECTION.income`（`sign: 1`、`require: '记收入要正数'`），
 *     负号交上来时由 `../shared/blockedSlots.ts` 的 `blockedItems` 拦下、只出采集页（不写库）；
 *   ② **分类落收入侧**：一条历史都没有时，分类候选退到收入 L1 名单——侧别判定住在
 *     `../shared/photoEscape.ts` 的件内判定 `categorySideOf`（不外给），取值口径住在
 *     `../shared/recentPicks.ts`，本件经 `valuesOf` 的 `pick` 拿到；
 *   ③ 标题与话术按收入说：徽章那句由 `typeBadge` 按 `DIRECTION` 出（本件不抄第二份）。
 *
 * 本轮整改（架构级：只动本件的可见正文与块序，不动行为判定与信封字段）：
 *   ① 采集页**首屏同形「未给」卡清零**（删结论摘要行那一网格，事实改由缺项标签＋缺项表＋字段卡承担）；
 *   ② 采集页写库口径四遍并一句、方向三句并一句（`金额取正数，负数不写库。`）；祈使句改陈述；
 *   ③ 页标题只留唤醒词（页型进架头那两枚徽章；原先那句「补齐收入槽位」缺唤醒词，HELP 索引命不中）；
 *   ④ 形状取 `../shared/collectFrame.ts` 里面向用户的那三种（进度／缺项标签／分段标题）；架头与按钮层级
 *     两句的固定文案是页面自指话，本席未上屏，作残项报给该件所属窗口；
 *   ⑤ 回执页：落值那三格不再缀「不填就记到…」（值已落库，那句话在回执页没有动作可做）；
 *      `写进去的项` 那一格的顿号枚举并成一句，明细仍在下表。
 *
 * 必有块（逐块在这里落点，核对见证据件第三节）：
 *   采集页＝页头与页面外框、类型徽章 `typeBadge`、口径行、重复检测提示条、
 *     预填标注、缺项阻断条、字段卡（三级分类＋心法）、空态 `emptyNote`、复制指令块、动作区（复制数据／复制日志）、
 *     错误回执（阻断条内）。
 *   回执页＝页头与页面外框、类型徽章（`ok` 档）、结论摘要行、写入明细表、对账折叠区、退出口、复制区。
 */
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import { collectBlockedFold, prefillShort } from './collectBody.js';
import { collectMissingTags, collectProgress, collectSectionTitle } from '../shared/collectFrame.js';
import { copyArea, copyLog, promptCopyArea, undoExit } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { emptyNote } from '../shared/emptyNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { blockedPromptOf, fieldCardOf, valuesOf } from '../shared/photoEscape.js';
import { prefillOf } from '../shared/prefillNote.js';
import { receiptStatusCard, reconcileDisclosure } from '../shared/receiptParts.js';
import { summaryCards } from '../shared/summaryRow.js';
import { nextStepOf, typeBadge } from '../shared/typeBadge.js';
import { fieldLabelOf } from '../shared/userWording.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';

/** 服务哪条唤醒词（`Scene.wakeWord`）。 */
const WORD: string = wakeWordOfKind('income');

/** 缺项时那条「补齐后重跑」的写库指令用什么占位：金额那格写清方向，不写空洞的「金额」。 */
const REPLACES: Readonly<Record<string, string>> = {
  amount: '<正数金额，如 12.5>',
  category: '<收入侧三级分类，如 工资/月薪/9月>',
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

/** 回执页那张网格：落值那几格不再缀缺省说法（值已经落库，那句「不填就记到…」在回执页没有动作可做）。 */
function receiptCardsOf(input: ReceiptInput): ReturnType<typeof summaryCards> {
  return summaryCards(input.facts).map((c) => (
    c.value === '未给' || c.detail === undefined || !c.detail.startsWith('不填就记')
      ? c
      : { label: c.label, value: c.value }
  ));
}

/** 采集页复制 prompt 区那段话：只报缺项与去向，不回抄命令原文（口令只有阻断条那一处，给看不给复制）。 */
function promptOf(wakeWord: string, labels: readonly string[]): string {
  return '这一笔还差 ' + labels.length + ' 项：' + labels.join('、')
    + '。这一页先不写库。补齐后跟助手说一遍「' + wakeWord + '」。';
}

/** 过程型采集页：缺字段时出这一页（只采集、不写库）。 */
function collectIncome(input: CollectInput): string {
  const { params } = input;
  const blocked = blockedItems({ params, missing: input.missing, kind: 'income' });
  const message = blockedMessage(input.missing, blocked);
  const marks = prefillOf({ params, recent: input.recent, today: input.today });
  const { pick, probe } = valuesOf({ recent: input.recent, params, kind: 'income', today: input.today });
  const bp = blockedPromptOf({ key: input.key, params, blocked, replaces: REPLACES });
  const envelope = envelopeOf(input.key, false, message);
  const empties: string[] = [];
  if (pick.account.length === 0) {
    empties.push(emptyNote({
      title: '没有可选的历史账户',
      text: '库里还没有带账户的记录，账户这一格现在是空的。',
      next: '账户为空就记到默认账户。',
    }));
  }
  const content = [
    typeBadge({
      kind: 'income',
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
      next: '',
    }),
    collectProgress({ wakeWord: WORD, missing: blocked.length }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    collectSectionTitle({ no: 1, title: '先看这一笔缺什么' }),
    renderCaliberLine('收入记正数，负数会被拦在这一页。'),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    marks.length === 0 ? '' : renderCaliberLine('预填标注：下面几格已经替你填上，来源写在格子里。'),
    collectBlockedFold({
      items: blocked,
      command: bp.command,
      note: '补齐后照上面那条口令跟助手说一遍。',
    }),
    empties.join(''),
    collectSectionTitle({ no: 2, title: '把缺的格逐格补齐' }),
    fieldCardOf({
      description: '补齐必需项即可继续。分类落收入侧的一级名目。',
      slots: input.slots,
      params,
      marks: prefillShort(marks),
      pick,
    }),
    promptCopyArea(promptOf(WORD, blocked.map((i) => i.label)), '这一段就是补齐后要发给助手的话'),
    collectSectionTitle({ no: 3, title: '补齐了再请助手记' }),
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
    docTitle: DOC_TITLE + '·采集页',
    title: WORD,
    subtitle: '缺 ' + blocked.length + ' 项，详见下表。',
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key: input.key,
    content,
  });
}

/** 结果型回执页：写库成功后出这一页（写库那一半在 `./write.ts`）。 */
function receiptIncome(input: ReceiptInput): string {
  const probe = probeOfReceipt(input);
  const envelope = envelopeOf(input.key, true, input.receipt.summary);
  const content = [
    typeBadge({
      kind: 'income',
      status: 'ok',
      state: '写库成功（收入取正数）',
      next: nextStepOf({ page: 'receipt', exit: true }),
    }),
    renderKpiGrid([
      ...receiptCardsOf(input),
      receiptStatusCard(input.receipt, input.writtenDetail),
      { label: '这次记了几笔', value: input.receipt.affectedRows + ' 笔' },
      {
        label: '写进去的项',
        value: input.receipt.writtenFields.length + ' 项',
        detail: '共 ' + input.receipt.writtenFields.length + ' 项，详见下表。',
      },
    ]),
    renderCaliberLine('收入侧，正数。'),
    duplicateNote(findDuplicates(input.recent, probe), probe, 'static'),
    renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: input.detail,
      caption: '这一笔记成什么',
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
  id: 'income',
  key: 'bill.record.add',
  kind: 'income',
  op: '',
  family: '基础收支族',
  collect: collectIncome,
  receipt: receiptIncome,
};
