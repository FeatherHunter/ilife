// #743 六家设置页四处整改的跨包锁（跨包面照 test/panel-type-739.test.mjs 的写法：读源码 ＋ 读各家 dist）。
//
// #758 起锁八件事，前五件是 #743 立的，后三件是六家收窄的同形面。
//
// **#909 把六家设置页本体收进共用件 `dsh-life-pack/config-panel` 之后，本文件的判据对象改了指向**
// （#910）：样式表、行渲染 `Row`、目录回执解包都只有一份源码了，六家 `src/client.ts` 里不再有它们。
// 改指向的语义按 #907《Testing Decisions · 缝二》办：
//   · ⑤「六家样式表逐项同形」→ 断言**共用件里只有一份**（原本是拿六份源码互比；六家已经没有样式表，
//     互比只会比出「六家都没有」，那不是这条判据要守的性质）；
//   · ①③④ 同属这一批（它们读的对象随收件一起搬进了共用件）；
//   · ⑦⑧ 从**共用件产物**（公开门 `dsh-life-pack/config-panel`）里取 `Row` 当函数调；
//   · 三条「六家产物仍接上了」的断言留在 ⑨，与各家 `test/config-surface-*` 的接入面判据同向。
//
// 收进来的八件事：
//   ① 头部两行（配置文件／数据目录）间距：`info` 条目一律不写 `margin`
//      （改前 {记账／卡路里／备忘录} 写了 `margin: '6px 0 0'`，{大厨／居家／作息} 没写，六家同形面破了）；
//   ② 行文案有界：每条 hint 最多两句、不超过 40 字、不出现开发期口径词（「改造前」「落点」）——仍读各家行表；
//   ③ 目录行的落点来源只给技能算好的那个绝对路径：`db.dir` 必须标 `prefillFrom: 'dataDir'`；
//      其余标了的行只许是登记在 PRE_FILL_ALLOWED 里的目录行（#909 把 `prefillResolved` 并进 `prefillFrom`
//      之后，卡路里的照片目录与备忘的附件目录也在这条上）；
//   ④ 目录选择的回执只经 `readPickAnswer` 解——函数体只有一份（共用件），六家只留 `pick()` 的信封声明；
//   ⑤ 样式表**只有一份**：共用件 `src/config-panel-view.ts` 的 `const S = { … }` 里，同一个样式项
//      只有一条定义（改前是六份源码逐字互比：`row` 一边 `marginTop: 10` 一边 `marginBottom: 10`）；
//   ⑥（#758）每家可改的行只有定稿允许的那几行：记账 1（数据目录）／卡路里 3
//      （数据目录／照片目录／训记 KEY）／备忘 2（数据目录／附件目录）／作息 1／居家 1／大厨 1；
//      行数同步钉死：6／11／4／3／5／4——仍读各家行表；
//   ⑦（#758）只读行的目录入口：只读目录行**一枚浏览按钮都不画**（#747 定稿 v3 ①：不摆点了也没反应的
//      死按钮）；可改目录行照旧恰一枚（#743 改前是「保留但不可点击」）；
//   ⑧（#758）控件文案不含省略号：共用件源码与产物零 `…`；各行标题与 hint 零 `…` 与 `...`；
//      目录行两档按钮字面合一为「浏览文件夹」且无省略号；
//   ⑨（#910）六家产物仍接上了：各自 `dist/client.js` 里那枚页签注册仍在、行表仍从各自的设置页元数据来
//      （`items` 与各家 `dist/index.js` 的 `CONFIG_ITEMS` 同源），且各家客户端仍只从公开门取共用件。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadClientBundle } from './helpers/client-bundle.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/** 六家单品插件包目录名（与总管那张图的六个页签一一对应）。 */
const PACKAGES = [
  'plugin-bill-ilife',
  'plugin-calorie',
  'plugin-chef',
  'plugin-home-ilife',
  'plugin-memo-ilife',
  'plugin-schedule-ilife',
];

const readSrc = (pkg, file) => readFileSync(join(REPO, 'packages', pkg, 'src', file), 'utf8');

/** 共用件（总管包）的源码与产物：样式表、行渲染、目录回执解包如今只有这一份。 */
const SHARED_DIR = join(REPO, 'packages', 'plugin-manager');
const SHARED_VIEW = join(SHARED_DIR, 'src', 'config-panel-view.ts');
const SHARED_PANEL = join(SHARED_DIR, 'src', 'config-panel.ts');
/** 六家取共用件走的那一道公开门（`package.json` 的 exports 键 `./config-panel`）。 */
const SHARED_ENTRY = join(SHARED_DIR, 'dist', 'config-panel-api.js');

