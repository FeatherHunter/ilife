/** 基础收支族的通用采集页装配体（**记支出那一张**）：有阻断项时出这一页（**只采集、不写库**）。
 *
 * 谁在用（本票实数）：`src/record/scene-expense.ts` 这一件——`Scene.collect` 就是本件。
 *  其余族的场景件各自有装配体（收入／拍账单／批量录入在各自件里，借贷与修正族在它们自己那几件里），
 *  故本件只服务记支出这一条唤醒词。
 *  本件另对外给一件：`collectBlockedFold`——本族五张采集页共用的缺项阻断摆法（口令原文块折叠）。
 *
 * 信息层次（照派单的架构级整改重排；形状取 `../shared/collectFrame.ts` 里面向用户的那三种——
 *   进度／缺项标签／分段标题，本件不另造形状；该件另两种（架头／按钮层级）的固定文案是页面自指话，
 *   上屏就是把开发话给用户看，本席未上屏，作残项报给该件所属窗口）：
 *   类型徽章（唤醒词＋口径＋状态徽章，不再缀祈使句）→ 进度 → 缺项标签 →
 *   第 1 段（现状一行＋重复检测条＋预填标注＋缺项阻断折叠区＋空态）→
 *   第 2 段（字段卡＋复制给助手）→ 第 3 段（按钮层级一行）→ 复制区。
 *
 * 本轮改动（只动本件的可见正文与块序，不动行为判定与信封字段）：
 *   ① **首屏同形「未给」卡清零**：删结论摘要行那一网格——采集页的金额／分类／账户／账本／时间五格
 *      在本页都还没有值，五张同形「未给」卡只是把「还缺什么」说五遍；事实由缺项标签＋缺项表＋字段卡承担。
 *      摘要行的取值口径（`summaryRow.ts`）一字未动，回执页照旧引它。
 *   ② **写库四遍并一句**：原先「写库：还没发生——…」「这一页先不写库；补齐之后…」「填好必需项再说一遍…」
 *      「这一笔还差 N 项…」四处复读，现只留一行陈述（徽章「还没写库」＋本行）与复制 prompt 区那一段。
 *   ③ **祈使改陈述**：页内不再出现「照上面那句跟助手说一遍」这类祈使（复制区按钮与它的提示照旧）。
 *   ④ 页标题只留唤醒词（页型由架头那两枚徽章说）；副标题改成缺项计数（信封里的 `message` 一字未动）。
 *
 * 本页**不写库**：写库那一半在 `src/record/write.ts`，落点是结果型回执整页（`./receiptBody.ts`）。
 */
import { renderCaliberLine, renderDisclosure, renderParamForm } from 'base-paint/blocks';
import type { ParamFieldInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { BillRow } from '../fetch/db.js';
import { ALL_L1, EXPENSE_L1 } from '../policy/category.js';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import type { BlockedItem } from '../shared/blockedSlots.js';
import { collectMissingTags, collectProgress, collectSectionTitle } from '../shared/collectFrame.js';
import { copyArea, copyLog, promptCopyArea } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { emptyNote } from '../shared/emptyNote.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { prefillHint, prefillOf } from '../shared/prefillNote.js';
import type { PrefillMark } from '../shared/prefillNote.js';
import { optionsFor, pickOf as pickValues, textOf } from '../shared/recentPicks.js';
import { typeBadge, wakeWordOf } from '../shared/typeBadge.js';
import { commandLine } from '../shared/writeParts.js';
import type { CollectInput } from './scene.js';
import { isGiven } from './slots.js';
import type { RecordSlot } from './slots.js';

/** 三枚选择器的候选（**转发到共用位 `src/shared/recentPicks.ts`，本件不另写一份取数**）：
 *  通用采集页的 `kind` 只有「支出」与「其余」两档，支出落支出侧名单、其余两侧都给。 */
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
  const shortMarks = prefillShort(input.marks);
  return input.slots.map((s) => {
    const mark = input.marks.find((m) => m.name === s.name);
    const value = isGiven(input.params[s.name]) ? String(input.params[s.name]) : (mark?.value ?? '');
    const options = optionsFor(input.pick, s.name, value);
    return {
      name: s.name,
      label: s.label,
      hint: prefillHint(shortMarks, s.name) ?? s.hint,
      ...(options === undefined ? {} : { options }),
      ...(s.required ? { required: true } : {}),
      ...(value === '' ? {} : { value }),
    };
  });
}

/** 复制 prompt 区那段 prompt：说清缺什么、这一页先不写库、补齐后跟助手说哪条词。
 *  **不给可跑的写库指令**（那条只在缺项阻断条里、且不给复制按钮）——缺项即不出复制指令；
 *  本轮整改：缺项清单只列中文名，括号里的「没给」复读删掉，祈使句改陈述，命令原文不回抄一遍
 *  （口令只有阻断条那一处，复制区这一段是给人看的话）。 */
