/**
 * #749 · 记账设置页收窄（样板）——**技能侧**验收：`bill.config.read` 回执扩一组解析后绝对路径 ＋
 * 可改落点写盘写绝对路径 ＋ 备份目录相对值的解析口径 ＋ 体检与回执同源。
 *
 * 判据（逐条对应票面《验收命令》与两条补注）：
 *   ① 首次落文件：删掉 `<技能>.yaml` 再跑一条只读命令 ⇒ 文件里可改落点（`db.dir`）是**算出来的绝对路径**；
 *      回执 `data.resolved` 含六格绝对路径（数据目录／库文件／第二份库／产物目录／备份目录／备份文件名示例）。
 *   ② 回执那几格与 `<家>/.ilife/bill.yaml` 的取值**逐字一致**（按文件里那份取值现算一遍对账）。
 *   ③ 把那一格改回 `""` ⇒ 仍按默认落点工作，且「读不写回」（老文件一份不用动）。
 *   ④ 保存／重置也把那一格落成绝对路径（#746 总口径回灌的口径：写的时候一律绝对）。
 *   ⑤ `backup.dir`：值绝对 ⇒ 用它；相对 ⇒ `<库目录>/<值>`；空串 ⇒ `<库目录>/backups`（补注定的口径）。
 *   ⑥ 落点算式只有一处定义地：体检（`bill.config.check`）报的路径与回执 `resolved` 逐字对得上；
 *      体检里不再出现 `ILIFE_CONFIG_DIR`，也不再给「去页面上把只读项改到别处」这种做不到的指引。
 *
 * 隔离：每个用例一个临时家目录（win32 `USERPROFILE`／POSIX `HOME`，见 `test/helpers/home-test-base.mjs`），
 * 真实 `~/.ilife` 一行都不碰（基座当场自证）。
 *
 * 运行：`node --test packages/skill-bill/test/t749-设置页收窄.test.mjs`（需先编 `skill-bill`）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigYaml } from '../../base-link-core/dist/config/yaml.js';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');

/** 当刻用例的临时家目录（`beforeEach` 现开、`afterEach` 现删）。 */
let home = null;

/** 跑一条记账命令：回 `{ code, stdout, stderr }`（非 0 不抛，交给断言判）。 */
function runBill(key, params) {
  const args = [CLI, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  try {
    const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', env: homeEnvOf(home) });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status ?? -1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

/** 跑一条命令并拆出信封 `data`（非 0 即当场失败，报文带 stderr）。 */
function dataOf(key, params) {
  const r = runBill(key, params);
  assert.equal(r.code, 0, key + ' 应 exit 0，stderr=' + r.stderr);
  const envelope = JSON.parse(r.stdout);
  assert.equal(envelope.key, key);
  return envelope.data;
}

const yamlFile = () => join(configDirOf(home), 'bill.yaml');
const dataDir = () => join(configDirOf(home), 'data');
const readYaml = () => parseConfigYaml(readFileSync(yamlFile(), 'utf8'), 'bill.yaml').values;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'bill-749-'));
  // 只建配置目录、**不建配置文件**：①那条要的是「文件不在」的首次落盘读数。
  mkdirSync(configDirOf(home), { recursive: true });
  useHome(home);
  requireIsolatedHome(home); // 基座自证：当刻家目录必须是临时那一份
});

afterEach(() => {
  if (home !== null) rmSync(home, { recursive: true, force: true });
  home = null;
});

