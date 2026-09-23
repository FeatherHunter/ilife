/** help · render
 *
 *  自 `src/help.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/help.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { ABOUT_TAB_ID, LF, TAB_GROUP_NAME, cls, tabRadioId } from './shared.js';
import { escapeHtml } from '../../contract.js';
import { ACTION_ID_ATTR, DEFAULT_DATA_ATTR } from '../../spec/controls.js';
import { HELP_COPY_ACTIONS, HelpCopyTarget, SCENE_STATUS, SCENE_TYPE_FIELD, Scene, SceneContact, SceneContactItem, SceneData, SceneEditableField, SceneGroup, SceneInitBanner, SceneInitBannerStep, SceneMetaBlock, SceneRecommendation, SceneSubgroup, SceneTypeBadge } from '../../spec/help.js';

/* ── 4. 渲染小件 ────────────────────────────────────────────── */

/** 属性（值一律 `escapeHtml`；属性名由调用方给冻结常量或本模块类名）。 */
export function attr(name: string, value: string): string {
  return ' ' + name + '="' + escapeHtml(value) + '"';
}

/** 文本节点（一律 `escapeHtml`）。 */
export function text(value: string): string {
  return escapeHtml(value);
}

/** 复制按钮（`actionId`／文案恒读 `HELP_COPY_ACTIONS`，承载属性恒读冻结常量）。 */
function renderCopyButton(target: HelpCopyTarget, payload: string, labelOverride?: string): string {
  const action = HELP_COPY_ACTIONS[target];
  const label = labelOverride !== undefined && labelOverride !== '' ? labelOverride : action.label;
  return '<button type="button" class="' + cls('btn') + ' ' + cls('btn-' + target) + '"'
    + attr(ACTION_ID_ATTR, action.actionId)
    + attr(DEFAULT_DATA_ATTR, payload)
    + '>' + text(label) + '</button>';
}

/** 逐场景 CLI 形态文本 = **`Scene.id` 原文**（逐字，经 `escapeHtml`；Q11／R17／**R32**）。
 *
 *  契约 §3.5.3 的 `skill.<combo>.<key>` 描述的是**键的形状**（`Scene.id` 本就等于它），
 *  **不是拼接公式**；该文本的用途是「复制去执行」，必须与真实键逐字一致，base-paint
 *  **不得臆造**技能专属 CLI 前缀（更深回补归 #106）。 */
function cliText(scene: Scene): string {
  return scene.id;
}

/** `params` 复制文本：`label: value` 行（LF 连接，**不 trim／不改写**）；无字段时取 CLI 形态文本。 */
function paramsText(scene: Scene, cli: string): string {
  const lines = (scene.editable_fields ?? [])
    .filter((field) => field.value !== '')
    .map((field) => field.label + ': ' + field.value);
  return lines.length > 0 ? lines.join(LF) : cli;
}

/** 标题区（`skill_name`／`title`／`subtitle`；`subtitle` 必须渲染，F3 读而不渲染属缺陷）。 */
export function renderHero(data: SceneData, sceneCount: number): string {
  const parts: string[] = ['<header class="' + cls('hero') + '">'];
  parts.push('<p class="' + cls('eyebrow') + '">' + text(data.skill_name) + '</p>');
  parts.push('<h1 class="' + cls('title') + '">' + text(data.title) + '</h1>');
  if (typeof data.subtitle === 'string') {
    parts.push('<p class="' + cls('subtitle') + '">' + text(data.subtitle) + '</p>');
  }
  parts.push('<p class="' + cls('lead') + '">' + text(String(sceneCount) + ' 场景 · 点场景卡看指令全文,一键复制指令') + '</p>');
  parts.push('</header>');
  return parts.join(LF);
}

/** 单步文案（#242：字符串原样；对象取 `title`＋可选 `desc`，与模板 `st.title`／`st.desc` 同口径）。 */
function initStepText(step: string | SceneInitBannerStep): string {
  if (typeof step === 'string') return text(step);
  const title = text(step.title);
  const desc = typeof step.desc === 'string' && step.desc !== '' ? text(step.desc) : '';
  return desc === '' ? title : title + '：' + desc;
}

