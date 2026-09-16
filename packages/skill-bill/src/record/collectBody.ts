/** 通用采集页装配体（**本票的通用形态**）：有阻断项时出这一页（**只采集、不写库**）。
 *
 * 谁在用（本票实数）：
 *   ① `src/record/scene-*.ts` 的 16 件场景件都指它——`Scene.collect` 这一格现在是本件；
 *   ② `src/record/collect.ts`——分派位只取件、不自己装配，故不直接引本件。
 *  后续三族窗口填各自那张页时，把**那件场景件**的 `collect` 换成自己的装配体即可，本件一行不动。
 *
 * 信息层次（施工图第一节的页面积木按序拼，一件不自造）：
 *   类型徽章 → 结论摘要行 → 复制日志那行「写库：未发生」→ 重复检测提示条 → 预填标注 → 缺项阻断条
 *   → 选择器空态 → 采集表单 → 复制 prompt 区 → 复制区（共十块）。
 *  复制 prompt 区那段话里**没有可跑的写库指令**（写库指令只在缺项阻断条里、且不给复制按钮）——
 *  这就是「缺项即不出复制指令」那条口径；本页**不写库**：写库那一半在 `src/record/write.ts`，
 *  落点是结果型回执整页（`./receiptBody.ts`）。
 *
 * 本轮整改（根因二）：类型徽章原先是「动作 · 金额符号 · 命令名 · 槽位状态 · 写库状态」一行拼出来的串，
 *  现在改成若干枚独立形状（唤醒词标签／页面状态徽章／下一步动作），命令名不上屏；页标题也补上唤醒词。
 */
import { renderCaliberLine, renderParamForm } from 'base-paint/blocks';
import type { ParamFieldInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { BillRow } from '../fetch/db.js';
import { ALL_L1, EXPENSE_L1 } from '../policy/category.js';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import { collectButtonHint, collectFrameHead, collectMissingTags, collectProgress, collectSectionTitle } from '../shared/collectFrame.js';
import { copyArea, copyLog, promptCopyArea } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { emptyNote } from '../shared/emptyNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { prefillHint, prefillNote, prefillOf } from '../shared/prefillNote.js';
import type { PrefillMark } from '../shared/prefillNote.js';
import { optionsFor, pickOf as pickValues, textOf } from '../shared/recentPicks.js';
import { summaryRow } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { nextStepOf, typeBadge, wakeWordOf } from '../shared/typeBadge.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput } from './scene.js';
import { isGiven } from './slots.js';
import type { RecordSlot } from './slots.js';

/** 三枚选择器的候选（**转发到共用位 `src/shared/recentPicks.ts`，本件不另写一份取数**）：
 *  通用采集页的 `kind` 只有「支出」与「其余」两档，支出落支出侧名单、其余两侧都给。
 *  本次整改把原先住在本件的 `PICK_LIMIT`／`textOf`／`distinct`／`optionsFor` 一并交出，只留这一行转发。 */
function pickOf(recent: readonly BillRow[], kind: string): Record<string, readonly string[]> {
  return pickValues(recent, kind === 'expense' ? EXPENSE_L1 : ALL_L1);
}

/** 采集表单的七槽：字段一律由 `renderParamForm` 出（标签与控件配对、每格带 `name`）。 */
function formFields(input: {
  readonly slots: readonly RecordSlot[];
  readonly params: Record<string, unknown>;
  readonly marks: readonly PrefillMark[];
  readonly pick: Record<string, readonly string[]>;
}): ParamFieldInput[] {
  return input.slots.map((s) => {
    const mark = input.marks.find((m) => m.name === s.name);
    const value = isGiven(input.params[s.name]) ? String(input.params[s.name]) : (mark?.value ?? '');
    const options = optionsFor(input.pick, s.name, value);
    return {
      name: s.name,
      label: s.label,
      hint: prefillHint(input.marks, s.name) ?? s.hint,
      ...(options === undefined ? {} : { options }),
      ...(s.required ? { required: true } : {}),
      ...(value === '' ? {} : { value }),
    };
  });
}

/** 复制 prompt 区那段 prompt：说清缺什么、这一页先不写库、补齐后照哪句跟助手说。
 *  **不给可跑的写库指令**（那条在缺项阻断条里、且不给复制按钮）——缺项即不出复制指令。
 *  本轮整改：缺项清单写中文名（库列名不上屏），`重跑同一条命令` 换「跟助手说一遍」。 */
function promptOf(
  wakeWord: string,
  command: string,
  blocked: readonly { readonly label: string; readonly name: string; readonly why: string }[],
): string {
  return '这一笔还差 ' + blocked.length + ' 项：'
    + blocked.map((i) => i.label + '（' + i.why + '）').join('、')
    + '。\n这一页先不写库；补齐之后跟助手说一遍「' + wakeWord + '」，照这条说：' + command + '。';
}

/** 缺项时那条写库指令原文：缺的值留成尖括号占位符，**只给看不给复制**（复制按钮在阻断条里被拿掉）。 */
function commandLineOf(
  key: string,
  params: Record<string, unknown>,
  blocked: readonly { readonly name: string; readonly label: string }[],
): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  return commandLine(key, filled);
}

