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

const value1174 = await import('../dist/config-panel-value.js');
const { toDraft: toDraft1174 } = value1174;

function expandTree1174(tree) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return tree;
  if (Array.isArray(tree)) return tree.map(expandTree1174);
  if (typeof tree === 'object' && tree.props !== undefined) {
    if (typeof tree.type === 'function') { try { return expandTree1174(tree.type(tree.props)); } catch { return tree; } }
    return { type: tree.type, props: { ...tree.props, children: expandTree1174(tree.props.children) } };
  }
  return tree;
}
const ITEMS_ADV = [
  { key: 'db.name', title: 'db file', tier: 'common', control: 'text', readonly: true, resolveFrom: 'dbFile', hint: 'h' },
  { key: 'db.adv', title: 'adv item', tier: 'advanced', control: 'text', hint: 'h' },
];
const SURFACE_ADV = { path: 'C:/x.yaml', dataDir: 'C:/d', created: false, values: {}, resolved: {} };
function bodyPropsAdv(over = {}) {
  return { title: 't', items: ITEMS_ADV, state: { kind: 'ready', surface: SURFACE_ADV }, draft: toDraft1174(ITEMS_ADV, SURFACE_ADV.values, SURFACE_ADV), busy: false, notice: null, writeError: null, error: null, picking: false, browseRow: null, rowEntry: null, dirtyKeys: [], followKeys: [], copy: null, onCopy: () => {}, onChange: () => {}, onSave: () => {}, onReset: () => {}, onRetry: () => {}, ...over };
}

describe('#1174 追修：高级头焦点贴内容＋开态箭头朝下', () => {
  it('summary 头收成内容宽度（洗色不铺满整行，锁格不动）', () => {
    const tree = expandTree1174(view.PanelBody(bodyPropsAdv()));
    const heads = flat(tree).filter((n) => n.type === 'summary');
    assert.equal(heads.length, 1);
    assert.equal(heads[0].props.style.width, 'fit-content');
    assert.equal(heads[0].props.style.padding, '2px 0');
    assert.equal(heads[0].props.style.cursor, 'pointer');
    assert.equal(heads[0].props.style.listStyle, 'none');
  });
  it('开态悬停旋转与右移共存（箭头保持朝下）', () => {
    const css = view.interactionCss();
    assert.match(css, /\[data-ilife-advanced="group"\]\[open\] \[data-ilife-advanced="head"\]:hover \[data-ilife-advanced="mark"\]\{[^}]*rotate\(90deg\)\}/);
    assert.match(css, /translateX\(2px\) rotate\(90deg\)/);
  });
});
