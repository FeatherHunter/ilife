// 票 #1195 自证回路：入口→弹出→翻页→内容全链路（收口票，不施工，只验链不断）。
// 读真产物，自带最小 react 替身（与 1237/1238/1239 同形）。
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

function texts(node, buf = []) {
  if (node === null || node === undefined || typeof node !== 'object') {
    if (typeof node === 'string' || typeof node === 'number') buf.push(String(node));
    return buf;
  }
  if (Array.isArray(node)) { for (const c of node) texts(c, buf); return buf; }
  texts(node.props?.children, buf);
  return buf;
}

function openChain() {
  const react = makeReact();
  const code = readFileSync(join(MANAGER_DIR, 'dist', 'client.js'), 'utf8');
  const registrations = [];
  new Function('window', code)({ __ModuleLoader__: { load: (reg) => { registrations.push(reg); } } });
  let Section = null;
  registrations[0].factory((spec) => {
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
  const render = () => {
    react.cursor = 0;
    return expand(Section({ useTabs: (sel) => sel([]), renderSlot: () => null }));
  };
  const by = (tree, key) => findAll(tree, (n) => n.props?.['data-ilife-manual'] === key);
  const pagesOf = (tree) => by(tree, 'page-frame').map((p) => p.props?.['data-ilife-page']);
  return { render, by, pagesOf };
}

describe('#1195 全链路', () => {
  it('入口→开书→三跨页走完→目录跳回，每跨页标题与铜扣态都对', async () => {
    const { render, by, pagesOf } = openChain();
    let tree = render();
    by(tree, 'shell');
    const entry = findAll(tree, (n) => n.type === 'button' && n.props?.['data-ilife-press'] === 'manual')[0];
    assert.ok(entry, '面板顶部须有入口');
    entry.props.onClick();
    tree = render();
    assert.deepEqual(pagesOf(tree), [1, 2], '首跨页 1/2');
    assert.ok(texts(tree).join(' ').includes('这本手册里有什么'), '目录在首跨页');
    assert.equal(by(tree, 'prev')[0].props?.disabled, true, '首跨页上一页禁用');
    const next = () => by(render(), 'next')[0];
    next().props.onClick();
    tree = render();
    assert.deepEqual(pagesOf(tree), [3, 4], '第 2 跨页 3/4');
    const t2 = texts(tree).join(' ');
    assert.ok(t2.includes('数据目录：你专属的数据存放位置') && t2.includes('增强体验：装 IM 插件手机远程用'), '场景 2/3 在第 2 跨页');
    assert.equal(by(tree, 'prev')[0].props?.disabled, false, '中跨页上一页可用');
    next().props.onClick();
    tree = render();
    assert.deepEqual(pagesOf(tree), [5, 'empty'], '尾跨页 5＋右框预清空');
    assert.ok(texts(tree).join(' ').includes('后续场景'), '合页在尾跨页');
    assert.equal(by(tree, 'next')[0].props?.disabled, true, '尾跨页下一页禁用');
    const toc1 = by(tree, 'toc-row');
    assert.equal(toc1.length, 0, '尾跨页无目录行（目录只在第 1 页）');
    const prev = () => by(render(), 'prev')[0];
    prev().props.onClick();
    prev().props.onClick();
    tree = render();
    assert.deepEqual(pagesOf(tree), [1, 2], '连按两下回到首跨页');
    const jump = by(tree, 'toc-row').find((r) => r.props?.['data-jump'] === 5);
    assert.ok(jump, '目录须有跳尾跨页的行');
    jump.props.onClick();
    tree = render();
    assert.deepEqual(pagesOf(tree), [5, 'empty'], '目录行直达尾跨页');
  });
});
