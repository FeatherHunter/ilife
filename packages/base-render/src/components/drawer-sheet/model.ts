/** drawer-sheet · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `dialog` 同一套）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级；
 *   2. **`id` 只许标识符字符**（触发键靠它找面板、`aria-labelledby` 靠它指标题）；
 *   3. **说不清「为什么按不动」的禁用项是错**：`disabled: true` 必须同时给 `note`——
 *      「看着能点、点了没反应」与「摆一个不说话的灰项」都是不许留的中间档。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  DRAWER_DONE_TEMPLATE, DRAWER_EDGES, DRAWER_FORMS, DRAWER_MISSING,
  type DrawerEdge, type DrawerForm, type DrawerOption, type DrawerSheetInput,
} from './attrs.js';

/** `id` 的字面口径（与同族 `dialog` 同一套：标识符字符，首字符不是标点）——**本件自足**，
 *  不从别的件取（件与件只在真的要用对方的**行为**时才互相引用，一条五行的校验规则不值一条依赖）。 */
const ID_RE = /^[A-Za-z0-9_\u00a0-\uffff][A-Za-z0-9_-\u00a0-\uffff]*$/;

/** 面板 `id` 校验。 */
function reqId(value: unknown, field: string): string {
  const id = reqText(value, field);
  if (!ID_RE.test(id)) badInput(field + ' 只许标识符字符（字母／数字／下划线／连字符／汉字）：' + id);
  return id;
}

/** 内部类型：每个字段都已校验、已归一。 */
export interface DrawerModel {
  readonly id: string;
  readonly form: DrawerForm;
  readonly edge: DrawerEdge;
  readonly title: string;
  readonly sub?: string;
  readonly options: readonly (DrawerOption & { readonly meta?: string })[];
  readonly emptyLine: string;
  readonly hint?: string;
  readonly summary?: string;
  readonly doneLabel: string;
  readonly open: boolean;
  readonly extraClass?: string;
}

/** 一项都没有时的那句现成话（调用方不给 `emptyLine` 时用它）。 */
export const DRAWER_EMPTY_LINE = '这里还没有可选项';

/** 完成键模板里那个可变处（渲染与运行时共用一个记号）。 */
export const DRAWER_COUNT_SLOT = '{n}';

/** 把模板里的 `{n}` 换成当前数（渲染期与运行期**同一处替换**，免得两处走散）。 */
export function fillDoneCount(template: string, n: number): string {
  return template.split(DRAWER_COUNT_SLOT).join(String(n));
}

/** 读数位：`undefined`＝不给这一格；`null`＝缺值（写成 `—`，与「0」区分）。 */
function reqMeta(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return DRAWER_MISSING;
  if (typeof value === 'string' && value !== '') return value;
  badInput(field + ' 必须是非空字符串，或 null（缺值，写成 ' + DRAWER_MISSING + '）');
}

/** 候选项：逐项校验；`value` 面板内唯一；禁用项必须说明为什么。 */
function reqOptions(value: unknown): DrawerModel['options'] {
  if (!Array.isArray(value)) badInput('drawer-sheet: input.options 必须是数组（空数组＝设计过的空态）');
  const seen = new Set<string>();
  const out: (DrawerOption & { readonly meta?: string })[] = [];
  for (let i = 0; i < value.length; i += 1) {
    assertPlainObject(value[i], 'drawer-sheet: input.options[' + i + ']');
    const raw = value[i] as Record<string, unknown>;
    if (raw.checked !== undefined && typeof raw.checked !== 'boolean') {
      badInput('drawer-sheet: input.options[' + i + '].checked 必须是布尔值');
    }
    if (raw.disabled !== undefined && typeof raw.disabled !== 'boolean') {
      badInput('drawer-sheet: input.options[' + i + '].disabled 必须是布尔值');
    }
    const item = {
      value: reqText(raw.value, 'drawer-sheet: input.options[' + i + '].value'),
      label: reqText(raw.label, 'drawer-sheet: input.options[' + i + '].label'),
      note: optText(raw.note, 'drawer-sheet: input.options[' + i + '].note'),
      meta: reqMeta(raw.meta, 'drawer-sheet: input.options[' + i + '].meta'),
      checked: raw.checked === true,
      disabled: raw.disabled === true,
    };
    if (seen.has(item.value)) badInput('drawer-sheet: options 的 value 必须唯一：' + item.value);
    seen.add(item.value);
    if (item.disabled && item.note === undefined) {
      badInput('drawer-sheet: 禁用项必须给 note 说明为什么按不动（options[' + i + ']）');
    }
    out.push(item);
  }
  return out;
}

