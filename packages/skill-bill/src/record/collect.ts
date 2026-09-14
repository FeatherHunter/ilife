/** 过程型采集页装配：必需槽位缺失时出这一页（**只采集、不写库**）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/write.ts` 的 `writeRecordAdd`——`bill.record.add` 缺必需槽位时出本页；
 *   ② `src/record/write.ts` 的 `writeRecordUpdate`——`bill.record.update` 缺 `id` 时出本页。
 *   （两条命令各自的入口都住 write.ts，页面装配只此一处。）
 *
 * 槽位表与探针同住本件（**唯一定义地**）：「一条命令要哪些槽位、哪个必需」与「表单怎么摆」是同一件事的两面。
 *   `missingSlots` 只做「在不在」的探针；真值校验仍走 `src/policy` 的 `validateAddInput`／`validateUpdateInput`
 *   （槽位齐全后才走到那一步），取数写库仍走 `src/fetch`。
 *
 * 信息层次（照老侧 `expense_form.html` 与 `update_confirm.html` 两块清单）：
 *   状态徽标 → 三格状态卡 → 缺槽位明示表 → 采集表单 → 复制 prompt 区 → 复制区。
 *   本页**不写库**：写库那一半在 `src/record/write.ts`，落点是结果型回执整页（`src/record/receipt.ts`）。
 */
import { renderDataTable, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import { renderStatusBadge, type SerializableEnvelope } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog, promptCopyArea } from '../shared/copyArea.js';
import { statusCard } from '../shared/receiptParts.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';

/** 一个槽位：参数名／中文名／怎么给／是否必需。 */
export interface RecordSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 两条写命令的槽位表。必需性照 `src/policy/category.ts:98` 的 `validateRecord`：
 *  分类与金额没有缺省值（必需），时间／账户／账本／币种／备注都有缺省值（可缺）。 */
export const RECORD_SLOTS: Record<string, readonly RecordSlot[]> = {
  'bill.record.add': [
    { name: 'category', label: '分类', hint: '如 餐饮/外卖/午餐', required: true },
    { name: 'amount', label: '金额', hint: '支出为负、收入为正，如 -12.5', required: true },
    { name: 'time', label: '时间', hint: '缺省＝今天 12:00:00', required: false },
    { name: 'account', label: '账户', hint: '缺省＝默认账户', required: false },
    { name: 'ledger', label: '账本', hint: '缺省＝默认账本', required: false },
    { name: 'currency', label: '币种', hint: '缺省＝默认币种', required: false },
    { name: 'note', label: '备注', hint: '自由文本，可带 #标签', required: false },
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

/** 一个值算不算「给了」：`undefined`／`null`／空白串都不算。0 算给了（金额 0 是合法值）。 */
function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 必需槽位里哪些没给（**只探针，不做真值校验**）。 */
export function missingSlots(params: Record<string, unknown>, slots: readonly RecordSlot[]): RecordSlot[] {
  return slots.filter((s) => s.required && !isGiven(params[s.name]));
}

/** 复制 prompt 区里那段 prompt：先说缺什么，再给一条把缺处留成尖括号的可重跑命令。 */
function promptOf(key: string, params: Record<string, unknown>, missing: readonly RecordSlot[]): string {
  const filled: Record<string, unknown> = { ...params };
  for (const m of missing) filled[m.name] = '<' + m.label + '>';
  return '还差必需槽位：' + missing.map((m) => m.name + '（' + m.label + '）').join('、')
    + '。\n补齐后照抄重跑：\n' + commandLine(key, filled);
}

/** 必需槽位缺失那句文案（**唯一定义地**）：envelope 载荷与采集页副标题都引它。
 *  两处各写一遍就会改一处漏一处（同一件事两个说法），故只在本件写这一遍。 */
export function missingSlotMessage(missing: readonly RecordSlot[]): string {
  return '缺必需槽位：' + missing.map((m) => m.name).join('、') + '（已出采集页，补齐后重跑同一条命令）';
}

/** 采集页入参：时刻与来源由调用方给（共用位不取时钟、不取库文件名）。 */
interface CollectInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly slots: readonly RecordSlot[];
  readonly missing: readonly RecordSlot[];
  readonly source: string;
  readonly actionAt: string;
}

/** 过程型采集页整页：状态徽标 ＋ 状态卡 ＋ 缺槽位明示表 ＋ 采集表单 ＋ 复制 prompt 区 ＋ 复制区。 */
export function recordCollectDoc(input: CollectInput): string {
  const { key, params, slots, missing } = input;
  const message = missingSlotMessage(missing);
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key, data: { ok: false, message },
  };
  const given = slots.filter((s) => isGiven(params[s.name]));
  const command = commandLine(key, params);
  const content = [
    renderStatusBadge({ status: 'warn', text: '待补槽位 · 未写库' }),
    renderKpiGrid([
      statusCard('待补槽位', '还差 ' + missing.length + ' 个必需槽位'),
      { label: '已给槽位', value: given.length + ' 项', detail: given.map((s) => s.name).join('、') || '一个都没给' },
      { label: '写库', value: '未发生', detail: '采集页只采集；回执页才写库' },
    ]),
    renderDataTable({
      columns: [{ key: 'slot', label: '缺的槽位' }, { key: 'label', label: '是什么' }, { key: 'hint', label: '怎么给' }],
      rows: missing.map((m) => ({ slot: m.name, label: m.label, hint: m.hint })),
      caption: '缺一个就不写库',
    }),
    renderParamForm({
      description: '填好必需槽位后重跑同一条命令；这一步不写库。',
      fields: slots.map((s) => ({
        name: s.name,
        label: s.label,
        hint: s.hint,
        ...(s.required ? { required: true } : {}),
        ...(isGiven(params[s.name]) ? { value: String(params[s.name]) } : {}),
      })),
    }),
    promptCopyArea(promptOf(key, params, missing), '复制 prompt（补齐后重跑）'),
    copyArea({
      data: { envelope },
      log: {
        envelope,
        copyLog: copyLog({
          command, source: input.source, detail: '未写库（采集页）', actionAt: input.actionAt, version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE + '·补齐槽位',
    title: '补齐槽位',
    eyebrow: '记账 · 写入域',
    subtitle: message,
    content: writeSection({ slot: 'collect', shape: envelope.shape, key, content }),
  });
}
