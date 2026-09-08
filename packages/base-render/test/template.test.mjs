// #74 统一占位符填充器 · 行为测试（node:test；随 root `pnpm test` 跑）。
//
// 覆盖（逐条对齐施工单 A1–A9）：
//  A1 六标记数量规则（含 NO-SHARED 豁免与互斥）／A2 载荷槽规则／A3 容器校验作用域／
//  A4 包裹约定（两条不变量）／A5 判定次序（首个命中即抛）／A6 八个错误码逐条可达＋不返空／
//  A7 strict 两档（禁调 parseEnvelope）／A8 零残留标记（真实 53 内容页 ＋ 6 数据页）／
//  A9 calorie 6 模板 → marker-missing（正确行为）。
//
// 纪律：资产一律**自造合法 fixture**（三个产出者 #75／#76／#78 仍 pending，契约 §6.1
// 「跨票产出者依赖」）；**不把 `asset-missing` 当通过**——凡用到资产的用例都断言填充成功。
// 标记字面量／包裹标签／错误码**全部读冻结常量**，测试内不自带第二份副本。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ASSET_MARKER_KEYS,
  ASSET_WRAPPERS,
  ASSET_WRAP_RULE,
  CONTAINER_CHECK_RULE,
  DATA_SCRIPT_TYPE,
  DEFAULT_DATA_SCRIPT_ID,
  INJECTION_ORDER,
  MARKER_RULES,
  PAYLOAD_SLOT_RULE,
  RenderError,
  STRICT_ENVELOPE_FIELDS,
  STRICT_ENVELOPE_SHAPES,
  TEMPLATE_CHECK_ORDER,
  TEMPLATE_ERROR_CODES,
  TEMPLATE_KINDS,
  TEMPLATE_MARKERS,
  WRAP_PREDICATES,
  fillTemplate,
} from '../dist/index.js';
import { TemplateError } from '../dist/template.js';

const LF = String.fromCharCode(10);
const M = TEMPLATE_MARKERS;
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** 自造合法资产（裸文本；不引 #75／#76／#78 的产出者）。 */
const FIXTURE_ASSETS = Object.freeze({
  sharedCssText: ':root{--fg:#1d1d1f;--blue:#007aff}',
  sharedHelpersJs: '(function(){document.addEventListener("click",function(ev){void ev.target;});}());',
  chartsHelpersJs: '(function(){var s=document.createElement("style");s.id="ilife-charts";document.head.appendChild(s);}());',
});

/** 数据页：自带 payload 容器；`<style>`／`<script>` 由**填充器**包裹，模板只放裸标记。 */
function dataPageTemplate({
  css = true, helpers = true, charts = false,
  payload = '<script id="' + DEFAULT_DATA_SCRIPT_ID + '" type="' + DATA_SCRIPT_TYPE + '">' + M.injectData + '</script>',
  body = '<p>数据页</p>',
} = {}) {
  return [
    '<!doctype html><html><head>',
    css ? M.sharedCss : '',
    '</head><body>',
    body,
    payload,
    helpers ? M.sharedHelpers : '',
    charts ? M.chartsHelpers : '',
    '</body></html>',
  ].filter((line) => line !== '').join(LF);
}

/** 内容页：无 payload 容器（**合法**）；正文槽位装 `<!--CONTENT-->`。 */
function contentPageTemplate({
  css = true, helpers = true, charts = false, content = M.content, body = '<p>正文区</p>',
} = {}) {
  return [
    '<!doctype html><html><head>',
    css ? M.sharedCss : '',
    '</head><body><div class="page">',
    body,
    content,
    '</div>',
    helpers ? M.sharedHelpers : '',
    charts ? M.chartsHelpers : '',
    '</body></html>',
  ].filter((line) => line !== '').join(LF);
}

const ENVELOPE = Object.freeze({
  version: '0.1.0', skill: 'demo', shape: 'list', key: 'demo.items', data: { items: ['a', 'b'] },
});

/** 失败必须抛 `TemplateError`（不返空页）——返回该错误供逐字段断言。 */
function catchError(input) {
  try {
    const out = fillTemplate(input);
    assert.fail('必须抛 TemplateError，不得返回：html=' + JSON.stringify(out.html).slice(0, 80));
  } catch (err) {
    assert.ok(err instanceof TemplateError, '必须是 TemplateError，实为 ' + (err && err.constructor && err.constructor.name));
    return err;
  }
}

function expectCode(input, code, marker) {
  const err = catchError(input);
  assert.equal(err.name, 'TemplateError', '错误形态 name 逐字（TemplateErrorShape）');
  assert.equal(err.code, code, '错误码：' + err.message);
  assert.ok(typeof err.message === 'string' && err.message.length > 0, '一码多义必须由 message 辨因');
  if (marker !== undefined) assert.equal(err.marker, marker, 'marker 归因：' + err.message);
  return err;
}

const countOf = (text, needle) => text.split(needle).length - 1;

