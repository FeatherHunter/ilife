/**
 * #749 · 记账设置页收窄（样板）——**插件侧**验收：行表收窄成「一处可改 ＋ 其余只读展示」，
 * 只读值只来自技能侧回执，面板一个字都不算。
 *
 * 判据（逐条对应票面《目标》第 2、3 条与三条补注）：
 *   ① 行表形状：6 行 ＝ 可改 1（数据目录）＋ 只读 5（库文件名／预算账户文件名／HELP 产物目录名／
 *      备份目录／备份文件名前缀）；目录档仍是 `{db.dir, backup.dir}` 两行（#736 的 H 组不破）。
 *   ② 只读行显示的是**技能算好的绝对路径**：逐行等于回执 `resolved` 组里 `resolveFrom` 指的那一格；
 *      回执缺那一组（旧技能）⇒ 空串，面板**不自己拼路径**（边界见 #677）。
 *   ③ 只读行**不进保存**：`fromDraft` 只收可改行（本家只有 `db.dir`），免得把显示用的绝对路径写回配置。
 *   ④ 只读渲染：控件 `disabled`、不接 `onChange`；只读目录行的浏览按钮**保留但不可点击**（#747 定稿）。
 *   ⑤ 控件文案零省略号（#746 处置 9）：`client.ts` 里没有 `…`，按钮就写「选择文件夹」／「浏览」。
 *   ⑥ **只读数字行**的形态（#749 补注二的甲档）：不是路径的只读项画成 `disabled` 的 `number` 控件，
 *      值＝生效数字——本家没有这类项，故用一件合成行把形态钉住（卡路里 #757 照此办）。
 *
 * 隔离：`test/helpers/config-test-base.mjs` 把当刻进程与子进程的家目录都指到临时目录；
 * 真实 `~/.ilife` 一行不碰。运行：`node --test packages/plugin-bill-ilife/test/t749-设置页收窄.test.mjs`。
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigYaml } from '../../base-link-core/dist/config/yaml.js';
import { loadClientBundle, nodesOfType, textOf } from '../../../test/helpers/client-bundle.mjs';
import { configDirOf, setupConfigTestBase } from '../../../test/helpers/config-test-base.mjs';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT } from '../dist/index.js';
import { readConfigSurface } from '../dist/bridge.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = readFileSync(join(HERE, '..', 'src', 'client.ts'), 'utf8');
const CLIENT = loadClientBundle(join(HERE, '..'));
const { Row, toDraft, fromDraft } = CLIENT.exports;

/** 只读行集合（页面不给改的那 5 行）与它们的键。 */
const READONLY = CONFIG_ITEMS.filter((i) => i.readonly === true);
const EDITABLE = CONFIG_ITEMS.filter((i) => i.readonly !== true);
const itemOf = (key) => {
  const item = CONFIG_ITEMS.find((i) => i.key === key);
  assert.notEqual(item, undefined, '行表里缺 ' + key);
  return item;
};

