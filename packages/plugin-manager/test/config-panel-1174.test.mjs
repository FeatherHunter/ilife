// 票 #1174 四合一 ＋ Q1/Q2 拍板：悬停表真正生效、高级头洗色叠加、星星气泡 SVG、全量可点击审计。
//
// 咬四条：
//   ① press／tab 悬停的洗色与边框带 `!important`（行内基线特异度高于样式表，无它悬停只剩阴影与位移）；
//   ② 高级头叠加与复制同档 13% 洗色（复用 HOVER_WASH_PERCENT，不另起 token；折叠／箭头／右移保留）；
//   ③ 星星／气泡为 SVG（实心星＋描边气泡），入口与引流行动辄有 press；
//   ④ Q2 审计：面板内可点即有反馈（输入框保持 focus-only、三枚签豁免，见 #1160／#1161 既有锁）。
// 读的是构建产物（先 tsc -b 再 tsdown），与 1160-1165 同路。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const contract = await import('../dist/config-panel-contract.js');
const view = await import('../dist/config-panel-view.js');
const nav = await import('../dist/nav.js');
const { renderManagerPanel } = await import('../../../test/helpers/panel-render.mjs');

const STAR_TIP = '你的🌟是我夜空中最亮的星。';
const FEEDBACK_TIP = '反馈问题';

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

describe('#1174 悬停穿透行内基线（复制卡顿／页签弱的根因）', () => {
  it('press 悬停洗色与边框带 !important（13% 档位不变）', () => {
    assert.equal(contract.HOVER_WASH_PERCENT, 13);
    const css = view.interactionCss();
    assert.match(css, /\[data-ilife-press\]:hover:not\(\:disabled\)\{background:[^}]*!important;/);
    assert.match(css, /border-color:var\(--ilife-focus[^;]*!important;/);
  });
  it('页签悬停洗色与边框带 !important（V1 12% 可见，不上 V2）', () => {
    assert.equal(contract.TAB_HOVER_WASH_PERCENT, 12);
    const css = view.tabInteractionCss();
    assert.match(css, /\[data-ilife-tab\]:hover\{background:[^}]*12%[^}]*!important;/);
    assert.match(css, /\[data-ilife-tab\]:hover\{background:[^}]*border-color:[^}]*!important\}/);
  });
});

describe('#1174 高级头洗色叠加（T1：同复制档，动画保留）', () => {
  it('head 悬停 13% 洗色（复用 HOVER_WASH_PERCENT，不另起 token）', () => {
    const css = view.interactionCss();
    assert.match(css, /\[data-ilife-advanced="head"\]:hover\{background:color-mix\([^}]*13%[^}]*\)!important\}/);
  });
  it('箭头变色右移／旋转／折叠动画都在', () => {
    const css = view.interactionCss();
    assert.match(css, /translateX\(2px\)/);
    assert.match(css, /rotate\(90deg\)/);
    assert.match(css, /ilifeFoldIn 0\.22s ease/);
  });
});

describe('#1174 星星气泡 SVG＋反馈（T3 线形风格）', () => {
  it('入口表无 glyph，有 path，非空', () => {
    assert.equal(nav.PANEL_LINKS.length, 2);
    for (const link of nav.PANEL_LINKS) {
      assert.ok(link.icon.path.length > 8, link.key + ' 缺图标路径');
      assert.ok(!('glyph' in link), link.key + ' emoji 字形已退役');
    }
  });
  it('屏上两入口是 svg 且挂 press（悬停／按压／焦点都有着落）', async () => {
    const { tree } = await renderManagerPanel();
    const anchors = flat(tree).filter((n) => n.type === 'a' && (n.props.title === STAR_TIP || n.props.title === FEEDBACK_TIP));
    assert.equal(anchors.length, 2);
    for (const a of anchors) {
      assert.ok(a.props['data-ilife-press'] === 'star' || a.props['data-ilife-press'] === 'feedback');
      const svgs = flat(a).filter((n) => n.type === 'svg');
      assert.equal(svgs.length, 1, '入口图标须是 svg');
      assert.ok(!textOf(a).includes('⭐') && !textOf(a).includes('💬'), '入口图标须无 emoji');
    }
  });
});

describe('#1174 Q2 全量可点击审计（可点即有反馈）', () => {
  it('引流行挂 press', async () => {
    const { tree } = await renderManagerPanel();
    const mores = flat(tree).filter((n) => n.type === 'a' && n.props['data-ilife-press'] === 'more');
    assert.equal(mores.length, 4);
  });
  it('状态行官网链接挂 press＋focus（不收缩是另外的事，见注释）', () => {
    const block = view.StatusBlock({ tone: 'ok', text: 't', path: 'p', version: '1', actions: [], link: { text: 'home', href: 'https://example.com' } });
    const links = flat(block).filter((n) => n.type === 'a');
    assert.equal(links.length, 1);
    assert.equal(links[0].props['data-ilife-press'], 'status-link');
    assert.equal(links[0].props['data-ilife-focus'], 'status-link');
  });
  it('输入框仍 focus-only（不许顺手加 press）', () => {
    const row = view.Row({ item: { key: 'k', title: 't', tier: 'common', control: 'text', hint: 'h' }, value: 'v', disabled: false, onChange: () => {}, onCopy: () => {} });
    const inputs = flat(row).filter((n) => n.type === 'input');
    assert.ok(inputs.length >= 1);
    for (const i of inputs) assert.equal(i.props['data-ilife-press'], undefined);
  });
});
