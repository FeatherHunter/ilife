// 票 #1238 自证回路：popover 书籍壳（内容无关，空壳跑通）。
// 读真产物，自带最小 react 替身（与 manual-entry-1237 同形，自包含以便点按重渲）。
// 前提：先出产物（pnpm --filter dsh-life-pack run build），再跑本文件。
// 说明：壳默认场景为空（内容是 #1239 的活），故本文件只验空壳 degenerate：
// 框/纸/脊/铜扣在、无签、空页无字、A4 高比；翻签/铜扣交互随场景进 #1239 验。
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

async function openBook() {
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
  react.cursor = 0;
  let tree = expand(Section({ useTabs: (sel) => sel([]), renderSlot: () => null }));
  const entry = findAll(tree, (n) => n.type === 'button' && n.props?.['data-ilife-press'] === 'manual')[0];
  assert.ok(entry, '找不到手册入口');
  entry.props.onClick();
  react.cursor = 0;
  tree = expand(Section({ useTabs: (sel) => sel([]), renderSlot: () => null }));
  return tree;
}

describe('#1238 书籍壳空壳', () => {
  it('书在：框纸脊书签层铜扣齐，空页无字', async () => {
    const tree = await openBook();
    const shell = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'shell');
    assert.equal(shell.length, 1, '壳须恰好一个');
    assert.equal(findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'book').length, 1, '书须一本');
    const frames = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'page-frame');
    assert.equal(frames.length, 2, '左右页框各一');
    for (const f of frames) {
      assert.equal(f.props?.['data-ilife-page'], 'empty', '空壳页框须标 empty');
      assert.deepEqual(texts(f).filter((t) => t.trim().length > 0), [], '空页框里一字不许有');
    }
    assert.equal(findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'tab').length, 0, '空书无签');
  });

  it('A4 高比与铜扣两端禁用（空书恒一跨页）', async () => {
    const tree = await openBook();
    const book = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'book')[0];
    assert.ok(String(book.props?.style?.minHeight ?? '').includes('1.41421356'), '书高须锁 A4 比');
    const prev = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'prev')[0];
    const next = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'next')[0];
    assert.ok(prev && next, '铜扣须两颗');
    assert.equal(prev.props?.disabled, true, '首跨页上一页须禁用');
    assert.equal(next.props?.disabled, true, '末跨页下一页须禁用');
    assert.equal(texts(prev).join(''), '‹ 上一页');
    assert.equal(texts(next).join(''), '下一页 ›');
  });
});
