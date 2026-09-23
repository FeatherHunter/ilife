// 票 #908 · 共用配置面板的自证回路（**只咬外部行为**：渲染出哪些行、每行什么控件、按钮字面是什么、
// 点下去交给谁；不断言状态变量叫什么、样式表有几项）。
//
// 读法照 `directory-browser-744.test.mjs` 的既有作法：先构建再跑，从**编译出的产物**读——
// 公开门读 `dist/config-panel-api.js`（六家取用的就是这一条子路径），内部两半读
// `dist/config-panel-value.js` 与 `dist/config-panel-view.js`。
//
// 先构建再跑：
//   node node_modules/typescript/bin/tsc -b packages/plugin-manager
//
// 咬到的票面：#908 的五条验收判据，加三条 v3 定稿（只读行零浏览按钮／按钮字面「浏览文件夹」／每行一枚复制）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 公开门（六家取用的那一条子路径）。 */
const gate = await import('../dist/config-panel-api.js');
/** 取值与填值半（内部实现：本件只在这里读它，外面取不到）。 */
const value = await import('../dist/config-panel-value.js');
/** 视图半（内部实现）。 */
const view = await import('../dist/config-panel-view.js');
/** 契约半（常量面）。 */
const contract = await import('../dist/config-panel-contract.js');

const { ConfigPanel, Row } = gate;
const { toDraft, fromDraft, dirtyKeysOf, humanizeConfigFailure, fetchConfigSurface, saveConfigSurface } = value;
const { PanelBody, copyLabelOf } = view;

/* ═══ 读那棵树的小工具（不碰 DOM：组件都是纯函数，当普通函数调就行） ═══ */

/** 把函数组件当普通函数调开，得到一棵只有宿主元素的树（React 的 createElement 只存 props，
 *  函数组件要调一次才看得到它画了什么；它们都是纯函数，所以这里调得干净）。 */
function expand(tree) {
  if (tree === null || tree === undefined || typeof tree === 'boolean') return null;
  if (typeof tree === 'string' || typeof tree === 'number') return tree;
  if (Array.isArray(tree)) return tree.map(expand);
  if (typeof tree === 'object' && tree.props !== undefined) {
    if (typeof tree.type === 'function') return expand(tree.type(tree.props));
    return { type: tree.type, props: { ...tree.props, children: expand(tree.props.children) } };
  }
  return tree;
}

