/** multi-checks · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  四条口径（与本节其余件同一份，另加一条本件特有的）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」；
 *   2. **机器键唯一**：行 `id` 重了就读不出"选了哪几条"，当场拒；
 *   3. **金额要么每行都给、要么一行都不给**：一半有一半没有的合计是**假的**（少了的那几行当 0 算）；
 *   4. 归一化只做「形状」：千分位、正负号、单位口径**归调用方**（本件只收「已经是给人看的样子」的串）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  MULTI_CHECKS_ALL_TEXT,
  MULTI_CHECKS_EMPTY_TEXT,
  MULTI_CHECKS_FORMS,
  MULTI_CHECKS_LOADING_TEXT,
  MULTI_CHECKS_NONE_TEXT,
  type MultiChecksAction,
  type MultiChecksForm,
  type MultiChecksRow,
} from './attrs.js';

/** 内部行类型：金额已算成整数「分」（浮点相加会把 0.1＋0.2 变成 0.30000000000000004）。 */
export interface MultiChecksRowModel {
  readonly id: string;
  readonly title: string;
  readonly group?: string;
  readonly note?: string;
  readonly amountCents?: number;
  readonly amountText?: string;
  readonly disabled: boolean;
  readonly disabledReason?: string;
}

/** 内部组类型（渲染用；`note` 取组内第一行给的那份）。 */
export interface MultiChecksGroupModel {
  readonly id: string;
  readonly note?: string;
  readonly rows: readonly MultiChecksRowModel[];
}

/** 内部动作类型。 */
export interface MultiChecksActionModel {
  readonly id: string;
  readonly label: string;
  readonly primary: boolean;
}

/** 内部类型（`render.ts` 只吃它，不再自己碰 `any`）。 */
export interface MultiChecksModel {
  readonly form: MultiChecksForm;
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly rows: readonly MultiChecksRowModel[];
  readonly loose: readonly MultiChecksRowModel[];
  readonly groups: readonly MultiChecksGroupModel[];
  readonly selected: ReadonlySet<string>;
  readonly actions: readonly MultiChecksActionModel[];
  readonly allText: string;
  readonly moneyUnit: string;
  readonly countUnit: string;
  /** 全部行都有金额 ⇒ 顶上与底下那句里带合计。 */
  readonly money: boolean;
  readonly required: boolean;
  readonly loading: boolean;
  readonly loadingText: string;
  readonly error?: string;
  readonly emptyText: string;
  readonly extraClass?: string;
}

/** 可选布尔：只收真布尔（`'yes'`／`1` 一律拒——它们说不出"是不是真的指 true"）。 */
function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

/** 金额串 → 整数分。只收十进制串（`-12`／`-12.5`／`-12.50`）；`-12.345` 这类拒（分以下说不清）。 */
function centsOf(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^-?\d+(\.\d{1,2})?$/.test(value)) {
    badInput(field + ' 必须是十进制金额串（如 -12.00；分以下不给、千分位归调用方）');
  }
  const negative = value.startsWith('-');
  const body = negative ? value.slice(1) : value;
  const dot = body.indexOf('.');
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = (dot === -1 ? '' : body.slice(dot + 1) + '00').slice(0, 2);
  const cents = Number(intPart) * 100 + Number(fracPart);
  return negative ? -cents : cents;
}

/** 一行：逐字段校验（`id`／`title` 必填）。 */
function normalizeRow(raw: unknown, index: number): MultiChecksRowModel {
  assertPlainObject(raw, 'multi-checks: input.rows[' + index + ']');
  const r = raw as MultiChecksRow;
  const id = reqText(r.id, 'multi-checks: input.rows[' + index + '].id');
  const title = reqText(r.title, 'multi-checks: input.rows[' + index + '].title');
  const disabled = optBool(r.disabled, 'multi-checks: input.rows[' + index + '].disabled') === true;
  const disabledReason = optText(r.disabledReason, 'multi-checks: input.rows[' + index + '].disabledReason');
  if (disabledReason !== undefined && !disabled) {
    badInput('multi-checks: input.rows[' + index + '].disabledReason 只在 disabled=true 时给（否则这句"为什么不能勾"说不清）');
  }
  return {
    id,
    title,
    group: optText(r.group, 'multi-checks: input.rows[' + index + '].group'),
    note: optText(r.note, 'multi-checks: input.rows[' + index + '].note'),
    amountCents: centsOf(r.amount, 'multi-checks: input.rows[' + index + '].amount'),
    /* 屏上金额缺省＝机器金额那份原始写法（`-12.00`）；要千分位就自己给 `amountText`。 */
    amountText: optText(r.amountText, 'multi-checks: input.rows[' + index + '].amountText')
      ?? (typeof r.amount === 'string' ? r.amount : undefined),
    disabled,
    disabledReason,
  };
}

