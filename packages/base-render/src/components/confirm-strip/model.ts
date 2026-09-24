/** confirm-strip · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」：
 *      猜出来的确认条会让用户按下一个不知道后果的按钮；
 *   2. **说不清就报错**：「删几条」与「列出几条」对不上、说了不可撤销又给撤销入口、
 *      禁用而不说为什么 —— 这三种自相矛盾一律当场拦下（它们正是这一件要替掉的错法）；
 *   3. 归一化只做「形状」：危险按钮的字、题面、状态行都**由本件拼**（不交给调用方各写一套），
 *      调用方给的原文（名称、旁证、值、撤销说明）一律逐字上屏。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  CONFIRM_STRIP_BACKUP_DEFAULT,
  CONFIRM_STRIP_BARE_WORDS,
  CONFIRM_STRIP_FORMS,
  CONFIRM_STRIP_KEEP_DEFAULT,
  CONFIRM_STRIP_LOSS_DEFAULT,
  CONFIRM_STRIP_STATES,
  CONFIRM_STRIP_UNIT_DEFAULT,
  type ConfirmStripForm,
  type ConfirmStripState,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或缺省值）。 */
export interface ConfirmStripModel {
  readonly form: ConfirmStripForm;
  readonly state: ConfirmStripState;
  /** 危险动词（原样）。 */
  readonly dangerVerb: string;
  /** 条数（整数 ≥1，且与 `items` 的条数相等）。 */
  readonly count: number;
  /** 量词。 */
  readonly unit: string;
  /** 题面（缺省由本件拼）。 */
  readonly title: string;
  /** 徽标字：`可撤销`／`不可撤销`（**用字说出能不能撤销**）。 */
  readonly badge: string;
  /** 危险按钮的字：`<动词>这 <条数> <量词>`。 */
  readonly dangerLabel: string;
  /** 要删掉的每一条。 */
  readonly items: readonly { readonly name: string; readonly meta?: string; readonly value?: string }[];
  /** 能不能撤销。 */
  readonly undoable: boolean;
  /** 后果话的**前半句**：`可以撤销`／`不能撤销`（样式把它加粗上色，**危险档的第二种手段**）。 */
  readonly noteLead: string;
  /** 后果话的后半句：撤销入口与保留期／不可撤销的后果。 */
  readonly noteTail: string;
  /** 状态行：`rest` 时是空串（**行仍占位** ⇒ 切状态不跳版）。 */
  readonly status: string;
  /** 安全按钮的字。 */
  readonly keepLabel: string;
  /** 备份复选项文字（不给＝不出这一行）。 */
  readonly backupLabel?: string;
  readonly extraClass?: string;
}