/** 摊平一棵元素树里的全部元素节点（字符串／数字不算节点）。 */
function nodes(tree, out = []) {
  const flat = expand(tree);
  const walk = (node) => {
    if (node === null || node === undefined || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (node.props !== undefined) {
      out.push(node);
      walk(node.props.children);
    }
  };
  walk(flat);
  return out;
}

/** 某一类宿主元素（`button`／`input`／`div`…）。 */
const ofType = (tree, type) => nodes(tree).filter((n) => n.type === type);

/** 一棵子树里的全部可见文本（文字节点 ＋ 数字，按深度优先拼起来）。 */
function textOf(tree) {
  const raw = (node) => {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(raw).join('');
    if (typeof node === 'object' && node.props !== undefined) return raw(node.props.children);
    return '';
  };
  return raw(expand(tree));
}

/** 字面恰是 `label` 的按钮。 */
const buttons = (tree) => ofType(tree, 'button');
const buttonWith = (tree, label) => buttons(tree).find((b) => textOf(b) === label);

/* ═══ 现场：一张与六家同形的行表（四支控件、只读行、只读目录行都在） ═══ */

const ITEMS = [
  { key: 'db.dir', title: '数据目录', tier: 'common', control: 'directory', prefillFrom: 'dataDir', hint: '库文件与备份的根目录。留空＝用默认目录。' },
  { key: 'photos.dir', title: '照片目录', tier: 'common', control: 'directory', prefillFrom: 'photosDir', hint: '身材照与进度图的存放目录。' },
  { key: 'xunji.key', title: '训记 KEY', tier: 'common', control: 'text', hint: '调用训记接口用的口令。' },
  { key: 'db.name', title: '库文件名', tier: 'common', control: 'text', readonly: true, resolveFrom: 'dbFile', hint: '数据目录下的库文件。' },
  { key: 'xunji.timeout', title: '训记调用限时（秒）', tier: 'advanced', control: 'number', hint: '一次调用最多等多久。' },
  { key: 'ui.pin', title: '钉住面板', tier: 'advanced', control: 'switch', hint: '打开设置页时钉住不收起。' },
  { key: 'backup.dir', title: '备份目录', tier: 'advanced', control: 'directory', readonly: true, resolveFrom: 'backupDir', hint: '备份与恢复的读写目录。' },
];

const SURFACE = {
  path: 'C:\\Users\\me\\.ilife\\bill.yaml',
  dataDir: 'C:\\Users\\me\\.ilife',
  created: false,
  values: { db: { dir: '' }, photos: { dir: '' }, xunji: { key: 'k-1', timeout: 30 }, ui: { pin: true } },
  resolved: {
    dbDir: 'C:\\Users\\me\\.ilife',
    photosDir: 'C:\\Users\\me\\.ilife\\photos',
    dbFile: 'C:\\Users\\me\\.ilife\\bill.db',
    backupDir: 'C:\\Users\\me\\.ilife\\backup',
  },
};

/** 一行目录入口（三态由调用方给）。 */
const entryOf = (mode) => (mode === 'none' ? null : { mode, onOpen: () => undefined });

/** 把视图半的 props 补齐到「就绪」态的那一份。 */
function bodyProps(over = {}) {
  const draft = toDraft(ITEMS, SURFACE.values, SURFACE);
  return {
    title: '探针产品名',
    items: ITEMS,
    state: { kind: 'ready', surface: SURFACE },
    draft,
    busy: false,
    notice: null,
    writeError: null,
    error: null,
    picking: false,
    browseRow: null,
    rowEntry: entryOf('browse'),
    dirtyKeys: [],
    followKeys: [],
    copy: null,
    onCopy: () => {},
    onChange: () => {},
    onSave: () => {},
    onReset: () => {},
    onRetry: () => {},
    ...over,
  };
}

describe('#908 共用配置面板：出口面', () => {
  it('出口对外给的名字就是那五个（运行时两个值 ＋ 源码面三个类型）', () => {
    // 运行时：类型不进模块表，所以这里只该看到那两个值。
    assert.deepEqual(Object.keys(gate).sort(), ['ConfigPanel', 'Row'], '出口多给了或少给了值名');

    // 源码面：把「对外给的名字」一个个数出来（值名与类型名一起数）。
    const src = readFileSync(join(PKG, 'src', 'config-panel-api.ts'), 'utf8');
    const names = new Set();
    for (const m of src.matchAll(/^export (?:type )?\{([^}]*)\}/gm)) {
      for (const piece of m[1].split(',')) {
        const name = piece.trim();
        if (name !== '') names.add(name);
      }
    }
    assert.deepEqual(
      [...names].sort(),
      ['ConfigControl', 'ConfigItem', 'ConfigPanel', 'ConfigTier', 'Row'],
      '出口对外给的名字不是那五个：' + [...names].join('、'),
    );
    assert.ok(names.size <= 5, '出口对外给的名字超过五个：' + names.size);
  });

  it('取值／填值的路径读写不在出口上（它们只经取值／填值两条被验）', () => {
    for (const hidden of ['readPath', 'writePath', 'toDraft', 'fromDraft', 'fetchConfigSurface']) {
      assert.equal(gate[hidden], undefined, '出口漏出了内部实现：' + hidden);
    }
  });

  it('面板组件本体与行渲染都是函数（跨包锁要拿 Row 当函数调）', () => {
    assert.equal(typeof ConfigPanel, 'function');
    assert.equal(typeof Row, 'function');
  });
});

