/** base-paint/template：统一占位符填充器（#74 运行时）。
 *
 * 契约正本：`docs/base-paint-contract.md` §3.1（含 §3.1.2）／§6.1；冻结面：
 * `packages/base-render/src/spec/template.ts`（本文件**只消费**，不改任何冻结签名）。
 *
 * 三条红线（逐条对齐契约）：
 *  1. **命名（AC-1）**：`injector` 一词专指 sidebar 槽位装配（`src/injector.ts`）；
 *     HTML 占位符填充器的对外名恒为 `fillTemplate`，禁止 `injectHtml`／`htmlInjector`
 *     ／`injectPlaceholders`／`htmlTemplateInjector`／`mountTemplate` 等写法。
 *  2. **依赖（AC-13）**：零运行时依赖——不 `import` base-link-core（只许 `import type`），
 *     信封校验只用 base-paint 自持的 `STRICT_ENVELOPE_FIELDS`／`STRICT_ENVELOPE_SHAPES`，
 *     **不调用 `parseEnvelope`**。
 *  3. **失败（边界规则 5）**：一律抛 `TemplateError`，**不返空页**（绝不返回 `html: ''`）。
 *
 * 单一真相（禁止第二份表）：判定次序恒读 `TEMPLATE_CHECK_ORDER`（首个命中即抛、不聚合）；
 * 标记字面量恒读 `TEMPLATE_MARKERS`；数量规则恒读 `MARKER_RULES`；载荷槽恒读
 * `PAYLOAD_SLOT_RULE`；分型恒读 `TEMPLATE_KIND_RULE`；包裹标签恒读 `ASSET_WRAPPERS`；
 * 资产↔标记映射恒读 `ASSET_MARKER_KEYS`；两条不变量恒读 `WRAP_PREDICATES`；
 * 容器作用域与 id／type 恒读 `CONTAINER_CHECK_RULE`；JSON 的 `<` 转义恒读
 * `TEXT_JSON_LT_RULE`（§3.1／§3.4 同口径，FX-74-2）。
 *
 * 契约未规定处的取值（本文件显式记账，不留暗猜）：
 *  - `report.markers` 的数组序 = `TEMPLATE_MARKERS` 的键序（六个标记的规范序）；
 *  - `<!--NO-SHARED-->` 是**豁免声明本身、无填充物**（§3.1 标记表），故**原样留在输出**、
 *    `filled === false`（它不是注入步，只改数量校验）；
 *  - 容器属性解析取**双引号**口径（与 `tooling/classify-templates.mjs` 同口径）；
 *  - `template` 非字符串时按空模板处理（走载荷槽缺失 → `marker-missing`，不抛 TypeError）。
 */
import {
  ASSET_MARKER_KEYS,
  ASSET_WRAPPERS,
  ASSET_WRAP_RULE,
  CONTAINER_CHECK_RULE,
  INJECTION_ORDER,
  MARKER_RULES,
  PAYLOAD_SLOT_RULE,
  STRICT_ENVELOPE_FIELDS,
  STRICT_ENVELOPE_SHAPES,
  TEMPLATE_CHECK_ORDER,
  TEMPLATE_KIND_RULE,
  TEMPLATE_KINDS,
  TEMPLATE_MARKERS,
  WRAP_PREDICATES,
} from './spec/template.js';
import { TEXT_JSON_LT_RULE } from './spec/text.js';
import type {
  FillTemplateInput,
  FillTemplateOutput,
  FillTemplateReport,
  MarkerReport,
  TemplateAssets,
  TemplateErrorCode,
  TemplateKind,
  TemplateMarkerKey,
} from './spec/template.js';

