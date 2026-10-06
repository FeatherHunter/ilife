// 印章卷轴公共组件（`src/seal-scroll.ts`）的渲染回路：九档材质、三段内容、糙边滤镜、弹层。
//
// 为什么这样读：本件是纯函数、不用任何 hook，所以直接把源码转成 CJS 载进来、
// 自带一个极小的树展开器就能读屏（本仓没装 react-dom，仓根 `test/helpers/panel-render.mjs`
// 的替身只认产物束，不认单件源码）。四条读数都在下面 `it` 里指名。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as React from 'react';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCROLL_TS = join(HERE, '..', 'src', 'seal-scroll.ts');
const STAMP_TS = join(HERE, '..', 'src', 'seal-stamp.ts');
const SCROLL_JS = join(HERE, '..', 'src', 'seal-scroll.js');
const STAMP_JS = join(HERE, '..', 'src', 'seal-stamp.js');
const SCHEMES_TS = join(HERE, '..', 'src', 'seal-paper-schemes.ts');
const SCHEMES_JS = join(HERE, '..', 'src', 'seal-paper-schemes.js');
const PALETTE_TS = join(HERE, '..', 'src', 'seal-palette.ts');
const PALETTE_JS = join(HERE, '..', 'src', 'seal-palette.js');

/** 把源码件转成 CJS 载进来（不进产物、不碰 src 目录）。
 *  卷轴与印是渲染期互引（`seal-scroll ⇄ seal-stamp`，模块求值期无交叉）：编译前先占缓存位，
 *  循环 require 拿到在途半成品也不炸（双方只在组件函数体内用对方）。 */
function compileAs(tsPath, jsKey) {
  const hit = Module._cache[jsKey];
  if (hit) return hit.exports;
  const code = ts.transpileModule(readFileSync(tsPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: tsPath,
  }).outputText;
  const instance = new Module(jsKey, null);
  instance.filename = jsKey;
  instance.paths = Module._nodeModulePaths(dirname(tsPath));
  Module._cache[jsKey] = instance;
  instance._compile(code, jsKey);
  return instance.exports;
}

const ORIG_LOAD = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === './seal-stamp.js') return compileAs(STAMP_TS, STAMP_JS);
  if (request === './seal-scroll.js') return compileAs(SCROLL_TS, SCROLL_JS);
  if (request === './seal-paper-schemes.js') return compileAs(SCHEMES_TS, SCHEMES_JS);
  if (request === './seal-palette.js') return compileAs(PALETTE_TS, PALETTE_JS);
  return ORIG_LOAD.call(this, request, parent, isMain);
};

const { SealFilterDefs, SealScroll, SealScrollDialog } = compileAs(SCROLL_TS, SCROLL_JS);

/** 展开元素树：函数组件当场调（本件无 hook），宿主节点留 `{type, props, children}`。 */
function expand(node) {
  if (node === null || node === undefined || node === false || node === true) return null;
  if (typeof node === 'string' || typeof node === 'number') return { type: '#text', text: String(node) };
  if (Array.isArray(node)) return node.map(expand).filter((child) => child !== null);
  if (typeof node.type === 'function') return expand(node.type(node.props));
  if (node.type === React.Fragment) return expand(node.props.children);
  return { type: node.type, props: node.props, children: expand(node.props?.children) };
}

function textsOf(node, out = []) {
  if (!node) return out;
  if (node.type === '#text') { out.push(node.text); return out; }
  if (Array.isArray(node)) { for (const child of node) textsOf(child, out); return out; }
  textsOf(node.children, out);
  return out;
}

function nodesOf(node, pred, out = []) {
  if (!node || node.type === '#text') return out;
  if (Array.isArray(node)) { for (const child of node) nodesOf(child, pred, out); return out; }
  if (pred(node)) out.push(node);
  nodesOf(node.children, pred, out);
  return out;
}

