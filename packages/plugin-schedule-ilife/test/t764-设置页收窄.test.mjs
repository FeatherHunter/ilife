// #764 作息设置页收窄 · 插件侧（照 #749 样板的插件侧 16 条，取本家 3 行＋飞书状态行的子集）。
//
// 六组判据：
//   A 行表形状（可改 1／只读 2／高级组空；标题与 hint 口径）
//   B 只读值只来自回执（缺回执则空串，面板不拼路径）
//   C 只读行不进保存（fromDraft 跳过；只读改动不脏）
//   D 只读渲染（控件 disabled、不接 onChange；目录行按钮保留＋不可点）
//   E 控件文案零省略号
//   F 飞书状态行（三档判据由技能侧出；复制 prompt；官网行逐字＋可点击）
//   G 端到端经真 CLI（读整面带 resolved；体检有 lark.cli 那一项）
//
// 运行：先 `tsc -b packages/plugin-schedule-ilife` ＋重建 client 束（`pnpm --filter dsh-schedule-ilife run build:client`），再
//   `node --test packages/plugin-schedule-ilife/test/t764-设置页收窄.test.mjs`。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDirOf, setupConfigTestBase } from '../../../test/helpers/config-test-base.mjs';
import { Row } from 'dsh-life-pack/config-panel';
import { toDraft as sharedToDraft, fromDraft as sharedFromDraft } from '../../plugin-manager/dist/config-panel-value.js';
import { loadClientBundle } from '../../../test/helpers/client-bundle.mjs';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT, readPath } from '../dist/index.js';
import { readConfigSurface, readConfigHealth } from '../dist/bridge.js';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 飞书状态行那几件仍住本家，从产物取；行渲染与取值／填值收进共用件（#909）。 */
const { larkItemOf, copyText, clipboardOf, LARK_OFFICIAL_LINE, LARK_OFFICIAL_URL, LARK_PROMPT_V5 } = loadClientBundle(join(HERE, '..')).exports;

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

