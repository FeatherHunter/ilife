/**
 * #915 第二步 · 大厨技能侧行告警（`chef.config.read` 的 `alerts`）。
 *
 * 三条断言（缺一不可）：
 *   ① 存在且在用的自定义数据目录 ⇒ 回执里没有 `db.dir` 这一格（`alerts` 缺席或空）；
 *   ② 真用不了的值（不存在的目录／同名文件占位）⇒ 有这一格，且 `message` 说那件故障本身；
 *   ③ 回执 JSON 里不出现「现在生效的是」（#915 修掉的假警报，复活它等于白干）。
 *
 * 判定复用体检 `db.dir` 项（`src/health.ts` 的 `dirVerdict`），`message` 原样取体检那句，
 * 不新编口径。只给 `db.dir`（本家唯一可改目录行、唯一体检判红的格）。
 *
 * 隔离：每个用例一个临时家目录，真实 `~/.ilife` 一行都不碰。经真 CLI 跑（需先编 `skill-chef`）。
 *
 * 运行：`node --test packages/skill-chef/test/t915-chef-alerts.test.mjs`
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');

/** 当刻用例的临时家目录（`beforeEach` 现开、`afterEach` 现删）。 */
let home = null;

/** 跑一条大厨命令：回 `{ code, stdout, stderr }`（非 0 不抛，交给断言判）。 */
function runChef(key, params) {
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
  const r = runChef(key, params);
  assert.equal(r.code, 0, key + ' 应 exit 0，stderr=' + r.stderr);
  const envelope = JSON.parse(r.stdout);
  assert.equal(envelope.key, key);
  return envelope.data;
}

const yamlFile = () => join(configDirOf(home), 'chef.yaml');

/** 直接把一份配置写到沙盒里（不经命令），`db.dir` 取入参，其余取默认值。 */
function writeConfigWithDbDir(dirValue) {
  const text = [
    'db:',
    '  dir: ' + JSON.stringify(dirValue),
    '  name: chef_data.db',
    'html:',
    '  dir: cook_html/help',
    '  sceneDir: cook_html',
    '',
  ].join('\n');
  writeFileSync(yamlFile(), text, 'utf8');
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'chef-915-'));
  mkdirSync(configDirOf(home), { recursive: true });
  useHome(home);
  requireIsolatedHome(home); // 基座自证：当刻家目录必须是临时那一份
});

afterEach(() => {
  if (home !== null) rmSync(home, { recursive: true, force: true });
  home = null;
});

describe('#915 第二步 · 大厨行告警只报真用不了', () => {
  it('① 负例：存在且在用的自定义目录 ⇒ 没有 `db.dir` 这一格', () => {
    const live = join(home, 'live-data');
    mkdirSync(live, { recursive: true });
    writeConfigWithDbDir(live);
    const data = dataOf('chef.config.read', {});
    assert.equal(data.resolved.dbDir, live, '生效落点应是用户配的那个目录');
    assert.ok(data.alerts === undefined || Object.keys(data.alerts).length === 0,
      '在且能写 ⇒ 不该有任何格，实为 ' + JSON.stringify(data.alerts ?? null));
    assert.equal(JSON.stringify(data).includes('现在生效的是'), false, '回执里不许出现合成句');
  });

  it('② 正例：不存在的目录 ⇒ 有这一格，且 message 说那件故障本身', () => {
    writeConfigWithDbDir(join(home, 'missing-915'));
    const data = dataOf('chef.config.read', {});
    const alert = data.alerts?.['db.dir'];
    assert.notEqual(alert, undefined, '不在 ⇒ 必须有这一格');
    assert.equal(alert.code, 'DIR_MISSING');
    assert.match(String(alert.message), /不在/, 'message 应说那件故障本身，实为 ' + String(alert.message));
    assert.equal(JSON.stringify(data).includes('现在生效的是'), false, '回执里不许出现合成句');
  });

  it('② 正例：同名文件占了目录的位置 ⇒ 有这一格，且 message 点名这件形状故障', () => {
    const blocked = join(home, 'file-block-915');
    writeFileSync(blocked, 'i am a file, not a dir', 'utf8');
    writeConfigWithDbDir(blocked);
    const data = dataOf('chef.config.read', {});
    const alert = data.alerts?.['db.dir'];
    assert.notEqual(alert, undefined, '形状不对 ⇒ 必须有这一格');
    assert.match(String(alert.message), /不在|同名文件/, 'message 应说那件故障本身，实为 ' + String(alert.message));
    assert.equal(JSON.stringify(data).includes('现在生效的是'), false, '回执里不许出现合成句');
  });

  it('③ 回执全文与组装处源码无合成句（读数本身即判据）', () => {
    const live = join(home, 'live-data-2');
    mkdirSync(live, { recursive: true });
    writeConfigWithDbDir(live);
    assert.equal(JSON.stringify(dataOf('chef.config.read', {})).includes('现在生效的是'), false, '干净回执不许出现合成句');
    writeConfigWithDbDir(join(home, 'missing-915-2'));
    assert.equal(JSON.stringify(dataOf('chef.config.read', {})).includes('现在生效的是'), false, '故障回执也不许出现合成句');
    const src = readFileSync(join(HERE, '..', 'src', 'cli', 'config.ts'), 'utf8');
    assert.match(src, /chefAlerts/);
    assert.equal(src.includes('现在生效的是'), false, '组装处源码不许写合成句');
  });
});
