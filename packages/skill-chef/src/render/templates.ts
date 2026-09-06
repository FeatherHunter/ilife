// 渲染层·模板装载：8 模板随包发布；未知/缺失大声失败。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChefRenderError } from './errors.js';

export const CHEF_TEMPLATES = [
  'recipe_view',
  'recipe_search',
  'recipe_write',
  'cooking_run',
  'shopping_query',
  'history_record',
  'history_query',
  'help',
] as const;
export type ChefTemplate = (typeof CHEF_TEMPLATES)[number];

// key → 模板（1 键 1 模板）。
export function templateFor(key: string): ChefTemplate {
  switch (key) {
    case 'chef.recipe.view': return 'recipe_view';
    case 'chef.recipe.search': return 'recipe_search';
    case 'chef.recipe.write': return 'recipe_write';
    case 'chef.cooking.run': return 'cooking_run';
    case 'chef.shopping.query': return 'shopping_query';
    case 'chef.history.record': return 'history_record';
    case 'chef.history.query': return 'history_query';
    case 'chef.help.lookup': return 'help';
    default: throw new ChefRenderError('CHEF_UNKNOWN_KEY', '无模板映射：' + key);
  }
}

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

export function loadTemplate(name: string): string {
  if (!CHEF_TEMPLATES.includes(name as ChefTemplate)) {
    throw new ChefRenderError('CHEF_TEMPLATE_MISSING', '未知模板：' + name);
  }
  try { return readFileSync(join(templatesDir, name + '.html'), 'utf8'); }
  catch (e) { throw new ChefRenderError('CHEF_TEMPLATE_MISSING', '模板缺失：' + name); }
}
