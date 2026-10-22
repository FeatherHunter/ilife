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
 *   · 传输口给桩值（宿主半在测试里不跑）：总管面板回空的目标表，别的端点一律 `bad-request`
 *     —— 拿不到数时面板照「降级态」画（各家设置页那一支照样把页头与说明画出来）。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// 票 1168 缺席态：更新目标表电话已删除，桩传输口一律回 bad-request，不再点名电话名。

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
export function collectText(node, buf) {
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

/** 元素树里所有文本串起来（`collectText` 的常用包法）。 */
export function textOf(node) {
  const buf = [];
  collectText(node, buf);
  return buf.join(' ');
}

/** 找那枚字面恰好是 label 的动作按钮；找不到回 null（动作按钮用 StatusBlock 的 `button[data-ilife-press=status-action]`）。
 *  read-after-click 的用例要靠它把 onClick 取出来手动按一下。 */
export function findButton(node, label) {
  if (node === null || node === undefined || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findButton(child, label);
      if (hit) return hit;
    }
    return null;
  }
  if (node.type === 'button' && textOf(node.props?.children) === label) return node;
  return findButton(node.props?.children, label);
}

/** 把函数组件展开成元素树（替身 `createElement` 只造节点、不调组件，这一步就是「渲染器」）。
 *  hooks 的调用顺序必须与组件的渲染顺序一致，所以展开与取 hooks 在**同一个 cursor 周期**里做。 */
function expand(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((child) => expand(child));
  if (typeof node.type === 'function') return expand(node.type(node.props));
  return { type: node.type, props: { ...node.props, children: expand(node.props?.children) } };
}

/** effect 收敛的回环：展开 → 跑队列里挂上的 effect → 等一拍 → 再展开。
 *
 * 缺省「队列空了就收」（初渲够用）；`alwaysTick` 则咬满 maxPasses 拍——按钮点过之后
 * 要等异步回执落地、setState 触发重画，队列可能是空的，光看队列会提前收工。 */
async function converge(root, react, maxPasses, { alwaysTick = false } = {}) {
  react.cursor = 0;
  let tree = expand(root());
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const effects = react.queue.splice(0, react.queue.length);
    for (const effect of effects) effect();
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    react.cursor = 0;
    tree = expand(root());
    if (!alwaysTick && react.queue.length === 0) break;
  }
  return tree;
}

