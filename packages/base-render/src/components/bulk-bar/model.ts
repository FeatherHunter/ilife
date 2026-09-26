/** bulk-bar · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：猜出来的条子
 *      会在页面上长成另一种东西（少一枚动作、换个形态），而调用方以为拿到了本件。
 *      **入参表以外的键同样拒**（每一层都查，见 `keys.ts` 的 `assertKeys`）：写错的键名静默吞掉时
 *      屏上只是静静地少一块，调用方却以为自己设上了。
 *   2. **缺值与空串是两件事**：可选字段给空串＝未给（与全层 `optText` 同口径）；必填字段给空串＝错。
 *   3. **归一化只做「形状」**：取整、千分位、金额怎么算**归调用方**——本件只收「已经是给人看的样子」的串
 *      与**结构化的预演**（哪条会改、改前改后），不替调用方算钱、不替它查库。
 *
 *  两处要点（判据逐条断）：
 *   · `disabledReason` 只在 `disabled: true` 时给——孤零零一句原因会变成没人看得见的注解；
 *   · `openAction` 必须命中一枚**带预演**的动作——否则渲染出来是一块永远打不开的空壳。
 */
import { assertDenseArray, assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  BULK_BAR_CANCEL_LABEL,
  BULK_BAR_COUNT_UNIT,
  BULK_BAR_EMPTY_TEXT,
  BULK_BAR_FORMS,
  BULK_BAR_NOTHING_TEXT,
  BULK_BAR_TONES,
  BULK_BAR_VALUE_LABEL,
  type BulkBarAction,
  type BulkBarForm,
  type BulkBarInput,
  type BulkBarItem,
  type BulkBarPreview,
  type BulkBarPreviewRow,
  type BulkBarTone,
} from './attrs.js';
/* 键表与「未知键一律拒」住 `keys.ts`（同一批入参小件；理由见那份的文件头）。 */
import {
  assertKeys,
  BULK_BAR_ACTION_KEYS,
  BULK_BAR_INPUT_KEYS,
  BULK_BAR_ITEM_KEYS,
  BULK_BAR_PREVIEW_KEYS,
  BULK_BAR_PREVIEW_ROW_KEYS,
} from './keys.js';

/** 条目的上限（再多就不该用「批量」了，该用筛选或全选）。 */
export const BULK_BAR_ITEM_MAX = 200;
/** 预演逐条的上限（预演是让人**逐条看**的，超过就看不完了）。 */
export const BULK_BAR_PREVIEW_MAX = 50;
/** 「最近用过」的枚数上限。 */
export const BULK_BAR_RECENT_MAX = 6;

/** 一行（已校验、已归一）。 */
export interface BulkBarItemModel {
  readonly key: string;
  readonly title: string;
  readonly note?: string;
  readonly reading?: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly disabledReason?: string;
}

/** 预演里的一行（已校验、已归一）。 */
export interface BulkBarPreviewRowModel {
  readonly keep: boolean;
  readonly to: string;
  readonly from?: string;
  readonly note?: string;
}

/** 一枚动作的预演（已校验、已归一；结论句与主按钮的字在这一层算出来，渲染层不再动脑）。 */
export interface BulkBarPreviewModel {
  readonly title: string;
  readonly cap?: string;
  readonly valueLabel: string;
  readonly value?: string;
  readonly recent: readonly string[];
  readonly rows: readonly BulkBarPreviewRowModel[];
  readonly summary: string;
  readonly submitLabel: string;
  readonly cancelLabel: string;
  readonly keepCount: number;
  readonly skipCount: number;
}

/** 一枚动作（已校验、已归一）。 */
export interface BulkBarActionModel {
  readonly key: string;
  readonly label: string;
  readonly tone: BulkBarTone;
  readonly preview?: BulkBarPreviewModel;
  readonly disabled: boolean;
  readonly busy: boolean;
  readonly error?: string;
}

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或空数组）。 */
export interface BulkBarModel {
  readonly form: BulkBarForm;
  readonly name: string;
  readonly items: readonly BulkBarItemModel[];
  readonly actions: readonly BulkBarActionModel[];
  readonly countUnit: string;
  readonly tail?: string;
  readonly hint?: string;
  readonly emptyText: string;
  readonly openAction?: string;
  readonly extraClass?: string;
}

