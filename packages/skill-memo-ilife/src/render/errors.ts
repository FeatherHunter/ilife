// 渲染层错误：坏 key/形状/载荷/超体积/缺模板一律 throw（fallback 形状是唯一的显式降级通道）。
export class MemoRenderError extends Error {
  readonly code:
    | 'MEMO_UNKNOWN_KEY' | 'MEMO_SHAPE_MISMATCH' | 'MEMO_BAD_PAYLOAD'
    | 'MEMO_HTML_TOO_LARGE' | 'MEMO_TEMPLATE_MISSING' | 'MEMO_MARKER_INVALID';
  constructor(code: MemoRenderError['code'], message: string) {
    super(message);
    this.name = 'MemoRenderError';
    this.code = code;
  }
}