/** 通用采集页整页：十块按序拼（见文件头信息层次）。 */
export function collectBody(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const kind = textOf(params.kind);
  const wakeWord = wakeWordOf(kind);
  const blocked = blockedItems({ params, missing, kind });
  const message = blockedMessage(missing, blocked);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok: false, message },
  };
  const prefill = prefillOf({ params, recent: input.recent, today: input.today });
  const amount = isGiven(params.amount) ? Number(params.amount) : null;
  const probe: DuplicateProbe = {
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    category: textOf(params.category),
    date: textOf(params.time) === '' ? input.today : textOf(params.time),
    account: textOf(params.account),
  };
  const facts: SummaryFacts = {
    amount: probe.amount,
    category: probe.category,
    account: textOf(params.account),
    ledger: textOf(params.ledger),
    time: textOf(params.time),
  };
  const pick = pickOf(input.recent, kind);
  const empties: string[] = [];
  if (pick.account.length === 0) {
    empties.push(emptyNote({
      title: '没有可选的历史账户',
      text: '库里还没有带账户的记录，账户这一格没有候选可以挑。',
      next: '账户留空就记到默认账户；想选就先给一笔带账户的记录（例如 支付宝）。',
    }));
  }
  const content = [
    typeBadge({
      kind,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
      next: nextStepOf({ page: 'collect', missing: blocked.length, wakeWord }),
    }),
    collectFrameHead({ wakeWord }),
    collectProgress({ wakeWord, missing: blocked.length }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    collectSectionTitle({ no: 1, title: '先看这一笔缺什么' }),
    summaryRow(facts),
    renderCaliberLine('写库：还没发生——这一页先不写库，只采集。补齐之后跟助手说一遍才会写。'),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    prefillNote(prefill),
    blockedBar({ items: blocked, command: commandLineOf(key, params, blocked) }),
    empties.join(''),
    collectSectionTitle({ no: 2, title: '把缺的格逐格补齐' }),
    renderParamForm({
      description: '填好必需项再说一遍。这一页先不写库。分类／账户／账本三格是选择器，候选取自近期记录。',
      fields: formFields({ slots, params, marks: prefill, pick }),
    }),
    promptCopyArea(promptOf(wakeWord, commandLine(key, params), blocked), null),
    collectSectionTitle({ no: 3, title: '补齐了再请助手记' }),
    collectButtonHint({ wakeWord }),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          // 日志第 4 段是**本次真跑的那条**（不是补齐后那条带占位符的）：过程证据要照实记，
          // 带占位符的写库指令只在上面阻断条里给看不给复制。
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
    docTitle: DOC_TITLE + '·补齐槽位',
    title: wakeWord + ' · 补齐槽位',
    subtitle: message,
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key,
    content,
  });
}
