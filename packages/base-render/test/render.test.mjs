// P7 #8：render 单测（node:test，假端口，不启动 DSH；B 落地实测等装机）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createPageRegistry, pageOrReco, recoDescriptor,
  STYLE_PREFIX, STYLE_TOKENS, cx, token,
  RENDER_CONTRACT_VERSION, RENDER_ENVELOPE_VERSION, RenderError, escapeHtml, renderPage, renderReco,
  mountInjector, openPage,
} from '../dist/index.js';
import { ENVELOPE_VERSION, createEnvelope } from 'base-link-core';

const page = (skill, order) => ({ skill, slotId: 'ilife:' + skill, order, title: skill, kind: 'page' });

function fakePort(opts = {}) {
  const calls = { register: [], open: [], unregister: 0 };
  let ready = opts.ready ?? true;
  return {
    calls,
    setReady(v) { ready = v; },
    hasTabs: () => ready,
    registerTab(entry) {
      calls.register.push(entry);
      return () => { calls.unregister += 1; };
    },
    openTab(seed, scope) { calls.open.push({ seed, scope }); },
  };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('ui 自注册', () => {
  it('按 order 升序，重复 slotId 大声失败', () => {
    const reg = createPageRegistry();
    reg.registerPage(page('memo', 80));
    reg.registerPage(page('calorie', 70));
    assert.deepEqual(reg.pages().map((p) => p.skill), ['calorie', 'memo']);
    assert.throws(() => reg.registerPage(page('calorie', 70)), /duplicate slotId/);
  });
  it('disposer 移除且幂等', () => {
    const reg = createPageRegistry();
    const dispose = reg.registerPage(page('bill', 75));
    dispose(); dispose();
    assert.equal(reg.pageForSlot('ilife:bill'), undefined);
  });
  it('缺席纯条件回 reco（总管不 import 单品）', () => {
    const reg = createPageRegistry();
    const reco = recoDescriptor('chef', 'ilife:chef', 90, 'chef');
    assert.equal(pageOrReco(reg, reco).kind, 'reco');
    reg.registerPage(page('chef', 90));
    assert.equal(pageOrReco(reg, reco).kind, 'page');
  });
});

describe('style 单源', () => {
  it('类名全加前缀，token 冻结', () => {
    assert.equal(cx('page', false, null, 'on'), STYLE_PREFIX + 'page ' + STYLE_PREFIX + 'on');
    assert.ok(Object.isFrozen(STYLE_TOKENS));
    assert.equal(token('accent'), STYLE_TOKENS.accent);
  });
});

describe('渲染契约', () => {
  it('版本与 link-core 同值（防漂移）', () => {
    assert.equal(RENDER_ENVELOPE_VERSION, ENVELOPE_VERSION);
  });
  it('正常渲染转义输出', () => {
    const out = renderPage(page('calorie', 70), createEnvelope({ skill: 'calorie', shape: 'list', key: 'calorie.today', data: { items: ['<b>hi</b>'] } }));
    assert.equal(out.contractVersion, RENDER_CONTRACT_VERSION);
    assert.equal(out.slotId, 'ilife:calorie');
    assert.ok(out.html.includes('&lt;b&gt;hi&lt;/b&gt;'));
    assert.ok(out.html.includes('data-slot="ilife:calorie"'));
  });
  it('缺失阻断不返空', () => {
    const nodata = { version: '0.1.0', skill: 'calorie', shape: 'list', key: 'calorie.today', data: undefined };
    assert.throws(() => renderPage(page('calorie', 70), nodata), (e) => e instanceof RenderError && e.code === 'missing-data');
    const badver = { version: '9.9.9', skill: 'x', shape: 'list', key: 'x.y', data: { items: [] } };
    assert.throws(() => renderPage(page('calorie', 70), badver), (e) => e instanceof RenderError && e.code === 'bad-envelope');
    const valid = createEnvelope({ skill: 'c', shape: 'list', key: 'c.y', data: { items: [] } });
    assert.throws(() => renderPage(recoDescriptor('c', 'ilife:c', 1, 'c'), valid), (e) => e.code === 'reco-only');
  });
  it('reco 渲染带显式缺席标记', () => {
    const out = renderReco(recoDescriptor('home', 'ilife:home', 85, 'home'));
    assert.ok(out.html.includes('data-missing="1"'));
  });
  it('escapeHtml 全覆盖', () => {
    assert.equal(escapeHtml('&<>"'), '&amp;&lt;&gt;&quot;');
  });
});

describe('injector 装配归一', () => {
  it('按 order 注册 ilife 星号 id', () => {
    const port = fakePort();
    const h = mountInjector(port, [page('memo', 80), page('calorie', 70)]);
    assert.equal(h.pending(), false);
    assert.deepEqual(port.calls.register.map((e) => e.id), ['ilife:calorie', 'ilife:memo']);
    assert.ok(port.calls.register.every((e) => e.single === true));
    h.dispose();
    assert.equal(port.calls.unregister, 2);
  });
  it('服务未就绪有界重试，就绪后补注册，无轮询残留', async () => {
    const port = fakePort({ ready: false });
    const h = mountInjector(port, [page('bill', 75)], { maxRetries: 20, retryMs: 5 });
    assert.equal(h.pending(), true);
    await sleep(20);
    port.setReady(true);
    await sleep(30);
    assert.equal(port.calls.register.length, 1);
    assert.equal(h.pending(), false);
    h.dispose();
  });
  it('始终未就绪则停重试（不无限轮询）', async () => {
    const port = fakePort({ ready: false });
    const h = mountInjector(port, [page('bill', 75)], { maxRetries: 3, retryMs: 5 });
    await sleep(60);
    assert.equal(h.pending(), false);
    assert.equal(port.calls.register.length, 0);
    h.dispose();
  });
  it('openPage 走 path seed，缺席静默返回', () => {
    const port = fakePort();
    openPage(port, page('memo', 80), 's1');
    assert.deepEqual(port.calls.open[0], { seed: { type: 'ilife:memo', path: 'ilife:memo' }, scope: { sessionId: 's1' } });
    openPage(port, page('memo', 80));
    assert.equal(port.calls.open[1].scope, undefined);
    const down = fakePort({ ready: false });
    openPage(down, page('memo', 80));
    assert.equal(down.calls.open.length, 0);
  });
  it('render 包无运行时依赖（红线钉死）', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
  });
});
