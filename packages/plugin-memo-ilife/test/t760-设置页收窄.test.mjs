/**
 * #760 · 备忘录设置页收窄（照记账样板 #749 铺开 ＋ 飞书 CLI 状态行）——**插件侧**验收。
 *
 * 判据（逐条对应票面《目标》与补注）：
 *   ① 行表 4 行：可改 2（数据目录／附件目录）＋ 只读 2（库文件名／HTML 产物目录名，标 resolveFrom）。
 *   ② toDraft：只读行显示 resolved 格；缺席（旧技能）显示空串；可改目录行空串时显示落点
 *     （db.dir → dataDir，media.dir → resolved.mediaDir）。
 *   ③ fromDraft 只收可改两行；dirty 只看可改行（只读行不把面板变「未保存」）。
 *   ④ Row：只读行控件 disabled 且不接 onChange；只读目录行按钮保留但不可点击；
 *      控件文案无省略号（按钮「选择文件夹」／「浏览」逐字）。
 *   ⑤ LarkStatus：三档文案 ＋ 复制安装指引按钮（点调 onCopy，载荷即 prompt 全文）＋
 *      官网行逐字显示 ＋ 可点新窗口跳转（href＋target＋rel）；旧技能（缺席）不崩。
 *   ⑥ copyPrompt：通道成功 → true；失败／缺席 → false（调用方落字手动复制，不抛）。
 *
 * 运行：`node --test packages/plugin-memo-ilife/test/t760-设置页收窄.test.mjs`
 * （需先编 `plugin-memo-ilife` 主机侧 ＋ `build:client` 产物侧）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Row } from 'dsh-life-pack/config-panel';
import { toDraft as sharedToDraft, fromDraft as sharedFromDraft } from '../../plugin-manager/dist/config-panel-value.js';
import { loadClientBundle } from '../../../test/helpers/client-bundle.mjs';
import { CONFIG_ITEMS } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 自家附加块（飞书状态行／复制通道）仍住本家，从产物取；行渲染与取值／填值收进共用件（#909）。 */
const { LarkStatus, copyPrompt } = loadClientBundle(join(HERE, '..')).exports;

/* ═══ 读那棵树的小工具 ═══
   行渲染与附加块都从共用面板／本家产物取：那是**真 React**，元素树里子节点住在 `props.children`，
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

/** 官网行独立字面量（与技能侧 `LARK_WEBSITE_LINE` 逐字对读）。 */
const WEBSITE_LINE = '飞书CLI官网为：https://www.feishu.cn/feishu-cli';
const WEBSITE_URL = 'https://www.feishu.cn/feishu-cli';

function fakeBrowser(mode = 'browse') {
  return { mode, onOpen: () => {} };
}

