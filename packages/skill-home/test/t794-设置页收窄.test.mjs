/**
 * #794 · 居家设置页收窄（照记账 #749 样板铺开 ＋ 主密钥改从文件读）——**技能侧**验收。
 *
 * 判据（逐条对应票面《验收命令》＋补注两条）：
 *   ① 首次落文件：删掉 `home.yaml` 再跑一条只读命令 ⇒ 文件里可改落点（`db.dir`）是**算出来的绝对路径**；
 *      回执 `data.resolved` 含五格绝对路径（数据目录／库文件／产物目录／备份目录／主密钥文件）。
 *   ② 回执那几格与 `<家>/.ilife/home.yaml` 的取值**逐字一致**（按文件里那份取值现算一遍对账）。
 *   ③ 把那一格改回 `""` ⇒ 仍按默认落点工作，且「读不写回」（老文件一份不用动）。
 *   ④ 保存／重置也把那一格落成绝对路径（#746 总口径回灌的口径：写的时候一律绝对）。
 *   ⑤ 老配置文件里的 `files.help`／`files.lookup`（已退休键）：读跳过校验不进取值；
 *      保存一次 ⇒ 盘上不再出现，`key.file` 在，其余取值逐字不变。
 *   ⑥ `key.file` 解析：值绝对 ⇒ 用它；相对 ⇒ `<数据目录>/<值>`；空串 ⇒ `<数据目录>/.master.key`。
 *   ⑦ **密钥真跑**：口令写进密钥文件 ⇒ `存账号` 能建、`看密码` 能解出同一口令；
 *      删掉那个文件 ⇒ 命令响亮失败且报文里给出该文件绝对路径；
 *      调用时给 `params.master_key` ⇒ 响亮失败（exit 2）并指向文件。
 *   ⑧ `backup.dir` 解析口径（绝对用它／相对按库目录解／空串默认）＋ 备份 zip 不装密钥文件。
 *   ⑨ 体检与回执同源：体检报的路径与回执 `resolved` 逐字对得上；体检里不再出现 `ILIFE_CONFIG_DIR`，
 *      也不再给「去页面上把只读项改到别处」这种做不到的指引；第 ⑧ 条按 `key.file` 判在／不在。
 *
 * 隔离：每个用例一个临时家目录（win32 `USERPROFILE`／POSIX `HOME`，见 `test/helpers/home-test-base.mjs`），
 * 真实 `~/.ilife` 一行都不碰（基座当场自证）。沙盒说明（与票面字面的一处偏差，见证据件）：
 * 票面第 4 条写"临时 `ILIFE_CONFIG_DIR` 沙盒"——该变量已删（#754／#763 方向，读我们自己定义的环境变量归零），
 * 本件一律用临时家目录沙盒，覆盖同一件事（"别动真配置"）。
 *
 * 运行：`node --test packages/skill-home/test/t794-设置页收窄.test.mjs`（需先编 `skill-home`）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigYaml } from '../../base-link-core/dist/config/yaml.js';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';
import { zipRead } from '../dist/fetch/archive.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const P = JSON.stringify;

/** 当刻用例的临时家目录（`beforeEach` 现开、`afterEach` 现删）。 */
let home = null;

/** 跑一条居家命令：回 `{ code, stdout, stderr }`（非 0 不抛，交给断言判）。 */
function runHome(key, params) {
  const args = [CLI, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: homeEnvOf(home) });
  return { code: r.status ?? -1, stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') };
}

/** 跑一条命令并拆出信封 `data`（非 0 即当场失败，报文带 stderr）。 */
function dataOf(key, params) {
  const r = runHome(key, params);
  assert.equal(r.code, 0, key + ' 应 exit 0，stderr=' + r.stderr);
  const envelope = JSON.parse(r.stdout);
  assert.equal(envelope.key, key);
  return envelope.data;
}

const yamlFile = () => join(configDirOf(home), 'home.yaml');
const dataDir = () => join(configDirOf(home), 'data');
const keyFile = () => join(dataDir(), '.master.key');
const readYaml = () => parseConfigYaml(readFileSync(yamlFile(), 'utf8'), 'home.yaml').values;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'home-794-'));
  // 只建配置目录、**不建配置文件**：①那条要的是「文件不在」的首次落盘读数。
  mkdirSync(configDirOf(home), { recursive: true });
  useHome(home);
  requireIsolatedHome(home); // 基座自证：当刻家目录必须是临时那一份
});

