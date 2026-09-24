/** sub-list · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `page-head/model.ts` 同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的骨架会在页面上长成另一种东西，而调用方以为拿到了本件。
 *   2. **同一件事只有一个来源**：组内项数由子项条数算出、进度（几条已备）由 `done` 标算出——
 *      调用方给不了、也不该给（给了就会跟子项对不上）。
 *   3. **0 组不是错**：`groups: []` ⇒ 空串；要给空态就显式给 `emptyText`（空态是**设计过的**，
 *      不是"没数据时页面裂开一角"）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  SUB_LIST_COUNT_UNIT,
  SUB_LIST_DONE_LABEL,
  SUB_LIST_FORMS,
  type SubListItemInput,
  type SubListForm,
} from './attrs.js';

/** 归一后的一条子项（`done` 三态：真／假／**没给**）。 */
export interface SubListItemModel {
  readonly label: string;
  readonly measure?: string;
  readonly value?: string;
  readonly done?: boolean;
}

/** 归一后的一个分组（`count`／`doneTotal` 都是**算出来的**）。 */
export interface SubListGroupModel {
  readonly label: string;
  readonly items: readonly SubListItemModel[];
  /** 组内项数读数（如「6 项」）。 */
  readonly count: string;
  readonly sum?: string;
  readonly open: boolean;
  /** **这一组讲不讲进度**：有子项带 `done` 就讲（进度是"备货"这类场景的语义，不是每组的语义）。 */
  readonly progress: boolean;
  readonly doneTotal: number;
  /** 进度读数（如「6/6 已备」）；`progress` 为假时是空串。 */
  readonly progressText: string;
  /** 进度条的宽度（百分比，0..100）。 */
  readonly progressPercent: number;
}

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或空数组）。 */
export interface SubListModel {
  readonly form: SubListForm;
  readonly title?: string;
  readonly use?: string;
  readonly summary?: { readonly label: string; readonly value: string };
  readonly groups: readonly SubListGroupModel[];
  readonly emptyText?: string;
  readonly note?: string;
  readonly extraClass?: string;
}

/** 一条子项：名字必填；`done` 是**三态**——`true`／`false`／**没给**（没给＝这一组不讲进度）。 */
function reqItem(value: unknown, field: string): SubListItemModel {
  assertPlainObject(value, field);
  const raw = value as SubListItemInput;
  if (raw.done !== undefined && typeof raw.done !== 'boolean') badInput(field + '.done 必须是布尔');
  return {
    label: reqText(raw.label, field + '.label'),
    measure: optText(raw.measure, field + '.measure'),
    value: optText(raw.value, field + '.value'),
    /* **不许把「没给」压成 `false`**：那是两件事（`false` ＝ "这一项还没备好"；
       「没给」 ＝ "这一组不讲备货"）。压平了，按分类列的备忘录就会凭空长出一条 0% 的进度条
       （2026-09 判据抓住的第一版就是这个）。 */
    done: raw.done === undefined ? undefined : raw.done === true,
  };
}

/** 一个分组：组名必填、子项逐条校验；计数与进度在这里算出来。 */
function reqGroup(value: unknown, index: number): SubListGroupModel {
  const field = 'sub-list: input.groups[' + String(index) + ']';
  assertPlainObject(value, field);
  const raw = value as { label?: unknown; items?: unknown; sum?: unknown; open?: unknown };
  const label = reqText(raw.label, field + '.label');
  if (raw.items === undefined) badInput(field + '.items 必填（一组没有子项就别占一个折页）');
  if (!Array.isArray(raw.items)) badInput(field + '.items 必须是数组');
  if (raw.open !== undefined && typeof raw.open !== 'boolean') badInput(field + '.open 必须是布尔');
  const items: SubListItemModel[] = [];
  for (let i = 0; i < raw.items.length; i += 1) items.push(reqItem(raw.items[i], field + '.items[' + String(i) + ']'));

  const progress = items.some((it) => it.done !== undefined);
  const doneTotal = items.filter((it) => it.done === true).length;
  const total = items.length;
  return {
    label,
    items,
    count: String(total) + ' ' + SUB_LIST_COUNT_UNIT,
    sum: optText(raw.sum, field + '.sum'),
    open: raw.open === true,
    /* 进度只在**这一组真的带备货标**时出：不给 `done` 的组（如按分类列的备忘录）不该凭空长出一条进度条。 */
    progress: progress && total > 0,
    doneTotal,
    progressText: total > 0 ? String(doneTotal) + '/' + String(total) + ' ' + SUB_LIST_DONE_LABEL : '',
    progressPercent: total > 0 ? Math.round((doneTotal / total) * 100) : 0,
  };
}

/** 头部合计位：两枚都要（只有值的合计读不出"这是什么合计"）。 */
function optSummary(value: unknown): SubListModel['summary'] {
  if (value === undefined) return undefined;
  assertPlainObject(value, 'sub-list: input.summary');
  const raw = value as { label?: unknown; value?: unknown };
  return {
    label: reqText(raw.label, 'sub-list: input.summary.label'),
    value: reqText(raw.value, 'sub-list: input.summary.value'),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `SubListModel`，不再自己碰 `any`。 */
export function normalizeSubList(input: unknown): SubListModel {
  assertPlainObject(input, 'renderSubList: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? SUB_LIST_FORMS[0] : raw.form;
  if (!(SUB_LIST_FORMS as readonly unknown[]).includes(form)) {
    badInput('sub-list: input.form 必须是 ' + SUB_LIST_FORMS.join('／')
      + ' 之一（本件只落地形态 A「折叠组＋组级小计＋备货进度」）');
  }

  const groups = raw.groups;
  if (!Array.isArray(groups)) badInput('sub-list: input.groups 必须是数组');
  const groupModels: SubListGroupModel[] = [];
  for (let i = 0; i < groups.length; i += 1) groupModels.push(reqGroup(groups[i], i));

  return {
    form: form as SubListForm,
    title: optText(raw.title, 'sub-list: input.title'),
    use: optText(raw.use, 'sub-list: input.use'),
    summary: optSummary(raw.summary),
    groups: groupModels,
    emptyText: optText(raw.emptyText, 'sub-list: input.emptyText'),
    note: optText(raw.note, 'sub-list: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'sub-list: input.extraClass'),
  };
}
