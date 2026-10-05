// T5 dialog seam (#1164): directory dialog group V1 full coverage (reuses T1/T2 shared seam).
// Reads built dist (tsc first), same as config-panel-1160/1161 pattern.
// Break-one must RED: removing any dialog-* marker fails its own assertion.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ui = await import('../dist/directory-browser-ui.js');
const parts = await import('../dist/directory-browser-parts.js');
const view = await import('../dist/config-panel-view.js');
const SRC_UI = readFileSync(join(PKG, 'src', 'directory-browser-ui.ts'), 'utf8');
const SRC_PARTS = readFileSync(join(PKG, 'src', 'directory-browser-parts.ts'), 'utf8');

const LABELS = {
  title: 'TITLE',
  close: 'CLOSE',
  up: 'UP',
  pathPlaceholder: 'PATHHOLDER',
  go: 'GO',
  showHidden: (n) => 'HIDDEN(' + n + ')',
  empty: 'EMPTY',
  loading: 'LOADING',
  newFolder: 'NEWFOLDER',
  createConfirm: 'CREATE',
  createCancel: 'GIVEUP',
  select: 'SEL',
  selected: 'PICKED',
  open: 'PICK',
  cancel: 'CANCEL',
  willPick: 'WILL:',
};

function listingOf(path = 'C:\\a') {
  return {
    path,
    home: 'C:\\',
    crumbs: [
      { name: 'C:\\', path: 'C:\\', hidden: false },
      { name: 'a', path: 'C:\\a', hidden: false },
    ],
    entries: [
      { name: 'b', path: 'C:\\a\\b', hidden: false },
      { name: '.h', path: 'C:\\a\\.h', hidden: true },
    ],
    truncated: false,
  };
}

function stateOf(over = {}) {
  return {
    phase: 'ready',
    listing: listingOf(),
    failure: null,
    selected: null,
    showHidden: false,
    draft: 'C:\\a',
    filter: '',
    creating: null,
    notice: null,
    roots: [
      { path: 'C:\\', kind: 'fixed' },
      { path: 'D:\\', kind: 'fixed' },
    ],
    ...over,
  };
}

function propsOf(state, over = {}) {
  return {
    open: true,
    state,
    labels: LABELS,
    onPick: () => undefined,
    onClose: () => undefined,
    onEnter: () => undefined,
    onUp: () => undefined,
    onSelect: () => undefined,
    onToggleHidden: () => undefined,
    onDraft: () => undefined,
    onCommitDraft: () => undefined,
    onCreate: () => undefined,
    onCreatingChange: () => undefined,
    ...over,
  };
}

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

