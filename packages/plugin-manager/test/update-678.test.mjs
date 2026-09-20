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
import { isAbsent, cardActionOf, manualForDisplay, restartBannerText, restartPendingOf, showManualOf, slotStateOf, verdictOf, versionLines } from '../dist/update-view.js';
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
    // 对抗式审查第二轮：`recovery-required` 只在「磁盘版本 == 正在运行」（或磁盘那份读不到）时才印出来，
    // 「磁盘 ≠ 运行中」被事实判据先截走（印 `restartLine`）⇒ 这一条**不许**再教人重启（那在眼下没用）。
    assert.ok(!/重启/.test(reasonText('recovery-required')), '这一态教人重启是错的：重启不改变任何东西');
    assert.match(reasonText('recovery-required'), /重试安装/);
    assert.match(reasonText('installation-changed'), /重新检查/);
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
    // 第三轮改的口径：这一态原先一颗按钮都不给（只摊命令），屏上那句却写着「再点「检查更新」」——
    // 那颗按钮住在题头、被结果浮层盖住。照命令重装完之后，用户要的正是「把这一家重读一次」，
    // 所以给「重新检查」；命令块照旧要摊（`manualHint`，这里有判据）。
    assert.equal(blocked.action, 'recheck', '源码装：命令块 ＋ 一颗够得着的「重新检查」');
    assert.equal(blocked.manualHint, true, '这句写着「照下面这条命令重装」⇒ 命令块必须出来');
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
  // 第四轮（维护者真机截图）：装了卡路里之后，别家全变成黄的「刚在本面板装过别的插件…」，
  // 只剩「重新检查」——用户点不动「装上更新」。查下来是**第一轮那条「作废别家读数」的前提错了**：
  // 装的那条路（`updateInstalled`）本来就在提交前重查一次、用那一查现签的凭证提交
  // （更新包的守卫是 `service.js:309`／`:325` 的「凭证里的 installationKey ≠ 当时读到的」），
  // 所以旧快照从不到达守卫。作废提示只是白挡一次点击 ＋ 白让人多点一次「重新检查」。
  it('装上更新的提交前一定重读一次（这就是「装了别家，这一家照样点得动」的原因）', async () => {
    const calls = [];
    const receipt = { checkId: 'c1', checkedAt: 1, expiresAt: 2 };
    const face = async (channel, endpoint, payload) => {
      calls.push({ endpoint, method: payload?.method });
      if (payload?.method === 'check') return { ok: true, value: { snapshot: snapshot({ latestVersion: '0.3.0', canInstall: true }), receipt, manual: null } };
      if (payload?.method === 'install') return { ok: true, value: { snapshot: snapshot({ latestVersion: '0.3.0', installedVersion: '0.3.0', job: null }), receipt: null, manual: null } };
      return { ok: true, value: { snapshot: snapshot({ job: null }), receipt: null, manual: null } };
    };
    const targetWithPhones = { ...target, phones: { status: 'status', check: 'check', install: 'install' } };
    const out = await updateInstalled(face, targetWithPhones, 1);
    assert.equal(out.ok, true);
    assert.deepEqual(calls.map((c) => c.method), ['check', 'install'], '顺序必须是「先查一次拿新凭证，再提交安装」');
    // 反面：只查一次不行——提交必须用**这一次查**签出来的凭证。
    assert.equal(calls.length, 2);
  });
  it('结论只说「点得动的那一步」：待重启那张卡不摊手工命令（第四轮真机截图逮到）', () => {
    const restart = verdictOf(target, snapshot({ installedVersion: '0.3.0', blockedReason: 'pending-restart' }));
    assert.equal(restart.action, null);
    assert.equal(showManualOf(restart, 'ready'), false, '待重启要的是重启，不是把刚装好的那版再装一遍');
    assert.equal(showManualOf(verdictOf(target, snapshot({ latestVersion: '0.3.0', blockedReason: 'incompatible-node' })), 'ready'), false);
    // 该摊的三种照旧摊：句子自己指着命令（`manualHint`），或上一次装失败。
    assert.equal(showManualOf(verdictOf(target, snapshot({ latestVersion: '0.3.0', blockedReason: 'source-install' })), 'ready'), true);
    assert.equal(showManualOf(null, 'failed'), true);
    assert.equal(showManualOf(verdictOf(target, snapshot({ latestVersion: '0.3.0', canInstall: true })), 'ready'), false);
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
    assert.ok(bundle.includes('待重启 DSH（退出后重新打开）'), '产物里缺待重启横幅那句总账');
    // 第四轮：作废态整条路（`staleVerdict`／`markStaleOthers`）已按「前提错了」删除——
    // 产物里不许再出现那句挡人的话。
    assert.ok(!bundle.includes('刚在本面板装过别的插件'), '产物里不该再有把别家挡住的作废态');
  });
  it('装上更新的提交顺序（纯函数面）：失败时给得出下一步，成功时不编快照', async () => {
    const targetWithPhones = { ...target, phones: { status: 'status', check: 'check', install: 'install' } };
    // 查新版失败：整条路停在这一步，回的就是那次失败（不拿旧快照硬装）。
    const failing = async (channel, endpoint, payload) => (payload?.method === 'check'
      ? { ok: false, error: { code: 'check-failed', message: 'x', details: {} } }
      : { ok: true, value: {} });
    const bad = await updateInstalled(failing, targetWithPhones, 1);
    assert.equal(bad.ok, false);
    assert.equal(bad.code, 'check-failed');
    // 没凭证（有新版本但没签发）：不许硬提交，照实回原因码。
    const noReceipt = async (channel, endpoint, payload) => (payload?.method === 'check'
      ? { ok: true, value: { snapshot: snapshot({ latestVersion: '0.3.0' }), receipt: null, manual: null } }
      : { ok: true, value: {} });
    const blocked = await updateInstalled(noReceipt, targetWithPhones, 1);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.code, 'check-failed');
  });
  it('待重启：卡片说事实与做法，横幅只点名（不重复那句话）', () => {
    const pending = snapshot({ installedVersion: '0.2.6', blockedReason: 'pending-restart' });
    assert.ok(restartPendingOf(pending), '判据按事实：磁盘版本 ≠ 正在跑的版本');
    assert.ok(!restartPendingOf(snapshot({})), '磁盘与运行一致时不算待重启');
    assert.ok(restartPendingOf(snapshot({ installedVersion: '0.2.6', blockedReason: 'recovery-required' })),
      '原因码不同、事实相同 ⇒ 照样算待重启（按事实判）');
    const card = verdictOf(target, pending);
    assert.match(card.text, /磁盘上装的是 0\.2\.6；正在运行的是 0\.2\.5/);
    assert.match(card.text, /重启 DSH（退出后重新打开）后生效/);
    assert.equal(card.action, null, '待重启期间不给安装按钮');
    // 横幅只是一行总账：点名谁要重启，不再重复「重启 DSH…后生效」那句话（一屏两遍会吵）。
    const banner = restartBannerText(['卡路里', '备忘录']);
    assert.match(banner, /^⚠️ 待重启 DSH（退出后重新打开）：卡路里、备忘录$/);
    assert.ok(!/后生效/.test(banner), '横幅不重复那句做法：做法写在卡片上');
    assert.equal(restartBannerText([]), null);
  });
  it('两张「还没查过」的卡自带「重新检查」按钮（浮层开着时顶上那颗够不着，第三轮朗读表逮到）', () => {
    assert.equal(verdictOf(absentTarget, snapshot({ runningVersion: '0.0.0', installedVersion: null })).action, 'recheck');
    assert.equal(verdictOf(target, snapshot({})).action, 'recheck');
  });
  // 第三轮的主判据：**这句话点名的按钮，那一行上真有一颗、真够得着**。
  // 结果浮层一开就盖住面板题头的「检查更新」，所以「改完再读一次」这类下一步只能写「重新检查」
  // （它画在那一行上）；只有发生在**重启之后**的下一步才许写「检查更新」。
  it('装不了的那八态：点名的按钮在这一行上真有一颗（#740 第三轮）', () => {
    // 每一态：结论给的动作 ＋ 那句话点名的**第一颗**按钮（「再点后面那颗」是读完这一步之后的事，不算）。
    // `incompatible-node` 是个例外：它那句里的「检查更新」发生在**重启之后**，那时浮层早已关掉，题头那颗够得着。
    // `pending-restart` 在「磁盘 ≠ 运行中」时已被重启那条事实判据截走；走到这里的是磁盘与运行一致的尾巴，只教重启。
    const FIRST_STEP = {
      'unknown-profile': ['recheck', '重新检查'],
      'source-install': ['recheck', '重新检查'],
      'invalid-installation': ['recheck', '重新检查'],
      'installation-changed': ['recheck', '重新检查'],
      'registry-conflict': ['recheck', '重新检查'],
      'recovery-required': ['retry', '重试安装'],
      'incompatible-node': [null, '检查更新'],
      'pending-restart': [null, null],
    };
    for (const reason of BLOCKED_REASONS) {
      const [action, firstNamed] = FIRST_STEP[reason];
      const v = verdictOf(target, snapshot({ latestVersion: '0.3.0', blockedReason: reason }));
      assert.equal(v.kind, 'blocked', reason);
      assert.equal(v.action, action, reason);
      const named = /点「([^」]+)」/.exec(v.text);
      assert.equal(named ? named[1] : null, firstNamed, reason + '：这句话点名的第一颗按钮，得是这一行上真够得着的那颗');
      if (v.text.includes('下面这条命令')) assert.equal(v.manualHint, true, reason + '：那句话指着命令块，命令块就得出来');
    }
  });
  it('写着「下面这条命令」的那几行，命令块必须真出来（#740 第三轮）', () => {
    // 第三轮逮到的第二处失配：`recovery-required` 那句写着「就用下面这条命令重装」，
    // 而命令块只在「拦截态且没按钮」时才画 —— 那句话下面什么都没有。
    for (const reason of ['source-install', 'invalid-installation', 'recovery-required']) {
      const v = verdictOf(target, snapshot({ latestVersion: '0.3.0', blockedReason: reason }));
      assert.match(v.text, /下面这条命令/, reason);
      assert.equal(v.manualHint, true, reason + '：这句话指着命令块，判据就得让面板把它画出来');
    }
    // 反面：面板一步能推回去的那几态不摊命令（摊了是噪声，第二轮已定）。
    for (const reason of ['installation-changed', 'unknown-profile', 'registry-conflict', 'incompatible-node']) {
      assert.ok(!verdictOf(target, snapshot({ latestVersion: '0.3.0', blockedReason: reason })).manualHint, reason);
    }
  });
  it('过程错误码点名的按钮也够得着：失败的行一律补一颗「重新检查」（#740 第三轮）', () => {
    // 更新包 README 第 12 节的过程错误码：它们不走「拦截态」，是**失败的行**（没有快照、原先一颗按钮都不画）。
    const ERROR_CODES = ['check-failed', 'check-expired', 'invalid-release', 'update-busy', 'install-failed', 'manager-unreachable', 'bad-request', 'internal'];
    for (const code of ERROR_CODES) {
      const text = reasonText(code);
      assert.ok(text.length > 0, code);
      if (text.includes('点「重新检查」')) assert.equal(cardActionOf(null, 'failed'), 'recheck', code + '：这一行靠它补按钮');
      if (text.includes('点「检查更新」')) assert.equal(code, 'manager-unreachable', code + '：这句话点的是被结果浮层盖住的题头按钮');
      if (text.includes('下面这条命令')) assert.equal(code, 'install-failed', code + '：只有装失败那一行摊命令');
    }
    // 补按钮的判据本身：失败 ⇒ 有按钮；没失败 ⇒ 结论说什么就是什么。
    assert.equal(cardActionOf(null, 'failed'), 'recheck');
    assert.equal(cardActionOf(null, 'ready'), null);
    assert.equal(cardActionOf(null, 'idle'), null);
    assert.equal(cardActionOf({ kind: 'blocked', text: 'x', action: 'retry' }, 'ready'), 'retry');
    assert.equal(cardActionOf({ kind: 'up-to-date', text: 'x', action: null }, 'ready'), null);
    assert.equal(cardActionOf({ kind: 'up-to-date', text: 'x', action: null }, 'failed'), 'recheck');
  });
  it('版本行标注技能包随插件', () => {
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
