// T1 view seam (#1160): press shrink + focus double-ring locked, break-one must RED.
// Reads built dist (npm run build first), same as config-panel-908/920 pattern.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const contract = await import('../dist/config-panel-contract.js');
const view = await import('../dist/config-panel-view.js');
const value = await import('../dist/config-panel-value.js');
const { toDraft } = value;
describe('#1160 T1: press + focus tokens (single definition)', () => {
  it('contract four cells equal spec V1 (.97 / 2+5 / .15s x4)', () => {
    assert.equal(contract.PRESS_SCALE, 0.97);
    assert.equal(contract.FOCUS_RING_GAP_PX, 2);
    assert.equal(contract.FOCUS_RING_WIDTH_PX, 5);
    assert.match(contract.INTERACTION_TRANSITION, /background .*\.15s/);
    assert.match(contract.INTERACTION_TRANSITION, /transform .*\.15s/);
    assert.match(contract.INTERACTION_TRANSITION, /box-shadow .*\.15s/);
    assert.match(contract.INTERACTION_TRANSITION, /border-color .*\.15s/);
  });
  it('COPY_FEEDBACK_MS final 900 (#1162差值终结：1500→900，老期望已更新)', () => {
    assert.equal(contract.COPY_FEEDBACK_MS, 900);
  });
  it('interactionCss carries press scale + focus 2+5 + theme var, no hard blue', () => {
    assert.equal(typeof view.interactionCss, 'function');
    const css = view.interactionCss();
    assert.match(css, /scale\(0\.97\)/);
    assert.match(css, /0 0 0 2px/);
    assert.match(css, /0 0 0 5px/);
    assert.match(css, /--ilife-focus/);
    assert.match(css, /--dsw-alias-brand-primary/);
    assert.doesNotMatch(css, /#0a84ff/);
    assert.match(css, /:active/);
    assert.match(css, /:focus-visible/);
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
];
const SURFACE = { path: 'C:/x.yaml', dataDir: 'C:/d', created: false, values: { db: { dir: '' } }, resolved: {} };
function bodyProps(over = {}) {
  return { title: 't', items: ITEMS, state: { kind: 'ready', surface: SURFACE }, draft: toDraft(ITEMS, SURFACE.values, SURFACE), busy: false, notice: null, writeError: null, error: null, picking: false, browseRow: null, rowEntry: { mode: 'browse', onOpen: () => undefined }, dirtyKeys: [], followKeys: [], copy: null, onCopy: () => {}, onChange: () => {}, onSave: () => {}, onReset: () => {}, onRetry: () => {}, ...over };
}
describe('#1160 T1: buttons press, inputs focus, card carries style seam', () => {
  it('Row copy + browse buttons carry data-ilife-press', () => {
    const copyRow = view.Row({ item: ITEMS[1], value: 'v', disabled: false, onChange: () => {}, onCopy: () => {} });
    const btns1 = flat(copyRow).filter((n) => n.type === 'button');
    assert.ok(btns1.length >= 1);
    assert.ok(btns1.every((b) => b.props['data-ilife-press'] !== undefined));
    const dirRow = view.Row({ item: ITEMS[0], value: 'v', disabled: false, onChange: () => {}, onCopy: () => {}, browser: { mode: 'browse', onOpen: () => undefined } });
    const btns2 = flat(dirRow).filter((n) => n.type === 'button');
    assert.equal(btns2.length, 2);
    assert.ok(btns2.every((b) => b.props['data-ilife-press'] !== undefined));
  });
  it('Row inputs carry data-ilife-focus and do NOT shrink (no press attr)', () => {
    const dirRow = view.Row({ item: ITEMS[0], value: 'v', disabled: false, onChange: () => {}, onCopy: () => {}, browser: { mode: 'browse', onOpen: () => undefined } });
    const inputs = flat(dirRow).filter((n) => n.type === 'input');
    assert.ok(inputs.length >= 1);
    for (const i of inputs) {
      assert.equal(i.props['data-ilife-focus'], 'input');
      assert.equal(i.props['data-ilife-press'], undefined);
    }
  });
  it('PanelBody card head carries one style[data-ilife-interaction] with press+focus', () => {
    const tree = expandTree(view.PanelBody(bodyProps()));
    const styles = flat(tree).filter((n) => n.type === 'style' && n.props['data-ilife-interaction'] === 't1');
    assert.equal(styles.length, 1);
    assert.match(textOf(styles[0]), /scale\(0\.97\)/);
    assert.match(textOf(styles[0]), /:focus-visible/);
  });
  it('bar save/reset/retry carry data-ilife-press', () => {
    const tree = expandTree(view.PanelBody(bodyProps()));
    const btns = flat(tree).filter((n) => n.type === 'button');
    const barBtns = btns.filter((b) => ['save', 'reset', 'retry'].includes(b.props['data-ilife-press']));
    assert.ok(barBtns.length >= 3, 'expected >=3 bar buttons, got ' + barBtns.length);
  });
  it('seal dialog close (in-card overlay) carries data-ilife-press; seal stamps stay exempt', () => {
    const seals = [
      { role: 'skill', tier: 'copper', label: 's', progress: 'p', status: 's', plan: 'p' },
      { role: 'help', tier: 'silver', label: 'h', progress: 'p', status: 's', plan: 'p' },
      { role: 'plugin', tier: 'gold', label: 'g', progress: 'p', status: 's', plan: 'p' },
    ];
    const tree = expandTree(view.PanelBody(bodyProps({ seals, sealSeed: 0, selectedSeal: 0, onSealSelect: () => {}, onSealClose: () => {} })));
    const close = flat(tree).filter((n) => n.type === 'button' && textOf(n) === '关闭');
    assert.equal(close.length, 1);
    assert.equal(close[0].props['data-ilife-press'], 'seal-close');
  });
  it('StatusBlock actions press, link focuses (no shrink on links)', () => {
    const sb = view.StatusBlock({ name: 'n', tone: 'ok', text: 't', path: 'C:/p', actions: [{ text: 'go', onPress: () => {} }], link: { text: 'site', href: 'https://example.com' } });
    const btns = flat(sb).filter((n) => n.type === 'button');
    assert.equal(btns.length, 1);
    assert.equal(btns[0].props['data-ilife-press'], 'status-action');
    const links = flat(sb).filter((n) => n.type === 'a');
    assert.equal(links.length, 1);
    assert.equal(links[0].props['data-ilife-focus'], 'status-link');
    assert.equal(links[0].props['data-ilife-press'], undefined);
  });
  it('pixel seam script exits 0 with PASS + ratio line (single-route minimal)', () => {
    const out = execFileSync(process.execPath, [join(PKG, 'scripts', 'pixel-t1-compare.mjs')], { encoding: 'utf8' });
    assert.match(out, /PIXEL_T1_DIFF_RATIO=0\.000/);
    assert.match(out, /PIXEL_T1_RESULT=PASS/);
  });
});