// 渲染层错误：坏 key/形状/载荷/超体积/缺模板一律 throw（fallback 形状是唯一的显式降级通道）。
export class HomeRenderError extends Error {
  readonly code:
    | 'HOME_UNKNOWN_KEY' | 'HOME_SHAPE_MISMATCH' | 'HOME_BAD_PAYLOAD'
    | 'HOME_HTML_TOO_LARGE' | 'HOME_TEMPLATE_MISSING' | 'HOME_MARKER_INVALID';
  constructor(code: HomeRenderError['code'], message: string) {
    super(message);
    this.name = 'HomeRenderError';
    this.code = code;
  }
}