describe('A1 六标记数量规则（含 NO-SHARED 豁免与互斥）', () => {
  it('SHARED-CSS／SHARED-HELPERS 缺席（未豁免）→ marker-missing；重复 → marker-duplicate', () => {
    expectCode(
      { template: contentPageTemplate({ css: false }), assets: FIXTURE_ASSETS, content: '<p>x</p>' },
      'marker-missing', 'sharedCss',
    );
    expectCode(
      { template: contentPageTemplate({ helpers: false }), assets: FIXTURE_ASSETS, content: '<p>x</p>' },
      'marker-missing', 'sharedHelpers',
    );
    expectCode(
      { template: contentPageTemplate().replace(M.sharedCss, M.sharedCss + LF + M.sharedCss), assets: FIXTURE_ASSETS, content: '<p>x</p>' },
      'marker-duplicate', 'sharedCss',
    );
    expectCode(
      { template: contentPageTemplate().replace(M.sharedHelpers, M.sharedHelpers + LF + M.sharedHelpers), assets: FIXTURE_ASSETS, content: '<p>x</p>' },
      'marker-duplicate', 'sharedHelpers',
    );
    for (const key of ['sharedCss', 'sharedHelpers']) {
      assert.equal(MARKER_RULES[key].rule, 'exactly-one', key + ' 必须恰好 1 次');
      assert.equal(MARKER_RULES[key].exemptable, true, key + ' 可被 NO-SHARED 豁免');
    }
  });

  it('CHARTS-HELPERS：0 次合法；1 次缺资产 → asset-missing；1 次齐 → 被包裹填充；2 次 → marker-duplicate', () => {
    const none = fillTemplate({ template: contentPageTemplate(), assets: FIXTURE_ASSETS, content: '<p>x</p>' });
    // FX-74-1：原断言「模板本就不含该标记」恒真（零信息）。改为有鉴别力的两条——
    // ① 未被消费的资产**不得被注入**（实现若「无脑注入三个资产」即红）；② report 逐值。
    assert.ok(!none.html.includes(FIXTURE_ASSETS.chartsHelpersJs), '0 次合法：未被消费的 charts 资产不得出现在输出');
    const chartsRow = none.report.markers.find((m) => m.key === 'chartsHelpers');
    assert.equal(chartsRow.count, 0, 'chartsHelpers 计数 0');
    assert.equal(chartsRow.filled, false, 'chartsHelpers 未被替换（0 次不是注入步）');
    expectCode(
      { template: contentPageTemplate({ charts: true }), assets: { sharedCssText: FIXTURE_ASSETS.sharedCssText, sharedHelpersJs: FIXTURE_ASSETS.sharedHelpersJs }, content: '<p>x</p>' },
      'asset-missing', 'chartsHelpers',
    );
    const one = fillTemplate({ template: contentPageTemplate({ charts: true }), assets: FIXTURE_ASSETS, content: '<p>x</p>' });
    assert.ok(one.html.includes(ASSET_WRAPPERS.chartsHelpersJs.openTag + FIXTURE_ASSETS.chartsHelpersJs + ASSET_WRAPPERS.chartsHelpersJs.closeTag),
      'charts 资产必须被逐字包裹');
    expectCode(
      { template: contentPageTemplate({ charts: true }).replace(M.chartsHelpers, M.chartsHelpers + LF + M.chartsHelpers), assets: FIXTURE_ASSETS, content: '<p>x</p>' },
      'marker-duplicate', 'chartsHelpers',
    );
  });

  it('NO-SHARED 豁免：SHARED 两标记缺席合法（exempt=true、filled=false、count=0）', () => {
    const template = ['<!doctype html><html><body>', M.noShared, '<div class="page">', M.content, '</div></body></html>'].join(LF);
    const out = fillTemplate({ template, assets: FIXTURE_ASSETS, content: '<p>豁免页正文</p>' });
    assert.equal(out.report.exempt, true);
    assert.ok(out.html.includes('<p>豁免页正文</p>'));
    assert.ok(!out.html.includes(M.content), 'A8：正文标记零残留');
    for (const key of ['sharedCss', 'sharedHelpers']) {
      const row = out.report.markers.find((m) => m.key === key);
      assert.equal(row.count, 0, key + ' 计数 0');
      assert.equal(row.filled, false, key + ' 未被替换');
    }
    const noSharedRow = out.report.markers.find((m) => m.key === 'noShared');
    assert.equal(noSharedRow.count, 1);
    assert.equal(noSharedRow.filled, false, 'NO-SHARED 无填充物（豁免声明本身），原样留在输出');
    assert.ok(out.html.includes(M.noShared), 'NO-SHARED 不是注入步：不替换、不删除');
  });

  it('NO-SHARED 数据页：豁免后 SHARED 缺席 ＋ 资产空串也合法（未被消费不校验，F-3）', () => {
    const template = ['<!doctype html><html><body>', M.noShared,
      '<script id="' + DEFAULT_DATA_SCRIPT_ID + '" type="' + DATA_SCRIPT_TYPE + '">' + M.injectData + '</script>',
      '</body></html>'].join(LF);
    const out = fillTemplate({ template, assets: { sharedCssText: '', sharedHelpersJs: '' }, data: ENVELOPE });
    assert.equal(out.report.exempt, true);
    assert.ok(out.html.includes('"skill":"demo"'), '数据页必须填得动');
    for (const literal of Object.values(M)) {
      if (literal === M.noShared) continue;
      assert.ok(!out.html.includes(literal), '残留标记：' + literal);
    }
  });

  it('NO-SHARED 与 SHARED 并存 → marker-conflict；NO-SHARED 重复 → marker-duplicate', () => {
    const both = ['<!doctype html><html><body>', M.noShared, M.sharedCss, M.content, '</body></html>'].join(LF);
    expectCode({ template: both, assets: FIXTURE_ASSETS, content: '<p>x</p>' }, 'marker-conflict', 'sharedCss');
    const dup = ['<!doctype html><html><body>', M.noShared, M.noShared, M.content, '</body></html>'].join(LF);
    expectCode({ template: dup, assets: FIXTURE_ASSETS, content: '<p>x</p>' }, 'marker-duplicate', 'noShared');
  });

  it('载荷槽两标记各自重复 → marker-duplicate（不是 marker-conflict）', () => {
    expectCode(
      { template: dataPageTemplate({ payload: '<script id="payload" type="application/json">' + M.injectData + M.injectData + '</script>' }), assets: FIXTURE_ASSETS, data: ENVELOPE },
      'marker-duplicate', 'injectData',
    );
    expectCode(
      { template: contentPageTemplate({ content: M.content + LF + M.content }), assets: FIXTURE_ASSETS, content: '<p>x</p>' },
      'marker-duplicate', 'content',
    );
  });

  // FX-74-3（V1 未覆盖边界 5）：NO-SHARED 与「SHARED-CSS 重复」并存时取次序靠前者。
  it('NO-SHARED ＋ SHARED-CSS×2 → marker-duplicate（次序 1 早于 3 的互斥判定）', () => {
    const template = ['<!doctype html><html><body>', M.noShared, M.sharedCss, M.sharedCss, M.content, '</body></html>'].join(LF);
    expectCode({ template, assets: FIXTURE_ASSETS, content: '<p>x</p>' }, 'marker-duplicate', 'sharedCss');
  });

  // FX-74-3（V1 未覆盖边界 8）：多个标记同时重复时 `marker` 的归因（契约未规定，
  // 实现口径 = 恒读 `TEMPLATE_MARKERS` 键序的首个重复项——本用例把该口径钉住）。
  it('多标记同时重复：marker 归因取 TEMPLATE_MARKERS 键序首个重复项（content 早于 sharedCss）', () => {
    const template = ['<!doctype html><html><head>', M.sharedCss, M.sharedCss, '</head><body><div>', M.content, M.content, '</div>', M.sharedHelpers, '</body></html>'].join(LF);
    const dupKeys = Object.keys(M).filter((key) => countOf(template, M[key]) > 1);
    assert.deepEqual(dupKeys, ['content', 'sharedCss'], '样本必须让两处标记同时重复');
    const err = expectCode({ template, assets: FIXTURE_ASSETS, content: '<p>x</p>' }, 'marker-duplicate', dupKeys[0]);
    assert.ok(err.message.includes(M[dupKeys[0]]), 'message 必须点名实际归因的标记：' + err.message);
  });
});

