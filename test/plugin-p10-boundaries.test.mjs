// P10 边界冻结（#11 脚手架）：依赖单向 + 不 import 对端实现 + 槽位定案 + 设置页归属。
// 红线：真相唯一 B、纯 CLI 单轨（面板/跨技能只经 host.call→spawn，不 import 技能实现）、
// engines>=22.13、缺失阻断不返空；技能包不动（只读消费其 dist/CLI）；combos.yaml 不动。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = (dir) => JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'));
const srcFiles = (dir) => readdirSync(join(root, 'packages', dir, 'src')).filter((f) => f.endsWith('.ts'));
const srcText = (dir) => srcFiles(dir).map((f) => readFileSync(join(root, 'packages', dir, 'src', f), 'utf8')).join('\n');
const SINGLES = ['plugin-calorie', 'plugin-memo-ilife', 'plugin-schedule-ilife', 'plugin-home-ilife', 'plugin-chef', 'plugin-bill-ilife'];
const SINGLE_NPMS = ['dsh-calorie', 'dsh-memo-ilife', 'dsh-schedule-ilife', 'dsh-home-ilife', 'dsh-chef', 'dsh-bill-ilife'];
const EXPECT = [
  ['plugin-bill-ilife', 'ilife:cookie', 70],
  ['plugin-calorie', 'ilife:calorie', 75],
  ['plugin-memo-ilife', 'ilife:memo', 80],
  ['plugin-schedule-ilife', 'ilife:schedule', 85],
  ['plugin-home-ilife', 'ilife:home', 90],
  ['plugin-chef', 'ilife:chef', 95],
];