describe('#908 取值与填值：只读行显示绝对值 · 可改行空值显示落点 · 保存只交真能改的行', () => {
  it('只读行显示技能算好的绝对值（resolveFrom 指哪一格就显示哪一格）', () => {
    const draft = toDraft(ITEMS, SURFACE.values, SURFACE);
    assert.equal(draft['db.name'], 'C:\\Users\\me\\.ilife\\bill.db');
    assert.equal(draft['backup.dir'], 'C:\\Users\\me\\.ilife\\backup');
  });

  it('只读行缺那一格就显示空串（绝不编一条路径出来）', () => {
    const bare = { dataDir: 'D:\\d', values: { db: { name: 'bill.db' } } };
    const draft = toDraft(ITEMS, bare.values, bare);
    assert.equal(draft['db.name'], '', '回执缺 resolved 组时只读行须是空串');
    assert.equal(draft['backup.dir'], '');
  });

  it('可改行取值空着时显示落点（顶层那一格与 resolved 组那一格都认）', () => {
    const draft = toDraft(ITEMS, SURFACE.values, SURFACE);
    assert.equal(draft['db.dir'], 'C:\\Users\\me\\.ilife', 'db.dir 空着应显示 dataDir');
    assert.equal(draft['photos.dir'], 'C:\\Users\\me\\.ilife\\photos', 'photos.dir 空着应显示 resolved 那一格');
  });

  it('可改行有值时显示原值（不被落点盖掉）', () => {
    const draft = toDraft(ITEMS, { db: { dir: 'D:\\我的库' } }, SURFACE);
    assert.equal(draft['db.dir'], 'D:\\我的库');
  });

  it('保存只提交可改行：只读行的键一个字都不进去', () => {
    const draft = toDraft(ITEMS, SURFACE.values, SURFACE);
    const values = fromDraft(ITEMS, draft);
    const keys = JSON.stringify(values);
    assert.ok(keys.includes('db') && keys.includes('dir'), '可改行没进提交面');
    assert.ok(!keys.includes('bill.db'), '只读行的显示值被当成配置值写回去了');
    assert.ok(!keys.includes('backup'), '只读行（备份目录）被提交了');
  });

  it('填值按控件种类还原类型（数字／布尔／文本各自成形状）', () => {
    const values = fromDraft(ITEMS, { 'xunji.timeout': '45', 'ui.pin': 'false', 'xunji.key': 'k-9' });
    assert.equal(value.readPath(values, 'xunji.timeout'), 45);
    assert.equal(value.readPath(values, 'ui.pin'), false);
    assert.equal(value.readPath(values, 'xunji.key'), 'k-9');
  });

  it('填值的数字填不成数字时落 0（不产生 NaN 写进配置文件）', () => {
    const values = fromDraft(ITEMS, { 'xunji.timeout': '不是数' });
    assert.equal(value.readPath(values, 'xunji.timeout'), 0);
    assert.ok(!JSON.stringify(values).includes('null'), '缺项不该变成 null');
  });
});

describe('#908 脏基线：只看可改行', () => {
  it('只读行显示值与整面不同，不算「改动」', () => {
    const baseline = toDraft(ITEMS, SURFACE.values, SURFACE);
    const draft = { ...baseline, 'db.name': '被改过的显示值', 'backup.dir': '' };
    assert.deepEqual(dirtyKeysOf(ITEMS, draft, baseline), [], '只读行不得进脏基线');
  });

  it('可改行与整面不同就是脏，键按行表顺序给出来', () => {
    const baseline = toDraft(ITEMS, SURFACE.values, SURFACE);
    const draft = { ...baseline, 'xunji.key': 'k-2', 'db.dir': 'D:\\新库' };
    assert.deepEqual(dirtyKeysOf(ITEMS, draft, baseline), ['db.dir', 'xunji.key']);
  });
});

