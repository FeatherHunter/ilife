// 票 #920 阶段二 · 共用配置面板照 v3.1 落地的**形状判据**（只咬形状：一行几件、按钮什么字、
// 底栏吸不吸底、徽标哪七档、换行交给谁；不断言内部实现怎么排、也不断言像素）。
//
// 外观真源＝`docs/agents/配置区域视觉模型-v3.1.html`（票面：「视觉真源只有一件」）。本件咬三类：
//   ① **形状对照**（票面验收第 2 条那几项）：只读行＝标签—值同行／行尾一枚复制／零输入框；
//      可改行＝标签＋「可改」徽标＋说明＋整行输入框＋「浏览文件夹」＋「复制」；高级组收起；
//      底栏三键贴下沿吸住；状态徽标那七档。
//   ② **样式表取值照抄**（票面验收第 3 条的地基）：把 v3.1 CSS 里那几处可判的取值逐项锚住
//      （间距／圆角／内边距／透明度／标签列定宽），并点名那十三条主题别名一个不少——
//      取值一改回老形状或自己配一个数，这里必红。
//   ③ **几何：换行不按字符数估宽**（票面验收第 4 条／审查 P0-4）：值列不许 `nowrap`／`ellipsis`／
//      `text-overflow`（那是「装不下就截断」那一族的记号），装不下要整行让位、交给排版引擎；
//      源码里也不许再出现「每列 6.048px × N 列」那类估宽算术。
//
// 读法照 `config-panel-908.test.mjs` 的既有作法：先构建再跑，从**编译出的产物**读——
//   node node_modules/typescript/bin/tsc -b packages/plugin-manager
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 视图半（内部实现：本件在包内读它）。 */
const view = await import('../dist/config-panel-view.js');
/** 取值半（搭一份行表草稿用，与 908 同一作法）。 */
const value = await import('../dist/config-panel-value.js');
/** 契约半（高级组那两行字面的唯一定义地）。 */
const contract = await import('../dist/config-panel-contract.js');
/** 组件本体半（`followerKeysOf` 那一处纯函数住在这里）。 */
const panel = await import('../dist/config-panel.js');

const { PanelBody, Row, panelBadgeOf, badgeTextOf, copyLabelOf } = view;
const { followerKeysOf } = panel;
const { toDraft } = value;
const ADVANCED_GROUP_TITLE = contract.ADVANCED_GROUP_TITLE;
const ADVANCED_GROUP_NOTE = contract.ADVANCED_GROUP_NOTE;

/** 视图半的源码：样式表取值与「按字符数估宽」那类痕迹都只在这里读得到。 */
const VIEW_SRC = readFileSync(join(PKG, 'src', 'config-panel-view.ts'), 'utf8');

/* ═══ 读那棵树的小工具（不碰 DOM：组件都是纯函数，当普通函数调就行） ═══ */

/** 把函数组件当普通函数调开，得到一棵只有宿主元素的树。 */
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

const ofType = (tree, type) => nodes(tree).filter((n) => n.type === type);
const buttons = (tree) => ofType(tree, 'button');
const buttonWith = (tree, label) => buttons(tree).find((b) => textOf(b) === label);

/** 一棵子树里的全部可见文本（按深度优先拼起来）。 */
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

/** 一个节点直接的那几个孩子（按画出来的先后）。 */
const kidsOf = (tree) => (Array.isArray(tree.props.children) ? tree.props.children : [tree.props.children]);

/** 动作条是哪一个节点（它里面装着「保存／重置为默认／重新读取」那三枚）。 */
const barOf = (tree) =>
  kidsOf(tree).find((k) => k !== null && typeof k === 'object' && ofType(k, 'button').some((b) => textOf(b).startsWith('保存')));

/** 某一行的那个盒子：只读行＝三件套（标签／值／动作槽）、可改行＝四件套（标签行／说明／控件／按钮行）
 *  ＋ 可选的第 5 件告警槽（#915 第二步：有告警才画，没告警是 `null` 占位——`createElement` 会把 `null` 留在
 *  `children` 里，所以这里按 3／4／5 件找，不按"非空孩子数"找）。 */
