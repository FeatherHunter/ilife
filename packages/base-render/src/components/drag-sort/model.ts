/** drag-sort · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的顺序会让调用方以为自己拿到了「人排好的那一份」。
 *      全空白串＝拒（屏上留一块空白：空壳行、无字标题、「不可移：   」）；
 *      入参表以外的键＝拒（写错一个键名静默吞掉，调用方以为自己设上了）。
 *   2. **能算的都算出来**：序号、位置读数、把手的无障碍名、状态句、空槽句、落点句——
 *      都在这里从 `attrs.ts` 的 `DRAG_SORT_TEXT`（**整句的唯一定义地**）取；`render.ts` 只拼标记，
 *      一个字都不算；`runtime.ts` 烘的是同一个 `dragSortText()`（同源，不是另写一份）。
 *   3. **落点位是 1 起的位**：`lift` 档 `dropAt` 缺省＝被拿起的那一位（拿起还没挪＝落回原位）；
 *      `buttons` 档的落点**不是入参**——它是算出来的（选中行还能不能上移：能就预告上移的落点，
 *      到头了就预告下移的落点，相邻都是锁定的行就没有预告）。
 *   4. **两档在屏上分家**（用户口径：一屏只留一层话、同一个数只印一次）：`buttons` 档每行的位置读数
 *      只印自己那一位（总数住卡头那句），不写状态句、不画空槽；`lift` 档的读数与三样照旧。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  DRAG_SORT_FORMS,
  DRAG_SORT_MAX_ITEMS,
  DRAG_SORT_MIN_ITEMS,
  DRAG_SORT_TEXT,
  dragSortText,
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
  /** 位置读数（`lift` 档＝「第 n 位，共 m 步」；`buttons` 档＝「第 n 位」——总数在卡头那句里只印一次）。 */
  readonly posText: string;
  /** 把手的无障碍名（拿起态与锁定的三档各一句；`buttons` 档是「选中」那两句）。 */
  readonly grip: string;
  /** `buttons` 档：这一行还能不能上移（不在第 1 位、自己没锁定、上面那一行也没锁定）。 */
  readonly canUp: boolean;
  /** `buttons` 档：这一行还能不能下移（不在最后一位、自己没锁定、下面那一行也没锁定）。 */
  readonly canDown: boolean;
}

/** 内部类型：`render.ts` 只吃它，不再自己碰 `any`。 */
export interface DragSortModel {
  readonly form: DragSortForm;
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly rows: readonly DragSortRow[];
  readonly total: number;
  /** 拿着的那一行（`lift` 档＝拿起、`buttons` 档＝选中；没拿着＝`undefined`）。 */
  readonly lifted?: { readonly key: string; readonly from: number };
  /** 落点位（1 起；只有拿着态才有意义）。`buttons` 档＝算出来的**预告**落点（0＝挪不动，没有预告）。 */
  readonly dropAt: number;
  /** 状态句（`lift` 档 plain／lifted 的真读数；`buttons` 档不写状态句＝空串）。 */
  readonly status: string;
  /** 空槽句（`lift` 档拿起态才有；`buttons` 档不画空槽＝空串）。 */
  readonly slotText: string;
  /** 落点那句（`lift` 档＝「放这里（第 n 位）」；`buttons` 档＝「落到第 n 位」）。 */
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
      + ' 之一（lift＝拖拽中：拖起行＋原位空槽＋落点粗线；buttons＝按钮排序：选中行＋两半控件＋虚线预告）');
  }
  /** 第二形态（按钮排序）：它与旧档在**屏上写什么**上分家（每行只印自己那一位、没有状态句与空槽）。 */
  const buttons = form === 'buttons';

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
  if (buttons && dropRaw !== undefined) {
    badInput('drag-sort: input.dropAt 只给形态 lift（buttons 档的落点预告是算出来的：'
      + '按选中行还能不能上移推，给了会被静默吞掉）');
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
    /* 三档把手名（文案在 `DRAG_SORT_TEXT` 一处；运行时段烘的是同一份）。第二形态那两句是「选中」口径。 */
    const grip = r.locked
      ? dragSortText('gripLock', { p: pos, why: r.why === undefined ? '' : r.why })
      : buttons
        ? (liftedKey === r.key
          ? dragSortText('gripSelected', { p: pos, label: r.label })
          : dragSortText('gripSelect', { p: pos, label: r.label }))
        : (liftedKey === r.key
          ? dragSortText('gripLift', { p: pos, label: r.label })
          : dragSortText('gripPick', { p: pos, label: r.label }));
    /* 两半控件那两半的可用性：挪得动才可按（自己锁定、或要换过去的那一行锁定＝挪不动）。 */
    const canUp = pos > 1 && !r.locked && !parsed[pos - 2].locked;
    const canDown = pos < total && !r.locked && !parsed[pos].locked;
    return {
      key: r.key, label: r.label, note: r.note, meta: r.meta,
      locked: r.locked, why: r.why, pos,
      posText: buttons
        ? dragSortText('posOne', { p: pos })
        : '第 ' + String(pos) + ' 位，共 ' + String(total) + ' 步',
      grip,
      canUp,
      canDown,
    };
  });

  const lifted = liftedKey === undefined ? undefined : { key: liftedKey, from: liftedIndex + 1 };
  const liftedLabel = lifted === undefined ? '' : parsed[liftedIndex].label;
  /* 第二形态的落点预告**是算出来的**：停在「下一挪会落到的那一位」——还能上移就预告上移的落点
     （第 n−1 位），已经到头了就预告下移的落点（第 2 位），两边都挪不动（相邻都是锁定的行）就没有预告。 */
  const picked = buttons && liftedIndex >= 0 ? rows[liftedIndex] : undefined;
  const previewAt = picked === undefined ? 0
    : picked.canUp ? picked.pos - 1
      : picked.canDown ? picked.pos + 1
        : 0;
  return {
    form: form as DragSortForm,
    id,
    title,
    hint: hintRaw === undefined
      ? (buttons ? dragSortText('buttonsHint', { n: total }) : DRAG_SORT_TEXT.hint)
      : hintRaw,
    rows,
    total,
    lifted,
    dropAt: buttons ? previewAt : dropAt,
    status: buttons
      ? ''
      : (lifted === undefined
        ? dragSortText('idleStatus', { n: total })
        : dragSortText('liftStatus', { from: lifted.from, label: liftedLabel, to: dropAt })),
    slotText: buttons || lifted === undefined
      ? ''
      : dragSortText('slotText', { from: lifted.from, label: liftedLabel }),
    lineText: buttons
      ? (previewAt === 0 ? '' : dragSortText('previewText', { to: previewAt }))
      : (lifted === undefined ? '' : dragSortText('lineText', { to: dropAt })),
    extraClass: optExtraClass(raw.extraClass, 'drag-sort: input.extraClass'),
  };
}
