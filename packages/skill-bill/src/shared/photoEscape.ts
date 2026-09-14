/** 记账族四个场景件共用的表单积木 ＋ 拍账单的「图片识别外置」通道（**唯一定义地**）。
 *
 * 两件事同住一件的理由：四个场景件（记收入／记报销／记一笔／拍账单）的采集页要**同一套积木**——表单取值判定、
 *  字段卡、三枚选择器的候选、复制 prompt 那段话、缺项时的写库指令原文。抄四份就会改一处漏三处，故收在一处。
 *  第二件事（外部识别通道）只服务拍账单一件，但它要用的字段表与提示手法就是本件第一件事的那一套，
 *  另立一件反而要多转一层类型；件名照派单点名的 `photoEscape.ts` 保留。
 *
 * **本件只吃普通数据、零跨目录引用**（与已冻的 `candidatePick.ts`／`rowEditorTable.ts`／`diffTable.ts` 同形状）：
 *  入参是「要展示的字段名与文案」「本次参数」「近期记录那几列」这类普通数据，**不引** `src/record/` 下的件，
 *  也不认 `CollectInput`／`ReceiptInput`——那两张页的入参形状由 `src/record/scene.ts` 定义，由各场景件自己解成普通数据传进来。
 *  本件可引的只有：`base-paint`／`base-paint/blocks`（现成组件）、`src/policy/category.ts`（口径层）、
 *  `src/fetch/db.ts`（记录行的数据形状）、`src/shared/` 同目录的共用件。
 *
 * 谁在用（四个调用点，指名；每个调用点后头写明它取哪几个名字）：
 *   ① `src/record/scene-income.ts`——记收入：`pickOf`（分类候选落收入侧）／`fieldCardOf`（字段卡）／
 *     `probeOf`＋`factsOf`（重复检测探针与摘要行事实）／`commandsOf`＋`promptOf`（补齐后重跑那一段）；
 *   ② `src/record/scene-reimburse.ts`——记报销：同一套六个名字，只是 `kind` 换成 `reimburse`；
 *   ③ `src/record/scene-plain.ts`——记一笔：同一套六个名字，`kind` 给空串（分类候选两侧都给，方向按金额符号判）；
 *   ④ `src/record/scene-photo.ts`——拍账单：三要素文字填空走 `ESCAPE_FIELDS` ＋ `fieldCardOf`，
 *     外部识别通道走 `PhotoScale`＋`imageNote`＋`escapeCard`＋`escapePrompt`。
 *
 * 本件对外给的名字**多于五个**（照 `docs/agents/structure.md` 的「一个文件对外给的东西不多于五个」已超）：
 *  跨目录真被引用的有 `FieldSlot`／`pickOf`／`fieldCardOf`／`commandsOf`／`promptOf`／`probeOf`／`factsOf`／
 *  `PhotoScale`／`imageNote`／`escapeCard`／`escapePrompt`／`ESCAPE_FIELDS` 十二个。超因：本件是「四个场景件共用的
 *  采集页积木 ＋ 只服务拍账单一件的外部识别通道」两件事同住，粗入口还没抽。拆法（下一手第一件事）：
 *  把表单六个名字并成两个粗入口（字段卡吃掉候选、prompt 与指令原文合成一段），外部识别那五样搬去
 *  `src/record/scene-photo.ts` 自用——详见 `docs/skills/skill-bill/t407-恢复-稳定化证据.md` 第六节。
 *
 * 口径（三件事一处定义，别处不许再写第二份）：
 *   - **拍账单的三个要素**：金额／分类／时间，名字出自施工图 `t407-页面块清单-16词.md` 第二节点名的
 *     「文字三要素填空（金额／分类／时间）」那一行，只在本件的 `ESCAPE_FIELDS` 一处定义（表单、明示表、提示话术三处都引它）；
 *   - **图片识别在本仓之外办**：本仓不装识别引擎，也不做上传控件（老侧同样没有，只有一行「已收到 N 张账单图片」）；
 *     页上那道通道只做一件事——把「已收到几张图／哪几个要素还缺／补齐后照抄哪条命令」讲清并给成可复制的一段；
 *   - **缺项即不出复制指令**：与代表页同口径，阻断判定与写库指令原文仍由 `src/shared/blockedSlots.ts` 管，本件只供给那段原文。
 *
 * 本件不自造任何页面骨架与样式：字段卡走 `base-paint/blocks` 的 `renderParamForm`，明示表走 `renderDataTable`，
 *  提示条走 `renderFeedbackBlock`（黄档／信息档），其余块由各场景件从代表页那套共用件里取。
 */
import { renderDataTable, renderFeedbackBlock, renderParamForm } from 'base-paint/blocks';
import type { ParamFieldInput, ToastInput } from 'base-paint/blocks';
import type { BillRow } from '../fetch/db.js';
import { ALL_L1, EXPENSE_L1, INCOME_L1, DEFAULTS } from '../policy/category.js';
import type { DuplicateProbe } from './duplicateNote.js';
import { prefillHint } from './prefillNote.js';
import type { PrefillMark } from './prefillNote.js';
import type { SummaryFacts } from './summaryRow.js';
import { commandLine } from './writeParts.js';

