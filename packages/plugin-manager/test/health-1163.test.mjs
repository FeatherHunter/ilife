// T4 view seam (#1163): update + health faces reuse shared interaction (no second tokens).
// Health face = exactly one button (health-run); update face = zero buttons (code removed per #1168).
// Folding/copy/toast/liquid are N/A on these two faces (pointed out one by one below).
// Break-one must RED, fix must GREEN. Reads built dist (tsc first), same as 1160/1161 pattern.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const contract = await import('../dist/config-panel-contract.js');
const view = await import('../dist/config-panel-view.js');
const health = await import('../dist/health-view.js');
const SRC_HEALTH = readFileSync(join(PKG, 'src', 'health-view.ts'), 'utf8');
const SRC_UPDATE_CONTRACT = readFileSync(join(PKG, 'src', 'update-contract.ts'), 'utf8');

describe('#1163 T4: shared tokens no regress (T1 four + T2 ten + COPY 900 #1162终值)', () => {
  it('T1 four cells (.97 / 2+5) + COPY final 900 (#1162差值终结)', () => {
    assert.equal(contract.PRESS_SCALE, 0.97);
    assert.equal(contract.FOCUS_RING_GAP_PX, 2);
    assert.equal(contract.FOCUS_RING_WIDTH_PX, 5);
    assert.equal(contract.COPY_FEEDBACK_MS, 900);
  });
  it('T2 ten cells (hover 120/13/55+25/1px/22/180 + disabled .4/300 + longpress 500/3)', () => {
    assert.equal(contract.HOVER_SPOTLIGHT_RADIUS_PX, 120);
    assert.equal(contract.HOVER_WASH_PERCENT, 13);
    assert.equal(contract.HOVER_GLOW_EDGE_PERCENT, 55);
    assert.equal(contract.HOVER_GLOW_SOFT_PERCENT, 25);
    assert.equal(contract.HOVER_LIFT_PX, 1);
    assert.equal(contract.SPOTLIGHT_PEAK_PERCENT, 22);
    assert.equal(contract.SPOTLIGHT_FADE_MS, 180);
    assert.equal(contract.DISABLED_OPACITY, 0.4);
    assert.equal(contract.DISABLED_SHAKE_MS, 300);
    assert.equal(contract.LONGPRESS_MS, 500);
    assert.equal(contract.LONGPRESS_RING_HEIGHT_PX, 3);
  });
});

