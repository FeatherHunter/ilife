export class ChefRenderError extends Error {
  readonly code:
    | 'CHEF_UNKNOWN_KEY' | 'CHEF_BAD_PAYLOAD' | 'CHEF_SHAPE_MISMATCH'
    | 'CHEF_TEMPLATE_MISSING' | 'CHEF_MARKER_INVALID' | 'CHEF_HTML_TOO_LARGE';
  constructor(code: ChefRenderError['code'], message: string) {
    super(message);
    this.name = 'ChefRenderError';
    this.code = code;
  }
}
