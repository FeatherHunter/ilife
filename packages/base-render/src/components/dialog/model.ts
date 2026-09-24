/** dialog · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」。
 *   2. **`id` 是回路的一部分**：触发键靠它找面板、`aria-labelledby` 靠它指标题，
 *      所以只许**标识符字符**（字母／数字／下划线／连字符／汉字）：带上 `.`／`#`／空白会让
 *      `getElementById` 与 CSS 锚名（`--ilife-dialog-<id>`）两头说不到一块去。
 *   3. **正文一段一条**：串＝一段；数组＝逐段一枚 `<p>`；**空段是错**（空段读起来像渲染坏了）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  DIALOG_FORMS, DIALOG_STATUS_KINDS, DIALOG_TONES,
  type DialogAction, type DialogForm, type DialogInput, type DialogStatusKind, type DialogTone,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」或空数组）。 */
export interface DialogModel {
  readonly id: string;
  readonly form: DialogForm;
  readonly title: string;
  readonly sub?: string;
  readonly body: readonly string[];
  readonly tone: DialogTone;
  readonly actions: readonly DialogAction[];
  readonly note?: string;
  readonly status?: { readonly kind: DialogStatusKind; readonly text: string };
  readonly open: boolean;
  readonly extraClass?: string;
}

/** `id` 的字面口径（唯一一处）：标识符字符，且首字符不是连字符／数字之外的标点。 */
const ID_RE = /^[A-Za-z0-9_\u00a0-\uffff][A-Za-z0-9_-\u00a0-\uffff]*$/;

/** `id` 校验（面板 `id`、锚名 `--ilife-dialog-<id>` 两头共用同一个串 ⇒ 这里的口径就是它们的口径）。 */
export function reqDialogId(value: unknown, field: string): string {
  const id = reqText(value, field);
  if (!ID_RE.test(id)) {
    badInput(field + ' 只许标识符字符（字母／数字／下划线／连字符／汉字）：' + id);
  }
  return id;
}

/** 串或串数组 → 段数组；至少一段，且段里不许有空串。 */
function reqParagraphs(value: unknown, field: string): readonly string[] {
  if (typeof value === 'string') return [reqText(value, field)];
  if (!Array.isArray(value)) badInput(field + ' 必须是字符串，或字符串数组（逐段一枚 <p>）');
  if (value.length === 0) badInput(field + ' 至少给一段');
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) out.push(reqText(value[i], field + '[' + i + ']'));
  return out;
}

/** 动作键：1～2 枚，逐枚校验，`value` 面板内唯一。 */
function reqActions(value: unknown): readonly DialogAction[] {
  if (!Array.isArray(value)) badInput('dialog: input.actions 必须是数组');
  if (value.length === 0) badInput('dialog: input.actions 至少一枚动作');
  if (value.length > 2) badInput('dialog: input.actions 最多两枚（形态 A「确认型」：次要 ＋ 主要）');
  const seen = new Set<string>();
  const out: DialogAction[] = [];
  for (let i = 0; i < value.length; i += 1) {
    assertPlainObject(value[i], 'dialog: input.actions[' + i + ']');
    const raw = value[i] as Record<string, unknown>;
    const item: DialogAction = {
      label: reqText(raw.label, 'dialog: input.actions[' + i + '].label'),
      value: reqText(raw.value, 'dialog: input.actions[' + i + '].value'),
    };
    if (seen.has(item.value)) badInput('dialog: actions 的 value 必须唯一：' + item.value);
    seen.add(item.value);
    out.push(item);
  }
  return out;
}

/** 状态行：给了就必带非空文字；档位在闭集内。 */
function optStatus(value: unknown): DialogModel['status'] {
  if (value === undefined) return undefined;
  assertPlainObject(value, 'dialog: input.status');
  const raw = value as Record<string, unknown>;
  const kind = raw.kind === undefined ? DIALOG_STATUS_KINDS[0] : raw.kind;
  if (!(DIALOG_STATUS_KINDS as readonly unknown[]).includes(kind)) {
    badInput('dialog: input.status.kind 必须是 ' + DIALOG_STATUS_KINDS.join('／') + ' 之一');
  }
  return { kind: kind as DialogStatusKind, text: reqText(raw.text, 'dialog: input.status.text') };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `DialogModel`，不再自己碰 `any`。 */
export function normalizeDialog(input: unknown): DialogModel {
  assertPlainObject(input, 'renderDialog: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? DIALOG_FORMS[0] : raw.form;
  if (!(DIALOG_FORMS as readonly unknown[]).includes(form)) {
    badInput('dialog: input.form 必须是 ' + DIALOG_FORMS.join('／') + ' 之一（本件只落地形态 A「确认型」）');
  }
  const tone = raw.tone === undefined ? 'danger' : raw.tone;
  if (!(DIALOG_TONES as readonly unknown[]).includes(tone)) {
    badInput('dialog: input.tone 必须是 ' + DIALOG_TONES.join('／') + ' 之一');
  }
  if (raw.open !== undefined && typeof raw.open !== 'boolean') {
    badInput('dialog: input.open 必须是布尔值');
  }

  return {
    id: reqDialogId(raw.id, 'dialog: input.id'),
    form: form as DialogForm,
    title: reqText(raw.title, 'dialog: input.title'),
    sub: optText(raw.sub, 'dialog: input.sub'),
    body: reqParagraphs(raw.body, 'dialog: input.body'),
    tone: tone as DialogTone,
    actions: reqActions(raw.actions),
    note: optText(raw.note, 'dialog: input.note'),
    status: optStatus(raw.status),
    open: raw.open === true,
    extraClass: optExtraClass(raw.extraClass, 'dialog: input.extraClass'),
  };
}

/** 触发键入参归一化（`renderDialogOpener` 的唯一入口）。 */
export interface DialogOpenerModel {
  readonly dialogId: string;
  readonly text: string;
  readonly label?: string;
  readonly extraClass?: string;
}

export function normalizeDialogOpener(input: unknown): DialogOpenerModel {
  assertPlainObject(input, 'renderDialogOpener: input');
  const raw = input as Record<string, unknown>;
  return {
    dialogId: reqDialogId(raw.dialogId, 'dialog: input.dialogId'),
    text: reqText(raw.text, 'dialog: input.text'),
    label: optText(raw.label, 'dialog: input.label'),
    extraClass: optExtraClass(raw.extraClass, 'dialog: input.extraClass'),
  };
}

export type { DialogInput };
