// 票 #1240 自证回路：手册壳的**逐像素口径**（对齐冻结原型 proto-manual-4scenes.html）。
//
// 断言的都是口径本身（哪一处定义、谁在框内谁在框外、字体栈、纸面内衬），不是某一串像素值：
// 原型一改这些口径就得跟着改，测试跟着红。像样的外部判据（三档窗口截图与原型对照）见
// docs/plugins/plugin-manager/t1240-像素级还原-证据.md。
//
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

describe('#1240 手册壳与冻结原型同口径', () => {
  it('纸宽口径只有一处：弹层上定义 `--paper-w`＝原型那条 min(1080px, 100vw-40px-2.25em)', async () => {
    const tree = await openBook();
    const dialog = findAll(tree, (n) => n.props?.role === 'dialog')[0];
    assert.ok(dialog, '弹层须在');
    assert.equal(dialog.props.style?.['--paper-w'], 'min(1080px, calc(100vw - 40px - 2.25em))', '纸宽基准须与原型的 :root 同式');
    const shell = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'shell')[0];
    assert.ok(shell, '书壳须在');
    assert.equal(shell.props.style?.['--paper-w'], undefined, '壳不许再定义一份（口径一处）');
    assert.equal(shell.props.style?.maxWidth, 'var(--paper-w)', '壳宽只读纸宽');
    assert.equal(shell.props.style?.padding, '1.125em', '壳内缩＝原型 .scroll 的 1.125em');
  });

  it('铜扣在红框外：壳里没有铜扣，铜扣与壳同在舞台上', async () => {
    const tree = await openBook();
    const stage = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'stage')[0];
    assert.ok(stage, '舞台层须在');
    const shell = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'shell')[0];
    const inShell = findAll(shell, (n) => n.props?.['data-ilife-manual'] === 'prev' || n.props?.['data-ilife-manual'] === 'next');
    assert.equal(inShell.length, 0, '铜扣不许落在壳（红框）里');
    const inStage = findAll(stage, (n) => n.props?.['data-ilife-manual'] === 'prev' || n.props?.['data-ilife-manual'] === 'next');
    assert.equal(inStage.length, 2, '两颗铜扣都在舞台上（框外页面底色）');
    const stageKids = (stage.props.children ?? []).filter(Boolean).map((c) => c.props?.['data-ilife-manual']);
    assert.deepEqual(stageKids, ['shell', undefined], '舞台层先书壳、后铜扣行');
  });

  it('页根字号与纸面内衬照原型：字号＝纸宽×1.5%，纸面无内衬', async () => {
    const tree = await openBook();
    const frames = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'page-frame');
    assert.equal(frames.length, 2, '左右页框各一');
    for (const frame of frames) {
      assert.equal(frame.props.style?.fontSize, 'calc(var(--paper-w) * .015)', '页根字号＝原型 .page 那条');
    }
    const paper = findAll(tree, (n) => n.props?.style?.background === '#ece0c2' && n.type === 'div')[0];
    assert.ok(paper, '纸面须在');
    assert.equal(paper.props.style?.padding, undefined, '纸面不带内衬（原型冻结版 padding:0）');
    assert.equal(paper.props.style?.margin, undefined, '纸面不带外边距（原型冻结版 margin:0）');
    assert.equal(paper.props.style?.boxShadow, undefined, '纸面不带内阴影（原型冻结版 box-shadow:none）');
  });

  it('字体栈钉死原型的 body 那条：换字就换断行，逐像素对照必然对不上', async () => {
    const tree = await openBook();
    const dialog = findAll(tree, (n) => n.props?.role === 'dialog')[0];
    assert.equal(dialog.props.style?.fontFamily, "system-ui,'Microsoft YaHei',sans-serif");
  });

  it('书签几何仍只来自排版计算结果（签宽随纸宽）', async () => {
    const tree = await openBook();
    const tabs = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'tab');
    assert.equal(tabs.length, 3, '5 页书 3 枚签');
    for (const tab of tabs) {
      assert.match(String(tab.props.style?.width ?? ''), /var\(--paper-w\)/, '签宽须按纸宽算');
    }
  });
});