function rowBoxOf(tree, label) {
  return ofType(tree, 'div').find((d) => {
    const kids = Array.isArray(d.props.children) ? d.props.children : [d.props.children];
    if (kids.length !== 3 && kids.length !== 4 && kids.length !== 5) return false;
    return textOf(kids[0]) === label;
  });
}

/* ═══ 现场：与六家同形的一张行表 ═══ */

const ITEMS = [
  { key: 'db.dir', title: '数据目录', tier: 'common', control: 'directory', prefillFrom: 'dataDir', hint: '库文件与备份的根目录。留空＝用默认目录。' },
  { key: 'db.name', title: '库文件名', tier: 'common', control: 'text', readonly: true, resolveFrom: 'dbFile', hint: '数据目录下的库文件。' },
  { key: 'backup.dir', title: '备份目录', tier: 'advanced', control: 'directory', readonly: true, resolveFrom: 'backupDir', hint: '备份与恢复的读写目录。' },
];

const SURFACE = {
  path: 'C:\\Users\\me\\.ilife\\bill.yaml',
  dataDir: 'C:\\Users\\me\\.ilife',
  created: false,
  values: { db: { dir: '' } },
  resolved: { dbDir: 'C:\\Users\\me\\.ilife', dbFile: 'C:\\Users\\me\\.ilife\\bill.db', backupDir: 'C:\\Users\\me\\.ilife\\backup' },
};

