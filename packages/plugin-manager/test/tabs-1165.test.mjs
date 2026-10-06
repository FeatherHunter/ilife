// T6 tabs seam (#1165): liquid comet slide + hover wash + dot breathing + focus + selected.
// Break-one must RED. Reads built dist (tsc first), same as config-panel-1160/1161 pattern.
// Slot mechanism untouched: tabs still from ledger projection + MANAGER_TABS map + renderSlot {only}.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const contract = await import('../dist/config-panel-contract.js');
const view = await import('../dist/config-panel-view.js');
const SRC_CLIENT = readFileSync(join(PKG, 'src', 'client.ts'), 'utf8');
const { renderManagerPanel } = await import('../../../test/helpers/panel-render.mjs');
const PRODUCT_NAMES = ['饼干记账', '卡路里', '备忘录', '作息管家', '居家管家', '私家大厨'];

describe('#1165 T6: contract cells equal spec V1 + prototype', () => {
  it('tab cells (wash 12 / pulse 800ms / transition bg+border .15s)', () => {
    assert.equal(contract.TAB_HOVER_WASH_PERCENT, 12);
    assert.equal(contract.TAB_DOT_PULSE_MS, 800);
    assert.equal(contract.TAB_TRANSITION, 'background .15s ease,border-color .15s ease');
  });
  it('liquid cells (1.28/.86 / ghost 180 / 220-380 / base 200 + dist*0.35 / ease)', () => {
    assert.equal(contract.LIQUID_STRETCH_X, 1.28);
    assert.equal(contract.LIQUID_STRETCH_Y, 0.86);
    assert.equal(contract.LIQUID_GHOST_MS, 180);
    assert.equal(contract.LIQUID_MIN_MS, 220);
    assert.equal(contract.LIQUID_MAX_MS, 380);
    assert.equal(contract.LIQUID_BASE_MS, 200);
    assert.equal(contract.LIQUID_DIST_FACTOR, 0.35);
    assert.equal(contract.LIQUID_EASE, 'cubic-bezier(.3,1.1,.4,1)');
  });
  it('T1 four + T2 ten + COPY final 900 (#1162差值终结，no regress)', () => {
    assert.equal(contract.PRESS_SCALE, 0.97);
    assert.equal(contract.FOCUS_RING_GAP_PX, 2);
    assert.equal(contract.FOCUS_RING_WIDTH_PX, 5);
    assert.equal(contract.COPY_FEEDBACK_MS, 900);
    assert.equal(contract.HOVER_WASH_PERCENT, 13);
    assert.equal(contract.HOVER_SPOTLIGHT_RADIUS_PX, 120);
    assert.equal(contract.HOVER_GLOW_EDGE_PERCENT, 55);
    assert.equal(contract.HOVER_GLOW_SOFT_PERCENT, 25);
    assert.equal(contract.HOVER_LIFT_PX, 1);
    assert.equal(contract.SPOTLIGHT_PEAK_PERCENT, 22);
    assert.equal(contract.DISABLED_OPACITY, 0.4);
    assert.equal(contract.DISABLED_SHAKE_MS, 300);
    assert.equal(contract.LONGPRESS_MS, 500);
    assert.equal(contract.LONGPRESS_RING_HEIGHT_PX, 3);
  });
});

