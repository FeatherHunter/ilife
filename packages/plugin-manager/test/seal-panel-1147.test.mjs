// 票 1147 · 右区三枚签接线证明（纯函数级）：有签出三枚、无选中无卷、选中出对应卷。
// PanelBody 仍是纯函数（状态住 config-panel.ts），这里当普通函数调，直接读树。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { PanelBody } = await import('../dist/config-panel-view.js');

function expand(tree) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return null;
  if (typeof tree === 'string' || typeof tree === 'number') return tree;
  if (Array.isArray(tree)) return tree.map(expand);
  if (typeof tree === 'object' && tree.props !== undefined) {
    if (typeof tree.type === 'function') return expand(tree.type(tree.props));
    return { type: tree.type, props: { ...tree.props, children: expand(tree.props.children) } };
  }
  return tree;
}

function texts(tree, out = []) {
  const flat = expand(tree);
  const walk = (n) => {
    if (n === null || n === undefined || typeof n === 'boolean') return;
    if (typeof n === 'string' || typeof n === 'number') { out.push(String(n)); return; }
    if (Array.isArray(n)) { for (const c of n) walk(c); return; }
    walk(n.props.children);
  };
  walk(flat);
  return out;
}

function buttons(tree) {
  const flat = expand(tree);
  const out = [];
  const walk = (n) => {
    if (n === null || n === undefined || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const c of n) walk(c); return; }
    if (n.type === 'button') out.push(n);
    walk(n.props.children);
  };
  walk(flat);
  return out;
}

const SEALS = [
  { role: 'help', tier: 'gold', label: '饼干记账 HELP', progress: '完成度 30%', status: '精磨', plan: '将所有功能和页面打磨至完美' },
  { role: 'skill', tier: 'silver', label: '技能', progress: '完成度 80%', status: '全打通', plan: '将所有功能和场景全部打通' },
  { role: 'plugin', tier: 'copper', label: '插件', progress: '完成度 60%', status: '基本可用', plan: '修复明显bug并将未打通场景打通' },
];

function bodyProps(extra) {
  return {
    title: '饼干记账', seals: SEALS,
    items: [], state: { kind: 'loading' }, draft: {}, busy: false,
    notice: null, writeError: null, error: null, picking: false,
    browseRow: null, rowEntry: null, dirtyKeys: [], followKeys: [], copy: null,
    onCopy: () => undefined, onChange: () => undefined,
    onSave: () => undefined, onReset: () => undefined, onRetry: () => undefined,
    ...extra,
  };
}

describe('1147 右区三枚签接线', () => {
  it('三枚印文都在屏上', () => {
    const t = texts(PanelBody(bodyProps({})));
    assert.ok(t.includes('饼干记账 HELP') && t.includes('技能') && t.includes('插件'));
  });
  it('无选中无卷', () => {
    const t = texts(PanelBody(bodyProps({ selectedSeal: null })) );
    assert.equal(t.includes('关闭'), false);
    assert.equal(t.includes('完成度 80%'), false);
  });
  it('选中第二枚出银卷三段', () => {
    const t = texts(PanelBody(bodyProps({ selectedSeal: 1, onSealClose: () => undefined })) );
    assert.ok(t.includes('完成度 80%') && t.includes('全打通') && t.includes('将所有功能和场景全部打通'));
  });
  it('无签一行都不印', () => {
    const seals = buttons(PanelBody(bodyProps({ seals: undefined })));
    assert.equal(seals.filter((b) => b.props['aria-haspopup'] === 'dialog').length, 0);
  });
  it('倾角轻微且方向随机（两家六枚互异，幅度不超 2.5°）', () => {
    const tilts = [];
    for (const seed of [0, 1]) {
      const flat = expand(PanelBody(bodyProps({ sealSeed: seed })));
      const walk = (n) => {
        if (n === null || n === undefined || typeof n !== 'object') return;
        if (Array.isArray(n)) { for (const c of n) walk(c); return; }
        const t = n.props && n.props.style && n.props.style.transform;
        if (typeof t === 'string' && t.indexOf('rotate(') === 0) tilts.push(t);
        walk(n.props.children);
      };
      walk(flat);
    }
    assert.equal(tilts.length, 6);
    assert.equal(new Set(tilts).size, 6, '倾角必须互异：' + tilts.join(','));
    const degs = tilts.map((t) => Number(t.slice(7, -4)));
    for (const d of degs) assert.ok(Math.abs(d) <= 2.5 && Math.abs(d) >= 0.5, '倾角须轻微（0.5°～2.5°），实到 ' + d);
    assert.ok(Math.min(...degs) < 0 && Math.max(...degs) > 0, '倾斜方向须有正有负');
  });
  it('三行定序且居右（HELP 上／技能中／插件下；各家右间距不同）', () => {
    const rowsOf = (seed) => {
      const flat = expand(PanelBody(bodyProps({ sealSeed: seed })));
      const labels = [];
      const rights = [];
      const walk = (n) => {
        if (n === null || n === undefined || typeof n !== 'object') return;
        if (Array.isArray(n)) { for (const c of n) walk(c); return; }
        if (n.type === 'button' && n.props && n.props['aria-haspopup'] === 'dialog') labels.push(n.props['aria-label']);
        const s = n.props && n.props.style;
        if (s && s.position === 'absolute' && typeof s.right === 'string' && typeof s.transform === 'string' && s.transform.indexOf('rotate(') === 0) rights.push(s.right);
        walk(n.props.children);
      };
      walk(flat);
      return { labels, rights };
    };
    const a = rowsOf(0);
    const b = rowsOf(1);
    assert.deepEqual(a.labels, ['饼干记账 HELP', '技能', '插件']);
    assert.deepEqual(b.labels, ['饼干记账 HELP', '技能', '插件']);
    assert.equal(a.rights.length, 3);
    assert.notDeepEqual(a.rights, b.rights, '各家右间距须错开');
  });
  it('点章回调带自家下标（点 HELP 回 0）', () => {
    let got = -1;
    const flat = expand(PanelBody(bodyProps({ sealSeed: 0, onSealSelect: (i) => { got = i; } })));
    const btns = buttons(flat).filter((x) => x.props['aria-haspopup'] === 'dialog');
    const help = btns.find((x) => x.props['aria-label'] === '饼干记账 HELP');
    assert.notEqual(help, undefined);
    help.props.onClick();
    assert.equal(got, 0);
  });
});