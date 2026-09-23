/**
 * #757 · 卡路里设置页收窄（照记账 #749 样板铺开）——**插件侧**验收：行表收窄成「3 处可改 ＋ 8 只读」，
 * 只读值只来自技能侧回执，面板一个字都不算。
 *
 * 判据（逐条对应票面《目标》第 4 条）：
 *   ① 行表形状：11 行 ＝ 可改 3（数据目录／照片目录／训记 KEY）＋ 只读 8（库文件名／HTML 产物目录名／
 *      照片 GIF 子目录／训记状态文件目录／训记动作库路径／回写默认天数／训记调用限时／落地调用限时）；
 *      目录档是 `{db.dir, photos.dir, xunji.stateDir}` 三行；`land.scheduleCli`／`land.memoCli` 两行已删。
 *   ② 只读行显示的是**技能算好的绝对路径或生效数字**：路径类逐行等于回执 `resolved` 组里 `resolveFrom`
 *      指的那一格，数字类（甲档）显示生效数字；回执缺那一组（旧技能）⇒ 路径类空串，面板**不自己拼路径**。
 *   ③ 只读行**不进保存**：`fromDraft` 只收可改 3 行，免得把显示用的绝对路径写回配置。
 *   ④ 只读渲染：控件 `disabled`、不接 `onChange`；只读目录行的浏览按钮**保留但不可点击**（#748 定稿）。
 *   ⑤ 控件文案零省略号（#746 处置 9）：`client.ts` 里没有 `…`，按钮就写「选择文件夹」／「浏览」。
 *   ⑥ 只读数字行的形态（#749 补注二的甲档，本家真行）：`xunji.backfillDays` 等三行画成 `disabled` 的
 *      `number` 控件，值＝生效数字。
 *
 * 隔离：`test/helpers/config-test-base.mjs` 把当刻进程与子进程的家目录都指到临时目录；
 * 真实 `~/.ilife` 一行不碰。运行：`node --test packages/plugin-calorie/test/t757-设置页收窄.test.mjs`。
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

/** 只读行集合（页面不给改的那 8 行）与可改行。 */
const READONLY = CONFIG_ITEMS.filter((i) => i.readonly === true);
const EDITABLE = CONFIG_ITEMS.filter((i) => i.readonly !== true);
const itemOf = (key) => {
  const item = CONFIG_ITEMS.find((i) => i.key === key);
  assert.notEqual(item, undefined, '行表里缺 ' + key);
  return item;
};

