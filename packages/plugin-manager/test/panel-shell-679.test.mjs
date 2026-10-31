// 票 #679 自证回路：右上角两个入口；底部「作者的其他插件」卡与联系入口（#12 起改由 base 包渲染）。
//
// 咬三条，都不咬写法：
//   ① 表里的文案与网址逐字（照用户截图；网址的来源见 docs/research/t674-plugin-package-facts.md）；
//   ② 两个入口真的画进了产物 dist/client.js——「表在、组件没画」必须变红；
//   ③ 底部卡与联系入口不再由本仓手抄：产物里必须带 base 包的横幅与通用件标记，
//      本仓那套旧文案（包名/描述）必须已经从产物里消失——「删了本地表但没接上 base」也要变红。
//      （所以本回路要先构建：node node_modules/typescript/bin/tsc -b packages/plugin-manager
//        ＋ 包内 tsdown。只改源码不重出产物 → ②/③ 会红，这是有意的。）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PANEL_LINKS } from '../dist/nav.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = readFileSync(join(HERE, '..', 'dist', 'client.js'), 'utf8');
const NAV_JS = readFileSync(join(HERE, '..', 'dist', 'nav.js'), 'utf8');
const PKG = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8'));

/** base 包版本：banner 里烙的那个版本号必须与声明的精确版本一致（漂了就是没重新内联）。 */
const BASE_VERSION = PKG.devDependencies['dsh-featherhunter-plugin-base'];
const BASE_BANNER = '/*! dsh-featherhunter-plugin-base v' + BASE_VERSION + ' */';

/** base 的 data/manifest.json 里四家的名字与描述（本仓不再维护第二份；self=ilife 被排除）。 */
const BASE_PLUGINS = [
  ['dsh-mattpocock-skills-deck', '近 30 万 star 的 mattpocock/skills 整套预置好（27 个技能），装好即用。'],
  ['dsh-prompt', '经常反复重复的模板化提示词，存成自定义模板，选中后直接注入，不再需要耗费精力。'],
  ['dsh-opencode-palette', '38 款 opencode 经典配色 + 20+自定义主题 一键换装 DSH。'],
  ['dsh-im-companion', '给 dsh-im 加了「助理」和「家」的概念。'],
];

/** 本仓 #679 时代手抄的旧文案：结论是删掉，产物里一个字都不许留。 */
const LOCAL_GONE = [
  '作者其他插件',
  '工程技能面板：装好就能在右侧直接用',
  '多款长时间编程护眼配色，一键换上',
  '常用提示模板随手点，不用来回复制粘贴',
  '聊天机器人的伴侣插件：扫码或填凭据就把飞书、微信等聊天接进来',
];

describe('票 #679 面板头部与底部（#12 后底部交给 base 通用件）', () => {
  it('右上角两件：星去本仓、气泡去本仓开 issue；两件都带悬停说明与图标', () => {
    assert.equal(PANEL_LINKS.length, 2);
    const star = PANEL_LINKS.find((l) => l.key === 'star');
    const feedback = PANEL_LINKS.find((l) => l.key === 'feedback');
    assert.equal(star.url, 'https://github.com/FeatherHunter/ilife');
    assert.equal(feedback.url, 'https://github.com/FeatherHunter/ilife/issues/new');
    for (const link of PANEL_LINKS) {
      assert.ok(link.tip.length > 0, link.key + ' 缺悬停说明');
      assert.ok(link.icon.path.length > 8, link.key + ' 缺图标');
      assert.equal(typeof link.icon.filled, 'boolean', link.key + ' 图标须标明实心/描边');
      assert.ok(!('glyph' in link), link.key + ' emoji 字形已退役（#1174）');
    }
    assert.equal(star.icon.filled, true, '星星须实心填色');
    assert.equal(feedback.icon.filled, false, '气泡须描边');
  });

  it('右上角两件真的画进了产物（改坏一处即红）', () => {
    for (const link of PANEL_LINKS) {
      assert.ok(CLIENT.includes(link.url), '产物里没有入口网址：' + link.key + ' ' + link.url);
      assert.ok(CLIENT.includes(link.tip), '产物里没有悬停说明：' + link.tip);
    }
  });

  it('底部卡与联系入口改由 base 包渲染：产物里有横幅、通用件标记与 base 清单', () => {
    assert.ok(CLIENT.includes(BASE_BANNER), '产物里没有 base 横幅（没内联 / 版本漂了）：' + BASE_BANNER);
    assert.ok(CLIENT.includes('作者的其他插件'), '产物里没有 base 卡标题「作者的其他插件」');
    assert.ok(CLIENT.includes('dsh-base-plugins'), '产物里没有 base 卡样式类标记 dsh-base-plugins');
    assert.ok(CLIENT.includes('dsh-base-contact-row'), '产物里没有 base 联系入口标记 dsh-base-contact-row');
    assert.ok(CLIENT.includes('联系我们'), '产物里没有 base 联系入口文案「联系我们」');
    for (const [name, desc] of BASE_PLUGINS) {
      assert.ok(CLIENT.includes(name), '产物里没有 base 清单里的包名：' + name);
      assert.ok(CLIENT.includes(desc), '产物里没有 base 清单里的描述：' + name);
    }
  });

  it('本仓旧的「作者其他插件」表已撤干净（产物与 nav 导出都不许留）', () => {
    assert.ok(!NAV_JS.includes('MORE_PLUGINS'), 'dist/nav.js 仍导出 MORE_PLUGINS');
    for (const gone of LOCAL_GONE) {
      assert.ok(!CLIENT.includes(gone), '产物里仍有本仓旧文案：' + gone);
    }
  });
});