describe('#749 记账设置页收窄（样板）', () => {
  let base;
  before(() => {
    base = setupConfigTestBase();
  });
  after(() => {
    base.cleanup();
  });

  describe('① 行表形状：可改 1 ＋ 只读 5', () => {
    it('可改项恰是数据目录一行', () => {
      assert.deepEqual(EDITABLE.map((i) => i.key), ['db.dir'], '本家只有数据目录可改（#747 定稿）');
      assert.equal(itemOf('db.dir').control, 'directory');
      assert.equal(itemOf('db.dir').prefillFrom, 'dataDir');
    });

    it('只读 5 行＝库文件名／预算账户文件名／HELP 产物目录名／备份目录／备份文件名前缀', () => {
      assert.deepEqual(READONLY.map((i) => i.key).sort(),
        ['backup.dir', 'backup.stem', 'db.goals', 'db.name', 'html.dir']);
      assert.equal(READONLY.length, 5);
      assert.equal(CONFIG_ITEMS.length, 6, '6 行＝可改 1 ＋ 只读 5');
      assert.equal(COMMON_ITEM_COUNT, 4);
    });

    it('「备份名主体」已改名「备份文件名前缀」，且每行都指向回执里的一格', () => {
      assert.equal(itemOf('backup.stem').title, '备份文件名前缀');
      for (const item of READONLY) {
        assert.notEqual(item.resolveFrom, undefined, item.key + ' 应标 resolveFrom（显示值来自技能侧回执）');
      }
      assert.deepEqual(READONLY.map((i) => i.resolveFrom).sort(),
        ['backupDir', 'backupSample', 'dbFile', 'goalsFile', 'htmlDir']);
    });

    it('目录档仍是两行（#736 的 H 组不破）：数据目录与备份目录', () => {
      assert.deepEqual(CONFIG_ITEMS.filter((i) => i.control === 'directory').map((i) => i.key).sort(),
        ['backup.dir', 'db.dir']);
    });
  });

  describe('② 只读值只来自技能侧回执（面板不拼路径）', () => {
    it('回执带 `resolved` 一组，六格与配置文件里的取值逐字一致', () => {
      const s = readConfigSurface();
      assert.deepEqual(Object.keys(s.resolved ?? {}).sort(),
        ['backupDir', 'backupSample', 'dbDir', 'dbFile', 'goalsFile', 'htmlDir'], '回执缺 resolved 组或格子不齐');
      const yaml = join(configDirOf(base.dir), 'bill.yaml');
      const v = parseConfigYaml(readFileSync(yaml, 'utf8'), 'bill.yaml').values;
      const dbDir = v.db.dir === '' ? s.dataDir : String(v.db.dir);
      assert.equal(s.resolved.dbDir, dbDir);
      assert.equal(s.resolved.dbFile, join(dbDir, String(v.db.name)));
      assert.equal(s.resolved.goalsFile, join(dbDir, String(v.db.goals)));
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
      assert.deepEqual(Object.keys(submitted.db), ['dir'], '只读的 db.name／db.goals 不该被提交');
      assert.equal(submitted.db.dir, draft['db.dir']);
      for (const item of READONLY) {
        assert.equal(item.key in draft, true, '只读行仍在草稿里（页面要显示它）');
      }
    });
  });

  describe('④ 只读渲染：控件 disabled、浏览按钮保留但不可点击', () => {
    it('文本只读行：一个 disabled 的文本框、不接 onChange', () => {
      const item = itemOf('db.name');
      const node = Row({ item, value: 'C:\\x\\biscuit_accountant.db', disabled: false, onChange: () => {} });
      const inputs = nodesOfType(node, 'input');
      assert.equal(inputs.length, 1);
      assert.equal(inputs[0].props.disabled, true, '只读行须 disabled');
      assert.equal(inputs[0].props.onChange, undefined, '只读行不接 onChange（不给「改得动」留假象）');
      assert.equal(inputs[0].props.value, 'C:\\x\\biscuit_accountant.db', '显示技能算好的绝对路径');
    });

    it('只读目录行：按钮**保留**但 disabled（#747 定稿：入口不作废，只是不能改）', () => {
      const node = Row({
        item: itemOf('backup.dir'),
        value: 'C:\\x\\.ilife\\data\\backups',
        disabled: false,
        onChange: () => {},
        browser: { mode: 'browse', onOpen: () => {} },
      });
      const buttons = nodesOfType(node, 'button');
      assert.equal(buttons.length, 1, '只读目录行仍画一枚浏览按钮');
      assert.equal(buttons[0].props.disabled, true, '这枚按钮须不可点击');
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

    it('按钮就写「选择文件夹」／「浏览」两个字面（无省略号、无点点）', () => {
      const withBrowse = (mode) => Row({
        item: itemOf('db.dir'),
        value: 'D:\\x',
        disabled: false,
        onChange: () => {},
        browser: { mode, onOpen: () => {} },
      });
      for (const [mode, want] of [['native', '选择文件夹'], ['browse', '浏览']]) {
        const label = textOf(nodesOfType(withBrowse(mode), 'button')[0]);
        assert.equal(label, want, mode + ' 档的按钮文案应是「' + want + '」');
        assert.doesNotMatch(label, /…|\.\.\./);
      }
    });
  });

  describe('⑥ 只读数字行的形态（补注二的甲档）：disabled 的 number 控件，值＝生效数字', () => {
    /** 本家六行都是路径／名字类，没有数字项；这一条是**样板定的形态**，卡路里 #757 照此办。
     *  甲＝照只读文本行画（`disabled` 的 `number` 输入框）；乙（不进面板）与丙（只画一句话）都被否：
     *  乙让用户在页面上找不到这一格，丙要多写一套渲染分支（行表 → 行 的单一路径断掉）。 */
    const synthetic = {
      key: 'probe.days',
      title: '回写天数',
      tier: 'common',
      control: 'number',
      readonly: true,
      hint: '探针行（合成项）：只读数字行的形态读数。',
    };

    it('合成一条只读数字行 ⇒ disabled 的 number 输入框，值就是生效数字', () => {
      const node = Row({ item: synthetic, value: '30', disabled: false, onChange: () => {} });
      const inputs = nodesOfType(node, 'input');
      assert.equal(inputs.length, 1);
      assert.equal(inputs[0].props.type, 'number', '甲档：与只读路径行同形，不引入第五种控件');
      assert.equal(inputs[0].props.disabled, true);
      assert.equal(inputs[0].props.value, '30', '值＝生效数字（看得见当前生效值）');
      assert.equal(inputs[0].props.onChange, undefined);
      assert.equal(nodesOfType(node, 'button').length, 0, '数字行不是目录行，不画按钮');
    });

    it('同一条数字行去掉只读标记 ⇒ 照旧可写（「disabled 是因为只读，不是因为数字」）', () => {
      const node = Row({ item: { ...synthetic, readonly: false }, value: '30', disabled: false, onChange: () => {} });
      const inputs = nodesOfType(node, 'input');
      assert.equal(inputs[0].props.type, 'number');
      assert.equal(inputs[0].props.disabled, false);
      assert.equal(typeof inputs[0].props.onChange, 'function');
    });
  });
});
