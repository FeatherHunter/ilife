/** kanban-columns · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与 `command-palette/model.ts`／`drag-sort/model.ts` 同一条）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的看板会让调用方以为自己拿到的是「卡在哪一列、选中了谁」的那块面。
 *      · **全空白串＝拒**（`'   '` 会在屏上留一块空白：无字列名、无字卡、无字计数单位；
 *        **零宽字符那类不可见字符同样算空白**——`trim()` 剥不掉它们，得先剥再判）；
 *      · **入参表以外的键＝拒**（写错一个键名，调用方以为自己设上了，屏上却没有；
 *        自有的不可枚举键与原型链上继承来的键**同样算**——只走 `Object.keys` 会漏掉这两类）；
 *      · **键表按形态分**：`status` 档的列拿 `cards` 装东西、`grouped` 档拿 `groups` 装东西，
 *        给错那一档的键＝拒（静默吞掉的话，调用方会把「一个组都没画出来」当成件坏了）。
 *   2. **能算的都算出来**：每列的计数那一句、每组自己的计数那一句、状态句、收纳键的字——都在这里算好；
 *      `render.ts` 只拼标记，一个字都不算。
 *   3. **空是合法态**：`cards: []`（`status` 档）＝设计过的空槽；
 *      `items: []`（`grouped` 档）＝设计过的空格（组名与计数照常在，**屏上不写一句旁白**——读数自己说清）。
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
  kanbanRowStatusText,
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

/** 归一化后的一行物件（`grouped` 档的最小单位：整行就是那颗按钮）。 */
export interface KanbanItemRow {
  readonly key: string;
  readonly label: string;
  readonly value?: string;
  /** 住在哪一列（列的机器键）——它就是事件 `detail.from`。 */
  readonly colKey: string;
}

/** 归一化后的一个二级组（`count` 是屏上那一句「2 件」，与列计数同一个单位）。 */
export interface KanbanGroupRow {
  readonly name: string;
  readonly items: readonly KanbanItemRow[];
  /** 屏上那一句组计数（`2 件`）。 */
  readonly count: string;
}

/** 归一化后的一列（`count` 是屏上那一句「2 道」；`mark` 是这一列的形）。
 *  两档各自用 `cards`／`groups`——另一支照实留空（`status` 档的 `groups` 恒为 `[]`）。 */
export interface KanbanColumnRow {
  readonly key: string;
  readonly name: string;
  readonly purpose?: string;
  readonly unit: string;
  readonly cards: readonly KanbanCardRow[];
  readonly groups: readonly KanbanGroupRow[];
  /** 屏上那一句计数（`2 道`）。 */
  readonly count: string;
  /** 这一列的记号（●／▸／✓／◆，按列序取）。 */
  readonly mark: string;
}

/** 被拿起的那一行（两档共用的最小读数：机器键 ＋ 它在哪一列 ＋ **屏上那个名字**）。
 *  `status` 档取卡的标题、`grouped` 档取物件的名字——状态句念的就是它。 */
export interface KanbanPickedRow {
  readonly key: string;
  readonly colKey: string;
  readonly name: string;
}

/** 内部类型：`render.ts` 只吃它，不再自己碰 `any`。 */
export interface KanbanColumnsModel {
  readonly form: KanbanColumnsForm;
  readonly id: string;
  readonly columns: readonly KanbanColumnRow[];
  /** 被拿起的那一行（没拿起＝`undefined`）。 */
  readonly picked?: KanbanPickedRow;
  /** 窄档当前列（1 起）。 */
  readonly activeCol: number;
  /** 状态句（真读数）。 */
  readonly status: string;
  readonly extraClass?: string;
}

/** 不可见字符：零宽与格式那一类（`\u200b` 零宽空格、`\u200c/\u200d` 连接符、`\u200e/\u200f` 方向标记、
 *  `\u2060` 词连接符、`\ufeff` 零宽不换行空格、`\u00ad` 软连字符）。**`String.prototype.trim()` 不管它们**
 *  ——它按 Unicode WhiteSpace 剥，这几个是格式类（Cf）——所以「全空白」的判定得先把它们剥掉。 */
const INVISIBLE_RE = /[\u00ad\u200b-\u200f\u2060\ufeff]/g;

/** 「在屏上就是一块空白」：剥掉不可见字符再 `trim()`，剩下的还是空。 */
function isBlank(text: string): boolean {
  return text.replace(INVISIBLE_RE, '').trim() === '';
}

/** 机器值：非空、**只许标识符字符**（它要当 `data-*` 的值使）。 */
function reqIdentifier(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(text)) {
    badInput(field + ' 只许标识符字符（字母、数字、下划线、连字符），它还要当 data-* 的值用');
  }
  return text;
}

/** 必填文本：非空串**且不是全空白**（全空白——含零宽那类不可见字符——会在屏上留一块空白，那是看得到的错）。 */
function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (isBlank(text)) badInput(field + ' 必须是真正的文本（全空白不算，零宽字符这类不可见字符也不算）');
  return text;
}

