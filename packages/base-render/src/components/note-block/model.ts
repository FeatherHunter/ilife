/** note-block · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级；
 *   2. **语气说不出「是什么」就是错的**（`tone` 非 `quiet` 而没给 `toneLabel` ⇒ 拒）：色不是唯一信息，
 *      换到把警告色压成墨黑的皮肤上，读者得靠那两个字知道这条备注带着什么；
 *   3. **算得出来的都不许调用方再给**：字数、摘要那一句、收不收起，都是本件算的。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  NOTE_BLOCK_COLLAPSE_CHARS,
  NOTE_BLOCK_ELLIPSIS,
  NOTE_BLOCK_FORMS,
  NOTE_BLOCK_PEEK_CHARS,
  NOTE_BLOCK_TONES,
  type NoteBlockForm,
  type NoteBlockTone,
} from './attrs.js';

/** 归一化后的入参。 */
export interface NoteBlockModel {
  readonly form: NoteBlockForm;
  /** 正文逐段（换行拆开；空行丢掉）。 */
  readonly lines: readonly string[];
  /** 正文总字数（去掉空白的字符数：字数那一格读的就是它）。 */
  readonly length: number;
  readonly tone: NoteBlockTone;
  readonly toneLabel?: string;
  readonly owner?: string;
  readonly time?: string;
  /** 收起时那行摘要（调用方给的，或本件从首行截的）。 */
  readonly peek?: string;
  /** 这一块出不出 `<details>`。 */
  readonly collapsed: boolean;
  readonly attachedTo?: string;
  readonly extraClass?: string;
}

/** 正文 → 逐段（按换行拆；把每段两头的空白去掉；空段丢掉）。 */
function splitLines(text: string): readonly string[] {
  const out: string[] = [];
  for (const raw of text.split(String.fromCharCode(10))) {
    const line = raw.trim();
    if (line !== '') out.push(line);
  }
  return out;
}

/** 首行截一句摘要（**只截摘要**；正文一个字都不许截）。 */
function peekOf(lines: readonly string[]): string {
  const first = lines[0] ?? '';
  return first.length <= NOTE_BLOCK_PEEK_CHARS
    ? first
    : first.slice(0, NOTE_BLOCK_PEEK_CHARS) + NOTE_BLOCK_ELLIPSIS;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `NoteBlockModel`。 */
export function normalizeNoteBlock(input: unknown): NoteBlockModel {
  assertPlainObject(input, 'renderNoteBlock: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? NOTE_BLOCK_FORMS[0] : raw.form;
  if (!(NOTE_BLOCK_FORMS as readonly unknown[]).includes(form)) {
    badInput('note-block: input.form 必须是 ' + NOTE_BLOCK_FORMS.join('／')
      + ' 之一（本件只落地形态 A「竖线备注」；引语形态已砍）');
  }

  const lines = splitLines(reqText(raw.text, 'note-block: input.text'));
  if (lines.length === 0) badInput('note-block: input.text 去掉空白后不许是空');

  const toneGiven: unknown = raw.tone;
  if (toneGiven !== undefined && !(NOTE_BLOCK_TONES as readonly unknown[]).includes(toneGiven)) {
    badInput('note-block: input.tone 必须是 ' + NOTE_BLOCK_TONES.join('／') + ' 之一');
  }
  const tone = (toneGiven ?? 'quiet') as NoteBlockTone;
  const toneLabel = optText(raw.toneLabel, 'note-block: input.toneLabel');
  if (tone !== 'quiet' && toneLabel === undefined) {
    badInput('note-block: tone 是 ' + tone + ' ⇒ toneLabel 必填（色不是唯一信息：这两个字说清这个语气是什么）');
  }

  const length = lines.join('').length;
  const collapseGiven: unknown = raw.collapse;
  if (collapseGiven !== undefined && typeof collapseGiven !== 'boolean') {
    badInput('note-block: input.collapse 必须是 true／false');
  }
  const collapsed = collapseGiven === undefined
    ? length > NOTE_BLOCK_COLLAPSE_CHARS
    : (collapseGiven as boolean);

  return {
    form: form as NoteBlockForm,
    lines,
    length,
    tone,
    toneLabel,
    owner: optText(raw.owner, 'note-block: input.owner'),
    time: optText(raw.time, 'note-block: input.time'),
    peek: optText(raw.summary, 'note-block: input.summary') ?? peekOf(lines),
    collapsed,
    attachedTo: optText(raw.attachedTo, 'note-block: input.attachedTo'),
    extraClass: optExtraClass(raw.extraClass, 'note-block: input.extraClass'),
  };
}
