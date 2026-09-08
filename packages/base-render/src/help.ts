/** base-paint/help：HELP 壳渲染（#78 运行时）。
 *
 * 契约正本：`docs/base-paint-contract.md` §3.5.2（scene-data 契约）／§3.5.3（HELP 壳接口）／
 * §6.5（实现指引）；冻结面：`packages/base-render/src/spec/help.ts`（本文件**只消费**，不改签名）。
 *
 * 三条红线（逐条对齐契约与架构裁定）：
 *  1. **不得自填**（B3／§3.5.3「填充」）：壳把「骨架 ＋ 由 sceneData 渲染出的静态 HTML」拼成模板后
 *     **一律走 `fillTemplate`**（`src/template.ts`），共享资产／载荷由填充器注入；壳不写 `<script>` 代码、
 *     不读 `document`／`window`／`globalThis`、不引 `node:`、不引第三方。
 *  2. **占位符契约（数据页，R7）**：`<!--INJECT-DATA-->` 恰 1 次且落在**自带容器**
 *     `<script id="payload" type="application/json">` 内；`<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`
 *     各恰 1 次；`<!--CHARTS-HELPERS-->`／`<!--CONTENT-->` 各 0 次。标记字面量恒读 `TEMPLATE_MARKERS`、
 *     包裹标签恒读 `ASSET_WRAPPERS`（**不写第二份字面量**）。
 *  3. **单一真相**：复制按钮的 `actionId`／文案恒读 `HELP_COPY_ACTIONS`，承载属性恒读 `ACTION_ID_ATTR`，
 *     复制文本承载属性恒读 `DEFAULT_DATA_ATTR`；根 id 恒读 `HELP_SHELL_ID`；类名命名空间恒读
 *     `CONTROL_STYLE_SECTIONS` 的 `helpShell` 项（`STYLE_PREFIX` ＋ 区名 kebab）。**不自造**第二套常量。
 *
 * 契约未规定处的取值（本文件显式记账，不留暗猜）：
 *  - **交互恒为 CSS-only**（裁定 R4）：分组 Tab ＝ 每页自带 `:checked` radio ＋ 同级页面体（标签用 `for` 指向），
 *    二级折叠／Sheet ＝ 原生 `<details>`；壳**不产任何可执行 `<script>`**（唯一的 `<script>` 是 payload 数据容器，
 *    由 `fillTemplate` 注入的 helpers 包裹亦为既有约定）。样式规则归 #75 的 `sharedCssText`
 *    （`CONTROL_STYLE_SECTIONS.helpShell` 命名空间），本模块**不产 CSS 常量**（否则构成第二份样式真相）。
 *  - **逐场景 CLI 形态文本**（Q11／R17／**R32**）：**恒等于 `Scene.id` 原文**（逐字，经 `escapeHtml`）。
 *    `doc:836` 的 `skill.<combo>.<key>` 描述的是**键的形状**（`Scene.id` 本就等于它），**不是拼接公式**；
 *    该文本用途是「复制去执行」，必须与真实键逐字一致——**不自造**技能专属 CLI 前缀，也**不自造**
 *    `Scene` 字段（`cli`／`data_source` 等回补归 #106）。
 *  - **Sheet**（R4）：`<details>` 内静态渲染 `prompt_template` 全文 ＋ `editable_fields`（label ＋ 当前 value ＋
 *    hint ＋ 必填标记）＋ 三个复制按钮；「输入即改预览」的实时替换 JS **降级为静态预览**（模板禁内联脚本）。
 *  - **复制按钮**：每张场景卡的三目标按钮的 `actionId`／文案**逐字取** `HELP_COPY_ACTIONS`
 *    （`doc:846`／`doc:994`）；`params` 文本 = 各 `editable_fields` 的 `label: value` 行（LF 连接），
 *    无字段时取该场景的 CLI 形态文本（旧侧 `buildPrompt` 语义，`help_template.html:311-322`）。
 *  - **`contact.copy_all`**（新类型 `string`，R23）：渲染为关于 Tab 的备注文本——旧布尔语义的「一键复制」
 *    按钮需要**第二套 actionId**（`doc:993` 禁止），故本票不渲染该按钮，回补归 #88／#106。
 *  - **产物形态**：**完整 HTML 文档**（`<!DOCTYPE html>` ＋ `<html lang="zh-CN">` ＋ `<head>`（`<meta charset="utf-8">`
 *    ＋ viewport ＋ `<title>`）＋ `<body>` ＋ `</html>`；R31）——`<meta charset>` 是含中文的 UTF-8 文件经 `file://`
 *    打开不乱码的前提，速查台是独立页面。载荷容器与 `<!--SHARED-HELPERS-->` 排在 `<body>` 内、`<!--SHARED-CSS-->`
 *    落在 `<head>` 内（对齐旧模板 `help_template.html:194-201` 的槽位语义）。
 *  - **`meta_blocks[].html` 原样透传**（`doc:821`）；其余一切 sceneData 文本经 `escapeHtml`（AC-14 五字符）。
 *  - **`types` 徽章**：字符串元素用默认配色（CSS 类）；`{text,bg?,fg?}` 元素把 `bg`／`fg` 写入内联 `style`
 *    （旧 `help_template.html:268-281` 同口径，数据驱动配色无法落静态样式表）。
 *  - **`scenes[]` 非空**：由 `SCENE_DATA_SCHEMA` 的 `minItems: 1` 承担（裁定 R11，编排者已补）；
 *    校验器恒读 schema，不自立第二份规则。
 */