/** 入参归一化（**唯一入口**：`render.ts` 只吃它产出的 `DrawerModel`）。 */
export function normalizeDrawerSheet(input: unknown): DrawerModel {
  assertPlainObject(input, 'renderDrawerSheet: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? DRAWER_FORMS[0] : raw.form;
  if (!(DRAWER_FORMS as readonly unknown[]).includes(form)) {
    badInput('drawer-sheet: input.form 必须是 ' + DRAWER_FORMS.join('／') + ' 之一（本件只落地形态 C「多选 ＋ 完成 N 项」）');
  }
  const edge = raw.edge === undefined ? DRAWER_EDGES[0] : raw.edge;
  if (!(DRAWER_EDGES as readonly unknown[]).includes(edge)) {
    badInput('drawer-sheet: input.edge 必须是 ' + DRAWER_EDGES.join('／') + ' 之一');
  }
  if (raw.open !== undefined && typeof raw.open !== 'boolean') {
    badInput('drawer-sheet: input.open 必须是布尔值');
  }
  const doneLabel = raw.doneLabel === undefined
    ? DRAWER_DONE_TEMPLATE : reqText(raw.doneLabel, 'drawer-sheet: input.doneLabel');
  if (doneLabel.indexOf(DRAWER_COUNT_SLOT) < 0) {
    /* 模板里没有 `{n}` 时，脚条上的计数与键上的字会各说各话 ⇒ 要么带上记号，要么别给这一项。 */
    badInput('drawer-sheet: input.doneLabel 必须含 ' + DRAWER_COUNT_SLOT + ' 记号（完成键上的数是活的）');
  }

  return {
    id: reqId(raw.id, 'drawer-sheet: input.id'),
    form: form as DrawerForm,
    edge: edge as DrawerEdge,
    title: reqText(raw.title, 'drawer-sheet: input.title'),
    sub: optText(raw.sub, 'drawer-sheet: input.sub'),
    options: reqOptions(raw.options),
    emptyLine: raw.emptyLine === undefined
      ? DRAWER_EMPTY_LINE : reqText(raw.emptyLine, 'drawer-sheet: input.emptyLine'),
    hint: optText(raw.hint, 'drawer-sheet: input.hint'),
    summary: optText(raw.summary, 'drawer-sheet: input.summary'),
    doneLabel,
    open: raw.open === true,
    extraClass: optExtraClass(raw.extraClass, 'drawer-sheet: input.extraClass'),
  };
}

/** 触发键入参。 */
export interface DrawerOpenerModel {
  readonly sheetId: string;
  readonly text: string;
  readonly label?: string;
  readonly extraClass?: string;
}

export function normalizeDrawerOpener(input: unknown): DrawerOpenerModel {
  assertPlainObject(input, 'renderDrawerOpener: input');
  const raw = input as Record<string, unknown>;
  return {
    sheetId: reqId(raw.sheetId, 'drawer-sheet: input.sheetId'),
    text: reqText(raw.text, 'drawer-sheet: input.text'),
    label: optText(raw.label, 'drawer-sheet: input.label'),
    extraClass: optExtraClass(raw.extraClass, 'drawer-sheet: input.extraClass'),
  };
}

export type { DrawerSheetInput };