describe('#1165 T6: tabInteractionCss hover + dot + focus + selected (theme vars, no hard blue)', () => {
  it('hover wash 12% without border change, unified dim baseline (#1175)', () => {
    const css = view.tabInteractionCss();
    assert.match(css, /12%/);
    assert.match(css, /\[data-ilife-tab\]:hover\{background:color-mix/);
    assert.match(css, /--ilife-focus/);
    const hover = css.match(/\[data-ilife-tab\]:hover\{[^}]*\}/)?.[0] ?? '';
    assert.doesNotMatch(hover, /border-color/);
  });
  it('dot breathes .8s scale 1.5 opacity .6 on hover only', () => {
    const css = view.tabInteractionCss();
    assert.match(css, /:hover \[data-ilife-health="tab-dot"\]\{animation:ilifeDotPulse 0\.8s ease infinite\}/);
    assert.match(css, /@keyframes ilifeDotPulse\{0%,100%\{transform:scale\(1\);opacity:1\}50%\{transform:scale\(1\.5\);opacity:\.6\}\}/);
  });
  it('focus double ring 2+5 follows theme (visible on same-color tab)', () => {
    const css = view.tabInteractionCss();
    assert.match(css, /\[data-ilife-tab\]:focus-visible\{outline:none;/);
    assert.match(css, /0 0 0 2px/);
    assert.match(css, /0 0 0 5px var\(--ilife-focus/);
  });
  it('selected itself transparent, glider layer below gives the pill (goo)', () => {
    const css = view.tabInteractionCss();
    assert.match(css, /\[data-ilife-tab\]\[aria-selected="true"\]\{background:transparent;border-color:transparent\}/);
    assert.match(css, /\[data-ilife-glider-layer\]\{[^}]*filter:url\(#ilife-goo\)/);
    assert.match(css, /\[data-ilife-ghost\]\{opacity:0\}/);
    assert.match(css, /\[data-ilife-ghost\]\{transition:opacity 0\.18s ease\}/);
  });
  it('no hard-coded blue anywhere in generated tabs css', () => {
    assert.doesNotMatch(view.tabInteractionCss(), /#0a84ff/);
  });
});

describe('#1165 T6: a11y two (touch degrade / reduced motion static fallback)', () => {
  it('touch: hover pulse off (press+slide kept, no hover lock-in)', () => {
    const css = view.tabInteractionCss();
    assert.match(css, /@media \(hover:none\)\{/);
    assert.match(css, /\[data-ilife-tab\]:hover \[data-ilife-health="tab-dot"\]\{animation:none\}/);
  });
  it('reduced motion: glider off + transitions off + selected solid fallback', () => {
    const css = view.tabInteractionCss();
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{/);
    assert.match(css, /\[data-ilife-glider-layer\]\{display:none\}/);
    assert.match(css, /\[data-ilife-tab\]\{transition:none\}/);
    assert.match(css, /\[data-ilife-tab\]\[aria-selected="true"\]\{background:var\(--ilife-focus, var\(--dsw-alias-brand-primary, #f6ad55\)\)!important/);
  });
});

describe('#1165 T6: liquid driver in client (prototype liquidTo verbatim, slot mechanism intact)', () => {
  it('duration formula 200+dist*0.35 clamped 220-380 with prototype ease', () => {
    assert.ok(SRC_CLIENT.includes('LIQUID_MAX_MS, Math.max(LIQUID_MIN_MS, LIQUID_BASE_MS + dist * LIQUID_DIST_FACTOR)'));
    assert.ok(SRC_CLIENT.includes('LIQUID_EASE'));
  });
  it('comet stretch 1.28/.86 at 45% + ghost 180ms dissipate, first mount only places', () => {
    assert.ok(SRC_CLIENT.includes('String(LIQUID_STRETCH_X)'));
    assert.ok(SRC_CLIENT.includes('String(LIQUID_STRETCH_Y)'));
    assert.ok(SRC_CLIENT.includes('offset: 0.45'));
    assert.ok(SRC_CLIENT.includes('String(LIQUID_GHOST_MS / 1000)'));
    assert.ok(SRC_CLIENT.includes("ghost.style.opacity = '0'"));
  });
  it('slot mechanism intact (no hand-drawn tabs): ledger + MANAGER_TABS.map + renderSlot {only}', () => {
    assert.ok(SRC_CLIENT.includes('props.useTabs'));
    assert.ok(SRC_CLIENT.includes('MANAGER_TABS.map'));
    assert.ok(SRC_CLIENT.includes('renderSlot(CONFIG_TAB_SLOT'));
    assert.ok(!SRC_CLIENT.includes('export const TAB_') && !SRC_CLIENT.includes('export const LIQUID_'));
  });
});

function flat(node, out = []) {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') return out;
  if (Array.isArray(node)) { for (const c of node) flat(c, out); return out; }
  if (typeof node === 'object' && node.props !== undefined) {
    out.push(node);
    flat(node.props.children, out);
  }
  return out;
}

describe('#1165 T6: tablist tree (true product render)', () => {
  it('six tab buttons carry data-ilife-tab, labels stay six product names', async () => {
    const { tree, tabLabels } = await renderManagerPanel();
    assert.deepEqual(tabLabels, PRODUCT_NAMES);
    const btns = flat(tree).filter((n) => n.type === 'button' && n.props?.role === 'tab');
    assert.equal(btns.length, 6);
    assert.ok(btns.every((b) => b.props['data-ilife-tab'] === 'tab'));
    assert.equal(btns.filter((b) => b.props['aria-selected'] === true).length, 1);
  });
  it('one style[data-ilife-tabs] + glider layer + goo filter + ghost/glider', async () => {
    const { tree } = await renderManagerPanel();
    const nodes = flat(tree);
    assert.equal(nodes.filter((n) => n.type === 'style' && n.props['data-ilife-tabs'] === 't6').length, 1);
    assert.equal(nodes.filter((n) => n.props?.['data-ilife-glider-layer'] === 't6').length, 1);
    assert.equal(nodes.filter((n) => n.props?.['data-ilife-ghost'] === 't6').length, 1);
    assert.equal(nodes.filter((n) => n.props?.['data-ilife-glider'] === 't6').length, 1);
    const filters = nodes.filter((n) => n.type === 'filter' && n.props?.id === 'ilife-goo');
    assert.equal(filters.length, 1);
  });
});