import { escapeHtml } from './contract.js';
import { fillTemplate } from './template.js';
import { STYLE_PREFIX } from './style.js';
import { ACTION_ID_ATTR, DEFAULT_DATA_ATTR } from './spec/controls.js';
import {
  HELP_COPY_ACTIONS,
  HELP_COPY_TARGETS,
  HELP_SHELL_ID,
  SCENE_DATA_SCHEMA,
  SCENE_STATUS,
  SCENE_TYPE_FIELD,
} from './spec/help.js';
import { CONTROL_STYLE_SECTIONS } from './spec/style.js';
import { ASSET_WRAPPERS, CONTAINER_CHECK_RULE, TEMPLATE_MARKERS } from './spec/template.js';
import type {
  HelpCopyTarget,
  HelpSchemaErrorCode,
  HelpSchemaErrorShape,
  HelpShellInput,
  Scene,
  SceneContact,
  SceneData,
  SceneEditableField,
  SceneGroup,
  SceneInitBanner,
  SceneMetaBlock,
  SceneRecommendation,
  SceneSubgroup,
  SceneTypeBadge,
} from './spec/help.js';
import type { ControlStyleSection } from './spec/style.js';
import type { FillTemplateOutput } from './spec/template.js';

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面 `\n`）。 */
const LF = String.fromCharCode(10);

