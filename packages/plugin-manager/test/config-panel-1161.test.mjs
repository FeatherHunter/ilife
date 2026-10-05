// T2 view seam (#1161): hover wash+glow+lift+spotlight, disabled shake,
// long-press 500ms pure-visual ring (never fires), a11y x3. Break-one must RED.
// Reads built dist (tsc first), same as config-panel-1160 pattern.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const contract = await import('../dist/config-panel-contract.js');
const view = await import('../dist/config-panel-view.js');
const value = await import('../dist/config-panel-value.js');
const { toDraft } = value;
const SRC_VIEW = readFileSync(join(PKG, 'src', 'config-panel-view.ts'), 'utf8');
const SRC_SEAL_STAMP = readFileSync(join(PKG, 'src', 'seal-stamp.ts'), 'utf8');
const SRC_SEAL_SCROLL = readFileSync(join(PKG, 'src', 'seal-scroll.ts'), 'utf8');

describe('#1161 T2: contract ten cells equal spec V1 + prototype', () => {
  it('hover/spotlight cells (120 / 13% / 55+25 / 1px / 22% / 180ms)', () => {
    assert.equal(contract.HOVER_SPOTLIGHT_RADIUS_PX, 120);
    assert.equal(contract.HOVER_WASH_PERCENT, 13);
    assert.equal(contract.HOVER_GLOW_EDGE_PERCENT, 55);
    assert.equal(contract.HOVER_GLOW_SOFT_PERCENT, 25);
    assert.equal(contract.HOVER_LIFT_PX, 1);
    assert.equal(contract.SPOTLIGHT_PEAK_PERCENT, 22);
    assert.equal(contract.SPOTLIGHT_FADE_MS, 180);
  });
  it('disabled + longpress cells (.4 / 300ms / 500ms / 3px)', () => {
    assert.equal(contract.DISABLED_OPACITY, 0.4);
    assert.equal(contract.DISABLED_SHAKE_MS, 300);
    assert.equal(contract.LONGPRESS_MS, 500);
    assert.equal(contract.LONGPRESS_RING_HEIGHT_PX, 3);
  });
  it('T1 four cells + COPY final 900 (no regress: .97 / 2+5 / #1162终值900)', () => {
    assert.equal(contract.PRESS_SCALE, 0.97);
    assert.equal(contract.FOCUS_RING_GAP_PX, 2);
    assert.equal(contract.FOCUS_RING_WIDTH_PX, 5);
    assert.equal(contract.COPY_FEEDBACK_MS, 900);
  });
});

