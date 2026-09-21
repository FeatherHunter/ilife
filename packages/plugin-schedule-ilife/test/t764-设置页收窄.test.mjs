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
import { loadClientBundle, nodesOfType, textOf } from '../../../test/helpers/client-bundle.mjs';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT, readPath } from '../dist/index.js';
import { readConfigSurface, readConfigHealth } from '../dist/bridge.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = loadClientBundle(join(HERE, '..'));
const { Row, toDraft, fromDraft, larkItemOf, copyText, clipboardOf, LARK_OFFICIAL_LINE, LARK_OFFICIAL_URL, LARK_PROMPT_V5 } = CLIENT.exports;

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

    it('只读 hint 指配置文件（不让人去页面上改）', () => {
      for (const k of ['db.name', 'html.dir']) {
        const hint = CONFIG_ITEMS.find((i) => i.key === k).hint;
        assert.match(hint, /只读/);
        assert.match(hint, /配置文件/);
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

  describe('D 只读渲染', () => {
    it('只读文本行：控件 disabled、不接 onChange', () => {
      const item = CONFIG_ITEMS.find((i) => i.key === 'db.name');
      const node = Row({ item, value: 'D:\\x\\schedule_data.db', disabled: false, onChange: () => { throw new Error('只读行不该被改'); } });
      const inputs = nodesOfType(node, 'input');
      assert.equal(inputs.length, 1);
      assert.equal(inputs[0].props.disabled, true);
      assert.equal(inputs[0].props.onChange, undefined);
    });

    it('只读目录行：浏览按钮保留但不可点（入口不作废，只是不能改）', () => {
      const dirItem = CONFIG_ITEMS.find((i) => i.key === 'db.dir');
      const readonlyDir = { ...dirItem, readonly: true };
      const node = Row({ item: readonlyDir, value: 'D:\\x', disabled: false, onChange: () => {}, browser: { mode: 'native', onOpen: () => {} } });
      const buttons = nodesOfType(node, 'button');
      assert.equal(buttons.length, 1, '按钮保留');
      assert.equal(buttons[0].props.disabled, true, '但不可点');
      assert.equal(nodesOfType(Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'native', onOpen: () => {} } }), 'button')[0].props.disabled, false,
        '可改行（数据目录）的按钮照常可点');
    });
  });

  describe('E 控件文案零省略号', () => {
    it('源码里没有 …；按钮字面就是「选择文件夹」／「浏览」', () => {
      const src = readFileSync(join(HERE, '..', 'src', 'client.ts'), 'utf8');
      assert.equal(src.includes('…'), false, '控件文案不得出现省略号');
      const dirItem = CONFIG_ITEMS.find((i) => i.key === 'db.dir');
      const native = Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'native', onOpen: () => {} } });
      assert.equal(textOf(native).replace(/.*(选择文件夹).*/, '$1'), '选择文件夹');
      const browse = Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'browse', onOpen: () => {} } });
      assert.equal(textOf(browse).replace(/.*(浏览).*/, '$1'), '浏览');
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
