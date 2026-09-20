// 票 #737 自证回路：面板那行的版本号**不手写**，由宿主读自己这份已安装包的 `package.json`。
//
// 现象（2026-09-20 实测）：包已是 0.2.7，面板印 0.2.6 —— 手写常量 `MANAGER_VERSION` 漏了跟定版走，
// 而它是「屏上那行」的唯一来源。第一版修法把常量改对 ＋ 立一条「常量 ≡ 包版本」的门；
// 维护者 2026-09-20 裁定改走**自动读取**（常量这条源就不要了）：读完盘，「屏上那行 ≡ 装机包版本」
// 由构造保证，定版也只剩改 `package.json` 一处。
//
// 本回路咬三条，都不咬写法：
//   ① 宿主读值：`readManagerVersion()` 读的就是本包 `package.json`；给哨兵件就读哨兵的 version；
//      读不到（缺文件／非 JSON／字段缺失／空串）一律回 `unknown` 且**不抛**。
//   ② 不手写回潮：产物 `dist/client.js` 里不许再出现带版本号的屏幕字面量（`总管 dsh-life-pack · <数字>`），
//      且必须带着那条电话名（版本是问宿主要的）。
//   ③ 屏幕那行真跟着宿主跑：拿真产物渲一次组件 —— 宿主回哨兵版本，屏上就是哨兵；
//      宿主回 unknown，屏上就是 unknown（写死常量、或面板自己编一个值，都过不了这两条）。
//
// 前提：①②③ 都读产物，所以要先出产物（CI 的顺序正是先 `pnpm build` 再 `pnpm test`）：
//   node node_modules/typescript/bin/tsc -b packages/plugin-manager
//   cmd /c "cd /d <仓根>\packages\plugin-manager && node node_modules\tsdown\dist\run.mjs"
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { managerPackageJsonPath, readManagerVersion } from '../dist/manager-version.js';
import { MANAGER_ACTIONS, VERSION_UNKNOWN } from '../dist/update-contract.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const PKG = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
const CLIENT = readFileSync(join(PKG_DIR, 'dist', 'client.js'), 'utf8');
/** 哨兵：一个绝不可能出现在真包里的版本号（面板要是自己编值，就对不上它）。 */
const SENTINEL = '9.9.9-哨兵';

/** 临时目录只为本回路造哨兵件；用完即删（路径守卫：只删自己这个前缀的临时根）。 */
function withTmpDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 't737-reader-'));
  try {
    return fn(dir);
  } finally {
    if (!dir.split(/[\\/]/).pop().startsWith('t737-reader-')) throw new Error('清理守卫拒绝：' + dir);
    rmSync(dir, { recursive: true, force: true });
  }
}

/** 把元素树里的文本收集起来（替身 `createElement` 的形状：`{type, props:{children}}`）。 */
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

/**
 * 用真产物渲一次面板，只回那行版本号文本。
 * 替身只够跑这个组件：hooks 用顺序 hook store（与 `docs/plugins/plugin-manager/t679-面板渲染台.mjs`
 * 页内那份同形），`connection.rpc.call` 换成按方法名回桩值的假传输口。
 */
async function renderVersionLine(reply) {
  const store = [];
  const queue = [];
  let cursor = 0;
  const React = {
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
      return [store[i], (next) => { const value = typeof next === 'function' ? next(store[i]) : next; if (value !== store[i]) store[i] = value; }];
    },
    useMemo: (fn) => fn(),
    // 注意：useCallback 只**返回**回调，不许当场调它（写成 `(fn) => fn()` 会把回调当工厂调一遍）。
    useCallback: (fn) => fn,
    useEffect: (fn, deps) => {
      const i = cursor++;
      const before = store[i];
      const changed = !before || !deps || before.deps.length !== deps.length || deps.some((d, k) => d !== before.deps[k]);
      store[i] = { deps: deps ?? null };
      if (changed) queue.push(fn);
    },
  };
  const call = async (_base, _endpoint, payload) => {
    const method = payload?.method;
    if (method === MANAGER_ACTIONS.version) {
      return reply.fail
        ? { ok: false, error: { code: 'internal', message: '宿主读不到', details: {} } }
        : { ok: true, value: { version: reply.version } };
    }
    if (method === MANAGER_ACTIONS.targets) return { ok: true, value: { targets: [], pollMs: 1000 } };
    return { ok: false, error: { code: 'bad-request', message: '渲染台只答这两条', details: {} } };
  };

  // 物化真产物（classic script 语义）→ 捕获注册进 settings.section 的那个组件。
  const registrations = [];
  new Function('window', CLIENT)({ __ModuleLoader__: { load: (reg) => { registrations.push(reg); } } });
  assert.equal(registrations.length, 1, 'client 束须恰好注册一次');
  let Section = null;
  registrations[0].factory((spec) => {
    if (String(spec).startsWith('react')) return React;
    throw new Error('渲染台只提供 react：' + spec);
  }).apply({
    slots: {
      inject: (_key, callback) => callback(),
      register: (_options, component) => { Section = component; return () => {}; },
      entries: () => [],
      getVersion: () => 0,
      subscribe: () => () => {},
    },
    effect: (callback) => callback(),
    connection: { rpc: { call } },
  });
  assert.equal(typeof Section, 'function', '没捕获到 settings.section 组件');

  const props = { useTabs: (selector) => selector([]), renderSlot: () => null };
  cursor = 0;
  let tree = expand(Section(props));
  for (let pass = 0; pass < 8 && queue.length > 0; pass += 1) {
    const effects = queue.splice(0, queue.length);
    for (const effect of effects) effect();
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    cursor = 0;
    tree = expand(Section(props));
  }
  const buf = [];
  collectText(tree, buf);
  return buf.join(' ');
}

