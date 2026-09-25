/** kanban-columns · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `command-palette/model.ts`／`drag-sort/model.ts` 同一条）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的看板会让调用方以为自己拿到的是「卡在哪一列、选中了谁」的那块面。
 *      · **全空白串＝拒**（`'   '` 会在屏上留一块空白：无字列名、无字卡、无字计数单位）；
 *      · **入参表以外的键＝拒**（写错一个键名，调用方以为自己设上了，屏上却没有）。
 *   2. **能算的都算出来**：每列的计数那一句、卡上那枚状态、状态句、收纳键的字——都在这里算好；
 *      `render.ts` 只拼标记，一个字都不算。
 *   3. **空列是合法态**：`cards: []` ＝ 设计过的空槽（列头与计数一直在，不消失）。
 */
import { assertDenseArray, assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  KANBAN_COLUMNS_FORMS,
  KANBAN_COLUMNS_MARKS,
  KANBAN_COLUMNS_MAX_CARDS,
  KANBAN_COLUMNS_MAX_COLS,
  KANBAN_COLUMNS_MIN_COLS,
  KANBAN_COLUMNS_TEXT,
  kanbanCountText,
  kanbanStatusText,
  type KanbanColumnsForm,
} from './attrs.js';

/** 归一化后的一张卡（`colKey` 是它现在住在哪一列；`badge` 是卡上那枚状态的字）。 */
export interface KanbanCardRow {
  readonly key: string;
  readonly title: string;
  readonly meta?: string;
  /** 住在哪一列（列的机器键）。 */
  readonly colKey: string;
  /** 卡上那枚状态的字（它在哪一列：字，不只靠列位置）。 */
  readonly badge: string;
}

/** 归一化后的一列（`count` 是屏上那一句「2 道」；`mark` 是这一列的形）。 */
export interface KanbanColumnRow {
  readonly key: string;
  readonly name: string;
  readonly purpose?: string;
  readonly unit: string;
  readonly cards: readonly KanbanCardRow[];
  /** 屏上那一句计数（`2 道`）。 */
  readonly count: string;
  /** 这一列的记号（●／▸／✓／◆，按列序取）。 */
  readonly mark: string;
}

/** 内部类型：`render.ts` 只吃它，不再自己碰 `any`。 */
export interface KanbanColumnsModel {
  readonly form: KanbanColumnsForm;
  readonly id: string;
  readonly columns: readonly KanbanColumnRow[];
  /** 被选中那一张卡（没选中＝`undefined`）。 */
  readonly picked?: KanbanCardRow;
  /** 窄档当前列（1 起）。 */
  readonly activeCol: number;
  /** 状态句（真读数）。 */
  readonly status: string;
  readonly extraClass?: string;
}

/** 机器值：非空、**只许标识符字符**（它要当 `data-*` 的值使）。 */
function reqIdentifier(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(text)) {
    badInput(field + ' 只许标识符字符（字母、数字、下划线、连字符），它还要当 data-* 的值用');
  }
  return text;
}

/** 必填文本：非空串**且不是全空白**（全空白会在屏上留一块空白，那是看得到的错）。 */
function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 可选文本：空串＝未给（与全层 `optText` 同口径）；**全空白＝拒**（那会在屏上留一块空白）。 */
function optRealText(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text !== undefined && text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。 */
function assertKeys(raw: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) badInput(field + ' 里没有 `' + key + '` 这个键（入参表以外的键一律拒：写错的键静默吞掉会让调用方以为自己设上了）');
  }
}

/** `KanbanColumnsInput` 的键（顶层入参表）。 */
const INPUT_KEYS = ['id', 'columns', 'pickedKey', 'activeCol', 'form', 'extraClass'] as const;

/** `KanbanColumn` 的键（一列的入参表）。 */
const COLUMN_KEYS = ['key', 'name', 'purpose', 'unit', 'cards'] as const;

/** `KanbanCard` 的键（一张卡的入参表）。 */
const CARD_KEYS = ['key', 'title', 'meta'] as const;

/** 一张卡 → 一行（逐字段校验；机器键整份看板内唯一）。 */
function reqCard(value: unknown, at: string, colKey: string, colName: string, seen: Set<string>): KanbanCardRow {
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  assertKeys(raw, CARD_KEYS, at);
  const key = reqIdentifier(raw.key, at + '.key');
  if (seen.has(key)) badInput(at + '.key 与看板里前面某一张卡的 key 重了（每张卡的 key 整份看板内唯一）');
  seen.add(key);
  const title = reqRealText(raw.title, at + '.title');
  return {
    key,
    title,
    meta: optRealText(raw.meta, at + '.meta'),
    colKey,
    badge: colName,
  };
}