describe('#908 一行怎么画：四支控件与 v3 定稿三条', () => {
  const rowOf = (key, over = {}) => {
    const item = ITEMS.find((i) => i.key === key);
    const draft = toDraft(ITEMS, SURFACE.values, SURFACE);
    return Row({ item, value: draft[key] ?? '', disabled: false, onChange: () => {}, onCopy: () => {}, ...over });
  };

  it('四支控件各自画成什么：文本／数字／布尔／目录', () => {
    assert.equal(ofType(rowOf('xunji.key'), 'input')[0].props.type, 'text');
    assert.equal(ofType(rowOf('xunji.timeout'), 'input')[0].props.type, 'number');
    assert.equal(ofType(rowOf('ui.pin'), 'input')[0].props.type, 'checkbox');
    assert.equal(ofType(rowOf('db.dir'), 'input')[0].props.type, 'text', '目录档的取值仍是串');
  });

  it('v3 ②：目录行按钮字面两档合一，一律「浏览文件夹」', () => {
    for (const mode of ['native', 'browse']) {
      const btn = buttonWith(rowOf('db.dir', { browser: entryOf(mode) }), '浏览文件夹');
      assert.ok(btn !== undefined, mode + ' 档应有一枚「浏览文件夹」按钮');
      assert.equal(btn.props.disabled, false);
    }
    for (const label of ['选择文件夹', '浏览']) {
      assert.equal(buttonWith(rowOf('db.dir', { browser: entryOf('native') }), label), undefined,
        '两档字面应合一，不该再有「' + label + '」');
    }
  });

  it('目录入口供不了就不画按钮（收起入口，不是失败）', () => {
    for (const browser of [null, entryOf('none'), undefined]) {
      assert.equal(buttonWith(rowOf('db.dir', { browser }), '浏览文件夹'), undefined, '供不了时那枚按钮不该在');
      assert.equal(ofType(rowOf('db.dir', { browser }), 'input').length, 1, '文本框照旧');
    }
  });

  /* ═══ #920 改判两条（票面「与本票冲突的既有断言按新形状改判并写明理由」）═══
     改判理由：#920 阶段二把只读行的行模板照 v3.1 的 `rowShell` 换掉——只读行＝**标签—值同行**，
     值是一段文本而不是一格 disabled 输入框。老断言咬的是「有一格 disabled 的输入框」，那是**老形状**
     的记号；同一件性质（「这一行用户改不动」）在 v3.1 的形状里由「压根没有可改控件」给出。
     判据一件不删：见下图两条，零目录入口、零输入框、值原样上屏三条都在。 */

  it('v3 ①（#920 改判）：只读目录行一枚浏览按钮都不画，也没有可改控件', () => {
    const tree = rowOf('backup.dir', { browser: entryOf('native'), value: 'C:\\探针\\只读目录' });
    const browse = buttons(tree).filter((b) => textOf(b) === '浏览文件夹');
    assert.deepEqual(browse, [], '只读目录行不该有浏览按钮');
    assert.deepEqual(ofType(tree, 'input'), [], '只读行不该画输入框（v3.1 的只读行是标签—值同行）');
    assert.match(textOf(tree), /C:\\探针\\只读目录/, '只读行的值要原样上屏（且不截断）');
  });

  it('只读行（非目录）同样没有可改控件（#920 改判）', () => {
    const tree = rowOf('db.name');
    assert.deepEqual(ofType(tree, 'input'), [], '只读行不该画输入框');
    assert.equal(buttonWith(tree, '浏览文件夹'), undefined, '只读行不该有目录入口');
    assert.equal(textOf(tree), '库文件名' + 'C:\\Users\\me\\.ilife\\bill.db' + '复制', '只读行＝标签＋值＋那枚复制');
  });

  it('v3 ③：每一行都有一枚「复制」，字面随回执走', () => {
    const copyTexts = new Set(['复制', '已复制', '复制失败']);
    for (const item of ITEMS) {
      const tree = Row({ item, value: 'v', disabled: false, onChange: () => {}, onCopy: () => {} });
      assert.equal(buttons(tree).filter((b) => copyTexts.has(textOf(b))).length, 1,
        item.key + ' 应恰有一枚复制按钮');
    }
    assert.equal(copyLabelOf(undefined), '复制');
    assert.equal(copyLabelOf('idle'), '复制');
    assert.equal(copyLabelOf('done'), '已复制');
    assert.equal(copyLabelOf('failed'), '复制失败');
    assert.equal(textOf(buttonWith(rowOf('db.dir', { copyState: 'done' }), '已复制')), '已复制');
    assert.equal(textOf(buttonWith(rowOf('db.dir', { copyState: 'failed' }), '复制失败')), '复制失败');
    // 不给 onCopy（别的调用点漏交）：按钮改成点不动，而不是点了就炸。
    const noHandler = Row({ item: ITEMS[0], value: 'v', disabled: false, onChange: () => {} });
    const copyBtn = buttons(noHandler).find((b) => copyTexts.has(textOf(b)));
    assert.equal(copyBtn.props.disabled, true, '漏交 onCopy 时复制那枚应点不动');
  });

  it('v3 ③：点「复制」把这一行的值文本交出去（可改行交的是框里当刻那个值）', () => {
    const seen = [];
    for (const [key, browser] of [['db.dir', entryOf('browse')], ['db.name', null]]) {
      const tree = rowOf(key, { browser, value: 'C:\\交付\\这一行', onCopy: (k, text) => seen.push([k, text]) });
      buttonWith(tree, '复制').props.onClick();
    }
    assert.deepEqual(seen, [
      ['db.dir', 'C:\\交付\\这一行'],
      ['db.name', 'C:\\交付\\这一行'],
    ]);
  });

  it('脏行带记号（#920 改判）、跟随行给「将跟随更新」，两者都不给时都不画', () => {
    // #920 改判：v3.1 的脏记号**不是一行字**，而是输入框的注意力描边（`.ic-master input.is-dirty`：
    // 2px 琥珀描边 ＋ 3px 光晕，与 5→4 的内边距对消，宽高不变），字数那一档落在卡片标题行的徽标上。
    // 判据一件不删：老断言咬「脏行带记号」，这里改咬同一件性质的两个新落点（输入框那圈描边 ＋ 标题行徽标）。
    const dirtyInput = ofType(rowOf('db.dir', { dirty: true }), 'input')[0];
    assert.match(String(dirtyInput.props.style.border), /state-warn-primary/, '脏行的输入框没有注意力描边');
    assert.match(String(dirtyInput.props.style.boxShadow), /state-warn-primary/, '脏行的输入框没有那圈光晕');
    const cleanInput = ofType(rowOf('db.dir'), 'input')[0];
    assert.doesNotMatch(String(cleanInput.props.style.border), /state-warn-primary/, '不脏的行不该带注意力描边');
    assert.match(textOf(PanelBody(bodyProps({ dirtyKeys: ['db.dir'] }))), /1 项未保存/, '标题行徽标要报未保存数');
    assert.match(textOf(rowOf('backup.dir', { follow: true })), /将跟随更新/);
    assert.doesNotMatch(textOf(rowOf('db.dir')), /已改动|将跟随更新/);
  });

  it('控件文案零省略号（`…` 与 `...` 一个都不许出现）', () => {
    const texts = [];
    for (const item of ITEMS) {
      for (const browser of [entryOf('native'), entryOf('browse'), null]) {
        for (const copyState of ['idle', 'done', 'failed']) {
          texts.push(textOf(Row({ item, value: 'v', disabled: false, onChange: () => {}, browser, onCopy: () => {}, copyState, dirty: true, follow: true })));
        }
      }
    }
    for (const text of texts) assert.doesNotMatch(text, /…|\.\.\./, '控件文案出现省略号：' + text);
  });
});