/** 共用件的公开门：先构建再跑（`node node_modules/typescript/bin/tsc -b packages/plugin-manager` ⇒ 产物）。 */
let sharedEntry = null;
async function loadSharedEntry() {
  if (sharedEntry === null) {
    sharedEntry = await import(pathToFileURL(SHARED_ENTRY).href);
  }
  return sharedEntry;
}

/** 取出某个样式项的条目正文（`name: { … }` 里的 `…`；条目是平铺对象，无嵌套花括号）。 */
function entryBody(source, name) {
  const m = new RegExp('(?:^|\\n)\\s*' + name + ':\\s*\\{([\\s\\S]*?)\\}', 'm').exec(source);
  return m === null ? null : m[1];
}

/** 取出整张样式表（`const S = { … }`）里的全部 `name: { … }` 条目，键＝样式项名。 */
function styleEntries(source) {
  const start = source.indexOf('const S = {');
  assert.ok(start >= 0, '源码里找不到样式表 const S = {');
  const end = source.indexOf('\n};', start);
  assert.ok(end > start, '样式表没有收尾的 };');
  const entries = new Map();
  for (const m of source.slice(start, end).matchAll(/^\s*([A-Za-z]+):\s*\{([^}]*)\}/gm)) entries.set(m[1], m[2]);
  assert.ok(entries.size > 0, '样式表里一个条目都没取到');
  return entries;
}

/** 同一个样式项名在源码里出现了几次（⑤ 的「只有一份」就是这一格等于 1）。 */
function countEntryDefinitions(source, name) {
  return [...source.matchAll(new RegExp('(?:^|\\n)\\s*' + name + ':\\s*\\{', 'gm'))].length;
}

/* ═══ 读那棵树的小工具（两套，按树是谁造的选） ═══
   共用件产物出的是**真 React** 元素：子节点住在 `props.children`（子节点为数组时原样是数组），
   所以 `helpers/client-bundle.mjs` 那套替身遍历（读 `node.children`）读不到它；六家产物出的是
   替身 `createElement` 造的树，那套照旧可用。这里给共用件那一档补一对同语义的读写器。 */
function sharedDescendants(tree, out = []) {
  if (tree === null || tree === undefined || typeof tree !== 'object') return out;
  if (Array.isArray(tree)) {
    for (const child of tree) sharedDescendants(child, out);
    return out;
  }
  if (typeof tree.type !== 'string') return out; // 只走下去宿主元素那几层（组件这一档不展开）
  out.push(tree);
  sharedDescendants(tree.props?.children ?? tree.children, out);
  return out;
}
const sharedNodesOfType = (tree, type) => sharedDescendants(tree).filter((n) => n.type === type);
function sharedTextOf(tree) {
  let text = '';
  const walk = (node) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string' || typeof node === 'number') { text += node; return; }
    if (Array.isArray(node)) { for (const child of node) walk(child); return; }
    if (typeof node !== 'object') return;
    walk(node.props?.children ?? node.children);
  };
  walk(tree);
  return text;
}

/** 各家 dist 的行表（hint 与 prefillFrom 的权威读数）。 */
const ITEMS = new Map();
for (const pkg of PACKAGES) {
  const mod = await import(new URL(`../packages/${pkg}/dist/index.js`, import.meta.url));
  ITEMS.set(pkg, mod.CONFIG_ITEMS);
}