function promptOf(
  wakeWord: string,
  blocked: readonly { readonly label: string; readonly name: string; readonly why: string }[],
): string {
  return '这一笔还差 ' + blocked.length + ' 项：' + blocked.map((i) => i.label).join('、')
    + '。这一页先不写库。补齐后跟助手说一遍「' + wakeWord + '」。';
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

/** 副标题：只报缺几项，明细在下表（信封里的 `message` 一字未动，照旧是那句完整口径）。 */
function subtitleOf(missing: number, blocked: number): string {
  if (missing === 0) return '这一笔还差 ' + blocked + ' 项，详见下表。';
  return '缺 ' + blocked + ' 项，详见下表。';
}

/** 预填标注的「来源」串收短（**本族五页共用这一处**）：只把括号里的附注去掉，两类来源的区分一字不动
 *  （`来自记录编号 N（最近一笔）`→`来自记录编号 N`、`缺省值（库里还没有可用的账户，留空＝落库默认）`→`缺省值`）。
 *  为什么要收：这一句会作为字段卡的提示上屏，390 宽下原来那串长文被输入框裁掉后半截（E 席基线
 *  n1 记的「账户 placeholder 后半框内半藏」），收短之后整句进得了框；口径条文仍在
 *  `../shared/prefillNote.ts` 那一处，本件只做展示用的收笔，不另立第二份来源说法。 */
export function prefillShort(marks: readonly PrefillMark[]): readonly PrefillMark[] {
  return marks.map((m) => ({ ...m, from: m.from.replace(/（[^）]*）/g, '') }));
}

/** 采集页的缺项阻断块（**折叠形**，本族五页共用这一处摆法）：共用的阻断条——「还缺什么」错误回执、
 *  缺项明示表、写库口令原文、置灰的写库按钮——整条收进折叠区，首屏只留缺项标签与进度两处形状承担提示。
 *  派单的架构级整改要的就是这一条（口令原文块整条可见 → 折叠）。
 *
 *  **判定与文案仍是 `../shared/blockedSlots.ts` 那一份**：本件只把共用件的产出换个位置摆，不另写第二份缺项口径，
 *  也不改阻断行为（写库那一半照旧由 `src/record/write.ts` 拦）。折叠区里那枚置灰按钮不带 `data-t`，
 *  折叠与否都点不动（`packages/base-render/src/controls.ts` 的点击委派读到空 `data-t` 即早退）。
 *
 *  谁在用（本族五件，指名）：`scene-expense`（经本件 `collectBody`）、`scene-income`、`scene-photo`、
 *  `scene-batch`、`scene-plain`——五张采集页同一摆法，改一处五页同时改。 */
export function collectBlockedFold(input: {
  readonly items: readonly BlockedItem[];
  /** 写库口令原文（补齐后照抄重跑那条）；带尖括号占位符。 */
  readonly command: string;
  /** 补齐之后会发生什么（不给＝走共用件那句缺省口径）。 */
  readonly note?: string;
}): string {
  if (input.items.length === 0) return '';
  return renderDisclosure({
    title: '还缺什么，以及补齐后照抄的那条',
    contentHtml: blockedBar({
      items: input.items,
      command: input.command,
      ...(input.note === undefined ? {} : { note: input.note }),
    }),
  });
}

/** 通用采集页整页：三段按序拼（见文件头信息层次）。 */
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
  const pick = pickOf(input.recent, kind);
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
      kind,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
      // 下一步那句话由本页的进度与按钮层级两处说出来，这里不再缀一行祈使（下一句见 collectProgress）。
      next: '',
    }),
    collectProgress({ wakeWord, missing: blocked.length }),
    collectMissingTags({ labels: blocked.map((i) => i.label) }),
    collectSectionTitle({ no: 1, title: '先看这一笔缺什么' }),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    prefill.length === 0 ? '' : renderCaliberLine('预填标注：下面几格已经替你填上，来源写在格子里。'),
    collectBlockedFold({
      items: blocked,
      command: commandLineOf(key, params, blocked),
      // 状态那一句与补齐后的去向都收在这一行里（阻断条自带的口径行位）：首屏不再多一行灰字压标题，
      // 「写库：还没发生」仍在本页（页断言逐字钉着它），只是随阻断条一起收进折叠区。
      note: '写库：还没发生，本页只采集。补齐后照上面那条口令跟助手说一遍。',
    }),
    empties.join(''),
    collectSectionTitle({ no: 2, title: '把缺的格逐格补齐' }),
    renderParamForm({
      description: '补齐必需项即可继续。',
      fields: formFields({ slots, params, marks: prefill, pick }),
    }),
    promptCopyArea(promptOf(wakeWord, blocked), '这一段就是补齐后要发给助手的话'),
    collectSectionTitle({ no: 3, title: '补齐了再请助手记' }),
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
    docTitle: DOC_TITLE + '·采集页',
    title: wakeWord,
    subtitle: subtitleOf(missing.length, blocked.length),
    slot: 'collect',
    page: 'collect',
    shape: envelope.shape,
    key,
    content,
  });
}