describe('票 #737 ① 宿主读值：读的是自己这份包描述文件', () => {
  it('默认路径就是本包 package.json（dist/manager-version.js → ../package.json）', () => {
    assert.equal(managerPackageJsonPath(), join(PKG_DIR, 'package.json'));
  });

  it('读出来的就是那份文件的 version（装机态读装机包，开发单仓读本包，同一段代码）', () => {
    assert.equal(readManagerVersion(), PKG.version);
  });

  it('哨兵件：给哪份就读哪份的 version（证明它是真读文件，不是源码里抄来的值）', () => {
    withTmpDir((dir) => {
      const file = join(dir, 'package.json');
      writeFileSync(file, JSON.stringify({ name: 'dsh-life-pack', version: SENTINEL }), 'utf8');
      assert.equal(readManagerVersion(file), SENTINEL);
    });
  });

  it('读不到一律 unknown 且不抛：缺文件／非 JSON／没这个字段／空串', () => {
    withTmpDir((dir) => {
      assert.equal(readManagerVersion(join(dir, 'nope.json')), VERSION_UNKNOWN, '缺文件该回 unknown');
      const bad = join(dir, 'bad.json');
      writeFileSync(bad, '{ 这不是 JSON', 'utf8');
      assert.equal(readManagerVersion(bad), VERSION_UNKNOWN, '非 JSON 该回 unknown');
      const none = join(dir, 'none.json');
      writeFileSync(none, JSON.stringify({ name: 'dsh-life-pack' }), 'utf8');
      assert.equal(readManagerVersion(none), VERSION_UNKNOWN, '没有 version 字段该回 unknown');
      const blank = join(dir, 'blank.json');
      writeFileSync(blank, JSON.stringify({ version: '   ' }), 'utf8');
      assert.equal(readManagerVersion(blank), VERSION_UNKNOWN, '空串该回 unknown');
    });
  });
});

describe('票 #737 ② 不手写回潮：版本号不是面板写死的', () => {
  it('产物里不许再出现带版本号的屏幕字面量（写死即红）', () => {
    const frozen = /总管 dsh-life-pack · \d/.exec(CLIENT);
    assert.equal(frozen, null, '产物里又写死了版本号：' + (frozen ? frozen[0] : ''));
  });

  it('产物里带着那条电话名（版本是问宿主要的）', () => {
    assert.ok(CLIENT.includes(MANAGER_ACTIONS.version), 'client 束里没有电话名 ' + MANAGER_ACTIONS.version);
  });
});

describe('票 #737 ③ 屏幕那行跟着宿主跑（真产物渲一次）', () => {
  it('宿主回哨兵版本 → 屏上就是哨兵（写死常量、面板自己编值，都过不了）', async () => {
    const text = await renderVersionLine({ version: SENTINEL });
    assert.ok(text.includes('总管 dsh-life-pack · ' + SENTINEL), '屏上那行不是哨兵，取到的是：' + text.slice(0, 160));
  });

  it('宿主回 unknown（读不到）→ 屏上就是 unknown，不抛也不编值', async () => {
    const text = await renderVersionLine({ fail: true });
    assert.ok(text.includes('总管 dsh-life-pack · ' + VERSION_UNKNOWN), '读不到时屏上该是 unknown，取到的是：' + text.slice(0, 160));
  });
});
