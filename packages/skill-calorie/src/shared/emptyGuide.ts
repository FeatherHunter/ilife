/** #422 · 空态指引（技能层共用件）：把「图标 ＋ 原因 ＋ 下一句能说的话」收成一个帮助函数。
 *
 * 老实物出处：力量件 `exercise_strength.html:100`／有氧件 `exercise_cardio.html:91` 那两处
 * 「空页把下一句能说的话递到用户眼前」的 `emptyState`（融合设计 §一.11）。
 * 新仓的**空态构件**只有一个定义地（公共层 `renderEmptyState` ／区块 `renderEmptyBlock`），
 * 本件不复制结构、不加样式，只把三件套收成必填三参数：
 *
 *   - 图标、原因句、下一句话**都由调用方给**——缺一即报错；
 *   - 本件不设任何跨域默认文案（不许出现「暂无数据」这类别域口径的兜底句）。
 */
import { renderEmptyBlock } from 'base-paint/blocks';
import { CalorieRenderError } from '../render/errors.js';

/** 空态指引入参：三件套必填（图标／原因／下一句）。 */
export interface EmptyGuideInput {
  readonly icon: string;
  readonly text: string;
  readonly hint: string;
}

function reqText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CalorieRenderError('bad-input', field + ' 必须是非空字符串（空态文案一律由调用方给）');
  }
  return value;
}

/** 空态指引：图标 ＋ 原因 ＋ 下一句能说的话（文案全由调用方给）。 */
export function emptyGuide(input: EmptyGuideInput): string {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new CalorieRenderError('bad-input', 'emptyGuide: input 必须是对象');
  }
  const guide = input as EmptyGuideInput;
  return renderEmptyBlock({
    icon: reqText(guide.icon, 'emptyGuide: input.icon'),
    text: reqText(guide.text, 'emptyGuide: input.text'),
    hint: reqText(guide.hint, 'emptyGuide: input.hint'),
  });
}
