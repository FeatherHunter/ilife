// dsh-calorie 烟囱：槽位定案 + 设置页住单品 + 桥缺失阻断（不返空）+ #48 安装布局与 envelope 契约。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOT_ID, SLOT_ORDER, slotDescriptor, SETTINGS_OWNER, SKILL_CLI, SKILL_PACKAGE, SkillBridgeError, assertCliPresent, cliPath, readViaCli } from '../dist/index.js';
import { resolveNodeBin, SPAWN_TIMEOUT_MS } from '../dist/bridge.js';
import { PLUGIN, PLUGIN_VERSION, SKILL_VERSION } from '../dist/slot.js';
import { createRequire } from 'node:module';
const requirePkg = createRequire(import.meta.url);

describe('dsh-calorie 烟囱', () => {
  it('槽位 id 与 order 与 P3 定案一致', () => {
    assert.equal(SLOT_ID, 'ilife:calorie');
    assert.equal(SLOT_ORDER, 75);
    assert.equal(slotDescriptor().slotId, 'ilife:calorie');
  });
  it('设置页住单品包', () => {
    assert.equal(SETTINGS_OWNER, 'dsh-calorie');
  });
  it('桥缺失阻断不返空（chef 缺席抛 missing-cli）', () => {
    const cli = SKILL_CLI;
    assert.match(cli, /cmd_read\.js$/);
    assert.ok(typeof assertCliPresent === 'function');
    assert.throws(() => assertCliPresent('/nonexistent/skill-calorie-cmd_read.js'), (e) => e instanceof SkillBridgeError && e.code === 'missing-cli');
  });
  it('#48 安装布局：单品声明 skill 同版本 ^ 依赖（正式版号，无 workspace）', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const dep = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')).dependencies || {};
    assert.match(dep['dsh-life-pack'] ?? '', /^\^0\.1\./);
    assert.match(dep['skill-calorie'] ?? '', /^\^0\.1\./);
    assert.ok(!JSON.stringify(dep).includes('workspace:'), '依赖不许外泄 workspace:');
  });
  it('#48 安装布局：cliPath 落在技能包内（按包名解析，非单仓相对路径耦合）', () => {
    const p = cliPath();
    assert.equal(basename(dirname(dirname(dirname(p)))), SKILL_PACKAGE);
    assert.match(p, /cmd_read\.js$/);
    assertCliPresent(p);
  });
  // Windows 并行 spawn 配额抖动（沿 #41 调查结论，见 test/combos-42.test.mjs）：满载时子进程偶发 exit 0 配空白
  // stdout——产品侧不可能态（出口必出一行 envelope JSON）。仅此签名即时重跑一次；仍坏/他错即真红，不断言放水。
  function spawnCliOnce(args, db) {
    return spawnSync(process.execPath, [cliPath(), ...args], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: db } });
  }
  function spawnCli(args) {
    const db = mkdtempSync(join(tmpdir(), 'calorie-smoke-'));
    let r = spawnCliOnce(args, db);
    if (r.status === 0 && String(r.stdout).trim() === '') r = spawnCliOnce(args, db);
    return r;
  }
  it('#48 envelope 契约：SKILL 直执行 calorie.help.center 回执 key/shape/data 全字段', () => {
    const r = spawnCli(['calorie.help.center']);
    assert.equal(r.status, 0);
    const env = JSON.parse(String(r.stdout));
    assert.equal(env.key, 'calorie.help.center');
    assert.equal(env.skill, 'calorie');
    assert.equal(env.shape, 'list');
    assert.ok(env.data && env.data.total >= 1);
  });
  it('#48 envelope 契约：面板路 readViaCli 同键打通不返空', () => {
    const db = mkdtempSync(join(tmpdir(), 'calorie-smoke-'));
    process.env.SKILLS_DB_PATH = db;
    let data;
    try {
      data = readViaCli('calorie.help.center');
    } catch (e) {
      // 同上：仅 bad-json（空白 stdout 腐坏的下游签名）重跑一次；他错直抛。真回归必两次皆红。
      if (e instanceof SkillBridgeError && e.code === 'bad-json') data = readViaCli('calorie.help.center');
      else throw e;
    }
    assert.ok(data && data.total >= 1);
  });
  describe('#48 真机 hang 根因：Electron 宿主 execPath + spawn 超时', () => {
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
    it('版本行与双 package.json 一致（面板自报家门，防漂移）', () => {
      const here = dirname(fileURLToPath(import.meta.url));
      const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
      assert.equal(PLUGIN, pkg.name);
      assert.equal(PLUGIN_VERSION, pkg.version);
      assert.equal(SKILL_VERSION, requirePkg(SKILL_PACKAGE + '/package.json').version);
    });
  });
});