/** 一个动作：`id`／`label` 必填；一排里至多一枚主按钮。 */
function normalizeAction(raw: unknown, index: number): MultiChecksActionModel {
  assertPlainObject(raw, 'multi-checks: input.actions[' + index + ']');
  const a = raw as MultiChecksAction;
  return {
    id: reqText(a.id, 'multi-checks: input.actions[' + index + '].id'),
    label: reqText(a.label, 'multi-checks: input.actions[' + index + '].label'),
    primary: optBool(a.primary, 'multi-checks: input.actions[' + index + '].primary') === true,
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `MultiChecksModel`。 */
export function normalizeMultiChecks(input: unknown): MultiChecksModel {
  assertPlainObject(input, 'renderMultiChecks: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? MULTI_CHECKS_FORMS[0] : raw.form;
  if (!(MULTI_CHECKS_FORMS as readonly unknown[]).includes(form)) {
    badInput('multi-checks: input.form 必须是 ' + MULTI_CHECKS_FORMS.join('／') + ' 之一（本件只落地形态 A「顶上全选 ＋ 分组复选 ＋ 底下动作」）');
  }

  const givenRows = raw.rows;
  if (givenRows !== undefined && !Array.isArray(givenRows)) badInput('multi-checks: input.rows 必须是数组');
  const rows: MultiChecksRowModel[] = [];
  if (Array.isArray(givenRows)) {
    for (let i = 0; i < givenRows.length; i += 1) rows.push(normalizeRow(givenRows[i], i));
  }
  const ids = new Set<string>();
  for (const r of rows) {
    if (ids.has(r.id)) badInput('multi-checks: input.rows 里机器键重复（按 id 定位，重了就读不出选了哪几条）：' + r.id);
    ids.add(r.id);
  }

  /* 金额：要么每行都给、要么一行都不给——一半有一半没有的合计是假的。 */
  const withAmount = rows.filter((r) => r.amountCents !== undefined).length;
  if (withAmount !== 0 && withAmount !== rows.length) {
    badInput('multi-checks: input.rows 的 amount 要么每行都给、要么一行都不给（给了 ' + String(withAmount) + ' / ' + String(rows.length) + ' 行：这样的合计把没给的那几行按 0 算了）');
  }

  /* 分组：按**首次出现**的顺序排出组（顺序＝调用方给的顺序，本件不重排）；组尾那句读数取组内**第一份给了的**。 */
  const groupOrder: string[] = [];
  const groupRows = new Map<string, MultiChecksRowModel[]>();
  const groupNote = new Map<string, string>();
  const loose: MultiChecksRowModel[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    if (r.group === undefined) { loose.push(r); continue; }
    if (!groupRows.has(r.group)) { groupOrder.push(r.group); groupRows.set(r.group, []); }
    (groupRows.get(r.group) as MultiChecksRowModel[]).push(r);
    const note = optText((givenRows as readonly MultiChecksRow[])[i].groupNote, 'multi-checks: input.rows[' + i + '].groupNote');
    if (note !== undefined && !groupNote.has(r.group)) groupNote.set(r.group, note);
  }
  const groups: MultiChecksGroupModel[] = groupOrder.map((id) => ({
    id,
    note: groupNote.get(id),
    rows: groupRows.get(id) as MultiChecksRowModel[],
  }));

  /* 预勾选：给的值必须命中一行（否则"勾了但屏上没有哪一行是勾的"）。 */
  const selected = new Set<string>();
  const rawSelected = raw.selected;
  if (rawSelected !== undefined && rawSelected !== null) {
    if (!Array.isArray(rawSelected)) badInput('multi-checks: input.selected 必须是机器键数组');
    for (let i = 0; i < rawSelected.length; i += 1) {
      const one = reqText(rawSelected[i], 'multi-checks: input.selected[' + i + ']');
      if (!ids.has(one)) badInput('multi-checks: input.selected 必须命中 rows 里的一条：' + one);
      selected.add(one);
    }
  }

  const givenActions = raw.actions;
  if (givenActions !== undefined && !Array.isArray(givenActions)) badInput('multi-checks: input.actions 必须是数组');
  const actions: MultiChecksActionModel[] = [];
  if (Array.isArray(givenActions)) {
    for (let i = 0; i < givenActions.length; i += 1) actions.push(normalizeAction(givenActions[i], i));
  }
  const actionIds = new Set<string>();
  let primaries = 0;
  for (const a of actions) {
    if (actionIds.has(a.id)) badInput('multi-checks: input.actions 里 id 重复：' + a.id);
    actionIds.add(a.id);
    if (a.primary) primaries += 1;
  }
  if (primaries > 1) badInput('multi-checks: input.actions 里至多一枚主按钮（主按钮多了等于没有主按钮）');

  const loading = optBool(raw.loading, 'multi-checks: input.loading') === true;
  const loadingText = optText(raw.loadingText, 'multi-checks: input.loadingText');
  if (loadingText !== undefined && !loading) badInput('multi-checks: input.loadingText 只在 loading=true 时给');
  const emptyText = optText(raw.emptyText, 'multi-checks: input.emptyText');
  const allText = optText(raw.allText, 'multi-checks: input.allText');
  const moneyUnit = optText(raw.moneyUnit, 'multi-checks: input.moneyUnit');
  const countUnit = optText(raw.countUnit, 'multi-checks: input.countUnit');

  return {
    form: form as MultiChecksForm,
    name: reqText(raw.name, 'multi-checks: input.name'),
    label: reqText(raw.label, 'multi-checks: input.label'),
    hint: optText(raw.hint, 'multi-checks: input.hint'),
    rows,
    loose,
    groups,
    selected,
    actions,
    allText: allText === undefined ? MULTI_CHECKS_ALL_TEXT : allText,
    moneyUnit: moneyUnit === undefined ? '¥' : moneyUnit,
    countUnit: countUnit === undefined ? '条' : countUnit,
    money: rows.length > 0 && withAmount === rows.length,
    required: optBool(raw.required, 'multi-checks: input.required') === true,
    loading,
    loadingText: loadingText === undefined ? MULTI_CHECKS_LOADING_TEXT : loadingText,
    error: optText(raw.error, 'multi-checks: input.error'),
    emptyText: emptyText === undefined ? MULTI_CHECKS_EMPTY_TEXT : emptyText,
    extraClass: optExtraClass(raw.extraClass, 'multi-checks: input.extraClass'),
  };
}

/** 顶上那句「已选 N / M 条」（渲染与运行时**同一份**算法：两处各写一套必然走散）。 */
export function multiChecksCountText(count: number, total: number, unit: string): string {
  return '已选 ' + String(count) + ' / ' + String(total) + ' ' + unit;
}

/** 底下那句合计／已勾（渲染与运行时**同一份**算法）。`totalCents === null` ⇒ 这一坨没有金额。
 *  金额的符号写在**货币号前**（`-¥56.00`）：`¥-56.00` 读起来像"负的日元"，也不合账目习惯。 */
export function multiChecksSumText(count: number, unit: string, totalCents: number | null, moneyUnit: string): string {
  if (count === 0) return MULTI_CHECKS_NONE_TEXT;
  if (totalCents === null) return '已勾 ' + String(count) + ' ' + unit;
  return '合计 ' + (totalCents < 0 ? '-' : '') + moneyUnit + formatCents(Math.abs(totalCents));
}

/** 整数分 → `1,286.40` 这种给人看的样子（千分位只在本件产出的读数上用）。 */
export function formatCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const int = String(Math.floor(abs / 100));
  const frac = String(abs % 100).padStart(2, '0');
  return (negative ? '-' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + frac;
}

/** 错态那一句挂的 `id`（`aria-describedby` 指它）：机器键里不合法 id 的字符一律换成 `-`。 */
export function multiChecksErrorId(name: string): string {
  return 'ilife-checks-err-' + name.replace(/[^A-Za-z0-9_-]+/g, '-');
}

/** 顶上那句读数挂的 `id`（动作按钮按不动时 `aria-describedby` 指它）。 */
export function multiChecksCountId(name: string): string {
  return 'ilife-checks-count-' + name.replace(/[^A-Za-z0-9_-]+/g, '-');
}

/** 底下那句读数挂的 `id`。 */
export function multiChecksSumId(name: string): string {
  return 'ilife-checks-sum-' + name.replace(/[^A-Za-z0-9_-]+/g, '-');
}
