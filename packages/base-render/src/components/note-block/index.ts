/** note-block · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五个运行名：`renderNoteBlock(input)`（产标记，零 DOM）／`noteBlockCss()`（样式段）／
 *  形态闭集 `NOTE_BLOCK_FORMS`（只落地形态 A「竖线备注」；**引语形态已砍**）／
 *  语气闭集 `NOTE_BLOCK_TONES`／类名根 `NOTE_BLOCK_CLASS`。
 *  另出四个几何／口径事实与三个类型名（入参面）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  NOTE_BLOCK_ATT_PREFIX,
  NOTE_BLOCK_CLASS,
  NOTE_BLOCK_COLLAPSE_CHARS,
  NOTE_BLOCK_ELLIPSIS,
  NOTE_BLOCK_FORMS,
  NOTE_BLOCK_LEN_SUFFIX,
  NOTE_BLOCK_PEEK_CHARS,
  NOTE_BLOCK_TONES,
} from './attrs.js';
export type { NoteBlockForm, NoteBlockInput, NoteBlockTone } from './attrs.js';
export { renderNoteBlock } from './render.js';
export { NOTE_BLOCK_INDENT_PX, NOTE_BLOCK_RULE_PX, NOTE_BLOCK_TOUCH_PX, noteBlockCss } from './style.js';