describe('A2 载荷槽规则（恰有其一）', () => {
  it('两者都有 → marker-conflict；两者都无 → marker-missing（legacy）', () => {
    const both = ['<!doctype html><html><head>', M.sharedCss, '</head><body><div class="page">', M.content, '</div>',
      '<script id="payload" type="application/json">' + M.injectData + '</script>', M.sharedHelpers, '</body></html>'].join(LF);
    expectCode({ template: both, assets: FIXTURE_ASSETS, data: ENVELOPE, content: '<p>x</p>' }, 'marker-conflict');
    const legacy = ['<!doctype html><html><head>', M.sharedCss, '</head><body>裸正文', M.sharedHelpers, '</body></html>'].join(LF);
    expectCode({ template: legacy, assets: FIXTURE_ASSETS }, 'marker-missing');
    assert.deepEqual([...PAYLOAD_SLOT_RULE.members], ['injectData', 'content']);
    assert.equal(PAYLOAD_SLOT_RULE.rule, 'exactly-one');
  });

  it('恰有其一：数据页只认 injectData、内容页只认 content（互斥字段互为忽略项）', () => {
    // 数据页忽略 content（传了也不抛 content-missing）
    const page = fillTemplate({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, data: ENVELOPE, content: '被忽略的正文' });
    assert.ok(!page.html.includes('被忽略的正文'), '数据页忽略 content');
    assert.equal(page.report.markers.find((m) => m.key === 'content').count, 0);
    // 内容页忽略 data（含不可序列化的 data 也不抛 data-missing）
    const content = fillTemplate({
      template: contentPageTemplate(),
      assets: FIXTURE_ASSETS,
      content: '<p>正文</p>',
      data: 10n,
    });
    assert.ok(content.html.includes('<p>正文</p>'));
    assert.equal(content.report.markers.find((m) => m.key === 'injectData').count, 0);
  });

  it('内容页 content 缺失 → content-missing；content 空串视为已提供（合法）', () => {
    expectCode({ template: contentPageTemplate(), assets: FIXTURE_ASSETS }, 'content-missing', 'content');
    const empty = fillTemplate({ template: contentPageTemplate(), assets: FIXTURE_ASSETS, content: '' });
    assert.ok(!empty.html.includes(M.content), 'A8：正文标记零残留');
    assert.equal(empty.report.markers.find((m) => m.key === 'content').filled, true, "content: '' 视为已提供");
  });
});

describe('A3 容器校验仅当模板含 INJECT-DATA 时执行', () => {
  it('内容页无容器合法：不抛 container-missing（页内已闭合 <script> 也不算容器）', () => {
    const template = ['<!doctype html><html><head>', M.sharedCss, '</head><body>',
      '<script>var business=1;</script>', '<div class="page">', M.content, '</div>', M.sharedHelpers, '</body></html>'].join(LF);
    const out = fillTemplate({ template, assets: FIXTURE_ASSETS, content: '<p>正文</p>' });
    assert.ok(out.html.includes('<p>正文</p>'), '内容页必须填得动');
    assert.ok(!out.html.includes('id="' + DEFAULT_DATA_SCRIPT_ID + '"'), '填充器不生成容器（FX-2①②）');
    assert.equal(CONTAINER_CHECK_RULE.appliesWhenMarker, 'injectData');
  });

  it('数据页缺容器 → container-missing；id／type 不符 → container-missing（message 辨因）', () => {
    const noContainer = ['<!doctype html><html><head>', M.sharedCss, '</head><body>', M.injectData, M.sharedHelpers, '</body></html>'].join(LF);
    const errMissing = expectCode({ template: noContainer, assets: FIXTURE_ASSETS, data: ENVELOPE }, 'container-missing', 'injectData');
    assert.ok(errMissing.message.includes('缺自带容器'), '缺容器因：' + errMissing.message);
    const badType = dataPageTemplate({ payload: '<script id="payload" type="text/plain">' + M.injectData + '</script>' });
    const errType = expectCode({ template: badType, assets: FIXTURE_ASSETS, data: ENVELOPE }, 'container-missing', 'injectData');
    assert.ok(errType.message.includes('id／type 不符'), 'id／type 因：' + errType.message);
    const badId = dataPageTemplate({ payload: '<script id="help-data" type="application/json">' + M.injectData + '</script>' });
    expectCode({ template: badId, assets: FIXTURE_ASSETS, data: ENVELOPE }, 'container-missing', 'injectData');
  });

  it('容器定位＝最近未闭合开标签：已闭合的容器不算；dataScriptId 可覆盖期望 id', () => {
    // 已闭合的 payload 容器 + 后面的业务 <script>（无 id）→ 最近未闭合开标签 id 不符
    const closedThenScript = ['<!doctype html><html><head>', M.sharedCss, '</head><body>',
      '<script id="payload" type="application/json">{}</script>',
      '<script>' + M.injectData + '</script>', M.sharedHelpers, '</body></html>'].join(LF);
    expectCode({ template: closedThenScript, assets: FIXTURE_ASSETS, data: ENVELOPE }, 'container-missing', 'injectData');
    // dataScriptId 覆盖：自定义 id 必须显式声明
    const custom = dataPageTemplate({ payload: '<script id="scene-data" type="application/json">' + M.injectData + '</script>' });
    expectCode({ template: custom, assets: FIXTURE_ASSETS, data: ENVELOPE }, 'container-missing', 'injectData');
    const ok = fillTemplate({ template: custom, assets: FIXTURE_ASSETS, data: ENVELOPE, dataScriptId: 'scene-data' });
    assert.ok(ok.html.includes('id="scene-data"'), '自带容器原样保留');
    // 属性解析取双引号口径（与 tooling/classify-templates.mjs 同口径）
    const singleQuoted = dataPageTemplate({ payload: "<script id='payload' type='application/json'>" + M.injectData + '</script>' });
    expectCode({ template: singleQuoted, assets: FIXTURE_ASSETS, data: ENVELOPE }, 'container-missing', 'injectData');
  });

  // FX-74-3（V1 未覆盖边界 2）：容器属性的四种形态——两种合法（逐属性解析、与序无关；
  // `data-id` 不误命中 `id`）、三种非法（未加引号／属性值含 `>` 截断标签／标签名大小写敏感）。
  it('容器属性形态：序颠倒与 data-id 诱饵合法；未加引号／属性值含 >／大写 <SCRIPT> → container-missing', () => {
    const fill = (payload) => fillTemplate({ template: dataPageTemplate({ payload }), assets: FIXTURE_ASSETS, data: ENVELOPE });
    const typeFirst = fill('<script type="application/json" id="payload">' + M.injectData + '</script>');
    assert.ok(typeFirst.html.includes('"skill":"demo"'), '属性序颠倒必须合法（逐属性解析，与序无关）');
    const decoy = fill('<script data-id="x" id="payload" type="application/json">' + M.injectData + '</script>');
    assert.ok(decoy.html.includes('"skill":"demo"'), 'data-id 诱饵不得被当成 id（(?:^|\\s) 收严）');
    // 三种非法形态：未加引号（双引号口径）／属性值含 `>`（截断标签）／标签名大小写敏感。
    for (const payload of [
      '<script id=payload type=application/json>' + M.injectData + '</script>',
      '<script id="pay>load" type="application/json">' + M.injectData + '</script>',
      '<SCRIPT id="payload" type="application/json">' + M.injectData + '</SCRIPT>',
    ]) {
      expectCode({ template: dataPageTemplate({ payload }), assets: FIXTURE_ASSETS, data: ENVELOPE }, 'container-missing', 'injectData');
    }
  });
});