describe('#743 六家设置页：间距一致 · 文案有界 · 数据目录预填 · 回执按信封解 · 样式表只有一份', () => {
  it('① 头部两行的间距不一家一个数：`info` 条目一律不写 margin（间距由标题与下方块决定）', () => {
    const body = entryBody(readFileSync(SHARED_VIEW, 'utf8'), 'info');
    assert.ok(body !== null, '共用件的样式表里少了样式项 info');
    assert.doesNotMatch(body, /margin/, 'info 写了 margin：' + body.trim());
  });

  it('② 行文案有界：每条 hint ≤2 句、≤40 字、零开发期口径词', () => {
    const BANNED = ['改造前', '落点', '施工', '重构'];
    for (const pkg of PACKAGES) {
      for (const item of ITEMS.get(pkg)) {
        const hint = item.hint;
        assert.equal(typeof hint, 'string');
        assert.ok(hint.trim().length > 0, `${pkg} ${item.key} 缺 hint`);
        const sentences = (hint.match(/[。！？]/g) ?? []).length;
        assert.ok(sentences <= 2, `${pkg} ${item.key} 的 hint 超过两句（${sentences}）：${hint}`);
        assert.ok(hint.length <= 40, `${pkg} ${item.key} 的 hint 超过 40 字（${hint.length}）：${hint}`);
        for (const word of BANNED) {
          assert.ok(!hint.includes(word), `${pkg} ${item.key} 的 hint 带了开发期口径词「${word}」：${hint}`);
        }
      }
    }
  });

  it('③ `db.dir` 那行标了 prefillFrom: dataDir，其余标了的只许是登记过的目录行', () => {
    /** 登记表：可改的目录行按定稿各自标哪一格（#909 把 `prefillResolved` 并进 `prefillFrom` 之后新增两条）。 */
    const PRE_FILL_ALLOWED = new Map([
      ['plugin-bill-ilife', []],
      ['plugin-calorie', ['photos.dir']],
      ['plugin-memo-ilife', ['media.dir']],
      ['plugin-schedule-ilife', []],
      ['plugin-home-ilife', []],
      ['plugin-chef', []],
    ]);
    for (const pkg of PACKAGES) {
      const items = ITEMS.get(pkg);
      const dir = items.find((i) => i.key === 'db.dir');
      assert.ok(dir !== undefined, pkg + ' 少了 db.dir 行');
      assert.equal(dir.prefillFrom, 'dataDir', pkg + ' 的 db.dir 没标 prefillFrom= dataDir');
      assert.equal(dir.control, 'directory', pkg + ' 的 db.dir 应是目录档');
      const others = items
        .filter((i) => i.key !== 'db.dir' && i.prefillFrom !== undefined)
        .map((i) => i.key)
        .sort();
      assert.deepEqual(others, PRE_FILL_ALLOWED.get(pkg), pkg + ' 标了落点来源的行与登记表不符');
    }
  });

  it('④ 目录选择回执只经共用件的 readPickAnswer 解（六家只留 pick() 的信封声明）', () => {
    // 解包只有一份（共用件）：它把 `picker.pick()` 的返回值交给 readPickAnswer，且不直接吃裸值。
    const sharedPanel = readFileSync(SHARED_PANEL, 'utf8');
    assert.match(sharedPanel, /return readPickAnswer\(await picker\.pick\(\)\);/,
      '共用件没把 pick() 的返回值交给 readPickAnswer');
    assert.doesNotMatch(sharedPanel, /const picked = await picker\.pick\(\);/,
      '共用件仍直接吃 pick() 的裸值（#743 的缺陷样子）');
    // 六家那边剩下的只剩「这条通道回的是信封」这一格声明（各家自己的取数接线，不进共用件）。
    for (const pkg of PACKAGES) {
      assert.match(readSrc(pkg, 'dsh-ctx.ts'), /pick\(\): Promise<DirectoryPickerAnswer>/,
        pkg + ' 的 DirectoryPickerFace.pick 没声明成信封回执');
    }
  });

  it('⑤ 样式表只有一份：共用件里同一个样式项只有一条定义（六家源码里已不再有样式表）', () => {
    const shared = readFileSync(SHARED_VIEW, 'utf8');
    const entries = styleEntries(shared);
    assert.ok(entries.size >= 20, '共用件样式表条目数偏少（收到只剩 ' + entries.size + ' 条）：' + [...entries.keys()].join('／'));
    for (const key of entries.keys()) {
      assert.equal(countEntryDefinitions(shared, key), 1, '样式项 ' + key + ' 在共用件里不止一条定义（「只有一份」破）');
    }
    // 语义从「六家互比」变成「只有一份」：六家源码里连样式表都不该再有。
    for (const pkg of PACKAGES) {
      const src = readSrc(pkg, 'client.ts');
      assert.equal(src.includes('const S = {'), false, pkg + ' 的 client.ts 里仍有自己的样式表');
    }
  });

  it('⑥（#758）每家可改的行只有定稿允许的那几行（行数同步钉死）', () => {
    /** 定稿出处：记账 #747／卡路里 #748／备忘 #759／作息 #761／居家 #793／大厨 #795。 */
    const EXPECTED_EDITABLE = new Map([
      ['plugin-bill-ilife', ['db.dir']],
      ['plugin-calorie', ['db.dir', 'photos.dir', 'xunji.key']],
      ['plugin-memo-ilife', ['db.dir', 'media.dir']],
      ['plugin-schedule-ilife', ['db.dir']],
      ['plugin-home-ilife', ['db.dir']],
      ['plugin-chef', ['db.dir']],
    ]);
    const EXPECTED_TOTAL = new Map([
      ['plugin-bill-ilife', 6],
      ['plugin-calorie', 11],
      ['plugin-memo-ilife', 4],
      ['plugin-schedule-ilife', 3],
      ['plugin-home-ilife', 5],
      ['plugin-chef', 4],
    ]);
    for (const pkg of PACKAGES) {
      const items = ITEMS.get(pkg);
      const editable = items.filter((i) => i.readonly !== true).map((i) => i.key);
      assert.deepEqual(editable, EXPECTED_EDITABLE.get(pkg), pkg + ' 可改行与定稿不符');
      assert.equal(items.length, EXPECTED_TOTAL.get(pkg), pkg + ' 行数与定稿不符');
      // 可改行之外的每一行都必须是只读（没有第三态）。
      for (const item of items) {
        if ((EXPECTED_EDITABLE.get(pkg) ?? []).includes(item.key)) {
          assert.notEqual(item.readonly, true, pkg + ' ' + item.key + ' 应可改');
        } else {
          assert.equal(item.readonly, true, pkg + ' ' + item.key + ' 应只读');
        }
      }
    }
  });

  it('⑦（#758）只读目录行零按钮、可改目录行恰一枚（拿共用件产物的 Row 当函数调）', async () => {
    /** 有只读目录行的家才列键；无的家列空数组——加一行只读目录不补按钮即红。 */
    const EXPECTED_READONLY_DIR = new Map([
      ['plugin-bill-ilife', ['backup.dir']],
      ['plugin-calorie', ['xunji.stateDir']],
      ['plugin-memo-ilife', []],
      ['plugin-schedule-ilife', []],
      ['plugin-home-ilife', ['backup.dir']],
      ['plugin-chef', []],
    ]);
    const { Row } = await loadSharedEntry();
    assert.equal(typeof Row, 'function', '共用件的公开门没有给出 Row（跨包锁无从下手）');
    /** 目录入口那一枚按钮（定稿 v3 ②起两档字面合一，叫「浏览文件夹」；每行另有一枚「复制」不是入口）。 */
    const browseButtonsOf = (node) => sharedNodesOfType(node, 'button').filter((b) => sharedTextOf(b) === '浏览文件夹');
    const render = (item, browser) => Row({
      item, value: 'C:\\探针\\只读目录', disabled: false, onChange: () => {}, browser,
    });
    for (const pkg of PACKAGES) {
      const items = ITEMS.get(pkg);
      const readonlyDir = items.filter((i) => i.readonly === true && i.control === 'directory');
      assert.deepEqual(readonlyDir.map((i) => i.key), EXPECTED_READONLY_DIR.get(pkg),
        pkg + ' 只读目录行名单与定稿不符');
      if (readonlyDir.length === 0) continue;
      for (const item of readonlyDir) {
        const node = render(item, { mode: 'browse', onOpen: () => {} });
        assert.equal(browseButtonsOf(node).length, 0, pkg + ' ' + item.key + ' 是非可改目录行，不该画目录入口按钮');
        const inputs = sharedNodesOfType(node, 'input');
        assert.equal(inputs.length, 1, pkg + ' ' + item.key + ' 应有一格输入框');
        assert.equal(inputs[0].props.disabled, true, pkg + ' ' + item.key + ' 的输入框须 disabled');
        assert.equal(inputs[0].props.onChange, undefined, pkg + ' ' + item.key + ' 不接 onChange');
      }
    }
    // 反向对照：可改目录行的目录入口照旧在（零按钮是针对**只读**那一档，不是把入口一刀切掉）。
    const editableDir = { key: 'db.dir', title: '数据目录', tier: 'common', control: 'directory', hint: '探针行。' };
    for (const mode of ['native', 'browse']) {
      const buttons = browseButtonsOf(render(editableDir, { mode, onOpen: () => {} }));
      assert.equal(buttons.length, 1, mode + ' 档的可改目录行应有恰一枚目录入口按钮');
      assert.equal(buttons[0].props.disabled, false, mode + ' 档的入口按钮应可点');
    }
    const noEntry = render(editableDir, { mode: 'none', onOpen: () => {} });
    assert.equal(browseButtonsOf(noEntry).length, 0, '入口供不了（none）时不画按钮、也不留死按钮');
  });

  it('⑧（#758）控件文案不含省略号（`…` 与 `...`）', async () => {
    // ① 源码面：共用件的两个视图件一个 `…` 都没有（`...` 是展开语法，不在此查，只查按钮字面）。
    for (const file of ['config-panel-view.ts', 'config-panel.ts']) {
      assert.doesNotMatch(readFileSync(join(SHARED_DIR, 'src', file), 'utf8'), /…/,
        file + ' 里的控件文案不得出现省略号');
    }
    // ② 行表面：标题与 hint 两个字面都不带省略号（各行行表仍住本包）。
    for (const pkg of PACKAGES) {
      for (const item of ITEMS.get(pkg)) {
        assert.doesNotMatch(item.title, /…|\.\.\./, pkg + ' ' + item.key + ' 的标题带省略号');
        assert.doesNotMatch(item.hint, /…|\.\.\./, pkg + ' ' + item.key + ' 的 hint 带省略号');
      }
    }
    // ③ 按钮面：两档合一为「浏览文件夹」，且无省略号。
    const { Row } = await loadSharedEntry();
    const dirItem = { key: 'db.dir', title: '数据目录', tier: 'common', control: 'directory', hint: '探针行。' };
    for (const [mode, want] of [['native', '浏览文件夹'], ['browse', '浏览文件夹']]) {
      const node = Row({
        item: dirItem, value: 'D:\\探针', disabled: false, onChange: () => {},
        browser: { mode, onOpen: () => {} },
      });
      const buttons = sharedNodesOfType(node, 'button').filter((b) => sharedTextOf(b) === want);
      assert.equal(buttons.length, 1, mode + ' 档应有一枚目录按钮');
      const label = sharedTextOf(buttons[0]);
      assert.equal(label, want, mode + ' 档按钮文案应是「' + want + '」');
      assert.doesNotMatch(label, /…|\.\.\./, mode + ' 档按钮文案带省略号');
    }
    // 反向对照：两档合一之后，旧的两种字面不该再出现。
    const nativeNode = Row({
      item: dirItem, value: 'D:\\探针', disabled: false, onChange: () => {},
      browser: { mode: 'native', onOpen: () => {} },
    });
    const labels = sharedNodesOfType(nativeNode, 'button').map(sharedTextOf);
    for (const old of ['选择文件夹', '浏览']) {
      assert.equal(labels.includes(old), false, '两档字面已合一，不该再有「' + old + '」');
    }
  });

  it('⑨（#910）六家产物仍接上了：页签注册仍在、行表仍从各自的设置页元数据来', async () => {
    for (const pkg of PACKAGES) {
      // ① 客户端仍只从公开门取共用件（deep-import 由 plugin-manager 侧的守卫另锁）。
      assert.match(readSrc(pkg, 'client.ts'), /from 'dsh-life-pack\/config-panel'/,
        pkg + ' 的 client.ts 不再从共用件公开门取设置页组件');
      // ② 产物里那枚页签注册仍在，且交出去的行表与自家 `dist/index.js` 的 `CONFIG_ITEMS` 同源。
      const { exports } = loadClientBundle(join(REPO, 'packages', pkg));
      assert.equal(typeof exports.apply, 'function', pkg + ' 的 client 束缺 apply（进不去页签槽）');
      let seen = null;
      exports.apply({
        slots: {
          inject: (_key, callback) => { callback(); return () => {}; },
          register: (options, component) => { seen = { options, component }; return () => {}; },
        },
        connection: { rpc: { call: () => {} } },
        effect: (fn) => { const dispose = fn(); if (typeof dispose === 'function') dispose(); },
      });
      assert.notEqual(seen, null, pkg + ' 没把设置页注册进爱生活页签槽');
      assert.equal(seen.options.name, 'ilife.config-tab', pkg + ' 注册的槽名不对');
      const element = seen.component({});
      assert.deepEqual([...element.props.items], [...ITEMS.get(pkg)],
        pkg + ' 交给面板的行表不是自家设置页元数据那一份');
    }
  });
});