describe('#1163 T4: health face reuses the one shared seam (no second chain)', () => {
  it('health-view imports the single generator, defines no tokens of its own', () => {
    assert.ok(SRC_HEALTH.includes("import { interactionCss } from './config-panel-view.js'"), 'must reuse interactionCss, not duplicate');
    assert.ok(!/export const (PRESS_SCALE|HOVER_WASH_PERCENT|LONGPRESS_MS|COPY_FEEDBACK_MS)/.test(SRC_HEALTH), 'second token definition');
  });
  it('no hard-coded blue in health face (theme vars only)', () => {
    assert.doesNotMatch(SRC_HEALTH, /#0a84ff/);
    assert.ok(view.interactionCss().includes('--ilife-focus'), 'shared css must carry theme var');
  });
  it('the five live categories are present in the shared css health reuses', () => {
    const css = view.interactionCss();
    assert.match(css, /scale\(0\.97\)/);
    assert.match(css, /13%/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /ilifeShake 0\.3s ease/);
    assert.match(css, /ilifeLongRing 0\.5s linear forwards/);
  });
});

function flat(node, out = []) {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') return out;
  if (Array.isArray(node)) { for (const c of node) flat(c, out); return out; }
  if (typeof node === 'object' && node.props !== undefined) {
    out.push(node);
    flat(node.props.children, out);
    if (typeof node.type === 'function') {
      try { flat(node.type(node.props), out); } catch {}
    }
  }
  return out;
}
const LIGHTS = [{ id: 'dsh-bill-ilife', title: 'x', status: 'green', counts: { red: 0, yellow: 0, green: 1 }, hasChannel: true }];

describe('#1163 T4: health-run button carries all five live markers (both running states)', () => {
  it('idle: exactly one button, press+longpress=health-run, enabled', () => {
    const tree = health.HealthSummaryLine({ lights: LIGHTS, running: false, error: null, onRun: () => {} });
    const btns = flat(tree).filter((n) => n.type === 'button');
    assert.equal(btns.length, 1, 'health face has exactly one button, see ' + btns.length);
    assert.equal(btns[0].props['data-ilife-press'], 'health-run');
    assert.equal(btns[0].props['data-ilife-longpress'], 'health-run');
    assert.equal(btns[0].props.disabled, false);
    assert.equal(btns[0].props.children, '体检一次');
  });
  it('running: same markers, disabled (shake applies), busy text', () => {
    const tree = health.HealthSummaryLine({ lights: LIGHTS, running: true, error: null, onRun: () => {} });
    const btns = flat(tree).filter((n) => n.type === 'button');
    assert.equal(btns.length, 1);
    assert.equal(btns[0].props['data-ilife-press'], 'health-run');
    assert.equal(btns[0].props['data-ilife-longpress'], 'health-run');
    assert.equal(btns[0].props.disabled, true);
    assert.equal(btns[0].props.children, '体检中…');
  });
  it('one style seam in the same row, byte-identical to shared generator', () => {
    const tree = health.HealthSummaryLine({ lights: LIGHTS, running: false, error: null, onRun: () => {} });
    const styles = flat(tree).filter((n) => n.type === 'style' && n.props['data-ilife-interaction'] === 't1');
    assert.equal(styles.length, 1, 'health row must carry exactly one shared style tag');
    const kids = styles[0].props.children;
    const css = Array.isArray(kids) ? kids.join('') : String(kids ?? '');
    assert.equal(css, view.interactionCss(), 'health style must be the shared output, not a copy');
  });
  it('longpress never fires an action: render is pure, click fires once', () => {
    let calls = 0;
    const tree = health.HealthSummaryLine({ lights: LIGHTS, running: false, error: null, onRun: () => { calls += 1; } });
    assert.equal(calls, 0, 'render/hold without click must not call onRun');
    const btn = flat(tree).filter((n) => n.type === 'button')[0];
    btn.props.onClick();
    assert.equal(calls, 1, 'click still fires exactly once');
    assert.ok(!SRC_HEALTH.includes('onLongpress') && !SRC_HEALTH.includes('longpressTimer'), 'no longpress state/branch');
  });
});

describe('#1163 T4: not-applicable categories are pointed out, not silently skipped', () => {
  it('folding N/A: health faces render no <details>/<summary> elements', () => {
    assert.ok(!SRC_HEALTH.includes("createElement('details'"), 'health must not grow a folding group');
    assert.ok(!SRC_HEALTH.includes("createElement('summary'"), 'health must not grow a folding header');
    const tree = health.HealthSummaryLine({ lights: LIGHTS, running: false, error: null, onRun: () => {} });
    const kinds = flat(tree).map((n) => n.type);
    assert.ok(!kinds.includes('details') && !kinds.includes('summary'), 'rendered health row must not contain folding elements');
  });
  it('copy N/A: health faces have no copy button and touch no copy constant', () => {
    assert.ok(!SRC_HEALTH.includes('COPY_FEEDBACK_MS'), 'health must not touch copy timing (owned by #1162)');
    assert.ok(!SRC_HEALTH.includes('data-ilife-copy'), 'health must not carry copy markers');
    assert.ok(!SRC_HEALTH.includes('已复制'), 'health must not render copy feedback text');
  });
  it('toast + liquid N/A: health faces carry no toast/liquid markers', () => {
    assert.ok(!SRC_HEALTH.toLowerCase().includes('liquid'), 'health must not carry liquid slide (owned by #1165/#1162)');
    assert.ok(!SRC_HEALTH.toLowerCase().includes('toast'), 'health must not carry toast logic (owned by #1162)');
  });
});

describe('#1163 T4: update face has zero buttons (code removed, exempt with evidence)', () => {
  it('no update-panel render module exists', () => {
    assert.equal(existsSync(join(PKG, 'src', 'update-panel.ts')), false, 'update-panel.ts must stay absent (removed per #1168)');
  });
  it('update-contract + index say the removal out loud', () => {
    assert.ok(SRC_UPDATE_CONTRACT.includes('更新代码已全部移除'), 'update-contract must keep the removal note');
    const idx = readFileSync(join(PKG, 'src', 'index.ts'), 'utf8');
    assert.ok(idx.includes('更新电话已全部移除'), 'host side must keep the removal note');
  });
});