/** 填充失败（形态逐字对齐冻结的 `TemplateErrorShape`：`{ name, code, marker?, message }`）。
 *
 * 与既有 `RenderError`（`src/contract.ts`）**并列、互不继承**、code 集互不重叠
 * （契约 §3.3「错误形态与既有 RenderError 的关系」）。
 *
 * **不从 `src/index.ts` 导出**：`SPEC_FROZEN_SURFACE` 无该运行时条目，导出会打破
 * 「新增运行时出口恰好等于清单 implemented 的运行时项」出口面锁。调用方按 `name`／`code`
 * 判定（冻结形态的判定口径就是这两个字段）。
 */
export class TemplateError extends Error {
  /** 逐字对齐 `TemplateErrorShape.name`。 */
  readonly name = 'TemplateError';
  readonly code: TemplateErrorCode;
  /** 归因标记（能唯一定位时给出；载荷槽／信封级失败不给）。 */
  readonly marker?: TemplateMarkerKey;

  constructor(code: TemplateErrorCode, message: string, marker?: TemplateMarkerKey) {
    super(message);
    this.code = code;
    if (marker !== undefined) this.marker = marker;
  }
}

/** 抛错并收窄控制流（`never` 返回，便于 TS 在断言后收窄）。 */
function fail(code: TemplateErrorCode, message: string, marker?: TemplateMarkerKey): never {
  throw new TemplateError(code, message, marker);
}

/** 六个标记的规范序（恒取 `TEMPLATE_MARKERS` 键序，不自立第二份顺序）。 */
const MARKER_KEYS = Object.keys(TEMPLATE_MARKERS) as TemplateMarkerKey[];

/** 包裹标签（唯一真相源 `ASSET_WRAPPERS`；本文件不写 `<style>`／`<script>` 字面量）。 */
const WRAP_OPEN_TAGS: readonly string[] = Object.values(ASSET_WRAPPERS).map((w) => w.openTag);
const WRAP_CLOSE_TAGS: readonly string[] = Object.values(ASSET_WRAPPERS).map((w) => w.closeTag);
/** 标签名形式（`<style>` → `style`），供不变量②的 `enclosing-open-tag` 判定使用。 */
const WRAP_TAG_NAMES: readonly string[] = [...new Set(WRAP_OPEN_TAGS.map((tag) => tag.slice(1, -1)))];