describe('P10 依赖方向', () => {
  it('单品→总管单向（总管零单品依赖）', () => {
    const m = pkg('plugin-manager');
    const depBlob = JSON.stringify({ ...m.dependencies, ...m.devDependencies, ...m.peerDependencies });
    for (const n of SINGLE_NPMS) assert.ok(!depBlob.includes(n), '总管不许依赖单品：' + n);
    // #48 样板线：plugin-calorie 总管依赖已转正式版号（B① 全部换已发布号）；#50 首对复制 plugin-chef、home 对 plugin-home-ilife、bill 对 plugin-bill-ilife、schedule 对 plugin-schedule-ilife、memo 对复制 plugin-memo-ilife 同改（见 docs/skill-landing-r2.md）。
    // 2026-09-23 口径改：总管与技能都走**精确版**——caret ＋ 机器存量会让「装到哪一版」由存量决定
    // （技能那条 #129 已定；总管那条实测过「只更新一家 ⇒ 顶层旧总管 ＋ 插件包内新总管」两个总管并存，
    // 见 `docs/agents/更新链路-配套不变式-方案.md` 第三节）。两个期望值都**现取自工作区**
    // （#123 口径：断言与版本号解耦——旧实现硬编码 `^0.1.0`，发版即红）。
    const SKILL_OF = { 'plugin-calorie': 'skill-calorie', 'plugin-chef': 'skill-chef', 'plugin-home-ilife': 'skill-home', 'plugin-bill-ilife': 'skill-bill', 'plugin-schedule-ilife': 'skill-schedule', 'plugin-memo-ilife': 'skill-memo-ilife' };
    const packVer = pkg('plugin-manager').version;
    for (const d of SINGLES) {
      const j = pkg(d);
      assert.equal(j.dependencies?.['dsh-life-pack'], packVer, d + ' 总管硬依赖口径（工作区精确版）');
      assert.equal(j.dependencies?.[SKILL_OF[d]], pkg(SKILL_OF[d]).version, d + ' 须精确 pin 工作区技能版本（#129）');
    }
  });
  it('总管不 import 单品（源码级）', () => {
    const t = srcText('plugin-manager');
    assert.ok(!/from\s+['"]dsh-(calorie|memo|schedule|home|chef|bill)/.test(t), '总管源码禁 import 单品包');
    assert.ok(!/from\s+['"]\.\.\/plugin-/.test(t), '总管源码禁相对 import 单品');
    assert.ok(!/require\(\s*['"]dsh-/.test(t), '总管源码禁 require 单品');
  });
  it('单品不 import 技能实现（只读消费 dist/CLI，纯 CLI 单轨）', () => {
    for (const d of SINGLES) {
      const t = srcText(d);
      assert.ok(!/from\s+['"]skill-/.test(t), d + ' 禁 import 技能实现');
      assert.ok(!/from\s+['"]base-/.test(t), d + ' 脚手架期不直连 base 包（零耦合）');
      assert.ok(t.includes('host.call'), d + ' 面板链路须经 host.call');
      assert.ok(t.includes('spawn'), d + ' 取数须经 spawn');
      assert.ok(t.includes('cmd_read'), d + ' 出口须为 cmd_read');
    }
  });
});

describe('P10 槽位定案', () => {
  it('id 命名空间 ilife:* + order 与 P3 定案一致', async () => {
    for (const [dir, slot, order] of EXPECT) {
      const mod = await import('../packages/' + dir + '/dist/slot.js');
      assert.equal(mod.SLOT_ID, slot, dir + ' slot');
      assert.equal(mod.SLOT_ORDER, order, dir + ' order');
      assert.match(mod.SLOT_ID, /^ilife:/, dir + ' 命名空间');
    }
    const nav = await import('../packages/plugin-manager/dist/nav.js');
    assert.deepEqual(nav.MANAGER_TABS.map((t) => t.slotId), ['ilife:cookie', 'ilife:calorie', 'ilife:memo', 'ilife:schedule', 'ilife:home', 'ilife:chef']);
    assert.deepEqual(nav.MANAGER_TABS.map((t) => t.order), [70, 75, 80, 85, 90, 95]);
  });
  // 票 #735：面板取配置体检的通道名取自导航表那一列，它必须与各家**自己**契约件里那份逐家相等。
  // 为什么要有这条：各家注册页签槽时也交了一份通道名，但装机上的槽位面不透传自定义注册选项，
  // 账本上那一格恒是空串 ⇒ 六家曾恒被判成「没有体检出口」，体检按钮按下去毫无反应。
  // 写法照上面那条对齐断言：真 import 两边的产物来比，不是搜字符串。
  it('导航表的客户端通道与各家契约件逐家一致（#735）', async () => {
    const nav = await import('../packages/plugin-manager/dist/nav.js');
    const PAIRS = [
      ['plugin-memo-ilife', 'dsh-memo-ilife'],
      ['plugin-calorie', 'dsh-calorie'],
      ['plugin-schedule-ilife', 'dsh-schedule-ilife'],
      ['plugin-home-ilife', 'dsh-home-ilife'],
      ['plugin-chef', 'dsh-chef'],
      ['plugin-bill-ilife', 'dsh-bill-ilife'],
    ];
    for (const [dir, plugin] of PAIRS) {
      const contract = await import('../packages/' + dir + '/dist/contract.js');
      const row = nav.MANAGER_TABS.find((t) => t.plugin === plugin);
      assert.ok(row, '导航表里没有这家：' + plugin);
      assert.equal(row.channel, contract.RPC_CHANNEL,
        plugin + ' 的通道名与它自己契约件那份不一致（面板按这张表取配置体检，错了这家就取不到数）');
      assert.match(row.channel, /^\/[A-Za-z0-9._~-]+$/, plugin + ' 的通道名不是单段路由名');
    }
  });
  // 票 #735 的第二条断链（真机 404）：面板到各家的电话第一段必须是**载体基段** `/api`
  // （载体 URL ＝ `${第一段}/${第二段}`）。两边这一格必须同源：各家宿主半注册在 `'/api' + RPC_CHANNEL`，
  // 面板那侧取自总管的一处常量 `CARRIER_BASE`。
  it('载体基段两侧一致（#735）', () => {
    for (const d of SINGLES) {
      assert.ok(srcText(d).includes("'/api' + RPC_CHANNEL"), d + ' 宿主半的注册路径不是「/api ＋ 通道名」');
    }
    assert.ok(/CARRIER_BASE = '\/api'/.test(srcText('plugin-manager')), '总管侧没有把载体基段写成一处常量');
  });
  // 票 #740 对抗式审查第二轮：体检那一批的时限要按**六家串行**算，不能按一家算。
  // 机制：各家的宿主半用 `spawnSync`（阻塞同一个宿主线程），六通电话是一个接一个干完的
  // ⇒ 真实上界是「六家之和」，不是单家上限加一点余量。
  it('体检整批时限与各家 spawn 上限对齐（#740 对抗式审查）', async () => {
    const health = await import('../packages/plugin-manager/dist/health-fetch.js');
    const bridge = await import('../packages/plugin-calorie/dist/bridge.js');
    assert.ok(
      health.HEALTH_TIMEOUT_MS >= 3 * bridge.SPAWN_TIMEOUT_MS,
      '整批时限（' + String(health.HEALTH_TIMEOUT_MS) + 'ms）不到单家 spawn 上限（' + String(bridge.SPAWN_TIMEOUT_MS) + 'ms）的三倍：六家串行时必然误报超时',
    );
  });
  // 票 #738：面板印的页签名（＝产品名）有**两处产地**——各家自己那个 `SLOT_TITLE` 是主
  // （页签注册交出去的 label、侧边栏页签名、本家设置页标题都从它出），总管导航表那一格是它的镜像
  // （页签还没注册时兜底，更新列表那一行的行首也用它）。两处必须同值：只改一边，
  // 屏上就会一半长名一半短名。写法照上面那条通道对齐断言——真 import 两边的产物来比，不是搜字符串。
  it('导航表的页签名与各家契约件逐家一致（#738）', async () => {
    const nav = await import('../packages/plugin-manager/dist/nav.js');
    const TITLES = [
      ['plugin-memo-ilife', 'dsh-memo-ilife', '备忘录'],
      ['plugin-calorie', 'dsh-calorie', '卡路里'],
      ['plugin-schedule-ilife', 'dsh-schedule-ilife', '作息管家'],
      ['plugin-home-ilife', 'dsh-home-ilife', '居家管家'],
      ['plugin-chef', 'dsh-chef', '私家大厨'],
      ['plugin-bill-ilife', 'dsh-bill-ilife', '饼干记账'],
    ];
    for (const [dir, plugin, productName] of TITLES) {
      const slot = await import('../packages/' + dir + '/dist/slot.js');
      const row = nav.MANAGER_TABS.find((t) => t.plugin === plugin);
      assert.ok(row, '导航表里没有这家：' + plugin);
      assert.equal(row.title, slot.SLOT_TITLE,
        plugin + ' 的页签名与它自己契约件那份不一致（屏上印的是这一格，漂开就是半长半短）');
      assert.equal(row.title, productName, plugin + ' 的页签名不是产品名：' + row.title);
    }
  });
  it('写死原生组件：无动态按需加载、无外嵌页、无数据轮询（两档例外见下）', () => {
    for (const d of SINGLES.concat(['plugin-manager'])) {
      const t = srcText(d);
      assert.ok(!/import\s*\(/.test(t), d + ' 禁动态 import');
      assert.ok(!/iframe/i.test(t), d + ' 禁外嵌页');
    }
    // 定时器**逐文件**查（票 #908 摆正）：原先按整包拼接文本查，于是新加一个定时器可以靠
    // **别处那份**三件套蒙混过关（实测：新增文件里删掉 clearTimeout 仍然全绿）。门要的是
    // 「这一个定时器自己站得住」，故改成每份含定时器的源码各查一遍。
    // 只许两档，各有各的三件套：
    //   ① 有界重试（grill 定案 Q12 软依赖：sidebar槽注册重试，非数据轮询）
    //      —— 有清理（clear*）＋ 有次数上限（tries>=N）＋ 注「有界重试」依据；
    //   ② 一次性 UI 回执（#908：目录行那枚「复制」点后就地变「已复制」，1.5 秒后复位）
    //      —— 有清理（clear*）＋ 注「一次性」依据（它没有「次数」可言，故不要求次数上限）。
    // **数据轮询两档都不认**：反复取数就是这道门要挡的东西，本意不变。
    for (const d of SINGLES.concat(['plugin-manager'])) {
      for (const f of srcFiles(d)) {
        const t = readFileSync(join(root, 'packages', d, 'src', f), 'utf8');
        if (!/setInterval|setTimeout/.test(t)) continue;
        const where = d + '/src/' + f;
        assert.ok(/clearInterval|clearTimeout/.test(t), where + ' 定时器须有清理');
        if (/tries\s*>=/.test(t)) {
          assert.ok(/有界重试/.test(t), where + ' 有界重试须注例外依据');
          continue;
        }
        assert.ok(/一次性/.test(t), where + ' 定时器须注例外依据（有界重试或一次性 UI 回执）');
      }
    }
  });
  it('子页不占栏：导航表仅 6 行，卡路里子页不在表内', async () => {
    const nav = await import('../packages/plugin-manager/dist/nav.js');
    assert.equal(nav.MANAGER_TABS.length, 6);
    assert.ok(!nav.MANAGER_TABS.some((t) => String(t.slotId).includes(':diet') || String(t.slotId).includes(':goal')));
  });
});

describe('P10 设置页与导航归属', () => {
  it('设置页住单品包（总管无设置文件）', () => {
    for (const d of SINGLES) assert.ok(existsSync(join(root, 'packages', d, 'src/settings.ts')), d + ' 缺设置页');
    assert.ok(!existsSync(join(root, 'packages/plugin-manager/src/settings.ts')), '设置页不许住总管');
  });
  it('总管只导航：含 openTab 路径导航，不含单品内容渲染', () => {
    const t = srcText('plugin-manager');
    assert.ok(t.includes('openTab'), '总管须含 openTab 导航');
    assert.ok(!/renderPage|renderReco/.test(t), '总管禁直调内容渲染（内容单品自注册）');
    assert.ok(!/from\s+['"]skill-/.test(t), '总管禁 import 技能实现');
  });
  it('推荐安装：缺席 tab 带补装命令与提示', async () => {
    const nav = await import('../packages/plugin-manager/dist/nav.js');
    const rows = nav.tabsForPresence(new Set());
    assert.equal(rows.length, 6);
    for (const r of rows) {
      assert.equal(r.kind, 'reco');
      assert.match(r.installCmd, /dsh plugin add dsh-life-pack dsh-/);
      assert.match(r.hint, /补装/);
    }
  });
});

describe('P10 红线', () => {
  it('engines>=22.13（7 包逐一）', () => {
    for (const d of SINGLES.concat(['plugin-manager'])) {
      assert.equal(pkg(d).engines?.node, '>=22.13', d);
    }
  });
  it('dsh.bundle.patch 声明 + 官方包模式字段齐', () => {
    for (const d of SINGLES.concat(['plugin-manager'])) {
      const j = pkg(d);
      assert.ok(j.dsh?.bundle?.patch, d + ' 缺 dsh.bundle.patch');
      assert.ok(j.exports?.['./package.json'], d + ' 缺 ./package.json 出口');
      assert.ok(j.files?.includes('cordis.patch.yml'), d + ' files 缺 patch');
    }
  });
  it('combos.yaml 不动（无 dsh 插件名渗入）', () => {
    const yaml = readFileSync(join(root, 'packages/base-combos/combos.yaml'), 'utf8');
    assert.ok(!yaml.includes('dsh-'), 'combos.yaml 只许技能真相，不进插件名');
  });
  it('技能包不动（无对插件的反向依赖）', () => {
    for (const s of ['skill-calorie', 'skill-memo-ilife', 'skill-schedule', 'skill-home', 'skill-bill']) {
      const blob = JSON.stringify(pkg(s));
      assert.ok(!blob.includes('dsh-calorie') && !blob.includes('dsh-life-pack'), s + ' 不许反向依赖插件');
    }
  });
});