/** 一列 → 一行（逐字段校验；空数组＝设计过的空槽，不是错）。 */
function reqColumn(value: unknown, at: string, index: number, seen: Set<string>): KanbanColumnRow {
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  assertKeys(raw, COLUMN_KEYS, at);
  const key = reqIdentifier(raw.key, at + '.key');
  if (seen.has(key)) badInput(at + '.key 与看板里前面某一列的 key 重了（每列的 key 看板内唯一）');
  seen.add(key);
  const name = reqRealText(raw.name, at + '.name');
  const cards = raw.cards;
  if (!Array.isArray(cards)) badInput(at + '.cards 必须是数组（空列请显式给 []：空列是合法态，不是缺席）');
  assertDenseArray(cards, at + '.cards');
  if (cards.length > KANBAN_COLUMNS_MAX_CARDS) {
    badInput(at + '.cards 至多 ' + String(KANBAN_COLUMNS_MAX_CARDS) + ' 张（再多请调用方先分组）');
  }
  const unitRaw = optRealText(raw.unit, at + '.unit');
  const unit = unitRaw === undefined ? KANBAN_COLUMNS_TEXT.unit : unitRaw;
  const rows = cards.map((one, i) => reqCard(one, at + '.cards[' + String(i) + ']', key, name, seen));
  return {
    key,
    name,
    purpose: optRealText(raw.purpose, at + '.purpose'),
    unit,
    cards: rows,
    count: kanbanCountText(rows.length, unit),
    mark: KANBAN_COLUMNS_MARKS[index % KANBAN_COLUMNS_MARKS.length],
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `KanbanColumnsModel`。 */
export function normalizeKanbanColumns(input: unknown): KanbanColumnsModel {
  assertPlainObject(input, 'renderKanbanColumns: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, INPUT_KEYS, 'renderKanbanColumns: input');

  const form = raw.form === undefined ? KANBAN_COLUMNS_FORMS[0] : raw.form;
  if (!(KANBAN_COLUMNS_FORMS as readonly unknown[]).includes(form)) {
    badInput('kanban-columns: input.form 必须是 ' + KANBAN_COLUMNS_FORMS.join('／')
      + ' 之一（本件只落地形态 A「按状态分列」）');
  }

  const id = reqIdentifier(raw.id, 'kanban-columns: input.id');

  const list = raw.columns;
  if (!Array.isArray(list)) badInput('kanban-columns: input.columns 必须是数组（1 列谈不上看板）');
  assertDenseArray(list, 'kanban-columns: input.columns');
  if (list.length < KANBAN_COLUMNS_MIN_COLS || list.length > KANBAN_COLUMNS_MAX_COLS) {
    badInput('kanban-columns: input.columns 要 ' + String(KANBAN_COLUMNS_MIN_COLS)
      + '–' + String(KANBAN_COLUMNS_MAX_COLS) + ' 列（再多请调用方先分组）');
  }
  const seen = new Set<string>();
  const columns = list.map((one, i) => reqColumn(one, 'kanban-columns: input.columns[' + String(i) + ']', i, seen));

  const activeRaw = raw.activeCol;
  let activeCol = 1;
  if (activeRaw !== undefined) {
    if (typeof activeRaw !== 'number' || !Number.isInteger(activeRaw)) {
      badInput('kanban-columns: input.activeCol 必须是整数（第几列，1 起）');
    }
    if (activeRaw < 1 || activeRaw > columns.length) {
      badInput('kanban-columns: input.activeCol 越界（看板只有 ' + String(columns.length) + ' 列）');
    }
    activeCol = activeRaw;
  }

  let picked: KanbanCardRow | undefined;
  const pickedRaw = raw.pickedKey;
  if (pickedRaw !== undefined) {
    if (typeof pickedRaw !== 'string' || pickedRaw === '') {
      badInput('kanban-columns: input.pickedKey 必须是非空字符串（被选中那一张卡的机器键）');
    }
    for (const col of columns) {
      const hit = col.cards.find((c) => c.key === pickedRaw);
      if (hit !== undefined) picked = hit;
    }
    if (picked === undefined) badInput('kanban-columns: input.pickedKey 没有命中任何一张卡（选中的卡必须真的在看板里）');
  }

  return {
    form: form as KanbanColumnsForm,
    id,
    columns,
    picked,
    activeCol,
    status: kanbanStatusText(picked === undefined ? null : picked.title),
    extraClass: optExtraClass(raw.extraClass, 'kanban-columns: input.extraClass'),
  };
}
