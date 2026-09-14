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
 *   ③ 标题与话术按收入说：徽章那句「收入（金额取正数）」仍走 `typeBadge`（方向取自 `DIRECTION`，本件不抄第二份）。
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
import { typeBadge } from '../shared/typeBadge.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput, ReceiptInput, Scene } from './scene.js';

/** 服务哪条唤醒词（`Scene.wakeWord`）。 */
const WORD = '记收入';

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

/** 过程型采集页：缺字段时出这一页（只采集、不写库）。 */
function collectIncome(input: CollectInput): string {
  const { params } = input;
  const blocked = blockedItems({ params, missing: input.missing, kind: 'income' });
  const message = blockedMessage(input.missing, blocked);
  const marks = prefillOf({ params, recent: input.recent, today: input.today });
  const { pick, probe, facts } = valuesOf({ recent: input.recent, params, kind: 'income', today: input.today });
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
      kind: 'income',
      key: input.key,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
    }),
    summaryRow(facts),
    renderCaliberLine('写库：未发生——这一页只采集、不碰库；补齐后重跑同一条命令才会写。'),
    renderCaliberLine('方向口径：收入取正数——金额符号即方向；给成负数会被拦在这一页，不进写库那一步。'),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    prefillNote(marks),
    blockedBar({
      items: blocked,
      command: bp.command,
      note: '收入这几格补齐之后重跑同一条命令才会写库；分类候选取自近期记录，一条历史都没有时给收入侧的一级名目。',
    }),
    empties.join(''),
    fieldCardOf({
      description: '填好必需槽位后重跑同一条命令；这一步不写库。分类要 L1/L2/L3 三级'
        + '（收入侧一级名目：工资／奖金／兼职／投资／其他收入／退款）；金额取正数。',
      slots: input.slots,
      params,
      marks,
      pick,
    }),
    promptCopyArea(bp.prompt, '复制 prompt（补齐后重跑）'),
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
    docTitle: DOC_TITLE + '·补齐收入槽位',
    title: '补齐收入槽位',
    subtitle: message,
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
    typeBadge({ kind: 'income', key: input.key, status: 'ok', state: '写库成功（收入取正数）' }),
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
    renderCaliberLine('这一条记在收入侧：金额是正数、分类一级取自收入名单；'
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
    title: '记收入 · 回执',
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
  wakeWord: WORD,
  key: 'bill.record.add',
  kind: 'income',
  op: '',
  family: '基础收支族',
  collect: collectIncome,
  receipt: receiptIncome,
};
