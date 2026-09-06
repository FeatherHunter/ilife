// 渲染层·模板装载：16 模板随包发布；未知/缺失大声失败。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BillRenderError } from './errors.js';

export const BILL_TEMPLATES = [
  'record_add',
  'record_update',
  'record_today',
  'record_range',
  'record_search',
  'record_detail',
  'analysis_overview',
  'analysis_compare',
  'analysis_trend',
  'goal_write',
  'goal_query',
  'account_write',
  'account_query',
  'link_submit',
  'setup_run',
  'help',
] as const;
export type BillTemplate = (typeof BILL_TEMPLATES)[number];

// key → 模板（1 键 1 模板）。
export function templateFor(key: string): BillTemplate {
  switch (key) {
    case 'bill.record.add': return 'record_add';
    case 'bill.record.update': return 'record_update';
    case 'bill.record.today': return 'record_today';
    case 'bill.record.range': return 'record_range';
    case 'bill.record.search': return 'record_search';
    case 'bill.record.detail': return 'record_detail';
    case 'bill.analysis.overview': return 'analysis_overview';
    case 'bill.analysis.compare': return 'analysis_compare';
    case 'bill.analysis.trend': return 'analysis_trend';
    case 'bill.goal.write': return 'goal_write';
    case 'bill.goal.query': return 'goal_query';
    case 'bill.account.write': return 'account_write';
    case 'bill.account.query': return 'account_query';
    case 'bill.link.submit': return 'link_submit';
    case 'bill.setup.run': return 'setup_run';
    case 'bill.help.lookup': return 'help';
    default: throw new BillRenderError('BILL_UNKNOWN_KEY', '无模板映射：' + key);
  }
}

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

export function loadTemplate(name: string): string {
  if (!BILL_TEMPLATES.includes(name as BillTemplate)) {
    throw new BillRenderError('BILL_TEMPLATE_MISSING', '未知模板：' + name);
  }
  try { return readFileSync(join(templatesDir, name + '.html'), 'utf8'); }
  catch (e) { throw new BillRenderError('BILL_TEMPLATE_MISSING', '模板缺失：' + name); }
}
