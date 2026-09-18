// #706 配置体检（卡路里一家）：判据与三种真故障的验收用例。
//
// 判据六组：
//   A 报告形状与检查表逐条对齐（12 条：通用 5 ＋ 卡路里特有 7）
//   B 只报不改：体检本身不建目录、不落默认配置（跑完盘上不许多出东西）
//   C 真故障 ①：库文件改名 → 该条红
//   D 真故障 ②：数据目录只读 → 该条红（Windows 上 ACL 改不了，走「同名文件占位」这一支）
//   E 真故障 ③：配置文件写坏一行 → 红，且报文里点到那一行
//   F 正常态：库与目录都在 → 全绿（黄只留给「没配照片目录」那一条）
//
// 走的是**真出口**：spawn 技能 CLI 的 `calorie.config.check`，与插件层同一把钥匙。
// 测试隔离照 #675 的替代护栏：`ILIFE_CONFIG_DIR` 指向临时目录（测试基座强制设置）。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupConfigTestBase } from '../../../test/helpers/config-test-base.mjs';

const require = createRequire(import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, '..', '..', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

/** 检查表 `docs/research/check-table-671-life-panel-20260917.html` 里卡路里那 12 条（通用 5 ＋ 特有 7）。 */
const EXPECT_IDS = [
  'config.file', 'db.dir', 'db.file', 'html.dir', 'value.source',
  'photos.dir', 'photos.gifs', 'xunji.key', 'xunji.cli', 'xunji.stateDir', 'land.cli', 'xunji.catalog',
];

/** 跑一次真出口，返回 `{code, result}`（result＝envelope.data，即那份报告）。 */
function runCheck(configDir) {
  const run = spawnSync(process.execPath, [CLI, 'calorie.config.check'], {
    encoding: 'utf8',
    env: { ...process.env, ILIFE_CONFIG_DIR: configDir },
  });
  const lines = String(run.stdout ?? '').trim().split('\n').filter((line) => line !== '');
  const envelope = lines.length > 0 ? JSON.parse(lines[lines.length - 1]) : null;
  return { code: run.status, stderr: String(run.stderr ?? ''), envelope, result: envelope?.data ?? null };
}

function statusOf(report, id) {
  return report.items.find((item) => item.id === id)?.status ?? '(缺)';
}

function itemOf(report, id) {
  return report.items.find((item) => item.id === id) ?? null;
}

describe('#706 配置体检 · 卡路里', () => {
  let base;
  before(() => {
    base = setupConfigTestBase();
  });
  after(() => {
    base.cleanup();
  });

  describe('A 报告形状', () => {
    it('12 条齐、id 与检查表逐条对齐，每条都带标题／结论／一句话／去哪修', () => {
      const { code, result } = runCheck(base.dir);
      assert.equal(code, 0, '出口非 0');
      assert.ok(result, '回执里没有报告');
      assert.equal(result.skill, 'calorie');
      assert.deepEqual(result.items.map((i) => i.id).sort(), EXPECT_IDS.slice().sort());
      for (const item of result.items) {
        assert.ok(item.title.length > 0, item.id + ' 缺标题');
        assert.ok(['red', 'yellow', 'green'].includes(item.status), item.id + ' 档位不合法：' + item.status);
        assert.ok(item.message.length > 0, item.id + ' 缺一句话');
        assert.equal(typeof item.action, 'string', item.id + ' 缺「去哪修」字段');
      }
    });

    it('训记 KEY 那一条只报「配没配」，任何一段文本里都不许出现值本身', () => {
      writeFileSync(join(base.dir, 'calorie.yaml'), [
        'db:',
        '  dir: ""',
        '  name: calorie_data.db',
        'xunji:',
        '  key: "SECRET-VALUE-706"',
        '',
      ].join('\n'), 'utf8');
      const { result } = runCheck(base.dir);
      const blob = JSON.stringify(result);
      assert.ok(!blob.includes('SECRET-VALUE-706'), '报告里泄露了训记 KEY 的值');
      assert.equal(itemOf(result, 'xunji.key').status, 'green');
      assert.match(itemOf(result, 'xunji.key').message, /已配/);
    });
  });

  describe('B 只报不改', () => {
    it('配置文件不存在时跑体检：不落默认配置、不建数据目录', () => {
      const fresh = join(base.dir, 'fresh-empty');
      mkdirSync(fresh, { recursive: true });
      const { code, result } = runCheck(fresh);
      assert.equal(code, 0);
      assert.equal(itemOf(result, 'config.file').status, 'yellow', '配置文件不在该报黄');
      assert.deepEqual(readdirSync(fresh), [], '体检往配置目录里写了东西（只报不改被破）');
    });
  });

  describe('C 真故障 ① · 库文件改名', () => {
    let work;
    before(() => {
      work = join(base.dir, 'fault-db');
      mkdirSync(join(work, 'data'), { recursive: true });
      writeFileSync(join(work, 'calorie.yaml'), 'db:\n  dir: ""\n  name: calorie_data.db\n', 'utf8');
      // 造一个真库：用技能自己的建库入口（只读体检之外的事，测试里允许）。
      const db = new (require('node:sqlite').DatabaseSync)(join(work, 'data', 'calorie_data.db'));
      db.exec('CREATE TABLE food_log (id INTEGER PRIMARY KEY)');
      db.close();
      renameSync(join(work, 'data', 'calorie_data.db'), join(work, 'data', 'calorie_data.db.bak'));
    });
    it('库文件被改名 → 该条红，且报文里给出那个路径', () => {
      const { result } = runCheck(work);
      const item = itemOf(result, 'db.file');
      assert.equal(item.status, 'red', '库文件不在该报红');
      assert.match(item.message.replace(/\\/g, '/'), /calorie_data\.db/);
      assert.ok(item.action.length > 0, '红条必须给「去哪修」');
    });
  });

  describe('D 真故障 ② · 数据目录不可写', () => {
    let work;
    before(() => {
      work = join(base.dir, 'fault-dir');
      mkdirSync(work, { recursive: true });
      // 数据目录的位置被一个**同名文件**占住：写探针起不来，与只读同一档结论（跨平台可造）。
      writeFileSync(join(work, 'data'), 'not a directory', 'utf8');
      writeFileSync(join(work, 'calorie.yaml'), 'db:\n  dir: ""\n  name: calorie_data.db\n', 'utf8');
    });
    it('数据目录写不进去 → 该条红', () => {
      const { result } = runCheck(work);
      const item = itemOf(result, 'db.dir');
      assert.equal(item.status, 'red', '数据目录不可用该报红');
      assert.match(item.action, /数据目录|只读|建/);
    });
  });

  describe('E 真故障 ③ · 配置文件坏一行', () => {
    let work;
    before(() => {
      work = join(base.dir, 'fault-yaml');
      mkdirSync(work, { recursive: true });
      writeFileSync(join(work, 'calorie.yaml'), 'db:\n  dir: ""\n  name: calorie_data.db\n这不是一行合法配置\n', 'utf8');
    });
    it('坏行 → 红，且报文指出错在第 4 行', () => {
      const { result } = runCheck(work);
      const item = itemOf(result, 'config.file');
      assert.equal(item.status, 'red', '坏配置该报红');
      assert.match(item.message, /第 4 行/, '报文没指到出错的行：' + item.message);
      assert.match(item.message.replace(/\\/g, '/'), /calorie\.yaml/, '报文没给出文件');
    });
  });

  describe('F 正常态', () => {
    let work;
    before(() => {
      work = join(base.dir, 'healthy');
      mkdirSync(join(work, 'data'), { recursive: true });
      const photos = join(work, 'photos');
      mkdirSync(photos, { recursive: true });
      writeFileSync(join(work, 'calorie.yaml'), [
        'db:',
        '  dir: ""',
        '  name: calorie_data.db',
        'photos:',
        `  dir: "${photos.replace(/\\/g, '/')}"`,
        '  gifs: gifs',
        '',
      ].join('\n'), 'utf8');
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(join(work, 'data', 'calorie_data.db'));
      for (let i = 0; i < 11; i += 1) db.exec(`CREATE TABLE t${i} (id INTEGER PRIMARY KEY)`);
      db.close();
    });
    it('库在、目录在、照片目录配了 → 12 条里没有红，且库与数据目录两条为绿', () => {
      const { result } = runCheck(work);
      assert.equal(itemOf(result, 'db.file').status, 'green', '库文件该绿：' + itemOf(result, 'db.file').message);
      assert.equal(itemOf(result, 'db.dir').status, 'green', '数据目录该绿：' + itemOf(result, 'db.dir').message);
      assert.equal(itemOf(result, 'config.file').status, 'green');
      assert.equal(itemOf(result, 'photos.dir').status, 'green');
      const reds = result.items.filter((i) => i.status === 'red').map((i) => i.id);
      assert.deepEqual(reds, [], '正常态不该有红：' + reds.join('、'));
    });
  });
});
