// 渲染层·模板装载：8 模板随包发布；未知/缺失大声失败。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScheduleRenderError } from './errors.js';

export const SCHEDULE_TEMPLATES = [
  'record_day',
  'record_range',
  'record_detail',
  'record_receipt',
  'record_compare',
  'plan_day',
  'plan_receipt',
  'help',
] as const;
export type ScheduleTemplate = (typeof SCHEDULE_TEMPLATES)[number];

// key → 模板（compare 家族共用 record_compare；write 家族用 receipt 模板）。
export function templateFor(key: string): ScheduleTemplate {
  switch (key) {
    case 'schedule.record.today': return 'record_day';
    case 'schedule.record.range': return 'record_range';
    case 'schedule.record.detail': return 'record_detail';
    case 'schedule.record.write': return 'record_receipt';
    case 'schedule.record.compare': return 'record_compare';
    case 'schedule.plan.today': return 'plan_day';
    case 'schedule.plan.write': return 'plan_receipt';
    case 'schedule.help.lookup': return 'help';
    default: throw new ScheduleRenderError('SCHEDULE_UNKNOWN_KEY', '无模板映射：' + key);
  }
}

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

export function loadTemplate(name: string): string {
  if (!SCHEDULE_TEMPLATES.includes(name as ScheduleTemplate)) {
    throw new ScheduleRenderError('SCHEDULE_TEMPLATE_MISSING', '未知模板：' + name);
  }
  try { return readFileSync(join(templatesDir, name + '.html'), 'utf8'); }
  catch (e) { throw new ScheduleRenderError('SCHEDULE_TEMPLATE_MISSING', '模板缺失：' + name); }
}