/** 首用引导横幅（`init_banner`；`steps` 取 `readonly (string | SceneInitBannerStep)[]`，#242）。 */
export function renderInitBanner(banner: SceneInitBanner): string {
  const parts: string[] = ['<div class="' + cls('init') + '">'];
  parts.push('<p class="' + cls('init-title') + '">' + text(banner.title) + '</p>');
  if (typeof banner.subtitle === 'string') {
    parts.push('<p class="' + cls('init-subtitle') + '">' + text(banner.subtitle) + '</p>');
  }
  if (typeof banner.prompt === 'string') {
    parts.push('<p class="' + cls('init-prompt') + '">' + text(banner.prompt) + '</p>');
    parts.push(renderCopyButton('prompt', banner.prompt, banner.button_text ?? ''));
  }
  const steps = banner.steps;
  if (Array.isArray(steps) && steps.length > 0) {
    parts.push('<ol class="' + cls('init-steps') + '">'
      + steps.map((step) => '<li class="' + cls('init-step') + '">' + initStepText(step) + '</li>').join('')
      + '</ol>');
  }
  parts.push('</div>');
  return parts.join(LF);
}

/** 分组 Tab 条（`<label for>` 指向各页自带的 radio；CSS-only，零脚本）。 */
export function renderTabBar(groups: readonly SceneGroup[]): string {
  const labels: string[] = [];
  groups.forEach((group, index) => {
    labels.push('<label class="' + cls('tab') + '"' + attr('for', tabRadioId(index)) + '>'
      + (typeof group.icon === 'string' && group.icon !== ''
        ? '<span class="' + cls('tab-icon') + '">' + text(group.icon) + '</span>'
        : '')
      + text(group.label) + '</label>');
  });
  labels.push('<label class="' + cls('tab') + '"' + attr('for', ABOUT_TAB_ID) + '>' + text('关于') + '</label>');
  return '<nav class="' + cls('tab-bar') + '" aria-label="分组导航">' + labels.join('') + '</nav>';
}

/** 类型徽章（`types` 元素：字符串走 CSS 默认配色；`{text,bg?,fg?}` 把配色写入内联 style）。 */
function renderTypeBadge(badge: string | SceneTypeBadge): string {
  const element = typeof badge === 'string' ? { text: badge } : badge;
  const style: string[] = [];
  if (typeof element.bg === 'string' && element.bg !== '') style.push('background:' + element.bg);
  if (typeof element.fg === 'string' && element.fg !== '') style.push('color:' + element.fg);
  return '<span class="' + cls('badge') + '"'
    + (style.length > 0 ? attr('style', style.join(';')) : '')
    + '>' + text(element.text) + '</span>';
}

