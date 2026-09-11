export class BillRenderError extends Error {
  readonly code:
    | 'BILL_UNKNOWN_KEY' | 'BILL_BAD_PAYLOAD' | 'BILL_SHAPE_MISMATCH'
    | 'BILL_TEMPLATE_MISSING' | 'BILL_MARKER_INVALID' | 'BILL_HTML_TOO_LARGE'
    | 'BILL_HELP_MISSING_DATA';
  constructor(code: BillRenderError['code'], message: string) {
    super(message);
    this.name = 'BillRenderError';
    this.code = code;
  }
}