/** 样式区名 kebab（`helpShell` → `help-shell`）：区名 → 类名命名空间的**唯一映射**。 */
function sectionSlug(section: ControlStyleSection): string {
  return section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

/** 样式区名（`helpShell`）：**恒取 `CONTROL_STYLE_SECTIONS` 的闭集成员**——kebab 后与 `HELP_SHELL_ID`
 *  同值者（**不自写字面量**）。闭集漂移即在此 fail-fast，不会静默改用别的命名空间。 */
const HELP_SECTION = CONTROL_STYLE_SECTIONS.find(
  (section) => STYLE_PREFIX + sectionSlug(section) === HELP_SHELL_ID,
);
if (HELP_SECTION === undefined) {
  throw new Error('base-paint/help：CONTROL_STYLE_SECTIONS 闭集缺与 HELP_SHELL_ID 同 kebab 的区名（'
    + HELP_SHELL_ID + '）');
}

/** 类名命名空间根（`ilife-help-shell`）：由**闭集区名**派生，与根元素 id（`HELP_SHELL_ID`）同值但来源独立。 */
const HELP_CLASS_ROOT = STYLE_PREFIX + sectionSlug(HELP_SECTION);

/** 类名拼装（命名空间内，不自写第二份前缀）。 */
function cls(suffix: string): string {
  return HELP_CLASS_ROOT + '-' + suffix;
}

/** 分组 Tab 的 radio `name`（页内唯一分组名，标签用 `for` 跨节点指向）。 */
const TAB_GROUP_NAME = cls('tab-group');

/** 分组页 radio 的 id（**索引派生**：数据里的 group.id 可能重复，不得用作 HTML id）。 */
function tabRadioId(index: number): string {
  return cls('tab-' + index);
}

/** 关于 Tab 的 radio id。 */
const ABOUT_TAB_ID = cls('tab-about');

/* ── 1. 错误形态 ────────────────────────────────────────────── */

/** 校验失败（形态逐字对齐冻结的 `HelpSchemaErrorShape`：`{ name, code, path, message }`）。
 *
 * **不从 `src/index.ts` 导出**：冻结面 `SPEC_FROZEN_SURFACE` 无该运行时条目，导出会打破
 * 「新增运行时出口恰好等于清单 implemented 的运行时项」出口面锁（与 `TemplateError`／`ControlsError` 同口径，
 * 裁定 R13）。调用方按 `name`／`code`／`path` 判定。
 */
export class HelpSchemaError extends Error implements HelpSchemaErrorShape {
  readonly name: 'HelpSchemaError' = 'HelpSchemaError';
  readonly code: HelpSchemaErrorCode;
  /** JSON 指针式路径（根为 `/`）。 */
  readonly path: string;

  constructor(code: HelpSchemaErrorCode, path: string, message: string) {
    super(message);
    this.code = code;
    this.path = path;
  }
}

function fail(code: HelpSchemaErrorCode, path: string, message: string): never {
  throw new HelpSchemaError(code, path, message);
}

/* ── 2. 零依赖 draft-07 子集校验器（禁 ajv／禁第三方，裁定 R6） ──── */

interface Violation {
  readonly path: string;
  readonly message: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

/** 供 message 辨因的类型描述（不参与判定）。 */
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array(' + value.length + ')';
  if (typeof value === 'string') return 'string(' + JSON.stringify(value) + ')';
  return typeof value;
}

/** `type` 关键字判定（子集内的四种类型 ＋ 容错类型；未知 type 不参与判定）。 */
function typeMatches(type: string, value: unknown): boolean {
  if (type === 'object') return isPlainObject(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (type === 'null') return value === null;
  return true;
}

/** 路径拼接（根为 `''`，对外展示时映射为 `/`）。 */
function childPath(path: string, key: string | number): string {
  return path + '/' + String(key);
}

function showPath(path: string): string {
  return path === '' ? '/' : path;
}

/** 支持的关键字（**唯一实现**，恒读 `SCENE_DATA_SCHEMA` 的字段，不自立第二份规则表）：
 *  `type`／`enum`／`minLength`／`minItems`／`items`／`required`／`additionalProperties:false`／
 *  `properties`／`oneOf`。返回**首个**违规（不聚合）。 */
function firstViolation(schema: unknown, value: unknown, path: string): Violation | null {
  if (!isPlainObject(schema)) return null;

  const type = schema.type;
  if (typeof type === 'string' && !typeMatches(type, value)) {
    return { path, message: '类型不符：期望 ' + type + '，实际 ' + describe(value) };
  }

  const allowed = schema.enum;
  if (Array.isArray(allowed) && !allowed.some((member) => member === value)) {
    return { path, message: '不在 enum 白名单：' + describe(value) };
  }

  const minLength = schema.minLength;
  if (typeof minLength === 'number' && typeof value === 'string' && value.length < minLength) {
    return { path, message: '长度不足：minLength=' + minLength + '，实际 ' + value.length };
  }

  const minItems = schema.minItems;
  if (typeof minItems === 'number' && Array.isArray(value) && value.length < minItems) {
    return { path, message: '元素不足：minItems=' + minItems + '，实际 ' + value.length };
  }

  if (Array.isArray(value)) {
    const items = schema.items;
    if (items !== undefined) {
      for (let i = 0; i < value.length; i += 1) {
        const violation = firstViolation(items, value[i], childPath(path, i));
        if (violation !== null) return violation;
      }
    }
  }

  if (isPlainObject(value)) {
    const required = schema.required;
    if (Array.isArray(required)) {
      for (const key of required) {
        if (typeof key === 'string' && !hasOwn(value, key)) {
          return { path: childPath(path, key), message: '缺必填字段：' + key };
        }
      }
    }
    const properties = isPlainObject(schema.properties) ? schema.properties : null;
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (properties === null || !hasOwn(properties, key)) {
          return { path: childPath(path, key), message: '多余字段（additionalProperties:false）：' + key };
        }
      }
    }
    if (properties !== null) {
      for (const key of Object.keys(properties)) {
        if (!hasOwn(value, key)) continue; // 缺失由 `required` 判定
        const violation = firstViolation(properties[key], value[key], childPath(path, key));
        if (violation !== null) return violation;
      }
    }
  }

  const oneOf = schema.oneOf;
  if (Array.isArray(oneOf)) {
    let hits = 0;
    for (const branch of oneOf) {
      if (firstViolation(branch, value, path) === null) hits += 1;
    }
    if (hits !== 1) {
      return { path, message: 'oneOf 命中 ' + hits + ' 个分支（须恰 1）' };
    }
  }

  return null;
}

