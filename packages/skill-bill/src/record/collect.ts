/** 过程型采集页装配：有阻断项时出这一页（**只采集、不写库**）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/write.ts` 的 `writeRecordAdd`——`bill.record.add` 有阻断项（缺必需槽位／金额方向不符）时出本页；
 *   ② `src/record/write.ts` 的 `writeRecordUpdate`——`bill.record.update` 有阻断项（缺 `id`）时出本页。
 *  （两条命令各自的入口都住 write.ts，页面装配只此一处。）
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *
 * 槽位表与探针同住本件（**唯一定义地**）：「一条命令要哪些槽位、哪个必需」与「表单怎么摆」是同一件事的两面。
 *  `missingSlots` 只做「在不在」的探针；方向不符那一半住 `../shared/blockedSlots.ts` 的 `blockedItems`；
 *  真值校验仍走 `src/policy` 的 `validateAddInput`／`validateUpdateInput`（阻断项清空后才走到那一步）。
 *
 * 信息层次（第一节的页面积木按序拼，一件不自造）：
 *   类型徽章 → 结论摘要行 → 重复检测提示条 → 预填标注 → 缺项阻断条 → 选择器空态 → 采集表单 → 复制 prompt 区 → 复制区。
 *  复制 prompt 区那段话里**没有可跑的写库指令**（写库指令只在缺项阻断条里、且不给复制按钮）——
 *  这就是「缺项即不出复制指令」那条口径；本页**不写库**：写库那一半在 `src/record/write.ts`，
 *  落点是结果型回执整页（`src/record/receipt.ts`）。
 */
import { renderCaliberLine, renderParamForm } from 'base-paint/blocks';
import type { ParamFieldInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import type { BillRow } from '../fetch/db.js';
import { ALL_L1, DEFAULTS, EXPENSE_L1 } from '../policy/category.js';
import { blockedBar, blockedItems, blockedMessage } from '../shared/blockedSlots.js';
import { copyArea, copyLog, promptCopyArea } from '../shared/copyArea.js';
import { duplicateNote, findDuplicates } from '../shared/duplicateNote.js';
import type { DuplicateProbe } from '../shared/duplicateNote.js';
import { emptyNote } from '../shared/emptyNote.js';
import { pageFrame, typeBadge } from '../shared/pageFrame.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { prefillHint, prefillNote, prefillOf } from '../shared/prefillNote.js';
import type { PrefillMark } from '../shared/prefillNote.js';
import { summaryRow } from '../shared/summaryRow.js';
import type { SummaryFacts } from '../shared/summaryRow.js';
import { commandLine } from '../shared/writeParts.js';

/** 一个槽位：参数名／中文名／怎么给／是否必需。 */
export interface RecordSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 两条写命令的槽位表。必需性照 `src/policy/category.ts` 的 `validateRecord`：
 *  分类与金额没有缺省值（必需），时间／账户／账本／币种／备注都有缺省值（可缺）。
 *  七槽里的「名目」没有库列：它落在三级分类的 L3（如 `餐饮/外卖/午餐` 的第三级）或备注里，提示里写明。 */
export const RECORD_SLOTS: Record<string, readonly RecordSlot[]> = {
  'bill.record.add': [
    { name: 'category', label: '分类', hint: '三级分类：L1/L2/L3，如 餐饮/外卖/午餐（L3 即名目）', required: true },
    { name: 'amount', label: '金额', hint: '支出为负、收入为正，如 -12.5', required: true },
    { name: 'time', label: '时间', hint: '缺省＝今天 12:00:00', required: false },
    { name: 'account', label: '账户', hint: '缺省＝默认账户', required: false },
    { name: 'ledger', label: '账本', hint: '缺省＝默认账本', required: false },
    { name: 'currency', label: '币种', hint: '缺省＝默认币种', required: false },
    { name: 'note', label: '备注', hint: '自由文本；名目写在这里，可带 #标签', required: false },
  ],
  'bill.record.update': [
    { name: 'id', label: '记录编号', hint: '要改的那条记录的 id（撤销／恢复同样要它）', required: true },
    { name: 'op', label: '操作', hint: '缺省＝改字段；undo＝撤销（软删）／restore＝恢复', required: false },
    { name: 'category', label: '分类', hint: '不改就别给', required: false },
    { name: 'amount', label: '金额', hint: '不改就别给', required: false },
    { name: 'time', label: '时间', hint: '不改就别给', required: false },
    { name: 'account', label: '账户', hint: '不改就别给', required: false },
    { name: 'ledger', label: '账本', hint: '不改就别给', required: false },
    { name: 'currency', label: '币种', hint: '不改就别给', required: false },
    { name: 'note', label: '备注', hint: '不改就别给', required: false },
  ],
};

/** 候选选择器的取数上限（三枚选择器：分类／账户／账本）。 */
const PICK_LIMIT = 12;

/** 一个值算不算「给了」：`undefined`／`null`／空白串都不算。0 算给了（金额 0 是合法值）。 */
function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 必需槽位里哪些没给（**只探针，不做真值校验**）。 */
export function missingSlots(params: Record<string, unknown>, slots: readonly RecordSlot[]): RecordSlot[] {
  return slots.filter((s) => s.required && !isGiven(params[s.name]));
}

/** 一个值的字符串形态（非字符串按空串用；数字写成十进制串）。 */
function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' ? String(v) : '';
}