/* ── 小件：类型不对就抛，不猜 ─────────────────────────────────────── */

/** 可选布尔：非布尔一律拒（`1`／`'true'` 这种"看着像"的值不猜）。 */
function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔值');
  return value;
}

/** 必填数组（空数组**不算错**：条目空＝空态；别处自己判）。
 *  **顺手把洞堵上**：稀疏数组（`new Array(3)`）的洞会被 `map` 跳过、被 `for…of` 取成 `undefined`，
 *  校验那一趟看着全过、渲染那一趟抛 `TypeError` ⇒ 每个下标上都要真有一项（口径见 `assertDenseArray`）。 */
function reqList(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) badInput(field + ' 必须是数组');
  const list = value as unknown[];
  assertDenseArray(list, field);
  return list;
}

/** 可选的串数组（空串元素一律拒；空数组＝未给）。 */
function optTextList(value: unknown, field: string, max: number): readonly string[] {
  if (value === undefined) return [];
  const list = reqList(value, field);
  if (list.length > max) badInput(field + ' 至多 ' + String(max) + ' 条');
  return list.map((one, i) => reqText(one, field + '[' + i + ']'));
}

/* ── 三块：条目／预演／动作 ───────────────────────────────────────── */

/** 一行。 */
function itemOf(value: unknown, at: number, seen: Set<string>): BulkBarItemModel {
  const field = 'bulk-bar: input.items[' + String(at) + ']';
  assertPlainObject(value, field);
  assertKeys(value as object, BULK_BAR_ITEM_KEYS, field);
  const raw = value as BulkBarItem;
  const key = reqText(raw.key, field + '.key');
  if (seen.has(key)) badInput(field + '.key 在清单里重复了：' + key + '（机器键必须唯一）');
  seen.add(key);
  const disabled = optBool(raw.disabled, field + '.disabled') === true;
  const why = optText(raw.disabledReason, field + '.disabledReason');
  if (why !== undefined && !disabled) {
    badInput(field + '.disabledReason 只在 disabled: true 时给（孤零零一句原因没人看得见）');
  }
  return {
    key,
    title: reqText(raw.title, field + '.title'),
    note: optText(raw.note, field + '.note'),
    reading: optText(raw.reading, field + '.reading'),
    selected: optBool(raw.selected, field + '.selected') === true,
    disabled,
    disabledReason: disabled ? why : undefined,
  };
}

/** 预演里的一行。 */
function previewRowOf(value: unknown, at: number, field: string): BulkBarPreviewRowModel {
  assertPlainObject(value, field + '[' + String(at) + ']');
  const raw = value as BulkBarPreviewRow;
  const at0 = field + '[' + String(at) + ']';
  assertKeys(value as object, BULK_BAR_PREVIEW_ROW_KEYS, at0);
  const keep = optBool(raw.keep, at0 + '.keep');
  if (keep === undefined) badInput(at0 + '.keep 必填（`true`＝这条会改；`false`＝跳过）');
  const note = optText(raw.note, at0 + '.note');
  if (keep === false && note === undefined) {
    badInput(at0 + '.note 必填：跳过的那一条要**写清为什么**不被改（只写「跳过」等于没说）');
  }
  return { keep, to: reqText(raw.to, at0 + '.to'), from: optText(raw.from, at0 + '.from'), note };
}

/** 一枚动作的预演。 */
function previewOf(value: unknown, field: string, unit: string): BulkBarPreviewModel {
  assertPlainObject(value, field);
  assertKeys(value as object, BULK_BAR_PREVIEW_KEYS, field);
  const raw = value as BulkBarPreview;
  const rowsRaw = reqList(raw.rows, field + '.rows');
  if (rowsRaw.length === 0) badInput(field + '.rows 至少要有一项（没有逐条预演的预演没有意义）');
  if (rowsRaw.length > BULK_BAR_PREVIEW_MAX) {
    badInput(field + '.rows 至多 ' + String(BULK_BAR_PREVIEW_MAX) + ' 条（逐条看的东西再多就看不完了）');
  }
  const rows = rowsRaw.map((one, i) => previewRowOf(one, i, field + '.rows'));
  let keepCount = 0;
  for (const r of rows) if (r.keep) keepCount += 1;
  const skipCount = rows.length - keepCount;
  const defaultSummary = keepCount === 0
    ? BULK_BAR_NOTHING_TEXT
    : ('会改 ' + String(keepCount) + ' ' + unit + (skipCount === 0 ? '' : ' · 跳过 ' + String(skipCount) + ' ' + unit));
  return {
    title: reqText(raw.title, field + '.title'),
    cap: optText(raw.cap, field + '.cap'),
    valueLabel: optText(raw.valueLabel, field + '.valueLabel') ?? BULK_BAR_VALUE_LABEL,
    value: optText(raw.value, field + '.value'),
    recent: optTextList(raw.recent, field + '.recent', BULK_BAR_RECENT_MAX),
    rows,
    summary: optText(raw.summary, field + '.summary') ?? defaultSummary,
    submitLabel: optText(raw.submitLabel, field + '.submitLabel')
      ?? (keepCount === 0 ? BULK_BAR_NOTHING_TEXT : '改这 ' + String(keepCount) + ' ' + unit),
    cancelLabel: optText(raw.cancelLabel, field + '.cancelLabel') ?? BULK_BAR_CANCEL_LABEL,
    keepCount,
    skipCount,
  };
}

