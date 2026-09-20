// 票 #738 自证回路：六家页签名从短名补全成产品名；面板上那行说「有个缺省启用的开关」的静态文本删掉。
//
// 现象（2026-09-20 实测，读的是产物）：面板页签印 `备忘录／卡路里／作息／居家／大厨／记账`，
// 且整页文本里还挂着那行静态文本。
//
// 本回路咬五条，都不咬写法：
//   ① 六家注册交出去的那个页签名 ＋ 本家设置页页头 —— 拿**真产物**跑各家 client 的 `apply`，
//      读 `ilife.config-tab` 那次注册的 label，再渲一次那一卡读页头。同一个常量（各家的 `SLOT_TITLE`）
//      驱动页签 label、侧边栏页签名、设置页标题，三面一起看。
//   ② 屏上页签条 —— 拿真产物渲一次总管面板，读页签按钮上的字。两条产地都走：
//      账本里一家都没有（页签字取总管导航表那格镜像）与账本里有行（取自 ① 抓到的真 label）。
//   ③ 更新列表行首与页签名同值（那一行取的是导航表那一格）。
//   ④ 那行静态文本从屏上、源码与产物里消失，而它所在的那段没被误伤（「爱生活」标题与版本行仍在屏上）。
//   ⑤ 四家改名的包里，短名不再以字符串字面量出现在源码或产物里（同一个常量驱动的别的面要是
//      硬编码了短名，这条就红；①的页头那条咬的是屏上那一面）。
//
// 前提：①～⑤ 都读产物，所以要先出产物（CI 的顺序正是先 `pnpm build` 再 `pnpm test`）：
//   node node_modules/typescript/bin/tsc -b
//   pnpm -r --if-present run build:client
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderConfigTab, renderManagerPanel } from '../../../test/helpers/panel-render.mjs';
import { MANAGER_TABS } from '../dist/nav.js';
import { UPDATE_TARGETS } from '../dist/update-targets.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PACKAGES = join(ROOT, 'packages');

/** 六家：插件包名 ／ 目录名 ／ 屏上该逐字印的产品名 ／ 补全前的短名（改名的那四家才有）。 */
const FAMILIES = [
  { plugin: 'dsh-memo-ilife', dir: 'plugin-memo-ilife', name: '备忘录', short: null },
  { plugin: 'dsh-calorie', dir: 'plugin-calorie', name: '卡路里', short: null },
  { plugin: 'dsh-schedule-ilife', dir: 'plugin-schedule-ilife', name: '作息管家', short: '作息' },
  { plugin: 'dsh-home-ilife', dir: 'plugin-home-ilife', name: '居家管家', short: '居家' },
  { plugin: 'dsh-chef', dir: 'plugin-chef', name: '私家大厨', short: '大厨' },
  { plugin: 'dsh-bill-ilife', dir: 'plugin-bill-ilife', name: '饼干记账', short: '记账' },
];
const PRODUCT_NAMES = FAMILIES.map((f) => f.name);
/** 那行静态文本的冻结原文（本回路要它**哪儿都没有**，所以在这里逐字写一份）。 */
const FROZEN_LINE = '总开关 · 开关（缺省启用，只读）';
const SENTINEL = '0.0.0-渲染替身';

/** 账本那一行（形状见源码侧 `ConfigTabRow`）：label 取各家真产物交出去的那份，通道那格恒空串（#735）。 */
async function ledgerRows() {
  const rows = [];
  for (const family of FAMILIES) {
    const tab = MANAGER_TABS.find((t) => t.plugin === family.plugin);
    assert.ok(tab, '导航表里没有这家：' + family.plugin);
    const { label } = await renderConfigTab(join(PACKAGES, family.dir));
    rows.push({ id: family.plugin, order: tab.order, label, channel: '' });
  }
  return rows;
}

/** 一个目录下的源码／产物件（`.ts`／`.js`，跳过目录）。 */
function codeFilesUnder(base) {
  if (!existsSync(base)) return [];
  return readdirSync(base, { recursive: true })
    .map((rel) => join(base, String(rel)))
    .filter((path) => (path.endsWith('.ts') || path.endsWith('.js')) && statSync(path).isFile());
}

/** 七家插件包的源码与产物（面板面：屏上文案都从这些件出）。 */
function pluginCodeFiles() {
  return readdirSync(PACKAGES)
    .filter((dir) => dir.startsWith('plugin-'))
    .flatMap((dir) => codeFilesUnder(join(PACKAGES, dir, 'src')).concat(codeFilesUnder(join(PACKAGES, dir, 'dist'))));
}