describe('A4 包裹约定（资产裸文本 ＋ 填充器包裹；两条不变量）', () => {
  it('三个资产按 ASSET_WRAPPERS 逐字包裹、恰好一次（不双包）', () => {
    const out = fillTemplate({ template: dataPageTemplate({ charts: true }), assets: FIXTURE_ASSETS, data: ENVELOPE });
    for (const [assetKey, markerKey] of Object.entries(ASSET_MARKER_KEYS)) {
      const wrapper = ASSET_WRAPPERS[assetKey];
      const wrapped = wrapper.openTag + FIXTURE_ASSETS[assetKey] + wrapper.closeTag;
      assert.ok(out.html.includes(wrapped), assetKey + ' 必须被逐字包裹：' + wrapped);
      assert.equal(countOf(out.html, FIXTURE_ASSETS[assetKey]), 1, assetKey + ' 资产文本恰好出现一次');
      assert.equal(countOf(out.html, wrapped), 1, assetKey + ' 逐字包裹恰好一次（不双包）');
      assert.equal(out.report.markers.find((m) => m.key === markerKey).filled, true, markerKey + ' 必须被替换');
    }
    assert.ok(!Object.values(M).some((literal) => out.html.includes(literal)), 'A8：六标记零残留');
  });

  it('不变量① assetsBare：资产以包裹标签起／止 → asset-missing；中段含 <script> 字面量合法', () => {
    const page = contentPageTemplate();
    expectCode({ template: page, assets: { ...FIXTURE_ASSETS, sharedCssText: ASSET_WRAPPERS.sharedCssText.openTag + 'a{}' }, content: '<p>x</p>' },
      'asset-missing', 'sharedCss');
    expectCode({ template: page, assets: { ...FIXTURE_ASSETS, sharedCssText: 'a{}' + ASSET_WRAPPERS.sharedCssText.closeTag }, content: '<p>x</p>' },
      'asset-missing', 'sharedCss');
    expectCode({ template: page, assets: { ...FIXTURE_ASSETS, sharedHelpersJs: '  ' + ASSET_WRAPPERS.sharedHelpersJs.openTag + 'x()' }, content: '<p>x</p>' },
      'asset-missing', 'sharedHelpers');
    // 子串命中不算违反（helpers JS 合法拼接 HTML）
    const legal = 'var html="' + ASSET_WRAPPERS.sharedHelpersJs.openTag + 'x' + ASSET_WRAPPERS.sharedHelpersJs.closeTag + '";';
    const out = fillTemplate({ template: page, assets: { ...FIXTURE_ASSETS, sharedHelpersJs: legal }, content: '<p>x</p>' });
    assert.ok(out.html.includes(legal), '中段含包裹标签字面量必须合法（判定方式是 trim 后起止）');
    // 空串 / 未提供 → asset-missing
    expectCode({ template: page, assets: { ...FIXTURE_ASSETS, sharedCssText: '' }, content: '<p>x</p>' }, 'asset-missing', 'sharedCss');
    expectCode({ template: page, assets: { sharedHelpersJs: FIXTURE_ASSETS.sharedHelpersJs }, content: '<p>x</p>' }, 'asset-missing', 'sharedCss');
  });

  it('不变量② forbidPreWrappedMarker：作用域内标记被预包裹 → marker-conflict；injectData／content 不在作用域', () => {
    assert.deepEqual([...WRAP_PREDICATES.forbidPreWrappedMarker.scope].sort(), Object.values(ASSET_MARKER_KEYS).sort());
    assert.deepEqual([...WRAP_PREDICATES.forbidPreWrappedMarker.excludes], ['injectData']);
    // 同行预包裹
    const inline = dataPageTemplate().replace(M.sharedCss, ASSET_WRAPPERS.sharedCssText.openTag + M.sharedCss + ASSET_WRAPPERS.sharedCssText.closeTag);
    expectCode({ template: inline, assets: FIXTURE_ASSETS, data: ENVELOPE }, 'marker-conflict', 'sharedCss');
    // 跨行预包裹同样命中（扫描整个前缀，不限同行）
    const multiline = dataPageTemplate().replace(M.sharedHelpers, ASSET_WRAPPERS.sharedHelpersJs.openTag + LF + M.sharedHelpers + LF + ASSET_WRAPPERS.sharedHelpersJs.closeTag);
    expectCode({ template: multiline, assets: FIXTURE_ASSETS, data: ENVELOPE }, 'marker-conflict', 'sharedHelpers');
    // S-2：数据页的 INJECT-DATA 天生落在自带容器内 → 不算预包裹
    const dataOk = fillTemplate({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, data: ENVELOPE });
    assert.ok(dataOk.html.includes('"' + DEFAULT_DATA_SCRIPT_ID + '"'), '数据页必须填得动（容器不是预包裹）');
    // content 不在作用域：正文槽位落在 <script> 内也不报 marker-conflict
    const contentInScript = ['<!doctype html><html><head>', M.sharedCss, '</head><body><script>', M.content, '</script>', M.sharedHelpers, '</body></html>'].join(LF);
    const out = fillTemplate({ template: contentInScript, assets: FIXTURE_ASSETS, content: '<p>正文</p>' });
    assert.ok(out.html.includes('<p>正文</p>'), 'content 不在不变量②作用域内');
  });

  // FX-74-3（V1 未覆盖边界 1）：作者此前只用 deepEqual 钉死作用域常量，没有真实抛错样本。
  it('不变量②：chartsHelpers 被预包裹 → marker-conflict（作用域第三个标记的真实样本）', () => {
    const template = contentPageTemplate({ charts: true })
      .replace(M.chartsHelpers, ASSET_WRAPPERS.chartsHelpersJs.openTag + M.chartsHelpers + ASSET_WRAPPERS.chartsHelpersJs.closeTag);
    const err = expectCode({ template, assets: FIXTURE_ASSETS, content: '<p>x</p>' }, 'marker-conflict', 'chartsHelpers');
    assert.ok(err.message.includes('预包裹'), 'message 必须辨因为「标记被预包裹」：' + err.message);
    // 对照：同一模板去掉预包裹即合法填充（证明上一条的红来自预包裹，不是别的原因）
    const ok = fillTemplate({ template: contentPageTemplate({ charts: true }), assets: FIXTURE_ASSETS, content: '<p>x</p>' });
    assert.ok(ok.html.includes(FIXTURE_ASSETS.chartsHelpersJs), '裸 charts 标记必须正常填充');
  });

  // FX-74-3（V1 未覆盖边界 4）：契约只写「空串」不合法；纯空白资产按字面（只判 `''`）合法并被包裹。
  it('资产为纯空白（非空串）：按字面合法，且必须被逐字包裹（契约未规定，登记为不冻结也不排除）', () => {
    const blank = '   ';
    const out = fillTemplate({ template: contentPageTemplate(), assets: { ...FIXTURE_ASSETS, sharedCssText: blank }, content: '<p>x</p>' });
    assert.ok(out.html.includes(ASSET_WRAPPERS.sharedCssText.openTag + blank + ASSET_WRAPPERS.sharedCssText.closeTag),
      '纯空白资产必须被逐字包裹（实现只判字面空串）');
    assert.equal(out.report.markers.find((m) => m.key === 'sharedCss').filled, true);
  });
});

