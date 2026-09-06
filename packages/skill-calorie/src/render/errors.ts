/** T8 #27 + T9 #28 + T10 #29 · 渲染错误：缺失阻断不返空，坏输入与精度泄漏一律抛。
 *
 * 缺席/空窗/无目标（含无目标行/无结果）即 missing-data（调用方走 fallback，不静默空页）。
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