/** 整面那张卡片的直接子节点（按画出来的先后）。 */
const kidsOf = (tree) => (Array.isArray(tree.props.children) ? tree.props.children : [tree.props.children]);
/** 动作条是哪一个子节点（它里面装着「保存／重置为默认／重新读取」那几枚）。 */
const barIndexIn = (tree) =>
  kidsOf(tree).findIndex((k) => k !== null && typeof k === 'object' && ofType(k, 'button').some((b) => textOf(b).startsWith('保存')));
/** 文本恰是 `label` 的那一个子节点在第几个。 */
const childIndexByTextIn = (tree, label) => kidsOf(tree).findIndex((k) => textOf(k) === label);

describe('#908 整面怎么画：三支错误落位与附加块槽', () => {
  it('支一 · 整面读不出来：一屏错误 ＋ 两枚按钮（重试／重置为默认），没有底栏那几枚', () => {
    const tree = PanelBody(bodyProps({ state: { kind: 'failed', message: '配置面读不出来：看下面那一句' } }));
    assert.match(textOf(tree), /配置面读不出来：看下面那一句/);
    assert.ok(buttonWith(tree, '重试') !== undefined, '失败那一屏要有「重试」');
    assert.ok(buttonWith(tree, '重置为默认') !== undefined, '失败那一屏要有「重置为默认」');
    for (const label of ['保存', '重新读取']) {
      assert.equal(buttonWith(tree, label), undefined, '失败那一屏不该有「' + label + '」');
    }
  });

  it('支二 · 写入失败：落在底栏那一支，与就地失败那一段分开摆、同时都在', () => {
    const tree = PanelBody(bodyProps({ writeError: '写入失败：磁盘只读', error: '打不开系统文件夹对话框' }));
    const text = textOf(tree);
    assert.match(text, /写入失败：磁盘只读/);
    assert.match(text, /打不开系统文件夹对话框/);
    const barIndex = barIndexIn(tree);
    const writeIndex = childIndexByTextIn(tree, '写入失败：磁盘只读');
    assert.ok(barIndex >= 0, '找不到动作条');
    assert.ok(writeIndex > barIndex, '写入失败那一段应落在动作条之后');
    const errorIndex = childIndexByTextIn(tree, '打不开系统文件夹对话框');
    assert.ok(errorIndex > barIndex, '就地失败那一段也落在动作条之后');
    assert.notEqual(writeIndex, errorIndex, '两支错误各占一处，不许合成同一段');
  });

  it('支三（#915 改判）· 写的值不等于默认落点时报什么都不出，判据本身也已删除', () => {
    // 维护者现场那一种（2026-09-23）：写的是存在且在用的自定义目录，回执顶层那一格是默认落点。
    // 老形状在这里画「配置里写的是 X；现在生效的是 Y」——那是面板替技能侧下的判断，删掉。
    const draft = { ...toDraft(ITEMS, SURFACE.values, SURFACE), 'db.dir': 'D:\\2Study\\StudyNotes\\.db' };
    const text = textOf(PanelBody(bodyProps({ draft })));
    assert.doesNotMatch(text, /现在生效的是/, '面板不许再说「现在生效的是 …」');
    assert.doesNotMatch(text, /配置里写的是/, '这一段整个不该再画');
    assert.equal(value.fallbackFactsOf, undefined, '判据要删掉（不是改文案）：面板不再持有它');
    assert.doesNotMatch(textOf(PanelBody(bodyProps())), /现在生效的是|配置里写的是/);
  });

  it('支零（#917 首帧）· 读取中就把整张框架画出来：行与控件数同就绪态，底栏三键都在但都点不动', () => {
    const loading = PanelBody(bodyProps({ state: { kind: 'loading' } }));
    const ready = PanelBody(bodyProps());
    const countOf = (tree, tag) => nodes(tree).filter((n) => n.type === tag).length;
    // 行表是客户端常量 ⇒ 输入框数／行数不必等回执（老形状：读取中一个控件都没有）。
    assert.equal(countOf(loading, 'input'), countOf(ready, 'input'), '读取中的输入框数应与就绪态一致');
    assert.ok(countOf(loading, 'input') > 0, '读取中至少要画出一行');
    for (const label of ['保存', '重置为默认', '重新读取']) {
      const button = buttonWith(loading, label);
      assert.ok(button !== undefined, '读取中也要有「' + label + '」');
      assert.equal(button.props.disabled, true, '读取中「' + label + '」必须点不动');
    }
    assert.match(textOf(loading), /配置读取中/, '框架之上仍要有一句读数提示');
    // 每行那枚「复制」照画（定稿 v3：每行一枚），但读取中一律点不动——不许时是禁用，不是不画。
    const copies = buttons(loading).filter((b) => textOf(b) === '复制');
    assert.ok(copies.length > 0, '读取中也要画出每行那枚「复制」');
    assert.ok(copies.every((b) => b.props.disabled === true), '读取中「复制」必须点不动');
  });

  it('附加块：画在面板主体之后、动作条之前，拿得到样式表与整面回执', () => {
    const seen = [];
    const tree = PanelBody(bodyProps({ extra: (parts) => { seen.push(parts); return { type: 'i', props: { children: '附加块探针' } }; } }));
    assert.equal(seen.length, 1, '附加块应恰被调一次');
    assert.equal(typeof seen[0].styles, 'object', '附加块拿得到面板的样式表');
    assert.equal(seen[0].reply, SURFACE, '就绪态时回执整面都在');
    const extraIndex = childIndexByTextIn(tree, '附加块探针');
    const barIndex = barIndexIn(tree);
    assert.ok(extraIndex >= 0, '附加块没画出来');
    assert.ok(barIndex >= 0, '找不到动作条');
    assert.ok(extraIndex < barIndex, '附加块要落在动作条之前');
  });

  it('附加块：读取中／读取失败时也在，回执那一格是 null', () => {
    for (const state of [{ kind: 'loading' }, { kind: 'failed', message: '读不出来' }]) {
      const seen = [];
      PanelBody(bodyProps({ state, extra: (parts) => { seen.push(parts); return null; } }));
      assert.equal(seen.length, 1, JSON.stringify(state) + ' 时附加块没被画');
      assert.equal(seen[0].reply, null, '还没读到整面时回执那一格应是 null');
    }
  });

  it('高级组按行表分级切开：没有高级项就不占那一行', () => {
    const common = PanelBody(bodyProps({ items: ITEMS.filter((i) => i.tier === 'common') }));
    assert.doesNotMatch(textOf(common), /高级/, '没有高级项时不该画那个分组');
    assert.match(textOf(PanelBody(bodyProps())), /高级/);
  });

  it('未保存计数与保存按钮字面跟着脏键走', () => {
    const clean = PanelBody(bodyProps());
    assert.equal(textOf(buttonWith(clean, '保存')), '保存');
    assert.equal(buttonWith(clean, '保存').props.disabled, true, '没有改动时保存那枚点不动');
    const dirty = PanelBody(bodyProps({ dirtyKeys: ['db.dir', 'xunji.key'] }));
    const save = buttonWith(dirty, '保存（2 项未保存）');
    assert.ok(save !== undefined, '有改动时保存那枚要带计数');
    assert.equal(save.props.disabled, false);
    assert.match(textOf(dirty), /2 项未保存/);
  });
});