describe('A5 判定次序：多条件输入首个命中即抛（不聚合）', () => {
  it('TEMPLATE_CHECK_ORDER 是 8 码的排列，且真实 calorie 形态取 marker-missing', () => {
    assert.deepEqual([...TEMPLATE_CHECK_ORDER].sort(), [...TEMPLATE_ERROR_CODES].sort());
    assert.equal(new Set(TEMPLATE_CHECK_ORDER).size, TEMPLATE_CHECK_ORDER.length);
    // 样本①：legacy（两载荷槽皆无）＋ SHARED-CSS 预包裹 ＋ 空资产 → 次序 2 marker-missing 早于 3／5
    const legacy = ['<!doctype html><html><head>', ASSET_WRAPPERS.sharedCssText.openTag + M.sharedCss + ASSET_WRAPPERS.sharedCssText.closeTag,
      '</head><body>', M.sharedHelpers, '</body></html>'].join(LF);
    expectCode({ template: legacy, assets: { ...FIXTURE_ASSETS, sharedCssText: '' } }, 'marker-missing');
  });

  it('样本②：重复 ＋ 缺槽 ＋ 预包裹 ＋ 空资产 → marker-duplicate（次序 1）', () => {
    const template = ['<!doctype html><html><body>',
      ASSET_WRAPPERS.sharedHelpersJs.openTag + M.sharedHelpers + ASSET_WRAPPERS.sharedHelpersJs.closeTag,
      M.sharedHelpers, '</body></html>'].join(LF);
    expectCode({ template, assets: { ...FIXTURE_ASSETS, sharedCssText: '' } }, 'marker-duplicate', 'sharedHelpers');
  });

  it('样本③：两载荷槽皆有 ＋ 缺容器 → marker-conflict（次序 3 早于 4）', () => {
    const both = ['<!doctype html><html><head>', M.sharedCss, '</head><body><div>', M.content, '</div>',
      M.injectData, M.sharedHelpers, '</body></html>'].join(LF);
    expectCode({ template: both, assets: { ...FIXTURE_ASSETS, sharedCssText: '' }, data: ENVELOPE, content: '<p>x</p>' }, 'marker-conflict');
  });

  it('样本④：缺容器 ＋ 空资产 → container-missing（次序 4 早于 5）', () => {
    const noContainer = ['<!doctype html><html><head>', M.sharedCss, '</head><body>', M.injectData, M.sharedHelpers, '</body></html>'].join(LF);
    expectCode({ template: noContainer, assets: { ...FIXTURE_ASSETS, sharedCssText: '' }, data: ENVELOPE }, 'container-missing');
  });

  it('样本⑤：容器合规 ＋ data 缺失 ＋ strict 非法 → data-missing（次序 6 早于 8）', () => {
    expectCode({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, strict: true }, 'data-missing', 'injectData');
  });

  it('样本⑥：内容页空资产 ＋ content 缺失 → asset-missing（次序 5 早于 7）', () => {
    expectCode({ template: contentPageTemplate(), assets: { ...FIXTURE_ASSETS, sharedHelpersJs: '' } }, 'asset-missing', 'sharedHelpers');
  });

  it('样本⑦：容器合规 ＋ data 不可序列化 ＋ strict 非法 → data-missing（次序 6 早于 8）', () => {
    const circular = {};
    circular.self = circular;
    expectCode({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, data: circular, strict: true }, 'data-missing', 'injectData');
  });
});