/* ── 3. 三个专项判定（优先级：duplicate-id → status-invalid → types-invalid） ── */

/** 场景位置（结构不符时**不**产出，交 `schema-invalid` 判定，避免 TypeError 逃逸）。 */
interface SceneSite {
  readonly scene: Record<string, unknown>;
  readonly path: string;
}

/** 遍历 `groups[].subgroups[].scenes[]`（防御式：任一层非数组即止）。 */
function eachScene(data: unknown): SceneSite[] {
  const sites: SceneSite[] = [];
  if (!isPlainObject(data)) return sites;
  const groups = data.groups;
  if (!Array.isArray(groups)) return sites;
  groups.forEach((group, gi) => {
    if (!isPlainObject(group)) return;
    const subgroups = group.subgroups;
    if (!Array.isArray(subgroups)) return;
    subgroups.forEach((subgroup, si) => {
      if (!isPlainObject(subgroup)) return;
      const scenes = subgroup.scenes;
      if (!Array.isArray(scenes)) return;
      scenes.forEach((scene, ci) => {
        if (!isPlainObject(scene)) return;
        sites.push({ scene, path: '/groups/' + gi + '/subgroups/' + si + '/scenes/' + ci });
      });
    });
  });
  return sites;
}

/** `duplicate-id`：`scenes[].id` **全局唯一**（`doc:820`／R6）。非字符串 id 归 `schema-invalid`。 */
function findDuplicateId(sites: readonly SceneSite[]): Violation | null {
  const seen = new Set<string>();
  for (const site of sites) {
    const id = site.scene.id;
    if (typeof id !== 'string') continue;
    if (seen.has(id)) {
      return { path: childPath(site.path, 'id'), message: 'scene.id 重复：' + id };
    }
    seen.add(id);
  }
  return null;
}

/** `status-invalid`：**出现**的 `status` 不在 `SCENE_STATUS` 白名单（缺失归 `schema-invalid`）。 */
function findStatusViolation(sites: readonly SceneSite[]): Violation | null {
  const allowed = SCENE_STATUS as readonly unknown[];
  for (const site of sites) {
    if (!hasOwn(site.scene, 'status')) continue;
    const status = site.scene.status;
    if (!allowed.includes(status)) {
      return { path: childPath(site.path, 'status'), message: 'status 不在 SCENE_STATUS：' + describe(status) };
    }
  }
  return null;
}

/** `types-invalid`：`types` **元素**既非字符串、也非带字符串 `text` 的对象（R6）；
 *  `types` 非数组／对象元素的多余键归 `schema-invalid`（oneOf／additionalProperties）。 */
function findTypesViolation(sites: readonly SceneSite[]): Violation | null {
  for (const site of sites) {
    if (!hasOwn(site.scene, SCENE_TYPE_FIELD)) continue;
    const types = site.scene[SCENE_TYPE_FIELD];
    if (!Array.isArray(types)) continue;
    for (let i = 0; i < types.length; i += 1) {
      const element = types[i];
      const ok = typeof element === 'string' || (isPlainObject(element) && typeof element.text === 'string');
      if (!ok) {
        return {
          path: childPath(childPath(site.path, SCENE_TYPE_FIELD), i),
          message: 'types 元素须为字符串或 {text}：' + describe(element),
        };
      }
    }
  }
  return null;
}

/** scene-data 校验（**首个命中即抛**，次序恒为 `duplicate-id` → `status-invalid` → `types-invalid`
 *  → `schema-invalid`；`SCENE_DATA_SCHEMA` 是唯一机读权威，含 `minItems: 1` 的 `scenes[]` 非空约束）。 */