describe('#764 作息设置页收窄 · 插件侧', () => {
  let base;
  before(() => {
    base = setupConfigTestBase();
  });
  after(() => {
    base.cleanup();
  });

  describe('A 行表形状', () => {
    it('3 行：可改 1（数据目录）＋只读 2（库文件名／HELP 产物目录）；高级组空', () => {
      assert.equal(CONFIG_ITEMS.length, 3);
      assert.equal(COMMON_ITEM_COUNT, 3);
      const editable = CONFIG_ITEMS.filter((i) => i.readonly !== true).map((i) => i.key);
      assert.deepEqual(editable, ['db.dir']);
      const readonly = CONFIG_ITEMS.filter((i) => i.readonly === true).map((i) => i.key);
      assert.deepEqual(readonly, ['db.name', 'html.dir']);
    });

    it('只读行标了显示来源；标题照定稿（HELP 产物目录）', () => {
      const byKey = Object.fromEntries(CONFIG_ITEMS.map((i) => [i.key, i]));
      assert.equal(byKey['db.dir'].control, 'directory');
      assert.equal(byKey['db.dir'].prefillFrom, 'dataDir');
      assert.equal(byKey['db.name'].resolveFrom, 'dbFile');
      assert.equal(byKey['html.dir'].resolveFrom, 'htmlDir');
      assert.equal(byKey['html.dir'].title, 'HELP 产物目录');
    });

    it('#863 起只读 hint 不再写那句提示（只读由行表标记＋disabled 外观承担）', () => {
      for (const k of ['db.name', 'html.dir']) {
        const item = CONFIG_ITEMS.find((i) => i.key === k);
        assert.doesNotMatch(item.hint, /只读，要改请编辑配置文件/);
        assert.doesNotMatch(item.hint, /改请编辑配置文件/);
        assert.equal(item.readonly, true, '只读标记须保留（外观与保存行为靠它）');
      }
    });
  });

  describe('B 只读值只来自回执', () => {
    it('有 resolved ⇒ 显示技能算好的绝对路径；没有 ⇒ 空串（不编路径）', () => {
      const values = { db: { dir: '', name: 'schedule_data.db' }, html: { dir: 'schedule_html/help' } };
      const prefill = { dataDir: 'D:\\home\\.ilife\\data', resolved: { dbDir: 'D:\\home\\.ilife\\data', dbFile: 'D:\\home\\.ilife\\data\\schedule_data.db', htmlDir: 'D:\\home\\.ilife\\data\\schedule_html\\help' } };
      const draft = toDraft(values, prefill);
      assert.equal(draft['db.dir'], 'D:\\home\\.ilife\\data', '可改行取值空着 ⇒ 预填生效目录');
      assert.equal(draft['db.name'], 'D:\\home\\.ilife\\data\\schedule_data.db');
      assert.equal(draft['html.dir'], 'D:\\home\\.ilife\\data\\schedule_html\\help');
      const bare = toDraft(values, {});
      assert.equal(bare['db.name'], '', '旧技能缺 resolved ⇒ 只读行空串，不编路径');
      assert.equal(bare['html.dir'], '');
    });
  });

  describe('C 只读行不进保存', () => {
    it('fromDraft 只收 db.dir；只读格改了也不脏（保存载荷不变）', () => {
      const draft = { 'db.dir': 'D:\\x', 'db.name': 'SHOWN', 'html.dir': 'SHOWN2' };
      assert.deepEqual(fromDraft(draft), { db: { dir: 'D:\\x' } });
      const values = { db: { dir: '', name: 'schedule_data.db' }, html: { dir: 'schedule_html/help' } };
      const surface = { dataDir: 'D:\\home\\.ilife\\data', resolved: { dbDir: 'D:\\home\\.ilife\\data', dbFile: 'D:\\home\\.ilife\\data\\schedule_data.db', htmlDir: 'D:\\home\\.ilife\\data\\schedule_html\\help' } };
      const draft0 = toDraft(values, surface);
      const tampered = { ...draft0, 'db.name': '有人改了只读格' };
      assert.deepEqual(fromDraft(tampered), fromDraft(draft0), '只读格的改动进不了保存载荷 ⇒ 脏值只看可改行');
    });
  });

  describe('D 只读渲染（v3 rowShell：零输入框、值原样上屏、行尾一枚复制）', () => {
    it('只读文本行：零输入框、值原样上屏、行尾恰一枚复制', () => {
      const item = CONFIG_ITEMS.find((i) => i.key === 'db.name');
      const node = Row({ item, value: 'D:\\x\\schedule_data.db', disabled: false, onChange: () => { throw new Error('只读行不该被改'); } });
      assert.deepEqual(nodesOfType(node, 'input'), [], '只读行不画输入框（v3：标签—值同行，改不动）');
      assert.match(textOf(node), /schedule_data\.db/, '显示技能算好的绝对路径');
      const buttons = nodesOfType(node, 'button');
      assert.equal(buttons.length, 1, '行尾恰一枚复制');
      assert.equal(textOf(buttons[0]), '复制');
    });

    it('只读目录行：一枚浏览按钮都不画（定稿 v3 ①：不摆点了也没反应的死按钮）', () => {
      const dirItem = CONFIG_ITEMS.find((i) => i.key === 'db.dir');
      const readonlyDir = { ...dirItem, readonly: true };
      const node = Row({ item: readonlyDir, value: 'D:\\x', disabled: false, onChange: () => {}, browser: { mode: 'native', onOpen: () => {} } });
      assert.deepEqual(nodesOfType(node, 'button').filter(isBrowseButton), [], '只读目录行不该有目录入口按钮');
      assert.deepEqual(nodesOfType(node, 'input'), [], '只读行不画输入框（改不动）');
      assert.equal(nodesOfType(node, 'button').length, 1, '行尾那一枚复制照旧');
      const editable = nodesOfType(Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'native', onOpen: () => {} } }), 'button').filter(isBrowseButton);
      assert.equal(editable.length, 1, '可改行（数据目录）照旧有那枚入口');
      assert.equal(editable[0].props.disabled, false);
    });
  });

  describe('E 控件文案零省略号', () => {
    it('源码里没有 …；目录入口字面两档合一的「浏览文件夹」', () => {
      const src = readFileSync(join(HERE, '..', 'src', 'client.ts'), 'utf8');
      assert.equal(src.includes('…'), false, '控件文案不得出现省略号');
      const dirItem = CONFIG_ITEMS.find((i) => i.key === 'db.dir');
      for (const mode of ['native', 'browse']) {
        const node = Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser: { mode, onOpen: () => {} } });
        const browse = nodesOfType(node, 'button').filter(isBrowseButton);
        assert.equal(browse.length, 1, mode + ' 档应有恰一枚目录入口');
        assert.equal(textOf(browse[0]), '浏览文件夹', mode + ' 档的字面应是「浏览文件夹」');
      }
      const labels = nodesOfType(Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'native', onOpen: () => {} } }), 'button').map(textOf);
      for (const old of ['选择文件夹', '浏览']) assert.equal(labels.includes(old), false, '两档字面已合一，不该再有「' + old + '」');
    });
  });

  describe('F 飞书状态行', () => {
    it('larkItemOf：只认体检报告里 lark.cli 那一项，形状不对回 null', () => {
      const report = { items: [{ id: 'db.dir', status: 'green', message: 'x', action: '' }, { id: 'lark.cli', status: 'yellow', message: '找到了 C:/x，但还没登录／日历读不到。', action: 'a' }] };
      assert.deepEqual(larkItemOf(report), { id: 'lark.cli', status: 'yellow', message: '找到了 C:/x，但还没登录／日历读不到。', action: 'a' });
      for (const bad of [null, {}, { items: [] }, { items: [{ id: 'lark.cli' }] }, { items: [{ id: 'lark.cli', status: 'yellow' }] }]) {
        assert.equal(larkItemOf(bad), null, '坏形状回 null：' + JSON.stringify(bad));
      }
    });

    it('官网行逐字＋可点击地址；prompt 含终态与官方指南', () => {
      assert.equal(LARK_OFFICIAL_LINE, '飞书CLI官网为：https://www.feishu.cn/feishu-cli');
      assert.equal(LARK_OFFICIAL_URL, 'https://www.feishu.cn/feishu-cli');
      assert.match(LARK_PROMPT_V5, /lark-cli auth login --no-wait --json --domain calendar,task/);
      assert.match(LARK_PROMPT_V5, /lark-cli calendar \+agenda/);
      assert.match(LARK_PROMPT_V5, /参考官网：https:\/\/www\.feishu\.cn\/feishu-cli/);
    });

    it('copyText：剪贴板行 ⇒ 真；被拒／缺席 ⇒ 假（永不抛）', async () => {
      assert.equal(await copyText('x', { clipboard: { writeText: async () => {} } }), true);
      assert.equal(await copyText('x', { clipboard: { writeText: async () => { throw new Error('denied'); } } }), false);
      assert.equal(await copyText('x', { clipboard: { writeText: async () => { throw new Error('denied'); } }, execCopy: () => true }), true);
      assert.equal(await copyText('x', {}), false);
      assert.equal(clipboardOf(), null, 'node 单测里没有 navigator ⇒ null（组件里据此走失败态，不炸）');
    });
  });

  describe('G 端到端经真 CLI', () => {
    it('读整面带 resolved 三格（与技能侧同形）', () => {
      const s = readConfigSurface();
      assert.equal(s.path, join(configDirOf(base.dir), 'schedule.yaml'));
      assert.ok(s.resolved, '回执须带 resolved 组');
      assert.deepEqual(Object.keys(s.resolved).sort(), ['dbDir', 'dbFile', 'htmlDir']);
      assert.equal(s.resolved.dbDir, join(configDirOf(base.dir), 'data'));
      for (const item of CONFIG_ITEMS) assert.notEqual(readPath(s.values, item.key), undefined, `回执里缺 ${item.key}`);
    });

    it('体检有 lark.cli 那一项（三档之一，话术非空）', () => {
      const report = readConfigHealth();
      const item = larkItemOf(report);
      assert.ok(item, '体检报告里须有 lark.cli');
      assert.ok(['red', 'yellow', 'green'].includes(item.status), '三档之一：' + item.status);
      assert.ok(item.message.trim().length > 0);
      console.log('#764 面板状态行读数：status=' + item.status + ' message=' + item.message);
    });
  });
});