/** 可选文本：空串＝未给（与全层 `optText` 同口径）；**全空白＝拒**（那会在屏上留一块空白）。 */
function optRealText(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text !== undefined && isBlank(text)) {
    badInput(field + ' 必须是真正的文本（全空白不算，零宽字符这类不可见字符也不算）');
  }
  return text;
}

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。
 *
 *  **两条都会被查到**（只走 `Object.keys` 会漏一半）：
 *   · `Object.getOwnPropertyNames` —— 自有的**全部**键，含**不可枚举**的（`Object.keys` 看不见它）；
 *   · `for…in` —— 走**整条原型链**（`Object.create({bogus:1})` 那种继承来的键就是这一路）。
 */
function assertKeys(raw: Record<string, unknown>, allowed: readonly string[], field: string, hint?: string): void {
  const bad: string[] = [];
  const note = (key: string): void => {
    if (!allowed.includes(key) && !bad.includes(key)) bad.push(key);
  };
  for (const key of Object.getOwnPropertyNames(raw)) note(key);
  for (const key in raw) note(key);
  if (bad.length > 0) {
    badInput(field + ' 里没有 `' + bad.join('`／`') + '` 这个键（入参表以外的键一律拒：'
      + '写错的键静默吞掉会让调用方以为自己设上了；继承来的与不可枚举的键同样算）'
      + (hint === undefined ? '' : hint));
  }
}

/** `KanbanColumnsInput` 的键（顶层入参表）。 */
const INPUT_KEYS = ['id', 'columns', 'pickedKey', 'activeCol', 'form', 'extraClass'] as const;

/** `status` 档的列的键（一列的入参表）。 */
const STATUS_COLUMN_KEYS = ['key', 'name', 'purpose', 'unit', 'cards'] as const;

/** `grouped` 档的列的键（一列的入参表）：这一档拿 `groups` 装东西，`cards`／`purpose` 不在表里。 */
const GROUPED_COLUMN_KEYS = ['key', 'name', 'unit', 'groups'] as const;

/** `KanbanCard` 的键（一张卡的入参表）。 */
const CARD_KEYS = ['key', 'title', 'meta'] as const;

/** `KanbanGroup` 的键（一个二级组的入参表）。 */
const GROUP_KEYS = ['name', 'items'] as const;

/** `KanbanGroupItem` 的键（一行物件的入参表）。 */
const ITEM_KEYS = ['key', 'label', 'value'] as const;

/** 给错形态的键时补的那半句：说清本档拿哪个键装东西。 */
const STATUS_KEY_HINT = '｜本形态 `status` 的列拿 `cards` 装东西（`groups` 是 `grouped` 那一档的键）';
const GROUPED_KEY_HINT = '｜本形态 `grouped` 的列拿 `groups` 装东西（`cards`／`purpose` 是 `status` 那一档的键）';

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

/** 一行物件 → 一行（逐字段校验；机器键整份看板内唯一，与列键也不许撞）。 */
function reqItem(value: unknown, at: string, colKey: string, seen: Set<string>): KanbanItemRow {
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  assertKeys(raw, ITEM_KEYS, at);
  const key = reqIdentifier(raw.key, at + '.key');
  if (seen.has(key)) badInput(at + '.key 与看板里前面某一行／某一列的 key 重了（每个 key 整份看板内唯一）');
  seen.add(key);
  return {
    key,
    label: reqRealText(raw.label, at + '.label'),
    value: optRealText(raw.value, at + '.value'),
    colKey,
  };
}

/** 一个二级组 → 一行（组名 ＋ 组计数；组里的行数上限与一列的卡数同一个数）。
 *  组**没有机器键**：本件不拿它当数据（落点由结构定：收进来的行走这一列最后一组的末尾），
 *  所以「组名重名的两个组」不是错——它们的区别是位置。 */
function reqGroup(value: unknown, at: string, colKey: string, unit: string, seen: Set<string>): KanbanGroupRow {
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  assertKeys(raw, GROUP_KEYS, at);
  const name = reqRealText(raw.name, at + '.name');
  const items = raw.items;
  if (!Array.isArray(items)) badInput(at + '.items 必须是数组（空格请显式给 []：空格是合法态，不是缺席）');
  assertDenseArray(items, at + '.items');
  if (items.length > KANBAN_COLUMNS_MAX_CARDS) {
    badInput(at + '.items 至多 ' + String(KANBAN_COLUMNS_MAX_CARDS) + ' 行（再多请调用方先分组）');
  }
  const rows = items.map((one, i) => reqItem(one, at + '.items[' + String(i) + ']', colKey, seen));
  return { name, items: rows, count: kanbanCountText(rows.length, unit) };
}

