/**
 * #794 · 居家设置页收窄（照记账 #749 样板铺开）——**插件侧**验收：行表收窄成「一处可改 ＋ 其余只读展示」，
 * 只读值只来自技能侧回执，面板一个字都不算。
 *
 * 判据（逐条对应票面《目标》与《验收命令》第 2 条）：
 *   ① 行表形状：5 行 ＝ 可改 1（数据目录）＋ 只读 4（库文件名／HTML 产物目录／备份目录／主密钥文件）；
 *      目录档仍是 `{db.dir, backup.dir}` 两行（#736 的 H 组不破）。
 *   ② 只读行显示的是**技能算好的绝对路径**：逐行等于回执 `resolved` 组里 `resolveFrom` 指的那一格；
 *      回执缺那一组（旧技能）⇒ 空串，面板**不自己拼路径**（边界见 #677）。
 *   ③ 只读行**不进保存**：`fromDraft` 只收可改行（本家只有 `db.dir`），免得把显示用的绝对路径写回配置。
 *   ④ 只读渲染：控件 `disabled`、不接 `onChange`；只读目录行的浏览按钮**保留但不可点击**（#793 定稿）。
 *   ⑤ 控件文案零省略号（#746 处置 9）：`client.ts` 里没有 `…`，按钮就写「选择文件夹」／「浏览」。
 *
 * 本家无数字类项，故记账样板那条「只读数字行形态（甲档）」无对应行——形态已由样板钉住，卡路里 #757 照办，
 * 这里不重复合成（合成行是样板那一家的自证手段，不是每家都要一件）。
 *
 * 隔离：`test/helpers/config-test-base.mjs` 把当刻进程与子进程的家目录都指到临时目录；
 * 真实 `~/.ilife` 一行不碰。运行：`node --test packages/plugin-home-ilife/test/t794-设置页收窄.test.mjs`。
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigYaml } from '../../base-link-core/dist/config/yaml.js';
import { Row } from 'dsh-life-pack/config-panel';
import { toDraft as sharedToDraft, fromDraft as sharedFromDraft } from '../../plugin-manager/dist/config-panel-value.js';
import { configDirOf, setupConfigTestBase } from '../../../test/helpers/config-test-base.mjs';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT } from '../dist/index.js';
import { readConfigSurface } from '../dist/bridge.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = readFileSync(join(HERE, '..', 'src', 'client.ts'), 'utf8');

/* ═══ 读那棵树的小工具 ═══
   行渲染从共用面板的公开门取（#909）：那是**真 React**，元素树里子节点住在 `props.children`，
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
/** 一枚按钮是不是目录入口那枚（定稿 v3 ②起两档字面合一，叫「浏览文件夹」）。 */
const isBrowseButton = (node) => textOf(node) === '浏览文件夹';

/** 取值／填值收进共用件（#909）：这里按本家行表绑一次，调用口径与改版前逐条相同。 */
const toDraft = (values, source = {}) => sharedToDraft(CONFIG_ITEMS, values, source);
const fromDraft = (draft) => sharedFromDraft(CONFIG_ITEMS, draft);

/** 只读行集合（页面不给改的那 4 行）与它们的键。 */
const READONLY = CONFIG_ITEMS.filter((i) => i.readonly === true);
const EDITABLE = CONFIG_ITEMS.filter((i) => i.readonly !== true);
const itemOf = (key) => {
  const item = CONFIG_ITEMS.find((i) => i.key === key);
  assert.notEqual(item, undefined, '行表里缺 ' + key);
  return item;
};

