import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHEF_KEY_SHAPES, chefShapeFor, buildChefEnvelope, renderEnvelopeHtml, assertHtmlSize, fillTemplate, CHEF_TEMPLATES, templateFor, loadTemplate, ChefRenderError } from '../dist/index.js';
import { parseRegistryKey, ENVELOPE_SHAPES } from '../../base-link-core/dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('私家大厨渲染 render', () => {
  it('8 key x shape 全合法（命名空间+形状）', () => {
    assert.equal(Object.keys(CHEF_KEY_SHAPES).length, 8);
    for (const [k, s] of Object.entries(CHEF_KEY_SHAPES)) {
      assert.equal(parseRegistryKey(k).key, k);
      assert.ok(ENVELOPE_SHAPES.includes(s));
    }
    assert.equal(chefShapeFor('chef.recipe.write'), 'receipt');
    assert.equal(chefShapeFor('chef.recipe.view'), 'detail');
    assert.equal(chefShapeFor('chef.recipe.search'), 'list');
    assert.throws(() => chefShapeFor('chef.nope'), (e) => e instanceof ChefRenderError);
  });
  it('envelope 8 key 全字段 + 未知 key 抛', () => {
    const receipt = buildChefEnvelope('chef.recipe.write', { ok: true, message: '已加菜' });
    assert.equal(receipt.skill, 'chef');
    assert.equal(receipt.shape, 'receipt');
    const detail = buildChefEnvelope('chef.recipe.view', { item: { id: '1', name: '宫保虾球' } });
    assert.equal(detail.shape, 'detail');
    const list = buildChefEnvelope('chef.recipe.search', { items: [{ id: '1', name: '宫保虾球' }], total: 1 });
    assert.equal(list.shape, 'list');
    assert.throws(() => buildChefEnvelope('chef.nope', {}), (e) => e instanceof ChefRenderError);
    assert.throws(() => buildChefEnvelope('chef.recipe.write', { items: [] }), /全字段/);
  });
  it('HTML 三形状渲染含 section + 超体积抛', () => {
    const r = buildChefEnvelope('chef.recipe.write', { ok: true, message: '已加菜' });
    assert.match(renderEnvelopeHtml(r), /<section/);
    const d = buildChefEnvelope('chef.recipe.view', { item: { id: '1', name: '宫保虾球' } });
    assert.match(renderEnvelopeHtml(d), /<section/);
    const l = buildChefEnvelope('chef.recipe.search', { items: [{ id: '1', name: '宫保虾球' }], total: 1 });
    assert.match(renderEnvelopeHtml(l), /<section/);
    assert.throws(() => assertHtmlSize('x'.repeat(300 * 1024)), /超体积/);
  });
  it('模板 8 全可装载 + 三标记恰 1 次', () => {
    assert.equal(CHEF_TEMPLATES.length, 8);
    assert.equal(templateFor('chef.help.lookup'), 'help');
    assert.equal(templateFor('chef.recipe.view'), 'recipe_view');
    for (const t of CHEF_TEMPLATES) {
      const tpl = loadTemplate(t);
      assert.ok(tpl.includes('chef-cmd-read'));
      assert.equal(tpl.split('<!--SHARED-CSS-->').length - 1, 1);
      assert.equal(tpl.split('<!--CONTENT-->').length - 1, 1);
      assert.equal(tpl.split('<!--SHARED-HELPERS-->').length - 1, 1);
      assert.ok(fillTemplate(tpl, '<p>x</p>').includes('<p>x</p>'));
    }
    assert.throws(() => fillTemplate('no marker', 'x'), /标记/);
  });
});