function validateSceneData(data: unknown): asserts data is SceneData {
  const sites = eachScene(data);

  const duplicated = findDuplicateId(sites);
  if (duplicated !== null) {
    fail('duplicate-id', showPath(duplicated.path), duplicated.message);
  }

  const status = findStatusViolation(sites);
  if (status !== null) {
    fail('status-invalid', showPath(status.path), status.message);
  }

  const types = findTypesViolation(sites);
  if (types !== null) {
    fail('types-invalid', showPath(types.path), types.message);
  }

  const schema = firstViolation(SCENE_DATA_SCHEMA, data, '');
  if (schema !== null) {
    fail('schema-invalid', showPath(schema.path), schema.message);
  }
}

/* ── 4. 渲染小件 ────────────────────────────────────────────── */

/** 属性（值一律 `escapeHtml`；属性名由调用方给冻结常量或本模块类名）。 */
function attr(name: string, value: string): string {
  return ' ' + name + '="' + escapeHtml(value) + '"';
}

/** 文本节点（一律 `escapeHtml`）。 */
function text(value: string): string {
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
function renderHero(data: SceneData, sceneCount: number): string {
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

/** 首用引导横幅（`init_banner`；`steps` 取新类型 `readonly string[]`，R23）。 */
function renderInitBanner(banner: SceneInitBanner): string {
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
      + steps.map((step) => '<li class="' + cls('init-step') + '">' + text(step) + '</li>').join('')
      + '</ol>');
  }
  parts.push('</div>');
  return parts.join(LF);
}