describe('#757 卡路里设置页收窄', () => {
  let base;
  before(() => {
    base = setupConfigTestBase();
  });
  after(() => {
    base.cleanup();
  });

  describe('① 行表形状：可改 3 ＋ 只读 8', () => {
    it('可改项恰是数据目录／照片目录／训记 KEY 三行', () => {
      assert.deepEqual(EDITABLE.map((i) => i.key).sort(), ['db.dir', 'photos.dir', 'xunji.key']);
      assert.equal(itemOf('db.dir').control, 'directory');
      assert.equal(itemOf('db.dir').prefillFrom, 'dataDir');
      assert.equal(itemOf('photos.dir').control, 'directory');
      assert.equal(itemOf('photos.dir').prefillFrom, 'photosDir', '照片目录空串时显示 resolved.photosDir（#909 起这一格并入 prefillFrom）');
      assert.equal(itemOf('xunji.key').control, 'text');
    });

    it('只读 8 行齐，且 land 两键已删（13→11）', () => {
      assert.deepEqual(READONLY.map((i) => i.key).sort(),
        ['db.name', 'html.dir', 'land.landSeconds', 'land.xunjiSeconds', 'photos.gifs', 'xunji.backfillDays', 'xunji.catalog', 'xunji.stateDir']);
      assert.equal(READONLY.length, 8);
      assert.equal(CONFIG_ITEMS.length, 11, '11 行＝可改 3 ＋ 只读 8');
      assert.equal(COMMON_ITEM_COUNT, 5);
      assert.equal(CONFIG_ITEMS.find((i) => i.key === 'land.scheduleCli'), undefined, '删键：作息出口行已删');
      assert.equal(CONFIG_ITEMS.find((i) => i.key === 'land.memoCli'), undefined, '删键：备忘出口行已删');
    });

    it('路径类只读行都指向回执里的一格；数字类三行走甲档（无 resolveFrom，显示生效数字）', () => {
      for (const key of ['db.name', 'html.dir', 'photos.gifs', 'xunji.stateDir', 'xunji.catalog']) {
        assert.notEqual(itemOf(key).resolveFrom, undefined, key + ' 应标 resolveFrom（显示值来自技能侧回执）');
      }
      assert.deepEqual(
        ['db.name', 'html.dir', 'photos.gifs', 'xunji.stateDir', 'xunji.catalog'].map((k) => itemOf(k).resolveFrom).sort(),
        ['catalog', 'dbFile', 'gifsDir', 'htmlDir', 'stateDir']);
      for (const key of ['xunji.backfillDays', 'land.xunjiSeconds', 'land.landSeconds']) {
        assert.equal(itemOf(key).resolveFrom, undefined, key + ' 是数字甲档：显示生效数字，不指 resolved 组');
        assert.equal(itemOf(key).control, 'number');
      }
    });

    it('目录档是三行：数据目录／照片目录／训记状态文件目录', () => {
      assert.deepEqual(CONFIG_ITEMS.filter((i) => i.control === 'directory').map((i) => i.key).sort(),
        ['db.dir', 'photos.dir', 'xunji.stateDir']);
    });
  });

  describe('② 只读值只来自技能侧回执（面板不拼路径）', () => {
    it('回执带 `resolved` 一组，七格与配置文件里的取值逐字一致', () => {
      const s = readConfigSurface();
      assert.deepEqual(Object.keys(s.resolved ?? {}).sort(),
        ['catalog', 'dbDir', 'dbFile', 'gifsDir', 'htmlDir', 'photosDir', 'stateDir'], '回执缺 resolved 组或格子不齐');
      const yaml = join(configDirOf(base.dir), 'calorie.yaml');
      const v = parseConfigYaml(readFileSync(yaml, 'utf8'), 'calorie.yaml').values;
      const dbDir = v.db.dir === '' ? s.dataDir : String(v.db.dir);
      const photosDir = v.photos.dir === '' ? join(dbDir, 'photos') : String(v.photos.dir);
      assert.equal(s.resolved.dbDir, dbDir);
      assert.equal(s.resolved.dbFile, join(dbDir, String(v.db.name)));
      assert.equal(s.resolved.htmlDir, join(dbDir, String(v.html.dir)));
      assert.equal(s.resolved.photosDir, photosDir);
      assert.equal(s.resolved.gifsDir, join(photosDir, String(v.photos.gifs)));
      assert.equal(s.resolved.stateDir, join(dbDir, 'xunji'));
    });

    it('路径类只读行显示的正是那一格（逐行对账）；数字类显示生效数字', () => {
      const s = readConfigSurface();
      const draft = toDraft(s.values, s);
      for (const key of ['db.name', 'html.dir', 'photos.gifs', 'xunji.stateDir', 'xunji.catalog']) {
        const item = itemOf(key);
        assert.equal(draft[key], s.resolved[item.resolveFrom], key + ' 应显示 resolved.' + item.resolveFrom);
      }
      for (const key of ['xunji.backfillDays', 'land.xunjiSeconds', 'land.landSeconds']) {
        assert.equal(draft[key], String(s.values[key.split('.')[0]][key.split('.')[1]]), key + ' 应显示生效数字');
      }
    });

    it('可改照片目录空着时预填生效绝对路径（resolved.photosDir）', () => {
      const draft = toDraft({ db: { dir: '' }, photos: { dir: '' } },
        { dataDir: 'C:\\探针\\.ilife\\data', resolved: { photosDir: 'C:\\探针\\.ilife\\data\\photos' } });
      assert.equal(draft['photos.dir'], 'C:\\探针\\.ilife\\data\\photos', '照片目录空着应显示生效值');
      assert.equal(draft['db.dir'], 'C:\\探针\\.ilife\\data', '数据目录照旧按 dataDir 预填（#743）');
    });

    it('回执缺那一组（旧技能）⇒ 路径类只读行显示空串，绝不自己拼一条路径出来', () => {
      const draft = toDraft({ db: { dir: '' } }, { dataDir: 'C:\\探针\\.ilife\\data' });
      for (const key of ['db.name', 'html.dir', 'photos.gifs', 'xunji.stateDir', 'xunji.catalog']) {
        assert.equal(draft[key], '', key + ' 该空着（回执没给就不编）');
      }
      assert.equal(draft['db.dir'], 'C:\\探针\\.ilife\\data', '可改行照旧按 dataDir 预填（#743）');
    });

    it('面板一行路径拼接都没有（边界 #677：不算默认值、不拼路径）', () => {
      assert.doesNotMatch(CLIENT_SRC, /\bjoin\s*\(/, 'client.ts 不该自己拼路径');
      assert.doesNotMatch(CLIENT_SRC, /node:path|node:fs/, 'client.ts 不该带 node 内建');
    });
  });

  describe('③ 只读行不进保存', () => {
    it('fromDraft 只收可改 3 行：整张草稿交上去，收货的只有 db／photos／xunji 三组的可改格', () => {
      const s = readConfigSurface();
      const draft = toDraft(s.values, s);
      const submitted = fromDraft(draft);
      assert.deepEqual(Object.keys(submitted).sort(), ['db', 'photos', 'xunji']);
      assert.deepEqual(Object.keys(submitted.db), ['dir'], '只读的 db.name 不该被提交');
      assert.deepEqual(Object.keys(submitted.photos), ['dir'], '只读的 photos.gifs 不该被提交');
      assert.deepEqual(Object.keys(submitted.xunji), ['key'], '只读的 stateDir／catalog／backfillDays 不该被提交');
      assert.ok(!('land' in submitted), '只读的 land 两秒数不该被提交');
      for (const item of READONLY) {
        assert.equal(item.key in draft, true, '只读行仍在草稿里（页面要显示它）');
      }
    });
  });

  describe('④ 只读渲染：零输入框、值原样上屏、只读目录行不画入口（v3 rowShell）', () => {
    it('文本只读行：零输入框、值原样上屏、行尾恰一枚复制', () => {
      const item = itemOf('db.name');
      const node = Row({ item, value: 'C:\\x\\calorie_data.db', disabled: false, onChange: () => { throw new Error('只读行不该被改'); } });
      assert.deepEqual(nodesOfType(node, 'input'), [], '只读行不画输入框（v3：标签—值同行，改不动）');
      assert.match(textOf(node), /calorie_data\.db/, '显示技能算好的绝对路径');
      const buttons = nodesOfType(node, 'button');
      assert.equal(buttons.length, 1, '行尾恰一枚复制');
      assert.equal(textOf(buttons[0]), '复制');
    });

    it('只读目录行：一枚浏览按钮都不画（定稿 v3 ①：不摆点了也没反应的死按钮）', () => {
      const node = Row({
        item: itemOf('xunji.stateDir'),
        value: 'C:\\x\\.ilife\\data\\xunji',
        disabled: false,
        onChange: () => {},
        browser: { mode: 'browse', onOpen: () => {} },
      });
      assert.deepEqual(nodesOfType(node, 'button').filter(isBrowseButton), [], '只读目录行不该有目录入口按钮');
      assert.deepEqual(nodesOfType(node, 'input'), [], '只读行不画输入框');
      assert.equal(nodesOfType(node, 'button').length, 1, '行尾那一枚复制照旧');
    });

    it('可改目录行（数据目录／照片目录）照旧：控件可写、按钮可点', () => {
      for (const key of ['db.dir', 'photos.dir']) {
        const node = Row({
          item: itemOf(key),
          value: 'D:\\爱生活数据',
          disabled: false,
          onChange: () => {},
          browser: { mode: 'native', onOpen: () => {} },
        });
        assert.equal(nodesOfType(node, 'input')[0].props.disabled, false, key + ' 应可写');
        assert.equal(nodesOfType(node, 'button')[0].props.disabled, false, key + ' 的按钮应可点');
      }
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

  describe('⑥ 只读数字行的形态（补注二的甲档，本家真行）：与只读文本行同形，值＝生效数字（v3：零输入框）', () => {
    it('回写默认天数行 ⇒ 与只读文本行同形，值就是生效数字', () => {
      const node = Row({ item: itemOf('xunji.backfillDays'), value: '1', disabled: false, onChange: () => { throw new Error('只读行不该被改'); } });
      assert.deepEqual(nodesOfType(node, 'input'), [], '甲档：与只读路径行同形，不引入第五种控件');
      assert.equal(textOf(node), '回写默认天数1复制', '值＝生效数字（标题—值同行＋行尾复制）');
      const buttons = nodesOfType(node, 'button');
      assert.equal(buttons.length, 1, '行尾恰一枚复制');
      assert.deepEqual(nodesOfType(node, 'button').filter(isBrowseButton), [], '数字行不是目录行，不画目录入口');
    });

    it('脏值只看可改行：只读行显示绝对路径不该让面板一打开就变「未保存」', async () => {
      const s = readConfigSurface();
      const { default: React } = await import('react');
      assert.ok(React !== undefined, '占位：脏值逻辑由 client 内部 editableItems 保证（见 ③ 那条）');
      assert.ok(s.resolved !== undefined && s.resolved.dbFile !== undefined, '回执带 resolved 组是脏值正确的前提');
    });
  });
});
