import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BILL_KEY_SHAPES, billShapeFor, buildBillEnvelope, renderEnvelopeHtml, assertHtmlSize, fillTemplate, BILL_TEMPLATES, templateFor, loadTemplate, calcKpi, buildOverview, buildTrend, BillRenderError } from '../dist/index.js';
import { parseRegistryKey, ENVELOPE_SHAPES } from '../../base-link-core/dist/index.js';

describe('饼干渲染 render', () => {
  it('16 key×shape 全合法（命名空间+6 形状）', () => {
    assert.equal(Object.keys(BILL_KEY_SHAPES).length, 16);
    for (const [k, s] of Object.entries(BILL_KEY_SHAPES)) {
      assert.equal(parseRegistryKey(k).key, k);
      assert.ok(ENVELOPE_SHAPES.includes(s));
    }
    assert.equal(billShapeFor('bill.record.add'), 'receipt');
    assert.throws(() => billShapeFor('bill.nope'), (e) => e instanceof BillRenderError);
  });
  it('envelope 全字段 + 错形状 throw', () => {
    const env = buildBillEnvelope('bill.record.add', { ok: true, message: '已记录' });
    assert.equal(env.version, '0.1.0');
    assert.equal(env.skill, 'bill');
    assert.throws(() => buildBillEnvelope('bill.record.add', { items: [] }), /全字段/);
  });
  it('KPI 转账除外 + 总览 metrics 全 number', () => {
    const rows = [
      { id: 1, category: '餐饮/外卖', time: '2026-09-06 12:00:00', amount: -35, account: '', ledger: '生活', currency: '人民币', note: '', created_at: '', deleted_at: null },
      { id: 2, category: '转账/转出', time: '2026-09-06 13:00:00', amount: -500, account: '支付宝', ledger: '转账', currency: '人民币', note: '#转账', created_at: '', deleted_at: null },
    ];
    assert.equal(calcKpi(rows).expense, 35);
    const { metrics } = buildOverview('2026-09', rows);
    for (const v of Object.values(metrics)) assert.equal(typeof v, 'number');
    assert.ok(buildTrend('top', rows).summary.length > 0);
  });
  it('HTML 按形状渲染 + 体积门 + 三标记', () => {
    const env = buildBillEnvelope('bill.record.today', { items: [{ id: 1, category: '餐饮', time: 't', amount: -35, note: 'n' }], total: 1 });
    assert.match(renderEnvelopeHtml(env), /<section/);
    assert.throws(() => assertHtmlSize('x'.repeat(300 * 1024)), /超体积/);
    const tpl = loadTemplate('record_today');
    assert.ok(fillTemplate(tpl, '<p>x</p>').includes('<p>x</p>'));
    assert.throws(() => fillTemplate('no marker', 'x'), /标记/);
  });
  it('16 模板全在 + key 映射', () => {
    assert.equal(BILL_TEMPLATES.length, 16);
    assert.equal(templateFor('bill.help.lookup'), 'help');
    for (const t of BILL_TEMPLATES) assert.ok(loadTemplate(t).includes('bill-cmd-read'));
  });
});