/** 近期记录里某个字段的取值（按最近在先去重，取前 `PICK_LIMIT` 个）——三枚选择器的候选。 */
function distinct(recent: readonly BillRow[], field: 'category' | 'account' | 'ledger'): string[] {
  const out: string[] = [];
  for (const r of recent) {
    const v = textOf(r[field]);
    if (v !== '' && !out.includes(v)) out.push(v);
    if (out.length >= PICK_LIMIT) break;
  }
  return out;
}

/** 三枚选择器的候选：分类（近期有历史就用历史，一条历史都没有就退到 L1 名单）／账户／账本（缺省「生活」）。 */
function pickOf(recent: readonly BillRow[], kind: string): Record<string, readonly string[]> {
  const category = distinct(recent, 'category');
  const account = distinct(recent, 'account');
  const ledger = distinct(recent, 'ledger');
  return {
    category: category.length > 0 ? category : (kind === 'expense' ? EXPENSE_L1 : ALL_L1),
    account,
    ledger: ledger.length > 0 ? ledger : [DEFAULTS.ledger],
  };
}

/** 一个字段的选项：选择器候选 ＋ 本次已给的值（已给的值不在候选里时并到队首，免得表单把它显示没了）。 */
function optionsFor(
  pick: Record<string, readonly string[]>,
  name: string,
  value: string,
): readonly string[] | undefined {
  const list = pick[name];
  if (list === undefined || list.length === 0) return undefined;
  return value !== '' && !list.includes(value) ? [value, ...list] : [...list];
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

/** 复制 prompt 区那段 prompt：说清缺什么、这一页不写库、补齐后重跑哪条命令。
 *  **不给可跑的写库指令**（那条在缺项阻断条里、且不给复制按钮）——缺项即不出复制指令。 */
function promptOf(
  key: string,
  blocked: readonly { readonly label: string; readonly name: string; readonly why: string }[],
): string {
  return '这一笔还差 ' + blocked.length + ' 项：'
    + blocked.map((i) => i.label + '（' + i.name + '：' + i.why + '）').join('、')
    + '。\n这一页只采集、不写库；补齐后重跑同一条命令 ' + key + '。';
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

/** 采集页入参：时刻与来源由调用方给（共用位不取时钟、不取库文件名）；`recent`＝近期记录（预填／重复检测／候选三处共用）。 */
interface CollectInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly slots: readonly RecordSlot[];
  readonly missing: readonly RecordSlot[];
  readonly source: string;
  readonly actionAt: string;
  /** 本页执行那天（`YYYY-MM-DD`）：缺省时间的取值、重复检测的比对面都用它。 */
  readonly today: string;
  /** 近期记录（按时间倒序，最近在先）；取数由处理体给，页面不碰库。 */
  readonly recent: readonly BillRow[];
}

/** 过程型采集页整页：九块按序拼（见文件头信息层次）。 */
export function recordCollectDoc(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const kind = textOf(params.kind);
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
      next: '账户留空即落默认账户；想选就先给一笔带账户的记录（例如 支付宝）。',
    }));
  }
  const content = [
    typeBadge({
      kind,
      key,
      status: 'danger',
      state: blocked.length > 0 ? '待补槽位 · 未写库（已阻断）' : '待补槽位 · 未写库',
    }),
    summaryRow(facts),
    renderCaliberLine('写库：未发生——这一页只采集、不碰库；补齐后重跑同一条命令才会写。'),
    duplicateNote(findDuplicates(input.recent, probe), probe),
    prefillNote(prefill),
    blockedBar({ items: blocked, command: commandLineOf(key, params, blocked) }),
    empties.join(''),
    renderParamForm({
      description: '填好必需槽位后重跑同一条命令；这一步不写库。分类／账户／账本三格是选择器，候选取自近期记录。',
      fields: formFields({ slots, params, marks: prefill, pick }),
    }),
    promptCopyArea(promptOf(key, blocked), '复制 prompt（补齐后重跑）'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          // 日志第 4 段是**本次真跑的那条**（不是补齐后那条带占位符的）：过程证据要照实记，
          // 带占位符的写库指令只在上面阻断条里给看不给复制。
          command: commandLine(key, params),
          source: input.source,
          detail: '未写库（采集页）',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageFrame({
    docTitle: DOC_TITLE + '·补齐槽位',
    title: '补齐槽位',
    subtitle: message,
    slot: 'collect',
    shape: envelope.shape,
    key,
    content,
  });
}