/** 单条记录：名称必填，旁证与值可选（**不给的槽一个字都不出**）。 */
function reqItems(value: unknown): ConfirmStripModel['items'] {
  if (!Array.isArray(value) || value.length === 0) {
    badInput('confirm-strip: input.items 必须是非空数组（说不出删哪几条，就不该有这一问）');
  }
  return value.map((raw, i) => {
    assertPlainObject(raw, 'confirm-strip: input.items[' + i + ']');
    const o = raw as { name?: unknown; meta?: unknown; value?: unknown };
    return {
      name: reqText(o.name, 'confirm-strip: input.items[' + i + '].name'),
      meta: optText(o.meta, 'confirm-strip: input.items[' + i + '].meta'),
      value: optText(o.value, 'confirm-strip: input.items[' + i + '].value'),
    };
  });
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `ConfirmStripModel`，不再自己碰 `any`。 */
export function normalizeConfirmStrip(input: unknown): ConfirmStripModel {
  assertPlainObject(input, 'renderConfirmStrip: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? CONFIRM_STRIP_FORMS[0] : raw.form;
  if (!(CONFIRM_STRIP_FORMS as readonly unknown[]).includes(form)) {
    badInput('confirm-strip: input.form 必须是 ' + CONFIRM_STRIP_FORMS.join('／') + ' 之一'
      + '（本件只落地形态 A「清单式：把要删的列出来」）');
  }
  const state: unknown = raw.state === undefined ? CONFIRM_STRIP_STATES[0] : raw.state;
  if (!(CONFIRM_STRIP_STATES as readonly unknown[]).includes(state)) {
    badInput('confirm-strip: input.state 必须是 ' + CONFIRM_STRIP_STATES.join('／') + ' 之一：' + String(state));
  }

  /* 危险动词：动词打头、不是空词、不带空白 —— 这三条合起来才保证按钮上写着「会怎样」。 */
  const dangerVerb = reqText(raw.dangerVerb, 'confirm-strip: input.dangerVerb');
  if ((CONFIRM_STRIP_BARE_WORDS as readonly string[]).includes(dangerVerb)) {
    badInput('confirm-strip: input.dangerVerb 不许是空词「' + dangerVerb + '」——'
      + '它不回答「按下去会怎样」，请给动词（如「删掉」「永久删除」）');
  }
  if (/\s/.test(dangerVerb)) badInput('confirm-strip: input.dangerVerb 不许带空白：' + dangerVerb);

  const count: unknown = raw.count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
    badInput('confirm-strip: input.count 必须是整数且 ≥1（删几条是这一件的要害之一）');
  }
  const items = reqItems(raw.items);
  if (items.length !== count) {
    badInput('confirm-strip: input.items 有 ' + items.length + ' 条，input.count 写 ' + count
      + ' —— 两者必须相等（「删几条」与「列出几条」对不上，就是这一件要替掉的错法）');
  }

  const undoable: unknown = raw.undoable;
  if (typeof undoable !== 'boolean') badInput('confirm-strip: input.undoable 必须是布尔（能不能撤销必须表态）');
  if (undoable === true && raw.undoHint === undefined) {
    badInput('confirm-strip: undoable=true 时 input.undoHint 必填（说得出「去哪儿撤销、保留多久」才算可撤销）');
  }
  if (undoable === false && raw.undoHint !== undefined) {
    badInput('confirm-strip: undoable=false 时不许给 input.undoHint（说了不能撤销又给撤销入口）');
  }
  if (undoable === true && raw.loss !== undefined) {
    badInput('confirm-strip: undoable=true 时不许给 input.loss（那是不可撤销档的后果话）');
  }
  const undoHint = optText(raw.undoHint, 'confirm-strip: input.undoHint');
  const loss = optText(raw.loss, 'confirm-strip: input.loss');

  if (state === 'disabled' && raw.disabledHint === undefined) {
    badInput('confirm-strip: state=disabled 时 input.disabledHint 必填（禁用了就要说清为什么）');
  }
  if (state !== 'disabled' && raw.disabledHint !== undefined) {
    badInput('confirm-strip: input.disabledHint 只对 state=disabled 有效（其余状态给了就是多余）');
  }
  const disabledHint = optText(raw.disabledHint, 'confirm-strip: input.disabledHint');

  if (raw.backup !== undefined && raw.backup !== true && raw.backup !== false) {
    badInput('confirm-strip: input.backup 必须是布尔');
  }
  if (raw.backupLabel !== undefined && raw.backup !== true) {
    badInput('confirm-strip: 给了 input.backupLabel 就要同时给 input.backup: true（措辞只在那一项存在时才有用）');
  }
  const backupLabel = raw.backup === true
    ? (optText(raw.backupLabel, 'confirm-strip: input.backupLabel') ?? CONFIRM_STRIP_BACKUP_DEFAULT)
    : undefined;

  const unit = optText(raw.unit, 'confirm-strip: input.unit') ?? CONFIRM_STRIP_UNIT_DEFAULT;
  const title = optText(raw.title, 'confirm-strip: input.title')
    ?? '要' + dangerVerb + '这 ' + String(count) + ' ' + unit + '吗？';
  const status = state === 'busy'
    ? '正在' + dangerVerb + '这 ' + String(count) + ' ' + unit + '…'
    : (disabledHint ?? '');

  return {
    form: form as ConfirmStripForm,
    state: state as ConfirmStripState,
    dangerVerb,
    count,
    unit,
    title,
    badge: undoable ? '可撤销' : '不可撤销',
    dangerLabel: dangerVerb + '这 ' + String(count) + ' ' + unit,
    items,
    undoable,
    noteLead: undoable ? '可以撤销' : '不能撤销',
    noteTail: undoable ? (undoHint as string) : (loss ?? CONFIRM_STRIP_LOSS_DEFAULT),
    status,
    keepLabel: optText(raw.keepLabel, 'confirm-strip: input.keepLabel') ?? CONFIRM_STRIP_KEEP_DEFAULT,
    backupLabel,
    extraClass: optExtraClass(raw.extraClass, 'confirm-strip: input.extraClass'),
  };
}
