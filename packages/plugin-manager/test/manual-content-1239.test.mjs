// 票 #1239 自证回路：内容接线（目录＋三场景定稿文字＋合页锁页样＋签徽入句＋静态面板＋备注）。
// 硬判据：SCENES 与冻结原型第 276 行逐字一致（现场提 JSON 深比，不抄第二份）。
// 读真产物，自带最小 react 替身（与 1237/1238 同形；每个 it 独立开店，跨页导航靠铜扣/签/目录行点跳）。
// 前提：先出产物（pnpm --filter dsh-life-pack run build），再跑本文件。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANAGER_DIR = join(HERE, '..');
const PROTO = join(HERE, '..', '..', '..', 'docs', 'plugins', 'plugin-manager', 'proto-manual-4scenes.html');

function makeReact() {
  const store = [];
  const effDeps = [];
  const react = {
    cursor: 0,
    effCursor: 0,
    pending: [],
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
    // 替身 effect 冲洗：按 React 语义记 deps（无 deps 每遍跑），由 render 统一推进，
    // 使壳的量高 passes 在无量具时正常收工（measuring → -1，页框跟当前跨页）。
    useEffect: (cb, deps) => {
      const i = react.effCursor++;
      const prev = effDeps[i];
      const changed = prev === undefined
        || deps === undefined
        || deps.length !== prev.length
        || deps.some((d, k) => !Object.is(d, prev[k]));
      if (changed) react.pending.push(cb);
      effDeps[i] = deps === undefined ? undefined : [...deps];
    },
  };
  react.__store = store;
  return react;
}

function snapshot(store) {
  return JSON.stringify(store, (_k, v) => (v instanceof Set ? [...v] : v));
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

function rawHtml(node, buf = []) {
  if (node === null || node === undefined || typeof node !== 'object') return buf;
  if (Array.isArray(node)) { for (const c of node) rawHtml(c, buf); return buf; }
  if (node.props?.dangerouslySetInnerHTML?.__html !== undefined) buf.push(node.props.dangerouslySetInnerHTML.__html);
  rawHtml(node.props?.children, buf);
  return buf;
}

async function openBook(react) {
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
    let tree = null;
    for (let k = 0; k < 12; k++) {
      react.cursor = 0;
      react.effCursor = 0;
      react.pending.length = 0;
      const before = snapshot(react.__store);
      tree = expand(Section({ useTabs: (sel) => sel([]), renderSlot: () => null }));
      for (const cb of react.pending.splice(0)) cb();
      if (snapshot(react.__store) === before) break;
    }
    return tree;
  };
  let tree = render();
  const entry = findAll(tree, (n) => n.type === 'button' && n.props?.['data-ilife-press'] === 'manual')[0];
  assert.ok(entry, '找不到手册入口');
  entry.props.onClick();
  tree = render();
  return { tree, render };
}

function frozenScenes() {
  const html = readFileSync(PROTO, 'utf8');
  const m = html.match(/var SCENES = (\[.*?\]);/s);
  assert.ok(m, '原型里找不到 SCENES');
  return JSON.parse(m[1]);
}

const WARNS = ['没收到文件', '目录填错或没权限', '收不到消息'];

