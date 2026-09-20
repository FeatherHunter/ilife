// 票 #678 自证回路：七个更新目标的表、环境读数、原因人话、面板流程（全用假件与夹具，不碰真机）。
// 判据（票面「改动要能自证」）：本脚本改坏一处必须变红（见实施记录的变异两态读数）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANAGER_TABS } from '../dist/nav.js';
import { MANAGER_PACKAGE } from '../dist/install.js';
import { MANAGER_TARGET_KEY, UPDATE_TARGETS, targetFor } from '../dist/update-targets.js';
import { BLOCKED_REASONS, CONFIG_TAB_SLOT, MANAGER_ACTIONS, MANAGER_RPC, manualInstallCommand, reasonText } from '../dist/update-contract.js';
import { isAbsent, manualForDisplay, markStaleOthers, pendingRestartText, slotStateOf, staleVerdict, verdictOf, versionLines } from '../dist/update-view.js';
import { checkTarget, installAbsent, loadTargets, updateInstalled } from '../dist/update-client.js';
import { readPanelRegistered, readTargetEnvironment } from '../dist/update-env.js';

const PROFILE = 'dsh-profile-web';
/** 本测试件所在目录（产物与源码都从它往上找）。 */
const HERE = fileURLToPath(new URL('.', import.meta.url));

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
    // 票 #740 的第一性原理判据：每条报错都要**给得出下一步**（面板上的按钮名，或一条要执行的命令）。
    for (const code of BLOCKED_REASONS) {
      const text = reasonText(code);
      assert.ok(/点「|重启 DSH|下面这条命令|改成磁盘上的版本号/.test(text), code + ' 没给下一步');
    }
    // 自造词与口语不许回到文案里（票 #740 全表换字时逐条清掉过一批）。
    const all = [...BLOCKED_REASONS, 'check-failed', 'check-expired', 'invalid-release', 'update-busy', 'install-failed', 'manager-unreachable', 'bad-request', 'internal'].map(reasonText).join('\n');
    assert.ok(!/半截任务|电话没接上|宿主半|回执异常|还出现就重装|查宿主日志/.test(all), '自造词／口语回到了文案里');
    assert.match(reasonText('install-failed'), /终端/);
  });
  it('未知原因码不猜：原样回码并说明这是未知原因', () => {
    const text = reasonText('something-new');
    assert.match(text, /不认识这个原因码/);
    assert.match(text, /something-new/);
    assert.match(text, /DSH 日志/, '未知码也要给得出下一步（去哪看报错）');
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
  it('面板缺席卡四态：账本已注册＝connected；否则按宿主装机读数分 absent／unregistered-product／not-connected', () => {
    // 账本里已注册：面板显示那家自己的设置页，不归缺席卡管。
    assert.equal(slotStateOf(target, true), 'connected');
    // 磁盘上没有这个包 ⇒ 只有「装上」能改变状态。
    assert.equal(slotStateOf(absentTarget, false), 'absent');
    assert.equal(slotStateOf(null, false), 'absent');
    // 装着、但已装产物里没有页签槽注册代码（票 #723 那四家）⇒ 重启与重装都不会变。
    assert.equal(slotStateOf({ ...target, panelRegistered: false }, false), 'unregistered-product');
    // 装着、产物也有注册代码，却没进账本 ⇒ 差一次重启（这正是「装完不重启」那一刻的样子）。
    assert.equal(slotStateOf({ ...target, panelRegistered: true }, false), 'not-connected');
    // 判据缺席（老宿主没给这一行）不许猜：退回「装了但我们不知道接没接上」那一态，别误报成没装。
    assert.equal(slotStateOf({ ...target, panelRegistered: undefined }, false), 'not-connected');
    assert.equal(slotStateOf({ ...target }, false), 'not-connected');
  });
  it('三态：还没查 / 已是最新 / 有新版可装', () => {
    assert.equal(verdictOf(target, snapshot({})).kind, 'unknown');
    assert.equal(verdictOf(target, snapshot({ latestVersion: '0.2.5' })).kind, 'up-to-date');
    assert.match(verdictOf(target, snapshot({ latestVersion: '0.2.5' })).text, /已是最新版本 0\.2\.5。$/);
    const hasNew = verdictOf(target, snapshot({ latestVersion: '0.2.6', canInstall: true }));
    assert.equal(hasNew.kind, 'update-available');
    assert.equal(hasNew.action, 'update');
    assert.match(hasNew.text, /0\.2\.6/);
    assert.match(hasNew.text, /正在运行 0\.2\.5/, '有新版那一句要带上「正在运行的是哪个版本」');
  });
  // 票 #740：拦截态不许只给一句话——面板能代劳的**必须**给按钮，代劳不了的给命令块。
  it('装不了：原因 ＋ 一个能执行的下一步（#740）', () => {
    const blocked = verdictOf(target, snapshot({ latestVersion: '0.2.6', blockedReason: 'source-install' }));
    assert.equal(blocked.kind, 'blocked');
    assert.equal(blocked.action, null, '源码装面板代劳不了：只给原因，命令块兜底');
    const changed = verdictOf(target, snapshot({ latestVersion: '0.2.6', blockedReason: 'installation-changed' }));
    assert.equal(changed.action, 'recheck', '安装清单变了给「重新检查」');
    assert.match(changed.text, /重新检查/);
    const half = verdictOf(target, snapshot({ latestVersion: '0.2.6', installedVersion: '0.2.5', blockedReason: 'recovery-required' }));
    assert.equal(half.action, 'retry', '上次安装没收尾给「重试安装」');
    assert.match(half.text, /重试安装/);
  });
  // 票 #740 的真机根因：同一种事实（装了没重启）会被更新核心报成两种原因码
  // （`pending-restart`，或被上一次中断的任务盖成 `recovery-required`）⇒ 判据必须绑事实。
  it('待重启按事实判，不按原因码判（#740）', () => {
    const byCode = verdictOf(target, snapshot({ installedVersion: '0.2.6', blockedReason: 'pending-restart' }));
    assert.equal(byCode.action, null, '待重启期间不给安装按钮');
    assert.match(byCode.text, /重启 DSH（退出后重新打开）后生效/);
    const byJob = verdictOf(target, snapshot({ installedVersion: '0.2.6', blockedReason: 'recovery-required' }));
    assert.equal(byJob.action, null, '原因码是「上次安装没收尾」，事实是「装好了没重启」：照样先说重启');
    assert.match(byJob.text, /磁盘上装的是 0\.2\.6；正在运行的是 0\.2\.5/);
    assert.ok(!/重试安装/.test(byJob.text), '事实是待重启时，不许去劝人重试安装');
    const nothing = verdictOf(target, snapshot({ latestVersion: '0.2.5', canInstall: false, blockedReason: 'installation-changed' }));
    assert.equal(nothing.kind, 'up-to-date', '没东西可装时，守卫拦不拦与用户无关：不占那一行');
  });
  it('装成一家之后别家的读数作废：给「重新检查」（#740）', () => {
    const stale = staleVerdict();
    assert.equal(stale.kind, 'blocked');
    assert.equal(stale.action, 'recheck');
    assert.match(stale.text, /刚装过别的插件/);
    assert.match(stale.text, /重新检查/);
  });
  // 对抗式审查逮到的一条：有新版、却没凭证（凭证过期或没签发）时，旧写法会落到「已是最新」那句——
  // 那是假话（官方源上就有新版）。正确答案是重新检查一次。
  it('有新版但没凭证：不许说「已是最新」（#740 对抗式审查）', () => {
    const noReceipt = verdictOf(target, snapshot({ latestVersion: '0.2.6', canInstall: false }));
    assert.equal(noReceipt.kind, 'update-available');
    assert.equal(noReceipt.action, 'recheck');
    assert.match(noReceipt.text, /0\.2\.6/);
    assert.ok(!/已是最新/.test(noReceipt.text), '有新版时不许说「已是最新」');
  });
  // 对抗式审查逮到的第二条：环境读数**不许**按「本进程第一次读到的样子」拦人。
  // 那条绑定落定后不会刷新 ⇒ 装成一家之后其余各家在本进程里永久判 installation-changed，
  // 面板给的「重新检查」点了也白点（真机就是这么卡住的）。真正按凭证的守卫在更新包手里。
  it('环境读数不按「本进程第一次读到的样子」拦人（#740 对抗式审查）', async () => {
    const dir = mkdtempSync(join(tmpdir(), 't740-env-'));
    try {
      // 夹具要做成**「装得完整」**的样子（`packageComplete` 会看 main／client 出口／装配行三件是否真在）：
      // 否则读数落进 invalid-installation 那一支，这条判据就落不到守卫上（变异 740-I 实测过这一点）。
      const pkgDir = join(dir, 'node_modules', 'dsh-calorie');
      mkdirSync(join(pkgDir, 'dist'), { recursive: true });
      writeFileSync(join(pkgDir, 'dist', 'index.js'), 'export {};\n', 'utf8');
      writeFileSync(join(pkgDir, 'dist', 'client.js'), 'export {};\n', 'utf8');
      writeFileSync(join(pkgDir, 'cordis.patch.yml'), '[]\n', 'utf8');
      writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({
        name: 'dsh-calorie',
        version: '0.3.0',
        main: './dist/index.js',
        exports: { './client': './dist/client.js' },
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      }), 'utf8');
      const writeProfile = (deps) => writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'dsh-profile-web', dependencies: deps }), 'utf8');
      writeProfile({ 'dsh-calorie': '0.3.0' });
      const opts = { profileDir: dir, profileName: 'dsh-profile-web', runningVersion: '0.2.7', environmentKind: 'cli', pluginId: 't740-probe' };
      const first = await readTargetEnvironment('dsh-calorie', opts);
      assert.ok(first.packageValid, '夹具本身要「装得完整」，否则这条判据落不到守卫那一支');
      assert.ok(!first.sourceInstall, '夹具的依赖要是按版本号的（不是源码装）');
      // 模拟「刚装过别的插件」：使用范围清单被改写
      writeProfile({ 'dsh-calorie': '0.3.0', 'dsh-chef': '0.3.0' });
      const second = await readTargetEnvironment('dsh-calorie', opts);
      assert.ok(second.blockedReason !== 'installation-changed',
        '第二次读不该因为「清单变了」就拦人：真正按凭证的守卫在更新包手里');
      assert.ok(first.installationKey !== second.installationKey,
        '两次读到的安装态指纹本身确实不同（说明判据没被写死）');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  // 交付面判据：四个动作的名字必须真的进了浏览器束（纯函数判据管不到「有没有画出来」）。
  it('四个动作的名字都进了产物（#740）', () => {
    const bundle = readFileSync(join(HERE, '..', 'dist', 'client.js'), 'utf8');
    for (const label of ['装上', '装上更新', '重试安装', '重新检查']) {
      assert.ok(bundle.includes(label), '产物里缺按钮名：' + label);
    }
    assert.ok(bundle.includes('重启 DSH（退出后重新打开）'), '产物里缺重启动作那句话');
    assert.ok(bundle.includes('刚装过别的插件'), '产物里缺「刚装过别的插件」那一态');
  });
  it('作废只作废别家：装成的那一家自己保持原样（#740）', () => {
    const ready = { phase: 'ready', outcome: null, failure: null };
    const rows = { a: ready, b: ready, c: { ...ready, stale: true } };
    const next = markStaleOthers(rows, 'a');
    assert.equal(next.a.stale, undefined, '刚装成的那家不许被自己作废');
    assert.equal(next.b.stale, true, '别家要作废');
    assert.equal(next.c.stale, true);
    assert.equal(rows.b.stale, undefined, '原对象不许被改写（纯函数）');
  });
  it('待重启文案说清新版号、正在跑的版本与动作；版本行标注技能包随插件', () => {
    const text = pendingRestartText(target, snapshot({ installedVersion: '0.2.6', blockedReason: 'pending-restart' }));
    assert.match(text, /0\.2\.6/);
    assert.match(text, /正在运行的是 0\.2\.5/);
    assert.match(text, /重启 DSH（退出后重新打开）后生效/);
    assert.match(text, /卡路里/, '七家一起列时要点名是哪一家');
    assert.equal(pendingRestartText(target, snapshot({})), null);
    assert.ok(pendingRestartText(target, snapshot({ installedVersion: '0.2.6', blockedReason: 'recovery-required' })) !== null,
      '原因码不同、事实相同：横幅照旧出（按事实判）');
    const lines = versionLines(target, snapshot({}));
    assert.match(lines[0], /dsh-calorie 0\.2\.5/);
    assert.match(lines[1], /skill-calorie 0\.1\.7/);
    assert.match(lines[1], /随插件/);
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
  it('取目标表：宿主转交的 panelRegistered 原样留到面板（第三态判据不许在这一层被丢掉）', async () => {
    const call = async () => ({ ok: true, value: { targets: [{ ...target, panelRegistered: false }], pollMs: 1000 } });
    const loaded = await loadTargets(call);
    assert.equal(loaded.value.targets[0].panelRegistered, false);
    assert.equal(slotStateOf(loaded.value.targets[0], false), 'unregistered-product');
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
    assert.match(checked.message, /同一时间只能安装一个插件/);
  });
  it('传输口缺席（宿主连接没到）：给内部错，不抛', async () => {
    const checked = await checkTarget(null, target);
    assert.equal(checked.ok, false);
    assert.equal(checked.code, 'internal');
  });
});

// 宿主侧读数：`readPanelRegistered` 是缺席卡第三态（unregistered-product）的**唯一**判据来源。
// 它判的是一条真机上出现过的差别（票 #723）：四家已发布产物里没有注册代码 —— 版本号答不出来。
describe('#678 宿主读数：已装产物里有没有页签槽注册代码', () => {
  const HOST = 'dsh-probe-host';
  /** 造一个使用范围夹具：一家装着、产物里有／没有注册代码，另一家根本没装。
   * `entryPath` 指向的出口文件**不写**时可造「清单说得出、文件却不在」那一支（`stat` 失败）。 */
  function fixture(entryContents, entryPath = './dist/client.js') {
    const dir = mkdtempSync(join(tmpdir(), 't678-env-'));
    const pkgDir = join(dir, 'node_modules', HOST);
    mkdirSync(join(pkgDir, 'dist'), { recursive: true });
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name: HOST,
        version: '0.2.0',
        main: './dist/index.js',
        exports: { './client': entryPath },
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      }),
      'utf8',
    );
    if (entryContents !== null && !isAbsolute(entryPath)) {
      writeFileSync(join(pkgDir, entryPath.replace('./', '')), entryContents, 'utf8');
    }
    return dir;
  }

  it('产物里有槽名字面量 ⇒ true；没有 ⇒ false', async () => {
    const withSlot = fixture('var CONFIG_TAB_SLOT = "' + CONFIG_TAB_SLOT + '"; ctx.slots.inject(CONFIG_TAB_SLOT, fn);');
    const withoutSlot = fixture('var SLOT_ID = "ilife:' + HOST.slice(4) + '"; ctx.slots.inject(SLOT_ID, fn);');
    try {
      assert.equal(await readPanelRegistered(HOST, withSlot), true);
      assert.equal(await readPanelRegistered(HOST, withoutSlot), false);
    } finally {
      rmSync(withSlot, { recursive: true, force: true });
      rmSync(withoutSlot, { recursive: true, force: true });
    }
  });
  it('判据缺席（包没装／清单读不出／出口文件不在／出口不是普通文件／出口形状认不出）⇒ 一律 false，不抛', async () => {
    const empty = mkdtempSync(join(tmpdir(), 't678-env-'));
    const noEntryFile = fixture(null, './dist/absent.js');
    const absoluteEntry = fixture('var x = 1;', 'C:/outside/client.js');
    // 出口指向一个**目录**：`stat` 成功、但不是普通文件 ⇒ 走的是「读不出产物」那一支
    // （与「文件不在」不同：那一种是 stat 直接抛 ENOENT，压根到不了这一步）。这一支必须保守。
    const directoryEntry = fixture(null, './dist/dir-entry');
    mkdirSync(join(directoryEntry, 'node_modules', HOST, 'dist', 'dir-entry'), { recursive: true });
    try {
      assert.equal(await readPanelRegistered('dsh-not-installed', empty), false, '包没装（清单读不出）');
      assert.equal(await readPanelRegistered(HOST, noEntryFile), false, '清单说得出、出口文件却不在');
      assert.equal(await readPanelRegistered(HOST, absoluteEntry), false, '出口给绝对路径（越界）');
      assert.equal(await readPanelRegistered(HOST, directoryEntry), false, '出口不是普通文件（读不出产物 ⇒ 保守判否）');
    } finally {
      rmSync(empty, { recursive: true, force: true });
      rmSync(noEntryFile, { recursive: true, force: true });
      rmSync(absoluteEntry, { recursive: true, force: true });
      rmSync(directoryEntry, { recursive: true, force: true });
    }
  });
  it('产物换了（安装／重装改了大小与时间）⇒ 重新读文件，不吃旧结论', async () => {
    const dir = fixture('var x = 1;');
    try {
      assert.equal(await readPanelRegistered(HOST, dir), false);
      // 装上带注册代码的新版：同一路径、内容与大小都变了。
      writeFileSync(join(dir, 'node_modules', HOST, 'dist', 'client.js'), 'var s = "' + CONFIG_TAB_SLOT + '";', 'utf8');
      assert.equal(await readPanelRegistered(HOST, dir), true, '不重读就等于把装机读数缓存住了：装完不重启也不改态');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
