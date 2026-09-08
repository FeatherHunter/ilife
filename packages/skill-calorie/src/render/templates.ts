// #95 · 渲染层·模板装载：6 模板随包发布（package.json files 含 templates/*.html）；未知/缺失大声失败。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CalorieRenderError } from './errors.js';

export const CALORIE_TEMPLATES = [
  'home',
  'diet',
  'exercise',
  'goal',
  'photo-gallery',
  'help',
] as const;
export type CalorieTemplate = (typeof CALORIE_TEMPLATES)[number];

// 口径同 skill-chef/skill-bill：tsc 不复制非 TS 资源，装载器从 dist/render/*.js 上溯两级取包根
// templates/（源码态=packages/skill-calorie/templates，安装态=node_modules/skill-calorie/templates），
// 该目录必须靠 package.json files 随包发布，否则安装态装载必抛（见 tooling/check-publish.mjs --fresh-tmp）。
const templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

export function loadTemplate(name: string): string {
  if (!CALORIE_TEMPLATES.includes(name as CalorieTemplate)) {
    throw new CalorieRenderError('bad-input', '未知模板：' + name);
  }
  try { return readFileSync(join(templatesDir, name + '.html'), 'utf8'); }
  catch { throw new CalorieRenderError('missing-data', '模板缺失：' + name); }
}
