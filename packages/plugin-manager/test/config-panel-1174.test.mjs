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

/** base 0.1.5 页头动作簇（票 05：入口表改由 base 的 ActionCluster v2 提供）。 */
const REPO_URL = 'https://github.com/FeatherHunter/ilife';
const BASE_GROUP_LABEL = '快捷操作';
const CONTACT_LABEL = '联系我们';
const STAR_LABEL = 'Star 这个项目';
const ISSUE_LABEL = '提交 Issue';

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
  it('页签悬停洗色带 !important 且边框不动（#1175 非焦点统一 dim 基线）', () => {
    assert.equal(contract.TAB_HOVER_WASH_PERCENT, 12);
    const css = view.tabInteractionCss();
    assert.match(css, /\[data-ilife-tab\]:hover\{background:[^}]*12%[^}]*!important\}/);
    const hover = css.match(/\[data-ilife-tab\]:hover\{[^}]*\}/)?.[0] ?? '';
    assert.doesNotMatch(hover, /border-color/);
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

describe('#1174 页头三件套（票 05：base 0.1.5 的 ActionCluster v2 接管）', () => {
  it('本仓入口表随 base 接管退场（nav 不再导出 PANEL_LINKS）', () => {
    assert.equal('PANEL_LINKS' in nav, false, '三件套改由 base 渲染后，本仓不再维护入口表');
  });
  it('屏上三件套＝一枚静默簇＋联系/Star/Issue 三枚彩色 svg 控件（外链两项、联系是按钮）；底部整行联系入口已删', async () => {
    const { tree } = await renderManagerPanel();
    const all = flat(tree);
    const oldGroup = all.filter((n) => typeof n.props.className === 'string' && n.props.className.includes('dsh-base-actions--group'));
    assert.equal(oldGroup.length, 0, '旧 ActionGroup 胶囊组不许在场（票 05 已迁 ActionCluster）');
    const clusters = all.filter((n) => typeof n.props.className === 'string' && n.props.className.split(/\s+/).includes('dsh-base-cluster'));
    assert.equal(clusters.length, 1, '页头应恰好一枚动作簇（ActionCluster）');
    const cluster = clusters[0];
    assert.equal(cluster.props.role, 'group');
    assert.equal(cluster.props['aria-label'], BASE_GROUP_LABEL);
    const controls = flat(cluster).filter((n) => n.type === 'a' || n.type === 'button');
    assert.equal(controls.length, 3, '组里须恰好三枚控件（联系/Star/Issue）');
    assert.deepEqual(
      controls.map((c) => c.props['aria-label']).sort(),
      [CONTACT_LABEL, ISSUE_LABEL, STAR_LABEL].sort(),
      '三枚控件的 aria 标签须来自 base 文案',
    );
    for (const control of controls) {
      assert.ok(String(control.props.className).includes('dsh-base-cluster__btn'), control.props['aria-label'] + ' 须是动作簇按钮');
      const svgs = flat(control).filter((n) => n.type === 'svg');
      assert.equal(svgs.length, 1, control.props['aria-label'] + ' 的图标须是 svg');
      const gradients = flat(svgs[0]).filter((n) => n.type === 'linearGradient' || n.type === 'radialGradient');
      assert.ok(gradients.length >= 1, control.props['aria-label'] + ' 的彩色图标须带渐变（linearGradient/radialGradient）');
      assert.ok(!textOf(control).includes('⭐') && !textOf(control).includes('💬'), '入口图标须无 emoji');
    }
    const anchors = controls.filter((n) => n.type === 'a');
    assert.equal(anchors.length, 2, 'Star 与 Issue 是外链');
    assert.deepEqual(anchors.map((a) => a.props.href).sort(), [REPO_URL, REPO_URL + '/issues'].sort(), '外链须指向本仓（Star）与派生的 issues 列表页');
    assert.equal(controls.filter((n) => n.type === 'button').length, 1, '联系是按钮（点开 base 的二维码弹窗）');
    const contactRows = all.filter((n) => typeof n.props.className === 'string' && n.props.className.includes('dsh-base-contact-row'));
    assert.equal(contactRows.length, 0, '底部整行联系入口（ContactRow）已随票 05 删除');
  });
});

describe('#1174 Q2 全量可点击审计（可点即有反馈）', () => {
  it('引流行随旧卡退场（#12：卡改由 base 渲染，本仓不再有 a[data-ilife-press=more]）', async () => {
    const { tree } = await renderManagerPanel();
    const mores = flat(tree).filter((n) => n.type === 'a' && n.props['data-ilife-press'] === 'more');
    assert.equal(mores.length, 0, '旧「作者其他插件」引流行的 press 标记应随卡一起删掉');
    // 新卡是 base 的 ul/li/a（不带 data-ilife-press），有 4 行作者作品。
    const baseRows = flat(tree).filter((n) => n.type === 'a' && n.props.className === 'dsh-base-plugins__row');
    assert.equal(baseRows.length, 4, 'base 的作者作品卡应有 4 行（self=ilife 被排除）');
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