afterEach(() => {
  if (home !== null) rmSync(home, { recursive: true, force: true });
  home = null;
});

describe('#794 设置页收窄 · 技能侧回执与落点', () => {
  describe('① 回执扩组：一组解析后的绝对路径', () => {
    it('首次读（文件不在）⇒ 落一份配置，可改落点是算出来的绝对路径，回执五格齐', () => {
      const data = dataOf('home.config.read', {});
      assert.equal(data.created, true, '首次读应把配置文件落下来');
      assert.equal(data.dataDir, dataDir());
      const onDisk = readYaml();
      assert.equal(onDisk.db.dir, dataDir(), '写盘那一份的可改落点＝算出来的绝对路径');
      assert.ok(isAbsolute(String(onDisk.db.dir)), '写下去的是绝对路径：' + String(onDisk.db.dir));
      assert.deepEqual(Object.keys(data.resolved).sort(),
        ['backupDir', 'dbDir', 'dbFile', 'htmlDir', 'keyFile']);
      for (const [k, value] of Object.entries(data.resolved)) {
        assert.ok(isAbsolute(value), 'resolved.' + k + ' 应是绝对路径，实为 ' + value);
      }
      assert.equal(existsSync(keyFile()), false, '密钥文件不自动生成');
    });

    it('回执那几格与配置文件里的取值逐字一致（按文件那份取值现算一遍对账）', () => {
      dataOf('home.config.read', {}); // 先落一份
      const data = dataOf('home.config.read', {});
      const v = readYaml();
      const dbDir = v.db.dir === '' ? data.dataDir : String(v.db.dir);
      assert.equal(data.resolved.dbDir, dbDir);
      assert.equal(data.resolved.dbFile, join(dbDir, String(v.db.name)));
      assert.equal(data.resolved.htmlDir, join(dbDir, String(v.html.dir)));
      assert.equal(data.resolved.backupDir, join(dbDir, 'backups'), '空串的备份目录＝库目录下的 backups');
      assert.equal(data.resolved.keyFile, join(data.dataDir, '.master.key'), '空串的主密钥文件＝数据目录下的 .master.key');
    });
  });

  describe('② 读仍认空串（老文件一份不用动）', () => {
    it('文件里写着 dir: "" ⇒ 按默认落点工作，且读不写回', () => {
      const text = [
        'db:',
        '  dir: ""',
        '  name: home.db',
        'html:',
        '  dir: home_manager_html',
        'key:',
        '  file: ""',
        'backup:',
        '  dir: ""',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      const data = dataOf('home.config.read', {});
      assert.equal(data.values.db.dir, '', '读回来仍是空串（不是被悄悄改写成绝对路径）');
      assert.equal(data.resolved.dbDir, dataDir(), '生效落点＝默认数据目录');
      assert.equal(readFileSync(yamlFile(), 'utf8'), text, '读不写回：盘上仍是用户那份');
    });
  });

  describe('③ 写的时候一律落绝对路径', () => {
    it('保存：提交空串 ⇒ 写下去的是算出来的绝对路径', () => {
      dataOf('home.config.read', {});
      const r = runHome('home.config.write', { values: { db: { dir: '' } } });
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      assert.equal(readYaml().db.dir, dataDir(), '保存也把可改落点写成绝对路径');
      assert.equal(dataOf('home.config.read', {}).values.db.dir, dataDir(), '保存后读回来就是那条绝对路径');
    });

    it('重置：写出去的默认值里可改落点也是绝对路径', () => {
      dataOf('home.config.read', {});
      const r = runHome('home.config.reset', {});
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      assert.equal(readYaml().db.dir, dataDir(), '重置落的是绝对路径');
    });
  });

  describe('④ 已退休键过渡：files.help／files.lookup 读容忍、写即清', () => {
    it('老文件带着两键 ⇒ 读成功、取值里没有 files 组；保存一次 ⇒ 盘上不再出现', () => {
      const text = [
        'db:',
        '  dir: ""',
        '  name: home.db',
        'html:',
        '  dir: home_manager_html',
        'files:',
        '  help: 居家管家_HELP',
        '  lookup: 居家管家_速查表',
        'backup:',
        '  dir: ""',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      const data = dataOf('home.config.read', {});
      assert.equal(data.created, false, '老文件不是新建');
      assert.equal(data.values.files, undefined, '取值里不再有 files 组');
      assert.equal(data.values.key.file, '.master.key', '新键按默认值补齐');
      const r = runHome('home.config.write', { values: { db: { name: 'home.db' } } });
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      const disk = readFileSync(yamlFile(), 'utf8');
      assert.equal(disk.includes('files:'), false, '保存后盘上不再出现 files 组：' + disk);
      assert.ok(disk.includes('key:'), '保存后 key.file 在：' + disk);
    });
  });

  describe('⑤ key.file 的取值形状（文件名／绝对路径都要能解）', () => {
    function withKeyFile(value) {
      const text = [
        'db:',
        '  dir: ""',
        '  name: home.db',
        'html:',
        '  dir: home_manager_html',
        'key:',
        '  file: ' + JSON.stringify(value),
        'backup:',
        '  dir: ""',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      return dataOf('home.config.read', {}).resolved.keyFile;
    }

    it('相对值 ⇒ <数据目录>/<值>', () => {
      assert.equal(withKeyFile('custom.key'), join(dataDir(), 'custom.key'));
    });

    it('绝对值 ⇒ 原样用它', () => {
      const abs = join(home, 'abs-key');
      assert.equal(withKeyFile(abs), abs);
    });

    it('空串 ⇒ <数据目录>/.master.key', () => {
      assert.equal(withKeyFile(''), join(dataDir(), '.master.key'));
    });
  });

  describe('⑥ 密钥真跑：文件是唯一来源', () => {
    it('口令写进文件 ⇒ 存账号能建、看密码能解出同一口令', () => {
      dataOf('home.config.read', {});
      writeFileSync(keyFile(), 'testpass-12345678', 'utf8');
      const add = runHome('home.ticket.write', { kind: 'account', op: 'add', platform: '淘宝', user: 'u', pass: 'p123' });
      assert.equal(add.code, 0, 'stderr=' + add.stderr);
      assert.match(add.stdout, /已存账号/);
      const show = dataOf('home.ticket.write', { kind: 'account', op: 'show', platform: '淘宝' });
      assert.match(show.message, /p123/, '解出来的是当初存进去的口令');
    });

    it('删掉那个文件 ⇒ 命令响亮失败且报文里给出该文件绝对路径', () => {
      dataOf('home.config.read', {});
      writeFileSync(keyFile(), 'testpass-12345678', 'utf8');
      dataOf('home.ticket.write', { kind: 'account', op: 'add', platform: '淘宝', user: 'u', pass: 'p123' });
      rmSync(keyFile(), { force: true });
      const r = runHome('home.ticket.write', { kind: 'account', op: 'show', platform: '淘宝' });
      assert.notEqual(r.code, 0, '文件不在必须非 0');
      assert.ok(r.stderr.includes(keyFile()), '报文须给出该文件绝对路径：' + r.stderr);
    });

    it('调用时给 params.master_key ⇒ 响亮失败（exit 2）并指向文件', () => {
      dataOf('home.config.read', {});
      writeFileSync(keyFile(), 'testpass-12345678', 'utf8');
      const r = runHome('home.ticket.write', { kind: 'account', op: 'show', platform: '淘宝', master_key: 'whatever-123' });
      assert.equal(r.code, 2, '用法错 ⇒ exit 2，stderr=' + r.stderr);
      assert.ok(r.stderr.includes(keyFile()), '报文须指向密钥文件：' + r.stderr);
    });
  });

  describe('⑦ backup.dir 的解析口径 ＋ 备份 zip 不装密钥文件', () => {
    function withBackupDir(value) {
      const text = [
        'db:',
        '  dir: ""',
        '  name: home.db',
        'html:',
        '  dir: home_manager_html',
        'key:',
        '  file: ""',
        'backup:',
        '  dir: ' + JSON.stringify(value),
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      return dataOf('home.config.read', {}).resolved.backupDir;
    }

    it('相对值 ⇒ <库目录>/<值>（不再按当刻工作目录解）', () => {
      assert.equal(withBackupDir('mybackups'), join(dataDir(), 'mybackups'));
    });

    it('绝对值 ⇒ 原样用它', () => {
      const abs = join(home, 'abs-backups');
      assert.equal(withBackupDir(abs), abs);
    });

    it('空串 ⇒ <库目录>/backups', () => {
      assert.equal(withBackupDir(''), join(dataDir(), 'backups'));
    });

    it('备份 zip 只装库 ＋ 清单（密钥文件在也不进包），回执说明不含密钥', () => {
      dataOf('home.config.read', {});
      writeFileSync(keyFile(), 'testpass-12345678', 'utf8');
      dataOf('home.ticket.write', { kind: 'account', op: 'add', platform: '淘宝', user: 'u', pass: 'p123' });
      const r = runHome('home.care.write', { kind: 'backup' });
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      assert.match(r.stdout, /不含主密钥文件/, '回执须说明本备份不含主密钥文件');
      const dir = dataOf('home.config.read', {}).resolved.backupDir;
      const zips = readdirSync(dir).filter((f) => f.endsWith('.zip'));
      assert.ok(zips.length >= 1, '备份目录里应有 zip');
      const entries = zipRead(readFileSync(join(dir, zips.sort()[zips.length - 1]))).map((e) => e.name).sort();
      assert.deepEqual(entries, ['home.db', 'manifest.json'], 'zip 里只有库 ＋ 清单，密钥文件不进包');
    });
  });

  describe('⑧ 体检与回执同源（落点算式只有一处定义地）', () => {
    it('体检报的路径与回执 resolved 逐字对得上，且不再提 ILIFE_CONFIG_DIR', () => {
      const read = dataOf('home.config.read', {});
      const report = dataOf('home.config.check', {});
      const body = JSON.stringify(report);
      assert.equal(body.includes('ILIFE_CONFIG_DIR'), false, '体检里不该再出现 ILIFE_CONFIG_DIR');
      const p = (s) => String(s).replace(/\\/g, '/');
      const text = report.items.map((i) => i.message + ' ' + i.action).join('\n');
      for (const [label, path] of [['库文件', read.resolved.dbFile], ['产物目录', read.resolved.htmlDir], ['主密钥文件', read.resolved.keyFile]]) {
        assert.ok(text.includes(p(path)), '体检报告里应出现与回执同源的 ' + label + ' 路径：' + p(path));
      }
      // 只读项（库文件名／产物目录名／产物根 vs 库根）的指引不许再指「去页面上改到别处」——页面已只读。
      for (const id of ['db.file', 'html.dir', 'paths.split']) {
        const item = report.items.find((i) => i.id === id);
        assert.notEqual(item, undefined, '体检报告缺 ' + id + ' 那条');
        assert.equal(item.action.includes('改到别处'), false,
          id + ' 的行动指引仍在让人上页面上改：' + item.action);
      }
    });

    it('第 ⑧ 条按 key.file 判在／不在：缺席 ⇒ 黄 ＋ 建出来指引', () => {
      dataOf('home.config.read', {});
      assert.equal(existsSync(keyFile()), false);
      const report = dataOf('home.config.check', {});
      const item = report.items.find((i) => i.id === 'key.file');
      assert.notEqual(item, undefined, '体检报告缺 key.file 那条');
      assert.equal(item.status, 'yellow');
      assert.ok(item.message.includes(keyFile().replace(/\\/g, '/')), '报文须给出配置那处的绝对路径：' + item.message);
      assert.match(item.action, /建出来/, '行动指引须说建出来：' + item.action);
    });

    it('第 ⑧ 条：在 ⇒ 绿', () => {
      dataOf('home.config.read', {});
      writeFileSync(keyFile(), 'testpass-12345678', 'utf8');
      const report = dataOf('home.config.check', {});
      const item = report.items.find((i) => i.id === 'key.file');
      assert.equal(item.status, 'green');
    });
  });
});
