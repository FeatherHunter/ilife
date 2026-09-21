/**
 * #762 · 记账这一家的端到端验收：**真老配置文件**在删键之后仍能用，且一次保存就把死键清掉。
 *
 * 验收目的（票面《验收命令》第 2、3 条）：
 *   ① 把维护者本机那份 `~/.ilife/bill.yaml`（#677 那版落下来的、含 `html.helpStem`／`html.quickRefStem`
 *      两个已退休键）**逐字拷进沙盒**（`家目录注入（测试跑在临时家目录里）` 指临时目录）⇒ 跑一条记账命令 **exit 0**；
 *   ② 再走一次配置保存（`bill.config.write`，与面板「保存」同一条代码路径）⇒ 那两个死键消失、
 *      **其余取值逐字不变**；
 *   ③ 反例：往沙盒那份 yaml 加一个**名单外**的键 ⇒ 仍 `CONFIG_UNKNOWN_KEY`、exit 1，并点名那一行。
 *
 * 隔离：全程把**家目录**（win32 `USERPROFILE`／POSIX `HOME`，见 `test/helpers/home-test-base.mjs`）
 * 指到临时目录，沙盒＝`<临时家目录>/.ilife/`；维护者那份真配置**只读**（`readFileSync`），
 * 真实家目录一行都不碰。真配置文件缺失时响亮失败（不静默跳过——跳过等于这条验收没跑）。
 *
 * 运行：`node --test packages/skill-bill/test/config-retired-762.test.mjs`（需先编 `skill-bill`）。
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigYaml } from '../../base-link-core/dist/config/yaml.js';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BILL = join(HERE, '..');
const CLI = join(BILL, 'dist', 'cli', 'cmd_read.js');

/** 维护者本机那份老配置（本票验收点名的真件）；`T762_REAL_BILL_YAML` 可指到别的副本。 */
const REAL_YAML = process.env.T762_REAL_BILL_YAML ?? join(homedir(), '.ilife', 'bill.yaml');

let home = null;
let sandbox = null;

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

/** 沙盒那份 yaml 的路径与全文。 */
const sandboxFile = () => join(configDirOf(home), 'bill.yaml');
const sandboxText = () => readFileSync(sandboxFile(), 'utf8');

before(() => {
  const real = readFileSync(REAL_YAML, 'utf8');
  assert.match(real, /helpStem:/, '真配置文件里应有已退休键 html.helpStem（不然这条验收没素材）：' + REAL_YAML);
  home = mkdtempSync(join(tmpdir(), 'bill-762-home-'));
  sandbox = configDirOf(home);
  mkdirSync(sandbox, { recursive: true });
  useHome(home);
  requireIsolatedHome(home); // 基座自证：当刻家目录必须是临时那一份
  copyFileSync(REAL_YAML, sandboxFile());
});

after(() => {
  if (home !== null) rmSync(home, { recursive: true, force: true });
});

describe('#762 记账：真老配置文件 ＋ 已退休键', () => {
  it('① 含两个死键的老文件 ⇒ 跑一条记账命令 exit 0（升级后不再第一条命令就哑）', () => {
    const before = sandboxText();
    assert.match(before, /helpStem:/);
    assert.match(before, /quickRefStem:/);
    const r = runBill('bill.config.read', {});
    assert.equal(r.code, 0, 'stderr=' + r.stderr);
    const envelope = JSON.parse(r.stdout);
    assert.equal(envelope.key, 'bill.config.read');
    assert.equal(envelope.data.values.html.helpStem, undefined, '退休键不进取值');
    assert.equal(envelope.data.values.html.quickRefStem, undefined);
    assert.equal(envelope.data.values.html.dir, 'biscuit_accountant_html', '其余取值原样');
    assert.equal(envelope.data.values.db.name, 'biscuit_accountant.db');
    assert.equal(sandboxText(), before, '读不写回：盘上仍是那份老文件');
  });

  it('② 一次保存（与面板「保存」同一条代码路径）⇒ 两个死键消失，其余取值逐字不变', () => {
    const before = sandboxText();
    assert.match(before, /helpStem:/);
    assert.match(before, /quickRefStem:/);
    const r = runBill('bill.config.write', { values: { html: { dir: 'biscuit_accountant_html' } } });
    assert.equal(r.code, 0, 'stderr=' + r.stderr);
    const after = sandboxText();
    assert.equal(/helpStem|quickRefStem/.test(after), false, '死键已被写即清：\n' + after);
    // 「其余取值逐字不变」按**取值**对账（比按行比对结实：组的归属、行序都不再是判据的一部分），
    // 两处允许变：
    //   ① 两个死键（本票要的「写即清」）；
    //   ② 可改落点那一格 `db.dir`——它归 #749 的写盘口径管：**写**的时候一律落算出来的绝对路径
    //      （＝`configPaths(stem).dataDir`，即 `<配置目录>/data`；**读**仍认空串＝按默认落点）。
    //      正面验收住 `t749-设置页收窄.test.mjs` ①②③。
    const dataDir = join(configDirOf(home), 'data');
    const parse = (text) => parseConfigYaml(text, 'bill.yaml').values;
    const b = parse(before);
    const a = parse(after);
    // 老那份里那两个死键还在（`parseConfigYaml` 不认得「已退休」，它只解析）——对账前按本票口径去掉。
    const bLive = { ...b, html: { ...b.html } };
    delete bLive.html.helpStem;
    delete bLive.html.quickRefStem;
    assert.equal(b.html.helpStem, '饼干记账_HELP', '老文件里死键的取值确实在（本票的素材）');
    assert.equal(b.db.dir, '', '老文件里那一格原本是空串（这条读数才有意义）');
    assert.equal(a.db.dir, dataDir, '可改落点那一格落的是算出来的绝对路径（＝数据目录）');
    assert.deepEqual(
      { ...a, db: { ...a.db, dir: '' } },
      { ...bLive, db: { ...bLive.db, dir: '' } },
      '除了两行死键与可改落点那一格，其余取值逐字不变',
    );
    // 保存之后照常读得到（写即清不是把文件写坏）。
    const again = runBill('bill.config.read', {});
    assert.equal(again.code, 0, 'stderr=' + again.stderr);
    assert.equal(JSON.parse(again.stdout).data.values.html.dir, 'biscuit_accountant_html');
  });

  it('③ 反例：加一个名单外的键 ⇒ 仍硬失败、exit 1，且点名那一行', () => {
    const text = sandboxText();
    writeFileSync(sandboxFile(), text.replace('  name: biscuit_accountant.db', '  dirr: typo\n  name: biscuit_accountant.db'), 'utf8');
    const r = runBill('bill.config.read', {});
    assert.equal(r.code, 1, '护栏没被拆：集合外的未知键照旧硬失败');
    assert.match(r.stderr, /不认识的配置项「db\.dirr」/);
    assert.match(r.stderr, /第 3 行/);
    assert.match(r.stderr, /bill\.yaml/);
  });
});
