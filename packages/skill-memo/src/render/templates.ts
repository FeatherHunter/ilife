// 渲染层·模板装载（M4）：5 渲染模板随包发布（SKILL 包只含 SKILL.md+dist+模板）；init_report/HELP 模板归 M6。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MemoRenderError } from './errors.js';

export const MEMO_TEMPLATES = [
  'memo_query',
  'sync_report',
  'wish_plan',
  'wish_complete',
  'change_category',
] as const;
export type MemoTemplate = (typeof MEMO_TEMPLATES)[number];

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

export function loadTemplate(name: string): string {
  if (!MEMO_TEMPLATES.includes(name as MemoTemplate)) {
    throw new MemoRenderError('MEMO_TEMPLATE_MISSING', '未知模板：' + name + '（init/HELP 模板归 M6）');
  }
  try { return readFileSync(join(templatesDir, name + '.html'), 'utf8'); }
  catch (e) { throw new MemoRenderError('MEMO_TEMPLATE_MISSING', '模板缺失：' + name); }
}
