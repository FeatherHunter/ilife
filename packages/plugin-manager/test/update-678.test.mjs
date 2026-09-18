// 票 #678 自证回路：七个更新目标的表、环境读数、原因人话、面板流程（全用假件与夹具，不碰真机）。
// 判据（票面「改动要能自证」）：本脚本改坏一处必须变红（见实施记录的变异两态读数）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MANAGER_TABS } from '../dist/nav.js';
import { MANAGER_PACKAGE } from '../dist/install.js';
import { MANAGER_TARGET_KEY, UPDATE_TARGETS, targetFor } from '../dist/update-targets.js';
import { BLOCKED_REASONS, MANAGER_ACTIONS, MANAGER_RPC, manualInstallCommand, reasonText } from '../dist/update-contract.js';
import { isAbsent, manualForDisplay, pendingRestartText, verdictOf, versionLines } from '../dist/update-view.js';
import { checkTarget, installAbsent, loadTargets, updateInstalled } from '../dist/update-client.js';

const PROFILE = 'dsh-profile-web';

// 环境读数（readTargetEnvironment）与宿主电话表的读数不在这里：那两个模块运行时 import 更新包
// `dsh-plugin-update`，而依赖进仓要编排者持锁授权（并发协议 §2.1.1）。它们的读数在仓库外独占目录
// 的安装态实证里跑（见实施记录的「仓库外实证」一节），依赖授权后并回本文件。

describe('#678 七个更新目标', () => {
  it('恰好七条：总管 ＋ 导航表六家；包名去重、电话前缀互不相同', () => {
    assert.equal(UPDATE_TARGETS.length, 7);
    assert.equal(UPDATE_TARGETS[0].key, MANAGER_TARGET_KEY);
    assert.equal(UPDATE_TARGETS[0].packageName, MANAGER_PACKAGE);
    assert.deepEqual(
      UPDATE_TARGETS.slice(1).map((t) => ({ key: t.key, pkg: t.packageName })),
      MANAGER_TABS.map((t) => ({ key: t.skill, pkg: t.plugin })),
    );
    const pkgs = new Set(UPDATE_TARGETS.map((t) => t.packageName));
    const prefixes = new Set(UPDATE_TARGETS.map((t) => t.phonePrefix));
    assert.equal(pkgs.size, 7, '七个包名必须互不相同');
    assert.equal(prefixes.size, 7, '七个电话前缀必须互不相同（同前缀即串台）');
    for (const t of UPDATE_TARGETS) assert.match(t.phonePrefix, /^[A-Za-z0-9_-]+$/);
  });
  it('按包名取一家：只认这七个', () => {
    assert.equal(targetFor('dsh-calorie').key, 'calorie');
    assert.equal(targetFor('dsh-not-ours'), undefined);
  });
});

describe('#678 原因人话与手工命令', () => {
  it('八种装不了原因都有人话，不出现英文原因码当正文', () => {
    assert.equal(BLOCKED_REASONS.length, 8);
    for (const code of BLOCKED_REASONS) {
      const text = reasonText(code);
      assert.ok(text.length > 8, code + ' 缺人话');
      assert.ok(!text.startsWith(code), code + ' 正文以原因码开头（不算人话）');
    }
    assert.match(reasonText('install-failed'), /手工命令/);
  });
  it('未知原因码不猜：原样回码并说明这是未知原因', () => {
    assert.match(reasonText('something-new'), /未知原因/);
    assert.match(reasonText('something-new'), /something-new/);
  });
  it('手工兜底命令形状照更新包 README 第 9 节（精确版本、官方源、--save-exact）', () => {
    assert.equal(
      manualInstallCommand({ profileName: 'web', packageName: 'dsh-calorie', version: '0.2.5' }),
      'dsh plugin --profile web add --save-exact dsh-calorie@0.2.5 --registry=https://registry.npmjs.org/',
    );
    assert.match(
      manualInstallCommand({ profileName: 'my web', packageName: 'dsh-calorie', version: '0.2.5' }),
      /--profile "my web"/,
    );
    assert.equal(manualInstallCommand({ profileName: 'web', packageName: 'dsh-calorie', version: 'latest' }), null);
    assert.equal(manualInstallCommand({ profileName: '', packageName: 'dsh-calorie', version: '0.2.5' }), null);
  });
  it('载体与自有电话名：通道单段、自有动作不占更新包的三个动作名', () => {
    assert.match(MANAGER_RPC.channel, /^\/[A-Za-z0-9._~-]+$/);
    assert.equal(MANAGER_RPC.base, '/api', '第一段是载体基段');
    assert.equal(MANAGER_RPC.channel, '/' + MANAGER_RPC.endpoint);
    assert.equal(MANAGER_RPC.path, MANAGER_RPC.base + MANAGER_RPC.channel);
    for (const name of Object.values(MANAGER_ACTIONS)) {
      assert.match(name, /^ilife-manager\.[A-Za-z]+$/);
      assert.ok(!/update(Status|Check|Install)$/.test(name), '自有动作不许叫更新包那三个动作名');
    }
  });
});