/** 渲一棵树（含 effect 收敛的回环），回元素树与全部文本。 */
async function render(root, react) {
  const tree = await converge(root, react, 8);
  return { tree, text: textOf(tree) };
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
 *
 * 版本胶囊**不再问宿主**（票 #986：构建期注入产物），故这里没有版本回包可替；
 * 桩传输口只答更新目标表。
 *
 * 页签槽的 `renderSlot` 默认返回 null（只数文本的老调用方不受影响）；票 #1294 要读「首开挂了几家」，
 * 所以把每次调用记进 `slotCalls`，并允许调用方自己给替身子节点。
 * @param {{ tabs?: ReadonlyArray<{id: string, order: number, label: string, channel: string}>, renderSlot?: (slot: string, slotProps: unknown, slotOptions?: {only?: string}) => unknown }} [options]
 * @returns {Promise<{ tree: unknown, text: string, tabLabels: string[], slotCalls: Array<{slot: string, only: string | null}> }>}
 */
export async function renderManagerPanel(options = {}) {
  const { tabs = [], renderSlot = () => null } = options;
  const react = makeReact();
  /** 桩传输口：票 1168 藏入口后面板不再取更新目标表，一律回 bad-request（体检走自家通道，不经此处）。 */
  const call = async () => {
    return { ok: false, error: { code: 'bad-request', message: '渲染替身不发电话', details: {} } };
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

  /** 每次页签槽取数都记一笔：`only` 就是被挂上去的那一家（#1294 的判据读数）。 */
  const slotCalls = [];
  const slotSpy = (slot, slotProps, slotOptions) => {
    slotCalls.push({ slot, only: slotOptions?.only ?? null });
    return renderSlot(slot, slotProps, slotOptions);
  };
  const props = { useTabs: (selector) => selector(tabs), renderSlot: slotSpy };
  const { tree, text } = await render(() => Section(props), react);
  return { tree, text, tabLabels: collectTabLabels(tree), slotCalls };
}

/**
 * 跑一家单品 client 的 `apply`（真产物），回它交给「爱生活页签槽」的**页签名**与**设置页那一卡的屏上文本**。
 *
 * 页签名就是这一家的 `SLOT_TITLE`：页签 label、侧边栏页签名、设置页标题都从它出。
 * 缺省（不给 `call`）照旧：传输口一律 `bad-request`、`getCall` 给 null ⇒ 面板画「拿不到配置」的降级态
 * （`tabs-738` 的老读数：页头那行照样画出来，是一份可信的屏上读数，不是渲染失败的空页）。
 *
 * 票 #1302 要读「挂载期发了哪些电话」「回执落地后附加块长什么样」，故多两个可选项：
 *   · `call(base, channel, payload)`：桩传输口，每通电话按 `{base, channel, method}` 记进返回的 `calls`；
 *     回执由调用方给。缺省不记录、照旧全 `bad-request`。
 *   · `settleTicks`：初渲之后再多跑几轮「展开 → 跑 effect → 等一拍」，让异步回执落地、附加块挂载；
 *     另返回 `settle(ticks)`，供测试在点按钮之后再收敛一次。
 *
 * @param {string} pkgDir 单品包根（含 `dist/client.js`）
 * @param {{ call?: ((base: string, channel: string, payload: any) => Promise<unknown>) | null, settleTicks?: number }} [options]
 * @returns {Promise<{ label: string, text: string, tree: unknown, calls: Array<{ base: string, channel: string, method: string | null }>, settle: (ticks?: number) => Promise<{ tree: unknown, text: string }> }>}
 */
export async function renderConfigTab(pkgDir, options = {}) {
  const { call = null, settleTicks = 0 } = options;
  const react = makeReact();
  const exports = materialize(pkgDir, react);
  const registrations = [];
  const calls = [];
  const transport = call === null
    ? null
    : async (base, channel, payload) => {
        calls.push({ base, channel, method: payload?.method ?? null });
        return call(base, channel, payload);
      };
  const stubCall = transport ?? (async () => ({ ok: false, error: { code: 'bad-request', message: '渲染替身不发电话', details: {} } }));
  exports.apply({
    slots: {
      inject: (_key, callback) => callback(),
      register: (registerOptions, component) => { registrations.push({ options: registerOptions, component }); return () => {}; },
      entries: () => [],
      getVersion: () => 0,
      subscribe: () => () => {},
    },
    effect: (callback) => callback(),
    get: () => undefined,
    connection: { rpc: { call: stubCall } },
  });
  const row = registrations.find((entry) => entry.options.name === 'ilife.config-tab');
  assert.ok(row, pkgDir + ' 没往爱生活页签槽注册（页签名与设置页都无从谈起）');
  assert.equal(typeof row.component, 'function', pkgDir + ' 注册的不是一个组件');
  const label = typeof row.options.label === 'function' ? row.options.label() : String(row.options.label);
  const getCall = transport === null ? () => null : () => transport;
  const root = () => row.component({ getCall, getPicker: () => null });

  /** 多跑几轮 effect 收敛（异步回执落地、附加块挂载）；点按钮之后也能再调用。 */
  const settle = async (ticks = 6) => {
    const tree = await converge(root, react, ticks, { alwaysTick: true });
    return { tree, text: textOf(tree) };
  };

  const first = await render(root, react);
  const after = settleTicks > 0 ? await settle(settleTicks) : first;
  return { label, text: after.text, tree: after.tree, calls, settle };
}
