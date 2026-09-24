/** note-block · **渲染**（纯函数产 HTML；本件只有形态 A「竖线备注」一种骨架）。
 *
 *  —— 形态 A：竖线备注 ——
 *
 *  层次靠三样**零阴影下也成立**的东西：**竖线**（左缘那道）／**缩进**（正文相对归属缩进）／**底色块**（正文自己的软底）。
 *  **砍掉的**：引语形态（一根短横线 ＋ 一句斜体话）——三套皮肤全 2 分，那个骨架不成立。
 *
 *  长备注**默认收起**：走原生 `<details>` ＋ `<summary>`（一行里给归属、时间、字数与一句摘要），
 *  展开是同一段正文 —— 收起时不丢信息（摘要是首行截出来的那句话），也不用脚本。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **正文一个字都不截**（只有摘要那一行会带省略号）；
 *   · **语气非无时必有语气字**（校验在 `model.ts` 拦住，"色不是唯一信息"落在这里）；
 *   · **收起的判断是本件算的**（正文字数 > 阈值，或调用方显式指定）。
 */
import { esc } from '../shared/escape.js';
import {
  NOTE_BLOCK_ATT_PREFIX,
  NOTE_BLOCK_CLASS,
  NOTE_BLOCK_LEN_SUFFIX,
  noteBlockSlot,
} from './attrs.js';
import { normalizeNoteBlock, type NoteBlockModel } from './model.js';

/** 正文：逐段一枚 `<p>`（段间距离由样式承担；标记里不写空行、不写 `<br>`）。 */
function bodyHtml(m: NoteBlockModel): string {
  const parts: string[] = ['<div class="' + noteBlockSlot('body') + '">'];
  for (const line of m.lines) {
    parts.push('<p class="' + noteBlockSlot('line') + '">' + esc(line) + '</p>');
  }
  if (m.attachedTo !== undefined || m.time !== undefined) {
    const att: string[] = [];
    if (m.attachedTo !== undefined) {
      att.push('<span>' + esc(NOTE_BLOCK_ATT_PREFIX + ' ' + m.attachedTo) + '</span>');
    }
    if (m.time !== undefined) att.push('<span class="' + noteBlockSlot('time') + '">' + esc(m.time) + '</span>');
    parts.push('<p class="' + noteBlockSlot('att') + '">' + att.join('') + '</p>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 头上那一排的公共位：归属 ＋ 语气字。 */
function headBits(m: NoteBlockModel): string[] {
  const parts: string[] = [];
  if (m.owner !== undefined) {
    parts.push('<b class="' + noteBlockSlot('owner') + '">' + esc(m.owner) + '</b>');
  }
  if (m.toneLabel !== undefined) {
    parts.push('<span class="' + noteBlockSlot('tone') + '">' + esc(m.toneLabel) + '</span>');
  }
  return parts;
}

/** 形态 A 的骨架：短的直接出；长的套 `<details>`（收起时那一排就是 `<summary>`）。 */
function renderNote(m: NoteBlockModel, extra: string): string {
  const cls = NOTE_BLOCK_CLASS + ' is-' + m.form + ' is-' + m.tone + extra;
  if (!m.collapsed) {
    const head = headBits(m);
    const parts: string[] = ['<div class="' + cls + '">'];
    if (head.length > 0 || m.time !== undefined) {
      parts.push('<p class="' + noteBlockSlot('head') + '">' + head.join('')
        + (m.time === undefined ? '' : '<span class="' + noteBlockSlot('time') + '">' + esc(m.time) + '</span>')
        + '</p>');
    }
    parts.push(bodyHtml(m));
    parts.push('</div>');
    return parts.join('');
  }
  const parts: string[] = ['<details class="' + cls + ' is-collapsed">'];
  parts.push('<summary class="' + noteBlockSlot('head') + '">');
  parts.push('<i class="' + noteBlockSlot('caret') + '" aria-hidden="true"></i>');
  parts.push(headBits(m).join(''));
  if (m.time !== undefined) {
    parts.push('<span class="' + noteBlockSlot('time') + '">' + esc(m.time) + '</span>');
  }
  parts.push('<span class="' + noteBlockSlot('len') + '">' + esc(String(m.length) + NOTE_BLOCK_LEN_SUFFIX) + '</span>');
  if (m.peek !== undefined) {
    parts.push('<span class="' + noteBlockSlot('peek') + '">' + esc(m.peek) + '</span>');
  }
  parts.push('</summary>');
  parts.push(bodyHtml(m));
  parts.push('</details>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；引语形态已砍，分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<NoteBlockModel['form'], (m: NoteBlockModel, extra: string) => string>> = {
  note: renderNote,
};

/** 渲染备注块（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderNoteBlock(input: unknown): string {
  const m = normalizeNoteBlock(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return SKELETONS[m.form](m, extra);
}
