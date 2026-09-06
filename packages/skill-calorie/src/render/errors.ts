/** T9 #28 · 目标分析盘渲染错误：缺失阻断不返空，坏输入一律抛。
 *
 * 缺席/空窗/无目标/无结果即 missing-data（调用方走 fallback，不静默空页）。
 */
export type CalorieRenderErrorCode = 'missing-data' | 'bad-input' | 'precision-leak';

export class CalorieRenderError extends Error {
  readonly code: CalorieRenderErrorCode;
  constructor(code: CalorieRenderErrorCode, message: string) {
    super(message);
    this.name = 'CalorieRenderError';
    this.code = code;
  }
}