/** 一枚动作。`hint` 是操作条底下那句提示——一枚按不动的动作**必须**有它：
 *  没有说明的灰按钮是「看着按不动、不知道为什么」的中间档（README 不变量 8 的反面）。 */
function actionOf(value: unknown, at: number, seen: Set<string>, unit: string, hint: string | undefined): BulkBarActionModel {
  const field = 'bulk-bar: input.actions[' + String(at) + ']';
  assertPlainObject(value, field);
  assertKeys(value as object, BULK_BAR_ACTION_KEYS, field);
  const raw = value as BulkBarAction;
  const key = reqText(raw.key, field + '.key');
  if (seen.has(key)) badInput(field + '.key 在一排里重复了：' + key + '（动作键必须唯一）');
  seen.add(key);
  const tone = raw.tone === undefined ? BULK_BAR_TONES[0] : raw.tone;
  if (!(BULK_BAR_TONES as readonly unknown[]).includes(tone)) {
    badInput(field + '.tone 必须是 ' + BULK_BAR_TONES.join('／') + ' 之一');
  }
  const disabled = optBool(raw.disabled, field + '.disabled') === true;
  if (disabled && hint === undefined) {
    badInput(field + '.disabled: true 时必须给 bulk-bar: input.hint'
      + '（按不动的那一枚为什么按不动要写出来——它没别处可说，灰按钮不许没有说明）');
  }
  return {
    key,
    label: reqText(raw.label, field + '.label'),
    tone: tone as BulkBarTone,
    preview: raw.preview === undefined ? undefined : previewOf(raw.preview, field + '.preview', unit),
    disabled,
    busy: optBool(raw.busy, field + '.busy') === true,
    error: optText(raw.error, field + '.error'),
  };
}

/* ── 入口 ────────────────────────────────────────────────────────── */

