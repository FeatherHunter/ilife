export { ScheduleRenderError } from './errors.js';
export { SCHEDULE_KEY_SHAPES, scheduleShapeFor, buildScheduleEnvelope, parseScheduleEnvelope } from './envelope.js';
/** #887 复制区共用件（三格式菜单＋六段日志）：页型的复制区只经这一只，技能侧不搓按钮。 */
export { scheduleCopyArea, scheduleCopyLog, scheduleNowStamp } from './copyArea.js';
export type { ScheduleCopyAreaInput, ScheduleCopyLogInput } from './copyArea.js';
export {
  toRecordItem, buildRecordToday, buildRecordRange, buildRecordDetail, buildRecordReceipt,
  buildRecordCompare, buildCategoryDeep, buildAnomaly, toPlanItem, buildPlanToday,
  buildPlanReceipt, buildHelpItems, HELP_EMPTY_HINT,
} from './views.js';
export type { RecordItem, PlanItem, HelpItem } from './views.js';
export {
  SCHEDULE_HTML_MAX_BYTES, escapeHtml, renderEnvelopeHtml, estimateBytes, assertHtmlSize,
} from './html.js';
// 共用位（定义地在 src/shared/templateFill.ts）：转发保留，快照门读本文件的导出。
export { SHARED_CSS, SHARED_HELPERS, fillTemplate } from '../shared/templateFill.js';
export { SCHEDULE_TEMPLATES, templateFor, loadTemplate } from './templates.js';
export type { ScheduleTemplate } from './templates.js';