/** 把视图半的 props 补齐到「就绪」态的那一份。 */
function bodyProps(over = {}) {
  return {
    title: '探针产品名',
    items: ITEMS,
    state: { kind: 'ready', surface: SURFACE },
    draft: toDraft(ITEMS, SURFACE.values, SURFACE),
    busy: false,
    notice: null,
    writeError: null,
    error: null,
    picking: false,
    browseRow: null,
    rowEntry: { mode: 'browse', onOpen: () => undefined },
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

/** 取一条只读行。 */
const readOnlyRow = (over = {}) =>
  Row({ item: ITEMS[1], value: 'C:\\Users\\me\\.ilife\\bill.db', disabled: false, onChange: () => {}, onCopy: () => {}, ...over });

/** 取一条可改行（目录档，入口给 browse）。 */
const masterRow = (over = {}) =>
  Row({
    item: ITEMS[0],
    value: 'C:\\Users\\me\\.ilife',
    disabled: false,
    onChange: () => {},
    onCopy: () => {},
    browser: { mode: 'browse', onOpen: () => undefined },
    ...over,
  });

/** 取某个样式项的条目正文（`name: { … }` 里的 `…`；条目是平铺对象，无嵌套花括号）。 */
function entryBody(source, name) {
  const m = new RegExp('(?:^|\\n)\\s*' + name + ':\\s*\\{([\\s\\S]*?)\\}', 'm').exec(source);
  assert.ok(m !== null, '共用件的样式表里少了样式项 ' + name);
  return m[1];
}

describe('#920 ① 只读行：标签—值同行 · 行尾一枚「复制」 · 零输入框', () => {
  it('就三件：标签／值／动作槽——值是一段文本，不是输入框', () => {
    const tree = readOnlyRow();
    const kids = kidsOf(tree);
    assert.equal(kids.length, 3, '只读行该恰有三件（v3.1 的 rowShell：标签／值／动作槽）');
    assert.equal(textOf(kids[0]), ITEMS[1].title, '第一件是标签');
    assert.equal(textOf(kids[1]), 'C:\\Users\\me\\.ilife\\bill.db', '第二件是值本身（同行、原样）');
    assert.deepEqual(ofType(tree, 'input'), [], '只读行不许画输入框');
  });

  it('那一行说明不再画在只读行里（v3.1 的 rowShell 里没有它）', () => {
    assert.doesNotMatch(textOf(readOnlyRow()), /数据目录下的库文件/);
  });

  it('行尾恰一枚「复制」，字面随回执走', () => {
    for (const [copyState, want] of [['idle', '复制'], ['done', '已复制'], ['failed', '复制失败']]) {
      const tree = readOnlyRow({ copyState });
      assert.equal(buttons(tree).length, 1, '只读行该恰有一枚按钮（复制）');
      assert.equal(textOf(buttons(tree)[0]), want);
    }
    assert.equal(copyLabelOf('done'), '已复制');
  });

  it('跟着更新的那一行：标记与「复制」并存（票面第 2 条要每行一枚复制）', () => {
    const tree = readOnlyRow({ follow: true });
    assert.match(textOf(tree), /将跟随更新/);
    assert.equal(buttons(tree).filter((b) => textOf(b) === '复制').length, 1, '跟随态下那枚复制照旧在');
  });

  it('行的容器是换行弹性盒：标签列定宽、值列让位（换行判据不落在字符数上）', () => {
    const rowStyle = readOnlyRow().props.style;
    assert.equal(rowStyle.flexWrap, 'wrap', '行容器要能换行（装不下时整行让位）');
    assert.equal(rowStyle.padding, '7px 0', '内边距取 v3.1 的 `padding:7px 0`');
    assert.equal(rowStyle.gap, '4px 10px', '间距取 v3.1 的 `gap:4px 10px`');
    assert.equal(kidsOf(readOnlyRow())[1].props.style.paddingRight > 0, true, '值列要给行尾那枚按钮留出宽度');
  });
});

describe('#920 ② 可改行：「可改」徽标 · 说明 · 整行输入框 · 按钮行', () => {
  it('就四件＋可选的告警槽：标签带「可改」／说明／整行输入框／按钮行（第 5 件只能是 #915 的告警位）', () => {
    const kids = kidsOf(masterRow());
    // #915 第二步给可改行加了第 5 件告警槽（有告警才画，没告警是 `null` 占位——`createElement` 会把它留在 children 里）。
    assert.ok(kids.length === 4 || kids.length === 5, '可改行是四件 ＋ 可选的告警槽，实际 ' + kids.length + ' 件');
    if (kids.length === 5) assert.equal(kids[4], null, '没告警时第 5 件只能是 null 占位');
    assert.equal(textOf(kids[0]), ITEMS[0].title + '可改', '标签后面要跟一枚「可改」徽标');
    assert.equal(textOf(kids[1]), ITEMS[0].hint, '第二件是人话说明');
    const input = ofType(kids[2], 'input')[0];
    assert.equal(input.props.type, 'text');
    assert.equal(input.props.style.display, 'block');
    assert.equal(input.props.style.width, '100%', '输入框要占整行（母版行的形状）');
    assert.equal(input.props.style.padding, '5px 8px', '同 v3.1 的 `.ic-master input`');
    assert.equal(input.props.style.borderRadius, 6, '同 v3.1 的圆角 6px');
  });

  it('按钮行的字面恰「浏览文件夹」＋「复制」（两档合一，旧的两种字面一个都不许回）', () => {
    const labels = buttons(kidsOf(masterRow())[3]).map(textOf);
    assert.deepEqual(labels, ['浏览文件夹', '复制']);
    for (const old of ['浏览', '选择文件夹', '打开', '用默认位置', '浏览…']) {
      assert.equal(labels.includes(old), false, '不该再有「' + old + '」');
    }
  });

  it('入口供不了就收起那一枚按钮（不是留个点了没反应的死按钮）', () => {
    assert.deepEqual(buttons(kidsOf(masterRow({ browser: null }))[3]).map(textOf), ['复制']);
    assert.deepEqual(buttons(kidsOf(masterRow({ browser: { mode: 'none', onOpen: () => undefined } }))[3]).map(textOf), ['复制']);
  });

  it('母版行那一块盒子照 v3.1：`padding:11px 12px` ＋ 圆角 8 ＋ `margin-top:11px`', () => {
    const style = masterRow().props.style;
    assert.equal(style.padding, '11px 12px');
    assert.equal(style.borderRadius, 8);
    assert.equal(style.marginTop, 11);
  });

  it('脏行给输入框那圈注意力描边（2px ＋ 光晕，v3.1 的 `.is-dirty`）', () => {
    const dirty = ofType(masterRow({ dirty: true }), 'input')[0].props.style;
    assert.equal(dirty.border, '2px solid var(--dsw-alias-state-warn-primary, #e0a33e)');
    assert.equal(dirty.padding, '4px 7px', '2px 描边要与 5→4 的内边距对消（宽高不变）');
    assert.match(String(dirty.boxShadow), /color-mix/);
  });
});

describe('#920 ②b 跟随行按 v3.1 的 `.ic-under` 缩进（母版行不缩进）', () => {
  /** 与六家同形的那个钩子（各家 `client.ts` 里逐字就是这个形状：纯函数、只做一次 includes）。 */
  const hook = (dirtyKeys) => (dirtyKeys.includes('db.dir') ? ['db.name'] : []);

  it('静态跟随行名单由钩子逐键探出来：与当刻脏不脏无关，拿不到钩子就一行都不缩进', () => {
    assert.deepEqual(followerKeysOf(ITEMS, hook), ['db.name'], '喂单键就该问出「谁跟着它」');
    assert.deepEqual(followerKeysOf(ITEMS, () => []), [], '没有跟随关系的家：空表');
    assert.deepEqual(followerKeysOf(ITEMS, undefined), [], '钩子缺席：空表（照旧平铺）');
    // 探的时候喂的是「单键」，不是当刻的脏键——所以哪怕一行都没改也探得出来。
    assert.deepEqual(followerKeysOf(ITEMS, (keys) => (keys.length === 1 ? hook(keys) : [])), ['db.name']);
  });

  it('跟随行缩进 8＋1＋13＝22px（照 `.ic-under`），左边挂一条线', () => {
    const box = rowBoxOf(PanelBody(bodyProps({ followerKeys: ['db.name'] })), ITEMS[1].title);
    assert.ok(box !== undefined, '找不到那条跟随行');
    assert.equal(box.props.style.marginLeft, 8, '`.ic-under{margin-left:8px}`');
    assert.equal(box.props.style.padding, '7px 0 7px 13px', '`.ic-under{padding-left:13px}` ＋ `.ic-row{padding:7px 0}`');
    assert.equal(box.props.style.borderLeft, '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12))',
      '`.ic-under{border-left:1px solid var(--ic-line-strong)}`');
  });

  it('母版行不缩进，也不在它身上挂那条左边线（缩进量两者必须不等）', () => {
    const tree = PanelBody(bodyProps({ followerKeys: ['db.name'] }));
    const master = rowBoxOf(tree, ITEMS[0].title + '可改');
    assert.ok(master !== undefined, '找不到那条可改行');
    assert.equal(master.props.style.marginLeft, undefined);
    assert.equal(master.props.style.paddingLeft, undefined);
    assert.equal(master.props.style.borderLeft, undefined);
    assert.notEqual(master.props.style.padding, '7px 0 7px 13px');
  });

  it('名单外的只读行不缩进（不是「只读行一律缩进」）', () => {
    const box = rowBoxOf(PanelBody(bodyProps({ followerKeys: [] })), ITEMS[1].title);
    assert.ok(box !== undefined);
    assert.equal(box.props.style.marginLeft, undefined);
    assert.equal(box.props.style.padding, '7px 0');
    assert.equal(box.props.style.borderLeft, undefined);
  });

  it('跟随行的最后一行照旧免掉下边线（缩进照留）', () => {
    const tree = PanelBody(bodyProps({ items: [ITEMS[0], ITEMS[1]], followerKeys: ['db.name'] }));
    const box = rowBoxOf(tree, ITEMS[1].title);
    assert.equal(box.props.style.marginLeft, 8, '免下边线不等于不缩进');
    assert.equal(box.props.style.borderBottom, undefined);
    assert.equal(box.props.style.borderLeft, '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12))');
  });
});

describe('#920 ③ 高级组收起 · 底栏三键贴下沿吸住', () => {
  it('高级组默认收起，标题与副文案照共用常量，左边一枚静态「›」', () => {
    const details = ofType(PanelBody(bodyProps()), 'details')[0];
    assert.ok(details !== undefined, '缺高级组');
    assert.equal(details.props.open, undefined, '高级组不许默认展开');
    const summary = ofType(details, 'summary')[0];
    assert.equal(textOf(summary), '›' + ADVANCED_GROUP_TITLE + ADVANCED_GROUP_NOTE);
    assert.equal(summary.props.style.listStyle, 'none', '要点掉原生那枚三角（v3.1 的 `list-style:none`）');
    assert.equal(summary.props.style.cursor, 'pointer');
  });

  it('高级组的每一行也在那一块盒子里（`padding:11px 12px` ＋ 圆角 8）', () => {
    const body = ofType(PanelBody(bodyProps()), 'details')[0].props.children[1];
    assert.equal(body.props.style.padding, '11px 12px');
    assert.equal(body.props.style.borderRadius, 8);
  });

  it('底栏三键贴下沿吸住：`position:sticky` ＋ `bottom:0`，三枚字面一个不改', () => {
    const bar = barOf(PanelBody(bodyProps()));
    assert.ok(bar !== undefined, '找不到动作条');
    assert.equal(bar.props.style.position, 'sticky');
    assert.equal(bar.props.style.bottom, 0, '底栏要贴下沿吸住');
    assert.deepEqual(buttons(bar).map(textOf), ['保存', '重置为默认', '重新读取']);
    assert.equal(bar.props.style.paddingTop, 12, '同 v3.1 的 `padding-top:12px`');
    assert.equal(bar.props.style.marginTop, 14, '同 v3.1 的 `margin-top:14px`');
  });

  it('就绪态底栏右侧那半句照 v3.1 的 `.ic-note`；有改动时换黄字那半句', () => {
    assert.match(textOf(barOf(PanelBody(bodyProps()))), /没有未保存的改动/);
    assert.match(textOf(barOf(PanelBody(bodyProps({ dirtyKeys: ['db.dir'] })))), /1 项未保存/);
  });

  it('底栏那半句是**最后一个孩子**（v3.1 靠 `margin-left:auto` 把它顶到行尾，三枚键留在左边）', () => {
    const kids = kidsOf(barOf(PanelBody(bodyProps())));
    assert.deepEqual(kids.map(textOf), ['保存', '重置为默认', '重新读取', '没有未保存的改动'],
      '顺序反了会成「说明靠左、按钮靠右」，与 v3.1 的 `.ic-bar` 相反');
    assert.equal(kids[3].props.style.marginLeft, 'auto');
  });
});

describe('#920 ⑤ 状态徽标那七档（就绪／有改动／写入中／已保存／值非法回落／写入失败／读取失败）', () => {
  const facts = (over = {}) => ({
    readFailed: false,
    busy: false,
    writeFailed: false,
    invalid: false,
    dirtyCount: 0,
    saved: false,
    ...over,
  });

  it('状态 → 档：七档各有一条路走得到，且次序照 v3.1 的 `paint()`', () => {
    assert.equal(panelBadgeOf(facts()), 'ready');
    assert.equal(panelBadgeOf(facts({ dirtyCount: 2 })), 'dirty');
    assert.equal(panelBadgeOf(facts({ busy: true })), 'busy');
    assert.equal(panelBadgeOf(facts({ saved: true })), 'saved');
    assert.equal(panelBadgeOf(facts({ invalid: true })), 'invalid');
    assert.equal(panelBadgeOf(facts({ writeFailed: true })), 'writeFailed');
    assert.equal(panelBadgeOf(facts({ readFailed: true })), 'readFailed');
    // 优先级：读取失败那一档把整面换掉，压在其余各档之上；写入中压在「未保存」之上。
    assert.equal(panelBadgeOf(facts({ readFailed: true, busy: true, dirtyCount: 3 })), 'readFailed');
    assert.equal(panelBadgeOf(facts({ busy: true, dirtyCount: 3 })), 'busy');
  });

  it('各档的字面（v3.1 的 `badgeHTML`，只把「已保存 · 刚刚」的演示时刻收成档名）', () => {
    assert.equal(badgeTextOf('ready', 0), '', '就绪态不画徽标（v3.1 回空串）');
    assert.equal(badgeTextOf('dirty', 3), '3 项未保存');
    assert.equal(badgeTextOf('busy', 0), '正在写入');
    assert.equal(badgeTextOf('saved', 0), '已保存');
    assert.equal(badgeTextOf('invalid', 0), '配置里有值用不了');
    assert.equal(badgeTextOf('writeFailed', 0), '写入失败');
    assert.equal(badgeTextOf('readFailed', 0), '', '读取失败换成整屏那一支，不画徽标');
  });

  it('六档落到屏上（读取失败那一档落成「一整屏错误 ＋ 恰两枚按钮」）', () => {
    assert.doesNotMatch(textOf(PanelBody(bodyProps())), /项未保存|正在写入|写入失败/, '就绪态不该有徽标');
    assert.match(textOf(PanelBody(bodyProps({ dirtyKeys: ['db.dir'] }))), /1 项未保存/);
    assert.match(textOf(PanelBody(bodyProps({ busy: true }))), /正在写入/);
    assert.match(textOf(PanelBody(bodyProps({ notice: '已保存，立即生效' }))), /已保存/);
    assert.match(textOf(PanelBody(bodyProps({ invalid: true }))), /配置里有值用不了/);
    assert.match(textOf(PanelBody(bodyProps({ writeError: '写入失败：磁盘只读' }))), /写入失败/);
    const failed = PanelBody(bodyProps({ state: { kind: 'failed', message: '配置面读不出来' } }));
    assert.equal(buttons(failed).length, 2, '读取失败那一屏恰两枚按钮');
    assert.deepEqual(buttons(failed).map(textOf), ['重试', '重置为默认']);
    assert.doesNotMatch(textOf(failed), /项未保存|正在写入|已保存/, '失败那一屏不画徽标');
  });

  it('徽标画在卡片标题行右端（`.ic-head` 里靠 `margin-left:auto`）', () => {
    const head = kidsOf(PanelBody(bodyProps({ dirtyKeys: ['db.dir'] })))[0];
    assert.equal(head.props.style.display, 'flex');
    assert.equal(textOf(head), '探针产品名 · 配置1 项未保存');
  });
});

describe('#920 样式表：取值照 v3.1 那一件，逐项锚住（不许自己重新设计）', () => {
  it('可判的那几处取值逐项对上 v3.1 的 CSS', () => {
    const V31 = [
      ['card', /padding:\s*14\b/, '`.ic-card{padding:14px}`'],
      ['card', /borderRadius:\s*12\b/, '`.ic-card{border-radius:12px}`'],
      ['card', /boxShadow:\s*'inset 0 1px 0 rgba\(255,255,255,\.06\)'/, '`.ic-card{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}`'],
      ['head', /gap:\s*10\b/, '`.ic-head{gap:10px}`'],
      ['head', /minHeight:\s*22\b/, '`.ic-head{min-height:22px}`'],
      ['fileWrap', /marginTop:\s*4\b/, '`.ic-file{margin-top:4px}`'],
      ['fileLabel', /marginRight:\s*5\b/, '`.ic-file b{margin-right:5px}`'],
      ['rowKey', /minWidth:\s*118\b/, '`.ic-row{--ic-kw:118px}`'],
      ['followerRow', /marginLeft:\s*8\b/, '`.ic-under{margin:9px 0 0 8px}`'],
      ['followerRow', /padding:\s*'7px 0 7px 13px'/, '`.ic-under{padding-left:13px}` ＋ `.ic-row{padding:7px 0}`'],
      ['followerRow', /borderLeft:\s*'1px solid var\(--dsw-alias-border-l2/, '`.ic-under{border-left:1px solid var(--ic-line-strong)}`'],
      ['followerRowLast', /marginLeft:\s*8\b/, '同上（免下边线那一档照留缩进）'],
      ['rowValue', /overflowWrap:\s*'anywhere'/, '`.ic-row.is-wide .ic-v{overflow-wrap:anywhere}`'],
      ['rowActs', /top:\s*7\b/, '`.ic-row{padding:7px 0}`（动作槽与第一行齐）'],
      ['followMark', /opacity:\s*0\.8/, '`.ic-follow::before{opacity:.8}`'],
      ['master', /padding:\s*'11px 12px'/, '`.ic-master{padding:11px 12px}`'],
      ['master', /borderRadius:\s*8\b/, '`.ic-master{border-radius:8px}`'],
      ['hint', /marginTop:\s*3\b/, '`.ic-master .ic-hint{margin-top:3px}`'],
      ['input', /padding:\s*'5px 8px'/, '`.ic-master input{padding:5px 8px}`'],
      ['inputDirty', /padding:\s*'4px 7px'/, '`.ic-master input.is-dirty{padding:4px 7px}`'],
      ['acts', /gap:\s*5\b/, '`.ic-acts{gap:5px}`'],
      ['btnPick', /padding:\s*'2px 7px'/, '`.ic-btn.is-mini{padding:2px 7px}`'],
      ['invalid', /padding:\s*'7px 9px'/, '`.ic-invalid{padding:7px 9px}`'],
      ['advanced', /marginTop:\s*14\b/, '`.ic-group{margin-top:14px}`'],
      ['summary', /padding:\s*'2px 0'/, '`.ic-group > .ic-ghead{padding:2px 0}`'],
      ['groupBody', /marginTop:\s*9\b/, '`.ic-group > .ic-gbody{margin-top:9px}`'],
      ['groupBody', /padding:\s*'11px 12px'/, '`.ic-group > .ic-gbody{padding:11px 12px}`'],
      ['bar', /paddingTop:\s*12\b/, '`.ic-bar{padding-top:12px}`'],
      ['badge', /padding:\s*'4px 9px'/, '`.ic-badge{padding:4px 9px}`'],
      ['badge', /borderRadius:\s*999\b/, '`.ic-badge{border-radius:999px}`'],
      ['badgeDot', /width:\s*6\b/, '`.ic-badge .ic-bd{width:6px}`'],
      ['badgeSpinner', /borderTopColor:\s*'currentColor'/, '`.ic-spin{border-top-color:currentColor}`'],
      ['badgeDirty', /fontWeight:\s*600\b/, '`.ic-badge.is-dirty{font-weight:600}`'],
    ];
    for (const [name, re, origin] of V31) {
      assert.match(entryBody(VIEW_SRC, name), re, name + ' 的取值该照 ' + origin);
    }
  });

  it('v3.1 用的那十三条主题别名一条不少（颜色跟宿主主题走，写死值只做回退）', () => {
    const TOKENS = [
      '--dsw-alias-bg-base',
      '--dsw-alias-bg-layer-1',
      '--dsw-alias-bg-layer-3',
      '--dsw-alias-border-l1',
      '--dsw-alias-border-l2',
      '--dsw-alias-label-primary',
      '--dsw-alias-label-primary-foreground',
      '--dsw-alias-label-secondary',
      '--dsw-alias-label-tertiary',
      '--dsw-alias-brand-primary',
      '--dsw-alias-state-success-primary',
      '--dsw-alias-state-warn-primary',
      '--dsw-alias-state-error-primary',
    ];
    const missing = TOKENS.filter((t) => !VIEW_SRC.includes(t));
    assert.deepEqual(missing, [], '样式表少了这几条别名：' + missing.join('、'));
  });

  it('值列与标签列的字号是相对单位（宿主没有界面字号 token，绝对 px 会失真）', () => {
    assert.match(entryBody(VIEW_SRC, 'rowKey'), /fontSize:\s*'0\.92em'/, '标签列 11.5px ⇒ 0.92em');
    assert.match(entryBody(VIEW_SRC, 'rowValue'), /fontSize:\s*'0\.88em'/, '值列 11px ⇒ 0.88em');
  });
});

describe('#920 ④ 几何：换行不按字符数估宽（审查 P0-4）', () => {
  it('值列零省略号／零截断：不许 nowrap、不许 text-overflow', () => {
    const valueBody = entryBody(VIEW_SRC, 'rowValue');
    assert.doesNotMatch(valueBody, /nowrap/, '值列不许 `nowrap`（装不下就截断那一族的记号）');
    const CODE = VIEW_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(CODE, /textOverflow/, '共用件的代码里一次 `textOverflow` 都不该有');
    assert.doesNotMatch(CODE, /ellipsis/, '共用件的代码里一次 `ellipsis` 都不该有');
    assert.match(valueBody, /whiteSpace:\s*'normal'/, '值要能自己折下去');
    assert.match(valueBody, /flex:\s*'1 1 auto'/, '值列要能伸能缩（装不下时整行让位）');
    assert.match(valueBody, /minWidth:\s*0/, '不许把内容的自然宽当成地板宽（那正是拆行/溢出那一路）');
  });

  it('换行交给排版引擎：源码里没有「每列多少像素 × 多少列」那类估宽算术', () => {
    // 只扫**去掉注释之后**的代码：那两个数（每列 6.048px／按 34 列估）正是文件头点名要删的缺陷，
    // 它得留在注释里当依据，不该因为「注释里提了它」被判红——判据咬的是代码，不是依据。
    const CODE = VIEW_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const BANNED = ['6.048', 'charWidth', 'WIDE_COLS', 'NARROW_COLS', 'colsOf', 'midCols'];
    const hit = BANNED.filter((w) => CODE.includes(w));
    assert.deepEqual(hit, [], '共用件里又出现了按字符数估宽的痕迹：' + hit.join('、'));
    // 正向：整行让位这件事由 CSS 表达（行容器 flex-wrap ＋ 值列 flex-basis 取内容宽）。
    assert.match(entryBody(VIEW_SRC, 'row'), /flexWrap:\s*'wrap'/);
  });
});

describe('#915 第二步 · 技能侧报出的行告警：原样画，不比较、不合成', () => {
  const ALERT = { code: 'DIR_UNWRITABLE', message: '这个目录写不进去：在，但写不进去：Z:\\只读\\data。' };
  const surfaced = (alerts) => ({ ...SURFACE, alerts });
  /** 黄字那一格（`S.invalid`）：样式表的 `invalid` 拿来就是干这个的。 */
  const invalidBlocks = (tree) =>
    ofType(tree, 'div').filter((d) => d.props.style !== undefined && d.props.style.padding === '7px 9px');

  it('有告警的那一行：message 原样上屏，且不出现「生效的是」这类合成句', () => {
    const tree = PanelBody(bodyProps({ state: { kind: 'ready', surface: surfaced({ 'db.dir': ALERT }) } }));
    const text = textOf(tree);
    assert.match(text, /这个目录写不进去/);
    assert.doesNotMatch(text, /现在生效的是/);
    assert.doesNotMatch(text, /配置里写的是/);
    assert.equal(invalidBlocks(tree).length, 1, '有且只有那一行亮黄字');
  });

  it('没告警的行与整面：一个告警节点都不画（没问题就不显示）', () => {
    const clean = PanelBody(bodyProps());
    assert.equal(invalidBlocks(clean).length, 0);
    assert.doesNotMatch(textOf(clean), /现在生效的是/);
    assert.doesNotMatch(textOf(clean), /配置里写的是/);
  });

  it('告警只跟那一行走：别的行不受影响', () => {
    const tree = PanelBody(bodyProps({ state: { kind: 'ready', surface: surfaced({ 'db.dir': ALERT }) } }));
    assert.equal(invalidBlocks(tree).length, 1, '只有 db.dir 那一行亮');
  });
});
