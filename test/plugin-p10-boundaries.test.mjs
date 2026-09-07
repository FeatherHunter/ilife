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
  ['plugin-memo-ilife', 'ilife:memo', 70],
  ['plugin-calorie', 'ilife:calorie', 75],
  ['plugin-schedule-ilife', 'ilife:schedule', 80],
  ['plugin-home-ilife', 'ilife:home', 85],
  ['plugin-chef', 'ilife:chef', 90],
  ['plugin-bill-ilife', 'ilife:cookie', 95],
];

describe('P10 依赖方向', () => {
  it('单品→总管单向（总管零单品依赖）', () => {
    const m = pkg('plugin-manager');
    const depBlob = JSON.stringify({ ...m.dependencies, ...m.devDependencies, ...m.peerDependencies });
    for (const n of SINGLE_NPMS) assert.ok(!depBlob.includes(n), '总管不许依赖单品：' + n);
    // #48 样板线：plugin-calorie 总管依赖已转正式版号 ^0.1.0（B① 全部换已发布号）；#50 首对复制 plugin-chef、home 对 plugin-home-ilife、bill 对复制 plugin-bill-ilife 同改（见 docs/skill-landing-r2.md）。
    const FORMAL48 = new Set(['plugin-calorie', 'plugin-chef', 'plugin-home-ilife', 'plugin-bill-ilife']);
    const SKILL_OF = { 'plugin-calorie': 'skill-calorie', 'plugin-chef': 'skill-chef', 'plugin-home-ilife': 'skill-home', 'plugin-bill-ilife': 'skill-bill' };
    for (const d of SINGLES) {
      const j = pkg(d);
      assert.equal(j.dependencies?.['dsh-life-pack'], FORMAL48.has(d) ? '^0.1.0' : 'workspace:*', d + ' 总管硬依赖口径');
      if (FORMAL48.has(d)) assert.match(j.dependencies?.[SKILL_OF[d]] ?? '', /^\^0\.1\./, d + ' 须同版本 ^ 声明对应 skill');
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
    assert.deepEqual(nav.MANAGER_TABS.map((t) => t.slotId), ['ilife:memo', 'ilife:calorie', 'ilife:schedule', 'ilife:home', 'ilife:chef', 'ilife:cookie']);
    assert.deepEqual(nav.MANAGER_TABS.map((t) => t.order), [70, 75, 80, 85, 90, 95]);
  });
  it('写死原生组件：无动态按需加载、无外嵌页、无轮询', () => {
    for (const d of SINGLES.concat(['plugin-manager'])) {
      const t = srcText(d);
      assert.ok(!/import\s*\(/.test(t), d + ' 禁动态 import');
      assert.ok(!/iframe/i.test(t), d + ' 禁外嵌页');
      assert.ok(!/setInterval|setTimeout/.test(t), d + ' 缺席纯条件渲染，无轮询');
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
