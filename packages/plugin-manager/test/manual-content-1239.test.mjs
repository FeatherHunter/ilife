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
    assert.ok(html.includes('Prompt'), '基本使用须有术语悬停');
    assert.ok(texts(tree).join(' ').includes('基本使用：对 DSH 说 技能名HELP'), '基本使用标题须在');
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
    assert.ok(stepHtml.includes('饼干记账 HELP'), '步骤串须带原文');
    assert.equal((stepHtml.match(/class="pop"/g) ?? []).length, 6, '基本使用页须 6 处图片浮层');
    const nowHtml = rawHtml(now).join(' ');
    assert.ok(nowHtml.includes('https://github.com/xmanrui/dsh-im'), 'dsh-im 外链须在');
    assert.ok(nowHtml.includes('https://github.com/FeatherHunter/dsh-im-companion'), 'companion 外链须在');
    assert.ok(nowHtml.includes('target="_blank"'), '外链须新窗口开');
    assert.equal((nowHtml.match(/class="pop"/g) ?? []).length, 5, 'IM 页须 5 处图片浮层');
    assert.ok(nowHtml.includes('<svg'), '图片徽标须带图示');
    assert.ok(nowHtml.includes('>×<'), '浮层须带 × 关闭钮');
    assert.ok(nowHtml.includes('class="view"'), '浮层图须套等宽滚动壳');
    assert.ok(nowHtml.includes('data-pop-toggle'), '徽标须带委托开关位');
    // Chrome 在 </details> 处无视 nowrap 硬断行（实测逮过）：浮层一律 span＋委托，不用 details。
    const VIEW_SRC = readFileSync(join(HERE, '..', 'src', 'manual-content.ts'), 'utf8');
    assert.ok(!VIEW_SRC.includes('<details'), '内容件不许再用 details');
    assert.ok(VIEW_SRC.includes('.pop.open>.view'), '浮层开合走 .open（委托切 class）');
    assert.ok(VIEW_SRC.includes('.pop.open>.view{') && VIEW_SRC.includes('position:fixed'), '浮层须破框居中（不受书容器裁剪）');
    assert.ok(VIEW_SRC.includes('.pop.open>.view>.x'), '× 须跟图走（挂在浮层框上）');
    // #1240 问题四：× 在图外右下（图内压照片看不清），三态反馈齐，动效有关闭退路
    assert.ok(VIEW_SRC.includes('bottom:-1em;right:-1em'), '× 须在图外右下');
    assert.ok(!VIEW_SRC.includes('.view>.x{display:flex;position:absolute;top:'), '× 不许再压在图内右上');
    assert.ok(VIEW_SRC.includes('.pop.open>.view>.x:hover') && VIEW_SRC.includes('.pop.open>.view>.x:active'), '× 须有悬停与按压反馈');
    assert.ok(VIEW_SRC.includes('.pop.open>.view>.x:focus-visible'), '× 须有键盘聚焦可见态');
    assert.ok(VIEW_SRC.includes('max-height:88vh;overflow:visible'), '浮层框须不裁外面的 ×');
    assert.ok(VIEW_SRC.includes('[data-pop-toggle]:hover'), '悬停也要呼吸（鼠标用户不用 Tab）');
    // 场景一两处复制徽标须各挂各的图（步骤 4 与步骤 5 不许共用一张）
    assert.equal((stepHtml.match(/DSH 饼干记账复制 prompt/g) ?? []).length, 2, '两处复制徽标须各就各位');
    assert.ok(VIEW_SRC.includes('a.capp{text-decoration:none}'), '红徽外链不许带下划线');
    assert.ok(VIEW_SRC.includes(':hover{transform:translateY(-1px)'), '可点徽标悬停须有上浮');
    assert.ok(VIEW_SRC.includes('@keyframes ilifeFocusBreath'), '聚焦须有呼吸金光');
    assert.ok(VIEW_SRC.includes('prefers-reduced-motion'), '动效须有关闭退路');
    assert.ok(nowHtml.includes('data:image/jpeg;base64,'), '浮层图须内联（宿主无图床可取）');
    assert.ok(stepHtml.includes('dbadge') && stepHtml.includes('ctag') === false, '基本使用页签徽在');
    assert.equal(findAll(now, (n) => n.props?.['data-ilife-manual'] === 'frag-copy').length, 0, '片段为空，不许有复制按钮');
    for (const w of WARNS) assert.ok(!body.includes(w), 'warn 不渲染：' + w);
  });

  it('图片浮层关钮归位：每 view 内恰一枚 ×（无重复无遗漏），冻结原文不动', async () => {
    const react = makeReact();
    const { render } = await openBook(react);
    const next = () => findAll(render(), (n) => n.props?.['data-ilife-manual'] === 'next')[0];
    const pages = [render()];
    next().props.onClick(); pages.push(render());
    next().props.onClick(); pages.push(render());
    const html = pages.map((t) => rawHtml(t).join(' ')).join(' ');
    const views = html.match(/<span class="view">/g) ?? [];
    assert.ok(views.length > 0, '正文须有图片浮层');
    const xs = html.match(/data-pop-x/g) ?? [];
    assert.equal(xs.length, views.length, '每 view 恰一枚 ×（多是重复、少是遗漏）：view ' + views.length + ' vs × ' + xs.length);
    const inside = html.match(/<span class="view"><img[^>]*><span class="x" data-pop-x[^>]*>×<\/span><\/span>/g) ?? [];
    assert.equal(inside.length, views.length, '× 须在自家 view 里图后（CSS 与键鼠委托只认这一巢，错位即永藏）');
    // 冻结原文保持 × 在 view 外 —— 归位是渲染层的事；若日后重冻把 × 收进 view，withShotClose 即多余（本条会红，删它）。
    // 注：直接拼步骤串（不经 JSON.stringify，避免转义干扰子串判定）。
    const { SCENES } = await import('../dist/manual-content.js');
    const rawSteps = SCENES.flatMap((s) => s.steps ?? []).join(' ');
    assert.ok(rawSteps.includes('</span><span class="x"'), '冻结原文保持 × 在 view 外（归位归渲染层）');
    const CLIENT_SRC = readFileSync(join(HERE, '..', 'src', 'client.ts'), 'utf8');
    assert.ok(CLIENT_SRC.includes("const x = at('[data-pop-x]')"), '点 × 即收须走显式分支（不靠兜底穿透）');
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
