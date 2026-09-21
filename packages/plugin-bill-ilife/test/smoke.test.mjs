// dsh-bill-ilife 烟囱：槽位定案 + 设置页住单品 + 桥缺失阻断（不返空）+ #50 安装布局与 envelope 契约（照抄 #48 卡路里样板）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOT_ID, SLOT_ORDER, slotDescriptor, SETTINGS_OWNER, SKILL_CLI, SKILL_PACKAGE, SkillBridgeError, assertCliPresent, cliPath, readViaCli } from '../dist/index.js';
import { resolveNodeBin, SPAWN_TIMEOUT_MS } from '../dist/bridge.js';
import { homeEnvOf, useHome } from '../../../test/helpers/home-test-base.mjs';

describe('dsh-bill-ilife 烟囱', () => {
  it('槽位 id 与 order 与 P3 定案一致', () => {
    assert.equal(SLOT_ID, 'ilife:cookie');
    assert.equal(SLOT_ORDER, 70);
    assert.equal(slotDescriptor().slotId, 'ilife:cookie');
  });
  it('设置页住单品包', () => {
    assert.equal(SETTINGS_OWNER, 'dsh-bill-ilife');
  });
  it('桥缺失阻断不返空（bill 缺席抛 missing-cli）', () => {
    const cli = SKILL_CLI;
    assert.match(cli, /cmd_read\.js$/);
    assert.ok(typeof assertCliPresent === 'function');
    assert.throws(() => assertCliPresent('/nonexistent/skill-bill-cmd_read.js'), (e) => e instanceof SkillBridgeError && e.code === 'missing-cli');
  });
  it('#50 安装布局：单品声明总管同版本线 ＋ 技能精确 pin（正式版号，无 workspace；#129 防旧 skill 残留）', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const dep = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')).dependencies || {};
    // 断言与版本号解耦（#123 口径）：总管＝工作区同版本线的 caret；技能＝#129 精确 pin（caret ＋ 存量
    // lockfile 会让旧 skill 残留，exact 才强制重解）。两个期望值都从工作区 package.json 现取，发版不红。
    const skillVer = JSON.parse(readFileSync(join(here, '..', '..', 'skill-bill', 'package.json'), 'utf8')).version;
    const packVer = JSON.parse(readFileSync(join(here, '..', '..', 'plugin-manager', 'package.json'), 'utf8')).version;
    assert.equal(dep['dsh-life-pack'], '^' + packVer);
    assert.equal(dep['skill-bill'], skillVer);
    assert.ok(!JSON.stringify(dep).includes('workspace:'), '依赖不许外泄 workspace:');
  });
  it('#50 安装布局：cliPath 落在技能包内（按包名解析，非单仓相对路径耦合）', () => {
    const p = cliPath();
    assert.equal(basename(dirname(dirname(dirname(p)))), SKILL_PACKAGE);
    assert.match(p, /cmd_read\.js$/);
    assertCliPresent(p);
  });
  // Windows 并行 spawn 配额抖动（沿 #41 调查结论，见 test/combos-42.test.mjs）：满载时子进程偶发 exit 0 配空白
  // stdout——产品侧不可能态（出口必出一行 envelope JSON）。仅此签名即时重跑一次；仍坏/他错即真红，不断言放水。
  function spawnCliOnce(args, home) {
    return spawnSync(process.execPath, [cliPath(), ...args], { encoding: 'utf8', env: homeEnvOf(home) });
  }
  function spawnCli(args) {
    // #695／#763：技能侧不再读环境变量 `SKILLS_DB_PATH`（配置走 `~/.ilife/bill.yaml`），隔离改走**家目录**——
    // 把子进程的家目录指到一个空的临时目录，配置与数据都落在它下面（真库零触碰）。
    const home = mkdtempSync(join(tmpdir(), 'bill-smoke-'));
    let r = spawnCliOnce(args, home);
    if (r.status === 0 && String(r.stdout).trim() === '') r = spawnCliOnce(args, home);
    return r;
  }
  it('#50 envelope 契约：SKILL 直执行 bill.help.lookup 回执 key/shape/data 全字段（空库安全）', () => {
    const r = spawnCli(['bill.help.lookup']);
    assert.equal(r.status, 0);
    const env = JSON.parse(String(r.stdout));
    assert.equal(env.key, 'bill.help.lookup');
    assert.equal(env.skill, 'bill');
    assert.equal(env.shape, 'list');
    assert.ok(env.data && env.data.total >= 1);
  });
  it('#50 envelope 契约：面板路 readViaCli 同键打通不返空', () => {
    // 面板路走当刻进程的环境：技能读配置只看**家目录**，故这里就地接管（空库落在它下面的 `.ilife/data`）。
    useHome(mkdtempSync(join(tmpdir(), 'bill-smoke-')));
    let data;
    try {
      data = readViaCli('bill.help.lookup');
    } catch (e) {
      // 同上：仅 bad-json（空白 stdout 腐坏的下游签名）重跑一次；他错直抛。真回归必两次皆红。
      if (e instanceof SkillBridgeError && e.code === 'bad-json') data = readViaCli('bill.help.lookup');
      else throw e;
    }
    assert.ok(data && data.total >= 1);
  });
  describe('#48 回填（#670，照 calorie/memo 同形）：Electron 宿主 execPath + spawn 超时', () => {
    it('resolveNodeBin：node 直用，Electron 加 RUN_AS_NODE', () => {
      assert.deepEqual(resolveNodeBin('C:\\nodejs\\node.exe'), { bin: 'C:\\nodejs\\node.exe', extraEnv: {} });
      assert.deepEqual(resolveNodeBin('/usr/bin/node'), { bin: '/usr/bin/node', extraEnv: {} });
      const e = resolveNodeBin('D:\\0Tools\\DSH Desktop\\DSH Desktop.exe');
      assert.equal(e.bin, 'D:\\0Tools\\DSH Desktop\\DSH Desktop.exe');
      assert.equal(e.extraEnv.ELECTRON_RUN_AS_NODE, '1');
      assert.ok(SPAWN_TIMEOUT_MS >= 1000, '超时须为正数毫秒');
    });
    it('spawn timeout 语义：超期子进程被杀并报 ETIMEDOUT（readViaCli 依赖此语义）', () => {
      const r = spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},30000)'], { encoding: 'utf8', timeout: 400 });
      assert.equal(r.error?.code, 'ETIMEDOUT');
    });
  });
});
