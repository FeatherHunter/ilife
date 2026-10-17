// 面板宽度不随宿主滚动条变：构建产物形状 ＋ 真产物里那段 effect 的行为（挂载钉槽位、卸载还原）。
//
// 现场读数（.scratch/panel-height-repro.mjs：把真产物面板塞进宿主设置弹窗的 CSS 里，无头 Chrome 量）：
//   宿主滚动体可视高 746、可视宽 612；全部缺席页签时内容高 581（不滚）⇒ 内容盒 564；
//   装了的那一家塞 471px 配置卡后内容高 1054（要滚）⇒ 内容盒 559。
//   ⇒ 切页签时内容盒宽差 5px（主题 `--dsh-scrollbar-width:5px`），标题行右对齐的按钮组跟着挪 5px。
//   给宿主滚动体钉 `scrollbar-gutter:stable` 后：短页签 559、长页签 559（恒定），滚动条本身仍按需出现。
//   宿主结构（从 @deepseek-ai/dsh-client-ui-settings-general 抽出的源码）：设置弹窗的滚动体
//   `wCInkW_options`（overflow-y:auto）里 renderSlot("settings.section") **直接**渲染本面板
//   ⇒ 「最近的可滚动祖先」就是那个滚动体，本 effect 钉的正是它。
//
// 先构建再跑：node node_modules/typescript/bin/tsc -b packages/plugin-manager && node ./node_modules/tsdown/dist/run.mjs
// 行为那一条为什么自带替身：仓根共用替身（test/helpers/panel-render.mjs）不挂 ref、effect 当场跑，
//   够不到「挂载后从面板根往上找祖先」这一步；这里只多「挂 ref ＋ effect 攒到挂载后跑」两件事，不假装是 React。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderManagerPanel } from '../../../test/helpers/panel-render.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const client = readFileSync(join(DIST, 'client.js'), 'utf8');

describe('面板宽度不随宿主滚动条变（构建产物形状）', () => {
  it('向上找最近的可滚动祖先（computed overflow-y 为 auto/scroll）', () => {
    assert.ok(
      client.includes('overflowY === "auto" || overflowY === "scroll"'),
      '找不到「最近的可滚动祖先」判据：钉错元素就等于没钉',
    );
  });
  it('钉 scrollbar-gutter:stable，卸载时还原（改动不留在宿主上）', () => {
    assert.ok(client.includes('setProperty("scrollbar-gutter", "stable")'), '钉槽位的调用缺失');
    assert.ok(client.includes('removeProperty("scrollbar-gutter")'), '卸载还原缺失');
  });
  it('面板根带 ref（effect 摸得到 DOM；替身渲染台里为空，天然空过）', async () => {
    const { tree } = await renderManagerPanel();
    assert.equal(tree.type, 'div', '面板根不是 div');
    assert.equal(typeof tree.props.ref, 'function', '面板根没带 ref：effect 摸不到 DOM，钉槽位无从谈起');
    assert.equal(tree.props.style.position, 'relative', '面板根定位丢了');
  });
});

/* ── 行为：真产物里那段 effect，在假祖先链上跑 ── */

/** 假元素：只要 effect 用到的三件（parentElement／style 的三件套／computed overflowY）。 */
function fakeEl(overflowY, gutter = 'auto') {
  const props = new Map();
  return {
    overflowY,
    gutter,
    parentElement: null,
    style: {
      getPropertyValue: (name) => (props.has(name) ? props.get(name) : ''),
      setProperty: (name, value) => { props.set(name, String(value)); },
      removeProperty: (name) => { props.delete(name); },
    },
    inline: () => (props.has('scrollbar-gutter') ? props.get('scrollbar-gutter') : null),
  };
}

