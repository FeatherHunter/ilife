/** template · markers
 *
 *  自 `src/template.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/template.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { ASSET_MARKER_KEYS, ASSET_WRAPPERS, CONTAINER_CHECK_RULE, STRICT_ENVELOPE_FIELDS, STRICT_ENVELOPE_SHAPES, TEMPLATE_KINDS, TEMPLATE_KIND_RULE, TEMPLATE_MARKERS, TemplateAssets, TemplateKind, TemplateMarkerKey, WRAP_PREDICATES } from '../../spec/template.js';

export const MARKER_KEYS = Object.keys(TEMPLATE_MARKERS) as TemplateMarkerKey[];

/** 包裹标签（唯一真相源 `ASSET_WRAPPERS`；本文件不写 `<style>`／`<script>` 字面量）。 */
export const WRAP_OPEN_TAGS: readonly string[] = Object.values(ASSET_WRAPPERS).map((w) => w.openTag);
export const WRAP_CLOSE_TAGS: readonly string[] = Object.values(ASSET_WRAPPERS).map((w) => w.closeTag);
/** 标签名形式（`<style>` → `style`），供不变量②的 `enclosing-open-tag` 判定使用。 */
const WRAP_TAG_NAMES: readonly string[] = [...new Set(WRAP_OPEN_TAGS.map((tag) => tag.slice(1, -1)))];

/** 资产键 → 标记键（查 `ASSET_MARKER_KEYS`，不自立第二份映射表）。 */
export function assetKeyForMarker(marker: TemplateMarkerKey): keyof TemplateAssets | null {
  const keys = Object.keys(ASSET_MARKER_KEYS) as (keyof TemplateAssets)[];
  for (const key of keys) {
    if (ASSET_MARKER_KEYS[key] === marker) return key;
  }
  return null;
}

/** 逐字出现次数（区分大小写；契约标记为逐字匹配）。 */
function countOccurrences(text: string, literal: string): number {
  let count = 0;
  let index = text.indexOf(literal);
  while (index >= 0) {
    count += 1;
    index = text.indexOf(literal, index + literal.length);
  }
  return count;
}

/** 替换**首个**出现处。
 *
 * 用 `indexOf` + 拼接而**不用** `String.prototype.replace`：后者会把替换文本里的
 * `$&`／`$'`／`$\`` 当替换模式，资产文本或 JSON 载荷含这些字符时会被改写。
 */
export function replaceFirst(text: string, literal: string, replacement: string): string {
  const index = text.indexOf(literal);
  if (index < 0) return text;
  return text.slice(0, index) + replacement + text.slice(index + literal.length);
}

/** 六标记计数（键序恒 `TEMPLATE_MARKERS`）。 */
export function countMarkers(template: string): Record<TemplateMarkerKey, number> {
  const counts = {} as Record<TemplateMarkerKey, number>;
  for (const key of MARKER_KEYS) counts[key] = countOccurrences(template, TEMPLATE_MARKERS[key]);
  return counts;
}

/** 分型判定（恒读 `TEMPLATE_KIND_RULE`）：`required` 各恰 1 次且 `forbidden` 各 0 次。
 *
 * 计数 > 1 的模板**不属分型判定面**（规则只对 0／1 次计数试配）→ 返回 `null`，
 * 由 `TEMPLATE_CHECK_ORDER` 的首个命中码报错（计数 > 1 → `marker-duplicate`）。
 */
export function kindOf(counts: Record<TemplateMarkerKey, number>): TemplateKind | null {
  const hits = TEMPLATE_KINDS.filter((kind) => {
    const rule = TEMPLATE_KIND_RULE[kind];
    return rule.required.every((m) => counts[m] === 1) && rule.forbidden.every((m) => counts[m] === 0);
  });
  return hits.length === 1 ? hits[0] : null;
}

