/** 拿**真产物**渲插件面板（总管 `packages/plugin-manager/dist/client.js` ＋ 六家 `dist/client.js`）。
 *
 * 为什么要走真产物：屏上文案由「槽账本／静态表 ＋ 组件」两边合出来，只读源码或只搜字符串
 * 都看不见真实的屏。原先是 `packages/plugin-manager/test/version-737.test.mjs` 里的本地函数
 * （票 #737 那条「屏上那行跟着宿主的值跑」），票 #738 要在同一条路上读页签条的字与各家设置页标题，
 * 故提到仓根共用——两份拷贝就是两处腐化（同 #736 提 `client-bundle.mjs` 的口径）。
 *
 * 替身只够跑这两个组件：
 *   · classic script loader 语义在**宿主 realm** 里求值（client 取数期要用宿主全局）；
 *   · react 给最小替身（顺序 hook store，与 `docs/plugins/plugin-manager/t679-面板渲染台.mjs` 页内那份同形）
 *     —— 其余未声明外部一律抛，client 束只许要 react*；
 *   · 传输口给桩值（宿主半在测试里不跑）：总管面板回版本行与空的目标表，别的端点一律 `bad-request`
 *     —— 拿不到数时面板照「降级态」画（各家设置页那一支照样把页头与说明画出来）。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// 电话名从总管的契约件取（唯一定义地），替身不另抄一份字符串。
import { MANAGER_ACTIONS } from '../../packages/plugin-manager/dist/update-contract.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANAGER_DIR = join(HERE, '..', '..', 'packages', 'plugin-manager');

/** 最小 react 替身（顺序 hook store）。每次渲染前把 cursor 归零、渲染后收集要跑的 effect。 */
function makeReact() {
  const store = [];
  const queue = [];
  const react = {
    cursor: 0,
    queue,
    createElement: (type, props, ...children) => ({
      type,
      props: { ...(props ?? {}), children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children },
    }),
    Fragment: Symbol('Fragment'),
    useId: () => 'r1',
    useRef: (init) => {
      const i = react.cursor++;
      if (!(i in store)) store[i] = { current: init === undefined ? null : init };
      return store[i];
    },
    useState: (init) => {
      const i = react.cursor++;
      if (!(i in store)) store[i] = typeof init === 'function' ? init() : init;
      return [store[i], (next) => { const value = typeof next === 'function' ? next(store[i]) : next; if (value !== store[i]) store[i] = value; }];
    },
    useMemo: (fn) => fn(),
    // 注意：useCallback 只**返回**回调，不许当场调它（写成 `(fn) => fn()` 会把回调当工厂调一遍）。
    useCallback: (fn) => fn,
    useEffect: (fn, deps) => {
      const i = react.cursor++;
      const before = store[i];
      const changed = !before || !deps || before.deps.length !== deps.length || deps.some((d, k) => d !== before.deps[k]);
      store[i] = { deps: deps ?? null };
      if (changed) queue.push(fn);
    },
  };
  return react;
}

/** 物化真产物（classic script 语义），回模块的 export 表。 */
function materialize(pkgDir, react) {
  const code = readFileSync(join(pkgDir, 'dist', 'client.js'), 'utf8');
  const registrations = [];
  new Function('window', code)({ __ModuleLoader__: { load: (reg) => { registrations.push(reg); } } });
  assert.equal(registrations.length, 1, 'client 束须恰好注册一次：' + pkgDir);
  return registrations[0].factory((spec) => {
    if (String(spec).startsWith('react')) return react;
    throw new Error('渲染替身只提供 react：' + spec);
  });
}

/** 把元素树里的文本收集起来（替身 `createElement` 的形状：`{type, props:{...props, children}}`）。 */
function collectText(node, buf) {
  if (node === null || node === undefined || node === false || node === true) return;
  if (typeof node === 'string' || typeof node === 'number') {
    buf.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, buf);
    return;
  }
  if (typeof node !== 'object') return;
  collectText(node.props?.children, buf);
}

/** 把函数组件展开成元素树（替身 `createElement` 只造节点、不调组件，这一步就是「渲染器」）。
 *  hooks 的调用顺序必须与组件的渲染顺序一致，所以展开与取 hooks 在**同一个 cursor 周期**里做。 */
function expand(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((child) => expand(child));
  if (typeof node.type === 'function') return expand(node.type(node.props));
  return { type: node.type, props: { ...node.props, children: expand(node.props?.children) } };
}

