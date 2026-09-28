// 票 #982 自证回路：更新目标表挂载加载的有限重试（全用假传输口，不碰真机）。
// 缺陷：进面板那一次取数失败（宿主路由尚未就绪），错误态常驻整个会话；
// 本件钉：瞬时失败重试后恢复正常、持续失败保留最后一次失败、卸载即停、退避有界，且默认仍是单次（旧行为不变）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LOAD_RETRY_MS } from '../dist/update-contract.js';
import { loadTargets } from '../dist/update-client.js';
import { loadFailureDetail } from '../dist/update-view.js';

/** 按剧本走的假传输口：Error 即抛（模拟路由未就绪），否则回包。 */
const scriptCall = (seen, steps) => async () => {
  seen.calls += 1;
  const step = steps[Math.min(seen.calls - 1, steps.length - 1)];
  if (step instanceof Error) throw step;
  return step;
};
const okEnvelope = (targets = []) => ({ ok: true, value: { targets, pollMs: 1000 } });
const fakeSleep = (seen) => (ms) => {
  seen.sleeps.push(ms);
  return Promise.resolve();
};
const notRegistered = () => new Error('route /api/ilife-manager not registered');

describe('#982 退避表', () => {
  it('有界正序：非空、每项为正、非递减', () => {
    assert.ok(LOAD_RETRY_MS.length > 0, '退避表不能为空');
    for (const ms of LOAD_RETRY_MS) assert.ok(ms > 0, '退避必须为正: ' + ms);
    for (let i = 1; i < LOAD_RETRY_MS.length; i += 1) {
      assert.ok(LOAD_RETRY_MS[i] >= LOAD_RETRY_MS[i - 1], '退避必须非递减');
    }
  });
});

describe('#982 首帧加载重试', () => {
  it('默认不传参仍是单次（旧行为不变）', async () => {
    const seen = { calls: 0 };
    const out = await loadTargets(scriptCall(seen, [notRegistered()]));
    assert.equal(out.ok, false);
    assert.equal(seen.calls, 1);
  });
  it('首次成功不重试、不等待', async () => {
    const seen = { calls: 0, sleeps: [] };
    const out = await loadTargets(scriptCall(seen, [okEnvelope()]), { delays: [5, 10], sleep: fakeSleep(seen) });
    assert.equal(out.ok, true);
    assert.equal(seen.calls, 1);
    assert.deepEqual(seen.sleeps, []);
  });
  it('抛一次再成功：恢复正常，只等待第一档', async () => {
    const seen = { calls: 0, sleeps: [] };
    const out = await loadTargets(scriptCall(seen, [notRegistered(), okEnvelope()]), {
      delays: [5, 10],
      sleep: fakeSleep(seen),
    });
    assert.equal(out.ok, true);
    assert.equal(seen.calls, 2);
    assert.deepEqual(seen.sleeps, [5]);
  });
  it('一直抛：保留最后一次失败，等待完每一档', async () => {
    const seen = { calls: 0, sleeps: [] };
    const out = await loadTargets(scriptCall(seen, [notRegistered()]), {
      delays: [5, 10],
      sleep: fakeSleep(seen),
    });
    assert.equal(out.ok, false);
    assert.equal(out.code, 'manager-unreachable');
    assert.equal(seen.calls, 3);
    assert.deepEqual(seen.sleeps, [5, 10]);
  });
  it('中途卸载即停：不再发起下一次调用', async () => {
    const seen = { calls: 0, sleeps: [] };
    const out = await loadTargets(scriptCall(seen, [notRegistered(), okEnvelope()]), {
      delays: [5, 10],
      sleep: fakeSleep(seen),
      isAlive: () => false,
    });
    assert.equal(out.ok, false);
    assert.equal(seen.calls, 1);
    assert.deepEqual(seen.sleeps, []);
  });
  it('第一次失败后卸载：等待后也不再试', async () => {
    const seen = { calls: 0, sleeps: [] };
    let alive = true;
    const sleepAndDie = (ms) => {
      seen.sleeps.push(ms);
      alive = false;
      return Promise.resolve();
    };
    const out = await loadTargets(scriptCall(seen, [notRegistered(), okEnvelope()]), {
      delays: [5, 10],
      sleep: sleepAndDie,
      isAlive: () => alive,
    });
    assert.equal(out.ok, false);
    assert.equal(seen.calls, 1);
    assert.deepEqual(seen.sleeps, [5]);
  });
});

describe('#982 失败日志细节', () => {
  it('传输层原文优先：带原因码前缀', () => {
    assert.equal(
      loadFailureDetail({ ok: false, code: 'manager-unreachable', message: 'x', details: { detail: 'route gone' }, manual: null }),
      'manager-unreachable detail=route gone',
    );
  });
  it('无原文回退原因码；超长截断', () => {
    assert.equal(
      loadFailureDetail({ ok: false, code: 'internal', message: 'x', details: {}, manual: null }),
      'internal',
    );
    const long = 'e'.repeat(500);
    const text = loadFailureDetail({ ok: false, code: 'manager-unreachable', message: 'x', details: { detail: long }, manual: null });
    assert.ok(text.length <= 'manager-unreachable detail='.length + 300, '日志细节必须截断');
  });
});
