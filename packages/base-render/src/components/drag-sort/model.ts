/** drag-sort · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的顺序会让调用方以为自己拿到了「人排好的那一份」。
 *      全空白串＝拒（屏上留一块空白：空壳行、无字标题、「不可移：   」）；
 *      入参表以外的键＝拒（写错一个键名静默吞掉，调用方以为自己设上了）。
 *   2. **能算的都算出来**：序号、位置读数、把手的无障碍名、状态句、空槽句、落点句——
 *      都在这里算好；`render.ts` 只拼标记，一个字都不算；运行时段按同一口径现算。
 *   3. **落点位是 1 起的位**：`dropAt` 缺省＝被拿起的那一位（拿起还没挪＝落回原位）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  DRAG_SORT_FORMS,
  DRAG_SORT_MAX_ITEMS,
  DRAG_SORT_MIN_ITEMS,
  type DragSortForm,
} from './attrs.js';

/** 归一化后的一行（每个字段都已校验；`pos`／序号类文案都是算出来的）。 */
export interface DragSortRow {
  readonly key: string;
  readonly label: string;
  readonly note?: string;
  readonly meta?: string;
  readonly locked: boolean;
  readonly why?: string;
  /** 1 起的位（屏上第几行）。 */
  readonly pos: number;
  /** 位置读数（第 n 位，共 m 步：`／` 会被分隔符门判成并列分隔符，这里只用 `，`）。 */
  readonly posText: string;
  /** 把手的无障碍名（拿起态与锁定的三档各一句）。 */
  readonly grip: string;
}

/** 内部类型：`render.ts` 只吃它，不再自己碰 `any`。 */
export interface DragSortModel {
  readonly form: DragSortForm;
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly rows: readonly DragSortRow[];
  readonly total: number;
  /** 拿起态（没拿起＝`undefined`）。 */
  readonly lifted?: { readonly key: string; readonly from: number };
  /** 落点位（1 起；只有拿起态才有意义）。 */
  readonly dropAt: number;
  /** 状态句（plain／lifted 的真读数）。 */
  readonly status: string;
  /** 空槽句（拿起态才有）。 */
  readonly slotText: string;
  /** 落点句（拿起态才有：放这里第几位）。 */
  readonly lineText: string;
  readonly extraClass?: string;
}

/** 机器值：非空、**只许标识符字符**（它要当 `data-*` 的值与事件 `detail` 使）。 */
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

/** 可选文本：空串＝未给（与全层 `optText` 同口径）；**全空白＝拒**。 */
function optRealText(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text !== undefined && text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。 */
function assertKeys(raw: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) badInput(field + ' 里没有 `' + key + '` 这个键（入参表以外的键一律拒）');
  }
}

/** `DragSortInput` 的键（顶层入参表）。 */
const INPUT_KEYS = ['id', 'title', 'hint', 'items', 'liftedKey', 'dropAt', 'form', 'extraClass'] as const;

/** `DragSortItem` 的键（一行的入参表）。 */
const ITEM_KEYS = ['key', 'label', 'note', 'meta', 'locked', 'why'] as const;

/** plain 态的状态句（共几步 ＋ 只说看得见的通路）。 */
export function dragSortIdleStatus(total: number): string {
  return '共 ' + String(total) + ' 步。点把手拿起一行。放下时点另一行。';
}

/** lifted 态的状态句（拿起第几步、将放到第几位、取消在哪）。 */
export function dragSortLiftedStatus(from: number, label: string, to: number): string {
  return '已拿起第 ' + String(from) + ' 步「' + label + '」，将放到第 ' + String(to)
    + ' 位。点另一行放下，或点取消放回原位。';
}

/** 空槽句（写出哪一步空着、被拿起的是谁）。 */
export function dragSortSlotText(from: number, label: string): string {
  return '第 ' + String(from) + ' 步原位空着，被拿起的是' + label;
}

/** 落点句（写出放第几位）。 */
export function dragSortLineText(to: number): string {
  return '放这里（第 ' + String(to) + ' 位）';
}

