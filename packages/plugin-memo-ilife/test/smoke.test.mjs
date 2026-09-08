// dsh-memo-ilife 烟囱：槽位定案 + 设置页住单品 + 桥缺失阻断（不返空）+ #50 安装布局与 envelope 契约（照抄 #48 卡路里样板）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PLUGIN, PLUGIN_VERSION, SKILL_VERSION } from '../dist/slot.js';
import { SLOT_ID, SLOT_ORDER, slotDescriptor, SETTINGS_OWNER, SKILL_CLI, SKILL_PACKAGE, SkillBridgeError, assertCliPresent, cliPath, readViaCli } from '../dist/index.js';
const requirePkg = createRequire(import.meta.url);

describe('dsh-memo-ilife 烟囱', () => {
  it('槽位 id 与 order 与 P3 定案一致', () => {
    assert.equal(SLOT_ID, 'ilife:memo');
    assert.equal(SLOT_ORDER, 70);
    assert.equal(slotDescriptor().slotId, 'ilife:memo');
  });
  it('设置页住单品包', () => {
    assert.equal(SETTINGS_OWNER, 'dsh-memo-ilife');
  });
  it('桥缺失阻断不返空（memo 缺席抛 missing-cli）', () => {
    const cli = SKILL_CLI;
    assert.match(cli, /cmd_read\.js$/);
    assert.ok(typeof assertCliPresent === 'function');
    assert.throws(() => assertCliPresent('/nonexistent/skill-memo-ilife-cmd_read.js'), (e) => e instanceof SkillBridgeError && e.code === 'missing-cli');
  });
  it('#50 安装布局：单品声明 skill 同版本 ^ 依赖（正式版号，无 workspace）', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const dep = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')).dependencies || {};
    assert.match(dep['dsh-life-pack'] ?? '', /^\^0\.1\./);
    assert.match(dep['skill-memo-ilife'] ?? '', /^\^0\.1\./);
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
  // memo 无 help 键（10 联动键见 SKILL.md）：取 memo.search 无参直读作空库安全契约键；memo 取数层 openMemoDb
  // 要求 memo 子目录在位（缺目录即 exit 4 阻断），故空库须先建 memo/ 空目录再 spawn。
  function emptyMemoDb() {
    const db = mkdtempSync(join(tmpdir(), 'memo-smoke-'));
    mkdirSync(join(db, 'memo'));
    return db;
  }
  function spawnCliOnce(args, db) {
    return spawnSync(process.execPath, [cliPath(), ...args], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: db } });
  }
  function spawnCli(args) {
    const db = emptyMemoDb();
    let r = spawnCliOnce(args, db);
    if (r.status === 0 && String(r.stdout).trim() === '') r = spawnCliOnce(args, db);
    return r;
  }
  it('#50 envelope 契约：SKILL 直执行 memo.search 回执 key/skill/shape/data 全字段（空库安全）', () => {
    const r = spawnCli(['memo.search']);
    assert.equal(r.status, 0);
    const env = JSON.parse(String(r.stdout));
    assert.equal(env.key, 'memo.search');
    assert.equal(env.skill, 'memo');
    assert.equal(env.shape, 'list');
    assert.deepEqual(env.data.items, []);
    assert.equal(env.data.total, 0);
  });
  it('#50 envelope 契约：面板路 readViaCli 同键打通不返空', () => {
    process.env.SKILLS_DB_PATH = emptyMemoDb();
    let data;
    try {
      data = readViaCli('memo.search');
    } catch (e) {
      // 同上：仅 bad-json（空白 stdout 腐坏的下游签名）重跑一次；他错直抛。真回归必两次皆红。
      if (e instanceof SkillBridgeError && e.code === 'bad-json') data = readViaCli('memo.search');
      else throw e;
    }
    assert.deepEqual(data.items, []);
    assert.equal(data.total, 0);
  });
  it('版本行与双 package.json 一致（面板自报家门，防漂移）', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
    assert.equal(PLUGIN, pkg.name);
    assert.equal(PLUGIN_VERSION, pkg.version);
    assert.equal(SKILL_VERSION, requirePkg(SKILL_PACKAGE + '/package.json').version);
  });
});
