/** note-block · **样式段**（本件唯一的样式来源）。**重做件**：层次不许靠投影与圆角。
 *
 *  四条重做口径（`重做设计口径.md` §0）逐条落在这一段里：
 *   ① 该件没有"占位物"；
 *   ② **状态除色之外还有第二样**：语气档有**语气字**（由标记带出）＋ 竖线**粗细／虚实**（非语气档是细实线，
 *      warn／danger 是粗实线＋底色块）——换到把警告色压成墨黑的皮肤，读者仍分得开；
 *   ③ **零阴影下层次仍在**：竖线（左缘）＋ 缩进（正文相对归属）＋ 底色块（正文自己的软底）三样都不用投影；
 *   ④ **骨架对得上这类数据**：一段「当时为什么这么记」的话——竖线块就是这类数据的形状（引语形态已砍）。
 *
 *  交互（`<details>` 展开／收起是原生行为，无需运行时）：rest／`:hover`（包在设备能力查询里）／
 *  `:active`／`:focus-visible` 四档逐条给出；`disabled`／`loading`／`error` **原生 `<details>` 没有这三态**
 *  （它不提交、不加载、也不出错）——不硬造。
 *
 *  纪律：只经 `skinVar()` 读皮肤；scope 在 `.<prefix>page-ui` 之下；零 `:root`／`!important`；
 *  宽度只许容器判（`@container`），媒体查询只判设备能力。
 */
import { skinVar } from '../skin/contract.js';
import { noteBlockSlot, type NoteBlockSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 竖线宽度（px）：语气档把它加粗——**这是「色之外的第二样」在形状上的落点**。 */
export const NOTE_BLOCK_RULE_PX = 3;
/** 正文相对归属的缩进（px）。 */
export const NOTE_BLOCK_INDENT_PX = 12;
/** 收起时那一排的命中下限（px）：`<summary>` 是触控目标，不得小过它。 */
export const NOTE_BLOCK_TOUCH_PX = 44;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function noteBlockCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-note-block';
  const slotSel = (s: NoteBlockSlot): string => '.' + noteBlockSlot(s, p);
  const s = (slot: NoteBlockSlot): string => root + ' ' + slotSel(slot);

  return [
    '/* note-block（备注块 · 形态 A「竖线备注」）：层次＝竖线 ＋ 缩进 ＋ 底色块。',
    '   **重做件**：引语形态（一根短横线 ＋ 一句斜体话）三套皮肤全 2 分，已砍；',
    '   留下的这三样在**零阴影、零圆角**下都成立——层次不靠"浮起来"。 */',
    box + ' {',
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  padding: 2px 0 2px ' + String(NOTE_BLOCK_INDENT_PX) + 'px;',
    '  border-left: 1px solid ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.7;',
    '}',
    '/* 语气：竖线加粗 ＋ 底色块换档（**色之外还有"粗"这一样**）。 */',
    box + '.is-warn {',
    '  border-left-width: ' + String(NOTE_BLOCK_RULE_PX) + 'px;',
    '  border-left-color: ' + skinVar('warn') + ';',
    '}',
    box + '.is-danger {',
    '  border-left-width: ' + String(NOTE_BLOCK_RULE_PX) + 'px;',
    '  border-left-color: ' + skinVar('danger') + ';',
    '}',
    box + '.is-warn ' + slotSel('body') + ' { background: ' + skinVar('warn-soft') + '; }',
    box + '.is-danger ' + slotSel('body') + ' { background: ' + skinVar('danger-soft') + '; }',
    box + '.is-warn ' + slotSel('tone') + ' { color: ' + skinVar('warn') + '; border-color: ' + skinVar('warn') + '; }',
    box + '.is-danger ' + slotSel('tone') + ' { color: ' + skinVar('danger') + '; border-color: ' + skinVar('danger') + '; }',
    '/* 头上那一排（归属／时间／语气字／字数／摘要）：逐段一枚 span、段间只靠列距。 */',
    s('head') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 10px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    s('owner') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '}',
    s('time') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 语气字：带一圈发丝线的小牌（**零阴影下的边界**），色只是第三样。 */',
    s('tone') + ' {',
    '  flex: none;',
    '  padding: 0 6px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-weight: 700;',
    '}',
    s('len') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '/* 摘要那一行：**只有它带省略号**（正文一个字都不截）。 */',
    s('peek') + ' {',
    '  flex: 1 1 100%;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 正文块：缩进 ＋ 软底（第三样层次手段）。 */',
    s('body') + ' {',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  padding: 10px 12px;',
    '  box-sizing: border-box;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '}',
    s('line') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 归属行：正文末尾那一行（前导号由样式画，标记里不写分隔符）。 */',
    s('att') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 8px;',
    '  margin: 0;',
    '  padding-top: 6px;',
    '  min-width: 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 收起那一排是触控目标：命中小不了 ' + String(NOTE_BLOCK_TOUCH_PX) + 'px；',
    '   展开三角的旋转只动 transform，减动效档下直接不转。 */',
    box + ' > ' + slotSel('head') + ' {',
    '  min-height: ' + String(NOTE_BLOCK_TOUCH_PX) + 'px;',
    '  box-sizing: border-box;',
    '  padding: 8px 0;',
    '  cursor: pointer;',
    '  list-style: none;',
    '}',
    box + ' > ' + slotSel('head') + '::-webkit-details-marker { display: none; }',
    s('caret') + ' {',
    '  flex: none;',
    '  align-self: center;',
    '  width: 0;',
    '  height: 0;',
    '  border-left: 6px solid ' + skinVar('ink-3') + ';',
    '  border-top: 5px solid transparent;',
    '  border-bottom: 5px solid transparent;',
    '  transition: transform .18s ease;',
    '}',
    box + '[open] > ' + slotSel('head') + ' > ' + slotSel('caret') + ' { transform: rotate(90deg); }',
    box + ' > ' + slotSel('head') + ':active { opacity: .9; }',
    box + ' > ' + slotSel('head') + ':focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* hover 只判设备能力；它**不是唯一通路**——`<summary>` 本来就能点、能用键盘开（原生行为），',
    '   rest 态也没有把"这里能展开"藏起来（三角 ＋ 摘要都在）。 */',
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + box + ' > ' + slotSel('head') + ':hover { background: ' + skinVar('surface-2') + '; }',
    '}',
    '@media (prefers-reduced-motion:reduce) {',
    '  ' + s('caret') + ' { transition: none; }',
    '}',
    '/* 窄容器：正文内距收一档（判的是本件自己的宽度，不是视口宽度）。 */',
    '@container (max-width: 360px) {',
    '  ' + s('body') + ' { padding: 8px 10px; }',
    '}',
  ].join(LF);
}
