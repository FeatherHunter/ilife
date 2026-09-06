import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENVELOPE_VERSION, ENVELOPE_SHAPES, createEnvelope, parseEnvelope, isEnvelope,
  createRegistry, parseRegistryKey, runCombo,
  EnvelopeError, RegistryError, RunnerError,
} from '../packages/base-link-core/dist/index.js';

const goodData = {
  list: { items: [{ a: 1 }], total: 1 },
  detail: { item: { id: 'x' } },
  stat: { metrics: { count: 3 } },
  receipt: { ok: true, message: 'done' },
  analysis: { summary: 's' },
  fallback: { reason: 'timeout', degraded: true },
};

describe('link-core envelope', () => {
  it('6 形状全字段取数可用（create+parse 回环）', () => {
    assert.equal(ENVELOPE_SHAPES.length, 6);
    for (const shape of ENVELOPE_SHAPES) {
      const env = createEnvelope({ skill: 'calorie', shape, key: 'calorie.today', data: goodData[shape] });
      assert.equal(env.version, ENVELOPE_VERSION);
      assert.ok(isEnvelope(env));
      assert.deepEqual(parseEnvelope(JSON.parse(JSON.stringify(env))).data, goodData[shape]);
    }
  });
  it('坏输入 throw、不返空数组', () => {
    assert.throws(() => createEnvelope({ skill: '', shape: 'list', key: 'calorie.today', data: { items: [] } }), EnvelopeError);
    assert.throws(() => createEnvelope({ skill: 'c', shape: 'nope', key: 'c.today', data: {} }), EnvelopeError);
    assert.throws(() => createEnvelope({ skill: 'c', shape: 'list', key: 'c.today', data: {} }), EnvelopeError);
    assert.throws(() => createEnvelope({ skill: 'c', shape: 'list', key: 'c.today', data: [] }), EnvelopeError);
    assert.throws(() => createEnvelope({ skill: 'c', shape: 'stat', key: 'c.today', data: { metrics: { n: 'x' } } }), EnvelopeError);
    assert.throws(() => createEnvelope({ skill: 'c', shape: 'fallback', key: 'c.today', data: { reason: 'r' } }), EnvelopeError);
    assert.equal(isEnvelope({ version: '1.0.0', skill: 'c', shape: 'list', key: 'c.today', data: { items: [] } }), false);
    assert.equal(isEnvelope({ version: 'x', skill: 'c', shape: 'list', key: 'c.today', data: { items: [] } }), false);
    assert.equal(isEnvelope(null), false);
  });
});

describe('link-core registry 命名空间修复', () => {
  it('skill.combo 解析，对不上即 fail', () => {
    assert.deepEqual(parseRegistryKey('calorie.today'), { skill: 'calorie', combo: 'today', key: 'calorie.today' });
    assert.throws(() => parseRegistryKey('today'), RegistryError);
    assert.throws(() => parseRegistryKey(''), RegistryError);
    const reg = createRegistry(['calorie.today']);
    assert.ok(reg.has('calorie.today'));
    assert.equal(reg.has('bill.today'), false);
    assert.throws(() => reg.resolve('bill.today'), RegistryError);
  });
});

describe('link-core runner', () => {
  it('正常取数回 envelope；失败 throw 永不返 []', async () => {
    const reg = createRegistry(['calorie.today']);
    const env = await runCombo(reg, { key: 'calorie.today', shape: 'list' }, async () => ({ items: [1] }));
    assert.equal(env.shape, 'list');
    assert.ok(!Array.isArray(env));
    await assert.rejects(runCombo(reg, { key: 'bill.today', shape: 'list' }, async () => ({ items: [] })), RunnerError);
    await assert.rejects(runCombo(reg, { key: 'calorie.today', shape: 'list' }, async () => { throw new Error('db down'); }), RunnerError);
    await assert.rejects(runCombo(reg, { key: 'calorie.today', shape: 'list' }, async () => ({})), RunnerError);
    await assert.rejects(runCombo(reg, { key: 'calorie.today', shape: 'list', params: [] }, async () => ({ items: [] })), RunnerError);
  });
});