/** 树里所有宿主节点的 `style` 合起来（读材质用的）。 */
function stylesOf(node, out = []) {
  if (!node || node.type === '#text') return out;
  if (Array.isArray(node)) { for (const child of node) stylesOf(child, out); return out; }
  if (node.props?.style) out.push(node.props.style);
  stylesOf(node.children, out);
  return out;
}

const TIER_TEXT = { copper: '基础建设中', silver: '全打通中', gold: '精雕细琢中' };
const ROLES = ['skill', 'help', 'plugin'];
const TIERS = ['copper', 'silver', 'gold'];

/** 九档逐档的形状（原型定稿 9.1 那张表的后半段：底色是照抄印的，不是一圈金属色）。 */
const EXPECTED = {
  'skill-copper': { bg: '#8a4a28', border: '3px solid #a5652f', rivets: 0 },
  'skill-silver': { bg: '#b73124', border: '3px double #eef3f6', rivets: 0 },
  'skill-gold': { bg: '#d34a35', border: '3px double #f5d97a', rivets: 0 },
  'help-copper': { bg: '#b06a3a', border: '3px solid #a5652f', rivets: 0 },
  'help-silver': { bg: '#8f979e', border: '3px double #e8eef2', rivets: 0 },
  'help-gold': { bg: '#c63d2a', border: '3px double #f5d97a', rivets: 0 },
  'plugin-copper': { bg: '#b4773c', border: null, rivets: 6 },
  'plugin-silver': { bg: '#d8dee3', border: null, rivets: 6 },
  'plugin-gold': { bg: '#f2dc86', border: null, rivets: 6 },
};

const PROPS = { title: '饼干记账 HELP', progress: '进展一句', status: '能用，有已知坑', plan: '修导入的阻塞' };

describe('印章卷轴 · 九档材质逐档对得上', () => {
  for (const role of ROLES) {
    for (const tier of TIERS) {
      it(role + '／' + tier, () => {
        const want = EXPECTED[role + '-' + tier];
        const tree = expand(React.createElement(SealScroll, { ...PROPS, role, tier }));
        const frame = nodesOf(tree, (node) => typeof node.props?.style?.filter === 'string' && node.props.style.filter.includes('dshLifeSealRoughFrame'));
        assert.equal(frame.length, 1, '外框那一层应恰好一处（挂糙边滤镜的那层）');
        const style = frame[0].props.style;
        assert.ok(String(style.background).includes(want.bg), '外框底色应是印的底色：要含 ' + want.bg + '，实到 ' + style.background);
        if (want.border) assert.equal(style.border, want.border, '外框边线应逐字照抄印');
        else assert.equal(style.border, undefined, '插件那三档没有边线，靠 boxShadow 描边');
        const rivets = nodesOf(tree, (node) => node.props?.style?.borderRadius === '50%' && typeof node.props?.style?.background === 'string' && String(node.props.style.background).includes('radial-gradient'));
        assert.equal(rivets.length, want.rivets, '铆钉数（插件档＝外框四角 4＋标题章左右 2）');
      });
    }
  }
});

describe('印章卷轴 · 三段内容与档位话', () => {
  for (const role of ROLES) {
    for (const tier of TIERS) {
      it(role + '／' + tier + ' 屏上三段齐', () => {
        const tree = expand(React.createElement(SealScroll, { ...PROPS, role, tier }));
        const text = textsOf(tree).join('|');
        for (const name of ['进展', '状态', '计划']) assert.ok(text.includes(name), '缺这段：' + name);
        assert.ok(text.includes(PROPS.title), '缺标题');
        assert.ok(text.includes(TIER_TEXT[tier]), '缺档位话：' + TIER_TEXT[tier]);
        assert.ok(text.includes(PROPS.progress) && text.includes(PROPS.status) && text.includes(PROPS.plan), '三段正文都要在屏上');
        const titleSeal = nodesOf(tree, (node) => node.type === 'button' && node.props?.['aria-label'] === PROPS.title);
        assert.equal(titleSeal.length, 1, '卷轴标题须是与外面同一枚章（同组件），不是普通字');
      });
    }
  }
});

