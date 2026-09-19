/** 记账族四个场景件共用的采集页表单积木（**唯一定义地**）：表单取值判定、字段卡、复制 prompt 区那段话
 *  与缺项时那条写库指令原文。四个场景件（记收入／记报销／记一笔／拍账单）的采集页要**同一套积木**，
 *  抄四份就会改一处漏三处，故收在一处。

 * 本件对外的名字**三个**（照 `docs/agents/structure.md` 的「一个文件对外给的东西不多于五个」，
 *  只数真被本目录之外的件引用的名字）：
 *  `valuesOf`（采集页那几格取值：候选／重复检测探针／摘要行事实）、`fieldCardOf`（字段卡）、
 *  `blockedPromptOf`（缺项那条 ＋ 复制 prompt 区那段话，一次给全）。
 *  其余收在件内、不外给：`pickOf`（三枚选择器的候选，一行转发到共用位 `recentPicks.ts`）、
 *  `categorySideOf`（分类侧别的唯一落点）、`probeOf`、`factsOf`、`FieldSlot`（字段卡要的一格；只有本件
 *  `fieldCardOf` 的签名与件内的 `formFieldsOf` 认它，外面照形状给普通对象即可）、`isGiven`、`formFieldsOf`。
 *  **本次由 12 名收到 3 名**，两刀：① 外部识别那五样（拍账单的图片识别外置通道）搬去
 *  `src/write/outsideScan.ts`；② 表单那六个名字并成三个粗入口（`pickOf`＋`probeOf`＋`factsOf` 合成
 *  `valuesOf`；`commandsOf` 与 `promptOf` 合成 `blockedPromptOf`）。

 * 谁在用（四个调用点，指名；每个调用点后头写明它取哪几个名字）：
 *   ① `src/write/scene-income.ts`——记收入：`valuesOf`（候选落收入侧）／`fieldCardOf`／`blockedPromptOf`；
 *   ② `src/write/scene-reimburse.ts`——记报销：同一套三个名字，只是 `kind` 换成 `reimburse`；
 *   ③ `src/write/scene-plain.ts`——记一笔：同一套三个名字，`kind` 给空串（分类候选两侧都给，方向按金额符号判）；
 *   ④ `src/write/scene-photo.ts`——拍账单：同一套三个名字，`kind` 给 `photo`；
 *     外部识别通道的五个名字走 `src/write/outsideScan.ts`。

 * **本件只吃普通数据、零跨目录引用**（与已冻的 `candidatePick.ts`／`rowEditorTable.ts`／`diffTable.ts` 同形状）：
 *  入参是「要展示的字段名与文案」「本次参数」「近期记录那几列」这类普通数据，**不引** `src/write/` 下的件，
 *  也不认 `CollectInput`／`ReceiptInput`——那两张页的入参形状由 `src/write/scene.ts` 定义，由各场景件自己解成普通数据传进来。
 *  本件可引的只有：`base-paint`／`base-paint/blocks`（现成组件）、`src/shared/category.ts`（分类与缺省口径）、
 *  `src/fetch/db.ts`（记录行的数据形状）、`src/shared/` 同目录的共用件。
 *
 * 口径（一处定义，别处不许再写第二份）：
 *   - **一个值算不算「给了」**：`undefined`／`null`／空白串都不算，0 算给了（金额 0 是合法值）；
 *   - **候选取值**：按最近在先去重、取前十二个、分类一条历史都没有时退到本型的 L1 名单——
 *     这一半的唯一定义地是 `src/write/recentPicks.ts`，本件的 `pickOf` 只留一行转发；
 *   - **缺项即不出复制指令**：阻断判定在 `src/write/blockedSlots.ts`，写库指令原文在本件的
 *     `blockedPromptOf`；复制 prompt 区那段话里**没有可跑的写库指令**。
 *
 * 本件不自造任何页面骨架与样式：字段卡走 `base-paint/blocks` 的 `renderParamForm`，其余块由各场景件
 *  从代表页那套共用件里取。
 */
import { renderParamForm } from 'base-paint/blocks';
import type { ParamFieldInput } from 'base-paint/blocks';
import type { BillRow } from '../fetch/db.js';
import { ALL_L1, EXPENSE_L1, INCOME_L1 } from '../shared/category.js';
import type { DuplicateProbe } from './duplicateNote.js';
import { prefillHint } from './prefillNote.js';
import type { PrefillMark } from './prefillNote.js';
import { optionsFor, pickOf as pickValues, textOf } from './recentPicks.js';
import type { SummaryFacts } from './summaryRow.js';
import { commandLine } from '../shared/writeParts.js';

