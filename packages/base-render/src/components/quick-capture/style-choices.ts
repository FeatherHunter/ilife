/** quick-capture · **样式段（候选带 ＋ 记过的那一条带）**：一格摊开后的候选、「不改」、记过的每一条。
 *
 *  为什么单独立一份：`style.ts` 超了本包的行数告警线（350 行），按先例
 *  （`scatter-fit/style-forms.ts`、`relation-picker/style-list.ts`）把这一族拆出去——
 *  「能改成什么」与「记过的」两处都由调用方给数据、跟「写的那一行」「认出来的几格」各改各的。
 *  这一份**仍是本件样式段的一部分**：判据侧一律经 `test/_style-sources.mjs` 的 `styleSources()` 扫全。
 *
 *  只经 `skinVar()` 读皮肤、全部规则 scope 在 `.<prefix>page-ui` 之下、零 `:root`／`!important`／新 token、
 *  候选名**永不截断**（这一份里没有 `text-overflow`／`line-clamp`／`nowrap`）。
 */
import { skinVar } from '../skin/contract.js';
import {
  QUICK_CAPTURE_GAP_PX,
  QUICK_CAPTURE_TICK,
  QUICK_CAPTURE_TICK_PX,
  QUICK_CAPTURE_TOUCH_PX,
  quickCaptureSlot,
  type QuickCaptureSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 候选带与「记过的」那一族的样式（由 `style.ts` 按前缀汇总）。 */
export function quickCaptureChoicesCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** **槽类名**（带点、不带 scope）：只许用在**同一条选择器的后半截**（如 `.a .b` 里的 `.b`）。 */
  const sc = (slot: QuickCaptureSlot): string => '.' + quickCaptureSlot(slot, p);
  /** **带 scope 的完整选择器**（一条规则打头用；逗号列表里每一段都用它）。 */
  const s = (slot: QuickCaptureSlot): string => root + ' ' + sc(slot);
  const touch = String(QUICK_CAPTURE_TOUCH_PX) + 'px';

  return [
    '/* quick-capture 候选带与「记过的」（`style-choices.ts`）：一格摊开后的候选、「不改」、记过的每一条。 */',
    '/* 某一格的候选带：摊开时**整条占满一行**（它住在那一格下面，不跟同排的格挤在一起）。',
    '   收起＝`hidden`（一屏只留一层话：一次只摊开一格）。 */',
    s('tray') + ' {',
    '  flex: 1 1 100%;',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: ' + String(QUICK_CAPTURE_GAP_PX) + 'px;',
    '  min-width: 0;',
    '}',
    '/* **收起必须真的收起**：作者层的 `display: flex` 会盖掉浏览器默认那条 `[hidden] { display: none }`',
    '   （作者规则赢过 UA 规则）——不补这一条，四条候选带会一直摊在屏上（2026-09-25 由变异自证读出：',
    '   把格与格的缝压到 2px，四档几何里那条缝的判据却照绿——因为屏上根本没在量那一格）。 */',
    s('tray') + '[hidden] {',
    '  display: none;',
    '}',
    '/* 一枚候选：纸面 ＋ 发丝线边；现在这一格认成的就是它 ⇒ 软底 ＋ 主色字 ＋ 主色描边 ＋ 勾。 */',
    s('pick') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 4px;',
    '  min-height: ' + touch + ';',
    '  padding: 0 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* **勾选槽位固定**（未选也留这么宽）：勾上时不把候选名顶歪，一排候选的左右沿才齐平。 */',
    s('pick') + '::before {',
    '  content: "";',
    '  display: inline-block;',
    '  width: ' + String(QUICK_CAPTURE_TICK_PX) + 'px;',
    '  flex: 0 0 auto;',
    '  text-align: center;',
    '  color: ' + skinVar('accent') + ';',
    '}',
    s('pick') + '.is-on {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-weight: 700;',
    '}',
    s('pick') + '.is-on::before {',
    '  content: "' + QUICK_CAPTURE_TICK + '";',
    '  font-weight: 700;',
    '}',
    '/* 「不改」＝取消那一枚（次动作：无底、只有字与发丝线框）。 */',
    s('keep') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-height: ' + touch + ';',
    '  padding: 0 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '}',
    '/* 「记过的」那一条带：点一条＝把那句话填回输入框（不用打字也能换一句话）。 */',
    s('recent') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: ' + String(QUICK_CAPTURE_GAP_PX) + 'px;',
    '  padding: 10px 14px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  min-width: 0;',
    '}',
    s('lb') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    '/* 记过的一条：**点它＝把那句话填回输入框**（不用打字也能换一句话）。 */',
    s('recall') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  min-height: ' + touch + ';',
    '  padding: 0 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '  overflow-wrap: anywhere;',
    '}',
  ].join(LF);
}