/** 一枚条目 → 一行（逐字段校验；`locked` 必带 `why`）。 */
function reqItem(value: unknown, at: string, seen: Set<string>): {
  key: string; label: string; note?: string; meta?: string; locked: boolean; why?: string;
} {
  assertPlainObject(value, at);
  const raw = value as Record<string, unknown>;
  assertKeys(raw, ITEM_KEYS, at);
  const key = reqIdentifier(raw.key, at + '.key');
  if (seen.has(key)) badInput(at + '.key 与清单里前面某一项的 key 重了（每项的 key 清单内唯一）');
  seen.add(key);
  const label = reqRealText(raw.label, at + '.label');
  const note = optRealText(raw.note, at + '.note');
  const meta = optRealText(raw.meta, at + '.meta');
  const lockedRaw = raw.locked;
  if (lockedRaw !== undefined && typeof lockedRaw !== 'boolean') badInput(at + '.locked 必须是布尔值');
  const locked = lockedRaw === true;
  const why = optRealText(raw.why, at + '.why');
  if (locked && why === undefined) badInput(at + '.why 必填：锁定的那一行要说得清为什么拿不起来');
  if (!locked && why !== undefined) badInput(at + '.why 只能给锁定的行（没锁定的行没有原因可写）');
  return { key, label, note, meta, locked, why };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `DragSortModel`。 */
export function normalizeDragSort(input: unknown): DragSortModel {
  assertPlainObject(input, 'renderDragSort: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, INPUT_KEYS, 'renderDragSort: input');

  const form = raw.form === undefined ? DRAG_SORT_FORMS[0] : raw.form;
  if (!(DRAG_SORT_FORMS as readonly unknown[]).includes(form)) {
    badInput('drag-sort: input.form 必须是 ' + DRAG_SORT_FORMS.join('／')
      + ' 之一（本件只落地 A 一档「拖拽中：拖起行＋原位空槽＋落点粗线」）');
  }

  const id = reqIdentifier(raw.id, 'drag-sort: input.id');
  const title = reqRealText(raw.title, 'drag-sort: input.title');
  const hintRaw = optRealText(raw.hint, 'drag-sort: input.hint');

  const list = raw.items;
  if (!Array.isArray(list)) badInput('drag-sort: input.items 必须是数组（顺序就是屏上的顺序）');
  if (list.length < DRAG_SORT_MIN_ITEMS) {
    badInput('drag-sort: input.items 至少 ' + String(DRAG_SORT_MIN_ITEMS)
      + ' 条（1 条谈不上排序）');
  }
  if (list.length > DRAG_SORT_MAX_ITEMS) {
    badInput('drag-sort: input.items 至多 ' + String(DRAG_SORT_MAX_ITEMS)
      + ' 条（再多请调用方先分组）');
  }
  const seen = new Set<string>();
  for (let i = 0; i < list.length; i += 1) {
    if (!Object.prototype.hasOwnProperty.call(list, i)) {
      badInput('drag-sort: input.items[' + String(i) + '] 是个空洞（稀疏数组）：每个下标上都要真有一项');
    }
  }
  const parsed = list.map((one, i) => reqItem(one, 'drag-sort: input.items[' + String(i) + ']', seen));
  const total = parsed.length;

  /* 拿起态：`liftedKey` 须命中一行没锁定的；`dropAt` 是 1 起的位，缺省＝被拿起的那一位。 */
  const liftedRaw = raw.liftedKey;
  if (liftedRaw !== undefined && typeof liftedRaw !== 'string') {
    badInput('drag-sort: input.liftedKey 必须是字符串（被拿起那一行的机器键）');
  }
  const liftedKey = liftedRaw === undefined ? undefined : liftedRaw;
  if (liftedKey !== undefined && !seen.has(liftedKey)) {
    badInput('drag-sort: input.liftedKey 没有命中任何一行（拿起态要指着真有一行的键）');
  }
  const liftedIndex = liftedKey === undefined ? -1 : parsed.findIndex((r) => r.key === liftedKey);
  if (liftedIndex >= 0 && parsed[liftedIndex].locked) {
    badInput('drag-sort: input.liftedKey 指着锁定的行（锁定的行拿不起来）');
  }
  const dropRaw = raw.dropAt;
  if (dropRaw !== undefined && liftedKey === undefined) {
    badInput('drag-sort: input.dropAt 不能单独给（没有拿起就没有落点）');
  }
  let dropAt = liftedIndex >= 0 ? liftedIndex + 1 : 0;
  if (dropRaw !== undefined) {
    if (typeof dropRaw !== 'number' || !Number.isInteger(dropRaw)) {
      badInput('drag-sort: input.dropAt 必须是整数（1 起的位）');
    }
    if (dropRaw < 1 || dropRaw > total) {
      badInput('drag-sort: input.dropAt 必须是 1…' + String(total) + '（1 起的位）');
    }
    dropAt = dropRaw;
  }

  const rows: DragSortRow[] = parsed.map((r, i) => {
    const pos = i + 1;
    const grip = r.locked
      ? '第 ' + String(pos) + ' 步不可移，' + String(r.why)
      : (liftedKey === r.key
        ? '已拿起第 ' + String(pos) + ' 步：' + r.label + '，再点放回原位'
        : '拿起第 ' + String(pos) + ' 步：' + r.label);
    return {
      key: r.key, label: r.label, note: r.note, meta: r.meta,
      locked: r.locked, why: r.why, pos,
      posText: '第 ' + String(pos) + ' 位，共 ' + String(total) + ' 步',
      grip,
    };
  });

  const lifted = liftedKey === undefined ? undefined : { key: liftedKey, from: liftedIndex + 1 };
  const liftedLabel = lifted === undefined ? '' : parsed[liftedIndex].label;
  return {
    form: form as DragSortForm,
    id,
    title,
    hint: hintRaw === undefined ? '点把手拿起一行。放下时点另一行。' : hintRaw,
    rows,
    total,
    lifted,
    dropAt,
    status: lifted === undefined
      ? dragSortIdleStatus(total)
      : dragSortLiftedStatus(lifted.from, liftedLabel, dropAt),
    slotText: lifted === undefined ? '' : dragSortSlotText(lifted.from, liftedLabel),
    lineText: lifted === undefined ? '' : dragSortLineText(dropAt),
    extraClass: optExtraClass(raw.extraClass, 'drag-sort: input.extraClass'),
  };
}