describe('#678 一行结论与版本行', () => {
  const target = {
    key: 'calorie',
    title: '卡路里',
    packageName: 'dsh-calorie',
    phones: { status: 's', check: 'c', install: 'i' },
    runningVersion: '0.2.5',
    installedVersion: '0.2.5',
    skill: { packageName: 'skill-calorie', version: '0.1.7' },
  };
  const absentTarget = { ...target, runningVersion: null, installedVersion: null };
  const snapshot = (patch) => ({
    runningVersion: '0.2.5',
    installedVersion: '0.2.5',
    latestVersion: null,
    canInstall: false,
    blockedReason: null,
    job: null,
    ...patch,
  });

  it('缺席判定只看两处版本都为 null', () => {
    assert.equal(isAbsent(absentTarget), true);
    assert.equal(isAbsent(target), false);
  });
  it('三态：还没查 / 已是最新 / 有新版可装', () => {
    assert.equal(verdictOf(target, snapshot({})).kind, 'unknown');
    assert.equal(verdictOf(target, snapshot({ latestVersion: '0.2.5' })).kind, 'up-to-date');
    const hasNew = verdictOf(target, snapshot({ latestVersion: '0.2.6', canInstall: true }));
    assert.equal(hasNew.kind, 'update-available');
    assert.equal(hasNew.action, 'update');
    assert.match(hasNew.text, /0\.2\.6/);
  });
  it('装不了：给原因不给按钮（待重启期间尤其不给安装按钮）', () => {
    const blocked = verdictOf(target, snapshot({ latestVersion: '0.2.6', blockedReason: 'source-install' }));
    assert.equal(blocked.kind, 'blocked');
    assert.equal(blocked.action, null);
    const restarting = verdictOf(target, snapshot({ installedVersion: '0.2.6', blockedReason: 'pending-restart' }));
    assert.equal(restarting.action, null);
  });
  it('缺席 + 已知最新版本：给「装上」按钮', () => {
    const absent = verdictOf(absentTarget, snapshot({ runningVersion: '0.0.0', installedVersion: null, latestVersion: '0.2.6' }));
    assert.equal(absent.action, 'install');
    assert.match(absent.text, /未安装/);
  });
  it('面板展示的命令：缺席给双包口径（不带任何参数），已装包给更新包那条', () => {
    const packagerCmd = 'dsh plugin --profile web add --save-exact dsh-calorie@0.2.6 --registry=https://registry.npmjs.org/';
    assert.equal(manualForDisplay(absentTarget, packagerCmd), 'dsh plugin add dsh-life-pack dsh-calorie');
    assert.equal(manualForDisplay(absentTarget, null).includes('--save-exact'), false);
    assert.equal(manualForDisplay(target, packagerCmd), packagerCmd);
  });
  it('待重启文案说清新版号与重启两件事；版本行标注技能包随插件', () => {    const text = pendingRestartText(target, snapshot({ installedVersion: '0.2.6', blockedReason: 'pending-restart' }));
    assert.match(text, /0\.2\.6/);
    assert.match(text, /重启宿主后生效/);
    assert.equal(pendingRestartText(target, snapshot({})), null);
    const lines = versionLines(target, snapshot({}));
    assert.match(lines[0], /dsh-calorie 0\.2\.5/);
    assert.match(lines[1], /skill-calorie 0\.1\.7/);
    assert.match(lines[1], /随插件/);
  });
});