describe('#794 居家设置页收窄（照 #749 样板铺开）', () => {
  let base;
  before(() => {
    base = setupConfigTestBase();
  });
  after(() => {
    base.cleanup();
  });

  describe('① 行表形状：可改 1 ＋ 只读 4', () => {
    it('可改项恰是数据目录一行', () => {
      assert.deepEqual(EDITABLE.map((i) => i.key), ['db.dir'], '本家只有数据目录可改（#793 定稿）');
      assert.equal(itemOf('db.dir').control, 'directory');
      assert.equal(itemOf('db.dir').prefillFrom, 'dataDir');
    });

    it('只读 4 行＝库文件名／HTML 产物目录／备份目录／主密钥文件', () => {
      assert.deepEqual(READONLY.map((i) => i.key).sort(),
        ['backup.dir', 'db.name', 'html.dir', 'key.file']);
      assert.equal(READONLY.length, 4);
      assert.equal(CONFIG_ITEMS.length, 5, '5 行＝可改 1 ＋ 只读 4');
      assert.equal(COMMON_ITEM_COUNT, 3);
    });

    it('HTML 产物目录的标题已改「HTML 产物目录」，且每行都指向回执里的一格', () => {
      assert.equal(itemOf('html.dir').title, 'HTML 产物目录');
      for (const item of READONLY) {
        assert.notEqual(item.resolveFrom, undefined, item.key + ' 应标 resolveFrom（显示值来自技能侧回执）');
      }
      assert.deepEqual(READONLY.map((i) => i.resolveFrom).sort(),
        ['backupDir', 'dbFile', 'htmlDir', 'keyFile']);
    });

    it('目录档仍是两行（#736 的 H 组不破）：数据目录与备份目录', () => {
      assert.deepEqual(CONFIG_ITEMS.filter((i) => i.control === 'directory').map((i) => i.key).sort(),
        ['backup.dir', 'db.dir']);
    });
  });

  describe('② 只读值只来自技能侧回执（面板不拼路径）', () => {
    it('回执带 `resolved` 一组，五格与配置文件里的取值逐字一致', () => {
      const s = readConfigSurface();
      assert.deepEqual(Object.keys(s.resolved ?? {}).sort(),
        ['backupDir', 'dbDir', 'dbFile', 'htmlDir', 'keyFile'], '回执缺 resolved 组或格子不齐');
      const yaml = join(configDirOf(base.dir), 'home.yaml');
      const v = parseConfigYaml(readFileSync(yaml, 'utf8'), 'home.yaml').values;
      const dbDir = v.db.dir === '' ? s.dataDir : String(v.db.dir);
      assert.equal(s.resolved.dbDir, dbDir);
      assert.equal(s.resolved.dbFile, join(dbDir, String(v.db.name)));
      assert.equal(s.resolved.htmlDir, join(dbDir, String(v.html.dir)));
    });

    it('每张只读行显示的正是那一格（逐行对账）', () => {
      const s = readConfigSurface();
      const draft = toDraft(s.values, s);
      for (const item of READONLY) {
        assert.equal(draft[item.key], s.resolved[item.resolveFrom], item.key + ' 应显示 resolved.' + item.resolveFrom);
      }
    });

    it('回执缺那一组（旧技能）⇒ 只读行显示空串，绝不自己拼一条路径出来', () => {
      const draft = toDraft({ db: { dir: '' } }, { dataDir: 'C:\\探针\\.ilife\\data' });
      for (const item of READONLY) assert.equal(draft[item.key], '', item.key + ' 该空着（回执没给就不编）');
      assert.equal(draft['db.dir'], 'C:\\探针\\.ilife\\data', '可改行照旧按 dataDir 预填（#743）');
    });

    it('面板一行路径拼接都没有（边界 #677：不算默认值、不拼路径）', () => {
      assert.doesNotMatch(CLIENT_SRC, /\bjoin\s*\(/, 'client.ts 不该自己拼路径');
      assert.doesNotMatch(CLIENT_SRC, /node:path|node:fs/, 'client.ts 不该带 node 内建');
    });
  });

  describe('③ 只读行不进保存', () => {
    it('fromDraft 只收可改行：整张草稿交上去，收货的只有 db.dir 一格', () => {
      const s = readConfigSurface();
      const draft = toDraft(s.values, s);
      const submitted = fromDraft(draft);
      assert.deepEqual(Object.keys(submitted), ['db']);
      assert.deepEqual(Object.keys(submitted.db), ['dir'], '只读的 db.name 不该被提交');
      assert.equal(submitted.db.dir, draft['db.dir']);
      for (const item of READONLY) {
        assert.equal(item.key in draft, true, '只读行仍在草稿里（页面要显示它）');
      }
    });
  });

  describe('④ 只读渲染：控件 disabled、浏览按钮保留但不可点击', () => {
    it('文本只读行：一个 disabled 的文本框、不接 onChange', () => {
      const item = itemOf('db.name');
      const node = Row({ item, value: 'C:\\x\\home.db', disabled: false, onChange: () => {} });
      const inputs = nodesOfType(node, 'input');
      assert.equal(inputs.length, 1);
      assert.equal(inputs[0].props.disabled, true, '只读行须 disabled');
      assert.equal(inputs[0].props.onChange, undefined, '只读行不接 onChange（不给「改得动」留假象）');
      assert.equal(inputs[0].props.value, 'C:\\x\\home.db', '显示技能算好的绝对路径');
    });

    it('只读目录行：一枚浏览按钮都不画（定稿 v3 ①：不摆点了也没反应的死按钮）', () => {
      const node = Row({
        item: itemOf('backup.dir'),
        value: 'C:\\x\\.ilife\\data\\backups',
        disabled: false,
        onChange: () => {},
        browser: { mode: 'browse', onOpen: () => {} },
      });
      assert.deepEqual(nodesOfType(node, 'button').filter(isBrowseButton), [], '只读目录行不该有目录入口按钮');
      assert.equal(nodesOfType(node, 'input')[0].props.disabled, true);
    });

    it('可改目录行（数据目录）照旧：控件可写、按钮可点', () => {
      const node = Row({
        item: itemOf('db.dir'),
        value: 'D:\\爱生活数据',
        disabled: false,
        onChange: () => {},
        browser: { mode: 'native', onOpen: () => {} },
      });
      assert.equal(nodesOfType(node, 'input')[0].props.disabled, false);
      assert.equal(nodesOfType(node, 'button')[0].props.disabled, false);
    });
  });

  describe('⑤ 控件文案零省略号', () => {
    it('client.ts 里一个 `…` 都没有（#746 处置 9）', () => {
      assert.doesNotMatch(CLIENT_SRC, /…/, '控件文案不得出现省略号');
    });

    it('目录行的按钮字面两档合一的「浏览文件夹」（定稿 v3 ②，无省略号、无点点）', () => {
      const withBrowse = (mode) => Row({
        item: itemOf('db.dir'),
        value: 'D:\\x',
        disabled: false,
        onChange: () => {},
        browser: { mode, onOpen: () => {} },
      });
      for (const mode of ['native', 'browse']) {
        const browse = nodesOfType(withBrowse(mode), 'button').filter(isBrowseButton);
        assert.equal(browse.length, 1, mode + ' 档应有恰一枚目录入口按钮');
        const label = textOf(browse[0]);
        assert.equal(label, '浏览文件夹', mode + ' 档的按钮文案应是「浏览文件夹」');
        assert.doesNotMatch(label, /…|\.\.\./);
      }
      for (const old of ['选择文件夹', '浏览']) {
        assert.equal(nodesOfType(withBrowse('native'), 'button').map(textOf).includes(old), false,
          '两档字面已合一，不该再有「' + old + '」');
      }
    });
  });
});