/** 不变量②判定（`WRAP_PREDICATES.forbidPreWrappedMarker`，方式 `enclosing-open-tag`）。
 *
 * 作用域 = `ASSET_MARKER_KEYS` 的值集（三个共享资产标记），**排除 `injectData`**
 * （payload 容器是必需项、不是预包裹）；对**每一个**标记出现处扫描其**左侧全部前缀文本**
 * （不限同行），最近的未闭合包裹开标签存在即违反。返回首个违反的标记键。
 */
export function preWrappedMarker(template: string): TemplateMarkerKey | null {
  const predicate = WRAP_PREDICATES.forbidPreWrappedMarker;
  const excluded = predicate.excludes as readonly string[];
  for (const marker of predicate.scope) {
    if (excluded.includes(marker)) continue;
    const literal: string = TEMPLATE_MARKERS[marker];
    for (let index = template.indexOf(literal); index >= 0; index = template.indexOf(literal, index + literal.length)) {
      const before = template.slice(0, index);
      const enclosed = WRAP_TAG_NAMES.some(
        (name) => before.lastIndexOf('<' + name) > before.lastIndexOf('</' + name),
      );
      if (enclosed) return marker;
    }
  }
  return null;
}

/** 自带 payload 容器的定位结果（属性缺失为 `null`）。 */
interface ContainerProbe {
  readonly id: string | null;
  readonly type: string | null;
}

/** 容器定位（契约 §3.1 第 2 条 ＋ FX-118-11 的 F-2 处置）：取标记**左侧最近的未闭合开标签**，
 *  标签名恒取 `CONTAINER_CHECK_RULE.openTag`（页内已闭合的业务 `<script>` 不算容器）。
 *  返回该标签的 `id`／`type`（双引号口径）；无容器返回 `null`。
 */
export function locateContainer(template: string, markerIndex: number): ContainerProbe | null {
  const tagName = CONTAINER_CHECK_RULE.openTag.slice(1, -1);
  const before = template.slice(0, markerIndex);
  const openIndex = before.lastIndexOf('<' + tagName);
  if (openIndex < 0) return null;
  if (before.lastIndexOf(CONTAINER_CHECK_RULE.closeTag) > openIndex) return null;
  const end = template.indexOf('>', openIndex);
  const tag = end < 0 ? template.slice(openIndex) : template.slice(openIndex, end + 1);
  const attribute = (name: string): string | null => {
    const hit = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*"([^"]*)"').exec(tag);
    return hit ? hit[1] : null;
  };
  return { id: attribute('id'), type: attribute('type') };
}

/** 零依赖信封校验（`strict: true` 时追加）：`data` 是对象且含五字段、`shape` ∈ 七形状。
 *  **不调用** base-link-core 的 `parseEnvelope`（AC-13）。 */
export function isEnvelopeLike(data: unknown): boolean {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return false;
  const record = data as Record<string, unknown>;
  for (const field of STRICT_ENVELOPE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) return false;
  }
  const shape = record.shape;
  return typeof shape === 'string' && (STRICT_ENVELOPE_SHAPES as readonly string[]).includes(shape);
}

/** 输出 HTML 的 UTF-8 字节数（对齐旧 CLI 结果 JSON 的 `bytes` 口径）。
 *  用 `TextEncoder` 而非 `Buffer`：base-paint 是浏览器侧共享层，不依赖 Node 内建全局。 */
export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** 统一占位符填充器（冻结签名 `(input: FillTemplateInput): FillTemplateOutput`）。
 *
 * 判定按 `TEMPLATE_CHECK_ORDER` 逐阶段进行，**首个命中即抛、不聚合**；全部通过后按
 * `INJECTION_ORDER` 依次替换四个注入步（资产由本填充器按 `ASSET_WRAPPERS` 包裹），
 * 最后替换正文槽位（`content` 不占 `INJECTION_ORDER` 的位置，载荷槽两成员互斥，
 * 故与四个注入步**无先后语义**，契约 §3.1.2①）。
 */
