// #1142 共用面板快路径有界重试（全用假传输口，不碰真机）。
// 钉：缺省单次旧行为不变；瞬时失败按退避恢复；持续失败返最后一次；save/reset 永不自动重试；超时文案自带通道。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchConfigSurface, saveConfigSurface, resetConfigSurface } from '../dist/config-panel-value.js';
import { CONFIG_READ_RETRY_MS } from '../dist/config-panel-contract.js';

const okSurface = () => ({ path: '/c/memo.yaml', dataDir: '/c/data', created: false, values: {}, resolved: {} });
const okEnvelope = () => ({ ok: true, value: okSurface() });
const boom = () => new Error('route not registered');
const scriptCall = (seen, steps) => async () => {
  seen.calls += 1;
  const step = steps[Math.min(seen.calls - 1, steps.length - 1)];
  if (step instanceof Error) throw step;
  return step;
};
const fakeSleep = (seen) => (ms) => { seen.sleeps.push(ms); return Promise.resolve(); };

describe('#1142 退避表', () => {
  it('有界正序：非空、每项为正、非递减', () => {
    assert.ok(CONFIG_READ_RETRY_MS.length > 0);
    for (const ms of CONFIG_READ_RETRY_MS) assert.ok(ms > 0);
    for (let i = 1; i < CONFIG_READ_RETRY_MS.length; i += 1) assert.ok(CONFIG_READ_RETRY_MS[i] >= CONFIG_READ_RETRY_MS[i - 1]);
  });
});

describe('#1142 快路径重试', () => {
  it('缺省仍是单次（旧行为不变）', async () => {
    const seen = { calls: 0 };
    const out = await fetchConfigSurface(scriptCall(seen, [boom()]), '/ilife-memo');
    assert.equal(out.ok, false);
    assert.equal(seen.calls, 1);
  });
  it('抛一次再成功：恢复正常，只等第一档', async () => {
    const seen = { calls: 0, sleeps: [] };
    const out = await fetchConfigSurface(scriptCall(seen, [boom(), okEnvelope()]), '/ilife-memo', { delays: [5, 10], sleep: fakeSleep(seen) });
    assert.equal(out.ok, true);
    assert.equal(seen.calls, 2);
    assert.deepEqual(seen.sleeps, [5]);
  });
  it('一直抛：返最后一次失败，等完每一档', async () => {
    const seen = { calls: 0, sleeps: [] };
    const out = await fetchConfigSurface(scriptCall(seen, [boom()]), '/ilife-memo', { delays: [5, 10], sleep: fakeSleep(seen) });
    assert.equal(out.ok, false);
    assert.equal(seen.calls, 3);
    assert.deepEqual(seen.sleeps, [5, 10]);
  });
  it('中途卸载即停', async () => {
    const seen = { calls: 0, sleeps: [] };
    const out = await fetchConfigSurface(scriptCall(seen, [boom(), okEnvelope()]), '/ilife-memo', { delays: [5, 10], sleep: fakeSleep(seen), isAlive: () => false });
    assert.equal(out.ok, false);
    assert.equal(seen.calls, 1);
  });
  it('超时文案自带通道与下一步', async () => {
    const seen = { calls: 0 };
    const out = await fetchConfigSurface(scriptCall(seen, [boom()]), '/ilife-memo');
    assert.equal(out.ok, false);
    assert.ok(out.message.includes('/ilife-memo'), '文案须带通道：' + out.message);
    assert.ok(out.message.includes('重试'), '文案须给下一步：' + out.message);
  });
  it('save/reset 永不自动重试（单次直返）', async () => {
    const seenSave = { calls: 0 };
    const r1 = await saveConfigSurface(scriptCall(seenSave, [boom()]), '/ilife-memo', {});
    assert.equal(r1.ok, false);
    assert.equal(seenSave.calls, 1);
    const seenReset = { calls: 0 };
    const r2 = await resetConfigSurface(scriptCall(seenReset, [boom()]), '/ilife-memo');
    assert.equal(r2.ok, false);
    assert.equal(seenReset.calls, 1);
  });
});