describe('A6 八个错误码逐条可达；失败一律抛 TemplateError（不返空页）', () => {
  /** 每个码一个最小可达样本（**全部走 fillTemplate 真实路径**，不是镜像判定）。 */
  const SAMPLES = Object.freeze({
    'marker-missing': { template: contentPageTemplate({ css: false }), assets: FIXTURE_ASSETS, content: '<p>x</p>' },
    'marker-duplicate': { template: contentPageTemplate().replace(M.sharedCss, M.sharedCss + LF + M.sharedCss), assets: FIXTURE_ASSETS, content: '<p>x</p>' },
    'marker-conflict': { template: contentPageTemplate().replace(M.sharedCss, ASSET_WRAPPERS.sharedCssText.openTag + M.sharedCss + ASSET_WRAPPERS.sharedCssText.closeTag), assets: FIXTURE_ASSETS, content: '<p>x</p>' },
    'container-missing': { template: dataPageTemplate({ payload: M.injectData }), assets: FIXTURE_ASSETS, data: ENVELOPE },
    'asset-missing': { template: contentPageTemplate(), assets: { ...FIXTURE_ASSETS, sharedCssText: '' }, content: '<p>x</p>' },
    'data-missing': { template: dataPageTemplate(), assets: FIXTURE_ASSETS },
    'content-missing': { template: contentPageTemplate(), assets: FIXTURE_ASSETS },
    'strict-invalid': { template: dataPageTemplate(), assets: FIXTURE_ASSETS, data: { version: '0.1.0' }, strict: true },
  });

  it('8 码逐条可达（覆盖 TEMPLATE_ERROR_CODES 全量）', () => {
    assert.deepEqual(Object.keys(SAMPLES).sort(), [...TEMPLATE_ERROR_CODES].sort(), '样本必须覆盖全部错误码');
    const hit = [];
    for (const [code, input] of Object.entries(SAMPLES)) {
      const err = expectCode(input, code);
      hit.push(err.code);
    }
    assert.deepEqual(hit.sort(), [...TEMPLATE_ERROR_CODES].sort());
  });

  it('失败不返空页：抛错路径不产出 html:""（逐个样本再证一次）', () => {
    for (const input of Object.values(SAMPLES)) {
      let returned = null;
      try { returned = fillTemplate(input); } catch { /* 期望 */ }
      assert.equal(returned, null, '失败必须抛错，不得返回任何输出');
    }
    // 成功路径的 html 恒非空（fixture 模板本身非空）
    const ok = fillTemplate({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, data: ENVELOPE });
    assert.ok(ok.html.length > 0);
  });

  it('错误形态逐字：name／code／marker／message（TemplateErrorShape）', () => {
    const err = catchError(SAMPLES['container-missing']);
    assert.equal(err.name, 'TemplateError');
    assert.equal(err.code, 'container-missing');
    assert.equal(err.marker, 'injectData');
    assert.equal(typeof err.message, 'string');
    assert.ok(err.message.includes('缺自带容器'));
    assert.ok(err instanceof Error, '必须继承 Error');
    // 与既有 RenderError 并列、互不继承、code 集互不重叠（契约 §3.3）
    // FX-74-1：原断言 `!('code' in new Error())` 与实现无关、恒真（零信息），改为有鉴别力的两条——
    // 若 `TemplateError` 继承／等于 `RenderError`（或被包成既有形态）即红。
    assert.ok(!(err instanceof RenderError), 'TemplateError 不得是 RenderError 的实例（并列、互不继承）');
    const protoChain = [];
    for (let p = Object.getPrototypeOf(err); p !== null; p = Object.getPrototypeOf(p)) protoChain.push(p);
    assert.ok(!protoChain.includes(RenderError.prototype), 'TemplateError 的原型链不得包含 RenderError.prototype');
    assert.ok(!TEMPLATE_ERROR_CODES.some((code) => ['missing-data', 'bad-envelope', 'reco-only'].includes(code)),
      'code 集不得与 RenderError 重叠');
  });
});