describe('#1239 内容接线', () => {
  it('SCENES 与冻结原型第 276 行逐字一致：5 页/3 跨页/3 纸', async () => {
    const frozen = frozenScenes();
    const { SCENES } = await import('../dist/manual-content.js');
    assert.deepEqual(SCENES, frozen, '成品内容须与原型逐字一致');
    assert.deepEqual(SCENES.map((s) => s.key), ['contents', 'basic', 'datadir', 'im', 'upcoming']);
    const { planManual } = await import('../dist/manual-plan.js');
    assert.equal(planManual(SCENES, 0).pageCount, 5);
    assert.equal(planManual(SCENES, 0).spreadCount, 3);
    assert.equal(planManual(SCENES, 0).sheets.length, 3);
  });

  it('首跨页：目录 5 行可点跳＋基本使用六步＋签徽入句＋无复制按钮', async () => {
    const react = makeReact();
    const { tree, render } = await openBook(react);
    const frames = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'page-frame');
    assert.deepEqual(frames.map((p) => p.props?.['data-ilife-page']), [1, 2]);
    const tocRows = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'toc-row');
    assert.equal(tocRows.length, 5, '目录行须 5 行（目录＋3 场景＋合页）');
    for (const row of tocRows) {
      assert.ok(row.props?.['data-jump'] !== undefined, '目录行须带跳转');
      assert.equal(typeof row.props?.onClick, 'function', '目录行须可点');
    }
    const jump5 = tocRows.find((r) => r.props?.['data-jump'] === 5);
    assert.ok(jump5, '合页目录行须跳第 5 页');
    jump5.props.onClick();
    const jumped = render();
    assert.deepEqual(
      findAll(jumped, (n) => n.props?.['data-ilife-manual'] === 'page-frame').map((p) => p.props?.['data-ilife-page']),
      [5, 'empty'],
      '目录行点跳须直达尾跨页（奇数尾跨页右框为空）',
    );
    const html = rawHtml(tree).join(' ');
    assert.ok(html.includes('dbadge'), '基本使用须有黑徽入句');
    assert.ok(html.includes('prompt'), '基本使用须有术语悬停');
    assert.ok(texts(tree).join(' ').includes('基本使用：对 DSH 说什么 help'), '基本使用标题须在');
    assert.equal(findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'frag-copy').length, 0, '片段为空，不许有复制按钮');
    assert.equal(findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'tags-row').length, 0, 'tags 只作数据携带，不单独成行');
    for (const w of WARNS) assert.ok(!texts(tree).join(' ').includes(w), 'warn 不渲染：' + w);
  });

  it('中跨页：数据目录路径签＋静态深色面板＋备注', async () => {
    const react = makeReact();
    const { tree, render } = await openBook(react);
    findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'next')[0].props.onClick();
    const now = render();
    assert.deepEqual(
      findAll(now, (n) => n.props?.['data-ilife-manual'] === 'page-frame').map((p) => p.props?.['data-ilife-page']),
      [3, 4],
    );
    const body = texts(now).join(' ');
    assert.ok(body.includes('数据目录：你专属的数据存放位置'), '数据目录标题须在');
    assert.ok(body.includes('增强体验：装 IM 插件手机远程用'), '增强体验标题须在');
    const html = rawHtml(now).join(' ');
    assert.ok(html.includes('ctag') && html.includes('配置面板 › 数据目录'), '路径签须入句');
    assert.ok(html.includes('capp') && html.includes('dsh-im'), '红徽须入句');
    const panels = findAll(now, (n) => n.props?.['data-ilife-manual'] === 'static-panel');
    assert.equal(panels.length, 1, '静态深色面板须恰好一处');
    assert.equal(findAll(panels[0], (n) => typeof n.props?.onClick === 'function').length, 0, '静态面板内一处不可点');
    assert.ok(texts(panels[0]).join(' ').includes('2Study'), '面板须有路径行');
    assert.ok(body.includes('不对你数据目录里的数据库文件加密'), '备注须在');
    const stepHtml = rawHtml(tree).join(' ');
    assert.ok(stepHtml.includes('饼干记账 help'), '步骤串须带原文');
    assert.ok(stepHtml.includes('dbadge') && stepHtml.includes('ctag') === false, '基本使用页签徽在');
    assert.equal(findAll(now, (n) => n.props?.['data-ilife-manual'] === 'frag-copy').length, 0, '片段为空，不许有复制按钮');
    for (const w of WARNS) assert.ok(!body.includes(w), 'warn 不渲染：' + w);
  });

  it('签点跳＋铜扣首尾禁用', async () => {
    const react = makeReact();
    const { tree, render } = await openBook(react);
    const tabs = findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'tab');
    assert.equal(tabs.length, 3, '5 页须 3 枚签');
    assert.equal(findAll(tree, (n) => n.props?.['data-ilife-manual'] === 'prev')[0].props?.disabled, true, '首跨页上一页须禁用');
    const tab4 = tabs.find((t) => t.props?.['data-pg'] === 4);
    assert.ok(tab4, '找不到 4 号签');
    tab4.props.onClick();
    let now = render();
    assert.deepEqual(
      findAll(now, (n) => n.props?.['data-ilife-manual'] === 'page-frame').map((p) => p.props?.['data-ilife-page']),
      [3, 4],
      '点 4 号签须到第 2 跨页',
    );
    assert.equal(findAll(now, (n) => n.props?.['data-ilife-manual'] === 'prev')[0].props?.disabled, false, '中跨页铜扣须全可用');
    assert.equal(findAll(now, (n) => n.props?.['data-ilife-manual'] === 'next')[0].props?.disabled, false, '中跨页铜扣须全可用');
    findAll(now, (n) => n.props?.['data-ilife-manual'] === 'next')[0].props.onClick();
    now = render();
    assert.deepEqual(
      findAll(now, (n) => n.props?.['data-ilife-manual'] === 'page-frame').map((p) => p.props?.['data-ilife-page']),
      [5, 'empty'],
      '下一页须到尾跨页（奇数尾跨页右框为空）',
    );
    assert.equal(findAll(now, (n) => n.props?.['data-ilife-manual'] === 'next')[0].props?.disabled, true, '尾跨页下一页须禁用');
    assert.equal(findAll(now, (n) => n.props?.['data-ilife-manual'] === 'prev')[0].props?.disabled, false, '尾跨页上一页须可用');
  });

  it('尾跨页合页：锁页样 5 行 4/5/6/7/8，无小字脚注', async () => {
    const react = makeReact();
    const { tree, render } = await openBook(react);
    const next = () => findAll(render(), (n) => n.props?.['data-ilife-manual'] === 'next')[0];
    next().props.onClick();
    next().props.onClick();
    const now = render();
    void tree;
    const body = texts(now).join(' ');
    assert.ok(body.includes('后续场景'), '合页标题须在');
    assert.ok(!body.includes('基本使用'), '尾跨页不应有场景正文');
    const rows = findAll(now, (n) => n.props?.['data-ilife-manual'] === 'pending-row');
    assert.equal(rows.length, 5, '合页待补充行须 5 行');
    assert.deepEqual(rows.map((r) => texts(r)[0]), ['4', '5', '6', '7', '8'], '合页行号须为 4/5/6/7/8');
    for (const r of rows) {
      const t = texts(r).join(' ');
      assert.ok(t.includes('后续场景，待补充') && t.includes('🔒'), '合页行须是锁页样：' + t);
      assert.equal(typeof r.props?.onClick, 'undefined', '合页行不可点');
    }
    assert.equal(findAll(now, (n) => n.props?.className === 'small').length, 0, '合页无小字脚注');
  });
});

