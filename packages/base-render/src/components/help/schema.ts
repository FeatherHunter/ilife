/** help · schema
 *
 *  自 `src/help.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/help.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { text } from './render.js';
import { fail } from './shared.js';
import { SCENE_DATA_SCHEMA, SCENE_STATUS, SCENE_TYPE_FIELD, SceneData } from '../../spec/help.js';

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
    return { path, message: '不在 enum 允许清单：' + describe(value) };
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

/** `status-invalid`：**出现**的 `status` 不在 `SCENE_STATUS` 允许清单（缺失归 `schema-invalid`）。 */
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
export function validateSceneData(data: unknown): asserts data is SceneData {
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

