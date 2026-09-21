/**
 * #760 · 备忘录设置页收窄（照记账样板 #749 铺开 ＋ 飞书 CLI 改检测＋prompt）——**技能侧**验收。
 *
 * 判据（逐条对应票面《目标》／《验收命令》与三条补注）：
 *   ① `memo.config.read` 回执扩 `resolved`（4 格绝对路径）＋ `lark`（三档＋prompt＋官网行）；
 *      首次落文件时可改两格（`db.dir`／`media.dir`）是**算出来的绝对路径**。
 *   ② 回执那几格与 `<家>/.ilife/memo.yaml` 的取值**逐字一致**（按文件里那份取值现算一遍对账）。
 *   ③ 把可改格改回 `""` ⇒ 仍按默认落点工作，且「读不写回」（老文件一份不用动）。
 *   ④ 保存／重置也把可改两格落成绝对路径（#746 总口径回灌的口径：写的时候一律绝对）。
 *   ⑤ `media.dir` 解析口径：空串 ⇒ `<数据目录>/media`；绝对 ⇒ 用它；显式相对 ⇒ 按进程工作目录解。
 *   ⑥ 体检与回执同源（落点算式只有一处定义地）；体检里不再出现 `ILIFE_CONFIG_DIR`，
 *      只读项（库文件名／产物目录名）不再给「改到别处」这种做不到的指引（改指配置文件）。
 *   ⑦ 飞书三档各跑一次：缺席 ⇒ missing；挡板 unavailable ⇒ partial；挡板 normal ⇒ full；
 *      prompt 与官网行逐字（官网行另在测试里抄一份独立字面量锁死）。
 *   ⑧ 老配置过渡（#762）：含已删四键的 `memo.yaml` ⇒ 读容忍、不进取值；保存一次即清掉。
 *   ⑨ 失败回执带安装指引：远端不可用时回执 `larkSetup` 格与复制按钮同一内容；
 *      直调探测命令缺席时 stderr 带官网行与 `lark.prompt` 指引。
 *
 * 隔离：每个用例一个临时家目录（win32 `USERPROFILE`／POSIX `HOME`，见 `test/helpers/home-test-base.mjs`），
 * 真实 `~/.ilife` 一行都不碰（基座当场自证）。挡板走 **PATH 首位**（`lark.cliPath` 删键后唯一的注入点）。
 *
 * 运行：`node --test packages/skill-memo-ilife/test/t760-设置页收窄.test.mjs`（需先编 `skill-memo-ilife`）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigYaml } from '../../base-link-core/dist/config/yaml.js';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';
import { initMemoTestDb, makeLarkStub } from '../../../tooling/contract-seam.mjs';
import { LARK_INSTALL_PROMPT } from '../dist/sync/feishu.js';
import { noLarkPathEnv, stubPathEnv } from './helpers/config-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');

/** 官网行独立字面量（与技能侧 `LARK_WEBSITE_LINE` 逐字对读，防两边一起漂）。 */
const WEBSITE_LINE = '飞书CLI官网为：https://www.feishu.cn/feishu-cli';
const WEBSITE_URL = 'https://www.feishu.cn/feishu-cli';

/** 当刻用例的临时家目录（`beforeEach` 现开、`afterEach` 现删）。 */
let home = null;
/** 当刻用例的挡板（`makeLarkStub` 现开，随家目录一起删）。 */
let stub = null;

const yamlFile = () => join(configDirOf(home), 'memo.yaml');
const dataDir = () => join(configDirOf(home), 'data');
const readYaml = () => parseConfigYaml(readFileSync(yamlFile(), 'utf8'), 'memo.yaml').values;

/** 跑一条备忘录命令：回 `{ code, stdout, stderr }`（非 0 不抛，交给断言判）。 */
function runMemo(key, params, env) {
  const args = [CLI, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  try {
    const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', env: env ?? homeEnvOf(home) });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status ?? -1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

/** 跑一条命令并拆出信封 `data`（非 0 即当场失败，报文带 stderr）。 */
function dataOf(key, params, env) {
  const r = runMemo(key, params, env);
  assert.equal(r.code, 0, key + ' 应 exit 0，stderr=' + r.stderr);
  const envelope = JSON.parse(r.stdout);
  assert.equal(envelope.key, key);
  return envelope.data;
}

/** 落一份空库（备忘不建库：只读／探测命令要先有库文件，库由测试按老 schema 造）。 */
function withEmptyDb() {
  mkdirSync(dataDir(), { recursive: true });
  initMemoTestDb(join(dataDir(), 'memo.db'));
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'memo-760-'));
  // 只建配置目录、**不建配置文件**：①那条要的是「文件不在」的首次落盘读数。
  mkdirSync(configDirOf(home), { recursive: true });
  useHome(home);
  requireIsolatedHome(home); // 基座自证：当刻家目录必须是临时那一份
  stub = makeLarkStub(join(home, 'stub'));
});