/** 分类一侧的 L1 名单：收入词落收入侧、支出型词落支出侧、通用词两侧都给。**这一处是分类侧别的唯一落点**。 */
function categorySideOf(kind: string): readonly string[] {
  if (kind === 'income') return INCOME_L1;
  if (kind === 'expense' || kind === 'reimburse' || kind === 'photo' || kind === 'refund') return EXPENSE_L1;
  return ALL_L1;
}

/** 三枚选择器的候选（**转发到 `recentPicks.ts`，本件不另写一份取数**）：分类退到哪一侧由 `categorySideOf` 定。 */
function pickOf(recent: readonly BillRow[], kind: string): Record<string, readonly string[]> {
  return pickValues(recent, categorySideOf(kind));
}

/** 一个值算不算「给了」：`undefined`／`null`／空白串都不算，0 算给了（金额 0 是合法值）。
 *  与 `src/write/slots.ts` 的 `isGiven` 同一口径；本件只吃普通数据，故照这条口径在本件内重写一遍，
 *  不从能力目录里引件（`src/shared/` 与 `src/write/` 之间不互相引）。 */
function isGiven(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 重复检测的探针（四件同一口径：日期缺省取本页执行那天）。**收在件内**，对外由 `valuesOf` 一次给。 */
function probeOf(params: Record<string, unknown>, today: string): DuplicateProbe {
  const raw = textOf(params['amount']);
  const n = raw === '' ? Number.NaN : Number(raw);
  const time = textOf(params['time']);
  return {
    amount: Number.isFinite(n) ? n : null,
    category: textOf(params['category']),
    date: time === '' ? today : time,
    account: textOf(params['account']),
  };
}

/** 摘要行的事实（四件同一口径：事实取自本次参数，缺的格写「未给」）。**收在件内**，对外由 `valuesOf` 一次给。 */
function factsOf(params: Record<string, unknown>, date: string): SummaryFacts {
  const raw = textOf(params['amount']);
  const n = raw === '' ? Number.NaN : Number(raw);
  const time = textOf(params['time']);
  return {
    amount: Number.isFinite(n) ? n : null,
    category: textOf(params['category']),
    account: textOf(params['account']),
    ledger: textOf(params['ledger']),
    time: time === '' ? date : time,
  };
}

/** 采集页那几格取值，一次给全（`pickOf`／`probeOf`／`factsOf` 三个名字合成这一个粗入口）：
 *  ① `pick` 三枚选择器的候选（分类退到哪一侧由 `kind` 定）；② `probe` 重复检测的探针；
 *  ③ `facts` 摘要行的事实。三个都只读本次参数与近期记录，不碰库。 */
export function valuesOf(input: {
  readonly recent: readonly BillRow[];
  readonly params: Record<string, unknown>;
  readonly kind: string;
  readonly today: string;
}): {
  readonly pick: Record<string, readonly string[]>;
  readonly probe: DuplicateProbe;
  readonly facts: SummaryFacts;
} {
  return {
    pick: pickOf(input.recent, input.kind),
    probe: probeOf(input.params, input.today),
    facts: factsOf(input.params, input.today),
  };
}

/** 字段卡要的一格（普通数据：名字／中文名／怎么给／是否必需）。**收在件内**：外面照这个形状给普通对象。 */
interface FieldSlot {
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

/** 采集页字段卡那块（`renderParamForm` ＋ 本场景那句操作说明）。候选那一格由 `valuesOf` 出的 `pick` 给。 */
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

/** 缺项那两处的原文，一次给全（两个名字合成一个粗入口）：
 *  ① `command` 是缺项时那条写库指令原文——缺的值留成尖括号占位符，**只给看不给复制**（复制按钮在阻断条里被拿掉）；
 *  ② `prompt` 是「照这句跟助手说一遍」那块话：说清缺什么、这一页先不写库、补齐之后说哪句——
 *     **不给可跑的写库指令**。本轮整改：缺项清单里不再印参数名（库列名不上屏），
 *     `重跑同一条命令` 换「跟助手说一遍」。
 *  `replaces` 给「按中文名占位」以外的写法（拍账单的要素名）。 */
export function blockedPromptOf(input: {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly blocked: readonly { readonly name: string; readonly label: string; readonly why: string }[];
  readonly replaces?: Readonly<Record<string, string>>;
}): { readonly command: string; readonly prompt: string } {
  const filled: Record<string, unknown> = { ...input.params };
  for (const b of input.blocked) filled[b.name] = input.replaces?.[b.name] ?? '<' + b.label + '>';
  return {
    command: commandLine(input.key, filled),
    prompt: '这一笔还差 ' + input.blocked.length + ' 项：'
      + input.blocked.map((i) => i.label + '（' + i.why + '）').join('、')
      + '。\n这一页先不写库；补齐之后跟助手说一遍，照这条说：' + input.key + '。',
  };
}