/** 顺序 hook store 替身；与共用替身的差别只有两处：effect 攒起来（不当场跑）、ref 由调用方挂。 */
function makeStubReact() {
  const store = [];
  const effects = [];
  let cursor = 0;
  const react = {
    createElement: (type, props, ...children) => ({
      type,
      props: { ...(props ?? {}), children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children },
    }),
    Fragment: Symbol('Fragment'),
    useId: () => 'r1',
    useRef: (init) => {
      const i = cursor++;
      if (!(i in store)) store[i] = { current: init === undefined ? null : init };
      return store[i];
    },
    useState: (init) => {
      const i = cursor++;
      if (!(i in store)) store[i] = typeof init === 'function' ? init() : init;
      return [store[i], () => {}];
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect: (fn, deps) => {
      const i = cursor++;
      const before = store[i];
      const changed = !before || !deps || before.deps.length !== deps.length || deps.some((d, k) => d !== before.deps[k]);
      store[i] = { deps: deps ?? null };
      if (changed) effects.push(fn);
    },
  };
  return { react, effects, rewind: () => { cursor = 0; } };
}

function expand(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((child) => expand(child));
  if (typeof node.type === 'function') return expand(node.type(node.props));
  return { type: node.type, props: { ...node.props, children: expand(node.props?.children) } };
}

/** 物化真产物，把 settings.section 的组件捕获出来渲一遍，回 { tree, effects }。
 *
 *  束里的 `window` 由 loader 传进来（真机上是真 window，这里给一份带 `getComputedStyle` 的假 window），
 *  所以 effect 里 `window.getComputedStyle(祖先)` 这一步在 node 侧也真跑得到。 */
function mountSection() {
  const { react, effects, rewind } = makeStubReact();
  const registrations = [];
  const fakeWindow = {
    __ModuleLoader__: { load: (reg) => { registrations.push(reg); } },
    getComputedStyle: (el) => ({
      overflowY: el.overflowY ?? 'visible',
      getPropertyValue: (name) => (name === 'scrollbar-gutter' ? (el.gutter ?? 'auto') : ''),
    }),
  };
  new Function('window', client)(fakeWindow);
  assert.equal(registrations.length, 1, 'client 束须恰好注册一次');
  const exports = registrations[0].factory((spec) => {
    if (String(spec).startsWith('react')) return react;
    throw new Error('替身只提供 react：' + spec);
  });
  let Section = null;
  exports.apply({
    slots: {
      inject: (_key, callback) => callback(),
      register: (_options, component) => { Section = component; return () => {}; },
      entries: () => [],
      getVersion: () => 0,
      subscribe: () => () => {},
    },
    effect: (callback) => callback(),
    connection: { rpc: { call: async () => ({ ok: false, error: { code: 'bad-request', message: '替身不发电话', details: {} } }) } },
  });
  assert.equal(typeof Section, 'function', '没捕获到 settings.section 组件');
  rewind();
  const tree = expand(Section({ useTabs: (selector) => selector([]), renderSlot: () => null }));
  return { tree, effects };
}

/** 把面板根挂到给定的假祖先链上，跑攒下的 effect（别的 effect 的替身环境不全，逐个兜住），回卸载函数。 */
function mountEffects(root) {
  const { tree, effects } = mountSection();
  assert.equal(typeof tree.props.ref, 'function', '面板根没带 ref');
  tree.props.ref(root);
  const cleanups = [];
  const threw = [];
  for (const effect of effects) {
    try {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    } catch (error) {
      threw.push(String(error && error.message));
    }
  }
  return {
    threw,
    unmount: () => {
      for (const cleanup of cleanups) {
        try { cleanup(); } catch { /* 别的 effect 的卸载同样可能缺替身 */ }
      }
    },
  };
}

describe('面板宽度不随宿主滚动条变（真产物里那段 effect 的行为）', () => {
  it('面板根直接住在滚动体里：钉的是它，别的祖先不动', () => {
    const outer = fakeEl('visible');
    const scroller = fakeEl('auto');
    scroller.parentElement = outer;
    const root = fakeEl('visible');
    root.parentElement = scroller;

    const mounted = mountEffects(root);
    assert.equal(scroller.inline(), 'stable', '最近的可滚动祖先没被钉上（threw: ' + mounted.threw.join('|') + '）');
    assert.equal(outer.inline(), null, '不该动非滚动的祖先');
    mounted.unmount();
    assert.equal(scroller.inline(), null, '卸载没还原：改动留在了宿主元素上');
  });

  it('中间夹一层非滚动容器：穿过它，钉到更上面的滚动体', () => {
    const scroller = fakeEl('scroll');
    const wrapper = fakeEl('visible');
    wrapper.parentElement = scroller;
    const root = fakeEl('visible');
    root.parentElement = wrapper;

    const mounted = mountEffects(root);
    assert.equal(scroller.inline(), 'stable', '隔着非滚动容器就找不到滚动体了');
    assert.equal(wrapper.inline(), null, '非滚动容器不该被钉');
    mounted.unmount();
    assert.equal(scroller.inline(), null, '卸载没还原');
  });

  it('宿主本来就 stable：不写内联样式（不动别人的既有设置）', () => {
    const scroller = fakeEl('auto', 'stable');
    const root = fakeEl('visible');
    root.parentElement = scroller;

    const mounted = mountEffects(root);
    assert.equal(scroller.inline(), null, '宿主已经是 stable 还被写了内联样式');
    mounted.unmount();
    assert.equal(scroller.inline(), null, '卸载后仍不该有内联样式');
  });
});