afterEach(() => {
  stub = null;
  if (home !== null) rmSync(home, { recursive: true, force: true });
  home = null;
});

describe('#760 设置页收窄 · 技能侧回执与落点', () => {
  describe('① 回执扩组：解析后绝对路径 ＋ 飞书三档', () => {
    it('首次读（文件不在）⇒ 落一份配置，可改两格是算出来的绝对路径，回执两组齐', () => {
      const data = dataOf('memo.config.read', {});
      assert.equal(data.created, true, '首次读应把配置文件落下来');
      assert.equal(data.dataDir, dataDir());
      const onDisk = readYaml();
      assert.equal(onDisk.db.dir, dataDir(), '写盘那一份的数据目录＝算出来的绝对路径');
      assert.ok(isAbsolute(String(onDisk.db.dir)), '写下去的是绝对路径：' + String(onDisk.db.dir));
      assert.equal(onDisk.media.dir, join(dataDir(), 'media'), '写盘那一份的附件目录＝<数据目录>/media');
      assert.deepEqual(Object.keys(data.resolved).sort(), ['dbDir', 'dbFile', 'htmlDir', 'mediaDir']);
      for (const [key, value] of Object.entries(data.resolved)) {
        assert.ok(isAbsolute(value), 'resolved.' + key + ' 应是绝对路径，实为 ' + value);
      }
      assert.deepEqual(Object.keys(data.lark).sort(),
        ['cliPath', 'prompt', 'tier', 'version', 'websiteLine', 'websiteUrl']);
      assert.equal(data.lark.websiteLine, WEBSITE_LINE, '官网行逐字');
      assert.equal(data.lark.websiteUrl, WEBSITE_URL);
      assert.equal(data.lark.prompt, LARK_INSTALL_PROMPT, 'prompt 与技能侧唯一真相处逐字一致');
    });

    it('回执那几格与配置文件里的取值逐字一致（按文件那份取值现算一遍对账）', () => {
      dataOf('memo.config.read', {}); // 先落一份
      const data = dataOf('memo.config.read', {});
      const v = readYaml();
      const dbDir = v.db.dir === '' ? data.dataDir : String(v.db.dir);
      assert.equal(data.resolved.dbDir, dbDir);
      assert.equal(data.resolved.dbFile, join(dbDir, String(v.db.name)));
      assert.equal(data.resolved.htmlDir, join(dbDir, String(v.html.dir)));
      const mediaDir = v.media.dir === '' ? join(data.dataDir, 'media') : String(v.media.dir);
      assert.equal(data.resolved.mediaDir, mediaDir);
    });
  });

  describe('② 读仍认空串（老文件一份不用动）', () => {
    it('文件里可改格写着 "" ⇒ 按默认落点工作，且读不写回', () => {
      const text = [
        'db:',
        '  dir: ""',
        '  name: memo.db',
        'html:',
        '  dir: memo_html',
        'media:',
        '  dir: ""',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      const data = dataOf('memo.config.read', {});
      assert.equal(data.values.db.dir, '', '读回来仍是空串（不是被悄悄改写成绝对路径）');
      assert.equal(data.values.media.dir, '', '读回来仍是空串');
      assert.equal(data.resolved.dbDir, dataDir(), '生效落点＝默认数据目录');
      assert.equal(data.resolved.mediaDir, join(dataDir(), 'media'), '附件生效落点＝<数据目录>/media');
      assert.equal(readFileSync(yamlFile(), 'utf8'), text, '读不写回：盘上仍是用户那份');
    });
  });

  describe('③ 写的时候一律落绝对路径', () => {
    it('保存：提交空串 ⇒ 写下去的是算出来的绝对路径', () => {
      dataOf('memo.config.read', {});
      const r = runMemo('memo.config.write', { values: { db: { dir: '' }, media: { dir: '' } } });
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      assert.equal(readYaml().db.dir, dataDir(), '保存也把数据目录写成绝对路径');
      assert.equal(readYaml().media.dir, join(dataDir(), 'media'), '保存也把附件目录写成绝对路径');
      assert.equal(dataOf('memo.config.read', {}).values.media.dir, join(dataDir(), 'media'));
    });

    it('重置：写出去的默认值里可改两格也是绝对路径', () => {
      dataOf('memo.config.read', {});
      const r = runMemo('memo.config.reset', {});
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      assert.equal(readYaml().db.dir, dataDir(), '重置落的是绝对路径');
      assert.equal(readYaml().media.dir, join(dataDir(), 'media'), '重置落的是绝对路径');
    });
  });

  describe('④ media.dir 的解析口径（空串默认／绝对用它／显式相对按工作目录解）', () => {
    /** 直接把一份配置写到沙盒里（不经命令），再读回执看那一格。 */
    function withMediaDir(value) {
      const text = [
        'db:',
        '  dir: ""',
        '  name: memo.db',
        'html:',
        '  dir: memo_html',
        'media:',
        '  dir: ' + JSON.stringify(value),
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      return dataOf('memo.config.read', {}).resolved.mediaDir;
    }

    it('空串 ⇒ <数据目录>/media', () => {
      assert.equal(withMediaDir(''), join(dataDir(), 'media'));
    });

    it('绝对值 ⇒ 原样用它', () => {
      const abs = join(home, 'abs-media');
      assert.equal(withMediaDir(abs), abs);
    });

    it('显式相对值 ⇒ 绝对路径（按进程工作目录解，#712 现状口径）', () => {
      const got = withMediaDir('rel-media-760');
      assert.ok(isAbsolute(got), '相对值须解析成绝对路径：' + got);
      assert.equal(got, resolve('rel-media-760'), '相对值按进程工作目录解');
    });
  });

  describe('⑤ 体检与回执同源（落点算式只有一处定义地）', () => {
    it('体检报的路径与回执 resolved 逐字对得上，且不再提 ILIFE_CONFIG_DIR', () => {
      withEmptyDb();
      const read = dataOf('memo.config.read', {});
      const report = dataOf('memo.config.check', {});
      const body = JSON.stringify(report);
      assert.equal(body.includes('ILIFE_CONFIG_DIR'), false, '体检里不该再出现 ILIFE_CONFIG_DIR');
      const p = (s) => String(s).replace(/\\/g, '/');
      const text = report.items.map((i) => i.message + ' ' + i.action).join('\n');
      for (const [label, path] of [['库文件', read.resolved.dbFile], ['产物目录', read.resolved.htmlDir], ['附件目录', read.resolved.mediaDir]]) {
        assert.ok(text.includes(p(path)), '体检报告里应出现与回执同源的 ' + label + ' 路径：' + p(path));
      }
      // 只读项（库文件名／产物目录名）的指引不许再让人「改到别处」——页面已只读，改指配置文件。
      for (const id of ['db.file', 'html.dir']) {
        const item = report.items.find((i) => i.id === id);
        assert.notEqual(item, undefined, '体检报告缺 ' + id + ' 那条');
        assert.equal(item.action.includes('改到别处'), false, id + ' 的行动指引仍在让人去别处改：' + item.action);
      }
    });
  });

  describe('⑥ 飞书三档各跑一次', () => {
    it('缺席（PATH 里无落点）⇒ missing', () => {
      const data = dataOf('memo.config.read', {}, noLarkPathEnv(home));
      assert.equal(data.lark.tier, 'missing');
      assert.equal(data.lark.cliPath, null);
      assert.equal(data.lark.version, null);
      assert.equal(data.lark.prompt, LARK_INSTALL_PROMPT);
      assert.equal(data.lark.websiteLine, WEBSITE_LINE);
    });

    it('挡板 unavailable ⇒ partial（找到了但没登录／没授权）', () => {
      stub.setState({ mode: 'unavailable' });
      const data = dataOf('memo.config.read', {}, stubPathEnv(home, stub.dir));
      assert.equal(data.lark.tier, 'partial');
      assert.ok(typeof data.lark.cliPath === 'string' && data.lark.cliPath.length > 0, 'partial 报路径');
    });

    it('挡板 normal ⇒ full（路径与版本）', () => {
      const data = dataOf('memo.config.read', {}, stubPathEnv(home, stub.dir));
      assert.equal(data.lark.tier, 'full');
      assert.ok(String(data.lark.cliPath).length > 0);
      assert.ok(String(data.lark.version).length > 0 && data.lark.version !== 'unknown');
    });

    it('prompt 关键句齐（读者是 AI／只装官方包／终态三条／/wizard／参考官网）', () => {
      const data = dataOf('memo.config.read', {});
      for (const needle of [
        'npm install -g @larksuite/cli',
        '不要装 npm 上的 lark-cli',
        'lark-cli --version >= 1.0.82',
        'lark-cli auth check --scope task',
        '/wizard',
        '参考官网：https://www.feishu.cn/feishu-cli',
      ]) {
        assert.ok(data.lark.prompt.includes(needle), 'prompt 缺关键句：' + needle);
      }
    });
  });

  describe('⑦ 老配置过渡：已删四键读容忍、写即清（#762）', () => {
    it('含已删四键的 memo.yaml ⇒ 读数正常，取值里没有它们', () => {
      const text = [
        'db:',
        '  dir: ""',
        '  name: memo.db',
        'html:',
        '  dir: memo_html',
        'files:',
        '  help: 备忘录_HELP',
        '  lookup: 备忘录_速查表',
        'media:',
        '  dir: ""',
        'lark:',
        '  cliPath: ""',
        '  qrDir: ""',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      const data = dataOf('memo.config.read', {});
      assert.equal(data.created, false, '老文件在，不算首次落盘');
      assert.deepEqual(Object.keys(data.values).sort(), ['db', 'html', 'media'], '已删键不进取值');
    });

    it('保存一次 ⇒ 死键消失、其余取值逐字不变', () => {
      const text = [
        'db:',
        '  dir: ""',
        '  name: my760.db',
        'html:',
        '  dir: memo_html',
        'files:',
        '  help: 备忘录_HELP',
        '  lookup: 备忘录_速查表',
        'media:',
        '  dir: ""',
        'lark:',
        '  cliPath: ""',
        '  qrDir: ""',
        '',
      ].join('\n');
      writeFileSync(yamlFile(), text, 'utf8');
      const r = runMemo('memo.config.write', { values: { db: { name: 'my760.db' } } });
      assert.equal(r.code, 0, 'stderr=' + r.stderr);
      const onDisk = readYaml();
      assert.deepEqual(Object.keys(onDisk).sort(), ['db', 'html', 'media'], '写回那一份里死键消失');
      assert.equal(onDisk.db.name, 'my760.db', '其余取值逐字不变');
    });

    it('集合外的未知键照旧硬失败（护栏没拆）', () => {
      writeFileSync(yamlFile(), 'db:\n  dirr: 1\n', 'utf8');
      const r = runMemo('memo.search', {});
      assert.equal(r.code, 1, '未知键走 exit 1');
      assert.match(r.stderr, /不认识的配置项「db\.dirr」/);
    });
  });

  describe('⑧ 失败回执带安装指引（与复制按钮同一内容）', () => {
    it('远端不可用时合成写回执带 larkSetup 格', () => {
      withEmptyDb();
      const env = noLarkPathEnv(home);
      const r = runMemo('memo.create', { title: '飞书用例', body: '', category: '心愿' }, env);
      assert.equal(r.code, 4, '远端没成走 exit 4：' + r.stderr);
      const data = JSON.parse(r.stdout).data;
      assert.equal(data.remote, 'unavailable');
      assert.equal(data.larkSetup.prompt, LARK_INSTALL_PROMPT, '回执 prompt 与复制按钮同一内容');
      assert.equal(data.larkSetup.websiteLine, WEBSITE_LINE);
    });

    it('直调探测命令缺席时 stderr 带官网行与 lark.prompt 指引', () => {
      withEmptyDb();
      const r = runMemo('memo.auth', { step: 'status' }, noLarkPathEnv(home));
      assert.equal(r.code, 4, '缺席走 exit 4');
      assert.match(r.stderr, /lark-cli 未找到/);
      assert.ok(r.stderr.includes(WEBSITE_LINE), '官网行逐字：' + r.stderr);
      assert.match(r.stderr, /lark\.prompt/);
    });
  });
});