describe('票 #738 ① 六家交出去的页签名与设置页标题（真产物跑 apply ＋ 渲一次配置页）', () => {
  it('逐家：页签名 ＝ 产品名，页头那行 ＝「<产品名> · 配置」', async () => {
    for (const family of FAMILIES) {
      const { label, text } = await renderConfigTab(join(PACKAGES, family.dir));
      assert.equal(label, family.name, family.dir + ' 交出去的页签名不是产品名');
      assert.ok(text.includes(family.name + ' · 配置'),
        family.dir + ' 的设置页标题没跟着那一个常量走，屏上是：' + JSON.stringify(text.slice(0, 80)));
    }
  });

  it('侧边栏页签名与页签描述子的 title 也是产品名（真产物跑 registerSingle）', async () => {
    for (const family of FAMILIES) {
      const slot = await import('../../../packages/' + family.dir + '/dist/slot.js');
      const entries = [];
      slot.registerSingle({
        hasTabs: () => true,
        registerTab: (entry) => { entries.push(entry); return () => {}; },
        openTab: () => {},
      });
      assert.equal(entries.length, 1, family.dir + ' 没注册页签槽');
      assert.equal(entries[0].title, family.name, family.dir + ' 侧边栏页签名不是产品名');
      assert.equal(slot.slotDescriptor().title, family.name, family.dir + ' 页签描述子的 title 不是产品名');
    }
  });
});

describe('票 #738 ② 屏上页签条印产品名（真产物渲两次）', () => {
  it('账本里一家都没有 → 页签字取总管导航表那格镜像，仍是六个产品名', async () => {
    const { tabLabels } = await renderManagerPanel({ reply: { version: SENTINEL } });
    assert.deepEqual(tabLabels, PRODUCT_NAMES, '缺席时页签字从镜像表出，短名残留就是这里露出来');
  });

  it('账本里有行 → 页签字取自各家注册交的 label，仍是六个产品名', async () => {
    const { tabLabels } = await renderManagerPanel({ reply: { version: SENTINEL }, tabs: await ledgerRows() });
    assert.deepEqual(tabLabels, PRODUCT_NAMES, '有账本时页签字从各家 label 出');
  });
});

describe('票 #738 ③ 更新列表行首与页签名同值', () => {
  it('六行的行首就是六个产品名（那一行取的是导航表那格）', () => {
    const bySkill = new Map(UPDATE_TARGETS.map((target) => [target.key, target.title]));
    assert.equal(bySkill.get('life-pack'), '爱生活', '总管自己那一行仍是「爱生活」');
    assert.deepEqual(MANAGER_TABS.map((tab) => bySkill.get(tab.skill)), PRODUCT_NAMES);
  });
});

describe('票 #738 ④ 那行静态文本', () => {
  it('屏上不再出现（真产物渲一次，整页文本里搜不到）', async () => {
    const { text } = await renderManagerPanel({ reply: { version: SENTINEL } });
    assert.ok(!text.includes(FROZEN_LINE), '屏上还有那行静态文本');
    assert.ok(!text.includes('总开关'), '屏上还有「总开关」这四个字');
  });

  it('那段没被误伤：「爱生活」标题与版本行都还在屏上', async () => {
    const { text } = await renderManagerPanel({ reply: { version: SENTINEL } });
    assert.ok(text.includes('爱生活'), '总设置区那段被整段删掉了');
    assert.ok(text.includes('总管 dsh-life-pack · ' + SENTINEL), '版本行没了');
  });

  it('七家插件包的源码与产物里搜不到「总开关」这四个字', () => {
    const hits = pluginCodeFiles().filter((path) => readFileSync(path, 'utf8').includes('总开关'));
    assert.deepEqual(hits, [], '这些件里还有「总开关」：' + hits.join('、'));
  });

  it('冻结那句原文在 packages 全树的源码与产物里都搜不到', () => {
    const all = readdirSync(PACKAGES)
      .flatMap((dir) => codeFilesUnder(join(PACKAGES, dir, 'src')).concat(codeFilesUnder(join(PACKAGES, dir, 'dist'))));
    const hits = all.filter((path) => readFileSync(path, 'utf8').includes(FROZEN_LINE));
    assert.deepEqual(hits, [], '这些件里还有那行原文：' + hits.join('、'));
  });
});

describe('票 #738 ⑤ 短名不再以字符串字面量留在改名的四家里', () => {
  it('源码与产物逐件扫：四家各自的短名一个都不许剩', () => {
    for (const family of FAMILIES) {
      if (family.short === null) continue;
      const frozen = new RegExp('[\'"]' + family.short + '[\'"]');
      const files = codeFilesUnder(join(PACKAGES, family.dir, 'src'))
        .concat(codeFilesUnder(join(PACKAGES, family.dir, 'dist')));
      const hits = files.filter((path) => frozen.test(readFileSync(path, 'utf8')));
      assert.deepEqual(hits, [], family.dir + ' 里还写着短名「' + family.short + '」：' + hits.join('、'));
    }
  });
});
