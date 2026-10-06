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
    const close = flat(tree).filter((n) => n.type === 'button' && textOf(n) === '收卷');
    assert.equal(close.length, 1);
    assert.equal(close[0].props['data-ilife-press'], 'seal-close');
  });
  it('卷轴浮层跟着被点的章走：贴该行下方、右缘与那枚章对齐（不再整卡居中）', () => {
    const seals = [
      { role: 'skill', tier: 'copper', label: 's', progress: 'p', status: 's', plan: 'p' },
      { role: 'help', tier: 'silver', label: 'h', progress: 'p', status: 's', plan: 'p' },
      { role: 'plugin', tier: 'gold', label: 'g', progress: 'p', status: 's', plan: 'p' },
    ];
    // seals 这份数组给的是 技能／HELP／插件（乱序）。面板按角色定序 ⇒ 槽位：HELP=0、技能=1、插件=2。
    const dialogAt = (sel) => flat(expandTree(view.PanelBody(bodyProps({ seals, sealSeed: 0, selectedSeal: sel, onSealSelect: () => {}, onSealClose: () => {} }))))
      .filter((n) => n.props?.role === 'dialog')[0];
    const first = dialogAt(1), mid = dialogAt(0), third = dialogAt(2);
    assert.equal(first.props.style.top, 'calc(0.3em + 1.9em)', 'HELP（第一行）下方');
    assert.equal(mid.props.style.top, 'calc(3.4em + 1.9em)', '技能（第二行）下方');
    assert.equal(third.props.style.top, 'calc(6.2em + 1.9em)', '插件（第三行）下方');
    assert.equal(first.props.style.left, 'auto', '不再两边撑满居中');
    assert.equal(first.props.style.justifyContent, 'flex-end', '内框贴右缘');
    // sealSeed=0 时三行的右间距是 0.38／0.92／0.38em（槽位哈希），逐值对上才算「跟着那枚章」。
    // （槽位哈希是浮点乘加，字符串可能有 0.9199999… 的尾巴，比数值不比字面。）
    const padOf = (style) => Number(/calc\(([\d.]+)em \+ 1\.25em\)/.exec(String(style))[1]);
    assert.ok(Math.abs(padOf(first.props.style.right) - 0.38) < 1e-9, '第一行右间距 0.38em');
    assert.ok(Math.abs(padOf(mid.props.style.right) - 0.92) < 1e-9, '第二行右间距 0.92em');
    assert.ok(Math.abs(padOf(third.props.style.right) - 0.38) < 1e-9, '第三行右间距 0.38em');
    assert.ok(String(first.props.style.maxWidth).startsWith('calc(100% - 0.38'), '窄卡兜底：扣掉右让位与绦带');
  });

  it('三枚签按角色定序、少给几枚不炸（调用方给的顺序无关）', () => {
    const seals = [
      { role: 'skill', tier: 'copper', label: 's', progress: 'p', status: 's', plan: 'p' },
      { role: 'help', tier: 'silver', label: 'h', progress: 'p', status: 's', plan: 'p' },
      { role: 'plugin', tier: 'gold', label: 'g', progress: 'p', status: 's', plan: 'p' },
    ];
    // 乱序给（插件／技能／HELP）：面板自己按 help→skill→plugin 排，屏幕上仍应是 h、s、g
    const tree = expandTree(view.PanelBody(bodyProps({ seals: [seals[2], seals[0], seals[1]], sealSeed: 0, selectedSeal: null })));
    const domOrder = flat(tree).filter((n) => n.type === 'button' && ['h', 's', 'g'].includes(n.props['aria-label'])).map((n) => n.props['aria-label']);
    assert.deepEqual(domOrder, ['h', 's', 'g'], '按角色定序，不看调用方给的顺序');
    // 只给两枚：不炸，且第二枚落在第二行（浮层锚点跟着那一行）
    for (const subset of [[seals[1], seals[0]], [seals[1]], []]) {
      const t2 = expandTree(view.PanelBody(bodyProps({ seals: subset, sealSeed: 0, selectedSeal: subset.length > 1 ? 0 : null })));
      // flat() 会把函数组件连"元素本身＋展开结果"各记一次，去重后再数。
      const marks = new Set(flat(t2).filter((n) => n.type === 'button' && ['h', 's', 'g'].includes(n.props['aria-label'])).map((n) => n.props['aria-label']));
      assert.equal(marks.size, subset.length, '给几枚画几枚：' + subset.length);
    }
    const two = expandTree(view.PanelBody(bodyProps({ seals: [seals[1], seals[0]], sealSeed: 0, selectedSeal: 0 })));
    const dialog2 = flat(two).filter((n) => n.props?.role === 'dialog')[0];
    assert.equal(dialog2.props.style.top, 'calc(0.3em + 1.9em)', '只两枚时，选中的那枚仍在第一行');
    // 槽位包裹层：气泡挂这里（不过滤镜⇒字清晰），整层 z 要盖得住卡片内容
    const slot = flat(tree).filter((n) => n.props?.className === 'dshLifeSealSlot')[0];
    assert.ok(slot, '槽位包裹层要有类名');
    assert.equal(slot.props['data-tip'], '全场景打通中', '气泡文案＝档位话（与印本体同一份定义）');
    const overlay = flat(tree).filter((n) => n.props?.style?.zIndex === 15 && n.props.style.position === 'absolute')[0];
    assert.ok(overlay, '印覆盖层 z 15：高过卡片内容、低于浮层 20');
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