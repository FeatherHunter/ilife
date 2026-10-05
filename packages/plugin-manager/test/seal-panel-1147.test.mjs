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
});