describe('#749 设置页收窄 · 技能侧回执与落点', () => {
  describe('① 回执扩组：一组解析后的绝对路径', () => {
    it('首次读（文件不在）⇒ 落一份配置，可改落点是算出来的绝对路径，回执六格齐', () => {
      const data = dataOf('bill.config.read', {});
      assert.equal(data.created, true, '首次读应把配置文件落下来');
      assert.equal(data.dataDir, dataDir());
      const onDisk = readYaml();
      assert.equal(onDisk.db.dir, dataDir(), '写盘那一份的可改落点＝算出来的绝对路径');
      assert.ok(isAbsolute(String(onDisk.db.dir)), '写下去的是绝对路径：' + String(onDisk.db.dir));
      assert.deepEqual(Object.keys(data.resolved).sort(),
        ['backupDir', 'backupSample', 'dbDir', 'dbFile', 'goalsFile', 'htmlDir']);
      for (const [key, value] of Object.entries(data.resolved)) {
        assert.ok(isAbsolute(value), 'resolved.' + key + ' 应是绝对路径，实为 ' + value);
      }
    });

    it('回执那几格与配置文件里的取值逐字一致（按文件那份取值现算一遍对账）', () => {
      dataOf('bill.config.read', {}); // 先落一份
      const data = dataOf('bill.config.read', {});
      const v = readYaml();
      const dbDir = v.db.dir === '' ? data.dataDir : String(v.db.dir);
      assert.equal(data.resolved.dbDir, dbDir);
      assert.equal(data.resolved.dbFile, join(dbDir, String(v.db.name)));
      assert.equal(data.resolved.goalsFile, join(dbDir, String(v.db.goals)));
      assert.equal(data.resolved.htmlDir, join(dbDir, String(v.html.dir)));
      assert.equal(data.resolved.backupDir, join(dbDir, 'backups'), '空串的备份目录＝库目录下的 backups');
      assert.equal(data.resolved.backupSample, join(dbDir, 'backups', String(v.backup.stem) + '<时间戳>.db'));
    });
  });

  describe('② 读仍认空串（老文件一份不用动）', () => {
    it('文件里写着 dir: "" ⇒ 按默认落点工作，且读不写回', () => {
      const text = [
        'db:',
        '  dir: ""',
        '  name: biscuit_accountant.db',
        '  goals: goals.json',
        'backup:',
        '  dir: ""',
        '  stem: biscuit_',
        'html:',
        '  dir: biscuit_accountant_html',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      const data = dataOf('bill.config.read', {});
      assert.equal(data.values.db.dir, '', '读回来仍是空串（不是被悄悄改写成绝对路径）');
      assert.equal(data.resolved.dbDir, dataDir(), '生效落点＝默认数据目录');
      assert.equal(readFileSync(yamlFile(), 'utf8'), text, '读不写回：盘上仍是用户那份');
    });
  });

  describe('③ 写的时候一律落绝对路径', () => {
    it('保存：提交空串 ⇒ 写下去的是算出来的绝对路径', () => {
      dataOf('bill.config.read', {});
      const r = runBill('bill.config.write', { values: { db: { dir: '' } } });
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      assert.equal(readYaml().db.dir, dataDir(), '保存也把可改落点写成绝对路径');
      assert.equal(dataOf('bill.config.read', {}).values.db.dir, dataDir(), '保存后读回来就是那条绝对路径');
    });

    it('重置：写出去的默认值里可改落点也是绝对路径', () => {
      dataOf('bill.config.read', {});
      const r = runBill('bill.config.reset', {});
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      assert.equal(readYaml().db.dir, dataDir(), '重置落的是绝对路径');
    });
  });

  describe('④ backup.dir 的解析口径（绝对用它／相对按库目录解／空串默认）', () => {
    /** 直接把一份配置写到沙盒里（不经命令），再读回执看那一格。 */
    function withBackupDir(value) {
      const text = [
        'db:',
        '  dir: ""',
        '  name: biscuit_accountant.db',
        '  goals: goals.json',
        'backup:',
        '  dir: ' + JSON.stringify(value),
        '  stem: biscuit_',
        'html:',
        '  dir: biscuit_accountant_html',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      return dataOf('bill.config.read', {}).resolved.backupDir;
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
  });

  describe('⑤ 体检与回执同源（落点算式只有一处定义地）', () => {
    it('体检报的路径与回执 resolved 逐字对得上，且不再提 ILIFE_CONFIG_DIR', () => {
      const read = dataOf('bill.config.read', {});
      const report = dataOf('bill.config.check', {});
      const body = JSON.stringify(report);
      assert.equal(body.includes('ILIFE_CONFIG_DIR'), false, '体检里不该再出现 ILIFE_CONFIG_DIR：' + body);
      const p = (s) => String(s).replace(/\\/g, '/');
      const text = report.items.map((i) => i.message + ' ' + i.action).join('\n');
      for (const [label, path] of [['库文件', read.resolved.dbFile], ['备份目录', read.resolved.backupDir]]) {
        assert.ok(text.includes(p(path)), '体检报告里应出现与回执同源的 ' + label + ' 路径：' + p(path));
      }
      // 只读项（库文件名／产物目录名／备份目录）的指引不许再指「去页面上改到别处」——页面已只读。
      for (const id of ['db.file', 'html.dir', 'backup.dir']) {
        const item = report.items.find((i) => i.id === id);
        assert.notEqual(item, undefined, '体检报告缺 ' + id + ' 那条');
        assert.equal(item.action.includes('改到别处'), false,
          id + ' 的行动指引仍在让人上页面上改：' + item.action);
      }
    });
  });
});