/** 渲一棵树（含 effect 收敛的回环），回元素树与全部文本。 */
async function render(root, react) {
  react.cursor = 0;
  let tree = expand(root());
  for (let pass = 0; pass < 8 && react.queue.length > 0; pass += 1) {
    const effects = react.queue.splice(0, react.queue.length);
    for (const effect of effects) effect();
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    react.cursor = 0;
    tree = expand(root());
  }
  const buf = [];
  collectText(tree, buf);
  return { tree, text: buf.join(' ') };
}

/** 页签条上每个页签的字：`button[role=tab]` 的**字符串**子节点（圆点是元素、档位小字是元素或 null）。 */
function collectTabLabels(tree) {
  const out = [];
  const visit = (node) => {
    if (node === null || node === undefined || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (node.props?.role === 'tab') {
      const children = node.props.children;
      for (const child of Array.isArray(children) ? children : [children]) {
        if (typeof child === 'string') out.push(child);
      }
    }
    visit(node.props?.children);
  };
  visit(tree);
  return out;
}

/**
 * 渲一次爱生活面板（总管那一卡）。
 * @param {{ reply?: { version?: string, fail?: boolean }, tabs?: ReadonlyArray<{id: string, order: number, label: string, channel: string}> }} [options]
 * @returns {Promise<{ tree: unknown, text: string, tabLabels: string[] }>}
 */
export async function renderManagerPanel(options = {}) {
  const { reply = {}, tabs = [] } = options;
  const react = makeReact();
  /** 桩传输口：方法名从 `payload.method` 读（面板取数口形状见 `update-client.ts`）。 */
  const call = async (_channel, _endpoint, payload) => {
    const method = payload?.method;
    if (method === MANAGER_ACTIONS.version) {
      return reply.fail
        ? { ok: false, error: { code: 'internal', message: '宿主读不到', details: {} } }
        : { ok: true, value: { version: reply.version } };
    }
    if (method === MANAGER_ACTIONS.targets) return { ok: true, value: { targets: [], pollMs: 1000 } };
    return { ok: false, error: { code: 'bad-request', message: '渲染替身只答这两条', details: {} } };
  };

  const exports = materialize(MANAGER_DIR, react);
  let Section = null;
  exports.apply({
    slots: {
      inject: (_key, callback) => callback(),
      register: (_registerOptions, component) => { Section = component; return () => {}; },
      entries: () => [],
      getVersion: () => 0,
      subscribe: () => () => {},
    },
    effect: (callback) => callback(),
    connection: { rpc: { call } },
  });
  assert.equal(typeof Section, 'function', '没捕获到 settings.section 组件');

  const props = { useTabs: (selector) => selector(tabs), renderSlot: () => null };
  const { tree, text } = await render(() => Section(props), react);
  return { tree, text, tabLabels: collectTabLabels(tree) };
}

/**
 * 跑一家单品 client 的 `apply`（真产物），回它交给「爱生活页签槽」的**页签名**与**设置页那一卡的屏上文本**。
 *
 * 页签名就是这一家的 `SLOT_TITLE`：页签 label、侧边栏页签名、设置页标题都从它出。
 * 设置页那一卡渲在「拿不到配置」的降级态（桩传输口一律 `bad-request`）——页头那行照样画出来
 * （`<名字> · 配置`），所以它是一份可信的屏上读数，不是渲染失败的空页。
 *
 * @param {string} pkgDir 单品包根（含 `dist/client.js`）
 * @returns {Promise<{ label: string, text: string }>}
 */
export async function renderConfigTab(pkgDir) {
  const react = makeReact();
  const exports = materialize(pkgDir, react);
  const registrations = [];
  exports.apply({
    slots: {
      inject: (_key, callback) => callback(),
      register: (options, component) => { registrations.push({ options, component }); return () => {}; },
      entries: () => [],
      getVersion: () => 0,
      subscribe: () => () => {},
    },
    effect: (callback) => callback(),
    get: () => undefined,
    connection: { rpc: { call: async () => ({ ok: false, error: { code: 'bad-request', message: '渲染替身不发电话', details: {} } }) } },
  });
  const row = registrations.find((entry) => entry.options.name === 'ilife.config-tab');
  assert.ok(row, pkgDir + ' 没往爱生活页签槽注册（页签名与设置页都无从谈起）');
  assert.equal(typeof row.component, 'function', pkgDir + ' 注册的不是一个组件');
  const label = typeof row.options.label === 'function' ? row.options.label() : String(row.options.label);
  const { text } = await render(() => row.component({ getCall: () => null, getPicker: () => null }), react);
  return { label, text };
}