describe('#760 备忘录设置页收窄 · 插件侧', () => {
  describe('① 行表 4 行（可改 2 ＋ 只读 2）', () => {
    it('键集合与读写分组', () => {
      assert.deepEqual(CONFIG_ITEMS.map((i) => i.key), ['db.dir', 'db.name', 'html.dir', 'media.dir']);
      assert.deepEqual(
        CONFIG_ITEMS.filter((i) => i.readonly !== true).map((i) => i.key),
        ['db.dir', 'media.dir'],
      );
      assert.deepEqual(
        CONFIG_ITEMS.filter((i) => i.readonly === true).map((i) => i.key),
        ['db.name', 'html.dir'],
      );
    });
  });

  describe('② toDraft：只读显示 resolved，缺席显示空串', () => {
    const values = { db: { dir: '', name: 'memo.db' }, html: { dir: 'memo_html' }, media: { dir: '' } };
    const prefill = {
      dataDir: '/d',
      resolved: { dbDir: '/d', dbFile: '/d/memo.db', htmlDir: '/d/memo_html', mediaDir: '/d/media' },
    };

    it('只读行显示 resolved 格', () => {
      const draft = toDraft(values, prefill);
      assert.equal(draft['db.name'], '/d/memo.db');
      assert.equal(draft['html.dir'], '/d/memo_html');
    });

    it('旧技能（无 resolved）⇒ 只读行显示空串，不编路径', () => {
      const draft = toDraft(values, { dataDir: '/d' });
      assert.equal(draft['db.name'], '');
      assert.equal(draft['html.dir'], '');
    });

    it('可改目录行空串时显示落点', () => {
      const draft = toDraft(values, prefill);
      assert.equal(draft['db.dir'], '/d', 'db.dir 空串 ⇒ dataDir');
      assert.equal(draft['media.dir'], '/d/media', 'media.dir 空串 ⇒ resolved.mediaDir');
    });

    it('有值时显示值本身', () => {
      const draft = toDraft(
        { db: { dir: '/x', name: 'memo.db' }, html: { dir: 'memo_html' }, media: { dir: '/y' } },
        prefill,
      );
      assert.equal(draft['db.dir'], '/x');
      assert.equal(draft['media.dir'], '/y');
    });
  });

  describe('③ fromDraft 只收可改行，dirty 只看可改行', () => {
    it('只读行不进保存', () => {
      const values = fromDraft({
        'db.dir': '/d', 'db.name': '/d/evil.db', 'html.dir': '/d/evil', 'media.dir': '/m',
      });
      assert.deepEqual(values, { db: { dir: '/d' }, media: { dir: '/m' } });
    });

    it('只读行变化不脏，可改行变化才脏（与 client dirty 口径同形）', () => {
      const surface = {
        values: { db: { dir: '', name: 'memo.db' }, html: { dir: 'memo_html' }, media: { dir: '' } },
        dataDir: '/d',
        resolved: { dbDir: '/d', dbFile: '/d/memo.db', htmlDir: '/d/memo_html', mediaDir: '/d/media' },
      };
      const base = toDraft(surface.values, surface);
      const editable = CONFIG_ITEMS.filter((i) => i.readonly !== true);
      const dirtyOf = (draft) => editable.some((i) => (draft[i.key] ?? '') !== (base[i.key] ?? ''));
      assert.equal(dirtyOf({ ...base }), false);
      assert.equal(dirtyOf({ ...base, 'db.name': '/d/other.db' }), false, '只读行再怎么变也不脏');
      assert.equal(dirtyOf({ ...base, 'media.dir': '/other' }), true, '可改行变了才脏');
    });
  });

  describe('④ Row：只读 disabled＋无 onChange，按钮保留但不可点，文案无省略号', () => {
    it('只读文本行：input disabled，onChange 不接', () => {
      const item = CONFIG_ITEMS.find((i) => i.key === 'db.name');
      const node = Row({ item, value: '/d/memo.db', disabled: false, onChange: () => {} });
      const inputs = nodesOfType(node, 'input');
      assert.equal(inputs.length, 1);
      assert.equal(inputs[0].props.disabled, true);
      assert.equal(inputs[0].props.onChange, undefined, '只读行不接 onChange');
    });

    it('可改目录行：目录入口可用，文案两档合一的「浏览文件夹」', () => {
      const item = CONFIG_ITEMS.find((i) => i.key === 'media.dir');
      for (const mode of ['native', 'browse']) {
        const node = Row({ item, value: '/d/media', disabled: false, onChange: () => {}, browser: fakeBrowser(mode) });
        const browse = nodesOfType(node, 'button').filter(isBrowseButton);
        assert.equal(browse.length, 1, mode + ' 档应有恰一枚目录入口');
        assert.equal(textOf(browse[0]), '浏览文件夹');
        assert.equal(browse[0].props.disabled, false);
      }
    });

    it('只读目录行（合成项）：一枚浏览按钮都不画（定稿 v3 ①）', () => {
      const item = { key: 'x.dir', title: '合成只读目录', tier: 'common', control: 'directory', hint: '合成', readonly: true, resolveFrom: 'dbDir' };
      const node = Row({ item, value: '/d', disabled: false, onChange: () => {}, browser: fakeBrowser('native') });
      assert.deepEqual(nodesOfType(node, 'button').filter(isBrowseButton), [], '只读目录行不该有目录入口按钮');
      assert.equal(nodesOfType(node, 'input')[0].props.disabled, true, '控件仍不可改');
      assert.equal(nodesOfType(node, 'input')[0].props.value, '/d', '只读行照旧显示技能算好的那个值');
    });

    it('行表文案无省略号（标题／hint）', () => {
      for (const i of CONFIG_ITEMS) {
        assert.equal(i.title.includes('…'), false, `${i.key} 标题含省略号`);
        assert.equal(i.hint.includes('…'), false, `${i.key} hint 含省略号`);
        assert.equal(i.title.includes('...'), false, `${i.key} 标题含省略号`);
      }
    });
  });

  describe('⑤ LarkStatus：三档＋复制按钮＋官网链接', () => {
    function render(lark) {
      let copied = null;
      const node = LarkStatus({ lark, onCopy: (prompt) => { copied = prompt; } });
      return { node, copied: () => copied };
    }

    it('missing：红字＋复制按钮＋官网行', () => {
      const lark = { tier: 'missing', cliPath: null, version: null, prompt: 'PROMPT', websiteLine: WEBSITE_LINE, websiteUrl: WEBSITE_URL };
      const { node, copied } = render(lark);
      assert.ok(textOf(node).includes('没找到飞书 CLI'), '状态文案：' + textOf(node));
      const buttons = nodesOfType(node, 'button');
      assert.equal(buttons.length, 1);
      assert.equal(textOf(buttons[0]), '复制安装指引');
      buttons[0].props.onClick();
      assert.equal(copied(), 'PROMPT', '按钮载荷即 prompt 全文');
      const links = nodesOfType(node, 'a');
      assert.equal(links.length, 1);
      assert.equal(textOf(links[0]), WEBSITE_LINE, '官网行逐字显示成文字');
      assert.equal(links[0].props.href, WEBSITE_URL);
      assert.equal(links[0].props.target, '_blank', '点一下新窗口跳转');
    });

    it('partial：报路径＋同一个按钮＋官网链接', () => {
      const lark = { tier: 'partial', cliPath: '/c/lark-cli', version: 'v', prompt: 'P', websiteLine: WEBSITE_LINE, websiteUrl: WEBSITE_URL };
      const { node } = render(lark);
      assert.ok(textOf(node).includes('/c/lark-cli'), 'partial 报路径：' + textOf(node));
      assert.equal(textOf(nodesOfType(node, 'button')[0]), '复制安装指引', '同一个按钮');
      assert.equal(textOf(nodesOfType(node, 'a')[0]), WEBSITE_LINE, '三档都要有官网行');
    });

    it('full：报路径与版本＋同一个按钮＋官网链接', () => {
      const lark = { tier: 'full', cliPath: '/c/lark-cli', version: '1.0.82', prompt: 'P', websiteLine: WEBSITE_LINE, websiteUrl: WEBSITE_URL };
      const { node } = render(lark);
      assert.ok(textOf(node).includes('/c/lark-cli') && textOf(node).includes('1.0.82'), '就绪报路径与版本：' + textOf(node));
      assert.equal(textOf(nodesOfType(node, 'button')[0]), '复制安装指引');
      assert.equal(textOf(nodesOfType(node, 'a')[0]), WEBSITE_LINE);
    });

    it('旧技能（缺席）⇒ 弱提示，不崩', () => {
      const node = LarkStatus({ lark: undefined, onCopy: () => {} });
      assert.ok(textOf(node).includes('飞书 CLI'));
      assert.equal(nodesOfType(node, 'button').length, 0, '无 prompt 文本时不画复制按钮');
    });
  });

  describe('⑥ copyPrompt：成功 true，失败 false，不抛', () => {
    it('通道成功 ⇒ true', async () => {
      let seen = null;
      const ok = await copyPrompt('hello', { writeText: (t) => { seen = t; return Promise.resolve(); } });
      assert.equal(ok, true);
      assert.equal(seen, 'hello');
    });

    it('通道拒绝 ⇒ false', async () => {
      const ok = await copyPrompt('hello', { writeText: () => Promise.reject(new Error('denied')) });
      assert.equal(ok, false);
    });

    it('通道缺席 ⇒ false', async () => {
      assert.equal(await copyPrompt('hello', null), false);
    });
  });
});