describe('#908 配置面：人话报错四类 · 一次读不无限转圈', () => {
  it('四类报错各按类补一句「接下来怎么办」', () => {
    assert.match(humanizeConfigFailure('parse-error', '第 3 行解析不动'), /改回「键: 值」的写法/);
    assert.match(humanizeConfigFailure('unknown-key', '不认识这个键'), /删掉页面上没有的行/);
    assert.match(humanizeConfigFailure('type-mismatch', '类型对不上'), /按本页的控件形状填/);
    assert.match(humanizeConfigFailure('missing-cli', '技能出口缺席'), /先确认技能包已装好/);
    assert.match(humanizeConfigFailure('other', '别的错'), /改不动就点「重置为默认」/);
  });

  it('报文为空时如实说「宿主未给报文」，不编一句', () => {
    assert.match(humanizeConfigFailure('weird', '   '), /weird，宿主未给报文/);
  });

  it('取数口缺席：落一句人话，不抛（界面据此不转圈）', async () => {
    const r = await fetchConfigSurface(null, '/ilife-probe');
    assert.equal(r.ok, false);
    assert.match(r.message, /宿主连接缺席/);
  });

  it('信封不是 ok 信封 / 拒了 / 抛了：三种都落字，一个都不抛', async () => {
    const odd = await fetchConfigSurface(() => Promise.resolve({ nope: 1 }), '/ilife-probe');
    assert.match(odd.message, /回执信封异常/);

    const refused = await fetchConfigSurface(
      () => Promise.resolve({ ok: false, error: { code: 'unknown-key', message: '不认识这个键' } }),
      '/ilife-probe',
    );
    assert.match(refused.message, /删掉页面上没有的行/);

    const thrown = await fetchConfigSurface(() => Promise.reject(new Error('传输炸了')), '/ilife-probe');
    assert.match(thrown.message, /配置失败：传输炸了/);
  });

  it('保存与读取走的是同一条通道，靠端点名分发', async () => {
    const seen = [];
    const call = (base, channel, payload) => {
      seen.push([base, channel, payload.method]);
      return Promise.resolve({ ok: true, value: SURFACE });
    };
    await fetchConfigSurface(call, '/ilife-probe');
    await saveConfigSurface(call, '/ilife-probe', { 'db.dir': 'D:\\x' });
    assert.deepEqual(seen, [
      ['/api', 'ilife-probe', 'config.get'],
      ['/api', 'ilife-probe', 'config.save'],
    ]);
  });

  it('一次读有界：那一通电话与一个固定时限赛跑（超时落一句人话，界面不返空）', () => {
    const src = readFileSync(join(PKG, 'dist', 'config-panel-value.js'), 'utf8');
    assert.match(src, /AbortSignal\.timeout/, '取数没有时限');
    assert.match(src, /Promise\.race/, '取数没有与时限赛跑');
    assert.equal(contract.READ_TIMEOUT_MS, 20_000, '时限应是一个固定的数');
  });
});

