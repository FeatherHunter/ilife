/** template · fill
 *
 *  自 `src/template.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/template.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { MARKER_KEYS, WRAP_CLOSE_TAGS, WRAP_OPEN_TAGS, assetKeyForMarker, countMarkers, isEnvelopeLike, kindOf, locateContainer, preWrappedMarker, replaceFirst, utf8Bytes } from './markers.js';
import { fail } from './shared.js';
import { ASSET_WRAPPERS, ASSET_WRAP_RULE, CONTAINER_CHECK_RULE, FillTemplateInput, FillTemplateOutput, FillTemplateReport, INJECTION_ORDER, MARKER_RULES, MarkerReport, PAYLOAD_SLOT_RULE, STRICT_ENVELOPE_FIELDS, STRICT_ENVELOPE_SHAPES, TEMPLATE_CHECK_ORDER, TEMPLATE_KIND_RULE, TEMPLATE_MARKERS, TemplateAssets, TemplateErrorCode, TemplateMarkerKey, WRAP_PREDICATES } from '../../spec/template.js';
import { TEXT_JSON_LT_RULE } from '../../spec/text.js';
import { m } from '../../entries/index.js';

/** 几个标记名用「与」连起来（`NO-SHARED 与 SHARED`）。 */
function markerNames(keys: readonly TemplateMarkerKey[]): string {
  return keys.map((key) => TEMPLATE_MARKERS[key]).join(m('base-render.components-template-fill.c001'));
}

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
        m('base-render.components-template-fill.c002', {
          p0: String(TEMPLATE_MARKERS[duplicated]),
          p1: String(counts[duplicated]),
          p2: String(MARKER_RULES[duplicated].rule),
        }),
        duplicated,
      );
    },
    // ② 必需标记／载荷槽缺失（`PAYLOAD_SLOT_RULE.missingCode`）。
    'marker-missing': () => {
      if (PAYLOAD_SLOT_RULE.members.every((member) => counts[member] === 0)) {
        fail(
          PAYLOAD_SLOT_RULE.missingCode,
          m('base-render.components-template-fill.c003', {
            p0: String(markerNames(PAYLOAD_SLOT_RULE.members)),
            p1: String(PAYLOAD_SLOT_RULE.rule),
          }),
        );
      }
      const missing = MARKER_KEYS.find((key) => {
        const rule = MARKER_RULES[key];
        if (!rule.required || counts[key] !== 0) return false;
        return !(rule.exemptable && exempt);
      });
      if (missing === undefined) return;
      fail('marker-missing', m('base-render.components-template-fill.c004', { p0: String(TEMPLATE_MARKERS[missing]) }), missing);
    },
    // ③ 冲突：两载荷槽皆有 ／ NO-SHARED 与 SHARED 并存 ／ 共享资产标记被预包裹。
    'marker-conflict': () => {
      if (PAYLOAD_SLOT_RULE.members.every((member) => counts[member] >= 1)) {
        fail(
          PAYLOAD_SLOT_RULE.conflictCode,
          m('base-render.components-template-fill.c005', {
            p0: String(markerNames(PAYLOAD_SLOT_RULE.members)),
            p1: String(PAYLOAD_SLOT_RULE.rule),
          }),
        );
      }
      if (exempt) {
        const present = sharedKeys.filter((key) => counts[key] > 0);
        if (present.length > 0) {
          fail(
            ASSET_WRAP_RULE.markerPreWrappedCode,
            m('base-render.components-template-fill.c006', {
              p0: String(present.map((k) => TEMPLATE_MARKERS[k]).join('／')),
            }),
            present[0],
          );
        }
      }
      const preWrapped = preWrappedMarker(template);
      if (preWrapped === null) return;
      fail(
        WRAP_PREDICATES.forbidPreWrappedMarker.code,
        m('base-render.components-template-fill.c007', {
          p0: String(WRAP_PREDICATES.forbidPreWrappedMarker.method),
          p1: String(TEMPLATE_MARKERS[preWrapped]),
        }),
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
          m('base-render.components-template-fill.c008', {
            p0: String(TEMPLATE_MARKERS[CONTAINER_CHECK_RULE.appliesWhenMarker]),
            p1: String(CONTAINER_CHECK_RULE.openTag),
            p2: String(CONTAINER_CHECK_RULE.closeTag),
            p3: String(expectedDataScriptId),
            p4: String(CONTAINER_CHECK_RULE.type),
          }),
          CONTAINER_CHECK_RULE.appliesWhenMarker,
        );
      }
      if (container.id !== expectedDataScriptId || container.type !== CONTAINER_CHECK_RULE.type) {
        fail(
          CONTAINER_CHECK_RULE.code,
          m('base-render.components-template-fill.c009', {
            p0: String(expectedDataScriptId),
            p1: String(CONTAINER_CHECK_RULE.type),
            p2: String(String(container.id)),
            p3: String(String(container.type)),
          }),
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
            m('base-render.components-template-fill.c010', {
              p0: String(assetKey),
              p1: String(TEMPLATE_MARKERS[step]),
            }),
            step,
          );
        }
        const trimmed = value.trim();
        const selfWrapped = WRAP_OPEN_TAGS.some((tag) => trimmed.startsWith(tag))
          || WRAP_CLOSE_TAGS.some((tag) => trimmed.endsWith(tag));
        if (selfWrapped) {
          fail(
            ASSET_WRAP_RULE.assetWrappedCode,
            m('base-render.components-template-fill.c011', {
              p0: String(WRAP_PREDICATES.assetsBare.method),
              p1: String(assetKey),
            }),
            step,
          );
        }
      }
    },
    // ⑥ 数据：数据页 `data === undefined` 或不可 JSON 序列化。
    'data-missing': () => {
      if (!dataPage) return; // 内容页忽略 `data`（#118 D-8 裁定 2）
      if (source.data === undefined) {
        fail('data-missing', m('base-render.components-template-fill.c012', { p0: String(TEMPLATE_MARKERS.injectData) }), 'injectData');
      }
      if (serializeData() === null) {
        fail('data-missing', m('base-render.components-template-fill.c013'), 'injectData');
      }
    },
    // ⑦ 正文：内容页 `content === undefined`（`''` 视为已提供，合法）。
    'content-missing': () => {
      if (!contentPage) return; // 数据页忽略 `content`
      if (source.content === undefined) {
        fail('content-missing', m('base-render.components-template-fill.c014', { p0: String(TEMPLATE_MARKERS.content) }), 'content');
      }
    },
    // ⑧ 信封：`strict: true` 且数据页信封校验失败（内容页忽略，契约 §3.1「--strict 校验语义」）。
    'strict-invalid': () => {
      if (source.strict !== true || !dataPage) return;
      if (isEnvelopeLike(source.data)) return;
      fail(
        'strict-invalid',
        m('base-render.components-template-fill.c015', {
          p0: String(STRICT_ENVELOPE_FIELDS.join('／')),
          p1: String(STRICT_ENVELOPE_SHAPES.join('／')),
        }),
      );
    },
  };

  for (const code of TEMPLATE_CHECK_ORDER) stages[code]();

  // 检查全过 → 分型必命中（两载荷槽皆有已在阶段 ③ 拦截、计数 > 1 已在阶段 ① 拦截）。
  if (kind === null) fail(TEMPLATE_KIND_RULE.legacy.noKindCode, m('base-render.components-template-fill.c016'));

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
