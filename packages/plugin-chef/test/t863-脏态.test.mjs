/**
 * #863 · 脏标记与跟随态（大厨）——改动行有标记、派生行进跟随态、保存栏吸底常显。
 *
 * #909 起两条指向变了（设置页本体收进共用件 `dsh-life-pack/config-panel`）：
 *   · `Row`（行渲染）从共用面板的公开门取；
 *   · 「保存栏吸底＋脏计数文案」原来是搜本家 `client.ts` 的字符串——那段代码已经不在了，
 *     改成**渲一遍整面**读屏上的事实（吸底是动作条那一个节点的 `position: sticky`）。
 * 运行：`node --test packages/plugin-chef/test/t863-脏态.test.mjs`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Row } from 'dsh-life-pack/config-panel';
import { PanelBody } from '../../plugin-manager/dist/config-panel-view.js';
import { toDraft } from '../../plugin-manager/dist/config-panel-value.js';
import { loadClientBundle } from '../../../test/helpers/client-bundle.mjs';
import { CONFIG_ITEMS } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 跟随映射仍住本家（那是各家自己的派生关系），从产物取。 */
const { followKeysOf } = loadClientBundle(join(HERE, '..')).exports;

/* ═══ 读那棵树的小工具 ═══
   行渲染与整面都从共用面板取（#909）：那是**真 React**，元素树里子节点住在 `props.children`，
   故不能用 `test/helpers/client-bundle.mjs` 那套替身遍历（它读的是 `node.children`）。 */
/** 展开一层函数组件（只展开**纯组件**：用到 hook 的组件跳过，绝不把面板带下来）。 */
function expandNode(tree) {
  if (tree === null || tree === undefined || typeof tree !== 'object' || Array.isArray(tree)) return tree;
  if (typeof tree.type !== 'function') return tree;
  try {
    return tree.type(tree.props);
  } catch {
    return tree;
  }
}

function descendants(tree, out = []) {
  const node = expandNode(tree);
  if (node === null || node === undefined || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) descendants(child, out);
    return out;
  }
  out.push(node);
  // 两种树都要认：共用面板经**真 React** 出树（子节点在 `props.children`），
  // 本家产物经替身 `createElement` 出树（子节点直接挂在节点上）。
  descendants(node.props?.children ?? node.children, out);
  return out;
}
const nodesOfType = (tree, type) => descendants(tree).filter((n) => n.type === type);
function textOf(tree) {
  let text = '';
  const walk = (node) => {
    const item = expandNode(node);
    if (item === null || item === undefined || typeof item === 'boolean') return;
    if (typeof item === 'string' || typeof item === 'number') { text += item; return; }
    if (Array.isArray(item)) {
      for (const child of item) walk(child);
      return;
    }
    walk(item.props?.children ?? item.children);
  };
  walk(tree);
  return text;
}

const itemOf = (key) => CONFIG_ITEMS.find((i) => i.key === key);

/** 整面那一张卡的输入（就绪态 ＋ 一张脏行表）。 */
const SURFACE = {
  path: 'C:\\Users\\x\\.ilife\\chef.yaml',
  dataDir: 'C:\\Users\\x\\.ilife',
  created: false,
  values: { db: { dir: '' } },
};
function bodyTree(over = {}) {
  return PanelBody({
    title: '私家大厨',
    items: CONFIG_ITEMS,
    state: { kind: 'ready', surface: SURFACE },
    draft: toDraft(CONFIG_ITEMS, SURFACE.values, SURFACE),
    busy: false,
    notice: null,
    writeError: null,
    error: null,
    picking: false,
    browseRow: null,
    rowEntry: null,
    dirtyKeys: [],
    followKeys: [],
    copy: null,
    onCopy: () => {},
    onChange: () => {},
    onSave: () => {},
    onReset: () => {},
    onRetry: () => {},
    ...over,
  });
}

describe('#863 脏标记与跟随态（大厨）', () => {
  it('跟随映射：数据目录一脏，三项只读派生行全进跟随', () => {
    assert.deepEqual(followKeysOf(['db.dir']).sort(), ['db.name', 'html.dir', 'html.sceneDir']);
    assert.deepEqual(followKeysOf([]), []);
  });

  it('脏行：标题旁有已改动标记，输入框描边变色', () => {
    const node = Row({ item: itemOf('db.dir'), value: 'D:\\新目录', disabled: false, onChange: () => {}, dirty: true });
    assert.match(textOf(node), /已改动/);
    assert.equal(nodesOfType(node, 'input')[0].props.style.borderColor,
      'var(--dsw-alias-state-warning-primary, #b26a00)');
  });

  it('干净行：无标记无变色（与旧渲染一致）', () => {
    const node = Row({ item: itemOf('db.dir'), value: 'D:\\旧目录', disabled: false, onChange: () => {} });
    assert.doesNotMatch(textOf(node), /已改动/);
    assert.equal(nodesOfType(node, 'input')[0].props.style.borderColor, undefined);
  });

  it('跟随行：只读行出跟随提示并置灰；不跟随时没有', () => {
    const on = Row({ item: itemOf('db.name'), value: 'C:\\x\\a.db', disabled: false, onChange: () => {}, follow: true });
    assert.match(textOf(on), /将跟随更新/);
    assert.equal(nodesOfType(on, 'input')[0].props.style.opacity, 0.55);
    assert.equal(nodesOfType(on, 'input')[0].props.disabled, true, '跟随态仍不可编辑');
    const off = Row({ item: itemOf('db.name'), value: 'C:\\x\\a.db', disabled: false, onChange: () => {} });
    assert.doesNotMatch(textOf(off), /将跟随更新/);
  });

  it('保存栏吸底常显＋脏计数文案', () => {
    const tree = bodyTree({ dirtyKeys: ['db.dir'] });
    const sticky = nodesOfType(tree, 'div').filter((n) => n.props.style?.position === 'sticky');
    assert.equal(sticky.length, 1, '就该有一个吸底动作条（找不到＝保存栏没吸底）');
    assert.ok(nodesOfType(sticky[0], 'button').some((b) => textOf(b).startsWith('保存')), '保存那枚该在吸底动作条里');
    assert.match(textOf(tree), /项未保存/, '脏计数文案没上屏');
    assert.match(textOf(tree), /浏览改动后请点保存/);
  });
});