function textOf(n) {
  if (n === null || n === undefined || typeof n === 'boolean') return '';
  if (typeof n === 'string') return n;
  if (typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join('');
  if (typeof n === 'object' && n.props !== undefined) return textOf(n.props.children);
  return '';
}

function buttonsOf(tree) {
  return flat(tree).filter((n) => n.type === 'button');
}

function buttonWith(tree, text) {
  return buttonsOf(tree).find((b) => textOf(b) === text);
}

describe('#1164 T5: dialog buttons each carry press+longpress (up/go/pick/cancel/close/newfolder)', () => {
  it('path row + foot + head buttons carry their dialog-* markers', () => {
    const tree = ui.DirectoryBrowser(propsOf(stateOf()));
    for (const [text, name] of [['UP', 'dialog-up'], ['GO', 'dialog-go'], ['PICK', 'dialog-pick'], ['CANCEL', 'dialog-cancel'], ['\u2715', 'dialog-close'], ['NEWFOLDER', 'dialog-newfolder']]) {
      const btn = buttonWith(tree, text);
      assert.ok(btn !== undefined, 'missing dialog button ' + text);
      assert.equal(btn.props['data-ilife-press'], name, text + ' press');
      assert.equal(btn.props['data-ilife-longpress'], name, text + ' longpress');
    }
  });
  it('crumb + root buttons carry dialog-crumb/dialog-root', () => {
    const tree = ui.DirectoryBrowser(propsOf(stateOf()));
    const crumb = buttonWith(tree, 'a');
    assert.ok(crumb !== undefined, 'missing crumb button');
    assert.equal(crumb.props['data-ilife-press'], 'dialog-crumb');
    assert.equal(crumb.props['data-ilife-longpress'], 'dialog-crumb');
    const root = buttonWith(tree, 'D:\\');
    assert.ok(root !== undefined, 'missing root button');
    assert.equal(root.props['data-ilife-press'], 'dialog-root');
    assert.equal(root.props['data-ilife-longpress'], 'dialog-root');
  });
  it('entry enter + select buttons carry dialog-entry/dialog-select', () => {
    const tree = ui.DirectoryBrowser(propsOf(stateOf()));
    const enter = buttonsOf(tree).find((b) => textOf(b).startsWith('\uD83D\uDCC1'));
    assert.ok(enter !== undefined, 'missing entry enter button');
    assert.equal(enter.props['data-ilife-press'], 'dialog-entry');
    assert.equal(enter.props['data-ilife-longpress'], 'dialog-entry');
    const sel = buttonWith(tree, 'SEL');
    assert.ok(sel !== undefined, 'missing entry select button');
    assert.equal(sel.props['data-ilife-press'], 'dialog-select');
    assert.equal(sel.props['data-ilife-longpress'], 'dialog-select');
  });
  it('create confirm/cancel carry dialog-create/dialog-create-cancel when creating', () => {
    const tree = ui.DirectoryBrowser(propsOf(stateOf({ creating: 'nd' })));
    const confirm = buttonWith(tree, 'CREATE');
    assert.ok(confirm !== undefined, 'missing create confirm');
    assert.equal(confirm.props['data-ilife-press'], 'dialog-create');
    assert.equal(confirm.props['data-ilife-longpress'], 'dialog-create');
    const cancel = buttonWith(tree, 'GIVEUP');
    assert.ok(cancel !== undefined, 'missing create cancel');
    assert.equal(cancel.props['data-ilife-press'], 'dialog-create-cancel');
    assert.equal(cancel.props['data-ilife-longpress'], 'dialog-create-cancel');
  });
});

describe('#1164 T5: inputs carry focus only (no press shrink, no longpress ring)', () => {
  it('path + create inputs + hidden checkbox focus, exempt from press/longpress', () => {
    const tree = ui.DirectoryBrowser(propsOf(stateOf({ creating: 'nd' })));
    const inputs = flat(tree).filter((n) => n.type === 'input');
    assert.ok(inputs.length >= 3, 'expected path+create+checkbox, got ' + inputs.length);
    for (const input of inputs) {
      assert.ok(input.props['data-ilife-focus'] === 'dialog-input' || input.props['data-ilife-focus'] === 'dialog-check', 'input lacks dialog focus');
      assert.equal(input.props['data-ilife-press'], undefined, 'input must not shrink');
      assert.equal(input.props['data-ilife-longpress'], undefined, 'input must not ring');
    }
  });
});

describe('#1164 T5: disabled retained items locked (up at root / go empty / pick null / create empty)', () => {
  it('up disabled at root, enabled in subdir', () => {
    const atRoot = ui.DirectoryBrowser(propsOf(stateOf({ listing: listingOf('C:\\'), draft: 'C:\\' })));
    assert.equal(buttonWith(atRoot, 'UP').props.disabled, true, 'up at root must disable (shake+not-allowed)');
    const sub = ui.DirectoryBrowser(propsOf(stateOf()));
    assert.equal(buttonWith(sub, 'UP').props.disabled, false, 'up in subdir must enable');
  });
  it('go disabled when draft empty, enabled otherwise', () => {
    const empty = ui.DirectoryBrowser(propsOf(stateOf({ draft: '   ' })));
    assert.equal(buttonWith(empty, 'GO').props.disabled, true, 'go with empty draft must disable');
    const full = ui.DirectoryBrowser(propsOf(stateOf()));
    assert.equal(buttonWith(full, 'GO').props.disabled, false, 'go with draft must enable');
  });
  it('pick disabled with null target, enabled once selected', () => {
    const none = ui.DirectoryBrowser(propsOf(stateOf({ listing: null, selected: null, draft: '' })));
    const pickOff = buttonWith(none, 'PICK');
    assert.ok(pickOff !== undefined, 'missing pick button');
    assert.equal(pickOff.props.disabled, true, 'pick with null target must disable');
    const sel = ui.DirectoryBrowser(propsOf(stateOf({ selected: 'C:\\a\\b' })));
    assert.equal(buttonWith(sel, 'PICK').props.disabled, false, 'pick with selection must enable');
  });
  it('create confirm disabled on empty name, enabled on non-empty', () => {
    const empty = ui.DirectoryBrowser(propsOf(stateOf({ creating: '   ' })));
    assert.equal(buttonWith(empty, 'CREATE').props.disabled, true, 'create with empty name must disable');
    const full = ui.DirectoryBrowser(propsOf(stateOf({ creating: 'nd' })));
    assert.equal(buttonWith(full, 'CREATE').props.disabled, false, 'create with name must enable');
  });
  it('disabled buttons still carry press markers (shake needs the attribute)', () => {
    const none = ui.DirectoryBrowser(propsOf(stateOf({ listing: null, selected: null, draft: '' })));
    const pickOff = buttonWith(none, 'PICK');
    assert.equal(pickOff.props['data-ilife-press'], 'dialog-pick', 'disabled pick keeps press for shake');
  });
});

describe('#1164 T5: readonly row browse stays absent (v3 keep, not re-added)', () => {
  it('readonly directory row renders no browse button', () => {
    const item = { key: 'backup.dir', title: 'TX', tier: 'advanced', control: 'directory', readonly: true, resolveFrom: 'backupDir', hint: 'h' };
    const row = view.Row({ item, value: 'C:\\x', disabled: false, onChange: () => {}, onCopy: () => {} });
    const browse = buttonsOf(row).filter((b) => textOf(b) === '浏览文件夹');
    assert.deepEqual(browse, [], 'readonly row must keep zero browse buttons');
  });
});

describe('#1164 T5: longpress never fires an action (pure visual, no state branch)', () => {
  it('dialog buttons only call their click callback, render/hold calls nothing', () => {
    let ups = 0;
    let picks = 0;
    let selects = 0;
    const tree = ui.DirectoryBrowser(propsOf(stateOf({ selected: 'C:\\a\\b' }), {
      onUp: () => { ups += 1; },
      onPick: () => { picks += 1; },
      onSelect: () => { selects += 1; },
    }));
    assert.equal(ups, 0);
    assert.equal(picks, 0);
    assert.equal(selects, 0);
    buttonWith(tree, 'UP').props.onClick();
    assert.equal(ups, 1, 'click fires exactly once');
    buttonWith(tree, 'PICK').props.onClick();
    assert.equal(picks, 1, 'click fires exactly once');
    // 已选中行那枚是“✓”（未选中行才是 SEL）：点它即取消选中，照样只调一次。
    buttonWith(tree, '\u2713').props.onClick();
    assert.equal(selects, 1, 'click fires exactly once');
  });
  it('no longpress callback/state/listener in dialog sources', () => {
    for (const src of [SRC_UI, SRC_PARTS]) {
      assert.ok(!src.includes('onLongpress'), 'no longpress callback prop');
      assert.ok(!src.includes('longpressTimer') && !src.includes('setLongpress'), 'no longpress state');
      assert.ok(!src.includes('addEventListener'), 'view stays pure: no DOM listeners');
    }
  });
});

describe('#1164 T5: theme vars only (no hard blue), shared seam reused (no second chain)', () => {
  it('no hard-coded blue in dialog sources', () => {
    assert.ok(!SRC_UI.includes('#0a84ff'), 'dialog ui must not hard-code blue');
    assert.ok(!SRC_PARTS.includes('#0a84ff'), 'dialog parts must not hard-code blue');
  });
  it('dialog defines no tokens and no own style seam (reuses PanelBody interactionCss)', () => {
    for (const src of [SRC_UI, SRC_PARTS]) {
      assert.ok(!/export const (DIALOG_|PRESS_SCALE|HOVER_WASH_PERCENT|LONGPRESS_MS|FOCUS_RING)/.test(src), 'tokens stay in shared contract');
      assert.ok(!src.includes('function interactionCss'), 'no second css generator');
      assert.ok(!src.includes('data-ilife-interaction'), 'no second style seam (PanelBody owns the one)');
    }
    const css = view.interactionCss();
    assert.match(css, /\[data-ilife-press\]/);
    assert.match(css, /:disabled\{cursor:not-allowed/);
    assert.match(css, /ilifeLongRing/);
  });
  it('pixel seam script exits 0 with PASS + ratio line (single-route extended)', () => {
    const out = execFileSync(process.execPath, [join(PKG, 'scripts', 'pixel-t1-compare.mjs')], { encoding: 'utf8' });
    assert.match(out, /PIXEL_T1_DIFF_RATIO=0\.000/);
    assert.match(out, /PIXEL_T1_RESULT=PASS/);
    assert.match(out, /t5-ui-buttons-press=ok/);
    assert.match(out, /t5-ui-disabled-3=ok/);
  });
});