describe('#1161 T2: interactionCss hover + spotlight (theme vars, no hard blue)', () => {
  it('hover wash 13% + glow 55/25 + lift -1px on enabled only', () => {
    const css = view.interactionCss();
    assert.match(css, /13%/);
    assert.match(css, /55%/);
    assert.match(css, /25%/);
    assert.match(css, /translateY\(-1px\)/);
    assert.match(css, /:hover:not\(\:disabled\)/);
    assert.match(css, /--ilife-focus/);
  });
  it('spotlight 120px follows cursor vars, 22% peak, 65% falloff, .18s fade', () => {
    const css = view.interactionCss();
    assert.match(css, /120px circle at var\(--mx,50%\) var\(--my,50%\)/);
    assert.match(css, /22%/);
    assert.match(css, /transparent 65%/);
    assert.match(css, /0\.18s/);
  });
  it('no hard-coded blue anywhere in generated css', () => {
    assert.doesNotMatch(view.interactionCss(), /#0a84ff/);
  });
  it('press still wins over hover (active:hover scale .97), focus ring visible on hover', () => {
    const css = view.interactionCss();
    assert.match(css, /:active:hover:not\(\:disabled\)\{transform:scale\(0\.97\)\}/);
    assert.match(css, /:focus-visible:hover:not\(\:disabled\)\{box-shadow:0 0 0 2px/);
  });
});

describe('#1161 T2: disabled shake + longpress pure-visual ring', () => {
  it('disabled: not-allowed + opacity .4 + shake .3s +-2px', () => {
    const css = view.interactionCss();
    assert.match(css, /:disabled\{cursor:not-allowed;opacity:0\.4\}/);
    assert.match(css, /animation:ilifeShake 0\.3s ease/);
    assert.match(css, /@keyframes ilifeShake\{0%,100%\{transform:translateX\(0\)\}25%\{transform:translateX\(-2px\)\}75%\{transform:translateX\(2px\)\}\}/);
  });
  it('longpress: 3px theme ring, :active-driven 0.5s 0->100%, never a handler', () => {
    const css = view.interactionCss();
    assert.match(css, /\[data-ilife-longpress\]::after\{[^}]*height:3px/);
    assert.match(css, /:active:not\(\:disabled\)::after\{animation:ilifeLongRing 0\.5s linear forwards\}/);
    assert.match(css, /@keyframes ilifeLongRing\{from\{width:0\}to\{width:100%\}\}/);
    assert.ok(!SRC_VIEW.includes('onLongpress'), 'no longpress callback prop');
    assert.ok(!SRC_VIEW.includes('longpressTimer') && !SRC_VIEW.includes('setLongpress'), 'no longpress state');
    assert.ok(!SRC_VIEW.includes('addEventListener'), 'view stays pure: no DOM listeners');
  });
});

describe('#1161 T2: a11y three (touch degrade / keyboard focus / reduced motion)', () => {
  it('touch: hover:none kills lift+spotlight, keeps press+focus', () => {
    const css = view.interactionCss();
    assert.match(css, /@media \(hover:none\)\{/);
    assert.match(css, /::before\{display:none\}/);
    assert.match(css, /:active\{transform:scale\(0\.97\)\}/);
    assert.match(css, /:focus-visible/);
  });
  it('keyboard: focus-visible double ring retained (T1 no regress)', () => {
    const css = view.interactionCss();
    assert.match(css, /:focus-visible/);
    assert.match(css, /0 0 0 2px/);
    assert.match(css, /0 0 0 5px/);
  });
  it('reduced motion: transitions+shake+ring off, static wash+full ring remain', () => {
    const css = view.interactionCss();
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{/);
    assert.match(css, /transition:none/);
    assert.match(css, /:disabled:hover\{animation:none\}/);
    assert.match(css, /::after\{animation:none;width:100%\}/);
  });
});

function flat(node, out = []) {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') return out;
  if (Array.isArray(node)) { for (const c of node) flat(c, out); return out; }
  if (typeof node === 'object' && node.props !== undefined) {
    out.push(node);
    flat(node.props.children, out);
    if (typeof node.type === 'function' && node.type !== view.Row && node.type.name !== 'Row') {
      try { flat(node.type(node.props), out); } catch {}
    }
  }
  return out;
}
function expandTree(tree) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return null;
  if (typeof tree === 'string' || typeof tree === 'number') return tree;
  if (Array.isArray(tree)) return tree.map(expandTree);
  if (typeof tree === 'object' && tree.props !== undefined) {
    if (typeof tree.type === 'function') { try { return expandTree(tree.type(tree.props)); } catch { return tree; } }
    return { type: tree.type, props: { ...tree.props, children: expandTree(tree.props.children) } };
  }
  return tree;
}
const ITEMS = [
  { key: 'db.dir', title: 'data dir', tier: 'common', control: 'directory', prefillFrom: 'dataDir', hint: 'h' },
  { key: 'db.name', title: 'db file', tier: 'common', control: 'text', readonly: true, resolveFrom: 'dbFile', hint: 'h' },
];
const SURFACE = { path: 'C:/x.yaml', dataDir: 'C:/d', created: false, values: { db: { dir: '' } }, resolved: {} };
function bodyProps(over = {}) {
  return { title: 't', items: ITEMS, state: { kind: 'ready', surface: SURFACE }, draft: toDraft(ITEMS, SURFACE.values, SURFACE), busy: false, notice: null, writeError: null, error: null, picking: false, browseRow: null, rowEntry: { mode: 'browse', onOpen: () => undefined }, dirtyKeys: ['db.dir'], followKeys: [], copy: null, onCopy: () => {}, onChange: () => {}, onSave: () => {}, onReset: () => {}, onRetry: () => {}, ...over };
}
describe('#1161 T2: buttons carry longpress marker, inputs/links/seals exempt', () => {
  it('Row copy + browse buttons carry data-ilife-longpress', () => {
    const copyRow = view.Row({ item: ITEMS[1], value: 'v', disabled: false, onChange: () => {}, onCopy: () => {} });
    const btns1 = flat(copyRow).filter((n) => n.type === 'button');
    assert.ok(btns1.length >= 1);
    assert.ok(btns1.every((b) => b.props['data-ilife-longpress'] === 'copy'));
    const dirRow = view.Row({ item: ITEMS[0], value: 'v', disabled: false, onChange: () => {}, onCopy: () => {}, browser: { mode: 'browse', onOpen: () => undefined } });
    const browse = flat(dirRow).filter((n) => n.type === 'button' && n.props['data-ilife-press'] === 'browse');
    assert.equal(browse.length, 1);
    assert.equal(browse[0].props['data-ilife-longpress'], 'browse');
  });
  it('inputs carry focus only (no press shrink, no longpress ring)', () => {
    const dirRow = view.Row({ item: ITEMS[0], value: 'v', disabled: false, onChange: () => {}, onCopy: () => {}, browser: { mode: 'browse', onOpen: () => undefined } });
    const inputs = flat(dirRow).filter((n) => n.type === 'input');
    assert.ok(inputs.length >= 1);
    for (const i of inputs) {
      assert.equal(i.props['data-ilife-focus'], 'input');
      assert.equal(i.props['data-ilife-press'], undefined);
      assert.equal(i.props['data-ilife-longpress'], undefined);
    }
  });
  it('bar save/reset/retry + status action carry longpress', () => {
    const tree = expandTree(view.PanelBody(bodyProps()));
    const btns = flat(tree).filter((n) => n.type === 'button');
    for (const name of ['save', 'reset', 'retry']) {
      const hit = btns.filter((b) => b.props['data-ilife-press'] === name);
      assert.ok(hit.length >= 1, 'missing bar button ' + name);
      assert.ok(hit.every((b) => b.props['data-ilife-longpress'] === name), name + ' lacks longpress');
    }
  });
  it('seal stamps stay exempt (no longpress in seal modules)', () => {
    assert.ok(!SRC_SEAL_STAMP.includes('longpress'), 'seal-stamp untouched');
    assert.ok(!SRC_SEAL_SCROLL.includes('longpress'), 'seal-scroll untouched');
  });
  it('longpress never fires an action: buttons only call their click callback', () => {
    let calls = 0;
    const row = view.Row({ item: ITEMS[1], value: 'v', disabled: false, onChange: () => {}, onCopy: () => { calls += 1; } });
    const btn = flat(row).filter((n) => n.type === 'button')[0];
    assert.equal(calls, 0, 'render/hold without click must not call onCopy');
    btn.props.onClick();
    assert.equal(calls, 1, 'click still fires exactly once');
  });
  it('PanelBody keeps one style seam carrying T1+T2 markers', () => {
    const tree = expandTree(view.PanelBody(bodyProps()));
    const styles = flat(tree).filter((n) => n.type === 'style' && n.props['data-ilife-interaction'] === 't1');
    assert.equal(styles.length, 1);
    const kids = styles[0].props.children;
    const css = Array.isArray(kids) ? kids.join('') : String(kids ?? '');
    assert.match(css, /scale\(0\.97\)/);
    assert.match(css, /translateY\(-1px\)/);
    assert.match(css, /ilifeLongRing/);
    assert.match(css, /prefers-reduced-motion/);
  });
});