/** 资产键 → 标记键（查 `ASSET_MARKER_KEYS`，不自立第二份映射表）。 */
function assetKeyForMarker(marker: TemplateMarkerKey): keyof TemplateAssets | null {
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
function replaceFirst(text: string, literal: string, replacement: string): string {
  const index = text.indexOf(literal);
  if (index < 0) return text;
  return text.slice(0, index) + replacement + text.slice(index + literal.length);
}

/** 六标记计数（键序恒 `TEMPLATE_MARKERS`）。 */
function countMarkers(template: string): Record<TemplateMarkerKey, number> {
  const counts = {} as Record<TemplateMarkerKey, number>;
  for (const key of MARKER_KEYS) counts[key] = countOccurrences(template, TEMPLATE_MARKERS[key]);
  return counts;
}

/** 分型判定（恒读 `TEMPLATE_KIND_RULE`）：`required` 各恰 1 次且 `forbidden` 各 0 次。
 *
 * 计数 > 1 的模板**不属分型判定面**（规则只对 0／1 次计数试配）→ 返回 `null`，
 * 由 `TEMPLATE_CHECK_ORDER` 的首个命中码报错（计数 > 1 → `marker-duplicate`）。
 */
function kindOf(counts: Record<TemplateMarkerKey, number>): TemplateKind | null {
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
function preWrappedMarker(template: string): TemplateMarkerKey | null {
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
function locateContainer(template: string, markerIndex: number): ContainerProbe | null {
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

/** 零依赖信封校验（`strict: true` 时追加）：`data` 是对象且含五字段、`shape` ∈ 六形状。
 *  **不调用** base-link-core 的 `parseEnvelope`（AC-13）。 */
function isEnvelopeLike(data: unknown): boolean {
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
function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** 统一占位符填充器（冻结签名 `(input: FillTemplateInput): FillTemplateOutput`）。
 *
 * 判定按 `TEMPLATE_CHECK_ORDER` 逐阶段进行，**首个命中即抛、不聚合**；全部通过后按
 * `INJECTION_ORDER` 依次替换四个注入步（资产由本填充器按 `ASSET_WRAPPERS` 包裹），
 * 最后替换正文槽位（`content` 不占 `INJECTION_ORDER` 的位置，载荷槽两成员互斥，
 * 故与四个注入步**无先后语义**，契约 §3.1.2①）。
 */
export function fillTemplate(input: FillTemplateInput): FillTemplateOutput {
  const source: FillTemplateInput = input ?? ({} as FillTemplateInput);
  const template = typeof source.template === 'string' ? source.template : '';
  const assets = (source.assets ?? {}) as TemplateAssets;

  const counts = countMarkers(template);
  const exempt = counts.noShared === 1;
  const kind = kindOf(counts);
  const dataPage = kind === 'data-page';
  const contentPage = kind === 'content-page';
  const expectedDataScriptId: string = source.dataScriptId ?? CONTAINER_CHECK_RULE.id;
  /** SHARED 两标记（由冻结的 `exemptable` 判定，不自立名单）。 */
  const sharedKeys = MARKER_KEYS.filter((key) => MARKER_RULES[key].exemptable);

  /** `data` 的 JSON 序列化（惰性 + 记忆化）；不可序列化 → `null`。 */
  let serialized: string | null | undefined;
  const serializeData = (): string | null => {
    if (serialized !== undefined) return serialized;
    try {
      const text = JSON.stringify(source.data);
      serialized = typeof text === 'string' ? text : null;
    } catch {
      serialized = null;
    }
    return serialized;
  };

  /** 八个阶段（键 = `TEMPLATE_ERROR_CODES` 全量；缺一个即编译红）。
   *  执行顺序恒读 `TEMPLATE_CHECK_ORDER`，本表不自带次序。 */
  const stages: Record<TemplateErrorCode, () => void> = {
    // ① 数量规则：任一标记出现 > 1 次（`MARKER_RULES` 三个档位的上限都是 1）。
    'marker-duplicate': () => {
      const duplicated = MARKER_KEYS.find((key) => counts[key] > 1);
      if (duplicated === undefined) return;
      fail(
        'marker-duplicate',
        '标记重复：' + TEMPLATE_MARKERS[duplicated] + ' 出现 ' + counts[duplicated] + ' 次（规则 '
          + MARKER_RULES[duplicated].rule + ' 上限 1）',
        duplicated,
      );
    },
    // ② 必需标记／载荷槽缺失（`PAYLOAD_SLOT_RULE.missingCode`）。
    'marker-missing': () => {
      if (PAYLOAD_SLOT_RULE.members.every((member) => counts[member] === 0)) {
        fail(
          PAYLOAD_SLOT_RULE.missingCode,
          '载荷槽缺失：' + PAYLOAD_SLOT_RULE.members.map((m) => TEMPLATE_MARKERS[m]).join(' 与 ')
            + ' 必须恰有其一（' + PAYLOAD_SLOT_RULE.rule + '）',
        );
      }
      const missing = MARKER_KEYS.find((key) => {
        const rule = MARKER_RULES[key];
        if (!rule.required || counts[key] !== 0) return false;
        return !(rule.exemptable && exempt);
      });
      if (missing === undefined) return;
      fail('marker-missing', '必需标记缺失：' + TEMPLATE_MARKERS[missing] + ' 未出现且未被豁免', missing);
    },
    // ③ 冲突：两载荷槽皆有 ／ NO-SHARED 与 SHARED 并存 ／ 共享资产标记被预包裹。
    'marker-conflict': () => {
      if (PAYLOAD_SLOT_RULE.members.every((member) => counts[member] >= 1)) {
        fail(
          PAYLOAD_SLOT_RULE.conflictCode,
          '载荷槽冲突：' + PAYLOAD_SLOT_RULE.members.map((m) => TEMPLATE_MARKERS[m]).join(' 与 ')
            + ' 同时出现（' + PAYLOAD_SLOT_RULE.rule + '）',
        );
      }
      if (exempt) {
        const present = sharedKeys.filter((key) => counts[key] > 0);
        if (present.length > 0) {
          fail(
            ASSET_WRAP_RULE.markerPreWrappedCode,
            'NO-SHARED 与 SHARED 并存：声明豁免后 ' + present.map((k) => TEMPLATE_MARKERS[k]).join('／')
              + ' 必须为 0（互斥）',
            present[0],
          );
        }
      }
      const preWrapped = preWrappedMarker(template);
      if (preWrapped === null) return;
      fail(
        WRAP_PREDICATES.forbidPreWrappedMarker.code,
        '标记被预包裹（不变量② forbidPreWrappedMarker，判定 '
          + WRAP_PREDICATES.forbidPreWrappedMarker.method + '）：' + TEMPLATE_MARKERS[preWrapped]
          + ' 落在未闭合的包裹标签内，须由填充器包裹',
        preWrapped,
      );
    },
    // ④ 容器：**仅当模板含 `injectData` 时**执行（`CONTAINER_CHECK_RULE.appliesWhenMarker`）。
    'container-missing': () => {
      if (counts[CONTAINER_CHECK_RULE.appliesWhenMarker] === 0) return;
      const markerIndex = template.indexOf(TEMPLATE_MARKERS[CONTAINER_CHECK_RULE.appliesWhenMarker]);
      const container = markerIndex < 0 ? null : locateContainer(template, markerIndex);
      if (container === null) {
        fail(
          CONTAINER_CHECK_RULE.code,
          '缺自带容器：' + TEMPLATE_MARKERS[CONTAINER_CHECK_RULE.appliesWhenMarker] + ' 必须落在 '
            + CONTAINER_CHECK_RULE.openTag + '…' + CONTAINER_CHECK_RULE.closeTag + ' 内（id='
            + expectedDataScriptId + ' type=' + CONTAINER_CHECK_RULE.type + '）',
          CONTAINER_CHECK_RULE.appliesWhenMarker,
        );
      }
      if (container.id !== expectedDataScriptId || container.type !== CONTAINER_CHECK_RULE.type) {
        fail(
          CONTAINER_CHECK_RULE.code,
          '容器 id／type 不符：期望 id=' + expectedDataScriptId + ' type=' + CONTAINER_CHECK_RULE.type
            + '，实际 id=' + String(container.id) + ' type=' + String(container.type),
          CONTAINER_CHECK_RULE.appliesWhenMarker,
        );
      }
    },
    // ⑤ 资产：被消费的资产为空串或自带包裹标签（不变量① `assetsBare`）。
    'asset-missing': () => {
      for (const step of INJECTION_ORDER) {
        if (counts[step] === 0) continue; // 未被消费（含 NO-SHARED 豁免缺席）不校验（F-3）
        const assetKey = assetKeyForMarker(step);
        if (assetKey === null) continue;
        const value = assets[assetKey];
        if (typeof value !== 'string' || value === '') {
          fail(
            ASSET_WRAP_RULE.assetWrappedCode,
            '资产为空串或未提供：assets.' + assetKey + '（标记 ' + TEMPLATE_MARKERS[step] + ' 被消费）',
            step,
          );
        }
        const trimmed = value.trim();
        const selfWrapped = WRAP_OPEN_TAGS.some((tag) => trimmed.startsWith(tag))
          || WRAP_CLOSE_TAGS.some((tag) => trimmed.endsWith(tag));
        if (selfWrapped) {
          fail(
            ASSET_WRAP_RULE.assetWrappedCode,
            '资产自带包裹标签（不变量① assetsBare，判定 ' + WRAP_PREDICATES.assetsBare.method
              + '）：assets.' + assetKey,
            step,
          );
        }
      }
    },
    // ⑥ 数据：数据页 `data === undefined` 或不可 JSON 序列化。
    'data-missing': () => {
      if (!dataPage) return; // 内容页忽略 `data`（#118 D-8 裁定 2）
      if (source.data === undefined) {
        fail('data-missing', '数据页缺 data：' + TEMPLATE_MARKERS.injectData + ' 必须由调用方提供场景数据', 'injectData');
      }
      if (serializeData() === null) {
        fail('data-missing', 'data 不可 JSON 序列化（循环引用／BigInt／函数等）', 'injectData');
      }
    },
    // ⑦ 正文：内容页 `content === undefined`（`''` 视为已提供，合法）。
    'content-missing': () => {
      if (!contentPage) return; // 数据页忽略 `content`
      if (source.content === undefined) {
        fail('content-missing', '内容页缺 content：' + TEMPLATE_MARKERS.content + ' 必须由调用方提供正文 HTML', 'content');
      }
    },
    // ⑧ 信封：`strict: true` 且数据页信封校验失败（内容页忽略，契约 §3.1「--strict 校验语义」）。
    'strict-invalid': () => {
      if (source.strict !== true || !dataPage) return;
      if (isEnvelopeLike(source.data)) return;
      fail(
        'strict-invalid',
        'strict 信封校验失败：data 必须是对象且含 ' + STRICT_ENVELOPE_FIELDS.join('／')
          + ' 五字段，shape ∈ ' + STRICT_ENVELOPE_SHAPES.join('／'),
      );
    },
  };

  for (const code of TEMPLATE_CHECK_ORDER) stages[code]();

  // 检查全过 → 分型必命中（两载荷槽皆有已在阶段 ③ 拦截、计数 > 1 已在阶段 ① 拦截）。
  if (kind === null) fail(TEMPLATE_KIND_RULE.legacy.noKindCode, '模板不属任何分型（三型皆不命中）');

  /** 已替换的标记（`filled` 口径 = 该标记被替换）。 */
  const filled = new Set<TemplateMarkerKey>();
  let html = template;

  // 四个注入步：顺序恒读 `INJECTION_ORDER`（`content` 不在其中，见下）。
  for (const step of INJECTION_ORDER) {
    if (counts[step] === 0) continue;
    const assetKey = assetKeyForMarker(step);
    const replacement = assetKey === null
      // injectData：只替换标记文本，**不生成／不补写**容器（容器由模板自带，FX-2①②）；
      // JSON 文本中 `<` 一律写成反斜杠 + `TEXT_JSON_LT_RULE`（冻结常量，§3.1／§3.4 同口径），
      // 防 `</script>` 断标签——**不写第二份转义字面量**（FX-74-2）。
      ? (serializeData() ?? '').replace(/</g, '\\' + TEXT_JSON_LT_RULE)
      // 资产：裸文本 ＋ 填充器包裹（`ASSET_WRAPPERS` 逐字，不双包）。
      : ASSET_WRAPPERS[assetKey].openTag + String(assets[assetKey] ?? '') + ASSET_WRAPPERS[assetKey].closeTag;
    html = replaceFirst(html, TEMPLATE_MARKERS[step], replacement);
    filled.add(step);
  }

  // 正文槽位：只做标记文本替换，不生产、不转义正文（转义责任在产出正文的技能侧）。
  if (counts.content === 1) {
    html = replaceFirst(html, TEMPLATE_MARKERS.content, String(source.content ?? ''));
    filled.add('content');
  }

  const markers: readonly MarkerReport[] = MARKER_KEYS.map((key) => ({
    key,
    literal: TEMPLATE_MARKERS[key],
    rule: MARKER_RULES[key].rule,
    count: counts[key],
    filled: filled.has(key),
  }));

  const report: FillTemplateReport = {
    markers,
    strict: source.strict === true,
    exempt,
    bytes: utf8Bytes(html),
  };
  return { html, report };
}
