/** 写入域页面装配用的**域内共用小件**：值加工与取值口径（表单格子、摘要事实、重复检测探针、信封、回执读数行的后两格）。
 *
 * 为什么单独一件：模板件（`template-*.ts`）管的是**块位序列**，这些管的是**值**——两者变化频率不同，
 *  且 5 张模板都要用同一套取值口径（抄五份就会改一处漏四处）。本件**零块位**：不 import 任何渲染函数，
 *  也不出页，只把普通数据加工成普通数据。
 *
 * 谁在用（本票实数，指名）：`src/write/template-{expense,flow,batch,installment,update}.ts`
 *  五张模板各取自己用得到的那几个名字。
 */
import type { ParamFieldInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { pageShell } from '../shared/pageShell.js';
import type { PageShellInput } from '../shared/pageShell.js';
import { DOC_SKILL, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { prefillHint } from './prefillNote.js';
import type { PrefillMark } from './prefillNote.js';
import { optionsFor } from './recentPicks.js';
import type { SummaryFacts } from './summaryRow.js';
import { fieldLabelOf } from './userWording.js';
import type { CollectInput, ReceiptInput } from './scene.js';
import { isGiven } from './slots.js';
import type { RecordSlot } from './slots.js';

/** 提示条那一块要的图标档（`renderFeedbackBlock` 的闭集）。 */
export type NoticeIcon = 'danger' | 'ok' | 'warn' | 'copy' | 'info';

/** 缺项标签那一行要的：一处缺项的中文名 + 为什么缺（`blockedSlots.ts` 的产出形状）。 */
export interface BlockedLine {
  readonly name: string;
  readonly label: string;
  readonly why: string;
}

/** 字段卡的一格（普通数据：名字／中文名／怎么给／是否必需）。 */
export interface FieldSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 回执页读数行的一格。 */
export interface TailCard {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}

/** 回执页读数行后两格的三种说法（哪一族用哪一种，写在各域的差异声明里）。 */
export type CardsStyle = 'scene' | 'generic-expense' | 'generic-reimburse';

/** 页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状）。 */
export function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key),
    data: { ok, message },
  };
}

/** 字段卡的格子：一律由 `renderParamForm` 出（标签与控件配对、每格带 `name`）。 */
export function formFields(input: {
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

/** 采集页要处理体给的槽位（默认那一份；拍账单那类场景自己给格子）。 */
export function defaultSlots(input: CollectInput): readonly FieldSlot[] {
  return input.slots.map((s: RecordSlot) => ({ name: s.name, label: s.label, hint: s.hint, required: s.required }));
}

/** 预填来源串收短（本域五页共用这一处）：只把括号里的附注去掉，两类来源的区分一字不动。 */
export function shorter(marks: readonly PrefillMark[]): readonly PrefillMark[] {
  return marks.map((m) => ({ ...m, from: m.from.replace(/（[^）]*）/g, '') }));
}

/** 摘要五格里有没有一格是**用户真给了值**的（全空即不出读数行，照 #688 裁定 6）。
 *  「时间」那一格不算：`factsOf` 缺省取本页执行那天，永远非空——它进了这一判据就永远为真，等于没有条件。 */
export function hasAnyFact(facts: SummaryFacts): boolean {
  return [facts.amount, facts.category, facts.account, facts.ledger].some((v) => (
    v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== '未给'
  ));
}

/** 回执页读数行的后两格：按场景声明的哪一种说法出（三档见 `CardsStyle`）。 */
export function tailCardsOf(style: CardsStyle, input: ReceiptInput): readonly TailCard[] {
  if (style === 'scene') {
    return [
      { label: '这次记了几笔', value: input.receipt.affectedRows + ' 笔' },
      {
        label: '写进去的项',
        value: input.receipt.writtenFields.length + ' 项',
        detail: '共 ' + input.receipt.writtenFields.length + ' 项，详见下表。',
      },
    ];
  }
  const firstLabel = style === 'generic-expense' ? '这次记了几笔' : '记了几笔';
  return [
    { label: firstLabel, value: input.receipt.affectedRows + ' 笔', detail: '按库里的改动算' },
    {
      label: '写进去的项',
      value: input.receipt.writtenFields.length + ' 项',
      detail: input.receipt.writtenFields.map((f) => fieldLabelOf(f)).join('、') || '没改到任何一项',
    },
  ];
}

/** 回执页的重复检测探针：写完再报一次，排除本次这条编号。 */
export function probeOfReceipt(input: ReceiptInput): {
  readonly amount: number | null;
  readonly category: string;
  readonly date: string;
  readonly account: string;
  readonly excludeId?: number;
} {
  return {
    amount: input.facts.amount,
    category: input.facts.category,
    date: input.facts.time,
    account: input.facts.account,
    ...(input.receipt.recordId === null ? {} : { excludeId: input.receipt.recordId }),
  };
}

/** 写入域各页的眉标：**只在本域写一次**（共用位 `shared/pageShell.ts` 不持「域名→取值」表，照守卫③b）。 */
export const EYEBROW = '记账 · 写入域';

/** 本域各页统一走它：补上眉标再转共用位的 `pageShell`；调用点写法 `pageShell({…})` 不变。 */
export function writePageShell(input: Omit<PageShellInput, 'eyebrow'>): string {
  return pageShell({ ...input, eyebrow: EYEBROW });
}