/** 候选选择器的取数上限（分类／账户／账本三枚选择器）。 */
const PICK_LIMIT = 12;

/** 一个值算不算「给了」：`undefined`／`null`／空白串都不算，0 算给了（金额 0 是合法值）。
 *  与 `src/record/slots.ts` 的 `isGiven` 同一口径；本件只吃普通数据，故照这条口径在本件内重写一遍，
 *  不从能力目录里引件（`src/shared/` 与 `src/record/` 之间不互相引）。 */
function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 一个值的字符串形态（非字符串按空串用；数字写成十进制串）。**收在件内**：调用方各自解自己的入参（同 `src/record/scene-update.ts` 的做法）。 */
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

/** 分类一侧的 L1 名单：收入词落收入侧、支出型词落支出侧、通用词两侧都给。**这一处是分类侧别的唯一落点**。 */
export function categorySideOf(kind: string): readonly string[] {
  if (kind === 'income') return INCOME_L1;
  if (kind === 'expense' || kind === 'reimburse' || kind === 'photo' || kind === 'refund') return EXPENSE_L1;
  return ALL_L1;
}

/** 三枚选择器的候选：分类（近期有历史就用历史，一条历史都没有就退到本型的 L1 名单）／账户／账本（缺省「生活」）。 */
export function pickOf(recent: readonly BillRow[], kind: string): Record<string, readonly string[]> {
  const category = distinct(recent, 'category');
  const account = distinct(recent, 'account');
  const ledger = distinct(recent, 'ledger');
  return {
    category: category.length > 0 ? category : categorySideOf(kind),
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

/** 字段卡要的一格（普通数据：名字／中文名／怎么给／是否必需）。 */
export interface FieldSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 字段卡的每一格：一律由 `renderParamForm` 出（标签与控件配对、每格带 `name`）。收在件内，对外只给 `fieldCardOf`。 */
function formFieldsOf(input: {
  readonly slots: readonly FieldSlot[];
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

/** 采集页字段卡那块（`renderParamForm` ＋ 本场景那句操作说明）。 */
export function fieldCardOf(input: {
  readonly description: string;
  readonly slots: readonly FieldSlot[];
  readonly params: Record<string, unknown>;
  readonly marks: readonly PrefillMark[];
  readonly pick: Record<string, readonly string[]>;
}): string {
  return renderParamForm({
    description: input.description,
    fields: formFieldsOf({ slots: input.slots, params: input.params, marks: input.marks, pick: input.pick }),
  });
}

/** 缺项时那条写库指令原文：缺的值留成尖括号占位符，**只给看不给复制**（复制按钮在阻断条里被拿掉）。
 *  `replaces` 给「按中文名占位」以外的写法（拍账单的要素名、记收入的方向提示）。 */
export function commandsOf(
  key: string,
  params: Record<string, unknown>,
  blocked: readonly { readonly name: string; readonly label: string }[],
  replaces?: Readonly<Record<string, string>>,
): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = replaces?.[b.name] ?? '<' + b.label + '>';
  return commandLine(key, filled);
}

/** 复制 prompt 区那段 prompt：说清缺什么、这一页不写库、补齐后重跑哪条命令。
 *  **不给可跑的写库指令**（那条在缺项阻断条里、且不给复制按钮）——缺项即不出复制指令。 */
export function promptOf(
  key: string,
  blocked: readonly { readonly label: string; readonly name: string; readonly why: string }[],
): string {
  return '这一笔还差 ' + blocked.length + ' 项：'
    + blocked.map((i) => i.label + '（' + i.name + '：' + i.why + '）').join('、')
    + '。\n这一页只采集、不写库；补齐后重跑同一条命令 ' + key + '。';
}

/** 重复检测的探针（四件同一口径：日期缺省取本页执行那天）。 */
export function probeOf(input: {
  readonly params: Record<string, unknown>;
  readonly today: string;
}): DuplicateProbe {
  const raw = textOf(input.params['amount']);
  const n = raw === '' ? Number.NaN : Number(raw);
  const time = textOf(input.params['time']);
  return {
    amount: Number.isFinite(n) ? n : null,
    category: textOf(input.params['category']),
    date: time === '' ? input.today : time,
    account: textOf(input.params['account']),
  };
}

/** 摘要行的事实（四件同一口径：事实取自本次参数，缺的格写「未给」）。 */
export function factsOf(input: {
  readonly params: Record<string, unknown>;
  readonly date: string;
}): SummaryFacts {
  const raw = textOf(input.params['amount']);
  const n = raw === '' ? Number.NaN : Number(raw);
  const time = textOf(input.params['time']);
  return {
    amount: Number.isFinite(n) ? n : null,
    category: textOf(input.params['category']),
    account: textOf(input.params['account']),
    ledger: textOf(input.params['ledger']),
    time: time === '' ? input.date : time,
  };
}

/** 拍账单的图片数入参：本仓只说明「收到了几张」，不做上传控件（老侧也没有图片入口）。 */
export interface PhotoScale {
  /** 已收到的图片张数（本次用户交上来的）。 */
  readonly count: number;
  /** 这些图现在在哪（如「AI 侧／外部识别工具」）：本仓不落图片，兜底的归档位由 AI 侧给。 */
  readonly where: string;
}

/** 拍账单三要素（**唯一定义地**）：金额／分类／时间；表单、明示表、提示话术三处都引这张表。 */
export const ESCAPE_FIELDS: readonly {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
}[] = [
  { name: 'amount', label: '金额', hint: '识别出来的金额照原样写：支出为负、收入为正，如 -12.5' },
  { name: 'category', label: '分类', hint: '三级分类：L1/L2/L3，如 餐饮/外卖/午餐（L3 即名目）' },
  { name: 'time', label: '时间', hint: '账单上的日期，如 2026-09-14 或 2026-09-14 12:00:00' },
];

/** 已收到的图片数说明（拍账单必备块）：**各占独立一块**，不与打标提示、来源提示共容器。 */
export function imageNote(scale: PhotoScale): string {
  const n = Number.isFinite(scale.count) && scale.count > 0 ? Math.floor(scale.count) : 0;
  const toast: ToastInput = {
    msg: '已收到 ' + n + ' 张账单图片',
    detail: n === 0
      ? '本次一张图都没交上来：那就走三要素文字填空这条路，照样能记。'
      : '图放在 ' + scale.where + '，本仓不存图也不读图；识别在外部办完，把三样要素填回来。',
    icon: 'info',
    badge: { text: '已收图片数', type: 'warn' },
    lines: [
      '收图这一步在哪：' + scale.where,
      '读图这一步在哪：本仓之外（本仓不装识别引擎，也不做上传控件）',
      ESCAPE_FIELDS.map((f) => f.label).join('／') + '三样要素：由外部识别结果或你手填，填回下面那张卡',
    ],
  };
  return renderFeedbackBlock({ title: '已收图片数与识别分工（各占独立一块）', toast });
}

/** 外部识别通道那张明示卡：三要素逐条 ＋ 每一步在谁那里办 ＋ 缺了会怎样。 */
export function escapeCard(input: {
  readonly params: Record<string, unknown>;
}): string {
  const rows = ESCAPE_FIELDS.map((f) => ({
    field: f.label,
    name: f.name,
    现在: textOf(input.params[f.name]) === '' ? '还没填' : textOf(input.params[f.name]),
    找谁: '外部识别结果（或用你眼睛看一眼账单）',
  }));
  const missing = ESCAPE_FIELDS.filter((f) => textOf(input.params[f.name]) === '');
  return renderDataTable({
    columns: [
      { key: 'field', label: '要素' },
      { key: 'name', label: '参数名' },
      { key: '现在', label: '现在' },
      { key: '找谁', label: '这一步谁办' },
    ],
    rows,
    caption: '图片识别外置：三要素现在到了哪一步'
      + (missing.length === 0
        ? '（三样齐了，可以直接写库）'
        : '（还缺 ' + missing.map((f) => f.label).join('、') + '，缺一样就不写库）'),
  }) + renderDataTable({
    columns: [
      { key: 'step', label: '这一步' },
      { key: 'who', label: '在哪办' },
      { key: 'detail', label: '办成什么样' },
    ],
    rows: [
      { step: '收图', who: '你交图的那一头', detail: '图上内容原样，本仓不裁剪不读取' },
      {
        step: '读图取三要素',
        who: '本仓之外（外部识别工具／你手填）',
        detail: ESCAPE_FIELDS.map((f) => f.label).join('／') + '三样文字',
      },
      { step: '落库', who: '本仓（bill.record.add）', detail: '三样齐了才写；缺一样只出这一页，不写库' },
    ],
    caption: '每一步在谁那里办（识别不落在本仓）',
  });
}

/** 外部识别通道那段可复制的话：说清「识别在本仓之外办完」，并给出补齐后照抄重跑的那条命令。 */
export function escapePrompt(input: {
  readonly params: Record<string, unknown>;
  readonly blocked: readonly { readonly name: string; readonly label: string; readonly why: string }[];
  readonly scale: PhotoScale;
}): string {
  const missing = ESCAPE_FIELDS.filter((f) => textOf(input.params[f.name]) === '');
  const head = '拍账单：本仓不装识别引擎、也不做上传控件，图片识别在外部办（本仓之外）。'
    + '已收到 ' + (input.scale.count > 0 ? input.scale.count : 0) + ' 张图；'
    + (missing.length === 0
      ? '三要素齐了，可以落库。'
      : '还缺 ' + missing.map((f) => f.label).join('、') + '，缺一样不许写库、也不替你猜。');
  const ask = '请在外部识别（或眼看）之后，把 ' + ESCAPE_FIELDS.map((f) => f.label).join('／')
    + '三样写成参数，然后照抄下面这条命令重跑：\n'
    + commandsOf('bill.record.add', input.params, input.blocked, {
      amount: '<外部识别出的金额：支出为负、收入为正>',
      category: '<外部识别出的分类：L1/L2/L3>',
      time: '<账单上的时间>',
    });
  return head + '\n' + ask;
}