describe('印章卷轴 · 糙边滤镜与弹层', () => {
  it('滤镜定义两条都在，且外框引用的就是卷轴那条', () => {
    const defs = expand(React.createElement(SealFilterDefs, {}));
    const ids = nodesOf(defs, (node) => node.type === 'filter').map((node) => node.props.id);
    assert.deepEqual(ids.sort(), ['dshLifeSealInkEdge', 'dshLifeSealRoughEdge', 'dshLifeSealRoughFrame', 'dshLifeSealRoughMetal']);
    const scales = nodesOf(defs, (node) => node.type === 'feDisplacementMap').map((node) => node.props.scale);
    assert.deepEqual(scales, [2.2, 6.5, 3.2, 2.2], '印 2.2／外框 6.5／中等件 3.2／印泥 2.2＋洇开');
    assert.equal(nodesOf(defs, (node) => node.type === 'feGaussianBlur').length, 1, '印泥那条末尾要有一次洇开（高斯模糊）');
    assert.equal(nodesOf(defs, (node) => node.type === 'feColorMatrix').length, 1, '印泥那条要有墨色蒙版（吃墨不匀）');
    assert.equal(nodesOf(defs, (node) => node.type === 'feComposite').length, 1, '蒙版要真的用 in 压到墨上');
    // 外框那条的颗粒配方：低频底噪＋3 倍频（斑块感），纯高频会退化成一条细金粉线。
    const frameFilter = nodesOf(defs, (node) => node.type === 'filter' && node.props.id === 'dshLifeSealRoughFrame')[0];
    const turb = nodesOf(frameFilter, (node) => node.type === 'feTurbulence')[0];
    assert.equal(turb.props.baseFrequency, 0.6, '外框底噪频率');
    assert.equal(turb.props.numOctaves, 3, '外框倍频数：斑块大小要有层次');
    const tree = expand(React.createElement(SealScroll, { ...PROPS, role: 'skill', tier: 'gold' }));
    const frame = nodesOf(tree, (node) => typeof node.props?.style?.filter === 'string')[0];
    assert.equal(frame.props.style.filter, 'url(#dshLifeSealRoughFrame)');
  });

  it('印章交互样式与滤镜同处（悬停／按压／焦点环／tooltip）', () => {
    const defs = expand(React.createElement(SealFilterDefs, {}));
    const css = nodesOf(defs, (node) => node.type === 'style').map((n) => JSON.stringify(n.children)).join('\n');
    assert.ok(css.includes('.dshLifeSealBtn:hover'), '悬停规则');
    assert.ok(css.includes('brightness(1.12)') && css.includes('dshLifeSealRoughEdge'), '悬停高亮须带上糙边（另写会冲掉它）');
    assert.ok(css.includes(':active') && css.includes('scale(.96)'), '按压回缩');
    assert.ok(css.includes(':focus-visible'), '焦点环');
    assert.ok(css.includes('attr(data-tip)'), 'tooltip 读 data-tip');
  });
  it('关闭钮＝绦带（定稿默认样子）：两条飘尾对外张开（左尾朝左下、右尾朝右下），且与绦带同一份材质', () => {
    // 不传任何开关：定稿后这就是唯一一版关闭钮，用例咬住默认路径。
    const tree = expand(React.createElement(SealScrollDialog, { ...PROPS, role: 'help', tier: 'copper', open: true, onClose: () => {} }));
    // 飘尾＝挂在 calc(50%…) 上、且带 rotate 的那两个（绦带本体的 45° 旋转不算）。
    const tails = nodesOf(tree, (node) => typeof node.props?.style?.transform === 'string'
      && node.props.style.transform.startsWith('rotate(') && String(node.props.style.left ?? '').startsWith('calc(50%'));
    assert.deepEqual(tails.map((n) => n.props.style.left), ['calc(50% - 0.8125em)', 'calc(50% + 0.4375em)'], '左尾挂左、右尾挂右');
    assert.deepEqual(tails.map((n) => n.props.style.transform), ['rotate(26deg)', 'rotate(-26deg)'], '左尾朝左下（+26°）、右尾朝右下（−26°）');
    const FILL = 'linear-gradient(180deg,#e8573c 0%,#c33a24 55%,#a52612 100%)';
    const fills = tails.map((n) => n.children.filter((c) => typeof c !== 'string').map((c) => c.props?.style?.background).filter(Boolean));
    assert.deepEqual(fills.map((f) => f.length), [2, 2], '每条尾两层：过滤镜的材质层＋不受滤镜的纯色芯');
    assert.deepEqual([...fills[0], ...fills[1]], [FILL, FILL, FILL, FILL], '两条尾同色，且＝绦带底色');
  });

  it('行首三枚朱砂小印有印泥质感：材质层过印那条糙边滤镜、字独立成层', () => {
    const tree = expand(React.createElement(SealScroll, { ...PROPS, role: 'help', tier: 'gold' }));
    const marks = nodesOf(tree, (node) => node.props?.['aria-hidden'] === true && typeof node.props?.style?.filter === 'string' && node.props.style.filter.includes('dshLifeSealInkEdge'));
    assert.equal(marks.length, 3, '进／状／计 三枚，各带一层过糙边滤镜的印泥');
    // expand 对独子不包成数组，统一成列再查。
    const kidsOf = (n) => (Array.isArray(n.children) ? n.children : n.children ? [n.children] : []);
    for (const m of marks) {
      // 印泥是平涂＋噪点蒙版：**不许有高光读法**（中心亮斑、白色内圈、白色斑块都不许出现）。
      assert.equal(m.props.style.background, '#d92b1c', '印泥层是平涂朱砂（大红色）');
      assert.ok(!String(m.props.style.boxShadow ?? '').includes('ffffff'), '印泥层不许加白色内圈（那是塑料高光）');
      const mot = kidsOf(m).find((c) => typeof c !== 'string' && String(c.props?.style?.background ?? '').includes('radial-gradient'));
      assert.ok(mot, '再叠一层墨色不匀');
      assert.ok(!String(mot.props.style.background).includes('#ffffff'), '墨色不匀只许用同色系深浅，不许用白');
    }
    const glyphs = nodesOf(tree, (node) => node.props?.style?.color === '#fdf7ea');
    assert.deepEqual(glyphs.map((n) => textsOf(n).join('')), ['进', '状', '计'], '字住在滤镜之外（清晰层）');
  });

  it('绦带只借档位金属那一条边：主体恒朱砂，边随金／银／铜走', () => {
    const kidsOf = (n) => (Array.isArray(n.children) ? n.children : n.children ? [n.children] : []);
    const rims = ['gold', 'silver', 'copper'].map((tier) => {
      const tree = expand(React.createElement(SealScrollDialog, { ...PROPS, role: 'help', tier, open: true, onClose: () => {} }));
      const ribbon = nodesOf(tree, (n) => n.props?.style?.transform === 'rotate(45deg)')[0];
      const tail = nodesOf(tree, (n) => n.props?.style?.transform === 'rotate(26deg)')[0];
      const tailLayer = kidsOf(tail).find((c) => typeof c !== 'string' && String(c.props?.style?.filter ?? '').includes('RoughMetal'));
      return { ribbon: String(ribbon.props.style.boxShadow), ribbonBg: String(ribbon.props.style.background), tail: String(tailLayer.props.style.boxShadow) };
    });
    assert.ok(rims[0].ribbon.includes('inset 0 0 0 2px #f5d97a'), '金档绦带：2px 金边');
    assert.ok(rims[1].ribbon.includes('inset 0 0 0 2px #d8dee3'), '银档绦带：2px 银边');
    assert.ok(rims[2].ribbon.includes('inset 0 0 0 2px #a5652f'), '铜档绦带：2px 铜边');
    assert.ok(rims[0].ribbon.includes('0 0 0 1px #5c110a59'), '边外还有一道暗线（不然压在框上看不出）');
    assert.ok(rims[0].tail.includes('0 0 0 1.5px #f5d97acc') && rims[2].tail.includes('0 0 0 1.5px #a5652fcc'), '两条飘尾也随档取边');
    assert.ok(rims.every((r) => r.ribbonBg.includes('#c63d2a')), '边换了，主体三档都仍是朱砂');
  });

  it('档位语三档金属渐变逐值锁死（鎏金／冷银／暖铜，改色先红）', () => {
    const want = {
      gold: 'linear-gradient(180deg,#f6e27a 0%,#d9b53c 45%,#a5811b 100%)',
      silver: 'linear-gradient(180deg,#f7fafc 0%,#c3ccd3 45%,#8b959d 100%)',
      copper: 'linear-gradient(180deg,#f0bd8e 0%,#c07b45 45%,#8a4a24 100%)',
    };
    for (const tier of ['gold', 'silver', 'copper']) {
      const tree = expand(React.createElement(SealScroll, { ...PROPS, role: 'help', tier }));
      const phrase = nodesOf(tree, (node) => node.props?.style?.backgroundClip === 'text')[0];
      assert.equal(phrase.props.style.backgroundImage, want[tier], tier + ' 档位语渐变');
    }
  });

  it('open 为假不渲染；为真出 popover（无遮罩）、关闭钮与标题', () => {
    assert.equal(SealScrollDialog({ ...PROPS, role: 'help', tier: 'copper', open: false, onClose: () => {} }), null);
    const tree = expand(React.createElement(SealScrollDialog, { ...PROPS, role: 'help', tier: 'copper', open: true, onClose: () => {} }));
    const text = textsOf(tree).join('|');
    assert.ok(text.includes('收卷'), '关闭钮（绦带上的收卷字）');
    assert.ok(text.includes(PROPS.title) && text.includes('进展'), '卷轴本体也要在');
    const dialog = nodesOf(tree, (node) => node.props?.role === 'dialog');
    assert.equal(dialog.length, 1, '浮层要有 dialog 语义');
    assert.equal(dialog[0].props['aria-modal'], false, 'popover 非 modal');
    assert.equal(dialog[0].props.style.position, 'absolute', '浮层钉在卡片内，不走 viewport 居中');
    const mask = nodesOf(tree, (node) => node.props?.role === 'presentation');
    assert.equal(mask.length, 0, '无遮罩');
    const catcher = nodesOf(tree, (node) => node.props?.style?.position === 'fixed' && node.props?.style?.background === 'transparent');
    assert.equal(catcher.length, 1, '点别处关闭层一处（透明 fixed，不 dim）');
    assert.equal(typeof catcher[0].props.onClick, 'function', '收卷层可点');
    const styleTags = nodesOf(tree, (node) => node.type === 'style');
    assert.ok(styleTags.some((n) => String(n.children?.[0]?.text ?? n.props?.children ?? '').includes('@keyframes dshLifeSealUnroll')), '展开关键帧在屏上');
    const inner = nodesOf(tree, (node) => typeof node.props?.style?.animation === 'string');
    assert.ok(inner.some((n) => n.props.style.animation.includes('dshLifeSealUnroll')), '内框挂展开动画');
  });

  it('纸面自带底色墨色（深色下也不跟主题变黑）', () => {
    const tree = expand(React.createElement(SealScroll, { ...PROPS, role: 'help', tier: 'gold' }));
    const styles = stylesOf(tree).map((s) => JSON.stringify(s)).join('\n');
    assert.ok(styles.includes('#fdfaf2'), '纸底应是羊皮纸色');
    assert.ok(!styles.includes('dsw-alias'), '纸面四色不许引用宿主主题变量');
  });

  it('九档材质互不相同（不能退化成同一套）', () => {
    const seen = new Set();
    for (const role of ROLES) for (const tier of TIERS) {
      const tree = expand(React.createElement(SealScroll, { ...PROPS, role, tier }));
      const frame = nodesOf(tree, (node) => typeof node.props?.style?.filter === 'string')[0];
      seen.add(JSON.stringify(frame.props.style));
    }
    assert.equal(seen.size, 9, '九档外框必须两两不同，实到 ' + seen.size + ' 种');
  });
});