/** 一列 → 一行（**键表按形态分**：`status` 档读 `cards`、`grouped` 档读 `groups`；空数组＝设计过的空态）。 */
function reqColumn(value: unknown, at: string, index: number, seen: Set<string>, form: KanbanColumnsForm): KanbanColumnRow {
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  const grouped = form === 'grouped';
  assertKeys(raw, grouped ? GROUPED_COLUMN_KEYS : STATUS_COLUMN_KEYS, at, grouped ? GROUPED_KEY_HINT : STATUS_KEY_HINT);
  const key = reqIdentifier(raw.key, at + '.key');
  if (seen.has(key)) badInput(at + '.key 与看板里前面某一列的 key 重了（每列的 key 看板内唯一）');
  seen.add(key);
  const name = reqRealText(raw.name, at + '.name');
  const unitRaw = optRealText(raw.unit, at + '.unit');
  const unit = unitRaw === undefined ? KANBAN_COLUMNS_TEXT.unit : unitRaw;
  const mark = KANBAN_COLUMNS_MARKS[index % KANBAN_COLUMNS_MARKS.length];
  if (grouped) {
    const groups = raw.groups;
    if (!Array.isArray(groups)) {
      badInput(at + '.groups 必须是数组（`grouped` 档的列至少要有一组：那是这一列的格子）');
    }
    assertDenseArray(groups, at + '.groups');
    if (groups.length === 0) badInput(at + '.groups 至少一组（一组都没有的列请用 `status` 那一档）');
    const rows = groups.map((one, i) => reqGroup(one, at + '.groups[' + String(i) + ']', key, unit, seen));
    const total = rows.reduce((n, g) => n + g.items.length, 0);
    if (total > KANBAN_COLUMNS_MAX_CARDS) {
      badInput(at + '.groups 这一列合计至多 ' + String(KANBAN_COLUMNS_MAX_CARDS) + ' 行（再多请调用方先分列）');
    }
    return { key, name, unit, mark, cards: [], groups: rows, count: kanbanCountText(total, unit) };
  }
  const cards = raw.cards;
  if (!Array.isArray(cards)) badInput(at + '.cards 必须是数组（空列请显式给 []：空列是合法态，不是缺席）');
  assertDenseArray(cards, at + '.cards');
  if (cards.length > KANBAN_COLUMNS_MAX_CARDS) {
    badInput(at + '.cards 至多 ' + String(KANBAN_COLUMNS_MAX_CARDS) + ' 张（再多请调用方先分组）');
  }
  const rows = cards.map((one, i) => reqCard(one, at + '.cards[' + String(i) + ']', key, name, seen));
  return {
    key,
    name,
    purpose: optRealText(raw.purpose, at + '.purpose'),
    unit,
    mark,
    cards: rows,
    groups: [],
    count: kanbanCountText(rows.length, unit),
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
      + ' 之一（本件落地两档骨架：`status` 按状态分列／`grouped` 按位置分列 ＋ 列内二级组）');
  }

  const id = reqIdentifier(raw.id, 'kanban-columns: input.id');

  const list = raw.columns;
  if (!Array.isArray(list)) badInput('kanban-columns: input.columns 必须是数组（1 列谈不上看板）');
  assertDenseArray(list, 'kanban-columns: input.columns');
  if (list.length < KANBAN_COLUMNS_MIN_COLS || list.length > KANBAN_COLUMNS_MAX_COLS) {
    badInput('kanban-columns: input.columns 要 ' + String(KANBAN_COLUMNS_MIN_COLS)
      + '–' + String(KANBAN_COLUMNS_MAX_COLS) + ' 列（再多请调用方先分组）');
  }
  const one = form as KanbanColumnsForm;
  const seen = new Set<string>();
  const columns = list.map((value, i) => reqColumn(value, 'kanban-columns: input.columns[' + String(i) + ']', i, seen, one));

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

  let picked: KanbanPickedRow | undefined;
  const pickedRaw = raw.pickedKey;
  if (pickedRaw !== undefined) {
    if (typeof pickedRaw !== 'string' || pickedRaw === '') {
      badInput('kanban-columns: input.pickedKey 必须是非空字符串（被拿起那一行的机器键）');
    }
    for (const col of columns) {
      const hit = col.cards.find((c) => c.key === pickedRaw);
      if (hit !== undefined) picked = { key: hit.key, colKey: hit.colKey, name: hit.title };
      for (const g of col.groups) {
        const item = g.items.find((it) => it.key === pickedRaw);
        if (item !== undefined) picked = { key: item.key, colKey: item.colKey, name: item.label };
      }
    }
    if (picked === undefined) badInput('kanban-columns: input.pickedKey 没有命中任何一张卡／一行物件（拿起的那一行必须真的在看板里）');
  }

  return {
    form: one,
    id,
    columns,
    picked,
    activeCol,
    /* 状态句按形态取：两档同一句语义，只有「拿起了什么」那一样东西的名字照实写
       （`status` 档＝卡、`grouped` 档＝一行物件）。运行时段读的是同一对函数。 */
    status: (one === 'grouped' ? kanbanRowStatusText : kanbanStatusText)(picked === undefined ? null : picked.name),
    extraClass: optExtraClass(raw.extraClass, 'kanban-columns: input.extraClass'),
  };
}
