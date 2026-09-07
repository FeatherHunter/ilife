import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_KEY_SHAPES, homeShapeFor, buildHomeEnvelope, parseHomeEnvelope,
  renderEnvelopeHtml, assertHtmlSize, estimateBytes,
  templateFor, loadTemplate, fillTemplate, HOME_TEMPLATES,
  toItemCard, buildSearchList, buildDetail, buildReceipt, buildTagList,
  buildStatsOverview, buildHelpItems, HomeRenderError,
} from '../dist/index.js';

const CARD = { id: 1, name: '牛奶', location: '客厅/冰箱×2[在家]', quantity: 2, status: '在家', category: '食物与饮品', tags: '早餐' };

describe('居家渲染 render（21 键全票）', () => {
  it('21 联动 shape 分配', () => {
    assert.equal(Object.keys(HOME_KEY_SHAPES).length, 21);
    assert.equal(HOME_KEY_SHAPES['home.item.search'], 'list');
    assert.equal(HOME_KEY_SHAPES['home.item.detail'], 'detail');
    assert.equal(HOME_KEY_SHAPES['home.item.add'], 'receipt');
    assert.equal(HOME_KEY_SHAPES['home.stats.overview'], 'stat');
    assert.throws(() => homeShapeFor('home.nope'), HomeRenderError);
  });
  it('envelope 全字段（21 键各一）', () => {
    const cases = [
      ['home.item.search', buildSearchList([CARD])],
      ['home.item.detail', buildDetail(CARD)],
      ['home.item.add', buildReceipt('已录物品：1')],
      ['home.item.update', buildReceipt('已更新：1')],
      ['home.tag.query', buildTagList([{ tag: '白色', count: 2 }])],
      ['home.tag.write', buildReceipt('已合标签')],
      ['home.inventory.round', buildReceipt('已盘点')],
      ['home.inventory.records', buildTagList([])],
      ['home.location.query', buildTagList([])],
      ['home.location.write', buildReceipt('已新增位置')],
      ['home.outfit.pick', buildSearchList([CARD])],
      ['home.trip.manage', buildReceipt('已带出')],
      ['home.stats.overview', buildStatsOverview({ items: 1 })],
      ['home.stats.alert', buildSearchList([CARD])],
      ['home.shopping.query', buildTagList([])],
      ['home.shopping.write', buildReceipt('已加入')],
      ['home.ticket.query', buildTagList([])],
      ['home.ticket.write', buildReceipt('已登记')],
      ['home.care.query', buildTagList([])],
      ['home.care.write', buildReceipt('已初始化')],
      ['home.help.lookup', buildHelpItems([{ phrase: '查物品', key: 'home.item.search', shape: 'list', cli: 'x', desc: 'y' }])],
    ];
    for (const [key, data] of cases) {
      const env = buildHomeEnvelope(key, data);
      assert.equal(env.version, '0.1.0');
      assert.equal(env.skill, 'home');
      assert.equal(env.key, key);
      assert.equal(env.shape, HOME_KEY_SHAPES[key]);
      assert.deepEqual(parseHomeEnvelope(JSON.parse(JSON.stringify(env))).data, JSON.parse(JSON.stringify(data)));
      const html = renderEnvelopeHtml(env);
      assert.match(html, /<section data-skill="home"/);
      assert.match(html, new RegExp('data-key="' + key + '"'));
    }
    assert.throws(() => buildHomeEnvelope('home.item.search', { nope: 1 }), HomeRenderError);
    assert.throws(() => buildHomeEnvelope('home.nope', { items: [] }), HomeRenderError);
  });
  it('看密码 HTML 脱敏 + 体积门 + 转义', () => {
    const env = buildHomeEnvelope('home.ticket.write', { ok: true, message: '密码：abc123' });
    assert.match(renderEnvelopeHtml(env), /已脱敏/);
    assert.throws(() => assertHtmlSize('x'.repeat(300 * 1024)), HomeRenderError);
    const env2 = buildHomeEnvelope('home.item.add', { ok: true, message: '<b>&"' });
    assert.match(renderEnvelopeHtml(env2), /&lt;b&gt;&amp;&quot;/);
  });
  it('模板 21 件齐 + 三标记 + 落盘快照', () => {
    assert.equal(HOME_TEMPLATES.length, 21);
    for (const key of Object.keys(HOME_KEY_SHAPES)) {
      const t = loadTemplate(templateFor(key));
      assert.match(t, /home-cmd-read/);
      for (const m of ['<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->', '<!--CONTENT-->']) {
        assert.equal(t.split(m).length - 1, 1, key + ' 标记 ' + m);
      }
      const env = buildHomeEnvelope(key, key.endsWith('.search') || key.endsWith('.query') || key.endsWith('.alert') || key.endsWith('.lookup') || key.endsWith('.records') || key.endsWith('.pick')
        ? { items: [], total: 0 }
        : key.endsWith('.overview') ? { metrics: { total: 0 } }
        : key.endsWith('.detail') ? { item: { id: 1 } }
        : { ok: true, message: 'm' });
      const full = fillTemplate(t, renderEnvelopeHtml(env));
      assert.match(full, /<style>/);
      assert.match(full, /<section/);
    }
    assert.throws(() => loadTemplate('nope'), HomeRenderError);
    assert.throws(() => fillTemplate('无标记', 'x'), HomeRenderError);
  });
  it('#43 H2 analysis/fallback 直调分支（经 key 不可达，保留显式降级）', () => {
    const a = { version: '0.1.0', skill: 'home', shape: 'analysis', key: 'home.item.search', data: { summary: '降级说明 <>&"' } };
    assert.match(renderEnvelopeHtml(a), /降级说明/);
    assert.match(renderEnvelopeHtml(a), /&lt;&gt;&amp;/);
    const f = { version: '0.1.0', skill: 'home', shape: 'fallback', key: 'home.item.search', data: { reason: '超时降级', degraded: true } };
    assert.match(renderEnvelopeHtml(f), /data-degraded="1"/);
    assert.match(renderEnvelopeHtml(f), /超时降级/);
    assert.throws(() => renderEnvelopeHtml({ version: '0.1.0', skill: 'home', shape: 'nope', key: 'home.item.search', data: {} }), HomeRenderError);
  });
  it('toItemCard 装配', () => {
    const c = toItemCard({ id: 1, name: 'x', category: 'c', category_id: 1, owner: 'u', purchase_price: null, remark: null, photo: null, access_count: 0, last_accessed_at: null, fixed_location: null, created_at: '', updated_at: '' }, [{ id: 1, item_id: 1, location: '客厅/冰箱', quantity: 2, reason: null, location_status: '在家', purchase_date: null, expiration_date: null, created_at: '', updated_at: '' }], ['a']);
    assert.equal(c.quantity, 2);
  });
});
