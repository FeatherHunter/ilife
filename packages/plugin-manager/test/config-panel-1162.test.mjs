// T3 result seam (#1162): advanced fold 220 + chev rotate, copy final 900 + back-to-idle,
// notice 180 fade, low-end update:slow (goo blur off + static fallbacks).
// Break-one must RED. Reads built dist (tsc first), same as config-panel-1160/1161 pattern.
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
const SRC_PANEL = readFileSync(join(PKG, 'src', 'config-panel.ts'), 'utf8');

describe('#1162 T3: contract six cells equal spec V1 + prototype', () => {
  it('fold cells (open 220 / chev 200 / shift 2px / cap 300)', () => {
    assert.equal(contract.ADVANCED_OPEN_MS, 220);
    assert.equal(contract.ADVANCED_CHEV_MS, 200);
    assert.equal(contract.ADVANCED_CHEV_SHIFT_PX, 2);
    assert.equal(contract.ADVANCED_OPEN_MAX_PX, 300);
  });
  it('notice cells (fade 180ms / rise 8px)', () => {
    assert.equal(contract.NOTICE_FADE_MS, 180);
    assert.equal(contract.NOTICE_RISE_PX, 8);
  });
  it('COPY final 900 (#1162\u5dee\u503c\u7ec8\u7ed3\uff1a1500\u2192900)', () => {
    assert.equal(contract.COPY_FEEDBACK_MS, 900);
  });
  it('T1 four + T2 ten no regress (.97 / 2+5 / 13% / 500ms)', () => {
    assert.equal(contract.PRESS_SCALE, 0.97);
    assert.equal(contract.FOCUS_RING_GAP_PX, 2);
    assert.equal(contract.FOCUS_RING_WIDTH_PX, 5);
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

describe('#1162 T3: interactionCss fold + chev + notice (theme vars, no hard blue)', () => {
  it('fold head transition + chev 0.2s + open rotate 90 + hover shift 2px themed', () => {
    const css = view.interactionCss();
    assert.match(css, /\[data-ilife-advanced="head"\]\{transition:/);
    assert.match(css, /\[data-ilife-advanced="mark"\]\{display:inline-block;transition:transform 0\.2s ease\}/);
    assert.match(css, /\[data-ilife-advanced="group"\]\[open\] \[data-ilife-advanced="mark"\]\{transform:rotate\(90deg\)\}/);
    assert.match(css, /\[data-ilife-advanced="head"\]:hover \[data-ilife-advanced="mark"\]\{color:var\(--ilife-focus, var\(--dsw-alias-brand-primary, #f6ad55\)\);transform:translateX\(2px\)\}/);
  });
  it('fold body open runs ilifeFoldIn 0.22s 0->300 + 0->1 (details discrete-safe)', () => {
    const css = view.interactionCss();
    assert.match(css, /\[data-ilife-advanced="group"\]\[open\] \[data-ilife-advanced="body"\]\{animation:ilifeFoldIn 0\.22s ease\}/);
    assert.match(css, /@keyframes ilifeFoldIn\{from\{max-height:0;opacity:0\}to\{max-height:300px;opacity:1\}\}/);
  });
  it('notice mount runs ilifeToastIn 0.18s 8px rise (prototype toast verbatim)', () => {
    const css = view.interactionCss();
    assert.match(css, /\[data-ilife-notice="line"\]\{animation:ilifeToastIn 0\.18s ease\}/);
    assert.match(css, /@keyframes ilifeToastIn\{from\{opacity:0;transform:translateY\(8px\)\}to\{opacity:1;transform:none\}\}/);
  });
  it('no hard-coded blue anywhere in generated css', () => {
    assert.doesNotMatch(view.interactionCss(), /#0a84ff/);
  });
  it('reduced motion + low-end keep fold/notice static and heavy fx off', () => {
    const css = view.interactionCss();
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{/);
    assert.match(css, /\[data-ilife-advanced="group"\]\[open\] \[data-ilife-advanced="body"\]\{animation:none\}/);
    assert.match(css, /\[data-ilife-notice="line"\]\{animation:none\}/);
    assert.match(css, /@media \(update: slow\)\{/);
    assert.match(css, /\[data-ilife-press\]::before\{display:none\}/);
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
  if (typeof tree === 'string' || tree === 'number') return tree;
  if (Array.isArray(tree)) return tree.map(expandTree);
  if (typeof tree === 'object' && tree.props !== undefined) {
    if (typeof tree.type === 'function') { try { return expandTree(tree.type(tree.props)); } catch { return tree; } }
    return { type: tree.type, props: { ...tree.props, children: expandTree(tree.props.children) } };
  }
  return tree;
}
function textOf(n) {
  if (n === null || n === undefined || typeof n === 'boolean') return '';
  if (typeof n === 'string') return n;
  if (typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join('');
  if (typeof n === 'object' && n.props !== undefined) return textOf(n.props.children);
  return '';
}
const ITEMS = [
  { key: 'db.dir', title: 'data dir', tier: 'common', control: 'directory', prefillFrom: 'dataDir', hint: 'h' },
  { key: 'db.name', title: 'db file', tier: 'common', control: 'text', readonly: true, resolveFrom: 'dbFile', hint: 'h' },
  { key: 'db.adv', title: 'adv item', tier: 'advanced', control: 'text', hint: 'h' },
];
const SURFACE = { path: 'C:/x.yaml', dataDir: 'C:/d', created: false, values: { db: { dir: '' } }, resolved: {} };
function bodyProps(over = {}) {
  return { title: 't', items: ITEMS, state: { kind: 'ready', surface: SURFACE }, draft: toDraft(ITEMS, SURFACE.values, SURFACE), busy: false, notice: null, writeError: null, error: null, picking: false, browseRow: null, rowEntry: { mode: 'browse', onOpen: () => undefined }, dirtyKeys: [], followKeys: [], copy: null, onCopy: () => {}, onChange: () => {}, onSave: () => {}, onReset: () => {}, onRetry: () => {}, ...over };
}

describe('#1162 T3: advanced group + notice markers (#920 shape kept)', () => {
  it('details carries group marker and stays closed by default', () => {
    const tree = expandTree(view.PanelBody(bodyProps()));
    const details = flat(tree).filter((n) => n.type === 'details');
    assert.equal(details.length, 1);
    assert.equal(details[0].props['data-ilife-advanced'], 'group');
    assert.equal(details[0].props.open, undefined);
  });
  it('summary head + chev mark keep arrow + title text', () => {
    const tree = expandTree(view.PanelBody(bodyProps()));
    const heads = flat(tree).filter((n) => n.type === 'summary');
    assert.equal(heads.length, 1);
    assert.equal(heads[0].props['data-ilife-advanced'], 'head');
    const marks = flat(tree).filter((n) => n.type === 'span' && n.props['data-ilife-advanced'] === 'mark');
    assert.equal(marks.length, 1);
    assert.equal(textOf(heads[0]), '\u203a' + contract.ADVANCED_GROUP_TITLE);
  });
  it('advanced body pane wraps advanced rows only', () => {
    const tree = expandTree(view.PanelBody(bodyProps()));
    const panes = flat(tree).filter((n) => n.type === 'div' && n.props['data-ilife-advanced'] === 'body');
    assert.equal(panes.length, 1);
  });
  it('notice line carries marker with notice text; absent prop means no line', () => {
    const withNotice = expandTree(view.PanelBody(bodyProps({ notice: '\u5df2\u4fdd\u5b58' })));
    const lines = flat(withNotice).filter((n) => n.type === 'div' && n.props['data-ilife-notice'] === 'line');
    assert.equal(lines.length, 1);
    assert.equal(textOf(lines[0]), '\u5df2\u4fdd\u5b58');
    const withoutNotice = expandTree(view.PanelBody(bodyProps({ notice: null })));
    assert.equal(flat(withoutNotice).filter((n) => n.type === 'div' && n.props['data-ilife-notice'] === 'line').length, 0);
  });
});

describe('#1162 T3: copy timing wiring follows contract + tab low-end', () => {
  it('config-panel resets via COPY_FEEDBACK_MS then back to idle', () => {
    assert.ok(SRC_PANEL.includes('}, COPY_FEEDBACK_MS)'), 'reset delay must read the single definition');
    assert.ok(SRC_PANEL.includes('setCopy(null)'), 'must flip back to \u590d\u5236 after the delay');
  });
  it('tab liquid low-end: update slow kills goo blur, selected falls back solid', () => {
    const css = view.tabInteractionCss();
    assert.match(css, /@media \(update: slow\)\{/);
    assert.match(css, /\[data-ilife-tablist\] \[data-ilife-glider-layer\]\{display:none\}/);
    assert.match(css, /\[data-ilife-tab\]\[aria-selected="true"\]\{background:var\(--ilife-focus, var\(--dsw-alias-brand-primary, #f6ad55\)\)!important/);
  });
});
