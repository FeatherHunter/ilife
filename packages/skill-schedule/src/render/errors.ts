export class ScheduleRenderError extends Error {
  readonly code: 'SCHEDULE_UNKNOWN_KEY' | 'SCHEDULE_BAD_PAYLOAD' | 'SCHEDULE_SHAPE_MISMATCH' | 'SCHEDULE_TEMPLATE_MISSING' | 'SCHEDULE_MARKER_INVALID' | 'SCHEDULE_HTML_TOO_LARGE';
  constructor(code: ScheduleRenderError['code'], message: string) {
    super(message);
    this.name = 'ScheduleRenderError';
    this.code = code;
  }
}