// 票 #1242 · F4 偏差回归：`.pg .dbadge::before` 黑徽标识（原型渲染路径产出、影响静态像素）
// 曾经整条缺席（#1242 首轮判据 FAIL 5/6 的独苗）。判据与原型同源：现场从原型抽原文，不抄第二份。
describe('#1242 样式冻结', () => {
  const SRC = join(MANAGER_DIR, 'src', 'manual-content.ts');
  const HEAD = '.pg .dbadge::before{';
  const norm = (s) => s.replace(/\s+/g, ' ').replace(/\s*([;{},:])\s*/g, '$1').trim();

  it('.pg .dbadge::before 规则与冻结原型逐字一致地在场（黑徽标识）', () => {
    const proto = readFileSync(PROTO, 'utf8');
    const at = proto.indexOf(HEAD);
    assert.ok(at >= 0, '原型里找不到 ' + HEAD);
    const rule = proto.slice(at, proto.indexOf('}', at) + 1);
    assert.ok(rule.length > 500, '原型该条规则应含内嵌 PNG 的 base64，实长 ' + rule.length);
    assert.ok(rule.endsWith('}'), '原型该条规则须以 } 收尾');

    const src = readFileSync(SRC, 'utf8');
    // 成品用单引号字符串字面量：规则原文（含内嵌 "…" 与 base64）整条在场
    assert.ok(src.includes("'" + rule + "'"), '成品缺这条规则（原文在场性）：' + rule.slice(0, 80) + '…');

    // 同一套字面量口径下的规则清单，逐条比对（整形后）
    const body = src.slice(src.indexOf('export function manualContentCss'), src.indexOf('].join(', src.indexOf('export function manualContentCss')));
    const rules = [...body.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\(['"\\])/g, '$1'));
    const hit = rules.filter((r) => norm(r) === norm(rule));
    assert.equal(hit.length, 1, '整形后与原型一致的 .pg .dbadge::before 规则须恰 1 条，实为 ' + hit.length);
    assert.equal(hit[0], rule, '.pg .dbadge::before 须与原型逐字相同');
  });
});