/** 分组 Tab 条（`<label for>` 指向各页自带的 radio；CSS-only，零脚本）。 */
function renderTabBar(groups: readonly SceneGroup[]): string {
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

/** 二级折叠（`<details open>`；子功能名 ＋ 场景数）。 */
function renderSubgroup(data: SceneData, group: SceneGroup, subgroup: SceneSubgroup): string {
  const cards = subgroup.scenes.map((scene) => renderSceneCard(data, group, scene));
  return '<details class="' + cls('subgroup') + '"' + attr('data-subgroup-id', subgroup.id) + ' open>'
    + '<summary class="' + cls('subgroup-summary') + '">' + text(subgroup.label)
    + '<span class="' + cls('count') + '">' + text(String(subgroup.scenes.length)) + '</span></summary>'
    + '<div class="' + cls('subgroup-body') + '">'
    + '<div class="' + cls('grid') + '">' + cards.join('') + '</div>'
    + '</div>'
    + '</details>';
}

/** 分组页（自带 `:checked` radio ＋ 同级页面体：CSS-only Tab 的结构前提）。 */
function renderGroupPage(data: SceneData, group: SceneGroup, index: number, checked: boolean): string {
  const subgroups = group.subgroups.map((subgroup) => renderSubgroup(data, group, subgroup));
  return '<section class="' + cls('page') + '"' + attr('data-group-id', group.id) + '>'
    + '<input class="' + cls('tab-input') + '" type="radio"' + attr('name', TAB_GROUP_NAME) + attr('id', tabRadioId(index))
    + (checked ? ' checked' : '') + '>'
    + '<div class="' + cls('page-body') + '">' + subgroups.join('') + '</div>'
    + '</section>';
}

/** 关于 Tab（联系作者 → 版本 → 其他技能，F3 区块序）。 */
function renderAboutPage(data: SceneData, checked: boolean): string {
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
      + '<span class="' + cls('about-value') + '">' + text(item.value) + '</span>'
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
function renderMetaBlocks(blocks: readonly SceneMetaBlock[]): string {
  return blocks.map((block) => '<section class="' + cls('meta-block') + '"' + attr('data-meta-id', block.id) + '>'
    + '<h2 class="' + cls('meta-title') + '">' + text(block.title) + '</h2>'
    + '<div class="' + cls('meta-html') + '">' + block.html + '</div>'
    + '</section>').join(LF);
}

/* ── 5. 内置壳模板（**非导出**，裁定 R13；可经 `HelpShellInput.template` 覆盖） ── */

/** payload 容器开标签：标签名恒取 `ASSET_WRAPPERS`，`id`／`type` 恒取 `CONTAINER_CHECK_RULE`
 *  （容器校验规则的 `id`／`type` 与 `DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE` 同值，不写第二份字面量）。 */
const DATA_SCRIPT_OPEN = ASSET_WRAPPERS.sharedHelpersJs.openTag.slice(0, -1)
  + ' id="' + CONTAINER_CHECK_RULE.id + '" type="' + CONTAINER_CHECK_RULE.type + '">';
const DATA_SCRIPT_CLOSE = ASSET_WRAPPERS.sharedHelpersJs.closeTag;

/** 文档 `<title>`：`title · skill_name`（两者均经 `escapeHtml`，R31）。
 *  `title` 是必填非空字段（`minLength: 1`），`skill_name` 同；拼串使两个字段都有可观察效果。 */
function documentTitle(data: SceneData): string {
  return data.title + ' · ' + data.skill_name;
}

/** 内置壳模板（**完整 HTML 文档**，R31）：数据页分型（`<!--INJECT-DATA-->` 恰 1 次且在自带容器内；
 *  `<!--SHARED-CSS-->` 落在 `<head>`、`<!--SHARED-HELPERS-->` 落在 `<body>`，各恰 1；
 *  `<!--CHARTS-HELPERS-->`／`<!--CONTENT-->` 各 0）。
 *
 *  完整文档而非片段：`<meta charset="utf-8">` 是含中文的 UTF-8 文件经 `file://` 打开不乱码的前提
 *  （Windows 尤甚），速查台是独立页面（仓内各技能包的 `templates` 目录与旧
 *  `help_template.html` 同为完整文档）。两个共享资产标记仍是**裸标记**（不得预包裹，不变量②），
 *  包裹由 `fillTemplate` 按 `ASSET_WRAPPERS` 完成。 */
function buildShellTemplate(data: SceneData): string {
  const groups = data.groups;
  const sceneCount = groups.reduce(
    (total, group) => total + group.subgroups.reduce((sub, item) => sub + item.scenes.length, 0),
    0,
  );
  const hasGroupPage = groups.length > 0;

  const parts: string[] = [];
  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="zh-CN">');
  parts.push('<head>');
  parts.push('<meta charset="utf-8">');
  parts.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  parts.push('<title>' + text(documentTitle(data)) + '</title>');
  parts.push(TEMPLATE_MARKERS.sharedCss); // 裸标记：填充器包成 <style>（落在 <head> 内）
  parts.push('</head>');
  parts.push('<body>');
  parts.push('<section class="' + HELP_CLASS_ROOT + '"' + attr('id', HELP_SHELL_ID) + '>');
  parts.push(renderHero(data, sceneCount));
  if (data.init_banner !== undefined) parts.push(renderInitBanner(data.init_banner));
  parts.push(renderTabBar(groups));
  parts.push('<div class="' + cls('pages') + '">');
  groups.forEach((group, index) => {
    parts.push(renderGroupPage(data, group, index, index === 0));
  });
  parts.push(renderAboutPage(data, !hasGroupPage));
  parts.push('</div>');
  const metaBlocks = data.meta_blocks ?? [];
  if (metaBlocks.length > 0) {
    parts.push('<div class="' + cls('meta') + '">' + renderMetaBlocks(metaBlocks) + '</div>');
  }
  parts.push('</section>');
  // 载荷容器（自带；填充器只替换标记文本，不补写标签）+ 共享 helpers 标记（**裸标记**，不得预包裹）。
  parts.push(DATA_SCRIPT_OPEN + TEMPLATE_MARKERS.injectData + DATA_SCRIPT_CLOSE);
  parts.push(TEMPLATE_MARKERS.sharedHelpers);
  parts.push('</body>');
  parts.push('</html>');
  return parts.join(LF);
}

/* ── 6. 对外出口 ────────────────────────────────────────────── */

/** HELP 壳渲染（冻结签名 `(input: HelpShellInput): FillTemplateOutput`）。
 *
 * 次序：**先校验 `sceneData`**（失败抛 `HelpSchemaError`）→ 再拼内置壳模板（或 `template` 覆盖）
 * → **一律走 `fillTemplate`**（共享资产与 JSON 载荷由填充器注入，壳不得自填）。
 *
 * `strict` 原样透传给 `fillTemplate`（契约 §3.5.3「透传」）；`template` 覆盖时按调用方模板填充。
 */
export function renderHelpShell(input: HelpShellInput): FillTemplateOutput {
  const source = input ?? ({} as HelpShellInput);
  const sceneData: unknown = source.sceneData;
  validateSceneData(sceneData);

  const template = typeof source.template === 'string' ? source.template : buildShellTemplate(sceneData);
  return fillTemplate({
    template,
    assets: source.assets,
    data: sceneData,
    strict: source.strict === true,
  });
}