describe('A7 strict 两档（零依赖信封校验；禁调 parseEnvelope）', () => {
  it('默认档硬拦截（数量／载荷槽／容器与 strict 无关）', () => {
    expectCode({ template: contentPageTemplate({ css: false }), assets: FIXTURE_ASSETS, content: '<p>x</p>' }, 'marker-missing');
    expectCode({ template: dataPageTemplate({ payload: M.injectData }), assets: FIXTURE_ASSETS, data: ENVELOPE }, 'container-missing');
    // 默认档只要求 data 可 JSON 序列化：非信封对象也放行
    const out = fillTemplate({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, data: { anything: true } });
    assert.ok(out.report.strict === false);
    assert.ok(out.html.includes('anything'));
  });

  it('strict:true 追加信封校验：非对象／缺五字段／shape 非法 → strict-invalid', () => {
    const page = dataPageTemplate();
    for (const data of ['文本', 42, null, [], { version: '0.1.0', skill: 'x', shape: 'list', key: 'x.y' }]) {
      expectCode({ template: page, assets: FIXTURE_ASSETS, data, strict: true }, 'strict-invalid');
    }
    const badShape = { ...ENVELOPE, shape: 'unknown-shape' };
    expectCode({ template: page, assets: FIXTURE_ASSETS, data: badShape, strict: true }, 'strict-invalid');
    for (const field of STRICT_ENVELOPE_FIELDS) {
      const partial = { ...ENVELOPE };
      delete partial[field];
      expectCode({ template: page, assets: FIXTURE_ASSETS, data: partial, strict: true }, 'strict-invalid');
    }
  });

  it('strict:true 合法信封 → 通过；六形状逐一放行；report.strict 记录档位', () => {
    for (const shape of STRICT_ENVELOPE_SHAPES) {
      const out = fillTemplate({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, data: { ...ENVELOPE, shape }, strict: true });
      assert.equal(out.report.strict, true);
      assert.ok(out.html.includes('"shape":"' + shape + '"'), 'payload 必须是 JSON 文本：' + shape);
    }
  });

  it('内容页忽略 data 与 strict（不触发 data-missing／strict-invalid）', () => {
    const out = fillTemplate({ template: contentPageTemplate(), assets: FIXTURE_ASSETS, content: '<p>正文</p>', data: 10n, strict: true });
    assert.ok(out.html.includes('<p>正文</p>'));
  });

  it('AC-13：实现不 import base-link-core 运行时代码、不调用 parseEnvelope', () => {
    const raw = readFileSync(new URL('../dist/template.js', import.meta.url), 'utf8');
    // 判据先剥注释（与契约 §7「剥注释后」同口径）：JSDoc 里说明「不调用 parseEnvelope」不算调用
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, ' ');
    assert.ok(!code.includes('parseEnvelope'), '禁调 parseEnvelope（AC-13）');
    assert.ok(!/from\s+['"]base-link-core['"]/.test(code), '不得运行时 import base-link-core');
    assert.ok(!/['"]node:/.test(code), '不得引 node: 内建');
  });
});

describe('A8 零残留标记（真实 53 内容页 ＋ 6 数据页，fixture 资产）', () => {
  const CONTENT_SKILLS = ['skill-bill', 'skill-chef', 'skill-home', 'skill-schedule'];

  /** 数据页迁移动作（契约 §6.1②，**只在本测试内存里执行**，不改任何技能包文件）：
   *  去掉模板自带的 `<style>`／`<script>` 包裹，标记改回裸文本（改由填充器包裹）。 */
  const unwrapShared = (template, assetKey) => {
    const wrapper = ASSET_WRAPPERS[assetKey];
    const literal = M[ASSET_MARKER_KEYS[assetKey]];
    return template.split(wrapper.openTag + literal + wrapper.closeTag).join(literal);
  };

  it('53 个内容页：fixture 资产填完无 <!--…--> 残留', () => {
    let filled = 0;
    for (const skill of CONTENT_SKILLS) {
      const dir = join(ROOT, 'packages', skill, 'templates');
      for (const file of readdirSync(dir).filter((n) => n.endsWith('.html')).sort()) {
        const template = readFileSync(join(dir, file), 'utf8');
        const out = fillTemplate({ template, assets: FIXTURE_ASSETS, content: '<p>正文</p>' });
        for (const literal of Object.values(M)) {
          assert.ok(!out.html.includes(literal), skill + '/' + file + ' 残留标记：' + literal);
        }
        assert.ok(out.html.includes(FIXTURE_ASSETS.sharedCssText), skill + '/' + file + ' 缺共享 CSS');
        assert.ok(out.html.includes(FIXTURE_ASSETS.sharedHelpersJs), skill + '/' + file + ' 缺共享 JS');
        assert.ok(out.html.includes('<p>正文</p>'), skill + '/' + file + ' 缺正文');
        assert.equal(out.report.markers.find((m) => m.key === 'content').filled, true);
        filled += 1;
      }
    }
    assert.equal(filled, 53, '内容页必须是 53 个（16＋8＋21＋8）');
  });

  it('6 个数据页（memo）：先按迁移动作去包裹，再填完无残留（且迁移前必抛 marker-conflict）', () => {
    const dir = join(ROOT, 'packages', 'skill-memo-ilife', 'templates');
    const files = readdirSync(dir).filter((n) => n.endsWith('.html')).sort();
    assert.equal(files.length, 6, 'memo 数据页必须是 6 个');
    for (const file of files) {
      const raw = readFileSync(join(dir, file), 'utf8');
      // 迁移前：模板自带包裹（不变量②）→ 期望 marker-conflict（这正是迁移动作的判据）
      expectCode({ template: raw, assets: FIXTURE_ASSETS, data: ENVELOPE }, 'marker-conflict');
      // 迁移动作（内存内）：去掉自带包裹
      const migrated = unwrapShared(unwrapShared(raw, 'sharedCssText'), 'sharedHelpersJs');
      const out = fillTemplate({ template: migrated, assets: FIXTURE_ASSETS, data: ENVELOPE, strict: true });
      for (const literal of Object.values(M)) {
        assert.ok(!out.html.includes(literal), file + ' 残留标记：' + literal);
      }
      assert.ok(out.html.includes('id="' + DEFAULT_DATA_SCRIPT_ID + '"'), file + ' 必须保留自带容器');
      assert.ok(out.html.includes('"skill":"demo"'), file + ' payload 必须注入容器内');
      assert.equal(out.report.markers.find((m) => m.key === 'injectData').filled, true);
      assert.equal(out.report.exempt, false);
    }
  });
});

describe('A9 calorie 6 模板 → marker-missing（契约外遗留资产，正确行为）', () => {
  it('6 个 calorie 模板两载荷槽皆无 → 一律抛 marker-missing（早于其预包裹的 marker-conflict）', () => {
    const dir = join(ROOT, 'packages', 'skill-calorie', 'templates');
    const files = readdirSync(dir).filter((n) => n.endsWith('.html')).sort();
    assert.equal(files.length, 6, 'calorie 模板必须是 6 个');
    for (const file of files) {
      const template = readFileSync(join(dir, file), 'utf8');
      assert.equal(countOf(template, M.injectData), 0, file + ' 无 INJECT-DATA');
      assert.equal(countOf(template, M.content), 0, file + ' 无 CONTENT');
      expectCode({ template, assets: FIXTURE_ASSETS, data: ENVELOPE, content: '<p>x</p>' }, 'marker-missing');
    }
  });
});

describe('report／bytes／替换细节（机器可读结果）', () => {
  it('report.markers 覆盖六标记、序＝TEMPLATE_MARKERS 键序、逐字段逐值', () => {
    const out = fillTemplate({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, data: ENVELOPE });
    assert.deepEqual(out.report.markers.map((m) => m.key), Object.keys(M));
    for (const row of out.report.markers) {
      assert.equal(row.literal, M[row.key]);
      assert.equal(row.rule, MARKER_RULES[row.key].rule);
      assert.equal(typeof row.count, 'number');
      assert.equal(typeof row.filled, 'boolean');
    }
    assert.deepEqual(out.report.markers.map((m) => m.count), [1, 0, 1, 1, 0, 0]);
    assert.deepEqual(out.report.markers.map((m) => m.filled), [true, false, true, true, false, false]);
    assert.equal(out.report.exempt, false);
    assert.equal(out.report.strict, false);
  });

  it('bytes ＝ 输出 HTML 的 UTF-8 字节数；注入顺序恒按 INJECTION_ORDER（位置原样保留）', () => {
    const out = fillTemplate({ template: dataPageTemplate({ charts: true }), assets: FIXTURE_ASSETS, data: ENVELOPE });
    // FX-74-1：原断言 `bytes >= html.length` 对任意字符串恒真（UTF-8 字节数恒 ≥ UTF-16 码元数），
    // 改为有鉴别力的两条——样本含中文（前置条件），故实现若把 bytes 写成 `html.length` 即红。
    assert.ok(out.html.includes('<p>数据页</p>'), '样本必须含非 ASCII 字符，否则下一条无鉴别力');
    assert.ok(out.report.bytes > out.html.length, 'bytes 必须是 UTF-8 字节数（写成 UTF-16 码元数即红）');
    assert.equal(out.report.bytes, Buffer.byteLength(out.html, 'utf8'));
    assert.ok(out.report.bytes > 0, 'bytes 必须由输出算得');
    assert.deepEqual([...INJECTION_ORDER], ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData']);
    // 标记位置原样保留（不是重新拼页）：共享 CSS 仍在 head、helpers 仍在 body 尾
    assert.ok(out.html.indexOf(FIXTURE_ASSETS.sharedCssText) < out.html.indexOf('<p>数据页</p>'));
    assert.ok(out.html.indexOf('<p>数据页</p>') < out.html.indexOf(FIXTURE_ASSETS.sharedHelpersJs));
  });

  it('JSON 载荷：< 一律写成反斜杠 + u003c；替换不受 $&／$` 等替换模式影响', () => {
    const data = { ...ENVELOPE, data: { items: ['</script><script>alert(1)</script>'] } };
    const out = fillTemplate({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, data });
    const start = out.html.indexOf('type="' + DATA_SCRIPT_TYPE + '">') + ('type="' + DATA_SCRIPT_TYPE + '">').length;
    const payload = out.html.slice(start, out.html.indexOf('</script>', start));
    assert.ok(!payload.includes('<'), 'payload 文本不得含裸 <');
    assert.ok(payload.includes('u003c'), '必须写成反斜杠 + u003c');
    assert.deepEqual(JSON.parse(payload), data, 'payload 必须是合法 JSON 且逐值等于输入');
    // 替换模式安全：资产与数据含 $&／$'／$` 必须原样保留
    const dollar = 'var t="$&$`$\'";';
    const out2 = fillTemplate({ template: contentPageTemplate(), assets: { ...FIXTURE_ASSETS, sharedHelpersJs: dollar }, content: '<p>$&</p>' });
    assert.ok(out2.html.includes(dollar), '资产里的 $& 等替换模式必须原样');
    assert.ok(out2.html.includes('<p>$&</p>'), '正文里的 $& 必须原样');
  });

  // FX-74-3（V1 未覆盖边界 6）：JSON **载荷自身**含 `$&`／`` $` ``／`$'` 等替换模式时，
  // 替换必须逐值安全——实现用 `indexOf` ＋ 切片拼接（不用 `String.prototype.replace`），本用例是判据。
  it('JSON 载荷含 $&／$`／$\' 时替换逐值安全（不得被当替换模式回填）', () => {
    const dollars = ['$&', '$`', "$'", '$$', '$1'];
    const data = { ...ENVELOPE, data: { items: dollars, lt: '$<x>' } };
    const out = fillTemplate({ template: dataPageTemplate(), assets: FIXTURE_ASSETS, data });
    const open = 'type="' + DATA_SCRIPT_TYPE + '">';
    const start = out.html.indexOf(open) + open.length;
    const payload = out.html.slice(start, out.html.indexOf('</script>', start));
    assert.deepEqual(JSON.parse(payload), data, 'payload 必须逐值等于输入（$ 模式不得被回填）');
    for (const s of dollars) assert.ok(payload.includes(s), '载荷必须原样保留：' + s);
    assert.ok(payload.includes('$\\u003c'), '载荷中的 < 仍必须写成反斜杠 + u003c');
    assert.ok(!out.html.includes(M.injectData), 'A8：INJECT-DATA 零残留');
    assert.equal(out.report.bytes, Buffer.byteLength(out.html, 'utf8'));
  });
});

describe('输入形态边界（FX-74-3／V1 边界 9）', () => {
  it('空输入／null／非字符串 template → marker-missing（不抛 TypeError）', () => {
    // 实现口径（src/template.ts JSDoc）：`template` 非字符串按空模板处理 → 载荷槽缺失。
    for (const input of [{}, null, { template: 123 }, { template: undefined, assets: FIXTURE_ASSETS }]) {
      expectCode(input, 'marker-missing');
    }
  });

  it('assets 整体缺失 → asset-missing（按 INJECTION_ORDER 首个被消费资产，不硬编码次序）', () => {
    const template = contentPageTemplate();
    const first = INJECTION_ORDER.find((key) => countOf(template, M[key]) > 0);
    const assetKey = Object.keys(ASSET_MARKER_KEYS).find((k) => ASSET_MARKER_KEYS[k] === first);
    const err = expectCode({ template, content: '<p>x</p>' }, 'asset-missing', first);
    assert.ok(err.message.includes(assetKey), 'message 必须点名资产键 ' + assetKey + '：' + err.message);
  });

  it('content 非字符串 → 强制 String() 注入（不抛错、不残留标记）', () => {
    const out = fillTemplate({ template: contentPageTemplate(), assets: FIXTURE_ASSETS, content: 123 });
    assert.ok(out.html.includes('123'), '非字符串 content 必须被 String() 注入');
    assert.ok(!out.html.includes(M.content), 'A8：正文标记零残留');
    assert.equal(out.report.markers.find((m) => m.key === 'content').filled, true);
  });
});
