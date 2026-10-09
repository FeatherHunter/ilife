// 票 #1237 自证回路：总管面板顶部出现甲腰封书使用手册入口，点开弹出书（空壳），再关上。
//
// 读真产物（dist/client.js）， bead 房自带最小 react 替身（与 test/helpers/panel-render.mjs 同形，
// 本文件自包含：拿住 cursor store 才能点完按钮再重渲，不断言时重开新 store）。
// 前提：先出产物（pnpm --filter dsh-life-pack run build），再跑本文件。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANAGER_DIR = join(HERE, '..');

function makeReact() {
  const store = [];
  const react = {
    cursor: 0,
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
      return [store[i], (next) => { const v = typeof next === 'function' ? next(store[i]) : next; store[i] = v; }];
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect: () => {},
  };
  return react;
}

function materialize() {
  const code = readFileSync(join(MANAGER_DIR, 'dist', 'client.js'), 'utf8');
  const registrations = [];
  const stubWindow = { __ModuleLoader__: { load: (reg) => { registrations.push(reg); } } };
  new Function('window', code)(stubWindow);
  assert.equal(registrations.length, 1, 'client 束须恰好注册一次');
  return registrations[0];
}

function expand(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((child) => expand(child));
  if (typeof node.type === 'function') return expand(node.type(node.props));
  return { type: node.type, props: { ...node.props, children: expand(node.props?.children) } };
}

function findAll(node, pred, out = []) {
  if (node === null || node === undefined || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const c of node) findAll(c, pred, out); return out; }
  if (pred(node)) out.push(node);
  findAll(node.props?.children, pred, out);
  return out;
}

async function renderPanel(react, registration) {
  let Section = null;
  registration.factory((spec) => {
    if (String(spec).startsWith('react')) return react;
    throw new Error('只提供 react：' + spec);
  }).apply({
    slots: {
      inject: (_key, cb) => cb(),
      register: (_opts, component) => { Section = component; return () => {}; },
      entries: () => [],
      getVersion: () => 0,
      subscribe: () => () => {},
    },
    effect: (cb) => cb(),
    connection: { rpc: { call: async () => ({ ok: false, error: { code: 'bad-request', message: '替身不发电话', details: {} } }) } },
  });
  assert.equal(typeof Section, 'function', '没捕获到面板组件');
  react.cursor = 0;
  return expand(Section({ useTabs: (sel) => sel([]), renderSlot: () => null }));
}

describe('#1237 总管手册入口', () => {
  it('面板顶部有甲腰封书入口（可用名＝使用手册），初始书是合上的', async () => {
    const react = makeReact();
    const tree = await renderPanel(react, materialize());
    const entries = findAll(tree, (n) => n.type === 'button' && n.props?.['data-ilife-press'] === 'manual');
    assert.equal(entries.length, 1, '入口按钮须恰好一枚');
    assert.equal(entries[0].props?.['aria-label'], '使用手册');
    assert.equal(findAll(tree, (n) => n.props?.role === 'dialog').length, 0, '初始不许有弹出书');
  });

  it('点入口弹出空壳书，再点关闭合上', async () => {
    const react = makeReact();
    const registration = materialize();
    let tree = await renderPanel(react, registration);
    const entry = findAll(tree, (n) => n.type === 'button' && n.props?.['data-ilife-press'] === 'manual')[0];
    assert.ok(entry, '找不到入口按钮');
    assert.equal(typeof entry.props?.onClick, 'function', '入口须可点');
    entry.props.onClick();
    react.cursor = 0;
    tree = await renderPanel(react, registration);
    const dialogs = findAll(tree, (n) => n.props?.role === 'dialog');
    assert.equal(dialogs.length, 1, '点开后须有一本书');
    assert.equal(dialogs[0].props?.['aria-label'], '使用手册');
    const closer = findAll(tree, (n) => n.type === 'button' && n.props?.['data-ilife-press'] === 'manual-close')[0];
    assert.ok(closer, '书上须有关闭钮');
    closer.props.onClick();
    react.cursor = 0;
    tree = await renderPanel(react, registration);
    assert.equal(findAll(tree, (n) => n.props?.role === 'dialog').length, 0, '关后书须合上');
  });
});