/** 徽章组（唤醒词 chip ＋ `types` 变体 ＋ `status` 待开发徽章，恒读 `SCENE_STATUS`）。 */
function renderBadges(scene: Scene): string {
  const parts: string[] = ['<div class="' + cls('card-top') + '">'];
  parts.push('<span class="' + cls('chip') + '">' + text(scene.wake_word) + '</span>');
  for (const badge of scene[SCENE_TYPE_FIELD] ?? []) parts.push(renderTypeBadge(badge));
  if (scene.status === SCENE_STATUS[1]) {
    // 徽章文本**恒读**冻结常量（`SCENE_STATUS[1]`），不自写字面量：改 spec 值即随动。
    parts.push('<span class="' + cls('badge') + ' ' + cls('badge-dev') + '">' + text(SCENE_STATUS[1]) + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** `editable_fields` 静态渲染：label ＋ 当前 value ＋ hint ＋ 必填标记（R4：实时替换降级为静态预览）。 */
function renderFields(fields: readonly SceneEditableField[]): string {
  const items = fields.map((field) => {
    const parts: string[] = ['<li class="' + cls('field') + '"' + attr('data-field', field.name) + '>'];
    parts.push('<span class="' + cls('field-label') + '">' + text(field.label) + '</span>');
    parts.push('<span class="' + cls('field-value') + '">' + text(field.value) + '</span>');
    if (typeof field.hint === 'string' && field.hint !== '') {
      parts.push('<span class="' + cls('field-hint') + '">' + text(field.hint) + '</span>');
    }
    if (field.required === true) {
      parts.push('<span class="' + cls('field-required') + '">' + text('必填') + '</span>');
    }
    parts.push('</li>');
    return parts.join('');
  });
  return '<ul class="' + cls('fields') + '">' + items.join('') + '</ul>';
}

/** 场景卡（标题／唤醒词／`types` 徽章／逐场景 CLI 形态文本 ＋ Sheet）。 */
function renderSceneCard(data: SceneData, group: SceneGroup, scene: Scene): string {
  const cli = cliText(scene);
  const fields = scene.editable_fields ?? [];
  const sheet: string[] = ['<details class="' + cls('sheet') + '">'];
  sheet.push('<summary class="' + cls('sheet-summary') + '">' + text('查看指令') + '</summary>');
  sheet.push('<div class="' + cls('sheet-body') + '">');
  sheet.push('<pre class="' + cls('prompt') + '">' + text(scene.prompt_template) + '</pre>');
  if (fields.length > 0) sheet.push(renderFields(fields));
  sheet.push('<div class="' + cls('actions') + '">'
    + renderCopyButton('prompt', scene.prompt_template)
    + renderCopyButton('wakeWord', scene.wake_word)
    + renderCopyButton('params', paramsText(scene, cli))
    + '</div>');
  sheet.push('</div>');
  sheet.push('</details>');

  return '<article class="' + cls('card') + '"' + attr('data-scene-id', scene.id) + attr('data-group-id', group.id) + '>'
    + renderBadges(scene)
    + '<h3 class="' + cls('card-title') + '">' + text(scene.title) + '</h3>'
    + '<code class="' + cls('cli') + '">' + text(cli) + '</code>'
    + sheet.join('')
    + '</article>';
}

/** 二级折叠（子功能名 ＋ 场景数）；**默认只展开本页第一个**（`open` 由调用方按序位给，
 *  与 A 路模板同口径：首屏看得见一组内容，又不被十几个分组撑成长卷。用户 2026-09-24 裁定）。 */
function renderSubgroup(data: SceneData, group: SceneGroup, subgroup: SceneSubgroup, open: boolean): string {
  const cards = subgroup.scenes.map((scene) => renderSceneCard(data, group, scene));
  return '<details class="' + cls('subgroup') + '"' + attr('data-subgroup-id', subgroup.id) + (open ? ' open>' : '>')
    + '<summary class="' + cls('subgroup-summary') + '">' + text(subgroup.label)
    + '<span class="' + cls('count') + '">' + text(String(subgroup.scenes.length)) + '</span></summary>'
    + '<div class="' + cls('subgroup-body') + '">'
    + '<div class="' + cls('grid') + '">' + cards.join('') + '</div>'
    + '</div>'
    + '</details>';
}

/** 分组页（自带 `:checked` radio ＋ 同级页面体：CSS-only Tab 的结构前提）。 */
export function renderGroupPage(data: SceneData, group: SceneGroup, index: number, checked: boolean): string {
  const subgroups = group.subgroups.map((subgroup, si) => renderSubgroup(data, group, subgroup, si === 0));
  return '<section class="' + cls('page') + '"' + attr('data-group-id', group.id) + '>'
    + '<input class="' + cls('tab-input') + '" type="radio"' + attr('name', TAB_GROUP_NAME) + attr('id', tabRadioId(index))
    + (checked ? ' checked' : '') + '>'
    + '<div class="' + cls('page-body') + '">' + subgroups.join('') + '</div>'
    + '</section>';
}

/** 联系人值（#242：与模板 `:1819` 同判——`url` 真值＋值以 `http` 开头即 `<a>`，落点皆为 `value`）。 */
function contactValueHtml(item: SceneContactItem): string {
  const linkable = Boolean(item.url) && item.value.indexOf('http') === 0;
  if (linkable) {
    return '<a class="' + cls('about-value') + '"' + attr('href', item.value)
      + ' target="_blank" rel="noopener">' + text(item.value) + '</a>';
  }
  return '<span class="' + cls('about-value') + '">' + text(item.value) + '</span>';
}

/** 关于 Tab（联系作者 → 版本 → 其他技能，F3 区块序）。 */
export function renderAboutPage(data: SceneData, checked: boolean): string {
  const parts: string[] = ['<section class="' + cls('page') + '"' + attr('data-page', 'about') + '>'];
  parts.push('<input class="' + cls('tab-input') + '" type="radio"' + attr('name', TAB_GROUP_NAME)
    + attr('id', ABOUT_TAB_ID) + (checked ? ' checked' : '') + '>');
  parts.push('<div class="' + cls('page-body') + '">');

  const contact: SceneContact | undefined = data.contact;
  if (contact !== undefined && contact.items.length > 0) {
    parts.push('<section class="' + cls('about-sec') + '">');
    parts.push('<h2 class="' + cls('about-head') + '">' + text('联系作者') + '</h2>');
    parts.push('<ul class="' + cls('about-list') + '">' + contact.items.map((item) => (
      '<li class="' + cls('about-row') + '">'
      + '<span class="' + cls('about-label') + '">' + text(item.label) + '</span>'
      + contactValueHtml(item)
      + '</li>'
    )).join('') + '</ul>');
    if (typeof contact.copy_all === 'string' && contact.copy_all !== '') {
      parts.push('<p class="' + cls('about-note') + '">' + text(contact.copy_all) + '</p>');
    }
    parts.push('</section>');
  }

  parts.push('<section class="' + cls('about-sec') + '">');
  parts.push('<h2 class="' + cls('about-head') + '">' + text('版本') + '</h2>');
  parts.push('<p class="' + cls('about-row') + '"><span class="' + cls('about-label') + '">' + text(data.skill_name) + '</span>'
    + (typeof data.version === 'string' && data.version !== ''
      ? '<span class="' + cls('about-value') + '">' + text('v' + data.version) + '</span>'
      : '')
    + '</p>');
  parts.push('</section>');

  const recommendations: readonly SceneRecommendation[] = data.recommendations ?? [];
  if (recommendations.length > 0) {
    parts.push('<section class="' + cls('about-sec') + '">');
    parts.push('<h2 class="' + cls('about-head') + '">' + text('其他技能') + '</h2>');
    parts.push('<ul class="' + cls('about-list') + '">' + recommendations.map((item) => (
      '<li class="' + cls('about-row') + '">'
      + '<span class="' + cls('about-label') + '">' + text(item.name) + '</span>'
      + (typeof item.reason === 'string' && item.reason !== ''
        ? '<span class="' + cls('about-value') + '">' + text(item.reason) + '</span>'
        : '')
      + (typeof item.wake_word === 'string' && item.wake_word !== ''
        ? '<span class="' + cls('badge') + '">' + text(item.wake_word) + '</span>'
        : '')
      + '</li>'
    )).join('') + '</ul>');
    parts.push('</section>');
  }

  parts.push('</div>');
  parts.push('</section>');
  return parts.join(LF);
}

/** `meta_blocks`：标题转义、`html` **原样透传**（`doc:821`）。 */
export function renderMetaBlocks(blocks: readonly SceneMetaBlock[]): string {
  return blocks.map((block) => '<section class="' + cls('meta-block') + '"' + attr('data-meta-id', block.id) + '>'
    + '<h2 class="' + cls('meta-title') + '">' + text(block.title) + '</h2>'
    + '<div class="' + cls('meta-html') + '">' + block.html + '</div>'
    + '</section>').join(LF);
}

