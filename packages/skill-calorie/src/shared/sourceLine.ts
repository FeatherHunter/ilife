/** #422 · 来源脚注（技能层共用件）：读页与回执页共用的一句
 *  「数据来源 · <来源> · 起 → 止 · 共 N 条」。
 *
 * 老实物出处：汇总件 `exercise_summary.html:217` 的「📊 数据来源 · 起 → 止 · N 条」；
 * 回执老件缺这一行（`crud_receipt.html` 的 `.footer` 只有按钮），融合时给回执页补上，
 * 故本件是**两族共用**的那一处。
 *
 * 版面：走公共层 #420 的口径说明行 `renderCaliberLine`（`ilife-block-caliber`，12px `--fg2`），
 * 本件不写色、不写字号——版面单源住 `packages/base-render/`。
 */
import { renderCaliberLine } from 'base-paint/blocks';
import { CalorieRenderError } from '../render/errors.js';

/** 来源脚注入参：`source` 不给／空串即只印窗口与条数（老件缺来源时的那种写法）。 */
export interface SourceLineInput {
  readonly source: string;
  readonly start: string;
  readonly end: string;
  readonly count: number;
}

function reqText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CalorieRenderError('bad-input', field + ' 必须是非空字符串（本件不给默认窗口）');
  }
  return value;
}

/** 来源脚注：`数据来源 · 来源 · 起 → 止 · 共 N 条`。 */
export function sourceLine(input: SourceLineInput): string {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new CalorieRenderError('bad-input', 'sourceLine: input 必须是对象');
  }
  const line = input as SourceLineInput;
  const start = reqText(line.start, 'sourceLine: input.start');
  const end = reqText(line.end, 'sourceLine: input.end');
  if (!Number.isInteger(line.count) || line.count < 0) {
    throw new CalorieRenderError('bad-input', 'sourceLine: input.count 须为非负整数');
  }
  const parts: string[] = ['数据来源'];
  if (typeof line.source === 'string' && line.source.trim() !== '') parts.push(line.source.trim());
  parts.push(start + ' → ' + end);
  parts.push('共 ' + line.count + ' 条');
  return renderCaliberLine(parts.join(' · '));
}