/** 入参归一化。**唯一入口**：`render.ts` 与 `runtime.ts` 都只吃它产出的 `BulkBarModel`。 */
export function normalizeBulkBar(input: unknown): BulkBarModel {
  assertPlainObject(input, 'renderBulkBar: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, BULK_BAR_INPUT_KEYS, 'renderBulkBar: input');

  const form = raw.form === undefined ? BULK_BAR_FORMS[0] : raw.form;
  if (!(BULK_BAR_FORMS as readonly unknown[]).includes(form)) {
    badInput('bulk-bar: input.form 必须是 ' + BULK_BAR_FORMS.join('／')
      + ' 之一（本件只落地形态 A「选中后浮出来的操作条」）');
  }

  const itemsRaw = reqList(raw.items, 'bulk-bar: input.items');
  if (itemsRaw.length > BULK_BAR_ITEM_MAX) {
    badInput('bulk-bar: input.items 至多 ' + String(BULK_BAR_ITEM_MAX) + ' 条（再多该用筛选，不该用批量）');
  }
  const seenItems = new Set<string>();
  const items = itemsRaw.map((one, i) => itemOf(one, i, seenItems));

  const actionsRaw = reqList(raw.actions, 'bulk-bar: input.actions');
  if (actionsRaw.length === 0) badInput('bulk-bar: input.actions 至少要有一项动作');
  const countUnit = optText(raw.countUnit, 'bulk-bar: input.countUnit') ?? BULK_BAR_COUNT_UNIT;
  const hint = optText(raw.hint, 'bulk-bar: input.hint');
  const seenActions = new Set<string>();
  const actions = actionsRaw.map((one, i) => actionOf(one, i, seenActions, countUnit, hint));

  const openAction = optText(raw.openAction, 'bulk-bar: input.openAction');
  if (openAction !== undefined) {
    const hit = actions.find((a) => a.key === openAction);
    if (hit === undefined) badInput('bulk-bar: input.openAction 必须命中 input.actions 里的一枚动作：' + openAction);
    if (hit.preview === undefined) {
      badInput('bulk-bar: input.openAction 命中的动作没有 input.actions[].preview'
        + '（没有预演的动作按下去直接派发事件，没有确认面可展开）');
    }
  }

  const model: BulkBarModel = {
    form: form as BulkBarForm,
    name: reqText(raw.name, 'bulk-bar: input.name'),
    items,
    actions,
    countUnit,
    tail: optText(raw.tail, 'bulk-bar: input.tail'),
    hint,
    emptyText: optText(raw.emptyText, 'bulk-bar: input.emptyText') ?? BULK_BAR_EMPTY_TEXT,
    openAction,
    extraClass: optExtraClass(raw.extraClass, 'bulk-bar: input.extraClass'),
  };
  return model;
}

/* ── 行内 `id` 的拼法（同页唯一的那一半） ────────────────────────────── */

/** `id` 里那一段的编码：**逐字符**，不是「把非法字符一串换成 `-`」。
 *
 *  为什么不能用替换：`'记账条'`／`'改分类'`／`'改账户'` 换成 `-` 之后**都是同一个串** ⇒ 同页出现
 *  两个同名 `id`，而且 `aria-controls` 反查（`runtime.ts` 的 `panelOf`）按 `id` 找块 ⇒ 点「改账户」
 *  开出来的是「改分类」那块面板（真机上实测：两块 `hidden` 由 `[true,true]` 变 `[false,true]`，
 *  而 `aria-expanded` 却是 `["改分类:false","改账户:true"]`——两处自相矛盾）。
 *
 *  编码（可逆、不撞）：`[A-Za-z0-9]` 照抄；其余字符（含 `_`／`-`／全部非 ASCII）写成
 *  `_` ＋ 该字符的**码点十六进制** ＋ `_`。两端下划线封口 ⇒ 每个转义自定界（扫描时一个 `_`
 *  到下一个 `_` 就是一段码点），编码本身无歧义；`-` 于是**只出现在两段之间**（分隔符），
 *  件名与动作键的切分点唯一 ⇒ 不同的（件名，动作键）必得不同的 `id`。
 *
 *  代价：`ledger-bulk` 这样的键会变成 `ledger_2d_bulk`（多 4 个字符），换来的是非 ASCII 键
 *  （本仓机器键大量是中文）也照旧同页唯一。`id` 只出现在属性里，人读不到，值这个价。 */
function idPart(s: string): string {
  let out = '';
  for (const ch of s) {
    if (/^[A-Za-z0-9]$/.test(ch)) out += ch;
    else out += '_' + (ch.codePointAt(0) as number).toString(16) + '_';
  }
  return out;
}

/** 确认面的 `id`（同页唯一：`name` 同页唯一 ＋ 动作键一排内唯一）。 */
export function bulkBarConfirmId(name: string, actionKey: string): string {
  return 'ilife-bulk-confirm-' + idPart(name) + '-' + idPart(actionKey);
}

/** 错态那句字的 `id`（动作按钮的 `aria-describedby` 指它）。 */
export function bulkBarErrorId(name: string, actionKey: string): string {
  return 'ilife-bulk-error-' + idPart(name) + '-' + idPart(actionKey);
}

/** 提示那句的 `id`（按不动的那几枚动作指它：「为什么按不动」就写在那儿）。 */
export function bulkBarHintId(name: string): string {
  return 'ilife-bulk-hint-' + idPart(name);
}

/** 计数那句的 `id`（`aria-live` 的落点，供外部 `aria-describedby` 引用）。 */
export function bulkBarCountId(name: string): string {
  return 'ilife-bulk-count-' + idPart(name);
}

/** 未使用的入参键（判据用：调用方多给键照实忽略，但键名要能一眼看出来）。 */
export type BulkBarInputShape = BulkBarInput;