describe('#908 共用件里不出现任何一个能力的名字', () => {
  it('源码面：六个包名／六种产品名／六个页签槽名一个都不出现', () => {
    const banned = [
      'dsh-bill-ilife', 'dsh-calorie', 'dsh-chef', 'dsh-home-ilife', 'dsh-schedule-ilife', 'dsh-memo-ilife',
      '饼干记账', '卡路里', '私家大厨', '居家管家', '作息管家', '备忘录',
      'ilife:cookie', 'ilife:calorie', 'ilife:chef', 'ilife:home', 'ilife:schedule', 'ilife:memo',
    ];
    const offenders = [];
    for (const file of readdirSync(join(PKG, 'src'))) {
      if (!/^config-panel.*\.ts$/.test(file)) continue;
      const text = readFileSync(join(PKG, 'src', file), 'utf8');
      for (const word of banned) if (text.includes(word)) offenders.push(file + ' → ' + word);
    }
    assert.deepEqual(offenders, [], '共用件里出现了能力的名字：' + offenders.join('；'));
  });

  it('产物面：编出来的那几份也不出现（转出与压缩都不该把名字带进来）', () => {
    const offenders = [];
    for (const file of readdirSync(join(PKG, 'dist'))) {
      if (!/^config-panel.*\.js$/.test(file)) continue;
      const text = readFileSync(join(PKG, 'dist', file), 'utf8');
      for (const word of ['dsh-bill-ilife', 'dsh-calorie', 'dsh-chef', 'dsh-home-ilife', 'dsh-schedule-ilife', 'dsh-memo-ilife']) {
        if (text.includes(word)) offenders.push(file + ' → ' + word);
      }
    }
    assert.deepEqual(offenders, [], '产物里出现了能力的名字：' + offenders.join('；'));
  });
});