describe('#678 面板流程（假传输口）', () => {
  const target = {
    key: 'calorie',
    title: '卡路里',
    packageName: 'dsh-calorie',
    phones: { status: 'probe.status', check: 'probe.check', install: 'probe.install' },
    runningVersion: '0.2.5',
    installedVersion: '0.2.5',
    skill: null,
  };
  const absent = { ...target, key: 'chef', packageName: 'dsh-chef', runningVersion: null, installedVersion: null };
  const outcome = (patch) => ({
    snapshot: {
      runningVersion: '0.2.5',
      installedVersion: '0.2.5',
      latestVersion: '0.2.6',
      canInstall: true,
      blockedReason: null,
      job: null,
      ...patch,
    },
    manual: null,
    receipt: { checkId: 'chk-1', checkedAt: 0, expiresAt: 10 },
  });

  it('取七个目标：电话名与轮询间隔都由宿主转交，面板不写死', async () => {
    const seen = [];
    const call = async (channel, endpoint, payload) => {
      seen.push({ channel, endpoint, method: payload.method });
      return { ok: true, value: { targets: [target, absent], pollMs: 250 } };
    };
    const loaded = await loadTargets(call);
    assert.equal(loaded.ok, true);
    assert.equal(loaded.value.pollMs, 250);
    assert.equal(loaded.value.targets.length, 2);
    assert.equal(seen[0].channel, MANAGER_RPC.base, '第一段必须是载体基段（传成通道名就 404）');
    assert.equal(seen[0].endpoint, MANAGER_RPC.endpoint);
    assert.equal(seen[0].method, MANAGER_ACTIONS.targets);
  });
  it('查一家：调那一家的查新版电话，回包体原样透传', async () => {
    const seen = [];
    const call = async (_c, _e, payload) => {
      seen.push(payload.method);
      return { ok: true, value: outcome({}) };
    };
    const checked = await checkTarget(call, target);
    assert.deepEqual(seen, ['probe.check']);
    assert.equal(checked.ok, true);
    assert.equal(checked.value.snapshot.latestVersion, '0.2.6');
  });
  it('装上缺席的包：走总管自有电话，带包名与版本', async () => {
    const seen = [];
    const call = async (_c, _e, payload) => {
      seen.push(payload);
      return { ok: true, value: { packageName: 'dsh-chef', version: '0.2.6' } };
    };
    const installed = await installAbsent(call, absent, '0.2.6');
    assert.equal(installed.ok, true);
    assert.equal(seen[0].method, MANAGER_ACTIONS.install);
    assert.deepEqual(seen[0].payload, { packageName: 'dsh-chef', version: '0.2.6' });
  });
  it('装上更新：查新版 → 提交 → 有界轮询查状态到任务收尾', async () => {
    const calls = [];
    let statusRound = 0;
    const call = async (_c, _e, payload) => {
      calls.push(payload.method);
      if (payload.method === 'probe.check') return { ok: true, value: outcome({}) };
      if (payload.method === 'probe.install') {
        assert.equal(payload.payload.checkId, 'chk-1');
        assert.ok(typeof payload.payload.requestId === 'string' && payload.payload.requestId.length > 4);
        return { ok: true, value: outcome({ canInstall: false, job: { id: 'j1', state: 'installing', targetVersion: '0.2.6', message: null, requestId: payload.payload.requestId } }) };
      }
      statusRound += 1;
      if (statusRound < 2) {
        return { ok: true, value: outcome({ canInstall: false, job: { id: 'j1', state: 'verifying', targetVersion: '0.2.6', message: null, requestId: null } }) };
      }
      return { ok: true, value: outcome({ canInstall: false, installedVersion: '0.2.6', blockedReason: 'pending-restart', job: { id: 'j1', state: 'restart-required', targetVersion: '0.2.6', message: null, requestId: null } }) };
    };
    const updated = await updateInstalled(call, target, 1);
    assert.equal(updated.ok, true);
    assert.equal(updated.value.snapshot.blockedReason, 'pending-restart');
    assert.deepEqual(calls, ['probe.check', 'probe.install', 'probe.status', 'probe.status']);
  });
  it('凭证过期：重查一次拿新凭证再提交（更新包 README 第 11 节）', async () => {
    const calls = [];
    let checks = 0;
    const call = async (_c, _e, payload) => {
      calls.push(payload.method);
      if (payload.method === 'probe.check') {
        checks += 1;
        return { ok: true, value: { ...outcome({}), receipt: { checkId: 'chk-' + checks, checkedAt: 0, expiresAt: 10 } } };
      }
      if (payload.method === 'probe.install') {
        if (calls.filter((m) => m === 'probe.install').length === 1) {
          return { ok: false, error: { code: 'check-expired', message: '凭证过期', details: {} } };
        }
        return { ok: true, value: outcome({ canInstall: false, installedVersion: '0.2.6', blockedReason: 'pending-restart' }) };
      }
      return { ok: true, value: outcome({ canInstall: false, installedVersion: '0.2.6', blockedReason: 'pending-restart' }) };
    };
    const updated = await updateInstalled(call, target, 1);
    assert.equal(updated.ok, true);
    assert.deepEqual(calls, ['probe.check', 'probe.install', 'probe.check', 'probe.install']);
  });
  it('没有凭证（装不了）：如实回原因，不假装成功，并把手工命令带上', async () => {
    const call = async () => ({
      ok: true,
      value: { ...outcome({ canInstall: false, blockedReason: 'source-install' }), receipt: null, manual: 'dsh plugin --profile web add --save-exact dsh-calorie@0.2.6 --registry=https://registry.npmjs.org/' },
    });
    const updated = await updateInstalled(call, target, 1);
    assert.equal(updated.ok, false);
    assert.equal(updated.code, 'source-install');
    assert.match(updated.manual, /dsh plugin --profile web add --save-exact/);
  });
  it('更新包电话失败（业务失败）：码原样回，人话给面板', async () => {
    const call = async () => ({ ok: false, error: { code: 'update-busy', message: '忙', details: {} } });
    const checked = await checkTarget(call, target);
    assert.equal(checked.ok, false);
    assert.equal(checked.code, 'update-busy');
    assert.match(checked.message, /同时只装一个/);
  });
  it('传输口缺席（宿主连接没到）：给内部错，不抛', async () => {
    const checked = await checkTarget(null, target);
    assert.equal(checked.ok, false);
    assert.equal(checked.code, 'internal');
  });
});
