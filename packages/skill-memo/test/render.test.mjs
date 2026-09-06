import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MEMO_KEY_SHAPES, memoShapeFor, buildMemoEnvelope, parseMemoEnvelope, escapeHtml, renderEnvelopeHtml, assertHtmlSize, MEMO_HTML_MAX_BYTES, fillSharedMarkers, SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, MEMO_TEMPLATES, loadTemplate, MemoRenderError } from '../dist/index.js';

const GOOD = {
  'memo.search': { items: [{ id: 'n1', title: '去医院', body: '复查', category: '备忘' }] },
  'memo.detail': { item: { id: 'n1', title: '去医院' } },
  'memo.create': { ok: true, message: '已记一条' },
  'memo.update': { ok: true, message: '已更新' },
  'memo.remove': { ok: true, message: '已废弃' },
  'memo.remind': { items: [] },
  'memo.wish': { items: [] },
  'memo.sync': { ok: true, message: '已同步' },
  'memo.batch': { ok: true, message: '批量完成' },
  'memo.stats': { metrics: { count: 3 } },
};

describe('memo 渲染层', () => {
  it('10 key 建 envelope 全字段可用', () => {
    assert.equal(Object.keys(MEMO_KEY_SHAPES).length, 10);
    for (const [key, shape] of Object.entries(MEMO_KEY_SHAPES)) {
      assert.equal(memoShapeFor(key), shape);
      const env = buildMemoEnvelope(key, GOOD[key]);
      assert.equal(env.skill, 'memo');
      assert.equal(env.shape, shape);
      assert.ok(parseMemoEnvelope(JSON.parse(JSON.stringify(env))));
      assert.match(renderEnvelopeHtml(env), /<section/);
    }
  });
  it('坏 key/错形状 throw', () => {
    assert.throws(() => memoShapeFor('memo.nope'), (e) => e instanceof MemoRenderError);
    assert.throws(() => buildMemoEnvelope('today', { items: [] }), (e) => e.code === 'MEMO_UNKNOWN_KEY');
    assert.throws(() => buildMemoEnvelope('memo.search', { noItems: 1 }), (e) => e.code === 'MEMO_SHAPE_MISMATCH');
  });
  it('转义（代理对原样保留）与超体积门', () => {
    assert.equal(escapeHtml('<a>&"'), '&lt;a&gt;&amp;&quot;');
    const emoji = '\uD83D\uDE00';
    assert.ok(escapeHtml(emoji).includes(emoji));
    const env = buildMemoEnvelope('memo.create', GOOD['memo.create']);
    assert.match(renderEnvelopeHtml(env), /已记一条/);
    assert.throws(() => assertHtmlSize('x'.repeat(MEMO_HTML_MAX_BYTES + 1), MEMO_HTML_MAX_BYTES), (e) => e.code === 'MEMO_HTML_TOO_LARGE');
  });
  it('模板：5 渲染随包，标记各恰 1，init 归 M6', () => {
    assert.equal(MEMO_TEMPLATES.length, 5);
    for (const n of MEMO_TEMPLATES) {
      const t = loadTemplate(n);
      assert.ok(t.includes(SHARED_CSS_MARKER) && t.includes(SHARED_HELPERS_MARKER));
      const filled = fillSharedMarkers(t, '/*css*/', '/*js*/');
      assert.ok(!filled.includes(SHARED_CSS_MARKER));
    }
    assert.throws(() => loadTemplate('init_report'), (e) => e.code === 'MEMO_TEMPLATE_MISSING');
    assert.throws(() => fillSharedMarkers('无标记', '', ''), (e) => e.code === 'MEMO_MARKER_INVALID');
  });
});
